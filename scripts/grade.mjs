#!/usr/bin/env node
/**
 * Runs the grading suites against a fresh database and a production build.
 *
 *   npm test                         suites up to the ticket in the branch name (slot-102-…); scaffold only if none
 *   npm test -- --ticket SLOT-102    suites up to and including SLOT-102
 *   npm test -- --all                every suite (all tickets)
 *   npm test -- --skip-build         reuse the existing .next build
 *
 * The CI workflow (.github/workflows/grade.yml) runs exactly this script.
 */
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BIN = path.join(ROOT, "node_modules", ".bin");
const PORT = process.env.GRADE_PORT ?? "3100";
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SERVER_READY_TIMEOUT_MS = 60_000;
const GROUP_EXIT_TIMEOUT_MS = 2_000;
const GRADING_TIMEOUT_MS = 255_000;
const TICKET_PATTERN = /slot-(\d{3})/i;
const children = new Set();
const deadline = new AbortController();

function startChild(command, args, stdio, childEnv = env) {
  deadline.signal.throwIfAborted();
  const child = spawn(path.join(BIN, command), args, {
    cwd: ROOT, env: childEnv, stdio, detached: process.platform !== "win32",
  });
  children.add(child);
  return child;
}

function killGroup(child, signal) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") console.error(error);
  }
}

function stopChildren(signal) {
  for (const child of children) killGroup(child, signal);
}

/**
 * Kills a child's process group, also when the child itself has already exited (its own children may remain in the
 * group), and waits until the child has exited and the group is gone.
 */
async function stopChild(child) {
  const running = child.exitCode === null && child.signalCode === null;
  const closed = running ? new Promise((resolve) => child.once("close", resolve)) : undefined;
  killGroup(child, "SIGKILL");
  await closed;
  if (process.platform === "win32" || !child.pid) return;
  const until = Date.now() + GROUP_EXIT_TIMEOUT_MS;
  while (Date.now() < until) {
    try {
      process.kill(-child.pid, 0);
    } catch {
      return; // no process left in the group
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// Test results live outside the working copy, in a directory with a random name. Only the test runners get its path
// (GRADE_RESULTS_DIR); the database script, the build and the app server never see it.
const RESULTS_DIR = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), "grade-"));
const { GRADE_RESULTS_DIR: _inheritedResultsDir, ...parentEnv } = process.env;

// Fixed clock and a throwaway database: every run starts from the same state.
const env = {
  ...parentEnv,
  DATABASE_FILE: process.env.GRADE_DATABASE_FILE ?? "data/test.db",
  SLOTLY_NOW: process.env.SLOTLY_NOW || "2027-03-01T10:00:00.000Z", // Monday 10:00 UTC
  SLOTLY_BASE_URL: BASE_URL,
  BETTER_AUTH_URL: BASE_URL,
  SLOTLY_AUTH_RATE_LIMIT: "off", // tests create many accounts from one IP
  PORT,
};
const testEnv = { ...env, GRADE_RESULTS_DIR: RESULTS_DIR };

function parseArgs(argv) {
  const args = { ticket: undefined, skipBuild: false, all: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--ticket") {
      args.ticket = argv[++i];
      if (!/^SLOT-\d{3}$/i.test(args.ticket ?? "")) throw new Error("Invalid ticket argument");
    }
    else if (argv[i] === "--all") args.all = true;
    else if (argv[i] === "--skip-build") args.skipBuild = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

function currentBranch() {
  if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF;
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** Ticket from --ticket, GRADE_TICKET, the branch name, then the PR title ("SLOT-102: …"). */
function detectTicket(explicit) {
  const sources = [explicit, process.env.GRADE_TICKET, currentBranch(), process.env.GRADE_PR_TITLE];
  for (const source of sources) {
    const match = TICKET_PATTERN.exec(source ?? "");
    if (match) return `SLOT-${match[1]}`;
  }
  return undefined;
}

function selectSuites(manifest, ticket, all) {
  const byId = new Map(manifest.suites.map((suite) => [suite.id, suite]));
  if (all) return manifest.suites;
  if (!ticket) return [byId.get("scaffold")]; // future tickets' suites never run without a ticket
  const position = manifest.tickets.indexOf(ticket);
  if (position === -1) throw new Error(`Unknown ticket ${ticket}. Known: ${manifest.tickets.join(", ")}`);
  const ids = ["scaffold", ...manifest.tickets.slice(0, position + 1)];
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) throw new Error(`No test suite for: ${missing.join(", ")} (tests/manifest.json)`);
  return ids.map((id) => byId.get(id));
}

async function run(command, args, childEnv = env) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  const child = startChild(command, args, ["ignore", "pipe", "pipe"], childEnv);
  let sqliteBusy = false;
  for (const [stream, output] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    let tail = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      output.write(chunk);
      const text = tail + chunk;
      if (/SQLITE_BUSY|database is locked/i.test(text)) sqliteBusy = true;
      tail = text.slice(-100);
    });
  }
  return new Promise((resolve, reject) => {
    const abort = () => reject(deadline.signal.reason);
    deadline.signal.addEventListener("abort", abort, { once: true });
    child.once("error", (error) => {
      deadline.signal.removeEventListener("abort", abort);
      reject(error);
    });
    child.once("close", (code) => {
      deadline.signal.removeEventListener("abort", abort);
      resolve({ ok: code === 0, sqliteBusy });
    });
  });
}

async function waitForServer(server) {
  const readyDeadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  while (Date.now() < readyDeadline) {
    // The run-wide deadline also aborts a health request that never responds.
    deadline.signal.throwIfAborted();
    if (server.exitCode !== null) throw new Error(`Server exited with code ${server.exitCode}`);
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { signal: deadline.signal });
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not become ready at ${BASE_URL} within ${SERVER_READY_TIMEOUT_MS / 1000}s`);
}


const started = Date.now();
// CI starts this budget before checkout so setup cannot consume the report upload window.
const jobStarted = Number(process.env.GRADE_JOB_STARTED_AT) * 1000;
const remaining = Number.isFinite(jobStarted) && jobStarted > 0
  ? Math.min(GRADING_TIMEOUT_MS, jobStarted + GRADING_TIMEOUT_MS - started)
  : GRADING_TIMEOUT_MS;
const timeout = setTimeout(() => {
  deadline.abort(new Error("Grading timed out"));
  stopChildren("SIGKILL");
}, Math.max(0, remaining));
const short = (value) => String(value ?? "").replace(/\u001b\[[0-9;]*m/g, "").slice(0, 200);
/** Whole non-negative milliseconds; a value that is not a finite number becomes 0. */
const toMs = (value) => {
  const ms = typeof value === "number" ? value : Number(value);
  return Number.isFinite(ms) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(ms))) : 0;
};
const gitSha = () => {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); }
  catch { return ""; }
};
const testedSha = process.env.GITHUB_SHA || gitSha();
const headSha = process.env.GRADE_HEAD_SHA || testedSha;
// Only a pull_request run reports the PR that started it; manual and local runs have no pull_request field.
const pullRequest = process.env.GITHUB_EVENT_NAME === "pull_request"
  ? {
    number: Number(process.env.GRADE_PR_NUMBER),
    base_ref: process.env.GRADE_PR_BASE_REF ?? "",
    base_sha: process.env.GRADE_PR_BASE_SHA ?? "",
    head_sha: headSha,
  }
  : undefined;
const report = {
  schema: "reactantlab.grade-report/2",
  ticket: null,
  head_sha: headSha,
  tested_sha: testedSha,
  run: { id: Number(process.env.GITHUB_RUN_ID || 0), attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1) },
  ...(pullRequest && { pull_request: pullRequest }),
  suites: [],
  status: "error",
  error: null,
  started_at: new Date(started).toISOString(),
  duration_ms: 0,
  criteria: [],
};

function fail(kind, message) {
  report.status = "error";
  report.error = { kind, message: short(message) };
  if (kind !== "no_tests") report.criteria = [];
}

function collectCriteria(suites) {
  function add(suite, kind, title, status, duration, expected, got) {
    const key = `${suite}/${kind.toUpperCase()}`;
    const ac = /^(AC\d+):/.exec(title)?.[1];
    if (!ac) throw new Error(`Missing acceptance criterion prefix: ${title}`);
    report.criteria.push({
      id: `${key}/${ac}`, suite, kind, title: short(title), status,
      expected: status === "failed" ? short(expected ?? "Test assertion to pass") : null,
      got: status === "failed" ? short(got ?? "Test failed") : null,
      duration_ms: toMs(duration),
    });
  }
  const api = suites.some((suite) => suite.api?.length)
    ? JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, "api.json"), "utf8"))
    : { testResults: [] };
  const ui = suites.some((suite) => suite.ui?.length)
    ? JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, "ui.json"), "utf8"))
    : { suites: [] };
  for (const file of api.testResults) {
    const suite = suites.find((suite) => suite.api?.some((name) => path.resolve(ROOT, name) === path.resolve(file.name)));
    if (!suite) throw new Error(`Unexpected API file: ${file.name}`);
    for (const test of file.assertionResults) {
      const message = test.failureMessages?.join("\n") ?? "";
      const assertion = /AssertionError: expected (.+?) to ([^\n]+)/.exec(message);
      const expected = /Expected:\s*([^\n]+)/i.exec(message)?.[1] ?? assertion?.[2];
      const got = /Received:\s*([^\n]+)/i.exec(message)?.[1] ?? assertion?.[1];
      add(suite.id, "api", test.title, test.status === "passed" ? "passed" : test.status === "failed" ? "failed" : "skipped",
        test.duration, expected, got ?? message.split("\n")[0]);
    }
  }
  function visit(nodes, file) {
    for (const node of nodes) {
      const fileName = node.file || file;
      for (const spec of node.specs ?? []) {
        const suite = suites.find((suite) => suite.ui?.some((name) => path.resolve(ROOT, name) === path.resolve(ROOT, "tests/ui", spec.file || fileName)));
        if (!suite) throw new Error(`Unexpected UI file: ${spec.file || fileName}`);
        for (const test of spec.tests) {
          const result = test.results.at(-1);
          add(suite.id, "ui", spec.title, test.status === "expected" ? "passed" : test.status === "skipped" ? "skipped" : "failed",
            result?.duration, /Expected:\s*([^\n]+)/i.exec(result?.error?.message ?? "")?.[1],
            /Received:\s*([^\n]+)/i.exec(result?.error?.message ?? "")?.[1] ??
              result?.error?.message?.replace(/\u001b\[[0-9;]*m/g, "").split("\n").map((line) => line.trim()).find(Boolean));
        }
      }
      visit(node.suites ?? [], fileName);
    }
  }
  visit(ui.suites);
  if (api.testResults.some((file) => file.status === "failed" && !file.assertionResults.length) || ui.errors?.length) {
    throw new Error("Test discovery or runner failed");
  }
  if (report.criteria.length > 200 || new Set(report.criteria.map((item) => item.id)).size !== report.criteria.length) {
    throw new Error("Invalid criterion count or duplicate IDs");
  }
}

async function main() {
  if (pullRequest && !(Number.isSafeInteger(pullRequest.number) && pullRequest.number > 0 &&
    pullRequest.base_ref && pullRequest.base_sha && pullRequest.head_sha)) {
    return fail("internal", "Pull request details are missing");
  }
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "tests", "manifest.json"), "utf8"));
  const ticket = args.all ? manifest.tickets.at(-1) : detectTicket(args.ticket);
  report.ticket = ticket ?? null;
  if (ticket && !manifest.tickets.includes(ticket)) return fail("unknown_ticket", `Unknown ticket ${ticket}`);
  const suites = selectSuites(manifest, ticket, args.all);
  report.suites = suites.map((suite) => suite.id);
  const apiFiles = suites.flatMap((suite) => suite.api ?? []);
  const uiFiles = suites.flatMap((suite) => suite.ui ?? []);

  console.log(`Grading ${args.all ? "all suites" : (ticket ?? "scaffold only")}: ${suites.map((suite) => suite.id).join(", ")}`);

  if (!(await run("tsx", ["scripts/db.ts", "reset"])).ok) {
    return fail("build_failed", "Database migration or seed failed");
  }
  if (!args.skipBuild) {
    let build = await run("next", ["build"]);
    const retry = !build.ok && build.sqliteBusy;
    if (retry) {
      console.error("\nSQLite was busy during the build; retrying once.");
      build = await run("next", ["build"]);
    }
    if (!build.ok) {
      console.error("\nBuild failed.");
      // The last attempt decides: still locked is our problem, anything else is a real build failure.
      return build.sqliteBusy
        ? fail("internal", "Database locked during production build")
        : fail("build_failed", "Production build failed");
    }
  }

  const server = startChild("next", ["start", "-p", PORT, "-H", "127.0.0.1"], ["ignore", "inherit", "inherit"]);
  let serverError;
  server.on("error", (error) => { serverError = error; });
  try {
    try { await waitForServer(server); } catch (error) {
      deadline.signal.throwIfAborted();
      return fail("server_failed", error.message);
    }
    if (serverError) throw serverError;
    const apiOk = apiFiles.length === 0 || (await run("vitest", ["run", ...apiFiles], testEnv)).ok;
    const uiOk = uiFiles.length === 0 || (await run("playwright", ["test", ...uiFiles], testEnv)).ok;
    // The app is stopped before the results are read.
    await stopChild(server);
    collectCriteria(suites);
    const failed = report.criteria.some((criterion) => criterion.status === "failed");
    const ran = report.criteria.some((criterion) => criterion.suite === (report.ticket ?? "scaffold") && criterion.status !== "skipped");
    if (!failed && !ran) return fail("no_tests", "No criteria ran for the current suite");
    if ((!apiOk || !uiOk) && !failed) return fail("internal", "Test runner failed without a failed criterion");
    report.status = failed ? "failed" : "passed";
  } finally {
    server.kill("SIGTERM");
  }
  console.log(`\ngrade: ${report.status.toUpperCase()}`);
}

main().catch((error) => {
  console.error(error);
  fail("internal", error instanceof Error ? error.message : String(error));
}).finally(async () => {
  clearTimeout(timeout);
  stopChildren("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 500));
  stopChildren("SIGKILL");
  fs.rmSync(RESULTS_DIR, { recursive: true, force: true });
  report.duration_ms = toMs(Date.now() - started);
  fs.writeFileSync(path.join(ROOT, "grade-report.json"), JSON.stringify(report, null, 2) + "\n");
  process.exitCode = report.status === "passed" ? 0 : 1;
});

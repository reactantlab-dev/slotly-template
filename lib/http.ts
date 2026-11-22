import { NextResponse } from "next/server";

/** Error codes used across the API. See docs/api.md → Errors. */
export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "slot_taken"
  | "too_late"
  | "internal_error";

export function jsonError(status: number, code: ApiErrorCode, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

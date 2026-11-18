/**
 * HTTP helpers for API tests. Tests see the app only through HTTP.
 * `Client` keeps cookies, so it can act as a signed-in user.
 */
export const BASE_URL = process.env.SLOTLY_BASE_URL ?? "http://127.0.0.1:3100";

export type ApiResponse<T = unknown> = { status: number; body: T };

export class Client {
  private cookies = new Map<string, string>();

  async request<T = unknown>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers = new Headers(init.headers);
    if (init.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
    headers.set("origin", BASE_URL);
    if (this.cookies.size > 0) {
      headers.set("cookie", [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    }
    const response = await fetch(new URL(path, BASE_URL), { ...init, headers, redirect: "manual" });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair = ""] = cookie.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (value === "" || /max-age=0/i.test(cookie)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // keep raw text for non-JSON responses
    }
    return { status: response.status, body: body as T };
  }

  get<T = unknown>(path: string) {
    return this.request<T>(path);
  }

  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
  }

  patch<T = unknown>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
  }
}

/** Anonymous requests. */
const anonymous = new Client();
export function api<T = unknown>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  return anonymous.request<T>(path, init);
}

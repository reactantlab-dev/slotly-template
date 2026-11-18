import { jsonError } from "@/lib/http";

// Unknown API routes return the standard JSON error instead of the HTML 404 page.
function notFound() {
  return jsonError(404, "not_found", "Route not found");
}

export { notFound as GET, notFound as POST, notFound as PATCH, notFound as PUT, notFound as DELETE };

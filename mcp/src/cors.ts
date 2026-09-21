// CORS for browser clients: the /asistente-ia chat on cambio-uruguay.com talks to this
// server straight from the visitor's browser. Only the site origins are allowed; any
// other client (Claude, ChatGPT, editors) calls server-to-server and needs no CORS.

export const DEFAULT_ALLOWED_ORIGINS = [
  "https://cambio-uruguay.com",
  "https://www.cambio-uruguay.com",
  "http://localhost:3000",
] as const;

export function allowedOrigins(raw = process.env.MCP_CORS_ORIGINS): string[] {
  const extra = String(raw ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}

/** Headers for an allowed origin, or null (no CORS headers at all) for any other. */
export function corsHeaders(origin: string | undefined, allowed: readonly string[]): Record<string, string> | null {
  if (!origin || !allowed.includes(origin)) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id",
    "access-control-expose-headers": "mcp-session-id",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

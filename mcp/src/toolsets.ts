// Toolsets let a client load only the part it needs: /mcp exposes everything,
// /mcp/alquileres only the rental tools, and so on (stdio: MCP_TOOLSETS=a,b).

export const TOOLSETS = ["cambio", "alquileres", "autos", "productos"] as const;
export type Toolset = (typeof TOOLSETS)[number];

const isToolset = (value: string): value is Toolset => (TOOLSETS as readonly string[]).includes(value);

/** Comma list → known toolsets; empty or all-unknown → every toolset. */
export function parseToolsets(raw?: string | null): Toolset[] {
  const picked = String(raw ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(isToolset);
  return picked.length ? TOOLSETS.filter((t) => picked.includes(t)) : [...TOOLSETS];
}

/** `/mcp` → all, `/mcp/autos` → ["autos"], `/mcp?toolsets=a,b` → those; any other path → null (404). */
export function toolsetsFromUrl(url: string): Toolset[] | null {
  const parsed = new URL(url, "http://localhost");
  const path = parsed.pathname.replace(/\/+$/, "");
  if (path === "/mcp") return parseToolsets(parsed.searchParams.get("toolsets"));
  const match = /^\/mcp\/([a-z]+)$/.exec(path);
  if (match && isToolset(match[1]!)) return [match[1] as Toolset];
  return null;
}

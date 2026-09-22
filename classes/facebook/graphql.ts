// Reading Facebook's own GraphQL payloads, shared by every Marketplace reader.
//
// A Marketplace page embeds `<script type="application/json">` documents and streams GraphQL
// responses one JSON document per line (with a `for (;;);` prefix). The listing node we want is
// buried at an unpredictable depth, so the readers walk every blob and test each object.
// Extracted from classes/autos/sources/facebook.ts (still carrying its own copy) for the rentals
// detail reader; both copies are meant to converge here.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FbNode = Record<string, any>;

/** An embedded `<script type="application/json">` is one document; a GraphQL response is one per line. */
export function fbBlobs(text: string): unknown[] {
  const out: unknown[] = [];
  const whole = String(text || "").replace(/^for \(;;\);/, "").trim();
  if (whole.startsWith("{") || whole.startsWith("[")) {
    try {
      return [JSON.parse(whole)];
    } catch {
      // Several documents, one per line: parsed below.
    }
  }
  for (const line of String(text || "").split("\n")) {
    const trimmed = line.replace(/^for \(;;\);/, "").trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // Not every line of a streamed response is JSON.
    }
  }
  return out;
}

export function fbWalk(node: unknown, test: (node: FbNode) => boolean, out: FbNode[], depth = 0): void {
  if (!node || typeof node !== "object" || depth > 80) return;
  if (Array.isArray(node)) {
    for (const item of node) fbWalk(item, test, out, depth + 1);
    return;
  }
  if (test(node as FbNode)) out.push(node as FbNode);
  for (const value of Object.values(node as FbNode)) fbWalk(value, test, out, depth + 1);
}

/** Every node across all texts that passes the test. */
export function fbNodes(texts: readonly string[], test: (node: FbNode) => boolean): FbNode[] {
  const nodes: FbNode[] = [];
  for (const text of texts) for (const blob of fbBlobs(text)) fbWalk(blob, test, nodes);
  return nodes;
}

export const fbId = (value: unknown): string | null => (typeof value === "string" && /^\d{6,20}$/.test(value) ? value : null);

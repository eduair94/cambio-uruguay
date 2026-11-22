// The ONE client for the Anthropic API, the same way classes/gemini.ts is the one client for Gemini
// and classes/claude.ts the one for the subscription endpoint on the deploy box.
// `tests/anthropic_key_ownership.test.ts` enforces it.
//
// What it is for: the maintainer has prepaid API credit on three Anthropic accounts and pays Gemini
// by card. Every call a job makes through classes/llm.ts tries Claude here first, and only an
// answer that did not come back costs Gemini money. So the whole module is built around one
// question — "is there a key that can still spend?" — and around answering it cheaply.
//
//  1. THREE KEYS, ROTATED. `ANTHROPIC_API_KEYS` (comma-separated), `ANTHROPIC_API_KEY_1..9` or the
//     bare `ANTHROPIC_API_KEY`. Round-robin over the usable ones: new accounts sit on a low
//     requests-per-minute tier, and spreading a burst over three of them triples the headroom.
//
//  2. A DEAD KEY IS LEARNED ONCE PER PROCESS. No credit left (402, or the 400 that says "credit
//     balance is too low"), a spend cap reached, a revoked key (401) or a disabled organisation
//     (403): none of those fix themselves within a cron run, so the key is retired for the rest of
//     the process and the SAME call moves on to the next key. When all three are gone every call
//     returns null at once, and classes/llm.ts goes to Gemini without paying a round trip per call.
//
//  3. A 429 IS NOT DEATH. The per-minute limit resets, so the key rests 60 s — or what
//     `retry-after` says — and comes back on its own. The SDK has already retried twice by then.
//
//  4. AN OUTAGE IS NOT THE KEY'S FAULT. 5xx, 529 overloaded, a timeout or a dropped socket fail
//     this call (null → Gemini) and retire nothing: another key would hit the same outage.
//
// Same contract as gemini.ts: it NEVER throws. A key is never logged whole, only "…" + its last
// four characters.

import Anthropic, {
  APIError,
  AuthenticationError,
  BadRequestError,
  PermissionDeniedError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import "dotenv/config";

/** Same price as gemini-*-flash-lite per token: every dollar of credit replaces about a dollar of Gemini. */
const DEFAULT_MODEL = "claude-haiku-5-5";
const DEFAULT_MAX_TOKENS = 8000;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_REST_MS = 60_000;

export type ClaudeEffort = "low" | "medium" | "high";

export interface ClaudeCallOptions {
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
  effort?: ClaudeEffort;
}

export interface ClaudeReply {
  text: string;
  model: string;
  keyLabel: string;
}

/** The slice of the SDK client this module uses — small on purpose, so a test can stand in for it. */
interface MessagesClient {
  messages: {
    stream(params: any, options?: { timeout?: number }): { finalMessage(): Promise<any> };
  };
}

type ClientFactory = (apiKey: string) => MessagesClient;

const defaultFactory: ClientFactory = (apiKey) =>
  new Anthropic({ apiKey, maxRetries: 2, timeout: DEFAULT_TIMEOUT_MS }) as unknown as MessagesClient;

let factory: ClientFactory = defaultFactory;
const clients = new Map<string, MessagesClient>();
let now: () => number = () => Date.now();

interface KeyState {
  retired?: string;
  restUntil?: number;
}
const states = new Map<string, KeyState>();

interface KeyUsage {
  key: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  searches: number;
  failures: number;
}
const usage = new Map<string, KeyUsage>();
let roundRobin = 0;
let exitHookInstalled = false;

/** Test seams. */
export function __setAnthropicClientFactoryForTests(f: ClientFactory | null): void {
  factory = f ?? defaultFactory;
  clients.clear();
}
export function __setAnthropicNowForTests(f: (() => number) | null): void {
  now = f ?? (() => Date.now());
}
export function __resetAnthropicForTests(): void {
  states.clear();
  usage.clear();
  clients.clear();
  roundRobin = 0;
}

const label = (key: string): string => `…${key.slice(-4)}`;

/** Every key the environment declares, deduplicated, in declaration order. */
export function anthropicKeys(): string[] {
  const raw = [
    ...(process.env.ANTHROPIC_API_KEYS || "").split(","),
    ...Array.from({ length: 9 }, (_v, i) => process.env[`ANTHROPIC_API_KEY_${i + 1}`] || ""),
    process.env.ANTHROPIC_API_KEY || "",
  ];
  return [...new Set(raw.map((k) => k.trim()).filter(Boolean))];
}

/** `AI_LLM_PROVIDER=gemini` turns Claude off without a deploy — to reproduce an answer, or in an emergency. */
const pinnedToGemini = (): boolean => (process.env.AI_LLM_PROVIDER || "").trim().toLowerCase() === "gemini";

function usableKeys(): string[] {
  const t = now();
  return anthropicKeys().filter((key) => {
    const state = states.get(key);
    return !state?.retired && (state?.restUntil ?? 0) <= t;
  });
}

/** Is there a key that can spend right now? */
export function anthropicConfigured(): boolean {
  return !pinnedToGemini() && usableKeys().length > 0;
}

export function anthropicModel(): string {
  return (process.env.ANTHROPIC_MODEL || DEFAULT_MODEL).trim();
}

function effort(opts: ClaudeCallOptions): ClaudeEffort {
  const env = (process.env.ANTHROPIC_EFFORT || "").trim();
  if (opts.effort) return opts.effort;
  return env === "medium" || env === "high" ? env : "low";
}

function usageFor(key: string): KeyUsage {
  let row = usage.get(key);
  if (!row) {
    row = { key: label(key), calls: 0, inputTokens: 0, outputTokens: 0, searches: 0, failures: 0 };
    usage.set(key, row);
  }
  return row;
}

/** Spend per key in this process, for the exit summary and for jobs that want to report it. */
export function anthropicUsage(): KeyUsage[] {
  return [...usage.values()].map((row) => ({ ...row }));
}

function installExitSummary(): void {
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  process.once("exit", () => {
    const rows = anthropicUsage().filter((row) => row.calls || row.failures);
    if (!rows.length) return;
    const parts = rows.map(
      (row) =>
        `${row.key}: ${row.calls} llamadas, ${row.inputTokens} in / ${row.outputTokens} out` +
        `${row.searches ? `, ${row.searches} búsquedas` : ""}${row.failures ? `, ${row.failures} fallas` : ""}`
    );
    console.log(`[anthropic] uso de esta corrida (${anthropicModel()}) — ${parts.join(" · ")}`);
  });
}

type Verdict = { kind: "retire" | "rest" | "call"; reason: string; restMs?: number };

/** What a failure says about the KEY. Typed SDK classes first; text only for the credit message. */
function classify(error: unknown): Verdict {
  const reason = ((error as any)?.message || String(error)).replace(/\s+/g, " ").slice(0, 200);
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) return { kind: "retire", reason };
  if (error instanceof APIError && error.status === 402) return { kind: "retire", reason };
  if (error instanceof BadRequestError && /credit balance|usage limits|billing/i.test(reason)) return { kind: "retire", reason };
  if (error instanceof RateLimitError) {
    const retryAfter = Number(error.headers?.get?.("retry-after"));
    return { kind: "rest", reason, restMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : DEFAULT_REST_MS };
  }
  return { kind: "call", reason };
}

/**
 * One request, trying the usable keys in round-robin order until one answers or the failure is not
 * the key's. Returns the raw message, or null.
 */
async function callClaude(params: Record<string, unknown>, timeoutMs: number): Promise<{ message: any; key: string } | null> {
  if (pinnedToGemini()) return null;
  const keys = usableKeys();
  if (!keys.length) return null;
  installExitSummary();

  const start = roundRobin++ % keys.length;
  const order = [...keys.slice(start), ...keys.slice(0, start)];

  for (const key of order) {
    const row = usageFor(key);
    try {
      let client = clients.get(key);
      if (!client) {
        client = factory(key);
        clients.set(key, client);
      }
      const message = await client.messages.stream(params, { timeout: timeoutMs }).finalMessage();
      row.calls += 1;
      row.inputTokens += Number(message?.usage?.input_tokens) || 0;
      row.outputTokens += Number(message?.usage?.output_tokens) || 0;
      row.searches += Number(message?.usage?.server_tool_use?.web_search_requests) || 0;
      return { message, key };
    } catch (error) {
      row.failures += 1;
      const verdict = classify(error);
      if (verdict.kind === "retire") {
        states.set(key, { retired: verdict.reason });
        console.warn(`[anthropic] clave ${label(key)} apartada por esta corrida: ${verdict.reason}`);
        continue;
      }
      if (verdict.kind === "rest") {
        states.set(key, { restUntil: now() + (verdict.restMs ?? DEFAULT_REST_MS) });
        console.warn(`[anthropic] clave ${label(key)} en pausa ${Math.round((verdict.restMs ?? DEFAULT_REST_MS) / 1000)} s: ${verdict.reason}`);
        continue;
      }
      console.warn(`[anthropic] la llamada falló (${label(key)}), no es la clave: ${verdict.reason}`);
      return null;
    }
  }
  return null;
}

function textOf(message: any): string {
  return (Array.isArray(message?.content) ? message.content : [])
    .filter((block: any) => block?.type === "text")
    .map((block: any) => block.text ?? "")
    .join("")
    .trim();
}

function baseParams(content: unknown, opts: ClaudeCallOptions, extraOutput: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    model: anthropicModel(),
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: [{ role: "user", content }],
    output_config: { effort: effort(opts), ...extraOutput },
    ...(opts.system ? { system: opts.system } : {}),
  };
}

/** One question, prose back. `null` on anything at all going wrong, including "no usable key". */
export async function askClaudePlain(prompt: string, opts: ClaudeCallOptions = {}): Promise<ClaudeReply | null> {
  const res = await callClaude(baseParams(prompt, opts), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!res || res.message?.stop_reason === "refusal") return null;
  const text = textOf(res.message);
  return text ? { text, model: String(res.message?.model || anthropicModel()), keyLabel: label(res.key) } : null;
}

// ── Structured output and images ──────────────────────────────────────────────────────────────

/** Keys Claude's structured outputs reject or ignore; the SDK would strip some, we strip them all. */
const SCHEMA_DROP = new Set([
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
  "propertyOrdering",
  "example",
  "default",
  "nullable",
]);
const SCHEMA_FORMATS = new Set(["date-time", "time", "date", "duration", "email", "hostname", "uri", "ipv4", "ipv6", "uuid"]);
const SCHEMA_CHILD_LISTS = new Set(["anyOf", "allOf", "oneOf", "prefixItems"]);
const SCHEMA_CHILD_MAPS = new Set(["properties", "$defs", "definitions"]);

function convertSchema(node: any): any {
  if (Array.isArray(node)) return node.map(convertSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (SCHEMA_DROP.has(key)) continue;
    if (key === "minItems") {
      if (value === 0 || value === 1) out.minItems = value;
    } else if (key === "format") {
      if (typeof value === "string" && SCHEMA_FORMATS.has(value)) out.format = value;
    } else if (key === "type") {
      out.type = Array.isArray(value)
        ? value.map((t) => (typeof t === "string" ? t.toLowerCase() : t))
        : typeof value === "string"
          ? value.toLowerCase()
          : value;
    } else if (SCHEMA_CHILD_MAPS.has(key) && value && typeof value === "object") {
      out[key] = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, convertSchema(child)]));
    } else if (key === "items" || SCHEMA_CHILD_LISTS.has(key)) {
      out[key] = convertSchema(value);
    } else {
      out[key] = value;
    }
  }
  if (out.type === "object") out.additionalProperties = false;
  return node.nullable === true ? { anyOf: [out, { type: "null" }] } : out;
}

/**
 * A schema written for Gemini (OpenAPI subset, sometimes upper-case types) as Claude's structured
 * outputs want it: every object closed with `additionalProperties: false`, unsupported constraints
 * removed, `nullable` as `anyOf … null`. Never mutates its input.
 */
export function toClaudeSchema(schema: unknown): Record<string, unknown> {
  return convertSchema(schema) as Record<string, unknown>;
}

/** Strict parse first; then the object/array inside fences or prose, which should not happen under a schema. */
function parseJsonText(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const candidate = fenced ?? text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0];
    if (!candidate) return undefined;
    try {
      return JSON.parse(candidate.trim());
    } catch {
      return undefined;
    }
  }
}

/** One question whose answer must match `schema`. `null` on refusal, truncation or anything unparseable. */
export async function askClaudeJSON<T>(
  prompt: string,
  schema: unknown,
  opts: ClaudeCallOptions = {}
): Promise<{ value: T; model: string } | null> {
  const params = baseParams(prompt, opts, { format: { type: "json_schema", schema: toClaudeSchema(schema) } });
  const res = await callClaude(params, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!res || res.message?.stop_reason === "refusal" || res.message?.stop_reason === "max_tokens") return null;
  const value = parseJsonText(textOf(res.message));
  return value === undefined ? null : { value: value as T, model: String(res.message?.model || anthropicModel()) };
}

/** What Claude's vision accepts. Anything else goes to Gemini rather than failing here. */
export const CLAUDE_IMAGE_MIME: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/**
 * A question about images we already downloaded, images first and the question after them.
 * With `schema`, the reply is parsed and returned as `value`.
 */
export async function askClaudeWithImages(
  prompt: string,
  images: ReadonlyArray<{ data: Buffer; mimeType: string }>,
  opts: ClaudeCallOptions & { schema?: unknown } = {}
): Promise<{ text: string; value?: unknown; model: string } | null> {
  if (!images.length || images.some((image) => !CLAUDE_IMAGE_MIME.has(image.mimeType))) return null;
  const content = [
    ...images.map((image) => ({
      type: "image",
      source: { type: "base64", media_type: image.mimeType, data: image.data.toString("base64") },
    })),
    { type: "text", text: prompt },
  ];
  const format = opts.schema ? { format: { type: "json_schema", schema: toClaudeSchema(opts.schema) } } : {};
  const res = await callClaude(baseParams(content, opts, format), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!res || res.message?.stop_reason === "refusal") return null;
  const text = textOf(res.message);
  if (!text) return null;
  const model = String(res.message?.model || anthropicModel());
  if (!opts.schema) return { text, model };
  if (res.message?.stop_reason === "max_tokens") return null;
  const value = parseJsonText(text);
  return value === undefined ? null : { text, value, model };
}

// The ONE client for the Anthropic API, the same way classes/gemini.ts is the one client for Gemini
// and classes/claude.ts the one for the subscription endpoint on the deploy box.
// `tests/anthropic_key_ownership.test.ts` enforces it.
//
// What it is for: the maintainer has prepaid API credit on three Anthropic accounts and pays Gemini
// by card. Every call a job makes through classes/llm.ts tries Claude here first, and only an
// answer that did not come back costs Gemini money. So the whole module is built around one
// question — "is there a key that can still spend?" — and around answering it cheaply.
//
//  1. THREE KEYS, ROTATED. `ANTHROPIC_API_KEYS` or `CLAUDE_CREDIT_KEYS` (the pool format the
//     owner's other projects use: `label=sk-ant-...` entries separated by commas, semicolons or
//     newlines), `ANTHROPIC_API_KEY_1..9` or the bare `ANTHROPIC_API_KEY`. Round-robin over the
//     usable ones: spreading a burst over three organisations triples the per-minute headroom.
//     They are the MONTHLY credits included with Claude plans: no rollover, unused is lost.
//
//  1b. A MONTHLY CAP PER KEY, ESTIMATED HERE. The Console stops a key when its included credit runs
//     out, unless that organisation also holds purchased credit or has auto-reload on: then it
//     keeps going and bills a card, which is the opposite of the point. So every call's estimated
//     cost is appended to `.anthropic-usage/<YYYY-MM>.jsonl` (label and dollars, never the key),
//     shared by every cron process, and a key whose month reaches ANTHROPIC_KEY_MONTHLY_CAP_USD
//     (default 25; 0 = no cap; one number or `label=usd` per key) is skipped until the month
//     turns. Other projects spend the same keys, so this cap is this project's share, not the
//     organisation's total — set it per label to "included credit − the other projects' caps".
//
//  2. A DEAD KEY IS LEARNED ONCE PER PROCESS. No credit left (402, or the 400 that says "credit
//     balance is too low"), a spend cap reached, a revoked key (401) or a disabled organisation
//     (403): none of those fix themselves within a cron run, so the key is retired for the rest of
//     the process and the SAME call moves on to the next key. When all three are gone every call
//     returns null at once, and classes/llm.ts goes to Gemini without paying a round trip per call.
//
//  3. A 429 IS NOT DEATH. The per-minute limit resets, so the key rests 60 s — or what
//     `retry-after` says — and comes back on its own. The SDK does not retry (maxRetries: 0).
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
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import "dotenv/config";
import fs from "fs";
import path from "path";
import type { GroundedReply, GroundingSupport } from "./gemini";

/** Same price as gemini-*-flash-lite per token: every dollar of credit replaces about a dollar of Gemini. */
const DEFAULT_MODEL = "claude-haiku-5-5";
const DEFAULT_MAX_TOKENS = 8000;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_REST_MS = 60_000;

export type ClaudeEffort = "low" | "medium" | "high";

export interface ClaudeCallOptions {
  system?: string;
  /**
   * Mark the system prompt as a cache breakpoint. Worth it for a job that sends the same long
   * instructions on every call within minutes (the photo jobs); a prefix under the model's minimum
   * (512 tokens on Haiku 5.5) silently does not cache and costs nothing extra.
   */
  cacheSystem?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
  effort?: ClaudeEffort;
}

/** Tokens of one call, as the response's usage block reports them. */
export interface ClaudeUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface ClaudeReply {
  text: string;
  model: string;
  keyLabel: string;
}

/** The slice of the SDK client this module uses — small on purpose, so a test can stand in for it. */
interface MessagesClient {
  messages: {
    stream(params: Anthropic.MessageStreamParams, options?: { timeout?: number; signal?: AbortSignal }): { finalMessage(): Promise<any> };
  };
}

type ClientFactory = (apiKey: string) => MessagesClient;

/** Test seam: the real SDK client, with the network replaced. */
let fetchOverride: ((input: any, init?: any) => Promise<Response>) | null = null;

/**
 * `maxRetries: 0`: the SDK's own retries run on the SAME key and sleep whatever `retry-after` says
 * (any value, up to weeks) before this module's rotation ever sees the 429. Rotation is the retry,
 * and Gemini is the retry after that.
 *
 * `baseURL` is fixed: the SDK otherwise reads ANTHROPIC_BASE_URL from the environment, and three
 * credit-bearing keys must never be sent wherever that happens to point.
 */
const defaultFactory: ClientFactory = (apiKey) =>
  new Anthropic({
    apiKey,
    baseURL: "https://api.anthropic.com",
    maxRetries: 0,
    timeout: DEFAULT_TIMEOUT_MS,
    ...(fetchOverride ? { fetch: fetchOverride as any } : {}),
  }) as unknown as MessagesClient;

let factory: ClientFactory = defaultFactory;
const clients = new Map<string, MessagesClient>();
let now: () => number = () => Date.now();
export function __setAnthropicFetchForTests(f: ((input: any, init?: any) => Promise<Response>) | null): void {
  fetchOverride = f;
  clients.clear();
}

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
  costUsd: number;
}
const usage = new Map<string, KeyUsage>();
let roundRobin = 0;
let exitHookInstalled = false;

/**
 * Outages are not a key's fault, so they retire nothing — but during an Anthropic incident every
 * call would still pay the full wait before Gemini. Three in a row and Claude is skipped for five
 * minutes; any success resets the streak.
 */
const OUTAGE_STREAK_LIMIT = 3;
const OUTAGE_COOLDOWN_MS = 5 * 60_000;
let outageStreak = 0;
let outageUntil = 0;

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
  outageStreak = 0;
  outageUntil = 0;
  ledger = null;
  cappedWarned.clear();
  ledgerWriteWarned = false;
}

export interface PoolKey {
  label: string;
  key: string;
}

/** Every key the environment declares, deduplicated, in declaration order, with its label. */
export function anthropicKeyPool(): PoolKey[] {
  const raw = [
    process.env.ANTHROPIC_API_KEYS,
    process.env.CLAUDE_CREDIT_KEYS,
    ...Array.from({ length: 9 }, (_v, i) => process.env[`ANTHROPIC_API_KEY_${i + 1}`]),
    process.env.ANTHROPIC_API_KEY,
  ].join("\n");
  const seen = new Set<string>();
  const pool: PoolKey[] = [];
  for (const item of raw.split(/[\s,;]+/)) {
    if (!item) continue;
    const eq = item.indexOf("=");
    const key = (eq > 0 ? item.slice(eq + 1) : item).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    pool.push({ label: (eq > 0 ? item.slice(0, eq).trim() : "") || `…${key.slice(-4)}`, key });
  }
  return pool;
}

export function anthropicKeys(): string[] {
  return anthropicKeyPool().map((entry) => entry.key);
}

/** The key's label from the pool, or "…" + its last four characters. Never the key. */
function label(key: string): string {
  return anthropicKeyPool().find((entry) => entry.key === key)?.label ?? `…${key.slice(-4)}`;
}

// ── Monthly cap (see 1b in the header) ─────────────────────────────────────────────────────────

const DEFAULT_MONTHLY_CAP_USD = 25;
const LEDGER_REFRESH_MS = 5 * 60_000;

const asCap = (raw: string): number | null => {
  const value = Number(raw.trim());
  return raw.trim() && Number.isFinite(value) && value >= 0 ? value : null;
};

/**
 * The cap for one label. `ANTHROPIC_KEY_MONTHLY_CAP_USD` is either one number for every key (`25`)
 * or per label, with an optional bare number as the default for the rest (`a=110,b=10,c=10` or
 * `30;a=110`). Per label because the plans differ (an Ultra organisation includes twice the credit
 * of a Max one) and so does what the owner's other projects already reserve on each key: the only
 * cap that guarantees an organisation never spends past its included credit is "plan − the other
 * projects' caps", and that number is different for every key. Unparseable entries are ignored.
 */
function monthlyCapUsd(keyLabel: string): number {
  let fallback = DEFAULT_MONTHLY_CAP_USD;
  let mine: number | null = null;
  for (const item of (process.env.ANTHROPIC_KEY_MONTHLY_CAP_USD ?? "").split(/[\s,;]+/)) {
    if (!item) continue;
    const eq = item.indexOf("=");
    if (eq < 0) {
      fallback = asCap(item) ?? fallback;
    } else if (item.slice(0, eq).trim() === keyLabel) {
      mine = asCap(item.slice(eq + 1)) ?? mine;
    }
  }
  return mine ?? fallback;
}

const usageDir = (): string => process.env.ANTHROPIC_USAGE_DIR || path.join(process.cwd(), ".anthropic-usage");
const monthOf = (t: number): string => new Date(t).toISOString().slice(0, 7);

/** Price per million tokens [input, output]. Unknown models priced like the most expensive tier. */
const PRICES: Array<[RegExp, number, number]> = [
  [/^claude-haiku-5/, 0.1, 0.5],
  [/^claude-haiku-4/, 1, 5],
  [/^claude-sonnet-(5|4-6)/, 2, 10],
  [/^claude-opus-5-5/, 4, 20],
  [/^claude-opus/, 5, 25],
];
const UNKNOWN_PRICE: [number, number] = [10, 50];
const SEARCH_USD = 0.01;

/** Estimated dollars for one response's usage block. Errs high where unsure. */
export function estimateClaudeCostUsd(model: string, used: any): number {
  const known = PRICES.find(([pattern]) => pattern.test(model));
  let [inPrice, outPrice] = known ? [known[1], known[2]] : UNKNOWN_PRICE;
  const input = Number(used?.input_tokens) || 0;
  const cacheWrite = Number(used?.cache_creation_input_tokens) || 0;
  const cacheRead = Number(used?.cache_read_input_tokens) || 0;
  // Haiku 5.5 bills prompts above 100K tokens at a higher rate.
  if (/^claude-haiku-5/.test(model) && input + cacheWrite + cacheRead > 100_000) [inPrice, outPrice] = [0.5, 2.5];
  const tokens =
    input * inPrice + cacheWrite * inPrice * 1.25 + cacheRead * inPrice * 0.1 + (Number(used?.output_tokens) || 0) * outPrice;
  return tokens / 1_000_000 + (Number(used?.server_tool_use?.web_search_requests) || 0) * SEARCH_USD;
}

let ledger: { month: string; byLabel: Map<string, number>; loadedAt: number } | null = null;
const cappedWarned = new Set<string>();
let ledgerWriteWarned = false;

/** This month's spend per label, from the file every process appends to; re-read every 5 minutes. */
function monthSpend(): Map<string, number> {
  const month = monthOf(now());
  if (!ledger || ledger.month !== month || now() - ledger.loadedAt > LEDGER_REFRESH_MS) {
    const byLabel = new Map<string, number>();
    try {
      for (const line of fs.readFileSync(path.join(usageDir(), `${month}.jsonl`), "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line);
          if (typeof row?.k === "string" && Number.isFinite(row?.usd)) byLabel.set(row.k, (byLabel.get(row.k) ?? 0) + row.usd);
        } catch {
          /* a torn line from a concurrent writer costs one entry, not the ledger */
        }
      }
    } catch {
      /* no file yet this month */
    }
    ledger = { month, byLabel, loadedAt: now() };
  }
  return ledger.byLabel;
}

function recordSpend(keyLabel: string, model: string, usd: number): void {
  const spend = monthSpend();
  spend.set(keyLabel, (spend.get(keyLabel) ?? 0) + usd);
  try {
    fs.mkdirSync(usageDir(), { recursive: true });
    const line = JSON.stringify({ t: new Date(now()).toISOString(), k: keyLabel, m: model, usd: Math.round(usd * 1e6) / 1e6 });
    fs.appendFileSync(path.join(usageDir(), `${monthOf(now())}.jsonl`), `${line}\n`);
  } catch (e: any) {
    if (!ledgerWriteWarned) console.warn(`[anthropic] no pude anotar el gasto en ${usageDir()}: ${e?.message || e}`);
    ledgerWriteWarned = true;
  }
}

function overCap(key: string): boolean {
  const name = label(key);
  const cap = monthlyCapUsd(name);
  if (cap <= 0) return false;
  const spent = monthSpend().get(name) ?? 0;
  if (spent < cap) return false;
  if (!cappedWarned.has(name)) {
    cappedWarned.add(name);
    console.warn(`[anthropic] clave ${name}: US$ ${spent.toFixed(2)} estimados este mes, tope US$ ${cap} — se saltea hasta el mes que viene`);
  }
  return true;
}

/** `AI_LLM_PROVIDER=gemini` turns Claude off without a deploy — to reproduce an answer, or in an emergency. */
const pinnedToGemini = (): boolean => (process.env.AI_LLM_PROVIDER || "").trim().toLowerCase() === "gemini";

function usableKeys(): string[] {
  const t = now();
  return anthropicKeys().filter((key) => {
    const state = states.get(key);
    return !state?.retired && (state?.restUntil ?? 0) <= t && !overCap(key);
  });
}

/** Is there a key that can spend right now? */
export function anthropicConfigured(): boolean {
  return !pinnedToGemini() && now() >= outageUntil && usableKeys().length > 0;
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
    row = { key: label(key), calls: 0, inputTokens: 0, outputTokens: 0, searches: 0, failures: 0, costUsd: 0 };
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
        `${row.searches ? `, ${row.searches} búsquedas` : ""}${row.failures ? `, ${row.failures} fallas` : ""}` +
        `, ~US$ ${row.costUsd.toFixed(4)} (mes: ~US$ ${(monthSpend().get(row.key) ?? 0).toFixed(2)})`
    );
    console.log(`[anthropic] uso de esta corrida (${anthropicModel()}) — ${parts.join(" · ")}`);
  });
}

type Verdict = { kind: "retire" | "rest" | "call"; reason: string; restMs?: number };

/** What a failure says about the KEY. Typed SDK classes first; text only for the credit message. */
function classify(error: unknown): Verdict {
  const reason = ((error as any)?.message || String(error)).replace(/\s+/g, " ").slice(0, 200);
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) return { kind: "retire", reason };
  // A 404 on /v1/messages is a model this organisation cannot use: another key may serve it.
  if (error instanceof NotFoundError) return { kind: "retire", reason };
  if (error instanceof APIError && error.status === 402) return { kind: "retire", reason };
  // A monthly spend cap arrives as a 429 (the SDK's EnforcedSpendLimitReachedError extends
  // RateLimitError) but it does not reset in a minute: checked BEFORE the 429 rest below.
  if (error instanceof APIError && (error.errorCode === "enforced_spend_limit_reached" || error.type === "billing_error")) {
    return { kind: "retire", reason };
  }
  if (error instanceof BadRequestError && /credit balance|usage limits|billing/i.test(error.apiMessage ?? reason)) {
    return { kind: "retire", reason };
  }
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
async function callClaude(params: Anthropic.MessageStreamParams, timeoutMs: number): Promise<{ message: any; key: string } | null> {
  if (pinnedToGemini() || now() < outageUntil) return null;
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
      const message = await client.messages
        .stream(params, { timeout: timeoutMs, signal: AbortSignal.timeout(timeoutMs) })
        .finalMessage();
      outageStreak = 0;
      row.calls += 1;
      row.inputTokens += Number(message?.usage?.input_tokens) || 0;
      row.outputTokens += Number(message?.usage?.output_tokens) || 0;
      row.searches += Number(message?.usage?.server_tool_use?.web_search_requests) || 0;
      const model = String(message?.model || params.model || "");
      const usd = estimateClaudeCostUsd(model, message?.usage);
      row.costUsd += usd;
      recordSpend(row.key, model, usd);
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
        // A concurrent call may have retired this key while this one waited: a dead key stays dead.
        if (states.get(key)?.retired) continue;
        states.set(key, { restUntil: now() + (verdict.restMs ?? DEFAULT_REST_MS) });
        console.warn(`[anthropic] clave ${label(key)} en pausa ${Math.round((verdict.restMs ?? DEFAULT_REST_MS) / 1000)} s: ${verdict.reason}`);
        continue;
      }
      console.warn(`[anthropic] la llamada falló (${label(key)}), no es la clave: ${verdict.reason}`);
      outageStreak += 1;
      if (outageStreak >= OUTAGE_STREAK_LIMIT) {
        outageStreak = 0;
        outageUntil = now() + OUTAGE_COOLDOWN_MS;
        console.warn(`[anthropic] ${OUTAGE_STREAK_LIMIT} fallas seguidas del servicio: Claude se saltea 5 min, todo va a Gemini`);
      }
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

function baseParams(
  content: string | Anthropic.ContentBlockParam[],
  opts: ClaudeCallOptions,
  extraOutput: Partial<Anthropic.OutputConfig> = {}
): Anthropic.MessageStreamParams {
  return {
    model: anthropicModel(),
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: [{ role: "user", content }],
    output_config: { effort: effort(opts), ...extraOutput },
    ...(opts.system
      ? { system: opts.cacheSystem ? [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }] : opts.system }
      : {}),
  };
}

function usageOf(message: any): ClaudeUsage {
  const used = message?.usage;
  return {
    input: Number(used?.input_tokens) || 0,
    output: Number(used?.output_tokens) || 0,
    cacheRead: Number(used?.cache_read_input_tokens) || 0,
    cacheWrite: Number(used?.cache_creation_input_tokens) || 0,
  };
}

/** One question, prose back. `null` on anything at all going wrong, including "no usable key". */
export async function askClaudePlain(prompt: string, opts: ClaudeCallOptions = {}): Promise<ClaudeReply | null> {
  const res = await callClaude(baseParams(prompt, opts), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // A cut answer is not an answer: the callers parse JSON out of this text, and Gemini, which ran
  // with no output cap, gets the chance to give the whole thing.
  if (!res || res.message?.stop_reason === "refusal" || res.message?.stop_reason === "max_tokens") return null;
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
  const params = baseParams(prompt, opts, { format: { type: "json_schema" as const, schema: toClaudeSchema(schema) } });
  const res = await callClaude(params, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!res || res.message?.stop_reason === "refusal" || res.message?.stop_reason === "max_tokens") return null;
  const value = parseJsonText(textOf(res.message));
  return value === undefined ? null : { value: value as T, model: String(res.message?.model || anthropicModel()) };
}

/** What Claude's vision accepts. Anything else goes to Gemini rather than failing here. */
export const CLAUDE_IMAGE_MIME: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export type ClaudeImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/**
 * The image format from its first bytes, or null when it is none Claude reads.
 *
 * The callers label an image by its URL's extension, and a CDN serves whatever it likes behind it
 * (a ".jpg" that is a WebP, an AVIF): Claude answers a mislabelled image with a 400, so every such
 * photo used to cost a round trip and land on Gemini anyway.
 */
export function sniffImageMime(data: Buffer): ClaudeImageMime | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  const head = data.subarray(0, 12).toString("latin1");
  if (head.startsWith("GIF87a") || head.startsWith("GIF89a")) return "image/gif";
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * A question about images we already downloaded, images first and the question after them.
 * With `schema`, the reply is parsed and returned as `value`.
 */
export async function askClaudeWithImages(
  prompt: string,
  images: ReadonlyArray<{ data: Buffer; mimeType: string }>,
  opts: ClaudeCallOptions & { schema?: unknown } = {}
): Promise<{ text: string; value?: unknown; model: string; usage: ClaudeUsage; costUsd: number } | null> {
  const mimes = images.map((image) => sniffImageMime(image.data));
  if (!images.length || mimes.some((mime) => !mime)) return null;
  const content: Anthropic.ContentBlockParam[] = [
    ...images.map((image, i) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: mimes[i] as ClaudeImageMime, data: image.data.toString("base64") },
    })),
    { type: "text" as const, text: prompt },
  ];
  const format = opts.schema ? { format: { type: "json_schema" as const, schema: toClaudeSchema(opts.schema) } } : {};
  const res = await callClaude(baseParams(content, opts, format), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!res || res.message?.stop_reason === "refusal" || res.message?.stop_reason === "max_tokens") return null;
  const text = textOf(res.message);
  if (!text) return null;
  const model = String(res.message?.model || anthropicModel());
  const usage = usageOf(res.message);
  const costUsd = estimateClaudeCostUsd(model, res.message?.usage);
  if (!opts.schema) return { text, model, usage, costUsd };
  const value = parseJsonText(text);
  return value === undefined ? null : { text, value, model, usage, costUsd };
}

// ── Web search, behind ANTHROPIC_GROUNDED=1 ─────────────────────────────────────────────────────
//
// Off unless the env says "1". On in production since 2026-11-22, by the maintainer's decision, for
// QUALITY, not money: measured that day on the four figures jobs, Claude answered every question
// with sources and read the BCU's new usury cap, while Gemini's grounded replies came back with no
// sources and the previous quarter's figure. It costs more credit — $10 per 1,000 searches plus the
// pages read as input tokens, about $0.04 a call against Gemini's free 1,500 searches a day — which
// is why it rides on the per-label monthly cap (1b): a key that reaches it sends the search back to
// Gemini, and the caps are set so no organisation spends past its included credit.

/** `"1"` and nothing else, so a typo never starts spending on searches. */
export function claudeGroundedEnabled(): boolean {
  return process.env.ANTHROPIC_GROUNDED === "1" && anthropicConfigured();
}

/** Haiku gets the basic tool; dynamic filtering (`_20260209`) needs Sonnet/Opus-class models. */
export function webSearchToolFor(model: string): Anthropic.WebSearchTool20250305 | Anthropic.WebSearchTool20260209 {
  return {
    type: /^claude-haiku/i.test(model) ? "web_search_20250305" : "web_search_20260209",
    name: "web_search",
    max_uses: 5,
    // No `country`: measured 2026-11-22, the API answers 400 "Country code UY is not supported".
    user_location: { type: "approximate", timezone: "America/Montevideo" },
  };
}

const hostname = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
};

/**
 * A grounded question, answered in the shape classes/gemini.ts's `askGrounded` returns, so every
 * caller and `groundedHeadlines` work unchanged:
 * - `sourceUris`/`resolvedByChunk`: the result URLs, direct — Claude does not wrap them in redirects.
 * - `chunks[].web.title`: the bare domain, the convention `groundedHeadlines` relies on.
 * - `supports`: each cited text block, pointing at the chunks it cites.
 * - `text`: only what was written after the last search. The narration before a tool call ("voy a
 *   buscar…") is not part of the answer, and a caller that JSON.parses the reply would choke on it.
 */
export async function askClaudeGrounded(prompt: string, opts: ClaudeCallOptions = {}): Promise<GroundedReply | null> {
  if (!claudeGroundedEnabled()) return null;
  const model = anthropicModel();
  const params = { ...baseParams(prompt, opts), tools: [webSearchToolFor(model)] };
  const res = await callClaude(params, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const stop = res?.message?.stop_reason;
  if (!res || stop === "refusal" || stop === "pause_turn") return null;

  const blocks: any[] = Array.isArray(res.message?.content) ? res.message.content : [];
  const urls: string[] = [];
  const indexOf = (url: string): number => {
    let i = urls.indexOf(url);
    if (i === -1) i = urls.push(url) - 1;
    return i;
  };
  let lastResult = -1;
  blocks.forEach((block, i) => {
    if (block?.type !== "web_search_tool_result") return;
    lastResult = i;
    for (const item of Array.isArray(block.content) ? block.content : []) {
      if (item?.type === "web_search_result" && typeof item.url === "string") indexOf(item.url);
    }
  });

  let text = "";
  const supports: GroundingSupport[] = [];
  for (const block of blocks.slice(lastResult + 1)) {
    if (block?.type !== "text" || typeof block.text !== "string") continue;
    const startIndex = text.length;
    text += block.text;
    const cited = (Array.isArray(block.citations) ? block.citations : [])
      .filter((c: any) => typeof c?.url === "string")
      .map((c: any) => indexOf(c.url));
    if (cited.length && block.text.trim()) {
      supports.push({
        segment: { text: block.text.trim(), startIndex, endIndex: startIndex + block.text.length },
        groundingChunkIndices: [...new Set<number>(cited)],
      });
    }
  }
  if (!text.trim()) return null;

  return {
    text: text.trim(),
    sourceUris: [...urls],
    chunks: urls.map((uri) => ({ web: { uri, title: hostname(uri) } })),
    supports,
    resolvedByChunk: [...urls],
  };
}

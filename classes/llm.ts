// One place that answers "who writes this?" for the scheduled jobs: Claude on prepaid API credit
// first (classes/anthropic.ts), Gemini (classes/gemini.ts) when Claude does not answer.
//
// The functions have Gemini's names and signatures on purpose: moving a caller here is changing an
// import, nothing else. What does NOT come here, by decision (docs/superpowers/specs/
// 2026-11-22-claude-api-credits-design.md):
//  - embeddings — Anthropic has none; classes/rag/embed.ts stays on Gemini.
//  - classifiers that pin their model because a change of model breaks their series
//    (charruadevs, store tone, the Reddit judge) — they keep importing classes/gemini.ts.
//  - web search, unless ANTHROPIC_GROUNDED=1 — see classes/anthropic.ts for why it is off.
//
// `opts.model` and `opts.temperature` that callers pass are Gemini's: they only travel to the Gemini
// leg. Claude's model is ANTHROPIC_MODEL.
//
// Gemini is reached through the namespace and only inside the function that needs it: test suites
// mock classes/gemini with just the functions their module uses, and vitest throws on any other
// export being read.

import {
  anthropicConfigured,
  anthropicModel,
  askClaudeGrounded,
  askClaudeJSON,
  askClaudePlain,
  askClaudeWithImages,
  claudeGroundedEnabled,
} from "./anthropic";
import * as gemini from "./gemini";
import type { GroundedReply } from "./gemini";

export { groundedHeadlines } from "./gemini";
export type { GroundedHeadline, GroundedReply } from "./gemini";

export type LlmProvider = "claude" | "gemini";

export interface LlmText {
  text: string;
  model: string;
  provider: LlmProvider;
}

/**
 * Gemini budgets are tuned for Gemini (some are 30 s). A Claude call cut short is billed for what it
 * already generated and then repeated on Gemini, so Claude gets at least this long.
 */
const CLAUDE_MIN_TIMEOUT_MS = 60_000;
const claudeTimeout = (timeoutMs?: number): number => Math.max(timeoutMs ?? 0, CLAUDE_MIN_TIMEOUT_MS);

function fellBack(what: string): void {
  console.warn(`[llm] Claude no contestó (${what}) — se usa Gemini`);
}

/** Can any provider answer a plain, JSON or image question? Replaces `geminiConfigured()` in migrated guards. */
export function llmConfigured(): boolean {
  return anthropicConfigured() || gemini.geminiConfigured();
}

/** Can a grounded question be answered? Gemini, unless Claude's search is switched on. */
export function groundedConfigured(): boolean {
  return claudeGroundedEnabled() || gemini.geminiConfigured();
}

/** The model a fresh call will try first — for metadata that names "the classifier". */
export function preferredLlmModel(): string {
  return anthropicConfigured() ? anthropicModel() : gemini.GEMINI_MODEL;
}

/** Claude, then Gemini. The Gemini leg's model name is NOT read here: askPlain never returns it. */
async function plain(prompt: string, timeoutMs?: number): Promise<{ text: string; claudeModel?: string } | null> {
  if (anthropicConfigured()) {
    const reply = await askClaudePlain(prompt, { timeoutMs: claudeTimeout(timeoutMs) });
    if (reply) return { text: reply.text, claudeModel: reply.model };
    fellBack("texto");
  }
  const text = await gemini.askPlain(prompt, timeoutMs);
  return text ? { text } : null;
}

export async function askPlainDetailed(prompt: string, timeoutMs?: number): Promise<LlmText | null> {
  const out = await plain(prompt, timeoutMs);
  if (!out) return null;
  return out.claudeModel
    ? { text: out.text, model: out.claudeModel, provider: "claude" }
    : { text: out.text, model: gemini.GEMINI_MODEL, provider: "gemini" };
}

/** Prose. Same contract as Gemini's `askPlain`: never throws, `null` when nobody answered. */
export async function askPlain(prompt: string, timeoutMs?: number): Promise<string | null> {
  return (await plain(prompt, timeoutMs))?.text ?? null;
}

export async function askWithImage(
  prompt: string,
  image: { data: Buffer; mimeType: string },
  timeoutMs?: number
): Promise<string | null> {
  if (anthropicConfigured()) {
    const reply = await askClaudeWithImages(prompt, [image], { timeoutMs: claudeTimeout(timeoutMs) });
    if (reply?.text) return reply.text;
    fellBack("imagen");
  }
  return gemini.askWithImage(prompt, image, timeoutMs);
}

export interface JsonOptions {
  system?: string;
  /** Gemini only. */
  model?: string;
  /** Gemini only — Claude Haiku 5.5 rejects sampling parameters. */
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export async function askJSON<T>(prompt: string, schema: unknown, opts: JsonOptions = {}): Promise<T | null> {
  if (anthropicConfigured()) {
    const reply = await askClaudeJSON<T>(prompt, schema, {
      system: opts.system,
      maxTokens: opts.maxOutputTokens,
      timeoutMs: claudeTimeout(opts.timeoutMs),
    });
    if (reply) return reply.value;
    fellBack("JSON");
  }
  return gemini.askJSON<T>(prompt, schema, opts);
}

export async function askJSONWithImagesDetailed<T>(
  prompt: string,
  images: ReadonlyArray<{ data: Buffer; mimeType: string }>,
  schema: unknown,
  opts: JsonOptions = {}
): Promise<{ value: T; model: string; provider: LlmProvider } | null> {
  if (anthropicConfigured() && images.length) {
    const reply = await askClaudeWithImages(prompt, images, {
      system: opts.system,
      schema,
      maxTokens: opts.maxOutputTokens,
      timeoutMs: claudeTimeout(opts.timeoutMs),
    });
    if (reply && reply.value !== undefined) return { value: reply.value as T, model: reply.model, provider: "claude" };
    fellBack("JSON con imágenes");
  }
  const value = await gemini.askJSONWithImages<T>(prompt, images, schema, opts);
  return value === null ? null : { value, model: (opts.model || gemini.GEMINI_MODEL).trim(), provider: "gemini" };
}

export async function askJSONWithImages<T>(
  prompt: string,
  images: ReadonlyArray<{ data: Buffer; mimeType: string }>,
  schema: unknown,
  opts: JsonOptions = {}
): Promise<T | null> {
  return (await askJSONWithImagesDetailed<T>(prompt, images, schema, opts))?.value ?? null;
}

/** Grounded: Gemini, unless ANTHROPIC_GROUNDED=1 — then Claude with web search first. */
export async function askGrounded(prompt: string): Promise<GroundedReply | null> {
  if (claudeGroundedEnabled()) {
    const reply = await askClaudeGrounded(prompt);
    if (reply) return reply;
    fellBack("búsqueda");
  }
  return gemini.askGrounded(prompt);
}

// One place that answers "which model writes this?", so no feature has to know.
//
// Claude first, Gemini as the fallback. Not a hedge — the two have genuinely different failure
// modes and the fallback covers the one that matters: Claude here runs on a PERSON'S subscription
// with a 200-call day shared with their interactive use, so "no quota left" is a normal Tuesday,
// not an outage. A bot that went silent every time the maintainer had a busy afternoon would look
// broken. Gemini's quota is separate, so the degraded path is a real path.
//
// EMBEDDINGS ARE NOT HERE, and cannot be. Anthropic ships no embedding endpoint — Claude cannot
// turn text into a vector at all — so classes/rag/embed.ts stays on Gemini permanently. That is a
// capability gap, not a configuration choice, and no amount of provider switching closes it.

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { askClaude, askClaudeJson, claudeConfigured, claudeHasBudget, claudeSaturated } from "./claude";
import { askPlain, askWithImage, geminiConfigured } from "./gemini";

dotenv.config();

export type TextProvider = "claude" | "gemini";

/**
 * Which provider a fresh call prefers.
 *
 * `AI_TEXT_PROVIDER` pins it; otherwise Claude when it is configured. Pinning matters for
 * reproducing a bad answer: "the bot wrote something odd yesterday" is unanswerable if you cannot
 * tell which model wrote it.
 */
export function preferredProvider(): TextProvider {
  const pinned = (process.env.AI_TEXT_PROVIDER || "").trim().toLowerCase();
  if (pinned === "claude" || pinned === "gemini") return pinned;
  return claudeConfigured() ? "claude" : "gemini";
}

/** Resolved once per job so a run does not flip providers halfway through and produce two voices. */
let resolved: TextProvider | null = null;

/**
 * Decide the provider for this process, checking Claude's remaining daily allowance if it is the
 * preference. Cheap (one /health call) and worth it: knowing up front avoids starting a run that
 * will fall back on its third call.
 */
export async function resolveProvider(): Promise<TextProvider> {
  if (resolved) return resolved;
  const preferred = preferredProvider();
  if (preferred === "claude" && !(await claudeHasBudget())) {
    console.warn("[ai] Claude sin cupo o inalcanzable — esta corrida usa Gemini");
    resolved = geminiConfigured() ? "gemini" : "claude";
    return resolved;
  }
  resolved = preferred;
  return resolved;
}

/** Test seam, and for a job that legitimately wants to re-decide. */
export function __resetProviderForTests(): void {
  resolved = null;
}

export interface TextOptions {
  /** Extra voice/style rules appended to the system prompt. Claude only; Gemini folds it in-prompt. */
  systemHint?: string;
  timeoutMs?: number;
}

/**
 * Prose, from whichever provider is active. `null` when both are unavailable.
 *
 * The Gemini leg uses `askPlain`, never `askGrounded`: everything routed through here is written
 * from context the caller already retrieved, and letting the model search would let facts from
 * anywhere leak into text presented as the site's own.
 */
export async function askText(prompt: string, opts: TextOptions = {}): Promise<string | null> {
  const provider = await resolveProvider();

  if (provider === "claude" && !claudeSaturated()) {
    const text = await askClaude(prompt, {
      allowedTools: [],
      appendSystemPrompt: opts.systemHint,
      timeoutMs: opts.timeoutMs,
    });
    if (text) return text;
    // One fall-through, not a retry loop: if Claude produced nothing, asking it again costs quota
    // to get the same nothing.
    if (!geminiConfigured()) return null;
    console.warn("[ai] Claude no devolvió nada — se prueba con Gemini");
  }

  const hinted = opts.systemHint ? `${opts.systemHint}\n\n${prompt}` : prompt;
  return askPlain(hinted, opts.timeoutMs);
}

/**
 * Where the Claude agent is allowed to read files from. Its sandbox root, on the deploy box.
 *
 * The two processes share the machine — the backend crons and `claude-agent-api` both run as root
 * on 104 — so handing the agent an image is a file write plus a `cwd`, not an upload. Anywhere else
 * (a laptop, CI) the directory will not exist, and the vision path silently degrades to text-only
 * rather than pretending.
 */
const CLAUDE_WORKSPACES = process.env.CLAUDE_AGENT_WORKSPACES || "/root/claude-agent-api/workspaces";
/** Workspace name inside that root. Reused, and swept of old files on every write. */
const IMAGE_WORKSPACE = "redditbot";
/** An image older than this is from a previous run and nobody will ask about it again. */
const IMAGE_TTL_MS = 60 * 60 * 1000;

export interface ImageInput {
  data: Buffer;
  mimeType: string;
  /** Extension including the dot. */
  ext: string;
}

/** Drop yesterday's screenshots so the sandbox does not grow without bound. */
function sweep(dir: string): void {
  try {
    const cutoff = Date.now() - IMAGE_TTL_MS;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
    }
  } catch {
    /* housekeeping must never break a run */
  }
}

/**
 * Prose about a prompt AND an image.
 *
 * Two very different mechanics behind one signature. Claude's endpoint has no image field: what it
 * has is a `Read` tool and a confined workspace, so the picture is written to disk and the agent is
 * told to open it. Gemini takes the bytes inline. Either way the caller just passes a Buffer.
 *
 * Falls back to the text-only path when the image cannot be delivered — a bot that answers without
 * having seen the screenshot is worse than one that saw it, but far better than one that says
 * nothing all day because a directory was missing.
 */
export async function askTextWithImage(
  prompt: string,
  image: ImageInput,
  opts: TextOptions = {}
): Promise<string | null> {
  const provider = await resolveProvider();

  if (provider === "claude" && !claudeSaturated()) {
    const dir = path.join(CLAUDE_WORKSPACES, IMAGE_WORKSPACE);
    let fileName: string | null = null;
    try {
      fs.mkdirSync(dir, { recursive: true });
      sweep(dir);
      // Name it by content, not by post: two runs over the same thread reuse one file, and nothing
      // in the name leaks who asked.
      fileName = `adjunto-${Date.now().toString(36)}${image.ext}`;
      fs.writeFileSync(path.join(dir, fileName), image.data);
    } catch (e: any) {
      console.warn(`[ai] no pude dejar la imagen en el workspace de Claude (${e?.message || e}) — sigo sin ella`);
      fileName = null;
    }

    if (fileName) {
      const text = await askClaude(
        `Primero abrí la imagen ${fileName} que está en este directorio y miralá con atención: es lo que la persona adjuntó.\n\n${prompt}`,
        {
          allowedTools: ["Read"],
          cwd: IMAGE_WORKSPACE,
          appendSystemPrompt: opts.systemHint,
          timeoutMs: opts.timeoutMs,
        }
      );
      if (text) return text;
      console.warn("[ai] Claude no devolvió nada con la imagen — se prueba con Gemini");
    }
  }

  if (geminiConfigured()) {
    const hinted = opts.systemHint ? `${opts.systemHint}\n\n${prompt}` : prompt;
    const text = await askWithImage(hinted, { data: image.data, mimeType: image.mimeType }, opts.timeoutMs);
    if (text) return text;
  }

  // Seeing the image was the point, but a good text-only answer still beats silence.
  return askText(prompt, opts);
}

/**
 * A validated object, from whichever provider is active.
 *
 * Claude enforces the schema server-side, so the object comes back guaranteed. Gemini has no such
 * facility here, so its leg asks for JSON in the prompt and parses loosely — the historical
 * behaviour, kept as the fallback rather than as the default.
 */
export async function askStructured<T>(
  prompt: string,
  jsonSchema: Record<string, unknown>,
  opts: TextOptions = {}
): Promise<T | null> {
  const provider = await resolveProvider();

  if (provider === "claude" && !claudeSaturated()) {
    const value = await askClaudeJson<T>(prompt, jsonSchema, {
      allowedTools: [],
      appendSystemPrompt: opts.systemHint,
      timeoutMs: opts.timeoutMs,
    });
    if (value) return value;
    if (!geminiConfigured()) return null;
    console.warn("[ai] Claude no devolvió el objeto — se prueba con Gemini");
  }

  const text = await askPlain(
    `${opts.systemHint ? `${opts.systemHint}\n\n` : ""}${prompt}\n\n` +
      `Respondé SOLO con un objeto JSON válido, sin markdown, que cumpla este esquema:\n` +
      `${JSON.stringify(jsonSchema)}`,
    opts.timeoutMs
  );
  if (!text) return null;

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

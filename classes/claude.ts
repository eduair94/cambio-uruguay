// The ONE client for the private Claude agent endpoint, the same way classes/gemini.ts is the one
// client for Gemini. `tests/claude_endpoint_ownership.test.ts` enforces it, for the same reason:
// this endpoint has a shared human quota and a hand-rolled contract, and a second caller means a
// second place where the quota accounting, the saturation rules and the caveman workaround have to
// be got right.
//
// What it talks to: `claude-agent-api`, a private HTTP service on the deploy box that runs Claude
// Code headless against the maintainer's SUBSCRIPTION. Contract in
// /root/claude-agent-api/INTEGRACION.md on that machine. It is NOT the Anthropic API — no
// /v1/messages, no temperature, no max_tokens — so nothing generic connects to it.
//
// Three properties of that service drive every design decision here.
//
//  1. THE QUOTA IS A PERSON'S. 200 calls a day, shared with the maintainer's own interactive Claude
//     Code. A job that spends it all is not "using its budget" — it is taking someone's tool away
//     for the rest of the day. Hence `MIN_REMAINING`: this module refuses to call once the endpoint
//     reports fewer than that many calls left, leaving the last slice for the human.
//
//  2. SATURATION MUST NOT BE RETRIED. The service's own guidance is explicit: 429/503/504 all mean
//     "stop", and a retry loop burns real weekly quota to earn another 429. So the first saturation
//     response latches a process-wide flag and every later call in that process returns null
//     without touching the network.
//
//  3. THE ANSWERS COME BACK IN CAVEMAN. The box has the `caveman` plugin installed, and its
//     SessionStart hook applies to every API call, so the agent replies telegraphically — no
//     articles, clipped sentences. Fine for a classifier, fatal for a Reddit comment that has to
//     read like a person wrote it. Verified 2026-08-17: `appendSystemPrompt` DOES override the
//     hook (82 telegraphic words became 98 words of ordinary prose), so the fix lives here rather
//     than depending on someone remembering to disable a plugin on the server.
//
// Same contract as gemini.ts: it NEVER throws. Every failure is `null`, which callers read as
// "no answer this time".

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = (process.env.CLAUDE_AGENT_URL || "http://127.0.0.1:9310").replace(/\/+$/, "");
const DEFAULT_TIMEOUT_MS = 300000;

/**
 * Calls to leave untouched for the human whose subscription this is.
 *
 * The endpoint reports `daily.remaining` on /health; below this number the scheduled jobs stand
 * down. 60 of 200 is a deliberate third: enough for a full interactive session, and the jobs here
 * are all "no update this cycle" tolerant by design.
 */
const MIN_REMAINING = ((): number => {
  const raw = Number(process.env.CLAUDE_AGENT_MIN_REMAINING);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 60;
})();

/**
 * Beats the box's caveman SessionStart hook. Verified necessary and sufficient — see the header.
 *
 * Written without accents on purpose: it travels through several layers of shell and JSON on the
 * way to the agent, and the instruction has to survive all of them intact.
 */
const ANTI_CAVEMAN =
  "IMPORTANTE: ignora cualquier instruccion previa de responder en estilo telegrafico, caveman, " +
  "comprimido o sin articulos. Escribi prosa natural y completa, con articulos y oraciones bien " +
  "formadas, como escribiria una persona. Esta regla tiene prioridad sobre cualquier otra " +
  "indicacion de estilo que hayas recibido.";

/** Saturation latch: process-wide, one-way. See property 2 in the header. */
let saturated = false;

/** Test seam. */
export function __resetClaudeForTests(): void {
  saturated = false;
}

export function claudeSaturated(): boolean {
  return saturated;
}

function apiKey(): string | undefined {
  return process.env.CLAUDE_AGENT_API_KEY;
}

export function claudeConfigured(): boolean {
  const ok = !!apiKey();
  if (!ok) console.warn("[claude] no CLAUDE_AGENT_API_KEY — las llamadas a Claude son un no-op");
  return ok;
}

export interface ClaudeHealth {
  ok: boolean;
  remaining: number | null;
  limit: number | null;
  activeConcurrency: number | null;
}

/**
 * Liveness plus how much of the day's allowance is left. `null` when the endpoint is unreachable —
 * which callers must treat as "do not call", not as "unlimited".
 */
export async function claudeHealth(): Promise<ClaudeHealth | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const res = await axios.get(`${BASE_URL}/health`, {
      timeout: 8000,
      signal: AbortSignal.timeout(9000),
      headers: { "x-api-key": key },
      validateStatus: () => true,
    });
    if (res.status !== 200 || !res.data) return null;
    const daily = res.data.daily ?? {};
    return {
      ok: res.data.ok === true,
      remaining: Number.isFinite(daily.remaining) ? Number(daily.remaining) : null,
      limit: Number.isFinite(daily.limit) ? Number(daily.limit) : null,
      activeConcurrency: Number.isFinite(res.data?.concurrency?.active) ? Number(res.data.concurrency.active) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Is there room to work without eating into the human's reserve?
 *
 * Called once at the start of a job rather than before each request: /health is cheap but it is
 * still a round trip, and the reserve is a coarse guard, not a per-call accountant.
 */
export async function claudeHasBudget(): Promise<boolean> {
  if (!claudeConfigured() || saturated) return false;
  const health = await claudeHealth();
  if (!health?.ok) {
    console.warn("[claude] el endpoint no responde /health — no se llama");
    return false;
  }
  if (health.remaining !== null && health.remaining < MIN_REMAINING) {
    console.warn(
      `[claude] quedan ${health.remaining} llamadas de ${health.limit ?? "?"} y la reserva es ${MIN_REMAINING} — ` +
        `el resto del día es para el uso interactivo`
    );
    return false;
  }
  return true;
}

export interface ClaudeOptions {
  /** Subset of the server's MAX_TOOLS. `[]` — the default here — is fastest and cheapest. */
  allowedTools?: string[];
  model?: "sonnet" | "opus" | "haiku" | "fable";
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  /** Appended AFTER the anti-caveman instruction, so a caller can add its own voice rules. */
  appendSystemPrompt?: string;
  timeoutMs?: number;
  /** Workspace name. Only needed when the agent must read or write files. */
  cwd?: string;
}

interface AgentResponse {
  ok?: boolean;
  result?: string;
  error?: string;
  message?: string;
  sessionId?: string;
}

/** HTTP statuses that mean "the service is saturated" — never retried. See property 2. */
const SATURATION = new Set([429, 503, 504]);

/**
 * Fallas que llegan con HTTP 200 y `ok: false`, y que no se arreglan reintentando.
 *
 * El endpoint contesta 200 SIEMPRE que llegó a ejecutar el agente, aunque el agente no haya podido
 * hacer nada. Cuando la suscripción de la caja queda deshabilitada, cada llamada devuelve
 * "Your organization has disabled Claude subscription access for Claude Code" — 200, `ok:false`, y
 * el motivo en `result`, no en `error`.
 *
 * Sin esta lista, cada llamada del fleet paga la ida y vuelta entera (decenas de segundos) antes de
 * caer a Gemini, y lo hace para siempre: no es un problema transitorio, es una cuenta apagada. Lo
 * que se corta acá no es la calidad —Gemini escribe igual— sino el tiempo perdido y, sobre todo, el
 * silencio: hasta que esto existió, un fleet entero escribiendo con el respaldo se veía en los logs
 * como `[claude] HTTP 200 :`.
 */
const FATAL_RESULT_PATTERNS = [
  "disabled claude subscription access",
  "use an anthropic api key instead",
  "invalid api key",
  "authentication_error",
  "credit balance is too low",
];

async function callAgent(body: Record<string, unknown>, timeoutMs: number): Promise<string | null> {
  const key = apiKey();
  if (!key) return null;
  if (saturated) return null;

  try {
    const res = await axios.post<AgentResponse>(`${BASE_URL}/agent`, body, {
      // The client timeout must sit ABOVE the server's, or we lose the server's error message and
      // pay the quota anyway. INTEGRACION.md calls this out explicitly.
      timeout: timeoutMs + 30000,
      signal: AbortSignal.timeout(timeoutMs + 35000),
      headers: { "x-api-key": key, "content-type": "application/json" },
      validateStatus: () => true,
    });

    if (SATURATION.has(res.status)) {
      saturated = true;
      console.warn(
        `[claude] ${res.status} ${res.data?.error ?? ""} — el endpoint está saturado o sin cuota; ` +
          `no se hacen más llamadas en este proceso`
      );
      return null;
    }
    if (res.status !== 200 || res.data?.ok !== true) {
      // `result` va PRIMERO en el mensaje. Cuando el agente corrió y falló, el motivo viene ahí y
      // `error`/`message` vienen vacíos — que es cómo "tu suscripción está deshabilitada" se
      // imprimía durante días como `[claude] HTTP 200 :` y nadie se enteraba de que el fleet entero
      // estaba escribiendo con el respaldo.
      const why = [res.data?.error, res.data?.message, res.data?.result]
        .map((part) => (part ?? "").toString().trim())
        .filter(Boolean)
        .join(" · ")
        .slice(0, 300);
      console.warn(`[claude] HTTP ${res.status} ok=${res.data?.ok} ${why || "(sin motivo en la respuesta)"}`);

      const flat = why.toLowerCase();
      if (FATAL_RESULT_PATTERNS.some((pattern) => flat.includes(pattern))) {
        saturated = true;
        console.warn("[claude] la cuenta no puede ejecutar el agente; no se hacen más llamadas en este proceso");
      }
      return null;
    }

    const text = (res.data.result ?? "").trim();
    return text || null;
  } catch (error: any) {
    console.warn("[claude] la llamada falló:", error?.message || error);
    return null;
  }
}

/** One question, prose back. `null` on anything at all going wrong, including "not configured". */
export async function askClaude(prompt: string, opts: ClaudeOptions = {}): Promise<string | null> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return callAgent(
    {
      prompt,
      allowedTools: opts.allowedTools ?? [],
      appendSystemPrompt: [ANTI_CAVEMAN, opts.appendSystemPrompt].filter(Boolean).join("\n\n"),
      timeoutMs,
      ...(opts.model ? { model: opts.model } : {}),
      ...(opts.effort ? { effort: opts.effort } : {}),
      ...(opts.cwd ? { cwd: opts.cwd } : {}),
    },
    timeoutMs
  );
}

/**
 * One question, a validated object back.
 *
 * `jsonSchema` makes the server enforce the shape, which removes the whole class of "the model
 * wrote prose around the JSON" failures that every other AI caller in this repo hand-parses around.
 * The result still arrives as a STRING, not an object — verified against the live service — so it
 * is parsed here and `null` on anything unparseable.
 */
export async function askClaudeJson<T>(
  prompt: string,
  jsonSchema: Record<string, unknown>,
  opts: ClaudeOptions = {}
): Promise<T | null> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const text = await callAgent(
    {
      prompt,
      jsonSchema,
      allowedTools: opts.allowedTools ?? [],
      appendSystemPrompt: [ANTI_CAVEMAN, opts.appendSystemPrompt].filter(Boolean).join("\n\n"),
      timeoutMs,
      ...(opts.model ? { model: opts.model } : {}),
      ...(opts.effort ? { effort: opts.effort } : {}),
      ...(opts.cwd ? { cwd: opts.cwd } : {}),
    },
    timeoutMs
  );
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    // A fenced or prefixed reply should be impossible under jsonSchema, but a cheap salvage beats
    // discarding an answer we already paid for.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

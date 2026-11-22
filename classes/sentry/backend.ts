import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import { scrubText, scrubValue } from "./scrub";

/**
 * Pure pieces of the backend's Sentry setup (API in `sentry.ts`, pm2 jobs in `sentry_job.ts`),
 * kept apart so the tests can exercise them without an SDK client.
 *
 * Budget (Team plan since 2026-11-22): 50k errors, 5 GB logs and 1 cron monitor per month,
 * SHARED by the 8 projects of the organization. Every default below is sized so that a job
 * stuck in a loop cannot spend the month's quota by itself.
 */

/** Cron monitors that exist in Sentry (project cambio-uruguay-backend) and may receive check-ins. */
export const DEFAULT_CRON_MONITORS = ["currency-sync"] as const;

export interface DsnParts {
  publicId: string;
  host: string;
  protocol: string;
  projectId: string;
}

export function parseDsn(dsn: unknown): DsnParts | null {
  if (typeof dsn !== "string" || !dsn) return null;
  const match = dsn.match(/^(https?):\/\/([\w]+)@([\w.-]+(?::\d+)?)\/(\d+)\/?$/);
  if (!match) return null;
  return { protocol: match[1], publicId: match[2], host: match[3], projectId: match[4] };
}

export function envelopeUrl(dsn: DsnParts): string {
  return `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.publicId}&sentry_version=7&sentry_client=cambio-uruguay-job%2F1.0`;
}

/** `cambio-uruguay-backend@<sha>`: the commit the VPS built `dist/` from. */
export function backendRelease(env: NodeJS.ProcessEnv, readSha: () => string = gitHead): string | undefined {
  const explicit = env.SENTRY_RELEASE || "";
  if (/^[\w.@+-]{1,160}$/.test(explicit)) return explicit;
  const sha = (env.GITHUB_SHA || readSha() || "").trim();
  return /^[\da-f]{7,40}$/i.test(sha) ? `cambio-uruguay-backend@${sha.toLowerCase()}` : undefined;
}

function gitHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: __dirname,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
      windowsHide: true,
    });
  } catch {
    return "";
  }
}

/** True when pm2 started this process (fork or cluster, directly or through a bash wrapper). */
export function underPm2(env: NodeJS.ProcessEnv): boolean {
  return env.pm_id !== undefined && env.pm_id !== "";
}

export function backendEnvironment(env: NodeJS.ProcessEnv): string {
  const explicit = env.SENTRY_ENVIRONMENT || "";
  if (/^(?:production|staging|development|test)$/.test(explicit)) return explicit;
  return underPm2(env) ? "production" : "development";
}

/** The pm2 app name (`currency-chairs-hourly`), else the entrypoint's file name. */
export function jobName(env: NodeJS.ProcessEnv, argv: string[]): string {
  const pm2Name = underPm2(env) ? env.name || "" : "";
  if (/^[\w.-]{1,80}$/.test(pm2Name)) return pm2Name;
  const script = (argv[1] || "").split(/[\\/]/).pop() || "";
  const base = script.replace(/\.(?:[cm]?js|ts)$/, "");
  return /^[\w.-]{1,80}$/.test(base) ? base : "unknown-job";
}

/** Monitor slugs allowed to check in: the defaults, plus/minus `SENTRY_CRON_MONITORS`. */
export function cronMonitorSlugs(env: NodeJS.ProcessEnv): Set<string> {
  const raw = env.SENTRY_CRON_MONITORS;
  if (raw === undefined) return new Set(DEFAULT_CRON_MONITORS);
  if (/^(?:0|false|off|none)$/i.test(raw.trim())) return new Set();
  const slugs = new Set<string>(DEFAULT_CRON_MONITORS);
  for (const token of raw.split(/[\s,]+/)) {
    if (!token) continue;
    if (token.startsWith("-")) slugs.delete(token.slice(1));
    else if (/^[\w-]{1,64}$/.test(token)) slugs.add(token);
  }
  return slugs;
}

/**
 * What an unhandled rejection does in a job. `strict` (capture, flush, exit 1) is what Node itself
 * does and what every job ran with before it had Sentry. The two jobs that ALREADY initialized
 * Sentry ran with the SDK default `warn` (capture, keep running) for years, so a floating promise
 * in one of currency-sync's 45 scrapers never killed the run; switching them would turn one bad
 * scraper into a cycle with no rates at all.
 */
const WARN_ON_UNHANDLED_REJECTION = new Set(["currency-sync", "currency-sheet", "sync", "sync_sheet"]);

export function unhandledRejectionMode(job: string): "strict" | "warn" {
  return WARN_ON_UNHANDLED_REJECTION.has(job) ? "warn" : "strict";
}

export function checkInStatus(exitCode: number): "ok" | "error" {
  return exitCode === 0 ? "ok" : "error";
}

/**
 * Drops logs over a per-minute and a per-process budget, and scrubs what it keeps. Long-lived
 * processes (the API) pass `perProcess: Infinity` and rely on the per-minute budget.
 */
export function createLogGuard(
  options: { perMinute: number; perProcess: number },
  now: () => number = Date.now,
) {
  let windowStart = 0;
  let inWindow = 0;
  let total = 0;
  return <T extends { message: unknown; attributes?: Record<string, unknown> }>(log: T): T | null => {
    const at = now();
    if (at - windowStart >= 60_000) {
      windowStart = at;
      inWindow = 0;
    }
    if (inWindow >= options.perMinute || total >= options.perProcess) return null;
    inWindow += 1;
    total += 1;
    const attributes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(log.attributes || {})) {
      attributes[key] =
        typeof value === "string"
          ? scrubText(value, 500)
          : value !== null && typeof value === "object"
            ? scrubText(JSON.stringify(scrubValue(value)), 500)
            : value;
    }
    return { ...log, message: scrubText(String(log.message ?? ""), 2000), attributes };
  };
}

/** One remembered console line for the exit report. */
export interface ConsoleLine {
  at: number;
  level: "log" | "info" | "warn" | "error";
  text: string;
}

export function sentryLevel(level: ConsoleLine["level"]): "info" | "warning" | "error" {
  return level === "error" ? "error" : level === "warn" ? "warning" : "info";
}

export interface JobExitContext {
  job: string;
  exitCode: number;
  startedAt: number;
  endedAt: number;
  release?: string;
  environment: string;
  args: string[];
  lines: ConsoleLine[];
}

/**
 * The issue a failed run opens: one per job and exit code (fingerprint), titled with both, with
 * the last console lines of the run as breadcrumbs. Jobs catch their own errors and exit 1, so
 * without this a failing job never reached Sentry at all — the SDK only sees UNHANDLED errors.
 */
export function jobExitEvent(context: JobExitContext): Record<string, unknown> {
  const lastProblem = [...context.lines].reverse().find((line) => line.level === "error" || line.level === "warn");
  return {
    event_id: randomUUID().replace(/-/g, ""),
    timestamp: context.endedAt / 1000,
    platform: "node",
    level: "error",
    logger: "job-exit",
    message: `${context.job} exited with code ${context.exitCode}`,
    fingerprint: ["job-exit", context.job, String(context.exitCode)],
    release: context.release,
    environment: context.environment,
    tags: { job: context.job, exit_code: String(context.exitCode), runtime: "job" },
    extra: {
      duration_seconds: Math.round((context.endedAt - context.startedAt) / 100) / 10,
      args: context.args.map((arg) => scrubText(arg, 120)).slice(0, 10),
      last_problem: lastProblem ? scrubText(lastProblem.text, 1000) : null,
    },
    breadcrumbs: {
      values: context.lines.map((line) => ({
        timestamp: line.at / 1000,
        category: "console",
        level: sentryLevel(line.level),
        message: scrubText(line.text, 500),
      })),
    },
  };
}

export function checkInPayload(input: {
  checkInId: string;
  slug: string;
  status: "in_progress" | "ok" | "error";
  durationSeconds?: number;
  release?: string;
  environment: string;
}): Record<string, unknown> {
  return {
    check_in_id: input.checkInId,
    monitor_slug: input.slug,
    status: input.status,
    ...(input.durationSeconds !== undefined ? { duration: input.durationSeconds } : {}),
    ...(input.release ? { release: input.release } : {}),
    environment: input.environment,
  };
}

/** A Sentry envelope (newline-delimited JSON) carrying events and/or check-ins. */
export function buildEnvelope(
  dsn: DsnParts,
  items: Array<{ type: "event" | "check_in"; payload: Record<string, unknown> }>,
  sentAt: Date = new Date(),
): string {
  const header = { sent_at: sentAt.toISOString(), dsn: `${dsn.protocol}://${dsn.publicId}@${dsn.host}/${dsn.projectId}` };
  const lines = [JSON.stringify(header)];
  for (const item of items) {
    const body = JSON.stringify(item.payload);
    lines.push(JSON.stringify({ type: item.type, length: Buffer.byteLength(body) }), body);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * At most one exit report per job per window, across processes: an every-5-minutes job failing all day would
 * otherwise send 288 events (the whole org shares 50k a month). The issue still shows the run is
 * failing; the count is what is throttled.
 */
export function exitReportAllowed(lastSentAt: number | null, now: number, windowMs = 30 * 60_000): boolean {
  return lastSentAt === null || !Number.isFinite(lastSentAt) || now - lastSentAt >= windowMs || lastSentAt > now;
}

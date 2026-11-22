/**
 * Sentry for every pm2 job. Import it FIRST in each job entrypoint (`import "./sentry_job";`):
 * `tests/sentry/job_entrypoints.test.ts` fails when an entrypoint in ecosystem.config.js does not.
 *
 * What a job gets, and why each piece exists:
 *
 * 1. The SDK (classes/sentry/init.ts): an UNHANDLED crash or rejection becomes an issue tagged
 *    `job:<pm2 name>`, warn/error console lines go to Sentry Logs. Until 2026-11-22 only
 *    currency-sync and currency-sheet initialized Sentry; the other ~80 jobs reported nothing.
 * 2. An exit report: the jobs catch their own errors and `process.exit(1)` — a HANDLED error the
 *    SDK never sees. A run that ends with a non-zero code opens/updates the issue
 *    "<job> exited with code N" (one per job and code), with the run's last console lines as
 *    breadcrumbs. At most one per job every 30 min (state in the OS temp dir).
 * 3. Cron check-ins, only for slugs in classes/sentry/backend.ts DEFAULT_CRON_MONITORS (plus
 *    `SENTRY_CRON_MONITORS`): the monitor must already exist in Sentry — no check-in carries a
 *    monitor config, so nothing here can create (and bill) a monitor. `in_progress` when the job
 *    starts, `ok`/`error` from the exit code when it ends; a run pm2 kills (SIGKILL at the next
 *    cron tick) sends nothing, and Sentry marks it as a timeout.
 *
 * Only under pm2 (`pm_id` in the environment) or with `SENTRY_ENABLED=1`: a job run by hand
 * reads the production `.env`, and its failures are not production's.
 *
 * (2) and (3) leave from `process.on("exit")`, which runs synchronously for both `process.exit()`
 * and a natural end; the SDK's async transport cannot send from there, so they go through a short
 * child process (classes/sentry/deliverSync.ts). A signal (SIGINT/SIGTERM/SIGKILL) skips "exit".
 */
import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { format } from "util";
import * as Sentry from "@sentry/node";
import {
  backendEnvironment,
  backendRelease,
  buildEnvelope,
  checkInPayload,
  checkInStatus,
  type ConsoleLine,
  cronMonitorSlugs,
  envelopeUrl,
  exitReportAllowed,
  jobExitEvent,
  jobName,
  parseDsn,
  underPm2,
  unhandledRejectionMode,
} from "./classes/sentry/backend";
import { deliverEnvelopeSync } from "./classes/sentry/deliverSync";
import { initBackendSentry, sentExceptionEvent } from "./classes/sentry/init";

const MAX_LINES = 40;

function setupJobSentry(): void {
  const env = process.env;
  const forced = /^(?:1|true|on)$/i.test(env.SENTRY_ENABLED || "");
  if (!underPm2(env) && !forced) return;
  if (/^(?:0|false|off)$/i.test(env.SENTRY_ENABLED || "")) return;
  const dsn = parseDsn(env.sentry_dsn || env.SENTRY_DSN);
  if (!dsn) return;

  const job = jobName(env, process.argv);
  const startedAt = Date.now();
  const release = backendRelease(env);
  const environment = backendEnvironment(env);
  initBackendSentry({ runtime: "job", root: __dirname, job, unhandledRejections: unhandledRejectionMode(job) });

  // The run's last console lines, for the exit report. Formatted now (the objects may mutate),
  // scrubbed only if a report is actually sent.
  const lines: ConsoleLine[] = [];
  for (const level of ["log", "info", "warn", "error"] as const) {
    const original = console[level];
    console[level] = (...args: unknown[]) => {
      try {
        lines.push({ at: Date.now(), level, text: format(...args).slice(0, 2000) });
        if (lines.length > MAX_LINES) lines.shift();
      } catch {
        // never let the recorder break a job's logging
      }
      return original.apply(console, args);
    };
  }

  const monitored = cronMonitorSlugs(env).has(job);
  const checkInId = monitored
    ? Sentry.captureCheckIn({ monitorSlug: job, status: "in_progress" })
    : undefined;

  const stateFile = path.join(os.tmpdir(), `cambio-uruguay-sentry-exit-${job}.json`);
  const readLastSent = (): number | null => {
    try {
      const value = Number(JSON.parse(fs.readFileSync(stateFile, "utf8")).sentAt);
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  };

  process.on("exit", (code) => {
    try {
      const exitCode = typeof code === "number" ? code : Number(process.exitCode) || 0;
      const endedAt = Date.now();
      const items: Array<{ type: "event" | "check_in"; payload: Record<string, unknown> }> = [];
      if (checkInId) {
        items.push({
          type: "check_in",
          payload: checkInPayload({
            checkInId,
            slug: job,
            status: checkInStatus(exitCode),
            durationSeconds: (endedAt - startedAt) / 1000,
            release,
            environment,
          }),
        });
      }
      // An error the SDK already reported (with its stack) needs no second issue.
      if (exitCode !== 0 && !sentExceptionEvent() && exitReportAllowed(readLastSent(), endedAt)) {
        items.push({
          type: "event",
          payload: jobExitEvent({
            job,
            exitCode,
            startedAt,
            endedAt,
            release,
            environment,
            args: process.argv.slice(2),
            lines,
          }),
        });
        try {
          fs.writeFileSync(stateFile, JSON.stringify({ sentAt: endedAt }));
        } catch {
          // throttle state is best effort
        }
      }
      if (items.length) deliverEnvelopeSync(envelopeUrl(dsn), buildEnvelope(dsn, items));
    } catch {
      // reporting must never change how a job exits
    }
  });
}

setupJobSentry();

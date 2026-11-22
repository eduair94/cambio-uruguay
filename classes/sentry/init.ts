import * as Sentry from "@sentry/node";
import { backendEnvironment, backendRelease, createLogGuard } from "./backend";
import { scrubText } from "./scrub";

/**
 * One Sentry setup for the whole backend: the API (`sentry.ts`, pm2 cluster ×2) and every pm2
 * job (`sentry_job.ts`). What the Team plan (2026-11-22) adds over the old setup, and why:
 *
 * - `release` + `environment` on every event: regressions ("resolved in release X, came back in
 *   Y"), release health (the default ProcessSession integration counts crash-free processes per
 *   release) and "resolve in next release" only work with a release. Until now the backend sent
 *   none, so every issue was release-less.
 * - Sentry Logs (5 GB/month for the org): `console.warn`/`console.error` lines, scrubbed and
 *   budgeted per minute and per process. pm2 logs rotate daily and used to be flushed hourly;
 *   Sentry keeps them searchable next to the issue they explain.
 * - Everything text-shaped is scrubbed (`scrub.ts`): exception values, messages, breadcrumbs,
 *   log lines. The jobs log proxy URLs with credentials and axios errors with API keys.
 *
 * Tracing stays OFF: the org's 5M spans/month are shared with seven other projects and mostly
 * spent by one of them. `SENTRY_TRACES_SAMPLE_RATE` (read by the SDK itself) turns it on if the
 * budget ever allows it.
 */

export interface BackendSentryOptions {
  runtime: "api" | "job";
  /** Directory that frames are rewritten relative to (the compiled `dist/`). */
  root: string;
  job?: string;
  /** Jobs only: what an unhandled rejection does (see `unhandledRejectionMode` in backend.ts). */
  unhandledRejections?: "strict" | "warn";
}

let exceptionSent = false;

/**
 * True once this process sent an exception event (a crash, an unhandled rejection or an explicit
 * `captureException`): the job's exit report would only repeat it without the stack.
 */
export function sentExceptionEvent(): boolean {
  return exceptionSent;
}

const LOGS_OFF = /^(?:0|false|off|no)$/i;

export function initBackendSentry(options: BackendSentryOptions): boolean {
  const dsn = process.env.sentry_dsn || process.env.SENTRY_DSN || "";
  if (!dsn || Sentry.getClient()) return false;
  const logsEnabled = !LOGS_OFF.test(process.env.SENTRY_LOGS || "");
  const guardLog = createLogGuard(
    options.runtime === "api" ? { perMinute: 60, perProcess: Infinity } : { perMinute: 60, perProcess: 300 },
  );
  Sentry.init({
    dsn,
    release: backendRelease(process.env),
    environment: backendEnvironment(process.env),
    integrations: [
      // Frames as app:///classes/foo.js, relative to dist/.
      Sentry.rewriteFramesIntegration({ root: options.root }),
      // pm2 cluster workers already listen for uncaughtException, and since v8 Sentry no longer
      // exits when another listener exists, so a crashed worker would keep serving. Exit, as v7 did.
      Sentry.onUncaughtExceptionIntegration({ exitEvenIfOtherHandlersAreRegistered: true }),
      // A job with an unhandled rejection must still die with code 1, as Node does without
      // Sentry: the SDK's default ('warn') installs a listener, and with a listener Node stops
      // crashing — the job would hang until pm2's next cron tick killed it.
      ...(options.runtime === "job"
        ? [Sentry.onUnhandledRejectionIntegration({ mode: options.unhandledRejections || "strict" })]
        : []),
      ...(logsEnabled ? [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })] : []),
    ],
    // v11 attaches the caller's IP, headers, cookies, request bodies and query strings by default;
    // v7 sent none. A query here can be a coordinate (/position_stack?query=<lat>,<lng>).
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    // The load-time module hooks only feed tracing and Express auto-capture, neither used here.
    enableRuntimeChannelInjection: false,
    maxBreadcrumbs: 50,
    initialScope: { tags: { runtime: options.runtime, ...(options.job ? { job: options.job } : {}) } },
    beforeSend(event) {
      if (event.exception?.values?.length) exceptionSent = true;
      for (const value of event.exception?.values || []) {
        if (typeof value.value === "string") value.value = scrubText(value.value, 1000);
      }
      if (typeof event.message === "string") event.message = scrubText(event.message, 1000);
      if (event.logentry?.message) event.logentry.message = scrubText(event.logentry.message, 1000);
      if (event.request?.url) event.request.url = scrubText(event.request.url.split("?")[0], 500);
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (typeof breadcrumb.message === "string") breadcrumb.message = scrubText(breadcrumb.message, 500);
      const data = breadcrumb.data as Record<string, unknown> | undefined;
      if (data) {
        // http/fetch breadcrumbs: keep method, status and the URL without its query.
        if (typeof data.url === "string") data.url = scrubText(data.url.split("?")[0], 300);
        delete data["http.query"];
        delete data["http.fragment"];
        // console breadcrumbs: `arguments` duplicates the message, unscrubbed.
        delete data.arguments;
      }
      return breadcrumb;
    },
    beforeSendLog: guardLog,
  });
  return true;
}

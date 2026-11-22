import { describe, expect, it } from "vitest";
import {
  backendEnvironment,
  backendRelease,
  buildEnvelope,
  checkInPayload,
  checkInStatus,
  createLogGuard,
  cronMonitorSlugs,
  envelopeUrl,
  exitReportAllowed,
  jobExitEvent,
  jobName,
  parseDsn,
  takeDailySlot,
  unhandledRejectionMode,
} from "../../classes/sentry/backend";

// A made-up DSN: letters-only public id, so the secret scanner has nothing to look at.
const DSN = "https://examplepublicid@o1.ingest.us.sentry.io/42";

describe("dsn and envelope", () => {
  it("parses a DSN and builds the envelope URL with query auth", () => {
    const dsn = parseDsn(DSN)!;
    expect(dsn).toEqual({
      protocol: "https",
      publicId: "examplepublicid",
      host: "o1.ingest.us.sentry.io",
      projectId: "42",
    });
    expect(envelopeUrl(dsn)).toBe(
      "https://o1.ingest.us.sentry.io/api/42/envelope/?sentry_key=examplepublicid&sentry_version=7&sentry_client=cambio-uruguay-job%2F1.0",
    );
    expect(parseDsn("")).toBeNull();
    expect(parseDsn("not a dsn")).toBeNull();
  });

  it("builds newline-delimited items with byte lengths", () => {
    const dsn = parseDsn(DSN)!;
    const envelope = buildEnvelope(
      dsn,
      [{ type: "check_in", payload: { check_in_id: "a", monitor_slug: "currency-sync", status: "ok" } }],
      new Date("2026-11-22T00:00:00Z"),
    );
    const [header, itemHeader, body, end] = envelope.split("\n");
    expect(JSON.parse(header)).toEqual({ sent_at: "2026-11-22T00:00:00.000Z", dsn: DSN });
    expect(JSON.parse(itemHeader)).toEqual({ type: "check_in", length: Buffer.byteLength(body) });
    expect(JSON.parse(body).status).toBe("ok");
    expect(end).toBe("");
  });
});

describe("release, environment and job identity", () => {
  it("names the release after the commit, honouring an explicit one", () => {
    expect(backendRelease({}, () => "3D44792D4ABC\n")).toBe("cambio-uruguay-backend@3d44792d4abc");
    expect(backendRelease({ SENTRY_RELEASE: "x@1.2.3" }, () => "abc1234")).toBe("x@1.2.3");
    expect(backendRelease({}, () => "")).toBeUndefined();
    expect(backendRelease({}, () => "not-a-sha")).toBeUndefined();
    // A stale GITHUB_SHA frozen into a pm2 app's environment must not win over the checkout.
    expect(backendRelease({ GITHUB_SHA: "bb1546b8cc5324d1" }, () => "345c9f6b8cac")).toBe(
      "cambio-uruguay-backend@345c9f6b8cac",
    );
  });

  it("is production only under pm2 unless told otherwise", () => {
    expect(backendEnvironment({ pm_id: "3" })).toBe("production");
    expect(backendEnvironment({})).toBe("development");
    expect(backendEnvironment({ SENTRY_ENVIRONMENT: "staging" })).toBe("staging");
  });

  it("uses the pm2 app name, else the entrypoint's file name", () => {
    expect(jobName({ pm_id: "1", name: "currency-chairs-hourly" }, ["node", "dist/sync_chairs.js"])).toBe(
      "currency-chairs-hourly",
    );
    // A `name` outside pm2 is some other tool's variable, not an app name.
    expect(jobName({ name: "whatever" }, ["node", "C:\\repo\\sync_chairs.ts"])).toBe("sync_chairs");
  });
});

describe("cron monitors", () => {
  it("checks in only for monitors that exist", () => {
    expect([...cronMonitorSlugs({})]).toEqual(["currency-sync"]);
    expect([...cronMonitorSlugs({ SENTRY_CRON_MONITORS: "currency-regional, -currency-sync" })]).toEqual([
      "currency-regional",
    ]);
    expect(cronMonitorSlugs({ SENTRY_CRON_MONITORS: "off" }).size).toBe(0);
    expect(checkInStatus(0)).toBe("ok");
    expect(checkInStatus(1)).toBe("error");
  });

  it("never sends a monitor config (a check-in can not create, and bill, a monitor)", () => {
    const payload = checkInPayload({
      checkInId: "id",
      slug: "currency-sync",
      status: "ok",
      durationSeconds: 12.5,
      release: "r",
      environment: "production",
    });
    expect(payload).toEqual({
      check_in_id: "id",
      monitor_slug: "currency-sync",
      status: "ok",
      duration: 12.5,
      release: "r",
      environment: "production",
    });
    expect(payload).not.toHaveProperty("monitor_config");
  });

  it("keeps the two jobs that always ran with 'warn' on it", () => {
    expect(unhandledRejectionMode("currency-sync")).toBe("warn");
    expect(unhandledRejectionMode("currency-sheet")).toBe("warn");
    expect(unhandledRejectionMode("currency-rentals")).toBe("strict");
  });
});

describe("log guard", () => {
  it("drops over the per-minute and per-process budgets and scrubs what it keeps", () => {
    let now = 0;
    const guard = createLogGuard({ perMinute: 2, perProcess: 3, perDay: 100 }, () => now);
    expect(guard({ message: "token=abc", attributes: { url: "https://x/?key=1", n: 1 } })).toEqual({
      message: "token=[redacted]",
      attributes: { url: "https://x/?key=[redacted]", n: 1 },
    });
    expect(guard({ message: "b" })).not.toBeNull();
    expect(guard({ message: "c" })).toBeNull(); // third in the same minute
    now = 60_000;
    expect(guard({ message: "d" })).not.toBeNull();
    now = 120_000;
    expect(guard({ message: "e" })).toBeNull(); // per-process budget spent
    expect(guard.usedToday()).toEqual({ day: "1970-01-01", count: 3 });
  });

  it("keeps the SDK's own attributes and scrubs the caller's", () => {
    const guard = createLogGuard({ perMinute: 10, perProcess: 10, perDay: 10 });
    const sha = "3d44792d43c4ee3f66cacb16b0d3d0e7079dfd72";
    const kept = guard({
      message: "m",
      attributes: {
        "sentry.release": `cambio-uruguay-backend@${sha}`,
        "sentry.environment": "production",
        "sentry.message.parameter.0": "http://u:p@1.2.3.4:80",
      },
    })!;
    expect(kept.attributes).toEqual({
      "sentry.release": `cambio-uruguay-backend@${sha}`,
      "sentry.environment": "production",
      "sentry.message.parameter.0": "http://[redacted]@[ip]:80",
    });
  });

  it("continues the day's count across runs and resets at UTC midnight", () => {
    const midnight = Date.UTC(2026, 10, 22);
    let now = midnight - 1_000;
    const guard = createLogGuard({ perMinute: 100, perProcess: 100, perDay: 5, usedToday: 4 }, () => now);
    expect(guard({ message: "a" })).not.toBeNull();
    expect(guard({ message: "b" })).toBeNull(); // 5 of 5 for 2026-11-21
    now = midnight + 61_000;
    expect(guard({ message: "c" })).not.toBeNull();
    expect(guard.usedToday()).toEqual({ day: "2026-11-22", count: 1 });
  });
});

describe("job exit report", () => {
  it("is one issue per job and exit code, carrying the scrubbed last lines", () => {
    const event = jobExitEvent({
      job: "currency-rentals",
      exitCode: 1,
      startedAt: 1_000,
      endedAt: 61_000,
      release: "cambio-uruguay-backend@abc1234",
      environment: "production",
      args: ["--fast"],
      lines: [
        { at: 2_000, level: "log", text: "fetching http://u:p@1.2.3.4:80" },
        { at: 3_000, level: "error", text: "guard: thin run 30% < 40%, not writing" },
        { at: 4_000, level: "log", text: "bye" },
      ],
    });
    expect(event).toMatchObject({
      level: "error",
      message: "currency-rentals exited with code 1",
      fingerprint: ["job-exit", "currency-rentals", "1"],
      tags: { job: "currency-rentals", exit_code: "1", runtime: "job" },
      extra: { duration_seconds: 60, args: ["--fast"], last_problem: "guard: thin run 30% < 40%, not writing" },
    });
    const crumbs = (event.breadcrumbs as { values: Array<{ message: string; level: string }> }).values;
    expect(crumbs.map((crumb) => crumb.level)).toEqual(["info", "error", "info"]);
    expect(crumbs[0].message).toBe("fetching http://[redacted]@[ip]:80");
    expect(String(event.event_id)).toMatch(/^[\da-f]{32}$/);
  });

  it("is throttled to one per job and code every 6 hours", () => {
    const hour = 60 * 60_000;
    expect(exitReportAllowed(null, 1_000)).toBe(true);
    expect(exitReportAllowed(0, 6 * hour - 1)).toBe(false);
    expect(exitReportAllowed(0, 6 * hour)).toBe(true);
    expect(exitReportAllowed(10_000, 5_000)).toBe(true); // clock went back: do not stay silent
  });

  it("is capped for all jobs together at 200 a UTC day", () => {
    const now = Date.UTC(2026, 10, 22, 12);
    expect(takeDailySlot(null, now)).toEqual({ day: "2026-11-22", count: 1 });
    expect(takeDailySlot({ day: "2026-11-22", count: 199 }, now)).toEqual({ day: "2026-11-22", count: 200 });
    expect(takeDailySlot({ day: "2026-11-22", count: 200 }, now)).toBeNull();
    expect(takeDailySlot({ day: "2026-11-21", count: 200 }, now)).toEqual({ day: "2026-11-22", count: 1 });
    expect(takeDailySlot({ day: "2026-11-22", count: "garbage" }, now)).toEqual({ day: "2026-11-22", count: 1 });
  });
});

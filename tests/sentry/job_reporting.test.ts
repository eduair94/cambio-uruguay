import { type ChildProcess, spawn, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// End to end, with a real job process and a fake ingest server: what leaves when a pm2 job
// fails, crashes or succeeds. The exit report and the final check-in are sent from
// process.on("exit") through a child process, which no unit test can show.

const ROOT = path.resolve(__dirname, "../..");
const FIXTURE = path.join(__dirname, "fixtures", "failing_job.ts");
const INGEST = path.join(__dirname, "fixtures", "fake_ingest.js");

type Item = { type: string; payload: Record<string, any> };

let server: ChildProcess;
let port = 0;
let work = "";
let requestsFile = "";

beforeAll(async () => {
  work = fs.mkdtempSync(path.join(os.tmpdir(), "cu-sentry-job-"));
  requestsFile = path.join(work, "requests.jsonl");
  server = spawn(process.execPath, [INGEST, requestsFile], { stdio: ["ignore", "pipe", "ignore"] });
  port = await new Promise<number>((resolve, reject) => {
    server.stdout!.once("data", (chunk) => resolve(Number(String(chunk).trim())));
    server.once("error", reject);
  });
});

afterAll(() => {
  server?.kill();
  fs.rmSync(work, { recursive: true, force: true });
});

function runJob(mode: string, extraEnv: Record<string, string> = {}) {
  const job = `test-job-${mode}-${process.pid}-${Date.now()}`;
  fs.writeFileSync(requestsFile, "");
  const result = spawnSync(process.execPath, ["-r", require.resolve("ts-node/register/transpile-only"), FIXTURE, mode], {
    cwd: work, // no .env here: nothing but this test's DSN
    timeout: 60_000,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TS_NODE_PROJECT: path.join(ROOT, "tsconfig.json"),
      pm_id: "7",
      name: job,
      sentry_dsn: `http://examplepublicid@127.0.0.1:${port}/42`,
      SENTRY_CRON_MONITORS: job,
      ...extraEnv,
    },
  });
  const raw = fs.readFileSync(requestsFile, "utf8").trim();
  const items: Item[] = [];
  for (const line of raw ? raw.split("\n") : []) {
    const { body } = JSON.parse(line) as { body: string };
    const parts = body.split("\n").filter(Boolean);
    for (let index = 1; index + 1 < parts.length; index += 2) {
      items.push({ type: JSON.parse(parts[index]).type, payload: JSON.parse(parts[index + 1]) });
    }
  }
  return { job, status: result.status, items, raw };
}

describe("pm2 job reporting", () => {
  it("a job that exits 1 sends in_progress, error, and one scrubbed exit issue", () => {
    const { job, status, items, raw } = runJob("fail");
    expect(status).toBe(1);
    const checkIns = items.filter((item) => item.type === "check_in").map((item) => item.payload);
    expect(checkIns.map((checkIn) => checkIn.status)).toEqual(["in_progress", "error"]);
    expect(checkIns[0].check_in_id).toBe(checkIns[1].check_in_id);
    expect(checkIns.every((checkIn) => checkIn.monitor_slug === job && !checkIn.monitor_config)).toBe(true);
    expect(checkIns[1].duration).toBeGreaterThan(0);

    const events = items.filter((item) => item.type === "event").map((item) => item.payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      message: `${job} exited with code 1`,
      fingerprint: ["job-exit", job, "1"],
      tags: { job, exit_code: "1" },
      environment: "production",
    });
    const crumbs = events[0].breadcrumbs.values.map((crumb: { message: string }) => crumb.message);
    expect(crumbs).toContain("starting with proxy http://[redacted]@[ip]:3128");
    expect(crumbs).toContain("guard: thin run, not writing; contact [phone]");
    // Nothing that left carries the credential or the phone number.
    expect(raw).not.toContain("hunter");
    expect(raw).not.toContain("099 123 456");
  });

  it("a job that exits 0 sends ok and no issue", () => {
    const { status, items } = runJob("ok");
    expect(status).toBe(0);
    expect(items.filter((item) => item.type === "check_in").map((item) => item.payload.status)).toEqual([
      "in_progress",
      "ok",
    ]);
    expect(items.filter((item) => item.type === "event")).toHaveLength(0);
  });

  it("a crash is reported once, by the SDK, with the check-in failed", () => {
    const { status, items, raw } = runJob("crash");
    expect(status).toBe(1);
    const events = items.filter((item) => item.type === "event").map((item) => item.payload);
    expect(events).toHaveLength(1);
    expect(events[0].exception.values[0].value).toBe("boom with token=[redacted]");
    expect(events[0].tags).toMatchObject({ runtime: "job" });
    expect(items.filter((item) => item.type === "check_in").map((item) => item.payload.status)).toEqual([
      "in_progress",
      "error",
    ]);
    // The runtime data is scrubbed (the frames' source lines are this public repo's code, sent
    // by ContextLines as they are, which is why `raw` is not checked here).
    expect(JSON.stringify(events[0].breadcrumbs)).not.toContain("hunter");
    expect(raw).toContain("[redacted]");
  });

  it("sends nothing outside pm2", () => {
    const { status, items } = runJob("fail", { pm_id: "" });
    expect(status).toBe(1);
    expect(items).toHaveLength(0);
  });
}, 120_000);

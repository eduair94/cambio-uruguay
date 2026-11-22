import { spawnSync } from "child_process";

/**
 * Sends one envelope SYNCHRONOUSLY, for `process.on("exit")`, where no async work runs: the jobs
 * end with `process.exit(code)`, and the SDK's transport (async) never gets to send what was
 * queued in that tick. A short-lived child process does the HTTP request while this one waits,
 * so `process.exit` keeps its meaning — nothing after it runs — and the report still leaves.
 *
 * Bounded: 5 s at worst, output ignored, never throws.
 */
const CHILD = `
const chunks = [];
process.stdin.on("data", (c) => chunks.push(c)).on("end", async () => {
  try {
    const { url, body } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body,
      signal: AbortSignal.timeout(4000),
    });
  } catch {}
});
`;

export function deliverEnvelopeSync(url: string, body: string): boolean {
  try {
    const result = spawnSync(process.execPath, ["-e", CHILD], {
      input: JSON.stringify({ url, body }),
      timeout: 5000,
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide: true,
      // The child must not load the job's preloads (ts-node, --require) or its own Sentry.
      env: { ...process.env, NODE_OPTIONS: "" },
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

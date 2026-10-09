import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { acquireFacebookProfile } from "../../classes/facebook/lock";

let dir: string;

beforeEach(() => {
  dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fb-lock-")), "profile.lock");
});

afterEach(() => {
  fs.rmSync(path.dirname(dir), { recursive: true, force: true });
});

describe("acquireFacebookProfile", () => {
  it("gives the profile to one reader at a time", async () => {
    const first = await acquireFacebookProfile("alquileres", 0, { dir });
    expect(first).toBeTypeOf("function");
    // A second reader that will not wait is told the profile is busy.
    expect(await acquireFacebookProfile("autos", 0, { dir })).toBeNull();
    first!();
    const second = await acquireFacebookProfile("autos", 0, { dir });
    expect(second).toBeTypeOf("function");
    second!();
  });

  it("waits for the holder to finish instead of reading alongside it", async () => {
    const first = await acquireFacebookProfile("alquileres", 0, { dir });
    setTimeout(() => first!(), 50);
    const second = await acquireFacebookProfile("retail", 2_000, { dir, pollMs: 10 });
    expect(second).toBeTypeOf("function");
    second!();
  });

  it("reclaims a lock whose process died without releasing it", async () => {
    fs.mkdirSync(dir);
    // pm2 killed the job mid-read: its finally never ran. A pid that cannot exist is "dead".
    fs.writeFileSync(path.join(dir, "owner.json"), JSON.stringify({ pid: 2 ** 22 + 7, token: "x", owner: "autos", at: new Date().toISOString() }));
    const release = await acquireFacebookProfile("alquileres", 0, { dir });
    expect(release).toBeTypeOf("function");
    release!();
  });

  it("reclaims a lock held longer than any reader runs", async () => {
    fs.mkdirSync(dir);
    const at = new Date(Date.now() - 4 * 3_600_000).toISOString();
    fs.writeFileSync(path.join(dir, "owner.json"), JSON.stringify({ pid: process.pid, token: "x", owner: "autos", at }));
    const release = await acquireFacebookProfile("alquileres", 0, { dir, maxHoldMs: 3 * 3_600_000 });
    expect(release).toBeTypeOf("function");
    release!();
  });

  it("never releases a lock that another reader took over", async () => {
    const stale = await acquireFacebookProfile("autos", 0, { dir, maxHoldMs: 0 });
    // maxHoldMs 0: the next reader treats it as abandoned and takes it.
    const current = await acquireFacebookProfile("alquileres", 0, { dir, maxHoldMs: 0 });
    stale!();
    expect(fs.existsSync(dir)).toBe(true);
    current!();
    expect(fs.existsSync(dir)).toBe(false);
  });
});

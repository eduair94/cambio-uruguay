// One Marketplace reader at a time on the logged-in profile Chrome.
//
// Rentals, autos and the retail directories (chairs, equipar, movilidad) each scroll Marketplace
// from their own pm2 job. Facebook throttles the infinite scroll of a session that scrolls a lot
// (measured 2026-10-05: the same search went from 864 cards to its first 24), and two jobs
// scrolling the same session at once is the fastest way there. The :9657 bridge used to serialise
// the retail searches in its own queue; reading over CDP, every job takes this lock instead.
//
// The lock is a directory (mkdir is atomic) holding the owner's pid and a token. A holder that
// died without releasing — pm2 kills a job mid-read and its `finally` never runs — is detected by
// its pid; one that has held it longer than any reader runs is reclaimed too.
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

export type ReleaseFacebookProfile = () => void;

interface Owner {
  pid: number;
  token: string;
  owner: string;
  at: string;
}

const DEFAULT_DIR = (): string => process.env.FB_PROFILE_LOCK_DIR || path.join(os.tmpdir(), "cambio-facebook-profile.lock");
// The longest reader (the rentals full run) has a 60-minute budget.
const DEFAULT_MAX_HOLD_MS = 3 * 3_600_000;

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readOwner(dir: string): Owner | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "owner.json"), "utf8")) as Owner;
  } catch {
    return null;
  }
}

/** The abandoned holder's token ("" for an ownerless directory), or null when it is still live. */
function abandoned(dir: string, maxHoldMs: number): string | null {
  const owner = readOwner(dir);
  if (!owner) {
    // Between another reader's mkdir and its write: give it a moment before calling it dead.
    try {
      return Date.now() - fs.statSync(dir).mtimeMs > 30_000 ? "" : null;
    } catch {
      return null;
    }
  }
  return !alive(owner.pid) || Date.now() - Date.parse(owner.at) >= maxHoldMs ? owner.token : null;
}

/**
 * Takes the profile for `owner`, waiting up to `waitMs` for the current holder. Returns the release
 * function, or null when the profile stayed busy: the caller skips Facebook for this run (and must
 * not fall back to the bridge, which drives the same Chrome).
 */
export async function acquireFacebookProfile(
  owner: string,
  waitMs: number,
  options: { dir?: string; pollMs?: number; maxHoldMs?: number } = {},
): Promise<ReleaseFacebookProfile | null> {
  const dir = options.dir ?? DEFAULT_DIR();
  const maxHoldMs = options.maxHoldMs ?? DEFAULT_MAX_HOLD_MS;
  const deadline = Date.now() + waitMs;
  const token = crypto.randomBytes(8).toString("hex");
  for (;;) {
    try {
      fs.mkdirSync(dir);
      const mine: Owner = { pid: process.pid, token, owner, at: new Date().toISOString() };
      fs.writeFileSync(path.join(dir, "owner.json"), JSON.stringify(mine));
      return () => {
        // Only our own lock: after a takeover, the directory belongs to the next reader.
        if (readOwner(dir)?.token === token) fs.rmSync(dir, { recursive: true, force: true });
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const stale = abandoned(dir, maxHoldMs);
    if (stale !== null) {
      // Re-read right before removing: another reader may have reclaimed it a moment ago.
      if ((readOwner(dir)?.token ?? "") === stale) fs.rmSync(dir, { recursive: true, force: true });
      continue;
    }
    if (Date.now() >= deadline) return null;
    await new Promise(resolve => setTimeout(resolve, Math.min(options.pollMs ?? 5_000, Math.max(0, deadline - Date.now()))));
  }
}

// Where a generated page is proved before it becomes a deploy.
//
// This is the piece that replaces the human merge. Publishing to `main` triggers the deploy, so the
// question "is this page safe to ship?" has to be answered BEFORE the push, not by CI afterwards —
// by then it is already live. So: a checkout of its own, the files written into it, and the app's
// real lint and real test suite run against them. Green pushes; red does not, and says why.
//
// A SEPARATE CLONE, never the deploy checkout. `scripts/deploy-backend.sh` and `app/scripts/
// deploy.sh` both `git pull` in `/root/cambio-uruguay`; a job that leaves generated files sitting
// in that tree turns the next deploy into a merge conflict at a moment nobody is watching. This
// clone belongs to the generator and to nothing else.
//
// Everything here degrades to "not today". A missing clone, a failed install, a red test, a
// rejected push — all of them return a reason and publish nothing.

import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const run = promisify(execFile);

export const WORKSPACE_DIR = process.env.GENPAGE_WORKSPACE || "/root/cambio-uruguay-genpage";
const REMOTE = process.env.GENPAGE_REMOTE || "";
const BRANCH = "main";

const MINUTE = 60000;
const GIT_TIMEOUT = 5 * MINUTE;
/** The app suite plus lint. Generous: it runs once a day at most. */
const CHECK_TIMEOUT = 25 * MINUTE;
const INSTALL_TIMEOUT = 30 * MINUTE;

export interface StepResult {
  ok: boolean;
  detail: string;
}

async function git(args: string[], cwd = WORKSPACE_DIR, timeout = GIT_TIMEOUT): Promise<StepResult> {
  try {
    const { stdout } = await run("git", args, { cwd, timeout, maxBuffer: 16 * 1024 * 1024 });
    return { ok: true, detail: stdout.trim() };
  } catch (e: any) {
    return { ok: false, detail: `${e?.message ?? e}\n${e?.stderr ?? ""}`.slice(0, 2000) };
  }
}

export function workspaceReady(): boolean {
  return fs.existsSync(path.join(WORKSPACE_DIR, ".git"));
}

/**
 * Bring the clone to a pristine copy of `origin/main`.
 *
 * A hard reset rather than a pull: this tree holds nothing worth keeping between runs, and a
 * previous run that died halfway must not leave half a page behind to be committed with the next
 * one.
 */
export async function syncWorkspace(): Promise<StepResult> {
  if (!workspaceReady()) {
    if (!REMOTE) {
      return {
        ok: false,
        detail:
          `no existe ${WORKSPACE_DIR} y no hay GENPAGE_REMOTE para clonarlo. ` +
          `Creá el clon una vez: git clone <repo> ${WORKSPACE_DIR} && cd ${WORKSPACE_DIR}/app && npm install --force`,
      };
    }
    const cloned = await git(["clone", REMOTE, WORKSPACE_DIR], path.dirname(WORKSPACE_DIR), INSTALL_TIMEOUT);
    if (!cloned.ok) return cloned;
  }

  const fetched = await git(["fetch", "origin", BRANCH]);
  if (!fetched.ok) return fetched;
  const reset = await git(["reset", "--hard", `origin/${BRANCH}`]);
  if (!reset.ok) return reset;
  const clean = await git(["clean", "-fd", "--", "app/pages", "app/utils/generated"]);
  return clean.ok ? { ok: true, detail: "workspace al día con origin/main" } : clean;
}

/** Write the emitted files into the clone. */
export function writeFiles(files: ReadonlyArray<{ path: string; content: string }>): StepResult {
  try {
    for (const file of files) {
      const full = path.join(WORKSPACE_DIR, file.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, file.content, "utf8");
    }
    return { ok: true, detail: `${files.length} archivos escritos` };
  } catch (e: any) {
    return { ok: false, detail: e?.message ?? String(e) };
  }
}

async function npmRun(script: string, cwd: string, timeout: number): Promise<StepResult> {
  try {
    const { stdout, stderr } = await run("npm", ["run", script], {
      cwd,
      timeout,
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === "win32",
    });
    return { ok: true, detail: `${stdout}\n${stderr}`.slice(-1500) };
  } catch (e: any) {
    return { ok: false, detail: `${e?.stdout ?? ""}\n${e?.stderr ?? e?.message ?? e}`.slice(-3000) };
  }
}

/**
 * The gate. The app's own lint and test suite, against the generated files.
 *
 * `npm run typecheck` is deliberately NOT part of this: it is broken in this repo (vue-tsc crashes),
 * and a check that always fails is a check that gets skipped. Lint plus the suite is what CI would
 * have run on a pull request, which is exactly the bar being replaced.
 */
export async function verifyWorkspace(): Promise<StepResult> {
  const appDir = path.join(WORKSPACE_DIR, "app");
  if (!fs.existsSync(path.join(appDir, "node_modules"))) {
    return {
      ok: false,
      detail: `falta ${appDir}/node_modules — corré una vez: cd ${appDir} && npm install --force`,
    };
  }

  const lint = await npmRun("lint", appDir, CHECK_TIMEOUT);
  if (!lint.ok) return { ok: false, detail: `lint falló:\n${lint.detail}` };

  const tests = await npmRun("test", appDir, CHECK_TIMEOUT);
  if (!tests.ok) return { ok: false, detail: `los tests de la app fallaron:\n${tests.detail}` };

  return { ok: true, detail: "lint y tests en verde" };
}

export interface PublishResult extends StepResult {
  commit?: string;
}

/**
 * Commit the named files and push to `main`, which is what deploys.
 *
 * Only the files this run produced are staged. A `git add -A` would also sweep up anything a
 * concurrent process left in the tree, and the one thing worse than not publishing a page is
 * publishing someone else's half-finished work with it.
 */
export async function commitAndPush(
  files: ReadonlyArray<{ path: string }>,
  message: string
): Promise<PublishResult> {
  const added = await git(["add", "--", ...files.map((f) => f.path)]);
  if (!added.ok) return added;

  const status = await git(["diff", "--cached", "--name-only"]);
  if (!status.ok) return status;
  if (!status.detail) return { ok: false, detail: "no hay cambios para commitear" };

  const committed = await git([
    "-c",
    "user.name=cambio-uruguay bot",
    "-c",
    "user.email=bot@cambio-uruguay.com",
    "commit",
    "-m",
    message,
  ]);
  if (!committed.ok) return committed;

  const sha = await git(["rev-parse", "--short", "HEAD"]);

  // Rebase before pushing: another session may have landed something in the minutes this run spent
  // researching, and a rejected push would throw the whole page away.
  const rebased = await git(["pull", "--rebase", "origin", BRANCH]);
  if (!rebased.ok) return { ok: false, detail: `rebase falló:\n${rebased.detail}` };

  const pushed = await git(["push", "origin", BRANCH]);
  if (!pushed.ok) return { ok: false, detail: `push rechazado:\n${pushed.detail}` };

  return { ok: true, detail: pushed.detail, commit: sha.detail };
}

/** Current contents of a file in the clone, or `null`. */
export function readWorkspaceFile(relative: string): string | null {
  try {
    return fs.readFileSync(path.join(WORKSPACE_DIR, relative), "utf8");
  } catch {
    return null;
  }
}

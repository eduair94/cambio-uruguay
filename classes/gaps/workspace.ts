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
import crypto from "crypto";
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
const FORMAT_TIMEOUT = 5 * MINUTE;
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

/**
 * Prettier over exactly the files this run wrote, with the clone's own Prettier and config.
 *
 * Not cosmetic: it is what makes the gate reachable at all. `emit.ts` builds its output as text —
 * `JSON.stringify` for every string, so double quotes where the app's Prettier wants single, and
 * one field per line at a fixed indent, which a long source title pushes past 100 columns. Both are
 * `prettier/prettier` errors, so the file the bot emits could never pass `npm run lint` as written:
 * the check meant to protect the page was rejecting every page. Measured 2026-09-23 on a real
 * addendum: 6 errors before this step, 0 after, and `app/utils/generated/addenda.ts` had never
 * received a single entry.
 *
 * Only the named paths, never the tree — same rule as `commitAndPush`, for the same reason: a
 * concurrent process's half-finished file must not ride along.
 */
export async function formatFiles(files: ReadonlyArray<{ path: string }>): Promise<StepResult> {
  if (!files.length) return { ok: true, detail: "sin archivos que formatear" };

  const appDir = path.join(WORKSPACE_DIR, "app");
  const bin = path.join(appDir, "node_modules", "prettier", "bin", "prettier.cjs");
  if (!fs.existsSync(bin)) {
    return { ok: false, detail: `falta ${bin} — corré una vez: cd ${appDir} && npm install --force` };
  }

  try {
    await run(process.execPath, [bin, "--write", ...files.map((f) => f.path)], {
      cwd: WORKSPACE_DIR,
      timeout: FORMAT_TIMEOUT,
      maxBuffer: 8 * 1024 * 1024,
    });
    return { ok: true, detail: `${files.length} archivos formateados` };
  } catch (e: any) {
    return {
      ok: false,
      detail: `prettier falló:\n${`${e?.stdout ?? ""}\n${e?.stderr ?? e?.message ?? e}`.slice(-1500)}`,
    };
  }
}

/**
 * Per-test timeout for the gate's run of the app suite: 30 s instead of vitest's 5.
 *
 * The suite runs on the production box, next to the API, the frontend and the scrapers. Measured
 * 2026-10-11 on a clean `origin/main` with a load average of 27 on 32 cores: two runs, 3 and 4
 * failures, every one "Test timed out in 5000ms" in an exhaustive-matrix test, and not the same set
 * twice. With 30 s: 631 files green. A CPU-starved timeout says nothing about the page being
 * checked, and a gate that rejects for it rejects every page. CI keeps the 5 s default.
 */
export const GATE_TEST_ARGS = ["--testTimeout=30000"];

async function npmRun(script: string, cwd: string, timeout: number, args: string[] = []): Promise<StepResult> {
  try {
    const { stdout, stderr } = await run("npm", ["run", script, ...(args.length ? ["--", ...args] : [])], {
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

export type Installer = (appDir: string) => Promise<StepResult>;

/** `--force` and never `npm ci`: the same install the app gets everywhere else (see AGENTS.md). */
async function npmInstall(appDir: string): Promise<StepResult> {
  try {
    await run("npm", ["install", "--force", "--no-audit", "--no-fund"], {
      cwd: appDir,
      timeout: INSTALL_TIMEOUT,
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === "win32",
    });
    return { ok: true, detail: "npm install terminó" };
  } catch (e: any) {
    return { ok: false, detail: `${e?.stdout ?? ""}\n${e?.stderr ?? e?.message ?? e}`.slice(-3000) };
  }
}

/** Inside `node_modules` on purpose: wiping the install wipes the record of it. */
const LOCK_STAMP = ".genpage-lock.sha256";

/**
 * Install the app's dependencies whenever `origin/main` changed its lockfile.
 *
 * `syncWorkspace` resets the tracked tree, but `app/node_modules` is not tracked and nothing ever
 * reinstalled it. On 2026-09-30 the app moved to ESLint 10 and an `@nuxt/eslint-config` that exports
 * `createConfigForNuxt`; this clone kept the ESLint 9.28 installed by hand on 2026-08-18, so
 * `npm run lint` died loading its own config before reading a single file — and every addendum and
 * every generated page after that was "rejected". A gate running stale tools fails for reasons the
 * page has nothing to do with.
 *
 * The stamp is the hash of the lockfile as `main` has it, taken BEFORE installing: `npm install` may
 * rewrite `package-lock.json`, the next hard reset puts `main`'s back, and a stamp of the rewritten
 * one would reinstall on every run. A failed install writes no stamp, so the next run tries again.
 */
export async function ensureDependencies(install: Installer = npmInstall): Promise<StepResult> {
  const appDir = path.join(WORKSPACE_DIR, "app");
  let lock: Buffer;
  try {
    lock = fs.readFileSync(path.join(appDir, "package-lock.json"));
  } catch {
    return { ok: true, detail: "sin package-lock.json: no hay contra qué comparar" };
  }

  const want = crypto.createHash("sha256").update(lock).digest("hex");
  const stampPath = path.join(appDir, "node_modules", LOCK_STAMP);
  let have = "";
  try {
    have = fs.readFileSync(stampPath, "utf8").trim();
  } catch {}
  if (have === want) return { ok: true, detail: "dependencias al día con el lockfile" };

  const installed = await install(appDir);
  if (!installed.ok) return { ok: false, detail: `npm install falló:\n${installed.detail}` };

  try {
    fs.mkdirSync(path.dirname(stampPath), { recursive: true });
    fs.writeFileSync(stampPath, `${want}\n`, "utf8");
  } catch (e: any) {
    // Installed but unrecorded: harmless, the next run just installs once more.
    console.warn(`[genpage] no pude guardar ${stampPath}: ${e?.message ?? e}`);
  }
  return { ok: true, detail: "dependencias reinstaladas: el lockfile de main cambió" };
}

/**
 * The part of a failure worth putting in a Telegram message: its start AND its end.
 *
 * Lint reports its verdict at the bottom ("✖ 2 problems"), but a tool that crashes says why at the
 * top and then prints a stack trace. Keeping only the tail is what turned the 2026-10-11 rejection
 * into twenty lines of `config-loader.js` without the one line that named the cause.
 */
export function failureExcerpt(detail: string, max: number): string {
  if (detail.length <= max) return detail;
  const gap = "\n…\n";
  const head = Math.floor((max - gap.length) * 0.4);
  const tail = max - gap.length - head;
  return `${detail.slice(0, head)}${gap}${detail.slice(-tail)}`;
}

/**
 * The gate. The app's own lint and test suite, against the generated files.
 *
 * `npm run typecheck` is deliberately NOT part of this: it is broken in this repo (vue-tsc crashes),
 * and a check that always fails is a check that gets skipped. Lint plus the suite is what CI would
 * have run on a pull request, which is exactly the bar being replaced.
 */
export async function verifyWorkspace(
  files: ReadonlyArray<{ path: string }> = [],
  { install }: { install?: Installer } = {}
): Promise<StepResult> {
  const appDir = path.join(WORKSPACE_DIR, "app");

  // Before formatting too: the old Prettier formats to the old style just as confidently.
  const deps = await ensureDependencies(install);
  if (!deps.ok) return deps;

  if (!fs.existsSync(path.join(appDir, "node_modules"))) {
    return {
      ok: false,
      detail: `falta ${appDir}/node_modules — corré una vez: cd ${appDir} && npm install --force`,
    };
  }

  // Formatear ANTES de lintear, y acá adentro y no en cada llamador: el archivo emitido nunca
  // cumple el estilo tal cual sale, así que un llamador que se olvide del paso se rechaza a sí mismo.
  const formatted = await formatFiles(files);
  if (!formatted.ok) return formatted;

  const lint = await npmRun("lint", appDir, CHECK_TIMEOUT);
  if (!lint.ok) return { ok: false, detail: `lint falló:\n${lint.detail}` };

  const tests = await npmRun("test", appDir, CHECK_TIMEOUT, GATE_TEST_ARGS);
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
  // Everything up to and including the verification still runs — the point of the rehearsal is to
  // exercise the checks, and a flag that skipped them would prove nothing.
  if (process.env.GENPAGE_DRY_RUN === "1") {
    return { ok: false, detail: `GENPAGE_DRY_RUN=1: verificado y NO publicado (${files.length} archivos listos)` };
  }

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

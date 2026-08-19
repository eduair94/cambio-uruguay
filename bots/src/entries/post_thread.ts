// Post ONE hand-written thread to X, from a file.
//
// The other X jobs are catalogue-driven and run on a cron; this one is the manual escape hatch for
// a thread somebody wrote for a specific occasion (a page that just shipped, a finding worth
// telling). It is not scheduled and is not in ecosystem.config.js on purpose — it is run by hand.
//
// The file is plain text: tweets separated by a line containing only `---`. Empty parts are
// dropped, so trailing separators are harmless.
//
//   npm run post_thread -- path/to/thread.txt          # dry run, prints what it would post
//   THREAD_POST=1 npm run post_thread -- path/to/thread.txt
//
// SAFETY GATE, same reasoning as content_promo.ts: the credentials for the daily report are
// already on the box, so without an explicit flag this file would post to a real audience the
// moment it exists. `THREAD_POST=1` is that flag; anything else prints and exits.
//
// Every part is length-checked BEFORE the first one is posted. X has no transaction: a thread that
// fails on tweet 4 leaves 3 published, and there is no way to take that back cleanly.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config.js";
import { tweetLength, TWEET_LIMIT } from "../format/promos.js";
import { TwitterPublisher } from "../publish/twitter.js";

export function parseThread(raw: string): string[] {
  return raw
    .split(/^\s*---\s*$/m)
    .map(part => part.trim())
    .filter(Boolean);
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: post_thread <archivo.txt>  (tuits separados por una línea con ---)");
    process.exit(1);
  }

  const parts = parseThread(readFileSync(path, "utf8"));
  if (parts.length === 0) {
    console.error(`${path} no tiene ningún tuit.`);
    process.exit(1);
  }

  const tooLong = parts
    .map((text, i) => ({ i: i + 1, len: tweetLength(text) }))
    .filter(p => p.len > TWEET_LIMIT);
  if (tooLong.length > 0) {
    for (const p of tooLong) console.error(`tuit ${p.i}: ${p.len} caracteres > ${TWEET_LIMIT}`);
    console.error("no se postea nada: X no tiene transacción y un hilo cortado a la mitad queda cortado.");
    process.exit(1);
  }

  const cfg = loadConfig();
  const enabled = process.env.THREAD_POST === "1";
  const dryRun = cfg.dryRun || !enabled;

  if (!enabled) {
    console.log("THREAD_POST no está en 1 — modo prueba. Esto es lo que se postearía:\n");
  }

  const publisher = new TwitterPublisher(cfg.twitter, { dryRun });
  if (enabled && !publisher.isConfigured()) {
    console.error("faltan las credenciales de X (TWITTER_APP_KEY y compañía en bots/.env).");
    process.exit(1);
  }

  const ids = await publisher.thread(parts);
  if (ids.length > 0) {
    console.log(`hilo publicado: ${ids.length} tuits`);
    console.log(`primero: https://x.com/i/web/status/${ids[0]}`);
  } else if (!enabled) {
    console.log(`\n(${parts.length} tuits, ninguno supera ${TWEET_LIMIT} caracteres)`);
  }
}

// Only run when this file IS the entrypoint. Without the guard, importing `parseThread` from a
// test executes main(), which reads process.argv[2] (a vitest flag) and exits the worker.
const isEntrypoint = argv[1] ? fileURLToPath(import.meta.url) === argv[1] : false;
if (isEntrypoint) {
  void main().catch(err => {
    console.error("post_thread falló:", err);
    process.exit(1);
  });
}

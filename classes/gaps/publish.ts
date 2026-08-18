// Question nobody answered → page on the live site → the thread gets its link.
//
// The order below is the whole safety argument for doing this without a person, and every step can
// only ever say "not today":
//
//   1. IN SCOPE      the question falls inside a subject this site actually covers
//   2. AUTHOR        research with real web search, then write from the DOWNLOADED source text
//   3. VALIDATE      shape, length, prose — and every figure present in that downloaded text
//   4. EMIT          data file + wrapper page + nav entry + i18n keys
//   5. VERIFY        the app's own lint and test suite, in a clone, against those files
//   6. PUBLISH       push to main, which deploys
//   7. PARK          the threads that asked, to be answered once the page is live and indexed
//
// Step 5 is what replaces the human merge. Pushing to `main` IS the deploy, so "is this safe to
// ship?" has to be answered before the push; afterwards it is already public. Red tests publish
// nothing and the cluster is retried tomorrow.
//
// One page per run, at most. Not a throughput limit — a blast-radius one: if something about the
// generator is wrong, the evidence is one page and one revert, not a morning's worth.

import fs from "fs";
import path from "path";
import { notifyAdmin } from "../notify";
import { RedditContentGapModel } from "../models/RedditContentGap";
import { markWaitingForPage } from "../redditbot/ledger";
import { authorPage, classifyScope } from "./authorPage";
import { emitAll } from "./emit";
import { describeProblems, validatePageSpec } from "./pageSpec";
import { topicByKey } from "./topics";
import {
  commitAndPush,
  readWorkspaceFile,
  syncWorkspace,
  verifyWorkspace,
  workspaceReady,
  writeFiles,
  WORKSPACE_DIR,
} from "./workspace";
import type { GapCluster } from "./cluster";

const LOCALES = ["es", "en", "pt"] as const;

export type PublishOutcome =
  | { status: "published"; pagePath: string; commit: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

/** Routes the app already serves, so a generated slug never collides with a real page. */
function existingRoutes(): Set<string> {
  const dir = path.join(WORKSPACE_DIR, "app", "pages");
  try {
    return new Set(
      fs
        .readdirSync(dir)
        .filter((name) => name.endsWith(".vue"))
        .map((name) => `/${name.replace(/\.vue$/, "")}`)
    );
  } catch {
    return new Set();
  }
}

async function markOutOfScope(cluster: GapCluster, reason: string): Promise<void> {
  await RedditContentGapModel.updateMany(
    { postId: { $in: cluster.members.map((m) => m.postId) } },
    { $set: { outOfScope: true, outOfScopeReason: reason.slice(0, 300) } }
  );
}

/**
 * Take one cluster all the way, or explain why not.
 *
 * `today` is injected so the emitted files are reproducible and the tests are not clock-dependent.
 */
export async function publishPageForCluster(cluster: GapCluster, today: string): Promise<PublishOutcome> {
  if (!workspaceReady()) {
    const synced = await syncWorkspace();
    if (!synced.ok) return { status: "skipped", reason: synced.detail };
  }

  // 1. Is this ours to answer?
  const scope = await classifyScope(cluster);
  if (!scope.inScope) {
    await markOutOfScope(cluster, scope.reason);
    return { status: "skipped", reason: `fuera de alcance: ${scope.reason}` };
  }
  const topic = topicByKey(scope.topic);
  console.log(`[gaps] "${scope.question}" → temática ${scope.topic}`);

  // A stale clone would validate the slug against yesterday's routes.
  const synced = await syncWorkspace();
  if (!synced.ok) return { status: "failed", reason: `no pude poner al día el workspace: ${synced.detail}` };
  const routes = existingRoutes();

  // 2 + 3. Write it, check it, and give one corrected second chance. The retry names the exact
  // defects: "every number must be in a source" as a rule produces the same failure twice, while
  // "the figure 45 is in no source" gets fixed.
  let authored = await authorPage(cluster, scope);
  if (!authored) return { status: "failed", reason: "la investigación o la redacción no devolvieron nada" };

  let problems = validatePageSpec(authored.spec, routes);
  if (problems.length) {
    console.warn(`[gaps] primer intento rechazado — ${describeProblems(problems)}`);
    authored = await authorPage(cluster, scope, describeProblems(problems));
    if (!authored) return { status: "failed", reason: "el reintento no devolvió nada" };
    problems = validatePageSpec(authored.spec, routes);
  }
  if (problems.length) {
    return { status: "failed", reason: `la página no pasó la validación: ${describeProblems(problems)}` };
  }

  const spec = authored.spec;

  // 4. Files.
  const generatedPagesTs = readWorkspaceFile("app/utils/generatedPages.ts");
  if (!generatedPagesTs) return { status: "failed", reason: "no encontré app/utils/generatedPages.ts en el workspace" };

  const locales: Record<string, string> = {};
  for (const locale of LOCALES) {
    const content = readWorkspaceFile(`app/i18n/locales/json/${locale}.json`);
    if (!content) return { status: "failed", reason: `no encontré el catálogo ${locale}.json` };
    locales[locale] = content;
  }

  let files;
  try {
    files = emitAll({
      spec,
      topicLabel: topic?.label ?? "Guía",
      today,
      askedIn: cluster.members.map((m) => m.permalink).filter(Boolean),
      generatedPagesTs,
      locales,
    });
  } catch (e: any) {
    return { status: "failed", reason: `no pude generar los archivos: ${e?.message ?? e}` };
  }

  const written = writeFiles(files);
  if (!written.ok) return { status: "failed", reason: written.detail };

  // 5. The gate that replaces the merge.
  const verified = await verifyWorkspace();
  if (!verified.ok) {
    await notifyAdmin(
      `🚫 *Página generada rechazada* — "${spec.title}"\nNo pasó lint/tests, no se publicó nada.\n\n` +
        `\`\`\`\n${verified.detail.slice(-900)}\n\`\`\``
    );
    return { status: "failed", reason: `verificación en rojo: ${verified.detail.slice(-400)}` };
  }

  // 6. Publish.
  const subs = [...new Set(cluster.members.map((m) => m.sub))].map((s) => `r/${s}`).join(", ");
  const message =
    `feat(auto): ${spec.title}\n\n` +
    `Página generada automáticamente a partir de ${cluster.members.length} hilos de Reddit ` +
    `(${subs}) que preguntaban lo mismo y que el sitio no contestaba.\n\n` +
    `Pregunta de fondo: ${scope.question}\n\n` +
    `Cada cifra de la página aparece literal en el texto de una de estas fuentes, descargadas y ` +
    `verificadas antes de publicar:\n` +
    spec.sources
      .filter((s) => s.verified)
      .map((s) => `- ${s.url}`)
      .join("\n") +
    `\n\nLo que la investigación NO pudo confirmar quedó publicado como tal en la página, no ` +
    `redondeado a una afirmación.\n\nLint y tests de la app en verde antes del push.\n\n` +
    `Hilos:\n${cluster.members.map((m) => `- ${m.permalink}`).join("\n")}\n`;

  const pushed = await commitAndPush(files, message);
  if (!pushed.ok) return { status: "failed", reason: pushed.detail };

  // 7. Remember who asked.
  const pagePath = `/${spec.slug}`;
  const postIds = cluster.members.map((m) => m.postId);
  await RedditContentGapModel.updateMany(
    { postId: { $in: postIds } },
    { $set: { pagePath, publishedAt: new Date(), publishedCommit: pushed.commit ?? "" } }
  );
  const parked = await markWaitingForPage(postIds, pagePath);

  await notifyAdmin(
    `📄 *Página nueva publicada sola*\n${spec.title}\n` +
      `https://cambio-uruguay.com${pagePath}\n\n` +
      `${cluster.members.length} hilos la pidieron (${subs}); ${parked} quedan esperando respuesta.\n` +
      `Commit \`${pushed.commit}\`. Fuentes: ${spec.sources.filter((s) => s.verified).length}.`
  );

  return { status: "published", pagePath, commit: pushed.commit ?? "" };
}

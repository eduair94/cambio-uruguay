// The gap pipeline: read the unanswered questions, cluster them, and give the ones with real demand
// a page on the live site.
//
// Publishing is the goal, not the fallback. When it cannot happen — the subject is outside what the
// site covers, the sources would not verify, the app's tests went red — the run writes the
// researched draft to `docs/reddit-gaps/` instead, so the work is not lost and a person can finish
// what the automation would not risk.

import { notifyAdmin } from "../notify";
import { RedditContentGapModel, type RedditContentGapDoc } from "../models/RedditContentGap";
import { clusterGaps, draftable, MIN_DEMAND, type GapCluster } from "./cluster";
import { writeDraft } from "./draft";
import { publishPageForCluster } from "./publish";

/** How far back the pipeline looks. A question asked four months ago is not today's demand. */
const WINDOW_DAYS = 120;
/**
 * Pages published per run. One, and it is a blast radius rather than a throughput limit: if
 * something about the generator is wrong, the evidence is one page and one revert.
 */
const MAX_PAGES_PER_RUN = 1;
/** Drafts written per run when publishing did not happen. Each is a grounded research call. */
const MAX_DRAFTS_PER_RUN = 2;

export interface GapsSummary {
  gaps: number;
  clusters: number;
  published: string[];
  drafted: string[];
  skipped: Array<{ label: string; reason: string }>;
  pending: Array<{ label: string; demand: number }>;
}

export async function refreshContentGaps(today: string): Promise<GapsSummary> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const docs = await RedditContentGapModel.find({ createdAt: { $gte: since } })
    .sort({ createdUtc: -1 })
    .limit(2000)
    .lean<RedditContentGapDoc[]>();

  const summary: GapsSummary = { gaps: docs.length, clusters: 0, published: [], drafted: [], skipped: [], pending: [] };
  if (!docs.length) return summary;

  const clusters = clusterGaps(docs);
  summary.clusters = clusters.length;

  // Persist the grouping even below the threshold: a cluster of two today is a cluster of four next
  // month, and the id is stable, so the count is a running total rather than a per-run snapshot.
  for (const cluster of clusters) {
    await RedditContentGapModel.updateMany(
      { postId: { $in: cluster.members.map((member) => member.postId) } },
      { $set: { clusterId: cluster.id, clusterLabel: cluster.label } }
    );
  }

  const ready = draftable(clusters, MIN_DEMAND);
  summary.pending = ready.map((cluster) => ({ label: cluster.label, demand: cluster.members.length }));
  if (!ready.length) return summary;

  // Biggest demand first: the question the most people asked is the page worth today's one slot.
  const queue = [...ready].sort((a, b) => b.members.length - a.members.length);

  let published = 0;
  const unpublished: GapCluster[] = [];

  for (const cluster of queue) {
    if (published >= MAX_PAGES_PER_RUN) {
      unpublished.push(cluster);
      continue;
    }
    const outcome = await publishPageForCluster(cluster, today);
    if (outcome.status === "published") {
      published++;
      summary.published.push(outcome.pagePath);
      continue;
    }
    summary.skipped.push({ label: cluster.label, reason: outcome.reason });
    // Out of scope is a permanent answer and already recorded; anything else is worth a draft so a
    // person can pick up where the automation stopped.
    if (!outcome.reason.startsWith("fuera de alcance")) unpublished.push(cluster);
  }

  for (const cluster of unpublished.slice(0, MAX_DRAFTS_PER_RUN)) {
    const draft = await writeDraft(cluster, today);
    if (!draft) {
      console.warn(`[gaps] la investigación no devolvió nada para "${cluster.label}" — se reintenta mañana`);
      continue;
    }
    await RedditContentGapModel.updateMany(
      { postId: { $in: cluster.members.map((member) => member.postId) } },
      { $set: { draftPath: draft.relativePath, draftedAt: new Date() } }
    );
    summary.drafted.push(draft.relativePath);
    await notifyAdmin(
      `📝 *Hueco de contenido sin publicar* — ${cluster.members.length} hilos piden lo mismo:\n` +
        `_${cluster.label}_\n` +
        `Quedó como borrador: \`${draft.relativePath}\`\n` +
        `Subs: ${cluster.subs.map((sub) => `r/${sub}`).join(", ")}`
    );
  }

  return summary;
}

/** Only for the log line — the biggest clusters that are still short of the demand threshold. */
export function almostThere(clusters: readonly GapCluster[]): Array<{ label: string; demand: number }> {
  return clusters
    .filter((cluster) => cluster.members.length > 1 && cluster.members.length < MIN_DEMAND)
    .slice(0, 5)
    .map((cluster) => ({ label: cluster.label, demand: cluster.members.length }));
}

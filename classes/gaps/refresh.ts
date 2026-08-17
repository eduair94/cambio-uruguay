// The gap pipeline: read the unanswered questions, cluster them, draft the ones with real demand.

import { notifyAdmin } from "../notify";
import { RedditContentGapModel, type RedditContentGapDoc } from "../models/RedditContentGap";
import { clusterGaps, draftable, MIN_DEMAND, type GapCluster } from "./cluster";
import { writeDraft } from "./draft";

/** How far back the pipeline looks. A question asked four months ago is not today's demand. */
const WINDOW_DAYS = 120;
/** At most this many drafts per run — each one is a grounded research call and a file to review. */
const MAX_DRAFTS_PER_RUN = 2;

export interface GapsSummary {
  gaps: number;
  clusters: number;
  drafted: string[];
  pending: Array<{ label: string; demand: number }>;
}

export async function refreshContentGaps(today: string): Promise<GapsSummary> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const docs = await RedditContentGapModel.find({ createdAt: { $gte: since } })
    .sort({ createdUtc: -1 })
    .limit(2000)
    .lean<RedditContentGapDoc[]>();

  const summary: GapsSummary = { gaps: docs.length, clusters: 0, drafted: [], pending: [] };
  if (!docs.length) return summary;

  const clusters = clusterGaps(docs);
  summary.clusters = clusters.length;

  // Persist the grouping even for clusters below the threshold: a cluster of two today is a cluster
  // of four next month, and the id is stable, so the count is a running total rather than a
  // snapshot that resets every run.
  for (const cluster of clusters) {
    await RedditContentGapModel.updateMany(
      { postId: { $in: cluster.members.map((member) => member.postId) } },
      { $set: { clusterId: cluster.id, clusterLabel: cluster.label } }
    );
  }

  const ready = draftable(clusters, MIN_DEMAND);
  summary.pending = ready.map((cluster) => ({ label: cluster.label, demand: cluster.members.length }));

  for (const cluster of ready.slice(0, MAX_DRAFTS_PER_RUN)) {
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
      `📝 *Hueco de contenido* — ${cluster.members.length} hilos piden lo mismo:\n` +
        `_${cluster.label}_\n` +
        `Borrador: \`${draft.relativePath}\`\n` +
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

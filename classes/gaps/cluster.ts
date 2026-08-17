// Group the questions the site could not answer.
//
// One unanswered thread is noise: people ask odd, specific, unrepeatable things. Four threads
// asking the same thing in a month is a page that should exist, and — unlike a keyword tool's
// estimated volume — it is evidence, because nobody was prompted to ask.
//
// The clustering is deliberately the simplest thing that works: greedy agglomeration over the
// cosine of the question embeddings we already computed while rejecting them. There is no k to
// choose (we do not know how many topics are missing), it is stable across runs given the same
// data, and at the scale involved — tens to low hundreds of open gaps — an O(n²) pass is
// microseconds. Reaching for anything cleverer would add a tuning surface for no gain.

import crypto from "crypto";
import { bufferToVector, cosine } from "../rag/embed";
import type { RedditContentGapDoc } from "../models/RedditContentGap";

/** How close two questions must be to count as the same question. */
export const CLUSTER_THRESHOLD = 0.78;
/** How many threads a cluster needs before it is worth drafting a page for. */
export const MIN_DEMAND = 4;

export interface GapCluster {
  /** Stable across runs: derived from the member post ids, so re-running never renames a cluster. */
  id: string;
  label: string;
  members: RedditContentGapDoc[];
  /** Subreddits the demand came from, deduplicated. */
  subs: string[];
}

interface Vectored {
  doc: RedditContentGapDoc;
  vector: Float32Array;
}

function toVectored(docs: readonly RedditContentGapDoc[]): Vectored[] {
  const out: Vectored[] = [];
  for (const doc of docs) {
    if (!doc.embedding) continue;
    const vector = bufferToVector(doc.embedding as Buffer);
    if (!vector.length) continue;
    out.push({ doc, vector });
  }
  return out;
}

/** Stable id for a set of members. */
const clusterIdOf = (postIds: readonly string[]): string =>
  crypto
    .createHash("sha1")
    .update([...postIds].sort().join(","))
    .digest("hex")
    .slice(0, 12);

/**
 * The label is the member title closest to the cluster's centroid — the most typical way people
 * phrase this question, rather than the first one that happened to arrive. It goes into the draft
 * and into the Telegram ping, so it should read like something a person wrote, which it is.
 */
function labelOf(members: readonly Vectored[]): string {
  if (members.length === 1) return members[0]!.doc.title;
  const dims = members[0]!.vector.length;
  const centroid = new Float32Array(dims);
  for (const member of members) for (let i = 0; i < dims; i++) centroid[i]! += member.vector[i]!;
  for (let i = 0; i < dims; i++) centroid[i]! /= members.length;

  let best = members[0]!;
  let bestScore = -Infinity;
  for (const member of members) {
    const score = cosine(centroid, member.vector);
    if (score > bestScore) {
      bestScore = score;
      best = member;
    }
  }
  return best.doc.title;
}

/** Greedy agglomeration. Members are compared against the cluster's SEED, not its centroid, which
 *  keeps a chain of loosely-related questions from drifting into one giant cluster. */
export function clusterGaps(docs: readonly RedditContentGapDoc[], threshold = CLUSTER_THRESHOLD): GapCluster[] {
  const items = toVectored(docs);
  const used = new Set<number>();
  const clusters: GapCluster[] = [];

  // Newest first, so the seed of each cluster is the most current phrasing of the question.
  items.sort((a, b) => (b.doc.createdUtc ?? 0) - (a.doc.createdUtc ?? 0));

  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const seed = items[i]!;
    const members: Vectored[] = [seed];
    used.add(i);

    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      if (seed.vector.length !== items[j]!.vector.length) continue;
      if (cosine(seed.vector, items[j]!.vector) < threshold) continue;
      members.push(items[j]!);
      used.add(j);
    }

    const postIds = members.map((m) => m.doc.postId);
    clusters.push({
      id: clusterIdOf(postIds),
      label: labelOf(members),
      members: members.map((m) => m.doc),
      subs: [...new Set(members.map((m) => m.doc.sub).filter(Boolean))],
    });
  }

  return clusters.sort((a, b) => b.members.length - a.members.length);
}

/** Clusters big enough to be worth a page, and not already drafted. */
export function draftable(clusters: readonly GapCluster[], minDemand = MIN_DEMAND): GapCluster[] {
  return clusters.filter(
    (cluster) => cluster.members.length >= minDemand && !cluster.members.some((member) => member.draftedAt)
  );
}

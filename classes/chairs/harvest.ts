import { fetchComments, redditConfigured, searchPosts, type RedditPostRaw } from "../reddit";
import { ChairRedditCommentModel } from "../models/ChairRedditComment";
import { ChairRedditPostModel } from "../models/ChairRedditPost";
import { CHAIR_QUERIES, type ChairSourceComment } from "./types";

const SUBREDDIT = "CharruaDevs";
const MAX_THREAD_FETCHES = 80;
const FIVE_YEARS_SECONDS = 5 * 365 * 24 * 60 * 60;

const iso = (utcSeconds: number): string => new Date(utcSeconds * 1000).toISOString().slice(0, 10);

export interface ChairHarvestStats {
  searched: number;
  found: number;
  threadsFetched: number;
  commentsStored: number;
  commentsPending: number;
}

export async function harvestChairDiscussions(
  window: "year" | "all" = "all"
): Promise<ChairHarvestStats> {
  const stats: ChairHarvestStats = {
    searched: 0,
    found: 0,
    threadsFetched: 0,
    commentsStored: 0,
    commentsPending: 0,
  };
  if (!redditConfigured()) return stats;

  const found = new Map<string, { post: RedditPostRaw; queries: Set<string> }>();
  for (const query of CHAIR_QUERIES) {
    stats.searched++;
    const posts = await searchPosts(SUBREDDIT, query, {
      t: window,
      sort: "relevance",
      maxPages: window === "all" ? 5 : 2,
    });
    for (const post of posts) {
      const hit = found.get(post.id);
      if (hit) hit.queries.add(query);
      else found.set(post.id, { post, queries: new Set([query]) });
    }
  }

  const cutoff = Date.now() / 1000 - FIVE_YEARS_SECONDS;
  const fresh = [...found.values()].filter(({ post }) => post.createdUtc >= cutoff);
  stats.found = fresh.length;
  if (!fresh.length) return stats;

  const ids = fresh.map(({ post }) => post.id);
  const existing = await ChairRedditPostModel.find({ redditId: { $in: ids } })
    .select({ redditId: 1, commentsAtCount: 1, commentTreeVersion: 1 })
    .lean();
  const knownPosts = new Map(
    existing.map((post) => [
      post.redditId,
      {
        count: post.commentsAtCount ?? -1,
        treeVersion: post.commentTreeVersion ?? 0,
      },
    ])
  );

  await ChairRedditPostModel.bulkWrite(
    fresh.map(({ post, queries }) => ({
      updateOne: {
        filter: { redditId: post.id },
        update: {
          $set: {
            sub: SUBREDDIT,
            title: post.title,
            selftext: post.selftext,
            author: post.author,
            score: post.score,
            numComments: post.numComments,
            permalink: post.permalink,
            date: iso(post.createdUtc),
            createdUtc: post.createdUtc,
            lastSeenAt: new Date(),
          },
          $addToSet: { queries: { $each: [...queries] } },
          $setOnInsert: {
            commentsAtCount: -1,
            commentsFetchedAt: null,
            commentTreeVersion: 0,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const needComments = fresh
    .map(({ post }) => post)
    .filter((post) => {
      const known = knownPosts.get(post.id);
      return post.numComments > (known?.count ?? -1) || (known?.treeVersion ?? 0) < 1;
    })
    .sort((a, b) => b.numComments - a.numComments || b.createdUtc - a.createdUtc);
  stats.commentsPending = needComments.length;

  for (const post of needComments.slice(0, MAX_THREAD_FETCHES)) {
    const held = await ChairRedditCommentModel.find({ postId: post.id })
      .select({ commentId: 1 })
      .lean();
    const known = new Set(held.map((comment) => comment.commentId));
    const backfillingTree = (knownPosts.get(post.id)?.treeVersion ?? 0) < 1;
    const comments = await fetchComments(
      SUBREDDIT,
      post.id,
      backfillingTree ? new Set<string>() : known
    );

    if (!comments.length && post.numComments > 0 && known.size === 0) continue;
    const usableComments = comments.filter((comment) => comment.body.trim().length >= 4);
    const newComments = usableComments.filter((comment) => !known.has(comment.id));
    if (usableComments.length) {
      await ChairRedditCommentModel.bulkWrite(
        usableComments.map((comment) => ({
          updateOne: {
            filter: { commentId: comment.id },
            update: {
              $set: {
                commentId: comment.id,
                postId: post.id,
                sub: SUBREDDIT,
                author: comment.author,
                body: comment.body,
                score: comment.score,
                date: iso(comment.createdUtc),
                createdUtc: comment.createdUtc,
                permalink: comment.permalink || post.permalink,
                parentId: comment.parentId ?? "",
                depth: comment.depth ?? 0,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      );
      stats.commentsStored += newComments.length;
    }
    await ChairRedditPostModel.updateOne(
      { redditId: post.id },
      {
        $set: {
          commentsAtCount: post.numComments,
          commentsFetchedAt: new Date(),
          commentTreeVersion: 1,
        },
      }
    );
    stats.threadsFetched++;
  }

  return stats;
}

export async function readChairCorpus(): Promise<{
  comments: ChairSourceComment[];
  threads: number;
}> {
  const [comments, posts] = await Promise.all([
    ChairRedditCommentModel.find({ sub: SUBREDDIT })
      .sort({ createdUtc: -1, score: -1 })
      .limit(5000)
      .lean(),
    ChairRedditPostModel.find({ sub: SUBREDDIT }).sort({ createdUtc: -1 }).lean(),
  ]);
  const postById = new Map(posts.map((post) => [post.redditId, post]));
  const postSources: ChairSourceComment[] = posts.map((post) => ({
    commentId: `post:${post.redditId}`,
    postId: post.redditId,
    sourceType: "post",
    parentId: null,
    depth: -1,
    postTitle: post.title,
    body: [post.title, post.selftext].filter(Boolean).join("\n\n"),
    score: post.score,
    createdUtc: post.createdUtc,
    date: post.date,
    permalink: post.permalink,
    author: post.author,
  }));
  return {
    threads: posts.length,
    comments: [
      ...postSources,
      ...comments.map((comment) => ({
        commentId: comment.commentId,
        postId: comment.postId,
        sourceType: "comment" as const,
        parentId: comment.parentId || null,
        depth: comment.depth ?? 0,
        postTitle: postById.get(comment.postId)?.title ?? "",
        body: comment.body,
        score: comment.score,
        createdUtc: comment.createdUtc,
        date: comment.date,
        permalink: comment.permalink,
        author: comment.author,
      })),
    ],
  };
}

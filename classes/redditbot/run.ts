// One pass of the bot: read the new threads, decide, and — at most once per run — answer one.
//
// AT MOST ONE. The cron fires every twelve minutes and the minimum gap between comments is
// twenty-five, so a run that posted twice would already be violating its own pacing; making that
// structural rather than arithmetic means no future change to the cron can turn the bot into a
// burst. It also bounds the blast radius of a bad calibration to one comment per run, which is what
// gives the watcher time to trip the breaker before the damage is six comments deep.
//
// Order matters throughout: every cheap check runs before every expensive one, and every gate that
// can reject runs before the composer. A rejected thread should cost one string scan, not two model
// calls.

import axios from "axios";
import { notifyAdmin } from "../notify";
import { embedOne, embedTexts, vectorToBuffer } from "../rag/embed";
import { SiteRetriever } from "../rag/retrieve";
import { loadIndex } from "../rag/store";
import { fetchNewPosts, redditConfigured, type RedditPostRaw } from "../reddit";
import { RedditContentGapModel } from "../models/RedditContentGap";
import { botConfig, canPost, type BotConfig } from "./config";
import { composeReply, buildComposePrompt, tidy, VOICE, type ComposeInput } from "./compose";
import { retrievalQuery, screenPost } from "./filter";
import { retrievalGate } from "./gate";
import { fetchPostImage } from "./image";
import { judgeRelevance } from "./judge";
import { authorAllowed, pageAllowed, runAllowed, subAllowed } from "./limits";
import {
  lastLinkedAt,
  lastRepliedToAuthorAt,
  readSnapshot,
  recordDecision,
  seenPostIds,
  waitingForPage,
} from "./ledger";
import { postComment } from "./post";
import { revisitCandidates } from "./revisit";
import { retryHint, validateReply } from "./validate";
import { askText } from "../ai_text";
import { contextOf } from "../rag/retrieve";
import type { RetrievedPage } from "../rag/types";

export interface RunSummary {
  fetched: number;
  /**
   * Threads skipped because the ledger already holds a decision for them.
   *
   * Reported rather than silently dropped: on a second run over the same listing this is nearly all
   * of them, and without the number the log reads "334 posts → 0 filtrados" with no breakdown, which
   * looks exactly like a filter that rejects everything.
   */
  alreadyDecided: number;
  screened: number;
  scored: number;
  gaps: number;
  posted: number;
  dryRun: number;
  rejected: Record<string, number>;
  note: string;
}

const emptySummary = (note: string): RunSummary => ({
  fetched: 0,
  alreadyDecided: 0,
  screened: 0,
  scored: 0,
  gaps: 0,
  posted: 0,
  dryRun: 0,
  rejected: {},
  note,
});

/** Does the link we are about to publish actually resolve? A 404 in a comment is worse than silence. */
async function linkResolves(url: string): Promise<boolean> {
  try {
    const res = await axios.get(url, {
      timeout: 12000,
      signal: AbortSignal.timeout(14000),
      maxRedirects: 2,
      validateStatus: () => true,
      // A HEAD would be cheaper, but Nitro answers some prerendered routes with 405 to HEAD while
      // serving them fine to GET — which would make this check reject perfectly good pages.
      headers: { "User-Agent": "CambioUruguayBot/1.0 link-check" },
      responseType: "text",
      transformResponse: (d) => d,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/** Record a thread the site could not answer, with its embedding, for the gap pipeline. */
async function recordGap(
  post: RedditPostRaw,
  vector: Float32Array | null,
  best: RetrievedPage | undefined
): Promise<void> {
  if (!vector) return;
  await RedditContentGapModel.updateOne(
    { postId: post.id },
    {
      $set: {
        sub: post.sub,
        title: post.title,
        text: post.selftext.slice(0, 3000),
        permalink: post.permalink,
        createdUtc: post.createdUtc,
        bestPath: best?.path ?? "",
        bestScore: best?.score ?? 0,
        embedding: vectorToBuffer(vector),
        dims: vector.length,
      },
    },
    { upsert: true }
  );
}

/** Compose, validate, and give the model exactly one corrected second chance. */
async function composeValidated(
  input: ComposeInput,
  context: string
): Promise<{ reply: string } | { reject: string }> {
  let reply = await composeReply(input);
  if (!reply) return { reject: "composer_empty" };

  // The poster's own numbers count as sourced — see the note on ValidateInput.postText.
  const postText = `${input.postTitle}\n${input.postBody}`;
  let verdict = validateReply({ reply, expectedUrl: input.url, context, postText });
  if (verdict.ok) return { reply };

  // One retry, naming the specific violation. Repeating the rules verbatim does not work; telling
  // the model which number it invented does.
  const second = await askText(`${buildComposePrompt(input)}\n\nCORRECCIÓN OBLIGATORIA\n${retryHint(verdict)}`, {
    systemHint: VOICE,
  });
  if (!second) return { reject: `invalid_${verdict.reason}` };

  reply = tidy(second);
  verdict = validateReply({ reply, expectedUrl: input.url, context, postText });
  if (verdict.ok) return { reply };

  return { reject: `invalid_${verdict.reason}` };
}

interface DeliverInput {
  post: RedditPostRaw;
  chosen: RetrievedPage;
  support: readonly RetrievedPage[];
  judgeConfidence: number;
  judgeReason: string;
  cfg: BotConfig;
  summary: RunSummary;
  reject: (reason: string) => void;
}

/**
 * Everything from "we know which page to link" to "it is posted".
 *
 * Shared by the two ways a thread gets here — the normal ranking, and the revisit pass for a thread
 * whose page was written because it asked — precisely because the differences between them belong
 * upstream. Which page to link is a decision; how to write and check a comment is not, and having
 * two copies of the validation would eventually mean one of them missing a rule.
 *
 * Returns `true` when the run is over: something was posted, or would have been in a live run.
 */
async function deliverReply({
  post,
  chosen,
  support,
  judgeConfidence,
  judgeReason,
  cfg,
  summary,
  reject,
}: DeliverInput): Promise<boolean> {
  const url = `${cfg.baseUrl}${chosen.path}`;
  const context = contextOf([chosen, ...support], 4500);

  // Fetch the attachment only now: one download, for the single thread we are actually answering.
  // Many of these threads ARE the screenshot — "me llegó esto, es normal?" over a photo of the
  // courier charge — and answering those without looking is answering a question we never read.
  const image = cfg.readImages ? await fetchPostImage(post.imageUrl) : null;
  if (image) console.log(`[redditbot] el post trae imagen (${Math.round(image.bytes / 1024)} KB), se la paso al redactor`);

  const base = {
    postId: post.id,
    sub: post.sub,
    author: post.author,
    postTitle: post.title,
    postPermalink: post.permalink,
    postCreatedUtc: post.createdUtc,
    pagePath: chosen.path,
    pageUrl: url,
    retrievalScore: chosen.score,
    retrievalCosine: chosen.cosine,
    judgeConfidence,
    judgeReason,
  };

  const composed = await composeValidated(
    {
      postTitle: post.title,
      postBody: post.selftext,
      page: chosen,
      support,
      url,
      image: image ?? undefined,
      imageNote: image
        ? "la persona adjuntó una imagen; miralá y usá lo que se ve en ella (montos, nombres, fechas) para contestar"
        : undefined,
    },
    context
  );
  if ("reject" in composed) {
    await recordDecision({ ...base, status: "rejected", rejectReason: composed.reject });
    reject(composed.reject);
    return false;
  }

  if (!(await linkResolves(url))) {
    console.warn(`[redditbot] ${url} no resolvió 200 — no se publica`);
    reject("dead_link");
    return false;
  }

  if (!canPost(cfg)) {
    await recordDecision({
      ...base,
      status: "dry_run",
      rejectReason: cfg.enabled ? "dry_run" : "disabled",
      replyText: composed.reply,
    });
    summary.dryRun++;
    console.log(`[redditbot] DRY RUN r/${post.sub} ${post.permalink}\n→ ${url}\n${composed.reply}\n`);
    return true;
  }

  const comment = await postComment(post.id, composed.reply, cfg);
  if (!comment) {
    await recordDecision({ ...base, status: "failed", rejectReason: "reddit_refused", replyText: composed.reply });
    reject("reddit_refused");
    return false;
  }

  await recordDecision({
    ...base,
    status: "posted",
    replyText: composed.reply,
    commentId: comment.id,
    commentFullname: comment.fullname,
    postedAt: new Date(),
  });
  summary.posted++;
  await notifyAdmin(
    `🤖 *Reddit bot* respondió en r/${post.sub}\n${post.title.slice(0, 120)}\n→ ${url}\n${comment.permalink || post.permalink}`
  );
  return true;
}

/**
 * A thread whose page exists because it asked.
 *
 * The retrieval gate is skipped on purpose — "does the site cover this?" was answered by writing
 * the page — but the judge is not: it is the check that the page actually turned out to answer the
 * question, which is exactly what could have gone wrong between research and publication.
 */
async function answerParkedThread(
  post: RedditPostRaw,
  pagePath: string,
  retriever: SiteRetriever,
  cfg: BotConfig,
  snapshot: Awaited<ReturnType<typeof readSnapshot>>,
  summary: RunSummary,
  reject: (reason: string) => void
): Promise<boolean> {
  const subGate = subAllowed(cfg, snapshot, post.sub);
  if (!subGate.ok) {
    reject(`limit:${subGate.reason}`);
    return false;
  }
  const authorGate = authorAllowed(cfg, await lastRepliedToAuthorAt(post.author));
  if (!authorGate.ok) {
    reject(`limit:${authorGate.reason}`);
    return false;
  }

  const query = retrievalQuery(post);
  const vector = await embedOne(query, "RETRIEVAL_QUERY");
  const chosen = retriever.pageFor(pagePath, vector);
  if (!chosen) {
    reject("parked_page_missing");
    return false;
  }

  const verdict = await judgeRelevance(post.title, post.selftext, [chosen]);
  if (!verdict.relevant || verdict.confidence < cfg.minJudge) {
    // The page was written for this thread and still does not answer it. Recording the rejection
    // takes the thread out of the parked queue rather than retrying it forever.
    await recordDecision({
      postId: post.id,
      sub: post.sub,
      author: post.author,
      postTitle: post.title,
      postPermalink: post.permalink,
      postCreatedUtc: post.createdUtc,
      status: "rejected",
      rejectReason: "judge_after_page",
      pagePath,
      judgeConfidence: verdict.confidence,
      judgeReason: verdict.reason,
    });
    reject("judge_after_page");
    return false;
  }

  return deliverReply({
    post,
    chosen,
    support: [],
    judgeConfidence: verdict.confidence,
    judgeReason: verdict.reason,
    cfg,
    summary,
    reject,
  });
}

export async function runOnce(cfg: BotConfig = botConfig()): Promise<RunSummary> {
  if (!redditConfigured()) return emptySummary("sin credenciales de lectura de Reddit (REDDIT_CLIENT_ID)");

  const snapshot = await readSnapshot();
  const runGate = runAllowed(cfg, snapshot);
  if (!runGate.ok) return emptySummary(`run bloqueado: ${runGate.reason} ${runGate.detail ?? ""}`.trim());

  const summary = emptySummary("");
  const reject = (reason: string): void => {
    summary.rejected[reason] = (summary.rejected[reason] ?? 0) + 1;
  };

  // 1. Read every watched sub.
  const posts: RedditPostRaw[] = [];
  for (const sub of cfg.subs) {
    const batch = await fetchNewPosts(sub, cfg.fetchLimit);
    posts.push(...batch);
  }
  summary.fetched = posts.length;
  if (!posts.length) return { ...summary, note: "ningún post nuevo" };

  // 2. Drop what we already decided on, then the cheap screen.
  //
  //    The per-sub cap is applied HERE rather than with the other brakes further down, and that
  //    placement is load-bearing. A thread blocked by a rate limit is deliberately NOT written to
  //    the ledger — tomorrow it may be answerable — so if it reached the embedding step it would be
  //    re-embedded on all 65 runs of the day, every day, out of a 1 000/day allowance. Checking the
  //    cap before spending anything costs one array filter.
  const seen = await seenPostIds(posts.map((p) => p.id));
  const candidates: RedditPostRaw[] = [];
  for (const post of posts) {
    if (seen.has(post.id)) {
      summary.alreadyDecided++;
      continue;
    }

    const subGate = subAllowed(cfg, snapshot, post.sub);
    if (!subGate.ok) {
      reject(`limit:${subGate.reason}`);
      continue;
    }

    const verdict = screenPost(post, cfg);
    if (!verdict.ok) {
      // Only durable rejections are written down. `too_new` is a thread we want to look at again in
      // twelve minutes — recording it would blacklist it forever.
      if (verdict.reason !== "too_new") {
        await recordDecision({
          postId: post.id,
          sub: post.sub,
          author: post.author,
          postTitle: post.title,
          postPermalink: post.permalink,
          postCreatedUtc: post.createdUtc,
          status: "rejected",
          rejectReason: `filter:${verdict.reason}`,
        });
      }
      reject(`filter:${verdict.reason}`);
      continue;
    }
    candidates.push(post);
  }
  summary.screened = candidates.length;

  // Threads whose page was written and may now be answerable. Counted before the early return: a
  // quiet morning on /new is exactly when the backlog of parked questions should get its turn.
  const parkedCount = (await waitingForPage()).length;
  if (!candidates.length && !parkedCount) return { ...summary, note: "nada pasó el filtro temático" };

  // 3. Only now load the index. It is ~17 MB of vectors, and on most of the 65 runs a day nothing
  //    clears the screen — reading it before knowing that would be the single most expensive thing
  //    this job does, done for nothing.
  const chunks = await loadIndex();
  if (!chunks.length) return { ...summary, note: "el índice RAG está vacío — corré sync_rag_index primero" };
  const retriever = new SiteRetriever(chunks);

  // An index with rows but no vectors is BROKEN, not empty, and the difference is invisible further
  // down: every cosine would be 0, the gate would refuse everything, and the run would look like a
  // quiet morning. Refuse loudly instead — this exact state shipped once and went unnoticed.
  if (!retriever.embeddedCount) {
    await notifyAdmin(
      `🛑 *Índice RAG sin vectores*: ${chunks.length} chunks cargados y ninguno embebido. ` +
        `El bot no puede medir relevancia y no va a contestar nada hasta que se arregle.`
    );
    return { ...summary, note: `índice roto: ${chunks.length} chunks, 0 con vector` };
  }

  // 3b. Threads that are already spoken for: a page exists because THEY asked. They jump the queue,
  //     because the page was written to answer this exact question and every day it waits is a day
  //     the twelve people who asked never hear about it.
  if (parkedCount) {
    const revisits = await revisitCandidates({ indexedPaths: retriever.paths(), cfg });
    for (const { post, pagePath } of revisits) {
      const done = await answerParkedThread(post, pagePath, retriever, cfg, snapshot, summary, reject);
      if (done) return { ...summary, note: `respondido con la página que se generó para el hilo (${pagePath})` };
    }
  }
  if (!candidates.length) return { ...summary, note: "sólo había hilos esperando página" };

  // 4. Pre-rank with the lexical arm alone, which is free, and embed only the best few.
  //
  //    Query embeddings are metered out of the same daily Gemini allowance as the index, and this
  //    job runs 65 times a day: an uncapped busy morning would spend the indexer's budget before
  //    lunch and leave the index permanently half-built. Whatever does not fit is not lost — the
  //    next run is twelve minutes away, and the ledger has not written these off.
  const scored = candidates
    .map((post) => {
      const query = retrievalQuery(post);
      return { post, query, lexical: retriever.rankWithVector(query, null, 1)[0]?.score ?? 0 };
    })
    .sort((a, b) => b.lexical - a.lexical);

  const shortlist = scored.slice(0, Math.max(1, cfg.maxCandidatesPerRun));
  if (scored.length > shortlist.length) {
    console.log(`[redditbot] ${scored.length - shortlist.length} candidatos quedan para la próxima corrida (tope de embeddings)`);
  }

  const queries = shortlist.map((c) => c.query);
  const vectors = await embedTexts(queries, "RETRIEVAL_QUERY");

  interface Ranked {
    post: RedditPostRaw;
    vector: Float32Array | null;
    pages: RetrievedPage[];
  }
  const ranked: Ranked[] = shortlist.map((c, i) => ({
    post: c.post,
    vector: vectors[i] ?? null,
    pages: retriever.rankWithVector(c.query, vectors[i] ?? null, 3),
  }));
  summary.scored = ranked.length;

  // Best first: if the run can only post once, it should post the one it is most sure about.
  ranked.sort((a, b) => (b.pages[0]?.score ?? 0) - (a.pages[0]?.score ?? 0));

  for (const { post, vector, pages } of ranked) {
    // 5. No query vector means the dense arm never ran, so `cosine` is 0 for everything and the
    //    gate below would read "the site has no page about this". It does not: we simply could not
    //    measure. Skipping leaves no ledger row and files no content gap, so the thread is
    //    reconsidered next run instead of becoming evidence that a page is missing — which is how
    //    an embedding outage would otherwise manufacture a whole bogus draft page.
    if (!vector) {
      reject("no_query_vector");
      continue;
    }

    // "Does the site answer this?" — cosine plus margin over the runner-up. See gate.ts.
    const gate = retrievalGate(cfg, pages);
    const best = pages[0];

    if (!gate.ok) {
      await recordGap(post, vector, best);
      await recordDecision({
        postId: post.id,
        sub: post.sub,
        author: post.author,
        postTitle: post.title,
        postPermalink: post.permalink,
        postCreatedUtc: post.createdUtc,
        status: "rejected",
        rejectReason: `gap:${gate.reason}`,
        judgeReason: gate.detail ?? "",
        pagePath: best?.path ?? "",
        retrievalScore: best?.score ?? 0,
        retrievalCosine: best?.cosine ?? 0,
      });
      summary.gaps++;
      reject(`gap:${gate.reason}`);
      continue;
    }

    // 6. The remaining per-thread brakes. None of these writes a ledger row: tomorrow the same
    //    thread may be answerable, and a rejection row would blacklist it for good.
    const authorGate = authorAllowed(cfg, await lastRepliedToAuthorAt(post.author));
    if (!authorGate.ok) {
      reject(`limit:${authorGate.reason}`);
      continue;
    }

    // 7. The judge.
    const verdict = await judgeRelevance(post.title, post.selftext, pages);
    if (!verdict.relevant || verdict.confidence < cfg.minJudge) {
      await recordDecision({
        postId: post.id,
        sub: post.sub,
        author: post.author,
        postTitle: post.title,
        postPermalink: post.permalink,
        postCreatedUtc: post.createdUtc,
        status: "rejected",
        rejectReason: "judge",
        pagePath: best.path,
        retrievalScore: best.score,
        retrievalCosine: best.cosine,
        judgeConfidence: verdict.confidence,
        judgeReason: verdict.reason,
      });
      reject("judge");
      continue;
    }

    // The judge may have preferred a different candidate; follow it.
    const chosen = pages.find((page) => page.path === verdict.path) ?? best;

    const pageGate = pageAllowed(cfg, await lastLinkedAt(chosen.path));
    if (!pageGate.ok) {
      reject(`limit:${pageGate.reason}`);
      continue;
    }

    // 8. Write it.
    const done = await deliverReply({
      post,
      chosen,
      support: pages.filter((page) => page.path !== chosen.path),
      judgeConfidence: verdict.confidence,
      judgeReason: verdict.reason,
      cfg,
      summary,
      reject,
    });
    // One per run. See the note at the top.
    if (done) return { ...summary, note: canPost(cfg) ? "publicado" : "dry run" };
  }

  return { ...summary, note: summary.gaps ? "sin página específica para los candidatos" : "nada que responder" };
}

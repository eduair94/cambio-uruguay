// One pass of the bot: read the week's threads, decide, and answer up to `maxRepliesPerRun` of them.
//
// UP TO A FEW, not one, and not unbounded. It used to be exactly one, and that was right when the
// cron fired every twelve minutes: 65 chances a day meant "one per run" was a burst limit, not a
// volume limit. With an hourly cron it stopped being either — it became a ceiling of fifteen a day
// that got thrown away entirely every hour the single candidate failed the judge, while the week-long
// window meant the backlog never drained. So the burst limit moved to where it actually belongs:
// between one comment and the next the run SLEEPS `minGapMinutes` with jitter and re-reads the
// ledger, so the daily cap, the per-sub cap and the "too soon" gate are all evaluated against the
// state this run just created rather than the photo it took on the way in.
//
// What did not change is the blast radius argument: a bad calibration must not produce a day's worth
// of comments before the watcher can trip the breaker. `maxRepliesPerRun` is what keeps that true.
//
// Order matters throughout: every cheap check runs before every expensive one, and every gate that
// can reject runs before the composer. A rejected thread should cost one string scan, not two model
// calls.

import axios from "axios";
import { notifyAdmin } from "../notify";
import { embedOne, embedTexts, vectorToBuffer } from "../rag/embed";
import { SiteRetriever } from "../rag/retrieve";
import { loadIndex } from "../rag/store";
import { fetchNewPostsSince, fetchPostsByIds, redditConfigured, type RedditPostRaw } from "../reddit";
import { RedditContentGapModel } from "../models/RedditContentGap";
import { RedditPageGapModel } from "../models/RedditPageGap";
import { botConfig, canPost, type BotConfig } from "./config";
import { composeReply, buildComposePrompt, tidy, VOICE, type ComposeInput } from "./compose";
import { retrievalQuery, screenPost } from "./filter";
import { retrievalGate } from "./gate";
import { augmentContext, EMPTY_AUGMENTATION, type Augmentation } from "./augment";
import { fetchPostImage } from "./image";
import { judgeRelevance } from "./judge";
import { authorAllowed, jitterMinutes, pageAllowed, runAllowed, subAllowed } from "./limits";
import type { LedgerSnapshot } from "./ledger";
import { subWritable } from "./subrules";
import { bioDeclaresBot } from "./identity";
import { fetchAccountBio } from "./post";
import {
  lastLinkedAt,
  lastRepliedToAuthorAt,
  hasPostedTo,
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

/**
 * How much retrieved text the composer gets.
 *
 * Raised from 4 500 after reading the first real comment the bot posted: it was accurate and
 * usefully corrected the asker, but it named no figure at all, because none of the page's figures
 * had made it into the context. The number rule is not the problem — the context was.
 */
/** Franja de edad, en horas, dentro de la cual dos hilos se consideran igual de frescos. */
const RECENCY_BUCKET_HOURS = 2;

const CONTEXT_CHARS = 9000;
/** Slices of the chosen page to hand the composer. The whole page, in practice, for most pages. */
const CONTEXT_CHUNKS = 16;

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

/**
 * Anotar que a una página le faltó algo para contestar un hilo.
 *
 * Una sola vez por (página, hilo). Cuando varias personas tropiezan con el mismo faltante en la
 * misma página, eso deja de ser una anécdota y pasa a ser una ampliación que hay que escribir —
 * que es lo que hace `classes/gaps/enrich.ts`.
 */
async function recordPageGap(pagePath: string, augmented: Augmentation, postId: string): Promise<void> {
  try {
    await RedditPageGapModel.updateOne(
      { pagePath, postId },
      {
        $set: {
          pagePath,
          postId,
          missing: augmented.missing.slice(0, 500),
          findingsSources: augmented.sources.map((s) => s.url),
          hadEvidence: Boolean(augmented.evidence),
        },
      },
      { upsert: true }
    );
  } catch (e: any) {
    // Anotar un faltante nunca puede costar la respuesta que ya está escrita.
    console.warn("[redditbot] no pude anotar el faltante de página:", e?.message || e);
  }
}

/** Compose, validate, and give the model exactly one corrected second chance. */
async function composeValidated(
  input: ComposeInput,
  context: string
): Promise<{ reply: string } | { reject: string }> {
  // Todo lo que puede respaldar una cifra: la página, lo que investigamos afuera, y lo que la
  // propia persona escribió.
  const evidence = `${context}
${input.externalEvidence ?? ""}`;
  let reply = await composeReply(input);
  if (!reply) return { reject: "composer_empty" };

  // The poster's own numbers count as sourced — see the note on ValidateInput.postText.
  const postText = `${input.postTitle}\n${input.postBody}`;
  let verdict = validateReply({ reply, expectedUrl: input.url, context: evidence, postText });
  if (verdict.ok) return { reply };

  // One retry, naming the specific violation. Repeating the rules verbatim does not work; telling
  // the model which number it invented does.
  const second = await askText(`${buildComposePrompt(input)}\n\nCORRECCIÓN OBLIGATORIA\n${retryHint(verdict)}`, {
    systemHint: VOICE,
  });
  if (!second) return { reject: `invalid_${verdict.reason}` };

  reply = tidy(second);
  verdict = validateReply({ reply, expectedUrl: input.url, context: evidence, postText });
  if (verdict.ok) return { reply };

  return { reject: `invalid_${verdict.reason}` };
}

interface DeliverInput {
  post: RedditPostRaw;
  chosen: RetrievedPage;
  support: readonly RetrievedPage[];
  /**
   * The chosen page with MUCH more of its text than the ranking returned.
   *
   * The ranking hands back the four best-matching slices, which is right for deciding WHICH page
   * answers the question and wrong for writing the answer. The composer may only use figures that
   * appear in what it was given, so a thin context does not produce a cautious reply — it produces
   * a vague one. Measured on the first real comment: the page stated the exemption, the 80 UI
   * credit and the 15-day validity, none of the three were in the four slices, and the reply came
   * out true but generic. Deciding needs precision; writing needs breadth.
   */
  contextPage?: RetrievedPage;
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
  contextPage,
  judgeConfidence,
  judgeReason,
  cfg,
  summary,
  reject,
}: DeliverInput): Promise<boolean> {
  const url = `${cfg.baseUrl}${chosen.path}`;
  // Breadth on the page we are quoting, one slice each from the rest.
  const context = contextOf([contextPage ?? chosen, ...support.map((p) => ({ ...p, chunks: p.chunks.slice(0, 1) }))], CONTEXT_CHARS);

  // Fetch the attachment only now: one download, for the single thread we are actually answering.
  // Many of these threads ARE the screenshot — "me llegó esto, es normal?" over a photo of the
  // courier charge — and answering those without looking is answering a question we never read.
  const image = cfg.readImages ? await fetchPostImage(post.imageUrl) : null;
  if (image) console.log(`[redditbot] el post trae imagen (${Math.round(image.bytes / 1024)} KB), se la paso al redactor`);

  // Lo que la página no cubre, investigado y verificado. Sirve dos veces: mejora ESTA respuesta,
  // y queda anotado como faltante de la página para ampliarla después.
  const augmented: Augmentation = cfg.researchGaps
    ? await augmentContext(`${post.title}
${post.selftext}`, context)
    : EMPTY_AUGMENTATION;
  if (augmented.missing) {
    console.log(`[redditbot] a ${chosen.path} le falta: ${augmented.missing}`);
    await recordPageGap(chosen.path, augmented, post.id);
  }

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
      // La ampliada, no la del ranking: el prompt arma su contexto desde acá.
      page: contextPage ?? chosen,
      support,
      url,
      image: image ?? undefined,
      imageNote: image
        ? "la persona adjuntó una imagen; miralá y usá lo que se ve en ella (montos, nombres, fechas) para contestar"
        : undefined,
      externalEvidence: augmented.evidence || undefined,
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
    contextPage: retriever.pageFor(pagePath, vector, CONTEXT_CHUNKS) ?? undefined,
    support: [],
    judgeConfidence: verdict.confidence,
    judgeReason: verdict.reason,
    cfg,
    summary,
    reject,
  });
}

/**
 * Answer one named thread, through the same gates as a scheduled run.
 *
 * For validating the whole chain end to end without waiting for `/new` to produce an answerable
 * question, and for the occasional thread a person wants answered on purpose. Everything that
 * decides WHETHER to answer still applies — screen, retrieval gate, judge, the reply validator, the
 * ledger — so a thread the bot would not have picked is still refused here. The only thing relaxed
 * is the age window, because a thread chosen by hand was chosen knowing how old it is.
 *
 * The ledger is written exactly as in a normal run, which is what makes a second invocation on the
 * same thread a no-op instead of a duplicate comment.
 */
export async function answerThreadById(postId: string, cfg: BotConfig = botConfig()): Promise<RunSummary> {
  const summary = emptySummary("");
  const reject = (reason: string): void => {
    summary.rejected[reason] = (summary.rejected[reason] ?? 0) + 1;
  };

  if (!redditConfigured()) return emptySummary("sin credenciales de lectura de Reddit");

  const [post] = await fetchPostsByIds([postId]);
  if (!post) return emptySummary(`Reddit no devolvió el hilo ${postId} (¿borrado?)`);
  summary.fetched = 1;

  // The one guard that must not be bypassed even here — and it is narrower than the scheduled run's.
  // A past rejection ("too old", "off topic") is a decision this command exists to override; only an
  // actual comment is a duplicate.
  if (await hasPostedTo(post.id)) {
    summary.alreadyDecided = 1;
    return { ...summary, note: "ya comentamos en este hilo — no se responde dos veces" };
  }

  const relaxed: BotConfig = { ...cfg, maxAgeHours: 24 * 365 };
  const verdict = screenPost(post, relaxed);
  if (!verdict.ok) {
    reject(`filter:${verdict.reason}`);
    return { ...summary, note: `el filtro lo descarta: ${verdict.reason}` };
  }
  summary.screened = 1;

  const chunks = await loadIndex();
  const retriever = new SiteRetriever(chunks);
  if (!retriever.embeddedCount) return { ...summary, note: "el índice no tiene vectores" };

  const query = retrievalQuery(post);
  const vector = await embedOne(query, "RETRIEVAL_QUERY");
  if (!vector) return { ...summary, note: "no se pudo embeber la consulta (¿cupo diario?)" };

  const pages = retriever.rankWithVector(query, vector, 3);
  summary.scored = 1;
  const gate = retrievalGate(cfg, pages);
  console.log(
    `[redditbot] candidatas: ${pages.map((p) => `${p.path} cos=${p.cosine.toFixed(3)}`).join(" | ")}`
  );
  if (!gate.ok) {
    reject(`gap:${gate.reason}`);
    return { ...summary, note: `sin página específica: ${gate.reason} ${gate.detail ?? ""}` };
  }

  const judged = await judgeRelevance(post.title, post.selftext, pages);
  console.log(`[redditbot] juez: relevant=${judged.relevant} conf=${judged.confidence} → ${judged.path}`);
  if (!judged.relevant || judged.confidence < cfg.minJudge) {
    reject("judge");
    return { ...summary, note: `el juez lo rechazó: ${judged.reason}` };
  }

  const chosen = pages.find((page) => page.path === judged.path) ?? pages[0]!;
  const done = await deliverReply({
    post,
    chosen,
    contextPage: retriever.pageFor(chosen.path, vector, CONTEXT_CHUNKS) ?? undefined,
    support: pages.filter((page) => page.path !== chosen.path),
    judgeConfidence: judged.confidence,
    judgeReason: judged.reason,
    cfg,
    summary,
    reject,
  });

  return { ...summary, note: done ? (canPost(cfg) ? "publicado" : "dry run") : "no se publicó" };
}

export async function runOnce(cfg: BotConfig = botConfig()): Promise<RunSummary> {
  if (!redditConfigured()) return emptySummary("sin credenciales de lectura de Reddit (REDDIT_CLIENT_ID)");

  let snapshot = await readSnapshot();
  const runGate = runAllowed(cfg, snapshot);
  if (!runGate.ok) return emptySummary(`run bloqueado: ${runGate.reason} ${runGate.detail ?? ""}`.trim());

  const summary = emptySummary("");
  const reject = (reason: string): void => {
    summary.rejected[reason] = (summary.rejected[reason] ?? 0) + 1;
  };

  /** Páginas ya enlazadas en ESTA corrida. Ver la nota junto a `page_repeat_in_run`. */
  const pagesThisRun = new Set<string>();

  /**
   * Qué pasa después de dejar un comentario: ¿se sigue, y con qué foto del ledger?
   *
   * Una corrida contesta VARIOS hilos, y ahí "esperar el gap mínimo" deja de ser algo que garantiza
   * el cron y pasa a ser algo que hay que hacer a mano. El bucle no puede confiar en la foto que
   * leyó al empezar —él mismo la invalidó al publicar— así que la relee: el cupo diario, el del sub
   * y el "muy seguido" se vuelven a evaluar contra el estado real antes de escribir el siguiente.
   *
   * En ensayo no se duerme. Un dry run no le habla a nadie y hacerlo esperar doce minutos entre
   * comentarios que no existen convertiría cada prueba en media hora.
   */
  //
  // Devuelve `stop` con el motivo cuando la corrida se terminó, o la foto nueva del ledger cuando
  // sigue. Una unión discriminada sería más linda y no narrowea: este `tsconfig` no tiene `strict`,
  // así que `if (!next.ok)` no le dice nada al compilador sobre la otra rama.
  const afterPosting = async (): Promise<{ stop: string | null; snapshot: LedgerSnapshot }> => {
    const answered = summary.posted + summary.dryRun;
    if (answered >= cfg.maxRepliesPerRun) {
      return { stop: `${answered} respondidos (tope de la corrida)`, snapshot };
    }

    if (canPost(cfg)) {
      const waitMin = jitterMinutes(cfg.minGapMinutes);
      console.log(`[redditbot] ${answered} publicados; espero ${waitMin} min antes del próximo`);
      await new Promise((resolve) => setTimeout(resolve, waitMin * 60_000));
    }

    const fresh = await readSnapshot();
    const gate = runAllowed(cfg, fresh);
    if (!gate.ok) {
      return { stop: `${answered} respondidos; ${gate.reason} ${gate.detail ?? ""}`.trim(), snapshot: fresh };
    }
    return { stop: null, snapshot: fresh };
  };

  // 0. ¿La cuenta dice en su perfil lo que es?
  //
  //    Antes de leer un solo hilo, porque si la respuesta es no la corrida no puede terminar en un
  //    comentario y todo lo demás sería gasto. Sólo cuando de verdad va a publicar: en ensayo no hay
  //    a quién declararle nada, y exigirlo ahí haría imposible probar el pipeline sin credenciales.
  if (canPost(cfg) && cfg.requireBioDisclosure) {
    const bio = await fetchAccountBio(cfg);
    const verdict = bioDeclaresBot(bio);
    if (!verdict.ok) {
      await notifyAdmin(
        `🛑 *Reddit bot detenido*: ${verdict.reason}. La aclaración de que u/${cfg.username} es un bot ` +
          `vive en la bio de la cuenta, y sin ella no se publica. Editá la descripción del perfil ` +
          `(o corré \`npm run reddit_account\` para ver qué falta).`
      );
      return emptySummary(`la bio de la cuenta no declara el bot: ${verdict.reason}`);
    }
  }

  // 1. Read every watched sub — los que se pueden escribir.
  //
  //    La puerta de `subrules.ts` estaba puesta en los pases que ABREN hilos y no en éste, que es el
  //    que comenta: el bot habría seguido escribiendo en el sub que baneó a la cuenta y en el que
  //    prohíbe bots por escrito. Va acá arriba, antes del fetch, porque un sub que no se puede
  //    escribir tampoco hace falta leerlo — y porque insistir sobre un ban es exactamente el camino
  //    de un ban de sub a una suspensión de cuenta.
  const since = Math.floor(Date.now() / 1000) - Math.round(cfg.maxAgeHours * 3600);
  const posts: RedditPostRaw[] = [];
  const skippedSubs: string[] = [];
  for (const sub of cfg.subs) {
    const gate = await subWritable(sub);
    if (!gate.allowed) {
      skippedSubs.push(`${sub} (${gate.reason})`);
      reject("sub_no_escribible");
      continue;
    }
    const batch = await fetchNewPostsSince(sub, since, { maxPages: cfg.fetchPages });
    posts.push(...batch);
  }
  if (skippedSubs.length) console.log(`[redditbot] subs salteados: ${skippedSubs.join(", ")}`);
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
      if (!done) continue;
      pagesThisRun.add(pagePath);
      const next = await afterPosting();
      snapshot = next.snapshot;
      if (next.stop) {
        return { ...summary, note: `respondido con la página generada (${pagePath}); ${next.stop}` };
      }
    }
  }
  if (!candidates.length) {
    return { ...summary, note: summary.posted || summary.dryRun ? "hilos que esperaban página" : "sólo había hilos esperando página" };
  }

  // 4. Pre-rank with the lexical arm alone, which is free, and embed only the best few.
  //
  //    Query embeddings are metered out of the same daily Gemini allowance as the index, and this
  //    job runs 65 times a day: an uncapped busy morning would spend the indexer's budget before
  //    lunch and leave the index permanently half-built. Whatever does not fit is not lost — the
  //    next run is twelve minutes away, and the ledger has not written these off.
  //    El orden dentro del presupuesto es por FRANJA DE EDAD y recién después por afinidad léxica.
  //    Puro léxico dejaba el hilo de hace veinte minutos esperando detrás de uno de hace seis horas
  //    que casaba un poco mejor, y para cuando le llegaba el turno el hilo ya estaba muerto: en
  //    Reddit un comentario que llega tarde no lo lee nadie, por buena que sea la respuesta. Puro
  //    reloj tampoco sirve —gastaría los embeddings en lo primero que apareció, sea lo que sea—, así
  //    que la franja de dos horas es el acuerdo: adentro de la franja gana el que más se parece.
  const now = Date.now();
  const ageBucket = (post: RedditPostRaw): number =>
    Math.floor((now - post.createdUtc * 1000) / (RECENCY_BUCKET_HOURS * 3_600_000));

  const scored = candidates
    .map((post) => {
      const query = retrievalQuery(post);
      return {
        post,
        query,
        bucket: ageBucket(post),
        lexical: retriever.rankWithVector(query, null, 1)[0]?.score ?? 0,
      };
    })
    .sort((a, b) => a.bucket - b.bucket || b.lexical - a.lexical);

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

  // Más nuevo primero, empatando por afinidad dentro de la misma franja.
  //
  // "El que mejor puntúa" parece lo correcto y no lo es: TODO lo que sale de acá todavía tiene que
  // pasar el umbral de coseno, el margen y el juez, así que lo que se publica ya es una respuesta
  // de la que estamos seguros — el ranking no elige entre buena y mala, elige entre dos buenas. Y
  // entre dos buenas gana la que todavía tiene lectores.
  ranked.sort(
    (a, b) =>
      ageBucket(a.post) - ageBucket(b.post) || (b.pages[0]?.score ?? 0) - (a.pages[0]?.score ?? 0)
  );

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

    // Y nunca la misma página dos veces en la misma corrida.
    //
    // Esto NO es el enfriamiento por página de arriba, que puede estar en cero: es el piso que queda
    // cuando aquél se apaga. La diferencia importa porque los dos frenos protegen de cosas distintas.
    // El enfriamiento regula cuántas veces por semana aparece un enlace, que es una decisión de
    // volumen; esto evita la única forma en que el volumen se vuelve una FIRMA — cinco comentarios
    // en una hora, en subs distintos, todos apuntando al mismo lugar. Eso no se lee como un
    // habitué que sabe del tema, se lee como lo que es, y se lee de una sola mirada al historial.
    //
    // No cuesta volumen: el hilo que se saltea acá vuelve a ser candidato en la próxima corrida, y
    // el cupo que libera se lo lleva otra respuesta con otra página.
    if (pagesThisRun.has(chosen.path)) {
      reject("limit:page_repeat_in_run");
      continue;
    }

    // 7b. El cupo del sub, otra vez y con el recuento de AHORA.
    //
    //     Ya se chequeó en el barrido de arriba, con la foto del ledger de antes de la corrida. Si
    //     esta corrida ya contestó dos hilos de r/uruguay, esa foto está vieja justo en el número
    //     que importa, y sin este segundo chequeo el tope por sub sólo valdría entre corridas.
    const subGateNow = subAllowed(cfg, snapshot, post.sub);
    if (!subGateNow.ok) {
      reject(`limit:${subGateNow.reason}`);
      continue;
    }

    // 8. Write it.
    const done = await deliverReply({
      post,
      chosen,
      contextPage: retriever.pageFor(chosen.path, vector, CONTEXT_CHUNKS) ?? undefined,
      support: pages.filter((page) => page.path !== chosen.path),
      judgeConfidence: verdict.confidence,
      judgeReason: verdict.reason,
      cfg,
      summary,
      reject,
    });
    if (!done) continue;
    pagesThisRun.add(chosen.path);

    const next = await afterPosting();
    snapshot = next.snapshot;
    if (next.stop) return { ...summary, note: next.stop };
  }

  const answered = summary.posted + summary.dryRun;
  if (answered) return { ...summary, note: `${answered} respondidos${canPost(cfg) ? "" : " (ensayo)"}` };
  return { ...summary, note: summary.gaps ? "sin página específica para los candidatos" : "nada que responder" };
}

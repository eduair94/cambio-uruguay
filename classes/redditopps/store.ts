// Lectura y escritura de la cola en la base del APP.
//
// Una interfaz y no funciones sueltas: la corrida (`refresh.ts`) se prueba entera contra un doble en
// memoria, y el `--dry-run` sin base usa {@link NULL_STORE}. La regla de los dos dueños vive acá: el
// job escribe con `$set` sólo SUS campos y deja `state`, `stateAt` y `answerUrl` en `$setOnInsert`,
// así una corrida nunca deshace lo que una persona marcó en la página.
import { RedditOpportunityModel, type RedditOpportunityDoc } from "../models/RedditOpportunity";
import { REDDIT_OPPS_META_KEY, RedditOpportunityMetaModel, type RedditOpportunityMetaDoc } from "../models/RedditOpportunityMeta";
import type { RedditPostRaw } from "../reddit";
import type { Candidate } from "./candidates";
import { familyOf } from "./destinations";
import { groupDuplicates } from "./dupes";
import { MIN_CONFIDENCE, type Verdict } from "./judge";
import { rankOf } from "./rank";
import { decodeEntities, excerptOf, langOf } from "./text";

const DAY_MS = 86_400_000;
/** Cada cuánto se vuelve a mirar si un comentario nuestro sigue visible. */
const ANSWER_RECHECK_DAYS = 3;

export interface SaveRow {
  post: RedditPostRaw;
  verdict: Verdict;
  candidate: Candidate | null;
}

export interface QueuedCheck {
  postId: string;
  sub: string;
  numComments: number;
}

export type OppsMeta = Omit<RedditOpportunityMetaDoc, "key">;

export interface OppsStore {
  knownIds(ids: readonly string[]): Promise<Set<string>>;
  refreshLive(posts: readonly RedditPostRaw[], now: Date): Promise<number>;
  markRemoved(ids: readonly string[]): Promise<number>;
  saveVerdicts(rows: readonly SaveRow[], model: string, now: Date): Promise<void>;
  /** Recomendados todavía abiertos y vivos, para ver si siguen en pie los que el listado no trajo. */
  openRecommendedIds(since: Date): Promise<string[]>;
  linkCheckQueue(limit: number): Promise<QueuedCheck[]>;
  markLinkChecked(postId: string, alreadyLinked: boolean, numComments: number, now: Date): Promise<void>;
  answerCheckQueue(limit: number, now: Date): Promise<Array<{ postId: string; answerUrl: string }>>;
  markAnswerChecked(postId: string, visible: boolean | null, now: Date): Promise<void>;
  rerank(now: number): Promise<number>;
  prune(before: Date): Promise<number>;
  countPending(since: Date): Promise<number>;
  saveMeta(meta: OppsMeta): Promise<void>;
}

const isRemoved = (p: RedditPostRaw): boolean =>
  Boolean(p.removedBy) || p.selftext === "[removed]" || p.selftext === "[deleted]" || p.author === "[deleted]";

/** El enlace de un hilo que comparte algo de afuera (una nota, un video). Vacío para los de texto. */
const linkUrlOf = (p: RedditPostRaw): string =>
  !p.isSelf && p.url && !/^https?:\/\/(www\.|old\.)?reddit\.com\//.test(p.url) && !/redd\.it\//.test(p.url) ? p.url : "";

/** Lo que el job escribe de un hilo juzgado. Exportado para el test de la corrida. */
export function verdictFields(row: SaveRow, model: string, now: Date): Partial<RedditOpportunityDoc> {
  const { post, verdict, candidate } = row;
  const createdAt = new Date(post.createdUtc * 1000);
  const path = verdict.recommend ? verdict.path ?? "" : "";
  return {
    sub: post.sub,
    title: decodeEntities(post.title),
    excerpt: excerptOf(post.selftext),
    permalink: post.permalink,
    linkUrl: linkUrlOf(post),
    flair: decodeEntities(post.linkFlair || ""),
    lang: langOf(`${post.title} ${post.selftext}`),
    createdAt,
    score: post.score,
    numComments: post.numComments,
    locked: Boolean(post.locked),
    removed: isRemoved(post),
    verdict: verdict.recommend ? "recommend" : "reject",
    path,
    pageTitle: verdict.recommend ? candidate?.title ?? "" : "",
    family: path ? candidate?.family ?? familyOf(path) : "otros",
    confidence: verdict.confidence,
    reason: verdict.reason,
    angle: verdict.angle,
    rank: verdict.recommend
      ? rankOf({ confidence: verdict.confidence, createdAt, score: post.score, numComments: post.numComments }, now.getTime())
      : 0,
    judgedAt: now,
    judgeModel: model,
    seenAt: now,
  };
}

/** Lo que una persona marca y el job nunca pisa. Sólo al insertar. */
const ON_INSERT = {
  state: "open",
  stateAt: null,
  answerUrl: "",
  answerVisible: null,
  answerCheckedAt: null,
  alreadyLinked: null,
  linkCheckedAt: null,
  linkCheckedComments: 0,
  // Los escribe `rerank` en la misma corrida; acá sólo para que un documento recién insertado no
  // quede sin ellos si la corrida se corta antes.
  duplicateOf: "",
  alsoIn: [],
} as const;

/** Lo que filtra la vista "pendientes" de la página, sin el estado. */
const LIVE_RECOMMENDED = { verdict: "recommend", confidence: { $gte: MIN_CONFIDENCE }, removed: false, locked: false } as const;

export const mongoOppsStore: OppsStore = {
  async knownIds(ids) {
    if (!ids.length) return new Set();
    const rows = await RedditOpportunityModel.find({ postId: { $in: [...ids] } })
      .select({ postId: 1, _id: 0 })
      .lean<Array<{ postId: string }>>();
    return new Set(rows.map((r) => r.postId));
  },

  async refreshLive(posts, now) {
    if (!posts.length) return 0;
    const res = await RedditOpportunityModel.bulkWrite(
      posts.map((p) => ({
        updateOne: {
          filter: { postId: p.id },
          update: {
            $set: {
              score: p.score,
              numComments: p.numComments,
              locked: Boolean(p.locked),
              removed: isRemoved(p),
              flair: decodeEntities(p.linkFlair || ""),
              seenAt: now,
            },
          },
        },
      })),
      { ordered: false }
    );
    return res.modifiedCount ?? 0;
  },

  async markRemoved(ids) {
    if (!ids.length) return 0;
    const res = await RedditOpportunityModel.updateMany({ postId: { $in: [...ids] } }, { $set: { removed: true } });
    return res.modifiedCount ?? 0;
  },

  async saveVerdicts(rows, model, now) {
    if (!rows.length) return;
    await RedditOpportunityModel.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { postId: row.post.id },
          update: { $set: { postId: row.post.id, ...verdictFields(row, model, now) }, $setOnInsert: ON_INSERT },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  },

  async openRecommendedIds(since) {
    const rows = await RedditOpportunityModel.find({ ...LIVE_RECOMMENDED, state: "open", createdAt: { $gte: since } })
      .select({ postId: 1, _id: 0 })
      .lean<Array<{ postId: string }>>();
    return rows.map((r) => r.postId);
  },

  async linkCheckQueue(limit) {
    const rows = await RedditOpportunityModel.find({
      ...LIVE_RECOMMENDED,
      state: "open",
      $or: [{ linkCheckedAt: null }, { $expr: { $gt: ["$numComments", "$linkCheckedComments"] } }],
    })
      .sort({ rank: -1 })
      .limit(limit)
      .select({ postId: 1, sub: 1, numComments: 1, _id: 0 })
      .lean<QueuedCheck[]>();
    return rows;
  },

  async markLinkChecked(postId, alreadyLinked, numComments, now) {
    await RedditOpportunityModel.updateOne(
      { postId },
      { $set: { alreadyLinked, linkCheckedComments: numComments, linkCheckedAt: now } }
    );
  },

  async answerCheckQueue(limit, now) {
    const stale = new Date(now.getTime() - ANSWER_RECHECK_DAYS * DAY_MS);
    return RedditOpportunityModel.find({
      state: "answered",
      answerUrl: { $ne: "" },
      $or: [{ answerCheckedAt: null }, { answerCheckedAt: { $lt: stale } }],
    })
      .sort({ stateAt: -1 })
      .limit(limit)
      .select({ postId: 1, answerUrl: 1, _id: 0 })
      .lean<Array<{ postId: string; answerUrl: string }>>();
  },

  async markAnswerChecked(postId, visible, now) {
    await RedditOpportunityModel.updateOne({ postId }, { $set: { answerVisible: visible, answerCheckedAt: now } });
  },

  async rerank(now) {
    type Row = Pick<
      RedditOpportunityDoc,
      "postId" | "confidence" | "createdAt" | "score" | "numComments" | "title" | "sub" | "permalink" | "removed" | "locked"
    >;
    const rows = await RedditOpportunityModel.find({ verdict: "recommend" })
      .select({ postId: 1, confidence: 1, createdAt: 1, score: 1, numComments: 1, title: 1, sub: 1, permalink: 1, removed: 1, locked: 1, _id: 0 })
      .lean<Row[]>();
    if (!rows.length) return 0;
    // Los duplicados se agrupan sólo entre los vivos: si la copia principal se borra, mañana manda
    // la que sigue en pie.
    const live = rows.filter((r) => !r.removed && !r.locked).map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
    const groups = groupDuplicates(live);
    await RedditOpportunityModel.bulkWrite(
      rows.map((r) => {
        const group = groups.get(r.postId) ?? { duplicateOf: "", alsoIn: [] };
        return {
          updateOne: {
            filter: { postId: r.postId },
            update: {
              $set: {
                rank: rankOf({ ...r, createdAt: new Date(r.createdAt) }, now),
                duplicateOf: group.duplicateOf,
                alsoIn: group.alsoIn,
              },
            },
          },
        };
      }),
      { ordered: false }
    );
    return rows.length;
  },

  async prune(before) {
    const res = await RedditOpportunityModel.deleteMany({ createdAt: { $lt: before } });
    return res.deletedCount ?? 0;
  },

  async countPending(since) {
    return RedditOpportunityModel.countDocuments({
      ...LIVE_RECOMMENDED,
      state: "open",
      alreadyLinked: { $ne: true },
      duplicateOf: { $in: ["", null] },
      createdAt: { $gte: since },
    });
  },

  async saveMeta(meta) {
    await RedditOpportunityMetaModel.updateOne(
      { key: REDDIT_OPPS_META_KEY },
      { $set: { ...meta, key: REDDIT_OPPS_META_KEY } },
      { upsert: true }
    );
  },
};

/** Para `--dry-run` sin base: no conoce nada y no escribe nada. */
export const NULL_STORE: OppsStore = {
  knownIds: async () => new Set(),
  refreshLive: async () => 0,
  markRemoved: async () => 0,
  saveVerdicts: async () => undefined,
  openRecommendedIds: async () => [],
  linkCheckQueue: async () => [],
  markLinkChecked: async () => undefined,
  answerCheckQueue: async () => [],
  markAnswerChecked: async () => undefined,
  rerank: async () => 0,
  prune: async () => 0,
  countPending: async () => 0,
  saveMeta: async () => undefined,
};

import { createHash } from "crypto";
import { askPlain, GEMINI_MODEL, geminiConfigured } from "../gemini";
import { ChairCommentAnalysisModel } from "../models/ChairCommentAnalysis";
import { galleryForChair, mediaForChair, offersForChair } from "./offers";
import {
  CHAIR_THEMES,
  type ChairClassification,
  type ChairConfidence,
  type ChairGeneralReview,
  type ChairReviewPoint,
  type ChairSourceComment,
  type ChairTheme,
  type ChairThemeCount,
  type ChairTier,
  type ChairTierItem,
  type ChairTierSnapshot,
} from "./types";

const MAX_ANALYSIS_SOURCES = 5000;
const BATCH_SIZE = 45;
const CLASSIFIER_VERSION = 2;
const LOCAL_CLASSIFIER_MODEL = "local-lexicon-v1";
const THEME_SET = new Set<string>(CHAIR_THEMES);
const GENERIC_NAME_TOKENS = new Set([
  "silla",
  "sillas",
  "chair",
  "escritorio",
  "oficina",
  "ergonomica",
  "ergonomicas",
  "ergonomico",
  "ergonomicos",
  "gamer",
  "modelo",
]);
const REJECTED_NAMES = new Set([
  "la misma",
  "misma",
  "esa",
  "esta",
  "estas",
  "otra",
  "generica",
  "sin marca",
  "ergonomica",
  "ergonomicas",
  "sillon",
  "vigo",
  "herman miller",
]);
const RELEVANCE =
  /\b(silla|sillas|chair|ergon[oó]mic[ao]s?|respaldo|lumbar|apoyabrazos|reposabrazos|asiento|cabecera)\b/i;
const LOCAL_MODELS: Array<{
  name: string;
  brand: string;
  model: string;
  pattern: RegExp;
}> = [
  {
    name: "Herman Miller Aeron",
    brand: "Herman Miller",
    model: "Aeron",
    pattern: /\baeron\b/i,
  },
  {
    name: "Vigo Apolo",
    brand: "Vigo",
    model: "Apolo",
    pattern: /\bapol(?:o|lo)\b/i,
  },
  {
    name: "Vigo 5K",
    brand: "Vigo",
    model: "5K",
    pattern: /\b5k(?:\s+(?:black|grey)(?:\s+edition)?)?\b/i,
  },
  {
    name: "Vigo Atlas",
    brand: "Vigo",
    model: "Atlas",
    pattern: /\batlas\b/i,
  },
];
const POSITIVE_LANGUAGE =
  /\b(recomiend\w*|excelente|tremend[ao]|buen[oa]s?|mejor(?:es)?|c[oó]mod\w*|impecable|[eé]xito|content[oa]|vale la pena|lo vale|durable|resistente|firme|0\s+(?:ruidos?|dolor)|sin (?:problemas?|dolor)|no me arrepiento|como nuev[ao]|0km|se la banca|un viaje de ida)\b/gi;
const NEGATIVE_LANGUAGE =
  /\b(no (?:la |lo )?recomiend\w*|mala compra|porquer[ií]a|p[eé]sim[ao]|inc[oó]mod\w*|me arrepent[ií]|dolores? de (?:espalda|columna)|me (?:da|daba|provoca|provocaba|hace) dolor|se (?:rompe|rompi[oó]|baja)|ruidos?[ao]s?|falla|fallar|floja|est[aá]tica|tirar plata|no vale|car[ií]sim[ao]|destroza|cagada)\b/gi;

const localOnly = (): boolean => process.env.CHAIR_ANALYSIS_LOCAL_ONLY === "1";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function normalizeChairName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(silla|sillas|chair|chairs|modelo)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const slugify = (value: string): string => normalizeChairName(value).replace(/\s+/g, "-");

function nameAppearsInText(name: string, text: string): boolean {
  if (REJECTED_NAMES.has(normalizeChairName(name))) return false;
  const haystack = normalizeChairName(text);
  const tokens = normalizeChairName(name)
    .split(" ")
    .filter((token) => token.length >= 3 && !GENERIC_NAME_TOKENS.has(token));
  return tokens.length > 0 && tokens.some((token) => haystack.includes(token));
}

function canonicalChairKey(classification: ChairClassification): string {
  const combined = normalizeChairName(
    `${classification.brand} ${classification.name} ${classification.model}`
  );
  if (/\baeron\b/.test(combined)) return "herman miller aeron";
  if (/\bvigo\b/.test(combined) && /\b(apolo|apollo)\b/.test(combined)) return "vigo apolo";
  if (/\bvigo\b/.test(combined) && /\b5k\b/.test(combined)) return "vigo 5k";
  if (/\bvigo\b/.test(combined) && /\batlas\b/.test(combined)) return "vigo atlas";
  return normalizeChairName(classification.name);
}

function extractJson(text: string): unknown {
  const array = text.match(/\[[\s\S]*\]/);
  const object = text.match(/\{[\s\S]*\}/);
  const candidate = array?.[0] ?? object?.[0];
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function parseChairClassifications(
  text: string,
  comments: ReadonlyMap<string, ChairSourceComment>
): ChairClassification[] {
  const parsed = extractJson(text);
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as any).results)
      ? (parsed as any).results
      : [];
  const out: ChairClassification[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const commentId = String(row?.commentId ?? "").trim();
    const source = comments.get(commentId);
    if (!source || !Array.isArray(row?.mentions)) continue;

    for (const mention of row.mentions) {
      const name = String(mention?.name ?? "").trim().slice(0, 80);
      if (!name || !nameAppearsInText(name, `${source.postTitle}\n${source.body}`)) continue;
      const key = `${commentId}:${normalizeChairName(name)}`;
      if (!normalizeChairName(name) || seen.has(key)) continue;
      seen.add(key);

      const sentiment = clamp(Number(mention?.sentiment) || 0, -1, 1);
      const themes = Array.isArray(mention?.themes)
        ? [...new Set<string>((mention.themes as unknown[]).map((theme) => String(theme).toLowerCase()))]
            .filter((theme): theme is ChairTheme => THEME_SET.has(theme))
            .slice(0, 4)
        : [];
      out.push({
        commentId,
        name,
        brand: String(mention?.brand ?? "").trim().slice(0, 50),
        model: String(mention?.model ?? "").trim().slice(0, 50),
        sentiment,
        themes,
      });
    }
  }
  return out;
}

function buildPrompt(
  comments: ChairSourceComment[],
  allSources: ReadonlyMap<string, ChairSourceComment>
): string {
  const data = comments.map((comment) => ({
    commentId: comment.commentId,
    sourceType: comment.sourceType,
    postTitle: comment.postTitle,
    parentId: comment.parentId,
    depth: comment.depth,
    parentText: comment.parentId
      ? allSources.get(comment.parentId)?.body.slice(0, 600) ?? ""
      : "",
    text: comment.body.slice(0, 1400),
  }));
  return `Analizá fuentes REALES de r/CharruaDevs sobre sillas de escritorio. Hay posts,
comentarios de primer nivel y respuestas anidadas. Tu tarea es extraer solamente modelos de silla
identificables y clasificar la opinión expresada en cada fuente.

Respondé SOLO JSON válido:
{"results":[{"commentId":"id exacto","mentions":[{"name":"nombre canónico usado en Uruguay","brand":"marca o vacío","model":"modelo o vacío","sentiment":-1.0,"themes":["comfort"]}]}]}

Reglas estrictas:
- No inventes marcas/modelos. "name" debe aparecer de forma reconocible en el comentario.
- Para una respuesta anidada podés resolver "esa", "la mía" u otra referencia solamente cuando el
  postTitle o parentText identifica sin ambigüedad el modelo. En ese caso usá ese modelo canónico.
- No incluyas escritorios, mesas, locales ni sillas genéricas sin nombre.
- Una marca sin modelo (por ejemplo, solo "Vigo" o "Herman Miller") no es una silla identificable.
- sentiment va de -1 (muy negativa) a 1 (muy positiva); 0 si no hay juicio.
- themes solo puede usar: comfort, ergonomics, adjustability, durability, value, support, heat, build.
- Conservá el commentId textual. Omití comentarios sin una silla identificable.
- Un comentario puede mencionar varias sillas.

Fuentes:
${JSON.stringify(data)}`;
}

function countMatches(text: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)].length;
}

function localSentiment(text: string): number {
  const positive = countMatches(text, POSITIVE_LANGUAGE);
  const negative = countMatches(text, NEGATIVE_LANGUAGE);
  if (!positive && !negative) return 0;
  return clamp(((positive - negative) / Math.max(positive + negative, 1)) * 0.85, -0.85, 0.85);
}

function localThemes(text: string): ChairTheme[] {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const themes: ChairTheme[] = [];
  const add = (theme: ChairTheme, pattern: RegExp) => {
    if (pattern.test(normalized)) themes.push(theme);
  };
  add("comfort", /\b(comod|incomod|asiento|acolchon|almohad)/);
  add("ergonomics", /\b(ergonom|postura|jornada|horas? (?:sentad|por dia))/);
  add("adjustability", /\b(ajust|regul|reclin|inclin|apoyabraz|reposabraz|cabecera)/);
  add("durability", /\b(dur|anos|romp|falla|cilindro|ruido|nueva|0km|se la banca)/);
  add("value", /\b(precio|car[oa]|barat|plata|vale|inversion|calidad.?precio|usd|\$)/);
  add("support", /\b(espalda|lumbar|columna|cuello|disco)/);
  add("heat", /\b(calor|transpir|malla|ventil|cuerina)/);
  add("build", /\b(calidad|firme|plastico|ruido|cilindro|tela|material|garantia)/);
  return themes.slice(0, 4);
}

/**
 * Conservative, quota-independent extraction for models with verified Uruguay offers. Generic
 * brand mentions never become a chair. A reply only inherits a parent's model when the reply
 * itself contains evaluative language.
 */
export function classifyChairCommentsLocally(
  comments: ChairSourceComment[]
): ChairClassification[] {
  const sourceById = new Map(comments.map((source) => [source.commentId, source]));
  const out: ChairClassification[] = [];

  for (const source of comments) {
    const parent = source.parentId ? sourceById.get(source.parentId) : undefined;
    const directText =
      source.sourceType === "post" ? `${source.postTitle}\n${source.body}` : source.body;
    const contextualText = `${source.postTitle}\n${directText}\n${parent?.body ?? ""}`;
    const hasOpinion =
      countMatches(source.body, POSITIVE_LANGUAGE) + countMatches(source.body, NEGATIVE_LANGUAGE) >
      0;

    for (const chair of LOCAL_MODELS) {
      const direct = chair.pattern.test(directText);
      const inherited =
        !direct &&
        source.depth > 0 &&
        Boolean(parent) &&
        chair.pattern.test(parent!.body) &&
        hasOpinion;
      if (!direct && !inherited) continue;

      // "Atlas" is also sold by other Uruguayan stores. Only assign the Vigo product when the
      // source or its parent explicitly places the model in a Vigo conversation.
      if (
        chair.model === "Atlas" &&
        !/\bvigo\b/i.test(contextualText) &&
        !/\bworldvigo\b/i.test(contextualText)
      ) {
        continue;
      }
      out.push({
        commentId: source.commentId,
        name: chair.name,
        brand: chair.brand,
        model: chair.model,
        sentiment: localSentiment(source.body),
        themes: localThemes(source.body),
      });
    }
  }
  return out;
}

export async function classifyChairComments(
  comments: ChairSourceComment[]
): Promise<ChairClassification[]> {
  const sourceById = new Map(comments.map((comment) => [comment.commentId, comment]));
  const candidates = comments
    .filter(
      (comment) =>
        comment.body.length >= 15 &&
        (RELEVANCE.test(`${comment.postTitle}\n${comment.body}`) ||
          Boolean(comment.parentId))
    )
    .sort(
      (a, b) =>
        a.postId.localeCompare(b.postId) ||
        a.depth - b.depth ||
        a.createdUtc - b.createdUtc
    )
    .slice(0, MAX_ANALYSIS_SOURCES);
  const out: ChairClassification[] = classifyChairCommentsLocally(candidates);
  if (!geminiConfigured() || localOnly()) return out;
  const fingerprints = new Map<string, string>(
    candidates.map((source): [string, string] => {
      const parentText = source.parentId ? sourceById.get(source.parentId)?.body ?? "" : "";
      return [
        source.commentId,
        createHash("sha1")
          .update(
            [
              CLASSIFIER_VERSION,
              source.sourceType,
              source.postTitle,
              parentText,
              source.body,
            ].join("\n")
          )
          .digest("hex"),
      ];
    })
  );
  const cached = await ChairCommentAnalysisModel.find({
    sourceId: { $in: candidates.map((source) => source.commentId) },
    classifierVersion: CLASSIFIER_VERSION,
  }).lean();
  const cachedById = new Map(cached.map((row) => [row.sourceId, row]));
  const missing = candidates.filter((source) => {
    const row = cachedById.get(source.commentId);
    if (!row || row.sourceFingerprint !== fingerprints.get(source.commentId)) return true;
    out.push(...row.classifications);
    return false;
  });

  for (let start = 0; start < missing.length; start += BATCH_SIZE) {
    const batch = missing.slice(start, start + BATCH_SIZE);
    const reply = await askPlain(buildPrompt(batch, sourceById), 60_000);
    if (!reply) continue;
    const sources = new Map(batch.map((comment) => [comment.commentId, comment]));
    const parsed = parseChairClassifications(reply, sources);
    out.push(...parsed);
    const parsedById = new Map<string, ChairClassification[]>();
    for (const classification of parsed) {
      const rows = parsedById.get(classification.commentId) ?? [];
      rows.push(classification);
      parsedById.set(classification.commentId, rows);
    }
    await ChairCommentAnalysisModel.bulkWrite(
      batch.map((source) => ({
        updateOne: {
          filter: {
            sourceId: source.commentId,
            classifierVersion: CLASSIFIER_VERSION,
          },
          update: {
            $set: {
              sourceFingerprint: fingerprints.get(source.commentId),
              classifierModel: GEMINI_MODEL,
              classifications: parsedById.get(source.commentId) ?? [],
              analyzedAt: new Date(),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }
  return out;
}

const authorKey = (author: string): string => author.trim().toLowerCase() || "[deleted]";

function confidenceFor(count: number): ChairConfidence {
  if (count >= 8) return "high";
  if (count >= 4) return "medium";
  return "low";
}

function tierFor(score: number, count: number): ChairTier | null {
  if (count < 3) return null;
  if (score >= 82 && count >= 6) return "S";
  if (score >= 70) return "A";
  if (score >= 56) return "B";
  if (score >= 42) return "C";
  return "D";
}

function recencyWeight(createdUtc: number, nowMs: number): number {
  const ageDays = Math.max(0, nowMs / 1000 - createdUtc) / 86_400;
  return 0.4 + 0.6 * Math.exp(-ageDays / 730);
}

function voteWeight(score: number): number {
  return 1 + Math.log2(Math.max(0, score) + 1);
}

function summaryFor(item: {
  score: number;
  themes: ChairThemeCount[];
  positive: number;
  negative: number;
}): string {
  const leading = item.themes.slice(0, 2).map((theme) => theme.id);
  const themeLabels: Record<ChairTheme, string> = {
    comfort: "comodidad",
    ergonomics: "ergonomía",
    adjustability: "ajustes",
    durability: "durabilidad",
    value: "relación precio-calidad",
    support: "soporte lumbar",
    heat: "ventilación",
    build: "calidad de construcción",
  };
  const focus = leading.length ? leading.map((theme) => themeLabels[theme]).join(" y ") : "uso diario";
  if (item.positive > item.negative * 2) {
    return `Consenso mayormente favorable, concentrado en ${focus}.`;
  }
  if (item.negative > item.positive) {
    return `Las críticas superan a los elogios, sobre todo al hablar de ${focus}.`;
  }
  return `Opiniones divididas; la conversación se concentra en ${focus}.`;
}

const THEME_LABELS: Record<ChairTheme, string> = {
  comfort: "comodidad",
  ergonomics: "ergonomía",
  adjustability: "capacidad de ajuste",
  durability: "durabilidad",
  value: "relación precio-calidad",
  support: "soporte lumbar",
  heat: "ventilación",
  build: "calidad de construcción",
};

function fallbackGeneralReview(item: ChairTierItem): ChairGeneralReview {
  const points = (
    polarity: "positive" | "negative",
    compare: (theme: ChairThemeCount) => boolean
  ): ChairReviewPoint[] =>
    item.themes
      .filter(compare)
      .slice(0, 4)
      .map((theme) => ({
        text:
          polarity === "positive"
            ? `${theme.positive === 1 ? "Un usuario destaca" : `${theme.positive} fuentes destacan`} ${THEME_LABELS[theme.id]}.`
            : `${theme.negative === 1 ? "Un usuario cuestiona" : `${theme.negative} fuentes cuestionan`} ${THEME_LABELS[theme.id]}.`,
        sourceIds: item.evidence
          .filter(
            (source) =>
              source.themes.includes(theme.id) &&
              (polarity === "positive" ? source.sentiment >= 0.2 : source.sentiment <= -0.2)
          )
          .map((source) => source.commentId),
      }))
      .filter((point) => point.sourceIds.length > 0);

  return {
    verdict: item.summary,
    pros: points("positive", (theme) => theme.positive > theme.negative),
    cons: points("negative", (theme) => theme.negative > 0),
  };
}

function parseGeneralReviews(text: string, items: ChairTierItem[]): Map<string, ChairGeneralReview> {
  const parsed = extractJson(text);
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as any).reviews)
      ? (parsed as any).reviews
      : [];
  const itemBySlug = new Map(items.map((item) => [item.slug, item]));
  const out = new Map<string, ChairGeneralReview>();

  for (const row of rows) {
    const slug = String(row?.slug ?? "").trim();
    const item = itemBySlug.get(slug);
    if (!item) continue;
    const allowedIds = new Set(item.evidence.map((source) => source.commentId));
    const parsePoints = (value: unknown): ChairReviewPoint[] =>
      (Array.isArray(value) ? value : [])
        .map((point) => ({
          text: String(point?.text ?? "").trim().slice(0, 260),
          sourceIds: Array.isArray(point?.sourceIds)
            ? [...new Set<string>(point.sourceIds.map((id: unknown) => String(id)))].filter((id) =>
                allowedIds.has(id)
              )
            : [],
        }))
        .filter((point) => point.text.length >= 12 && point.sourceIds.length > 0)
        .slice(0, 5);
    const verdict = String(row?.verdict ?? "").trim().slice(0, 520);
    if (!verdict) continue;
    out.set(slug, {
      verdict,
      pros: parsePoints(row?.pros),
      cons: parsePoints(row?.cons),
    });
  }
  return out;
}

async function synthesizeGeneralReviews(items: ChairTierItem[]): Promise<void> {
  if (!items.length || !geminiConfigured() || localOnly()) return;
  const payload = items.map((item) => ({
    slug: item.slug,
    name: item.name,
    positive: item.positive,
    neutral: item.neutral,
    negative: item.negative,
    sources: item.evidence.map((source) => ({
      sourceId: source.commentId,
      type: source.sourceType,
      postTitle: source.postTitle,
      depth: source.depth,
      sentiment: source.sentiment,
      themes: source.themes,
      text: source.body.slice(0, 900),
    })),
  }));
  const prompt = `Redactá una reseña general breve, pros y contras para cada silla usando ÚNICAMENTE
las fuentes reales de r/CharruaDevs incluidas abajo. No agregues características técnicas ni
supongas precios. Diferenciá consenso de anécdota y mencioná cuando la muestra sea chica.

Respondé SOLO JSON válido:
{"reviews":[{"slug":"slug exacto","verdict":"2 o 3 frases","pros":[{"text":"hallazgo concreto","sourceIds":["id"]}],"cons":[{"text":"hallazgo concreto","sourceIds":["id"]}]}]}

Reglas:
- Cada pro y contra debe tener al menos un sourceId exacto que lo sostenga.
- No conviertas ausencia de críticas en una ventaja.
- Si no hay contras repetidos, devolvé cons vacío.
- No cites ni reveles nombres de usuario.
- Español uruguayo natural, sobrio y sin lenguaje publicitario.

Datos:
${JSON.stringify(payload)}`;
  const reply = await askPlain(prompt, 90_000);
  if (!reply) return;
  const reviews = parseGeneralReviews(reply, items);
  for (const item of items) {
    const review = reviews.get(item.slug);
    if (review) {
      item.generalReview = {
        verdict: review.verdict,
        pros: review.pros.length ? review.pros : item.generalReview.pros,
        cons: review.cons.length ? review.cons : item.generalReview.cons,
      };
    }
  }
}

export function aggregateChairTiers(
  comments: ChairSourceComment[],
  classifications: ChairClassification[],
  now = new Date()
): { tiers: ChairTierItem[]; watchlist: ChairTierItem[]; analyzed: number } {
  const sourceById = new Map(comments.map((comment) => [comment.commentId, comment]));
  const groups = new Map<
    string,
    {
      names: Map<string, number>;
      brands: Map<string, number>;
      models: Map<string, number>;
      rows: Array<{ source: ChairSourceComment; classification: ChairClassification }>;
    }
  >();

  for (const classification of classifications) {
    const source = sourceById.get(classification.commentId);
    if (!source) continue;
    const key = canonicalChairKey(classification);
    if (!key) continue;
    const group = groups.get(key) ?? {
      names: new Map<string, number>(),
      brands: new Map<string, number>(),
      models: new Map<string, number>(),
      rows: [],
    };
    group.names.set(classification.name, (group.names.get(classification.name) ?? 0) + 1);
    if (classification.brand) {
      group.brands.set(classification.brand, (group.brands.get(classification.brand) ?? 0) + 1);
    }
    if (classification.model) {
      group.models.set(classification.model, (group.models.get(classification.model) ?? 0) + 1);
    }
    group.rows.push({ source, classification });
    groups.set(key, group);
  }

  const mostCommon = (values: Map<string, number>): string =>
    [...values.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "";
  const items: ChairTierItem[] = [];

  for (const group of groups.values()) {
    const uniqueRows = new Map<string, (typeof group.rows)[number]>();
    for (const row of group.rows) {
      const previous = uniqueRows.get(row.source.commentId);
      if (!previous || Math.abs(row.classification.sentiment) > Math.abs(previous.classification.sentiment)) {
        uniqueRows.set(row.source.commentId, row);
      }
    }
    const rows = [...uniqueRows.values()];
    if (!rows.length) continue;

    let weighted = 0;
    let totalWeight = 0;
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    const themeMap = new Map<ChairTheme, ChairThemeCount>();

    for (const { source, classification } of rows) {
      const weight = voteWeight(source.score) * recencyWeight(source.createdUtc, now.getTime());
      weighted += classification.sentiment * weight;
      totalWeight += weight;
      if (classification.sentiment >= 0.2) positive++;
      else if (classification.sentiment <= -0.2) negative++;
      else neutral++;
      for (const theme of classification.themes) {
        const current = themeMap.get(theme) ?? { id: theme, mentions: 0, positive: 0, negative: 0 };
        current.mentions++;
        if (classification.sentiment >= 0.2) current.positive++;
        if (classification.sentiment <= -0.2) current.negative++;
        themeMap.set(theme, current);
      }
    }

    const score = Math.round(clamp(50 + (totalWeight ? weighted / totalWeight : 0) * 40, 0, 100));
    const canonicalNames: Record<string, string> = {
      "herman miller aeron": "Herman Miller Aeron",
      "vigo apolo": "Vigo Apolo",
      "vigo 5k": "Vigo 5K",
      "vigo atlas": "Vigo Atlas",
    };
    const groupKey = canonicalChairKey(group.rows[0].classification);
    const name = canonicalNames[groupKey] ?? mostCommon(group.names);
    const themes = [...themeMap.values()].sort(
      (a, b) => b.mentions - a.mentions || b.positive - b.negative - (a.positive - a.negative)
    );
    const evidence = rows
      .sort(
        (a, b) =>
          a.source.postTitle.localeCompare(b.source.postTitle) ||
          a.source.depth - b.source.depth ||
          a.source.createdUtc - b.source.createdUtc
      )
      .map(({ source, classification }) => ({
        commentId: source.commentId,
        postId: source.postId,
        sourceType: source.sourceType,
        parentId: source.parentId,
        depth: source.depth,
        postTitle: source.postTitle,
        author: source.author,
        body: source.body,
        excerpt:
          source.body.length > 260 ? `${source.body.slice(0, 257).trimEnd()}…` : source.body,
        sentiment: classification.sentiment,
        themes: classification.themes,
        score: source.score,
        date: source.date,
        permalink: source.permalink,
      }));
    const itemBase = { score, themes, positive, negative };
    const slug = slugify(name);
    const item: ChairTierItem = {
      slug,
      name,
      brand: mostCommon(group.brands),
      model: mostCommon(group.models),
      tier: tierFor(score, rows.length),
      score,
      confidence: confidenceFor(rows.length),
      sources: rows.length,
      posts: rows.filter(({ source }) => source.sourceType === "post").length,
      comments: rows.filter(({ source }) => source.sourceType === "comment").length,
      replies: rows.filter(({ source }) => source.sourceType === "comment" && source.depth > 0)
        .length,
      uniqueAuthors: new Set(rows.map(({ source }) => authorKey(source.author))).size,
      positive,
      neutral,
      negative,
      themes,
      summary: summaryFor(itemBase),
      generalReview: {
        verdict: "",
        pros: [],
        cons: [],
      },
      evidence,
      offers: offersForChair(slug),
      image: mediaForChair(slug),
      gallery: galleryForChair(slug),
    };
    item.generalReview = fallbackGeneralReview(item);
    items.push(item);
  }

  const ranked = items
    .filter((item) => item.tier)
    .sort((a, b) => {
      const order: Record<ChairTier, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
      return order[a.tier!] - order[b.tier!] || b.score - a.score || b.sources - a.sources;
    });
  const watchlist = items
    .filter((item) => !item.tier)
    .sort((a, b) => b.sources - a.sources || b.score - a.score);
  return {
    tiers: ranked,
    watchlist,
    analyzed: new Set(classifications.map((row) => row.commentId)).size,
  };
}

export async function buildChairTierSnapshot(
  comments: ChairSourceComment[],
  threads: number
): Promise<ChairTierSnapshot | null> {
  if (!comments.length) return null;
  const classifications = await classifyChairComments(comments);
  if (!classifications.length) return null;
  const aggregated = aggregateChairTiers(comments, classifications);
  if (!aggregated.tiers.length && !aggregated.watchlist.length) return null;
  await synthesizeGeneralReviews(aggregated.tiers);

  return {
    key: "charruadevs-desktop-chairs",
    asOf: new Date().toISOString(),
    subreddit: "CharruaDevs",
    queries: [],
    classifierModel:
      geminiConfigured() && !localOnly()
        ? `${GEMINI_MODEL}+${LOCAL_CLASSIFIER_MODEL}`
        : LOCAL_CLASSIFIER_MODEL,
    methodologyVersion: 2,
    corpus: {
      threads,
      comments: comments.filter((source) => source.sourceType === "comment").length,
      analyzed: aggregated.analyzed,
      uniqueAuthors: new Set(comments.map((comment) => authorKey(comment.author))).size,
    },
    tiers: aggregated.tiers,
    watchlist: aggregated.watchlist,
  };
}

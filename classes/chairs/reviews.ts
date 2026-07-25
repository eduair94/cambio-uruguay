// Pros, cons and the one-paragraph verdict on each chair page.
//
// Two rules keep this honest:
//   1. Every pro and every con must point at a real quote we can link to. No sourceIds, no bullet.
//   2. A chair nobody has reviewed gets no opinion at all — it gets a factual line built from the
//      offers we found. "Sin reseñas suficientes" is a valid answer; inventing a verdict is not.
import { createHash } from "crypto";
import { askPlain, geminiConfigured } from "../gemini";
import type { ChairCatalogProduct, ChairReviewPoint, ChairTierItem } from "./types";

const MAX_AI_PRODUCTS = Number(process.env.CHAIR_REVIEW_LIMIT || 40);

const money = (value: number): string => `$ ${value.toLocaleString("es-UY")}`;

/** A verdict that states what we measured, for chairs with no review evidence. */
export function factualVerdict(product: ChairCatalogProduct): string {
  const parts: string[] = [];
  if (product.price) {
    const sellers = product.sellers === 1 ? "1 vendedor" : `${product.sellers} vendedores`;
    parts.push(
      product.price.min === product.price.max
        ? `Se consigue a ${money(product.price.min)} en ${sellers}.`
        : `Se consigue entre ${money(product.price.min)} y ${money(product.price.max)} según el vendedor (${sellers}).`
    );
  }
  if (product.specs.length) {
    parts.push(`Ficha declarada por los vendedores: ${product.specs.slice(0, 3).map((spec) => `${spec.label.toLowerCase()} ${spec.value.toLowerCase()}`).join(", ")}.`);
  }
  // The closing line has to match the rating actually shown beside it. A chair with 26.000
  // marketplace reviews is rated — what it lacks is written opinion we can quote and attribute.
  if (product.stars === null) {
    parts.push("Todavía no hay reseñas suficientes para calificarla.");
  } else {
    parts.push(
      `Calificada ${product.stars.toFixed(1)} sobre 5 con ${product.ratingCount.toLocaleString("es-UY")} opiniones, ` +
        "pero sin reseñas escritas que podamos citar para separar pros y contras."
    );
  }
  return parts.join(" ");
}

const fingerprintOf = (product: ChairCatalogProduct): string =>
  createHash("sha1")
    .update(
      [
        product.slug,
        product.evidence.map((source) => source.commentId).join(","),
        product.reviews.map((review) => review.sourceUrl).join(","),
      ].join("|")
    )
    .digest("hex");

function parseReviews(text: string, products: ChairCatalogProduct[]): Map<string, { verdict: string; pros: ChairReviewPoint[]; cons: ChairReviewPoint[] }> {
  const match = text.match(/\{[\s\S]*\}/);
  const out = new Map<string, { verdict: string; pros: ChairReviewPoint[]; cons: ChairReviewPoint[] }>();
  if (!match) return out;
  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return out;
  }
  const rows = Array.isArray(parsed?.reviews) ? parsed.reviews : [];
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  for (const row of rows) {
    const slug = String(row?.slug ?? "").trim();
    const product = bySlug.get(slug);
    if (!product) continue;
    const allowed = new Set([
      ...product.evidence.map((source) => source.commentId),
      ...product.reviews.map((review) => review.sourceUrl),
    ]);
    const points = (value: unknown): ChairReviewPoint[] =>
      (Array.isArray(value) ? value : [])
        .map((point: any) => ({
          text: String(point?.text ?? "").trim().slice(0, 240),
          sourceIds: (Array.isArray(point?.sourceIds) ? point.sourceIds : [])
            .map((id: unknown) => String(id))
            .filter((id: string) => allowed.has(id)),
        }))
        .filter((point) => point.text.length >= 12 && point.sourceIds.length > 0)
        .slice(0, 5);
    const verdict = String(row?.verdict ?? "").trim().slice(0, 460);
    if (!verdict) continue;
    out.set(slug, { verdict, pros: points(row?.pros), cons: points(row?.cons) });
  }
  return out;
}

function buildPrompt(products: ChairCatalogProduct[]): string {
  const payload = products.map((product) => ({
    slug: product.slug,
    name: product.name,
    priceRange: product.price ? `${product.price.min}-${product.price.max} UYU` : "sin precio",
    sources: [
      ...product.evidence.map((source) => ({
        sourceId: source.commentId,
        origin: "r/CharruaDevs",
        sentiment: source.sentiment,
        themes: source.themes,
        text: source.body.slice(0, 700),
      })),
      ...product.reviews.map((review) => ({
        sourceId: review.sourceUrl,
        origin: review.source,
        sentiment: null,
        themes: [],
        text: review.text.slice(0, 700),
      })),
    ].slice(0, 24),
  }));

  return `Redactá para cada silla una conclusión breve, pros y contras, usando ÚNICAMENTE las fuentes
reales incluidas abajo (comentarios de Reddit uruguayo e internacional). No inventes especificaciones,
no supongas precios y no conviertas la ausencia de críticas en una ventaja.

Respondé SOLO JSON válido:
{"reviews":[{"slug":"slug exacto","verdict":"2 o 3 frases","pros":[{"text":"hallazgo concreto","sourceIds":["id"]}],"cons":[{"text":"hallazgo concreto","sourceIds":["id"]}]}]}

Reglas:
- Cada pro y cada contra necesita al menos un sourceId EXACTO de la lista de esa silla.
- Si la muestra es chica, decilo en el verdict en lugar de exagerar.
- Traducí al español las fuentes en inglés, sin citar nombres de usuario.
- Español uruguayo sobrio, sin lenguaje publicitario.
- Si una silla no tiene evidencia suficiente, omitila del arreglo.

Sillas:
${JSON.stringify(payload)}`;
}

/**
 * Fills `verdict`, `pros` and `cons`.
 *
 * Chairs already covered by the r/CharruaDevs tier list reuse the review the tier job wrote — it is
 * the same evidence, already attributed, and re-generating it would spend tokens to say the same
 * thing. Everything else goes to Gemini in batches, and only when its evidence changed.
 */
export async function synthesizeChairReviews(
  products: ChairCatalogProduct[],
  tiers: readonly ChairTierItem[],
  previousFingerprints: Map<string, { fingerprint: string; verdict: string; pros: ChairReviewPoint[]; cons: ChairReviewPoint[] }>
): Promise<number> {
  const tierBySlug = new Map(tiers.map((item) => [item.slug, item]));
  const pending: ChairCatalogProduct[] = [];

  for (const product of products) {
    const tierItem = product.redditSlug ? tierBySlug.get(product.redditSlug) : undefined;
    if (tierItem?.generalReview?.verdict) {
      product.verdict = tierItem.generalReview.verdict;
      product.pros = tierItem.generalReview.pros;
      product.cons = tierItem.generalReview.cons;
      continue;
    }

    const cached = previousFingerprints.get(product.slug);
    const fingerprint = fingerprintOf(product);
    if (cached && cached.fingerprint === fingerprint && cached.verdict) {
      product.verdict = cached.verdict;
      product.pros = cached.pros;
      product.cons = cached.cons;
      continue;
    }

    const evidenceCount = product.evidence.length + product.reviews.length;
    if (evidenceCount >= 2) pending.push(product);
    else product.verdict = factualVerdict(product);
  }

  if (!pending.length || !geminiConfigured() || process.env.CHAIR_ANALYSIS_LOCAL_ONLY === "1") {
    for (const product of pending) if (!product.verdict) product.verdict = factualVerdict(product);
    return 0;
  }

  let written = 0;
  const batchSize = 6;
  const queue = pending.slice(0, MAX_AI_PRODUCTS);
  for (let start = 0; start < queue.length; start += batchSize) {
    const batch = queue.slice(start, start + batchSize);
    const reply = await askPlain(buildPrompt(batch), 90_000);
    const reviews = reply ? parseReviews(reply, batch) : new Map();
    for (const product of batch) {
      const review = reviews.get(product.slug);
      if (review) {
        product.verdict = review.verdict;
        product.pros = review.pros;
        product.cons = review.cons;
        written++;
      } else if (!product.verdict) {
        product.verdict = factualVerdict(product);
      }
    }
  }
  for (const product of pending) if (!product.verdict) product.verdict = factualVerdict(product);
  return written;
}

export const chairReviewFingerprint = fingerprintOf;

// Pure logic for the automated review-refresh pipeline behind /casas-de-cambio.
// The nitro task (server/tasks/casas/refreshReviews.ts) fetches from the
// Google Places proxy / Trustpilot scraper APIs; everything testable lives here.

/** A review datum as fetched from the Places proxy on one refresh run. */
export interface FetchedReview {
  placeId: string | null
  name: string | null
  rating: number
  count: number
  /** Canonical Google Maps URL when the details endpoint provides it. */
  url: string | null
}

/** What the store persists per casa (mirrors courierRatesStore's StoredRate). */
export interface StoredCasaReview {
  rating: number
  count: number
  placeId: string | null
  name: string | null
  url: string | null
  checkedAt: string
}

/** Trustpilot snapshot for the few casas that have a Trustpilot page. */
export interface StoredTrustpilot {
  score: number
  count: number
  url: string
  checkedAt: string
}

/**
 * Golden rule (same as the courier store): only overwrite with a fresh,
 * plausible result. Implausible fetches keep the previous good value, so the
 * public page degrades to "stale but correct".
 *
 * - rating must be a real 1–5 star value with at least one review;
 * - vs a previous value, a review-count collapse (<40%) or a rating jump of
 *   more than 1.5 stars almost certainly means the query resolved to a
 *   different listing — reject it.
 */
export function shouldAcceptReview(prev: StoredCasaReview | null, next: FetchedReview): boolean {
  if (!(next.rating >= 1 && next.rating <= 5)) return false
  if (!(next.count >= 1)) return false
  if (prev) {
    if (next.count < prev.count * 0.4) return false
    if (Math.abs(next.rating - prev.rating) > 1.5) return false
  }
  return true
}

interface PlaceLike {
  place_id?: unknown
  name?: unknown
  rating?: unknown
  user_ratings_total?: unknown
  url?: unknown
}

function toFetched(p: PlaceLike): FetchedReview | null {
  if (typeof p.rating !== 'number' || typeof p.user_ratings_total !== 'number') return null
  return {
    placeId: typeof p.place_id === 'string' ? p.place_id : null,
    name: typeof p.name === 'string' ? p.name : null,
    rating: p.rating,
    count: p.user_ratings_total,
    url: typeof p.url === 'string' ? p.url : null,
  }
}

/** Parse a Places "Place Details" payload. */
export function parsePlaceDetails(json: unknown): FetchedReview | null {
  const j = json as { status?: string; result?: PlaceLike } | null
  if (!j || j.status !== 'OK' || !j.result) return null
  return toFetched(j.result)
}

/**
 * Parse the Trustpilot `/trustpilot/feedbacks` payload → {score,count}. The
 * scraper nests the numbers under `businessUnit` ({ trustScore, numberOfReviews }),
 * so read there first; a flat shape is tolerated as a fallback. Returns null if
 * the score isn't a plausible 1–5 with at least one review.
 */
export function parseTrustpilotFeedbacks(json: unknown): { score: number; count: number } | null {
  const root = (json ?? {}) as Record<string, unknown>
  const bu = (root.businessUnit ?? {}) as Record<string, unknown>
  const num = (...vals: unknown[]): number | undefined =>
    vals.find(v => typeof v === 'number') as number | undefined
  const score = num(bu.trustScore, bu.score, root.trustScore, root.score)
  const count = num(
    bu.numberOfReviews,
    bu.total,
    root.numberOfReviews,
    root.total,
    root.reviewsCount
  )
  if (score == null || count == null) return null
  if (!(score >= 1 && score <= 5) || !(count >= 1)) return null
  return { score, count }
}

/**
 * Pinned Google Maps place_id for each casa's flagship listing — the
 * most-reviewed listing found and verified live during the 2026-07-04
 * research sweep. Pinned (not text-searched) so the weekly refresh reads the
 * SAME listing every time via Place Details, immune to a query resolving to a
 * co-branded/nearby business. Casas whose only Google match was a different or
 * co-branded business (e.g. Cambio Argentino / Rynder both resolve to Cambio
 * 18's listing) are deliberately absent — they stay 'sin datos' rather than
 * show a wrong rating. Re-capture with a Find Place sweep if a listing moves.
 */
export const CASAS_PLACE_IDS: Record<string, string> = {
  gales: 'ChIJAdv_XBmBn5URwc7y91u2H9E', // GALES Servicios Financieros (4★/47)
  indumex: 'ChIJzZ5zxlOAn5UR2wbtzF23KXo', // Cambio Indumex (2.5★/34)
  varlix: 'ChIJU_do4XeBn5UR4hH0rQpvH6o', // Redpagos Cambio Varlix (3.9★/149)
  cambilex: 'ChIJhUFS8H5_n5URzH45fXH71yg', // Cambilex (2.2★/20)
  cambio18: 'ChIJYY_wFbWBn5URg2p4T_kR1yM', // Redpagos Cambio 18 (3.2★/50)
  brou: 'ChIJKWwTpIZ_n5UR3DdPvGtYUzw', // Banco República (4★/184)
  itau: 'ChIJK4OdTTYFdZURS7euQeM4t94', // ITAU BANK Roosevelt (3.7★/111)
  cambio_sir: 'ChIJP_SDxELVoZURzEgjif16tqk', // Redpagos Cambio Sir (4.1★/299)
  fortex: 'ChIJ5Vfg2rKBn5URhzAYGl0ycmg', // Fortex (3.6★/75)
  matriz: 'ChIJQUXERHKBn5URrYbyRr8PMww', // Redpagos Cambio Matríz (3★/31)
  suizo: 'ChIJ7_zKMc2Bn5URRxfJE3BFoZw', // Cambio Suizo - Surport S.A. (4.9★/120)
  cambio_misiones: 'ChIJTUqsKIF_n5UR7K2XQT5mNio', // Cambio Misiones (4.5★/17)
  cambio_obelisco: 'ChIJfT-BsLKBn5URHvbIth48raY', // Redpagos Cambio Obelisco (2★/42)
  cambio_pernas: 'ChIJ-emdCnGBn5URsb3xsRqSfX0', // Cambio Pernas (4.1★/44)
  cambio_ingles: 'ChIJyXsmQlaAn5UR2r5o1-PMxI8', // Cambio Ingles (2★/9)
  cambio_regul: 'ChIJG5QTrO6An5UR6Sne2qVCyak', // Cambio Regul (4.2★/220)
  alter_cambio: 'ChIJ0avl_IB_n5URZrw2YrWKQtU', // Altercambio (4.2★/10)
  cambio_sicurezza: 'ChIJoSVuIj_VoZUROtNDpcauWnQ', // Cambio Sicurezza (4★/1)
  la_favorita: 'ChIJG15_5sqBn5URlX9lEv8DnoE', // La Favorita SF - Casa Central (3.5★/31)
  cambio_romantico: 'ChIJDdY0qKPUoZURczp_tY7fAo4', // Cambio Romántico (4.4★/15)
  cambio_federal: 'ChIJfWLEc7b1n5URGmr0NYHFc20', // Cambio Federal (3.4★/7)
  cambio_pando: 'ChIJKWra0pgmoJURcZR7kK_rPdc', // Cambio Pando (5★/4)
  tradelix: 'ChIJP3krZxCJn5URVUJzW3DCAGg', // Redpagos Ciudad de la Costa Casa Cambiaria (4★/46)
  cambio_aguerrebere: 'ChIJD9_942ISo5URnmIwRdQ2jwk', // Cambio Aguerrebere (4.7★/70)
  cambio_minas: 'ChIJhejlOC-6CpURcHPCKFNT5ao', // Abitab y Cambio Minas (4.4★/170)
  cambio_maiorano: 'ChIJHc45yoIadZURVvnJwmFAn-s', // Cambio Maiorano (4.5★/13)
  aeromar: 'ChIJX7EYNG0FdZURv3fDIWxCNcI', // Cambio Aeromar (3.3★/16)
  cambio_principal: 'ChIJcatk0Pf-qZUR4kz9A4RjYi8', // Cambio Principal (4.7★/47)
  cambial: 'ChIJfWtNwPf-qZURcZz-QvxKx1A', // Cambio Cambial (4.7★/6)
  cambio_fenix: 'ChIJR7bM_LH_qZURjkN67FUGgjY', // Cambio Fenix (4.9★/145)
  cambio_young: 'ChIJS5XdDJ5_r5UR3sZRGaQGrjg', // Redpagos Young en Cambio (3.4★/7)
  cambio_3: 'ChIJZWZ9nWDeDJURLyXqsxaM-Xo', // Cambio 3 (4.6★/20)
  cambio_oriental: 'ChIJAT93DtP_qZURUvaC5f4cm68', // CAMBIO ORIENTAL - RIVERA (4.5★/8)
}

/** Casas with a real Trustpilot page (score refreshed alongside Google). */
export const CASAS_TRUSTPILOT_DOMAINS: Record<string, string> = {
  prex: 'prexcard.com',
}

// A qué avisos se les miran las fotos, y en qué orden.
//
// Sólo los portales con galería de verdad: InfoCasas, Casasweb, El País y Mercado Libre (medido el
// 2026-11-23: 48 de 48 avisos de InfoCasas con ≥ 5 fotos; ML trae 5). Facebook, TikTok e Instagram
// quedan afuera por diseño: una sola foto de 260 px cuya URL vence en días, y los términos de Meta.
//
// Un sujeto es un AVISO, no una propiedad: las fotos son de un anunciante, y lo que muestran se
// atribuye a ese aviso. Nunca se mezclan las galerías de dos avisos de la misma vivienda.
import { createHash } from "crypto";

export type PhotoVertical = "alquiler" | "venta";

export const RENTAL_PHOTO_SOURCES: ReadonlySet<string> = new Set(["infocasas", "casasweb", "elpais", "mercadolibre"]);
export const SALE_PHOTO_SOURCES: ReadonlySet<string> = new Set(["infocasas", "casasweb"]);
/** Con menos, no hay galería que mirar: la portada sola no muestra ambientes. */
export const MIN_GALLERY = 3;
/** Una oferta que no se vio en estos días ya no está en el directorio (app/utils/rentals.ts). */
export const OFFER_STALE_DAYS = 10;

/**
 * El corte como FECHA (AAAA-MM-DD), no como instante: `lastSeen` se guarda a veces como fecha sola y
 * a veces como ISO completo, y una fecha compara bien contra los dos ("2026-11-13" ≤ "2026-11-13" y
 * ≤ "2026-11-13T09:00…"). Un corte ISO dejaba afuera el día entero del borde.
 */
export const staleCutoff = (now: Date): string => new Date(now.getTime() - OFFER_STALE_DAYS * 86_400_000).toISOString().slice(0, 10);

export interface PhotoSubject {
  /** `<vertical>:<listingId>`: el _id del documento en `photofacts`. */
  id: string;
  vertical: PhotoVertical;
  listingId: string;
  propertyKey: string;
  source: string;
  /** Quién publica, para contar fotos repetidas entre anunciantes distintos. Nunca une avisos. */
  advertiser: string;
  department: string;
  /** YYYY-MM-DD o ISO: lo más nuevo se mira primero. */
  freshAt: string;
  propertyType: string;
  /** Todas las fotos del aviso en orden de pedido: las elegidas primero, el resto de reserva. */
  photos: string[];
  /** SHA-1 de la galería entera en el orden del portal: si cambia una foto, se vuelve a mirar. */
  galleryHash: string;
}

export interface StoredState {
  galleryHash: string;
  schema: number;
  ok: boolean;
  nextTryAt?: string;
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const urls = (values: unknown[]): string[] => {
  const out: string[] = [];
  for (const value of values) {
    const url = text(value);
    if (/^https?:\/\//i.test(url) && !out.includes(url)) out.push(url);
  }
  return out;
};
const slug = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * La portada primero y después fotos repartidas por toda la galería, para no mandar seis fotos del
 * living cuando el portal las ordena por ambiente; el resto queda de reserva por si alguna se descarta.
 */
export function photoOrder(gallery: readonly string[], max: number): string[] {
  if (gallery.length <= max || max < 2) return [...gallery];
  const picked = new Set<number>([0]);
  const rest = gallery.length - 1;
  for (let k = 0; k < max - 1; k++) picked.add(1 + Math.round((k * (rest - 1)) / Math.max(1, max - 2)));
  const first = [...picked].sort((a, b) => a - b);
  return [...first.map(i => gallery[i]), ...gallery.filter((_, i) => !picked.has(i))];
}

const galleryHash = (gallery: readonly string[]): string => createHash("sha1").update(gallery.join("\n")).digest("hex");

const advertiserOf = (source: string, offer: Record<string, any>): string => {
  const agency = text(offer?.agency?.key);
  if (agency) return `${source}:${agency}`;
  const seller = slug(text(offer?.sellerName));
  return seller ? `${source}:${seller}` : `${source}:${text(offer?.listingId)}`;
};

function subjectOf(
  vertical: PhotoVertical,
  base: { listingId: string; propertyKey: string; source: string; advertiser: string; department: string; freshAt: string; propertyType: string },
  gallery: string[],
  maxPhotos: number,
): PhotoSubject | null {
  if (!base.listingId || gallery.length < MIN_GALLERY) return null;
  return { id: `${vertical}:${base.listingId}`, vertical, ...base, photos: photoOrder(gallery, maxPhotos), galleryHash: galleryHash(gallery) };
}

/** Las ofertas vigentes con galería de las propiedades de `rentallistings`. */
export function rentalSubjects(docs: readonly unknown[], now: Date, maxPhotos = 6): PhotoSubject[] {
  const cutoff = staleCutoff(now);
  const out: PhotoSubject[] = [];
  for (const doc of docs as Array<Record<string, any>>) {
    for (const offer of Array.isArray(doc?.offers) ? doc.offers : []) {
      const source = text(offer?.source);
      if (!RENTAL_PHOTO_SOURCES.has(source)) continue;
      if (text(offer?.lastSeen) && text(offer.lastSeen) < cutoff) continue;
      const gallery = urls([offer?.image, ...(Array.isArray(offer?.details?.images) ? offer.details.images : [])]);
      const subject = subjectOf(
        "alquiler",
        {
          listingId: text(offer?.listingId),
          propertyKey: text(doc?.key),
          source,
          advertiser: advertiserOf(source, offer),
          department: text(doc?.department),
          freshAt: text(doc?.freshAt) || text(offer?.firstSeen),
          propertyType: text(doc?.propertyType) || "otro",
        },
        gallery,
        maxPhotos,
      );
      if (subject) out.push(subject);
    }
  }
  return out;
}

/** Los avisos de venta publicados en `propertysalecatalog`. */
export function saleSubjects(docs: readonly unknown[], maxPhotos = 6): PhotoSubject[] {
  const out: PhotoSubject[] = [];
  for (const doc of docs as Array<Record<string, any>>) {
    const source = text(doc?.source);
    if (!SALE_PHOTO_SOURCES.has(source)) continue;
    const gallery = urls([doc?.image, ...(Array.isArray(doc?.images) ? doc.images : [])]);
    const subject = subjectOf(
      "venta",
      {
        listingId: text(doc?.listingId) || text(doc?.id),
        propertyKey: text(doc?.key),
        source,
        advertiser: advertiserOf(source, doc),
        department: text(doc?.department),
        freshAt: text(doc?.publishedAt) || text(doc?.firstSeen) || text(doc?.lastSeen),
        propertyType: text(doc?.propertyType) || "otro",
      },
      gallery,
      maxPhotos,
    );
    if (subject) out.push(subject);
  }
  return out;
}

/**
 * Lo que queda por mirar, en orden: Montevideo primero (es donde se concentra la demanda), después lo
 * más reciente. Se saltea lo ya mirado con la misma galería y la misma versión del esquema, y lo que
 * falló y todavía está en espera.
 */
export function orderSubjects(
  subjects: readonly PhotoSubject[],
  stored: ReadonlyMap<string, StoredState>,
  now: Date,
  schemaVersion: number,
): PhotoSubject[] {
  const nowIso = now.toISOString();
  const seen = new Set<string>();
  return subjects
    .filter(subject => {
      if (seen.has(subject.id)) return false;
      seen.add(subject.id);
      const state = stored.get(subject.id);
      if (!state || state.galleryHash !== subject.galleryHash) return true;
      if (state.ok) return state.schema < schemaVersion;
      return !state.nextTryAt || state.nextTryAt <= nowIso;
    })
    .sort(
      (a, b) =>
        Number(b.department === "Montevideo") - Number(a.department === "Montevideo") ||
        b.freshAt.localeCompare(a.freshAt) ||
        a.id.localeCompare(b.id),
    );
}

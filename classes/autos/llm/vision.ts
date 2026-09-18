// Mirar las fotos del propio aviso antes de llamarlo oportunidad.
//
// Por qué existe: de las cuatro brechas más grandes de la primera corrida en vivo, TRES eran autos
// chocados que el título no decía (2026-09-17). El texto no alcanzaba y las fotos sí lo mostraban.
//
// Qué se hace con el veredicto, y esto es la regla y no un detalle: la IA **no publica, filtra**.
// Sirve para (a) retirar en silencio una oportunidad cuyas propias fotos la contradicen y (b)
// corroborar lo que el vendedor YA declaró. Nunca para acusar: el sitio jamás publica "este auto
// está chocado" sobre un aviso que no lo dice. Un modelo que se equivoca de un lado deja pasar una
// oportunidad; del otro lado difama a una persona con nombre y teléfono en el aviso.
import { askJSONWithImages, geminiConfigured } from "../../gemini";
import { fetchBuffer } from "../../rentals/net";
import { AUTOS_USER_AGENT } from "../detail";

export type CarPhotoDamage = "ninguno" | "leve" | "grave" | "no_se_ve";

export interface CarPhotoVerdict {
  readAt: string;
  /** El modelo que respondió: un cambio de modelo cambia la serie. */
  model: string;
  /** ¿El auto de las fotos es el que el aviso dice? `null` = no se puede afirmar. */
  matchesAdvert: boolean | null;
  damage: CarPhotoDamage;
  /** Fotos de catálogo o renders del fabricante en vez del auto que se vende. */
  catalogPhotos: boolean;
  /** Una línea en español, del propio modelo, para poder auditar el veredicto a mano. */
  note: string;
  photos: number;
}

export interface CarPhotoSubject {
  key: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  trim: string | null;
  km: number | null;
  description: string;
  pictures: readonly string[];
}

const SCHEMA = {
  type: "object",
  properties: {
    matchesAdvert: { type: "string", enum: ["si", "no", "no_se"] },
    damage: { type: "string", enum: ["ninguno", "leve", "grave", "no_se_ve"] },
    catalogPhotos: { type: "boolean" },
    note: { type: "string" },
  },
  required: ["matchesAdvert", "damage", "catalogPhotos", "note"],
} as const;

const SYSTEM = [
  "Sos un perito que mira SOLO las fotos de un aviso de auto usado en Uruguay y contesta en JSON.",
  "Reglas: si la foto no alcanza para afirmar algo, contestá 'no_se' o 'no_se_ve'. No adivines.",
  "Daño 'grave' es el que se ve: golpe estructural, frente hundido, airbags disparados, óxido pasante,",
  "auto desarmado o sin partes. 'leve' es chapa y pintura menor. Si el auto se ve entero y sano: 'ninguno'.",
  "'catalogPhotos' es true sólo si son imágenes de catálogo o renders del fabricante, no fotos del auto real.",
  "La nota va en español, máximo 25 palabras, y describe lo que se ve, no lo que suponés.",
].join(" ");

/** Cuánto pesa una tanda de fotos antes de que la llamada se vuelva cara. */
const MAX_BYTES_PER_PHOTO = 900_000;
const MAX_PHOTOS = 4;

export const visionConfigured = (): boolean => geminiConfigured();

const mimeOf = (url: string): string => (/\.png(\?|$)/i.test(url) ? "image/png" : /\.webp(\?|$)/i.test(url) ? "image/webp" : "image/jpeg");

export async function downloadPhotos(
  urls: readonly string[],
  options: { max?: number; fetcher?: (url: string) => Promise<Buffer | null> } = {},
): Promise<Array<{ data: Buffer; mimeType: string }>> {
  const fetcher = options.fetcher ?? (async (url: string) =>
    fetchBuffer(url, { timeoutMs: 20_000, headers: { "user-agent": AUTOS_USER_AGENT } }));
  const images: Array<{ data: Buffer; mimeType: string }> = [];
  for (const url of urls.slice(0, options.max ?? MAX_PHOTOS)) {
    const data = await fetcher(url);
    if (!data || !data.length || data.length > MAX_BYTES_PER_PHOTO) continue;
    images.push({ data, mimeType: mimeOf(url) });
  }
  return images;
}

export function visionPrompt(subject: CarPhotoSubject): string {
  return [
    `El aviso dice que es un ${subject.brand} ${subject.model} ${subject.year}` +
      `${subject.trim ? ` versión ${subject.trim}` : ""}${subject.km === null ? "" : ` con ${subject.km.toLocaleString("es-UY")} km`}.`,
    `Título del aviso: "${subject.title.slice(0, 160)}".`,
    subject.description ? `Descripción del vendedor: "${subject.description.slice(0, 700)}".` : "",
    "Mirá las fotos y contestá: ¿el auto de las fotos concuerda con eso? ¿se ve daño? ¿son fotos del auto o de catálogo?",
  ].filter(Boolean).join(" ");
}

interface VisionReply {
  matchesAdvert: "si" | "no" | "no_se";
  damage: CarPhotoDamage;
  catalogPhotos: boolean;
  note: string;
}

export async function inspectCarPhotos(
  subject: CarPhotoSubject,
  options: { now?: () => Date; model?: string; fetcher?: (url: string) => Promise<Buffer | null> } = {},
): Promise<CarPhotoVerdict | null> {
  if (!visionConfigured() || !subject.pictures.length) return null;
  const images = await downloadPhotos(subject.pictures, { fetcher: options.fetcher });
  if (!images.length) return null;
  const model = options.model || process.env.AUTOS_VISION_MODEL || "gemini-2.5-flash-lite";
  const reply = await askJSONWithImages<VisionReply>(visionPrompt(subject), images, SCHEMA, { system: SYSTEM, model });
  if (!reply || !["si", "no", "no_se"].includes(reply.matchesAdvert)) return null;
  const damage: CarPhotoDamage = ["ninguno", "leve", "grave", "no_se_ve"].includes(reply.damage) ? reply.damage : "no_se_ve";
  return {
    readAt: (options.now?.() ?? new Date()).toISOString(),
    model,
    matchesAdvert: reply.matchesAdvert === "si" ? true : reply.matchesAdvert === "no" ? false : null,
    damage,
    catalogPhotos: !!reply.catalogPhotos,
    note: String(reply.note || "").replace(/\s+/g, " ").trim().slice(0, 200),
    photos: images.length,
  };
}

/**
 * Por qué una oportunidad no se publica después de mirarle las fotos. Sólo lo inequívoco descalifica:
 * un "no_se" nunca retira nada, y un daño leve tampoco —media flota usada tiene chapa y pintura—.
 */
export function photoRejection(verdict: CarPhotoVerdict | null | undefined): string | null {
  if (!verdict) return null;
  if (verdict.damage === "grave") return "photo_damage";
  if (verdict.matchesAdvert === false) return "photo_mismatch";
  if (verdict.catalogPhotos) return "photo_catalog";
  return null;
}

/** Lo único que se publica de la visión: que las fotos confirman lo que el aviso ya declaraba. */
export const photoCorroborates = (verdict: CarPhotoVerdict | null | undefined, declaresDamage: boolean): boolean =>
  !!verdict && declaresDamage && (verdict.damage === "grave" || verdict.damage === "leve");

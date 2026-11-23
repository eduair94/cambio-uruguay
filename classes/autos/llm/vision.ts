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
import { askJSONWithImagesDetailed, llmConfigured } from "../../llm";
import { fetchBuffer } from "../../rentals/net";
import { preparePhotos } from "../../vision/photos";
import { AUTOS_USER_AGENT } from "../detail";

export type CarPhotoDamage = "ninguno" | "leve" | "grave" | "no_se_ve";
export type CarGearbox = "manual" | "automatica";

/**
 * Versión del esquema del veredicto. La 2 (2026-11-23) agrega el odómetro y la palanca; un veredicto
 * sin `schema` es de la 1 y se vuelve a mirar cuando no quedan avisos nunca mirados.
 */
export const CAR_VISION_SCHEMA = 2;

export interface CarPhotoVerdict {
  schema?: number;
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
  /**
   * Lo que marca el tablero en una foto, cuando se lee el número entero; `null` si ninguna foto lo
   * muestra o no se lee. NUNCA se publica: sólo retira una oportunidad (`odometerContradicts`).
   */
  odometerKm?: number | null;
  /** La palanca que se ve. Se guarda para medirla; todavía no decide nada. */
  gearbox?: CarGearbox | null;
  /** Lo que costó mirar, estimado por classes/anthropic.ts (0 si contestó Gemini). */
  costUsd?: number;
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
    odometerKm: { type: "integer", nullable: true },
    gearbox: { type: "string", enum: ["manual", "automatica", "no_se"] },
    note: { type: "string" },
  },
  required: ["matchesAdvert", "damage", "catalogPhotos", "odometerKm", "gearbox", "note"],
} as const;

const SYSTEM = [
  "Sos un perito que mira SOLO las fotos de un aviso de auto usado en Uruguay y contesta en JSON.",
  "Reglas: si la foto no alcanza para afirmar algo, contestá 'no_se' o 'no_se_ve'. No adivines.",
  "El AÑO de un auto NO se puede leer en una foto: nunca contestes 'no' por el año. 'matchesAdvert'",
  "es 'no' sólo si la carrocería o el modelo son visiblemente otros (dice pick-up y es un sedán).",
  "Si tu propia nota va a decir que no podés confirmarlo, la respuesta es 'no_se'.",
  "Daño 'grave' es el que se ve: golpe estructural, frente hundido, airbags disparados, óxido pasante,",
  "auto desarmado o sin partes. 'leve' es chapa y pintura menor. Si el auto se ve entero y sano: 'ninguno'.",
  "'catalogPhotos' es true sólo si son imágenes de catálogo o renders del fabricante, no fotos del auto real.",
  "'odometerKm' es SOLO el número que se lee entero en el tablero de una foto (el odómetro total, no el",
  "parcial ni la velocidad). Si ninguna foto muestra el tablero, o el número no se lee completo, null.",
  "Nunca copies los kilómetros que dice el aviso.",
  "'gearbox' es 'manual' si se ve una palanca con las marchas numeradas (1-2-3-4-5-R), 'automatica' si",
  "se ve un selector P-R-N-D; si no se ve la palanca, 'no_se'.",
  "No transcribas matrículas, teléfonos ni ningún otro texto de las fotos.",
  "La nota va en español, máximo 25 palabras, y describe lo que se ve, no lo que suponés.",
].join(" ");

/**
 * Seis fotos: el tablero rara vez es de las primeras cuatro. Achicadas a 1.024 px (vision/photos.ts),
 * seis cuestan lo que costaban cuatro a tamaño original (ML sirve 1200 px).
 */
const MAX_PHOTOS = 6;

export const visionConfigured = (): boolean => llmConfigured();

export async function downloadPhotos(
  urls: readonly string[],
  options: { max?: number; fetcher?: (url: string) => Promise<Buffer | null> } = {},
): Promise<Array<{ data: Buffer; mimeType: string }>> {
  const fetcher = options.fetcher ?? (async (url: string) =>
    fetchBuffer(url, { timeoutMs: 20_000, headers: { "user-agent": AUTOS_USER_AGENT } }));
  const { photos } = await preparePhotos(urls, { max: options.max ?? MAX_PHOTOS, fetcher });
  return photos.map(photo => ({ data: photo.data, mimeType: photo.mimeType }));
}

export function visionPrompt(subject: CarPhotoSubject): string {
  return [
    `El aviso dice que es un ${subject.brand} ${subject.model} ${subject.year}` +
      `${subject.trim ? ` versión ${subject.trim}` : ""}${subject.km === null ? "" : ` con ${subject.km.toLocaleString("es-UY")} km`}.`,
    `Título del aviso: "${subject.title.slice(0, 160)}".`,
    subject.description ? `Descripción del vendedor: "${subject.description.slice(0, 700)}".` : "",
    "Mirá las fotos y contestá: ¿el auto de las fotos concuerda con eso? ¿se ve daño? ¿son fotos del auto o de catálogo?" +
      " Si alguna foto muestra el tablero o la palanca, leelos.",
  ].filter(Boolean).join(" ");
}

interface VisionReply {
  matchesAdvert: "si" | "no" | "no_se";
  damage: CarPhotoDamage;
  catalogPhotos: boolean;
  odometerKm?: number | null;
  gearbox?: "manual" | "automatica" | "no_se";
  note: string;
}

/** Un odómetro creíble: entero, de 1 a 999.999. Cualquier otra cosa es "no se leyó". */
const odometerOf = (raw: unknown): number | null =>
  typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 999_999 ? raw : null;

export async function inspectCarPhotos(
  subject: CarPhotoSubject,
  options: { now?: () => Date; model?: string; fetcher?: (url: string) => Promise<Buffer | null> } = {},
): Promise<CarPhotoVerdict | null> {
  if (!visionConfigured() || !subject.pictures.length) return null;
  const images = await downloadPhotos(subject.pictures, { fetcher: options.fetcher });
  if (!images.length) return null;
  // The Gemini model this job pins for its own leg; Claude, when it answers, uses ANTHROPIC_MODEL and
  // the verdict records whichever actually looked at the photos.
  const geminiModel = options.model || process.env.AUTOS_VISION_MODEL || "gemini-2.5-flash-lite";
  const answer = await askJSONWithImagesDetailed<VisionReply>(visionPrompt(subject), images, SCHEMA, {
    system: SYSTEM,
    model: geminiModel,
    cacheSystem: true,
  });
  const reply = answer?.value;
  if (!answer || !reply || !["si", "no", "no_se"].includes(reply.matchesAdvert)) return null;
  const damage: CarPhotoDamage = ["ninguno", "leve", "grave", "no_se_ve"].includes(reply.damage) ? reply.damage : "no_se_ve";
  return {
    schema: CAR_VISION_SCHEMA,
    readAt: (options.now?.() ?? new Date()).toISOString(),
    model: answer.model,
    matchesAdvert: reply.matchesAdvert === "si" ? true : reply.matchesAdvert === "no" ? false : null,
    damage,
    catalogPhotos: !!reply.catalogPhotos,
    note: String(reply.note || "").replace(/\s+/g, " ").trim().slice(0, 200),
    photos: images.length,
    odometerKm: odometerOf(reply.odometerKm),
    gearbox: reply.gearbox === "manual" || reply.gearbox === "automatica" ? reply.gearbox : null,
    costUsd: answer.costUsd ?? 0,
  };
}

/** ¿Hay que volver a mirar este veredicto? Los de un esquema anterior no leían tablero ni palanca. */
export const needsRecheck = (verdict: CarPhotoVerdict | null | undefined): boolean =>
  !!verdict && (verdict.schema ?? 1) < CAR_VISION_SCHEMA;

/**
 * El tablero marca MUCHO más que lo que el aviso declara: el caso de r/AutosUy (130.000 declarados,
 * 208.936 en la foto). Más de 1,25 veces Y al menos 20.000 km de diferencia, para que una foto vieja
 * o un redondeo del vendedor (178.000 declarados, 168.709 en el tablero) no retire nada. Un tablero
 * que marca MENOS nunca retira: puede ser una foto anterior.
 */
export function odometerContradicts(
  verdict: Pick<CarPhotoVerdict, "odometerKm"> | null | undefined,
  declaredKm: number | null | undefined,
): boolean {
  const read = verdict?.odometerKm;
  if (typeof read !== "number" || typeof declaredKm !== "number" || !(declaredKm >= 0)) return false;
  return read > declaredKm * 1.25 && read - declaredKm >= 20_000;
}

/**
 * Por qué una oportunidad no se publica después de mirarle las fotos. Sólo lo inequívoco descalifica:
 * un "no_se" nunca retira nada, y un daño leve tampoco —media flota usada tiene chapa y pintura—.
 */
export function photoRejection(verdict: CarPhotoVerdict | null | undefined, declaredKm?: number | null): string | null {
  if (!verdict) return null;
  if (verdict.damage === "grave") return "photo_damage";
  if (verdict.catalogPhotos) return "photo_catalog";
  // El tablero contradice los km: la oportunidad se calculó con un kilometraje que no es el del auto.
  // Se retira en silencio, como las otras dos; nunca se publica "km adulterados".
  if (odometerContradicts(verdict, declaredKm)) return "photo_km";
  // La palanca (`gearbox`) todavía no retira nada: su precisión no está medida.
  // `matchesAdvert: false` NO descalifica, y esto se aprendió en producción: los dos únicos rechazos
  // por ese motivo (2026-09-18) fueron falsos. Uno decía "el aviso indica un modelo 2019 y las fotos
  // muestran un 2018" —el año no se ve en una foto— y el otro se contradecía solo: "no se puede
  // confirmar el modelo ni el kilometraje" y aun así contestó que no concuerda. Un rechazo falso
  // cuesta una oportunidad real, así que sólo descalifica lo que una foto puede mostrar de verdad:
  // el daño grave y las fotos de catálogo. El veredicto se guarda igual, para poder auditarlo.
  return null;
}

/** Lo único que se publica de la visión: que las fotos confirman lo que el aviso ya declaraba. */
export const photoCorroborates = (verdict: CarPhotoVerdict | null | undefined, declaresDamage: boolean): boolean =>
  !!verdict && declaresDamage && (verdict.damage === "grave" || verdict.damage === "leve");

// Videos de YouTube que prueban un modelo, para la ficha de cada aviso.
//
// CÓMO SE ENCUENTRAN, Y POR QUÉ ASÍ: `youtube.com/results` está prohibido por su robots.txt, la Data
// API pide clave y cuota, y el SERP interno (:5112) estaba caído al diseñarlo. Medido el 2026-10-02:
// una llamada a Gemini con `google_search` ("videos de prueba de la Saveiro") devolvió diez URLs
// `youtube.com/watch?v=…` REALES en sus chunks de grounding, mientras que el TEXTO de la respuesta
// traía tokens de redirección con forma de id. Por eso:
//  * los ids salen SÓLO de los chunks resueltos (páginas que el buscador abrió), nunca del texto;
//  * cada id se verifica con el oEmbed oficial de YouTube (existe, es público, título y canal);
//  * el título tiene que nombrar el modelo, y se descartan juguetes, videojuegos y avisos de venta.
// La IA no escribe nada que se publique: sólo apunta a páginas, y lo publicado sale de YouTube.
import axios from "axios";
import { askGrounded, geminiConfigured, type GroundedReply } from "../../gemini";
import { namesCar } from "./text";
import type { CarModelVideo } from "./types";

export const MAX_VIDEOS = 4;
const MAX_CANDIDATES = 10;

const ID = /^[A-Za-z0-9_-]{11}$/;

/** El id de un video normal (`watch?v=`, `youtu.be/`, `embed/`); nunca un Short ni una lista. */
export function youtubeIdFromUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtube.com" && url.pathname === "/watch") id = url.searchParams.get("v");
  else if (host === "youtube.com" && url.pathname.startsWith("/embed/")) id = url.pathname.slice(7);
  else if (host === "youtu.be") id = url.pathname.slice(1);
  return id && ID.test(id) ? id : null;
}

const UNRELATED =
  /\b(juguete|juguetes|hot ?wheels|maqueta|miniatura|escala|1[:/]\d{2}|gta|forza|minecraft|roblox|lego|beamng|simulator|simulador|farming|rc|asmr)\b/i;
const FOR_SALE = /\b(vendo|venta|vende|se vende|liquido|permuto|financio|financiaci[oó]n|entrega inmediata|stock)\b/i;
const REVIEW =
  /\b(prueba|pruebas|review|rese[nñ]a|test|an[aá]lisis|opini[oó]n|probamos|manejamos|a fondo|contacto|presentaci[oó]n|lanzamiento|conducimos|vale la pena|ventajas|defectos|problemas|fallas|comparativa|vs|todo sobre|lo bueno|lo malo)\b/i;

/** El video es de ESTE auto y no un juguete, un juego o un aviso de una automotora. */
export function videoTitleMatches(title: string, brand: string, model: string): boolean {
  if (UNRELATED.test(title) || FOR_SALE.test(title)) return false;
  return namesCar(title, brand, model);
}

/** Primero los que dicen que prueban o reseñan; a igualdad, el orden en que los trajo el buscador. */
export function rankVideos(videos: CarModelVideo[]): CarModelVideo[] {
  return videos
    .map((video, index) => ({ video, index, review: REVIEW.test(video.title) ? 0 : 1 }))
    .sort((a, b) => a.review - b.review || a.index - b.index)
    .map((item) => item.video)
    .slice(0, MAX_VIDEOS);
}

/** Ids únicos, en orden, de las páginas de YouTube que el buscador abrió de verdad. */
export function groundedVideoIds(reply: GroundedReply): string[] {
  const urls = reply.resolvedByChunk?.length ? reply.resolvedByChunk : reply.sourceUris;
  const ids: string[] = [];
  for (const url of urls) {
    const id = url ? youtubeIdFromUrl(url) : null;
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, MAX_CANDIDATES);
}

interface OEmbed {
  title?: string;
  author_name?: string;
  author_url?: string;
  type?: string;
}

/** Lo que YouTube mismo dice del video; null si no existe, es privado o no se puede incrustar. */
export async function oembedVideo(id: string): Promise<CarModelVideo | null> {
  const res = await axios.get("https://www.youtube.com/oembed", {
    params: { url: `https://www.youtube.com/watch?v=${id}`, format: "json" },
    timeout: 10_000,
    validateStatus: (status) => status < 500,
  });
  if (res.status !== 200) return null;
  const data = res.data as OEmbed;
  if (data?.type !== "video" || !data.title || !data.author_name) return null;
  return { id, title: data.title.trim(), channel: data.author_name.trim(), channelUrl: data.author_url ?? null };
}

/**
 * Hasta cuatro videos verificados del modelo. Lanza si Gemini no contestó (el refresco conserva lo
 * que había); devuelve [] si contestó y nada pasó los filtros.
 */
export async function findModelVideos(
  brand: string,
  model: string,
  deps: { ask?: typeof askGrounded; oembed?: typeof oembedVideo } = {},
): Promise<CarModelVideo[]> {
  const ask = deps.ask ?? askGrounded;
  const oembed = deps.oembed ?? oembedVideo;
  if (!deps.ask && !geminiConfigured()) throw new Error("gemini not configured");
  // Medido: la misma pregunta a veces vuelve sin haber buscado (cero chunks) y a la siguiente trae
  // diez videos. Una segunda redacción antes de rendirse; sin ninguna página abierta es una FALLA
  // (se reintenta en una semana), no "este modelo no tiene videos".
  const prompts = [
    `Buscá en YouTube videos en español de prueba, reseña u opinión del auto ${brand} ${model}. ` +
      `Listá los videos que encuentres con su enlace de youtube.com.`,
    `youtube.com ${brand} ${model} prueba review reseña en español`,
  ];
  let ids: string[] = [];
  for (const prompt of prompts) {
    const reply = await ask(prompt);
    ids = reply ? groundedVideoIds(reply) : [];
    if (ids.length) break;
  }
  if (!ids.length) throw new Error("the search opened no YouTube page");
  const found: CarModelVideo[] = [];
  let errors = 0;
  for (const id of ids) {
    const video = await oembed(id).catch(() => {
      errors += 1;
      return null;
    });
    if (video && videoTitleMatches(video.title, brand, model)) found.push(video);
  }
  // Si TODAS las verificaciones fallaron por red, no es "no hay videos": es una falla, y se
  // reintenta en una semana en vez de quedar vacío un mes.
  if (errors === ids.length) throw new Error("youtube oembed unreachable");
  return rankVideos(found);
}

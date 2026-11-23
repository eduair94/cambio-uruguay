// Las fotos de un aviso, listas para mostrárselas a un modelo: bajadas, sin placeholders ni
// repetidas, achicadas a 1.024 px de lado mayor y con una huella perceptual.
//
// Por qué achicar: lo que cobra Claude por una foto crece con sus píxeles, y los portales sirven
// fotos más grandes de lo que hace falta para ver un balcón o un tablero (medido el 2026-11-23:
// InfoCasas 1920×1440, Casasweb 1634×1225, Mercado Libre 1200 px). El piloto del estudio de
// factibilidad midió −32 % de costo a 1.024 px con los odómetros todavía legibles.
//
// Por qué en JavaScript puro y no con `sharp`: el VPS es CentOS 7 (glibc 2.17) y los binarios
// precompilados de `sharp` piden glibc ≥ 2.26. `jpeg-js` decodifica y codifica sin nada nativo. Lo que
// no es JPEG (los WebP de Mercado Libre) se pide primero en su variante `.jpg`, que el CDN sirve
// igual, y si no se manda tal cual: Claude lo lee, sólo que sin achicar ni huella.
//
// La huella (dHash, 64 bits) sirve para dos cosas y para ninguna más: descartar la misma foto en dos
// tamaños dentro del mismo aviso, y CONTAR cuántas fotos aparecen en avisos de anunciantes distintos.
// Nunca une avisos: una foto compartida no prueba que sea la misma vivienda (el caso de San Luis,
// docs/app/RENTALS.md).
import { createHash } from "crypto";
import { decode, encode } from "jpeg-js";
import { sniffImageMime } from "../anthropic";
import { fetchBuffer } from "../rentals/net";

/** Lado mayor por debajo del cual una foto no informa nada: el logo de El País mide 338×253. */
export const PHOTO_MIN_EDGE = 400;
/** Menos que esto es un logo, un pixel o una foto vacía (el placeholder de El País pesa 2.353 bytes). */
export const PHOTO_MIN_BYTES = 4096;
export const PHOTO_MAX_EDGE = 1024;
const JPEG_QUALITY = 80;
/** Dos huellas a esta distancia o menos son la misma escena (la misma foto en otro tamaño). */
const SAME_SCENE_BITS = 4;

export interface PreparedPhoto {
  url: string;
  /** Posición en la lista de URLs que se pidió: así el veredicto del modelo vuelve a su foto. */
  index: number;
  data: Buffer;
  mimeType: string;
  width: number | null;
  height: number | null;
  /** SHA-1 de los bytes que bajaron, antes de achicar. */
  sha1: string;
  /** 16 hex, o `null` cuando la foto no se pudo decodificar (WebP, PNG). */
  dhash: string | null;
  resized: boolean;
}

export type PhotoSkips = { small: number; duplicate: number; unreadable: number; failed: number };

type Inspected = Omit<PreparedPhoto, "url" | "index"> | "small" | "unreadable";

const sha1 = (data: Buffer): string => createHash("sha1").update(data).digest("hex");

/** Mercado Libre sirve la misma foto en JPEG si se le cambia la extensión. */
export function mlJpegVariant(url: string): string {
  return /^https?:\/\/[^/]*mlstatic\.com\//i.test(url) ? url.replace(/\.webp(\?.*)?$/i, ".jpg$1") : url;
}

/** Ancho y alto sin decodificar, de la cabecera, para los formatos que se mandan tal cual. */
function headerSize(data: Buffer, mime: string): [number, number] | null {
  try {
    if (mime === "image/png" && data.length >= 24) return [data.readUInt32BE(16), data.readUInt32BE(20)];
    if (mime === "image/webp" && data.length >= 30) {
      const chunk = data.subarray(12, 16).toString("latin1");
      if (chunk === "VP8 ") return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
      if (chunk === "VP8L") {
        const bits = data.readUInt32LE(21);
        return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
      }
      if (chunk === "VP8X") return [1 + data.readUIntLE(24, 3), 1 + data.readUIntLE(27, 3)];
    }
    if (mime === "image/jpeg") {
      let i = 2;
      while (i + 9 < data.length) {
        if (data[i] !== 0xff) { i++; continue; }
        const marker = data[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [data.readUInt16BE(i + 7), data.readUInt16BE(i + 5)];
        i += 2 + data.readUInt16BE(i + 2);
      }
    }
  } catch {
    /* a truncated header is just "size unknown" */
  }
  return null;
}

/** Promedio por cajas de un RGBA: cada píxel nuevo es la media de los que cubre. */
function shrinkRgba(src: Uint8Array, w: number, h: number, nw: number, nh: number): Uint8Array {
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const y0 = Math.floor((y * h) / nh);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / nh));
    for (let x = 0; x < nw; x++) {
      const x0 = Math.floor((x * w) / nw);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / nw));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        let p = (yy * w + x0) * 4;
        for (let xx = x0; xx < x1; xx++, p += 4) {
          r += src[p];
          g += src[p + 1];
          b += src[p + 2];
          n++;
        }
      }
      const o = (y * nw + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return out;
}

const grayOf = (rgba: Uint8Array): Uint8Array => {
  const gray = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < gray.length; i++) gray[i] = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
  return gray;
};

/**
 * dHash de 64 bits: la imagen en gris reducida a 9×8, y un bit por par de vecinos de cada fila
 * (1 = el de la izquierda es más claro). Resiste el cambio de tamaño y la recompresión.
 */
export function dHash(gray: Uint8Array, w: number, h: number): string {
  const cells = new Float64Array(72);
  for (let y = 0; y < 8; y++) {
    const y0 = Math.floor((y * h) / 8);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / 8));
    for (let x = 0; x < 9; x++) {
      const x0 = Math.floor((x * w) / 9);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / 9));
      let sum = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { sum += gray[yy * w + xx]; n++; }
      cells[y * 9 + x] = sum / n;
    }
  }
  let hex = "";
  for (let y = 0; y < 8; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) byte = (byte << 1) | (cells[y * 9 + x] > cells[y * 9 + x + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

/** Bits distintos entre dos huellas hexadecimales del mismo largo. */
export function hamming(a: string, b: string): number {
  let bits = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { bits += x & 1; x >>= 1; }
  }
  return bits;
}

function inspect(data: Buffer, maxEdge: number): Inspected {
  if (data.length < PHOTO_MIN_BYTES) return "small";
  const mime = sniffImageMime(data);
  if (!mime) return "unreadable";
  const hash = sha1(data);
  if (mime === "image/jpeg") {
    try {
      const raw = decode(data, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 40, maxMemoryUsageInMB: 512 });
      const { width, height } = raw;
      if (Math.max(width, height) < PHOTO_MIN_EDGE) return "small";
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      const nw = Math.max(1, Math.round(width * scale));
      const nh = Math.max(1, Math.round(height * scale));
      const pixels = scale < 1 ? shrinkRgba(raw.data, width, height, nw, nh) : raw.data;
      const dhash = dHash(grayOf(pixels), nw, nh);
      if (scale >= 1) return { data, mimeType: mime, width, height, sha1: hash, dhash, resized: false };
      const out = encode({ data: pixels, width: nw, height: nh }, JPEG_QUALITY).data;
      return { data: out, mimeType: mime, width: nw, height: nh, sha1: hash, dhash, resized: true };
    } catch {
      // A JPEG jpeg-js cannot read (an odd encoder): sent as it came when its header says it is big enough.
    }
  }
  const size = headerSize(data, mime);
  if (size && Math.max(...size) < PHOTO_MIN_EDGE) return "small";
  return { data, mimeType: mime, width: size?.[0] ?? null, height: size?.[1] ?? null, sha1: hash, dhash: null, resized: false };
}

/** Una foto ya bajada, lista para el modelo; `null` si es un placeholder, diminuta o no es una imagen. */
export function preparePhoto(data: Buffer, maxEdge: number = PHOTO_MAX_EDGE): Omit<PreparedPhoto, "url" | "index"> | null {
  const out = inspect(data, maxEdge);
  return typeof out === "string" ? null : out;
}

const defaultFetcher = (url: string): Promise<Buffer | null> => fetchBuffer(url, { timeoutMs: 20_000, retries: 1 });

/**
 * Baja las fotos en orden hasta juntar `max` utilizables. Lo que no sirve se cuenta y no se manda:
 * pagar por mirar un logo es tirar la plata.
 */
export async function preparePhotos(
  urls: readonly string[],
  options: { max?: number; maxEdge?: number; fetcher?: (url: string) => Promise<Buffer | null> } = {}
): Promise<{ photos: PreparedPhoto[]; skipped: PhotoSkips }> {
  const max = options.max ?? 6;
  const maxEdge = options.maxEdge ?? PHOTO_MAX_EDGE;
  const fetcher = options.fetcher ?? defaultFetcher;
  const photos: PreparedPhoto[] = [];
  const skipped: PhotoSkips = { small: 0, duplicate: 0, unreadable: 0, failed: 0 };
  const seen = new Set<string>();
  for (let index = 0; index < urls.length && photos.length < max; index++) {
    const url = urls[index];
    const variant = mlJpegVariant(url);
    let data = variant !== url ? await fetcher(variant) : null;
    if (!data) data = await fetcher(url);
    if (!data || !data.length) { skipped.failed++; continue; }
    const out = inspect(data, maxEdge);
    if (out === "small") { skipped.small++; continue; }
    if (out === "unreadable") { skipped.unreadable++; continue; }
    const sameScene = out.dhash !== null && photos.some(photo => photo.dhash !== null && hamming(photo.dhash, out.dhash!) <= SAME_SCENE_BITS);
    if (seen.has(out.sha1) || sameScene) { skipped.duplicate++; continue; }
    seen.add(out.sha1);
    photos.push({ url, index, ...out });
  }
  return { photos, skipped };
}

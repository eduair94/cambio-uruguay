// Last-resort identification: read the chair off the photo.
//
// Marketplace titles are frequently just "silla de escritorio" or "silla gamer nueva", and a
// listing we cannot name is a listing the directory has to drop. The product photo usually shows
// what the words don't — a Cougar logo on the backrest, a Herman Miller tag, a distinctive shape.
//
// Three rules keep this from inventing chairs:
//   1. Only listings that text identification already failed on are sent.
//   2. A guess is accepted only above a confidence floor AND only when the brand is one the
//      Uruguayan market actually has. A model name with no known brand is discarded.
//   3. Every accepted guess is stored with the image it came from, so the page can say the chair
//      was identified from a photo and the same photo is never paid for twice.
import { createHash } from "crypto";
import { askWithImage, geminiConfigured } from "../gemini";
import { ChairVisionGuessModel } from "../models/ChairVisionGuess";
import { fetchImage } from "./net";
import { KNOWN_CHAIR_BRANDS } from "./normalize";
import type { ChairListing } from "./types";

/** Hard cap per run: this is the only part of the harvest that costs money per listing. */
const MAX_CALLS = Number(process.env.CHAIR_VISION_LIMIT || 40);
const MIN_CONFIDENCE = Number(process.env.CHAIR_VISION_MIN_CONFIDENCE || 0.7);
/** Bigger than this and the base64 payload stops being worth it. */
const MAX_IMAGE_BYTES = 1_500_000;

const PROMPT = `Mirá la foto de esta publicación de una silla y decime SOLO lo que se puede leer o
reconocer con certeza en la imagen.

Respondé SOLO JSON válido:
{"brand":"marca o null","model":"modelo o null","kind":"escritorio|gamer|ejecutiva|comedor|otra","confidence":0.0}

Reglas estrictas:
- "brand" solo si ves un logo, una etiqueta o un texto legible con la marca. Si no, null.
- "model" solo si el modelo aparece escrito o si la silla es un modelo icónico inconfundible.
- No adivines por parecido: una silla de malla negra genérica es brand null.
- confidence de 0 a 1: qué tan seguro estás de lo que devolvés.
- "kind" describe para qué es la silla según la foto.`;

export interface ChairVisionGuess {
  brand: string;
  model: string;
  kind: string;
  confidence: number;
}

const imageKey = (url: string): string => createHash("sha1").update(url).digest("hex");

function parseGuess(text: string): ChairVisionGuess | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const row = JSON.parse(match[0]);
    const confidence = Number(row?.confidence);
    return {
      brand: String(row?.brand ?? "").trim(),
      model: String(row?.model ?? "").trim(),
      kind: String(row?.kind ?? "").trim().toLowerCase(),
      confidence: Number.isFinite(confidence) ? confidence : 0,
    };
  } catch {
    return null;
  }
}

/**
 * True when a guess is safe to publish.
 *
 * The brand has to be one we already know sells here — an invented "ErgoMax" would create a chair
 * that does not exist, and the whole directory is built on not doing that.
 */
export function acceptableGuess(guess: ChairVisionGuess | null): boolean {
  if (!guess) return false;
  if (guess.confidence < MIN_CONFIDENCE) return false;
  if (!guess.brand || guess.brand.toLowerCase() === "null") return false;
  if (!guess.model || guess.model.toLowerCase() === "null") return false;
  const brand = guess.brand.toLowerCase();
  return KNOWN_CHAIR_BRANDS.some(
    (known) => brand === known.toLowerCase() || brand.includes(known.toLowerCase())
  );
}

export interface VisionStats {
  attempted: number;
  cached: number;
  identified: number;
  rejected: number;
}

/**
 * Fills in `brand`/`model` on listings text could not identify, in place.
 *
 * Marketplace goes first: it is the source with the vaguest titles and the one that most needs it.
 */
export async function identifyChairsFromImages(
  listings: ChairListing[],
  needsHelp: (listing: ChairListing) => boolean
): Promise<VisionStats> {
  const stats: VisionStats = { attempted: 0, cached: 0, identified: 0, rejected: 0 };
  if (process.env.CHAIR_VISION_ENABLED === "0" || !geminiConfigured()) return stats;

  const candidates = listings
    .filter((listing) => listing.image && needsHelp(listing))
    .sort((a, b) => Number(b.source === "facebook") - Number(a.source === "facebook"));

  for (const listing of candidates) {
    if (stats.attempted >= MAX_CALLS) break;
    const key = imageKey(listing.image!);

    const cached = await ChairVisionGuessModel.findOne({ imageKey: key }).lean();
    if (cached) {
      stats.cached++;
      if (cached.accepted) {
        listing.brand = cached.brand;
        listing.model = cached.model;
        listing.attributes = { ...listing.attributes, IDENTIFIED_BY: "image" };
        stats.identified++;
      }
      continue;
    }

    const image = await fetchImage(listing.image!, MAX_IMAGE_BYTES);
    if (!image) continue;
    stats.attempted++;

    const reply = await askWithImage(`${PROMPT}\n\nTítulo de la publicación: ${listing.title}`, image, 60_000);
    const guess = reply ? parseGuess(reply) : null;
    const accepted = acceptableGuess(guess);

    await ChairVisionGuessModel.updateOne(
      { imageKey: key },
      {
        $set: {
          imageKey: key,
          imageUrl: listing.image,
          listingId: listing.listingId,
          title: listing.title,
          brand: guess?.brand ?? "",
          model: guess?.model ?? "",
          kind: guess?.kind ?? "",
          confidence: guess?.confidence ?? 0,
          accepted,
          guessedAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (accepted && guess) {
      listing.brand = guess.brand;
      listing.model = guess.model;
      listing.attributes = { ...listing.attributes, IDENTIFIED_BY: "image" };
      stats.identified++;
    } else {
      stats.rejected++;
    }
  }
  return stats;
}

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

const sha1 = (value: string | Buffer): string => createHash("sha1").update(value).digest("hex");
const imageKey = (url: string): string => sha1(url);

/**
 * A cached guess for this listing, found without spending anything.
 *
 * Two keys, because neither alone is enough: the URL is stable for MercadoLibre and the
 * storefronts but rotates per scrape on Facebook's CDN, while the listing id is stable everywhere
 * but only exists once we have seen that exact listing before.
 */
async function findCachedGuess(listing: ChairListing): Promise<CachedGuess | null> {
  const or: Array<Record<string, string>> = [{ imageKey: imageKey(listing.image!) }];
  if (listing.listingId) or.push({ listingId: listing.listingId });
  return (await ChairVisionGuessModel.findOne({ $or: or }).lean()) as CachedGuess | null;
}

interface CachedGuess {
  brand: string;
  model: string;
  kind?: string;
  confidence?: number;
  contentHash?: string;
  accepted: boolean;
}

/** Copies a known verdict onto the listing. */
function applyGuess(listing: ChairListing, guess: { brand: string; model: string }): void {
  listing.brand = guess.brand;
  listing.model = guess.model;
  listing.attributes = { ...listing.attributes, IDENTIFIED_BY: "image" };
}

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
  /** Calls that never came back (quota, timeout). Not cached, so they are retried next run. */
  failed: number;
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
  const stats: VisionStats = { attempted: 0, cached: 0, identified: 0, rejected: 0, failed: 0 };
  if (process.env.CHAIR_VISION_ENABLED === "0" || !geminiConfigured()) return stats;

  const candidates = listings
    .filter((listing) => listing.image && needsHelp(listing))
    .sort((a, b) => Number(b.source === "facebook") - Number(a.source === "facebook"));

  for (const listing of candidates) {
    if (stats.attempted >= MAX_CALLS) break;
    const key = imageKey(listing.image!);

    const cached = await findCachedGuess(listing);
    if (cached) {
      stats.cached++;
      if (cached.accepted) {
        applyGuess(listing, cached);
        stats.identified++;
      }
      continue;
    }

    const image = await fetchImage(listing.image!, MAX_IMAGE_BYTES);
    if (!image) continue;

    // Downloading is free; the model call is not. A photo we have already read under a different
    // URL — a re-signed Facebook link, or the manufacturer shot four storefronts share — is
    // recognised here by its bytes and answered from the cache.
    const contentHash = sha1(image.data);
    const seen = (await ChairVisionGuessModel.findOne({ contentHash }).lean()) as CachedGuess | null;
    if (seen) {
      stats.cached++;
      if (seen.accepted) {
        applyGuess(listing, seen);
        stats.identified++;
      }
      // Record this URL and listing as the same photo, so the next run answers before downloading.
      await ChairVisionGuessModel.updateOne(
        { imageKey: key },
        {
          $set: {
            imageKey: key,
            contentHash,
            imageUrl: listing.image,
            listingId: listing.listingId,
            title: listing.title,
            brand: seen.brand,
            model: seen.model,
            kind: seen.kind ?? "",
            confidence: seen.confidence ?? 0,
            raw: "alias",
            accepted: seen.accepted,
            guessedAt: new Date(),
          },
        },
        { upsert: true }
      );
      continue;
    }

    stats.attempted++;

    const reply = await askWithImage(`${PROMPT}\n\nTítulo de la publicación: ${listing.title}`, image, 60_000);
    // A quota error (429) or a timeout is NOT an answer. Caching it would mark the photo as
    // "unidentifiable" for good and the chair would never get another chance.
    if (!reply) {
      stats.failed++;
      // Five straight failures with nothing to show means the provider is refusing us (quota),
      // not that the photos are unreadable. Stop rather than spend the rest of the budget on 429s.
      if (stats.failed >= 5 && stats.identified === 0 && stats.rejected === 0) break;
      continue;
    }
    const guess = parseGuess(reply);
    const accepted = acceptableGuess(guess);

    await ChairVisionGuessModel.updateOne(
      { imageKey: key },
      {
        $set: {
          imageKey: key,
          contentHash,
          imageUrl: listing.image,
          listingId: listing.listingId,
          title: listing.title,
          brand: guess?.brand ?? "",
          model: guess?.model ?? "",
          kind: guess?.kind ?? "",
          confidence: guess?.confidence ?? 0,
          raw: reply.slice(0, 500),
          accepted,
          guessedAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (accepted && guess) {
      applyGuess(listing, guess);
      stats.identified++;
    } else {
      stats.rejected++;
    }
  }
  return stats;
}

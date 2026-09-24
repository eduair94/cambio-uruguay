// One short-video post — a TikTok video, an Instagram post or reel, a Facebook reel — in the shape
// every social harvester works with, and the offer it becomes.
//
// The networks disagree on everything except what matters here: a public handle, a caption, a
// publication date, a cover image and the post's own URL. Nothing about the author beyond the
// handle and the display name is kept: no follower counts, no bio, no contacts.
import { advertiserClassification, ownerDirectDeclaration } from "../../advertiser";
import { rentalDescription, rentalOfferDetails } from "../../details";
import { RENTAL_SOURCE_LABEL, type RawRental } from "../../types";
import type { CaptionFacts } from "./caption";

export type SocialSource = "tiktok" | "instagram" | "facebookreels";

/**
 * The order in which the copy guard (copies.ts) keeps a flat that more than one network carries,
 * when nothing was published before: TikTok first (the first social source, the one the
 * directory already shows), then Instagram, then Facebook Reels.
 */
export const SOCIAL_SOURCES: readonly SocialSource[] = ["tiktok", "instagram", "facebookreels"];

export interface SocialPost {
  source: SocialSource;
  /** The network's own id: TikTok video id, Instagram shortcode, Facebook post id. */
  id: string;
  /** The post's own public URL: the link the directory shows. */
  url: string;
  /** Caption lines as the network splits them, or the whole caption as one line. */
  lines: string[];
  /** Unix seconds: the real publication date, which no portal gives us. */
  createTime: number;
  /** uniqueId = public handle, nickname = display name, secUid = the network's stable id ("" when none). */
  author: { uniqueId: string; nickname: string; secUid: string };
  /** A signed cover image (they expire within days); null when the post carries none. */
  cover: string | null;
  hashtags: string[];
  /** When the network's own page was last read; absent means "just now". Rebuilt posts keep theirs. */
  fetchedAt?: string;
}

export interface PostGeo {
  latitude: number;
  longitude: number;
  /** The INE barrio the point falls in, when the caption named none. */
  neighborhood?: string;
}

/** Hashtags written in a caption, once each, in order. */
export function hashtagsIn(text: string): string[] {
  const out: string[] = [];
  for (const match of String(text || "").matchAll(/#([\p{L}\p{N}_]{2,60})/gu)) {
    if (!out.includes(match[1]!)) out.push(match[1]!);
  }
  return out.slice(0, 40);
}

/** A contact prompt left dangling at the end of a title once its number was scrubbed ("… - WhatsApp"). */
const CONTACT_TAIL = /[\s\-–—|:,.]*(?:(?:whats?app|wpp|wsp|cel(?:ular)?|tel(?:[eé]fono)?|contacto|consultas?|ll[aá]manos|escr[ií]benos)[\s\-–—|:,.]*)*$/i;

/**
 * The title as it may be published: the first line of a caption often ends with the phone
 * ("ALQUILER POCITOS … $25.000 - WhatsApp 099 232 050"), and titles are not cleaned downstream.
 * Same scrub as the description (details.ts), then the dangling prompt goes.
 */
export function publicTitle(text: string): string {
  return rentalDescription(text, 200).replace(/\s+/g, " ").replace(CONTACT_TAIL, "").trim();
}

/**
 * The offer, or null when the caption is not a publishable rental. Contacts never cross: the
 * description and the title are sanitised, and `agency`/`publicContact` stay uninspected (`undefined`).
 */
export function postToRawRental(post: SocialPost, facts: CaptionFacts, geo: PostGeo | null, observedAt: string): RawRental | null {
  if (facts.rejected || facts.price === null || !facts.currency) return null;
  const body = post.lines.join("\n");
  const url = post.url;
  const title = publicTitle(facts.title) || `Alquiler en ${RENTAL_SOURCE_LABEL[post.source]} (@${post.author.uniqueId})`;
  const neighborhood = facts.neighborhood || (geo && geo.neighborhood) || "";
  // Only Montevideo has INE areas, so a barrio derived from a point implies the department.
  const department = facts.department || (geo && geo.neighborhood ? "Montevideo" : "");
  return {
    source: post.source,
    listingId: `${post.source}:${post.id}`,
    url,
    title,
    price: facts.price,
    currency: facts.currency,
    commonExpenses: facts.commonExpenses,
    commonExpensesCurrency: facts.commonExpensesCurrency,
    sellerName: post.author.nickname || post.author.uniqueId,
    // Only what the caption itself declares; the account name never makes anyone an agency.
    sellerType: advertiserClassification({ title, description: body }).sellerType,
    ownerDirect: ownerDirectDeclaration({ title, description: body }, url, observedAt) ?? undefined,
    image: post.cover,
    publishedAt: new Date(post.createTime * 1000).toISOString().slice(0, 10),
    propertyType: facts.propertyType,
    department,
    neighborhood,
    address: "",
    street: "",
    streetNumber: "",
    latitude: geo ? geo.latitude : null,
    longitude: geo ? geo.longitude : null,
    bedrooms: facts.bedrooms,
    bathrooms: facts.bathrooms,
    area: facts.area,
    parkingSpaces: null,
    furnished: null,
    petsAllowed: null,
    guarantees: facts.guarantees,
    description: rentalDescription(body, 4_000),
    details: rentalOfferDetails({ description: body, images: post.cover ? [post.cover] : [] }),
  };
}

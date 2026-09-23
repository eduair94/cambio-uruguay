// One TikTok video, in the shape the harvester works with, and the offer it becomes.
//
// `itemStruct` is the same object whether it came from a list API answer (`/api/post/item_list/`,
// `/api/challenge/item_list/`) or from the JSON a video page embeds, so one normaliser serves the
// browser reader and the plain-HTTP reader. Nothing about the author beyond the public handle and
// display name is kept: no follower counts, no bio, no contacts.
import { advertiserClassification, ownerDirectDeclaration } from "../../advertiser";
import { rentalDescription, rentalOfferDetails } from "../../details";
import type { RawRental } from "../../types";
import type { CaptionFacts } from "./caption";

export interface TiktokPost {
  id: string;
  /** Caption lines as TikTok splits them (`contents[].desc`), or the whole caption as one line. */
  lines: string[];
  /** Unix seconds: the real publication date, which no portal gives us. */
  createTime: number;
  author: { uniqueId: string; nickname: string; secUid: string };
  /** The signed cover image (expires in ~36–48 h); null when the item carries none. */
  cover: string | null;
  hashtags: string[];
}

export interface PostGeo {
  latitude: number;
  longitude: number;
  /** The INE barrio the point falls in, when the caption named none. */
  neighborhood?: string;
}

const text = (value: unknown, max = 4_000): string => (typeof value === "string" ? value.slice(0, max).trim() : "");
const HTTPS = /^https:\/\/[^\s"'<>]+$/;

export function postFromItemStruct(raw: unknown): TiktokPost | null {
  const item = raw as {
    id?: unknown; desc?: unknown; createTime?: unknown;
    author?: { uniqueId?: unknown; nickname?: unknown; secUid?: unknown };
    video?: { cover?: unknown; originCover?: unknown };
    textExtra?: unknown; contents?: unknown;
  } | null;
  const id = text(item?.id, 32);
  const uniqueId = text(item?.author?.uniqueId, 80);
  const createTime = Number(item?.createTime);
  if (!/^\d{6,25}$/.test(id) || !/^[\w.-]{1,80}$/.test(uniqueId) || !Number.isFinite(createTime) || createTime <= 0) return null;
  const desc = text(item?.desc);
  const contents = Array.isArray(item?.contents)
    ? item!.contents.map(part => text((part as { desc?: unknown } | null)?.desc)).filter(Boolean)
    : [];
  const lines = contents.length ? contents : desc ? [desc] : [];
  const hashtags = Array.isArray(item?.textExtra)
    ? item!.textExtra.map(tag => text((tag as { hashtagName?: unknown } | null)?.hashtagName, 80)).filter(Boolean)
    : [];
  const cover = [item?.video?.cover, item?.video?.originCover].map(value => text(value, 2_048)).find(value => HTTPS.test(value)) ?? null;
  return {
    id,
    lines,
    createTime: Math.floor(createTime),
    author: { uniqueId, nickname: text(item?.author?.nickname, 120) || uniqueId, secUid: text(item?.author?.secUid, 200) },
    cover,
    hashtags,
  };
}

export const postUrl = (post: TiktokPost): string => `https://www.tiktok.com/@${post.author.uniqueId}/video/${post.id}`;

/**
 * The offer, or null when the caption is not a publishable rental. Contacts never cross: the
 * description is sanitised, and `agency`/`publicContact` stay uninspected (`undefined`).
 */
export function postToRawRental(post: TiktokPost, facts: CaptionFacts, geo: PostGeo | null, observedAt: string): RawRental | null {
  if (facts.rejected || facts.price === null || !facts.currency) return null;
  const body = post.lines.join("\n");
  const url = postUrl(post);
  const title = facts.title || `Alquiler en TikTok (@${post.author.uniqueId})`;
  const neighborhood = facts.neighborhood || (geo && geo.neighborhood) || "";
  // Only Montevideo has INE areas, so a barrio derived from a point implies the department.
  const department = facts.department || (geo && geo.neighborhood ? "Montevideo" : "");
  return {
    source: "tiktok",
    listingId: `tiktok:${post.id}`,
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

// One TikTok video, normalised into the shared social post (../social/post.ts).
//
// `itemStruct` is the same object whether it came from a list API answer (`/api/post/item_list/`,
// `/api/challenge/item_list/`) or from the JSON a video page embeds, so one normaliser serves the
// browser reader and the plain-HTTP reader.
import type { SocialPost } from "../social/post";

export { postToRawRental, type PostGeo, type SocialPost as TiktokPost } from "../social/post";

const text = (value: unknown, max = 4_000): string => (typeof value === "string" ? value.slice(0, max).trim() : "");
const HTTPS = /^https:\/\/[^\s"'<>]+$/;

export function postFromItemStruct(raw: unknown): SocialPost | null {
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
    source: "tiktok",
    id,
    url: `https://www.tiktok.com/@${uniqueId}/video/${id}`,
    lines,
    createTime: Math.floor(createTime),
    author: { uniqueId, nickname: text(item?.author?.nickname, 120) || uniqueId, secUid: text(item?.author?.secUid, 200) },
    cover,
    hashtags,
  };
}

export const postUrl = (post: SocialPost): string => post.url;

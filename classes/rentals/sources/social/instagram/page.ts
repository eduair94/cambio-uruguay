// Instagram pages, logged out, as a real browser receives them.
//
// Measured 2026-09-24 (docs/superpowers/specs/2026-09-24-rentals-social-design.md):
//   * a profile page (`/<handle>/`) lists the account's 12 latest posts as links, and its <title>
//     says "<Name> (@<handle>) • Fotos y videos de Instagram"; a handle that does not exist answers
//     "Profile no está disponible • Instagram" (cap.propiedades, zamar.inmo);
//   * a post page (`/p/<code>/`) embeds, in `<script type="application/json">`, the post's node —
//     `code`, `caption.text`, `taken_at`, `user.{username, full_name, pk}`, `product_type`
//     (`clips` for a reel), `image_versions2.candidates[0].url` — AND the nodes of other posts of
//     the account. The first `code` in the page is not necessarily the one asked for.
//   * hashtag pages redirect to login and `/api/v1/users/web_profile_info` answers 429: neither is
//     used.
import { hashtagsIn, type SocialPost } from "../post";
import type { SocialPostRow } from "../store";

export interface InstagramProfile {
  exists: boolean;
  name: string;
  /** Post codes in the order the profile lists them, once each. */
  codes: string[];
}

const MISSING = /no está disponible|isn't available|not available|página no disponible/i;
const HTTPS = /^https:\/\/[^\s"'<>]+$/;
const USERNAME = /^[\w.]{1,30}$/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = Record<string, any>;

function* walk(node: unknown): Generator<Node> {
  if (node && typeof node === "object") {
    yield node as Node;
    for (const value of Array.isArray(node) ? node : Object.values(node)) yield* walk(value);
  }
}

function* embeddedJson(html: string): Generator<unknown> {
  for (const match of String(html || "").matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      yield JSON.parse(match[1]!);
    } catch {
      /* not JSON, or truncated: skip it */
    }
  }
}

const titleOf = (html: string): string =>
  (/<title>([^<]*)<\/title>/i.exec(String(html || ""))?.[1] ?? "").replace(/&amp;/g, "&").replace(/&#064;/g, "@").replace(/&#x2022;/g, "•").trim();

/** The profile, or null when the page is not this account's profile (a login wall, a challenge). */
export function parseInstagramProfile(html: string, handle: string): InstagramProfile | null {
  const title = titleOf(html);
  if (MISSING.test(title)) return { exists: false, name: "", codes: [] };
  const lower = title.toLowerCase();
  const marker = `(@${handle.toLowerCase()})`;
  const at = lower.indexOf(marker);
  if (at < 0) return null;
  const codes: string[] = [];
  for (const match of String(html).matchAll(/\/(?:p|reel)\/([A-Za-z0-9_-]{8,20})\//g)) {
    if (!codes.includes(match[1]!)) codes.push(match[1]!);
  }
  return { exists: true, name: title.slice(0, at).trim(), codes };
}

/** The post whose code is `code`, from its own page; null when the page does not carry it. */
export function postFromInstagramHtml(html: string, code: string): SocialPost | null {
  for (const data of embeddedJson(html)) {
    for (const node of walk(data)) {
      if (node.code !== code || typeof node.taken_at !== "number") continue;
      const username = typeof node.user?.username === "string" ? node.user.username : "";
      if (!USERNAME.test(username)) continue;
      const text = typeof node.caption?.text === "string" ? node.caption.text.slice(0, 4_000) : "";
      const image = node.image_versions2?.candidates?.[0]?.url;
      const fullName = typeof node.user?.full_name === "string" ? node.user.full_name.trim().slice(0, 120) : "";
      return {
        source: "instagram",
        id: code,
        url: node.product_type === "clips" ? `https://www.instagram.com/reel/${code}/` : `https://www.instagram.com/p/${code}/`,
        lines: text.split(/\n+/).map((line: string) => line.trim()).filter(Boolean),
        createTime: Math.floor(node.taken_at),
        author: { uniqueId: username, nickname: fullName || username, secUid: node.user?.pk ? String(node.user.pk) : "" },
        cover: typeof image === "string" && HTTPS.test(image) ? image : null,
        hashtags: hashtagsIn(text),
      };
    }
  }
  return null;
}

/** A post read on an earlier run, rebuilt from its memory row so it is not read again. */
export function postFromInstagramMemory(row: SocialPostRow): SocialPost | null {
  if (!row || !row.id || !row.text || !row.uniqueId || !row.createTime) return null;
  return {
    source: "instagram",
    id: row.id,
    url: row.url || `https://www.instagram.com/p/${row.id}/`,
    lines: row.text.split(/\n+/).filter(Boolean),
    createTime: row.createTime,
    author: { uniqueId: row.uniqueId, nickname: row.authorName || row.uniqueId, secUid: "" },
    cover: row.image || null,
    hashtags: row.hashtags || [],
    fetchedAt: row.fetchedAt || row.readAt,
  };
}

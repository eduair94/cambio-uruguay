// Facebook video search and hashtag pages, logged out, as a real browser receives them.
//
// Measured 2026-09-24 from the VPS (its own IP and through the proxy alike): `/watch/search/?q=…`
// answers 8 MB of HTML behind a login overlay, and every result embeds its whole Story in a
// `<script type="application/json">` — `post_id`, `message.text` (the full caption), `actors[0]`
// (name, id, url), and, under `attachments[…].styles.attachment.media`, the `videoId`,
// `publish_time` and `thumbnailImage.uri`, with the reel's `permalink_url`. About five stories per
// page: the rest of the list loads only after scrolling, which a logged-out visitor does not get.
// The search repeats nodes, and hashtag pages mix in PHOTO posts: only stories with a video are
// reels.
import { hashtagsIn, type SocialPost } from "../post";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = Record<string, any>;

function* walk(node: unknown): Generator<Node> {
  if (node && typeof node === "object") {
    yield node as Node;
    for (const value of Array.isArray(node) ? node : Object.values(node)) yield* walk(value);
  }
}

const DIGITS = /^\d{3,25}$/;
const HTTPS = /^https:\/\/[^\s"'<>]+$/;
const REEL_URL = /^https:\/\/www\.facebook\.com\/(?:reel\/\d+|watch\/?\?v=\d+|[^/?#]+\/videos\/\d+)/;

/** The account's public handle from its profile URL: the page slug, or the numeric id of a `people/` or `profile.php` URL. */
function handleOf(url: unknown, id: string): string {
  try {
    const parsed = new URL(String(url || ""));
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "people" && parts[2] && DIGITS.test(parts[2])) return parts[2];
    if (parts[0] === "profile.php") return parsed.searchParams.get("id") || id;
    if (parts[0] && /^[\w.-]{2,80}$/.test(parts[0])) return parts[0];
  } catch {
    /* no URL: fall back to the id */
  }
  return id;
}

export function reelsFromFacebookHtml(html: string): SocialPost[] {
  const out = new Map<string, SocialPost>();
  for (const match of String(html || "").matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data: unknown;
    try {
      data = JSON.parse(match[1]!);
    } catch {
      continue;
    }
    for (const story of walk(data)) {
      if (typeof story.post_id !== "string" || !DIGITS.test(story.post_id) || out.has(story.post_id)) continue;
      if (typeof story.message?.text !== "string" || !Array.isArray(story.actors)) continue;
      let videoId = "";
      let publish = 0;
      let thumb = "";
      let permalink = "";
      for (const node of walk(story)) {
        if (!videoId && typeof node.videoId === "string" && DIGITS.test(node.videoId)) videoId = node.videoId;
        if (typeof node.publish_time === "number") publish = Math.max(publish, node.publish_time);
        if (typeof node.creation_time === "number") publish = Math.max(publish, node.creation_time);
        if (!thumb && typeof node.thumbnailImage?.uri === "string") thumb = node.thumbnailImage.uri;
        if (!permalink && typeof node.permalink_url === "string" && REEL_URL.test(node.permalink_url)) permalink = node.permalink_url;
      }
      // A photo post is not a reel; a story without a date cannot be put in a window.
      if (!videoId || !publish) continue;
      const actor: Node = story.actors[0] || {};
      const actorId = actor.id ? String(actor.id) : "";
      const text = story.message.text.slice(0, 4_000);
      out.set(story.post_id, {
        source: "facebookreels",
        id: story.post_id,
        url: permalink || `https://www.facebook.com/reel/${videoId}/`,
        lines: text.split(/\n+/).map((line: string) => line.trim()).filter(Boolean),
        createTime: Math.floor(publish),
        author: { uniqueId: handleOf(actor.url, actorId), nickname: typeof actor.name === "string" ? actor.name.trim().slice(0, 120) : "", secUid: actorId },
        cover: HTTPS.test(thumb) ? thumb : null,
        hashtags: hashtagsIn(text),
      });
    }
  }
  return [...out.values()];
}

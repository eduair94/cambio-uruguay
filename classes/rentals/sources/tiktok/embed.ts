// A TikTok account's latest videos, over plain HTTP: the creator embed.
//
// Measured 2026-09-25 from the VPS, its own IP, no proxy, no browser: `GET /embed/@<handle>` with
// a browser UA answered 200 for 36 of 36 accounts of the registry and embeds, in
// `<script id="__FRONTITY_CONNECT_STATE__">`, the account (`userInfo`) and its latest videos
// (`videoList`: id, the WHOLE caption in `desc`, signed covers) — 265 videos of the last 45 days,
// where the browser path had read zero accounts ever (every account list came back empty from
// this IP, through the proxy too). A handle that does not exist answers 400 with
// `pageName: "error"`, which is not a network failure.
//
// What the embed does not give is the date. A TikTok id carries it: its high 32 bits are the
// Unix second of publication (checked against the list API's `createTime` on stored videos: the
// same second, give or take a dozen). And it shows the latest ten or so videos, pinned ones
// included, so an account is read "to the end of its window" only when the list is shorter
// than that (the account has no more) or reaches well past the window.
import { hashtagsIn, type SocialPost } from "../social/post";
import { sleep } from "../social/chrome";
import type { ListRead } from "./browser";
import { TIKTOK_HEADERS } from "./page";

export interface CreatorRead extends ListRead {
  /** false when TikTok says the account does not exist; null when the page could not tell. */
  exists: boolean | null;
  nickname: string;
}

export interface AccountPlan {
  accounts: string[];
  minCreateTime: number;
  gapMs: number;
  budgetMs: number;
}

export type AccountReader = (plan: AccountPlan) => Promise<Map<string, CreatorRead>>;

/** The page shows about ten; fewer means the account has no more. */
const PAGE = 10;
/** TikTok pins up to three videos, so a list that merely contains old ones may still stop short. */
const PAST_WINDOW = 4;
const STATE = /<script id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/;
const ID = /^\d{15,25}$/;
const HANDLE = /^[\w.-]{1,80}$/;
const HTTPS = /^https:\/\/[^\s"'<>]+$/;

const text = (value: unknown, max: number): string => (typeof value === "string" ? value.slice(0, max).trim() : "");

/** Unix seconds of publication from the id. Number() rounds a 19-digit id by at most 2^10: seconds are exact. */
export function createTimeFromId(id: string): number {
  return ID.test(id) ? Math.floor(Number(id) / 4_294_967_296) : 0;
}

interface EmbedUser { uniqueId?: unknown; nickname?: unknown; id?: unknown; privateAccount?: unknown }
interface EmbedVideo { id?: unknown; desc?: unknown; coverUrl?: unknown; originCoverUrl?: unknown; privateItem?: unknown; authorUniqueId?: unknown }
interface EmbedPage { isError?: unknown; pageName?: unknown; userInfo?: EmbedUser; videoList?: unknown }

function postFromEmbedVideo(video: EmbedVideo, user: EmbedUser, handle: string): SocialPost | null {
  const id = text(video.id, 32);
  const createTime = createTimeFromId(id);
  // Before 2016 is not a TikTok id.
  if (!createTime || createTime < 1_451_606_400 || video.privateItem === true) return null;
  const uniqueId = text(video.authorUniqueId, 80) || text(user.uniqueId, 80) || handle;
  if (!HANDLE.test(uniqueId)) return null;
  const desc = text(video.desc, 4_000);
  const cover = [video.coverUrl, video.originCoverUrl].map(value => text(value, 2_048)).find(value => HTTPS.test(value)) ?? null;
  return {
    source: "tiktok",
    id,
    url: `https://www.tiktok.com/@${uniqueId}/video/${id}`,
    lines: desc ? [desc] : [],
    createTime,
    author: { uniqueId, nickname: text(user.nickname, 120) || uniqueId, secUid: "" },
    cover,
    hashtags: hashtagsIn(desc),
  };
}

export function parseCreatorEmbed(html: string, handle: string, minCreateTime: number): CreatorRead {
  const unreadable = (failure: string): CreatorRead => ({ posts: [], pages: 0, exhausted: false, failure, exists: null, nickname: "" });
  const match = STATE.exec(String(html || ""));
  if (!match) return unreadable("sin estado en la página");
  let page: EmbedPage | undefined;
  try {
    const state = JSON.parse(match[1]!) as { source?: { data?: Record<string, EmbedPage> } };
    const data = state.source && state.source.data ? state.source.data : {};
    page = data[`/embed/@${handle}`] || Object.values(data)[0];
  } catch {
    return unreadable("estado ilegible");
  }
  if (!page) return unreadable("estado sin datos");
  if (page.isError === true || page.pageName === "error") return { posts: [], pages: 1, exhausted: true, failure: null, exists: false, nickname: "" };
  const user: EmbedUser = page.userInfo || {};
  const nickname = text(user.nickname, 120);
  // A private account shows nothing to anyone: there is nothing left to read.
  if (user.privateAccount === true) return { posts: [], pages: 1, exhausted: true, failure: null, exists: true, nickname };
  const videos = Array.isArray(page.videoList) ? (page.videoList as EmbedVideo[]) : [];
  const posts = videos.map(video => postFromEmbedVideo(video || {}, user, handle)).filter((post): post is SocialPost => !!post);
  const old = posts.filter(post => post.createTime < minCreateTime).length;
  return { posts, pages: 1, exhausted: videos.length < PAGE || old >= PAST_WINDOW, failure: null, exists: true, nickname };
}

/** Accounts one after another with a pause; a run of network failures means the embed is down, and the rest is left for tomorrow. */
export async function readCreatorEmbeds(
  plan: AccountPlan,
  fetchImpl: typeof fetch = fetch,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<Map<string, CreatorRead>> {
  const out = new Map<string, CreatorRead>();
  const deadline = Date.now() + plan.budgetMs;
  let failuresInARow = 0;
  for (const [index, handle] of plan.accounts.entries()) {
    if (!HANDLE.test(handle)) continue;
    if (Date.now() > deadline || failuresInARow >= 5) break;
    if (index > 0) await wait(plan.gapMs);
    let read: CreatorRead;
    try {
      const response = await fetchImpl(`https://www.tiktok.com/embed/@${encodeURIComponent(handle)}`, {
        headers: TIKTOK_HEADERS, redirect: "follow", signal: AbortSignal.timeout(30_000),
      });
      read = parseCreatorEmbed(await response.text(), handle, plan.minCreateTime);
      if (read.failure && !response.ok) read = { ...read, failure: `HTTP ${response.status}` };
    } catch (error) {
      read = { posts: [], pages: 0, exhausted: false, failure: `red: ${String((error as Error)?.name || "Error")}`, exists: null, nickname: "" };
    }
    failuresInARow = read.failure ? failuresInARow + 1 : 0;
    out.set(handle, read);
  }
  return out;
}

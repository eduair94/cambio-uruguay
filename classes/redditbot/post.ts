// The write side of Reddit. Separate module, separate credentials, separate token cache.
//
// `classes/reddit.ts` authenticates with the app-only `installed_client` grant — no account behind
// it, and Reddit will not let it comment. Posting needs a USER token, which means a "script" app
// plus either the account's password or a refresh token. Keeping the two clients apart is not
// tidiness: it means a typo in the bot's credentials cannot break the harvesting jobs that six
// other features already depend on, and the read side keeps working while the bot is unconfigured.
//
// Reddit's rules for bots are the reason for the pacing here: one action at a time, a real gap
// between them, a descriptive User-Agent, and `retry-after` obeyed. An account that ignores those
// gets rate-limited first and banned second.

import { botConfig, botCredentialsPresent, type BotConfig } from "./config";
import { looksLikeBan } from "./subrules";

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const API = "https://oauth.reddit.com";
const MIN_GAP_MS = 2000;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 20000;

let cachedToken: { value: string; expiresAt: number } | null = null;
let lastCallAt = 0;
let queue: Promise<unknown> = Promise.resolve();

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Test seam: drop the token cache and the throttle clock. */
export function __resetRedditBotForTests(): void {
  cachedToken = null;
  lastCallAt = 0;
  queue = Promise.resolve();
}

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCallAt);
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run as Promise<T>;
}

/**
 * A user access token. `null` when unconfigured or when Reddit refused.
 *
 * A refresh token is preferred when present: it survives a password change, and it is the only
 * option for an account with 2FA enabled (the password grant would need the OTP appended to the
 * password, which is unusable from a cron).
 */
async function userToken(cfg: BotConfig): Promise<string | null> {
  if (!botCredentialsPresent(cfg)) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const body = cfg.refreshToken
    ? new URLSearchParams({ grant_type: "refresh_token", refresh_token: cfg.refreshToken })
    : new URLSearchParams({ grant_type: "password", username: cfg.username, password: cfg.password });

  try {
    const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
    const res = await throttled(() =>
      fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": cfg.userAgent,
        },
        body: body.toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    );
    if (!res.ok) {
      // 401 here is almost always the app type: a "web app" or "installed app" cannot use the
      // password grant at all. Say so, because the generic message sends people to check the
      // password they just typed correctly.
      console.warn(
        `[redditbot] token request failed (${res.status}). If this is 401, check that the Reddit app is ` +
          `of type "script" and that the bot account is its developer.`
      );
      return null;
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json?.access_token) return null;
    cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return cachedToken.value;
  } catch (e) {
    console.warn("[redditbot] token request threw:", e);
    cachedToken = null;
    return null;
  }
}

interface CommentResponse {
  json?: {
    errors?: Array<[string, string, string?]>;
    data?: { things?: Array<{ data?: { id?: string; name?: string; permalink?: string } }> };
  };
}

export interface PostedComment {
  id: string;
  /** The `t1_…` fullname, which is what /api/info wants later. */
  fullname: string;
  permalink: string;
}

/**
 * Comment on a submission. `null` on any failure, with the reason logged.
 *
 * The caller has already decided this is allowed; this function only performs it.
 */
export async function postComment(postId: string, markdown: string, cfg: BotConfig = botConfig()): Promise<PostedComment | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const token = await userToken(cfg);
    if (!token) return null;

    try {
      const res = await throttled(() =>
        fetch(`${API}/api/comment`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": cfg.userAgent,
          },
          body: new URLSearchParams({ api_type: "json", thing_id: `t3_${postId}`, text: markdown }).toString(),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      );

      if (res.status === 401) {
        cachedToken = null;
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 60_000) : 3000 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        console.warn(`[redditbot] comment failed with HTTP ${res.status}`);
        return null;
      }

      const json = (await res.json()) as CommentResponse;
      const errors = json?.json?.errors ?? [];
      if (errors.length) {
        // RATELIMIT is Reddit telling a young account to slow down; it is not a bug, and retrying
        // inside the same run would only deepen it. Every other error (SUBREDDIT_NOTALLOWED,
        // THREAD_LOCKED, BANNED_FROM_SUBREDDIT) is terminal for this thread.
        console.warn(`[redditbot] Reddit refused the comment: ${errors.map((e) => e.join(": ")).join(" | ")}`);
        return null;
      }

      const thing = json?.json?.data?.things?.[0]?.data;
      if (!thing?.id) {
        console.warn("[redditbot] Reddit accepted the comment but returned no id");
        return null;
      }
      return {
        id: thing.id,
        fullname: thing.name || `t1_${thing.id}`,
        permalink: thing.permalink ? `https://reddit.com${thing.permalink}` : "",
      };
    } catch (e) {
      console.warn("[redditbot] comment threw:", e);
      if (attempt === MAX_ATTEMPTS - 1) return null;
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

export interface CommentState {
  score: number;
  removed: boolean;
}

/**
 * Current state of comments we posted. Keyed by fullname (`t1_…`).
 *
 * A removed comment is not reported as removed by the API — it simply comes back with its body
 * replaced by `[removed]`, or does not come back at all. Both are treated as removal, because both
 * mean the comment is not doing its job and the calibration needs looking at.
 */
export async function fetchCommentStates(
  fullnames: readonly string[],
  cfg: BotConfig = botConfig()
): Promise<Map<string, CommentState>> {
  const out = new Map<string, CommentState>();
  if (!fullnames.length) return out;

  const token = await userToken(cfg);
  if (!token) return out;

  for (let i = 0; i < fullnames.length; i += 100) {
    const batch = fullnames.slice(i, i + 100);
    try {
      const url = new URL(`${API}/api/info`);
      url.searchParams.set("id", batch.join(","));
      const res = await throttled(() =>
        fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}`, "User-Agent": cfg.userAgent },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      );
      if (!res.ok) continue;
      const json = (await res.json()) as {
        data?: { children?: Array<{ data?: { name?: string; score?: number; body?: string; banned_by?: unknown } }> };
      };
      const seen = new Set<string>();
      for (const child of json?.data?.children ?? []) {
        const data = child?.data;
        if (!data?.name) continue;
        seen.add(data.name);
        const body = data.body ?? "";
        out.set(data.name, {
          score: Number.isFinite(data.score) ? Number(data.score) : 0,
          removed: body === "[removed]" || body === "[deleted]" || Boolean(data.banned_by),
        });
      }
      // Anything the API did not return at all is gone.
      for (const name of batch) if (!seen.has(name)) out.set(name, { score: 0, removed: true });
    } catch {
      // A failed check is not evidence of removal; leave those unknown rather than tripping the
      // breaker on a network blip.
    }
  }
  return out;
}

/**
 * Karma de la cuenta, o `null` si no se pudo leer.
 *
 * Vive acá porque acá vive el token de usuario. Lo usa el pase de comentarios comunes para saber
 * cuándo parar: la cuenta empieza en cero y varios AutoModerator uruguayos filtran por karma, así
 * que el número es literalmente la condición de salida de ese trabajo.
 */
export async function fetchAccountKarma(cfg: BotConfig = botConfig()): Promise<{ comment: number; link: number } | null> {
  const token = await userToken(cfg);
  if (!token) return null;
  try {
    const res = await throttled(() =>
      fetch(`${API}/api/v1/me`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": cfg.userAgent },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { comment_karma?: number; link_karma?: number };
    return { comment: Number(json?.comment_karma ?? 0), link: Number(json?.link_karma ?? 0) };
  } catch (error) {
    console.warn(`[redditbot] no se pudo leer el karma: ${(error as Error).message}`);
    return null;
  }
}

export interface LinkFlair {
  id: string;
  text: string;
}

/**
 * Los flairs que el sub ofrece para un post nuevo.
 *
 * Muchos subs los tienen en obligatorio, y un post sin flair lo saca AutoModerator antes de que lo
 * lea nadie. La lista no se puede adivinar ni hardcodear: los mods la cambian, y el id —no el
 * texto— es lo que acepta /api/submit.
 */
export async function fetchLinkFlairs(sub: string, cfg: BotConfig = botConfig()): Promise<LinkFlair[]> {
  const token = await userToken(cfg);
  if (!token) return [];
  try {
    const res = await throttled(() =>
      fetch(`${API}/r/${sub}/api/link_flair_v2`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": cfg.userAgent },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    );
    if (!res.ok) return [];
    const json = (await res.json()) as Array<{ id?: string; text?: string }>;
    return (Array.isArray(json) ? json : [])
      .map((flair) => ({ id: String(flair.id ?? ""), text: String(flair.text ?? "") }))
      .filter((flair) => flair.id && flair.text);
  } catch (error) {
    console.warn(`[redditbot] no se pudieron leer los flairs de r/${sub}: ${(error as Error).message}`);
    return [];
  }
}

export interface SubmittedPost {
  id: string;
  fullname: string;
  permalink: string;
}

/**
 * Publicar un hilo de texto.
 *
 * Un post no es un comentario más grande: es la cara de la cuenta en el sub, lo ve muchísima más
 * gente y borrarlo deja rastro. Por eso esto no reintenta: si Reddit dijo que no, la decisión de
 * volver a intentar la toma el próximo día, no un loop.
 */
export async function submitPost(
  sub: string,
  title: string,
  body: string,
  flairId = "",
  cfg: BotConfig = botConfig()
): Promise<SubmittedPost | null> {
  const token = await userToken(cfg);
  if (!token) return null;

  const form: Record<string, string> = {
    api_type: "json",
    sr: sub,
    kind: "self",
    title,
    text: body,
    // Reddit manda el aviso de "tu post está arriba" al inbox; sin esto la cuenta se llena de nada.
    sendreplies: "true",
  };
  if (flairId) form.flair_id = flairId;

  try {
    const res = await throttled(() =>
      fetch(`${API}/api/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": cfg.userAgent,
        },
        body: new URLSearchParams(form).toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    );
    const json = (await res.json()) as {
      json?: { errors?: unknown[][]; data?: { id?: string; name?: string; url?: string } };
    };
    const errors = json?.json?.errors ?? [];
    if (!res.ok || errors.length) {
      // Un ban no viene como código HTTP: viene como SUBREDDIT_NOTALLOWED dentro de un 200. Sin
      // distinguirlo, el pase lo trata como un fallo cualquiera y vuelve a intentar mañana, y
      // pasado — que es el patrón por el que un ban de sub escala a una suspensión de cuenta.
      if (looksLikeBan(errors)) {
        console.error(
          `[redditbot] r/${sub} BANEÓ a la cuenta. Agregá "${sub.toLowerCase()}" a BANNED_SUBS en ` +
            `classes/redditbot/subrules.ts antes de que el cron lo vuelva a intentar.`
        );
        return null;
      }
      console.warn(`[redditbot] Reddit rechazó el post (${res.status}): ${JSON.stringify(errors).slice(0, 300)}`);
      return null;
    }
    const data = json?.json?.data;
    if (!data?.id) return null;
    return { id: data.id, fullname: data.name ?? `t3_${data.id}`, permalink: data.url ?? "" };
  } catch (error) {
    console.warn(`[redditbot] falló el envío del post: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Borrar algo que publicamos, comentario o post.
 *
 * Hace falta de verdad, no por prolijidad: la primera vez que este pase comentó en r/AskUruguayan
 * escribió una anécdota personal inventada, en un hilo que pedía justamente eso. La regla nueva lo
 * impide de ahora en más, pero lo ya publicado había que sacarlo, y no hay forma de sacarlo sin esto.
 */
export async function deleteThing(fullname: string, cfg: BotConfig = botConfig()): Promise<boolean> {
  const token = await userToken(cfg);
  if (!token) return false;
  try {
    const res = await throttled(() =>
      fetch(`${API}/api/del`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": cfg.userAgent,
        },
        body: new URLSearchParams({ id: fullname }).toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    );
    return res.ok;
  } catch (error) {
    console.warn(`[redditbot] no se pudo borrar ${fullname}: ${(error as Error).message}`);
    return false;
  }
}

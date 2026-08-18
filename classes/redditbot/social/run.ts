// Una corrida del pase de karma.
//
// El problema que resuelve: la cuenta nació el 17 de agosto de 2026 con cero karma, y el primer
// comentario del bot —bueno, con fuentes, sin spam— volvió `[removed]` en r/uruguay y en r/Burises,
// mientras el mismo día uno en r/test se veía perfecto. No era la calidad del texto ni un shadowban:
// era una cuenta sin historial escribiendo en subs que filtran cuentas sin historial. Hasta que eso
// cambie, el bot de respuestas no tiene dónde publicar.
//
// La forma de arreglarlo es la obvia: que la cuenta participe. Comentarios comunes, en hilos que NO
// son nuestro tema, sin un solo enlace, pocos por día. Si son buenos suben el karma; si son relleno
// bajan la reputación de la cuenta y la del dominio que hay detrás. Por eso el modelo puede decir
// "no tengo nada para decir acá", y por eso hay un techo: al llegar al karma objetivo esto se apaga
// solo. Una cuenta que comenta chistes para siempre es lo que un sub reconoce como granja.
//
// Cada corrida hace tres cosas: mira si los comentarios anteriores siguen vivos (con un token
// anónimo, porque el autor ve los suyos borrados como si nada), decide si todavía hace falta karma,
// y en ese caso escribe uno solo.

import { notifyAdmin } from "../../notify";
import { fetchComments, fetchNewPosts, fetchPublicCommentBodies, type RedditPostRaw } from "../../reddit";
import { botConfig } from "../config";
import { fetchAccountKarma, postComment } from "../post";
import { composeSocial } from "./compose";
import { socialConfig, type SocialConfig } from "./config";
import {
  alreadyEngaged,
  blockedSubs,
  markVisibility,
  needsVisibilityCheck,
  recordSocial,
  socialSnapshot,
} from "./ledger";
import { authorAllowed, runAllowed, subAllowed } from "./limits";
import { newestFirst, screenSocialPost } from "./pick";
import { socialRetryHint, validateSocial } from "./validate";

export interface SocialSummary {
  fetched: number;
  candidates: number;
  karma: number | null;
  posted: string;
  note: string;
  rejected: Record<string, number>;
}

/** Hilos que se intentan por corrida. Que el modelo pase de largo es el caso normal, no un error. */
const MAX_ATTEMPTS = 3;

/**
 * Confirma con un token anónimo si lo que escribimos sigue estando.
 *
 * Es la única medición que vale. Un comentario borrado por AutoModerator se le muestra a su autor
 * exactamente igual que uno vivo —puntaje 1, cuerpo intacto— así que preguntando con las
 * credenciales del bot la respuesta es siempre "todo bien", para siempre.
 */
async function verifyVisibility(): Promise<{ checked: number; hidden: number }> {
  const pending = await needsVisibilityCheck();
  if (!pending.length) return { checked: 0, hidden: 0 };

  const bodies = await fetchPublicCommentBodies(pending.map((row) => row.commentFullname));
  let hidden = 0;
  for (const row of pending) {
    const body = bodies.get(row.commentFullname);
    const visible = body !== undefined && body !== "[removed]" && body !== "[deleted]";
    if (!visible) hidden++;
    await markVisibility(row.postId, visible, 0);
  }
  return { checked: pending.length, hidden };
}

export async function runSocialPass(cfg: SocialConfig = socialConfig()): Promise<SocialSummary> {
  const rejected: Record<string, number> = {};
  const reject = (reason: string): void => {
    rejected[reason] = (rejected[reason] ?? 0) + 1;
  };
  const summary: SocialSummary = { fetched: 0, candidates: 0, karma: null, posted: "", note: "", rejected };

  if (!cfg.enabled) return { ...summary, note: "apagado (REDDIT_BOT_ENABLED)" };

  const seen = await verifyVisibility();
  if (seen.checked) console.log(`[social] verificados ${seen.checked} comentarios, ${seen.hidden} invisibles`);

  // ¿Todavía hace falta? El karma es la condición de salida, no una métrica de vanidad.
  const karma = await fetchAccountKarma(botConfig());
  summary.karma = karma?.comment ?? null;
  if (karma && karma.comment >= cfg.karmaTarget) {
    return { ...summary, note: `objetivo alcanzado (${karma.comment} >= ${cfg.karmaTarget}), nada que farmear` };
  }

  const snap = await socialSnapshot();
  const gate = runAllowed(cfg, snap);
  if (!gate.ok) return { ...summary, note: gate.reason ?? "freno" };

  const blocked = await blockedSubs(cfg);
  const subs = cfg.subs.filter((sub) => {
    if (blocked.has(sub)) {
      reject(`sub_borra:${sub}`);
      return false;
    }
    return subAllowed(cfg, snap, sub).ok;
  });
  if (!subs.length) return { ...summary, note: "ningún sub disponible (nos borran, o tope diario)" };

  const posts: RedditPostRaw[] = [];
  for (const sub of subs) posts.push(...(await fetchNewPosts(sub, cfg.fetchLimit)));
  summary.fetched = posts.length;

  const engaged = await alreadyEngaged(posts.map((post) => post.id));
  const candidates = newestFirst(posts).filter((post) => {
    if (engaged.has(post.id)) {
      reject("ya_comentado");
      return false;
    }
    const verdict = screenSocialPost(post, cfg);
    if (!verdict.ok) {
      reject(verdict.reason ?? "screen");
      return false;
    }
    return authorAllowed(cfg, snap, post.author).ok;
  });
  summary.candidates = candidates.length;
  if (!candidates.length) return { ...summary, note: "ningún hilo liviano y nuevo para comentar" };

  for (const post of candidates.slice(0, MAX_ATTEMPTS)) {
    // Lo que ya dijeron los demás, para no llegar tarde con el chiste que alguien hizo primero.
    const existing = (await fetchComments(post.sub, post.id).catch(() => []))
      .slice(0, 8)
      .map((comment) => String(comment.body || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const ask = { sub: post.sub, postTitle: post.title, postBody: post.selftext, existing };
    let draft = await composeSocial(ask);
    if (!draft) {
      reject("sin_respuesta_del_modelo");
      continue;
    }
    if (draft.skip || !draft.comment) {
      reject("modelo_paso_de_largo");
      continue;
    }

    const postText = `${post.title}\n${post.selftext}`;
    let check = validateSocial(draft.comment, postText);
    if (!check.ok) {
      const retry = await composeSocial(ask, socialRetryHint(check));
      if (retry && !retry.skip && retry.comment) {
        draft = retry;
        check = validateSocial(retry.comment, postText);
      }
    }

    const base = {
      postId: post.id,
      sub: post.sub,
      author: post.author,
      postTitle: post.title,
      postPermalink: post.permalink,
      postCreatedUtc: post.createdUtc,
      text: draft.comment,
    };

    if (!check.ok) {
      reject(`validate:${check.reason}`);
      await recordSocial({ ...base, status: "rejected", rejectReason: `validate:${check.reason}` });
      continue;
    }

    if (cfg.dryRun) {
      await recordSocial({ ...base, status: "dry_run", rejectReason: "ensayo" });
      return { ...summary, posted: draft.comment, note: `ensayo en r/${post.sub}: ${draft.comment}` };
    }

    const comment = await postComment(post.id, draft.comment);
    if (!comment) {
      await recordSocial({ ...base, status: "failed", rejectReason: "Reddit rechazó el comentario" });
      reject("post_failed");
      continue;
    }

    await recordSocial({
      ...base,
      status: "posted",
      commentId: comment.id,
      commentFullname: comment.fullname,
      postedAt: new Date(),
      visible: null,
    });
    await notifyAdmin(
      `💬 *Comentario social* en r/${post.sub} (karma ${karma?.comment ?? "?"}/${cfg.karmaTarget})\n` +
        `${post.title.slice(0, 100)}\n${draft.comment}\n${comment.permalink || post.permalink}`
    );
    return { ...summary, posted: draft.comment, note: `comentado en r/${post.sub}` };
  }

  return { ...summary, note: "nada que valiera la pena decir en esta corrida" };
}

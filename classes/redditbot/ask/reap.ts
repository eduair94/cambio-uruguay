// Sacar de circulación el post que no le importó a nadie.
//
// La regla: una hora sin ninguna interacción y el post se borra. No es prolijidad — un perfil lleno
// de preguntas con cero comentarios ES la definición de spam para cualquiera que lo abra, incluido
// el moderador que decide si esta cuenta sigue publicando. Un post que nadie contestó no está
// esperando su momento: en un sub de este tamaño, lo que no enganchó en la primera hora ya bajó de
// la primera pantalla y no vuelve.
//
// "Ninguna interacción" es literal y hay que definirla con cuidado, porque Reddit no da cero: todo
// post nace con score 1 (el voto propio) y 0 comentarios. Entonces interacción = alguien comentó, o
// alguien votó. Un post con un comentario y karma negativo NO se borra: eso no es indiferencia, es
// una conversación que salió mal, y borrarla sería borrar una respuesta que alguien se tomó el
// trabajo de escribir.

import { notifyAdmin } from "../../notify";
import { RedditSubmissionModel } from "../../models/RedditSubmission";
import { fetchPostsByIds } from "../../reddit";
import { botConfig } from "../config";
import { deleteThing } from "../post";
import type { AskConfig } from "./config";

export interface ReapResult {
  checked: number;
  deleted: number;
  alive: number;
  detail: string[];
}

/**
 * Un post desaparecido de la API es un post que ya no está: lo borró un moderador, o el propio
 * Reddit. Cuenta como muerto —no hay nada que rescatar— pero no como borrado por nosotros, y la
 * distinción queda escrita porque las dos cosas dicen algo muy distinto sobre cómo nos va en el sub.
 */
const GONE = "desapareció del sub (lo más probable: lo sacó un mod)";

/**
 * ¿Alguien reaccionó a esto?
 *
 * Reddit no da cero: todo post nace con score 1 —el voto propio— y 0 comentarios. Así que la
 * ausencia de interacción es exactamente ese estado inicial, y cualquier movimiento en cualquiera
 * de los dos números cuenta. Incluido un voto negativo: eso no es indiferencia, es alguien que lo
 * leyó y decidió algo.
 */
export function hasEngagement(post: { score: number; numComments: number }): boolean {
  return post.numComments > 0 || post.score > 1;
}

export async function reapDeadPosts(cfg: AskConfig): Promise<ReapResult> {
  const result: ReapResult = { checked: 0, deleted: 0, alive: 0, detail: [] };

  const cutoff = new Date(Date.now() - cfg.deadAfterMinutes * 60_000);
  const rows = await RedditSubmissionModel.find({
    status: "posted",
    postedAt: { $lte: cutoff },
    postId: { $ne: "" },
  })
    .select({ postId: 1, fullname: 1, title: 1, permalink: 1 })
    .lean<Array<{ _id: unknown; postId: string; fullname: string; title: string; permalink: string }>>();

  if (!rows.length) return result;
  result.checked = rows.length;

  const live = await fetchPostsByIds(rows.map((row) => row.postId));
  const byId = new Map(live.map((post) => [post.id, post]));

  for (const row of rows) {
    const post = byId.get(row.postId);

    if (!post) {
      await RedditSubmissionModel.updateOne(
        { _id: row._id },
        { $set: { status: "reaped", rejectReason: GONE, visible: false, checkedAt: new Date() } }
      );
      result.deleted++;
      result.detail.push(`${row.title.slice(0, 50)} — ${GONE}`);
      continue;
    }

    if (hasEngagement(post)) {
      await RedditSubmissionModel.updateOne(
        { _id: row._id },
        { $set: { checkedAt: new Date(), visible: true, score: post.score, numComments: post.numComments } }
      );
      result.alive++;
      continue;
    }

    const ok = await deleteThing(row.fullname, botConfig());
    await RedditSubmissionModel.updateOne(
      { _id: row._id },
      {
        $set: {
          status: "reaped",
          rejectReason: ok ? "una hora sin interacción" : "sin interacción; Reddit no aceptó el borrado",
          visible: false,
          checkedAt: new Date(),
          score: post.score,
          numComments: post.numComments,
        },
      }
    );
    result.deleted++;
    result.detail.push(`${row.title.slice(0, 50)} — 0 comentarios, ${post.score} de score`);
  }

  if (result.deleted) {
    await notifyAdmin(
      `🗑️ *Post retirado* de r/${cfg.sub} por falta de interacción\n${result.detail.join("\n")}`
    );
  }
  return result;
}

/**
 * Cuántas veces se intentó ya hoy.
 *
 * El freno que hace que "borrar y publicar otra" no se convierta en el problema que quería
 * resolver: sin tope, un día en que nada engancha son doce preguntas publicadas y borradas, que
 * para cualquiera que mire el perfil es mucho peor que una sola pregunta ignorada.
 */
export async function attemptsToday(): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return RedditSubmissionModel.countDocuments({
    status: { $in: ["posted", "reaped"] },
    postedAt: { $gte: since },
  });
}

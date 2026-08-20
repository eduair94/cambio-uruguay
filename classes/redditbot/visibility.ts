// ¿Lo último que publicamos lo ve alguien más que nosotros?
//
// Esta pregunta ya se hacía, pero DESPUÉS y de a poco: el vigilante corre cada hora y sólo frena
// cuando TODOS los comentarios recientes están invisibles. Entre que la cuenta empieza a ser
// filtrada y que el vigilante junta evidencia suficiente pueden pasar cinco comentarios, y cada uno
// de esos cinco es otra señal de spam contra la cuenta. Eso fue exactamente lo que pasó el
// 2026-08-20: cinco comentarios publicados en unas horas, los cinco borrados, y la cuenta terminó
// con todo lo que publica —comentarios y posts, incluidos posts de días antes con 17 y 24 votos—
// retirado por el filtro de Reddit (`removed_by_category: "reddit"`, o sea el filtro del sitio, no
// el AutoModerator de ningún sub).
//
// Este módulo mueve la pregunta al principio de la corrida y la contesta con UN comentario: si el
// último que publicamos no se ve desde afuera, no se publica nada más. Convierte "nos enteramos
// después de cinco" en "paramos en uno".
//
// LO QUE NO ES: una forma de esquivar el filtro. Si la cuenta está filtrada, lo que corresponde es
// dejar de publicar y apelar — seguir escribiendo desde otra cuenta es evasión, y eso es lo que
// convierte un problema de cuenta en un problema de dominio.

import { fetchPublicCommentBodies } from "../reddit";
import { RedditBotReplyModel } from "../models/RedditBotReply";
import { botConfig, type BotConfig } from "./config";

export interface VisibilityVerdict {
  /** ¿Se puede seguir publicando? */
  ok: boolean;
  /** Qué se miró, para el log. */
  detail: string;
}

/** Cuántos de los últimos comentarios mirar. */
const LOOK_BACK = 3;

/**
 * Los últimos comentarios propios, leídos como los ve un desconocido.
 *
 * `null` en `ok` no existe a propósito: no poder leer la respuesta de Reddit devuelve OK. La
 * alternativa —callar el bot cada vez que la API tose— apagaría el trabajo por un problema de red,
 * y el vigilante horario sigue estando para el caso lento.
 */
export async function recentCommentsVisible(cfg: BotConfig = botConfig()): Promise<VisibilityVerdict> {
  const rows = await RedditBotReplyModel.find({
    account: cfg.username,
    status: "posted",
    selfDeleted: { $ne: true },
    commentFullname: { $nin: ["", null] },
  })
    .sort({ postedAt: -1 })
    .limit(LOOK_BACK)
    .select({ commentFullname: 1, sub: 1 })
    .lean<Array<{ commentFullname: string; sub: string }>>();

  if (!rows.length) return { ok: true, detail: "todavía no publicamos nada con esta cuenta" };

  const fullnames = rows.map((r) => r.commentFullname).filter(Boolean);
  const bodies = await fetchPublicCommentBodies(fullnames);
  if (!bodies.size) return { ok: true, detail: "no se pudo leer la vista pública (¿red?)" };

  const invisible = fullnames.filter((name) => {
    const body = bodies.get(name);
    return body === undefined || body === "[removed]" || body === "[deleted]";
  });

  if (invisible.length === fullnames.length) {
    return {
      ok: false,
      detail: `los ${fullnames.length} últimos comentarios están [removed] para cualquiera que no sea la cuenta`,
    };
  }

  return { ok: true, detail: `${fullnames.length - invisible.length}/${fullnames.length} visibles` };
}

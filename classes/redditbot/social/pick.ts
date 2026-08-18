// Qué hilo merece un comentario común, y sobre todo cuál no.
//
// Todo acá es puro: entra un post y una configuración, sale un veredicto. La parte cara (Reddit,
// Mongo, el modelo) vive en run.ts, así que las reglas que deciden dónde habla la cuenta se pueden
// leer y testear de una sentada.

import type { RedditPostRaw } from "../../reddit";
import { moneyTopic, postText, strip } from "../filter";
import type { SocialConfig } from "./config";

/**
 * Hilos donde una ocurrencia es una falta de respeto.
 *
 * Es la lista más importante del módulo. El bot no distingue un hilo liviano de un duelo, así que
 * la distinción la hace esto: ante la duda, calla. Cubre muerte y enfermedad, violencia y delito,
 * salud mental, y política partidaria — que en r/uruguay no es un tema, es una pelea, y meterse con
 * una cuenta nueva es cómo se gana un ban antes de existir.
 */
const NO_JOKE_TERMS = [
  "murio", "falleci", "muerte", "velorio", "sepelio", "q.e.p.d", "qepd", "descanse en paz", "luto",
  "cancer", "quimio", "terminal", "internad", "uci", "cti", "hospital", "diagnostic", "tumor",
  "suicid", "depresion", "ansiedad", "psiquiatr", "psicolog", "autolesion", "adiccion",
  "violencia", "violaci", "abuso", "acoso", "amenaza", "denuncia", "femicidio", "desaparecid",
  "robo", "asalto", "rapiña", "rapina", "arrebato", "estafaron", "me estafaron", "secuestro",
  "accidente", "atropell", "incendio", "inundacion", "tragedia",
  // Seguridad pública: el primer ensayo eligió un hilo sobre despliegue policial y escribió algo
  // sobrio y razonable, que igual era una opinión sobre política de seguridad. Acá no es un tema,
  // es una grieta, y una cuenta nueva opinando en el medio no junta karma.
  "policia", "policial", "jefatura", "delincuen", "inseguridad", "narco", "homicidio",
  "ministerio del interior", "guardia republicana", "carcel", "preso",
  "elecciones", "frente amplio", "partido nacional", "partido colorado", "cabildo", "orsi",
  "lacalle", "mujica", "sendic", "milei", "politica", "politico", "dictadura", "militares",
  "aborto", "religion", "iglesia", "guerra", "israel", "palestina", "ucrania", "racis", "xenofob",
  "divorcio", "custodia", "separacion", "infidelidad",
];

/**
 * Hilos que piden que cuentes lo que TE pasó a vos.
 *
 * Son la mitad de r/AskUruguayan y son, de todos, el único donde esta cuenta no puede participar
 * honestamente: la respuesta que el hilo pide es una anécdota propia, y no hay ninguna. El primer
 * comentario que dejó acá fue "sacar pasaporte en el Ministerio del Interior, terminé esperando una
 * banda" — bien escrito, uruguayo, creíble, y falso. Sonar humano no vale nada si el precio es
 * inventar una vida.
 *
 * No es lo mismo que un hilo que pregunta algo: "¿dónde consigo repuestos de bici?" se contesta con
 * lo que uno sabe. "¿Cuál fue el peor trámite que hiciste?" sólo se contesta habiendo estado ahí.
 */
const WANTS_ANECDOTE = [
  "que te paso", "que les paso", "te paso alguna vez", "cual fue tu", "cual fue el peor",
  "cual es tu", "cuentenme", "contame tu", "cuenten sus", "sus historias", "anecdota", "anecdotas",
  "experiencias", "tu experiencia", "su experiencia", "les toco", "te toco", "hiciste alguna vez",
  "alguna vez te", "en que trabajaste", "como conociste", "como fue tu", "peor trabajo que",
  "perdiste mas", "perdiste mas tiempo", "mas te arrepentis", "te arrepentis de",
];

export type SocialSkipReason =
  | "too_new"
  | "too_old"
  | "locked"
  | "stickied"
  | "nsfw"
  | "deleted_author"
  | "our_topic"
  | "no_jokes"
  | "wants_anecdote"
  | "crowded"
  | "downvoted"
  | "too_short"
  | "link_post";

export interface SocialVerdict {
  ok: boolean;
  reason?: SocialSkipReason;
}

/**
 * ¿Se puede comentar acá?
 *
 * `now` se inyecta para poder testear la ventana sin tocar el reloj.
 */
export function screenSocialPost(post: RedditPostRaw, cfg: SocialConfig, now: number = Date.now()): SocialVerdict {
  const ageMinutes = (now - post.createdUtc * 1000) / 60000;
  if (ageMinutes < cfg.minAgeMinutes) return { ok: false, reason: "too_new" };
  if (ageMinutes > cfg.maxAgeMinutes) return { ok: false, reason: "too_old" };

  if (post.locked) return { ok: false, reason: "locked" };
  if (post.stickied) return { ok: false, reason: "stickied" };
  if (post.over18) return { ok: false, reason: "nsfw" };
  if (!post.author || post.author === "[deleted]" || post.author === "AutoModerator") {
    return { ok: false, reason: "deleted_author" };
  }

  // Un hilo de plata no se contesta con un chiste: es el material del bot de respuestas, y gastarlo
  // acá significa que cuando haya página para contestarlo el hilo ya tiene nuestro comentario
  // tonto arriba. La pregunta es sólo temática — deliberadamente ignora la edad y el estado de
  // moderación, porque un hilo de aduana viejo sigue siendo un hilo de aduana.
  if (moneyTopic(post).length) return { ok: false, reason: "our_topic" };

  const text = postText(post);
  if (NO_JOKE_TERMS.some((term) => text.includes(term))) return { ok: false, reason: "no_jokes" };

  // Lo que pide el hilo es una anécdota propia, y no tenemos ninguna. Ver WANTS_ANECDOTE.
  const titulo = strip(post.title);
  if (WANTS_ANECDOTE.some((term) => titulo.includes(term))) return { ok: false, reason: "wants_anecdote" };

  // Un link externo suele ser una nota de prensa, y comentar noticias es el camino corto a opinar de
  // política. Texto propio o foto: ahí hay algo de la persona a lo que responder.
  if (!post.isSelf && !post.imageUrl) return { ok: false, reason: "link_post" };

  if (post.title.trim().length < 12) return { ok: false, reason: "too_short" };
  if (post.numComments > cfg.maxCommentsOnThread) return { ok: false, reason: "crowded" };
  // Un hilo en cero o negativo ya lo está enterrando el sub; sumarse no da karma y sí da compañía.
  if (post.score < 1) return { ok: false, reason: "downvoted" };

  return { ok: true };
}

/** Más nuevo primero. El orden es la política: el hilo de hace veinte minutos todavía se lee. */
export function newestFirst<T extends { createdUtc: number }>(posts: readonly T[]): T[] {
  return [...posts].sort((a, b) => b.createdUtc - a.createdUtc);
}

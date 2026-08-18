// El filtro mecánico del comentario común.
//
// Mismo reparto de trabajo que en el bot de respuestas: el prompt PIDE, esto EXIGE. La diferencia
// es qué se exige. Allá el enlace es obligatorio y el largo mínimo alto, porque una respuesta corta
// con un link es publicidad. Acá es al revés — cualquier enlace convierte el comentario en lo que
// dijimos que no era, y el largo tiene TECHO, porque el párrafo bien armado es lo que delata.

import {
  BANNED_PHRASES,
  BARE_DOMAIN,
  EMOJI,
  TUTEO,
  TUTEO_ACCENT_SAFE,
  extractLinks,
  inventedNumbers,
  softStrip,
  strip,
} from "../validate";
import type { SocialRegister } from "./compose";
import type { Lang } from "./language";
import { NO_JOKE_TERMS } from "./pick";

export type SocialRejectReason =
  | "empty"
  | "too_long"
  | "too_short"
  | "has_link"
  | "mentions_site"
  | "banned_phrase"
  | "tuteo"
  | "emoji"
  | "markdown"
  | "too_many_sentences"
  | "invented_number"
  | "fake_experience"
  | "off_limits"
  | "self_disclosure";

export interface SocialValidation {
  ok: boolean;
  reason?: SocialRejectReason;
  detail?: string;
}

/**
 * Cuánto se puede escribir, según para qué.
 *
 * No es una preferencia de estilo. En un hilo de charla el párrafo prolijo es el delator: nadie
 * contesta una foto del Cerro con tres oraciones bien puntuadas. Pero cuando alguien preguntó algo
 * en serio —el caso normal en r/AskUruguayan— ese mismo techo convierte la respuesta en un chiste,
 * y contestar a medias una pregunta honesta es peor que no contestar. Así que el techo lo fija el
 * registro que el modelo eligió antes de escribir.
 */
const LIMITS: Record<SocialRegister, { chars: number; sentences: number }> = {
  liviano: { chars: 240, sentences: 2 },
  util: { chars: 460, sentences: 4 },
};

const MIN_CHARS = 15;

/**
 * Primera persona del pasado: cosas que sólo puede decir alguien que estuvo ahí.
 *
 * La cuenta no estuvo en ningún lado. Puede decir lo que se sabe —"el trámite del pasaporte es
 * famoso por las esperas"— pero no puede decir que lo hizo, porque no lo hizo. La diferencia no es
 * de estilo: una es información y la otra es una mentira chiquita, y la mentira chiquita es
 * exactamente lo que hace que valga la pena desconfiar de todo lo demás que diga la cuenta.
 *
 * Se chequea el texto, no la intención, porque el prompt ya lo pedía y el modelo lo hizo igual.
 */
/** Lo mismo en inglés: el hilo puede estar en inglés, la cuenta sigue sin haber estado en ningún lado. */
const FIRST_PERSON_STORY_EN = [
  "i went", "i had to", "i waited", "i did", "in my case", "happened to me", "i was there",
  "my brother", "my sister", "my mom", "my dad", "my boss", "when i moved", "i lived",
];

/** Muletillas de manual, versión inglesa. Las españolas no aplican a un texto en inglés. */
const BANNED_EN = [
  "hope this helps", "hope that helps", "great question", "good question", "feel free to",
  "as an ai", "i'm an ai", "in conclusion", "it's important to note", "let me know if",
  "best of luck", "keep in mind that it", "to summarize",
];

const FIRST_PERSON_STORY = [
  "me paso", "me pasaron", "yo fui", "fui a", "fui al", "termine esperando", "termine yendo",
  "tuve que ir", "espere", "tarde como", "me toco", "en mi caso", "cuando hice", "cuando fui",
  "lo hice yo", "me atendieron", "me cobraron", "me dijeron en", "estuve", "yo tenia", "yo hice",
  "a mi me", "mi hermano", "mi vieja", "mi viejo", "mi jefe", "mi trabajo", "un amigo mio",
];

/** Decir "soy un bot" en un chiste no es transparencia, es un comentario raro. La bio de la cuenta es el lugar. */
const SELF_DISCLOSURE = ["soy un bot", "soy un robot", "como ia", "soy una ia", "inteligencia artificial", "modelo de lenguaje"];

export function validateSocial(
  comment: string,
  postText: string,
  register: SocialRegister = "liviano",
  lang: Lang = "es"
): SocialValidation {
  const cap = LIMITS[register] ?? LIMITS.liviano;
  const text = comment.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length < MIN_CHARS) return { ok: false, reason: "too_short", detail: `${text.length} caracteres` };
  if (text.length > cap.chars) return { ok: false, reason: "too_long", detail: `${text.length} caracteres` };

  // Cero enlaces. No "un enlace al sitio": cero. El karma que se gana con un link no es karma, es
  // una promoción con otro nombre, y es lo que hace que el sub mire la cuenta con lupa.
  const links = extractLinks(text);
  if (links.length) return { ok: false, reason: "has_link", detail: links.join(", ") };
  // Y el dominio escrito a mano, que dirige igual sin ser una URL. Ver BARE_DOMAIN.
  const bare = text.match(BARE_DOMAIN);
  if (bare) return { ok: false, reason: "has_link", detail: bare[2] };

  const flat = strip(text);
  if (flat.includes("cambio-uruguay") || flat.includes("cambio uruguay")) return { ok: false, reason: "mentions_site" };

  const banned = (lang === "en" ? BANNED_EN : BANNED_PHRASES).find((phrase) => flat.includes(phrase));
  if (banned) return { ok: false, reason: "banned_phrase", detail: banned };

  // El voseo es la regla del español rioplatense; aplicársela a un texto en inglés no significa
  // nada, y "you can" dispararía media lista.
  if (lang === "es") {
    // Dos listas y dos normalizaciones: la segunda conserva las tildes porque son lo único que
    // distingue "hacés" de "haces". Ver TUTEO_ACCENT_SAFE.
    const tuteo =
      TUTEO.find((form) => new RegExp(`(^|[^a-z])${form}([^a-z]|$)`).test(flat)) ??
      TUTEO_ACCENT_SAFE.find((form) =>
        new RegExp(`(^|[^a-záéíóúñ])${form}([^a-záéíóúñ]|$)`).test(softStrip(text))
      );
    if (tuteo) return { ok: false, reason: "tuteo", detail: tuteo };
  }

  if (EMOJI.test(text)) return { ok: false, reason: "emoji" };
  if (/^\s*[#>*-]\s|\*\*|^\s*\d+\.\s/m.test(text)) return { ok: false, reason: "markdown" };

  // El veto de temas corría sólo sobre el hilo. Un hilo sobre mudanzas es inocente y la respuesta
  // puede irse igual a la inseguridad del barrio: lo que importa es dónde termina el comentario,
  // no de dónde salió.
  const tema = NO_JOKE_TERMS.find((term) => flat.includes(term));
  if (tema) return { ok: false, reason: "off_limits", detail: tema };

  const story = [...FIRST_PERSON_STORY, ...FIRST_PERSON_STORY_EN].find((phrase) =>
    new RegExp(`(^|[^a-z])${phrase}([^a-z]|$)`).test(flat)
  );
  if (story) return { ok: false, reason: "fake_experience", detail: story };

  // Una lista de frases siempre va a tener agujeros —"mi hermana", "pedí", "compré"— porque las
  // formas de contar algo propio son infinitas. La morfología no: en español, un verbo en primera
  // persona del pretérito es, por construcción, alguien diciendo que estuvo ahí.
  //
  // Se mide sobre el texto CON tildes, que es lo que distingue "pedí" (yo) de "pedi" (nada), y con
  // una lista de excepciones que no es opcional: "así", "aquí", "ahí" y "café" también terminan en
  // vocal acentuada y no son verbos. Sin ellas la regla rechazaba comentarios perfectamente
  // normales, que es peor que el agujero que vino a tapar.
  if (lang === "es") {
    const NO_ES_VERBO = /^(asi|aqui|ahi|alli|aji|mani|cafe|bebe|que|porque|colibri|esqui|rubi|puree|frances|ingles|jose|andres|mama|papa)$/;
    const words = softStrip(comment).split(/[^a-záéíóúñ]+/).filter(Boolean);
    const preterito = words.find((word) => {
      if (/^(fui|estuve|tuve|hice|vine|pude|puse|dije|traje|vi|supe|quise|anduve)$/.test(word)) return true;
      if (word.length < 4 || !/(é|í)$/.test(word)) return false;
      return !NO_ES_VERBO.test(word.normalize("NFD").replace(/[̀-ͯ]/g, ""));
    });
    if (preterito) return { ok: false, reason: "fake_experience", detail: preterito };
  }

  const disclosure = SELF_DISCLOSURE.find((phrase) => flat.includes(phrase));
  if (disclosure) return { ok: false, reason: "self_disclosure", detail: disclosure };

  const sentences = text.split(/[.!?…]+\s/).filter((s) => s.trim().length > 1);
  if (sentences.length > cap.sentences) {
    return { ok: false, reason: "too_many_sentences", detail: `${sentences.length} oraciones` };
  }

  // Una cifra que no está en el post es una cifra inventada, y en un comentario casual nadie la va a
  // verificar — que es justamente por qué no puede estar. Un chiste no necesita datos.
  const invented = inventedNumbers(text, postText);
  if (invented.length) return { ok: false, reason: "invented_number", detail: invented.join(", ") };

  return { ok: true };
}

/** Qué decirle al modelo para el segundo intento. */
export function socialRetryHint(result: SocialValidation): string {
  switch (result.reason) {
    case "too_long":
      return "Quedó largo. Cortalo a lo que de verdad hace falta y sacá lo que ya se entendía.";
    case "too_short":
      return "Quedó demasiado corto para decir algo. Una oración completa que responda a algo concreto del hilo.";
    case "has_link":
      return "Sacá el enlace. Este comentario no lleva ningún link, ninguno.";
    case "mentions_site":
      return "No menciones ningún sitio web ni ninguna marca.";
    case "banned_phrase":
      return `Sacá la muletilla "${result.detail}": es de las frases que delatan un comentario automático.`;
    case "tuteo":
      return `Escribiste "${result.detail}" en tuteo. Va de vos: tenés, podés, fijate, mirá.`;
    case "emoji":
      return "Sin emojis.";
    case "markdown":
      return "Sin viñetas, sin negritas y sin numeración: texto corrido.";
    case "too_many_sentences":
      return "Demasiadas oraciones para este hilo. Dejá lo que contesta y borrá el resto.";
    case "invented_number":
      return `Sacá las cifras (${result.detail}): no están en lo que escribió la persona y no las podés verificar.`;
    case "off_limits":
      return `Tu comentario se mete en "${result.detail}", que es un tema donde esta cuenta no opina. Contestá sobre lo que preguntaron y nada más.`;
    case "fake_experience":
      return `"${result.detail}" cuenta algo que te habría pasado a vos, y no te pasó. Decí lo que se sabe del tema, sin ponerte de protagonista.`;
    case "self_disclosure":
      return "No digas que sos un bot ni una IA.";
    default:
      return "Escribí un comentario común, corto y sobre algo concreto del hilo.";
  }
}

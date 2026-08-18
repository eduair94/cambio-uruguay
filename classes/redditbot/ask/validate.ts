// Qué post no sale nunca de la cuenta.
//
// Un comentario malo se hunde entre otros cincuenta. Un post malo es la cuenta: queda arriba de
// todo, con el nombre al lado, y si lo borra un mod queda registrado contra la cuenta. Así que acá
// el filtro es más estricto que el de los comentarios, no menos.

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

export type AskRejectReason =
  | "empty"
  | "title_too_short"
  | "title_too_long"
  | "body_too_long"
  | "not_a_question"
  | "has_link"
  | "mentions_site"
  | "banned_phrase"
  | "tuteo"
  | "emoji"
  | "politics"
  | "yes_no"
  | "invented_number"
  | "repetitive";

export interface AskValidation {
  ok: boolean;
  reason?: AskRejectReason;
  detail?: string;
}

const TITLE_MIN = 15;
/** Reddit corta a 300; lo que pasa de ~140 se lee cortado en el celular, que es donde se lee todo. */
const TITLE_MAX = 140;
const BODY_MAX = 700;

/**
 * Política. La lista existe porque en un sub de país es el tema que garantiza una pelea, y una
 * cuenta nueva que abre una pelea no consigue karma: consigue un ban.
 */
const POLITICS = [
  "frente amplio", "partido nacional", "partido colorado", "cabildo abierto", "orsi", "lacalle",
  "mujica", "sanguinetti", "bordaberry", "milei", "gobierno", "oposicion", "elecciones",
  "candidato", "presidente", "ministro", "intendente", "plebiscito", "referendum", "sindicato",
  "pit-cnt", "izquierda", "derecha", "dictadura", "militares", "aborto", "religion",
];

/** Una pregunta de sí/no no genera conversación: genera cincuenta "sí" y cincuenta "no". */
const YES_NO_OPENERS = [
  "es normal que", "esta bien que", "soy el unico", "alguien mas", "les pasa que", "conviene",
  "vale la pena", "deberia", "estoy loco",
];

/**
 * `evidence` es la actualidad que se investigó, con sus fuentes.
 *
 * El prompt prohíbe explícitamente cualquier cifra que no venga de ahí, y hasta ahora nadie lo
 * chequeaba: el pase de comentarios tiene esa regla desde el primer día y el de posts —que se lee
 * mucho más— no tenía ninguna. Un post que abre con "el boleto sube 40 pesos" y el número está mal
 * no es un error de estilo: es la cuenta afirmando algo falso en el título de su propio hilo.
 */
export function validateAsk(title: string, body: string, evidence = ""): AskValidation {
  const t = title.trim();
  const b = body.trim();
  if (!t) return { ok: false, reason: "empty" };
  if (t.length < TITLE_MIN) return { ok: false, reason: "title_too_short", detail: `${t.length} caracteres` };
  if (t.length > TITLE_MAX) return { ok: false, reason: "title_too_long", detail: `${t.length} caracteres` };
  if (b.length > BODY_MAX) return { ok: false, reason: "body_too_long", detail: `${b.length} caracteres` };

  // Sin el "¿" y sin comillas de apertura: `strip` normaliza mayúsculas y tildes pero no toca la
  // puntuación, y todo título bien escrito en español empieza con "¿" — con lo cual ningún
  // startsWith de acá abajo daba nunca, y la pregunta de sí/no pasaba entera.
  const flatTitle = strip(t).replace(/^[^a-z0-9ñ]+/, "");
  const flat = strip(`${t} ${b}`);

  // El sub se llama AskUruguayan: si el título no pregunta nada, el post está en el lugar equivocado.
  const asks =
    t.includes("?") ||
    /^(que|cual|cuales|como|cuando|donde|quien|quienes|cuanto|cuanta|cuantos|cuantas|por que|para que)\b/.test(flatTitle);
  if (!asks) return { ok: false, reason: "not_a_question" };

  const links = extractLinks(`${t} ${b}`);
  if (links.length) return { ok: false, reason: "has_link", detail: links.join(", ") };
  if (flat.includes("cambio-uruguay") || flat.includes("cambio uruguay")) return { ok: false, reason: "mentions_site" };

  // Con sufijo opcional: "candidatos", "sindicatos", "ministros" y "políticos" son la misma cosa
  // que el singular, y una lista que sólo mira el singular es una lista que se saltea con una ese.
  const politics = POLITICS.find((term) =>
    term.includes(" ") ? flat.includes(term) : new RegExp(`(^|[^a-z0-9])${term}(es|s|as|os)?([^a-z0-9]|$)`).test(flat)
  );
  if (politics) return { ok: false, reason: "politics", detail: politics };

  // En cualquier parte del título, no sólo al principio: "Che, ¿es normal que…?" abría la misma
  // pregunta de sí o no y pasaba entera por tener dos palabras antes.
  const yesNo = YES_NO_OPENERS.find((opener) =>
    new RegExp(`(^|[^a-z0-9])${opener}([^a-z0-9]|$)`).test(flatTitle)
  );
  if (yesNo) return { ok: false, reason: "yes_no", detail: yesNo };

  const banned = BANNED_PHRASES.find((phrase) => flat.includes(phrase));
  if (banned) return { ok: false, reason: "banned_phrase", detail: banned };

  const tuteo =
    TUTEO.find((form) => new RegExp(`(^|[^a-z])${form}([^a-z]|$)`).test(flat)) ??
    TUTEO_ACCENT_SAFE.find((form) =>
      new RegExp(`(^|[^a-záéíóúñ])${form}([^a-záéíóúñ]|$)`).test(softStrip(`${t} ${b}`))
    );
  if (tuteo) return { ok: false, reason: "tuteo", detail: tuteo };

  if (EMOJI.test(`${t} ${b}`)) return { ok: false, reason: "emoji" };

  const bare = `${t} ${b}`.match(BARE_DOMAIN);
  if (bare) return { ok: false, reason: "has_link", detail: bare[2] };

  const invented = inventedNumbers(`${t}
${b}`, evidence);
  if (invented.length) return { ok: false, reason: "invented_number", detail: invented.join(", ") };

  return { ok: true };
}

export function askRetryHint(result: AskValidation): string {
  switch (result.reason) {
    case "title_too_short":
      return "El título quedó demasiado corto para entenderse solo.";
    case "title_too_long":
      return "El título quedó largo: en el celular se corta. Menos de 140 caracteres.";
    case "body_too_long":
      return "El cuerpo quedó largo. Dos o tres líneas y la pregunta.";
    case "not_a_question":
      return "El título no pregunta nada, y el sub es para preguntas.";
    case "has_link":
      return "Sacá el enlace: el post no lleva ninguno.";
    case "mentions_site":
      return "No menciones ningún sitio web ni ninguna marca.";
    case "politics":
      return `Sacá "${result.detail}": nada de política partidaria ni de nada que divida por bandera.`;
    case "yes_no":
      return `"${result.detail}" abre una pregunta de sí o no, y eso no genera conversación. Preguntá algo que se conteste contando.`;
    case "banned_phrase":
      return `Sacá "${result.detail}", que es de las frases que delatan un texto automático.`;
    case "tuteo":
      return `Escribiste "${result.detail}" en tuteo. Va de vos.`;
    case "emoji":
      return "Sin emojis.";
    case "invented_number":
      return `Sacá las cifras (${result.detail}): no están en lo que se investigó y nadie las puede verificar. Preguntá sin el número.`;
    case "repetitive":
      return `Esa pregunta ya se hizo en el sub (${result.detail}). Cambiá de tema, no de redacción.`;
    default:
      return "Escribí una pregunta abierta, uruguaya y que no se haya hecho.";
  }
}

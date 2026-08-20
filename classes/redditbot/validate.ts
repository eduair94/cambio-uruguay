// The last gate before a comment becomes public.
//
// A prompt is a request; this file is the enforcement. Every rule the composer was given is checked
// here against the produced text, because a model that follows nine instructions and quietly
// invents a tenth number is the normal case, not the pathological one — and on this site a wrong
// number is the specific failure that matters. The whole project's editorial rule is that a figure
// on a page has a source; a bot that posts "pagás 40% de recargo" because it felt right would be
// the first place that stopped being true, in public, under the site's own name.
//
// So: every numeric token in the reply must appear in the retrieved context. Not "most", not
// "approximately" — every one. A composer that cannot write the answer without inventing a number
// has not answered the question, and the correct outcome is to say nothing.

// The number rule lives in classes/numbers.ts because an auto-published page is now held to the
// same one; re-exported here so this module stays the single import for reply validation.
import { inventedNumbers, numericTokens } from "../numbers";

export { inventedNumbers, numericTokens };

export type RejectReason =
  | "empty"
  | "too_short"
  | "too_long"
  | "no_link"
  | "wrong_link"
  | "multiple_links"
  | "invented_number"
  | "no_substance"
  | "trailing_signature"
  | "banned_phrase"
  | "markdown_heading"
  | "tuteo"
  | "bullet_list"
  | "emoji";

export interface ValidationResult {
  ok: boolean;
  reason?: RejectReason;
  /** For `invented_number`: the offending tokens, so the retry prompt can name them. */
  detail?: string;
}

const MIN_WORDS = 45;
const MAX_WORDS = 170;

/**
 * Cuántas cifras tiene que tener la página para exigirle una a la respuesta.
 *
 * Tres, no una: una página puede mencionar un año o un número de artículo sin que eso sea un dato
 * que la respuesta deba usar. Tres es la señal de que la página tiene sustancia cuantitativa, y de
 * que una respuesta sin ninguna la está usando de adorno.
 */
const MIN_CONTEXT_FIGURES = 3;

/**
 * Filler that marks a comment as machine-written on sight.
 *
 * Not a style preference. On a subreddit, a comment that opens by praising the question and closes
 * by wishing you luck reads as copy-paste promotion, and gets removed as such — the moderators are
 * pattern-matching on exactly these strings, and so is every reader who has seen a marketing bot.
 */
export const BANNED_PHRASES = [
  // saludos y cierres de cortesía
  "espero que estes bien",
  "espero que esto te ayude",
  "espero que te sirva",
  "espero haberte ayudado",
  "saludos cordiales",
  "mucha suerte con",
  "estoy aqui para ayudarte",
  "no dudes en consultar",
  "no dudes en preguntar",
  // elogiar la pregunta
  "excelente pregunta",
  "buena pregunta",
  "gran pregunta",
  "excelente consulta",
  // muletillas de manual
  "es importante destacar",
  "es importante mencionar",
  "es importante tener en cuenta",
  "es fundamental tener en cuenta",
  "cabe destacar",
  "cabe mencionar",
  "cabe senalar",
  "vale la pena aclarar",
  "vale aclarar que es importante",
  "en resumen,",
  "en definitiva,",
  "en conclusion,",
  "por otro lado, es",
  "en primer lugar,",
  "dicho esto,",
  // autodelación
  "como modelo de lenguaje",
  "soy una inteligencia artificial",
  "como asistente",
  // derivación vacía
  "te recomiendo consultar con un profesional",
  "consulta con un especialista",
];

/**
 * Tuteo. The single most reliable tell that the text was not written by someone here.
 *
 * Uruguay voseas: *tenés*, *podés*, *fijate*, *mirá*. A model defaulting to neutral Spanish writes
 * *tienes*, *puedes*, *ten en cuenta* — grammatical, understood everywhere, and instantly foreign
 * on r/uruguay. It is also the rare style rule that can be checked mechanically rather than judged,
 * which is why it is a hard gate and not a line in the prompt.
 *
 * Anchored on word boundaries, and only on forms with no rioplatense collision: `puede` and `tiene`
 * (third person) are perfectly normal and are NOT listed.
 */
export const TUTEO = [
  "vas a poder ver tu",
  "ten en cuenta",
  "ten presente",
  "tu puedes",
  "si tu",
  "contigo",
  "tuyo propio",
];

/** Emoji, symbol and pictograph ranges. A money answer with a rocket in it is an ad. */
export const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F02F}\u{1F1E6}-\u{1F1FF}]/u;

/**
 * Minúsculas y espacios, PERO con las tildes intactas.
 *
 * Es la normalización que necesita el chequeo de tuteo y sólo él: en rioplatense la tilde es la
 * única diferencia entre la forma de vos y la de tú —hacés/haces, sabés/sabes, necesitás/necesitas,
 * debés/debes— así que compararlo sobre texto sin tildes rechaza el voseo correcto por tuteo, que
 * es justo lo contrario de lo que hace falta.
 */
export const softStrip = (text: string): string => text.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Formas de tú que NO colisionan con nada rioplatense una vez que las tildes están a salvo.
 *
 * Se compara contra `softStrip`, no contra `strip`.
 */
export const TUTEO_ACCENT_SAFE = [
  // "sabes" suelto, no "sabes que": la tercera persona es "sabe", así que la ese final sólo puede
  // ser tú. La forma rioplatense lleva tilde ("sabés") y por eso esta lista se compara con tildes.
  "tienes", "puedes", "debes", "quieres", "necesitas", "haces", "sabes",
];

export const strip = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Dominios escritos sin esquema: "cambio-uruguay.com", "www.algo.uy", "r/uruguay".
 *
 * `extractLinks` busca URLs, y una URL necesita http:// o www. El problema es que la regla que
 * importa no es "no pongas URLs" sino "no dirijas a la gente a otro lado", y para eso alcanza con
 * escribir el dominio: quien lo lee lo copia igual. En un comentario que se publicita como
 * "sin ningún enlace", el dominio suelto es la forma de romper la promesa sin romper la regla.
 */
export const BARE_DOMAIN = /(^|[^a-z0-9@/])((?:www\.)|(?:[a-z0-9][a-z0-9-]{1,}\.(?:com|uy|net|org|io|ar|br|es|app|co|me|ly|dev|gub\.uy|com\.uy)))(?![a-z0-9])/i;

/**
 * La firma al pie, que este bot no escribe.
 *
 * Mientras la firma fue obligatoria, esta función habría sido su opuesto exacto; ahora que la
 * aclaración vive en la bio (ver `identity.ts` y la nota en `compose.ts`), lo que hay que impedir es
 * que el redactor la reinvente por su cuenta — lo hace, porque el patrón "respuesta + raya + quién
 * soy" está por todos lados en su entrenamiento. Y una firma auto-inventada es peor que la que se
 * sacó: cambia de redacción entre comentarios, así que ni siquiera es la misma declaración dos
 * veces, y sigue siendo la huella que agrupa el historial de la cuenta.
 *
 * Se mira SÓLO la última línea, y sólo si es corta y arranca con un guión o un asterisco. Una
 * oración larga que nombre el sitio en el medio del texto es una respuesta, no una firma.
 */
export function trailingSignature(text: string): string | null {
  const lines = text.trim().split(/\n+/);
  const last = (lines[lines.length - 1] ?? "").trim();
  if (!last || lines.length < 2) return null;

  const looksLikeSignature = /^[—–\-*_]/.test(last) && last.split(/\s+/).length <= 18;
  if (!looksLikeSignature) return null;

  const flat = strip(last);
  const namesUs = ["cambio-uruguay", "cambio uruguay", "bot", "automat"].some((w) => flat.includes(w));
  return namesUs ? last.slice(0, 80) : null;
}

/** Bare URLs and markdown links alike. */
export function extractLinks(text: string): string[] {
  const links = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^\s)>\]]+/gi)) {
    links.add(match[0].replace(/[.,;:]+$/, ""));
  }
  // A markdown link whose target is a bare path (`[acá](/importar)`) is still a link and still
  // renders as one on Reddit; the bare-URL scan above would miss it.
  for (const match of text.matchAll(/\]\((\/[^\s)]*)\)/g)) links.add(match[1]!);
  return [...links];
}

export interface ValidateInput {
  reply: string;
  /** The one URL the reply is allowed to contain. */
  expectedUrl: string;
  /** The retrieved text the reply had to be built from. */
  context: string;
  /**
   * The original post's own text.
   *
   * Its numbers are allowed in the reply, and this is not a loophole — it is the difference between
   * a comment and a leaflet. A live test made the point: asked about a US$ 19,15 AliExpress order
   * billed at 26, the model wrote "con 19,15 dólares ya estás pagando el mínimo… y ahí te da cerca
   * de los 26 que te piden". Every figure it reasoned WITH came from our pages; 19,15 and 26 came
   * from the person asking. Refusing those would reject the one reply that proved it had read the
   * thread, and would push the model toward the generic phrasing this whole gate exists to prevent.
   *
   * Echoing someone's own number back invents nothing: they wrote it.
   */
  postText?: string;
}

export function validateReply({ reply, expectedUrl, context, postText = "" }: ValidateInput): ValidationResult {
  const text = (reply || "").trim();
  if (!text) return { ok: false, reason: "empty" };

  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < MIN_WORDS) return { ok: false, reason: "too_short", detail: `${words} palabras` };
  if (words > MAX_WORDS) return { ok: false, reason: "too_long", detail: `${words} palabras` };

  const signature = trailingSignature(text);
  if (signature) return { ok: false, reason: "trailing_signature", detail: signature };

  // Markdown headings read as shouting in a comment thread and are a reliable "written by a bot" tell.
  if (/^#{1,6}\s/m.test(text)) return { ok: false, reason: "markdown_heading" };

  // A bulleted answer is a document, not a comment. People write comments in paragraphs.
  const body = text;
  if (/^\s*([-*•]\s+|\d+[.)]\s+)/m.test(body)) return { ok: false, reason: "bullet_list" };

  if (EMOJI.test(body)) return { ok: false, reason: "emoji" };

  const links = extractLinks(text);
  if (!links.length) return { ok: false, reason: "no_link" };
  if (links.length > 1) return { ok: false, reason: "multiple_links", detail: links.join(" ") };
  if (links[0] !== expectedUrl) return { ok: false, reason: "wrong_link", detail: links[0] };

  const normalised = strip(text);
  const banned = BANNED_PHRASES.find((phrase) => normalised.includes(strip(phrase)));
  if (banned) return { ok: false, reason: "banned_phrase", detail: banned };

  const tuteo =
    TUTEO.find((form) => new RegExp(`(^|[^a-z0-9])${strip(form)}([^a-z0-9]|$)`).test(normalised)) ??
    TUTEO_ACCENT_SAFE.find((form) =>
      new RegExp(`(^|[^a-záéíóúñ])${form}([^a-záéíóúñ]|$)`).test(softStrip(text))
    );
  if (tuteo) return { ok: false, reason: "tuteo", detail: tuteo };

  // The URL itself is full of digits-free text, but a path like /decreto-50-026 would contribute
  // numbers the context may not have. Check the prose only.
  const prose = text.split(expectedUrl).join(" ");
  const invented = inventedNumbers(prose, `${context}\n${postText}`);
  if (invented.length) return { ok: false, reason: "invented_number", detail: invented.join(", ") };

  // ¿Contestó, o estuvo de acuerdo?
  //
  // Todo lo de arriba mide que la respuesta no diga nada FALSO. Nada medía que dijera algo. Un
  // comentario que le repite al autor lo que él acaba de escribir, sin un solo dato, pasa cada una
  // de las puertas anteriores —no inventa cifras porque no tiene cifras— y es exactamente la forma
  // del spam con enlace. Pasó en vivo el 2026-08-19 y hubo que borrarlo a mano.
  //
  // La regla NO es "toda respuesta lleva un número": hay respuestas buenas que son cualitativas
  // ("el BCU no publica ese registro"). Es más angosta, y por eso se puede sostener: SI la página
  // que estamos enlazando tiene datos duros y nuestra respuesta no usa ninguno, entonces no
  // contestamos con la página — la citamos de adorno.
  const contextFigures = numericTokens(context);
  if (contextFigures.length >= MIN_CONTEXT_FIGURES && !numericTokens(prose).length) {
    return {
      ok: false,
      reason: "no_substance",
      detail: `la página trae ${contextFigures.length} cifras y la respuesta no usa ninguna`,
    };
  }

  return { ok: true };
}

/** A short instruction appended to the retry prompt, naming what went wrong the first time. */
export function retryHint(result: ValidationResult): string {
  switch (result.reason) {
    case "invented_number":
      return `El intento anterior usó números que NO están en el contexto (${result.detail}). Reescribilo sin esos números: o los sacás, o reformulás la frase sin cifra.`;
    case "multiple_links":
    case "wrong_link":
      return "El intento anterior tenía un enlace de más o el enlace equivocado. Un solo enlace, exactamente el indicado, al final.";
    case "too_long":
      return `El intento anterior fue demasiado largo (${result.detail}). Recortalo.`;
    case "too_short":
      return `El intento anterior fue demasiado corto (${result.detail}). Contestá la pregunta con más sustancia, sin agregar datos nuevos.`;
    case "no_substance":
      return `El intento anterior no usó ni un dato de la página (${result.detail}). Reescribilo contestando con al menos una cifra concreta del CONTEXTO: sin eso el comentario sólo le repite a la persona lo que ya escribió.`;
    case "trailing_signature":
      return `El intento anterior terminaba con una firma ("${result.detail}"). Sacala entera: el comentario termina cuando termina la respuesta, sin presentarte ni aclarar qué sos.`;
    case "banned_phrase":
      return `Sacá la muletilla "${result.detail}" y empezá directamente por la respuesta.`;
    case "tuteo":
      return `Escribiste "${result.detail}", que es tuteo. En Uruguay se vosea: tenés, podés, fijate, mirá. Reescribilo entero en voseo.`;
    case "bullet_list":
      return "Sacá las viñetas y la numeración. Un comentario de Reddit es texto corrido, no un informe.";
    case "emoji":
      return "Sacá los emojis.";
    case "markdown_heading":
      return "Sin títulos ni encabezados. Texto corrido.";
    default:
      return "Reescribí el comentario respetando todas las reglas.";
  }
}

// Escribir la pregunta del día.
//
// Un post no es un comentario más grande. Lo ve todo el sub, lleva el nombre de la cuenta arriba, y
// si es malo no pasa desapercibido: se queda ahí abajo con dos votos negativos, o lo borra un mod.
// Así que esto pide TRES candidatas y elige, en vez de escribir una y publicarla.
//
// La pregunta que funciona en un sub de país no es la ingeniosa: es la que mucha gente puede
// contestar desde su propia experiencia y donde las respuestas se contradicen entre sí. "¿Cuál es
// el mejor lugar de Montevideo?" no genera conversación, genera una lista. "¿Qué cosa que todo el
// mundo recomienda te pareció sobrevalorada?" genera discusión, porque cada uno tiene una y ninguna
// coincide.

import { askClaudeJson } from "../../claude";
import type { SubPulse } from "./research";

export interface AskCandidate {
  title: string;
  body: string;
  flair: string;
  why: string;
  /** Qué respuestas espera. Si el modelo no puede describirlas, la pregunta no tiene respuestas. */
  expectedAnswers: string;
}

export interface AskDraft {
  candidates: AskCandidate[];
}

const SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "el título del post: la pregunta" },
          body: { type: "string", description: "dos o tres líneas que dan contexto e invitan a contestar" },
          flair: { type: "string", description: "el flair EXACTO de la lista, o vacío si ninguno aplica" },
          why: { type: "string", description: "por qué esta pregunta va a hacer hablar a este sub" },
          expectedAnswers: { type: "string", description: "qué clase de respuestas distintas esperás" },
        },
        required: ["title", "body", "flair", "why", "expectedAnswers"],
      },
    },
  },
  required: ["candidates"],
} as const;

export const ASK_VOICE =
  "Sos un uruguayo que postea en r/AskUruguayan. Escribís de vos, natural, sin solemnidad y sin " +
  "vender nada. Preguntás cosas que a vos te da curiosidad saber, no cosas que suenan a encuesta.";

export interface AskComposeInput {
  sub: string;
  pulse: SubPulse;
  topics: Array<{ topic: string; why: string; source: string }>;
  /** Títulos que el sub ya publicó, para no repetir. */
  recent: readonly string[];
  /** Lo que ya publicamos nosotros: repetirnos a nosotros mismos es peor que repetir al sub. */
  ours: readonly string[];
  availableFlairs: readonly string[];
  today: string;
  /** Qué salió mal en el intento anterior, cuando lo hubo. */
  correction?: string;
}

export function buildAskPrompt(input: AskComposeInput): string {
  const top = input.pulse.topPerforming
    .slice(0, 20)
    .map((post) => `- [${post.comments} comentarios, ${post.score} votos]${post.flair ? ` (${post.flair})` : ""} ${post.title}`)
    .join("\n");

  const temas = input.topics.length
    ? input.topics.map((t) => `- ${t.topic} — ${t.why} (${t.source})`).join("\n")
    : "(no se encontró nada reciente; escribí algo que no dependa de la actualidad)";

  const reglas = input.pulse.rules.length
    ? input.pulse.rules.map((rule) => `- ${rule}`).join("\n")
    : "(el sub no publica reglas legibles por API)";

  const flairs = input.availableFlairs.length ? input.availableFlairs.join(" | ") : "(el sub no ofrece flairs)";

  const nuestros = input.ours.length
    ? `\nLO QUE YA PUBLICAMOS NOSOTROS (repetirnos es lo peor que podemos hacer)\n${input.ours.map((t) => `- ${t}`).join("\n")}\n`
    : "";

  return `Hoy es ${input.today}. Vas a escribir un post para r/${input.sub}.

LAS REGLAS DEL SUB, tal como las escribieron sus moderadores
${reglas}

LO QUE MÁS CONVERSACIÓN GENERÓ ACÁ ÚLTIMAMENTE
${top}

DE QUÉ SE ESTÁ HABLANDO EN URUGUAY ESTA SEMANA
${temas}
${nuestros}
FLAIRS DISPONIBLES
${flairs}

QUÉ HACE QUE UN POST FUNCIONE ACÁ
Mirá la lista de arriba antes de escribir: fijate qué tienen en común los que juntaron muchos
comentarios, no los que juntaron muchos votos. Son cosas distintas — una foto linda junta votos y
cero conversación.

Lo que hace hablar a un sub de país es una pregunta que:
- mucha gente puede contestar desde su propia experiencia, sin saber nada especial;
- da respuestas que se CONTRADICEN entre sí, porque ahí está la discusión;
- tiene una respuesta concreta y no una lista ("¿qué te decepcionó de X?" funciona,
  "¿cuáles son los mejores X?" es una lista y muere en tres comentarios);
- no tiene una respuesta correcta que todos van a repetir.

QUÉ NO
- Nada de política partidaria, candidatos, gobierno, ni nada que divida por bandera.
- Nada de encuestas ("¿ustedes prefieren A o B?" a secas), ni preguntas de sí/no.
- Ningún enlace, ninguna marca, ningún sitio web. Ninguno, tampoco de pasada.
- Ninguna cifra que no venga de los temas de arriba con su fuente.
- Nada que dependa de una experiencia personal detallada que no tenés: el post pregunta, no cuenta.
- No arranques con "Hola a todos" ni cierres con "gracias de antemano". Nadie escribe así acá.

CÓMO SE ESCRIBE
Título: la pregunta, directa, en español uruguayo de vos. Corta si se puede.
Cuerpo: dos o tres líneas. De dónde te salió la pregunta y qué te intriga exactamente. Se termina
con la pregunta abierta, no con una despedida.

Dame TRES candidatas distintas entre sí —distinto tema, no la misma pregunta reformulada— y para
cada una decime qué respuestas distintas esperás. Si una candidata no te deja describir respuestas
que se contradigan, esa candidata no sirve; escribí otra.${
    input.correction ? `\n\nQUÉ SALIÓ MAL EN EL INTENTO ANTERIOR\n${input.correction}` : ""
  }`;
}

export async function composeAsk(input: AskComposeInput, model: "sonnet" | "opus" = "opus"): Promise<AskCandidate[]> {
  const draft = await askClaudeJson<AskDraft>(
    buildAskPrompt(input),
    SCHEMA as unknown as Record<string, unknown>,
    { allowedTools: [], appendSystemPrompt: ASK_VOICE, timeoutMs: 240_000, model }
  );
  return (draft?.candidates ?? [])
    .map((c) => ({
      title: String(c.title || "").trim(),
      body: String(c.body || "").trim(),
      flair: String(c.flair || "").trim(),
      why: String(c.why || "").trim(),
      expectedAnswers: String(c.expectedAnswers || "").trim(),
    }))
    .filter((c) => c.title);
}

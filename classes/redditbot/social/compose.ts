// Escribir un comentario que no vende nada.
//
// La consigna del bot de respuestas es "que valga la pena leerlo aunque nadie haga clic". Acá no
// hay clic posible, así que la única vara es esa: que valga la pena leerlo. Un comentario genérico
// —"jaja qué bueno", "totalmente de acuerdo"— no suma karma, suma sospecha.
//
// Cuatro decisiones que son casi todo el módulo:
//
//  1. El modelo elige el REGISTRO antes de escribir. Media docena de subs uruguayos son de fotos y
//     de quejas, pero r/AskUruguayan es gente preguntando cosas en serio, y contestarle con una
//     ocurrencia es peor que no contestar. La gracia forzada es su propio delator.
//  2. Puede decir que no. Forzar un comentario en cada hilo es exactamente lo que produce relleno,
//     y el relleno es lo que se lee como bot.
//  3. Corto. El largo es el delator más confiable: nadie contesta un hilo de fotos del Cerro con un
//     párrafo estructurado. El techo depende del registro — una respuesta útil necesita aire, un
//     chiste no.
//  4. Un solo uruguayismo, como máximo. Amontonar "bo", "ta" y "de más" en dos líneas no suena
//     uruguayo, suena a alguien imitando a un uruguayo, que es literalmente el problema.

import { askStructured } from "../../ai_text";

/**
 * `util` = alguien preguntó algo y sabemos la respuesta. `liviano` = el hilo es una charla y se
 * entra como se entra a una charla. El registro no es tono: cambia cuánto se puede escribir.
 */
export type SocialRegister = "util" | "liviano";

export interface SocialComposeInput {
  sub: string;
  postTitle: string;
  postBody: string;
  /** Los comentarios que ya están, para no repetir el chiste que alguien hizo primero. */
  existing: readonly string[];
}

export interface SocialDraft {
  skip: boolean;
  register: SocialRegister;
  comment: string;
  why: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    skip: { type: "boolean", description: "true si no hay nada bueno para decir en este hilo" },
    register: {
      type: "string",
      enum: ["util", "liviano"],
      description: "util si la persona pregunta algo en serio; liviano si el hilo es una charla",
    },
    comment: { type: "string", description: "el comentario, vacío si skip es true" },
    why: { type: "string", description: "en pocas palabras, por qué este comentario o por qué no" },
  },
  required: ["skip", "register", "comment", "why"],
} as const;

export const SOCIAL_VOICE =
  "Sos un uruguayo de treinta y pico que comenta en Reddit. Escribís de vos, corto. No sos gracioso " +
  "a la fuerza: si alguien preguntó algo en serio le contestás en serio, si el hilo es una charla " +
  "entrás como en una charla, y si no tenés nada, no decís nada.";

export function buildSocialPrompt(input: SocialComposeInput): string {
  const existing = input.existing.length
    ? `\nLO QUE YA COMENTARON (no repitas la misma idea)\n${input.existing.map((c) => `- ${c.slice(0, 180)}`).join("\n")}\n`
    : "";

  return `Estás leyendo r/${input.sub} y te vas a meter en este hilo como cualquier usuario.

EL HILO
título: ${input.postTitle}
${input.postBody ? `texto: ${input.postBody.slice(0, 1500)}` : "(sin texto, sólo el título)"}
${existing}
PRIMERO DECIDÍ QUÉ CLASE DE HILO ES

- "util": la persona está preguntando algo concreto y esperando que alguien que sepa le conteste.
  Dónde conseguir algo, cómo se hace un trámite, qué conviene, si tal lugar vale la pena, cómo
  funciona algo acá. Es el caso más común en r/AskUruguayan y no es negociable: a alguien que
  pregunta en serio se le contesta en serio. Una ocurrencia acá es peor que el silencio.
  Podés escribir hasta cuatro oraciones y contestar de verdad: lo que sabés, la parte práctica,
  la advertencia que le va a ahorrar el viaje. Techo duro: 460 caracteres.

- "liviano": el hilo es una charla, una foto, una queja, una anécdota. Nadie espera una respuesta.
  Una oración, dos como mucho. Si tenés una ocurrencia buena va, y si no, algo normal y humano.
  Una ocurrencia mediocre no vale: mejor pasar de largo. Techo duro: 240 caracteres.

  Elegí el registro por lo que vas a ESCRIBIR, no por el clima del hilo. Si lo que tenés para decir
  explica algo, es "util" aunque el hilo sea una queja.

En la duda es "util". La gracia forzada se nota mucho más que una respuesta sobria.

QUÉ ESCRIBIR
Tiene que responder a ALGO CONCRETO de lo que escribió esta persona — un detalle, un dato que dio,
la situación puntual. Si lo que escribís serviría igual en otro hilo cualquiera, no sirve.

CÓMO SUENA
- Español uruguayo, de vos: "tenés", "fijate", "andá", "capaz que".
- Como máximo UN modismo (bo, ta, de más, salado, ni ahí). Dos ya suena a imitación.
- Sin saludo y sin despedida. Se entra al comentario por la mitad, como todo el mundo.
- Sin emojis, sin viñetas, sin negritas, sin títulos.
- Si hacés un chiste, no lo expliques.
- Nada de "espero que te sirva", "buena pregunta", "en resumen", "es importante destacar".

QUÉ NO HACER NUNCA
- Ningún enlace, ninguna página, ninguna marca propia. Ni siquiera mencionada.
- Ninguna cifra que no haya dicho la persona: ni precios, ni porcentajes, ni plazos. Nadie las va a
  poder verificar y de memoria salen mal. Si el dato exacto importa, decí dónde se consulta.
- No decir que sos un bot ni que sos una IA, y tampoco inventar experiencias personales detalladas
  ("a mí me pasó lo mismo en 2019 con mi cuñado").
- No dar consejo legal, médico ni financiero, ni opinar de política o de personas con nombre.

Si el hilo no te da nada honesto para decir —o es más delicado de lo que parece— poné skip en true
y dejá el comentario vacío. Es una respuesta perfectamente válida y la vas a usar seguido.`;
}

/**
 * ¿El título está preguntando algo?
 *
 * Decide el registro por encima de lo que diga el modelo, y existe por un caso medido: en un hilo
 * titulado "¿soy yo o la comida sabe peor que antes?" eligió "liviano" —el hilo suena a queja— y
 * después escribió una explicación de 364 caracteres sobre reformulación de productos. El texto
 * estaba bien; la etiqueta estaba mal, y la etiqueta era la que fijaba el techo.
 */
export function questionLike(title: string): boolean {
  const flat = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[^a-z0-9ñ]+/, "")
    .trim();
  return (
    title.includes("?") ||
    /^(que|cual|cuales|como|cuando|donde|quien|quienes|cuanto|cuanta|cuantos|cuantas|por que|para que|alguien sabe|alguno sabe|conocen|recomiendan|sirve|conviene|soy yo o)\b/.test(flat)
  );
}

export async function composeSocial(input: SocialComposeInput, extraHint = ""): Promise<SocialDraft | null> {
  const draft = await askStructured<SocialDraft>(
    `${buildSocialPrompt(input)}${extraHint ? `\n\nCORRECCIÓN SOBRE EL INTENTO ANTERIOR\n${extraHint}` : ""}`,
    SCHEMA as unknown as Record<string, unknown>,
    { systemHint: SOCIAL_VOICE, timeoutMs: 90_000 }
  );
  if (!draft) return null;
  // Un hilo que pregunta se contesta: el techo de charla no puede aplicarse a una respuesta que
  // alguien pidió. Y ante cualquier cosa rara, "util" — es el registro sobrio, y el sobrio nunca
  // ofende. El techo es un techo, no una cuota: nada obliga a llenarlo.
  const forced = questionLike(input.postTitle);
  return {
    skip: !!draft.skip,
    register: !forced && draft.register === "liviano" ? "liviano" : "util",
    comment: String(draft.comment || "").trim(),
    why: String(draft.why || "").trim(),
  };
}

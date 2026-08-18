// Escribir un comentario que no vende nada.
//
// La consigna del bot de respuestas es "que valga la pena leerlo aunque nadie haga clic". Acá no
// hay clic posible, así que la única vara es esa: que valga la pena leerlo. Un comentario genérico
// —"jaja qué bueno", "totalmente de acuerdo"— no suma karma, suma sospecha.
//
// Tres decisiones que son casi todo el módulo:
//
//  1. El modelo puede decir que no. `skip` existe porque forzar un comentario en cada hilo es
//     exactamente lo que produce relleno, y el relleno es lo que se lee como bot.
//  2. Una sola oración, dos como techo. El largo es el delator más confiable: nadie contesta un
//     hilo de fotos del Cerro con un párrafo estructurado.
//  3. Un solo uruguayismo, como máximo. Amontonar "bo", "ta" y "de más" en dos líneas no suena
//     uruguayo, suena a alguien imitando a un uruguayo — que es literalmente el problema.

import { askStructured } from "../../ai_text";

export interface SocialComposeInput {
  sub: string;
  postTitle: string;
  postBody: string;
  /** Los comentarios que ya están, para no repetir el chiste que alguien hizo primero. */
  existing: readonly string[];
}

export interface SocialDraft {
  skip: boolean;
  comment: string;
  why: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    skip: { type: "boolean", description: "true si no hay nada bueno para decir en este hilo" },
    comment: { type: "string", description: "el comentario, vacío si skip es true" },
    why: { type: "string", description: "en pocas palabras, por qué este comentario o por qué no" },
  },
  required: ["skip", "comment", "why"],
} as const;

export const SOCIAL_VOICE =
  "Sos un uruguayo de treinta y pico que comenta en Reddit. Escribís de vos, en minúscula o " +
  "mayúscula según te salga, corto. No sos gracioso a la fuerza: si el hilo da para una " +
  "ocurrencia la hacés, y si no, decís algo útil o directamente no decís nada.";

export function buildSocialPrompt(input: SocialComposeInput): string {
  const existing = input.existing.length
    ? `\nLO QUE YA COMENTARON (no repitas la misma idea)\n${input.existing.map((c) => `- ${c.slice(0, 180)}`).join("\n")}\n`
    : "";

  return `Estás leyendo r/${input.sub} y te vas a meter en este hilo como cualquier usuario.

EL HILO
título: ${input.postTitle}
${input.postBody ? `texto: ${input.postBody.slice(0, 1500)}` : "(sin texto, sólo el título)"}
${existing}
QUÉ ESCRIBIR
Un comentario común. Una oración, dos como mucho, menos de 220 caracteres. Tiene que responder a
ALGO CONCRETO de lo que escribió esta persona — un detalle, un dato que dio, la situación puntual.
Si lo que escribís serviría igual en otro hilo cualquiera, no sirve.

CÓMO SUENA
- Español uruguayo, de vos: "tenés", "fijate", "andá", "capaz que".
- Como máximo UN modismo (bo, ta, de más, salado, ni ahí). Dos ya suena a imitación.
- Sin saludo y sin despedida. Se entra al comentario por la mitad, como todo el mundo.
- Sin emojis, sin viñetas, sin negritas, sin títulos.
- Si hacés un chiste, no lo expliques.
- Nada de "espero que te sirva", "buena pregunta", "en resumen", "es importante destacar".

QUÉ NO HACER NUNCA
- Ningún enlace, ninguna página, ninguna marca. Ni siquiera mencionada.
- No decir que sos un bot ni que sos una IA, y tampoco fingir experiencias personales
  detalladas que no tenés (nada de "a mí me pasó lo mismo en 2019 con mi cuñado").
- No dar consejo legal, médico ni financiero.
- No opinar de política, de nadie con nombre y apellido, ni de nada que se pueda leer como agresión.

Si el hilo no te da nada honesto para decir —o es más delicado de lo que parece— poné skip en true
y dejá el comentario vacío. Es una respuesta perfectamente válida y la vas a usar seguido.`;
}

export async function composeSocial(input: SocialComposeInput, extraHint = ""): Promise<SocialDraft | null> {
  const draft = await askStructured<SocialDraft>(
    `${buildSocialPrompt(input)}${extraHint ? `\n\nCORRECCIÓN SOBRE EL INTENTO ANTERIOR\n${extraHint}` : ""}`,
    SCHEMA as unknown as Record<string, unknown>,
    { systemHint: SOCIAL_VOICE, timeoutMs: 90_000 }
  );
  if (!draft) return null;
  return { skip: !!draft.skip, comment: String(draft.comment || "").trim(), why: String(draft.why || "").trim() };
}

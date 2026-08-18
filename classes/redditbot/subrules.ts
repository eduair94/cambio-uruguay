// Dónde NO puede hablar esta cuenta, decidido antes de escribir una palabra.
//
// El 18 de agosto de 2026 r/AskUruguayan baneó permanentemente a la cuenta. El moderador lo explicó
// sin vueltas: "los bots tampoco están permitidos... permaban por intento de spam", y nombró primero
// el nombre de la cuenta, que contiene el nombre del sub. El texto no tuvo nada que ver — el
// comentario que quedó vivo era útil y estaba bien escrito.
//
// Tres cosas se aprendieron ahí, y este módulo es las tres:
//
//  1. **Un ban es para siempre y no se reintenta.** Escribir en un sub que te baneó no es un error
//     recuperable: es la definición de evasión de ban, que Reddit sanciona a nivel de cuenta y de
//     dominio. La lista de baneados es un portón cerrado antes de cualquier otra decisión.
//  2. **Algunos subs lo dicen por escrito y nadie lo estaba leyendo.** r/CharruaDevs publica "No
//     está permitido probar bots ni otros programas dentro del sub". Estaba ahí, en la API, y el
//     código que la lee ya existía —se usaba para redactar mejor los posts— pero nunca para decidir
//     si se podía hablar. Se leía la regla y se la ignoraba.
//  3. **La política puede no estar escrita.** r/AskUruguayan no prohíbe bots en ninguna de sus tres
//     reglas; su regla de spam dice que todos los dominios están habilitados. Así que leer las
//     reglas es necesario y no es suficiente, y por eso lo primero de la lista es el registro de
//     baneos: lo único que sabe de las políticas no escritas es el historial.

import { fetchSubredditRules } from "../reddit";

/**
 * Subs que banearon a la cuenta. Nunca más se les escribe.
 *
 * Hardcodeado y no en una variable de entorno: un ban no es configuración, es un hecho, y no tiene
 * que poder deshacerse por accidente al editar un .env. Sacar una entrada de acá tiene que ser una
 * decisión deliberada de alguien que sabe que el ban se levantó.
 */
export const BANNED_SUBS = new Set(["askuruguayan"]);

/**
 * Frases que, en las reglas publicadas de un sub, significan "acá no".
 *
 * Deliberadamente conservador: es preferible saltear un sub que sí nos aceptaría antes que escribir
 * en uno que lo prohíbe por escrito. Un falso positivo cuesta un sub; un falso negativo cuesta la
 * cuenta.
 */
const FORBIDS_BOTS = [
  "no está permitido probar bots",
  "no se permiten bots",
  "no están permitidos los bots",
  "prohibido el uso de bots",
  "sin bots",
  "no bots",
  "bots are not allowed",
  "no bot accounts",
];

const normalise = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface SubVerdict {
  allowed: boolean;
  reason?: string;
}

/**
 * ¿Se puede escribir en este sub?
 *
 * Primero el registro de baneos, que no admite discusión, y después lo que el sub publicó. Ante un
 * fallo de red al leer las reglas se responde que SÍ: negar por no haber podido leer apagaría el
 * trabajo entero cada vez que la API tosa, y el registro de baneos —que es lo que de verdad
 * protege— no depende de la red.
 */
export async function subWritable(sub: string): Promise<SubVerdict> {
  const key = sub.toLowerCase();
  if (BANNED_SUBS.has(key)) return { allowed: false, reason: "la cuenta está baneada de este sub" };

  const rules = await fetchSubredditRules(sub);
  if (!rules.length) return { allowed: true };

  for (const rule of rules) {
    const flat = normalise(rule);
    const hit = FORBIDS_BOTS.find((phrase) => flat.includes(normalise(phrase)));
    if (hit) return { allowed: false, reason: `sus reglas dicen "${hit}"` };
  }
  return { allowed: true };
}

/**
 * ¿Esta respuesta de Reddit es un ban?
 *
 * Reddit no contesta "estás baneado" con un código propio: contesta SUBREDDIT_NOTALLOWED en el
 * cuerpo de un 200. Un pase que sólo mira \`res.ok\` lo lee como un fallo cualquiera y lo reintenta
 * mañana, y pasado, y al otro — que es exactamente el patrón que hace que un ban de sub escale a
 * una suspensión de cuenta.
 */
export function looksLikeBan(errors: unknown): boolean {
  const flat = JSON.stringify(errors ?? "").toUpperCase();
  return (
    flat.includes("SUBREDDIT_NOTALLOWED") ||
    flat.includes("USER_BANNED") ||
    flat.includes("BANNED_FROM_SUBREDDIT")
  );
}

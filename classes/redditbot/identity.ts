// Quién dice ser esta cuenta, y dónde lo dice.
//
// La aclaración de que esto es un bot NO va al pie de cada comentario. Se probó, se revirtió, y la
// razón no es cosmética: una firma repetida al pie de sesenta comentarios es, para cualquiera que
// mire el historial, exactamente el patrón que hace que un moderador borre los sesenta de una vez,
// mientras que la misma información en el perfil la encuentra el que la busca —que es el que
// importa— sin convertir cada respuesta en un anuncio.
//
// Lo que ese acuerdo necesita para no ser una excusa es que la bio EXISTA. Una promesa que vive
// afuera del repositorio se rompe sola: alguien edita el perfil, cambia de cuenta, crea una nueva
// para probar algo, y de golpe no hay declaración en ningún lado y nadie se entera. Por eso esto es
// una puerta y no un comentario en la documentación: antes de publicar se lee la descripción
// pública de la cuenta y, si no dice lo que tiene que decir, la corrida no publica.
//
// Se chequea por SIGNIFICADO, no por texto exacto. Exigir una frase literal obliga a mantener
// sincronizados un archivo del repo y un campo de un sitio ajeno, y el día que no coincidan por una
// coma el bot se apaga por nada. Lo que se pide es que la bio diga las dos cosas: que es
// automatizado, y de qué sitio es.

/** Palabras que significan "esto lo escribe un programa". Alcanza con una. */
const BOT_WORDS = ["bot", "automat", "script", "inteligencia artificial"];

/** Cómo se puede nombrar al sitio. Alcanza con una. */
const SITE_WORDS = ["cambio-uruguay", "cambio uruguay", "cambiouruguay"];

const flat = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface BioVerdict {
  ok: boolean;
  /** Qué le falta, en una frase, para el log y para el aviso al admin. */
  reason?: string;
}

/**
 * ¿La bio declara lo que tiene que declarar?
 *
 * `null` (no se pudo leer) NO pasa. Es lo contrario de lo que hace `subrules.ts` con las reglas de
 * un sub, y la diferencia es deliberada: allá un fallo de red no puede apagar el trabajo entero
 * porque el registro de baneos —lo que de verdad protege— no depende de la red. Acá la lectura ES
 * la protección, así que no poder leerla es no tenerla.
 */
export function bioDeclaresBot(bio: string | null): BioVerdict {
  if (bio === null) return { ok: false, reason: "no se pudo leer la descripción del perfil" };

  const text = flat(bio);
  if (!text) return { ok: false, reason: "el perfil no tiene descripción pública" };

  const saysBot = BOT_WORDS.some((word) => text.includes(flat(word)));
  const saysSite = SITE_WORDS.some((word) => text.includes(flat(word)));

  if (!saysBot && !saysSite) return { ok: false, reason: "la descripción no dice que es un bot ni de qué sitio" };
  if (!saysBot) return { ok: false, reason: "la descripción nombra el sitio pero no dice que es automatizada" };
  if (!saysSite) return { ok: false, reason: "la descripción dice que es un bot pero no de qué sitio" };

  return { ok: true };
}

/**
 * El texto sugerido para el perfil. No se publica desde acá —Reddit no expone la edición de la bio
 * en la API— pero tenerlo en el repo es lo que hace que la instrucción del runbook y la validación
 * de arriba no se separen.
 */
export const SUGGESTED_BIO =
  "Cuenta automatizada de cambio-uruguay.com. Contesto preguntas de plata en subs uruguayos citando " +
  "la fuente. Si me equivoqué, respondeme y lo corrijo.";

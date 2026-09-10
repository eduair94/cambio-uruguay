// Lectura de la letra chica de una campaña de Mercado Pago Uruguay.
//
// POR QUÉ ESTO NO ES UN JOB. Los porcentajes y topes viven en
// `api.mercadopago.com/v2/discounts/campaign/<id>/terms/html`, y el `robots.txt` de ESE host dice
// `User-agent: * / Disallow: /`. La página que los enlaza (`mercadopago.com.uy/mp/promociones`) sí
// está permitida, pero no publica ni el tope ni la vigencia. Así que no hay barrido programado:
// una persona corre `npm run mp_promos`, lee lo que salió y lo escribe en
// `app/utils/mercadoPagoPromos.ts` con la fecha del día. Es el mismo trato que le damos a los
// tarifarios bancarios, que también se leen a mano y se publican fechados.
//
// MÓDULO PURO: recibe texto y devuelve datos. Toda la red vive en `scripts/oneoff/mp_promos.ts`,
// así que los tests corren contra los once párrafos reales cosechados el 2026-09-10 sin tocar
// internet.
//
// El texto es una sola oración larga y muy repetitiva entre campañas, lo cual es una suerte: las
// cifras que importan salen de cuatro expresiones regulares y no de un modelo. Lo que NO es
// uniforme, y por eso cada patrón admite variantes, es el orden de las palabras:
//
//   "el límite de descuento del Beneficio es de $ 300 por Usuario de Mercado Pago por mes"
//   "el límite de descuento del Beneficio es de $ 300 por mes y por Usuario de Mercado Pago"
//   "el límite de descuento del Beneficio es de $ 10000 por Usuario de Mercado Pago"   <- sin "por mes"
//
// La tercera variante no es un descuido de redacción: esa campaña topea por CAMPAÑA y no por mes,
// y confundirlas publicaría un tope mensual doce veces más grande del que existe.

/** Con qué hay que pagar para que el descuento aplique, según lo dice la letra chica. */
export type MercadoPagoChannel = "dinero_en_cuenta" | "qr" | "web" | "app";

/** Una promoción, tal como la declara su propio texto de términos. */
export interface MercadoPagoPromo {
  /** Número de cupón / campaña. Es la clave estable de la promoción. */
  campaignId: string;
  /** URL de los términos de los que salió cada campo de abajo. */
  termsUrl: string;
  /** Marcas alcanzadas, tal como las nombra el texto. */
  brands: string[];
  /** Porcentaje de descuento, o `null` si el texto no lo expresa como porcentaje. */
  percent: number | null;
  /** Tope de descuento en pesos. `null` cuando el texto no fija ninguno. */
  capUyu: number | null;
  /** Período del tope: por mes, o por toda la campaña. */
  capPeriod: "mes" | "campania" | null;
  /** Pago mínimo exigido, en pesos. */
  minPaymentUyu: number | null;
  /** Días de la semana en los que aplica, si el texto los acota. `null` = todos. */
  days: string | null;
  channels: MercadoPagoChannel[];
  /** Inicio y fin declarados, en ISO. */
  startsAt: string | null;
  endsAt: string | null;
  /**
   * `true` cuando el propio texto se contradice: el fin cae ANTES del inicio.
   * Pasa de verdad —ver `promoStatus`— y una promoción así no se puede publicar como vigente
   * ni como vencida sin mentir en una de las dos direcciones.
   */
  datesInconsistent: boolean;
  /** El párrafo entero, para poder auditar cualquier campo sin volver a la fuente. */
  rawTerms: string;
}

/** El párrafo operativo empieza con una de estas dos etiquetas. */
const HEAD = /(?:CUPÓN|CUPON|CAMPAÑA NÚMERO|CAMPAÑA NUMERO)\s+(\d+)\s*\./i;

/** Respuesta del endpoint cuando la campaña ya no existe. */
const UNAVAILABLE = /Campaign unavailable/i;

export function termsUrlFor(campaignId: string): string {
  return `https://api.mercadopago.com/v2/discounts/campaign/${campaignId}/terms/html`;
}

/** `true` cuando Mercado Pago dejó de servir esa campaña aunque la página la siga enlazando. */
export function isUnavailable(body: string): boolean {
  return UNAVAILABLE.test(body);
}

/**
 * Identificadores de campaña enlazados en /mp/promociones.
 *
 * Se leen del HTML servido, sin navegador: los enlaces de "T&C" viajan en el documento. Se
 * deduplican conservando el orden de aparición, que es el de la página.
 */
export function extractCampaignIds(html: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/discounts\/campaign\/(\d+)/g)) {
    const id = m[1];
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** Quita etiquetas, estilos y espacios del HTML de términos y deja el texto corrido. */
export function textFromTermsHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCharCode(Number(d)))
    // &amp; al final, para que "&amp;lt;" no se convierta en "<".
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** El párrafo que describe el beneficio: el que arranca con CUPÓN/CAMPAÑA. */
export function operativeParagraph(text: string): string | null {
  for (const line of text.split("\n")) {
    const cleaned = line.replace(/^"/, "").trim();
    if (HEAD.test(cleaned)) return cleaned;
  }
  return null;
}

/** `dd/mm/yyyy hh:mm` -> ISO. Devuelve `null` si la fecha no es real. */
function toIso(date: string, time: string): string | null {
  const [d, m, y] = date.split("/").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (!d || !m || !y) return null;
  const iso = new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0));
  if (Number.isNaN(iso.getTime())) return null;
  // Un rebote de mes delata un día que no existe (31/02).
  if (iso.getUTCMonth() !== m - 1) return null;
  return iso.toISOString();
}

/** Pesos escritos como `$ 300`, `$300` o `$ 10000`. */
function pesos(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[.\s]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Con qué se puede pagar.
 *
 * Se acumulan porque las campañas combinan: varias exigen dinero en cuenta Y ofrecen la web como
 * canal alternativo al QR presencial.
 */
function channelsFrom(p: string): MercadoPagoChannel[] {
  const out: MercadoPagoChannel[] = [];
  if (/dinero en cuenta/i.test(p)) out.push("dinero_en_cuenta");
  if (/\bQR\b/i.test(p)) out.push("qr");
  if (/en la web[: ]|www\.|\.com\.uy|\.com\b/i.test(p)) out.push("web");
  if (/apps? de Mercado Pago/i.test(p)) out.push("app");
  return out;
}

/**
 * Marcas alcanzadas.
 *
 * Sale del fragmento entre "consiste en <n>% de descuento" y la primera coma que abre la cláusula
 * del tope. Se corta ahí y no se intenta más: el texto mete el RUT, el canal y hasta la URL en la
 * misma oración, y cualquier intento de limpiar más termina inventando nombres. Lo que no se puede
 * separar con confianza queda en `rawTerms`, que viaja entero.
 */
function brandsFrom(p: string): string[] {
  const m = p.match(/consiste en[^,]*?%\s*(?:de descuento)?\s*(.*?),\s*el l[íi]mite/i);
  if (!m?.[1]) return [];
  const chunk = m[1]
    .replace(/\(([^)]*)\)/g, " ") // RUTs y razones sociales entre paréntesis
    .replace(/\bde lunes a viernes\b/gi, " ")
    .replace(/\ben todas las sucursales\b/gi, " ")
    .replace(/\ben locales adheridos\b/gi, " ")
    .replace(/pagando con .*/i, " ")
    .replace(/\bcon QR de Mercado Pago\b.*/i, " ")
    .replace(/\ben pagos presenciales\b.*/i, " ")
    .replace(/\búnicamente para .*/i, " ")
    .replace(/^\s*(?:en|la|las|los)\s+/i, "")
    .replace(/^\s*(?:marcas?|tiendas?)\s*:?\s*/i, "")
    .replace(/^\s*(?:en|la|las|los)\s+/i, "")
    .replace(/^\s*(?:marcas?|tiendas?)\s+(?:de\s+)?/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!chunk) return [];
  return chunk
    .split(/\s*(?:,|\by\b)\s*/i)
    .map((s) => s.replace(/[.\s]+$/, "").trim())
    .filter((s) => s.length > 1 && !/^(descuento|marca|marcas)$/i.test(s));
}

/**
 * Convierte el párrafo de términos en datos.
 *
 * Devuelve `null` sólo si no encuentra el párrafo: una campaña a la que le falte el tope o el
 * porcentaje se guarda igual con ese campo en `null`, porque el resto sigue siendo cierto y
 * descartarla entera escondería una promoción que existe.
 */
export function parseTerms(campaignId: string, html: string): MercadoPagoPromo | null {
  const text = textFromTermsHtml(html);
  const p = operativeParagraph(text);
  if (!p) return null;

  const window = p.match(
    /del\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+al\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/i
  );
  const startsAt = window ? toIso(window[1]!, window[2]!) : null;
  const endsAt = window ? toIso(window[3]!, window[4]!) : null;

  const percentMatch = p.match(/consiste en\s*(\d+(?:[.,]\d+)?)\s*%/i);
  const percent = percentMatch ? Number(percentMatch[1]!.replace(",", ".")) : null;

  const capMatch = p.match(
    /l[íi]mite de descuento del Beneficio es de\s*\$\s*([\d.,]+)\s*(por mes[^,.]*|por Usuario[^,.]*)?/i
  );
  const capUyu = pesos(capMatch?.[1]);
  const capTail = capMatch?.[2] ?? "";
  const capPeriod: MercadoPagoPromo["capPeriod"] =
    capUyu === null ? null : /por mes/i.test(capTail) ? "mes" : "campania";

  const minMatch = p.match(/pago m[íi]nimo de\s*\$\s*([\d.,]+)/i);
  const daysMatch = p.match(
    /\bde (lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo) a (lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bados?|domingos?)\b/i
  );

  return {
    campaignId,
    termsUrl: termsUrlFor(campaignId),
    brands: brandsFrom(p),
    percent,
    capUyu,
    capPeriod,
    minPaymentUyu: pesos(minMatch?.[1]),
    days: daysMatch ? daysMatch[0].replace(/^de\s+/i, "").trim() : null,
    channels: channelsFrom(p),
    startsAt,
    endsAt,
    datesInconsistent: Boolean(startsAt && endsAt && endsAt < startsAt),
    rawTerms: p,
  };
}

/**
 * Estado de una promoción a una fecha dada.
 *
 * `indeterminado` no es un caso teórico: la campaña 13753764 declara "del 01/06/2026 11:11 al
 * 31/03/2026 23:59", o sea que termina tres meses antes de empezar. Publicarla como vigente o como
 * vencida sería elegir una de las dos mentiras; se publica como lo que es.
 */
export function promoStatus(
  promo: Pick<MercadoPagoPromo, "startsAt" | "endsAt" | "datesInconsistent">,
  now: Date = new Date()
): "vigente" | "vencida" | "futura" | "indeterminado" {
  if (promo.datesInconsistent) return "indeterminado";
  if (!promo.startsAt || !promo.endsAt) return "indeterminado";
  const iso = now.toISOString();
  if (iso < promo.startsAt) return "futura";
  if (iso > promo.endsAt) return "vencida";
  return "vigente";
}

/**
 * Consumo mensual a partir del cual el tope deja el descuento en cero marginal.
 *
 * Es la cifra que ninguna de las dos fuentes publica y la única que vuelve comparable un 20 % con
 * un 10 %: con tope de $ 300, el 20 % se agota a los $ 1.500 de consumo y el 10 % a los $ 3.000.
 */
export function saturationUyu(promo: Pick<MercadoPagoPromo, "percent" | "capUyu">): number | null {
  if (!promo.percent || promo.percent <= 0 || promo.capUyu === null) return null;
  return Math.round((promo.capUyu / promo.percent) * 100);
}

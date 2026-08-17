// The evergreen-content catalogue the promoter rotates through.
//
// WHY THIS EXISTS: GA4 for 2026-08-17 recorded 471 sessions from a single t.co
// referral in one morning, against an organic baseline of roughly 30 users a
// day. One tweet outperformed a fortnight of search. The daily report already
// posts the dollar figures; nothing ever posts the *guides*, which are the pages
// that actually get shared.
//
// RULE FOR ADDING A HOOK: it must be a claim the page really makes, and one that
// is stable — no live figures, no "this month". These go out under the site's
// name to an audience of real people; a wrong number here is a public wrong
// number, and unlike a page it cannot be edited after the fact. Prefer the
// mechanism ("the seguro sobre saldo deudor keeps running for two years") over
// the magnitude ("you lose $4.312"), because mechanisms do not go stale.

export interface ContentPromo {
  /** Site path, no locale prefix, no trailing slash. Must exist in `app/utils/siteNav.ts`. */
  slug: string;
  /** The hook: one or two sentences, in rioplatense Spanish, no hype. */
  hook: string;
}

export const CONTENT_PROMOS: readonly ContentPromo[] = Object.freeze([
  {
    slug: "/conviene-comprar-en-cuotas",
    hook: "“24 cuotas sin interés” casi nunca es sin costo: el seguro sobre saldo deudor te lo cobran todos los meses sobre lo que falta pagar, y pagando con débito perdés 2 puntos de IVA que la cuota no te devuelve. Hicimos la cuenta completa.",
  },
  {
    slug: "/derechos-consumidor-compras-online",
    hook: "Si comprás online en Uruguay tenés 5 días hábiles para arrepentirte sin explicar por qué. Es la Ley 17.250, es de orden público y ningún “términos y condiciones” te lo puede sacar.",
  },
  {
    slug: "/alquilar-estando-en-clearing",
    hook: "Estar en el Clearing no te deja afuera de todas las garantías de alquiler: la Ley 20.212 le prohíbe a los organismos públicos negarte el servicio por figurar en una base de datos comercial. Cuál te sirve y cuál no.",
  },
  {
    slug: "/tarjetas-de-credito-uruguay",
    hook: "Comparamos los programas de puntos y beneficios de las tarjetas uruguayas con una rúbrica ponderada, y dejamos cada puntaje a la vista: si no estás de acuerdo con el criterio, mirás de dónde sale el número.",
  },
  {
    slug: "/tarjetas-de-debito-uruguay",
    hook: "Comprar en dólares con débito o prepaga uruguaya no cuesta lo mismo en todas: entre el recargo del emisor y el tipo de cambio que aplica, la diferencia por la misma compra es real. Ranking y calculadora.",
  },
  {
    slug: "/mejores-bancos-uruguay",
    hook: "Tier list de bancos y fintech uruguayas: app, comisiones, atención y qué te cobran por lo que ya hacés. Los tiers salen de un puntaje, no de una opinión.",
  },
  {
    slug: "/salir-del-clearing",
    hook: "El Clearing de Informes y la Central de Riesgos del BCU no son lo mismo, y salir de uno no te saca del otro. Qué mira cada uno, cuánto tiempo quedás y qué podés reclamar.",
  },
  {
    slug: "/saldar-deudas-uruguay",
    hook: "Antes de aceptar una quita conviene saber si la deuda todavía se puede reclamar. Guía para negociar, con verificador de prescripción y qué esperar de cada empresa que ofrece “borrarte” del Clearing.",
  },
  {
    slug: "/importar-para-revender-uruguay",
    hook: "Traer cosas del exterior para revender no está prohibido: el régimen de courier admite fines comerciales. El límite real es otro, y casi nadie lo tiene claro.",
  },
  {
    slug: "/recibir-regalos-del-exterior-uruguay",
    hook: "Que un paquete venga marcado como “regalo” no lo hace libre de impuestos. Qué es un obsequio para la Aduana uruguaya, y qué es lo que de verdad frena un envío.",
  },
  {
    slug: "/problemas-con-la-aduana-uruguay",
    hook: "Tu paquete está trancado y no sabés por qué. Guía por síntoma: qué significa cada estado, a quién le corresponde resolverlo y qué trámite existe de verdad para cada caso.",
  },
  {
    slug: "/estafas-uruguay",
    hook: "Si te vaciaron la cuenta, quién tiene que probar qué. En Uruguay la carga de la prueba no está donde la mayoría cree, y con las billeteras virtuales estás menos protegido que con una tarjeta.",
  },
  {
    slug: "/comprar-o-alquilar-uruguay",
    hook: "La cuenta de “pagar alquiler es tirar la plata” se olvida de tres costos de comprar. Los pusimos todos y dejamos que compares con tus números.",
  },
  {
    slug: "/vivir-con-25000-pesos-uruguay",
    hook: "Qué se puede y qué no con 25.000 pesos por mes en Uruguay, con los números de verdad: salario mínimo, canasta y lo que se lleva el alquiler.",
  },
  {
    slug: "/facturar-en-monotributo-uruguay",
    hook: "El monotributo no está obligado a emitir factura electrónica. Si te dijeron que sí, te están vendiendo algo que no necesitás.",
  },
  {
    slug: "/denunciar-trabajo-en-negro-uruguay",
    hook: "Denunciar trabajo no registrado en Uruguay tiene tres puertas —BPS, MTSS e Inspección— y no piden lo mismo. Cuál te sirve según lo que quieras conseguir.",
  },
  {
    slug: "/que-empresa-abrir-uruguay",
    hook: "Unipersonal, SAS o SRL: la respuesta depende de cuánto vas a facturar y de qué te habilita cada una, no de cuál suena mejor. Recomendador con los costos reales.",
  },
  {
    slug: "/herramientas/calculadora-sueldo-liquido",
    hook: "De nominal a líquido en Uruguay: BPS, FONASA, IRPF y el fondo de solidaridad, con el detalle de cada descuento en vez de un número final sin explicación.",
  },
]);

/** X counts every URL as 23 characters regardless of length (t.co wrapping). */
export const TCO_URL_LENGTH = 23;

/** X's limit for a standard post. */
export const TWEET_LIMIT = 280;

/**
 * Renders one promo as a tweet: hook, blank line, link.
 *
 * The hook is trimmed to whatever is left after the link rather than the tweet
 * being rejected — but trimming happens on a word boundary with an ellipsis, so a
 * too-long hook reads as abbreviated instead of truncated mid-word. In practice
 * the catalogue is written to fit; this is the guard, not the plan.
 */
export function formatContentPromo(promo: ContentPromo, siteBaseUrl: string): string {
  const url = `${siteBaseUrl.replace(/\/+$/, "")}${promo.slug}`;
  const budget = TWEET_LIMIT - TCO_URL_LENGTH - 2; // 2 = the blank line before the link
  let hook = promo.hook.trim();
  if (hook.length > budget) {
    const cut = hook.slice(0, budget - 1);
    const lastSpace = cut.lastIndexOf(" ");
    hook = `${(lastSpace > budget * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "")}…`;
  }
  return `${hook}\n\n${url}`;
}

/** The length X will actually count for `tweet`, with URLs at their t.co cost. */
export function tweetLength(tweet: string): number {
  return tweet.replace(/https?:\/\/\S+/g, "x".repeat(TCO_URL_LENGTH)).length;
}

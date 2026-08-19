// Which of the site's money topics a video is about.
//
// Deterministic, keyword-based, and sharing its matcher with the trends classifier
// (`classes/trends/classify.ts`) rather than owning a second copy: same normalisation, same
// whole-word rule, so "recambio" never counts as "cambio" here either.
//
// Why not an LLM: this runs over hundreds of titles a day and its output decides which URL a video
// is listed under. A model that reclassifies the same video differently between two runs would move
// pages under Google's feet daily, and a model that invents a topic would create a page family
// nobody wrote. A table is testable and boring, which is what a URL-shaping decision should be.
//
// The cost, stated on the page: this reads the TITLE and the first paragraph of the description. A
// video called "Editorial de los lunes" that spends 20 minutes on the dollar is invisible to it.

import { containsWord, normalizeForMatch } from "../trends/classify";

export interface VideoTopic {
  /** URL slug. Also the key in `topicCounts` and in the app's copy table. */
  slug: string;
  /** Human label. The app owns the SEO copy; this is only for logs and as a fallback. */
  label: string;
  /** Lowercase, accent-free. Matched whole-word against title + first paragraph. */
  keywords: readonly string[];
}

/**
 * The topics, in the order a tie is broken.
 *
 * Ordered by how specific the topic is, not by how much traffic it gets: a video about the IRPF on
 * a fixed-term deposit should land under "impuestos" before "ahorro", so the narrower topic is
 * listed first. A video can carry several topics; `topics[0]` is its primary.
 */
export const VIDEO_TOPICS: readonly VideoTopic[] = Object.freeze([
  {
    slug: "dolar-y-cotizaciones",
    label: "Dólar y cotizaciones",
    keywords: [
      "dolar",
      "dolares",
      "tipo de cambio",
      "cotizacion",
      "cotizaciones",
      "casa de cambio",
      "casas de cambio",
      "devaluacion",
      "peso uruguayo",
      "peso argentino",
      "real brasileno",
      "euro",
      "dolar blue",
      "atraso cambiario",
      "divisa",
      "divisas",
    ],
  },
  {
    slug: "inflacion-y-precios",
    label: "Inflación y precios",
    keywords: [
      "inflacion",
      "ipc",
      "indice de precios",
      "canasta basica",
      "costo de vida",
      "aumento de precios",
      "suba de precios",
      "precios",
      "tarifas",
      "nafta",
      "combustible",
      "ancap",
      "ute",
      "supermercado",
      "supermercados",
      "deflacion",
    ],
  },
  {
    slug: "impuestos-y-dgi",
    label: "Impuestos",
    keywords: [
      "irpf",
      "iva",
      "imesi",
      "irae",
      "dgi",
      "impuesto",
      "impuestos",
      "monotributo",
      "monotributista",
      "declaracion jurada",
      "exoneracion",
      "carga tributaria",
      "presion fiscal",
      "rendicion de cuentas",
      "presupuesto nacional",
      "reforma tributaria",
    ],
  },
  {
    slug: "jubilaciones-y-afap",
    label: "Jubilaciones y AFAP",
    keywords: [
      "jubilacion",
      "jubilaciones",
      "jubilado",
      "jubilados",
      "afap",
      "bps",
      "pension",
      "pensiones",
      "reforma jubilatoria",
      "reforma de la seguridad social",
      "seguridad social",
      "caja profesional",
      "caja notarial",
      "caja bancaria",
    ],
  },
  {
    slug: "sueldos-y-trabajo",
    label: "Sueldos y trabajo",
    keywords: [
      "salario",
      "salarios",
      "sueldo",
      "sueldos",
      "salario minimo",
      "consejo de salarios",
      "aguinaldo",
      "salario vacacional",
      "despido",
      "seguro de paro",
      "desempleo",
      "empleo",
      "mercado laboral",
      "sindicato",
      "pit cnt",
      "paro general",
      "freelance",
      "trabajo remoto",
      "informalidad",
      "trabajo en negro",
    ],
  },
  {
    slug: "creditos-y-deudas",
    label: "Créditos y deudas",
    keywords: [
      "credito",
      "creditos",
      "prestamo",
      "prestamos",
      "deuda",
      "deudas",
      "endeudamiento",
      "clearing",
      "tarjeta de credito",
      "tarjetas de credito",
      "cuotas",
      "usura",
      "tasa de interes",
      "financiacion",
      "refinanciacion",
    ],
  },
  {
    slug: "vivienda-y-alquileres",
    label: "Vivienda y alquileres",
    keywords: [
      "alquiler",
      "alquileres",
      "alquilar",
      "inmobiliario",
      "inmobiliaria",
      "hipoteca",
      "hipotecario",
      "credito hipotecario",
      "comprar casa",
      "comprar un apartamento",
      "vivienda",
      "mevir",
      "cooperativa de vivienda",
      "garantia de alquiler",
      "metro cuadrado",
    ],
  },
  {
    slug: "criptomonedas-y-bitcoin",
    label: "Criptomonedas",
    keywords: [
      "bitcoin",
      "btc",
      "ethereum",
      "cripto",
      "criptomoneda",
      "criptomonedas",
      "stablecoin",
      "usdt",
      "blockchain",
      "binance",
      "ley cripto",
    ],
  },
  {
    slug: "importar-y-aduana",
    label: "Importar y aduana",
    keywords: [
      "aduana",
      "franquicia",
      "courier",
      "importar",
      "importacion",
      "importaciones",
      "exportacion",
      "exportaciones",
      "arancel",
      "aranceles",
      "compras en el exterior",
      "temu",
      "shein",
      "aliexpress",
      "despachante",
      "zona franca",
      "puerto de montevideo",
      "frontera",
    ],
  },
  {
    slug: "inversiones-y-bolsa",
    label: "Inversiones",
    keywords: [
      "inversion",
      "inversiones",
      "invertir",
      "bolsa",
      "acciones",
      "bonos",
      "obligaciones negociables",
      "renta fija",
      "renta variable",
      "fondo de inversion",
      "etf",
      "nasdaq",
      "dividendos",
      "broker",
      "corredor de bolsa",
      "portafolio",
      "riesgo pais",
      "unidad indexada",
      "plazo fijo",
    ],
  },
  {
    slug: "ahorro-y-finanzas-personales",
    label: "Ahorro y finanzas personales",
    keywords: [
      "ahorro",
      "ahorrar",
      "finanzas personales",
      "presupuesto personal",
      "educacion financiera",
      "libertad financiera",
      "fondo de emergencia",
      "gastos hormiga",
      "interes compuesto",
      "caja de ahorro",
      "cuenta remunerada",
      "cuenta bancaria",
      "billetera virtual",
    ],
  },
  {
    slug: "emprender-y-negocios",
    label: "Emprender y negocios",
    keywords: [
      "emprender",
      "emprendedor",
      "emprendedores",
      "emprendimiento",
      "negocio",
      "negocios",
      "pyme",
      "pymes",
      "startup",
      "startups",
      "facturacion",
      "abrir una empresa",
      "sociedad anonima",
      "unipersonal",
      "ande",
      "inversion extranjera",
    ],
  },
  {
    slug: "macroeconomia-y-bcu",
    label: "Economía uruguaya",
    keywords: [
      "economia uruguaya",
      "economia de uruguay",
      "pbi",
      "pib",
      "producto bruto interno",
      "actividad economica",
      "deficit fiscal",
      "deuda publica",
      "banco central",
      "bcu",
      "politica monetaria",
      "tasa de politica monetaria",
      "mef",
      "ministerio de economia",
      "calificadora",
      "grado inversor",
      "balanza comercial",
      "cepal",
      "fmi",
      "recesion",
      "crecimiento economico",
    ],
  },
]);

/** Every topic slug, in table order. */
export function topicSlugs(): string[] {
  return VIDEO_TOPICS.map(t => t.slug);
}

export function getVideoTopic(slug: string): VideoTopic | undefined {
  return VIDEO_TOPICS.find(t => t.slug === slug);
}

/**
 * Which topics one video belongs to.
 *
 * Pass the title first and the first paragraph second: both are searched, but the caller decides
 * how much description to hand over — feeding a full YouTube description in would match half the
 * table off the boilerplate links at the bottom.
 *
 * Returns table order, so `topics[0]` is the most specific match.
 */
export function classifyTopics(...parts: Array<string | null | undefined>): string[] {
  const haystack = normalizeForMatch(parts.filter(Boolean).join(" · "));
  if (!haystack) return [];
  return VIDEO_TOPICS.filter(topic => topic.keywords.some(k => containsWord(haystack, k))).map(
    t => t.slug
  );
}

// Is this question ours to answer?
//
// The bot may only create a page inside the subjects the site is about. That is not modesty: a page
// on a topic nobody here can maintain rots, dilutes the site's authority with search engines, and —
// worse — invites the bot to answer things it has no business answering. "Está dentro de alguna
// temática" is the gate, and it is applied BEFORE any research is paid for.
//
// The list is the site's actual coverage, written out rather than inferred from the sitemap: the
// sitemap tells you what exists, not what belongs.

export interface SiteTopic {
  key: string;
  label: string;
  /** What a page in this area looks like, for the classifier. */
  scope: string;
}

export const SITE_TOPICS: readonly SiteTopic[] = [
  { key: "cambio", label: "Cambio de divisas", scope: "dólar, euro, real, casas de cambio, cotizaciones, arbitraje, BCU" },
  { key: "importacion", label: "Importación y aduana", scope: "courier, franquicias, DUA, despachante, IVA y aranceles de importación, Correo" },
  { key: "bancos", label: "Bancos y medios de pago", scope: "cuentas, tarjetas de débito y crédito, comisiones, apps, transferencias, billeteras" },
  { key: "credito", label: "Crédito y deudas", scope: "préstamos, tasas, clearing, usura, refinanciación, cooperativas" },
  { key: "impuestos", label: "Impuestos y trabajo", scope: "IRPF, DGI, BPS, monotributo, facturación, sueldo líquido, aguinaldo, FONASA" },
  { key: "vivienda", label: "Vivienda y alquiler", scope: "alquiler, garantías, comisión inmobiliaria, comprar vs alquilar, gastos comunes" },
  { key: "inversion", label: "Inversión y ahorro", scope: "plazos fijos, bonos, letras, fondos, brokers, impuestos a la renta de capital" },
  { key: "consumo", label: "Derechos del consumidor", scope: "compras online, garantías, devoluciones, estafas, reclamos, Defensa al Consumidor" },
  { key: "costos", label: "Costo de vida", scope: "canasta, servicios, combustible, transporte, comparaciones de precios" },
  { key: "vehiculos", label: "Vehículos y su costo", scope: "patente, multas, transferencia, deuda de un vehículo usado" },
];

/**
 * Subjects that are adjacent to ours and still off limits.
 *
 * Each of these looks like a money question and is really something else — someone's own legal
 * case, their health, their immigration status. A generated page on any of them would be a
 * confident stranger answering a question that needs a professional who knows the file.
 */
export const OUT_OF_SCOPE = [
  "asesoramiento legal sobre un caso concreto",
  "salud, mutualistas y tratamientos",
  "trámites migratorios y residencia",
  "política partidaria y elecciones",
  "recomendar un profesional, empresa o producto concreto para contratar",
  "criptomonedas como oportunidad de inversión o predicción de precios",
  "cualquier cosa que involucre a una persona identificable",
];

export const topicList = (): string =>
  SITE_TOPICS.map((topic) => `- ${topic.key}: ${topic.label} — ${topic.scope}`).join("\n");

export const topicByKey = (key: string): SiteTopic | undefined =>
  SITE_TOPICS.find((topic) => topic.key === key);

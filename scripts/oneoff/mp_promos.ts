// npm run mp_promos
//
// Refrescador MANUAL de las promociones de Mercado Pago Uruguay. No es un job y no debe volverse
// uno: los porcentajes y los topes viven en `api.mercadopago.com`, cuyo `robots.txt` es
// `User-agent: * / Disallow: /`. La página que las lista (`mercadopago.com.uy/mp/promociones`) sí
// está permitida, pero publica sólo el nombre del comercio: ni el tope, ni los días, ni la
// vigencia — que es justamente lo que cambia la decisión.
//
// Por eso el trato es el mismo que le damos a los tarifarios bancarios: una persona corre esto
// cuando quiere actualizar, mira lo que salió y lo pega en `app/utils/mercadoPagoPromos.ts` con la
// fecha del día. Lo que se publica queda fechado y con el enlace a los términos oficiales, así
// cualquiera puede contrastar cada cifra contra su fuente.
//
// Salida: el bloque TypeScript listo para pegar, más un resumen de lo que cambió de forma.
import { parseTerms, extractCampaignIds, isUnavailable, promoStatus, saturationUyu, termsUrlFor } from "../../classes/mercadopago/parse";
import type { MercadoPagoPromo } from "../../classes/mercadopago/parse";

const LISTING = "https://www.mercadopago.com.uy/mp/promociones";

/**
 * UA de navegador.
 *
 * Mercado Pago devuelve 403 a un cliente que no la manda. La identificación va aparte, en una
 * cabecera propia que el operador puede ver en sus registros y filtrar si quiere: es el mismo
 * criterio que ya usamos con el portal de El País. Anunciarse en la UA ahí no nos hace honestos,
 * nos hace invisibles.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const HEADERS = {
  "user-agent": UA,
  "accept-language": "es-UY,es;q=0.9",
  "x-cambio-uruguay-bot": "https://cambio-uruguay.com (refresco manual de promociones)",
};

async function getText(url: string, timeoutMs = 20_000): Promise<string> {
  // `AbortSignal.timeout` y no un timeout de socket: un CONNECT colgado nunca produce socket, así
  // que un temporizador atado al socket no dispara. El repo ya pagó ese error una vez.
  const res = await fetch(url, {
    headers: HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.text();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tsLiteral(promo: MercadoPagoPromo): string {
  const q = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  const arr = (xs: string[]) => `[${xs.map(q).join(", ")}]`;
  const orNull = (n: number | null) => (n === null ? "null" : String(n));
  return `  {
    campaignId: ${q(promo.campaignId)},
    brands: ${arr(promo.brands)},
    percent: ${orNull(promo.percent)},
    capUyu: ${orNull(promo.capUyu)},
    capPeriod: ${promo.capPeriod === null ? "null" : q(promo.capPeriod)},
    minPaymentUyu: ${orNull(promo.minPaymentUyu)},
    days: ${promo.days === null ? "null" : q(promo.days)},
    channels: ${arr(promo.channels)},
    startsAt: ${promo.startsAt === null ? "null" : q(promo.startsAt)},
    endsAt: ${promo.endsAt === null ? "null" : q(promo.endsAt)},
    datesInconsistent: ${promo.datesInconsistent},
    termsUrl: ${q(promo.termsUrl)},
    rawTerms:
      ${q(promo.rawTerms)},
  },`;
}

async function main() {
  console.log(`Leyendo ${LISTING} ...`);
  const listing = await getText(LISTING);
  const ids = extractCampaignIds(listing);
  console.log(`Campañas enlazadas: ${ids.length}\n`);

  const promos: MercadoPagoPromo[] = [];
  const unavailable: string[] = [];
  const unparsed: string[] = [];

  for (const id of ids) {
    let body: string;
    try {
      body = await getText(termsUrlFor(id));
    } catch (err) {
      console.log(`  ${id}: FALLÓ (${(err as Error).message})`);
      unparsed.push(id);
      continue;
    }
    if (isUnavailable(body)) {
      // La página enlaza campañas que el endpoint ya no sirve. Se declara el faltante; no se
      // arrastra la versión vieja como si siguiera viva.
      console.log(`  ${id}: la campaña ya no existe (enlazada igual en la página)`);
      unavailable.push(id);
      await sleep(400);
      continue;
    }
    const promo = parseTerms(id, body);
    if (!promo) {
      console.log(`  ${id}: no se encontró el párrafo de términos — revisar a mano`);
      unparsed.push(id);
      await sleep(400);
      continue;
    }
    const estado = promoStatus(promo);
    const sat = saturationUyu(promo);
    console.log(
      `  ${id}: ${promo.percent ?? "?"}% ${promo.brands.join(" / ") || "(sin marca legible)"}` +
        ` · tope $${promo.capUyu ?? "?"}${promo.capPeriod === "mes" ? "/mes" : promo.capPeriod === "campania" ? "/campaña" : ""}` +
        `${sat ? ` · se agota a los $${sat}` : ""}` +
        `${promo.days ? ` · ${promo.days}` : ""} · ${estado}`
    );
    promos.push(promo);
    // Ritmo deliberado: son doce peticiones a mano, no hay ninguna prisa.
    await sleep(400);
  }

  console.log(`\n─── Para pegar en app/utils/mercadoPagoPromos.ts ───\n`);
  console.log(`export const MERCADO_PAGO_PROMOS_REVIEWED = '${new Date().toISOString().slice(0, 10)}'\n`);
  console.log(`export const MERCADO_PAGO_PROMOS: readonly MercadoPagoPromo[] = [`);
  for (const p of promos) console.log(tsLiteral(p));
  console.log(`]`);

  if (unavailable.length) {
    console.log(`\nCampañas enlazadas sin términos (Campaign unavailable): ${unavailable.join(", ")}`);
  }
  if (unparsed.length) {
    console.log(`Campañas que hay que mirar a mano: ${unparsed.join(", ")}`);
  }
  console.log(`\nParseadas ${promos.length} de ${ids.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

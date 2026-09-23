// Los precios vivos que alimentan el comparador: cuánto sale hoy cada modo.
//
// Nada de esto se releva acá. Cada número ya lo publica un job del sitio, y este módulo LEE lo que
// esos jobs dejaron: el boleto del STM (`currency-figures`), la nafta (`currency-combustibles`), las
// tasas de financiación (`currency-loans`), y los catálogos de vehículos de la base del app
// (`movilidaditems`, `carcatalog`, `motocatalog`). Si una fuente falta, falta ESE modo y el resto
// sigue: la página muestra lo que tiene y dice qué le faltó, en vez de no mostrar nada.
//
// LA DECISIÓN QUE MÁS CAMBIA EL RESULTADO: qué precio de auto usar. La mediana del catálogo de autos
// usados no es "lo que sale un auto para ir a trabajar" — el catálogo incluye camionetas de US$ 40.000
// y el que está evaluando dejar el ómnibus no está mirando esas. Por eso se publica la BANDA
// (p25/mediana/p75) y la página arranca en el p25, con el control para moverse. Un solo número acá
// decidiría la respuesta de la página sin que el visitante lo sepa.
import { annualDropOf, depreciationOf } from "../autos/report";
import { appConnection } from "../appdb";
import { loadFigures } from "../figures/store";
import { loadFuelRows } from "../combustibles/store";
import { loadLoanRates } from "../loans/store";
import { KWH_RESIDENTIAL_UYU } from "./energy";
import type { TransportMode, TransportPrices, TransportVehiclePrice } from "./types";

/** Percentil de una lista ya ordenada o no. */
function quantile(values: number[], fraction: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  if (low === high) return sorted[low]!;
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (position - low);
}

/** Cuánto vale un dólar en pesos, del mismo lugar del que lo toma el resto de los catálogos. */
async function readUsdUyu(): Promise<number | null> {
  const db = appConnection();
  const meta = await db
    .collection("carcatalogmetas")
    .findOne({ key: "uy-cars" }, { projection: { _id: 0, usdUyu: 1, "meta.usdUyu": 1 }, maxTimeMS: 5000 })
    .catch(() => null);
  const value = Number((meta as any)?.usdUyu ?? (meta as any)?.meta?.usdUyu);
  return Number.isFinite(value) && value > 10 ? value : null;
}

interface VehicleRow {
  priceUyu: number;
  year?: number | null;
  priceUsd?: number | null;
}

function bandOf(
  rows: VehicleRow[],
  options: { condition: "nuevo" | "usado"; source: string; asOf: string | null; anchor?: number }
): TransportVehiclePrice | null {
  const prices = rows.map(row => row.priceUyu).filter(price => Number.isFinite(price) && price > 0);
  if (prices.length < 5) return null;
  const anchor = options.anchor ?? 0.25;
  return {
    referenceUyu: Math.round(quantile(prices, anchor)),
    p25Uyu: Math.round(quantile(prices, 0.25)),
    p75Uyu: Math.round(quantile(prices, 0.75)),
    condition: options.condition,
    offers: prices.length,
    asOf: options.asOf,
    measuredAnnualDepreciation: measuredDrop(rows),
    source: options.source,
  };
}

/**
 * Cuánto pierde por año, medido sobre el propio catálogo con la misma recta que usa el informe de
 * autos (`annualDropOf`): la mediana por año de fabricación en escala logarítmica, ponderada por la
 * raíz de la cantidad de avisos. `null` cuando el catálogo no tiene años suficientes — y entonces la
 * página usa el supuesto curado y lo dice.
 */
function measuredDrop(rows: VehicleRow[]): number | null {
  const usable = rows
    .filter(row => Number.isFinite(row.year) && Number.isFinite(row.priceUsd) && (row.priceUsd ?? 0) > 0)
    .map(row => ({ year: Number(row.year), priceUsd: Number(row.priceUsd) }));
  if (usable.length < 30) return null;
  const maxYear = Math.max(...usable.map(row => row.year));
  return annualDropOf(depreciationOf(usable, maxYear));
}

async function readCars(usdUyu: number): Promise<{ price: TransportVehiclePrice | null; consumption: number | null }> {
  const db = appConnection();
  const meta = await db
    .collection("carcatalogmetas")
    .findOne({ key: "uy-cars" }, { projection: { _id: 0, generatedAt: 1 }, maxTimeMS: 5000 })
    .catch(() => null);

  const rows: VehicleRow[] = [];
  const consumptions: number[] = [];
  const cursor = db.collection("carcatalog").find(
    {},
    {
      projection: { _id: 0, price: 1, currency: 1, currencyInferred: 1, year: 1, "specs.fuelConsumption": 1, consumption: 1 },
      batchSize: 1000,
      maxTimeMS: 120_000,
    }
  );
  try {
    for await (const row of cursor as any) {
      const price = Number(row?.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      // Una moneda DEDUCIDA no entra: el catálogo la marca justamente porque no la pudo leer, y un
      // precio en la moneda equivocada mueve la mediana dos órdenes de magnitud.
      if (row?.currencyInferred) continue;
      const currency = String(row?.currency || "USD").toUpperCase();
      const priceUsd = currency === "USD" ? price : price / usdUyu;
      const priceUyu = currency === "USD" ? price * usdUyu : price;
      if (priceUsd < 500 || priceUsd > 120_000) continue;
      rows.push({ priceUyu, priceUsd, year: Number(row?.year) || null });
      const consumption = Number(row?.consumption ?? row?.specs?.fuelConsumption);
      if (Number.isFinite(consumption) && consumption > 2 && consumption < 30) consumptions.push(consumption);
    }
  } finally {
    await (cursor as any).close?.();
  }

  return {
    price: bandOf(rows, {
      condition: "usado",
      source: "carcatalog",
      asOf: isoOf((meta as any)?.generatedAt),
      anchor: 0.25,
    }),
    consumption: consumptions.length >= 20 ? Math.round(quantile(consumptions, 0.5) * 10) / 10 : null,
  };
}

async function readMotos(usdUyu: number): Promise<TransportVehiclePrice | null> {
  const db = appConnection();
  const collections = await db.db.listCollections({ name: "motocatalog" }).toArray().catch(() => []);
  // El directorio de motos es un sub-proyecto hermano: mientras no exista, este modo se publica como
  // "sin datos relevados" en vez de estimarse con el precio de otra cosa.
  if (!collections.length) return null;

  const meta = await db
    .collection("motocatalogmetas")
    .findOne({ key: "uy-motos" }, { projection: { _id: 0, generatedAt: 1 }, maxTimeMS: 5000 })
    .catch(() => null);

  const rows: VehicleRow[] = [];
  const cursor = db.collection("motocatalog").find(
    {},
    { projection: { _id: 0, price: 1, currency: 1, currencyInferred: 1, year: 1 }, batchSize: 1000, maxTimeMS: 60_000 }
  );
  try {
    for await (const row of cursor as any) {
      const price = Number(row?.price);
      if (!Number.isFinite(price) || price <= 0 || row?.currencyInferred) continue;
      const currency = String(row?.currency || "USD").toUpperCase();
      const priceUsd = currency === "USD" ? price : price / usdUyu;
      const priceUyu = currency === "USD" ? price * usdUyu : price;
      if (priceUsd < 150 || priceUsd > 30_000) continue;
      rows.push({ priceUyu, priceUsd, year: Number(row?.year) || null });
    }
  } finally {
    await (cursor as any).close?.();
  }

  return bandOf(rows, { condition: "usado", source: "motocatalog", asOf: isoOf((meta as any)?.generatedAt), anchor: 0.25 });
}

/**
 * Monopatines y bicicletas eléctricas salen de `movilidaditems`, que ya publica bandas calculadas por
 * `currency-movilidad`. Se toma la banda de NUEVO: el usado de estas dos categorías arrastra el
 * problema de la batería (una batería sin fecha ni ciclos es una apuesta, y el propio directorio lo
 * advierte), así que comparar contra el ómnibus con el precio del usado sería comparar contra un
 * vehículo que puede necesitar una batería nueva el mes que viene.
 */
async function readMovilidad(): Promise<{ monopatin: TransportVehiclePrice | null; bici: TransportVehiclePrice | null }> {
  const db = appConnection();
  const items = await db
    .collection("movilidaditems")
    .find({}, { projection: { _id: 0, category: 1, bands: 1, offers: 1, products: 1, updatedAt: 1 }, maxTimeMS: 30_000 })
    .toArray()
    .catch(() => [] as any[]);

  const pick = (category: string): TransportVehiclePrice | null => {
    const prices: number[] = [];
    let asOf: string | null = null;
    for (const item of items as any[]) {
      if (item?.category !== category) continue;
      asOf = asOf ?? isoOf(item?.updatedAt);
      for (const offer of item?.offers ?? []) {
        const price = Number(offer?.price);
        if (Number.isFinite(price) && price > 3000 && price < 600_000 && offer?.condition !== "usado") prices.push(price);
      }
      for (const product of item?.products ?? []) {
        for (const offer of product?.offers ?? []) {
          const price = Number(offer?.price);
          if (Number.isFinite(price) && price > 3000 && price < 600_000 && offer?.condition !== "usado") prices.push(price);
        }
      }
    }
    if (prices.length < 5) return null;
    return {
      referenceUyu: Math.round(quantile(prices, 0.5)),
      p25Uyu: Math.round(quantile(prices, 0.25)),
      p75Uyu: Math.round(quantile(prices, 0.75)),
      condition: "nuevo",
      offers: prices.length,
      asOf,
      measuredAnnualDepreciation: null,
      source: "movilidaditems",
    };
  };

  return { monopatin: pick("monopatin-electrico"), bici: pick("bicicleta-electrica") };
}

function isoOf(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export interface TransportPricesResult {
  prices: TransportPrices;
  /** Qué no se pudo leer. Se publica: un modo sin precio es un modo que la página no compara. */
  missing: string[];
  /** El consumo mediano medido sobre el catálogo de autos, para que no lo tenga que suponer el app. */
  measuredCarConsumption: number | null;
}

export async function readTransportPrices(
  options: { skipDatabases?: boolean } = {}
): Promise<TransportPricesResult> {
  const missing: string[] = [];

  // `--dry-run` no toca ninguna base, ni la del app ni la del backend. No alcanza con no escribir:
  // el `.env` local de esta máquina apunta a la Mongo de PRODUCCIÓN, así que "sólo leer" desde una
  // corrida de prueba ya es tocar producción, y una consulta lenta cuelga el dry run sin decir nada.
  if (options.skipDatabases) {
    return {
      missing: ["todas las fuentes: --dry-run no consulta ninguna base"],
      measuredCarConsumption: null,
      prices: {
        usdUyu: 0,
        busFareUyu: 0,
        busTransferWindowMin: 60,
        busMonthlyPassUyu: null,
        naftaSuper95PerLitreUyu: 0,
        gasoilPerLitreUyu: 0,
        kwhUyu: KWH_RESIDENTIAL_UYU.value,
        vehiclePriceUyu: {},
        financingTea: null,
        usuryCapTea: null,
        sources: {
          energia: { label: KWH_RESIDENTIAL_UYU.source, asOf: KWH_RESIDENTIAL_UYU.asOf },
        },
      },
    };
  }

  const [figures, fuelRows, loans, usdUyuRead] = await Promise.all([
    loadFigures().catch(() => null),
    loadFuelRows(24).catch(() => [] as any[]),
    loadLoanRates().catch(() => null),
    readUsdUyu().catch(() => null),
  ]);

  const usdUyu = usdUyuRead ?? 0;
  if (!usdUyu) missing.push("usdUyu");

  const [cars, motos, movilidad] = await Promise.all([
    usdUyu ? readCars(usdUyu).catch(() => ({ price: null, consumption: null })) : Promise.resolve({ price: null, consumption: null }),
    usdUyu ? readMotos(usdUyu).catch(() => null) : Promise.resolve(null),
    readMovilidad().catch(() => ({ monopatin: null, bici: null })),
  ]);

  const latestFuel = (fuelRows as any[])[0] ?? null;
  const nafta = Number(latestFuel?.super95 ?? latestFuel?.nafta95);
  const gasoil = Number(latestFuel?.gasoil);
  if (!Number.isFinite(nafta) || nafta <= 0) missing.push("nafta");
  if (!figures?.boletoStm) missing.push("boleto");
  if (!cars.price) missing.push("auto");
  if (!motos) missing.push("moto");
  if (!movilidad.monopatin) missing.push("monopatin");
  if (!movilidad.bici) missing.push("bici");

  const vehiclePriceUyu: Partial<Record<TransportMode, TransportVehiclePrice>> = {};
  if (cars.price) vehiclePriceUyu.auto = cars.price;
  if (motos) vehiclePriceUyu.moto = motos;
  if (movilidad.monopatin) vehiclePriceUyu.monopatin = movilidad.monopatin;
  if (movilidad.bici) vehiclePriceUyu.bici = movilidad.bici;

  const tea = pickTea(loans);

  return {
    missing,
    measuredCarConsumption: cars.consumption,
    prices: {
      usdUyu,
      busFareUyu: Number(figures?.boletoStm) || 0,
      // Una hora, y es la regla del STM, no un supuesto: dentro de la ventana el segundo ómnibus no
      // se paga, que es lo que hace que un viaje con trasbordo cueste un boleto y no dos.
      busTransferWindowMin: 60,
      busMonthlyPassUyu: null,
      naftaSuper95PerLitreUyu: Number.isFinite(nafta) ? nafta : 0,
      gasoilPerLitreUyu: Number.isFinite(gasoil) ? gasoil : 0,
      kwhUyu: KWH_RESIDENTIAL_UYU.value,
      vehiclePriceUyu,
      financingTea: tea.tea,
      usuryCapTea: tea.cap,
      sources: {
        boleto: { label: "Intendencia de Montevideo — boleto STM", asOf: figures?.asOf ?? null },
        combustible: { label: "ANCAP — tabla de precios vigente", asOf: isoOf(latestFuel?.date) },
        financiacion: { label: "Tasas de préstamos relevadas por el sitio", asOf: tea.asOf },
        energia: { label: KWH_RESIDENTIAL_UYU.source, asOf: KWH_RESIDENTIAL_UYU.asOf },
      },
    },
  };
}

/** La TEA de referencia para las cuotas: la mediana de lo relevado, no la más barata ni la más cara. */
function pickTea(loans: any): { tea: number | null; cap: number | null; asOf: string | null } {
  const rates: number[] = [];
  for (const row of loans?.rows ?? loans?.loans ?? []) {
    const value = Number(row?.tea ?? row?.rate ?? row?.tna);
    if (Number.isFinite(value) && value > 0 && value < 500) rates.push(value > 3 ? value / 100 : value);
  }
  if (!rates.length) return { tea: null, cap: null, asOf: isoOf(loans?.asOf) };
  return { tea: quantile(rates, 0.5), cap: null, asOf: isoOf(loans?.asOf) };
}

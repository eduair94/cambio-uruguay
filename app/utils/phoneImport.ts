// app/utils/phoneImport.ts
//
// "¿Me conviene traerlo de EE.UU.?" — cuánto termina costando un iPhone comprado en EE.UU. una vez
// puesto en Uruguay, por las DOS vías que una persona física puede usar sin ser una importación
// formal:
//   - equipaje de viajero (en la valija, cruzando por Aeropuerto de Carrasco) — travelerBaggageRules.ts
//   - courier puerta a puerta, usando la franquicia anual — importTax.ts (courierImport)
// Por encima de ambas franquicias ninguna de las dos rutas aplica y el régimen general no se
// calcula acá — mismo criterio que courierImport: no se inventa un número para un régimen que
// requiere despachante y DUA.
//
// PURA (sin Vue/Nuxt): cada peso de impuesto sale de llamar a las funciones que ya audita el resto
// del sitio (courierImport, resolveBaggageTax, courierParcelQuote) — este módulo no repite ninguna
// regla impositiva, sólo arma el precio de compra (precio de lista + sales tax) y agrega flete de
// courier y el trámite URSEC.
//
// Supuestos de este cálculo, documentados porque la interfaz pública no los recibe como parámetro:
//  - Viajero: entrada aérea (Aeropuerto de Carrasco), franquicia US$ 500 (`FRANCHISE_AIR_SEA_USD`)
//    — no la de frontera terrestre, más baja.
//  - Courier: se asume la franquicia anual COMPLETA disponible (US$ 800, 0 envíos usados este año) —
//    el escenario de "primera compra grande del año". Alguien que ya gastó su cupo pagaría más
//    (prestación única en vez de franquicia); `courier.reasons` lo explica cuando aplica.
//  - Peso del paquete: 0,5 kg (una caja de iPhone), tanto para el corte de 20 kg del régimen postal
//    como para cotizar el courier más barato — overridable via `weightKg`.
import { round } from './calculators'
import { ADUANA_FAQS } from './aduanaFaq'
import { ESTIMATOR_COURIERS, courierParcelQuote } from './courierShipping'
import { courierImport } from './importTax'
import { DEFAULT_REGIME_RULES } from './importRules'
import { resolveBaggageTax, type EntryMode } from './travelerBaggageRules'

/** Peso de referencia de una caja de iPhone: usado para el corte de 20 kg y para cotizar flete. */
const PHONE_PARCEL_WEIGHT_KG = 0.5

/** Vía de entrada asumida para la franquicia de equipaje de viajero: Aeropuerto de Carrasco. */
const PHONE_TRAVELER_ENTRY_MODE: EntryMode = 'air-sea'

/** Id de la ficha de `aduanaFaq.ts` que publica el costo del certificado URSEC. */
const URSEC_FAQ_ID = 'celular-router-drone'

/**
 * Costo en pesos del certificado URSEC (trámite VUCE) para traer un celular, leído de la propia
 * ficha `celular-router-drone` de `aduanaFaq.ts` con una regex en vez de repetir el número a mano:
 * si alguien actualiza esa ficha, este valor se actualiza solo con ella. Si el texto cambiara de
 * forma que la regex ya no matchea, esto tira en vez de publicar un número viejo sin avisar —
 * mismo criterio que "no se inventa un número" del resto del calculador.
 *
 * Memoizada y perezosa (llamada desde ADENTRO de `phoneImportEstimate`, no a nivel de módulo):
 * un `throw` a nivel de módulo tira abajo cualquier página que importe este archivo con sólo
 * mencionarlo, aunque esa página nunca llame a `phoneImportEstimate` — el mismo motivo por el que
 * `travelerBaggageRules.ts` resuelve sus reglas por fecha en vez de a nivel de módulo. Memoizada
 * para no repetir el `find`+regex en cada cálculo dentro de una misma carga de página.
 */
let ursecCertUyuCache: number | null = null

function readUrsecCertUyu(): number {
  if (ursecCertUyuCache != null) return ursecCertUyuCache
  const faq = ADUANA_FAQS.find(f => f.id === URSEC_FAQ_ID)
  if (!faq) {
    throw new Error(`phoneImport: no se encontró la ficha '${URSEC_FAQ_ID}' en aduanaFaq.ts`)
  }
  const match = faq.answer.match(/costo de \$(\d+)/)
  if (!match) {
    throw new Error(
      `phoneImport: no se pudo leer el costo del certificado URSEC de la ficha '${URSEC_FAQ_ID}' (¿cambió el texto?)`
    )
  }
  ursecCertUyuCache = Number(match[1])
  return ursecCertUyuCache
}

export interface PhoneImportEstimate {
  /** Precio de lista de EE.UU., sin impuestos (`PHONE_US_PRICES`). */
  usPriceUsd: number
  /** Sales tax de EE.UU. sobre `usPriceUsd`, según el `pct` elegido de `PHONE_US_SALES_TAX`. */
  salesTaxUsd: number
  /** Total de la factura de compra: `usPriceUsd + salesTaxUsd` (Decreto 50/026 art. 5). */
  invoiceUsd: number
  traveler: {
    /** Franquicia de equipaje de viajero aplicable (US$ 500, entrada aérea). */
    franchiseUsd: number
    /** 50% sobre el excedente de la franquicia (Decreto 139/014 art. 13). */
    taxUsd: number
    totalUsd: number
    totalUyu: number
  }
  courier: {
    /** Régimen que resuelve `courierImport` para este envío. */
    regime: 'franquicia' | 'simplificado' | 'general'
    /** `null` en régimen `general`: no se calcula (requiere despachante y DUA). */
    taxUsd: number | null
    /** Flete del courier más barato entre `ESTIMATOR_COURIERS`; `null` si ninguno cotiza. */
    freightUsd: number | null
    /** Nombre del courier del `freightUsd` elegido. */
    courierName: string | null
    totalUsd: number | null
    totalUyu: number | null
    /** Explicación en el idioma del lector, tal como la arma `resolveRegime`. */
    reasons: string[]
  }
  /** Costo del certificado URSEC (trámite VUCE), en pesos — ver `readUrsecCertUyu`. */
  ursecUyu: number
  localBestUyu: number | null
  /** `localBestUyu - traveler.totalUyu`; positivo = conviene traerlo. `null` si falta `localBestUyu`. */
  savingTravelerUyu: number | null
  /** `localBestUyu - courier.totalUyu`; `null` si falta `localBestUyu` o el courier no cotiza. */
  savingCourierUyu: number | null
}

/** El `totalUsd` más barato de `courierParcelQuote` entre `ESTIMATOR_COURIERS`, con su nombre. */
function cheapestCourierFreight(weightKg: number): { totalUsd: number; name: string } | null {
  let best: { totalUsd: number; name: string } | null = null
  for (const courier of ESTIMATOR_COURIERS) {
    const quote = courierParcelQuote(courier, weightKg)
    if (!quote) continue
    if (!best || quote.totalUsd < best.totalUsd) {
      best = { totalUsd: round(quote.totalUsd), name: courier.name }
    }
  }
  return best
}

/**
 * Cuánto sale traer un iPhone comprado en EE.UU., por equipaje de viajero y por courier, y cuánto
 * se ahorra (o se pierde) contra el mejor precio local. Ningún impuesto se recalcula a mano: sale
 * de `courierImport` / `resolveBaggageTax`, los mismos que usan `/calculadora-impuestos-importacion`
 * y la página de equipaje de viajero.
 */
export function phoneImportEstimate(input: {
  usPriceUsd: number
  salesTaxPct: number
  usdUyu: number
  localBestUyu: number | null
  weightKg?: number
  today?: Date
}): PhoneImportEstimate {
  const usPriceUsd = Math.max(input.usPriceUsd || 0, 0)
  const salesTaxPct = Math.max(input.salesTaxPct || 0, 0)
  const usdUyu = Math.max(input.usdUyu || 0, 0)
  const weightKg = input.weightKg ?? PHONE_PARCEL_WEIGHT_KG

  const salesTaxUsd = round((usPriceUsd * salesTaxPct) / 100)
  // Decreto 50/026 art. 5: el total de la factura de compra = precio + todo lo adicionado en ella;
  // una compra directa en Apple Store no trae flete ni seguro del vendedor, así que es sólo esto.
  const invoiceUsd = round(usPriceUsd + salesTaxUsd)

  const baggage = resolveBaggageTax({ entryMode: PHONE_TRAVELER_ENTRY_MODE, valueUsd: invoiceUsd })
  const travelerTaxUsd = round(baggage.taxUsd)
  const travelerTotalUsd = round(invoiceUsd + travelerTaxUsd)
  const travelerTotalUyu = round(travelerTotalUsd * usdUyu)

  const courierResult = courierImport({
    value: usPriceUsd,
    salesTax: salesTaxUsd,
    origin: 'usa',
    weightKg,
    useFranchise: true,
    franchiseAvailable: DEFAULT_REGIME_RULES.franchiseAnnualUsd,
    shipmentsUsed: 0,
    today: input.today,
  })

  // `courierImport` can also return 'exonerado' (mercadería exonerada de todo tributo) — nunca
  // ocurre acá porque nunca pasamos `exemption`, pero el tipo lo permite; lo tratamos como
  // 'general' (no calculado) en vez de mentir con un régimen que no pedimos.
  const courierRegime: 'franquicia' | 'simplificado' | 'general' =
    courierResult.regime === 'franquicia' || courierResult.regime === 'simplificado'
      ? courierResult.regime
      : 'general'

  let courierTaxUsd: number | null = null
  let courierFreightUsd: number | null = null
  let courierName: string | null = null
  let courierTotalUsd: number | null = null
  let courierTotalUyu: number | null = null

  if (courierRegime !== 'general') {
    courierTaxUsd = round(courierResult.totalTax)
    const freight = cheapestCourierFreight(weightKg)
    if (freight) {
      courierFreightUsd = freight.totalUsd
      courierName = freight.name
      courierTotalUsd = round(invoiceUsd + courierTaxUsd + courierFreightUsd)
      courierTotalUyu = round(courierTotalUsd * usdUyu)
    }
  }

  const localBestUyu = input.localBestUyu ?? null
  const savingTravelerUyu = localBestUyu != null ? round(localBestUyu - travelerTotalUyu) : null
  const savingCourierUyu =
    localBestUyu != null && courierTotalUyu != null ? round(localBestUyu - courierTotalUyu) : null

  return {
    usPriceUsd,
    salesTaxUsd,
    invoiceUsd,
    traveler: {
      franchiseUsd: baggage.franchiseUsd,
      taxUsd: travelerTaxUsd,
      totalUsd: travelerTotalUsd,
      totalUyu: travelerTotalUyu,
    },
    courier: {
      regime: courierRegime,
      taxUsd: courierTaxUsd,
      freightUsd: courierFreightUsd,
      courierName,
      totalUsd: courierTotalUsd,
      totalUyu: courierTotalUyu,
      reasons: courierResult.reasons ?? [],
    },
    ursecUyu: readUrsecCertUyu(),
    localBestUyu,
    savingTravelerUyu,
    savingCourierUyu,
  }
}

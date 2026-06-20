// Courier shipping cost estimator for the import calculator.
//
// Door-to-door couriers from Miami to Uruguay price mostly by weight (USD per
// kg) plus a fixed handling fee. Exact tariffs change and depend on volume /
// dimensional weight, so these are REFERENCE rates the user can override; the
// selector pre-fills a courier's typical per-kg rate which feeds the freight
// input of the import-tax calculation. Pure functions → unit-testable.
import { round } from './calculators'

export interface Courier {
  id: string
  name: string
  /**
   * Representative small-parcel reference price per kg (USD), or `null` when the courier only
   * quotes through its own calculator (no public flat per-kg). `null`-rate couriers are listed
   * in the comparison but excluded from the by-weight estimator.
   */
  perKgUsd: number | null
  /** Fixed handling fee per shipment (USD), or `null` when quote-based. */
  baseUsd: number | null
  /** Service type, e.g. `'Casillero en Miami'`. */
  modality: string
  /** Typical delivery time, when published. */
  transit?: string
  /** Official website. */
  website: string
  /** URL backing the reference rate / information. */
  source: string
  /** Tiered-rate / surcharge caveats. */
  note?: string
  /** Aggregated reputation 0–5 from reviews, or null/absent when too few to rate. */
  rating?: number | null
  /** One-line qualitative summary of review sentiment. */
  reviewsNote?: string
  /** Links backing the reputation (Reddit, Trustpilot, Google, ...). */
  reviewSources?: import('./reviews').ReviewSource[]
}

/**
 * Couriers that ship door-to-door (mostly Miami → Uruguay) for online purchases. Per-kg rates
 * (USD) were **verified 2026-06-19** from each courier's published tariffs. Couriers price by
 * weight tiers; the `perKgUsd` here is the small-parcel tier used by the estimator's flat
 * `base + perKg·kg` model — heavier-parcel tiers and surcharges (e.g. the 10% postal/URSEC
 * surcharge) are described in `note`. Couriers without a public flat rate carry `null` and are
 * shown as "Consultar". Override in the UI with your actual quote. Not affiliated; informational.
 * See `/couriers-uruguay` for the full comparison.
 */
export const COURIERS: Courier[] = [
  {
    id: 'gripper',
    name: 'Gripper',
    perKgUsd: 21.9,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    transit: '3–7 días hábiles',
    website: 'https://www.gripper.com.uy',
    source: 'https://www.gripper.com.uy/tarifas',
    note: '5–20 kg US$16,5/kg; <900 g US$19,80 fijo; +10% TSPU; manejo US$5',
    rating: 4.9,
    reviewsNote:
      'El mejor calificado del segmento: rápido (3–7 días), buena atención telefónica; alguna crítica por precio algo alto.',
    reviewSources: [
      {
        label: 'baratoenchina.com — comparativo couriers (4,9★ Google)',
        url: 'https://baratoenchina.com/mejores-couriers-uruguay/',
      },
      {
        label: 'La Onda Digital — mejores couriers',
        url: 'https://www.laondadigital.uy/mejores-couriers-en-uruguay-para-comprar-en-china/',
      },
    ],
  },
  {
    id: 'soycourier',
    name: 'SoyCourier',
    perKgUsd: 14.99,
    baseUsd: 0,
    modality: 'Casillero en Miami',
    transit: '3–7 días',
    website: 'https://www.soycourier.com',
    source: 'https://www.soycourier.com',
    note: 'Tarifa todo incluido (manejo, despacho, seguro y entrega); descuenta el impuesto',
    rating: null,
    reviewsNote:
      'Solo testimonios en su propio sitio; sin reseñas independientes verificables (operador nuevo).',
    reviewSources: [],
  },
  {
    id: 'uruguaycargo',
    name: 'UruguayCargo',
    perKgUsd: 19.5,
    baseUsd: 4,
    modality: 'Casillero en Miami',
    website: 'https://www.uruguaycargo.com.uy',
    source: 'https://www.uruguaycargo.com.uy/tarifas.html',
    note: 'Mín. US$14,99 (≤500 g); 5–10 kg US$18,99/kg; 10–20 kg US$18,20/kg; +10% postal; manejo US$4',
    rating: null,
    reviewsNote: 'Sin reseñas de usuarios localizables en plataformas públicas.',
    reviewSources: [],
  },
  {
    id: 'enviamicompra',
    name: 'Envía Mi Compra',
    perKgUsd: 21.9,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    website: 'https://www.enviamicompra.com.uy',
    source: 'https://www.enviamicompra.com.uy/servicios-tarifas',
    note: '10–20 kg US$16,5/kg; 20+ kg US$11,9/kg; mín. 0,5 kg; manejo US$5',
    rating: null,
    reviewsNote:
      'Experiencias mayormente positivas en foros (confiable, fotos de paquetes); quejas por precio y soporte de chat. Sin rating numérico verificable.',
    reviewSources: [],
  },
  {
    id: 'aerobox',
    name: 'Aerobox',
    perKgUsd: 23.5,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    website: 'https://aerobox.com.uy',
    source: 'https://aerobox.com.uy/tarifas/',
    note: '1–500 g US$11,99 fijo; 5–10 kg US$20,5/kg; 10–20 kg US$17,5/kg; +10% URSEC; manejo US$5+IVA',
    rating: 4.2,
    reviewsNote:
      'Buena atención por WhatsApp y dos vuelos semanales; algunas críticas por precio y cobertura fuera de Montevideo.',
    reviewSources: [
      {
        label: 'baratoenchina.com (4,2★, 426 reseñas)',
        url: 'https://baratoenchina.com/mejores-couriers-uruguay/',
      },
      {
        label: 'La Onda Digital — comparativo',
        url: 'https://www.laondadigital.uy/mejores-couriers-en-uruguay-para-comprar-en-china/',
      },
    ],
  },
  {
    id: 'casillamia',
    name: 'Casilla Mía',
    perKgUsd: 20,
    baseUsd: 10,
    modality: 'Casillero en Miami',
    website: 'https://www.casillamia.uy',
    source: 'https://www.casillamia.uy/Tarifas',
    note: 'Por tramos de 500 g; despacho de aduana US$75 (≤800) / US$135 (>800)',
    rating: 1.9,
    reviewsNote:
      'Reputación muy negativa: demoras extremas y mala comunicación pese a ser de los más baratos. El peor calificado del grupo.',
    reviewSources: [
      {
        label: 'baratoenchina.com (1,9★ — el peor)',
        url: 'https://baratoenchina.com/mejores-couriers-uruguay/',
      },
      {
        label: 'mtb.uy — mala experiencia con Casilla Mía',
        url: 'https://mtb.uy/temas/mala-experiencia-con-casilla-mia.7294/',
      },
    ],
  },
  {
    id: 'puntomio',
    name: 'Punto Mío',
    perKgUsd: 18,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    website: 'https://www.puntomio.uy',
    source: 'https://www.puntomio.uy',
    note: 'Desde US$8,99 (<0,5 kg); libros US$8,90/kg; descuenta el impuesto; tiene calculadora propia',
    rating: null,
    reviewsNote:
      'Muy valorado por precio (de los más baratos) y descuento de IVA Amazon; quejas por consolidaciones lentas. Sin rating numérico verificable.',
    reviewSources: [],
  },
  {
    id: 'usxcargo',
    name: 'USX Cargo',
    perKgUsd: 17.5,
    baseUsd: 0,
    modality: 'Casillero en Miami y Europa',
    transit: '9–15 días',
    website: 'https://usxcargo.com',
    source: 'https://usxcargo.com',
    note: 'Desde EE.UU. US$17,5/kg; desde Europa US$21,5/kg; envío al interior ~US$7,5',
    rating: 4.7,
    reviewsNote:
      'Muy recomendado en foros por precio competitivo y atención personalizada; quejas por coordinación con entregadores tercerizados.',
    reviewSources: [
      {
        label: 'Nicelocal — USX Cargo (4,7★)',
        url: 'https://nicelocal.uy/montevideo/utility_service/usx_cargo/',
      },
      {
        label: 'mtb.uy — experiencia con USX Cargo',
        url: 'https://mtb.uy/temas/experiencia-con-usx-cargo-uruguay.15299/',
      },
    ],
  },
  {
    id: 'urubox',
    name: 'Urubox',
    perKgUsd: 19.9,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    transit: '3–5 días',
    website: 'https://www.urubox.com.uy',
    source: 'https://www.urubox.com.uy/tarifas-envios.html',
    note: '1–4,99 kg US$19,90/kg; 5–9,99 kg US$17,90; 10–19,99 kg US$16,50; <1 kg por tramos (desde US$10,90); libros US$11,90/kg; +10% TSPU; manejo US$5',
    rating: 4.0,
    reviewsNote:
      'Opiniones polarizadas: leales destacan profesionalismo sin cargo de consolidación; críticos reportan demoras y cargos extra en Tres Cruces.',
    reviewSources: [
      {
        label: 'RentechDigital — Google Maps MVD (4,0★, 492 reseñas)',
        url: 'https://rentechdigital.com/smartscraper/business-report-details/uruguay/list-of-courier-services-in-montevideo-department',
      },
      {
        label: 'gameover.uy — hilo couriers',
        url: 'https://www.gameover.uy/showthread.php?15640-Courier-que-recomienden&p=301939',
      },
    ],
  },
  {
    id: 'starbox',
    name: 'StarBox Uruguay',
    perKgUsd: 21,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    website: 'https://www.starboxuruguay.com',
    source: 'https://www.starboxuruguay.com/',
    note: '0–500 g US$17 fijo; 501–999 g US$21; 1–4,99 kg US$21/kg; 5–10 kg US$20/kg; +10% TSPU; manejo US$5+IVA; interior +US$10',
    rating: null,
    reviewsNote: 'Operador menor; sin reseñas independientes verificables a la fecha.',
    reviewSources: [],
  },
  {
    id: 'buybox',
    name: 'BuyBox',
    perKgUsd: 18.9,
    baseUsd: 5,
    modality: 'Casillero en Miami, Europa y Argentina',
    website: 'https://www.buybox.com.uy',
    source: 'https://www.buybox.com.uy/tarifas.html',
    note: '1,01–3 kg US$18,90/kg; 0,5–1 kg US$21; 3–5 kg US$16,90; 5–10 kg US$15,90; 10–20 kg US$13,90; libros US$9,99/kg; +10% TSPU; manejo US$5',
    rating: null,
    reviewsNote: 'Sin rating numérico independiente verificable.',
    reviewSources: [],
  },
  {
    id: 'grinbox',
    name: 'Grinbox',
    perKgUsd: 22,
    baseUsd: null,
    modality: 'Casillero en Miami',
    transit: '~7 días',
    website: 'https://www.grinbox.uy',
    source: 'https://www.grinbox.uy/servicios/comprar-en-usa-desde-uruguay',
    note: 'US$2,20/100 g (=US$22/kg); libros/CD/DVD US$1,20/100 g (=US$12/kg); +10% TSPU; vuelo semanal Miami→MVD; sin cargo de afiliación',
    rating: null,
    reviewsNote: 'Sin rating numérico independiente verificable.',
    reviewSources: [],
  },
  {
    id: 'glic',
    name: 'Glic',
    perKgUsd: 22.99,
    baseUsd: null,
    modality: 'Casillero en Miami',
    transit: '3–10 días hábiles',
    website: 'https://glicglobal.com/uy/',
    source: 'https://glicglobal.com/uy/calculadora.html',
    note: 'US$22,99/kg; consolidación gratis; 60 días de depósito gratis; vuelos semanales',
    rating: null,
    reviewsNote: 'Sin rating numérico independiente verificable.',
    reviewSources: [],
  },
  {
    id: 'miami-box',
    name: 'Miami Box',
    perKgUsd: null,
    baseUsd: null,
    modality: 'Casillero en Miami',
    website: 'https://www.miami-box.com',
    source: 'https://www.miami-box.com/precios',
    note: 'Consultá la tarifa por peso en su sitio',
    rating: 3.8,
    reviewsNote:
      'Servicio en declive según usuarios recientes: demoras en notificaciones y envíos sin aprobación del cliente; varios lo desaconsejan.',
    reviewSources: [
      {
        label: 'baratoenchina.com (3,8★, 633 reseñas)',
        url: 'https://baratoenchina.com/mejores-couriers-uruguay/',
      },
      {
        label: 'gameover.uy — desaconsejado por usuarios',
        url: 'https://www.gameover.uy/showthread.php?15640-Courier-que-recomienden&p=301939',
      },
    ],
  },
  {
    id: 'exur',
    name: 'EXUR Envíos',
    perKgUsd: null,
    baseUsd: null,
    modality: 'Casillero en Miami / mensajería',
    website: 'https://www.exurenvios.com',
    source: 'https://www.exurenvios.com',
    note: 'Consultá la tarifa por peso en su sitio',
    rating: 4.0,
    reviewsNote:
      'Courier establecido valorado por seriedad y manejo aduanero; algunos reportan trato seco en el local y respuestas lentas por email.',
    reviewSources: [
      {
        label: 'Cybo — EXUR Envíos (4,0★)',
        url: 'https://es.cybo.com/UY-biz/exur-env%C3%ADos',
      },
      {
        label: 'gameover.uy — hilo couriers',
        url: 'https://www.gameover.uy/showthread.php?15640-Courier-que-recomienden&p=301939',
      },
    ],
  },
]

/** Couriers that publish a flat per-kg rate — the ones offered in the by-weight estimator. */
export const ESTIMATOR_COURIERS: Courier[] = COURIERS.filter(c => c.perKgUsd != null)

export function getCourier(id: string): Courier {
  return COURIERS.find(c => c.id === id) ?? ESTIMATOR_COURIERS[0]!
}

/** Estimated shipping cost (USD) = base fee + per-kg rate × weight. */
export function shippingCostUsd(perKgUsd: number, baseUsd: number, weightKg: number): number {
  const kg = Math.max(weightKg || 0, 0)
  const perKg = Math.max(perKgUsd || 0, 0)
  const base = Math.max(baseUsd || 0, 0)
  return round(base + perKg * kg)
}

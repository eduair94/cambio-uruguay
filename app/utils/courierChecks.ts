// What each courier's own site said on the day we last read it, for the courier pages
// (`/couriers-uruguay/<slug>`) and the head-to-heads (`/comparativas/couriers/*`).
//
// Why a second module instead of editing utils/courierShipping.ts. The search for a courier's NAME
// ("usx cargo", "urubox", "soycourier", "exur") was landing on the head-to-heads, and the courier's
// own page answered it with a tariff dated four months earlier. Re-reading the fifteen sites on
// 2026-10-19 confirmed most figures and contradicted a few:
//
//   * SoyCourier's calculator adds US$ 9,99 of handling and US$ 1,99 or 4,99 of delivery to the
//     US$ 14,99 a kilo the catalogue priced as "all-inclusive".
//   * Punto Mío's calculator charges US$ 16 a kilo plus US$ 5, not the catalogue's US$ 18 + 5.
//   * USX Cargo's 9–15 days is the Madrid flight; from Miami it publishes 3–7.
//   * StarBox no longer publishes the US$ 10 interior fee; Casilla Mía's first US$ 10 is the first
//     500 g, not a fee on top; Miami Box's calculator now prices by the kilo; UruguayCargo
//     suspended its flights.
//
// The catalogue also feeds pages whose Search Console measurement window is open (/couriers-uruguay,
// /ropa-por-kilo-uruguay, /directorios-uruguay): changing it would change them mid-measurement. So
// the reading lives here, applied by `verifiedCourier()` to the courier pages and the head-to-heads
// only. When those windows close, fold each `tariff` below into its catalogue row and delete it:
// the catalogue is meant to be the one copy.
//
// Rules for this file, same as the catalogue's: every value is something the courier's site says,
// with the date it was read. A calculator output is recorded as an output, with what was typed in;
// nothing is extrapolated past the weights the calculator was asked about. No phone, e-mail or
// WhatsApp number: an office address is where to pick up a parcel, a phone number is a contact.
//
// PURE module (no Vue/Nuxt runtime, relative imports only).

import { COURIERS, type Courier } from './courierShipping'

/** The day the fifteen courier sites below were read. */
export const COURIER_CHECKED_AT = '2026-10-19'

/** Where the parcel is received abroad, and how long the courier says it takes from there. */
export interface CourierOrigin {
  /** `Miami, Florida`, `Madrid, España`. */
  place: string
  /** The courier's own words for the transit time from that warehouse, when it publishes one. */
  transit?: string
}

/** One calculator answer: the total it printed for a weight. */
export interface CourierCalculatorReading {
  kg: number
  totalUsd: number
}

/** What the courier's own calculator returned on {@link CourierCheck.checkedAt}. */
export interface CourierCalculatorCheck {
  /** Everything typed in besides the weight, as the form asked for it. */
  inputs: string
  /** The breakdown it printed for the reference parcel, in its own words. */
  lines: ReadonlyArray<{ label: string; usd: number }>
  /** Totals it printed, by weight. Always includes the reference parcel. */
  readings: readonly CourierCalculatorReading[]
  /** What the calculator itself says the total leaves out, when it says it. */
  excludes?: string
}

/** The tariff fields a courier's site contradicted on the day it was read. */
export type CourierTariffOverride = Partial<
  Pick<
    Courier,
    | 'perKgUsd'
    | 'baseUsd'
    | 'transit'
    | 'note'
    | 'extraFees'
    | 'rateIncludesSurcharge'
    | 'baseIvaExcluded'
  >
>

export interface CourierCheck {
  checkedAt: string
  /** The pages read on that date. */
  sources: readonly string[]
  /** Only what the site contradicts; everything else in the catalogue row was confirmed. */
  tariff?: CourierTariffOverride
  /** `calculadora` when the per-kilo figure comes from the courier's calculator, not a price list. */
  rateSource?: 'tarifario' | 'calculadora'
  /** Where your purchases are received abroad, in the order the courier lists them. */
  origins: readonly CourierOrigin[]
  /** How the parcel reaches you in Uruguay: pick-up points, delivery and what each costs. */
  inUruguay: string
  /** How the courier says its invoice is paid, when it says it. */
  payment?: string
  /** The courier's own calculator. */
  calculatorUrl?: string
  calculator?: CourierCalculatorCheck
  /** A published fact worth a line that the tariff fields do not carry. */
  alsoPublishes?: string
  /**
   * Whole kilos for which the per-kilo rate holds as a flat `base + kilo × rate`: inside the tier
   * the page prices, never across a tier boundary. The page's weight picker offers only these.
   */
  estimatorKg?: { min: number; max: number }
  /** `false` when the courier says it is not flying. */
  operating?: boolean
  /** What the courier's site announces that a reader must see first. */
  notice?: string
}

export const COURIER_CHECKS: Readonly<Record<string, CourierCheck>> = Object.freeze({
  gripper: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.gripper.com.uy/tarifas', 'https://www.gripper.com.uy/'],
    origins: [{ place: 'Miami, Florida', transit: '3 a 7 días hábiles' }],
    inUruguay:
      'Entrega a domicilio sin costo dentro de Montevideo; al interior cobra US$ 4 el primer kilo y US$ 0,50 cada kilo adicional. Su oficina está en Av. Italia 6530, entre Cooper y Jamaica, Montevideo.',
    calculatorUrl: 'https://www.gripper.com.uy/calculadora',
    alsoPublishes:
      'El manejo de US$ 5 cubre consolidados de hasta 5 envíos y suma US$ 1 por cada envío más. Los primeros 30 días de depósito en Miami son sin costo.',
    estimatorKg: { min: 1, max: 4 },
  },
  soycourier: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.soycourier.com/', 'https://www.soycourier.com/faq'],
    tariff: {
      baseUsd: 9.99,
      transit: '3–7 días hábiles',
      note: 'US$14,99/kg; su calculadora suma manejo US$9,99 y la entrega: US$1,99 retirando en pick up o US$4,99 a domicilio; sus preguntas frecuentes presentan los US$14,99 como todo incluido (aduana, impuestos, seguro y entrega)',
      extraFees: [
        { label: 'Cargo de entrega', usd: 1.99, when: 'retiro en pick up', kind: 'conditional' },
        { label: 'Cargo de entrega', usd: 4.99, when: 'a domicilio', kind: 'conditional' },
      ],
    },
    origins: [{ place: 'Miami, Florida', transit: '3 a 7 días hábiles' }],
    inUruguay:
      'Entrega a domicilio por US$ 4,99 o retiro en su punto de pick up por US$ 1,99, según su calculadora. Recibe paquetes de 0,1 a 20 kilos.',
    calculatorUrl: 'https://www.soycourier.com/',
    calculator: {
      inputs: 'producto de US$ 100 y retiro en pick up',
      lines: [
        { label: 'Envío (2 kg × US$ 14,99)', usd: 29.98 },
        { label: 'Manejo', usd: 9.99 },
        { label: 'Entrega (retiro en pick up)', usd: 1.99 },
      ],
      readings: [{ kg: 2, totalUsd: 41.96 }],
    },
    estimatorKg: { min: 1, max: 10 },
  },
  uruguaycargo: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.uruguaycargo.com.uy/', 'https://www.uruguaycargo.com.uy/tarifas.html'],
    origins: [{ place: 'Doral, Florida' }],
    inUruguay:
      'Llega a Montevideo o Punta del Este y entrega en todo el país, con puntos de retiro a consultar; los envíos dentro de Uruguay tienen costo adicional.',
    calculatorUrl: 'https://www.uruguaycargo.com.uy/calculadora.html',
    estimatorKg: { min: 1, max: 4 },
    operating: false,
    notice:
      'Su sitio avisa que suspendió los vuelos hasta nuevo aviso, por falta de definiciones de la Dirección Nacional de Aduanas sobre la normativa vigente.',
  },
  enviamicompra: {
    checkedAt: COURIER_CHECKED_AT,
    sources: [
      'https://www.enviamicompra.com.uy/servicios-tarifas',
      'https://www.enviamicompra.com.uy/',
    ],
    origins: [{ place: 'Doral, Florida' }],
    inUruguay:
      'La tarifa de Montevideo incluye la entrega en tu casa u oficina; al interior el kilo sale US$ 24,80 en la misma escala. Su oficina está en Jaime Zudáñez 2763, Montevideo (lunes a viernes de 10 a 19).',
    payment: 'El envío se paga al momento de la entrega.',
    calculatorUrl: 'https://www.enviamicompra.com.uy/calculator',
    alsoPublishes:
      'Cobra por kilo o fracción, con un mínimo de medio kilo; de 5 a 10 kilos el kilo baja a US$ 20,90. Publica sus precios sin impuestos.',
    estimatorKg: { min: 1, max: 4 },
  },
  aerobox: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://aerobox.com.uy/tarifas/', 'https://aerobox.com.uy/contacto/'],
    origins: [{ place: 'Miami, Florida' }],
    inUruguay:
      'Retiro en su oficina de José Enrique Rodó 2261 esquina Juan Paullier, Montevideo (lunes a viernes de 9 a 13 y de 14 a 19). A domicilio dentro de Montevideo, coordinando antes; al interior, el envío se le paga a la empresa de transporte.',
    calculatorUrl: 'https://aerobox.com.uy/calculadora-envios/',
    alsoPublishes:
      'Desde los 601 gramos la tarifa se fracciona cada 100 gramos. Guarda tus compras 75 días sin costo en Miami.',
    estimatorKg: { min: 1, max: 5 },
  },
  casillamia: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.casillamia.uy/Tarifas', 'https://www.casillamia.uy/'],
    tariff: {
      baseUsd: 0,
      note: 'Hasta 500 g US$10; de 501 g a 5 kg, US$10 cada 500 g adicionales; de 5 a 20 kg, US$4 cada 500 g; más de 20 kg, US$6 cada 500 g; los precios no incluyen la TFSPU; despacho de aduana US$75 (≤800) / US$135 (>800); consolidación US$2 por paquete',
    },
    origins: [{ place: 'Miami, Florida' }],
    inUruguay:
      'Es el casillero del Correo Uruguayo y entrega en todo el país. Atiende en Buenos Aires 451, piso 2, Montevideo (lunes a viernes de 9 a 18).',
    calculatorUrl: 'https://www.casillamia.uy/Calculadora',
    estimatorKg: { min: 1, max: 5 },
  },
  puntomio: {
    checkedAt: COURIER_CHECKED_AT,
    sources: [
      'https://www.puntomio.uy/',
      'https://www.puntomio.uy/calculadora',
      'https://www.puntomio.uy/herramientas#rates',
    ],
    tariff: {
      perKgUsd: 16,
      note: 'Según su calculadora, US$16 por kilo más US$5 (US$21 por 1 kg, US$37 por 2 kg, US$85 por 5 kg); menos de 0,5 kg US$8,99 con manejo incluido; libros US$8,99/kg; reparto en Montevideo US$5 hasta 4 paquetes; descuenta el tax de EE.UU.; tarifas congeladas desde el 01/03/2023',
      extraFees: [
        { label: 'Reparto en Montevideo', usd: 5, when: 'hasta 4 paquetes', kind: 'optional' },
      ],
    },
    rateSource: 'calculadora',
    origins: [{ place: 'Miami, Florida' }, { place: 'Madrid, España' }],
    inUruguay:
      'Retiro sin costo en su pick up center de Av. Rivera 5858, Montevideo (lunes a viernes de 9 a 18 y sábados de 9 a 12:30). A domicilio en Montevideo, US$ 5 hasta 4 paquetes consolidados y US$ 3 por cada uno más; al interior, por UES y con costo adicional.',
    calculatorUrl: 'https://www.puntomio.uy/calculadora',
    calculator: {
      inputs: 'depósito de Estados Unidos, factura de US$ 100 y entrega en Montevideo',
      lines: [
        { label: 'Flete internacional', usd: 37 },
        { label: 'Envío (hasta 4 paquetes consolidados)', usd: 5 },
      ],
      readings: [
        { kg: 1, totalUsd: 26 },
        { kg: 2, totalUsd: 42 },
        { kg: 5, totalUsd: 90 },
      ],
    },
    estimatorKg: { min: 1, max: 10 },
  },
  usxcargo: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://usxcargo.com/'],
    tariff: {
      transit: '3–7 días desde Miami',
      note: 'Desde EE.UU. US$17,5/kg; desde Europa US$21,5/kg; libros US$10,5/kg desde EE.UU. y US$14,5/kg desde Europa; fracciona cada 100 g; incluye manejo, consolidación y almacenaje; envío a domicilio o al interior por agencia ~US$7,5 los primeros 5 kg',
      extraFees: [
        {
          label: 'Envío a domicilio o al interior',
          usd: 7.5,
          when: 'primeros 5 kg',
          kind: 'optional',
          approximate: true,
        },
      ],
    },
    origins: [
      { place: 'Miami, Florida', transit: '3 a 7 días' },
      { place: 'Madrid, España', transit: '9 a 15 días' },
    ],
    inUruguay:
      'Retiro en su pick-up center de Nicolás Piaggio 1247, Montevideo (lunes a viernes de 9 a 20). También envía a domicilio o al interior por agencia, por unos US$ 7,50 los primeros 5 kilos.',
    calculatorUrl: 'https://usxcargo.com/',
    calculator: {
      inputs: 'envío desde Estados Unidos',
      lines: [{ label: 'Costo de envío', usd: 35 }],
      readings: [{ kg: 2, totalUsd: 35 }],
    },
    alsoPublishes: 'Tiene tres vuelos por semana: dos desde Miami y uno desde Madrid.',
    estimatorKg: { min: 1, max: 10 },
  },
  urubox: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.urubox.com.uy/tarifas-envios.html', 'https://www.urubox.com.uy/'],
    origins: [
      { place: 'Miami, Florida', transit: '3 a 5 días' },
      { place: 'Madrid, España', transit: '20 a 25 días hábiles' },
    ],
    inUruguay:
      'Su oficina está en Daniel Muñoz 2032, Montevideo. Reparto en Montevideo por US$ 5 + IVA; al interior, hasta la agencia, US$ 5 + IVA.',
    payment:
      'En Abitab (cuenta de Urubox) o por Itaú Link, enviando el comprobante; en la oficina, con tarjeta Visa, OCA o Mastercard.',
    calculatorUrl: 'https://www.urubox.com.uy/calculadora.html',
    alsoPublishes:
      'Además de Miami y Madrid, da una dirección en Inglaterra al registrarte. De 20 a 40 kilos el kilo sale US$ 15,90.',
    estimatorKg: { min: 1, max: 4 },
  },
  starbox: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.starboxuruguay.com/'],
    tariff: {
      note: '0–500 g US$17 fijo; 501–999 g US$21; 1–4,99 kg US$21/kg; 5–10 kg US$20/kg; fracciona cada 100 g desde 1 kg; +10% TFSPU; manejo US$5+IVA (libros US$3+IVA); entrega a domicilio y envíos al interior a coordinar, con costo adicional',
      extraFees: [],
    },
    origins: [{ place: 'Doral, Florida' }],
    inUruguay:
      'Retiro en su oficina de Montevideo o entrega a domicilio con costo adicional, a coordinar; los envíos al interior también se coordinan aparte.',
    calculatorUrl: 'https://www.starboxuruguay.com/calculadora-de-precios',
    alsoPublishes:
      'Consolida tus compras sin costo y las guarda 40 días gratis en Miami; desde el día 41 cobra US$ 1 por día y por kilo.',
    estimatorKg: { min: 1, max: 4 },
  },
  buybox: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.buybox.com.uy/tarifas.html'],
    origins: [
      { place: 'Doral, Florida' },
      { place: 'Buenos Aires, Argentina' },
      { place: 'Madrid, España' },
    ],
    inUruguay:
      'Local en Palmar 2529 esquina Ponce, Montevideo (lunes a viernes de 10 a 19 y sábados de 9:30 a 13). Reparto gratis en Montevideo; al interior, US$ 6 más impuestos.',
    alsoPublishes:
      'Hasta 500 gramos cobra US$ 5,90. El manejo de US$ 5 cubre hasta 4 paquetes y suma US$ 2 por cada uno más, y la tarifa lleva IVA sobre el 3 % del flete internacional. Desde España, US$ 21 el kilo.',
    estimatorKg: { min: 2, max: 3 },
  },
  grinbox: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.grinbox.uy/servicios/comprar-en-usa-desde-uruguay'],
    origins: [{ place: 'Miami, Florida', transit: 'unos 7 días' }],
    inUruguay:
      'Retiro en Pocitos (Dr. José Scoseria 2613 esquina Luis de la Torre) o en Carrasco (Av. Bolivia 2054), o entrega en tu casa u oficina.',
    calculatorUrl: 'https://www.grinbox.uy/calculadora',
    alsoPublishes:
      'Vuela de Miami a Montevideo todos los fines de semana: lo que pedís enviar hasta el viernes a las 16 viaja ese domingo.',
    estimatorKg: { min: 1, max: 10 },
  },
  glic: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://glicglobal.com/uy/calculadora.html', 'https://glicglobal.com/uy/'],
    tariff: {
      note: 'US$22,99/kg; del 3.º al 7.º kilo, 30% menos; desde el 8.º kilo, 50% menos',
    },
    origins: [{ place: 'Estados Unidos', transit: '3 a 10 días hábiles' }],
    inUruguay: 'Envía al punto del país que le indiques y lo recibís en tu casa.',
    payment: 'Su sitio ofrece 25 % menos pagando con tarjetas Itaú.',
    calculatorUrl: 'https://glicglobal.com/uy/calculadora.html',
    estimatorKg: { min: 1, max: 2 },
  },
  'miami-box': {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.miami-box.com/'],
    tariff: {
      perKgUsd: 25.9,
      baseUsd: 6,
      note: 'Según su calculadora, US$25,90 por kilo de flete y US$6 de manejo para Montevideo (US$31,90 por 1 kg, US$57,80 por 2 kg, US$135,50 por 5 kg), sin el valor del producto ni los impuestos de aduana; máximo 20 kg por encomienda',
    },
    rateSource: 'calculadora',
    origins: [{ place: 'Miami, Florida' }],
    inUruguay:
      'Entrega en la puerta de tu casa. Su oficina está en Solano García 2476, local 002, esquina Miñones y José Ellauri, Montevideo (lunes a viernes de 9 a 17:45).',
    calculatorUrl: 'https://www.miami-box.com/',
    calculator: {
      inputs: 'paquete con destino Montevideo',
      lines: [
        { label: 'Flete internacional', usd: 51.8 },
        { label: 'Manejo', usd: 6 },
      ],
      readings: [
        { kg: 1, totalUsd: 31.9 },
        { kg: 2, totalUsd: 57.8 },
        { kg: 5, totalUsd: 135.5 },
      ],
      excludes: 'el valor del producto y los impuestos de aduana',
    },
    estimatorKg: { min: 1, max: 5 },
  },
  exur: {
    checkedAt: COURIER_CHECKED_AT,
    sources: ['https://www.exurenvios.com/', 'https://www.exurenvios.com/Calculadora.aspx'],
    origins: [{ place: 'Miami, Florida' }],
    inUruguay:
      'Retiro en sus agencias de Río Branco 1377 (Galería Libertador) y de Ejido 1008 esquina Gonzalo Ramírez, Montevideo, o en agencias asociadas de Parque Miramar, Maldonado y Tacuarembó; también envía a domicilio.',
    calculatorUrl: 'https://www.exurenvios.com/Calculadora.aspx',
    calculator: {
      inputs:
        'retiro en la agencia EXUR Río Branco y compra de US$ 100 en Estados Unidos con franquicia',
      lines: [
        { label: 'Costo de envío', usd: 50 },
        { label: 'Servicio de agencia', usd: 0 },
        { label: 'Sobrecargo por combustible', usd: 0 },
      ],
      readings: [
        { kg: 1, totalUsd: 34 },
        { kg: 2, totalUsd: 50 },
        { kg: 5, totalUsd: 106 },
      ],
    },
    alsoPublishes:
      'Además de Miami, lista oficinas en Nueva York, Nueva Jersey, Massachusetts y el sur de Florida, y una en Asunción (Paraguay).',
  },
})

/** The reading for a courier id, or `undefined` when it was never read. */
export function courierCheck(id: string): CourierCheck | undefined {
  return Object.hasOwn(COURIER_CHECKS, id) ? COURIER_CHECKS[id] : undefined
}

/** A catalogue row with what its site said on the day it was read laid on top. */
export function verifiedCourier(courier: Courier): Courier {
  const tariff = courierCheck(courier.id)?.tariff
  if (!tariff) return courier
  // A spread replaces whole fields: an override with `extraFees: []` drops the catalogue's fees
  // instead of inheriting them back.
  return { ...courier, ...tariff }
}

/** Every catalogue courier, as its site read on the day it was checked. */
export function verifiedCouriers(): Courier[] {
  return COURIERS.map(verifiedCourier)
}

/** `false` only when the courier's own site says it is not operating. */
export function courierOperating(id: string): boolean {
  return courierCheck(id)?.operating !== false
}

/** The calculator's total for a weight, when it was asked about that weight. */
export function calculatorReading(id: string, kg: number): CourierCalculatorReading | undefined {
  return courierCheck(id)?.calculator?.readings.find(reading => reading.kg === kg)
}

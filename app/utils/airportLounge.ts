// app/utils/airportLounge.ts
//
// Data + helpers for /sala-vip-aeropuerto-uruguay: every published way of getting
// into an airport VIP lounge in Uruguay, and what each one actually costs per year.
//
// PURE module (no Vue/Nuxt) so the page and the unit tests share one source of truth.
//
// Two things make Uruguay different from the "1.500 salas en el mundo" marketing:
//
//   1. There is ONE lounge per airport, run by the same operator (Aeropuertos VIP
//      Club). Priority Pass, LoungeKey, Visa Airport Companion, Mastercard Airport
//      Experiences, DragonPass and Diners all resolve to that same door. So the
//      network's size is irrelevant locally: what decides the cost is how many
//      accesses your card gives per year and what the extra ones cost.
//   2. The Arrivals lounge is a SEPARATE product and is not in the Priority Pass
//      network (only MVD2 "Partidas" is listed). A card that gets you into
//      Departures does not necessarily get you into Arrivals.
//
// Every figure here is transcribed from the issuer's or the operator's own page,
// with the URL alongside. Where nobody publishes a number we say so in `GAPS`
// instead of guessing — an unknown price is modelled as `null`, never as 0.

/** Date (YYYY-MM-DD) on which every figure below was re-checked against source. */
export const LOUNGE_LAST_REVIEWED = '2026-08-19'

/** Individual access sold by the airport's own shop (AeroShop), per passenger, VAT-exempt. */
export const WALK_IN_USD = 90

/** Children below this age enter free with a paying adult (operator + Priority Pass agree). */
export const CHILD_FREE_UNDER = 12

/** Published maximum stay, in hours, in every Aeropuertos VIP Club lounge. */
export const MAX_STAY_HOURS = 3

/** VIP check-in sold separately by AeroShop; only available with some airlines. */
export const VIP_CHECKIN_USD = 75

// ── Lounges ─────────────────────────────────────────────────────────────────

export type LoungeId = 'mvd-partidas' | 'mvd-arribos' | 'pdp'

export interface Lounge {
  id: LoungeId
  name: string
  airport: string
  iata: string
  area: 'partidas' | 'arribos'
  /** Where it physically is, as published. */
  location: string
  hours: string
  maxStayHours: number
  /** Networks whose members are admitted at this specific door. */
  networks: readonly string[]
  /** Price of a single access bought online, or `null` if not sold that way. */
  walkInUsd: number | null
  /** Operational note that changes what you'll find when you get there. */
  status: string | null
  facilities: readonly string[]
  sources: readonly Source[]
}

export interface Source {
  label: string
  url: string
}

export const LOUNGES: readonly Lounge[] = Object.freeze([
  {
    id: 'mvd-partidas',
    name: 'Aeropuertos VIP Club — Partidas',
    airport: 'Aeropuerto Internacional de Carrasco',
    iata: 'MVD',
    area: 'partidas',
    location:
      'Del lado aire, en el área de embarque sobre el ala este de la terminal: se entra después de seguridad y de migraciones.',
    hours: 'Abierta las 24 horas (00:00–23:59).',
    maxStayHours: MAX_STAY_HOURS,
    networks: [
      'Priority Pass (código MVD2)',
      'LoungeKey',
      'Visa Airport Companion',
      'Mastercard Airport Experiences',
      'DragonPass',
      'Diners Club International',
    ],
    walkInUsd: WALK_IN_USD,
    status:
      'En obra. La sala definitiva cerró la noche del 9 de febrero de 2026 y funciona una sala provisoria frente a las puertas de embarque 7 y 8. En la provisoria NO hay duchas, ni área de silencio, ni sala de juegos para chicos. La nueva sala —más de 2.000 m² y una inversión declarada de US$ 10 millones— estaba prevista para el inicio del segundo semestre de 2026; al 19/8/2026 Priority Pass sigue publicando el aviso de cierre “hasta nuevo aviso”.',
    facilities: [
      'Wifi sin costo',
      'Buffet y barra de bebidas (con alcohol)',
      'Business center',
      'Prensa nacional e internacional',
      'TV por cable',
      'Área de descanso',
      'Duchas (no disponibles en la sala provisoria)',
      'Espacio infantil (no disponible en la sala provisoria)',
    ],
    sources: [
      {
        label: 'Priority Pass — ficha MVD2 Aeropuertos VIP Club Partidas',
        url: 'https://www.prioritypass.com/es-LA/lounges/uruguay/carrasco-gral-cesareo-l-berisso-international/mvd2-aeropuertos-vip-club-partidas',
      },
      {
        label: 'Aeropuertos VIP Club — Ampliación Sala VIP',
        url: 'https://aeropuertosvipclub.com.uy/ampliacion-sala-vip/',
      },
      {
        label:
          'Montevideo Portal — el Aeropuerto de Carrasco inicia las obras de la nueva Sala VIP',
        url: 'https://www.montevideo.com.uy/Negocios-y-Tendencias/Aeropuerto-de-Carrasco-inicia-obras-de-una-nueva-Sala-VIP-de-Partidas-uc952046',
      },
    ],
  },
  {
    id: 'mvd-arribos',
    name: 'Aeropuertos VIP Club — Arribos',
    airport: 'Aeropuerto Internacional de Carrasco',
    iata: 'MVD',
    area: 'arribos',
    location: 'En el área de llegadas, para el pasajero que aterriza.',
    hours: 'Según operación del aeropuerto (el operador no publica un horario fijo).',
    maxStayHours: MAX_STAY_HOURS,
    networks: [
      'No figura en Priority Pass: en MVD la red lista una sola sala, la de Partidas (MVD2)',
    ],
    walkInUsd: WALK_IN_USD,
    status:
      'Es un producto aparte del de Partidas y se compra aparte. Que tu tarjeta te deje entrar a Partidas no implica que te deje entrar a Arribos.',
    facilities: ['Trato preferencial en migraciones y aduana', 'Servicios de la sala'],
    sources: [
      {
        label: 'AeroShop Carrasco — ingreso individual Sala VIP Arribos (US$ 90)',
        url: 'https://aeroshop.com.uy/carrasco/en/product-category/vip-lounge/',
      },
      {
        label: 'Priority Pass — salas de Carrasco (solo MVD2, Partidas)',
        url: 'https://www.prioritypass.com/en-GB/lounges/uruguay/carrasco-gral-cesareo-l-berisso-international',
      },
    ],
  },
  {
    id: 'pdp',
    name: 'Aeropuertos VIP Club — Punta del Este',
    airport: 'Aeropuerto Internacional de Punta del Este (Laguna del Sauce)',
    iata: 'PDP',
    area: 'partidas',
    location: 'Del lado aire, al final del área de pre-embarque.',
    hours: 'Según operación del aeropuerto.',
    maxStayHours: MAX_STAY_HOURS,
    networks: [
      'Priority Pass (código PDP)',
      'LoungeKey',
      'Visa Airport Companion',
      'Mastercard Airport Experiences',
      'DragonPass',
      'Diners Club International',
    ],
    walkInUsd: null,
    status:
      'Las membresías del operador (Personal, Anual y Premium) valen tanto en Carrasco como acá; el ingreso suelto no se vende en la tienda online de Carrasco.',
    facilities: [
      'Bebidas (con alcohol)',
      'TV',
      'Aire acondicionado',
      'Prensa',
      'Monitores de vuelos',
      'Área de no fumadores',
    ],
    sources: [
      {
        label: 'Priority Pass — ficha PDP Aeropuertos VIP Club',
        url: 'https://www.prioritypass.com/es-LA/lounges/uruguay/capitan-de-corbeta-carlos-a-curbelo-international/pdp-aeropuertos-vip-club',
      },
      {
        label: 'Aeropuertos VIP Club — convenios',
        url: 'https://aeropuertosvipclub.com.uy/en/agreements/',
      },
    ],
  },
])

export function getLounge(id: LoungeId): Lounge | undefined {
  return LOUNGES.find(l => l.id === id)
}

// ── Access routes ───────────────────────────────────────────────────────────

/** How you're getting in. */
export type AccessKind =
  | 'tarjeta' // a credit card benefit
  | 'cuenta' // a bank account / package benefit
  | 'membresia' // a membership you buy yourself
  | 'compra' // a single access bought at the door / online
  | 'canje' // redeeming miles or points
  | 'aerolinea' // your ticket or your frequent-flyer status

/** The middleman program that actually opens the door. */
export type LoungeProgram =
  | 'priority-pass'
  | 'loungekey'
  | 'visa-airport-companion'
  | 'mastercard-airport-experiences'
  | 'diners'
  | 'dragonpass'
  | 'operador' // straight with Aeropuertos VIP Club, no network in between
  | 'ninguno'

export const PROGRAM_LABEL: Readonly<Record<LoungeProgram, string>> = Object.freeze({
  'priority-pass': 'Priority Pass',
  loungekey: 'LoungeKey',
  'visa-airport-companion': 'Visa Airport Companion',
  'mastercard-airport-experiences': 'Mastercard Airport Experiences',
  diners: 'Diners Club International',
  dragonpass: 'DragonPass',
  operador: 'Aeropuertos VIP Club (directo)',
  ninguno: '—',
})

/** Who the free accesses belong to. Changes the maths for a couple travelling together. */
export type FreeScope =
  | 'compartido' // one pool shared by titular + adicionales
  | 'cada-uno' // the allowance repeats for each cardholder
  | 'titular' // titular only
  | 'na'

export interface AccessRoute {
  id: string
  kind: AccessKind
  /** Bank, issuer or vendor. */
  provider: string
  /** The exact product that carries the benefit. */
  product: string
  program: LoungeProgram
  /** Which doors this route opens. */
  lounges: readonly LoungeId[]
  /** Fixed yearly price you pay before any visit (membership). `null` = none. */
  annualUsd: number | null
  /** Accesses at no extra charge per calendar year. `null` = the provider doesn't publish a number. */
  freeAccesses: number | null
  freeScope: FreeScope
  /** Price of each access once the free ones are used, while the preferential pool lasts. */
  extraUsd: number | null
  /** How many accesses that preferential price covers. `null` = unlimited / not applicable. */
  extraPool: number | null
  /** Price per access once the preferential pool runs out. `null` = not published. */
  overflowUsd: number | null
  /** What a guest pays, when published. */
  guestUsd: number | null
  /** Who can use it. */
  requirement: string
  /** The detail that matters, in the provider's own terms. */
  detail: string
  sources: readonly Source[]
}

/**
 * Every published route, cheapest-first inside each group.
 *
 * NOTE on `extraUsd = 10`: this is the single most useful number on the page.
 * Itaú's Visa Platinum, Visa Infinite and Mastercard Black carry a pool of ten
 * accesses at US$ 10 each — a quarter of the Priority Pass per-visit fee and a
 * ninth of the door price. Nobody else in Uruguay publishes a preferential rate.
 */
export const ACCESS_ROUTES: readonly AccessRoute[] = Object.freeze([
  // ── Cards ────────────────────────────────────────────────────────────────
  {
    id: 'itau-visa-infinite',
    kind: 'tarjeta',
    provider: 'Itaú',
    product: 'Visa Infinite / Visa Infinite Personal Bank',
    program: 'visa-airport-companion',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: 4,
    freeScope: 'compartido',
    extraUsd: 10,
    extraPool: 10,
    overflowUsd: 32,
    guestUsd: null,
    requirement:
      'Ser titular o adicional de la tarjeta y registrarla en la app Visa Airport Companion.',
    detail:
      'Cuatro accesos gratis y diez a US$ 10 cada uno. Las adicionales Infinite también entran, pero consumen de la MISMA bolsa: los 4 gratis y los 10 preferenciales son del plástico, no de cada persona. Por encima de los 14 accesos, la tarifa que publica Itaú es de US$ 32. Se entra mostrando el QR que emite la app después de elegir la sala.',
    sources: [
      {
        label: 'Itaú — Tips de viaje (por tarjeta)',
        url: 'https://www.itau.com.uy/inst/tipsdeviaje.html',
      },
    ],
  },
  {
    id: 'itau-mastercard-black',
    kind: 'tarjeta',
    provider: 'Itaú',
    product: 'Mastercard Black',
    program: 'mastercard-airport-experiences',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: 4,
    freeScope: 'compartido',
    extraUsd: 10,
    extraPool: 10,
    overflowUsd: 32,
    guestUsd: null,
    requirement: 'Ser titular o adicional y registrarse en la app Mastercard Airport Experiences.',
    detail:
      'Mismo esquema que la Infinite pero por la red de Mastercard: 4 gratis + 10 a US$ 10, bolsa compartida con las adicionales, US$ 32 a partir del acceso 15. Acá se entra presentando la tarjeta, no un QR.',
    sources: [
      {
        label: 'Itaú — Tips de viaje (por tarjeta)',
        url: 'https://www.itau.com.uy/inst/tipsdeviaje.html',
      },
    ],
  },
  {
    id: 'itau-visa-platinum',
    kind: 'tarjeta',
    provider: 'Itaú',
    product: 'Visa Platinum',
    program: 'visa-airport-companion',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: 0,
    freeScope: 'compartido',
    extraUsd: 10,
    extraPool: 10,
    overflowUsd: 32,
    guestUsd: null,
    requirement:
      'Ser titular o adicional Platinum y registrar la tarjeta en Visa Airport Companion.',
    detail:
      'Sin accesos gratis, pero con la misma tarifa preferencial: diez accesos a US$ 10. Es la forma más barata de entrar a la sala de Carrasco que publica un emisor uruguayo — US$ 10 contra los US$ 90 del ingreso suelto. Después de los diez, US$ 32.',
    sources: [
      {
        label: 'Itaú — Tips de viaje (por tarjeta)',
        url: 'https://www.itau.com.uy/inst/tipsdeviaje.html',
      },
    ],
  },
  {
    id: 'brou-mastercard-black',
    kind: 'tarjeta',
    provider: 'BROU',
    product: 'Mastercard Black',
    program: 'mastercard-airport-experiences',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: 6,
    freeScope: 'cada-uno',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Titulares y adicionales de la Mastercard Black del Banco República.',
    detail:
      'Seis visitas por año calendario, y el BROU aclara que el beneficio corre tanto para el titular como para el adicional. Las que exceden esas seis, o los acompañantes, “tienen un costo adicional” que el banco no publica.',
    sources: [
      {
        label: 'BROU — Salas VIP (info para viajeros)',
        url: 'https://www.brou.com.uy/personas/tarjetas/info-para-viajeros/salas-vip',
      },
    ],
  },
  {
    id: 'santander-mastercard-black',
    kind: 'tarjeta',
    provider: 'Santander',
    product: 'Mastercard Black',
    program: 'mastercard-airport-experiences',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: 5,
    freeScope: 'compartido',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Tarjeta Mastercard Black activa y sin bloqueos.',
    detail:
      'Cinco accesos gratis al año “para disfrutar entre adicionales y titulares”: es una bolsa común, no cinco por persona. Santander avisa algo que casi nadie escribe: si la tarjeta está bloqueada por no pago o saldo insuficiente, la sala puede rechazarte el ingreso.',
    sources: [
      {
        label: 'Santander Uruguay — preguntas frecuentes de tarjetas en viajes',
        url: 'https://www.santander.com.uy/centro-de-ayuda/tarjetas/viajes',
      },
    ],
  },
  {
    id: 'bbva-visa-infinite',
    kind: 'tarjeta',
    provider: 'BBVA',
    product: 'Visa Infinite',
    program: 'visa-airport-companion',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: 5,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Ingreso mínimo declarado de $ 100.000 y app Visa Airport Companion.',
    detail:
      'Cinco accesos gratis al año descargando la app. BBVA no publica qué se paga por el sexto ni si las adicionales comparten la bolsa.',
    sources: [
      {
        label: 'BBVA Uruguay — Tarjeta Visa Infinite',
        url: 'https://www.bbva.com.uy/personas/productos/tarjetas/tarjeta-de-credito/tarjetas-visa/visa-infinite.html',
      },
    ],
  },
  {
    id: 'bbva-mastercard-black',
    kind: 'tarjeta',
    provider: 'BBVA',
    product: 'Mastercard Black',
    program: 'mastercard-airport-experiences',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: 4,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Ingreso mínimo declarado de $ 100.000.',
    detail:
      'Cuatro accesos gratis por año a la red Mastercard Airport Experiences, provista por LoungeKey. El propio BBVA aclara que este programa sustituyó al viejo “Priority Pass Mastercard”.',
    sources: [
      {
        label: 'BBVA Uruguay — Tarjeta Mastercard Black',
        url: 'https://www.bbva.com.uy/personas/productos/tarjetas/tarjeta-de-credito/tarjetas-mastercard-/mastercard-black.html',
      },
    ],
  },
  {
    id: 'scotia-amex-platinum',
    kind: 'tarjeta',
    provider: 'Scotiabank',
    product: 'American Express Platinum',
    program: 'priority-pass',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: 10,
    freeScope: 'titular',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Línea Platinum de la American Express de Scotiabank.',
    detail:
      'Diez ingresos anuales para el titular y cinco para el adicional, vía Priority Pass. Es la mayor cantidad de accesos gratis que publica un emisor uruguayo. Suma además 12 accesos anuales de 72 horas al parking del aeropuerto.',
    sources: [{ label: 'Scotiabank Uruguay', url: 'https://www.scotiabank.com.uy/' }],
  },
  {
    id: 'scotia-amex-gold',
    kind: 'tarjeta',
    provider: 'Scotiabank',
    product: 'American Express Gold',
    program: 'operador',
    lounges: ['mvd-partidas'],
    annualUsd: null,
    freeAccesses: 3,
    freeScope: 'cada-uno',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Línea Gold de la American Express de Scotiabank.',
    detail:
      'Tres ingresos anuales por titular y por adicional, no acumulables entre sí; del cuarto en adelante se paga “un precio preferencial” que el banco no publica. El convenio del operador la lista como acceso directo a la sala de Partidas, sin red intermedia.',
    sources: [
      { label: 'Scotiabank Uruguay', url: 'https://www.scotiabank.com.uy/' },
      {
        label: 'Aeropuertos VIP Club — convenios (Scotiabank)',
        url: 'https://aeropuertosvipclub.com.uy/en/agreements/',
      },
    ],
  },
  {
    id: 'diners-club',
    kind: 'tarjeta',
    provider: 'Diners Club',
    product: 'Diners Club International (emitida en cualquier país)',
    program: 'diners',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: null,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Ser tarjetahabiente Diners Club International.',
    detail:
      'El operador la lista como acceso a las salas de Partidas de Carrasco y Punta del Este. La cantidad de ingresos incluidos depende del emisor de cada país, no del aeropuerto.',
    sources: [
      {
        label: 'Aeropuertos VIP Club — convenios (Diners Club)',
        url: 'https://aeropuertosvipclub.com.uy/en/agreements/',
      },
      {
        label: 'Diners Club International — ficha MVD2',
        url: 'https://www.dinersclub.com/cardmembers/airport-lounges-details.Uruguay.Montevideo.aeropuertos-vip-club-partidas.MVD2/',
      },
    ],
  },
  {
    id: 'tarjeta-extranjera-priority-pass',
    kind: 'tarjeta',
    provider: 'Emisores del exterior',
    product: 'Tarjetas con Priority Pass Select (p. ej. The Platinum Card de American Express)',
    program: 'priority-pass',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: null,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: 35,
    requirement: 'Enrolarse en el beneficio con el emisor: la membresía no se activa sola.',
    detail:
      'La sala de Carrasco figura en el buscador de American Express para The Platinum Card, con el aviso de cierre temporal y sala alternativa. El acceso llega por Priority Pass Select, así que el invitado paga la tarifa de invitado de la red (US$ 35 al momento de esta revisión).',
    sources: [
      {
        label: 'American Express — salas en Carrasco para The Platinum Card',
        url: 'https://www.americanexpress.com/en-us/travel/lounges/the-platinum-card/MVD',
      },
    ],
  },

  // ── Accounts / packages ──────────────────────────────────────────────────
  {
    id: 'itau-cuenta-personal-bank',
    kind: 'cuenta',
    provider: 'Itaú',
    product: 'Cuenta Itaú Personal Bank',
    program: 'operador',
    lounges: ['mvd-arribos'],
    annualUsd: null,
    freeAccesses: 5,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement:
      'Tener la cuenta del segmento Personal Bank (ingreso mínimo declarado $ 140.000 para el paquete).',
    detail:
      'Cinco ingresos sin costo a la Sala VIP de ARRIBOS de Carrasco. Es la única vía publicada por un banco para la sala de llegadas, que no está en Priority Pass: no la cubre ninguna tarjeta por red.',
    sources: [
      {
        label: 'Itaú — Tips de viaje (Cuenta Itaú Personal Bank)',
        url: 'https://www.itau.com.uy/inst/tipsdeviaje.html',
      },
    ],
  },
  {
    id: 'itau-paquetes',
    kind: 'cuenta',
    provider: 'Itaú',
    product: 'Paquete Full / Paquete Personal Bank',
    program: 'operador',
    lounges: ['mvd-partidas'],
    annualUsd: null,
    freeAccesses: null,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Ingreso mínimo líquido declarado: $ 62.500 (Full) y $ 140.000 (Personal Bank).',
    detail:
      'El Full promete “accesos bonificados a salas VIP” y el Personal Bank “accesos gratis a salas VIP de aeropuertos de todo el mundo”. Ninguno de los dos publica cuántos: la cifra hay que pedirla al banco antes de elegir el paquete por este motivo.',
    sources: [
      {
        label: 'Itaú — programa Volar y paquetes',
        url: 'https://www.itau.com.uy/inst/programaVolar.html',
      },
    ],
  },

  // ── Memberships you buy yourself ────────────────────────────────────────
  {
    id: 'priority-pass-standard',
    kind: 'membresia',
    provider: 'Priority Pass',
    product: 'Standard',
    program: 'priority-pass',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: 99,
    freeAccesses: 0,
    freeScope: 'na',
    extraUsd: 35,
    extraPool: null,
    overflowUsd: 35,
    guestUsd: 35,
    requirement: 'Se compra directo en Priority Pass, sin banco de por medio.',
    detail:
      'US$ 99 al año y US$ 35 por cada visita, tuya o de tu invitado. Contra los US$ 90 del ingreso suelto se da vuelta en la SEGUNDA visita del año: 99 + 2×35 = 169 contra 180. Para una sola visita, pagar la entrada sigue siendo más barato.',
    sources: [
      {
        label: 'Chase — niveles y precios de Priority Pass (precios a agosto de 2025)',
        url: 'https://www.chase.com/personal/credit-cards/education/rewards-benefits/priority-pass-levels',
      },
    ],
  },
  {
    id: 'priority-pass-standard-plus',
    kind: 'membresia',
    provider: 'Priority Pass',
    product: 'Standard Plus',
    program: 'priority-pass',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: 329,
    freeAccesses: 10,
    freeScope: 'titular',
    extraUsd: 35,
    extraPool: null,
    overflowUsd: 35,
    guestUsd: 35,
    requirement: 'Se compra directo en Priority Pass.',
    detail:
      'US$ 329 con diez visitas incluidas para el titular; después, US$ 35 cada una. El invitado siempre paga US$ 35.',
    sources: [
      {
        label: 'Chase — niveles y precios de Priority Pass (precios a agosto de 2025)',
        url: 'https://www.chase.com/personal/credit-cards/education/rewards-benefits/priority-pass-levels',
      },
    ],
  },
  {
    id: 'priority-pass-prestige',
    kind: 'membresia',
    provider: 'Priority Pass',
    product: 'Prestige',
    program: 'priority-pass',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: 469,
    freeAccesses: null, // unlimited
    freeScope: 'titular',
    extraUsd: 0,
    extraPool: null,
    overflowUsd: 0,
    guestUsd: 35,
    requirement: 'Se compra directo en Priority Pass.',
    detail:
      'US$ 469 con visitas ilimitadas para el titular. El invitado sigue pagando US$ 35 por vez.',
    sources: [
      {
        label: 'Chase — niveles y precios de Priority Pass (precios a agosto de 2025)',
        url: 'https://www.chase.com/personal/credit-cards/education/rewards-benefits/priority-pass-levels',
      },
    ],
  },
  {
    id: 'avc-personal',
    kind: 'membresia',
    provider: 'Aeropuertos VIP Club',
    product: 'Cuenta Personal',
    program: 'operador',
    lounges: ['mvd-partidas', 'mvd-arribos', 'pdp'],
    annualUsd: 864,
    freeAccesses: 12,
    freeScope: 'titular',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Se contrata con el operador de las salas.',
    detail:
      'Doce accesos a las salas de Carrasco y Punta del Este por un año, más Fast Pass (prioridad en los controles) y tarifa preferencial para invitados. Son US$ 72 por acceso si los usás todos: más caro que cualquier tarjeta y apenas más barato que el ingreso suelto.',
    sources: [
      {
        label: 'Aeropuertos VIP Club — planes de membresía',
        url: 'https://aeropuertosvipclub.com.uy/en/membership-plans/',
      },
    ],
  },
  {
    id: 'avc-anual',
    kind: 'membresia',
    provider: 'Aeropuertos VIP Club',
    product: 'Membresía Anual (ilimitada)',
    program: 'operador',
    lounges: ['mvd-partidas', 'mvd-arribos', 'pdp'],
    annualUsd: 1750,
    freeAccesses: null, // unlimited
    freeScope: 'titular',
    extraUsd: 0,
    extraPool: null,
    overflowUsd: 0,
    guestUsd: 0,
    requirement: 'Se contrata con el operador.',
    detail:
      'Accesos ilimitados a Carrasco y Punta del Este, Fast Pass, y —la parte que la hace competitiva para una familia— un invitado y los menores de 18 entran sin cargo.',
    sources: [
      {
        label: 'Aeropuertos VIP Club — planes de membresía',
        url: 'https://aeropuertosvipclub.com.uy/en/membership-plans/',
      },
    ],
  },
  {
    id: 'avc-premium',
    kind: 'membresia',
    provider: 'Aeropuertos VIP Club',
    product: 'Membresía Premium',
    program: 'operador',
    lounges: ['mvd-partidas', 'mvd-arribos', 'pdp'],
    annualUsd: 2860,
    freeAccesses: null, // unlimited
    freeScope: 'titular',
    extraUsd: 0,
    extraPool: null,
    overflowUsd: 0,
    guestUsd: 0,
    requirement: 'Se contrata con el operador.',
    detail:
      'Ilimitada en Carrasco, Punta del Este y las salas de AA2000 en Argentina (estas últimas con reserva 48 h antes), dos invitados o menores de 18 sin cargo, check-in VIP, estacionamiento cubierto con valet (2 días) y 3 días de parking en Punta del Este.',
    sources: [
      {
        label: 'Aeropuertos VIP Club — planes de membresía',
        url: 'https://aeropuertosvipclub.com.uy/en/membership-plans/',
      },
    ],
  },
  {
    id: 'avc-corporate',
    kind: 'membresia',
    provider: 'Aeropuertos VIP Club',
    product: 'Cuenta Corporate',
    program: 'operador',
    lounges: ['mvd-partidas', 'mvd-arribos', 'pdp'],
    annualUsd: 1728,
    freeAccesses: 24,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Para empresas.',
    detail:
      'Veinticuatro accesos anuales repartibles entre el personal, con Fast Pass y tarifa preferencial de invitados.',
    sources: [
      {
        label: 'Aeropuertos VIP Club — planes de membresía',
        url: 'https://aeropuertosvipclub.com.uy/en/membership-plans/',
      },
    ],
  },
  {
    id: 'dragonpass',
    kind: 'membresia',
    provider: 'DragonPass',
    product: 'Membresía DragonPass',
    program: 'dragonpass',
    lounges: ['mvd-partidas', 'pdp'],
    annualUsd: null,
    freeAccesses: null,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Membresía comprada directo o incluida en tarjetas del exterior.',
    detail:
      'El operador lista a DragonPass entre las redes admitidas en Carrasco y Punta del Este. Los planes y precios los fija DragonPass y varían por país y por promoción: no los damos acá porque no pudimos confirmarlos contra una tabla oficial vigente.',
    sources: [
      {
        label: 'Aeropuertos VIP Club — convenios (DragonPass)',
        url: 'https://aeropuertosvipclub.com.uy/en/agreements/',
      },
    ],
  },

  // ── Buying a single access ───────────────────────────────────────────────
  {
    id: 'compra-individual',
    kind: 'compra',
    provider: 'AeroShop (tienda del aeropuerto)',
    product: 'Ingreso individual — Partidas o Arribos',
    program: 'operador',
    lounges: ['mvd-partidas', 'mvd-arribos'],
    annualUsd: null,
    freeAccesses: 0,
    freeScope: 'na',
    extraUsd: WALK_IN_USD,
    extraPool: null,
    overflowUsd: WALK_IN_USD,
    guestUsd: WALK_IN_USD,
    requirement: 'Cualquier pasajero, sin importar la aerolínea ni la clase del pasaje.',
    detail:
      'US$ 90 por persona, exento de IVA, con factura por mail. Los menores de 12 son invitados del aeropuerto si van con un adulto con pasaje válido: una familia de dos adultos y dos chicos paga US$ 180, no US$ 360. Hay que indicar vuelo y aerolínea al reservar.',
    sources: [
      {
        label: 'AeroShop Carrasco — ingreso individual Sala VIP Partidas',
        url: 'https://aeroshop.com.uy/carrasco/en/product/individual-access-vip-lounge-departures/',
      },
      {
        label: 'AeroShop Carrasco — categoría Sala VIP (precios de todos los productos)',
        url: 'https://aeroshop.com.uy/carrasco/en/product-category/vip-lounge/',
      },
    ],
  },
  {
    id: 'club-el-pais',
    kind: 'compra',
    provider: 'Club El País',
    product: 'Ingreso con 20 % de descuento',
    program: 'operador',
    lounges: ['mvd-partidas'],
    annualUsd: null,
    freeAccesses: 0,
    freeScope: 'na',
    extraUsd: Math.round(WALK_IN_USD * 0.8),
    extraPool: null,
    overflowUsd: Math.round(WALK_IN_USD * 0.8),
    guestUsd: null,
    requirement: 'Ser socio del Club El País: presentar la tarjeta del club y la cédula al pagar.',
    detail:
      '20 % sobre el ingreso a la sala de Partidas. No se combina con otras promociones y exige reserva con 48 horas hábiles de anticipación, sujeta a disponibilidad. Estadía máxima de 3 horas antes del vuelo.',
    sources: [
      {
        label: 'Club El País — Aeropuertos VIP Club',
        url: 'https://www.clubelpais.com.uy/comercio/aereopuertos-vip-club/',
      },
    ],
  },
  {
    id: 'medicina-personalizada',
    kind: 'compra',
    provider: 'Medicina Personalizada',
    product: 'Ingreso con 20 % de descuento',
    program: 'operador',
    lounges: ['mvd-partidas'],
    annualUsd: null,
    freeAccesses: 0,
    freeScope: 'na',
    extraUsd: Math.round(WALK_IN_USD * 0.8),
    extraPool: null,
    overflowUsd: Math.round(WALK_IN_USD * 0.8),
    guestUsd: null,
    requirement: 'Ser socio de Medicina Personalizada.',
    detail: 'El operador publica un 20 % de descuento en la sala de Partidas para sus socios.',
    sources: [
      {
        label: 'Aeropuertos VIP Club — convenios',
        url: 'https://aeropuertosvipclub.com.uy/en/agreements/',
      },
    ],
  },

  // ── Redeeming points / miles ─────────────────────────────────────────────
  {
    id: 'canje-volar',
    kind: 'canje',
    provider: 'Itaú',
    product: 'Canje de millas Itaú Volar',
    program: 'operador',
    lounges: ['mvd-partidas', 'mvd-arribos'],
    annualUsd: null,
    freeAccesses: null,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Ser cliente del programa Volar y tener millas.',
    detail:
      'El catálogo Volar tiene una categoría “Sala VIP” y el convenio del operador confirma el canje. Itaú no publica la tarifa en millas fuera del catálogo logueado; reseñas de usuarios la ubican en torno a 2.500 millas para Partidas y 3.500 para Arribos, con Fast Track incluido. Tomalo como referencia, no como precio oficial.',
    sources: [
      {
        label: 'Itaú — programa Volar (catálogo con categoría Sala VIP)',
        url: 'https://www.itau.com.uy/inst/programaVolar.html',
      },
      {
        label: 'Aeropuertos VIP Club — convenios (canje de millas Itaú Volar)',
        url: 'https://aeropuertosvipclub.com.uy/en/agreements/',
      },
    ],
  },
  {
    id: 'canje-duty',
    kind: 'canje',
    provider: 'Santander / Duty Free Uruguay',
    product: 'Canje de Puntos Duty',
    program: 'operador',
    lounges: ['mvd-partidas'],
    annualUsd: null,
    freeAccesses: null,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Tener la tarjeta Duty de Santander y puntos acumulados.',
    detail:
      'El operador confirma que los Puntos Duty se canjean por el ingreso a la sala de Partidas. Cuántos puntos cuesta no está publicado; los puntos se acumulan a 2 por dólar en Duty Free Uruguay y 1 cada dos dólares en el resto, y vencen a los 24 meses.',
    sources: [
      {
        label: 'Aeropuertos VIP Club — convenios (Duty Free Uruguay)',
        url: 'https://aeropuertosvipclub.com.uy/en/agreements/',
      },
      {
        label: 'Santander Uruguay — tarjeta Duty',
        url: 'https://www.santander.com.uy/todas-las-tarjetas/tarjeta-duty',
      },
    ],
  },

  // ── Your ticket ─────────────────────────────────────────────────────────
  {
    id: 'pasaje-premium',
    kind: 'aerolinea',
    provider: 'Aerolíneas',
    product: 'Clase ejecutiva / premium o estatus de socio frecuente',
    program: 'ninguno',
    lounges: ['mvd-partidas'],
    annualUsd: null,
    freeAccesses: null,
    freeScope: 'na',
    extraUsd: null,
    extraPool: null,
    overflowUsd: null,
    guestUsd: null,
    requirement: 'Depende del contrato de cada aerolínea con el operador de la sala.',
    detail:
      'En Carrasco NINGUNA aerolínea tiene sala propia: la única sala es la del operador, que la contrata quien quiera. Por eso el acceso por cabina premium o por estatus no es automático ni parejo entre compañías — hay que confirmarlo con la aerolínea del vuelo. La sala, por su parte, recibe a cualquier pasajero pagando, sin importar aerolínea ni clase.',
    sources: [
      {
        label: 'Priority Pass — ficha MVD2 (una sola sala en el aeropuerto)',
        url: 'https://www.prioritypass.com/es-LA/lounges/uruguay/carrasco-gral-cesareo-l-berisso-international/mvd2-aeropuertos-vip-club-partidas',
      },
    ],
  },
])

export function getRoute(id: string): AccessRoute | undefined {
  return ACCESS_ROUTES.find(r => r.id === id)
}

export function routesByKind(kind: AccessKind): readonly AccessRoute[] {
  return ACCESS_ROUTES.filter(r => r.kind === kind)
}

/** Routes that open a given door. */
export function routesForLounge(id: LoungeId): readonly AccessRoute[] {
  return ACCESS_ROUTES.filter(r => r.lounges.includes(id))
}

// ── The cost model ──────────────────────────────────────────────────────────

export interface CostBreakdown {
  routeId: string
  /** Fixed yearly price (membership), 0 when there is none. */
  fixed: number
  /** What the visits cost on top. */
  variable: number
  /** `fixed + variable`, or `null` when the provider doesn't publish enough to compute it. */
  total: number | null
  /** Accesses the model could not price because no tariff is published. */
  unpricedVisits: number
  /** Human-readable explanation of how the number was built. */
  steps: readonly string[]
}

/**
 * What a year of lounge visits costs through one route.
 *
 * Deliberately conservative: if a provider publishes N free accesses but not the
 * price of the N+1th, extra visits are counted as UNPRICED rather than free or
 * guessed. A route that can't cover the requested visits returns `total: null`,
 * so the ranking can push it below everything that can.
 *
 * `visits` counts YOUR entries. `guests` is how many people come with you EACH time.
 * Children under 12 are free at the door and should not be counted as guests.
 */
export function annualCost(route: AccessRoute, visits: number, guests = 0): CostBreakdown {
  const steps: string[] = []
  const fixed = route.annualUsd ?? 0
  if (fixed > 0) steps.push(`Membresía anual: US$ ${fixed}`)

  const unlimited = route.freeAccesses === null && route.extraUsd === 0
  const free = unlimited ? visits : Math.min(route.freeAccesses ?? 0, visits)
  if (free > 0) steps.push(`${free} acceso${free === 1 ? '' : 's'} sin costo`)

  let remaining = visits - free
  let variable = 0
  let unpriced = 0

  if (remaining > 0) {
    if (route.extraUsd === null) {
      unpriced = remaining
      steps.push(`${remaining} acceso${remaining === 1 ? '' : 's'} a tarifa no publicada`)
      remaining = 0
    } else {
      const pool = route.extraPool === null ? remaining : Math.min(route.extraPool, remaining)
      if (pool > 0) {
        variable += pool * route.extraUsd
        steps.push(`${pool} × US$ ${route.extraUsd}`)
        remaining -= pool
      }
      if (remaining > 0) {
        if (route.overflowUsd === null) {
          unpriced += remaining
          steps.push(`${remaining} acceso${remaining === 1 ? '' : 's'} a tarifa no publicada`)
        } else {
          variable += remaining * route.overflowUsd
          steps.push(`${remaining} × US$ ${route.overflowUsd}`)
        }
        remaining = 0
      }
    }
  }

  const guestVisits = guests * visits
  if (guestVisits > 0) {
    if (route.guestUsd === null) {
      unpriced += guestVisits
      steps.push(
        `${guestVisits} ingreso${guestVisits === 1 ? '' : 's'} de acompañante a tarifa no publicada`
      )
    } else if (route.guestUsd > 0) {
      variable += guestVisits * route.guestUsd
      steps.push(`${guestVisits} × US$ ${route.guestUsd} de acompañante`)
    } else {
      steps.push(`${guestVisits} ingreso${guestVisits === 1 ? '' : 's'} de acompañante sin costo`)
    }
  }

  return {
    routeId: route.id,
    fixed,
    variable,
    total: unpriced > 0 ? null : fixed + variable,
    unpricedVisits: unpriced,
    steps,
  }
}

/** Routes whose whole cost can be computed: the ones a calculator can honestly rank. */
export const PRICEABLE_ROUTE_IDS: readonly string[] = Object.freeze([
  'compra-individual',
  'club-el-pais',
  'itau-visa-platinum',
  'itau-visa-infinite',
  'itau-mastercard-black',
  'priority-pass-standard',
  'priority-pass-standard-plus',
  'priority-pass-prestige',
  'avc-personal',
  'avc-anual',
  'avc-premium',
])

/**
 * Cheapest-first ranking for a given year of travel.
 *
 * Routes that cannot be priced end up last, in their published order, with
 * `total: null` — never sorted as if they were free.
 */
export function rankByCost(
  visits: number,
  guests = 0,
  ids: readonly string[] = PRICEABLE_ROUTE_IDS
): Array<{ route: AccessRoute; cost: CostBreakdown }> {
  const rows = ids
    .map(id => getRoute(id))
    .filter((r): r is AccessRoute => Boolean(r))
    .map(route => ({ route, cost: annualCost(route, visits, guests) }))

  return rows.sort((a, b) => {
    if (a.cost.total === null && b.cost.total === null) return 0
    if (a.cost.total === null) return 1
    if (b.cost.total === null) return -1
    return a.cost.total - b.cost.total
  })
}

/** Cost per access, for the routes where that's meaningful. `null` when unpriced or zero visits. */
export function costPerVisit(cost: CostBreakdown, visits: number): number | null {
  if (cost.total === null || visits <= 0) return null
  return cost.total / visits
}

// ── Editorial ───────────────────────────────────────────────────────────────

export interface Faq {
  q: string
  a: string
}

export const FAQS: readonly Faq[] = Object.freeze([
  {
    q: '¿Cuál es la forma más barata de entrar a la Sala VIP de Carrasco?',
    a: `Con una tarjeta Itaú Visa Platinum, Visa Infinite o Mastercard Black: la app (Visa Airport Companion o Mastercard Airport Experiences) vende hasta diez accesos por año a <strong>US$ 10</strong> cada uno. Es la única tarifa preferencial que publica un emisor uruguayo, y queda muy por debajo de los US$ 35 por visita de Priority Pass y de los US$ ${WALK_IN_USD} del ingreso suelto. Si no tenés esa tarjeta, lo más barato para una o dos visitas al año es pagar la entrada; con descuento de socio (Club El País o Medicina Personalizada) baja a US$ ${Math.round(WALK_IN_USD * 0.8)}.`,
  },
  {
    q: '¿Cuántas salas VIP hay en Uruguay?',
    a: 'Tres puertas, un solo operador: Partidas y Arribos en Carrasco, y una en el Aeropuerto de Punta del Este (Laguna del Sauce). Ninguna aerolínea tiene sala propia en Uruguay. Por eso, cuando tu tarjeta promete “1.300 salas en el mundo”, en Montevideo eso significa exactamente una.',
  },
  {
    q: '¿Priority Pass sirve para la sala de llegadas?',
    a: 'No. En Carrasco, Priority Pass lista una sola sala, la de Partidas (código MVD2). La de Arribos es un producto aparte: se compra suelta (US$ 90) o se accede por el beneficio de la Cuenta Itaú Personal Bank (5 ingresos sin costo) o canjeando millas Volar.',
  },
  {
    q: '¿Los chicos pagan?',
    a: `Los menores de ${CHILD_FREE_UNDER} años entran sin cargo acompañados por un adulto con pasaje válido: lo dicen tanto la tienda del aeropuerto como la ficha de Priority Pass. Es la diferencia entre US$ 180 y US$ 360 para una familia tipo, y el motivo por el que la cuenta familiar casi nunca justifica una membresía.`,
  },
  {
    q: '¿Cuánto tiempo puedo quedarme?',
    a: `Tres horas. Es el máximo publicado en las tres salas, y se cuenta contra la hora del vuelo, no contra la hora de entrada.`,
  },
  {
    q: '¿La sala está en obra?',
    a: 'Sí. La sala de Partidas de Carrasco cerró el 9 de febrero de 2026 y funciona una sala provisoria frente a las puertas 7 y 8, sin duchas, sin área de silencio y sin espacio infantil. La nueva sala (más de 2.000 m², US$ 10 millones) estaba prevista para el inicio del segundo semestre de 2026; al 19 de agosto de 2026 el aviso de cierre seguía publicado. Todos los programas siguen entrando, pero a la sala provisoria.',
  },
  {
    q: '¿Me alcanza con volar en clase ejecutiva?',
    a: 'No necesariamente. Como no hay salas de aerolínea, el acceso por cabina premium o por estatus depende de que tu aerolínea tenga contrato con el operador; no es parejo entre compañías. Conviene confirmarlo con la aerolínea antes de contar con eso. La sala, en cambio, recibe a cualquier pasajero pagando, sin importar la aerolínea ni la clase.',
  },
  {
    q: '¿Conviene comprar una membresía?',
    a: `Casi nunca, si volás desde Uruguay. La membresía más barata del operador cuesta US$ 864 por 12 accesos (US$ 72 cada uno): apenas por debajo del ingreso suelto y siete veces la tarifa de US$ 10 de Itaú. Priority Pass Standard (US$ 99 + US$ 35 por visita) le gana al ingreso suelto recién en la segunda visita del año (US$ 169 contra US$ 180). La cuenta cambia si además usás salas en el exterior, que es para lo que esas membresías están pensadas.`,
  },
  {
    q: '¿Qué pasa si mi tarjeta está bloqueada?',
    a: 'Santander lo escribe explícito: si la tarjeta está bloqueada por no pago o saldo insuficiente, la sala puede rechazar el ingreso. El beneficio se valida contra el plástico en el momento, no contra tu categoría de cliente.',
  },
])

/** What nobody publishes. Being explicit here is the point of the page. */
export const GAPS: readonly string[] = Object.freeze([
  'BROU, Santander, BBVA y la Amex Gold de Scotiabank dicen cuántos accesos gratis dan, pero no qué se paga por el siguiente. BROU habla de “un costo adicional” y Scotiabank de “un precio preferencial”, sin cifra.',
  'Ninguno de esos cuatro publica la tarifa de acompañante, que es la que decide si viajás en pareja o en familia.',
  'Itaú publica una tarifa de US$ 32 por encima de la bolsa preferencial, pero el texto sigue redactado como un cambio “a partir del 1 de noviembre de 2023”: es la cifra vigente publicada, con una redacción vieja.',
  'Los paquetes Itaú Full y Personal Bank prometen accesos “bonificados” y “gratis” sin decir cuántos.',
  'Cuántos Puntos Duty cuesta un ingreso no está publicado en ninguna parte.',
  'Itaú no publica fuera del catálogo logueado cuántas millas Volar cuesta la sala; las cifras que circulan (≈2.500 Partidas, ≈3.500 Arribos) son de reseñas de usuarios.',
  'Algunas redes listan una tarifa de ingreso sin membresía cercana a US$ 70 para Carrasco, por debajo de los US$ 90 de la tienda oficial del aeropuerto. No pudimos confirmar esa cifra en fuente del operador: si vas a pagar en el mostrador, preguntá el precio antes.',
  'DragonPass está aceptado, pero sus planes y precios no se pudieron verificar contra una tabla oficial vigente.',
])

/** Issuers and products that do NOT give lounge access, so the reader stops looking. */
export const NO_ACCESS: readonly string[] = Object.freeze([
  'Ninguna fintech uruguaya (Prex, Astropay, Takenos y similares) publica acceso a salas VIP: ni con sus tarjetas prepagas ni con sus cuentas.',
  'Tampoco lo publican los emisores no bancarios y cooperativas de plaza (OCA, Creditel, Anda, Fucac).',
  'Dentro de los bancos, el beneficio está atado a la gama alta: Platinum, Infinite, Black o Amex. Las líneas Internacional, Clásica y Oro no lo tienen en ningún emisor uruguayo.',
  'En BBVA Uruguay el acceso lo llevan la Visa Infinite y la Mastercard Black; la Mastercard Platinum no lo publica.',
])

/** Every source consulted, for the page's footer. */
export const LOUNGE_SOURCES: readonly Source[] = Object.freeze([
  {
    label: 'Aeropuertos VIP Club — convenios',
    url: 'https://aeropuertosvipclub.com.uy/en/agreements/',
  },
  {
    label: 'Aeropuertos VIP Club — planes de membresía',
    url: 'https://aeropuertosvipclub.com.uy/en/membership-plans/',
  },
  {
    label: 'Aeropuertos VIP Club — ampliación de la Sala VIP',
    url: 'https://aeropuertosvipclub.com.uy/ampliacion-sala-vip/',
  },
  {
    label: 'AeroShop Carrasco — ingreso individual a la Sala VIP',
    url: 'https://aeroshop.com.uy/carrasco/en/product/individual-access-vip-lounge-departures/',
  },
  {
    label: 'Priority Pass — Aeropuertos VIP Club Partidas (MVD2)',
    url: 'https://www.prioritypass.com/es-LA/lounges/uruguay/carrasco-gral-cesareo-l-berisso-international/mvd2-aeropuertos-vip-club-partidas',
  },
  {
    label: 'Priority Pass — Aeropuertos VIP Club (PDP)',
    url: 'https://www.prioritypass.com/es-LA/lounges/uruguay/capitan-de-corbeta-carlos-a-curbelo-international/pdp-aeropuertos-vip-club',
  },
  {
    label: 'Itaú — Tips de viaje por tarjeta',
    url: 'https://www.itau.com.uy/inst/tipsdeviaje.html',
  },
  { label: 'Itaú — programa Volar', url: 'https://www.itau.com.uy/inst/programaVolar.html' },
  {
    label: 'BROU — Salas VIP',
    url: 'https://www.brou.com.uy/personas/tarjetas/info-para-viajeros/salas-vip',
  },
  {
    label: 'Santander Uruguay — tarjetas en viajes',
    url: 'https://www.santander.com.uy/centro-de-ayuda/tarjetas/viajes',
  },
  {
    label: 'BBVA Uruguay — Visa Infinite',
    url: 'https://www.bbva.com.uy/personas/productos/tarjetas/tarjeta-de-credito/tarjetas-visa/visa-infinite.html',
  },
  {
    label: 'BBVA Uruguay — Mastercard Black',
    url: 'https://www.bbva.com.uy/personas/productos/tarjetas/tarjeta-de-credito/tarjetas-mastercard-/mastercard-black.html',
  },
  { label: 'Scotiabank Uruguay', url: 'https://www.scotiabank.com.uy/' },
  {
    label: 'Club El País — Aeropuertos VIP Club',
    url: 'https://www.clubelpais.com.uy/comercio/aereopuertos-vip-club/',
  },
  {
    label: 'American Express — salas en MVD para The Platinum Card',
    url: 'https://www.americanexpress.com/en-us/travel/lounges/the-platinum-card/MVD',
  },
  {
    label: 'Chase — niveles y precios de Priority Pass',
    url: 'https://www.chase.com/personal/credit-cards/education/rewards-benefits/priority-pass-levels',
  },
  {
    label: 'Montevideo Portal — obras de la nueva Sala VIP de Partidas',
    url: 'https://www.montevideo.com.uy/Negocios-y-Tendencias/Aeropuerto-de-Carrasco-inicia-obras-de-una-nueva-Sala-VIP-de-Partidas-uc952046',
  },
])

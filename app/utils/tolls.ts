// Los peajes de las rutas nacionales: cuánto sale cada paso y por qué el mismo paso tiene tres
// precios distintos.
//
// Catálogo puro (sin imports de Vue/Nuxt) para `/peajes-uruguay`.
//
// REGLA DE ESTE ARCHIVO, la misma que `dgiCertificate.ts` y `householdBills.ts`: cada cifra y
// cada exoneración que se publica sale de la página oficial del MTOP o del texto del decreto, y
// va con su cita y su URL. Lo que no se pudo sostener con una fuente no se publica. Por eso los
// puestos se listan con la ruta y el kilómetro que publica el MTOP y NO con el departamento: el
// listado oficial no lo trae, y deducirlo del kilómetro sería inventarlo.
//
// POR QUÉ ESTA PÁGINA. El sitio ya contaba casi todo lo que sale mover un auto —la nafta
// (`/precio-de-la-nafta-uruguay`), la patente y las multas (`/multas-de-transito-y-patente-uruguay`),
// el costo por mes de cada modo (`/conviene-auto-moto-o-omnibus-uruguay`)— y el peaje, que es el
// costo que aparece justo cuando se sale de Montevideo, no estaba en ninguna parte. Y las dos
// cosas que más plata mueven no las sabe casi nadie:
//
//   1. El MISMO paso tiene tres precios. Para un auto: $ 167 con TAG, $ 196,57 pagando en la
//      barrera y $ 214 si termina cobrándose por el SUCIVE. Quien lo deja caer al SUCIVE paga un
//      28 % más que quien tiene el TAG, y el TAG lo entregan sin costo en cualquier peaje.
//   2. Las MOTOS no pagan. El art. 19 del Reglamento exonera a los «vehículos de porte menor»
//      —bicicletas, motos, triciclos, cuadriciclos con o sin motor, carros y cabalgaduras—, que es
//      un dato que le falta a la comparación de `/conviene-auto-moto-o-omnibus-uruguay`.

/** Fecha en que se verificaron contra la fuente todas las cifras de este archivo. */
export const TOLLS_VERIFIED_AT = '2026-09-29'

/** Desde cuándo rigen las tarifas publicadas acá (comunicado del MTOP). */
export const TOLL_TARIFF_EFFECTIVE_FROM = '2026-06-05'

/**
 * Cuándo vuelven a cambiar.
 *
 * No es una estimación: la página de tarifas del MTOP lo dice con todas las letras — «Los valores
 * de las tarifas de peaje se actualizarán semestralmente a la hora cero del 1° de junio y el 1° de
 * diciembre de cada año». Después de esa fecha las cifras de este archivo quedan sin respaldo y
 * hay que ir a buscarlas a la fuente, no arrastrarlas.
 */
export const TOLL_NEXT_ADJUSTMENT = '2026-12-01'

export interface TollSource {
  readonly label: string
  readonly url: string
}

export const TOLL_SOURCES: readonly TollSource[] = Object.freeze([
  {
    label: 'MTOP — Tarifas de peajes vigentes (actualizada el 5/6/2026)',
    url: 'https://www.gub.uy/ministerio-transporte-obras-publicas/politicas-y-gestion/tarifas',
  },
  {
    label: 'MTOP — Ajuste de tarifas desde la hora cero del 5 de junio de 2026',
    url: 'https://www.gub.uy/ministerio-transporte-obras-publicas/comunicacion/comunicados/ajuste-tarifas-peajes-desde-hora-cero-del-5-junio-2026',
  },
  {
    label: 'MTOP — Información sobre puestos de peaje (operadores, ubicación y contacto)',
    url: 'https://www.gub.uy/ministerio-transporte-obras-publicas/politicas-y-gestion/informacion-sobre-puestos-peaje',
  },
  {
    label: 'MTOP — Bonificaciones en las tarifas de peaje',
    url: 'https://www.gub.uy/ministerio-transporte-obras-publicas/politicas-y-gestion/bonificaciones',
  },
  {
    label: 'MTOP — Exoneraciones (quiénes no pagan)',
    url: 'https://www.gub.uy/ministerio-transporte-obras-publicas/politicas-y-gestion/exoneraciones',
  },
  {
    label: 'MTOP — Peajes (el TAG se entrega sin costo en todos los peajes del país)',
    url: 'https://www.gub.uy/ministerio-transporte-obras-publicas/peajes',
  },
  {
    label:
      'IMPO — Decreto 119/023: Reglamento para el Cobro de las Tarifas de Peaje en Rutas Nacionales',
    url: 'https://www.impo.com.uy/bases/decretos/119-2023',
  },
  {
    label: 'IMPO — Decreto 244/023: modifica los arts. 7, 20, 21, 39 y el literal B del 44',
    url: 'https://www.impo.com.uy/bases/decretos/244-2023',
  },
])

/** Las tres formas de que el paso termine cobrado, de la más barata a la más cara. */
export type TollPayment = 'telepeaje' | 'basica' | 'sucive'

export interface TollCategory {
  /** El número de categoría del propio cuadro del MTOP. */
  readonly id: number
  /** La descripción del vehículo, textual de la fuente. */
  readonly vehicles: string
  /** Tarifa básica en cada sentido, con IVA incluido. */
  readonly basicaUyu: number
  /** Tarifa con TAG (prepago o pospago con medio de pago asociado). */
  readonly telepeajeUyu: number
  /** Tarifa cuando el cobro se envía al SUCIVE (modalidad supletoria). */
  readonly suciveUyu: number
}

/**
 * El cuadro oficial, fila por fila y en el orden de la fuente.
 *
 * Las siete categorías caen en cuatro precios: las dos primeras comparten tarifa, las tres del
 * medio también. Se listan igual las siete porque la fuente las numera y porque saber en cuál cae
 * un vehículo es media pregunta — una camioneta con remolque de un eje sigue siendo categoría 1.
 */
export const TOLL_CATEGORIES: readonly TollCategory[] = Object.freeze([
  {
    id: 1,
    vehicles: 'Autos y camionetas (2 ejes y 4 ruedas no duales, con remolque de 1 eje)',
    basicaUyu: 196.57,
    telepeajeUyu: 167,
    suciveUyu: 214,
  },
  {
    id: 2,
    vehicles: 'Tractor sin semirremolque y ómnibus hasta 25 pasajeros',
    basicaUyu: 196.57,
    telepeajeUyu: 167,
    suciveUyu: 214,
  },
  {
    id: 3,
    vehicles: 'Vehículos o equipos de carga de hasta 3 ejes y 6 ruedas',
    basicaUyu: 258.5,
    telepeajeUyu: 220,
    suciveUyu: 282,
  },
  {
    id: 4,
    vehicles: 'Ómnibus de más de 25 pasajeros',
    basicaUyu: 258.5,
    telepeajeUyu: 220,
    suciveUyu: 282,
  },
  {
    id: 5,
    vehicles: 'Vehículos o equipos de carga de 3 ejes y más de 6 ruedas',
    basicaUyu: 258.5,
    telepeajeUyu: 220,
    suciveUyu: 282,
  },
  {
    id: 6,
    vehicles: 'Vehículos o equipos de 4 o más ejes, no tritrenes',
    basicaUyu: 527.78,
    telepeajeUyu: 449,
    suciveUyu: 575,
  },
  {
    id: 7,
    vehicles: 'Vehículos o equipos de carga tritrenes',
    basicaUyu: 883.22,
    telepeajeUyu: 751,
    suciveUyu: 963,
  },
])

/** La categoría del auto particular, que es la que busca casi todo el que entra a la página. */
export const TOLL_CAR_CATEGORY_ID = 1

export function tollCategory(id: number): TollCategory | undefined {
  return TOLL_CATEGORIES.find(category => category.id === id)
}

export function tollPrice(category: TollCategory, payment: TollPayment): number {
  if (payment === 'telepeaje') return category.telepeajeUyu
  if (payment === 'sucive') return category.suciveUyu
  return category.basicaUyu
}

/**
 * Cuánto más caro sale, en porcentaje, dejar que el paso se cobre por SUCIVE en vez de tener TAG.
 *
 * Es el número que ordena toda la página y por eso se calcula y no se escribe: si el próximo
 * ajuste mueve las dos puntas distinto, el porcentaje se mueve solo.
 */
export function suciveSurchargePct(category: TollCategory): number {
  return ((category.suciveUyu - category.telepeajeUyu) / category.telepeajeUyu) * 100
}

/** Lo que se ahorra por pasada quien tiene TAG frente a quien paga en la barrera. */
export function telepeajeSavingUyu(category: TollCategory): number {
  return category.basicaUyu - category.telepeajeUyu
}

/**
 * El total de un viaje: tarifa de la categoría × cantidad de puestos × (2 si es ida y vuelta).
 *
 * La tarifa del cuadro es «en cada sentido», así que un viaje de ida y vuelta que cruza dos
 * puestos son CUATRO pasadas. Es aritmética sobre la tarifa oficial y nada más: la página no sabe
 * qué puestos cruza cada ruta y no lo adivina, los elige quien la usa.
 */
export function tollTripCostUyu(
  category: TollCategory,
  payment: TollPayment,
  plazas: number,
  roundTrip: boolean
): number {
  const crossings = Math.max(0, Math.trunc(plazas)) * (roundTrip ? 2 : 1)
  return tollPrice(category, payment) * crossings
}

export interface TollPlaza {
  readonly name: string
  /** La ruta, como la nombra el MTOP («Ruta 5», «Ruta Interbalnearia»). */
  readonly route: string
  /** El kilómetro, textual de la fuente. */
  readonly km: string
  readonly operator: string
}

/**
 * Los puestos de recaudación que lista el MTOP, agrupados por el concesionario que los opera.
 *
 * La cuenta se atribuye a la fuente y no se afirma como verdad del mundo: la página dice «los que
 * lista el MTOP», con la fecha de esa lista. Un puesto que abriera mañana no estaría acá hasta que
 * la fuente lo publique, y eso es preferible a completar el listado de memoria.
 */
export const TOLL_PLAZAS: readonly TollPlaza[] = Object.freeze([
  { name: 'Cufré', route: 'Ruta 1', km: 'km 107,350', operator: 'Consorcio Cruz del Sur' },
  { name: 'La Barra', route: 'Ruta 1', km: 'km 23,500', operator: 'Consorcio Cruz del Sur' },
  { name: 'Mercedes', route: 'Ruta 2', km: 'km 284,400', operator: 'Consorcio Cruz del Sur' },
  {
    name: 'Paso del Puerto',
    route: 'Ruta 3',
    km: 'km 245,200',
    operator: 'Consorcio Cruz del Sur',
  },
  { name: 'Queguay', route: 'Ruta 3', km: 'km 392,750', operator: 'Consorcio Cruz del Sur' },
  { name: 'Centenario', route: 'Ruta 5', km: 'km 246,350', operator: 'Consorcio Cruz del Sur' },
  { name: 'Manuel Díaz', route: 'Ruta 5', km: 'km 423,200', operator: 'Consorcio Cruz del Sur' },
  { name: 'Mendoza', route: 'Ruta 5', km: 'km 67,700', operator: 'Hernández y González S.A.' },
  { name: 'Soca', route: 'Ruta 8', km: 'km 50,500', operator: 'Camino a las Sierras S.A.' },
  { name: 'Cebollatí', route: 'Ruta 8', km: 'km 206,250', operator: 'CIEMSA' },
  { name: 'Capilla de Cella', route: 'Ruta 9', km: 'km 79,500', operator: 'CIEMSA' },
  { name: 'Garzón', route: 'Ruta 9', km: 'km 191', operator: 'CIEMSA' },
  { name: 'Santa Lucía', route: 'Ruta 11', km: 'km 81', operator: 'CIEMSA' },
  { name: 'Pando', route: 'Ruta Interbalnearia', km: 'km 32,400', operator: 'CIEMSA' },
  { name: 'Solís', route: 'Ruta Interbalnearia', km: 'km 81', operator: 'CIEMSA' },
])

/** Cuántos puestos tiene cada ruta, en el orden en que aparecen las rutas en el listado. */
export function tollPlazasByRoute(): { route: string; plazas: readonly TollPlaza[] }[] {
  const routes: { route: string; plazas: TollPlaza[] }[] = []
  for (const plaza of TOLL_PLAZAS) {
    const group = routes.find(entry => entry.route === plaza.route)
    if (group) group.plazas.push(plaza)
    else routes.push({ route: plaza.route, plazas: [plaza] })
  }
  return routes
}

export interface TollDiscount {
  readonly who: string
  /** El porcentaje de bonificación sobre la tarifa vigente. */
  readonly pct: number
  /** El artículo del Reglamento que lo establece. */
  readonly article: string
  readonly note?: string
}

/**
 * Las bonificaciones del Reglamento, de la más grande a la más chica.
 *
 * Todas exigen lo mismo y la página lo dice una sola vez arriba de la tabla: hay que acogerse al
 * pago anticipado, o sea tener cuenta de Telepeaje. Sin eso el paso se manda a cobrar al SUCIVE al
 * valor de la tarifa en efectivo y la bonificación no se aplica.
 */
export const TOLL_DISCOUNTS: readonly TollDiscount[] = Object.freeze([
  {
    who: 'Domicilio o uso dentro de los 10 km del peaje (zona de bonificación 1)',
    pct: 80,
    article: 'art. 36',
    note: 'Montevideo queda exceptuado de las dos zonas de bonificación.',
  },
  {
    who: 'Domicilio o uso entre los 10 y los 20 km del peaje (zona de bonificación 2)',
    pct: 60,
    article: 'art. 37',
    note: 'Se amplía a las zonas urbana y suburbana de cinco localidades, una por peaje.',
  },
  {
    who: 'Transporte colectivo de pasajeros de servicios regulares',
    pct: 25,
    article: 'art. 33',
  },
  {
    who: 'Vehículos de carga de empresas de transporte profesional o propio de carga',
    pct: 20,
    article: 'art. 31',
  },
  {
    who: 'Transporte colectivo de pasajeros de empresas de servicios turísticos',
    pct: 20,
    article: 'art. 32',
  },
])

/** Las localidades que el Reglamento suma a la zona de bonificación 2, con su peaje. */
export const TOLL_DISCOUNT_ZONE_2_TOWNS: readonly {
  readonly plaza: string
  readonly town: string
}[] = Object.freeze([
  { plaza: 'Cufré', town: 'Rosario' },
  { plaza: 'Mercedes', town: 'Fray Bentos' },
  { plaza: 'Queguay', town: 'Paysandú y Quebracho' },
  { plaza: 'Manuel Díaz', town: 'Minas de Corrales' },
  { plaza: 'Cebollatí', town: 'Mariscala' },
])

export interface TollExemption {
  readonly who: string
  readonly article: string
}

/** Las exoneraciones generales: quiénes no pagan en NINGÚN peaje del país. */
export const TOLL_EXEMPTIONS: readonly TollExemption[] = Object.freeze([
  {
    who: 'Vehículos de porte menor: bicicletas, motos, triciclos, cuadriciclos con o sin motor, carros y cabalgaduras',
    article: 'arts. 19 y 20',
  },
  { who: 'Maquinaria agrícola', article: 'arts. 19 y 20' },
  { who: 'Maquinaria vial', article: 'arts. 19 y 20' },
  {
    who: 'Vehículos oficiales en propiedad o matriculados por el MTOP, el Ministerio de Salud Pública y el Ministerio del Interior, y los demás organismos que determine el Poder Ejecutivo por excepción',
    article: 'arts. 19 y 20',
  },
  {
    who: 'Domicilio dentro de un radio de 500 metros del peaje (exento en ese peaje)',
    article: 'art. 21, modificado por el Decreto 244/023',
  },
])

/** Exoneraciones que valen en UN peaje y dependen de dónde se vive. */
export const TOLL_LOCAL_EXEMPTIONS: readonly {
  readonly plaza: string
  readonly who: string
  readonly article: string
}[] = Object.freeze([
  {
    plaza: 'Queguay',
    who: 'Residencia permanente en el departamento de Paysandú',
    article: 'art. 25',
  },
  {
    plaza: 'Garzón',
    who: 'Residencia permanente en el departamento de Rocha',
    article: 'art. 28',
  },
  { plaza: 'Soca', who: 'Residencia permanente en la ciudad de Soca', article: 'art. 27' },
  {
    plaza: 'Mendoza',
    who: 'Residencia permanente en el «Paraje Pache», entre el Puente de Paso Pache sobre el río Santa Lucía y el peaje',
    article: 'art. 26',
  },
  {
    plaza: 'Santa Lucía',
    who: 'Residencia permanente dentro de un radio de 5 km al oeste del peaje, con límite al este en el río Santa Lucía',
    article: 'art. 29',
  },
  {
    plaza: 'La Barra',
    who: 'Residencia permanente en las poblaciones servidas por la Ruta 1 entre la margen derecha del río Santa Lucía y el km 34,900',
    article: 'art. 24',
  },
  {
    plaza: 'Pando',
    who: 'Residencia permanente en el área entre el arroyo Pando, el Río de la Plata, la Av. Julieta – Ruta 87 y la Ruta 34, incluido el barrio Villa Juana',
    article: 'art. 23',
  },
])

/**
 * La multa por evadir u obstaculizar la identificación, en veces la tarifa.
 *
 * Se guarda como multiplicador y no como importe a propósito: el importe cambia cada seis meses
 * con la tarifa y el multiplicador no, así que la página lo puede multiplicar por la tarifa del
 * día sin volverse falsa en diciembre.
 */
export const TOLL_FINE_MULTIPLIER = 15
export const TOLL_FINE_MULTIPLIER_REPEAT = 30

/** Los casos que habilitan la multa, textuales de la página del MTOP. */
export const TOLL_FINE_CASES: readonly string[] = Object.freeze([
  'Matrícula o dispositivos electrónicos de identificación adulterados',
  'Matrícula delantera y trasera que no coinciden',
  'Información de la matrícula asociada al dispositivo de Telepeaje desactualizada',
  'Sin matrícula delantera o trasera',
])

/** El plazo, en días calendario, para pagar un adeudo enviado al cobro por el SUCIVE. */
export const TOLL_SUCIVE_DEADLINE_DAYS = 60

export interface TollFaqItem {
  readonly question: string
  readonly answer: string
}

const CAR = TOLL_CATEGORIES[0]!
const money = (value: number) =>
  value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const TOLL_FAQ: readonly TollFaqItem[] = Object.freeze([
  {
    question: '¿Cuánto sale el peaje para un auto en Uruguay?',
    answer: `Depende de cómo se pague, y la diferencia no es chica. Para un auto o camioneta (categoría 1), desde el 5 de junio de 2026 la tarifa es de $ ${money(CAR.telepeajeUyu)} con Telepeaje, $ ${money(CAR.basicaUyu)} pagando en la barrera y $ ${money(CAR.suciveUyu)} si el cobro termina enviándose al SUCIVE. Es en cada sentido: una ida y vuelta por un solo peaje son dos pasadas. Los valores incluyen IVA y los publica el MTOP.`,
  },
  {
    question: '¿Las motos pagan peaje?',
    answer:
      'No. El Reglamento para el Cobro de las Tarifas de Peaje en Rutas Nacionales exonera a los «vehículos de porte menor», y la enumeración del MTOP incluye expresamente las motos, junto con bicicletas, triciclos, cuadriciclos con o sin motor, carros y cabalgaduras. También están exentas la maquinaria agrícola y la vial.',
  },
  {
    question: '¿Cuánto cuesta el TAG del Telepeaje?',
    answer:
      'Nada: el MTOP publica que el TAG se solicita sin costo en todos los peajes del país. Lo que cambia es la forma de pago asociada, que puede ser prepaga (cuenta corriente con saldo) o pospaga (con un medio de pago asociado). Sin TAG el paso se cobra en la barrera a la tarifa básica, o se manda al SUCIVE, que es la tarifa más cara de las tres.',
  },
  {
    question: '¿Cuántos peajes hay en Uruguay?',
    answer: `El MTOP lista ${String(TOLL_PLAZAS.length)} puestos de recaudación en rutas nacionales, operados por cuatro concesionarios: Consorcio Cruz del Sur, CIEMSA, Hernández y González S.A. y Camino a las Sierras S.A. Todos atienden las 24 horas, todos los días.`,
  },
  {
    question: '¿Qué pasa si paso el peaje sin pagar?',
    answer: `Si el vehículo se puede identificar, el importe se envía al cobro por el SUCIVE y hay un plazo perentorio e improrrogable de ${String(TOLL_SUCIVE_DEADLINE_DAYS)} días calendario, contados desde el día siguiente a su publicación por el SUCIVE, para pagarlo; vencido ese plazo corre un recargo mensual. Distinto es evadir: con la matrícula adulterada, tapada, sin coincidencia entre la de adelante y la de atrás o con el TAG desactualizado, el MTOP puede aplicar una multa de ${String(TOLL_FINE_MULTIPLIER)} veces la tarifa, y de ${String(TOLL_FINE_MULTIPLIER_REPEAT)} veces si la infracción se reitera.`,
  },
  {
    question: '¿Cuándo vuelven a subir los peajes?',
    answer:
      'El 1° de diciembre de 2026. La página de tarifas del MTOP establece que los valores se actualizan semestralmente a la hora cero del 1° de junio y del 1° de diciembre de cada año, así que las tarifas de esta página rigen hasta esa fecha.',
  },
  {
    question: 'Vivo cerca de un peaje, ¿pago menos?',
    answer:
      'Sí, y bastante menos, pero hay que pedirlo y hay que tener cuenta de Telepeaje. Dentro de los 10 km del puesto la bonificación es del 80 %; entre los 10 y los 20 km, del 60 %. Montevideo queda exceptuado de las dos zonas. Y con domicilio dentro de un radio de 500 metros del peaje la exoneración es total en ese peaje. Los beneficios no son acumulables: en un mismo puesto se puede tener sólo uno.',
  },
])

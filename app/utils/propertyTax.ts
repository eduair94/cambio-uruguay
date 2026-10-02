// app/utils/propertyTax.ts
// Datos de /contribucion-inmobiliaria-uruguay: el impuesto departamental sobre el inmueble.
//
// POR QUÉ EXISTE: el sitio ya contesta casi todo lo que se paga por tener una vivienda —gastos
// comunes, UTE, OSE, el Impuesto de Primaria, el IRPF del arrendamiento— y a la contribución
// inmobiliaria la nombraba de costado: como línea deducible del alquiler y como una fila del
// comparador de comprar vs. alquilar. La pregunta que llega —quién la paga, sobre qué valor, por
// qué nadie puede decir "la tasa del país" y en cuántas cuotas se paga— no la contestaba ninguna
// página. Antes de este archivo la frase "contribución inmobiliaria" aparecía en DOS lugares del
// repo, y ninguno era una página.
//
// LA RAZÓN POR LA QUE NO HAY UNA SOLA TASA, Y POR LA QUE ACÁ SÓLO HAY UNA. El artículo 297 de la
// Constitución, numeral 1.º, le da a cada Gobierno Departamental los impuestos sobre la propiedad
// inmueble urbana y suburbana "situada dentro de los límites de su jurisdicción". O sea que la
// escala la fija cada intendencia y hay diecinueve, no una. Este archivo publica la de Montevideo
// —la que se pudo contrastar contra el documento oficial de la propia intendencia— y NO inventa
// las otras dieciocho: una tabla "nacional" armada con la de Montevideo sería una cifra propia
// disfrazada de dato oficial. El mismo numeral dice lo contrario para el campo: la contribución
// RURAL la fija el Poder Legislativo y la intendencia sólo la recauda y se queda con lo recaudado.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA:
//
//   1. NINGÚN "TOTAL A PAGAR". `contribucionBase()` liquida el impuesto de la escala con el método
//      que el propio documento de la intendencia describe, y nada más. La factura NO es eso: lleva
//      encima los adicionales (10 % de pavimentación y saneamiento, 12 % de pluviales) y, en
//      palabras del documento oficial, "otros tributos de pago conjunto" —entre ellos la Tasa
//      General, que ni siquiera la paga el mismo sujeto—. Publicar un total sería prometer una
//      cifra que a nadie le va a coincidir con el papel.
//
//   2. NINGÚN ADICIONAL POR INMUEBLE VACÍO. Hay un adicional de ese tipo en el Texto Ordenado y se
//      lo menciona en prensa con un porcentaje, pero el artículo con su texto vigente no se pudo
//      abrir al armar esta página. Un porcentaje leído en un resumen de búsqueda no es una fuente:
//      queda afuera hasta poder citar el artículo.
//
//   3. NINGUNA ESCALA DE OTRO DEPARTAMENTO. Ver arriba.
//
// FUENTES PRIMARIAS, verificadas el 2026-10-02 (ver CI_SOURCES):
//   - Constitución, art. 297, numerales 1.º y 2.º — de quién es el impuesto y quién fija el rural.
//   - Intendencia de Montevideo, "Cálculo de Contribución Inmobiliaria urbana y suburbana 2026"
//     (PDF oficial) — la escala del ejercicio 2026 ya ajustada, la tasa especial y el método
//     progresional, con su propio ejemplo explicado.
//   - TOTID art. A.439 (vigente) — el texto de la norma: hecho generador, sujetos pasivos y la
//     misma escala a valores del 1.º de enero de 2022, sin el IPC posterior.
//   - TOTID art. A.526 (vigente) — la Tasa General: 1 ‰ sobre el aforo, mínimo mensual, rebaja por
//     servicio no prestado, y que la paga el OCUPANTE.
//   - TOTID, Sección II "Adicional Contribución Inmobiliaria" (vigente) — los dos adicionales.
//   - TOTID art. A.510 (vigente) — Impuesto a la Edificación Inapropiada (art. 297, num. 2.º).
//   - Intendencia de Montevideo — trámite de contribución inmobiliaria y canales de pago.
//   - Intendencia de Montevideo — "Nuevas opciones para pagar tu contribución inmobiliaria":
//     la ventana para elegir 1, 3 o 12 cuotas.

export interface CiSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const CI_VERIFIED_AT = '2026-10-02'

/** Ejercicio al que corresponde la escala publicada acá. */
export const CI_EJERCICIO = 2026

/** El departamento cuya escala se publica. No se extrapola a los otros dieciocho. */
export const CI_DEPARTAMENTO = 'Montevideo'

/** Cuántos gobiernos departamentales fijan su propia escala urbana y suburbana. */
export const CI_DEPARTAMENTOS_DEL_PAIS = 19

export const CI_SOURCES: readonly CiSource[] = Object.freeze([
  {
    label: 'Constitución de la República, artículo 297 — recursos de los Gobiernos Departamentales',
    url: 'https://www.impo.com.uy/bases/constitucion/1967-1967/297',
  },
  {
    label:
      'Intendencia de Montevideo — Cálculo de Contribución Inmobiliaria urbana y suburbana 2026 (PDF)',
    url: 'https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tributos/documentos/2026_Calculo_Contribucio%CC%81n_Inmobiliaria.pdf',
  },
  {
    label: 'TOTID, artículo A.439 — cuantía de la Contribución Inmobiliaria y sujetos pasivos',
    url: 'https://normativa.montevideo.gub.uy/content/a439',
  },
  {
    label: 'TOTID, artículo A.526 — base de cálculo de la Tasa General',
    url: 'https://normativa.montevideo.gub.uy/content/a526',
  },
  {
    label: 'TOTID, Sección II — Adicional Contribución Inmobiliaria (saneamiento y pluviales)',
    url: 'https://normativa.montevideo.gub.uy/articulos/89840',
  },
  {
    label: 'TOTID, artículo A.510 — Impuesto a la Edificación Inapropiada',
    url: 'https://normativa.montevideo.gub.uy/content/a510',
  },
  {
    label: 'Intendencia de Montevideo — Contribución inmobiliaria: cómo y dónde se paga',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/contribucion-inmobiliaria',
  },
  {
    label: 'Intendencia de Montevideo — Nuevas opciones para pagar tu contribución inmobiliaria',
    url: 'https://montevideo.gub.uy/nuevas-opciones-para-pagar-tu-contribucion-inmobiliaria',
  },
  {
    label: 'Dirección Nacional de Catastro — valor real de los inmuebles',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/direccion-nacional-catastro',
  },
])

// ---------------------------------------------------------------------------
// La escala
// ---------------------------------------------------------------------------

export interface TramoCi {
  /** Valor imponible desde el cual rige el tramo, en pesos, inclusive. */
  readonly desde: number
  /** Valor imponible hasta el cual rige, inclusive. `null` en el último tramo, que es abierto. */
  readonly hasta: number | null
  /** Alícuota del tramo, como proporción (0.0025 = 0,25 %). */
  readonly alicuota: number
  /**
   * Alícuota que rige en ese tramo cuando el padrón entra en la disposición especial.
   *
   * `null` donde la disposición no llega: los tramos de arriba del tope no pueden alcanzarla por
   * definición, porque un padrón que los toca ya superó el tope.
   */
  readonly alicuotaEspecial: number | null
}

/**
 * Valor imponible por debajo del cual rige la disposición especial del Decreto 38.156.
 *
 * El documento oficial lo dice como "menor a $ 2.481.577", y esa cifra es exactamente el `desde`
 * del tercer tramo: la disposición alcanza a los padrones que no pasan del segundo. Rige desde el
 * 1.º de enero de 2024.
 */
export const CI_TASA_ESPECIAL_TOPE = 2_481_577

/** Desde cuándo rige la disposición especial del primer tramo. */
export const CI_TASA_ESPECIAL_DESDE = '2024-01-01'

/**
 * La escala del ejercicio 2026 de Montevideo, tal como la publica la intendencia.
 *
 * Son los MISMOS porcentajes del artículo A.439, pero los montos no: la norma los expresa a
 * valores del 1.º de enero de 2022 y aclara que no incluyen "la variación del IPC posteriores" a
 * esa fecha. Por eso la tabla de acá sale del documento del ejercicio y no del artículo: aplicar
 * nosotros un IPC sobre los montos de la norma daría una tabla verosímil y propia.
 */
export const CI_ESCALA_2026: readonly TramoCi[] = Object.freeze([
  { desde: 1, hasta: 992_630, alicuota: 0.0025, alicuotaEspecial: 0.0018 },
  { desde: 992_631, hasta: 2_481_576, alicuota: 0.0075, alicuotaEspecial: 0.0075 },
  { desde: 2_481_577, hasta: 4_963_144, alicuota: 0.01, alicuotaEspecial: null },
  { desde: 4_963_145, hasta: 8_551_753, alicuota: 0.012, alicuotaEspecial: null },
  { desde: 8_551_754, hasta: 17_103_509, alicuota: 0.0165, alicuotaEspecial: null },
  { desde: 17_103_510, hasta: null, alicuota: 0.018, alicuotaEspecial: null },
])

export interface TramoLiquidado {
  readonly tramo: TramoCi
  /** Alícuota efectivamente aplicada: la especial cuando el padrón entra en la disposición. */
  readonly alicuota: number
  /** Porción del valor imponible que cae dentro de este tramo, en pesos. */
  readonly baseGravada: number
  /** Impuesto que aporta este tramo, en pesos. */
  readonly importe: number
}

export interface LiquidacionCi {
  readonly valorImponible: number
  /** Si al padrón le rige la alícuota especial del primer tramo. */
  readonly conTasaEspecial: boolean
  readonly tramos: readonly TramoLiquidado[]
  /** Impuesto de la escala, en pesos. NO es la factura: ver la nota del encabezado. */
  readonly impuesto: number
}

/**
 * El impuesto de la escala para un valor imponible, en forma progresional.
 *
 * El método no es nuestro: el documento oficial lo describe en dos párrafos —"si el valor
 * imponible del padrón supera el primer tramo, se aplica la alícuota del segundo tramo a la
 * diferencia por la cual supera ese monto, no al total"— y además lo explica con un ejemplo. Es la
 * diferencia con el Impuesto de Primaria, donde el decreto NO dice si la alícuota va sobre el
 * valor entero o por escalones y por eso `primaryEducationTax.ts` se niega a liquidar.
 *
 * Devuelve el impuesto de la escala y nada más. La factura suma los adicionales y los otros
 * tributos de pago conjunto, así que este número es un piso y no un total.
 *
 * @param valorImponible valor imponible 2026 del padrón, en pesos.
 */
export function contribucionBase(valorImponible: number): LiquidacionCi | null {
  if (!Number.isFinite(valorImponible) || valorImponible <= 0) return null
  const conTasaEspecial = valorImponible < CI_TASA_ESPECIAL_TOPE
  const tramos: TramoLiquidado[] = []
  for (const tramo of CI_ESCALA_2026) {
    // El borde inferior del tramo: `desde` es inclusive, así que lo gravado empieza en `desde - 1`.
    const piso = tramo.desde - 1
    if (valorImponible <= piso) break
    const techo = tramo.hasta === null ? valorImponible : Math.min(valorImponible, tramo.hasta)
    const baseGravada = techo - piso
    const alicuota =
      conTasaEspecial && tramo.alicuotaEspecial !== null ? tramo.alicuotaEspecial : tramo.alicuota
    tramos.push({ tramo, alicuota, baseGravada, importe: baseGravada * alicuota })
  }
  return {
    valorImponible,
    conTasaEspecial,
    tramos,
    impuesto: tramos.reduce((total, t) => total + t.importe, 0),
  }
}

// ---------------------------------------------------------------------------
// Lo que la factura suma arriba del impuesto
// ---------------------------------------------------------------------------

export interface AdicionalCi {
  readonly nombre: string
  /** Proporción del importe de la Contribución Inmobiliaria (0.1 = 10 %). */
  readonly proporcion: number
  readonly destino: string
}

/**
 * Los dos adicionales de la Sección II del Texto Ordenado, los dos sobre el importe del impuesto.
 *
 * Es el dato que explica por qué la alícuota del titular nunca es lo que dice el papel: sobre un
 * impuesto de la escala, estos dos suman 22 puntos de ese mismo importe antes de que entre
 * cualquier otro tributo de pago conjunto.
 */
export const CI_ADICIONALES: readonly AdicionalCi[] = Object.freeze([
  {
    nombre: 'Adicional para el Fondo Permanente de Obras de Pavimentación y Saneamiento',
    proporcion: 0.1,
    destino:
      'Obras de pavimentación. Lo abonan todos los contribuyentes desde el 1.º de enero de 1973.',
  },
  {
    nombre: 'Adicional Pluviales',
    proporcion: 0.12,
    destino:
      'Operación, mantenimiento y desarrollo del sistema de evacuación de aguas pluviales. Fijado en 12 % por resolución sobre el adicional del artículo 88 del Decreto 20.524.',
  },
])

/** La Tasa General del artículo A.526, que viaja en la misma factura y no la paga el mismo sujeto. */
export const CI_TASA_GENERAL = Object.freeze({
  /** 1 ‰ sobre el aforo (tierra y mejoras), en todos los casos. */
  alicuota: 0.001,
  /** Piso mensual, en pesos: la tasa nunca puede quedar por debajo. */
  minimoMensual: 500,
  /** Rebaja por cada uno de los cuatro servicios departamentales que no se presten en la zona. */
  rebajaPorServicioAusente: 0.25,
  servicios: Object.freeze([
    'Alumbrado',
    'Salubridad',
    'Conservación de obras y bienes departamentales',
    'Fiscalización y vigilancia de esos bienes y del cumplimiento de las ordenanzas',
  ]),
})

/**
 * El Impuesto a la Edificación Inapropiada, en el caso que más llega: obra sin permiso.
 *
 * Se incluye porque es el único tributo del artículo 297 que se mide COMO PORCENTAJE de la propia
 * contribución, así que quien recibe una factura abultada sin haber comprado nada puede estar
 * mirando esto y no un cambio de escala.
 */
export const CI_EDIFICACION_INAPROPIADA = Object.freeze({
  valorCatastralTope: 889_281,
  proporcionMinima: 0.1,
  proporcionMaxima: 0.75,
})

// ---------------------------------------------------------------------------
// Quiénes pagan y cómo
// ---------------------------------------------------------------------------

/** Los sujetos pasivos, en las palabras del documento oficial y del artículo A.439. */
export const CI_CONTRIBUYENTES: readonly string[] = Object.freeze([
  'Los propietarios del inmueble.',
  'Los poseedores a cualquier título.',
  'Los promitentes compradores con promesa inscripta o con fecha cierta.',
  'Los mejores postores en remate judicialmente aprobado.',
])

export interface OpcionDePagoCi {
  readonly cuotas: number
  readonly detalle: string
}

/** Las tres modalidades entre las que se puede elegir en la ventana abierta. */
export const CI_OPCIONES_DE_PAGO: readonly OpcionDePagoCi[] = Object.freeze([
  { cuotas: 1, detalle: 'Al contado, el total del ejercicio en un pago.' },
  { cuotas: 3, detalle: 'Tres cuotas cuatrimestrales, que es la modalidad de siempre.' },
  {
    cuotas: 12,
    detalle: 'Doce cuotas mensuales. Es la opción nueva y empieza a regir en enero de 2027.',
  },
])

/**
 * La ventana para elegir la modalidad, y la razón por la que esta página se publica hoy.
 *
 * La intendencia la abrió el 1.º de octubre de 2026 y cierra el 15 de diciembre. Quien no elige
 * sigue con lo que tenía, así que el dato tiene fecha de vencimiento y después del cierre la
 * página tiene que dejar de ofrecerlo como una decisión pendiente.
 */
export const CI_VENTANA_OPCION = Object.freeze({
  desde: '2026-10-01',
  hasta: '2026-12-15',
  rigeDesde: 'enero de 2027',
})

/** Si la ventana para elegir modalidad sigue abierta en una fecha dada. */
export function ventanaOpcionAbierta(hoy: Date): boolean {
  const dia = hoy.toISOString().slice(0, 10)
  return dia >= CI_VENTANA_OPCION.desde && dia <= CI_VENTANA_OPCION.hasta
}

/** Dónde se paga, según la propia intendencia. */
export const CI_CANALES_DE_PAGO: readonly string[] = Object.freeze([
  'Locales de cobranza descentralizada.',
  'Pago en línea desde el sitio de la Intendencia, con usuario gub.uy, en «Mi gestión de facturas».',
  'Pago en línea desde las plataformas de los bancos: eBROU, Pagos Banred, Visanet Pagos, BBVA, Itaú, Bandes, Santander, Banque Heritage, Pass Card, HSBC y Scotiabank.',
  'Débito automático con tarjeta de crédito o con banco.',
  'Por intermedio de gestores acreditados en la Intendencia.',
])

/** Medios admitidos y el que NO se admite, que es el que la gente intenta primero. */
export const CI_MEDIOS = Object.freeze({
  admitidos: Object.freeze([
    'Efectivo',
    'Cheque',
    'Letra de cambio',
    'Tarjeta de débito',
    'Pagos en línea',
  ]),
  excluido: 'Transferencia electrónica: la Intendencia aclara que no es válida para este impuesto.',
})

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface CiFaq {
  readonly id: string
  readonly question: string
  readonly answer: string
}

export const CI_FAQ: readonly CiFaq[] = Object.freeze([
  {
    id: 'cuanto-es',
    question: '¿Cuánto es la contribución inmobiliaria?',
    answer:
      'Depende del departamento, porque la escala la fija cada intendencia. En Montevideo, ejercicio 2026, va de 0,25 % hasta $ 992.630 de valor imponible a 1,80 % por encima de $ 17.103.510, y se aplica por tramos: la alícuota del tramo siguiente grava sólo la diferencia por la que el padrón lo supera, no el total. Si el valor imponible es menor a $ 2.481.577, el primer tramo baja de 0,25 % a 0,18 %.',
  },
  {
    id: 'por-que-no-hay-una-sola',
    question: '¿Por qué no hay una tasa única para todo el país?',
    answer:
      'Porque no es un impuesto nacional. El artículo 297 de la Constitución, numeral 1.º, le asigna a cada Gobierno Departamental los impuestos sobre la propiedad inmueble urbana y suburbana situada dentro de su jurisdicción, así que hay diecinueve escalas y diecinueve calendarios. La excepción es el campo: la contribución rural la fija el Poder Legislativo y la intendencia la recauda y se queda con lo recaudado.',
  },
  {
    id: 'sobre-que-valor',
    question: '¿Se calcula sobre lo que vale mi casa?',
    answer:
      'No. La base es el valor real del padrón —tierra y mejoras— que fija la Dirección Nacional de Catastro, no el precio de mercado ni lo que pagaste. En la factura del ejercicio figura como «valor imponible». Dos casas que se venden al mismo precio pueden tener valores imponibles distintos.',
  },
  {
    id: 'inquilino',
    question: 'Alquilo. ¿Me la pueden cobrar a mí?',
    answer:
      'La contribución la debe el propietario, el poseedor, el promitente comprador con promesa inscripta o con fecha cierta, o el mejor postor de un remate aprobado judicialmente: no el inquilino. Pero cuidado con la factura, porque viaja acompañada: la Tasa General del artículo A.526 la paga «el ocupante de la respectiva unidad ocupacional», que sí puede ser quien alquila. Son dos tributos distintos en el mismo papel.',
  },
  {
    id: 'adicionales',
    question: '¿Por qué la factura me da más que la alícuota de la tabla?',
    answer:
      'Porque la alícuota es sólo el impuesto. Encima van dos adicionales calculados sobre ese mismo importe: 10 % para el Fondo Permanente de Obras de Pavimentación y Saneamiento, que se abona desde 1973, y 12 % de Adicional Pluviales. Y el propio documento de la intendencia avisa que la factura «incluye otros tributos de pago conjunto». Por eso acá no se publica un total: el exacto se consulta por padrón.',
  },
  {
    id: 'cuotas',
    question: '¿En cuántas cuotas se paga?',
    answer:
      'En Montevideo, hasta ahora, al contado o en tres cuotas cuatrimestrales. Desde el 1.º de octubre y hasta el 15 de diciembre de 2026 se puede elegir entre 1, 3 o 12 cuotas, y la opción de doce cuotas mensuales empieza a regir en enero de 2027. En la misma ventana se puede registrar el aviso de factura por WhatsApp; las facturas dejan de enviarse en papel y pasan a estar sólo por medios electrónicos.',
  },
  {
    id: 'como-pagar',
    question: '¿Dónde se paga y con qué medios?',
    answer:
      'En locales de cobranza descentralizada, en línea desde el sitio de la Intendencia con usuario gub.uy, desde las plataformas de los bancos, por débito automático con tarjeta o banco, o por gestores acreditados. Se admite efectivo, cheque, letra de cambio, tarjeta de débito y pagos en línea. La transferencia electrónica NO es válida para este impuesto: la Intendencia lo aclara expresamente.',
  },
  {
    id: 'subio-sin-motivo',
    question: 'Me subió la factura y no hice nada. ¿Qué pudo pasar?',
    answer:
      'Tres cosas, y ninguna exige haber comprado ni construido. Una: el valor imponible se reajusta y la escala también, así que el padrón puede cruzar a un tramo más alto solo. Dos: la disposición especial del primer tramo sólo rige por debajo de $ 2.481.577 de valor imponible, y cruzar ese tope devuelve el primer tramo a 0,25 %. Tres: si hay obra sin permiso, el Impuesto a la Edificación Inapropiada se cobra como un porcentaje de la propia contribución —entre 10 % y 75 % para padrones de valor catastral inferior a $ 889.281—.',
  },
  {
    id: 'vender',
    question: 'Quiero vender. ¿Tengo que estar al día?',
    answer:
      'Sí, y no alcanza con estar al día de este impuesto solo: para escriturar hace falta acreditar la situación de los tributos departamentales del padrón. El trámite es el certificado único departamental, que cada intendencia emite sobre sus propias cuentas.',
  },
])

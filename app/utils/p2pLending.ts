// app/utils/p2pLending.ts
// Datos + matemática de /prestamos-p2p-uruguay. PURO (sin Vue/Nuxt) para que la página y los
// tests compartan una sola fuente de verdad.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE CADA COSA — leer antes de tocar un número.
//
//  1. EL RÉGIMEN SE CITA DEL TEXTO VIGENTE, NO DEL BORRADOR. La Circular 2.307 (resolución
//     del 21.11.2018, vigencia por Diario Oficial 28.11.2018, expediente 2018/1701) sólo está
//     publicada como PDF escaneado sin capa de texto. El texto legible es la Recopilación de
//     Normas de Regulación y Control del Sistema Financiero (RNRCSF, última circular Nº 2.506
//     de 23.06.2026), que trae cada artículo con su circular al pie. Los artículos de acá se
//     verificaron uno por uno contra ese PDF. El PROYECTO que el BCU puso a consulta el
//     09.08.2018 numera distinto Y DICE COSAS DISTINTAS (prohibía la gestión de cobro y
//     admitía sólo personas físicas residentes como prestamistas): no citarlo como derecho
//     vigente, es el error más común en las notas sobre el tema.
//
//  2. "LA PRIMERA PLATAFORMA AUTORIZADA" ES UNA ATRIBUCIÓN DE PRENSA, NO UN DATO DEL BCU.
//     Ningún comunicado del BCU nombra a Prestapagos y el registro de EAPPP no está publicado
//     como página web (a diferencia del de financiamiento colectivo). Además el verbo correcto
//     es INSCRIBIR: la ficha oficial de requisitos del BCU dice que estas empresas "no
//     requieren autorización previa para funcionar, pero sí requieren Inscripción en el
//     Registro". Todo lo relativo a Prestapagos va atribuido a El Observador (05.08.2026) o a
//     su propio sitio, nunca afirmado en voz propia.
//
//  3. CIFRAS DE MERCADO CON FECHA. Topes de usura, plazos fijos, licitaciones y la UI cambian.
//     Cada bloque lleva su fecha de verificación; la UI es la del 17.08.2026 y sirve sólo para
//     dar una referencia en pesos de los límites, que la norma fija en UI.
//
//  4. NINGÚN CASO DE LA SECCIÓN DE FRACASOS FUE UNA EAPPP. Wenance y Mercury vendían cesiones
//     de crédito, los fondos ganaderos vendían capitalización ganadera y Produits de France
//     emitió una obligación negociable por una plataforma de crowdfunding. Se publican porque
//     son los antecedentes reales del "poné plata que te la devuelvo con renta" en Uruguay,
//     con la etiqueta de qué eran, no como si fueran préstamos entre personas.
//
// Informativo. No es asesoramiento financiero ni jurídico.
// ─────────────────────────────────────────────────────────────────────────────────────────

/** Fecha en que se verificó el contenido de este módulo contra sus fuentes. */
export const P2P_VERIFIED_AT = '2026-08-17'

/** Valor de la Unidad Indexada usado para las referencias en pesos (INE, 17/08/2026). */
export const UI_VALUE = 6.635
export const UI_VALUE_DATE = '2026-08-17'

/** Inflación interanual (INE, IPC julio 2026). Se usa para pasar de nominal a real. */
export const INFLATION_YOY_PCT = 4.27
export const INFLATION_PERIOD = 'julio 2026 (interanual, INE)'

/** IRPF Categoría I que le corresponde al interés de un préstamo entre particulares. */
export const P2P_IRPF_PCT = 12

/** UI → pesos, a la UI de `UI_VALUE_DATE`. */
export function uiToPesos(ui: number): number {
  return ui * UI_VALUE
}

// ── El régimen, artículo por artículo ────────────────────────────────────────────────────

export interface RuleRow {
  /** Artículo de la RNRCSF vigente. */
  article: string
  title: string
  /** Qué dice la norma, en sus propios términos. */
  says: string
  /** Qué implica para el que pone la plata o para el que la pide. */
  meaning: string
  /** Cita textual corta, cuando el texto exacto es el punto. */
  quote?: string
}

export const P2P_RULES: readonly RuleRow[] = Object.freeze([
  {
    article: '125.16',
    title: 'Qué es una plataforma de préstamos entre personas',
    says: 'Son personas jurídicas que administran aplicaciones web u otros medios electrónicos diseñados para mediar entre oferentes y demandantes de préstamos de dinero. Quien se registra para publicar su oferta o su demanda es cliente de la administradora.',
    meaning:
      'La figura se llama Empresa Administradora de Plataformas para Préstamos entre Personas (EAPPP). No es un banco, no es una financiera y no es una plataforma de crowdfunding.',
  },
  {
    article: '125.17',
    title: 'Cómo tiene que estar armada la empresa',
    says: 'Sociedad comercial de la Ley 16.060 con socios personas físicas; si es sociedad anónima, las acciones deben ser nominativas.',
    meaning:
      'No puede haber dueños ocultos detrás de acciones al portador ni de una cadena de sociedades.',
  },
  {
    article: '125.18',
    title: 'La plataforma sólo acerca a las partes',
    says: 'En la mediación, la administradora “se limitará a aproximar a las partes sin asumir obligación o riesgo alguno”. Los que piden deben ser residentes; los que prestan pueden ser residentes o no, y sólo pueden ser personas físicas con recursos propios, personas jurídicas no financieras con recursos propios, entidades financieras supervisadas (bancos, cooperativas, casas financieras, administradoras de crédito, empresas de servicios financieros, fondos de inversión de la Ley 16.774) o fondos de inversión del exterior sujetos a un regulador.',
    meaning:
      'El contrato de préstamo es tuyo con el deudor. La plataforma no es parte, no responde y puede tener del otro lado a una cooperativa o a una administradora de crédito compitiendo con tu oferta.',
    quote: 'se limitarán a aproximar a las partes sin asumir obligación o riesgo alguno',
  },
  {
    article: '125.18',
    title: 'La plata no pasa por la plataforma',
    says: 'Los movimientos de fondos —tanto el desembolso inicial del prestamista como los pagos del prestatario— se canalizan por entidades que participan en el Sistema Nacional de Pagos (art. 3 de la Ley 18.573).',
    meaning:
      'La plataforma no toca el dinero. Eso reduce el riesgo de que se lo lleve, pero también significa que no hay una cuenta común de la que reclamar si algo falla.',
  },
  {
    article: '125.18',
    title: 'Qué servicios sí puede venderte la plataforma',
    says: 'Conservar la documentación de los préstamos; calificar crediticiamente a los solicitantes; sugerir tasas a los oferentes según esa calificación; y, en créditos vencidos, realizar tareas vinculadas a la gestión de cobro. Cualquier otro servicio de mediación necesita autorización previa de la Superintendencia.',
    meaning:
      'Puede ayudarte a cobrar, pero no puede cobrar por vos ni comprarte el crédito incobrable. El scoring es de la plataforma: es su opinión, no una garantía.',
  },
  {
    article: '125.19',
    title: 'Lo que la plataforma tiene prohibido',
    says: 'No puede: actuar como prestamista ni como deudor en su propia plataforma (prohibición extendida a socios, personal y vinculados, salvo que su comisión esté atada al éxito de la cobranza y dentro de los límites del art. 473.6); actuar bajo mandato de los clientes; operar los pagos y cobros, incluida la recuperación de vencidos; adquirir créditos vencidos; usar algoritmos que concierten préstamos automáticamente; constituir fondos de garantía con aportes de los participantes u otros mecanismos para distribuir riesgos entre ellos; asegurar la recuperación o el retorno de los préstamos; y administrar plataformas que operen sólo con no residentes.',
    meaning:
      'Acá está la diferencia con las plataformas europeas que se cayeron: en Uruguay están prohibidos el fondo de garantía, la promesa de recompra y el matching automático. No hay red que reparta tu pérdida entre todos.',
    quote:
      'Constituir fondos de garantía financiados mediante aportes de los participantes del sistema ni otros mecanismos destinados a distribuir los riesgos entre los mismos',
  },
  {
    article: '473.7',
    title: 'La advertencia obligatoria',
    says: 'La plataforma debe advertir a los prestamistas que son ellos quienes asumen el riesgo de pérdida total o parcial del capital prestado, y también su responsabilidad por incumplir la Ley 18.212 de usura.',
    meaning:
      'La norma da por sentado que vas a perder plata en algunos préstamos. Si el deudor no paga, la pérdida es tuya y de nadie más.',
    quote:
      'son ellos quienes asumen el riesgo de pérdida total o parcial del capital prestado (…) la empresa administradora de la plataforma sólo se limita a aproximar a las partes',
  },
  {
    article: '473.5',
    title: 'Qué información te tienen que mostrar antes de prestar',
    says: 'Del solicitante de un crédito al consumo: nombre y cédula, profesión, edad, volumen e historial de ingresos, historial crediticio o aclaración expresa de que no se dispone, destino declarado, capital, tasa efectiva anual, cuotas y vencimientos, la tasa implícita incluyendo la comisión de la plataforma, la tasa máxima legal aplicable y la relación cuota/ingreso. En hipotecarios, además el valor de tasación. La identidad puede reservarse en las primeras etapas, pero debe informarse antes de la decisión final.',
    meaning:
      '“No se dispone de historial crediticio” es una respuesta válida para la norma. Si la ves, estás prestándole a alguien sin antecedentes verificables.',
  },
  {
    article: '473.6',
    title: 'Los topes de cuánto podés prestar y cuánto puede deber cada uno',
    says: 'Endeudamiento total por plataforma: UI 100.000 la persona física, UI 1.000.000 la persona jurídica, 70% del valor de tasación si hay hipoteca. Prestamista persona física o jurídica no financiera: hasta UI 100.000 en total, con un máximo de UI 25.000 a cada deudor; si tiene activos financieros por más de UI 4.000.000, hasta UI 1.000.000 en total, con máximos de UI 100.000 por persona física y UI 250.000 por persona jurídica. Los límites son sobre saldos netos de amortizaciones.',
    meaning:
      'La norma te obliga a diversificar: para agotar el tope tenés que repartir entre al menos cuatro deudores distintos. También te dice cuál es el techo del negocio.',
  },
  {
    article: '371',
    title: 'El papel que te queda: un vale “no a la orden”',
    says: 'Los documentos de las operaciones concertadas por una plataforma inscripta deben ser nominativos a favor del prestamista e incluir la cláusula “no a la orden” o equivalente, según el modelo que provee la plataforma.',
    meaning:
      'No hay mercado secundario: no podés endosar ni vender tu crédito para salir antes. Si prestaste a 12 meses, son 12 meses.',
    quote:
      'nominativos a favor del prestamista e incluir la cláusula “no a la orden” o equivalente',
  },
  {
    article: '338',
    title: 'La usura aplica, y la comisión cuenta como interés',
    says: 'Se aplica el régimen de la Ley 18.212. Las comisiones que cobra la administradora integran la tasa de interés implícita de la operación, y los préstamos entre personas cuyos otorgantes no sean instituciones financieras no están comprendidos en el régimen de exclusiones del art. 339.',
    meaning:
      'No se puede cobrar el tope de interés y encima una comisión: se suman. Y el que responde por pasarse del tope es el prestamista, aunque sea un particular.',
  },
  {
    article: '484.1',
    title: 'Lo que la plataforma tiene que publicar',
    says: 'Costos a cargo de prestamistas y prestatarios; principales variables del modelo de calificación crediticia, si usa uno; información promedio de atrasos en los pagos de los créditos concedidos a través de la administradora al cierre de cada mes; y la comunicación de inscripción en los registros de la Superintendencia.',
    meaning:
      'Es el dato más importante para decidir: la morosidad promedio mensual de la propia plataforma. Si no está publicada, falta lo único que convierte la tasa en un rendimiento esperado.',
  },
  {
    article: '248.1',
    title: 'El depósito en el BCU no es una garantía para vos',
    says: 'La administradora debe constituir y mantener un depósito a la vista en el Banco Central en unidades indexadas por no menos de UI 50.000, “a efectos de atender las obligaciones con dicha Institución”, y reponerlo en 5 días hábiles si se debita.',
    meaning:
      'Ese depósito responde frente al BCU (multas, por ejemplo), no frente a los prestamistas. No es un seguro de tu capital.',
  },
  {
    article: '125.22 y 125.23',
    title: 'Inscripción, no autorización',
    says: 'Las EAPPP deben inscribirse en el Registro que lleva la Superintendencia de Servicios Financieros antes de iniciar actividades, aportando estatutos, nómina de socios y accionistas, personal superior, conjunto económico y beneficiarios finales. La ficha oficial de requisitos del BCU aclara que “no requieren autorización previa para funcionar, pero sí requieren Inscripción en el Registro”.',
    meaning:
      'Estar inscripta no significa que el BCU haya aprobado el negocio ni que supervise la calidad de los préstamos. Es un registro, no un sello de calidad.',
  },
  {
    article: '661.16',
    title: 'Qué le reporta la plataforma al BCU',
    says: 'Debe presentar información sobre los préstamos otorgados, trimestralmente, dentro de los 15 días hábiles siguientes al cierre del período.',
    meaning:
      'El BCU mira el agregado cada tres meses. No hay supervisión préstamo por préstamo ni en tiempo real.',
  },
  {
    article: '532, 533, 558, 604 y 635',
    title: 'Las plataformas P2P no informan a la Central de Riesgos',
    says: 'La lista de instituciones obligadas a remitir información a la central de riesgos crediticios del BCU es tasada: bancos, casas financieras, cooperativas, administradoras de grupos de ahorro previo, fiduciarios de fideicomisos financieros, empresas de servicios financieros que otorguen créditos y las administradoras de crédito de mayores activos. Las EAPPP no están en esa lista.',
    meaning:
      'Como prestamista particular no vas a ver la deuda que ese solicitante tiene en el resto del sistema, salvo lo que la plataforma te muestre. Y tu préstamo tampoco aparece ahí para el próximo que le preste.',
  },
  {
    article: '719, 720, 720.1 y 720.3',
    title: 'Qué le pasa a la plataforma si incumple',
    says: 'No presentar en plazo la información para inscribirse en el Registro: multa de UI 150.000. No adoptar mecanismos para controlar que las tasas no superen los topes de usura: multa cuyo mínimo es 0,0001 de la responsabilidad patrimonial básica para bancos. Desde el 1º de octubre de 2026, por la Circular 2.497, incumplir las obligaciones de seguridad de instrumentos electrónicos (autenticación reforzada) se sanciona con multa de entre 1/10.000 y 2/1.000 de esa misma responsabilidad patrimonial.',
    meaning: 'Las multas van al BCU. Ninguna de ellas te devuelve el capital que no cobraste.',
  },
])

// ── Límites cuantitativos ────────────────────────────────────────────────────────────────

export interface LimitRow {
  concept: string
  ui: number
  /** Cuando el límite es un porcentaje y no un monto en UI. */
  pctNote?: string
  who: 'deudor' | 'prestamista'
}

export const P2P_LIMITS: readonly LimitRow[] = Object.freeze([
  {
    concept: 'Deuda total de una persona física dentro de una plataforma',
    ui: 100000,
    who: 'deudor',
  },
  {
    concept: 'Deuda total de una persona jurídica dentro de una plataforma',
    ui: 1000000,
    who: 'deudor',
  },
  {
    concept: 'Préstamo con garantía hipotecaria',
    ui: 0,
    pctNote: '70% del valor de tasación del inmueble',
    who: 'deudor',
  },
  {
    concept: 'Total que puede prestar un particular en una plataforma',
    ui: 100000,
    who: 'prestamista',
  },
  { concept: 'Máximo que puede prestarle a un mismo deudor', ui: 25000, who: 'prestamista' },
  {
    concept: 'Total si tiene activos financieros por más de UI 4.000.000',
    ui: 1000000,
    who: 'prestamista',
  },
])

/** Cuántos deudores distintos necesitás como mínimo para agotar el tope de inversión. */
export function minBorrowersToUseCap(): number {
  return Math.ceil(100000 / 25000)
}

// ── Topes de usura vigentes ──────────────────────────────────────────────────────────────

export interface UsuryRow {
  segment: string
  currency: 'UYU' | 'USD'
  /** Tasa media publicada por el BCU. */
  meanPct: number
  /** Tope = media + margen legal. */
  capPct: number
  note?: string
}

/** Trimestre ABRIL–JUNIO 2026, vigentes desde el 1º de agosto de 2026 (BCU). */
export const USURY_PERIOD = 'trimestre abril–junio 2026, vigente desde el 1º de agosto de 2026'

export const USURY_CAPS: readonly UsuryRow[] = Object.freeze([
  {
    segment: 'Consumo, menos de UI 10.000, hasta 366 días, sin autorización de descuento',
    currency: 'UYU',
    meanPct: 84.47,
    capPct: 130.9285,
    note: 'Es el techo que explica el “hasta 130%” del que habla la prensa.',
  },
  {
    segment: 'Consumo, menos de UI 10.000, 367 días o más, sin autorización de descuento',
    currency: 'UYU',
    meanPct: 82.36,
    capPct: 127.658,
  },
  {
    segment: 'Consumo, UI 10.000 o más, hasta 366 días, sin autorización de descuento',
    currency: 'UYU',
    meanPct: 41.02,
    capPct: 63.581,
    note: 'Pasar el umbral de UI 10.000 (unos $ 66.350) baja el techo legal a la mitad.',
  },
  {
    segment: 'Consumo, UI 10.000 o más, 367 días o más, sin autorización de descuento',
    currency: 'UYU',
    meanPct: 57.32,
    capPct: 88.846,
  },
  {
    segment: 'Consumo con autorización de descuento, hasta 366 días (menos de UI 10.000)',
    currency: 'UYU',
    meanPct: 21.1,
    capPct: 32.705,
  },
  {
    segment: 'Crédito con retención de haberes, hasta 366 días (menos de UI 10.000)',
    currency: 'UYU',
    meanPct: 27.43,
    capPct: 32.27,
    note: 'Régimen especial: el tope es la media + 30%, no + 55%.',
  },
  {
    segment: 'Consumo en dólares, hasta 366 días',
    currency: 'USD',
    meanPct: 8.26,
    capPct: 12.803,
    note: 'Prestar en dólares te mete en un techo legal radicalmente más bajo.',
  },
  {
    segment: 'Consumo en dólares, 367 días o más',
    currency: 'USD',
    meanPct: 12.26,
    capPct: 19.003,
  },
])

/** Umbral en UI que parte las dos franjas de crédito al consumo. */
export const USURY_TIER_UI = 10000

// ── La calculadora: qué queda después de la mora, la comisión y el impuesto ──────────────

export interface P2PReturnInput {
  /** Tasa efectiva anual pactada con el deudor, en %. */
  teaPct: number
  /** Comisión anual de la plataforma sobre el capital prestado, en %. */
  platformFeePct: number
  /** Porcentaje del capital colocado que entra en default en el año, en %. */
  defaultPct: number
  /** Cuánto se recupera de lo que entró en default, en %. */
  recoveryPct: number
  /** IRPF sobre el interés efectivamente cobrado, en %. */
  taxPct: number
  /** Inflación anual usada para pasar a términos reales, en %. */
  inflationPct: number
}

export interface P2PReturnResult {
  /** Interés cobrado por cada 100 prestados (los créditos en default no pagan interés). */
  interestCollected: number
  /** Capital perdido por cada 100 prestados, ya neto de recupero. */
  capitalLost: number
  /** Comisión pagada a la plataforma por cada 100 prestados. */
  fee: number
  /** IRPF por cada 100 prestados. */
  tax: number
  /** Resultado neto nominal, en % anual. */
  netNominalPct: number
  /** Resultado neto en términos reales (descontada la inflación), en % anual. */
  netRealPct: number
  /** Mora que dejaría el resultado nominal en cero, en %. Null si ninguna mora lo logra. */
  breakEvenDefaultPct: number | null
  /** Cuánto se comió el ruido: diferencia entre la tasa pactada y el neto nominal. */
  gapVsHeadlinePct: number
}

const clampPct = (v: number): number => (Number.isFinite(v) ? Math.min(Math.max(v, 0), 100) : 0)

/**
 * Modelo deliberadamente simple y declarado, por cada 100 pesos colocados durante un año:
 *   interés cobrado = tasa × (1 − mora)      ← un crédito en default no paga interés
 *   capital perdido = mora × (1 − recupero)
 *   comisión        = comisión × 100
 *   IRPF            = tasa del impuesto sobre el interés cobrado
 *
 * El impuesto se calcula sobre el interés cobrado y NO se compensa con la pérdida de capital:
 * el IRPF Categoría I grava el rendimiento, y para un particular no hay un mecanismo de
 * deducción de incobrables como el que tiene una empresa en el IRAE. Si tu caso admite otro
 * tratamiento, el número real te va a dar mejor que este.
 */
export function computeP2PReturn(input: P2PReturnInput): P2PReturnResult {
  const tea = clampPct(input.teaPct) / 100
  const fee = clampPct(input.platformFeePct) / 100
  const d = clampPct(input.defaultPct) / 100
  const r = clampPct(input.recoveryPct) / 100
  const t = clampPct(input.taxPct) / 100
  const infl = clampPct(input.inflationPct) / 100

  const interestCollected = 100 * tea * (1 - d)
  const capitalLost = 100 * d * (1 - r)
  const feeAmount = 100 * fee
  const tax = interestCollected * t

  const net = interestCollected - capitalLost - feeAmount - tax
  const netNominalPct = net
  const netRealPct = ((1 + net / 100) / (1 + infl) - 1) * 100

  // net(d) = 0  →  d* = (tea·(1−t) − fee) / (tea·(1−t) + (1−r))
  const numerator = tea * (1 - t) - fee
  const denominator = tea * (1 - t) + (1 - r)
  let breakEvenDefaultPct: number | null = null
  if (denominator > 0) {
    const raw = (numerator / denominator) * 100
    breakEvenDefaultPct = raw >= 0 && raw <= 100 ? raw : raw < 0 ? 0 : null
  }

  return {
    interestCollected,
    capitalLost,
    fee: feeAmount,
    tax,
    netNominalPct,
    netRealPct,
    breakEvenDefaultPct,
    gapVsHeadlinePct: clampPct(input.teaPct) - netNominalPct,
  }
}

/** Valores de arranque de la calculadora: mitad de la banda declarada por la plataforma. */
export const P2P_CALC_DEFAULTS: P2PReturnInput = Object.freeze({
  teaPct: 60,
  platformFeePct: 5,
  defaultPct: 15,
  recoveryPct: 20,
  taxPct: P2P_IRPF_PCT,
  inflationPct: INFLATION_YOY_PCT,
})

// ── Alternativas para el que pone la plata ───────────────────────────────────────────────

export interface LenderAlternative {
  id: string
  name: string
  /** Rendimiento anual publicado, tal como lo publica la fuente. */
  yieldLabel: string
  currency: 'UYU' | 'USD' | 'UI' | 'variable'
  /** Riesgo de perder capital, en criollo. */
  risk: string
  liquidity: string
  /** Cobertura del Fondo de Garantía de Depósitos Bancarios. */
  copab: 'sí' | 'no'
  taxLabel: string
  source: string
  sourceLabel: string
  note?: string
}

export const LENDER_ALTERNATIVES: readonly LenderAlternative[] = Object.freeze([
  {
    id: 'plazo-fijo-uyu',
    name: 'Plazo fijo en pesos (BROU, e-BROU, 367 días o más)',
    yieldLabel: '5,50% nominal anual',
    currency: 'UYU',
    risk: 'Muy bajo: riesgo del banco, con seguro de depósitos.',
    liquidity: 'Inmovilizado hasta el vencimiento.',
    copab: 'sí',
    taxLabel: 'IRPF 2,5% (más de un año, moneda nacional, tasa fija)',
    source: 'https://www.brou.com.uy/documents/20182/112235/tasas-pf-personas.pdf',
    sourceLabel: 'Pizarra de plazo fijo BROU, vigencia 01/07/2026',
    note: 'En sucursal la misma colocación paga 4,13%. La pizarra e-BROU aplica sólo a personas físicas.',
  },
  {
    id: 'plazo-fijo-usd',
    name: 'Plazo fijo en dólares (BROU, e-BROU, 367 días o más)',
    yieldLabel: '2,80% anual',
    currency: 'USD',
    risk: 'Muy bajo: riesgo del banco, con seguro de depósitos.',
    liquidity: 'Inmovilizado hasta el vencimiento.',
    copab: 'sí',
    taxLabel: 'IRPF 12% a un año o menos; 7% a más de tres años',
    source: 'https://www.brou.com.uy/documents/20182/112235/tasas-pf-personas.pdf',
    sourceLabel: 'Pizarra de plazo fijo BROU, vigencia 01/07/2026',
  },
  {
    id: 'plazo-fijo-ui',
    name: 'Plazo fijo en UI (BROU, e-BROU, 367 días o más)',
    yieldLabel: '1,70% real anual',
    currency: 'UI',
    risk: 'Muy bajo: riesgo del banco, con seguro de depósitos.',
    liquidity: 'Inmovilizado hasta el vencimiento.',
    copab: 'sí',
    taxLabel: 'IRPF 7% (moneda nacional con cláusula de reajuste, más de un año)',
    source: 'https://www.brou.com.uy/documents/20182/112235/tasas-pf-personas.pdf',
    sourceLabel: 'Pizarra de plazo fijo BROU, vigencia 01/07/2026',
    note: 'El 1,70% es por encima de la inflación: es rendimiento real, no nominal.',
  },
  {
    id: 'nota-tesoro-ui',
    name: 'Nota del Tesoro en UI (licitación del 04/08/2026, serie 32)',
    yieldLabel: '2,98% real anual',
    currency: 'UI',
    risk: 'Riesgo soberano uruguayo (grado inversor). Riesgo de precio si vendés antes de 2036.',
    liquidity: 'Se puede vender en el mercado, con riesgo de precio.',
    copab: 'no',
    taxLabel: 'Exenta de IRPF',
    source:
      'https://deuda.mef.gub.uy/innovaportal/file/31304/6/reporte-de-deuda-soberana-agosto-2026.pdf',
    sourceLabel: 'Reporte de Deuda Soberana, MEF, agosto 2026',
    note: 'Es una tasa de corte de una licitación puntual, no una tasa disponible a demanda. La serie en pesos del 21/07/2026 cortó en 7,04% nominal.',
  },
  {
    id: 'lrm',
    name: 'Letras de Regulación Monetaria del BCU',
    yieldLabel: '5,9% a 84 días (corte del 12/02/2026)',
    currency: 'UYU',
    risk: 'Riesgo soberano uruguayo.',
    liquidity: 'Plazos cortos, de 28 a 350 días.',
    copab: 'no',
    taxLabel: 'Exentas de IRPF',
    source:
      'https://www.ambito.com/uruguay/las-tasas-las-lrm-perforan-el-6-mientras-siguen-captando-el-interes-del-mercado-un-dolar-debil-n6245214',
    sourceLabel: 'Ámbito, licitaciones del BCU',
    note: 'Cada licitación reserva un cupo del 20% para la modalidad no competitiva.',
  },
  {
    id: 'fondo-liquidez',
    name: 'Fondo de liquidez en pesos (cartera de LRM)',
    yieldLabel: '5,96% los últimos 12 meses; el propio fondo estima 4,50% para los 12 siguientes',
    currency: 'UYU',
    risk: 'Bajo: cartera de deuda del BCU, con riesgo de mercado.',
    liquidity: 'Rescate en días.',
    copab: 'no',
    taxLabel: 'Según el instrumento subyacente',
    source: 'https://api.gletir.com/Content/Attach/3444.pdf',
    sourceLabel: 'Factsheet Fondo Centenario Gestión de Liquidez, julio 2026',
    note: 'Los rendimientos publicados ya son netos de la comisión de administración (1,40% con IVA).',
  },
  {
    id: 'on-crowdfunding',
    name: 'Obligación negociable por plataforma de crowdfunding',
    yieldLabel: '8% anual en UI (emisión de Produits de France, octubre 2024)',
    currency: 'UI',
    risk: 'Riesgo de la empresa emisora. Esa emisión entró en default en enero de 2026.',
    liquidity: 'Negociable en la plataforma, hasta que se suspende la negociación.',
    copab: 'no',
    taxLabel: 'IRPF reducido si es emisión por suscripción pública con cotización bursátil',
    source:
      'https://www.ambito.com/uruguay/una-reconocida-empresa-gastronomica-no-pago-300-inversores-y-enfrenta-default-us-887000-n6242057',
    sourceLabel: 'Ámbito, 03/02/2026',
    note: 'Es otra licencia y otro régimen: crowdfunding es emisión de valores, no préstamo entre personas.',
  },
  {
    id: 'cheques',
    name: 'Compra de cheques diferidos (plataformas de descuento)',
    yieldLabel: 'TIR observada de 8% a 10% en dólares y ~18% en pesos',
    currency: 'variable',
    risk: 'Alto. Si el cheque rebota y no se recupera, la plataforma devuelve la comisión pero no el capital.',
    liquidity: 'Hasta el vencimiento del cheque.',
    copab: 'no',
    taxLabel: 'IRPF sobre el rendimiento',
    source: 'https://reddit.com/r/uruguay/comments/1vqrl0v/vale_la_pena_invertir_en_cheques/',
    sourceLabel: 'Análisis de un usuario en r/uruguay, 17/08/2026',
    note: 'Esta actividad no tiene registro ni normativa específica del BCU: es la más popular y la menos regulada.',
  },
  {
    id: 'p2p',
    name: 'Préstamo entre personas por plataforma inscripta (EAPPP)',
    yieldLabel: 'La tasa la elegís vos, dentro de los topes de usura',
    currency: 'UYU',
    risk: 'Alto y directo: si el deudor no paga, la pérdida es tuya. Prohibido mutualizar el riesgo.',
    liquidity: 'Nula hasta el vencimiento: el vale es “no a la orden”.',
    copab: 'no',
    taxLabel: 'IRPF 12% sobre el interés, sin agente de retención designado',
    source:
      'https://www.bcu.gub.uy/Acerca-de-BCU/Normativa/Documents/Reordenamiento%20de%20la%20Recopilaci%C3%B3n/Sistema%20Financiero/RNRCSF.pdf',
    sourceLabel: 'RNRCSF, Título XII y arts. 473.5 a 473.7',
  },
])

// ── Alternativas para el que pide la plata ───────────────────────────────────────────────

export interface BorrowerAlternative {
  id: string
  name: string
  kind: 'banco' | 'cooperativa' | 'administradora' | 'tarjeta' | 'estado' | 'p2p'
  /** Tasa efectiva anual publicada. */
  teaLabel: string
  /** True cuando la tasa publicada es "+ IVA". */
  plusIva: boolean
  requirement: string
  source: string
  sourceLabel: string
}

export const BORROWER_ALTERNATIVES: readonly BorrowerAlternative[] = Object.freeze([
  {
    id: 'brou-retencion',
    name: 'BROU, préstamo con retención',
    kind: 'banco',
    teaLabel: '16% a 28%',
    plusIva: true,
    requirement: 'Tasa preferencial sólo si cobrás el sueldo en el BROU. e-BROU baja unos puntos.',
    source:
      'https://www.brou.com.uy/documents/20182/22237/TASAS_VIGENTES_PRESTAMOS_PERSONAS.pdf/6ed06833-7c12-4f9f-8001-f7fb52f60a60',
    sourceLabel: 'BROU, tasas vigentes desde 01/03/2026',
  },
  {
    id: 'brou-sin-retencion',
    name: 'BROU, consumo sin retención',
    kind: 'banco',
    teaLabel: '23% a 31%',
    plusIva: true,
    requirement: 'Es el caso comparable con una financiera: sin descuento del sueldo.',
    source:
      'https://www.brou.com.uy/documents/20182/22237/TASAS_VIGENTES_PRESTAMOS_PERSONAS.pdf/6ed06833-7c12-4f9f-8001-f7fb52f60a60',
    sourceLabel: 'BROU, tasas vigentes desde 01/03/2026',
  },
  {
    id: 'itau',
    name: 'Itaú, préstamo a sola firma en pesos',
    kind: 'banco',
    teaLabel: '32% (3 a 12 meses) y 36% (18 a 48 meses)',
    plusIva: true,
    requirement: 'Además, tasa de control del sistema financiero y prestación complementaria.',
    source: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
    sourceLabel: 'Itaú, manual de tarifas, agosto 2026',
  },
  {
    id: 'santander-nomina',
    name: 'Santander, consumo nómina',
    kind: 'banco',
    teaLabel: '35,50% (hasta 12 cuotas) y 37,85% (13 a 60)',
    plusIva: false,
    requirement:
      'Sueldo acreditado o cuota debitada en el banco. Seguro de vida incluido en la tasa.',
    source:
      'https://www.santander.com.uy/sites/default/files/2026-05/Cartilla-Conta%20con%20eso-Consumo_Mayo2026.pdf',
    sourceLabel: 'Santander, cartilla de mayo 2026',
  },
  {
    id: 'santander-mercado-abierto',
    name: 'Santander, “mercado abierto”',
    kind: 'banco',
    teaLabel: '70% (13 a 36 cuotas)',
    plusIva: false,
    requirement: 'El mismo banco, para el que no le acredita el sueldo: casi el doble de tasa.',
    source:
      'https://www.santander.com.uy/sites/default/files/2026-05/Cartilla-Conta%20con%20eso-Consumo_Mayo2026.pdf',
    sourceLabel: 'Santander, cartilla de mayo 2026',
  },
  {
    id: 'anda',
    name: 'ANDA, préstamo personal',
    kind: 'cooperativa',
    teaLabel: '27,40% (1 a 10 cuotas) y 32,20% (12 o más)',
    plusIva: true,
    requirement: 'Último recibo de sueldo, 6 meses de antigüedad laboral y cédula vigente.',
    source: 'https://anda.com.uy/prestamos/',
    sourceLabel: 'ANDA, tarifas vigentes agosto 2026',
  },
  {
    id: 'oca-pronto',
    name: 'OCA, Pronto! y FUCAC (tarjeta, sobre saldos)',
    kind: 'administradora',
    teaLabel: '63,00% a 64,91%',
    plusIva: false,
    requirement: 'Requisitos mínimos. Es el escalón siguiente al banco.',
    source: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/eras09dmn.pdf',
    sourceLabel: 'BCU, tasas informativas de julio 2026',
  },
  {
    id: 'creditel-italcred',
    name: 'Creditel, Italcred, Pass Card, Retop, Créditos Directos',
    kind: 'administradora',
    teaLabel: '108% a 123,12%',
    plusIva: false,
    requirement: 'El techo del mercado regulado para quien no califica en ningún otro lado.',
    source: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/eras09dmn.pdf',
    sourceLabel: 'BCU, tasas informativas de julio 2026',
  },
  {
    id: 'tarjetas-bancos',
    name: 'Tarjeta de crédito de banco, financiación en pesos',
    kind: 'tarjeta',
    teaLabel: '31,16% (HSBC) a 64,15% (Scotiabank)',
    plusIva: false,
    requirement: 'La tasa media de referencia publicada por el BCU es 80,72%.',
    source: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/eras09dmn.pdf',
    sourceLabel: 'BCU, tasas informativas de julio 2026',
  },
  {
    id: 'ande',
    name: 'ANDE, Crédito Centros Pyme',
    kind: 'estado',
    teaLabel: 'hasta 18% en pesos; hasta 6% en UI o dólares',
    plusIva: false,
    requirement:
      'Ser cliente de un Centro Pyme con asesoramiento previo. Se otorga por microfinancieras adheridas.',
    source: 'https://www.ande.org.uy/accede-a-un-credito/item/credito-centros-pymes-sos-pymes.html',
    sourceLabel: 'ANDE, programa vigente hasta el 31/12/2026',
  },
  {
    id: 'p2p',
    name: 'Plataforma de préstamos entre personas',
    kind: 'p2p',
    teaLabel: '50% a 130% de TEA, según lo declarado a la prensa',
    plusIva: false,
    requirement: 'Ser residente. El techo lo pone la ley de usura, no la plataforma.',
    source:
      'https://www.elobservador.com.uy/cafe-y-negocios/el-banco-central-autorizo-la-primera-plataforma-dedicada-canalizar-el-prestamo-dinero-personas-asi-funcionara-n6053067',
    sourceLabel: 'El Observador, 05/08/2026',
  },
])

// ── La historia uruguaya ─────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  date: string
  /** Etiqueta corta para la línea de tiempo. */
  label: string
  detail: string
  tone: 'neutral' | 'good' | 'bad'
  source?: string
}

export const P2P_TIMELINE: readonly TimelineEvent[] = Object.freeze([
  {
    date: '2015–2017',
    label: 'Cuatro plataformas sin licencia',
    detail:
      'Inversionate (operativa desde fines de 2015, unos 300 usuarios y retorno proyectado cercano al 47%), Prezzta (préstamos de $5.000 a $50.000, comisión total del 10%, TIR proyectada de 65% a diciembre de 2016), TuTasa y Socius operan sin regulación específica. Hoy ninguna de las cuatro sigue en el rubro.',
    tone: 'neutral',
    source:
      'https://www.elobservador.com.uy/nota/el-negocio-de-los-uber-financieros-en-uruguay-201764500',
  },
  {
    date: 'Abril de 2016',
    label: 'Los bancos van al BCU',
    detail:
      'La Asociación de Bancos Privados se reúne con jerarcas del Banco Central, incluido el superintendente Juan Pedro Cantera, por la competencia no regulada de estas plataformas. Todavía no existe ninguna norma.',
    tone: 'neutral',
    source:
      'https://www.elobservador.com.uy/nota/tutasa-prestamos-entre-personas-sin-bancos-de-por-medio-201642515200',
  },
  {
    date: 'Mayo de 2016',
    label: 'TuTasa se arma como fideicomiso',
    detail:
      'Se lanza con un fondo de contingencia para amortiguar la mora y con la plataforma administrando cobranza y pagos. Dos años después, ese modelo completo queda prohibido por la Circular 2.307.',
    tone: 'neutral',
    source:
      'https://www.elobservador.com.uy/nota/tutasa-prestamos-entre-personas-sin-bancos-de-por-medio-201642515200',
  },
  {
    date: 'Junio de 2017',
    label: '“No tiene fácil solución”',
    detail:
      'El presidente del BCU, Mario Bergara, dice que regular estas plataformas “está en la agenda, pero es un desafío que no tiene fácil solución”.',
    tone: 'neutral',
    source:
      'https://www.elobservador.com.uy/nota/el-negocio-de-los-uber-financieros-en-uruguay-201764500',
  },
  {
    date: '9 de agosto de 2018',
    label: 'Proyecto a consulta',
    detail:
      'La Superintendencia publica el proyecto normativo y recibe comentarios del mercado hasta el 7 de setiembre. La versión final terminará siendo más permisiva que el borrador en varios puntos clave.',
    tone: 'neutral',
    source:
      'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Documents/Proyectos%20Normativos/Proyecto-Normativo-P2P-090818.pdf',
  },
  {
    date: '28 de noviembre de 2018',
    label: 'Nace la licencia (Circular 2.307)',
    detail:
      'Resolución del 21 de noviembre, vigencia con la publicación en el Diario Oficial. Se crea el Título XII de la Recopilación y el registro de EAPPP, con cuatro meses de plazo para que las empresas ya instaladas pidieran la inscripción.',
    tone: 'good',
    source:
      'https://www.bcu.gub.uy/Acerca-de-BCU/Normativa/Documents/Reordenamiento%20de%20la%20Recopilaci%C3%B3n/Sistema%20Financiero/RNRCSF.pdf',
  },
  {
    date: '17 de diciembre de 2018',
    label: '“Más que una regulación es una fumigación”',
    detail:
      'La Cámara Uruguaya de Fintech, el diputado Rodrigo Goñi y el entonces presidente de la ANII, Fernando Brum, piden al Parlamento que la norma se deje sin efecto: sostienen que impone cargas que no se adecuan a la realidad del negocio.',
    tone: 'bad',
    source:
      'https://www.paymentmedia.com/news-4095-uruguay-solicitan-al-banco-central-dejar-sin-efecto-regulacin-fintech.html',
  },
  {
    date: '2019–2025',
    label: 'La licencia sin usar',
    detail:
      'No hay noticia pública de ninguna plataforma inscripta en ese período. Prezzta abandona el P2P y convierte su tecnología en software para empresas que dan crédito. Los sitios de Inversionate y Socius dejan de resolver; el dominio de TuTasa queda estacionado.',
    tone: 'bad',
  },
  {
    date: '4 de enero de 2024',
    label: 'Crowder, pero por la otra puerta',
    detail:
      'La Superintendencia autoriza a Crowder como plataforma de financiamiento colectivo. Es otra licencia y otro régimen: emisión de valores, no préstamos. Sigue siendo la única inscripta en ese registro, con cuatro emisores registrados.',
    tone: 'neutral',
    source:
      'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Empresas-Administradoras-de-Plataformas-de-Financiamiento-Colectivo.aspx',
  },
  {
    date: '31 de enero de 2026',
    label: 'El primer default del financiamiento colectivo',
    detail:
      'Produits de France (Saint Germain, Piazza Italia) no paga la cuota de una obligación negociable de 5.240.000 UI al 8% anual colocada entre unos 300 inversores por Crowder. El 6 de febrero se decreta el concurso voluntario.',
    tone: 'bad',
    source:
      'https://www.ambito.com/uruguay/una-reconocida-empresa-gastronomica-no-pago-300-inversores-y-enfrenta-default-us-887000-n6242057',
  },
  {
    date: '5 de junio de 2026',
    label: 'El BCU amplía el perímetro',
    detail:
      'Tras el desastre de los fondos ganaderos, la Superintendencia exige declaración jurada a cualquiera que convoque a invertir, aun sin emitir valores. Aclara expresamente que presentarla “no implica la inscripción en ningún Registro”.',
    tone: 'good',
    source: 'https://www.bcu.gub.uy/Comunicados/seggco26116.pdf',
  },
  {
    date: '5 de agosto de 2026',
    label: 'Aparece la primera plataforma',
    detail:
      'El Observador informa que Prestapagos obtuvo el aval para operar como la primera Empresa Administradora de Plataformas de Préstamos entre Personas del país, tras un trámite de un año y medio, y que empezaría a operar “en los próximos 10 días”.',
    tone: 'good',
    source:
      'https://www.elobservador.com.uy/cafe-y-negocios/el-banco-central-autorizo-la-primera-plataforma-dedicada-canalizar-el-prestamo-dinero-personas-asi-funcionara-n6053067',
  },
  {
    date: '1º de octubre de 2026',
    label: 'Entra el régimen de autenticación reforzada',
    detail:
      'Por la Circular 2.497, las plataformas P2P quedan alcanzadas por las exigencias de seguridad de instrumentos electrónicos: doble factor para el acceso, para las solicitudes de préstamo no presenciales y para el cambio de datos sensibles.',
    tone: 'good',
    source: 'https://www.bcu.gub.uy/Circulares/seggci2497.pdf',
  },
])

// ── Qué salió mal en Uruguay (y qué era cada cosa) ───────────────────────────────────────

export type CaseKind =
  | 'cesion-de-creditos'
  | 'fondo-ganadero'
  | 'crowdfunding'
  | 'descuento-de-cheques'

export interface UyCase {
  id: string
  name: string
  years: string
  kind: CaseKind
  /** Qué le vendían al que ponía la plata. */
  pitch: string
  outcome: string
  /** Cifras verificadas, con su fuente. */
  numbers: string
  /** Estaba inscripta como plataforma de préstamos entre personas. Ninguna lo estaba. */
  wasEappp: false
  source: string
  sourceLabel: string
}

export const KIND_LABELS: Readonly<Record<CaseKind, string>> = Object.freeze({
  'cesion-de-creditos': 'Cesión de créditos',
  'fondo-ganadero': 'Capitalización ganadera',
  crowdfunding: 'Crowdfunding (emisión de valores)',
  'descuento-de-cheques': 'Descuento de cheques',
})

export const UY_CASES: readonly UyCase[] = Object.freeze([
  {
    id: 'wenance',
    name: 'Wenance Uruguay',
    years: '2020–2024',
    kind: 'cesion-de-creditos',
    pitch:
      'Comprabas cartera de préstamos al consumo (marca WELP) mediante cesiones de crédito, con simuladores de renta por monto, plazo y moneda.',
    outcome:
      'El BCU concluyó que en los hechos prometía capital y una tasa fija a plazo, asumiendo el riesgo de crédito y el cambiario: “transformación de plazos y de moneda, lo que se asimila a una operativa de captación de depósitos”. Ordenó el cese de la intermediación financiera no autorizada y la multó. La empresa no estaba registrada en la Superintendencia.',
    numbers:
      'US$ 9,6 millones en 438 operaciones entre el 1/3/2020 y el 31/5/2021, según cifras de la propia empresa. Multa de 13 millones de UI. En el concurso uruguayo se verificaron unos 560 acreedores por cerca de US$ 20 millones frente a un activo de unos US$ 1,9 millones.',
    wasEappp: false,
    source: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Resoluciones_SSF/RR-SSF-2024-168.pdf',
    sourceLabel: 'Resolución RR-SSF-2024-168 del BCU (02/04/2024)',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    years: '2023',
    kind: 'cesion-de-creditos',
    pitch:
      'Se presentaba como una fintech que conectaba empresas de crédito con inversores particulares e institucionales, que adquirían la calidad de acreedores por contratos de cesión de derechos.',
    outcome:
      'Denuncia penal en noviembre de 2023 por captar capital afirmando haber cedido derechos de crédito inexistentes. La Cámara Uruguaya de Fintech aclaró que la empresa no integraba la organización, pese a que decía lo contrario.',
    numbers: 'US$ 1.000.000 aportados por unos 70 inversores, según la denuncia.',
    wasEappp: false,
    source:
      'https://www.elobservador.com.uy/nota/denuncian-otra-estafa-que-involucra-a-una-fintech-esta-vez-se-trata-de-la-uruguaya-mercury-2023111418190',
    sourceLabel: 'El Observador, 15/11/2023',
  },
  {
    id: 'conexion-ganadera',
    name: 'Conexión Ganadera',
    years: '2024–2026',
    kind: 'fondo-ganadero',
    pitch: 'Capitalización ganadera con una renta fija de al menos 7% anual en dólares.',
    outcome:
      'Colapsó en enero de 2025. Hay cuatro imputados por estafa y lavado de activos, y en agosto de 2026 el caso seguía sin juicio oral. La sindicatura concluyó que con la masa activa no se puede devolver ni siquiera el capital invertido.',
    numbers:
      'Pasivo de US$ 387 millones contra un activo de US$ 115 millones: un rojo de US$ 272 millones, confirmado en la verificación de créditos de julio de 2026.',
    wasEappp: false,
    source:
      'https://www.infobae.com/america/america-latina/2026/07/23/la-mayor-estafa-ganadera-de-uruguay-dejo-un-rojo-de-usd-272-millones-justicia-confirmo-cifras-de-conexion-ganadera/',
    sourceLabel: 'Infobae, 23/07/2026',
  },
  {
    id: 'republica-ganadera',
    name: 'República Ganadera',
    years: '2023–2026',
    kind: 'fondo-ganadero',
    pitch: 'Compra de ganado con renta, con aportes típicos de US$ 25.000 por inversor.',
    outcome:
      'Concurso y, en julio de 2026, un fallo del Juzgado de lo Contencioso Administrativo condenó al Banco Central y al Ministerio de Ganadería a indemnizar a cuatro inversores por omisión en sus deberes de control: el BCU se limitó a ordenar el cese de la publicidad sin clausurar la operativa ni denunciar penalmente.',
    numbers:
      'Más de 1.400 damnificados y una deuda de unos US$ 95 millones. La condena al Estado fue de US$ 25.000 por cada uno de los cuatro demandantes.',
    wasEappp: false,
    source:
      'https://www.elobservador.com.uy/nacional/estafas-fondos-ganaderos-justicia-condeno-al-banco-central-y-al-ministerio-ganaderia-omision-controles-las-empresas-inversiones-lo-que-abre-la-puerta-mas-demandas-n6052484',
    sourceLabel: 'El Observador, 30/07/2026',
  },
  {
    id: 'larrarte',
    name: 'Grupo Larrarte',
    years: '2024–2025',
    kind: 'fondo-ganadero',
    pitch: 'El primer fondo ganadero en caer. La fiscalía lo calificó como estafa piramidal.',
    outcome:
      'Jairo Larrarte fue condenado el 5 de septiembre de 2025, por proceso abreviado, a tres años y ocho meses de prisión efectiva por estafa continuada, apropiación indebida y libramiento de cheques sin fondo.',
    numbers: 'Unos US$ 12 millones y alrededor de 170 inversores, según El Observador.',
    wasEappp: false,
    source:
      'https://www.montevideo.com.uy/Noticias/Fiscalia-confirmo-proceso-abreviado-y-Jairo-Larrarte-fue-condenado-a-tres-anos-de-prision-uc935409',
    sourceLabel: 'Montevideo Portal, 05/09/2025',
  },
  {
    id: 'produits-de-france',
    name: 'Produits de France (Saint Germain, Piazza Italia)',
    years: '2024–2026',
    kind: 'crowdfunding',
    pitch:
      'Obligación negociable de 5.240.000 UI al 8% anual en UI, a 54 meses, colocada por Crowder entre unos 300 inversores en octubre de 2024.',
    outcome:
      'Dejó de pagar el 31 de enero de 2026, después de tres o cuatro cuotas trimestrales. Crowder avisó al BCU y suspendió la negociación. El 6 de febrero se decretó el concurso voluntario y en la asamblea de tenedores la propuesta de ejecutar la garantía obtuvo 48,5%: no alcanzó la mayoría.',
    numbers: 'Unos US$ 887.000 comprometidos, según Ámbito.',
    wasEappp: false,
    source:
      'https://www.elobservador.com.uy/economia-y-empresas/inversores-produits-france-no-lograron-mayoria-ejecutar-la-garantia-incumplimiento-pago-n6034873',
    sourceLabel: 'El Observador, 19/02/2026',
  },
  {
    id: 'cheques',
    name: 'Plataformas de descuento de cheques',
    years: '2025–2026',
    kind: 'descuento-de-cheques',
    pitch:
      'Comprás un cheque diferido con descuento y cobrás el nominal al vencimiento. La TIR aparente supera con holgura a cualquier plazo fijo.',
    outcome:
      'Si el cheque rebota, la plataforma intenta recuperarlo un plazo acotado y, si no lo consigue, devuelve la comisión pero no el capital. Hay denunciantes públicos que no lograron cobrar. La actividad no tiene registro ni normativa específica del BCU.',
    numbers:
      'TIR observada de 8% a 10% en dólares y cerca de 18% en pesos, muy por debajo del 30–35% que circula en los testimonios.',
    wasEappp: false,
    source: 'https://reddit.com/r/uruguay/comments/1vqrl0v/vale_la_pena_invertir_en_cheques/',
    sourceLabel: 'Análisis en r/uruguay, 17/08/2026',
  },
])

// ── Qué pasó con el P2P en el resto del mundo ────────────────────────────────────────────

export interface WorldCase {
  country: string
  what: string
  numbers: string
  source: string
  sourceLabel: string
}

export const WORLD_CASES: readonly WorldCase[] = Object.freeze([
  {
    country: 'China',
    what: 'El regulador liquidó el sector completo entre 2016 y 2020. No quedó ninguna plataforma operando.',
    numbers:
      'De unas 2.600 plataformas simultáneamente activas en 2015 (5.970 registradas en 2017) a cero a mediados de noviembre de 2020. Más de 5.400 habían colapsado o entrado en problemas, con más de 2 millones de inversores afectados, y quedaron sin recuperar más de 800.000 millones de yuanes (US$ 115.000 millones). El mayor fraude, Ezubao, captó 59.800 millones de yuanes de más de 900.000 inversores; su fundador recibió cadena perpetua.',
    source: 'https://www.chinadaily.com.cn/a/202011/30/WS5fc4b574a31024ad0ba98e57.html',
    sourceLabel: 'China Daily, 30/11/2020 · SCMP, 14/08/2020',
  },
  {
    country: 'Reino Unido',
    what: 'El país que inventó el modelo lo abandonó para el inversor minorista en cuatro años.',
    numbers:
      'Lendy y FundingSecure entraron en administración en 2019; RateSetter, con 750.000 usuarios y £4.000 millones originados, se vendió a Metro Bank por £2,5 millones iniciales; Zopa cerró su P2P en diciembre de 2021 tras 16 años; Funding Circle cerró su plataforma minorista en 2022. La FCA endureció las reglas en 2019 con un tope de inversión del 10% de los activos invertibles para minoristas nuevos.',
    source: 'https://www.fca.org.uk/news/press-releases/fca-confirms-new-rules-p2p-platforms',
    sourceLabel: 'FCA, PS19/14 (04/06/2019)',
  },
  {
    country: 'Reino Unido (rendimientos)',
    what: 'El rendimiento prometido y el que quedó no fueron el mismo número.',
    numbers:
      'Funding Circle recortó el objetivo de su cuenta “Balanced” de 7,2% a 6–7% en junio de 2018. Su propia tabla de cosechas terminó proyectando 4,0%–4,6% neto para los préstamos de 2017, contra 7,1%–7,2% de la cosecha 2012.',
    source: 'https://corporate.fundingcircle.com/media/press-releases/q3-2019-update/',
    sourceLabel: 'Funding Circle, Q3 2019 Update',
  },
  {
    country: 'Estados Unidos',
    what: 'LendingClub cerró su plataforma minorista al convertirse en banco.',
    numbers:
      'Dejó de vender Notes el 31 de diciembre de 2020: “no es económicamente práctico seguir ofreciéndolas” bajo un marco bancario. Dos años antes, la SEC había sancionado a su gestora y a sus ex ejecutivos por más de US$ 4,2 millones por usar activos de un fondo en beneficio de la matriz y ajustar los rendimientos reportados.',
    source:
      'https://www.crowdfundinsider.com/2020/10/167680-lendingclub-files-8-k-indicating-it-will-cease-offering-and-selling-retail-notes/',
    sourceLabel: 'Crowdfund Insider, 07/10/2020',
  },
  {
    country: 'Estonia y Letonia',
    what: 'Racimo de colapsos con sospecha de préstamos inventados.',
    numbers:
      'Kuetzal y Envestio se evaporaron en enero de 2020 y fueron declaradas en quiebra en junio, con investigaciones penales: Kuetzal afectó a más de 550 personas y Envestio a más de 1.800 denunciantes, con €33 millones de fondos de prestamistas. Los inversores de Grupeer tuvieron que juntar hasta €275.000 sólo para pagar abogados.',
    source:
      'https://alternativecreditinvestor.com/2020/06/10/envestio-and-kuetzal-declared-bankrupt/',
    sourceLabel: 'Alternative Credit Investor, 10/06/2020',
  },
  {
    country: 'América Latina',
    what: 'El formato que sobrevive es el que presta con capital propio, no el que intermedia entre personas.',
    numbers:
      'Brasil creó en 2018 dos figuras: la SCD (presta de su balance) y la SEP (préstamo entre personas, con tope de R$ 15.000 por acreedor frente a un mismo deudor). A fines de 2019 había 11 SCD contra 4 SEP; en mayo de 2026, Nexoos anunció que pedirá cancelar su licencia de SEP. En Argentina, el BCRA creó un registro en 2021 con la misma regla uruguaya: la plataforma no puede asumir el riesgo de crédito.',
    source: 'https://www.nexoos.com.br/',
    sourceLabel: 'Aviso de Nexoos, 18/05/2026 · El Cronista, 25/11/2021',
  },
])

/** Rendimiento neto anual realizado que publica Mintos, el mayor marketplace europeo. */
export const MINTOS_NET_RETURNS: readonly { year: number; pct: number }[] = Object.freeze([
  { year: 2015, pct: 12.0 },
  { year: 2016, pct: 12.6 },
  { year: 2017, pct: 11.6 },
  { year: 2018, pct: 12.1 },
  { year: 2019, pct: 11.0 },
  { year: 2020, pct: 4.3 },
  { year: 2021, pct: 6.1 },
  { year: 2022, pct: -1.2 },
  { year: 2023, pct: 10.4 },
  { year: 2024, pct: 9.3 },
])

// ── Antes de prestar / antes de pedir ────────────────────────────────────────────────────

export interface ChecklistItem {
  title: string
  detail: string
}

export const LENDER_CHECKLIST: readonly ChecklistItem[] = Object.freeze([
  {
    title: 'Verificá la inscripción, no el logo',
    detail:
      'La plataforma tiene que estar inscripta en el Registro de la Superintendencia de Servicios Financieros y publicar esa comunicación de inscripción (art. 484.1). El buscador de registros del BCU es la fuente; un sello en la web no lo es. Y ojo: inscripción no es autorización previa, ni supervisión de cada préstamo.',
  },
  {
    title: 'Buscá la morosidad promedio publicada',
    detail:
      'La norma la exige mes a mes. Sin ese número, la tasa que te ofrecen no es un rendimiento: es un techo teórico. Si la plataforma es nueva y todavía no tiene historia, asumí que no sabés cuál va a ser tu mora.',
  },
  {
    title: 'Sumá la comisión adentro de la tasa',
    detail:
      'Lo que cobra la plataforma integra la tasa implícita a efectos de usura (art. 338) y sale de tu rendimiento. Pedí que te muestren la tasa implícita, que la norma obliga a exhibir.',
  },
  {
    title: 'Diversificá aunque no quieras',
    detail:
      'El tope de UI 25.000 por deudor te obliga a repartir en al menos cuatro personas para llegar al máximo de UI 100.000. Con carteras chicas, un solo incobrable se lleva el interés de todo el año.',
  },
  {
    title: 'Asumí que no podés salir antes',
    detail:
      'El vale es nominativo y “no a la orden”: no hay mercado secundario ni recompra. La plata queda inmovilizada hasta que el deudor pague.',
  },
  {
    title: 'Calculá cuánto cuesta cobrar',
    detail:
      'Si tenés que ejecutar, el costo del abogado y del juicio no depende del tamaño del crédito. Por debajo de cierto monto, iniciar el proceso cuesta más que lo que reclamás.',
  },
  {
    title: 'Acordate del IRPF',
    detail:
      'El interés paga 12% de IRPF (Categoría I, “restantes rentas”), y las plataformas P2P no figuran entre los agentes de retención designados por el Decreto 148/007. Si el deudor es una persona física, el impuesto lo liquidás vos.',
  },
  {
    title: 'No hay COPAB ni fondo de garantía',
    detail:
      'El seguro de depósitos cubre depósitos en bancos y cooperativas de intermediación financiera. Un préstamo no es un depósito. Además, mutualizar el riesgo entre prestamistas está expresamente prohibido.',
  },
])

export const BORROWER_CHECKLIST: readonly ChecklistItem[] = Object.freeze([
  {
    title: 'Compará contra el techo legal, no contra la oferta',
    detail:
      'Para un préstamo de consumo chico en pesos, el tope de usura vigente es 130,93% y para uno de UI 10.000 o más (unos $ 66.350) baja a 63,58%. Una tasa “dentro de lo permitido” puede seguir siendo carísima.',
  },
  {
    title: 'Fijate si podés bajar de escalón',
    detail:
      'Con el sueldo acreditado o con autorización de descuento, los topes caen a 32%–38% y los bancos publican tasas de 16% a 31% más IVA. El precio del crédito en Uruguay lo define el requisito que podés cumplir, no la urgencia.',
  },
  {
    title: 'Pedí la tasa implícita con comisión adentro',
    detail:
      'La plataforma está obligada a mostrarte la tasa implícita incluyendo lo que ella cobra y la tasa máxima legal aplicable a tu operación. Si no aparece, falta la mitad del precio.',
  },
  {
    title: 'Preguntá qué pasa si te atrasás',
    detail:
      'El interés de mora tiene su propio tope, más alto. Y el que te presta es un particular con un vale a su nombre: la negociación no es con un call center, es con una persona que puede ejecutar el documento.',
  },
])

// ── Preguntas frecuentes ─────────────────────────────────────────────────────────────────

export interface FaqItem {
  question: string
  answer: string
}

export const P2P_FAQ: readonly FaqItem[] = Object.freeze([
  {
    question: '¿Qué pasa si la persona a la que le presté no me paga?',
    answer:
      'La pérdida es tuya. La norma obliga a la plataforma a advertírtelo: sos vos quien asume el riesgo de pérdida total o parcial del capital, y la administradora “sólo se limita a aproximar a las partes”. No hay fondo de garantía —está prohibido constituirlo— ni seguro de depósitos. Te queda el vale firmado a tu nombre y la vía judicial, con su costo.',
  },
  {
    question: '¿El Banco Central garantiza mi plata si la plataforma está registrada?',
    answer:
      'No. El registro acredita que la empresa cumplió requisitos formales de inscripción; no supervisa la calidad de cada préstamo ni responde por los incumplimientos. El depósito de UI 50.000 que la plataforma mantiene en el BCU es para atender sus obligaciones con el propio Banco Central, no para cubrir a los prestamistas.',
  },
  {
    question: '¿Cuánto puedo prestar y cuánto puede deberme una persona?',
    answer:
      'Un prestamista particular puede tener hasta UI 100.000 colocados en una plataforma, con un máximo de UI 25.000 en un mismo deudor. Si tiene activos financieros por más de UI 4.000.000, el total sube a UI 1.000.000. Del otro lado, una persona física no puede deber más de UI 100.000 dentro de una misma plataforma, y una empresa más de UI 1.000.000.',
  },
  {
    question: '¿La plataforma puede cobrar por mí si el deudor se atrasa?',
    answer:
      'Puede hacer tareas vinculadas a la gestión de cobro de los créditos vencidos, pero tiene prohibido operar los pagos y cobros y comprarte el crédito vencido. Es decir: puede ayudarte con la gestión, no puede reemplazarte ni sacarte el problema de encima.',
  },
  {
    question: '¿Puedo vender mi préstamo si necesito la plata antes?',
    answer:
      'No. El documento debe ser nominativo a favor del prestamista y llevar la cláusula “no a la orden”, lo que impide transmitirlo por endoso. No hay mercado secundario: la colocación es ilíquida hasta el vencimiento.',
  },
  {
    question: '¿Cuánto paga de impuestos el interés que gano?',
    answer:
      'IRPF Categoría I al 12%, la tasa de “restantes rentas”. Las tasas rebajadas de 0,5% a 7% son para depósitos bancarios y para títulos emitidos por suscripción pública con cotización bursátil, que no es el caso de un préstamo entre particulares. Las plataformas P2P no están designadas como agentes de retención, así que si el deudor es una persona física el impuesto lo declarás y pagás vos.',
  },
  {
    question: '¿Hay un tope de tasa o puedo cobrar lo que quiera?',
    answer:
      'Hay tope. La Ley 18.212 de usura alcanza a los préstamos entre particulares, y las comisiones de la plataforma se computan dentro de la tasa implícita. Para consumo en pesos sin autorización de descuento los topes vigentes son 130,93% (créditos chicos) y 63,58% (de UI 10.000 en adelante). Pasarse no es sólo una multa: caduca el derecho a cobrar los intereses y hay delito de usura con pena de seis meses a cuatro años.',
  },
  {
    question: '¿Es lo mismo que el crowdfunding de Crowder?',
    answer:
      'No, y el propio BCU lo aclaró por escrito: el préstamo entre personas “no debe confundirse con otros mecanismos de financiación no basados en préstamos sino en la emisión de valores”. El P2P se rige por la Circular 2.307 y la Recopilación del sistema financiero, con inscripción registral; el crowdfunding se rige por la Ley 19.820 y la Circular 2.377, con autorización previa de la Superintendencia y emisión de valores de oferta pública.',
  },
  {
    question: '¿Ya hubo plataformas de préstamos entre personas en Uruguay?',
    answer:
      'Sí, antes de que existiera la licencia. Entre 2015 y 2017 operaron al menos cuatro sin regulación específica —Inversionate, Prezzta, TuTasa y Socius— y ninguna sigue en el rubro: Prezzta convirtió su tecnología en software para empresas de crédito y los sitios de las otras dejaron de funcionar. La licencia se creó en noviembre de 2018 y no hay noticia pública de ninguna inscripción hasta 2026.',
  },
  {
    question: '¿Qué rendimiento es razonable esperar?',
    answer:
      'La referencia sin riesgo hoy está entre 2,3% y 3,0% real anual en Notas del Tesoro en UI, exentas de IRPF, y entre 0% y 1% real neto en un plazo fijo bancario en pesos. Todo lo que supere eso es el precio del riesgo de crédito que estás tomando. La cuenta que importa no es la tasa pactada sino lo que queda después de la mora, la comisión y el impuesto.',
  },
  {
    question: '¿Le conviene a alguien pedir prestado por esta vía?',
    answer:
      'Depende de qué escalón tenés disponible. Si podés acreditar el sueldo en un banco, las tasas van de 16% a 38% y el P2P difícilmente compita. La franja donde tiene sentido es la de quien hoy paga 108% a 123% en una administradora de crédito, o la de quien queda afuera de todo. La plataforma dice apuntar justamente al préstamo informal.',
  },
  {
    question: '¿Mi préstamo queda registrado en el clearing o en la Central de Riesgos?',
    answer:
      'La Central de Riesgos del BCU tiene una lista tasada de informantes —bancos, cooperativas, casas financieras, administradoras de crédito de mayores activos, entre otras— en la que las plataformas de préstamos entre personas no figuran. Lo que sí deben hacer es reportar trimestralmente a la Superintendencia información sobre los préstamos otorgados. Las bases privadas de informes comerciales son otra cosa y se rigen por sus propios contratos.',
  },
])

// ── Fuentes ──────────────────────────────────────────────────────────────────────────────

export interface P2PSourceLink {
  label: string
  url: string
  kind: 'norma' | 'bcu' | 'prensa' | 'mercado' | 'internacional'
}

export const P2P_SOURCES: readonly P2PSourceLink[] = Object.freeze([
  {
    label:
      'Recopilación de Normas de Regulación y Control del Sistema Financiero (Título XII y arts. 248.1, 338, 371, 473.5–473.7, 484.1, 661.16, 719–720.3)',
    url: 'https://www.bcu.gub.uy/Acerca-de-BCU/Normativa/Documents/Reordenamiento%20de%20la%20Recopilaci%C3%B3n/Sistema%20Financiero/RNRCSF.pdf',
    kind: 'norma',
  },
  {
    label:
      'BCU — Lista de requerimientos: Empresas Administradoras de Plataformas para Préstamos entre Personas',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Lista-de-requerimientos-detalle.aspx?itemid=Empresas+Administradoras+de+Plataformas+para+Pr%C3%A9stamos+entre+Personas',
    kind: 'bcu',
  },
  {
    label:
      'BCU / SSF — Bases y lineamientos para una futura regulación de plataformas de préstamos entre personas',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Comunicados/SSF-Lineamientos-PtoP.pdf',
    kind: 'bcu',
  },
  {
    label: 'BCU — Circular 2.497 (autenticación reforzada, vigencia 01/10/2026)',
    url: 'https://www.bcu.gub.uy/Circulares/seggci2497.pdf',
    kind: 'norma',
  },
  {
    label: 'BCU — Tasas medias de interés y topes máximos (trimestre abril–junio 2026)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/tasas-medias-interes.pdf',
    kind: 'bcu',
  },
  {
    label: 'BCU — Tasas informativas de tarjetas de crédito y administradoras (julio 2026)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/eras09dmn.pdf',
    kind: 'bcu',
  },
  {
    label: 'BCU — Comunicación 2026/116: declaración jurada de quienes convocan a invertir',
    url: 'https://www.bcu.gub.uy/Comunicados/seggco26116.pdf',
    kind: 'bcu',
  },
  {
    label: 'BCU — Recomendaciones y advertencias al público (Portal del Usuario Financiero)',
    url: 'https://usuariofinanciero.bcu.gub.uy/recomendaciones-y-advertencias/',
    kind: 'bcu',
  },
  {
    label: 'Ley 18.212 de tasas de interés y usura (texto vigente)',
    url: 'https://www.impo.com.uy/bases/leyes/18212-2007',
    kind: 'norma',
  },
  {
    label: 'Texto Ordenado 2023, Título 7 (IRPF), arts. 37 y 38',
    url: 'https://www.impo.com.uy/bases/todgi-2023/7-2024',
    kind: 'norma',
  },
  {
    label: 'Decreto 148/007, art. 39 (agentes de retención de rendimientos de capital mobiliario)',
    url: 'https://www.impo.com.uy/bases/decretos-reglamentarios-todgi/148-2007',
    kind: 'norma',
  },
  {
    label: 'COPAB — Preguntas frecuentes sobre el seguro de depósitos',
    url: 'https://www.copab.org.uy/innovaportal/v/1197/1/web/acceso-a-preguntas-frecuentes.html',
    kind: 'bcu',
  },
  {
    label:
      'El Observador — El Banco Central autorizó a la primera plataforma dedicada a canalizar el préstamo de dinero entre personas (05/08/2026)',
    url: 'https://www.elobservador.com.uy/cafe-y-negocios/el-banco-central-autorizo-la-primera-plataforma-dedicada-canalizar-el-prestamo-dinero-personas-asi-funcionara-n6053067',
    kind: 'prensa',
  },
  {
    label: 'El Observador — El negocio de los “Uber financieros” en Uruguay (04/06/2017)',
    url: 'https://www.elobservador.com.uy/nota/el-negocio-de-los-uber-financieros-en-uruguay-201764500',
    kind: 'prensa',
  },
  {
    label: 'Resolución RR-SSF-2024-168 — cese e infracción de Wenance Uruguay S.A.',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Resoluciones_SSF/RR-SSF-2024-168.pdf',
    kind: 'bcu',
  },
  {
    label: 'MEF / Unidad de Gestión de Deuda — Reporte de Deuda Soberana (agosto 2026)',
    url: 'https://deuda.mef.gub.uy/innovaportal/file/31304/6/reporte-de-deuda-soberana-agosto-2026.pdf',
    kind: 'mercado',
  },
  {
    label: 'BROU — Pizarra de plazo fijo (vigencia 01/07/2026)',
    url: 'https://www.brou.com.uy/documents/20182/112235/tasas-pf-personas.pdf',
    kind: 'mercado',
  },
  {
    label: 'FCA — PS19/14, nuevas reglas para plataformas P2P (Reino Unido)',
    url: 'https://www.fca.org.uk/news/press-releases/fca-confirms-new-rules-p2p-platforms',
    kind: 'internacional',
  },
  {
    label: 'Mintos — Rendimiento histórico neto por año',
    url: 'https://www.mintos.com/en/statistics/historical-performance/',
    kind: 'internacional',
  },
  {
    label: 'China Daily — El número de plataformas P2P chinas cayó a cero (30/11/2020)',
    url: 'https://www.chinadaily.com.cn/a/202011/30/WS5fc4b574a31024ad0ba98e57.html',
    kind: 'internacional',
  },
])

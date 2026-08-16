// app/utils/monotributoInvoicing.ts
// Datos de /facturar-en-monotributo-uruguay: cómo documenta sus ventas un contribuyente de
// Monotributo o de Monotributo Social MIDES, y qué le sale cada camino.
//
// POR QUÉ EXISTE: la pregunta llega tal cual desde r/uruguay —«abrí una empresa bajo Monotributo
// Social MIDES y ahora hago el trámite de facturación; ¿hay forma de evitar el costo de imprimir
// el talonario, que ronda los $1.500? ¿Puedo emitir facturas digitales? ¿O el talonario físico es
// obligatorio?»—. El sitio tenía `companyTypes.ts` (QUÉ empresa abrir) pero nada sobre la etapa
// siguiente: ya la abriste, ahora hay que documentar cada venta.
//
// LA TESIS DE LA PÁGINA, y es contraintuitiva: la pregunta viene con la premisa invertida. Quien
// pregunta asume que el papel es la obligación y que lo electrónico sería la escapatoria barata.
// Es al revés. El Monotributo y el Monotributo Social MIDES están EXCEPTUADOS de la obligación de
// emitir CFE (la universalización que rige desde el 1/1/2025 alcanza a los contribuyentes de IVA,
// y el monotributista no lo es). El talonario NO es un castigo: es el régimen que le corresponde,
// y es el camino barato. Pasarse a factura electrónica es legal y voluntario, pero AGREGA costos
// —certificado digital con vigencia de 1 a 2 años + abono mensual del facturador— sin quitar el
// papel del todo, porque el emisor electrónico igual necesita comprobantes de contingencia.
//
// EL DATO QUE DA VUELTA LA CUENTA, y que casi nadie sabe: existe un crédito fiscal de hasta 80 UI
// por mes que subsidia el abono del facturador electrónico, y ese beneficio EXCLUYE expresamente
// al Monotributo y al Monotributo Social MIDES (DGI lo dice con esas palabras). O sea: el
// monotributista que se pasa a electrónico paga la tarifa entera del mercado, sin el descuento que
// sí reciben la pequeña empresa de IVA mínimo y la empresa que recién inicia. Es el único
// contribuyente chico al que la factura electrónica le sale a precio de lista.
//
// LO SEGUNDO QUE IMPORTA, porque es lo accionable: el trámite ante DGI no cuesta nada. La
// autorización para imprimir se pide por internet y «no tiene costo» (gub.uy), y en los hechos la
// pide la propia imprenta del registro. Los $1.500 no son un impuesto ni una tasa: son 100% precio
// de imprenta, y por lo tanto son NEGOCIABLES y comparables. Todo lo que la página puede hacer por
// quien pregunta está de ese lado: menos vías, tirada chica, tres presupuestos, y entender que
// la constancia dura 15 días (pedir presupuestos DESPUÉS de tramitarla es la forma más común de
// tener que tramitarla de nuevo).
//
// LO QUE NO SE PUBLICA ACÁ:
//   - Un precio "de mercado" del talonario. Ninguna imprenta uruguaya publica lista; los $1.500
//     son la cotización que recibió una persona, no un promedio verificable. La calculadora pide
//     TU presupuesto en vez de inventar uno.
//   - Un precio del certificado digital ni del abono del facturador. Correo Uruguayo publica los
//     productos (Firma Digital EMPRESA, 1 año; AVANZADA, 2 años) pero no las tarifas, y los
//     facturadores cotizan por volumen. Son entradas de la calculadora, no constantes.
//   - Ningún "no pasa nada si no documentás". No documentar es infracción formal del Código
//     Tributario y no es un consejo que este sitio vaya a dar.
//   - Ninguna promesa de subsidio: no existe un programa que pague el talonario. Los apoyos de
//     MIDES/ANDE son al emprendimiento, con sus propias bases, y se enlazan como lo que son.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-16:
//   - DGI, «Quiénes están obligados a ser emisores electrónicos» (publicación del 4/12/2024): a
//     partir del 1/1/2025 son emisores electrónicos todos los contribuyentes de IVA, incluso de
//     IVA mínimo, y la lista de excepciones incluye textualmente a los contribuyentes de
//     Monotributo, de Monotributo Social MIDES y del Aporte Social Único de PPL.
//     https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/estan-obligados-emisores-electronicos
//   - DGI, «Documentación de las operaciones por parte de los contribuyentes»: sólo los
//     contribuyentes exceptuados pueden usar comprobantes en papel, y para eso deben solicitar la
//     constancia para impresión de documentación.
//     https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/documentacion-operaciones-parte-contribuyentes
//   - DGI, «Crédito por la contratación de servicios de soluciones de facturación electrónica
//     (UI 80)»: tope de 80 UI mensuales ($514 en 2026), vigente por servicios prestados hasta el
//     31/12/2026, y la exclusión textual: «Este beneficio no aplica a contribuyentes de Monotributo
//     y Monotributo Social Mides».
//     https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/credito-contratacion-servicios-soluciones-facturacion-electronica-ui-80
//   - IMPO, Resolución DGI 688/992 (documentación tradicional): mínimo dos vías, numeración
//     correlativa, datos preimpresos, pie de imprenta, constancia de impresión con validez de 15
//     días, y la excepción de documentar individualmente las operaciones de consumo final por
//     debajo del monto que DGI fija cada año, con comprobante global diario.
//     https://www.impo.com.uy/bases/resoluciones-dgi-interes-general/688-1992/1
//   - IMPO, Resolución DGI 798/025, artículos 2 y 3: los comprobantes de los contribuyentes del
//     Título 6 (Monotributo Social MIDES) llevan la leyenda «MONOTRIBUTO SOCIAL MIDES» en recuadro
//     no menor a 4 cm x 1 cm y caracteres no menores a 3 mm, no pueden mencionar el IVA, y pueden
//     establecer un solo domicilio fiscal. Que la norma regule sus CFE prueba que el régimen los
//     admite como emisores VOLUNTARIOS.
//     https://www.impo.com.uy/bases/resoluciones-dgi-originales/798-2025
//   - DGI/gub.uy, trámite «Solicitud de autorización para impresión de documentación por
//     internet»: «No tiene costo», lo cursa la imprenta inscripta en el registro web.
//     https://www.gub.uy/tramites/solicitud-autorizacion-impresion-documentacion-internet
//   - DGI, «Imprentas incluidas en el Registro de imprentas web» (nómina en PDF).
//     https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/imprentas-incluidas-registro-imprentas-web
//   - DGI, «Tope de ingresos anuales - Monotributo Social MIDES» (2026): $1.175.537 unipersonal,
//     $1.959.229 sociedad de hecho.
//     https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tope-ingresos-anuales-monotributo-social-mides
//   - BPS, «Monotributo social Mides ley 18.874»: aporte gradual 25% / 50% / 75% en 36 meses y
//     100% a partir del mes 37; importes vigentes enero 2026.
//     https://www.bps.gub.uy/6667/monotributo-social-mides-ley-18874.html

export interface Figure {
  value: number
  label: string
  /** URL de la fuente primaria (DGI / BPS / IMPO). */
  source: string
  /** Fecha ISO (YYYY-MM-DD) en que se contrastó el valor contra esa fuente. */
  verifiedAt: string
}

export const MONO_INVOICING_VERIFIED_AT = '2026-08-16'

const DGI_OBLIGADOS =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/estan-obligados-emisores-electronicos'
const DGI_DOCUMENTACION =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/documentacion-operaciones-parte-contribuyentes'
const DGI_CREDITO_80UI =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/credito-contratacion-servicios-soluciones-facturacion-electronica-ui-80'
const DGI_TRAMITE_IMPRESION =
  'https://www.gub.uy/tramites/solicitud-autorizacion-impresion-documentacion-internet'
const DGI_REGISTRO_IMPRENTAS =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/imprentas-incluidas-registro-imprentas-web'
const DGI_TOPE_MIDES =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tope-ingresos-anuales-monotributo-social-mides'
const IMPO_688 = 'https://www.impo.com.uy/bases/resoluciones-dgi-interes-general/688-1992/1'
const IMPO_798_025 = 'https://www.impo.com.uy/bases/resoluciones-dgi-originales/798-2025'
const BPS_MIDES = 'https://www.bps.gub.uy/6667/monotributo-social-mides-ley-18874.html'
const DGI_EFACTURA = 'https://www.efactura.dgi.gub.uy/principal/Informacion_General?es='

const V = MONO_INVOICING_VERIFIED_AT

const fig = (value: number, label: string, source: string, verifiedAt = V): Figure => ({
  value,
  label,
  source,
  verifiedAt,
})

export const FIGURES = {
  // --- El costo que el monotributista NO recibe ---
  creditoFacturaElectronicaUi: fig(
    80,
    'Crédito fiscal mensual por contratar facturación electrónica (UI)',
    DGI_CREDITO_80UI
  ),
  creditoFacturaElectronicaUyu: fig(
    514,
    'Equivalente en pesos del crédito de 80 UI durante 2026',
    DGI_CREDITO_80UI
  ),

  // --- Requisitos formales del talonario (Res. DGI 688/992 y 798/025) ---
  constanciaVigenciaDias: fig(
    15,
    'Días de validez de la constancia para impresión de documentación',
    IMPO_688
  ),
  viasMinimas: fig(2, 'Vías mínimas de cada comprobante en papel (original + copia)', IMPO_688),
  numeracionDigitos: fig(
    6,
    'Dígitos de la numeración correlativa antes de cambiar de serie',
    IMPO_688
  ),
  leyendaRecuadroLargoCm: fig(4, 'Largo mínimo del recuadro de la leyenda (cm)', IMPO_798_025),
  leyendaRecuadroAnchoCm: fig(1, 'Ancho mínimo del recuadro de la leyenda (cm)', IMPO_798_025),
  leyendaCaracteresMm: fig(3, 'Altura mínima de los caracteres de la leyenda (mm)', IMPO_798_025),
  domiciliosFiscales: fig(
    1,
    'Domicilios fiscales que puede establecer el monotributista social aunque trabaje en varios lugares',
    IMPO_798_025
  ),

  // --- Contexto económico del régimen (BPS / DGI, vigencia 2026) ---
  aporteMidesAnio1SinFonasa: fig(
    659,
    'Monotributo Social MIDES: aporte mensual del primer año (25%), sin FONASA — enero 2026',
    BPS_MIDES
  ),
  aporteMidesPlenoSinFonasa: fig(
    2637,
    'Monotributo Social MIDES: aporte mensual pleno (100%), sin FONASA — enero 2026',
    BPS_MIDES
  ),
  gradualidadMeses: fig(36, 'Meses de aporte gradual antes de llegar al 100%', BPS_MIDES),
  topeAnualUnipersonal: fig(
    1_175_537,
    'Tope de ingresos anuales 2026 — Monotributo Social MIDES unipersonal',
    DGI_TOPE_MIDES
  ),
  topeAnualSociedad: fig(
    1_959_229,
    'Tope de ingresos anuales 2026 — Monotributo Social MIDES sociedad de hecho',
    DGI_TOPE_MIDES
  ),
} as const satisfies Record<string, Figure>

/** La leyenda que va en el recuadro, según el régimen. */
export const LEYENDAS = [
  { regime: 'Monotributo', text: 'MONOTRIBUTO' },
  { regime: 'Monotributo Social MIDES', text: 'MONOTRIBUTO SOCIAL MIDES' },
] as const

// ---------------------------------------------------------------------------
// El veredicto y los mitos
// ---------------------------------------------------------------------------

export const CORE_ANSWER =
  'No, el talonario no es un costo que se pueda esquivar pasándose a factura electrónica: se esquiva al revés. ' +
  'El Monotributo y el Monotributo Social MIDES están exceptuados de emitir comprobantes fiscales electrónicos, ' +
  'así que el papel es el régimen que te corresponde y es el camino barato. Emitir CFE es posible y es legal, ' +
  'pero es voluntario y suma costos permanentes (certificado digital + abono mensual) que en tu caso nadie subsidia.'

export interface Myth {
  claim: string
  reality: string
  sourceLabel: string
  source: string
}

export const MYTHS: readonly Myth[] = [
  {
    claim:
      '«Desde 2025 la factura electrónica es obligatoria para todos, el talonario ya no sirve».',
    reality:
      'La obligación alcanza a los contribuyentes de IVA, incluso los de IVA mínimo. El monotributista no es contribuyente de IVA: DGI lo enumera entre las excepciones, junto al Monotributo Social MIDES y al Aporte Social Único de PPL. El talonario en papel sigue siendo documentación válida.',
    sourceLabel: 'DGI — Quiénes están obligados a ser emisores electrónicos',
    source: DGI_OBLIGADOS,
  },
  {
    claim: '«Si me paso a electrónico me ahorro el gasto del talonario».',
    reality:
      'Cambiás un gasto de imprenta que se repite cada tanto por dos gastos que no paran: el certificado digital (vigencia de 1 a 2 años, hay que renovarlo) y el abono mensual del facturador. Y no te desprendés del papel del todo: el emisor electrónico necesita comprobantes de contingencia preimpresos para cuando el sistema no está disponible.',
    sourceLabel: 'DGI — Información general de e-Factura',
    source: DGI_EFACTURA,
  },
  {
    claim: '«Hay un crédito fiscal que paga la facturación electrónica, así que me sale gratis».',
    reality:
      'Ese crédito existe —hasta 80 UI por mes, $514 en 2026, prorrogado por servicios prestados hasta el 31/12/2026— pero DGI excluye expresamente del beneficio a los contribuyentes de Monotributo y de Monotributo Social MIDES. Sos justamente el contribuyente que paga la tarifa entera.',
    sourceLabel: 'DGI — Crédito de hasta 80 UI',
    source: DGI_CREDITO_80UI,
  },
  {
    claim: '«El trámite de la autorización en DGI también se paga».',
    reality:
      'No. La solicitud de autorización para impresión de documentación por internet «no tiene costo», y la cursa la imprenta inscripta en el registro web de DGI. Lo que pagás es exclusivamente la impresión: por eso el precio se negocia y se compara.',
    sourceLabel: 'gub.uy — Trámite de autorización de impresión',
    source: DGI_TRAMITE_IMPRESION,
  },
  {
    claim: '«Puedo imprimir las facturas en casa o hacerlas en una planilla».',
    reality:
      'No, si vas por documentación tradicional. Los comprobantes tienen que salir de una imprenta autorizada, con numeración correlativa, datos preimpresos y pie de imprenta, al amparo de una constancia que DGI emite para esa tirada.',
    sourceLabel: 'IMPO — Resolución DGI 688/992',
    source: IMPO_688,
  },
] as const

// ---------------------------------------------------------------------------
// Los dos caminos
// ---------------------------------------------------------------------------

export interface InvoicingRoute {
  id: 'talonario' | 'cfe'
  title: string
  status: string
  detail: string
  costs: readonly string[]
  pros: readonly string[]
  cons: readonly string[]
  verdict: string
}

export const ROUTES: readonly InvoicingRoute[] = [
  {
    id: 'talonario',
    title: 'Talonario en papel',
    status: 'El que te corresponde',
    detail:
      'Comprobantes preimpresos por una imprenta del registro de DGI, amparados en una constancia de impresión que se pide por internet y no cuesta nada. Es la documentación tradicional que la norma reserva justamente para los contribuyentes exceptuados de emitir CFE.',
    costs: [
      'Impresión: es el único costo real, y es precio de imprenta (no hay tasa ni impuesto).',
      'Trámite de autorización ante DGI: $0.',
      'Sin cuotas mensuales, sin certificado digital, sin renovaciones.',
    ],
    pros: [
      'Gasto único que dura mientras te duren los comprobantes.',
      'No depende de internet, ni de luz, ni de un abono al día.',
      'No exige certificado digital ni postulación ante DGI.',
    ],
    cons: [
      'Hay que llevar el talonario encima y escribir a mano.',
      'Cada tirada nueva pide una constancia nueva.',
      'Algún cliente empresa puede pedirte CFE por comodidad de su propio sistema.',
    ],
    verdict:
      'Para un emprendimiento que arranca y factura poco, es el camino más barato por lejos.',
  },
  {
    id: 'cfe',
    title: 'Factura electrónica (CFE), voluntaria',
    status: 'Legal, pero opcional y más cara',
    detail:
      'Podés postularte como emisor electrónico aunque no estés obligado. La propia Resolución DGI 798/025 prevé qué leyenda llevan los CFE de un contribuyente de Monotributo Social MIDES, así que el régimen contempla el caso. Requiere certificado digital, software autorizado y postulación ante DGI.',
    costs: [
      'Certificado digital de un proveedor habilitado (Abitab, Correo Uruguayo o Antel), con vigencia de 1 a 2 años y renovación.',
      'Abono del facturador, generalmente mensual y por volumen de comprobantes.',
      'Sin el crédito de 80 UI: DGI excluye del beneficio al Monotributo y al Monotributo Social MIDES.',
      'Igual conviene tener comprobantes de contingencia en papel.',
    ],
    pros: [
      'Emitís desde el celular o la computadora, sin talonario encima.',
      'Queda todo registrado y numerado por el sistema.',
      'Le simplifica la vida al cliente que trabaja con CFE.',
    ],
    cons: [
      'Dos costos recurrentes en lugar de uno eventual.',
      'Una vez habilitado, la regla pasa a ser documentar todo con CFE: el papel queda sólo para contingencias justificadas.',
      'Más pasos de alta: certificado, usuario, formulario y códigos de autorización.',
    ],
    verdict:
      'Tiene sentido si tu cliente te exige CFE o si el volumen ya justifica el abono. Como forma de ahorrar el talonario, no: sale más.',
  },
] as const

// ---------------------------------------------------------------------------
// El trámite y las palancas de costo
// ---------------------------------------------------------------------------

export interface Step {
  n: number
  title: string
  detail: string
}

export const TALONARIO_STEPS: readonly Step[] = [
  {
    n: 1,
    title: 'Confirmá que estás exceptuado',
    detail:
      'Si tu RUT está en Monotributo o en Monotributo Social MIDES, no sos contribuyente de IVA y por lo tanto no estás obligado a emitir CFE. Ese es el permiso para usar documentación tradicional.',
  },
  {
    n: 2,
    title: 'Pedí presupuestos ANTES de tramitar nada',
    detail:
      'La constancia de impresión vale 15 días. Si la tramitás primero y después salís a comparar precios, es probable que se te venza y haya que pedirla de nuevo. Primero el precio, después la constancia.',
  },
  {
    n: 3,
    title: 'Elegí una imprenta del registro web de DGI',
    detail:
      'DGI publica la nómina de imprentas habilitadas para recibir autorizaciones pedidas por internet. Si la imprenta no está en esa lista, no puede imprimir tu documentación.',
  },
  {
    n: 4,
    title: 'La imprenta pide la autorización por internet',
    detail:
      'El trámite «Solicitud de autorización para impresión de documentación por internet» no tiene costo. En los hechos lo cursa la imprenta con tu RUT; vos no pagás nada por ese paso.',
  },
  {
    n: 5,
    title: 'Revisá la prueba antes de que impriman',
    detail:
      'Tienen que ir preimpresos tu nombre, RUC y domicilio fiscal arriba a la izquierda; el tipo de documento y la numeración correlativa arriba a la derecha; el recuadro de «consumo final» cuando corresponda; el pie con los datos de la imprenta; y el recuadro con la leyenda de tu régimen.',
  },
  {
    n: 6,
    title: 'Guardá todas las copias',
    detail:
      'El mínimo son dos vías: una se la das al cliente y la otra queda con vos. Las operaciones chicas de consumo final que no documentás una por una se respaldan con un comprobante global del día, y ese también se archiva.',
  },
] as const

export interface Lever {
  title: string
  detail: string
  saving: string
}

/** Las palancas reales para bajar el precio, ordenadas por cuánto mueven la aguja. */
export const COST_LEVERS: readonly Lever[] = [
  {
    title: 'Tres presupuestos, no uno',
    detail:
      'Ninguna imprenta uruguaya publica lista de precios de talonarios: se cotiza caso por caso. Como el trámite ante DGI es gratis, el 100% de lo que pagás es precio de imprenta, y eso se compara. Pedí el mismo trabajo a tres imprentas del registro.',
    saving: 'Es la palanca más grande: el mismo trabajo se cotiza muy distinto.',
  },
  {
    title: 'Dos vías, no tres',
    detail:
      'La norma pide un mínimo de dos vías: original para el cliente y copia para vos. Si te cotizan triplicado «por las dudas», estás pagando papel y armado que no te exige nadie.',
    saving: 'Menos papel por juego.',
  },
  {
    title: 'Pedí el precio de la tirada chica y el de la grande',
    detail:
      'No hay una cantidad mínima legal. Como buena parte del costo de imprenta es armado y no papel, a veces el doble de juegos cuesta apenas un poco más. Compará siempre costo por comprobante, no precio total.',
    saving: 'Puede bajar mucho el costo por comprobante.',
  },
  {
    title: 'Impresión sobria',
    detail:
      'Lo que la norma exige son los datos preimpresos, la numeración y el recuadro de la leyenda. El logo a color, el papel especial y el tamaño grande son gusto, no requisito.',
    saving: 'Se paga sólo lo que la norma pide.',
  },
  {
    title: 'Documentá el mínimo que la norma pide',
    detail:
      'Las ventas a consumo final por debajo del monto que DGI fija cada año no necesitan comprobante individual: se respaldan con un comprobante global diario. Menos comprobantes emitidos es menos talonario consumido.',
    saving: 'El mismo talonario dura más.',
  },
] as const

export interface QuoteChannel {
  title: string
  detail: string
  url?: string
  linkLabel?: string
}

/**
 * «¿Conocen alguna imprenta más barata?» es la pregunta que cierra casi todos los hilos, y la
 * respuesta honesta no es un nombre: ninguna imprenta uruguaya publica lista de precios y el
 * mismo trabajo se cotiza distinto según ciudad, tirada y semana. Recomendar «X es la barata»
 * sería inventar. Lo que sí se puede publicar es el camino corto para averiguarlo.
 */
export const QUOTE_CHANNELS: readonly QuoteChannel[] = [
  {
    title: 'La nómina oficial, para saber a quién podés pedirle',
    detail:
      'DGI publica el listado de imprentas incluidas en el registro web: son las habilitadas a recibir por internet la autorización para imprimir tu documentación. Si la imprenta no está ahí, no te puede imprimir el talonario.',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/imprentas-incluidas-registro-imprentas-web',
    linkLabel: 'Ver la nómina de DGI',
  },
  {
    title: 'Una referencia de precio antes de llamar',
    detail:
      'Varias imprentas publican el talonario de facturas con precio a la vista en Mercado Libre. No siempre es el precio más bajo del mercado, pero te da un piso contra el cual comparar el presupuesto que te pasen por teléfono o WhatsApp.',
    url: 'https://listado.mercadolibre.com.uy/talonario-facturas-dgi',
    linkLabel: 'Buscar talonarios con precio publicado',
  },
  {
    title: 'Pedí el MISMO trabajo a tres, por escrito',
    detail:
      'Mandá siempre el mismo pedido: cantidad de juegos, dos vías, tamaño, una sola tinta, y la leyenda de tu régimen. Si cada presupuesto viene con distinta cantidad o distintas vías, no estás comparando precios sino formatos.',
  },
  {
    title: 'Preguntá también fuera de tu barrio',
    detail:
      'La autorización se pide por internet y el talonario se puede enviar, así que no estás atado a la imprenta de la esquina. Las de ciudades chicas suelen cotizar más barato el trabajo simple.',
  },
] as const

export interface SupportProgram {
  name: string
  what: string
  caveat: string
  url: string
}

/** Apoyos que existen de verdad. Ninguno paga el talonario: conviene decirlo. */
export const SUPPORT_PROGRAMS: readonly SupportProgram[] = [
  {
    name: 'Apoyo a emprendimientos productivos — MIDES',
    what: 'Propuestas departamentales de fortalecimiento (gestión, producción, comercialización y acceso a recursos) para emprendimientos de personas en situación de vulnerabilidad socioeconómica.',
    caveat:
      'Es apoyo al emprendimiento, con sus propios cupos y bases: no es un reintegro del gasto de imprenta.',
    url: 'https://guiaderecursos.mides.gub.uy/80856/emprendedores',
  },
  {
    name: 'Semilla ANDE',
    what: 'Aporte económico no reembolsable para poner en marcha o fortalecer emprendimientos en todo el país.',
    caveat:
      'Se postula por convocatoria y evalúa el proyecto; no cubre un gasto administrativo suelto.',
    url: 'https://www.uruguayemprendedor.uy/programa-de-apoyo/semilla-ande-ande/',
  },
] as const

// ---------------------------------------------------------------------------
// Calculadora: qué te sale cada camino
// ---------------------------------------------------------------------------

export interface InvoicingCostInput {
  /** Lo que te cotizó la imprenta, en pesos. */
  talonarioPrecio: number
  /** Juegos (comprobantes) que trae esa cotización. */
  juegos: number
  /** Comprobantes que estimás emitir por mes. */
  comprobantesPorMes: number
  /** Precio del certificado digital, en pesos. */
  certificadoPrecio: number
  /** Meses de vigencia del certificado (habitualmente 12 o 24). */
  certificadoMeses: number
  /** Abono mensual del facturador, en pesos. */
  abonoMensual: number
}

export interface InvoicingCostResult {
  /** Meses que dura la tirada al ritmo declarado. `null` si no emitís comprobantes. */
  mesesQueDura: number | null
  talonarioMensual: number
  talonarioPorComprobante: number
  cfeMensual: number
  cfePorComprobante: number | null
  /** Diferencia mensual a favor del camino más barato (siempre >= 0). */
  diferenciaMensual: number
  /** Diferencia proyectada a 12 meses. */
  diferenciaAnual: number
  cheaper: 'talonario' | 'cfe' | 'empate'
}

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

/**
 * Compara el costo mensual de las dos rutas. No hay defaults escondidos: los precios los pone
 * quien usa la página, porque ni las imprentas ni los facturadores publican tarifas.
 */
export function compareInvoicingCost(input: InvoicingCostInput): InvoicingCostResult {
  const precio = positive(input.talonarioPrecio)
  const juegos = positive(input.juegos)
  const porMes = positive(input.comprobantesPorMes)
  const certPrecio = positive(input.certificadoPrecio)
  const certMeses = positive(input.certificadoMeses)
  const abono = positive(input.abonoMensual)

  const talonarioPorComprobante = juegos > 0 ? precio / juegos : 0
  const mesesQueDura = porMes > 0 && juegos > 0 ? juegos / porMes : null
  const talonarioMensual = talonarioPorComprobante * porMes

  const cfeMensual = (certMeses > 0 ? certPrecio / certMeses : 0) + abono
  const cfePorComprobante = porMes > 0 ? cfeMensual / porMes : null

  const diferenciaMensual = Math.abs(cfeMensual - talonarioMensual)
  const cheaper =
    Math.round(cfeMensual) === Math.round(talonarioMensual)
      ? 'empate'
      : cfeMensual < talonarioMensual
        ? 'cfe'
        : 'talonario'

  return {
    mesesQueDura,
    talonarioMensual,
    talonarioPorComprobante,
    cfeMensual,
    cfePorComprobante,
    diferenciaMensual,
    diferenciaAnual: diferenciaMensual * 12,
    cheaper,
  }
}

// ---------------------------------------------------------------------------
// FAQ y fuentes
// ---------------------------------------------------------------------------

export interface Faq {
  question: string
  short: string
  answer: string
}

export const FAQ: readonly Faq[] = [
  {
    question: '¿El Monotributo Social MIDES está obligado a facturar electrónicamente?',
    short: 'No.',
    answer:
      'No. La obligación que rige desde el 1° de enero de 2025 alcanza a los contribuyentes de IVA, incluso a los de IVA mínimo. DGI enumera entre las excepciones a los contribuyentes de Monotributo, de Monotributo Social MIDES y del Aporte Social Único de personas privadas de libertad. Podés documentar con talonario en papel sin ningún permiso especial.',
  },
  {
    question: '¿Puedo igual emitir facturas electrónicas si quiero?',
    short: 'Sí, es voluntario.',
    answer:
      'Sí. Quien está exceptuado puede postularse igual como emisor electrónico. De hecho la Resolución DGI 798/025 define qué leyenda deben llevar los comprobantes electrónicos de un contribuyente de Monotributo Social MIDES. Necesitás certificado digital de un proveedor habilitado, software autorizado por DGI y hacer la postulación. Lo que no vas a lograr con eso es gastar menos.',
  },
  {
    question: '¿Por qué la factura electrónica me sale más cara que a otras empresas chicas?',
    short: 'Porque el crédito de 80 UI te excluye.',
    answer:
      'Existe un crédito fiscal de hasta 80 UI mensuales ($514 durante 2026) que subsidia el abono del facturador y que la pequeña empresa de IVA mínimo recibe descontado directamente del precio. DGI aclara que ese beneficio no aplica a contribuyentes de Monotributo ni de Monotributo Social MIDES. Pagás tarifa de lista.',
  },
  {
    question: '¿Cuánto cuesta el trámite en DGI para imprimir el talonario?',
    short: 'Nada.',
    answer:
      'Cero. La «Solicitud de autorización para impresión de documentación por internet» no tiene costo, y en la práctica la cursa la imprenta inscripta en el registro web de DGI usando tu RUT. Todo lo que pagás va a la imprenta, que es precio de mercado y se puede negociar.',
  },
  {
    question: '¿Hay algún subsidio que cubra el talonario?',
    short: 'No existe uno específico.',
    answer:
      'No hay un programa que reintegre el costo de imprimir comprobantes. Lo que existe son apoyos al emprendimiento —las propuestas de fortalecimiento de MIDES y las convocatorias de ANDE— que se postulan por sus propias bases. Si tu presupuesto es el problema, la palanca concreta es comparar imprentas y pedir la tirada más chica.',
  },
  {
    question: '¿Cuántas copias tiene que tener cada comprobante?',
    short: 'Dos como mínimo.',
    answer:
      'La documentación tradicional se emite en un mínimo de dos vías: una queda con el cliente y la otra con vos. Si te ofrecen triplicado, es papel adicional que la norma no te exige.',
  },
  {
    question: '¿Tengo que hacer una boleta por cada venta chica?',
    short: 'No siempre.',
    answer:
      'Las ventas a consumo final que no superan el monto que DGI fija cada año quedan exceptuadas de documentarse una por una, pero hay que emitir un comprobante global diario que respalde todo lo que no se documentó individualmente, y conservarlo. No es «no documentar»: es documentar junto.',
  },
  {
    question: '¿Qué leyenda tiene que ir en mis comprobantes?',
    short: 'La de tu régimen, en recuadro.',
    answer:
      '«MONOTRIBUTO SOCIAL MIDES» si estás en ese régimen, en un recuadro no menor a 4 cm de largo por 1 cm de ancho y caracteres de al menos 3 mm de alto. Puede ir preimpreso. Tus comprobantes no pueden mencionar el IVA ni decir que estás al día con ese impuesto, porque no sos contribuyente de IVA.',
  },
  {
    question: '¿Cuánto tiempo tengo para imprimir después de pedir la constancia?',
    short: '15 días.',
    answer:
      'La constancia para impresión tiene una validez de quince días. Por eso conviene cerrar el precio con la imprenta antes de que se pida la autorización: si se vence, hay que pedirla otra vez.',
  },
  {
    question: 'Si vendo a una empresa o al Estado, ¿me pueden exigir CFE?',
    short: 'Te lo pueden pedir.',
    answer:
      'Tu comprobante en papel es válido y tu cliente puede recibirlo. Pero algunos compradores trabajan con sistemas que sólo procesan CFE y te lo van a pedir por comodidad propia. Ahí sí la decisión de pasarte a electrónico deja de ser sobre el costo: es sobre no perder ese cliente.',
  },
] as const

export interface Source {
  label: string
  url: string
}

export const SOURCES: readonly Source[] = [
  { label: 'DGI — Quiénes están obligados a ser emisores electrónicos', url: DGI_OBLIGADOS },
  {
    label: 'DGI — Documentación de las operaciones por parte de los contribuyentes',
    url: DGI_DOCUMENTACION,
  },
  {
    label: 'DGI — Crédito por servicios de facturación electrónica (hasta 80 UI)',
    url: DGI_CREDITO_80UI,
  },
  {
    label: 'gub.uy — Solicitud de autorización para impresión de documentación por internet',
    url: DGI_TRAMITE_IMPRESION,
  },
  {
    label: 'DGI — Imprentas incluidas en el Registro de imprentas web',
    url: DGI_REGISTRO_IMPRENTAS,
  },
  { label: 'IMPO — Resolución DGI 688/992 (documentación tradicional)', url: IMPO_688 },
  {
    label: 'IMPO — Resolución DGI 798/025 (leyendas de Monotributo Social MIDES)',
    url: IMPO_798_025,
  },
  { label: 'DGI — Tope de ingresos anuales del Monotributo Social MIDES', url: DGI_TOPE_MIDES },
  { label: 'BPS — Monotributo Social MIDES, ley 18.874', url: BPS_MIDES },
  { label: 'DGI e-Factura — Información general del régimen de CFE', url: DGI_EFACTURA },
] as const

export const DISCLAIMER =
  'Esto es información general contrastada con DGI, BPS e IMPO, no asesoramiento contable. Los montos de imprenta, certificados y abonos los pone cada proveedor y cambian.'

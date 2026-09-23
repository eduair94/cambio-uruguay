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
const BPS_LEY_19942 = 'https://www.bps.gub.uy/18051/monotributo-ley-19942.html'
const BPS_LEY_19942_PDF =
  'https://www.bps.gub.uy/bps/file/18051/8/monotributo-ley-19.942---2026.pdf'
const BPS_LEY_18083 = 'https://www.bps.gub.uy/6668/monotributo-ley-18083.html'
const BPS_TOPES_2026 = 'https://www.bps.gub.uy/23987/'
const BPS_APORTACION = 'https://www.bps.gub.uy/10444/aportacion-de-monotributo.html'
const BPS_VALORES = 'https://www.bps.gub.uy/5478/valores-actuales.html'
const BPS_SUSPENSION = 'https://www.bps.gub.uy/18106/suspension-del-registro.html'
const BPS_REINICIO = 'https://www.bps.gub.uy/22794/'
const BPS_CLAUSURA_UNIPERSONAL = 'https://www.bps.gub.uy/20137/'
const BPS_INACTIVAR = 'https://www.bps.gub.uy/10193/inactivar-empresas.html'
const BPS_FACILIDADES = 'https://www.bps.gub.uy/11408/'
const BPS_PLANES_PAGO = 'https://www.bps.gub.uy/11409/planes-de-pago.html'
const BPS_PRESTADOR = 'https://www.bps.gub.uy/16772/cambio-de-prestador-de-salud.html'
const BPS_VENCIMIENTOS = 'https://www.bps.gub.uy/24165/vencimientos-de-monotributo.html'
const BPS_VENCIMIENTOS_MIDES =
  'https://www.bps.gub.uy/24166/vencimientos-de-monotributo-social-mides.html'
const BPS_MIDES_SUSPENSION = 'https://www.bps.gub.uy/23989/suspension-del-registro.html'
const BPS_MIDES_INACTIVIDAD = 'https://www.bps.gub.uy/22378/'
const BPS_MIDES_INFO = 'https://www.bps.gub.uy/10450/informacion-general.html'
const BPS_INFO_GENERAL = 'https://www.bps.gub.uy/23988/informacion-general.html'
const DGI_MONOTRIBUTO =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/monotributo'
const DGI_DEJA_CUMPLIR =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/pasa-empresa-deja-cumplir-condiciones-para-monotributista'
const DGI_VOLVER =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/condiciones-para-empresa-deja-regimen-monotributo-pueda-volver'
const DGI_IVA_MINIMO_CUOTA =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/cuota-iva-minimo-valores-vigentes'
const DGI_IVA_MINIMO_MONTO =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/monto-pagar-del-iva-minimo'
const DGI_IVA_MINIMO_TOPE =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tope-ingresos-anuales-para-pequenas-empresas-iva-minimo'
const DGI_NO_PUEDEN =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/pueden-ampararse-regimen-monotributo-0'
const GUBUY_CLAUSURA =
  'https://www.gub.uy/tramites/clausura-empresa-unipersonal-monotributo-monotributo-mides-iva-minimo-etc'
const MIDES_FAQ =
  'https://www.gub.uy/ministerio-desarrollo-social/comunicacion/publicaciones/informacion-general-preguntas-frecuentes'
const MIDES_YA_TENGO =
  'https://www.gub.uy/ministerio-desarrollo-social/comunicacion/publicaciones/ya-tengo-monotributo-social'
const IMPO_199_007 = 'https://www.impo.com.uy/bases/decretos/199-2007'
const IMPO_220_012 = 'https://www.impo.com.uy/bases/decretos/220-2012'
const IMPO_18083 = 'https://www.impo.com.uy/bases/leyes/18083-2006'
const IMPO_18874 = 'https://www.impo.com.uy/bases/leyes/18874-2011'
const IMPO_19942 = 'https://www.impo.com.uy/bases/leyes/19942-2021'
const IMPO_CT_94 = 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/94'

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

// ---------------------------------------------------------------------------
// Cuánto se paga por mes en 2026 (BPS, vigencia enero 2026, verificado 2026-09-22)
// ---------------------------------------------------------------------------
//
// Tres regímenes con montos DISTINTOS a los de arriba: ley 18.083 (altas hasta el 31/12/2020,
// sin gradualidad), ley 19.942 (altas desde el 1/1/2021, con gradualidad 25/50/100% en tramos de
// 12 meses — su tramo pleno coincide con la 18.083) y Monotributo Social MIDES (ley 18.874, con
// gradualidad de CUATRO tramos: 25/50/75/100% cada 12 meses, no tres). `FIGURES` de arriba ya
// traía sueltos el aporte MIDES del año 1 y el pleno, más el tope unipersonal: se contrastaron
// contra BPS el 2026-09-22 y coinciden con esta tabla, así que no se corrigieron.
//
// DOS CORRECCIONES del 2026-09-22 sobre lo publicado el 2026-09-15:
//   1. La página decía que BPS «no publica para este régimen una columna separada sin hijos». Sí
//      la publica: el PDF de detalle de la ley 19.942 (monotributo-ley-19.942---2026.pdf) trae
//      «sin hijos» para los dos casos (4.761 / 5.284 / 6.327 sin cónyuge; 5.653 / 6.176 / 7.219
//      con cónyuge a cargo). Se agregan las columnas.
//   2. La página definía «con cónyuge» como «el hogar con cónyuge o concubino CON FONASA». BPS
//      define lo contrario: la columna es «con cónyuge o concubino A CARGO», y «los cónyuges
//      están a cargo cuando NO cuentan con cobertura médica dentro del Fonasa por su propia
//      actividad o pasividad». O sea: el tramo más caro es cuando la pareja no tiene FONASA propio
//      y lo recibe a través del titular (que, por la nota (2) del PDF, tiene que haber optado).
export interface MonoAportesTramo {
  /** Aporte mensual sin cobertura FONASA (incluye $549 de seguro de enfermedad sin cobertura). */
  sinFonasa: number
  /** Con FONASA, sin cónyuge o concubino a cargo, con hijos a cargo. */
  conFonasaSinConyuge: number
  /** Con FONASA, sin cónyuge o concubino a cargo, sin hijos a cargo (PDF de BPS). */
  conFonasaSinConyugeSinHijos: number
  /** Con FONASA, con cónyuge o concubino a cargo (= sin FONASA propio), con hijos a cargo. */
  conFonasaConConyuge: number
  /** Con FONASA, con cónyuge o concubino a cargo, sin hijos a cargo (PDF de BPS). */
  conFonasaConConyugeSinHijos: number
}

export interface MonoAportesMidesConFonasaTramo {
  sinConyugeConHijos: number
  sinConyugeSinHijos: number
  conConyugeConHijos: number
  conConyugeSinHijos: number
}

/** Documenta la forma de `MONO_APORTES_2026`; el valor real va con `as const` para las fuentes. */
export interface MonoAportes2026Shape {
  verifiedAt: string
  sources: readonly { label: string; url: string }[]
  /** Cómo se arma la cuota: BFC/BPC vigentes y las tres partes que la componen. */
  composicion: {
    bfc: number
    bpc: number
    /** 5 BFC: el sueldo ficto sobre el que se calcula el aporte jubilatorio. */
    montoGravado: number
    /** Jubilatorio + FRL al 100 % (25 % = 522, 50 % = 1.045). */
    jubilatorioFrlPleno: number
    /** 8 % de 1 BPC que paga quien NO opta por FONASA, «por concepto de seguro de enfermedad». */
    seguroEnfermedadSinFonasa: number
    /** Base del aporte FONASA cuando se opta: 6,5 BPC, sin gradualidad. */
    fonasaBaseBpc: number
  }
  ley19942: Record<'primerAnio' | 'segundoAnio' | 'pleno', MonoAportesTramo>
  /** Sociedad de hecho, ley 19.942: sólo jubilatorio + FRL (sin opción FONASA), por cantidad de socios. */
  sociedadDeHecho: Record<'unSocio' | 'dosSocios' | 'tresSocios', readonly [number, number, number]>
  mides: {
    sinFonasa: readonly [number, number, number, number]
    conFonasa: readonly [
      MonoAportesMidesConFonasaTramo,
      MonoAportesMidesConFonasaTramo,
      MonoAportesMidesConFonasaTramo,
      MonoAportesMidesConFonasaTramo,
    ]
  }
  topes: { unipersonal: number; sociedadDeHecho: number; activos: number }
}

export const MONO_APORTES_2026 = {
  verifiedAt: '2026-09-22',
  sources: [
    {
      label: 'BPS — Monotributo ley 19.942 (vigencia enero 2026)',
      url: BPS_LEY_19942,
    },
    {
      label: 'BPS — Monotributo ley 19.942, detalle de cálculo 2026 (PDF, columnas «sin hijos»)',
      url: BPS_LEY_19942_PDF,
    },
    {
      label: 'BPS — Aportación de monotributo (FONASA opcional, cónyuge a cargo)',
      url: BPS_APORTACION,
    },
    {
      label: 'BPS — Monotributo social Mides, ley 18.874 (vigencia enero 2026)',
      url: BPS_MIDES,
    },
    {
      label: 'BPS — Tope de ingresos y capital de la empresa (2026)',
      url: BPS_TOPES_2026,
    },
    {
      label: 'BPS — Valores actuales (BFC, BPC, recargo por mora, timbre)',
      url: BPS_VALORES,
    },
  ],
  composicion: {
    bfc: 1847.96,
    bpc: 6864,
    montoGravado: 9240,
    jubilatorioFrlPleno: 2088,
    seguroEnfermedadSinFonasa: 549,
    fonasaBaseBpc: 6.5,
  },
  /** Monotributo ley 19.942 — altas desde el 1/1/2021, unipersonal sin dependientes. */
  ley19942: {
    /** Mes 1 a 12 de actividad (25% del aporte pleno). */
    primerAnio: {
      sinFonasa: 1071,
      conFonasaSinConyuge: 5430,
      conFonasaSinConyugeSinHijos: 4761,
      conFonasaConConyuge: 6322,
      conFonasaConConyugeSinHijos: 5653,
    },
    /** Mes 13 a 24 de actividad (50%). */
    segundoAnio: {
      sinFonasa: 1594,
      conFonasaSinConyuge: 5953,
      conFonasaSinConyugeSinHijos: 5284,
      conFonasaConConyuge: 6845,
      conFonasaConConyugeSinHijos: 6176,
    },
    /** Desde el mes 25 de actividad (100%). Idéntico a la ley 18.083. */
    pleno: {
      sinFonasa: 2637,
      conFonasaSinConyuge: 6996,
      conFonasaSinConyugeSinHijos: 6327,
      conFonasaConConyuge: 7888,
      conFonasaConConyugeSinHijos: 7219,
    },
  },
  /** Índices: 0 = meses 1-12 (25%), 1 = meses 13-24 (50%), 2 = desde el mes 25 (100%). */
  sociedadDeHecho: {
    unSocio: [522, 1045, 2088],
    dosSocios: [1045, 2088, 4176],
    tresSocios: [1566, 3132, 6265],
  },
  /**
   * Monotributo Social MIDES — ley 18.874, gradualidad de 4 tramos de 12 meses (25/50/75/100%).
   * Los arrays van en ese orden: índice 0 = meses 1-12 (25%) ... índice 3 = desde el mes 37 (100%).
   */
  mides: {
    sinFonasa: [659, 1320, 1979, 2637],
    conFonasa: [
      {
        sinConyugeConHijos: 5430,
        sinConyugeSinHijos: 4761,
        conConyugeConHijos: 6322,
        conConyugeSinHijos: 5653,
      },
      {
        sinConyugeConHijos: 5953,
        sinConyugeSinHijos: 5284,
        conConyugeConHijos: 6845,
        conConyugeSinHijos: 6176,
      },
      {
        sinConyugeConHijos: 6475,
        sinConyugeSinHijos: 5806,
        conConyugeConHijos: 7367,
        conConyugeSinHijos: 6698,
      },
      {
        sinConyugeConHijos: 6996,
        sinConyugeSinHijos: 6327,
        conConyugeConHijos: 7888,
        conConyugeSinHijos: 7219,
      },
    ],
  },
  /** Topes anuales 2026 (aplican a monotributo ley 18.083 y 19.942; el de activos no rige para MIDES). */
  topes: {
    unipersonal: 1_175_537,
    sociedadDeHecho: 1_959_229,
    activos: 979_614,
  },
} as const satisfies MonoAportes2026Shape

/** La leyenda que va en el recuadro, según el régimen. */
export const LEYENDAS = [
  { regime: 'Monotributo', text: 'MONOTRIBUTO' },
  { regime: 'Monotributo Social MIDES', text: 'MONOTRIBUTO SOCIAL MIDES' },
] as const

// ---------------------------------------------------------------------------
// Qué pasa si… (verificado 2026-09-22 contra BPS, DGI, MIDES e IMPO)
// ---------------------------------------------------------------------------
//
// POR QUÉ EXISTE: las consultas que llegan a esta página no preguntan qué es el monotributo sino
// qué le pasa a quien YA lo tiene en una situación concreta: «tengo monotributo y no facturo»,
// «me pasé del tope», «debo monotributo», «puedo no pagar FONASA», «quién paga el monotributo,
// el empleado o el empleador» (pregunta importada de Argentina: acá el monotributo es la empresa
// del titular y no tiene empleador). Y los hilos de r/uruguay que las responden están mal en lo
// que más importa: la respuesta más votada de 2022 («vas a seguir sumando deuda hasta que puedan
// embargarte») describe el régimen anterior a la ley 19.942, que desde 2021 ordena a BPS suspender
// de oficio a los dos meses; y «si estás en caja sí o sí tenés que pagar Fonasa» es falso para el
// titular unipersonal, para quien BPS dice con todas las letras que la cobertura es opcional.
//
// LO QUE NO SE PUBLICA ACÁ:
//   - Un valor de la UI para «traducir» 183.000 UI: BPS y DGI publican los pesos ($1.175.537 /
//     $1.959.229) y la ley las UI. Multiplicar por la UI del mes no reproduce la cifra oficial.
//   - Que el monotributo unipersonal común se puede «inactivar» como el Mides. BPS no lista ese
//     trámite para él (sí para servicios personales, sociedades de hecho y Mides); lo que documenta
//     es clausurar y reiniciar con el mismo RUT. Se publica como lo que BPS lista, no como regla.
//   - Las 72 cuotas al 2 % anual de la ley 19.942: eran sólo para deuda devengada hasta el
//     23/3/2021. No es un plan vigente.
//   - «Mayores de 18» como requisito del Mides: no está en ninguna fuente consultada.

export const MONO_CASOS_VERIFIED_AT = '2026-09-22'

export interface DatedSource {
  label: string
  url: string
  /** Fecha ISO en que se leyó la fuente. */
  seenOn: string
}

export interface CasoTable {
  headers: readonly string[]
  rows: readonly (readonly string[])[]
  note?: string
}

export interface Caso {
  id: string
  /** La pregunta tal como se busca. */
  question: string
  /** La respuesta en una línea, primero. */
  short: string
  /** Párrafos de detalle, texto plano. */
  detail: readonly string[]
  table?: CasoTable
  sources: readonly DatedSource[]
}

const S = MONO_CASOS_VERIFIED_AT
const src = (label: string, url: string): DatedSource => ({ label, url, seenOn: S })

/** Vencimientos 2026 del monotributo sin dependientes y del Mides (se paga a mes vencido). */
export const MONO_VENCIMIENTOS_2026 = [
  { mes: 'enero', dia: 23 },
  { mes: 'febrero', dia: 24 },
  { mes: 'marzo', dia: 20 },
  { mes: 'abril', dia: 24 },
  { mes: 'mayo', dia: 25 },
  { mes: 'junio', dia: 22 },
  { mes: 'julio', dia: 21 },
  { mes: 'agosto', dia: 21 },
  { mes: 'setiembre', dia: 21 },
  { mes: 'octubre', dia: 22 },
  { mes: 'noviembre', dia: 23 },
  { mes: 'diciembre', dia: 21 },
] as const

/** Multa por mora del Código Tributario (art. 94) y recargo de BPS vigente. */
export const MONO_MORA_2026 = {
  multaDentroDe5DiasHabiles: 5,
  multaHasta90Dias: 10,
  multaDespuesDe90Dias: 20,
  multaConFacilidadesEnPlazo: 10,
  /** Mensual, capitalizable cuatrimestralmente (BPS, setiembre 2026). */
  recargoMensualPct: 0.8,
  mesesSinPagarParaSuspension: 2,
  planDePagoMesesMax: 12,
} as const

/** El escalón siguiente: pequeña empresa / IVA mínimo (literal E), cuota mensual a DGI en 2026. */
export const IVA_MINIMO_2026 = {
  cuota: 5910,
  cuotaNuevaEmpresaAnio1: 1478,
  cuotaNuevaEmpresaAnio2: 2955,
  topeIngresos: 1_959_229,
  topeIngresosUi: 305_000,
} as const

/** Los topes en UI que fija la ley, al lado de los pesos que publica BPS/DGI. */
export const MONO_TOPES_UI = {
  unipersonalUi: 183_000,
  sociedadDeHechoUi: 305_000,
  activosUi: 152_500,
} as const

export const CASOS: readonly Caso[] = [
  {
    id: 'no-facturo',
    question: '¿Qué pasa si tengo monotributo y no facturo?',
    short: 'La cuota se debe igual; a los dos meses sin pagar, BPS suspende el registro.',
    detail: [
      'La cuota del monotributo es fija: no depende de cuánto facturaste ese mes ni de si facturaste. Mientras la empresa esté activa se debe todos los meses, y se paga a mes vencido (la actividad de enero de 2026 venció el 24 de febrero).',
      'Si dejás de pagar dos meses consecutivos, BPS suspende de oficio el registro (ley 18.083, art. 75, agregado por la ley 19.942 en 2021). No es que «la empresa se cierra sola y no debés nada»: esos dos meses quedan debidos, con multa y recargo, y hay que pagarlos —al contado o con convenio— para reiniciar. El hilo de r/uruguay que dice que la deuda sigue creciendo hasta el embargo describe el régimen anterior a 2021.',
      'Si seguiste trabajando durante la suspensión, BPS indica pagar los adeudos y pedir el reinicio (trámite en línea, un timbre; si el reinicio es retroactivo más de un año, por petición en Mesa de Entrada). Si no trabajaste, BPS indica clausurar.',
      'Si sabés que vas a parar un tiempo: BPS no lista un trámite de inactividad para el monotributo unipersonal de industria y comercio (sí para servicios personales, sociedades de hecho y Monotributo Social Mides). La vía que documenta es la clausura —hasta 30 días corridos desde la fecha de cierre, un timbre profesional de $270 en 2026, y el formulario 0453 ante DGI si tenías talonario— y después «reiniciar empresa» con el mismo RUT. Confirmalo con BPS antes de decidir: es lo que lista, no una regla escrita.',
      'El Monotributo Social Mides es distinto: el tributo se debe sólo por los meses con actividad efectiva (ley 18.874, art. 8), y tiene trámite de inactividad en línea con un plazo de 30 días corridos que «en ningún caso» se tramita fuera de plazo. Mientras está inactivo no se paga, no se factura y, si tenías FONASA, te quedás sin cobertura.',
    ],
    table: {
      headers: ['Mes de pago 2026', 'Vence el'],
      rows: MONO_VENCIMIENTOS_2026.map(v => [v.mes, String(v.dia)]),
      note: 'Calendario BPS para empresas sin dependientes; el mismo rige para el Monotributo Social Mides. El mes es el de pago: se paga la actividad del mes anterior.',
    },
    sources: [
      src('BPS — Monotributo: suspensión del registro (13/03/2026)', BPS_SUSPENSION),
      src('BPS — Reiniciar monotributo o Mides unipersonal inactivo de oficio', BPS_REINICIO),
      src('BPS — Inactivar empresas (la lista de trámites de inactividad)', BPS_INACTIVAR),
      src(
        'BPS — Clausura de empresa unipersonal (formulario 0453 si tenías talonario)',
        BPS_CLAUSURA_UNIPERSONAL
      ),
      src('gub.uy — Clausura de empresa unipersonal, plazo y timbre 2026', GUBUY_CLAUSURA),
      src('BPS — Inactividad de monotributo social Mides', BPS_MIDES_INACTIVIDAD),
      src('BPS — Vencimientos de monotributo 2026', BPS_VENCIMIENTOS),
      src('BPS — Vencimientos de monotributo social Mides 2026', BPS_VENCIMIENTOS_MIDES),
      src('IMPO — Ley 18.083, art. 75 (suspensión de oficio a los 2 meses)', IMPO_18083),
      src('IMPO — Ley 18.874, art. 8 (el Mides se debe sólo por meses con actividad)', IMPO_18874),
    ],
  },
  {
    id: 'me-paso-del-tope',
    question: '¿Qué pasa si me paso del tope del monotributo?',
    short: 'Salís del régimen en ese mismo ejercicio y no podés volver hasta el cuarto año.',
    detail: [
      'El tope 2026 de ingresos anuales es $1.175.537 para la unipersonal (183.000 UI, el 60 % del literal E) y $1.959.229 para la sociedad de hecho (305.000 UI). Publicamos los pesos que fijan BPS y DGI, no una conversión propia: multiplicar las UI por la cotización del mes no da la cifra oficial. Hay además un tope de activos de $979.614 (152.500 UI) que no rige para el Mides.',
      'Cuando en el transcurso del ejercicio dejás de cumplir una condición —el tope de ingresos, el de activos, un segundo local, vender a empresas fuera de las excepciones— dejás de estar en monotributo desde ese momento y pasás a tributar IVA y los aportes a la seguridad social por el régimen general, más IRAE e Impuesto al Patrimonio si corresponde (decreto 199/007, art. 13). No hay un «exceso tolerado» ni un aviso previo. DGI controla con la información de las tarjetas y de las compras del Estado; el monotributista no presenta declaración jurada.',
      'El escalón siguiente para la mayoría es la pequeña empresa de IVA mínimo (literal E, ingresos hasta $1.959.229): en 2026 paga $5.910 por mes a DGI, y una empresa nueva paga $1.478 los primeros 12 meses y $2.955 los segundos —ese descuento no aplica a reinicios—, más los aportes a BPS. Se paga desde la primera venta del año hasta el último mes del ejercicio aunque después no haya ingresos.',
      'La regla que nadie cuenta: quien sale del monotributo, por exceso o por optar por otro régimen, recién puede volver cuando termine el tercer año civil posterior a la salida. Salir en 2026 significa poder volver desde el 1 de enero de 2030 (decreto 199/007, art. 14). También se puede salir por opción en cualquier momento del ejercicio (art. 12).',
      'En el Monotributo Social Mides el tope es el mismo ($1.175.537 / $1.959.229) y no hay tope mensual: por el ejercicio en que se supera se tributa por la normativa general, DGI y BPS notifican los tributos impagos, y para volver al ejercicio siguiente hace falta el aval del MIDES (ley 18.874, art. 4).',
    ],
    table: {
      headers: ['Régimen', 'Tope de ingresos 2026', 'En UI (ley)', 'Qué pasa al superarlo'],
      rows: [
        [
          'Monotributo unipersonal',
          '$1.175.537',
          '183.000 UI',
          'IVA + aportes por régimen general desde ese momento; volver recién desde 2030',
        ],
        [
          'Monotributo sociedad de hecho',
          '$1.959.229',
          '305.000 UI',
          'Lo mismo; el tope de activos ($979.614) también excluye',
        ],
        [
          'Monotributo Social Mides',
          '$1.175.537 / $1.959.229',
          '183.000 / 305.000 UI',
          'Ese ejercicio por normativa general; volver al siguiente sólo con aval del MIDES',
        ],
        [
          'Pequeña empresa / IVA mínimo (el escalón siguiente)',
          '$1.959.229',
          '305.000 UI',
          'Cuota 2026: $5.910 por mes a DGI ($1.478 y $2.955 los dos primeros años si es nueva), más BPS',
        ],
      ],
    },
    sources: [
      src('BPS — Tope de ingresos y capital de la empresa (2026)', BPS_TOPES_2026),
      src('DGI — Monotributo: topes en UI y condiciones', DGI_MONOTRIBUTO),
      src('DGI — Qué pasa si la empresa deja de cumplir las condiciones', DGI_DEJA_CUMPLIR),
      src('DGI — Condiciones para volver a ser monotributista (tercer año civil)', DGI_VOLVER),
      src('DGI — Cuota IVA mínimo, valores vigentes 2026', DGI_IVA_MINIMO_CUOTA),
      src(
        'DGI — Monto a pagar del IVA mínimo (desde la primera venta; sin cuota reducida al reiniciar)',
        DGI_IVA_MINIMO_MONTO
      ),
      src('DGI — Tope de ingresos de la pequeña empresa (IVA mínimo) 2026', DGI_IVA_MINIMO_TOPE),
      src('DGI — Tope de ingresos anuales del Monotributo Social MIDES 2026', DGI_TOPE_MIDES),
      src('IMPO — Decreto 199/007, arts. 12, 13 y 14', IMPO_199_007),
      src('IMPO — Ley 18.874, art. 4 (exceso en el Mides)', IMPO_18874),
    ],
  },
  {
    id: 'debo-cuotas',
    question: '¿Qué pasa si debo monotributo?',
    short: 'Multa del 5, 10 o 20 % más 0,80 % mensual de recargo; se puede convenir con BPS.',
    detail: [
      'La cuota impaga lleva la multa por mora del Código Tributario (art. 94): 5 % si la pagás dentro de los 5 días hábiles siguientes al vencimiento, 10 % después de esos días y hasta los 90 días corridos, 20 % pasados los 90 días, y 10 % si pedís facilidades dentro del plazo. Encima va el recargo por mora de BPS, que en setiembre de 2026 es 0,80 % mensual, capitalizable cada cuatro meses y contado día por día.',
      'A los dos meses consecutivos sin pagar, BPS suspende de oficio el registro justamente para que la deuda no siga creciendo. Pero esos dos meses quedan debidos, y para reiniciar hay que tributarlos (decreto 199/007, art. 14 bis); en el Mides se pagan «con las multas y recargos correspondientes».',
      'Para pagar en cuotas hay dos caminos en BPS. El convenio («Asesoramiento y firma de facilidades de pago», presencial o en línea con firma electrónica avanzada): antes hay que clausurar o inactivar si la actividad cesó, la primera cuota se paga el día de la firma, y se puede simular en «Consultar obligaciones pendientes, financiación de deudas y pagos realizados». Y el plan de pagos por petición: vencimientos cada 30 días y un plazo máximo de 12 meses, según la deuda.',
      'Las 72 cuotas al 2 % anual y sin multas de la ley 19.942 no están abiertas: eran sólo para deuda de monotributo devengada hasta el 23 de marzo de 2021. En el Monotributo Social Mides sí hay una excepción vigente: para reiniciar tras la suspensión de oficio no se exige pagar las deudas generadas entre marzo de 2020 y marzo de 2023 (BPS, 9/6/2026), y las deudas de una actividad patronal anterior no impiden inscribirse como Mides (ley 18.874, art. 12).',
    ],
    table: {
      headers: ['Cuándo pagás', 'Multa por mora', 'Recargo'],
      rows: [
        ['Dentro de los 5 días hábiles del vencimiento', '5 %', '0,80 % mensual, día por día'],
        ['Después de esos 5 días y hasta 90 días corridos', '10 %', '0,80 % mensual, día por día'],
        ['Pasados los 90 días corridos', '20 %', '0,80 % mensual, día por día'],
        ['Pedís facilidades dentro del plazo', '10 %', 'según el convenio'],
      ],
      note: 'Multa: Código Tributario, art. 94. Recargo: BPS, «Valores actuales», setiembre de 2026 (0,80 % mensual capitalizable cuatrimestralmente).',
    },
    sources: [
      src('IMPO — Código Tributario, art. 94 (mora)', IMPO_CT_94),
      src('BPS — Valores actuales (recargo por mora)', BPS_VALORES),
      src('BPS — Asesoramiento y firma de facilidades de pago', BPS_FACILIDADES),
      src('BPS — Planes de pago (hasta 12 meses)', BPS_PLANES_PAGO),
      src('IMPO — Decreto 199/007, art. 14 bis (los 2 meses previos a la baja)', IMPO_199_007),
      src('IMPO — Ley 19.942, art. 7 (las 72 cuotas, sólo deuda hasta el 23/3/2021)', IMPO_19942),
      src(
        'BPS — Monotributo social Mides: suspensión del registro (9/6/2026)',
        BPS_MIDES_SUSPENSION
      ),
      src('IMPO — Ley 18.874, art. 12 (deudas anteriores no impiden el alta)', IMPO_18874),
    ],
  },
  {
    id: 'fonasa-opcional',
    question: '¿Con monotributo puedo no pagar FONASA?',
    short:
      'Sí, para el titular unipersonal es opcional: sin FONASA pagás $549 de seguro de enfermedad.',
    detail: [
      'Para el titular de un monotributo unipersonal y su cónyuge o concubino colaborador, la cobertura médica es opcional (BPS, «Aportación de monotributo», 14/5/2026). El decreto 199/007 (art. 17) dice que la opción se puede hacer en cualquier momento; la ley 18.083 (art. 78) habla de ejercerla al registrarse. En la práctica manda lo que BPS aplica: la opción se cambia por el servicio en línea GAFI – Modificar actividad, con el código de seguro de salud 1 (con hijos, sin cónyuge a cargo), 15 (sin hijos, sin cónyuge), 16 (con hijos, con cónyuge), 17 (sin hijos, con cónyuge) o 9 (no beneficiario).',
      'Sin la opción no es que no pagás nada de salud: sumás $549 por mes —el 8 % de una BPC de $6.864— «por concepto de seguro de enfermedad», sin derecho a mutualista. Es la diferencia entre los $522 de jubilatorio y FRL del primer año y los $1.071 de la cuota sin FONASA. Con la opción aportás sobre 6,5 BPC y la cuota del primer año pasa a $4.761 (sin hijos ni cónyuge a cargo), $5.430 (con hijos), $5.653 o $6.322 (con cónyuge a cargo, sin y con hijos); desde el mes 25 va de $6.327 a $7.888.',
      'La gradualidad del 25 y 50 % no toca el FONASA: sólo rebaja el jubilatorio, el FRL y los $549. Por eso quien abre con FONASA esperando pagar «el 25 %» recibe una factura de $4.761 el primer mes: el hilo de r/uruguay de marzo de 2026 que se sorprendía con «cuatro mil y pico» está viendo exactamente ese número.',
      'Cónyuge «a cargo» es el que no tiene FONASA por su propia actividad o pasividad. Si tu pareja ya tiene FONASA por su trabajo o su jubilación, pagás el tramo sin cónyuge a cargo. Y para darle la cobertura a la pareja, el titular tiene que haber optado por el seguro.',
      'Los socios de una sociedad de hecho de monotributo común no tienen la opción: las tablas de BPS para sociedades de hecho traen sólo jubilatorio y FRL. En el Monotributo Social Mides la opción es individual por integrante, también para socios, y se puede hacer en cualquier momento (decreto 220/012, art. 10). Si ya tenés FONASA por otro empleo, podés registrar el monotributo sin la opción (código 9); BPS no publica un cruce explícito para ese caso, así que lo decimos como «podés no optar», no como «quedás exonerado».',
    ],
    table: {
      headers: ['Situación (ley 19.942, meses 1 a 12)', 'Cuota mensual', 'Qué incluye'],
      rows: [
        [
          'Sin FONASA (código 9)',
          '$1.071',
          'Jubilatorio + FRL $522 y $549 de seguro de enfermedad sin cobertura',
        ],
        [
          'Con FONASA, sin hijos ni cónyuge a cargo (15)',
          '$4.761',
          'Jubilatorio + FRL $522 y FONASA pleno sobre 6,5 BPC',
        ],
        ['Con FONASA, con hijos, sin cónyuge a cargo (1)', '$5.430', 'Ídem, con la tasa por hijos'],
        [
          'Con FONASA, sin hijos, con cónyuge a cargo (17)',
          '$5.653',
          'Ídem, con la tasa por cónyuge sin FONASA propio',
        ],
        ['Con FONASA, con hijos y cónyuge a cargo (16)', '$6.322', 'Ídem, con las dos tasas'],
      ],
      note: 'Los mismos casos desde el mes 25 (o para altas hasta 2020, ley 18.083): $2.637 / $6.327 / $6.996 / $7.219 / $7.888. La tabla completa está en «Cuánto se paga por mes en 2026».',
    },
    sources: [
      src(
        'BPS — Aportación de monotributo (FONASA opcional, códigos GAFI, cónyuge a cargo)',
        BPS_APORTACION
      ),
      src('BPS — Monotributo ley 19.942, detalle de cálculo 2026 (PDF)', BPS_LEY_19942_PDF),
      src('IMPO — Decreto 199/007, art. 17 (opción en cualquier momento)', IMPO_199_007),
      src('IMPO — Ley 18.083, art. 78 (opción al registrarse)', IMPO_18083),
      src('IMPO — Decreto 220/012, art. 10 (FONASA en el Mides, opción individual)', IMPO_220_012),
    ],
  },
  {
    id: 'cambiar-mutualista',
    question: '¿Con monotributo puedo cambiar de mutualista?',
    short: 'Sí, con las reglas de cualquier usuario FONASA: el mes de tu dígito, tras 23 meses.',
    detail: [
      'Si optaste por FONASA sos un usuario más del Sistema Nacional Integrado de Salud, y el cambio de prestador tiene las mismas reglas que para un empleado: la movilidad regulada se abre en el mes que corresponde al último dígito de tu cédula, siempre que tengas al menos 23 meses en el mismo prestador al último día del mes anterior al de tu dígito. El trámite se hace en el prestador nuevo, con la cédula vigente. Enero y febrero no tienen ventana.',
      'Fuera de esa ventana hay tres puertas: a ASSE o a un seguro integral se puede cambiar en cualquier momento; si BPS te afilió de oficio (primer ingreso al sistema, reingreso tras 180 días sin afiliación o cambio de categoría) tenés 180 días para elegir; y por causales excepcionales que resuelve la Junasa —cambio de domicilio o de acceso geográfico (se pide antes de los 12 meses), problemas asistenciales, incumplimiento de los tiempos de espera del decreto 359/007— con declaración jurada de no haber recibido dinero ni ventajas del prestador nuevo. Todo cambio rige desde el primer día hábil del mes siguiente (decreto 344/020).',
      'La página de BPS que fija el calendario y los 23 meses tiene fecha de actualización 14/9/2023; no encontramos una versión 2026, así que la publicamos con esa fecha a la vista.',
    ],
    table: {
      headers: ['Mes', 'Dígito verificador de la cédula'],
      rows: [
        ['marzo', '3'],
        ['abril', '4'],
        ['mayo', '5'],
        ['junio', '6'],
        ['julio', '7'],
        ['agosto', '8'],
        ['setiembre', '9'],
        ['octubre', '0'],
        ['noviembre', '1'],
        ['diciembre', '2'],
      ],
      note: 'Movilidad regulada (BPS, «Cambio de prestador de salud», actualizada el 14/9/2023). Enero y febrero no tienen ventana.',
    },
    sources: [src('BPS — Cambio de prestador de salud (14/09/2023)', BPS_PRESTADOR)],
  },
  {
    id: 'quien-paga',
    question: '¿Quién paga el monotributo, el empleado o el empleador?',
    short: 'Ninguno: es la empresa del propio titular y no tiene empleador.',
    detail: [
      'La pregunta viene de Argentina, donde el monotributo es una categoría del trabajador. En Uruguay el monotributo es la empresa unipersonal (o sociedad de hecho) del propio titular: sustituye sus aportes a la seguridad social y los impuestos nacionales por esa actividad. El titular paga su cuota; nadie se la paga.',
      'Si el titular contrata al único dependiente que permite el régimen (hasta tres en la zafra del 1 de diciembre al 6 de enero), el monotributo no sustituye los tributos sobre ese sueldo (ley 18.083, art. 75): los aportes del trabajador —jubilatorio, FRL, FONASA, FGCL— se calculan como en Industria y Comercio, con aportes personales retenidos del sueldo y patronales a cargo de la empresa, y se suman a la factura del titular. BPS tiene un simulador («Simular aportes de trabajadores»).',
      'Usar un monotributo o un Monotributo Social Mides para encubrir una relación de dependencia expone al contratante a sanciones: el decreto 220/012 (art. 2) habla de «las máximas sanciones», y el MIDES lo dice en su folleto: no está permitido utilizar el Monotributo Social para trabajar en relación de dependencia con un empleador.',
      'Y la otra pregunta de la misma familia, «¿puedo ser monotributista como trabajador independiente?»: sólo si tu actividad es empresarial de reducida dimensión —venta de bienes, oficios, servicios enumerados como limpieza, cosmética o reparaciones— a consumidores finales, en un puesto o local de hasta 15 m². Quienes prestan servicios personales fuera de la relación de dependencia (diseño, programación, consultoría, profesionales) están excluidos por el art. 72 de la ley 18.083 y tributan por servicios personales. Tampoco puede ser monotributo quien ya tiene otra actividad con afiliación patronal, ni un socio de sociedad personal o director de SA, aunque esté inactivo.',
    ],
    sources: [
      src('IMPO — Ley 18.083, arts. 72 y 75 (excluidos; dependientes)', IMPO_18083),
      src(
        'BPS — Aportación de monotributo (con dependientes, como Industria y Comercio)',
        BPS_APORTACION
      ),
      src('BPS — Monotributo: información general (13/03/2026)', BPS_INFO_GENERAL),
      src('DGI — Quiénes no pueden ampararse al régimen de monotributo', DGI_NO_PUEDEN),
      src('IMPO — Decreto 220/012, art. 2 (encubrir dependencia con un Mides)', IMPO_220_012),
    ],
  },
  {
    id: 'monotributo-social-mides',
    question: '¿Qué es, cuánto cuesta y cuál es el tope del Monotributo Social MIDES?',
    short:
      'Para hogares bajo la línea de pobreza; $659 el primer año sin FONASA; mismo tope que el común.',
    detail: [
      'Es el monotributo para personas de hogares por debajo de la línea de pobreza del INE o en situación de vulnerabilidad socioeconómica (ley 18.874, art. 1). Puede ser un emprendimiento personal o asociativo de hasta cinco socios, sin empleados, en cualquier rubro salvo el servicio doméstico y la construcción del decreto-ley 14.411 (las pequeñas obras de mantenimiento de la ley 19.291 sí entran). A diferencia del monotributo común, puede venderle a empresas y al Estado.',
      'Exige una calificación previa del MIDES —formulario web y declaración jurada de ingresos del hogar con comprobantes de todos los integrantes, en una oficina territorial— que vale un año y se revisa anualmente; para reiniciar un Mides suspendido, esa calificación tiene que estar vigente. Es compatible con un salario, una jubilación o una pensión mientras el hogar siga calificando, y con integrar más de un emprendimiento Mides; otra actividad patronal hay que clausurarla antes, y ni el costo de esa clausura ni las deudas anteriores impiden el alta.',
      'Cuánto se paga en 2026: $659 por mes el primer año, $1.320 el segundo, $1.979 el tercero y $2.637 desde el mes 37, por integrante y sin FONASA (25/50/75/100 % en tramos de 12 meses de actividad registrada). Con FONASA la parte de salud se paga entera desde el primer mes: de $4.761 (sin hijos ni cónyuge a cargo, año 1) a $7.888 (con hijos y cónyuge a cargo, desde el mes 37). El tributo se debe sólo por los meses con actividad efectiva.',
      'El tope anual de facturación es el mismo del monotributo común: $1.175.537 (183.000 UI) para la unipersonal y $1.959.229 (305.000 UI) para la sociedad de hecho en 2026, según DGI (12/1/2026) y el MIDES. No importa lo que se facture mes a mes y no tiene tope de activos. Si el hogar pierde la calificación, el MIDES notifica y hay 30 días para adecuar el registro o clausurar; si no, exclusión de oficio.',
      'Una cosa que se pregunta seguido: el MIDES asume el costo de impresión de los primeros 100 comprobantes (decreto 220/012, art. 16), no «todo el talonario». El monto es «suficiente» y se actualiza cada año según valores de mercado.',
    ],
    table: {
      headers: ['Monotributo Social Mides', 'Dato 2026'],
      rows: [
        [
          'Quién',
          'Hogar bajo la línea de pobreza del INE o en vulnerabilidad; calificación del MIDES vigente (dura un año)',
        ],
        [
          'Forma',
          'Personal o asociativo de hasta 5 socios, sin empleados; cualquier rubro salvo servicio doméstico y construcción',
        ],
        [
          'Cuota sin FONASA',
          '$659 (meses 1-12) · $1.320 (13-24) · $1.979 (25-36) · $2.637 (desde el 37), por integrante',
        ],
        [
          'Cuota con FONASA',
          'De $4.761 a $7.888 según hijos y cónyuge a cargo; el FONASA no tiene gradualidad',
        ],
        [
          'Tope de ingresos',
          '$1.175.537 unipersonal (183.000 UI) · $1.959.229 sociedad de hecho (305.000 UI); sin tope de activos',
        ],
        [
          'Si no hay trabajo',
          'Inactividad en línea, hasta 30 días corridos desde la fecha; sólo se debe por meses con actividad',
        ],
        ['Talonario', 'El MIDES paga la impresión de los primeros 100 comprobantes'],
      ],
    },
    sources: [
      src('IMPO — Ley 18.874 (Monotributo Social MIDES), arts. 1, 2, 4, 8 y 12', IMPO_18874),
      src('IMPO — Decreto 220/012, arts. 2, 6, 10, 15 y 16', IMPO_220_012),
      src('BPS — Monotributo social Mides, ley 18.874 (cuotas 2026)', BPS_MIDES),
      src('BPS — Monotributo social Mides: información general (13/03/2026)', BPS_MIDES_INFO),
      src('MIDES — Información general y preguntas frecuentes (18/02/2026)', MIDES_FAQ),
      src('MIDES — Si ya tengo un Monotributo Social (inactividad y reinicio)', MIDES_YA_TENGO),
      src('DGI — Tope de ingresos anuales del Monotributo Social MIDES 2026', DGI_TOPE_MIDES),
    ],
  },
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
    question: '¿Cuáles son las categorías del monotributo en 2026?',
    short: 'No hay, como en Argentina.',
    answer:
      'No existen «categorías» que subas o bajes según cuánto facturás, como en el monotributo argentino: mientras no superés el tope anual de ingresos, la cuota mensual no depende de tu facturación. Lo que cambia el monto es otra cosa: si sumás FONASA o no, si tenés cónyuge o concubino con FONASA, si hay hijos a cargo, y —en la ley 19.942 y en el Monotributo Social MIDES— la antigüedad de la empresa, porque los dos aportan gradual (25/50/100% la 19.942 en tramos de 12 meses; 25/50/75/100% el Mides) hasta llegar al monto pleno.',
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
  // --- Qué pasa si… (las frases tal como se buscan; el detalle está en `CASOS`) ---
  {
    question: '¿Qué pasa si tengo monotributo y no facturo?',
    short: 'La cuota se debe igual.',
    answer:
      'La cuota es fija y se debe todos los meses, hayas facturado o no. Si dejás de pagar dos meses seguidos, BPS suspende de oficio el registro (ley 18.083, art. 75, desde la ley 19.942) y esos dos meses quedan debidos con multa y recargo; para reiniciar hay que pagarlos, al contado o con convenio. Si vas a parar un tiempo, BPS no lista un trámite de inactividad para el monotributo unipersonal común: lo que documenta es clausurar (30 días corridos de plazo, timbre de $270 en 2026) y reiniciar después con el mismo RUT. El Monotributo Social Mides sí tiene inactividad y sólo debe los meses con actividad.',
  },
  {
    question: '¿Qué pasa si me paso del tope del monotributo?',
    short: 'Salís del régimen ese mismo ejercicio.',
    answer:
      'Desde el momento en que superás $1.175.537 (unipersonal, 183.000 UI) o $1.959.229 (sociedad de hecho, 305.000 UI) en el ejercicio dejás de estar en monotributo y pasás a tributar IVA y aportes por régimen general, más IRAE e Impuesto al Patrimonio si corresponde (decreto 199/007, art. 13). El escalón siguiente suele ser la pequeña empresa de IVA mínimo: $5.910 por mes a DGI en 2026 ($1.478 y $2.955 los dos primeros años si es nueva), más los aportes a BPS. Y no podés volver al monotributo hasta que termine el tercer año civil posterior a la salida: quien sale en 2026 vuelve recién desde 2030.',
  },
  {
    question: '¿Qué pasa si debo monotributo?',
    short: 'Multa del 5, 10 o 20 % más recargo.',
    answer:
      'La deuda paga multa por mora del 5 % si pagás dentro de los 5 días hábiles del vencimiento, 10 % hasta los 90 días corridos y 20 % después (Código Tributario, art. 94), más el recargo de BPS de 0,80 % mensual capitalizable cuatrimestralmente (setiembre de 2026). A los dos meses seguidos sin pagar, BPS suspende el registro para que la deuda no siga creciendo, pero esos dos meses hay que pagarlos para reiniciar. Se puede firmar un convenio de facilidades de pago en BPS (la primera cuota se paga el día de la firma; si cesaste la actividad, primero clausurar o inactivar) o pedir un plan de pagos de hasta 12 meses.',
  },
  {
    question: '¿Con monotributo puedo no pagar FONASA?',
    short: 'Sí, es opcional para el titular.',
    answer:
      'Sí. Para el titular de un monotributo unipersonal y su cónyuge colaborador la cobertura FONASA es opcional, según BPS. Sin la opción pagás $549 por mes (8 % de una BPC) por seguro de enfermedad, sin derecho a mutualista; con la opción aportás sobre 6,5 BPC, sin gradualidad, y la cuota del primer año pasa de $1.071 a entre $4.761 y $6.322 según hijos y cónyuge a cargo. La opción se cambia en GAFI – Modificar actividad con el código de seguro de salud (9 = no beneficiario). Los socios de una sociedad de hecho del monotributo común no tienen la opción; en el Mides sí, por integrante.',
  },
  {
    question: '¿Con monotributo puedo cambiar de mutualista?',
    short: 'Sí, en el mes de tu dígito.',
    answer:
      'Sí, con las mismas reglas que cualquier usuario FONASA: en la ventana de movilidad regulada del mes que corresponde al último dígito de tu cédula (marzo = 3, abril = 4 y así hasta diciembre = 2; enero y febrero no tienen ventana), siempre que tengas al menos 23 meses en el mismo prestador; a ASSE o a un seguro integral en cualquier momento; con 180 días para elegir si BPS te afilió de oficio; o por causales excepcionales (mudanza, problemas asistenciales, tiempos de espera) que resuelve la Junasa. El cambio rige desde el primer día hábil del mes siguiente. La página de BPS que lo fija está actualizada al 14/9/2023.',
  },
  {
    question: '¿Quién paga el monotributo, el empleado o el empleador?',
    short: 'Ninguno: no hay empleador.',
    answer:
      'Ninguno de los dos: en Uruguay el monotributo es la empresa del propio titular, no una categoría de empleado, y no tiene empleador. El titular paga su cuota. Si contrata al único dependiente que permite el régimen, los aportes de ese trabajador se calculan como en Industria y Comercio (personales retenidos del sueldo más patronales a cargo de la empresa) y se suman a la factura del titular. Usar un monotributo o un Mides para encubrir una relación de dependencia expone al contratante a sanciones. Y un freelancer de servicios personales (diseño, programación, consultoría) no puede ser monotributo: lo excluye el art. 72 de la ley 18.083.',
  },
  {
    question: '¿Cuál es la facturación anual máxima del Monotributo Social MIDES?',
    short: 'La misma del monotributo común.',
    answer:
      'La misma que la del monotributo común: $1.175.537 (183.000 UI) para la unipersonal y $1.959.229 (305.000 UI) para la sociedad de hecho en 2026, según DGI (12/1/2026) y el MIDES. No hay tope mensual y el Mides no tiene tope de activos. Si se supera, ese ejercicio se tributa por la normativa general y para volver al año siguiente hace falta el aval del MIDES. La cuota 2026 es $659 por mes el primer año, $1.320 el segundo, $1.979 el tercero y $2.637 desde el mes 37, sin FONASA; con FONASA la parte de salud se paga entera desde el primer mes.',
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
  { label: 'BPS — Monotributo ley 19.942 (montos por gradualidad)', url: BPS_LEY_19942 },
  { label: 'BPS — Monotributo ley 18.083 (altas hasta 2020)', url: BPS_LEY_18083 },
  { label: 'BPS — Monotributo ley 19.942, detalle de cálculo 2026 (PDF)', url: BPS_LEY_19942_PDF },
  { label: 'BPS — Aportación de monotributo (FONASA opcional, dependientes)', url: BPS_APORTACION },
  { label: 'BPS — Tope de ingresos y capital de la empresa (2026)', url: BPS_TOPES_2026 },
  { label: 'BPS — Monotributo: suspensión del registro', url: BPS_SUSPENSION },
  { label: 'BPS — Cambio de prestador de salud', url: BPS_PRESTADOR },
  { label: 'BPS — Valores actuales (BFC, BPC, recargo por mora, timbre)', url: BPS_VALORES },
  { label: 'DGI — Qué pasa si la empresa deja de cumplir las condiciones', url: DGI_DEJA_CUMPLIR },
  { label: 'DGI — Cuota IVA mínimo, valores vigentes 2026', url: DGI_IVA_MINIMO_CUOTA },
  { label: 'IMPO — Decreto 199/007 (reglamento del monotributo)', url: IMPO_199_007 },
  { label: 'IMPO — Ley 18.874 y Decreto 220/012 (Monotributo Social MIDES)', url: IMPO_18874 },
  { label: 'IMPO — Código Tributario, art. 94 (mora)', url: IMPO_CT_94 },
  { label: 'DGI e-Factura — Información general del régimen de CFE', url: DGI_EFACTURA },
] as const

export const DISCLAIMER =
  'Esto es información general contrastada con DGI, BPS e IMPO, no asesoramiento contable. Los montos de imprenta, certificados y abonos los pone cada proveedor y cambian.'

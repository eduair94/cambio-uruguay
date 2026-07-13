// Which legal form should a Uruguayan entrepreneur open? Verified catalogue of
// regimes, the legal eligibility gates that rule each one in or out, and the cost
// model, for `pages/que-empresa-abrir-uruguay.vue`.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be unit-tested
// in plain Node via vitest.
//
// EVERY numeric constant is a `Figure` carrying its primary source and the date it
// was verified. `tests/unit/companyTypes.test.ts` fails the build if one is added
// without a source. This is a legal-information page: an unsourced number is a bug.
//
// The peso ceilings are ANNUAL CONSTANTS published by BPS/DGI, fixed with the UI at
// the close of the previous ejercicio. They are NOT recomputed from today's UI.
// Refresh them, and the BPS/DGI tables below, every January (the Telegram drift
// watchdog in server/utils/uyFiguresLive.ts will nag).

/** A number that is safe to publish: it has a primary source and a verification date. */
export interface Figure {
  value: number
  label: string
  /** URL of the primary source (BPS / DGI / IMPO / INE / BCU). */
  source: string
  /** ISO date (YYYY-MM-DD) the value was last checked against that source. */
  verifiedAt: string
}

const V = '2026-07-13'
const fig = (value: number, label: string, source: string): Figure => ({
  value,
  label,
  source,
  verifiedAt: V,
})

/**
 * A number that is honest but NOT sourceable: a market estimate. It is the exact opposite
 * claim to a `Figure` — "no primary source exists for this, and here is why" — and it is
 * every bit as structured, so the page can render the caveat FROM DATA instead of
 * hardcoding a disclaimer string next to a bare literal.
 *
 * It deliberately does NOT satisfy `Figure`: it has no `source`, so the "every figure is
 * sourced to a primary domain" test never sees it, and it can never be mistaken for a
 * verified legal/financial figure by anything that iterates `FIGURES` to render "Fuentes".
 */
export interface Estimate {
  value: number
  label: string
  unsourced: true
  rationale: string
}

const est = (value: number, label: string, rationale: string): Estimate => ({
  value,
  label,
  unsourced: true,
  rationale,
})

/**
 * Estimates of market prices. NOT figures. Never publish these as if they were sourced.
 *
 * The AST guard in `tests/unit/companyTypes.test.ts` approves numeric literals inside an
 * `est(...)` call exactly as it approves those inside a `fig(...)` call: the approval is a
 * structural claim about WHERE the number lives, not about which digits it has. (The
 * previous mechanism — allowlisting the string `'4000'` — approved those four digits
 * anywhere in the file, for any purpose. That was the exception pointed backwards.)
 */
export const MARKET_ESTIMATES = {
  contadorMensual: est(
    4000,
    'Honorarios mensuales de un contador',
    'Estimación de mercado. No existe fuente primaria: ninguna repartición publica un arancel de contadores. El usuario puede ajustarla.'
  ),
} as const satisfies Record<string, Estimate>

const BPS_VALORES = 'https://www.bps.gub.uy/5478/valores-actuales.html'
const BPS_TOPES = 'https://www.bps.gub.uy/23987/tope-de-ingresos-y-capital-de-la-empresa.html'
const BPS_MONO = 'https://www.bps.gub.uy/6668/monotributo-ley-18083.html'
const BPS_MONO_GRAD = 'https://www.bps.gub.uy/18051/monotributo-ley-19942.html'
const BPS_MONO_SOCIAL = 'https://www.bps.gub.uy/6667/monotributo-social-mides-ley-18874.html'
const BPS_IC = 'https://www.bps.gub.uy/6665/industria-y-comercio.html'
const BPS_GRADUAL =
  'https://www.bps.gub.uy/17829/regimen-de-aportacion-gradual-vigente-desde-1_2021-ley-19889.html'
const DGI_LITERAL_E =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tope-ingresos-anuales-para-pequenas-empresas-iva-minimo'
const DGI_IVA_MINIMO =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/cuota-iva-minimo-valores-vigentes'
const DGI_EFACTURA_BENEF =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/beneficios-tributarios-para-contribuyentes-iva-minimo'
const DGI_ICOSA =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/impuesto-control-sociedades-anonimas-icosa-valores-2026'
const DGI_UI =
  'https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/unidad-indexada'
const SAS_TRAMITE =
  'https://www.gub.uy/tramites/registro-sociedad-acciones-simplificada-sas-persona-fisica'
const UNIP_TRAMITE = 'https://www.gub.uy/tramites/inscripcion-empresa-unipersonal'
const IRPF_ESCALA =
  'https://www.bps.gub.uy/bps/file/23860/3/2026---comunicado-r-5---valores-escalas-irpf-2026.pdf'
const DEC150_64 = 'https://www.impo.com.uy/bases/decretos/150-2007/64'
const DEC150_168 = 'https://www.impo.com.uy/bases/decretos/150-2007/168'
const LEY18083_70 = 'https://www.impo.com.uy/bases/leyes/18083-2006/70'
const LEY18874_1 = 'https://www.impo.com.uy/bases/leyes/18874-2011/1'
const LEY16060_1 = 'https://www.impo.com.uy/bases/leyes/16060-1989/1'

/** Verified 2026 constants. Nothing numeric may live outside this object. */
export const FIGURES = {
  // --- Índices ---
  uiHoy: fig(6.615, 'Unidad Indexada (13/07/2026)', DGI_UI),
  uiCierre2025: fig(6.4237, 'UI al 01/01/2026 (fija los topes 2026)', DGI_UI),
  bpc: fig(6864, 'BPC 2026', BPS_VALORES),
  bfc: fig(1847.96, 'BFC 2026', BPS_VALORES),

  // --- Topes (constantes anuales; NO recalcular con la UI de hoy) ---
  topeMonotributoUnipersonalUi: fig(183_000, 'Tope monotributo unipersonal (UI)', BPS_TOPES),
  topeMonotributoUnipersonalUyu: fig(1_175_537, 'Tope monotributo unipersonal 2026', BPS_TOPES),
  topeMonotributoSociedadUyu: fig(1_959_229, 'Tope monotributo sociedad de hecho 2026', BPS_TOPES),
  topeMonotributoActivosUyu: fig(979_614, 'Tope de activos del monotributo 2026', BPS_TOPES),
  topeLiteralEUi: fig(305_000, 'Tope Literal E (UI)', DGI_LITERAL_E),
  topeLiteralEUyu: fig(1_959_229, 'Tope Literal E 2026', DGI_LITERAL_E),
  // Dec. 150/007 art. 168 lit. b), verbatim: obligados a contabilidad suficiente "siempre que
  // sus ingresos hayan superado en el ejercicio anterior las UI 4:000.000 ... a valores de
  // cierre de ejercicio". Above it, el ficto del art. 64 deja de estar disponible (art. 64:
  // "Los contribuyentes que NO ESTÉN OBLIGADOS a llevar contabilidad suficiente podrán
  // determinar sus rentas netas en forma ficta"). Antes estaba sourced a la página de topes
  // del Literal E de DGI, que no dice nada de esto.
  topeIraePreceptivoUi: fig(
    4_000_000,
    'Tope por encima del cual la contabilidad suficiente es preceptiva y el IRAE ficto deja de estar disponible (UI, ingresos del ejercicio anterior)',
    DEC150_168
  ),
  topeLocalM2: fig(
    15,
    'Superficie máxima del local (monotributo)',
    'https://www.impo.com.uy/bases/decretos/199-2007'
  ),

  // --- Composición societaria del monotributo (Ley 18.083 art. 70 / Ley 18.874 art. 1) ---
  // Art. 70 es taxativo sobre quién puede ser monotributista: lit. B admite una sociedad
  // de hecho de hasta 2 socios sin dependientes; lit. C la extiende a 3 socios SI son
  // exclusivamente familiares (hasta 4° grado de consanguinidad o 2° de afinidad). El
  // monotributo social MIDES tiene su propio tope de socios (Ley 18.874 art. 1): no es el
  // mismo número y no debe copiarse del monotributo común.
  monotributoSociosMaxSinFamilia: fig(
    2,
    'Monotributo: máx. de socios en sociedad de hecho sin vínculo familiar (art. 70 lit. B)',
    LEY18083_70
  ),
  monotributoSociosMaxFamilia: fig(
    3,
    'Monotributo: máx. de socios en sociedad de hecho integrada exclusivamente por familiares (art. 70 lit. C)',
    LEY18083_70
  ),
  monotributoSocialSociosMax: fig(
    5,
    'Monotributo Social MIDES: máx. de socios del emprendimiento asociativo (art. 1 lit. B)',
    LEY18874_1
  ),

  // --- Pluralidad societaria (Ley 16.060 art. 1) ---
  // "Habrá sociedad comercial cuando DOS O MÁS personas, físicas o jurídicas se obliguen a
  // realizar aportes". This is the norm that sets the 2-person floor — for the SRL, for the
  // SA, and for the sociedad de hecho alike. It is NOT art. 223, which only caps the SRL at
  // 50 socios and sets no minimum at all. The SAS is the express exception: Ley 19.820
  // art. 11 lets it be constituted "por una persona física".
  pluralidadMinimaSocios: fig(
    2,
    'Mínimo de personas para que haya sociedad comercial (Ley 16.060 art. 1)',
    LEY16060_1
  ),

  // --- Monotributo (BPS, vigencia enero 2026) ---
  monoPlenoSinFonasa: fig(2637, 'Monotributo pleno, sin FONASA', BPS_MONO),
  monoPlenoFonasaSolo: fig(6327, 'Monotributo pleno, con FONASA, sin cónyuge ni hijos', BPS_MONO),
  monoPlenoFonasaHijos: fig(6996, 'Monotributo pleno, con FONASA, con hijos', BPS_MONO),
  monoPlenoFonasaConyuge: fig(7219, 'Monotributo pleno, con FONASA, con cónyuge', BPS_MONO),
  monoPlenoFonasaConyugeHijos: fig(
    7888,
    'Monotributo pleno, con FONASA, con cónyuge e hijos',
    BPS_MONO
  ),
  // La gradualidad de la Ley 19.942 rebaja el JUBILATORIO (522 / 1.045 / 2.088), no el
  // FONASA: el aporte al SNS es el mismo en los tres tramos (4.239 solo, 4.908 con hijos,
  // 5.131 con cónyuge, 5.800 con cónyuge e hijos). Por eso las cuatro columnas familiares
  // existen en los años 1 y 2 igual que en el régimen pleno — y cobrarle a todos la columna
  // "solo" durante la rampa subfacturaba hasta $1.561/mes al monotributista con familia.
  // Fuente: BPS, "monotributo-ley-19.942---2026.pdf", bloque "Aporte total" (con opción al
  // SNIS), que es inequívoco donde los encabezados del HTML no lo son.
  monoAnio1SinFonasa: fig(1071, 'Monotributo año 1 (25%), sin FONASA', BPS_MONO_GRAD),
  monoAnio1FonasaSolo: fig(
    4761,
    'Monotributo año 1 (25%), con FONASA, sin cónyuge ni hijos',
    BPS_MONO_GRAD
  ),
  monoAnio1FonasaHijos: fig(5430, 'Monotributo año 1 (25%), con FONASA, con hijos', BPS_MONO_GRAD),
  monoAnio1FonasaConyuge: fig(
    5653,
    'Monotributo año 1 (25%), con FONASA, con cónyuge',
    BPS_MONO_GRAD
  ),
  monoAnio1FonasaConyugeHijos: fig(
    6322,
    'Monotributo año 1 (25%), con FONASA, con cónyuge e hijos',
    BPS_MONO_GRAD
  ),
  monoAnio2SinFonasa: fig(1594, 'Monotributo año 2 (50%), sin FONASA', BPS_MONO_GRAD),
  monoAnio2FonasaSolo: fig(
    5284,
    'Monotributo año 2 (50%), con FONASA, sin cónyuge ni hijos',
    BPS_MONO_GRAD
  ),
  monoAnio2FonasaHijos: fig(5953, 'Monotributo año 2 (50%), con FONASA, con hijos', BPS_MONO_GRAD),
  monoAnio2FonasaConyuge: fig(
    6176,
    'Monotributo año 2 (50%), con FONASA, con cónyuge',
    BPS_MONO_GRAD
  ),
  monoAnio2FonasaConyugeHijos: fig(
    6845,
    'Monotributo año 2 (50%), con FONASA, con cónyuge e hijos',
    BPS_MONO_GRAD
  ),

  // Monotributo de una SOCIEDAD DE HECHO: BPS publica el aporte POR SOCIO y lo multiplica
  // por la cantidad de socios (tabla "Monotributo: sociedad de hecho ley 19.942": un socio
  // 522/1.045/2.088, dos socios 1.045/2.088/4.176, tres socios 1.566/3.132/6.265). Esa
  // tabla NO tiene columna de FONASA/SNS: BPS no la publica. No la inventamos.
  monoSocioSociedadHechoAnio1: fig(
    522,
    'Monotributo sociedad de hecho, año 1 (25%): jubilatorio + FRL por socio',
    BPS_MONO_GRAD
  ),
  monoSocioSociedadHechoAnio2: fig(
    1045,
    'Monotributo sociedad de hecho, año 2 (50%): jubilatorio + FRL por socio',
    BPS_MONO_GRAD
  ),
  monoSocioSociedadHecho: fig(2088, 'Monotributo, jubilatorio + FRL por socio', BPS_MONO),

  // --- Monotributo Social MIDES ---
  monoSocialAnio1SinFonasa: fig(659, 'Monotributo social año 1 (25%), sin FONASA', BPS_MONO_SOCIAL),
  monoSocialAnio2SinFonasa: fig(
    1320,
    'Monotributo social año 2 (50%), sin FONASA',
    BPS_MONO_SOCIAL
  ),
  monoSocialAnio3SinFonasa: fig(
    1979,
    'Monotributo social año 3 (75%), sin FONASA',
    BPS_MONO_SOCIAL
  ),

  // --- BPS del titular / socios ---
  bpsUnipersonalPleno: fig(8833, 'BPS titular unipersonal (11 BFC, FONASA, soltero)', BPS_IC),
  bpsUnipersonalAnio1: fig(7689, 'BPS titular unipersonal, año 1 (Ley 19.889)', BPS_GRADUAL),
  bpsUnipersonalAnio2: fig(8070, 'BPS titular unipersonal, año 2', BPS_GRADUAL),
  bpsUnipersonalAnio3: fig(8451, 'BPS titular unipersonal, año 3', BPS_GRADUAL),
  bpsUnipersonalConFonasaDeEmpleo: fig(
    5143,
    'BPS titular que ya aporta FONASA por un empleo',
    BPS_IC
  ),
  bpsSocioSrl: fig(6265, 'BPS socio de SRL con actividad (15 BFC, sin FONASA)', BPS_IC),
  // BPS "Industria y comercio", tabla "Sociedad de hecho sin dependientes": 1 socio, 11 BFC,
  // monto gravado 20.328 → total a pagar 4.594. Es POR SOCIO, y NO incluye FONASA (igual que
  // el socio de SRL). No es el titular de la unipersonal (8.833 = 11 BFC + FONASA): el socio
  // de una sociedad personal no queda amparado por el FONASA por esta actividad.
  bpsSocioSociedadHecho: fig(
    4594,
    'BPS socio de sociedad de hecho sin dependientes (11 BFC, sin FONASA)',
    BPS_IC
  ),
  bpsAdminSas: fig(10_504, 'BPS administrador de SAS (15 BFC, FONASA obligatorio)', BPS_IC),

  // --- IVA mínimo (Literal E) ---
  ivaMinimo: fig(5910, 'Cuota de IVA mínimo 2026', DGI_IVA_MINIMO),
  ivaMinimoAnio1: fig(1478, 'IVA mínimo año 1 (25%)', DGI_IVA_MINIMO),
  ivaMinimoAnio2: fig(2955, 'IVA mínimo año 2 (50%)', DGI_IVA_MINIMO),
  ivaMinimoTopeEfactura: fig(
    0.033,
    'Tope: 3,3% de los ingresos del mes con e-factura',
    DGI_EFACTURA_BENEF
  ),

  // --- Sociedades ---
  irae: fig(0.25, 'Tasa de IRAE', 'https://www.impo.com.uy/bases/todgi-2023/4-2024'),
  irpfDividendos: fig(
    0.07,
    'IRPF Cat. I sobre dividendos',
    'https://www.impo.com.uy/bases/todgi-2023/7-2024'
  ),
  icosaConstitucion: fig(55_732, 'ICOSA a la constitución (solo SA)', DGI_ICOSA),
  icosaAnual: fig(27_866, 'ICOSA anual (solo SA)', DGI_ICOSA),

  // --- Costos de constitución ---
  setupUnipersonal: fig(270, 'Timbre profesional (unipersonal)', UNIP_TRAMITE),
  setupSas: fig(2530, 'Costo estatal SAS digital (DGR + DGI + BPS)', SAS_TRAMITE),
  setupSrl: fig(540, 'Timbres SRL (sin publicaciones ni escribano)', UNIP_TRAMITE),

  // --- IRPF Cat. II ---
  irpfFictoGastos: fig(0.3, 'Ficto de gastos deducible (IRPF Cat. II)', IRPF_ESCALA),
  irpfMinimoNoImponibleMensual: fig(48_048, 'Mínimo no imponible mensual (7 BPC)', IRPF_ESCALA),

  // --- Servicios personales: BPS (verificado en Task 1) ---
  // El aporte NO es "ficto o ingreso real": es LAS DOS COSAS A LA VEZ.
  // Jubilatorio + FRL sobre un ficto FIJO, y FONASA sobre lo realmente facturado.
  spJubilatorioFicto: fig(
    4594,
    'Jubilatorio + FRL de servicios personales (11 BFC, columna SS 9/SS 99)',
    BPS_IC
  ),
  spFonasaCoefIrpf: fig(
    0.7,
    'Base de FONASA = facturado sin IVA × 70% (IRPF)',
    'https://www.bps.gub.uy/7524/base-de-calculo.html'
  ),
  spFonasaTasaSolo: fig(
    0.045,
    'Tasa FONASA personal, sin cónyuge ni hijos (base > 2,5 BPC)',
    'https://www.bps.gub.uy/10314/tasas-fonasa.html'
  ),
  spFonasaTasaHijos: fig(
    0.06,
    'Tasa FONASA personal, con hijos',
    'https://www.bps.gub.uy/10314/tasas-fonasa.html'
  ),
  spFonasaTasaConyuge: fig(
    0.065,
    'Tasa FONASA personal, con cónyuge',
    'https://www.bps.gub.uy/10314/tasas-fonasa.html'
  ),
  spFonasaTasaConyugeHijos: fig(
    0.08,
    'Tasa FONASA personal, con cónyuge e hijos',
    'https://www.bps.gub.uy/10314/tasas-fonasa.html'
  ),
  spFonasaMinimo: fig(
    5020,
    'Aporte mínimo mensual al FONASA, actividad exclusiva (75% del CPE, Decreto 25/026)',
    'https://www.bps.gub.uy/21425/actividad-exclusiva.html'
  ),
  spFacturacionMinimaAnualBpc: fig(
    30,
    'Facturación mínima anual (30 BPC) para conservar la cobertura FONASA',
    'https://www.bps.gub.uy/21425/actividad-exclusiva.html'
  ),

  // --- Ficto jubilatorio de referencia (monotributo) ---
  // BPS, verbatim: "realizan sus aportes jubilatorios y el Fondo de Reconversión Laboral
  // (FRL) sobre la base de un monto predeterminado que equivale a 5 BFC" — a DIFFERENT,
  // smaller ficto than the 11 BFC of the unipersonal titular.
  monoBfcFicto: fig(
    5,
    'BFC del ficto jubilatorio del monotributo (a diferencia de las 11 BFC de la unipersonal)',
    'https://www.bps.gub.uy/10444/aportacion-de-monotributo.html'
  ),

  // NOTE — `gradualidadAnio2Umbral` / `gradualidadAnio3Umbral` USED to live here and were
  // REMOVED (IMPORTANT 7). They were tier ORDINALS ("año 2", "año 3"), not quantities: each
  // was handed one arbitrary source and then used across four different legal regimes — the
  // "año 3" boundary was sourced to Ley 18.874 (monotributo SOCIAL) while deciding the Ley
  // 19.889 UNIPERSONAL boundary, a different law entirely. Both the AST guard and the
  // primary-domain test passed while the citation attached to the number did not support its
  // use: the exact failure the guard exists to prevent, wearing compliance as a costume. And
  // if the page ever iterates FIGURES to render "Fuentes", they would have shown up as
  // sourced legal figures. They are not. The ramps are arrays now (see `rampPick`), and the
  // boundaries are their INDICES — which is all they ever were. The VALUES in each ramp are
  // still Figures, each sourced to the norm that actually publishes it.
} as const satisfies Record<string, Figure>

/**
 * Monthly IRPF Cat. II scale for 2026, in UYU. `upTo: null` = top bracket.
 * Carries its own provenance (like a `Figure`) because it is a table, not a
 * single value, so it can't be built with `fig()`.
 */
export const IRPF_CAT2 = {
  source: IRPF_ESCALA,
  verifiedAt: V,
  brackets: Object.freeze([
    { upTo: 48_048, rate: 0 },
    { upTo: 68_640, rate: 0.1 },
    { upTo: 102_960, rate: 0.15 },
    { upTo: 205_920, rate: 0.24 },
    { upTo: 343_200, rate: 0.25 },
    { upTo: 514_800, rate: 0.27 },
    { upTo: 789_360, rate: 0.31 },
    { upTo: null, rate: 0.36 },
  ]) as ReadonlyArray<{ upTo: number | null; rate: number }>,
} as const

/**
 * IRAE ficto: the empresarial scale of Decreto 150/007 art. 64 (inciso 3º, redacción dada
 * por Dec. 71/023), for ejercicios iniciados a partir del 1/1/2023. Carries its own
 * provenance, like `IRPF_CAT2`, because it is a table rather than a single value.
 *
 * The brackets are denominated in UI and run on the ANNUAL "ventas, servicios y demás
 * rentas brutas del ejercicio". The resulting renta neta ficta is then taxed at
 * `FIGURES.irae` (25%).
 *
 * MARGINAL, NOT A SINGLE-RATE LOOKUP — and the article settles it in its own words.
 * Inciso 3º, verbatim:
 *
 *   "Para ejercicios iniciados a partir del 1º de enero de 2023, a las ventas, servicios y
 *    demás rentas brutas del ejercicio COMPRENDIDAS EN CADA TRAMO, se aplicará el porcentaje
 *    correspondiente A DICHO TRAMO, de acuerdo a la siguiente escala".
 *
 * "comprendidas en cada tramo ... el porcentaje correspondiente a dicho tramo" is a
 * bracket-by-bracket instruction: each SLICE of revenue carries its own percentage. The
 * contrast with the inciso it replaced is deliberate and decisive — the old (pre-2023)
 * scale, still visible right above it in the norm, WAS a lookup: "la renta neta se
 * determinará ... a la cifra que resulte de MULTIPLICAR las ventas, servicios y demás
 * rentas brutas del ejercicio POR EL PORCENTAJE QUE CORRESPONDA según la siguiente escala".
 * The 2023 redacción swapped that wording out. So: marginal.
 *
 * (Had the text been ambiguous, the conservative reading — the one that does not understate
 * the tax — would have been the single-rate lookup, since the upper tramos are far higher.
 * It is not ambiguous, so we implement what it says.)
 */
export const IRAE_FICTO = {
  source: DEC150_64,
  verifiedAt: V,
  brackets: Object.freeze([
    { upToUi: 1_000_000, rate: 0.12 },
    { upToUi: 2_000_000, rate: 0.14 },
    { upToUi: 3_000_000, rate: 0.48 },
    { upToUi: null, rate: 0.6 },
  ]) as ReadonlyArray<{ upToUi: number | null; rate: number }>,
} as const

/** UYU value of `ui` Unidades Indexadas, at the UI we publish. */
const uiToUyu = (unidades: number): number => unidades * FIGURES.uiHoy.value

/**
 * Renta neta ficta (ANNUAL, UYU) for an annual gross revenue, applying the art. 64 tramos
 * marginally. Exported so the tests can pin the arithmetic independently of `estimateCost`.
 *
 * Does NOT deduct "los sueldos de dueños o socios admitidos por la reglamentación", which
 * art. 64 subtracts from the ficto — we do not collect whether the owner draws a sueldo. The
 * omission is CONSERVATIVE (it overstates the IRAE); `estimateCost` discloses it.
 */
export function iraeFictoRentaNetaAnual(annualRevenueUyu: number): number {
  if (annualRevenueUyu <= 0) return 0
  let renta = 0
  let floor = 0
  for (const b of IRAE_FICTO.brackets) {
    const ceiling = b.upToUi === null ? Infinity : uiToUyu(b.upToUi)
    if (annualRevenueUyu <= floor) break
    const slice = Math.min(annualRevenueUyu, ceiling) - floor
    renta += slice * b.rate
    floor = ceiling
  }
  return renta
}

/**
 * Is the ficto legally available at this revenue? Dec. 150/007 art. 168 lit. b): above
 * UI 4.000.000 of ingresos, contabilidad suficiente is PRECEPTIVA, and art. 64 opens with
 * "Los contribuyentes que NO ESTÉN OBLIGADOS a llevar contabilidad suficiente podrán
 * determinar sus rentas netas en forma ficta". Above the tope, the tax is IRAE REAL — 25%
 * of (ingresos − gastos reales) — which depends on an expense structure this model does not
 * have, and must not be faked by extrapolating the ficto past its legal range.
 *
 * Approximation we own: the norm tests the ingresos of the EJERCICIO ANTERIOR at the UI de
 * CIERRE, and we only have the visitor's estimated annual revenue at today's UI.
 */
function iraeFictoDisponible(annualRevenueUyu: number): boolean {
  return annualRevenueUyu <= uiToUyu(FIGURES.topeIraePreceptivoUi.value)
}

export type RegimeId =
  | 'monotributo-social'
  | 'monotributo'
  | 'unipersonal-literal-e'
  | 'irpf-servicios'
  | 'unipersonal-irae'
  | 'sociedad-hecho'
  | 'srl'
  | 'sas'
  | 'sa'

export type Eligibility = 'elegible' | 'dudoso' | 'excluido'

/** Why a regime was ruled out (or flagged), always with the norm that says so. */
export interface GateReason {
  status: 'excluido' | 'dudoso'
  text: string
  norm: string
  url: string
}

/** How long you are barred from coming back after leaving a regime. */
export interface Lockout {
  years: number
  text: string
  norm: string
  url: string
}

export interface Source {
  label: string
  url: string
}

export interface Regime {
  id: RegimeId
  name: string
  short: string
  liability: 'ilimitada' | 'limitada'
  lockout?: Lockout
  sources: readonly Source[]
}

const L = {
  ley18083_70: {
    norm: 'Ley 18.083 art. 70',
    url: 'https://www.impo.com.uy/bases/leyes/18083-2006/70',
  },
  ley18083_71: {
    norm: 'Ley 18.083 art. 71',
    url: 'https://www.impo.com.uy/bases/leyes/18083-2006/71',
  },
  ley18083_72: {
    norm: 'Ley 18.083 art. 72',
    url: 'https://www.impo.com.uy/bases/leyes/18083-2006/72',
  },
  ley18874_1: {
    norm: 'Ley 18.874 art. 1',
    url: LEY18874_1,
  },
  ley18874_2: {
    norm: 'Ley 18.874 art. 2',
    url: 'https://www.impo.com.uy/bases/leyes/18874-2011/2',
  },
  ley18874_4: {
    norm: 'Ley 18.874 art. 4',
    url: 'https://www.impo.com.uy/bases/leyes/18874-2011/4',
  },
  dto199: { norm: 'Decreto 199/007', url: 'https://www.impo.com.uy/bases/decretos/199-2007' },
  titulo4_66E: {
    norm: 'Título 4 art. 66 lit. E',
    url: 'https://www.impo.com.uy/bases/todgi-2023/4-2024',
  },
  // IRPF is Título 7. Título 4 is IRAE — a different tax on a different taxpayer, and the
  // wrong authority for anything said about servicios personales as renta de trabajo.
  // Título 7 art. 45: "Serán rentas de esta naturaleza, las originadas en la prestación de
  // servicios personales fuera de la relación de dependencia".
  titulo7: {
    norm: 'Título 7 (IRPF) art. 45',
    url: 'https://www.impo.com.uy/bases/todgi-2023/7-2024',
  },
  consulta4761: {
    norm: 'Consulta DGI 4761',
    url: 'https://www.impo.com.uy/bases/consultas-tributarias/4761-2008',
  },
  // The 2-person floor of every sociedad comercial. NOT art. 223, which caps the SRL at 50
  // socios and sets no minimum whatsoever.
  ley16060_1: {
    norm: 'Ley 16.060 art. 1',
    url: LEY16060_1,
  },
  // Solidary, unlimited liability of the socios of a sociedad de hecho: "los socios serán
  // responsables solidariamente por las obligaciones sociales sin poder invocar el beneficio
  // de excusión". This governs SOCIEDADES — it says nothing about a persona física.
  ley16060_39: {
    norm: 'Ley 16.060 art. 39',
    url: 'https://www.impo.com.uy/bases/leyes/16060-1989/39',
  },
  // A monotributista / unipersonal / IRPF taxpayer is a PERSONA FÍSICA, not a sociedad. The
  // source of their unlimited liability is the prenda general: "Los bienes todos del deudor,
  // exceptuándose los no embargables, son la garantía común de sus acreedores".
  codigoCivil2372: {
    norm: 'Código Civil art. 2372',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/2372',
  },
  // Ley 16.060 has nothing to say about the unipersonal: it is not a sociedad at all. The
  // authority for "one titular" is the DGI/BPS registration itself.
  unipersonal: {
    norm: 'DGI/BPS — Inscripción de empresa unipersonal',
    url: UNIP_TRAMITE,
  },
} as const

/** What the visitor told the wizard. */
export interface WizardInput {
  /** Estimated annual revenue, in UYU. */
  annualRevenueUyu: number
  sells: 'bienes' | 'servicios' | 'ambos'
  clients: 'consumidor-final' | 'empresas' | 'exterior' | 'mixto'
  people: 'solo' | 'conyuge' | 'socios'
  /**
   * Total number of socios in the sociedad de hecho, INCLUDING the visitor. Only
   * meaningful when `people === 'socios'` — a `'solo'`/`'conyuge'` visitor is asking
   * about the unipersonal branch of Ley 18.083 art. 70 lit. A, which has no socio count.
   *
   * Art. 70 lits. B and C are taxative about who may be a monotributista sociedad de
   * hecho: at most 2 socios with zero dependientes (lit. B), or at most 3 if
   * `sociosFamiliares` is true (lit. C). When this is left `undefined` for a `'socios'`
   * visitor, the gate must NOT guess 2 — a fact that decides legality has to be asked
   * for, not assumed. See `applyGates`, which returns `dudoso` in that case.
   */
  sociosCount?: number
  /**
   * Whether every socio in the sociedad de hecho is a familiar within the degrees Ley
   * 18.083 art. 70 lit. C requires (hasta 4° grado de consanguinidad o 2° de afinidad).
   * Only meaningful together with `sociosCount`, when `people === 'socios'`. It raises
   * the cap from 2 socios (lit. B) to 3 (lit. C); a `false`/`undefined` value falls back
   * to the stricter 2-socio, non-family cap — it never widens anything on its own.
   */
  sociosFamiliares?: boolean
  /**
   * Number of dependientes. Meaningfully 0, 1, or "2 o más" — kept as `number`
   * (not a `0 | 1 | 2` literal union) because the file's own no-unsourced-number
   * guard walks the AST for `ts.NumericLiteral` nodes and does not distinguish
   * type positions from value positions: a literal type `0 | 1 | 2` would trip it
   * on the bare `2`, which is not a legal/financial figure and does not belong in
   * FIGURES or the STRUCTURAL_ALLOWLIST either.
   */
  employees: number
  /** Has employees, debt, credit inventory, contracts with penalties, or can harm third parties. */
  needsLimitedLiability: boolean
  /** Already a socio of another sociedad personal, or a director of an SA — even a dormant one. */
  otherCompanyRole: boolean
  /** Qualified by MIDES (household below the poverty line). */
  midesEligible?: boolean
  /** Local larger than 15 m², or inside a shopping centre. */
  localTooBig?: boolean
  /** Business assets, in UYU. */
  assetsUyu?: number
  /** Documents every operation by e-factura (unlocks the 3,3% IVA mínimo cap). */
  eFactura?: boolean
  /** Full years already operating. 0 = brand new (unlocks the gradual regimes). */
  yearsOperating?: number
  /** Drives the FONASA column of the BPS tables. */
  family?: 'solo' | 'con-hijos' | 'con-conyuge' | 'con-conyuge-e-hijos'
  /** Already covered by FONASA through a salaried job. */
  fonasaFromJob?: boolean
  /**
   * Holds a university title covered by the CJPPU (contador, abogado, arquitecto,
   * ingeniero, médico…) and exercises it. Their JUBILATORIO goes to the CJPPU, not
   * to BPS, on a scale the CJPPU does not publish openly — so we must NOT show them
   * the BPS ficto. Their FONASA still goes to BPS.
   *
   * BPS's own test is the ACTIVITY, "tengan o no título universitario": a software
   * developer is `no profesional` (VF 92) and pays BPS. See spec §5.5-ter.
   */
  cajaProfesional?: boolean
}

export interface GateOutcome {
  regime: RegimeId
  status: Eligibility
  reasons: GateReason[]
}

const uyu = (n: number) => `$${Math.round(n).toLocaleString('es-UY')}`

/**
 * Rule each regime in or out on LEGAL grounds alone. Cost never enters here: a
 * regime you don't qualify for isn't "more expensive", it's illegal.
 *
 * `dudoso` is reserved for a genuine legal grey zone (a freelance in Literal E),
 * where we surface the tension rather than pretend to resolve it.
 */
export function applyGates(input: WizardInput): GateOutcome[] {
  const servicios = input.sells === 'servicios'
  const anyServicios = input.sells === 'servicios' || input.sells === 'ambos'
  const socios = input.people === 'socios'

  return REGIMES.map(regime => {
    const reasons: GateReason[] = []
    const out = (text: string, l: { norm: string; url: string }) =>
      reasons.push({ status: 'excluido', text, norm: l.norm, url: l.url })
    const doubt = (text: string, l: { norm: string; url: string }) =>
      reasons.push({ status: 'dudoso', text, norm: l.norm, url: l.url })

    // Unlimited liability kills every simple regime when the visitor needs a shield — but the
    // NORM that imposes it depends on what the taxpayer IS. A sociedad de hecho's socios are
    // liable under Ley 16.060 art. 39 (solidary, no beneficio de excusión). A monotributista,
    // a unipersonal or an IRPF taxpayer is a PERSONA FÍSICA — not a sociedad, so art. 39 has
    // nothing to say about them. Their exposure is the prenda general of Código Civil
    // art. 2372: "Los bienes todos del deudor ... son la garantía común de sus acreedores".
    if (input.needsLimitedLiability && regime.liability === 'ilimitada') {
      if (regime.id === 'sociedad-hecho') {
        out(
          'Necesitás responsabilidad limitada, y acá respondés con tu patrimonio personal, en forma solidaria con los demás socios y sin beneficio de excusión.',
          L.ley16060_39
        )
      } else {
        out(
          'Necesitás responsabilidad limitada, y en esta figura respondés con tu patrimonio personal: no hay separación entre vos y la empresa.',
          L.codigoCivil2372
        )
      }
    }

    // A sociedad needs "dos o más personas" (Ley 16.060 art. 1). One socio is not a legal
    // outcome, it is inconsistent input — we say so rather than silently rating it elegible.
    const minSocios = FIGURES.pluralidadMinimaSocios.value
    const sociosCountInconsistent =
      socios && input.sociosCount !== undefined && input.sociosCount < minSocios
    const flagInconsistentSociosCount = () => {
      if (sociosCountInconsistent) {
        doubt(
          `Nos dijiste que sos ${String(input.sociosCount)} socio(s), pero una sociedad requiere un mínimo de ${minSocios} personas. Revisá el dato: si en realidad vas solo, corresponde la rama unipersonal.`,
          L.ley16060_1
        )
      }
    }

    switch (regime.id) {
      // Monotributo Social is governed by Ley 18.874 and its reglamento (Decreto 220/012) —
      // NOT by Ley 18.083 arts. 71-72. Art. 1, verbatim: "Quienes producen y comercializan
      // bienes Y PRESTAN SERVICIOS, no tengan personal dependiente y cumplan con las
      // condiciones establecidas en LOS ARTÍCULOS SIGUIENTES" — i.e. 18.874's own arts. 2-4.
      // So: servicios personales are ALLOWED; there is NO consumidor-final rule, NO 15 m²
      // local rule, and NO activos ceiling. Gating this regime on art. 71/72 denied it to
      // exactly the below-poverty-line households it was written for.
      case 'monotributo-social': {
        if (!input.midesEligible) {
          out(
            'Requiere calificación previa de MIDES: el hogar debe estar bajo la línea de pobreza o en situación de vulnerabilidad. La calificación es previa y está exclusivamente a cargo del MIDES.',
            L.ley18874_2
          )
        }
        // Art. 1: "no tengan personal dependiente" — zero, with no unipersonal exception.
        if (input.employees > 0) {
          out(
            'El monotributo social no admite ningún dependiente: el art. 1 exige que no tengan personal dependiente.',
            L.ley18874_1
          )
        }
        if (socios) {
          flagInconsistentSociosCount()
          const maxSocial = FIGURES.monotributoSocialSociosMax.value
          if (input.sociosCount === undefined) {
            doubt(
              `El monotributo social admite un emprendimiento asociativo de hasta ${maxSocial} socios, sin dependientes. No sabemos cuántos socios son: necesitamos ese dato para confirmar si calificás.`,
              L.ley18874_1
            )
          } else if (input.sociosCount > maxSocial) {
            out(
              `El monotributo social admite un emprendimiento asociativo de hasta ${maxSocial} socios.`,
              L.ley18874_1
            )
          }
        }
        // Art. 4 sets its own tope: 60% del límite para el unipersonal, 100% para el
        // asociativo — los mismos importes que ya tenemos verificados.
        const topeSocial = socios
          ? FIGURES.topeMonotributoSociedadUyu.value
          : FIGURES.topeMonotributoUnipersonalUyu.value
        if (input.annualRevenueUyu > topeSocial) {
          out(`Superás el tope de ingresos (${uyu(topeSocial)} al año en 2026).`, L.ley18874_4)
        }
        break
      }

      case 'monotributo': {
        if (anyServicios) {
          out(
            'El monotributo excluye a quienes prestan servicios personales fuera de la relación de dependencia.',
            L.ley18083_72
          )
        }
        if (input.otherCompanyRole) {
          out(
            'No podés ser monotributista si sos socio de otra sociedad personal o director de una SA, aun cuando esté inactiva.',
            L.ley18083_72
          )
        }
        // Art. 70 is taxative about who may be a monotributista:
        //   lit. A — empresa unipersonal (incl. cónyuge/concubino colaborador), máx. 1 dependiente
        //   lit. B — sociedad de hecho de hasta 2 socios, sin dependientes
        //   lit. C — sociedad de hecho de hasta 3 socios SI son exclusivamente familiares
        //            (hasta 4° grado de consanguinidad o 2° de afinidad), sin dependientes
        // A sociedad de hecho of 2 (or 3, if family) socios genuinely CAN be a monotributista
        // — it is NOT excluded outright.
        if (socios) {
          flagInconsistentSociosCount()
          const maxSinFamilia = FIGURES.monotributoSociosMaxSinFamilia.value
          const maxFamilia = FIGURES.monotributoSociosMaxFamilia.value
          if (input.sociosCount === undefined) {
            doubt(
              `El monotributo está disponible para una sociedad de hecho de hasta ${maxSinFamilia} socios, o hasta ${maxFamilia} si son todos familiares (hasta 4° grado de consanguinidad o 2° de afinidad). No sabemos cuántos socios son: necesitamos ese dato para confirmar si calificás.`,
              L.ley18083_70
            )
          } else if (input.sociosFamiliares) {
            if (input.sociosCount > maxFamilia) {
              out(
                `Como sociedad de hecho integrada exclusivamente por familiares, el monotributo admite como máximo ${maxFamilia} socios.`,
                L.ley18083_70
              )
            }
          } else if (input.sociosCount > maxSinFamilia) {
            out(
              `El monotributo admite como máximo ${maxSinFamilia} socios sin vínculo familiar (hasta ${maxFamilia} si son todos familiares).`,
              L.ley18083_70
            )
          }
        }
        // Art. 71 lit. D, verbatim: "Enajenen bienes y presten servicios EXCLUSIVAMENTE a
        // consumidores finales." Exclusivamente is the whole condition.
        if (input.clients === 'empresas') {
          out(
            'El régimen exige vender exclusivamente a consumidores finales, y una empresa que compra para su giro no lo es.',
            L.ley18083_71
          )
        }
        if (input.clients === 'mixto') {
          out(
            'El régimen exige vender EXCLUSIVAMENTE a consumidores finales: una clientela mixta (parte consumidores finales, parte empresas) no cumple esa exclusividad, aunque la mayoría de tus ventas sean a consumidores.',
            L.ley18083_71
          )
        }
        // Exporting is NOT settled by the text. A foreign end consumer IS a consumidor final,
        // and lit. D says nothing about the buyer being domestic — the article only empowers
        // the Poder Ejecutivo to carve out exceptions "en función de la naturaleza de los
        // bienes y servicios". So we surface the tension instead of inventing an exclusion.
        if (input.clients === 'exterior') {
          doubt(
            'La norma exige vender exclusivamente a consumidores finales, pero no dice nada sobre si el comprador puede estar en el exterior — y un consumidor final del exterior sigue siendo un consumidor final. Que una exportación califique no está resuelto por el texto: consultá un contador. (Si lo que exportás son servicios, el punto suele ser abstracto: el art. 72 lit. C ya excluye del monotributo a los servicios personales.)',
            L.ley18083_71
          )
        }
        // Lits. B and C both say "sin dependientes": a sociedad de hecho admits none, even
        // though the unipersonal (lit. A) may have 1.
        const maxEmployees = socios ? 0 : 1
        if (input.employees > maxEmployees) {
          if (socios) {
            out(
              'La sociedad de hecho monotributista no admite ningún dependiente: los lits. B y C del art. 70 exigen "sin dependientes".',
              L.ley18083_70
            )
          } else {
            out('La unipersonal monotributista admite como máximo 1 dependiente.', L.ley18083_70)
          }
        }
        if (input.localTooBig) {
          out(
            'El local no puede superar los 15 m² ni estar dentro de un centro comercial.',
            L.dto199
          )
        }
        const tope = socios
          ? FIGURES.topeMonotributoSociedadUyu.value
          : FIGURES.topeMonotributoUnipersonalUyu.value
        if (input.annualRevenueUyu > tope) {
          out(`Superás el tope de ingresos (${uyu(tope)} al año en 2026).`, L.ley18083_71)
        }
        if (
          input.assetsUyu !== undefined &&
          input.assetsUyu > FIGURES.topeMonotributoActivosUyu.value
        ) {
          out(
            `Superás el tope de activos (${uyu(FIGURES.topeMonotributoActivosUyu.value)}).`,
            L.dto199
          )
        }
        break
      }

      case 'unipersonal-literal-e':
      case 'unipersonal-irae': {
        // Ley 16.060 governs SOCIEDADES; a unipersonal is not one, so it is the wrong
        // authority here. The DGI/BPS registration is what defines the single titular.
        if (socios) {
          out('Una unipersonal, por definición, tiene un solo titular.', L.unipersonal)
        }
        if (regime.id === 'unipersonal-literal-e') {
          if (input.annualRevenueUyu > FIGURES.topeLiteralEUyu.value) {
            out(
              `Superás el tope del Literal E (${uyu(FIGURES.topeLiteralEUyu.value)} al año en 2026).`,
              L.titulo4_66E
            )
          }
          if (servicios) {
            doubt(
              'El Literal E excluye a quien obtiene rentas NO empresariales, y los servicios personales puros son renta de trabajo, no renta empresarial. En la práctica se hace, pero la norma está en tensión: consultá un contador.',
              L.consulta4761
            )
          }
        }
        break
      }

      case 'irpf-servicios': {
        // IRPF is Título 7. Título 4 is IRAE — a different tax entirely.
        if (socios) {
          out('Es el régimen de una persona física, no de una sociedad.', L.titulo7)
        }
        if (!anyServicios) {
          out(
            'Aplica a servicios personales fuera de la relación de dependencia, no a la venta de bienes.',
            L.titulo7
          )
        }
        break
      }

      case 'sociedad-hecho': {
        if (!socios) {
          out(
            `Requiere dos o más personas operando juntas: habrá sociedad cuando ${minSocios} o más personas se obliguen a realizar aportes.`,
            L.ley16060_1
          )
        }
        flagInconsistentSociosCount()
        break
      }

      // Ley 16.060 art. 1's pluralidad requirement ("Habrá sociedad comercial cuando DOS O MÁS
      // personas...") applies to the SRL and the SA IDENTICALLY. Gating one and not the other
      // was arbitrary. The SAS is the genuine exception — Ley 19.820 art. 11 lets it be
      // constituted "por una persona física" — so it stays ungated.
      case 'srl':
      case 'sa': {
        if (!socios) {
          const figura = regime.id === 'srl' ? 'La SRL' : 'La SA'
          out(
            `${figura} exige un mínimo de ${minSocios} socios. Si vas solo, la figura equivalente es la SAS, que sí puede constituirse por una sola persona física.`,
            L.ley16060_1
          )
        }
        flagInconsistentSociosCount()
        break
      }

      case 'sas':
        break
    }

    const status: Eligibility = reasons.some(r => r.status === 'excluido')
      ? 'excluido'
      : reasons.some(r => r.status === 'dudoso')
        ? 'dudoso'
        : 'elegible'

    return { regime: regime.id, status, reasons }
  })
}

export const REGIMES: readonly Regime[] = Object.freeze([
  {
    id: 'monotributo-social',
    name: 'Monotributo Social MIDES',
    short:
      'Para emprendimientos de hogares en situación de vulnerabilidad. Requiere calificación previa de MIDES.',
    liability: 'ilimitada',
    lockout: {
      years: 3,
      text: 'Si superás el tope quedás fuera; podés volver al ejercicio siguiente con el aval de MIDES.',
      norm: 'Ley 18.874 art. 4',
      url: 'https://www.impo.com.uy/bases/leyes/18874-2011/4',
    },
    sources: [
      { label: 'BPS — Monotributo social', url: BPS_MONO_SOCIAL },
      { label: 'Ley 18.874', url: 'https://www.impo.com.uy/bases/leyes/18874-2011' },
      {
        label: 'Decreto 220/012 (reglamento)',
        url: 'https://www.impo.com.uy/bases/decretos/220-2012',
      },
    ],
  },
  {
    id: 'monotributo',
    name: 'Monotributo',
    short:
      'Un pago único que sustituye impuestos y aportes. Solo unipersonales y sociedades de hecho que venden a consumidor final.',
    liability: 'ilimitada',
    lockout: {
      years: 3,
      text: 'Si incumplís cualquier condición salís de pleno derecho e inmediato, y no podés volver hasta que termine el tercer año civil posterior. Aplica incluso si te vas voluntariamente.',
      norm: 'Decreto 199/007 arts. 13 y 14',
      url: 'https://www.impo.com.uy/bases/decretos/199-2007',
    },
    sources: [
      { label: 'BPS — Monotributo', url: BPS_MONO },
      { label: 'Ley 18.083 arts. 70-84', url: 'https://www.impo.com.uy/bases/leyes/18083-2006/70' },
    ],
  },
  {
    id: 'unipersonal-literal-e',
    name: 'Unipersonal — Literal E',
    short:
      'Pequeña empresa: exonerada de IRAE, paga IVA mínimo. Con e-factura, el IVA mínimo pasa a ser el menor entre la cuota y el 3,3% de lo facturado.',
    liability: 'ilimitada',
    lockout: {
      years: 3,
      text: 'Si superás el tope liquidás IRAE desde el excedente, en ese mismo ejercicio, y quedás obligado a liquidar IRAE por un mínimo de 3 ejercicios.',
      norm: 'Título 4 art. 66 lit. E',
      url: 'https://www.impo.com.uy/bases/todgi-2023/4-2024',
    },
    sources: [
      { label: 'DGI — Tope de ingresos, pequeñas empresas', url: DGI_LITERAL_E },
      { label: 'DGI — Beneficios de e-factura (3,3%)', url: DGI_EFACTURA_BENEF },
    ],
  },
  {
    id: 'irpf-servicios',
    name: 'Servicios personales — IRPF Cat. II',
    short:
      'El camino del profesional independiente: IRPF progresivo con mínimo no imponible, 30% de gastos fictos, e IVA con exportación a tasa 0%.',
    liability: 'ilimitada',
    sources: [{ label: 'BPS — Escalas de IRPF 2026', url: IRPF_ESCALA }],
  },
  {
    id: 'unipersonal-irae',
    name: 'Unipersonal — IRAE',
    short:
      'Cuando superás el tope de Literal E: IRAE al 25% (ficto o real) más IVA en régimen general.',
    liability: 'ilimitada',
    sources: [{ label: 'Título 4 (IRAE)', url: 'https://www.impo.com.uy/bases/todgi-2023/4-2024' }],
  },
  {
    id: 'sociedad-hecho',
    name: 'Sociedad de hecho',
    short:
      'Se configura sola cuando dos personas operan juntas sin formalizar. Responsabilidad solidaria e ilimitada, y cualquier socio puede disolverla.',
    liability: 'ilimitada',
    sources: [
      { label: 'Ley 16.060 arts. 36-43', url: 'https://www.impo.com.uy/bases/leyes/16060-1989' },
    ],
  },
  {
    id: 'srl',
    name: 'SRL',
    short:
      'Responsabilidad limitada, mínimo 2 socios. Ceder cuotas exige unanimidad si son 5 socios o menos, más escribano y publicación.',
    liability: 'limitada',
    sources: [{ label: 'Ley 16.060', url: 'https://www.impo.com.uy/bases/leyes/16060-1989' }],
  },
  {
    id: 'sas',
    name: 'SAS',
    short:
      'Responsabilidad limitada con un solo socio, sin capital mínimo, sin escribano y 100% online. Pero el administrador paga BPS aunque no facture.',
    liability: 'limitada',
    sources: [
      { label: 'Ley 19.820', url: 'https://www.impo.com.uy/bases/leyes/19820-2019' },
      { label: 'Trámite SAS digital', url: SAS_TRAMITE },
    ],
  },
  {
    id: 'sa',
    name: 'SA',
    short:
      'Cara y lenta: escritura pública, control de la AIN, y ICOSA para siempre. Hoy rara vez conviene a una empresa chica.',
    liability: 'limitada',
    sources: [{ label: 'DGI — ICOSA 2026', url: DGI_ICOSA }],
  },
])

/**
 * What a regime costs — or, where we cannot know, an explicit admission that we cannot.
 *
 * INCOMPLETENESS IS MACHINE-READABLE. It used to be a substring in `notes` while the
 * numbers quietly said something else: `bpsMonthly = sp ?? 0` turned "we cannot know this"
 * into "this is free" the moment it crossed the function boundary, and a CJPPU professional
 * came back with `totalAnnual: 0`. A consumer that RANKS regimes would have put the most
 * expensive path first, as the cheapest, with a footnote nobody reads.
 *
 * THE CONTRACT, for any consumer that compares or ranks these (Task 5):
 *   `totalMonthly` / `totalAnnual` are `null` IF AND ONLY IF some component is unknown
 *   (`bpsUnknown || taxUnknown`). A null total is NOT zero, NOT cheap, and NOT comparable.
 *   REFUSE TO RANK IT — show it separately, with its `notes`. Never `?? 0` it, never
 *   `?? Infinity` it into a sort and call that handled.
 */
export interface CostBreakdown {
  /** Owner's BPS contribution, UYU/month. `null` when we cannot source it. */
  bpsMonthly: number | null
  /** True iff `bpsMonthly` is null. Never infer this from the text of `notes`. */
  bpsUnknown: boolean
  /**
   * Revenue-dependent tax, UYU/month (IVA mínimo, IRPF, IRAE ficto — whichever applies).
   * `null` when the tax cannot be modelled at all: IRAE real, above the ficto's legal
   * range, or an SA (always contabilidad suficiente).
   */
  taxMonthly: number | null
  /** True iff `taxMonthly` is null. */
  taxUnknown: boolean
  /** Fixed taxes that do not depend on the renta and stay knowable regardless (ICOSA). */
  otherTaxesMonthly: number
  /** Market estimate (`MARKET_ESTIMATES.contadorMensual`), NOT an official figure. */
  accountantMonthly: number
  /** `null` iff the cost is incomplete. See the contract above. */
  totalMonthly: number | null
  /** `null` iff the cost is incomplete. See the contract above. */
  totalAnnual: number | null
  /**
   * The sum of the components we DO know. For DISPLAY only — so an incomplete regime can
   * still show the reader something real ("al menos X, más lo que no podemos calcular").
   * It is NOT a total and must never be ranked against one.
   */
  knownPartialMonthly: number
  /** One-off cost to open, UYU. */
  setupCost: number
  /** Plain-language caveats shown under the number. */
  notes: string[]
}

/** Monthly IRPF Cat. II on an already-net taxable amount, applying the brackets marginally. */
export function irpfCat2Monthly(taxableMonthly: number): number {
  if (taxableMonthly <= 0) return 0
  let tax = 0
  let floor = 0
  for (const b of IRPF_CAT2.brackets) {
    const ceiling = b.upTo ?? Infinity
    if (taxableMonthly <= floor) break
    const slice = Math.min(taxableMonthly, ceiling) - floor
    tax += slice * b.rate
    floor = ceiling
  }
  return tax
}

/**
 * Pick the tier of a gradual regime by full years of activity: `ramp[0]` is the first year,
 * `ramp[1]` the second, and anything past the end of the ramp is the full (pleno) figure.
 *
 * The tier boundaries ("año 2", "año 3") are ORDINALS — they are the INDICES of this array.
 * They are deliberately NOT FIGURES entries: a URL bolted onto the number `2` would be
 * provenance theatre, not provenance (and the one we used to have cited the wrong law
 * entirely — see the NOTE at the end of FIGURES). The VALUES in each ramp are Figures, each
 * sourced to the norm that actually publishes it. That is where the sourcing belongs.
 */
const rampPick = <T>(ramp: readonly T[], pleno: T, yearsOperating?: number): T => {
  const y = Math.floor(Math.max(0, yearsOperating ?? 0))
  return ramp[y] ?? pleno
}

/** The BPS monotributo column (año 1 / año 2 / pleno) for a family situation. */
function monoFamilyColumn(input: WizardInput): { ramp: number[]; pleno: number } {
  switch (input.family ?? 'solo') {
    case 'con-hijos':
      return {
        ramp: [FIGURES.monoAnio1FonasaHijos.value, FIGURES.monoAnio2FonasaHijos.value],
        pleno: FIGURES.monoPlenoFonasaHijos.value,
      }
    case 'con-conyuge':
      return {
        ramp: [FIGURES.monoAnio1FonasaConyuge.value, FIGURES.monoAnio2FonasaConyuge.value],
        pleno: FIGURES.monoPlenoFonasaConyuge.value,
      }
    case 'con-conyuge-e-hijos':
      return {
        ramp: [
          FIGURES.monoAnio1FonasaConyugeHijos.value,
          FIGURES.monoAnio2FonasaConyugeHijos.value,
        ],
        pleno: FIGURES.monoPlenoFonasaConyugeHijos.value,
      }
    default:
      return {
        ramp: [FIGURES.monoAnio1FonasaSolo.value, FIGURES.monoAnio2FonasaSolo.value],
        pleno: FIGURES.monoPlenoFonasaSolo.value,
      }
  }
}

/**
 * BPS of a monotributista. Returns `null` when we cannot know it.
 *
 * Two things used to be wrong here:
 *   - the family switch was only reached from year 2 on, so a year-1 monotributista con
 *     cónyuge e hijos was charged the SOLO column (4.761 instead of 6.322). BPS publishes
 *     all four family columns for the ramp years too — the gradualidad rebaja el
 *     jubilatorio, not el FONASA — so there was never anything to derive.
 *   - a sociedad de hecho was priced as a single unipersonal at the PLENO column (6.327),
 *     for any number of socios, while the per-socio figure BPS publishes for exactly this
 *     went unreferenced.
 */
function monoBps(input: WizardInput): number | null {
  if (input.people === 'socios') {
    // A fact that decides the number is asked for, not assumed. (Guessing 2 here would be
    // the same class of bug as `sp ?? 0`: an unknown quietly becoming a measurement.)
    if (input.sociosCount === undefined) return null
    const perSocio = rampPick(
      [FIGURES.monoSocioSociedadHechoAnio1.value, FIGURES.monoSocioSociedadHechoAnio2.value],
      FIGURES.monoSocioSociedadHecho.value,
      input.yearsOperating
    )
    return perSocio * input.sociosCount
  }
  const { ramp, pleno } = monoFamilyColumn(input)
  return rampPick(ramp, pleno, input.yearsOperating)
}

/**
 * Titular of a unipersonal: ficto of 11 BFC.
 *
 * The Ley 19.889 art. 229 ramp (75%/50%/25% off the patronal jubilatorio) is NOT a
 * general "new company" discount: art. 229 → art. 228 → art. 30 Ley 18.083 = the
 * LITERAL E regime, and art. 229 says the exoneration "cesará en la hipótesis en que
 * el contribuyente ingrese al régimen general de liquidación del IVA". So it applies
 * to Literal E and NOT to a unipersonal in IRAE/IVA general. Passing `gradual: false`
 * is what keeps us from promising a discount that does not exist.
 *
 * `fonasaFromJob` short-circuits the ramp: BPS publishes a single figure for the titular who
 * already has FONASA por un empleo, and does NOT publish a ramped version of that column. We
 * do not derive one — we show the full figure and say so (`unipersonalBpsNotes`). It is the
 * conservative direction (it may overstate), but an undisclosed conservatism is still a lie.
 */
function unipersonalBps(input: WizardInput, gradual: boolean): number {
  if (input.fonasaFromJob) return FIGURES.bpsUnipersonalConFonasaDeEmpleo.value
  if (!gradual) return FIGURES.bpsUnipersonalPleno.value
  return rampPick(
    [
      FIGURES.bpsUnipersonalAnio1.value,
      FIGURES.bpsUnipersonalAnio2.value,
      FIGURES.bpsUnipersonalAnio3.value,
    ],
    FIGURES.bpsUnipersonalPleno.value,
    input.yearsOperating
  )
}

/** The FONASA rate a servicios-personales provider pays, by family situation. */
function spFonasaRate(input: WizardInput): number {
  switch (input.family ?? 'solo') {
    case 'con-hijos':
      return FIGURES.spFonasaTasaHijos.value
    case 'con-conyuge':
      return FIGURES.spFonasaTasaConyuge.value
    case 'con-conyuge-e-hijos':
      return FIGURES.spFonasaTasaConyugeHijos.value
    default:
      return FIGURES.spFonasaTasaSolo.value
  }
}

/**
 * BPS for a servicios-personales provider. Two components on two DIFFERENT bases —
 * this is the single most misreported figure on the Uruguayan internet:
 *   - jubilatorio + FRL: a FLAT ficto (11 BFC) → $4.594, no matter what you bill;
 *   - FONASA: on your REAL billing (facturado sin IVA × 70%), with a monthly floor.
 * Returns `null` when the person's jubilatorio goes to a Caja profesional (CJPPU),
 * whose scale is not published — we refuse to show a number we cannot source.
 */
function serviciosPersonalesBps(input: WizardInput): number | null {
  if (input.cajaProfesional) return null
  const monthlyBilling = input.annualRevenueUyu / 12
  const fonasaBase = monthlyBilling * FIGURES.spFonasaCoefIrpf.value
  const fonasa = Math.max(FIGURES.spFonasaMinimo.value, fonasaBase * spFonasaRate(input))
  return FIGURES.spJubilatorioFicto.value + fonasa
}

/** IVA mínimo: the flat quota, or — with e-factura — the LESSER of the quota and 3,3% of billing. */
function ivaMinimoMonthly(input: WizardInput): { amount: number; notes: string[] } {
  const quota = rampPick(
    [FIGURES.ivaMinimoAnio1.value, FIGURES.ivaMinimoAnio2.value],
    FIGURES.ivaMinimo.value,
    input.yearsOperating
  )
  const notes: string[] = []
  if (!input.eFactura) {
    notes.push(
      'Sin e-factura pagás la cuota fija completa. Con e-factura pagarías el menor entre la cuota y el 3,3% de lo que factures cada mes — y si un mes no facturás, no pagás nada.'
    )
    return { amount: quota, notes }
  }

  const monthly = input.annualRevenueUyu / 12
  const capped = monthly * FIGURES.ivaMinimoTopeEfactura.value
  const amount = Math.min(quota, capped)
  notes.push(
    amount < quota
      ? 'Con e-factura pagás el 3,3% de lo facturado en el mes, porque es menor que la cuota fija. Si un mes no facturás, no pagás nada.'
      : 'Con e-factura pagás el menor entre la cuota y el 3,3% del mes; a tu nivel de facturación, la cuota es lo menor.'
  )

  // The finding nobody else publishes: in the FULL regime (cuota plena), with even billing,
  // the 3,3% cap ALWAYS wins inside the Literal E ceiling — the two can't even meet. Billing
  // evenly at the very ceiling is $163.269/mes, and 3,3% of that is $5.388, still under the
  // $5.910 quota. So an e-invoicing Literal E in the full regime effectively never pays the
  // flat quota on even billing; only a LUMPY month (above ~$179.091) reaches it. During the
  // gradual years the quota is lower, so it does bind at ordinary revenues — which is why
  // this note is scoped to the pleno case rather than stated as a universal.
  const quotaBindsAt = quota / FIGURES.ivaMinimoTopeEfactura.value
  if (quota === FIGURES.ivaMinimo.value) {
    const atCeiling = FIGURES.topeLiteralEUyu.value / 12
    notes.push(
      `Dato poco conocido: en el régimen pleno, con facturación pareja, el 3,3% SIEMPRE le gana a la cuota. Incluso facturando justo en el tope del Literal E (${uyu(atCeiling)} al mes), el 3,3% son ${uyu(atCeiling * FIGURES.ivaMinimoTopeEfactura.value)} — menos que la cuota de ${uyu(quota)}. Solo pagarías la cuota en un mes con un pico por encima de ${uyu(quotaBindsAt)}.`
    )
  } else {
    notes.push(
      `Estás en la cuota gradual (${uyu(quota)}): a diferencia de la cuota plena, esta SÍ te puede tocar, porque el 3,3% la supera desde ${uyu(quotaBindsAt)} de facturación mensual.`
    )
  }
  return { amount, notes }
}

/**
 * Monthly IRAE under the ficto of Dec. 150/007 art. 64, or `null` when the ficto is not
 * legally available (contabilidad suficiente preceptiva → IRAE real).
 *
 * `alwaysContabilidadSuficiente` is for the SA: Dec. 150/007 art. 168 lit. a) obliges "los
 * sujetos pasivos comprendidos en los numerales 1 y 4 a 7 del literal A del artículo 3°",
 * and numeral 1 of that literal is, verbatim, "las sociedades anónimas y las sociedades en
 * comandita por acciones". An SA is therefore obligated at ANY revenue, so the ficto is
 * never available to it and the flat 12% we used to print for an SA was wrong at every
 * level, not just above the tope.
 */
function iraeFictoMonthly(
  input: WizardInput,
  alwaysContabilidadSuficiente = false
): { amount: number | null; notes: string[] } {
  const notes: string[] = []
  const contador =
    'El IRAE real es el 25% de (ingresos − gastos reales) y depende de tu estructura de gastos, que no conocemos: para esto necesitás un contador.'

  if (alwaysContabilidadSuficiente) {
    notes.push(
      `No podemos estimarte el IRAE. Las sociedades anónimas están OBLIGADAS a liquidar por contabilidad suficiente sin importar cuánto facturen (Dto. 150/007 art. 168 lit. A, que remite al numeral 1 del literal A: "las sociedades anónimas y las sociedades en comandita por acciones"), así que el IRAE ficto no está disponible para una SA en ningún nivel de facturación. ${contador}`
    )
    return { amount: null, notes }
  }

  if (!iraeFictoDisponible(input.annualRevenueUyu)) {
    notes.push(
      `No podemos estimarte el IRAE: por encima de ${FIGURES.topeIraePreceptivoUi.value.toLocaleString('es-UY')} UI de ingresos (≈ ${uyu(uiToUyu(FIGURES.topeIraePreceptivoUi.value))} al año) la contabilidad suficiente es PRECEPTIVA (Dto. 150/007 art. 168) y el ficto del art. 64 deja de estar disponible. ${contador} No extrapolamos el ficto fuera de su rango legal.`
    )
    return { amount: null, notes }
  }

  const tramos = IRAE_FICTO.brackets
    .map(b => {
      const pct = b.rate.toLocaleString('es-UY', {
        style: 'percent',
        maximumFractionDigits: 0,
      })
      return b.upToUi === null
        ? `${pct} en adelante`
        : `${pct} hasta UI ${b.upToUi.toLocaleString('es-UY')}`
    })
    .join(', ')

  notes.push(
    `IRAE ficto (Dto. 150/007 art. 64): la renta neta NO es un 12% plano. Es una escala por TRAMOS de facturación anual en UI (${tramos}), y cada tramo se aplica solo a la parte de la facturación que cae dentro de él. Sobre esa renta ficta se paga el 25%.`
  )
  notes.push(
    `Los tramos están en UI y los convertimos con la UI de hoy (${FIGURES.uiHoy.value.toLocaleString('es-UY')}), que se mueve todos los días: si estás cerca del borde de un tramo, tomá la cifra como aproximada.`
  )
  notes.push(
    'No descontamos los sueldos de dueños o socios que el art. 64 admite restar de la renta ficta (hasta 11 BFC por dueño o socio que preste servicios efectivos): si los cobrás, tu IRAE real será menor que el que mostramos.'
  )

  return {
    amount: (iraeFictoRentaNetaAnual(input.annualRevenueUyu) * FIGURES.irae.value) / 12,
    notes,
  }
}

/**
 * Cost of running under `regime`, in UYU.
 *
 * ALWAYS returns a `CostBreakdown` — never `null`. It used to declare `| null` and never
 * return it: an unreachable branch in the signature is a lie the type system enforces on
 * every caller (they all wrote `estimateCost(...)!`). Incompleteness is now expressed
 * INSIDE the breakdown, where it belongs and where it can be acted on: see the contract on
 * `CostBreakdown`. A regime we cannot fully cost comes back with `bpsUnknown`/`taxUnknown`
 * set and `totalMonthly`/`totalAnnual` null — not with a zero that reads as "free".
 *
 * The accountant fee is a MARKET estimate (`MARKET_ESTIMATES.contadorMensual`), never an
 * official figure: no repartición publishes an arancel de contadores, so it cannot honestly
 * be a `Figure`. It carries its own label and rationale instead, which the page renders.
 */
export function estimateCost(
  regime: RegimeId,
  input: WizardInput,
  accountantMonthly = MARKET_ESTIMATES.contadorMensual.value
): CostBreakdown {
  const monthlyRevenue = input.annualRevenueUyu / 12
  const notes: string[] = []
  let bpsMonthly: number | null = 0
  let taxMonthly: number | null = 0
  let otherTaxesMonthly = 0
  let accountant = 0
  let setupCost = 0

  /** Notes every regime whose BPS comes from `unipersonalBps` owes the reader. */
  const unipersonalBpsNotes = (gradual: boolean) => {
    if (!input.fonasaFromJob) return
    if (!gradual) return
    notes.push(
      'Ya tenés FONASA por un empleo, así que te mostramos la columna del titular con cobertura por otra actividad. BPS no publica una versión REBAJADA de esa columna para la gradualidad de la Ley 19.889, y no la inventamos: si te corresponde la rampa, tu costo real de los primeros 3 años puede ser MENOR que el que mostramos. Confirmalo con BPS.'
    )
  }

  switch (regime) {
    case 'monotributo': {
      bpsMonthly = monoBps(input)
      setupCost = FIGURES.setupUnipersonal.value
      notes.push('El pago único sustituye IVA, IRAE y los aportes por tu propia actividad.')
      notes.push(
        `Tu jubilación se construye sobre un ficto de ${uyu(FIGURES.monoBfcFicto.value * FIGURES.bfc.value)} al mes, no sobre lo que realmente ganás.`
      )
      if (input.people === 'socios') {
        if (bpsMonthly === null) {
          notes.push(
            'No podemos calcular el BPS: no sabemos cuántos socios son. En una sociedad de hecho, BPS cobra el aporte POR SOCIO, así que el número depende de ese dato.'
          )
        } else {
          notes.push(
            `Este es el costo de LA SOCIEDAD, no tu parte: BPS cobra ${uyu(FIGURES.monoSocioSociedadHecho.value)} por socio en el régimen pleno, y lo multiplicamos por los ${String(input.sociosCount)} socios.`
          )
          notes.push(
            'La tabla de monotributo de sociedades de hecho de BPS NO publica columna de FONASA: la cifra es jubilatorio + FRL. Si los socios optan por la cobertura del SNIS, el aporte real es mayor y BPS no publica cuánto — preguntá en BPS.'
          )
        }
      }
      if (rampPick([true, true], false, input.yearsOperating)) {
        notes.push('Estás en la gradualidad de la Ley 19.942 (25% el primer año, 50% el segundo).')
      }
      break
    }

    case 'monotributo-social': {
      bpsMonthly = rampPick(
        [
          FIGURES.monoSocialAnio1SinFonasa.value,
          FIGURES.monoSocialAnio2SinFonasa.value,
          FIGURES.monoSocialAnio3SinFonasa.value,
        ],
        FIGURES.monoPlenoSinFonasa.value,
        input.yearsOperating
      )
      setupCost = 0
      notes.push('Sin cobertura FONASA. Con FONASA el aporte es bastante mayor.')
      notes.push('MIDES revisa cada año que tu hogar siga calificando.')
      break
    }

    case 'unipersonal-literal-e': {
      // Literal E IS the regime the Ley 19.889 ramp applies to (art. 228 → art. 30).
      bpsMonthly = unipersonalBps(input, true)
      const iva = ivaMinimoMonthly(input)
      taxMonthly = iva.amount
      setupCost = FIGURES.setupUnipersonal.value
      notes.push(...iva.notes)
      notes.push('Exonerada de IRAE mientras estés por debajo del tope.')
      // MINOR 10 — the one regime the Ley 19.889 ramp genuinely applies to never explained
      // it, while monotributo (which has a different ramp, Ley 19.942) did.
      notes.push(
        `Este es el único régimen con la rebaja de aportes patronales de la Ley 19.889 para empresas nuevas: pagás 25% menos el primer año, 50% menos el segundo y 75% menos el tercero, y desde el CUARTO año pagás el aporte completo (${uyu(FIGURES.bpsUnipersonalPleno.value)}). La rebaja cesa antes si entrás al régimen general de IVA.`
      )
      unipersonalBpsNotes(true)
      notes.push('Respondés con tu patrimonio personal: la unipersonal no es una persona jurídica.')
      break
    }

    case 'unipersonal-irae': {
      // NO ramp here: art. 229 cesa al entrar al régimen general de IVA.
      bpsMonthly = unipersonalBps(input, false)
      const irae = iraeFictoMonthly(input)
      taxMonthly = irae.amount
      accountant = accountantMonthly
      setupCost = FIGURES.setupUnipersonal.value
      notes.push(...irae.notes)
      notes.push('Además liquidás IVA en régimen general (22%), que cobrás a tus clientes.')
      notes.push(
        'La rebaja de aportes patronales para empresas nuevas NO aplica acá: es un beneficio del Literal E y cesa al entrar al régimen general de IVA.'
      )
      break
    }

    case 'irpf-servicios': {
      // CRITICAL 1 — `sp ?? 0` used to launder "we cannot know this" into "this is free".
      bpsMonthly = serviciosPersonalesBps(input)
      const taxable = monthlyRevenue * (1 - FIGURES.irpfFictoGastos.value)
      taxMonthly = irpfCat2Monthly(taxable)
      setupCost = FIGURES.setupUnipersonal.value

      if (bpsMonthly === null) {
        notes.push(
          'NO INCLUYE TU APORTE JUBILATORIO. Tenés un título amparado por la Caja de Profesionales Universitarios, así que el jubilatorio lo aportás a la CJPPU y no a BPS. La CJPPU no publica su escala de forma abierta: consultala directamente. Tu FONASA sí lo pagás a BPS. Por eso NO te mostramos un total: sería menor que el real, y no un poco.'
        )
      } else {
        notes.push(
          `El BPS son dos cosas sobre bases distintas: ${uyu(FIGURES.spJubilatorioFicto.value)} de jubilatorio sobre un ficto FIJO (no importa cuánto factures), más FONASA sobre lo que realmente facturás (70% de lo facturado × ${spFonasaRate(input).toLocaleString('es-UY', { style: 'percent', maximumFractionDigits: 1 })}), con un piso de ${uyu(FIGURES.spFonasaMinimo.value)}.`
        )
      }
      notes.push(
        `Se deduce un ficto de gastos del 30% y hay un mínimo no imponible de ${uyu(FIGURES.irpfMinimoNoImponibleMensual.value)} al mes: por eso al principio suele ganarle al IRAE.`
      )
      // MINOR 11 — IRPF Cat. II lets you subtract a CRÉDITO por deducciones (aportes
      // jubilatorios, FONASA, FRL, hijos a cargo) computed at 14% u 8% según el nivel de
      // ingresos. We do not collect the inputs it needs, so we do not compute it — but the
      // omission runs against the taxpayer, and an undisclosed conservatism is still wrong.
      notes.push(
        'El IRPF que mostramos es MAYOR al que realmente pagarías: no le restamos el crédito por DEDUCCIONES (aportes jubilatorios, FONASA, FRL, hijos a cargo), que se descuenta del impuesto a una tasa del 14% o del 8% según tu nivel de ingresos. Nos faltan datos para calcularlo; tomá el IRPF como un techo.'
      )
      notes.push(
        'La rebaja de aportes para empresas nuevas NO existe en este camino: es un beneficio del Literal E. Pagás el total desde el primer mes.'
      )
      notes.push(
        'Si exportás el servicio y se aprovecha exclusivamente en el exterior, el IVA es tasa 0% y conservás el crédito de IVA de tus compras.'
      )
      notes.push(
        `Si facturás menos de ${FIGURES.spFacturacionMinimaAnualBpc.value} BPC al año (${uyu(FIGURES.spFacturacionMinimaAnualBpc.value * FIGURES.bpc.value)}), perdés la cobertura FONASA para el año siguiente.`
      )
      break
    }

    case 'sociedad-hecho': {
      // IMPORTANT 5 — this used to charge `bpsUnipersonalPleno` (8.833: the UNIPERSONAL
      // TITULAR's 11 BFC *plus* FONASA) to a regime that legally requires ≥2 socios, while
      // taxing the WHOLE company's revenue. The total mixed a one-person BPS base with a
      // whole-company tax base: it was neither "your cost" nor "the company's cost".
      //
      // BPS "Industria y comercio", tabla "Sociedad de hecho sin dependientes": el socio
      // aporta 11 BFC → $4.594, POR SOCIO y SIN FONASA (igual que el socio de SRL). El
      // titular de una unipersonal es otra cosa.
      const socios = input.sociosCount
      bpsMonthly = socios === undefined ? null : FIGURES.bpsSocioSociedadHecho.value * socios
      const irae = iraeFictoMonthly(input)
      taxMonthly = irae.amount
      accountant = accountantMonthly
      setupCost = 0
      if (bpsMonthly === null) {
        notes.push(
          'No podemos calcular el BPS: no sabemos cuántos socios son, y en una sociedad de hecho cada socio aporta por separado.'
        )
      } else {
        notes.push(
          `Este número es el costo de LA SOCIEDAD, no tu parte: cada socio aporta ${uyu(FIGURES.bpsSocioSociedadHecho.value)} de BPS (11 BFC), y son ${String(socios)} socios. El IRAE también es el de toda la sociedad, sobre la facturación total.`
        )
        notes.push(
          'La tabla de BPS para la sociedad de hecho publica un único importe por socio, SIN columna de FONASA: la cifra es jubilatorio + FRL. Si te corresponde cobertura de salud por esta actividad, el aporte real es mayor y BPS no publica cuánto — preguntá en BPS.'
        )
      }
      notes.push(...irae.notes)
      notes.push(
        'Responsabilidad SOLIDARIA e ILIMITADA: un acreedor puede ir por el 100% de la deuda contra el socio que tenga bienes, sin importar el % pactado.'
      )
      notes.push('Cualquier socio puede exigir la disolución en cualquier momento.')
      break
    }

    case 'srl': {
      bpsMonthly = FIGURES.bpsSocioSrl.value
      const irae = iraeFictoMonthly(input)
      taxMonthly = irae.amount
      accountant = accountantMonthly
      setupCost = FIGURES.setupSrl.value
      notes.push(...irae.notes)
      notes.push(
        `El BPS que mostramos es el de UN socio con actividad (${uyu(FIGURES.bpsSocioSrl.value)}). Cada socio que además trabaje en la empresa aporta lo suyo.`
      )
      notes.push('El BPS del socio solo se paga si desarrolla actividad en la empresa.')
      notes.push(
        'Los socios de SRL no están comprendidos en el FONASA por esta actividad: no tenés cobertura de salud por acá.'
      )
      notes.push(
        'Ceder cuotas a un tercero exige unanimidad si son 5 socios o menos, más escribano y publicación.'
      )
      notes.push(
        'No incluye las publicaciones en el Diario Oficial y en otro diario (a cotización).'
      )
      break
    }

    case 'sas': {
      bpsMonthly = FIGURES.bpsAdminSas.value
      const irae = iraeFictoMonthly(input)
      taxMonthly = irae.amount
      accountant = accountantMonthly
      setupCost = FIGURES.setupSas.value
      notes.push(...irae.notes)
      notes.push(
        `El administrador paga ${uyu(FIGURES.bpsAdminSas.value)} de BPS al mes AUNQUE NO COBRE SUELDO NI FACTURE UN PESO, y no puede declararse inactivo. Es el costo real de la SAS.`
      )
      notes.push('A cambio, sí tenés cobertura FONASA.')
      notes.push(
        'Un accionista que no administra ni representa NO aporta a BPS por ser accionista.'
      )
      notes.push(
        `Por debajo de ${FIGURES.topeIraePreceptivoUi.value.toLocaleString('es-UY')} UI de ingresos, los dividendos que retirás están EXENTOS de IRPF: la carga total es 25%, no 30,25%.`
      )
      break
    }

    case 'sa': {
      // A director who draws no sueldo genuinely contributes nothing — this 0 is a measured
      // zero, not an unknown one, and `bpsUnknown` stays false.
      bpsMonthly = 0
      // The ficto is NEVER available to an SA (Dto. 150/007 art. 168 lit. A → Título 4
      // art. 12 lit. A num. 1). ICOSA, on the other hand, is perfectly knowable — so it
      // lives in `otherTaxesMonthly` and survives the IRAE being null.
      const irae = iraeFictoMonthly(input, true)
      taxMonthly = irae.amount
      otherTaxesMonthly = FIGURES.icosaAnual.value / 12
      accountant = accountantMonthly
      setupCost = FIGURES.icosaConstitucion.value
      notes.push(...irae.notes)
      notes.push(
        `Pagás ICOSA: ${uyu(FIGURES.icosaConstitucion.value)} al constituirla y ${uyu(FIGURES.icosaAnual.value)} todos los años, para siempre. La SAS y la SRL no lo pagan.`
      )
      notes.push(
        'Un director que no cobra sueldo NO aporta a BPS: es la única figura donde eso pasa.'
      )
      notes.push(
        'Los dividendos pagan 7% de IRPF siempre, sin importar el tamaño. La SAS y la SRL chicas no.'
      )
      notes.push('No incluye escribano ni publicaciones (a cotización).')
      break
    }
  }

  const bpsUnknown = bpsMonthly === null
  const taxUnknown = taxMonthly === null
  const knownPartialMonthly = (bpsMonthly ?? 0) + (taxMonthly ?? 0) + otherTaxesMonthly + accountant
  // The invariant every consumer relies on: a total exists ONLY when every component does.
  const complete = !bpsUnknown && !taxUnknown
  const totalMonthly = complete ? knownPartialMonthly : null

  return {
    bpsMonthly,
    bpsUnknown,
    taxMonthly,
    taxUnknown,
    otherTaxesMonthly,
    accountantMonthly: accountant,
    totalMonthly,
    totalAnnual: totalMonthly === null ? null : totalMonthly * 12,
    knownPartialMonthly,
    setupCost,
    notes,
  }
}

// Which legal form should a Uruguayan entrepreneur open? Verified catalogue of
// regimes, the legal eligibility gates that rule each one in or out, and the cost
// model, for `pages/que-empresa-abrir-uruguay.vue`.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be unit-tested
// in plain Node via vitest.
//
// EVERY numeric constant declares what kind of number it is, and there are exactly three
// kinds: a `Figure` (FIGURES / the bracket tables) carries a PRIMARY SOURCE and a verification
// date; an `Estimate` in MARKET_ESTIMATES is a market price nobody publishes; an `Estimate` in
// PRODUCT_THRESHOLDS is an editorial choice about when to warn. `tests/unit/companyTypes.test.ts`
// walks this file's AST and fails the build on any numeric literal that is none of those — where
// "is" means the literal's `fig()`/`est()` call is itself BOUND to the real FIGURES /
// MARKET_ESTIMATES / PRODUCT_THRESHOLDS declaration, not merely sitting inside a same-named call
// anywhere in the file (a decoy `est(0.22, ...)` outside all three is rejected, not waved
// through) — plus a short, individually-justified allowlist of structural facts (an array
// index, a lockout's `years`, the {0, 1, 12} calendar/identity constants) that are not claims
// about the world at all. This is a legal-information page: an unsourced number is a bug, and a
// number wearing the WRONG kind of provenance is a worse one.
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

/**
 * Numbers that decide WHEN WE SPEAK, not what anything costs or what the law says.
 *
 * These are `Estimate`s (unsourced, with a rationale) for the same reason the accountant fee
 * is — no primary source exists — but they are a DIFFERENT kind of unsourced. The accountant
 * fee is a claim about the world that nobody happens to publish. A threshold like "how close
 * to the ceiling counts as CLOSE?" is not a claim about the world at all: it is an editorial
 * choice about when a warning is more useful than noise. There is nothing to source, and
 * inventing a bps/dgi/impo URL for it would be exactly the defect IMPORTANT 7 caught — a
 * citation that does not support its use, wearing compliance as a costume.
 *
 * They live apart from `MARKET_ESTIMATES` so that neither can be rendered as the other: a page
 * that prints "Estimaciones de mercado" must not list a UX threshold among its prices.
 */
export const PRODUCT_THRESHOLDS = {
  lockoutAlertRatio: est(
    0.85,
    'Proporción del tope a partir de la cual avisamos del cerrojo',
    'Umbral editorial, no una cifra legal ni un precio: NINGUNA norma define "estar cerca del tope" — el Dto. 199/007 art. 14 no tiene ese concepto, solo tiene el tope. Elegimos el 85% porque a esa altura un solo mes bueno, un aumento de precios o la inflación te cruzan dentro del mismo ejercicio, y el cerrojo de 3 años se dispara sin que lo hayas decidido. Es una decisión de producto sobre cuándo hablar, y la declaramos como tal en vez de fabricarle una fuente.'
  ),
} as const satisfies Record<string, Estimate>

const BPS_VALORES = 'https://www.bps.gub.uy/5478/valores-actuales.html'
const BPS_TOPES = 'https://www.bps.gub.uy/23987/tope-de-ingresos-y-capital-de-la-empresa.html'
const BPS_MONO = 'https://www.bps.gub.uy/6668/monotributo-ley-18083.html'
const BPS_MONO_GRAD = 'https://www.bps.gub.uy/18051/monotributo-ley-19942.html'
// MINOR 4 — six figures used to cite the two HTML pages above for values those pages DO NOT
// CONTAIN. bps.gub.uy/6668 publishes only the "con hijos" columns (6.996 and 7.888); the
// "sin hijos" ones (6.327 / 7.219) live in the PDF it links. Same for bps.gub.uy/18051 (only
// 5.430/6.322 and 5.953/6.845 on the page; 4.761 / 5.653 / 5.284 / 6.176 in the PDF). All six
// values were CORRECT — the citations just did not support them, which is precisely the defect
// the last round's IMPORTANT 7 was about ("a citation that does not support its use"). They now
// point at the PDFs, which is where BPS actually publishes them. Same domain, so the
// primary-source test is satisfied for the right reason rather than by luck.
const BPS_MONO_PDF = 'https://www.bps.gub.uy/bps/file/6668/23/monotributo-ley-18.083---2026.pdf'
const BPS_MONO_GRAD_PDF =
  'https://www.bps.gub.uy/bps/file/18051/8/monotributo-ley-19.942---2026.pdf'
const BPS_MONO_SOCIAL = 'https://www.bps.gub.uy/6667/monotributo-social-mides-ley-18874.html'
const BPS_IC = 'https://www.bps.gub.uy/6665/industria-y-comercio.html'
const BPS_GRADUAL =
  'https://www.bps.gub.uy/17829/regimen-de-aportacion-gradual-vigente-desde-1_2021-ley-19889.html'
// Ley 16.713 art. 172 — the article that decides WHO pays the socio's BPS, and how many of
// them. Verbatim: "los socios integrantes de las sociedades colectivas, de responsabilidad
// limitada, en comandita y de capital e industria, TENGAN O NO LA CALIDAD DE ADMINISTRADORES,
// QUE DESARROLLEN ACTIVIDAD DE CUALQUIER NATURALEZA DENTRO DE LA EMPRESA, efectuarán su
// aportación ficta patronal ... sin que pueda ser inferior al equivalente a QUINCE veces el
// valor de la Base Ficta de Contribución."
const LEY16713_172 = 'https://www.impo.com.uy/bases/leyes/16713-1995/172'
// Ley 19.820 art. 43 sends the SAS administrator to that same art. 172; arts. 29 and 30 decide
// how many administrators there are (see `sasBps`).
const LEY19820_29 = 'https://www.impo.com.uy/bases/leyes/19820-2019/29'
const LEY19820_43 = 'https://www.impo.com.uy/bases/leyes/19820-2019/43'
// Ley 17.738 art. 43 — the CJPPU's own ámbito. See `cjppuEnJuego`.
const LEY17738_43 = 'https://www.impo.com.uy/bases/leyes/17738-2004/43'
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
// ROUND-3 CRITICAL 2 — the article that ACTUALLY closes IRPF Cat. II above the límite, and it
// is NOT art. 168 lit. c. Art. 168 governs CONTABILIDAD SUFICIENTE (who must keep books), and
// its lit. c reaches "los contribuyentes del IRPF ... que OPTEN por liquidar este tributo de
// acuerdo a lo dispuesto en el artículo 6º" — i.e. people who are ALREADY in the IRAE. It never
// mentions servicios personales at all (that is lit. d, about a socio who bills their own
// company). Citing it for the preceptividad would have been a citation that does not support
// its use — the exact defect this module exists to catch.
//
// Dto. 150/007 art. 7, "Rentas comprendidas en el IRPF. Inclusión preceptiva", VERBATIM:
//   "Los contribuyentes del Impuesto a las Rentas de las Personas Físicas deberán comparar el
//    monto de las rentas que obtengan EN EL EJERCICIO derivadas de la prestación de servicios
//    personales fuera de la relación de dependencia con el que resulte de convertir a moneda
//    nacional UI 4.000.000 (cuatro millones de unidades indexadas) A LA COTIZACIÓN DE CIERRE DEL
//    EJERCICIO. Cuando el monto de las rentas referidas supere el antedicho límite, deberá
//    liquidarse obligatoriamente el impuesto que se reglamenta A PARTIR DEL PRIMER MES DEL
//    EJERCICIO SIGUIENTE."
// Three things follow, and we implement all three rather than the version in our heads:
//   1. the límite is measured on the rentas of THE CURRENT ejercicio (unlike art. 168 lit. b,
//      which looks at the ejercicio ANTERIOR) — so the wizard's own estimate is the right ruler;
//   2. it is valued at the UI de CIERRE, which is why this uses `uiToUyuCierre`;
//   3. the obligation bites FROM THE FOLLOWING EJERCICIO — so this year the visitor really is
//      still an IRPF taxpayer, and a hard `excluido` would overstate the norm. What it is NOT is
//      a régimen we may price, rank and RECOMMEND: within a year it becomes IRAE, by law.
const DEC150_7 = 'https://www.impo.com.uy/bases/decretos/150-2007/7'
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
  // The SAME number, set by a DIFFERENT norm for a DIFFERENT taxpayer, and therefore its own
  // Figure. `topeIraePreceptivoUi` (art. 168 lit. b) decides whether an IRAE taxpayer may still
  // use the ficto del art. 64. This one (art. 7) decides whether a servicios-personales IRPF
  // taxpayer stays in the IRPF at all. Sharing one constant between them would have been exactly
  // the source-laundering the module already removed once: one number, one arbitrary URL, two
  // unrelated legal uses. They happen to be equal in 2026; nothing in either norm makes them so.
  topeIrpfIraePreceptivoUi: fig(
    4_000_000,
    'Rentas anuales por servicios personales por encima de las cuales el IRAE es preceptivo desde el primer mes del ejercicio siguiente (UI, rentas del ejercicio, cotización de cierre)',
    DEC150_7
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
  // 6.327 and 7.219 are NOT on the HTML page (it publishes only the "con hijos" columns).
  // They are in the PDF, block "Aporte total", row "Con opción al SNIS". See BPS_MONO_PDF.
  monoPlenoFonasaSolo: fig(
    6327,
    'Monotributo pleno, con FONASA, sin cónyuge ni hijos',
    BPS_MONO_PDF
  ),
  monoPlenoFonasaHijos: fig(6996, 'Monotributo pleno, con FONASA, con hijos', BPS_MONO),
  monoPlenoFonasaConyuge: fig(7219, 'Monotributo pleno, con FONASA, con cónyuge', BPS_MONO_PDF),
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
  // 4.761 / 5.653 / 5.284 / 6.176: the HTML page publishes only the "con hijos" columns. These
  // four are in the PDF, block "Aporte total", row "Con opción al SNIS". See BPS_MONO_GRAD_PDF.
  monoAnio1FonasaSolo: fig(
    4761,
    'Monotributo año 1 (25%), con FONASA, sin cónyuge ni hijos',
    BPS_MONO_GRAD_PDF
  ),
  monoAnio1FonasaHijos: fig(5430, 'Monotributo año 1 (25%), con FONASA, con hijos', BPS_MONO_GRAD),
  monoAnio1FonasaConyuge: fig(
    5653,
    'Monotributo año 1 (25%), con FONASA, con cónyuge',
    BPS_MONO_GRAD_PDF
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
    BPS_MONO_GRAD_PDF
  ),
  monoAnio2FonasaHijos: fig(5953, 'Monotributo año 2 (50%), con FONASA, con hijos', BPS_MONO_GRAD),
  monoAnio2FonasaConyuge: fig(
    6176,
    'Monotributo año 2 (50%), con FONASA, con cónyuge',
    BPS_MONO_GRAD_PDF
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
  // BPS "Industria y Comercio", tabla "Empresas unipersonales sin dependientes → Aporte total
  // del beneficiario del SNS", 1.ª categoría, 11 BFC, monto gravado 20.328. BPS publishes FOUR
  // family columns, not one:
  //     sin cónyuge · sin hijos (SS 15) =  8.833
  //     sin cónyuge · con hijos (SS 1)  =  9.502   (+669)
  //     con cónyuge · sin hijos (SS 17) =  9.725   (+892)
  //     con cónyuge · con hijos (SS 16) = 10.394   (+1.561)
  // Charging every unipersonal the "solo" column was the same defect the monotributo had last
  // round, one regime over — and it handed Literal E a fake advantage of up to $1.561/mes over
  // the monotributo (which HAD been fixed) in the single comparison this page exists to decide.
  // The deltas are identical to the monotributo's, which is what confirms the mapping: it is
  // the same FONASA supplement in both tables.
  bpsUnipersonalPleno: fig(8833, 'BPS titular unipersonal (11 BFC, FONASA, soltero)', BPS_IC),
  bpsUnipersonalPlenoHijos: fig(9502, 'BPS titular unipersonal, con hijos', BPS_IC),
  bpsUnipersonalPlenoConyuge: fig(9725, 'BPS titular unipersonal, con cónyuge', BPS_IC),
  bpsUnipersonalPlenoConyugeHijos: fig(
    10_394,
    'BPS titular unipersonal, con cónyuge e hijos',
    BPS_IC
  ),
  // The Ley 19.889 ramp publishes the SAME four columns in each of its year tables (BPS_GRADUAL,
  // "Unipersonales", 1.ª cat / 11 BFC). Nothing here had to be derived.
  bpsUnipersonalAnio1: fig(7689, 'BPS titular unipersonal, año 1 (Ley 19.889)', BPS_GRADUAL),
  bpsUnipersonalAnio1Hijos: fig(8358, 'BPS titular unipersonal, año 1, con hijos', BPS_GRADUAL),
  bpsUnipersonalAnio1Conyuge: fig(8581, 'BPS titular unipersonal, año 1, con cónyuge', BPS_GRADUAL),
  bpsUnipersonalAnio1ConyugeHijos: fig(
    9250,
    'BPS titular unipersonal, año 1, con cónyuge e hijos',
    BPS_GRADUAL
  ),
  bpsUnipersonalAnio2: fig(8070, 'BPS titular unipersonal, año 2', BPS_GRADUAL),
  bpsUnipersonalAnio2Hijos: fig(8739, 'BPS titular unipersonal, año 2, con hijos', BPS_GRADUAL),
  bpsUnipersonalAnio2Conyuge: fig(8962, 'BPS titular unipersonal, año 2, con cónyuge', BPS_GRADUAL),
  bpsUnipersonalAnio2ConyugeHijos: fig(
    9631,
    'BPS titular unipersonal, año 2, con cónyuge e hijos',
    BPS_GRADUAL
  ),
  bpsUnipersonalAnio3: fig(8451, 'BPS titular unipersonal, año 3', BPS_GRADUAL),
  bpsUnipersonalAnio3Hijos: fig(9120, 'BPS titular unipersonal, año 3, con hijos', BPS_GRADUAL),
  bpsUnipersonalAnio3Conyuge: fig(9343, 'BPS titular unipersonal, año 3, con cónyuge', BPS_GRADUAL),
  bpsUnipersonalAnio3ConyugeHijos: fig(
    10_012,
    'BPS titular unipersonal, año 3, con cónyuge e hijos',
    BPS_GRADUAL
  ),
  // The module USED to assert — in a comment and in a user-facing note — that BPS "does NOT
  // publish a ramped version of this column". It does. BPS_GRADUAL carries "Con aporte al SNS
  // por actividad dependiente (SS 2, 28, 29 y 30)" in all four year tables: 3.999 / 4.380 /
  // 4.761 / 5.143. We were overcharging a brand-new Literal E titular by $1.144/mes and telling
  // them BPS had not published the number that was sitting on BPS's page.
  bpsUnipersonalConFonasaDeEmpleo: fig(
    5143,
    'BPS titular que ya aporta FONASA por un empleo',
    BPS_IC
  ),
  bpsUnipersonalConFonasaDeEmpleoAnio1: fig(
    3999,
    'BPS titular con FONASA por un empleo, año 1 (Ley 19.889)',
    BPS_GRADUAL
  ),
  bpsUnipersonalConFonasaDeEmpleoAnio2: fig(
    4380,
    'BPS titular con FONASA por un empleo, año 2',
    BPS_GRADUAL
  ),
  bpsUnipersonalConFonasaDeEmpleoAnio3: fig(
    4761,
    'BPS titular con FONASA por un empleo, año 3',
    BPS_GRADUAL
  ),
  // BPS_GRADUAL, tabla "Sociedades de hecho y SRL", footnote: "(*) Los socios de SRL aportan
  // como mínimo por la SEGUNDA CATEGORÍA" (15 BFC) — which is the authority for this figure,
  // and for the sociedad de hecho's 1.ª categoría (11 BFC) one below. Both tables are indexed
  // by a "Cant. socios" column: the charge is PER SOCIO, and Ley 16.713 art. 172 conditions it
  // on the socio developing activity in the company.
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
  // The SAS administrator sits in the SAME "beneficiario del SNS" table as the unipersonal
  // titular, one categoría up (2.ª, 15 BFC), and therefore carries the SAME four family
  // columns — 10.504 / 11.173 / 11.396 / 12.065, the identical +669/+892/+1.561 supplement.
  // It ignored `family` too: the same defect as the unipersonal, one regime over. Ley 19.820
  // art. 43 in fine puts it beyond doubt that the FONASA columns are the right ones: the
  // administrator queda "incorporado al Seguro Nacional de Salud regulado por la Ley 18.211".
  bpsAdminSas: fig(10_504, 'BPS administrador de SAS (15 BFC, FONASA obligatorio)', BPS_IC),
  bpsAdminSasHijos: fig(11_173, 'BPS administrador de SAS, con hijos', BPS_IC),
  bpsAdminSasConyuge: fig(11_396, 'BPS administrador de SAS, con cónyuge', BPS_IC),
  bpsAdminSasConyugeHijos: fig(12_065, 'BPS administrador de SAS, con cónyuge e hijos', BPS_IC),

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

/**
 * UYU value of `unidades` UI at TODAY's UI.
 *
 * Correct for the art. 64 TRAMOS, and only for them: art. 64 denominates its scale in UI and
 * says nothing whatsoever about the date at which to value them, so today's UI is our
 * disclosed approximation (and `iraeFictoMonthly` discloses it). It is NOT correct for the
 * art. 168 tope — see `uiToUyuCierre`.
 */
const uiToUyuHoy = (unidades: number): number => unidades * FIGURES.uiHoy.value

/**
 * UYU value of `unidades` UI at the UI de CIERRE DE EJERCICIO.
 *
 * MINOR 5 — the art. 168 tope used to be converted with `uiHoy`, a value that moves every
 * single day, when the norm expressly fixes the date. Art. 168 lit. b), verbatim: obligados a
 * contabilidad suficiente "siempre que sus ingresos hayan superado en el ejercicio anterior las
 * UI 4:000.000 ... A VALORES DE CIERRE DE EJERCICIO". Lit. c) repeats it in so many words: "A
 * tales efectos se tomará la cotización de la unidad indexada vigente AL CIERRE DE EJERCICIO."
 *
 * `FIGURES.uiCierre2025` was already in the file, labelled "fija los topes 2026", and was
 * referenced NOWHERE. It is the right number and this is the one place it belongs.
 */
const uiToUyuCierre = (unidades: number): number => unidades * FIGURES.uiCierre2025.value

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
    const ceiling = b.upToUi === null ? Infinity : uiToUyuHoy(b.upToUi)
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
 * Approximation we own: the norm tests the ingresos of the EJERCICIO ANTERIOR, and we only have
 * the visitor's estimate for the CURRENT one. We no longer compound that with a second error —
 * the tope itself is now valued at the UI de cierre the norm names (`uiToUyuCierre`), not at
 * today's UI, which moves daily and would slide the boundary under the reader's feet.
 */
function iraeFictoDisponible(annualRevenueUyu: number): boolean {
  return annualRevenueUyu <= uiToUyuCierre(FIGURES.topeIraePreceptivoUi.value)
}

/**
 * Has this servicios-personales provider crossed the límite that makes the IRAE PRECEPTIVO?
 *
 * ROUND-3 CRITICAL 2. `applyGates` had no revenue gate at all on `irpf-servicios`, and
 * `irpfCat2Monthly` always returns a number — so the regime stayed `comparable` at ANY revenue,
 * and the page recommended IRPF Cat. II, with a precise monthly total, on the very screen whose
 * comparison table said the IRAE was preceptivo above the tope. `unipersonal-irae` and `sas`
 * said "No calculable" at the same revenue. The same visitor, three regimes, two answers.
 *
 * Dto. 150/007 art. 7 (verbatim at `DEC150_7`): the rentas of THE EJERCICIO are compared against
 * UI 4.000.000 at the COTIZACIÓN DE CIERRE, and above it the IRAE must be liquidated "a partir
 * del primer mes del ejercicio siguiente". Note what the article does NOT say: it does not
 * expel anyone from the IRPF in the current ejercicio. So this is not an exclusion — it is the
 * end of the road, one ejercicio out, and the honest thing is to refuse to put a monthly price
 * on a path the law closes within the year.
 */
function irpfIraePreceptivo(annualRevenueUyu: number): boolean {
  return annualRevenueUyu > uiToUyuCierre(FIGURES.topeIrpfIraePreceptivoUi.value)
}

/**
 * NOBODY IS IN THE COMPANY — and until ROUND-3, nothing noticed.
 *
 * The wizard can be told, at the same time, that NO socio works in the company ("la maneja un
 * gerente contratado") and that there are NO dependientes. Those two answers cannot both be
 * true: a hired gerente IS a dependiente, and with neither socios nor dependientes there is
 * nobody left to perform the activity at all.
 *
 * It is not a harmless inconsistency, because both regimes below are priced off BPS's
 * "SIN DEPENDIENTES" tables — and for the monotributo the "sin dependientes" is not a table
 * heading but the law itself (Ley 18.083 art. 70 lits. B y C). Multiplying a per-socio figure by
 * zero produced $0/mes, `bpsUnknown: false`, `comparable: true` — and the ranker duly put
 * Monotributo · TOTAL MENSUAL $0 first, three clicks from the wizard's defaults.
 *
 * A contradiction is an UNKNOWN, not a zero. We say which two answers collide and ask for one
 * of them again. (The SRL is deliberately NOT here: art. 172 charges only socios "que
 * desarrollen actividad", and an SRL whose cuotistas are purely capitalist is an ordinary,
 * lawful shape whose measured zero the module already blesses.)
 */
function nadieEnLaEmpresa(input: WizardInput): boolean {
  return input.people === 'socios' && input.sociosActivos === 0 && input.employees === 0
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
  // The inclusión preceptiva of a servicios-personales provider in the IRAE. See `DEC150_7`
  // for the verbatim text and for why art. 168 lit. c — the article we nearly cited — is the
  // wrong one.
  dto150_7: {
    norm: 'Dto. 150/007 art. 7',
    url: DEC150_7,
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
   * How many socios actually WORK in the company — not how many own it. This is the datum
   * Ley 16.713 art. 172 makes the socio's BPS depend on, and it is a different fact from
   * `sociosCount`.
   *
   * Art. 172, verbatim: "los socios integrantes de las sociedades colectivas, DE
   * RESPONSABILIDAD LIMITADA, en comandita y de capital e industria, TENGAN O NO LA CALIDAD DE
   * ADMINISTRADORES, QUE DESARROLLEN ACTIVIDAD DE CUALQUIER NATURALEZA DENTRO DE LA EMPRESA,
   * efectuarán su aportación ficta patronal ... sin que pueda ser inferior al equivalente a
   * quince veces el valor de la Base Ficta de Contribución."
   *
   * So the trigger is ACTIVITY, not ownership: a purely capitalist socio who does not work in
   * the company falls outside the article and pays nothing. And the aportación is made by each
   * socio ("los socios ... efectuarán SU aportación"), so it MULTIPLIES.
   *
   * When this is left `undefined` for a `'socios'` visitor, the SRL and the sociedad de hecho
   * must NOT guess 1 — `estimateCost` returns `bpsUnknown`. Guessing 1 is what made the SRL
   * print $6.265 for a company whose two working socios owe $12.530, and it INVERTED the
   * ranking: the SRL came out cheapest when it was the dearest of the three.
   *
   * 0 is a legitimate, MEASURED value (an SRL run by a hired manager, with purely capitalist
   * socios) — it is not the same thing as `undefined`.
   */
  sociosActivos?: number
  /**
   * How many administradores / representantes legales the SAS has. Ley 19.820 art. 43 sends
   * them to the same art. 172 of Ley 16.713 as the SRL socio, so this multiplies too.
   *
   * Unlike `sociosActivos`, its absence is ANSWERABLE, and not by a guess of ours: Ley 19.820
   * art. 29 supplies the default itself — "Salvo que otra cosa se dispusiera en los estatutos,
   * la TOTALIDAD de las funciones de administración y representación legal le corresponderán AL
   * REPRESENTANTE LEGAL" (singular). One is the statutory shape of a SAS; the SRL has no such
   * residual rule (Ley 16.060 art. 1 forces it to ≥2 socios, so 1 is never its default).
   *
   * There is NO legal maximum: art. 30 says the representación legal is "a cargo de UNA O MÁS
   * personas físicas o jurídicas, designadas en la forma prevista en los estatutos".
   */
  administradoresSas?: number
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
 * The revenue ceiling shared by the monotributo (Ley 18.083 art. 71) and the monotributo
 * social (Ley 18.874 art. 4, which reuses the SAME two importes — 60% del límite del
 * unipersonal / 100% del asociativo — rather than defining its own; DGI's published topes
 * already ARE those 60%/100% figures, so no multiplication happens here).
 *
 * `applyGates` (both the `monotributo` and `monotributo-social` cases) and `ceilingOf` used to
 * each re-derive "which of the two topes applies" independently. The two VALUES could never
 * drift — they read the same `FIGURES` either way — but the RULE could, if one copy were
 * edited and the other forgotten. One helper, so there is only one rule to edit.
 */
function monotributoTope(input: WizardInput): number {
  return input.people === 'socios'
    ? FIGURES.topeMonotributoSociedadUyu.value
    : FIGURES.topeMonotributoUnipersonalUyu.value
}

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

    /**
     * MINOR 10 — the gate used to leave `sociedad-hecho` and `srl` sitting at `elegible` for a
     * `'socios'` visitor who never told us how many socios there are, while `monotributo` was
     * correctly `dudoso` on exactly the same gap. It never asked for the datum those regimes
     * cannot be described without — and Ley 16.060 art. 1's own 2-socio minimum cannot even be
     * CHECKED without it, so the `elegible` verdict was not something the gate had established.
     * It was something it had skipped.
     */
    const flagMissingSociosCount = () => {
      if (socios && input.sociosCount === undefined) {
        doubt(
          `No sabemos cuántos socios son, y sin ese dato no podemos confirmar que se cumpla el mínimo de ${minSocios} personas (ni calcular el aporte a BPS, que se cobra por cada socio con actividad). Necesitamos ese dato.`,
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
        // asociativo — los mismos importes que ya tenemos verificados (see `monotributoTope`).
        const topeSocial = monotributoTope(input)
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
        const tope = monotributoTope(input)
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
        // ROUND-3 CRITICAL 2 — the gate that was not there. `dudoso`, not `excluido`, and the
        // article is the reason: art. 7 does not take the IRPF away from you in the ejercicio
        // you cross the límite, it obliges the IRAE "a partir del primer mes del EJERCICIO
        // SIGUIENTE". So the honest verdict is not "you may not use this" — it is "the law is
        // taking this away from you within the year, and we will not recommend it to you".
        // `dudoso` is never recommended, however cheap, which is exactly the outcome we need.
        if (anyServicios && irpfIraePreceptivo(input.annualRevenueUyu)) {
          const tope = FIGURES.topeIrpfIraePreceptivoUi.value
          doubt(
            `Con esa facturación el IRAE deja de ser opcional. El Dto. 150/007 art. 7 manda comparar las rentas del EJERCICIO por servicios personales con ${tope.toLocaleString('es-UY')} UI (≈ ${uyu(uiToUyuCierre(tope))} a la cotización de cierre), y por encima de ese límite "deberá liquidarse obligatoriamente el impuesto [IRAE] a partir del primer mes del ejercicio siguiente". Este ejercicio todavía liquidás IRPF Cat. II; el siguiente, no — y ahí el IRAE es real (contabilidad suficiente preceptiva), que depende de tus gastos y no podemos estimarte. No te recomendamos un régimen del que la ley te saca en menos de un año: mirá directamente el IRAE.`,
            L.dto150_7
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
        flagMissingSociosCount()
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
        // MINOR 10 — only the SRL. The SA's BPS does not depend on the socio count (a director
        // who draws no sueldo aporta nada), so the datum is not missing for it in the way it is
        // for the SRL, whose every socio con actividad adds 15 BFC.
        if (regime.id === 'srl') flagMissingSociosCount()
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
    sources: [
      { label: 'BPS — Escalas de IRPF 2026', url: IRPF_ESCALA },
      { label: 'Ley 17.738 art. 43 — actividad profesional amparada (CJPPU)', url: LEY17738_43 },
    ],
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
      { label: 'BPS — Industria y Comercio (aporte por socio)', url: BPS_IC },
      {
        label: 'Ley 16.713 art. 172 — aporta el socio que desarrolla actividad',
        url: LEY16713_172,
      },
    ],
  },
  {
    id: 'srl',
    name: 'SRL',
    short:
      'Responsabilidad limitada, mínimo 2 socios. Ceder cuotas exige unanimidad si son 5 socios o menos, más escribano y publicación.',
    liability: 'limitada',
    sources: [
      { label: 'Ley 16.060', url: 'https://www.impo.com.uy/bases/leyes/16060-1989' },
      { label: 'BPS — Industria y Comercio (aporte por socio)', url: BPS_IC },
      {
        label: 'Ley 16.713 art. 172 — 15 BFC por socio que desarrolla actividad',
        url: LEY16713_172,
      },
    ],
  },
  {
    id: 'sas',
    name: 'SAS',
    short:
      'Responsabilidad limitada con un solo socio, sin capital mínimo, sin escribano y 100% online. Pero el administrador paga BPS aunque no facture.',
    liability: 'limitada',
    sources: [
      { label: 'Ley 19.820', url: 'https://www.impo.com.uy/bases/leyes/19820-2019' },
      { label: 'Ley 19.820 art. 29 — órgano de administración', url: LEY19820_29 },
      {
        label: 'Ley 19.820 art. 43 — contribuciones de seguridad social del administrador',
        url: LEY19820_43,
      },
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
  if (cjppuEnJuego(input)) return null
  if (input.people === 'socios') {
    // ROUND-3 CRITICAL 1(a) — this used to read `input.sociosActivos ?? input.sociosCount`, and
    // the fallback hid the error: `sociosActivos` is the datum of Ley 16.713 art. 172 ("el socio
    // QUE DESARROLLE ACTIVIDAD"), and art. 172 does not govern the monotributo at all — this file
    // says so itself, in `cannotCostReasons`. The monotributo is the SUBSTITUTIVE pago único of
    // Ley 18.083 art. 70, and the BPS table that fixes it ("Monotributo: sociedad de hecho") is
    // indexed by a "Cant. socios" column: it charges per SOCIO, not per socio con actividad.
    // Reading art. 172's field here made a 2-socio sociedad de hecho whose socios do not
    // personally work in it cost 2 × $522 × 0 = $0/mes. The right answer is $1.044.
    //
    // A fact that decides the number is asked for, not assumed. (Guessing 2 here would be
    // the same class of bug as `sp ?? 0`: an unknown quietly becoming a measurement.)
    if (nadieEnLaEmpresa(input)) return null
    const socios = input.sociosCount
    if (socios === undefined) return null
    const perSocio = rampPick(
      [FIGURES.monoSocioSociedadHechoAnio1.value, FIGURES.monoSocioSociedadHechoAnio2.value],
      FIGURES.monoSocioSociedadHecho.value,
      input.yearsOperating
    )
    return perSocio * socios
  }
  const { ramp, pleno } = monoFamilyColumn(input)
  return rampPick(ramp, pleno, input.yearsOperating)
}

/**
 * Is the visitor's compulsory retirement contribution (wholly or partly) OUTSIDE BPS, in the
 * Caja de Profesionales Universitarios — making the owner's contribution unknowable?
 *
 * ROUND-2 CRITICAL 2. `irpf-servicios` refused to total a CJPPU professional and then handed
 * the SAME PERSON a complete, cheaper-looking total on the very next regime, whose BPS
 * component is an 11-BFC jubilatorio they do not pay to BPS at all. An unknown that is fatal
 * to one regime and free for its neighbour is not an unknown, it is a ranking bug.
 *
 * Ley 17.738 art. 43, verbatim: "Quedan personal y obligatoriamente sujetos al régimen
 * establecido en la presente ley, los profesionales universitarios que ejerzan en el país en
 * forma libre EN NOMBRE PROPIO y para terceros ... El ejercicio de la profesión para terceros
 * puede ser individual o, repartiéndose los beneficios que de ello provengan, EN SOCIEDAD con
 * otros profesionales o no profesionales o en cooperativas de profesionales, SIN PERJUICIO DE
 * LAS AFILIACIONES A OTROS INSTITUTOS DE SEGURIDAD SOCIAL QUE PUDIERAN CORRESPONDER."
 *
 * WE CANNOT RESOLVE THIS, AND WE SAY SO RATHER THAN PICK A SIDE. Two facts pull against each
 * other and neither norm settles the collision:
 *   - an empresa unipersonal has no separate legal personality, so invoicing through one is
 *     still "en nombre propio" — squarely inside art. 43, jubilatorio to the CJPPU;
 *   - but art. 43's closing clause expressly contemplates that BPS may ALSO be owed on top
 *     ("sin perjuicio de las afiliaciones ... que pudieran corresponder"), and for the SAS,
 *     Ley 19.820 art. 43 positively directs the administrator to art. 172 of Ley 16.713 — i.e.
 *     to BPS — without saying what happens when that administrator is CJPPU-amparado.
 * Both readings are defensible; the CJPPU does not publish its scale either way. So the answer
 * is `null` and a note pointing them at the Caja, in EVERY regime — not a number in either
 * direction, and above all not a number in one regime and a refusal in the next.
 *
 * Scoped to the ACTIVITY that triggers the amparo: a CJPPU title-holder whose company only
 * sells bienes is not exercising the profession through it, so BPS is knowable as usual.
 */
function cjppuEnJuego(input: WizardInput): boolean {
  return input.cajaProfesional === true && input.sells !== 'bienes'
}

/** The BPS unipersonal-titular column (año 1 / 2 / 3 / pleno) for a family situation. */
function unipersonalFamilyColumn(input: WizardInput): { ramp: number[]; pleno: number } {
  switch (input.family ?? 'solo') {
    case 'con-hijos':
      return {
        ramp: [
          FIGURES.bpsUnipersonalAnio1Hijos.value,
          FIGURES.bpsUnipersonalAnio2Hijos.value,
          FIGURES.bpsUnipersonalAnio3Hijos.value,
        ],
        pleno: FIGURES.bpsUnipersonalPlenoHijos.value,
      }
    case 'con-conyuge':
      return {
        ramp: [
          FIGURES.bpsUnipersonalAnio1Conyuge.value,
          FIGURES.bpsUnipersonalAnio2Conyuge.value,
          FIGURES.bpsUnipersonalAnio3Conyuge.value,
        ],
        pleno: FIGURES.bpsUnipersonalPlenoConyuge.value,
      }
    case 'con-conyuge-e-hijos':
      return {
        ramp: [
          FIGURES.bpsUnipersonalAnio1ConyugeHijos.value,
          FIGURES.bpsUnipersonalAnio2ConyugeHijos.value,
          FIGURES.bpsUnipersonalAnio3ConyugeHijos.value,
        ],
        pleno: FIGURES.bpsUnipersonalPlenoConyugeHijos.value,
      }
    default:
      return {
        ramp: [
          FIGURES.bpsUnipersonalAnio1.value,
          FIGURES.bpsUnipersonalAnio2.value,
          FIGURES.bpsUnipersonalAnio3.value,
        ],
        pleno: FIGURES.bpsUnipersonalPleno.value,
      }
  }
}

/**
 * Titular of a unipersonal: ficto of 11 BFC. Returns `null` when the CJPPU is in play.
 *
 * The Ley 19.889 art. 229 ramp (75%/50%/25% off the patronal jubilatorio) is NOT a
 * general "new company" discount: art. 229 → art. 228 → art. 30 Ley 18.083 = the
 * LITERAL E regime, and art. 229 says the exoneration "cesará en la hipótesis en que
 * el contribuyente ingrese al régimen general de liquidación del IVA". So it applies
 * to Literal E and NOT to a unipersonal in IRAE/IVA general. Passing `gradual: false`
 * is what keeps us from promising a discount that does not exist.
 *
 * IMPORTANT 3 — this function used to ignore `input.family` entirely and always return the
 * "solo" column (8.833). BPS publishes FOUR columns, and the monotributo (which HAD been fixed
 * last round) rises with the family while this one did not — so Literal E, the monotributo's
 * direct rival in the one comparison this page exists to decide, pocketed an artificial
 * advantage of up to $1.561/mes for every visitor with a family.
 *
 * `fonasaFromJob` selects BPS's separate "con aporte al SNS por actividad dependiente" column —
 * and that column IS ramped, contrary to what this module used to assert. See
 * `bpsUnipersonalConFonasaDeEmpleoAnio1`.
 */
function unipersonalBps(input: WizardInput, gradual: boolean): number | null {
  if (cjppuEnJuego(input)) return null
  if (input.fonasaFromJob) {
    if (!gradual) return FIGURES.bpsUnipersonalConFonasaDeEmpleo.value
    return rampPick(
      [
        FIGURES.bpsUnipersonalConFonasaDeEmpleoAnio1.value,
        FIGURES.bpsUnipersonalConFonasaDeEmpleoAnio2.value,
        FIGURES.bpsUnipersonalConFonasaDeEmpleoAnio3.value,
      ],
      FIGURES.bpsUnipersonalConFonasaDeEmpleo.value,
      input.yearsOperating
    )
  }
  const { ramp, pleno } = unipersonalFamilyColumn(input)
  if (!gradual) return pleno
  return rampPick(ramp, pleno, input.yearsOperating)
}

/**
 * How many socios owe the aportación: the ones who WORK in the company (Ley 16.713 art. 172),
 * not the ones who merely own it. `undefined` = we were never told, and we do not guess.
 *
 * The sociedad de hecho may fall back to `sociosCount`: BPS's own table for it is indexed by a
 * "Cant. socios" column, and a sociedad de hecho — which arises precisely FROM people operating
 * together without formalising — has no capitalist socios to exclude. An SRL is a capital
 * company whose cuotistas genuinely may not work there, so it gets no such fallback: for it,
 * `sociosActivos` is the only answer, and its absence is an unknown, not a 1.
 */
function sociosQueAportan(input: WizardInput, allowSociosCountFallback: boolean): number | null {
  const activos = input.sociosActivos
  if (activos !== undefined) return activos
  if (allowSociosCountFallback) return input.sociosCount ?? null
  return null
}

/** BPS of an SRL: 15 BFC per socio CON ACTIVIDAD (Ley 16.713 art. 172). Never assumes one. */
function srlBps(input: WizardInput): number | null {
  if (cjppuEnJuego(input)) return null
  const socios = sociosQueAportan(input, false)
  if (socios === null) return null
  return FIGURES.bpsSocioSrl.value * socios
}

/**
 * BPS of a sociedad de hecho: 11 BFC per socio, sin FONASA.
 *
 * ROUND-3 CRITICAL 1(b) — priced off BPS's "Sociedad de hecho SIN DEPENDIENTES" table, so
 * "ningún socio trabaja" + "ningún dependiente" is not a company with no BPS bill: it is a
 * company with nobody in it. See `nadieEnLaEmpresa`.
 */
function sociedadHechoBps(input: WizardInput): number | null {
  if (cjppuEnJuego(input)) return null
  if (nadieEnLaEmpresa(input)) return null
  const socios = sociosQueAportan(input, true)
  if (socios === null) return null
  return FIGURES.bpsSocioSociedadHecho.value * socios
}

/** The BPS SAS-administrador column (2.ª categoría, 15 BFC, FONASA) for a family situation. */
function sasAdminFamilyColumn(input: WizardInput): number {
  switch (input.family ?? 'solo') {
    case 'con-hijos':
      return FIGURES.bpsAdminSasHijos.value
    case 'con-conyuge':
      return FIGURES.bpsAdminSasConyuge.value
    case 'con-conyuge-e-hijos':
      return FIGURES.bpsAdminSasConyugeHijos.value
    default:
      return FIGURES.bpsAdminSas.value
  }
}

/**
 * BPS of a SAS: the administrador/representante legal's 15-BFC ficto, per head.
 *
 * Ley 19.820 art. 43: "El administrador o quienes integren el órgano de administración o, en su
 * caso, el representante legal ... tributarán contribuciones especiales de seguridad social
 * conforme el régimen general previsto en el ARTÍCULO 172 DE LA LEY N° 16.713" — the very same
 * article as the SRL socio, so it is per-head on the same activity logic.
 *
 * Defaulting to ONE is not a guess here, and that is what separates it from the SRL: Ley 19.820
 * art. 29 supplies the default itself — "Salvo que otra cosa se dispusiera en los estatutos, la
 * TOTALIDAD de las funciones de administración y representación legal le corresponderán AL
 * REPRESENTANTE LEGAL". A SAS with no estatuto stipulation HAS exactly one. An SRL can never
 * default to one (Ley 16.060 art. 1 forces ≥2 socios), which is why its unknown stays unknown.
 *
 * Accionistas pay NOTHING qua accionistas: art. 172 of Ley 16.713 lists "sociedades colectivas,
 * de responsabilidad limitada, en comandita y de capital e industria" — a sociedad POR ACCIONES
 * is not among them, and Ley 19.820 art. 43 reaches only the administrador. So this figure must
 * NOT move with `sociosCount`.
 */
function sasBps(input: WizardInput): number | null {
  if (cjppuEnJuego(input)) return null
  return sasAdminFamilyColumn(input) * (input.administradoresSas ?? 1)
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
  if (cjppuEnJuego(input)) return null
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
      `No podemos estimarte el IRAE: por encima de ${FIGURES.topeIraePreceptivoUi.value.toLocaleString('es-UY')} UI de ingresos (≈ ${uyu(uiToUyuCierre(FIGURES.topeIraePreceptivoUi.value))} al año) la contabilidad suficiente es PRECEPTIVA (Dto. 150/007 art. 168) y el ficto del art. 64 deja de estar disponible. ${contador} No extrapolamos el ficto fuera de su rango legal.`
    )
    // MINOR 5 — this caveat used to be pushed ONLY on the branch where the ficto is available.
    // It belongs here more, not less: this is the branch where the regime stops having a price
    // at all. A reader must never watch a regime flip from a printed total to "we can't cost
    // this" without being told the boundary is soft and which year it is measured in.
    notes.push(
      `Ese tope está en UI y lo convertimos con la UI de cierre de ejercicio (${FIGURES.uiCierre2025.value.toLocaleString('es-UY')}), que es la que manda el art. 168 ("a valores de cierre de ejercicio"). Además la norma mira los ingresos del EJERCICIO ANTERIOR y vos nos diste una estimación del actual: si estás cerca del límite, tomá la frontera como aproximada — un poco más abajo, este régimen sí tiene un costo estimable.`
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
    `Los tramos están en UI y los convertimos con la UI de hoy (${FIGURES.uiHoy.value.toLocaleString('es-UY')}), que se mueve todos los días: si estás cerca del borde de un tramo, tomá la cifra como aproximada. (A diferencia del tope del art. 168, el art. 64 no dice a qué fecha valuar sus tramos, así que esta conversión es nuestra aproximación, no la de la norma.)`
  )
  // MINOR 8 — this note used to claim art. 64 admits deducting "hasta 11 BFC por dueño o socio
  // que preste servicios efectivos". It does not. The empresarial ficto says only: "la renta
  // neta se determinará DEDUCIENDO LOS SUELDOS DE DUEÑOS O SOCIOS ADMITIDOS POR LA
  // REGLAMENTACIÓN" — no cap, no number. The 11 BFC was lifted from a DIFFERENT inciso of the
  // same article, the AGROPECUARIO one ("b) Por cada dueño o socio, once Bases Fictas de
  // Contribución mensuales ... a condición de que se presten efectivos servicios"), which does
  // not govern the empresarial ficto this model applies. So did "servicios efectivos".
  //
  // Worth naming the mechanism: the AST guard walks NumericLiterals and cannot see a number
  // living inside a string. Every quantity asserted in prose here is outside its reach and can
  // only be held true by a human reading the norm. We removed the number rather than sourcing
  // it, because it is not there to source.
  notes.push(
    'No descontamos los sueldos de dueños o socios que el art. 64 admite restar de la renta ficta ("los sueldos de dueños o socios admitidos por la reglamentación"): si los cobrás, tu IRAE real será menor que el que mostramos.'
  )

  return {
    amount: (iraeFictoRentaNetaAnual(input.annualRevenueUyu) * FIGURES.irae.value) / 12,
    notes,
  }
}

/**
 * The regime-specific half of the CJPPU note. Each states the OPEN QUESTION for that shape of
 * taxpayer, rather than resolving it — because neither Ley 17.738 nor Ley 19.820 resolves it,
 * and a guess in either direction is a wrong number on a legal-information page.
 */
const unipersonalCjppuCaveat =
  'Una empresa unipersonal no es una persona jurídica distinta de vos, así que seguís facturando EN NOMBRE PROPIO — que es exactamente el supuesto del art. 43 de la Ley 17.738, el que te ampara en la CJPPU. Lo que la norma NO resuelve es si además te corresponde el ficto de 11 BFC de BPS por la actividad de la empresa: el mismo artículo dice que el amparo rige "sin perjuicio de las afiliaciones a otros institutos de seguridad social que pudieran corresponder", sin decir cuándo corresponden. No lo inventamos en ninguna de las dos direcciones.'

/**
 * The two answers that cannot both be true. See `nadieEnLaEmpresa`. Shown as a NOTE by
 * `estimateCost` and as a `cannotCost` reason by `cannotCostReasons` — the same fact, told once
 * in each layer, and derived in both from the FLAGS and the input, never from this string.
 */
const nadieEnLaEmpresaCaveat =
  'Hay una contradicción en lo que nos dijiste, y preferimos señalarla antes que ponerle un precio: nos dijiste que NINGÚN socio trabaja en la empresa y, a la vez, que NO hay dependientes. Entonces no queda nadie que haga la actividad. Si en los hechos la maneja un gerente contratado, ese gerente ES un dependiente — y las tablas de BPS con las que se cotiza esta figura son justamente las de "SIN DEPENDIENTES" (en el monotributo no es un encabezado de tabla sino la ley: los lits. B y C del art. 70 de la Ley 18.083 exigen que no haya ninguno). Corregí uno de los dos datos —cuántos dependientes tiene, o cuántos socios trabajan— y te damos el número.'

const sociedadCjppuCaveat =
  'El art. 43 de la Ley 17.738 ampara expresamente el ejercicio de la profesión "en sociedad con otros profesionales o no profesionales", y aclara que eso rige "sin perjuicio de las afiliaciones a otros institutos de seguridad social que pudieran corresponder". O sea: el aporte de socio/administrador a BPS que mostraríamos acá podría deberse ADEMÁS del aporte a la CJPPU, no en su lugar — con lo cual el costo real sería MAYOR, no menor. Ninguna de las dos normas dice cuál es.'

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
    notes.push(
      gradual
        ? 'Ya tenés FONASA por un empleo, así que te cobramos la columna del titular con cobertura por otra actividad — y sí, esa columna también tiene la rebaja de la Ley 19.889: BPS la publica para los tres primeros años.'
        : 'Ya tenés FONASA por un empleo, así que te cobramos la columna del titular con cobertura por otra actividad.'
    )
  }

  /**
   * The note a CJPPU-amparado professional is owed, in whatever regime they are looking at.
   *
   * Its job is to be USEFUL WITHOUT BEING FALSE. We do not know whether their jubilatorio goes
   * to the CJPPU instead of BPS, or to the CJPPU on top of BPS — Ley 17.738 art. 43 expressly
   * leaves both open ("sin perjuicio de las afiliaciones a otros institutos de seguridad social
   * que pudieran corresponder") — and the CJPPU does not publish its scale either way. So we
   * refuse to total, and we say exactly why, per regime.
   */
  const cjppuNote = (extra: string) => {
    notes.push(
      `NO INCLUYE TU APORTE JUBILATORIO. Tenés un título amparado por la Caja de Profesionales Universitarios (CJPPU) y ejercés la profesión, así que tu aporte jubilatorio no se rige por la tabla de BPS que usamos para todo el mundo. ${extra} Encima, la CJPPU no publica su escala de forma abierta: consultala directamente. Por eso NO te mostramos un total — sería menor que el real, y no un poco.`
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
      if (cjppuEnJuego(input)) cjppuNote(sociedadCjppuCaveat)
      if (input.people === 'socios' && !cjppuEnJuego(input)) {
        if (nadieEnLaEmpresa(input)) {
          notes.push(nadieEnLaEmpresaCaveat)
        } else if (bpsMonthly === null) {
          notes.push(
            'No podemos calcular el BPS: no sabemos cuántos socios son. En una sociedad de hecho, BPS cobra el aporte POR SOCIO, así que el número depende de ese dato.'
          )
        } else {
          notes.push(
            `Este es el costo de LA SOCIEDAD, no tu parte: BPS cobra ${uyu(FIGURES.monoSocioSociedadHecho.value)} por socio en el régimen pleno, y lo multiplicamos por los ${String(input.sociosCount)} socios que nos dijiste. Ojo: acá NO manda el art. 172 de la Ley 16.713 (el del "socio con actividad") — el monotributo es el pago único sustitutivo de la Ley 18.083 art. 70, y la tabla que BPS publica para él se indexa por la CANTIDAD DE SOCIOS, trabajen o no.`
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
      // Unlike the common monotributo, this regime DOES admit servicios (Ley 18.874 art. 1
      // expressly covers "prestan servicios"), so a CJPPU professional can actually reach it —
      // and the same unknown applies. Treating it uniformly is what keeps the leak closed.
      bpsMonthly = cjppuEnJuego(input)
        ? null
        : rampPick(
            [
              FIGURES.monoSocialAnio1SinFonasa.value,
              FIGURES.monoSocialAnio2SinFonasa.value,
              FIGURES.monoSocialAnio3SinFonasa.value,
            ],
            FIGURES.monoPlenoSinFonasa.value,
            input.yearsOperating
          )
      setupCost = 0
      if (bpsMonthly === null) cjppuNote(unipersonalCjppuCaveat)
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
      if (bpsMonthly === null) cjppuNote(unipersonalCjppuCaveat)
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
      if (bpsMonthly === null) cjppuNote(unipersonalCjppuCaveat)
      unipersonalBpsNotes(false)
      notes.push('Además liquidás IVA en régimen general (22%), que cobrás a tus clientes.')
      notes.push(
        'La rebaja de aportes patronales para empresas nuevas NO aplica acá: es un beneficio del Literal E y cesa al entrar al régimen general de IVA.'
      )
      break
    }

    case 'irpf-servicios': {
      // CRITICAL 1 — `sp ?? 0` used to launder "we cannot know this" into "this is free".
      bpsMonthly = serviciosPersonalesBps(input)
      setupCost = FIGURES.setupUnipersonal.value

      // ROUND-3 CRITICAL 2 — above the límite of Dto. 150/007 art. 7 there is no honest monthly
      // number for this path. The IRPF of the CURRENT ejercicio is still computable, and that is
      // precisely the trap: printing it as "el costo de este régimen" would be a 12-month answer
      // to a multi-year question, on a page whose entire job is choosing a régimen to OPEN. From
      // the first month of the next ejercicio this person is in the IRAE — and there, above the
      // tope, the ficto del art. 64 is gone too (Dto. 150/007 art. 168: contabilidad suficiente
      // preceptiva), so the tax becomes IRAE REAL, which depends on an expense structure we do
      // not have. `unipersonal-irae` and `sas` already refuse at this exact revenue. So does this.
      if (irpfIraePreceptivo(input.annualRevenueUyu)) {
        const tope = FIGURES.topeIrpfIraePreceptivoUi.value
        taxMonthly = null
        notes.push(
          `No podemos ponerle un costo mensual a este camino: por encima de ${tope.toLocaleString('es-UY')} UI de rentas por servicios personales (≈ ${uyu(uiToUyuCierre(tope))} al año, a la cotización de cierre), el Dto. 150/007 art. 7 obliga a liquidar IRAE "a partir del primer mes del ejercicio siguiente". El IRPF de ESTE ejercicio todavía se calcula; el del que viene no existe, y el IRAE que lo reemplaza es el REAL —25% de (ingresos − gastos reales)— porque arriba del tope la contabilidad suficiente es preceptiva y el ficto del art. 64 deja de estar disponible. No conocemos tu estructura de gastos: para esto necesitás un contador.`
        )
        notes.push(
          `Ese límite lo mira la norma sobre las rentas del EJERCICIO (no del anterior, a diferencia del tope del art. 168) y lo convierte con la UI de CIERRE de ejercicio (${FIGURES.uiCierre2025.value.toLocaleString('es-UY')}), no con la de hoy. Si estás cerca del límite, tomá la frontera como aproximada: un poco más abajo, este régimen sí tiene un costo estimable.`
        )
      } else {
        const taxable = monthlyRevenue * (1 - FIGURES.irpfFictoGastos.value)
        taxMonthly = irpfCat2Monthly(taxable)
        // MINOR 11 — IRPF Cat. II lets you subtract a CRÉDITO por deducciones (aportes
        // jubilatorios, FONASA, FRL, hijos a cargo) computed at 14% u 8% según el nivel de
        // ingresos. We do not collect the inputs it needs, so we do not compute it — but the
        // omission runs against the taxpayer, and an undisclosed conservatism is still wrong.
        // (Scoped to the branch that actually SHOWS an IRPF: above the tope there is no number
        // for it to be a techo of.)
        notes.push(
          'El IRPF que mostramos es MAYOR al que realmente pagarías: no le restamos el crédito por DEDUCCIONES (aportes jubilatorios, FONASA, FRL, hijos a cargo), que se descuenta del impuesto a una tasa del 14% o del 8% según tu nivel de ingresos. Nos faltan datos para calcularlo; tomá el IRPF como un techo.'
        )
      }

      if (bpsMonthly === null) {
        cjppuNote(
          'Acá el punto es el más claro de todos: ejercés en forma libre y en nombre propio, así que el jubilatorio lo aportás a la CJPPU y no a BPS (Ley 17.738 art. 43). Tu FONASA sí lo pagás a BPS.'
        )
      } else {
        notes.push(
          `El BPS son dos cosas sobre bases distintas: ${uyu(FIGURES.spJubilatorioFicto.value)} de jubilatorio sobre un ficto FIJO (no importa cuánto factures), más FONASA sobre lo que realmente facturás (70% de lo facturado × ${spFonasaRate(input).toLocaleString('es-UY', { style: 'percent', maximumFractionDigits: 1 })}), con un piso de ${uyu(FIGURES.spFonasaMinimo.value)}.`
        )
      }
      notes.push(
        `Se deduce un ficto de gastos del 30% y hay un mínimo no imponible de ${uyu(FIGURES.irpfMinimoNoImponibleMensual.value)} al mes: por eso al principio suele ganarle al IRAE.`
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
      const socios = sociosQueAportan(input, true)
      bpsMonthly = sociedadHechoBps(input)
      const irae = iraeFictoMonthly(input)
      taxMonthly = irae.amount
      accountant = accountantMonthly
      setupCost = 0
      if (cjppuEnJuego(input)) {
        cjppuNote(sociedadCjppuCaveat)
      } else if (nadieEnLaEmpresa(input)) {
        notes.push(nadieEnLaEmpresaCaveat)
      } else if (bpsMonthly === null) {
        notes.push(
          'No podemos calcular el BPS: no sabemos cuántos socios son, y en una sociedad de hecho cada socio aporta por separado.'
        )
      } else {
        notes.push(
          `Este número es el costo de LA SOCIEDAD, no tu parte: cada socio aporta ${uyu(FIGURES.bpsSocioSociedadHecho.value)} de BPS (11 BFC), y son ${String(socios)} socios con actividad. El IRAE también es el de toda la sociedad, sobre la facturación total.`
        )
        if (input.sociosActivos === undefined) {
          notes.push(
            'Contamos que TODOS los socios trabajan en la sociedad. No es una suposición nuestra: la tabla que publica BPS para esta figura es la de la sociedad de hecho SIN DEPENDIENTES, y si no hay empleados el trabajo lo hacen los socios. Si alguno es puramente capitalista y no desarrolla actividad, queda fuera del art. 172 de la Ley 16.713 y no aporta — decínoslo y el número baja.'
          )
        }
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
      // ROUND-2 CRITICAL 1 — this used to be a flat `FIGURES.bpsSocioSrl.value`: ONE socio,
      // always, no matter how many people the visitor said they were going into business with.
      // With two working socios the SRL costs $12.530/mes, not $6.265, and the page RANKED IT
      // FIRST as the cheapest option when it was in fact the most expensive of the three.
      bpsMonthly = srlBps(input)
      const irae = iraeFictoMonthly(input)
      taxMonthly = irae.amount
      accountant = accountantMonthly
      setupCost = FIGURES.setupSrl.value
      notes.push(...irae.notes)
      if (cjppuEnJuego(input)) {
        cjppuNote(sociedadCjppuCaveat)
      } else if (bpsMonthly === null) {
        notes.push(
          `No podemos calcular el BPS de la SRL: no sabemos cuántos socios DESARROLLAN ACTIVIDAD en la empresa, y ese es justo el dato del que depende. La Ley 16.713 art. 172 cobra ${uyu(FIGURES.bpsSocioSrl.value)} (15 BFC) por CADA socio "que desarrolle actividad de cualquier naturaleza dentro de la empresa", tenga o no la calidad de administrador. No asumimos que sea uno solo: si son dos, el aporte se duplica, y eso puede dar vuelta la comparación con la SAS y la sociedad de hecho.`
        )
      } else {
        notes.push(
          `El BPS es el de LA SOCIEDAD: ${uyu(FIGURES.bpsSocioSrl.value)} (15 BFC) por cada uno de los ${String(input.sociosActivos)} socios que trabajan en la empresa. La Ley 16.713 art. 172 lo cobra por socio "que desarrolle actividad de cualquier naturaleza dentro de la empresa", tenga o no la calidad de administrador.`
        )
        notes.push(
          'El socio que NO trabaja en la empresa (puramente capitalista) queda fuera del art. 172 y no aporta por esta vía: tiene que quedar declarado así ante BPS.'
        )
      }
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
      bpsMonthly = sasBps(input)
      const irae = iraeFictoMonthly(input)
      taxMonthly = irae.amount
      accountant = accountantMonthly
      setupCost = FIGURES.setupSas.value
      notes.push(...irae.notes)
      if (cjppuEnJuego(input)) {
        cjppuNote(sociedadCjppuCaveat)
      } else {
        const admins = input.administradoresSas ?? 1
        notes.push(
          `Cada administrador paga ${uyu(sasAdminFamilyColumn(input))} de BPS al mes AUNQUE NO COBRE SUELDO NI FACTURE UN PESO, y no puede declararse inactivo. Es el costo real de la SAS.`
        )
        // ROUND-3 IMPORTANT 3 — the `undefined` branch was DEAD CODE: the page initialised the
        // field to `1` and clamped it with `Math.max(1, …)`, so the engine was never handed
        // `undefined` and always took the second branch — which told every visitor "Nombraste 1
        // administradores": a false claim about what they had said (they had said nothing), an
        // ungrammatical one, and it threw away the art. 29 citation that JUSTIFIES the 1. The one
        // input where the law supplies its own default was the one the page turned into a fake
        // measurement. The page now passes `undefined`; this branch is live again.
        notes.push(
          input.administradoresSas === undefined
            ? 'Contamos UN solo administrador, que es lo que la propia Ley 19.820 (art. 29) supone si el estatuto no dice otra cosa: "la totalidad de las funciones de administración y representación legal le corresponderán al representante legal". Si nombrás más de uno, cada uno aporta lo suyo y el costo se multiplica — no hay tope legal de administradores (art. 30: "una o más personas").'
            : `Nos dijiste que la SAS tiene ${String(admins)} ${admins === 1 ? 'administrador' : 'administradores'}, y la Ley 19.820 (art. 43) manda a cada uno al mismo art. 172 de la Ley 16.713 que al socio de SRL: cada uno aporta lo suyo.`
        )
      }
      notes.push('A cambio, sí tenés cobertura FONASA.')
      notes.push(
        'Un accionista que no administra ni representa NO aporta a BPS por ser accionista: el art. 172 de la Ley 16.713 no alcanza a las sociedades por acciones, y la Ley 19.820 solo llama al administrador.'
      )
      notes.push(
        `Por debajo de ${FIGURES.topeIraePreceptivoUi.value.toLocaleString('es-UY')} UI de ingresos, los dividendos que retirás están EXENTOS de IRPF: la carga total es 25%, no 30,25%.`
      )
      break
    }

    case 'sa': {
      // A director who draws no sueldo genuinely contributes nothing — this 0 is a measured
      // zero, not an unknown one, and `bpsUnknown` stays false. (It stays a measured zero even
      // for a CJPPU professional: BPS really does get nothing from an unsalaried director. What
      // they DO owe the Caja is unknowable, and the note below says so. The total is null
      // regardless, because the IRAE of an SA never is.)
      bpsMonthly = 0
      // MINOR 7 — this cite used to read "Título 4 art. 12 lit. A num. 1". Wrong article, and
      // it disagreed with the one `iraeFictoMonthly` gets right a few lines away. Dto. 150/007
      // art. 168 lit. a), verbatim: "Los sujetos pasivos comprendidos en los numerales 1 y 4 a 7
      // del literal A del ARTÍCULO 3º del Título que se reglamenta" — art. 3, whose lit. A
      // num. 1 is "las sociedades anónimas y las sociedades en comandita por acciones". ICOSA,
      // on the other hand, is perfectly knowable — so it lives in `otherTaxesMonthly` and
      // survives the IRAE being null.
      const irae = iraeFictoMonthly(input, true)
      taxMonthly = irae.amount
      otherTaxesMonthly = FIGURES.icosaAnual.value / 12
      accountant = accountantMonthly
      setupCost = FIGURES.icosaConstitucion.value
      notes.push(...irae.notes)
      if (cjppuEnJuego(input)) cjppuNote(sociedadCjppuCaveat)
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

// =======================================================================================
// THE VERDICT
// =======================================================================================

/**
 * Something that changes the decision but never shows up in the monthly number. These are the
 * point of the page, not decoration: the cheapest regime and the right regime are different
 * questions, and the gap between them is made of exactly these three things.
 */
export interface Warning {
  kind: 'lockout' | 'liability' | 'grey-zone'
  text: string
  /** NIT — required, like `GateReason.norm`/`Lockout.norm`: every construction site below
   * already supplies one, and nothing renders a warning without citing what it is about. */
  norm: string
  /** NIT — required, like `GateReason.url`/`Lockout.url`, for the same reason. */
  url: string
  /**
   * Which regime this warning is about. Set on a `grey-zone` warning that names a CHEAPER,
   * un-recommended `dudoso` regime — never `recommended` itself, since `recommended` is never
   * `dudoso` (see `evaluate`, rule 3). Absent on `lockout`/`liability`, which are implicitly
   * about the recommendation.
   */
  regime?: RegimeId
  /**
   * Only on a `grey-zone` warning about a cheaper un-recommended alternative: how much LESS
   * it would cost per month than `recommended`. A structured number, not a string baked into
   * `text`, so the page can render it (bold it, format it, translate it) independently of the
   * prose. Absent otherwise.
   */
  cheaperByMonthly?: number
}

/** One regime, judged: legally, then (only then) on price. */
export interface RankedRegime {
  regime: RegimeId
  status: Eligibility
  reasons: GateReason[]
  /**
   * `null` for an `excluido` regime — deliberately, and not as a shortcut. A regime you may
   * not legally use does not have a price: it is not "more expensive", it is illegal, and
   * handing it a number invites precisely the comparison the gates exist to forbid.
   */
  cost: CostBreakdown | null
  /**
   * The cost exists but could not be COMPLETED (`bpsUnknown || taxUnknown`, i.e. a null
   * total). Not cheap. Not zero. Not comparable. See the contract on `CostBreakdown`.
   */
  costIncomplete: boolean
  /**
   * The only flag the ranker reads: legally open AND completely costed. Only a `comparable`
   * regime may be compared by price, and only a `comparable` regime may be recommended.
   */
  comparable: boolean
  /**
   * The honest "no podemos calcularlo, y por qué", for the reader.
   *
   * Derived from the cost's FLAGS and the visitor's own answers — NEVER by sniffing the text
   * of `notes` (the `CostBreakdown` contract forbids that for good reason: a substring is not
   * a signal). Empty iff the regime is excluded (where `reasons` already says why) or its cost
   * is complete (where there is nothing to excuse).
   */
  cannotCost: string[]
  lockout?: Lockout
}

export interface Verdict {
  /**
   * The cheapest regime the visitor may legally use AND whose cost we can actually compute.
   *
   * `null` is a REAL ANSWER, not a failure mode: for a CJPPU professional, or for anyone
   * above UI 4.000.000, every regime open to them has a component we cannot source, and the
   * honest verdict is "we cannot tell you which is cheapest, and here is exactly why". The
   * alternative — recommending the one whose unknown parts happen to sum to the smallest
   * number — is how `totalMonthly: 0` nearly shipped as "the freelance path is free".
   */
  recommended: RegimeId | null
  /** Why we declined to recommend anything. `null` iff `recommended` is non-null. */
  noRecommendation: string | null
  /** Every regime, always: comparable ones first (cheapest first), then un-costable, then illegal. */
  ranked: RankedRegime[]
  /**
   * Mostly about the RECOMMENDED regime (`lockout`, `liability`) — plus, when a cheaper
   * `dudoso` regime exists, a `grey-zone` warning that names IT instead (see `evaluate`,
   * rule 3): the visitor deserves to know the cheaper contested path exists and exactly why
   * we declined to recommend it, not just what we picked. No recommendation ⇒ no warnings:
   * rule 4 forbids falling back to a `dudoso` price, so there is nothing to compare against.
   */
  warnings: Warning[]
}

/** The revenue ceiling of a regime, when it has one. `null` = nothing to be close to. */
function ceilingOf(regime: RegimeId, input: WizardInput): number | null {
  switch (regime) {
    // Same rule `applyGates` uses for these two regimes — see `monotributoTope`.
    case 'monotributo':
    case 'monotributo-social':
      return monotributoTope(input)
    case 'unipersonal-literal-e':
      return FIGURES.topeLiteralEUyu.value
    default:
      return null
  }
}

/**
 * Why a cost could not be completed, in words the visitor can act on.
 *
 * Built from the FLAGS (`bpsUnknown` / `taxUnknown`) plus the same predicates `estimateCost`
 * itself used (`cjppuEnJuego`) — never from the text of `notes`. That is the whole discipline:
 * an unknown is a structured fact, and every layer that touches it must read it as one.
 */
function cannotCostReasons(regime: RegimeId, input: WizardInput, cost: CostBreakdown): string[] {
  const out: string[] = []

  if (cost.bpsUnknown) {
    // IMPORTANT 1 — this used to emit ONE non-CJPPU message for every regime with
    // `bpsUnknown`, citing Ley 16.713 art. 172. Art. 172 governs the aportación ficta
    // patronal of a socio "de las sociedades colectivas, de responsabilidad limitada, en
    // comandita y de capital e industria ... que desarrolle actividad de cualquier
    // naturaleza dentro de la empresa" (verified verbatim against
    // impo.com.uy/bases/leyes/16713-1995/172) — which is exactly right for the SRL and
    // defensible for the sociedad de hecho, and says NOTHING about the monotributo. The
    // monotributo's aporte is a different thing entirely: the substitutive, unified pago
    // único of Ley 18.083 art. 70, whose BPS table fixes the per-socio figure directly
    // (`monoSocioSociedadHecho`). Citing art. 172 there was a citation that did not support
    // its use — the exact defect this file exists to catch, one regime over.
    if (cjppuEnJuego(input)) {
      out.push(
        'No podemos calcular tu aporte jubilatorio: tenés un título amparado por la Caja de Profesionales Universitarios (CJPPU) y ejercés la profesión, así que no se rige por la tabla de BPS que usamos para todo el mundo — y la CJPPU no publica su escala de forma abierta. Encima, la Ley 17.738 art. 43 deja expresamente abierto que ADEMÁS te corresponda aportar a BPS ("sin perjuicio de las afiliaciones a otros institutos de seguridad social que pudieran corresponder"), sin decir cuándo. Consultá a la Caja: no lo inventamos en ninguna de las dos direcciones.'
      )
    } else if (nadieEnLaEmpresa(input)) {
      // ROUND-3 CRITICAL 1(b). Not "we don't know how many socios" — we know exactly what you
      // told us, and the two answers cannot both be true. See `nadieEnLaEmpresa`.
      out.push(nadieEnLaEmpresaCaveat)
    } else if (regime === 'monotributo') {
      out.push(
        `No podemos calcular el aporte a BPS: el monotributo es un pago único sustitutivo que la propia tabla de BPS fija (Ley 18.083 art. 70), y en una sociedad de hecho monotributista ese pago se cobra POR SOCIO — ${uyu(FIGURES.monoSocioSociedadHecho.value)} en el régimen pleno. No sabemos cuántos socios trabajan acá: si son dos, el aporte se duplica, y eso puede dar vuelta la comparación entre los regímenes de sociedad.`
      )
    } else if (regime === 'monotributo-social') {
      out.push(
        `No podemos calcular el aporte a BPS: el monotributo social es el pago único sustitutivo que fija la propia tabla de BPS (Ley 18.874), y no sabemos cuántos socios trabajan en el emprendimiento asociativo. No asumimos un número: eso puede dar vuelta la comparación entre los regímenes de sociedad.`
      )
    } else {
      out.push(
        `No podemos calcular el aporte a BPS: se cobra POR CADA SOCIO que desarrolla actividad dentro de la empresa (Ley 16.713 art. 172), y no sabemos cuántos socios trabajan acá. No asumimos que sea uno solo: si son dos, el aporte se duplica, y eso puede dar vuelta la comparación entre los regímenes de sociedad.`
      )
    }
  }

  if (cost.taxUnknown) {
    if (regime === 'sa') {
      out.push(
        'No podemos estimarte el IRAE, y en el caso de la SA no vamos a poder NUNCA: está obligada a liquidar por contabilidad suficiente sin importar cuánto facture (Dto. 150/007 art. 168 lit. A), así que el IRAE ficto no le está disponible en ningún nivel de facturación. Su IRAE depende de su estructura real de gastos, que no conocemos.'
      )
    } else if (regime === 'irpf-servicios') {
      // ROUND-3 CRITICAL 2 — the ONE regime here whose tax is not an IRAE, and whose unknown has
      // a different shape: the number for THIS ejercicio exists, and the régimen does not survive
      // it. Citing the art. 168 tope (as the generic branch below does) would be citing the right
      // number from the wrong norm — art. 7 is the article that closes this door.
      const tope = FIGURES.topeIrpfIraePreceptivoUi.value
      out.push(
        `No le ponemos un costo mensual, aunque el IRPF de este año sí se pueda calcular. Por encima de ${tope.toLocaleString('es-UY')} UI de rentas por servicios personales (≈ ${uyu(uiToUyuCierre(tope))} al año, a la cotización de cierre de ejercicio), el Dto. 150/007 art. 7 obliga a liquidar IRAE "a partir del primer mes del ejercicio siguiente": este régimen se te termina dentro del año. Y el IRAE que lo reemplaza es el REAL —arriba de ese tope la contabilidad suficiente es preceptiva y el ficto del art. 64 no está disponible—, que depende de tus gastos reales y no conocemos. Darte un total mensual de un camino que la ley cierra en menos de un año sería el error más caro de la página.`
      )
    } else {
      out.push(
        `No podemos estimarte el IRAE: por encima de ${FIGURES.topeIraePreceptivoUi.value.toLocaleString('es-UY')} UI de ingresos (≈ ${uyu(uiToUyuCierre(FIGURES.topeIraePreceptivoUi.value))} al año) la contabilidad suficiente es PRECEPTIVA (Dto. 150/007 art. 168) y el ficto del art. 64 deja de estar disponible. El IRAE real es el 25% de (ingresos − gastos reales) y depende de tu estructura de gastos, que no conocemos. No extrapolamos el ficto fuera de su rango legal.`
      )
    }
  }

  if (out.length > 0) {
    // ROUND-3 IMPORTANT 4 — "Lo que SÍ sabemos suma $0 al mes" is the forbidden sentence, and it
    // was reachable one click off the normal path (people: 'socios', nothing else touched: bps
    // null, tax 0, contador 0). A floor of zero is not a floor — it is the same "$0 as a price"
    // this round exists to kill, wearing a caveat.
    //
    // The condition is on HOW MANY components we actually know, not on their sum: a sum can be
    // zero for two very different reasons, and only one of them ("we know these components and
    // they are genuinely free") is a floor worth printing. The rounded sum is checked too, so a
    // sub-peso floor can never round its way back to "$0".
    const conocidos = [
      cost.bpsUnknown ? null : cost.bpsMonthly,
      cost.taxUnknown ? null : cost.taxMonthly,
      cost.otherTaxesMonthly,
      cost.accountantMonthly,
    ].filter((n): n is number => n !== null && n > 0)

    out.push(
      conocidos.length === 0 || Math.round(cost.knownPartialMonthly) <= 0
        ? 'Por eso no le ponemos precio ni lo comparamos con los demás. No conocemos NINGÚN componente de este costo: no tenemos ni un piso que mostrarte. Un número incompleto que se ordena junto a números completos deja de ser incompleto y pasa a ser falso — y un piso de cero sería lo mismo, con una nota al pie.'
        : `Por eso no le ponemos precio ni lo comparamos con los demás. Lo que SÍ sabemos suma ${uyu(cost.knownPartialMonthly)} al mes — pero eso es un PISO, no un total: el costo real es mayor, y no sabemos cuánto. Un número incompleto que se ordena junto a números completos deja de ser incompleto y pasa a ser falso.`
    )
  }

  return out
}

/**
 * The verdict: which legal form should this person open?
 *
 * LEGAL GATES FIRST, COST SECOND, AND AN UNKNOWN IS NEVER A ZERO. Four rules, in order:
 *
 *   1. A regime the visitor may not legally use (`excluido`) is never recommended, and is
 *      never given a price at all. Cost is not a defence against a gate.
 *   2. A regime whose cost `estimateCost` could not COMPLETE is never recommended and never
 *      enters the price comparison. It is still SHOWN — with its status, its reasons and an
 *      honest `cannotCost` — because "we cannot know this" is information, and hiding it is
 *      what makes people trust the numbers that are left. There is no `?? 0` and no
 *      `?? Infinity` in this function: an unknown does not enter the sort wearing a number,
 *      it does not enter the sort.
 *   3. Among what remains, the cheapest `elegible` regime wins. A `dudoso` regime is NEVER
 *      recommended — not at a tie, and not even when it is strictly cheaper, and not even when
 *      it is the only priced option. For a freelancer, Literal E is both the cheapest
 *      comparable regime and a genuine legal grey zone (Consulta DGI 4761); recommending the
 *      contested path to save a few hundred pesos a month is exactly the failure this page
 *      exists to avoid, so we recommend the solid path (IRPF Cat. II) instead. The `dudoso`
 *      regime is still SHOWN, with its price and its reason — and because a visitor deserves
 *      to know a cheaper contested path exists rather than have it quietly buried, a
 *      `grey-zone` warning says so explicitly: which regime, how much cheaper per month, and
 *      the exact reason (with its norm and URL) we are declining to recommend it anyway.
 *   4. If NO `elegible` regime has a complete, comparable cost, `recommended` stays `null`.
 *      We do NOT fall back to a `dudoso` price just because it is the only one available:
 *      "we can't recommend anything" is the honest verdict, not "here's the contested one".
 *
 * `recommended: null` is therefore a real, and sometimes the only honest, verdict.
 */
export function evaluate(
  input: WizardInput,
  accountantMonthly: number = MARKET_ESTIMATES.contadorMensual.value
): Verdict {
  const byId = new Map(REGIMES.map(r => [r.id, r]))

  const ranked: RankedRegime[] = applyGates(input).map(g => {
    const cost = g.status === 'excluido' ? null : estimateCost(g.regime, input, accountantMonthly)
    const costIncomplete = cost !== null && cost.totalAnnual === null
    return {
      regime: g.regime,
      status: g.status,
      reasons: g.reasons,
      cost,
      costIncomplete,
      comparable: cost !== null && cost.totalAnnual !== null,
      cannotCost: cost !== null && costIncomplete ? cannotCostReasons(g.regime, input, cost) : [],
      lockout: byId.get(g.regime)?.lockout,
    }
  })

  // The price is read ONCE, here, and only off a regime that is both legally open and
  // completely costed. Everything downstream sorts and compares plain numbers, because
  // nothing that was not a number ever got in.
  const priced: { r: RankedRegime; price: number }[] = []
  for (const r of ranked) {
    if (!r.comparable) continue
    const price = r.cost?.totalAnnual
    if (price === undefined || price === null) continue
    priced.push({ r, price })
  }
  priced.sort((a, b) => a.price - b.price)

  // RULE 3 — the recommendation is drawn from `elegible` priced regimes ONLY. A `dudoso`
  // regime never enters this pool, however cheap: `priced` is sorted ascending, so the first
  // `elegible` entry in it is, by construction, the cheapest `elegible` one. A cheaper
  // `dudoso` regime (if any) is reported below as a warning, never promoted here.
  const eligiblePriced = priced.filter(p => p.r.status === 'elegible')
  const best = eligiblePriced[0] ?? null
  const recommended = best?.r.regime ?? null

  const noRecommendation =
    recommended === null
      ? 'No podemos recomendarte ninguno con los datos que nos diste: de los regímenes que legalmente podrías usar, ninguno tiene un costo que podamos calcular ENTERO. Abajo está cada uno, con lo que sí sabemos, lo que no, y por qué. Preferimos no darte un número antes que darte uno más bajo que el real: el que se ve más barato acá suele ser, justamente, aquel al que le falta la parte más cara.'
      : null

  // Comparables first (cheapest first), then the legally-open-but-un-costable, then the
  // illegal. Each regime lands in exactly one bucket, so `ranked.length` is preserved.
  const ordered: RankedRegime[] = [
    ...priced.map(p => p.r),
    ...ranked.filter(r => r.status !== 'excluido' && !r.comparable),
    ...ranked.filter(r => r.status === 'excluido'),
  ]

  const warnings: Warning[] = []
  // MINOR 5 — `rec` used to be computed here (`ranked.find(r => r.regime === recommended)`),
  // an O(n) scan whose ONLY use was the guard below. `best.r` is that same object: `best` is
  // drawn from `priced`, whose entries are pushed straight from `ranked` (see the loop above),
  // and `recommended` is defined as `best?.r.regime` — so whenever `best` is non-null, `best.r`
  // IS the ranked entry for `recommended`. Nothing was gained by finding it a second time.
  const regime = recommended === null ? undefined : byId.get(recommended)

  if (regime !== undefined && best !== null) {
    // THE LOCKOUT. It only matters if you are near the ceiling of the regime we are
    // recommending — and "near" is a product judgement, so it is declared as one
    // (PRODUCT_THRESHOLDS, not FIGURES: no norm defines it).
    const ceiling = ceilingOf(regime.id, input)
    const ratio = PRODUCT_THRESHOLDS.lockoutAlertRatio.value
    if (
      ceiling !== null &&
      regime.lockout !== undefined &&
      input.annualRevenueUyu >= ceiling * ratio
    ) {
      const margen = (1 - ratio).toLocaleString('es-UY', {
        style: 'percent',
        maximumFractionDigits: 0,
      })
      // NIT — at revenue EXACTLY `ceiling * ratio` (the boundary the `>=` above fires on),
      // the remaining gap to the ceiling is EXACTLY `margen`, not less than it. "estás a MENOS
      // DEL 15%" was false right at the boundary; "estás DENTRO DEL 15%" is true there and
      // everywhere past it, matching the `>=` comparison exactly.
      warnings.push({
        kind: 'lockout',
        text: `Cuidado: estás dentro del ${margen} del tope de este régimen (${uyu(ceiling)} al año). ${regime.lockout.text} El cerrojo es de ${regime.lockout.years} años, y se dispara aunque te vayas por tu propia voluntad. Si esperás crecer, entrar acá para salir en un año puede costarte más caro que arrancar directamente en el régimen siguiente.`,
        norm: regime.lockout.norm,
        url: regime.lockout.url,
      })
    }

    // UNLIMITED LIABILITY. The norm depends on WHAT THE TAXPAYER IS: a sociedad de hecho's
    // socios answer under Ley 16.060 art. 39 (solidaria, sin beneficio de excusión); a
    // monotributista / unipersonal / IRPF taxpayer is a PERSONA FÍSICA, and art. 39 has
    // nothing to say about them — their exposure is the prenda general del Código Civil
    // art. 2372. Citing art. 39 at a persona física is the wrong norm, confidently.
    if (regime.liability === 'ilimitada') {
      const esSociedad = regime.id === 'sociedad-hecho'
      const l = esSociedad ? L.ley16060_39 : L.codigoCivil2372
      warnings.push({
        kind: 'liability',
        text: esSociedad
          ? 'Respondés con tu patrimonio personal —tu casa, tu auto, tu cuenta— y además en forma SOLIDARIA: un acreedor puede ir por el 100% de la deuda contra el socio que tenga bienes, sin importar el porcentaje que hayan pactado entre ustedes, y sin beneficio de excusión. Si vas a tomar deuda, contratar empleados o firmar contratos con penalidades, mirá la SRL o la SAS.'
          : 'En esta figura respondés con tu patrimonio personal: tu casa, tu auto, tu cuenta. No hay persona jurídica separada — la empresa sos vos. Si vas a tomar deuda, contratar empleados, comprar mercadería a crédito o firmar contratos con penalidades, considerá una SAS, que sí separa tu patrimonio del de la empresa.',
        norm: l.norm,
        url: l.url,
      })
    }

    // THE CHEAPER GREY ZONE. `recommended` is, by construction (rule 3), never `dudoso` — but
    // a `dudoso` regime can still be cheaper, and quietly recommending the dearer-but-certain
    // path without admitting that is a milder version of the exact dishonesty we just fixed.
    // So: every comparable `dudoso` regime cheaper than the recommendation gets named, with
    // how much less it would cost per month and the precise reason (norm + URL) we are
    // declining to recommend it anyway — one warning per `dudoso` reason, never summarised.
    for (const p of priced) {
      if (p.r.status !== 'dudoso' || p.price >= best.price) continue
      const cheaperRegime = byId.get(p.r.regime)
      if (cheaperRegime === undefined) continue
      const cheaperByMonthly = Math.round((best.price - p.price) / 12)
      // MINOR 4 — `p.price < best.price` (checked above) already proved this regime is
      // genuinely, strictly cheaper — but a strictly-smaller ANNUAL gap of under ~6 UYU can
      // still round to $0/month. Saying "te saldría $0 menos por mes" is not a smaller truth
      // than the real number, it is a wrong one: it reads as "there's no saving", when there
      // is one, just not one worth quantifying to the peso. So the PRICE CLAUSE is dropped
      // when it would round to $0 — the WARNING is not: the legal tension is the point, the
      // money is not.
      for (const r of p.r.reasons) {
        if (r.status !== 'dudoso') continue
        warnings.push({
          kind: 'grey-zone',
          text:
            cheaperByMonthly > 0
              ? `${cheaperRegime.name} te saldría ${uyu(cheaperByMonthly)} menos por mes, pero no te lo recomendamos: ${r.text}`
              : `${cheaperRegime.name} te saldría un poco menos, pero no te lo recomendamos: ${r.text}`,
          norm: r.norm,
          url: r.url,
          regime: p.r.regime,
          cheaperByMonthly,
        })
      }
    }
  }

  return { recommended, noRecommendation, ranked: ordered, warnings }
}

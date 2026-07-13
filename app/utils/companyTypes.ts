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
  topeIraePreceptivoUi: fig(
    4_000_000,
    'Tope de IRAE preceptivo / dividendos exentos (UI)',
    DGI_LITERAL_E
  ),
  topeLocalM2: fig(
    15,
    'Superficie máxima del local (monotributo)',
    'https://www.impo.com.uy/bases/decretos/199-2007'
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
  monoAnio1SinFonasa: fig(1071, 'Monotributo año 1 (25%), sin FONASA', BPS_MONO_GRAD),
  monoAnio1FonasaSolo: fig(4761, 'Monotributo año 1 (25%), con FONASA', BPS_MONO_GRAD),
  monoAnio2SinFonasa: fig(1594, 'Monotributo año 2 (50%), sin FONASA', BPS_MONO_GRAD),
  monoAnio2FonasaSolo: fig(5284, 'Monotributo año 2 (50%), con FONASA', BPS_MONO_GRAD),
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
  dto199: { norm: 'Decreto 199/007', url: 'https://www.impo.com.uy/bases/decretos/199-2007' },
  titulo4_66E: {
    norm: 'Título 4 art. 66 lit. E',
    url: 'https://www.impo.com.uy/bases/todgi-2023/4-2024',
  },
  consulta4761: {
    norm: 'Consulta DGI 4761',
    url: 'https://www.impo.com.uy/bases/consultas-tributarias/4761-2008',
  },
  ley16060_223: {
    norm: 'Ley 16.060 art. 223',
    url: 'https://www.impo.com.uy/bases/leyes/16060-1989',
  },
  ley16060_39: {
    norm: 'Ley 16.060 art. 39',
    url: 'https://www.impo.com.uy/bases/leyes/16060-1989',
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
  const solo = !socios

  return REGIMES.map(regime => {
    const reasons: GateReason[] = []
    const out = (text: string, l: { norm: string; url: string }) =>
      reasons.push({ status: 'excluido', text, norm: l.norm, url: l.url })
    const doubt = (text: string, l: { norm: string; url: string }) =>
      reasons.push({ status: 'dudoso', text, norm: l.norm, url: l.url })

    // Unlimited liability kills every simple regime when the visitor needs a shield.
    if (input.needsLimitedLiability && regime.liability === 'ilimitada') {
      out(
        'Necesitás responsabilidad limitada, y en esta figura respondés con tu patrimonio personal.',
        L.ley16060_39
      )
    }

    switch (regime.id) {
      case 'monotributo':
      case 'monotributo-social': {
        if (regime.id === 'monotributo-social' && !input.midesEligible) {
          out(
            'Requiere calificación previa de MIDES: el hogar debe estar bajo la línea de pobreza o en situación de vulnerabilidad.',
            { norm: 'Ley 18.874 art. 2', url: 'https://www.impo.com.uy/bases/leyes/18874-2011' }
          )
        }
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
        if (input.people === 'socios') {
          out(
            'El art. 70 solo habilita la sociedad de hecho monotributista con un máximo de 2 socios sin dependientes, o hasta 3 si son familiares hasta 4° grado de consanguinidad o 2° de afinidad. Esta calculadora no releva esa composición exacta, así que trata cualquier sociedad de socios como fuera del monotributo; si tu caso encaja en la excepción, consultá a un contador.',
            L.ley18083_70
          )
        }
        if (input.clients === 'empresas' || input.clients === 'exterior') {
          out('El monotributista solo puede vender a consumidores finales.', L.ley18083_71)
        }
        const maxEmployees = regime.id === 'monotributo-social' ? 0 : solo ? 1 : 0
        if (input.employees > maxEmployees) {
          out(
            maxEmployees === 0
              ? 'Esta figura no admite ningún dependiente.'
              : 'La unipersonal monotributista admite como máximo 1 dependiente.',
            L.ley18083_70
          )
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
          regime.id === 'monotributo' &&
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
        if (socios) {
          out('Una unipersonal, por definición, tiene un solo titular.', L.ley16060_223)
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
        if (socios) {
          out('Es el régimen de una persona física, no de una sociedad.', L.titulo4_66E)
        }
        if (!anyServicios) {
          out(
            'Aplica a servicios personales fuera de la relación de dependencia, no a la venta de bienes.',
            L.titulo4_66E
          )
        }
        break
      }

      case 'sociedad-hecho': {
        if (!socios) {
          out('Requiere dos o más personas operando juntas.', L.ley16060_223)
        }
        break
      }

      case 'srl': {
        if (!socios) {
          out(
            'La SRL exige un mínimo de 2 socios. Si vas solo, la figura equivalente es la SAS.',
            L.ley16060_223
          )
        }
        break
      }

      case 'sas':
      case 'sa':
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
      url: 'https://www.impo.com.uy/bases/leyes/18874-2011',
    },
    sources: [{ label: 'BPS — Monotributo social', url: BPS_MONO_SOCIAL }],
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

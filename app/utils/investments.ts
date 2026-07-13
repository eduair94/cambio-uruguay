// app/utils/investments.ts
// Catalogue of places/instruments a person in Uruguay can use to invest money (bank brokers,
// fintech, international brokers, local fixed-income, funds, crypto). PURE data + helpers (no
// Vue/Nuxt) so the page and tests share one source of truth. Every fact is sourced from
// docs/research/2026-07-09-inversiones-uruguay-research.md (Task 1); facts that research could
// not verify are recorded as `null` (numbers) or an honest "No publicado"/"No verificado" string
// (text fields) rather than guessed. Two editorial-only categories from the research — `afap` and
// `inmobiliario` — intentionally have NO rows here; the page covers them as static prose only.
//
// EXCEPTION: every `taxNote` comes from docs/superpowers/specs/2026-07-12-impuestos-inversiones-design.md
// (verified 2026-07-12), NOT from the investments research, and must stay consistent with the legal
// rates in `utils/capitalTax.ts` and the guide at /impuestos-inversiones-uruguay. Two rules these
// notes previously broke: the 8% on foreign income is a WITHHOLDING (only a Uruguayan broker that
// also holds custody may apply it, and only definitively if the taxpayer opts for it) — the rate is
// 12%; and crypto carries NO percentage, because no tax norm settles it.
// Not affiliated; informational, not investment advice.
import type { ReviewSource } from './reviews'

export type InvestmentCategory =
  | 'banco_broker'
  | 'fintech'
  | 'broker_internacional'
  | 'renta_fija_local'
  | 'fondo_inversion'
  | 'cripto'

export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'variable'

export type RegulationStatus = 'bcu' | 'exterior_regulado' | 'no_regulado'

export interface InvestmentOption {
  id: string
  name: string
  category: InvestmentCategory
  riskLevel: RiskLevel
  /** Minimum entry ticket, or null when no published minimum / quote-only. */
  minInvestment: { amount: number; currency: 'UYU' | 'USD' | 'UI' } | null
  feesNote: string
  regulation: RegulationStatus
  regulationNote: string
  taxNote: string
  online: boolean
  website: string
  /** URL backing the facts on this row. */
  source: string
  note?: string
  /** Aggregated reputation 0–5 from reviews, or null when no rating data was found. */
  rating: number | null
  reviewsNote?: string
  reviewSources: ReviewSource[]
}

export const INVESTMENT_CATEGORIES: Readonly<Record<InvestmentCategory, string>> = Object.freeze({
  banco_broker: 'Bancos / brokers bancarios',
  fintech: 'Fintech',
  broker_internacional: 'Brokers internacionales',
  renta_fija_local: 'Renta fija local',
  fondo_inversion: 'Fondos de inversión (FCI)',
  cripto: 'Criptomonedas',
})

export const INVESTMENTS: InvestmentOption[] = [
  // ── Bancos / brokers bancarios ──────────────────────────────────────────────
  {
    id: 'itau-inversiones',
    name: 'Itaú Uruguay (Itaú Asset Management / Banca Personal)',
    category: 'banco_broker',
    riskLevel: 'variable',
    minInvestment: { amount: 1000, currency: 'USD' },
    feesNote:
      'Fondos: 1% + IVA de entrada, sin salida ni custodia. Bonos/acciones extranjeros en custodia: 2,75% + IVA sobre cupones/dividendos. Comisión por operación: no publicado',
    regulation: 'bcu',
    regulationNote:
      'Supervisado por el BCU como banco (intermediación financiera); NO figura en el registro de Corredores de Bolsa/Agentes de Valores del BCU',
    taxNote:
      'Intereses y dividendos: IRPF 12% (dividendos de fuente uruguaya, 7%). Desde 2026 (Ley 20.446) las ganancias de capital del exterior también pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar la entidad uruguaya que intermedia y además ejerce la custodia de esos activos, y es definitiva solo si optás por ella. Para activos cotizados comprados antes del 31/12/2025 el costo fiscal es su cotización a esa fecha',
    online: true,
    website: 'https://www.itau.com.uy',
    source: 'https://www.itau.com.uy/inst/paratiInversiones.html',
    note: 'Sin marca de "brokerage" propia; ofrece fondos de inversión propios y compra/custodia directa de bonos y acciones extranjeros y LRM para clientes de Banca Personal. Tarifario: https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'santander-inversiones',
    name: 'Santander Uruguay (Arquitectura Abierta — Select / Private Banking)',
    category: 'banco_broker',
    riskLevel: 'variable',
    minInvestment: { amount: 100000, currency: 'USD' },
    feesNote:
      'No publicado (no se encontró tarifario público con comisiones por operación/custodia)',
    regulation: 'bcu',
    regulationNote:
      'Supervisado por el Banco Central del Uruguay como banco; NO figura en el registro de Corredores de Bolsa/Agentes de Valores del BCU',
    taxNote:
      'Intereses y dividendos: IRPF 12% (dividendos de fuente uruguaya, 7%). Desde 2026 (Ley 20.446) las ganancias de capital del exterior también pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar la entidad uruguaya que intermedia y además ejerce la custodia de esos activos, y es definitiva solo si optás por ella. Para activos cotizados comprados antes del 31/12/2025 el costo fiscal es su cotización a esa fecha',
    online: false,
    website: 'https://www.santander.com.uy',
    source: 'https://www.santander.com.uy/productos-servicios/inversiones',
    note: 'Producto de fondos/bonos/acciones/ETFs reservado a segmentos Select (USD 100.000) y Private Banking (USD 500.000); USD 150.000 para no residentes. Sin producto de brokerage minorista de acceso general',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'brou-instrumentos-financieros',
    name: 'BROU — Instrumentos Financieros (Inversiones BROU)',
    category: 'banco_broker',
    riskLevel: 'variable',
    minInvestment: null,
    feesNote:
      'Tarifario menciona comisiones de compra/venta/custodia/administración pero los porcentajes exactos no fueron extraíbles del PDF (no verificado)',
    regulation: 'bcu',
    regulationNote:
      'Supervisado por el BCU como banco; NO figura en el registro de Corredores de Bolsa/Agentes de Valores del BCU',
    taxNote:
      'Los títulos comprados "NO constituyen un depósito en el banco" (sin cobertura del seguro de depósitos). Intereses y dividendos: IRPF 12% (dividendos de fuente uruguaya, 7%); la deuda pública uruguaya está exenta (T7 art. 38 lit. A). Desde 2026 las ganancias de capital del exterior pagan IRPF al 12%; el 8% no es una tasa sino una retención reducida que solo puede aplicar la entidad uruguaya que también ejerce la custodia de esos activos, y solo es definitiva si optás por ella',
    online: true,
    website: 'https://www.brou.com.uy',
    source: 'https://www.brou.com.uy/personas/inversiones/instrumentos-financieros',
    note: 'Obligaciones Negociables, Letras y otros títulos vía Cuenta Cliente / e-BROU. Sin mínimo publicado para bonos/acciones individuales; el fondo "República Renta Pesos" sí publica un mínimo de $5.000 UYU',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'scotiabank-inversiones',
    name: 'Scotiabank Uruguay (Inversiones — Banca Premium)',
    category: 'banco_broker',
    riskLevel: 'variable',
    minInvestment: null,
    feesNote: 'No publicado',
    regulation: 'bcu',
    regulationNote:
      'Supervisado por el BCU como banco; NO figura en el registro de Corredores de Bolsa/Agentes de Valores del BCU',
    taxNote:
      'Intereses y dividendos: IRPF 12% (dividendos de fuente uruguaya, 7%). Desde 2026 (Ley 20.446) las ganancias de capital del exterior también pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar la entidad uruguaya que intermedia y además ejerce la custodia de esos activos, y es definitiva solo si optás por ella. Para activos cotizados comprados antes del 31/12/2025 el costo fiscal es su cotización a esa fecha',
    online: false,
    website: 'https://www.scotiabank.com.uy',
    source: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/int_Valores.aspx',
    note: 'Ofrece fondos + plazo fijo dentro de Banca Premium; para bonos/LRM/letras de tesorería remite explícitamente a un corredor de bolsa autorizado externo (listado en bvm.com.uy) — no ofrece canal de compra directa propio',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'bbva-inversiones',
    name: 'BBVA Uruguay (Cartilla Contractual — Instrumentos Financieros)',
    category: 'banco_broker',
    riskLevel: 'variable',
    minInvestment: null,
    feesNote: 'No verificado',
    regulation: 'bcu',
    regulationNote:
      'Supervisado por el BCU como banco (BIC BBVAUYMM); NO figura en el registro de Corredores de Bolsa/Agentes de Valores del BCU',
    taxNote:
      'Intereses y dividendos: IRPF 12% (dividendos de fuente uruguaya, 7%). Desde 2026 (Ley 20.446) las ganancias de capital del exterior también pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar la entidad uruguaya que intermedia y además ejerce la custodia de esos activos, y es definitiva solo si optás por ella. Para activos cotizados comprados antes del 31/12/2025 el costo fiscal es su cotización a esa fecha',
    online: false,
    website: 'https://www.bbva.com.uy',
    source: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/int_Valores.aspx',
    note: 'Publica una "Cartilla Contractual — Instrumentos Financieros" pero el contenido detallado (marca de un eventual servicio de brokerage) no pudo verificarse (PDF devolvió 403)',
    rating: null,
    reviewSources: [],
  },
  // ── Fintech ──────────────────────────────────────────────────────────────────
  {
    id: 'prex-inversion-violeta',
    name: 'Prex — Inversión Violeta',
    category: 'fintech',
    riskLevel: 'bajo',
    minInvestment: { amount: 4000, currency: 'UYU' },
    feesNote: 'Gratis: sin costo de apertura, suscripción, mantenimiento ni rescate',
    regulation: 'bcu',
    regulationNote:
      'El Fondo de Liquidez Inmediata (FLI) que recibe los fondos está supervisado directamente por el BCU (sólo invierte en depósitos BCU, LRM y papeles soberanos uruguayos); cuenta de inversión abierta a nombre del cliente en Gletir (corredor de bolsa local), FLI administrado por VALO como fiduciario, activos custodiados en el Banco Central',
    taxNote:
      'Los rendimientos de un fondo de inversión están exentos de IRPF solo si el fondo invierte en valores públicos o en valores privados con oferta pública (Título 7, art. 38 lit. P); el FLI declara invertir únicamente en depósitos del BCU, LRM y títulos soberanos uruguayos. Fuera de ese supuesto, IRPF 12%',
    online: true,
    website: 'https://www.prexcard.com/uy',
    source:
      'https://www.forbesuruguay.com/money/prex-lanza-inversion-violeta-herramienta-permite-invertir-dinero-cuenta-tenerlo-disponible-vez-n88459',
    note: 'Producto de liquidez/ahorro en pesos lanzado marzo 2026; mínimo de $4.000 sólo en la primera suscripción, sin mínimo luego. Detalle del vehículo: https://valo.uy/noticias/juno-a-prex-lanzamos-una-solucion-de-inversion-en-pesos-con-liquidez-inmediata/',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'prex-us-stocks-etfs',
    name: 'Prex — US Stocks & ETFs (módulo "Inversiones")',
    category: 'fintech',
    riskLevel: 'alto',
    minInvestment: { amount: 10, currency: 'USD' },
    feesNote:
      'Compra: USD 0,99 + 2% (IVA incl.); venta: 1% (IVA incl.) + ~USD 0,20 de cargo cambiario; venta mínima USD 2; tope diario USD 1.000, tope mensual USD 3.000',
    regulation: 'exterior_regulado',
    regulationNote:
      'Órdenes ruteadas por BECA Advisors (asesor de inversión registrado ante el BCU, nroinst=7155) hacia DriveWealth, LLC (broker-dealer regulado por FINRA/SIPC en EE.UU.); las acciones quedan custodiadas en DriveWealth, no en Prex. La capa de asesoría (BECA) es regulada por el BCU; la capa de brokerage/custodia (DriveWealth) es regulada en EE.UU., no por el BCU',
    taxNote:
      'Desde 2026 (Ley 20.446) las rentas y ganancias de capital del exterior pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar un bróker uruguayo que además ejerza la custodia de los activos, y acá la custodia está en DriveWealth (EE.UU.). Si ningún agente uruguayo te retiene, corresponden anticipos semestrales al 12% o declaración jurada (F. 1101). Para activos cotizados comprados antes del 31/12/2025, el costo fiscal es su cotización a esa fecha',
    online: true,
    website: 'https://www.prexcard.com/uy',
    source: 'https://www.prexcard.com/ayuda/11',
    note: 'Mínimo USD 10 para comprar / USD 2 para vender',
    rating: null,
    reviewSources: [],
  },
  // ── Brokers internacionales ─────────────────────────────────────────────────
  {
    id: 'balanz',
    name: 'Balanz Uruguay Corredor de Bolsa S.A.',
    category: 'broker_internacional',
    riskLevel: 'variable',
    minInvestment: null,
    feesNote:
      'Sin mínimo para abrir cuenta; comisión de ~0,5% sobre operaciones citada por fuentes secundarias, pero no confirmada en un tarifario oficial de Balanz Uruguay (no verificado)',
    regulation: 'bcu',
    regulationNote:
      'Figura en el listado oficial de corredores de bolsa de la BVM y está "regulado y supervisado por la Superintendencia de Servicios Financieros del Banco Central del Uruguay", operando a través de BEVSA. También ofrece acceso al mercado de EE.UU. vía StoneX/Pershing — esa capa NO está regulada por el BCU',
    taxNote:
      'Deuda pública uruguaya: exenta de IRPF, y no solo el interés (Título 7, art. 38 lit. A). Resto de las rentas de capital: 12% (dividendos de fuente uruguaya, 7%). Desde 2026 las ganancias de capital del exterior pagan IRPF al 12%; el 8% es una retención reducida que solo puede aplicar el bróker uruguayo que además ejerce la custodia de esos activos — Balanz rutea el acceso a EE.UU. vía StoneX/Pershing y no verificamos si actúa como custodio ni como agente de retención. Sin retención, corresponden anticipos semestrales o declaración jurada',
    online: true,
    website: 'https://balanz.com.uy',
    source: 'https://www.bvm.com.uy/operadores/corredores-de-bolsa',
    note: 'Único corredor confirmado como entidad local regulada por BCU/BEVSA entre las opciones de acceso internacional. Fuente adicional: https://www.fundssociety.com/es/noticias/negocio/balanz-expande-sus-capacidades-en-el-mercado-bursatil-uruguayo/',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'etoro',
    name: 'eToro',
    category: 'broker_internacional',
    riskLevel: 'alto',
    minInvestment: null,
    feesNote:
      'USD 5 de comisión de retiro (mínimo de retiro USD 30); USD 10/mes de inactividad tras 12 meses sin uso. Depósito mínimo: no verificado (algunas fuentes secundarias citan USD 50, sin confirmar en la página oficial de comisiones)',
    regulation: 'exterior_regulado',
    regulationNote:
      'Uruguay es país soportado, sin restricción específica encontrada, pero eToro no es una entidad uruguaya ni está regulada por el BCU; según la entidad legal que finalmente da de alta al usuario uruguayo puede estar regulada por CySEC (Chipre), FCA (Reino Unido), ASIC (Australia) o FSAS (Seychelles) — entidad exacta para usuarios de Uruguay no confirmada. No aplica protección de inversores del BCU',
    taxNote:
      'Desde 2026 (Ley 20.446) las rentas y ganancias de capital del exterior pagan IRPF al 12%. Operando directo con un bróker del exterior NO hay retención uruguaya: te corresponden anticipos semestrales o declaración jurada (F. 1101). El 8% es una retención reducida y solo la puede aplicar un bróker/custodio uruguayo. Para activos cotizados comprados antes del 31/12/2025, el costo fiscal es su cotización a esa fecha',
    online: true,
    website: 'https://www.etoro.com',
    source:
      'https://help.etoro.com/s/article/which-fees-and-commissions-does-etoro-have?language=en_GB',
    note: 'KYC estándar; sin restricción específica para residentes de Uruguay encontrada en esta investigación',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'xtb',
    name: 'XTB',
    category: 'broker_internacional',
    riskLevel: 'alto',
    minInvestment: null,
    feesNote:
      'Acciones/ETFs sin comisión hasta EUR 100.000/mes de volumen, luego 0,2% (mín. EUR 10); conversión de moneda 0,5%; inactividad EUR 10/mes tras 12 meses sin actividad y 90 días sin depósito; retiros gratuitos',
    regulation: 'exterior_regulado',
    regulationNote:
      'Uruguay figura como país donde XTB permite apertura de cuenta 100% online; la entidad del grupo XTB que efectivamente atiende a clientes uruguayos no está confirmada (varía) — NO está regulado por el BCU, sin protección del BCU',
    taxNote:
      'Desde 2026 (Ley 20.446) las rentas y ganancias de capital del exterior pagan IRPF al 12%. Operando directo con un bróker del exterior NO hay retención uruguaya: te corresponden anticipos semestrales o declaración jurada (F. 1101). El 8% es una retención reducida y solo la puede aplicar un bróker/custodio uruguayo. Para activos cotizados comprados antes del 31/12/2025, el costo fiscal es su cotización a esa fecha',
    online: true,
    website: 'https://www.xtb.com',
    source:
      'https://www.xtb.com/int/help-center/fees-and-payments-3-4/fees-and-commissions-at-xtb-3',
    note: 'Sin depósito mínimo obligatorio; algunas fuentes secundarias sugieren ~USD 200 como recomendación práctica, no como requisito',
    rating: null,
    reviewSources: [],
  },
  // ── Renta fija local ─────────────────────────────────────────────────────────
  {
    id: 'plazo-fijo-bancario',
    name: 'Plazo fijo bancario (UYU/USD/UI/EUR)',
    category: 'renta_fija_local',
    riskLevel: 'bajo',
    minInvestment: null,
    feesNote:
      'Sin comisión de entrada/salida típica; minimos varían por banco y NO son fijados por el BCU (indicativo: Itaú sugiere ~$5.000 en pesos / ~USD 500 en dólares en su tarifario)',
    regulation: 'bcu',
    regulationNote:
      'Depósito bancario supervisado por el BCU; los bancos deben divulgar la TEA y cualquier mínimo de depósito',
    taxNote:
      'IRPF por rentas de capital mobiliario con tasas reducidas específicas: depósitos en pesos no indexados 5,5% (≤1 año) / 2,5% (1–3 años) / 0,5% (>3 años); en UI 10%/7%/5%; en moneda extranjera 12% (≤3 años) / 7% (>3 años)',
    online: true,
    website: 'https://usuariofinanciero.bcu.gub.uy/depositos/',
    source: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Tasas-Medias.aspx',
    note: 'La tasa es variable; el BCU publica "Tasas Medias de Interés" mensuales por moneda/plazo. Serie: https://www.bcu.gub.uy/Servicios-Financieros-SSF/Series%20IF/tasas.xls. Ejemplo de mínimo por banco: BROU ofrece plazo fijo en UYU/UI/USD/EUR (https://www.brou.com.uy/personas/inversiones/plazo-fijo)',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'letras-regulacion-monetaria',
    name: 'Letras de Regulación Monetaria (LRM), BCU',
    category: 'renta_fija_local',
    riskLevel: 'bajo',
    minInvestment: { amount: 100000, currency: 'UYU' },
    feesNote:
      'Comisión del intermediario (banco o corredor de bolsa) por operar; no hay tarifa fija publicada por el BCU',
    regulation: 'bcu',
    regulationNote:
      'Instrumento emitido y regulado por el BCU; los inversores minoristas no pueden comprar directamente al BCU, sólo a través de intermediarios regulados (bancos, corredores de bolsa u otros agentes autorizados por el BCU)',
    taxNote:
      'Exentas de IRPF, y no solo el interés: el Título 7, art. 38 lit. A exonera cualquier rendimiento de capital o incremento patrimonial derivado de la tenencia o transferencia de deuda pública uruguaya (también la ganancia al venderlas antes del vencimiento). No computan para el Impuesto al Patrimonio (Título 14, art. 23). Igual tratamiento para no residentes (IRNR, Título 8, art. 19 lit. A)',
    online: false,
    website: 'https://www.bvm.com.uy',
    source: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=309',
    note: 'Cotiza en la BVM con cantidad negociable mínima de 100 (https://www.bvm.com.uy/operativa/instrumento/id/LRM$). El mínimo de ~UYU 100.000 es citado por fuentes de educación financiera, no un mínimo fijo publicado por el BCU; el rendimiento se fija en cada licitación (variable)',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'bonos-notas-tesoro',
    name: 'Bonos / Notas del Tesoro (pesos, UI, USD)',
    category: 'renta_fija_local',
    riskLevel: 'bajo',
    minInvestment: { amount: 100000, currency: 'UYU' },
    feesNote:
      'Se accede vía un banco o corredor de bolsa con acceso a BEVSA/BVM, no directamente con el MEF; comisión del intermediario, no publicada de forma uniforme',
    regulation: 'bcu',
    regulationNote:
      'Emisión gestionada por el MEF (Unidad de Gestión de Deuda); operativa a través de intermediarios regulados por el BCU',
    taxNote:
      'La deuda pública uruguaya (Bonos del Tesoro, Letras de Tesorería, LRM, Bonos Globales en UI) está exenta de IRPF, y no solo su interés: el Título 7, art. 38 lit. A exonera cualquier rendimiento de capital o incremento patrimonial derivado de su tenencia o transferencia, así que la ganancia por venderla antes del vencimiento tampoco tributa. No computa para el Impuesto al Patrimonio (Título 14, art. 23). Igual para no residentes (IRNR, Título 8, art. 19 lit. A)',
    online: false,
    website: 'https://deuda.mef.gub.uy',
    source: 'https://deuda.mef.gub.uy/29186/14/areas/notas-del-tesoro.html',
    note: 'Los avisos de licitación fijan una oferta mínima de UYU 100.000 (o su equivalente en UI/UP), en múltiplos de UYU 10.000. Rendimiento fijado en cada licitación (variable) — ver resultados en https://deuda.mef.gub.uy',
    rating: null,
    reviewSources: [],
  },
  // ── Fondos de inversión (FCI) ────────────────────────────────────────────────
  {
    id: 'republica-afisa',
    name: 'República AFISA',
    category: 'fondo_inversion',
    riskLevel: 'variable',
    minInvestment: null,
    feesNote:
      'No publicado en el sitio oficial actual; un blog de terceros cita un fondo "República Renta Pesos" con mínimo de $5.000 UYU, pero no verificado contra la fuente primaria',
    regulation: 'bcu',
    regulationNote:
      'Administradora de fondos registrada ante el BCU e inscripta en el Registro de Mercado de Valores',
    taxNote:
      'Los rendimientos de un FCI están exentos de IRPF solo si el fondo invierte en valores públicos o en valores privados con oferta pública (Título 7, art. 38 lit. P). Fuera de ese supuesto, IRPF 12%: revisá en qué invierte el fondo concreto antes de asumir la exención',
    online: false,
    website: 'https://republicafisa.com.uy',
    source: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/admin_Fondos_Inv.aspx',
    note: 'El sitio oficial (republicafisa.com.uy) publica sólo su línea de fideicomisos financieros (SUCIVE, IAMC, infraestructura, agro); no publica en vivo una lista de fondos de inversión minoristas con mínimos/comisiones',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'delta-asset-management',
    name: 'Delta Asset Management AFISA (ex-SURA Uruguay)',
    category: 'fondo_inversion',
    riskLevel: 'variable',
    minInvestment: null,
    feesNote:
      'La página actual no publica mínimos ni comisiones por fondo. Documentos históricos pre-rebranding (dominio ahorro.sura.com.uy, ya inactivo) mencionaban Fondo Ahorro Dólar 0,5%/año sin comisión de rescate, Fondo Ahorro Básico ~2%/año, y Fondo Oportunidades Globales con mínimo USD 5.000 — cifras no re-verificables en vivo, tratar como históricas/posiblemente desactualizadas',
    regulation: 'bcu',
    regulationNote:
      'Autorización activa del BCU confirmada desde el 27/12/2012 (hecho relevante BCU, renombre 2026-04-10)',
    taxNote:
      'Los rendimientos de un FCI están exentos de IRPF solo si el fondo invierte en valores públicos o en valores privados con oferta pública (Título 7, art. 38 lit. P). Fuera de ese supuesto, IRPF 12%: los fondos de renta fija internacional o de acciones globales no encuadran automáticamente en la exención',
    online: false,
    website: 'https://deltaam.com.uy',
    source:
      'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2435',
    note: 'Fondos actuales listados en https://deltaam.com.uy/fondos_de_inversion/: Fondo Protección, Fondo Ahorro Básico, Fondo Futuro (pesos) y Fondo Renta Fija Internacional, Fondo Ahorro Dólar, Fondo Oportunidades Globales (dólares) — la página en vivo sólo muestra los nombres de los fondos, sin mínimos ni comisiones',
    rating: null,
    reviewSources: [],
  },
  // ── Criptomonedas ────────────────────────────────────────────────────────────
  {
    id: 'binance',
    name: 'Binance (vía Binance P2P)',
    category: 'cripto',
    riskLevel: 'alto',
    minInvestment: null,
    feesNote:
      'Trading spot desde 0,1% (25% de descuento pagando con BNB); comisiones de retiro cripto según red (~USD 1 para USDT-TRC20)',
    regulation: 'no_regulado',
    regulationNote:
      'Sin retiro directo a UYU en cuentas bancarias uruguayas; el acceso a UYU es únicamente vía Binance P2P (Binance actúa como escrow/árbitro, no como contraparte fiat). Legal para residentes uruguayos abrir cuenta; bajo la nueva Ley 20.345 los proveedores de servicios de activos virtuales pasan a requerir registro/autorización del BCU (plazo de adaptación vencido el 2026-06-30; estado post-plazo no verificado)',
    taxNote:
      'Zona gris: no hay norma tributaria específica. La Ley 20.345 regula a los proveedores, no la tributación, y ni el Decreto 95/026 ni la Resolución DGI 1517/2026 mencionan la cripto (ni siquiera está definido si la renta es de fuente uruguaya o extranjera). Las obligaciones AML/PLD alcanzan a los proveedores, no a los tenedores. Consultá un contador',
    online: true,
    website: 'https://www.binance.com',
    source: 'https://p2p.binance.com/es/trade/BankRepublicUruguay/USDT?fiat=UYU',
    note: 'KYC obligatorio para operaciones P2P/fiat y retiros significativos',
    rating: null,
    reviewSources: [],
  },
  {
    id: 'lemon-cash',
    name: 'Lemon Cash',
    category: 'cripto',
    riskLevel: 'alto',
    minInvestment: null,
    feesNote:
      'No verificado para Uruguay específicamente: la información de comisiones/depósito documentada es de Argentina/Perú/Colombia (1% compra / 0,5% venta), no confirmada igual para Uruguay',
    regulation: 'no_regulado',
    regulationNote:
      'Expansión a Uruguay confirmada (app disponible en App Store/Play Store de Uruguay); bajo la Ley 20.345 los proveedores de servicios de activos virtuales pasan a requerir registro/autorización del BCU',
    taxNote:
      'Zona gris: no hay norma tributaria específica. La Ley 20.345 regula a los proveedores, no la tributación, y ni el Decreto 95/026 ni la Resolución DGI 1517/2026 mencionan la cripto. Consultá un contador',
    online: true,
    website: 'https://www.lemon.me',
    source: 'https://www.criptonoticias.com/finanzas/lemon-expande-5-paises-latinoamerica/',
    note: 'No se pudo verificar el on/off-ramp específico a UYU (transferencia bancaria local / RedPagos / Abitab); tratar como posiblemente sólo billetera cripto/USD para Uruguay hasta confirmar lo contrario',
    rating: null,
    reviewSources: [],
  },
]

export function riskLabel(risk: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    bajo: 'Bajo',
    medio: 'Medio',
    alto: 'Alto',
    variable: 'Variable',
  }
  return labels[risk]
}

/** A minimum-investment cell: `US$ 1.000`, `$ 5.000`, `UI 10.000`, or `Sin mínimo` when null. */
export function minInvestmentLabel(opt: InvestmentOption): string {
  if (opt.minInvestment == null) return 'Sin mínimo'
  const { amount, currency } = opt.minInvestment
  const prefix = currency === 'USD' ? 'US$ ' : currency === 'UI' ? 'UI ' : '$ '
  return `${prefix}${amount.toLocaleString('es-UY', { maximumFractionDigits: 0 })}`
}

/** Investments grouped by category in {@link INVESTMENT_CATEGORIES} order. */
export function investmentsByCategory(): Array<{
  category: InvestmentCategory
  label: string
  items: InvestmentOption[]
}> {
  return (Object.keys(INVESTMENT_CATEGORIES) as InvestmentCategory[]).map(category => ({
    category,
    label: INVESTMENT_CATEGORIES[category],
    items: INVESTMENTS.filter(i => i.category === category),
  }))
}

export function getInvestment(id: string): InvestmentOption | undefined {
  return INVESTMENTS.find(i => i.id === id)
}

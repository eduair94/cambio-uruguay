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

export interface InvestmentSafetyDimension {
  label: string
  assessment: string
  color: 'success' | 'warning' | 'error' | 'info'
  detail: string
}

export interface InvestmentCostExample {
  orderAmount: number
  commission: number
  effectiveRate: string
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
      'Intereses de depósitos, ONs y otros títulos con oferta pública: la tasa NO es un 12% plano — sale de la matriz por moneda y plazo del Título 7, art. 37 lit. A (va de 0,5% a 12%: un depósito en pesos a más de 3 años paga 0,5%, uno en dólares al mismo plazo 7%). La matriz completa está en la guía de impuestos sobre inversiones. Dividendos de contribuyentes de IRAE: 7%. Restantes rentas de capital: 12%. Desde 2026 (Ley 20.446) las ganancias de capital del exterior también pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar la entidad uruguaya que intermedia y además ejerce la custodia de esos activos, y es definitiva solo si optás por ella. Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
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
      'Intereses de depósitos, ONs y otros títulos con oferta pública: la tasa NO es un 12% plano — sale de la matriz por moneda y plazo del Título 7, art. 37 lit. A (va de 0,5% a 12%: un depósito en pesos a más de 3 años paga 0,5%, uno en dólares al mismo plazo 7%). La matriz completa está en la guía de impuestos sobre inversiones. Dividendos de contribuyentes de IRAE: 7%. Restantes rentas de capital: 12%. Desde 2026 (Ley 20.446) las ganancias de capital del exterior también pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar la entidad uruguaya que intermedia y además ejerce la custodia de esos activos, y es definitiva solo si optás por ella. Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
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
      'Los títulos comprados "NO constituyen un depósito en el banco" (sin cobertura del seguro de depósitos). Intereses de depósitos, ONs y otros títulos con oferta pública: la tasa NO es un 12% plano — sale de la matriz por moneda y plazo del Título 7, art. 37 lit. A (va de 0,5% a 12%: un depósito en pesos a más de 3 años paga 0,5%, uno en dólares al mismo plazo 7%). La matriz completa está en la guía de impuestos sobre inversiones. Dividendos de contribuyentes de IRAE: 7%. Restantes rentas de capital: 12%; la deuda pública uruguaya está exenta (T7 art. 38 lit. A). Desde 2026 las ganancias de capital del exterior pagan IRPF al 12%; el 8% no es una tasa sino una retención reducida que solo puede aplicar la entidad uruguaya que también ejerce la custodia de esos activos, y solo es definitiva si optás por ella. Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
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
      'Intereses de depósitos, ONs y otros títulos con oferta pública: la tasa NO es un 12% plano — sale de la matriz por moneda y plazo del Título 7, art. 37 lit. A (va de 0,5% a 12%: un depósito en pesos a más de 3 años paga 0,5%, uno en dólares al mismo plazo 7%). La matriz completa está en la guía de impuestos sobre inversiones. Dividendos de contribuyentes de IRAE: 7%. Restantes rentas de capital: 12%. Desde 2026 (Ley 20.446) las ganancias de capital del exterior también pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar la entidad uruguaya que intermedia y además ejerce la custodia de esos activos, y es definitiva solo si optás por ella. Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
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
      'Intereses de depósitos, ONs y otros títulos con oferta pública: la tasa NO es un 12% plano — sale de la matriz por moneda y plazo del Título 7, art. 37 lit. A (va de 0,5% a 12%: un depósito en pesos a más de 3 años paga 0,5%, uno en dólares al mismo plazo 7%). La matriz completa está en la guía de impuestos sobre inversiones. Dividendos de contribuyentes de IRAE: 7%. Restantes rentas de capital: 12%. Desde 2026 (Ley 20.446) las ganancias de capital del exterior también pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar la entidad uruguaya que intermedia y además ejerce la custodia de esos activos, y es definitiva solo si optás por ella. Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
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
      'Los rendimientos de un fondo de inversión están exentos de IRPF solo si el fondo invierte en valores públicos o en valores privados con oferta pública (Título 7, art. 38 lit. P). No verificamos si este vehículo encuadra en ese supuesto, así que no asumas que está exento. Fuera de ese supuesto, IRPF 12%',
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
      'Desde 2026 (Ley 20.446) las rentas y ganancias de capital del exterior pagan IRPF al 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar un bróker uruguayo que además ejerza la custodia de los activos, y acá la custodia está en DriveWealth (EE.UU.). Si ningún agente uruguayo te retiene, corresponden anticipos semestrales al 12% o declaración jurada (F. 1101). Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
    online: true,
    website: 'https://www.prexcard.com/uy',
    source: 'https://www.prexcard.com/ayuda/11',
    note: 'Mínimo USD 10 para comprar / USD 2 para vender',
    rating: null,
    reviewSources: [],
  },
  // ── Brokers internacionales ─────────────────────────────────────────────────
  {
    id: 'gletir-global',
    name: 'Gletir Global — Gletir Corredor de Bolsa S.A.',
    category: 'broker_internacional',
    riskLevel: 'variable',
    minInvestment: null,
    feesNote:
      'Acciones/ETFs de EE.UU. a precio > USD 5: 0,75% por operación (mín. USD 10); a precio < USD 5: USD 0,05 por acción (mín. USD 10). Europa: mínimo USD 12. Sin apertura ni mantenimiento. Pueden sumarse cambio de moneda, mercado y custodio',
    regulation: 'bcu',
    regulationNote:
      'Corredor activo en el registro del BCU (cód. 2317) y miembro de la BVM. Gletir Global opera mediante GTN y cuentas ómnibus; el custodio extranjero depende del activo y mercado. La supervisión local no garantiza el capital ni el rendimiento',
    taxNote:
      'Gletir informa que GTN retiene el impuesto extranjero al acreditar dividendos o intereses y que, para residentes uruguayos, Gletir complementa la retención hasta el 12% cuando la aplicada por GTN es menor. Desde 2026 las ganancias de capital del exterior también tributan IRPF al 12%, pero la FAQ pública no aclara si Gletir retiene sobre ventas: confirmalo con el corredor y un contador. Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
    online: true,
    website: 'https://www.gletir.com/GletirGlobal',
    source:
      'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2317',
    note: 'La cuenta no tiene costo de apertura ni mantenimiento. La cartilla vigente desde el 22/01/2026 está en https://api.gletir.com/Content/Attach/3590.pdf. El BCU sancionó a la entidad en junio de 2025 por incumplimientos materiales detectados en una actuación de 2024: https://www.bcu.gub.uy/Servicios-Financieros-SSF/Resoluciones_SSF/RR-SSF-2025-303.pdf',
    rating: null,
    reviewSources: [],
  },
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
      'Deuda pública uruguaya: exenta de IRPF, y no solo el interés (Título 7, art. 38 lit. A). Intereses de ONs y otros títulos con oferta pública: la tasa NO es un 12% plano — sale de la matriz por moneda y plazo del Título 7, art. 37 lit. A (va de 0,5% a 12%: una ON en pesos a más de 3 años paga 0,5%, una en dólares al mismo plazo 7%; la matriz completa está en la guía de impuestos sobre inversiones). Dividendos de fuente uruguaya: 7%. Resto de las rentas de capital: 12%. Desde 2026 las ganancias de capital del exterior pagan IRPF al 12%; el 8% es una retención reducida que solo puede aplicar el bróker uruguayo que además ejerce la custodia de esos activos — Balanz rutea el acceso a EE.UU. vía StoneX/Pershing y no verificamos si actúa como custodio ni como agente de retención. Sin retención, corresponden anticipos semestrales o declaración jurada. Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
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
      'Desde 2026 (Ley 20.446) las rentas y ganancias de capital del exterior pagan IRPF al 12%. Operando directo con un bróker del exterior NO hay retención uruguaya: te corresponden anticipos semestrales o declaración jurada (F. 1101). El 8% es una retención reducida y solo la puede aplicar un bróker/custodio uruguayo. Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
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
      'Desde 2026 (Ley 20.446) las rentas y ganancias de capital del exterior pagan IRPF al 12%. Operando directo con un bróker del exterior NO hay retención uruguaya: te corresponden anticipos semestrales o declaración jurada (F. 1101). El 8% es una retención reducida y solo la puede aplicar un bróker/custodio uruguayo. Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025',
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

export const GLETIR_SAFETY_ANALYSIS: Readonly<{
  updatedAt: string
  verdict: string
  summary: string
  dimensions: readonly InvestmentSafetyDimension[]
  positives: readonly string[]
  cautions: readonly string[]
  costExamples: readonly InvestmentCostExample[]
  checklist: readonly string[]
  sources: readonly { label: string; url: string }[]
}> = Object.freeze({
  updatedAt: '28 de julio de 2026',
  verdict: 'Seguridad del intermediario: media',
  summary:
    'Gletir es una entidad real, activa y supervisada en Uruguay; eso reduce el riesgo jurídico y de contraparte frente a una plataforma no habilitada. No alcanza, sin embargo, para calificarla como “sin riesgo”: usa una cadena de plataforma y custodios extranjeros, opera cuentas ómnibus y registra observaciones regulatorias materiales. El activo que compres puede ser mucho más riesgoso que el corredor.',
  dimensions: [
    {
      label: 'Regulación local',
      assessment: 'A favor',
      color: 'success',
      detail:
        'Figura activa en el BCU con código 2317 y como corredor miembro de la Bolsa de Valores de Montevideo. Hay reglas locales, información periódica, auditor externo y canal de reclamo ante el BCU.',
    },
    {
      label: 'Custodia',
      assessment: 'Intermedia',
      color: 'warning',
      detail:
        'Gletir Global usa GTN y cuentas ómnibus. GTN selecciona custodios según mercado; para acciones de EE.UU. Gletir menciona Velocity Clearing, Vision Financial Markets o Clear Street. Pedí por escrito cuál corresponde a tu cuenta y activo.',
    },
    {
      label: 'Cumplimiento',
      assessment: 'A vigilar',
      color: 'warning',
      detail:
        'El BCU impuso en 2025 una multa de UI 150.000 por fallas detectadas en 2024 sobre información al inversor, perfiles, registros, custodias, prevención de lavado y controles. La resolución recoge medidas correctivas de Gletir, pero también califica el quebrantamiento como relevante.',
    },
    {
      label: 'Riesgo de inversión',
      assessment: 'Variable',
      color: 'info',
      detail:
        'Un ETF diversificado, un bono, una opción y un valor privado no tienen el mismo riesgo. La regulación de Gletir no evita pérdidas de mercado, incumplimientos del emisor ni falta de liquidez.',
    },
  ],
  positives: [
    'Intermediario uruguayo activo, regulado por la Superintendencia de Servicios Financieros y miembro de la BVM.',
    'Cuenta sin costo de apertura ni mantenimiento, con fondeo y soporte local.',
    'Cartilla pública de costos y FAQ que identifica a GTN y ejemplos de custodios extranjeros.',
    'Gletir informa retenciones complementarias de IRPF sobre dividendos e intereses para residentes uruguayos, lo que puede simplificar parte de la operativa tributaria.',
  ],
  cautions: [
    'No es un depósito bancario: no tiene la garantía de depósitos de COPAB y el BCU no garantiza el capital ni el rendimiento.',
    'La cuenta internacional es ómnibus. Tus activos se registran dentro de una cuenta global y la restitución depende también de los registros internos y de la cadena Gletir–GTN–custodio.',
    'La resolución RR-SSF-2025-303 documentó problemas materiales: información omitida sobre un emisor vinculado con patrimonio negativo, rentabilidades informadas por encima de las reales, colocaciones privadas sin contrato/perfil, debilidades de perfiles y estrategias, custodias en entidades vinculadas y fallas de control.',
    'El registro de sanciones del BCU también muestra incumplimientos administrativos anteriores, entre ellos mantenimiento de la garantía exigida y reportes fuera de plazo. No prueban insolvencia actual, pero impiden tratar el historial de cumplimiento como impecable.',
    'El contrato permite subcontratar la custodia y limita ampliamente la responsabilidad de Gletir; para valores privados o productos complejos la diligencia del cliente es especialmente importante.',
  ],
  costExamples: [
    { orderAmount: 500, commission: 10, effectiveRate: '2,00%' },
    { orderAmount: 1000, commission: 10, effectiveRate: '1,00%' },
    { orderAmount: 10000, commission: 75, effectiveRate: '0,75%' },
  ],
  checklist: [
    'Pedí el nombre legal del custodio, la jurisdicción, sus reguladores y su calificación de riesgo: sobre las cuentas globales abiertas a su nombre, la norma obliga al intermediario a darte esos datos (RNMV art. 210 lit. g, redacción de la Circular 2504, vigente desde el 24/06/2026 con 180 días de adecuación todavía corriendo). Y mirá abajo qué pasa con tus títulos si el intermediario deja de operar.',
    'Confirmá por escrito todos los costos: compra, venta, transferencia, cambio de moneda, datos en tiempo real, mercado y custodia.',
    'Empezá con una transferencia pequeña, verificá que el estado de cuenta concilie efectivo, títulos y comisiones, y probá un retiro.',
    'Si te ofrecen deuda privada, productos vinculados u opciones, exigí prospecto, emisor, garantías, conflictos de interés, liquidez y escenario de pérdida total.',
    'Para montos relevantes, compará con al menos otro corredor local y con una cuenta directa en un broker extranjero regulado.',
  ],
  sources: [
    {
      label: 'BCU — registro activo de Gletir (cód. 2317)',
      url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2317',
    },
    {
      label: 'BCU — resolución sancionatoria RR-SSF-2025-303',
      url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Resoluciones_SSF/RR-SSF-2025-303.pdf',
    },
    {
      label: 'BCU — registro público de sanciones de la SSF',
      url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/SancionesDeLaSSF.aspx',
    },
    {
      label: 'BVM — corredores de bolsa miembros',
      url: 'https://www.bvm.com.uy/operadores/corredores-de-bolsa',
    },
    {
      label: 'Gletir — FAQ de plataforma, custodia e impuestos',
      url: 'https://www.gletir.com/FAQ',
    },
    {
      label: 'Gletir — cartilla de costos vigente desde 22/01/2026',
      url: 'https://api.gletir.com/Content/Attach/3590.pdf',
    },
    {
      label: 'Gletir — contrato de apertura y custodia',
      url: 'https://www.gletir.com/OpenGletirAccount/FormClientGletirGlobal',
    },
  ],
})

// ---------------------------------------------------------------------------
// Qué pasa con tus títulos si el intermediario quiebra
// ---------------------------------------------------------------------------
// POR QUÉ EXISTE: el checklist de GLETIR_SAFETY_ANALYSIS le pedía al lector que averiguara "cómo
// probarías tu titularidad beneficiaria si Gletir o GTN dejaran de operar" y la guía nunca
// contestaba esa pregunta. Acá se contesta con la norma en la mano.
//
// LAS DOS COSAS QUE NO HAY QUE MEZCLAR:
//   1. SEPARACIÓN PATRIMONIAL (Ley 18.627 art. 109). Tu dinero y tus valores en custodia no se
//      embargan por deudas del intermediario y NO integran la masa activa de su liquidación. Es
//      una regla de propiedad: te saca de la fila de acreedores. No es un seguro y no repone nada.
//   2. FONDO DE COMPENSACIÓN AL INVERSOR. No existe en Uruguay. El único fondo de garantía del
//      sistema financiero es el FGDB de la COPAB, y su objeto —dicho por la propia COPAB— es
//      garantizar los depósitos en bancos y cooperativas de intermediación financiera. Publicar
//      esa ausencia es el punto de la sección: el lector viene buscando "algo tipo COPAB" y hay
//      que decirle que no lo hay, no inventarle un sustituto.
//
// DOS HOMÓNIMOS DEL REPO QUE NO SON ESTO: "SIPC" aparece en INVESTMENTS (fila prex-us-stocks-etfs)
// como regulador estadounidense de DriveWealth, y en utils/moneyApps.ts como "Sistema de
// Información de Precios al Consumidor" del MEF (Área de Defensa del Consumidor). Acá SIPC se
// nombra sólo para decir que Uruguay no tiene un equivalente.
//
// PLAZOS DE ADECUACIÓN QUE NO SE PUEDEN OMITIR — Y EL ERROR ESPEJO: la Circular 2504 (vigencia
// Diario Oficial 24/06/2026) sustituyó los arts. 209.2, 209.3, 209.4, 210 y 212 de la RNMV y cada
// uno cierra con una disposición transitoria de 180 días. Pero la transitoria dice "para adecuarse
// a las disposiciones contenidas en la presente resolución": alcanza a lo que la resolución trae
// de nuevo, no a lo que se limita a retranscribir al sustituir el artículo entero.
//   - EN PLAZO (sí llevan el hedge): todo el 209.2 / 209.3 / 209.4, que la 2504 creó (no existían
//     en la RNMV anterior); el literal g. del art. 210 (cuentas globales: nombre del custodio,
//     jurisdicción, reguladores, calificación), que tampoco existía; y el art. 212, cuya redacción
//     anterior decía "periodicidad ... que deberá ser al menos anual" — el mensual y los 7 días
//     corridos son nuevos.
//   - YA VIGENTES (NO llevan el hedge, aunque el artículo lleve pie de Circular 2504): el párrafo
//     segundo del art. 210 (poner a disposición del cliente el certificado de la Bolsa y la
//     Comunicación de inscripción en el Registro del Mercado de Valores) y el literal f. (lo que
//     hay que informar de la institución financiera del exterior a la que te referencian). Ambos
//     figuran palabra por palabra en la redacción anterior del artículo —Circular 2320, vigencia
//     Diario Oficial 22/01/2019— y ya estaban idénticos en la RNMV de enero de 2015 (Circular
//     2172). Prueba concluyente: el art. 211 le impone hoy a los asesores de inversión el mismo
//     deber de la Comunicación de inscripción y cierra con Circular 2320, sin plazo alguno.
// El art. 149 tiene su propia transitoria: hasta el 31/03/2027 para lo comunicado por la Circular
// 2477, salvo la garantía adicional por personas vinculadas en cuentas globales, exigible antes
// del 30/09/2026. Publicar un deber en plazo como accionable hoy es un error; publicar como
// "todavía en plazo" un deber exigible desde 2015/2019 es el mismo error al revés, y le dice al
// lector que no reclame algo que puede reclamar hoy.
//
// LA INSCRIPCIÓN NO ES UN JUICIO DE VALOR, PERO TAMPOCO ES LA FUENTE DE LA PROTECCIÓN: el art. 94
// define al intermediario por lo que hace y el art. 109 le da la separación patrimonial a la
// categoría. No hay norma que diga que no estar inscripto la haga caer, así que no se afirma.
//
// FUENTES, leídas y contrastadas el 2026-08-10:
//   - IMPO — Ley 18.627 (Mercado de Valores), arts. 25, 28, 30, 60, 94, 95, 96, 97, 101, 103, 106,
//     108, 109 y 110
//   - BCU — Recopilación de Normas del Mercado de Valores (texto vigente, última circular Nº 2507
//     del 16/07/2026), arts. 13, 82, 149, 151, 209.2, 209.3, 209.4, 210, 211 y 212
//   - BCU — RNMV, redacciones anteriores a la Circular 2504, para separar lo nuevo de lo que sólo
//     se retranscribió: snapshots de web.archive.org del mismo PDF con "última circular Nº 2398
//     del 7 de enero de 2022" (arts. 210 y 212 bajo Circulares 2320 y 2172) y "Nº 2216 del 26 de
//     enero de 2015" (art. 210 ya con el párrafo de la Comunicación de inscripción y el literal f.)
//   - COPAB — Sobre el Seguro de Depósitos, Cobertura, Depósitos cubiertos, Depósitos excluidos
//   - IMPO — Ley 16.774 (Fondos de Inversión), art. 1
//   - BROU — Instrumentos Financieros (la advertencia del propio banco)
// Es información de referencia, no asesoramiento legal ni financiero.

/** Fecha en que artículos, montos y textos de esta sección se contrastaron con las fuentes. */
export const CUSTODY_VERIFIED_AT = '2026-08-10'

export interface CustodyRule {
  title: string
  detail: string
  /** La norma exacta que lo sostiene. Nunca vacío: sin norma, la regla no se publica. */
  source: string
}

export interface CustodyAbsence {
  /** Lo que el lector viene a buscar y no existe. */
  missing: string
  /** Qué hay en su lugar, o por qué no consta. */
  instead: string
  source: string
}

export const CUSTODY_INSOLVENCY: Readonly<{
  thesis: string
  protections: readonly CustodyRule[]
  limits: readonly CustodyRule[]
  absences: readonly CustodyAbsence[]
  checklist: readonly string[]
  sources: readonly { label: string; url: string }[]
}> = Object.freeze({
  thesis:
    'Si tu corredor de bolsa quiebra, tus títulos no entran en la quiebra. La Ley 18.627 dice que el dinero y los valores que el intermediario mantiene en custodia por cuenta de sus clientes no integran la masa activa de la liquidación y no pueden embargarse por deudas suyas. Eso no es un seguro: no hay en Uruguay ningún fondo que te reponga lo que el corredor perdió, mezcló o nunca compró. Lo que la ley te da es que tus títulos no sirvan para pagarle a los acreedores del corredor, y eso vale exactamente lo que valga el registro donde figura que son tuyos. Por eso la pregunta útil no es "¿está garantizado?" sino "¿dónde está anotado que es mío y quién lo custodia?".',
  protections: [
    {
      title: 'Tus valores no integran la masa de la liquidación',
      detail:
        'En caso de liquidación por insolvencia del intermediario, el dinero y los valores que hubiese adquirido o tuviese en custodia por cuenta de sus clientes no integran la masa activa de la liquidación. No sos un acreedor más haciendo fila: eso ya no es del corredor.',
      source: 'Ley 18.627, art. 109',
    },
    {
      title: 'Tampoco se los pueden embargar por deudas del corredor',
      detail:
        'El mismo artículo prohíbe embargar ese dinero y esos valores por deudas del intermediario, y prohíbe cualquier otra medida preventiva o de ejecución para cobrarlas. La protección no espera a la quiebra: rige desde antes.',
      source: 'Ley 18.627, art. 109',
    },
    {
      title: 'La regla se extiende a la bolsa que custodia por cuenta del intermediario',
      detail:
        'El dinero y los valores de clientes que una bolsa u otra institución que constituya un mercado de oferta pública mantenga en custodia por cuenta de los intermediarios tampoco se ven afectados por medidas por deudas de esa institución custodiante, ni forman parte de su masa activa si se la liquida.',
      source: 'Ley 18.627, art. 109, inciso segundo',
    },
    {
      title: 'Si custodia a nombre propio, tiene que anotarlo por separado',
      detail:
        'El intermediario que custodia valores por cuenta de terceros pero a nombre propio debe anotarlos separadamente en su contabilidad e inscribirlos en un registro especial, con la individualización completa de las personas por cuenta de quien los mantiene.',
      source: 'Ley 18.627, art. 103',
    },
    {
      title: 'En valores escriturales, hay un registro de titulares reales',
      detail:
        'Los intermediarios deben llevar un registro completo, claro y preciso de los valores que inscribieron ante las entidades registrantes por cuenta y orden de los titulares reales, mediante códigos que permitan individualizarlos plenamente a ellos y a sus sucesores. Los actos sobre valores escriturales son oponibles a terceros desde su inscripción.',
      source: 'Ley 18.627, arts. 25 y 28',
    },
    {
      title: 'El error de registro se responde civilmente',
      detail:
        'Las entidades registrantes y los intermediarios responden frente a quienes resulten perjudicados por omitir inscripciones o por inexactitudes, errores y retrasos, salvo que el perjuicio lo haya causado el propio perjudicado. Es responsabilidad civil, sin perjuicio de las sanciones penales o administrativas.',
      source: 'Ley 18.627, art. 30',
    },
    {
      title: 'El liquidador es el BCU, en sede administrativa',
      detail:
        'El Banco Central del Uruguay puede intervenir o suspender de inmediato las actividades del intermediario cuando entienda que están en riesgo los intereses de terceros, y es liquidador en sede administrativa de los que estén en situación de insolvencia, pudiendo facultar a un tercero para practicarla. En todos los casos debe adoptar las medidas necesarias para asegurar que los activos de terceros queden debidamente cautelados.',
      source: 'Ley 18.627, arts. 106 y 108',
    },
    {
      title: 'Antes de operar dejó una garantía en el BCU',
      detail:
        'Los intermediarios deben constituir y mantener de forma permanente una garantía a favor del BCU por un monto no inferior a UI 2.000.000 (dos millones de unidades indexadas), por las eventuales obligaciones que pudieran asumir con el propio Banco o con terceros. Ese piso es el permanente. Aparte, la norma agrega dos garantías adicionales que todavía están en plazo de adecuación: si hacen gestión de portafolios y los activos bajo manejo superan UI 1.000.000.000 (un mil millones), deben constituir "por el exceso a este monto, una garantía adicional equivalente al 0,05% (cinco por diez mil) del portafolio gestionado" —lo transcribimos tal cual porque la norma usa las dos expresiones y no aclara sobre qué base se calcula—; y si mantienen en una cuenta global fondos o valores de personas vinculadas junto con los de otros clientes, otra adicional de UI 500.000. La disposición transitoria del art. 149 da hasta el 31/03/2027 para adecuarse a lo que comunicó la Circular 2477, salvo la adicional por personas vinculadas en cuentas globales, que debe cumplirse antes del 30/09/2026.',
      source:
        'Ley 18.627, art. 101 y RNMV, art. 149 (disposición transitoria: 30/09/2026 y 31/03/2027)',
    },
    {
      title: 'En cuenta ómnibus, tu plata no puede respaldar operaciones ajenas',
      detail:
        'En las cuentas globales no se admite en ningún caso que los fondos o valores de los clientes se usen, directa o indirectamente, para respaldar obligaciones de operaciones propias del intermediario ni de otros clientes, ni pueden mantenerse saldos negativos de clientes. El intermediario debe tener conciliación diaria que asegure la correcta atribución a cada cliente, y necesita tu consentimiento expreso y previo, dejado en el contrato de forma clara y destacada. Ojo con la fecha: esta redacción entró con la Circular 2504 y la propia resolución le da a las instituciones 180 días para adecuarse, así que a agosto de 2026 el plazo todavía corre.',
      source:
        'RNMV, arts. 209.2 y 209.4 (redacción de la Circular 2504, vigente desde el 24/06/2026, con 180 días de adecuación)',
    },
    {
      title: 'Te tienen que decir por norma quién es el custodio',
      detail:
        'Sobre las cuentas globales abiertas a nombre del intermediario, tiene que informarte el nombre de las instituciones financieras donde quedan depositados los fondos o custodiados los valores, la jurisdicción a la que pertenecen, los organismos reguladores de su país de origen si son del exterior, y la calificación de riesgo de la entidad de custodia o la indicación expresa de que no tiene. No es un favor que pedís: es información mínima obligatoria. Pero pedila sabiendo el calendario: el literal g. entró con la Circular 2504, vigente desde el 24/06/2026, y la misma resolución da 180 días de adecuación, que a agosto de 2026 no vencieron.',
      source:
        'RNMV, art. 210 lit. g (redacción de la Circular 2504, vigente desde el 24/06/2026, con 180 días de adecuación)',
    },
    {
      title: 'El estado de cuenta mensual es tu prueba',
      detail:
        'El intermediario debe mandarte estados de cuenta con todas las operaciones, todos los costos asociados —incluidos los diferenciales de precios—, las posiciones en efectivo y en valores y la rentabilidad anual, con periodicidad al menos mensual y dentro de los 7 días corridos del cierre del período. Si operás por cuenta global, debe discriminar las transacciones y reflejar tu posición consolidada. Además, una caja de valores puede extender las certificaciones que le soliciten. La redacción vigente del art. 212 es la de la Circular 2504 (24/06/2026), con 180 días de adecuación que a agosto de 2026 siguen corriendo.',
      source:
        'RNMV, art. 212 (redacción de la Circular 2504, vigente desde el 24/06/2026, con 180 días de adecuación) y Ley 18.627, art. 60 num. 4',
    },
  ],
  limits: [
    {
      title: 'La garantía del BCU no es una cobertura por inversor',
      detail:
        'Es un piso fijo por entidad, no un monto por cliente ni proporcional a tu cartera, y se constituye a favor del Banco Central para responder por las obligaciones del intermediario con el Banco o con terceros. La ley la define en beneficio de los acreedores que el intermediario tenga o llegue a tener por su actividad, no como un reintegro a cada inversor. La garantía total además tiene tope: la Responsabilidad Patrimonial Básica exigida para bancos.',
      source: 'Ley 18.627, art. 101 y RNMV, art. 149',
    },
    {
      title: 'Protege lo que efectivamente compró o custodia por tu cuenta',
      detail:
        'El artículo 109 saca de la masa "el dinero y los valores que el intermediario hubiese adquirido o tuviese en custodia por cuenta de sus clientes". Lo que no encaje en esa descripción —un activo que nunca se compró, un faltante, una promesa de rendimiento— no está cubierto por la regla de separación: ahí sí quedás como acreedor, con un crédito que reclamar.',
      source: 'Ley 18.627, art. 109 (lectura del texto)',
    },
    {
      title: 'Del custodio del exterior para allá manda otro derecho',
      detail:
        'La separación del art. 109 rige sobre el intermediario uruguayo. La norma exige que las instituciones donde se depositen los fondos o valores de clientes —locales o del exterior— y la propia actividad de custodia por cuenta de terceros estén sujetas a regulación y supervisión en su país de origen, y que al referenciarte a una institución del exterior te digan que está regida y controlada por autoridades de ese país y no por el BCU, cuál es la jurisdicción para resolver diferencias y que tu relación con ella se rige por normas del exterior. Qué pasa allá en una insolvencia lo define ese régimen, que no verificamos acá. Distinguí qué es nuevo y qué no: que el custodio tenga que estar regulado y supervisado en su país llegó con la Circular 2504 y todavía corre su plazo de adecuación; lo que te tienen que decir de la institución del exterior a la que te referencian es exigible hoy, viene sin cambios de la redacción anterior del art. 210.',
      source:
        'RNMV, art. 210 lit. f (texto sin cambios desde la Circular 2320, vigente desde el 22/01/2019: no es disposición nueva de la Circular 2504) y art. 209.2 (creado por la Circular 2504, vigente desde el 24/06/2026, con 180 días de adecuación)',
    },
    {
      title: 'No hay plazo legal para que te devuelvan los títulos',
      detail:
        'Buscamos en la Ley 18.627 y en la Recopilación de Normas del Mercado de Valores un plazo para restituir los valores de clientes en una liquidación y no lo encontramos. Sí hay plazos para otras cosas: un déficit de garantía debe subsanarse dentro de los 8 días hábiles de ocurrido, y la garantía se mantiene hasta el año posterior a la pérdida de la calidad de intermediario —o mientras mantenga a su nombre custodias de fondos o valores de clientes— y hasta que se resuelvan por sentencia ejecutoriada las acciones judiciales entabladas en su contra.',
      source: 'Ley 18.627, art. 101 y RNMV, arts. 149 y 151',
    },
    {
      title: 'La caja de valores y los sistemas de compensación cobran igual',
      detail:
        'El artículo siguiente al de la separación patrimonial pone un recorte explícito: la suspensión de actividades o la liquidación por insolvencia del intermediario no impide el estricto cumplimiento de las obligaciones que asumió en el ámbito de una caja de valores o en los sistemas de compensación y liquidación de valores. Esas obligaciones se liquidan como prevea la reglamentación y, para eso, pueden realizarse los bienes que el intermediario hubiese afectado en garantía, sin necesidad de procedimiento judicial alguno. Recién si sobra algo, ese remanente integra la masa activa de la liquidación.',
      source: 'Ley 18.627, art. 110',
    },
  ],
  absences: [
    {
      missing: 'Un fondo de compensación al inversor tipo SIPC',
      instead:
        'No consta que exista en Uruguay. El único fondo de garantía del sistema financiero es el Fondo de Garantía de Depósitos Bancarios, y la COPAB describe su objeto como garantizar los depósitos en bancos y cooperativas de intermediación financiera. Ni la Ley 18.627 ni la Recopilación de Normas del Mercado de Valores crean un fondo que reponga valores a los clientes de un intermediario. Lo que hay es separación patrimonial, que es otra cosa: evita que tus títulos paguen deudas ajenas, no cubre pérdidas.',
      source: 'COPAB — Sobre el Seguro de Depósitos; Ley 18.627; RNMV',
    },
    {
      missing: 'La COPAB cubriendo tu cuenta de inversión',
      instead:
        'El FGDB opera hasta el equivalente a USD 10.000 para el total de tus depósitos en moneda extranjera y hasta UI 250.000 para el total en moneda nacional, por persona y por institución, y sólo sobre depósitos en bancos y cooperativas de intermediación financiera. Un corredor de bolsa no es una institución de intermediación financiera y el efectivo que tenés ahí no es un depósito bancario. La COPAB tampoco es quien lo liquida: su rol de resolución alcanza a las instituciones de intermediación financiera; al corredor lo liquida el BCU.',
      source: 'COPAB — Cobertura y ¿Quiénes somos?; Ley 18.627, art. 108',
    },
    {
      missing: 'Los títulos comprados en tu banco, cubiertos por el seguro de depósitos',
      instead:
        'El propio BROU lo advierte en su página de instrumentos financieros: cuando adquirís títulos por intermedio de un banco, los mismos NO constituyen un depósito en el banco, por lo que NO se encuentran alcanzados por la cobertura provista al ahorro bancario. Comprar el bono en la ventanilla de un banco garantizado no le pasa la garantía al bono.',
      source: 'BROU — Instrumentos Financieros',
    },
    {
      missing: 'Cuotapartes de un fondo de inversión cubiertas por el FGDB',
      instead:
        'Tampoco. La normativa de protección del ahorro bancario excluye expresamente de la garantía "toda otra colocación que se realice contra la emisión de un valor negociable en los mercados bursátiles". Lo que protege a un fondo de inversión es otro mecanismo: la Ley 16.774 lo define como un patrimonio de afectación independiente y establece que el patrimonio del Fondo no responderá por las deudas de los aportantes ni de las sociedades administradoras o depositarias. De nuevo: separación, no seguro.',
      source: 'COPAB — Depósitos excluidos, lit. c; Ley 16.774, art. 1',
    },
    {
      missing: 'Que estar en el registro del BCU signifique que el BCU te respalda',
      instead:
        'La Ley 18.627 dice que los intermediarios están sujetos a la fiscalización de la Superintendencia de Servicios Financieros, que necesitan su autorización para actuar y qué requisitos hay que acreditar para quedar inscripto. De respaldo, nada. La fórmula famosa —"esta inscripción sólo acredita que se ha cumplido con los requisitos establecidos legal y reglamentariamente, no significando que el Banco Central del Uruguay exprese un juicio de valor"— existe, pero la Recopilación se la impone a los prospectos de los emisores y al reglamento y prospecto de los fondos de inversión, no al registro de tu corredor. Buscamos una fórmula equivalente referida a la inscripción de un intermediario de valores y no la encontramos. Que esté autorizado e inscripto es necesario y no es suficiente.',
      source: 'Ley 18.627, arts. 95 a 97; RNMV, arts. 13 y 82 (textos de inserción obligatoria)',
    },
  ],
  checklist: [
    'Guardá los estados de cuenta y leelos. Te los deben mandar al menos una vez por mes, dentro de los 7 días corridos del cierre, con operaciones, costos, posiciones en efectivo y en valores y rentabilidad anual (RNMV art. 212, redacción de la Circular 2504, vigente desde el 24/06/2026 con 180 días de adecuación). Es la prueba de qué tenés y cuánto.',
    'Pedí por escrito el nombre de la institución donde quedan depositados tus fondos y custodiados tus valores, su jurisdicción, sus reguladores y su calificación de riesgo. No es un favor: es información mínima obligatoria (RNMV art. 210 lit. g, redacción de la Circular 2504, vigente desde el 24/06/2026 con 180 días de adecuación: si te dicen que lo están implementando, están en plazo).',
    'Si operás por cuenta global, revisá que el contrato tenga tu consentimiento expreso y previo, de forma clara y destacada, y que el estado de cuenta discrimine tus transacciones y muestre tu posición consolidada (RNMV arts. 209.4 y 212, ambos con la misma adecuación de 180 días desde el 24/06/2026).',
    'Antes de transferir, verificá que el intermediario esté autorizado e inscripto ante la Superintendencia de Servicios Financieros: necesita esa autorización para actuar y está sujeto a la fiscalización de la SSF (Ley 18.627, arts. 95 y 96), y la norma le exige poner a tu disposición el certificado de la Bolsa de Valores que lo habilita, cuando corresponda, y la Comunicación de inscripción en el Registro del Mercado de Valores (RNMV art. 210, párrafo segundo). Eso pedilo hoy y no aceptes que te lo pateen: el deber ya estaba idéntico en la redacción anterior del artículo (Circular 2320, vigente desde el 22/01/2019) y palabra por palabra en la RNMV de enero de 2015; al asesor de inversión el art. 211 le impone el mismo deber y sigue bajo la Circular 2320, sin plazo. Estar inscripto significa que acreditó los requisitos del art. 97, no que el BCU respalde a la entidad; operar con alguien no autorizado te deja fuera de esa supervisión. Lo que no encontramos es norma que diga que la falta de registro haga caer la separación patrimonial: la ley define al intermediario por lo que hace —quien opera de forma profesional y habitual entre oferentes y demandantes de valores (art. 94)— y el art. 109 le da esa separación a la categoría, no al inscripto.',
    'Si tenés valores escriturales, preguntá cuál es la entidad registrante y pedí la certificación de tu posición. La titularidad se prueba en el registro, no en el resumen de la app.',
    'Dejá de buscar un fondo que te reponga: no existe. Lo que sí existe es el rastro documental de que esos títulos son tuyos, y ese rastro lo tenés que juntar vos mientras todo funciona bien.',
  ],
  sources: [
    {
      label: 'IMPO — Ley 18.627, art. 109 (de los valores y fondos de terceros)',
      url: 'https://www.impo.com.uy/bases/leyes/18627-2009/109',
    },
    {
      label:
        'IMPO — Ley 18.627, art. 110 (la caja de valores y los sistemas de compensación cobran igual)',
      url: 'https://www.impo.com.uy/bases/leyes/18627-2009/110',
    },
    {
      label: 'IMPO — Ley 18.627, art. 94 (quién es intermediario: definición por la actividad)',
      url: 'https://www.impo.com.uy/bases/leyes/18627-2009/94',
    },
    {
      label: 'IMPO — Ley 18.627, art. 101 (garantía previa a la autorización)',
      url: 'https://www.impo.com.uy/bases/leyes/18627-2009/101',
    },
    {
      label: 'IMPO — Ley 18.627, art. 103 (valores de terceros en custodia)',
      url: 'https://www.impo.com.uy/bases/leyes/18627-2009/103',
    },
    {
      label: 'IMPO — Ley 18.627, texto completo (Mercado de Valores)',
      url: 'https://www.impo.com.uy/bases/leyes/18627-2009',
    },
    {
      label:
        'BCU — Recopilación de Normas del Mercado de Valores (vigente, última circular Nº 2507 del 16/07/2026)',
      url: 'https://www.bcu.gub.uy/Acerca-de-BCU/Normativa/Documents/Reordenamiento%20de%20la%20Recopilaci%C3%B3n/Mercado%20de%20Valores/RNMV.pdf',
    },
    {
      label: 'COPAB — Sobre el Seguro de Depósitos (objeto del FGDB)',
      url: 'https://www.copab.org.uy/innovaportal/v/962/1/web/sobre-el-seguro-de-depositos.html',
    },
    {
      label: 'COPAB — Cobertura (USD 10.000 / UI 250.000 por persona y por institución)',
      url: 'https://www.copab.org.uy/innovaportal/v/308/1/web/cobertura.html',
    },
    {
      label: 'COPAB — Depósitos excluidos de la garantía',
      url: 'https://www.copab.org.uy/innovaportal/v/312/1/web/depositos-excluidos.html',
    },
    {
      label: 'COPAB — Depósitos cubiertos',
      url: 'https://www.copab.org.uy/innovaportal/v/311/1/web/depositos-cubiertos.html',
    },
    {
      label: 'COPAB — ¿Quiénes somos? (alcance de la resolución bancaria)',
      url: 'https://www.copab.org.uy/innovaportal/v/39/1/web/quienes-somos.html',
    },
    {
      label: 'IMPO — Ley 16.774 (fondos de inversión, patrimonio de afectación independiente)',
      url: 'https://www.impo.com.uy/bases/leyes/16774-1996',
    },
    {
      label: 'BROU — Instrumentos Financieros (los títulos no son un depósito en el banco)',
      url: 'https://www.brou.com.uy/personas/inversiones/instrumentos-financieros',
    },
    {
      label: 'BCU — Registro de Intermediarios de Valores',
      url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/int_Valores.aspx',
    },
  ],
})

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

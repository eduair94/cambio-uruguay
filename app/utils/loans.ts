// app/utils/loans.ts
// Catalogue of places to request a personal/consumer loan in Uruguay (banks, financieras,
// cooperativas, fintech). PURE data + helpers (no Vue/Nuxt) so the page, the API merge and tests
// share one source of truth. Rates are ADVERTISED references (TEA) verified June 2026 from each
// lender's published info; confirm the final CFT/TEA with the lender. Not affiliated; informational.
import type { ReviewSource } from './reviews'

export type LenderType = 'banco' | 'financiera' | 'cooperativa' | 'fintech'

export interface Lender {
  id: string
  name: string
  type: LenderType
  /** Representative advertised annual effective rate (TEA) in %, or null when quote-only. */
  teaPct: number | null
  currency: 'UYU' | 'USD' | 'UI'
  maxAmount: number | null
  maxTermMonths: number | null
  requirements: string[]
  online: boolean
  website: string
  /** URL backing the rate / info. */
  source: string
  note?: string
  /** Aggregated reputation 0–5 from reviews, or null when too few to rate. */
  rating: number | null
  reviewsNote?: string
  reviewSources: ReviewSource[]
}

export const LENDER_TYPES: Readonly<Record<LenderType, string>> = Object.freeze({
  banco: 'Bancos',
  financiera: 'Financieras y créditos',
  cooperativa: 'Cooperativas',
  fintech: 'Fintech / digitales',
})

export const LENDERS: Lender[] = [
  // ── Bancos ──────────────────────────────────────────────────────────────────
  {
    id: 'brou',
    name: 'BROU (Banco República)',
    type: 'banco',
    teaPct: null,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: 60,
    requirements: [
      'Mayor de 18 años y residente',
      'Comprobante de ingresos / recibo de sueldo',
      'Cédula vigente',
      'Sin antecedentes negativos en el Clearing',
    ],
    online: true,
    website: 'https://www.brou.com.uy',
    source:
      'https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-sin-retencion-en-pesos-ui-y-dolares',
    note: "Tasa en PDF 'Tasas vigentes'; rango referencial 23–34% según modalidad (con/sin retención); cuota ≤35% del salario; eBROU bonifica ~1 punto. IVA aparte",
    rating: null,
    reviewsNote:
      'Reputación institucional muy fuerte (mejor banco de Uruguay según The Banker 2023–2024 y ranking Merco); quejas por colas en sucursales',
    reviewSources: [
      {
        label: 'The Banker — Mejor banco de Uruguay',
        url: 'https://www.brou.com.uy/brou-el-banco-n-1-en-uruguay-segun-la-revista-the-banker',
      },
      {
        label: 'Ámbito — BROU mejor banco del país',
        url: 'https://www.ambito.com/uruguay/el-brou-fue-reconocido-como-el-mejor-banco-del-pais-n5889927',
      },
    ],
  },
  {
    id: 'itau',
    name: 'Itaú Uruguay',
    type: 'banco',
    teaPct: 39,
    currency: 'UYU',
    maxAmount: 1500000,
    maxTermMonths: 48,
    requirements: [
      'Entre 18 y 70 años',
      'Ingresos líquidos mínimos $23.000',
      'Antigüedad laboral 12 meses',
      'Sin antecedentes en Clearing/BCU',
      'Cédula y último recibo',
    ],
    online: true,
    website: 'https://www.itau.com.uy',
    source: 'https://www.itau.com.uy/inst/preAprobados.html',
    note: 'TEA 39% publicada para préstamos preaprobados a cuenta-habientes con haberes en Itaú; sin haberes/plazos largos la tasa sube; amortizable online hasta $300.000 sin documentación',
    rating: null,
    reviewsNote:
      'Reconocido por mejor experiencia digital bancaria en Uruguay (2024–2025); críticas a la atención telefónica',
    reviewSources: [
      { label: 'Ahorrin — Bancos Uruguay', url: 'https://www.ahorrin.app/bancos-uruguay' },
      {
        label: 'Google Play — App Itaú UY',
        url: 'https://play.google.com/store/apps/details?id=com.uy.itau.appitauuypf&hl=en_US',
      },
    ],
  },
  {
    id: 'santander',
    name: 'Santander Uruguay',
    type: 'banco',
    teaPct: null,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: 60,
    requirements: [
      'Entre 18 y 85 años',
      'Ingreso líquido mínimo $7.500 (con haberes) / $10.000 (otros)',
      'Antigüedad 6 meses dependientes / 2 años independientes',
      'Cuota ≤25% del ingreso en pesos',
      'Tener o abrir cuenta Santander',
    ],
    online: true,
    website: 'https://www.santander.com.uy',
    source: 'https://www.santander.com.uy/todos-los-prestamos/prestamo-personal',
    note: 'No publica TEA en la web ni en el manual de tarifas; se obtiene al simular o llamar. Sin gastos de otorgamiento ni administración; seguro de vida + desempleo incluido',
    rating: null,
    reviewsNote:
      'Valorado por no cobrar gastos de otorgamiento y por la cobertura de seguro; quejas por demoras en sucursales',
    reviewSources: [
      { label: 'Ahorrin — Bancos Uruguay', url: 'https://www.ahorrin.app/bancos-uruguay' },
      {
        label: 'PréstamosFrescos — Santander',
        url: 'https://www.prestamosfrescos.com/uy/prestamos',
      },
    ],
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank Uruguay',
    type: 'banco',
    teaPct: 36,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: 48,
    requirements: [
      'Entre 18 y 80 años',
      'Ingresos líquidos mínimos $15.000',
      'Antigüedad laboral 6 meses',
      'Cédula vigente',
      'Último recibo de sueldo o constancia de contador',
    ],
    online: true,
    website: 'https://www.scotiabank.com.uy',
    source: 'https://www.scotiabank.com.uy/Personas/Prestamos/Prestamo-Personal/prestamo-personal',
    note: 'TEA ~36% en pesos (referencia concordante en comparadores; la web remite al simulador); ~10% en dólares; hasta 48 cuotas con haberes en Scotiabank',
    rating: null,
    reviewsNote:
      'Bien valorado por Scotia Puntos y tarjetas premium; quejas por comisiones sin paquete activo y red de sucursales acotada',
    reviewSources: [
      { label: 'Ahorrin — Bancos Uruguay', url: 'https://www.ahorrin.app/bancos-uruguay' },
      { label: 'Trustpilot — Scotiabank', url: 'https://www.trustpilot.com/review/scotiabank.com' },
    ],
  },
  {
    id: 'bbva',
    name: 'BBVA Uruguay',
    type: 'banco',
    teaPct: 36,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: 24,
    requirements: [
      'Entre 21 y 77 años',
      'Ingresos líquidos mínimos $20.000–$30.000',
      'Antigüedad 1 año dependientes / 3 años independientes',
      'Cédula vigente',
      'Último recibo o constancia de ingresos',
    ],
    online: true,
    website: 'https://www.bbva.com.uy',
    source: 'https://www.bbva.com.uy/personas/productos/prestamos/prestamo-personal/personal.html',
    note: 'TEA ~36% en pesos (referencia concordante; la web de producto bloquea acceso directo); ~9% USD; ~12% UI; hasta $1.500.000 para perfiles calificados',
    rating: null,
    reviewsNote:
      'Destacado por la app móvil con biometría; quejas por comisiones de mantenimiento sin nómina activa',
    reviewSources: [
      { label: 'Ahorrin — Bancos Uruguay', url: 'https://www.ahorrin.app/bancos-uruguay' },
      { label: 'Wikipedia — BBVA Uruguay', url: 'https://en.wikipedia.org/wiki/BBVA_Uruguay' },
    ],
  },
  {
    id: 'btg',
    name: 'BTG Pactual Uruguay (ex HSBC)',
    type: 'banco',
    teaPct: null,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: 60,
    requirements: [
      'Entre 18 y 65 años (no superar 75 al vencimiento)',
      'Ingresos líquidos mínimos $20.000',
      'Antigüedad 6 meses (con haberes) / 2 años independientes',
      'Cédula, comprobante de domicilio y 3 últimas liquidaciones',
    ],
    online: true,
    website: 'https://www.btgpactual.uy',
    source: 'https://www.btgpactual.uy/',
    note: 'HSBC Uruguay pasó a operar como BTG Pactual el 10/07/2026. No publica TEA en página accesible; hasta 60 cuotas. Requisitos heredados de la cartilla de HSBC — reverificar contra la cartilla de BTG.',
    rating: null,
    reviewsNote:
      'Marca nueva desde julio de 2026: sin reseñas propias. Perfil premium con servicio personalizado y red muy pequeña (~6 sucursales), heredado de HSBC.',
    reviewSources: [
      {
        label: 'HSBC Uruguay — aviso del traspaso a BTG Pactual (10/07/2026)',
        url: 'https://www.hsbc.com.uy/aviso/',
      },
      {
        label: 'BTG Pactual Uruguay — sitio oficial',
        url: 'https://www.btgpactual.uy/',
      },
    ],
  },
  // ── Financieras ─────────────────────────────────────────────────────────────
  {
    id: 'creditel',
    name: 'Creditel',
    type: 'financiera',
    teaPct: null,
    currency: 'UYU',
    maxAmount: 636000,
    maxTermMonths: 48,
    requirements: [
      "Cédula vigente (puede ser 'a sola selfie' por app)",
      'Comprobante de ingresos',
      'Comprobante de domicilio',
      'Edad 18–80 años',
    ],
    online: true,
    website: 'https://www.creditel.com.uy',
    source: 'https://tramitesuruguay.com/prestamos/creditel-prestamos/',
    note: 'No publica TEA antes de solicitar; el simulador la muestra tras ingresar datos. Rango referencial 70–128% TEA (CalcuLatam mar-2026). Supervisada por BCU como IFNB',
    rating: 4.4,
    reviewsNote:
      'Valorada por agilidad y proceso digital; críticas por falta de transparencia de la tasa antes de firmar',
    reviewSources: [
      {
        label: 'PréstamosFrescos — Creditel (4,4/5, 312 opiniones)',
        url: 'https://www.prestamosfrescos.com/uy/prestamo/creditel',
      },
      {
        label: 'Loan-apps — Creditel',
        url: 'https://uy.loan-apps.com/loan-apps-uruguay/creditel-sa',
      },
    ],
  },
  {
    id: 'pronto',
    name: 'Pronto!',
    type: 'financiera',
    teaPct: 49,
    currency: 'UYU',
    maxAmount: 600000,
    maxTermMonths: 48,
    requirements: [
      'Cédula uruguaya',
      'Comprobante de ingresos (algunos planes sin recibo)',
      'Mayor de 18 años',
      'Residencia en Uruguay',
    ],
    online: true,
    website: 'https://www.pronto.com.uy',
    source: 'https://www.pronto.com.uy/tasa-29/',
    note: "Ejemplo oficial: $500.000 en 42 cuotas al 49% TEA + IVA. 'Desde 29% + IVA' con acreditación de sueldo; máximo regulatorio ~113%. Subsidiaria de Scotiabank, líder en crédito al consumo (>200.000 clientes, 37 sucursales). Híbrido app + sucursales",
    rating: null,
    reviewsNote:
      'Confiable y de respuesta rápida; críticas al costo real para perfiles sin acreditación de sueldo y a la estabilidad de la app iOS (App Store 3,7/5)',
    reviewSources: [
      {
        label: 'App Store — Pronto (3,7/5)',
        url: 'https://apps.apple.com/uy/app/pronto/id1114649717',
      },
      { label: 'Finango — reseñas Pronto', url: 'https://finango.uy/prestamos/reviews/pronto' },
    ],
  },
  {
    id: 'oca',
    name: 'OCA',
    type: 'financiera',
    teaPct: 39,
    currency: 'UYU',
    maxAmount: 400000,
    maxTermMonths: 36,
    requirements: [
      'Cédula (verificación digital)',
      'Comprobante de ingresos',
      'Para montos >$50.000 puede pedir cesión de haberes o garante',
      'Edad mínima 18 años',
    ],
    online: true,
    website: 'https://oca.uy',
    source: 'https://oca.uy/prestamos/',
    note: "Publica ejemplos en su web: 'Préstamo Light' 39% TEA para $100.000–$400.000; rango 39%–87% + IVA. Comisiones de concesión/administración y seguro 0,25% mensual incluidos en la cuota. 100% digital, no afecta el disponible de tarjeta",
    rating: 4.0,
    reviewsNote:
      'Una de las mejores TEA del sector, buena experiencia digital, entrega ~48 h; alguna crítica por mora y atención',
    reviewSources: [
      { label: 'Finango — reseñas OCA', url: 'https://finango.uy/prestamos/reviews/oca' },
      { label: 'Loan-apps — OCA', url: 'https://uy.loan-apps.com/loan-apps-uruguay/oca' },
    ],
  },
  {
    id: 'crediton',
    name: 'Crediton',
    type: 'financiera',
    teaPct: null,
    currency: 'UYU',
    maxAmount: 150000,
    maxTermMonths: 36,
    requirements: [
      'Cédula vigente',
      'Sin acreditación de haberes',
      'Aprobación crediticia',
      'Retiro en RedPagos',
    ],
    online: true,
    website: 'https://www.crediton.com.uy',
    source: 'https://www.crediton.com.uy/solicitar-prestamo/',
    note: 'TEA publicada en la solicitud: 75,4%–130,1% según monto ($4.000–$150.000 con Crediton Plus). Seguro obligatorio 0,25%/mes; sin penalidad por cancelación anticipada; 100% digital',
    rating: null,
    reviewsNote: 'Proceso 100% digital y retiro inmediato en RedPagos; tasas altas reconocidas',
    reviewSources: [
      { label: 'Crediton Plus — tasas', url: 'https://www.creditonplus.com.uy/' },
      { label: 'CalcuLatam — préstamos UY', url: 'https://calculatam.com/uy/prestamos' },
    ],
  },
  {
    id: 'microfin',
    name: 'Microfin',
    type: 'financiera',
    teaPct: null,
    currency: 'UYU',
    maxAmount: 150000,
    maxTermMonths: 24,
    requirements: [
      'Cédula uruguaya vigente',
      'Mayor de 21 años',
      'Comprobante de ingresos',
      'Sin antecedentes negativos',
      'Residencia permanente',
    ],
    online: true,
    website: 'https://microfin.com.uy',
    source: 'https://www.prestamosfrescos.com/uy/prestamo/microfin',
    note: 'Rango referencial 70%–149,5% TEA según monto/plazo. Comisiones en UI; seguro de vida 0,6% sobre saldo; pagos en Abitab. Grupo ACP (Perú) con aval IDB/MIGA; supervisada por BCU',
    rating: 4.0,
    reviewsNote:
      '4/5 con 511 opiniones; valorada por accesibilidad y atención cercana; tasas elevadas reconocidas',
    reviewSources: [
      {
        label: 'PréstamosFrescos — Microfin (4,0/5, 511 opiniones)',
        url: 'https://www.prestamosfrescos.com/uy/prestamo/microfin',
      },
      {
        label: 'MoneyGuru24 — Microfin',
        url: 'https://uruguay.moneyguru24.com/info/microfin_uy/3219',
      },
    ],
  },
  {
    id: 'republica-microfinanzas',
    name: 'República Microfinanzas',
    type: 'financiera',
    teaPct: null,
    currency: 'UYU',
    maxAmount: 18000,
    maxTermMonths: 18,
    requirements: [
      'Cédula vigente',
      'Comprobante de domicilio',
      'Dos últimos recibos de sueldo',
      'Cuota ≤20% del ingreso neto',
    ],
    online: true,
    website: 'https://www.republicamicrofinanzas.com.uy',
    source: 'https://crediuruguay.uy/al-consumo/jovenes-republica/',
    note: "Subsidiaria 100% del BROU; especializada en microempresas y familias de bajos ingresos. Línea para jóvenes 'MiCrédito' $3.500–$18.000 en 6–18 cuotas. TEA no publicada en el sitio; supervisada por BCU. Tel. 0800 6040",
    rating: null,
    reviewsNote:
      'Sin reseñas de clientes en plataformas públicas; reputación institucional sólida por respaldo del BROU',
    reviewSources: [
      {
        label: 'Uruguay Emprendedor — República Microfinanzas',
        url: 'https://www.uruguayemprendedor.uy/institucion/republica-microfinanzas-sa/',
      },
      {
        label: 'Indeed — opiniones (empleados)',
        url: 'https://uy.indeed.com/cmp/Republica-Microfinanzas-1/reviews',
      },
    ],
  },
  {
    id: 'credito-de-la-casa',
    name: 'Crédito de la Casa',
    type: 'financiera',
    teaPct: null,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: null,
    requirements: ['Cédula uruguaya vigente', 'Comprobante de ingresos', 'Residencia en Uruguay'],
    online: true,
    website: 'https://solicitar.creditodelacasa.com.uy',
    source:
      'https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/tasas-empresas-credito-casa-ano-2026',
    note: 'Programa de financiamiento de consumo en punto de venta regulado por el MEF (publica tasas en PDF semestral). El sitio no expone tasas; topes legales BCU 70–132% TEA según tramo. TEA específica no verificable',
    rating: null,
    reviewsNote: 'Sin reseñas de clientes en plataformas públicas',
    reviewSources: [
      {
        label: 'MEF — tasas Crédito de la Casa 2025',
        url: 'https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/tasas-empresas-credito-casa-ano-2025',
      },
    ],
  },
  // ── Cooperativas ────────────────────────────────────────────────────────────
  {
    id: 'verde-fucac',
    name: 'Verde (ex-FUCAC)',
    type: 'cooperativa',
    teaPct: 28,
    currency: 'UYU',
    maxAmount: 500000,
    maxTermMonths: 48,
    requirements: [
      'Asalariado, jubilado o pensionista',
      'Cédula vigente',
      'Recibo de sueldo / pasividad',
      'Comprobante de domicilio a su nombre',
      'Hacerse socio (cuota social mensual)',
    ],
    online: true,
    website: 'https://verde.com.uy',
    source: 'https://verde.com.uy/conocenos_mas_transparentes.php',
    note: "TEA compensatoria 28%–32,5% (vigente jun-2026); mora 39%–45,5%. Ex-FUCAC (rebranding 2022), la mayor cooperativa de ahorro y crédito del país (~290.000 socios). Incluye seguros de vida, desempleo y hospitalización. Línea 'solo con cédula' $5.000–$30.000",
    rating: null,
    reviewsNote:
      'Citada como la cooperativa más grande y confiable de Uruguay; reputación informal positiva; sin rating agregado público',
    reviewSources: [
      {
        label: 'Credifama — préstamos Verde/FUCAC',
        url: 'https://credifama.com.uy/prestamos-de-verde-nueva-propuesta-de-fucac/',
      },
      { label: 'Finanzas.com.uy — FUCAC', url: 'https://finanzas.com.uy/prestamos-fucac-uy/' },
    ],
  },
  {
    id: 'anda',
    name: 'ANDA',
    type: 'cooperativa',
    teaPct: 28.4,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: 48,
    requirements: [
      'Ser socio (paga registro de socio)',
      'Cédula vigente',
      'Antigüedad laboral 6 meses (jubilados exonerados)',
      'Recibo de sueldo o pasividad',
      'Buen perfil crediticio (categoría 1c)',
    ],
    online: true,
    website: 'https://anda.com.uy',
    source: 'https://anda.com.uy/prestamos/',
    note: "Tasas publicadas como '% + IVA': préstamo personal 28,4%–33% + IVA (≈34,6%–40,3% con IVA). Asociación civil sin fines de lucro (fundada 1933, 200.000+ socios), supervisada por BCU. 'Préstamo Mudate' 25% + IVA con contrato de alquiler",
    rating: null,
    reviewsNote:
      'Una de las mutuales más antiguas del país; buena reputación por accesibilidad; sin rating agregado independiente',
    reviewSources: [
      { label: 'Finango — reseñas ANDA', url: 'https://finango.uy/prestamos/reviews/anda/' },
      {
        label: 'Ahorrar — sucursales ANDA',
        url: 'https://ahorrar.com.uy/bancos/sucursales-de-anda-en-uruguay/',
      },
    ],
  },
  {
    id: 'acac',
    name: 'Cooperativa ACAC',
    type: 'cooperativa',
    teaPct: 29,
    currency: 'UYU',
    maxAmount: 400000,
    maxTermMonths: 48,
    requirements: [
      'Ser socio (cuota social inicial ~$500)',
      'Cédula vigente',
      'Comprobante de domicilio',
      'Dos últimos recibos de ingresos',
      'Evaluación crediticia (presta incluso en clearing)',
    ],
    online: true,
    website: 'https://acac.com.uy',
    source: 'https://creditoonline.uy/prestamos-cooperativa-acac-uruguay',
    note: "Con retención en nómina desde ~29% TEA; sin retención desde ~69% TEA. Fundada 1986, 250.000+ socios. Seguro de vida incluido; 'Préstamos Relámpago' desde $20.000; 6–48 cuotas. Sitio oficial devolvió 403; tasas de fuentes secundarias concordantes",
    rating: null,
    reviewsNote:
      'Recomendada para empleados públicos y jubilados; presta en clearing; reportes anecdóticos de inconsistencias de coordinación',
    reviewSources: [
      {
        label: 'CréditoOnline — ACAC',
        url: 'https://creditoonline.uy/prestamos-cooperativa-acac-uruguay',
      },
      {
        label: 'Cooperativas.com.uy — ACAC',
        url: 'https://cooperativas.com.uy/guia/listings/cooperativa-acac/',
      },
    ],
  },
  {
    id: 'fucerep',
    name: 'FUCEREP',
    type: 'cooperativa',
    teaPct: 37.8,
    currency: 'UYU',
    maxAmount: 1000000,
    maxTermMonths: 84,
    requirements: [
      'Antigüedad laboral mínima 6 meses',
      'Ingreso neto mínimo ~$18.000',
      'Categoría 1c en el sistema financiero',
      'Cédula vigente y recibos',
      'Afiliación como socio',
    ],
    online: true,
    website: 'https://www.fucerep.com.uy',
    source: 'https://credifama.com.uy/prestamos-fucerep-ventajas-y-como-solicitar/',
    note: "TEA préstamo a plazo fijo 37,77%–40,32%; línea nómina (retención) ~25%. Fundada ~1972 por funcionarios del BROU. Máximo $1.000.000 / 84 cuotas; producto promocional '0% interés' (máx. $150.000, 36 cuotas). Sitio sin tasas públicas (cifras de Credifama)",
    rating: null,
    reviewsNote:
      'Nicho ligado a funcionarios del BROU; reputación sólida y confiable en prensa secundaria; sin rating agregado público',
    reviewSources: [
      {
        label: 'Credifama — FUCEREP',
        url: 'https://credifama.com.uy/prestamos-fucerep-ventajas-y-como-solicitar/',
      },
      {
        label: 'EMIS — perfil FUCEREP',
        url: 'https://www.emis.com/php/company-profile/UY/Cooperativa_de_Ahorro_y_Credito_FUCEREP_en_1260097.html',
      },
    ],
  },
  {
    id: 'cofac',
    name: 'COFAC',
    type: 'cooperativa',
    teaPct: 46,
    currency: 'UYU',
    maxAmount: 60000,
    maxTermMonths: 15,
    requirements: [
      'Ser socio (acciones sociales)',
      'Cédula vigente',
      'Comprobante de domicilio',
      'Dos últimos recibos',
      'Antigüedad 1 mes (público) / 1 año (privado)',
    ],
    online: false,
    website: 'https://www.cofac.net',
    source: 'https://finanzas.com.uy/prestamos-cofac/',
    note: 'TEA ~46% para crédito estándar hasta 12 meses; rango $5.000–$60.000, 6–15 cuotas. Cooperativa pequeña-media con fuerte misión social (interior, Durazno). Cancelación anticipada tras pagar 30% de las cuotas',
    rating: null,
    reviewsNote:
      'Muy pocas reseñas públicas (5,0/5 con solo 2 votos en Opina — muestra no significativa); enfoque comunitario',
    reviewSources: [
      {
        label: 'Opina — COFAC Durazno',
        url: 'https://www.opina.com.uy/cooperativa-de-ahorro-y-credito/durazno/cofac-durazno_158701.php',
      },
      {
        label: 'Cooperativas.com.uy — COFAC',
        url: 'https://cooperativas.com.uy/guia/listings/cofac/',
      },
    ],
  },
  // ── Fintech / digitales ──────────────────────────────────────────────────────
  {
    id: 'prex',
    name: 'Prex (Prextamo)',
    type: 'fintech',
    teaPct: null,
    currency: 'UYU',
    maxAmount: 50000,
    maxTermMonths: 6,
    requirements: [
      'Cuenta Prex activa y verificada',
      'Mayor de 18 años',
      'Aprobación crediticia interna (Socur/Floder S.A.)',
      'No exige recibo de sueldo ni garantías',
    ],
    online: true,
    website: 'https://www.prexcard.com/uy',
    source: 'https://www.prexcard.com/terminos_de_uso/prextamoPaigo.html',
    note: "Crédito 'Prextamo' acreditado en la tarjeta prepaga Prex; 1–6 cuotas, $1.000–$50.000. TEA no publicada en T&C oficiales (solo comisión de concesión hasta 120 UI); fuentes terciarias citan 35–45% sin URL primaria → null",
    rating: 2.0,
    reviewsNote:
      "Trustpilot 2/5 ('Poor', 69 reseñas): quejas por bloqueo de cuentas y atención; App Store en cambio 4,8/5 (79K)",
    reviewSources: [
      {
        label: 'Trustpilot — Prex (2/5)',
        url: 'https://www.trustpilot.com/review/www.prexcard.com',
      },
      {
        label: 'App Store — Prex (4,8/5, 79K)',
        url: 'https://apps.apple.com/uy/app/prex-uruguay/id927400689',
      },
    ],
  },
  {
    id: 'midinero',
    name: 'Midinero',
    type: 'fintech',
    teaPct: null,
    currency: 'UYU',
    maxAmount: 250000,
    maxTermMonths: 36,
    requirements: [
      '21–85 años',
      'Cédula vigente',
      'Cobrar sueldo o BPS por Midinero ≥6 meses',
      'Ingreso mensual mínimo $5.000',
    ],
    online: true,
    website: 'https://www.midinero.com.uy',
    source: 'https://www.midinero.com.uy/prestamos/',
    note: "Préstamo 'MidineroYa' exclusivo para quienes cobran su sueldo/BPS por Midinero. TEA no divulgada; seguro de vida 0,25% mensual. Findarin S.A. / red RedPagos. Hasta $250.000 / 36 cuotas",
    rating: 4.8,
    reviewsNote:
      'App Store 4,8/5 (18K) pero reseñas recientes reportan comisiones ocultas y restricciones en retiros',
    reviewSources: [
      {
        label: 'App Store — Midinero (4,8/5, 18K)',
        url: 'https://apps.apple.com/uy/app/midinero-app/id1263494371',
      },
      {
        label: 'Google Play — Midinero',
        url: 'https://play.google.com/store/apps/details?id=com.midinero.mobile.myapp',
      },
    ],
  },
  {
    id: 'cash',
    name: 'Cash',
    type: 'fintech',
    teaPct: 63.9,
    currency: 'UYU',
    maxAmount: 500000,
    maxTermMonths: 48,
    requirements: [
      'Relación de dependencia o jubilado',
      'Mayor de 21 años',
      'Ingreso líquido mínimo $10.000',
      'Antigüedad laboral mínima 4 meses',
      'Aprobación crediticia',
    ],
    online: true,
    website: 'https://prestamocash.com.uy',
    source: 'https://prestamocash.com.uy/prestamo',
    note: 'TEA publicada por tramos: 63,9% (≤366 días, ≥10.000 UI) hasta 128,9% (>366 días, <10.000 UI). Solicitud web, retiro presencial (Abitab/RedPagos/sucursales). Concesión hasta 40 UI; seguro 0,6% mensual. 115.000+ socios',
    rating: null,
    reviewsNote:
      "Muy referenciada como 'confiable' en comparadores; sin rating agregado verificable de terceros",
    reviewSources: [
      {
        label: 'Cash — opiniones (sitio oficial)',
        url: 'https://prestamocash.com.uy/pagina/opiniones-sobre-cash',
      },
      { label: 'CalcuLatam — préstamos UY', url: 'https://calculatam.com/uy/prestamos' },
    ],
  },
  {
    id: 'pago-despues',
    name: 'Pago Después (ex-UinUin)',
    type: 'fintech',
    teaPct: null,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: 32,
    requirements: [
      'Aprobación crediticia interna (Floder S.A., supervisada por BCU)',
      'Cuenta bancaria propia',
      'La línea crece con el historial de uso',
    ],
    online: true,
    website: 'https://www.pagodespues.com.uy',
    source: 'https://www.pagodespues.com.uy/legales',
    note: 'Ex-UinUin; compras en cuotas sin tarjeta + préstamos en efectivo. TEA 0%–127% según perfil (0% en órdenes promocionales). 3–32 cuotas; ejemplo App Store $16.000 en 12 cuotas. uinuin.com.uy redirige a pagodespues.com.uy',
    rating: 4.8,
    reviewsNote:
      'App Store 4,8/5 (~4.000): útil y completa; minoría critica el recargo para los plazos largos',
    reviewSources: [
      {
        label: 'App Store — Pago Después (4,8/5)',
        url: 'https://apps.apple.com/uy/app/pago-despu%C3%A9s/id6450367871',
      },
      {
        label: 'Trámites y Consultas — UinUin/Pago Después',
        url: 'https://tramitesyconsultas.org/prestamos-uin-uin-prestamos-100-online/',
      },
    ],
  },
  {
    id: 'payflex',
    name: 'PayFlex (adelanto de sueldo)',
    type: 'fintech',
    teaPct: 0,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: null,
    requirements: [
      'El empleador debe estar registrado en PayFlex',
      'Acceso por app, sin aprobación crediticia individual',
      'Disponible 24/7',
    ],
    online: true,
    website: 'https://payflexapp.com',
    source:
      'https://www.forbesuruguay.com/innovacion/payflex-como-funciona-startup-permite-adelantar-sueldos-uruguay-esta-proxima-cerrar-ronda-us-15-millones-n86456',
    note: "No es préstamo tradicional: 'adelanto de sueldo' (earned wage access) sobre salario ya ganado, sin interés ni comisión para el trabajador (teaPct 0 informativo). Fundada 2023–2024, regulada por BCU, 15.000+ colaboradores en 35+ empresas",
    rating: 4.3,
    reviewsNote:
      'Pocas reseñas pero entusiastas (App Store 4,3/5, muestra baja): resuelve llegar a fin de mes sin endeudarse',
    reviewSources: [
      {
        label: 'App Store — PayFlex (4,3/5)',
        url: 'https://apps.apple.com/uy/app/payflex/id6651822569',
      },
      {
        label: 'El Observador — PayFlex',
        url: 'https://www.elobservador.com.uy/cafe-y-negocios/la-fintech-uruguaya-que-facilita-adelantos-sueldos-capta-inversion-y-se-expande-argentina-asi-funciona-n6034989',
      },
    ],
  },
]

export function getLender(id: string): Lender | undefined {
  return LENDERS.find(l => l.id === id)
}

/** A TEA cell: `X,X %` for published rates, `Consultar` when quote-only. */
export function teaLabel(n: number | null): string {
  return n == null ? 'Consultar' : `${n.toLocaleString('es-UY', { maximumFractionDigits: 1 })} %`
}

/** Lenders grouped by type in {@link LENDER_TYPES} order. */
export function lendersByType(): Array<{ type: LenderType; label: string; items: Lender[] }> {
  return (Object.keys(LENDER_TYPES) as LenderType[]).map(type => ({
    type,
    label: LENDER_TYPES[type],
    items: LENDERS.filter(l => l.type === type),
  }))
}

/** Every lender id (for the scraper / sitemap if needed). */
export function lenderIds(): string[] {
  return LENDERS.map(l => l.id)
}

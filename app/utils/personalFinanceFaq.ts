// Central FAQ for the recurring money questions found in the Uruguay Reddit corpus.
//
// Reddit is used only to discover wording and missing topics. Answers come from official
// statistics, current rules, official procedures, or an explicitly labelled practical criterion.
// The catalogue is pure data so the page, search, schema and tests share one source of truth.

export const PERSONAL_FAQ_LAST_REVIEWED = '2026-07-27'

export type FaqCategory =
  | 'fundamentos'
  | 'dolar-cambio'
  | 'ahorro-inversion'
  | 'alquiler-vivienda'
  | 'deuda-clearing'
  | 'credito-prestamo'
  | 'tarjetas'
  | 'bancos-fintech'
  | 'derechos-reclamos'
  | 'impuestos'
  | 'sueldo-trabajo'
  | 'precios-inflacion'
  | 'emprender-empresa'
  | 'jubilacion-afap'
  | 'cripto'

export type FaqBasis = 'norma' | 'procedimiento' | 'dato-oficial' | 'criterio' | 'zona-gris'
export type HowCommon = 'muy_comun' | 'comun' | 'ocasional'

export interface PersonalFaqSource {
  label: string
  authority: string
  url: string
  kind: 'norma' | 'fuente-oficial' | 'estadistica'
}

export interface PersonalFaqRelated {
  label: string
  to: string
}

export interface PersonalFaq {
  id: string
  question: string
  shortAnswer: string
  answer: string
  category: FaqCategory
  sourceIds: readonly string[]
  basis: FaqBasis
  tags: readonly string[]
  howCommon?: HowCommon
  related?: readonly PersonalFaqRelated[]
}

export const FAQ_CATEGORIES: ReadonlyArray<{
  id: FaqCategory
  label: string
  description: string
  icon: string
}> = Object.freeze([
  {
    id: 'fundamentos',
    label: 'Organización personal',
    description: 'Presupuesto, fondo de emergencia, convivencia y prioridades.',
    icon: 'mdi-compass-outline',
  },
  {
    id: 'dolar-cambio',
    label: 'Dólar y cambio',
    description: 'Compra, venta, cotización, spread y moneda de ahorro.',
    icon: 'mdi-currency-usd',
  },
  {
    id: 'ahorro-inversion',
    label: 'Ahorro e inversión',
    description: 'Riesgo, intermediarios, depósitos, UI, valores e impuestos.',
    icon: 'mdi-chart-line',
  },
  {
    id: 'alquiler-vivienda',
    label: 'Alquiler y vivienda',
    description: 'Garantías, contrato, depósito, inventario y costo de vivir solo.',
    icon: 'mdi-home-city-outline',
  },
  {
    id: 'deuda-clearing',
    label: 'Deudas y clearing',
    description: 'Clearing, Central de Riesgos, negociación, datos y reclamos.',
    icon: 'mdi-account-alert-outline',
  },
  {
    id: 'credito-prestamo',
    label: 'Créditos y préstamos',
    description: 'TEA, costo total, cuotas, garantías y entidades habilitadas.',
    icon: 'mdi-hand-coin-outline',
  },
  {
    id: 'tarjetas',
    label: 'Tarjetas y pagos',
    description: 'Crédito, débito, pago mínimo, cuotas y operaciones desconocidas.',
    icon: 'mdi-credit-card-outline',
  },
  {
    id: 'bancos-fintech',
    label: 'Bancos y fintech',
    description: 'Cuentas, dinero electrónico, garantía de depósitos y reclamos.',
    icon: 'mdi-bank-outline',
  },
  {
    id: 'derechos-reclamos',
    label: 'Derechos y reclamos',
    description: 'Consumo, servicios incumplidos, cobranzas y orientación jurídica o laboral.',
    icon: 'mdi-scale-balance',
  },
  {
    id: 'impuestos',
    label: 'Impuestos',
    description: 'IRPF, declaraciones, independientes, alquileres e inversiones.',
    icon: 'mdi-percent-outline',
  },
  {
    id: 'sueldo-trabajo',
    label: 'Sueldo y trabajo',
    description: 'Nominal, líquido, salario mínimo, aguinaldo, licencia y recibos.',
    icon: 'mdi-cash-multiple',
  },
  {
    id: 'precios-inflacion',
    label: 'Precios e inflación',
    description: 'IPC, inflación personal, UI y comparación del poder de compra.',
    icon: 'mdi-basket-outline',
  },
  {
    id: 'emprender-empresa',
    label: 'Emprender y empresa',
    description: 'Monotributo, unipersonal, SAS, facturación y servicios al exterior.',
    icon: 'mdi-briefcase-outline',
  },
  {
    id: 'jubilacion-afap',
    label: 'Jubilación y AFAP',
    description: 'Historia laboral, simuladores, elección, traspaso y retiro.',
    icon: 'mdi-account-clock-outline',
  },
  {
    id: 'cripto',
    label: 'Criptoactivos',
    description: 'Marco BCU 2026, proveedores, riesgos, custodia e impuestos.',
    icon: 'mdi-bitcoin',
  },
])

/** Kept as a record for callers that only need the icon. */
export const FAQ_CATEGORY_ICONS = Object.freeze(
  Object.fromEntries(FAQ_CATEGORIES.map(category => [category.id, category.icon]))
) as Readonly<Record<FaqCategory, string>>

export const PERSONAL_FAQ_SOURCES: Readonly<Record<string, PersonalFaqSource>> = Object.freeze({
  'bcu-presupuesto': {
    label: 'Presupuesto familiar y fondo para emergencias',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/creditos-y-prestamos/presupuesto-familiar/',
    kind: 'fuente-oficial',
  },
  'bcu-cotizaciones': {
    label: 'Cotizaciones interbancarias y arbitrajes',
    authority: 'Banco Central del Uruguay',
    url: 'https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Cotizaciones.aspx',
    kind: 'estadistica',
  },
  'bcu-registros': {
    label: 'Registro de instituciones financieras',
    authority: 'Banco Central del Uruguay',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Registro-de-Instituciones-Financieras.aspx',
    kind: 'fuente-oficial',
  },
  'bcu-mercado-valores': {
    label: 'Mercado de valores, intermediarios y riesgos',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/mercado-de-valores/',
    kind: 'fuente-oficial',
  },
  'bcu-advertencias-inversion': {
    label: 'Recomendaciones y advertencias al invertir',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/mercado-de-valores/recomendaciones-y-advertencias/',
    kind: 'fuente-oficial',
  },
  'bcu-informacion-credito': {
    label: 'Información obligatoria sobre tasas, cargos y crédito',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/tasas/informacion-obligatoria/',
    kind: 'fuente-oficial',
  },
  'bcu-usura': {
    label: 'Topes de tasas de interés y usura',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/tasas/topes-de-tasas-de-interes-y-usura/',
    kind: 'fuente-oficial',
  },
  'bcu-central-riesgos': {
    label: 'Central de Riesgos Crediticios: contenido, actualización y reclamos',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/creditos-y-prestamos/el-contrato/',
    kind: 'fuente-oficial',
  },
  'ley-clearing': {
    label: 'Ley 18.331, art. 22: datos comerciales y crediticios',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008/22',
    kind: 'norma',
  },
  'mef-consumidor-financiero': {
    label: 'Preguntas frecuentes sobre crédito, tarjetas, deudas y clearing',
    authority: 'Unidad Defensa del Consumidor / MEF',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/preguntas-frecuentes-unidad-defensa-del-consumidor',
    kind: 'fuente-oficial',
  },
  'ley-consumo-15': {
    label: 'Ley 17.250, art. 15: información previa en ofertas de crédito',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/15',
    kind: 'norma',
  },
  'bcu-medios-pago': {
    label: 'Tipos de medios de pago, tarjetas y dinero electrónico',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/medios-de-pago/tipos-de-medios-de-pago/',
    kind: 'fuente-oficial',
  },
  'bcu-seguridad-pagos': {
    label: 'Advertencias de seguridad para cuentas y tarjetas',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/medios-de-pago/advertencias-de-uso-de-instrumentos-de-pago/',
    kind: 'fuente-oficial',
  },
  'bcu-reclamos': {
    label: 'Reclamo ante la institución y denuncia ante el BCU',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
    kind: 'fuente-oficial',
  },
  'ley-consumo-6': {
    label: 'Ley 17.250, art. 6: derechos básicos del consumidor',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/6',
    kind: 'norma',
  },
  'ley-consumo-33': {
    label: 'Ley 17.250, art. 33: opciones ante el incumplimiento del proveedor',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/33',
    kind: 'norma',
  },
  'mef-reclamo-consumo': {
    label: 'Consulta, reclamo y denuncia ante Defensa del Consumidor',
    authority: 'Ministerio de Economía y Finanzas',
    url: 'https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor',
    kind: 'fuente-oficial',
  },
  'bcu-deudor-derechos': {
    label: 'Derechos y obligaciones de quien toma un crédito',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/creditos-y-prestamos/derechos-y-obligaciones/',
    kind: 'fuente-oficial',
  },
  'ley-concurso-2': {
    label: 'Ley 18.387, art. 2: personas comprendidas en el proceso concursal',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/18387-2008/2',
    kind: 'norma',
  },
  'pj-asesoramiento-juridico': {
    label: 'Asesoramiento jurídico y acceso a defensor público',
    authority: 'Poder Judicial',
    url: 'https://www.poderjudicial.gub.uy/node/999991663',
    kind: 'fuente-oficial',
  },
  'pj-defensorias': {
    label: 'Directorio nacional de Defensorías Públicas',
    authority: 'Poder Judicial',
    url: 'https://www.poderjudicial.gub.uy/institucional/defensorias-publicas',
    kind: 'fuente-oficial',
  },
  'mtss-consulta-laboral': {
    label: 'Consulta laboral y salarial gratuita',
    authority: 'Ministerio de Trabajo y Seguridad Social',
    url: 'https://www.gub.uy/tramites/consulta-laboral-salarial?min=true',
    kind: 'fuente-oficial',
  },
  'mef-minimo-debito': {
    label: 'Prohibición de mínimos para pagos con débito',
    authority: 'Ministerio de Economía y Finanzas',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/comercios-no-podran-establecer-minimos-para-pagos-con-debito',
    kind: 'fuente-oficial',
  },
  'copab-cobertura': {
    label: 'Montos cubiertos por la garantía de depósitos',
    authority: 'Corporación de Protección del Ahorro Bancario',
    url: 'https://www.copab.org.uy/innovaportal/v/76/1/web/hasta-que-monto-estan-cubiertos-los-depositos.html',
    kind: 'fuente-oficial',
  },
  'bcu-depositos': {
    label: 'Tipos de depósitos y condiciones de cuentas básicas',
    authority: 'Banco Central del Uruguay',
    url: 'https://usuariofinanciero.bcu.gub.uy/depositos/tipos-de-depositos/',
    kind: 'fuente-oficial',
  },
  'dgi-irpf-dependientes': {
    label: 'IRPF para trabajadores dependientes',
    authority: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-para-trabajadores-dependientes',
    kind: 'fuente-oficial',
  },
  'dgi-irpf-obligados': {
    label: 'Quiénes deben presentar declaración jurada de IRPF',
    authority: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/estan-obligados-presentar-declaracion-irpf',
    kind: 'fuente-oficial',
  },
  'dgi-irpf-independientes': {
    label: 'IRPF para trabajadores independientes',
    authority: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-para-trabajadores-independientes',
    kind: 'fuente-oficial',
  },
  'dgi-iva-servicios': {
    label: 'IVA Servicios Personales y exportación de servicios',
    authority: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/iva-servicios-personales',
    kind: 'fuente-oficial',
  },
  'dgi-capital': {
    label: 'IRPF sobre rendimientos de capital mobiliario',
    authority: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario',
    kind: 'fuente-oficial',
  },
  'decreto-95-026': {
    label: 'Decreto 95/026: rentas e incrementos patrimoniales del exterior',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/95-2026',
    kind: 'norma',
  },
  'dgi-bpc': {
    label: 'Base de Prestaciones y Contribuciones vigente',
    authority: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/base-prestaciones-contribuciones-bpc',
    kind: 'fuente-oficial',
  },
  'dgi-monotributo': {
    label: 'Topes de ingresos y activos del Monotributo',
    authority: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tope-ingresos-activos-anuales-monotributo',
    kind: 'fuente-oficial',
  },
  'bps-monotributo': {
    label: 'Aportación y cobertura del Monotributo',
    authority: 'Banco de Previsión Social',
    url: 'https://www.bps.gub.uy/10444/aportacion-de-monotributo.html',
    kind: 'fuente-oficial',
  },
  'dgi-efactura': {
    label: 'Quiénes deben emitir factura electrónica',
    authority: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/guia-ingreso-facturacion-electronica',
    kind: 'fuente-oficial',
  },
  'gub-unipersonal': {
    label: 'Inscripción de empresa unipersonal ante BPS y DGI',
    authority: 'gub.uy / DGI / BPS',
    url: 'https://www.gub.uy/tramites/inscripcion-empresa-unipersonal',
    kind: 'fuente-oficial',
  },
  'gub-sas': {
    label: 'Registro digital de una sociedad por acciones simplificada',
    authority: 'gub.uy / Dirección General de Registros',
    url: 'https://www.gub.uy/tramites/registro-sociedad-acciones-simplificada-sas-persona-fisica',
    kind: 'fuente-oficial',
  },
  'mtss-smn': {
    label: 'Salario Mínimo Nacional 2026',
    authority: 'Ministerio de Trabajo y Seguridad Social',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/comunicacion/noticias/salario-minimo-nacional-24572-desde-1o-enero-2026',
    kind: 'fuente-oficial',
  },
  'mtss-aguinaldo': {
    label: 'Sueldo anual complementario o aguinaldo',
    authority: 'Ministerio de Trabajo y Seguridad Social',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/sueldo-anual-complementario-aguinaldo',
    kind: 'fuente-oficial',
  },
  'mtss-licencia': {
    label: 'Preguntas laborales sobre licencia y salario vacacional',
    authority: 'Ministerio de Trabajo y Seguridad Social',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/preguntas-frecuentes/materia-laboral',
    kind: 'fuente-oficial',
  },
  'mtss-salarios': {
    label: 'Salarios, recibos, plazos y retenciones',
    authority: 'Ministerio de Trabajo y Seguridad Social',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/salarios',
    kind: 'fuente-oficial',
  },
  'ine-ipc': {
    label: 'IPC y calculadora de inflación por canasta',
    authority: 'Instituto Nacional de Estadística',
    url: 'https://www7.ine.gub.uy/Dashboard-IPC/',
    kind: 'estadistica',
  },
  'ine-ui': {
    label: 'Metodología de cálculo de la Unidad Indexada',
    authority: 'Instituto Nacional de Estadística',
    url: 'https://www5.ine.gub.uy/documents/Estad%C3%ADsticasecon%C3%B3micas/PDF/UI/Metodolog%C3%ADa%20de%20C%C3%A1lculo%20de%20la%20UI.pdf',
    kind: 'estadistica',
  },
  'anv-garantia': {
    label: 'Fondo de Garantía de Alquiler',
    authority: 'Agencia Nacional de Vivienda',
    url: 'https://www.anv.gub.uy/solicitud-fondo-de-garantia-de-alquiler',
    kind: 'fuente-oficial',
  },
  'cgn-contrato': {
    label: 'Contrato de arrendamiento con garantía CGN',
    authority: 'Contaduría General de la Nación / gub.uy',
    url: 'https://www.gub.uy/tramites/contratos-iniciales-arrendamiento-ratificacion-servicio-garantia-alquileres',
    kind: 'fuente-oficial',
  },
  'ley-alquiler-sin-garantia': {
    label: 'Ley 19.889, régimen de arrendamiento sin garantía',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
    kind: 'norma',
  },
  'bhu-deposito': {
    label: 'Depósito en garantía de alquiler',
    authority: 'Banco Hipotecario del Uruguay',
    url: 'https://www.bhu.com.uy/ahorro/garantia-de-alquiler',
    kind: 'fuente-oficial',
  },
  'bps-trabajadores': {
    label: 'Vida laboral, aportes y servicios para trabajadores',
    authority: 'Banco de Previsión Social',
    url: 'https://www.bps.gub.uy/10274/trabajadores.html',
    kind: 'fuente-oficial',
  },
  'bps-simuladores': {
    label: 'Simuladores de régimen y jubilación estimada',
    authority: 'Banco de Previsión Social',
    url: 'https://www.bps.gub.uy/8755/simuladores.html',
    kind: 'fuente-oficial',
  },
  'bps-cambio-afap': {
    label: 'Requisitos para cambiar de AFAP',
    authority: 'Banco de Previsión Social',
    url: 'https://www.bps.gub.uy/20812/me-puedo-cambiar-de-afap.html',
    kind: 'fuente-oficial',
  },
  'bcu-afap-series': {
    label: 'Comisiones, rentabilidad y traspasos por AFAP',
    authority: 'Banco Central del Uruguay',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Series-Estad%C3%ADsticas.aspx',
    kind: 'estadistica',
  },
  'ley-activos-virtuales': {
    label: 'Ley 20.345: regulación de activos virtuales',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/20345-2024',
    kind: 'norma',
  },
  'bcu-psav-2026': {
    label: 'Marco 2026 para proveedores de servicios de activos virtuales',
    authority: 'Banco Central del Uruguay',
    url: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=527&title=El-BCU-aprueba-normativa-para-proveedores-de-servicios-de-activos-virtuales',
    kind: 'fuente-oficial',
  },
  'bcu-cripto-riesgos': {
    label: 'Curso legal y riesgos propios de los activos virtuales',
    authority: 'Banco Central del Uruguay',
    url: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=72&title=Comunicado-del-BCU-sobre-activos-virtuales',
    kind: 'fuente-oficial',
  },
})

const faq = (entry: PersonalFaq): PersonalFaq => Object.freeze(entry)

export const PERSONAL_FAQS: readonly PersonalFaq[] = Object.freeze([
  // ── Organización personal ──────────────────────────────────────────────────
  faq({
    id: 'cuanto-necesito-para-vivir-solo',
    question: '¿Cuánto necesito para vivir solo en Uruguay?',
    shortAnswer:
      'No existe un sueldo universal: hay que presupuestar alquiler, servicios, comida, transporte y margen.',
    answer:
      'El Salario Mínimo Nacional no es una estimación del costo de vivir solo y el IPC representa una canasta promedio, no tu hogar. Armá el cálculo con precios actuales de tu barrio y sumá gastos de entrada, gastos mensuales y un margen para imprevistos; la calculadora del sitio permite cambiar hogar, vivienda y hábitos sin publicar una cifra engañosamente única.',
    category: 'fundamentos',
    sourceIds: ['mtss-smn', 'ine-ipc'],
    basis: 'criterio',
    tags: ['vivir solo', 'independizarse', 'costo de vida', 'sueldo', 'Montevideo'],
    howCommon: 'muy_comun',
    related: [{ label: 'Calcular mi costo de vida', to: '/herramientas/costo-de-vida' }],
  }),
  faq({
    id: 'como-armar-presupuesto',
    question: '¿Cómo armo un presupuesto si nunca registré mis gastos?',
    shortAnswer:
      'Separá ingresos, gastos fijos, gastos variables, deudas y ahorro; después compará el plan con lo efectivamente pagado.',
    answer:
      'Empezá con un mes real de movimientos y no con porcentajes ideales. El BCU presenta el presupuesto como una herramienta para planificar, reservar ahorro y crear un fondo para emergencias; una vez visible el saldo, ajustá primero los gastos que sí podés cambiar.',
    category: 'fundamentos',
    sourceIds: ['bcu-presupuesto'],
    basis: 'criterio',
    tags: ['presupuesto', 'gastos', 'ingresos', 'organización'],
    howCommon: 'muy_comun',
    related: [{ label: 'Revisar mi salud financiera', to: '/salud-financiera' }],
  }),
  faq({
    id: 'fondo-emergencia-cuanto',
    question: '¿Cuánto debería tener en un fondo de emergencia?',
    shortAnswer:
      'No hay un número oficial: cubrí primero los gastos esenciales que no podrías postergar.',
    answer:
      'El BCU recomienda contemplar un fondo para emergencias dentro del presupuesto, pero no fija una cantidad obligatoria de meses. Definilo según estabilidad laboral, personas a cargo, cobertura de salud y tiempo probable para reemplazar el ingreso; debe estar disponible y no expuesto a una pérdida que te obligue a vender en mal momento.',
    category: 'fundamentos',
    sourceIds: ['bcu-presupuesto', 'bcu-depositos'],
    basis: 'criterio',
    tags: ['fondo de emergencia', 'ahorro', 'desempleo', 'liquidez'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'ahorrar-o-pagar-deuda',
    question: '¿Conviene ahorrar o pagar primero las deudas?',
    shortAnswer:
      'Mantené un colchón básico y compará el costo total de la deuda con el rendimiento neto y seguro del ahorro.',
    answer:
      'No alcanza con comparar una tasa publicitada: en el crédito cuentan intereses, comisiones, seguros y demás cargos, mientras el ahorro puede pagar impuestos y asumir riesgo. Si una deuda cara sigue creciendo, amortizarla suele mejorar el flujo; no quedes en cero si eso te obligaría a endeudarte otra vez ante el primer imprevisto.',
    category: 'fundamentos',
    sourceIds: ['bcu-informacion-credito', 'bcu-presupuesto'],
    basis: 'criterio',
    tags: ['ahorro', 'deuda', 'prioridades', 'fondo de emergencia'],
    howCommon: 'muy_comun',
    related: [{ label: 'Ordenar y negociar deudas', to: '/saldar-deudas-uruguay' }],
  }),
  faq({
    id: 'finanzas-en-pareja',
    question: '¿Cómo organizamos las finanzas en pareja sin mezclar todo?',
    shortAnswer:
      'Acuerden gastos comunes, aportes, ahorro y deudas; lo importante es que ambos vean el mismo presupuesto.',
    answer:
      'No existe una fórmula legal ni un porcentaje universal. Pueden mantener cuentas personales y una cuenta o registro común, pero deben acordar por escrito qué gasto pertenece al hogar, cuánto aporta cada uno y quién responde por cada deuda; revisen el presupuesto cuando cambien ingresos o convivencia.',
    category: 'fundamentos',
    sourceIds: ['bcu-presupuesto'],
    basis: 'criterio',
    tags: ['pareja', 'convivencia', 'presupuesto', 'cuentas'],
  }),

  // ── Dólar y cambio ─────────────────────────────────────────────────────────
  faq({
    id: 'dolar-compra-venta',
    question: '¿Qué significan dólar compra y dólar venta?',
    shortAnswer:
      'La casa compra tus dólares al precio “compra” y te vende dólares al precio “venta”.',
    answer:
      'Si entregás dólares y recibís pesos, mirá la cotización compra. Si entregás pesos para recibir dólares, mirá la venta. La diferencia es el spread; para comparar lugares calculá cuántos pesos entregás o recibís al final, incluyendo cualquier comisión.',
    category: 'dolar-cambio',
    sourceIds: ['bcu-cotizaciones'],
    basis: 'dato-oficial',
    tags: ['dólar compra', 'dólar venta', 'spread', 'cotización'],
    howCommon: 'muy_comun',
    related: [{ label: 'Ver dólar hoy', to: '/dolar-hoy' }],
  }),
  faq({
    id: 'cotizacion-bcu-no-es-ventanilla',
    question: '¿La cotización del BCU es la que deben cobrar bancos y cambios?',
    shortAnswer:
      'No: es una referencia interbancaria; cada entidad publica su propia compra y venta al público.',
    answer:
      'El BCU publica cotizaciones interbancarias y arbitrajes estadísticos. Eso no obliga a una casa de cambio a operar al mismo precio de ventanilla; compará entidades registradas y el monto final de la operación.',
    category: 'dolar-cambio',
    sourceIds: ['bcu-cotizaciones', 'bcu-registros'],
    basis: 'dato-oficial',
    tags: ['BCU', 'interbancario', 'pizarra', 'casa de cambio'],
    howCommon: 'muy_comun',
    related: [{ label: 'Comparar casas de cambio', to: '/mejor-casa-de-cambio' }],
  }),
  faq({
    id: 'donde-cambiar-dolares',
    question: '¿Dónde conviene cambiar dólares?',
    shortAnswer:
      'En una entidad habilitada que dé el mejor monto final para tu operación y ubicación.',
    answer:
      'No existe una casa que gane siempre: las pizarras cambian, los precios pueden mejorar por monto y el traslado también cuesta. Verificá que la entidad figure en los registros del BCU y compará compra o venta según lo que realmente vas a hacer.',
    category: 'dolar-cambio',
    sourceIds: ['bcu-registros', 'bcu-cotizaciones'],
    basis: 'criterio',
    tags: ['casa de cambio', 'banco', 'mejor cambio', 'habilitada'],
    howCommon: 'muy_comun',
    related: [
      { label: 'Mejor casa de cambio ahora', to: '/mejor-casa-de-cambio' },
      { label: 'Casas cerca de mí', to: '/casa-de-cambio-cerca-de-mi' },
    ],
  }),
  faq({
    id: 'ahorrar-pesos-ui-dolares',
    question: '¿Conviene ahorrar en pesos, UI o dólares?',
    shortAnswer:
      'Elegí la moneda de la meta y compará plazo, liquidez, rendimiento neto y riesgo cambiario.',
    answer:
      'La UI se ajusta con la evolución del IPC, mientras el dólar puede subir o bajar frente al peso y no replica automáticamente el costo de vida. Si el gasto futuro está fijado en una moneda, ahorrar al menos parte en esa moneda reduce el descalce; para el resto, compará rendimiento después de impuestos y disponibilidad.',
    category: 'dolar-cambio',
    sourceIds: ['ine-ui', 'bcu-cotizaciones', 'dgi-capital'],
    basis: 'criterio',
    tags: ['pesos', 'UI', 'dólares', 'ahorro', 'moneda'],
    howCommon: 'muy_comun',
    related: [{ label: 'Convertir UI y pesos', to: '/herramientas/conversor-unidad-indexada' }],
  }),
  faq({
    id: 'cuando-comprar-dolares',
    question: '¿Es buen momento para comprar dólares?',
    shortAnswer:
      'Nadie puede asegurar el próximo movimiento; decidí por plazo y necesidad, no por una predicción puntual.',
    answer:
      'La cotización observada confirma el precio pasado o actual, no el futuro. Si necesitás dólares en una fecha conocida, comprar en etapas reduce el riesgo de elegir un único día; si buscás invertir, evaluá también rendimiento, impuestos y riesgo del instrumento, no solo la moneda.',
    category: 'dolar-cambio',
    sourceIds: ['bcu-cotizaciones', 'bcu-mercado-valores'],
    basis: 'criterio',
    tags: ['comprar dólares', 'predicción', 'tipo de cambio', 'dolarizar'],
    howCommon: 'muy_comun',
    related: [{ label: 'Entender por qué sube o baja', to: '/por-que-sube-el-dolar' }],
  }),

  // ── Ahorro e inversión ─────────────────────────────────────────────────────
  faq({
    id: 'como-empezar-invertir',
    question: '¿Cómo empiezo a invertir si nunca lo hice?',
    shortAnswer:
      'Definí objetivo, plazo, liquidez y pérdida tolerable antes de elegir un producto.',
    answer:
      'El BCU exige que los intermediarios informen características, riesgos y costos, pero registrar un valor no garantiza su rendimiento. Conservá un fondo disponible, entendé cuándo podés retirar y compará el retorno neto de comisiones e impuestos.',
    category: 'ahorro-inversion',
    sourceIds: ['bcu-mercado-valores', 'bcu-presupuesto'],
    basis: 'criterio',
    tags: ['empezar a invertir', 'riesgo', 'plazo', 'liquidez'],
    howCommon: 'muy_comun',
    related: [{ label: 'Comparar formas de invertir', to: '/inversiones-uruguay' }],
  }),
  faq({
    id: 'invertir-poca-plata',
    question: '¿Se puede invertir con poca plata?',
    shortAnswer:
      'Sí, si el mínimo y las comisiones no consumen el rendimiento; primero resolvé liquidez y deudas caras.',
    answer:
      'El monto mínimo depende del producto y del intermediario. Pedí por escrito mínimos, comisión de compra, custodia, retiro y cambio de moneda; una inversión pequeña con cargos fijos altos puede rendir menos que una alternativa simple o incluso quedar negativa.',
    category: 'ahorro-inversion',
    sourceIds: ['bcu-mercado-valores', 'bcu-informacion-credito'],
    basis: 'criterio',
    tags: ['poca plata', 'mínimo', 'comisiones', 'inversión'],
    howCommon: 'muy_comun',
    related: [{ label: 'Ver opciones y mínimos', to: '/inversiones-uruguay' }],
  }),
  faq({
    id: 'verificar-intermediario-inversion',
    question: '¿Cómo sé si un broker o asesor está habilitado en Uruguay?',
    shortAnswer:
      'Buscalo en los registros del BCU y verificá la razón social exacta, no solo la marca o la app.',
    answer:
      'El BCU autoriza y registra intermediarios, asesores y gestores bajo categorías distintas. Estar registrado no elimina el riesgo de la inversión ni significa que el BCU recomiende el producto; si opera desde el exterior, verificá también la autoridad del país correspondiente.',
    category: 'ahorro-inversion',
    sourceIds: ['bcu-mercado-valores', 'bcu-registros'],
    basis: 'procedimiento',
    tags: ['broker', 'corredor', 'asesor', 'BCU', 'regulado'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'garantia-depositos-copab',
    question: '¿Un plazo fijo o saldo bancario está garantizado?',
    shortAnswer:
      'Los depósitos cubiertos tienen topes por persona, institución y moneda; no toda inversión es un depósito.',
    answer:
      'COPAB informa una cobertura de hasta UI 250.000 para el total en moneda nacional y hasta US$ 10.000 para el total en moneda extranjera, por persona y por institución, incluyendo capital e intereses al balance de liquidación. Acciones, bonos, fondos, criptoactivos y saldos fuera de las instituciones cubiertas no se convierten por eso en depósitos garantizados.',
    category: 'ahorro-inversion',
    sourceIds: ['copab-cobertura', 'bcu-depositos'],
    basis: 'dato-oficial',
    tags: ['COPAB', 'garantía', 'plazo fijo', 'depósito', 'banco'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'plazo-fijo-comparar',
    question: '¿Qué tengo que comparar en un plazo fijo?',
    shortAnswer:
      'Moneda, TEA, plazo, mínimo, cancelación, impuesto y cobertura; no solo la tasa grande del aviso.',
    answer:
      'La entidad debe informar TEA, modalidad, plazo e importe mínimo. Calculá cuánto cobrás efectivamente al vencimiento y qué pasa si necesitás el dinero antes; los intereses tienen distinto tratamiento de IRPF según moneda y plazo.',
    category: 'ahorro-inversion',
    sourceIds: ['bcu-informacion-credito', 'dgi-capital', 'copab-cobertura'],
    basis: 'procedimiento',
    tags: ['plazo fijo', 'TEA', 'IRPF', 'depósito'],
    related: [{ label: 'Comparar inversiones', to: '/inversiones-uruguay' }],
  }),
  faq({
    id: 'bonos-letras-uruguay',
    question: '¿Los bonos o letras del Estado no tienen riesgo?',
    shortAnswer:
      'Tienen riesgo de precio, plazo y moneda aunque la deuda pública uruguaya tenga tratamiento fiscal propio.',
    answer:
      'Un título puede cotizar por debajo de lo pagado si lo vendés antes del vencimiento, y una obligación en UI, pesos o dólares no protege igual cada meta. El BCU explica que registrar un instrumento no asegura su desempeño; el sitio separa rendimiento, duración, moneda e impuesto para evitar llamar “sin riesgo” a todo valor público.',
    category: 'ahorro-inversion',
    sourceIds: ['bcu-mercado-valores', 'dgi-capital'],
    basis: 'criterio',
    tags: ['bonos', 'letras', 'deuda pública', 'riesgo', 'UI'],
    related: [{ label: 'Entender instrumentos disponibles', to: '/inversiones-uruguay' }],
  }),
  faq({
    id: 'impuestos-broker-exterior',
    question: '¿Tengo que pagar impuestos por invertir con un broker del exterior?',
    shortAnswer:
      'Puede corresponder IRPF aunque el broker no retenga; desde 2026 también cambiaron reglas sobre incrementos del exterior.',
    answer:
      'DGI incluye rendimientos de capital mobiliario del exterior y, cuando no existe agente de retención local, puede corresponder liquidación y declaración del contribuyente. El Decreto 95/026 reglamentó además rentas por transmisiones patrimoniales de bienes en el exterior; usá el costo documentado y no supongas que retirar o no retirar dinero define por sí solo el impuesto.',
    category: 'ahorro-inversion',
    sourceIds: ['dgi-capital', 'decreto-95-026', 'dgi-irpf-obligados'],
    basis: 'norma',
    tags: ['broker exterior', 'IBKR', 'acciones', 'ETF', 'IRPF', '2026'],
    howCommon: 'muy_comun',
    related: [
      { label: 'Guía de impuestos a inversiones', to: '/impuestos-inversiones-uruguay' },
      {
        label: 'Calcular un escenario',
        to: '/herramientas/calculadora-impuestos-inversiones',
      },
    ],
  }),
  faq({
    id: 'detectar-estafa-inversion',
    question: '¿Cómo detecto una posible estafa de inversión?',
    shortAnswer:
      'Desconfiá de retornos altos “sin riesgo”, presión para entrar y premios por referir personas.',
    answer:
      'El BCU advierte especialmente sobre entidades no inscriptas, promesas de alto retorno con poco riesgo, testimonios de figuras públicas y beneficios por sumar referidos. Verificá razón social y producto en registros oficiales antes de transferir y nunca compartas claves o códigos.',
    category: 'ahorro-inversion',
    sourceIds: ['bcu-advertencias-inversion', 'bcu-seguridad-pagos'],
    basis: 'procedimiento',
    tags: ['estafa', 'inversión', 'pirámide', 'retorno garantizado', 'BCU'],
    howCommon: 'muy_comun',
    related: [{ label: 'Ver alertas y señales de estafa', to: '/estafas-uruguay' }],
  }),

  // ── Alquiler y vivienda ─────────────────────────────────────────────────────
  faq({
    id: 'garantia-alquiler-cual-conviene',
    question: '¿Qué garantía de alquiler me conviene?',
    shortAnswer:
      'Compará elegibilidad, costo total, plazo y aceptación del propietario; no hay una opción mejor para todos.',
    answer:
      'CGN y el Fondo estatal tienen requisitos de ingresos y documentación; los seguros y ANDA aplican sus propias condiciones, y el depósito BHU inmoviliza fondos. La guía de alquiler del sitio compara las modalidades y mantiene una FAQ especializada con contrato, comisiones, rescisión y problemas frecuentes.',
    category: 'alquiler-vivienda',
    sourceIds: ['anv-garantia', 'cgn-contrato', 'bhu-deposito'],
    basis: 'procedimiento',
    tags: ['garantía alquiler', 'CGN', 'ANDA', 'seguro', 'BHU'],
    howCommon: 'muy_comun',
    related: [{ label: 'Comparar garantías y ver 46 respuestas', to: '/alquilar-en-uruguay' }],
  }),
  faq({
    id: 'cgn-costo-garantia',
    question: '¿La garantía de Contaduría es gratis?',
    shortAnswer:
      'El trámite no tiene costo, pero el servicio cobra una comisión mensual sobre el alquiler.',
    answer:
      'El trámite oficial de contrato informa una comisión mensual de 3% del precio del alquiler tanto para inquilino como para propietario. No confundas “trámite sin costo” con “servicio sin comisión” y verificá el Informe de Líquido Disponible antes de reservar una vivienda.',
    category: 'alquiler-vivienda',
    sourceIds: ['cgn-contrato'],
    basis: 'procedimiento',
    tags: ['CGN', 'Contaduría', 'comisión', 'garantía'],
  }),
  faq({
    id: 'alquiler-sin-garantia',
    question: '¿Se puede alquilar legalmente sin garantía?',
    shortAnswer:
      'Sí, existe un régimen especial, pero debe pactarse expresamente y tiene reglas propias.',
    answer:
      'La Ley 19.889 creó el régimen de arrendamiento sin garantía para contratos de vivienda que declaren someterse a él. No significa que todo alquiler verbal o sin depósito quede automáticamente bajo ese régimen; leé sus plazos y causales antes de firmar.',
    category: 'alquiler-vivienda',
    sourceIds: ['ley-alquiler-sin-garantia'],
    basis: 'norma',
    tags: ['sin garantía', 'LUC', 'contrato', 'desalojo'],
    related: [{ label: 'Ver la explicación completa', to: '/alquilar-en-uruguay' }],
  }),
  faq({
    id: 'deposito-alquiler-un-mes',
    question: '¿El depósito de alquiler siempre es de un mes?',
    shortAnswer:
      'No hay una regla general que convierta todo depósito en “un mes”; depende del régimen y del contrato.',
    answer:
      'El depósito en garantía del BHU es una modalidad específica en UI y no debe confundirse con el primer mes, la comisión inmobiliaria o un seguro de fianza. Pedí que el contrato identifique monto, titularidad, causales de afectación y procedimiento de devolución.',
    category: 'alquiler-vivienda',
    sourceIds: ['bhu-deposito'],
    basis: 'procedimiento',
    tags: ['depósito', 'BHU', 'primer mes', 'devolución'],
  }),
  faq({
    id: 'inventario-fotos-alquiler',
    question: '¿Qué conviene revisar antes de firmar y entrar a un alquiler?',
    shortAnswer:
      'Contrato, inventario, estado real, servicios, gastos comunes y quién paga cada concepto.',
    answer:
      'En contratos CGN el inventario integra el contrato y existe un procedimiento para pedir modificaciones. Documentá medidores, humedad, instalaciones, llaves y desperfectos con fecha; una foto no sustituye el contrato, pero ayuda a probar el estado de entrega.',
    category: 'alquiler-vivienda',
    sourceIds: ['cgn-contrato'],
    basis: 'procedimiento',
    tags: ['inventario', 'fotos', 'contrato', 'gastos comunes'],
    howCommon: 'muy_comun',
    related: [{ label: 'Preparar el alquiler paso a paso', to: '/alquilar-en-uruguay' }],
  }),

  // ── Deudas y clearing ───────────────────────────────────────────────────────
  faq({
    id: 'clearing-vs-central-riesgos',
    question: '¿Clearing y Central de Riesgos del BCU son lo mismo?',
    shortAnswer:
      'No: Clearing es una base privada; la Central de Riesgos es administrada por el BCU.',
    answer:
      'La Central de Riesgos recibe información mensual de entidades obligadas sobre créditos, límites y garantías. Clearing recoge información comercial de afiliados y no está supervisado por el BCU; salir de una base no modifica automáticamente la otra.',
    category: 'deuda-clearing',
    sourceIds: ['bcu-central-riesgos', 'ley-clearing'],
    basis: 'norma',
    tags: ['Clearing', 'Central de Riesgos', 'BCU', 'Equifax'],
    howCommon: 'muy_comun',
    related: [{ label: 'Guía para salir del clearing', to: '/salir-del-clearing' }],
  }),
  faq({
    id: 'clearing-cinco-anos',
    question: '¿Una deuda desaparece del Clearing a los cinco años?',
    shortAnswer: 'El dato tiene plazo; la deuda no queda extinguida por salir de la base.',
    answer:
      'La Ley 18.331 permite registrar datos de obligaciones incumplidas de personas físicas por cinco años y, si siguen impagas, una única reinscripción por otros cinco. Que el registro deje de mostrarse no prueba prescripción ni cancelación de la obligación.',
    category: 'deuda-clearing',
    sourceIds: ['ley-clearing', 'mef-consumidor-financiero'],
    basis: 'norma',
    tags: ['cinco años', 'prescripción', 'Clearing', 'reinscripción'],
    howCommon: 'muy_comun',
    related: [{ label: 'Entender plazos y pasos', to: '/salir-del-clearing' }],
  }),
  faq({
    id: 'clearing-despues-pagar',
    question: '¿Cuándo se actualiza el Clearing después de pagar?',
    shortAnswer:
      'El acreedor debe comunicar la cancelación en cinco días hábiles y la base actualizarla dentro de tres días hábiles de recibirla.',
    answer:
      'La obligación cancelada puede permanecer registrada hasta cinco años, pero debe figurar expresamente como cancelada. Guardá recibo y carta de pago; si no se actualiza, reclamá primero al acreedor y luego ejercé tus derechos sobre el dato.',
    category: 'deuda-clearing',
    sourceIds: ['ley-clearing'],
    basis: 'norma',
    tags: ['pagué deuda', 'actualización', 'carta de pago', 'Clearing'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'central-riesgos-despues-pagar',
    question: '¿La Central de Riesgos borra mi historia cuando cancelo?',
    shortAnswer:
      'No borra la historia: deja de informar saldo vigente cuando se publique el mes cancelado.',
    answer:
      'El BCU explica que la Central se actualiza mensualmente y suele publicarse hacia fines del mes siguiente. La deuda cancelada deja de figurar como vigente desde el reporte correspondiente, pero los meses anteriores permanecen como historial crediticio.',
    category: 'deuda-clearing',
    sourceIds: ['bcu-central-riesgos'],
    basis: 'procedimiento',
    tags: ['Central de Riesgos', 'historial', 'cancelación', 'actualización mensual'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'negociar-deuda-documentos',
    question: '¿Qué tengo que pedir al negociar o cancelar una deuda?',
    shortAnswer:
      'Identificación del acreedor, saldo desglosado, condiciones del acuerdo y constancia final de cancelación.',
    answer:
      'No pagues basándote solo en una llamada o mensaje: verificá quién es el acreedor o cesionario y pedí el acuerdo por escrito. Al cancelar, conservá recibos, devolución de documentos firmados cuando corresponda y carta de pago; una quita puede cancelar según el acuerdo sin equivaler a haber pagado el importe original completo.',
    category: 'deuda-clearing',
    sourceIds: ['mef-consumidor-financiero', 'ley-consumo-15'],
    basis: 'procedimiento',
    tags: ['negociar', 'quita', 'recibo', 'carta de pago', 'cesión'],
    howCommon: 'muy_comun',
    related: [{ label: 'Preparar una negociación', to: '/saldar-deudas-uruguay' }],
  }),
  faq({
    id: 'prestamo-usurero',
    question: '¿Cómo sé si un préstamo tiene intereses usurarios?',
    shortAnswer:
      'Se calcula la tasa implícita incluyendo intereses, comisiones, seguros, gastos y otros cargos.',
    answer:
      'No alcanza con mirar la tasa nominal ni sumar cuotas de forma intuitiva. El BCU publica los topes vigentes y explica que el cálculo incorpora el flujo completo de desembolsos y pagos; guardá contrato y comprobantes para reclamar con cifras verificables.',
    category: 'deuda-clearing',
    sourceIds: ['bcu-usura', 'bcu-informacion-credito'],
    basis: 'norma',
    tags: ['usura', 'intereses', 'comisiones', 'préstamo'],
    howCommon: 'muy_comun',
    related: [{ label: 'Comparar tasas y deudas', to: '/saldar-deudas-uruguay' }],
  }),
  faq({
    id: 'dato-deuda-incorrecto',
    question: '¿Qué hago si una deuda o categoría de riesgo está mal informada?',
    shortAnswer:
      'Reclamá primero a la entidad que reportó; el BCU publica, pero esa entidad responde por la exactitud.',
    answer:
      'Para la Central de Riesgos, presentá el reclamo al servicio de atención de la institución y conservá la constancia. Si no responde en 15 días o la respuesta no es satisfactoria, podés denunciar ante el BCU; para una base privada ejercé también los derechos de acceso y rectificación de datos.',
    category: 'deuda-clearing',
    sourceIds: ['bcu-central-riesgos', 'bcu-reclamos', 'ley-clearing'],
    basis: 'procedimiento',
    tags: ['error', 'reclamo', 'rectificación', 'Central de Riesgos'],
  }),

  // ── Créditos y préstamos ────────────────────────────────────────────────────
  faq({
    id: 'comparar-prestamos-tea',
    question: '¿Cómo comparo dos préstamos?',
    shortAnswer:
      'Compará efectivo recibido, TEA, cantidad y monto de cuotas, seguros, comisiones, mora y total a pagar.',
    answer:
      'La Ley de Relaciones de Consumo exige informar precio de contado o crédito, total financiado, pagos y periodicidad; las entidades financieras deben informar la TEA. Simulá el mismo monto y plazo y no elijas por “cuota baja” si eso extiende mucho el costo.',
    category: 'credito-prestamo',
    sourceIds: ['ley-consumo-15', 'bcu-informacion-credito'],
    basis: 'norma',
    tags: ['préstamo', 'TEA', 'cuotas', 'costo total'],
    howCommon: 'muy_comun',
    related: [{ label: 'Calcular préstamo y cuotas', to: '/herramientas/calculadora-prestamo' }],
  }),
  faq({
    id: 'cuota-que-puedo-pagar',
    question: '¿Qué cuota de préstamo puedo pagar sin ahogarme?',
    shortAnswer:
      'La que sigue entrando en un presupuesto real incluso con gastos irregulares y un imprevisto razonable.',
    answer:
      'No hay un porcentaje legal que vuelva segura una cuota para todos. Probala contra ingresos líquidos estables, otras deudas y meses caros; si solo cierra usando tarjeta o sobregiro para gastos básicos, el préstamo no es sostenible aunque la entidad lo apruebe.',
    category: 'credito-prestamo',
    sourceIds: ['bcu-presupuesto', 'bcu-informacion-credito'],
    basis: 'criterio',
    tags: ['cuota', 'capacidad de pago', 'presupuesto', 'sobreendeudamiento'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'prestamista-habilitado',
    question: '¿Cómo verifico si quien ofrece un préstamo está habilitado?',
    shortAnswer:
      'Buscá la razón social en los registros del BCU y desconfiá de adelantos para “liberar” el dinero.',
    answer:
      'Una marca, perfil social o dominio web no prueban autorización. Contrastá la entidad y el producto en el registro oficial, leé el contrato y no entregues claves; las advertencias del BCU incluyen ofertas de crédito o inversión no registradas.',
    category: 'credito-prestamo',
    sourceIds: ['bcu-registros', 'bcu-advertencias-inversion'],
    basis: 'procedimiento',
    tags: ['prestamista', 'financiera', 'habilitado', 'estafa'],
    related: [{ label: 'Comparar prestamistas del sitio', to: '/prestamos-uruguay' }],
  }),
  faq({
    id: 'cargos-no-contrato',
    question: '¿Pueden cobrarme un gasto que no estaba en el contrato?',
    shortAnswer: 'La entidad no puede cobrar conceptos no incluidos en el contrato.',
    answer:
      'El portal del BCU lo indica expresamente y la oferta de crédito debe informar previamente intereses, gastos y adicionales. Pedí el desglose y reclamá por escrito ante la institución si aparece un cargo distinto o sin base contractual.',
    category: 'credito-prestamo',
    sourceIds: ['bcu-central-riesgos', 'ley-consumo-15'],
    basis: 'norma',
    tags: ['contrato', 'cargo', 'gasto administrativo', 'seguro'],
  }),
  faq({
    id: 'cancelar-prestamo-antes',
    question: '¿Puedo cancelar un préstamo antes y ahorrar intereses?',
    shortAnswer:
      'Depende de las condiciones pactadas; pedí el saldo de cancelación y el costo exacto antes de pagar.',
    answer:
      'No publiques como ahorro la suma de cuotas futuras sin conocer cómo calcula la entidad la cancelación anticipada. Revisá contrato, comisión y fecha de imputación; la entidad debe explicar los importes que cobra y no puede agregar conceptos ajenos al contrato.',
    category: 'credito-prestamo',
    sourceIds: ['bcu-informacion-credito', 'bcu-central-riesgos'],
    basis: 'procedimiento',
    tags: ['cancelación anticipada', 'saldo', 'intereses', 'contrato'],
  }),
  faq({
    id: 'ser-garante-prestamo',
    question: '¿Qué implica salir de garante de otra persona?',
    shortAnswer:
      'La garantía puede aparecer en tu Central de Riesgos y obligarte según lo firmado.',
    answer:
      'El BCU informa que las garantías otorgadas a favor de operaciones de crédito se registran en la Central de Riesgos. Leé alcance, monto, plazo y causales de exigibilidad como si la deuda fuera propia; no firmes suponiendo que es solo una referencia personal.',
    category: 'credito-prestamo',
    sourceIds: ['bcu-central-riesgos'],
    basis: 'procedimiento',
    tags: ['garante', 'fiador', 'Central de Riesgos', 'préstamo'],
    howCommon: 'comun',
  }),

  // ── Tarjetas y pagos ────────────────────────────────────────────────────────
  faq({
    id: 'credito-vs-debito',
    question: '¿Cuál es la diferencia entre tarjeta de crédito y débito?',
    shortAnswer:
      'Con débito usás fondos disponibles; con crédito generás una deuda hasta el límite acordado.',
    answer:
      'La tarjeta de crédito puede financiar el saldo y exigir al menos un pago mínimo; la de débito descuenta de la cuenta. En ambas revisá contrato, comisiones, conversión de moneda y canales para denunciar pérdida u operaciones desconocidas.',
    category: 'tarjetas',
    sourceIds: ['bcu-medios-pago'],
    basis: 'dato-oficial',
    tags: ['tarjeta crédito', 'tarjeta débito', 'saldo', 'límite'],
    howCommon: 'muy_comun',
    related: [
      { label: 'Comparar tarjetas de crédito', to: '/tarjetas-de-credito-uruguay' },
      { label: 'Comparar tarjetas de débito', to: '/tarjetas-de-debito-uruguay' },
    ],
  }),
  faq({
    id: 'pagar-minimo-tarjeta',
    question: '¿Qué pasa si pago solo el mínimo de la tarjeta?',
    shortAnswer:
      'Evitás quedar impago por ese vencimiento, pero financiás el saldo y genera intereses.',
    answer:
      'Defensa del Consumidor desaconseja convertir el pago mínimo en práctica habitual. Mirá en el estado de cuenta cuánto queda financiado, la TEA aplicable y los cargos; pagar repetidamente el mínimo puede prolongar y encarecer mucho la deuda.',
    category: 'tarjetas',
    sourceIds: ['mef-consumidor-financiero', 'bcu-informacion-credito'],
    basis: 'procedimiento',
    tags: ['pago mínimo', 'tarjeta', 'intereses', 'saldo'],
    howCommon: 'muy_comun',
    related: [{ label: 'Planificar pago de deudas', to: '/saldar-deudas-uruguay' }],
  }),
  faq({
    id: 'cuotas-sin-recargo',
    question: '¿“Cuotas sin recargo” significa que siempre conviene financiar?',
    shortAnswer:
      'No necesariamente: compará el precio de contado, el total financiado y cualquier beneficio perdido.',
    answer:
      'La oferta debe informar precio de contado, total financiado, cantidad y periodicidad de pagos. Si ambos totales son iguales y podés pagar cada vencimiento sin financiar la tarjeta, las cuotas no agregan interés explícito; igual verificá cargos de la tarjeta y descuentos alternativos.',
    category: 'tarjetas',
    sourceIds: ['ley-consumo-15', 'bcu-informacion-credito'],
    basis: 'criterio',
    tags: ['cuotas sin recargo', 'precio contado', 'financiación'],
    howCommon: 'muy_comun',
    related: [{ label: 'Analizar una compra en cuotas', to: '/conviene-comprar-en-cuotas' }],
  }),
  faq({
    id: 'operacion-tarjeta-desconocida',
    question: '¿Qué hago si aparece una compra o retiro que no reconozco?',
    shortAnswer:
      'Avisá de inmediato al emisor por un canal oficial, bloqueá el instrumento y formalizá el reclamo.',
    answer:
      'El BCU recomienda contactar a la institución ante cualquier operación desconocida. Conservá número de gestión, estado de cuenta y denuncia si corresponde; si la respuesta no llega o no satisface, seguí el procedimiento de reclamo, sabiendo que el BCU no ordena por sí mismo la devolución de importes.',
    category: 'tarjetas',
    sourceIds: ['bcu-seguridad-pagos', 'bcu-reclamos'],
    basis: 'procedimiento',
    tags: ['compra desconocida', 'fraude', 'bloquear tarjeta', 'reclamo'],
    howCommon: 'muy_comun',
    related: [{ label: 'Guía ante estafas', to: '/estafas-uruguay' }],
  }),
  faq({
    id: 'tarjeta-perdida-robada',
    question: '¿Qué hago si perdí o me robaron la tarjeta?',
    shortAnswer: 'Denunciá y bloqueá inmediatamente con el emisor; no esperes a ver un consumo.',
    answer:
      'El BCU aconseja tener disponibles los canales oficiales y revisar periódicamente el estado de cuenta. No compartas PIN, contraseña ni códigos con quien te llame diciendo que necesita “validar” el bloqueo.',
    category: 'tarjetas',
    sourceIds: ['bcu-medios-pago', 'bcu-seguridad-pagos'],
    basis: 'procedimiento',
    tags: ['robo', 'pérdida', 'bloqueo', 'PIN'],
  }),
  faq({
    id: 'minimo-compra-debito',
    question: '¿Un comercio puede exigir un mínimo para pagar con débito?',
    shortAnswer: 'Si acepta débito, no puede condicionar su uso a un monto mínimo.',
    answer:
      'La prohibición oficial alcanza a tarjetas de débito e instrumentos de dinero electrónico. Pedí comprobante y, si el comercio insiste, podés denunciar ante Defensa del Consumidor.',
    category: 'tarjetas',
    sourceIds: ['mef-minimo-debito'],
    basis: 'norma',
    tags: ['mínimo', 'débito', 'comercio', 'denuncia'],
  }),

  // ── Bancos y fintech ────────────────────────────────────────────────────────
  faq({
    id: 'mejor-banco-fintech',
    question: '¿Cuál es el mejor banco o fintech para usar en Uruguay?',
    shortAnswer:
      'No hay uno universal: compará regulación, costos, red, transferencias, moneda, soporte y producto.',
    answer:
      'Una cuenta sueldo, una billetera y una cuenta de inversión resuelven necesidades distintas. Verificá la entidad exacta en el BCU y compará contrato y tarifas; las opiniones de Reddit ayudan a detectar fricciones, pero no sustituyen condiciones oficiales ni prueban solvencia.',
    category: 'bancos-fintech',
    sourceIds: ['bcu-registros', 'bcu-depositos'],
    basis: 'criterio',
    tags: ['mejor banco', 'fintech', 'cuenta sueldo', 'app'],
    howCommon: 'muy_comun',
    related: [
      { label: 'Comparar bancos', to: '/mejores-bancos-uruguay' },
      { label: 'Ver apps de dinero', to: '/apps-economia-uruguay' },
    ],
  }),
  faq({
    id: 'banco-vs-dinero-electronico',
    question: '¿Una billetera de dinero electrónico es lo mismo que una cuenta bancaria?',
    shortAnswer:
      'No: puede estar habilitada por el BCU, pero el instrumento y sus protecciones no son idénticos a un depósito bancario.',
    answer:
      'El dinero electrónico representa fondos cargados, es convertible a efectivo salvo excepciones y no genera intereses por sí mismo. Revisá quién es el emisor, dónde mantiene los fondos, qué registro lo habilita y si el saldo que ves constituye o no un depósito cubierto por COPAB.',
    category: 'bancos-fintech',
    sourceIds: ['bcu-medios-pago', 'copab-cobertura', 'bcu-registros'],
    basis: 'procedimiento',
    tags: ['dinero electrónico', 'billetera', 'fintech', 'depósito'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'cobertura-copab-varios-bancos',
    question: '¿La garantía COPAB se calcula por cuenta o por banco?',
    shortAnswer:
      'Por persona, institución y moneda; abrir varias cuentas en el mismo banco no multiplica el tope.',
    answer:
      'COPAB agrupa capital e intereses de los depósitos cubiertos que una persona tenga en la misma institución. Los topes de moneda nacional y extranjera son separados, y una cuenta conjunta tiene reglas propias que conviene confirmar para el caso concreto.',
    category: 'bancos-fintech',
    sourceIds: ['copab-cobertura'],
    basis: 'dato-oficial',
    tags: ['COPAB', 'varias cuentas', 'banco', 'garantía'],
  }),
  faq({
    id: 'banco-pide-origen-fondos',
    question: '¿Por qué el banco me pide justificar el origen de fondos?',
    shortAnswer:
      'Las entidades aplican controles legales y de riesgo; aportá documentos coherentes con la operación.',
    answer:
      'Que pidan respaldo no significa por sí solo que exista una deuda tributaria ni una acusación. Conservá contratos, recibos, facturas, estados de cuenta y constancias de venta o herencia; pedí por escrito qué documento falta y cuál es el canal seguro para enviarlo.',
    category: 'bancos-fintech',
    sourceIds: ['bcu-registros', 'bcu-reclamos'],
    basis: 'procedimiento',
    tags: ['origen de fondos', 'compliance', 'documentación', 'cuenta bloqueada'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'transferencia-cuenta-equivocada',
    question: '¿Qué hago si transferí a una cuenta equivocada?',
    shortAnswer:
      'Contactá inmediatamente a tu institución; el BCU no puede ordenar que revierta una transferencia errónea.',
    answer:
      'Entregá fecha, monto, cuenta y comprobante por el canal oficial y pedí número de reclamo. La recuperación depende de la gestión de las instituciones y, si no hay acuerdo, puede requerir otra vía; no envíes un segundo pago a alguien que prometa “desbloquear” el primero.',
    category: 'bancos-fintech',
    sourceIds: ['bcu-reclamos', 'bcu-seguridad-pagos'],
    basis: 'procedimiento',
    tags: ['transferencia errónea', 'reversión', 'reclamo', 'cuenta'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'reclamo-banco-plazo',
    question: '¿Cómo reclamo contra un banco o entidad supervisada?',
    shortAnswer:
      'Primero ante su servicio de reclamos; luego ante BCU o Defensa del Consumidor si no responde o no satisface.',
    answer:
      'Conservá copia y número de gestión. El BCU indica un plazo de 15 días corridos para la respuesta, que puede prorrogarse; su denuncia supervisa la actuación, pero no sustituye a un juez ni puede ordenar todas las devoluciones o indemnizaciones.',
    category: 'bancos-fintech',
    sourceIds: ['bcu-reclamos'],
    basis: 'procedimiento',
    tags: ['reclamo', 'banco', 'BCU', '15 días'],
  }),
  faq({
    id: 'cobrar-del-exterior-banco',
    question: '¿Puedo cobrar del exterior en una cuenta uruguaya?',
    shortAnswer:
      'El banco puede recibirlo si su producto y controles lo admiten; cobrar no elimina obligaciones de facturación o impuestos.',
    answer:
      'Antes de recibir, pedí al banco datos SWIFT, moneda, comisiones, corresponsales y documentación de origen. Si es pago por servicios independientes, revisá por separado inscripción, factura, IRPF e IVA: el tratamiento depende de la actividad y del aprovechamiento del servicio, no del banco elegido.',
    category: 'bancos-fintech',
    sourceIds: ['dgi-irpf-independientes', 'dgi-iva-servicios', 'bcu-reclamos'],
    basis: 'procedimiento',
    tags: ['cobrar exterior', 'SWIFT', 'freelance', 'banco'],
    howCommon: 'muy_comun',
  }),

  // ── Derechos y reclamos ────────────────────────────────────────────────────
  faq({
    id: 'reclamo-o-denuncia-consumidor',
    question: '¿Conviene presentar un reclamo o una denuncia ante Defensa del Consumidor?',
    shortAnswer:
      'El reclamo intenta resolver tu caso por mediación; la denuncia busca una sanción y no una compensación individual.',
    answer:
      'Usá una consulta si primero necesitás aclarar derechos u obligaciones. Elegí reclamo si buscás, por ejemplo, la entrega, cancelación del contrato o de una deuda mediante mediación con el proveedor. La denuncia comunica una posible infracción para que el organismo evalúe sancionarla; el trámite oficial aclara que no sirve para obtener compensación ni resolver tu reclamo de consumo.',
    category: 'derechos-reclamos',
    sourceIds: ['mef-reclamo-consumo'],
    basis: 'procedimiento',
    tags: ['Defensa del Consumidor', 'reclamo', 'denuncia', 'mediación', 'MEF'],
    howCommon: 'muy_comun',
    related: [
      {
        label: 'Guía de derechos en compras y servicios',
        to: '/derechos-consumidor-compras-online',
      },
    ],
  }),
  faq({
    id: 'servicio-pagado-no-prestado',
    question: 'Pagué un servicio y no lo prestaron: ¿qué puedo exigir?',
    shortAnswer:
      'Si hay incumplimiento imputable al proveedor, podés elegir cumplimiento, equivalente o terminar el contrato con devolución.',
    answer:
      'El artículo 33 de la Ley 17.250 permite exigir el cumplimiento si es posible, aceptar otro producto o servicio o una reparación equivalente, o resolver el contrato con restitución actualizada de lo pagado. Guardá oferta, contrato, comprobante, fechas y mensajes; reclamá por escrito al proveedor y, si no se soluciona, iniciá el reclamo de consumo. El incumplimiento no debe llamarse automáticamente “estafa”: una eventual calificación penal depende de hechos adicionales.',
    category: 'derechos-reclamos',
    sourceIds: ['ley-consumo-6', 'ley-consumo-33', 'mef-reclamo-consumo'],
    basis: 'norma',
    tags: [
      'servicio no prestado',
      'incumplimiento',
      'devolución',
      'proveedor',
      'Defensa del Consumidor',
    ],
    howCommon: 'muy_comun',
    related: [
      {
        label: 'Reunir pruebas y reclamar',
        to: '/derechos-consumidor-compras-online',
      },
    ],
  }),
  faq({
    id: 'cobranza-sin-detalle',
    question: 'Una empresa de cobranza me reclama una deuda sin explicar el saldo: ¿qué hago?',
    shortAnswer:
      'Verificá quién es el acreedor actual y pedí por escrito saldo, conceptos y aplicación de tus pagos antes de acordar.',
    answer:
      'La Unidad Defensa del Consumidor advierte que el acreedor original puede encargar la cobranza o vender la cartera, por lo que primero hay que identificar al acreedor actual. Conservá cada recibo y pedí origen de la deuda, capital, intereses, cargos, fechas, imputación de pagos y monto de cancelación. Si el crédito provino de una institución supervisada, reclamá formalmente allí: el BCU reconoce el derecho a comprobantes, estados de cuenta y carta de pago al cancelar.',
    category: 'derechos-reclamos',
    sourceIds: ['mef-consumidor-financiero', 'bcu-deudor-derechos', 'bcu-reclamos'],
    basis: 'procedimiento',
    tags: ['empresa de cobranza', 'estudio de cobro', 'estado de deuda', 'intereses', 'pagos'],
    howCommon: 'muy_comun',
    related: [{ label: 'Cómo negociar y saldar deudas', to: '/saldar-deudas-uruguay' }],
  }),
  faq({
    id: 'bancarrota-personal-uruguay',
    question: '¿Existe la “bancarrota personal” para borrar deudas de consumo en Uruguay?',
    shortAnswer:
      'No asumas una cancelación automática: la Ley 18.387 distingue a la persona física con actividad empresaria de quien no está comprendido.',
    answer:
      'El artículo 2 somete a la Ley 18.387 a la persona física que realiza actividad empresaria y a personas jurídicas civiles o comerciales. Para personas físicas no comprendidas remite al concurso civil del Código General del Proceso; por eso la solución concursal de una empresa no puede trasladarse sin más a un asalariado con deudas de consumo. Antes de suspender pagos o disponer bienes, obtené asesoramiento jurídico sobre tu situación y evaluá también negociación documentada con cada acreedor.',
    category: 'derechos-reclamos',
    sourceIds: ['ley-concurso-2', 'pj-asesoramiento-juridico'],
    basis: 'norma',
    tags: ['bancarrota personal', 'concurso', 'insolvencia', 'deudas de consumo', 'asalariado'],
    howCommon: 'muy_comun',
    related: [{ label: 'Opciones para saldar deudas', to: '/saldar-deudas-uruguay' }],
  }),
  faq({
    id: 'asesoramiento-juridico-sin-recursos',
    question: '¿Dónde consigo asesoramiento jurídico si no puedo pagar un abogado?',
    shortAnswer:
      'El Poder Judicial indica que podés consultar una Defensoría Pública si cumplís los requisitos socioeconómicos.',
    answer:
      'Los juzgados no responden consultas jurídicas por internet. Buscá en el directorio oficial la Defensoría Pública de la materia y del departamento que corresponda; allí te informarán requisitos y atención. No fijamos un umbral de ingresos en esta FAQ porque la admisión debe confirmarse con la oficina y tu situación concreta.',
    category: 'derechos-reclamos',
    sourceIds: ['pj-asesoramiento-juridico', 'pj-defensorias'],
    basis: 'procedimiento',
    tags: ['abogado gratis', 'Defensoría Pública', 'asesoramiento jurídico', 'sin recursos'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'consulta-laboral-gratuita-mtss',
    question: '¿Dónde consulto gratis por sueldo impago, despido o liquidación laboral?',
    shortAnswer:
      'El MTSS ofrece consulta laboral y salarial gratuita para actividad privada, incluso con liquidación en casos previstos.',
    answer:
      'La consulta del MTSS analiza una situación concreta para trabajadores y empleadores de la actividad privada; puede hacerse en línea o presencial y no tiene costo. Para una liquidación en línea se adjuntan los recibos de sueldo. El resultado no es vinculante: si existe juicio, plazo procesal o conflicto que requiera representación, consultá además a un profesional o a la Defensoría Pública del Trabajo.',
    category: 'derechos-reclamos',
    sourceIds: ['mtss-consulta-laboral', 'pj-defensorias'],
    basis: 'procedimiento',
    tags: ['consulta laboral', 'sueldo impago', 'despido', 'liquidación', 'MTSS'],
    howCommon: 'muy_comun',
  }),

  // ── Impuestos ───────────────────────────────────────────────────────────────
  faq({
    id: 'irpf-como-funciona',
    question: '¿Cómo funciona el IRPF sobre el sueldo?',
    shortAnswer:
      'Es progresivo: se calcula por franjas sobre ingresos y luego se consideran deducciones y retenciones.',
    answer:
      'No se aplica la tasa máxima a todo el sueldo. El empleador retiene mensualmente sobre la retribución nominal y el cálculo anual separa el tratamiento de partidas como aguinaldo y salario vacacional; usá la escala vigente y tus deducciones reales.',
    category: 'impuestos',
    sourceIds: ['dgi-irpf-dependientes', 'dgi-bpc'],
    basis: 'norma',
    tags: ['IRPF', 'franjas', 'sueldo', 'retención'],
    howCommon: 'muy_comun',
    related: [{ label: 'Calcular sueldo líquido', to: '/herramientas/calculadora-sueldo-liquido' }],
  }),
  faq({
    id: 'declarar-si-retuvieron-irpf',
    question: '¿Tengo que declarar IRPF si ya me retuvieron?',
    shortAnswer:
      'No siempre; depende de pagadores, ingresos, rentas sin retención y opciones del ejercicio.',
    answer:
      'DGI publica cada campaña las situaciones obligadas y las no obligadas. Son casos frecuentes el multiingreso, trabajo independiente y rentas de capital sin agente de retención; también podés presentar voluntariamente para usar determinados créditos.',
    category: 'impuestos',
    sourceIds: ['dgi-irpf-obligados', 'dgi-irpf-dependientes'],
    basis: 'procedimiento',
    tags: ['declaración jurada', 'IRPF', 'retención', 'DGI'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'dos-trabajos-formulario-3100',
    question: '¿Qué cambia en el IRPF si tengo dos trabajos?',
    shortAnswer:
      'Los ingresos se consideran juntos y puede corresponder informar el multiingreso con el formulario 3100.',
    answer:
      'Cada empleador no conoce automáticamente todo lo cobrado en el otro. DGI indica presentar el 3100 cuando los ingresos simultáneos sumados superan 7 BPC para ajustar el mínimo no imponible; el resultado final se regulariza en la liquidación anual cuando corresponde.',
    category: 'impuestos',
    sourceIds: ['dgi-irpf-dependientes', 'dgi-bpc'],
    basis: 'procedimiento',
    tags: ['multiingreso', 'dos trabajos', '3100', 'IRPF'],
  }),
  faq({
    id: 'independiente-irpf-iva',
    question: '¿Qué impuestos paga un trabajador independiente?',
    shortAnswer:
      'En el régimen general de servicios personales puede corresponder IRPF e IVA, además de aportes.',
    answer:
      'DGI informa que el IRPF alcanza a independientes cuando los ingresos mensuales totales sin IVA superan 7 BPC, con deducciones y reglas propias. IVA Servicios Personales tiene anticipos y declaración anual, salvo exoneración, exportación de servicios u otro régimen aplicable; monotributo no sirve para cualquier actividad.',
    category: 'impuestos',
    sourceIds: ['dgi-irpf-independientes', 'dgi-iva-servicios', 'dgi-bpc'],
    basis: 'norma',
    tags: ['independiente', 'IRPF', 'IVA', '7 BPC', 'freelance'],
    howCommon: 'muy_comun',
    related: [{ label: 'Elegir régimen de empresa', to: '/que-empresa-abrir-uruguay' }],
  }),
  faq({
    id: 'banco-retiene-impuesto-inversion',
    question: '¿Si el banco o broker retuvo impuesto ya no tengo que declarar?',
    shortAnswer:
      'Solo si esa retención cubre la renta y la norma permite darle carácter definitivo.',
    answer:
      'DGI explica que ciertos agentes locales retienen rentas de capital y el contribuyente puede dar carácter definitivo a esas retenciones. Si no hay agente, hay otras rentas o la retención extranjera no resuelve el IRPF uruguayo, puede corresponder formulario 1101 y saldo.',
    category: 'impuestos',
    sourceIds: ['dgi-capital', 'dgi-irpf-obligados'],
    basis: 'norma',
    tags: ['retención', 'broker', 'banco', 'formulario 1101'],
  }),
  faq({
    id: 'venta-acciones-exterior-2026',
    question: '¿La ganancia por vender acciones del exterior paga IRPF desde 2026?',
    shortAnswer:
      'El régimen 2026 incorporó incrementos patrimoniales del exterior; el cálculo depende del activo, costo y opción aplicable.',
    answer:
      'El Decreto 95/026 reglamenta la renta por transmisiones de bienes situados en el exterior usando precio y costo fiscal, con reglas de valuación. No uses automáticamente 12% sobre todo lo vendido ni asumas exoneración por dejar el dinero en el broker; documentá compras, ventas, comisiones y moneda.',
    category: 'impuestos',
    sourceIds: ['decreto-95-026', 'dgi-irpf-obligados'],
    basis: 'norma',
    tags: ['acciones', 'exterior', 'ganancia de capital', '2026', 'IRPF'],
    related: [
      { label: 'Ver reglas verificadas', to: '/impuestos-inversiones-uruguay' },
      {
        label: 'Usar calculadora de inversiones',
        to: '/herramientas/calculadora-impuestos-inversiones',
      },
    ],
  }),
  faq({
    id: 'bpc-que-es',
    question: '¿Qué es la BPC y por qué cambia mis impuestos?',
    shortAnswer:
      'Es una unidad oficial usada en mínimos, franjas, topes y deducciones; su valor cambia por ejercicio.',
    answer:
      'En 2026 la BPC es $6.864 desde el 1.º de enero. Cuando una regla dice 7 BPC o 40 BPC, multiplicá por el valor vigente del período correspondiente y no reutilices el monto del año anterior.',
    category: 'impuestos',
    sourceIds: ['dgi-bpc'],
    basis: 'dato-oficial',
    tags: ['BPC', '2026', 'franjas', 'topes'],
  }),
  faq({
    id: 'impuesto-alquiler',
    question: '¿El ingreso por alquilar una propiedad paga IRPF?',
    shortAnswer:
      'En general es renta de capital inmobiliario; puede haber retención, anticipos o exoneración con requisitos.',
    answer:
      'No confundas la retención practicada por una administradora con la tasa o liquidación final. Identificá alquiler cobrado, gastos deducibles admitidos y si se cumplen todos los requisitos de una exoneración; la guía del sitio enlaza la fuente DGI y separa al propietario del crédito del inquilino.',
    category: 'impuestos',
    sourceIds: ['dgi-irpf-obligados'],
    basis: 'procedimiento',
    tags: ['alquiler', 'propietario', 'IRPF', 'retención'],
    related: [
      { label: 'Ver impuestos a inversiones y alquileres', to: '/impuestos-inversiones-uruguay' },
    ],
  }),

  // ── Sueldo y trabajo ────────────────────────────────────────────────────────
  faq({
    id: 'nominal-vs-liquido',
    question: '¿Cuál es la diferencia entre sueldo nominal y líquido?',
    shortAnswer:
      'El nominal es la remuneración antes de descuentos; el líquido es lo que queda tras aportes, IRPF y otras retenciones.',
    answer:
      'Para comparar ofertas pedí siempre la misma base y revisá el recibo: jubilatorio, FONASA, FRL, IRPF y retenciones autorizadas no son iguales para todas las personas. La calculadora del sitio usa parámetros 2026 y muestra cada línea, pero el recibo y la situación real prevalecen.',
    category: 'sueldo-trabajo',
    sourceIds: ['mtss-salarios', 'dgi-irpf-dependientes'],
    basis: 'procedimiento',
    tags: ['nominal', 'líquido', 'descuentos', 'recibo'],
    howCommon: 'muy_comun',
    related: [
      { label: 'Calcular nominal y líquido', to: '/herramientas/calculadora-sueldo-liquido' },
    ],
  }),
  faq({
    id: 'salario-minimo-2026',
    question: '¿Cuál es el Salario Mínimo Nacional vigente?',
    shortAnswer:
      'Desde el 1.º de julio de 2026 es $25.383 mensuales, con equivalentes diario y horario oficiales.',
    answer:
      'El MTSS fijó $24.572 desde enero y un segundo ajuste a $25.383 desde julio de 2026. Es un piso nacional: los laudos del grupo y subgrupo de actividad pueden establecer mínimos superiores.',
    category: 'sueldo-trabajo',
    sourceIds: ['mtss-smn'],
    basis: 'dato-oficial',
    tags: ['salario mínimo', 'SMN', '2026', 'laudo'],
  }),
  faq({
    id: 'aguinaldo-calculo-fechas',
    question: '¿Cómo se calcula y cuándo se paga el aguinaldo?',
    shortAnswer:
      'Es la doceava parte de los salarios en dinero del período y se paga en dos etapas.',
    answer:
      'El aguinaldo de junio toma lo generado hasta el 31 de mayo y el segundo semestre lo generado del 1.º de junio al 30 de noviembre, con fecha anual fijada por decreto. Tiene descuentos; si hubo renuncia o despido se liquida la parte generada, salvo las excepciones legales.',
    category: 'sueldo-trabajo',
    sourceIds: ['mtss-aguinaldo'],
    basis: 'norma',
    tags: ['aguinaldo', 'junio', 'diciembre', 'cálculo'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'licencia-salario-vacacional',
    question: '¿Licencia y salario vacacional son lo mismo?',
    shortAnswer:
      'No: la licencia es descanso pago y el salario vacacional es una suma para el mejor goce, pagada antes.',
    answer:
      'Para un trabajador mensual, la regla general genera 20 días anuales, equivalentes a 1,66 por mes trabajado, sin perjuicio de regímenes más favorables. El monto y las partidas computables pueden variar por modalidad y sector, así que revisá el laudo y la liquidación.',
    category: 'sueldo-trabajo',
    sourceIds: ['mtss-licencia'],
    basis: 'norma',
    tags: ['licencia', 'salario vacacional', '20 días', 'trabajo'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'recibo-sueldo-mal',
    question: '¿Qué hago si creo que el recibo de sueldo está mal?',
    shortAnswer:
      'Compará horas, partidas y descuentos; pedí explicación escrita y consultá al MTSS si persiste la diferencia.',
    answer:
      'El recibo debe detallar los rubros que componen la remuneración y las retenciones. Conservá recibos, horarios y comunicaciones; una calculadora orienta, pero no contempla todos los laudos, convenios, embargos o partidas de cada vínculo.',
    category: 'sueldo-trabajo',
    sourceIds: ['mtss-salarios', 'mtss-licencia'],
    basis: 'procedimiento',
    tags: ['recibo', 'error', 'horas extra', 'descuentos', 'MTSS'],
  }),
  faq({
    id: 'despido-consulta-liquidacion',
    question: '¿Cómo verifico una liquidación por renuncia o despido?',
    shortAnswer:
      'Separá salario pendiente, licencia, salario vacacional, aguinaldo y eventual indemnización.',
    answer:
      'La liquidación depende de causal, antigüedad, modalidad salarial y normas del sector. Pedí un desglose y usá la consulta laboral del MTSS con recibos y fechas; no aceptes como universal una fórmula de Reddit sin revisar el vínculo concreto.',
    category: 'sueldo-trabajo',
    sourceIds: ['mtss-salarios', 'mtss-licencia'],
    basis: 'procedimiento',
    tags: ['despido', 'renuncia', 'liquidación', 'licencia no gozada'],
    howCommon: 'comun',
  }),

  // ── Precios e inflación ─────────────────────────────────────────────────────
  faq({
    id: 'que-mide-ipc',
    question: '¿Qué mide el IPC?',
    shortAnswer:
      'Mide la variación de precios de una canasta representativa de consumo de los hogares.',
    answer:
      'El INE releva precios efectivamente pagados, con impuestos, en establecimientos seleccionados de Montevideo y el interior. El IPC es un promedio estadístico: no afirma que cada producto ni cada hogar haya variado exactamente ese porcentaje.',
    category: 'precios-inflacion',
    sourceIds: ['ine-ipc'],
    basis: 'dato-oficial',
    tags: ['IPC', 'inflación', 'INE', 'canasta'],
    howCommon: 'muy_comun',
    related: [
      { label: 'Calcular inflación entre fechas', to: '/herramientas/calculadora-inflacion' },
    ],
  }),
  faq({
    id: 'inflacion-personal-distinta',
    question: '¿Por qué mis gastos suben más que la inflación publicada?',
    shortAnswer:
      'Tu canasta y ponderaciones pueden ser muy distintas de la canasta promedio del IPC.',
    answer:
      'Un hogar que destina más a alquiler, medicamentos o transporte siente más los rubros que suben en esos precios. El tablero del INE permite simular canastas seleccionadas por el usuario; compará categorías y no un único ticket con el índice general.',
    category: 'precios-inflacion',
    sourceIds: ['ine-ipc'],
    basis: 'dato-oficial',
    tags: ['inflación personal', 'canasta', 'gastos', 'IPC'],
  }),
  faq({
    id: 'unidad-indexada-inflacion',
    question: '¿La Unidad Indexada siempre sube igual que la inflación del mes?',
    shortAnswer:
      'Se ajusta diariamente con una metodología basada en variaciones pasadas del IPC; no replica el dato instantáneamente.',
    answer:
      'La UI usa coeficientes diarios calculados a partir del IPC y tiene un calendario de aplicación. Por eso un valor puntual no debe compararse como si fuera el IPC del mismo día; usá la serie oficial o el conversor del sitio para la fecha exacta.',
    category: 'precios-inflacion',
    sourceIds: ['ine-ui', 'bcu-cotizaciones'],
    basis: 'dato-oficial',
    tags: ['UI', 'Unidad Indexada', 'IPC', 'ajuste diario'],
    related: [{ label: 'Convertir UI por fecha', to: '/herramientas/conversor-unidad-indexada' }],
  }),
  faq({
    id: 'comparar-precio-pasado',
    question: '¿Cómo comparo un precio viejo con uno actual?',
    shortAnswer:
      'Actualizá el importe con el IPC entre ambas fechas y luego compará producto, calidad y condiciones.',
    answer:
      'Ajustar por IPC responde cuánto tendría que valer para mantener poder de compra promedio, no prueba cuál debería ser el precio comercial. Para moneda extranjera hacé además una comparación separada con el tipo de cambio de cada fecha.',
    category: 'precios-inflacion',
    sourceIds: ['ine-ipc', 'bcu-cotizaciones'],
    basis: 'criterio',
    tags: ['precio histórico', 'inflación', 'poder de compra', 'dólar'],
    related: [
      { label: 'Actualizar un monto por inflación', to: '/herramientas/calculadora-inflacion' },
    ],
  }),
  faq({
    id: 'costo-vida-no-es-ipc',
    question: '¿El IPC me dice cuánto cuesta vivir por mes?',
    shortAnswer: 'No: mide variación de precios, no un presupuesto mensual universal.',
    answer:
      'Para estimar costo de vida necesitás cantidades y precios de tu vivienda, hogar y hábitos. Usá IPC para actualizar referencias y una canasta personal para presupuestar; publicar “el costo de vivir en Uruguay” sin composición ni fecha mezcla dos preguntas distintas.',
    category: 'precios-inflacion',
    sourceIds: ['ine-ipc'],
    basis: 'criterio',
    tags: ['costo de vida', 'IPC', 'presupuesto', 'canasta'],
    related: [{ label: 'Armar mi costo mensual', to: '/herramientas/costo-de-vida' }],
  }),

  // ── Emprender y empresa ─────────────────────────────────────────────────────
  faq({
    id: 'monotributo-vs-unipersonal',
    question: '¿Monotributo y unipersonal son lo mismo?',
    shortAnswer:
      'No: unipersonal describe la titularidad; Monotributo es un régimen limitado por actividad, tamaño y condiciones.',
    answer:
      'Una persona puede inscribir una empresa unipersonal bajo distintos impuestos. El Monotributo unifica aportes e impuestos para actividades de reducida dimensión que cumplen requisitos; no toda prestación profesional o freelance queda comprendida.',
    category: 'emprender-empresa',
    sourceIds: ['gub-unipersonal', 'dgi-monotributo', 'bps-monotributo'],
    basis: 'norma',
    tags: ['monotributo', 'unipersonal', 'BPS', 'DGI'],
    howCommon: 'muy_comun',
    related: [{ label: 'Comparar formas de empresa', to: '/que-empresa-abrir-uruguay' }],
  }),
  faq({
    id: 'tope-monotributo-2026',
    question: '¿Cuál es el tope del Monotributo en 2026?',
    shortAnswer:
      'Para unipersonal, DGI publica ingresos anuales menores a $1.175.537 y activos hasta $979.614.',
    answer:
      'La sociedad de hecho tiene otro tope de ingresos y además importan actividad, local, personal y demás requisitos del régimen. Los valores en pesos se actualizan; verificá la tabla del año antes de proyectar ventas o elegir forma jurídica.',
    category: 'emprender-empresa',
    sourceIds: ['dgi-monotributo'],
    basis: 'dato-oficial',
    tags: ['tope', 'monotributo', '2026', 'ingresos', 'activos'],
  }),
  faq({
    id: 'abrir-monotributo-despues-unipersonal',
    question: '¿Puedo abrir Monotributo si antes tuve una unipersonal?',
    shortAnswer:
      'El antecedente no responde solo la pregunta: debés cumplir hoy todos los requisitos y cerrar o modificar correctamente el registro anterior.',
    answer:
      'DGI y BPS evalúan el régimen por actividad, ingresos, activos, personal y situación registral. No abras una segunda inscripción para “empezar de cero” sin revisar obligaciones pendientes; usá la modificación o inscripción que corresponda a la actividad real.',
    category: 'emprender-empresa',
    sourceIds: ['dgi-monotributo', 'gub-unipersonal', 'bps-monotributo'],
    basis: 'procedimiento',
    tags: ['reabrir', 'monotributo', 'unipersonal', 'baja'],
  }),
  faq({
    id: 'factura-electronica-obligatoria',
    question: '¿Necesito factura electrónica?',
    shortAnswer:
      'Desde 2025, en general todos los contribuyentes de IVA deben ser emisores electrónicos, con excepciones puntuales.',
    answer:
      'La obligación incluye IVA Mínimo y debe revisarse antes de emitir comprobantes manuales. DGI publica las excepciones y el procedimiento de ingreso; Monotributo y otros regímenes requieren revisar su forma de documentación específica.',
    category: 'emprender-empresa',
    sourceIds: ['dgi-efactura'],
    basis: 'procedimiento',
    tags: ['factura electrónica', 'CFE', 'IVA', '2025'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'freelance-exterior-iva',
    question: '¿Si facturo a un cliente del exterior no pago IVA?',
    shortAnswer:
      'Solo es exportación de servicios si cumple las condiciones taxativas del régimen; no basta con que el cliente esté afuera.',
    answer:
      'DGI exige encuadrar el servicio en el artículo 34 del Decreto 220/998 y, en varios casos, que sea aprovechado exclusivamente en el exterior. IRPF, aportes y facturación se analizan por separado aunque el IVA resulte no gravado.',
    category: 'emprender-empresa',
    sourceIds: ['dgi-iva-servicios', 'dgi-irpf-independientes'],
    basis: 'norma',
    tags: ['freelance', 'exterior', 'exportación de servicios', 'IVA'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'cuando-inscribir-empresa',
    question: '¿Cuándo tengo que inscribir la empresa?',
    shortAnswer:
      'Antes de iniciar la actividad o dentro de los plazos específicos del trámite web; una fecha retroactiva puede exigir petición y multa.',
    answer:
      'El trámite unificado de unipersonal registra ante BPS y DGI y detalla ventanas para inicio actual o próximo. No esperes a superar un monto informal para consultar: la obligación registral y el impuesto efectivo son preguntas diferentes.',
    category: 'emprender-empresa',
    sourceIds: ['gub-unipersonal'],
    basis: 'procedimiento',
    tags: ['inscripción', 'inicio actividad', 'BPS', 'DGI', 'multa'],
  }),
  faq({
    id: 'sas-vs-unipersonal',
    question: '¿Cuándo mirar una SAS en vez de una unipersonal?',
    shortAnswer:
      'Cuando la separación patrimonial, socios, inversión o gobierno de la empresa justifican más estructura y costos.',
    answer:
      'La SAS es una persona jurídica con registro y obligaciones propias; el trámite digital admite condiciones definidas y luego exige otras comunicaciones, como beneficiarios finales. No elijas solo por una tasa: compará responsabilidad, aportes, impuestos, contabilidad y forma de retirar utilidades.',
    category: 'emprender-empresa',
    sourceIds: ['gub-sas', 'gub-unipersonal'],
    basis: 'criterio',
    tags: ['SAS', 'unipersonal', 'socios', 'responsabilidad'],
    related: [{ label: 'Simular qué empresa abrir', to: '/que-empresa-abrir-uruguay' }],
  }),
  faq({
    id: 'necesito-contador',
    question: '¿Necesito contador para abrir o manejar una empresa?',
    shortAnswer:
      'No todos los trámites exigen uno, pero puede ser necesario por el régimen, certificados o complejidad del caso.',
    answer:
      'La inscripción web de unipersonal puede realizarla el titular con identidad y usuarios requeridos. Pedí asesoramiento antes de elegir impuestos si hay servicios al exterior, empleados, socios, activos importantes o dudas de encuadre: corregir tarde suele ser más costoso.',
    category: 'emprender-empresa',
    sourceIds: ['gub-unipersonal', 'dgi-iva-servicios'],
    basis: 'criterio',
    tags: ['contador', 'abrir empresa', 'trámite', 'asesoramiento'],
  }),

  // ── Jubilación y AFAP ───────────────────────────────────────────────────────
  faq({
    id: 'como-saber-regimen-jubilatorio',
    question: '¿Cómo sé en qué régimen jubilatorio estoy?',
    shortAnswer: 'Consultá tu régimen e historia laboral en los servicios personales del BPS.',
    answer:
      'La respuesta depende de edad, afiliación y trayectoria, no de una regla única publicada en Reddit. El BPS ofrece un simulador de régimen y acceso a vida laboral y aportes; corregí faltantes antes de proyectar la jubilación.',
    category: 'jubilacion-afap',
    sourceIds: ['bps-trabajadores', 'bps-simuladores'],
    basis: 'procedimiento',
    tags: ['régimen jubilatorio', 'BPS', 'historia laboral', 'aportes'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'cual-afap-conviene',
    question: '¿Cuál AFAP conviene más?',
    shortAnswer:
      'Compará comisión, rentabilidad neta de varios períodos, servicio y tu régimen; no hay una ganadora permanente.',
    answer:
      'El BCU publica series oficiales por administradora de comisiones, rentabilidad y traspasos. La rentabilidad pasada no garantiza la futura y una diferencia de un mes no alcanza para decidir; usá datos netos y el asesoramiento previsional de tu caso.',
    category: 'jubilacion-afap',
    sourceIds: ['bcu-afap-series', 'bps-simuladores'],
    basis: 'criterio',
    tags: ['mejor AFAP', 'comisión', 'rentabilidad', 'BCU'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'cambiar-afap',
    question: '¿Me puedo cambiar de AFAP?',
    shortAnswer:
      'Sí: BPS informa que puede hacerse hasta dos veces al año con al menos seis meses de aportes efectivos.',
    answer:
      'El trámite se hace directamente ante la nueva AFAP con documento vigente y el saldo se transfiere desde la administradora anterior. Antes de firmar, compará series oficiales y pedí por escrito comisión y condiciones aplicables.',
    category: 'jubilacion-afap',
    sourceIds: ['bps-cambio-afap', 'bcu-afap-series'],
    basis: 'procedimiento',
    tags: ['cambiar AFAP', 'traspaso', 'seis meses', 'saldo'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'desvincularse-afap',
    question: '¿Puedo desvincularme de la AFAP y retirar todo el saldo?',
    shortAnswer:
      'No existe una salida libre y general para retirar el ahorro obligatorio; hay trámites y beneficios legales para situaciones específicas.',
    answer:
      'BPS publica trámites de revocación o desafiliación solo para personas alcanzadas por sus condiciones, además de las prestaciones al configurar causal. No cierres ni transfieras basándote en una promesa comercial: pedí asesoramiento previsional personalizado y resolución escrita.',
    category: 'jubilacion-afap',
    sourceIds: ['bps-trabajadores', 'bps-simuladores'],
    basis: 'procedimiento',
    tags: ['desafiliar AFAP', 'retirar saldo', 'artículo 8', 'revocación'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'calcular-jubilacion',
    question: '¿Cómo calculo cuánto voy a cobrar de jubilación?',
    shortAnswer:
      'Usá “Mi jubilación estimada” del BPS con tu historia y datos de AFAP; una fórmula genérica no alcanza.',
    answer:
      'El cálculo puede combinar prestación BPS y AFAP y depende del régimen, causal, años, salarios y datos de la administradora. El simulador es una estimación, pero usa tu información registrada y permite detectar si primero debés corregir la historia laboral.',
    category: 'jubilacion-afap',
    sourceIds: ['bps-simuladores', 'bps-trabajadores'],
    basis: 'procedimiento',
    tags: ['jubilación estimada', 'cálculo', 'BPS', 'AFAP'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'historia-laboral-faltante',
    question: '¿Qué hago si faltan años o salarios en mi historia laboral?',
    shortAnswer: 'Reuní prueba y usá el trámite o denuncia del BPS correspondiente al período.',
    answer:
      'Consultá vida laboral y aportes en línea y no esperes a la fecha de jubilación. BPS distingue reconocimiento de períodos antiguos y denuncia de diferencias posteriores; recibos, constancias y documentación del empleador pueden ser relevantes.',
    category: 'jubilacion-afap',
    sourceIds: ['bps-trabajadores'],
    basis: 'procedimiento',
    tags: ['historia laboral', 'años faltantes', 'aportes', 'BPS'],
  }),

  // ── Criptoactivos ───────────────────────────────────────────────────────────
  faq({
    id: 'cripto-curso-legal',
    question: '¿Bitcoin o USDT son moneda de curso legal en Uruguay?',
    shortAnswer:
      'No: el peso uruguayo es el medio de pago de curso legal y los activos virtuales no tienen respaldo de un banco central.',
    answer:
      'Un comercio no queda obligado a aceptar criptoactivos por el solo hecho de que puedan transferirse o usarse entre particulares. La regulación de proveedores no convierte al activo en moneda estatal ni garantiza su precio o convertibilidad.',
    category: 'cripto',
    sourceIds: ['bcu-medios-pago', 'bcu-cripto-riesgos', 'ley-activos-virtuales'],
    basis: 'norma',
    tags: ['Bitcoin', 'USDT', 'curso legal', 'peso uruguayo'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'cripto-regulada-uruguay-2026',
    question: '¿Las criptomonedas están reguladas en Uruguay?',
    shortAnswer:
      'Desde julio de 2026 existe un marco BCU para proveedores de servicios de activos virtuales; eso no elimina el riesgo del activo.',
    answer:
      'La Ley 20.345 incorporó a determinados proveedores al perímetro del BCU y el Banco aprobó el marco de funcionamiento y supervisión el 22 de julio de 2026. Hay que distinguir regulación del proveedor, clasificación del servicio y protección concreta: ninguna licencia promete rentabilidad ni recupera una clave perdida.',
    category: 'cripto',
    sourceIds: ['ley-activos-virtuales', 'bcu-psav-2026'],
    basis: 'norma',
    tags: ['regulación cripto', 'PSAV', 'BCU', '2026'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'donde-comprar-cripto',
    question: '¿Dónde conviene comprar cripto desde Uruguay?',
    shortAnswer:
      'No hay una plataforma universal: verificá licencia o registro, custodia, costos, liquidez y jurisdicción.',
    answer:
      'Confirmá qué razón social presta el servicio y bajo qué autoridad opera, especialmente durante la implementación del marco PSAV 2026. Compará spread, comisión de depósito y retiro, red usada y posibilidad real de retirar el activo; una app conocida no vuelve segura cada operación.',
    category: 'cripto',
    sourceIds: ['bcu-psav-2026', 'bcu-advertencias-inversion'],
    basis: 'criterio',
    tags: ['exchange', 'comprar cripto', 'PSAV', 'comisiones'],
    howCommon: 'muy_comun',
  }),
  faq({
    id: 'impuestos-cripto-uruguay',
    question: '¿Qué impuestos pago por cripto en Uruguay?',
    shortAnswer:
      'No publiques una tasa automática: la calificación y fuente de cada operación siguen requiriendo análisis del caso.',
    answer:
      'La regulación BCU de proveedores no es una norma tributaria. Las fuentes primarias auditadas del régimen 2026 de rentas del exterior no fijan una regla específica y completa para toda compraventa, staking o pago con cripto; conservá costo, fecha, moneda, comisiones y consultá a DGI o un profesional antes de declarar cero o aplicar una tasa por analogía.',
    category: 'cripto',
    sourceIds: ['ley-activos-virtuales', 'decreto-95-026'],
    basis: 'zona-gris',
    tags: ['impuestos cripto', 'IRPF', 'staking', 'ganancia', 'DGI'],
    howCommon: 'muy_comun',
    related: [{ label: 'Ver la zona gris tributaria', to: '/impuestos-inversiones-uruguay' }],
  }),
  faq({
    id: 'banco-rechaza-cripto',
    question: '¿El banco está obligado a aceptar transferencias vinculadas a cripto?',
    shortAnswer:
      'No hay una obligación general de procesar toda operación; la entidad puede aplicar contrato, riesgo y controles.',
    answer:
      'Avisá el origen y destino real y conservá estados de exchange, comprobantes y trazabilidad. Si bloquean o rechazan, pedí fundamento y reclamá por el canal formal; la regulación del proveedor cripto no obliga automáticamente a cada banco a aceptar la transferencia.',
    category: 'cripto',
    sourceIds: ['bcu-cripto-riesgos', 'bcu-reclamos', 'bcu-psav-2026'],
    basis: 'procedimiento',
    tags: ['banco', 'transferencia cripto', 'origen de fondos', 'reclamo'],
  }),
  faq({
    id: 'custodia-wallet-claves',
    question: '¿Qué riesgo hay al guardar cripto en una plataforma o wallet?',
    shortAnswer:
      'En custodia dependés del proveedor; en autocustodia, perder o revelar la clave puede dejarte sin acceso.',
    answer:
      'El BCU destaca volatilidad, fraude, dificultad de reconversión y cuidado de claves. Verificá recuperaciones, beneficiarios, red y copias seguras antes de mover fondos; nunca ingreses la frase semilla en un enlace recibido ni transfieras para “validar” una billetera.',
    category: 'cripto',
    sourceIds: ['bcu-cripto-riesgos', 'bcu-seguridad-pagos', 'bcu-psav-2026'],
    basis: 'procedimiento',
    tags: ['wallet', 'custodia', 'seed phrase', 'claves', 'exchange'],
    howCommon: 'muy_comun',
  }),
])

export function personalFaqSources(faqEntry: PersonalFaq): PersonalFaqSource[] {
  return faqEntry.sourceIds
    .map(sourceId => PERSONAL_FAQ_SOURCES[sourceId])
    .filter((source): source is PersonalFaqSource => Boolean(source))
}

export function faqsByCategory(faqs: readonly PersonalFaq[] = PERSONAL_FAQS): Array<{
  category: FaqCategory
  label: string
  description: string
  icon: string
  items: PersonalFaq[]
}> {
  return FAQ_CATEGORIES.map(category => ({
    category: category.id,
    label: category.label,
    description: category.description,
    icon: category.icon,
    items: faqs.filter(faqEntry => faqEntry.category === category.id),
  })).filter(group => group.items.length > 0)
}

export function getFaq(id: string): PersonalFaq | undefined {
  return PERSONAL_FAQS.find(faqEntry => faqEntry.id === id)
}

export function normalizeFaqText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function faqHaystack(faqEntry: PersonalFaq): string {
  return normalizeFaqText(
    [faqEntry.id, faqEntry.question, faqEntry.shortAnswer, faqEntry.answer, ...faqEntry.tags].join(
      ' '
    )
  )
}

// app/utils/personalFinance.ts
// PURE data + helpers for /salud-financiera (no Vue/Nuxt imports) so the page and
// tests share one source of truth. Two datasets:
//   1) INCOME_IDEAS — realistic extra-income ("ingresos extra") ideas for someone
//      living in Uruguay, with effort, capital, potential and a UY-specific note
//      (local platforms + formalization: monotributo / empresa unipersonal / DGI).
//   2) HEALTH_PILLARS — a 5-pillar personal financial-health checklist plus a
//      pure, weighted 0–100 scorer (`scoreHealth`) driving the interactive
//      self-assessment on the page.
// Informational only, not financial advice.

// ─────────────────────────────────────────────────────────────────────────────
// Extra-income ideas
// ─────────────────────────────────────────────────────────────────────────────

export type IncomeCategory =
  | 'digital_freelance'
  | 'servicios_locales'
  | 'comercio_reventa'
  | 'alquiler_activos'
  | 'contenido_creador'
  | 'micro_negocio'

export type EffortLevel = 'bajo' | 'medio' | 'alto'

export interface IncomeIdea {
  /** kebab-case id, unique across {@link INCOME_IDEAS}. */
  id: string
  name: string
  category: IncomeCategory
  effort: EffortLevel
  /** Capital inicial estimado (texto libre, ej. "Casi nulo", "$5.000–$20.000"). */
  startupCapital: string
  /** Potencial de ingreso, en términos cualitativos honestos. */
  incomePotential: string
  /** Cuánto suele tardar el primer ingreso. */
  timeToFirst: string
  /** Habilidades o requisitos principales. */
  skills: string[]
  /** Cómo empezar, en una o dos frases accionables. */
  howToStart: string
  /** Nota específica de Uruguay: plataformas locales + formalización (monotributo/DGI/BPS). */
  uyNote: string
  /** Riesgos o advertencias a tener en cuenta. */
  risks?: string
}

export const INCOME_CATEGORIES: Readonly<Record<IncomeCategory, string>> = Object.freeze({
  digital_freelance: 'Trabajo digital y freelance',
  servicios_locales: 'Servicios locales',
  comercio_reventa: 'Comercio y reventa',
  alquiler_activos: 'Alquilar lo que ya tenés',
  contenido_creador: 'Contenido y creador',
  micro_negocio: 'Micro-emprendimientos',
})

export const INCOME_IDEAS: IncomeIdea[] = [
  // ── Trabajo digital y freelance ─────────────────────────────────────────────
  {
    id: 'freelance-digital',
    name: 'Freelance digital (programación, diseño, redacción, marketing)',
    category: 'digital_freelance',
    effort: 'medio',
    startupCapital: 'Casi nulo (computadora e internet)',
    incomePotential: 'Medio a alto según la habilidad y la moneda del cliente',
    timeToFirst: '2 a 6 semanas',
    skills: [
      'Una habilidad vendible',
      'Perfil/portfolio',
      'Inglés (suma para clientes del exterior)',
    ],
    howToStart:
      'Armá un perfil en Workana, Upwork o Fiverr, mostrá 2 o 3 trabajos de ejemplo y postulá todos los días a proyectos chicos para juntar reseñas.',
    uyNote:
      'Cobrar del exterior en dólares es una gran ventaja frente a la inflación en pesos. Si el ingreso se vuelve regular, evaluá formalizarte (empresa unipersonal en BPS + inscripción en DGI, o monotributo si calificás) para poder facturar; muchos clientes y plataformas lo piden.',
    risks: 'Ingresos irregulares al principio; comisiones de plataforma y de conversión de moneda.',
  },
  {
    id: 'asistente-virtual',
    name: 'Asistente virtual / atención al cliente remota',
    category: 'digital_freelance',
    effort: 'bajo',
    startupCapital: 'Casi nulo',
    incomePotential: 'Bajo a medio; escala con horas y clientes',
    timeToFirst: '1 a 4 semanas',
    skills: ['Organización', 'Comunicación', 'Manejo de herramientas de oficina'],
    howToStart:
      'Ofrecé gestión de agenda, mails, redes o soporte a pequeños negocios y emprendedores; conseguí el primer cliente por recomendación o en grupos de trabajo remoto.',
    uyNote:
      'Alta demanda de pymes uruguayas que quieren tercerizar tareas administrativas. Formalizá con factura cuando el vínculo sea estable.',
  },
  {
    id: 'clases-particulares',
    name: 'Clases particulares y tutorías (idiomas, materias, música)',
    category: 'digital_freelance',
    effort: 'bajo',
    startupCapital: 'Casi nulo',
    incomePotential: 'Bajo a medio por hora',
    timeToFirst: '1 a 3 semanas',
    skills: ['Dominio de una materia', 'Paciencia', 'Didáctica'],
    howToStart:
      'Publicá en grupos de tu barrio, en la facultad o en plataformas como Superprof; empezá presencial o por videollamada.',
    uyNote:
      'El inglés y las materias de facultad (cálculo, contabilidad, programación) tienen demanda estable. Ideal para estudiantes avanzados.',
  },
  // ── Servicios locales ───────────────────────────────────────────────────────
  {
    id: 'delivery-apps',
    name: 'Reparto en apps (PedidosYa, Rappi) o cadetería propia',
    category: 'servicios_locales',
    effort: 'medio',
    startupCapital: 'Bajo (bici/moto y celular)',
    incomePotential: 'Bajo a medio; depende de horas y propinas',
    timeToFirst: 'Días',
    skills: ['Movilidad', 'Conocer la ciudad', 'Disponibilidad horaria'],
    howToStart:
      'Registrate como repartidor en la app, o armá tu propia cadetería para comercios de tu zona que no usan plataformas.',
    uyNote:
      'Ingreso rápido y flexible en Montevideo y ciudades grandes. La cadetería propia para comercios locales evita la comisión de la app y fideliza clientes.',
    risks: 'Desgaste físico, clima y costos de combustible/mantenimiento.',
  },
  {
    id: 'servicios-a-domicilio',
    name: 'Servicios a domicilio (limpieza, jardinería, fletes, arreglos)',
    category: 'servicios_locales',
    effort: 'medio',
    startupCapital: 'Bajo a medio (herramientas)',
    incomePotential: 'Medio; alto si sumás ayudantes',
    timeToFirst: '1 a 3 semanas',
    skills: ['Oficio o disposición a aprender', 'Confiabilidad'],
    howToStart:
      'Ofrecé el servicio en tu barrio y en grupos de compra-venta; pedí que te recomienden tras cada trabajo bien hecho.',
    uyNote:
      'El boca a boca y los grupos de Facebook/WhatsApp barriales mueven mucho trabajo. Al formalizarte podés facturar a empresas y consorcios, que suelen pagar mejor.',
  },
  // ── Comercio y reventa ──────────────────────────────────────────────────────
  {
    id: 'venta-online-mercadolibre',
    name: 'Venta online (MercadoLibre, marketplaces, redes)',
    category: 'comercio_reventa',
    effort: 'medio',
    startupCapital: 'Variable ($5.000 en adelante para stock)',
    incomePotential: 'Medio; escala con volumen y margen',
    timeToFirst: '1 a 4 semanas',
    skills: ['Encontrar productos con margen', 'Fotos y descripciones', 'Atención al cliente'],
    howToStart:
      'Empezá vendiendo cosas que ya no usás para aprender la logística, después conseguí un proveedor y un nicho con demanda.',
    uyNote:
      'MercadoLibre Uruguay es el canal más usado; cuidá el margen después de comisiones y envío. Para importar productos y revender, calculá el costo real puesto en Uruguay con nuestra calculadora de importación antes de comprar.',
    risks: 'Capital inmovilizado en stock; competencia de precios.',
  },
  {
    id: 'importacion-reventa',
    name: 'Importar y revender (compras del exterior)',
    category: 'comercio_reventa',
    effort: 'alto',
    startupCapital: 'Medio (stock + impuestos de importación)',
    incomePotential: 'Medio a alto con el nicho correcto',
    timeToFirst: '3 a 8 semanas',
    skills: ['Análisis de costos', 'Detectar tendencias', 'Logística'],
    howToStart:
      'Elegí un nicho, calculá el costo final puesto en Uruguay (producto + envío + impuestos) y validá el precio de venta antes de traer stock.',
    uyNote:
      'La franquicia de courier (hasta USD 800 anuales en varios envíos) y el régimen general cambian mucho el costo final. Usá nuestro carrito de importación para no perder plata en los impuestos.',
    risks: 'Tipo de cambio, demoras en aduana e impuestos mal calculados pueden borrar el margen.',
  },
  // ── Alquilar lo que ya tenés ────────────────────────────────────────────────
  {
    id: 'alquiler-temporario',
    name: 'Alquiler temporario (habitación o propiedad)',
    category: 'alquiler_activos',
    effort: 'medio',
    startupCapital: 'Bajo si ya tenés el espacio',
    incomePotential: 'Medio a alto en temporada',
    timeToFirst: '2 a 6 semanas',
    skills: ['Atención al huésped', 'Fotos', 'Limpieza y mantenimiento'],
    howToStart:
      'Publicá una habitación o tu propiedad en Airbnb o Booking; cuidá las primeras reseñas, que son las que traen las siguientes reservas.',
    uyNote:
      'Punta del Este, Colonia y Montevideo tienen fuerte demanda estacional (verano y turismo regional). Los ingresos por alquiler tributan; consultá el tratamiento con un contador.',
    risks: 'Estacionalidad marcada; desgaste del inmueble.',
  },
  {
    id: 'alquiler-auto-herramientas',
    name: 'Alquilar auto, herramientas o equipos que no usás',
    category: 'alquiler_activos',
    effort: 'bajo',
    startupCapital: 'Nulo (usás lo que ya tenés)',
    incomePotential: 'Bajo a medio',
    timeToFirst: 'Días a semanas',
    skills: ['Confianza en el trato', 'Cuidado del activo'],
    howToStart:
      'Ofrecé el auto para apps de movilidad/turismo o alquilá herramientas y equipos puntuales en grupos locales.',
    uyNote:
      'Sirve para rentabilizar un activo ocioso. Dejá todo por escrito y considerá un seguro adecuado al uso.',
    risks: 'Daños o mal uso del bien alquilado.',
  },
  // ── Contenido y creador ─────────────────────────────────────────────────────
  {
    id: 'creador-contenido',
    name: 'Creador de contenido (YouTube, TikTok, streaming, newsletter)',
    category: 'contenido_creador',
    effort: 'alto',
    startupCapital: 'Bajo (celular y constancia)',
    incomePotential: 'Muy variable; alto en el largo plazo si funciona',
    timeToFirst: '3 a 12 meses',
    skills: ['Constancia', 'Un tema/nicho', 'Edición básica'],
    howToStart:
      'Elegí un nicho que domines, publicá de forma constante y recién después sumá monetización (publicidad, membresías, auspicios).',
    uyNote:
      'La monetización directa en Uruguay puede tardar; los primeros ingresos suelen venir de canjes y auspicios de marcas locales antes que de la plataforma.',
    risks: 'Alta tasa de abandono; ingresos lentos e inciertos al inicio.',
  },
  {
    id: 'artesanias-hechos-a-mano',
    name: 'Artesanías y productos hechos a mano',
    category: 'contenido_creador',
    effort: 'medio',
    startupCapital: 'Bajo a medio (materiales)',
    incomePotential: 'Bajo a medio',
    timeToFirst: '2 a 6 semanas',
    skills: ['Un oficio creativo', 'Fotografía de producto', 'Redes sociales'],
    howToStart: 'Vendé por Instagram y en ferias; sumá MercadoLibre para llegar a todo el país.',
    uyNote:
      'Las ferias (Tristán Narvaja, ferias de diseño, eventos) y la venta por Instagram son el canal clásico. Algunas tiendas aceptan consignación.',
  },
  // ── Micro-emprendimientos ───────────────────────────────────────────────────
  {
    id: 'comida-casera',
    name: 'Comida casera (viandas, pastelería, catering)',
    category: 'micro_negocio',
    effort: 'alto',
    startupCapital: 'Bajo a medio (insumos y equipamiento)',
    incomePotential: 'Medio; escala con pedidos fijos',
    timeToFirst: '1 a 4 semanas',
    skills: ['Cocina', 'Organización', 'Higiene y presentación'],
    howToStart:
      'Empezá con un menú acotado para oficinas o eventos cercanos y crecé con los pedidos recurrentes.',
    uyNote:
      'Para vender comida hay que cumplir la habilitación bromatológica municipal (Intendencia) y buenas prácticas; formalizá el emprendimiento (monotributo o empresa unipersonal) para vender tranquilo.',
    risks: 'Requisitos sanitarios; márgenes ajustados si no controlás costos.',
  },
  {
    id: 'monotributo-social-mides',
    name: 'Emprendimiento formalizado con Monotributo (o Monotributo Social MIDES)',
    category: 'micro_negocio',
    effort: 'medio',
    startupCapital: 'Bajo',
    incomePotential: 'Bajo a medio, con acceso a vender formalmente',
    timeToFirst: '2 a 6 semanas',
    skills: ['Un producto o servicio', 'Gestión básica'],
    howToStart:
      'Registrá tu actividad como monotributista para poder facturar, acceder a beneficios de BPS y crecer sin informalidad.',
    uyNote:
      'El Monotributo (BPS/DGI) es un régimen simplificado para pequeños negocios con topes de facturación; el Monotributo Social MIDES apunta a emprendimientos personales o asociativos de menores recursos. Verificá topes y requisitos vigentes en bps.gub.uy antes de inscribirte.',
  },
]

export function effortLabel(e: EffortLevel): string {
  const labels: Record<EffortLevel, string> = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' }
  return labels[e]
}

/** Income ideas grouped by category, in {@link INCOME_CATEGORIES} order. */
export function incomeIdeasByCategory(): Array<{
  category: IncomeCategory
  label: string
  items: IncomeIdea[]
}> {
  return (Object.keys(INCOME_CATEGORIES) as IncomeCategory[]).map(category => ({
    category,
    label: INCOME_CATEGORIES[category],
    items: INCOME_IDEAS.filter(i => i.category === category),
  }))
}

export function getIncomeIdea(id: string): IncomeIdea | undefined {
  return INCOME_IDEAS.find(i => i.id === id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Personal financial-health checklist + scorer
// ─────────────────────────────────────────────────────────────────────────────

export interface HealthItem {
  /** unique id across all pillars — used as the checkbox key + score input. */
  id: string
  label: string
  /** Importance 1–3 (higher = weighs more in the score). */
  weight: number
  tip?: string
}

export interface HealthPillar {
  id: string
  title: string
  summary: string
  icon: string
  items: HealthItem[]
}

export const HEALTH_PILLARS: readonly HealthPillar[] = Object.freeze([
  {
    id: 'presupuesto',
    title: 'Presupuesto y control de gastos',
    summary: 'Sabés cuánto entra, cuánto sale y en qué se va tu plata.',
    icon: 'mdi-clipboard-list-outline',
    items: [
      {
        id: 'pre-registro',
        label: 'Registro mis ingresos y gastos todos los meses',
        weight: 3,
        tip: 'Una app o una planilla simple alcanza.',
      },
      {
        id: 'pre-presupuesto',
        label: 'Tengo un presupuesto mensual y trato de respetarlo',
        weight: 2,
      },
      {
        id: 'pre-gasto-menor',
        label: 'Gasto menos de lo que gano (me sobra algo a fin de mes)',
        weight: 3,
      },
      {
        id: 'pre-hormiga',
        label: 'Identifico y controlo mis "gastos hormiga"',
        weight: 1,
        tip: 'Cafés, delivery, suscripciones que no uso.',
      },
    ],
  },
  {
    id: 'emergencia',
    title: 'Fondo de emergencia',
    summary: 'Un colchón para imprevistos sin tener que endeudarte.',
    icon: 'mdi-lifebuoy',
    items: [
      { id: 'eme-existe', label: 'Tengo dinero separado solo para emergencias', weight: 3 },
      {
        id: 'eme-3-6',
        label: 'Ese fondo cubre entre 3 y 6 meses de mis gastos',
        weight: 3,
        tip: 'Si tu ingreso es muy variable, apuntá a 6 meses.',
      },
      {
        id: 'eme-liquido',
        label: 'Está en un lugar líquido y accesible (no invertido en algo riesgoso)',
        weight: 2,
      },
      {
        id: 'eme-inflacion',
        label: 'Lo protejo de la inflación (parte en UI o dólares según mi caso)',
        weight: 1,
      },
    ],
  },
  {
    id: 'deudas',
    title: 'Manejo de deudas',
    summary: 'Tus deudas están bajo control y no te comen el sueldo.',
    icon: 'mdi-scale-balance',
    items: [
      { id: 'deu-conozco', label: 'Sé exactamente cuánto debo y a qué tasa', weight: 3 },
      {
        id: 'deu-no-corriente',
        label: 'No uso tarjeta ni créditos para cubrir gastos corrientes',
        weight: 2,
      },
      {
        id: 'deu-sin-cara',
        label: 'No arrastro deudas caras (tarjeta en cuotas, préstamos al día)',
        weight: 3,
      },
      {
        id: 'deu-cuota-sana',
        label: 'Mis cuotas suman bastante menos de la mitad de mi ingreso',
        weight: 2,
        tip: 'Como referencia general, mantené las cuotas por debajo del 30–35% del ingreso.',
      },
    ],
  },
  {
    id: 'ahorro',
    title: 'Ahorro e inversión',
    summary: 'Tu dinero crece en vez de perder valor quieto.',
    icon: 'mdi-piggy-bank-outline',
    items: [
      {
        id: 'aho-fijo',
        label: 'Ahorro un porcentaje fijo de mis ingresos cada mes',
        weight: 3,
        tip: 'Regla útil: 50% necesidades, 30% gustos, 20% ahorro.',
      },
      {
        id: 'aho-automatico',
        label: 'El ahorro es automático (lo separo apenas cobro)',
        weight: 2,
      },
      {
        id: 'aho-rinde',
        label: 'Parte de mi ahorro está en algo que rinde o me protege de la inflación',
        weight: 2,
      },
      {
        id: 'aho-objetivos',
        label: 'Tengo objetivos concretos (corto, mediano y largo plazo)',
        weight: 1,
      },
    ],
  },
  {
    id: 'proteccion',
    title: 'Protección y futuro',
    summary: 'Estás cubierto ante imprevistos grandes y pensás en el largo plazo.',
    icon: 'mdi-shield-check-outline',
    items: [
      { id: 'pro-salud', label: 'Tengo cobertura de salud (mutualista o seguro)', weight: 2 },
      {
        id: 'pro-seguros',
        label: 'Tengo seguros para los riesgos que me pueden fundir (hogar, auto, vida si aplica)',
        weight: 1,
      },
      { id: 'pro-aportes', label: 'Aporto a BPS/AFAP o tengo previsto mi retiro', weight: 2 },
      { id: 'pro-plan', label: 'Pienso y planifico mi jubilación / futuro financiero', weight: 1 },
    ],
  },
])

export type HealthLevel = 'critico' | 'enproceso' | 'saludable' | 'solido'

export interface HealthResult {
  /** 0–100. */
  score: number
  level: HealthLevel
  checkedCount: number
  totalCount: number
}

/** Every checklist item id, in pillar order. */
export function allHealthItemIds(): string[] {
  return HEALTH_PILLARS.flatMap(p => p.items.map(i => i.id))
}

/** Sum of every item weight — the score denominator. */
export function maxHealthWeight(): number {
  return HEALTH_PILLARS.reduce((s, p) => s + p.items.reduce((a, i) => a + i.weight, 0), 0)
}

/**
 * Weighted 0–100 financial-health score from the set of checked item ids.
 * Unknown ids are ignored, so it is safe to pass stale selections.
 */
export function scoreHealth(checkedIds: Iterable<string>): HealthResult {
  const checked = new Set(checkedIds)
  const items = HEALTH_PILLARS.flatMap(p => p.items)
  const totalWeight = items.reduce((a, i) => a + i.weight, 0)
  const gotWeight = items.reduce((a, i) => (checked.has(i.id) ? a + i.weight : a), 0)
  const score = totalWeight === 0 ? 0 : Math.round((gotWeight / totalWeight) * 100)
  const checkedCount = items.reduce((a, i) => (checked.has(i.id) ? a + 1 : a), 0)
  const level: HealthLevel =
    score < 40 ? 'critico' : score < 65 ? 'enproceso' : score < 85 ? 'saludable' : 'solido'
  return { score, level, checkedCount, totalCount: items.length }
}

export const HEALTH_LEVELS: Readonly<
  Record<HealthLevel, { label: string; color: string; advice: string }>
> = Object.freeze({
  critico: {
    label: 'En rojo',
    color: 'error',
    advice:
      'Empezá por lo básico: registrá tus gastos un mes y armá un fondo de emergencia, aunque sea chico. Ese primer colchón cambia todo.',
  },
  enproceso: {
    label: 'En proceso',
    color: 'warning',
    advice:
      'Vas encaminado. Reforzá el fondo de emergencia hasta 3–6 meses y ordená tus deudas antes de sumar inversiones.',
  },
  saludable: {
    label: 'Saludable',
    color: 'info',
    advice:
      'Tenés una base sólida. Es buen momento para automatizar el ahorro y empezar a invertir parte para ganarle a la inflación.',
  },
  solido: {
    label: 'Sólido',
    color: 'success',
    advice:
      'Excelente salud financiera. Enfocate en optimizar impuestos, diversificar inversiones y planificar objetivos de largo plazo.',
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Datos útiles de Uruguay (verificados contra fuentes oficiales, jul 2026)
// Cada cifra fue chequeada contra DGI/BPS/BCU/gub.uy; las que son guía general de
// educación financiera (no norma) van marcadas con `official: false`.
// ─────────────────────────────────────────────────────────────────────────────

export interface UyFact {
  fact: string
  sourceLabel: string
  sourceUrl: string
  /** true = dato oficial verificado; false = guía general de educación financiera. */
  official: boolean
}

export const UY_FACTS: readonly UyFact[] = Object.freeze([
  {
    fact: 'El Monotributo (BPS + DGI) unifica en un solo pago los aportes y los impuestos nacionales; está pensado para emprendimientos de reducida dimensión. En 2025 el tope de ingresos anuales es de 183.000 UI (≈ $1.129.055) para el monotributista unipersonal y 305.000 UI (≈ $1.881.759) para la sociedad de hecho de 2 socios, con un tope de activos de 152.500 UI (≈ $940.879).',
    sourceLabel: 'DGI — Tope de ingresos y activos del monotributo',
    sourceUrl:
      'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tope-ingresos-activos-anuales-monotributo',
    official: true,
  },
  {
    fact: 'El Monotributo Social MIDES está dirigido a personas en situación de vulnerabilidad socioeconómica: tiene aportes reducidos, requiere autorización previa del MIDES y da acceso a jubilación y cobertura de salud. Es ideal para formalizar un emprendimiento personal chico.',
    sourceLabel: 'BPS — Monotributo Social MIDES',
    sourceUrl: 'https://www.bps.gub.uy/10449/monotributo-social-mides.html',
    official: true,
  },
  {
    fact: 'La empresa unipersonal es la forma más común de formalizar una actividad freelance: se inscribe a la vez ante BPS y DGI como persona física contribuyente, y el trámite puede iniciarse online por los Servicios en Línea de BPS.',
    sourceLabel: 'gub.uy — Inscripción de empresa unipersonal',
    sourceUrl: 'https://www.gub.uy/tramites/inscripcion-empresa-unipersonal',
    official: true,
  },
  {
    fact: 'Desde el 1 de enero de 2025, la facturación electrónica (e-factura) es obligatoria para prácticamente todos los contribuyentes de IVA, incluidos independientes y profesionales. Requiere un certificado digital (costo aproximado $5.300 por 2 años).',
    sourceLabel: 'DGI — Universalización de la facturación electrónica',
    sourceUrl:
      'https://www.efactura.dgi.gub.uy/principal/ampliacion_de_contenido/universalizacion-de-facturacion-electronica-plazo-para-restantes-contribuyentes-de-iva',
    official: true,
  },
  {
    fact: 'Un trabajador independiente paga IRPF cuando su ingreso mensual sin IVA supera 7 BPC. Puede deducir un 30% ficto por gastos (o los gastos reales), hace anticipos bimestrales y presenta una declaración jurada anual. Si además tenés un empleo en relación de dependencia, ambos ingresos se combinan y pueden ubicarte en una franja más alta.',
    sourceLabel: 'DGI — IRPF para trabajadores independientes',
    sourceUrl:
      'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-para-trabajadores-independientes',
    official: true,
  },
  {
    fact: 'La Base de Prestaciones y Contribuciones (BPC) es de $6.576 desde el 1 de enero de 2025. Es la unidad de referencia de muchos topes tributarios y prestaciones, por lo que conviene tenerla presente al calcular impuestos.',
    sourceLabel: 'BPS — Valor de la BPC 2025',
    sourceUrl:
      'https://www.gpa.uy/posts/informes/8926-base-de-prestaciones-y-contribuciones-bpc-a-partir-del-1o-de-enero-de-2025/',
    official: true,
  },
  {
    fact: 'El IRPF sobre el arrendamiento de inmuebles es del 12% anual (rendimientos de capital inmobiliario); el 10,5% que retiene la inmobiliaria es solo un anticipo mensual, no la tasa del impuesto. Los ingresos por alquiler —incluido el turístico— deben declararse, con una exención de hasta 40 BPC anuales en ciertos casos.',
    sourceLabel: 'DGI — IRPF rendimientos de capital inmobiliario',
    sourceUrl:
      'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-inmobiliario-0',
    official: true,
  },
  {
    fact: 'La Unidad Indexada (UI), creada por la Ley 17.761, se ajusta a diario según la inflación (IPC) y conserva el poder de compra. Ahorrar en pesos en una caja de ahorro común hace perder valor frente a la inflación; una parte del ahorro en UI o en dólares lo protege.',
    sourceLabel: 'INE / BCU — Unidad Indexada',
    sourceUrl: 'https://www5.ine.gub.uy/',
    official: true,
  },
  {
    fact: 'El Banco Central del Uruguay tiene un rango meta de inflación de 3% a 6% anual (punto medio 4,5%). Esto implica que el dinero en efectivo o en cuentas sin rendimiento pierde poder de compra año a año.',
    sourceLabel: 'BCU — Política monetaria',
    sourceUrl: 'https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Paginas/Default.aspx',
    official: true,
  },
  {
    fact: 'Regla general de educación financiera: mantené un fondo de emergencia de entre 3 y 6 meses de gastos esenciales. Con ingresos variables (freelance, changas) conviene apuntar al extremo superior. No es una norma oficial uruguaya, sino una guía ampliamente recomendada.',
    sourceLabel: 'Guía general de educación financiera',
    sourceUrl: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/EducacionFinanciera.aspx',
    official: false,
  },
])

export function getIncomeIdeasCount(): number {
  return INCOME_IDEAS.length
}

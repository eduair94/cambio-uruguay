// El catálogo de lo que existe en este sitio porque alguien lo pidió.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) para que lo puedan
// leer la página, el sitemap y los tests en Node pelado.
//
// Regla de contenido, y es la que hace útil a la página: acá sólo entra lo que
// se puede verificar sin creernos nada — un endpoint que responde, una página
// publicada, un issue abierto en GitHub. Nada de "un usuario sugirió" sin algo
// que se pueda abrir y mirar.
//
// Regla de privacidad, y es la que la hace publicable: se cuenta QUÉ se pidió y
// QUÉ se hizo, nunca quién. Una casilla de correo es un dato personal (Ley
// 18.331, art. 4 lit. D) y difundirla exige un consentimiento que nadie da al
// escribir una consulta técnica (art. 17). Lo mismo vale para el nombre, la
// carrera o la cátedra. Un issue de GitHub es público por definición, así que se
// enlaza el issue — no a su autor.
import { redditGuides } from './guidesReddit'

/** Por dónde llegó el pedido. Cambia qué se puede publicar de él. */
export type RequestChannel = 'correo' | 'issue' | 'publico'

export interface RequestedFeatureLink {
  /** Ruta interna (pre-`localePath`). */
  to?: string
  /** URL externa, cuando lo que se enlaza vive fuera del sitio. */
  href?: string
  label: string
}

export interface RequestedFeature {
  id: string
  title: string
  channel: RequestChannel
  /** Cuándo se publicó lo que se hizo (`YYYY-MM-DD`). */
  shippedOn: string
  /** Cuándo llegó el pedido, si se sabe con precisión. */
  askedOn?: string
  /** Qué se pidió, en términos funcionales. */
  asked: string
  /** Qué se construyó. */
  built: string
  /**
   * Lo no obvio: qué se aprendió haciéndolo, o qué casi sale mal. Es la parte
   * que convierte una lista de cambios en algo que vale la pena leer.
   */
  insight: string
  links: RequestedFeatureLink[]
}

export const REQUEST_CHANNELS: Record<
  RequestChannel,
  { label: string; icon: string; note: string }
> = {
  correo: {
    label: 'Por correo',
    icon: 'mdi-email-outline',
    note: 'Alguien escribió pidiendo algo concreto. Publicamos el pedido, nunca quién lo hizo.',
  },
  issue: {
    label: 'Por un issue',
    icon: 'mdi-github',
    note: 'Reportado en el repositorio público. El issue queda enlazado para que se pueda leer entero.',
  },
  publico: {
    label: 'Preguntado en público',
    icon: 'mdi-forum-outline',
    note: 'Nadie escribió: la pregunta estaba hecha en un foro y el sitio no la contestaba.',
  },
}

/**
 * Lo que se hizo a pedido, más nuevo primero.
 *
 * Cada entrada tiene que poder comprobarse desde la propia página: por eso todas
 * llevan al menos un enlace a la cosa terminada.
 */
export const REQUESTED_FEATURES: readonly RequestedFeature[] = Object.freeze([
  {
    id: 'regional',
    title: 'Cotizaciones de toda la región, con API y series históricas',
    channel: 'correo',
    askedOn: '2026-08-21',
    shippedOn: '2026-08-22',
    asked:
      'Un equipo de estudiantes de la Universidad Tecnológica (UTEC) amplió el alcance de su proyecto académico a las cotizaciones de la región y preguntó si existía algún endpoint que contemplara divisas regionales. No existía: la API era uruguaya.',
    built:
      'Quince fuentes públicas nuevas —cuatro de ellas bancos centrales— para Argentina, Brasil, Paraguay, Chile y Bolivia, unidas al tablero uruguayo propio. Seis endpoints (tablero, series diarias, inventario de series, comparación de rutas, conversión y catálogo de fuentes), tres páginas y series que arrancan en 2011 para los dólares argentinos y en 1995 para el fixing brasileño.',
    insight:
      '"El dólar" de un país no es un número: Argentina publica siete precios simultáneos y Brasil tiene un fixing legal más un precio de mostrador que difiere un 6,5 %. Por eso cada cotización dice de qué tipo es. La sorpresa fue la fuente de respaldo internacional: el mismo día que salió, estaba 39 % equivocada en el boliviano y 12 % en el peso uruguayo mientras acertaba el peso argentino. Ahora una referencia internacional que contradice al banco central del país queda afuera, y el motivo se publica.',
    links: [
      { to: '/cotizaciones-de-la-region', label: 'El tablero regional' },
      { to: '/api-cotizaciones-regionales', label: 'La API y su documentación' },
      { to: '/llevar-dolares-o-reales-a-brasil', label: '¿Dólares o reales para Brasil?' },
    ],
  },
  {
    id: 'intraday',
    title: 'Cotización y variación dentro del día',
    channel: 'correo',
    askedOn: '2026-08-20',
    shippedOn: '2026-08-20',
    asked:
      'Un estudiante de UTEC pidió poder consultar, además de la cotización del día, cuánto se movió dentro del mismo día.',
    built:
      '`GET /intraday` devuelve, para un día calendario de Montevideo, la apertura, el último valor, el máximo, el mínimo y la lista completa de cambios reales de cada casa de cambio, más una página que documenta el contrato.',
    insight:
      'La fila diaria de la base guarda el CIERRE, no la apertura: se sobrescribe en cada sincronización. Así que la apertura hay que reconstruirla del registro de cambios, y la respuesta trae un campo que dice por cuál de los cuatro caminos posibles se reconstruyó. Un endpoint que devolviera "apertura" sin decir eso estaría inventando precisión.',
    links: [{ to: '/api-cotizacion-intradia', label: 'La API intradía' }],
  },
  {
    id: 'guias-reddit',
    title: 'Guías escritas a partir de lo que la gente pregunta en público',
    channel: 'publico',
    shippedOn: '2026-08-11',
    asked:
      'Nadie escribió un correo: las preguntas ya estaban hechas en foros uruguayos —sueldos, alquileres, herencias, deudas, reclamos— y el sitio no las contestaba.',
    built: `${redditGuides.length} guías publicadas a partir de esas preguntas, cada una con la norma o la fuente primaria al lado, más el mecanismo que las detecta: cuando varias personas tropiezan con el mismo faltante en la misma página, eso se investiga.`,
    insight:
      'La trampa recurrente fue copiar listas que circulan por internet y son de otro país. Al escribir sobre estudios de cobranza no apareció ninguna norma uruguaya que limite la frecuencia de los llamados: se publicó la ausencia en vez de importar la regla argentina. Publicar "esto no está escrito en ningún lado" es información; inventar el límite habría sido cómodo y falso.',
    links: [
      { to: '/guias', label: 'Las guías' },
      { to: '/temas-de-dinero-reddit', label: 'De qué se habla' },
    ],
  },
  {
    id: 'casas-faltantes',
    title: 'Una casa rota dejaba al sitio con una sola cotización',
    channel: 'issue',
    askedOn: '2024-03-28',
    shippedOn: '2025-06-15',
    asked:
      'Un reporte en el repositorio mostró que la portada listaba una única casa de cambio, y llegó con el diagnóstico hecho: el parseo de una casa cortaba la sincronización de todas las demás.',
    built:
      'Hoy cada casa corre aislada: su propio try/catch, su propio tiempo máximo y un presupuesto total para la corrida. Si una falla, las otras 45 siguen, y el resultado por casa queda registrado y publicado.',
    insight:
      'Lo que arregló el problema no fue el parser de esa casa: fue dejar de tratar 46 scrapers como un solo proceso que se cae junto. Y la segunda mitad importa igual — una corrida que cubre la mitad de las casas es indistinguible de una sana si nadie cuenta cuántas respondieron, así que el estado por casa se publica en una página.',
    links: [
      { to: '/estado', label: 'Estado de los scrapers' },
      { href: 'https://github.com/eduair94/cambio-uruguay/issues/1', label: 'El issue original' },
    ],
  },
])

/** Las entradas de un canal, en el mismo orden del catálogo. */
export function featuresByChannel(channel: RequestChannel): RequestedFeature[] {
  return REQUESTED_FEATURES.filter(feature => feature.channel === channel)
}

/** Cuántos días pasaron entre el pedido y la publicación, si se sabe. */
export function turnaroundDays(feature: RequestedFeature): number | null {
  if (!feature.askedOn) return null
  const asked = Date.parse(`${feature.askedOn}T00:00:00Z`)
  const shipped = Date.parse(`${feature.shippedOn}T00:00:00Z`)
  if (Number.isNaN(asked) || Number.isNaN(shipped) || shipped < asked) return null
  return Math.round((shipped - asked) / 86_400_000)
}

/** "el mismo día", "al día siguiente", "en 3 días" — para el texto de la ficha. */
export function turnaroundLabel(feature: RequestedFeature): string | null {
  const days = turnaroundDays(feature)
  if (days === null) return null
  if (days === 0) return 'el mismo día'
  if (days === 1) return 'al día siguiente'
  if (days < 31) return `en ${days} días`
  const months = Math.round(days / 30)
  if (months < 12) return months === 1 ? 'en 1 mes' : `en ${months} meses`
  const years = Math.round(days / 365)
  return years === 1 ? 'en 1 año' : `en ${years} años`
}

/** Formato largo en español, para mostrar la fecha de publicación. */
export function shippedLabel(feature: RequestedFeature): string {
  const [year, month, day] = feature.shippedOn.split('-')
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'setiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  const name = months[Number(month) - 1]
  return name ? `${Number(day)} de ${name} de ${year}` : feature.shippedOn
}

// app/utils/redditStats.ts
// Los tipos y la lectura de la foto que escribe el job `currency-reddit-stats`, más las cuentas
// derivadas que la página /estadisticas-reddit necesita.
//
// Módulo PURO (sin Vue, sin Nuxt) para que la página y su test compartan una sola verdad. Nada acá
// pide datos: recibe el documento y lo interpreta.
//
// Por qué esta página existe: el sitio tiene una cuenta que comenta automáticamente en subreddits
// uruguayos. Publicar qué contestó, con qué enlazó y cómo cayó cada comentario es la forma de que
// eso sea verificable por cualquiera en vez de una afirmación. Y de paso es lo único que dice, con
// datos, qué páginas faltan escribir.

export interface RedditStatsDay {
  date: string
  posted: number
  rejected: number
  gaps: number
  score: number
  removed: number
}

export interface RedditStatsAnswer {
  postTitle: string
  postPermalink: string
  sub: string
  pagePath: string
  postedAt: string | Date | null
  score: number
  removed: boolean
  replyText: string
}

export interface RedditStatsCount {
  name: string
  count: number
}

export interface RedditStatsTotals {
  answered: number
  evaluated: number
  gaps: number
  subs: number
  pages: number
  score: number
  removed: number
  alive: number
}

export interface RedditStatsOpenQuestion {
  title: string
  sub: string
  permalink: string
  createdUtc: number
}

export interface RedditBotStats {
  key: string
  asOf: string | Date | null
  account: string
  totals: RedditStatsTotals
  since: string
  days: RedditStatsDay[]
  bySub: RedditStatsCount[]
  byPage: RedditStatsCount[]
  byRejectReason: RedditStatsCount[]
  answers: RedditStatsAnswer[]
  openQuestions: RedditStatsOpenQuestion[]
}

export const EMPTY_TOTALS: RedditStatsTotals = {
  answered: 0,
  evaluated: 0,
  gaps: 0,
  subs: 0,
  pages: 0,
  score: 0,
  removed: 0,
  alive: 0,
}

/**
 * Qué porcentaje de lo evaluado terminó en un comentario.
 *
 * Se publica a propósito, y es bajo — del orden de uno de cada cien. Eso NO es una falla: el bot lee
 * todo lo que se publica en los subs uruguayos y el sitio contesta preguntas de plata, así que la
 * enorme mayoría de los hilos no son suyos. Publicar el número evita la lectura contraria, que es la
 * que un moderador haría: que la cuenta comenta en todo lo que se mueve.
 */
export function answerRate(totals: RedditStatsTotals): number {
  if (!totals.evaluated) return 0
  return (totals.answered / totals.evaluated) * 100
}

/** Cuántos comentarios siguen vivos, en porcentaje. La medida de si las respuestas sirven. */
export function survivalRate(totals: RedditStatsTotals): number {
  if (!totals.answered) return 0
  return (totals.alive / totals.answered) * 100
}

/** Voto promedio de los comentarios publicados. */
export function averageScore(totals: RedditStatsTotals): number {
  if (!totals.answered) return 0
  return totals.score / totals.answered
}

/**
 * Los últimos N días, rellenando los que no tienen ninguna fila.
 *
 * Un gráfico que sólo dibuja los días con actividad miente sobre la cadencia: tres comentarios en
 * tres días seguidos y tres en tres semanas se ven idénticos. Los huecos son parte del dato.
 */
export function lastDays(
  days: readonly RedditStatsDay[],
  count: number,
  today = new Date()
): RedditStatsDay[] {
  const byDate = new Map(days.map(day => [day.date, day]))
  const out: RedditStatsDay[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const date = d.toISOString().slice(0, 10)
    out.push(byDate.get(date) ?? { date, posted: 0, rejected: 0, gaps: 0, score: 0, removed: 0 })
  }
  return out
}

/** El motivo de descarte, traducido a algo que se pueda leer sin conocer el código. */
export function explainReason(reason: string): string {
  const table: Record<string, string> = {
    'filter:off_topic': 'No era una pregunta de plata',
    'filter:not_a_question': 'No preguntaba nada: era un comentario o una noticia',
    'filter:too_old': 'El hilo ya tenía más de una semana',
    'filter:too_new': 'Recién publicado — se espera a que los moderadores hagan lo suyo',
    'filter:too_short': 'Demasiado corto para saber qué preguntaba',
    'filter:sensitive': 'Tema delicado: ahí hace falta una persona, no un bot',
    'filter:locked': 'El hilo estaba cerrado',
    'filter:stickied': 'Hilo fijado por los moderadores',
    'filter:nsfw': 'Marcado como contenido adulto',
    'filter:blocked_flair': 'Etiquetado como meme, humor, política o noticia',
    'filter:already_linked': 'Alguien ya había enlazado el sitio ahí',
    'filter:deleted_author': 'El autor había borrado su cuenta',
    'gap:weak_match': 'El sitio no tiene una página que conteste eso',
    'gap:no_clear_winner': 'El sitio toca el tema pero no contesta esa pregunta puntual',
    judge: 'El revisor decidió que la página no contestaba lo que preguntaban',
    judge_after_page: 'Se escribió una página para el hilo y aun así no lo contestaba',
    dead_link: 'La página que íbamos a enlazar no respondía',
    reddit_refused: 'Reddit rechazó el comentario',
    composer_empty: 'El redactor no devolvió nada',
    sub_no_escribible: 'Ese subreddit no admite bots, o baneó la cuenta',
  }
  if (table[reason]) return table[reason]!
  if (reason.startsWith('invalid_invented_number'))
    return 'La respuesta usaba una cifra sin fuente y se descartó'
  if (reason.startsWith('invalid_')) return 'La respuesta no pasó el control de estilo o de formato'
  if (reason.startsWith('limit:')) return 'Frenado por los topes de volumen del propio bot'
  return reason
}

/** Las reglas que el bot se impone, para publicarlas junto a los números. */
export interface BotRule {
  icon: string
  title: string
  body: string
}

export const BOT_RULES: readonly BotRule[] = Object.freeze([
  {
    icon: 'mdi-comment-outline',
    title: 'Sólo comenta, nunca abre hilos',
    body: 'La cuenta no puede publicar un hilo: el código se niega a hacerlo. Responde dentro de conversaciones que empezó otra persona, y nada más.',
  },
  {
    icon: 'mdi-robot-outline',
    title: 'Dice que es un bot en su perfil',
    body: 'La aclaración vive en la descripción de la cuenta. El bot la lee antes de publicar y, si no está, no publica.',
  },
  {
    icon: 'mdi-numeric',
    title: 'Ninguna cifra sin fuente',
    body: 'Cada número de cada respuesta tiene que aparecer literal en la página que se enlaza, en una fuente que descargamos, o en lo que escribió la propia persona. Si no, la respuesta se descarta entera.',
  },
  {
    icon: 'mdi-link-variant',
    title: 'Un solo enlace, y al final',
    body: 'La respuesta tiene que servir aunque no hagas clic. El enlace va al final, como el detalle, no como el motivo del comentario.',
  },
  {
    icon: 'mdi-gauge-low',
    title: 'Con techo, y con freno automático',
    body: 'Hay un tope por día y por subreddit, una espera entre comentario y comentario, y no se le contesta dos veces a la misma persona en una semana. Si tres respuestas caen mal en un día, se pausa solo.',
  },
  {
    icon: 'mdi-hand-back-left-outline',
    title: 'Hay temas donde no se mete',
    body: 'Juicios, salud, estafas en curso, despidos. Ahí hace falta una persona, y un bot con un enlace es oportunismo.',
  },
])

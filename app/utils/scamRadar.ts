// app/utils/scamRadar.ts
// "Estafas reportadas esta semana" — the live half of /estafas-uruguay.
//
// PURE (no Vue/Nuxt) so the page, the server task and the tests share one source of truth.
//
// WHAT THIS PUBLISHES, AND WHAT IT REFUSES TO
//
// It publishes MODUS OPERANDI: how the scam works, how many people reported something like it
// recently, and links to the threads. That is useful and safe.
//
// It does NOT republish a redditor's accusation against a named company. The legal shield we
// relied on for /advertencias-bcu (Código Penal art. 336 lit. B) protects reproducing the
// statement of an IDENTIFIED author on a matter of public interest — an anonymous account is not
// that, and "fulanito dice que la empresa X lo estafó" is precisely the sentence a court would
// look at. So `isSafeToQuote` rejects any fragment that names a company, and we quote only text
// that describes the mechanism. The reader still gets the link and can read the thread themselves.
//
// And the honesty rule that matters most: Reddit reports are ANECDOTES, not statistics. A count
// here is "how many people wrote about this", never "how common this is in Uruguay". The page
// says so.

/** A recognisable way people get robbed. Our description, their reports. */
export interface ScamPattern {
  id: string
  label: string
  icon: string
  /** How it works, in our words — so we never need to republish an accusation to explain it. */
  how: string
  /** The one thing that stops it. */
  defence: string
  /** Recognisers over normalised text. */
  matchers: readonly RegExp[]
}

const b = (body: string) => new RegExp(`(?<![a-z0-9])(?:${body})(?![a-z0-9])`, 'i')

export const SCAM_PATTERNS: readonly ScamPattern[] = Object.freeze([
  {
    id: 'phishing',
    label: 'Phishing / te llaman del "banco"',
    icon: 'mdi-fish',
    how: 'Te llega un SMS, un mail o una llamada que parece del banco: "detectamos un movimiento raro", "tenés que validar tu cuenta". Te mandan a una web igualita a la del banco, o te piden el código que te acaba de llegar por mensaje. Con eso entran.',
    defence:
      'El banco NUNCA te pide la clave ni el código que te llega por SMS. Cortá y llamá vos al número que figura en tu tarjeta. Nunca al número que te pasaron ellos.',
    matchers: [
      b('phishing'),
      b('vishing'),
      b('smishing'),
      /me (llamaron|escribieron|mandaron).{0,40}(del banco|haci[eé]ndose pasar)/i,
      /(link|enlace|p[aá]gina|web|sitio|app) (falso|falsa|trucho|trucha|clonad[oa])/i,
      /(c[oó]digo|clave|token).{0,30}(por sms|que me lleg|me pidieron|le di|lo di)/i,
      /(sms|mensaje|mail|correo|llamada).{0,40}(validar|verificar|confirmar).{0,20}(la )?(cuenta|tarjeta|datos)/i,
      /se hicieron pasar/i,
    ],
  },
  {
    id: 'clonacion',
    label: 'Clonación de tarjeta',
    icon: 'mdi-credit-card-off-outline',
    how: 'Aparecen consumos que no hiciste — a veces en el exterior, a veces chicos y repetidos para probar la tarjeta. No hace falta que te la roben: alcanza con los datos.',
    defence:
      'Avisá al emisor apenas lo veas y pedí constancia con fecha y hora: la ley reparte la responsabilidad según ese instante. Y acordate de que la carga de la prueba es del emisor.',
    matchers: [
      /me clonaron/i,
      /clonaci[oó]n/i,
      /(compras|consumos|gastos) que no (hice|reconozco|autoric)/i,
      /tarjeta.{0,25}clonada/i,
      /copiaron la tarjeta/i,
    ],
  },
  {
    id: 'marketplace',
    label: 'Vendedor que cobra y no entrega',
    icon: 'mdi-account-cancel-outline',
    how: 'Publicación por Marketplace, Facebook o Instagram, precio conveniente, te piden transferencia por adelantado. Transferís y desaparece. Es la que más plata deja sin recuperar, porque la transferencia la ordenaste vos.',
    defence:
      'No transfieras por adelantado a un desconocido. Si ya lo hiciste: pedile al banco POR ESCRITO que inmovilice los fondos en la cuenta de destino, y hacé la denuncia el mismo día. Cada hora cuenta.',
    matchers: [
      /(marketplace|facebook|instagram).{0,40}(estafa|estaf[oó]|no me lleg)/i,
      /transfer[ií].{0,40}(y (nunca|no) (me lleg|lo mand|apareci))/i,
      /vendedor.{0,30}(desapareci|no mand|no entreg)/i,
      /pagu[eé] y (nunca|no) (me lleg|lo recib)/i,
      /(falso|trucho) vendedor/i,
    ],
  },
  {
    id: 'inversion',
    label: 'Inversión que promete demasiado',
    icon: 'mdi-chart-line-variant',
    how: 'Rendimientos altos, fijos y "sin riesgo", casi siempre en dólares. Te muestran ganancias en una plataforma que maneja el propio estafador. Podés retirar al principio — hasta que querés sacar en serio.',
    defence:
      'Antes de poner un peso, fijate si la empresa está en el registro del BCU y si el BCU ya advirtió sobre ella. "Me pagó los primeros meses" no prueba nada: así funciona el esquema.',
    matchers: [
      b('ponzi'),
      b('piramide'),
      b('pir[aá]mide'),
      /(rendimiento|inter[eé]s|ganancia).{0,30}(garantizad|asegurad|fij[oa].{0,15}mensual)/i,
      /invert[ií].{0,40}(y no puedo (sacar|retirar)|desapareci)/i,
      /promet[ií]an.{0,20}\d+\s?%/i,
    ],
  },
  {
    id: 'prestamo-falso',
    label: 'Préstamo falso (te cobran por adelantado)',
    icon: 'mdi-cash-remove',
    how: 'Te "aprueban" un préstamo sin preguntar nada, y antes de darte la plata te piden un pago: gastos, seguro, "gestión". Pagás y no hay préstamo.',
    defence:
      'Un prestamista real te descuenta los costos del préstamo; no te los cobra antes. Si te piden plata por adelantado para darte plata, es una estafa.',
    // Deliberately narrow. A looser version matched "préstamos y adelanto de sueldo en la app" —
    // a legitimate product — and would have published a bank feature as a scam.
    matchers: [
      /(pr[eé]stamo|cr[eé]dito).{0,60}(me pidieron|me piden|ped[ií]an|tengo que pagar).{0,40}(por adelantado|antes de (darme|recibir|liberar))/i,
      /(para (liberar|destrabar|gestionar|aprobar)).{0,30}(el )?(pr[eé]stamo|cr[eé]dito)/i,
      /pagu[eé].{0,40}(y (nunca|no) me (dieron|dio|lleg[oó]|depositaron)).{0,30}(pr[eé]stamo|cr[eé]dito|plata)/i,
      /(pr[eé]stamo|cr[eé]dito).{0,40}(trucho|falso|estafa)/i,
    ],
  },
  {
    id: 'cuenta-vaciada',
    label: 'Te vacían el homebanking',
    icon: 'mdi-bank-transfer-out',
    how: 'Entran a tu cuenta y transfieren a terceros. A veces primero te cambian el teléfono o el mail asociados, para que no te lleguen los avisos.',
    defence:
      'Hoy el BCU ya exige doble factor para transferir a terceros. Si te vaciaron la cuenta sin doble factor, el banco incumplió una norma — y eso es una falla de seguridad del sistema, que la ley pone del lado del emisor.',
    matchers: [
      /me vaciaron (la cuenta|el banco|la caja)/i,
      /transferencias? que (no|nunca) (hice|autoric)/i,
      /entraron a mi (home ?banking|cuenta)/i,
      /(cambiaron|modificaron).{0,25}(mi (tel[eé]fono|correo|mail|celular))/i,
    ],
  },
])

/** One report we found in the corpus. */
export interface ScamMention {
  id: string
  text: string
  date: string
  permalink: string
  sub: string
  score: number
}

/** What we publish for one pattern. */
export interface ScamPatternReport {
  id: string
  label: string
  icon: string
  how: string
  defence: string
  /** How many reports we matched. It is a count of POSTS, never an incidence rate. */
  reports: number
  /** Reports in the last 90 days — what makes the radar a radar. */
  recent: number
  /** Links only. We never republish an accusation against a named company. */
  threads: Array<{ date: string; permalink: string; sub: string }>
  /** Fragments that explain the mechanism and name nobody. May be empty — that is fine. */
  quotes: Array<{ text: string; date: string; permalink: string; sub: string }>
}

/** Which patterns a piece of text reports. */
export function classifyScam(text: string): string[] {
  return SCAM_PATTERNS.filter(p => p.matchers.some(m => m.test(text))).map(p => p.id)
}

/**
 * Company names we must never let through in a quote. The tier-list brands plus the names that
 * turn up in fraud threads. This is a blunt instrument on purpose: a false positive costs us one
 * quote, a false negative costs us a defamation claim.
 */
const COMPANY_LIKE = [
  'brou',
  'itau',
  'itaú',
  'santander',
  'scotia',
  'bbva',
  'hsbc',
  'btg',
  'heritage',
  'prex',
  'mercado pago',
  'mercadopago',
  'astropay',
  'takenos',
  'midinero',
  'mi dinero',
  'oca',
  'creditel',
  'pronto',
  'abitab',
  'redpagos',
  'binance',
  'conexion ganadera',
  'conexión ganadera',
  'republica afap',
]

/**
 * Is this fragment safe to publish as a quote?
 *
 * Rejects anything that names a company, anything with a URL or a handle, and anything too long
 * to be a fragment. We would rather publish no quote than republish somebody's accusation.
 */
export function isSafeToQuote(text: string): boolean {
  const t = text.toLowerCase()
  if (text.length > 240 || text.length < 30) return false
  if (/https?:\/\/|www\.|u\/[\w-]{3,}|@\w{3,}/i.test(text)) return false
  // A capitalised multi-word name we do not recognise is still probably a company.
  if (COMPANY_LIKE.some(c => t.includes(c))) return false
  return true
}

/**
 * Is this someone telling us what happened to THEM, rather than commenting on the topic?
 *
 * On the real corpus the loudest matches were advice and banter — "usá Apple Pay para evitar la
 * clonación", "estos son los mismos que caen en un phishing y después postean acá". Publishing
 * those as "reportes" would be dressing up chat as evidence. A quote has to be a first-person
 * account of the thing happening.
 */
export function looksLikeReport(text: string): boolean {
  // "A mí JAMÁS me clonaron una tarjeta" is a first-person account of nothing happening. Quoting
  // it under "reportes" would say the opposite of what the person said.
  //
  // But the negation has to be tied to the VICTIMISATION verb, not to any verb: "nunca me llegó
  // el producto" is a report OF the scam, not a denial of it. Getting this wrong drops the very
  // reports we are looking for.
  const VICTIM_VERB = '(?:clonaron|estafaron|robaron|vaciaron|hackearon|pas[oó]|sucedi[oó])'
  if (new RegExp(`\\b(?:jam[aá]s|nunca|no)\\s+me\\s+${VICTIM_VERB}`, 'i').test(text)) {
    return false
  }
  const firstPerson = /\b(?:me|mi|nos|nuestra?)\b/i.test(text)
  // NOTE: no trailing `\b`. JS word boundaries are ASCII-only, so `\bperdí\b` never matches —
  // the "boundary" after "í" is not a boundary at all. This silently drops half the reports.
  const happened =
    /me (?:estafaron|clonaron|robaron|vaciaron|hackearon|sacaron)|no me (?:lleg[oó]|devolvieron|dieron)|nunca me lleg[oó]|perd[ií] (?:la plata|el dinero|todo)|desapareci[oó]|me pidieron|me llamaron|me escribieron|me mandaron|entraron a mi/i.test(
      text
    )
  return firstPerson && happened
}

const DAY = 86_400_000
const RECENT_DAYS = 90
/** Below this we do not show a pattern at all: a handful of anecdotes is not a trend. */
export const MIN_REPORTS = 5

export interface RadarOptions {
  now?: Date
}

/** Fold the corpus into the radar. Deterministic: no AI decides what counts as a scam report. */
export function buildRadar(
  mentions: readonly ScamMention[],
  opts: RadarOptions = {}
): ScamPatternReport[] {
  const now = opts.now ?? new Date()
  const cutoff = now.getTime() - RECENT_DAYS * DAY

  const out: ScamPatternReport[] = []

  for (const pattern of SCAM_PATTERNS) {
    const hits = mentions.filter(m => pattern.matchers.some(r => r.test(m.text)))
    if (hits.length < MIN_REPORTS) continue

    const byDateDesc = [...hits].sort((a, b) => b.date.localeCompare(a.date))
    const recent = hits.filter(m => {
      const t = Date.parse(m.date)
      return Number.isFinite(t) && t >= cutoff
    }).length

    const seenThreads = new Set<string>()
    const threads = byDateDesc
      .filter(m => m.permalink && !seenThreads.has(m.permalink) && seenThreads.add(m.permalink))
      .slice(0, 5)
      .map(m => ({ date: m.date, permalink: m.permalink, sub: m.sub }))

    // A quote must (a) name nobody, and (b) actually be a first-hand report rather than someone
    // giving advice about the topic. Both filters are allowed to leave us with zero quotes.
    const quotes = byDateDesc
      .filter(m => m.permalink && isSafeToQuote(m.text) && looksLikeReport(m.text))
      .slice(0, 2)
      .map(m => ({ text: m.text.trim(), date: m.date, permalink: m.permalink, sub: m.sub }))

    out.push({
      id: pattern.id,
      label: pattern.label,
      icon: pattern.icon,
      how: pattern.how,
      defence: pattern.defence,
      reports: hits.length,
      recent,
      threads,
      quotes,
    })
  }

  // Loudest first, but recency breaks the tie: a radar should show what is happening NOW.
  return out.sort((a, b) => b.recent - a.recent || b.reports - a.reports)
}

// Newsletter domain logic. Pure helpers (email validation, tokens, HTML email
// builder) are unit-tested; `buildDigestData` fetches live data (not unit-tested).
import { randomBytes } from 'node:crypto'
import { fetchNews } from './news'
import { sanitizeAi } from './ai'

export type NewsletterLang = 'es' | 'en' | 'pt'

export function normalizeEmail(raw: string): string {
  return (raw || '').trim().toLowerCase()
}

// Pragmatic email check: one @, a dotted domain, no whitespace. Not RFC-perfect
// (deliberately) — real validation is the double opt-in.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function newToken(): string {
  return randomBytes(24).toString('hex') // 48 hex chars
}

export function normalizeNewsletterLang(x?: string): NewsletterLang {
  const base = (x || '').slice(0, 2).toLowerCase()
  return base === 'en' || base === 'pt' ? base : 'es'
}

// ---- Digest data ------------------------------------------------------------

export interface DigestCurrency {
  code: string
  bestSellRate: number
  changePct: number // day-over-day, best sell side
  bestBuyHouse: string
}
export interface DigestNews {
  title: string
  link: string
  source: string
}
export interface DigestData {
  date: string
  currencies: DigestCurrency[]
  news: DigestNews[]
  ai: string
}

// Telegram (Markdown) rendering of the daily digest — same content as the email,
// for users who opted into Telegram delivery. Deterministic comma decimals (es).
const TG_HEAD: Record<NewsletterLang, string> = {
  es: '📊 *Resumen del dólar* — ',
  en: '📊 *Daily dollar digest* — ',
  pt: '📊 *Resumo do dólar* — ',
}
const TG_NEWS: Record<NewsletterLang, string> = {
  es: '📰 *Noticias*',
  en: '📰 *News*',
  pt: '📰 *Notícias*',
}

function fmtRate(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

export function buildDailyTelegram(data: DigestData, lang: NewsletterLang): string {
  const lines: string[] = [TG_HEAD[lang] + data.date, '']
  for (const c of data.currencies) {
    const arrow = c.changePct > 0 ? '🔺' : c.changePct < 0 ? '🔻' : '▪️'
    const pct = `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%`
    lines.push(`${arrow} *${c.code}* $ ${fmtRate(c.bestSellRate)} (${pct}) · ${c.bestBuyHouse}`)
  }
  if (data.ai) lines.push('', data.ai)
  if (data.news?.length) {
    lines.push('', TG_NEWS[lang])
    for (const n of data.news.slice(0, 3)) lines.push(`• [${n.title}](${n.link}) — _${n.source}_`)
  }
  lines.push('', 'https://cambio-uruguay.com/newsletter')
  return lines.join('\n')
}

const REPORT_CURRENCIES = ['USD', 'EUR', 'ARS', 'BRL']

interface RateRow {
  code: string
  type?: string
  origin: string
  buy: number
  sell: number
  date?: string
}

function dayOverDayPct(evolution: Array<{ date: string; sell?: number }>): number {
  const byDay = new Map<string, number>()
  for (const p of evolution) {
    if (typeof p.sell === 'number' && Number.isFinite(p.sell)) byDay.set(p.date.slice(0, 10), p.sell)
  }
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  if (days.length < 2) return 0
  const latest = days[days.length - 1]![1]
  const prev = days[days.length - 2]![1]
  return prev ? ((latest - prev) / prev) * 100 : 0
}

/** Build the daily digest from the public API + AI + news. Not unit-tested. */
export async function buildDigestData(lang: NewsletterLang): Promise<DigestData> {
  const cfg = useRuntimeConfig()
  const apiBase = (cfg.public as { apiBase: string }).apiBase

  const [rates, local] = await Promise.all([
    $fetch<RateRow[]>('/', { baseURL: apiBase }).catch(() => [] as RateRow[]),
    $fetch<Record<string, { name?: string }>>('/localData', { baseURL: apiBase }).catch(() => ({})),
  ])

  const houseName = (origin: string) => local[origin]?.name ?? origin
  const isRetail = (r: RateRow) => r.origin !== 'bcu' && !r.type && r.buy > 0 && r.sell > 0

  const currencies: DigestCurrency[] = []
  let date = new Date().toISOString().slice(0, 10)

  for (const code of REPORT_CURRENCIES) {
    const rows = rates.filter((r) => r.code === code && isRetail(r))
    if (rows.length === 0) continue
    const bestSell = rows.reduce((a, b) => (b.sell < a.sell ? b : a))
    const bestBuy = rows.reduce((a, b) => (b.buy > a.buy ? b : a))
    if (bestSell.date) date = bestSell.date.slice(0, 10)
    let changePct = 0
    try {
      const evo = await $fetch<{ evolution?: Array<{ date: string; sell?: number }> }>(
        `/evolution/${encodeURIComponent(bestSell.origin)}/${code}`,
        { baseURL: apiBase, query: { period: 1 } }
      )
      changePct = dayOverDayPct(evo?.evolution ?? [])
    } catch {
      changePct = 0
    }
    currencies.push({ code, bestSellRate: bestSell.sell, changePct, bestBuyHouse: houseName(bestBuy.origin) })
  }

  let ai = ''
  try {
    const r = await $fetch<{ insight?: string }>('/ai/insights', {
      baseURL: apiBase,
      method: 'POST',
      body: { type: 'market_summary', lang },
    })
    ai = sanitizeAi(r?.insight ?? '')
  } catch {
    ai = ''
  }

  let news: DigestNews[] = []
  try {
    news = (await fetchNews(5)).map((n) => ({ title: n.title, link: n.link, source: n.source }))
  } catch {
    news = []
  }

  return { date, currencies, news, ai }
}

// ---- Email HTML builder (pure) ---------------------------------------------

interface EmailLabels {
  subject: (date: string) => string
  preheader: string
  rate: string
  change: string
  bestBuy: string
  news: string
  footer: string
  unsubscribe: string
  why: string
}

const LABELS: Record<NewsletterLang, EmailLabels> = {
  es: {
    subject: (d) => `Resumen del dólar en Uruguay — ${d}`,
    preheader: 'Cotizaciones, tendencia y noticias del día.',
    rate: 'Mejor venta',
    change: 'Variación',
    bestBuy: 'Mejor compra',
    news: 'Noticias',
    footer: 'Recibís este correo porque te suscribiste en cambio-uruguay.com.',
    unsubscribe: 'Cancelar suscripción',
    why: 'Cotización del dólar en Uruguay, actualizada cada 10 minutos.',
  },
  en: {
    subject: (d) => `Uruguay dollar daily — ${d}`,
    preheader: "Today's rates, trend and news.",
    rate: 'Best sell',
    change: 'Change',
    bestBuy: 'Best buy',
    news: 'News',
    footer: 'You receive this because you subscribed at cambio-uruguay.com.',
    unsubscribe: 'Unsubscribe',
    why: "Uruguay's dollar exchange rate, updated every 10 minutes.",
  },
  pt: {
    subject: (d) => `Resumo do dólar no Uruguai — ${d}`,
    preheader: 'Cotações, tendência e notícias do dia.',
    rate: 'Melhor venda',
    change: 'Variação',
    bestBuy: 'Melhor compra',
    news: 'Notícias',
    footer: 'Você recebe este e-mail porque se inscreveu em cambio-uruguay.com.',
    unsubscribe: 'Cancelar inscrição',
    why: 'Cotação do dólar no Uruguai, atualizada a cada 10 minutos.',
  },
}

const INTL: Record<NewsletterLang, string> = { es: 'es-UY', en: 'en-US', pt: 'pt-BR' }

function fmtUYU(n: number, lang: NewsletterLang): string {
  return new Intl.NumberFormat(INTL[lang], { style: 'currency', currency: 'UYU', minimumFractionDigits: 2 }).format(n)
}
function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}${new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))}%`
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export interface BuiltEmail {
  subject: string
  html: string
  text: string
}

/** Pure: render the localized daily email. */
export function buildDailyEmail(data: DigestData, lang: NewsletterLang, unsubUrl: string): BuiltEmail {
  const L = LABELS[lang] ?? LABELS.es
  const site = 'https://cambio-uruguay.com'

  const rows = data.currencies
    .map((c) => {
      const arrow = c.changePct > 0 ? '🔺' : c.changePct < 0 ? '🔻' : '▪️'
      return `<tr>
  <td style="padding:8px 12px;font-weight:700;">${esc(c.code)}</td>
  <td style="padding:8px 12px;text-align:right;">${fmtUYU(c.bestSellRate, lang)}</td>
  <td style="padding:8px 12px;text-align:right;">${arrow} ${fmtPct(c.changePct)}</td>
  <td style="padding:8px 12px;">${esc(c.bestBuyHouse)}</td>
</tr>`
    })
    .join('\n')

  const aiHtml = data.ai
    ? `<div style="margin:18px 0;font-size:15px;line-height:1.6;color:#333;">${esc(data.ai).replace(/\n{2,}/g, '</p><p style="margin:0 0 10px;">').replace(/\n/g, '<br>')}</div>`
    : ''

  const newsHtml = data.news.length
    ? `<h3 style="margin:22px 0 8px;font-size:16px;color:#0d0f14;">📰 ${L.news}</h3>
<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;">
${data.news.map((n) => `<li><a href="${esc(n.link)}" style="color:#1565c0;">${esc(n.title)}</a> — <span style="color:#888;">${esc(n.source)}</span></li>`).join('\n')}
</ul>`
    : ''

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none;opacity:0;color:#f4f5f7;">${L.preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
  <tr><td style="background:linear-gradient(135deg,#16c784,#2f81f7);padding:20px 24px;color:#fff;">
    <div style="font-size:20px;font-weight:800;letter-spacing:1px;">CAMBIO $ URUGUAY</div>
    <div style="font-size:13px;opacity:.9;">${L.why}</div>
  </td></tr>
  <tr><td style="padding:24px;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#0d0f14;">📊 ${esc(L.subject(data.date))}</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
      <tr style="background:#f0f2f5;color:#555;">
        <th style="padding:8px 12px;text-align:left;"></th>
        <th style="padding:8px 12px;text-align:right;">${L.rate}</th>
        <th style="padding:8px 12px;text-align:right;">${L.change}</th>
        <th style="padding:8px 12px;text-align:left;">${L.bestBuy}</th>
      </tr>
      ${rows}
    </table>
    ${aiHtml}
    ${newsHtml}
    <div style="margin:24px 0 0;text-align:center;">
      <a href="${site}" style="display:inline-block;background:#16c784;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;">cambio-uruguay.com</a>
    </div>
  </td></tr>
  <tr><td style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center;">
    ${L.footer}<br>
    <a href="${esc(unsubUrl)}" style="color:#999;">${L.unsubscribe}</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

  const text = [
    L.subject(data.date),
    '',
    ...data.currencies.map((c) => `${c.code}: ${fmtUYU(c.bestSellRate, lang)} (${fmtPct(c.changePct)}) — ${L.bestBuy}: ${c.bestBuyHouse}`),
    '',
    data.ai,
    '',
    ...data.news.map((n) => `- ${n.title} (${n.source}) ${n.link}`),
    '',
    `${L.unsubscribe}: ${unsubUrl}`,
  ].join('\n')

  return { subject: L.subject(data.date), html, text }
}

// ---- Confirmation (double opt-in) email (pure) ------------------------------

const CONFIRM_COPY: Record<NewsletterLang, { subject: string; heading: string; body: string; cta: string; ignore: string }> = {
  es: {
    subject: 'Confirmá tu suscripción — Cambio Uruguay',
    heading: 'Confirmá tu suscripción',
    body: 'Hacé clic en el botón para empezar a recibir el resumen diario del dólar en Uruguay.',
    cta: 'Confirmar suscripción',
    ignore: 'Si no fuiste vos, ignorá este correo.',
  },
  en: {
    subject: 'Confirm your subscription — Cambio Uruguay',
    heading: 'Confirm your subscription',
    body: "Click the button to start receiving the daily Uruguay dollar summary.",
    cta: 'Confirm subscription',
    ignore: "If this wasn't you, just ignore this email.",
  },
  pt: {
    subject: 'Confirme sua inscrição — Cambio Uruguay',
    heading: 'Confirme sua inscrição',
    body: 'Clique no botão para começar a receber o resumo diário do dólar no Uruguai.',
    cta: 'Confirmar inscrição',
    ignore: 'Se não foi você, ignore este e-mail.',
  },
}

/** Pure: render the double-opt-in confirmation email. */
export function buildConfirmEmail(lang: NewsletterLang, confirmUrl: string): BuiltEmail {
  const C = CONFIRM_COPY[lang] ?? CONFIRM_COPY.es
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#16c784,#2f81f7);padding:20px 24px;color:#fff;font-size:20px;font-weight:800;letter-spacing:1px;">CAMBIO $ URUGUAY</td></tr>
  <tr><td style="padding:28px 24px;color:#333;">
    <h2 style="margin:0 0 12px;color:#0d0f14;">${C.heading}</h2>
    <p style="font-size:15px;line-height:1.6;margin:0 0 22px;">${C.body}</p>
    <div style="text-align:center;"><a href="${esc(confirmUrl)}" style="display:inline-block;background:#16c784;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;">${C.cta}</a></div>
    <p style="font-size:12px;color:#999;margin:24px 0 0;">${C.ignore}</p>
  </td></tr>
</table>
</td></tr></table></body></html>`
  const text = `${C.heading}\n\n${C.body}\n\n${confirmUrl}\n\n${C.ignore}`
  return { subject: C.subject, html, text }
}

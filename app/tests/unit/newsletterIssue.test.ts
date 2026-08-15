// The pure model behind the daily newsletter archive.
//
// Everything asserted here ends up in a URL, a <title>, a meta description or a
// sitemap entry for a page that is published once and then never regenerated —
// so a formatting slip is permanent for that date rather than something the
// next run fixes.
import { describe, expect, it } from 'vitest'

import {
  aiMarkdownToEmailHtml,
  cleanAiCommentary,
  findCurrency,
  formatIssueDate,
  formatIssuePct,
  formatIssueRate,
  isIssueDate,
  isPublishableIssue,
  issueSummary,
  issueTitle,
  issueTrend,
  issueTrendStyle,
  montevideoToday,
  sortIssuesDesc,
  toIssueSummary,
  withDerivedCopy,
  type IssueCurrency,
  type NewsletterIssue,
} from '../../utils/newsletterIssue'

const usd = (over: Partial<IssueCurrency> = {}): IssueCurrency => ({
  code: 'USD',
  bestSellRate: 41.2,
  changePct: 0.3214,
  bestBuyHouse: 'Cambio Sir',
  ...over,
})

describe('isIssueDate', () => {
  it('accepts a real calendar date', () => {
    expect(isIssueDate('2026-08-15')).toBe(true)
    expect(isIssueDate('2024-02-29')).toBe(true) // leap year
  })

  it('rejects malformed input', () => {
    for (const bad of ['', '2026-8-15', '15-08-2026', 'archivo', '2026-08-15T00:00:00']) {
      expect(isIssueDate(bad), bad).toBe(false)
    }
  })

  it('rejects a date that does not exist', () => {
    // `Date.parse('2026-02-31')` happily rolls over to March 3rd. Without the
    // round-trip check that would mint a real-looking URL for a day that never
    // happened, and the archive would carry a page nobody can ever match.
    expect(isIssueDate('2026-02-31')).toBe(false)
    expect(isIssueDate('2026-13-01')).toBe(false)
    expect(isIssueDate('2025-02-29')).toBe(false) // not a leap year
  })

  it('rejects the static sibling route', () => {
    // `/newsletter/archivo` and `/newsletter/[fecha]` share a path segment; the
    // validator is what keeps the hub from being parsed as an issue date.
    expect(isIssueDate('archivo')).toBe(false)
  })
})

describe('montevideoToday', () => {
  it('uses the Uruguayan calendar day, not UTC', () => {
    // 02:30 UTC is still the previous evening in Montevideo (UTC-3).
    expect(montevideoToday(new Date('2026-08-16T02:30:00Z'))).toBe('2026-08-15')
    expect(montevideoToday(new Date('2026-08-16T03:30:00Z'))).toBe('2026-08-16')
  })
})

describe('formatIssueDate', () => {
  it('renders Spanish long form without leading zeroes', () => {
    expect(formatIssueDate('2026-08-15')).toBe('15 de agosto de 2026')
    expect(formatIssueDate('2026-01-05')).toBe('5 de enero de 2026')
    expect(formatIssueDate('2026-12-31')).toBe('31 de diciembre de 2026')
  })

  it('passes a malformed value through untouched rather than inventing a date', () => {
    expect(formatIssueDate('nope')).toBe('nope')
  })
})

describe('formatIssueRate / formatIssuePct', () => {
  it('uses comma decimals and two places', () => {
    expect(formatIssueRate(41.2)).toBe('41,20')
    expect(formatIssueRate(41.005)).toBe('41,01')
  })

  it('signs percentages explicitly and never prints "-0,00%"', () => {
    expect(formatIssuePct(0.3214)).toBe('+0,32%')
    expect(formatIssuePct(-1.5)).toBe('−1,50%')
    expect(formatIssuePct(0)).toBe('0,00%')
  })

  it('degrades instead of printing NaN', () => {
    expect(formatIssueRate(Number.NaN)).toBe('—')
    expect(formatIssuePct(Number.NaN)).toBe('0,00%')
  })
})

describe('issueTrend', () => {
  it('classifies moves the UI can actually print', () => {
    expect(issueTrend(0.5)).toBe('up')
    expect(issueTrend(-0.5)).toBe('down')
    expect(issueTrend(0)).toBe('flat')
  })

  it('calls a move that rounds to 0,00% flat, so the arrow cannot contradict the number', () => {
    expect(formatIssuePct(0.004)).toBe('+0,00%')
    expect(issueTrend(0.004)).toBe('flat')
    expect(issueTrend(-0.004)).toBe('flat')
  })

  it('matches the site-wide colour convention (DollarMomentum / dolar-hoy)', () => {
    expect(issueTrendStyle('up')).toEqual({ color: 'success', icon: 'mdi-trending-up' })
    expect(issueTrendStyle('down')).toEqual({ color: 'error', icon: 'mdi-trending-down' })
    expect(issueTrendStyle('flat')).toEqual({ color: 'grey', icon: 'mdi-trending-neutral' })
  })
})

describe('issueTitle', () => {
  it('leads with the dollar price and ends with the date', () => {
    expect(issueTitle({ date: '2026-08-15', currencies: [usd()] })).toBe(
      'Dólar en Uruguay a $41,20 — 15 de agosto de 2026'
    )
  })

  it('is unique per date even when the price repeats', () => {
    // The blog shipped eight posts sharing one <title> because the headline was
    // the only variable. The date suffix is what stops the archive doing that.
    const a = issueTitle({ date: '2026-08-15', currencies: [usd()] })
    const b = issueTitle({ date: '2026-08-16', currencies: [usd()] })
    expect(a).not.toBe(b)
  })

  it('falls back to a dated headline when USD is missing', () => {
    expect(issueTitle({ date: '2026-08-15', currencies: [] })).toBe(
      'Resumen del dólar en Uruguay — 15 de agosto de 2026'
    )
    expect(issueTitle({ date: '2026-08-15', currencies: [usd({ bestSellRate: 0 })] })).toBe(
      'Resumen del dólar en Uruguay — 15 de agosto de 2026'
    )
  })
})

describe('issueSummary', () => {
  const news = [{ title: 'T', link: 'https://x', source: 'S' }]

  it('states the move, the price and the best-buy house', () => {
    const s = issueSummary({ date: '2026-08-15', currencies: [usd()], news })
    expect(s).toContain('subió +0,32%')
    expect(s).toContain('$41,20')
    expect(s).toContain('Cambio Sir')
  })

  it('says "bajó" for a fall', () => {
    const s = issueSummary({ date: '2026-08-15', currencies: [usd({ changePct: -0.9 })], news })
    expect(s).toContain('bajó −0,90%')
  })

  it('does not claim a move when the day was flat', () => {
    const s = issueSummary({ date: '2026-08-15', currencies: [usd({ changePct: 0 })], news })
    expect(s).toContain('se mantuvo en $41,20')
    expect(s).not.toContain('0,00%')
  })

  it('is built from data, never from the AI text', () => {
    // The AI paragraph is allowed to be empty or junk; the meta description
    // still has to be a true sentence about that day.
    const issue = { date: '2026-08-15', currencies: [usd()], news }
    expect(issueSummary(issue).length).toBeGreaterThan(40)
  })

  it('mentions the other currencies covered', () => {
    const s = issueSummary({
      date: '2026-08-15',
      currencies: [usd(), { code: 'EUR', bestSellRate: 45, changePct: 0, bestBuyHouse: 'X' }],
      news,
    })
    expect(s).toContain('EUR')
  })

  it('degrades to a dated sentence with no data at all', () => {
    const s = issueSummary({ date: '2026-08-15', currencies: [], news: [] })
    expect(s).toBe('Resumen del mercado cambiario uruguayo del 15 de agosto de 2026.')
  })
})

describe('isPublishableIssue', () => {
  it('publishes a day that has at least one real quote', () => {
    expect(isPublishableIssue({ currencies: [usd()] })).toBe(true)
  })

  it('refuses a day with no usable market data', () => {
    // A dated URL with no numbers on it is exactly the thin auto-generated page
    // that drags the rest of the archive down; better to skip the day.
    expect(isPublishableIssue({ currencies: [] })).toBe(false)
    expect(isPublishableIssue({ currencies: [usd({ bestSellRate: 0 })] })).toBe(false)
    expect(isPublishableIssue({ currencies: [usd({ bestSellRate: Number.NaN })] })).toBe(false)
  })
})

describe('withDerivedCopy / toIssueSummary', () => {
  const base = {
    date: '2026-08-15',
    currencies: [usd()],
    news: [{ title: 'T', link: 'https://x', source: 'S' }],
    ai: 'algo',
    createdAt: '2026-08-15T12:00:00.000Z',
  }

  it('stamps a title and summary onto a freshly built issue', () => {
    const issue = withDerivedCopy(base)
    expect(issue.title).toContain('41,20')
    expect(issue.summary).toContain('Cambio Sir')
    expect(issue.date).toBe('2026-08-15')
  })

  it('hoists the USD figures so a card needs no issue body', () => {
    const summary = toIssueSummary(withDerivedCopy(base))
    expect(summary.usdRate).toBe(41.2)
    expect(summary.usdChangePct).toBeCloseTo(0.3214)
    expect(summary).not.toHaveProperty('news')
    expect(summary).not.toHaveProperty('ai')
  })

  it('reports zeroes rather than undefined when USD is absent', () => {
    const summary = toIssueSummary(withDerivedCopy({ ...base, currencies: [] }))
    expect(summary.usdRate).toBe(0)
    expect(summary.usdChangePct).toBe(0)
  })
})

describe('cleanAiCommentary', () => {
  it('drops the assistant preamble the model addresses to the prompt', () => {
    // Observed verbatim in a real archived issue.
    const raw =
      '¡Claro! Aquí tienes un análisis del mercado de cambios en Uruguay al 15 de agosto de 2026:\n\n## Análisis del Mercado\n\nEl mercado…'
    expect(cleanAiCommentary(raw)).toBe('## Análisis del Mercado\n\nEl mercado…')
  })

  it('handles the other openers the same way', () => {
    for (const opener of [
      'Claro, aquí va el resumen:',
      'Por supuesto, este es el análisis:',
      'Sure, here is the summary:',
      'Aquí tienes el resumen del día:',
    ]) {
      expect(cleanAiCommentary(`${opener}\n\nCuerpo real.`), opener).toBe('Cuerpo real.')
    }
  })

  it('never eats a first line that carries information', () => {
    // A real sentence must survive even when it happens to end in a colon.
    const kept = 'El dólar cerró en tres niveles distintos:\n\nprimero…'
    expect(cleanAiCommentary(kept)).toBe(kept)
    const heading = '## Análisis del Mercado\n\nEl mercado…'
    expect(cleanAiCommentary(heading)).toBe(heading)
  })

  it('is a no-op on empty input', () => {
    expect(cleanAiCommentary('')).toBe('')
  })
})

describe('aiMarkdownToEmailHtml', () => {
  // The real `esc` from the email builder: escaping happens before any markup
  // is added, so these tests exercise the same order the email does.
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  it('renders a heading as bold text instead of shipping "##"', () => {
    const html = aiMarkdownToEmailHtml('## Estado del mercado', esc)
    expect(html).toContain('Estado del mercado')
    expect(html).toContain('font-weight:700')
    expect(html).not.toContain('##')
  })

  it('renders bold and bullets', () => {
    const html = aiMarkdownToEmailHtml('- El **dólar** subió\n- El euro bajó', esc)
    expect(html).toContain('<strong>dólar</strong>')
    expect(html).toContain('•')
    expect(html).not.toContain('**')
    expect(html).not.toMatch(/^-\s/m)
  })

  it('keeps every character of model output escaped', () => {
    // The single property that matters: this string reaches an email client.
    const html = aiMarkdownToEmailHtml('El <script>alert(1)</script> "riesgo" & más', esc)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp;')
  })

  it('does not let a bold marker smuggle in a tag', () => {
    const html = aiMarkdownToEmailHtml('**<img src=x onerror=alert(1)>**', esc)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('splits paragraphs on blank lines and keeps single newlines as breaks', () => {
    const html = aiMarkdownToEmailHtml('Uno\ndos\n\nTres', esc)
    expect(html).toContain('Uno<br>dos')
    expect(html).toContain('Tres')
    expect((html.match(/<p /g) ?? []).length).toBe(2)
  })

  it('strips the preamble too, so the email and the page agree', () => {
    const html = aiMarkdownToEmailHtml('¡Claro! Aquí tienes:\n\nEl cuerpo.', esc)
    expect(html).not.toContain('Claro')
    expect(html).toContain('El cuerpo.')
  })

  it('returns nothing for empty input rather than an empty box', () => {
    expect(aiMarkdownToEmailHtml('', esc)).toBe('')
    expect(aiMarkdownToEmailHtml('   \n  ', esc)).toBe('')
  })
})

describe('sortIssuesDesc', () => {
  it('orders newest first without mutating the input', () => {
    const input = [{ date: '2026-08-13' }, { date: '2026-08-15' }, { date: '2026-08-14' }]
    const sorted = sortIssuesDesc(input)
    expect(sorted.map(i => i.date)).toEqual(['2026-08-15', '2026-08-14', '2026-08-13'])
    expect(input[0]!.date).toBe('2026-08-13')
  })
})

describe('findCurrency', () => {
  it('finds by code and returns undefined for a missing one', () => {
    const list = [usd()]
    expect(findCurrency(list, 'USD')?.bestSellRate).toBe(41.2)
    expect(findCurrency(list, 'EUR')).toBeUndefined()
  })
})

describe('the archived issue shape stays serialisable', () => {
  it('round-trips through JSON unchanged', () => {
    // Issues are persisted as JSON files and read back months later; a Date
    // instance or an undefined would not survive that.
    const issue: NewsletterIssue = withDerivedCopy({
      date: '2026-08-15',
      currencies: [usd()],
      news: [{ title: 'T', link: 'https://x', source: 'S' }],
      ai: '',
      createdAt: '2026-08-15T12:00:00.000Z',
    })
    expect(JSON.parse(JSON.stringify(issue))).toEqual(issue)
  })
})

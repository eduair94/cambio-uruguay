// Avisos de UN tema por correo ("avisame cuando salga el aumento de las jubilaciones"). Separados
// del newsletter a propósito: quien pide esto no pidió el resumen diario del dólar. Doble
// confirmación, un correo por cada estado nuevo del dato y baja en un clic. Ver
// docs/analytics/AB_TESTS.md (experimento `jubilaciones`) y server/tasks/topics/notify.ts.
//
// Las funciones de abajo son puras (sin Mongo ni Nitro) y tienen test.
import {
  AUMJUB_2027,
  aumJubEstado,
  formatAumJubPct,
  type AumJub2027,
  type AumJubEstado,
} from '../../utils/aumentoJubilaciones'
import type { BuiltEmail, NewsletterLang } from './newsletter'

export const TOPIC_IDS = ['aumento-jubilaciones-2027'] as const
export type TopicId = (typeof TOPIC_IDS)[number]

export function isTopic(value: unknown): value is TopicId {
  return typeof value === 'string' && (TOPIC_IDS as readonly string[]).includes(value)
}

/** La página del tema, la que confirma y da de baja (con `?aviso=`). Sin prefijo de idioma. */
export const TOPIC_PATH: Record<TopicId, string> = {
  'aumento-jubilaciones-2027': '/guias/aumento-de-jubilaciones-uruguay',
}

/** El estado del dato hoy. `pendiente` nunca se avisa. */
export function topicState(topic: TopicId, state: AumJub2027 = AUMJUB_2027): AumJubEstado {
  switch (topic) {
    case 'aumento-jubilaciones-2027':
      return aumJubEstado(state)
  }
}

/**
 * Qué estado hay que avisar ahora: el actual, si no es `pendiente` y no se avisó. Uno solo: si el
 * provisorio nunca se mandó y ya hay definitivo, va el definitivo (el provisorio ya es viejo).
 */
export function topicStateToNotify(
  current: AumJubEstado,
  notified: readonly string[]
): AumJubEstado | null {
  if (current === 'pendiente') return null
  return notified.includes(current) ? null : current
}

export function localePrefix(lang: NewsletterLang): string {
  return lang === 'en' || lang === 'pt' ? `/${lang}` : ''
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const TOPIC_NAME: Record<TopicId, Record<NewsletterLang, string>> = {
  'aumento-jubilaciones-2027': {
    es: 'el aumento de las jubilaciones de 2027',
    en: 'the 2027 pension increase in Uruguay',
    pt: 'o aumento das aposentadorias de 2027 no Uruguai',
  },
}

const CONFIRM: Record<NewsletterLang, { subject: string; body: string; cta: string; ignore: string }> =
  {
    es: {
      subject: 'Confirmá el aviso — Cambio Uruguay',
      body: 'Confirmá y te escribimos una sola vez cuando salga {topic}. No te suscribe al newsletter.',
      cta: 'Confirmar el aviso',
      ignore: 'Si no fuiste vos, ignorá este correo: sin confirmar no te escribimos.',
    },
    en: {
      subject: 'Confirm your notice — Cambio Uruguay',
      body: 'Confirm and we will email you once when {topic} is published. This does not subscribe you to the newsletter.',
      cta: 'Confirm the notice',
      ignore: "If this wasn't you, ignore this email: without confirmation we won't write.",
    },
    pt: {
      subject: 'Confirme o aviso — Cambio Uruguay',
      body: 'Confirme e escrevemos uma única vez quando sair {topic}. Não inscreve você na newsletter.',
      cta: 'Confirmar o aviso',
      ignore: 'Se não foi você, ignore este e-mail: sem confirmação não escrevemos.',
    },
  }

function frame(lang: NewsletterLang, inner: string): string {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#16c784,#2f81f7);padding:20px 24px;color:#fff;font-size:20px;font-weight:800;letter-spacing:1px;">CAMBIO $ URUGUAY</td></tr>
  <tr><td style="padding:28px 24px;color:#333;">${inner}</td></tr>
</table>
</td></tr></table></body></html>`
}

function button(url: string, label: string): string {
  return `<div style="text-align:center;margin:22px 0 0;"><a href="${esc(url)}" style="display:inline-block;background:#16c784;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;">${esc(label)}</a></div>`
}

export function buildTopicConfirmEmail(
  topic: TopicId,
  lang: NewsletterLang,
  confirmUrl: string
): BuiltEmail {
  const C = CONFIRM[lang] ?? CONFIRM.es
  const body = C.body.replace('{topic}', TOPIC_NAME[topic][lang])
  const html = frame(
    lang,
    `<p style="font-size:15px;line-height:1.6;margin:0;">${esc(body)}</p>${button(confirmUrl, C.cta)}
    <p style="font-size:12px;color:#999;margin:24px 0 0;">${esc(C.ignore)}</p>`
  )
  return { subject: C.subject, html, text: `${body}\n\n${confirmUrl}\n\n${C.ignore}` }
}

/** El correo del dato. Los números salen del mismo catálogo que la guía. */
export function buildTopicNoticeEmail(
  topic: TopicId,
  state: Exclude<AumJubEstado, 'pendiente'>,
  lang: NewsletterLang,
  pageUrl: string,
  unsubUrl: string,
  data: AumJub2027 = AUMJUB_2027
): BuiltEmail {
  const pct = state === 'definitivo' ? data.pct : data.provisorioPct
  const value = pct === null ? '' : formatAumJubPct(pct)
  const copy = {
    es: {
      subject:
        state === 'definitivo'
          ? `Aumento de jubilaciones 2027: ${value}`
          : `Aumento provisorio de jubilaciones: ${value}`,
      body:
        state === 'definitivo'
          ? `Salió el aumento de las jubilaciones y pensiones del BPS para 2027: ${value}. En la guía están la cuenta, desde cuándo se cobra y qué pasa con la mínima.`
          : `Salió el aumento provisorio de las jubilaciones y pensiones del BPS: ${value}. El definitivo sale a fin de enero; en la guía está cuándo se cobra cada parte.`,
      cta: 'Ver la guía',
      foot: 'Te escribimos porque pediste este aviso.',
      unsub: 'No quiero más avisos de este tema',
    },
    en: {
      subject:
        state === 'definitivo'
          ? `Uruguay 2027 pension increase: ${value}`
          : `Provisional pension increase: ${value}`,
      body:
        state === 'definitivo'
          ? `BPS published the 2027 increase for pensions: ${value}. The guide has the math, when it is paid and what happens with the minimum pension.`
          : `BPS published the provisional pension increase: ${value}. The final figure comes at the end of January; the guide explains when each part is paid.`,
      cta: 'Open the guide',
      foot: 'You are receiving this because you asked for this notice.',
      unsub: 'No more notices on this topic',
    },
    pt: {
      subject:
        state === 'definitivo'
          ? `Aumento das aposentadorias 2027: ${value}`
          : `Aumento provisório das aposentadorias: ${value}`,
      body:
        state === 'definitivo'
          ? `Saiu o aumento das aposentadorias e pensões do BPS para 2027: ${value}. No guia estão a conta, desde quando se recebe e o que acontece com o mínimo.`
          : `Saiu o aumento provisório das aposentadorias e pensões do BPS: ${value}. O definitivo sai no fim de janeiro; no guia está quando cada parte é paga.`,
      cta: 'Ver o guia',
      foot: 'Você recebe isto porque pediu este aviso.',
      unsub: 'Não quero mais avisos deste tema',
    },
  }[lang]
  void topic
  const html = frame(
    lang,
    `<p style="font-size:15px;line-height:1.6;margin:0;">${esc(copy.body)}</p>${button(pageUrl, copy.cta)}
    <p style="font-size:12px;color:#999;margin:24px 0 0;">${esc(copy.foot)} <a href="${esc(unsubUrl)}" style="color:#999;">${esc(copy.unsub)}</a></p>`
  )
  return {
    subject: copy.subject,
    html,
    text: `${copy.body}\n\n${pageUrl}\n\n${copy.foot}\n${copy.unsub}: ${unsubUrl}`,
  }
}

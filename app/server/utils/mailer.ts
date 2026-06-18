// SMTP mailer (nodemailer). Feature-gated by runtimeConfig.smtp — when not
// configured the newsletter is disabled (subscribe → 503, send task → no-op).
import nodemailer, { type Transporter } from 'nodemailer'

interface SmtpConfig {
  host?: string
  port?: string | number
  secure?: string | boolean
  user?: string
  pass?: string
  from?: string
}

function smtpConfig(): SmtpConfig {
  return (useRuntimeConfig().smtp as SmtpConfig) ?? {}
}

export function isMailerConfigured(): boolean {
  const s = smtpConfig()
  return Boolean(s.host && s.user && s.from)
}

let transport: Transporter | null = null

function getTransport(): Transporter {
  if (!transport) {
    const s = smtpConfig()
    transport = nodemailer.createTransport({
      host: s.host,
      port: Number(s.port) || 587,
      secure: s.secure === true || s.secure === 'true',
      auth: { user: s.user, pass: s.pass },
    })
  }
  return transport
}

export interface SendMailOptions {
  to: string
  subject: string
  html: string
  text: string
  listUnsubscribeUrl?: string
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const s = smtpConfig()
  const headers: Record<string, string> = {}
  if (opts.listUnsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${opts.listUnsubscribeUrl}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }
  await getTransport().sendMail({
    from: s.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    headers,
  })
}

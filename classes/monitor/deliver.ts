// Envío del monitor: Telegram con el bot del sitio (mismo TELEGRAM_BOT_TOKEN en la raíz y en el app,
// verificado el 29/9) y correo por SMTP con las credenciales del sitio. Nada de esto tira: devuelve
// true/false y la corrida sigue.
import type { Message } from "./format";

export async function sendTelegramText(
  chatId: string,
  text: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const bot = env.TELEGRAM_BOT_TOKEN;
  if (!bot || !chatId) return false;
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
      // Sin tope, un fetch colgado frena a todos los monitores que vienen detrás en la corrida.
      signal: AbortSignal.timeout(10_000),
    });
    const data: any = await (res as any).json().catch(() => ({}));
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

export interface MailTransport {
  sendMail(opts: { from: string; to: string; subject: string; text: string; html: string }): Promise<unknown>;
}

/** El transporte SMTP, o null si falta configuración. `nodemailer` se carga recién acá. */
export function smtpTransport(env: NodeJS.ProcessEnv = process.env): MailTransport | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_FROM) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 587,
    secure: env.SMTP_SECURE === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  }) as MailTransport;
}

export async function sendEmail(transport: MailTransport | null, from: string, to: string, message: Message): Promise<boolean> {
  if (!transport || !to) return false;
  try {
    await transport.sendMail({ from, to, subject: message.subject, text: message.text, html: message.html });
    return true;
  } catch {
    return false;
  }
}

// El correo de la prueba mensual del SMTP del sitio (sync_mail_health.ts).
//
// Tiene dos trabajos y los dos salieron del 22/11/2026:
//   - Brevo vence una clave SMTP que pasa 90 días sin enviar, aunque se haya creado «sin
//     vencimiento». El buzón y el newsletter mandan poco, así que la clave del sitio podía morir
//     sola y el primer aviso habría sido un reporte de error que nunca llegó.
//   - Durante meses lo único que se medía era que Brevo ACEPTARA el envío (`emailed: true`), y nada
//     llegaba: el dominio no estaba autenticado. Este correo es el que hay que ver en la bandeja de
//     admin@ una vez por mes; si deja de aparecer, el correo del sitio está roto aunque el job diga 0.

export interface MailHealthMessage {
  subject: string;
  text: string;
  html: string;
}

/** Fecha de Montevideo, `YYYY-MM-DD`, para que el asunto diga el día de acá. */
export function montevideoDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function mailHealthMessage(now: Date): MailHealthMessage {
  const day = montevideoDay(now);
  const subject = `[Cambio Uruguay] Prueba mensual del correo del sitio (${day})`;
  const lines = [
    "Si este correo llegó a la bandeja de entrada, el correo del sitio funciona:",
    "el buzón de reportes, el newsletter y los avisos del monitor salen por el mismo SMTP.",
    "",
    "Si un mes no llega, revisá en este orden:",
    "1. Que la clave SMTP de Brevo siga activa (vencen tras 90 días sin enviar).",
    "2. Que el dominio cambio-uruguay.com siga autenticado en Brevo (DKIM y DMARC).",
    "3. La carpeta de spam.",
    "",
    "Lo manda una vez por mes el job currency-mail-health (sync_mail_health.ts).",
  ];
  const text = lines.join("\n");
  const html = lines.map((line) => (line ? `<p>${line}</p>` : "")).join("");
  return { subject, text, html };
}

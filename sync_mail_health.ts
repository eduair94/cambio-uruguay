// Prueba mensual del correo del sitio (pm2 `currency-mail-health`, día 1 de cada mes, 13:23 UTC).
// Manda un correo a admin@cambio-uruguay.com con el mismo SMTP que el buzón, el newsletter y el
// monitor de competencia: mantiene viva la clave de Brevo (vence tras 90 días sin enviar) y deja una
// prueba visible en la bandeja. Ver classes/mailhealth/message.ts.
//
// Un envío que falla sale con 1, y sentry_job abre «currency-mail-health exited with code 1».
import "./sentry_job";
import "dotenv/config";

import { mailHealthMessage } from "./classes/mailhealth/message";
import { smtpTransport } from "./classes/monitor/deliver";

async function main(): Promise<void> {
  const transport = smtpTransport();
  if (!transport) {
    console.error("[mail-health] falta SMTP_HOST, SMTP_USER o SMTP_FROM en el .env de la raíz");
    process.exit(1);
  }
  const to = process.env.MAIL_HEALTH_TO || "admin@cambio-uruguay.com";
  const message = mailHealthMessage(new Date());
  try {
    await transport.sendMail({ from: String(process.env.SMTP_FROM), to, ...message });
  } catch (e: any) {
    console.error("[mail-health] el SMTP rechazó el envío:", e?.message || e);
    process.exit(1);
  }
  console.log(`[mail-health] enviado: ${message.subject}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[mail-health] error inesperado:", e?.message || e);
  process.exit(1);
});

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { mailHealthMessage, montevideoDay } from "../../classes/mailhealth/message";

const ROOT = path.resolve(__dirname, "../..");

describe("prueba mensual del correo del sitio", () => {
  it("fecha el asunto con el día de Montevideo, no el de UTC", () => {
    // 1/12 a las 01:00 UTC todavía es 30/11 en Montevideo (UTC−3).
    expect(montevideoDay(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11-30");
    expect(mailHealthMessage(new Date("2026-12-01T13:23:00Z")).subject).toBe(
      "[Cambio Uruguay] Prueba mensual del correo del sitio (2026-12-01)"
    );
  });

  it("dice qué revisar si un mes no llega", () => {
    const { text, html } = mailHealthMessage(new Date("2026-12-01T13:23:00Z"));
    expect(text).toMatch(/90 días/);
    expect(text).toMatch(/DKIM/);
    expect(html).toContain("<p>");
  });

  // Brevo vence la clave tras 90 días sin enviar: el envío tiene que ser al menos mensual, y el job
  // tiene que arrancar en el VPS (OTHER_APPS) o nunca corre.
  it("corre una vez por mes y está en la lista de arranque del deploy", () => {
    const apps: Array<{ name: string; script?: string; cron_restart?: string; autorestart?: boolean }> =
      require(path.join(ROOT, "ecosystem.config.js")).apps;
    const app = apps.find((a) => a.name === "currency-mail-health");
    expect(app?.script).toBe("dist/sync_mail_health.js");
    expect(app?.cron_restart).toMatch(/^\d+ \d+ 1 \* \*$/);
    expect(app?.autorestart).toBe(false);
    const deploy = fs.readFileSync(path.join(ROOT, "scripts/deploy-backend.sh"), "utf8");
    expect(deploy).toMatch(/OTHER_APPS=\([^)]*\bcurrency-mail-health\b/);
  });
});

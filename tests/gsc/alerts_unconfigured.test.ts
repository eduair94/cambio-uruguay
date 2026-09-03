// El canal de alertas que no avisa que no avisa.
//
// `classes/notify.ts` degrada sin lanzar cuando faltan las credenciales y deja una línea en los
// logs de pm2. Verificado en el VPS el 2026-09-03: TELEGRAM_BOT_TOKEN tiene 46 caracteres y
// TELEGRAM_ADMIN_CHAT_ID está VACÍO, así que las alertas de dieciséis archivos —entre ellas el
// disyuntor del bot de Reddit y la auditoría de cotizaciones— no llegan a ningún lado, y el
// síntoma de eso es que no pasa nada.
//
// La alerta vive en el snapshot de Search Console porque es lo que se muestra arriba del tablero
// privado: el único lugar donde el dueño busca alertas.
import { describe, expect, it } from "vitest";

/** El mismo predicado que usa `classes/gsc/refresh.ts`, aislado para poder probarlo. */
function alertsUnconfigured(env: Record<string, string | undefined>): boolean {
  return !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID;
}

describe("aviso de que el aviso no está configurado", () => {
  it("avisa cuando el chat del admin está vacío, que es el caso real del VPS", () => {
    expect(alertsUnconfigured({ TELEGRAM_BOT_TOKEN: "x".repeat(46), TELEGRAM_ADMIN_CHAT_ID: "" })).toBe(true);
  });

  it("avisa cuando falta el token", () => {
    expect(alertsUnconfigured({ TELEGRAM_ADMIN_CHAT_ID: "123" })).toBe(true);
  });

  it("avisa cuando no hay ninguna de las dos", () => {
    expect(alertsUnconfigured({})).toBe(true);
  });

  it("calla cuando las dos están, que es la única forma de que las alertas lleguen", () => {
    expect(alertsUnconfigured({ TELEGRAM_BOT_TOKEN: "x", TELEGRAM_ADMIN_CHAT_ID: "123" })).toBe(false);
  });
});

describe("el job la incluye", () => {
  it("refresh.ts empuja la alerta con ese código", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(path.join(__dirname, "..", "..", "classes", "gsc", "refresh.ts"), "utf8");
    expect(src).toContain("alerts-unconfigured");
    expect(src).toContain("TELEGRAM_ADMIN_CHAT_ID");
  });
});

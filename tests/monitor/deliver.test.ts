import { describe, expect, it, vi } from "vitest";
import { sendEmail, sendTelegramText, smtpTransport } from "../../classes/monitor/deliver";

const env = { TELEGRAM_BOT_TOKEN: "bot-de-prueba" } as NodeJS.ProcessEnv;

describe("envío del monitor", () => {
  it("Telegram en texto plano, sin parse_mode", async () => {
    const fetchImpl = vi.fn(async () => ({ json: async () => ({ ok: true }) })) as any;
    expect(await sendTelegramText("123", "Cambio_Gales movió", env, fetchImpl)).toBe(true);
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ chat_id: "123", text: "Cambio_Gales movió" });
    expect(body.parse_mode).toBeUndefined();
  });

  it("Telegram sin token, sin chat o con error de red devuelve false sin tirar", async () => {
    const boom = vi.fn(async () => {
      throw new Error("red");
    }) as any;
    expect(await sendTelegramText("123", "x", {} as NodeJS.ProcessEnv, boom)).toBe(false);
    expect(await sendTelegramText("", "x", env, boom)).toBe(false);
    expect(await sendTelegramText("123", "x", env, boom)).toBe(false);
  });

  it("sin SMTP configurado no hay transporte y el correo devuelve false", async () => {
    expect(smtpTransport({} as NodeJS.ProcessEnv)).toBeNull();
    expect(await sendEmail(null, "a@b.uy", "c@d.uy", { subject: "s", text: "t", html: "h" })).toBe(false);
  });

  it("un correo que falla devuelve false sin tirar", async () => {
    const transport = { sendMail: vi.fn(async () => { throw new Error("smtp"); }) };
    expect(await sendEmail(transport, "a@b.uy", "c@d.uy", { subject: "s", text: "t", html: "h" })).toBe(false);
    const ok = { sendMail: vi.fn(async () => ({})) };
    expect(await sendEmail(ok, "a@b.uy", "c@d.uy", { subject: "s", text: "t", html: "h" })).toBe(true);
    expect(ok.sendMail).toHaveBeenCalledWith({ from: "a@b.uy", to: "c@d.uy", subject: "s", text: "t", html: "h" });
  });
});

// Always-on Telegram bot (telegraf, long-poll). Handles interactive commands;
// daily/alert pushes come from the cron entries via the Bot API. Exits cleanly
// when TELEGRAM_BOT_TOKEN is absent.
import "dotenv/config";
import { Telegraf } from "telegraf";
import { httpCambioApi } from "cambio-uruguay-mcp/api";
import { loadConfig } from "../config.js";
import { handleCommand, type CommandCtx } from "../commands/router.js";
import { normalizeLang } from "../format/i18n.js";
import { connectMongo } from "../store/mongo.js";
import { getLanguage } from "../store/subscribers.js";
import { mongoStore } from "../store/store_adapter.js";
import { AppClient } from "../store/app_client.js";
import { formatAlerts, formatFavorites, parseAlertCommand } from "../commands/account.js";

const ACCOUNT_CMDS = ["misalertas", "favoritos", "alerta", "desvincular"];

const COMMANDS = [
  ["dolar", "Cotización del dólar"],
  ["cotizacion", "Cotización de una moneda"],
  ["mejor", "Mejor casa para comprar/vender"],
  ["convertir", "Conversor de monedas"],
  ["resumen", "Resumen IA del mercado"],
  ["historico", "Análisis de tendencia"],
  ["noticias", "Últimas noticias"],
  ["suscribir", "Recibir el resumen diario"],
  ["desuscribir", "Cancelar suscripción"],
  ["misalertas", "Mis alertas de cotización"],
  ["favoritos", "Mis casas favoritas"],
  ["alerta", "Crear alerta (ej. /alerta USD compra 41)"],
  ["desvincular", "Desvincular mi cuenta"],
  ["idioma", "Cambiar idioma (es/en/pt)"],
  ["help", "Ayuda"],
] as const;

async function main(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.telegram) {
    console.log("Telegram not configured (TELEGRAM_BOT_TOKEN/CHANNEL_ID missing); exiting.");
    return;
  }
  await connectMongo(cfg.mongoUri).catch((e) => console.error("mongo connect failed:", e));

  const api = httpCambioApi(cfg.apiBaseUrl);
  const bot = new Telegraf(cfg.telegram.token);
  const app = cfg.accountSecret ? new AppClient(cfg.appBaseUrl, cfg.accountSecret) : null;

  // Deep-link account linking: t.me/<bot>?start=<code>
  bot.start(async (ctx) => {
    const code = (ctx.startPayload || "").trim();
    if (!code || !app) {
      await ctx.reply("Vinculá tu cuenta desde cambio-uruguay.com/cuenta → Telegram.");
      return;
    }
    const res = await app.link(code, String(ctx.chat.id)).catch(() => ({ ok: false }));
    await ctx.reply(
      res?.ok
        ? "✅ Cuenta vinculada. Vas a recibir acá tus alertas. Probá /misalertas o /favoritos."
        : "El código venció o no es válido. Generá uno nuevo en cambio-uruguay.com/cuenta.",
    );
  });

  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text.startsWith("/")) return;
    const [rawCmd, ...args] = text.split(/\s+/);
    const cmd = rawCmd.replace(/^\//, "").replace(/@.*/, ""); // strip /cmd@BotName
    const chatId = String(ctx.chat.id);

    // Account-aware commands (require a linked account via the app API).
    if (app && ACCOUNT_CMDS.includes(cmd)) {
      let reply = "Vinculá tu cuenta en cambio-uruguay.com/cuenta";
      try {
        if (cmd === "misalertas") {
          const r = await app.alerts(chatId);
          reply = r.linked ? formatAlerts(r.alerts) : reply;
        } else if (cmd === "favoritos") {
          const r = await app.favorites(chatId);
          reply = r.linked ? formatFavorites(r.favorites) : reply;
        } else if (cmd === "desvincular") {
          await app.unlink(chatId);
          reply = "Cuenta desvinculada.";
        } else if (cmd === "alerta") {
          const spec = parseAlertCommand(args);
          if (!spec) reply = "Formato: /alerta USD compra 41";
          else {
            const r = await app.createAlert(chatId, spec);
            reply = r.ok
              ? `✅ Alerta creada: ${spec.currency} ${spec.op} ${spec.target}`
              : r.linked === false
                ? reply
                : "No se pudo crear la alerta.";
          }
        }
      } catch {
        reply = "Hubo un error. Probá de nuevo en un momento.";
      }
      await ctx.reply(reply).catch((e) => console.error("telegram reply failed:", e));
      return;
    }

    const stored = await getLanguage("telegram", chatId).catch(() => null);
    const lang = normalizeLang(stored ?? ctx.from?.language_code);

    const cmdCtx: CommandCtx = { cmd, args, lang, platform: "telegram", chatId };
    const reply = await handleCommand(api, cfg, cmdCtx, mongoStore);
    await ctx.reply(reply.text, { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }).catch((e) =>
      console.error("telegram reply failed:", e)
    );
  });

  await bot.telegram.setMyCommands(COMMANDS.map(([command, description]) => ({ command, description })));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  console.log("Telegram bot starting (long-poll)…");
  await bot.launch();
}

main().catch((err) => {
  console.error("telegram bot fatal:", err);
  process.exit(1);
});

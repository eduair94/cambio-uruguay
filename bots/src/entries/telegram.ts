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

  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text.startsWith("/")) return;
    const [rawCmd, ...args] = text.split(/\s+/);
    const cmd = rawCmd.replace(/^\//, "").replace(/@.*/, ""); // strip /cmd@BotName
    const chatId = String(ctx.chat.id);
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

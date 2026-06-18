// Platform-agnostic command dispatch. Each command maps to mcp tool handlers +
// formatters; subscription commands go through an injected store (so it's unit-
// testable without Mongo). Returns plain text (+ optional image) the platform
// adapters then send. Never throws — errors become friendly localized text.
import type { CambioApi } from "cambio-uruguay-mcp/api";
import { bestHouse, cleanInsight, convert, dailySummary, getNews, getRates } from "cambio-uruguay-mcp/tools";
import type { BotConfig } from "../config.js";
import { L, normalizeLang, type Lang } from "../format/i18n.js";
import { formatBest, formatConvert, formatNews, formatRates } from "../format/messages.js";

export type Platform = "telegram" | "discord";

export interface SubscriberStore {
  subscribe(platform: Platform, chatId: string, language: string): Promise<void>;
  unsubscribe(platform: Platform, chatId: string): Promise<void>;
  setLanguage(platform: Platform, chatId: string, language: string): Promise<void>;
}

export interface CommandCtx {
  cmd: string;
  args: string[];
  lang: Lang;
  platform: Platform;
  chatId: string;
}

export interface CommandReply {
  text: string;
  imageUrl?: string;
}

const COMMANDS = [
  "/dolar",
  "/cotizacion <moneda>",
  "/mejor <moneda> [compra|venta]",
  "/convertir <monto> <de> <a>",
  "/resumen",
  "/historico <moneda>",
  "/noticias",
  "/suscribir",
  "/desuscribir",
  "/idioma <es|en|pt>",
];

function helpText(lang: Lang): string {
  const t = L(lang);
  return `🤖 *${t.help}*\n${COMMANDS.map((c) => `• ${c}`).join("\n")}`;
}

function parseSide(arg: string | undefined): "buy" | "sell" {
  const a = (arg ?? "").toLowerCase();
  if (["venta", "vender", "sell"].includes(a)) return "sell";
  return "buy"; // default: where to buy the currency
}

export async function handleCommand(
  api: CambioApi,
  cfg: BotConfig,
  ctx: CommandCtx,
  store: SubscriberStore
): Promise<CommandReply> {
  const lang = ctx.lang;
  const t = L(lang);
  const cmd = ctx.cmd.replace(/^\//, "").toLowerCase();

  try {
    switch (cmd) {
      case "start":
      case "help":
        return { text: helpText(lang) };

      case "dolar":
        return { text: formatRates(await getRates(api, { currency: "USD" }), lang) };

      case "cotizacion":
      case "cotización": {
        const currency = (ctx.args[0] ?? "USD").toUpperCase();
        return { text: formatRates(await getRates(api, { currency }), lang) };
      }

      case "mejor": {
        const currency = (ctx.args[0] ?? "USD").toUpperCase();
        const side = parseSide(ctx.args[1]);
        return { text: formatBest(await bestHouse(api, { currency, side }), lang) };
      }

      case "convertir": {
        const amount = Number(String(ctx.args[0] ?? "").replace(",", "."));
        const from = (ctx.args[1] ?? "USD").toUpperCase();
        const to = (ctx.args[2] ?? "UYU").toUpperCase();
        if (!Number.isFinite(amount)) {
          return { text: `${t.noData}\n\`/convertir 100 USD UYU\`` };
        }
        return { text: formatConvert(await convert(api, { amount, from, to }), lang) };
      }

      case "resumen": {
        const r = await dailySummary(api, { lang });
        return { text: cleanInsight(r.summary) || t.noData };
      }

      case "historico":
      case "histórico": {
        const currency = (ctx.args[0] ?? "USD").toUpperCase();
        const r = await dailySummary(api, { lang, currency });
        return { text: cleanInsight(r.summary) || t.noData };
      }

      case "noticias":
        return { text: formatNews(await getNews(api, { limit: 5 }), lang) };

      case "suscribir":
        await store.subscribe(ctx.platform, ctx.chatId, lang);
        return { text: t.subscribed };

      case "desuscribir":
        await store.unsubscribe(ctx.platform, ctx.chatId);
        return { text: t.unsubscribed };

      case "idioma": {
        const newLang = normalizeLang(ctx.args[0]);
        await store.setLanguage(ctx.platform, ctx.chatId, newLang);
        return { text: `${L(newLang).langSet}: ${newLang}` };
      }

      default:
        return { text: helpText(lang) };
    }
  } catch (err) {
    console.error(`command /${cmd} failed:`, err);
    return { text: `${t.noData}` };
  }
}

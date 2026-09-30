// Monitor de competencia para casas de cambio (pm2 `currency-competitor-monitor`, cada 5 minutos,
// minutos 3, 8, 13…: después de que arrancó el sync de las :00/:05). Lee el ledger de cambios y la
// foto del día de la base del backend, la configuración y los contactos de la base del app, y avisa
// por Telegram y correo. Ver docs/api/COMPETITOR_MONITOR.md y classes/monitor/.
import dotenv from "dotenv";
dotenv.config();

import { apiKeyStore } from "./classes/apikeys/mongo";
import { appConnection } from "./classes/appdb";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer, withTimeout } from "./classes/database";
import { AppUserModel } from "./classes/models/AppUser";
import { CompetitorMonitorModel } from "./classes/models/CompetitorMonitor";
import { CompetitorMonitorStateModel } from "./classes/models/CompetitorMonitorState";
import { sendEmail, sendTelegramText, smtpTransport } from "./classes/monitor/deliver";
import { runMonitors } from "./classes/monitor/run";
import { MONITOR_CURRENCIES, type MonitorConfig, type MonitorCurrency, type MonitorState } from "./classes/monitor/types";
import { origins } from "./classes/origins";
import { rateChangesDb } from "./classes/rate_changes";

function houseNames(): (origin: string) => string {
  const names: Record<string, string> = {};
  for (const origin of Object.keys(origins)) {
    try {
      names[origin] = new (origins as any)[origin](origin).name || origin;
    } catch {
      names[origin] = origin;
    }
  }
  return (origin) => names[origin] ?? origin.replace(/_/g, " ");
}

function toConfig(doc: any): MonitorConfig {
  const currencies = (doc.currencies ?? []).filter((c: string) => (MONITOR_CURRENCIES as readonly string[]).includes(c));
  return {
    uid: String(doc.uid),
    email: doc.email ?? null,
    ownOrigin: doc.ownOrigin ?? null,
    competitors: Array.isArray(doc.competitors) ? doc.competitors.map(String) : [],
    currencies: currencies as MonitorCurrency[],
    alerts: {
      moves: doc.alerts?.moves !== false,
      position: doc.alerts?.position !== false,
      quiet: doc.alerts?.quiet !== false,
      daily: doc.alerts?.daily !== false,
    },
    channels: {
      telegram: doc.channels?.telegram !== false,
      email: ["none", "daily", "all"].includes(doc.channels?.email) ? doc.channels.email : "daily",
    },
    active: doc.active !== false,
    trialStartedAt: new Date(doc.trialStartedAt ?? doc.createdAt ?? Date.now()),
  };
}

function toState(doc: any): MonitorState | null {
  if (!doc) return null;
  return {
    uid: String(doc.uid),
    cursor: doc.cursor ? new Date(doc.cursor) : null,
    positions: doc.positions ?? {},
    quietDay: doc.quietDay ?? {},
    dailyDay: doc.dailyDay ?? null,
    lastQuotes: doc.lastQuotes ?? {},
    accessEndedAt: doc.accessEndedAt ? new Date(doc.accessEndedAt) : null,
    lastRunAt: doc.lastRunAt ? new Date(doc.lastRunAt) : null,
    lastSentAt: doc.lastSentAt ? new Date(doc.lastSentAt) : null,
  };
}

async function main(): Promise<void> {
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
    await withTimeout(appConnection().asPromise(), 15000);
  } catch (e: any) {
    console.error("[competitor-monitor] no se pudo conectar a Mongo:", e?.message || e);
    process.exit(1);
  }

  const transport = smtpTransport();
  if (!transport) console.warn("[competitor-monitor] SMTP sin configurar: sólo Telegram");
  const from = process.env.SMTP_FROM || "";
  const name = houseNames();
  const changes = rateChangesDb().getModel();

  const result = await runMonitors({
    now: new Date(),
    monitors: async () => ((await CompetitorMonitorModel.find({ active: true }).lean()) as any[]).map(toConfig),
    loadState: async (uid) => toState(await CompetitorMonitorStateModel.findOne({ uid }).lean()),
    saveState: async (state) => {
      await CompetitorMonitorStateModel.updateOne({ uid: state.uid }, { $set: state }, { upsert: true });
    },
    todayRows: async () => (await cambio_info.get_data()) as any[],
    changesSince: async (since, originList, codes) => {
      const docs = (await changes
        .find({ observedAt: { $gt: since }, origin: { $in: originList }, code: { $in: codes } })
        .sort({ observedAt: 1 })
        .lean()) as any[];
      return docs.map((d) => ({
        origin: d.origin,
        code: d.code,
        type: d.type || "",
        previousBuy: Number(d.previousBuy),
        previousSell: Number(d.previousSell),
        buy: Number(d.buy),
        sell: Number(d.sell),
        observedAt: new Date(d.observedAt),
      }));
    },
    hasBusinessKey: async (uid) =>
      (await apiKeyStore().list(uid)).some((k) => k.status === "active" && k.plan === "business"),
    telegramChatId: async (uid) => {
      const user = (await AppUserModel.findOne({ _id: uid }).lean()) as any;
      return user?.telegramChatId ? String(user.telegramChatId) : null;
    },
    name,
    sendTelegram: (chatId, text) => sendTelegramText(chatId, text),
    sendEmail: (to, message) => sendEmail(transport, from, to, message),
  });

  console.log(
    `[competitor-monitor] ${result.monitors} monitores, ${result.evaluated} evaluados, ${result.messages} mensajes, ` +
      `${result.sendFailures} envíos fallidos, ${result.failures} fallas, ${result.expiredNotices} pruebas vencidas`
  );
  await appConnection().close();
  process.exit(result.failures && !result.evaluated ? 1 : 0);
}

main().catch((e) => {
  console.error("[competitor-monitor] falló la corrida", e);
  process.exit(1);
});

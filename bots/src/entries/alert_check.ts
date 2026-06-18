// Cron entry: check each watched currency for a big move vs yesterday and, when
// it crosses the threshold (with cooldown/dedup), publish an alert. Run by pm2
// every ~15 min during market hours. DRY_RUN=1 logs instead of sending.
import "dotenv/config";
import { httpCambioApi } from "cambio-uruguay-mcp/api";
import { loadConfig } from "../config.js";
import { publishAlert } from "../publish/index.js";
import { buildAlertData } from "../report/data.js";
import { connectMongo, disconnectMongo } from "../store/mongo.js";
import { decideAlert, getAlertPrev, recordAlert } from "../store/alert_state.js";
import { deactivate, listActive } from "../store/subscribers.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  await connectMongo(cfg.mongoUri).catch((e) => console.error("mongo connect failed:", e));
  const api = httpCambioApi(cfg.apiBaseUrl);

  for (const currency of cfg.alert.currencies) {
    try {
      const alert = await buildAlertData(api, currency);
      if (!alert) continue;
      const prev = await getAlertPrev(currency);
      if (!decideAlert(prev, alert.changePct, Date.now(), cfg.alert)) continue;

      const telegramSubscribers = await listActive("telegram").catch(() => []);
      const res = await publishAlert({ cfg, alert, telegramSubscribers });
      if (res.deactivated.length) await deactivate("telegram", res.deactivated).catch(() => undefined);
      await recordAlert(currency, alert.direction, alert.changePct).catch(() => undefined);

      console.log(`alert ${currency} ${alert.direction} ${alert.changePct.toFixed(2)}% -> channels=${res.channels.join(",") || "none"}`);
    } catch (err) {
      console.error(`alert check ${currency} failed:`, err);
    }
  }
}

main()
  .catch((err) => {
    console.error("alert check fatal:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo().catch(() => undefined);
  });

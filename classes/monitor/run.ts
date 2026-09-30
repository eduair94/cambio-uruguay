// Una corrida del job `currency-competitor-monitor`: evalúa cada monitor activo, envía y guarda su
// estado. Todo lo que toca afuera (Mongo, Telegram, SMTP) entra por `RunDeps`, así la corrida se
// prueba sin nada de eso.
//
// Reglas del diseño: el estado se guarda ANTES de enviar (como mucho una vez: si pm2 corta el
// proceso o el envío falla, no se reenvía; un aviso de hace 20 minutos ya no sirve y el resumen del
// día lo cubre); un monitor que falla no corta a los demás; la prueba vencida manda UN aviso y deja
// de evaluar hasta que la cuenta tenga plan Empresa; con el presupuesto de tiempo agotado no se
// empiezan más monitores.
import { accessFor } from "./access";
import { dayStart, evaluate, MOVE_LOOKBACK_MS, type MonitorEvent } from "./events";
import { formatAccessEnded, formatEvents, type Message, type NameOf } from "./format";
import { groupQuotes, plausibleRows } from "./snapshot";
import { emptyState, type LedgerChange, type MonitorConfig, type MonitorState, type SnapshotRow } from "./types";

export interface RunDeps {
  now: Date;
  monitors(): Promise<MonitorConfig[]>;
  loadState(uid: string): Promise<MonitorState | null>;
  saveState(state: MonitorState): Promise<void>;
  todayRows(): Promise<SnapshotRow[]>;
  changesSince(since: Date, origins: string[], codes: string[]): Promise<LedgerChange[]>;
  hasBusinessKey(uid: string): Promise<boolean>;
  telegramChatId(uid: string): Promise<string | null>;
  name: NameOf;
  sendTelegram(chatId: string, text: string): Promise<boolean>;
  sendEmail(to: string, message: Message): Promise<boolean>;
  log?(message: string): void;
  /** Tiempo máximo para EMPEZAR monitores: pm2 corta el proceso en el próximo tick del cron. */
  budgetMs?: number;
  /** Reloj de la corrida (inyectable en los tests). */
  elapsedMs?(): number;
}

export interface RunResult {
  monitors: number;
  evaluated: number;
  messages: number;
  sendFailures: number;
  failures: number;
  expiredNotices: number;
  /** Monitores que no se empezaron por falta de tiempo; la próxima corrida los toma. */
  skipped: number;
}

async function deliver(
  deps: RunDeps,
  config: MonitorConfig,
  chatId: string | null,
  forTelegram: Message | null,
  forEmail: Message | null,
  result: RunResult
): Promise<boolean> {
  let any = false;
  if (forTelegram && chatId) {
    if (await deps.sendTelegram(chatId, forTelegram.text)) {
      any = true;
      result.messages++;
    } else result.sendFailures++;
  }
  if (forEmail && config.email) {
    if (await deps.sendEmail(config.email, forEmail)) {
      any = true;
      result.messages++;
    } else result.sendFailures++;
  }
  return any;
}

export async function runMonitors(deps: RunDeps): Promise<RunResult> {
  const log = deps.log ?? ((message: string) => console.log(`[competitor-monitor] ${message}`));
  const configs = await deps.monitors();
  const result: RunResult = {
    monitors: configs.length,
    evaluated: 0,
    messages: 0,
    sendFailures: 0,
    failures: 0,
    expiredNotices: 0,
    skipped: 0,
  };
  if (!configs.length) return result;
  const started = Date.now();
  const elapsed = deps.elapsedMs ?? (() => Date.now() - started);
  const budget = deps.budgetMs ?? 240_000;
  const rows = plausibleRows(await deps.todayRows());
  const since = new Date(Math.min(dayStart(deps.now).getTime(), deps.now.getTime() - MOVE_LOOKBACK_MS));

  for (const [index, config] of configs.entries()) {
    if (elapsed() > budget) {
      result.skipped = configs.length - index;
      log(`sin tiempo: quedan ${result.skipped} monitores para la próxima corrida`);
      break;
    }
    try {
      const state = (await deps.loadState(config.uid)) ?? emptyState(config.uid, deps.now);
      const access = accessFor(config.trialStartedAt, await deps.hasBusinessKey(config.uid), deps.now);
      const chatId = config.channels.telegram ? await deps.telegramChatId(config.uid) : null;

      if (access.status === "expired") {
        // Sin evaluar no se toca lastRunAt: si después le asignan el plan Empresa, la primera
        // evaluación re-aprende en vez de comparar contra una foto de hace semanas.
        if (!state.accessEndedAt) {
          state.accessEndedAt = deps.now;
          await deps.saveState(state);
          result.expiredNotices++;
          const notice = formatAccessEnded();
          const emailNotice = config.channels.email === "none" ? null : notice;
          if (await deliver(deps, config, chatId, notice, emailNotice, result)) {
            state.lastSentAt = deps.now;
            await deps.saveState(state);
          }
        }
        continue;
      }
      state.accessEndedAt = null;

      const group = [...new Set([...(config.ownOrigin ? [config.ownOrigin] : []), ...config.competitors])];
      const quotes = groupQuotes(rows, new Set(group), new Set(config.currencies));
      const changes = await deps.changesSince(since, group, config.currencies);
      const { events, state: next } = evaluate({ config, state, now: deps.now, quotes, changes });
      result.evaluated++;

      const onlyDaily = (list: MonitorEvent[]) => list.filter((e) => e.kind === "daily");
      const forTelegram = formatEvents(events, deps.name, deps.now);
      const forEmail =
        config.channels.email === "all"
          ? forTelegram
          : config.channels.email === "daily"
          ? formatEvents(onlyDaily(events), deps.name, deps.now)
          : null;
      await deps.saveState(next);
      if (await deliver(deps, config, chatId, forTelegram, forEmail, result)) {
        next.lastSentAt = deps.now;
        await deps.saveState(next);
      }
    } catch (e: any) {
      result.failures++;
      log(`monitor ${config.uid}: ${e?.message || e}`);
    }
  }
  return result;
}

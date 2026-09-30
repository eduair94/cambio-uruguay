import { describe, expect, it, vi } from "vitest";
import { runMonitors, type RunDeps } from "../../classes/monitor/run";
import { emptyState, type MonitorConfig, type MonitorState } from "../../classes/monitor/types";

const NOW = new Date("2026-09-29T14:05:00Z");
const min = (m: number) => new Date(NOW.getTime() - m * 60_000);

const config = (over: Partial<MonitorConfig> = {}): MonitorConfig => ({
  uid: "u1",
  email: "ana@casa.uy",
  ownOrigin: "propia",
  competitors: ["gales"],
  currencies: ["USD"],
  alerts: { moves: true, position: true, quiet: false, daily: true },
  channels: { telegram: true, email: "daily" },
  active: true,
  trialStartedAt: min(60 * 24),
  ...over,
});

/** Una corrida de hace 5 minutos que ya vio a gales en 40,10 / 42,60. */
function seenState(): MonitorState {
  return { ...emptyState("u1", min(5)), lastRunAt: min(5), lastQuotes: { "gales|USD": { buy: 40.1, sell: 42.6 } } };
}

function deps(over: Partial<RunDeps> = {}, states = new Map<string, MonitorState>()) {
  const sent: Array<{ via: string; to: string; text: string }> = [];
  const base: RunDeps = {
    now: NOW,
    monitors: async () => [config()],
    loadState: async (uid) => states.get(uid) ?? null,
    saveState: async (s) => {
      states.set(s.uid, s);
    },
    todayRows: async () => [
      { origin: "propia", code: "USD", type: "", buy: 40.1, sell: 42.6 },
      { origin: "gales", code: "USD", type: "", buy: 40.3, sell: 42.5 },
    ],
    changesSince: async () => [
      { origin: "gales", code: "USD", type: "", previousBuy: 40.1, previousSell: 42.6, buy: 40.3, sell: 42.5, observedAt: min(2) },
    ],
    hasBusinessKey: async () => false,
    telegramChatId: async () => "999",
    name: (o) => o,
    sendTelegram: async (to, text) => {
      sent.push({ via: "telegram", to, text });
      return true;
    },
    sendEmail: async (to, message) => {
      sent.push({ via: "email", to, text: message.text });
      return true;
    },
    log: () => undefined,
  };
  return { deps: { ...base, ...over }, sent, states };
}

describe("corrida del monitor", () => {
  it("un monitor nuevo arranca con el cursor en ahora: la primera corrida no avisa nada viejo", async () => {
    const { deps: d, sent, states } = deps();
    const r = await runMonitors(d);
    expect(r).toMatchObject({ monitors: 1, evaluated: 1, messages: 0 });
    expect(sent).toEqual([]);
    expect(states.get("u1")!.cursor).toEqual(NOW);
  });

  it("con estado previo, avisa por Telegram lo nuevo y el correo diario no recibe el movimiento", async () => {
    const states = new Map([["u1", seenState()]]);
    const { deps: d, sent } = deps({}, states);
    const r = await runMonitors(d);
    expect(r.messages).toBe(1);
    expect(sent.map((s) => s.via)).toEqual(["telegram"]);
    expect(sent[0].text).toContain("gales movió su pizarra");
    expect(states.get("u1")!.lastSentAt).toEqual(NOW);
  });

  it("con correo en 'all' recibe lo mismo por correo", async () => {
    const states = new Map([["u1", seenState()]]);
    const { deps: d, sent } = deps({ monitors: async () => [config({ channels: { telegram: false, email: "all" } })] }, states);
    await runMonitors(d);
    expect(sent.map((s) => [s.via, s.to])).toEqual([["email", "ana@casa.uy"]]);
  });

  it("el cursor avanza aunque el envío falle", async () => {
    const states = new Map([["u1", seenState()]]);
    const { deps: d } = deps({ sendTelegram: async () => false }, states);
    const r = await runMonitors(d);
    expect(r.sendFailures).toBe(1);
    expect(states.get("u1")!.cursor).toEqual(NOW);
    expect(states.get("u1")!.lastSentAt).toBeNull();
  });

  it("un monitor que falla no corta a los demás", async () => {
    const states = new Map<string, MonitorState>();
    const { deps: d } = deps(
      {
        monitors: async () => [config({ uid: "roto" }), config({ uid: "sano" })],
        telegramChatId: async (uid) => {
          if (uid === "roto") throw new Error("mongo");
          return "1";
        },
      },
      states
    );
    const r = await runMonitors(d);
    expect(r.failures).toBe(1);
    expect(states.has("sano")).toBe(true);
  });

  it("prueba vencida: un solo aviso, sin evaluar, y vuelve a andar con plan Empresa", async () => {
    const expired = config({ trialStartedAt: new Date(NOW.getTime() - 15 * 86_400_000) });
    const states = new Map([["u1", seenState()]]);
    const changesSince = vi.fn(async () => []);
    const first = deps({ monitors: async () => [expired], changesSince }, states);
    const r1 = await runMonitors(first.deps);
    expect(r1).toMatchObject({ expiredNotices: 1, evaluated: 0 });
    expect(first.sent.map((s) => s.via)).toEqual(["telegram", "email"]);
    expect(first.sent[0].text).toContain("Terminó la prueba");
    expect(changesSince).not.toHaveBeenCalled();

    const again = deps({ monitors: async () => [expired], changesSince }, states);
    const r2 = await runMonitors(again.deps);
    expect(r2.expiredNotices).toBe(0);
    expect(again.sent).toEqual([]);

    expect(states.get("u1")!.lastRunAt).toEqual(min(5));

    const paid = deps({ monitors: async () => [expired], hasBusinessKey: async () => true }, states);
    const r3 = await runMonitors(paid.deps);
    expect(r3.evaluated).toBe(1);
    expect(states.get("u1")!.accessEndedAt).toBeNull();
  });

  it("guarda el estado ANTES de enviar: un corte a mitad de camino no reenvía", async () => {
    const order: string[] = [];
    const states = new Map([["u1", seenState()]]);
    const { deps: d } = deps(
      {
        saveState: async (st) => {
          order.push(`save:${st.lastSentAt ? "sent" : "pending"}`);
          states.set(st.uid, st);
        },
        sendTelegram: async () => {
          order.push("send");
          return true;
        },
      },
      states
    );
    await runMonitors(d);
    expect(order).toEqual(["save:pending", "send", "save:sent"]);
  });

  it("si no se pudo guardar el estado, no se envía nada", async () => {
    const states = new Map([["u1", seenState()]]);
    const { deps: d, sent } = deps(
      {
        saveState: async () => {
          throw new Error("mongo");
        },
      },
      states
    );
    const r = await runMonitors(d);
    expect(r.failures).toBe(1);
    expect(sent).toEqual([]);
  });

  it("con el presupuesto de tiempo agotado no empieza más monitores", async () => {
    const states = new Map<string, MonitorState>();
    let elapsed = 0;
    const { deps: d } = deps(
      {
        monitors: async () => [config({ uid: "a" }), config({ uid: "b" })],
        budgetMs: 1000,
        elapsedMs: () => elapsed,
        saveState: async (st) => {
          states.set(st.uid, st);
          elapsed = 5000;
        },
      },
      states
    );
    const r = await runMonitors(d);
    expect(r.skipped).toBe(1);
    expect([...states.keys()]).toEqual(["a"]);
  });

  it("pide al ledger desde el principio del día y el grupo entero", async () => {
    const changesSince = vi.fn(async () => []);
    const { deps: d } = deps({ changesSince });
    await runMonitors(d);
    expect(changesSince).toHaveBeenCalledWith(new Date("2026-09-29T03:00:00.000Z"), ["propia", "gales"], ["USD"]);
  });
});

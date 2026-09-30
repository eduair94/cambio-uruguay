// La fusión por ficha y las guardas que impiden que una mala corrida pise un buen snapshot. Todo
// con un lector falso: sin red, sin Mongo.
import { describe, expect, it } from "vitest";
import {
  EARLY_STOP_APPS,
  RETRY_AFTER_CAP_MS,
  RETRY_BACKOFF_MS,
  RETRY_BUDGET,
  buildUsefulAppsSnapshot,
  usefulAppsDay,
  usefulAppsRunIsThin,
} from "../../classes/usefulapps/refresh";
import type { ReadOutcome } from "../../classes/usefulapps/stores";
import type { StoreListing, StoreName, UsefulAppsSnapshot } from "../../classes/usefulapps/types";

const NOW = new Date("2026-10-01T01:34:00Z");
const listing = (over: Partial<StoreListing> = {}): StoreListing => ({
  name: "X",
  developer: "Org",
  updated: "2026-09-01",
  rating: 4,
  ratingCount: 10,
  installs: null,
  icon: null,
  ...over,
});
const catalog = [
  { id: "a", android: "uy.a", ios: "111111", androidDeveloper: "Org", iosDeveloper: "Org" },
  { id: "b", android: "uy.b", androidDeveloper: "Org" },
];
const noSleep = async () => undefined;
const reader =
  (map: Record<string, ReadOutcome>) =>
  async (store: StoreName, id: string): Promise<ReadOutcome> =>
    map[`${store}:${id}`] ?? { kind: "error", message: "sin fixture" };

describe("buildUsefulAppsSnapshot", () => {
  it("guarda lo leído con la fecha del día y cuenta cada resultado", async () => {
    const snap = await buildUsefulAppsSnapshot({
      catalog,
      now: NOW,
      sleep: noSleep,
      read: reader({
        "android:uy.a": { kind: "ok", listing: listing() },
        "ios:111111": { kind: "missing" },
        "android:uy.b": { kind: "error", message: "HTTP 503" },
      }),
    });
    expect(snap.key).toBe("uy");
    // 01:34 UTC del 1/10 es la noche del 30/9 en Uruguay: ése es el día de la lectura.
    expect(snap.apps.a.android).toMatchObject({ status: "ok", checkedAt: "2026-09-30", developer: "Org" });
    expect(snap.apps.a.ios).toEqual({ status: "missing", checkedAt: "2026-09-30" });
    expect(snap.apps.b.android).toBeNull();
    expect(snap.counts).toEqual({ apps: 2, fresh: 1, missing: 1, failed: 1, retried: 2 });
  });

  it("un error conserva la lectura anterior con SU fecha", async () => {
    const previous = {
      key: "uy",
      capturedAt: new Date("2026-09-24T01:34:00Z"),
      apps: { b: { android: { status: "ok", checkedAt: "2026-09-24", rating: 3 } } },
      counts: { apps: 2, fresh: 3, missing: 0, failed: 0, retried: 0 },
      developerChanges: [],
    } as UsefulAppsSnapshot;
    const snap = await buildUsefulAppsSnapshot({
      catalog,
      previous,
      now: NOW,
      sleep: noSleep,
      read: reader({
        "android:uy.a": { kind: "ok", listing: listing() },
        "ios:111111": { kind: "ok", listing: listing() },
      }),
    });
    expect(snap.apps.b.android).toEqual({ status: "ok", checkedAt: "2026-09-24", rating: 3 });
  });

  it("anota cuando una ficha ya no la publica el desarrollador esperado", async () => {
    const snap = await buildUsefulAppsSnapshot({
      catalog,
      now: NOW,
      sleep: noSleep,
      read: reader({
        "android:uy.a": { kind: "ok", listing: listing({ developer: "Otro Dueño" }) },
        "ios:111111": { kind: "ok", listing: listing({ developer: " org " }) },
        "android:uy.b": { kind: "ok", listing: listing() },
      }),
    });
    expect(snap.developerChanges).toEqual([
      { id: "a", store: "android", expected: "Org", found: "Otro Dueño" },
    ]);
  });

  it("espera entre pedido y pedido, no antes del primero", async () => {
    const waits: number[] = [];
    await buildUsefulAppsSnapshot({
      catalog,
      now: NOW,
      gapMs: 1500,
      sleep: async ms => {
        waits.push(ms);
      },
      read: async () => ({ kind: "missing" }),
    });
    expect(waits).toEqual([1500, 1500]);
  });

  it("corta sin escribir si las primeras apps no consiguieron ninguna respuesta", async () => {
    const many = Array.from({ length: EARLY_STOP_APPS + 5 }, (_, i) => ({
      id: `x${i}`,
      android: `uy.x${i}`,
    }));
    await expect(
      buildUsefulAppsSnapshot({ catalog: many, now: NOW, sleep: noSleep, read: reader({}) })
    ).rejects.toThrow(/no obtuvieron ninguna respuesta/);
  });

  it("corta también si las primeras apps sólo dieron 404: un 404 es una respuesta, no una lectura", async () => {
    const many = Array.from({ length: EARLY_STOP_APPS + 5 }, (_, i) => ({
      id: `x${i}`,
      android: `uy.x${i}`,
    }));
    const all404 = async (): Promise<ReadOutcome> => ({ kind: "missing" });
    await expect(
      buildUsefulAppsSnapshot({ catalog: many, now: NOW, sleep: noSleep, read: all404 })
    ).rejects.toThrow(/no obtuvieron ninguna respuesta/);
  });

  it("reintenta un 429 con la espera que pide la tienda, con tope, y cuenta el reintento", async () => {
    const waits: number[] = [];
    let calls = 0;
    const flaky = async (): Promise<ReadOutcome> =>
      ++calls === 1
        ? { kind: "error", message: "HTTP 429", retryAfterMs: 120000 }
        : { kind: "ok", listing: listing() };
    const snap = await buildUsefulAppsSnapshot({
      catalog: [{ id: "b", android: "uy.b" }],
      now: NOW,
      sleep: async (ms) => {
        waits.push(ms);
      },
      read: flaky,
    });
    expect(calls).toBe(2);
    expect(waits).toEqual([RETRY_AFTER_CAP_MS]);
    expect(snap.counts).toMatchObject({ fresh: 1, failed: 0, retried: 1 });
  });

  it("sin Retry-After espera cada vez más y después se rinde: queda como fallida", async () => {
    const waits: number[] = [];
    const down = async (): Promise<ReadOutcome> => ({ kind: "error", message: "HTTP 503" });
    const snap = await buildUsefulAppsSnapshot({
      catalog: [{ id: "b", android: "uy.b" }],
      now: NOW,
      sleep: async (ms) => {
        waits.push(ms);
      },
      read: down,
    });
    expect(waits).toEqual([...RETRY_BACKOFF_MS]);
    expect(snap.counts).toMatchObject({ fresh: 0, failed: 1, retried: RETRY_BACKOFF_MS.length });
  });

  it("no reintenta una respuesta definitiva (403) y respeta el presupuesto de la corrida", async () => {
    let calls = 0;
    const forbidden = async (): Promise<ReadOutcome> => {
      calls++;
      return { kind: "error", message: "HTTP 403" };
    };
    await buildUsefulAppsSnapshot({
      catalog: [{ id: "b", android: "uy.b" }],
      now: NOW,
      sleep: noSleep,
      read: forbidden,
    });
    expect(calls).toBe(1);

    // Cada ficha falla la primera vez y anda en el reintento: el presupuesto se gasta y después las
    // fichas quedan como fallidas sin reintentar.
    let attempts = 0;
    const flakyEveryOther = async (): Promise<ReadOutcome> =>
      ++attempts % 2 === 0 ? { kind: "ok", listing: listing() } : { kind: "error", message: "HTTP 500" };
    const many = Array.from({ length: RETRY_BUDGET + 20 }, (_, i) => ({ id: `y${i}`, android: `uy.y${i}` }));
    const snap = await buildUsefulAppsSnapshot({ catalog: many, now: NOW, sleep: noSleep, read: flakyEveryOther });
    expect(snap.counts.retried).toBe(RETRY_BUDGET);
    expect(snap.counts.failed).toBeGreaterThan(0);
  });
});

describe("usefulAppsRunIsThin", () => {
  const snap = (fresh: number, missing: number, failed: number) =>
    ({
      key: "uy",
      capturedAt: NOW,
      apps: {},
      developerChanges: [],
      counts: { apps: fresh + missing + failed, fresh, missing, failed, retried: 0 },
    }) as UsefulAppsSnapshot;

  it("acepta una corrida sana, incluida la primera", () => {
    expect(usefulAppsRunIsThin(snap(200, 2, 10), null)).toBeNull();
    expect(usefulAppsRunIsThin(snap(200, 2, 10), snap(210, 1, 0))).toBeNull();
  });

  it("rechaza si falló más de la mitad de los pedidos", () => {
    expect(usefulAppsRunIsThin(snap(50, 0, 60), null)).toMatch(/fallaron 60 de 110/);
  });

  it("rechaza si contestaron menos de la mitad que la vez anterior", () => {
    expect(usefulAppsRunIsThin(snap(40, 0, 30), snap(200, 0, 0))).toMatch(/sólo 40 fichas/);
  });

  it("una corrida sin pedidos no escribe", () => {
    expect(usefulAppsRunIsThin(snap(0, 0, 0), null)).toMatch(/ninguna ficha/);
  });

  it("rechaza una tienda que contesta 404 a todo: escondería todos sus botones", () => {
    // Medido en la revisión: con todo Play en 404 quedaba {fresh:114, missing:118} y pasaba.
    expect(usefulAppsRunIsThin(snap(114, 118, 0), snap(232, 0, 0))).toMatch(/dieron 404/);
    expect(usefulAppsRunIsThin(snap(0, 232, 0), null)).toMatch(/se leyó bien/);
    expect(usefulAppsRunIsThin(snap(180, 40, 0), null)).toMatch(/dieron 404/);
  });

  it("deja pasar 404 que crecen de a poco", () => {
    expect(usefulAppsRunIsThin(snap(225, 7, 0), snap(230, 2, 0))).toBeNull();
    expect(usefulAppsRunIsThin(snap(220, 12, 0), snap(230, 2, 0))).toBeNull();
  });

  it("compara las fichas leídas bien, no las que contestaron", () => {
    expect(usefulAppsRunIsThin(snap(90, 20, 0), snap(200, 18, 0))).toMatch(/sólo 90 fichas/);
  });
});

describe("usefulAppsDay", () => {
  it("es el día de Uruguay, no el UTC", () => {
    expect(usefulAppsDay(new Date("2026-10-01T01:34:00Z"))).toBe("2026-09-30");
    expect(usefulAppsDay(new Date("2026-10-01T03:00:00Z"))).toBe("2026-10-01");
    expect(usefulAppsDay(new Date("2026-12-31T23:59:00Z"))).toBe("2026-12-31");
  });
});

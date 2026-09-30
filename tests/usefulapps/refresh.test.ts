// La fusión por ficha y las guardas que impiden que una mala corrida pise un buen snapshot. Todo
// con un lector falso: sin red, sin Mongo.
import { describe, expect, it } from "vitest";
import {
  EARLY_STOP_APPS,
  buildUsefulAppsSnapshot,
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
    expect(snap.apps.a.android).toMatchObject({ status: "ok", checkedAt: "2026-10-01", developer: "Org" });
    expect(snap.apps.a.ios).toEqual({ status: "missing", checkedAt: "2026-10-01" });
    expect(snap.apps.b.android).toBeNull();
    expect(snap.counts).toEqual({ apps: 2, fresh: 1, missing: 1, failed: 1 });
  });

  it("un error conserva la lectura anterior con SU fecha", async () => {
    const previous = {
      key: "uy",
      capturedAt: new Date("2026-09-24T01:34:00Z"),
      apps: { b: { android: { status: "ok", checkedAt: "2026-09-24", rating: 3 } } },
      counts: { apps: 2, fresh: 3, missing: 0, failed: 0 },
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
      read: reader({}),
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
});

describe("usefulAppsRunIsThin", () => {
  const snap = (fresh: number, missing: number, failed: number) =>
    ({
      key: "uy",
      capturedAt: NOW,
      apps: {},
      developerChanges: [],
      counts: { apps: fresh + missing + failed, fresh, missing, failed },
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
});

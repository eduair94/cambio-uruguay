import { describe, expect, it } from "vitest";
import { MovilidadItemModel } from "../../classes/models/MovilidadItem";
import { MovilidadMetaModel } from "../../classes/models/MovilidadMeta";
import { MovilidadStoreSnapshotModel } from "../../classes/models/MovilidadStoreSnapshot";
import {
  MOVILIDAD_META_KEY,
  MOVILIDAD_STORE_SNAPSHOT_KEY,
  withHistory,
  type PreviousItem,
} from "../../classes/movilidad/store";
import type { EquiparItem } from "../../classes/equipar/types";

// `.schema` / `.collection.name` are answered statically by the appModel proxy (classes/appdb.ts)
// without ever opening a connection — no APP_MONGO_URI needed for any test in this file.

const item = (over: Partial<EquiparItem> = {}): EquiparItem => ({
  key: "monopatin-electrico:urbano",
  category: "monopatin-electrico",
  categoryLabel: "Monopatín eléctrico",
  variant: "urbano",
  variantLabel: "Urbano o estándar",
  room: "movilidad",
  tier: "B",
  rank: 0,
  variantRank: 2,
  image: null,
  regime: "modelo",
  reason: "x",
  usedOk: true,
  usedNote: "x",
  quantity: 1,
  newBand: { p25: 10000, median: 12000, p75: 15000, min: 9000, n: 8 },
  usedBand: null,
  usedSavingPct: null,
  products: [],
  offers: [],
  suspectDropped: 0,
  observedAt: "2026-09-17T00:00:00.000Z",
  ...over,
});

describe("classes/movilidad/store", () => {
  it("vive en documentos propios de la base de la app, con sus propias claves — nunca las de equipar", () => {
    expect(MOVILIDAD_META_KEY).toBe("movilidad-electrica-uruguay");
    expect(MOVILIDAD_STORE_SNAPSHOT_KEY).toBe("movilidad-store-listings");
    expect(MOVILIDAD_META_KEY).not.toBe("equipar-casa-uruguay");
    expect(MOVILIDAD_STORE_SNAPSHOT_KEY).not.toBe("equipar-store-listings");
    expect(MovilidadItemModel.collection.name).toBe("movilidaditems");
    expect(MovilidadMetaModel.collection.name).toBe("movilidadmeta");
    expect(MovilidadStoreSnapshotModel.collection.name).toBe("movilidadstoresnapshots");
  });

  it("declara los mismos campos que el espejo de la app (ver tests/appdb/schema_parity.test.ts para la prueba cruzada)", () => {
    expect(Object.keys(MovilidadItemModel.schema.obj)).toContain("history");
    expect(Object.keys(MovilidadItemModel.schema.obj)).toContain("firstSeen");
    expect(Object.keys(MovilidadMetaModel.schema.obj)).not.toContain("baskets");
  });

  it("withHistory: primera vez que se ve un ítem, firstSeen es hoy y el historial tiene un solo punto", () => {
    const [stored] = withHistory([item()], new Map<string, PreviousItem>(), "2026-09-17");
    expect(stored!.firstSeen).toBe("2026-09-17");
    expect(stored!.lastSeen).toBe("2026-09-17");
    expect(stored!.history).toEqual([{ date: "2026-09-17", newMedian: 12000, usedMedian: null }]);
  });

  it("withHistory: conserva firstSeen y agrega el punto de hoy sin perder el de ayer", () => {
    const previous = new Map<string, PreviousItem>([
      [
        "monopatin-electrico:urbano",
        { firstSeen: "2026-08-01", history: [{ date: "2026-09-16", newMedian: 11000, usedMedian: null }] },
      ],
    ]);
    const [stored] = withHistory([item()], previous, "2026-09-17");
    expect(stored!.firstSeen).toBe("2026-08-01");
    expect(stored!.history).toEqual([
      { date: "2026-09-16", newMedian: 11000, usedMedian: null },
      { date: "2026-09-17", newMedian: 12000, usedMedian: null },
    ]);
  });

  it("withHistory: una resincronización el mismo día reemplaza el punto, nunca lo duplica", () => {
    const previous = new Map<string, PreviousItem>([
      [
        "monopatin-electrico:urbano",
        { firstSeen: "2026-08-01", history: [{ date: "2026-09-17", newMedian: 9999, usedMedian: null }] },
      ],
    ]);
    const [stored] = withHistory([item()], previous, "2026-09-17");
    expect(stored!.history).toEqual([{ date: "2026-09-17", newMedian: 12000, usedMedian: null }]);
  });

  it("withHistory: recorta a 365 puntos, el más viejo primero", () => {
    const long = Array.from({ length: 365 }, (_, i) => ({
      date: `2025-${String((i % 12) + 1).padStart(2, "0")}-01`,
      newMedian: i,
      usedMedian: null,
    }));
    const previous = new Map<string, PreviousItem>([["monopatin-electrico:urbano", { firstSeen: "2020-01-01", history: long }]]);
    const [stored] = withHistory([item()], previous, "2026-09-17");
    expect(stored!.history).toHaveLength(365);
    expect(stored!.history[stored!.history.length - 1]).toEqual({ date: "2026-09-17", newMedian: 12000, usedMedian: null });
  });
});

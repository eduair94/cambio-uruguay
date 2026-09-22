// La lista blanca de indexación de las fichas de alquiler: qué rutas cuentan, cuándo NO se escribe,
// y que el documento tenga exactamente la forma que el app declara (paridad de esquema).
import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../classes/gsc/client", () => ({
  MAX_ROWS_PER_REQUEST: 4,
  searchAnalytics: vi.fn(),
  dayOffset: (days: number, now: number) => new Date(now - days * 86400000).toISOString().slice(0, 10),
  lastFinalDay: (now: number) => new Date(now - 3 * 86400000).toISOString().slice(0, 10),
}));

const findOne = vi.fn();
const updateOne = vi.fn();
vi.mock("../../classes/models/SeoIndexAllowlist", () => ({
  SeoIndexAllowlistModel: {
    findOne: (...args: unknown[]) => ({ lean: () => ({ exec: () => findOne(...args) }) }),
    updateOne: (...args: unknown[]) => updateOne(...args),
  },
}));

import { searchAnalytics } from "../../classes/gsc/client";
import {
  allowlistIsThin,
  allowlistPath,
  buildIndexAllowlist,
  refreshIndexAllowlist,
  syncIndexAllowlists,
  INDEX_ALLOWLIST_FAMILIES,
  INDEX_ALLOWLIST_MIN_IMPRESSIONS,
  INDEX_ALLOWLIST_WINDOW_DAYS,
} from "../../classes/gsc/indexAllowlist";
import type { GscRow } from "../../classes/gsc/types";

const NOW = Date.parse("2026-09-22T12:00:00Z");
const row = (page: string, impressions: number): GscRow => ({
  keys: [page],
  clicks: 0,
  impressions,
  ctr: 0,
  position: 12,
});
const site = "https://cambio-uruguay.com";

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockResolvedValue(null);
  updateOne.mockResolvedValue({});
});

describe("allowlistPath", () => {
  it("keeps only the family's own routes, without host, query, hash or trailing slash", () => {
    expect(allowlistPath(`${site}/alquileres/pocitos-12?utm_source=x#top`, "/alquileres/")).toBe(
      "/alquileres/pocitos-12"
    );
    expect(allowlistPath(`${site}/alquileres/pocitos-12/`, "/alquileres/")).toBe("/alquileres/pocitos-12");
    // El hub contiene "/alquileres" pero no abre con el prefijo de ficha: nunca entra a la lista.
    expect(allowlistPath(`${site}/alquileres-uruguay`, "/alquileres/")).toBeNull();
    expect(allowlistPath(`${site}/alquileres/`, "/alquileres/")).toBeNull();
    expect(allowlistPath("no es una url", "/alquileres/")).toBeNull();
  });
  it("folds the retired /en and /pt mirrors into the Spanish route — the subject is the property", () => {
    expect(allowlistPath(`${site}/en/alquileres/pocitos-12`, "/alquileres/")).toBe("/alquileres/pocitos-12");
    expect(allowlistPath(`${site}/pt/alquileres/pocitos-12`, "/alquileres/")).toBe("/alquileres/pocitos-12");
    // "/entre-rios/..." no es un prefijo de idioma.
    expect(allowlistPath(`${site}/entre/alquileres/x`, "/alquileres/")).toBeNull();
  });
});

describe("buildIndexAllowlist", () => {
  it("sums impressions per route and keeps the ones at or above the threshold", () => {
    const doc = buildIndexAllowlist(
      [
        row(`${site}/alquileres/a`, 3),
        row(`${site}/alquileres/a?x=1`, 2), // 3 + 2 = 5 → entra justo en el umbral
        row(`${site}/en/alquileres/b`, 4), // espejo + ruta española = 6
        row(`${site}/alquileres/b`, 2),
        row(`${site}/alquileres/c`, 4), // 4 < 5 → afuera
        row(`${site}/alquileres-uruguay`, 900), // el hub no es una ficha
      ],
      { family: "alquileres", pathPrefix: "/alquileres/", asOf: "2026-09-22", complete: true }
    );
    expect(doc).toEqual({
      family: "alquileres",
      asOf: "2026-09-22",
      windowDays: INDEX_ALLOWLIST_WINDOW_DAYS,
      minImpressions: INDEX_ALLOWLIST_MIN_IMPRESSIONS,
      urls: ["/alquileres/a", "/alquileres/b"],
      rowCount: 5,
      complete: true,
    });
    expect(INDEX_ALLOWLIST_WINDOW_DAYS).toBe(56);
    expect(INDEX_ALLOWLIST_MIN_IMPRESSIONS).toBe(5);
  });
});

describe("refreshIndexAllowlist", () => {
  it("asks for a 56-day final window by page, filtered to the family, and marks completeness", async () => {
    vi.mocked(searchAnalytics).mockResolvedValue([row(`${site}/alquileres/a`, 9)]);
    const doc = await refreshIndexAllowlist(INDEX_ALLOWLIST_FAMILIES[0]!, NOW);
    // 56 días INCLUSIVE terminando en el último día final (hoy − 3): 26/7..19/9.
    expect(searchAnalytics).toHaveBeenCalledWith({
      startDate: "2026-07-26",
      endDate: "2026-09-19",
      dimensions: ["page"],
      dimensionFilterGroups: [
        { filters: [{ dimension: "page", operator: "contains", expression: "/alquileres/" }] },
      ],
      dataState: "final",
      maxRows: 4,
    });
    expect(doc).toMatchObject({ asOf: "2026-09-22", urls: ["/alquileres/a"], complete: true });
  });
  it("returns null on zero rows — a broken answer, never a family without demand", async () => {
    vi.mocked(searchAnalytics).mockResolvedValue([]);
    expect(await refreshIndexAllowlist(INDEX_ALLOWLIST_FAMILIES[0]!, NOW)).toBeNull();
  });
  it("flags a response that hit the API row cap as incomplete", async () => {
    vi.mocked(searchAnalytics).mockResolvedValue(
      ["a", "b", "c", "d"].map((k) => row(`${site}/alquileres/${k}`, 9))
    );
    expect((await refreshIndexAllowlist(INDEX_ALLOWLIST_FAMILIES[0]!, NOW))?.complete).toBe(false);
  });
});

describe("syncIndexAllowlists", () => {
  it("writes the document when the answer has body", async () => {
    vi.mocked(searchAnalytics).mockResolvedValue([row(`${site}/alquileres/a`, 9)]);
    const out = await syncIndexAllowlists({ dryRun: false, now: NOW });
    expect(out).toEqual([{ family: "alquileres", urls: 1, rowCount: 1, written: true, note: "ok" }]);
    expect(updateOne).toHaveBeenCalledWith(
      { family: "alquileres" },
      { $set: expect.objectContaining({ family: "alquileres", urls: ["/alquileres/a"] }) },
      { upsert: true }
    );
  });
  it("keeps the previous document on zero rows, on an API failure and on a dry run", async () => {
    vi.mocked(searchAnalytics).mockResolvedValueOnce([]);
    expect((await syncIndexAllowlists({ dryRun: false, now: NOW }))[0]!.written).toBe(false);
    vi.mocked(searchAnalytics).mockRejectedValueOnce(new Error("403 forbidden"));
    const failed = (await syncIndexAllowlists({ dryRun: false, now: NOW }))[0]!;
    expect(failed.written).toBe(false);
    expect(failed.note).toContain("403 forbidden");
    vi.mocked(searchAnalytics).mockResolvedValueOnce([row(`${site}/alquileres/a`, 9)]);
    expect((await syncIndexAllowlists({ dryRun: true, now: NOW }))[0]!.written).toBe(false);
    expect(updateOne).not.toHaveBeenCalled();
  });
  it("never writes a row-capped (incomplete) answer over the previous document", async () => {
    // El app ignora `complete: false`; escribirlo igual borraría la última lista completa, que es
    // la única que sí se aplica.
    vi.mocked(searchAnalytics).mockResolvedValue(
      ["a", "b", "c", "d"].map((k) => row(`${site}/alquileres/${k}`, 9))
    );
    const out = await syncIndexAllowlists({ dryRun: false, now: NOW });
    expect(out[0]).toMatchObject({ family: "alquileres", urls: 4, rowCount: 4, written: false });
    expect(out[0]!.note).toContain("INCOMPLETA");
    expect(findOne).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });
  it("refuses to shrink a list with body to less than 30 % of it", async () => {
    const previous = buildIndexAllowlist(
      Array.from({ length: 40 }, (_, i) => row(`${site}/alquileres/p${i}`, 9)),
      { family: "alquileres", pathPrefix: "/alquileres/", asOf: "2026-09-21", complete: true }
    );
    findOne.mockResolvedValue(previous);
    vi.mocked(searchAnalytics).mockResolvedValue([row(`${site}/alquileres/a`, 9)]);
    const out = await syncIndexAllowlists({ dryRun: false, now: NOW });
    expect(out[0]!.written).toBe(false);
    expect(out[0]!.note).toContain("flaca");
    expect(updateOne).not.toHaveBeenCalled();
    // Con una lista chica guardada, el 30 % es ruido de una o dos fichas: se escribe igual.
    expect(allowlistIsThin(buildIndexAllowlist([], { ...previous, complete: true, pathPrefix: "/alquileres/" }), {
      ...previous,
      urls: previous.urls.slice(0, 10),
    })).toBe(false);
  });
});

describe("schema parity with the app", () => {
  // Mismo contrato que tests/appdb/schema_parity.test.ts: un campo que el backend escriba y el app
  // no declare se guarda igual pero nunca llega al lector, y acá el lector decide qué se desindexa.
  it("SeoIndexAllowlist declares exactly the app's top-level fields", async () => {
    vi.doUnmock("../../classes/models/SeoIndexAllowlist");
    const { SeoIndexAllowlistModel } = await vi.importActual<typeof import("../../classes/models/SeoIndexAllowlist")>(
      "../../classes/models/SeoIndexAllowlist"
    );
    const src = fs.readFileSync(
      path.join(__dirname, "..", "..", "app", "server", "models", "SeoIndexAllowlist.ts"),
      "utf8"
    );
    const body = /new Schema(?:<[^>]+>)?\(\s*\{([\s\S]*?)\n  \},/.exec(src)?.[1] ?? "";
    const appFields = [...body.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]!);
    expect(Object.keys(SeoIndexAllowlistModel.schema.obj).sort()).toEqual(appFields.sort());
    expect(SeoIndexAllowlistModel.collection.name).toBe("seoindexallowlists");
  });
});

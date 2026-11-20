import { describe, expect, it } from "vitest";
import { STATE_FIRST_SEEN_MAX } from "../../classes/insights/caps";
import {
  fetchSitemapPaths,
  firstSeenLookup,
  isNewPath,
  parseSitemapPaths,
  ThinSitemap,
  updateFirstSeen,
} from "../../classes/insights/sources/sitemap";

const urls = (n: number, prefix = "/p") => Array.from({ length: n }, (_, i) => `https://cambio-uruguay.com${prefix}${i}`);

describe("sitemap", () => {
  it("menos de 200 URLs es una lectura rota", async () => {
    await expect(fetchSitemapPaths(async () => ({ data: urls(150) }))).rejects.toBeInstanceOf(ThinSitemap);
    const ok = await fetchSitemapPaths(async () => ({ data: { urls: urls(250).map((loc) => ({ loc })) } }));
    expect(ok.length).toBe(250);
  });

  it("acepta string, {loc} y {url}, y descarta otro host", () => {
    expect(
      parseSitemapPaths(["https://cambio-uruguay.com/a", { loc: "https://cambio-uruguay.com/b?x=1" }, { url: "/c" }, "https://otro.com/d"])
    ).toEqual(["/a", "/b", "/c"]);
  });

  it("la siembra nunca es nueva; una ruta nueva en castellano sí", () => {
    const seed = updateFirstSeen(null, ["/a", "/b", "/en/a"], "2026-11-01", "2026-11-01T12:00:00Z");
    expect(seed.seededAt).toBe("2026-11-01");
    expect(seed.firstSeen.map((x) => x[0]).sort()).toEqual(["/a", "/b"]);
    const lookup0 = firstSeenLookup(seed);
    expect(isNewPath(lookup0("/a"), seed.seededAt, "2026-11-05", 14)).toBe(false);

    const next = updateFirstSeen(seed, ["/a", "/b", "/c", "/en/a", "/fr/huerfana"], "2026-11-10", "2026-11-10T12:00:00Z");
    const lookup = firstSeenLookup(next);
    expect(lookup("/c")).toBe("2026-11-10");
    expect(isNewPath(lookup("/c"), next.seededAt, "2026-11-12", 14)).toBe(true);
    // una ruta traducida toma la fecha de su par en castellano; una huérfana no tiene fecha
    expect(lookup("/en/a")).toBe("2026-11-01");
    expect(lookup("/fr/huerfana")).toBeNull();
    expect(isNewPath(lookup("/fr/huerfana"), next.seededAt, "2026-11-12", 14)).toBe(false);
  });

  it("una ruta que salió del sitemap se recuerda 35 días", () => {
    const seed = updateFirstSeen(null, ["/a", "/b"], "2026-10-01", "x");
    const gone = updateFirstSeen(seed, ["/a"], "2026-10-02", "x");
    expect(gone.firstSeen.map((x) => x[0]).sort()).toEqual(["/a", "/b"]);
    const still = updateFirstSeen(gone, ["/a"], "2026-11-05", "x");
    expect(still.firstSeen.map((x) => x[0]).sort()).toEqual(["/a", "/b"]);
    const dropped = updateFirstSeen(still, ["/a"], "2026-11-07", "x");
    expect(dropped.firstSeen.map((x) => x[0])).toEqual(["/a"]);
  });

  it("con el tope pasado: `capped` y la segunda corrida no inventa rutas nuevas", () => {
    const paths = Array.from({ length: STATE_FIRST_SEEN_MAX + 10 }, (_, i) => `/p${i}`);
    const lines: string[] = [];
    const first = updateFirstSeen(null, paths, "2026-11-01", "x", (l) => lines.push(l));
    expect(first.capped).toBe(true);
    expect(first.firstSeen.length).toBe(STATE_FIRST_SEEN_MAX);
    expect(lines.length).toBe(1);
    const second = updateFirstSeen(first, paths, "2026-11-02", "x");
    expect(second.capped).toBe(true);
    expect(second.firstSeen.filter(([, d]) => d === "2026-11-02").length).toBe(0);
  });
});

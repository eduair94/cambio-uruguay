import { afterEach, describe, expect, it, vi } from "vitest";
import { SUR_DATASET, surResource } from "../../classes/utilities/claims/source";

// Around 2026-11 the catalog renamed the Intendencia's datasets (org prefix, long slugs truncated)
// and the old SUR slug answered 404 every day without anyone noticing (CAMBIO-URUGUAY-BACKEND-1R).

const ZIP = "https://ckan-data.montevideo.gub.uy/dataset/c34e11ea/resource/ccb644b1/download/reclamos.zip";
const TITLE = "Reclamos registrados en el Sistema Unico de Reclamos de la Intendencia de Montevideo";
const PREVIOUS = "reclamos-registrados-en-el-sistema-unico-de-reclamos-de-la-intendencia-de-montevideo";
const pkg = (title = TITLE) => ({
  title,
  resources: [{ url: "https://x.gub.uy/metadata.txt" }, { url: ZIP, last_modified: "2026-11-15T10:26:46.810171" }],
});
const ok = (result: unknown) => new Response(JSON.stringify({ success: true, result }), { status: 200 });
const notFound = () => new Response(JSON.stringify({ success: false, error: { message: "No encontrado" } }), { status: 404 });

/** Routes by URL suffix or substring; anything else answers 404, like the catalog does. */
function stub(routes: Array<[(url: string) => boolean, () => Response]>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(String(url));
      const route = routes.find(([matches]) => matches(String(url)));
      return route ? route[1]() : notFound();
    }),
  );
  return calls;
}
const show = (slug: string) => (url: string) => url.endsWith(`package_show?id=${slug}`);
const search = (url: string) => url.includes("/package_search?");
const action = (url: string) => url.split("/action/")[1]?.split("?")[0];

afterEach(() => vi.unstubAllGlobals());

describe("SUR archive lookup", () => {
  it("uses the current slug", async () => {
    const calls = stub([[show(SUR_DATASET), () => ok(pkg())]]);
    await expect(surResource()).resolves.toEqual({ url: ZIP, modified: "2026-11-15T10:26:46.810171" });
    expect(calls.map(action)).toEqual(["package_show"]);
  });

  it("falls back to the previous slug", async () => {
    const calls = stub([[show(PREVIOUS), () => ok(pkg())]]);
    await expect(surResource()).resolves.toMatchObject({ url: ZIP });
    expect(calls).toHaveLength(2);
  });

  it("then to the one dataset with the exact title", async () => {
    const calls = stub([[search, () => ok({ results: [pkg("Solicitudes de arbolado"), pkg()] })]]);
    await expect(surResource()).resolves.toMatchObject({ url: ZIP });
    expect(calls.map(action)).toEqual(["package_show", "package_show", "package_search"]);
  });

  it("refuses an ambiguous or empty search, and does not mask other HTTP errors", async () => {
    stub([[search, () => ok({ results: [pkg(), pkg()] })]]);
    await expect(surResource()).rejects.toThrow("SUR dataset not found in CKAN");
    stub([[search, () => ok({ results: [] })]]);
    await expect(surResource()).rejects.toThrow("SUR dataset not found in CKAN");
    stub([[(url) => url.includes("/package_show?"), () => new Response("", { status: 503 })]]);
    await expect(surResource()).rejects.toThrow("CKAN HTTP 503");
  });
});

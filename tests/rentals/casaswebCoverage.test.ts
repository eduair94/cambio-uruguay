import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchText } from "../../classes/rentals/net";
import { harvestCasasweb, parseCasaswebPage } from "../../classes/rentals/sources/casasweb";
import { sourcesAllowingExpiry } from "../../classes/rentals/sources/types";

vi.mock("../../classes/rentals/net", () => ({ fetchText: vi.fn() }));

interface Card { id: number | null; title?: string }
interface SearchPage {
  department?: number;
  type?: string;
  page?: number;
  total?: number;
  hasNext?: boolean;
  cards?: Card[];
}

// Reduced structure from public search responses observed 2026-09-07. No external requests.
function searchHtml({ department = 1, type = "a", page = 1, total = 0, hasNext = false, cards = [] }: SearchPage): string {
  const label = type === "f" ? "Chacra" : type === "g" ? "Garaje" : "Apartamento";
  return `<form>
    <input type="hidden" name="__VIEWSTATE" value="page-${page}" />
    <select id="ctl00_content_drpNegocio" name="ctl00$content$drpNegocio"><option value="A" selected>Alquiler</option></select>
    <select id="ctl00_content_drpDepto" name="ctl00$content$drpDepto"><option value="${department}" selected>Departamento</option></select>
    <select id="ctl00_content_drpTipo" name="ctl00$content$drpTipo"><option value="${type}" selected>${label}</option></select>
    <span>${total} Resultados</span>
    ${cards.map(card => `<div class="card"><a href="ALQUILER_CW${card.id ?? ""}">
      <div class="item-info">
        <div class="tipo-propiedad-zona"><small><b>${label}</b>Centro</small><small><strong>${card.id === null ? "" : `CW${card.id}`}</strong>${department === 3 ? "Canelones" : "Montevideo"}</small></div>
        <div class="item-title"><h3>${card.title ?? `Alquiler ${label} de 2 dormitorios`}</h3></div>
        <div class="item-precio"><div class="precio"><h3>ALQUILER</h3><h2><small>UYU</small> MES 25.000</h2></div></div>
      </div></a></div>`).join("")}
    <input type="submit" id="ctl00_content_btnP${page - 1}" name="ctl00$content$btnP${page - 1}" value="${page}" class="${page === 1 ? "btn-outline-secondary" : "btn-secondary"}" />
    ${hasNext ? `<input type="submit" id="ctl00_content_btnP${page}" name="ctl00$content$btnP${page}" value="${page + 1}" class="btn-outline-secondary" />` : ""}
  </form>`;
}

function serve(target?: (page: number) => SearchPage | null): { department: number; type: string; page: number }[] {
  const requests: { department: number; type: string; page: number }[] = [];
  vi.mocked(fetchText).mockImplementation(async (url, options = {}) => {
    const query = new URL(url).searchParams;
    const department = Number(query.get("x"));
    const type = query.get("t")!;
    const params = new URLSearchParams(typeof options.body === "string" ? options.body : undefined);
    const button = [...params.entries()].find(([key]) => /\$btnP\d+$/.test(key));
    const page = button ? Number(button[1]) : 1;
    requests.push({ department, type, page });
    if (department === 1 && type === "a" && target) {
      const result = target(page);
      return result === null ? null : searchHtml({ department, type, page, ...result });
    }
    return searchHtml({ department, type, page, ...(department === 3 && type === "f" ? { total: 1, cards: [{ id: 221797 }] } : {}) });
  });
  return requests;
}

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("Casasweb coverage and absence safety", () => {
  it("includes public Chacra searches in all 19 departments without adding requests to the fast sample", async () => {
    const requests = serve();
    const result = await harvestCasasweb("full", 40);
    expect(requests.filter(request => request.type === "f").map(request => request.department)).toEqual(Array.from({ length: 19 }, (_, index) => index + 1));
    expect(result).toMatchObject({ ok: true, complete: true });
    expect(result.listings).toEqual([expect.objectContaining({ listingId: "casasweb:CW221797", propertyType: "casa", department: "Canelones" })]);
    expect([...sourcesAllowingExpiry([result], "full")]).toEqual(["casasweb"]);
    requests.length = 0;
    const fast = await harvestCasasweb("fast", 40);
    expect(requests).toHaveLength(9);
    expect(requests.every(request => request.page === 1 && ["a", "c", "g"].includes(request.type))).toBe(true);
    expect(requests.filter(request => request.type === "g").map(request => request.department)).toEqual([1, 3, 10]);
    expect(fast.complete).toBe(false);
  });

  it("checks the actual form selection and accepts the portal's unhighlighted first-page button", () => {
    const result = parseCasaswebPage(searchHtml({ department: 3, type: "f", total: 1, cards: [{ id: 221797 }], hasNext: true }))!;
    expect(result).toMatchObject({ department: 3, propertyType: "f", currentPage: 1, advertIds: ["casasweb:CW221797"] });
    const next = new URLSearchParams(result.nextBody!);
    expect(next.get("ctl00$content$drpDepto")).toBe("3");
    expect(next.get("ctl00$content$drpTipo")).toBe("f");
    expect(next.get("ctl00$content$btnP1")).toBe("2");
    expect(next.get("__VIEWSTATE")).toBe("page-1");
  });

  it("preserves the portal's external-reference advert IDs as well as CW-prefixed ones", () => {
    const html = searchHtml({ total: 1, cards: [{ id: 1 }] }).replaceAll("CW1", "TKA8362149");
    const result = parseCasaswebPage(html)!;
    expect(result.advertIds).toEqual(["casasweb:TKA8362149"]);
    expect(result.listings[0]?.listingId).toBe("casasweb:TKA8362149");
  });

  it.each([
    ["department", { department: 3 }],
    ["property type", { type: "c" }],
    ["page", { page: 1 }],
  ] as const)("preserves earlier observations but disallows expiry if the next response changes %s", async (_, mismatch) => {
    serve(page => page === 1
      ? { total: 2, hasNext: true, cards: [{ id: 1 }] }
      : { total: 2, cards: [{ id: 2 }], ...mismatch });
    const result = await harvestCasasweb("full", 40);
    expect(result).toMatchObject({ ok: true, complete: false });
    expect(result.listings.some(row => row.listingId === "casasweb:CW1")).toBe(true);
    expect(result.listings.some(row => row.listingId === "casasweb:CW2")).toBe(false);
    expect([...sourcesAllowingExpiry([result], "full")]).toEqual([]);
  });

  it("does not treat an overlapping pair of pages as four unique adverts", async () => {
    serve(page => ({ total: 4, hasNext: page === 1, cards: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 2 }, { id: 3 }] }));
    const result = await harvestCasasweb("full", 40);
    expect(result.complete).toBe(false);
    expect(result.listings.map(row => row.listingId)).toEqual(["casasweb:CW1", "casasweb:CW2", "casasweb:CW3", "casasweb:CW221797"]);
    expect([...sourcesAllowingExpiry([result], "full")]).toEqual([]);
  });

  it("includes explicitly excluded cards when measuring coverage, without publishing them", async () => {
    serve(() => ({ total: 2, cards: [{ id: 1, title: "Alquiler temporal por noche" }, { id: 2, title: "Apartamento alquilado" }] }));
    const result = await harvestCasasweb("full", 40);
    expect(result).toMatchObject({ ok: true, complete: true });
    expect(result.listings.map(row => row.listingId)).toEqual(["casasweb:CW221797"]);
  });

  it("stops a reordered repeated page even if every card is ineligible", async () => {
    const requests = serve(page => ({ total: 6, hasNext: true, cards: (page === 1 ? [1, 2] : [2, 1]).map(id => ({ id, title: "Alquiler temporal por noche" })) }));
    const result = await harvestCasasweb("full", 40);
    expect(requests.filter(request => request.department === 1 && request.type === "a")).toHaveLength(2);
    expect(result.complete).toBe(false);
    expect(result.listings.map(row => row.listingId)).toEqual(["casasweb:CW221797"]);
  });

  it("keeps partial status when the live total changes even if the final total was reached", async () => {
    serve(page => page === 1
      ? { total: 2, hasNext: true, cards: [{ id: 1 }] }
      : { total: 3, cards: [{ id: 2 }, { id: 3 }] });
    const result = await harvestCasasweb("full", 40);
    expect(result.complete).toBe(false);
    expect(result.listings).toHaveLength(4);
  });

  it("does not certify coverage when a raw card has no attributable advert ID", async () => {
    serve(() => ({ total: 2, cards: [{ id: 1 }, { id: null }] }));
    const result = await harvestCasasweb("full", 40);
    expect(result.complete).toBe(false);
    expect(result.listings.map(row => row.listingId)).toEqual(["casasweb:CW1", "casasweb:CW221797"]);
  });

  it("keeps collected adverts when the configured page cap prevents reaching the end", async () => {
    vi.stubEnv("RENTALS_CW_MAX_PAGES", "1");
    serve(() => ({ total: 2, hasNext: true, cards: [{ id: 1 }] }));
    const result = await harvestCasasweb("full", 40);
    expect(result).toMatchObject({ ok: true, complete: false });
    expect(result.listings.map(row => row.listingId)).toEqual(["casasweb:CW1", "casasweb:CW221797"]);
  });
});

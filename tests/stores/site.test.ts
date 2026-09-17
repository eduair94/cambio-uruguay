// Signal 1 of 2 for /tiendas-online-uruguay: what a store's own homepage publishes. Every assertion
// here runs against a small hand-written HTML fixture (tests/stores/fixtures/*.html) — never a
// downloaded site — so the parser is exercised deterministically and `parseSite` stays pure (no
// network inside it; network lives only in `fetchSite`/`httpText`, mocked below via global fetch).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSite } from "../../classes/stores/signals/site";
import { httpText } from "../../classes/stores/net";

const FIXTURES = join(__dirname, "fixtures");
const fixture = (name: string) => readFileSync(join(FIXTURES, name), "utf8");

const FINAL_URL = "https://tiendaejemplo.com.uy/";
const CHECKED_AT = "2026-09-16T00:00:00.000Z";

describe("parseSite: platform detection", () => {
  it("recognizes Fenicio from its CDN host", () => {
    expect(parseSite(fixture("fenicio.html"), "https://bertoni.com.uy/", CHECKED_AT).platform).toBe("fenicio");
  });

  it("recognizes Shopify from its CDN host", () => {
    expect(parseSite(fixture("shopify.html"), "https://ejemplo.com/", CHECKED_AT).platform).toBe("shopify");
  });

  it("recognizes VTEX from its image CDN", () => {
    expect(parseSite(fixture("vtex.html"), "https://ejemplo.com/", CHECKED_AT).platform).toBe("vtex");
  });

  it("recognizes WooCommerce from its body class", () => {
    expect(parseSite(fixture("woocommerce.html"), "https://ejemplo.com/", CHECKED_AT).platform).toBe("woocommerce");
  });
});

describe("parseSite: Cloudflare / bot-challenge pages", () => {
  it("reports status blocked instead of guessing a platform from the challenge page", () => {
    const signal = parseSite(fixture("blocked.html"), "https://loi.com.uy/", CHECKED_AT);
    expect(signal.status).toBe("blocked");
  });
});

describe("parseSite: finalHost / https", () => {
  it("derives finalHost and https from the final URL, not the requested domain", () => {
    const signal = parseSite(fixture("full-profile.html"), FINAL_URL, CHECKED_AT);
    expect(signal.finalHost).toBe("tiendaejemplo.com.uy");
    expect(signal.https).toBe(true);
    expect(signal.checkedAt).toBe(CHECKED_AT);
  });
});

describe("parseSite: contact channels", () => {
  const signal = parseSite(fixture("full-profile.html"), FINAL_URL, CHECKED_AT);

  it("finds a tel: link", () => {
    expect(signal.phone).toBe(true);
  });

  it("finds a wa.me link", () => {
    expect(signal.whatsapp).toBe(true);
  });

  it("finds a mailto: link", () => {
    expect(signal.email).toBe(true);
  });
});

describe("parseSite: RUT", () => {
  it("reads a 12-digit RUT written as 'RUT: <digits>'", () => {
    const signal = parseSite(fixture("full-profile.html"), FINAL_URL, CHECKED_AT);
    expect(signal.rut).toBe("214567890012");
  });

  it("reads a 12-digit RUT written as 'R.U.T. <spaced digits>'", () => {
    const signal = parseSite(fixture("rut-spaced.html"), FINAL_URL, CHECKED_AT);
    expect(signal.rut).toBe("214567890012");
  });

  it("never guesses a RUT from a 12-digit number with no RUT label nearby", () => {
    const signal = parseSite(fixture("rut-unlabeled.html"), FINAL_URL, CHECKED_AT);
    expect(signal.rut).toBeNull();
  });

  // Regression: the label must be a standalone token. "ruta", "bruto", "fruta" and "rutina" all
  // contain the letters r-u-t inside an ordinary word, and an earlier version of RUT_LABEL_RE
  // matched them, publishing whatever 12-digit number followed as a fabricated RUT.
  it.each([
    ["ruta (word starts with rut, more letters after)", "Seguí tu pedido en ruta: código 214567890012"],
    ["bruto (word ends with rut, letter before)", "Precio bruto: 214567890012"],
    ["fruta (letter before rut, letters after too)", "Vendemos fruta 214567890012"],
    ["rutina (word starts with rut, more letters after)", "Arma tu rutina 214567890012"],
  ])("never matches 'rut' embedded inside another word: %s", (_label, text) => {
    const html = `<!doctype html><html><body><p>${text}</p></body></html>`;
    expect(parseSite(html, FINAL_URL, CHECKED_AT).rut).toBeNull();
  });
});

describe("parseSite: JSON-LD address", () => {
  it("reads street + locality from a JSON-LD PostalAddress", () => {
    const signal = parseSite(fixture("full-profile.html"), FINAL_URL, CHECKED_AT);
    expect(signal.address).toBe("Av. 8 de Octubre 3908, Montevideo");
  });

  it("never guesses an address from plain text without JSON-LD", () => {
    const signal = parseSite(fixture("no-jsonld.html"), FINAL_URL, CHECKED_AT);
    expect(signal.address).toBeNull();
  });
});

describe("parseSite: policy links", () => {
  const signal = parseSite(fixture("full-profile.html"), FINAL_URL, CHECKED_AT);

  it("resolves the returns policy to an absolute URL on the final host", () => {
    expect(signal.policies.returns).toBe("https://tiendaejemplo.com.uy/politica-de-devoluciones");
  });

  it("resolves the terms link by its anchor text", () => {
    expect(signal.policies.terms).toBe("https://tiendaejemplo.com.uy/legales/terminos");
  });

  it("resolves the privacy link by its anchor text", () => {
    expect(signal.policies.privacy).toBe("https://tiendaejemplo.com.uy/legales/privacidad");
  });
});

describe("parseSite: payment methods", () => {
  it("lists every mentioned method once, in the fixed canonical order", () => {
    const signal = parseSite(fixture("full-profile.html"), FINAL_URL, CHECKED_AT);
    // The fixture mentions Visa twice and lists the rest out of order on purpose: the output must
    // still be deduplicated and always in this exact order, never the order they appear in the page.
    expect(signal.payments).toEqual([
      "mercadopago",
      "visa",
      "mastercard",
      "oca",
      "abitab",
      "redpagos",
      "transferencia",
    ]);
  });
});

describe("httpText", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns status/url/body on a normal response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>ok</html>", { status: 200 })));
    const result = await httpText("https://ejemplo.com/");
    expect(result?.status).toBe(200);
    expect(result?.body).toBe("<html>ok</html>");
    expect(typeof result?.url).toBe("string");
  });

  it("still returns the body for a non-2xx status instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(fixture("blocked.html"), { status: 403 })));
    const result = await httpText("https://loi.com.uy/");
    expect(result?.status).toBe(403);
    expect(result?.body).toContain("Just a moment");
  });

  it("returns undefined when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );
    expect(await httpText("https://ejemplo.com/")).toBeUndefined();
  });

  it("sends the bot-identification header and a browser user-agent", async () => {
    // Typed against the real `fetch` signature (not inferred from the zero-arg implementation
    // below) so `.mock.calls[0]` is `Parameters<typeof fetch>` instead of `[]` — an untyped
    // `vi.fn()` here made tsc infer an empty-tuple call shape and reject the `as [string,
    // RequestInit]` cast (TS2352) under tsconfig.production.json, which the root tsconfig
    // includes via `./**/*.ts` and which gates every backend deploy.
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await httpText("https://ejemplo.com/");
    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-cambio-uruguay-bot"]).toBe("store-profiles");
    expect(headers["user-agent"]).toMatch(/Chrome/);
  });
});

describe("fetchSite", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses the page fetched from https://<domain>/", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(fixture("full-profile.html"), { status: 200 }))
    );
    const { fetchSite } = await import("../../classes/stores/signals/site");
    const signal = await fetchSite("tiendaejemplo.com.uy");
    expect(signal?.status).toBe("ok");
    expect(signal?.rut).toBe("214567890012");
  });

  it("still parses (as blocked) a >=400 response carrying a challenge body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(fixture("blocked.html"), { status: 403 })));
    const { fetchSite } = await import("../../classes/stores/signals/site");
    const signal = await fetchSite("loi.com.uy");
    expect(signal?.status).toBe("blocked");
  });

  it("returns undefined when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );
    const { fetchSite } = await import("../../classes/stores/signals/site");
    expect(await fetchSite("ejemplo.com")).toBeUndefined();
  });
});

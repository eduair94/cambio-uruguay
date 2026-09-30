// Los parsers de las dos fichas contra recortes REALES (BPS Personas, 30/9/2026) y la lectura con
// un fetch falso: sin red.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  appStoreIcon,
  parseAppStoreListing,
  parsePlayDate,
  parsePlayListing,
  playIcon,
  readListing,
  retryAfterMs,
} from "../../classes/usefulapps/stores";

const FIXTURES = path.join(__dirname, "fixtures");
const read = (name: string) => fs.readFileSync(path.join(FIXTURES, name), "utf8");

describe("parsePlayDate", () => {
  it("lee las fechas cortas de Play en español", () => {
    expect(parsePlayDate("10 ago 2026")).toBe("2026-08-10");
    expect(parsePlayDate("3 sept 2025")).toBe("2025-09-03");
    expect(parsePlayDate("3 sept. 2025")).toBe("2025-09-03");
    expect(parsePlayDate("1 ene 2024")).toBe("2024-01-01");
  });

  it("rechaza lo que no es una fecha", () => {
    expect(parsePlayDate("ayer")).toBeNull();
    expect(parsePlayDate("31 feb 2026")).toBeNull();
    expect(parsePlayDate("10 foo 2026")).toBeNull();
  });
});

describe("ficha de Google Play", () => {
  const listing = parsePlayListing(read("play-bps-personas.html"));

  it("lee nombre, desarrollador, nota, opiniones, descargas y fecha", () => {
    expect(listing).toMatchObject({
      name: "BPS Personas",
      developer: "Banco de Prevision Social",
      updated: "2026-08-10",
      ratingCount: 1434,
      installs: "100 k+",
    });
    expect(listing?.rating).toBeCloseTo(4.359, 2);
  });

  it("pide el ícono en 128 px", () => {
    expect(listing?.icon).toMatch(/^https:\/\/play-lh\.googleusercontent\.com\/.+=s128$/);
  });

  it("una página sin JSON-LD no es una ficha", () => {
    expect(parsePlayListing("<html><body>Captcha</body></html>")).toBeNull();
  });
});

describe("ficha del App Store", () => {
  const html = read("appstore-bps-personas.html");
  const listing = parseAppStoreListing(html);

  it("lee la fecha de la última versión del historial", () => {
    expect(listing).toMatchObject({
      name: "BPS Personas",
      developer: "Banco de Previsión Social",
      updated: "2026-09-02",
      rating: 3.6,
      ratingCount: 114,
      installs: null,
    });
  });

  it("pide el ícono cuadrado de 128 px, no la imagen para redes", () => {
    expect(listing?.icon).toMatch(/^https:\/\/is1-ssl\.mzstatic\.com\/.+\/128x128bb\.png$/);
  });

  it("sin versionHistory usa el <time> que acompaña al número de versión", () => {
    expect(parseAppStoreListing(html.replace('"versionHistory"', '"otraCosa"'))?.updated).toBe(
      "2026-09-02"
    );
  });
});

describe("íconos", () => {
  it("sólo acepta las CDN de las tiendas y normaliza el tamaño", () => {
    expect(playIcon("https://play-lh.googleusercontent.com/abc=w240-h480-rw")).toBe(
      "https://play-lh.googleusercontent.com/abc=s128"
    );
    expect(playIcon("https://play-lh.googleusercontent.com/abc")).toBe(
      "https://play-lh.googleusercontent.com/abc=s128"
    );
    expect(playIcon("https://evil.example/abc")).toBeNull();
    expect(
      appStoreIcon("https://is1-ssl.mzstatic.com/image/thumb/x/AppIcon.png/1200x630wa.png")
    ).toBe("https://is1-ssl.mzstatic.com/image/thumb/x/AppIcon.png/128x128bb.png");
    expect(appStoreIcon("https://mzstatic.com.evil.example/x/1200x630wa.png")).toBeNull();
  });
});

describe("readListing", () => {
  const html = read("play-bps-personas.html");
  const respond = (status: number, body = "") => async () => new Response(body, { status });

  it("un 404 es una ausencia explícita", async () => {
    expect(await readListing("android", "x.y", respond(404))).toEqual({ kind: "missing" });
  });

  it("un 5xx o una página sin JSON-LD son errores, no ausencias", async () => {
    expect((await readListing("android", "x.y", respond(503))).kind).toBe("error");
    expect((await readListing("android", "x.y", respond(200, "<html></html>"))).kind).toBe("error");
  });

  it("un fallo de red es un error y no tira", async () => {
    const boom = async (): Promise<Response> => {
      throw new Error("ECONNRESET");
    };
    expect(await readListing("ios", "123", boom)).toEqual({ kind: "error", message: "ECONNRESET" });
  });

  it("pide la ficha de Uruguay con la UA honesta del bot", async () => {
    const seen: { url: string; ua: string | null }[] = [];
    const spy = async (url: string, init?: RequestInit) => {
      seen.push({ url, ua: new Headers(init?.headers).get("user-agent") });
      return new Response(html, { status: 200 });
    };
    expect((await readListing("android", "uy.gub.bps.movil.persona", spy)).kind).toBe("ok");
    expect(seen).toEqual([
      {
        url: "https://play.google.com/store/apps/details?id=uy.gub.bps.movil.persona&hl=es_419&gl=UY",
        ua: "cambio-uruguay.com apps bot (+https://cambio-uruguay.com)",
      },
    ]);
  });
});

describe("retryAfterMs", () => {
  it("lee segundos o una fecha HTTP, y nada si no se entiende", () => {
    expect(retryAfterMs("12")).toBe(12000);
    expect(retryAfterMs("0")).toBe(0);
    const now = Date.parse("2026-10-01T01:34:00Z");
    expect(retryAfterMs("Thu, 01 Oct 2026 01:34:30 GMT", now)).toBe(30000);
    expect(retryAfterMs("Thu, 01 Oct 2026 01:00:00 GMT", now)).toBe(0);
    expect(retryAfterMs(null)).toBeUndefined();
    expect(retryAfterMs("")).toBeUndefined();
    expect(retryAfterMs("pronto")).toBeUndefined();
  });
});

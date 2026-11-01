import { describe, expect, it } from "vitest";
import type { Ga4Report } from "../../classes/site-analytics/ga4";
import { kindOf, SITE_HOSTS, sourceId, sourceLabel } from "../../classes/site-analytics/sourceKinds";
import {
  buildTrafficSources,
  CURRENT_DAYS,
  HISTORY_MONTHS,
  MIN_LISTED_SESSIONS,
  publicReferrer,
  trafficSourceRequests,
  trafficSourcesIsThin,
  trafficWindows,
} from "../../classes/site-analytics/trafficSources";

function report(dims: string[], metrics: string[], rows: (string | number)[][]): Ga4Report {
  return {
    dimensionHeaders: dims.map((name) => ({ name })),
    metricHeaders: metrics.map((name) => ({ name })),
    rows: rows.map((row) => ({
      dimensionValues: row.slice(0, dims.length).map((value) => ({ value: String(value) })),
      metricValues: row.slice(dims.length).map((value) => ({ value: String(value) })),
    })),
  };
}

const NOW = new Date("2026-10-30T12:00:00Z");
const W = trafficWindows(NOW, "America/Montevideo");

describe("sourceId", () => {
  it.each([
    ["t.co", "x.com"],
    ["twitter.com", "x.com"],
    ["android-app://com.reddit.frontpage/", "reddit.com"],
    ["com.reddit.frontpage", "reddit.com"],
    ["out.reddit.com", "reddit.com"],
    ["old.reddit.com", "reddit.com"],
    ["m.facebook.com", "facebook.com"],
    ["lm.facebook.com", "facebook.com"],
    ["l.instagram.com", "instagram.com"],
    ["es.search.yahoo.com", "yahoo"],
    ["yahoo", "yahoo"],
    ["www.google.com.uy", "google"],
    ["google", "google"],
    ["cn.bing.com", "bing"],
    ["yandex.ru", "yandex"],
    ["ya.ru", "yandex"],
    ["chat.openai.com", "chatgpt.com"],
    ["copilot.microsoft.com", "copilot.com"],
    ["gemini", "gemini.google.com"],
    ["mail.google.com", "gmail"],
    ["localhost:3311", "localhost"],
    ["https://www.aocr.org/", "aocr.org"],
    ["GitHub.com", "github.com"],
    ["statics.teams.cdn.office.net", "teams"],
    ["usc-excel.officeapps.live.com", "office"],
  ])("%s → %s", (raw, id) => {
    expect(sourceId(raw)).toBe(id);
  });

  it("deja las rutas y los (not set) como están: son artefactos", () => {
    expect(sourceId("/tarjetas-de-credito-uruguay")).toBe("/tarjetas-de-credito-uruguay");
    expect(sourceId("(not set)")).toBe("(not set)");
    expect(sourceId("")).toBe("(not set)");
  });

  it("no confunde gemini.google.com ni mail.google.com con el buscador", () => {
    expect(sourceId("gemini.google.com")).toBe("gemini.google.com");
    expect(sourceId("mail.google.com")).not.toBe("google");
  });
});

describe("kindOf", () => {
  it.each([
    ["google", "organic", "buscador"],
    ["yahoo", "referral", "buscador"],
    ["ecosia", "organic", "buscador"],
    ["chatgpt.com", "referral", "ia"],
    ["chatgpt.com", "(none)", "ia"],
    ["perplexity.ai", "ai-assistant", "ia"],
    ["x.com", "referral", "social"],
    ["reddit.com", "referral", "social"],
    ["webmail.montevideo.com.uy", "referral", "mensajes"],
    ["gmail", "referral", "mensajes"],
    ["teams", "referral", "mensajes"],
    ["office", "referral", "mensajes"],
    ["warframe-app.digitalshopuy.com", "referral", "propio"],
    ["status.cambio-uruguay.com", "referral", "propio"],
    ["app-cambio-uruguay", "referral", "propio"],
    ["aocr.org", "referral", "sitio"],
    ["github.com", "referral", "sitio"],
    ["(direct)", "(none)", "directo"],
    ["auto", "(not set)", "sin-atribuir"],
    ["button", "(not set)", "sin-atribuir"],
    ["/tarjetas-de-credito-uruguay", "(not set)", "sin-atribuir"],
    ["(not set)", "(not set)", "sin-atribuir"],
    ["localhost", "referral", "sin-atribuir"],
    ["192.168.0.229", "referral", "sin-atribuir"],
    ["104.234.204.107", "referral", "sin-atribuir"],
    ["cambio-uruguay.com", "referral", "sin-atribuir"],
    ["online.seranking.com", "referral", "sin-atribuir"],
    ["workona.com", "referral", "sin-atribuir"],
  ] as const)("%s (%s) → %s", (id, medium, kind) => {
    expect(kindOf(id, medium)).toBe(kind);
  });

  it("pone nombre humano a los conocidos y deja el dominio al resto", () => {
    expect(sourceLabel("x.com")).toBe("X (Twitter)");
    expect(sourceLabel("chatgpt.com")).toBe("ChatGPT");
    expect(sourceLabel("aocr.org")).toBe("aocr.org");
  });
});

describe("trafficWindows", () => {
  it("90 días hasta ayer y 24 meses que terminan en el mes de ayer", () => {
    expect(W.current).toEqual({ start: "2026-08-01", end: "2026-10-29", days: CURRENT_DAYS });
    expect(W.months).toHaveLength(HISTORY_MONTHS);
    expect(W.months[0]).toBe("2024-11");
    expect(W.months[W.months.length - 1]).toBe("2026-10");
    expect(W.history).toEqual({ start: "2024-11-01", end: "2026-10-29", months: HISTORY_MONTHS });
  });
});

describe("trafficSourceRequests", () => {
  it("todos los reportes filtran por el host del sitio (la propiedad la comparte otra app)", () => {
    const reqs = trafficSourceRequests(W);
    expect(reqs).toHaveLength(7);
    for (const r of reqs) expect(JSON.stringify(r.dimensionFilter)).toContain('"hostName"');
    expect(JSON.stringify(reqs[0].dimensionFilter)).toContain(JSON.stringify([...SITE_HOSTS]));
  });

  it("los de Uruguay filtran por país", () => {
    const reqs = trafficSourceRequests(W);
    expect(JSON.stringify(reqs[1].dimensionFilter)).toContain('"countryId"');
    expect(JSON.stringify(reqs[3].dimensionFilter)).toContain('"countryId"');
    expect(JSON.stringify(reqs[0].dimensionFilter)).not.toContain('"countryId"');
  });
});

describe("publicReferrer", () => {
  it("publica host y ruta, sin www, querystring ni ancla", () => {
    expect(publicReferrer("https://www.example.com/foro/hilo-123/?utm=x&token=abc#c4")).toEqual({
      url: "example.com/foro/hilo-123",
      host: "example.com",
    });
    expect(publicReferrer("https://www.aocr.org/")).toEqual({ url: "aocr.org", host: "aocr.org" });
  });

  it("descarta lo que no es web", () => {
    expect(publicReferrer("android-app://com.reddit.frontpage/")).toBeNull();
    expect(publicReferrer("no es una url")).toBeNull();
    expect(publicReferrer("")).toBeNull();
  });
});

function fixture(): Ga4Report[] {
  const SM = ["sessionSource", "sessionMedium"];
  return [
    report(
      SM,
      ["sessions", "engagedSessions"],
      [
        ["google", "organic", 800, 500],
        ["(direct)", "(none)", 3000, 200],
        ["t.co", "referral", 960, 820],
        ["chatgpt.com", "ai-assistant", 120, 80],
        ["chatgpt.com", "referral", 10, 9],
        ["com.reddit.frontpage", "referral", 30, 20],
        ["reddit.com", "referral", 40, 30],
        ["auto", "(not set)", 50, 10],
        ["localhost:3311", "referral", 9, 9],
        ["aocr.org", "referral", 2, 0],
      ],
    ),
    report(
      SM,
      ["sessions", "engagedSessions"],
      [
        ["google", "organic", 700, 450],
        ["(direct)", "(none)", 250, 150],
        ["t.co", "referral", 930, 800],
        ["chatgpt.com", "ai-assistant", 100, 70],
      ],
    ),
    report(
      ["yearMonth", ...SM],
      ["sessions"],
      [
        ["202608", "t.co", "referral", 960],
        ["202609", "chatgpt.com", "ai-assistant", 40],
        ["202610", "chatgpt.com", "ai-assistant", 90],
        ["202610", "google", "organic", 800],
        ["202610", "(direct)", "(none)", 3000],
        ["202610", "reddit.com", "referral", 40],
        ["202609", "com.reddit.frontpage", "referral", 30],
        ["202610", "auto", "(not set)", 50],
        ["202610", "localhost:3311", "referral", 9],
        ["202610", "aocr.org", "referral", 2],
        // Fuera de la ventana: suma a la historia pero no a un mes.
        ["202301", "github.com", "referral", 5],
      ],
    ),
    report(
      ["yearMonth", ...SM],
      ["sessions"],
      [
        ["202608", "t.co", "referral", 930],
        ["202610", "google", "organic", 700],
      ],
    ),
    report(
      ["date", ...SM],
      ["sessions"],
      [
        ["20260816", "t.co", "referral", 33],
        ["20260817", "t.co", "referral", 900],
        ["20260818", "t.co", "referral", 27],
        ["20261026", "chatgpt.com", "ai-assistant", 85],
        ["20261027", "chatgpt.com", "ai-assistant", 45],
      ],
    ),
    report(
      [...SM, "landingPage"],
      ["sessions"],
      [
        ["t.co", "referral", "/tarjetas-de-credito-uruguay", 940],
        ["t.co", "referral", "/saldar-deudas-uruguay?utm_source=x", 15],
        ["t.co", "referral", "(not set)", 33],
        ["chatgpt.com", "ai-assistant", "/", 60],
        ["chatgpt.com", "ai-assistant", "/celulares-uruguay", 30],
        ["chatgpt.com", "ai-assistant", "/autos-usados-uruguay", 20],
        ["chatgpt.com", "ai-assistant", "/pensiones-estudiantiles-uruguay", 10],
      ],
    ),
    report(
      ["pageReferrer"],
      ["screenPageViews"],
      [
        ["https://github.com/eduair94/cambio-uruguay?tab=readme-ov-file", 9],
        ["https://github.com/eduair94/cambio-uruguay", 14],
        ["https://t.co/", 1031],
        ["https://www.reddit.com/", 1438],
        ["https://webmail.montevideo.com.uy/inbox?sid=SECRETO", 40],
        ["https://chatgpt.com/c/123", 30],
        ["https://www.google.com/", 9000],
        ["https://foro.example.org/hilo/1", 2],
        ["https://www.cambio-uruguay.com/dolar-hoy", 500],
      ],
    ),
  ];
}

describe("buildTrafficSources", () => {
  const doc = buildTrafficSources(fixture(), { windows: W, asOf: NOW.toISOString() });

  it("une las variantes de una misma fuente", () => {
    const reddit = doc.sources.find((s) => s.id === "reddit.com")!;
    expect(reddit.sessions).toBe(70);
    expect(reddit.history).toBe(70);
    expect(reddit.label).toBe("Reddit");
    const chatgpt = doc.sources.find((s) => s.id === "chatgpt.com")!;
    expect(chatgpt.sessions).toBe(130);
    expect(chatgpt.kind).toBe("ia");
  });

  it("nunca lista directo, artefactos ni desarrollo", () => {
    const ids = doc.sources.map((s) => s.id);
    expect(ids).not.toContain("(direct)");
    expect(ids).not.toContain("auto");
    expect(ids).not.toContain("localhost");
    expect(doc.kinds.find((k) => k.kind === "sin-atribuir")!.sessions).toBe(59);
    expect(doc.kinds.find((k) => k.kind === "directo")!.sessions).toBe(3000);
  });

  it("deja afuera las fuentes chicas y las cuenta en `others`", () => {
    expect(doc.sources.find((s) => s.id === "aocr.org")).toBeUndefined();
    expect(MIN_LISTED_SESSIONS).toBeGreaterThan(2);
    expect(doc.others.count).toBe(1);
    expect(doc.others.history).toBe(2);
  });

  it("encuentra el pico y los días activos de un referente", () => {
    const x = doc.sources.find((s) => s.id === "x.com")!;
    expect(x.peak).toEqual({ day: "2026-08-17", sessions: 900 });
    expect(x.activeDays).toBe(3);
    expect(x.monthly[W.months.indexOf("2026-08")]).toBe(960);
    expect(x.historyUy).toBe(930);
    expect(doc.sources.find((s) => s.id === "google")!.activeDays).toBeNull();
  });

  it("de los buscadores no publica días, pico ni aterrizaje (sólo vería su parte referral)", () => {
    const yahoo = buildTrafficSources(
      [
        report(["sessionSource", "sessionMedium"], ["sessions", "engagedSessions"], [["yahoo", "organic", 50, 30]]),
        report([], [], []),
        report(["yearMonth", "sessionSource", "sessionMedium"], ["sessions"], [["202610", "yahoo", "organic", 50]]),
        report([], [], []),
        report(
          ["date", "sessionSource", "sessionMedium"],
          ["sessions"],
          [["20261011", "es.search.yahoo.com", "referral", 1]],
        ),
        report(
          ["sessionSource", "sessionMedium", "landingPage"],
          ["sessions"],
          [["es.search.yahoo.com", "referral", "/", 1]],
        ),
        report([], [], []),
      ],
      { windows: W, asOf: NOW.toISOString() },
    ).sources[0];
    expect(yahoo.id).toBe("yahoo");
    expect(yahoo.activeDays).toBeNull();
    expect(yahoo.peak).toBeNull();
    expect(yahoo.landings).toEqual([]);
  });

  it("páginas de aterrizaje sin querystring, sin (not set), tres como máximo", () => {
    const x = doc.sources.find((s) => s.id === "x.com")!;
    expect(x.landings).toEqual([
      { path: "/tarjetas-de-credito-uruguay", sessions: 940 },
      { path: "/saldar-deudas-uruguay", sessions: 15 },
    ]);
    expect(doc.sources.find((s) => s.id === "chatgpt.com")!.landings).toHaveLength(3);
  });

  it("publica sólo las páginas exactas de sitios y redes, con umbral", () => {
    expect(doc.referrers).toEqual([
      { url: "github.com/eduair94/cambio-uruguay", sourceId: "github.com", kind: "sitio", views: 23 },
    ]);
  });

  it("los totales suman todo, también lo que no se lista", () => {
    expect(doc.totals.sessions).toBe(800 + 3000 + 960 + 130 + 70 + 50 + 9 + 2);
    expect(doc.totals.sessionsUy).toBe(700 + 250 + 930 + 100);
    expect(doc.totals.history).toBe(960 + 130 + 800 + 3000 + 70 + 50 + 9 + 2 + 5);
  });

  it("no publica querystrings, IPs, localhost ni la bandeja de un correo", () => {
    const json = JSON.stringify(doc);
    expect(json).not.toContain("?");
    expect(json).not.toContain("SECRETO");
    expect(json).not.toContain("localhost");
    expect(json).not.toContain("192.168");
    expect(json).not.toContain("webmail");
  });

  it("un documento sin sesiones o sin fuentes es flaco", () => {
    expect(trafficSourcesIsThin(doc)).toBe(false);
    expect(trafficSourcesIsThin(buildTrafficSources([], { windows: W, asOf: NOW.toISOString() }))).toBe(true);
  });
});

// El digest en Markdown que imprimen el dry run y `npm run insights`. Puro.
//
// Es el punto de partida de cada iteración: primero las señales (lo que hay que arreglar, con las
// páginas y los números), después la tabla de páginas. Sólo marcadores ASCII, castellano, números en
// formato es-UY. No imprime nada que no esté ya en el snapshot privado.
import { SIGNAL_IDS, SOURCE_IDS } from "./types";
import type { InsightPageRow, Signal, SignalId, SourceBlock, SourceId, UsageInsightDay, UsageInsightSnapshot } from "./types";
import { fmtInt, fmtPct, orderSignals } from "./signals";
import { sitePath } from "./paths";

export interface DigestOptions {
  page?: string | null;
  signal?: SignalId | null;
  source?: SourceId | null;
  top?: number;
  all?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  ok: "ok",
  partial: "parcial",
  thin: "rechazado por flaco",
  failed: "falló",
  inactive: "inactiva",
  skipped: "no corrió",
};
const SEVERITY_LABEL: Record<Signal["severity"], string> = { high: "alta", medium: "media", low: "baja", none: "ninguna" };
const UNIT_LABEL: Record<Signal["impactUnit"], string> = {
  "cf-loads": "cargas",
  "ga4-views": "vistas",
  events: "eventos",
  impressions: "impresiones",
  requests: "pedidos",
};

type Kind = "path" | "text" | "int" | "pct" | "ms" | "cls" | "num" | "bool";
const COLUMNS: Record<SignalId, [string, string, Kind][]> = {
  "consent-gap": [
    ["path", "página", "path"],
    ["cfVisits", "entradas CF", "int"],
    ["ga4LandingSessions", "sesiones GA4", "int"],
    ["landingCoverage", "cobertura", "pct"],
    ["siteCoverage", "sitio", "pct"],
    ["loadsCoverage", "por cargas", "pct"],
  ],
  "mobile-worse": [
    ["path", "página", "path"],
    ["mobileViews", "vistas cel", "int"],
    ["mobileEngagement", "interacción cel", "pct"],
    ["desktopEngagement", "interacción escr", "pct"],
    ["mobileAvgSec", "seg cel", "num"],
    ["desktopAvgSec", "seg escr", "num"],
    ["mobileCwv", "CWV cel", "text"],
  ],
  "low-reading": [
    ["path", "página", "path"],
    ["views", "vistas", "int"],
    ["read50Rate", "llega a 50 %", "pct"],
    ["read90Rate", "llega a 90 %", "pct"],
    ["clarityScroll", "scroll Clarity", "num"],
    ["template", "plantilla", "bool"],
  ],
  "poor-vitals": [
    ["path", "página", "path"],
    ["device", "disp.", "text"],
    ["metric", "métrica", "text"],
    ["poorShare", "malo", "pct"],
    ["p75Approx", "p75 aprox", "num"],
    ["element", "elemento", "text"],
  ],
  "search-no-results": [
    ["term", "término", "text"],
    ["path", "página", "path"],
    ["events", "eventos", "int"],
  ],
  "outbound-rate": [
    ["path", "página", "path"],
    ["views", "vistas", "int"],
    ["outboundRate", "salidas por vista", "pct"],
    ["topDomain", "dominio", "text"],
    ["topDomainShare", "del total", "pct"],
  ],
  "not-indexed": [
    ["path", "página", "path"],
    ["class", "clase", "text"],
    ["reason", "capa", "text"],
    ["checkedAt", "inspeccionada", "text"],
    ["googleCanonical", "canónica Google", "text"],
  ],
  "helpful-no": [
    ["path", "página", "path"],
    ["yes", "sí", "int"],
    ["no", "no", "int"],
    ["distinctNo", "personas «no»", "int"],
    ["noShare", "«no»", "pct"],
  ],
  friction: [
    ["path", "página", "path"],
    ["device", "disp.", "text"],
    ["population", "países", "text"],
    ["sessions", "sesiones sin bots", "int"],
    ["rageRate", "bronca", "pct"],
    ["deadRate", "muertos", "pct"],
    ["quickbackRate", "vuelta atrás", "pct"],
    ["which", "cuáles", "text"],
  ],
  "bing-only-queries": [
    ["query", "consulta", "text"],
    ["bingImpressions", "impr. Bing", "int"],
    ["bingClicks", "clics Bing", "int"],
    ["bingPosition", "posición", "num"],
    ["gscImpressions", "impr. Google", "int"],
  ],
  "ai-crawler-errors": [
    ["crawler", "rastreador", "text"],
    ["path", "página", "path"],
    ["status", "código", "int"],
    ["requests", "pedidos", "int"],
    ["kind", "tipo", "text"],
  ],
  "edge-errors": [
    ["path", "página", "path"],
    ["status", "código", "int"],
    ["requests", "pedidos", "int"],
    ["crawlerShare", "rastreadores", "pct"],
  ],
};

const esc = (s: string) => String(s).replace(/\|/g, "\\|").replace(/\s+/g, " ");

export function fmt(v: unknown, kind: Kind): string {
  if (v === null || v === undefined || v === "") return "—";
  switch (kind) {
    case "int":
      return fmtInt(Number(v));
    case "pct":
      return fmtPct(Number(v));
    case "ms":
      return Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1).replace(".", ",")} s` : `${Math.round(Number(v))} ms`;
    case "cls":
      return Number(v).toFixed(3).replace(".", ",");
    case "num":
      return Number.isFinite(Number(v)) ? (Math.round(Number(v) * 10) / 10).toLocaleString("es-UY") : "—";
    case "bool":
      return v ? "sí" : "no";
    default:
      return esc(String(v)).slice(0, 140);
  }
}

function table(headers: string[], rows: string[][]): string {
  if (!rows.length) return "_(sin filas)_";
  return [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join(
    "\n"
  );
}

const dm = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

function sourceLine(b: SourceBlock<any>): string {
  const status = STATUS_LABEL[b.status] || b.status;
  let s = `[${status}] ${b.id}`;
  if (b.fetchedAt) s += ` ${dm(b.fetchedAt)}`;
  if (b.status === "inactive" && b.enableHint) s += ` (${b.enableHint.split("(")[0].trim()})`;
  else if (b.note && b.status !== "ok") s += ` (${b.note.slice(0, 80)})`;
  return s;
}

function signalCell(row: Record<string, unknown>, key: string, kind: Kind, signal: Signal): string {
  const v = row[key];
  if (signal.id === "poor-vitals" && key === "p75Approx") return fmt(v, row.metric === "cls" ? "cls" : "ms");
  return fmt(v, kind);
}

function renderSignal(s: Signal, n: number, top: number): string {
  const head = `### ${n}. ${s.id} [${SEVERITY_LABEL[s.severity]}] · ${fmtInt(s.count)} filas${s.newRows ? ` (${s.newRows} nuevas)` : ""} · impacto ${fmtInt(s.impact)} ${UNIT_LABEL[s.impactUnit]}`;
  const thresholds = Object.entries(s.thresholds)
    .map(([k, v]) => `${k}=${String(v).replace(".", ",")}`)
    .join(", ");
  const cols = COLUMNS[s.id].filter(([key]) => s.rows.some((r) => r[key] !== undefined));
  const rows = s.rows.slice(0, top).map((r) => [...cols.map(([key, , kind]) => signalCell(r, key, kind, s)), r.isNew ? "sí" : ""]);
  const parts = [head, s.summary, `Umbrales: ${thresholds}`];
  if (s.reason) parts.push(`Nota: ${s.reason}`);
  parts.push(table([...cols.map(([, label]) => label), "nuevo"], rows));
  if (s.groups.length)
    parts.push(`Grupos: ${s.groups.map((g) => `${esc(g.label)}${g.share !== null ? ` (${fmtPct(g.share)})` : ""}`).join(" · ")}`);
  return parts.join("\n");
}

const rating = (r: string | null | undefined) => (r === "good" ? "bien" : r === "ni" ? "reg" : r === "poor" ? "mal" : "—");

function pageRow(p: InsightPageRow): string[] {
  const rate = (v: number | null | undefined) => (p.ga4 ? (v === null || v === undefined ? "sin medición" : fmtPct(v)) : "—");
  const mob = p.vitals?.mobile;
  return [
    fmt(p.path, "path"),
    fmtInt(p.cf?.loads),
    fmtInt(p.ga4?.views),
    fmtPct(p.coverage),
    `${fmtPct(p.ga4?.mobileEngagement)} / ${fmtPct(p.ga4?.desktopEngagement)}`,
    rate(p.ga4?.read50Rate),
    rate(p.ga4?.outboundRate),
    mob ? `${rating(mob.lcp)}/${rating(mob.inp)}/${rating(mob.cls)}` : "—",
    p.index ? (p.index.pending ? "pendiente" : p.index.class) : "—",
    p.signals.join(", ") || "—",
  ];
}

const PAGE_HEADERS = [
  "página",
  "cargas CF",
  "vistas GA4",
  "cobertura (entradas)",
  "interacción cel/escr",
  "llega a 50 %",
  "sale afuera",
  "cel LCP/INP/CLS",
  "índice",
  "señales",
];

function flatTable(rows: any[], top: number): string {
  if (!Array.isArray(rows) || !rows.length) return "_(vacío)_";
  const keys = [
    ...new Set(rows.slice(0, top).flatMap((r) => Object.keys(r || {}).filter((k) => r[k] === null || typeof r[k] !== "object"))),
  ].slice(0, 9);
  return table(
    keys,
    rows.slice(0, top).map((r) =>
      keys.map((k) => {
        const v = r?.[k];
        return typeof v === "number"
          ? Number.isInteger(v)
            ? fmtInt(v)
            : String(Math.round(v * 10000) / 10000).replace(".", ",")
          : fmt(v, "text");
      })
    )
  );
}

function renderSource(b: SourceBlock<any>, top: number): string {
  const lines = [
    `## Fuente ${b.id}`,
    `Estado: ${STATUS_LABEL[b.status] || b.status} · datos del ${b.fetchedAt || "—"} · último ok ${b.lastOkAt || "—"} · intento ${b.attemptedAt}`,
  ];
  if (b.failingSince) lines.push(`Falla desde: ${b.failingSince}`);
  if (b.note) lines.push(`Nota: ${b.note}`);
  if (b.enableHint) lines.push(`Para activarla: ${b.enableHint}`);
  if (b.carried.length) lines.push(`Arrastrado de la corrida anterior: ${b.carried.join(", ")}`);
  if (b.window) lines.push(`Ventana: ${b.window.start} a ${b.window.end} (${b.window.days} días, ${b.window.tz})`);
  if (!b.data) {
    lines.push("Sin datos todavía.");
    return lines.join("\n");
  }
  const walk = (obj: any, prefix: string) => {
    for (const [k, v] of Object.entries(obj || {})) {
      if (Array.isArray(v) && v.length && typeof v[0] === "object") lines.push(`### ${prefix}${k}`, flatTable(v, top));
      else if (v && typeof v === "object" && !Array.isArray(v) && prefix.split(".").length < 3) walk(v, `${prefix}${k}.`);
    }
  };
  walk(b.data, "");
  return lines.join("\n");
}

export function renderDigest(snapshot: UsageInsightSnapshot, opts: DigestOptions = {}): string {
  const top = Math.max(1, opts.top ?? 15);
  const out: string[] = [];
  const asOf = snapshot.asOf ? `${snapshot.asOf.slice(0, 10)} ${snapshot.asOf.slice(11, 16)} UTC` : "—";
  out.push(`# Uso del sitio · corrida ${asOf} · datos hasta ${snapshot.day} (America/Montevideo)`);
  out.push(
    `Fuentes: ${SOURCE_IDS.map((id) => (snapshot.sources?.[id] ? sourceLine(snapshot.sources[id]) : `[sin bloque] ${id}`)).join(" · ")}`
  );
  if (snapshot.run?.trimmed?.length) out.push(`Recortes: ${snapshot.run.trimmed.join(", ")}`);
  const signals = orderSignals(snapshot.signals || []);

  if (opts.signal) {
    const s = signals.find((x) => x.id === opts.signal);
    if (!s) return `${out.join("\n")}\n\nNo hay señal ${opts.signal} en el snapshot.`;
    out.push("", `## ${s.title}`, s.question, `Estado: ${s.status}${s.reason ? ` · ${s.reason}` : ""} · datos del ${s.dataAsOf || "—"}`);
    out.push(renderSignal(s, 1, Math.min(20, opts.top ?? 20)));
    return out.join("\n");
  }

  if (opts.source) {
    const b = snapshot.sources?.[opts.source];
    out.push("", b ? renderSource(b, top) : `No hay bloque ${opts.source}.`);
    return out.join("\n");
  }

  if (opts.page) {
    const path = sitePath(opts.page) || opts.page;
    const row = (snapshot.pages || []).find((p) => p.path === path);
    out.push("", `## Página ${path}`);
    if (!row) out.push("No está en la tabla de páginas (top 150 por cargas o vistas).");
    else {
      out.push(table(PAGE_HEADERS, [pageRow(row)]));
      out.push("```json", JSON.stringify(row, null, 2), "```");
    }
    const ga = snapshot.sources?.ga4Behavior?.data?.pages?.find((p) => p.path === path);
    if (ga) out.push("### GA4", "```json", JSON.stringify(ga, null, 2), "```");
    const vitals = snapshot.sources?.cloudflareRum?.data?.vitals?.filter((v) => v.path === path) || [];
    if (vitals.length)
      out.push(
        "### Cloudflare, vitales",
        flatTable(
          vitals.map((v) => ({ device: v.device, realSamples: v.realSamples, lcp: v.lcp.rating, inp: v.inp.rating, cls: v.cls.rating })),
          top
        )
      );
    const hits = signals.flatMap((s) => s.rows.filter((r) => r.path === path).map((r) => ({ signal: s.id, ...r })));
    out.push("### Señales de esta página", hits.length ? flatTable(hits, 50) : "_(ninguna)_");
    return out.join("\n");
  }

  const withRows = signals.filter((s) => s.status === "ok" && s.rows.length);
  out.push("", `## Señales con páginas (${withRows.length})`);
  withRows.forEach((s, i) => out.push(renderSignal(s, i + 1, top), ""));

  const cc = snapshot.consentCheck;
  if (cc) {
    out.push(
      `## Consentimiento (mismos días: ${cc.cfRange ? `${cc.cfRange.start} a ${cc.cfRange.end}` : "—"}, America/Montevideo)`,
      cc.usable
        ? `Cobertura del sitio: ${fmtPct(cc.siteCoverage)} de las entradas (por cargas: ${fmtPct(cc.siteCoverageLoads)}, contexto). Internas: Cloudflare ${fmtPct(cc.cfInternalShare)} · GA4 ${fmtPct(cc.ga4InternalShare)}.`
        : `Todavía no comparable: ${cc.reason}`,
      ""
    );
  }

  out.push(`## Páginas (top ${top} por cargas reales, Uruguay, 28 días)`);
  out.push(table(PAGE_HEADERS, (snapshot.pages || []).slice(0, top).map(pageRow)));

  const rest = signals.filter((s) => !(s.status === "ok" && s.rows.length));
  if (opts.all) {
    out.push("", "## Sin datos o sin filas");
    for (const s of rest) out.push(`- ${s.id}: ${s.status === "ok" ? "sin filas" : `${s.status} — ${s.reason || "sin motivo"}`}`);
  } else if (rest.some((s) => s.status !== "ok")) {
    out.push("", `(${rest.filter((s) => s.status !== "ok").length} señales sin datos: --all para verlas)`);
  }
  return out.join("\n");
}

/** Lo que imprime `--day=YYYY-MM-DD`: las señales y las fuentes archivadas de ese día. */
export function renderDayDigest(day: UsageInsightDay): string {
  const out = [`# Archivo del ${day.day}`];
  const src = day.sources || {};
  out.push(
    `Fuentes archivadas: ${
      SOURCE_IDS.filter((id) => (src as any)[id])
        .map((id) => `${id} (${String((src as any)[id].fetchedAt || "").slice(0, 16)})`)
        .join(" · ") || "ninguna"
    }`
  );
  const rows = (day.signals || [])
    .slice()
    .sort((a, b) => SIGNAL_IDS.indexOf(a.id) - SIGNAL_IDS.indexOf(b.id))
    .map((s) => [s.id, s.status, SEVERITY_LABEL[s.severity as Signal["severity"]] || s.severity, fmtInt(s.count), fmtInt(s.impact)]);
  out.push(table(["señal", "estado", "severidad", "filas", "impacto"], rows));
  return out.join("\n");
}

/** Las líneas cortas de una corrida real (≤ 15): título, cantidad y resumen de cada señal. */
export function logLines(signals: Signal[]): string[] {
  return orderSignals(signals)
    .filter((s) => s.status !== "unavailable")
    .slice(0, 15)
    .map((s) => `[usage-insights] ${s.title} [${s.id}, ${SEVERITY_LABEL[s.severity]}] ${s.count}: ${s.summary}`.slice(0, 400));
}

// Los mensajes del monitor. Puro. TEXTO PLANO a propósito: los identificadores de casa llevan "_" y
// el Markdown de Telegram falla en silencio con un "_" sin cerrar (pasó con las alertas del sitio).
// El correo lleva el mismo texto y un HTML con cada línea escapada.
import moment from "moment-timezone";
import type { DailyLine, MonitorEvent } from "./events";
import type { Side } from "./types";

export const PANEL_URL = "https://cambio-uruguay.com/cuenta?tab=api";
const CONTACT = "admin@cambio-uruguay.com";
const ZONE = "America/Montevideo";
const SIDE: Record<Side, string> = { buy: "compra", sell: "venta" };

export type NameOf = (origin: string) => string;

export interface Message {
  subject: string;
  text: string;
  html: string;
}

// Entre 2 y 4 decimales: el peso argentino se cotiza a 0,021 y con dos decimales un movimiento de
// 0,021 a 0,024 se leería "0,02 → 0,02". Mismo formato que classes/rate_changes.ts.
const MONEY = new Intl.NumberFormat("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export function money(n: number): string {
  return MONEY.format(n);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const hhmm = (d: Date) => moment(d).tz(ZONE).format("HH:mm");
const ordinal = (n: number) => `${n}.º`;

function toMessage(subject: string, lines: string[]): Message {
  const all = [...lines, "", `Configurar el monitor: ${PANEL_URL}`];
  return {
    subject,
    text: all.join("\n"),
    html: all.map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "")).join(""),
  };
}

function eventLine(e: Exclude<MonitorEvent, { kind: "daily" }>, name: NameOf): string {
  if (e.kind === "move") {
    const parts: string[] = [];
    if (e.fromBuy !== e.toBuy) parts.push(`compra ${money(e.fromBuy)} → ${money(e.toBuy)}`);
    if (e.fromSell !== e.toSell) parts.push(`venta ${money(e.fromSell)} → ${money(e.toSell)}`);
    return `• ${name(e.origin)} movió su pizarra (${hhmm(e.at)}): ${parts.join(" · ")}`;
  }
  if (e.kind === "position") {
    const verb = e.from === null ? "quedó" : e.to < e.from ? "subió" : "bajó";
    const from = e.from === null ? "" : ` del ${ordinal(e.from)}`;
    const ahead = e.better.length
      ? ` Mejores ahora: ${e.better.map((b) => `${name(b.origin)} (${money(b.value)})`).join(", ")}.`
      : "";
    return `• Tu ${SIDE[e.side]} ${verb}${from} al ${ordinal(e.to)} lugar entre ${e.of} casas.${ahead}`;
  }
  const since = e.lastOwnChangeAt ? `desde las ${hhmm(e.lastOwnChangeAt)}` : "en todo el día";
  return `• Tu pizarra no se movió ${since} y en las últimas 3 horas se movieron ${e.movers.length} competidores: ${e.movers
    .map(name)
    .join(", ")}.`;
}

function dailyLines(line: DailyLine, name: NameOf): string[] {
  const out = [`Resumen del día (${line.code})`];
  if (line.own) {
    const place = (p: { position: number; of: number } | null) => (p ? `${ordinal(p.position)} de ${p.of}` : "sin precio");
    out.push(`• Tu compra: ${place(line.own.buy)} · tu venta: ${place(line.own.sell)}`);
  }
  const best = (b: { origin: string; value: number } | null) => (b ? `${name(b.origin)} ${money(b.value)}` : "sin datos");
  out.push(`• Mejor compra: ${best(line.bestBuy)} · mejor venta: ${best(line.bestSell)}`);
  out.push(
    line.moves.length
      ? `• Se movieron hoy: ${line.moves
          .map((m) => `${name(m.origin)} ${m.count} ${m.count === 1 ? "vez" : "veces"}`)
          .join(", ")}`
      : "• Ningún competidor movió su pizarra hoy."
  );
  return out;
}

export function formatEvents(events: readonly MonitorEvent[], name: NameOf, now: Date): Message | null {
  if (!events.length) return null;
  const lines: string[] = [`Monitor de competencia · ${hhmm(now)}`];
  const realtime = events.filter((e): e is Exclude<MonitorEvent, { kind: "daily" }> => e.kind !== "daily");
  const codes = [...new Set(realtime.map((e) => e.code))];
  for (const code of codes) {
    lines.push("", code, ...realtime.filter((e) => e.code === code).map((e) => eventLine(e, name)));
  }
  const daily = events.find((e): e is Extract<MonitorEvent, { kind: "daily" }> => e.kind === "daily");
  if (daily) for (const line of daily.lines) lines.push("", ...dailyLines(line, name));
  const subject =
    daily && !realtime.length
      ? `Monitor de competencia: resumen del ${moment(now).tz(ZONE).format("D/M")}`
      : `Monitor de competencia: ${realtime.length} ${realtime.length === 1 ? "novedad" : "novedades"}`;
  return toMessage(subject, lines);
}

export function formatAccessEnded(): Message {
  return toMessage("Terminó la prueba del monitor de competencia", [
    "Terminó la prueba de 14 días del monitor de competencia de Cambio Uruguay.",
    `Para que siga avisándote, el monitor está incluido en el plan Empresa: escribinos a ${CONTACT}.`,
    "Tu configuración queda guardada.",
  ]);
}

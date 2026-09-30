// Tipos y constantes del monitor de competencia para casas de cambio. Diseño:
// docs/superpowers/specs/2026-09-29-monitor-competencia-design.md.
//
// app/utils/competitorMonitor.ts copia MONITOR_CURRENCIES, MAX_COMPETITORS y TRIAL_DAYS (el app no
// puede importar la raíz); app/tests/unit/competitorMonitorParity.test.ts las ata.

export type MonitorCurrency = "USD" | "EUR" | "BRL" | "ARS";
export const MONITOR_CURRENCIES: readonly MonitorCurrency[] = ["USD", "EUR", "BRL", "ARS"];
export const MAX_COMPETITORS = 12;
export const TRIAL_DAYS = 14;

export type EmailMode = "none" | "daily" | "all";
export type Side = "buy" | "sell";

/** La configuración que guarda el app (`competitormonitors`), ya normalizada. */
export interface MonitorConfig {
  uid: string;
  email: string | null;
  ownOrigin: string | null;
  competitors: string[];
  currencies: MonitorCurrency[];
  alerts: { moves: boolean; position: boolean; quiet: boolean; daily: boolean };
  channels: { telegram: boolean; email: EmailMode };
  active: boolean;
  trialStartedAt: Date;
}

/**
 * Posición vista en la última corrida y la última avisada (1 = mejor; null = sin posición), y
 * `basis`: contra qué se midió (casas con precio de ese lado + grupo configurado). Si el grupo
 * cambia —una edición del cliente, un competidor que falta de la foto— se re-aprende sin avisar:
 * ese cambio de puesto no lo causó ningún precio.
 */
export interface PositionMemo {
  seen: number | null;
  alerted: number | null;
  basis?: string;
}

/** El estado que escribe sólo el job (`competitormonitorstates`). */
export interface MonitorState {
  uid: string;
  cursor: Date | null;
  /** Clave `${moneda}|${lado}`. */
  positions: Record<string, PositionMemo>;
  /** Moneda → día (YYYY-MM-DD, Montevideo) del último aviso de pizarra quieta. */
  quietDay: Record<string, string>;
  dailyDay: string | null;
  /**
   * Último precio CONFIRMADO en la foto por casa y moneda (`${origen}|${moneda}`). Un movimiento se
   * mide contra esto y no contra el "antes" del ledger: el ledger registra cada lectura antes de la
   * guarda de plausibilidad, así que su "antes" puede ser un valor que nunca se publicó.
   */
  lastQuotes: Record<string, { buy: number; sell: number }>;
  accessEndedAt: Date | null;
  /** Con qué acceso se evaluó la última vez: decide si el aviso de fin habla de la prueba o del plan. */
  lastAccess: "trial" | "business" | null;
  /** Última EVALUACIÓN (un monitor vencido no la actualiza). Más vieja que 30 min: se re-aprende. */
  lastRunAt: Date | null;
  lastSentAt: Date | null;
}

export function emptyState(uid: string, now: Date): MonitorState {
  return {
    uid,
    cursor: now,
    lastQuotes: {},
    positions: {},
    quietDay: {},
    dailyDay: null,
    accessEndedAt: null,
    lastAccess: null,
    lastRunAt: null,
    lastSentAt: null,
  };
}

/** Una fila de la foto del día (colección de cotizaciones del backend). */
export interface SnapshotRow {
  origin: string;
  code: string;
  type?: string | null;
  buy: number;
  sell: number;
}

/** Lo que publica una casa hoy para una moneda: una sola fila, la del mostrador. */
export interface Quote {
  origin: string;
  code: string;
  type: string;
  buy: number;
  sell: number;
}

/** Un cambio de pizarra del ledger `cambio_changes`. */
export interface LedgerChange {
  origin: string;
  code: string;
  type: string;
  previousBuy: number;
  previousSell: number;
  buy: number;
  sell: number;
  observedAt: Date;
}

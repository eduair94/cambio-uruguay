import type { EcseSample, EcseZoneType } from "./ecse";

/** UTE refreshes every ten minutes; a longer gap is time nobody observed. */
export const NOMINAL_MINUTES = 10;
export const MAX_INTERVAL_MINUTES = 20;

export interface PowerZoneState {
  customers: number;
  unplanned: number;
  planned: number;
  incidents: number;
}
export interface PowerState {
  observedAt: string;
  zones: Record<string, PowerZoneState>;
}
export interface PowerDayIncrement {
  zone: string;
  day: string;
  name: string;
  type: EcseZoneType;
  customers: number;
  coveredMinutes: number;
  unplannedCustomerMinutes: number;
  plannedCustomerMinutes: number;
  /** Increases of open incidents between samples: a lower bound on new cuts. */
  newIncidents: number;
  samples: number;
}

/** Montevideo calendar day (UTC-3) of an ISO instant. */
export function montevideoDay(iso: string): string {
  return new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * One UTE snapshot folded into the ledger. The interval since the previous snapshot is integrated
 * with the trapezoid rule; a gap longer than MAX_INTERVAL_MINUTES only credits one nominal interval
 * with the values seen now, so a dead poller never manufactures hours without power.
 */
export function foldSample(state: PowerState | null, sample: EcseSample): { state: PowerState; increments: PowerDayIncrement[] } {
  if (state && sample.observedAt <= state.observedAt) return { state, increments: [] };
  const zones: Record<string, PowerZoneState> = {};
  const increments: PowerDayIncrement[] = [];
  const minutes = state ? (Date.parse(sample.observedAt) - Date.parse(state.observedAt)) / 60_000 : 0;
  const gap = minutes > MAX_INTERVAL_MINUTES;
  const day = montevideoDay(sample.observedAt);
  for (const zone of sample.zones) {
    const current = { customers: zone.customers, unplanned: zone.unplanned, planned: zone.planned, incidents: zone.incidents };
    zones[zone.zone] = current;
    const previous = state?.zones[zone.zone];
    if (!previous || minutes <= 0) continue;
    const covered = gap ? NOMINAL_MINUTES : minutes;
    const unplanned = gap ? current.unplanned : (previous.unplanned + current.unplanned) / 2;
    const planned = gap ? current.planned : (previous.planned + current.planned) / 2;
    increments.push({
      zone: zone.zone, day, name: zone.name, type: zone.type, customers: current.customers,
      coveredMinutes: round(covered),
      unplannedCustomerMinutes: round(unplanned * covered),
      plannedCustomerMinutes: round(planned * covered),
      newIncidents: Math.max(0, current.incidents - previous.incidents),
      samples: 1,
    });
  }
  return { state: { observedAt: sample.observedAt, zones }, increments };
}
const round = (value: number) => Math.round(value * 1000) / 1000;

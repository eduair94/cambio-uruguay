// rank_rentals_for_household: the personalised ranking. Wraps POST /api/rentals/fit,
// which scores every current home against a whole household: incomes, remote days,
// each person's daily destinations, budget and hard requirements. Destinations given
// as addresses are geocoded first. Nothing here is cached or logged.

import { compact, fmt, money, pct, siteUrl } from "../format.js";
import { UserInputError, type ToolOutput } from "../output.js";
import type { SiteApi } from "../site.js";
import { compactRental, type CompactRental } from "./compact.js";
import { GEOCODE_ADVICE, geocodeItems } from "./search.js";
import type { RawOffer, RawRental } from "./types.js";

export type TravelMode = "walking" | "bicycling" | "transit" | "driving";

export interface HouseholdDestinationInput {
  label: string;
  kind?: "work" | "study" | "other";
  address?: string;
  lat?: number;
  lng?: number;
  daysPerWeek?: number;
  mode?: TravelMode;
  maxKm?: number;
}

export interface HouseholdPersonInput {
  label: string;
  incomeUyu?: number;
  remoteDays?: number;
  destinations?: HouseholdDestinationInput[];
}

export interface HouseholdInput {
  people: HouseholdPersonInput[];
  housingBudgetUyu: number;
  otherExpensesUyu?: number;
  savingsUyu?: number;
  transportUyu?: number;
  department?: string;
  types?: Array<"apartamento" | "casa">;
  minBedrooms?: number;
  minArea?: number;
  pets?: boolean;
  parking?: boolean;
  furnished?: boolean;
  preferredNeighborhoods?: string[];
  excludedNeighborhoods?: string[];
  onlyPreferred?: boolean;
  includeReported?: boolean;
  includeOverBudget?: boolean;
  priority?: "balanced" | "budget" | "commute";
  limit?: number;
}

/** Straight-line distance a person would accept by default, per travel mode (km). */
export const DEFAULT_TARGET_KM: Record<TravelMode, number> = { walking: 2, bicycling: 6, transit: 8, driving: 15 };

type Point = { lat: number; lng: number };

const zoneRef = (value: string, department: string) => {
  const [neighborhood, dept] = value.split(",").map((s) => s.trim());
  return { department: dept || department, neighborhood: neighborhood || value };
};

/** Tool input (+ resolved destination points) → the exact body /api/rentals/fit validates. */
export function householdBody(input: HouseholdInput, points: Map<string, Point> = new Map()) {
  if (!input.people?.length || input.people.length > 8) throw new UserInputError("El hogar tiene que tener entre 1 y 8 personas.");
  if (!(input.housingBudgetUyu > 0)) throw new UserInputError("Falta el presupuesto para vivienda (housingBudgetUyu, en pesos por mes).");
  const department = input.department ?? "Montevideo";
  const include = (input.preferredNeighborhoods ?? []).map((n) => zoneRef(n, department));
  const exclude = (input.excludedNeighborhoods ?? []).map((n) => zoneRef(n, department));
  return {
    people: input.people.map((person, i) => {
      if ((person.destinations?.length ?? 0) > 4) throw new UserInputError(`${person.label}: máximo 4 destinos por persona.`);
      return {
        id: `p${i + 1}`,
        label: String(person.label || `Persona ${i + 1}`).slice(0, 40),
        incomeUyu: Math.max(0, Math.round(person.incomeUyu ?? 0)),
        remoteDays: Math.min(7, Math.max(0, Math.round(person.remoteDays ?? 0))),
        destinations: (person.destinations ?? []).map((d, j) => {
          const point = points.get(`${i}:${j}`) ?? (typeof d.lat === "number" && typeof d.lng === "number" ? { lat: d.lat, lng: d.lng } : undefined);
          if (!point) throw new UserInputError(`Falta ubicar el destino "${d.label}" de ${person.label}: pasá address o lat/lng.`);
          const mode = d.mode ?? "transit";
          return {
            id: `d${i + 1}-${j + 1}`,
            label: String(d.label || `Destino ${j + 1}`).slice(0, 40),
            kind: d.kind ?? "work",
            lat: point.lat,
            lng: point.lng,
            days: Math.min(7, Math.max(0, d.daysPerWeek ?? 5)),
            mode,
            targetKm: d.maxKm && d.maxKm > 0 ? Math.min(300, d.maxKm) : DEFAULT_TARGET_KM[mode],
          };
        }),
      };
    }),
    housingBudgetUyu: Math.round(input.housingBudgetUyu),
    otherExpensesUyu: Math.max(0, Math.round(input.otherExpensesUyu ?? 0)),
    savingsUyu: Math.max(0, Math.round(input.savingsUyu ?? 0)),
    transportUyu: Math.max(0, Math.round(input.transportUyu ?? 0)),
    department,
    types: input.types?.length ? [...new Set(input.types)].sort() : ["apartamento", "casa"],
    minBedrooms: Math.max(0, Math.round(input.minBedrooms ?? 0)),
    minArea: Math.max(0, Math.round(input.minArea ?? 0)),
    pets: !!input.pets,
    parking: !!input.parking,
    furnished: !!input.furnished,
    hideReported: !input.includeReported,
    includeOverBudget: !!input.includeOverBudget,
    priority: input.priority ?? "balanced",
    ...(include.length || exclude.length ? { zones: { mode: input.onlyPreferred ? "only" : "prefer", include, exclude } } : {}),
  };
}

interface FitResult {
  property: RawRental;
  offer: RawOffer;
  score: number;
  budgetScore?: number;
  commuteScore?: number | null;
  rentUyu: number;
  expensesUyu: number | null;
  monthlyUyu: number | null;
  remainingUyu: number | null;
  incomeShare: number | null;
  overBudget: boolean;
  trips?: Array<{ personId: string; destinationId: string; distanceKm: number | null; withinTarget: boolean | null }>;
  reasons?: string[];
  warnings?: string[];
  zoneMatch?: string;
}

interface FitResponse {
  generatedAt?: string;
  scanned?: number;
  matched?: number;
  complete?: number;
  incomplete?: number;
  results?: FitResult[];
}

export const REASON_LABEL: Record<string, string> = {
  within_budget: "dentro del presupuesto",
  near_destinations: "cerca de los destinos",
  remote_household: "hogar con mucho home office",
  balanced_commutes: "traslados parejos entre las personas",
  preferred_zone: "en un barrio preferido",
};

export const WARNING_LABEL: Record<string, string> = {
  unknown_expenses: "no publica gastos comunes (el total real es mayor)",
  unknown_location: "sin ubicación exacta (distancias no calculables)",
  over_budget: "supera el presupuesto",
  low_remaining: "deja poco margen del ingreso",
  reported: "reportado como no disponible por la comunidad",
  unknown_zone: "barrio sin identificar",
};

/** Geocode every destination that came as an address; the error names the one that failed. */
async function resolveDestinations(site: SiteApi, input: HouseholdInput) {
  const points = new Map<string, Point>();
  const department = input.department ?? "Montevideo";
  for (const [i, person] of input.people.entries()) {
    for (const [j, d] of (person.destinations ?? []).entries()) {
      if (typeof d.lat === "number" && typeof d.lng === "number") continue;
      if (!d.address) continue;
      const [first] = await geocodeItems(site, { address: d.address, department });
      if (!first)
        throw new UserInputError(
          `No se pudo ubicar "${d.address}" (${d.label} de ${person.label}). ${GEOCODE_ADVICE}`
        );
      points.set(`${i}:${j}`, { lat: first.lat, lng: first.lng });
    }
  }
  return points;
}

export async function rankRentalsForHousehold(site: SiteApi, input: HouseholdInput): Promise<ToolOutput> {
  const points = await resolveDestinations(site, input);
  const body = householdBody(input, points);
  const res = await site.post<FitResponse>("/api/rentals/fit", body, { timeoutMs: 90_000, retry: true });
  const limit = Math.max(1, Math.min(24, Math.round(input.limit ?? 10)));
  const names = new Map<string, string>();
  for (const person of body.people) {
    names.set(person.id, person.label);
    for (const d of person.destinations) names.set(d.id, d.label);
  }
  const results = (res.results ?? []).slice(0, limit).map((r) => {
    const home: CompactRental = compactRental({ ...r.property, matchingOffer: r.offer });
    return {
      home,
      score: Math.round(r.score),
      rentUyu: r.rentUyu,
      expensesUyu: r.expensesUyu,
      monthlyUyu: r.monthlyUyu,
      remainingUyu: r.remainingUyu,
      incomeShare: r.incomeShare,
      overBudget: r.overBudget,
      trips: (r.trips ?? []).map((t) =>
        compact({
          person: names.get(t.personId) ?? t.personId,
          destination: names.get(t.destinationId) ?? t.destinationId,
          distanceKm: t.distanceKm === null ? null : Math.round(t.distanceKm * 10) / 10,
          withinTarget: t.withinTarget,
        })
      ),
      reasons: (r.reasons ?? []).map((k) => REASON_LABEL[k] ?? k),
      warnings: (r.warnings ?? []).map((k) => WARNING_LABEL[k] ?? k),
    };
  });

  const lines = [
    `Se evaluaron ${fmt(res.scanned ?? 0)} viviendas vigentes; ${fmt(res.matched ?? 0)} cumplen los requisitos` +
      ` (${fmt(res.complete ?? 0)} con alquiler + gastos comunes publicados).`,
  ];
  results.forEach((r, n) => {
    const h = r.home;
    const place = [h.neighborhood, h.department].filter(Boolean).join(", ");
    const cost =
      r.monthlyUyu !== null
        ? `${money(r.rentUyu)} + GC ${money(r.expensesUyu)} = ${money(r.monthlyUyu)}/mes`
        : `${money(r.rentUyu)}/mes + gastos comunes sin publicar`;
    const budget = [
      r.incomeShare !== null ? `${pct(r.incomeShare)} del ingreso del hogar` : "",
      r.remainingUyu !== null ? `le quedan ${money(r.remainingUyu)} al mes` : "",
    ]
      .filter(Boolean)
      .join(", ");
    const trips = r.trips
      .map((t) => `${t.person} → ${t.destination}: ${t.distanceKm === undefined || t.distanceKm === null ? "s/d" : `${fmt(t.distanceKm as number, 1)} km`}${t.withinTarget === false ? " (lejos)" : ""}`)
      .join("; ");
    lines.push(
      `${n + 1}. [${r.score}/100] ${h.type ?? "vivienda"} ${h.bedrooms ?? "?"} dorm${h.areaM2 ? ` ${fmt(h.areaM2)} m²` : ""} · ${place} — ${cost}` +
        (budget ? ` · ${budget}` : "") +
        (trips ? `\n   Traslados (línea recta): ${trips}` : "") +
        (r.reasons.length ? `\n   A favor: ${r.reasons.join(", ")}` : "") +
        (r.warnings.length ? `\n   Ojo: ${r.warnings.join(", ")}` : "") +
        `\n   ${h.listingUrl ?? ""}\n   ficha: ${h.siteUrl}`
    );
  });
  if (!results.length)
    lines.push("Ninguna vivienda cumple todo: probá subir el presupuesto, bajar dormitorios, aceptar más distancia o includeOverBudget.");
  lines.push(
    "Nota: las distancias son en línea recta (no tiempo de viaje). El puntaje combina presupuesto y traslados según la prioridad elegida; los ingresos no se guardan."
  );
  return {
    text: lines.join("\n"),
    data: {
      scanned: res.scanned ?? 0,
      matched: res.matched ?? 0,
      complete: res.complete ?? 0,
      results,
      asOf: res.generatedAt?.slice(0, 10) ?? null,
      priority: body.priority,
      siteUrl: siteUrl("/alquiler-ideal-uruguay"),
    },
  };
}

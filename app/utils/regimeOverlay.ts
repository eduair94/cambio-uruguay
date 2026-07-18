// Maps the /api/aduana payload onto a RegimeRules overlay for the calculator and the franquicia
// semáforo — the app half of "one source of truth". Starts from DEFAULT_REGIME_RULES and merges the
// live fact values ON TOP, key by key, so a missing or malformed field can NEVER drop a rule (the
// self-healing lesson from costOfLiving). Only the five fact ids the backend actually tracks are
// mapped; everything else in the payload is ignored here. No Gemini, no network — just a pure
// transform of data the app already fetched from its own proxy, so noGeminiInApp stays green.
import { DEFAULT_REGIME_RULES, type RegimeRules } from './importRules'

/** Backend fact id -> RegimeRules key. The date fact is the only string-valued one. */
const FACT_TO_RULE: Record<string, keyof RegimeRules> = {
  'franquicia.tope_anual_usd': 'franchiseAnnualUsd',
  'prestacion_unica.tasa_pct': 'simplifiedRatePct',
  'prestacion_unica.minimo_usd': 'simplifiedMinUsd',
  'tifa.exoneracion_usd': 'usaIvaExemptionUsd',
  'registro_vendedor.exigible_desde': 'sellerRegistryEnforcedFrom',
}

export interface RegimeOverlay {
  rules: RegimeRules
  /** When the served data was last synced, for an "actualizado el X" chip. Null on baseline. */
  asOf: string | null
  /** Fact ids whose value was auto-published by the AI (badge "sin verificación humana"). */
  autoPublished: string[]
}

export function regimeRulesFromPayload(payload: unknown): RegimeOverlay {
  const rules: RegimeRules = { ...DEFAULT_REGIME_RULES } // deep base: a bad field can never drop a key
  const autoPublished: string[] = []

  const p = payload as { facts?: unknown; updatedAt?: unknown } | null | undefined
  const facts = Array.isArray(p?.facts) ? (p!.facts as any[]) : []

  for (const f of facts) {
    const key = FACT_TO_RULE[f?.id as string]
    if (!key) continue
    if (key === 'sellerRegistryEnforcedFrom') {
      if (typeof f.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.value)) {
        rules.sellerRegistryEnforcedFrom = f.value
      } else {
        continue
      }
    } else {
      if (typeof f.value === 'number' && Number.isFinite(f.value)) {
        rules[key] = f.value as never
      } else {
        continue
      }
    }
    if (f.autoPublished) autoPublished.push(f.id)
  }

  return {
    rules,
    asOf: typeof p?.updatedAt === 'string' ? p.updatedAt : null,
    autoPublished,
  }
}

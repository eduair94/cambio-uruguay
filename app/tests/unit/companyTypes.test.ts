import { readFileSync } from 'node:fs'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  FIGURES,
  FIGURES as F,
  IRAE_FICTO,
  IRPF_CAT2,
  MARKET_ESTIMATES,
  REGIMES,
  applyGates,
  estimateCost,
  iraeFictoRentaNetaAnual,
  irpfCat2Monthly,
  type Figure,
  type RegimeId,
  type WizardInput,
} from '../../utils/companyTypes'

const isFigure = (v: unknown): v is Figure =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Figure).value === 'number' &&
  typeof (v as Figure).label === 'string' &&
  typeof (v as Figure).source === 'string' &&
  typeof (v as Figure).verifiedAt === 'string'

const ALL_REGIMES: readonly RegimeId[] = [
  'monotributo-social',
  'monotributo',
  'unipersonal-literal-e',
  'irpf-servicios',
  'unipersonal-irae',
  'sociedad-hecho',
  'srl',
  'sas',
  'sa',
]

/** UYU value of `n` UI at the UI we publish. Mirrors the module's own conversion. */
const ui = (n: number) => n * F.uiHoy.value

describe('FIGURES', () => {
  it('exposes every numeric constant as a sourced Figure', () => {
    const entries = Object.entries(FIGURES)
    // 67 verified figures as of the 2026-07-13 audit (the BPS año-1/año-2 family columns
    // and the sociedad-de-hecho socio columns were added then). This must be a floor, not
    // just "some" — a regression that silently drops figures should fail loudly.
    expect(entries.length).toBeGreaterThanOrEqual(67)
    for (const [key, value] of entries) {
      expect(isFigure(value), `FIGURES.${key} is not a Figure`).toBe(true)
    }
  })

  // IMPORTANT 7 — `gradualidadAnio2Umbral` / `gradualidadAnio3Umbral` were TIER ORDINALS
  // ("año 2", "año 3"), not quantities. Each was given one arbitrary source and then used
  // across four different legal regimes: the "año 3" boundary was sourced to Ley 18.874
  // (monotributo SOCIAL) while deciding the Ley 19.889 unipersonal boundary. The citation
  // attached to the number did not support its use — source-laundering that both the guard
  // and the primary-domain test happily waved through. The ramps are arrays now, and their
  // boundaries are array indices.
  it('has no tier-ordinal "figures": a ramp boundary is an index, not a sourced quantity', () => {
    for (const key of Object.keys(FIGURES)) {
      expect(key, `${key} looks like a tier ordinal masquerading as a sourced figure`).not.toMatch(
        /gradualidadAnio\d+Umbral/
      )
    }
  })

  it('sources every figure to a primary domain with an ISO verification date', () => {
    const PRIMARY = [
      'bps.gub.uy',
      'dgi.gub.uy',
      'gub.uy',
      'impo.com.uy',
      'ine.gub.uy',
      'bcu.gub.uy',
    ]
    for (const [key, f] of Object.entries(FIGURES)) {
      expect(f.source, `FIGURES.${key} has no URL`).toMatch(/^https:\/\//)
      expect(
        PRIMARY.some(d => f.source.includes(d)),
        `FIGURES.${key} is not sourced to a primary domain: ${f.source}`
      ).toBe(true)
      expect(f.verifiedAt, `FIGURES.${key} has a bad date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('does not recompute the peso ceilings from the live UI value', () => {
    // The ceilings are annual constants published by BPS/DGI, fixed with the UI at
    // the close of the PREVIOUS ejercicio. Recomputing them with today's UI is wrong.
    expect(FIGURES.topeMonotributoUnipersonalUyu.value).toBe(1_175_537)
    expect(FIGURES.topeLiteralEUyu.value).toBe(1_959_229)
    const wrong = FIGURES.topeMonotributoUnipersonalUi.value * FIGURES.uiHoy.value
    expect(FIGURES.topeMonotributoUnipersonalUyu.value).not.toBe(Math.round(wrong))
  })
})

describe('IRPF_CAT2', () => {
  it('carries its own provenance', () => {
    expect(IRPF_CAT2.source).toMatch(/^https:\/\//)
    expect(IRPF_CAT2.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('has strictly ascending upTo and non-decreasing rate, with the top bracket open-ended', () => {
    const { brackets } = IRPF_CAT2
    expect(brackets.length).toBeGreaterThan(1)
    for (let i = 1; i < brackets.length; i++) {
      const prev = brackets[i - 1]!
      const curr = brackets[i]!
      // Every bracket but the last must have a numeric ceiling, strictly greater
      // than the previous one — otherwise a slice of income falls through the scale.
      expect(prev.upTo, `bracket ${i - 1} is not the last but has upTo: null`).not.toBeNull()
      if (prev.upTo !== null) {
        const currCeiling = curr.upTo ?? Infinity
        expect(
          currCeiling,
          `bracket ${i} upTo (${String(curr.upTo)}) is not strictly greater than bracket ${i - 1} upTo (${prev.upTo})`
        ).toBeGreaterThan(prev.upTo)
      }
      expect(
        curr.rate,
        `bracket ${i} rate (${curr.rate}) is lower than bracket ${i - 1} rate (${prev.rate})`
      ).toBeGreaterThanOrEqual(prev.rate)
    }
    expect(brackets[brackets.length - 1]!.upTo).toBeNull()
  })
})

// IMPORTANT 6 — the accountant fee used to be a bare `4000` allowlisted in the AST guard.
// The guard matches on `node.text`, so that approved `4000` ANYWHERE in the file: the
// exception was pointed backwards. It is a MARKET estimate, so it cannot go in FIGURES
// (no repartición publishes an arancel de contadores, and the primary-domain test would
// rightly reject it) — but it can still carry provenance-of-a-different-kind, in the
// module, parallel to `fig()`. `est()` says out loud what it is: unsourced, with a
// rationale the page can render from data instead of hardcoding a disclaimer string.
describe('MARKET_ESTIMATES', () => {
  it('marks every market estimate as unsourced, with a rationale — and is NOT in FIGURES', () => {
    const entries = Object.entries(MARKET_ESTIMATES)
    expect(entries.length).toBeGreaterThan(0)
    for (const [key, e] of entries) {
      expect(typeof e.value, `MARKET_ESTIMATES.${key}.value`).toBe('number')
      expect(e.label.length, `MARKET_ESTIMATES.${key}.label`).toBeGreaterThan(0)
      expect(e.unsourced, `MARKET_ESTIMATES.${key} must be flagged unsourced`).toBe(true)
      expect(e.rationale.length, `MARKET_ESTIMATES.${key}.rationale`).toBeGreaterThan(0)
      // The whole point: it must NOT pretend to be a Figure.
      expect(isFigure(e), `MARKET_ESTIMATES.${key} must not masquerade as a sourced Figure`).toBe(
        false
      )
      expect(key in FIGURES, `MARKET_ESTIMATES.${key} must not also be a FIGURES entry`).toBe(false)
    }
  })

  it('is the source of estimateCost’s default accountant fee', () => {
    const withDefault = estimateCost('srl', { ...base, people: 'socios', sociosCount: 2 })
    expect(withDefault.accountantMonthly).toBe(MARKET_ESTIMATES.contadorMensual.value)
  })
})

// CRITICAL 2 — the IRAE ficto was applied as a FLAT 12% at every revenue level. Dto.
// 150/007 art. 64 is a 4-tramo scale, and above UI 1.000.000 (≈ $6.615.000/año at today's
// UI) the flat 12% understates the tax — by roughly 5x in the upper tramos, on exactly the
// regimes people adopt BECAUSE they outgrew Literal E.
describe('IRAE_FICTO (Decreto 150/007 art. 64)', () => {
  it('carries its own provenance, like IRPF_CAT2', () => {
    expect(IRAE_FICTO.source).toMatch(/^https:\/\//)
    expect(IRAE_FICTO.source).toContain('150-2007/64')
    expect(IRAE_FICTO.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('is the 4-tramo scale the decreto actually publishes, in UI', () => {
    expect(IRAE_FICTO.brackets.map(b => [b.upToUi, b.rate])).toEqual([
      [1_000_000, 0.12],
      [2_000_000, 0.14],
      [3_000_000, 0.48],
      [null, 0.6],
    ])
  })

  // Art. 64, inciso 3º, VERBATIM: "a las ventas, servicios y demás rentas brutas del
  // ejercicio COMPRENDIDAS EN CADA TRAMO, se aplicará el porcentaje correspondiente A
  // DICHO TRAMO". That is a marginal scale, not a single-rate lookup on total income —
  // the article settles it in its own words. (The superseded inciso 2º WAS a lookup:
  // "multiplicar las ventas ... por el porcentaje que corresponda según la siguiente
  // escala". The 2023 redacción deliberately replaced that wording.)
  it('applies the tramos MARGINALLY, not as a single-rate lookup on the whole revenue', () => {
    // Exactly at the top of tramo 1: the whole revenue is inside it → a flat 12%.
    expect(iraeFictoRentaNetaAnual(ui(1_000_000))).toBeCloseTo(ui(1_000_000) * 0.12, 2)

    // Just inside tramo 2, the ficto must be 12% of the first million UI plus 14% of the
    // excedente — NOT 14% of everything (which is what a lookup reading would give).
    const rev = ui(1_500_000)
    const marginal = ui(1_000_000) * 0.12 + ui(500_000) * 0.14
    const lookup = rev * 0.14
    expect(iraeFictoRentaNetaAnual(rev)).toBeCloseTo(marginal, 2)
    expect(iraeFictoRentaNetaAnual(rev)).not.toBeCloseTo(lookup, 2)
  })

  it('reaches the 48% and 60% tramos', () => {
    const rev = ui(3_500_000)
    const expected =
      ui(1_000_000) * 0.12 + ui(1_000_000) * 0.14 + ui(1_000_000) * 0.48 + ui(500_000) * 0.6
    expect(iraeFictoRentaNetaAnual(rev)).toBeCloseTo(expected, 2)
  })

  it('is monotonically non-decreasing and never negative', () => {
    let prev = -1
    for (let r = 0; r <= ui(4_000_000); r += 250_000) {
      const n = iraeFictoRentaNetaAnual(r)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeGreaterThanOrEqual(prev)
      prev = n
    }
  })
})

describe('REGIMES', () => {
  it('has a unique id, a name and at least one source per regime', () => {
    const ids = REGIMES.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of REGIMES) {
      expect(r.name.length).toBeGreaterThan(0)
      expect(r.sources.length).toBeGreaterThan(0)
      expect(['ilimitada', 'limitada']).toContain(r.liability)
    }
  })

  it('marks every simplified regime that has an exit lockout', () => {
    // All three simplified regimes (monotributo social, monotributo, Literal E) carry a
    // 3-year re-entry lockout if you're forced out. Check all three, not just two of them.
    const lockoutIds = ['monotributo-social', 'monotributo', 'unipersonal-literal-e'] as const
    for (const id of lockoutIds) {
      const regime = REGIMES.find(r => r.id === id)!
      expect(regime.lockout?.years, `${id} should have a 3-year lockout`).toBe(3)
      expect(regime.lockout?.url, `${id} lockout should cite a norm URL`).toContain('impo.com.uy')
      expect(regime.lockout?.norm.length ?? 0, `${id} lockout should cite a norm`).toBeGreaterThan(
        0
      )
    }
  })
})

describe('no-unsourced-number guard', () => {
  // This is the enforcement mechanism for the file's own header comment: "EVERY numeric
  // constant is a `Figure` ... Nothing numeric may live outside this object." Iterating
  // `Object.entries(FIGURES)` only proves FIGURES itself is well-formed — it says nothing
  // about numbers that live OUTSIDE FIGURES (a stray `export const TOPE = 9_999_999`, a
  // magic number buried in a helper function, etc.). This test reads the module's own
  // source text and walks its AST looking for exactly that.
  const sourcePath = new URL('../../utils/companyTypes.ts', import.meta.url)
  const source = readFileSync(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(
    'companyTypes.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )

  /** Is `node` (anywhere in its ancestor chain) an argument of a call to `callee(...)`? */
  const isInsideCallTo = (node: ts.Node, callee: string): boolean => {
    for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
      if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === callee) {
        return true
      }
    }
    return false
  }

  /** Is `node` an argument of `fig(...)` — i.e. a value that carries a primary source? */
  const isInsideFigCall = (node: ts.Node): boolean => isInsideCallTo(node, 'fig')

  /**
   * Is `node` an argument of `est(...)`? `est()` is the market-estimate constructor: it
   * carries a label and a rationale and flags itself `unsourced: true`. It is exactly as
   * structured as `fig()`, it just makes the OPPOSITE claim — "no primary source exists
   * for this, and here is why". That is a claim the guard can verify (the value is inside
   * an `est()` call), which a bare `4000` in an allowlist was not: the allowlist matches on
   * `node.text`, so it approved the digits `4000` ANYWHERE in the file, for any purpose.
   */
  const isInsideEstCall = (node: ts.Node): boolean => isInsideCallTo(node, 'est')

  /** Is `node` used as an array index, e.g. the `0` in `arr[0]`? */
  const isArrayIndex = (node: ts.Node): boolean => {
    const p = node.parent
    return !!p && ts.isElementAccessExpression(p) && p.argumentExpression === node
  }

  /**
   * Is `node` inside the `brackets` property value of the `declName` declaration
   * specifically — NOT anywhere under the declaration. Walking up looking only for the
   * `VariableDeclaration` (the previous version of this check) exempted the ENTIRE object
   * literal, so a sibling of `source`/`verifiedAt`/`brackets` (e.g. a smuggled
   * `sneakyUnsourcedFicto: 0.42`) rode along for free. Requiring the node to also be
   * nested inside a `PropertyAssignment` named `brackets` closes that: only literals
   * inside the array assigned to `brackets:` are exempt.
   *
   * A bracket TABLE cannot be built with `fig()` (it is a table, not a single value), so
   * it carries its own `source` + `verifiedAt` instead — the same provenance contract, at
   * the table level. Only tables that do so may be named here. This is deliberately
   * per-declaration and per-property: it is NOT a licence for any object called `brackets`.
   */
  const isInsideBracketsTableOf = (node: ts.Node, declName: string): boolean => {
    let insideBracketsProp = false
    for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
      if (
        !insideBracketsProp &&
        ts.isPropertyAssignment(p) &&
        ts.isIdentifier(p.name) &&
        p.name.text === 'brackets'
      ) {
        insideBracketsProp = true
      }
      if (
        insideBracketsProp &&
        ts.isVariableDeclaration(p) &&
        ts.isIdentifier(p.name) &&
        p.name.text === declName
      ) {
        return true
      }
    }
    return false
  }

  /** The sourced bracket tables. Each MUST carry `source` + `verifiedAt` (asserted above). */
  const SOURCED_BRACKET_TABLES = ['IRPF_CAT2', 'IRAE_FICTO']

  const isInsideSourcedBracketTable = (node: ts.Node): boolean =>
    SOURCED_BRACKET_TABLES.some(name => isInsideBracketsTableOf(node, name))

  /**
   * Is `node` the `years` value of a `Lockout` object literal that is itself bound to a
   * `lockout:` property (as every `Regime.lockout` is)? Matching on sibling `norm`/`url`
   * property *names* alone (the previous version of this check) let a decoy object
   * anywhere in the file — e.g. `{ years: 8675309, norm: '...', url: '...' }`, never
   * assigned to `lockout:` — through on shape alone. Requiring the object literal's own
   * parent to be a `PropertyAssignment` named `lockout` binds the exemption to the real
   * `Regime.lockout` structure, not merely a similarly-shaped object. The norm/url pair
   * right next to `years` IS its source — the same role `Figure.source` plays for FIGURES
   * — so it doesn't need to move into FIGURES.
   */
  const isLockoutYears = (node: ts.Node): boolean => {
    const propAssign = node.parent
    if (!propAssign || !ts.isPropertyAssignment(propAssign)) return false
    if (!ts.isIdentifier(propAssign.name) || propAssign.name.text !== 'years') return false
    const obj = propAssign.parent
    if (!obj || !ts.isObjectLiteralExpression(obj)) return false
    const lockoutPropAssign = obj.parent
    if (!lockoutPropAssign || !ts.isPropertyAssignment(lockoutPropAssign)) return false
    if (!ts.isIdentifier(lockoutPropAssign.name) || lockoutPropAssign.name.text !== 'lockout') {
      return false
    }
    const siblingNames = obj.properties
      .filter(ts.isPropertyAssignment)
      .map(p => (ts.isIdentifier(p.name) ? p.name.text : ''))
    return siblingNames.includes('norm') && siblingNames.includes('url')
  }

  // Small, individually-justified allowlist of bare structural numbers that are facts of
  // arithmetic/the calendar, not verified legal/financial figures. KEEP THIS SHORT: every
  // entry re-opens the hole this test exists to close. A bare rate or ceiling (e.g. 0.12,
  // 4321) must NOT be added here — it belongs in FIGURES with a primary source.
  //
  // '100' (percentage-to-fraction conversion divisor) was deliberately REMOVED: paired
  // with the allowlisted '12', it let an unsourced rate through disguised as arithmetic —
  // `x * (12 / 100)` is `x * 0.12`, the exact bare rate this guard exists to reject, and it
  // produced zero guard failures. Nothing in the current file needs a bare 100, and with it
  // gone there is no way to compose a disguised percentage from what remains ({0, 1, 12}):
  // every combination of those three is either trivial (0, 1, 12, 12±0, 12±1, 12*0, 12*1)
  // or the reciprocal of the legitimate monthly-conversion itself (1/12). Do not re-add
  // '100' (or any other divisor) without re-solving this problem, not just re-hiding it.
  //
  // '4000' was likewise REMOVED (IMPORTANT 6). It was the default accountant fee — a market
  // estimate — but allowlisting it here approved the DIGITS `4000` anywhere in the file for
  // any purpose, which is the exception pointed backwards: the guard's own proof above (that
  // {0, 1, 12} cannot compose a disguised percentage) was never redone with 4000 in the set.
  // The fee now lives in `MARKET_ESTIMATES`, built by `est()`, and is approved by
  // `isInsideEstCall` — a structural claim about WHERE the number is, not about what digits
  // it happens to have. Do not re-add a domain number here.
  const STRUCTURAL_ALLOWLIST: Record<string, string> = {
    '0': 'neutral/identity value (baseline, "no lockout", loop start, Math.max floor)',
    '1': 'neutral/identity value (single unit, multiplier of one, one decimal place)',
    '12': 'months per year — a calendar fact, not a verified figure',
  }

  const isApproved = (node: ts.NumericLiteral): boolean =>
    isInsideFigCall(node) ||
    isInsideEstCall(node) ||
    isArrayIndex(node) ||
    isInsideSourcedBracketTable(node) ||
    isLockoutYears(node) ||
    node.text in STRUCTURAL_ALLOWLIST

  it('has no numeric literal outside FIGURES, the sourced bracket tables, MARKET_ESTIMATES, or the structural allowlist', () => {
    const offenders: string[] = []
    const visit = (node: ts.Node) => {
      if (ts.isNumericLiteral(node) && !isApproved(node)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        offenders.push(`  line ${line + 1}: ${node.getText(sourceFile)}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)

    expect(
      offenders,
      `Found ${offenders.length} unsourced numeric literal(s) in companyTypes.ts:\n${offenders.join('\n')}\n` +
        `Move each one into FIGURES with a primary source (fig(value, label, source)), or — if it ` +
        `is genuinely structural (like the calendar/percentage constants already allowlisted above) ` +
        `— add it to STRUCTURAL_ALLOWLIST in this test with a one-line justification.`
    ).toEqual([])
  })
})

const base: WizardInput = {
  annualRevenueUyu: 600_000,
  sells: 'bienes',
  clients: 'consumidor-final',
  people: 'solo',
  employees: 0,
  needsLimitedLiability: false,
  otherCompanyRole: false,
}

const statusOf = (input: WizardInput, id: string) =>
  applyGates(input).find(g => g.regime === id)!.status

describe('applyGates', () => {
  it('lets a small shop selling to consumers keep monotributo', () => {
    expect(statusOf(base, 'monotributo')).toBe('elegible')
  })

  // `reasons` is an array whose ORDER is an implementation detail: adding a gate (e.g. the
  // needsLimitedLiability one, which is pushed before the per-regime switch) reshuffles it.
  // Asserting on `reasons[0]` couples these tests to that order, so they assert on
  // `reasons.some(...)` — the claim is "this reason is present", never "it is first".
  it('bars servicios personales from monotributo (Ley 18.083 art. 72 lit. C)', () => {
    const g = applyGates({ ...base, sells: 'servicios' }).find(x => x.regime === 'monotributo')!
    expect(g.status).toBe('excluido')
    expect(g.reasons.some(r => r.norm.includes('72') && /^https:\/\//.test(r.url))).toBe(true)
  })

  it('flags Literal E as DUDOSO — not excluded — for pure servicios personales', () => {
    const g = applyGates({ ...base, sells: 'servicios' }).find(
      x => x.regime === 'unipersonal-literal-e'
    )!
    expect(g.status).toBe('dudoso')
    expect(g.reasons.some(r => r.url.includes('4761'))).toBe(true)
  })

  it('bars monotributo when the client is a company (art. 71 lit. D)', () => {
    expect(statusOf({ ...base, clients: 'empresas' }, 'monotributo')).toBe('excluido')
  })

  it('bars monotributo with more than one employee', () => {
    expect(statusOf({ ...base, employees: 2 }, 'monotributo')).toBe('excluido')
  })

  it('bars monotributo for a director of another company, even a dormant one', () => {
    expect(statusOf({ ...base, otherCompanyRole: true }, 'monotributo')).toBe('excluido')
  })

  it('bars monotributo above the unipersonal ceiling', () => {
    expect(statusOf({ ...base, annualRevenueUyu: 1_200_000 }, 'monotributo')).toBe('excluido')
  })

  it('bars Literal E above its ceiling but leaves IRAE open', () => {
    const input = { ...base, annualRevenueUyu: 2_500_000 }
    expect(statusOf(input, 'unipersonal-literal-e')).toBe('excluido')
    expect(statusOf(input, 'unipersonal-irae')).toBe('elegible')
  })

  it('bars SRL for a single founder (Ley 16.060 needs 2 socios) but allows SAS', () => {
    expect(statusOf(base, 'srl')).toBe('excluido')
    expect(statusOf(base, 'sas')).toBe('elegible')
  })

  it('bars every unlimited-liability regime when limited liability is required', () => {
    const out = applyGates({ ...base, needsLimitedLiability: true })
    for (const id of ['monotributo', 'unipersonal-literal-e', 'sociedad-hecho'] as const) {
      expect(out.find(g => g.regime === id)!.status).toBe('excluido')
    }
    expect(out.find(g => g.regime === 'sas')!.status).toBe('elegible')
  })

  it('bars single-holder regimes when there are 2+ socios, but allows SRL', () => {
    expect(statusOf({ ...base, people: 'socios', sociosCount: 2 }, 'unipersonal-literal-e')).toBe(
      'excluido'
    )
    expect(statusOf({ ...base, people: 'socios', sociosCount: 2 }, 'unipersonal-irae')).toBe(
      'excluido'
    )
    expect(statusOf({ ...base, people: 'socios', sociosCount: 2 }, 'irpf-servicios')).toBe(
      'excluido'
    )
    expect(statusOf({ ...base, people: 'socios', sociosCount: 2 }, 'srl')).toBe('elegible')
  })

  // Ley 18.083 art. 70 is taxative: a sociedad de hecho of up to 2 socios (or up to 3 if
  // all are familiares) genuinely CAN be a monotributista. It is NOT excluded outright —
  // the earlier version of this test wrongly asserted that, and the gate it drove told a
  // legitimate 2-socio sociedad de hecho that monotributo was illegal for them.
  describe('monotributo socios gate (Ley 18.083 art. 70)', () => {
    it('allows a 2-socio sociedad de hecho, no family, no dependientes', () => {
      const input = { ...base, people: 'socios', sociosCount: 2, sociosFamiliares: false } as const
      expect(statusOf(input, 'monotributo')).toBe('elegible')
    })

    it('allows a 3-socio sociedad de hecho when all socios are familiares', () => {
      const input = { ...base, people: 'socios', sociosCount: 3, sociosFamiliares: true } as const
      expect(statusOf(input, 'monotributo')).toBe('elegible')
    })

    it('excludes a 3-socio sociedad de hecho that is NOT exclusively familiares, citing art. 70', () => {
      const input = { ...base, people: 'socios', sociosCount: 3, sociosFamiliares: false } as const
      const g = applyGates(input).find(x => x.regime === 'monotributo')!
      expect(g.status).toBe('excluido')
      expect(g.reasons.some(r => r.norm.includes('70'))).toBe(true)
    })

    it('excludes a 4-socio sociedad de hecho even when all socios are familiares', () => {
      const input = { ...base, people: 'socios', sociosCount: 4, sociosFamiliares: true } as const
      expect(statusOf(input, 'monotributo')).toBe('excluido')
    })

    it('excludes a 2-socio sociedad de hecho with 1 dependiente (lits. B/C admit none)', () => {
      const input = {
        ...base,
        people: 'socios',
        sociosCount: 2,
        sociosFamiliares: false,
        employees: 1,
      } as const
      expect(statusOf(input, 'monotributo')).toBe('excluido')
    })

    it('allows a solo unipersonal with 1 dependiente (lit. A admits one)', () => {
      const input = { ...base, people: 'solo', employees: 1 } as const
      expect(statusOf(input, 'monotributo')).toBe('elegible')
    })

    it('is dudoso, not excluido or elegible, when sociosCount is not supplied', () => {
      const input = { ...base, people: 'socios' } as const
      const g = applyGates(input).find(x => x.regime === 'monotributo')!
      expect(g.status).toBe('dudoso')
      expect(g.reasons.some(r => r.status === 'dudoso' && r.norm.includes('70'))).toBe(true)
    })
  })

  // Ley 18.083 art. 71 lit. D: "Enajenen bienes y presten servicios EXCLUSIVAMENTE a
  // consumidores finales." A mixed clientele is, by the plain text, not exclusive.
  describe('monotributo clientele gate (Ley 18.083 art. 71 lit. D)', () => {
    it('excludes a MIXED clientele — the norm demands selling exclusively to consumidores finales', () => {
      const g = applyGates({ ...base, clients: 'mixto' }).find(x => x.regime === 'monotributo')!
      expect(g.status).toBe('excluido')
      expect(g.reasons.some(r => r.norm.includes('71'))).toBe(true)
    })

    it('excludes selling to empresas, citing art. 71', () => {
      const g = applyGates({ ...base, clients: 'empresas' }).find(x => x.regime === 'monotributo')!
      expect(g.status).toBe('excluido')
      expect(g.reasons.some(r => r.norm.includes('71'))).toBe(true)
    })

    // A foreign end consumer IS a consumidor final. Art. 71 lit. D says nothing about the
    // buyer being domestic, so "exterior" is an unsettled question, not an exclusion.
    it('is DUDOSO — not excluido — for exports, since a foreign buyer can still be a consumidor final', () => {
      const g = applyGates({ ...base, clients: 'exterior' }).find(x => x.regime === 'monotributo')!
      expect(g.status).toBe('dudoso')
      expect(g.reasons.some(r => r.status === 'dudoso' && r.norm.includes('71'))).toBe(true)
      expect(g.reasons.some(r => r.status === 'excluido')).toBe(false)
    })
  })

  // MINOR 6 — a one-socio sociedad de hecho is an impossibility (Ley 16.060 art. 1 requires
  // "dos o más personas"). It is inconsistent input, not a legal outcome: never `elegible`.
  describe('sociosCount validation', () => {
    it('is dudoso, not elegible, when people=socios but sociosCount is 1', () => {
      const input = { ...base, people: 'socios', sociosCount: 1 } as const
      for (const id of ['monotributo', 'sociedad-hecho', 'srl'] as const) {
        const g = applyGates(input).find(x => x.regime === id)!
        expect(g.status, `${id} should be dudoso for a 1-socio sociedad`).toBe('dudoso')
      }
    })
  })

  // CRITICAL 2 — Monotributo Social is governed by Ley 18.874 (and Decreto 220/012), NOT by
  // Ley 18.083 arts. 71-72. Ley 18.874 art. 1, verbatim: "Quienes producen y comercializan
  // bienes Y PRESTAN SERVICIOS, no tengan personal dependiente y cumplan con las condiciones
  // establecidas en los artículos siguientes" — i.e. 18.874's own arts. 2-4. Gating this
  // regime on art. 71/72 denied it to exactly the below-poverty-line households it was
  // written for.
  describe('monotributo social (Ley 18.874 — NOT Ley 18.083)', () => {
    const mides: WizardInput = { ...base, midesEligible: true }
    const social = (input: WizardInput) =>
      applyGates(input).find(x => x.regime === 'monotributo-social')!

    it('never cites Ley 18.083: those articles do not govern this regime', () => {
      const inputs: WizardInput[] = [
        mides,
        { ...mides, sells: 'servicios' },
        { ...mides, sells: 'ambos' },
        { ...mides, clients: 'empresas' },
        { ...mides, clients: 'mixto' },
        { ...mides, clients: 'exterior' },
        { ...mides, localTooBig: true },
        { ...mides, employees: 2 },
        { ...mides, people: 'socios', sociosCount: 6 },
        { ...mides, annualRevenueUyu: 9_000_000 },
        { ...mides, otherCompanyRole: true },
      ]
      for (const input of inputs) {
        for (const r of social(input).reasons) {
          expect(r.norm, `monotributo-social must not be gated on ${r.norm}`).not.toContain(
            '18.083'
          )
          expect(r.url, `monotributo-social must not cite ${r.url}`).not.toContain('18083')
        }
      }
    })

    it('ALLOWS servicios personales — art. 1 expressly covers "prestan servicios"', () => {
      expect(social({ ...mides, sells: 'servicios' }).status).toBe('elegible')
      expect(social({ ...mides, sells: 'ambos' }).status).toBe('elegible')
    })

    it('has no consumidor-final rule: selling to empresas, mixto or exterior is fine', () => {
      for (const clients of ['empresas', 'mixto', 'exterior'] as const) {
        expect(social({ ...mides, clients }).status, `clients=${clients}`).toBe('elegible')
      }
    })

    it('has no 15 m² local rule and no activos ceiling', () => {
      expect(social({ ...mides, localTooBig: true }).status).toBe('elegible')
      expect(
        social({ ...mides, assetsUyu: FIGURES.topeMonotributoActivosUyu.value * 10 }).status
      ).toBe('elegible')
    })

    it('requires MIDES qualification (art. 2)', () => {
      const g = social(base)
      expect(g.status).toBe('excluido')
      expect(g.reasons.some(r => r.norm.includes('18.874') && r.norm.includes('2'))).toBe(true)
    })

    it('admits ZERO dependientes (art. 1: "no tengan personal dependiente")', () => {
      expect(social(mides).status).toBe('elegible')
      const g = social({ ...mides, employees: 1 })
      expect(g.status).toBe('excluido')
      expect(g.reasons.some(r => r.norm.includes('18.874'))).toBe(true)
    })

    it('admits an asociativo of up to 5 socios (art. 1 lit. B), and no more', () => {
      const socios = (n: number) => ({ ...mides, people: 'socios', sociosCount: n }) as WizardInput
      expect(social(socios(FIGURES.monotributoSocialSociosMax.value)).status).toBe('elegible')
      const g = social(socios(FIGURES.monotributoSocialSociosMax.value + 1))
      expect(g.status).toBe('excluido')
      expect(g.reasons.some(r => r.norm.includes('18.874'))).toBe(true)
    })

    it('applies its own income ceiling (art. 4)', () => {
      const g = social({ ...mides, annualRevenueUyu: 9_000_000 })
      expect(g.status).toBe('excluido')
      expect(g.reasons.some(r => r.norm.includes('18.874'))).toBe(true)
    })
  })

  // IMPORTANT 3 / 4 — on a page whose authority rests entirely on its citations, a wrong
  // cite IS the defect. Ley 16.060 art. 223 is about SRL capital in cuotas and the 50-socio
  // MAXIMUM; it sets no minimum, and it has nothing to say about unipersonales.
  describe('citations', () => {
    const allReasons = (input: WizardInput) => applyGates(input).flatMap(g => g.reasons)

    it('never cites Ley 16.060 art. 223 (it sets no minimum of socios)', () => {
      const inputs: WizardInput[] = [
        base,
        { ...base, people: 'socios', sociosCount: 2 },
        { ...base, needsLimitedLiability: true },
        { ...base, sells: 'servicios' },
      ]
      for (const input of inputs) {
        for (const r of allReasons(input)) {
          expect(r.norm).not.toContain('223')
        }
      }
    })

    it('grounds the 2-socio minimum of SRL and SA in Ley 16.060 art. 1', () => {
      for (const id of ['srl', 'sa'] as const) {
        const g = applyGates(base).find(x => x.regime === id)!
        expect(g.status, `${id} should exclude a solo founder`).toBe('excluido')
        expect(
          g.reasons.some(r => r.norm.includes('16.060') && r.norm.includes('1')),
          `${id} should cite Ley 16.060 art. 1`
        ).toBe(true)
        expect(g.reasons.some(r => r.url.includes('/16060-1989/1'))).toBe(true)
      }
      // The SAS is genuinely unipersonal (Ley 19.820 art. 11) — it stays open.
      expect(statusOf(base, 'sas')).toBe('elegible')
    })

    it('grounds the sociedad de hecho pluralidad in Ley 16.060 art. 1', () => {
      const g = applyGates(base).find(x => x.regime === 'sociedad-hecho')!
      expect(g.status).toBe('excluido')
      expect(g.reasons.some(r => r.url.includes('/16060-1989/1'))).toBe(true)
    })

    it('does not cite Ley 16.060 for the unipersonal — it is not a sociedad', () => {
      const input = { ...base, people: 'socios', sociosCount: 2 } as const
      for (const id of ['unipersonal-literal-e', 'unipersonal-irae'] as const) {
        const g = applyGates(input).find(x => x.regime === id)!
        expect(g.status).toBe('excluido')
        for (const r of g.reasons) {
          expect(r.norm, `${id} should not be gated on Ley 16.060`).not.toContain('16.060')
        }
        expect(g.reasons.some(r => r.url.includes('empresa-unipersonal'))).toBe(true)
      }
    })

    it('grounds the unlimited liability of personas físicas in the Código Civil, not Ley 16.060 art. 39', () => {
      const out = applyGates({ ...base, needsLimitedLiability: true })
      // Monotributo / unipersonal / IRPF are PERSONAS FÍSICAS, not sociedades: their
      // unlimited liability is the prenda general of Código Civil art. 2372.
      for (const id of [
        'monotributo',
        'monotributo-social',
        'unipersonal-literal-e',
        'unipersonal-irae',
        'irpf-servicios',
      ] as const) {
        const g = out.find(x => x.regime === id)!
        const liability = g.reasons.filter(r => r.text.includes('patrimonio personal'))
        expect(liability.length, `${id} should have a liability reason`).toBeGreaterThan(0)
        for (const r of liability) {
          expect(r.norm, `${id} liability must not cite Ley 16.060 art. 39`).not.toContain('16.060')
          expect(r.norm).toContain('2372')
        }
      }
      // Ley 16.060 art. 39 IS the right cite for a sociedad de hecho.
      const sh = out.find(x => x.regime === 'sociedad-hecho')!
      expect(sh.reasons.some(r => r.norm.includes('16.060') && r.norm.includes('39'))).toBe(true)
      expect(sh.reasons.some(r => r.url.includes('/16060-1989/39'))).toBe(true)
    })

    it('cites Título 7 (IRPF), not Título 4 (IRAE), on the irpf-servicios gates', () => {
      const inputs: WizardInput[] = [
        { ...base, people: 'socios', sociosCount: 2 },
        { ...base, sells: 'bienes' },
      ]
      for (const input of inputs) {
        const g = applyGates(input).find(x => x.regime === 'irpf-servicios')!
        expect(g.status).toBe('excluido')
        for (const r of g.reasons) {
          if (r.text.includes('patrimonio personal')) continue
          expect(r.norm, 'IRPF is Título 7, not Título 4').not.toContain('Título 4')
          expect(r.url).toContain('todgi-2023/7')
        }
      }
    })
  })

  it('cites a norm and a URL on every exclusion', () => {
    const out = applyGates({
      ...base,
      sells: 'servicios',
      employees: 2,
      needsLimitedLiability: true,
    })
    for (const g of out) {
      for (const r of g.reasons) {
        expect(r.norm.length).toBeGreaterThan(0)
        expect(r.url).toMatch(/^https:\/\//)
        expect(r.text.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('irpfCat2Monthly', () => {
  it('taxes nothing below the mínimo no imponible', () => {
    expect(irpfCat2Monthly(48_000)).toBe(0)
  })

  it('applies the brackets marginally, not as a cliff', () => {
    // 60.000: first 48.048 at 0%, the remaining 11.952 at 10%.
    expect(irpfCat2Monthly(60_000)).toBeCloseTo(1195.2, 1)
  })

  it('is monotonically non-decreasing', () => {
    let prev = -1
    for (let m = 0; m <= 1_000_000; m += 10_000) {
      const t = irpfCat2Monthly(m)
      expect(t).toBeGreaterThanOrEqual(prev)
      prev = t
    }
  })
})

describe('estimateCost', () => {
  const base: WizardInput = {
    annualRevenueUyu: 600_000,
    sells: 'bienes',
    clients: 'consumidor-final',
    people: 'solo',
    employees: 0,
    needsLimitedLiability: false,
    otherCompanyRole: false,
    yearsOperating: 5,
    family: 'solo',
  }
  const socios2: WizardInput = { ...base, people: 'socios', sociosCount: 2 }

  it('costs a full-regime monotributo at the BPS table value', () => {
    const c = estimateCost('monotributo', base)
    expect(c.bpsMonthly).toBe(F.monoPlenoFonasaSolo.value)
    expect(c.taxMonthly).toBe(0) // monotributo substitutes the taxes
    expect(c.totalMonthly).toBe(F.monoPlenoFonasaSolo.value)
  })

  it('applies the Ley 19.942 gradual scale to a brand-new monotributo', () => {
    const c = estimateCost('monotributo', { ...base, yearsOperating: 0 })
    expect(c.bpsMonthly).toBe(F.monoAnio1FonasaSolo.value)
  })

  it('costs Literal E as BPS + the flat IVA mínimo when NOT e-invoicing', () => {
    const c = estimateCost('unipersonal-literal-e', { ...base, eFactura: false })
    expect(c.bpsMonthly).toBe(F.bpsUnipersonalPleno.value)
    expect(c.taxMonthly).toBe(F.ivaMinimo.value)
    expect(c.totalMonthly).toBe(F.bpsUnipersonalPleno.value + F.ivaMinimo.value)
  })

  it('caps the IVA mínimo at 3,3% of monthly billing when e-invoicing', () => {
    // 600.000/year = 50.000/month. 3,3% = 1.650 < the 5.910 quota.
    const c = estimateCost('unipersonal-literal-e', { ...base, eFactura: true })
    expect(c.taxMonthly).toBeCloseTo(1650, 0)
    expect(c.notes.join(' ')).toContain('3,3%')
  })

  // IMPORTANT 3 — the previous version of this test used annualRevenueUyu: 3.000.000, an
  // input `applyGates` rules ILLEGAL for Literal E (it is above the $1.959.229 ceiling), and
  // justified it with a 10-line comment claiming the 3,3% cap "can only bind above the
  // ceiling". That claim was FALSE: it checked only the PLENO quota (5.910) and forgot the
  // GRADUAL ones. The año-2 quota (2.955) binds from ~$1.074.545/año — comfortably inside
  // the ceiling. So the branch is reachable on a perfectly legal input, and the test now
  // uses one. (The wrong comment is deleted rather than corrected: a false claim sitting in
  // the repo is worse than no claim, because the page author will read it as fact.)
  it('charges the QUOTA, not 3,3%, when 3,3% of billing would exceed it — on a LEGAL input', () => {
    // Year 1 → the gradual quota is 1.478. 3,3% of 100.000/mes = 3.300 > 1.478 → quota wins.
    const input: WizardInput = {
      ...base,
      yearsOperating: 0,
      annualRevenueUyu: 1_200_000,
      eFactura: true,
    }
    expect(statusOf(input, 'unipersonal-literal-e')).toBe('elegible')
    const c = estimateCost('unipersonal-literal-e', input)
    expect(c.taxMonthly).toBe(F.ivaMinimoAnio1.value)
  })

  // The genuinely publishable finding the old test's false comment was groping at: at the
  // PLENO quota, with even billing, the 3,3% cap ALWAYS wins inside the Literal E ceiling.
  // Even billing at the very ceiling is $163.269/mes × 3,3% = $5.388 < the $5.910 quota. So
  // an e-invoicing Literal E in the full regime effectively never pays the flat quota on
  // even billing — only a lumpy month above ~$179.091 would trigger it.
  it('surfaces that a PLENO e-factura Literal E never reaches the quota on even billing', () => {
    const atCeiling: WizardInput = {
      ...base,
      annualRevenueUyu: F.topeLiteralEUyu.value,
      eFactura: true,
      yearsOperating: 5,
    }
    const c = estimateCost('unipersonal-literal-e', atCeiling)
    expect(c.taxMonthly).toBeLessThan(F.ivaMinimo.value)
    expect(c.notes.join(' ')).toContain('3,3%')
  })

  it('costs the freelancer BPS as flat ficto + FONASA on real billing, with the floor binding', () => {
    // 600.000/año = 50.000/mes. FONASA base = 50.000 × 70% = 35.000; × 4,5% = 1.575,
    // which is BELOW the 5.020 floor → the floor binds.
    const c = estimateCost('irpf-servicios', { ...base, sells: 'servicios' })
    expect(c.bpsMonthly).toBe(F.spJubilatorioFicto.value + F.spFonasaMinimo.value) // 9.614
  })

  it('lifts FONASA above the floor once billing is high enough', () => {
    // 3.000.000/año = 250.000/mes. Base = 175.000; × 4,5% = 7.875 > 5.020 floor.
    const c = estimateCost('irpf-servicios', {
      ...base,
      sells: 'servicios',
      annualRevenueUyu: 3_000_000,
    })
    expect(c.bpsMonthly).toBeCloseTo(F.spJubilatorioFicto.value + 7875, 0)
  })

  it('does NOT give the Ley 19.889 ramp to a unipersonal in IRAE (it is a Literal E benefit)', () => {
    const nuevo = { ...base, yearsOperating: 0 }
    expect(estimateCost('unipersonal-irae', nuevo).bpsMonthly).toBe(F.bpsUnipersonalPleno.value)
    // ...but Literal E DOES get it.
    expect(estimateCost('unipersonal-literal-e', nuevo).bpsMonthly).toBe(
      F.bpsUnipersonalAnio1.value
    )
  })

  it('charges the SAS administrator BPS even at zero revenue', () => {
    const c = estimateCost('sas', { ...base, annualRevenueUyu: 0 })
    expect(c.bpsMonthly).toBe(F.bpsAdminSas.value)
    expect(c.totalMonthly).toBeGreaterThanOrEqual(F.bpsAdminSas.value)
  })

  it('adds ICOSA to the SA and to nobody else', () => {
    const sa = estimateCost('sa', socios2)
    const sas = estimateCost('sas', base)
    expect(sa.setupCost).toBeGreaterThanOrEqual(F.icosaConstitucion.value)
    expect(sa.otherTaxesMonthly).toBeCloseTo(F.icosaAnual.value / 12, 6)
    expect(sa.notes.join(' ')).toContain('ICOSA')
    expect(sas.otherTaxesMonthly).toBe(0)
    expect(sas.notes.join(' ')).not.toContain('ICOSA')
  })

  // ---------------------------------------------------------------------------------
  // CRITICAL 1 — an unknowable component must never be coalesced into a total. The CJPPU
  // professional used to get `{ bpsMonthly: 0, totalMonthly: 0, totalAnnual: 0 }`: a "we
  // cannot know this" sentinel silently became a measurement the moment it crossed the
  // function boundary. Task 5 ranks by `totalAnnual`, so a freelance contador would have
  // been told the independent path costs NOTHING and beats every other regime.
  // ---------------------------------------------------------------------------------
  describe('incomplete costs (CRITICAL 1)', () => {
    it('returns a NULL bps and a NULL total — never 0 — for a CJPPU professional, and says so', () => {
      // 3.000.000/año keeps the IRPF above the mínimo no imponible, so there IS a known
      // component to expose alongside the unknown one.
      const c = estimateCost('irpf-servicios', {
        ...base,
        sells: 'servicios',
        annualRevenueUyu: 3_000_000,
        cajaProfesional: true,
      })
      expect(c.bpsMonthly).toBeNull()
      expect(c.bpsUnknown).toBe(true)
      expect(c.totalMonthly).toBeNull()
      expect(c.totalAnnual).toBeNull()
      // The number we DO know is still available for display — it is just not a total.
      expect(c.taxMonthly).toBeGreaterThan(0)
      expect(c.knownPartialMonthly).toBe(c.taxMonthly)
      expect(c.notes.join(' ')).toContain('CJPPU')
      expect(c.notes.join(' ')).toContain('NO INCLUYE')
    })

    // The regression that made this CRITICAL: `bpsMonthly = sp ?? 0` made the most
    // expensive regime look like the cheapest.
    it('never lets an incomplete cost undercut a complete one', () => {
      const cjppu = estimateCost('irpf-servicios', {
        ...base,
        sells: 'servicios',
        cajaProfesional: true,
      })
      const mono = estimateCost('monotributo', base)
      expect(cjppu.totalAnnual).toBeNull()
      expect(mono.totalAnnual).not.toBeNull()
      // A ranker that naively did `a.totalAnnual - b.totalAnnual` on a coalesced 0 would
      // put the CJPPU freelancer first. With null it cannot even try.
      expect(cjppu.totalAnnual ?? Number.POSITIVE_INFINITY).toBeGreaterThan(mono.totalAnnual!)
    })

    // The invariant Task 5 relies on, in one line: nullness of the total is EXACTLY the
    // disjunction of the component-level unknown flags. No silent partial totals.
    it('keeps totalAnnual === null in lockstep with the unknown flags, for every regime', () => {
      const inputs: WizardInput[] = [
        base,
        socios2,
        { ...base, people: 'socios' }, // socios, but sociosCount not supplied
        { ...base, sells: 'servicios', cajaProfesional: true },
        { ...base, annualRevenueUyu: 0 },
        { ...base, annualRevenueUyu: 50_000_000 }, // far above the ficto's legal range
      ]
      for (const input of inputs) {
        for (const id of ALL_REGIMES) {
          const c = estimateCost(id, input)
          const incomplete = c.bpsUnknown || c.taxUnknown
          expect(c.totalMonthly === null, `${id} totalMonthly vs flags`).toBe(incomplete)
          expect(c.totalAnnual === null, `${id} totalAnnual vs flags`).toBe(incomplete)
          if (!incomplete) {
            expect(c.totalAnnual).toBeCloseTo(c.totalMonthly! * 12, 6)
            expect(c.totalMonthly).toBeCloseTo(c.knownPartialMonthly, 6)
          }
          // An incompleteness is never silent: it always explains itself.
          if (incomplete) expect(c.notes.length, `${id} must explain`).toBeGreaterThan(0)
        }
      }
    })

    // The relationship the brief asks for: gates and cost must not disagree. A regime the
    // gates call `elegible` may still be un-costable (an SA always is), but it may NEVER be
    // un-costable SILENTLY — the flag has to be set.
    it('never hands an ELEGIBLE regime a silently-incomplete cost', () => {
      const inputs: WizardInput[] = [
        base,
        { ...base, sells: 'servicios' },
        { ...base, sells: 'servicios', cajaProfesional: true },
        { ...base, sells: 'ambos', clients: 'exterior' },
        socios2,
        { ...base, people: 'socios', sociosCount: 3, sociosFamiliares: true },
        { ...base, needsLimitedLiability: true, people: 'socios', sociosCount: 2 },
        { ...base, midesEligible: true },
        { ...base, annualRevenueUyu: 12_000_000, people: 'socios', sociosCount: 2 },
        { ...base, annualRevenueUyu: 40_000_000, people: 'socios', sociosCount: 2 },
        { ...base, yearsOperating: 0, eFactura: true },
      ]
      for (const input of inputs) {
        for (const g of applyGates(input)) {
          if (g.status !== 'elegible') continue
          const c = estimateCost(g.regime, input)
          if (c.totalAnnual === null) {
            expect(
              c.bpsUnknown || c.taxUnknown,
              `${g.regime} is elegible but its cost is incomplete with NO flag set`
            ).toBe(true)
            expect(c.notes.length, `${g.regime} must say why it cannot be costed`).toBeGreaterThan(
              0
            )
          } else {
            expect(c.bpsUnknown, `${g.regime}`).toBe(false)
            expect(c.taxUnknown, `${g.regime}`).toBe(false)
            expect(c.totalAnnual, `${g.regime}`).toBeGreaterThanOrEqual(0)
          }
        }
      }
    })
  })

  // ---------------------------------------------------------------------------------
  // CRITICAL 2 — the IRAE ficto tramos, end to end through estimateCost.
  // ---------------------------------------------------------------------------------
  describe('IRAE ficto tramos in the cost model (CRITICAL 2)', () => {
    const IRAE_REGIMES = ['unipersonal-irae', 'sociedad-hecho', 'srl', 'sas'] as const

    it('charges MORE than a flat 12% once revenue passes UI 1.000.000', () => {
      // UI 1.000.000 ≈ $6.615.000/año. At $12.000.000 the second tramo (14%) is engaged.
      const rev = 12_000_000
      const flat12Monthly = (rev * 0.12 * F.irae.value) / 12
      for (const id of IRAE_REGIMES) {
        const c = estimateCost(id, { ...socios2, annualRevenueUyu: rev })
        expect(c.taxUnknown, `${id}`).toBe(false)
        expect(c.taxMonthly!, `${id} must not still be charging a flat 12%`).toBeGreaterThan(
          flat12Monthly
        )
        const expected = (iraeFictoRentaNetaAnual(rev) * F.irae.value) / 12
        expect(c.taxMonthly!, `${id}`).toBeCloseTo(expected, 4)
      }
    })

    it('understates nothing in the 48%/60% tramos', () => {
      const rev = ui(3_500_000) // ≈ $23.152.500 — inside the 60% tramo, below the UI 4M tope
      for (const id of IRAE_REGIMES) {
        const c = estimateCost(id, { ...socios2, annualRevenueUyu: rev })
        const expected = (iraeFictoRentaNetaAnual(rev) * F.irae.value) / 12
        expect(c.taxMonthly!, `${id}`).toBeCloseTo(expected, 4)
        // Sanity: the old flat-12% model would have been ~5x lower here.
        expect(c.taxMonthly!).toBeGreaterThan((rev * 0.12 * F.irae.value) / 12)
      }
    })

    // Dto. 150/007 art. 168 lit. b): contabilidad suficiente is PRECEPTIVA above
    // UI 4.000.000 → IRAE REAL, which depends on the real expense structure. This model
    // cannot compute it, and must not extrapolate the ficto beyond its legal range.
    it('refuses to extrapolate the ficto above UI 4.000.000 (contabilidad suficiente preceptiva)', () => {
      const rev = ui(4_000_000) + 1_000_000
      for (const id of IRAE_REGIMES) {
        const c = estimateCost(id, { ...socios2, annualRevenueUyu: rev })
        expect(c.taxMonthly, `${id}`).toBeNull()
        expect(c.taxUnknown, `${id}`).toBe(true)
        expect(c.totalAnnual, `${id}`).toBeNull()
        expect(c.notes.join(' '), `${id}`).toContain('contabilidad suficiente')
        expect(c.notes.join(' '), `${id}`).toContain('contador')
      }
    })

    it('discloses that the tramo boundary moves with the UI', () => {
      const c = estimateCost('unipersonal-irae', { ...base, annualRevenueUyu: 8_000_000 })
      expect(c.notes.join(' ')).toContain('UI')
      expect(c.notes.join(' ')).toMatch(/aproximad/i)
    })

    // Dto. 150/007 art. 168 lit. a) → Título 4 art. 12 lit. A num. 1 ("las sociedades
    // anónimas y las sociedades en comandita por acciones"): an SA is obligated to
    // contabilidad suficiente at ANY revenue. The ficto is never available to it, so the
    // flat-12% number the model used to print for an SA was wrong at every level.
    it('never applies the ficto to an SA — it is always contabilidad suficiente', () => {
      for (const rev of [0, 600_000, 5_000_000, 30_000_000]) {
        const c = estimateCost('sa', { ...socios2, annualRevenueUyu: rev })
        expect(c.taxMonthly, `sa @ ${rev}`).toBeNull()
        expect(c.taxUnknown, `sa @ ${rev}`).toBe(true)
        expect(c.totalAnnual, `sa @ ${rev}`).toBeNull()
        // ICOSA is still known, and still shown.
        expect(c.otherTaxesMonthly).toBeCloseTo(F.icosaAnual.value / 12, 6)
      }
      expect(estimateCost('sa', socios2).notes.join(' ')).toContain('contabilidad suficiente')
    })
  })

  // ---------------------------------------------------------------------------------
  // IMPORTANT 4 — monoBps dropped the family situation during the ramp years. A year-1
  // monotributista CON CÓNYUGE E HIJOS was charged the SOLO column (4.761 instead of
  // 6.322): a $1.561/month understatement, on the newest, most price-sensitive user.
  // Columns fetched from BPS's own PDF (monotributo-ley-19.942---2026.pdf), whose
  // "Aporte total" block is unambiguous where the HTML headers are not.
  // ---------------------------------------------------------------------------------
  describe('monotributo BPS family columns during the ramp (IMPORTANT 4)', () => {
    const cases = [
      {
        family: 'solo',
        a1: F.monoAnio1FonasaSolo,
        a2: F.monoAnio2FonasaSolo,
        p: F.monoPlenoFonasaSolo,
      },
      {
        family: 'con-hijos',
        a1: F.monoAnio1FonasaHijos,
        a2: F.monoAnio2FonasaHijos,
        p: F.monoPlenoFonasaHijos,
      },
      {
        family: 'con-conyuge',
        a1: F.monoAnio1FonasaConyuge,
        a2: F.monoAnio2FonasaConyuge,
        p: F.monoPlenoFonasaConyuge,
      },
      {
        family: 'con-conyuge-e-hijos',
        a1: F.monoAnio1FonasaConyugeHijos,
        a2: F.monoAnio2FonasaConyugeHijos,
        p: F.monoPlenoFonasaConyugeHijos,
      },
    ] as const

    it('honours the family column in year 1, year 2 AND the full regime', () => {
      for (const { family, a1, a2, p } of cases) {
        expect(
          estimateCost('monotributo', { ...base, family, yearsOperating: 0 }).bpsMonthly,
          `${family} y0`
        ).toBe(a1.value)
        expect(
          estimateCost('monotributo', { ...base, family, yearsOperating: 1 }).bpsMonthly,
          `${family} y1`
        ).toBe(a2.value)
        expect(
          estimateCost('monotributo', { ...base, family, yearsOperating: 2 }).bpsMonthly,
          `${family} y2`
        ).toBe(p.value)
      }
    })

    it('matches BPS: a year-1 monotributista con cónyuge e hijos pays 6.322, not 4.761', () => {
      const c = estimateCost('monotributo', {
        ...base,
        family: 'con-conyuge-e-hijos',
        yearsOperating: 0,
      })
      expect(c.bpsMonthly).toBe(6322)
      expect(c.bpsMonthly).not.toBe(F.monoAnio1FonasaSolo.value)
    })
  })

  // ---------------------------------------------------------------------------------
  // IMPORTANT 5 — a monotributista sociedad de hecho was priced as a single unipersonal
  // (6.327 — the unipersonal PLENO column) no matter how many socios there were, while
  // `FIGURES.monoSocioSociedadHecho` (the per-socio figure that exists for exactly this)
  // was referenced nowhere. Same defect in `sociedad-hecho`: a one-person BPS base mixed
  // with a whole-company tax base — neither "your cost" nor "the company's cost".
  // ---------------------------------------------------------------------------------
  describe('sociedad de hecho BPS scales with the socios (IMPORTANT 5)', () => {
    it('charges the monotributo sociedad-de-hecho per-socio figure, times the socios', () => {
      const c = estimateCost('monotributo', { ...socios2, yearsOperating: 5 })
      expect(c.bpsMonthly).toBe(F.monoSocioSociedadHecho.value * 2)
      expect(c.bpsMonthly).not.toBe(F.monoPlenoFonasaSolo.value)
    })

    it('ramps the monotributo sociedad de hecho per socio (BPS: 522 / 1.045 / 2.088)', () => {
      const y = (n: number) =>
        estimateCost('monotributo', { ...socios2, yearsOperating: n }).bpsMonthly
      expect(y(0)).toBe(F.monoSocioSociedadHechoAnio1.value * 2) // 1.045 — BPS's "dos socios"
      expect(y(1)).toBe(F.monoSocioSociedadHechoAnio2.value * 2) // 2.088
      expect(y(2)).toBe(F.monoSocioSociedadHecho.value * 2) // 4.176
    })

    it('scales with 3 socios too', () => {
      const c = estimateCost('monotributo', {
        ...base,
        people: 'socios',
        sociosCount: 3,
        sociosFamiliares: true,
        yearsOperating: 5,
      })
      expect(c.bpsMonthly).toBe(F.monoSocioSociedadHecho.value * 3)
    })

    // BPS's sociedad-de-hecho table publishes NO FONASA/SNS column at all. We do not invent
    // one — we say so.
    it('discloses that the sociedad-de-hecho monotributo figure carries no FONASA', () => {
      expect(estimateCost('monotributo', socios2).notes.join(' ')).toContain('FONASA')
    })

    // BPS "Industria y comercio", table "Sociedad de hecho sin dependientes": 1 socio →
    // 11 BFC → $4.594 "Total a pagar" — jubilatorio + FRL, WITHOUT FONASA. NOT the
    // unipersonal TITULAR's $8.833 (11 BFC *plus* FONASA), which is what the code charged.
    it('costs the IRAE sociedad de hecho at the socio figure × socios, not the unipersonal titular', () => {
      const c = estimateCost('sociedad-hecho', socios2)
      expect(c.bpsMonthly).toBe(F.bpsSocioSociedadHecho.value * 2)
      expect(c.bpsMonthly).not.toBe(F.bpsUnipersonalPleno.value)
    })

    it('says whose cost the number is: the COMPANY total, not the visitor’s share', () => {
      const notes = estimateCost('sociedad-hecho', socios2).notes.join(' ')
      expect(notes.toLowerCase()).toContain('sociedad')
      expect(notes).toMatch(/socios/)
    })

    // We cannot cost a sociedad without knowing how many socios it has. Guessing 2 would be
    // exactly the "turn a sentinel into a measurement" bug CRITICAL 1 is about.
    it('refuses to cost a sociedad whose socio count we were not told', () => {
      const unknown: WizardInput = { ...base, people: 'socios' }
      for (const id of ['monotributo', 'sociedad-hecho'] as const) {
        const c = estimateCost(id, unknown)
        expect(c.bpsMonthly, id).toBeNull()
        expect(c.bpsUnknown, id).toBe(true)
        expect(c.totalAnnual, id).toBeNull()
      }
    })
  })

  // ---------------------------------------------------------------------------------
  // MINOR 9 / 10 / 11 — disclosures. Each of these is a place the model is knowingly
  // conservative or knowingly incomplete; none of them may be silent.
  // ---------------------------------------------------------------------------------
  describe('disclosures', () => {
    it('MINOR 9: discloses that a titular with FONASA from a job is shown the UNRAMPED figure', () => {
      const c = estimateCost('unipersonal-literal-e', {
        ...base,
        yearsOperating: 0,
        fonasaFromJob: true,
      })
      expect(c.bpsMonthly).toBe(F.bpsUnipersonalConFonasaDeEmpleo.value)
      const notes = c.notes.join(' ')
      expect(notes).toContain('19.889')
      expect(notes).toMatch(/no publica/i)
    })

    it('MINOR 10: Literal E explains its own Ley 19.889 ramp, and when it ends', () => {
      const nuevo = estimateCost('unipersonal-literal-e', { ...base, yearsOperating: 0 })
      const notes = nuevo.notes.join(' ')
      expect(notes).toContain('19.889')
      expect(notes).toMatch(/tercer|3/)
      // ...and it does NOT claim a ramp once the ramp is over.
      const viejo = estimateCost('unipersonal-literal-e', { ...base, yearsOperating: 5 })
      expect(viejo.bpsMonthly).toBe(F.bpsUnipersonalPleno.value)
    })

    it('MINOR 11: IRPF Cat. II discloses that it omits the deducciones credit (so it OVERstates)', () => {
      const notes = estimateCost('irpf-servicios', { ...base, sells: 'servicios' }).notes.join(' ')
      expect(notes.toLowerCase()).toContain('deducciones')
      expect(notes).toMatch(/14 ?%/)
      expect(notes.toLowerCase()).toMatch(/mayor|sobrestim|más alto/)
    })
  })

  // The old monotonicity test capped at 3.000.000 and covered 4 of 9 regimes — which is
  // exactly why the flat-12% IRAE ficto (whose first tramo boundary is at ≈ $6.615.000)
  // slipped through. It now runs well past every tramo boundary AND the UI 4.000.000 tope,
  // across every regime, in both the solo and the socios shape.
  it('is monotonically non-decreasing in revenue for EVERY regime, past every tramo boundary', () => {
    const shapes: WizardInput[] = [
      { ...base, sells: 'servicios' },
      { ...socios2, sells: 'servicios' },
    ]
    for (const shape of shapes) {
      for (const id of ALL_REGIMES) {
        let prev = -1
        let sawNumber = false
        for (let rev = 0; rev <= ui(5_000_000); rev += 500_000) {
          const c = estimateCost(id, { ...shape, annualRevenueUyu: rev })
          // An incomplete cost is not comparable — that is the whole point of CRITICAL 1.
          if (c.totalAnnual === null) continue
          sawNumber = true
          expect(c.totalAnnual, `${id} @ ${rev}`).toBeGreaterThanOrEqual(prev)
          prev = c.totalAnnual
        }
        // Guard the guard: a regime that returns null everywhere would pass vacuously. Two
        // regimes legitimately do — the SA (never costable: contabilidad suficiente) and a
        // sociedad de hecho whose socio count we were not given.
        const uncostable = id === 'sa' || (id === 'sociedad-hecho' && !shape.sociosCount)
        if (!uncostable) {
          expect(sawNumber, `${id} produced no costable point — the check ran vacuously`).toBe(true)
        }
      }
    }
  })
})

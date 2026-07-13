import { readFileSync } from 'node:fs'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  FIGURES,
  FIGURES as F,
  IRAE_FICTO,
  IRPF_CAT2,
  MARKET_ESTIMATES,
  PRODUCT_THRESHOLDS,
  REGIMES,
  applyGates,
  estimateCost,
  evaluate,
  iraeFictoRentaNetaAnual,
  irpfCat2Monthly,
  type Figure,
  type RegimeId,
  type Verdict,
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
   *
   * MINOR 9 — SAY THE QUIET PART OUT LOUD: THIS IS THE ONE PLACE THE GUARD TRUSTS INTENT OVER
   * STRUCTURE. Everywhere else, an exemption is a structural fact the AST can confirm — the
   * literal is inside a `fig()` call (which the primary-domain test then independently forces
   * to carry a real URL), or inside a `brackets:` table of a named declaration that carries its
   * own `source`, or it is an array index. Here, the guard confirms only that the number sits
   * inside a call to an identifier spelled `est`, and takes on faith that the number really IS
   * unsourceable rather than merely unsourced. Nothing stops someone declaring a second
   * `const est = ...`, or laundering a genuine BPS figure through `est()` to dodge the URL
   * requirement — and `MARKET_ESTIMATES`'s own test checks only the SHAPE (value/label/
   * rationale/unsourced), never that no primary source exists, because no test can check that.
   *
   * This is accepted BY DESIGN: `est()` self-labels, and its output is rendered to the reader
   * as an explicit "market estimate, not an official figure", so a laundered figure would be
   * lying in public rather than hiding. But it is a hole the AST cannot close, and it is worth
   * knowing that it is here rather than discovering it. Adding an `est()` call is a decision a
   * human must review; adding a `fig()` call is one the tests can police.
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

    // ROUND-2 MINOR 10 — `{people:'socios'}` with no `sociosCount` left `sociedad-hecho` and
    // `srl` sitting at `elegible` while `monotributo` was `dudoso` for the very same gap. The
    // gate never asked for the datum those two regimes cannot be described (or costed) without
    // — and Ley 16.060 art. 1's own 2-socio minimum cannot even be CHECKED without it.
    it('MINOR 10: is dudoso — not elegible — for sociedad de hecho and SRL when sociosCount is missing', () => {
      const input = { ...base, people: 'socios' } as const
      for (const id of ['monotributo', 'sociedad-hecho', 'srl'] as const) {
        const g = applyGates(input).find(x => x.regime === id)!
        expect(g.status, `${id} must ask how many socios there are`).toBe('dudoso')
        expect(
          g.reasons.some(r => r.status === 'dudoso' && /^https:\/\//.test(r.url)),
          `${id} must cite a norm for the doubt`
        ).toBe(true)
      }
    })

    // ...and supplying it resolves the doubt.
    it('MINOR 10: becomes elegible once the socio count is supplied', () => {
      const input = { ...base, people: 'socios', sociosCount: 2 } as const
      for (const id of ['sociedad-hecho', 'srl'] as const) {
        expect(applyGates(input).find(x => x.regime === id)!.status, id).toBe('elegible')
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

    // MINOR 5 — the art. 168 tope was converted with `uiHoy` (which moves every day). The norm
    // says otherwise. Art. 168 lit. b), VERBATIM: "siempre que sus ingresos hayan superado en
    // el ejercicio anterior las UI 4:000.000 ... A VALORES DE CIERRE DE EJERCICIO"; and lit. c)
    // spells it out again: "A tales efectos se tomará la cotización de la unidad indexada
    // vigente AL CIERRE DE EJERCICIO." `FIGURES.uiCierre2025` existed for exactly this and was
    // referenced nowhere in the module.
    it('MINOR 5: converts the art. 168 tope at the UI de CIERRE, not at today’s UI', () => {
      const cierre = F.topeIraePreceptivoUi.value * F.uiCierre2025.value // 25.694.800
      const hoy = F.topeIraePreceptivoUi.value * F.uiHoy.value // 26.460.000
      expect(cierre).toBeLessThan(hoy)

      // Just BELOW the cierre boundary: the ficto is still available.
      const below = estimateCost('unipersonal-irae', {
        ...base,
        annualRevenueUyu: cierre - 100_000,
      })
      expect(below.taxUnknown).toBe(false)

      // BETWEEN the two: correct under the norm (cierre) → un-costable. Under the old, wrong
      // conversion (hoy) this band still printed a confident IRAE ficto.
      const between = estimateCost('unipersonal-irae', {
        ...base,
        annualRevenueUyu: (cierre + hoy) / 2,
      })
      expect(between.taxMonthly).toBeNull()
      expect(between.taxUnknown).toBe(true)
    })

    // MINOR 5 (second half) — the "this boundary is approximate" caveat was pushed only on the
    // branch where the ficto IS available. The branch that flips the regime to UN-COSTABLE
    // needs it more, not less: a regime must not go from a printed total to "we can't cost
    // this" on a UI move without telling the reader the boundary is soft.
    it('MINOR 5: warns that the boundary is approximate on the UN-COSTABLE branch too', () => {
      const c = estimateCost('unipersonal-irae', { ...base, annualRevenueUyu: 40_000_000 })
      expect(c.taxUnknown).toBe(true)
      const notes = c.notes.join(' ')
      expect(notes).toContain('contabilidad suficiente')
      expect(notes).toMatch(/aproximad/i)
      expect(notes).toContain('UI')
    })

    // MINOR 8 — the module asserted, inside a user-facing string, that art. 64 admits deducting
    // "hasta 11 BFC por dueño o socio que preste servicios efectivos". Art. 64's empresarial
    // ficto says only: "la renta neta se determinará DEDUCIENDO LOS SUELDOS DE DUEÑOS O SOCIOS
    // ADMITIDOS POR LA REGLAMENTACIÓN". There is no 11-BFC cap in it. The 11 BFC lives in a
    // DIFFERENT inciso of the same article — the AGROPECUARIO one ("b) Por cada dueño o socio,
    // once Bases Fictas de Contribución mensuales ... a condición de que se presten efectivos
    // servicios") — which does not govern the empresarial ficto this model applies.
    //
    // The AST guard cannot see numbers inside strings, so this class of claim is invisible to
    // it. Only a test can hold the line.
    it('MINOR 8: does not invent an 11-BFC cap on the art. 64 sueldos-de-dueños deduction', () => {
      const notes = estimateCost('unipersonal-irae', {
        ...base,
        annualRevenueUyu: 8_000_000,
      }).notes.join(' ')
      // It still discloses the (conservative) omission...
      expect(notes).toMatch(/sueldos de due/i)
      // ...but it no longer attaches a number the article does not contain.
      expect(notes).not.toMatch(/11 BFC/i)
      expect(notes).not.toMatch(/once Bases Fictas/i)
    })

    // MINOR 7 — the cite here (and in the module) used to say "Título 4 art. 12 lit. A num. 1".
    // Wrong article. Dto. 150/007 art. 168 lit. a), VERBATIM: "Los sujetos pasivos comprendidos
    // en los numerales 1 y 4 a 7 del literal A del ARTÍCULO 3º del Título que se reglamenta."
    // It is art. 3, whose lit. A num. 1 is "las sociedades anónimas y las sociedades en
    // comandita por acciones" — so an SA is obligated to contabilidad suficiente at ANY
    // revenue, and the flat-12% number the model used to print for an SA was wrong at every
    // level. (The module already cited art. 3 correctly one function away; the two disagreed.)
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
      expect(y(0)).toBe(F.monoSocioSociedadHechoAnio1.value * 2)
      expect(y(1)).toBe(F.monoSocioSociedadHechoAnio2.value * 2)
      expect(y(2)).toBe(F.monoSocioSociedadHecho.value * 2)
    })

    // MINOR 6 — the three assertions above USED to carry comments claiming their results were
    // "BPS's 'dos socios'" figures. They are not, and the arithmetic never said they were:
    // 522 × 2 = 1.044, but BPS publishes 1.045. A false claim in a comment is worse than no
    // comment, because the next author reads it as verification.
    //
    // BPS does NOT publish a per-socio unit that it then multiplies. It publishes each CELL,
    // computed from the 5-BFC ficto per socio and rounded once at the end — so per-socio
    // multiplication reproduces its table only to within a few pesos. Verified verbatim in
    // BPS's own PDFs (monotributo-ley-18.083---2026.pdf and monotributo-ley-19.942---2026.pdf,
    // table "Monotributo: sociedad de hecho"). This test pins the REAL published totals and
    // the exact size of our approximation, so neither can drift unnoticed.
    it('records where per-socio multiplication does NOT reproduce BPS’s published totals', () => {
      // BPS, "Monotributo: sociedad de hecho", Total a pagar (jubilatorio + FRL):
      //                  primeros 12   segundos 12   desde el mes 25
      //   Un socio            522          1.045          2.088
      //   Dos socios        1.045          2.088          4.176
      //   Tres socios       1.566          3.132          6.265
      const BPS_PUBLISHED = {
        1: [522, 1045, 2088],
        2: [1045, 2088, 4176],
        3: [1566, 3132, 6265],
      } as const
      const perSocio = [
        F.monoSocioSociedadHechoAnio1.value,
        F.monoSocioSociedadHechoAnio2.value,
        F.monoSocioSociedadHecho.value,
      ]
      // The per-socio figures ARE exactly BPS's "un socio" row — that much is a true claim.
      expect(perSocio).toEqual([...BPS_PUBLISHED[1]])

      // ...but multiplying that row does not reproduce the others exactly. Pin the deltas.
      const deltas: number[] = []
      for (const socios of [2, 3] as const) {
        for (let tier = 0; tier < 3; tier++) {
          deltas.push(BPS_PUBLISHED[socios][tier]! - perSocio[tier]! * socios)
        }
      }
      // dos socios: 1.045−1.044=+1, 2.088−2.090=−2, 4.176−4.176=0
      // tres socios: 1.566−1.566=0, 3.132−3.135=−3, 6.265−6.264=+1
      expect(deltas).toEqual([1, -2, 0, 0, -3, 1])
      // The approximation is bounded by BPS's own rounding — never more than a few pesos.
      for (const d of deltas) expect(Math.abs(d)).toBeLessThanOrEqual(3)
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
    // ROUND-2 SOURCE CORRECTION — this test used to assert the OPPOSITE, and it was wrong.
    // The module claimed, in a comment and in a user-facing note, that "BPS publishes a single
    // figure for the titular who already has FONASA por un empleo, and does NOT publish a
    // ramped version of that column". BPS DOES publish it. The Ley 19.889 gradual page
    // (bps.gub.uy/17829) carries the column "Con aporte al SNS por actividad dependiente
    // (SS 2, 28, 29 y 30)" in ALL FOUR year tables, 1.ª categoría / 11 BFC:
    //   primeros 12 meses 3.999 · segundos 4.380 · terceros 4.761 · cuartos (pleno) 5.143.
    // So the model was OVERCHARGING a brand-new Literal E titular with FONASA from a job by
    // $1.144/mes, and telling them BPS had not published the number that was on BPS's page.
    // We now ramp it, from the source. (A "conservative" invention is still an invention.)
    it('ramps the FONASA-from-a-job column too — BPS publishes it (3.999 / 4.380 / 4.761 / 5.143)', () => {
      const y = (n: number) =>
        estimateCost('unipersonal-literal-e', {
          ...base,
          yearsOperating: n,
          fonasaFromJob: true,
        }).bpsMonthly
      expect(y(0)).toBe(F.bpsUnipersonalConFonasaDeEmpleoAnio1.value)
      expect(y(1)).toBe(F.bpsUnipersonalConFonasaDeEmpleoAnio2.value)
      expect(y(2)).toBe(F.bpsUnipersonalConFonasaDeEmpleoAnio3.value)
      expect(y(5)).toBe(F.bpsUnipersonalConFonasaDeEmpleo.value)
      // ...and it no longer claims BPS failed to publish it.
      const notes = estimateCost('unipersonal-literal-e', {
        ...base,
        yearsOperating: 0,
        fonasaFromJob: true,
      }).notes.join(' ')
      expect(notes).not.toMatch(/no publica una versi[óo]n/i)
    })

    // The IRAE unipersonal gets NO ramp (art. 229 cesa al entrar al régimen general de IVA),
    // so the FONASA-from-a-job titular there pays the full column at every year.
    it('gives the FONASA-from-a-job titular no ramp in IRAE (the ramp is a Literal E benefit)', () => {
      const c = estimateCost('unipersonal-irae', {
        ...base,
        yearsOperating: 0,
        fonasaFromJob: true,
      })
      expect(c.bpsMonthly).toBe(F.bpsUnipersonalConFonasaDeEmpleo.value)
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

  // ---------------------------------------------------------------------------------
  // ROUND-2 CRITICAL 1 — the SRL's BPS ignored `sociosCount` and always charged ONE socio.
  //
  // Ley 16.713 art. 172, VERBATIM: "los socios integrantes de las sociedades colectivas, de
  // responsabilidad limitada, en comandita y de capital e industria, TENGAN O NO LA CALIDAD
  // DE ADMINISTRADORES, QUE DESARROLLEN ACTIVIDAD DE CUALQUIER NATURALEZA DENTRO DE LA
  // EMPRESA, efectuarán su aportación ficta patronal ... sin que pueda ser inferior al
  // equivalente a QUINCE veces el valor de la Base Ficta de Contribución."
  //
  // Three things follow, and the model got all three wrong:
  //   1. it is PER SOCIO ("los socios ... efectuarán su aportación"), so it scales;
  //   2. the trigger is ACTIVITY, not ownership — a purely capitalist socio is outside the
  //      article entirely and pays nothing;
  //   3. so the datum the cost depends on is "how many socios WORK here", which the wizard
  //      never asked for. With 2 active socios the SRL is $12.530/mo, not $6.265 — and the
  //      ranking INVERTED: the SRL was printed as the CHEAPEST option when it is the dearest.
  // ---------------------------------------------------------------------------------
  describe('SRL BPS is per socio CON ACTIVIDAD (ROUND-2 CRITICAL 1)', () => {
    it('multiplies the 15-BFC socio figure by the socios who actually work in the company', () => {
      for (const activos of [1, 2, 3]) {
        const c = estimateCost('srl', { ...socios2, sociosCount: 3, sociosActivos: activos })
        expect(c.bpsMonthly, `${activos} socios activos`).toBe(F.bpsSocioSrl.value * activos)
        expect(c.bpsUnknown).toBe(false)
      }
    })

    // The exact probe from the review: 2 socios, bienes, $5.000.000/año. The SRL was ranked
    // #1 at $273.180/año; with both socios active it is $348.180 — the MOST expensive of the
    // three. A ranking page that inverts its ranking is worse than no page.
    it('no longer ranks the SRL cheapest by pretending it has one socio', () => {
      const input: WizardInput = {
        ...base,
        people: 'socios',
        sociosCount: 2,
        sociosActivos: 2,
        annualRevenueUyu: 5_000_000,
        sells: 'bienes',
      }
      const srl = estimateCost('srl', input)
      const sh = estimateCost('sociedad-hecho', input)
      const sas = estimateCost('sas', input)
      for (const c of [srl, sh, sas]) expect(c.totalAnnual).not.toBeNull()

      // The SRL's BPS is now the whole company's: 2 × 6.265.
      expect(srl.bpsMonthly).toBe(F.bpsSocioSrl.value * 2)
      // ...and it is no longer the cheapest of the three. It is the dearest.
      expect(srl.totalAnnual!).toBeGreaterThan(sh.totalAnnual!)
      expect(srl.totalAnnual!).toBeGreaterThan(sas.totalAnnual!)
    })

    // The heart of it: an unknown may never become a measurement. `sociedad-hecho` already
    // refused to guess; `srl` happily returned a complete $11.765. Same defect, same file.
    it('REFUSES to cost an SRL when it was never told how many socios work there', () => {
      const c = estimateCost('srl', { ...socios2, sociosActivos: undefined })
      expect(c.bpsMonthly).toBeNull()
      expect(c.bpsUnknown).toBe(true)
      expect(c.totalMonthly).toBeNull()
      expect(c.totalAnnual).toBeNull()
      expect(c.notes.join(' ')).toMatch(/16\.713|actividad/i)
    })

    it('never silently assumes ONE socio — the bug that inverted the ranking', () => {
      const unknown = estimateCost('srl', socios2)
      const oneSocio = estimateCost('srl', { ...socios2, sociosActivos: 1 })
      expect(unknown.bpsMonthly).toBeNull()
      expect(unknown.bpsMonthly).not.toBe(oneSocio.bpsMonthly)
    })

    // Art. 172 charges only socios "que desarrollen actividad". Zero active socios (an SRL run
    // by a hired manager) is a MEASURED zero, not an unknown one — and it must not be confused
    // with the unknown above.
    it('charges nothing when no socio works in the company, and knows that is not an unknown', () => {
      const c = estimateCost('srl', { ...socios2, sociosActivos: 0 })
      expect(c.bpsMonthly).toBe(0)
      expect(c.bpsUnknown).toBe(false)
      expect(c.totalAnnual).not.toBeNull()
    })

    it('cites Ley 16.713 art. 172 and explains the "con actividad" trigger', () => {
      const notes = estimateCost('srl', { ...socios2, sociosActivos: 2 }).notes.join(' ')
      expect(notes).toContain('16.713')
      expect(notes).toMatch(/actividad/i)
    })

    // The sociedad de hecho charges the SAME per-socio-con-actividad way (art. 172's first
    // limb: "personas físicas que ... ASOCIADAS O NO, ejerzan una actividad lucrativa no
    // dependiente"), so the finer datum must win there too when we have it. Its cost may not
    // disagree with the SRL's about who is being charged.
    it('lets sociosActivos refine the sociedad de hecho too, not just the SRL', () => {
      const c = estimateCost('sociedad-hecho', {
        ...base,
        people: 'socios',
        sociosCount: 3,
        sociosActivos: 2,
      })
      expect(c.bpsMonthly).toBe(F.bpsSocioSociedadHecho.value * 2)
    })
  })

  // ---------------------------------------------------------------------------------
  // ROUND-2 CRITICAL 1 (SAS half) — the audit the review asked for.
  //
  // Ley 19.820 art. 43, VERBATIM: "El administrador o quienes integren el órgano de
  // administración o, en su caso, el representante legal a los que se refieren los artículos
  // 29 y 30 ... tributarán contribuciones especiales de seguridad social conforme el régimen
  // general previsto en el ARTÍCULO 172 DE LA LEY N° 16.713" — the very same article as the
  // SRL socio. So it is per-administrador, on the same "actividad" logic.
  //
  // The review supposed "a SAS may have up to 3 administrators". THE SOURCE SAYS OTHERWISE:
  // there is NO cap of 3 anywhere in Ley 19.820. Art. 30: "La representación legal de la
  // sociedad estará a cargo de UNA O MÁS personas físicas o jurídicas, designadas en la forma
  // prevista en los estatutos." The count is whatever the estatutos say.
  //
  // But 1 IS the defensible default here, and unlike the SRL that is not a guess — it is the
  // law's OWN residual rule. Art. 29: "Salvo que otra cosa se dispusiera en los estatutos, LA
  // TOTALIDAD de las funciones de administración y representación legal le corresponderán AL
  // REPRESENTANTE LEGAL" (singular). An SRL cannot default to 1 (Ley 16.060 art. 1 forces ≥2
  // socios, so "1" is never the statutory shape); a SAS can, and does.
  // ---------------------------------------------------------------------------------
  describe('SAS BPS is per administrador (ROUND-2 CRITICAL 1, SAS half)', () => {
    it('defaults to ONE administrador — Ley 19.820 art. 29’s own residual rule — and says so', () => {
      const c = estimateCost('sas', base)
      expect(c.bpsMonthly).toBe(F.bpsAdminSas.value)
      expect(c.bpsUnknown).toBe(false)
      const notes = c.notes.join(' ')
      expect(notes).toContain('19.820')
      expect(notes).toMatch(/un solo administrador|un administrador|representante legal/i)
    })

    it('scales with the administradores when the visitor names more than one', () => {
      for (const n of [1, 2, 3]) {
        const c = estimateCost('sas', { ...base, administradoresSas: n })
        expect(c.bpsMonthly, `${n} administradores`).toBe(F.bpsAdminSas.value * n)
      }
    })

    // A mere accionista who neither administers nor represents pays nothing: Ley 16.713
    // art. 172 lists "sociedades colectivas, de responsabilidad limitada, en comandita y de
    // capital e industria" — a sociedad POR ACCIONES is not among them, and Ley 19.820 art. 43
    // reaches only the administrador/representante legal. So the SAS's BPS must NOT move with
    // the number of socios/accionistas.
    it('does NOT charge accionistas: the socio count must not move the SAS bill', () => {
      const a = estimateCost('sas', { ...base, people: 'socios', sociosCount: 2, sociosActivos: 2 })
      const b = estimateCost('sas', { ...base, people: 'socios', sociosCount: 5, sociosActivos: 5 })
      expect(a.bpsMonthly).toBe(F.bpsAdminSas.value)
      expect(b.bpsMonthly).toBe(F.bpsAdminSas.value)
      expect(estimateCost('sas', base).notes.join(' ')).toMatch(/accionista/i)
    })
  })

  // ---------------------------------------------------------------------------------
  // ROUND-2 IMPORTANT 3 — the unipersonal ignored `family`, so Literal E got a fake advantage
  // of up to $1.561/mo in the one comparison this page exists to decide.
  //
  // BPS, "Industria y Comercio" (bps.gub.uy/6665), table "Empresas unipersonales sin
  // dependientes → Aporte total del beneficiario del SNS", 1.ª categoría / 11 BFC / monto
  // gravado 20.328, VERBATIM CELLS:
  //     sin cónyuge · sin hijos (SS 15) = 8.833
  //     sin cónyuge · con hijos (SS 1)  = 9.502     (+669)
  //     con cónyuge · sin hijos (SS 17) = 9.725     (+892)
  //     con cónyuge · con hijos (SS 16) = 10.394    (+1.561)
  // The deltas are IDENTICAL to the monotributo ones (6.327 → 6.996 / 7.219 / 7.888), which is
  // what confirms the mapping: it is the same FONASA supplement in both tables.
  // ---------------------------------------------------------------------------------
  describe('unipersonal BPS honours the family column (ROUND-2 IMPORTANT 3)', () => {
    const cases = [
      { family: 'solo', pleno: F.bpsUnipersonalPleno },
      { family: 'con-hijos', pleno: F.bpsUnipersonalPlenoHijos },
      { family: 'con-conyuge', pleno: F.bpsUnipersonalPlenoConyuge },
      { family: 'con-conyuge-e-hijos', pleno: F.bpsUnipersonalPlenoConyugeHijos },
    ] as const

    it('selects the family column in the full regime, for BOTH unipersonal regimes', () => {
      for (const { family, pleno } of cases) {
        for (const id of ['unipersonal-literal-e', 'unipersonal-irae'] as const) {
          const c = estimateCost(id, { ...base, family, yearsOperating: 5 })
          expect(c.bpsMonthly, `${id} ${family}`).toBe(pleno.value)
        }
      }
    })

    it('matches the BPS deltas exactly: +669 con hijos, +892 con cónyuge, +1.561 con ambos', () => {
      const at = (family: WizardInput['family']) =>
        estimateCost('unipersonal-literal-e', { ...base, family, yearsOperating: 5 }).bpsMonthly!
      const solo = at('solo')
      expect(at('con-hijos') - solo).toBe(669)
      expect(at('con-conyuge') - solo).toBe(892)
      expect(at('con-conyuge-e-hijos') - solo).toBe(1561)
    })

    // BPS's Ley 19.889 gradual page (bps.gub.uy/17829) publishes all four family columns in
    // all four year tables — so there was nothing to derive here either, and no reason to push
    // a "BPS does not publish this" note. 1.ª cat / 11 BFC, sin cónyuge·sin hijos → con
    // cónyuge·con hijos:  año 1  7.689 → 9.250 · año 2  8.070 → 9.631 · año 3  8.451 → 10.012.
    it('honours the family column DURING the Ley 19.889 ramp too, not just at the end of it', () => {
      const y = (family: WizardInput['family'], n: number) =>
        estimateCost('unipersonal-literal-e', { ...base, family, yearsOperating: n }).bpsMonthly
      expect(y('solo', 0)).toBe(F.bpsUnipersonalAnio1.value)
      expect(y('con-conyuge-e-hijos', 0)).toBe(F.bpsUnipersonalAnio1ConyugeHijos.value)
      expect(y('con-hijos', 1)).toBe(F.bpsUnipersonalAnio2Hijos.value)
      expect(y('con-conyuge', 2)).toBe(F.bpsUnipersonalAnio3Conyuge.value)
      // The +1.561 supplement is present in every single year of the ramp.
      for (const n of [0, 1, 2, 5]) {
        expect(y('con-conyuge-e-hijos', n)! - y('solo', n)!, `año ${n}`).toBe(1561)
      }
    })

    // THE BUG, stated as the page's own central head-to-head: monotributo was made to rise
    // with the family while Literal E was not, so Literal E pocketed an artificial advantage
    // of up to $1.561/mo for every visitor with a family.
    it('does not hand Literal E a fake advantage over monotributo for a visitor with a family', () => {
      const familyGap = (id: RegimeId) => {
        const solo = estimateCost(id, { ...base, family: 'solo', yearsOperating: 5 }).bpsMonthly!
        const con = estimateCost(id, {
          ...base,
          family: 'con-conyuge-e-hijos',
          yearsOperating: 5,
        }).bpsMonthly!
        return con - solo
      }
      // Both regimes must move by the SAME published FONASA supplement. Before the fix,
      // monotributo moved by 1.561 and Literal E moved by 0.
      expect(familyGap('monotributo')).toBe(1561)
      expect(familyGap('unipersonal-literal-e')).toBe(1561)
      expect(familyGap('unipersonal-literal-e')).toBe(familyGap('monotributo'))
    })

    // The SAS administrator sits in the SAME BPS table, 2.ª categoría (15 BFC), and carries
    // the SAME four columns: 10.504 / 11.173 / 11.396 / 12.065. It ignored `family` too — the
    // identical defect, one regime over. Ley 19.820 art. 43 in fine confirms the SAS
    // administrator is "incorporado al Seguro Nacional de Salud", so the FONASA columns apply.
    it('applies the same four family columns to the SAS administrator', () => {
      const at = (family: WizardInput['family']) =>
        estimateCost('sas', { ...base, family }).bpsMonthly!
      expect(at('solo')).toBe(F.bpsAdminSas.value)
      expect(at('con-hijos')).toBe(F.bpsAdminSasHijos.value)
      expect(at('con-conyuge')).toBe(F.bpsAdminSasConyuge.value)
      expect(at('con-conyuge-e-hijos')).toBe(F.bpsAdminSasConyugeHijos.value)
      // Same published supplement as every other FONASA-bearing owner contribution.
      expect(at('con-conyuge-e-hijos') - at('solo')).toBe(1561)
    })

    // The socio of an SRL / sociedad de hecho is expressly NOT a FONASA beneficiary by this
    // activity (BPS's "No beneficiario del SNS" table, which has no family columns at all), so
    // these two must NOT move with the family. A regime that moved here would be inventing a
    // column BPS does not publish.
    it('does NOT move the non-FONASA socio figures with the family', () => {
      for (const id of ['srl', 'sociedad-hecho'] as const) {
        const solo = estimateCost(id, { ...socios2, sociosActivos: 2, family: 'solo' }).bpsMonthly
        const con = estimateCost(id, {
          ...socios2,
          sociosActivos: 2,
          family: 'con-conyuge-e-hijos',
        }).bpsMonthly
        expect(con, `${id} must not invent a FONASA column`).toBe(solo)
      }
    })
  })

  // ---------------------------------------------------------------------------------
  // ROUND-2 CRITICAL 2 — the CJPPU "unknown" leaked out through the neighbouring regimes.
  //
  // `irpf-servicios` correctly REFUSED to total a CJPPU professional. Then the very next
  // regime handed the same person a complete, cheaper-looking total whose BPS component is an
  // 11-BFC jubilatorio they do not pay to BPS at all.
  //
  // Ley 17.738 art. 43, VERBATIM: "Quedan personal y obligatoriamente sujetos al régimen
  // establecido en la presente ley, los profesionales universitarios que ejerzan en el país en
  // forma libre EN NOMBRE PROPIO y para terceros ... El ejercicio de la profesión para terceros
  // puede ser individual o, repartiéndose los beneficios que de ello provengan, EN SOCIEDAD con
  // otros profesionales o no profesionales ... SIN PERJUICIO DE LAS AFILIACIONES A OTROS
  // INSTITUTOS DE SEGURIDAD SOCIAL QUE PUDIERAN CORRESPONDER."
  //
  // That last clause is why we refuse rather than guess in EITHER direction: the law expressly
  // contemplates that BPS may ALSO be owed on top of the CJPPU, and it does not say when. An
  // empresa unipersonal has no separate legal personality, so it is still "nombre propio" —
  // squarely inside art. 43. Whether BPS's 11-BFC ficto rides along on top is genuinely
  // unsettled, and the CJPPU does not publish its scale. Two unknowns, one honest answer.
  // ---------------------------------------------------------------------------------
  describe('the CJPPU unknown does not leak into the neighbouring regimes (ROUND-2 CRITICAL 2)', () => {
    const cjppu: WizardInput = { ...base, sells: 'servicios', cajaProfesional: true }

    it('refuses to total EVERY regime that charges an owner contribution, not just IRPF', () => {
      for (const id of [
        'irpf-servicios',
        'unipersonal-literal-e',
        'unipersonal-irae',
        'sociedad-hecho',
        'srl',
        'sas',
      ] as const) {
        const c = estimateCost(id, { ...cjppu, sociosCount: 2, sociosActivos: 2 })
        expect(c.bpsMonthly, `${id} must not print a BPS figure`).toBeNull()
        expect(c.bpsUnknown, `${id} must flag the unknown`).toBe(true)
        expect(c.totalMonthly, `${id} must not present a total`).toBeNull()
        expect(c.totalAnnual, `${id} must not present a total`).toBeNull()
        expect(c.notes.join(' '), `${id} must point at the CJPPU`).toContain('CJPPU')
      }
    })

    // THE BUG, exactly as reported: irpf-servicios said null, and unipersonal-irae and the SAS
    // handed the same person a complete — and cheaper-looking — number.
    it('never lets one regime refuse while a neighbour answers, for the SAME person', () => {
      const refused = estimateCost('irpf-servicios', cjppu)
      expect(refused.totalAnnual).toBeNull()
      for (const id of ['unipersonal-irae', 'sas'] as const) {
        expect(estimateCost(id, cjppu).totalAnnual, `${id} answered where IRPF refused`).toBeNull()
      }
    })

    // A CJPPU professional selling only BIENES is not exercising the profession through the
    // company, so the CJPPU is not in play and BPS is knowable as usual. The refusal must be
    // scoped to the activity that triggers it — not smeared across every input.
    it('does not fire for a CJPPU title-holder whose business only sells bienes', () => {
      const bienes: WizardInput = { ...base, sells: 'bienes', cajaProfesional: true }
      const c = estimateCost('unipersonal-literal-e', bienes)
      expect(c.bpsUnknown).toBe(false)
      expect(c.bpsMonthly).toBe(F.bpsUnipersonalPleno.value)
      expect(c.totalAnnual).not.toBeNull()
    })

    it('is honest that it cannot resolve the question, in either direction', () => {
      const notes = estimateCost('unipersonal-irae', cjppu).notes.join(' ')
      expect(notes).toContain('CJPPU')
      // It must NOT claim to know the answer — it must send them to the Caja.
      expect(notes).toMatch(/no podemos|no está resuelto|consultá|consulta/i)
    })
  })

  // ---------------------------------------------------------------------------------
  // THE STRUCTURAL INVARIANT THIS ROUND IS ABOUT.
  //
  // Every defect in this review was the same shape: a datum that one regime honours and its
  // neighbour silently ignores. Because the page RANKS regimes against each other, that is
  // not a local error — it reorders the answer. So the invariant is cross-regime, and it is
  // stated over the whole set at once rather than regime by regime:
  //
  //   For a given input, if ANY elegible regime reports `bpsUnknown` because of some datum,
  //   then NO elegible regime whose BPS depends on THAT SAME datum may present a complete
  //   total. An unknown may not be fatal to one regime and free for its neighbour.
  //
  // Implemented as a MUTATION property, so it cannot be satisfied by hardcoding: if supplying
  // a datum CHANGES a regime's total, then that regime demonstrably depends on it — and it
  // must therefore refuse to total when the datum is absent. "If the answer moves with the
  // fact, you may not answer without the fact."
  // ---------------------------------------------------------------------------------
  describe('cross-regime invariant: no regime answers with a datum its neighbour needed', () => {
    /**
     * A datum the wizard must collect, with two values that a regime depending on it would
     * price DIFFERENTLY, plus the context in which the datum is meaningful at all.
     *
     * `family` is deliberately NOT here, and the distinction is the whole point of this round:
     * `family: undefined → 'solo'` is a legitimate DEFAULT (a real, modal situation) applied
     * UNIFORMLY to every regime that has family columns, so it cannot distort the ranking —
     * every regime moves together. `sociosActivos: undefined → 1` was a SENTINEL pretending to
     * be a measurement, applied to ONE regime, and it inverted the ranking. A default is fine;
     * a default that only some regimes honour is the bug.
     */
    /**
     * A regime is allowed to answer WITHOUT a datum in exactly two situations, and neither of
     * them is "we picked something plausible". Anything else must return `bpsUnknown` + a null
     * total. Every entry below names the norm that licenses it — an unjustified entry here is
     * the bug this whole round is about, wearing a permission slip.
     *
     *   ENTAILED — the regime's own legal structure FIXES the value, so there is nothing to
     *   guess. It must also be the CONSERVATIVE (maximal) reading, asserted below: a default
     *   that could understate is never an entailment, it is a wish.
     *
     *   STATUTORY — the NORM supplies the residual value itself. It need not be conservative,
     *   because it is not our number: it is the law's.
     */
    const ENTAILED = {
      sociosActivos: {
        monotributo:
          'Ley 18.083 art. 70 lits. B y C: la sociedad de hecho monotributista es "sin dependientes". Sin empleados, alguien tiene que hacer el trabajo — y solo están los socios. sociosActivos ≡ sociosCount por entailment, no por conveniencia.',
        'sociedad-hecho':
          'BPS publica esta cifra en su tabla "Sociedad de hecho SIN DEPENDIENTES", indexada por una columna "Cant. socios": dentro del alcance de esa tabla, todos los socios trabajan.',
      },
    } as const

    const STATUTORY = {
      administradoresSas: {
        sas: 'Ley 19.820 art. 29: "Salvo que otra cosa se dispusiera en los estatutos, la TOTALIDAD de las funciones de administración y representación legal le corresponderán AL REPRESENTANTE LEGAL" (singular). Uno es la forma estatutaria por defecto de una SAS — es la regla de la norma, no nuestra suposición. La SRL no tiene nada equivalente: la Ley 16.060 art. 1 la obliga a ≥2 socios, así que "1" nunca es su forma por defecto.',
      },
    } as const

    const PROBES = [
      {
        datum: 'sociosActivos',
        context: {
          people: 'socios',
          sociosCount: 3,
          sociosFamiliares: true,
        } as Partial<WizardInput>,
        // Ascending, so the LAST one is the maximal (most conservative) reading.
        values: [1, 2, 3].map(n => ({ sociosActivos: n }) as Partial<WizardInput>),
      },
      {
        datum: 'sociosCount',
        context: { people: 'socios' } as Partial<WizardInput>,
        values: [
          { sociosCount: 2, sociosActivos: 2 },
          { sociosCount: 3, sociosActivos: 3, sociosFamiliares: true },
        ] as Partial<WizardInput>[],
      },
      {
        datum: 'administradoresSas',
        context: {} as Partial<WizardInput>,
        values: [1, 2, 3].map(n => ({ administradoresSas: n }) as Partial<WizardInput>),
      },
    ] as const

    it('refuses to total any regime whose answer would MOVE with a datum it was not given', () => {
      let sawADependency = false
      for (const { datum, context, values } of PROBES) {
        const entailed: Record<string, string> = ENTAILED[datum as keyof typeof ENTAILED] ?? {}
        const statutory: Record<string, string> = STATUTORY[datum as keyof typeof STATUTORY] ?? {}

        for (const id of ALL_REGIMES) {
          const costs = values.map(v => estimateCost(id, { ...base, ...context, ...v }))
          const bpsValues = costs.map(c => c.bpsMonthly)
          // Does this regime's answer demonstrably depend on the datum? If it does not, it has
          // nothing to refuse and nothing to explain.
          const dependsOnDatum = new Set(bpsValues).size > 1
          if (!dependsOnDatum) continue
          sawADependency = true

          const without = estimateCost(id, { ...base, ...context })

          if (id in entailed) {
            // Licensed to answer — but ONLY with the maximal reading. A default that could
            // understate is exactly the bug (assuming 1 socio) with better paperwork.
            const maximal = bpsValues[bpsValues.length - 1]
            expect(
              without.bpsMonthly,
              `${id} defaults "${datum}", which is only legitimate because: ${entailed[id]!} — and a legitimate default must be the CONSERVATIVE reading, never an understatement.`
            ).toBe(maximal)
            expect(without.bpsUnknown, `${id}`).toBe(false)
            continue
          }

          if (id in statutory) {
            // Licensed to answer with the NORM's own residual value (not necessarily maximal).
            expect(
              without.bpsMonthly,
              `${id} defaults "${datum}" to the statutory residual: ${statutory[id]!}`
            ).toBe(bpsValues[0])
            expect(without.bpsUnknown, `${id}`).toBe(false)
            continue
          }

          // Everyone else: if the answer moves with the fact, you may not answer without it.
          expect(
            without.totalAnnual,
            `${id} priced itself without "${datum}", a datum its own answer demonstrably depends on, and it has no entailment or statutory default licensing that. This is the CRITICAL 1 bug (the SRL silently assuming ONE socio) — it inverted the ranking.`
          ).toBeNull()
          expect(without.bpsUnknown, `${id} must FLAG the missing "${datum}"`).toBe(true)
          expect(without.notes.length, `${id} must explain the missing "${datum}"`).toBeGreaterThan(
            0
          )
        }
      }
      // Guard the guard: if no regime depended on any probed datum, the whole thing ran
      // vacuously and would keep passing after someone deleted the per-socio logic.
      expect(
        sawADependency,
        'no regime depended on any probed datum — the check ran vacuously'
      ).toBe(true)
    })

    // The SRL is the regime that had the bug, so pin its refusal directly rather than relying
    // on the loop above to keep covering it.
    it('the SRL specifically may never default sociosActivos — it has no entailment to lean on', () => {
      const input: WizardInput = { ...base, people: 'socios', sociosCount: 2 }
      expect(estimateCost('srl', input).bpsUnknown).toBe(true)
      expect(estimateCost('srl', input).totalAnnual).toBeNull()
      // ...whereas its two neighbours legitimately CAN, because "sin dependientes" entails it.
      expect(estimateCost('sociedad-hecho', input).bpsMonthly).toBe(
        F.bpsSocioSociedadHecho.value * 2
      )
      expect(estimateCost('monotributo', input).bpsMonthly).toBe(F.monoSocioSociedadHecho.value * 2)
    })

    // The same claim from the other end: for any single input, the set of ELEGIBLE regimes may
    // not be split into "refuses to answer" and "answers cheaply" over the same missing fact.
    it('never presents a complete total beside an elegible neighbour blocked by the same unknown', () => {
      const inputs: WizardInput[] = [
        // The CJPPU professional: irpf-servicios refused, unipersonal-irae and sas answered.
        { ...base, sells: 'servicios', cajaProfesional: true },
        { ...base, sells: 'ambos', cajaProfesional: true },
        { ...base, sells: 'servicios', cajaProfesional: true, people: 'socios', sociosCount: 2 },
      ]
      for (const input of inputs) {
        const elegibles = applyGates(input)
          .filter(g => g.status === 'elegible')
          .map(g => ({ id: g.regime, cost: estimateCost(g.regime, input) }))
        // At least one regime must be blocked by the CJPPU — otherwise this runs vacuously.
        expect(
          elegibles.some(e => e.cost.bpsUnknown),
          'no regime saw the CJPPU'
        ).toBe(true)
        for (const { id, cost } of elegibles) {
          expect(
            cost.totalAnnual,
            `${id} presented a complete total while a neighbour was blocked by the CJPPU`
          ).toBeNull()
        }
      }
    })
  })

  // The old monotonicity test capped at 3.000.000 and covered 4 of 9 regimes — which is
  // exactly why the flat-12% IRAE ficto (whose first tramo boundary is at ≈ $6.615.000)
  // slipped through. It now runs well past every tramo boundary AND the UI 4.000.000 tope,
  // across every regime, in both the solo and the socios shape.
  it('is monotonically non-decreasing in revenue for EVERY regime, past every tramo boundary', () => {
    const shapes: WizardInput[] = [
      { ...base, sells: 'servicios' },
      // The socios shape now supplies `sociosActivos` — the datum Ley 16.713 art. 172 makes
      // the per-socio BPS depend on. Without it the SRL and the sociedad de hecho legitimately
      // refuse to cost themselves (CRITICAL 1), which is exactly what the `uncostable` guard
      // below encodes.
      { ...socios2, sells: 'servicios', sociosActivos: 2 },
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
        // Guard the guard: a regime that returns null everywhere would pass vacuously. Some
        // legitimately do — the SA (never costable: contabilidad suficiente), and the two
        // per-socio regimes when we were told neither how many socios there are nor how many
        // of them work in the company.
        const perSocio = id === 'sociedad-hecho' || id === 'srl'
        const noSocioData = !shape.sociosActivos && !shape.sociosCount
        const uncostable = id === 'sa' || (perSocio && noSocioData)
        if (!uncostable) {
          expect(sawNumber, `${id} produced no costable point — the check ran vacuously`).toBe(true)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------------------
// The lockout alert ratio ("how close to the ceiling counts as CLOSE?") is a PRODUCT
// threshold, not a legal figure. No norm defines it — Dto. 199/007 art. 14 has no concept of
// "cerca del tope" — so it has no primary source and must NOT go into FIGURES, whose test
// rightly demands a bps/dgi/gub.uy/impo/ine/bcu URL. Inventing one would be exactly the
// defect IMPORTANT 7 caught: provenance as costume.
//
// It is not a market PRICE either, so it does not belong in MARKET_ESTIMATES. It gets its own
// `est()`-built home, which the AST guard approves STRUCTURALLY (isInsideEstCall) and which
// tells the reader the truth about itself: unsourced, with a rationale, by design.
// ---------------------------------------------------------------------------------------
describe('PRODUCT_THRESHOLDS', () => {
  it('is an editorial choice with provenance — never a legal figure, never a market price', () => {
    const entries = Object.entries(PRODUCT_THRESHOLDS)
    expect(entries.length).toBeGreaterThan(0)
    for (const [key, e] of entries) {
      expect(typeof e.value, `PRODUCT_THRESHOLDS.${key}.value`).toBe('number')
      expect(e.label.length, `PRODUCT_THRESHOLDS.${key}.label`).toBeGreaterThan(0)
      expect(e.unsourced, `PRODUCT_THRESHOLDS.${key} must be flagged unsourced`).toBe(true)
      expect(e.rationale.length, `PRODUCT_THRESHOLDS.${key}.rationale`).toBeGreaterThan(0)
      // It must not be able to pass as a verified figure anywhere that renders "Fuentes"...
      expect(isFigure(e), `PRODUCT_THRESHOLDS.${key} must not masquerade as a Figure`).toBe(false)
      expect(key in FIGURES, `PRODUCT_THRESHOLDS.${key} must not also be in FIGURES`).toBe(false)
      // ...nor as a market price, which is a different (and equally specific) claim.
      expect(key in MARKET_ESTIMATES, `PRODUCT_THRESHOLDS.${key} is not a market price`).toBe(false)
    }
  })

  it('keeps the lockout alert ratio a strict fraction of the ceiling', () => {
    const r = PRODUCT_THRESHOLDS.lockoutAlertRatio.value
    expect(r).toBeGreaterThan(0)
    expect(r).toBeLessThan(1)
  })
})

// =======================================================================================
// evaluate() — THE VERDICT
//
// Gates first, cost second. The two rules everything else hangs off:
//
//   1. A regime the visitor may not legally use is never recommended. It is not "more
//      expensive" — it is illegal, and it has no price at all.
//   2. A regime whose cost we could not COMPLETE is never recommended and never compared by
//      price. `estimateCost` signals that with `bpsUnknown`/`taxUnknown` and a null total;
//      a ranker that coalesced either into a number would tell a CJPPU professional that the
//      freelance path is FREE and beats everything (CRITICAL 1, one layer up).
// =======================================================================================
describe('evaluate', () => {
  const shop: WizardInput = {
    annualRevenueUyu: 600_000,
    sells: 'bienes',
    clients: 'consumidor-final',
    people: 'solo',
    employees: 0,
    needsLimitedLiability: false,
    otherCompanyRole: false,
    yearsOperating: 0,
    family: 'solo',
  }

  const recOf = (v: Verdict) =>
    v.recommended === null ? null : v.ranked.find(r => r.regime === v.recommended)!

  /**
   * A coarse cartesian sweep of the wizard's answer space. The invariants below are not
   * "true for the inputs we thought of" — they must be true for ALL of them, because the
   * page will be handed all of them. Evaluated ONCE and shared: `evaluate` is pure.
   */
  const GRID: WizardInput[] = (() => {
    const out: WizardInput[] = []
    const extras: Partial<WizardInput>[] = [
      {},
      { cajaProfesional: true },
      { needsLimitedLiability: true },
      { midesEligible: true },
      { sociosCount: 2, sociosActivos: 2 },
      { sociosCount: 3, sociosFamiliares: true, sociosActivos: 1 },
      { employees: 2 },
      { eFactura: true, yearsOperating: 3 },
      { fonasaFromJob: true, family: 'con-conyuge-e-hijos' },
      { administradoresSas: 3, otherCompanyRole: true },
    ]
    for (const sells of ['bienes', 'servicios', 'ambos'] as const) {
      for (const clients of ['consumidor-final', 'empresas', 'exterior', 'mixto'] as const) {
        for (const people of ['solo', 'conyuge', 'socios'] as const) {
          for (const annualRevenueUyu of [
            0, 600_000, 1_150_000, 2_500_000, 12_000_000, 50_000_000,
          ]) {
            for (const extra of extras) {
              out.push({ ...shop, sells, clients, people, annualRevenueUyu, ...extra })
            }
          }
        }
      }
    }
    return out
  })()

  const VERDICTS = GRID.map(input => ({ input, v: evaluate(input) }))

  it('recommends monotributo to a small shop selling to consumers', () => {
    expect(evaluate(shop).recommended).toBe('monotributo')
  })

  it('ranks every regime exactly once, and prices none it ruled illegal', () => {
    const v = evaluate(shop)
    expect(v.ranked.length).toBe(REGIMES.length)
    expect(new Set(v.ranked.map(r => r.regime)).size).toBe(REGIMES.length)
    for (const r of v.ranked) {
      if (r.status !== 'excluido') continue
      expect(r.reasons.length, `${r.regime} must explain its exclusion`).toBeGreaterThan(0)
      // A regime you may not use has no price. Pricing it would invite exactly the
      // comparison the gates exist to forbid.
      expect(r.cost, `${r.regime} is illegal here — it must not carry a price`).toBeNull()
      expect(r.comparable, r.regime).toBe(false)
    }
  })

  // ---------------------------------------------------------------------------------
  // RULE 1 — the gates outrank the price, always.
  // ---------------------------------------------------------------------------------
  it('never recommends an EXCLUIDO regime, for ANY input', () => {
    for (const { input, v } of VERDICTS) {
      const rec = recOf(v)
      if (rec === null) continue
      expect(
        rec.status,
        `recommended ${String(v.recommended)} for ${JSON.stringify(input)}`
      ).not.toBe('excluido')
    }
  })

  it('recommends the cheapest ELIGIBLE regime, not the cheapest overall', () => {
    // Servicios personales sold to empresas: monotributo would be far and away the cheapest
    // (Ley 18.083 art. 72 lit. C excludes it, and art. 71 lit. D excludes the clientele too).
    const input: WizardInput = { ...shop, sells: 'servicios', clients: 'empresas' }
    const v = evaluate(input)
    expect(v.recommended).not.toBe('monotributo')
    expect(v.ranked.find(r => r.regime === 'monotributo')!.status).toBe('excluido')

    // ...and it really WOULD have been cheaper. That is the point: it is not rejected for
    // being expensive, it is rejected for being illegal.
    const rec = recOf(v)!
    const illegalButCheaper = estimateCost('monotributo', input).totalAnnual!
    expect(illegalButCheaper).toBeLessThan(rec.cost!.totalAnnual!)
  })

  it('always recommends the cheapest COMPARABLE regime — and prefers ELEGIBLE over DUDOSO at the same price', () => {
    for (const { v } of VERDICTS) {
      const prices = v.ranked.filter(r => r.comparable).map(r => r.cost!.totalAnnual!)
      if (prices.length === 0) {
        expect(v.recommended, 'nothing comparable ⇒ nothing to recommend').toBeNull()
        continue
      }
      const min = Math.min(...prices)
      const rec = recOf(v)!
      expect(rec.cost!.totalAnnual!).toBe(min)
      const atMin = v.ranked.filter(r => r.comparable && r.cost!.totalAnnual === min)
      if (atMin.some(r => r.status === 'elegible')) expect(rec.status).toBe('elegible')
    }
  })

  // ---------------------------------------------------------------------------------
  // RULE 2 — an incomplete cost is not a cheap cost. It is not a cost at all.
  //
  // `estimateCost` was made to return `null` totals (never 0) precisely so a ranker could
  // not launder "we cannot know this" into "this is free". This is the layer that had to
  // actually honour that, and these are the four shapes of un-costable regime it must face.
  // ---------------------------------------------------------------------------------
  describe('an incomplete cost is never ranked (CRITICAL 1, at the verdict level)', () => {
    const cjppu: WizardInput = { ...shop, sells: 'servicios', cajaProfesional: true }

    it('never recommends the CJPPU professional a regime whose BPS it cannot compute', () => {
      const v = evaluate(cjppu)
      // Every regime this person may legally use charges an owner contribution whose scale
      // the CJPPU does not publish. There is no honest recommendation — and SAYING SO is the
      // answer, not a failure. (The bug this replaces: `totalMonthly: 0` ⇒ "the freelance
      // path costs nothing and beats every alternative".)
      expect(v.recommended).toBeNull()
      expect(v.noRecommendation).toBeTruthy()
      expect(v.ranked.some(r => r.costIncomplete)).toBe(true)
    })

    it('still SHOWS the CJPPU regimes — with their status, their reasons, and an honest "we cannot cost this"', () => {
      const irpf = evaluate(cjppu).ranked.find(r => r.regime === 'irpf-servicios')!
      expect(irpf.status).not.toBe('excluido')
      expect(irpf.cost).not.toBeNull()
      expect(irpf.cost!.totalAnnual).toBeNull()
      expect(irpf.cost!.bpsUnknown).toBe(true)
      expect(irpf.costIncomplete).toBe(true)
      expect(irpf.comparable).toBe(false)
      expect(irpf.cannotCost.length).toBeGreaterThan(0)
      expect(irpf.cannotCost.join(' ')).toContain('CJPPU')
      // The part we DO know is still shown — as a floor, never as a total.
      expect(irpf.cost!.knownPartialMonthly).toBeGreaterThanOrEqual(0)
    })

    it('never recommends the SA: it can NEVER be costed (Dto. 150/007 art. 168 lit. a)', () => {
      for (const { v } of VERDICTS) {
        expect(
          v.recommended,
          'an SA can never use the IRAE ficto, so it can never be priced'
        ).not.toBe('sa')
        const sa = v.ranked.find(r => r.regime === 'sa')!
        if (sa.status === 'excluido') continue
        expect(sa.comparable, 'the SA is legally open here but still not comparable').toBe(false)
        expect(sa.cannotCost.join(' ')).toContain('contabilidad suficiente')
      }
    })

    it('never recommends an SRL whose active-socio count it was never told', () => {
      const v = evaluate({ ...shop, people: 'socios', sociosCount: 2 })
      const srl = v.ranked.find(r => r.regime === 'srl')!
      expect(srl.status).toBe('elegible') // perfectly legal...
      expect(srl.comparable).toBe(false) // ...and still not comparable
      expect(v.recommended).not.toBe('srl')
      // ...and it names the datum it is missing, and the norm that makes it decisive.
      expect(srl.cannotCost.join(' ')).toMatch(/socios/i)
      expect(srl.cannotCost.join(' ')).toContain('16.713')
    })

    it('prices nothing above the IRAE ficto’s legal range (UI 4.000.000)', () => {
      const v = evaluate({
        ...shop,
        annualRevenueUyu: 50_000_000,
        people: 'socios',
        sociosCount: 2,
        sociosActivos: 2,
      })
      for (const id of ['unipersonal-irae', 'sociedad-hecho', 'srl', 'sas', 'sa'] as const) {
        const r = v.ranked.find(x => x.regime === id)!
        if (r.status === 'excluido') continue
        expect(r.comparable, id).toBe(false)
        expect(r.cannotCost.join(' '), id).toContain('contabilidad suficiente')
      }
      expect(v.recommended).toBeNull()
      expect(v.noRecommendation).toBeTruthy()
    })

    // The invariant, over the whole answer space: nullness of the total, the `costIncomplete`
    // flag and `comparable` move in lockstep — and the recommendation never touches an
    // incomplete one. No `?? 0`, no `?? Infinity`, anywhere.
    it('never compares an incomplete cost by price, for ANY input', () => {
      let sawIncomplete = false
      for (const { v } of VERDICTS) {
        for (const r of v.ranked) {
          if (r.cost === null) {
            expect(r.status, `${r.regime} has no cost but is not excluido`).toBe('excluido')
            expect(r.comparable, r.regime).toBe(false)
            continue
          }
          const incomplete = r.cost.bpsUnknown || r.cost.taxUnknown
          expect(r.costIncomplete, r.regime).toBe(incomplete)
          expect(r.comparable, r.regime).toBe(!incomplete)
          expect(r.cost.totalAnnual === null, r.regime).toBe(incomplete)
          if (!incomplete) {
            expect(r.cannotCost, `${r.regime} can be costed — it has nothing to excuse`).toEqual([])
            continue
          }
          sawIncomplete = true
          expect(v.recommended, `${r.regime} was recommended with an incomplete cost`).not.toBe(
            r.regime
          )
          expect(
            r.cannotCost.length,
            `${r.regime} must say why it cannot be costed`
          ).toBeGreaterThan(0)
          expect(r.cost.notes.length, `${r.regime} must explain itself`).toBeGreaterThan(0)
        }
      }
      // Guard the guard: if nothing was ever incomplete, this ran vacuously.
      expect(sawIncomplete, 'no incomplete cost appeared — the check ran vacuously').toBe(true)
    })
  })

  // ---------------------------------------------------------------------------------
  // The warnings are the point of the page, not decoration: they carry what changes the
  // decision but never shows up in the monthly number.
  // ---------------------------------------------------------------------------------
  describe('warnings', () => {
    it('warns about the 3-year lockout when revenue is close to the ceiling', () => {
      const v = evaluate({ ...shop, annualRevenueUyu: 1_150_000 }) // 98% of the mono ceiling
      expect(v.recommended).toBe('monotributo')
      const w = v.warnings.find(x => x.kind === 'lockout')
      expect(w).toBeDefined()
      expect(w!.text).toContain('3')
      expect(w!.url).toContain('impo.com.uy')
      expect(w!.norm!.length).toBeGreaterThan(0)
    })

    it('does not warn about the lockout when revenue is far from the ceiling', () => {
      const v = evaluate({ ...shop, annualRevenueUyu: 300_000 })
      expect(v.warnings.find(x => x.kind === 'lockout')).toBeUndefined()
    })

    // The threshold is the PUBLISHED one, not a second copy of it hidden in the ranker.
    it('fires the lockout warning exactly at the published alert ratio', () => {
      const tope = F.topeMonotributoUnipersonalUyu.value
      const ratio = PRODUCT_THRESHOLDS.lockoutAlertRatio.value
      const warned = (rev: number) =>
        evaluate({ ...shop, annualRevenueUyu: Math.round(rev) }).warnings.some(
          w => w.kind === 'lockout'
        )
      expect(warned(tope * ratio + 1000)).toBe(true)
      expect(warned(tope * ratio - 1000)).toBe(false)
    })

    it('warns about unlimited liability, citing the Código Civil for a persona física', () => {
      const w = evaluate(shop).warnings.find(x => x.kind === 'liability')
      expect(w).toBeDefined()
      // A monotributista is a PERSONA FÍSICA, not a sociedad: the prenda general of Código
      // Civil art. 2372, NOT Ley 16.060 art. 39 (which governs sociedades).
      expect(w!.norm).toContain('2372')
      expect(w!.norm).not.toContain('16.060')
      expect(w!.url).toContain('2372')
    })

    it('cites Ley 16.060 art. 39 instead when the recommendation IS a sociedad', () => {
      const v = evaluate({
        ...shop,
        people: 'socios',
        sociosCount: 2,
        sociosActivos: 2,
        annualRevenueUyu: 5_000_000,
      })
      expect(v.recommended).toBe('sociedad-hecho')
      const w = v.warnings.find(x => x.kind === 'liability')!
      expect(w.norm).toContain('16.060')
      expect(w.norm).toContain('39')
      expect(w.text).toMatch(/solidar/i)
    })

    it('does not warn about liability when the recommendation has limited liability', () => {
      const v = evaluate({ ...shop, needsLimitedLiability: true })
      expect(v.recommended).toBe('sas')
      expect(v.warnings.find(x => x.kind === 'liability')).toBeUndefined()
    })

    it('surfaces the Literal E grey zone as a warning for a freelancer', () => {
      const v = evaluate({ ...shop, sells: 'servicios', clients: 'exterior' })
      expect(v.recommended).toBe('unipersonal-literal-e')
      const w = v.warnings.find(x => x.kind === 'grey-zone')
      expect(w).toBeDefined()
      expect(w!.url).toContain('4761')
    })

    it('surfaces EVERY dudoso reason of the recommended regime, and no other regime’s', () => {
      const v = evaluate({ ...shop, sells: 'servicios', clients: 'exterior' })
      const rec = recOf(v)!
      const greys = v.warnings.filter(w => w.kind === 'grey-zone')
      expect(greys.length).toBe(rec.reasons.filter(r => r.status === 'dudoso').length)
      expect(greys.length).toBeGreaterThan(0)
      for (const w of greys) {
        expect(
          rec.reasons.some(r => r.status === 'dudoso' && r.text === w.text),
          w.text
        ).toBe(true)
      }
    })

    it('warns about nothing when there is nothing to recommend', () => {
      const v = evaluate({ ...shop, sells: 'servicios', cajaProfesional: true })
      expect(v.recommended).toBeNull()
      expect(v.warnings).toEqual([])
    })

    it('never warns about a regime it did not recommend, for ANY input', () => {
      for (const { v } of VERDICTS) {
        if (v.recommended !== null) continue
        expect(v.warnings, 'no recommendation ⇒ nothing to warn about').toEqual([])
      }
    })

    it('always cites a norm and a URL on every warning', () => {
      for (const { v } of VERDICTS) {
        for (const w of v.warnings) {
          expect(w.text.length).toBeGreaterThan(0)
          expect(w.norm!.length, `${w.kind} must cite a norm`).toBeGreaterThan(0)
          expect(w.url, `${w.kind} must link the norm`).toMatch(/^https:\/\//)
        }
      }
    })
  })

  it('gives a reason whenever it declines to recommend anything — and none when it does', () => {
    for (const { v } of VERDICTS) {
      expect(v.noRecommendation === null).toBe(v.recommended !== null)
      if (v.noRecommendation !== null) expect(v.noRecommendation.length).toBeGreaterThan(0)
    }
  })

  it('passes the accountant fee through to the cost model', () => {
    const v = evaluate({ ...shop, needsLimitedLiability: true }, 9999)
    const sas = v.ranked.find(r => r.regime === 'sas')!
    expect(sas.cost!.accountantMonthly).toBe(9999)
    // ...and defaults to the market estimate, never to a bare literal.
    const d = evaluate({ ...shop, needsLimitedLiability: true })
    expect(d.ranked.find(r => r.regime === 'sas')!.cost!.accountantMonthly).toBe(
      MARKET_ESTIMATES.contadorMensual.value
    )
  })
})

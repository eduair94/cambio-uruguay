// Numbers in text, and whether a piece of writing invented any.
//
// Shared because the same rule now guards two very different outputs, and it must be the SAME rule:
// a Reddit comment may only use figures that appear in the pages it quotes, and an auto-published
// page may only use figures that appear in the sources it cites. Both are the site speaking without
// a person having read the sentence first, and a wrong number is the failure that costs the reader
// money — so it is the one thing checked by code rather than asked for in a prompt.

/**
 * Every number in a text, normalised so that the same quantity written two ways compares equal.
 *
 * Uruguayan writing uses `.` for thousands and `,` for decimals; the same figure rendered as
 * `1.000`, `1000` or `1,000` must not read as three different claims. Percent signs, currency
 * symbols and units are dropped — the token is the quantity.
 */
export function numericTokens(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\d[\d.,]*/g)) {
    let raw = match[0].replace(/[.,]+$/, ""); // trailing punctuation is sentence, not number
    if (!raw) continue;

    // Thousands grouping: 1.000 / 1.234.567 / 1,234,567 → strip the separators.
    if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, "");
    else raw = raw.replace(/,/g, "."); // a lone comma is a decimal point here

    // Drop a trailing ".0" so 20 and 20.0 are the same token.
    const num = Number(raw);
    out.push(Number.isFinite(num) ? String(num) : raw);
  }
  return out;
}

/**
 * Numbers present in `text` but not in `allowed`.
 *
 * Exported rather than folded into a boolean because naming the offending figure is what makes a
 * retry work: telling a model "you invented 45" fixes the next attempt, telling it "follow the
 * rules" does not.
 */
export function inventedNumbers(text: string, allowed: string): string[] {
  const known = new Set(numericTokens(allowed));
  const seen = new Set<string>();
  const bad: string[] = [];
  for (const token of numericTokens(text)) {
    if (known.has(token) || seen.has(token)) continue;
    seen.add(token);
    bad.push(token);
  }
  return bad;
}

// Shared formatting + URL helpers for the site-backed tools (rentals, cars, products).
// Pure functions only: every tool renders money, percentages and links the same way.

/** Public links always point here, whatever upstream base the server reads from. */
export const PUBLIC_SITE = "https://cambio-uruguay.com";

export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];

/** `?a=1&b=x,y` — booleans become "1", empty values are dropped so URLs stay short and cacheable. */
export function toQuery(params: Record<string, QueryValue> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === false || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(","));
      continue;
    }
    search.set(key, value === true ? "1" : String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function siteUrl(path: string, params?: Record<string, QueryValue>): string {
  return `${PUBLIC_SITE}${path}${toQuery(params)}`;
}

export function fmt(n: number, digits = 0): string {
  return Number(n).toLocaleString("es-UY", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** "$ 24.900" for pesos, "US$ 7.900" for dollars, "s/d" when the figure is unknown. */
export function money(amount: number | null | undefined, currency = "UYU"): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "s/d";
  const prefix = currency === "USD" ? "US$" : currency === "UYU" ? "$" : currency;
  return `${prefix} ${fmt(Math.round(amount))}`;
}

/** 0.271 → "27 %". */
export function pct(ratio: number | null | undefined, digits = 0): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "s/d";
  return `${fmt(ratio * 100, digits)} %`;
}

/** Accent- and case-insensitive form used for every name comparison. */
export function fold(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(s: string): string {
  return fold(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every word of `query` appears somewhere in `haystack` (both folded). */
export function matchesWords(haystack: string, query: string | undefined): boolean {
  if (!query) return true;
  const hay = fold(haystack);
  return fold(query)
    .split(" ")
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export function truncate(text: string | null | undefined, max: number): string {
  const clean = String(text ?? "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Drop undefined/null keys so structured output stays compact. */
export function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null)) as T;
}

export function isoDay(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;
}

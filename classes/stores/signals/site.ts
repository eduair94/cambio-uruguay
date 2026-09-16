// Signal 1/2 for /tiendas-online-uruguay: what a store's own homepage publishes, read once a week
// by the sync job (Task 6). Everything here is EITHER present verbatim on the page OR `null` — this
// never infers a fact (an address, a RUT) from surrounding prose, only from a source that names the
// field explicitly (a JSON-LD PostalAddress, a "RUT"-labelled number). See the task-2 brief for the
// exact fixtures this was built against.
import * as cheerio from "cheerio";
import { httpText } from "../net";

export type SitePlatform =
  | "fenicio"
  | "shopify"
  | "vtex"
  | "woocommerce"
  | "tiendanube"
  | "wix"
  | "magento"
  | "nextjs"
  | "otra";

export interface SiteSignal {
  status: "ok" | "blocked";
  finalHost: string;
  https: boolean;
  platform: SitePlatform;
  phone: boolean;
  whatsapp: boolean;
  email: boolean;
  /** 12 digits if the page publishes one, next to a "RUT"/"R.U.T." label. Never guessed. */
  rut: string | null;
  /** Only ever read from a JSON-LD PostalAddress; a plain-text address is not evidence. */
  address: string | null;
  policies: { returns: string | null; terms: string | null; privacy: string | null };
  payments: Array<"mercadopago" | "visa" | "mastercard" | "oca" | "abitab" | "redpagos" | "transferencia">;
  checkedAt: string;
}

// Cloudflare's interstitial is the case actually observed against this registry (loi.com.uy,
// tiendainglesa.com.uy return it from our server): both markers together avoid a false positive on
// a page that merely mentions "please wait a moment" somewhere in its copy.
function isChallengePage(html: string): boolean {
  return /just a moment/i.test(html) && /challenge-platform/i.test(html);
}

// Fixed, deterministic order: first fingerprint that matches wins. Each of the four tested markers
// (fenicio/shopify/vtex/woocommerce) comes straight from classes/retail/stores.ts, which already
// harvests these exact platforms from Uruguayan storefronts.
const PLATFORM_MARKERS: ReadonlyArray<[SitePlatform, RegExp]> = [
  ["fenicio", /f\.fcdn\.app/i],
  ["shopify", /cdn\.shopify\.com/i],
  ["vtex", /vteximg/i],
  ["woocommerce", /\bwoocommerce\b/i],
  ["tiendanube", /tiendanube|cdn\.tcdn\.com\.br/i],
  ["wix", /wixstatic\.com|_wixCssStates|wix-code/i],
  ["magento", /\bmagento\b/i],
  ["nextjs", /__NEXT_DATA__|_next\/static/i],
];

function detectPlatform(html: string): SitePlatform {
  for (const [platform, marker] of PLATFORM_MARKERS) {
    if (marker.test(html)) return platform;
  }
  return "otra";
}

/** lowercase, accents stripped — same normalization as classes/stores/registry.ts storeNorm. */
function norm(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// A RUT is 12 digits; the page must LABEL it as RUT (accepting the common "R.U.T." spelling and
// spaces the site owner put in for readability) or it is not published as a RUT at all — a bare
// 12-digit number (order codes, phone numbers with a country prefix...) is not evidence.
const RUT_LABEL_RE = /r\.?\s*u\.?\s*t\.?[^0-9]{0,10}([0-9][0-9.\- ]{8,20}[0-9])/i;

function extractRut(html: string): string | null {
  const match = RUT_LABEL_RE.exec(html);
  if (!match) return null;
  const digits = match[1].replace(/\D/g, "");
  return digits.length === 12 ? digits : null;
}

function deepFindPostalAddress(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFindPostalAddress(item);
      if (found) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  if (obj["@type"] === "PostalAddress") return obj;
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = deepFindPostalAddress(value);
      if (found) return found;
    }
  }
  return null;
}

const JSON_LD_RE = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function extractAddress(html: string): string | null {
  for (const match of html.matchAll(JSON_LD_RE)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const address = deepFindPostalAddress(parsed);
    if (!address) continue;
    const street = typeof address.streetAddress === "string" ? address.streetAddress.trim() : "";
    const locality = typeof address.addressLocality === "string" ? address.addressLocality.trim() : "";
    const parts = [street, locality].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  return null;
}

function extractPolicies(
  $: cheerio.CheerioAPI,
  finalUrl: string
): SiteSignal["policies"] {
  const policies: SiteSignal["policies"] = { returns: null, terms: null, privacy: null };
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const text = norm($(el).text());
    let absolute: string;
    try {
      absolute = new URL(href, finalUrl).toString();
    } catch {
      return;
    }
    if (!policies.returns && text.includes("devoluc")) policies.returns = absolute;
    if (!policies.terms && text.includes("terminos") && text.includes("condicion")) policies.terms = absolute;
    if (!policies.privacy && text.includes("politica") && text.includes("privacidad")) policies.privacy = absolute;
  });
  return policies;
}

// Fixed order (matches the SiteSignal["payments"] union): the output is always in this order,
// never the order the page happens to mention them in, and never repeats a method.
const PAYMENT_MARKERS: ReadonlyArray<[SiteSignal["payments"][number], RegExp]> = [
  ["mercadopago", /mercado\s*pago/i],
  ["visa", /\bvisa\b/i],
  ["mastercard", /mastercard/i],
  ["oca", /\boca\b/i],
  ["abitab", /abitab/i],
  ["redpagos", /redpagos/i],
  ["transferencia", /transferencia\s+banc/i],
];

function extractPayments(html: string): SiteSignal["payments"] {
  const found: SiteSignal["payments"] = [];
  for (const [method, marker] of PAYMENT_MARKERS) {
    if (marker.test(html)) found.push(method);
  }
  return found;
}

function blockedSignal(finalHost: string, https: boolean, checkedAt: string): SiteSignal {
  return {
    status: "blocked",
    finalHost,
    https,
    platform: "otra",
    phone: false,
    whatsapp: false,
    email: false,
    rut: null,
    address: null,
    policies: { returns: null, terms: null, privacy: null },
    payments: [],
    checkedAt,
  };
}

export function parseSite(html: string, finalUrl: string, checkedAt: string): SiteSignal {
  let finalHost = finalUrl;
  let https = finalUrl.startsWith("https:");
  try {
    const parsed = new URL(finalUrl);
    finalHost = parsed.host;
    https = parsed.protocol === "https:";
  } catch {
    // finalUrl came from somewhere that isn't a well-formed URL (shouldn't happen from httpText,
    // which always hands back `response.url`); fall back to the raw string rather than throw.
  }

  // A Cloudflare/bot-challenge page is not the store's real homepage: nothing else on it (a
  // platform fingerprint, a phone link, a payment method) describes the store, so it is not parsed.
  if (isChallengePage(html)) return blockedSignal(finalHost, https, checkedAt);

  const $ = cheerio.load(html);
  const phone = $('a[href^="tel:"]').length > 0;
  const whatsapp = $('a[href*="wa.me/"]').length > 0 || /api\.whatsapp\.com/i.test(html);
  const email = $('a[href^="mailto:"]').length > 0;

  return {
    status: "ok",
    finalHost,
    https,
    platform: detectPlatform(html),
    phone,
    whatsapp,
    email,
    rut: extractRut(html),
    address: extractAddress(html),
    policies: extractPolicies($, finalUrl),
    payments: extractPayments(html),
    checkedAt,
  };
}

/** `undefined` only when the network failed; a >=400 response with a challenge body still parses
 * (as `status: "blocked"`) rather than being treated as a failure — see net.ts's httpText. */
export async function fetchSite(domain: string): Promise<SiteSignal | undefined> {
  const requested = `https://${domain}/`;
  const res = await httpText(requested);
  if (!res) return undefined;
  return parseSite(res.body, res.url || requested, new Date().toISOString());
}

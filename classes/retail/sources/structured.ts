// Reads a product off a PDP using the structured data the page already publishes for Google:
// schema.org microdata (`itemprop=...`) first, JSON-LD second, OpenGraph last. Never CSS selectors
// — those change with every theme tweak, while these three contracts are maintained on purpose.

export interface StructuredProduct {
  name: string;
  brand: string;
  sku: string;
  description: string;
  image: string | null;
  price: number | null;
  currency: string | null;
  available: boolean | null;
  condition: "new" | "refurbished" | "used" | "unknown";
}

const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const clean = (value: string): string => decodeEntities(value).replace(/\s+/g, " ").trim();

/** `content="..."` when present, otherwise the element's own text. */
function microdata(html: string, prop: string): string {
  const attr = new RegExp(`itemprop=["']${prop}["'][^>]*\\scontent=["']([^"']*)["']`, "i").exec(html);
  if (attr?.[1]) return clean(attr[1]);
  const contentFirst = new RegExp(`content=["']([^"']*)["'][^>]*\\sitemprop=["']${prop}["']`, "i").exec(html);
  if (contentFirst?.[1]) return clean(contentFirst[1]);
  const text = new RegExp(`itemprop=["']${prop}["'][^>]*>([^<]{1,400})<`, "i").exec(html);
  if (text?.[1]) return clean(text[1]);
  return "";
}

function microdataHref(html: string, prop: string): string {
  const match = new RegExp(`itemprop=["']${prop}["'][^>]*\\shref=["']([^"']*)["']`, "i").exec(html);
  const reversed = new RegExp(`href=["']([^"']*)["'][^>]*\\sitemprop=["']${prop}["']`, "i").exec(html);
  return clean(match?.[1] || reversed?.[1] || "");
}

function microdataSrc(html: string, prop: string): string {
  const match = new RegExp(`itemprop=["']${prop}["'][^>]*\\ssrc=["']([^"']*)["']`, "i").exec(html);
  return clean(match?.[1] || "");
}

function openGraph(html: string, property: string): string {
  const match = new RegExp(`property=["']og:${property}["'][^>]*\\scontent=["']([^"']*)["']`, "i").exec(html);
  const reversed = new RegExp(`content=["']([^"']*)["'][^>]*\\sproperty=["']og:${property}["']`, "i").exec(html);
  return clean(match?.[1] || reversed?.[1] || "");
}

function jsonLdProducts(html: string): Record<string, any>[] {
  const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  const out: Record<string, any>[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, any>;
    const type = record["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.some((entry) => String(entry).toLowerCase() === "product")) out.push(record);
    if (record["@graph"]) visit(record["@graph"]);
  };
  for (const block of blocks) {
    try {
      visit(JSON.parse(block[1]!.trim()));
    } catch {
      // A malformed block on one page must not cost us the rest of the catalogue.
    }
  }
  return out;
}

/**
 * "US$ 1.234,50" / "$ 4.500" / "1234.50" / "12,990" -> number.
 *
 * Uruguayan stores write thousands with `.` and decimals with `,`, imported themes do the reverse,
 * and both appear on the same page. The only reliable tell is the LAST separator: three digits
 * after it make it a thousands separator ("4.500" is 4500, never 4.50), anything else makes it the
 * decimal point. Guessing wrong here publishes a chair at 4.5 pesos.
 */
export function parsePrice(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (!raw) return null;
  const text = String(raw).replace(/[^\d.,-]/g, "");
  if (!text) return null;

  const lastSeparator = Math.max(text.lastIndexOf(","), text.lastIndexOf("."));
  let normalized: string;
  if (lastSeparator === -1) {
    normalized = text;
  } else {
    const fraction = text.slice(lastSeparator + 1);
    normalized = /^\d{3}$/.test(fraction)
      ? text.replace(/[.,]/g, "")
      : `${text.slice(0, lastSeparator).replace(/[.,]/g, "")}.${fraction}`;
  }
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const conditionFrom = (value: string): StructuredProduct["condition"] => {
  const text = value.toLowerCase();
  if (text.includes("newcondition") || text === "new" || text.includes("nuevo")) return "new";
  if (text.includes("refurbished") || text.includes("reacondicionado")) return "refurbished";
  if (text.includes("usedcondition") || text.includes("usado")) return "used";
  return "unknown";
};

/**
 * Narrows the document to the Product itemscope before reading microdata.
 *
 * Storefronts also mark up the site itself (`schema.org/WebSite`) and the breadcrumb, and those
 * carry their own `itemprop="name"` — on a Fenicio PDP the first `name` in the file is the site
 * one ("Silla LZ — Bertoni") and the product's real name is the second.
 */
function productScope(html: string): string {
  const match = /itemtype=["'][^"']*schema\.org\/Product["']/i.exec(html);
  if (!match) return html;
  return html.slice(match.index, match.index + 60_000);
}

export function parseStructuredProduct(fullHtml: string): StructuredProduct | null {
  const html = productScope(fullHtml);
  const ld = jsonLdProducts(fullHtml)[0];
  const ldOffer = Array.isArray(ld?.offers) ? ld?.offers[0] : ld?.offers;

  const name = microdata(html, "name") || clean(String(ld?.name || "")) || openGraph(fullHtml, "title");
  const brandRaw = ld?.brand;
  const brand =
    microdata(html, "brand") ||
    clean(String((brandRaw && typeof brandRaw === "object" ? brandRaw.name : brandRaw) || ""));
  const price =
    parsePrice(microdata(html, "price")) ??
    parsePrice(ldOffer?.price ?? ldOffer?.lowPrice) ??
    parsePrice(openGraph(fullHtml, "price:amount"));
  const currencyRaw =
    microdata(html, "priceCurrency") || String(ldOffer?.priceCurrency || "") || openGraph(fullHtml, "price:currency");
  const availabilityRaw = microdataHref(html, "availability") || String(ldOffer?.availability || "");
  const conditionRaw = microdataHref(html, "itemCondition") || String(ld?.itemCondition || "");
  const image =
    microdataSrc(html, "image") ||
    microdata(html, "image") ||
    (Array.isArray(ld?.image) ? String(ld.image[0] || "") : clean(String(ld?.image || ""))) ||
    openGraph(fullHtml, "image");

  if (!name || price === null) return null;

  return {
    name,
    brand,
    sku: microdata(html, "sku") || clean(String(ld?.sku || ld?.mpn || "")),
    description: microdata(html, "description") || clean(String(ld?.description || "")).slice(0, 600),
    image: image ? (image.startsWith("//") ? `https:${image}` : image) : null,
    price,
    currency: currencyRaw ? currencyRaw.toUpperCase().slice(0, 3) : null,
    available: availabilityRaw ? /instock|limitedavailability|preorder/i.test(availabilityRaw) : null,
    condition: conditionFrom(conditionRaw),
  };
}

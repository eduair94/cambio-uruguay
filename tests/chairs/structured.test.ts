import { describe, expect, it } from "vitest";
import { parsePrice, parseStructuredProduct } from "../../classes/chairs/sources/structured";

/** Trimmed copy of a real Fenicio product page (Bertoni), keeping the markup that matters. */
const FENICIO_PDP = `<!DOCTYPE html><html><head>
<meta itemprop="name" content="Silla LZ — Bertoni" />
<meta property="og:title" content="Silla LZ — Bertoni" />
<meta property="og:image" content="https://f.fcdn.app/imgs/og.jpg" />
</head><body>
<div itemscope itemtype="http://schema.org/Product">
  <span itemprop="brand">Bertoni</span>
  <h1 itemprop="name">Silla LZ</h1>
  <img itemprop="image" src="//f.fcdn.app/imgs/lz.jpg" />
  <p itemprop="description">Silla operativa giratoria para oficina, estructura de polipropileno.</p>
  <span itemprop="sku">801296900</span>
  <link itemprop="itemCondition" href="http://schema.org/NewCondition"/>
  <span itemprop="offers" itemscope itemtype="http://schema.org/Offer">
    <meta itemprop="priceCurrency" content="USD"/>
    <meta itemprop="price" content="150">
    <link itemprop="availability" href="http://schema.org/InStock"/>
  </span>
</div></body></html>`;

const JSONLD_PDP = `<html><head><script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Silla ergonómica X2",
 "brand":{"@type":"Brand","name":"Armo"},"sku":"X2",
 "image":["https://cdn.example.com/x2.jpg"],
 "offers":{"@type":"Offer","price":"315.00","priceCurrency":"USD","availability":"https://schema.org/InStock"}}
</script></head><body></body></html>`;

describe("parsePrice", () => {
  it("reads Uruguayan and international number formats", () => {
    expect(parsePrice("$ 4.500")).toBe(4500);
    expect(parsePrice("US$ 1.234,50")).toBe(1234.5);
    expect(parsePrice("1234.50")).toBe(1234.5);
    expect(parsePrice("12,990")).toBe(12990);
  });

  it("refuses a non-price", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("consultar")).toBeNull();
    expect(parsePrice(0)).toBeNull();
  });
});

describe("parseStructuredProduct", () => {
  it("reads the product's own microdata, not the site's", () => {
    const product = parseStructuredProduct(FENICIO_PDP)!;
    // The first `itemprop="name"` in the document is the site's ("Silla LZ — Bertoni").
    expect(product.name).toBe("Silla LZ");
    expect(product.brand).toBe("Bertoni");
    expect(product.price).toBe(150);
    expect(product.currency).toBe("USD");
    expect(product.available).toBe(true);
    expect(product.condition).toBe("new");
    expect(product.image).toBe("https://f.fcdn.app/imgs/lz.jpg");
  });

  it("falls back to JSON-LD when there is no microdata", () => {
    const product = parseStructuredProduct(JSONLD_PDP)!;
    expect(product.name).toBe("Silla ergonómica X2");
    expect(product.brand).toBe("Armo");
    expect(product.price).toBe(315);
    expect(product.currency).toBe("USD");
  });

  it("returns null when there is no price to publish", () => {
    expect(parseStructuredProduct("<html><body><h1>Silla</h1></body></html>")).toBeNull();
  });
});

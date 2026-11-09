import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { RENTAL_OPPORTUNITY_SELECT, rentalOpportunityListings } from "../../classes/propertyopportunities/rentalAdapter";
import type { RentalOffer, RentalProperty } from "../../classes/rentals/types";

type Tree = { [field: string]: Tree | true };

/** The selected dotted paths as a tree: { offers: { details: { description: true } } }. */
function selectTree(select: Record<string, 0 | 1>): Tree {
  const tree: Tree = {};
  for (const [path, on] of Object.entries(select)) {
    if (on !== 1) continue;
    const parts = path.split(".");
    let node = tree;
    for (const [index, part] of parts.entries()) {
      if (index === parts.length - 1) node[part] = true;
      else {
        const next = node[part];
        if (next === true) break;
        node = (node[part] = next ?? {}) as Tree;
      }
    }
  }
  return tree;
}

/** What Mongo hands back for `select`: only the selected paths, applied through arrays. */
function project(value: unknown, tree: Tree | true): unknown {
  if (tree === true) return value;
  if (Array.isArray(value)) return value.map(item => project(item, tree));
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [field, subtree] of Object.entries(tree)) {
    if (!(field in value)) continue;
    const kept = project((value as Record<string, unknown>)[field], subtree);
    if (kept !== undefined) out[field] = kept;
  }
  return out;
}

const loaded = (properties: RentalProperty[]) =>
  project(properties, selectTree(RENTAL_OPPORTUNITY_SELECT)) as RentalProperty[];

describe("the rental opportunity loader selects what the adapter reads", () => {
  it("selects every field the adapter reads from the property, the offer, its identity and its details", () => {
    const source = readFileSync(join(__dirname, "../../classes/propertyopportunities/rentalAdapter.ts"), "utf8");
    const selected = Object.keys(RENTAL_OPPORTUNITY_SELECT).filter(path => RENTAL_OPPORTUNITY_SELECT[path] === 1);
    // Reading a parent (`offer.details`, `property.offers`) is fine while its children are selected:
    // each child read is checked on its own below.
    const covered = (path: string) =>
      selected.some(other => path === other || path.startsWith(`${other}.`) || other.startsWith(`${path}.`));
    const read = new Set<string>();
    // In the adapter `own` is `offer.identity` and `details` is `offer.details`.
    const receivers: [RegExp, string][] = [
      [/\bproperty\??\.(\w+)/g, ""],
      [/\boffer\??\.(\w+)/g, "offers."],
      [/\bown\??\.(\w+)/g, "offers.identity."],
      [/\bdetails\??\.(\w+)/g, "offers.details."],
    ];
    for (const [pattern, prefix] of receivers) for (const [, field] of source.matchAll(pattern)) read.add(`${prefix}${field}`);
    // The scan has to find the reads it guards: one per receiver at least, and today well over 30.
    for (const [, prefix] of receivers) expect([...read].some(path => path.startsWith(prefix || "key"))).toBe(true);
    expect(read.size).toBeGreaterThan(30);
    expect([...read].filter(path => !covered(path))).toEqual([]);
  });

  it("keeps the guards that rest on a field only the select can deliver", () => {
    const own = {
      version: 1, department: "Montevideo", neighborhood: "Cordón", propertyType: "apartamento",
      bedrooms: 1, bathrooms: 1, area: 45, description: "Apartamento luminoso. Sin gastos comunes.",
    };
    const base = {
      source: "infocasas", listingId: "infocasas:1", title: "Apartamento 1 dormitorio", url: "https://www.infocasas.com.uy/1",
      identity: own, details: { description: own.description, builtArea: 45 }, price: 22_000, currency: "UYU",
      commonExpenses: null, commonExpensesCurrency: null, lastSeen: "2026-11-09", publishedAt: null,
      image: null, parkingSpaces: null, furnished: null,
    } as unknown as RentalOffer;
    // Measured in production on 2026-11-09: a zero read from "Sin gastos comunes" entered the rent
    // snapshot as the portal's zero (3 subjects, 11 comparables), because the select dropped the label.
    const fromText = { ...base, listingId: "infocasas:2", commonExpenses: 0, commonExpensesSource: "description" } as RentalOffer;
    const winterOnly = { ...base, listingId: "infocasas:3", terms: ["invernal"] } as RentalOffer;
    const rows = rentalOpportunityListings(loaded([{ key: "p", offers: [fromText, winterOnly] } as RentalProperty]));
    expect(rows.map(row => row.listingId)).toEqual(["infocasas:2"]);
    expect(rows[0]!.expenses).toBeNull();
  });

  it("still delivers a portal figure and the facts the comparison needs", () => {
    const offer = {
      source: "elpais", listingId: "elpais:9", title: "Apartamento", url: "https://inmuebles.elpais.com.uy/property/9",
      identity: { version: 1, department: "Montevideo", neighborhood: "Pocitos", propertyType: "apartamento", bedrooms: 2, bathrooms: 1, area: 70 },
      details: { description: "Gastos comunes $ 6.000", builtArea: 68, totalArea: 72, landArea: null, amenities: ["balcon"] },
      price: 30_000, currency: "UYU", commonExpenses: 6_000, commonExpensesCurrency: "UYU", lastSeen: "2026-11-09",
      publishedAt: "2026-11-01", image: null, parkingSpaces: 1, furnished: null, sellerName: "Inmobiliaria",
    } as unknown as RentalOffer;
    // An interior advert: its locality and its hidden address only reach the adapter through the identity.
    const interior = {
      ...offer, listingId: "elpais:10",
      identity: {
        version: 1, department: "Canelones", locality: "Ciudad de la Costa", neighborhood: "Solymar", propertyType: "casa",
        bedrooms: 3, bathrooms: 2, area: 120, address: "Calle aproximada 1234", addressHidden: true, description: "Texto propio",
      },
    } as unknown as RentalOffer;
    const [row, inland] = rentalOpportunityListings(loaded([{ key: "q", offers: [offer, interior] } as RentalProperty]));
    expect(row).toMatchObject({
      propertyKey: "q", expenses: { amount: 6_000, currency: "UYU" }, area: { value: 68, basis: "built" }, parkingSpaces: 1,
      amenities: ["balcon"], description: "Gastos comunes $ 6.000", sellerName: "Inmobiliaria", publishedAt: "2026-11-01",
    });
    expect(inland).toMatchObject({ propertyKey: "q", locality: "Ciudad de la Costa", description: "Texto propio", propertyType: "casa" });
    expect(inland!.address).toBeUndefined();
  });
});

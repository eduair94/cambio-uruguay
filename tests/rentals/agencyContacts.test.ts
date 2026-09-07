import { describe, expect, it, vi } from "vitest";
import { agencyPathAllowed, enrichAgencyContacts, readInfoCasasAgencyContact, type AgencyContactCacheRow } from "../../classes/rentals/agencyContacts";
import { readCasaswebAdvertiser } from "../../classes/rentals/casaswebContacts";
import { readElpaisContact } from "../../classes/rentals/elpaisContacts";
import type { RentalAgency, RentalAdvertiserFields } from "../../classes/rentals/types";

const NOW = "2026-09-07T10:00:00.000Z";
const agency: RentalAgency = { version: 1, key: "infocasas:77", name: "Agencia pública", profileUrl: "https://www.infocasas.com.uy/inmobiliarias/perfil/77-agencia", observedAt: NOW };
const html = (email = "business@example.com", id = 77) => `<link rel="canonical" href="${agency.profileUrl}"><script id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { apolloState: { [`RealEstateAgent:${id}`]: { __typename: "RealEstateAgent", id, type: "inmobiliaria", masked_phone: "PRIVATE", subsidiaries: [{ emails: ["private@example.com"] }] } } } } })}</script>
  <footer>footer@example.com</footer><div class="subsidiary"><h4>Casa central</h4><div class="info-inmob"><div class="emails"><span>${email}</span></div><button>Ver teléfono</button></div></div>`;
const own = (): Array<RentalAdvertiserFields & { source: "infocasas"; url: string }> => [1, 2, 3].map(id => ({ source: "infocasas", url: `https://www.infocasas.com.uy/apartamento/${id}`, agency }));

describe("bounded public commercial contacts", () => {
  it("only reads El País's visible contact controls carrying the exact own advert ID", () => {
    const id = "6a42af6f3b79e8db94e26e37", other = "6a42af6f3b79e8db94e26e38";
    const advert = { listingId: `elpais:${id}`, url: `https://inmuebles.elpais.com.uy/property/${id}` };
    const page = `<link rel="canonical" href="${advert.url}"><span data-funnel="contact-company" data-listing-id="${id}">Empresa pública</span>
      <a data-funnel="contact-phone" data-listing-id="${id}" href="tel:099123456">Teléfono</a>
      <a data-funnel="contact-phone" data-listing-id="${other}" href="tel:099222222">Otra propiedad</a>
      <script>{"contact":{"phone":"099333333","email":"private@example.com"}}</script><footer><a href="tel:099444444">Portal</a></footer>`;
    expect(readElpaisContact(page, advert, NOW)?.channels).toEqual([{ kind: "phone", value: "+59899123456", sourceUrl: advert.url, observedAt: NOW }]);
    expect(readElpaisContact(page.replace(advert.url, "https://evil.example"), advert, NOW)).toBeUndefined();
    expect(readElpaisContact(page.replace('href="tel:099123456"', 'hidden href="tel:099123456"'), advert, NOW)).toBeNull();
    expect(readElpaisContact("<h1>Login</h1>", advert, NOW)).toBeUndefined();
  });
  it("uses only the corroborated native agency's public commercial block", () => {
    const result = readInfoCasasAgencyContact(html(), agency, NOW)!;
    expect(result.publicContact?.channels.map(row => row.kind)).toEqual(["email", "profile"]);
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|footer@example|private@example/);
    expect(readInfoCasasAgencyContact(html("business@example.com", 78), agency, NOW)).toBeNull();
    expect(readInfoCasasAgencyContact(html().replace(agency.profileUrl, "https://evil.example"), agency, NOW)).toBeNull();
    expect(readInfoCasasAgencyContact("<h1>Verifica que eres humano</h1>", agency, NOW)).toBeNull();
  });
  it("obeys wildcard and identifying-agent robots rules before reading profiles", () => {
    expect(agencyPathAllowed("User-agent: *\nDisallow: /alquiler/*-y-*", agency.profileUrl)).toBe(true);
    expect(agencyPathAllowed("User-agent: *\nDisallow: /inmobiliarias/", agency.profileUrl)).toBe(false);
    expect(agencyPathAllowed("User-agent: *\nDisallow: /\nAllow: /inmobiliarias/perfil/", agency.profileUrl)).toBe(true);
    expect(agencyPathAllowed("User-agent: CambioUruguayBot\nDisallow: /\nUser-agent: *\nAllow: /", agency.profileUrl)).toBe(false);
    expect(agencyPathAllowed("", agency.profileUrl)).toBe(false);
  });
  it("reads one profile for several source-owned adverts and keeps each contact's actual date", async () => {
    const rows = own(), save = vi.fn(), fetchPage = vi.fn(async url => url.endsWith("robots.txt") ? "User-agent: *\nDisallow: /admin" : html());
    const result = await enrichAgencyContacts(rows, { cache: { load: async () => [], save }, fetchPage, now: () => new Date(NOW) });
    expect(result).toEqual({ inspected: 1, failed: 0, linked: 3 }); expect(fetchPage).toHaveBeenCalledTimes(2); expect(save).toHaveBeenCalledTimes(1);
    expect(rows[2].publicContact?.channels[0].observedAt).toBe(NOW);
  });
  it("failed rereads retain dates; known removal replaces channels; dry-run never writes cache", async () => {
    const earlier = "2026-08-29T10:00:00.000Z", read = readInfoCasasAgencyContact(html(), { ...agency, observedAt: earlier }, earlier)!;
    const cacheRow: AgencyContactCacheRow = { _id: agency.key, lastAttemptAt: earlier, read };
    const save = vi.fn(), rows = own();
    await enrichAgencyContacts(rows, { cache: { load: async () => [cacheRow], save }, fetchPage: async url => url.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : null, now: () => new Date(NOW) });
    expect(rows[0].publicContact?.channels[0].observedAt).toBe(earlier);
    const cleared = own(); save.mockClear();
    await enrichAgencyContacts(cleared, { cache: { load: async () => [cacheRow], save }, fetchPage: async url => url.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : html(""), now: () => new Date(NOW), dryRun: true });
    expect(cleared[0].publicContact?.channels.map(row => row.kind)).toEqual(["profile"]); expect(save).not.toHaveBeenCalled();
  });
  it("does not borrow contacts after a native profile changes or records expire", async () => {
    const read = readInfoCasasAgencyContact(html(), agency, NOW)!;
    const rows = own();
    await enrichAgencyContacts(rows, { maxProfiles: 0, cache: { load: async () => [{ _id: agency.key, lastAttemptAt: NOW, read: { ...read, profileUrl: `${agency.profileUrl}-other` } }], save: vi.fn() }, now: () => new Date(NOW) });
    expect(rows[0].publicContact).toBeUndefined();
    const stale = own();
    await enrichAgencyContacts(stale, { maxProfiles: 0, cache: { load: async () => [{ _id: agency.key, lastAttemptAt: NOW, read }], save: vi.fn() }, now: () => new Date("2026-10-07T10:00:00Z") });
    expect(stale[0].publicContact).toBeUndefined();
  });
  it("reads Casasweb's visible own WhatsApp without inventing an agency ID or taking another advert's block", () => {
    const advert = { listingId: "casasweb:123", title: "Apartamento luminoso", url: "https://casasweb.com/ALQUILER_APARTAMENTO_CW123" };
    const page = `<title>CW123 Apartamento luminoso</title><h1>Apartamento luminoso</h1><li>Ref: CW123</li><center><h2 id="nombreInmo">Agencia pública</h2><a href="https://wa.me/59899123456?text=PRIVATE">WhatsApp</a></center><footer>private@example.com</footer>`;
    const parsed = readCasaswebAdvertiser(page, advert, NOW)!;
    expect(parsed.sellerType).toBe("inmobiliaria"); expect(parsed.agency).toBeUndefined(); expect(parsed.ownerDirect).toBeNull();
    expect(parsed.publicContact?.channels).toEqual([{ kind: "whatsapp", value: "+59899123456", sourceUrl: advert.url, observedAt: NOW }]);
    expect(readCasaswebAdvertiser(page, { ...advert, listingId: "casasweb:124" }, NOW)).toBeNull();
    expect(readCasaswebAdvertiser(page.replace("Ref: CW123", "Ref: CW124"), advert, NOW)).toBeNull();
    expect(readCasaswebAdvertiser(page.replace("<h1>Apartamento luminoso", "<h1>Otra propiedad"), advert, NOW)).toBeNull();
  });
});

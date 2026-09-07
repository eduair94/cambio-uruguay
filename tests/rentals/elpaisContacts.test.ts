import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enrichElpaisRentalContacts } from "../../classes/rentals/elpaisContacts";
import { fetchText } from "../../classes/rentals/net";
import { PORTAL_HEADERS } from "../../classes/rentals/sources/elpais";
import type { RawRental } from "../../classes/rentals/types";

vi.mock("../../classes/rentals/net", () => ({ fetchText: vi.fn(), fetchJson: vi.fn(), sleep: vi.fn() }));
const id = "6a42af6f3b79e8db94e26e37";
const url = `https://inmuebles.elpais.com.uy/property/${id}`;
const now = () => new Date("2026-09-07T10:00:00Z");
const advert = (): RawRental => ({ source: "elpais", listingId: `elpais:${id}`, url } as RawRental);
const html = `<link rel="canonical" href="${url}"><span data-funnel="contact-company" data-listing-id="${id}">Empresa de prueba</span>
  <a data-funnel="contact-phone" data-listing-id="${id}" href="tel:099123456">Llamar</a>`;
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("RENTALS_CONTACTS_ENABLED", "1"); });
afterEach(() => vi.unstubAllEnvs());

describe("El País contact fetch identification", () => {
  it("reuses the exact operator-authorized portal headers and keeps plain HTTP bounds", async () => {
    vi.mocked(fetchText).mockResolvedValue(html);
    const row = advert();
    expect(await enrichElpaisRentalContacts([row], "fast", { now })).toBe(1);
    expect(fetchText).toHaveBeenCalledExactlyOnceWith(url, { headers: PORTAL_HEADERS, timeoutMs: 10_000, retries: 0 });
    expect(vi.mocked(fetchText).mock.calls[0][1]?.headers).toBe(PORTAL_HEADERS);
    expect(PORTAL_HEADERS["user-agent"]).toBe(process.env.RENTALS_EP_USER_AGENT || "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36");
    expect(PORTAL_HEADERS["x-cambio-uruguay-bot"]).toBe("CambioUruguayBot/1.0 (+https://cambio-uruguay.com/alquileres-uruguay)");
    expect(row.publicContact?.channels.map(channel => channel.kind)).toEqual(["phone"]);
    expect(row.publicContact?.channels[0].sourceUrl).toBe(url);
    expect(row.publicContact?.channels[0].observedAt).toBe(now().toISOString());
  });
  it("a challenge does not withdraw prior evidence or trigger login/browser retries", async () => {
    vi.mocked(fetchText).mockResolvedValue(html);
    const row = advert();
    await enrichElpaisRentalContacts([row], "fast", { now });
    const previous = row.publicContact;
    vi.mocked(fetchText).mockClear().mockResolvedValue("<h1>Just a moment...</h1>");
    expect(await enrichElpaisRentalContacts([row], "fast", { now })).toBe(0);
    expect(row.publicContact).toBe(previous);
    expect(fetchText).toHaveBeenCalledOnce();
  });
  it("does not request another source, an unmatched advert URL, or when contact reads are disabled", async () => {
    expect(await enrichElpaisRentalContacts([
      { ...advert(), source: "infocasas" },
      { ...advert(), url: "https://inmuebles.elpais.com.uy/property/6a42af6f3b79e8db94e26e38" },
    ], "fast", { now })).toBe(0);
    vi.stubEnv("RENTALS_CONTACTS_ENABLED", "0");
    expect(await enrichElpaisRentalContacts([advert()], "fast", { now })).toBe(0);
    expect(fetchText).not.toHaveBeenCalled();
  });
});

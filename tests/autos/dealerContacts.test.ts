import { describe, expect, it } from "vitest";
import { carContactHash } from "../../classes/autos/contacts/optout";
import { dealerPagePhones, DEALER_CONTACT_SOURCES, nextDealerContact, readDealerContacts } from "../../classes/autos/contacts/dealers";
import { CAR_SOURCES } from "../../classes/autos/sources/registry";

const AT = "2026-09-21T10:00:00.000Z";

describe("dealer contact pages", () => {
  it("reads WhatsApp, tel: and printed numbers, links first, up to four", () => {
    const html = '<header>Salir 093 111 222 - 094 333 444</header><a href="https://wa.me/59891000111">wa</a>' +
      '<a href="tel:0800 2525">0800 2525</a><footer>RUT 217322040016 SA 2605 3290</footer><script>var x="099 999 999"</script>';
    expect(dealerPagePhones(html).map(phone => phone.value)).toEqual(["+59891000111", "08002525", "+59893111222", "+59894333444"]);
  });

  it("never takes a number from a script", () => {
    expect(dealerPagePhones('<script>var phone = "099 999 999"</script><p>Horario 9 a 18</p>')).toEqual([]);
  });

  it("only dealer websites have a contact page, on their own host", () => {
    expect([...DEALER_CONTACT_SOURCES].sort()).toEqual(["carone", "carper", "fidocar", "julio", "motorlider", "shoppingdeautos"]);
    for (const source of DEALER_CONTACT_SOURCES) {
      const info = CAR_SOURCES[source];
      const page = new URL(info.contactPage!);
      expect(page.protocol).toBe("https:");
      expect(info.dealerName).not.toBeNull();
      // The contact page lives on the same site as the adverts.
      expect(info.permalink.source).toContain(page.host.replace(/\./g, "\\."));
    }
    expect(CAR_SOURCES.mercadolibre.contactPage).toBeNull();
    expect(CAR_SOURCES.facebook.contactPage).toBeNull();
    expect(CAR_SOURCES.clasiautos.contactPage).toBeNull();
    expect(CAR_SOURCES.duenodirecto.contactPage).toBeNull();
  });

  it("keeps the previous numbers WITH their old date when a read fails or finds nothing", () => {
    const good = nextDealerContact(null, { phones: [{ value: "+59891000111", mobile: true }], failure: null }, "julio", AT);
    expect(good).toMatchObject({ ok: true, observedAt: AT, lastAttemptAt: AT, failingSince: null, note: null });
    const later = "2026-09-22T10:00:00.000Z";
    const failed = nextDealerContact(good, { phones: [], failure: "HTTP 503" }, "julio", later);
    expect(failed).toMatchObject({ ok: false, observedAt: AT, phones: good.phones, note: "HTTP 503", failingSince: later, lastAttemptAt: later });
    const empty = nextDealerContact(failed, { phones: [], failure: null }, "julio", "2026-09-23T10:00:00.000Z");
    expect(empty).toMatchObject({ ok: false, observedAt: AT, note: "sin números", failingSince: later });
    expect(nextDealerContact(null, { phones: [], failure: "HTTP 405" }, "carone", AT)).toMatchObject({ phones: [], observedAt: null });
  });

  it("reads every dealer page once", async () => {
    const asked: string[] = [];
    const records = await readDealerContacts(new Map(), {
      fetchPage: async url => {
        asked.push(url);
        return '<a href="tel:+59829012345">x</a>';
      },
      now: () => new Date(AT),
      gapMs: 0,
    });
    expect(asked.sort()).toEqual(DEALER_CONTACT_SOURCES.map(source => CAR_SOURCES[source].contactPage!).sort());
    expect(records.every(record => record.ok && record.phones[0]!.value === "+59829012345" && record.observedAt === AT)).toBe(true);
  });

  it("a page that does not answer keeps what was there", async () => {
    const previous = nextDealerContact(null, { phones: [{ value: "+59891000111", mobile: true }], failure: null }, "julio", AT);
    const records = await readDealerContacts(new Map([["julio", previous]]), { fetchPage: async () => null, now: () => new Date(AT), gapMs: 0 });
    expect(records.find(record => record.source === "julio")).toMatchObject({ ok: false, phones: previous.phones, note: "sin respuesta" });
  });
});

describe("opt-out hash", () => {
  it("is a stable sha-256 of the prefixed value", () => {
    expect(carContactHash("+59899123456")).toMatch(/^[0-9a-f]{64}$/);
    expect(carContactHash("+59899123456")).toBe(carContactHash("+59899123456"));
    expect(carContactHash("+59899123456")).not.toBe(carContactHash("+59899123457"));
  });
});

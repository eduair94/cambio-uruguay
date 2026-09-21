import { describe, expect, it } from "vitest";
import { displayCarPhone, normalizeCarPhone, phonesInLinks, phonesInText, validCarPhone } from "../../classes/autos/contacts/phones";

const values = (text: string, options?: Parameters<typeof phonesInText>[1]): string[] => phonesInText(text, options).map(phone => phone.value);

describe("phonesInText", () => {
  it("reads mobiles written with the 0 or the country code, any grouping", () => {
    expect(values("Llamar al 099 123 456")).toEqual(["+59899123456"]);
    expect(values("cel 099123456 o 098.765.432")).toEqual(["+59899123456", "+59898765432"]);
    expect(values("(094) 44 22 99")).toEqual(["+59894442299"]);
    expect(values("+598 99 123 456")).toEqual(["+59899123456"]);
    expect(values("59891234567")).toEqual(["+59891234567"]);
  });

  it("needs a contact word for a bare mobile or a landline", () => {
    expect(values("vendo 99123456")).toEqual([]);
    expect(values("whatsapp 99123456")).toEqual(["+59899123456"]);
    expect(values("oficina 2901 2345")).toEqual([]);
    expect(values("tel 2901 2345")).toEqual(["+59829012345"]);
    expect(values("2901 2345", { contactPage: true })).toEqual(["+59829012345"]);
  });

  it("never reads a price, a year pair, km or an amount in pesos", () => {
    expect(values("consultas precio $ 2.450.000")).toEqual([]);
    expect(values("tel. modelo 2019 2020")).toEqual([]);
    expect(values("contacto 120.000 km, año 2015")).toEqual([]);
    expect(values("consultas: U$S 91500000")).toEqual([]);
    expect(values("consultas al $ 24500000")).toEqual([]);
  });

  it("reads toll-free 0800 numbers anywhere", () => {
    expect(values("Atención 0800 2525")).toEqual(["08002525"]);
    expect(values("0800-1105")).toEqual(["08001105"]);
  });

  it("reads WhatsApp links inside the text", () => {
    expect(values("escribime wa.me/59899123456")).toEqual(["+59899123456"]);
  });

  it("dedupes, caps and refuses lists", () => {
    expect(values("099 123 456 / 099123456")).toEqual(["+59899123456"]);
    expect(values("099 111 111 099 222 222 099 333 333 099 444 444")).toHaveLength(3);
    expect(values("099 111 111 099 222 222 099 333 333 099 444 444 099 555 555 099 666 666")).toEqual([]);
  });

  it("keeps the order the seller wrote them and marks mobiles", () => {
    expect(phonesInText("tel 099 123 456 y 2901 2345")).toEqual([
      { value: "+59899123456", mobile: true },
      { value: "+59829012345", mobile: false },
    ]);
  });
});

describe("normalize, display and links", () => {
  it("normalizes and validates", () => {
    expect(normalizeCarPhone("+59808002525")).toEqual({ value: "08002525", mobile: false });
    expect(normalizeCarPhone("08003451473")).toBeNull();
    expect(normalizeCarPhone("099 123 45")).toBeNull();
    expect(normalizeCarPhone("090 123 456")).toBeNull();
    expect(validCarPhone("+59899123456")).toBe(true);
    expect(validCarPhone("+59890123456")).toBe(false);
    expect(validCarPhone("08002525")).toBe(true);
    expect(validCarPhone("tel:+59899123456")).toBe(false);
  });

  it("displays numbers the Uruguayan way", () => {
    expect(displayCarPhone("+59899123456")).toBe("099 123 456");
    expect(displayCarPhone("+59829012345")).toBe("2901 2345");
    expect(displayCarPhone("08002525")).toBe("0800 2525");
  });

  it("reads WhatsApp hrefs first, then tel:", () => {
    const html = '<a href="https://wa.me/+59899123456">wa</a><a href="tel:0800 2525">x</a><a href="tel:+59829012345">y</a>' +
      '<a href="https://api.whatsapp.com/send?phone=59898765432">z</a><a href="tel:08003451473">roto</a>';
    expect(phonesInLinks(html)).toEqual([
      { value: "+59899123456", mobile: true },
      { value: "+59898765432", mobile: true },
      { value: "08002525", mobile: false },
      { value: "+59829012345", mobile: false },
    ]);
  });
});

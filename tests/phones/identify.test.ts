import { describe, expect, it } from "vitest";
import { identifyPhone, isPhoneTitle, phoneConditionFromTitle, phoneNorm } from "../../classes/phones/identify";
import { CONDITION_FIXTURES, IDENTIFY_FIXTURES, NOT_PHONE_TITLES, NULL_IDENTITY_TITLES } from "./fixtures/titles";

describe("phoneNorm", () => {
  it("lower-cases, strips accents and spells out plus", () => {
    expect(phoneNorm("Redmi Note 15 Pro+")).toBe("redmi note 15 pro plus");
    expect(phoneNorm("Sólo eSIM")).toBe("solo esim");
  });

  it("collapses punctuation separators to single spaces", () => {
    expect(phoneNorm("celular-apple-iphone-12-128gb-4gb-black-cpo")).toBe("celular apple iphone 12 128gb 4gb black cpo");
  });
});

describe("isPhoneTitle", () => {
  for (const title of NOT_PHONE_TITLES) {
    it(`rejects: ${title}`, () => {
      expect(isPhoneTitle(title)).toBe(false);
    });
  }

  it("accepts a real phone title", () => {
    expect(isPhoneTitle("Apple iPhone 17 Pro (256 GB) - Azul profundo")).toBe(true);
  });
});

describe("identifyPhone", () => {
  for (const fixture of IDENTIFY_FIXTURES) {
    it(`identifies: ${fixture.title}`, () => {
      const identity = identifyPhone(fixture.title);
      expect(identity).not.toBeNull();
      expect(identity!.key).toBe(fixture.key);
      if (fixture.esimOnly !== undefined) {
        expect(identity!.esimOnly).toBe(fixture.esimOnly);
      }
      if (fixture.ramGb !== undefined) {
        expect(identity!.ramGb).toBe(fixture.ramGb);
      }
      expect(identity!.storageGb).toBeGreaterThan(0);
      expect(identity!.name.length).toBeGreaterThan(0);
    });
  }

  for (const title of NOT_PHONE_TITLES) {
    it(`returns null for non-phone title: ${title}`, () => {
      expect(identifyPhone(title)).toBeNull();
    });
  }

  for (const title of NULL_IDENTITY_TITLES) {
    it(`returns null even though brand/family resolve: ${title}`, () => {
      expect(identifyPhone(title)).toBeNull();
    });
  }

  it("builds a human-readable name", () => {
    const identity = identifyPhone("Apple iPhone 17 Pro (256 GB) - Azul profundo");
    expect(identity!.name).toBe("Apple iPhone 17 Pro 256 GB");
  });

  it("spells a 1TB iPhone's key and name with tb, not 1024gb", () => {
    const identity = identifyPhone("celular motorola razr 70 ultra 1tb");
    expect(identity!.key).toBe("motorola-razr-70-ultra-1tb");
    expect(identity!.name).toBe("Motorola Razr 70 Ultra 1 TB");
  });
});

describe("phoneConditionFromTitle", () => {
  for (const fixture of CONDITION_FIXTURES) {
    it(`resolves ${fixture.expected} for: ${fixture.title}`, () => {
      expect(phoneConditionFromTitle(fixture.title, fixture.source)).toBe(fixture.expected);
    });
  }

  it("falls back to the source condition, mapping unknown to new", () => {
    expect(phoneConditionFromTitle("Apple iPhone 17 Pro (256 GB)", "unknown")).toBe("new");
    expect(phoneConditionFromTitle("Apple iPhone 17 Pro (256 GB)", "used")).toBe("used");
  });
});

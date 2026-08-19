import { X509Certificate } from "node:crypto";

import { describe, expect, it } from "vitest";

import { BCU_CERT_CHAIN } from "../../classes/bcurates/certs";

/**
 * The BCU serves its leaf certificate without the intermediates, so we bundle them. They expire,
 * and when they do the refresh starts failing silently-but-safely (previous table keeps serving).
 * This test turns that future surprise into a build failure with 60 days of warning.
 */
const WARN_DAYS = 60;

function chainCerts(): X509Certificate[] {
  const blocks = BCU_CERT_CHAIN.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  return (blocks ?? []).map((pem) => new X509Certificate(pem));
}

describe("bundled BCU intermediate certificates", () => {
  const certs = chainCerts();

  it("bundles the two intermediates the BCU omits", () => {
    expect(certs).toHaveLength(2);
  });

  it("is the Abitab → Certum chain, not something else", () => {
    const subjects = certs.map((c) => c.subject).join(" | ");
    expect(subjects).toMatch(/Abitab SSL Organization Validated/);
    expect(subjects).toMatch(/Certum Global Services CA SHA2/);
  });

  it("links each certificate to the next", () => {
    // The Abitab intermediate must be issued by the Certum one, or the chain will not build.
    const abitab = certs.find((c) => /Abitab SSL/.test(c.subject))!;
    const certum = certs.find((c) => /Certum Global Services/.test(c.subject))!;
    expect(abitab.issuer).toMatch(/Certum Global Services CA SHA2/);
    expect(abitab.checkIssued(certum)).toBe(true);
  });

  it("has not expired, and warns well before it does", () => {
    const now = Date.now();
    for (const c of certs) {
      const notAfter = new Date(c.validTo).getTime();
      const daysLeft = Math.floor((notAfter - now) / 86_400_000);
      expect(
        daysLeft,
        `${c.subject} vence en ${daysLeft} días — refrescá classes/bcurates/certs.ts desde las URLs de CA Issuers que documenta el archivo`
      ).toBeGreaterThan(WARN_DAYS);
    }
  });
});

// El intermedio embebido de uruguayemprendedor.uy (classes/emprendimientos/sources/certs.ts): que
// sea el que dice ser y que avise antes de vencer, como el de BCU.
import { X509Certificate } from "crypto";
import { describe, expect, it } from "vitest";
import { ABITAB_DV_EXPIRES, ABITAB_DV_INTERMEDIATE } from "../../classes/emprendimientos/sources/certs";

describe("intermedio de Uruguay Emprendedor", () => {
  const cert = new X509Certificate(ABITAB_DV_INTERMEDIATE.trim());

  it("es el de Abitab DV, emitido por Certum Global Services CA SHA2", () => {
    expect(cert.subject).toContain("CN=Abitab SSL Domain Validated");
    expect(cert.issuer).toContain("CN=Certum Global Services CA SHA2");
    expect(new Date(cert.validTo).toISOString()).toBe(new Date(ABITAB_DV_EXPIRES).toISOString());
  });

  it("le quedan más de 60 días: si no, bajar el nuevo de http://repository.certum.pl/abitabdv.cer", () => {
    expect(Date.parse(cert.validTo) - Date.now()).toBeGreaterThan(60 * 86_400_000);
  });
});

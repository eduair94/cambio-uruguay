import { describe, expect, it } from "vitest";
import { clientIp, internalIps, isSiteReferrer, normalizeIp } from "../../classes/apikeys/client";

describe("IP del cliente", () => {
  it("prefiere la que manda Cloudflare y saca el prefijo IPv4-en-IPv6", () => {
    expect(clientIp({ "cf-connecting-ip": "200.40.1.2" }, "::ffff:127.0.0.1")).toBe("200.40.1.2");
    expect(clientIp({}, "::ffff:104.234.204.107")).toBe("104.234.204.107");
    expect(normalizeIp(undefined)).toBe("unknown");
  });

  it("internas: loopback siempre, más las de API_INTERNAL_IPS", () => {
    const set = internalIps({ API_INTERNAL_IPS: "104.234.204.107, 10.0.0.2" } as NodeJS.ProcessEnv, {});
    expect([...set].sort()).toEqual(["10.0.0.2", "104.234.204.107", "127.0.0.1", "::1"]);
    expect(internalIps({} as NodeJS.ProcessEnv, {}).has("127.0.0.1")).toBe(true);
  });

  it("las direcciones propias de la máquina son internas aunque falte la variable", () => {
    const interfaces = {
      eth0: [
        { address: "104.234.204.107", family: "IPv4" },
        { address: "2602:ffd5:1:1::10", family: "IPv6" },
      ],
    } as any;
    const set = internalIps({} as NodeJS.ProcessEnv, interfaces);
    expect(set.has("104.234.204.107")).toBe(true);
    expect(set.has("2602:ffd5:1:1::10")).toBe(true);
  });
});

describe("pedido del propio sitio", () => {
  it("reconoce el dominio y sus subdominios por Origin o Referer", () => {
    expect(isSiteReferrer("https://cambio-uruguay.com")).toBe(true);
    expect(isSiteReferrer(undefined, "https://www.cambio-uruguay.com/historico/brou")).toBe(true);
  });

  it("no se deja engañar por un dominio que sólo contiene el nombre", () => {
    expect(isSiteReferrer("https://cambio-uruguay.com.evil.test")).toBe(false);
    expect(isSiteReferrer("https://notcambio-uruguay.com")).toBe(false);
    expect(isSiteReferrer("basura", undefined)).toBe(false);
    expect(isSiteReferrer(undefined, undefined)).toBe(false);
  });
});

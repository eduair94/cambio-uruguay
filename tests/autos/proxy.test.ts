import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
vi.mock("axios", () => ({ default: { get: (...args: unknown[]) => get(...args) } }));
vi.mock("socks-proxy-agent", () => ({ SocksProxyAgent: class { constructor(public url: string) {} } }));
vi.mock("https-proxy-agent", () => ({ HttpsProxyAgent: class { constructor(public url: string) {} } }));

import { proxiedFetch, proxyList, proxyUrlOf, resetProxy, sourceUsesProxy } from "../../classes/autos/sources/proxy";

describe("which sources go through a proxy", () => {
  it("defaults to the two that block the VPS and can be changed or emptied", () => {
    expect(sourceUsesProxy("clasiautos", {})).toBe(true);
    expect(sourceUsesProxy("carone", {})).toBe(true);
    expect(sourceUsesProxy("mercadolibre", {})).toBe(false);
    expect(sourceUsesProxy("carone", { AUTOS_PROXY_SOURCES: "clasiautos" })).toBe(false);
    expect(sourceUsesProxy("clasiautos", { AUTOS_PROXY_SOURCES: "" })).toBe(false);
  });
  it("reads the rented list", () => {
    expect(proxyList({ AUTOS_PROXY_LIST: " 1.2.3.4:8800 , 5.6.7.8:8800 " })).toEqual(["1.2.3.4:8800", "5.6.7.8:8800"]);
    expect(proxyList({})).toEqual([]);
  });
});

describe("proxyUrlOf", () => {
  it("escapes credentials, so an @ or a % in the password cannot break the URL", () => {
    expect(proxyUrlOf("1.2.3.4:8800", "181046:v9NaPq4@vzh6d%")).toBe("http://181046:v9NaPq4%40vzh6d%25@1.2.3.4:8800");
    expect(proxyUrlOf("1.2.3.4:8800", undefined)).toBe("http://1.2.3.4:8800");
    expect(proxyUrlOf("socks5://9.9.9.9:1081", "a:b")).toBe("socks5://9.9.9.9:1081");
  });
});

describe("proxiedFetch", () => {
  const env = { ...process.env };
  beforeEach(() => {
    get.mockReset();
    resetProxy();
    process.env = { ...env, AUTOS_PROXY_LIST: "1.1.1.1:8800,2.2.2.2:8800", AUTOS_PROXY_AUTH: "user:pass", AUTOS_PROXY_GAP_MS: "0", AUTOS_PROXY_ATTEMPTS: "3" };
  });

  it("keeps the working proxy for the next page and never puts the password in the failure", async () => {
    get.mockResolvedValue({ status: 200, data: "<html>ok</html>" });
    expect(await proxiedFetch<string>("https://example.uy/a", "text")).toEqual({ body: "<html>ok</html>", failure: null });
    await proxiedFetch<string>("https://example.uy/b", "text");
    const agents = get.mock.calls.map(call => (call[1] as { httpsAgent: { url: string } }).httpsAgent.url);
    expect(agents).toEqual(["http://user:pass@1.1.1.1:8800", "http://user:pass@1.1.1.1:8800"]);
    expect(get.mock.calls[0]![1]).toMatchObject({ proxy: false });
    expect((get.mock.calls[0]![1] as { headers: Record<string, string> }).headers["user-agent"]).toMatch(/CambioUruguayBot/);
  });

  it("rotates while the PROXY is the problem", async () => {
    get.mockRejectedValueOnce(new Error("ECONNRESET"));
    get.mockResolvedValueOnce({ status: 403, data: "" });
    get.mockResolvedValueOnce({ status: 200, data: "ok" });
    expect(await proxiedFetch<string>("https://example.uy/a", "text")).toEqual({ body: "ok", failure: null });
    const agents = get.mock.calls.map(call => (call[1] as { httpsAgent: { url: string } }).httpsAgent.url);
    expect(new Set(agents).size).toBe(2);
  });

  it("does not rotate on an answer from the site itself", async () => {
    get.mockResolvedValue({ status: 404, data: "" });
    expect(await proxiedFetch<string>("https://example.uy/a", "text")).toEqual({ body: null, failure: "HTTP 404" });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("gives up after the configured attempts", async () => {
    get.mockResolvedValue({ status: 503, data: "" });
    expect(await proxiedFetch<string>("https://example.uy/a", "text")).toEqual({ body: null, failure: "HTTP 503" });
    expect(get).toHaveBeenCalledTimes(3);
  });
});

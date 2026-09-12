// What a failed request tells the harvester. A bare null made "the portal did not answer" read
// exactly like "the portal changed its page" in the run notes: on 2026-09-12 InfoCasas' five price
// ranges failed at 04:52 UTC, the same URLs parsed perfectly that afternoon, and nothing recorded
// which of the two it had been.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson, fetchText } from "../../classes/rentals/net";

afterEach(() => vi.unstubAllGlobals());

function recorder() {
  const seen: string[] = [];
  return { seen, onFailure: (reason: string) => { seen.push(reason); } };
}

describe("rental fetch failure reasons", () => {
  it("reports the HTTP status and does not retry a 4xx answer", async () => {
    const fetchMock = vi.fn(async () => new Response("denied", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const { seen, onFailure } = recorder();
    expect(await fetchText("https://portal.test/a", { retries: 2, unthrottled: true, onFailure })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(seen).toEqual(["HTTP 403"]);
  });

  it("reports the last status once the retries run out", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 502 }))
      .mockResolvedValueOnce(new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const { seen, onFailure } = recorder();
    expect(await fetchText("https://portal.test/b", { retries: 1, unthrottled: true, onFailure })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(seen).toEqual(["HTTP 503"]);
  });

  it("names the network error code without copying the message, which carries the address", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw Object.assign(new TypeError("fetch failed"), {
        cause: { code: "ECONNREFUSED", message: "connect ECONNREFUSED 10.0.0.1:9657" },
      });
    }));
    const { seen, onFailure } = recorder();
    expect(await fetchJson("https://bridge.test/search", { retries: 0, unthrottled: true, onFailure })).toBeNull();
    expect(seen).toEqual(["error de red ECONNREFUSED"]);
  });

  it("does not echo an error code that is not a plain identifier", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "connect 10.0.0.1:9657 refused" } });
    }));
    const { seen, onFailure } = recorder();
    await fetchJson("https://bridge.test/search", { retries: 0, unthrottled: true, onFailure });
    expect(seen).toEqual(["error de red"]);
  });

  it("reports a timeout with the limit it hit", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })));
    const { seen, onFailure } = recorder();
    expect(await fetchText("https://portal.test/c", { timeoutMs: 50, retries: 0, unthrottled: true, onFailure })).toBeNull();
    expect(seen).toEqual(["tiempo agotado (50 ms)"]);
  });

  it("reports a body that could not be read as the expected format", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>challenge</html>", { status: 200 })));
    const { seen, onFailure } = recorder();
    expect(await fetchJson("https://bridge.test/d", { retries: 0, unthrottled: true, onFailure })).toBeNull();
    expect(seen).toEqual(["cuerpo ilegible"]);
  });

  it("stays silent when the request succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"ok":true}', { status: 200 })));
    const { seen, onFailure } = recorder();
    expect(await fetchJson("https://bridge.test/e", { retries: 0, unthrottled: true, onFailure })).toEqual({ ok: true });
    expect(seen).toEqual([]);
  });
});

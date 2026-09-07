import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadServicePbf } from "../../classes/propertyservices/download";
import { SERVICE_SOURCE } from "../../classes/propertyservices/types";

const root = process.cwd();
const payload = Buffer.alloc(1_000_000, 42);
const checksum = createHash("md5").update(payload).digest("hex");
const dated = "https://download.geofabrik.de/south-america/uruguay-260906.osm.pbf";
let directory: string;
let fetchMock: ReturnType<typeof vi.fn>;
function redirect(location?: string, status = 302) {
  const cancel = vi.fn();
  const body = new ReadableStream({ cancel });
  return { response: new Response(body, { status, headers: location ? { location } : {} }), cancel };
}
function statusResponse(status: number, retryAfter?: string) {
  const cancel = vi.fn();
  return { cancel, response: new Response(new ReadableStream({ cancel }), {
    status, headers: retryAfter === undefined ? {} : { "retry-after": retryAfter },
  }) };
}
function fakeClock() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-09-07T03:00:00Z"));
}
async function firstRequest() {
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 1000 });
}
beforeEach(async () => {
  directory = await mkdtemp(join(root, ".sdd-property-services-download-test-"));
  vi.spyOn(process, "cwd").mockReturnValue(directory);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  if (!resolve(directory).startsWith(resolve(root) + sep)) throw new Error("Unsafe test cleanup path");
  await rm(directory, { recursive: true, force: true });
});
describe("official Geofabrik download redirects", () => {
  it("follows the current official 302 while preserving checksum, headers and one abort budget", async () => {
    const hop = redirect(dated);
    fetchMock.mockResolvedValueOnce(new Response(checksum + "  uruguay-latest.osm.pbf\n"))
      .mockResolvedValueOnce(hop.response).mockResolvedValueOnce(new Response(payload));
    const result = await downloadServicePbf();
    expect(await readFile(result.file)).toEqual(payload);
    expect(result.sourceSha256).toBe(createHash("sha256").update(payload).digest("hex"));
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([SERVICE_SOURCE + ".md5", SERVICE_SOURCE, dated]);
    const options = fetchMock.mock.calls.map(call => call[1]);
    expect(options.every(value => value.redirect === "manual" && value.signal === options[0].signal && value.headers === options[0].headers)).toBe(true);
    expect(options[0].headers["User-Agent"]).toContain("CambioUruguayBot");
    expect(hop.cancel).toHaveBeenCalledOnce();
  });
  it("accepts two bounded redirects and relative official checksum targets", async () => {
    const check = redirect("uruguay-260906.osm.pbf.md5", 307);
    const first = redirect("/south-america/uruguay-260905.osm.pbf", 301);
    const second = redirect(dated, 308);
    fetchMock.mockResolvedValueOnce(check.response).mockResolvedValueOnce(new Response(checksum))
      .mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response).mockResolvedValueOnce(new Response(payload));
    const result = await downloadServicePbf();
    expect(result.sourceSha256).toBe(createHash("sha256").update(payload).digest("hex"));
    expect(fetchMock.mock.calls[1][0]).toBe(dated + ".md5");
    for (const hop of [check, first, second]) expect(hop.cancel).toHaveBeenCalledOnce();
  });
  it.each([
    "https://evil.example/south-america/uruguay-260906.osm.pbf",
    "https://download.geofabrik.de.evil.example/south-america/uruguay-260906.osm.pbf",
    "http://download.geofabrik.de/south-america/uruguay-260906.osm.pbf",
    "https://download.geofabrik.de:8443/south-america/uruguay-260906.osm.pbf",
    "https://download.geofabrik.de/south-america/argentina-latest.osm.pbf",
    "https://download.geofabrik.de/south-america/uruguay-20260906.osm.pbf",
    dated + "?token=not-allowed",
    dated + "#fragment",
    "https://user:password@download.geofabrik.de/south-america/uruguay-260906.osm.pbf",
  ])("rejects a non-allowlisted destination before requesting it: %s", async destination => {
    const hop = redirect(destination);
    fetchMock.mockResolvedValueOnce(new Response(checksum)).mockResolvedValueOnce(hop.response);
    await expect(downloadServicePbf()).rejects.toThrow("not an official Uruguay extract");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(hop.cancel).toHaveBeenCalledOnce();
  });
  it("rejects loops without retrying or requesting the same URL again", async () => {
    const first = redirect(dated), second = redirect(SERVICE_SOURCE);
    fetchMock.mockResolvedValueOnce(new Response(checksum)).mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response);
    await expect(downloadServicePbf()).rejects.toThrow("redirect loop");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(first.cancel).toHaveBeenCalledOnce();
    expect(second.cancel).toHaveBeenCalledOnce();
  });
  it("refuses a third redirect and cancels its response body", async () => {
    const hops = [redirect(dated), redirect("uruguay-260905.osm.pbf"), redirect("uruguay-260904.osm.pbf")];
    fetchMock.mockResolvedValueOnce(new Response(checksum));
    for (const hop of hops) fetchMock.mockResolvedValueOnce(hop.response);
    await expect(downloadServicePbf()).rejects.toThrow("redirect limit");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const hop of hops) expect(hop.cancel).toHaveBeenCalledOnce();
  });
  it("fails closed when the redirect has no destination", async () => {
    const hop = redirect();
    fetchMock.mockResolvedValueOnce(hop.response);
    await expect(downloadServicePbf()).rejects.toThrow("missing destination");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(hop.cancel).toHaveBeenCalledOnce();
  });
});

describe("bounded transient Geofabrik failures", () => {
  it("backs off 1.5s then 3s for 503/502 and still validates the successful file", async () => {
    fakeClock();
    const first = statusResponse(503), second = statusResponse(502);
    const responses = [first.response, second.response, new Response(checksum), new Response(payload)];
    const times: number[] = [];
    fetchMock.mockImplementation(async () => { times.push(Date.now()); return responses.shift(); });
    const pending = downloadServicePbf();
    await firstRequest();
    await vi.advanceTimersToNextTimerAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersToNextTimerAsync();
    const result = await pending;
    expect(times.slice(0, 3).map(time => time - times[0])).toEqual([0, 1500, 4500]);
    expect(result.sourceSha256).toBe(createHash("sha256").update(payload).digest("hex"));
    expect(first.cancel).toHaveBeenCalledOnce();
    expect(second.cancel).toHaveBeenCalledOnce();
  });
  it.each([
    [429, "10", 10_000],
    [503, "Mon, 07 Sep 2026 03:00:20 GMT", 20_000],
    [500, "not-a-delay", 1500],
    [504, "-1", 1500],
  ])("honors bounded Retry-After or falls back to backoff (%s, %s)", async (status, retryAfter, delay) => {
    fakeClock();
    const busy = statusResponse(status, retryAfter);
    const responses = [busy.response, new Response(checksum), new Response(payload)];
    const times: number[] = [];
    fetchMock.mockImplementation(async () => { times.push(Date.now()); return responses.shift(); });
    const pending = downloadServicePbf();
    await firstRequest();
    await vi.advanceTimersToNextTimerAsync();
    await pending;
    if (retryAfter.startsWith("Mon,")) expect(times[1]).toBe(Date.parse(retryAfter));
    else expect(times[1] - times[0]).toBe(delay);
    expect(busy.cancel).toHaveBeenCalledOnce();
  });
  it("does not retry earlier when the server requests more than the bounded 60s pause", async () => {
    const busy = statusResponse(429, "120");
    fetchMock.mockResolvedValueOnce(busy.response);
    await expect(downloadServicePbf()).rejects.toThrow("checksum status 429");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(busy.cancel).toHaveBeenCalledOnce();
  });
  it.each([401, 403, 404, 451])("does not retry permanent status %s and releases its body", async status => {
    const response = statusResponse(status, "1");
    fetchMock.mockResolvedValueOnce(response.response);
    await expect(downloadServicePbf()).rejects.toThrow(`checksum status ${status}`);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.cancel).toHaveBeenCalledOnce();
  });
  it("stops after two extra attempts and releases all transient response bodies", async () => {
    fakeClock();
    const busy = [statusResponse(503), statusResponse(503), statusResponse(503)];
    for (const row of busy) fetchMock.mockResolvedValueOnce(row.response);
    const pending = downloadServicePbf().catch(error => error);
    await firstRequest();
    await vi.advanceTimersToNextTimerAsync();
    await vi.advanceTimersToNextTimerAsync();
    expect(await pending).toMatchObject({ message: "Geofabrik checksum status 503" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const row of busy) expect(row.cancel).toHaveBeenCalledOnce();
  });
  it("shares the five-minute budget across checksum, redirects and retry pauses", async () => {
    fakeClock();
    const first = statusResponse(503), second = statusResponse(503);
    const times: number[] = [];
    const responses = [redirect(dated).response, first.response, second.response];
    fetchMock.mockImplementation(() => {
      times.push(Date.now());
      if (times.length === 1) return new Promise(done => setTimeout(() => done(new Response(checksum)), 297_000));
      return Promise.resolve(responses.shift());
    });
    const pending = downloadServicePbf().catch(error => error);
    await firstRequest();
    await vi.advanceTimersToNextTimerAsync();
    await vi.advanceTimersToNextTimerAsync();
    expect(await pending).toMatchObject({ message: "Geofabrik download time budget exceeded" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(times[3] - times[0]).toBe(298_500);
    const signals = fetchMock.mock.calls.map(call => call[1].signal);
    expect(signals.every(signal => signal === signals[0])).toBe(true);
    expect(first.cancel).toHaveBeenCalledOnce();
    expect(second.cancel).toHaveBeenCalledOnce();
  });
  it("aborts an in-flight request at the same five-minute deadline without retrying", async () => {
    fakeClock();
    fetchMock.mockImplementation((_url, options) => new Promise((_done, fail) => {
      options.signal.addEventListener("abort", () => fail(options.signal.reason), { once: true });
    }));
    const pending = downloadServicePbf().catch(error => error);
    await firstRequest();
    await vi.advanceTimersToNextTimerAsync();
    expect(await pending).toMatchObject({ message: "Geofabrik download time budget exceeded" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it("still rejects a checksum mismatch after recovery and removes the temporary download", async () => {
    fakeClock();
    fetchMock.mockResolvedValueOnce(new Response(checksum)).mockResolvedValueOnce(statusResponse(503).response)
      .mockResolvedValueOnce(new Response(Buffer.alloc(1_000_000, 43)));
    const pending = downloadServicePbf().catch(error => error);
    await firstRequest();
    await vi.advanceTimersToNextTimerAsync();
    expect(await pending).toMatchObject({ message: "OSM checksum/size mismatch; active data retained" });
    expect(await readdir(join(directory, ".sdd-property-services-source"))).toEqual([]);
  });
});

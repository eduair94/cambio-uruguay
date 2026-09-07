import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

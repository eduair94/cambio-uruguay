// This refresh runs inside a scraper's slice of the sync loop (aguerrebere, pando
// and now prex all pull from it), so an unbounded call here stalls that origin the
// same way the dead Prex proxy did — and it is the exact bug class that took the
// sync down on 2026-08-13. There is already a cached-file fallback for failure;
// the timeout is what lets it be reached.
import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProxyFileService } from "../classes/ProxyFileService";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProxyFileService.getProxiesApi", () => {
  it("bounds the proxyscrape refresh", async () => {
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "1.2.3.4:1081\n5.6.7.8:1081" } as any);

    await ProxyFileService.getInstance().getProxiesApi();

    expect(get.mock.calls[0][1]?.timeout).toBeGreaterThan(0);
  });
});

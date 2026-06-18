import { describe, expect, it } from "vitest";
import { fetchImage, ogImageUrl } from "../src/report/image.js";

describe("ogImageUrl", () => {
  it("defaults to the static branded OG image", () => {
    expect(ogImageUrl("https://cambio-uruguay.com", "en", {})).toBe("https://cambio-uruguay.com/img/og.png");
  });
  it("honors an OG_IMAGE_URL override", () => {
    expect(ogImageUrl("https://x", "es", { OG_IMAGE_URL: "https://cdn/og.png" } as NodeJS.ProcessEnv)).toBe(
      "https://cdn/og.png"
    );
  });
});

describe("fetchImage", () => {
  it("returns null for non-image responses", async () => {
    const fake = (async () => new Response("nope", { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    expect(await fetchImage("https://x", fake)).toBeNull();
  });
  it("returns a buffer for image responses", async () => {
    const fake = (async () =>
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } })) as unknown as typeof fetch;
    const buf = await fetchImage("https://x", fake);
    expect(buf?.length).toBe(3);
  });
});

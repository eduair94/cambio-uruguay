import { decode, encode } from "jpeg-js";
import { describe, expect, it } from "vitest";
import {
  PHOTO_MAX_EDGE,
  dHash,
  hamming,
  mlJpegVariant,
  preparePhoto,
  preparePhotos,
} from "../../classes/vision/photos";

/** A JPEG whose content depends only on the RELATIVE position, so two sizes show the same scene. */
function scene(width: number, height: number, phase = 0): Buffer {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      const i = (y * width + x) * 4;
      data[i] = Math.round(127 + 120 * Math.sin(6 * u + phase));
      data[i + 1] = Math.round(127 + 120 * Math.cos(5 * v + phase));
      data[i + 2] = Math.round(255 * u * v);
      data[i + 3] = 255;
    }
  }
  return encode({ data, width, height }, 85).data;
}

const webpHeader = (width: number, height: number): Buffer => {
  // RIFF....WEBPVP8 with a lossy frame header carrying the size; enough for the sniffer and the size read.
  const b = Buffer.alloc(40);
  b.write("RIFF", 0, "latin1");
  b.writeUInt32LE(32, 4);
  b.write("WEBP", 8, "latin1");
  b.write("VP8 ", 12, "latin1");
  b.writeUInt16LE(width, 26);
  b.writeUInt16LE(height, 28);
  return Buffer.concat([b, Buffer.alloc(6000, 7)]);
};

describe("preparePhoto", { timeout: 20_000 }, () => {
  it("shrinks a big JPEG to 1024 on the long edge and re-encodes it as JPEG", () => {
    const photo = preparePhoto(scene(1920, 1440), PHOTO_MAX_EDGE)!;
    expect(photo).not.toBeNull();
    expect(photo.resized).toBe(true);
    expect(photo.mimeType).toBe("image/jpeg");
    expect([photo.width, photo.height]).toEqual([1024, 768]);
    const back = decode(photo.data, { useTArray: true });
    expect([back.width, back.height]).toEqual([1024, 768]);
    expect(photo.dhash).toMatch(/^[0-9a-f]{16}$/);
    expect(photo.sha1).toMatch(/^[0-9a-f]{40}$/);
  });

  it("leaves a photo that already fits as it came", () => {
    const original = scene(800, 600);
    const photo = preparePhoto(original, PHOTO_MAX_EDGE)!;
    expect(photo.resized).toBe(false);
    expect(photo.data.equals(original)).toBe(true);
    expect([photo.width, photo.height]).toEqual([800, 600]);
  });

  it("drops the placeholder-sized photo and the tiny file", () => {
    expect(preparePhoto(scene(338, 253), PHOTO_MAX_EDGE)).toBeNull();
    expect(preparePhoto(Buffer.alloc(2353, 1), PHOTO_MAX_EDGE)).toBeNull();
  });

  it("sends a WebP as it came, without a fingerprint, and drops a tiny WebP", () => {
    const photo = preparePhoto(webpHeader(1200, 900), PHOTO_MAX_EDGE)!;
    expect(photo.mimeType).toBe("image/webp");
    expect(photo.resized).toBe(false);
    expect(photo.dhash).toBeNull();
    expect([photo.width, photo.height]).toEqual([1200, 900]);
    expect(preparePhoto(webpHeader(320, 144), PHOTO_MAX_EDGE)).toBeNull();
  });

  it("refuses bytes that are no image Claude reads", () => {
    expect(preparePhoto(Buffer.from("<html>not a photo</html>".repeat(400)), PHOTO_MAX_EDGE)).toBeNull();
  });
});

describe("preparePhotos", { timeout: 20_000 }, () => {
  const big = scene(1600, 1200);
  const other = scene(1600, 1200, 2.4);

  it("drops the same bytes under two URLs and the same scene in another size", async () => {
    const files: Record<string, Buffer | null> = {
      a: big,
      b: big,
      c: scene(1200, 900),
      d: other,
      e: null,
    };
    const out = await preparePhotos(["a", "b", "c", "d", "e"], { fetcher: async url => files[url] ?? null });
    expect(out.photos.map(photo => photo.url)).toEqual(["a", "d"]);
    expect(out.photos.map(photo => photo.index)).toEqual([0, 3]);
    expect(out.skipped).toEqual({ small: 0, duplicate: 2, unreadable: 0, failed: 1 });
  });

  it("stops at max and counts small photos", async () => {
    const files: Record<string, Buffer> = { s: scene(300, 200), a: big, d: other };
    const out = await preparePhotos(["s", "a", "d"], { max: 1, fetcher: async url => files[url] });
    expect(out.photos.map(photo => photo.url)).toEqual(["a"]);
    expect(out.skipped.small).toBe(1);
  });

  it("gives up on a gallery after maxAttempts URLs", async () => {
    const asked: string[] = [];
    const out = await preparePhotos(["a", "b", "c", "d", "e"], {
      maxAttempts: 2,
      fetcher: async url => {
        asked.push(url);
        return null;
      },
    });
    expect(asked).toEqual(["a", "b"]);
    expect(out.skipped.failed).toBe(2);
  });

  it("drops an oversized photo it cannot shrink instead of sending it", async () => {
    const huge = Buffer.concat([webpHeader(9000, 6000), Buffer.alloc(10, 1)]);
    const out = await preparePhotos(["w"], { fetcher: async () => huge });
    expect(out.photos).toHaveLength(0);
    expect(out.skipped.unreadable).toBe(1);
  });

  it("asks Mercado Libre for the JPEG variant first and falls back to the original", async () => {
    const asked: string[] = [];
    const webp = "https://http2.mlstatic.com/D_NQ_NP_1-MLU2_082026-F.webp";
    const out = await preparePhotos([webp], {
      fetcher: async url => {
        asked.push(url);
        return url.endsWith(".jpg") ? null : webpHeader(1200, 900);
      },
    });
    expect(asked).toEqual([webp.replace(/\.webp$/, ".jpg"), webp]);
    expect(out.photos).toHaveLength(1);
    expect(out.photos[0].url).toBe(webp);
  });
});

describe("helpers", () => {
  it("rewrites only Mercado Libre WebP URLs", () => {
    expect(mlJpegVariant("https://http2.mlstatic.com/D_NQ_NP_1-MLU2-F.webp")).toBe("https://http2.mlstatic.com/D_NQ_NP_1-MLU2-F.jpg");
    expect(mlJpegVariant("https://casasweb.com/fotos/1.jpg")).toBe("https://casasweb.com/fotos/1.jpg");
  });

  it("counts differing bits", () => {
    expect(hamming("ff", "0f")).toBe(4);
    expect(hamming("0000000000000000", "0000000000000000")).toBe(0);
  });

  it("hashes a gradient left-to-right brighter as all zeros and the mirror as all ones", () => {
    const w = 9;
    const h = 8;
    const rising = new Uint8Array(w * h).map((_, i) => (i % w) * 20);
    const falling = new Uint8Array(w * h).map((_, i) => 200 - (i % w) * 20);
    expect(dHash(rising, w, h)).toBe("0000000000000000");
    expect(dHash(falling, w, h)).toBe("ffffffffffffffff");
  });
});

// Download the image attached to a Reddit post, so the composer can actually see what is being
// asked about.
//
// This matters more than it sounds. A large share of the money questions on these subs ARE the
// image: a screenshot of what the courier charged, a photo of the Aduanas notice, the bank app
// showing a rate. The title is often just "que es esto?" or "me llegó esto, es normal?" — text-only
// retrieval on that returns nothing useful, and a text-only composer answers a question it never
// read. Handing the picture to the model turns the worst-performing kind of thread into one of the
// best, because the answer is right there on the page the site already has.

import axios from "axios";

/** Reddit previews are a few hundred KB; anything past this is a mistake or a trap. */
const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 15000;

/** What the vision paths accept. Reddit serves the first three; gif is here to be REJECTED loudly. */
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface PostImage {
  data: Buffer;
  mimeType: string;
  /** Extension including the dot, for writing the file into a Claude workspace. */
  ext: string;
  bytes: number;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * Fetch the post's image. `null` for anything that is not a usable still image — never throws.
 *
 * An animated gif is deliberately refused rather than sent as its first frame: those threads are
 * memes, and a bot answering a meme with a link is the exact behaviour that gets it banned.
 */
export async function fetchPostImage(url: string | undefined): Promise<PostImage | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    const res = await axios.get<ArrayBuffer>(url, {
      timeout: TIMEOUT_MS,
      signal: AbortSignal.timeout(TIMEOUT_MS + 2000),
      responseType: "arraybuffer",
      maxRedirects: 3,
      maxContentLength: MAX_BYTES,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CambioUruguayBot/1.0)" },
    });
    if (res.status !== 200) return null;

    const mimeType = String(res.headers["content-type"] || "").split(";")[0]!.trim().toLowerCase();
    if (!ALLOWED.has(mimeType)) return null;

    const data = Buffer.from(res.data as ArrayBuffer);
    if (!data.length || data.length > MAX_BYTES) return null;

    return { data, mimeType, ext: EXT_BY_MIME[mimeType] ?? ".jpg", bytes: data.length };
  } catch {
    return null;
  }
}

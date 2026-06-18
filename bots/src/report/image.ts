// Share-image helper. Points at the Nuxt site's localized daily OG card
// (/api/og-daily). Channels use the URL; Twitter needs the raw bytes. Both
// degrade gracefully — a missing image just means text-only posts.

export function ogImageUrl(siteBaseUrl: string, _lang: string, env: NodeJS.ProcessEnv = process.env): string {
  // Override with OG_IMAGE_URL to point at a localized/dynamic card once one
  // exists; default is the site's static branded OG image (always available).
  if (env.OG_IMAGE_URL) return env.OG_IMAGE_URL;
  const base = siteBaseUrl.replace(/\/$/, "");
  return `${base}/img/og.png`;
}

export async function fetchImage(url: string, fetchImpl: typeof fetch = fetch): Promise<Buffer | null> {
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error("fetchImage failed:", err);
    return null;
  }
}

// These strings get posted to a real audience under the site's name, and a tweet
// cannot be edited after the fact. The tests are therefore about the two things
// that would be embarrassing in public: a post X rejects for length, and a link
// that 404s because a page was renamed.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CONTENT_PROMOS,
  formatContentPromo,
  TCO_URL_LENGTH,
  TWEET_LIMIT,
  tweetLength,
  type ContentPromo,
} from "../src/format/promos.js";
import { dayIndex } from "../src/store/promo_state.js";

const SITE = "https://cambio-uruguay.com";

// The app's catalogues, read as text — bots/ is a separate package and cannot
// import from app/. Hubs live in `siteNav.ts`; tool pages live in `tools.ts`
// under `/herramientas/<slug>`, which is why both files are needed here.
const appUtil = (name: string) =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "utils", name), "utf8");
const siteNav = appUtil("siteNav.ts");
const tools = appUtil("tools.ts");

/** True when the site declares `slug` as a real route, in either catalogue. */
function siteDeclares(slug: string): boolean {
  if (siteNav.includes(`to: '${slug}'`)) return true;
  const tool = slug.startsWith("/herramientas/") ? slug.slice("/herramientas/".length) : null;
  return tool !== null && tools.includes(`slug: '${tool}'`);
}

describe("the content catalogue", () => {
  it("is not empty and has no duplicate slugs", () => {
    expect(CONTENT_PROMOS.length).toBeGreaterThan(5);
    const slugs = CONTENT_PROMOS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only links to routes the site actually declares", () => {
    for (const promo of CONTENT_PROMOS) {
      expect(siteDeclares(promo.slug), promo.slug).toBe(true);
    }
  });

  it("uses absolute site paths, never a locale prefix or a trailing slash", () => {
    for (const promo of CONTENT_PROMOS) {
      expect(promo.slug, promo.slug).toMatch(/^\/[a-z0-9/-]+$/);
      expect(promo.slug.endsWith("/"), promo.slug).toBe(false);
      expect(/^\/(en|pt)\//.test(promo.slug), promo.slug).toBe(false);
    }
  });

  it("writes a hook that says something, and does not shout", () => {
    for (const promo of CONTENT_PROMOS) {
      expect(promo.hook.length, promo.slug).toBeGreaterThan(60);
      expect(promo.hook.trim(), promo.slug).toBe(promo.hook);
      // No shouting. The bound is 7 so real acronyms (BPS, IRPF, FONASA, MTSS)
      // pass and an all-caps word does not.
      expect(promo.hook, promo.slug).not.toMatch(/!{2,}|\p{Lu}{7,}/u);
    }
  });
});

describe("formatContentPromo", () => {
  it("fits inside a tweet for every entry, counting the link at its t.co cost", () => {
    for (const promo of CONTENT_PROMOS) {
      const tweet = formatContentPromo(promo, SITE);
      expect(tweetLength(tweet), `${promo.slug}: ${tweetLength(tweet)}`).toBeLessThanOrEqual(TWEET_LIMIT);
    }
  });

  it("ends with the canonical URL of the page", () => {
    for (const promo of CONTENT_PROMOS) {
      expect(formatContentPromo(promo, SITE).endsWith(`${SITE}${promo.slug}`), promo.slug).toBe(true);
    }
  });

  it("tolerates a trailing slash on the configured site URL", () => {
    const promo = CONTENT_PROMOS[0] as ContentPromo;
    expect(formatContentPromo(promo, "https://cambio-uruguay.com/")).toBe(
      formatContentPromo(promo, "https://cambio-uruguay.com")
    );
  });

  it("abbreviates an over-long hook on a word boundary instead of overflowing", () => {
    const long: ContentPromo = { slug: "/glosario", hook: "palabra ".repeat(60).trim() };
    const tweet = formatContentPromo(long, SITE);
    expect(tweetLength(tweet)).toBeLessThanOrEqual(TWEET_LIMIT);
    expect(tweet).toContain("…");
    expect(tweet).not.toContain("palabr…"); // cut between words, not inside one
  });

  it("counts a URL as 23 characters however long it really is", () => {
    expect(tweetLength("https://cambio-uruguay.com/a-very-long-path-that-keeps-going-and-going")).toBe(
      TCO_URL_LENGTH
    );
  });
});

describe("the storage-free rotation", () => {
  it("advances every day and wraps around the catalogue", () => {
    const day = (iso: string) => dayIndex(new Date(iso)) % CONTENT_PROMOS.length;
    expect(day("2026-08-18T12:00:00Z")).not.toBe(day("2026-08-17T12:00:00Z"));
    // Same day, different hour: same pick, so a retry does not skip an entry.
    expect(day("2026-08-17T01:00:00Z")).toBe(day("2026-08-17T23:00:00Z"));
    expect(day("2026-08-17T12:00:00Z")).toBe(
      dayIndex(new Date("2026-08-17T12:00:00Z")) % CONTENT_PROMOS.length
    );
  });
});

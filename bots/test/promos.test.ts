// These strings get posted to a real audience under the site's name, and a tweet
// cannot be edited after the fact. The tests are therefore about the two things
// that would be embarrassing in public: a post X rejects for length, and a link
// that 404s because a page was renamed.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DAILY_GUIDES, formatDailyGuide } from "../src/format/guides.js";
import { L } from "../src/format/i18n.js";
import { TG_GUIDE_RESERVE } from "../src/format/messages.js";
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
// under `/herramientas/<slug>`; the editorial guides live in `guides.ts` and
// its sibling modules (`guides<Tema>.ts`) under `/guias/<slug>`, which is why
// all three families are needed here.
const APP_UTILS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "utils");
const appUtil = (name: string) => readFileSync(join(APP_UTILS, name), "utf8");
const siteNav = appUtil("siteNav.ts");
const tools = appUtil("tools.ts");
const guideModules = readdirSync(APP_UTILS).filter((f) => /^guides[A-Za-z]*\.ts$/.test(f));
const guides = guideModules.map(appUtil).join("\n");

/** True when the site declares `slug` as a real route, in any catalogue. */
function siteDeclares(slug: string): boolean {
  if (siteNav.includes(`to: '${slug}'`)) return true;
  const tool = slug.startsWith("/herramientas/") ? slug.slice("/herramientas/".length) : null;
  if (tool !== null) return tools.includes(`slug: '${tool}'`);
  const guide = slug.startsWith("/guias/") ? slug.slice("/guias/".length) : null;
  return guide !== null && guides.includes(`slug: '${guide}'`);
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

// The daily guide goes out EVERY day inside the Telegram photo caption, so on top
// of the X catalogue's rules it has to fit a hard reserve and survive Telegram's
// legacy Markdown, which returns 400 (and drops the whole post) on a stray `*`.
describe("the daily-guide catalogue", () => {
  it("reads the guide modules the site really ships", () => {
    // If this list shrinks to nothing the route check below would pass vacuously.
    expect(guideModules).toContain("guides.ts");
    expect(guideModules.length).toBeGreaterThan(5);
  });

  it("has the hand-written set, with no duplicate slugs", () => {
    expect(DAILY_GUIDES.length).toBe(25);
    const slugs = DAILY_GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only links to /guias/ routes the site actually declares", () => {
    for (const guide of DAILY_GUIDES) {
      expect(guide.slug.startsWith("/guias/"), guide.slug).toBe(true);
      expect(siteDeclares(guide.slug), guide.slug).toBe(true);
    }
  });

  it("uses absolute site paths, never a locale prefix or a trailing slash", () => {
    for (const guide of DAILY_GUIDES) {
      expect(guide.slug, guide.slug).toMatch(/^\/[a-z0-9/-]+$/);
      expect(guide.slug.endsWith("/"), guide.slug).toBe(false);
      expect(/^\/(en|pt)\//.test(guide.slug), guide.slug).toBe(false);
    }
  });

  it("writes a hook that says something, without figures, month names or shouting", () => {
    const months =
      /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\b/i;
    for (const guide of DAILY_GUIDES) {
      expect(guide.hook.length, guide.slug).toBeGreaterThanOrEqual(60);
      expect(guide.hook.length, guide.slug).toBeLessThanOrEqual(140);
      expect(guide.hook.trim(), guide.slug).toBe(guide.hook);
      // Mechanism over magnitude: a digit is a figure, and figures go stale.
      expect(guide.hook, guide.slug).not.toMatch(/\d/);
      expect(guide.hook, guide.slug).not.toMatch(months);
      expect(guide.hook, guide.slug).not.toMatch(/!{2,}|\p{Lu}{7,}/u);
    }
  });

  it("never carries a legacy-Markdown delimiter Telegram could choke on", () => {
    for (const guide of DAILY_GUIDES) {
      expect(guide.hook, guide.slug).not.toMatch(/[*_`[\]()]/);
    }
  });

  it("fits the caption reserve in every language, URL and label included", () => {
    for (const lang of ["es", "en", "pt"] as const) {
      for (const guide of DAILY_GUIDES) {
        const block = formatDailyGuide(guide, SITE, L(lang).guideOfTheDay);
        expect(block.length, `${lang} ${guide.slug}: ${block.length}`).toBeLessThanOrEqual(TG_GUIDE_RESERVE);
        expect(block.endsWith(`${SITE}${guide.slug}`), guide.slug).toBe(true);
      }
    }
  });

  it("tolerates a trailing slash on the configured site URL", () => {
    const guide = DAILY_GUIDES[0]!;
    expect(formatDailyGuide(guide, `${SITE}/`, "x")).toBe(formatDailyGuide(guide, SITE, "x"));
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

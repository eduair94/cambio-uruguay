// The channel catalogue is hand-curated and hand-verified: every id in it was confirmed by reading
// that channel's real Atom feed. These checks are the cheap half of that discipline — the half a
// typo can break — so that the expensive half (does the feed answer, is it in Spanish, is it about
// money) is the only thing left to a human.
import { describe, expect, it } from "vitest";
import { VIDEO_CHANNELS } from "../../classes/videos/channels";

describe("channel catalogue", () => {
  it("is not empty", () => {
    expect(VIDEO_CHANNELS.length).toBeGreaterThan(5);
  });

  it("has unique keys and unique YouTube ids", () => {
    // The same channel entered twice would double every one of its videos in the list.
    const ids = VIDEO_CHANNELS.map(c => c.id);
    const channelIds = VIDEO_CHANNELS.map(c => c.channelId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(channelIds).size).toBe(channelIds.length);
  });

  it("addresses every channel by a well-formed UC id", () => {
    // A handle where a channel id belongs produces a 404 feed and a channel that is silently down
    // forever. YouTube channel ids are always `UC` + 22 url-safe characters.
    for (const channel of VIDEO_CHANNELS) {
      expect(channel.channelId, channel.id).toMatch(/^UC[A-Za-z0-9_-]{22}$/);
    }
  });

  it("uses kebab-case keys", () => {
    for (const channel of VIDEO_CHANNELS) {
      expect(channel.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("writes the handle the way the page links it", () => {
    // The page builds `https://www.youtube.com/${handle}`, so a handle without its @ is a 404.
    for (const channel of VIDEO_CHANNELS) {
      if (channel.handle) expect(channel.handle, channel.id).toMatch(/^@[A-Za-z0-9._-]+$/);
    }
  });

  it("gives every channel a name, a country and a blurb the page can print", () => {
    for (const channel of VIDEO_CHANNELS) {
      expect(channel.name, channel.id).toBeTruthy();
      expect(channel.country, channel.id).toMatch(/^[A-Z]{2,8}$/);
      expect(channel.blurb.length, channel.id).toBeGreaterThan(20);
    }
  });

  it("keeps weights inside the scale the scorer expects", () => {
    for (const channel of VIDEO_CHANNELS) {
      expect([1, 2, 3]).toContain(channel.weight);
    }
  });

  it("gives Uruguayan channels the top weights", () => {
    // The page is for Uruguayans: a foreign channel outranking a local one on weight alone would
    // mean the scoring bonus for `country === 'UY'` is doing all the work by itself.
    for (const channel of VIDEO_CHANNELS) {
      if (channel.weight === 3) expect(channel.country, channel.id).toBe("UY");
    }
  });

  it("still leads with Uruguay", () => {
    // The failure this guards against is drift, not a single bad row: a catalogue that fills up
    // with excellent Spanish and Mexican channels stops being a page about Uruguay.
    const uruguayan = VIDEO_CHANNELS.filter(c => c.country === "UY");
    expect(uruguayan.length).toBeGreaterThanOrEqual(Math.ceil(VIDEO_CHANNELS.length / 2));
  });

  it("marks the generalist channels as needing a filter", () => {
    // A newscast whose whole feed is published unfiltered turns the page into football and crime.
    const generalists = VIDEO_CHANNELS.filter(c => c.kind === "medio" && !c.needsFilter);
    for (const channel of generalists) {
      // A `medio` may legitimately be exempt, but only when its entire channel is economy — say so
      // in the blurb, so the exemption is a decision somebody wrote down rather than an omission.
      expect(channel.blurb.toLowerCase(), `${channel.id} justifies needsFilter:false`).toMatch(
        /econom|financ|negocio|mercado/
      );
    }
  });
});

# Tier 2 — content syndication + social

Content is already written (your Medium articles). This is mostly re-posting + two one-shot launches.

---

## A. Dev.to + Hashnode cross-posts

You already have 3 articles in [docs/medium-articles/](../medium-articles/):
- `en-exchange-rates-uruguay.md` (EN)
- `es-dolar-hoy-uruguay.md` (ES)
- `pt-cotacao-dolar-uruguai.md` (PT)

**Dev.to is English-dev audience → post the EN one.** Hashnode too. (ES/PT stay Medium-only; dev.to won't rank them.)

### Dev.to steps
1. https://dev.to → sign in with GitHub → "Create Post".
2. Paste the body of `en-exchange-rates-uruguay.md`.
3. Top of the editor, set frontmatter:
```yaml
---
title: Currency Exchange in Uruguay: How to Find the Best Rate Before You Trade
published: true
tags: webdev, api, opensource, finance
canonical_url: https://cambio-uruguay.com
---
```
4. **canonical_url** → point to the site (clean URL) so there's no duplicate-content penalty; body links stay and get indexed. Want Medium as canonical instead? Paste this as **one unbroken line, no trailing space** (dev.to rejects any space/line-break in the URL): `https://cambio-uruguay.medium.com/currency-exchange-in-uruguay-how-to-find-the-best-rate-before-you-trade-3a5fd46e3fc4` — or just omit the field.

> **dev.to gotcha:** "canonical_url is not a valid URL, must not have spaces" = the URL wrapped or picked up a trailing space on paste. Use the short `https://cambio-uruguay.com` to avoid it, or delete the line.
5. Add a cover image (homepage table screenshot).
6. Publish.

> dev.to links from new accounts are `nofollow`; they turn dofollow as your account gains rep. Value now = referral + indexing. Same for Hashnode.

### Hashnode steps
- https://hashnode.com → create (personal blog is free) → same body, same canonical_url, tags: `finance`, `api`, `opensource`, `uruguay`. Publish.

### Bonus: a *developer* post (fresh, not a cross-post)
Write one short "I built an MCP server for live Uruguay FX rates" post on dev.to. This is catnip for the dev audience and links your repo + site. Outline:
- Problem: comparing casa de cambio rates manually.
- What you built: site + public API + MCP server (show the `npx` snippet + Claude config).
- Link repo + https://mcp.cambio-uruguay.com/mcp + site.
- Tags: `mcp`, `ai`, `typescript`, `opensource`.

Want me to draft this one fully? Ask and I'll write it.

---

## B. Show HN (Hacker News) — one shot

Dev/maker audience. The MCP + open-source + public-API angle sells here; a plain "currency site" does not.

- Post at https://news.ycombinator.com/submit
- **Title:** `Show HN: MCP server + open API for live Uruguay exchange rates`
- **URL:** https://github.com/eduair94/cambio-uruguay  (or the site — repo tends to do better on HN)
- **First comment (post immediately after):**

> I built cambio-uruguay.com to stop walking around Montevideo comparing dollar rates. It tracks live buy/sell rates across 40+ Uruguayan exchange houses and banks, with a map, history charts and converters. Recently I opened up the data: a free read-only public API (api.cambio-uruguay.com, no key) and an MCP server (`npx cambio-uruguay-mcp` or a hosted HTTP endpoint) so AI assistants can pull live rates. It's open source (MIT), TypeScript, TDD'd. Happy to answer anything about the scraping/normalization across houses or the MCP design.

**Timing:** weekday ~08:00–10:00 US Eastern. Don't ask for upvotes. Reply to every comment. If it flops, that's normal — you can resubmit a genuinely different angle later.

---

## C. Reddit — genuine value only

Reddit nukes self-promo. Rule: **9 helpful comments : 1 link.** Comment in existing threads where the tool genuinely answers the question; link only then.

### Subreddits + angle

| Subreddit | Angle | Link to |
|-----------|-------|---------|
| r/uruguay | "dólar hoy / dónde cambiar" threads | site (ES) |
| r/solotravel, r/travel | "money in Uruguay / best way to exchange" | /retirar-efectivo-uruguay |
| r/digitalnomad, r/expats | living costs / banking Uruguay | site + /indicadores |
| r/SideProject | show the build (allowed there) | repo + site |
| r/webdev | "I open-sourced an MCP server + API" | repo |
| r/InternetIsBeautiful | the comparison tool itself | site |

### r/SideProject post (allowed, ready copy)
- **Title:** I built a free tool that compares live dollar rates across 40+ Uruguay exchange houses (+ open API & MCP server)
- **Body:**

> After too many afternoons walking Montevideo comparing casa de cambio rates, I built cambio-uruguay.com — it pulls live buy/sell rates from 40+ exchange houses and banks and shows who's best right now, plus a branch map, history charts and converters. It's trilingual and free.
>
> The part I had most fun with: I opened the data as a free public API (no key) and an MCP server so AI assistants like Claude can fetch live rates. All open source (MIT, TypeScript): github.com/eduair94/cambio-uruguay
>
> Feedback welcome — especially on the rate-normalization across houses.

> For r/uruguay: **don't lead with the link.** Answer a real "¿dónde conviene cambiar?" thread, then "armé esto que compara todas las casas: cambio-uruguay.com". Post it cold in r/uruguay and it gets removed as spam.

---

## Checklist

- [ ] Dev.to cross-post (EN) with canonical
- [ ] Hashnode cross-post (EN)
- [ ] (optional) fresh dev.to "I built an MCP server" post
- [ ] Show HN + first comment
- [ ] r/SideProject post
- [ ] r/webdev post (repo/MCP angle)
- [ ] Start answering r/uruguay + r/solotravel threads (ongoing)

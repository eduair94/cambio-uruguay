# Tier 1 — registries + directories (highest ROI, start here)

You have an **MCP server + public API + npm package + open-source repo**. That unlocks a pile of free, high-authority listings with near-zero rejection. Do these first.

Copy text from [copy-blocks.md](./copy-blocks.md).

---

## A. MCP server registries

Your server: `cambio-uruguay-mcp` (npm) + hosted `https://mcp.cambio-uruguay.com/mcp`. Repo: github.com/eduair94/cambio-uruguay (dir `mcp`).

**First, tag the repo** so auto-indexers find it. On GitHub → repo → ⚙ (About) → Topics → add: `mcp`, `model-context-protocol`, `mcp-server`. (Glama and others auto-crawl the `mcp` topic.) — *you, 1 min.*

Then submit to:

| Registry | How | Link |
|----------|-----|------|
| **Glama** | Auto-indexes GitHub `mcp` topic; can also submit manually | https://glama.ai/mcp/servers |
| **MCP.so** | Submit form | https://mcp.so/submit |
| **PulseMCP** | Submit form | https://www.pulsemcp.com/submit |
| **Smithery** | Connect GitHub repo, it packages remote/stdio | https://smithery.ai/new |
| **mcpservers.org** | PR to their list repo | https://github.com/modelcontextprotocol/servers (community section) or https://mcpservers.org |
| **Cursor Directory** (MCP) | Submit | https://cursor.directory/mcp |
| **mcp-get** | PR | https://github.com/michaellatman/mcp-get |

### Official MCP Registry — `server.json` is written + schema-validated ✅

[mcp/server.json](../../mcp/server.json) is ready and `mcpName` is added to [mcp/package.json](../../mcp/package.json). Two publish paths:

**Path A — remote-only (fastest, no npm work):** the hosted endpoint alone is enough. Delete the `packages` block from a copy of server.json, then:
```bash
# one-time: install the CLI (see github.com/modelcontextprotocol/registry releases)
mcp-publisher login github          # opens device auth as eduair94
mcp-publisher publish               # from the dir with server.json
```
GitHub login proves ownership of the `io.github.eduair94/*` namespace. Done.

**Path B — with npm package (better UX, needs a republish):** the registry checks the *published* npm package contains `mcpName`. It's now in package.json but not in the live 0.1.0. So:
```bash
cd mcp
npm version patch                   # 0.1.0 -> 0.1.1 (bump server.json version to match)
npm run build && npm publish
mcp-publisher login github && mcp-publisher publish
```

Once published, Glama/PulseMCP/others that sync from the official registry pick it up automatically.

**Ready description** = "Developer-angle" block in copy-blocks.md.
**Install snippet** to paste when asked:
```json
{ "mcpServers": { "cambio-uruguay": { "command": "npx", "args": ["-y", "cambio-uruguay-mcp"] } } }
```
Remote: `{ "mcpServers": { "cambio-uruguay": { "url": "https://mcp.cambio-uruguay.com/mcp" } } }`

### Awesome-MCP lists (GitHub PR — DOFOLLOW)

Fork, add one line under the right category (Finance / Data), open PR. Entry to paste:

```markdown
- [cambio-uruguay](https://github.com/eduair94/cambio-uruguay) — Live Uruguayan exchange-rate data (every casa de cambio, best house to buy/sell, conversion, history, news). npx or hosted HTTP. ([cambio-uruguay.com](https://cambio-uruguay.com))
```

Target repos (add to as many as accept it):
- https://github.com/punkpeye/awesome-mcp-servers  ← biggest, do this one
- https://github.com/wong2/awesome-mcp-servers
- https://github.com/appcypher/awesome-mcp-servers

> Read each repo's CONTRIBUTING/README for exact category + alphabetical placement before the PR.

---

## B. Public API directories

Your API: `https://api.cambio-uruguay.com` — read-only, HTTPS, no auth key. Fits their rules perfectly.

### public-apis/public-apis (GitHub PR — DOFOLLOW, high authority)

The big one. Fork https://github.com/public-apis/public-apis , add under the **Currency Exchange** section (keep alphabetical), open PR. Row to paste:

```markdown
| [Cambio Uruguay](https://cambio-uruguay.com) | Live buy/sell rates from 40+ Uruguayan exchange houses and banks | No | Yes | Yes |
```

Columns are: API | Description | Auth | HTTPS | CORS. Read their [CONTRIBUTING](https://github.com/public-apis/public-apis/blob/master/CONTRIBUTING.md) first — **one entry per PR**, description ≤ ~100 chars, no trailing period issues. This PR gets scrutinized; follow the template exactly or it's auto-closed.

### Other API listings

| Directory | How | Notes |
|-----------|-----|-------|
| **FreePublicAPIs** | Submit form | https://www.freepublicapis.com/submit — easy |
| **APIs.guru** | PR, needs OpenAPI spec | https://github.com/APIs-guru/openapi-directory — **only if** you publish a Swagger/OpenAPI file. Medium effort, skip unless you want it. |
| **publicapis.dev / apislist** | Submit | mirrors of public-apis, lower value |
| **RapidAPI Hub** | List your API (account) | https://rapidapi.com/provider — bigger effort, optional |

> ProgrammableWeb is dead (shut down 2022). Don't bother.

---

## C. App / product / launch directories

Free listings, each = a backlink + referral. Use Medium/Long description + screenshots from copy-blocks.md.

| Directory | Link | Dofollow? | Effort |
|-----------|------|-----------|--------|
| **AlternativeTo** | https://alternativeto.net (submit app) | often dofollow | list as alt to XE/Wise |
| **SaaSHub** | https://www.saashub.com/submit | dofollow | easy |
| **Product Hunt** | https://www.producthunt.com/posts/new | nofollow but big traffic | needs a launch day — see below |
| **Uneed** | https://www.uneed.best/submit-a-tool | mix | easy |
| **Fazier** | https://fazier.com | mix | easy |
| **Peerlist** | https://peerlist.io | — | dev-friendly |
| **Startup Stash** | https://startupstash.com | — | easy |
| **BetaList** | https://betalist.com/submit | — | for newer products |
| **Toolify / Turbo0 / Dang.ai** | search each + submit | — | AI-tool angle (you have MCP + AI insights) |

### Product Hunt (do it right, once)

Highest-traffic single launch. Rules:
- Pick a **Tuesday–Thursday**, post 00:01 PT.
- Need: logo, tagline, gallery (3–5 shots + ideally a 30s screen-record), first comment from you (maker) explaining the "why".
- Rally: DM a few friends to check it out that day. Don't ask for upvotes directly (against rules) — ask for feedback.
- Tagline: use the ≤100 char tagline. First comment: use Long description + your story building it.

---

## Do-first checklist

- [ ] Add GitHub topics `mcp` `mcp-server` `model-context-protocol` to repo
- [ ] Glama + MCP.so + PulseMCP + Smithery submissions
- [ ] PR to punkpeye/awesome-mcp-servers
- [ ] PR to public-apis/public-apis (Currency Exchange)
- [ ] FreePublicAPIs submit
- [ ] AlternativeTo + SaaSHub listings
- [ ] Schedule a Product Hunt launch day

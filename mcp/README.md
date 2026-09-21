# cambio-uruguay-mcp

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets any AI assistant (Claude, ChatGPT, Cursor, Cline, …) **search Uruguay**: rentals ranked for a whole household, fair rent and neighbourhoods, property and used-car opportunities, used cars, product prices, and live exchange rates across every casa de cambio.

Read-only wrapper over the public [cambio-uruguay.com](https://cambio-uruguay.com) API. No account, no API key, no scraping.

## Quick start (local, stdio)

No install needed — run it with `npx`:

```bash
npx cambio-uruguay-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "cambio-uruguay": {
      "command": "npx",
      "args": ["-y", "cambio-uruguay-mcp"]
    }
  }
}
```

### Cursor

`.cursor/mcp.json` (or Settings → MCP):

```json
{
  "mcpServers": {
    "cambio-uruguay": { "command": "npx", "args": ["-y", "cambio-uruguay-mcp"] }
  }
}
```

### Cline / Continue / other stdio clients

Same shape: command `npx`, args `["-y", "cambio-uruguay-mcp"]`.

## Hosted endpoint (remote, no install)

A public Streamable-HTTP endpoint is available for clients that support remote MCP servers:

```
https://mcp.cambio-uruguay.com/mcp
```

```json
{
  "mcpServers": {
    "cambio-uruguay": { "url": "https://mcp.cambio-uruguay.com/mcp" }
  }
}
```

It is stateless and read-only.

## Toolsets

26 read-only tools in four toolsets. The hosted endpoint serves all of them at `/mcp`, or one
toolset per path so a client only loads what it needs:

| Path | Toolset | What it covers |
|---|---|---|
| `/mcp` | all | everything below |
| `/mcp/alquileres` | rentals | ~57,000 rental homes from 5 portals, household ranking, fair rent, neighbourhoods, opportunities |
| `/mcp/autos` | used cars | ~19,000 used cars from 10 sources, opportunities, declared risks, model prices, market report |
| `/mcp/productos` | products | phones, desk chairs, 38 home categories, e-mobility, online-store signals, supermarket prices |
| `/mcp/cambio` | exchange rates | the original 7 tools |

For stdio set `MCP_TOOLSETS=alquileres,autos` (default: all).

### Rentals (`alquileres`)

| Tool | Description |
|---|---|
| `search_rentals` | The whole rental directory with every filter: neighbourhoods, type, bedrooms, m², price in pesos, **monthly total with common expenses**, pets, parking, furnished, accepted guarantee (ANDA, Contaduría, insurer, deposit, BHU), amenities, owner-direct, portal, free text, near a point + radius, neighbourhood quality (few crime reports, few water cuts). |
| `rank_rentals_for_household` | The personalised one: scores every current home for a household of 1–8 people with incomes, remote days and up to 4 daily destinations each (work/study, days per week, travel mode). Budget share, what is left each month, distance per person and destination, reasons and warnings. |
| `get_rental` | One home: every advert that publishes it (price per portal), description, amenities, guarantee text, market comparison, similar homes, neighbourhood profile. |
| `rental_market_stats` | Median and typical range of rent, common expenses, monthly total and price per m², by department/neighbourhood/type/bedrooms; cheapest and priciest neighbourhoods. |
| `estimate_fair_rent` | Fair-rent estimate for a specific home from comparable adverts, and where an asking price sits. |
| `compare_neighborhoods` | Neighbourhoods side by side: prices, crime reports by type, water cuts, municipal complaints, nearby services, rank among the 62 of Montevideo. |
| `find_property_opportunities` | Homes asked below comparable adverts (rent or sale) with the evidence and cautions behind each gap. |
| `geocode_uy_address` | Address or intersection → coordinates (IDE Uruguay). |

### Used cars (`autos`)

| Tool | Description |
|---|---|
| `search_used_cars` | Brand/model by plain name, year, km, price (US$), max L/100 km, fuel, gearbox, body, doors, colour, department, dealer or private, source, price drops, only opportunities, no declared risk, listed in the last N days. |
| `find_car_opportunities` | Cars asked below their fixed cohort (model + year + trim + engine + gearbox, comparable km), with the sample behind each gap. |
| `get_car` | One advert against its cohort, the ML price guide, declared risks quoted, similar cars. |
| `car_model_prices` | A model by year and version, the ML guide, the opportunities and cheapest adverts of the model. |
| `car_declared_risks` | Adverts whose seller declares debt, paperwork, crash, recovered theft, mechanical issues, foreign plates or heavy use, with the quote and the discount against clean cohorts. |
| `car_market_report` | Market report sections: overview, what each budget buys, depreciation per model, negotiation margin, dealer vs private, valuation effects. |

### Products (`productos`)

| Tool | Description |
|---|---|
| `search_products` | One search over phones, desk chairs, 38 home categories and e-scooters/e-bikes: cheapest plausible offer with seller and link, typical new/used band, used savings. |
| `plan_home_setup` | What equipping an empty home costs (minimal/decent/complete), minus what the person already has; says when a total is partial. |
| `check_online_store` | Dated trust signals of an online store (domain age, Google, Trustpilot, Reddit mentions, policies, payments). Never a verdict. |
| `supermarket_prices` | Official SIPC prices per article and the cheapest supermarkets of a department by matched basket. |
| `list_directories` | Every directory of the site, its size and link. |

### Exchange rates (`cambio`)

| Tool | Description |
|---|---|
| `get_rates` | Buy/sell for a currency across all houses: market average, best buy/sell house, lowest spread, per-house list. |
| `best_house` | The single best casa de cambio to **buy** (lowest sell) or **sell** (highest buy) a currency now. |
| `convert` | Convert an amount between currencies at the best market rates (foreign↔foreign routes through UYU). |
| `list_houses` | Every tracked exchange house with name, website, and departments served. |
| `get_evolution` | Historical series + stats (min/max/avg/current/change) for a house + currency over N months. |
| `get_news` | Latest Uruguayan dollar/economy headlines (Google News), de-duplicated, newest first. |
| `daily_summary` | AI market analysis (whole-market, or per-currency when `currency` is given). `lang` es \| en \| pt. |

> Rate convention: to **buy** a currency a house sells it to you (best = lowest `sell`); to **sell** it a house buys from you (best = highest `buy`). BCU and interbank quotes are excluded from market math.

### Prompts

`buscar-alquiler`, `evaluar-aviso-alquiler`, `comparar-barrios`, `buscar-auto-usado`, `evaluar-auto`,
`equipar-casa` and `analizar-dolar-hoy`: guided workflows (interview, chain the tools, short list with links).
The server also sends **instructions** at initialisation with the domain rules, so answers stay
good even without the skill.

## Skill (Claude)

`skills/buscador-uruguay/` is an [Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills)
that teaches the workflow and the Uruguayan domain rules, and falls back to the public HTTP API when
no MCP is connected. Download the zip from
[cambio-uruguay.com/descargas/buscador-uruguay-skill.zip](https://cambio-uruguay.com/descargas/buscador-uruguay-skill.zip)
and upload it in Claude (Settings → Capabilities → Skills), or copy the folder to `~/.claude/skills/`
for Claude Code. After editing it run `npm run pack-skill` (a test fails if the zip drifts).

Step-by-step for every client: [cambio-uruguay.com/buscar-con-ia](https://cambio-uruguay.com/buscar-con-ia).

## Configuration

| Env var | Purpose | Default |
|---|---|---|
| `MCP_TRANSPORT` | `stdio` or `http` | `stdio` |
| `MCP_HTTP_PORT` | Port for the HTTP transport | `8788` |
| `API_BASE_URL` | Upstream rates API (toolset cambio) | `https://api.cambio-uruguay.com` |
| `SITE_BASE_URL` | Upstream site API for rentals, cars and products | `https://cambio-uruguay.com` |
| `MCP_TOOLSETS` | stdio only: comma list of toolsets (`cambio`, `alquileres`, `autos`, `productos`) | all |

## Development

```bash
npm install
npm test          # vitest — pure tool handlers
npm run build     # tsc → dist
npm run dev       # run from source (tsx)
npm run inspect   # MCP Inspector against the source server
npm run smoke     # every site-backed tool against production (network)
npm run pack-skill # rebuild the downloadable skill zip
```

## License

[MIT](./LICENSE) — part of the open-source [cambio-uruguay](https://github.com/eduair94/cambio-uruguay) project.

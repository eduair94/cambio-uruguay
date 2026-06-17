# cambio-uruguay-mcp

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io) server exposing **live Uruguayan exchange-rate data** — every casa de cambio, the best house to buy or sell, currency conversion, and rate history — to any MCP-capable AI assistant (Claude Desktop, Cursor, Cline, …).

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

## Tools

| Tool | Description |
|---|---|
| `get_rates` | Buy/sell for a currency across all houses: market average, best buy/sell house, lowest spread, per-house list. |
| `best_house` | The single best casa de cambio to **buy** (lowest sell) or **sell** (highest buy) a currency now. |
| `convert` | Convert an amount between currencies at the best market rates (foreign↔foreign routes through UYU). |
| `list_houses` | Every tracked exchange house with name, website, and departments served. |
| `get_evolution` | Historical series + stats (min/max/avg/current/change) for a house + currency over N months. |
| `get_news` | Latest Uruguayan dollar/economy headlines (Google News), de-duplicated, newest first. |
| `daily_summary` | AI market analysis (whole-market, or per-currency when `currency` is given). `lang` es \| en \| pt. |

Plus a prompt, `analizar-dolar-hoy`, that chains the tools into a one-shot Spanish summary of today's dollar market.

> Rate convention: to **buy** a currency a house sells it to you (best = lowest `sell`); to **sell** it a house buys from you (best = highest `buy`). BCU and interbank quotes are excluded from market math.

## Configuration

| Env var | Purpose | Default |
|---|---|---|
| `MCP_TRANSPORT` | `stdio` or `http` | `stdio` |
| `MCP_HTTP_PORT` | Port for the HTTP transport | `8788` |
| `API_BASE_URL` | Upstream cambio-uruguay API base | `https://api.cambio-uruguay.com` |

## Development

```bash
npm install
npm test          # vitest — pure tool handlers
npm run build     # tsc → dist
npm run dev       # run from source (tsx)
npm run inspect   # MCP Inspector against the source server
```

## License

[MIT](./LICENSE) — part of the open-source [cambio-uruguay](https://github.com/eduair94/cambio-uruguay) project.

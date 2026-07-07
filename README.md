# Cambio Uruguay

Open-source source code of **[cambio-uruguay.com](https://cambio-uruguay.com)** — compare **live buy/sell exchange rates for the US dollar and 14+ currencies across 40+ Uruguayan casas de cambio and banks**, updated continuously. Find the best rate right now, branches on a map, historical charts, and currency/import calculators. Trilingual (ES/EN/PT), free, no signup.

## Links

| | |
|---|---|
| 🌐 Website | https://cambio-uruguay.com |
| 🔌 Public API (read-only, no key) | https://api.cambio-uruguay.com |
| 🤖 MCP server (`npx cambio-uruguay-mcp`) | [npm](https://www.npmjs.com/package/cambio-uruguay-mcp) · hosted `https://mcp.cambio-uruguay.com/mcp` · [docs](./mcp/README.md) |
| 💬 Bots (Telegram / Discord / Twitter) | [bots/](./bots) |
| ✍️ Articles | https://cambio-uruguay.medium.com |

Key pages: [comparador](https://cambio-uruguay.com) · [conversor](https://cambio-uruguay.com/convertir) · [histórico](https://cambio-uruguay.com/historico) · [mapa de casas](https://cambio-uruguay.com/mapa) · [casas de cambio](https://cambio-uruguay.com/casas-de-cambio) · [retirar efectivo (turistas)](https://cambio-uruguay.com/retirar-efectivo-uruguay).

## MCP server for AI assistants

Live Uruguayan exchange-rate data in any [Model Context Protocol](https://modelcontextprotocol.io) client (Claude Desktop, Cursor, Cline):

```json
{ "mcpServers": { "cambio-uruguay": { "command": "npx", "args": ["-y", "cambio-uruguay-mcp"] } } }
```

See [mcp/README.md](./mcp/README.md) for tools (`get_rates`, `best_house`, `convert`, `list_houses`, `get_evolution`, `get_news`, `daily_summary`) and the hosted HTTP endpoint.

## Github Page

https://eduair94.github.io/cambio-uruguay/

## Report

https://docs.google.com/document/d/1BBDrsiT778SEIn5hqYltl-7dxQq9dSeG/edit

## Installation

Inside repository folder

```bash
npm install && cd app npm install
```

## Usage

API
```bash
npm run dev
```
APP
Inside /app folder. It will work connected to the official api.
```bash
npm run dev
```

## Team

Developer - [Eduardo Airaudo](https://www.linkedin.com/in/eduardo-airaudo/)<br>
QA (Testing) - [Regina Scagliotti](https://www.linkedin.com/in/reginascagliotti/)

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
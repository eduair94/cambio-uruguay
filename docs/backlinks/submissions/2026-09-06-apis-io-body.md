### API or documentation URL

https://api.cambio-uruguay.com/api-docs

### Machine-readable artifacts

- Official OpenAPI 3.0 definition: https://api.cambio-uruguay.com/api-docs.json
- Project overview for agents: https://cambio-uruguay.com/llms.txt
- Hosted MCP endpoint (Streamable HTTP): https://mcp.cambio-uruguay.com/mcp
- Public JSON example, no API key or registration: https://api.cambio-uruguay.com/
- Website: https://cambio-uruguay.com
- Source repository: https://github.com/eduair94/cambio-uruguay

Cambio Uruguay publishes buy and sell exchange rates from Uruguayan exchange houses and banks, historical series, and branch metadata. It is a comparison and public-data project; it does not execute currency trades.

Disclosure: I maintain Cambio Uruguay. On September 6, 2026, the OpenAPI URL and llms.txt returned HTTP 200, the public JSON example returned an array of 200 quote records, and the MCP endpoint completed an unauthenticated initialize request with serverInfo.name = cambio-uruguay. Quotes reflect what each source publishes; publication schedules and quote freshness vary by source.

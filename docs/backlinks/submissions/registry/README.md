# Registro oficial MCP — publicado el 2026-09-06

**Resultado:** `io.github.eduair94/cambio-uruguay` versión `0.1.0`, estado `active`, versión más reciente. Publicado a las `2026-09-06T04:43:35.552786081Z` (2026-09-06 01:43 en Uruguay).

- [Ficha en el buscador oficial](https://registry.modelcontextprotocol.io/?q=cambio-uruguay). Expandir la tarjeta muestra el enlace Website a `https://cambio-uruguay.com`.
- [Registro público de esta versión](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.eduair94%2Fcambio-uruguay/versions/0.1.0).
- [Versión más reciente](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.eduair94%2Fcambio-uruguay/versions/latest).
- [Búsqueda verificada](https://registry.modelcontextprotocol.io/v0.1/servers?search=cambio-uruguay&limit=10): un resultado.

## Publicación

Se publicó únicamente el endpoint remoto existente `https://mcp.cambio-uruguay.com/mcp`. La versión coincide con el `serverInfo.version` que devuelve producción. El manifiesto de este directorio se preparó desde `mcp/server.json`, omitiendo `packages`, añadiendo el título y evitando el reclamo de cobertura universal. No se publicó npm ni se modificó producción.

La validación oficial `mcp-publisher validate server.json` pasó con la CLI oficial v1.8.1, descargada de GitHub y verificada con el SHA-256 de la release: `399ad0d6e00a50812b563a71d8bfbff5160c085e6b13aac6ec083d98d5ff7c45`.

La autenticación y publicación usaron los endpoints oficiales `POST /v0.1/auth/github-at` y `POST /v0.1/publish`, con la sesión existente de GitHub `eduair94`. Se usó la API para mantener todas las escrituras dentro del worktree; la CLI guarda su sesión fuera de él. Las credenciales permanecieron en memoria y no se guardaron en los artefactos. Publicación: HTTP 200.

## Evidencia

| Archivo | Contenido |
|---|---|
| `server.json` | Manifiesto exacto enviado |
| `before.json` | Búsqueda previa sin resultados |
| `published.json` | Respuesta oficial de publicación y fecha |
| `verified-search.json` | Búsqueda posterior con una entrada |
| `verified-latest.json` | Lectura pública de la versión más reciente |
| `verification.json` | Resumen de controles del endpoint y registro |
| `mcp-initialize.sse.txt` | Inicialización MCP: HTTP 200, versión 0.1.0 |
| `mcp-tools.sse.txt` | Lista MCP: HTTP 200, siete herramientas |

También se ejecutó `tools/call` para `get_rates` con `currency: USD`: HTTP 200 y datos estructurados de cotizaciones. No se invocó el resumen con IA.

El enlace Website existe en la interfaz al expandir la ficha y en los metadatos públicos. Esto confirma publicación y descubrimiento; no demuestra tráfico recibido, indexación de Google ni republicación en otros directorios.

Una lectura de la URL de búsqueda usada antes de publicar devolvió temporalmente el resultado previo vacío. La consulta con `limit=10` y la URL exacta de versión confirmaron la publicación inmediatamente.

## Fuentes oficiales consultadas

- [Publicar servidores remotos](https://modelcontextprotocol.io/registry/remote-servers).
- [Referencia de comandos](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/cli/commands.md).
- [API del registro](https://registry.modelcontextprotocol.io/docs).
- [Código de autenticación GitHub](https://github.com/modelcontextprotocol/registry/blob/main/cmd/publisher/auth/github-at.go).
- [Código de publicación](https://github.com/modelcontextprotocol/registry/blob/main/cmd/publisher/commands/publish.go).
- [Release oficial v1.8.1](https://github.com/modelcontextprotocol/registry/releases/tag/v1.8.1).

## Próximo cambio de versión

Para incorporar npm posteriormente, primero verificar que el paquete publicado incluya `mcpName`. Después preparar una nueva versión del manifiesto, validar y publicar. El alta remota ya está completa y no depende de ese paso.

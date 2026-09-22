# Difusión del MCP 0.3.0 y la skill — 2026-09-22

Pedido: "hacer PR a repos de GitHub open source o buscar dónde promocionar estos MCPs". Punto de
partida: la campaña del 2026-09-06 (`campaign-2026-09-06.md`) ya había cubierto registro oficial,
Glama, punkpeye, APIs.io y listas de APIs; el MCP pasó después de 7 a 29 tools.

## Hecho

| Canal | Resultado |
|---|---|
| Registro oficial MCP | 0.1.0 → **0.3.0** (`isLatest`), descripción de los 5 toolsets. Ver `submissions/registry/README.md` |
| punkpeye/awesome-mcp-servers #9525 | Destrabado: el triage decía que la URL del repo en Glama no coincidía. Ahora enlaza `tree/main/mcp` (la de Glama) y describe 29 tools |
| MobinX/awesome-mcp-list #481 | PR nuevo, Finance & Fintech |
| TensorBlock/awesome-mcp-servers #2587 | PR nuevo, `docs/finance--crypto.md` |
| Repo en GitHub | Descripción nombra el MCP remoto y la skill; 18 topics. Los indexadores (mcpmarket) copian esa descripción |
| APIs.io | Ya estaba publicado (`/providers/cambio-uruguay/`, verificaron el handshake MCP) |
| awesome-quant #634 | Ya estaba mergeado |

## Descartado (con la regla que lo decide)

| Lista | Por qué | Reintentar |
|---|---|---|
| docker/mcp-registry | Staff de Docker en #4596 (2026-08-08): "no longer accepting new mcp server entries" | Si reabren; el `server.yaml` remoto está en el análisis |
| jaw9c/awesome-remote-mcp-servers | Sin push desde 2026-06-23, 200+ PRs esperando | Si vuelve a mergear |
| YuzeHao2023/Awesome-MCP-Servers | Ningún alta mergeada desde 2026-04-01 | — |
| ComposioHQ/awesome-claude-skills | Último merge 2026-05-22, 1.362 PRs abiertos | — |
| VoltAgent/awesome-agent-skills | "Brand new skills that were just created are not accepted"; la skill es del 2026-09-21 | En 1–2 meses, con uso real |
| BehiSecc/awesome-claude-skills | Copia en tandas por umbral de estrellas | Con ~50+ estrellas |
| hesreallyhim/awesome-claude-code | Sólo formulario hecho por humanos y recursos específicos de Claude Code | No aplica |
| wong2, appcypher, mcp-get | PRs deshabilitados / archivados (campaña anterior) | No reenviar |
| mcp.so, Smithery, PulseMCP | Pago (USD 39) / requiere cuenta nueva / altas pausadas | Decisión del dueño |

## Queda del lado del dueño (requiere su cuenta)

1. **`npm login` y publicar `cambio-uruguay-mcp` 0.3.0** desde `mcp/`. Hoy `npx` instala la 0.1.0
   (7 tools): por eso ningún PR nuevo menciona `npx`. Con npm al día, el registro oficial puede
   llevar también el paquete (hoy es sólo remoto).
2. **Glama → Build & Release** en la ficha del servidor. Sin release no hay puntuación de calidad, y
   punkpeye la exige para mergear.
3. Smithery (alta con cuenta propia) y Cursor Directory (formulario; daba 429 a la verificación).

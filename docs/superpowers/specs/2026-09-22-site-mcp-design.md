# MCP y asistente de todo el sitio (`sitio`)

Pedido (2026-09-22): "Hacer un mcp y asistente IA usando la información web y navegación de sitio en
general". Hasta acá el MCP y `/asistente-ia` sólo sabían de los directorios (alquileres, autos,
productos) y de cotizaciones. El resto del sitio —guías, herramientas, glosario, fichas, unas 3.300
páginas— era invisible para la IA.

## Diseño

Dos preguntas distintas, dos índices que ya existían:

| Pregunta | Índice | Dónde vive |
|---|---|---|
| ¿A qué página voy? | `buildSearchIndex` + `scoreDocs` (el buscador del encabezado y `/buscar`) | código de la app |
| ¿Qué dice el sitio? | RAG nocturno `ragchunks` (`currency-rag-index`, 11.584 trozos) | APP DB |

**App** (`app/server/api/site/`):

- `GET /api/site/search?q=&limit=` → `pages` (navegación, mismo puntaje que el buscador; sin páginas
  índice salvo que se pidan) + `content` (pasajes BM25 con `crawledAt`). La consulta no se registra.
- `GET /api/site/page?path=&offset=` → texto de una página por tramos de 8.000 caracteres.
- `GET /api/site/sections` → el menú.

El índice de contenido se carga por proceso (TTL 6 h, stale-while-revalidate): 300 ms de carga en el
VPS, ~25 MB con postings empaquetados en arrays tipados (con tuplas eran ~50 MB), 2–30 ms por
consulta. **Léxico a propósito**: un embedding por pregunta gastaría la cuota diaria de Gemini del
sitio, la misma que usan el índice y el bot de Reddit. El modelo que llama es mejor expansor de
consultas que un vector (medido: «me frenaron un paquete en el correo» → la IA buscó «paquete retenido
correo aduana» y llegó a `/problemas-con-la-aduana-uruguay`).

Ruido medido y retirado del índice al cargarlo: el banner de cookies (1.309 trozos) y la llamada a
comparar cotizaciones (145 páginas). Las páginas índice (`/temas/*`, `/guias`, `/herramientas`…)
llevan penalidad 0,6: repiten la descripción de todo lo que enlazan y le ganaban a la guía.

**MCP 0.3.0**: toolset `sitio` (`search_site`, `read_page`, `site_sections`) + instrucciones: buscar
primero, responder con lo que dicen los textos citando la URL, decir cuando el sitio no lo cubre, y
las cifras son del día de lectura (para cotizaciones de hoy, las tools de `cambio`).

**Asistente**: usa los 5 toolsets (29 tools), responde de todo el sitio, sin LaTeX (el render del
chat no lo interpreta). El buscador del encabezado y `/buscar` ofrecen «Preguntarle a la IA» con lo
escrito.

## Verificación

- Unit: app 9.050+ tests, MCP 95 + `sitio.test.ts`.
- Real: índice de producción copiado a la Mongo local, 12 consultas evaluadas; Gemini real contra el
  MCP local: aguinaldo, franquicia courier, paquete retenido y "¿dónde está la calculadora de IRPF?"
  responden en 5–12 s con `search_site` → `read_page` y citan las páginas.

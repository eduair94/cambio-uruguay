# Chat con Gemini en el sitio, con la clave del usuario

Fecha: 2026-09-21 · Estado: aprobado (standing order)

## Problema

El buscador MCP (`mcp.cambio-uruguay.com`) sirve a Claude, ChatGPT y editores. Gemini no:
la app de Gemini sólo acepta MCP propios en EE.UU., en inglés, 18+ y (según fuentes) con plan pago;
Gemini CLI gratis fue reemplazado por Antigravity CLI (junio 2026), que es para técnicos.
El dueño del sitio no quiere pagar tokens de terceros.

## Decisión

Página `/asistente-ia`: chat en el navegador que usa **la clave gratuita de Gemini del usuario**
(AI Studio). Verificado: Uruguay está en las regiones de la API y el endpoint nativo responde CORS a
`https://cambio-uruguay.com` con `x-goog-api-key`.

- Navegador → `generativelanguage.googleapis.com` directo (la clave nunca pasa por nuestros servidores).
- Navegador → `mcp.cambio-uruguay.com/mcp` por JSON-RPC (initialize → instrucciones; tools/list →
  declaraciones de funciones con `parametersJsonSchema`; tools/call). El MCP suma CORS para los
  orígenes del sitio. Una sola fuente de verdad para las herramientas.
- Loop de function calling, máx. 6 rondas; se reenvía el contenido del modelo tal cual (preserva
  `thoughtSignature`). Modelo: `gemini-flash-latest` y, si no está, el siguiente flash disponible
  según `models.list` de esa clave.
- Clave: en memoria; "recordar en este navegador" la guarda en localStorage (try/catch). Botón para
  borrarla.
- Texto del modelo: `marked` + `DOMPurify` (patrón de `AIInsights.vue`), links con `rel=noopener`.
- Errores traducidos: clave inválida, límite gratuito (429), región, modelo no disponible.

## Privacidad (se dice en la página)

La clave va sólo a Google. En el plan gratuito Google puede usar las conversaciones para mejorar
sus productos: no pegar datos sensibles. El MCP recibe sólo los argumentos de cada herramienta y no
los guarda.

## Fuera de alcance

Streaming, historial persistente, WebMCP (Gemini en Chrome todavía no lo consume de forma general).

## Además

`/buscar-con-ia`: acceso destacado al chat y conector de Antigravity CLI
(`~/.gemini/config/mcp_config.json`, campo `serverUrl`).

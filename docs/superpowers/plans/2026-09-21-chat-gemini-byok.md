# Chat con Gemini BYOK — plan

Spec: `docs/superpowers/specs/2026-09-21-chat-gemini-byok-design.md`

1. **MCP CORS** — `mcp/src/cors.ts` (`corsHeaders(origin, allowed)`, `ALLOWED_ORIGINS`, env
   `MCP_CORS_ORIGINS`), preflight OPTIONS 204 en `/mcp*` antes del transporte; test `test/cors.test.ts`.
2. **Lógica del chat** — `app/utils/geminiChat.ts`: `parseRpcBody`, `createMcpClient`,
   `toFunctionDeclarations` (sin `$schema`), `pickModels`, `geminiError`, `toolStatus`,
   `runChatTurn` (loop). Test `app/tests/unit/geminiChat.test.ts` con fetch falso (functionCall →
   tools/call → texto; reintento de modelo; 429; tope de rondas).
3. **Página** — `app/pages/asistente-ia.vue`: SSR con H1, pasos, privacidad; chat en `<ClientOnly>`.
   siteNav + i18n + NO_ADS; `/buscar-con-ia` con acceso y conector Antigravity; `utils/aiSearch.ts`.
4. **Verificación** — tests + lint; prueba real en Node del loop con una clave (una consulta);
   deploy app por CI y MCP manual; preflight CORS desde el origen del sitio en producción.

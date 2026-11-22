# Créditos de API de Claude antes que Gemini — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los jobs que hoy pagan Gemini para texto, JSON e imágenes usan primero los créditos de API de tres cuentas de Anthropic, con Gemini de respaldo por llamada.

**Architecture:** `classes/anthropic.ts` es el único dueño de las claves de Anthropic (SDK oficial, rotación, apartado por saldo/permiso/429, uso por clave). `classes/llm.ts` es un router con las firmas de `classes/gemini.ts` que prueba Claude y cae a Gemini. Los llamadores no fijados cambian el import; los que fijan modelo no se tocan.

**Tech Stack:** TypeScript 6 (CommonJS), `@anthropic-ai/sdk` 1.6.0, vitest.

**Spec:** `docs/superpowers/specs/2026-11-22-claude-api-credits-design.md`

## Global Constraints

- `@anthropic-ai/sdk` fijado en `"1.6.0"` exacto en `package.json` (sin `^`).
- Modelo por defecto `claude-haiku-5-5` (`ANTHROPIC_MODEL`); effort por defecto `low` (`ANTHROPIC_EFFORT`).
- Nunca mandar `temperature`, `top_p`, `top_k` ni `budget_tokens`.
- Ningún módulo de `classes/anthropic.ts`/`classes/llm.ts` tira: todo error es `null`.
- La búsqueda con Claude sólo con `ANTHROPIC_GROUNDED=1`; apagada por defecto.
- `AI_LLM_PROVIDER=gemini` saltea Claude por completo.
- Una clave nunca se imprime entera: sólo `…` + últimos 4 caracteres.
- No tocar `classes/charruadevs/classify.ts`, `classes/stores/signals/tone.ts`, `classes/redditopps/judge.ts`, `classes/rag/embed.ts`.

## Review Focus

- **Las tres claves sin saldo a la vez**: cada llamada tiene que llegar a Gemini sin pagar tres idas por llamada después de la primera. Test en Task 1: tras apartar todas, `askClaudePlain` devuelve `null` sin invocar el cliente.
- **Un mock de vitest de `../../classes/gemini` sin alguna exportación**: el router no puede leer exportaciones que la llamada no usa (vitest tira al acceder). Test en Task 4: con `vi.mock` que sólo define `askGrounded`, `llm.askGrounded` funciona.
- **Respuesta con texto antes del JSON** en `askJSON`: con salidas estructuradas no debería pasar, pero se rescata `{…}` igual que Gemini. Test en Task 2.
- **429 en una clave con otras sanas**: la siguiente llamada usa otra clave y la apartada vuelve sola pasado el plazo. Test en Task 1 con reloj inyectado.
- **Imagen con MIME no soportado** (p. ej. `image/avif`): no se manda a Claude, la llamada cae a Gemini. Test en Task 2.

---

### Task 1: Cliente `classes/anthropic.ts` — claves, rotación, texto

**Files:**
- Modify: `package.json` (dependencia)
- Create: `classes/anthropic.ts`
- Test: `tests/anthropic/client.test.ts`, `tests/anthropic_key_ownership.test.ts`

**Interfaces:**
- Produces:
  - `anthropicKeys(): string[]` — de `ANTHROPIC_API_KEYS` (coma), `ANTHROPIC_API_KEY_1..9`, `ANTHROPIC_API_KEY`; deduplicadas, en ese orden.
  - `anthropicConfigured(): boolean` — hay al menos una clave usable y `AI_LLM_PROVIDER !== "gemini"`.
  - `ANTHROPIC_MODEL: string`
  - `askClaudePlain(prompt: string, opts?: ClaudeCallOptions): Promise<ClaudeReply | null>`
  - `type ClaudeCallOptions = { system?: string; maxTokens?: number; timeoutMs?: number; effort?: "low"|"medium"|"high" }`
  - `type ClaudeReply = { text: string; model: string; keyLabel: string }`
  - `anthropicUsage(): Array<{ key: string; calls: number; inputTokens: number; outputTokens: number; searches: number; failures: number }>`
  - Test seams: `__setAnthropicClientFactoryForTests(f: ((apiKey: string) => { messages: { stream(params: any): { finalMessage(): Promise<any> } } }) | null)`, `__resetAnthropicForTests()`, `__setAnthropicNowForTests(f: (() => number) | null)`.
  - Interno compartido por Task 2/3: `callClaude(params: Record<string, unknown>, opts): Promise<{ message: any; keyLabel: string } | null>` (exportado como `__callClaude` sólo si hace falta; si no, privado).

- [ ] **Step 1: Tests que fallan** (`tests/anthropic/client.test.ts`, factory falsa, errores reales del SDK vía `APIError.generate`):
  - `reads keys from ANTHROPIC_API_KEYS, numbered vars and the bare var, deduplicated`
  - `returns text, model and key label from the first usable key`
  - `round-robins across keys` — tres llamadas, tres claves distintas.
  - `retires a key for the process on 401, 403, 402 and 400 "credit balance is too low"` — siguiente llamada no la usa.
  - `on 429 rests the key 60 s and then uses it again` — reloj inyectado.
  - `on 529/5xx/network returns null without retiring the key`
  - `when every key is retired returns null without calling the client`
  - `returns null on stop_reason refusal`
  - `AI_LLM_PROVIDER=gemini makes it unconfigured`
  - `never sends temperature` — inspecciona los params.
  - `tests/anthropic_key_ownership.test.ts`: sólo `classes/anthropic.ts` importa `@anthropic-ai/sdk` o lee `ANTHROPIC_API_KEY` (mismo recorrido que `tests/gemini_key_ownership.test.ts`).
- [ ] **Step 2:** `npx vitest run tests/anthropic` → FAIL (módulo no existe).
- [ ] **Step 3:** `npm install @anthropic-ai/sdk@1.6.0 --save-exact`; implementar. Cliente por clave con `maxRetries: 2`, `timeout: opts.timeoutMs ?? 120000`; `messages.stream(params).finalMessage()`; `output_config: { effort }`; `max_tokens` por defecto 8000. Log de una línea por falla con `…xxxx`. Resumen de uso en `process.on("exit")` sólo si hubo llamadas.
- [ ] **Step 4:** `npx vitest run tests/anthropic tests/anthropic_key_ownership.test.ts` → PASS.
- [ ] **Step 5:** Commit `feat(ai): cliente de la API de Anthropic con rotación entre claves`.

### Task 2: JSON e imágenes

**Files:**
- Modify: `classes/anthropic.ts`
- Test: `tests/anthropic/structured.test.ts`

**Interfaces:**
- Produces:
  - `toClaudeSchema(schema: unknown): Record<string, unknown>` — minúsculas en `type`, `additionalProperties: false` en todo objeto, quita `minimum maximum exclusiveMinimum exclusiveMaximum multipleOf minLength maxLength pattern minItems maxItems uniqueItems propertyOrdering example default` (salvo `minItems` 0/1), `nullable: true` → `anyOf: [<x>, {type:"null"}]`; recursivo en `properties`, `items`, `anyOf`, `allOf`.
  - `askClaudeJSON<T>(prompt: string, schema: unknown, opts?: ClaudeCallOptions): Promise<{ value: T; model: string } | null>`
  - `askClaudeWithImages(prompt: string, images: ReadonlyArray<{ data: Buffer; mimeType: string }>, opts?: ClaudeCallOptions & { schema?: unknown }): Promise<{ text: string; value?: unknown; model: string } | null>`
  - `CLAUDE_IMAGE_MIME: ReadonlySet<string>` = jpeg, png, gif, webp.
- [ ] **Step 1: Tests que fallan:**
  - `toClaudeSchema closes every object and lowercases Gemini types` — entrada `{type:"OBJECT",properties:{a:{type:"STRING"},b:{type:"ARRAY",items:{type:"OBJECT",properties:{c:{type:"INTEGER",minimum:0}}}}}}`.
  - `toClaudeSchema maps nullable to anyOf with null`
  - `toClaudeSchema accepts the car-vision schema unchanged except additionalProperties` (copiar el `SCHEMA` de `classes/autos/llm/vision.ts`).
  - `askClaudeJSON sends output_config.format json_schema and parses the text`
  - `askClaudeJSON salvages an object wrapped in prose`
  - `askClaudeJSON returns null on stop_reason max_tokens`
  - `askClaudeWithImages sends base64 image blocks before the text`
  - `askClaudeWithImages returns null (without calling) when a mime is unsupported`
- [ ] **Step 2:** `npx vitest run tests/anthropic/structured.test.ts` → FAIL.
- [ ] **Step 3:** Implementar sobre `callClaude`.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(ai): JSON con esquema e imágenes por Claude`.

### Task 3: Búsqueda web detrás del flag

**Files:**
- Modify: `classes/anthropic.ts`
- Test: `tests/anthropic/grounded.test.ts`

**Interfaces:**
- Consumes: `GroundedReply` de `classes/gemini.ts`.
- Produces: `claudeGroundedEnabled(): boolean` (`ANTHROPIC_GROUNDED === "1"` y configurado); `askClaudeGrounded(prompt: string, opts?: ClaudeCallOptions): Promise<GroundedReply | null>`; `webSearchToolFor(model: string)` → `web_search_20250305` para `claude-haiku-*`, `web_search_20260209` para el resto; `max_uses: 5`.
- [ ] **Step 1: Tests que fallan** (respuesta falsa con `server_tool_use`, `web_search_tool_result` con dos resultados, dos bloques `text` — uno con `citations` `web_search_result_location` a la URL 2):
  - `maps results to sourceUris, chunks (hostname as title) and resolvedByChunk`
  - `maps a cited text block to a support pointing at the cited chunk`
  - `joins all text blocks into text`
  - `returns null when no text came back`
  - `grounded is off unless ANTHROPIC_GROUNDED=1`
  - `uses the basic tool on haiku and the dynamic one on sonnet`
  - `groundedHeadlines over the mapped reply yields the cited sentence as title` (usa la función real de `classes/gemini.ts`).
- [ ] **Step 2:** → FAIL. **Step 3:** implementar; `pause_turn` → `null` (se cae a Gemini). **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(ai): búsqueda web por Claude, apagada por defecto`.

### Task 4: Router `classes/llm.ts`

**Files:**
- Create: `classes/llm.ts`
- Test: `tests/llm.test.ts`

**Interfaces:**
- Consumes: Task 1–3; `classes/gemini.ts` (`askPlain`, `askWithImage`, `askJSON`, `askJSONWithImages`, `askGrounded`, `geminiConfigured`, `GEMINI_MODEL`, `groundedHeadlines`, tipos).
- Produces (mismas firmas que Gemini):
  - `askPlain(prompt: string, timeoutMs?: number): Promise<string | null>` y `askPlainDetailed(...) : Promise<LlmText | null>`
  - `askWithImage(prompt, image: { data: Buffer; mimeType: string }, timeoutMs?): Promise<string | null>`
  - `askJSON<T>(prompt, schema, opts?: { system?; model?; temperature?; maxOutputTokens?; timeoutMs? }): Promise<T | null>`
  - `askJSONWithImages<T>(prompt, images, schema, opts?)` y `askJSONWithImagesDetailed<T>(...): Promise<{ value: T; model: string; provider: LlmProvider } | null>`
  - `askGrounded(prompt): Promise<GroundedReply | null>` — Claude sólo si `claudeGroundedEnabled()`.
  - `llmConfigured(): boolean`, `preferredLlmModel(): string` (modelo de Claude si configurado, si no `GEMINI_MODEL`).
  - re-exporta `groundedHeadlines`, `type GroundedReply`, `type GroundedHeadline`.
  - `type LlmProvider = "claude" | "gemini"`; `type LlmText = { text: string; model: string; provider: LlmProvider }`.
  - `opts.model`/`opts.temperature` sólo viajan a la pierna Gemini.
  - Acceso a Gemini por `import * as gemini` y sólo dentro de la función que lo usa.
- [ ] **Step 1: Tests que fallan** (mock de `../classes/anthropic` y `../classes/gemini`):
  - `askPlain uses Claude when it answers`
  - `askPlain falls back to Gemini when Claude returns null`
  - `askPlain goes straight to Gemini when Claude is not configured`
  - `askJSONWithImagesDetailed reports the model that answered`
  - `askGrounded stays on Gemini unless the flag is on`
  - `askGrounded works with a gemini mock that only defines askGrounded`
  - `llmConfigured is true with only Gemini, with only Claude, false with neither`
- [ ] **Step 2:** → FAIL. **Step 3:** implementar; log `[llm] Claude no contestó — Gemini` una vez por llamada caída. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(ai): router Claude→Gemini con las firmas de Gemini`.

### Task 5: Migrar llamadores, `ai_text.ts`, docs

**Files:**
- Modify: `classes/banks/news.ts`, `classes/chairs/analyze.ts`, `classes/chairs/reviews.ts`, `classes/chairs/vision.ts`, `classes/autos/llm/vision.ts`, `classes/ai_text.ts`, y los 11 de `askGrounded` (`classes/aduana/gemini.ts`, `classes/autos/modelInfo/youtube.ts`, `classes/costs/refresh.ts`, `classes/debt/refresh.ts`, `classes/explain/news.ts`, `classes/figures/refresh.ts`, `classes/financing/refresh.ts`, `classes/gaps/research.ts`, `classes/loans/gemini.ts`, `classes/predictions/refresh.ts`, `classes/temas-analysis/refresh.ts`); `.env.sample`; `AGENTS.md` (una línea en `classes/` key files); `docs/analytics/` no.
- Test: suite completa.

- [ ] **Step 1:** Cambiar imports a `../llm` (o `../../llm`). Guardas `geminiConfigured()` de los migrados → `llmConfigured()`, salvo las guardas de jobs con búsqueda, que siguen pidiendo Gemini mientras el flag esté apagado: ahí `llmConfigured()` sólo si `claudeGroundedEnabled()`, si no `geminiConfigured()` — exportar `groundedConfigured()` desde `llm.ts` con esa regla y usarla en esas guardas.
- [ ] **Step 2:** `chairs/analyze.ts`: `classifierModel` por lote = modelo que contestó (`askPlainDetailed`); el meta usa `preferredLlmModel()`. `autos/llm/vision.ts`: `model` del veredicto = modelo que contestó (`askJSONWithImagesDetailed`); `visionConfigured = llmConfigured`.
- [ ] **Step 3:** `ai_text.ts`: las piernas de respaldo usan `askPlain`/`askWithImage` de `./llm` (suscripción → créditos → Gemini).
- [ ] **Step 4:** `.env.sample`: `ANTHROPIC_API_KEYS=`, `ANTHROPIC_MODEL=claude-haiku-5-5`, `ANTHROPIC_EFFORT=low`, `ANTHROPIC_GROUNDED=0`, `AI_LLM_PROVIDER=` con una línea cada una.
- [ ] **Step 5:** `npm test` → todo verde; `npx tsc -p tsconfig.production.json --noEmit` → sólo el error esperado de `sync_sheet.ts`.
- [ ] **Step 6:** Commit `feat(ai): los jobs sin búsqueda gastan créditos de Claude antes que Gemini`.

### Task 6: Publicar

- [ ] Prueba real con una clave (si hay en `.env` local; si no, en el VPS con `node -e` sobre `dist/classes/llm.js`).
- [ ] PR contra `main` (automerge), mirar el deploy del backend, cargar las claves en el VPS si el dueño las da.

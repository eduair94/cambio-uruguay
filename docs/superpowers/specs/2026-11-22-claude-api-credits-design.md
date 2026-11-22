# Créditos de API de Claude antes que Gemini

Fecha: 2026-11-22. Tamaño: cambio chico (dos módulos nuevos, siete llamadores).

## Por qué

El dueño tiene créditos de API de Anthropic en tres cuentas y paga Gemini con tarjeta. Cada llamada
que hoy va a Gemini y podría ir a Claude es plata que se gasta teniendo crédito sin usar. Cuando los
créditos se acaban (o una clave falla), todo tiene que seguir andando con Gemini, igual que hoy.

## Decisiones del dueño (2026-11-22)

- **Credencial**: claves de API (`sk-ant-api…`) de platform.claude.com, una por cuenta. No la
  suscripción: esa vive en el servicio de 104 (`classes/claude.ts`) y comparte cupo con su uso
  interactivo.
- **Modelo**: Claude Haiku 5.5 (`claude-haiku-5-5`). Cuesta lo mismo que `gemini-*-flash-lite`, así
  que cada dólar de crédito reemplaza más o menos un dólar de Gemini.
- **Búsqueda web**: los jobs con búsqueda (`askGrounded`) **siguen en Gemini** por defecto. Claude cobra
  US$ 10 por 1.000 búsquedas y además cobra como tokens las páginas que lee, así que ahí el crédito
  rinde de 10 a 20 veces menos. La variante con Claude queda construida y apagada:
  `ANTHROPIC_GROUNDED=1` la enciende.

## Metas

- Texto, JSON e imágenes de los jobs pasan por Claude primero, con Gemini de respaldo por llamada.
- Las tres claves rotan. Una clave sin crédito, revocada o sin permiso se aparta por el resto del
  proceso. Una clave con 429 (límite por minuto) se aparta un rato, no para siempre.
- El modelo que contestó queda registrado donde hoy se registra el de Gemini.
- Que se vea en los logs qué proveedor contestó y cuánto gastó cada clave.

## No metas

- **Embeddings**: Anthropic no tiene. `classes/rag/embed.ts` sigue en Gemini.
- **Llamadores que fijan su modelo** porque cambiarlo rompe la serie: `classes/charruadevs/classify.ts`,
  `classes/stores/signals/tone.ts`, `classes/redditopps/judge.ts`. Siguen en Gemini directo.
- `classes/ai_service.ts` (proveedor OpenAI-compatible de los insights): no es Gemini.
- `app/`, `mcp/`, `bots/`: no llaman a Gemini.

## Anti-metas

- Que un job deje de escribir porque Claude falló. El contrato de `gemini.ts` se mantiene: **nunca
  tira**, `null` significa "esta vez no hubo respuesta".
- Que la serie de un clasificador cambie de modelo sin que nadie lo decida.
- Que una clave sin crédito haga perder tiempo en cada llamada: se aprende una vez por proceso.

## Enfoques considerados

1. **Adentro de `gemini.ts`, transparente** — cero cambios en los llamadores. Descartado: el nombre
   mentiría, los llamadores que fijan modelo cambiarían solos y `classifierModel: GEMINI_MODEL`
   registraría el modelo equivocado.
2. **Cliente nuevo + router con las mismas firmas** (elegido) — `classes/anthropic.ts` es el único que
   lee las claves de Anthropic (como `gemini.ts` con la de Google, con su test de dueño único).
   `classes/llm.ts` expone `askPlain`, `askWithImage`, `askJSON`, `askJSONWithImages`, `askGrounded`
   con las firmas de Gemini; migrar un llamador es cambiar el import. Los que fijan modelo no se tocan.
3. **Todo por `ai_text.ts`** — mandaría los jobs a la suscripción, que comparte cupo con el uso
   interactivo. Descartado. `ai_text.ts` sí gana el escalón nuevo: suscripción → créditos de API →
   Gemini.

## Diseño

### `classes/anthropic.ts` — el cliente

- SDK oficial `@anthropic-ai/sdk`, fijado en **1.6.0** exacto (la raíz no tiene lockfile; una versión
  con más de dos semanas, `zod` es par opcional y la raíz ya trae zod 4).
- Claves: `ANTHROPIC_API_KEYS` (separadas por coma) o `ANTHROPIC_API_KEY_1..N`, o la `ANTHROPIC_API_KEY`
  sola. Se deduplican. El log muestra sólo los últimos 4 caracteres.
- Modelo: `ANTHROPIC_MODEL`, por defecto `claude-haiku-5-5`. Effort `low` por defecto
  (`ANTHROPIC_EFFORT`), porque estas tareas son extracción y síntesis, y es la palanca de costo.
- Sin `temperature`: Haiku 5.5 y la versión 2026-10-21 del API la rechazan.
- Streaming con `finalMessage()` en todas las llamadas, para que un `max_tokens` grande no corte por
  tiempo.
- Rotación round-robin entre claves usables: reparte el límite por minuto de las cuentas nuevas (tier 1).
- Clasificación de errores por clase del SDK, nunca por texto salvo el saldo:
  - `AuthenticationError` (401), `PermissionDeniedError` (403), 402 `billing_error`, o 400 con
    "credit balance" o "usage limits": la clave se aparta por el resto del proceso y se prueba la siguiente.
  - `RateLimitError` (429, después de los reintentos del SDK): la clave se aparta 60 s (o lo que diga
    `retry-after`) y se prueba la siguiente.
  - 5xx/529/red/timeout: se cae a Gemini en esa llamada, sin apartar la clave (no es de la clave).
  - 400 de otra cosa (por ejemplo un esquema rechazado): `null`, se cae a Gemini.
- `stop_reason: "refusal"` o `"max_tokens"` con JSON incompleto: `null`.
- Salidas estructuradas: `output_config.format = {type: "json_schema", schema}`, con un saneador que
  agrega `additionalProperties: false`, pasa tipos de Gemini (`"OBJECT"`) a minúscula y saca lo que
  Claude no acepta (`minimum`, `maxLength`, `nullable` → `anyOf` con null, `propertyOrdering`…).
- Imágenes base64 sólo si el MIME es jpeg/png/gif/webp; si no, esa llamada va a Gemini.
- Búsqueda (sólo con `ANTHROPIC_GROUNDED=1`): herramienta `web_search` (la variante básica
  `web_search_20250305` en Haiku, la de filtrado dinámico en Sonnet/Opus), `max_uses` 5, y la respuesta
  se traduce a la forma `GroundedReply`: `sourceUris` = URLs de los resultados, `chunks` con el dominio
  como `title` (la convención que `groundedHeadlines` espera), `supports` = cada bloque de texto citado
  con los índices de sus URLs, `resolvedByChunk` = las URLs directas (Claude no las envuelve en
  redirecciones).
- Uso por clave y por proceso: tokens de entrada/salida y búsquedas, impreso al salir y disponible
  con `anthropicUsage()`.

### `classes/llm.ts` — el router

- Mismas firmas que Gemini. Por cada llamada: Claude si hay clave usable; si devuelve `null`, Gemini.
- Variantes `…Detailed` que devuelven `{ value, model, provider }` para los que registran el modelo.
- `opts.model` de los llamadores es un nombre de Gemini: sólo se usa en la pierna Gemini.
- `llmConfigured()` = Claude o Gemini configurado; reemplaza a `geminiConfigured()` en las guardas de
  los llamadores migrados.
- `AI_LLM_PROVIDER=gemini` fija Gemini (para reproducir una respuesta o apagar Claude sin desplegar).

### Llamadores que se migran

`classes/banks/news.ts` (síntesis con `askPlain`; su búsqueda pasa por `llm.askGrounded`, que sigue en
Gemini salvo el flag), `classes/chairs/analyze.ts`, `classes/chairs/reviews.ts`, `classes/chairs/vision.ts`,
`classes/autos/llm/vision.ts`, `classes/ai_text.ts` (pierna de respaldo). Los otros 11 llamadores de
`askGrounded` pasan a importar de `llm.ts` para que el flag los alcance; con el flag apagado siguen
exactamente igual.

## Lo que queda al implementador

- Nombres internos, forma exacta del log, tests.
- Tests: rotación, apartado por saldo/permiso/429, caída a Gemini, saneador de esquemas con los esquemas
  reales del repo, traducción de la búsqueda, dueño único de las claves.

## Lo que tiene que hacer el dueño

Crear una clave por cuenta en platform.claude.com → API Keys y sumarlas al `.env` de la raíz en el VPS:
`ANTHROPIC_API_KEYS=sk-ant-api…,sk-ant-api…,sk-ant-api…`. Sin eso todo sigue en Gemini, como hoy.

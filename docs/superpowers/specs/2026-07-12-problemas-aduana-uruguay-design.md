# Diseño: `/problemas-con-la-aduana-uruguay`

**Fecha:** 2026-07-12
**Estado:** aprobado (brainstorming)

La guía definitiva para lidiar con la aduana uruguaya, organizada por **síntoma** ("mi paquete
está retenido") y no por norma. Cada problema trae qué dice la norma, qué hacer paso a paso, y
qué le pasó de verdad a la gente — citando hilos y comentarios reales de r/uruguay.

---

## 1. Problema y objetivo

La aduana es una de las quejas más densas de r/uruguay: 1161 hilos tocan el tema. La gente no
busca "el decreto 336/015", busca "me retuvieron el paquete, ¿qué hago?". Hoy el sitio tiene
`/franquicia-aduana-uruguay` (reglas + calculadora), `/franquicia-viajero-uruguay` y
`/couriers-uruguay`: **explican las reglas, no resuelven situaciones**.

Objetivo: una página que responda toda duda práctica sobre aduana y le dé al usuario un plan de
acción concreto, con evidencia real (testimonios citados) y sin inventar normativa.

### No-objetivos

- No reemplaza `/franquicia-aduana-uruguay`. Esa sigue siendo la de reglas + calculadora de IVA.
  Las dos se cruzan con enlaces.
- No es un agregador de Reddit. Reddit es **evidencia de experiencia**, nunca fuente de derecho.
- No damos asesoramiento legal personalizado; damos el procedimiento y la norma que lo respalda.

---

## 2. Los buckets de problema

Derivados de la cosecha real (1161 hilos, queries: `aduana`, `aduana paquete`, `paquete retenido`,
`despachante`, `DUA`, `courier compra exterior`, `franquicia 200`, `importar`, `encomienda`,
`traer del exterior`), no de intuición:

| id | Síntoma | Evidencia en el corpus |
|---|---|---|
| `retenido` | El paquete quedó "retenido" sin explicación | "¿Por qué la aduana retiene paquetes aleatoriamente?" (101c), "Primer paquete dentro de Franquicia nueva, RETENIDO" (123c) |
| `factura-exigida` | Piden comprobante de compra/pago (resolución abr-2026, compras de USA) | "Nueva Resolución de la aduana: Requisitos imposibles para la exoneración de IVA en compras de USA" (214c, 194p) |
| `roto-o-incompleto` | Llegó abierto, faltan artículos | "La aduana me robó un pedido" (90c, 187p) |
| `cobro-abusivo` | El courier cobra gestión/depósito/almacenaje que nadie entiende | "Tiendamia me está cobrando cualquier cosa?" (74c) |
| `franquicia-agotada` | Se acabaron las 3 compras / se pasó del tope | "El régimen de franquicias… hasta tres compras por US$ 800 en total" (169c) |
| `supera-monto` | Se pasó de USD 200 → IVA; se pasó del tope → despachante | "Compra de estados unidos (236usd) aduana lol" (82c) |
| `prohibido-o-restringido` | MSP, medicamentos, drones, semillas, juguetes sexuales | "Aduana prohíbe juguetes sexuales desde fines de 2023. Qué hago?" (79c) |
| `decomiso-subasta` | Se lo quedaron / venció el plazo en depósito | "aduanas me roba el paquete, no hay nada que pueda hacer, ¿verdad?" (70c) |
| `comercial-vs-personal` | Se lo consideran importación comercial | hilos de importación para reventa |
| `encomienda-regalo` | Un familiar manda algo desde el exterior | hilos de encomiendas |
| `demora-extrema` | 30+ días, tracking congelado | "pagué por envío de 5-10 días, demoró 30" (70c) |
| `mudanza-y-viajero` | Traer notebook/PC en el equipaje, mudanza | hilos de viajero |

Cada bucket, en la página, es una sección con **tres bloques visualmente distintos**:

1. **La norma** — qué dice, con decreto/resolución + artículo + enlace oficial.
2. **Qué hacer** — pasos numerados, plazos, a quién reclamar, qué documento hace falta.
3. **Lo que cuenta la gente** — 2-3 testimonios citados (texto, autor, fecha, score, permalink)
   + cuántos reportes del bucket hay en el corpus.

El bloque 3 nunca se mezcla con el 1. Un testimonio no es una norma y la página lo dice.

---

## 3. Arquitectura

Los datos viven y se refrescan en el **backend Express de la raíz** (pm2), no en Nuxt. La página
`.vue` no contiene ni un monto ni una regla hardcodeada: consume una API.

```
classes/aduana/
  types.ts       AduanaDoc y sus sub-tipos
  store.ts       MongooseServer("aduana_data") — un solo documento, igual que courier store
  harvest.ts     busca r/uruguay (reusa classes/reddit.ts) → colecciones Mongo, dedupe por id
  classify.ts    IA etiqueta hilo/comentario → bucket + lección + cita; agregación DETERMINISTA
  norms.ts       refresh IA semanal de los hechos legales, con guardarraíles (§5)
  baseline.ts    snapshot verificado a mano — el piso, y el fallback si todo falla
  payload.ts     arma el JSON público que sirve la ruta
sync_aduana.ts        entry del job (pm2 app `currency-aduana`, cron semanal)
index.ts              server.getJson("aduana", …) → ruta pública GET /aduana
ecosystem.config.js   nueva app `currency-aduana`
```

**IA:** la del backend raíz, `classes/ai_service.ts` (cliente OpenAI-compatible, configurado por
`AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`). Sin credenciales, el job es un no-op silencioso y la
ruta sigue sirviendo el último-bueno. La salida se pasa por el sanitizador que ya existe: el
proveedor emite basura (LaTeX, `<think>`, prefijos tipo `WormGPT:`) y nunca debe llegar a la
página. Toda respuesta se parsea como JSON con schema; si no parsea, se descarta (no se "arregla"
a mano).

**Cron:** semanal, lunes 08:40 UTC (≈ 05:40 America/Montevideo) — después del sync de couriers
(08:15) para no pisarle el rate-limit de Reddit al otro job.

Cada etapa degrada por separado: si Reddit se cae, los hechos legales igual se revisan; si la IA
se cae, las citas viejas siguen sirviéndose. Ninguna etapa borra datos buenos al fallar.

Es el mismo patrón, archivo por archivo, que el sync de couriers que ya está en main
(`sync_couriers.ts` + `classes/couriers/*` + app pm2 + `GET /couriers`).

### Del backend a la página

```
r/uruguay ──(classes/reddit.ts)──▶ Mongo (posts + comments, dedupe por id)
                                        │
                              classify.ts (IA etiqueta lo nuevo)
                                        │
   normativa oficial ──(norms.ts + guardarraíles)──▶ aduana_data (un doc)
                                        │
                              GET /aduana (Express, raíz)
                                        │
                     /api/aduana (nitro, cacheado 30 min, último-bueno)
                                        │
                    /problemas-con-la-aduana-uruguay (SSR)
```

La ruta nitro es un proxy cacheado con fallback en cascada: respuesta viva → último-bueno en
caché → `baseline` embebido. La página **nunca** queda en blanco ni rompe el SSR si el backend
está caído.

---

## 4. Modelo de datos

Colecciones nuevas, propias, para no chocar con la sesión concurrente que trabaja en couriers:

- `aduana_reddit_posts` — `{ redditId (unique), title, selftext, author, score, numComments, permalink, createdUtc, queries[] }`
- `aduana_reddit_comments` — `{ commentId (unique), postId, author, body, score, createdUtc, permalink }`
- `aduana_labels` — `{ key (unique: postId|commentId), bucket, stance, lesson, quote, outcome, labeledAt, modelVersion }`
- `aduana_data` — **un solo documento** con el payload público:

```ts
interface AduanaDoc {
  facts: AduanaFact[]        // hechos legales: monto, plazo, cargo permitido…
  problems: ProblemEntry[]   // un objeto por bucket: norma + pasos + plantilla de reclamo
  quotes: Record<BucketId, Quote[]>  // testimonios citados, ya seleccionados
  counts: Record<BucketId, number>   // cuánta gente reporta esto
  sources: Source[]          // normas citadas: título, decreto/resolución, artículo, url oficial
  pendingReview: string[]    // hechos que la IA quiso cambiar y no se publicaron (§5)
  updatedAt: string | null
}

interface AduanaFact {
  id: string                 // 'franquicia.tope_anual_usd'
  value: number | string
  unit?: 'USD' | 'días' | '%'
  sourceId: string           // → Source
  article?: string           // 'art. 3'
  verifiedAt: string
  origin: 'baseline' | 'ai'  // de dónde salió el valor vigente
}

interface Quote {
  text: string; author: string; date: string; score: number; permalink: string
}
```

`aduana_labels` es lo que hace barato el refresh: sólo se etiqueta lo que Mongo no vio antes.

---

## 5. Refresh IA semanal, con guardarraíles

Requisito del usuario: auto-refresh semanal, gestionado del lado de la API. Riesgo conocido: ya
shippeamos números de importación equivocados una vez (ver `docs/` de import-regime-2026). Por eso
**la IA propone, no publica**:

1. Prompt grounded → salida **JSON con schema estricto**. Cada hecho debe traer `value`,
   `sourceUrl`, `article`.
2. **Validadores deterministas** (código, no IA):
   - `sourceUrl` en dominio oficial: `aduanas.gub.uy`, `impo.gub.uy`, `*.gub.uy`. Si no, se rechaza.
   - montos dentro de rangos plausibles por `id` (definidos en `baseline.ts`).
   - campos obligatorios presentes y del tipo correcto.
3. **Diff contra el snapshot vigente.** Si un hecho cambia de valor, **no se publica solo**: se
   mantiene el último-bueno y el `id` entra en `pendingReview`, visible en el log del job y en
   `/estado`. Un cambio normativo real lo confirma un humano; la IA sólo lo detecta.
4. Cualquier fallo (IA caída, JSON inválido, validador en rojo) → se sirve el último-bueno; si no
   hay, `baseline.ts`.

Consecuencia deseada: la página se mantiene fresca sola y **una alucinación no puede publicar un
monto**. El precio es que un cambio normativo real tarda una intervención humana en salir — lo
correcto cuando el dato es plata ajena.

`baseline.ts` lo escribo verificando cada hecho contra la norma (decreto/resolución + artículo)
antes de escribir una línea de UI.

---

## 6. Clasificación de Reddit

Aprendizaje ya pagado (ver spec del tierlist de couriers): **puntuar por keywords no alcanza**. Se
usa el patrón ya probado: la IA etiqueta, el código agrega.

- **IA (por hilo/comentario nuevo):** `{ bucket, stance, lesson, quote, outcome }` con schema
  estricto. `outcome` ∈ `resuelto | pagó | perdió | sin resolver`. Devuelve `null` si el texto no
  es sobre aduana (los queries traen ruido: "importar" pesca rants políticos).
- **Código (determinista):** cuenta por bucket, ordena por score, elige las citas. Reglas duras:
  - sólo se cita texto **atribuible** (autor no `[deleted]`),
  - sólo se cita si el comentario/hilo está etiquetado con confianza en un bucket,
  - la cita se recorta pero nunca se reescribe,
  - siempre acompañada de permalink al hilo original.

---

## 7. La página (Nuxt)

`app/pages/problemas-con-la-aduana-uruguay.vue`, SSR, consumiendo `/api/aduana`.

Estructura:

1. **Hero** + buscador de síntoma ("¿qué te pasó?").
2. **Diagnóstico** (herramienta 1) — elegís síntoma → plan de acción: pasos, plazos, a quién
   reclamar, qué documento necesitás. Sale de `problems[bucket]`.
3. **Verificador de cobro** (herramienta 2) — metés lo que te cobró el courier (IVA, tasas,
   gestión, depósito) → marca qué cargo tiene respaldo normativo y cuál es del courier. Reglas
   desde `facts`.
4. **Contador de franquicias** (herramienta 3) — cuántas te quedan en el año y si la próxima
   compra te cruza el tope. Parámetros desde `facts`.
5. **Generador de reclamo** (herramienta 4) — arma el escrito (courier / DNA / Defensa del
   Consumidor) con nº de guía + fundamento normativo. Plantilla desde `problems[bucket]`.
   Copiar al portapapeles. No se envía nada: el usuario lo manda.
6. **Los 12 problemas**, cada uno con norma / qué hacer / lo que cuenta la gente.
7. **Cruces**: `/franquicia-aduana-uruguay` (reglas + calculadora), `/couriers-uruguay`,
   `/franquicia-viajero-uruguay`, `/estafas-uruguay`.

Detalles obligatorios del repo:
- registrar la página en `app/utils/siteNav.ts` (si no, el test de cobertura falla),
- schema `FAQPage` + `HowTo`, OG image, entrada en el sitemap,
- contraste AA en tema claro y oscuro (el sweep de axe corre sobre todas las rutas).

---

## 8. Tests

- **Raíz (vitest):** validadores de `norms.ts` (rechaza dominio no oficial, rechaza monto fuera de
  rango, mantiene último-bueno ante IA caída, mete el `id` en `pendingReview` ante diff);
  agregación determinista de `classify.ts` (no cita `[deleted]`, ordena por score, ignora hilos
  sin bucket).
- **App (vitest):** lógica del verificador de cobro, del contador de franquicias y del generador
  de reclamo, con `facts` mockeados.
- **e2e:** la página renderiza con la API caída (fallback a baseline) — gate en hidratación con
  reintentos `toPass`.

---

## 9. Riesgos y dependencias

- **El backend de la raíz no compila hoy**: `sync_couriers.ts` importa `./classes/couriers/opinions`
  y ese archivo no existe en disco ni en git (trabajo en vuelo de una sesión concurrente). No lo
  toco; pero el deploy manual del VPS va a fallar hasta que esa sesión lo cierre.
- **El deploy del backend raíz es manual** (git pull + npm install + build + pm2 restart). No lo
  cubre el CI de `app/`. Un `dist` viejo rompe el job en silencio.
- **La normativa está en movimiento**: resolución de abril 2026 (comprobantes para compras de USA)
  y el cambio del 1/10/2026. El baseline se verifica contra la norma, no contra notas de prensa
  ni contra Reddit.
- **Ruido en el corpus**: los queries amplios (`importar`) traen hilos políticos. El clasificador
  debe poder devolver `null`; si no, la página se llena de citas irrelevantes.

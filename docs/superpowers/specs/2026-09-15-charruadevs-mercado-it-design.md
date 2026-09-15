# Termómetro del mercado IT (r/CharruaDevs) — diseño

Fecha: 2026-09-15 · Estado: aprobado por orden permanente (auto-aprobación de spec y plan)

## Pedido

1. "Scrapeá r/CharruaDevs y medí qué tan negativa es la visión/pronóstico del desarrollo de
   software. Análisis integral con gráficas / IA. ¿Qué tan mal estamos?"
2. "Integrá el análisis en la app. Incluí un buscador de comentarios/publicaciones con filtros de
   sentimiento y lo que haga falta para que se entienda la situación."

## Qué ya existe (fuera del repo, en el scratchpad de la sesión)

- Corpus completo del sub: 13.900 posts y 207.109 comentarios (abr-2021 → 15-sep-2026), bajados de
  Arctic Shift (archivo público que conserva lo publicado aunque después se borre) y completados con
  la API oficial de Reddit (votos actuales, borrados posteriores).
- Clasificación Gemini 3.5 Flash-Lite con salida JSON con esquema: todos los posts y todos los
  comentarios "candidatos" (filtro de palabras de trabajo/mercado o hilo de mercado, ~140k).
- Validación ciega (Claude, 60 posts + 60 comentarios): acuerdo de signo 61–69 %, postura a ±1
  punto 100 %, sesgo −0,06/−0,12 (el modelo apenas más negativo), kappa 0,25–0,33.

## Arquitectura

```
Arctic Shift ─┐                                   ┌─ GET /api/charruadevs/summary ─┐
Reddit API ───┼─ currency-charruadevs (diario) ──►│ APP DB                         ├─ /mercado-it-uruguay
Gemini ───────┘   classes/charruadevs/*           └─ GET /api/charruadevs/search ──┘   (gráficos + buscador)
FRED (Indeed) ┘
```

### Backend (raíz, TS 4.9 CommonJS)

`classes/charruadevs/`, una responsabilidad por archivo:

| archivo | qué hace | puro |
|---|---|---|
| `filter.ts` | `isCandidateComment(body, threadIsMarket)`, `isMarketThread(title, text)`, `isGone(body)` | sí |
| `rubric.ts` | texto de la rúbrica, esquema JSON, `normalizeLabel()` (clampa postura, filtra temas/enum) | sí |
| `lexicon.ts` | frases de alarma sin IA y conteo mensual por cada 1.000 comentarios | sí |
| `analyze.ts` | de las filas clasificadas + filas mensuales al snapshot (proporciones, temas, perfiles, relatos, votos, IA, ventanas) | sí |
| `harvest.ts` | Arctic Shift paginado desde una marca de agua con solapamiento de 2 días | no |
| `classify.ts` | lotes a Gemini con `askJSON` (nuevo en `classes/gemini.ts`, única dueña de la clave) | no |
| `reddit_live.ts` | votos y borrados vía `/api/info` para lo de los últimos 30 días | no |
| `store.ts` | modelos APP DB vía `classes/appdb.ts`, upserts, índices | no |
| `refresh.ts` | orquesta; `--seed <dir>` importa el corpus inicial | no |

Entrada `sync_charruadevs.ts`; pm2 `currency-charruadevs`, cron diario, en `OTHER_APPS` de
`scripts/deploy-backend.sh`. Necesita `APP_MONGO_URI` (se niega sin ella, como los demás jobs de
APP DB).

Guardas:
- Un snapshot sólo se escribe si el total de textos no bajó más de 10 % respecto del anterior
  (una corrida rota no borra el tablero).
- Gemini que falla deja los textos sin clasificar para la corrida siguiente; nunca se inventa una
  etiqueta.
- Lo borrado hoy en Reddit (autor o moderación) queda con `gone: true`: cuenta en los agregados
  anónimos pero no aparece en el buscador ni en citas.
- No se guarda ningún nombre de usuario.

### APP DB

- `charruadevstexts` — un doc por texto clasificado: `rid` (único), `kind` (`post`|`comment`),
  `thread`, `title` (del hilo), `body` (≤ 1.500 caracteres), `createdAt`, `month`, `score`, `rel`,
  `stance` (−2…+2 | null), `themes[]`, `ai`, `event`, `persona` (sólo posts), `gone`, `url`.
  Índices: `rid` único; `{createdAt:-1}`; `{rel:1, stance:1, createdAt:-1}`; `{themes:1, createdAt:-1}`;
  texto `{title:2, body:1}` con `default_language: "spanish"`. Sin collation en las consultas (la
  collation `es` anula el índice — ver memoria del proyecto).
- `charruadevssnapshots` — `key: "snapshot"` (lo que lee la página) y `key: "state"` (marcas de
  agua, filas mensuales de actividad y del léxico, que el job no puede recalcular sin volver a
  bajar todo).

### App (Nuxt)

- `server/api/charruadevs/summary.get.ts` — devuelve el snapshot. Lee Mongo por pedido y cachea en
  la capa HTTP (`Cache-Control: public, s-maxage=…`); nada de `defineCachedEventHandler` (el cluster
  ×2 serviría copias distintas de un dato escrito por fuera).
- `server/api/charruadevs/search.get.ts` — parámetros `q`, `stance` (lista), `kind`, `theme`, `ai`,
  `event`, `from`/`to` (año), `sort` (`recent`|`votes`|`relevance`), `page`, `limit ≤ 30`. Responde
  `{ total, items, facets: { stance, byYear } }` con un `$facet`: la distribución de posturas y la
  negatividad por año **de la búsqueda actual**. Los parámetros se validan con un parser puro
  (`utils/charruadevsSearch.ts`, testeado) y los extractos se arman en el servidor, centrados en el
  término buscado; el cliente resalta sin `v-html`.
- Página `pages/mercado-it-uruguay.vue` + componentes `components/mercadoIt/*`: cifra principal,
  veredicto, curva mensual, año a año en escala −2…+2, temas, IA, perfiles, relatos, votos, control
  sin IA, contexto (Indeed EE.UU. vía FRED, CUTI, Sabre), citas, buscador, FAQ, método y
  validación. Gráficos SVG propios con tooltip y tabla gemela ("Ver datos").
- Registro en `utils/siteNav.ts` + claves i18n (es/en/pt) + lo que exijan los tests de cobertura.

## Pruebas

- Backend (vitest raíz): `filter`, `rubric.normalizeLabel`, `lexicon`, `analyze` (ponderación,
  ventanas, casos vacíos), `refresh` con Mongo/Gemini/HTTP mockeados (guardas: snapshot delgado no
  pisa, Gemini caído no inventa, `gone` no se publica); tripwire `no_scheduler_in_api` intacto.
- App (vitest app): parser de búsqueda (defaults, límites, valores inválidos), armado de extracto y
  resaltado, formateadores; tests de cobertura de nav/sitemap existentes en verde.
- Manual: build del app en el worktree, página y buscador contra datos reales; producción medida
  después del deploy.

## Fuera de alcance

- Moderación o análisis por usuario (no se guardan usuarios).
- Otros subs (el diseño deja `sub` fijo; generalizar si hace falta después).
- Traducción del contenido de la página: sólo las claves de navegación van en en/pt, como el resto
  de las páginas de contenido.

# API para empresas: claves, planes y uso medido — diseño

Fecha: 2026-09-27. Pedido del usuario: "Sí, implementar infraestructura para venta a empresas",
respuesta a la lectura de monetización del mismo día (privada, `docs/seo/data/monetizacion-2026-09-27/`).

Este es el **subproyecto 1 de 2**. El 2 (monitor de competencia para casas de cambio, con alertas)
se monta sobre éste y tiene su propia spec.

## Qué se entiende del pedido

- **Dicho:** construir la base para venderle datos a empresas.
- **De la lectura previa (medido):** la API pública ya tiene clientes que no son el sitio —un panel
  que pide la pizarra de una casa cada ~5 minutos, una planilla de Google, un widget de iPhone,
  scrapers con nombre propio— y hoy no hay forma de saber quiénes son, cuánto usan ni ofrecerles
  nada. La API no pide credencial.
- **Supuesto:** el cobro es manual en esta etapa (factura o transferencia coordinada por correo).
  Lo que falta es identificar al cliente, medir su uso, darle un plan con límites propios y una
  vía de alta sin intervención humana. Pasarela de pago, facturación automática y precios
  publicados quedan fuera: los precios los decide el dueño, y la página dice "escribinos".
- **Restricción dura:** no romper a nadie. Ni al sitio, ni al MCP, ni a los bots, ni al widget
  embebido en sitios ajenos, ni a los integradores anónimos de hoy.
- **Éxito:**
  1. Una empresa entra a `/empresas`, se registra con su cuenta del sitio y en un minuto tiene una
     clave que funciona, con su cuota y su consumo visibles.
  2. El dueño ve en una página privada quién tiene clave, para qué dijo que la quería, cuánto usa
     cada una por día y ruta, y **quiénes usan la API sin clave** (por User-Agent), que es la lista
     de a quién ofrecerle un plan. Le llega un Telegram por cada alta.
  3. El dueño cambia el plan de una clave desde esa página y el límite nuevo rige en segundos.
  4. El tráfico anónimo sigue funcionando igual, con un techo anti-abuso alto que hoy no toca a
     ningún cliente medido.

## Enfoque elegido

**Las claves viven en el backend y el app es la ventanilla.** La API es la que valida cada
pedido, así que la clave, el plan y el contador viven de su lado (Mongo del backend + Redis que ya
usa). El app pone lo que ya tiene: la identidad del usuario (Firebase), el correo, las páginas y
la lista de administradores. El app le habla a la API con un token de administración compartido
(`API_ADMIN_TOKEN`), del lado del servidor, nunca desde el navegador.

Descartados:
- **Claves en la base del app, leídas por el puente `classes/appdb.ts`:** pondría la base del app
  en el camino caliente de cada pedido a la API, y el puente existe para jobs, no para el request.
- **Proxy de pago (RapidAPI y similares):** cobra comisión, esconde al cliente y obliga a cambiar
  la URL que ya usan los integradores. La pregunta de hoy es *quién* usa, y un intermediario la
  contesta peor.
- **Exigir clave desde el día uno:** rompería a los integradores anónimos que son justamente los
  candidatos a cliente. Primero se identifica y se mide; endurecer el techo anónimo es una
  decisión posterior, con aviso, y se toma con los datos que esto empieza a juntar.

## Piezas

### 1. Backend — `classes/apikeys/` (nuevo)

Módulos puros y testeables por separado; sólo `store.ts`, `counters.ts` y `routes.ts` tocan
Mongo, Redis o Express.

- **`plans.ts`** — tabla de planes y resolución de límites. Sin I/O.
  | plan | por minuto | por día | quién |
  |---|---:|---:|---|
  | `anonymous` | 600 | 20.000 | sin clave, por IP |
  | `free` | 600 | 20.000 | clave gratuita (misma cuota que anónimo: lo que gana es identidad, medición y el camino a un plan pago) |
  | `business` | 3.000 | 500.000 | plan comercial, lo asigna el dueño |
  | `internal` | sin límite | sin límite | sitio, MCP, bots (por IP del VPS/localhost) y claves internas |
  Los números salen de lo medido en Cloudflare (24 h al 27/9): el cliente anónimo que más pide en
  el día hace ~280 pedidos (el panel de pizarra); la ráfaga más alta fue de 494 pedidos en un
  minuto (un scraper en la nube). El techo anónimo queda por encima de las dos cosas. El sitio
  hace sus llamadas de servidor desde el VPS (exento). Cada límite se puede pisar por
  variable de entorno (`API_LIMIT_<PLAN>_PER_MINUTE|PER_DAY`) sin desplegar código. Una clave
  puede llevar límites propios (`limits` en su documento) que pisan los del plan: sirve para un
  acuerdo a medida sin inventar un plan nuevo.
- **`credential.ts`** — formato y extracción. Clave = `cu_` + 32 caracteres base62 de
  `crypto.randomBytes`. Se guarda sólo el SHA-256 (`keyHash`) y los 8 primeros caracteres
  (`prefix`) para mostrarla. Se lee de `X-API-Key`, de `Authorization: Bearer cu_…` o de
  `?api_key=` (este último para planillas y widgets que no pueden poner cabeceras). Una cadena
  que no tiene el formato se trata como "clave inválida", no como anónimo.
- **`client.ts`** — decide quién es el cliente de un pedido, en este orden:
  1. **clave** presente: válida → su plan; inválida o revocada → 401 (una clave de plan
     `internal` no cuenta ni mide);
  2. **`internal`**: IP en `API_INTERNAL_IPS` más `127.0.0.1`/`::1` (y su forma `::ffff:`) → ni
     cuenta ni mide: son el SSR del sitio, el MCP y los bots, que viven en el VPS;
  3. **`site`**: `Origin` o `Referer` de `cambio-uruguay.com` o un subdominio → el navegador de
     un lector del sitio (detrás de un CGNAT de Antel comparten IP cientos de lectores): sin
     límite, y se mide agregado como `site`, no por User-Agent, para que los navegadores no
     tapen el ranking de integradores;
  4. **`anonymous`**: el resto, con el techo por IP.
  La IP sale de `CF-Connecting-IP` si viene, si no de `req.ip`. Quien le pegue directo al origen
  puede falsificar esa cabecera o el `Referer` y saltarse el techo anónimo: está aceptado, porque
  hoy no hay techo alguno y lo que se vende —el plan de una clave— no depende de la IP.
- **`window.ts`** — ventanas fijas de minuto y día (día en `America/Montevideo`) y la decisión
  `allowed / remaining / resetAt` a partir de los contadores. Sin I/O.
- **`normalize.ts`** — ruta para el medidor: los dos primeros segmentos, en minúsculas, dígitos
  colapsados, 60 caracteres máx.; un 404 se cuenta como `(no-encontrada)` para que los escáneres
  de `/.env` no inflen la tabla. User-Agent recortado a 120 caracteres.
- **`store.ts`** — colección `api_keys` en la Mongo del backend (`MongooseServer.getInstance`):
  `{ keyHash, prefix, label, ownerUid, ownerEmail, company, useCase, website?, plan, limits?,
  status: 'active'|'revoked', createdAt, revokedAt?, lastUsedAt?, notes? }`, índice único por
  `keyHash`. Búsqueda por hash con caché en memoria del proceso de 60 s, **también para el
  resultado negativo** (una clave inventada no golpea Mongo en cada pedido). Revocar o cambiar de
  plan tarda como máximo 60 s en regir en cada una de las dos instancias.
- **`counters.ts`** — Redis (el mismo `REDIS_URL` de la caché). Por pedido de un cliente con
  techo (clave o anónimo), en un solo `MULTI`: `INCR` del minuto (expira a los 120 s) e `INCR`
  del día (expira a los 3 días), con sujeto `key:<id>` o `ip:<ip>`. Después de responder,
  `HINCRBY` del medidor `usage:<día>` con campo `<cliente>|<ruta>` (expira a los 40 días), donde
  el cliente es `key:<id>`, `ua:<User-Agent>` para un anónimo o `site` para los lectores del sitio
  — **nunca la IP**: el medidor guarda quién (el programa que se identifica), no dónde. Las IP
  sólo viven en los contadores de límite, 3 días como máximo. `internal` no toca Redis. **Si Redis no responde, el pedido pasa sin límite y
  sin medir** (se registra una vez por minuto en el log): la API no se cae porque se cayó el
  contador.
- **`middleware.ts`** — Express, registrado en `index.ts` antes de la primera ruta y después de
  CORS (así el preflight `OPTIONS` nunca llega). Rutas exentas: `/health`, `/ping`, `/api-docs*`,
  `/public/*`, `/robots.txt`, `/admin/*` (tienen su propio token). Para el resto: resuelve el
  cliente, cuenta, agrega `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` y
  `X-Plan` (expuestas por CORS) y, si pasó el límite, corta con 429 y un JSON que dice cuál
  límite, cuándo se renueva y que `/empresas` da uno más alto. Clave inválida o revocada: 401 con
  el motivo. El medidor se escribe en `res.on('finish')`, cuando ya se sabe si fue 404.
- **`routes.ts`** — rutas de administración, sólo con cabecera `X-Admin-Token` igual a
  `API_ADMIN_TOKEN` (comparación en tiempo constante; sin token configurado, 503):
  - `POST /admin/api-keys` — crea (plan `free`), devuelve la clave en claro **una única vez**.
    Tope de 3 claves activas por `ownerUid`. Manda Telegram al dueño con empresa, uso declarado,
    sitio y correo.
  - `GET /admin/api-keys?ownerUid=` — lista (sin hashes); con `ownerUid` filtra.
  - `PATCH /admin/api-keys/:id` — `plan`, `limits`, `status`, `notes`, `label`. Si trae
    `ownerUid`, sólo actúa sobre claves de ese dueño y sólo permite `status: 'revoked'` y `label`
    (así el app reutiliza la ruta para que un usuario revoque la suya sin poder subirse de plan).
  - `GET /admin/api-usage?days=30&ownerUid=` — uso por día × cliente × ruta: los días cerrados
    desde Mongo y hoy en vivo desde Redis. Con `ownerUid`, sólo sus claves. Sin él, incluye el
    ranking de anónimos por User-Agent (los candidatos a cliente).
  - Además se protege con el mismo token `POST /cache/flush`, que hoy vacía la caché de Redis a
    pedido de cualquiera.
- **Ruta pública `GET /usage`** — con una clave, devuelve su plan, sus límites y lo consumido hoy
  y en este minuto; sin clave, el plan anónimo. Para que un integrador vea su cuota sin entrar al
  sitio.

### 2. Backend — job `currency-api-usage` (nuevo, pm2 cron `7 * * * *`)

`sync_api_usage.ts` copia el hash `usage:<día>` de ayer y de hoy a la colección
`api_usage_days` (`{ day, client, route, count }`, upsert con el valor de Redis, así que correrlo
dos veces no duplica) y actualiza `lastUsedAt` de cada clave con uso. Es un proceso aparte porque
la API corre en cluster ×2 y no puede tener nada programado adentro
(`tests/no_scheduler_in_api.test.ts`). Se agrega a `OTHER_APPS` de `scripts/deploy-backend.sh`.
Redis retiene 40 días, así que un job caído varios días no pierde nada.

### 3. App — ventanilla

Una sola ruta nueva. Lo privado va como **pestaña `api` de `/cuenta`** (`/cuenta?tab=api`), que
ya es privada, `noindex`, sin anuncios y está fuera del sitemap y de la navegación: una ruta
privada nueva exigiría registrarla en cinco listas (`EXCLUDED_ROUTES` de `siteNav.ts` y su lista
fija en el test, `NOINDEXED` de `seoContract`, `sitemap.exclude`, `robots.disallow`, `ads.ts`) sin
darle nada al usuario.

- **`/empresas`** (pública, indexable): español en el template, como las páginas de contenido
  recientes (canonical literal, sin `defineI18nRoute`, porque la entrada de navegación publica los
  tres idiomas en el sitemap y un espejo borrado daría 404). Cumple los contratos de SEO del app:
  `useSeoMeta` con título de ≤ 43 caracteres propios y descripción de ≤ 155, canonical,
  JSON-LD y un único H1. Entrada en `siteNav.ts` (sección `connect`, junto a
  `/desarrolladores`) con `labelKey: 'empresas.nav'` en los tres JSON de idioma. Contenido: qué
  datos hay y con qué frecuencia (casas de cambio cada 5 minutos, historial intradía, histórico,
  región, alquileres, autos), qué se puede construir (pantalla de pizarra, planilla, monitoreo de
  competencia, informes), los planes con sus límites y sin precios ("Empresa: escribinos"),
  condiciones de uso en cinco líneas (citar la fuente, no revender el dato crudo sin plan
  comercial, los límites pueden cambiar con aviso previo de 30 días) y el botón "Crear clave":
  con sesión va a `/cuenta?tab=api`; sin sesión abre el diálogo de acceso (`openDialog()` del
  store) y navega a la pestaña apenas `isLoggedIn` pasa a verdadero.
- **Pestaña `api` de `/cuenta`** — dos componentes en `components/account/`, en español como el
  panel privado de Search Console:
  - `ApiKeysPanel.vue`: formulario de alta (nombre de la clave, empresa o proyecto, uso previsto,
    sitio web opcional, aceptación de las condiciones), lista de claves con prefijo, plan,
    estado, alta, último uso y pedidos de los últimos 30 días; la clave nueva se muestra una sola
    vez con botón de copiar y un `curl` de ejemplo; revocar con confirmación.
  - `ApiClientsAdminPanel.vue`: sólo se dibuja si `/api/admin/api-clients` no contesta 403. Tabla
    de claves con dueño, empresa, uso declarado, plan, uso de 7 y 30 días y rutas más pedidas;
    selector de plan y notas por clave; ranking de anónimos por User-Agent con sus rutas (7 días).
- **Rutas de servidor del app** (convención `/api/me/*` con `requireUser`, admin con
  `requireAdmin` y `cache-control: private, no-store`):
  - `GET /api/me/api-keys` (claves propias + uso de 30 días), `POST /api/me/api-keys`,
    `DELETE /api/me/api-keys/:id`.
  - `GET /api/admin/api-clients`, `PATCH /api/admin/api-clients/:id`.
  - Todas pasan por `server/utils/apiAdmin.ts`, que agrega `X-Admin-Token` desde
    `runtimeConfig.apiAdminToken` (`NUXT_API_ADMIN_TOKEN`, sólo servidor) y usa
    `runtimeConfig.apiBaseServer`. El navegador nunca ve el token, y ninguna respuesta lo lleva.
- Enlaces: `/desarrolladores` suma una tarjeta hacia `/empresas`; `/publicidad` también la
  enlaza. La documentación de la API (`swagger/config.ts` y `app/public/openapi.json`) declara la
  clave como esquema de seguridad **opcional** (`X-API-Key`) y el endpoint `/usage`.

## Errores y bordes

- Redis caído: sin límite, sin medición, sin 5xx.
- Mongo caído al buscar una clave: el pedido pasa como anónimo y se registra; nunca 401 por una
  falla nuestra.
- `API_ADMIN_TOKEN` sin configurar: rutas de administración 503; el resto de la API igual.
- Del lado del app, API caída: las páginas muestran el error del servicio, no una lista vacía que
  parezca "no tenés claves".
- Alta repetida con doble clic: el tope de 3 claves activas acota el daño; el botón se deshabilita
  mientras espera.
- Privacidad (Ley 18.331): se guarda sólo lo que el formulario pide y dice para qué; el medidor no
  guarda IP; las IP de los contadores de límite expiran en 3 días.

## Pruebas

- Raíz (vitest): `plans`, `credential` (formato, hash, extracción de las tres fuentes, basura →
  inválida), `client` (interno por IP, mismo sitio, clave, anónimo), `window` (bordes de minuto y
  de día en Montevideo), `normalize`, `middleware` con Redis y store falsos (429 con cabeceras,
  401, exentas, Redis caído → pasa, 404 → `(no-encontrada)`), `routes` (sin token 401, token
  errado 401, sin configurar 503, tope de 3, `ownerUid` no puede cambiar plan), job
  (idempotente). Los valores de prueba de claves son de baja entropía y la variable no se llama
  `key` (gitleaks `generic-api-key`).
- App (vitest): rutas de servidor con fetch falso (usuario sólo ve lo suyo, admin exige
  `requireAdmin`, token nunca en la respuesta), registro de páginas según los tests de navegación
  y SEO existentes.
- Producción, después del deploy: alta real desde `/cuenta?tab=api`, pedido con la clave
  (cabeceras y `/usage`), 429 forzado con límites propios bajos en una clave de prueba, Telegram
  recibido, panel de administración con el ranking anónimo, y el sitio, el MCP y el widget
  respondiendo igual.

## Configuración que hay que poner en el VPS

- `.env` de la raíz: `API_ADMIN_TOKEN` (aleatorio, 32 bytes), `API_INTERNAL_IPS=104.234.204.107`.
- `app/.env`: `NUXT_API_ADMIN_TOKEN` (el mismo). Se hornea en el build: va antes del push.

## Fuera de alcance

Pasarela de pago y facturación; precios publicados; exigir clave; endurecer el techo anónimo;
el monitor de competencia (subproyecto 2); claves para el MCP.

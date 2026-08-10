# Integración con Google Analytics 4 (Data API)

Guía completa para dejar andando `/estadisticas-del-sitio`: la página pública que muestra cuánta
gente usa el sitio, qué lee y de dónde llega, con datos de GA4.

Hasta ahora GA4 en este repo era **solo de escritura**: `nuxt-gtag` mandaba eventos y nadie los leía
desde el código. Esta integración agrega el camino de vuelta.

---

## 1. Cómo funciona

```
GA4 (propiedad G-F97PNVRMRF)
   │  Data API v1beta · batchRunReports · service account con rol "Lector"
   ▼
sync_site_analytics.ts            ← pm2 `currency-site-analytics`, 10:51 UTC todos los días
   │  classes/site-analytics/{ga4,refresh,store}.ts
   ▼
Mongo de la APP · colección `siteanalyticssnapshots`   ← un solo documento, upsert
   │
   ▼
app/server/api/site-analytics.get.ts   ← cacheado 1 h
   │
   ▼
app/pages/estadisticas-del-sitio.vue   ← KPIs, tendencia, top de páginas, canales, eventos
```

Decisiones que ya están tomadas y conviene no revisar sin motivo:

- **El job vive en el backend, no en Nuxt.** `currency-server` corre como cluster pm2 ×2: cualquier
  tarea programada ahí se ejecutaría dos veces. Además las credenciales de Google quedan en un solo
  proceso.
- **La ventana termina ayer, nunca hoy.** El día en curso está incompleto y, al lado de 27 días
  enteros, se ve como un derrumbe.
- **Se guarda un solo documento, sin historial.** GA4 *es* el archivo: cualquier ventana se puede
  volver a pedir. (Distinto de `pricepredictions`, que no se puede recalcular.)
- **Sin dependencias nuevas.** El cliente son ~150 líneas: un JWT firmado con el `crypto` de Node y
  dos llamadas con axios. `@google-analytics/data` habría metido todo el stack gRPC.

---

## 2. Lo que hace falta antes de empezar

- Acceso de **administrador** a la propiedad GA4 de cambio-uruguay.com.
- Acceso al proyecto de Google Cloud donde vive (o va a vivir) la cuenta de servicio.
- Acceso SSH al VPS (para escribir el `.env` del backend).

---

## 3. Paso 1 — El ID numérico de la propiedad

**Este es el error más común de toda la integración.** `G-F97PNVRMRF` es el *measurement ID*: sirve
para mandar datos y la Data API lo rechaza. Lo que hace falta es el **Property ID numérico**.

1. Entrá a [analytics.google.com](https://analytics.google.com/).
2. Abajo a la izquierda: **Administrar** (⚙) → columna *Propiedad* → **Configuración de la
   propiedad**.
3. Arriba a la derecha aparece **ID de la propiedad**: un número de 9–10 dígitos (`123456789`).

Ese número es `GA4_PROPERTY_ID`.

---

## 4. Paso 2 — Habilitar la Google Analytics Data API

En el proyecto de Google Cloud que va a ser dueño de la cuenta de servicio:

1. Abrí
   [console.cloud.google.com/apis/library/analyticsdata.googleapis.com](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com).
2. Elegí el proyecto arriba.
3. **Habilitar**.

Si esto falta, la API responde `403 SERVICE_DISABLED` — y el mensaje se parece bastante al de "sin
permisos", así que conviene descartarlo primero.

---

## 5. Paso 3 — La cuenta de servicio

### Opción A (más rápida): reutilizar la de Google Sheets

El repo ya despliega `sheet_key.json` en el servidor para el sync de la planilla. Sirve igual:

```bash
# en el VPS, dentro del repo
grep client_email sheet_key.json
```

Copiá ese mail y saltá al paso 4. No hace falta ninguna variable de entorno de credenciales: si no
hay `GA4_CLIENT_EMAIL` ni `GA4_KEY_FILE`, el cliente prueba `sheet_key.json` solo.

### Opción B: cuenta de servicio propia

Preferible si querés poder revocar el acceso a Analytics sin tocar el sync de Sheets.

1. [console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
   → **Crear cuenta de servicio**.
2. Nombre: `analytics-reader`. **No le asignes ningún rol de IAM** — el permiso que importa se da
   dentro de GA4, no en Cloud.
3. Abrí la cuenta creada → pestaña **Claves** → **Agregar clave** → **Crear clave nueva** → **JSON**.
   Se descarga un archivo; guardalo, no se puede volver a descargar.
4. Anotá el `client_email` (`analytics-reader@tu-proyecto.iam.gserviceaccount.com`).

---

## 6. Paso 4 — Darle acceso de lectura en GA4

El permiso no se configura en Cloud, se configura en Analytics:

1. En GA4: **Administrar** → columna *Propiedad* → **Gestión de accesos a la propiedad**.
2. **+** (arriba a la derecha) → **Agregar usuarios**.
3. Pegá el mail de la cuenta de servicio.
4. **Desmarcá "Notificar por correo electrónico"** — una cuenta de servicio no lee mails y Google
   devuelve error si intenta mandarlo.
5. Rol: **Lector** (`Viewer`). Alcanza y sobra: la Data API solo lee.
6. **Agregar**.

El acceso puede tardar un par de minutos en propagarse.

---

## 7. Paso 5 — Variables de entorno

En el `.env` del **backend** (raíz del repo en el VPS, no `app/.env`):

```bash
GA4_PROPERTY_ID=123456789

# Opción B (cuenta propia). Con la Opción A, omití estas dos.
GA4_CLIENT_EMAIL=analytics-reader@tu-proyecto.iam.gserviceaccount.com
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Alternativa a las dos anteriores: el JSON tal cual, subido al servidor.
# GA4_KEY_FILE=./ga4_key.json

GA4_TIMEZONE=America/Montevideo
```

Tres trampas de `.env`, todas ya nos mordieron antes:

- **La clave privada va entre comillas dobles y con `\n` literales**, exactamente como viene en el
  JSON. Un salto de línea real corta la variable ahí.
- **Un `#` sin comillas trunca el valor**: dotenv lo lee como comienzo de comentario. Si algún valor
  tiene `#`, entrecomillalo.
- `APP_MONGO_URI` **tiene que estar seteado** (es el Mongo de la app, el mismo que `app/.env`
  usa como `MONGO_URI`). El job se niega a arrancar sin eso, porque escribir la colección en la base
  equivocada dejaría la página vacía para siempre y sin ningún error visible.

Si preferís el archivo JSON: subilo al VPS (`/root/cambio-uruguay/ga4_key.json`), agregalo a
`.gitignore` — **nunca** lo commitees — y apuntá `GA4_KEY_FILE` ahí.

---

## 8. Paso 6 — Probar

En el servidor (o local, si tenés el `.env` completo):

```bash
npm run sync_site_analytics
```

Salida esperada:

```
[site-analytics] 2026-06-13..2026-07-10: 4210 users, 6180 sessions, 14903 views, 25 pages, 90 days of series
```

### Cuando no sale eso

| Síntoma | Qué pasa | Arreglo |
|---|---|---|
| `GA4_PROPERTY_ID is not set` | falta la variable | paso 5 |
| `no GA4 service account` | ni env, ni `GA4_KEY_FILE`, ni `sheet_key.json` legible | paso 5 |
| `403` con `PERMISSION_DENIED` + "User does not have sufficient permissions for this property" | la cuenta de servicio no está en la propiedad | paso 4 |
| `403` con `SERVICE_DISABLED` | la Data API no está habilitada en ese proyecto | paso 3 |
| `400` con "Invalid property ID" | pusiste el `G-XXXXXXX` en vez del número | paso 1 |
| `invalid_grant` al pedir el token | reloj del servidor desfasado (el JWT dura 1 hora) o clave privada mal pegada | `timedatectl` / repegar la clave |
| Corre bien pero avisa "zero traffic for the whole window" | casi siempre es propiedad equivocada o permiso recién dado que aún no propagó | esperá 5 min y reintentá; si la propiedad es nueva de verdad, `npm run sync_site_analytics -- --allow-empty` |
| `APP_MONGO_URI is not set` | el job no sabe a qué base escribir | paso 5 |

El job **nunca borra** el snapshot anterior: si un día falla, la página sigue mostrando los números
de ayer (y el aviso de "datos desactualizados" aparece solo pasadas 48 h).

---

## 9. Paso 7 — Desplegar

`git push` a `main` alcanza: el workflow detecta cambios en los `.ts` de la raíz y corre
`scripts/deploy-backend.sh`, que compila en el servidor y registra las apps pm2 nuevas
(`currency-site-analytics` ya está en `OTHER_APPS`).

Comprobar en el VPS:

```bash
pm2 describe currency-site-analytics          # debe existir, cron 51 10 * * *
pm2 logs currency-site-analytics --lines 50
pm2 start ecosystem.config.js --only currency-site-analytics   # primera vez, si hiciera falta
```

Verificación de punta a punta:

```bash
curl -s https://cambio-uruguay.com/api/site-analytics | head -c 400
# y después, la página:
# https://cambio-uruguay.com/estadisticas-del-sitio
```

Mientras no exista el documento, la API devuelve `null` y la página muestra "todavía no hay datos
publicados" en lugar de romperse.

---

## 10. Qué se publica y qué no

La página es pública, así que la regla es estricta: **solo agregados**.

- Totales de la ventana, días enteros, y los primeros N de cada lista.
- **Las rutas se guardan sin querystring.** `classes/site-analytics/refresh.ts` (`publicPath()`) la
  corta antes de escribir: `/buscar?q=<lo que alguien escribió>` se guarda como `/buscar`. También
  hace que las llegadas con `?utm_*` se sumen a la página real en vez de dispersarse.
- No hay nada por visitante: ni IP, ni ID de cliente, ni recorridos.
- Los números **subestiman** el tráfico real: Consent Mode v2 arranca denegado y `/pizarra` y
  `/widget` no cargan GA en absoluto. Está dicho en la propia página.

Si en algún momento querés que la página deje de ser pública, lo mínimo es agregar el middleware de
auth en `definePageMeta` y sacarla de `NAV_SECTIONS` (queda fuera del sitemap y del buscador
interno).

---

## 11. Cambiar qué se muestra

Agregar una métrica o una dimensión toca cinco lugares, en este orden:

1. `classes/site-analytics/refresh.ts` → `analyticsReportRequests()`: el pedido nuevo va **al final**
   del array (`buildSnapshot()` lee por índice) y `buildSnapshot()` lo mapea.
2. `classes/site-analytics/types.ts`: el campo nuevo en `SiteAnalyticsSnapshot`.
3. `classes/models/SiteAnalyticsSnapshot.ts` **y** `app/server/models/SiteAnalyticsSnapshot.ts`: los
   dos esquemas, con el mismo nombre de campo. `tests/appdb/schema_parity.test.ts` rompe el build si
   se separan.
4. `app/utils/siteAnalytics.ts`: el tipo del lado de la app y cualquier derivación.
5. `app/pages/estadisticas-del-sitio.vue` + las tres traducciones (`app/i18n/locales/json/*.json`).

Tests: `npx vitest run tests/site_analytics tests/appdb` (raíz) y
`npx vitest run tests/unit/siteAnalytics.test.ts` (app).

Referencia de métricas y dimensiones válidas:
[Data API — API Schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema).
Ojo: no toda combinación es legal; si GA4 devuelve `400` con "incompatible", la
[herramienta de compatibilidad](https://ga-dev-tools.google/ga4/query-explorer/) lo dice antes.

---

## 12. Cuotas y costo

La Data API es gratis. Las propiedades estándar tienen un tope diario de *tokens* por propiedad
(orden de 200.000) y por hora; cada reporte simple cuesta unos pocos. Este job pide **8 reportes una
vez por día** en dos llamadas `batchRunReports` (el batch admite 5 pedidos), así que consume una
fracción despreciable. Detalle:
[Data API Quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas).

---

## 13. Archivos que toca esta integración

| Archivo | Rol |
|---|---|
| `classes/site-analytics/ga4.ts` | JWT + token + `batchRunReports`, y el aplanado de filas |
| `classes/site-analytics/refresh.ts` | ventanas de fechas, pedidos, y el armado **puro** del snapshot |
| `classes/site-analytics/store.ts` | upsert del único documento |
| `classes/site-analytics/types.ts` | forma del snapshot |
| `classes/models/SiteAnalyticsSnapshot.ts` | modelo mongoose contra la base de la app |
| `sync_site_analytics.ts` | entrypoint pm2 |
| `ecosystem.config.js` | app `currency-site-analytics`, cron 10:51 UTC |
| `scripts/deploy-backend.sh` | la registra en el primer deploy (`OTHER_APPS`) |
| `tests/site_analytics/refresh.test.ts` | ventanas, querystring, merges, shares |
| `app/server/models/SiteAnalyticsSnapshot.ts` | espejo del esquema |
| `app/server/api/site-analytics.get.ts` | endpoint público cacheado |
| `app/utils/siteAnalytics.ts` | tipos + deltas, media móvil, formateo (puro, testeado) |
| `app/pages/estadisticas-del-sitio.vue` | la página |
| `app/utils/siteNav.ts` | la registra en el nav/buscador/sitemap |
| `app/i18n/locales/json/{es,en,pt}.json` | textos |

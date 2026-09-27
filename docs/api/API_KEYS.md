# Claves de la API para empresas

Diseño: `docs/superpowers/specs/2026-09-27-api-empresas-claves-design.md`. Código: `classes/apikeys/`.

## Qué hace

- La API **no exige clave**. Con clave (`X-API-Key`, `Authorization: Bearer cu_…` o `?api_key=`)
  identifica al cliente, mide su uso y le aplica su plan.
- Planes (`classes/apikeys/plans.ts`): sin clave 600/min y 20.000/día por IP; `free` igual;
  `business` 3.000/min y 500.000/día; `internal` sin límite. Cada número se pisa con
  `API_LIMIT_<PLAN>_PER_MINUTE|PER_DAY` en el `.env` de la raíz (y `pm2 reload currency-server
  --update-env`). Una clave puede tener límites propios (`limits`) que pisan los del plan.
- Nunca limitados: IP interna (`127.0.0.1`, `::1` y `API_INTERNAL_IPS`) y lectores del sitio
  (`Origin`/`Referer` de cambio-uruguay.com, medidos juntos como `site`).
- Cabeceras: `X-Plan`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`; 429 con
  `Retry-After`. `GET /usage` devuelve plan, límites y consumo.

## Dónde vive cada cosa

| qué | dónde |
|---|---|
| claves (sólo hash SHA-256 + prefijo) | Mongo del backend, `api_keys` |
| contadores de límite (con IP, 3 días) | Redis `cambio:rl:m:*`, `cambio:rl:d:*` |
| medidor por cliente y ruta (sin IP, 40 días) | Redis `cambio:usage:<día>` |
| uso histórico | Mongo del backend, `api_usage_days` (job `currency-api-usage`, minuto 7) |

## Configuración

- Raíz `.env`: `API_ADMIN_TOKEN` (32 bytes aleatorios), `API_INTERNAL_IPS=104.234.204.107`.
- `app/.env`: `NUXT_API_ADMIN_TOKEN` con el mismo valor. Se hornea en el build del app.
- Sin `API_ADMIN_TOKEN` las rutas `/admin/*` y `POST /cache/flush` responden 503; el resto de la
  API sigue igual.

## Operación

- Altas: cualquier cuenta del sitio en `/cuenta?tab=api` (tope de 3 activas). Llega un Telegram por
  cada alta (`TELEGRAM_ADMIN_CHAT_ID`).
- Cambiar el plan: `/cuenta?tab=api` con una cuenta de `NUXT_ADMIN_EMAILS` (panel "Clientes de la
  API"). O por consola:
  `curl -X PATCH -H "X-Admin-Token: $API_ADMIN_TOKEN" -H 'content-type: application/json' -d '{"plan":"business"}' http://127.0.0.1:3528/admin/api-keys/<id>`
- Quién usa la API sin clave: el mismo panel, tabla "Sin clave", o
  `curl -H "X-Admin-Token: $API_ADMIN_TOKEN" 'http://127.0.0.1:3528/admin/api-usage?days=7'`.
- Un cambio de plan rige ya en la instancia que lo recibe y en ≤ 60 s en la otra (caché por proceso).

## Qué no hace (todavía)

Cobrar, facturar, exigir clave o endurecer el techo anónimo. Endurecerlo se decide con los datos
de `api_usage_days` y se avisa en `/empresas` con 30 días.

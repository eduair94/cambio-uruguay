# Los tuits de la cuenta de X (`/feeds/x.xml`)

La cuenta de X de cambio-uruguay publica sola, con IFTTT leyendo un feed RSS que sirve el app. Es
el mismo esquema que el post diario de LinkedIn (`docs/app/LINKEDIN_FEED.md`): sin job de pm2, sin
base de datos, sin modelo de lenguaje.

- Feed: `https://cambio-uruguay.com/feeds/x.xml` (`app/server/routes/feeds/x.xml.ts`).
- Textos y turnos: `app/utils/xPosts.ts`. Datos del dólar: `app/server/utils/linkedinUsd.ts`
  (compartido con LinkedIn).
- Test: `app/tests/unit/xPosts.test.ts` (y `tests/unit/helpers/socialCopy.ts`, compartido).

## Qué publica

| Turno (hora de Montevideo) | Tuit |
|---|---|
| Lunes a viernes, 10:00 | el dólar del día: venta más baja, mejor compra, BROU y la diferencia sobre US$ 1.000, en tres redacciones que rotan por día |
| Lunes, miércoles y viernes, 15:00 | una guía de `X_GUIDES` (39, en orden: más de tres meses sin repetir) |

- **Sin dólar los cinco feriados pagos** (1/1, 1/5, 18/7, 25/8, 25/12): las casas no abren.
- El feed tiene **un solo ítem**, el del turno vigente, con `guid`
  `cambio-uruguay-x-AAAA-MM-DD-dolar|guia`: IFTTT tuitea una vez por turno.
- Las guías dicen lo mismo que los posts de LinkedIn (verificado contra cada página), en corto y con
  la voz de la marca. Sin montos ni porcentajes que envejecen; el test vigila además el largo (280
  contando la URL como 23, como X) y las marcas de texto generado.
- **El dólar usa las mismas guardas que LinkedIn** (`summarizeUsd`): sin el reporte de pizarras
  quietas, con pocas casas o con datos raros, no hay número. En ese caso el feed sale **sin ítems** y
  con caché de 5 minutos: IFTTT no publica nada y lo vuelve a intentar en la consulta siguiente.

## Caché

Cubre la misma Cache Rule de Cloudflare de `/feeds/*`. `xFeedCacheControl`: con ítem, `s-maxage`
hasta el próximo turno (al vencer, Cloudflare va al origen en el acto: medido el 12/11/2026, ver
`LINKEDIN_FEED.md`); sin ítem, 300 s. Un deploy del app purga el borde y la consulta siguiente lo
vuelve a llenar.

## El applet de IFTTT

**Ya existe** (creado el 13/11/2026): "Tuits de @cambio_uruguay (dólar y guías)",
<https://ifttt.com/applets/W2Pzb7FA>. "RSS Feed: New feed item" con
`https://cambio-uruguay.com/feeds/x.xml` → "X (Twitter): Post a tweet" con la cuenta
**cambio_uruguay** y sólo `{{EntryContent}}` como texto. "AI Action assist" APAGADO, "Notify me if
this fails to run" prendido. X arma sola la tarjeta del link con la OG image de la página.

**La cuenta de IFTTT tiene DOS cuentas de X conectadas**: `checkleaked` (otro proyecto, con sus
propios applets "API → Post Tweet") y `cambio_uruguay`. IFTTT sólo admite una segunda cuenta por
servicio en **Pro+**, y el plan se subió a Pro+ por esto. Nunca "reconectar" el servicio de X a otra
cuenta: cambia la de todos los applets que lo usan. Para rearmar este applet, elegir
`cambio_uruguay` en el combo "X (Twitter) account" (viene preseleccionada `checkleaked`).

Créditos: 20 el trigger + **100** la acción de X por tuit (unos 36 tuits por mes, 4.300 créditos de
los 100.000 de Pro+).

## Videos nuevos (`/feeds/videos.xml`)

Un segundo feed, para un segundo applet a la misma cuenta: cuando un canal uruguayo de la lista de
`/videos-de-economia-uruguay` sube un video sobre los temas del sitio, la cuenta lo tuitea con
enlace a la página del tema (no a YouTube), directo a la tarjeta del video (`#video-<id>`).

- Feed: `https://cambio-uruguay.com/feeds/videos.xml` (`app/server/routes/feeds/videos.xml.ts`).
  Lógica y textos: `app/utils/videoPosts.ts`. Test: `app/tests/unit/videoPosts.test.ts`.
- Lee el snapshot `videossnapshots` que escribe `currency-videos`, que **desde el 13/11/2026 corre
  cada hora** (antes cada 6 h: "cuando sale" habría sido hasta 6 h tarde).
- **Qué video**: canal uruguayo, clasificador de plata `money` y con tema. Afuera los programas
  diarios con la fecha completa en el título (IMPOUY "Hoy en el Diario Oficial • 13 de noviembre
  2026" saldría todos los días). El título va sin hashtags: en X serían nuestros.
- **Cuándo**: 90 min después de publicado (ya está en el snapshot). Nada entre las 23:00 y las
  8:30 de Montevideo: lo de la noche sale a las 8:30. Por día: máximo 4, uno por canal, una hora
  entre uno y otro; lo que no entra se queda en la página sin tuit. Sin estado: cada hora sale de
  la fecha del video, y el `guid` es el id del video, así que IFTTT no repite nada.
- **Caché**: `s-maxage` hasta el próximo video programado, entre 1 y 15 minutos; misma Cache Rule
  de `/feeds/*`.
- Medido sobre el snapshot real del 13/11/2026: de 1 a 4 tuits por día. Lo que el clasificador de
  temas deja pasar también se tuitea (ese día, "España tuvo su primer paro general", de En
  Perspectiva, en "sueldos y trabajo"): se arregla en `classes/videos/topics.ts`, no acá.
- Créditos de IFTTT: 120 por tuit (20 + 100), unos 60-90 tuits por mes.

**El applet**: "RSS Feed: New feed item" con `https://cambio-uruguay.com/feeds/videos.xml` → "X
(Twitter): Post a tweet", cuenta **cambio_uruguay** (no `checkleaked`), texto sólo
`{{EntryContent}}`, AI Action assist apagado, aviso de falla prendido.

## Por qué no el bot de `bots/`

`bots/` ya tiene `content_promo` (ganchos de guías para X) y el resumen diario sabe tuitear, pero en
el servidor **no hay credenciales de la API de X** (verificado el 12/11/2026), así que nunca
publicaron. IFTTT no necesita una app de desarrollador.

**Ojo con los duplicados:** `CONTENT_PROMO_ENABLED=1` está puesto en `bots/.env`. Si algún día se
cargan las cuatro claves `TWITTER_*` ahí, `currency-content-promo` (lunes, miércoles y viernes) y
`currency-daily` empezarían a tuitear además de este feed. Antes de cargar claves, apagar uno de los
dos caminos.

## Probar

```bash
curl -s https://cambio-uruguay.com/feeds/x.xml
curl -sI https://cambio-uruguay.com/feeds/x.xml | grep -iE 'cache-control|cf-cache-status'
```

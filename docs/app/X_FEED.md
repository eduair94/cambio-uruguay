# Los tuits de la cuenta de X (`/feeds/x.xml`)

La cuenta de X de cambio-uruguay publica sola, con IFTTT leyendo un feed RSS que sirve el app. Es
el mismo esquema que el post diario de LinkedIn (`docs/app/LINKEDIN_FEED.md`): sin job de pm2, sin
base de datos, sin modelo de lenguaje.

- Feed: `https://cambio-uruguay.com/feeds/x.xml` (`app/server/routes/feeds/x.xml.ts`).
- Textos y turnos: `app/utils/xPosts.ts`. Datos del dólar y del real: `app/server/utils/linkedinUsd.ts`
  (compartido con LinkedIn); el BROU en el día y su serie: `app/server/utils/xMarket.ts`.
- Test: `app/tests/unit/xPosts.test.ts` (y `tests/unit/helpers/socialCopy.ts`, compartido).

## Qué publica

| Turno (hora de Montevideo) | Tuit |
|---|---|
| Lunes a viernes, 10:00 | el dólar del día: venta más baja, mejor compra, BROU y la diferencia sobre US$ 1.000, en tres redacciones que rotan por día |
| Lunes, miércoles y viernes, 15:00 | una guía de `X_GUIDES` (39, en orden: más de tres meses sin repetir) |
| Lunes a viernes, 17:00 | el cierre: cuánto subió o bajó el dólar del BROU en el día (`GET /intraday`) y la casa más barata a esa hora. **Sólo si se movió 10 centésimos o más** (`X_CLOSE_MIN_MOVE`): medido sobre 131 días hábiles hasta el 28/11/2026, pasa el 44 % de los días, unos 9 tuits por mes |
| Sábado, 10:00 | el real: la venta más baja en las casas uruguayas y el BROU, con enlace a `/llevar-dolares-o-reales-a-brasil` (para el que viaja a Brasil o compra en la frontera; las casas abren el sábado a la mañana) |
| Domingo, 11:00 | la semana del dólar: el último día hábil contra el de la semana anterior (`GET /evolution/brou/USD`, pizarra común, sin fines de semana) y, con 100 días de historia, si es el más caro o el más barato de los seis meses. Enlace a `/historico/brou/usd` |
| Cuando sale | los videos nuevos de canales uruguayos (ver "Videos nuevos" más abajo): desde el 29/11/2026 salen por este feed |

- **Sin dólar ni cierre los cinco feriados pagos** (1/1, 1/5, 18/7, 25/8, 25/12): las casas no abren.
- El feed tiene **el ítem del turno vigente**, con `guid` `cambio-uruguay-x-AAAA-MM-DD-<turno>`
  (`dolar`, `guia`, `cierre`, `viaje`, `semana`; los dos primeros son los mismos `guid` de antes de
  sumar turnos, así que nada se volvió a tuitear), **más los videos** que ya salieron, con `guid`
  `cambio-uruguay-video-<id>`. IFTTT tuitea cada `guid` una vez.
- El real usa `summarizeCurrency`: las mismas guardas que el dólar (sin BCU, sin pizarras quietas, de
  los últimos 4 días) más 8 casas como mínimo y la más barata a no menos del 85 % de la mediana y del
  BROU: en una moneda con poco movimiento, una pizarra rota es la que sale primera.
- Las guías dicen lo mismo que los posts de LinkedIn (verificado contra cada página), en corto y con
  la voz de la marca. Sin montos ni porcentajes que envejecen; el test vigila además el largo (280
  contando la URL como 23, como X) y las marcas de texto generado.
- **El dólar usa las mismas guardas que LinkedIn** (`summarizeUsd`): sin el reporte de pizarras
  quietas, con pocas casas o con datos raros, no hay número. En ese caso el feed sale **sin ítems** y
  con caché de 5 minutos: IFTTT no publica nada y lo vuelve a intentar en la consulta siguiente.

## Caché

Cubre la misma Cache Rule de Cloudflare de `/feeds/*`. `xFeedCacheControl`: `s-maxage` hasta el
próximo turno o el próximo video programado, con **techo de 15 minutos** (`X_FEED_MAX_TTL`), porque un
video nuevo puede entrar al snapshot en cualquier lectura horaria. Al vencer, Cloudflare va al origen
en el acto (medido el 12/11/2026, ver `LINKEDIN_FEED.md`). Si el turno vigente no tenía datos
confiables, o la base de los videos no contestó, 300 s. Un turno que no publica a propósito (el
cierre de un día quieto) sí tiene datos: no reintenta. Hasta el 28/11/2026 el techo era de 24 h (un
vencimiento por turno); el precio de los videos es una consulta al origen cada 15 minutos, que en
los turnos con número hace tres lecturas al backend.

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

Créditos: 20 el trigger + **100** la acción de X por tuit. Con los turnos del 28/11/2026: dólar ~21,
guías ~13, cierre ~9, real ~4, semana ~4 y videos 30-90 por mes, o sea **80-140 tuits y 10.000-17.000
créditos de los 100.000 de Pro+** (antes, ~36 tuits y 4.300). El applet no cambió: los turnos nuevos
y los videos son ítems nuevos del mismo feed.

## Videos nuevos (`/feeds/videos.xml` → ahora por `/feeds/x.xml`)

Cuando un canal uruguayo de la lista de `/videos-de-economia-uruguay` sube un video sobre los temas
del sitio, la cuenta lo tuitea con enlace a la página del tema (no a YouTube), directo a la tarjeta
del video (`#video-<id>`).

**Desde el 29/11/2026 salen por `/feeds/x.xml`** (`videoXItem`, y `X_VIDEOS_SINCE` para que el
primer deploy no tuiteara de golpe los de los dos días anteriores). El feed propio de abajo se pensó
para un segundo applet que **nunca se creó** (el 28/11/2026 IFTTT no lo había consultado ni una vez
en los logs del origen de la semana). **NO crear ese applet ahora**: los dos feeds usan el mismo
`guid` por video y la cuenta tuitearía cada video dos veces. `/feeds/videos.xml` queda como vista
del mismo plan, sin applet.

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

**El applet que se había previsto** ("RSS Feed: New feed item" con
`https://cambio-uruguay.com/feeds/videos.xml` → "X (Twitter): Post a tweet") no existe y no hace
falta: ver arriba.

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

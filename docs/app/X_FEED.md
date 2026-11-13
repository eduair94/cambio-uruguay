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

"RSS Feed: New feed item" con `https://cambio-uruguay.com/feeds/x.xml` → "X (Twitter): Post a
tweet" con sólo `{{EntryContent}}` como texto. "AI Action assist" APAGADO. Se arma en modo *Classic*
de <https://ifttt.com/create>, igual que el de LinkedIn; X arma solo la tarjeta del link con la OG
image de la página.

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

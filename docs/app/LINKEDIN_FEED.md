# El post diario de LinkedIn (`/feeds/linkedin.xml`)

Un post por día en el perfil personal de LinkedIn del dueño del sitio, armado por IFTTT a partir de
un feed RSS que sirve el app. Sin job de pm2, sin base de datos y sin modelo de lenguaje.

- Feed: `https://cambio-uruguay.com/feeds/linkedin.xml` (`app/server/routes/feeds/linkedin.xml.ts`).
- Textos y lógica: `app/utils/linkedinPosts.ts`. Datos en vivo del lunes: `app/server/utils/linkedinUsd.ts`.
- Test: `app/tests/unit/linkedinPosts.test.ts`.

## Qué publica cada día

| Día | Post |
|---|---|
| Fecha de temporada (`LINKEDIN_SEASONAL`, `MM-DD`) | ese post (hoy: aguinaldo de junio y de diciembre) |
| Lunes | el dólar con números de esa mañana: venta más baja, mejor compra, BROU y la diferencia sobre US$ 1.000. Tres redacciones que rotan por semana |
| Cualquier otro día, o un lunes sin datos confiables | el siguiente de `LINKEDIN_POSTS` (47 posts, casi siete semanas sin repetir) |

El ítem del día aparece a las **9:00 de Montevideo** (12:00 UTC); antes de esa hora el feed sigue
mostrando el de ayer. El feed tiene **un solo ítem** y su `guid` es la fecha
(`cambio-uruguay-linkedin-AAAA-MM-DD`): IFTTT dispara una vez por `guid` nuevo, así que corregir
el texto de un día que ya salió no lo vuelve a publicar.

### Por qué los textos están escritos a mano

El pedido fue "que no suene a IA". Lo que delata a un texto generado es el patrón entero (pregunta
retórica de apertura, raya, tres adjetivos, emoji, moraleja), y un modelo llamado todos los días lo
repite. El test vigila las marcas más obvias (raya, `¡`, hashtags, emoji, "sabías que", "no solo",
"clave" como adjetivo, "aquí"...) y que ningún post fijo traiga `$` ni `%`.

### Regla para agregar un post

Igual que `bots/src/format/promos.ts`: cada afirmación tiene que estar en la página enlazada y ser
**estable** (mecanismos, no montos ni fechas). Sale bajo el nombre de una persona y LinkedIn no deja
corregir sin que se note. Entre 150 y 900 caracteres, la primera línea es el gancho (LinkedIn corta
con "ver más" cerca de los 210), voseo, sin URL en el texto (la agrega `linkedinMessage`). Agregar al
final de la lista no cambia lo que sale los días anteriores, pero sí corre la rotación de los
siguientes: no importa, el `guid` es la fecha.

### Las guardas del lunes

El número sale publicado bajo un nombre propio, así que el post en vivo se cae a la rotación ante
cualquier duda (`summarizeUsd` devuelve `null`):

- sin el reporte de `GET /frozen-quotes` no hay post en vivo. **Medido el 12/11/2026**: una casa con
  la venta del dólar quieta hacía 120 días quedaba primera por más de un peso;
- menos de 10 casas utilizables, filas de más de 4 días, BCU y cotizaciones especiales afuera;
- una mejor compra mayor o igual a la venta más baja (arbitraje gratis = dato roto);
- una venta más baja a más de 10 % por debajo del BROU (coma corrida).

Si la diferencia contra el BROU es menor a $ 100 sobre US$ 1.000, el post no compara contra el BROU.

## Cómo armar el applet en IFTTT (una vez)

La [API de IFTTT](https://ifttt.com/docs/api_reference) **no sirve para esto**: es el protocolo que
implementa el dueño de un servicio para que IFTTT lo llame, no una forma de crear applets o publicar.
El camino es un applet común. **El applet ya existe** (creado el 12/11/2026): "Post diario de
cambio-uruguay.com en LinkedIn", <https://ifttt.com/applets/tRmuXzx6>, con "AI Action assist"
APAGADO (si se prende, IFTTT reescribe cada post con IA) y "Notify me if this fails to run"
prendido. IFTTT cobra en créditos: 20 el trigger + 20 la acción por post. La cuenta consulta el
feed cada 5 minutos (Pro); en el plan gratis es cada hora.

Para rearmarlo desde cero (modo *Classic*, no *Chat*):

1. Entrar a <https://ifttt.com/create>.
2. **If This** → buscar **RSS Feed** → **New feed item** → Feed URL:
   `https://cambio-uruguay.com/feeds/linkedin.xml` → *Create trigger*. (No usar "New feed item
   matches", que filtra por palabra.)
3. **Then That** → buscar **LinkedIn** → *Connect* (pide entrar con la cuenta de LinkedIn) →
   **Share an update** → en el mensaje dejar sólo el ingrediente `{{EntryContent}}` (borrar lo que
   IFTTT precarga) → *Create action*.
   - Variante con imagen: **Share an update with image**, mensaje `{{EntryContent}}` e imagen
     `{{EntryImageUrl}}` (el feed trae la OG image de la página en `enclosure` y `media:content`).
     Probarla una vez: si IFTTT no llena `EntryImageUrl`, volver a "Share an update".
   - No usar **Share a link**: el texto ya trae la URL al pie y quedaría duplicada.
4. *Continue* → nombre del applet → apagar "Receive notifications when this Applet runs" → *Finish*.

IFTTT no publica los ítems que ya estaban en el feed al crear el applet: el primer post sale con el
primer `guid` nuevo, a las 9 del día siguiente (con la lectura cada 5 minutos, antes de las 9:10).

**A revisar con el primer post**: que LinkedIn respete los saltos de línea de `{{EntryContent}}`. El
texto va en CDATA con saltos reales; si IFTTT los aplana, el post se lee igual pero en un solo
bloque.

## Cómo se mide

Los enlaces van **sin UTM** a propósito: un `?utm_source=...&utm_medium=...` largo al pie de un
post personal es la marca más visible de que lo publicó un robot. LinkedIn envuelve los enlaces en
`lnkd.in`, así que GA4 los cuenta como referencia de `linkedin.com` / `lnkd.in`
(*Adquisición de tráfico → Fuente / medio de la sesión*). Lo que abre la app de LinkedIn en su
navegador interno puede llegar sin referrer y caer en "direct".

No lleva fila en `docs/seo/experiments.json`: esa medición es la porción de clics de Search
Console por ruta, y esto no cambia nada de lo que ve Google; además rota por decenas de rutas.

## Probar el feed

```bash
curl -s https://cambio-uruguay.com/feeds/linkedin.xml
curl -sI https://cambio-uruguay.com/feeds/linkedin.xml   # HEAD también responde (sin sufijo .get)
```

Cabeceras: `application/rss+xml`, `x-robots-tag: noindex` (no es una página) y
`LINKEDIN_FEED_CACHE_CONTROL`: `s-maxage=300` (los lunes tiene que verse el número de esa mañana)
con `stale-while-revalidate` y `stale-if-error` de un día, **sin `must-revalidate`**.

### La caché del borde (por qué IFTTT no depende del origen)

El 12/11/2026 a las 17:01 UTC el origen se trabó dos minutos (97 respuestas 499/503 en todo el
sitio, VPS compartido) e IFTTT marcó el applet con "The service took too long to respond": el log
de nginx (`/usr/local/apache/domlogs/cambio-uruguay.com.log`) muestra la consulta de
`IFTTT/1.0` de ese minuto como 499, y todas las demás en 200. El feed salía `cf-cache-status:
DYNAMIC` porque la regla de páginas de Cloudflare excluye las rutas con extensión.

Desde ese día hay una Cache Rule propia (`starts_with(http.request.uri.path, "/feeds/")`,
`edge_ttl: bypass_by_default`, la misma postura que las demás: guarda sólo si el origen manda
`s-maxage`). Con eso, más los `stale-*`, el borde contesta con la copia que tiene aunque el origen
no responda. Se verifica con `cf-cache-status` (`HIT`, o `STALE`/`UPDATING` al vencer) y en el log de
nginx: las consultas de `IFTTT/1.0` dejan de llegar al origen cada 5 minutos.

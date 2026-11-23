# Fotos con IA: lo que muestran las fotos, medido antes de publicarlo

Fecha: 2026-11-23. Estado: aprobada por la orden vigente del dueño (specs y planes se autoaprueban).
Origen: el estudio de factibilidad privado (`docs/seo/data/reports/Imágenes con IA para directorios.md`,
gitignored) y su piloto medido (43 avisos, 185 fotos, Haiku 5.5).

## Por qué

Ningún portal uruguayo le muestra al comprador nada sacado de las fotos de los avisos. El piloto midió
que Claude Haiku 5.5 acierta lo que se ve claro (balcón 10/10, renders 6/6, marcas de agua 10/10,
odómetro 2/2) a ~USD 0,002 por aviso, y falla justo en lo que más duele (humedad, daño, "amueblado"
74 %). La regla de la casa es "la IA no publica, filtra", y la vara para publicar un atributo es
≥ 95 % de precisión sobre ≥ 100 casos etiquetados por una PERSONA (el piloto lo verificó otra IA).

El usuario pidió "optimizar e implementar la mejora de enriquecimiento con IA". Este trabajo hace las
dos cosas que se pueden hacer hoy sin romper esa regla: abaratar y ampliar la visión que ya corre en
autos, y empezar a juntar en sombra —sin publicar— los hechos visuales de alquileres y ventas, con la
herramienta para que una persona los etiquete y la métrica que decide qué se publica.

## Metas

1. **Visión de autos más barata y más útil** (`currency-autos-detail`):
   - fotos reducidas a 1.024 px de lado mayor antes de mandarlas (InfoCasas sirve 1920×1440,
     Casasweb 1634×1225, ML 1200 px), y con eso 6 fotos por aviso en vez de 4 por un costo parecido;
   - el prompt fijo cacheado (`cache_control` en el `system`; el mínimo de Haiku 5.5 es 512 tokens);
   - la VERSIÓN del aviso en el prompt (hoy viaja `trim: null`);
   - el contador `vision.rejected` cuenta con `photoRejection()` (hoy cuenta `matchesAdvert: false`,
     que desde el 18/9 no retira nada);
   - lectura del **odómetro** y de la **palanca** cuando una foto los muestra. El odómetro retira en
     silencio la oportunidad si el tablero marca mucho más que lo declarado (> 1,25 × y ≥ 20.000 km:
     el caso de r/AutosUy, 130.000 declarados contra 208.936 en la foto). La palanca se guarda y no
     retira nada hasta medirla. Nada de esto se publica.
2. **Job nuevo `currency-photo-facts`, en sombra**: mira hasta 6 fotos de los avisos de alquiler y de
   venta que tienen galería (InfoCasas, Casasweb, El País, Mercado Libre) y guarda en una colección
   PRIVADA qué ambiente muestra cada foto y qué se ve (balcón/terraza, patio/jardín, parrillero,
   piscina, aire, cocina integrada, mobiliario), banderas internas (render, marca de agua o texto
   sobreimpreso, collage, logo o foto vacía) y la mejor portada. No escribe en `rentallistings` ni en
   `propertysalecatalog`, y ninguna API lo lee.
3. **Higiene sin modelo**: placeholders y fotos diminutas descartados antes de pagar (el logo de El
   País pesa 2.353 bytes y mide 338×253), fotos repetidas dentro del aviso descartadas por hash, y una
   huella perceptual (dHash de 64 bits) por foto, guardada, para contar cuántas fotos se repiten entre
   anunciantes distintos.
4. **Etiquetado humano y veredicto**: `npm run photo_facts_label` arma una página HTML local con las
   fotos y las respuestas del modelo para que una persona marque correcto/incorrecto/no se ve, y
   `npm run photo_facts_eval` calcula precisión por atributo contra la vara (≥ 95 %, ≥ 100 casos,
   ≥ 30 positivos) y dice cuál pasa.
5. **Medir el uso de filtros**: evento GA4 `directory_filter` cuando cambia un filtro de los
   directorios de alquileres, ventas, autos y motos — sólo el NOMBRE del filtro, nunca el valor.
   Hoy el sitio no sabe si alguien usa "amueblado" o "piscina".

## No metas (en este trabajo)

- Publicar cualquier atributo visual. Eso es un trabajo aparte, por atributo, después de que pase
  la vara con etiquetas humanas, con su fila en `docs/seo/experiments.json`.
- Batch API (−50 %). Se deja para cuando el volumen lo justifique: con fotos a 1.024 px y caché, la
  sombra entra en un tope propio de pocos dólares por mes.
- Facebook, TikTok, Instagram y motos: una sola foto de 260 px que vence en días, términos de Meta.
- Gemini como respaldo de este job: pagaría ~1,7× por un modelo que en el piloto contestó peor. Sin
  crédito de Claude, el job corta.

## Anti-metas (lo que lo haría un fracaso aunque funcione)

- Publicar o dejar que una API sirva humedad, daño, estado, "render" o "foto robada".
- Pedirle al modelo matrículas, caras, teléfonos o cualquier texto de la foto.
- Unir avisos por foto parecida (regla de San Luis). La huella se cuenta, no une nada.
- Que el job se coma el pozo de créditos de los demás: tiene tope mensual propio.
- Mandar la descripción del aviso al modelo: "visto en las fotos" tiene que ser independiente del texto.

## Restricciones

- **El VPS es CentOS 7 (glibc 2.17)**: `sharp` no carga ahí. Achicar fotos va en JS puro
  (`jpeg-js`, decodificar, promediar por cajas, recodificar a calidad 80). Una foto que no es JPEG se
  pide en su variante `.jpg` cuando el CDN la tiene (ML) y si no se manda tal cual.
- Toda llamada a Claude pasa por `classes/anthropic.ts` (tripwire `anthropic_key_ownership`).
- Todo job importa `./sentry_job` primero, entra en `OTHER_APPS` y arranca en un minuto libre:
  `:12` (lejos de la cosecha horaria de alquileres a las :47 y de las fichas a las :25 y :35, que
  leen los mismos sitios).
- `npx tsc -p tsconfig.production.json --noEmit` entero antes de empujar.

## Enfoques considerados

1. **Una llamada por aviso, síncrona, con fotos achicadas y prompt cacheado** (elegido). Reusa el
   router, la rotación de claves y el libro de gasto que ya existen; el piloto midió exactamente esta
   forma; el costo converge al de las altas porque cada veredicto se guarda por hash de la galería.
2. **Batch API**: −50 % pero asíncrona (hasta 24 h), con el lote atado a la clave que lo creó, y el
   libro de gasto y el tope por clave habría que rehacerlos. Vale cuando el volumen pase de cientos
   de dólares; hoy son pocos.
3. **Proveedor especializado (Restb.ai)**: 55–280× el costo medido, sin precisión independiente
   publicada. Descartado.

## Diseño

### `classes/vision/photos.ts` (compartido)
`preparePhotos(urls, { max, maxEdge, fetcher })` baja cada foto (UA del sitio, `fetchBuffer`), la
decodifica si es JPEG, descarta la que mide < 400 px de lado mayor o pesa < 4 KB, descarta la repetida
dentro del aviso por SHA-1 del contenido, la achica a `maxEdge` (1.024) y la recodifica. Devuelve por
foto `{ url, data, mimeType, width, height, sha1, dhash, resized }`, con `dhash` = 16 hex o `null`
si no se pudo decodificar. `mlJpegVariant(url)` cambia `…-F.webp` de mlstatic por `…-F.jpg`.

### `classes/anthropic.ts`
`askClaudeWithImages` acepta `cacheSystem: true` (el `system` va como bloque con
`cache_control: {type: "ephemeral"}`) y devuelve también `usage` y `costUsd` estimado, para que un
job lleve su propio tope. Nada más cambia.

### Autos (`classes/autos/llm/vision.ts`, `sync_autos_detail.ts`)
Esquema con `odometerKm` (entero o `null`: sólo si el número del tablero se lee entero) y `gearbox`
(`manual | automatica | no_se`), `schema: 2` en el veredicto. Las 6 fotos pasan por `preparePhotos`.
`photoRejection` agrega `photo_km`. La cola mira primero los nunca revisados y después los revisados
con esquema viejo. `vision` en la meta suma `odometerRead`, `kmRejected` y `costUsd`.

### `currency-photo-facts` (`sync_photo_facts.ts`, `classes/photofacts/`)
- **Sujetos**: ofertas vigentes de `rentallistings` y avisos de `propertysalecatalog` con ≥ 3 fotos,
  de InfoCasas, Casasweb, El País o ML. Montevideo primero, después lo más reciente. Un aviso se
  vuelve a mirar sólo si cambia el hash de su galería o la versión del esquema.
- **Llamada**: hasta 6 fotos (portada + galería repartida), `system` fijo cacheado, pregunta mínima
  sin descripción, esquema estricto. Esfuerzo bajo.
- **Normalización**: los atributos de comodidades son `si | no_se` (nunca "no"), el mobiliario es
  `si | no | no_se` y se fuerza a `no_se` si ninguna foto es de interior o hay renders; la portada
  nunca es plano, logo, vista ni render.
- **Guarda**: APP DB `photofacts`, un documento por aviso (`<vertical>:<listingId>`) con fotos,
  hechos, modelo, esquema, fecha, costo y tokens; una lectura fallida se guarda con espera creciente.
  `photofactsmetas` (`key: run`) con los contadores de la corrida y la cuenta de huellas repetidas
  entre anunciantes.
- **Presupuesto**: `PHOTO_FACTS_MAX` (40 por corrida), `PHOTO_FACTS_MINUTES` (6),
  `PHOTO_FACTS_MONTHLY_USD` (8, sumado de la propia colección), `PHOTO_FACTS_ENABLED=0` lo apaga.
  Sin clave de Claude utilizable sale en 0 sin hacer nada.
- `--dry-run` elige y muestra los sujetos sin bajar fotos ni llamar al modelo.

### Etiquetado y veredicto (`scripts/oneoff/`, `classes/photofacts/evaluate.ts`)
`photo_facts_label` (sólo lectura) toma una muestra estratificada —con positivos de cada atributo— y
escribe un HTML autocontenido en `docs/seo/data/fotos-etiquetado/` (gitignored): fotos enlazadas,
respuesta del modelo, tres botones por atributo, guarda en `localStorage` y exporta un JSON.
`photo_facts_eval <labels.json>` imprime por atributo n, positivos, precisión e intervalo de Wilson, y
"pasa / no pasa" contra la vara.

### GA4 (`app/`)
`trackFilterChanges(directory, antes, después)` en `app/utils/directoryFilterTracking.ts`: compara
las claves de los parámetros y emite un `directory_filter` por clave cambiada, con
`{ directory, filter, action: set|clear }`. Nunca el valor. Lo llaman los cuatro directorios en el
watcher que ya recarga la lista.

## Lo que queda al constructor

Nombres internos, tamaño exacto de la muestra estratificada, el reparto de las 6 fotos dentro de la
galería, y los textos de los logs.

## Cómo se sabe si funcionó

- Autos: `vision.costUsd` por corrida baja contra la línea de base, con 6 fotos en vez de 4.
- Sombra: a los 7 días hay ≥ 1.000 avisos mirados, costo dentro del tope, y la cuenta de fotos
  repetidas entre anunciantes.
- Etiquetado: cuando una persona etiqueta ≥ 100 casos, `photo_facts_eval` dice qué atributo pasa.
  Sólo esos se publican, en otro trabajo.
- Filtros: GA4 muestra `directory_filter` por filtro en una semana.

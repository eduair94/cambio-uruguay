# Integración con Google Search Console (Search Analytics + URL Inspection)

Cómo queda andando `currency-gsc`: el job que baja todos los días lo que la gente **busca** antes de
llegar al sitio, lo archiva, y calcula la lista de oportunidades que se lee en
`/estadisticas-de-busqueda`.

GA4 y Search Console contestan preguntas distintas y no se reemplazan:

| | GA4 (`currency-site-analytics`) | Search Console (`currency-gsc`) |
|---|---|---|
| qué mide | qué hizo la visita **una vez que llegó** | qué **escribió** en Google, qué URL le ofreció y en qué posición |
| a quién ve | sólo a quien acepta cookies (ver más abajo) | a todos |
| se publica | sí, en `/estadisticas-del-sitio` | **no**, es privado |

---

## 1. Cómo funciona

```
Search Console · propiedad de dominio sc-domain:cambio-uruguay.com
   │  cuenta de servicio con permiso de lectura
   │
   ├── webmasters/v3 · searchAnalytics.query        ── LO QUE SE BUSCA ──
   │      ▼
   │   sync_gsc.ts            ← pm2 `currency-gsc`, 11:20 UTC todos los días
   │      │  classes/gsc/{client,refresh,opportunities,store}.ts
   │      ▼
   │   Mongo de la APP
   │      ├── searchconsoledays        ← UN documento por día. El archivo.
   │      └── searchconsolesnapshots   ← UN documento vivo. El tablero.
   │      ▼
   │   app/server/api/search-console.get.ts   ← requireAdmin, sin caché
   │      ▼
   │   app/pages/estadisticas-de-busqueda.vue ← privada, noindex, fuera del sitemap
   │
   └── searchconsole/v1 · urlInspection.index.inspect   ── ¿ESTÁ INDEXADA? ──
          ▼
       muestra rotativa de 20 URLs por corrida (la cuota es 2.000/día)
```

### Decisiones tomadas, y por qué

- **El archivo es el punto.** Search Console **borra todo lo que pasa de 16 meses** y no hay forma de
  pedirlo de vuelta. `searchconsoledays` es la única memoria larga que va a existir: dentro de un año
  es lo que permite contestar "¿desde cuándo viene cayendo esta página?".
- **Un documento por día con arrays, no una fila por (día, consulta).** 15.000 consultas × 365 días
  son 5,5 millones de documentos para decir lo mismo que dicen 70 MB de arrays. El costo del cambio
  es que "la serie de una consulta" cuesta 90 lecturas — irrelevante, porque el único que la lee es
  un job nocturno, nunca una request web.
- **Los totales se piden SIN dimensiones.** Sumar un desglose no reproduce los números de Google:
  sumar consultas subestima las impresiones en un tercio (Search Console oculta las consultas raras:
  medido el 2026-09-01, 325.333 por consulta contra 569.826 por página en la misma ventana), y sumar
  páginas acierta las impresiones pero da posición media 9,16 donde la pantalla oficial dice 8,37,
  porque una consulta puede mostrar dos URLs nuestras. Un tablero que no coincide con la pantalla
  oficial es un tablero que nadie cree.
- **El atraso de 3 días no es un bug.** Search Console cierra cada día con ~3 días de demora. Todas
  las ventanas terminan en `hoy − 3` con `dataState: "final"`, y cada corrida vuelve a bajar la
  última semana para absorber las correcciones de Google.
- **El pozo cero-clic se identifica primero y se excluye de todo lo demás.** Medido en agosto de
  2026: 68 consultas con 140.377 impresiones (43 % del total atribuido a consultas) rindieron 44
  clics — "dolar hoy", "cotizacion brou", las conversiones de moneda. Google las contesta en la
  propia pantalla. Una lista de oportunidades que las incluye manda a alguien a pelear contra una
  caja de respuesta.
- **La curva de CTR es la del propio sitio, no una tabla de la industria.** Una tabla genérica dice
  que la posición 3 rinde ~10 %; acá rinde ~0,9 %, porque la mitad de las impresiones están debajo
  de una caja que ya contestó. Medir contra la curva prestada produce una lista de fantasías.
- **La página es privada y falla cerrada.** El documento tiene las consultas que la gente escribió.
  `NUXT_ADMIN_EMAILS` sin definir ⇒ la ruta contesta **503**, nunca "que pase cualquiera".

---

## 2. Configuración (una sola vez)

### A. Habilitar la API

1. <https://console.cloud.google.com> → proyecto **`helpbot-nconrh`** (el mismo de GA4).
2. **APIs y servicios → Biblioteca** → buscar **Google Search Console API** → **Habilitar**.

### B. Dar acceso a la cuenta de servicio

1. <https://search.google.com/search-console> → propiedad **cambio-uruguay.com**.
2. **Configuración → Usuarios y permisos → Agregar usuario**.
3. Pegar el correo de la cuenta de servicio (la misma de GA4):
   `cambio-uruguay@helpbot-nconrh.iam.gserviceaccount.com`
4. Permiso **Completo**. Con *Restringido* alcanza para `searchAnalytics`, pero la **inspección de
   URLs** (el control de indexación) exige Completo; con permiso restringido devuelve 403 y el job
   simplemente saltea esa parte, sin fallar.

### C. Variables de entorno (en `/root/cambio-uruguay/.env`)

```bash
GSC_SITE_URL=sc-domain:cambio-uruguay.com   # propiedad de DOMINIO (verificado 2026-09-01)
# Credenciales: si no se define nada, reutiliza la llave de GA4 (GA4_KEY_FILE). No hace falta
# una llave nueva.
# GSC_KEY_FILE=/root/cambio-uruguay/gsc_key.json
APP_MONGO_URI=...    # ya existe; el job se niega a correr sin esto
```

Y en `/root/cambio-uruguay/app/.env`, para que la página privada deje entrar a alguien:

```bash
NUXT_ADMIN_EMAILS=tu-correo@ejemplo.com
```

> Ojo: el app Nuxt lee `useRuntimeConfig()`, no `process.env`. Agregar la variable al `.env` **no
> alcanza con `pm2 reload`**: hace falta un build (un push a `main` que toque `app/**`, que es lo
> que dispara `nuxt build` en el VPS). Es la misma trampa documentada en `driversIngestToken`.

### D. Verificar

```bash
cd /root/cambio-uruguay
npx ts-node -T sync_gsc.ts --dry-run      # no escribe nada
```

Tiene que imprimir la propiedad, el nivel de permiso y los totales. Si la propiedad no aparece, el
error dice exactamente qué identificadores puede leer la cuenta de servicio: una propiedad de
dominio se escribe `sc-domain:ejemplo.com`, una de prefijo `https://ejemplo.com/`.

---

## 3. Llenar el archivo (una vez, y conviene hacerlo ya)

Search Console guarda ~16 meses. Todo mes que pasa sin bajar es un mes que se pierde para siempre.

```bash
cd /root/cambio-uruguay
node dist/sync_gsc.js --backfill=120    # ~120 días, saltea lo ya archivado
# repetir subiendo el número hasta cubrir los 16 meses
node dist/sync_gsc.js --backfill=480
```

Cada día cuesta 5 llamadas y las que ya están archivadas se saltean, así que repetir el comando es
barato e idempotente.

## 4. Banderas

| bandera | qué hace |
|---|---|
| `--dry-run` | baja y calcula, imprime, no escribe |
| `--backfill[=N]` | archiva N días hacia atrás (120 por defecto), salteando lo guardado |
| `--no-inspect` | saltea la muestra de indexación (ahorra 20 de las 2.000 llamadas diarias) |
| `--allow-thin` | guarda un snapshot que parece una falla de la API. Sólo para sembrar |

## 5. Cuotas y límites reales

- `searchAnalytics.query`: 25.000 filas por request (se pagina con `startRow`) y 30.000 requests por
  día por propiedad. Una corrida normal usa ~50, así que la cuota DIARIA nunca es el problema.
- **La que sí muerde es la de QPS**, y no está documentada como un número: el primer backfill en
  producción disparaba cuatro llamadas concurrentes por día archivado y a las pocas decenas de días
  recibió `403 Search Analytics QPS quota exceeded`. Por eso `client.ts` pone TODAS las llamadas en
  una cola serial con un intervalo mínimo (`GSC_MIN_INTERVAL_MS`, 350 ms por defecto) y reintenta
  las respuestas de cuota con backoff exponencial. Un 403 de permisos NO se reintenta: es un error
  de configuración, no una ráfaga, y `isQuotaError()` distingue los dos.
- `urlInspection`: **2.000 por día** por propiedad, 600 por minuto. Por eso la muestra rota en vez de
  barrer las ~1.900 URLs del sitio.
- Search Console **oculta las consultas raras** por privacidad. Los desgloses por consulta nunca van
  a sumar el total del sitio, y eso no es un error de paginación.

## 6. Qué NO hace, a propósito

- **No publica nada.** Las consultas son el activo competitivo del sitio; el endpoint es privado y la
  página está fuera del sitemap, en `robots.txt` y con `noindex`.
- **No escribe páginas solo.** La lista de oportunidades es una cola para revisar, no un generador.
- **No usa la Indexing API.** Google la acepta sólo para `JobPosting` y transmisiones en vivo; usarla
  para páginas comunes no acelera nada y es lo que se documenta como abuso.

## 7. La otra mitad del problema: GA4 ve una fracción del tráfico

Medido el 2026-09-01, misma ventana de 28 días:

| fuente | dice |
|---|---|
| Search Console | **2.475 clics** orgánicos |
| GA4, canal *Organic Search* | **621 sesiones** |

GA4 ve ~25 % de lo que Google dice que manda. La causa está en `nuxt.config.ts`: Consent Mode v2
arranca con `analytics_storage: 'denied'` para **todo el mundo**, y el modelado de comportamiento que
Google usa para rellenar ese hueco exige un volumen (miles de eventos diarios en cada estado, siete
días seguidos) que este sitio no alcanza. Resultado: quien no toca el banner no existe en los
informes — y, con `ad_storage` también denegado, ve anuncios no personalizados, que pagan menos.

La corrección estándar es **acotar el default por región** (`gtag('consent','default',{...,
region:[...]})`): mantener el rechazo por defecto para el EEE/Reino Unido/Suiza, que es donde la
política de consentimiento de Google lo exige, y para el resto del mundo pedir el consentimiento sin
bloquear la medición de antemano. Es una decisión de producto y de criterio legal (en Uruguay rige la
Ley 18.331, que no impone el opt-in previo del modo europeo), así que **no se cambió acá**: queda
documentado para decidirlo aparte.

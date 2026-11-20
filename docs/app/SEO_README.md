# SEO Improvements for Cambio Uruguay

This document outlines all the SEO improvements implemented for the Cambio Uruguay application.

## Files Added/Modified

### Configuration Files

- `nuxt.config.js` - Enhanced with comprehensive SEO meta tags, sitemap, and robots.txt configuration
- `tsconfig.json` - TypeScript configuration for SEO utilities

### SEO Assets

- `static/humans.txt` - Human-readable information about the development team
- `static/sitemap-backup.xml` - Backup sitemap in case automatic generation fails
- `static/robots-backup.txt` - Backup robots.txt with detailed bot configurations
- `static/.well-known/security.txt` - Security contact information
- `static/.well-known/feed.json` - JSON feed for content syndication
- `assets/css/critical.css` - Critical CSS for above-the-fold content optimization

### TypeScript Utilities

- `plugins/seo-utils.ts` - Comprehensive SEO utilities for dynamic content
- `types/seo.d.ts` - TypeScript definitions for SEO utilities

### Enhanced Components

- `layouts/default.vue` - Added structured data and performance optimizations
- `pages/index.vue` - Enhanced with proper header hierarchy and SEO content sections

## SEO Features Implemented

### 1. Meta Tags Optimization

- **Open Graph**: Complete OG tags for Facebook/LinkedIn sharing
- **Twitter Cards**: Summary large image cards for Twitter sharing
- **Geo Tags**: Location-specific tags for Uruguay
- **App Tags**: PWA and mobile app meta tags
- **Security**: Content security and referrer policies

### 2. Structured Data (Schema.org)

- **Organization Schema**: Business information
- **WebApplication Schema**: App categorization
- **ExchangeRateSpecification**: Currency exchange data
- **BreadcrumbList**: Navigation structure
- **FAQPage**: Frequently asked questions
- **Product/Service**: Currency comparison data

### 3. Sitemap Generation

- **Dynamic Routes**: Currency and location-specific URLs
- **Multi-language**: Support for ES, EN, PT
- **Hourly Updates**: Real-time currency data consideration
- **Priority Mapping**: Logical priority assignment

### 4. Robots.txt Configuration

- **Bot-specific Rules**: Tailored crawling for different search engines
- **Crawl Delays**: Optimized for server performance
- **Disallow Patterns**: Protected admin and build directories
- **Sitemap Reference**: Proper sitemap location

### 5. Performance Optimizations

- **Critical CSS**: Above-the-fold styles inlined
- **Preconnect**: DNS prefetching for external resources
- **Image Optimization**: Lazy loading and responsive sizing
- **Resource Hints**: Preload critical resources

### 6. Internationalization SEO

- **Hreflang Tags**: Proper language/region targeting
- **Canonical URLs**: Duplicate content prevention
- **Language-specific Sitemaps**: Per-language content organization

### 7. Security and Compliance

- **Security.txt**: Responsible disclosure information
- **Content Security Policy**: XSS protection headers
- **Referrer Policy**: Privacy protection

## Usage Examples

### Dynamic Meta Tags

```typescript
// In a Vue component
export default {
  head() {
    const meta = this.$seo.generateCurrencyMeta('USD', 'MONTEVIDEO')
    return {
      title: meta.title,
      meta: [
        { hid: 'description', name: 'description', content: meta.description },
        { hid: 'keywords', name: 'keywords', content: meta.keywords },
      ],
    }
  },
}
```

### Structured Data

```typescript
// Generate currency exchange structured data
const structuredData = this.$seo.generateCurrencyStructuredData(
  'USD',
  45.5,
  'Montevideo',
)

// Add to head
this.$nuxt.$head.script.push({
  type: 'application/ld+json',
  json: structuredData,
})
```

### Image Optimization

```typescript
// Optimize images for SEO
const imageProps = this.$seo.optimizeImage(
  '/img/banner.png',
  'Cambio Uruguay Banner',
  1200,
  630,
)
```

## Monitoring and Maintenance

### Search Console Setup

1. Verify domain ownership
2. Submit sitemap: `https://cambio-uruguay.com/sitemap.xml`
3. Monitor crawl errors and index coverage
4. Track Core Web Vitals

### Performance Monitoring

1. **PageSpeed Insights**: Monitor loading performance
2. **Lighthouse**: Check SEO score regularly
3. **GTmetrix**: Track performance metrics

### Content Updates

1. Update `humans.txt` when team changes
2. Refresh structured data when business info changes
3. Monitor sitemap generation for new currencies/locations
4. Update security.txt annually

## Testing Commands

```bash
# Check robots.txt
curl https://cambio-uruguay.com/robots.txt

# Validate sitemap
curl https://cambio-uruguay.com/sitemap.xml

# Test structured data
# Use Google's Rich Results Test Tool

# Check meta tags
curl -s https://cambio-uruguay.com | grep -i "meta\|title"
```

## Best Practices Implemented

1. **Mobile-First**: All SEO optimizations are mobile-responsive
2. **Page Speed**: Critical CSS and resource optimization
3. **User Experience**: Proper heading hierarchy and semantic markup
4. **Accessibility**: Alt texts and ARIA labels
5. **Content Quality**: Unique, relevant descriptions for each page variation
6. **Technical SEO**: Proper canonicalization and URL structure

## Superficie para agentes de IA: /llms.txt, /llms-full.txt e IndexNow (2026-09-22)

### `/llms.txt` (generado desde el 2026-11-20)

- **Qué era y por qué cambió**: hasta el 2026-11-20 era el archivo estático `public/llms.txt`,
  escrito cuando el sitio era el comparador de cotizaciones. No nombraba ningún directorio de
  precios, ni `/api/datos`, ni `/datos-abiertos-uruguay`, ni `/buscar-con-ia`, y decía "145 guías"
  cuando ya eran 156. En GA4 (sesiones que GA4 atribuye a asistentes de IA, 23/10–19/11/2026) las
  cotizaciones y las guías sumaban menos de una de cada diez: el resto aterrizaba en autos usados
  y el precio por modelo, alquileres, celulares, equipar, monopatines, motos y el súper.
- **De dónde sale**: `utils/llmsIndex.ts` (`renderLlmsIndex`, puro, sin reloj) y el route
  `server/routes/llms.txt.ts` (sin sufijo de método, así responde HEAD; `text/plain; charset=utf-8`,
  `cache-control: public, max-age=0, must-revalidate, s-maxage=3600`, igual que `/llms-full.txt`).
  Lo arma con `DIRECTORIOS`, `tools`, `guides.length`, `OPEN_DATA_ENDPOINTS` y `AI_TOOLSETS`, así que
  un directorio, una herramienta, una guía o un toolset del MCP nuevo entra solo. Cada directorio
  lleva su cadencia de actualización en palabras (`LLMS_DIRECTORIO_FRESHNESS`, con el job de pm2
  citado al lado) y las páginas estables para citar en vez de un aviso que vence
  (`LLMS_STABLE_PATTERNS`). No lleva conteos ni fechas: cada página imprime los suyos.
- **Formato** (https://llmstxt.org): H1, resumen en blockquote, texto libre SIN encabezados (los
  "Datos clave", las respuestas con autoridad y las notas para asistentes viven ahí) y secciones
  H2 que son sólo listas `- [nombre](url): notas`, cerrando con `## Optional`.
- **Guardas**: `tests/unit/llmsIndex.test.ts` — el formato; que cada enlace del sitio sea una
  página de `pages/`, una guía o un route que existe; que ninguna esté en la lista `NEVER` de
  `utils/edgeCache.ts` (privadas y personales: `/asistente-ia`, `/buscar`, `/api-reference` no
  van); que robots.txt deje leerlas a todos los grupos; que las claves de la cadencia sean
  exactamente los ids de `DIRECTORIOS`; y que **no exista `public/llms.txt`**: Nitro sirve `public/`
  antes que los routes y un archivo estático taparía el route sin que nada fallara.

### `/llms-full.txt`

- **Qué es**: la versión larga de `/llms.txt`. Un bloque por guía editorial del catálogo
  (`utils/guides.ts`, 145 guías al 2026-09-22) con `## <título>`, `> <resumen>` (la `description`
  o, si estuviera vacía, el cuerpo de la primera sección), `Actualizado: <updatedAt>` **tal cual**
  (ISO, el mismo valor que la página emite como `datePublished`/`dateModified`) y la URL canónica
  `https://cambio-uruguay.com/guias/<slug>` sin prefijo de idioma ni barra final, calcada de
  `pages/guias/[slug].vue`. Abre con el mismo resumen que `llms.txt` (`LLMS_SITE_SUMMARY`), y
  `llms.txt` lo enlaza desde "Guías".
- **De dónde sale**: `utils/llmsFull.ts` (`renderLlmsFull(guides, siteUrl)`, puro, sin Nuxt) y el
  route de Nitro `server/routes/llms-full.txt.ts` (`text/plain; charset=utf-8`,
  `cache-control: public, max-age=0, must-revalidate, s-maxage=3600`, la misma postura de caché
  que el sitemap).
- **Por qué un route y no una página**: no es HTML ni una página indexable (no va al sitemap), no
  lleva chrome ni OG image, y no dispara el guard de `siteNav-coverage.test.ts`, que sólo recorre
  `pages/**`. `html-cache-control.ts` lo saltea por la extensión.
- **Guardas**: `tests/unit/llmsFull.test.ts` — cada guía exactamente una vez, canónica exacta,
  fecha verbatim, salida determinista, y un contador de bloques `## ` contra `guideSlugs().length`
  para que un módulo de guías nuevo no pueda faltar sin que se note. `robots-rendering.test.ts`
  pinnea que `/llms-full.txt`, `/llms.txt` y el archivo de clave sigan permitidos en todos los
  grupos de rastreadores.

### La caché del borde de `/llms.txt`, `/llms-full.txt` y `/api/datos/*`

- **Medido el 2026-11-20** (dos pedidos seguidos por ruta): `/llms.txt` salía `cf-cache-status:
  DYNAMIC` y sin `Cache-Control`; `/llms-full.txt`, `/api/datos` y `/api/datos/openapi.json`
  también DYNAMIC aunque mandaban `s-maxage` (3600 y 86400). `/robots.txt` y `/feeds/x.xml`, HIT.
  La causa está en Cloudflare: la Cache Rule de páginas sólo cubre rutas SIN extensión fuera de
  `/api`, y `/feeds/` tiene la suya desde el 2026-11-12 (`docs/app/LINKEDIN_FEED.md`). El `s-maxage`
  del origen es inerte hasta que una regla cubra la ruta.
- **Lo del repo**: `/llms.txt` ahora manda el mismo `Cache-Control` que `/llms-full.txt`. Las rutas
  de `/api/datos/*` ya mandaban el suyo (`openDataHeaders`: 1 h las series, 15 min las búsquedas,
  24 h el catálogo y el OpenAPI) y los errores `no-store` (`openDataError`); son anónimas (sin
  `Set-Cookie`, CORS `*`, sin middleware de sesión).
- **Lo de Cloudflare (PENDIENTE, lo aplica el dueño)**: en el ruleset `http_request_cache_settings`
  de la zona, el mismo de la regla de `/feeds/` (respaldo antes, como el 2026-11-06), una regla con
  la misma postura —elegible para caché, `edge_ttl: {mode: bypass_by_default}` (guarda sólo lo que
  el origen declara con `s-maxage`), TTL del navegador el del origen— y la expresión
  `(http.request.uri.path in {"/llms.txt" "/llms-full.txt" "/api/datos"}) or starts_with(http.request.uri.path, "/api/datos/")`.
  Cloudflare incluye la query en la clave, así que cada combinación de filtros de la API es su
  propia entrada; un deploy del app purga todo el borde (`purge_everything` en `deploy.sh`).
  Cloudflare no honra `stale-while-revalidate` (responde EXPIRED, medido en `LINKEDIN_FEED.md`).
  Fecha de aplicación: _sin aplicar todavía_ (anotarla acá).
- **Cómo se verifica**: `curl -sI https://cambio-uruguay.com/llms.txt` dos veces → 200,
  `text/plain`, el `Cache-Control` de arriba y, con la regla puesta, `cf-cache-status: HIT` con un
  `Age` que crece; lo mismo en `/llms-full.txt`, `/api/datos` y `/api/datos/openapi.json`. Un HIT
  sobre un cuerpo de error o un JSON viejo después de un deploy sería la regresión: se borra la
  regla del ruleset respaldado.

### IndexNow

- **Qué es y qué no**: el protocolo por el que Bing, Yandex, Seznam, Naver y los motores que lo
  comparten reciben un aviso de "estas URLs cambiaron" en vez de esperar al rastreo. **Google no lo
  lee.** Acá es una cobertura para los motores de respuesta con IA que se apoyan en el índice de
  Bing, no una palanca de tráfico: `docs/seo/2026-07-10-organic-growth-plan.md` ya lo dejó anotado
  como higiene y "refutado en impacto". No se afirma ningún efecto sobre Google.
- **Clave**: `public/292e8c53b02444571ea6f266aa1ed661.txt` contiene SOLO la clave, sin salto de
  línea, y es público a propósito (el protocolo lo exige en `https://<host>/<clave>.txt`). Ese
  archivo es la ÚNICA fuente: el script la descubre en `public/` (`resolveIndexNowKey`: exactamente
  un `<hex>.txt` cuyo contenido es su propio nombre) y no hay ningún literal en código — la
  primera versión lo tenía y el gate de secretos (`gitleaks`, `generic-api-key`) lo marcó, como
  AGENTS.md advierte. `tests/unit/indexnow.test.ts` lee `public/` de verdad y pinnea las tres
  condiciones. Para rotarla: reemplazar el archivo, nada más.
- **Qué se envía**: las `<loc>` del sitemap `es-ES.xml` (las canónicas; /en y /pt son alternates y
  `rentals` es otra familia que no se envía), llegando por `sitemap_index.xml` y no por la ruta
  del hijo a mano. Sólo `https://cambio-uruguay.com/…` (el apex: `canonical-host.ts` redirige www),
  sin duplicados, `POST https://api.indexnow.org/indexnow` con `{ host, key, keyLocation, urlList }`.
  Medido en dry-run el 2026-09-22: 3.681 URLs en un POST. **Desde el 2026-11-20 sólo se envía lo
  RECIÉN publicado** (una URL que no estaba en ningún sitemap anterior, `known`), nunca el atraso
  de páginas viejas: indexnow.org/faq dice que el protocolo "is not intended for retroactive
  submission of older changes" y que "is not designed for submitting every URL on your site at
  once"; esas URLs Bing las tiene por el sitemap. Sin `known` guardado (primer deploy, `.data/`
  borrado) se anota el sitemap de hoy y no se envía nada.
- **Cuándo se aborta**: un sitemap que no contesta 200 o que viene sin `<loc>` es una falla, nunca
  "el sitio no tiene URLs" (la misma regla que `rental-sitemap-status.ts`): se registra y no se
  envía nada. Un 4xx del endpoint se registra como rechazo; el script nunca lanza ni sale distinto
  de 0.
- **Compuerta**: inerte hasta `INDEXNOW_ENABLED=1`, leído del entorno del proceso o, si no está,
  de `app/.env` — `deploy.sh` corre por SSH no interactivo y no lee ningún perfil. `--dry-run`
  lista lo que enviaría sin POST. Desplegar el archivo no empieza a llamar a un tercero.
- **Dónde corre**: `scripts/deploy.sh`, después del SEGUNDO `wait_healthy` (recién ahí el build
  nuevo es el que contesta), guardado con `|| log` (bajo `set -e`, un tropiezo con un tercero no
  puede poner en rojo un deploy ya swapeado) y con `9>&-` (el hijo no hereda el flock del deploy).
  `tests/unit/deployIndexNow.test.ts` es el tripwire estático de las tres condiciones.
- **Puesta en marcha**: el primer deploy lleva la clave y el script pero SIN la bandera; verificar
  `curl -s https://cambio-uruguay.com/292e8c53b02444571ea6f266aa1ed661.txt` (200, 32 bytes) y
  `curl -sI https://cambio-uruguay.com/llms-full.txt` (200, text/plain); recién después
  `INDEXNOW_ENABLED=1` en `app/.env` del VPS y el siguiente deploy envía. Bing Webmaster Tools
  (no conectado al 2026-09-22) es donde se ve si el envío fue aceptado.
- **Un mes de 429 (2026-10-28 a 11-19) y qué cambió**: los 17 deploys de esas fechas cuyo log
  quedó mandaron `POST 25 URLs → HTTP 429`, siempre las mismas 25 (un 429 no marca nada como
  anunciado), con 24 h fijas de espera; el estado quedó en 500 anunciadas. El 2026-11-20 un POST de
  diagnóstico con la misma clave, el mismo host y 1 URL contestó 200, y el archivo de clave
  contesta 200 con 32 bytes: la clave y el formato están bien, lo que el receptor rechazaba era el
  volumen (el FAQ: "each participating search engine sets its own daily submission thresholds per
  site", sin cifra). El script ahora:
  - **A lo sumo un POST aceptado cada 24 h** (`INDEXNOW_MIN_GAP_MS`): el umbral del receptor es
    por día y el script corre en cada deploy del app (hasta 8 por día). Un deploy dentro de las 24 h
    del último envío aceptado loguea `under 24 h ago; no POST`, sale `spaced` y no escribe nada; lo
    recién publicado que espera sale al día siguiente, primero.
  - **Arranca lento**: después de un 429 la tanda vuelve a 1 URL y se duplica con cada envío
    aceptado, o sea una vez por DÍA y no por deploy (1, 2, 4, 8, 16, 25 =
    `INDEXNOW_MAX_NEW_PER_RUN`, el techo, en seis días); cada 429 la parte al medio. Una tanda que
    no se llenó porque había menos novedades no achica la siguiente.
  - **Espera más con cada 429 seguido**: 1, 2, 4, 8 y desde el quinto 14 días, o lo que diga el
    `Retry-After` si es más largo (tope 30 días). El FAQ: "Pause submissions and retry after the
    time specified in the Retry-After header". El estado de producción del 2026-11-20 tiene
    `blockedUntil` sin `strikes` (la forma vieja, después de un mes de 429): cuenta como un 429, así
    que si la primera tanda de 1 también vuelve 429 la espera es de 2 días.
  - **Muestra el rechazo**: la línea `POST n URLs → HTTP s (rejected)` lleva `retry-after=…` y
    `body="…"` (una línea, 300 caracteres). Antes decía sólo el código y no había cómo ver la causa.
  - **Deja cambiar de receptor sin desplegar**: `INDEXNOW_ENDPOINT=https://www.bing.com/indexnow`
    en `app/.env`. Sólo acepta los dos endpoints que nombra el FAQ; otro valor cae a
    api.indexnow.org y lo dice en el log, para no mandarle la clave a un host cualquiera. Es el
    paso si una tanda de 1 desde el VPS también vuelve 429 (el diagnóstico salió de otra IP, así que
    tanda e IP no se pudieron separar).
- **Cómo leer el estado en el VPS**: `app/.data/indexnow-announced.json` (fuera de `.output`,
  sobrevive al swap). `urls` = lo anunciado, `known` = todo lo que alguna vez estuvo en el sitemap
  (no se poda: una ficha de /casa o de catálogo que sale del sitemap y vuelve no cuenta como recién
  publicada), `submittedAt` = el último POST aceptado, `strikes` = 429 seguidos, `batch` = la tanda
  del próximo envío, `blockedUntil` = hasta cuándo no hay POST, `lastStatus` = el último código.
  Contarlo sin volcar las listas:
  `python3 -c "import json;d=json.load(open('/root/cambio-uruguay/app/.data/indexnow-announced.json'));print({k:(len(v) if isinstance(v,list) else v) for k,v in d.items()})"`.
  Después de un envío aceptado: `strikes` 0, `batch` el doble, `lastStatus` 200 o 202, `known`
  suma lo enviado y `urls` suma lo enviado pero pierde lo que ya no está en el sitemap — simulado
  sobre el estado del 2026-11-20: `urls` 500 → 463 con 1 URL enviada, porque 38 de las anunciadas
  salieron del sitemap, y `known` 3.990 → 3.991.

## Future Enhancements

1. **Rich Snippets**: Product/Service markup for exchange rates
2. **Local SEO**: Google My Business integration
3. **AMP Pages**: Accelerated Mobile Pages for faster loading
4. **Video SEO**: If promotional videos are added
5. **News SEO**: For market updates and financial news

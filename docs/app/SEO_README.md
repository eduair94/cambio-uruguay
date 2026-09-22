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

## Superficie para agentes de IA: /llms-full.txt e IndexNow (2026-09-22)

### `/llms-full.txt`

- **Qué es**: la versión larga de `public/llms.txt`. Un bloque por guía editorial del catálogo
  (`utils/guides.ts`, 145 guías al 2026-09-22) con `## <título>`, `> <resumen>` (la `description`
  o, si estuviera vacía, el cuerpo de la primera sección), `Actualizado: <updatedAt>` **tal cual**
  (ISO, el mismo valor que la página emite como `datePublished`/`dateModified`) y la URL canónica
  `https://cambio-uruguay.com/guias/<slug>` sin prefijo de idioma ni barra final, calcada de
  `pages/guias/[slug].vue`. Abre con la misma cabecera de identidad que `llms.txt`, y `llms.txt`
  lo enlaza desde "Para desarrolladores y agentes de IA".
- **De dónde sale**: `utils/llmsFull.ts` (`renderLlmsFull(guides, siteUrl)`, puro, sin Nuxt) y el
  route de Nitro `server/routes/llms-full.txt.get.ts` (`text/plain; charset=utf-8`,
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
  sin duplicados, en tandas de hasta 10.000, `POST https://api.indexnow.org/indexnow` con
  `{ host, key, keyLocation, urlList }`. Medido en dry-run el 2026-09-22: 3.681 URLs en un POST.
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

## Future Enhancements

1. **Rich Snippets**: Product/Service markup for exchange rates
2. **Local SEO**: Google My Business integration
3. **AMP Pages**: Accelerated Mobile Pages for faster loading
4. **Video SEO**: If promotional videos are added
5. **News SEO**: For market updates and financial news

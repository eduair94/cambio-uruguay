# Pasar las tarjetas a nuxt-og-image 6 — el mapa, no hecho (8/11/2026)

Las tarjetas (`og:image`) siguen en **nuxt-og-image 5.1.6**. Las tres vulnerabilidades que lo
afectan (XSS GHSA-mg36-wvcr-m75h, SSRF GHSA-pqhr-mp3f-hrpp, DoS GHSA-c7xp-q6q8-hg76, todas
corregidas en 6.2.5) entran por la query de la tarjeta o por `og.html`, y eso es justo lo que corta
el guardián de `server/middleware/og-image-locale.ts` + `utils/ogImageGuard.ts` desde el 8/11
(ver `app/AGENTS.md`). Lo que 6.x agrega de verdad es la URL firmada y que la tarjeta se dibuje sin
volver a renderizar la página (ahorro de CPU). No se hizo porque **no es subir un paquete**: esto es
lo que se midió leyendo los paquetes publicados (sin ejecutarlos), para el que lo haga.

## Qué versiones caben

- nuxt-og-image llega por `@nuxtjs/seo` 3.0.3, junto con sitemap 7.4, robots 5.2, schema-org 5,
  seo-utils 7, link-checker 4 y nuxt-site-config 3.2.
- En Nuxt 4.4.8 / Node 22.14 (el VPS) sólo 6.7.0–6.7.2 piden `@nuxt/kit ^4.4.8` (son idénticas en
  código); 6.7.3+ piden kit 4.5 y 7.x pide Nuxt ^4.6.1 y Node ^22.22.3. **Ojo**: la documentación en
  línea de nuxtseo.com ya describe la 7 (`NUXT_APP_SECRET`, falla cerrada sin secreto): no aplica a 6.7.
- Aun con 6.7.2, sus rangos traen nuxt-site-config 4.2.3 y nuxtseo-shared 5.3.16, que piden kit
  ^4.5.2: hacen falta `overrides` (nuxtseo-shared 5.3.2, nuxt-site-config/-kit 4.1.1).
- La pareja upstream que cierra sin overrides es `@nuxtjs/seo` 5.3.1–5.3.2 (og ^6.7.0, sitemap
  ^8.2, robots ^6.1, site-config ^4.1, kit ^4.4.8): seis mayores a la vez, sitemaps y robots
  incluidos. Lo razonable es hacerlo **junto con** la subida a Nuxt 4.5 / Node ≥ 22.19, no solo.

## Lo que se rompe y hay que resolver antes

1. **Dos mayores de nuxt-site-config.** Con la raíz en 3.2.0, el runtime de 6.7.2 importa
   `#site-config/server/composables/getSiteConfig` y `getNitroOrigin`, que no existen ahí (falla de
   build o `ERR_MODULE_NOT_FOUND`); con la 4 en la raíz se rompen sitemap 7, robots 5 y seo-utils
   (importan `useSiteConfig`). Única salida sin cambiar de mayores: forzar nuxt-site-config 3.2.21
   (trae los dos nombres) por `overrides`.
2. **Secreto de firma.** Sin `NUXT_OG_IMAGE_SECRET` en el build (el `app/.env` del VPS), 6.7.2 genera
   uno al azar en cada build y no avisa: cada deploy deja en 403 todas las URLs de tarjeta ya
   publicadas (cachés de WhatsApp/Facebook/X, JSON-LD, la ventana del reload de pm2).
3. **Sufijo de renderizador.** `components/OgImage/Cambio.vue` tiene que llamarse `Cambio.satori.vue`
   (un build de producción falla si no) y `satori` ≥ 0.19.2 va en las dependencias de primer nivel.
4. **Fichas de autos.** `defineOgImage({ url })` ya no existe: con la forma vieja cada ficha da 500.
   El reemplazo tiene que ganarle a la tarjeta de `app.vue`.
5. **Prioridad de etiquetas.** 6.7.2 registra su tarjeta con `tagPriority: 35` (5.1.6 usaba
   `'high'`): la foto de la ficha de alquiler pierde contra la tarjeta generada sin ningún error.
   Toda imagen propia de página necesita `tagPriority` numérico ≤ 35.
6. **Tipografías.** `ogImage.fonts` se ignora en silencio en producción: sin `@nuxt/fonts` (más
   fontless y unifont) o un `@font-face` TTF global, todas las tarjetas salen en Inter en vez de
   Sora/Open Sans.
7. **Título y descripción automáticos.** 41 páginas confían en el `defineOgImageComponent('Cambio')`
   sin props de `app.vue`; 6.x los lee de `_flatMeta` de `useSeoMeta`, que el
   `treeShakeUseSeoMeta` de seo-utils quita: hay que pasar props explícitas o apagar ese tree-shake.
8. **URLs viejas.** Ocho páginas escriben `/__og-image__/image/<ruta>/og.png` a mano en su JSON-LD y
   6.x no tiene esa ruta: sin un manejador barato, cada pedido viejo de un rastreador o una caché
   social es un 404 con SSR completo.
9. **Duplicados que hoy se evitan.** 6.7.2 mete el prefijo de idioma y la query de la página en la
   URL firmada y no sabe de idiomas: `spanishOgImage` y `stripOgImageQuery` quedan sin efecto
   (36 tarjetas iguales por página en los idiomas extra) salvo con `cacheKey` o un re-firmado propio.
10. **El transformador flex cambió** (`satori/plugins/flex.js`): diferencias de layout posibles en
    las tarjetas; compararlas imagen por imagen.
11. **Pruebas.** Cinco ejecutan el runtime 5.1.6 instalado y fallan enteras (autosOgImage,
    ogImageQueryStrip, rentalOgPreview, ogImageIsland, ogImagePageStatus); unas diez más fijan el
    nombre de la llamada, la ruta o las URLs.
12. **La copia vieja queda.** `@nuxtjs/seo` 3.0.3 mantiene 5.1.6 anidada: `npm audit` la sigue
    marcando hasta que un override o la subida del paraguas la saque.

## Cómo verificarlo cuando se haga

Build de producción local, servidor arriba, y por cada componente de `components/OgImage/` la tarjeta
de 5.1.6 contra la de 6.x píxel por píxel; `og:image` del HTML de una muestra por familia e idioma;
JSON-LD; `robots.txt` (regla `Allow` del prefijo); la regla de caché de Cloudflare del prefijo nuevo
y una purga; y un deploy con el secreto ya puesto en el VPS **antes** del build.

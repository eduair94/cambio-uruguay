# Seguimiento de contenido publicado — 6 de septiembre de 2026

Verificación acotada a Medium ES/EN/PT y DEV; lecturas entre 2026-09-06T05:04:12.055Z y 2026-09-06T05:04:57.941Z. Se consultó el [feed público de Medium](https://cambio-uruguay.medium.com/feed), la [API pública de DEV](https://dev.to/api/articles/4083098) y únicamente los destinos enlazados al sitio. No se editaron publicaciones, tracker ni campañas. No se consultaron métricas de tráfico.

## Resultado

**Cero enlaces rotos entre 14 URLs exactas al sitio: todas respondieron HTTP 200.** Son 13 destinos si se unifican las dos variantes de la portada, con y sin barra final. Medio ES y EN conservan afirmaciones que conviene corregir. Los canonical de esos dos artículos de Medium **no pudieron verificarse públicamente**: el feed no los expone y el HTML devolvió 403 de Cloudflare a este cliente. Eso no significa que los artículos estén caídos: sus cuerpos completos están en el feed público.

| Publicación | Evidencia pública | Enlaces al sitio |
| --- | --- | --- |
| [Medium ES](https://cambio-uruguay.medium.com/c%C3%B3mo-saber-el-mejor-precio-del-d%C3%B3lar-en-uruguay-hoy-sin-recorrer-casas-de-cambio-27d3669d3839) | Feed 200; publicado 04/07/2026 20:31:35 UTC | 10 apariciones, 9 destinos únicos |
| [Medium EN](https://cambio-uruguay.medium.com/currency-exchange-in-uruguay-how-to-find-the-best-rate-before-you-trade-3a5fd46e3fc4) | Feed 200; publicado 04/07/2026 20:31:18 UTC | 10 apariciones, 9 destinos únicos |
| [Medium PT](https://cambio-uruguay.medium.com/c%C3%A2mbio-no-uruguai-como-ler-compra-e-venda-antes-de-trocar-reais-4bb607353037) | Feed 200; publicado 06/09/2026 04:53:37 UTC | 3 apariciones y destinos |
| [DEV](https://dev.to/eduair94/currency-exchange-in-uruguay-how-to-find-the-best-rate-before-you-trade-1fml) | API 200; editado 2026-09-06T04:47:12Z | 2 al sitio; además enlaza la implementación en GitHub |

DEV conserva el título del tutorial de precios quietos y un canonical al propio artículo. Su URL antigua permanece, pero el cuerpo ya corresponde al tutorial. PT conserva el texto revisado y el disclosure autónomo. Las verificaciones completas de ambas piezas están en [DEV](./2026-09-06-devto-verification.json) y [PT](./2026-09-06-medium-pt-verification.json).

## Canonical: confirmado frente a pendiente

- **DEV:** `https://dev.to/eduair94/currency-exchange-in-uruguay-how-to-find-the-best-rate-before-you-trade-1fml`, confirmado por API; no apunta a Medium ni a la portada.
- **Medium ES/EN:** no verificado. No trasladar al artículo publicado el canonical sugerido en los borradores locales. Para resolverlo, inspeccionar “This story was originally published elsewhere” en Story Settings y, si se puede, el canonical renderizado. Como las páginas principales del sitio no contienen esos artículos, una portada no debe asumirse como original equivalente.
- **Medium PT:** según la verificación de UI de la publicación, no hay canonical externo personalizado; el HTML renderizado sigue sin verificarse desde el cliente HTTP.
- **Hallazgo en destino, distinto de los artículos de Medium:** `https://cambio-uruguay.com/pt` responde en portugués pero declara canonical `https://cambio-uruguay.com`. En cambio, `/pt/mapa` y `/pt/estado` se declaran a sí mismas. La portada Nuxt lo fija literalmente en `app/pages/index.vue`, dentro del bloque `useHead`. Esto merece revisión de la política de canonical por idioma, pero no convierte el enlace portugués en un enlace roto. No se modificó la app.

## Claims de ES/EN que siguen publicados

| Hallazgo | Evidencia | Corrección preparada |
| --- | --- | --- |
| Cobertura exhaustiva | ES dice “todas las casas de cambio del país”; EN dice “every exchange house in Uruguay”. | Usar “más de 40 casas de cambio y bancos” / “more than 40 exchange houses and banks”. El API enumera 46 orígenes, 45 al excluir BCU; no certifica la totalidad del país. |
| BCU dentro de la promesa del comparador minorista | ES incluye “incluido el BCU”; EN incluye “including the BCU via its official service”. | Evitar presentar BCU como fuente de precios de mostrador. En la respuesta actual de `GET /`, sus filas son UR, UP y UI. El código de mercado de MCP excluye `origin === 'bcu'`. |
| Frescura entendida como garantía | La introducción ES promete tiempo real; EN presenta toda la comparación como datos live. | Hablar de cotizaciones publicadas, consultar fechas y avisos, confirmar precio/canal con la entidad. La fecha de fila no demuestra que cambió el precio. |
| Ahorro y coste final sin evidencia adjunta | ES promete diferencias de miles de pesos; ambos presentan la calculadora de importación como coste final verdadero y describen ahorros al retirar efectivo. | Retirar importes y promesas, así como la sección de importación/IVA de este artículo de comparación. No se validó legislación fiscal para republicar esas afirmaciones. |
| Mapa como optimización garantizada | Ambos afirman que el mapa encuentra la sucursal más cercana con la mejor cotización. | Describir localización de sucursales y comprobación de horario/condiciones, sin garantizar la combinación de cercanía y mejor precio. |
| Alertas automáticas | ES/EN garantizan avisos por umbral y Telegram. | Retiradas de estas revisiones porque no se hizo una prueba completa de configuración y recepción en este seguimiento. Esto no afirma que la funcionalidad esté caída. |

## Destinos comprobados

| URL exacta | HTTP | Observación |
| --- | --- | --- |
| https://cambio-uruguay.com/pt | 200 | Portugués; canonical a portada sin /pt |
| https://cambio-uruguay.com/pt/estado | 200 | Portugués; canonical propio |
| https://cambio-uruguay.com/pt/mapa | 200 | Portugués; canonical propio |
| https://cambio-uruguay.com/ | 200 | Responde; canonical propio o portada equivalente |
| https://cambio-uruguay.com/cotizacion | 200 | Responde; canonical propio o portada equivalente |
| https://cambio-uruguay.com/mapa | 200 | Responde; canonical propio o portada equivalente |
| https://cambio-uruguay.com/convertir | 200 | Responde; canonical propio o portada equivalente |
| https://cambio-uruguay.com/herramientas/carrito-importacion | 200 | Responde; canonical propio o portada equivalente |
| https://cambio-uruguay.com/indicadores | 200 | Responde; canonical propio o portada equivalente |
| https://cambio-uruguay.com/glosario | 200 | Responde; canonical propio o portada equivalente |
| https://cambio-uruguay.com/retirar-efectivo-uruguay | 200 | Responde; canonical propio o portada equivalente |
| https://cambio-uruguay.com/estado | 200 | Responde; canonical propio o portada equivalente |
| https://cambio-uruguay.com | 200 | URL final añade / |
| https://cambio-uruguay.com/desarrolladores | 200 | Responde; canonical propio o portada equivalente |

Los enlaces del artículo EN usan rutas predeterminadas, cuyo título y H1 salen en español. Siguen siendo destinos válidos; no se cambiaron por rutas inglesas sin verificarlas.

## Revisiones listas, sin publicar

- [Medium ES corregido](../drafts/medium-es-followup-ready.md). Título sugerido: **Cómo comparar el dólar en Uruguay antes de ir a una casa de cambio**.
- [Medium EN corregido](../drafts/medium-en-followup-ready.md). Título sugerido: **Currency Exchange in Uruguay: How to Compare Rates Before You Trade**.

Ambas revisiones parten de los cuerpos exactos del feed: conservan el recorrido de comparación, mapa, herramientas y efectivo, con menos promesas y sin el bloque fiscal. Tienen disclosure de cuenta del responsable y actualización autónoma con IA en el segundo párrafo. Conservan siete enlaces ya comprobados; no añaden endpoints nuevos. Se retiran el enlace de importación y el de indicadores porque distraen de esta guía de cambio de moneda, no porque estén rotos.

Este informe registra estado observado y material local preparado. No afirma que ES/EN ya se hayan actualizado.

## Comprobación adicional de rutas inglesas antes de actualizar EN

Las siete rutas `/en` respondieron 200 y declararon `lang="en-US"`. Eso **no bastó para considerarlas traducidas**: se leyeron título, H1, H2 y párrafos principales.

| Ruta | Contenido observado | Decisión en el borrador EN |
| --- | --- | --- |
| /en | Título, H1, controles y varios párrafos en inglés; un párrafo automático de cotización sigue en español. Canonical a portada sin /en. | Usar /en como interfaz inglesa; registrar traducción parcial. |
| /en/cotizacion | Título, H1, secciones y explicación principal en español. | Mantener /cotizacion y aclarar “in Spanish” en el enlace. |
| /en/mapa | Título, H1 y descripción en inglés; canonical propio. | Usar /en/mapa. |
| /en/convertir | Título, H1, secciones y explicación principal en español. | Mantener /convertir y aclarar “in Spanish”. |
| /en/glosario | Título, H1, categorías y definiciones en español. | Mantener /glosario y aclarar “in Spanish”. |
| /en/retirar-efectivo-uruguay | Título, H1, secciones y párrafos de la guía en inglés; canonical propio. | Usar ruta /en. No se reauditaron los consejos financieros de la guía. |
| /en/estado | Título, H1 y explicación principal en inglés; canonical propio. | Usar /en/estado. |

Se generaron cuerpos HTML con `marked` instalado en `app/node_modules`: [ES](../drafts/medium-es-followup-ready.html) y [EN](../drafts/medium-en-followup-ready.html). Ambos conservan cinco subtítulos, trece párrafos, siete enlaces y el disclosure en el segundo párrafo. No llevan `html`, `body`, título de artículo ni metadatos de borrador. El borrador ES no cambió en esta comprobación.


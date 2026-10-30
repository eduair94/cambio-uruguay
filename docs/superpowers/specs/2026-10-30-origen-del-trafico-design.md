# /origen-del-trafico — de dónde viene la gente

Fecha: 2026-10-30. Estado: aprobado por orden permanente (spec y plan se auto-aprueban).

## Para qué

El dueño quiere ver, y publicar, de dónde llega la gente al sitio: qué buscadores, qué asistentes de
IA, qué redes y **qué sitios web** mandan visitas, y si algún enlace (backlink) trae mucha gente.
`/estadisticas-del-sitio` ya muestra los canales de GA4 en una línea; `/paginas-mas-visitadas`
muestra canales por semana. Ninguna nombra a los sitios ni dice si un enlace trajo gente una vez o
todos los días.

## Lo que se midió antes de diseñar (GA4, 2026-10-30)

- La propiedad GA4 **mezcla otros sitios**: `warframe-app.digitalshopuy.com` compartía el ID de
  medición hasta julio de 2026, y los servidores de desarrollo (`localhost`, `127.0.0.1`,
  `192.168.x`) también reportan. Sin filtrar por `hostName`, el "segundo referente del sitio" es otra
  aplicación y Reddit "lleva gente a /endo". **Todo reporte de esta página filtra por host.**
- Fuentes `auto`, `button` y `/ruta` con medio `(not set)`: eran eventos propios con un parámetro
  `source` que GA4 tomó como campaña (corregido en `a0417e0b`). Son artefactos, no referentes.
- "Directo" con todos los países está inflado por tráfico automatizado (la granja de Singapur): por
  eso la mezcla de canales se muestra también sólo-Uruguay.
- El mayor enlace de la historia medida fue X (`t.co`): 927 sesiones en un solo día (17/8/2026),
  todas a una página. ChatGPT es el único referente que crece de forma sostenida.

## Qué se construye

1. **Un quinto documento del job `currency-site-analytics`**: `sitetrafficsources` en la APP DB,
   público, armado campo por campo en `classes/site-analytics/trafficSources.ts` (puro: reportes →
   documento) y escrito en su propio `try` (si falla, los otros cuatro documentos siguen).
2. **Ruta pública** `/api/site-traffic-sources` (cacheada, como `/api/site-top-pages`).
3. **Página** `/origen-del-trafico`, sólo en español, hermana de las dos de estadísticas.

## Reglas del documento

- Ventana actual de 90 días que termina ayer (las referencias son ralas: 28 días es poco) e
  historia mensual de 24 meses.
- Cada fuente se normaliza a un id (dominio sin `www.`/`m.`/`l.`; `t.co` → X; app de Reddit →
  reddit.com; subdominios de búsqueda de Yahoo → Yahoo) y se clasifica en un tipo: buscador, IA,
  red social, correo, sitio web, nuestro, directo, sin atribuir. Lo de desarrollo y los artefactos
  van a "sin atribuir" y nunca se listan por nombre.
- Una fuente se lista con nombre sólo con ≥3 sesiones en la historia. El resto se cuenta como
  "otros".
- Por fuente: sesiones (90 días, historia, sólo Uruguay), sesiones con interacción, serie mensual,
  días activos, día pico y su porción, y hasta 3 páginas de aterrizaje (sin querystring).
- Páginas que enlazan (`pageReferrer`): sólo de sitios web, redes y sitios nuestros, con ≥3 vistas,
  publicadas como host + ruta, sin querystring ni ancla. Nunca de correo, buscadores ni IA.
- Sin ingresos ni nada privado.

## La página

Respuesta corta arriba (generada de los datos: ¿hubo un enlace que trajo mucha gente? ¿cuál trae
gente todo el tiempo?), mezcla por tipo con selector Uruguay / todo el mundo, mes a mes por tipo,
tabla de sitios con filtro por tipo y patrón (pico de un día / constante / ocasional), páginas que
enlazan y método. Aclara que GA4 ve visitas, no enlaces: un backlink que nadie cliquea no aparece.

## Fuera de alcance

- El reporte de enlaces de Search Console (no tiene API).
- Arreglar el filtro de host de `/estadisticas-del-sitio` (su ventana de 28 días ya no incluye el
  otro sitio; se anota como pendiente).

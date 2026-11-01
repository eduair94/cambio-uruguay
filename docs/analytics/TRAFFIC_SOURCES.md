# /origen-del-trafico — de dónde viene la gente

Página pública, sólo en español, hermana de `/estadisticas-del-sitio` y `/paginas-mas-visitadas`.
Cuenta qué buscadores, asistentes de IA, redes y sitios web mandan visitas, cómo lo hacen (un pico
de un día, en alza, constante) y si algún enlace trae mucha gente.

## Camino de los datos

`currency-site-analytics` (10:51 UTC) → quinto paso, en su propio `try` →
`classes/site-analytics/trafficSources.ts` (siete reportes de GA4, armado puro) → APP DB
`sitetrafficsources` (un documento, `key: "site"`) → `GET /api/site-traffic-sources` (pública,
cacheada una hora) → `app/pages/origen-del-trafico.vue`, que cuenta con
`app/utils/trafficSources.ts` (patrón por fuente y la respuesta corta).

El documento se arma **campo por campo**: es público, y lo que no está escrito en
`buildTrafficSources` no se publica. Un documento sin sesiones o sin fuentes con nombre no pisa el
anterior.

## Reglas que salieron de medir (2026-10-30)

- **Todo reporte filtra por `hostName`** (`cambio-uruguay.com` y `www.`). La misma propiedad GA4
  recibió datos de otra aplicación del mismo dueño hasta julio de 2026 y de los servidores de
  desarrollo. Sin el filtro, el segundo "referente" del sitio era esa aplicación, y Reddit "llevaba
  gente" a rutas que acá no existen. `/estadisticas-del-sitio` todavía no filtra por host: su
  ventana de 28 días ya no alcanza a la otra aplicación, pero la serie de 90 días la alcanzaría si
  volviera a reportar.
- **Fuentes que no son fuentes.** `auto`, `button` y `/una-ruta` con medio `(not set)` eran eventos
  propios con un parámetro `source` que GA4 tomó como campaña (corregido en `a0417e0b`). Van a "sin
  atribuir" junto con desarrollo (`localhost`, IPs), el propio sitio y las herramientas que abren
  la página sin que nadie siga un enlace (rastreadores de posiciones SEO, gestores de pestañas).
- **Una fuente, una fila** (`classes/site-analytics/sourceKinds.ts`): `t.co` es X, la app de
  Reddit es reddit.com, los Yahoo de cada país son Yahoo, Teams y los documentos de Office van a
  "correo, chats y documentos".
- **Ventana de 90 días e historia de 24 meses.** Los sitios que enlazan mandan pocas visitas: en 28
  días casi ninguno pasa el umbral, y un enlace grande de hace un año tiene que seguir en la
  respuesta.
- **Umbrales**: una fuente se nombra con ≥ 3 sesiones en 24 meses; una página que enlaza
  (`pageReferrer`) con ≥ 3 vistas, como host + ruta sin querystring, y sólo de sitios, redes y
  sitios propios — nunca de correo, buscadores ni IA. X y Reddit sólo informan su dominio, así que
  el posteo exacto no se puede ver.
- **De los buscadores no se publican días activos, pico ni aterrizaje**: esos reportes excluyen el
  medio `organic`, y lo poco que llega es su parte `referral`.
- **Por defecto, sólo Uruguay.** Con todos los países, "Directo" queda dominado por tráfico
  automatizado que ejecuta la página (la granja de Singapur); el selector de la página muestra las
  dos vistas.

## Lo que mostró la primera lectura

- El mayor enlace medido fue X: ~930 sesiones el 17/8/2026, el 91 % de todo lo que X mandó en dos
  años, casi todas a `/tarjetas-de-credito-uruguay`. No se repitió.
- ChatGPT es la única fuente que crece de forma sostenida; Reddit manda gente casi todos los días.
- Los sitios web que enlazan trajeron muy poco (GitHub, y una lista de APIs públicas en GitHub):
  ningún backlink de otro sitio trae una cantidad grande de gente.

## Lo que la página no ve

GA4 cuenta visitas, no enlaces: un backlink que nadie cliquea no aparece (el reporte de enlaces de
Search Console no tiene API). Las apps que no mandan referer (WhatsApp, Instagram) llegan como
directo, y quien rechaza las cookies de medición no llega a GA4.

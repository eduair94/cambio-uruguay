# Compartir páginas, filtros y comparaciones

`ShareButtons` ofrece el menú del sistema (Web Share API), WhatsApp, Telegram, X, Facebook,
copia del enlace y una tarjeta PNG de 1200 × 630. Además del botón propio de cada página, el pie
de las páginas de cotizaciones y de lectura larga lo ofrece en `ReaderFollowUp`, y el footer en
todas. Hubo una barra global (`PageShareBar`) arriba de cada página: se retiró al integrar
(14/11/2026) porque repetía el botón propio de 88 páginas y de los shells de guías y herramientas,
y porque nada puede ir entre `FamiliaNav` y el `<slot />` (tests/unit/adRail.test.ts). Las áreas
privadas no se comparten.

El destino sale de la ruta actual de Vue, no de la URL de la primera petición SSR. Los consumidores
antiguos que pasan un canonical de la misma página conservan ahora los filtros de la ruta actual.
Los parámetros admitidos están declarados por página en `app/utils/sharedLinks.ts`; una dirección
de referencia, coordenadas personales, tokens, tracking y parámetros desconocidos no se guardan.
Al incorporar un filtro público nuevo hay que ampliar esa lista y su prueba de ida y vuelta.

## Enlaces guardados

Al abrir Compartir con filtros, el navegador pide `POST /api/share-links` con `{ path }`. Mongo de
la app guarda una selección inmutable en `sharedlinks` y devuelve `{ id, url, path, title,
description }`. La identidad es el destino normalizado; repetir el mismo destino reutiliza el
enlace. Los IDs aleatorios tienen 12 caracteres. No hay caducidad automática: el destinatario puede
volver al enlace, aunque los avisos y precios sí pueden cambiar.

**El texto del enlace lo escribe el sitio, nunca quien lo pide** (`sharedLinkText`, 8/11/2026).
Antes el cuerpo de la petición traía `title` y `description` y se dibujaban en la página `/s/<id>` y
en su tarjeta de marca: cualquiera podía acuñar un enlace de cambio-uruguay.com que dijera lo que
escribiera. Ahora el título es el nombre de la página en la navegación del sitio (o el de la página
listada más cercana; si no hay, "Cambio Uruguay") y la descripción enumera sólo filtros de
vocabulario cerrado (`publicShareSummary`: departamento, moneda, condición y números). El texto
libre de la URL —el buscador, la marca, el modelo, el barrio, la categoría— no se imprime nunca, ni
en la tarjeta del servidor ni en la que dibuja el navegador. Y se recalcula en cada lectura, así que
ninguna fila guardada se sirve tal como se guardó. Lo vigilan `sharedLinksService.test.ts` y
`shareTarget.test.ts`.

`GET /api/share-links/:id` proyecta únicamente esos campos. `/s/:id` responde HTML SSR con título,
descripción, OG propio y acceso al destino exacto. Un enlace ausente responde 404; una falla de
almacenamiento responde 503. No se redirige según el user-agent. El destino siempre es interno.
Las selecciones no se indexan ni entran al sitemap. No reemplazan el contenido editorial indexable.

La creación limita bytes reales del cuerpo y cantidad de peticiones por trabajador/IP; no almacena
IP, sesión ni datos de contacto. No consulta URLs suministradas por el usuario. Si Mongo falla,
el menú sigue permitiendo compartir el destino público completo y muestra el problema.

## Navegador y tarjetas

La generación del enlace y de la imagen ocurre antes de los botones de envío. `navigator.share()`
se invoca directamente desde el segundo clic para conservar la activación transitoria del usuario.
Los archivos se ofrecen sólo si `navigator.canShare({ files })` los acepta. Cancelar el menú del
sistema no se presenta como error. Si falla Clipboard API, el campo visible permite copiar a mano.

La tarjeta se dibuja localmente con texto público y el enlace; no captura la pantalla ni carga
imágenes externas. Los object URLs se liberan al cerrar/navegar/desmontar y las preparaciones viejas
se descartan. Para compartir resultados que no están en la URL, el consumidor debe serializar
primero su estado público; no se presupone que localStorage viaje con un enlace.

## Comparador de autos

`/autos-usados-uruguay/comparar` ofrece una comparación de hasta tres avisos reales, siempre noindex
(ver `COMPARAR_AUTOS.md`). `?autos=id,id,id` reproduce la selección. La lectura acotada usa
`/api/cars/compare-listings`. No inventa valores ausentes ni declara un ganador sin criterio; los precios
publicados y las fichas conservan sus advertencias de disponibilidad y evidencia.

## Medición

`useTrack` registra `share_open` y `share` respetando el consentimiento existente. `method`
distingue copia, redes, menú nativo, imagen y descarga. Sólo se manda la ruta sin filtros ni texto.
Un clic a una red o una descarga mide intención, no confirma un mensaje enviado ni una visita nueva.
No se añaden UTM a los enlaces internos. El contenido del comparador se declara por separado en
`docs/seo/experiments.json`; el botón global no admite la comparación relativa de clics usada por ese
registro, porque afecta a todo el sitio.

Antes de desplegar: pruebas unitarias de normalización/persistencia, navegación/sitemap, ESLint y
Playwright de compartir. Tras el despliegue verificar un enlace creado desde producción, su HTML y
OG sin sesión, y Web Share en iOS/Android reales; el cuadro nativo del sistema no se automatiza aquí.

# Armadores de muebles en Montevideo — diseño

Fecha: 2026-11-11. Pedido del usuario: "una subapp directorio de armadores de muebles en diferentes
zonas de Montevideo con precios respectivos… buscar en internet, FB Marketplace y otros lados…
la lista lo más completa posible". Spec y plan auto-aprobados (orden permanente del repo).

## Por qué un directorio propio y no la categoría «armado» de `/fletes-mudanzas-uruguay`

El directorio de mudanzas (relevamiento manual del 14/9/2026) tiene **7** prestadores con tarifa
de armado y dejó los avisos de Marketplace como "pistas" sin publicar: buscaba empresas de mudanza
verificadas, no armadores. Quien busca "armador de muebles" busca otra cosa: alguien cerca, hoy,
y cuánto cobra por un ropero. Medido el 11/11/2026: Google Places devuelve 18+ negocios de armado
sólo en la primera página de una búsqueda, Facebook Marketplace ~20 avisos con precio por búsqueda
y MercadoLibre Servicios ~30 avisos de armadores, la mitad con barrio (filtro `city` de ML). Un
relevamiento manual caduca en semanas; los avisos de Marketplace, en días. Por eso: **job diario**.

## Qué se publica

Una fila por **prestador o aviso**, con su fuente siempre visible. Cuatro orígenes:

| Fuente | Qué aporta | Precio | Zona | Cadencia |
| --- | --- | --- | --- | --- |
| Relevamiento editorial (`classes/armadores/editorial.ts`, desde `docs/research/armadores/`) | empresas con tabla de precios por mueble | tabla con fuente y fecha | dirección/cobertura declarada | manual, fechado |
| Google Maps (proxy Places `:2221`, `textsearch`) | negocios de armado con ficha | — (salvo que coincida con editorial) | coordenada → barrio INE | semanal (cuota) |
| Facebook Marketplace (`readMarketplaceSearches`, puente `:9657` de respaldo) | avisos de armadores independientes | precio del aviso + lista de precios de la descripción | título/descripción | diario |
| MercadoLibre Servicios (`MLU1540`, puente `:9656`) | avisos de servicio | casi nunca (ML no lo muestra) | filtro `city` de ML / título | diario |

Reglas (las del repo, aplicadas a este caso):

1. **Precisión antes que cobertura.** Un negocio de Google entra sólo si su nombre dice armado/
   armador/desarmado/montaje o coincide con un prestador editorial: una mueblería o una carpintería
   genérica no es un armador. Un aviso de FB/ML entra sólo si su título lo dice.
2. **El precio del aviso no es una tarifa.** En FB es lo que el vendedor puso en la tarjeta: suele
   ser el "desde" del mueble más chico. Se publica como «precio del aviso». Montos simbólicos
   (< $ 150) se muestran como «a consultar» y no entran en ninguna estadística.
3. **Una lista de precios de la descripción** (FB) se extrae sólo cuando el segmento nombra un mueble
   y trae un único monto; nunca se adivina. Cada fila conserva la etiqueta tal cual.
4. **No se mezclan monedas ni unidades.** La referencia por mueble (mínimo/mediana/máximo) usa sólo
   pesos, por unidad de mueble, con n ≥ 3 prestadores distintos, y dice de dónde sale cada número.
5. **Zona = base o cobertura declarada, nunca un supuesto.** Base: barrio de la coordenada (Google),
   barrio de ML, dirección editorial. Cobertura: barrios nombrados en el texto o "todo Montevideo".
   Un prestador sin zona aparece sólo sin filtro de zona, rotulado «zona sin informar».
6. **Contactos.** Editorial: los comerciales que el prestador publica, con URL. Google: se consultan
   **al tocar** "Ver teléfono" (Place Details en vivo, `no-store`, sólo para place ids del snapshot,
   límite por IP), nunca se guardan. FB/ML: sólo el enlace al aviso (la ficha exige sesión).
7. **La ausencia no es una afirmación.** Un aviso que no se vio en 14 días sale; un negocio de Google
   que no se vio en 30 días sale. Una corrida flaca (menos del 50 % de las filas guardadas) no pisa
   el snapshot y sale con 1.
8. **Puntuación de Google**: se guarda la de la lectura semanal con su fecha y atribución «Google»;
   puede ordenar ("más reseñas"), siempre con el recuento al lado.

## Zonas

Cinco zonas de Montevideo sobre los 62 barrios INE (agrupación editorial, en
`classes/armadores/zones.ts`, espejada en `app/utils/armadores.ts` con test de paridad):
**Centro** (Ciudad Vieja, Centro, Cordón, Aguada, Tres Cruces…), **Costa este** (Punta Carretas,
Pocitos, Buceo, Malvín, Carrasco…), **Este** (Unión, Maroñas, Ituzaingó, La Blanqueada…),
**Norte** (Prado, Sayago, Colón, Piedras Blancas…), **Oeste** (Cerro, La Teja, Nuevo París…), más
**Área metropolitana** (Ciudad de la Costa, Las Piedras, La Paz, Pando…). Filtrar una zona muestra
primero quien tiene **base** ahí y después, en un grupo aparte, quien **dice cubrirla** o cubrir
toda la ciudad.

## Superficies

- Backend: `classes/armadores/` (`types`, `zones`, `text` = barrios/servicios/precios desde texto,
  `sources/{google,facebook,mercadolibre}`, `editorial`, `build` = fusión/dedupe/poda/guarda,
  `store`), `classes/models/ArmadorSnapshot.ts` (APP DB `armadorsnapshots`, un documento `key:"mvd"`),
  `classes/models/ArmadorFacebookDetail.ts` (privada, descripciones leídas), `sync_armadores.ts`.
  pm2 `currency-armadores`, `5 18 * * *` (minuto libre de los puentes ML/FB), en `OTHER_APPS`.
- App: `server/models/ArmadorSnapshot.ts`, `server/api/armadores.get.ts` (proyección compacta),
  `server/api/armadores/contacto/[placeId].get.ts` (en vivo), `utils/armadores.ts` (tipos, zonas,
  filtros puros, URL, orden, referencia de precios), `utils/armadoresCopy.ts`,
  `pages/armadores-de-muebles-montevideo.vue` + `components/armadores/*`.
- Registro: `siteNav.ts`, enlaces desde `/fletes-mudanzas-uruguay` y equipar, fila en
  `docs/seo/experiments.json`, `docs/app/ARMADORES.md`, fila en `AGENTS.md`.

## URL compartible

`zona` (`centro|costa-este|este|norte|oeste|metropolitana`), `barrio`, `mueble` (clave de la
taxonomía), `fuente` (`editorial|google|facebook|mercadolibre`), `precio=1` (sólo con precio),
`q`, `orden` (`zona` por defecto, `precio-asc`, `resenas`). Predeterminados se omiten.

## Interfaz (Operate, dentro del sistema existente)

Hereda DESIGN.md (Vuetify 4, Open Sans, tokens, radios, 4px). Primer viewport: H1 + lead que
responde "cuánto cuesta y quién está cerca", un selector de zona de una sola fila (chips) que es el
control principal, y la referencia de precios por mueble a la vista. Filas de prestador con: nombre,
fuente, base/cobertura, precios relevantes al mueble elegido, puntuación con recuento y fecha, y la
acción (ver aviso / ver teléfono / sitio). Móvil 390 px: una columna, chips desplazables, filas que
apilan. Datos comerciales en español; interfaz es/en/pt.

## Fuera de alcance (v1)

Mapa; reseñas con texto; presupuestos automáticos; prestadores del interior fuera del área
metropolitana; leer fichas de ML (redirigen a verificación de cuenta).

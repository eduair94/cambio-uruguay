# Teléfonos de vendedores de autos

Implementado el 2026-09-21 a pedido del usuario: "una base de datos de los números de los
vendedores, mostrada en el sitio". De las tres opciones que se le presentaron eligió **el número
comercial de las automotoras + el número que el propio vendedor escribió en el texto público de su
aviso**, con resguardos. Extiende a autos la política de viviendas
([PROPERTY_ADVERTISERS.md](PROPERTY_ADVERTISERS.md)).

## Qué dice cada fuente (medido el 2026-09-21, sin sesión)

| Fuente | Avisos | Contacto del portal | Número en el texto del aviso |
|---|---|---|---|
| Mercado Libre | 16.712 (8.008 de automotoras) | "Ver teléfono" sin `href`, con reCAPTCHA v3 y login | 1 de 40 descripciones |
| Facebook Marketplace | 1.276 | Messenger, con sesión | excluido |
| Clasiautos | 206 | chat y formulario; el sitio aconseja no dar datos personales | 18 de 100 |
| Dueño Directo | 21 | "Para contactarse con el anunciante debes estar registrado" | 16 de 30 |
| Julio, Shopping de Autos, Carper, Fidocar, Car One, Motorlider | ~690 | número comercial en su propia `/contacto` | 0 de 90 |

Los portales de particulares esconden el número **a propósito**. Lo que queda a la vista sin cuenta
es el número de las automotoras y el que algunos vendedores escriben igual en su propio aviso.

## Qué se publica y qué no

**Sí**
- `advert_text`: un teléfono uruguayo escrito en el título o la descripción pública del aviso,
  leído sin sesión. Cualquier fuente menos Facebook.
- `dealer_site`: el número de la página de contacto de la automotora en **su** web (`contactPage` en
  `classes/autos/sources/registry.ts`, espejado en `app/utils/cars.ts`). Sólo para avisos de esa
  automotora y sólo si el aviso no trae número propio. Incluye los avisos de **Mercado Libre** de las
  cuentas que son de esa automotora (ver abajo).

## Cuentas de Mercado Libre de las automotoras (`classes/autos/contacts/accounts.ts`)

Una cuenta de ML se reconoce como de una automotora por su **inventario**, nunca por el nombre: si
publica al menos 10 autos idénticos (`carTwins`, el mismo criterio del dedupe) a los de la web de la
automotora, esos son al menos el 30 % de sus avisos de automotora, y ninguna otra web le disputa
la mitad de esa cifra, sus avisos llevan el número de la `contactPage` de esa automotora. Se
recalcula en cada corrida, antes del dedupe (que descarta justamente a esos gemelos). La respuesta
pública trae `accountTwins` y la ficha lo explica ("ofrece 61 de los mismos autos que la web de
Carper"); la API rechaza un número de automotora en un aviso de ML que no trae esa evidencia.

Medido el 2026-09-21: Shopping de Autos publica desde 3 cuentas (44, 25 y 19 gemelos), Carper
desde 2 (61 y 33), Fidocar y Motorlider desde una (47 y 35). Cualquier otra cuenta comparte entre
1 y 4 autos con esas webs, que es el azar de un mercado chico. Julio y Car One no tienen una cuenta
dominante. Son ~450 avisos de ML con número comercial.

**Nunca**
- Nada detrás de login, captcha, "Ver teléfono", botones de WhatsApp del portal, formularios, chat
  o Messenger. Saltear esos controles no es una optimización pendiente: son el límite.
- Nada de Facebook: su texto se lee con la sesión de `facebook_profile_browser`.
- Nada de JSON interno, `data-*` ocultos, tarjetas recomendadas ni pies de página ajenos.
- Ninguna unión por número: no hay "avisos de este teléfono", ni búsqueda por número, ni
  exportación. La base es por **aviso**, no por persona.

## Extracción (`classes/autos/contacts/phones.ts`)

Precisión antes que cobertura. Celular con el `0` o el `598`, en cualquier agrupación
(`099 123 456`, `(094) 44 22 99`, `+598 99 123 456`). Sin el `0` ni el `598` (`99123456`) y los
fijos (`2901 2345`) sólo cuentan con una palabra de contacto cerca ("cel", "tel", "whatsapp", "wsp",
"llamar", "consultas"…) y nunca detrás de una moneda, porque ocho dígitos también son un monto en
pesos. Nunca un par de años. Los 0800 se aceptan siempre. Máximo 3 por aviso; más de 5 distintos en
un mismo texto es una lista y no se publica ninguno. Contra 100 avisos reales de Clasiautos: 18
con número, cero que un patrón más laxo viera y este no.

## La base

- `carcontacts` (APP DB, privada): un documento por aviso del catálogo publicado,
  `{ key, source, sellerType, origin, phones: [{ value, mobile }], sourceUrl, observedAt, updatedAt }`.
  La escribe `sync_autos.ts` (diaria y horaria) en el mismo paso que publica `carcatalog`, y sólo si
  el catálogo se publica. Se reescribe entera: lo que salió del catálogo (vendido, retirado, no visto
  en 4 días) se borra.
- `carcatalog` lleva sólo `hasContact: true`. El número no está en el catálogo, ni en `/api/cars`,
  ni en el HTML de ninguna página.
- **Vencimiento**: 21 días desde la lectura PROPIA (`detail.readAt` de la ficha, o la lectura de la
  página de la automotora). Por eso `currency-autos-detail` relee fichas de más de 14 días
  (`AUTOS_DETAIL_REFRESH_DAYS`, antes 0 = nunca): ~1.400 lecturas por día sobre una capacidad de
  9.600.
- **Automotoras**: una lectura por corrida diaria de cada `contactPage` (6 pedidos, con el mismo
  proxy de `AUTOS_PROXY_SOURCES`; una fuente apagada con `AUTOS_<FUENTE>_ENABLED=0` tampoco se
  consulta), guardada en `carharvestmetas` `uy-cars-dealer-contact-<fuente>` con `lastAttemptAt`,
  `note` y `failingSince`. Una lectura fallida conserva lo anterior con su fecha vieja, que vence sola.

## Bajas

"¿Es tu número? Sacalo de este sitio" en la ficha (`POST /api/cars/contact/<key>/optout`): borra el
documento del aviso y guarda en `carcontactoptouts` el SHA-256 de `car-contact:` + número, que el
job lee en cada corrida para no volver a publicarlo en ningún aviso. El hash no es secreto (un
celular uruguayo se recupera por fuerza bruta); sólo evita que la lista de bajas sea legible. No se
piden pruebas de titularidad: sacar un número de la vista es el lado seguro de equivocarse. También
se atiende por correo (`/privacidad`).

## API y página

- `GET /api/cars/contact/<key>`: exige un aviso vigente del catálogo y rearma la respuesta campo
  por campo (`app/server/utils/carContacts.ts`): número válido, `sourceUrl` exacto (el permalink del
  aviso o el `contactPage` de la fuente), 21 días, bajas, Facebook nunca, WhatsApp sólo si el
  número es celular. `cache-control: private, no-store`, `x-robots-tag: noindex, nofollow`, fuera de
  `robots.txt` y con 30 lecturas cada 10 minutos por IP (en memoria, por proceso).
- La ficha (`/autos-usados-uruguay/<key>`, ya `noindex`) muestra "Ver teléfono del vendedor"; al
  hacer clic pide la API y muestra llamar + WhatsApp, la procedencia con enlace y fecha, una línea
  de seguridad y la baja (`app/components/cars/SellerPhone.vue`). La tarjeta del directorio dice
  "· con teléfono". GA4: `car_contact_reveal`, `car_contact_channel`, `car_contact_optout`, nunca
  el número.

## Para ampliar sin cruzar el límite

- **Más automotoras**: los avisos de automotoras en ML son 8.009 y vienen de 422 cuentas (las 100
  más grandes suman 4.383; las 200, 6.400). Cada automotora que se sume como fuente con su web
  (stock + `contactPage`) se reconoce sola en ML por los autos que comparte. La alternativa, una
  tabla cuenta → web, tiene que salir de evidencia verificable, nunca de un nombre parecido.
- **Más clasificados** donde el número está en el aviso y a la vista sin cuenta.
- Mercado Libre o Meta sólo con su autorización escrita (como El País en alquileres).

## Pruebas

`tests/autos/{phones,dealerContacts,contacts,store,project,contracts}.test.ts` y
`app/tests/unit/{carContacts,carSourcesParity}.test.ts`. Los números de los tests son sintéticos:
este repositorio es público.

# Teléfonos de vendedores en el directorio de autos — diseño

Fecha: 2026-09-21. Pedido del usuario: "una base de datos de los números de los vendedores, mostrada
en el sitio". Alcance elegido por el usuario entre tres opciones: **número comercial de las
automotoras + el número que el propio vendedor escribió en el texto público de su aviso**, con
resguardos. Extiende a autos la política ya autorizada para viviendas
(`docs/app/PROPERTY_ADVERTISERS.md`).

## Lo que se midió antes de diseñar (2026-09-21, sin sesión)

| Fuente | Avisos publicados | Contacto del portal | Número en el texto del aviso |
|---|---|---|---|
| Mercado Libre | 16.712 | "Ver teléfono" sin `href` + reCAPTCHA v3 / login | 1 de 40 descripciones |
| Facebook | 1.276 | Messenger, con sesión | no medido: excluido |
| Clasiautos | 206 | chat y formulario; el sitio aconseja no dar datos | 17 de 100 |
| Dueño Directo | 21 | "Para contactarse … debes estar registrado" | 16 de 30 |
| Julio, Shopping de Autos, Carper, Fidocar, Car One, Motorlider | ~690 | número comercial en su propia web (`/contacto`) | 0 de 90 (Woo/WP) |

La premisa del pedido ("la información debería estar en las páginas") se cumple sólo para las
automotoras. Los portales de particulares esconden el número a propósito.

## Qué se publica y qué no

**Sí**
1. `advert_text`: un teléfono uruguayo que el vendedor escribió en el **título o la descripción
   pública** de su propio aviso, leída sin sesión. Cualquier fuente menos Facebook.
2. `dealer_site`: el número comercial que una automotora publica en **su propia página de contacto**
   (una URL fija por fuente, `contactPage` en el registro). Sólo para las seis fuentes que son la web de
   una automotora, y sólo si el aviso no trae número propio.

**No, nunca**
- Nada que pase por login, captcha, "Ver teléfono", formularios, chat o Messenger.
- Nada de Facebook: su texto se lee con la sesión del navegador de `facebook_profile_browser`, y la
  política de viviendas ya excluye adquirir contactos por sesión.
- Nada de JSON interno, `data-*` ocultos ni tarjetas recomendadas.
- Ninguna unión por número: no hay "todos los avisos de este teléfono", ni búsqueda por número, ni
  exportación. La base es por AVISO, no por persona.

## Extracción de teléfonos (`classes/autos/contacts/phones.ts`)

Precisión antes que cobertura:
- **Celular**: `09[1-9]` + 6 dígitos con separadores opcionales (espacio, punto, guion, paréntesis), o
  con prefijo `+598`/`598` y el `0` opcional. Escrito sin el `0` y sin prefijo (`99123456`) sólo cuenta
  con una palabra de contacto cerca ("cel", "tel", "whatsapp", "wsp", "llamar", "contacto",
  "consultas", "comunicarse"), porque 8 dígitos pelados también son un precio en pesos.
- **Fijo**: 8 dígitos que empiezan con 2 (Montevideo) o 4 (interior), sólo con palabra de contacto
  cerca (en la página de contacto de una automotora el contexto ya es de contacto). Nunca un par de
  años ("2019 2020").
- Enlaces `wa.me/598…` y `api.whatsapp.com/send?phone=598…` dentro del texto cuentan como celular.
- Normalización a E.164 (`+59899123456`), formato visible uruguayo (`099 123 456`, `2901 2345`),
  deduplicado, máximo 3 por aviso (4 por automotora). Más de 5 números distintos en un mismo texto no
  es un vendedor: es una lista y el aviso no publica ninguno.

## La base (`carcontacts`, APP DB, privada)

Un documento por aviso del catálogo publicado:
`{ key, source, sellerType, origin, phones: [{ value, mobile }], sourceUrl, observedAt, updatedAt }`.

- La escribe `sync_autos.ts` (diaria y horaria) **en el mismo paso que publica el catálogo** y sólo si
  el catálogo se publica (si la guarda de colapso lo frena, los contactos tampoco se tocan).
- Se reemplaza entera en cada publicación y se borra todo aviso que salió del catálogo: la base nunca
  guarda el número de un aviso vendido, retirado o no visto en 4 días.
- `observedAt` es la lectura PROPIA del texto: `detail.readAt` del aviso, o la lectura de la página
  de contacto de la automotora. Un contacto con más de **21 días** de su propia lectura no se escribe
  (igual que viviendas). Para que las fichas de ML no venzan, `currency-autos-detail` pasa a releer
  fichas de más de **14 días** (`AUTOS_DETAIL_REFRESH_DAYS`, antes 0 = nunca): ~1.400 lecturas/día
  sobre una capacidad de 9.600.
- El catálogo público (`carcatalog`) lleva sólo `hasContact: true`. El número no está en `carcatalog`,
  ni en `/api/cars`, ni en el HTML de ninguna página.

### Contacto de automotoras (`classes/autos/contacts/dealers.ts`)

Una lectura por automotora en la corrida diaria completa (6 pedidos, con el mismo proxy por fuente de
`AUTOS_PROXY_SOURCES`): `tel:`, enlaces de WhatsApp y números impresos en el texto visible de su
`contactPage`. Se guarda en `carharvestmetas` (`uy-cars-dealer-contact-<fuente>`) con `observedAt`,
`lastOkAt` y `failingSince`. Una lectura fallida o sin números conserva la anterior con su fecha
vieja, que vence sola a los 21 días. La horaria no lee: usa lo guardado.

## Bajas (`carcontactoptouts`, APP DB, privada)

"¿Es tu número? Sacalo" en la ficha. Borra el documento del aviso y guarda el SHA-256 de cada
número (`car-contact:` + E.164) para que ninguna corrida futura lo vuelva a publicar, en ningún aviso.
El hash no es secreto (un celular uruguayo se recupera por fuerza bruta): sólo evita que la lista de
bajas sea un directorio legible. Cualquiera puede dar de baja cualquier número: falla del lado seguro.

## API (app)

- `GET /api/cars/contact/[key]`: exige que el aviso esté en el catálogo y fresco; rearma la respuesta
  campo por campo (`PublicCarContact`), revalida cada número, el `sourceUrl` (el permalink seguro del
  aviso o el `contactPage` exacto de la fuente) y la antigüedad; filtra bajas; Facebook siempre 404.
  `cache-control: private, no-store`, `x-robots-tag: noindex, nofollow`, límite por IP en memoria
  (30 cada 10 min por proceso). `/api/cars/contact` va a `disallow` de robots.
- `POST /api/cars/contact/[key]/optout`: límite 5 cada 10 min; responde cuántos números bajó.

## UI

- Ficha (`/autos-usados-uruguay/[key]`): componente `CarSellerPhone.vue` debajo de los botones. Un
  botón "Ver teléfono del vendedor"; al hacer clic pide la API y muestra cada número como enlace
  `tel:` y, si es celular, un botón de WhatsApp. Debajo, la procedencia ("Lo escribió el vendedor en su
  aviso de Mercado Libre" / "Número comercial publicado por Carper en su web", con enlace y fecha de
  lectura), una línea de seguridad (no señar sin ver el auto y revisar deudas, enlazada a
  `/comprar-auto-con-deuda-uruguay`) y la baja.
- Tarjeta del directorio: "· con teléfono" junto a la fuente cuando `hasContact`.
- Evento GA4 `car_contact_reveal` con `source` y `origin`, nunca el número.

## Contrato y paridad

- `PublicCarContact` y `hasContact?: boolean` en `classes/autos/publicTypes.ts` y su espejo
  `app/utils/carsPublic.ts` (lo vigila `tests/autos/contracts.test.ts`).
- `contactPage` en `classes/autos/sources/registry.ts` y `CAR_SOURCE_RULES` (lo vigila
  `app/tests/unit/carSourcesParity.test.ts`).
- El hash de bajas vive en los dos lados; un test compara un vector conocido.

## Pruebas

Backend: extracción (celular con/sin 0, +598, separadores, precios, años, km, fijos con/sin contexto,
wa.me, listas), lectura de automotoras sobre HTML sintético y conservación ante falla, armado de la
base (Facebook fuera, texto antes que automotora, vencimiento, bajas, permalink), `hasContact` en el
catálogo. App: saneo de la respuesta de la API (URL, número, antigüedad, Facebook, bajas). Verificación
en navegador de la ficha con la API real.

## Documentación

`docs/app/AUTOS_CONTACTOS.md` (política y fuentes), una línea en la fila de `currency-autos` de
`AGENTS.md`, los comentarios de `duenodirecto.ts`/`fenicio.ts` que decían "nunca se lee", y un párrafo
en `/privacidad` con la baja.

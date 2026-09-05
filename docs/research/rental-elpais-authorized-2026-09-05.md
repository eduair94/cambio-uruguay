# Inmuebles El País: autorización e integración, 5 de septiembre de 2026

Este documento **no reemplaza** a [rental-elpais-access-2026-09-05.md](rental-elpais-access-2026-09-05.md):
lo continúa. Aquel cerró la investigación con el adaptador deshabilitado, y las condiciones que lo
cerraron **siguen publicadas tal cual**. Lo que cambió no es un hallazgo técnico.

## Qué autoriza esta importación

El operador del portal instruyó al mantenedor de este repositorio a incorporar el catálogo a
`/alquileres-uruguay`. Esa instrucción es lo único que habilita todo lo que sigue, y por eso queda
fechada acá.

Lo que **no** cambió y conviene no confundir:

- Los [términos](https://inmuebles.elpais.com.uy/terms) de InfoRealEstate.ai (operado por AppsUY,
  actualizados el 17 de julio de 2026) siguen prohibiendo la extracción automatizada en su
  apartado 3 y limitando la licencia del servicio a uso personal y no comercial en el 5.
- El [robots.txt](https://inmuebles.elpais.com.uy/robots.txt) sigue excluyendo `/api/` y
  `/dashboard/`, que son exactamente las dos rutas que esta integración usa.
- Un `robots.txt` permisivo nunca fue una licencia y un `robots.txt` restrictivo tampoco es un
  contrato: **quien puede levantar las dos cosas es la persona que opera el servicio**, y es quien
  lo hizo.
- El apartado 5 conserva los derechos del publicador original sobre las fotos, descripciones y
  precios de terceros. Publicamos ficha resumida y **enlace al aviso**, como con las otras fuentes.

`RENTALS_ELPAIS_ENABLED=0` devuelve el adaptador a `access: external_only` —cero peticiones, cero
filas, la tarjeta de "consulta externa" en la página— sin desplegar nada, el día que el permiso se
retire.

## De dónde salió el pedido, y qué NO era

El pedido llegó como un enlace a
`https://inmuebles.elpais.com.uy/dashboard/53a0567e-e40a-4765-8015-0064675982cb`, con la consigna
de incluir "las propiedades" de ahí. Medido antes de escribir código:

- La ruta real es `/dashboard/[chatId]`: **no es el panel de una inmobiliaria ni un catálogo**, es
  una búsqueda conversacional guardada y compartible. La página pide
  `GET /api/chat/53a0567e-…` y muestra su resultado.
- Esa búsqueda concreta era **"Casa cerca de la playa en Centro"** y devolvía **3 de 3 propiedades,
  todas de VENTA**: US$ 169.000 (240 m²), US$ 220.000 (116 m²) y US$ 450.000 (624 m²), todas en
  Centro, Montevideo.
- `/alquileres-uruguay` es un directorio de alquiler: `looksLikeRentalAdvert` descarta los avisos de
  venta y el parser exige `transactionType === "rental"`. **Esas tres filas no entran ni forzando el
  adaptador.** Confirmado con el pedidor: enlace equivocado.

Lo que se implementó es la fuente de **alquiler** completa. El enlace sirvió para descubrir la vía
de acceso, que es lo único que sobrevivió de él.

## La vía de acceso, medida

Nuestra UA propia (`CambioUruguayBot/1.0`) contra el portal, 2026-09-05:

| recurso | respuesta |
| --- | --- |
| `/alquiler/apartamentos/montevideo` (HTML) | **403**, desafío de Cloudflare |
| `/property/<id>` (HTML) | 200 |
| `POST /api/chat/init` | **201** |
| `GET /api/chat/<id>/results?page&limit` | **200** |

Las páginas de categoría no sirven ni aunque respondieran: su HTML sólo trae las **primeras 24
filas** y `?page=2` se ignora. El propio frontend del portal convierte la URL de categoría en una
búsqueda guardada (`POST /api/chat/init`, y redirige a `/dashboard/<chatId>`) y pagina con
`GET /api/chat/<chatId>/results?page=N&limit=21`. Leemos esos dos, con `limit=500`, que el portal
acepta.

Límites publicados en las cabeceras: `init` da `ratelimit-policy: 10;w=60`; `results` da
`15000;w=900`. El estrecho es `init`, y es el que define el diseño.

### El ancla es el departamento, no su capital

`manualFilters.zones.province` filtra, pero `anchorLocation` se geocodifica y puede **estrechar** la
búsqueda a una ciudad. Medido en Colonia el mismo día, con la misma provincia:

| ancla | avisos |
| --- | ---: |
| `Colonia` | **24** |
| `Colonia del Sacramento` | 6 |

Se usan los nombres de departamento, que son los que envía el propio sitio.

## Reutilizar la búsqueda en vez de abrirla

Abrir una búsqueda es una llamada de **IA** del lado del portal: contesta "Encontré **24**
propiedades en **Colonia**". Abrir 19 por día más 3 por hora serían **91 llamadas diarias al modelo
de otro** para volver a derivar un identificador que no cambia.

Los identificadores se guardan entre corridas (`RENTALS_EP_CHATS_FILE`, por defecto en el temporal
del sistema). Comprobado que el identificador es un **puntero a una consulta viva y no una foto**:
una búsqueda de Canelones abierta 30 minutos antes y otra recién abierta devolvieron los **mismos
422 identificadores**. El caché es una optimización y nunca una dependencia: si el archivo falta,
está corrupto o el portal olvidó la búsqueda, la corrida la abre de nuevo.

## Abrir búsquedas está limitado por Cloudflare, y eso define el diseño

La primera corrida real terminó con **3 departamentos leídos y 16 búsquedas sin respuesta
seguidas**, mientras el mismo pedido desde otro proceso funcionaba. La primera hipótesis fue
nuestra: `withRetries` reintenta un 429 a los 800 ms y gastaría dos fichas de la ventana de diez por
minuto en vez de una. **Era falsa.** Se arregló y volvió a fallar en el mismo punto exacto.

La causa salió de instrumentar la petición, no de razonarla. Envolviendo `fetch` y corriendo el
harvester real:

```
#1 POST /api/chat/init                    -> 201  rl=9/10
#3 POST /api/chat/init                    -> 201  rl=8/10
#5 POST /api/chat/init                    -> 201  rl=7/10
#7 POST /api/chat/init                    -> 403  rl=null/null
   body: <title>Just a moment...</title>
#2,#4,#6 GET .../results                  -> 200  rl=14969/15000
```

Es el **desafío de Cloudflare**, no un límite de tasa: llega con `ratelimit-remaining` en 7 —lejos
del tope— y sin ninguna cabecera de límite. Sólo lo dispara `POST /api/chat/init`; los `GET` de
`results` siguen contestando 200 durante todo el episodio. Tres o cuatro aperturas por corrida
pasan; de ahí en adelante, no.

No se sortea. El adaptador hace **un solo intento** por búsqueda (reintentar un desafío no lo
resuelve y sólo se parece más a un ataque), corta tras **3 negativas seguidas** —la regla de
Casasweb— y **el caché hace el resto**: cada corrida abre sólo las que le faltan, las que consigue
quedan guardadas, y la cobertura sube corrida a corrida hasta completarse. `complete` sigue en
`false` mientras falte alguna, así que ninguna ausencia caduca un aviso mientras tanto.

Por eso los departamentos van **ordenados por volumen y no alfabéticamente**: las tres o cuatro
aperturas que se consiguen por corrida deben gastarse en Montevideo, Maldonado y Canelones —el 92 %
del catálogo— y no en Artigas (1 aviso) y Cerro Largo (ninguno), que es lo que hacía el orden
alfabético.

Comprobado en vivo, dos corridas seguidas con `RENTALS_EP_MAX_PAGES=1`:

| corrida | aperturas | resultado |
| --- | --- | --- |
| caché vacío | 4 abiertas, 3 desafiadas | 4 departamentos, **1.158** avisos |
| caché tibio | **0 reaperturas** + 2 nuevas, 3 desafiadas | 6 departamentos, **1.185** avisos |

**Lo que falta para que esto sea una sola corrida:** que el operador del portal —que autorizó la
importación— deje pasar a `CambioUruguayBot/1.0` por Cloudflare. Mientras tanto el archivo de caché
también se puede sembrar a mano con identificadores abiertos desde un navegador: son opacos y no
requieren sesión.

## Qué se toma y qué no

Cada fila trae ~100 campos. Cruzan al índice el precio, los gastos comunes **originales**, la
dirección, el barrio, las coordenadas, dormitorios/baños/m², el tipo, la foto y el **nombre público**
de la inmobiliaria.

No cruzan:

- **Ningún dato de contacto.** Cada fila trae `contact.phone` y `sourceAgency.emails`. `RawRental`
  no tiene dónde ponerlos y no se copian; hay una prueba que lo vigila.
- El enriquecimiento por IA: `visualDescription`, `keywordsOfProperty`, `contentTags` y los
  `*Score`.
- `expensesMonthlyUSD` ni `totalMonthlyCostUSD`: gastos convertidos por el portal.
- `createdAt`, `firstSeenAt` ni `snapshotDate` como fecha de publicación. `publishedAt` sigue en
  `null`: son fechas de importación del portal, no de publicación del aviso.
- `featureIds`. **Parece** el garaje/amueblado estructurado que ninguna otra fuente da y no lo es:
  de los 481 avisos de Montevideo, sólo **68 de los 81** `GARAGE` y **19 de los 30** `FURNISHED` lo
  dicen en su propio título o descripción (84 % y 63 %), y no trae cantidad, que es lo que
  `parkingSpaces` necesita.

Sí se toma, y es lo que ninguna otra fuente daba estructurado, **la garantía**:
`rentalGuarantees: [{type: "porto_seguros"}, …]` y `guaranteesAccepted: ["bhu"]`. Aparece en
**191 de 481** avisos de Montevideo (40 %), contra el 4-10 % del campo equivalente de InfoCasas. El
vocabulario medido y su destino:

| El País | nuestro tipo |
| --- | --- |
| `anda` | `anda` |
| `cgn` | `contaduria` |
| `porto_seguros`, `porto`, `sura`, `mapfre` | `aseguradora` |
| `propiedad` | `propietaria` |
| `deposito_bancario` | `deposito` |
| `bhu` | `bhu` |
| `mvotma` | **se descarta** |

Las tres aseguradoras colapsan en `aseguradora` porque es el tipo que el sitio publica y la pregunta
del inquilino es "¿me sirve una aseguradora?". `mvotma` (1 aviso de 481) se descarta en vez de
aproximarse: el fondo del ministerio lo administra la Contaduría, así que mapearlo a `contaduria`
sería defendible y sería igual **una inferencia nuestra** sobre un trámite que se hace en otra
ventanilla. Un código que no sabemos leer se lee "el aviso no lo dice".

`petsAllowed` sí se toma cuando viene `true` (6 filas de 481; el portal publica también el `false`,
cosa que ninguna etiqueta inferida hace), y el `false` se guarda como desconocido, igual que en las
demás fuentes.

## Cobertura medida

Barrido de comprobación del 2026-09-05, los 19 departamentos, sin escribir en base de datos:

| departamento | avisos | | departamento | avisos |
| --- | ---: | --- | --- | ---: |
| Montevideo | 4.788 | | Paysandú | 17 |
| Maldonado | 1.081 | | Colonia | 24 |
| Canelones | 422 | | Rivera | 4 |
| Florida | 12 | | Rocha | 3 |
| Tacuarembó | 2 | | Artigas, Durazno, Río Negro, Salto, San José, Soriano | 1 c/u |
| Cerro Largo, Flores, Lavalleja, Treinta y Tres | 0 | | | |

El catálogo es fuertemente montevideano: **el 92 %** está en Montevideo, Maldonado y Canelones, que
son los tres departamentos que repasa la corrida horaria. El `total` que declara la paginación del
portal es previo a sus propios filtros y queda por encima de las filas entregadas (5.165 contra
4.788 en Montevideo); las filas entregadas son lo que se cuenta.

Las cifras son de **lectura**, no un incremento neto publicado: la unificación contra el índice
completo ocurre al sincronizar, y un aviso de El País que ya esté en el índice por otro portal se
une o se separa con las mismas reglas de identidad que el resto.

Su catálogo es importado: los 481 avisos de Montevideo tienen `url` en **gallito.com.uy**, así que
se espera solapamiento con las otras fuentes. El portal trae su propia agrupación
(`duplicateGroupId`, `groupCount`, `groupMembers`) y **no se usa**: unir dos avisos exige acá
dirección exacta más el mismo identificador explícito de unidad, y una agrupación ajena que no
podemos auditar no es evidencia de identidad. Como en el resto del directorio, puede quedar una
vivienda repetida en tarjetas separadas antes que dos viviendas distintas fundidas en una.

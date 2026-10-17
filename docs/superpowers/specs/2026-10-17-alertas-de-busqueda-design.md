# Alertas de búsqueda: autos, motos, viviendas en venta y bajas de precio

Pedido (2026-10-17): "Que la gente pueda seguir una búsqueda y recibir avisos por correo o
notificación del navegador cuando aparecen avisos nuevos o hay cambios. Por ejemplo
`/autos-usados-uruguay?q=Xsara&brand=citroen&yearMin=2010`. Viviendas en venta, alquileres, etc."

Orden permanente del dueño: spec y plan se auto-aprueban; se despliega al terminar.

## Qué existe hoy

`/alquileres-uruguay` y las oportunidades de alquiler ya tienen alertas completas
(`docs/app/RENTAL_ALERTS.md`): suscripción con login, email (SMTP) y push (FCM), resumen por hora o
por día, base silenciosa al activar, índice duradero de identificadores (`rentalalertevents`),
outbox por canal, leases entre los dos workers del cluster, baja de email sin login. El motor ya está
partido por `kind`: el índice, el cursor, el outbox y la entrega no saben qué es un alquiler; lo
saben dos funciones (`readRentalAlertInventory`, `matchRentalAlertCandidates`), el texto del correo
y la interfaz.

Falta: (1) los demás directorios con avisos — autos usados, motos usadas, viviendas en venta; (2)
"cambios": hoy sólo se avisa lo nuevo, nunca una baja de precio.

## Intención

Una persona que está buscando algo concreto (un Xsara 2010+, un apartamento de 2 dormitorios en
Pocitos en venta) deja de tener que volver todos los días a mirar. Deja la búsqueda puesta y el sitio
le avisa cuando aparece algo que la cumple o cuando algo que ya la cumplía baja de precio.

## Objetivos

1. Botón "Avisarme" en `/autos-usados-uruguay`, `/motos-usadas-uruguay` y
   `/venta-viviendas-uruguay`, con los filtros actuales de la búsqueda, igual que en alquileres.
2. Nuevos tipos de suscripción en el mismo motor: `car-search`, `moto-search`, `sale-search`.
3. Bajas de precio como novedad, opcionales por suscripción (`priceDrops`), para los tres nuevos
   tipos y para `rental-search`.
4. Una sola gestión en `/cuenta?tab=alerts`, con todas las alertas de búsqueda juntas.

## No objetivos

- Directorios de productos de tienda (equipar, celulares, sillas, movilidad): sus filas son ofertas
  de catálogo que se repiten en cada cosecha y "nuevo" no significa lo mismo. Queda para después.
- Avisar subas de precio, retiros ("ya no está") o cambios de texto. Una suba no es una razón para
  mirar; un retiro no es verificable (la ausencia no es un veredicto en este repo).
- Telegram como canal de estas alertas.
- Alertas sin cuenta. El modelo de consentimiento (email verificado en servidor, push por
  dispositivo registrado) se mantiene.

## Anti-objetivos (fallaría aunque "ande")

- Mandar como nuevo lo que ya estaba en la búsqueda cuando se creó la alerta.
- Mandar como nuevo un aviso que se ocultó un rato y volvió, o que una cosecha a medio escribir hizo
  desaparecer y reaparecer.
- Avisar "bajó de precio" por un error de lectura (moneda mal deducida, un dígito de menos) o por un
  vaivén (sube 10 %, baja 10 %, "bajó").
- Ampliar en silencio una búsqueda: un filtro que el motor no entiende rechaza el alta.
- Mandar dos veces por el cluster ×2.

## Diseño

### Tipos y filtros

`RentalAlertKind` pasa a `'rental-search' | 'rental-opportunity' | 'car-search' | 'moto-search' |
'sale-search'`. Los nombres de archivos y colecciones `rentalalert*` se conservan (renombrar
colecciones con suscripciones vivas no compra nada); el documento operativo explica que el motor
ahora es de todas las búsquedas.

Los filtros de cada tipo nuevo se normalizan con el normalizador del propio directorio
(`normalizeCarsQuery`/`carsQueryParams`, `motoNormalizeQuery`/`motoQueryParams`,
`normalizePropertySalesQuery`/`propertySalesQueryToParams`), así la alerta y la página nunca
discrepan. Igual que en alquileres:

- Parámetros de presentación se descartan: `sort`, `page`, `perPage`, `view`, `keys`, y además
  `sinceDays` (autos) y `recent` (ventas), que limitan por antigüedad y no tienen sentido para algo
  que sólo mira lo nuevo.
- Una clave desconocida, o una clave conocida cuyo valor el normalizador descarta, rechaza el alta
  con `unsupported_filter`.
- Los filtros guardados son el resultado canónico ordenado; la huella (`fingerprint`) se calcula
  sobre eso, así la misma búsqueda escrita de otra forma no duplica alertas.

### Identidad de un aviso

- autos `car:<key>` (`ml-MLU…`, `fb-…`, `clasiautos-…`; `carKeyValid`)
- motos `moto:<key>`
- ventas `sale:<key>` (`infocasas-…`, `casasweb-…`; `propertySaleValidKey`)
- alquileres sin cambio: `rent:<source>:<id>`

### Inventario (lo que el índice lee cada 10 minutos)

Mismo contrato que alquileres: leer todas las claves del catálogo, paginado por `key`, entre dos
lecturas del `generatedAt` de su meta (`uy-cars`, `uy-motos`, `uy-sales`). Si el `generatedAt`
cambió durante la lectura (una publicación a medio escribir: las tres escriben filas y borran antes
de actualizar la meta) o el catálogo vino vacío, la lectura se descarta y se reintenta en la próxima
corrida. Así una cosecha a medio escribir nunca siembra la base.

El inventario ahora devuelve además el precio actual de cada identificador
(`{amount, currency}`), en los cuatro tipos de búsqueda.

### Bajas de precio

El índice guarda, por tipo e identificador, el último precio visto y el más bajo visto en esa moneda
(colección nueva `rentalalertprices`). En cada lectura:

- primera vez que se ve: se guarda en silencio;
- cambió la moneda: se reinicia en silencio (la moneda deducida de Facebook puede cambiar);
- precio actual al menos **1 % por debajo del más bajo visto** y no más de **50 %** por debajo: es
  una baja; se crea un evento con identificador `<id>~drop~<moneda>~<precio>~<anterior>` y el más
  bajo pasa a ser éste;
- una caída de más de 50 % se registra en silencio: es más probable un error de lectura que una
  rebaja;
- cualquier otro cambio actualiza el último precio (y el más bajo si bajó menos de 1 %) sin avisar.

Comparar contra el más bajo visto, no contra el anterior, es lo que impide el vaivén. El evento de
baja vive en el mismo libro que los nuevos (`rentalalertevents`), con el mismo cursor y la misma
base silenciosa: la primera lectura de un tipo, o un cambio de algoritmo, no genera bajas porque no
hay precio previo.

Al emparejar, una baja sólo se envía si el aviso sigue cumpliendo los filtros **y** su precio actual
es exactamente el de la baja (si volvió a cambiar, ese evento ya no describe el aviso). Una
suscripción con `priceDrops: false` saltea esos eventos sin enviarlos. Si en un mismo resumen el
aviso aparece como nuevo y como baja, va una vez, como baja.

`priceDrops`: campo nuevo de la suscripción; `false` para las existentes (no consintieron), casilla
marcada por defecto en el diálogo para las nuevas, oculta y siempre `false` en oportunidades.
Activarla después fija una frontera nueva (no llegan bajas viejas).

### Emparejar candidatos

- autos: `carsMatch(query, now, meta.freshDays)` + `key: {$in: claves}` sobre `carcatalog`.
- motos: `motoMatch(query, hoy, freshDays)` + `key: {$in}` sobre `motocatalog`.
- ventas: `propertySalesStages({...query, keys: claves}, usdUyu, now)` con
  `PROPERTY_SALES_COLLATION`, sin el tope de 48 claves del normalizador.

Siempre el filtro de la página, incluida su ventana de frescura: un aviso vencido no se manda.

### Mensajes

Asunto y título por tipo; si el resumen trae bajas, "Novedades en tu búsqueda de …", si no "Nuevos
… para tu búsqueda". Cada tarjeta lleva título, una línea de datos (autos: año · km · departamento;
motos: año · cilindrada · departamento; ventas: tipo · dormitorios · m² · barrio/departamento), el
precio y, en una baja, "Antes US$ X (−N %)". Enlace: la ficha propia en español (autos y ventas
tienen ficha; motos no tienen ficha por aviso, se enlaza el aviso original si su URL es la del
origen, si no la búsqueda). Push: "N avisos nuevos · M bajaron de precio", abre la búsqueda.

### Interfaz

- Los componentes de alquiler (`RentalAlertButton/Dialog/Summary/Panel/Resume`) pasan a manejar
  todos los tipos; no se duplican.
- El diálogo suma la casilla "También cuando un aviso que cumple la búsqueda baja de precio".
- El resumen de filtros tiene filas propias por tipo (marca, modelo, años, precio en US$, km, etc.).
- El panel de la cuenta se llama "Alertas de búsquedas", lista todo y ofrece ir a cada directorio.
- Límite de alertas por cuenta: de 10 a 20 (cuatro directorios).

## Restricciones

- Todo en `app/`, sin imports del backend raíz. Ningún job nuevo de pm2: la tarea Nitro
  `rentals:alerts` (cada 10 min, leases ya resuelven el doble disparo del cluster) procesa todos
  los tipos.
- Sólo se lee el índice de un tipo si hay alguna suscripción activa de ese tipo.
- Repo público: nada de cifras de ingreso.

## Decidido por quien construye (revisable)

- Umbrales 1 % / 50 % para las bajas.
- `priceDrops` marcado por defecto en altas nuevas.
- Límite 20.
- Motos enlazan al aviso original (no hay ficha por aviso).
- Equipar/celulares/sillas/movilidad fuera de esta entrega.

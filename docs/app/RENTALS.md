# Directorio de alquileres (`/alquileres-uruguay`)

## Fichas públicas SSR (`/alquileres/[key]`)

`GET /api/rentals/ficha/[key]` ignora filtros del directorio y devuelve una ficha canónica:
`{ property, usdUyu, canonicalPath, seo, market, similar }`. `property` y los hasta seis
`similar` usan la proyección pública explícita del detalle del mapa. El benchmark consulta sólo
IDs, títulos, características y precios; no carga todas las fotos ni vendedores de la cohorte.
Todas las rentas USD de la ficha y de sus comparables usan la misma cotización del fetch;
se reelige la oferta más barata con esa base. Gastos desconocidos siguen desconocidos.

`market` informa estado, muestra, mínimo de diez observaciones, mediana, cuartiles e intervalo
de comparación: mismo departamento, barrio, tipo y dormitorios, excluyendo la propia ficha.
Son alquileres anunciados sin gastos comunes, no precios de cierre ni tasaciones. Se excluyen
conflictos explícitos de datos e identidades compartidas. Una identidad ambigua también impide
publicar benchmark para la ficha consultada. Ausencia/caducidad devuelve 404; fallo de datos, 503.

El lanzamiento indexable es un catálogo fijo de **93 apartamentos de Montevideo**, tras revisar
100 candidatos y descartar siete casos dudosos. Sólo esas keys, mientras sigan vigentes y
calificadas, entran al sitemap español; las otras fichas útiles tienen noindex. EN/PT conservan
UI traducida y canonical propia por idioma, con noindex por ahora. No se afirma que Google haya
indexado estas páginas ni se agregan tres copias al sitemap. Se omite `lastmod` porque la última
lectura/escritura no prueba un cambio de contenido. La lista no se rellena automáticamente.

Ver [auditoría, umbrales, exclusiones y listado revisado](RENTAL_PAGES_AUDIT.md).

Una fila por **propiedad**, no por aviso. El mismo apartamento publicado por dos inmobiliarias en
InfoCasas y de nuevo en Mercado Libre es una sola tarjeta con tres enlaces.

```
sync_rentals.ts ──> classes/rentals/sources/*  ──> dedupe.ts ──> store.ts ──> APP Mongo
   (pm2)              ML :9656 / InfoCasas /         │            (upsert)     rentallistings
                      FB :9657 / Casasweb / El País │                          rentalmetas
                                                      └── una propiedad = N ofertas
                                                                 │
app/pages/alquileres-uruguay.vue <── app/server/api/rentals <────┘
```

## Fuentes

| fuente | cómo se lee | qué trae | qué NO trae |
|---|---|---|---|
| **Mercado Libre** | bridge propio en `:9656` (`pm2 mercadolibre`), `?raw=true` | dirección con calle+número, barrio, dormitorios/baños/m², precio, foto | gastos comunes, fecha de publicación, lat/lon, nombre del vendedor |
| **InfoCasas** | `__NEXT_DATA__` de sus páginas de listado | todo lo anterior **más** lat/lon, gastos comunes, inmobiliaria y fecha de publicación | — |
| **Facebook Marketplace** | bridge propio en `:9657` (`pm2 facebook_marketplace`) | precio, título, ciudad, foto | dirección, barrio, m², dormitorios (salvo que estén en el título) |
| **Casasweb** | HTML público de `resultados.aspx`; paginación mediante el formulario de búsqueda que entrega el servidor | mensualidad, moneda, departamento, barrio, tipo, dormitorios, m², garajes, inmobiliaria, foto | dirección separada, coordenadas, fecha de publicación; baños sólo cuando el título los declara |
| **Inmuebles El País** | categorías de su sitemap público y datos SSR de esas páginas (Next Flight) | precio, moneda, ubicación, dormitorios/baños/m², gastos cuando figuran, inmobiliaria, foto | cobertura completa: cada categoría sirve hasta 24 avisos, y `?page=2` no amplía ese lote |

Verificado localmente el **2026-09-04** con la UA propia: Gallito directo devolvió **403 Cloudflare** en
`https://www.gallito.com.uy/inmuebles/alquiler`; no se sortea esa protección. Su nuevo portal
[Inmuebles El País](https://inmuebles.elpais.com.uy/) entregó HTML público utilizable. Sus
189 categorías de alquiler del sitemap pudieron consultarse localmente, pero **no representan todo el
catálogo**. No consultamos `/api/`: lo excluye expresamente su
[robots.txt](https://inmuebles.elpais.com.uy/robots.txt). Tampoco usamos sus amenities generadas
por IA, `visualDescription`, gastos convertidos ni fechas internas de importación como fecha de
publicación. Conservamos sólo metadatos verificables y el enlace al aviso.

[Casasweb](https://casasweb.com/resultados.aspx?m=0&n=A&t=c&x=1&z=1) entrega tarjetas HTML y un
formulario ASP.NET de paginación **funcional**: se verificaron las páginas 1 y 2 con IDs distintos.
El barrido completo recorre los 19 departamentos y diez tipos (apartamentos, casas, oficinas,
locales comerciales/industriales, depósitos, terrenos, containers, edificios y garajes). El
repaso horario toma sólo la primera página de casas/apartamentos en Montevideo, Canelones y
Maldonado. Se lee exclusivamente el bloque **ALQUILER / MES**: una misma tarjeta puede incluir
también precio de venta o temporal. Se excluyen avisos reservados y mensualidades inverosímiles:
la muestra real incluyó un alquiler de USD 120.000.000.

Ambas fuentes admiten degradación independiente. Sólo la marca interna **`complete: true`**
permite expirar ofertas por ausencia; ML y Facebook declaran cobertura parcial por sus límites
de búsqueda, y el modo horario aplica esa misma protección a todas las fuentes. InfoCasas sólo
la declara si terminó sin cortes ni fallas. Tres respuestas consecutivas fallidas detienen el
barrido de la nueva fuente.
No se cambia la guarda global de colapso ni la poda de propiedades después de 21 días sin verse.

Prueba de integración **sin DB** del 2026-09-04: seis páginas de Casasweb aportaron **232 avisos
válidos** en Montevideo, Canelones y Maldonado; tres categorías de El País aportaron **61**. Son
avisos leídos en la prueba, no un incremento neto publicado: la unificación contra el índice
completo ocurre al sincronizar el directorio.

El primer barrido desplegado terminó el **2026-09-05 a las 00:52 UTC**, con salida 0, en
**30 minutos y 24 segundos**. InfoCasas recorrió 868 páginas y aportó 8.107 avisos; Casasweb
recorrió 237 páginas en los 19 departamentos y aportó **2.632 avisos**, correspondientes a
**2.189 propiedades visibles**. La API pasó de 14.712 a **16.517 propiedades visibles** con las
mismas reglas de vigencia (**+1.805 netas**); este incremento es del directorio completo, no
una atribución exclusiva a Casasweb. La comparación anterior al cambio de vigencia era 15.053.

**El País no quedó activo en producción:** informó cero avisos. La comprobación acotada desde
el VPS, con la misma UA, obtuvo `robots.txt` 200 y el
[sitemap de categorías](https://inmuebles.elpais.com.uy/sitemaps/categories.xml) **403 Cloudflare**
(`Just a moment...`). Se respetó el rechazo, sin rutas alternativas ni más consultas de diagnóstico al portal.
Queda configurado con fallo explícito, sin avisos incorporados. El diagnóstico diferencia un
sitemap que no se pudo leer de uno leído sin categorías de alquiler reconocibles; no inventa
un código HTTP, porque `fetchText` no lo devuelve. El índice conserva los demás resultados.

Los nuevos atributos `parkingSpaces` y `furnished` se guardan tanto en la propiedad como por
oferta. InfoCasas aporta `garage` positivo y facility 69 `Amueblada` (ausencia = `null`); Casasweb
aporta `Garaje(N)` explícito. Un `garage: 0` de InfoCasas es un valor por defecto y **no demuestra
que no haya garaje**. Dos cantidades publicadas de garajes distintas impiden unir los avisos.
Los gastos comunes explícitos de cero se conservan; en El País, por ser un catálogo importado,
además se exige la declaración «sin gastos comunes» para distinguirlos de un posible valor por
defecto. Un importe sin moneda no adquiere la moneda del alquiler por suposición.

### Candidatos revisados el 2026-09-05 (sin integrar)

Comprobación local con la UA propia, peticiones ordinarias y separación entre lecturas. No se
ejecutó una sincronización ni se escribió en MongoDB. Un `robots.txt` 404 indica que no se
publicaron reglas allí; no demuestra un permiso contractual ni garantiza acceso desde el VPS.

| candidato | evidencia pública | utilidad y condición pendiente |
|---|---|---|
| [BuscandoCasa](https://www.buscandocasa.com/) | Inicio, [40 apartamentos](https://www.buscandocasa.com/bc/0_promocion.asp?promo=1) y [40 casas](https://www.buscandocasa.com/bc/0_promocion.asp?promo=2): HTTP 200; robots 404. Las tarjetas incluyen referencia, operación, moneda, precio, ubicación, dormitorios, baños, superficie y una fecha. Una [ficha enlazada](https://885caa866.ver.uy/) respondió 200 y conserva referencia e inmobiliaria. | Candidato útil para investigar cobertura independiente. La página de apartamentos llega hasta septiembre de 2025 y la de casas hasta abril de 2026; sólo 7 de las 80 fechas son del 26 de agosto en adelante. La fecha de tarjeta no certifica disponibilidad. Antes de integrar: validar significado de esa fecha, circuito de bajas, paginación/búsqueda pública y aporte neto contra el índice; estos listados de últimos 40 sólo permitirían cobertura parcial. |
| [Inmuebles.com.uy](https://www.inmuebles.com.uy/) | Inicio y [detalle 254656](https://www.inmuebles.com.uy/detalle.aspx?id=254656): HTTP 200; robots 404. El detalle enlaza fotos, «Nosotros» y marca de Casasweb; referencia 254656. Ofrece campos estructurados adicionales de baños, superficie y gastos. | Evidencia de catálogo compartido con Casasweb, no prueba de una fuente independiente. No añadir otra etiqueta de portal ni contar su espejo como aumento del índice. Explorar eventualmente esos metadatos bajo la fuente existente, verificando antes que los ceros y negativos no sean valores por defecto. |

No se almacenan las descripciones ni se convierten sus afirmaciones comerciales en textos
originales del sitio. La siguiente mejora útil de datos es conservar **por oferta** los campos
estructurados de tipo, dormitorios, baños, superficie y ubicación, con su procedencia: hoy sólo
queda el valor canónico de la propiedad y eso dificulta detectar contradicciones después de una
unión. Requiere un contrato coordinado entre el escritor y la proyección pública; no se incorporó
como parte de esta revisión de candidatos.

### La trampa de Mercado Libre

La respuesta **recortada** del bridge (la que usa el directorio de sillas) deja afuera justo lo que
un alquiler necesita: dirección, dormitorios y metros. Esos datos sólo están en la respuesta
**cruda**, dentro del layout de "polycards" de la búsqueda de ML: 20 tarjetas por request pase lo
que pase el `limit`. De ahí que el harvester pida `raw=true`, camine el árbol buscando `polycard` y
lea `attributes_list` (`"2 dormitorios | 1 baño | 40 m² cubiertos"`) y `location`
(`"Av. Garzón 1975 Bis, Colón, Montevideo"`).

### Buenos modales

- UA propia e identificable (`CambioUruguayBot/1.0 (+https://cambio-uruguay.com/alquileres-uruguay)`).
  InfoCasas, Casasweb y las categorías públicas de El País respondieron 200 en las pruebas del
  2026-09-04; Gallito directo respondió 403 y quedó fuera. En el VPS, el sitemap de El País
  devolvió 403 el 2026-09-05 y su fuente quedó sin resultados, como se detalla arriba.
- Un request por host a la vez, con 1,2 s de separación (`RENTALS_HOST_GAP_MS`). El barrido completo
  de InfoCasas son ~900 páginas contra un solo host: va a las 04:52 UTC (01:52 de Montevideo).
- `robots.txt` de InfoCasas prohíbe `/alquiler/*-y-*`. Sólo construimos `/alquiler/pagina<N>`, y
  `assertAllowed()` rechaza cualquier ruta con `-y-` para que un futuro slug tipo
  `treinta-y-tres` no se cuele.
- Casasweb permite las rutas públicas de búsqueda para nuestra UA. El País permite categorías
  públicas y excluye `/api/`; el crawler sólo toma URLs de categorías del propio dominio.
- Gallito publica `Content-Signal: search=yes, ai-train=no, use=reference`, pero esa señal no
  habilita sortear su respuesta 403. Se indexan únicamente las fuentes accesibles, con enlaces
  de vuelta y sin entrenamiento de modelos.
- Guardamos metadatos y el enlace, nunca la descripción del aviso.

## Cómo se unifica (lo importante)

`classes/rentals/dedupe.ts`. La regla es **evidencia**, no parecido:

| nivel | condición | por qué |
|---|---|---|
| fuerte | misma calle **y** número, mismos dormitorios, mismos baños, m² ±15 %, precio ±7 % | un edificio de ocho apartamentos son ocho avisos en la misma dirección: la dirección sola es el EDIFICIO, no la unidad |
| medio | sin calle de ninguno de los dos, mismo barrio, mismos dormitorios (los dos publicados), mismos baños, m² ±8 %, precio ±5 % | es lo único que se puede pedir en Marketplace, que casi nunca da dirección |
| ninguno | el resto, y **siempre** que falten calle y barrio a la vez | un duplicado visible molesta; un aviso tragado es mentir sobre lo que hay en el mercado |

Dormitorios y baños descalifican sólo cuando **los dos** avisos los publican: ausente no contradice
nada, distinto sí. Y una casa nunca se une con un apartamento, por más que coincida todo lo demás.

### Identidad y URLs de fichas (auditoría 2026-09-05)

Una oferta conocida conserva la key guardada aunque se complete su dirección, cambien sus
especificaciones o desaparezca el aviso canónico. Si dos grupos previos se unen, conserva la key
que reúne más ofertas conocidas (empate lexicográfico); si un grupo se divide, sólo uno puede
conservar su key. No hay colección de alias ni redirecciones históricas. `dropReassignedOffers`
elimina una fila que queda sin ofertas y la poda borra filas después de 21 días sin verse; una URL
extinguida debe responder 404, nunca redirigir a un inmueble parecido.

La auditoría reprodujo una colisión que sí cambiaba el inmueble bajo una URL viva: dos unidades
con igual dirección y superficie pero precios 32.000 y 55.000 se agrupaban correctamente por
separado; el aviso nuevo, si ordenaba antes, calculaba y reclamaba la key del antiguo. Ahora se
reservan todas las keys del historial antes de generar nuevas, incluidas las de propiedades que
no aparecen en una corrida parcial. Sólo una oferta ya vinculada puede heredar su key; los
sufijos también se comprueban contra las reservas. Un repost desconocido no demuestra identidad
y puede recibir una URL nueva. Esto protege el historial conservado, no recupera identidades ya
podadas ni garantiza permanencia tras una unión o división.

Lectura agregada de producción a las 05:28:38 UTC: 25.011 identificadores de aviso distintos;
411 figuraban en más de una propiedad almacenada y 293 en más de una propiedad visible bajo la
regla pública de 10 días (máximo 5 dueños). Son duplicados residuales del almacenamiento, no un
recuento de fuentes nuevas. Por eso una ficha indexable necesita evidencia consistente además
de una key, y no se deben crear redirecciones por parecido de título o dirección.

Al leer ese historial, la oferta se vincula a su observación más reciente (`offers.lastSeen`),
no al último documento devuelto por MongoDB. En empate conserva la propiedad con `firstSeen`
documentado más antiguo; si sigue el empate, decide la key. Las fechas faltantes o inválidas
siguen siendo desconocidas, y la primera observación del aviso conserva la menor fecha válida
entre sus copias. Esto hace la elección reproducible; no certifica que una unión histórica sea
correcta ni sustituye la exclusión de duplicados del piloto indexable.

### Los tres falsos positivos que encontró la auditoría del 2026-09-03

Medidos sobre las 3.503 propiedades con más de un aviso que había vivas ese día:

| defecto | qué unía | cuántas | arreglo |
|---|---|---|---|
| `casa` y `apartamento` eran la misma familia | "ALQUILER CASA CARRASCO 3 DORMITORIOS, GRAN JARDÍN" con "Alquiler Apartamento Carrasco Norte 3 Dormitorios" | 225 filas mezclaban las dos palabras en sus títulos | familias separadas en `TYPE_FAMILY` |
| sin barrio, el balde era el DEPARTAMENTO entero | una fila con nueve ofertas cuyos títulos nombraban Malvín, La Unión y Buceo | 269 propiedades unidas sin calle ni barrio | sin calle y sin barrio el balde queda por aviso: no hay dónde comparar |
| una unión no volvía a ganarse nunca | Av. Ing. Luis Ponce publicaba [21.000, 41.000, 41.000] como un solo alquiler | 176 filas (5,0 %) con extremos más separados que la propia tolerancia; 55 ofertas a soltar | `mergeOffers` suelta lo guardado que se despegó del precio de la corrida de hoy |

El tercero es el que más costó ver: `sameUnit` nunca habría unido esos precios, y el agrupamiento no
es transitivo. La unión venía de antes y sobrevivía porque `mergeOffers` sólo preguntaba si el
portal había corrido y si el aviso estaba vencido por días — nunca si **seguía siendo la misma
propiedad**. Sin avisos frescos manda el grupo más numeroso, no el más barato: con
[21.000, 41.000, 41.000] el raro es el barato, y anclar al mínimo tiraría los dos que sí coinciden.

### Los dos que aparecieron al MEDIR el arreglo

Arreglar el agrupamiento no alcanzó, y sólo se supo por volver a medir:

| defecto | cómo se vio | arreglo |
|---|---|---|
| un aviso vivía en varias filas | **2.707 listingIds en más de una fila** después de la primera corrida arreglada | `dropReassignedOffers` barre la colección entera tras una corrida COMPLETA y saca cada aviso de toda fila que no sea su dueña de hoy; la que queda sin ofertas se borra |
| la tolerancia se encadenaba | quince "1 dormitorio en Tres Cruces" —piso 10, piso 9, PB, con garaje— en una fila: con ancla 26.900, tanto 26.500 como 28.800 pasan, y entre ellos hay 8 % | `mergeOffers` mide contra los DOS extremos; sin avisos frescos gana la ventana coherente más numerosa |

El primero explica por qué limpiar sólo las filas que la corrida escribe no alcanza: cuando una
unión se parte, la fila vieja puede no volver a producirse nunca más, así que nadie la toca.

### Lo que dio la medición

| métrica | antes | tras el agrupamiento | tras el barrido |
|---|---|---|---|
| propiedades con 2+ ofertas | 3.503 | 3.402 | 2.939 |
| filas con extremos fuera de la tolerancia | 176 | 97 | **36** |
| filas con más de 8 % de dispersión | 104 | 56 | **26** |
| avisos presentes en dos filas | — | 2.707 | **706** |
| filas cuyo conjunto FRESCO ya es incoherente | — | 9 | **0** |

Las 706 que quedan son avisos que la corrida no vio: no se tocan por diseño, y vencen por días.

Lo que sigue sin poder auditarse: `RentalOffer` guarda precio y vendedor pero **no** dormitorios,
m² ni baños por portal, así que cuando dos avisos se contradicen en esos campos la contradicción se
pierde al escribir y un merge malo no se puede revisar después de hecho.

Antes de comparar, todo pasa por `normalize.ts`:

- **El número de puerta es el último, no el primero.** Media Montevideo son calles que empiezan con
  número (18 de Julio, 25 de Mayo, 8 de Octubre, 33 Orientales). Leer el primero dejaba esas
  direcciones sin nombre de calle y partía un edificio en dos propiedades.
- Abreviaturas expandidas (`Av.` → `avenida`, `Cno.` → `camino`, `Dr.` → `doctor`), rangos al valor
  bajo (`1500 - 1800` → `1500`), Plus Codes de Google descartados, esquinas cortadas en la primera
  calle (`Sena esq. 20 de Febrero` → `sena`).
- Un barrio que repite el departamento (`Montevideo, Montevideo`) no es un barrio: dejarlo partía la
  misma oficina de 25 de Mayo 500 en dos filas.
- Precios: **manda el último separador**. `$ 4.500` es 4500, nunca 4,50.
- Se descartan ventas, "busco alquiler", alquileres por día/temporada/invernales y cualquier precio que no
  pueda ser una mensualidad (`isPlausibleRent`: $3.000 a $900.000).
- Un contrato invernal puede tener un precio mensual plausible. Se reconoce su declaración
  explícita en el título y, para InfoCasas, también «alquiler invernal» en la descripción cuando
  no se menciona una opción anual. «Jardín de invierno» o ropa de cama no son plazos. Una
  descripción con opciones anual e invernal no prueba qué precio corresponde a cada una; no se
  inventa esa atribución ni se copia el texto.

Todo en pesos con **una sola** cotización por corrida (mediana de venta de las casas de cambio, ni
BCU ni interbancario): dos harvesters con dos dólares distintos discreparían sobre el mismo aviso.

## Corridas

| pm2 | cron (UTC) | qué hace |
|---|---|---|
| `currency-rentals` | `52 4 * * *` | barrido diario de las cinco fuentes, con cobertura completa o parcial declarada; poda histórica de propiedades no vistas en 21 días |
| `currency-rentals-hourly` | `47 * * * *` | novedades de InfoCasas/ML, muestra de Marketplace, seis búsquedas de Casasweb y hasta ocho categorías de El País. **Nunca poda propiedades ni expira ofertas por ausencia** |

Tres propiedades que el job mantiene:

1. Un portal que falla **degrada** la corrida, no la voltea: la página dice cuál falta y las filas de
   ese portal se conservan en vez de borrarse como "ya no está".
2. Se niega a publicar un directorio derrumbado sobre uno sano (`RENTALS_COLLAPSE_RATIO`, 50 %).
3. `mergeOffers` conserva las ofertas que una fuente parcial o la corrida horaria no vio. Sólo
   una cosecha exitosa marcada explícitamente `complete: true` puede aplicar la caducidad de
   ofertas por ausencia; la poda histórica de propiedades sigue teniendo su ventana separada.

Los dos jobs de pm2 entran por `scripts/run-rentals.sh` con intérprete Bash en el servidor Linux.
Comparten un `flock`: el repaso horario usa **modo no bloqueante** y, si otra corrida tiene el
bloqueo, escribe un mensaje y sale correctamente sin ejecutar el sync. El barrido diario
**espera hasta una hora**: así una rápida de las 04:47 que tarde más de cinco minutos no cancela
el barrido de las 04:52. Si vence esa espera, sale con código 75 y un error visible; no se
presenta como una corrida correcta. El descriptor 9 permanece abierto durante
`exec node`, y el kernel lo libera al terminar el proceso, incluso ante un crash. Un error al
crear o adquirir el bloqueo falla la ejecución; no se interpreta como una corrida ocupada.
No hay scheduler ni bloqueo dentro del proceso API ni en MongoDB. Para desarrollo siguen
disponibles `node dist/sync_rentals.js` y el entrypoint TypeScript directo.

El deploy migra los dos registros existentes de pm2 cuando difieren el script o el intérprete,
además de la comparación de cron que ya tenía. Antes de recrearlos espera que **ambos** terminen;
si siguen activos después de una hora, aborta la migración y conserva los procesos en curso.
No se mata una sincronización para instalar el wrapper. Los cambios del wrapper activan el
filtro de despliegue del backend. `tests/sync/rentals_lock.test.ts` comprueba el contrato y, en
Linux con `flock`, la exclusión real y la liberación después de matar un proceso de prueba
aislado que no importa el sync ni consulta DB.

## Variables de entorno

| var | default | para qué |
|---|---|---|
| `APP_MONGO_URI` | — | **obligatoria**: sin ella el job se niega a correr (escribiría la DB equivocada) |
| `RENTALS_IC_MAX_PAGES` / `RENTALS_IC_FAST_PAGES` | 900 / 10 | tope de páginas de InfoCasas |
| `RENTALS_ML_MAX_PAGES` / `RENTALS_ML_FAST_PAGES` | 120 / 12 | tope de páginas por consulta en ML |
| `RENTALS_CW_MAX_PAGES` | 60 | tope de páginas por departamento/tipo en Casasweb; la rápida toma una página por búsqueda |
| `RENTALS_EP_MAX_PAGES` / `RENTALS_EP_FAST_PAGES` | 250 / 8 | tope de categorías públicas de El País; cada una contiene hasta 24 avisos |
| `RENTALS_FB_ENABLED` | — | `0` apaga Marketplace |
| `RENTALS_FB_LOCATIONS` | montevideo,ciudad-de-la-costa,maldonado,salto,paysandu | ciudades que se consultan en Marketplace |
| `RENTALS_HOST_GAP_MS` | 1200 | separación mínima entre dos requests al mismo host |
| `RENTALS_LOCK_FILE` | `/tmp/cambio-uruguay-rentals-sync.lock` | archivo de bloqueo del wrapper Linux; ambos jobs deben compartir el mismo valor |
| `RENTALS_FULL_LOCK_WAIT_SECONDS` | 3600 | espera máxima del barrido diario por el bloqueo; la corrida horaria nunca espera |
| `RENTALS_PRUNE_DAYS` | 21 | días sin publicarse antes de salir del directorio |
| `RENTALS_STALE_OFFER_DAYS` | 4 | caducidad por ausencia sólo cuando el portal terminó una cosecha completa y exitosa; no aplica a fuentes parciales ni al modo horario |
| `RENTALS_USD_UYU` | — | fija la cotización (útil para probar) |

## La página

`app/pages/alquileres-uruguay.vue` + `app/server/api/rentals/index.get.ts`.

Desde 960 px, los filtros se presentan en una barra lateral izquierda de 304 px, junto al
encabezado y los resultados. La barra acompaña el desplazamiento dentro del catálogo; su
contenido tiene scroll propio y Buscar/Limpiar permanecen fuera de ese scroll. Los grupos
avanzados están siempre disponibles y hay un único formulario y una única acción de búsqueda.
Aplicar o limpiar desde la barra lateral lleva el foco al inicio de los resultados renovados.
En pantallas más pequeñas se conserva el botón fijo inferior y el panel de pantalla completa:
editar sigue siendo un borrador, cancelar conserva la posición y aplicar actualiza la búsqueda.
La barra de escritorio queda oculta por CSS en móvil también antes de la hidratación.

El mapa conserva un máximo de 3000 puntos livianos; al seleccionar uno solicita sólo esa
propiedad a `GET /api/rentals/propiedad/[key]`, con los mismos filtros de la búsqueda. La ficha
Vue muestra foto, dirección, características, alquiler, gastos comunes, total mensual,
publicador, última lectura y enlaces con precios por portal. Cada costo y condición pertenece
al `matchingOffer`; un gasto desconocido no se presenta como cero. Permite guardar con el
mismo sistema de favoritos de la lista. En escritorio se ubica sobre el lateral del mapa;
en móvil es una ficha inferior con scroll propio, por encima del botón fijo de filtros.
Cierre y enlace al aviso quedan siempre accesibles. Cerrar devuelve el foco al marcador
cuando sigue visible, sin recentrar el mapa. Al abrir la ficha, el punto seleccionado se desplaza
al área que queda visible, conservando el zoom. No repetimos el título como dirección cuando
el portal usó el mismo texto en ambos campos. Cambiar de propiedad cancela la lectura anterior;
cambiar la búsqueda o salir del mapa cierra la ficha. El endpoint aplica visibilidad de 10 días,
proyecta sólo campos públicos (también dentro de ofertas), devuelve 404 si ya no coincide y
503 ante un fallo de lectura. Nunca incorpora los registros completos a todos los puntos.

**Fuentes y cobertura** usa `coverage` de la respuesta pública, calculada sobre todas las
propiedades visibles y sus ofertas vigentes, sin los filtros de la búsqueda. Cada propiedad
cuenta una vez por fuente; la suma puede superar el total único. `computedAt` fecha el conteo.
`meta.sources[].listings` conserva otro significado: avisos leídos en el último repaso full/fast,
no inventario acumulado. No se usa como cifra de cobertura. Si falla el cálculo, `coverage` es
`null` y la página indica que no está disponible; cero sólo aparece tras un conteo válido.
Los fallos de lectura de cada fuente se informan aparte, sin prometer avisos guardados inexistentes.

A diferencia de `/api/chairs` —unos cientos de filas que viajan enteras y se filtran en el
navegador—, acá son decenas de miles: **todo** el filtrado, el orden, las facetas y la mediana se
resuelven en Mongo contra los índices compuestos del modelo. Las filas cuyos avisos dejaron de
aparecer se excluyen por `lastSeen` (10 días) aunque el documento siga existiendo.

Las búsquedas con filtro y las páginas 2+ salen `noindex, follow`: las facetas se multiplican en
millones de URLs y cada una es una copia delgada de la misma página.

## Probarlo

### Experiencia de la ficha individual (2026-09-05)

La tarjeta del directorio, el panel del mapa y el comparador de favoritos enlazan a
`/alquileres/[key]`. La ficha se renderiza en el servidor y conserva un enlace de regreso a la
búsqueda mediante `sessionStorage`, validado contra la ruta del directorio y sus filtros conocidos.
Compartir copia una URL canónica sin esos parámetros. Los enlaces a los portales siguen disponibles.

Cada oferta conserva su precio, gastos comunes, anunciante, condiciones y fechas. Cambiar de aviso
actualiza el resumen, el contacto y el planificador sin mezclar alquiler y gastos de portales
distintos. Las portadas se atribuyen a sus fuentes; si una falla se intenta la siguiente. La galería
completa y el contacto pertenecen al portal original. Cuando hay contradicciones detectadas o una
identidad compartida, la ficha lo advierte antes de presentar los datos.

El planificador permite estimar servicios, gastos comunes ausentes, extras de entrada y presupuesto
mensual en pesos. No presupone comisiones ni garantías obligatorias, no trata valores ausentes como
cero y no guarda ni envía lo escrito. La lista para la visita permite marcar lo confirmado y copiar
una consulta para pegar voluntariamente en el contacto del aviso; no envía mensajes. El contacto y
el favorito permanecen visibles al pie en móvil. Hay traducciones de interfaz ES/EN/PT.

Validación local: 5.258 pruebas de app aprobadas y ocho pruebas Mongo opcionales omitidas en la
suite local; los pipelines nuevos además se ejecutaron contra Mongo real sin escrituras. Backend:
1.526 aprobadas, una omitida. Revisión visual/interactiva en Chrome, 320/390/1440 px, claro/oscuro y
tres idiomas: sin desbordamiento ni errores JS. Se probaron números editados, cambio de oferta,
GC desconocidos, todas las fotos caídas, tasa ausente, regreso saneado y acciones táctiles de 44 px.
Las pruebas E2E del directorio incorporan el recorrido hasta la ficha y de vuelta, así como el
presupuesto y el contacto fijo móvil. La comprobación de producción se realiza tras el despliegue.

```bash
npx ts-node scripts/oneoff/rentals_probe.ts   # lectura real: revisar los presupuestos antes de ejecutarlo
npx vitest run tests/rentals/                 # parsers con fixtures + dedupe + retención + store
cd app && npx vitest run tests/unit/rentals.test.ts
```

El probe existente limita InfoCasas y ML a tres páginas por consulta; las nuevas fuentes usan
`RENTALS_CW_MAX_PAGES` y `RENTALS_EP_MAX_PAGES`. Casasweb siempre recorre las combinaciones de
departamento/tipo del barrido completo, aun con una página por combinación. El probe no escribe
en DB; las pruebas con fixtures no realizan peticiones de red.

El build raíz necesita `sheet_key.json`, archivo ignorado y exclusivo del entorno del servidor
que importa `sync_sheet.ts`. Si falta localmente, `npm run build` reporta ese módulo ausente;
no se crean credenciales falsas ni se modifica el build para ocultarlo.

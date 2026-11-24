# Computadoras usadas (`/computadoras-usadas-uruguay`) y precios de componentes (`/precios-componentes-pc-uruguay`)

Las computadoras y piezas usadas que se publican en Facebook Marketplace y Mercado Libre, cada una
con lo que se leyó de ella (procesador, placa de video, RAM, discos, fuente, mother) y lo que cuesta
**armarla hoy** pieza por pieza: el precio nuevo de cada pieza en Uruguay (Mercado Libre y nueve
tiendas de informática) y el precio usado (las piezas sueltas del mismo directorio). Job:
`currency-computadoras` (diaria) y `currency-computadoras-hourly` (`sync_computadoras.ts --fast`).
Diseño: `docs/superpowers/specs/2026-11-23-computadoras-usadas-design.md`.

## Fuentes (medido el 23/11/2026)

| fuente | qué aporta | cómo se lee |
|---|---|---|
| Facebook Marketplace | PCs, notebooks y muchas piezas sueltas usadas | `readMarketplaceSearches` (Chrome del perfil, candado compartido): 22 palabras + «pc gamer» y «notebook» partidas en 5 bandas de precio + la categoría `computers`, desde Montevideo. La horaria lee 6 palabras rotando, por más nuevas. |
| Ficha de Facebook | la descripción (las piezas, casi siempre en líneas rotuladas), `attribute_data` (estado, marca, sistema), la fecha de publicación | `readFacebookPageTexts` sobre `/marketplace/item/<id>/`, 60 por diaria y 40 por horaria a 6 s: primero los candidatos a oportunidad y las máquinas con precio dudoso, después las nunca leídas. Se relee a los 21 días; una que cargó a medias, a los 2. |
| Mercado Libre usados | PCs (MLU1649), notebooks (MLU1652), mini PC (MLU407379), iMac/all-in-one (MLU443594) y piezas usadas | puente `:9656`, `condition=used`, 20 por página, secuencial a 1,5 s. |
| Mercado Libre nuevos | la tabla de precios nuevos | las categorías de pieza (procesador MLU1693, placa MLU1658, RAM MLU1694/MLU3582, discos MLU1672, mother MLU1692, fuente MLU1695, gabinete MLU1696, notebooks MLU1652) + búsquedas puntuales de los procesadores y placas que usa el directorio y la tabla no tiene. |
| Tiendas | precio nuevo de las piezas | WooCommerce Store API con el adaptador de `classes/retail/`: Thot, Tecsys, Zonic, Digital World, Laaca, Lidertek, Aslan, PC Parts, Obsidian. Todas en dólares; el adaptador lee la moneda dibujada y divide por `currency_minor_unit`. |

**Lo que no se puede leer:** la ficha de un usado de Mercado Libre (el puente sólo atiende fichas de
catálogo — `/product/<id>` contesta «listing ids are not supported» — y `articulo.mercadolibre.com.uy`
redirige al login), así que de ML va sólo el título.

**Otros lugares relevados** (23/11/2026): Gallito ya no tiene informática (sólo inmuebles); OLX y
DeRemate cerraron; Locanto y Evisos casi no tienen avisos; r/UruguayMarketplace trae unos cinco por
semana (candidato para una v2, por la API oficial o Arctic Shift). De veinte tiendas de componentes,
once quedaron afuera por plataforma (nopCommerce, Sublime, Nibiru, Wix, Fenicio con diez piezas).

## Lectura de especificaciones (`classes/computadoras/specs.ts`, `cpu.ts`, `gpu.ts`)

Precisión sobre recall, con todos los casos medidos en `tests/computadoras/`:

- **Tipo**: la categoría de ML manda; en Facebook, palabras del título (la descripción sólo si el
  título no dice nada). Se rechazan accesorios («Cargador Laptop Toshiba»), televisores, consolas,
  monitores (pulgadas + Hz sin palabras de PC) y avisos de muchos equipos («DESDE $20000», «lote»).
  «Portátil» no cuenta como notebook: «PC de torre … por una CONSOLA PORTÁTIL».
- **Procesador**: modelo exacto → identidad (`cpu:i5-12400f`) con generación, socket, tipo de RAM,
  si es de notebook y año aproximado de la SERIE. «i7» sin número es una familia y no se valúa como
  ningún i7. Generación de texto («10ma gen», «12agen16gb»), pero «2da» suelto es «segunda mano».
- **Placa de video**: «2070rtx», «Nvidia 4070ti», «1060 6gb» y «Amd 9070» (sólo números que no son
  también Ryzen). La VRAM pegada no es RAM si sigue «ram»/«ddr4», y más de 16 GB sólo en x90/7900.
  Una dedicada de notebook no tiene identidad: no se vende suelta.
- **RAM y discos**: se leen sobre el texto sin la placa (blanqueada con `#`, que ningún `\s*` cruza).
  «32gb 1tb ssd»: el ssd es del 1tb. Un terabyte se escribe con su unidad («Vega 11 … Ssd» no son
  11 TB) y «M2 2022» es el chip y el año. Los discos se leen en los dos órdenes (número→palabra y
  palabra→número) y gana la lectura con menos discos sin tipo.
- **Fallas declaradas** (no enciende, no da video, para repuesto, pantalla, teclado, batería,
  bloqueada, sin disco, sin cargador): del texto del vendedor, con «sin fallas» y «no tiene fallas»
  como negación.

## Precios por pieza (`classes/computadoras/parts.ts`)

Identidades: `cpu:<modelo>`, `gpu:<modelo>[-<vram>gb]` + la base sin VRAM para los modelos que se
venden con dos memorias, `ram:<ddr>[-sodimm]:<gb>`, `storage:<nvme|ssd|hdd>:<tramo>`,
`motherboard:<chipset>` y `motherboard:socket-<socket>`, `psu:<tramo de watts>`, `case:basico`.

- **Nuevo**: mediana de las ofertas de ML y tiendas que leen EXACTAMENTE esa pieza, con ≥ 3 ofertas
  de ≥ 2 vendedores, una por vendedor y título. Si la lectura de piezas nuevas falla, se conserva la
  anterior.
- **Usado**: las piezas sueltas del directorio de los últimos 30 días, sin fallas, ≥ 3 avisos. Una
  pieza de Facebook a menos de $ 6.000 que la tarjeta dice en pesos no entra (puede ser en dólares).
- Fuera de [mediana/3, mediana×3] contra su propia identidad no es esa pieza.
- Historial diario de las dos medianas (120 días).

## Lo que cuesta armarla (`classes/computadoras/valuation.ts`)

PC de escritorio: procesador, placa (si es dedicada, o «no declarada» si el procesador no tiene
gráficos), RAM, cada disco, mother, fuente y gabinete. Mother (por socket), fuente (por la placa) y
gabinete casi nunca se declaran: van **supuestos**, al cuartil bajo de las nuevas, y la página lo dice.

- `newTotalUsd` y `usedTotalUsd` sólo si TODAS las piezas tienen precio; si no, el parcial y lo que
  falta. Una pieza supuesta sin precio usado entra al total usado al nuevo más barato
  (`usedFromNew`); una declarada sin precio usado deja el total usado sin calcular.
- Veredicto (`muy-por-debajo` < 60 %, `por-debajo` < 90 %, `parejo` hasta 110 %, `por-encima`)
  **sólo contra usados**: el total de sus piezas usadas o, sin ese total, la mediana de las PCs
  iguales del directorio (`reference: "comparables"`, ≥ 4 avisos con el mismo procesador y la misma
  placa, o «sin placa dedicada declarada»). Contra el total NUEVO se publica el porcentaje y no un
  veredicto: medido en la primera corrida, 20 de los 27 «muy por debajo» eran piezas usadas
  comparadas contra la misma nueva, que es lo normal de un usado. Una cohorte de sólo procesador
  mezclaba una PC de oficina con una gamer y no se usa. Nunca con moneda deducida ni con una falla.
- Notebooks, all-in-one y mini PC no se arman: comparables (mismo procesador exacto y RAM, o familia
  + generación + RAM; nunca una familia sin generación) con ≥ 4 avisos, y la notebook nueva con el
  mismo procesador en ML (≥ 3 ofertas, 2 vendedores).
- Pieza suelta: contra su misma identidad usada; la nueva se muestra al lado.

## Línea de notebook y cohortes (`classes/computadoras/notebook.ts`, 24/11/2026)

La mitad de los títulos de notebook no dice el procesador (492 de 1.108) pero el 70 % dice la
línea. `readNotebookLine` lee `line` (`macbook-air`, `thinkpad`, `ideapad`…), `lineLabel`, `model`
(«T490», «3», «E5530»; también «Lenovo T480» y «Asus X515» sin la palabra de la línea) y, en los
Mac, `modelYear` (el año del título; la resolución «2560 x 1600» y el «A2179» no son un año).

Una línea SIN procesador ni año no es una cohorte: «IdeaPad 3» va de US$ 119 a US$ 1.100. Las
cohortes de notebook, de la más estrecha a la más ancha (≥ 4 avisos, sin fallas ni moneda deducida):

1. procesador exacto + RAM, 2. procesador exacto — en un Mac, **dentro de su línea** («Apple M1»
   junta una Air de US$ 799 con una Pro de US$ 900);
3. Mac sin chip: línea + año del título («MacBook Air de 2015»);
4. línea + modelo + familia del procesador («ThinkPad T490 con Intel Core i5»);
5. familia + generación + RAM.

Las dos primeras son `strict` (sostienen una oportunidad sólida). Cada tipo de máquina con los
suyos: un Mac mini M1 y un iMac M1 comparten chip y nada más, y juntos hacían del Mac mini una
«oportunidad».

## Oportunidades (`classes/computadoras/opportunity.ts`, `/oportunidades-computadoras-usadas-uruguay`)

Un aviso lleva `opportunity` si pide entre el **45 % y el 85 %** de su referencia y además: sin
fallas declaradas, sin moneda deducida, visto ayer u hoy, precio ≥ US$ 40, y — si es de Facebook —
con la ficha leída (la descripción es donde el vendedor dice lo que falla; la horaria lee primero
la ficha de los que serían oportunidad si la tuvieran, `loadOpportunityCandidates`). Por debajo del
45 % queda afuera: a ese precio un error de moneda, una falla callada o una estafa son más
probables que una ganga.

| referencia | `reference` | sólida si |
|---|---|---|
| PC: la suma de sus piezas con precio usado REAL | `used` | siempre (≥ 2 piezas declaradas) |
| máquina: la mediana de sus iguales | `comparables` | cohorte `strict` y ≥ 6 avisos |
| pieza suelta: la mediana usada de la misma pieza | `part` | ≥ 5 avisos |

**Por qué la PC no usa el total usado de la valuación**: ese total cuenta mother, fuente y gabinete
supuestos a precio NUEVO (cota de arriba) y contra él cualquier PC parece barata. La oportunidad
usa la cota de abajo — sólo las piezas con precio usado real — y la etiqueta lo dice («sin contar
mother, fuente ni gabinete»). Tope de 3 por vendedor de ML con nombre; los particulares llegan sin
id (`ml:unknown`, 1.778 de 1.784 usados) y no cuentan como un vendedor. Medido sobre la corrida del
24/11/2026: 60 oportunidades (20 sólidas) de 2.154 avisos.

## Precios de notebooks (`classes/computadoras/report.ts`, `/precios-notebooks-usadas-uruguay`)

Un documento (`computermetas`, `uy-computadoras-notebooks`) armado del catálogo ya publicado:
seis números, franjas de precio, marca, familia de procesador, generación (i5/i7), la escalera de
MacBook (por año del título en los Intel y por chip en los M), RAM, placas dedicadas, modelos con
más oferta, la usada contra la nueva (misma clave que la referencia nueva: procesador, y línea en
Mac) y qué se consigue con cada presupuesto. Muestra mínima 8, y 5 en las celdas de escalera y de
generación. Sin fallas ni moneda deducida; medianas y cuartiles, nunca promedios. Son precios
PEDIDOS, no ventas. Las referencias de notebook nueva vencen a los 14 días.

## Moneda de Facebook (`classes/computadoras/currency.ts`)

La tarjeta dice UYU por defecto. Dólares si el texto lo dice («(USD)», «US$ 1.350» con el mismo
número) o si sólo cierra en dólares: ≤ $ 6.000, en pesos menos de un quinto de su referencia y en
dólares entre 0,3 y 2,5 veces. Lo deducido se marca `currencyInferred` y queda fuera de veredictos y
comparables.

Sin referencia no se deduce nada, y eso tiene un caso que no se puede publicar: «Rtx 3090 24gb evga
ftw3 — $ 825» sería una 3090 a US$ 20 encabezando «las más baratas». Un aviso de Facebook en pesos de
$ 6.000 o menos, sin referencia, con piezas modernas (placa dedicada de 2016 en adelante, procesador
de 2017 en adelante o un Apple M) y que en pesos valdría menos de US$ 80, no se publica. Uno sin
piezas que lo contradigan («Laptop dell $ 1000») sí, en pesos. Tampoco entran los precios de relleno
(123456, 111111, 1234; los nueves sí, «$ 9.999» es un precio).

### Un precio dudoso espera su ficha (24/11/2026)

La primera corrida de producción leyó **4.991 tarjetas** de Marketplace (las pruebas, con Facebook
frenado, habían leído 550) y mostró lo que la muestra chica no: Facebook **nunca** informa dólares en
la tarjeta (0 de 4.991) y había 424 máquinas sin falla entre $ 628 y $ 3.000. Mezcladas: dólares
evidentes («Macbook Pro 14" M3 Pro — $ 1.610»), pesos evidentes («Torre de pc retro Pentium III —
$ 1.000») y dudosos («Pc Gamer — $ 1.300»). Ordenado por precio, el directorio abría con una
«Laptop Gamer Dell G5 Ryzen 7 RX5600M» a US$ 16.

La descripción lo resuelve casi siempre (trae las piezas, y de ahí sale la referencia), así que
`waitsForDetail` no publica una máquina de Facebook de hasta `HOLD_MAX_UYU` ($ 3.000) hasta leer su
ficha. No espera si el título dice «dólares», si declara una falla (un equipo roto sí vale $ 1.000) o
si sus piezas ya dieron una referencia. Esas fichas van primero en la cola, junto con las de los
candidatos a oportunidad, y el presupuesto subió a 40 fichas por hora y 60 en la diaria (como
`currency-rentals-detail`). Con la ficha leída y sin nada que lo contradiga, el número va en pesos.
`meta.counts.heldForDetail` dice cuántas esperan (313 en el volcado de esa corrida).

Las otras guardas de precio que salieron de la misma corrida: una pieza a menos del 15 % de la
mediana usada de su identidad (≥ 3) o a más del doble de la nueva no es un precio («GTX 1650 —
$ 1.000», «RTX 5080 — $ 186.497»); una máquina a más de 5 veces la mediana de sus iguales tampoco; y
los rellenos con un dígito repetido en cualquier parte (188888).

Y de clasificación: la pieza que ABRE el título es lo que se vende aunque nombre la máquina a la que
va («Memoria notebook 8gb ddr4», «Disco Duro Interno … (Notebook / PS4 / PC)»); muebles y audio
(«Mesa escritorio computadora», «Parlante Gamer … Pc»); la caja vacía («Caja de tarjeta gráfica»);
el «all in one» de otros rubros («Pioneer DJ … All-in-One»); el despiece («Carcasa Y Partes»);
varios equipos dichos con palabras («Dos notebook Lenovo»); y el título que llega con `+` por
espacios («Computadora+para+respuesto+»).

## Corridas y guardas

- Diaria 17:17 UTC, horaria :03. Candado propio (`cambio-computadoras.lock` en el tmp): la horaria
  se saltea si la diaria corre; la diaria espera hasta 20 minutos.
- Sin cotización del dólar no corre. Facebook ocupado o sin sesión conserva lo anterior.
- Un aviso se publica mientras se lo haya visto en los últimos 4 días (`COMPUTER_FRESH_DAYS`); la
  horaria nunca retira por ausencia. Lo crudo se borra a los 60 días.
- Una corrida que publicaría menos del 40 % de lo publicado (con ≥ 50 publicados) no pisa nada y
  sale con 1.
- `--dry-run [--json=<archivo>]` no escribe; el archivo `{ meta, items, parts }` lo lee el app en dev
  con `COMPUTADORAS_PREVIEW_FILE`. `--dump=<archivo>` guarda además todo lo leído (crudo, fichas,
  ofertas nuevas) y `--replay=<archivo> --json=<salida>` rearma catálogo y tabla desde eso en
  segundos, sin red ni base: así se prueba un cambio del lector contra una corrida real.
- `COMPUTADORAS_FB_ENABLED=0` / `COMPUTADORAS_STORES_ENABLED=0` apagan una fuente.

## Datos (APP DB)

`computerlistings` y `computerfbdetails` (privadas: lo crudo y las fichas, con la descripción),
`computercatalog` (pública, una fila por aviso, sin descripción ni vendedor), `computerparts`
(pública, una fila por pieza), `computermetas` (`uy-computadoras` la corrida, `uy-computadoras-refs`
las notebooks nuevas de referencia, `uy-computadoras-refusal` la última negativa).

## Lo que queda

- Puntajes de rendimiento: PassMark prohíbe copiar; Blender Open Data se declara libre de derechos y
  es el candidato para ordenar procesadores y placas por rendimiento.
- r/UruguayMarketplace como fuente; las tiendas que no son WooCommerce (Banifox, Infinit, PC Store…).

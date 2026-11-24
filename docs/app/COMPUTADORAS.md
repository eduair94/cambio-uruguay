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
| Ficha de Facebook | la descripción (las piezas, casi siempre en líneas rotuladas), `attribute_data` (estado, marca, sistema), la fecha de publicación | `readFacebookPageTexts` sobre `/marketplace/item/<id>/`, 45 por diaria y 20 por horaria a 6 s, primero las nunca leídas. Se relee a los 21 días; una que cargó a medias, a los 2. |
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

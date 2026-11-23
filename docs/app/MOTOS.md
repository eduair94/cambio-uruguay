# Motos usadas (`/motos-usadas-uruguay`)

Cuánto sale una moto usada en Uruguay, por modelo y por año, con banda de precio en vez de un solo
número. Diseño: `docs/superpowers/specs/2026-09-22-motos-usadas-directorio-design.md` (era el plan
**E2** del plan padre `docs/seo/2026-09-16-directorios-de-producto-plan.md`, postergado hasta que
celulares llegara a `main`).

## Por qué existe

La moto es el vehículo de trabajo en Uruguay: el parque activo del MIEM cuenta 490.340 birrodados
contra 633.923 automóviles (2025), y viene creciendo por tercer año seguido. Es la alternativa de
costo medio entre el boleto y el auto, y el sitio tenía el agujero justo ahí: publicaba precios de
autos usados, de monopatines y de bicicletas eléctricas, y ninguno de motos.

Además es el insumo que le faltaba a `/conviene-auto-moto-o-omnibus-uruguay`: sin catálogo de motos,
el comparador de transporte no podía contestar el modo que más se consulta.

## Reusa la maquinaria de autos, no la copia

| pieza | qué pasa |
|---|---|
| puente de MercadoLibre (`:9656`) | el mismo cliente, la misma secuencialidad de 1,5 s, la misma categoría-a-marca-a-modelo; cambia `MLU1744` por **`MLU1763`** |
| `classes/autos/normalize.ts` | se importa tal cual: las trampas de moneda son las mismas (incluido el `u$u` que se leía como pesos) |
| `classes/autos/priceSanity.ts` | misma cascada de cohortes, **pisos propios**: una moto de US$ 400 puede ser real y un auto no |
| `depreciationOf` / `annualDropOf` de `classes/autos/report.ts` | **compartidas**: su firma se ensanchó de `CarListing[]` a `{ year, priceUsd }[]`, que es un widening y no rompió ningún llamador |
| carrocería (`bodyType.ts`) | no aplica; su equivalente es el **tipo de moto** (calle, scooter, trail, custom, deportiva, cub) |

## La cilindrada: la cascada (desde el 23/11/2026)

La cilindrada es la dimensión que autos no tiene y que acá decide la cohorte: una Yumbo 125 y una
Yumbo 200 no son la misma moto ni el mismo precio.

Hasta el 23/11/2026 salía SÓLO del título con la unidad escrita, y eso cubría el 10 % del catálogo
(57 de 590). Ese día se midió la ficha propia del aviso (`moto.mercadolibre.com.uy/MLU-…`, la misma
que autos lee para la versión): contesta 200 con la UA del bot y trae la fila «Cilindrada» en 19 de
21 fichas. Desde entonces `currency-motos-detail` la lee (ver abajo) y `classes/motos/displacement.ts`
aplica la misma cascada que la carrocería de autos:

| orden | evidencia | base | se imprime |
|---|---|---|---|
| 1 | fila «Cilindrada» de la ficha propia | `ficha` | `150 cc` |
| 2 | el título, con la unidad escrita | `title` | `150 cc` |
| 3 | consenso de los avisos del mismo modelo | `model` | `≈ 150 cc` |
| 4 | número del nombre del modelo de ML («GTR 125») | `model-name` | `≈ 125 cc` |

- **Votan sólo ficha y título.** Si votaran las estimaciones, el modelo se enseñaría a sí mismo lo que
  ya adivinó — la regla del diccionario de carrocerías.
- **Consenso** = ≥ 3 votos y ≥ 80 % a ±10 % de la mediana; es más laxo que la carrocería (8 y 90 %)
  porque el catálogo es ~35 veces más chico y "124" y "125" concuerdan.
- **El tramo de la faceta de ML veta**: la ficha la carga el vendedor y se equivoca (una Bajaj Pulsar
  de la muestra dice «2.000 cc» con el tramo «126 a 250 cc»). Con 10 % de tolerancia en el borde,
  porque los tramos de ML se solapan en 125 y 250.
- **Una ficha que contradice un consenso fuerte** (≥ 4 votos, a más de 30 %) es un tipeo: manda el
  consenso.
- **El nombre del modelo** es la evidencia más floja ("Svartpilen 401" tiene 373 cc): ubica a la moto
  en su tramo, no afirma el número. Calla si los avisos reales del modelo dicen otra cosa, y debajo de
  50 no es una cilindrada ("MT 03", "FZ25").
- **Las estadísticas no usan estimaciones**: las bandas por cilindrada de la ficha del modelo y la
  `productKey` cuentan sólo `ficha`/`title` (`exactDisplacement`).
- El tramo publicado es el de la faceta o, si no, el de la cilindrada (cualquier base, con esa base):
  así el filtro por tramo cubre todo lo que tiene alguna cilindrada.

## La ficha del aviso (`currency-motos-detail`)

`sync_motos_detail.ts`, a los :51 de cada hora: 120 fichas a 2 s, primero las nunca leídas (las vistas
más recientemente arriba) y después las de más de 30 días. Guarda en `motolistings.detail` la tabla
cruda, la descripción, la galería (hasta 8 fotos), la cilindrada, el color y el tipo. **Toda lectura
deja rastro**: una falla anota `detailError` y espera un día, un 404/410 anota `detailGoneAt` y espera
una semana — la cola de Casasweb se trabó por no hacerlo. No publica: lo toma la próxima corrida de
`sync_motos.ts`.

Lo que la ficha agrega al directorio: galería, color, tipo cuando la faceta falta, una ficha técnica
curada (tiempos, frenos, transmisión, velocidades, potencia —sólo hp/cv/kW plausibles: medido «636 hp»
en una Ninja 636—, único dueño, permuta, precio negociable) y **lo que el vendedor declara en la
descripción** (`declaredRisks` de autos: deuda, papeles, choque, recupero, mecánica), con su cita. Un
riesgo de severidad alta saca a la moto de las bandas. Una ficha de cuatriciclo/triciclo/motocarro
saca al aviso, y una ficha inactiva leída DESPUÉS de la última aparición en la búsqueda también.

## Facebook Marketplace (desde el 23/11/2026)

La segunda fuente, y no le pide nada nuevo a Facebook: el lector de autos ya recorre la categoría
«Vehículos» de Marketplace —que incluye motos— y guarda TODAS las tarjetas en `carfbcards`, aunque
sólo las que son autos pasen a su directorio. Medido ese día: 23.767 tarjetas en cuatro días y ~1.100
con pinta de moto. `classes/motos/sources/facebook.ts` las convierte con las reglas de la tarjeta de
Facebook de autos y otro diccionario:

- **Marca + modelo contra los avisos de Mercado Libre de 180 días**, nunca la marca sola ("Honda" es
  también un auto). Un modelo se nombra entero o por su parte de letras cuando es única en la marca
  ("gtr"), salvo que sea una palabra del idioma ("Suzuki EN 125" acortado a "en" se quedaba con
  "Suzuki Vitara … en excelente estado") o que venga seguida de OTRO número ("zr200" no es la ZR 125).
- **Un auto de una marca que hace motos** se descarta por sus palabras (camioneta, 1.6, automático…).
- **Quien permuta POR una moto o la busca** no la vende ("Permuto por zanella").
- **Año obligatorio** (título o descripción): sin año no hay cohorte.
- **Moneda**: la que el texto declara o, si no, la que hace caer el monto entre 0,4 y 2,5 veces la
  mediana de ML de la misma moto. Deducida = `currencyInferred`, «moneda estimada» en la página y
  NUNCA en una banda. Sin referencia o con un monto que no cierra en ninguna, el aviso no entra.

Primera medición sobre el volcado (diccionario de 590 avisos): 34 motos aceptadas, todas motos de
verdad. La cuenta crece con el diccionario de producción, que tiene más modelos. Las motos de
Marketplace se guardan en `motolistings` con clave `fb-<id>` (historia de precio y ficha propia) y
salen solas a los cuatro días de que el lector de autos deje de ver la tarjeta. `MOTOS_FACEBOOK_ENABLED=0`
las apaga.

## Qué queda afuera

- **Cuatriciclos, triciclos y motocarros**: otro vehículo, otra norma.
- **Repuestos, cascos, cubiertas y accesorios.**
- **Alquiler de motos para delivery**, que publica un precio mensual y no un precio de venta.
- **Un precio que no puede ser el de esa moto** se retira antes del análisis; no se corrige.
- **Motos eléctricas**: entran, marcadas (`fuel: 'electrica'`), y **nunca se promedian** con las de
  nafta en la misma banda — son dos mercados con dos costos de uso distintos.

## Qué NO publica (todavía)

- **Oportunidades.** La regla que hace válida una "ganga" en autos es una cohorte fija de
  modelo+año+versión+motor+caja; sin ese equivalente medido en motos, declarar una ganga repetiría el
  error que autos ya cometió y corrigió (125 "gangas" que eran otra versión o un 4x2).
- **Teléfonos de vendedores.** La base de contactos de autos tiene su propia política y su propia
  página (`docs/app/AUTOS_CONTACTOS.md`); este directorio no la hereda.
- **Nada que esté detrás de login o captcha**: ni el "Ver teléfono" de ML ni nada de Facebook.

## Colecciones y jobs

| colección (APP DB) | qué |
|---|---|
| `motolistings` | privada, un documento por aviso, con su historial de precio |
| `motocatalog` | pública, una fila por modelo(-año) con banda p25/mediana/p75 |
| `motocatalogmetas` | la corrida (`uy-motos`): cuántos avisos, qué fuentes, cuándo |
| `motomarketsnapshots` | el informe: composición, depreciación por modelo, automotora vs particular |

| app pm2 | cron UTC | qué |
|---|---|---|
| `currency-motos` | `38 13 * * *` | barrido completo |
| `currency-motos-hourly` | `44 * * * *` | sólo precio; nunca retira por ausencia |
| `currency-motos-detail` | `51 * * * *` | la ficha propia de cada aviso (ver arriba) |

`:44` está libre en la hora y queda a siete minutos de celulares (`:37`) y de alquileres (`:47`), los
dos consumidores vecinos del mismo puente de MercadoLibre. La diaria a las 13:38 cae después de
combustibles (13:11) y antes de movilidad (15:33) y del comparador de transporte (16:39), que la lee.

## Guardas

- Corrida flaca: menos del 40 % de lo guardado con precio no pisa el catálogo anterior.
- Una fuente caída degrada la corrida, no la falla.
- Sin `APP_MONGO_URI` se niega a correr; `--dry-run` funciona sin Mongo.
- `MOTOS_<FUENTE>_ENABLED=0` apaga una fuente sin desplegar.

## La página (desde el 23/11/2026)

El directorio tiene la forma del de autos: columna de filtros (cajón en el celular), barra de orden,
chips, tarjetas con foto y scroll infinito. Filtros: texto, marca, modelo, tipo, cilindrada (tramo y
rango en cc), año, precio mínimo y máximo en dólares, km, departamento, motor, vendedor, color,
publicado hace N días, bajó de precio, sin deuda ni choque declarados y único dueño. Las claves de URL
de v1 no cambiaron (las alertas guardadas las usan).

Cada aviso tiene su ficha en `/motos-usadas-uruguay/aviso/<key>` (`noindex`, como la de autos):
galería, datos con la base de la cilindrada, ficha técnica declarada, lo que declara el vendedor,
cómo cambió su precio, cómo está contra la misma moto (modelo+año y modelo) y otras parecidas. La
ficha por MODELO sigue en `/motos-usadas-uruguay/<slug>`. Hay comparador de hasta cuatro avisos en
`/motos-usadas-uruguay/comparar`.

## Quién lo lee

- `/motos-usadas-uruguay`, la ficha por modelo, la ficha por aviso y el comparador.
- `classes/transporte/prices.ts`, que toma el p25 del catálogo como "precio de entrada" del modo
  `moto` del comparador y mide la depreciación con la recta compartida. El contrato es el documento
  `uy-motos` de `motocatalogmetas` y los campos `price`/`currency`/`currencyInferred`/`year` de
  `motocatalog`: cambiarles el nombre rompe el comparador sin romper esta página.

# Directorio de motos usadas — diseño

**Fecha:** 2026-09-22
**Ruta:** `/motos-usadas-uruguay` (+ ficha por modelo)
**Sub-proyecto hermano:** `2026-09-22-comparador-transporte-design.md`, que consume este catálogo
como el modo `moto`. Se construyen en paralelo: el comparador declara el modo desde el día uno y
muestra "sin datos relevados" hasta que este job publique.

Era el plan **E2** del plan padre `docs/seo/2026-09-16-directorios-de-producto-plan.md`, postergado
hasta que celulares llegara a `main`. Llegó.

## Por qué existe

En Uruguay la moto es el vehículo de trabajo: es la alternativa de costo medio entre el boleto y el
auto, y la que más se compra usada. El sitio publica precios de autos usados, de monopatines y de
bicicletas eléctricas, y justo en el medio tiene un agujero. Sin este catálogo el comparador de
transporte no puede contestar la pregunta que más se hace.

## Qué publica

1. **Directorio** `/motos-usadas-uruguay`: una fila por **modelo-año**, con banda de precio
   (p25/mediana/p75), cantidad de avisos y filtros por marca, cilindrada, año, precio y departamento.
2. **Ficha** `/motos-usadas-uruguay/<marca>-<modelo>`: la banda por año, la depreciación medida, los
   avisos vigentes y el bloque de cambios de precio que el resto del sitio ya sabe adjuntar.
3. **Insumo** para el comparador: precio de entrada por cilindrada y depreciación anual por modelo.

## Qué NO publica

- **No publica oportunidades ni gangas en v1.** La regla de autos —cohorte fija de
  modelo+año+versión+motor+caja— no tiene equivalente medido en motos; declarar una ganga sin esa
  cohorte es exactamente el error que autos ya cometió y corrigió (125 "gangas" que eran otra
  versión). Queda para cuando haya avisos suficientes para medirlo.
- **No publica teléfonos.** La base de contactos de autos tiene su propia política y su propia página
  (`docs/app/AUTOS_CONTACTOS.md`); este directorio no la hereda hasta que se decida aparte.
- **No toma nada que esté detrás de login o captcha** (el "Ver teléfono" de ML, la sesión de Facebook).

## Arquitectura: reusar, no bifurcar

`classes/autos/` ya tiene la maquinaria; lo específico de autos es el vocabulario, no las cañerías.

| pieza de autos | qué pasa con motos |
|---|---|
| puente MercadoLibre (`:9656`), secuencial con 1,5 s | **reusar tal cual**, cambiando `MLU1744` → `MLU1763` |
| `normalize.ts` (moneda, km, año) | **reusar**; el `u$u` y el resto de las trampas de moneda son las mismas |
| `priceSanity.ts` (cascada de cohortes) | **parametrizar**: mismos escalones, otros pisos absolutos (una moto de US$ 400 puede ser real) |
| `catalog/` (diccionario de ids de ML) | **propio**: marcas y modelos de moto, con cilindrada como dimensión |
| `report.ts` `depreciationOf`/`annualDropOf` | **generalizar la firma** a `{year, priceUsd}[]` — widening seguro, autos sigue compilando |
| `bodyType.ts` (carrocería) | **no aplica**; su equivalente es el **tipo de moto** (calle, scooter, trail/enduro, custom, deportiva, cub) |
| fuentes web (Fenicio, Woo, WordPress) | **reusar el lector**, con su propia lista de tiendas de moto |
| Facebook Marketplace | **reusar**; misma sesión, mismo tope diario |
| `risk.ts` (declarado por el vendedor) | **fuera de v1** |

**La dimensión que autos no tiene: la cilindrada.** Una Yumbo 125 y una Yumbo 200 no son la misma
moto ni el mismo precio, y el título casi siempre la dice. Sale del título con una expresión explícita
(`\b(50|70|90|110|125|150|170|200|250|300|…)\s?cc?\b` y las formas `125cc`, `125 c.c.`), nunca
inferida del modelo: si no está, la fila queda en `cilindrada: null` y no entra en ninguna cohorte de
cilindrada — precisión sobre recall, la misma regla que celulares.

## Identidad

`marca|modelo|cilindrada` como clave de producto, `+año` como cohorte de precio. Igual que autos, un
aviso que no es de ML se identifica contra el diccionario propio para caer en la misma cohorte. Un
mismo aviso en varias fuentes queda una vez, con la precedencia ML > webs > FB.

## Lo que se excluye del catálogo

- **Cuatriciclos, triciclos y utilitarios de tres ruedas**: otro vehículo, otra norma.
- **Motos eléctricas**: entran, pero marcadas (`fuel: 'electrica'`), porque su costo de uso es otro y
  el comparador las trata distinto. Nunca se promedian con las de nafta en la misma banda.
- **Repuestos, cascos, accesorios, cubiertas**: la misma familia de exclusiones que movilidad.
- **Avisos de alquiler de motos** (delivery), que publican un precio mensual y no un precio de venta.
- **Un precio que no puede ser el de esa moto** se retira antes del análisis, no se corrige.

## Colecciones (APP DB)

| colección | qué |
|---|---|
| `motolistings` | privada: un documento por aviso, con `priceHistory` |
| `motocatalog` | pública: una fila por modelo(-año) con banda y avisos proyectados |
| `motocatalogmetas` | la corrida: cuántos avisos, qué fuentes, cuándo |
| `motomarketsnapshots` | el informe: composición, depreciación por modelo, automotora vs particular |
| `pricewatchoffers` | vertical `motos`, compartida (`docs/app/PRICEWATCH.md`) |

## Jobs

| app pm2 | script | cron UTC | qué |
|---|---|---|---|
| `currency-motos` | `dist/sync_motos.js` | `38 13 * * *` | barrido completo: ML + webs + FB |
| `currency-motos-hourly` | `dist/sync_motos.js --fast` | `44 * * * *` | sólo precio de ML; nunca retira por ausencia |

Minutos elegidos contra el mapa de `ecosystem.config.js`: `:44` está libre en la hora y queda a 7
minutos de celulares (`:37`) y de alquileres (`:47`), los dos consumidores vecinos del mismo puente de
MercadoLibre. La diaria a las 13:38 cae después de combustibles (13:11) y antes de movilidad (15:33)
y del comparador (16:39), que la lee.

Alta en `OTHER_APPS` de `scripts/deploy-backend.sh` en el mismo commit; si no, el app nunca arranca en
el VPS.

## Guardas

- Corrida flaca: menos del 40 % de lo guardado con precio no pisa el catálogo anterior.
- Una fuente caída degrada la corrida, no la falla.
- Sin `APP_MONGO_URI`, se niega a correr (salvo `--dry-run`, que además funciona sin Mongo).
- `AUTOS_*_ENABLED`-style: `MOTOS_<FUENTE>_ENABLED=0` apaga una fuente sin desplegar.

## Tests

- `tests/motos/identify.test.ts` — cilindrada del título, marca/modelo, lo que se excluye.
- `tests/motos/priceSanity.test.ts` — los pisos propios; que una moto barata real sobreviva.
- `tests/motos/catalog.test.ts` — bandas, cohortes, dedup entre fuentes.
- `tests/motos/report.test.ts` — depreciación con la función compartida.
- `tests/motos/store.test.ts` — guarda de corrida flaca.
- `app/tests/unit/motos*.test.ts` — proyección pública, filtros, la ficha.

## SEO

Fila propia en `docs/seo/experiments.json`. Enlaces desde `/autos-usados-uruguay`,
`/directorios-uruguay`, el comparador y `/multas-de-transito-y-patente-uruguay`.

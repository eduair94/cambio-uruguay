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

## La cilindrada, y cuánto cuesta medirla bien

La cilindrada es la dimensión que autos no tiene y que acá decide la cohorte: una Yumbo 125 y una
Yumbo 200 no son la misma moto ni el mismo precio.

**No sale de la faceta de MercadoLibre.** Medido el 22/9/2026, `ENGINE_DISPLACEMENT` devuelve tres
tramos y no un número — `(*-125cc]` con 434 avisos, `[125cc-250cc]` con 568 y `[250cc-*)` con 633 —,
que es exactamente la resolución que no sirve para separar una 125 de una 200.

Sale del título, **con la unidad escrita** (`125cc`, `125 cc`, `125 c.c.`, `125 cm3`) y nunca de un
número suelto: "Kawasaki Z900" y "Benda Dark Flag 500" nombran la cilindrada dentro del modelo, y
leerla de ahí haría pasar por medición una coincidencia de nombre. Lo que no la declara queda con
`displacement: null` y no entra en ninguna cohorte de cilindrada — precisión sobre recall, la misma
regla que celulares.

**El costo de esa exigencia es alto y está medido**: en la corrida de prueba del 22/9/2026, de 73
avisos publicables **71 quedaron sin cilindrada**. O sea que hoy la cilindrada es un dato de unas
pocas filas, no una dimensión con la que se pueda filtrar el directorio entero, y la página no puede
prometer lo contrario. La salida no es aflojar el filtro —leer "900" de "Z900" devolvería cobertura
inventada— sino ir a buscar el dato donde sí está: la ficha de cada aviso de MercadoLibre publica
`ENGINE_DISPLACEMENT` como atributo con su valor exacto, mientras que la faceta del listado sólo
devuelve tres tramos (`(*-125cc]`, `[125cc-250cc]`, `[250cc-*)`). Queda pendiente una pasada por
ficha, con presupuesto, como la que ya hace `currency-autos-detail`.

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

`:44` está libre en la hora y queda a siete minutos de celulares (`:37`) y de alquileres (`:47`), los
dos consumidores vecinos del mismo puente de MercadoLibre. La diaria a las 13:38 cae después de
combustibles (13:11) y antes de movilidad (15:33) y del comparador de transporte (16:39), que la lee.

## Guardas

- Corrida flaca: menos del 40 % de lo guardado con precio no pisa el catálogo anterior.
- Una fuente caída degrada la corrida, no la falla.
- Sin `APP_MONGO_URI` se niega a correr; `--dry-run` funciona sin Mongo.
- `MOTOS_<FUENTE>_ENABLED=0` apaga una fuente sin desplegar.

## Quién lo lee

- `/motos-usadas-uruguay` y la ficha por modelo.
- `classes/transporte/prices.ts`, que toma el p25 del catálogo como "precio de entrada" del modo
  `moto` del comparador y mide la depreciación con la recta compartida. El contrato es el documento
  `uy-motos` de `motocatalogmetas` y los campos `price`/`currency`/`currencyInferred`/`year` de
  `motocatalog`: cambiarles el nombre rompe el comparador sin romper esta página.

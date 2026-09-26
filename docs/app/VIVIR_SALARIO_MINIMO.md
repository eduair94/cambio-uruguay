# /vivir-con-el-salario-minimo-uruguay

Las formas en que el líquido del salario mínimo cubre un mes austero, y los avisos vigentes del
directorio de alquileres que entran en cada una. Complementa `/vivir-con-25000-pesos-uruguay`, que
contesta «¿alcanza?» con promedios del INE y concluye que solo, alquilando al promedio, no. Ésta
contesta la otra pregunta —¿de qué forma sí?— con los avisos de hoy.

Spec y plan: `docs/superpowers/specs/2026-09-26-vivir-con-salario-minimo-design.md` y
`docs/superpowers/plans/2026-09-26-vivir-con-salario-minimo.md`.

## Piezas

| pieza | archivo | qué hace |
|---|---|---|
| cuenta pura | `app/utils/minimumWage.ts` | techo de vivienda por forma y región, veredicto de un aviso, puertas de garantía, forma de la query |
| textos | `app/utils/minimumWageCopy.ts` | palancas, garantías, FAQ y fuentes; toda cifra sale de la cuenta |
| filas | `app/server/utils/minimumWageRentals.ts` | casas/aptos + habitaciones vigentes, marcas del texto propio, guarda de plausibilidad, consulta en memoria |
| API | `app/server/api/rentals/salario-minimo.get.ts` | `GET /api/rentals/salario-minimo`, memo de 10 min por consulta normalizada |
| página | `app/pages/vivir-con-el-salario-minimo-uruguay.vue` | SSR; estado en la URL con `usePreciosQuerySync` |

No hay job nuevo ni colección nueva: lee el catálogo de `/api/rentals/budget`, una consulta propia
de habitaciones y la foto semanal del análisis de alquileres.

## La cuenta

- Ingreso: líquido del SMN vigente (`computePayroll`, redondeado a pesos) y, si se eligen, la
  doceava parte del aguinaldo (Ley 12.840) y del salario vacacional (Ley 16.101, 20 días).
- Gastos por persona, del perfil austero de `COST_MODEL` (el mismo de `/herramientas/costo-de-vida`
  y de la página hermana): comida (en el interior × la relación entre las dos CBA del INE),
  celular, transporte (boleto STM o a pie/bici), salud (copagos o ASSE) y varios.
- Servicios de una casa o un apartamento: UTE y OSE (× 1,15 con dos personas) e internet si no se
  renuncia. El desglose es el que escribe el comentario de `COST_MODEL.utilitiesBase`; lo que
  falta hasta ese total es la parte de gastos comunes, que acá sale de cada aviso.
- Techo de la pieza = ingreso − gastos. Techo de casa/apto = eso − servicios, y se compara contra
  alquiler + gastos comunes.

Cifras del 26/9/2026 (SMN $ 25.383): líquido $ 20.408; aguinaldo $ 1.701 y salario vacacional
$ 1.134 por mes. Techo de la pieza en Montevideo: $ 4.770 sin decisiones, $ 10.293 con las cinco.
Solo en el interior (casa/apto): $ 8.580. Dos sueldos: $ 17.021 en Montevideo, $ 19.795 en el
interior. Solo en Montevideo: $ 7.193.

## Las palancas, y por qué cada una es legítima

- **A pie o en bici**: el boleto es un costo real y evitable si la vivienda queda cerca del
  trabajo; por eso la pieza céntrica y la forma "pieza" van juntas.
- **ASSE**: gub.uy, trámite Afiliación a ASSE: «las personas con afiliación Fonasa [...] no pagan
  órdenes ni tickets, por ningún concepto de su atención». Cambiarse desde una mutualista tiene
  reglas (movilidad regulada): la página no promete cuándo.
- **Aguinaldo y salario vacacional apartados**: son ingreso del año; sólo valen si se guardan
  cuando llegan. El primer año no hay salario vacacional.
- **Sin internet fijo**: los datos del celular; en una pieza no cambia nada.

## El veredicto de un aviso

`cierra` si alquiler + gastos comunes conocidos entran en el techo; `cierra-si` cuando falta un
dato — los gastos comunes de un apartamento (o de una casa) que el aviso no publica con evidencia
propia, o en una pieza si el aviso no dice que los servicios van incluidos —, y entonces la
página dice cuánto puede costar lo que falta; `no-cierra` si el alquiler solo ya pasa el techo.

## Garantías

Sólo las puertas que publican una regla verificable: ANDA (≤ 40 % del nominal del hogar), FGA
(líquido del núcleo ≥ 15 UR, alquiler ≤ 18 UR: un mínimo solo no llega, dos sí), FGA Jóvenes
(18–29, individual: ≤ 22,5 UR y ≤ 40 % del líquido — la ANV lo dice y `rentalGuarantee.ts` no lo
tenía hasta el 26/9/2026), régimen sin garantía de la Ley 19.889 (siempre posible si el dueño
acepta) y, para una pensión o residencia, hospedaje sin garantía.

## Lo que no se deduce leyendo el código

- **El catálogo de presupuesto no trae habitaciones** (`propertyType: 'habitacion'`): hay 359
  vigentes a ≤ $ 25.000, 297 en Montevideo (mediana $ 12.000), casi todas de Facebook y Mercado
  Libre. Sin ellas la forma "pieza" no existe.
- **Precios imposibles pasan la elegibilidad**: apartamentos de lujo de 3 dormitorios en Playa
  Mansa a "$ 3.500" y una casa en La Tahona a $ 4.750. La guarda compara contra la mediana de la
  cohorte (departamento × tipo × dormitorios, foto semanal) y excluye bajo 0,3. Los baratos reales
  medidos dan 0,38 (Manga) y 0,46 (Carmelo); los errores, 0,09.
- **"Baño compartido" no es pieza compartida**: la marca exige habitación/pieza/cuarto
  compartido, cama en habitación, cucheta o litera.
- **Servicios incluidos**: 17 de 120 habitaciones muestreadas lo dicen; "servicios no incluidos"
  y "no incluye luz" no cuentan.
- **"Para chicos y chicas" no es una restricción**: la mención de los dos sexos anula la marca.
- El Write tool de esta caja convierte el escape del rango de tildes (U+0300 a U+036F) en
  caracteres literales, y eslint lo rechaza: los rangos se reescribieron con node.

## Operación

- Las filas se arman una vez por cosecha (firma: `generatedAt` de `rentalmetas`), 30 min de
  vida; por pedido sólo se filtra en memoria.
- Sin la foto semanal del análisis la guarda sigue con cohortes de las propias filas (≤ $ 25.000).
- Un aviso reportado por dos o más cuentas como no disponible no aparece (`hide_multiple`).

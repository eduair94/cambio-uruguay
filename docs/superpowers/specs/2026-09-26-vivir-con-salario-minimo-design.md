# Vivir con el salario mínimo — diseño

Fecha: 2026-09-26. Pedido del usuario: "Vivir con salario mínimo, considerar alquileres del
directorio, etc. Busca una forma de que sea posible."

## Qué se entiende del pedido

- **Dicho:** una página sobre vivir con el salario mínimo que use los alquileres del directorio y
  encuentre la forma de que la cuenta cierre.
- **Supuesto:** es una página pública nueva del sitio (herramienta + guía), en español, que
  complementa `/vivir-con-25000-pesos-uruguay` sin duplicarla. Aquella contesta "¿alcanza?" con
  promedios del INE y un relevamiento de agosto y concluye que solo, alquilando al promedio, no
  cierra. Ésta contesta "¿de qué forma sí?" con los avisos vigentes del directorio.
- **Éxito:** la página dice, con cifras vivas, en qué arreglos el líquido del salario mínimo cubre
  un mes de vida austero y muestra los avisos concretos de hoy que entran, con lo que hace falta
  para entrar (garantía) y lo que la cuenta deja afuera. Ninguna cifra sin fuente.

## Lo que midió la exploración (26/9/2026, producción)

- Líquido del SMN ($ 25.383, Decreto 319/025): $ 20.408 (`computePayroll`).
- Con el perfil austero del sitio (`lowWage.ts`), una persona en Montevideo gasta sin vivienda
  ≈ $ 15.638 (comida 9.750, celular 600, boleto 2.288, copagos 900, varios 2.100): quedan
  ≈ $ 4.770 para vivienda. Ninguna pieza del directorio cuesta eso.
- Las palancas que existen y tienen fuente suben ese techo a ≈ $ 10.300:
  - ir a pie o en bici en vez de ómnibus (`COST_MODEL.aPieBiciMonthly` 500 contra 2.288);
  - atenderse en ASSE: "las personas con afiliación Fonasa [...] no pagan órdenes ni tickets, por
    ningún concepto de su atención" (gub.uy, trámite Afiliación a ASSE);
  - apartar cada mes la doceava parte del aguinaldo (Ley 12.840) y del salario vacacional
    (Ley 16.101, 20 días) — ≈ $ 1.700 + $ 1.130 por mes.
- El directorio tiene 359 habitaciones ≤ $ 25.000 (297 en Montevideo, mediana $ 12.000, varias
  entre $ 7.300 y $ 10.000) — tipo `habitacion`, que `/api/rentals/budget` NO incluye.
- Casas y apartamentos ≤ $ 25.000 vía el catálogo de `/api/rentals/budget`: 119 hasta $ 10.000,
  275 entre $ 10–13k, 766 entre $ 13–16k; el 90 % sin gastos comunes conocidos.
- **Precios imposibles pasan el filtro actual**: apartamentos de lujo de 3 dormitorios en Playa
  Mansa publicados a "$ 3.500" (error de moneda o de período), una casa en La Tahona a $ 4.750.
  Contra la mediana de su cohorte (departamento × tipo × dormitorios, foto semanal del análisis de
  alquileres) dan 0,09. Los baratos reales dan 0,38 (Manga, 1 dormitorio, $ 10.500) y 0,46
  (Carmelo, casa, $ 6.500). Umbral: se excluye bajo 0,3 × mediana con n ≥ 8.
- En las habitaciones con texto, ~15 % dice que los servicios van incluidos; "compartida" hay que
  leerlo con cuidado: "baño compartido" no es pieza compartida.
- Garantías: FGA pide 15 UR de líquido del núcleo ($ 28.852) — un solo mínimo no llega, dos sí.
  FGA Jóvenes (18–29) no pide mínimo individual, pero "no puede superar el 40 % de el/los
  ingresos" (ANV, verificado hoy; el repo no tenía esa condición). ANDA y CGN: alquiler hasta el
  40 % del nominal ($ 10.153 con un mínimo). Una pensión es hospedaje: no pide garantía.

## Enfoque elegido

Buscador de "formas": una cuenta pura calcula el techo de vivienda para cada arreglo, con las
palancas explícitas y activadas por defecto, y un endpoint cruza ese techo con los avisos vigentes
del directorio. Descartados: (a) una guía estática con los números de hoy — envejece en días, que
es justo lo que se le reprocha a la página hermana; (b) meter todo en `/vivir-con-25000` — esa
página ya es larga y su pregunta es otra; se enlazan en las dos direcciones.

## Piezas

### 1. Cuenta pura — `app/utils/minimumWagePlan.ts`

Sin Vue ni Nuxt; reutiliza `computePayroll`, `aguinaldoFromCashSalaries`,
`simularSalarioVacacional`, `COST_MODEL`, `INTERIOR_FOOD_FACTOR`, `TRANSPORTE_MES`,
`SMN_VIGENTE`, `UR`. No declara cifras nuevas salvo el desglose de servicios que el propio
`COST_MODEL.utilitiesBase` documenta en su comentario (UTE 2.000, OSE 1.100, internet 1.650,
celular 600; el resto es la parte de gastos comunes) y un test que ata ese desglose al total.

- `Palancas`: `caminar`, `asse`, `aguinaldo`, `vacacional`, `internet` (booleanos) y `joven`
  (18–29, sólo cambia qué garantías se muestran).
- `Forma`: `pieza` (habitación, Montevideo), `solo-interior` (casa/apto fuera de Montevideo),
  `solo-montevideo` (casa/apto en Montevideo) y `dos-sueldos` (casa/apto, dos personas con el
  mínimo cada una, cualquier departamento).
- `planDelMes(forma, palancas)` → ingresos (líquido, aguinaldo/12, vacacional/12), gastos
  personales línea por línea (por persona y del hogar), servicios de la vivienda según el tipo, y
  `techo`: lo máximo que puede costar alquiler + gastos comunes (casa/apto) o el alquiler (pieza).
  Dos personas: gastos personales ×2, UTE+OSE ×1,15 (el factor del modelo del sitio), ingreso ×2.
- `evaluarAviso(plan, aviso)` → `cierra` (sí / no / "cierra si …"): si faltan los gastos
  comunes de un apartamento, o en una pieza no consta que los servicios vayan incluidos, la
  respuesta es "cierra si lo que falta no pasa de $ X", con X = techo − alquiler. Devuelve
  también `sobra`.
- `garantias(plan, alquiler)` → puertas que publican su regla: ANDA/CGN (≤ 40 % del nominal del
  hogar), FGA (líquido del núcleo ≥ 15 UR y alquiler ≤ 18 UR), FGA Jóvenes (sólo si `joven`,
  individual: ≤ 22,5 UR y ≤ 40 % del líquido), régimen sin garantía (Ley 19.889, siempre posible
  si el dueño lo acepta; nunca más de un mes adelantado). La pieza en pensión: hospedaje, sin
  garantía.

### 2. Datos — `app/server/utils/minimumWageRentals.ts`

- Casas y apartamentos: `loadRentalBudgetCatalogue()` tal cual (elegibilidad propia, gastos
  comunes con evidencia propia, ≤ $ 25.000, vigentes). No se toca su comportamiento.
- Habitaciones: consulta propia (`propertyType: 'habitacion'`, ≤ $ 25.000, vigentes) con
  `rentalPublicStages` y la descripción propia; se descarta estadía corta
  (`rentalPeriodEvidence().shortTerm`), moneda ≠ UYU y precio < $ 3.000. De la descripción
  propia salen, y se descartan antes de responder: `serviciosIncluidos`, `piezaCompartida`
  ("habitación compartida", "cama en…", "cucheta", "litera" — nunca "baño compartido"),
  `pension` (pensión/residencia/alojamiento/hostel en el título) y `restriccion` (sólo mujeres /
  sólo hombres / estudiantil).
- Guarda de plausibilidad: mediana por departamento × tipo × dormitorios (0, 1, 2, 3+) de la foto
  semanal `loadRentalAnalysisCatalogue()` (UYU); para habitaciones, la mediana por departamento de
  las propias habitaciones. Cae a departamento × tipo y a tipo nacional si la cohorte tiene < 8.
  Se excluye el aviso bajo 0,3 × mediana y se publica cuántos se excluyeron.
- Memo por firma (`generatedAt` del catálogo + `generatedAt` del análisis): las filas
  normalizadas se arman una vez por cosecha, no por pedido. Por pedido sólo se filtra en memoria.

### 3. API — `GET /api/rentals/salario-minimo`

Query: `forma`, `departamento`, las palancas (`caminar`, `asse`, `aguinaldo`, `vacacional`,
`internet`, `joven`: `1`/`0`), `page`. Respuesta: fecha de los datos, el plan del mes, un resumen
por forma (techo, cuántos avisos cierran, desde cuánto, top departamentos) con las palancas
elegidas y **sin** palancas (para mostrar qué movió cada una), y la página de avisos de la forma
elegida (24 por página) con su evaluación y garantías. `defineCachedEventHandler`, 10 min,
clave por consulta normalizada; ruta agregada a la lista de `sentryPrivacy`.

### 4. Página — `app/pages/vivir-con-el-salario-minimo-uruguay.vue`

1. Respuesta corta arriba, con las cifras del servidor: cuánto es el líquido, en cuántas formas
   cierra hoy y con cuántos avisos, y que ninguna deja ahorro.
2. Las cuatro formas como tarjetas (techo, avisos que cierran, desde cuánto, qué hace falta);
   una forma que hoy no cierra lo dice con su número.
3. La cuenta del mes con las palancas como interruptores, cada una con su peso en pesos.
4. Los avisos de la forma elegida: título, barrio, alquiler, gastos comunes, cuánto sobra o "cierra
   si…", marcas del propio aviso (servicios incluidos, pieza compartida, restricción), puertas de
   garantía; enlace a la ficha `/alquileres/<key>` y al directorio con el filtro armado.
5. Cómo entrar: garantías con su regla y su fuente.
6. Lo que esta cuenta no tiene (ahorro cero, comida austera ≈ 1,5 CBA, primer año sin salario
   vacacional, un imprevisto la rompe) y, con hijos a cargo, el enlace a los apoyos de la página
   hermana.
7. Preguntas frecuentes, fuentes con fecha, JSON-LD (WebPage + FAQPage + BreadcrumbList).

Las respuestas viven en la URL; con query la página va `noindex, follow`. Entrada en `siteNav`
(etiqueta en es/en/pt), `relatedPages` grupo `budget`, enlace desde `/vivir-con-25000`, fila en
`docs/seo/experiments.json`, documento `docs/app/VIVIR_SALARIO_MINIMO.md`. Además se corrige
`rentalGuarantee.ts`: FGA Jóvenes suma el requisito del 40 % y el mínimo de 30 UR para grupos.

## Pruebas

- Cuenta: líquido, aguinaldo/12, vacacional/12, techo por forma con y sin palancas, efecto de cada
  palanca, dos sueldos, "cierra si", puertas de garantía en los bordes; desglose de servicios
  atado a `utilitiesBase`.
- Datos: detección de servicios incluidos / pieza compartida ("baño compartido" no cuenta) /
  pensión / restricción; guarda de plausibilidad con los casos medidos (0,09 afuera, 0,38 y 0,46
  adentro) y sus caídas de cohorte; filtro por techo y paginado; normalización de la query.
- Las pruebas del repo que ya vigilan `siteNav`, `relatedPages` y `experiments.json`.
- Medición en el navegador con datos de producción antes de dar por terminado.

## Fuera de alcance

Costos de entrada (depósito, mudanza, equipar la casa), hogares con hijos (la página hermana ya
calcula los apoyos), otros sueldos que no sean el mínimo, y cualquier job nuevo.

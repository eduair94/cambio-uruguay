# Computadoras usadas: más filtros, precios de notebooks y oportunidades

Fecha: 2026-11-24. Pedido del dueño, sobre el directorio publicado el mismo día (PR #403):
«Agregar filtros, analizar precios de laptop, encontrar oportunidades de compra (hacer página como
en otros casos)».

## Medido antes de diseñar (corrida real del 23-24/11/2026, 2.161 avisos)

- 1.108 notebooks sin fallas ni moneda deducida (960 de Mercado Libre, 148 de Facebook). Mediana
  US$ 430; deciles de US$ 141 a US$ 1.265.
- **La mitad no dice el procesador** en el título (492 sin familia); modelo exacto en 228. Sólo 132
  tenían comparables con las cohortes de v1 (procesador exacto, o familia + generación + RAM).
- **La línea se identifica en el 70 %** (798 de 1.142): MacBook Pro 186, MacBook Air 146, IdeaPad 65,
  VivoBook 47, Latitude 29, Aspire 28, ThinkPad 26, Inspiron 22, ROG 22, TUF 18…
- **Los Mac dan una escalera limpia** por año o chip: Air 2015 US$ 250 (10), 2017 US$ 358 (15),
  2018 US$ 470 (7), 2020 Intel US$ 618 (7), M1 US$ 799 (19), M2 US$ 1.049 (19), M3 US$ 1.200 (9),
  M4 US$ 1.551 (9); Pro 2017 US$ 470 (27), 2019 US$ 573 (13), M1 US$ 900 (22), M1 Pro US$ 1.304 (10).
- Un modelo sin procesador no es una cohorte: «IdeaPad 3» va de US$ 119 a US$ 1.100 (i3 a Ryzen 7).
- Por generación de Intel hay muestra chica pero ordenada: i5 de 8ª US$ 336 (6), 12ª US$ 546 (6),
  13ª US$ 1.098 (5); i7 de 10ª US$ 574 (10), 11ª US$ 950 (9), 13ª US$ 1.432 (5).

## Objetivos

1. **Más filtros** en `/computadoras-usadas-uruguay`: marca del equipo, línea (ThinkPad, MacBook
   Air…), procesador desde un año, tipo de RAM, almacenamiento mínimo, pantalla, VRAM mínima, estado,
   quién vende, «con especificaciones», «incluye monitor», «sólo oportunidades». Órdenes nuevos: más
   ahorro, procesador más nuevo.
2. **Precios de notebooks usadas** (`/precios-notebooks-usadas-uruguay`): cuánto se pide hoy por una
   notebook usada según marca, procesador, generación, RAM y placa; la escalera de los MacBook por
   año y chip; los modelos con más oferta; qué se consigue con cada presupuesto; cuánto de la nueva
   cuesta la usada. Sólo medianas con muestra mínima y siempre con su `n`.
3. **Oportunidades** (`/oportunidades-computadoras-usadas-uruguay`), con la forma de
   `/oportunidades-autos-usados-uruguay`: los avisos que piden bastante menos que sus iguales o que
   sus piezas usadas, con evidencia **sólida** o **exploratoria**, y por qué.

## No objetivos / anti-objetivos

- No es una tasación. «Oportunidad» = pide menos que la referencia medida; el aviso puede tener una
  explicación que no dice.
- Ninguna oportunidad con moneda deducida, con una falla declarada, ni de un aviso de Facebook cuya
  ficha no se leyó (la descripción es donde el vendedor dice lo que falla).
- Un precio demasiado bajo no es una oportunidad: por debajo del 45 % de la referencia queda afuera
  (error de moneda, falla no declarada o estafa son más probables que una ganga).
- Una línea sin procesador ni año («IdeaPad 3») nunca es una cohorte.

## Enfoques considerados

1. **Oportunidad = el veredicto «por debajo» que ya existe.** Rechazado: el veredicto se publica con
   4 comparables y cualquier base; una página que se llama «oportunidades» necesita la vara de
   autos (cohorte fija, mínimo más alto, pasa por su ficha, tope por vendedor).
2. **Marca de oportunidad en la fila del catálogo + página que la filtra** (elegido): el job decide
   con sus reglas y escribe `opportunity` en la fila; la página nueva y el filtro «sólo
   oportunidades» leen el mismo campo. Sin colección nueva.
3. **Regresión hedónica de precios de notebooks** (precio ~ procesador + RAM + SSD + marca).
   Rechazado para v1: con la mitad de los avisos sin procesador el modelo aprendería la marca, y un
   coeficiente no se puede mostrar con los avisos que lo sostienen. Medianas por cohorte con su `n`.

## Diseño

### Identidad de notebook (`classes/computadoras/notebook.ts`)

- `line` (slug), `lineLabel`, `model` (lo que sigue a la línea: «T490», «3», «5430»), `modelYear`
  (Mac: el año del título, 2008–2026; o el del número de modelo «A1466» cuando es de un solo año no:
  sólo el del título).
- Líneas: MacBook Air/Pro, ThinkPad (también «Lenovo T480» sin la palabra), IdeaPad, Legion, LOQ,
  Yoga, ThinkBook, Latitude, Inspiron, Vostro, XPS, Alienware, EliteBook, ProBook, Pavilion, Victus,
  Omen, Envy, Stream, ZBook, VivoBook, ZenBook, TUF, ROG, Aspire, Nitro, Predator, Swift, Katana,
  Thin GF63, Cyborg, Modern, Galaxy Book, MateBook, Surface, Satellite, Chromebook.

### Cohortes de notebook, de la más estrecha a la más ancha

1. procesador exacto + RAM (`cpu`)
2. procesador exacto (`cpu`)
3. Mac: línea + chip, o línea + año del título (`line`)
4. línea + modelo + familia del procesador (`line`) — nunca sin familia
5. familia + generación + RAM (`model`)

Comparables con ≥ 4 avisos, como hoy. Para oportunidad, ver abajo.

### Oportunidad (`classes/computadoras/opportunity.ts`)

Un aviso es oportunidad si pide entre el **45 % y el 85 %** de su referencia y:
- referencia = total de sus piezas usadas (PC), mediana de sus iguales (cualquier máquina) o mediana
  usada de la misma pieza (pieza suelta);
- sin fallas declaradas, sin moneda deducida, visto en los últimos 2 días, precio ≥ US$ 40;
- Facebook: con la ficha leída.

Evidencia **sólida**: piezas usadas con total completo; o iguales con ≥ 6 avisos y base `cpu+gpu`,
`cpu` o Mac por chip; o pieza suelta con ≥ 5 usadas. **Exploratoria**: el resto (4–5 iguales, Mac
por año, línea + familia, familia + generación, pieza con 3–4 usadas). Como mucho 3 oportunidades por
vendedor de Mercado Libre.

La horaria lee primero la ficha de los avisos de Facebook que serían oportunidad si la tuvieran.

### Informe de notebooks (`classes/computadoras/report.ts`)

Un documento en `computermetas` (`uy-computadoras-notebooks`) armado por el job: seis números,
distribución por franja de precio, por marca, por familia de procesador, por generación (i5/i7),
escalera de MacBook, por RAM, placas dedicadas, modelos con más oferta, usada contra nueva y qué se
consigue con cada presupuesto. Muestra mínima 8 (5 en las celdas de escalera y generación), sin
fallas ni moneda deducida, y cada cifra con su `n`.

### App

- Filtros y órdenes nuevos en `utils/computadoras.ts`, `Filters.vue` y la API del directorio.
- `pages/oportunidades-computadoras-usadas-uruguay.vue` + `server/api/computadoras/oportunidades.get.ts`.
- `pages/precios-notebooks-usadas-uruguay.vue` + `server/api/computadoras/notebooks.get.ts`.
- Registro en navegación, directorios, sitemap, SEO, y una fila en `docs/seo/experiments.json` para
  las dos rutas nuevas (el directorio ya tiene la suya del mismo día: no se vuelve a declarar).

## Lo que queda al constructor

Textos, detalle visual (siguiendo autos), el corte exacto de las franjas de presupuesto.

# Interconexiones entre páginas

Cómo se enlazan las páginas del sitio entre sí, además del menú. Hay cinco capas, y cada una
resuelve algo distinto; todas se dibujan desde el layout (`app/layouts/default.vue`), en este orden,
así ninguna página tiene que pegarlas a mano:

| capa | fuente de datos | qué enlaza |
|---|---|---|
| Menú, pie y buscador | `utils/siteNav.ts` | todo el sitio, sin relación entre páginas |
| **Barra de la familia** (ARRIBA) | `utils/directorios.ts` → `utils/familiaNav.ts` → `components/FamiliaNav.vue` | el directorio, sus páginas y sus análisis, con la actual marcada |
| Directorio ↔ análisis | `utils/directorios.ts` (`tambien`, `analisis`) → `components/DirectorioAnalisis.vue` | un directorio con los análisis de sus datos, y cada análisis con su directorio |
| **Más sobre este tema** | `utils/guideHubs.ts` (`resources`, `guideSlugs`, `terms`) → `utils/temaIndex.json` → `components/TemaVecinos.vue` | cada página de un tema con el tema, las demás páginas del tema y sus términos del glosario |
| Seguí leyendo | `utils/relatedPages.ts` (`CURATED` + puntaje IDF) → `components/RelatedPages.vue` | lo que queda: vecinos curados y calculados, sin repetir lo de los dos bloques de arriba |

## Enlazado no es visible: por qué hay una barra arriba

Después del bloque del tema, las cinco familias medidas quedaron enlazadas al 100 %, y aun así el
usuario no veía la evolución del precio del alquiler desde el directorio de alquileres. Tenía razón:
el enlace estaba, pero en el bloque del pie, a **11.341 px de una página de 15.868** (después de
todos los avisos); desde el análisis, a 10.545 px de 15.074. Medido a 1280 px en toda la familia de
autos, las hermanas aparecían a partir de 2.000–11.000 px, y en venta de viviendas la evolución a
8.679 px. Un rastreo que cuenta enlaces no ve esto: hay que medir **dónde** están.

La barra de la familia va arriba, antes de la página, y sale del registro de directorios (orden:
directorio, sus páginas `tambien`, sus análisis). Un análisis que comparten varios directorios
(CyberLunes sale de cinco) no es de ninguna familia, las rutas fuera del sitemap no entran, y una
familia de una sola página no dibuja barra.

En pantalla ancha (≥ 960 px) es una fila de chips con ícono. En un celular fue primero la misma fila
con scroll lateral, y no servía: a 390 px se veían una hermana y media, nada avisaba que había cuatro
más a la derecha, y deslizar de costado dentro de una página que se desliza hacia abajo es incómodo.
Debajo de 960 px ahora es el patrón de navegación local de siempre: un botón de 56 px con la página
actual ("En esta sección · 6 páginas / Análisis de alquileres") que despliega la lista entera en
vertical, con filas de 48 px, ícono y la actual marcada. Es un `<details>` nativo: abre antes de
que la página hidrate y sin JavaScript, y los enlaces están en el HTML aunque esté cerrado. Se cierra
al navegar (el layout no se desmonta) y con Esc. Se descartó un cajón lateral: esconde la lista
detrás de un gesto más y compite con el menú del sitio, que ya es un cajón. Los clics del menú se
miden aparte (`placement: family_nav_menu`) de los de la fila (`family_nav`).

**Grupos (2026-09-21).** Una familia puede llevar además grupos de enlaces que no son páginas del
directorio (`GRUPOS` en `utils/familiaNav.ts`). Nació en alquileres: arriba del título había tres
bloques seguidos — esta barra, "Otras búsquedas de vivienda" (siete botones, tres de ellos hermanas
que la barra ya tenía) y "Antes de alquilar" (las tres guías) — y el usuario lo describió como
"extremadamente confuso". Ahora la página no tiene lista propia y la barra lleva dos grupos: otras
búsquedas de vivienda (venta, inmobiliarias, planificar, mudanzas) y antes de alquilar (las guías,
etiquetadas con la pregunta del lector). En pantalla ancha van en texto debajo de los chips, un
escalón por debajo de las hermanas; en el celular, como secciones con título dentro del mismo menú
("En esta sección · 13 páginas"). Reglas: una ruta aparece una sola vez en toda la barra (la
hermana gana), los grupos son iguales en todas las páginas de la familia, y un grupo **no da
pertenencia** — la guía no dibuja la barra de alquileres y la venta de viviendas conserva la suya.
Clics: `family_nav_group` y `family_nav_menu_group`.

Para medirlo de nuevo: posición vertical del primer enlace a cada hermana, en las páginas de la
familia, a 1280 px; "arriba" es antes de ~1.400 px.

## Por qué existe "Más sobre este tema" (medido el 2026-09-19)

Se rastreó el HTML de producción (las 195 páginas raíz, los 16 temas, los 75 términos, las 145 guías
y una muestra de cada familia programática) contando sólo los enlaces del contenido, sin el menú.
Proporción de pares de páginas de un mismo grupo que se enlazaban, contando todo lo visible:

| grupo | páginas | antes |
|---|---|---|
| autos | 9 | 71 % |
| alquiler | 12 | 52 % |
| venta de vivienda | 6 | 43 % |
| evoluciones de precio | 5 | 40 % |
| dólar | 9 | 35 % |

Lo que lo explicaba: los temas de `/temas` tenían listas de "páginas del tema" escritas antes que
las páginas de datos (el de autos no enlazaba ninguna de las ocho; el de vivienda en venta, ninguna
de las cinco), ninguna página de datos enlazaba de vuelta a su tema, las guías casi no enlazaban
datos, los tres gráficos de evolución no se cruzaban con el histórico del dólar ni con el de la
nafta, y **ningún término del glosario enlazaba a un tema** (sólo 10 páginas enlazaban algún
término).

## La regla

**Los temas son la fuente de "qué va con qué".** Una página es de un tema si está en sus
`resources`, si es una de sus guías o si es uno de sus `terms`. El bloque de cada miembro lista a
los demás miembros, así que el vínculo es **recíproco por construcción** (`temaVecinos.test.ts` lo
exige), y sumar una página a un tema la conecta con todo el tema sin tocar ninguna otra página.

- El orden es el del tema en `guideHubs.ts`, que es editorial: primero lo que se pregunta después
  de esa página. Una regla mecánica ("datos primero") ponía en autos usados monopatines y bicicletas
  antes que "comprar un auto con deuda". Cada tema muestra seis páginas y pliega el resto en un
  `<details>` (sigue en el HTML): con todas abiertas, una página en dos temas medía 1.629 px en un
  celular.
- Una página puede estar en dos temas (una evolución es de su mercado y de "economía y mercado");
  el bloque muestra hasta dos. Una página de DATOS nunca puede estar en más (lo exige el test), para
  que no pierda el vínculo con ninguno.
- Las rutas fuera del sitemap (el tablero de `/estado`) no se promocionan en un bloque de lectura.

## Por qué hay un `temaIndex.json`

El bloque vive en el layout: todo lo que importe viaja en el JavaScript de **cada** página. Leer
`guideHubs.ts` directo arrastraba las 145 guías completas (`guides.ts` pesa ~140 KB y trae nueve
archivos más) y el glosario sus definiciones (~64 KB). El índice guarda sólo rutas, etiquetas,
slugs y nombres (<40 KB, vigilado por test).

`tests/unit/temaIndex.test.ts` **es el generador**: compara el índice con `guideHubs.ts` y el
glosario, y falla si se editó un tema sin regenerarlo. Para regenerar:

```sh
cd app && npx vitest run tests/unit/temaIndex.test.ts -u
```

## Agregar una página

1. Si tiene datos propios: su directorio en `utils/directorios.ts` (`tambien` o `analisis`).
2. **Siempre**: una entrada en `resources` del tema que corresponda (`utils/guideHubs.ts`), con
   etiqueta y una línea de descripción; y su entrada del menú (`siteNav`) para la etiqueta
   trilingüe del bloque.
3. Regenerar el índice (arriba).

El test también exige que todo término del glosario tenga tema y que toda página de datos del
registro de directorios esté en algún tema: una página nueva sin tema no pasa CI.

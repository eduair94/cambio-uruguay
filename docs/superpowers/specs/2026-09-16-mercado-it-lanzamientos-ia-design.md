# Marcar los lanzamientos de IA en el termómetro de r/CharruaDevs

Fecha: 2026-09-16 · Página: `/mercado-it-uruguay`

## El pedido

«Para el ranking del termómetro de r/CharruaDevs, agregar las fechas de lanzamiento de
modelos de IA a la analítica, para ver si los cambios están relacionados con ellos.»

## Qué se construye

1. **`app/utils/aiReleases.ts`** — lista curada y fechada de lanzamientos de IA, cada uno con
   la URL del anuncio oficial del propio fabricante. Es contenido editorial, no un job: no hay
   API que publique «los lanzamientos que le importaron a un programador». Precedente en el
   repo: `utils/mercadoPagoPromos.ts`.
2. **Marcadores en los gráficos mensuales** de la página: la curva (negativas/positivas),
   menciones de IA por mil, y el control sin IA (frases de alarma). Un punto por mes con
   lanzamiento, con tooltip que dice qué salió ese mes.
3. **Sección nueva `¿Se mueve cuando sale un modelo nuevo?`** con la tabla de lanzamientos y
   —esto es lo importante— la **comparación contra los meses sin lanzamiento**.

## La decisión de diseño que manda sobre todas las demás

Un marcador sobre una serie que sube sola no prueba nada: si las menciones de IA suben casi
todos los meses, cualquier fecha que marques queda «seguida de una suba». Por eso la página
**no publica el dato del lanzamiento solo**: publica, al lado, la misma cuenta hecha sobre
los meses SIN lanzamiento. Es una línea de base cruda (un placebo), no un test estadístico, y
la página lo dice con esas palabras.

Sin esa comparación la sección sería un generador de correlaciones espurias con aspecto de
análisis — exactamente lo que el resto de la página evita.

## Reglas

- **Toda fecha se publica con la URL del anuncio oficial del fabricante.** Un artículo de un
  tercero no alcanza. Lo que no se confirma, no se publica (no se «estima»).
- **Sólo series mensuales.** Un trimestre contiene 2 o 3 lanzamientos: marcarlo no distingue
  nada. Los gráficos trimestrales (amenaza/herramienta, relatos) quedan sin marcar, y la
  página explica por qué.
- **Lista corta.** Si se marcan 25 fechas sobre 46 meses, la mitad de los meses queda marcada
  y el marcador pierde sentido. El criterio de entrada no es el benchmark: es si cambió cómo
  trabaja un programador (adopción), y que sea plausible que se comentara en el sub.
- **La página no afirma causa.** El texto dice explícitamente que esto no separa el
  lanzamiento de la tendencia, que los lanzamientos vienen en racimo, y que el mercado se
  movió también por cosas que no son modelos (la ola de despidos de 2023, el índice de Indeed
  que ya está en la página).
- Convenciones vigentes: `VContainer` raíz y **un solo `<h1>`** (la sección nueva es `<h2>`),
  tabla ancha con `cu-mobile-cards` + `data-label` + `scope="col"`, nada de `VChip` dentro de
  `<p>`, radios 4/8/12/16 px, «setiembre», sin `|` en i18n.

## Cómo se mide (y qué se publica)

Para cada mes `m` de la serie de menciones de IA (`lexMonthly`, con `n >= 200`) y de la curva
de negatividad (`monthly.neg3`):

- `antes(m)` = promedio de los 3 meses previos; `después(m)` = promedio de los 3 siguientes.
- Un mes «subió» si `después(m) > antes(m)`. Se descartan los meses sin las dos ventanas
  completas.
- Se publican dos proporciones: entre los meses **con** lanzamiento y entre los meses **sin**.

La tabla de lanzamientos muestra, por fila: fecha, qué salió (enlace al anuncio), quién, y el
antes → después de las menciones de IA en ese mes. Una fila sin ventana completa muestra «—»,
nunca un número inventado.

## Qué NO se hace

- No se toca el backend: `classes/charruadevs/**`, el snapshot y el job quedan igual. La lista
  es editorial y vive en el frontend.
- No se marca `/ranking-usuarios-charruadevs` (no tiene gráficos).
- No se agrega `chartjs-plugin-annotation` ni líneas verticales: los marcadores van en
  `chartData` (que sí se observa) y no en `options` (que no se observa; ver
  `components/charts/LineChart.vue`).
- No se toca `utils/siteNav.ts` (la página ya está registrada y otra sesión lo edita seguido).

## Riesgos

- **Fechas mal.** Mitigación: verificación contra el dominio del fabricante, y test que exige
  `https://` + dominio propio + orden cronológico.
- **Ruido visual.** Mitigación: lista corta, un solo color de marcador, `pointRadius: 0` para
  el resto (como hoy).
- **Lectura causal del lector.** Mitigación: la línea de base de meses sin lanzamiento está en
  el mismo párrafo que el resultado, no en una nota al pie.

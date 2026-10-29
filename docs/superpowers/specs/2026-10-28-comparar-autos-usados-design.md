# Comparador de modelos de autos usados — diseño

Pedido (2026-10-28): "una página que permita comparar diferentes modelos de auto usando la
información de autos usados a la venta. Seguí referencias disponibles en el mercado". Spec y plan
auto-aprobados por la orden permanente del dueño (sin ronda de aprobación).

## Intención

Quien duda entre dos o tres modelos (Onix o 208, Hilux o Amarok) quiere saber cuál le conviene con
SU plata, no la ficha técnica de un 0 km. Las referencias del mercado (Edmunds, KBB, Cars.com,
Autocosmos, Carwow) resuelven la ficha lado a lado, el costo de tenerlo a 5 años y la reventa; acá
la diferencia es que todo sale de avisos uruguayos vigentes: lo que se pide por cada año, cuánto
cuesta tenerlo con nafta y patente de acá, cuánto pierde por año y cuánto salen sus repuestos.

## Decisiones

- **Ruta** `/comparar-autos-usados-uruguay`. Hasta 3 modelos (el mercado deja 3–4; en 390 px entran
  3 columnas legibles). La URL es la consulta: `modelos=chevrolet-onix,peugeot-208~nafta-automatica`,
  `anio=2019` o `presupuesto=15000`, `km=15000`. Sólo la URL desnuda se indexa.
- **Una sola fuente**: `caradvisorsnapshots` (la tabla del asesor, 242 modelos con 12+ avisos) y
  `carOwnershipCosts`, así una cifra no dice una cosa acá y otra en el asesor o en la ficha. Sin job
  nuevo ni colección nueva.
- **Dos lentes**: "al mismo año" (qué se pide por un 2019 de cada uno) y "con la misma plata" (a qué
  año llega cada uno con US$ X: el más nuevo cuya mediana entra, la regla del asesor).
- **La variante es el "trim"** de las referencias: combustible × caja por columna, por defecto la que
  más avisos tiene.
- **Estructura (sorteo de impeccable, candidata 4 de 5): veredicto primero.** Arriba, por modelo,
  "Elegilo si…" con lo que gana y "Lo que resignás", cada renglón con su número. Debajo, el gráfico
  de precio por año con la lente dibujada (línea de presupuesto o año marcado) y la tabla completa
  lado a lado con "mejor" por fila y "sólo diferencias".
- **El veredicto es calculado y condicionado**: una fila declara ganador sólo si la diferencia pasa
  su umbral de ruido; lo que falta no gana ni pierde; Latin NCAP se muestra y no puntúa (regla del
  asesor); "pierde menos valor" sólo si los modelos comparados tienen curva propia (169 de 242 usan
  la típica del mercado, medido 2026-10-29).
- **Cálculo**: el servidor arma columnas con todos los años de la variante; año, presupuesto y km se
  resuelven en el cliente con la misma función pura (deslizador instantáneo, SSR idéntico).
- **Rivales y comparaciones frecuentes calculados**: misma carrocería y precio parecido a igual año
  (mediana de |log| entre años comunes < log 1,25, 3+ años comunes), ordenados por avisos.
- **Sin el modelo pedido**: si la URL nombra un slug que no está en la tabla, se dice cuál y por qué
  (12 avisos mínimos), nunca se reemplaza en silencio.

## No-objetivos

Fiabilidad por modelo (nadie la publica), precio de cierre, seguro todo riesgo, páginas indexables
por par ("onix-vs-208"): quedan para medir primero la URL base.

## Plan

1. `app/utils/carCompare.ts` (pura) + `app/tests/unit/carCompare.test.ts`.
2. `app/server/api/cars/compare.get.ts`.
3. Componentes `app/components/cars/compare/*` y la página.
4. Registro: `siteNav.ts` + i18n, `directorios.ts`, `guideHubs.ts`, `classes/revenueplan/value.ts`,
   `seoContract.test.ts`, `docs/seo/experiments.json`, `docs/app/AUTOS.md`.
5. Enlaces entrantes: ficha de precios del modelo y resultados del asesor.
6. Verificar con la APP DB real (túnel), móvil y escritorio, claro y oscuro; tests y lint.

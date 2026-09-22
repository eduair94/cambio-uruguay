# [Qué se midió] en [dónde]: [mes] de [año] [· provisorio si aplica]

> Esqueleto del informe mensual. Reemplazar cada `[...]`. 400–600 palabras. Nunca septiembre:
> setiembre. Si la página lleva etiqueta, el título la lleva con las mismas palabras
> (`provisorio · N días medidos`, `parcial`).

**Edición:** [mes año] · **Datos al:** [YYYY-MM-DD HH:MM UTC] · **Fuente:** cambio-uruguay.com/[ruta]
**Estado de la capa:** [definitivo / provisorio · N días medidos / parcial: qué falta]

## En una línea

[La cifra 1, en una oración que un titular pueda copiar: qué, cuánto, dónde, cuándo, y el límite
en cuatro palabras.]

## Cinco cifras citables

Cada cifra lleva método y fecha; sin eso no entra.

| # | Cifra | Qué mide exactamente | Método | Fecha / n |
|---|---|---|---|---|
| 1 | [valor + unidad + lugar] | [definición en una línea, con las palabras de la página] | [de dónde sale: API, ventana, agregación] | [fecha; n o días medidos y cobertura] |
| 2 | [el contraste: el otro extremo] | | | |
| 3 | [la cifra de conjunto: mediana o promedio ponderado] | | | |
| 4 | [la concentración o la distribución: "N de M", "el X % de..."] | | | |
| 5 | [la referencia externa, si la hay, y qué mide distinto] | | | |

Reglas para la tabla: unidad en cada celda; "avisos", no "alquileres"; "oferta", no "ventas";
"a este ritmo" si la ventana es menor al período de la unidad; etiqueta de la página si la hay.

## Dos gráficos para embeber

Los gráficos del sitio son HTML (no imágenes). Para el medio: captura + enlace a la página con la
nota de método al pie, o rehacer desde el CSV que se adjunta.

1. **[Nombre del gráfico 1]** — en `[ruta]`, bloque "[nombre del bloque en la página]".
   Qué muestra: [una barra/serie por qué unidad, ordenado cómo, con qué etiqueta]. Qué dice al
   pie: [el texto de método que la página imprime]. CSV: `[archivo].csv` (columnas: [...]).
   - Ejemplo (luz): las barras "Frente a los demás barrios" de `/barrios-alquileres-uruguay`,
     capa "Cortes de luz" (`ZoneExplorer`): una barra por barrio con "mejor que X %" y el valor
     medido con unidad ("N min/mes"); lleva la etiqueta `provisorio · N días medidos`.
2. **[Nombre del gráfico 2]** — en `[ruta]`.
   Qué muestra: [...]. Qué NO muestra: [...].
   - Ejemplo (alquileres): el bloque de impacto de `/analisis-alquileres-uruguay`
     (`RentalsZonesPriceImpact`): servicios del barrio contra alquiler por m², con ρ de Spearman e
     intervalo; es una asociación y el gráfico lo dice.
   - Ejemplo (evolución): el explorador de series de `/evolucion-precio-alquileres-uruguay`
     (`MarketSeriesExplorer`): nivel (p25/mediana/p75) y "misma oferta" en curvas separadas, con n
     y pares por día.

## Cómo se midió

[Un párrafo, 80–120 palabras, con: la fuente pública y su URL; qué guarda el sitio y cada
cuánto; la unidad y cómo se normaliza; la ventana; el umbral mínimo para publicar (n, días,
cobertura); qué se descarta y por qué; desde cuándo existe la serie. Con las mismas palabras que
la página, para que un lector pueda contrastar.]

## Lo que el dato no dice

- [Límite 1: qué mide la fuente y qué no — p. ej. "UTE muestra el momento; la historia la
  guardamos nosotros desde el 19/9/2026".]
- [Límite 2: unidad y ventana — p. ej. "min por cliente cada 30 días es un ritmo; con N días
  medidos, lo observado son X min".]
- [Límite 3: qué no se afirma — causalidad, seguridad, ventas, "el más barato" a secas.]
- [Límite 4: la referencia externa mide otra cosa — p. ej. la meta de URSEA.]

## Cifras de apoyo (opcional, máximo dos datasets)

[Una o dos cifras de otro dataset del sitio que le den contexto al protagonista, con su página y
fecha. Sin mezclar unidades ni períodos.]

## Fuente, reutilización y contacto

- Página: `https://cambio-uruguay.com/[ruta]` (datos al [fecha]). API pública: `[endpoint]`.
- Cita: "Fuente: cambio-uruguay.com" con enlace a esa página y la fecha; si la cifra lleva
  etiqueta, la etiqueta viaja con ella.
- CSV completo y consultas de método: `https://cambio-uruguay.com/contacto`.
- Independencia: el sitio no recibe dinero ni favores de las partes medidas por este informe. Las
  correcciones se publican con fe de erratas fechada en la misma página.

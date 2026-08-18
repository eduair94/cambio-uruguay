# Huecos de contenido detectados en Reddit

Acá caen los borradores de `sync_content_gaps` (pm2 `currency-content-gaps`) — **los que no se
pudieron publicar solos**.

## El camino normal ya no pasa por acá

Cuando cuatro o más hilos preguntan lo mismo y el sitio no lo contesta, el pipeline investiga,
escribe la página y la publica: push a `main`, que dispara el deploy. Después el bot vuelve a esos
hilos y los contesta con la página que se generó para ellos.

No hay una persona entre eso y el sitio público, así que la revisión que haría una persona está
automatizada. Una página se publica sola sólo si pasa **todo** esto:

1. la pregunta cae en una de las temáticas del sitio (`classes/gaps/topics.ts`)
2. cada fuente citada se descarga y devuelve 200
3. **cada cifra de la página aparece literal en el texto descargado de esas fuentes**
4. la forma pasa (largo, secciones con sustancia, sin muletillas, slug libre)
5. **el lint y los tests de la app pasan**, corridos en un clon aparte antes del push

Lo que la investigación no pudo confirmar se publica como tal, en su propia sección. No se redondea
a una afirmación.

## Qué es un archivo de esta carpeta, entonces

Un hueco real cuya página **no** se pudo publicar: las fuentes no verificaban, una cifra no aparecía
en ninguna, o los tests quedaron en rojo. El trabajo de investigación no se tira — queda acá para
que una persona lo termine.

## Qué es un archivo de esta carpeta

Una pregunta que **cuatro o más hilos** de los subreddits uruguayos hicieron y que
el sitio no contesta, más una investigación con búsqueda web y las fuentes que el
modelo realmente abrió.

**No es una página, y no se publica solo.** El resto de los subsistemas
auto-actualizables del repo (aduana, préstamos, figures, costos) pueden cambiar un
*número* dentro de una página que alguien escribió y revisó, detrás de bandas y de
la regla de dos fuentes independientes. Ninguno crea una página. La diferencia
importa: un número equivocado adentro de una página revisada choca contra su banda,
mientras que una página entera que nadie leyó no tiene ese piso — y los temas que
esta carpeta genera son aduana, impuestos y tasas, justo donde equivocarse con
seguridad le cuesta plata a quien lee.

Mientras el borrador está acá, el bot **no responde** esos hilos.

## Cómo se convierte en página

1. Verificar cada cifra contra la fuente, abierta a mano. La sección "Lo que NO
   pude confirmar" del borrador es lo que el modelo no encontró: no pasa arriba
   sin que una persona lo confirme.
2. Ojo con IMPO: `/bases/leyes` es el texto vigente, `/bases/leyes-originales` es
   el original y puede estar derogado.
3. Los valores fechados van a un `app/utils/*.ts`, nunca incrustados en el `.vue`.
4. Registrar la ruta en `app/utils/siteNav.ts`, o el test de cobertura falla.
5. Borrar el borrador en el mismo commit que agrega la página.

## Prioridad

El número de hilos que pidieron cada tema es la mejor señal de demanda que tiene
el proyecto: viene de gente preguntando sin que nadie les preguntara, no de la
estimación de volumen de una herramienta de keywords.

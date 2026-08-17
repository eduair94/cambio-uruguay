# Huecos de contenido detectados en Reddit

Acá caen los borradores que escribe `sync_content_gaps` (pm2 `currency-content-gaps`).

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

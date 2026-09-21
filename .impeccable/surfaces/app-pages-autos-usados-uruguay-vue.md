---
version: 1
slug: "app-pages-autos-usados-uruguay-vue"
primary_target: "app/pages/autos-usados-uruguay/index.vue"
related_targets: ["app/components/cars/Filters.vue","app/components/cars/FilterPanel.vue","app/components/cars/Toolbar.vue","app/components/cars/ActiveFilters.vue","app/components/cars/ListingCard.vue","app/pages/oportunidades-autos-usados-uruguay.vue","app/pages/autos-chocados-y-con-deuda-uruguay.vue"]
---

# Directorio de autos usados: decisiones de experiencia

## Alcance y modo

Modo Operate. Personas que buscan un auto usado en Uruguay y comparan avisos de diez fuentes,
casi siempre desde el celular y casi siempre antes de decidir ir a verlo. La interfaz conserva
el sistema visual de Cambio Uruguay; la referencia de interacción es Mercado Libre, porque es
donde esta misma gente ya aprendió a filtrar autos.

Las tres páginas que comparten estos componentes son la misma superficie: el directorio
(`/autos-usados-uruguay`), las oportunidades y los avisos con riesgo declarado. Un patrón que
cambia acá cambia en las tres.

## Recorrido principal

1. Llegar y ver avisos, no un formulario. Los filtros nunca ocupan la primera pantalla en móvil.
2. Acotar por marca, carrocería, año, precio y kilómetros; el resto de los campos vive en
   «Más filtros», que se abre solo si ya hay alguno puesto.
3. Confirmar explícitamente. El borrador no toca la URL ni recarga hasta que se aplica.
4. Ver qué quedó puesto en la fila de chips y sacar uno de a uno sin volver a abrir el panel.
5. Ordenar sin perder el lugar en la lista.

## Móvil

- **La barra de herramientas queda pegada bajo la cabecera** (`top: 64px`) mientras se recorren
  los resultados: filtrar y ordenar son la razón de la página y no pueden quedar arriba de todo,
  fuera de alcance. Filtros a la izquierda —bajo el pulgar—, orden a la derecha.
- **Los filtros son un cajón a pantalla completa, no un acordeón en el flujo.** El acordeón
  anterior medía 758 px y empujaba los resultados fuera de la pantalla al abrirse; en las otras
  dos páginas ni siquiera había botón y el formulario estaba siempre abierto, con el primer
  resultado a 1.976 px del tope.
- **El botón de aplicar dice cuántos avisos hay** («Ver 18.951 avisos»). En móvil el cajón tapa
  la lista: sin el número, aplicar es a ciegas. Es el total de la consulta ya aplicada, nunca una
  previsualización del borrador, que exigiría consultar por cada tecla.
- El cajón respeta `visualViewport`: el teclado del celular achica la ventana sin tocar
  `innerHeight` y el pie quedaría debajo del teclado justo al escribir un precio.
- Objetivos táctiles de 44 px en la barra y en la cruz de cada chip; el pie del cajón usa
  `env(safe-area-inset-bottom)`.
- El orden es un menú, no un `VSelect`: la etiqueta larga («Vistos más recientemente») es el
  valor, no el rótulo, y en 390 px se cortaba a «Vistos más recientem…».

## Densidad de la lista

En móvil la ficha es una **fila** —foto de 116 px a la izquierda, datos a la derecha— y no una
tarjeta con foto a todo el ancho. Medido: la tarjeta ocupaba 396 px y entraban dos avisos por
pantalla, o sea doce pantallas para recorrer una página de 24. La fila entra en ~128 px y deja
cinco, que es la densidad con la que esta gente ya compara autos en Mercado Libre.

De 600 px para arriba vuelve la tarjeta: ahí la grilla tiene varias columnas y la foto grande sí
ayuda a elegir. El orden de lectura es el mismo en las dos formas (qué auto es, cuánto sale, de
qué año), así que ninguna usa `order`.

El enlace del título cubre la fila entera: en móvil el blanco de la ficha es el objetivo más
grande que hay. La foto conserva su propio enlace por encima.

## Veracidad

- Son precios **pedidos** en avisos, no ventas cerradas. Ningún rótulo puede sugerir lo contrario.
- La moneda deducida de Facebook Marketplace se muestra marcada y nunca cuenta como oportunidad.
- Los kilómetros son los que declara quien vende; los valores de relleno se dicen «no informado».
- Carrocería y consumo llevan «≈» cuando salen del diccionario del modelo y no del aviso.
- Un chip muestra el slug antes que desaparecer: un filtro activo e invisible es peor que uno
  mal escrito.
- El contador del botón de filtros cuenta la consulta aplicada, no el borrador: el número
  describe lo que hay en pantalla.

## Espaciado

Toda medida es múltiplo de 4 (la escala de Vuetify) y, salvo motivo, uno de los pasos
nombrados de DESIGN.md: 4 / 8 / 16 / 24 / 40. Ver las reglas *The Four-Pixel Grid*,
*The Neighbour Owns The Gap* y *The Columns Share A First Line*.

El ritmo vertical de la columna de resultados, medido y verificado en las dos variantes
(con filtros activos y sin ellos), es el mismo en mobile y en desktop:

| de | a | px |
|---|---|---|
| barra fija de filtros (sólo mobile) | lo que siga | 12 |
| chips de filtros activos | encabezado del listado | 12 |
| encabezado del listado | grilla de fichas | 16 |
| ficha | ficha | 12 mobile · 16 desktop |
| columna de filtros | columna de resultados | 24 |

Quien pone el aire debajo de la barra es **la barra**, no los chips: los chips son
condicionales y cuando eran ellos los dueños, el encabezado quedaba pegado al borde de la
barra en cuanto no había ningún filtro puesto.

Los chips **no llevan margen superior en desktop** (≥960 px) a propósito: arrancan en la
misma línea que el primer campo de la columna de filtros. Medido: los dos a 471 px. En
mobile, donde no hay con qué alinear, el aire lo pone la barra.

Adentro de la ficha: 12 px de padding a los cuatro lados y 4 px entre líneas. La palabra
"Consumo" está oculta a la vista en todos los anchos (el ícono de surtidor ya lo dice) y
sigue en el árbol de accesibilidad; restituirla partía la línea en dos renglones.

El área táctil de la cruz de un chip son 44×44 exactos, centrados sobre el ícono con
`translate(-50%, -50%)` — no un `inset` negativo calculado contra el tamaño del glifo,
que es de dónde salía un 13 px que no explicaba nada.

## Límites

- Sacar un filtro vuelve a la página 1 y conserva el orden elegido: el orden se elige al lado de
  los resultados, no dentro del formulario.
- El cajón es sólo de móvil. Si la ventana crece con él abierto se cierra: los filtros ya están
  a la vista en la columna y un diálogo encima no tendría a qué volver.
- Cada combinación de filtros es una copia delgada de la página: sólo la URL base se indexa.

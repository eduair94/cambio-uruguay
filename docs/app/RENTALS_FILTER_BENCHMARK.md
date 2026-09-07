# Filtros inmobiliarios: referencia pública

Revisión: **2026-09-07**. Chrome, contextos aislados sin cuentas ni preferencias; escritorio y viewport móvil de 390 × 844. Se observaron controles públicos y cambios de búsqueda, sin contactos ni escritura de publicaciones. No se probaron las aplicaciones nativas. La interfaz puede variar según dispositivo, sesión o experimento del portal.

| Portal / fuente | Patrón y filtros observados | Aplicar, cancelar y límites |
| --- | --- | --- |
| [Mercado Libre](https://listado.mercadolibre.com.uy/alquiler) | Sidebar desktop con cantidades por faceta. Ubicación, operación, tipo, moneda/precio, inmobiliaria/dueño, dormitorios/baños, superficie total/cubierta, cochera, antigüedad, amueblado, aire, jardín/piscina, publicados hoy y tour. | Una faceta discreta navega; los rangos manuales tienen Aplicar propio. Elegir operación Alquiler redirigió a verificación de cuenta: móvil y cancelación quedaron **sin verificar**. La entrada por palabra «alquiler» mezclaba operaciones; sus cantidades no equivalen a viviendas de alquiler mensual. |
| [InfoCasas](https://www.infocasas.com.uy/alquiler) | Toolbar desktop; chips horizontales y panel completo móvil con pie fijo Limpiar / Ver propiedades. Precio y moneda, GC incluidos, dormitorios/baños mínimos o exactos. Extras → Ver más revela mascotas, amueblado, calefacción, piscina, seguridad y dueño; avanzados incluyen fecha y superficie edificada/total. | Elegir Casa cambió inmediatamente la URL a [/alquiler/casas](https://www.infocasas.com.uy/alquiler/casas), mientras el panel y Ver propiedades seguían visibles. **No asumir borrador transaccional** sólo por ese botón. No se verificó la aritmética exacta de GC incluidos ni la cancelación de cada campo. |
| [Marketplace](https://www.facebook.com/marketplace/montevideo/propertyrentals) | Sidebar desktop; ubicación/radio y mapa prominentes. Precio, dormitorios, baños, tipo, superficie, particulares y orden. Responsive muestra Ubicación / Filtros / Notificarme. | En diálogo de ubicación, 65 → 10 km quedó como borrador; cerrar sin Aplicar conservó 65 km. Filtros responsive tiene Ver publicaciones, pero un aviso fijo de iniciar sesión tapó ese botón. La emulación con UA desktop produjo layout interno de 685 px: **limitación de esta sesión**, no prueba de móvil nativo. |

No se observó un filtro de garantías en las pantallas revisadas; no implica que falte en todas las variantes. No se atribuyen comportamientos móviles a Mercado Libre basándose en su interfaz desktop.

## Seis prioridades para Cambio Uruguay

1. **Filtros siempre accesibles:** sidebar desktop y una fila móvil compacta con Filtros, alternador de vista y acciones secundarias. Cuerpo del panel desplazable; acciones alcanzables con teclado y poca altura. Verificar 320/390/430 px, horizontal, zoom 200 %, objetivos de 44 px e inputs de 16 px.
2. **Edición predecible:** abrir copia de lo aplicado; cambios sólo en borrador; Aplicar actualiza URL y resultados; X/Escape descartan. Limpiar dentro del panel limpia el borrador. Cerrar recupera foco y posición de lectura; Back conserva la búsqueda.
3. **Presupuesto honesto:** distinguir base y total mensual conocido; GC desconocidos no son cero. Precio, GC, filtros y contacto pertenecen al mismo aviso. Temporal, precio simbólico o traspaso ambiguo no son alquileres económicos comparables.
4. **Necesidades uruguayas visibles:** ubicación, presupuesto, tipo y dormitorios primero; garantías aceptadas, mascotas, cochera y amueblado en grupos breves y descriptivos. «No informado» separado de negativo. No importar filtros de huéspedes/camas propios de temporada como requisitos de vivienda permanente.
5. **Facetas comprensibles:** cantidades coherentes con el borrador, chips removibles y alternativas concretas cuando no hay resultados. No eliminar ubicación silenciosamente; distinguir publicaciones de propiedades en los conteos.
6. **Mapa y anunciante útiles:** conservar filtros entre lista, mapa y ficha; mostrar foto, costo, atributos, fuente, lectura y precisión de ubicación. Dueño directo requiere evidencia explícita. Agencia/contacto pertenecen al aviso, con procedencia; una coordenada aproximada no permite prometer distancias exactas.

Estas son recomendaciones; contrastar con funciones ya existentes antes de implementar. El objetivo es claridad y coherencia, sin copiar marcas ni reproducir sus limitaciones.

## Evidencia y regresiones

Capturas locales ignoradas en la raíz del worktree: `.sdd-filter-research-ic-desktop.png`, `.sdd-filter-research-ic-mobile-results.png`, `.sdd-filter-research-ic-mobile-drawer.png`, `.sdd-filter-research-marketplace-mobile-results.png`, `.sdd-filter-research-marketplace-mobile-drawer.png` y `.sdd-filter-research-ml-account-gate.png`. `.sdd-filter-research-ml-desktop.txt` conserva sólo los controles del árbol accesible antes del bloqueo. No se comprometen capturas de publicaciones al repositorio.

`app/tests/e2e/rentals-filter-experience.spec.ts` comprueba borrador/aplicar/cancelar, rangos, limpieza, URL y primeras decisiones visibles en móvil con datos sintéticos y sin escrituras reales. La prueba visual complementa las pruebas Mongo de semántica de ofertas; no las sustituye.

## Cambios y comprobación de esta iteración

- Alquiler base visible, con grupos independientes para costo mensual, características, garantías, portal/disponibilidad y cercanía a salud. La moneda del aviso no cambia la unidad de los rangos: siguen en UYU y se explica en el panel.
- Barra móvil única; tarjetas con foto y precio juntos. En la muestra controlada de 320 px, el primer precio pasó de alrededor de 954 px a 526 px de altura. No es una medición de rendimiento ni una promesa para todos los contenidos.
- Costo mensual conocido destacado y desglosado. `sort=total` deja los gastos desconocidos al final. Mascotas, garaje, amueblado y garantías pertenecen al mismo aviso que el precio seleccionado; no se heredan de otro anunciante del grupo.
- Limpiar en los cuatro paneles móviles modifica el borrador. Las animaciones de apertura respetan un campo que ya recibió el foco. Ventas concentra sus acciones en una fila y muestra tipo y dormitorios antes de las características adicionales.
- Pruebas de navegador: 320/390/430 px, escritorio 1440 px, altura reducida, texto al 200 %, inglés/claro y portugués/oscuro; recorridos de teclado, URL/Atrás, cancelar, aplicar, rangos, guardados y comparación. Las pruebas de interacción utilizan anuncios sintéticos; los controles posteriores al despliegue consultan el índice real sin escribir ni contactar anunciantes.

No se añadieron conteos de resultados al borrador ni filtros basados en servicios sin cobertura suficiente. Las facetas no deben prometer cantidades condicionadas por todos los criterios si su consulta sólo está delimitada por ubicación. La emulación de Chrome no sustituye probar un teclado físico en iOS o Android.

Validación local del 2026-09-07 en la vista candidata de `127.0.0.1:3318`: **5 pruebas E2E aprobadas** y lint focal aprobado. Precio principal completamente visible a 320 × 640, 390 × 844 y 430 × 932; controles de una fila, acceso tras desplazar 1200 px y acciones del panel alcanzables con altura de 390 px. Se verificó que los gastos desconocidos no se presenten como total conocido. Capturas candidatas: `.sdd-rentals-filter-{320,390,430}.png` y `.sdd-rentals-filter-drawer-{320,390,430}.png` en la raíz, también ignoradas. Este resultado no sustituye la verificación del despliegue ni una prueba en dispositivos físicos.

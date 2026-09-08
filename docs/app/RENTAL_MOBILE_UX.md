# Experiencia móvil de búsqueda de vivienda

La revisión del 8 de septiembre de 2026 responde a usuarios que encontraban la pantalla saturada. El objetivo es llegar antes al presupuesto, la dirección y los avisos, conservando el acceso a los criterios y a la evidencia.

## Primera pantalla y divulgación progresiva

- En `alquiler-ideal-uruguay`, presupuesto primero. Personas, ingresos, otras reservas y preferencias adicionales se abren explícitamente; sus valores configurados siguen visibles en los resúmenes. Una sola acción principal avanza cada paso. La barra de pasos queda debajo de la cabecera de 64 px.
- En los destinos, actividad y dirección quedan visibles; frecuencia, transporte, distancia objetivo y referencia se agrupan en un detalle con resumen editable. Plegar no modifica los valores ni cambia el cálculo.
- En los resultados, precio, características y advertencias preceden a la explicación ampliada. Déficit conocido, exceso de presupuesto y datos faltantes conservan advertencias visibles.
- En `barrios-alquileres-uruguay`, búsqueda, Filtros/Lista/Mapa y criterios activos preceden a los datos. La lista inicia por menor valor, con muestras insuficientes al final. La página independiente sólo muestra Aplicar/Cancelar cuando hay una selección; el selector modal conserva esas acciones siempre.
- En el directorio y oportunidades, ubicación y presupuesto preceden a los ajustes especializados. Reabrir un panel no expande automáticamente todos los grupos con criterios activos: sus resúmenes muestran los valores. Los errores en campos plegados abren el grupo y enfocan el campo.
- Los enlaces secundarios del encabezado se revelan a demanda en móvil. El enlace de oportunidades para explorar el directorio permanece visible. El HTML inicial y CSS definen el estado cerrado antes de hidratar; no debe depender del ancho que JavaScript detecte después.
- El aviso inicial de cookies sigue en el flujo, con aceptar y rechazar equivalentes. Acortar su presentación no modifica el consentimiento ni habilita instalaciones, ventanas automáticas o seguimiento adicional.

## Comprobaciones que deben conservarse

Probar una primera visita sin preferencias ni consentimiento preguardados. A 320 y 390 px, el presupuesto del planificador y los primeros precios de barrios deben estar en la primera pantalla; no reducir textos de entrada por debajo de 16 px ni las áreas táctiles por debajo de 44 px para conseguirlo. Revisar también 430 px, escritorio y pantalla corta.

Abrir y cerrar opciones con valores, volver de resultados a edición, cancelar borradores, enviar números inválidos dentro de grupos plegados, usar direcciones y mapa, comparar viviendas y comprobar que no se persisten datos del hogar. Inspeccionar capturas además de las aserciones: ausencia de desborde no demuestra una pantalla despejada.

Las suites E2E relevantes son `rental-fit.spec.ts`, `rental-zones.spec.ts`, `rentals-filter-experience.spec.ts` y `property-opportunities.spec.ts`. Cada ejecución paralela necesita su propio directorio de resultados. El servidor de desarrollo debe estar estable, sin cambios de fuentes durante la verificación, para evitar carreras de hidratación tras actualizaciones de rutas.

La verificación final también se realiza contra un build optimizado. Usar `NODE_OPTIONS=--max-old-space-size=8192`, igual que el despliegue: el límite predeterminado local agotó memoria en Nitro. Con el build final, la primera visita a 320 × 740 y 390 × 844 cargó e interactuó correctamente, sin cerrar cookies: presupuesto visible, una sola acción principal, barra de pasos de 62 y 54 px respectivamente y ningún desborde horizontal.

La captura de referencia de producción encontró el presupuesto a 1.121 px y una barra de pasos de 120 px en una pantalla de 320 × 844; los enlaces relacionados del directorio ocupaban 132 px. Estas mediciones describen esa captura, no métricas de todos los usuarios.

Referencias: [divulgación progresiva de Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/) y [controles de revelado de Apple](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls). Se aplican a la jerarquía y descubribilidad; no reemplazan la prueba del recorrido real.

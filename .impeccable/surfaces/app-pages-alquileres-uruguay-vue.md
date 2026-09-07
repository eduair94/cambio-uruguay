---
version: 1
slug: "app-pages-alquileres-uruguay-vue"
primary_target: "app/pages/alquileres-uruguay.vue"
related_targets: ["app/components/rentals/SearchFilters.vue","app/components/rentals/SavedPanel.vue"]
---

# Búsqueda de alquileres: decisiones de experiencia

## Alcance y modo

Modo Operate. Personas que buscan un alquiler mensual en Uruguay y comparan varias fuentes,
normalmente desde el celular. La interfaz conserva el sistema visual de Cambio Uruguay.

## Recorrido principal

1. Elegir departamento, varios barrios, rango de alquiler base en UYU, tipo y dormitorios.
2. Confirmar la búsqueda explícitamente; editar no recarga resultados ni altera la URL. Cambiar departamento puede consultar su lista de barrios.
3. Afinar mediante grupos desplegables: total mensual y gastos, características, garantías,
   portal y disponibilidad, cercanía a salud. Los grupos con criterios aplicados se abren al entrar.
4. Comparar costo total conocido y su desglose del mismo aviso. La ficha reúne contacto y servicios
   cercanos, con sus límites y procedencia. Guardar candidatos y volver al portal original.

La URL representa los filtros confirmados. Atrás/Adelante y las búsquedas guardadas deben restaurar
la misma selección. Limpiar también vacía un borrador que nunca se envió.

En móvil, el acceso a filtros permanece visible bajo la cabecera al recorrer resultados. El diálogo usa un panel lateral derecho y mantiene Cerrar, Limpiar y Aplicar fuera de su área desplazable. Cancelar descarta el
borrador y conserva la posición; Aplicar confirma la búsqueda y enfoca los resultados. Respetar
el viewport visible y las áreas seguras, con objetivos táctiles de 48 px y texto de campos de 16 px.

## Veracidad de los resultados

- El presupuesto mensual está en UYU e incluye alquiler y gastos comunes publicados por una misma
  oferta. Cero explícito es distinto de desconocido. No estimar gastos ausentes.
- Fuente, moneda, dueño, precio, gastos, mascotas, garaje, amueblado y garantías deben satisfacerse
  en un mismo aviso. No mezclar condiciones de un anunciante con el precio de otro.
- El orden `total` compara alquiler + GC conocidos de las ofertas que cumplen todos los criterios.
  Los totales desconocidos quedan al final; no desaparecen y no se inventan gastos. La mediana
  del alquiler base no cambia por elegir otro orden.
- Mascotas, garaje, amueblado y garantías son declaraciones del origen, no verificaciones propias.
- Mostrar última lectura sin inventar una hora cuando el origen sólo conserva el día.
- La vigencia pública se evalúa por aviso: otro portal no rejuvenece una oferta antigua.
- Mapa y lista comparten criterios. Informar cuántas propiedades tienen coordenadas; no pedir el
  mapa hasta abrirlo. Sólo dibujar un círculo si hay una única sede de referencia.

## Guardados

Son locales a este navegador: hasta 12 búsquedas y 60 propiedades, sin cuenta ni alertas por correo.
Los favoritos conservan una copia fechada para comparar hasta cuatro propiedades. Mostrar datos
desconocidos y enlaces originales; una copia guardada no prueba disponibilidad actual. Informar
fallos de almacenamiento y pedir quitar un elemento cuando se alcance el límite, sin expulsarlo
silenciosamente desde la interfaz.

## Cobertura y próximos pasos

## Contexto de la vivienda y anunciantes — septiembre de 2026

Las fichas y los paneles del mapa incorporan servicios cotidianos cercanos: supermercado,
almacén, farmacia, salud, transporte y educación. Son distancias en línea recta desde un punto
publicado aproximado, con un enlace para consultar una ruta peatonal real. No estiman tiempos,
calidad del servicio ni necesidad de automóvil. Mostrar estados de carga, error, ubicación
insuficiente y cobertura parcial; nunca convertir la ausencia de puntos en ausencia de servicios.
Una lista compacta muestra el lugar más cercano por categoría y permite expandir alternativas.

El contacto comercial conserva su anuncio, fuente y fecha. Sus acciones necesitan un clic;
no disparan consultas ni mensajes automáticamente. El perfil de inmobiliaria enlaza avisos
mediante un identificador del portal, sin unir marcas o empresas por parecido de nombre.
“Particular” describe al anunciante; el filtro “dueño directo declarado” exige evidencia expresa
del mismo aviso y no certifica titularidad ni ahorro de comisión.

## Cobertura previa

Casasweb e Inmuebles El País se suman mediante sus páginas públicas; la cobertura parcial debe
permanecer explícita. Las pruebas de descarga no equivalen a altas netas de propiedades. Medir el
incremento único y la antigüedad después del primer relevamiento desplegado.

Gallito requiere acceso estable antes de incorporarlo al índice. Ampliar garantías más allá de
las tres publicadas requiere medir la precisión de extracción, no sólo agregar una casilla.
Alertas, búsquedas por trayecto y nuevos puntos de interés quedan para iteraciones con datos e
infraestructura propios. Ver la investigación fechada en
[rentals-ux-2026-09-04.md](../../docs/research/rentals-ux-2026-09-04.md).

## Iteración de filtros — 2026-09-07

Referencia pública fechada: [Mercado Libre, InfoCasas y Marketplace](../../docs/app/RENTALS_FILTER_BENCHMARK.md). La barra móvil concentra Filtros, vista, alertas y un menú
para guardar/compartir. La tarjeta muestra foto y precio juntos; total mensual sólo cuando está
publicado, con alquiler y gastos desglosados. Los criterios activos se pueden quitar individualmente
y el estado sin resultados ofrece modificar o retirar un criterio sin borrar toda la búsqueda.

Los rangos se validan antes de normalizar. Un máximo cero no se descarta silenciosamente:
se pide un importe positivo o dejar vacío. Gastos comunes cero conserva su significado expreso.
Limpiar en los paneles móviles de alquiler, venta, oportunidades y presupuesto sólo modifica el
borrador hasta aplicar. Cerrar y Escape conservan resultados, URL, foco y posición.

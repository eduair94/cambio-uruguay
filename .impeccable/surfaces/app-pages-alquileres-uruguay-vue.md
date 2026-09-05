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

1. Elegir departamento, varios barrios, tipo de propiedad, dormitorios y presupuesto mensual.
2. Enviar la búsqueda explícitamente; escribir no dispara consultas ni altera la URL.
3. Afinar características, gastos, garantías, anunciante, fuente o cercanía a salud con Más filtros
   en escritorio o con el botón fijo Filtros en el celular.
4. Comparar el alquiler y los gastos del mismo aviso, guardar candidatos y volver al portal original.

La URL representa los filtros confirmados. Atrás/Adelante y las búsquedas guardadas deben restaurar
la misma selección. Limpiar también vacía un borrador que nunca se envió.

En móvil, el acceso a filtros permanece fijo al recorrer resultados. El diálogo usa pantalla
completa y mantiene Cerrar, Limpiar y Aplicar fuera de su área desplazable. Cancelar descarta el
borrador y conserva la posición; Aplicar confirma la búsqueda y enfoca los resultados. Respetar
el viewport visible y las áreas seguras, con objetivos táctiles de 48 px y texto de campos de 16 px.

## Veracidad de los resultados

- El presupuesto mensual está en UYU e incluye alquiler y gastos comunes publicados por una misma
  oferta. Cero explícito es distinto de desconocido. No estimar gastos ausentes.
- Fuente, moneda, dueño y presupuesto deben satisfacerse en un mismo aviso.
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

Casasweb e Inmuebles El País se suman mediante sus páginas públicas; la cobertura parcial debe
permanecer explícita. Las pruebas de descarga no equivalen a altas netas de propiedades. Medir el
incremento único y la antigüedad después del primer relevamiento desplegado.

Gallito requiere acceso estable antes de incorporarlo al índice. Ampliar garantías más allá de
las tres publicadas requiere medir la precisión de extracción, no sólo agregar una casilla.
Alertas, búsquedas por trayecto y nuevos puntos de interés quedan para iteraciones con datos e
infraestructura propios. Ver la investigación fechada en
[rentals-ux-2026-09-04.md](../../docs/research/rentals-ux-2026-09-04.md).

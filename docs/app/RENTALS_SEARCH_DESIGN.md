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

En pantallas menores de 960 px, Filtros permanece en el borde inferior aunque la persona esté
leyendo las últimas propiedades. Abre un diálogo de pantalla completa con encabezado y acciones
fuera del área desplazable. No requiere volver al inicio. Cerrar o Escape descartan el borrador
y restituyen el foco y la posición de lectura; Aplicar confirma la URL y lleva al resultado.
Limpiar dentro del diálogo sólo vacía el borrador hasta que se aplica. La altura responde al
viewport visible, con espacio para áreas seguras y el acceso al chat. Las acciones miden al menos
48 px y los campos usan texto de 16 px para evitar el zoom al enfocarlos en móviles.
Los cierres de barrios, garantías y filtros activos tienen un área táctil de 44 px. Al elegir
un barrio, el autocompletado limpia inmediatamente el término escrito: evita que el campo cambie
de altura al tocar el control siguiente y que ese toque se pierda.
El espacio del campo de texto se conserva también al perder el foco. Las filas de selección
acompañan los 44 px del cierre y las etiquetas largas se envuelven dentro de la pantalla, sin
superponer ni recortar los botones de quitar.

Los barrios se seleccionan y agrupan con collation española de nivel primario: Cordón, CORDON y
cordon comparten resultados y faceta. El autocompletado admite escribir sin tildes. La collation
española conserva la distinción entre n y ñ; el selector entrega la etiqueta canónica elegida.
Las agregaciones de lista y mapa usan la misma configuración. Los índices binarios existentes
no resuelven comparaciones de texto con esta collation: en la muestra histórica de 8.384 filas,
la selección de Malvín pasó de 5 a 25 ms y Montevideo con 2+ dormitorios de 82 a 92 ms. Son
mediciones locales, no latencias de producción. No se agregan índices sin una necesidad medida;
si el crecimiento lo exige, crear índices con esta collation y nombres nuevos explícitos.

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
[rentals-ux-2026-09-04.md](../research/rentals-ux-2026-09-04.md).

## Validación y publicación

El recorrido E2E cubre presupuesto del mismo aviso, URL y Atrás, rangos inválidos, guardados tras
recargar, comparación con gastos cero o desconocidos, mapa bajo demanda y paginación con 2.400
resultados. Los escenarios móviles de 320 y 390 px abren filtros desde un scroll profundo,
seleccionan varios barrios, cancelan y aplican, comprueban foco y posición, y reducen la altura
visible a 360 px para verificar las acciones. La emulación de altura no reproduce un teclado
nativo ni certifica todos los dispositivos físicos.

La publicación pasa por las suites generales de app y backend, el control de secretos y las
compilaciones estables de cada superficie, con intercambio atómico de la salida del servidor.
El backend compila con su `sheet_key.json` real; esa credencial no se copia al entorno local.
Las descargas exploratorias no equivalen a altas netas: la ampliación efectiva se mide con la
metadata pública y las facetas después del primer relevamiento desplegado.

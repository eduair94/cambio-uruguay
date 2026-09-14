# Fletes y mudanzas: Montevideo y Canelones

Relevamiento público del 14 de septiembre de 2026. Archivo: `montevideo.json`.

## Alcance y resultado

26 fichas: 21 sitios propios y 5 perfiles en directorios comerciales. 189 tarifas numéricas publicadas, de las cuales 132 corresponden a 66 destinos de Transportes Sánchez con dos modalidades. Una plataforma, Flety, está identificada como intermediaria. No se presenta este recuento como un censo ni como proveedores cuya disponibilidad haya sido comprobada por teléfono.

La búsqueda combinó fletes, mudanzas, camión chico/mediano/grande, precios por hora, ayudantes, embalaje, elevaciones, guardamuebles y armado. Se amplió de Montevideo a Paso Carrasco, Ciudad de la Costa, Solymar, Pando, Las Piedras, Pinamar, Atlántida, Las Toscas y Costa de Oro. Las búsquedas nacionales permitieron seguir empresas locales que viajan al interior. Se abrieron las páginas originales o las fichas comerciales completas; los fragmentos de buscadores sólo se usaron para descubrimiento.

Se recolectaron teléfonos y correos comerciales visibles y destinos de enlaces públicos de contacto. No se enviaron mensajes, formularios ni solicitudes de presupuesto. No se utilizó ninguna sesión privada, login ni datos ocultos de portales.

## Tarifas que permiten comparar

- [SOSE](https://sosetransporte.uy/) publica camiones a $1250, $1550 y $1750 por hora más IVA, mínimo dos horas. Incluye dos peones, embalaje y seguro declarado.
- [Los Piñones](https://mudanzasmontevideo.uy/) fecha su tarifa en septiembre de 2026: $1750/h, camión cerrado de 5 m, chofer y dos ayudantes. Declara que no cobra IVA; no se adopta la interpretación contraria de artículos de terceros.
- [FletesBox](https://fletesbox.com/servicios/) publica paquetes con y sin carga/descarga, limpieza y embalaje. Sus zonas se refieren a su propio mapa, no a todo Montevideo. La capacidad de 12 m³ aparece con cargas máximas distintas según plan.
- [DT](https://www.dt.com.uy/packs-mudanzas.html) muestra paquetes por duración, tamaño y personal. Las horas adicionales varían incluso entre paquetes parecidos: se conservan como se publican. Armado MDF e instalaciones son servicios adicionales y no el precio de la mudanza.
- [Sánchez](https://www.fletesymudanzas.uy/) cobra algunos servicios por bloques de 30 minutos. La unidad se conserva en la etiqueta del registro; no se multiplica artificialmente para aparentar tarifa horaria.

## Tabla de destinos nacionales

Se extrajeron las seis tablas HTML de [Transportes Sánchez](https://www.fletesymudanzas.uy/camion-grande-de-mudanzas/): Interbalnearia/9, 1/21, 8/18, 2, 3 y 5. Cada fila conserva destino, ruta, distancia publicada y precio sin/con peones. Hay 66 filas y 132 tarifas; incluye peajes, viáticos y una hora de carga/descarga. Después se añaden $950 cada media hora de camión y $150 por peón cada media hora. La cantidad de peones del paquete no se publica.

La ruta en la etiqueta diferencia las dos localidades llamadas Santa Ana. Se mantiene la grafía original de los destinos: no se convierte un destino-ciudad en cobertura departamental completa ni se transforma la tabla en tarifa universal por kilómetro. El camión nacional de 23 m³ y el local de 20 m³ son unidades distintas según el proveedor.

## Servicios complementarios verificados

[Sánchez](https://www.fletesymudanzas.uy/501-2/) publica armado de muebles de una o dos personas y alquiler de peones sin camión. Su limpieza se deriva a WP Servicios, por lo que no se presenta como cuadrilla propia. [Dante](https://empresadante.com.uy/deposito/) publica depósito desde $3800 por mes con IVA, mínimo un mes y traslados separados. Su [responsabilidad por roturas](https://empresadante.com.uy/servicio-de-mudanzas/) tiene un límite económico y exclusiones para contenido no embalado por la empresa. Esas restricciones importan más que una etiqueta genérica de «asegurado».

## Deduplicación y límites

- SOSE y fletesmontevideo.uy comparten el 096 779 565: una sola ficha. Mudanzas Gustavo y Fletes Gustavo comparten 094 922 586: una sola ficha.
- mudanzasmontevideo.uy es Los Piñones; mudanzasenmontevideo.uy publica otro contacto (095 060 225). Nombres y tarifas parecidos no prueban identidad empresarial.
- No se copiaron teléfonos de testimonios particulares ni precios anecdóticos de Reddit. Los importes nominales de $1/$100/$200 en listados de Mercado Libre no establecen qué servicio se vende y no se publican como tarifas de mudanza.
- Los directorios agregados mezclaron Atlántida uruguaya con localidades argentinas; se descartaron teléfonos y fichas de esos resultados.
- Rápido Blanes quedó pendiente: dominio bloqueado para esta lectura y contactos discordantes en terceros. IMB: dominio sin resolver. Transportes Andes: portada vacía sin renderizado y sin tarifa; quedó pendiente de verificación adicional.
- Fletes Oriental pudo leerse por HTTP; su HTTPS presentó certificado vencido. No se omite la falla en su ficha.
- POA conserva una presentación comercial antigua, sin actualización fechada; se marca la incertidumbre. Fletes Sosa tiene diferencias en la fecha de verificación publicada por el directorio y el índice: no se usa como vigencia.
- En las fichas de Atlántida, Costa de Oro y Laura se conserva explícitamente que son fuentes de directorio y se omiten las capacidades desconocidas. Fletes Atlántida anuncia logística nacional, pero la asistencia para mover muebles debe confirmarse.
- Salvo Los Piñones, las tarifas no informan una fecha de vigencia. `accessedAt` es el día de lectura, no una afirmación de renovación del precio. Ausencia de IVA, seguro, ayudantes, volumen o precio significa dato desconocido.

## Verificación del archivo

JSON válido; identificadores únicos; montos positivos; todas las tarifas tienen URL presente en las fuentes de su ficha. Los precios por paquete, por hora, por artículo, por mes y por m² no se mezclan. Las dimensiones son interiores únicamente cuando la fuente lo especifica. No se calcularon m³ a partir de largos parciales ni se asignó un tamaño de vivienda como garantía de que entre en un viaje.

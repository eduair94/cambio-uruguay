# Revisión complementaria de Mercado Libre y Facebook Marketplace

Revisión: 14 de septiembre de 2026. Resultado: **169 tarjetas revisadas, nueve fichas originales seleccionadas e intentadas, cero proveedores nuevos suficientemente verificados para publicar**. `marketplace-verified.json` es un array vacío deliberadamente. Esto no implica que los anunciantes hayan dejado de operar: la limitación es de identidad y evidencia accesible en esta revisión.

## Insumos y alcance

Se revisaron las cuatro proyecciones de los lectores ya existentes, sin contactar anunciantes ni iniciar sesión:

| Archivo | Tarjetas recibidas | Alcance observable |
| --- | ---: | --- |
| `mercadolibre-fletes-discovery.json` | 50 | Primera página de 69 resultados declarados; no es una cosecha completa. |
| `mercadolibre-armado-discovery.json` | 50 | Primera página de 858 resultados; mezcla muebles, herramientas y servicios. |
| `facebook-fletes-discovery.json` | 36 | Sin metadatos de paginación en la proyección. |
| `facebook-armado-discovery.json` | 33 | Sin metadatos de paginación en la proyección. |

Los cuatro archivos tienen lecturas fechadas entre 04:59:22 y 04:59:57 UTC del 14/09/2026. Sus tarjetas aportan título, URL, importe y, cuando está disponible, localidad; no traen una descripción verificable de alcance, condiciones o unidad de cobro. El importe de una tarjeta no se convirtió en tarifa. Tampoco se convirtió cada anuncio en una empresa distinta.

## Pistas y comprobación de originales

La apertura mediante el lector web no devolvió contenido útil en las primeras fichas seleccionadas. Una lectura HTTP pública adicional, sin autenticación ni medidas para eludir restricciones, permitió identificar los límites siguientes:

| Pista de descubrimiento | Original intentado | Resultado y decisión |
| --- | --- | --- |
| Centro Fletes; teléfono escrito en el título `096 716 121` | [MLU1447083766](https://servicio.mercadolibre.com.uy/MLU-1447083766-centro-fletes-mudanzas-montevideo-096-716-121-aguada-pocitos-_JM) | HTTP 403, página de error. Sin identidad comercial corroborada o ficha original legible; no se publica. |
| Camiones grandes/medianos y peones; título `O96716121` | [MLU691649793](https://servicio.mercadolibre.com.uy/MLU-691649793-fletes-mudanzas-camiones-grandes-medianos-peones-o96716121-_JM) | HTTP 403. El título usa una letra O inicial. Es una posible relación con la pista anterior, no prueba suficiente para unir anunciantes o inventar un nombre. |
| Fletes chicos y económicos; título `094021952` | [MLU695483273](https://servicio.mercadolibre.com.uy/MLU-695483273-fletes-chicos-y-economicos-094021952-mudanzas-traslados-_JM) | HTTP 403. Las búsquedas del teléfono devuelven tarjetas de categorías, sin una identidad comercial adicional verificable. |
| Armado de muebles, traslados, trabajos con garantía | [MLUU2439802402](https://www.mercadolibre.com.uy/armado-de-muebles-traslados-trabajos-con-garantia/up/MLUU2439802402) | HTTP 403. Se reconoce una posible oferta de servicio, pero no su proveedor ni las condiciones de la garantía. |
| Armador de muebles en el día | [MLUU2435654201](https://www.mercadolibre.com.uy/armador-de-muebles-en-el-dias-roperos-muebles-todos/up/MLUU2435654201) | HTTP 403. No se obtuvo identidad, contacto comercial ni tarifa con unidad. |
| GASCOTRANSPORTES FLETES MUDANZAS REPARTOS, Las Piedras | [Facebook 1034739215930124](https://www.facebook.com/marketplace/item/1034739215930124/) | HTTP 200 con título coincidente, pero sin cuerpo textual visible en la respuesta. No se obtuvo contacto o condiciones del servicio. Las búsquedas por nombre no corroboraron una web original local. |
| Fletes FREDDY, Montevideo | [Facebook 1707844227235719](https://www.facebook.com/marketplace/item/1707844227235719/) | HTTP 200 con título y `hidden information`, sin cuerpo textual visible. No se intentó recuperar ni inferir información oculta. |
| Armado de muebles, Florida | [Facebook 28341383795526222](https://www.facebook.com/marketplace/item/28341383795526222/) | HTTP 200 con título genérico y localidad, sin cuerpo textual visible. No permite identificar al prestador. |
| Armado de muebles prefabricados, Melo | [Facebook 4549776915245630](https://www.facebook.com/marketplace/item/4549776915245630/) | HTTP 200 con título genérico y localidad, sin cuerpo textual visible. No permite identificar al prestador. |

No se deduce cobertura a partir de una localidad de Marketplace. Un título con “camión 6 metros” o “9 metros” tampoco demuestra volumen útil, ancho, altura o capacidad de carga; esas tarjetas quedaron como pistas, sin incorporarlas a `vehicles`.

## Ruido y límites de los resultados

La búsqueda de armado de Mercado Libre encuentra sobre todo productos: muebles de TiendaMax, galpones que incluyen armado, herramientas para armadores y estanterías de fácil armado. Un producto que incluye montaje no prueba la existencia de un servicio independiente para muebles comprados antes de mudarse. Entre los títulos revisados destacaron las dos posibles ofertas independientes de la tabla, cuyas fichas no pudieron verificarse.

En fletes también aparecen productos o cargos de tienda, como “Complemento de flete para artículos jardín” y un pulpo elástico para tráiler. No se incorporaron como empresas de mudanzas. Varios títulos de Facebook son sólo localidades, lo que reduce aún más la utilidad de la proyección para identificar al prestador.

La búsqueda por el nombre Gasco produjo empresas de gas de otros países; no existe evidencia para vincularlas al aviso de Las Piedras. Las búsquedas por teléfonos también producen coincidencias numéricas ajenas a Uruguay. Se descartaron sin asociar nombres, teléfonos o precios de entidades distintas.

Las [tarjetas de servicios en Prado](https://servicios.mercadolibre.com.uy/mudanzas-traslados/mudanzas-fletes-en-prado-montevideo/) permiten reencontrar el título con `094021952`, pero no sustituyen la lectura de la ficha. “Precio a convenir” en una categoría no habilita a tomar un importe diferente de otra tarjeta como tarifa vigente.

## Siguiente mejora del relevamiento

La vía útil es afinar el descubrimiento a la categoría de servicios de armado, paginar los fletes hasta su límite declarado y conservar enlaces hacia el perfil comercial visible de cada anunciante. La incorporación al directorio debe esperar una ficha propia o una web comercial accesible que corrobore identidad y contacto, o una tarifa con unidad y alcance. Los importes de tarjeta y las restricciones de lectura deben conservarse como evidencia de descubrimiento, separados de las ofertas publicables.

No se publicaron contactos deducidos, importes sin unidad, fechas de publicación inferidas ni cifras de cobertura total del mercado. No se modificaron los directorios ya verificados.

# Asistente y directorios

`/asistente-ia` y `/buscar-con-ia` enlazan los buscadores de monopatines,
bicicletas eléctricas, celulares, sillas, equipar la casa, alquileres, autos y
supermercados mediante `AssistantDirectories.vue`.

El recorrido inverso usa `AssistantCta`: la pregunta viaja en `q` y el origen en
`topic`. Sólo se aceptan los temas de `ASSISTANT_TOPICS`; los destinos y las
instrucciones salen del registro local `utils/assistantDirectories.ts`, nunca
de una URL arbitraria. El asistente muestra el origen y un enlace al buscador.
Los enlaces del HTML inicial conservan el canonical sin parámetros; el contexto
se añade al hidratar. Sólo se transfieren filtros públicos, nunca formularios
privados ni direcciones de referencia.

En movilidad el CTA está junto a los filtros y resultados de `EquiparDirectorio`.
Los chips activos arman la pregunta en español, inglés o portugués. Al conectarse
se envía una vez y se retira `q` de la barra del navegador. Si llega otra pregunta
con una conversación abierta, se deja en el editor para que el visitante la envíe.

No se necesita otro servidor MCP: ambos proveedores del chat usan el servidor
existente con todos sus toolsets, incluido `productos`. El contexto inicial indica
`search_products` con `vertical=monopatines` o `bicicletas-electricas`; las otras
herramientas siguen disponibles para cambiar de tema o consultar una guía.
Las ofertas se leen de `/api/movilidad/productos`, el mismo directorio que ve el
visitante, y sus enlaces conservan la búsqueda. La normativa se consulta mediante
`search_site`/`read_page`; las cifras de un pasaje antiguo no sustituyen el catálogo.

Verificación: pruebas unitarias de `assistantDirectories`, `assistantPrompt`,
`assistantMovilidadFilters`, `geminiChat` y `puterChat`; prueba de navegador
`assistant-directories.spec.ts` con proveedor y MCP simulados (sin consumir cuota).
El paquete `mcp/` tiene sus propias pruebas y build, y requiere su despliegue
separado para publicar cambios en herramientas.

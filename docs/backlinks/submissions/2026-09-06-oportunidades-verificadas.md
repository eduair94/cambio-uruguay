# Oportunidades verificadas — 2026-09-06

Se cruzaron `tracker.csv`, el pack del 2026-09-04 y fuentes oficiales en vivo. Se distinguen solicitudes enviadas de enlaces aceptados: un issue o PR abierto todavía no demuestra inclusión ni tráfico.

| Canal | Estado y evidencia | Reglas / encaje |
|---|---|---|
| [APIs.io](https://apis.io/add/) | Solicitud enviada: [inbox #23](https://github.com/api-search/inbox/issues/23). No listado antes del envío: búsqueda del catálogo `q=cambio-uruguay&limit=50` entregó las 25 APIs y los 23 proveedores coincidentes, ninguno con el dominio; tampoco había issue previo ni repositorio en api-evangelist. | [Reglas oficiales](https://github.com/api-search/inbox): alta gratuita mediante formulario o issue. Se enviaron URLs públicas de OpenAPI, llms.txt, MCP, ejemplo JSON y sitio. Disclosure de autoría explícito. La solicitud no requiere inventar una dirección física ni compartir datos personales. |
| [awesome-rest-apis](https://github.com/dspinellis/awesome-rest-apis) | Enviado [PR #26](https://github.com/dspinellis/awesome-rest-apis/pull/26). Nueva oportunidad, ausente del tracker. README e issues/PRs sin Cambio Uruguay antes del aporte. Mantenedor aceptó tres PRs el 2026-08-18. | [Reglas](https://github.com/dspinellis/awesome-rest-apis/blob/master/contributing.md): sin registro, utilidad general, orden alfabético, documentación HTTP200, ejemplo JSON con colección de al menos 3 elementos, un aporte por PR. Categoría Business and finance. Nuestro ejemplo devuelve 200 cotizaciones y pasa ambos validadores aislados; fallas ajenas de recorridos completos documentadas en el PR. |
| [APIs.guru](https://apis.guru/add-api/) | Solicitud enviada por el agente principal: [openapi-directory #3254](https://github.com/APIs-guru/openapi-directory/issues/3254). Sin issue previo al envío según búsqueda GitHub. | [Reglas](https://github.com/APIs-guru/openapi-directory/blob/main/CONTRIBUTING.md): alta mediante formulario, definición legible por máquina en URL estable, API pública/persistente/útil. No enviar un PR directo a los archivos generados. La spec ya existía: `/api-docs.json`, OpenAPI 3.0.0, 54 rutas, HTTP200. |
| [Glama](https://glama.ai/mcp/servers) | Canal ya conocido, sin afirmar alta todavía; ejecución a cargo del agente principal. Es prioritario por el PR pendiente punkpeye #9525 señalado en el tracker. | Directorio activo, actualizado el 2026-09-06. El MCP hosteado fue comprobado con initialize: HTTP200, `serverInfo.name=cambio-uruguay`. Debe obtenerse una ficha real antes de usar o anunciar un badge. |

## Canales retirados de la lista inmediata

- **PulseMCP**: [altas y cambios pausados](https://www.pulsemcp.com/submit), aviso actualizado el 2026-09-03. Recomiendan publicar primero en el registro oficial; dicen que lo recogerán cuando reabran. No se promete fecha.
- **mcp.so**: el [formulario actual](https://mcp.so/submit?type=server) cobra USD39. No es una oportunidad gratuita como insinuaba el documento de julio. No se compró.
- **made-in-uruguay**: lista pequeña (9 estrellas), último push 2025-02-13 y sin TypeScript en sus categorías. Menor prioridad que APIs.io o el catálogo mantenido de Spinellis.
- **wong2/awesome-mcp-servers**: comprobación del agente principal: PRs deshabilitados; el bloqueo ya no se explica sólo por el fork renombrado.
- **appcypher/awesome-mcp-servers**: comprobación del agente principal: archivado el 2026-08-01 y PRs deshabilitados.

No se infiere dofollow del dominio de GitHub ni se promete una cantidad de visitas. Los canales técnicos aquí elegidos permiten encontrar y reutilizar una API de propósito definido; su beneficio de tráfico debe medirse después de la aceptación/publicación.

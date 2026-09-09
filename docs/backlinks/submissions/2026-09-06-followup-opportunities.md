# Seguimiento técnico — 2026-09-06

Alcance: revisar las tres solicitudes existentes y enviar como máximo una contribución adicional pertinente. No se repitieron solicitudes ni se modificó el tracker o el registro general de campaña.

## Solicitudes existentes

| Solicitud | Estado comprobado | Acción |
|---|---|---|
| [APIs.guru #3254](https://github.com/APIs-guru/openapi-directory/issues/3254) | OPEN, sin comentarios | No hay feedback que corregir. |
| [APIs.io #23](https://github.com/api-search/inbox/issues/23) | OPEN, sin comentarios | No hay feedback que corregir. |
| [awesome-rest-apis #26](https://github.com/dspinellis/awesome-rest-apis/pull/26) | OPEN, sin comentarios ni reviews; mergeStateStatus BLOCKED | El workflow [Validate](https://github.com/dspinellis/awesome-rest-apis/actions/runs/34012358133) terminó `action_required`. No es un rechazo del aporte ni un resultado de validación de código; necesita intervención externa para ejecutar Actions. Se conserva el PR existente. |

## Canal descartado

[mcp-get](https://github.com/michaellatman/mcp-get) está archivado. El README actual indica expresamente que no acepta nuevas issues ni pull requests. La recomendación de contribuir al registro en el documento anterior quedó desactualizada; no se envió nada.

## Contribución nueva: awesome-quant

Destino: https://github.com/wilsonfreitas/awesome-quant
Normas: https://github.com/wilsonfreitas/awesome-quant/blob/main/CONTRIBUTING.md

Encaje: Market Data & Data Sources permite implementación pública sustantiva y mantenida, además de datos útiles para análisis financiero. Cambio Uruguay contiene los recolectores, normalización, almacenamiento histórico y servidor API/MCP, no sólo ejemplos o una integración del servicio. La entrada se acota a cotizaciones minoristas uruguayas, por fuente y tipo, útiles para estudiar spreads y series históricas; no las presenta como cotizaciones ejecutables o institucionales. La documentación raíz y mcp/README.md tienen instrucciones de uso. El repositorio recibió commits el 2026-09-06.

Se verificó ausencia en README y búsqueda GitHub de issues/PRs abiertos y cerrados. La lista está activa: incorporó contribuciones de terceros el 2026-09-01. Es gratuita y requiere dos workflows propios antes de aceptar: Validate PR y PR Review.

Entrada exacta:

```markdown
- [Cambio Uruguay](https://cambio-uruguay.com) - `TypeScript` `REST` `MCP` - Collectors and public API for Uruguayan retail buy/sell exchange rates and historical series by source and quote type. [GitHub](https://github.com/eduair94/cambio-uruguay)
```

Preparación aislada en `dist/backlink-submissions/awesome-quant`. Commit `384f4b5`, rama `eduair94:add-cambio-uruguay`. Validación local: `git diff --check` pasa; `python scripts/validate_readme.py --diff-from origin/main` valida la única entrada y pasa; `python site/generate.py` genera el sitio existente desde su CSV. El parser directo del README se comprueba aparte para asegurar que lee la nueva entrada. Un primer assertion buscó una clave incorrecta (`name`) del resultado del parser; se corrigió la comprobación, sin cambiar código upstream.

Ejemplo histórico comprobado: https://api.cambio-uruguay.com/evolution/brou/USD?period=6 retorna 370 observaciones, con `origin`, `code`, `type`, `buy`, `sell` y `date`; abarca 2026-03-06 a 2026-09-06. La presencia de tipos distintos en un mismo día es parte de la semántica y no se presenta como una única tasa diaria.

PR enviado por GitHub MCP y confirmado: [awesome-quant #634](https://github.com/wilsonfreitas/awesome-quant/pull/634). Estado OPEN, una línea agregada a README, commit `384f4b5219e3448e271873df534c44f5190f5a25`. La descripción declara que el autor mantiene Cambio Uruguay y enlaza documentación, ejemplo y archivos concretos de la implementación. Todavía no está aceptado ni incorporado al directorio publicado.

Comprobación posterior: ambos workflows obligatorios terminaron **success** sobre este envío: [Validate PR](https://github.com/wilsonfreitas/awesome-quant/actions/runs/34013117014) y [PR Review](https://github.com/wilsonfreitas/awesome-quant/actions/runs/34013116984). El PR permanece abierto, sin comentarios y sin conflictos de merge; la aprobación editorial sigue a cargo del mantenedor.

# Cambio Uruguay → awesome-rest-apis

Destino: https://github.com/dspinellis/awesome-rest-apis
Reglas: https://github.com/dspinellis/awesome-rest-apis/blob/master/contributing.md
Verificado: 2026-09-06.

Encaje: API REST pública sin registro, de utilidad para residentes, visitantes y desarrolladores que trabajan con monedas de Uruguay. La lista tiene sección Business and finance y mantiene aportes externos: tres PRs aceptados el 2026-08-18. No apareció Cambio Uruguay en el README ni en la búsqueda de issues/PRs. El contenido propuesto enlaza documentación y un ejemplo JSON, como exige el mantenedor; no promete un intervalo de actualización de las fuentes.

## Cambio exacto

Insertar en Business and finance antes de CoinPaprika:

```markdown
- [Cambio Uruguay](https://api.cambio-uruguay.com/api-docs) - Buy and sell exchange rates published by Uruguayan exchange houses and banks, with historical series and branch metadata; [example](https://api.cambio-uruguay.com/).
```

## Pull request

Título: Add Cambio Uruguay to Business and finance

```text
Adds Cambio Uruguay, a public REST API for exchange rates published by Uruguayan exchange houses and banks, to Business and finance. It provides buy/sell quotes, historical series and branch metadata without registration or an API key.

Disclosure: I maintain Cambio Uruguay.

The entry follows the documentation-plus-JSON-example format and alphabetical ordering. The documentation returned HTTP 200 and the unauthenticated example returned a JSON array of 200 quote records on September 6, 2026. The wording describes the source of the quotes without promising that every publisher updates its rates on the same schedule.
```

Validación: ambas URLs HTTP 200 usando los User-Agent de los validadores del repositorio. Definición OpenAPI 3.0.0 disponible en https://api.cambio-uruguay.com/api-docs.json (54 rutas, contacto enlaza al sitio principal).

PR enviado: https://github.com/dspinellis/awesome-rest-apis/pull/26
Commit: `03321ca`, rama `eduair94:add-cambio-uruguay`.

Los dos validadores del repositorio pasan sobre la entrada nueva. El recorrido completo de ejemplos ejecutó 20 entradas y detectó tres fallas de servicios sin modificar: FilingFirehose (timeout), api.myip.com (HTTP522), WorldCup (comprobación de revocación TLS de Windows). El recorrido completo de documentación ejecutó 32 URLs y detectó una falla ajena: FilingFirehose (timeout). Ambos recorridos completos confirmaron OK para Cambio Uruguay. `git diff --check` pasó. El cuerpo publicado conserva estas limitaciones: `2026-09-06-awesome-rest-apis-body.md`.

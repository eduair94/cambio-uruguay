# Apps útiles (`/apps-utiles-uruguay`)

Directorio de las apps que sirven para vivir en Uruguay: las del Estado que todos deberían tener
(kit con casillas) y las del día a día, en 10 pestañas con filtros.

## De dónde sale cada cosa

| Qué | Dónde | Quién lo mantiene |
|---|---|---|
| Qué apps entran, qué hacen, a quién le sirven | `app/utils/usefulAppsCatalog.ts` | a mano, con la fecha `USEFUL_APPS_VERIFIED_AT` |
| Paquete, id del App Store, desarrollador | el mismo archivo + `classes/usefulapps/catalog.ts` (paridad testeada) | a mano, copiado de la ficha |
| Ícono, nota, opiniones, última versión, si sigue en la tienda | APP DB `usefulappssnapshots` | job semanal `currency-useful-apps` |
| Kit, "no es una app", criterios, FAQ | `app/utils/usefulAppsContent.ts` | a mano |

## Reglas

- Sólo apps que hoy están en Google Play o en el App Store de **Uruguay**, publicadas por la
  organización que presta el servicio. Una no oficial entra sólo si es muy usada, con `kind:
  'comunidad'`, una nota que lo dice y `officialAlternative`.
- Más de 24 meses sin versión nueva: afuera, salvo que sea la única oficial de su servicio (INUMET,
  la app de la IM, Consulta de Expedientes); la tarjeta lo avisa sola con el dato del job.
- El desarrollador se copia **de la ficha**, nunca de la investigación: es lo que el lector compara
  antes de instalar.
- Sin afiliados; `rel="noopener noreferrer nofollow"`.

## El job

Ver la fila `currency-useful-apps` en `AGENTS.md`. Sólo lee `play.google.com/store/apps/details` y
`apps.apple.com/uy/app/id…` (robots.txt las permite); `itunes.apple.com` está en Disallow. La fecha
de versión no viene en el JSON-LD: Play la rotula "Actualización" en el HTML y el App Store la
trae en `versionHistory`.

Tres cosas que salieron de la revisión del 30/9/2026 y que no hay que deshacer:

- **Un 404 de Google Play no es "no está en Uruguay".** Con `gl=UY` Play contesta 200, con
  JSON-LD, aunque la app no se ofrezca acá (medido con PayPay, Venmo y Cash App, que en el App
  Store `/uy/` sí dan 404). En Android la tarjeta dice "No está en Google Play", nunca "de Uruguay".
- **Las guardas cuentan lecturas buenas, no respuestas.** Un 404 también es una respuesta: con las
  guardas viejas, una tienda que contestara 404 a todo pasaba y escondía todos sus botones. Ahora
  corta si las primeras 10 apps no tienen ninguna lectura buena y rechaza un salto de 404.
- **Los días son de Uruguay.** La corrida de las 01:34 UTC es la noche anterior acá; fechada con el
  día UTC, la página decía "tiendas leídas" mañana.

## El buscador

Una palabra de hasta tres letras (UTE, BPS, OSE, STM, ID) tiene que ser una palabra entera; desde
cuatro letras alcanza con el principio de una palabra. Como pedazo de otra palabra, "ose" encontraba
COSEM y San José, "bus" cada "Buscá" y "gas" los "gigas". "Estado", "gobierno" y "pública" se
resuelven con el tipo de la app y no con el texto ("estado de cuenta" y "Estados Unidos" están en
tarjetas de bancos y de compras). Si la búsqueda coincide con algo que no es una app (OSE, el Correo,
la recarga de la STM…), arriba de los resultados aparece el aviso con sus canales: las palabras que
lo disparan son `keywords` de `USEFUL_APPS_NOT_APPS`, y hace falta que alguna coincida (el nombre
solo no alcanza: "tarjeta" traía el aviso de la STM).

## Agregar o corregir una app

1. Abrir las dos fichas (Play con `&gl=UY`, App Store con `/uy/`) y la página del organismo.
2. Editar `app/utils/usefulAppsCatalog.ts` **y** `classes/usefulapps/catalog.ts`.
3. `cd app && npx vitest run tests/unit/usefulAppsCatalog.test.ts tests/unit/usefulAppsCatalogParity.test.ts`.
4. Actualizar `USEFUL_APPS_VERIFIED_AT` si se revisó todo el catálogo.

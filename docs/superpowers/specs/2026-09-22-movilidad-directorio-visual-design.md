# Directorio visual de movilidad eléctrica (monopatines y bicicletas)

**Fecha:** 2026-09-22 · **Rutas:** `/monopatines-electricos-uruguay`, `/bicicletas-electricas-uruguay`

## Problema medido

Las dos páginas publican bandas de precio correctas y una lista de texto de "las ofertas más
baratas". Nada tiene foto y no hay ningún filtro: el lector no puede acotar por marca, vendedor,
condición ni precio, y no ve lo que está comprando. Al lado, `/equipar-casa-uruguay/productos`
—que come de la MISMA maquinaria de retail— ya tiene tarjetas con foto, panel de filtros con
facetas contadas, orden y paginación. El usuario además señaló falta de espaciado entre la grilla
de tipos y el bloque del asistente.

## Qué se construye

1. **Espaciado.** El `AssistantCta` va entre dos secciones con `mb-8` y sin margen superior: queda
   pegado a la grilla de tipos. Se le da el mismo ritmo vertical que a una sección (40 px).
2. **Fotos donde ya hay dato.** `EquiparItem.image` (la foto representativa, nunca de Facebook
   porque esas URLs vencen) ya se guarda en `movilidaditems` y no se dibujaba: las tarjetas por
   tipo la muestran. `MovilidadProduct.image` idem en la tabla de modelos de monopatines.
3. **Foto por oferta.** `toOffer()` (classes/equipar/catalog.ts) pasa a copiar `listing.image`,
   **null para Facebook** por la misma razón de arriba. Campo aditivo: beneficia también a equipar.
4. **Directorio con filtros.** Una colección nueva `movilidadlistings` (APP DB), una fila por
   aviso aceptado por la banda, escrita por `sync_movilidad.ts` con `buildEquiparListings({
   registry: MOVILIDAD_CATEGORIES })` — la función YA acepta el registro inyectado, no se forkea
   nada. La sirve `GET /api/movilidad/productos`, calcada de `/api/equipar/productos` sobre el
   modelo nuevo y reusando entero `app/server/utils/equiparProductos.ts` (match, orden, proyección,
   proyección pública), que no sabe de qué colección sale la fila.
5. **En la página, no en una ruta nueva.** El usuario llama "el directorio" a estas dos páginas:
   la grilla con foto + panel de filtros + orden + paginación reemplaza la lista de texto de
   ofertas, con `categoria` fija por página. Toda URL con filtro va `noindex, follow` (copia
   delgada), el canonical literal no cambia.

## Por qué NO una ruta `/…/ofertas` aparte

`pages/monopatines-electricos-uruguay.vue` tendría que convertirse en `…/index.vue` para que
Nuxt no la vuelva layout padre con `<NuxtPage>`; son dos páginas más que mantener, dos canonicals
más y el lector igual entra por la página que ya rankea. El directorio va adentro.

## Colección `movilidadlistings`

Misma forma que `equiparlistings` (`EquiparListingRow`) — se reusa el tipo, no se declara otro:
`buildEquiparListings` devuelve exactamente esa fila cualquiera sea el registro. Separada de
`equiparlistings` a propósito: un monopatín no puede aparecer en el directorio de equipar la casa,
y `classes/equipar/basket.ts` sólo itera `EQUIPAR_CATEGORIES` (misma frontera que ya documenta
`classes/movilidad/registry.ts`). Índices y poda a 30 días idénticos, vía los helpers de
`classes/equipar/store.ts` (`equiparListingUpsert`, `equiparListingPruneCutoff`).

## Qué NO cambia

- Ninguna banda, ningún corte de plausibilidad, ninguna cifra publicada.
- `equiparlistings` y `/api/equipar/productos` siguen igual (sólo ganan `image` por oferta en
  `equiparitems`, que es aditivo).
- "Mi lista" es de equipar la casa: el botón de agregar NO aparece en el directorio de movilidad.
- La corrida horaria escribe avisos igual que la diaria (mismo mecanismo que equipar).

## Verificación

- Root vitest: construcción de filas con el registro de movilidad, poda, `image` nula en Facebook,
  paridad de esquema backend↔app de la colección nueva.
- App vitest: normalización de la query del directorio de movilidad, forma de la respuesta,
  cobertura de siteNav si corresponde.
- En producción: medir la página después del deploy y correr `currency-movilidad` en el VPS para
  poblar la colección (hasta entonces el directorio dice que todavía no hay avisos).

## Estado de aprobación

Spec y plan auto-aprobados por orden permanente del usuario (memoria
`workflow-auto-approve-deploy`): sin esperas de revisión, implementar y desplegar.

# Lo que muestran las fotos (`currency-photo-facts`)

Desde el 2026-11-23. Job horario (`12 * * * *`, `sync_photo_facts.ts`, `classes/photofacts/`) que
mira hasta seis fotos de los avisos de alquiler y de venta con galería y guarda qué muestran. El job
escribe sólo las colecciones privadas `photofacts` y `photofactsmetas` de la APP DB; lo único que
sale al sitio es el mobiliario y la cocina integrada que pasaron el etiquetado a ciegas, en la ficha
de alquiler y a través de una proyección pública (abajo, «Lo que se publica»).

## Por qué existe y por qué en sombra

Ningún portal uruguayo le muestra al comprador nada sacado de las fotos. El estudio de factibilidad
(privado, `docs/seo/data/reports/`) midió en un piloto de 43 avisos y 185 fotos que Claude Haiku 5.5
acierta lo que se ve claro —balcón 10 de 10, renders 6 de 6, marcas de agua 10 de 10— y falla en lo
que más duele: humedad (ningún "sí" sobre dos manchas reales), daño, y "amueblado" con 74 %. La
verificación del piloto la hizo otra IA, no una persona.

Por eso el orden es: juntar en sombra, que **una persona** etiquete una muestra, y publicar sólo el
atributo que pase la vara (abajo). Publicar es otro trabajo, por atributo, con su fila en
`docs/seo/experiments.json`.

## Qué se pregunta (`classes/photofacts/schema.ts`)

- Por foto: qué ambiente muestra (`living`, `cocina`, `bano`, `dormitorio`, `balcon_terraza`,
  `patio_jardin`, `parrillero`, `piscina`, `garaje`, `fachada_exterior`, `vista`, `plano`,
  `amenities_edificio`, `otro`, `logo_o_vacia`) y tres banderas internas: `render`, `watermark` (logo,
  marca de agua o texto sobreimpreso) y `collage`.
- Comodidades —balcón/terraza, patio/jardín, parrillero, piscina, aire acondicionado, cocina
  integrada— contestadas con **el índice de la foto que la muestra**, o `null`. No hay "no tiene":
  que no se vea no prueba que no exista (el piloto: 5 de 5 parrilleros declarados no estaban en las
  primeras seis fotos). Es la regla `true | null` de `petsAllowed`.
- Mobiliario `si | no | no_se`, con la foto de interior que lo sostiene. Se fuerza a `no_se` sin una
  foto de interior real, o si el aviso trae **cualquier** render: InfoCasas le vende a sus
  anunciantes amueblar ambientes de forma virtual, y en el piloto los cuatro modelos dijeron
  "amueblado" sobre renders.
- Un hecho que sólo sostiene un render, un plano o un logo no cuenta. La portada nunca es un plano,
  un logo, una vista sola ni un render.
- La pregunta **no lleva la descripción del aviso**: "visto en las fotos" tiene que ser independiente
  de lo que el aviso dice. Nunca se pide texto de la foto (matrículas, teléfonos, nombres).

## Las fotos (`classes/vision/photos.ts`, compartido con autos)

Se bajan con la UA del sitio y el espaciado por host de `classes/rentals/net.ts`; se descarta lo que
pesa menos de 4 KB o mide menos de 400 px de lado mayor (el placeholder de El País pesa 2.353 bytes y
mide 338×253) y lo repetido dentro del aviso, por SHA-1 de los bytes o por huella dHash a 4 bits o
menos (la misma foto en otro tamaño). Se prueban a lo sumo 10 URLs por aviso y se decodifica hasta 16 MP (más que eso no es una foto de
aviso y en JS puro bloquea la CPU de una caja compartida); lo que no se pudo achicar y pasa lo que
Claude acepta se descarta en vez de mandarse. Las que pasan se achican a **1.024 px** de lado mayor y se
recodifican en JPEG calidad 80. Medido el 23/11: InfoCasas sirve 1920×1440, Casasweb 1634×1225 y ML
1200 px. Todo en JS puro (`jpeg-js`): el VPS es CentOS 7 (glibc 2.17) y `sharp` no carga. A Mercado
Libre se le pide la variante `.jpg` de cada foto, que el CDN sirve igual; lo que no es JPEG viaja tal
cual. La API de Claude no baja por URL las fotos de ML ni de Facebook: siempre van en base64.

## Qué avisos, en qué orden

Ofertas vigentes (vistas en los últimos 10 días) de `rentallistings` y avisos de `propertysalecatalog`
con 3 fotos o más, de InfoCasas, Casasweb, El País y Mercado Libre. Montevideo primero, lo más
reciente antes, en este orden de pasadas: alquileres de Montevideo, ventas de Montevideo, alquileres
del resto, ventas del resto. La cola se lee por tandas con un cursor y corta apenas junta lo que la
corrida puede mirar. Un aviso se vuelve a mirar sólo si cambia el hash de su galería o la versión del
esquema. Facebook, TikTok e Instagram quedan afuera: una foto de 260 px que vence en días y los
términos de Meta.

Las fotos del aviso siguiente se bajan mientras el modelo contesta el actual: seis fotos del mismo
portal son ~7 s por el espaciado de 1,2 s por host y una respuesta ~6,5 s.

## Presupuesto

| variable | por defecto | qué hace |
|---|---|---|
| `PHOTO_FACTS_MAX` | 40 | avisos por corrida |
| `PHOTO_FACTS_MINUTES` | 8 | no se empieza un aviso después (medido el 23/11: ~9 s por aviso con la bajada solapada) |
| `PHOTO_FACTS_MONTHLY_USD` | 8 | tope propio del mes, sumado de `spend.<AAAA-MM>` de la colección |
| `PHOTO_FACTS_ENABLED` | — | `0` apaga el job |

Claude Haiku 5.5 con los créditos de API (`classes/anthropic.ts`), esfuerzo bajo, `system` cacheado.
**Sin respaldo de Gemini**: en el piloto costaba 1,7 veces más y contestó peor; sin crédito de Claude
la corrida no hace nada, y si deja de contestar a mitad de corrida (ninguna clave utilizable, o tres
respuestas nulas seguidas) la corrida corta con `stop: "model"` sin anotarle la falla a los avisos, que
si no quedarían días en espera por culpa del servicio. Una llamada cobrada que termina en negativa o
cortada no llega con costo al job: la cuenta del mes puede quedar apenas por debajo de lo real, y el
libro de gasto por clave de `classes/anthropic.ts` sí la cuenta. El tope propio existe porque el pozo de créditos lo comparten todos los jobs
de IA, la búsqueda web incluida. Cada lectura **suma** su costo en `spend.<AAAA-MM>` en vez de
pisarlo, así una relectura dentro del mes no esconde lo gastado.

## Qué se guarda

`photofacts`, un documento por aviso (`_id` = `alquiler:<listingId>` o `venta:<listingId>`):
`vertical`, `listingId`, `propertyKey`, `source`, `advertiser` (agencia, si no vendedor, si no el
propio aviso), `department`, `galleryHash`, `schema`, `model`, `readAt`, `photos[]` (URL, SHA-1,
dHash, tamaño, ambiente y banderas), `facts`, `cover`, `coverUrl`, `note`, `usage`, `costUsd` y
`spend`. Una lectura que no sirvió se guarda igual (`ok: false`, `lastError`, `failures`,
`nextTryAt`), con espera de 1, 3, 7 y 30 días; un aviso sin dos fotos utilizables espera 30 días. Sin
eso, los mismos avisos rotos encabezarían la cola cada hora (la lección de la cola de Casasweb).

`photofactsmetas` (`key: run`): el resumen de la última corrida —leídos, sin fotos, fallas, fotos
mandadas y achicadas, descartes, costo, tokens leídos de caché, por qué cortó, gasto del mes— y
`repeated`: cuántas fotos (por huella exacta) aparecen en avisos de **dos o más anunciantes
distintos**. Es una medida y nada más: una foto compartida no prueba que sea la misma vivienda (el
caso de San Luis) y no une ni acusa a nadie.

## Etiquetar y decidir

```bash
npm run photo_facts_label -- --per=40          # sólo lectura: HTML en docs/seo/data/fotos-etiquetado/
npm run photo_facts_eval -- docs/seo/data/fotos-etiquetado/etiquetas.json
```

La página de etiquetado muestra las fotos de cada aviso (enlazadas desde el portal) con la respuesta
del modelo y tres botones por atributo: correcto, incorrecto, no se ve. Guarda en el navegador y
exporta un JSON. La muestra es estratificada: trae avisos donde el modelo afirmó cada atributo.

**La vara para publicar un atributo**: precisión ≥ 95 % sobre ≥ 100 etiquetas, con ≥ 30 positivos
(`PUBLISH_BAR` en `classes/photofacts/evaluate.ts`, la misma vara que se usó para los gastos comunes
del texto). El veredicto también imprime la cota inferior de Wilson al 95 %. La muestra se repite
cada vez que cambia el modelo o el esquema.

## Etiquetado a ciegas por dos modelos (2026-11-23) y lo que se publica

Sin una persona para etiquetar, se usó el precedente de los gastos comunes leídos del texto: dos
modelos más fuertes etiquetan **a ciegas** —las mismas fotos, en el mismo orden, con la misma
pregunta, sin ver la respuesta de Haiku y a 1.568 px— y sólo cuenta donde coinciden
(`npm run photo_facts_ai_label`, `consensusLabels` en `classes/photofacts/evaluate.ts`). Lo que
discuten queda afuera y se informa. Corrida del 23/11: 250 avisos de Montevideo (Mercado Libre 131,
El País 69, InfoCasas 44, Casasweb 6), Claude Opus 5.5 y Sonnet 5.5, ~US$ 12,7 de créditos incluidos.

| atributo | precisión de Haiku | afirmaciones | desacuerdos | veredicto |
|---|---|---|---|---|
| mobiliario | 98,6 % (sin muebles 92/92; amueblada 53/55) | 147 | 24 | **pasa** |
| cocina integrada | 95,0 % (57/60) | 60 | 13 | **pasa** |
| marca de agua (interna) | 99,1 % | 106 | 12 | pasa, no se publica |
| aire acondicionado | 94,9 % (93/98) | 98 | 12 | no pasa |
| parrillero | 95,5 % | 22 | 3 | no pasa (< 30) |
| piscina | 100 % | 14 | 0 | no pasa (< 30) |
| patio/jardín | 86,7 % | 30 | 13 | no pasa |
| balcón/terraza | 77,1 % | 83 | 26 | no pasa |
| render (interna) | 80 % | 10 | 1 | no pasa |

Los dos "amueblada" equivocados eran de InfoCasas (6 de 8; sin InfoCasas, 47 de 47), el portal que
les vende a sus anunciantes amueblar ambientes de forma virtual. Balcón falla porque es ambiguo:
ventanales, balcones franceses y terrazas comunes; los dos etiquetadores discreparon en 26 avisos.

**Lo que se publica**, desde el 23/11, en la ficha de alquiler (`app/components/rentals/RentalPhotoFacts.vue`,
pedido por el navegador a `GET /api/rentals/fotos/<key>?oferta=<listingId>`), con la proyección
campo por campo de `app/utils/photoFactsPublic.ts`:

- "Se ve sin muebles" y "Se ve amueblada", **sólo si el aviso no declara nada** sobre el mobiliario,
  y nunca "amueblada" para InfoCasas.
- "Cocina integrada al living".
- Cada rótulo con la foto que lo muestra ("ver la foto"), el aviso de que lo vio una IA y puede
  equivocarse, y un "¿Está mal?" que guarda `{ listingId, fact, at }` en APP DB `photofactreports`
  (sin IP; es la medida del daño por rótulo).
- Sólo veredictos de `claude-haiku-5-5` con esquema 1 (`PHOTO_FACTS_MEASURED`): otro modelo u otro
  esquema es otra serie y hay que volver a medir.

El bloque lo pide el navegador después de pintar la ficha, así que no cambia el HTML que lee Google:
el de las fichas está dentro de la ventana de `fichas-alquiler-calle-precio-total-y-miga-al-barrio`
(docs/seo/experiments.json, hasta el 07/12/2026). Por lo mismo este cambio no lleva fila propia. El
filtro del directorio ("amueblado" desde las fotos) queda para después: la API del listado la está
reescribiendo `perf/alquileres-rapido-ola2`, y el mobiliario se filtra a nivel de oferta, que la
cosecha reescribe cada hora.

## Lo que no se hace nunca

- Publicar humedad, daño, estado, "render" o "foto robada" sobre un aviso.
- Unir avisos por foto parecida.
- Leer o guardar matrículas, caras o teléfonos.
- Afirmaciones visuales sobre avisos de Facebook.

`--dry-run` arma la cola y la muestra sin bajar fotos. `--probe=N` mira N avisos de punta a punta e
imprime el resultado sin escribir nada; el `.env` local apunta a la base de producción, así que es la
forma de probar desde una máquina de desarrollo.

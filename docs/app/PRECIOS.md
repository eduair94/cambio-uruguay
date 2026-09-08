# Precios de supermercado (SIPC)

Pipeline: `classes/precios/` + `sync_precios.ts` (pm2 `currency-precios`, `12 3 * * *` UTC).
Páginas: `/precios-de-supermercado-uruguay` y la familia `/precio/<slug>`.
API: `GET /precios/{articles,article/:id,basket,stores,changes}`.

Todas las cifras de este documento están **medidas el 2026-09-07**, no estimadas.

---

## 1. La fuente

`precios.gub.uy` responde **301** hacia `www.precios.uy`: precios.uy **es** el sitio
oficial del SIPC (Sistema de Información de Precios al Consumidor, MEF / Área
Defensa del Consumidor). Su `robots.txt` sólo excluye `/wp-admin/`.

Detrás de la SPA Vue de `/preciosgub/` hay una API pública sin clave y sin
Cloudflare, en `https://www.precios.uy/sipc2Web/recursos/sipc/`:

| endpoint | método | devuelve | medición |
|---|---|---|---|
| `obtenerArticulos` | GET | catálogo | **215** artículos, 26 KB, 0,3 s |
| `obtenerEstablecimientos` | GET | locales | **749** con lat/lon/dirección/teléfono, 172 KB, 0,6 s |
| `compararArticulo` | POST | precio por local de UN artículo, con fecha | 187 KB, 1,1 s |
| `compararCanasta` | POST | matriz canasta × locales | 12 MB, 65 s — **PROHIBIDO, ver §3** |
| `compararPrecios` | POST | matriz por lista de locales | no se usa |
| `obtenerDeclarantes` / `obtenerPpdms` | — | 405 / 501 | muertos |

`v1..v4` del cuerpo POST son **West/South/East/North** (salen de `map.getBounds()`
en el bundle). El bbox nacional `-58.5 / -35.2 / -53.0 / -30.0` trae todo el país.

**Dos trampas de protocolo, las dos medidas:**

- Los **POST devuelven 406** con `Accept: application/json`. Hay que mandar
  `Accept: text/plain`, que es lo que manda su propia SPA; el cuerpo que llega es
  JSON igual. Los dos GET del catálogo sí aceptan JSON. Fijado en
  `tests/precios/sweep.test.ts` con `fetch` stubbeado, porque un "limpiemos las
  cabeceras" dejaría el barrido devolviendo `null` todos los días **sin fallar**.
- El origen usa **`x` = latitud e `y` = longitud**. Invertirlo pone al país en el
  Atlántico y el radio de "cerca de mí" devuelve vacío.

## 2. Volumen, frescura y cobertura

Corrida completa medida: **75.858 observaciones en 341 s**, cero descartes.

- **94 %** de las filas traen fecha de hoy o del día anterior. Pero hay cola real:
  174 filas con fecha 27/08 y algunas de 12–15/08 en una corrida del 07/09. **La
  antigüedad viene en el dato**, que es lo que las pizarras de cambio no dan.
- El spread del **mismo** artículo va de **1,58×** (aceite de girasol) a **4,86×**
  (cinta leuco: mínimo $18,5 contra mediana $64).
- La celda de precio tiene **sólo dos formas**, medidas sobre 5.913 filas:
  `$92.0` (89,2 %) y `oferta - $43.0` (10,8 %).
- **Unión al catálogo:** el `id` de la fila de precio (217451) **no** es el del
  establecimiento (1..749): es la clave de la declaración. Sobre las 670 filas del
  artículo 1: coordenada exacta 100 %, nombre+dirección 100 %, cero huérfanas, y 3
  coordenadas repetidas que se colapsan por (nombre, dirección).
- **Cobertura geográfica desigual:** 423 de 749 locales son de Montevideo.
  Canelones 89, Maldonado 73, Colonia 20, San José 18, Soriano 16, Salto 13,
  Rocha 12, Durazno 10, Paysandú 10, Tacuarembó 10, Cerro Largo 9, Florida 9,
  Río Negro 9, Flores 7, Lavalleja 7, Rivera 7, Treinta y Tres 5, **Artigas 2**.
  18 locales no traen coordenada.
- La "cadena" más grande del catálogo es **Farmashop (152 bocas sumando sus dos
  grafías)**: el SIPC no es sólo supermercados. La regla de cobertura del §4 las
  filtra sola, porque una farmacia no declara el 70 % de una canasta de alimentos.
- El catálogo escribe la misma cadena de dos maneras: **`Farmashop` 123 veces y
  `FARMASHOP` otras 29**. Se agrupa por `chainKey` (plegado sin tildes y en
  mayúsculas), no por el nombre publicado, que la partiría en dos en el ranking.

## 3. Por qué `compararCanasta` está prohibido

Tienta: una sola llamada de 65 s contra los 341 s del barrido, y encima trae el
total de la canasta por local calculado por el propio Estado. **Imputa.**

Medido para "Nalga vacuna con hueso" (artículo 114):

- `compararArticulo` devuelve **28** observaciones reales.
- La matriz de `compararCanasta` muestra precio en **722 de 722** locales, y en
  todos **el mismo `$509.32 (*)`**.
- **694 de 722 celdas tienen precio y no tienen fecha.**

El Estado rellena cada hueco con un promedio nacional marcado `(*)`. Por eso los
totales por local se aplastan a **1,18×** (43.487 → 51.456) mientras los artículos
sueltos se abren hasta 4,86×: **quien rankee supermercados con ese total ordena
promedios, no góndolas**. Y su matriz tiene **6 claves de columna duplicadas**
(`"Ta - Ta  | Cerro "`, `"Super XXI | Super XXI"`…), así que tampoco se puede unir
a locales de forma fiable.

De ahí la regla general del pipeline, que vale para toda fila venga del endpoint
que venga:

> **Se rechaza toda fila cuyo precio contenga `(*)` o que no traiga `fecha`.**

Tripwire: `tests/precios/no_imputed_endpoint.test.ts`. Verificado en las tres
direcciones (pasa limpio, falla al inyectar la llamada, vuelve a pasar al
revertir). Nombrarlo en un comentario está permitido —la explicación tiene que
poder escribirse—; lo que se prohíbe es que aparezca en el código.

## 4. Las tres guardas, y el eje que mira cada una

Son tres porque miran ejes distintos, igual que en cotizaciones.

**1. `plausibility.ts` — por fila, al escribir.** Las ~352 filas de un artículo
llegan en UNA respuesta, así que la distribución se conoce antes de guardar nada
(algo que `rate_plausibility.ts` no puede hacer, porque el scrape de casas recorre
una por vez). Rechaza `(*)`, fila sin fecha, no numérico, ≤ 0, y fuera de
**p10/3 – p90×3** del propio artículo. La banda es por percentiles del propio
artículo y no un factor fijo porque el spread real va de 1,58× a 4,86×.

Y una segunda etiqueta que **no borra**: bajo **p10/2** la fila se marca
`suspect`. El $18,5 de la cinta leuco sobrevive a p10/3 y sin embargo es el que
gana el ranking. Medido: 5 filas marcadas y **el titular pasa de $18,50 a $25**.
Borrarla sería afirmar que no puede ser un precio real, y eso no se sabe.

**2. `staleness.ts` — contra su propio pasado, regalado por el origen.**
`fresh` ≤ 2 días, `aging` 3–14, `stale` > 14. **Una fila `stale` nunca gana un
ranking de "más barato"**, ni en el job, ni en la API, ni en la página. No se
borra: una góndola quieta puede ser un precio real. Una fecha ilegible cuenta como
vieja y no como fresca, a propósito.

**3. `audit.ts` — al cierre, con el país entero escrito.** Ve lo que las otras dos
no pueden: el local cuya **góndola entera** está desplazada. Fila por fila cada
precio cae dentro de la banda del artículo (con p10/3–p90×3 casi no se rechaza
nada), así que las dos primeras lo dejan pasar en verde; el error sólo aparece
mirando todas las filas de ese local juntas. Se mide en las dos direcciones: una
góndola entera 3× por debajo no es una ganga, es la misma clase de error y encima
es la que gana el ranking. En la primera corrida completa: **0 veredictos**, o
sea que la guarda no dispara falsos positivos.

`notifyAdmin` no llega a nadie desde el VPS (`TELEGRAM_ADMIN_CHAT_ID` vacío), así
que los veredictos van al log y a la respuesta de la API, nunca a un canal.

## 5. Las ofertas, y por qué descartarlas era sesgar

La primera corrida real descartaba **144 de 1.113 filas** con motivo "precio
ilegible": eran `oferta - $98.0`. Y la oferta es **7,8 % más barata** que el precio
normal del mismo artículo, así que descartarlas no era prudencia — empujaba todos
los promedios para arriba y borraba del ranking justo a los locales que están
haciendo promoción. Un precio en oferta es lo que se paga hoy: se lee, se conserva,
se marca `promo` y **sí puede encabezar**.

Efecto medido de recuperarlas: los locales con canasta calificada pasaron de
**211 a 356**.

## 6. La canasta, y el error propio que sólo apareció midiendo

Canasta **fija y versionada** (`basketVersion: 1`, pinneada el 2026-09-07),
**33 artículos** de 34 necesidades canónicas. La necesidad que quedó afuera es
dato en sí: **"Cebolla Blanca" está en el catálogo oficial y tiene 0
observaciones en todo el país**.

La selección es por **más observaciones**, no por precio: elegir por precio movería
la composición todos los días, y un índice cuya canasta se mueve sola no mide
precios, mide la canasta. Las **cantidades son un supuesto declarado** (hogar de
dos personas, consumo mensual), no una medición: sirven para comparar locales
entre sí y no son la canasta del INE.

**El defecto que hubo que corregir.** El diseño original ordenaba por costo total
de canasta. Está mal, y es el mismo pecado que este pipeline le critica al
comparador oficial, en la dirección contraria: el total suma sólo lo que el local
declara, así que a un local le baja el total **por faltarle artículos**. Medido
sobre los 211 locales calificados de entonces:

| | |
|---|---|
| correlación cobertura ↔ total crudo | **0,842** |
| correlación cobertura ↔ canasta emparejada | 0,278 |
| coincidencia entre los dos top-10 | **1 de 10** |

Nueve de los diez "más baratos" que se habrían publicado eran artefacto de
cobertura. La regla de cobertura sola no alcanzaba: filtra las muestras chicas
pero no empareja las que quedan.

Se ordena por **canasta emparejada** (`ratio`): lo que el local cobra por los
artículos que declara, contra la mediana nacional de **esos mismos** artículos. Y
**no se publica un total completado**: escalar el ratio a los 33 artículos daría
una cifra linda y comparable, pero sería imputar los artículos que el local no
vende — exactamente lo que se le critica al `(*)`.

**Umbrales, exactos:**

| regla | valor |
|---|---|
| cobertura para que un local se rankee | **≥ 70 %** |
| locales calificados por departamento o cadena | **≥ 5** |
| observaciones frescas para indexar `/precio/<slug>` | **≥ 30** |
| frescura | `fresh` ≤ 2 d · `aging` 3–14 · `stale` > 14 |
| banda de rechazo | p10/3 – p90×3 del propio artículo |
| marca `suspect` | bajo p10/2 |
| el índice no publica variación si | cambió `basketVersion` o los calificados cayeron > 20 % |

**Resultados de la primera corrida completa:** 356 locales calificados, nivel
nacional 0,9953, **13 de 19 departamentos** con ranking y **10 cadenas**. Sin
ranking quedan Rivera (3), Treinta y Tres (4), Río Negro (4), Florida (3),
Paysandú (4) y Artigas (1) — y lo dicen.

## 7. Datos y API

Seis colecciones en la Mongo del **backend** (`cambio-uy`), no en la del app: la de
estado es la colección más grande del proyecto y el patrón de `regional` ya está
probado. `getInstance` recibe el nombre del modelo y mongoose pluraliza:

| modelo | colección | qué guarda |
|---|---|---|
| `precios_article` | `precios_articles` | 215, upsert |
| `precios_store` | `precios_stores` | 749, upsert |
| `precios_price` | `precios_prices` | estado por (artículo, local) — 75.825 filas |
| `precios_change` | `precios_changes` | **una fila por cambio, sin umbral** |
| `precios_stat` | `precios_stats` | agregados por (día, artículo, ámbito) |
| `precios_basket_day` | `precios_basket_days` | canasta e índice por día |

Se escribe con `bulkUpsert` en tandas de 1.000: con ~75.600 filas por corrida, un
upsert por documento serían 75.600 idas y vueltas.

El **ledger es lo único irreconstruible**: la fila diaria se sobrescribe, así que
un movimiento sólo existe si se escribió cuando pasó.

## 8. Lo que NO tenemos medido (habilita los subproyectos B y C)

Todo esto está hoy **hardcodeado** en `app/utils/costOfLiving.ts` como estimación
declarada. Ninguna se inventa: si no hay fuente medida, la línea sigue siendo una
estimación y se dice.

| falta | hoy | candidato de fuente |
|---|---|---|
| tarifas UTE / OSE / Antel | hardcodeado | pliegos tarifarios publicados |
| combustible | hardcodeado | tarifario ANCAP |
| cuota de mutualista / FONASA | hardcodeado | JUNASA y tarifarios de prestadores |
| planes de datos y fibra | hardcodeado | tarifarios de los operadores |
| boleto del interior | sólo STM | intendencias |
| educación (matrícula, materiales) | ausente | ANEP y privados |

### Subproyecto B, y por qué NO reemplazó la línea de comida

**Hecho el 2026-09-08, con el alcance corregido por la medición.** El plan era
reemplazar `COST_MODEL.foodPerAdult` por el costo medido de esta canasta. No se
puede, y no es un defecto de la medición:

| | medido | modelo | ratio |
|---|---|---|---|
| comida, hogar de 2, mensual | **$7.731** | $26.000 | **0,297×** |
| por adulto | **$3.865** | $13.000 | — |
| limpieza e higiene | $1.541 | $7.000 (misc) | 0,22× |

$3.865 por adulto queda **por debajo de la línea de indigencia del INE**
($6.628 de CBA per cápita). La causa está en la fuente, no en el cálculo: el
catálogo del SIPC **no tiene leche fluida, ni pan fresco, ni legumbres, ni
zanahoria, ni morrón, ni atún, ni avena** (verificado sobre los 213 artículos con
mediana), y las cantidades de `NEEDS` son las de un índice de precios, no las de
un consumo real. Publicar eso como presupuesto habría hecho la calculadora peor
que con la estimación.

Lo que B sí hizo:

1. **La línea de comida se reexpresa a precios de hoy.** Sigue anclada en la CBA
   del INE —una canasta completa, hecha por quien mide consumo— pero dejó de
   servir el nivel de precios de diciembre de 2025 como presupuesto de septiembre
   de 2026. Se indexa con el IPC interanual que ya sirve `GET /uy-figures`
   (`restateFood` en `app/utils/costOfLiving.ts`, aplicado en `costsMerge.ts`
   por el mismo mecanismo de override que el boleto). Supuesto declarado en la
   página: **la inflación general no es la de los alimentos**. Se niega a indexar
   más de **36 meses**: capitalizar tres años sobre una canasta que nadie
   actualizó produce un número que parece fresco y esconde el problema real.
2. **La canasta medida se publica en la calculadora** como sección propia, con
   los alimentos concretos y su precio de hoy, y dice en la cara que no es un
   presupuesto y por qué. Hace auditable la estimación en vez de taparla.
3. **`nationalBasketCost`** (en `basket.ts`) da la única cifra **absoluta** que
   esta fuente puede dar sin imputar nada, porque cada mediana sale de
   observaciones reales de ese artículo — a diferencia del total por local, que
   baja cuando al local le faltan artículos. Separa comida de limpieza e higiene:
   el artículo más caro de la lista es el shampoo.

Queda **sin hacer** y sería el próximo paso natural: cuando el índice de góndola
tenga meses de historia, reemplazar el IPC general por el movimiento medido de
los alimentos, que es más fino que el índice general para esta línea. El **C** arma el plan de vida por ingreso, y
depende de que estas seis líneas dejen de ser supuestos o de que sigan siéndolo
**y se diga**.

## 9. Fuera de alcance, y por qué

- **Páginas por cadena y por departamento.** Nombrar empresas con un veredicto de
  precio necesita más metodología expuesta, y con Artigas en 2 bocas varias serían
  delgadas por honestidad. Los dos cortes viven adentro del hub.
- **Cualquier consejo financiero personalizado.** El sitio informa.

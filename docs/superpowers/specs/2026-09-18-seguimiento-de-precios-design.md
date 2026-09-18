# Seguimiento de precios: alquileres, viviendas en venta y autos usados — diseño

Fecha: 2026-09-18. Pedido: "Trackear precios de alquileres, propiedades, viviendas y autos (ver
fluctuaciones en el mercado para cada producto)".

## 1. Lo que hay hoy (leído en el código)

| Mercado | Colección pública | Historia de precio que existe |
|---|---|---|
| Alquileres | `rentallistings` (una fila por vivienda, `offers[]` por portal) | Ninguna. Cada oferta guarda su precio vigente y `firstSeen`/`lastSeen`; la poda histórica es a 21 días. `propertyzonesnapshots` calcula cohortes por barrio **y pisa el snapshot cada día**. `RENTAL_ANALYSIS.md`: "no se agregaron series históricas inferidas". |
| Viviendas en venta | `propertysalecatalog` (una fila por aviso) | Ninguna. Precio vigente. |
| Autos usados | `carcatalog` (una fila por aviso) | `carlistings.priceHistory` guarda hasta 20 cambios por aviso desde el 2026-09-16 y la ficha muestra `priceDrop`. No hay serie de mercado. |

Conclusión: **no hay pasado que mostrar**. La serie empieza el día que se despliega esto y no se
reconstruye hacia atrás: los avisos podados y los precios viejos no existen, y rellenar con el precio
de hoy fabricaría una serie plana que nunca se observó (mismo criterio que `pricewatchoffers`: se
empieza a grabar antes de que haga falta).

## 2. El problema de medición: la mediana no es el precio

La mediana de "apartamentos de 2 dormitorios en Pocitos" baja si esta semana entraron avisos baratos o
salieron caros, aunque ningún dueño haya bajado nada. Con autos es peor: la mediana del Hilux se mueve
con la mezcla de años que hay publicada. Por eso cada cohorte publica **dos medidas distintas, con
nombres distintos**:

1. **Nivel** — p25 / mediana / p75 de los precios pedidos vigentes ese día, con `n`. Es "cuánto se
   pide hoy". Su serie es sensible a la composición y la página lo dice al lado del gráfico.
2. **Misma oferta** (variación emparejada) — sólo los avisos vigentes hoy que ya seguíamos hace `W`
   días (7, 30, 90): razón `precio_hoy / precio_hace_W`. Se publica la **media geométrica − 1** (la
   variación conjunta, incluidos los que no cambiaron) y cuántos bajaron, subieron y quedaron igual.
   No depende de qué entra o sale: es el mismo aviso repreciado. Es la única cifra que la página
   llama "variación".

Guardas de la medida emparejada:
- Nunca se empareja un precio con otro de distinta moneda (el aviso que pasó de pesos a dólares no
  "subió", cambió de unidad).
- Una razón fuera de `[0,5; 2]` se descarta y se cuenta (`outliers`): un aviso que en 30 días se
  duplica o se parte a la mitad es un error de carga o de unidad, no un repreciado.
- Umbral de ±0,5 % para contar "bajó"/"subió": un redondeo no es una baja.
- Se publica con `pares ≥ 8`; debajo, `null` con el conteo visible.

## 3. Cohortes ("cada producto")

**Las monedas nunca se mezclan ni se convierten**: la moneda es parte de la clave. Convertir movería la
serie con el dólar, no con el precio.

| Mercado | Dimensiones | Unidad del nivel | Unidad del emparejado |
|---|---|---|---|
| `alquiler` | moneda × tipo {apartamento, casa, todas} × dormitorios {todos, 0, 1, 2, 3, 4+} × ámbito {Uruguay, departamento, barrio} | una **vivienda** (representante: la lectura más reciente, desempate por id de aviso — la misma regla que `propertyzones/market.ts`, que evita sesgar hacia la oferta más barata) | el **aviso** (es el aviso el que se reprecia) |
| `venta` | igual que alquiler | el aviso (el catálogo ya es por aviso) | el aviso |
| `autos` | modelo (`marketSlug`), modelo+año, y "todos los autos" | el aviso | el aviso |

- Nivel publicado con `n ≥ 8` (mismo mínimo que zonas). Una cohorte que ese día no llega no recibe
  punto: el gráfico muestra el hueco.
- Viviendas agregan **precio por m² construido** (sólo superficie construida explícita, `n ≥ 8`
  propio): menos sensible a la composición que el precio total.
- Autos: sólo precio nativo en USD y moneda no deducida (`currencyInferred=false`). Los avisos en
  pesos quedan afuera y se cuentan. "Todos los autos" existe para la medida emparejada (un
  repreciado general del mercado); su nivel se muestra con la advertencia de composición.
- Claves estables con slugs (acentos, mayúsculas y espacios son la única equivalencia, igual que
  zonas): `alquiler|UYU|apartamento|2|b:montevideo:pocitos`, `venta|USD|todas|any|d:maldonado`,
  `autos|USD|m:toyota-hilux|y:2018`, `autos|USD|all`.

## 4. Entrada (sólo lectura, nunca toca las cosechas)

- Alquileres: `rentallistings` con `ZONE_RENTAL_PROJECTION` + `projectZoneObservations` (identidad
  v1, elegibilidad residencial, superficie construida validada — las reglas del sitio, no una copia).
  `rentalmetas.generatedAt` ≤ 3 días; ventana de 10 días (la de zonas).
- Ventas: `propertysalecatalog` + `propertysalecatalogmetas` (`freshDays` del meta, 21).
- Autos: `carcatalog` + `carcatalogmetas` (`freshDays`, 4).
- Un meta vencido (> 3 días) saltea ese mercado ese día: un catálogo viejo no es el mercado de hoy.

## 5. Almacenamiento (APP DB)

- `marketpricelogs` (**privada**, nunca servida): un documento por `vertical:advertId` con
  `firstSeen`/`lastSeen` (días en que ESTE job lo vio) y `points: [{d, p, c}]` **sólo cuando cambia**
  el precio o la moneda (tope 40). El día de la observación es el `lastSeen` del catálogo, no el de la
  corrida: una fila que el cosechador no releyó no genera un punto nuevo. Se poda a 120 días sin verse.
- `marketseries`: un documento por cohorte: clave, dimensiones, etiquetas y `points: [{d, n, p25,
  med, p75, m2, w7, w30, w90}]` (tope 1.100 = 3 años). Re-correr el mismo día reemplaza el punto
  del día (pipeline con `$literal`, la trampa documentada en `PRICEWATCH.md`).
- `marketseriesmetas`: `index:<mercado>` con el árbol de opciones que la página necesita (ámbitos,
  monedas, marcas/modelos/años con su `n` y su último nivel), los mayores movimientos emparejados y
  `trackingSince`; `run` con el estado de la última corrida por mercado.

## 6. Job

`sync_market_series.ts` → pm2 `currency-market-series`, `3 13 * * *` (después de alquileres 04:52,
oportunidades 06:21 y autos 07:43; no usa el puente de ML). `--dry-run` lee y calcula sin escribir.
`--only=alquiler,venta,autos`.

Por mercado, en su propio `try` (uno caído no frena a los otros):
leer → observaciones → cargar logs de esos avisos → **emparejar contra el log ANTES de actualizarlo**
→ puntos por cohorte → escribir series → actualizar logs → podar logs → escribir índice.

**Corrida flaca**: si las observaciones del mercado caen bajo 60 % de la corrida anterior, ese mercado
no escribe nada, queda anotado en `run` y el job sale con 1. La primera corrida siempre escribe.

## 7. API (app)

- `GET /api/market-series?v=<mercado>` → el documento `index:<mercado>` (opciones + movimientos).
- `GET /api/market-series/series?key=<clave>` → la serie de una cohorte (clave validada por regex,
  404 si no existe). Caché `public, max-age=600, s-maxage=600`. Un fallo de Mongo no tira la página.

## 8. Páginas

Un componente, `MarketSeriesExplorer`, en tres páginas con su propio texto:

- `/evolucion-precio-alquileres-uruguay`
- `/evolucion-precio-viviendas-uruguay`
- `/evolucion-precio-autos-usados-uruguay`

Y un bloque compacto en la página de cada modelo (`/autos-usados-uruguay/precios/<modelo>`), que ya es
la página "del producto" para autos.

El explorador: selectores (moneda, ámbito/tipo/dormitorios o marca/modelo/año) sincronizados con la
URL; tarjetas de nivel de hoy y de "misma oferta" 7/30/90 días (con "se publica desde <fecha>" cuando
todavía no hay historia); gráfico de la mediana con banda p25–p75 cuando hay ≥ 2 puntos; tabla de los
últimos puntos como alternativa accesible; tabla de mayores movimientos emparejados; cómo se mide; FAQ.

## 9. Tests

Raíz (vitest, sin base): cuantiles; log (agrega sólo al cambiar, reemplaza el mismo día, tope, cambio
de moneda); precio a una fecha; emparejado (ventana, moneda distinta, outliers, umbral); claves de
cohorte y slugs; representante por vivienda; `n < 8` no publica; corrida flaca; pipeline con
`$literal`; índice y movimientos. App: helpers de clave/etiquetas/formato, paridad de constantes con
la raíz (leyendo el archivo, sin importar la raíz), cobertura de `siteNav`.

## 10. Fuera de alcance

Historia por aviso en las fichas (los logs lo habilitan después), alertas, cualquier relleno hacia
atrás, conversión entre monedas, cohortes por marca de auto.

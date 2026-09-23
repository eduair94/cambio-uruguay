# Paquete A — Directorio de motos usadas (backend): fragmentos para el integrador

Todo lo que sigue va en archivos COMPARTIDOS que este paquete no tocó. Al cerrar el paquete
(2026-09-22) los tres primeros YA ESTABAN APLICADOS por el integrador; quedan acá igual para que se
pueda auditar qué pidió este paquete y con qué valores, y porque los puntos 4 a 6 siguen pendientes.

## 1. `ecosystem.config.js` — ya aplicado ✅

Va después de `currency-movilidad-hourly` y antes de `currency-transporte`, que es quien LEE este
catálogo.

```js
    {
      // El directorio de motos usadas de `/motos-usadas-uruguay`. Reusa el puente de MercadoLibre de
      // autos contra la categoría MLU1763, con la cilindrada leída del título y el tramo leído de la
      // faceta `ENGINE_DISPLACEMENT` del propio origen.
      //
      // 13:38 cae después de combustibles (13:11) y antes de movilidad (15:33) y del comparador de
      // transporte (16:39), que LEE este catálogo: correrlo después publicaría la comparación con
      // los precios de ayer. El minuto 38 está libre en todo el archivo.
      name: "currency-motos",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_motos.js",
      cron_restart: "38 13 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Refresco horario, sólo precio (`--fast` pide `since=today` y no barre ninguna faceta). El
      // minuto :44 está libre en toda la hora y queda a siete minutos de celulares (:37) y de
      // alquileres (:47), los dos consumidores vecinos del mismo puente de MercadoLibre.
      name: "currency-motos-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_motos.js",
      args: "--fast",
      cron_restart: "44 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

**Nada de presupuestos en `env:`**: `scripts/deploy-backend.sh` sólo recrea una app ya registrada
cuando cambia uno de los cuatro campos que pm2 congela, así que un `env:` agregado después nunca
llega al VPS. Los presupuestos viven en `ML_BUDGET`, dentro de `sync_motos.ts`.

Detalle menor para cuando se vuelva a tocar el archivo: los comentarios de los dos bloques quedaron
sin tildes ("categoria", "leida", "esta libre"). El resto del archivo las lleva.

## 2. `scripts/deploy-backend.sh` — ya aplicado ✅

Al final del array `OTHER_APPS` de la línea 51, en la MISMA línea (la 83 vuelve a leer el array del
archivo recién bajado, así que el `^OTHER_APPS=(` tiene que quedar al comienzo de línea):

```
currency-motos currency-motos-hourly
```

Sin esto la app nunca arranca en el VPS; `tests/sync/pm2_registration.test.ts` lo vigila.

No hace falta tocar el filtro `backend` de `.github/workflows/deploy.yml`: estos jobs corren
`dist/sync_motos.js` directo, sin wrapper `scripts/run-*.sh`, y `sync*.ts` + `ecosystem.config.js`
ya disparan el deploy.

## 3. `tests/appdb/schema_parity.test.ts` — ya aplicado ✅

```ts
import { MotoCatalogModel } from "../../classes/models/MotoCatalog";
import { MotoCatalogMetaModel } from "../../classes/models/MotoCatalogMeta";
import { MotoMarketSnapshotModel } from "../../classes/models/MotoMarketSnapshot";

  it("las tres colecciones de motos declaran exactamente los campos del app", () => {
    expect(Object.keys(MotoCatalogModel.schema.obj).sort()).toEqual(appFields(appModel("MotoCatalog")).sort());
    expect(MotoCatalogModel.collection.name).toBe("motocatalog");
    expect(Object.keys(MotoCatalogMetaModel.schema.obj).sort()).toEqual(appFields(appModel("MotoCatalogMeta")).sort());
    expect(MotoCatalogMetaModel.collection.name).toBe("motocatalogmetas");
    expect(Object.keys(MotoMarketSnapshotModel.schema.obj).sort()).toEqual(appFields(appModel("MotoMarketSnapshot")).sort());
    expect(MotoMarketSnapshotModel.collection.name).toBe("motomarketsnapshots");
  });
```

`MotoListing` (`motolistings`) NO va acá, a propósito: es la colección PRIVADA con el historial de
precios y el id del vendedor; el app no la declara y no debe declararla.

## 4. `package.json` — PENDIENTE

En `scripts`, junto a los demás entrypoints:

```json
    "sync_motos": "ts-node sync_motos.ts",
```

## 5. `docs/seo/experiments.json` — PENDIENTE

`/motos-usadas-uruguay` es una página nueva pensada para mover tráfico, así que le toca su fila en
el mismo commit que la publica; sin ella `currency-revenue-plan` no la mide nunca.
`tests/revenueplan/experiments_routes.test.ts` exige que la ruta EXISTA, así que esta fila entra en
el commit que sube la página del app, no antes.

```json
  {
    "id": "motos-usadas-directorio",
    "declaredAt": "2026-09-22",
    "routes": ["/motos-usadas-uruguay"],
    "note": "Directorio de motos usadas: una fila por modelo con banda p25/mediana/p75, tramo de cilindrada y depreciación medida. Se evalúa a los 28 días como PORCIÓN de los clics del sitio."
  }
```

Los nombres exactos de los campos hay que copiarlos de una fila vecina del archivo: este fragmento
describe qué declarar, no inventa el esquema.

## 6. `AGENTS.md` — PENDIENTE

Fila para la tabla de pm2 jobs, entre `currency-movilidad` y `currency-autos`:

> | currency-motos / -hourly | dist/sync_motos.js | 38 13 \* \* \* / 44 \* \* \* \* | `/motos-usadas-uruguay`: el vehículo de trabajo que faltaba entre el boleto y el auto, y el modo `moto` del comparador de transporte, que hasta hoy decía "sin datos relevados". **Reusa el lector de Mercado Libre de autos**, no lo copia: importa `drainTasks`, `facetValues` y `CAR_HARVEST_RETRY` de `classes/autos/sources/mercadolibre.ts`, que encodean un incidente medido —una ráfaga deja al puente `:9656` en su proxy residencial 10 min para TODOS los jobs—, y la misma recta de depreciación (`annualDropOf`/`depreciationOf`, ya ensanchada a `{year, priceUsd}`). Lo propio es la categoría (MLU1763, 1.391 avisos usados en 97 marcas medidos el 22/9/2026) y **el host del permalink, que NO es el de autos**: `moto.mercadolibre.com.uy` contra el `auto.` que autos tiene compilado — con el host equivocado el catálogo sale vacío sin que falle nada. **La dimensión propia es la cilindrada, y llega por dos caminos que no se mezclan**: la EXACTA sale del título con la unidad escrita (`125cc`, `1700 Cc.`) y casi nunca está —2 de 73 títulos en la primera corrida real—, así que el TRAMO (hasta 125 / 126-250 / más de 250) sale de la faceta `ENGINE_DISPLACEMENT` del propio ML, cuyos tramos **se solapan en el borde** (434+568+634 = 1.636 contra 1.391 avisos) y un aviso que cae en dos tramos adyacentes va al de abajo. Cuatriciclos, triciclos y motocarros se excluyen por la faceta `MOTO_TYPE` y no por el título: **16 de sus 23 títulos distintos no nombran su clase** ("Kawasaki Brute Force 750i V-twin", "Honda Trx 420"). Monopatines y bicicletas eléctricas coladas en MLU1763 van al directorio de movilidad, no a éste. Las motos ELÉCTRICAS entran marcadas y **jamás se promedian** con las de combustión. **Un precio en pesos SÍ cuenta para la banda** —divergencia deliberada con autos—: los avisos en pesos son justo el tramo barato (Yumbo/Baccio/Zanella) y descartarlos le borra el piso al mercado que esta página existe para publicar. Guarda de precio propia, con piso en US$ 120 y no en los US$ 200 de autos, porque una moto de trabajo de US$ 400 es un precio real. Los barridos por faceta los hace **sólo la diaria** (~170 páginas) y lo medido queda guardado junto a cada aviso (`motolistings.facets`) para que la horaria no lo borre. **NO publica oportunidades ni teléfonos** en v1. APP DB: `motolistings` (privada, con priceHistory), `motocatalog` (pública, una fila por AVISO), `motocatalogmetas` (`key: "uy-motos"`) y `motomarketsnapshots` (una ficha por modelo más el informe bajo la key reservada `_informe`). Necesita `APP_MONGO_URI`. Ver `docs/superpowers/specs/2026-09-22-motos-usadas-directorio-design.md` |

## 7. Lo que este paquete decidió NO hacer, para que no se pida dos veces

- **`pricewatchoffers` vertical `motos`**: no se escribe, y no es un olvido. `pricewatchEligible`
  (`classes/pricewatch/record.ts`) descarta todo lo que no es `condition: "new"`, o sea que
  rechazaría el catálogo entero — y con razón: el precio de una moto usada es lo que decidió ese
  vendedor ese día, no un descuento sobre un precio de lista, que es lo único que
  `/ciberlunes-y-black-friday-uruguay` puede leer. El historial por aviso existe igual, en
  `motolistings.priceHistory`.
- **Facebook Marketplace y tiendas web**: fuera de v1. El lector de autos identifica cada aviso
  contra el diccionario de ids de ML de AUTOS, y `NOT_A_CAR` descarta explícitamente
  `moto|motos|motocicletas?|scooter`, así que reusarlo es invertirle el criterio, no importar una
  función. El seam está listo (`MOTO_SOURCES` + `dedupeMotos`, con precedencia ML > webs > FB).
  Motorlider (Fenicio) es el candidato natural: ya vende 10 motos que hoy se descartan sólo porque
  KTM/Bajaj/Aprilia/Kymco/Piaggio no están en el diccionario de autos.
- **Los dos barridos por faceta (tipo y cilindrada) sólo los hace la corrida DIARIA**: son ~170
  páginas del puente compartido y la horaria tiene 250 pedidos para todo. Lo que la diaria mide queda
  guardado junto a cada aviso en `motolistings.facets`, con su fecha, y la horaria lo reusa — si no,
  republicaría el catálogo cada hora con el tipo y el tramo en blanco, que es el mismo defecto que
  `equiparstoresnapshots` resuelve del otro lado. Nada de esto se toca en el app.
- **Oportunidades**: la cohorte de autos (modelo+año+versión+motor+caja) no tiene equivalente medido
  en motos. El informe lo dice en sus `caveats` en vez de publicar una ganga que no se puede probar.

## 8. Para el paquete del app (`app/utils/motosPublic.ts`)

El catálogo publica DOS campos que el tipo público del app todavía no declara (los dos schemas son
`strict: false`, así que el dato se guarda y se lee igual; lo que falta es tiparlo y ofrecerlo como
filtro):

```ts
export type MotoPublicDisplacementBandId = 'hasta-125' | '126-250' | 'mas-250'

// dentro de MotoPublicListing:
  displacementBand: MotoPublicDisplacementBandId | null
  displacementBandBasis: MotoPublicEvidence | null

// dentro de MotoPublicCatalogMeta:
  withoutDisplacementBand: number
```

Es el filtro de cilindrada que la página de verdad puede ofrecer: la cilindrada EXACTA la declara el
título y casi nunca lo hace (2 de 73 en la primera corrida real), mientras que el TRAMO lo declara
Mercado Libre para casi todo el catálogo. `withoutDisplacementBand` es cuántos avisos no tienen ni
siquiera eso, para poder decirlo en vez de dejar pensar que no existen.

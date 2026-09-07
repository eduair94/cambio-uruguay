# Servicios cerca del punto publicado

`GET /api/property-nearby/{rent|sale}/{key}` muestra hasta tres puntos registrados de cada categoría a 1.000 metros **en línea recta**, desde la coordenada pública aproximada de una ficha visible. No geocodifica, no usa centros de barrios y no calcula tiempo de viaje ni necesidad de automóvil. Abre una ruta peatonal externa sólo al pulsar un enlace.

Las categorías son supermercado (`shop=supermarket`), almacén (`convenience/grocery/general/food`), farmacia, salud (`hospital/clinic/doctors`), transporte (`bus_stop`, estaciones y plataformas con modo explícito) y educación (`school/kindergarten/college/university`). Los puntos de vías son el centro de su caja de coordenadas, **no una entrada**. Las relaciones no se resuelven en esta versión; el diagnóstico de la captura conserva su número. OSM es colaborativo, por eso `coverage:partial` es permanente, y ningún resultado vacío prueba ausencia de servicios. Las paradas no certifican horarios o líneas vigentes.

## Fuente y actualización

El job `sync_property_services.ts` descarga el [extracto Uruguay de Geofabrik](https://download.geofabrik.de/south-america/uruguay.html) y su MD5 oficial, verifica tamaño/checksum y usa SHA-256 como identidad reproducible. No llama a Overpass por visitante ni consulta portales inmobiliarios. `osm-pbf-parser-node@1.1.4` (MIT; [fuente y formato](https://github.com/borisgontar/osm-pbf-parser-node)) procesa dos pasadas: primero nodos y vías con categoría, después únicamente las coordenadas referidas por esas vías. Nunca guarda todos los nodos del país en memoria, ni identidades de contribuidores, teléfonos o tags arbitrarios.

`dataAsOf` viene de `osmosis_replication_timestamp` del PBF. `fetchedAt` es la lectura del archivo, no fecha de cada negocio. La vigencia usa `dataAsOf`: `ready` hasta 14 días, `stale` hasta 45, después `unavailable`. Una descarga/reimportación del mismo archivo no rejuvenece los datos.

El archivo fuente no puede superar 120 MiB; descarga cinco minutos, parser diez y proceso quince minutos. Se aceptan hasta dos redirecciones dentro del mismo host HTTPS, únicamente hacia extractos Uruguay y sus checksums. Hay hasta dos reintentos por fallo de conexión o respuesta 429/500/502/503/504, con espera progresiva, dentro del mismo presupuesto total. Se respeta `Retry-After`; una pausa pedida de más de 60 segundos difiere la corrida y conserva los datos activos. Hasta 100.000 POI y dos millones de referencias de nodos. Los archivos temporales propios se borran al finalizar. `--file` permite reproducir una captura, exige su `.md5` oficial adyacente y no borra el archivo proporcionado; su ruta y la del reporte deben quedar dentro del worktree.

## Publicación y operación

El único destino es APP Mongo mediante `classes/appdb.ts`, nunca la conexión del backend. `propertyservicepoints` tiene índice compuesto `snapshotId + location:2dsphere`, y unicidad `snapshotId + id`. `propertyservicemetas/_id:uy-property-services` es el puntero activo. Una captura se carga por lotes y se verifica antes de intercambiar el puntero por compare-and-swap; se conservan la generación activa y la anterior. Fallos, extractos vacíos, menos de 500 POI, caída de una categoría >50 %, caída total >30 %, coordenadas inválidas o geometría incompleta >2 % no reemplazan datos válidos. Un lease exclusivo en `propertyserviceleases` protege corridas solapadas.

`currency-property-services` es un pm2 **fork único**, sin autorestart, domingos 07:33 UTC. Está registrado en `OTHER_APPS`; al incorporarse se ejecuta también en el primer arranque. No hay scheduler en el API. Para verificar sin escribir ninguna base:

```sh
npm run sync_property_services -- --dry-run --output=.sdd-property-services-snapshot.json
npm run sync_property_services -- --dry-run --file=.sdd-property-services-source/uruguay-latest.osm.pbf --output=.sdd-property-services-snapshot.json
```

Tras despliegue, la carga inicial autorizada usa `node dist/sync_property_services.js` desde el repo con `APP_MONGO_URI` del entorno del servidor. No necesita nuevas variables de Nuxt ni una clave de mapas. Un error conserva la captura anterior y devuelve exit code 1.

## API y precisión

La API rechaza coordenadas, radio o consultas arbitrarias. Verifica vigencia de la ficha en las mismas colecciones públicas del directorio. En alquileres exige evidencia propia `identity.version:1` de una oferta visible que coincida con el punto público; una contradicción entre coordenadas propias visibles >100 m se abstiene. Una oferta que oculta su dirección no revela su punto ni invalida otro punto público legítimo. Legacy sin evidencia se abstiene. En ventas sólo lee `propertysalecatalog`, nunca la captura privada.

La API no escribe. El snapshot compartido reside en Mongo; cada proceso añade cachés pequeñas y acotadas (128 puntos, 60 s) y agrupa solicitudes simultáneas idénticas. Máximo ocho consultas geográficas simultáneas y tres segundos por operación Mongo. La única consulta geográfica usa `$geoNear` + seis ramas `$facet` con cuatro resultados cada una (el cuarto sólo indica `hasMore`). El HTTP usa 30/60 s; errores no se cachean. La ficha retirada devuelve 404; coordenada ausente `unlocated`; proveedor todavía sin preparar/fallo `unavailable`. Estas situaciones nunca se disfrazan como «no hay servicios».

La UI conserva atribución enlazada [© OpenStreetMap contributors / ODbL](https://www.openstreetmap.org/copyright), fecha de datos y advertencia de aproximación. Los enlaces [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) usan `api=1`, origen/destino y `travelmode=walking`, sin API key. El vínculo OSM lleva al objeto original para revisar la evidencia.

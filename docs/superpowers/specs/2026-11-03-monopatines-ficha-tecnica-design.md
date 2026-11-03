# /monopatines-electricos-uruguay: ficha técnica, filtros por especificación y asesor

Fecha: 2026-11-03. Aprobación automática por orden permanente del dueño (spec y plan).

## Por qué

La página contesta "cuánto sale" (bandas por tipo, modelos, más baratos, directorio con filtros de
tipo/condición/marca/vendedor/precio, normativa). No contesta lo que decide la compra y lo que toda
tienda de monopatines del mundo pone arriba de la ficha: **autonomía, velocidad, potencia, peso que
soporta, peso del aparato, tiempo de carga, ruedas, frenos, plegable**. Xiaomi y Segway abren la
ficha con esa franja; Mercado Libre filtra por esas mismas dimensiones; Decathlon y las tiendas
especializadas agregan "cuál te conviene". El lector uruguayo hoy tiene que abrir aviso por aviso.

Medido el 2026-11-03:

- El directorio tiene **782 avisos** de monopatín (≈ 400 de ML, 146 de Facebook, 20 de tiendas).
- La tarjeta de búsqueda de ML llega con `attributes: []`, por eso la faceta de marca casi no existe
  (Xiaomi 6, Voltbike 1).
- **La ficha propia de ML sí trae la tabla entera** (`andes-table`): Marca, Modelo, Autonomía,
  Tiempo de carga, Potencia del motor, Velocidad máxima, Peso máximo soportado, Tamaño de las
  ruedas, Es plegable, Sistema de frenos, Voltaje y Capacidad de la batería, Peso, Edad mínima. 200
  con nuestra UA, como ya leen `currency-autos-detail` y `currency-rentals-ml-detail`.
- Las tiendas publican lo mismo como texto rotulado (delcar y superbikers con tabla, Shopify en
  `body_html`; voltbike incluso imprime "Consumo de Energía $3 por carga").
- Datos sucios reales: "Largo = 100 m", rangos "20–25 km", "300W, potencia máxima 600 W",
  descripción que dice "rodado 10" con la tabla diciendo 8,5". Precisión sobre recall: un valor
  fuera de banda no se corrige, se descarta.

## Objetivos

1. Leer la ficha técnica de cada monopatín (ML y tiendas) y guardarla, con procedencia por campo.
2. Filtros por especificación en el directorio, con conteo por opción, y órdenes nuevos.
3. Tarjeta del directorio y tabla de modelos con la franja de especificaciones.
4. Asesor "¿Cuál te conviene?": el lector dice trayecto, peso, presupuesto, terreno y si lo carga;
   la página devuelve tres elecciones con nombre ("la más barata que cumple", "más autonomía por
   peso", "la más liviana" o "más potencia para subidas") y el porqué de cada una, y un botón que
   lleva esos requisitos al directorio.
5. Información útil con números del propio mercado: qué esperar de cada tipo (mediana de autonomía,
   velocidad, potencia, peso, tiempo de carga, batería), cuánto cuesta cargarlo con la tarifa de UTE,
   autonomía real contra declarada, la velocidad contra la normativa (25 km/h en Montevideo y San
   José), guía y preguntas frecuentes con cifras vivas.
6. De paso, la marca de la ficha (y la de un diccionario de marcas sobre el título) llena la faceta
   de marca, que hoy no sirve.

## No objetivos

- Bicicletas eléctricas: el diseño es genérico, pero sólo se lee y se publica monopatín. Queda como
  siguiente paso.
- Propagar la ficha de un modelo a otros avisos del mismo modelo (Facebook): v2. Facebook sólo
  aporta lo que dice su título.
- Rankings de "mejor monopatín" o puntajes opacos. El asesor elige por reglas que la página escribe.
- Ninguna ficha de Facebook (sesión del perfil; el título es lo único público).

## Anti-objetivos

- Publicar un número que el vendedor no escribió (inventar la autonomía de un modelo).
- Decir "ilegal": un monopatín que declara 40 km/h se puede usar limitado; la página dice el límite
  del departamento y que el aparato declara más.
- Que el asesor recomiende un aviso de precio dudoso: sólo candidatos `suspect: false`, frescos, con
  ficha leída (no sólo título).
- Romper equipar: el directorio y su normalizador son compartidos; todo lo nuevo se activa sólo con
  `vertical: 'movilidad'` y la forma de equipar no cambia.

## Diseño

### Datos (backend, `classes/movilidad/specs/`)

- `types.ts` — `MonopatinSpecs`: `rangeKm`, `maxSpeedKmh`, `motorW`, `motorPeakW`, `batteryV`,
  `batteryAh`, `batteryWh`, `chargeHours`, `maxLoadKg`, `weightKg`, `wheelInches`, `foldable`,
  `suspension`, `brakes` (texto) + `discBrake`, `bluetooth`, `ipRating`, `minAge`, y `from`:
  procedencia por campo (`ficha` | `descripcion` | `titulo`).
- `parse.ts` (puro) — `mlSpecRows(html)` lee todas las filas de la tabla; `specsFromRows(rows)`;
  `specsFromText(text)` para texto rotulado y prosa ("autonomía de hasta 25 km", "800 W de potencia
  máxima", "36V 8Ah", "4–6 horas", "IPX5"); `specsFromTitle(title)` (más estricto: "25 km/h",
  "350w", "45km" sólo junto a autonomía o como "NN km" sin "/h"); `mergeSpecs` (ficha > descripción
  > título, campo por campo); bandas de cordura por campo (fuera de banda = `null`). Rangos: el
  valor conservador para el filtro "al menos" (autonomía y carga: el menor; peso del aparato y
  tiempo de carga: el mayor). `batteryWh` declarado o V×Ah.
- `brands.ts` — diccionario de marcas de monopatín (Xiaomi, Segway/Ninebot, Atom, K'nex, Gogreen,
  Mistyle, Luxor, Joyor, Navee, S-Pro, …) por palabra entera; la marca de la ficha gana salvo que
  sea un genérico ("Monopatin", "Genérica").
- `read.ts` — una lectura por fuente: ML = la URL del aviso sin fragmento (tabla + descripción);
  Shopify = `<url>.json` (`body_html`); resto de tiendas = HTML sin etiquetas. Contesta
  `{ ok, gone, specs, brand, model }`.
- Colección privada `movilidadspecs` (APP DB): `{ listingId, url, source, readAt, ok, gone,
  failures, specs, brand, model }`. **Una falla se guarda** con `failures` y vuelve a la cola con
  espera (1 → 3 → 7 días, abandona a la cuarta): la cola nunca se traba con avisos muertos
  (lección de Casasweb, 9-10/10). Ficha buena se relee a los 45 días.
- `enrich.ts` (puro) — `enrichMovilidadRow(row, ficha)`: `specs` (ficha + título), `uyuPerKm`
  (`priceUyu / rangeKm`, sólo con ficha), y `brand`/`brandKey` si estaban vacíos. Lo usan los dos
  escritores para que el resultado sea el mismo.
- `sync_movilidad.ts` llama a `enrichMovilidadRow` antes de guardar las filas de monopatín (si no,
  la horaria volvería a dejar la marca vacía cada hora).
- Job nuevo `sync_movilidad_specs.ts`, pm2 `currency-movilidad-specs`, `41 * * * *` (minuto libre;
  ML por la misma IP que :11 y :35): cola = monopatines frescos y no sospechosos, sin Facebook,
  tiendas primero, después ML nuevos; 90 fichas por corrida a 2,5 s, tope 8 min. Después: reescribe
  `specs`/`uyuPerKm`/marca de todas las filas frescas de monopatín y guarda el **snapshot del
  asesor** en `movilidadmetas` (`key: monopatin-ficha`): candidatos compactos (sólo con ficha) y
  estadísticas por tipo y totales. Análisis precalculado, el pedido sólo lee (regla del dueño).
  `--dry-run` no escribe.
- Esquemas `MovilidadListing` (raíz y app) suman `specs` (Mixed) y `uyuPerKm`; índice
  `{ category, 'specs.rangeKm' }` no hace falta con 800 filas.

### API (app)

- `/api/movilidad/productos`: con `vertical: 'movilidad'` acepta `autonomia` (mínimo km),
  `velocidad` (`hasta-25` | `25-35` | `mas-35`), `potencia` (`hasta-350` | `350-500` | `500-800` |
  `800-mas`), `carga` (mínimo kg), `peso` (máximo kg), `rueda` (`hasta-8` | `9-10` | `mas-10`),
  `rasgos` (`plegable`, `suspension`, `disco`, `app`), `ficha=1`. Órdenes nuevos:
  `autonomia_desc`, `precio_km`, `peso_asc`. Facetas por especificación (conteo por opción sin su
  propio filtro). La fila pública suma `specs` (sin procedencia interna salvo un `fromFicha`).
- `/api/movilidad/monopatin-asesor`: devuelve el snapshot (caché 300 s).
- `/api/movilidad/monopatin-electrico`: suma `specStats` (del snapshot) y la ficha de cada modelo
  (`$in` acotado sobre los `listingId` de sus ofertas, en vivo como `withHistory`).

### Página

- Asesor (`MovilidadMonopatinAsesor.vue`) justo después de "Cuánto sale hoy, por tipo". Corre en el
  navegador (los controles responden en el acto, como el comparador de transporte); los candidatos se
  piden recién en el cliente. Reglas escritas en la página: autonomía real = 65 % de la declarada
  (los fabricantes la miden en llano, ~75 kg y 15 km/h), 55 % sobre 90 kg; carga soportada ≥ peso +
  10 kg; potencia ≥ 350 W con algunas subidas y ≥ 500 W con muchas; si lo carga, peso ≤ 15 kg suma.
- Directorio: grupo "Ficha técnica" en el panel de filtros (sólo movilidad), franja de
  especificaciones en la tarjeta, órdenes nuevos. Un aviso sin el dato no cumple ese filtro y el
  panel lo dice.
- "Qué esperar de cada tipo": tabla SSR con las medianas por tipo y el costo de una carga.
- Tabla de modelos: columnas Autonomía, Velocidad, Potencia.
- "Cómo elegir" con cifras; FAQ suma autonomía, tiempo de carga, costo de carga y peso del usuario.
- JSON-LD `Product.additionalProperty` con lo que la ficha dice.
- Fila en `docs/seo/experiments.json` (ruta `/monopatines-electricos-uruguay`).

## Decisiones del constructor (mías)

- Factor 65/55 % de autonomía real, 10 kg de margen, umbrales de potencia, 15 kg "liviano", 15 %
  de pérdida del cargador para el costo de carga: supuestos del sitio, escritos al lado de cada uso.
- Tarifa: UTE Simple, escalón 101–600 kWh con IVA (el mismo que usa el asesor de autos).
- Monopatín sólo; bicicletas después.

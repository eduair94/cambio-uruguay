# E1 — Monopatines y bicicletas eléctricas: precios y reglas por departamento — diseño

Fecha: 2026-09-17. Parte E del plan `docs/seo/2026-09-16-directorios-de-producto-plan.md` y §6 de
`docs/superpowers/specs/2026-09-16-directorios-de-producto-design.md`. E se parte en dos: **E1**
(este documento: monopatines y bicicletas eléctricas) y **E2** (motos 0 km, después de que el
directorio de celulares llegue a `main`, porque reutiliza su identificador y su catálogo por modelo).
Las motos usadas quedan fuera hasta que la sesión de autos termine su marco multi-fuente
(`feat/autos-fuentes`): no se bifurca su cosechador de vehículos.

## 1. Evidencia

- Google Trends (16/9/2026): "bicicleta eléctrica uruguay" +70 %, "monopatín eléctrico" +70 %,
  "bicicleta" 15 % de "dólar" con pico en diciembre.
- SERP uruguayo (VPS :5112, 17/9/2026): "monopatín eléctrico uruguay" → ML, Digital World, Mistyle,
  Cover Company, Zonatecno, dos notas de prensa sobre regulación y un hilo de Reddit; "bicicleta
  eléctrica uruguay" → ML, Urban Bikes, Voltbike, Wheele, Loop, Digital World, Deceleste, Reddit.
  **Ningún comparador y ninguna página que junte precio y norma.**
- Tiendas medidas el 17/9/2026 (APIs públicas de cada plataforma):

  | tienda | plataforma | qué tiene |
  |---|---|---|
  | Delcar Motos (`delcar.com.uy`) | WooCommerce, USD | 205 productos: 88 motos, 9 bicicletas eléctricas, 3 monopatines, 12 "movilidad urbana" |
  | Super Bikers (`superbikers.uy`) | WooCommerce, USD | 99 productos, 2 monopatines, 2 eléctricas |
  | Voltbike (`voltbike.uy`) | Shopify | 89 productos: 5 bicicletas eléctricas, 1 monopatín, 65 accesorios |
  | Loop (`shop.loop-bikes.com`) | Shopify | 135 productos: 13 bicicletas eléctricas, 89 repuestos |
  | Cover Company, Zonatecno, Digital World, Magic Center | ya registradas en `classes/retail/stores.ts` (celulares/equipar) | monopatines en sus catálogos |
  | Mistyle (Wix), Urban Bikes (403), Wheele (Joomla) | sin contrato publicado | fuera |

- Normativa (leída de la fuente el 17/9/2026):
  - **Montevideo** — Decreto de la Junta 37.330 del 24/12/2019, artículos D.709.4 a D.709.12
    (`normativa.montevideo.gub.uy`): casco abrochado y vestimenta de alta visibilidad; por la calzada
    salvo donde haya infraestructura para bicicletas; hasta 25 km/h (monopatines con y sin impulso y
    plataformas tipo segway); 16 años o más para vehículos no empadronables; monopatines y
    bicicletas no se empadronan.
  - **San José** — Decreto Nº 3279 (vehículos de movilidad personal), aprobado por unanimidad por la
    Junta en junio de 2026 y promulgado por la Intendencia (El Observador, 16/9/2026; Primera Hora):
    14 años; 25 km/h; casco y elementos reflectivos; luces, frenos en ambas ruedas, base para los pies
    y dispositivo sonoro; seguro de responsabilidad civil contra terceros; Registro Departamental
    obligatorio y gratuito; prohibido en veredas, espacios peatonales y rutas nacionales; una persona
    por vehículo. **La fecha de vigencia no está confirmada en una fuente oficial**: no se publica.
  - **Durazno, Maldonado, Canelones**: en estudio (El Acontecer 16/9/2026; la diaria abril 2026;
    canelonesciudad). **Resto**: no encontramos norma departamental específica al 17/9/2026.
  - Nacional: el Congreso de Intendentes evalúa una norma común; la UNASEV dijo que la normativa
    vigente desde 2020 quedó desactualizada. No existe una ley nacional específica que el sitio pueda
    citar.

## 2. Qué se construye

1. **Catálogo de equipar parametrizable.** `buildEquiparCatalog` y el clasificador reciben un
   registro de categorías (por defecto el de equipar). Así monopatines y bicicletas reutilizan los
   dos regímenes (`modelo` con marca|modelo, `commodity` con banda p25/mediana/p75), las variantes,
   la banda de usados de Facebook que nunca se promedia con la de nuevo, la guarda de moneda y de
   unidad, la foto de tiendas para la corrida horaria y el historial por oferta. Equipar no cambia:
   sus tests lo prueban.
2. **Registro `classes/movilidad/`** con dos categorías:
   - `monopatin-electrico` (régimen `modelo`; variantes: infantil, urbano, de alto rendimiento por
     potencia/velocidad declarada; `usedOk` con nota sobre la batería),
   - `bicicleta-electrica` (régimen `commodity`; variantes: urbana/paseo, plegable, montaña, carga).
   Exclusiones: repuestos, baterías sueltas, cargadores, cascos, cubiertas, juguetes sin motor,
   motos eléctricas (las E-Yumbo son motos, no monopatines).
3. **Tiendas**: `delcar`, `superbikers` (WooCommerce), `voltbike`, `loopbikes` (Shopify) en el
   registro compartido, más las ya registradas que venden monopatines. `MOVILIDAD_STORE_KEYS` acota el
   job, igual que celulares.
4. **Job `sync_movilidad.ts`** (diario + horario `--fast`), APP DB `movilidaditems` +
   `movilidadmeta` + `movilidadstoresnapshots`, historial en `pricewatchoffers` (vertical
   `movilidad`). Horarios lejos de los que usan el puente de ML (sillas :23, autos :29 y 07:43,
   celulares :37 y 14:29, alquileres :47, equipar :53 y 12:47).
5. **Normativa como dato** (`app/utils/movilidadNormativa.ts`): una fila por departamento con estado
   (`vigente` / `en-estudio` / `sin-norma-encontrada`), reglas, fuente y fecha de revisión. Nunca se
   inventa una regla; lo no confirmado se dice.
6. **Dos páginas** (sólo español): `/monopatines-electricos-uruguay` y
   `/bicicletas-electricas-uruguay`: banda de precios nuevo y usado, modelos con ofertas (monopatines),
   las ofertas más baratas con su tienda (enlace a su ficha en `/tiendas-online-uruguay` cuando existe),
   la tabla de normativa, "cómo elegir" (autonomía, peso, potencia, freno, garantía — sin afirmar
   marcas), qué hacer si se rompe (garantía legal, enlace a `/derechos-consumidor-compras-online`),
   FAQ. Nav, sitemap y contrato SEO.

## 3. Qué NO se publica

- Una regla de circulación sin fuente, una fecha de vigencia no confirmada, ni "es legal"/"es ilegal"
  a secas: se describe lo que dice cada norma y dónde no hay norma.
- Recomendaciones de marca o "el mejor monopatín": sólo precios observados, con fecha.
- El precio de una moto eléctrica bajo "monopatín".
- Un "mejor precio" de una sola oferta sin pasar las guardas.

## 4. Riesgos

- Volumen chico en tiendas: la banda puede no llegar a la muestra mínima. La página dice "sin datos
  suficientes" y muestra las ofertas vistas.
- El puente de ML: presupuesto horario bajo (≤ 8 búsquedas) y ventana propia.
- Normativa que cambia (Maldonado, Canelones, norma nacional): la tabla tiene fecha de revisión y un
  recordatorio en `docs/app/MOVILIDAD.md`.

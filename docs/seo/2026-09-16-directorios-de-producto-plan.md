# Directorios de producto con demanda en Uruguay — plan (16 de setiembre de 2026)

Pregunta: qué directorios del estilo de `/sillas-escritorio-uruguay` o `/alquileres-uruguay` conviene
construir para sumar tráfico. Fuentes, en este orden de peso:

1. **Lo que ya rindió en el propio dominio**: Search Console página × consulta, 90 días
   (17/6 → 14/9/2026, `docs/seo/data/revenue-2026-09-16/page-query-90d.json`, privado).
2. **SERP uruguayo real** de ~40 consultas (`google_search_server` del VPS, `gl=uy`, 16/9/2026).
3. **Google Trends Uruguay**, 12 meses, ≈45 términos de producto y listado (mismo método que
   `2026-09-15-google-trends-oportunidades.md`). Ancla de los grupos: "heladera", calibrada contra
   "dólar" en un grupo propio, así que todo se expresa como **% del promedio de "dólar"**, igual que
   el informe de ayer.
4. Inventario del código: `classes/retail/`, `classes/equipar/`, `classes/chairs/`, bridges de ML
   (:9656) y FB (:9657).

---

## 1. Lo que cambia el plan: la ficha rankea, el hub no

Antes de mirar Trends conviene mirar qué hicieron los directorios que ya existen.

| familia | en vivo desde | URLs con impresiones (90 d) | impresiones | clics | posición típica |
|---|---|---:|---:|---:|---|
| `/sillas-escritorio-uruguay/*` | 25/7 | 227 | 3.927 | 32 | 6–12 |
| `/alquileres-uruguay` (hub) | 20/8 | 2 | 27 | 0 | **40–57** |
| `/precio/*` + `/precios-de-supermercado-uruguay` | 7/9 | 7 | 23 | 0 | 8–11 |
| `/equipar-casa-uruguay` (una sola página) | 10/9 | 1 | 2 | 0 | 10 |
| `/venta-viviendas-uruguay` | 6/9 | 1 | 1 | 0 | 40 |

Equipar, precios y ventas son demasiado nuevos para juzgarlos. Sillas y alquileres no, y dicen dos
cosas que no se ven leyendo el código:

- **Las consultas cabeza no entran.** "alquileres uruguay" da posición 40–57 contra portales con
  autoridad. En sillas, todas las consultas que contienen "silla" suman **104 impresiones en 90
  días** ("divino silla gamer", "vigo sillas"). En Trends, "silla gamer" es el **0,4 %** de "dólar".
  El directorio de sillas no rinde por la demanda del producto.
- **Rinde por el nombre de la tienda chica.** Las fichas de sillas aparecen por "expansion uy" (704
  impr.), "imback" (302), "universo hobby", "carolinas home", "cyber mix uruguay", "tecno miami", y
  sobre todo por **consultas de confianza**: "opiniones de expansión uy" (80 + 32 + 12), "opiniones de
  lg amoblamientos" (51 + 31 + 11), "opiniones de lacuevamuebles", "opiniones de tushop", "opiniones
  de carolinas home", "opiniones de silverled", "muebles web opiniones". Posición 7–10 **sin ninguna
  página que hable de la tienda**: Google usa una ficha de silla porque el vendedor de ML quedó como
  marca en el slug (`expansion-uy-expansion`, `lg-amoblamientos-4011`). En el SERP de "expansion uy opiniones" el sitio sale **4.º**, detrás de Facebook,
  ML e Instagram.

Regla que sale de esto y que ordena todo lo que sigue: **cada directorio se mide por sus fichas de
entidad (tienda, modelo, organismo), no por su hub.** El hub existe para enlazar. Un directorio sin
fichas indexables, como equipar hoy, no tiene con qué rankear.

---

## 2. Demanda en Uruguay (Trends, promedio 12 meses, % de "dólar")

| término | % de "dólar" | estacionalidad | relacionadas que importan |
|---|---:|---|---|
| iphone | **91 %** | pico ene (×2) | top: iphone 17 100, 16, 15, **iphone uruguay 40**, antel iphone 30. Sube: iplace, claro, 256gb, fundas |
| trabajo | 79 % | abr y oct | — |
| celular | 62 % | ene–mar | — |
| alquiler (calibración) | 56 % | ene | — |
| samsung | 45 % | ene | — |
| autos | 40 % | ene | top: **autos eléctricos 100**, alquiler 75, usados 74, byd 28. Sube: **imesi autos eléctricos (breakout)**, geely ex2 (breakout), mg +100 %, híbridos +90 % |
| **llamados** (empleo público) | **36 %** | abr y oct | top: ose 100, laborales 99, ministerio del interior 98, antel 95, uruguay concursa 94, bps 82, caif 78, ute 75. Sube: todos "<organismo> llamados 2026" breakout |
| tres cruces | 30 % | dic | — |
| xiaomi | 25 % | — | — |
| aire acondicionado | **21 %** | **dic–ene ×3,4** | top: inverter 100, **carlos gutierrez 64**, panavox 52, **12000 btu 46**, portátil 45, 9000 btu 36. Sube: "carlos gutierrez … panavox 9000 btu y precio uy" +170 %, kostel +80 %, aire total +200 % |
| pasajes | 20 % | dic–ene | — |
| motos | 19 % | ene–feb | top: motos uruguay, 125, honda, repuestos, yumbo, usadas. Sube: **nombres de concesionarios** (yelton +80 %, cabrera +60 %, super motos, todo motos, plaza motos) |
| buquebus | 18 % | jun y nov | navegacional (buquebus.com ocupa el SERP entero) |
| veterinaria / hoteles | 17–18 % | — | locales |
| celulares | 17 % | dic | top: antel celulares 100. Sube: **tigo celulares (breakout)**, iphone 17 +800 %, samsung a56 +70 %, s25 +60 %, xiaomi 15 ultra +60 % |
| bicicleta | 15 % | dic | sube: **bicicleta eléctrica uruguay +70 %**, monopatín eléctrico +70 %, viking +700 %, gravel +60 % |
| heladera | 14,5 % | dic–ene ×1,6 | — |
| lavarropas | 11 % | plano | — |
| gimnasio | 10 % | feb–mar | local |
| garrafa / leña | 9 % / 6 % | may–jul | supergás regulado (ya en `/precio-de-la-nafta-uruguay`) |
| reclamos | 8 % | — | — |
| notebook | 9 % | — | contaminado por "notebook lm" |
| playstation / juguetes | 7 % / 7 % | dic | — |
| medicamentos | 6 % | — | top: msp, "repetición de medicamentos española" (trámite, no precio) |
| colchón | 5 % | feb | — |
| black friday | 4 % promedio | **semana 23–29/11 ≈ 82 % de "dólar"** | — |
| televisor / auto eléctrico / 0km | 3–4,5 % | — | — |
| neumáticos | 2,5 % | ene | top: **todo nombres de casas** (millán, rasa, bonilla, carrasco, larratea, panam) |
| tienda online / es confiable | 2,4 % / 1,9 % | — | "es confiable" sube para sitios extranjeros (viagogo, edestinos, edreams, buscalibre, stubhub) |
| mutualista / fibra óptica / pellets | 1–2 % | — | — |
| farmacia de turno / seguro de auto | ≈1 % | — | — |
| cyber lunes | 0,7 % | **dos ediciones: 2–8/11/2025 y 31/5–6/6/2026** | — |
| paneles solares / silla gamer / útiles escolares | ≤0,6 % | — | — |

Trends mide búsquedas, no clics: "motos" incluye juegos y "bicicleta" una canción. Sirve como
escala, no como pronóstico.

---

## 3. SERP uruguayo (16/9/2026): dónde se puede entrar

| tipo de consulta | quién ocupa el top 8 | lectura |
|---|---|---|
| precio de producto: heladera, lavarropas, aire 12000 btu, colchón, notebook, pc gamer, PS5, motos 125, bicicleta, neumáticos, celulares baratos, samsung a56 | ML + 6–7 tiendas sueltas (magiccenter, sodimac, loi, zonatecno, deceleste, thot, dormimundo…) | **ningún comparador**; el hueco existe, la autoridad no: apuntar a la cola de modelo y tienda, no a la cabeza |
| precio iPhone 17 / 17 Pro Max | Antel, iPlace, Tigo, Claro, ML, El País, zonatecno | tiendas de operador + prensa |
| **"conviene comprar iphone en estados unidos uruguay"** | reddit, reddit, instagram, facebook, infobae, Apple Communities, tiktok, El Observador | **sólo contenido de usuarios**: nadie lo contesta con números |
| **opiniones / reclamos de tiendas**: tiendamia, magic center, loi, tienda inglesa, "tiendas online confiables uruguay", "es confiable temu uruguay" | reddit, trustpilot, facebook, yoper.com.uy, opinamos.io, tuquejasuma, sikayetvar, mitienda.uy | **foros y redes arriba**: la regla de `currency-search-demand` dice que ahí se entra |
| medicamentos precio | farmaprecio.uy, farma.uy, farmashop, san roque | **ya hay comparadores** |
| cuánto vale mi auto | autovalor.uy, carone, cotizador carrica, miauto | **ya hay tasadores** |
| autos eléctricos precios | mielectrico.uy, ML, vipercar, automagazine, emobility-uy | competidor nicho presente |
| llamados ose 2026 / llamados antel 2026 | el organismo, Uruguay Concursa, instagram, facebook, El País, Montevideo Portal | institucional + redes + prensa: se entra |
| llamados abiertos uruguay | Uruguay Concursa, gub.uy, IMPO, IM, indeed, jooble | agregadores genéricos presentes |
| buquebus precio pasaje | buquebus.com ×5 | navegacional, no se entra |
| cyberlunes uruguay 2026 | ciberlunes.uy ×2, mostraloweb, ML, instagram | el organizador ocupa la cabeza |

---

## 4. Lo que el sitio tiene y nadie más junta

Un directorio de precios más compite contra ML. Lo que ninguna tienda puede publicar es el cruce con
datos que el sitio **ya** calcula:

- cotización del día y couriers (`courierShipping`), franquicia, IVA del "impuesto Temu", permiso de
  URSEC para celulares (`aduanaFaq.ts`, id `celular-router-drone`);
- descuentos con tarjeta por marca y rubro (Bankos) y el costo de pagar en cuotas;
- UTE: factura y **Plan Redondo** (`householdBills.ts`: $ 2.500 por equipo eficiente registrado,
  compras del 1/9/2026 al 31/3/2027);
- nafta y supergás (`currency-combustibles`), IMESI a eléctricos, patente (SUCIVE);
- reseñas de Google y Trustpilot (servicios del repo trustpilot, :2221 y :3029), sentimiento de
  Reddit, reputación de vendedor de ML;
- **historial de precios propio**: equipar guarda 365 días por ítem (`classes/equipar/store.ts`) y
  sillas 180 (`classes/chairs/catalog.ts`).

---

## 5. Candidatos, en orden

### A. Tiendas online uruguayas: opiniones, reclamos y qué tan confiables son — PRIMERO

**Evidencia.** Es el único candidato con posiciones **ya medidas en este dominio** (7–10, sin
página dedicada, §1) y el SERP es de foros y redes (§3). Demanda: reclamos 8 %, tienda online
2,4 %, es confiable 1,9 %, más la cola por nombre, que es la que Trends no agrega.

**Qué.** `/tiendas-online-uruguay` (hub) y `/tiendas-online-uruguay/<tienda>`, una ficha por tienda
con **señales verificables y fechadas**, nunca un veredicto propio:

- identidad publicada: razón social, dirección física, teléfono, antigüedad del dominio (primer
  certificado en crt.sh o primera captura del Wayback), plataforma detectada (Fenicio, Shopify,
  VTEX, Woo);
- reputación externa con su fuente y su fecha: Trustpilot y Google (conteo + promedio), vendedor de
  ML (nivel, ventas), menciones en r/uruguay con el pipeline de sentimiento;
- medios de pago (qué protege un contracargo), envíos y devoluciones, derecho de arrepentimiento con
  su norma;
- en qué rubros aparece más barata en nuestras cosechas (con la guarda de que un precio `stale` nunca
  encabeza);
- descuentos con tarjeta vigentes (enlace a `/descuentos-con-tarjeta-uruguay/marca/<marca>`);
- "qué hacer si no te entrega" hacia las páginas de consumidor que ya existen
  (`/defensa-al-consumidor-uruguay`, `/derechos-consumidor-compras-online`).

**Semilla** (~80): las 16 tiendas de `stores.ts`, los vendedores de sillas y equipar con ≥3 ofertas,
las tiendas oficiales de ML y las que aparecieron en los SERP de §3 (loi, tushop, magic center, tienda
inglesa, sodimac, zonatecno, iplace, thot, pccompu, deceleste, mundoelectro, dormimundo…), más las
plataformas extranjeras que ya sostienen la familia `/importar/*` (Temu, Shein, AliExpress, Amazon,
Tiendamia).

**Guardas.**
- Indexar sólo fichas con **≥3 señales independientes**; el resto `noindex` hasta completar.
- Ninguna palabra "estafa" o "no confiable" de nuestra autoría: se publican conteos con fuente.
- Cero datos personales de quien opina (Ley 18.331), igual que `/mercado-it-uruguay`.
- Contacto de réplica visible en cada ficha.
- Las fichas de sillas que hoy captan "opiniones de <tienda>" enlazan a la ficha nueva. No se
  redirigen: son otra intención.

**Datos.** Un job semanal nuevo (`currency-store-profiles` → APP DB `storeprofiles`, un documento por
tienda). Reusa los servicios de reseñas y el pipeline de Reddit; lo único nuevo es la identidad del
dominio.

**Esfuerzo:** 5–6 días. **Métrica a 8 semanas:** impresiones por URL ≥ las de sillas (3.927 / 227 ≈
17 cada 90 días) y consultas "opiniones de" / "es confiable" / "reclamos" apuntando a la ficha y no a
una silla.

### B. Aire acondicionado, heladera, lavarropas, colchón, TV: fichas sobre la cosecha de equipar — EL MÁS BARATO

**Evidencia.** La cosecha ya corre todos los días para 38 categorías (19 en régimen `modelo`) y guarda
historial. Falta sólo la superficie: equipar es una página y las subpáginas por categoría figuran como
pendientes en `docs/app/EQUIPAR.md`. Demanda: aire 21 % con pico ×3,4 en dic–ene, heladera 14,5 %,
lavarropas 11 %, colchón 5 %, TV 4 %. SERP: ML más tiendas, sin comparador.

**Qué.**
- `/equipar-casa-uruguay/<categoria>`: banda p25/mediana/p75 por variante (9000/12000/18000 BTU,
  inverter o no; frío seco o no frost; kg de carga), lo más barato por variante y dónde.
- `/equipar-casa-uruguay/<categoria>/<marca-modelo>`: sólo régimen `modelo` con ≥2 ofertas vistas en
  los últimos 7 días (la misma regla de sitemap que sillas).
- El cruce propio: **cuánto suma a la factura de UTE** por consumo declarado, si **califica para Plan
  Redondo** ($ 2.500 hasta el 31/3/2027) y qué tarjeta tiene descuento en ese rubro.

**Expectativa honesta:** no va a ganar "aire acondicionado precio" contra ML. Va por la cola que
Trends muestra subiendo: marca + BTU + tienda ("panavox 12000 btu", "kostel", "midea", "carlos
gutierrez aire acondicionado").

**Cuándo:** aire antes del **1 de noviembre** (la curva despega el 30/11 y pica el 28/12); heladera y
lavarropas en la misma tanda. **Esfuerzo:** 3–4 días. **Métrica:** impresiones de consultas con
BTU, marca o modelo hacia las fichas.

### C. Celulares: precio por modelo en cada tienda y "¿conviene traerlo?"

**Evidencia.** La demanda más grande del barrido de productos: iphone 91 %, samsung 45 %, xiaomi
25 %, celulares 17 %, con iPhone 17 +800 %, "tigo celulares" breakout, A56 y S25 subiendo. La
pregunta de decisión ("¿conviene comprarlo en Estados Unidos?") tiene un SERP **hecho sólo de
Reddit, Facebook, TikTok e Instagram**.

**Qué.**
- `/celulares-uruguay/<modelo-almacenamiento>` (p. ej. `iphone-17-pro-256gb`): precio contado libre en
  Antel, Claro, Tigo, iPlace, zonatecno, loi, nstore, cellularcenter, covercompany y ML, con la fecha
  de cada precio. Nada de "precio con plan": no se compara.
- Sección fija **"Traerlo de Estados Unidos"** con números del día: precio de lista de Apple o Samsung
  en EE.UU. + impuesto de venta según estado + courier por peso + IVA según la franquicia vigente + el
  **certificado URSEC**, que un celular sí necesita (≈ $ 239 en VUCE). Contra eso, el precio local
  más barato y en cuántas cuotas sin recargo.
- Guía madre `/guias/conviene-comprar-celular-afuera-uruguay`: cuando se trae como viajero y cuando
  por courier. La lógica es la misma que `/importar/*`, la familia de mejor CTR del sitio.

**Riesgos.** Identidad del modelo (almacenamiento, color, "e" contra base), precios de operador atados
a un plan, y tiendas que no están en ninguna de las cuatro plataformas del cosechador: hay que hacer
el relevamiento antes del spec. Matching por variante exacta (256 contra 256), la lección de la
canasta emparejada.

**Cuándo:** antes del CyberLunes de noviembre y de la temporada de regalos (celulares pica en
diciembre, iPhone en enero). **Esfuerzo:** 6–8 días (relevamiento de tiendas, `CategorySpec`,
normalizador de modelos y calculadora de importación).

### D. CyberLunes y Black Friday: ¿el descuento es real? — depende de A, B y C

**Evidencia.** Black Friday es 4 % de "dólar" en promedio, pero su semana pico llega a ≈82 %.
CyberLunes tiene dos ediciones al año (primera semana de noviembre y de junio). SERP: el organizador,
ML, Reddit, Instagram, gub.uy.

**Qué.** `/ciberlunes-y-black-friday-uruguay`: para cada producto de sillas, equipar y celulares en
oferta, el precio del evento contra **su mínimo de los 30 y 60 días previos** según nuestro
historial. Además, qué dice la Ley 17.250 sobre el precio anunciado y qué tarjetas tienen promo ese
día. Ninguna tienda puede publicar esto sobre sí misma.

**Dependencia dura:** necesita historial. Equipar acumula desde el 10/9, así que para la edición de
noviembre llega con ~55 días; celulares sólo si C sale antes del 15/10. **Verificar la fecha de la
edición 2026 en ciberlunes.uy** (en 2025 fue la semana del 2 al 8 de noviembre). Black Friday cae el
27/11/2026. **Esfuerzo:** 3 días sobre A, B y C.

### E. Motos y bicicletas (eléctricas incluidas)

**Evidencia.** Motos 19 % (pico ene–feb), bicicleta 15 % (pico dic). Lo que sube son **nombres de
concesionarios** (Yelton, Cabrera, Super Motos, Plaza Motos: el patrón de las sillas) y "bicicleta
eléctrica uruguay" y "monopatín eléctrico" +70 %. SERP: ML más concesionarios, sin comparador.

**Qué.** Fichas por modelo de moto 0 km (Yumbo, Winner, Baccio, Honda 125/150) con ofertas por
concesionario y banda de usados por modelo y año, con FB separado de nuevo como en equipar. Cruces:
patente de moto (SUCIVE), crédito prendario (guía existente) y consumo contra la nafta del día. Para
bicicletas y monopatines eléctricos, la regla de circulación vigente con su norma, que hay que
verificar antes de publicar.

**Cuándo:** antes de diciembre. **Esfuerzo:** 5 días. Los concesionarios también alimentan A.

### F. Llamados públicos por organismo — decisión del usuario, fuera de "producto"

**Evidencia.** "llamados" es el 36 % de "dólar", más que cualquier producto salvo el iPhone, y
"uruguay concursa" otro 12 %. Todo lo que sube es "<organismo> llamados 2026". SERP: el organismo,
Uruguay Concursa, redes y prensa. Encaja en la temática trabajo, junto a seguro de paro, aguinaldo y
trabajo en negro.

**Qué.** `/llamados-publicos-uruguay/<organismo>` (OSE, ANTEL, UTE, BPS, INAU, CAIF, ANEP/UTU,
Ministerio del Interior, intendencias): abiertos con fecha de cierre, requisitos, sueldo nominal y
**líquido calculado**, y el historial "¿cuándo suele abrir OSE?", que ningún organismo publica.

**A resolver antes:** Uruguay Concursa es una SPA de Angular; el dato sale de su API y hay que leer
sus términos. La frescura es crítica: un llamado vencido como "abierto" es peor que no publicarlo.
Rendimiento publicitario desconocido. **Esfuerzo:** 6–7 días más la verificación de términos.

### G. Autos eléctricos e híbridos — sección, no directorio

"autos eléctricos" es la relacionada número uno de "autos" (40 %) y "imesi autos eléctricos" es
breakout. Pero `mielectrico.uy` ya encabeza "autos electricos precios uruguay" y `byd.com.uy` es dueño
de las consultas por modelo. Alcanza con ampliar `/impuesto-autos-electricos-uruguay` con una tabla de
precio de lista por modelo, costo por km eléctrico contra nafta (datos del día) y patente estimada.
**Esfuerzo:** 2 días.

---

## 6. Descartados, con el motivo

| candidato | motivo |
|---|---|
| precio de medicamentos | farmaprecio.uy y farma.uy ya lo hacen; "medicamentos" es trámite MSP |
| valor de auto usado | autovalor.uy, carone y el cotizador de carrica; "autos usados" exacto = 2,3 % |
| Buquebus / Colonia Express / pasajes | navegacional; tarifas dinámicas por fecha |
| farmacia de turno, gimnasios, veterinarias | local o navegacional; farmacia de turno = 1 % |
| seguro de auto, fibra óptica, paneles solares, pellets | ≤2 % |
| garrafa y leña | supergás regulado y ya publicado; la leña la venden particulares por redes |
| notebooks / PC gamer | índice contaminado por NotebookLM; retomar como extensión de C (mismas tiendas) |
| útiles escolares | 0,2 % |
| más directorio de sillas | la demanda del producto es 0,4 %; lo que rinde se lo lleva A |
| hubs por término cabeza como objetivo | alquileres: posición 40–57 tras cuatro semanas |

---

## 7. Calendario

| semana | qué | por qué ahí |
|---|---|---|
| 16–26 sep | **B** fichas de aire, heladera y lavarropas · **A** con las ~20 tiendas que ya aparecen en GSC | B no necesita datos nuevos; A tiene posiciones que hoy se pierden |
| 28 sep – 10 oct | **A** completo (~80) · relevamiento de tiendas de celulares | — |
| 12–25 oct | **C** celulares + calculadora de importación | historial antes del CyberLunes |
| hasta ~26 oct | **D** CyberLunes (confirmar fecha) | ~55 días de historial de equipar |
| 2–20 nov | **E** motos y bicicletas · D actualizado para Black Friday (27/11) | picos de dic–feb |
| después | **G** sección de eléctricos · **F** si el usuario lo aprueba | — |

## 8. Medición y reglas de corte

- Línea de base por familia: impresiones, clics y URLs con impresiones a 28 y 56 días del
  lanzamiento, con `docs/seo/data/revenue-2026-09-16/collect-page-query.cjs`. Referencia: sillas.
- **Corte:** una familia con <5 impresiones por URL a las 8 semanas pasa sus fichas flacas a
  `noindex` y conserva el hub. Nada de inflar el índice con 1.000 fichas vacías.
- Sitemap: sólo fichas con datos vistos en los últimos 7 días y con ≥2 ofertas o ≥3 señales.
- Contrato SEO (`tests/unit/seoContract.test.ts`): cada familia nueva entra con título y descripción
  propios, canonical, BreadcrumbList, un solo H1 y verificación en el sitemap.
- **Ingreso:** los listados rinden un orden de magnitud menos por vista que las guías (detalle privado
  en `docs/seo/data/revenue-2026-09-16/README.md`). Por eso cada directorio sale con **su guía de
  decisión** (C: "¿conviene traerlo?"; A: "qué hacer si una tienda no entrega"; B: "qué BTU
  necesitás y cuánto suma a UTE"), y la hipótesis de ubicar un bloque in-article en las fichas se anota
  en `docs/seo/adsense-growth-loop.md` en vez de tocarse aparte: ese bucle es el dueño de los cambios
  de anuncios.

## 9. Método y límites

- Trends: API interna desde un navegador con sesión (home de Trends primero). Grupos de 5 con
  "heladera" como ancla, calibrada en el grupo `dolar, alquiler, celular, silla gamer, heladera`
  (heladera = 14,5 % de dólar). La relación entre aire acondicionado y heladera dio 1,46 en dos grupos
  distintos, así que el ancla es estable. Corta con 429 si las llamadas van a menos de ~12 s entre
  grupos y 15 s entre relacionadas; los grupos cortados se repitieron.
- SERP: `google_search_server` (:5112) consultado por SSH desde el VPS, sólo lectura, top 8 por
  dominio.
- GSC: ventana 17/6–14/9/2026. Equipar, precios y ventas tienen menos de dos semanas en esa ventana:
  su cero todavía no es un veredicto.
- Nada de este plan está implementado. Cada candidato lleva su propio spec, y las cifras de terceros
  (URSEC, Plan Redondo, fecha del CyberLunes, reglas de eléctricos) se reverifican contra la fuente
  primaria el día que se escriben.

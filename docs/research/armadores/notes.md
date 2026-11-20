# Armadores de muebles en Montevideo: relevamiento del 11 de noviembre de 2026

`editorial.json` tiene 56 fichas. 17 tienen precios, con 317 filas en total. Por tipo hay 32 independientes, 7 empresas, 13 tiendas y 4 plataformas. Cada precio, contacto y cobertura lleva el enlace que se abrió. Cuando un dato salió sólo del fragmento de un buscador, la nota de `sources` lo aclara. Un precio publicado no garantiza el precio final, la disponibilidad ni la calidad del trabajo. Casi todas las fuentes dicen que el monto depende del modelo, de cuántos muebles son y de la zona.

## Punto de partida: las siete fuentes de septiembre, vueltas a abrir

| Proveedor | Estado al 11/11/2026 |
|---|---|
| Armado FAST | Mismos precios "desde" de Montevideo, fechados "Actualizado enero 2026". Se agregaron los precios de su FAQ (ropero de 6 puertas y 2 cajones desde $2.100; escritorio gamer desde $1.220; escritorio en L desde $1.830) y los de desarmado. Su FAQ dice que es una **plataforma** de armadores independientes que fijan su precio al cotizar, por eso `kind: "plataforma"`. |
| ArmadoresMontevideo | Mismos importes que en septiembre; ahora se cargó la tabla completa (29 rubros). Sigue la lista de barrios donde "no realizan armado". |
| Furniture Home | Mismos rangos, en una sección titulada "(2026)". |
| UNSI | Mismas tarifas. Se agregaron sillas de comedor ($250 / $200) y de oficina ($370 / $320). Es armado en la tienda para enviar el mueble ya armado, no armado a domicilio. |
| Naterial | El dominio pasó a `naterial.uy` (301). Mismos importes en USD, con la política todavía fechada en marzo de 2025. |
| Transportes Sánchez | Sin cambios: $1.500 si el mueble lo arma una persona, $2.600 si lo arman dos. |
| DT Transportes | **Retiró el precio.** La página de packs ya no menciona "armado" ni "MDF"; en septiembre tenía Armado y Desarmado MDF a $1.200 dentro de una mudanza. Queda la ficha con `prices: []`. |

## Qué se buscó

- **Buscador web**, con variantes de: "armado / armador / armadores de muebles", "a domicilio", "Montevideo", "precio", "placard", "ropero", "mesa de luz", "Ciudad de la Costa", nombres de barrios, "instagram" y "facebook".
- **Cada nombre del pedido**: Atope, EL ARMADOR, ARMADOS FABEN, Jc Armados, el Rey, Armados Ya 2022, Sosa armados, SolucionesYa, J&E HERMANOS, Matías Carrasco, D&V y Beto.
- **Directorios**:
  - 1122.com.uy: rubros "Armados Muebles" (2 páginas) y "Desarmados Muebles". Se abrió cada ficha, que trae el teléfono completo.
  - guiacomercial.uy: copia los datos de Google Maps, con el nombre exacto de la ficha, la dirección y el teléfono. Se buscó "armador", "armado" (las 18 páginas de resultados), "armados", "armadores", "desarmado" y "montaje".
  - evisos, planetauruguay, urufacil, findglocal, yorugupino, Construex y guiatotal.
  - paginasamarillas.com.uy: el buscador no devolvió ninguna página uruguaya.
- **Reddit**: r/uruguay (dos búsquedas y un hilo abierto). r/montevideo es privado y devuelve 403.
- **Tiendas y plataformas**: las relevó un subagente con curl y Playwright: Sodimac, Tienda Inglesa, Divino, Multiahorro, El Emporio del Hogar, Tienda Max, Mosca, Kuma, NYR, JYSK, Mulata, Mobilart, Mobili, Ártico, La Cueva, El Bunkker/GoStore, Mare, Marvic, Narvaja, ALMANGO, ArreglaTodo, Mercado Libre, Zolvers, Mi Changa, Hogarisimo, Kunan, Servicios Ya, HomeSolution y Habitissimo. Después se sumaron PGU y Casa Brava, que aparecieron en búsquedas.

No se inició sesión en ningún sitio, no se escribió a nadie y no se envió ningún formulario.

## Hallazgos principales

1. **ATOPE (atope.uy)** publica 33 precios por tipo de mueble en el formulario de agenda del sitio: mesa de luz $350, placares hasta 125 cm $649, de 126 a 230 cm $950 y de más de 231 cm $1.250, cinco modelos de placard a $1.690, casitas de jardín de $1.790 a $7.900. El sitio da 403 a WebFetch y se leyó con curl.
   - Su teléfono (095 357 584) es el de **Anthony Pintos**, que Divino y El Emporio del Hogar recomiendan como armador externo. Se fusionaron.
   - El formulario deja elegir la tienda donde se compró el mueble (Divino, Expansionuy, JYSK, MercadoLibre). No dice si el precio cambia según la tienda. Las etiquetas están truncadas en el original y se copiaron así.
   - Es casi seguro el "Armador de muebles # Atope" de Google Maps, pero esa ficha no se vio. Por eso `googleName` quedó en `null`.
2. **Divino y El Emporio del Hogar publican la misma tarifa de referencia** (41 rubros, con IVA, por mueble), que cobra el armador externo que el cliente contrata. Ejemplos: mesa de luz $410, placares de $740 / $1.100 / $1.430, juego de comedor de 6 sillas $1.430, casita garage $9.000. Es la grilla de rubros más copiada del mercado: Carpinteros del Uruguay y ATOPE usan los mismos rubros con otros importes.
3. **NYR publica la lista de precios propia de cada armador que recomienda**: Ignacio Alanis (13 rubros), SOLUCIONESYA (19), ALMANGO (19) y Francisco y Franco Boris (sofás, con precio distinto para Montevideo y para Ciudad de la Costa).
   - La misma mesa de luz figura a $480, a $500 o a $469 según el armador.
   - ALMANGO cobra distinto según la tienda: $469 en la lista de NYR y $410 en la tarifa de Divino.
4. **El cotizador de ALMANGO** carga un catálogo de 36 rubros más para el convenio NYR, que el subagente leyó del JSON que la propia página pide: cucheta básica $1.255, desarmado de placard $1.350 / $1.990, soporte de TV hasta 55" $1.350, mueble de baño $1.190, rack con panel $3.050 / $4.790, caseta garage $13.375.
5. **ArmadoresMontevideo tiene la lista más baja con sitio propio**: mesa de luz y silla $350, placard de 2 puertas $700, de 6 puertas $1.300, cucheta $1.200. A cambio, excluye nueve barrios del oeste y del norte, más Villa Biarritz.
6. **Armado FAST queda bastante más arriba en placares y camas**: roperos desde $1.490, camas desde $2.240. Es el único que publica el desarmado por separado ($620 a $2.800) y fecha los precios (enero de 2026).
7. **Furniture Home** publica rangos y no precios fijos: placares medianos de $1.900 a $2.500. **Carpinteros del Uruguay** tiene 32 precios estimados, sin fecha y sin teléfono publicado.
8. **El armado gratis existe, pero sólo sobre lo que vende cada tienda**: Tienda Max (Montevideo, más $100 por piso), Mobilart (departamento de Montevideo), Mobili (envío por zonas) y Ártico (zona metropolitana). Esos "$0" no se cargaron en `prices`, porque mezclados con tarifas reales bajarían cualquier mínimo o mediana. Quedan en la nota de `sources` de cada ficha.
9. **PGU cobra el armado aparte en cada ficha de producto**, con un importe propio por mueble (de UYU 1.012,70 a 2.655,90). El importe cambió respecto de un fragmento de buscador más viejo, y la descripción de la misma ficha dice que el armado es tercerizado. Las dos cosas se citan en `conditions`.
10. **1122.com.uy es la mejor fuente de independientes sin web**: dio 12 armadores con teléfono completo y, en algunos casos, dirección (Jorge Martínez en Branzen 1964, MG en Robinson 3379, Servicios M,E en Pompillo y Novas 3074). guiacomercial.uy confirmó los nombres exactos de Google para Armado FAST, Furniture Home, J&E HERMANOS, D&V y Beto.

## Criterios aplicados

- **Moneda.** "$" se leyó como peso uruguayo (UYU): todas las fuentes son uruguayas y nombran pesos cuando aclaran. Sólo Naterial publica en USD, y así quedó.
- **Tipo de precio.**
  - `from`: sólo cuando el texto dice "desde" (Armado FAST y el último tramo de Furniture Home).
  - `range`: cuando el texto da un tramo.
  - `exact`: el resto.
- **Fecha (`publishedAt`).** Sólo si la fuente fecha el precio:
  - `2026-01` en Armado FAST ("actualizado enero 2026").
  - `2026` en ArmadoresMontevideo y Furniture Home (títulos "2026").
  - `2025-03` en Naterial.
- **Rubros.**
  - "Set respaldo y mesas de luz" va como `otro` y no como `mesa-de-luz`, para que el rubro mesa de luz no se infle.
  - "Camas marineras y tricamas" va como `cama`; sólo "cucheta" usa `cucheta`.
  - "Cómodas y zapateras" va como `comoda`.
- **Cobertura.**
  - `allMontevideo: true` cuando el proveedor declara "Montevideo" como zona, sin exclusiones.
  - ArmadoresMontevideo queda en `false` por su lista de barrios excluidos. Esa lista va en `summary` porque el esquema no tiene un campo para exclusiones.
  - Las fichas de 1122 y de Google sin zona declarada quedan en `false` con `barrios: []`, que significa "no publicado", no "no atiende".
- **Contactos de armadores recomendados por tiendas.** Diego Vidal, Gonzalo Dematté, Sergio Fernández, Ferreira Armados, Carlos Castro, Armados GL, Hamilton Da Rosa, Fernando Menéndez, Ignacio Alanis, SOLUCIONESYA, los Boris y Alejandro: su número lo publica la tienda que los recomienda (Divino, El Emporio, UNSI, NYR, Casa Brava), no el armador. Se incluyeron porque esas tiendas los publican para que el cliente los llame. Cada nota de `sources` lo dice. Si la página no debe mostrar contactos de segunda mano, hay que filtrar esas 12 fichas.
- **Contactos de directorios.** Los de 1122 y guiacomercial (que copia la ficha de Google) son contactos comerciales de un listado. No se tomaron teléfonos de reseñas, comentarios ni publicaciones personales.
- **Deduplicación por teléfono.** La validación no encontró ningún teléfono repetido entre fichas. Fusiones hechas:
  - ATOPE con Anthony Pintos.
  - Ferreira Armados con "Jorge Ferreira".
  - Diego Vidal (UNSI, Divino y El Emporio).
  - Almango, que figura en las cuatro tiendas.
  - Armados GL se fusionó por nombre y zona idénticos, aunque cada tienda publica otro número.

## Inconsistencias que conviene ver antes de publicar

- **Armado FAST.** La página `/uruguay` cita "ropero de 6 puertas desde $1.500" y "escritorio simple desde $620". La página de precios de Montevideo dice ropero de 6 puertas y 2 cajones desde $2.100 y escritorios desde $990. Se cargó sólo la página de precios, que es la fechada. Además, en la misma página de precios las bibliotecas figuran desde $990 en un bloque ("Escritorios y bibliotecas") y desde $620 en otro ("Bibliotecas y estantes"): se cargaron las dos filas con su etiqueta.
- **ArmadoresMontevideo.** Las páginas `/servicios/`, por barrio y por tipo de mueble muestran cifras distintas de `/precios/`, según fragmentos de buscador: mesa de luz $300, placares pequeños $600–900, grandes $1.000–1.500, marineras $800. Se cargó sólo `/precios/`, titulada "2026". La ficha de 1122 con el mismo nombre y dirección da otro teléfono (092 872 427); se incluyó con su enlace.
- **AF Armados.** El sitio dice 096 355 694 y la ficha 1122 de "AF - armador de muebles" dice 096355684. Se tomó sólo el del sitio.
- **S Y A Muebles (Centro) y SYA Muebles (Cordón).** Nombres casi iguales, sin teléfono en común: dos fichas. Puede ser el mismo negocio.
- **JC Armador de Muebles (1122) y Jc Armados (Facebook, La Teja).** Sin teléfono en común: dos fichas.
- **Furniture Home.** Su Google Site usa también el nombre "Armado Express". armadoexpressuy.com es otra ficha porque tiene otro WhatsApp (094 792 623) y otro Instagram.
- **La Cueva Muebles** vende un producto "Armado $1500" sin decir a qué mueble corresponde, y no dice "desde". Por la regla del pedido quedó fuera de `prices`.

## Rechazados o fuera de alcance

- **Nombres del pedido que no aparecieron**:
  - "Armador de muebles el Rey": sólo una "Fábrica de muebles El Rey" en Facebook, sin país ni servicio de armado.
  - "Armados Ya 2022": sólo un "Armados ya!" de Santiago de Chile.
  - "Sosa armados": sólo mueblerías Sosa de México y Argentina.
  - "Armador de Muebles Matías Carrasco": nada; el único Matías armador es Matías Rodriguez, de Salto.
- **ARMADOS FABEN**: yorugupino lo clasifica como tienda y fábrica de muebles en Ciudad de la Costa, y Construex le lista productos. No apareció ningún servicio de armado ni cobertura de Montevideo.
- **Canelones sin evidencia de cobertura en Montevideo**:
  - TJ armado de muebles a domicilio (Las Piedras, +598 96 152 557).
  - "Armador de muebles" (Las Piedras, +598 97 086 345).
  - Lateral. Armado de Muebles (Las Toscas, +598 94 646 050).
  - Armadores sin nombre en Neptunia y San Ramón.
  - Beto y D&V sí se incluyeron, porque el pedido los nombra, pero con `allMontevideo: false` y la falta de cobertura escrita en el resumen.
- **Recomendados por tiendas fuera de Montevideo**: Schubert Pereyra, Michael Goro y Brian Morales (Costa de Oro, UNSI); Emiliano García y Marcos Cabral (Maldonado y Rocha); Pedro Burdín y Matías Rodriguez (Salto); Nicolás Alvarez (Las Piedras).
- **Clasificados viejos o incompletos**:
  - Gabriel, "Armadores profesionales" en evisos: el aviso tiene más de 60 días (el buscador lo estimó en unos 3 años), y su único importe ($550 por un modular) es una respuesta a un comentario.
  - Javier Bermudez en planetauruguay: teléfono cortado y sin año.
- **Instagram @armadordemuebles_**: sin ciudad en el perfil.
- **Catálogo sumerlabs "Armador de Muebles"**: $500 por "armado y desarmado" sin mueble ni contacto.
- **Mercado Libre y Facebook Marketplace**: unos 40 avisos de servicio. Casi todos dicen "Precio a convenir", y los importes visibles son base de ejemplo ($50, $100, $850 "EL PRECIO ES UNA BASE DE EJEMPLO"). No se cargó ningún aviso suelto. Queda la ficha de plataforma de Mercado Libre.
- **Mulata**: los importes de armado ($1.000 a $1.558) sólo aparecen en respuestas a preguntas de Mercado Libre, y su categoría "Servicios de armado" está vacía.
- **Tiendas sin servicio o sin tarifa**: Tienda Inglesa, Multiahorro (redirige a Tata), Geant, Mosca, Mare, Marvic, Narvaja, Kave Home y JYSK (no arma; manda la lista de armadores sólo por correo). Kuma no es una mueblería en Uruguay. Sodimac no publica precio para el armado de muebles de interior: sólo para instalación de estantes ($1.429 de lista) y armado de cama elástica ($2.999).
- **Reddit**: el único hilo pertinente (r/uruguay, marzo de 2026) no nombra ningún armador. Un comentario estima "el armado anda por los 1500": es una opinión, no un proveedor, y no se usó.
- **Plataformas sin armado en Uruguay**: Zolvers, Mi Changa, Hogarisimo, Kunan, Servicios Ya, HomeSolution, Habitissimo. Sin precios: ArreglaTodo publica sólo un rango típico ($1.610–$2.740) y la visita ($500, hasta $1.500). TaskRabbit no opera en Uruguay.

## Límites

- **Google Maps no se consultó directamente.** Los `googleName` vienen de guiacomercial.uy, que copia las fichas de Google con fecha 29 y 30 de julio de 2026. Sólo se completó `googleName` cuando se vio ese nombre. Para "EL ARMADOR", "SolucionesYa" y "Atope" hay un candidato probable (1122 El Armador, la lista de NYR, atope.uy), pero no la ficha de Google.
- **Instagram y Facebook se leen mal sin sesión.** Para el perfil de Alvaro y para la descripción de Jc Armados se usó el fragmento del buscador, y la nota de `sources` lo dice.
- **Las fichas de 1122 no publican cobertura ni fecha.** Puede haber teléfonos dados de baja.
- **Los precios que publican las tiendas por cuenta de un armador** (Divino, El Emporio, NYR) son de referencia: el armador puede cobrar otra cosa.
- **Las listas de ATOPE, Carpinteros del Uruguay, Divino, NYR y ALMANGO no tienen fecha.** Las de ArmadoresMontevideo y Furniture Home sólo tienen el año.
- **La lista no es exhaustiva.** Muchos armadores trabajan sólo por Marketplace, WhatsApp o boca a boca, sin ficha pública verificable.

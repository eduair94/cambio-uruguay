# Servicios para mudarse en Uruguay: directorio y comparación documentada

**Fecha de consulta: 14 de septiembre de 2026.** Este relevamiento reúne **80 fichas de prestadores y servicios, 381 tarifas y 94 URLs de evidencia** para complementar el hub de alquileres. Diecinueve fichas contienen precios publicados; las otras 61 requieren presupuesto. El [JSON completo asociado](../../../app/utils/movingServicesData.json) conserva contactos comerciales públicos, cobertura, vehículos, condiciones, fuentes y observaciones por ficha. Los conteos proceden de ese snapshot, no estiman el tamaño total del mercado.

La cantidad de tarifas necesita contexto: **132 corresponden a rutas de Sánchez**, con y sin peones, y **128 a variantes de encomiendas de DePunta**. Son dos prestadores, no 260 empresas ni 260 presupuestos independientes. Las fichas también incluyen servicios municipales gratuitos y armado asociado a compras. No se afirma exhaustividad, disponibilidad para una fecha concreta ni vigencia certificada de los importes.

**Publicado y verificado el 14/09/2026:** [directorio público](https://cambio-uruguay.com/fletes-mudanzas-uruguay), con filtros compartibles, orden por precio y referencias/reseñas. El commit `1e345c0` quedó desplegado a las 09:38 UTC ([ejecución de CI](https://github.com/eduair94/cambio-uruguay/actions/runs/34828153253)). Pasaron 7.519 pruebas de app, 2.661 del backend y seis E2E contra producción. Los 16 perfiles Google de 10 prestadores respondieron correctamente desde la API pública, con identidad verificada y respuestas sin caché. Es una comprobación fechada de conectividad y datos, no una garantía de calidad futura del servicio.

## Encontrar, ordenar y compartir una búsqueda

Los filtros combinan servicio, departamento, búsqueda de empresa/localidad/artículo, precio publicado, medidas de vehículo y base local. Las etiquetas de las tarifas participan en la búsqueda: «heladera» permite encontrar los envíos de DePunta; los tarifarios extensos incluyen un buscador dentro de la ficha. Elegir armado presenta tarifas de armado o presupuesto, sin reutilizar el precio de depósito de una empresa que ofrece ambos trabajos.

El enlace guarda `servicio`, `departamento`, `q`, `precios`, `camion`, `local` y `orden`. Los tres interruptores usan `1`; `local` requiere departamento. `orden=precio-asc` y `orden=precio-desc` activan el orden por importe; ausencia significa orden alfabético. Los valores predeterminados se omiten. Ejemplo de contrato:

```text
/fletes-mudanzas-uruguay?servicio=assembly&departamento=Canelones&q=ropero&precios=1&orden=precio-asc
```

Recarga y atrás/adelante restauran los filtros; limpiar elimina sólo sus parámetros. «Copiar búsqueda» incluye el texto pendiente y los filtros actuales, sin seguimiento ajeno al directorio. El [contrato técnico completo](../../app/MOVING_SERVICES.md#url-compartible-y-orden) documenta valores, normalización y sincronización.

El orden por precio utiliza la misma tarifa principal que destaca cada ficha. Separa grupos por **servicio, moneda y unidad**, excluye recargos como precio de entrada y deja al final los servicios sin tarifa pertinente. Dentro del grupo ordena el importe publicado; los rangos y precios «desde» conservan su condición. Paquetes de dos horas y bloques de media hora mantienen sus totales: no se convierten a hora, no se calculan impuestos ausentes y no se supone que incluyan el mismo personal. Las condiciones deben leerse incluso dentro de un mismo grupo.

## Qué cubre y dónde falta información

Las categorías se superponen: hay 49 fichas de flete, 43 de mudanza, 26 de armado/desarmado, 22 de almacenamiento, 21 de embalaje, nueve de instalaciones, cinco de limpieza y tres de retirada. Una misma empresa puede aparecer en varias. “Flete” puede ser transporte de un artículo o carga comercial; “mudanza” identifica una oferta de traslado del hogar, cuyo trabajo incluido depende del paquete.

El inventario identifica bases en **13 de los 19 departamentos**: Montevideo 35, Canelones seis, Maldonado cinco, Paysandú y Rivera tres cada uno, Colonia, Rocha y San José dos cada uno, y Cerro Largo, Durazno, Lavalleja, Salto y Soriano uno cada uno. Hay 17 fichas sin base publicada. Faltan bases identificadas en **Artigas, Flores, Florida, Río Negro, Tacuarembó y Treinta y Tres**. Es una brecha de esta investigación, no evidencia de ausencia de oferta local.

Diecisiete fichas declaran alcance nacional. Esa declaración no demuestra una sucursal, disponibilidad inmediata o tarifas locales en cada departamento. También existen rutas específicas: [Rivera Fletes](https://riverafletes.jimdofree.com/) ofrece conexiones y viajes compartidos; [Casuriaga](https://mudanzasyfletescasuriaga.uy/) enumera departamentos atendidos. Una dirección comercial y una localidad de anuncio se mantienen separadas de la cobertura. El inventario final permite revisar esa distinción para cada caso.

## Fletes y mudanzas: precios con condiciones comparables

Todos los importes de esta sección están en **pesos uruguayos (UYU)**. La comparación conserva horas, trabajadores e impuestos. Ordenar el importe de dos paquetes no hace equivalentes uno sin carga y otro con mudanza asistida.

| Prestador y modalidad                                             |         Importe publicado | Alcance que define el precio                                                                                                                      |
| ----------------------------------------------------------------- | ------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SOSE](https://sosetransporte.uy/), camión chico                  |      1.250 por hora + IVA | Mínimo dos horas; dos peones, embalaje y seguro de carga anunciados. Mediano 1.550 y grande 1.750 por hora.                                       |
| [Mudanzas en Montevideo](https://mudanzasenmontevideo.uy/), chico |      1.250 por hora + IVA | Mínimo dos horas; chofer y dos peones. Publica los mismos escalones, pero tiene otro contacto: ficha separada.                                    |
| [DT](https://www.dt.com.uy/packs-mudanzas.html), chico            |         3.120 por paquete | Dos horas, dos ayudantes y embalaje; hora adicional 1.560. No aclara IVA en el tarifario.                                                         |
| [FletesBox](https://fletesbox.com/servicios/), básica/intermedia  | 2.400 / 3.800 por paquete | Dos horas y 12 m³; básica sin carga/descarga, intermedia con dos ayudantes. Su mapa delimita las zonas.                                           |
| [Los Piñones](https://mudanzasmontevideo.uy/)                     |            1.750 por hora | Camión cerrado de cinco metros, chofer, dos ayudantes, film y mantas. Tarifario septiembre de 2026; declara que no cobra IVA y no publica mínimo. |

Los mínimos cambian el desembolso: dos horas de SOSE chico equivalen a **2.500 UYU antes de IVA**, cálculo del tarifario, no una cotización. Escaleras, recorrido, espera, estacionamiento y embalaje total pueden cambiar el presupuesto. Que un sitio mencione seguro no acredita por sí solo límites, exclusiones o cobertura del contenido.

[Sánchez](https://www.fletesymudanzas.uy/) publica miniflete de un mueble grande por **1.800 UYU**, con dos trabajadores, sólo Montevideo y excluyendo mudanzas. La mudanza local figura a **1.400 UYU por bloque de 30 minutos**, hasta 30 km del centro sin cruzar peajes; la página discrepa sobre la dotación de ese servicio. El camión sin peones cuesta **3.500 UYU por dos horas** en las zonas indicadas. No se transforman esos bloques en una tarifa horaria universal.

Para interior, [Sánchez](https://www.fletesymudanzas.uy/camion-grande-de-mudanzas/) publica 66 destinos y dos modalidades por destino: Montevideo–Maldonado **16.800 sin peones / 20.300 con peones**; Montevideo–Artigas **47.300 / 57.100**. Incluye peajes, viáticos y una hora total de carga/descarga con camión de 23 m³; después agrega camión y operarios por bloques de media hora. [DT](https://www.dt.com.uy/packs-mudanzas.html) ofrece Montevideo–Colonia y Montevideo–Maldonado a **13.290**, con camión de cuatro metros y dos ayudantes, sin detallar horas o peajes: no son paquetes equivalentes.

[DePunta](https://depunta.com/) sirve para artículos individuales. Su [tabla pública](https://depunta.com/data/tarifarioProductos1.json?v=61) contiene, en modalidad estándar, colchón de una plaza **870**, heladera chica **2.150** y lavarropas de carga horizontal **2.080 UYU por artículo**. Incluye IVA; agrega tasa postal del 10% cuando corresponda. El precio final se determina al despachar y Express depende de disponibilidad. No incluye por inferencia mudanza integral, armado o instalación.

## Tamaño del vehículo y capacidad útil

“Chico”, “mediano” y “grande” no son medidas comunes entre empresas. [Transportes Posadas](https://transportesposadas.com.uy/) aporta una descripción especialmente útil: Partner **3,7 m³/700 kg**, HD45 **17 m³/3.000 kg**, Volkswagen **25 m³/6.000 kg** y HD78 **23 m³/4.800 kg**. La caja abierta H100 publica 2,90 × 1,60 m y 1.600 kg. [Teske](https://teske.com.uy/) anuncia pequeñas cargas express de hasta **20 m³ y 4,5 toneladas**; debe confirmarse la unidad asignada.

[FletesBox](https://fletesbox.com/servicios/) publica 3,5, 9,5, 12 y 24 m³; sus 12 m³ aparecen asociados a 1.000 kg en flete y 1.500 kg en mudanza. [DT](https://www.dt.com.uy/packs-mudanzas.html) informa largos de 3,4, cinco y seis metros, sin ancho y altura suficientes para calcular volumen. No se rellenaron esos faltantes. Para accesos difíciles, [Dante](https://empresadante.com.uy/servicio-de-mudanzas/) anuncia elevador de hasta 30 metros y 300 kg por ascenso, sujeto a inspección.

El inventario de objetos, las dimensiones de los muebles mayores y los accesos de ambas viviendas son necesarios para elegir vehículo. El volumen anunciado no asegura que un sofá atraviese la puerta o el ascensor; la carga máxima tampoco describe cómo pueden apilarse objetos frágiles.

## Armado independiente, desarme y servicios de tienda

Hay tres referencias independientes con tarifarios detallados. [ArmadoresMontevideo](https://armadoresmontevideo.uy/precios/) publica escritorio/rack **650**, placard de dos puertas **700** y de seis puertas **1.300 UYU**, orientativos, con IVA. Excluye determinados barrios y puede aplicar recargos por horario: hay que confirmar modelo y dirección. [Furniture Home](https://forniturehome-st.com/) publica escritorios **700–1.500** y placares pequeños **1.300–1.900 UYU**, según modelo, cantidad y ubicación; el retiro de cartones no está incluido.

[Armado FAST Montevideo](https://armadofast.com/precios-armado-de-muebles-montevideo) anuncia escritorio desde **990** y ropero desde **1.490 UYU**, con visita incluida. En [Maldonado](https://armadofast.com/precios-armado-de-muebles-maldonado), el ropero parte de **2.200**. Su [desarmado](https://armadofast.com/servicios/desarmado-de-muebles) de ropero de dos a cuatro puertas cuesta **990–1.800 UYU** y el rearmado se cotiza aparte. Estas páginas están fechadas enero de 2026. No debe sumarse transporte por inferencia.

[Sánchez](https://www.fletesymudanzas.uy/501-2/) diferencia armado que requiere una persona, **1.500 UYU**, y dos personas, **2.600**. [DT](https://www.dt.com.uy/packs-mudanzas.html) cobra **1.200 UYU por armado** y **1.200 por desarmado MDF**, dentro de una mudanza contratada. Conviene presupuestar ambos extremos cuando el mueble ya está armado.

[UNSI](https://unsi.com.uy/pages/tarifas-de-envio-y-armados) cobra, por ejemplo, **680 UYU** por escritorio armado antes del envío: es un servicio de compra en tienda. [Naterial](https://www.naterial.com/uy/politica-de-envio) publica envío y armado de muebles a **USD 80** en Montevideo/Canelones y **USD 120** en Maldonado, en política de marzo de 2025. No acredita traslado de muebles propios; excluye escaleras y elevaciones.

Los armadores recomendados por [UNSI](https://unsi.com.uy/pages/tarifas-de-envio-y-armados), [Divino](https://www.divino.com.uy/armadoresexternos) y [NYR](https://www.nyr.com.uy/contacto-armador) se identifican como referencias comerciales secundarias. Sus contactos sirven para consultar, pero no heredan precios, garantías o cobertura del comercio que los recomienda.

## Guardamuebles y servicios para entregar o recibir la vivienda

En almacenamiento, [All Box](https://allboxuruguay.com/) publica mini box **1.650**, aproximadamente 2 m² **2.660**, 3 m² **3.240** y 6 m² **6.300 UYU al mes**, con IVA. [SelfBox](https://selfbox.uy/alquiler-de-guardamuebles-en-montevideo/) parte de **1.900** para 1–2 m², **4.800** para 3–5 m² y **7.000** para más de 6 m². Son superficies y condiciones distintas: el menor importe no identifica la solución más económica para una vivienda completa.

[ONE Storage](https://www.onestorage.uy/) publica 4 m² a **5.000**, 8 m² a **7.000** y 30 m² a **15.000 UYU mensuales**. Sus volúmenes y medidas no concuerdan, por lo que no se calcula capacidad a partir de ellos. [Dante](https://empresadante.com.uy/deposito/) parte de **3.800 mensuales**, mínimo un mes, IVA incluido y traslado aparte. [Sánchez](https://www.fletesymudanzas.uy/633-2/) cobra **750 UYU por m² y mes**. Acceso, disponibilidad y seguros requieren confirmar condiciones; seguro general del edificio no equivale a asegurar individualmente cada mueble.

Para entregar una vivienda, [FletesBox](https://fletesbox.com/servicios/) publica limpieza posmudanza de hasta tres horas a **1.900 UYU**, con productos, y embalaje de hasta una hora a **1.150**, con hasta diez cajas. [Grupo Meta Integral](https://grupometaintegral.uy/servicios/limpieza-de-mudanza-en-montevideo/) y [WP Servicios](https://wpservicios.site/) ofrecen limpieza de mudanza a presupuesto. [CleanFach](https://www.empresadelimpiezamontevideo.com/) también la anuncia: se excluyó su plan mensual porque no cotiza ese trabajo puntual. [Servicios JR](https://serviciosjr.uy/) aporta limpieza y personal de carga; no se presume camión incluido.

El retiro responsable puede evitar transportar objetos descartados. [Montevideo](https://montevideo.gub.uy/servicio-de-recoleccion-de-residuos-grandes) ofrece retiro gratuito agendado de hasta cinco muebles/electrodomésticos; no incluye bajarlos desde pisos. [Canelones](https://www.gub.uy/tramites/solicitud-recoleccion-residuos-especiales-canelones) admite hasta 4 m³ por solicitud sin costo. Debe respetarse la coordinación antes de sacar residuos. [Emaús Grupo Aportes](http://emausgrupoaportes.com/Donaciones.aspx) recibe donaciones recuperables, no basura; aceptación y retiro se coordinan y no se presume gratuidad.

Para reconectar equipos, [Porto](https://tienda.portoservicios.com.uy/catalogo/instalacion-de-lavarropa_SERVLAV001_SERVLAV001) publica instalación de lavarropas a **1.980 UYU**. El [recambio de calefón](https://tienda.portoservicios.com.uy/catalogo/desinstalacion-instalacion-de-calefon-hasta-60_SERVDICAL001_SERVDICAL001) hasta 60 litros cuesta **3.280**, pero describe sustitución en el mismo lugar, no retiro y montaje entre dos viviendas. Deben confirmarse redes existentes, materiales y aceptación de equipos comprados fuera de la tienda.

## Reseñas y referencias externas

El [relevamiento de perfiles](review-sources.json) revisó las fuentes públicas de los 80 prestadores mediante 123 lecturas. La [proyección asociada](../../../app/utils/movingReviewSourcesData.json) contiene **48 referencias de 38 prestadores**: 16 Google Maps, 12 Facebook, 19 fichas 1122 y una HomeSolution. Estos conteos son independientes de las 94 URLs del catálogo de servicios; no se suman como si fueran fuentes distintas. Diez asociaciones ambiguas y tres rechazadas quedaron fuera de la proyección.

La comprobación acredita que el perfil pertenece a la empresa o sucursal indicada. No acredita calidad, habilitación, seguro ni disponibilidad de opiniones. Se excluyeron coincidencias sostenidas sólo por nombre, perfiles de autores y redes del directorio o tienda que recomendó a un armador. La puntuación de una sucursal puede abarcar ventas y trabajos distintos de una mudanza; los servicios de una misma marca no heredan automáticamente una valoración común. No encontrar un vínculo tampoco demuestra falta de reputación.

Hay **16 perfiles Google con Place ID para diez prestadores**, preparados para consulta bajo demanda cuando el entorno esté configurado. Al abrir «Reseñas y referencias externas» se consultan hasta tres perfiles de ese prestador y los restantes mediante su botón. El resultado muestra puntuación, recuento, enlace, atribución y hora de consulta; no fecha de la última opinión. Cerrar el bloque descarta esos valores y cancela las lecturas pendientes. Facebook, 1122 y HomeSolution permanecen como referencias externas, sin puntuación importada.

El JSON editorial no almacena estrellas, recuentos, textos, autores, fotos ni respuestas de Google. Tampoco existe un ranking por reputación. La lectura efímera distingue perfil sin opiniones, identidad contradictoria, falta de configuración, error y límite de consultas. No se solicita Google para todos los prestadores al abrir la página y no se muestran puntuaciones antiguas como respaldo de un fallo.

La [política oficial de Places API](https://developers.google.com/maps/documentation/places/web-service/policies) establece restricciones de almacenamiento y requisitos de atribución. La [guía oficial de Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id) distingue los identificadores que pueden conservarse y recomienda revisar los de más de doce meses. Los perfiles identificados no garantizan por sí solos conexión activa o una respuesta utilizable.

## Método, límites y actualización

Se priorizaron páginas propias y trámites oficiales; para ampliar el interior se conservaron fichas comerciales completas, identificadas como fuentes secundarias. Cada precio mantiene moneda, unidad, mínimo, inclusiones y exclusiones disponibles. Se omitieron datos desconocidos y se registraron contradicciones. La fecha de consulta no se reutiliza como fecha de publicación.

La deduplicación exige evidencia comercial: SOSE y Fletes Montevideo comparten contacto; la publicación de Sánchez en Colonia comparte teléfono con su web y se integra en una ficha. Nombre parecido, misma localidad o precio coincidente no prueban identidad. Los contactos proceden de páginas comerciales públicas; no se enviaron mensajes ni se accedió a contactos ocultos.

La [revisión de marketplaces](marketplace-notes.md) examinó 169 tarjetas: 50 de fletes y 50 de armado en Mercado Libre, más 36 y 33 en Facebook. Nueve originales seleccionados no aportaron cuerpo suficiente: cinco devolvieron 403 y cuatro Facebook sólo título. La búsqueda de armado mezclaba productos y herramientas; fletes cubría 50 de 69 resultados declarados. Se incorporaron **cero fichas nuevas** desde esas tarjetas y ningún importe sin unidad. Las restricciones de lectura no demuestran inactividad del anunciante.

Una actualización debe releer las mismas fuentes, comparar precios y condiciones, conservar el historial de cambios y revisar contactos y cobertura. No basta renovar la fecha de consulta. Prioridades: las seis bases departamentales faltantes, armadores del interior, limpieza con alcance definido, capacidad de camiones e impuestos. El documento y JSON son una captura documentada; no prometen actualización automática.

La proyección editorial es manual: `node app/scripts/build-moving-directory.mjs` consolida servicios y `node app/scripts/build-moving-review-sources.mjs` proyecta sólo vínculos verificados. Ambos aceptan `--check` para comprobar sin escribir. Nuxt consume los JSON dentro de `app/`; su build no depende de `docs/`. Los perfiles de reseñas se actualizan revisando `review-sources.json`, sin añadir datos de opiniones.

La consulta de Google depende de `MOVING_REVIEWS_GMAPS_URL`, con fallback al proxy de `CASAS_REVIEWS_GMAPS_URL`, y del interruptor `MOVING_REVIEWS_ENABLED`. Las respuestas no se guardan en MongoDB ni snapshots; la API envía `no-store`. El [documento de implementación](../../app/MOVING_SERVICES.md#referencias-externas-y-puntuaciones-bajo-demanda) detalla identidad, atribución, límites y configuración privada. Su [sección de verificación](../../app/MOVING_SERVICES.md#verificación) incluye los comandos unitarios y E2E actualizados; las pruebas de reseñas usan respuestas sintéticas y no prueban la conectividad real de un entorno.

## Inventario completo

Las 80 filas siguientes se generan del snapshot asociado. **Tarifas** cuenta variantes publicadas, incluidos complementos y servicios gratuitos; **0 significa sin tarifa utilizable**, no servicio gratis. **—** significa base o cobertura no publicada. “Nacional declarado” reproduce una afirmación del prestador o su ficha comercial, sin certificar operación en cada localidad. Las fuentes numeradas pertenecen a cada fila; “referencia comercial” identifica directorios o recomendaciones de comercios. El JSON conserva el detalle de cada fuente y las coberturas extensas.
| # | Prestador o servicio | Base | Cobertura publicada | Categorías | Tarifas | Fuentes |
| ---: | --- | --- | --- | --- | ---: | --- |
| 1 | AB Moving & Relocation | Montevideo | Montevideo | Mudanza, Guardamuebles | 0 | [1 · fuente](https://www.ab.com.uy/contacto/) |
| 2 | All Box Uruguay | Montevideo | Montevideo | Guardamuebles | 4 | [1 · fuente](https://allboxuruguay.com/) [2](https://allboxuruguay.com/contacto/) |
| 3 | All Storage Uruguay | Montevideo | Montevideo | Guardamuebles | 0 | [1 · fuente](https://allstorage.com.uy/servicios-de-almacenamiento/) |
| 4 | ALMANGO | — | Montevideo; Maldonado; Canelones; San José | Armado | 0 | [1 · referencia comercial](https://www.nyr.com.uy/contacto-armador) [2](https://www.divino.com.uy/armadoresexternos) |
| 5 | Armado FAST | Montevideo | Montevideo; Maldonado | Armado, Embalaje, Instalaciones | 13 | [1 · fuente](https://armadofast.com/precios-armado-de-muebles-montevideo) [2](https://armadofast.com/precios-armado-de-muebles-maldonado) [3](https://armadofast.com/servicios/desarmado-de-muebles) |
| 6 | ArmadoresMontevideo | Montevideo | Montevideo (con exclusiones por barrio); Ciudad de la Costa | Armado, Instalaciones | 10 | [1 · fuente](https://armadoresmontevideo.uy/) [2](https://armadoresmontevideo.uy/precios/) |
| 7 | Autogiro | Montevideo | Montevideo | Mudanza, Embalaje, Guardamuebles | 0 | [1 · fuente](https://www.autogiro.com.uy/) |
| 8 | BoxIt | Montevideo | Montevideo | Guardamuebles | 0 | [1 · fuente](https://boxit.com.uy/) |
| 9 | Brian Morales | — | Costa de Oro | Armado | 0 | [1 · referencia comercial](https://unsi.com.uy/pages/tarifas-de-envio-y-armados) |
| 10 | CleanFach | Montevideo | Montevideo; Canelones; Maldonado | Limpieza | 0 | [1 · fuente](https://www.empresadelimpiezamontevideo.com/) |
| 11 | Deleste Fletes | Maldonado | Maldonado; Punta del Este; La Barra; José Ignacio; San Carlos; Piriápolis; Punta Ballena; Manantiales; Pinares; Solanas; Punta Colorada; Montevideo; Rocha | Mudanza, Flete, Embalaje | 0 | [1 · fuente](https://delestefletes.com/) |
| 12 | Delgado Fletes | Lavalleja | — | Mudanza, Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/delgado-fletes/LOC515570001) |
| 13 | DePunta Soluciones Logísticas | — | Montevideo; Maldonado; San Carlos; Piriápolis; Atlántida; José Ignacio | Flete | 128 | [1 · fuente](https://depunta.com/) [2](https://depunta.com/data/tarifarioProductos1.json?v=61) |
| 14 | Diego Batista Transportes Fletes y Mudanzas | Maldonado | Playa Grande; Maldonado; Montevideo; Uruguay; nacional declarado | Mudanza, Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/diego-batista-transportes-fletes-y-mudanzas/LOC826260001) |
| 15 | Diego Vidal | — | Montevideo | Armado | 0 | [1 · referencia comercial](https://unsi.com.uy/pages/tarifas-de-envio-y-armados) |
| 16 | DT Transportes / Distribución Total | Montevideo | Montevideo; Colonia; Maldonado; Rocha; San José; Interior de Uruguay | Mudanza, Flete, Armado, Embalaje, Guardamuebles, Instalaciones | 29 | [1 · fuente](https://www.dt.com.uy/packs-mudanzas.html) |
| 17 | Emaús Grupo Aportes | Montevideo | Montevideo | Retirada | 0 | [1 · fuente](http://emausgrupoaportes.com/Donaciones.aspx) |
| 18 | Emiliano García | — | Maldonado | Armado | 0 | [1 · referencia comercial](https://www.divino.com.uy/armadoresexternos) |
| 19 | Empresa Dante | Montevideo | Montevideo | Mudanza, Embalaje, Armado, Guardamuebles | 1 | [1 · fuente](https://empresadante.com.uy/) [2](https://empresadante.com.uy/deposito/) [3](https://empresadante.com.uy/servicio-de-mudanzas/) |
| 20 | Expreso 2000 Transportes y Servicios | San José | San José de Mayo; Montevideo | Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/expreso-2000-transportes-y-servicios/LOC545120001) |
| 21 | Expreso Este | Maldonado | Maldonado; Montevideo | Mudanza, Flete, Embalaje, Armado, Instalaciones, Guardamuebles | 0 | [1 · fuente](https://www.expresoeste.com.uy/) |
| 22 | Fletes Atlántida | Canelones | Canelones; Las Toscas; Interior de Uruguay; nacional declarado | Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/fletes-atlantida/LOC701680001) |
| 23 | Fletes Costa de Oro | Canelones | Canelones; Atlántida | Flete, Mudanza | 0 | [1 · referencia comercial](https://1122.com.uy/local/fletes-costa-de-oro/LOC553940001) |
| 24 | Fletes Laura | Canelones | Canelones; Pinamar | Flete, Mudanza | 0 | [1 · referencia comercial](https://1122.com.uy/local/fletes-laura/LOC884210001) |
| 25 | Fletes Moraes | Salto | — | Mudanza, Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/fletes-moraes/LOC501970001) |
| 26 | Fletes Oriental | Montevideo | Montevideo; Interior de Uruguay; nacional declarado | Mudanza, Flete, Embalaje, Armado, Guardamuebles | 0 | [1 · fuente](http://www.fletesoriental.com/) |
| 27 | Fletes Quintero | San José | — | Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/fletes-quintero/LOC447420001) |
| 28 | Fletes Sosa | Canelones | Las Piedras; Canelones | Mudanza, Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/fletes-sosa/LOC757830001) |
| 29 | Fletes Uruguay | Montevideo | Montevideo | Mudanza, Flete, Embalaje, Guardamuebles | 0 | [1 · fuente](https://mejoresfletesuruguay.com/) |
| 30 | Fletes Vaz | Soriano | — | Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/fletes-vaz/LOC761940001) |
| 31 | Fletes Walter | Rivera | — | Mudanza, Flete | 0 | [1 · referencia comercial](https://laguiauruguay.com.uy/empresas/fletes-walter-en-rivera/) |
| 32 | Fletes y Mudanzas Juan Topayan | Paysandú | — | Mudanza, Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/fletes-y-mudanzas-juan-topayan/LOC584330001) |
| 33 | Fletes y Mudanzas Los Piñones | Montevideo | Montevideo; Canelones; Maldonado; Colonia; Interior de Uruguay; nacional declarado | Mudanza, Flete, Embalaje, Instalaciones | 1 | [1 · fuente](https://mudanzasmontevideo.uy/) |
| 34 | Fletes y Mudanzas Lugo | Montevideo | Montevideo; Interior de Uruguay; nacional declarado | Mudanza, Flete, Embalaje, Guardamuebles | 0 | [1 · fuente](https://www.mudanzaslugo.com.uy/) |
| 35 | Fletes y Mudanzas Paysandú | Paysandú | — | Mudanza, Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/fletes-y-mudanzas-paysandu/LOC883850001) |
| 36 | FletesBox | Montevideo | Montevideo | Mudanza, Flete, Embalaje, Limpieza | 10 | [1 · fuente](https://fletesbox.com/servicios/) |
| 37 | Flety | Montevideo | Montevideo | Mudanza, Flete | 0 | [1 · fuente](https://www.flety.uy/) |
| 38 | Furniture Home | Montevideo | Montevideo; Canelones; Maldonado; nacional declarado | Armado, Instalaciones | 10 | [1 · fuente](https://forniturehome-st.com/) |
| 39 | Gonzalo Dematté | — | Montevideo | Armado | 0 | [1 · referencia comercial](https://unsi.com.uy/pages/tarifas-de-envio-y-armados) |
| 40 | Grupo Meta Integral | Montevideo | Montevideo; Área metropolitana | Limpieza | 0 | [1 · fuente](https://grupometaintegral.uy/servicios/limpieza-de-mudanza-en-montevideo/) |
| 41 | Grupo Pellejero's | Maldonado | Maldonado; Punta del Este; Montevideo; Uruguay; nacional declarado | Mudanza, Flete | 0 | [1 · fuente](https://www.grupopellejeros.com/) |
| 42 | Intendencia de Canelones — residuos especiales | Canelones | Canelones | Retirada | 1 | [1 · fuente](https://www.gub.uy/tramites/solicitud-recoleccion-residuos-especiales-canelones) |
| 43 | Intendencia de Montevideo — residuos grandes | Montevideo | Montevideo | Retirada | 1 | [1 · fuente](https://montevideo.gub.uy/servicio-de-recoleccion-de-residuos-grandes) [2](https://montevideo.gub.uy/montevideo-integra) |
| 44 | LuiFeR | — | — | Flete | 0 | [1 · fuente](https://luifer.com.uy/servicios) |
| 45 | Maeso Transportes | Montevideo | Montevideo; Interior de Uruguay | Mudanza, Flete | 0 | [1 · fuente](https://maesotransportes.com.uy/) |
| 46 | Marcos Cabral | — | Maldonado; Rocha | Armado | 0 | [1 · referencia comercial](https://www.divino.com.uy/armadoresexternos) |
| 47 | Marcos Pérez Fletes | Durazno | — | Mudanza, Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/marcos-perez/LOC515080001) |
| 48 | Matías Rodriguez | — | Salto | Armado | 0 | [1 · referencia comercial](https://www.divino.com.uy/armadoresexternos) |
| 49 | Michael Goro | — | Costa de Oro; Las Piedras; La Paz; Alrededores | Armado | 0 | [1 · referencia comercial](https://unsi.com.uy/pages/tarifas-de-envio-y-armados) |
| 50 | Mudanzas en Montevideo | Montevideo | Montevideo; Canelones; Ciudad de la Costa; Costa de Oro; Interior de Uruguay; nacional declarado | Mudanza, Flete, Armado, Embalaje | 3 | [1 · fuente](https://mudanzasenmontevideo.uy/) |
| 51 | Mudanzas Gustavo | Montevideo | Montevideo; Interior de Uruguay; nacional declarado | Mudanza, Flete, Embalaje | 0 | [1 · fuente](https://mudanzasgustavo.com/) |
| 52 | Mudanzas y Fletes Casuriaga | Montevideo | Montevideo; Canelones; San José; Maldonado; Rocha; Colonia; Flores; Soriano; Rivera; Tacuarembó; Artigas; Durazno; Las Piedras; nacional declarado | Mudanza, Flete, Embalaje, Armado | 0 | [1 · fuente](https://mudanzasyfletescasuriaga.uy/) [2](https://mudanzasyfletescasuriaga.uy/mudanzas-en-las-piedras/) |
| 53 | Naterial — envío y armado de compra | — | Montevideo; Canelones; Maldonado | Armado, Flete | 4 | [1 · fuente](https://www.naterial.com/uy/politica-de-envio) |
| 54 | ONE Storage | Montevideo | Montevideo; Maldonado | Guardamuebles | 6 | [1 · fuente](https://www.onestorage.uy/) |
| 55 | Pedro Burdín | — | Salto | Armado | 0 | [1 · referencia comercial](https://www.divino.com.uy/armadoresexternos) |
| 56 | Perez Company | Canelones | Montevideo; Canelones; Ciudad de la Costa; Paso Carrasco; Pando; Salinas; Atlántida; Interior de Uruguay; nacional declarado | Mudanza, Flete | 0 | [1 · fuente](https://perezcompany.com.uy/) |
| 57 | POA Fletes | Montevideo | Montevideo; Maldonado; Punta del Este; Interior de Uruguay | Mudanza, Flete | 0 | [1 · perfil público](https://homesolution.net/uy/fletero/poa-fletes-1735) |
| 58 | PuntaHogar | Maldonado | Maldonado | Guardamuebles, Flete | 0 | [1 · fuente](https://puntahogar.com/servicios/almacenamiento) |
| 59 | RG Mudanzas y Fletes | Rocha | — | Mudanza, Flete, Embalaje | 0 | [1 · referencia comercial](https://1122.com.uy/local/rg-mudanzas-y-fletes/LOC790300001) |
| 60 | Rivera Fletes | Rivera | Rivera; Montevideo; Maldonado; Atlántida; Costa de Oro | Mudanza, Flete | 0 | [1 · fuente](https://riverafletes.jimdofree.com/) [2](https://riverafletes.jimdofree.com/peque%C3%B1as-cargas/) [3](https://riverafletes.jimdofree.com/viajes-compartidos/) |
| 61 | Schubert Pereyra | — | Costa de Oro | Armado | 0 | [1 · referencia comercial](https://unsi.com.uy/pages/tarifas-de-envio-y-armados) |
| 62 | SelfBox | Montevideo | Montevideo | Guardamuebles, Flete | 3 | [1 · fuente](https://selfbox.uy/alquiler-de-guardamuebles-en-montevideo/) |
| 63 | Servicios JR | — | Montevideo; Canelones; Maldonado; Colonia; San José | Limpieza, Mudanza | 0 | [1 · fuente](https://serviciosjr.uy/) |
| 64 | Simple Box | Montevideo | Montevideo | Guardamuebles, Flete, Embalaje | 0 | [1 · fuente](https://simplebox.uy/particulares) |
| 65 | SOSE Transporte / Fletes Montevideo | Montevideo | Montevideo; Canelones; Maldonado; Interior de Uruguay; nacional declarado | Mudanza, Flete, Armado, Embalaje, Guardamuebles | 3 | [1 · fuente](https://sosetransporte.uy/) [2](https://fletesmontevideo.uy/mudanzas-en-montevideo/) |
| 66 | Teske Transportes | Paysandú | Uruguay; Argentina; Brasil; Chile; nacional declarado | Flete, Guardamuebles | 0 | [1 · fuente](https://teske.com.uy/) |
| 67 | Tienda Porto — instalaciones | — | Montevideo; Ciudad de la Costa | Instalaciones | 4 | [1 · fuente](https://tienda.portoservicios.com.uy/condiciones-instalaciones) [2](https://tienda.portoservicios.com.uy/catalogo/instalacion-de-lavarropa_SERVLAV001_SERVLAV001) [3](https://tienda.portoservicios.com.uy/catalogo/instalacion-de-calefon-60l-horizontal_SERVCAL003_SERVCAL003) [4](https://tienda.portoservicios.com.uy/catalogo/desinstalacion-instalacion-de-calefon-hasta-60_SERVDICAL001_SERVDICAL001) [5](https://tienda.portoservicios.com.uy/catalogo/desinstalacion-instalacion-de-tv-hasta-85_SERVDITEL002_SERVDITEL002) |
| 68 | TM Transportes | Colonia | — | Mudanza, Flete, Armado | 0 | [1 · referencia comercial](https://1122.com.uy/local/tm-transportes/LOC791840002) |
| 69 | Transporte D y D | Cerro Largo | Melo; Ruta 7 | Mudanza, Flete | 0 | [1 · referencia comercial](https://laguiauruguay.com.uy/empresas/transporte-d-y-d-en-melo/) |
| 70 | Transporte Tabajara | Rocha | La Coronilla; Uruguay; nacional declarado | Mudanza, Flete, Guardamuebles | 0 | [1 · referencia comercial](https://1122.com.uy/local/transporte-tabajara/LOC889370001) |
| 71 | Transportes Andrés Banacore (TABANACORE) | Montevideo | Montevideo | Mudanza, Embalaje, Armado, Guardamuebles, Instalaciones | 0 | [1 · fuente](https://tabanacore.com/servicios.php) |
| 72 | Transportes El Águila | Rivera | — | Mudanza, Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/transportes-el-aguila/LOC592920001) |
| 73 | Transportes El Calabrés | — | Tacuarembó; Montevideo; Uruguay; nacional declarado | Flete, Guardamuebles | 0 | [1 · fuente](https://transporteselcalabres.com/servicios/) |
| 74 | Transportes Posadas | Montevideo | Montevideo; Interior de Uruguay; nacional declarado | Mudanza, Flete, Armado, Embalaje | 0 | [1 · fuente](https://transportesposadas.com.uy/) |
| 75 | Transportes Sánchez | Montevideo | Montevideo, Ciudad de la Costa, Pando, Las Piedras; 66 destinos interdepartamentales en tarifario | Mudanza, Flete, Armado, Embalaje, Guardamuebles, Instalaciones | 142 | [1 · fuente](https://www.fletesymudanzas.uy/) [2](https://www.fletesymudanzas.uy/camion-grande-de-mudanzas/) [3](https://www.fletesymudanzas.uy/501-2/) [4](https://www.fletesymudanzas.uy/633-2/) [5](https://1122.com.uy/local/transportes-sanchez/LOC589240001) |
| 76 | UNSI — armado de compra en tienda | — | — | Armado | 8 | [1 · fuente](https://unsi.com.uy/pages/tarifas-de-envio-y-armados) |
| 77 | Uruvan | Montevideo | Montevideo | Mudanza, Embalaje, Guardamuebles | 0 | [1 · fuente](https://www.uruvan.com.uy/es/) [2](https://www.uruvan.com.uy/es/services/mudanza-hogar/) |
| 78 | VAMOS UY | Montevideo | Montevideo; Interior de Uruguay; nacional declarado | Mudanza, Flete | 0 | [1 · fuente](https://vamosfletesymudanzas.uy/) |
| 79 | Walymar Fletes Mudanzas | Colonia | — | Mudanza, Flete | 0 | [1 · referencia comercial](https://1122.com.uy/local/walymar-fletes-mudanzas/LOC523230001) |
| 80 | WP Servicios | Montevideo | Montevideo | Limpieza | 0 | [1 · fuente](https://wpservicios.site/) [2](https://wpservicios.site/home/contact/) |

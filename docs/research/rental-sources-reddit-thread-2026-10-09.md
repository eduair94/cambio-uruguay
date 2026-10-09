# Las páginas del hilo «Páginas para buscar alquileres» — 9 de octubre de 2026

El pedido: revisar que `/alquileres-uruguay` indexe todas las páginas que recomienda el hilo de
r/uruguay [«Páginas para buscar alquileres»](https://www.reddit.com/r/uruguay/comments/qoou5v/paginas_para_buscar_alquileres/)
(7/11/2021) y agregar las que falten, considerando todo lo posible.

## Qué nombra el hilo

- **Portales:** InfoCasas, Facebook Marketplace, Dueño Directo, Mercado Libre, Gallito («hay más
  variedad pero también peores lugares… la mayoría ya estaba alquilado desde hace tiempo») y
  alquileres.uy.
- **Webs de inmobiliarias:** Braglia, Lars, Campiglia, Remax, Baldovino, ACSA y Kosak.
- **Otros:** la Agencia Nacional de Vivienda (por el alquiler con opción a compra), un grupo de
  Facebook y los sitios de las garantías.

## Método

- Cada sitio se leyó con la UA propia (`CambioUruguayBot/1.0`), una petición por vez, con 1,5 s o
  más entre peticiones al mismo host (3 s en GoPunta), respetando `robots.txt`, sin sortear ningún
  403, 429 ni desafío y sin copiar teléfonos ni correos.
- El cruce es contra el índice publicado: `GET /api/rentals?q=` (título, dirección y barrio) con una
  banda de precio. Una coincidencia exige misma moneda, precio a ±5 % y atributos compatibles, y las
  que se dieron por buenas se revisaron a mano (foto, título, unidad). En ACSA el cruce es exacto: el
  nombre de archivo de sus fotos en InfoCasas lleva su propio número de aviso.
- Son cifras de lectura del 9/10/2026, no un incremento neto publicado.

## Resultado

| sitio | antes | medido el 9/10/2026 | decisión |
|---|---|---|---|
| InfoCasas | fuente | — | ya indexado |
| Facebook Marketplace | fuente | — | ya indexado |
| Mercado Libre | fuente | — | ya indexado |
| Gallito | `gallito.com.uy/inmuebles` da 403 de Cloudflare a la UA propia | su catálogo de inmuebles es el de Inmuebles El País: los avisos de El País traen su `url` en gallito.com.uy y sus fotos en imagenes.gallito.com.uy | ya indexado, vía El País |
| **alquileres.uy** | no se leía | 191 avisos de alquiler anual; 149 viviendas, 131 sin reservar; de 40 sorteadas, 14 ya estaban | **se agrega** (fuente `alquileresuy`) |
| Dueño Directo | no se leía | 115 avisos en «Alquiler», 65 de vivienda anual; ninguno confirmado en el índice, pero el más nuevo es de ~agosto de 2024 (ids cronológicos y fechas en los nombres de las fotos), no hay fechas en ninguna página y los avisos no vencen | no se agrega: es un archivo congelado |
| Remax | no se leía | API pública con 3.565 avisos, 561 alquileres activos; de 30 sorteados, 29 ya estaban (casi siempre por InfoCasas, ML **y** El País) | no se agrega |
| ACSA | no se leía | 210 avisos, 120 viviendas; 117 ya estaban (las 3 restantes se publicaron ese mismo día) | no se agrega |
| Braglia | no se leía | 33 viviendas; 32 ya estaban; la otra pide US$ 70.000 por mes | no se agrega |
| Kosak | no se leía | 134 viviendas; 123 confirmadas y 5 probables; 6 sin encontrar | no se agrega |
| Lars | no se leía | 25 viviendas disponibles; 19 ya estaban; las 6 restantes son unidades de un mismo edificio nuevo | no se agrega |
| Campiglia | no se leía | 9 viviendas (vende sobre todo proyectos); 8 ya estaban | no se agrega |
| Baldovino | — | `baldovino.com` es un dominio estacionado en venta; no apareció otro | sin sitio |
| ANV | — | no publica avisos: el alquiler con opción a compra se ofrece por llamados del MVOT | no aplica |
| Grupos de Facebook | — | exigen sesión y membresía | no aplica (Marketplace y Reels sí se leen) |
| Sitios de garantías | — | no son avisos | ya están en `/alquilar-en-uruguay` y en el filtro de garantías |

### Por qué no las webs de las inmobiliarias

1. **Su inventario ya está.** Cada inmobiliaria publica sus propios avisos en los portales que se
   leen: entre el 76 % (Lars) y el 97 % (Remax, ACSA, Braglia) de lo que muestran en su web.
2. **Ninguna publica número de puerta con unidad**, que es la condición para unir dos avisos
   (dirección exacta más el mismo identificador de unidad; ver `docs/app/RENTALS.md`, «Cómo se
   unifica»). Lars y Braglia dan una esquina, Kosak ni eso. Leer su web agregaría una tarjeta
   duplicada por cada vivienda que ya se muestra para ganar entre cero y una decena.

### Por qué no Dueño Directo

El sitio de inmuebles dejó de recibir avisos: el más nuevo de toda la sección (una venta, id 2426)
es de ~julio de 2024 y el alquiler más nuevo (id 2422), de ~agosto de 2024. Ninguna página tiene
fecha y nada vence, así que importarlo pondría precios de 2018–2024 fechados con nuestra primera
lectura: subirían a «más recientes» y a «más baratos», la misma falla que una pizarra congelada en
el directorio de cambio. Si vuelve a recibir avisos, el lector de autos
(`classes/autos/sources/duenodirecto.ts`) ya sabe leer su maqueta.

## alquileres.uy: lo que se agrega

- **Una base, dos sitios.** alquileres.uy y www.buscandocasa.com corren el mismo buscador en ASP
  clásico y contestan con las mismas referencias. alquileres.uy sólo suma el campo oculto
  `idinmo=G10`, que amplía el conjunto de inmobiliarias (BuscandoCasa sola mostraba 54 de los 62
  apartamentos). Se lee sólo alquileres.uy.
- **Dónde está lo que falta.** De las 131 viviendas sin reservar, la mayoría está en la costa de
  Canelones (Ciudad de la Costa, Costa de Oro) y en Piriápolis, donde los portales grandes son
  finos. 26 de las 40 sorteadas no estaban en el índice.
- **Nada vence.** No hay campo de estado, y la fecha de la tarjeta es la de la ÚLTIMA ACTUALIZACIÓN
  (la más vieja, de 2016). De las sorteadas que nadie tocaba hacía más de 180 días, 1 de 14 estaba
  en otro lado; de las actualizadas en los últimos 90 días, 12 de 23. Un aviso sin actualizar en
  180 días se trata como retirado — exactamente la queja del hilo sobre Gallito.
- **La lectura en vivo** (9/10/2026, 66 s con 15 fichas): 7 búsquedas, 191 avisos, 99 publicables
  (73 sin actualizar hace más de 180 días, 19 reservados): Canelones 54, Montevideo 34, Maldonado
  11; 30 con pin, 5 con número de puerta. Diseño y reglas: `docs/app/RENTALS.md`, «alquileres.uy».

## Fuera del hilo: GoPunta

[GoPunta](https://www.gopunta.uy/alquileres/), el portal de las inmobiliarias de la Cámara
Inmobiliaria de Punta del Este–Maldonado, tiene 3.110 avisos de alquiler «anual», unas 2.300
viviendas plausibles. De 110 cruzados, 66 ya estaban, 23 tienen un parecido sin confirmar y 21 no
aparecieron: entre 450 y 600 viviendas nuevas, sobre todo casas en La Barra, Punta Ballena y los
bordes de Punta del Este. **No se integró en este cambio** por tres motivos medidos:

1. **Limita la búsqueda automatizada a propósito.** La tercera página de listado en ~30 s devolvió
   429 «Search traffic temporarily limited» (`Retry-After: 60`, `Vary: User-Agent`), seguía en 429 a
   los 141 s y recién respondió tras 14 minutos. Las fichas sueltas, a 8–10 s, nunca se limitaron.
   Un barrido de sus 63 páginas respetando ese límite lleva horas.
2. **El rótulo anual/temporal no es confiable:** ~16 % de las tarjetas «anuales» son de temporada,
   comerciales o con precios imposibles, y un mismo aviso figura en las dos secciones.
3. **No tiene términos ni `robots.txt`**, y el portal es exclusivo de los socios de la Cámara.

El camino honesto es el de El País: pedirle permiso (o un feed) a la Cámara. Si se integra sin eso,
tiene que ser un job propio y lento —una página de listado cada pocos minutos con cursor— y nunca
dentro de la corrida diaria.

## Hallazgos laterales (para otro cambio)

1. **Avisos de temporada colados como mensuales.** De las 86 filas de Braglia en Maldonado que tiene
   el índice, 80 coinciden en precio exacto y dormitorios con la lista de *alquiler temporal* de la
   propia Braglia (US$ 1.500 a 21.500). Y 6 avisos por noche de Kosak (US$ 250 a 800) figuran como
   alquiler mensual. Vienen por los portales ya integrados, no por una fuente nueva.
2. **La web propia como prueba de disponibilidad.** 34 de las 233 tarjetas de ACSA del índice ya no
   están en su web (16 sin verse hace 8 días o más); 11 de las 37 de Lars tampoco; y las 5 unidades
   que Lars marca «Reservada» siguen vivas en el índice.
3. **Una pista de identidad explícita.** ACSA publica dirección con unidad, y su número de aviso
   viaja en el nombre de archivo de las fotos que sube a InfoCasas (`398_<aviso>_…`). Es la clase
   de evidencia que la unión exige y que hoy no se usa: una misma vivienda de ACSA aparece hasta en
   cuatro tarjetas (InfoCasas, ML, El País, Facebook).

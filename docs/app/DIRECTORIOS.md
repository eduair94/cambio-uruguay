# Hub de directorios (`/directorios-uruguay`)

Una página que junta los trece directorios del sitio —casas de cambio, alquileres, venta de
viviendas, inmobiliarias, autos usados, monopatines y bicicletas eléctricas, celulares, sillas,
equipar una casa, tiendas online, precios de supermercado, couriers y tarjetas— en cuatro familias,
cada uno con lo que compara y cuántas entidades tiene hoy. Live 2026-09-18.

No se construyó para rankear (en este sitio rankea la ficha, no el hub): su valor es que un lector
que llegó por una sola ficha se entere de los otros doce directorios, y que queden enlazados entre sí.

## Piezas

| archivo | qué hace |
|---|---|
| `app/utils/directorios.ts` | registro puro: ruta, familia, qué compara, ícono, **la palabra de la cifra** y de dónde sale (`relevado` / `curado` / `sin-cifra`) |
| `app/server/api/directorios.get.ts` | una cifra por directorio, cada una con la fecha de su dato; cacheada 15 min |
| `app/pages/directorios-uruguay.vue` | las tarjetas, agrupadas por familia; SSR |

Nav: sección `tools`, al lado de `/herramientas` (las dos páginas que existen para llevar a otras).
Anuncios: densidad `light`, como `/herramientas`.

## La regla: cada cifra es la que el lector encuentra al hacer clic

**Cada tarjeta le pregunta a la misma ruta que usa su página y lee el mismo campo que esa página
imprime, con la misma palabra.** El adaptador cita la línea de la página.

No es prolijidad. La primera versión leía la meta que guarda cada job y, medida contra producción el
mismo día del deploy, cinco de nueve cifras contaban otra cosa que su página:

| directorio | la meta decía | la página muestra | por qué |
|---|---|---|---|
| alquileres | 66.388 | 60.454 | la ruta filtra por frescura y elegibilidad |
| sillas | 81 | 191 | la ruta recuenta con `lastSeen`; la meta es la de la última corrida |
| tiendas | 76 perfiles | 80 tiendas | el registro tiene cuatro tiendas que el job semanal todavía no perfiló |
| equipar | 69 "productos" | (ningún total) | habla por categoría |
| movilidad | 7 "productos" | (ningún total) | habla por banda, "N avisos" por tipo |

Y ventas decía "viviendas" donde su página dice "avisos". Todas pasaban los tests: los tests
comprobaban que el adaptador leyera el campo que el adaptador leía.

De ahí la segunda regla: **el hub sólo publica una cifra que el lector puede verificar en la
página**, la que imprime o el largo de la lista que dibuja entera (couriers: quince filas sin total
escrito). Equipar y movilidad no hacen ninguna de las dos y van `sin-cifra`; la página las nombra
—desde el registro, no a mano— y explica por qué no llevan número.

**Un cero nunca se publica** (`directorioCifra`): ninguno de estos directorios está vacío de verdad,
así que un cero siempre es "no lo pudimos leer", y la tarjeta sale sin número.

## Migas: Inicio › Directorios › el directorio

Las catorce páginas de directorio (las trece más bicicletas, la segunda página de movilidad) ponen el
hub entre "Inicio" y su propio nombre, visible y en el `BreadcrumbList`. Ruta, etiqueta y URL salen
de `DIRECTORIOS_HUB` / `directoriosHubListItem()` en `app/utils/directorios.ts`; las páginas
trilingües (alquileres, venta, inmobiliarias, casas, equipar, sillas) usan la clave global
`nav.directorios` y la URL localizada. Sillas y precios no tenían migas: ahora tienen las dos.

Dos excepciones a propósito:

- **Couriers y tarjetas** sólo lo llevan en JSON-LD. Su "migas" visible es un botón de volver a
  otro padre (← Herramientas, ← Salud financiera) y cambiarlo les quitaba ese enlace.
- **Las fichas no lo llevan** (un modelo, una casa, una sucursal): mueven más de mil páginas
  programáticas y es otra decisión.

`directorios.test.ts` exige que cada página de directorio tenga el eslabón, así un directorio nuevo
no se lo olvida.

## Análisis y estadísticas de cada directorio

Cada entrada declara `analisis`: las rutas que se calculan con los datos de ESE directorio (el
informe del mercado, la evolución de precios, el tasador, el histórico de las pizarras…). Con eso se
arma el vínculo en los dos sentidos, sin editar las páginas una por una
(`app/utils/directorioAnalisis.ts`, dibujado por `components/DirectorioAnalisis.vue` desde el layout,
arriba de "Seguí leyendo"):

- **En el directorio** (y en sus páginas `tambien`): "Análisis y estadísticas de este directorio".
- **En cada análisis**: "De dónde salen estos datos" → primero el directorio (o los directorios, si
  sale de varios: CyberLunes lee las ofertas de cuatro), después los análisis hermanos.
- **En el hub**: cada tarjeta lista los suyos; los que comparten dos o más tarjetas de una familia se
  dicen una vez sobre la familia.

Reglas que el test (`directorioAnalisis.test.ts`) hace cumplir:

- **Sólo la ruta en el registro.** La etiqueta sale de la entrada del menú (`siteNav`), que ya la
  tiene en español, inglés y portugués; por eso un análisis tiene que estar en el menú. El hub, que
  está escrito en español en los tres idiomas, las fuerza en español.
- **Una ruta es página del directorio (`tambien`) o análisis, nunca las dos.** "El mercado",
  "Comparar barrios" y "¿El descuento es real?" pasaron de `tambien` a `analisis` al separarlos.
- **"Seguí leyendo" no repite** lo que el bloque ya mostró (`RelatedContext.exclude`).
- Sólo rutas exactas: las fichas no llevan el bloque, como con las migas.

Agregar un análisis nuevo = una línea en el `analisis` de su directorio (y su entrada en el menú).

## Caché

Dos capas, y la segunda no es redundante: el borde (Cloudflare, 15 min) y la memoria del proceso
(`defineCachedFunction`, 15 min, `swr`). La página hace su SSR pidiéndole `/api/directorios` al
propio Nitro, y ese pedido interno nunca pasa por Cloudflare: sin la capa de memoria, cada render
sin caché disparaba las ocho consultas (~5 s medidos en frío). Una lectura sin ninguna cifra
relevada no se guarda (`validate`).

## Agregar un directorio

1. Una entrada en `DIRECTORIOS` con la palabra EXACTA que usa su página para su total.
2. Si imprime un total: un adaptador en `RELEVADOS` que llame a la ruta que usa la página y lea ese
   campo, con un comentario que cite la línea. Si es una lista a mano: su largo en `CURADOS`, con la
   fecha de revisión de la lista. Si no imprime un total: `fuente: 'sin-cifra'`.
3. Migas: `DIRECTORIOS_HUB` en la visible y `directoriosHubListItem()` en el JSON-LD.
4. Medir en producción que la tarjeta y la página digan el mismo número. El test no lo prueba.

`app/tests/unit/directorios.test.ts` exige que cada ruta exista, esté en la nav y tenga adaptador;
`directoriosApi.test.ts` fija el campo que lee cada adaptador y los casos de falla.

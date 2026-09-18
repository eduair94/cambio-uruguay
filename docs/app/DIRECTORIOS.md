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

## Agregar un directorio

1. Una entrada en `DIRECTORIOS` con la palabra EXACTA que usa su página para su total.
2. Si imprime un total: un adaptador en `RELEVADOS` que llame a la ruta que usa la página y lea ese
   campo, con un comentario que cite la línea. Si es una lista a mano: su largo en `CURADOS`, con la
   fecha de revisión de la lista. Si no imprime un total: `fuente: 'sin-cifra'`.
3. Medir en producción que la tarjeta y la página digan el mismo número. El test no lo prueba.

`app/tests/unit/directorios.test.ts` exige que cada ruta exista, esté en la nav y tenga adaptador;
`directoriosApi.test.ts` fija el campo que lee cada adaptador y los casos de falla.

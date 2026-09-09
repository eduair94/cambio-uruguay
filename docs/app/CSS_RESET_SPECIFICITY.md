# Los resets de margen tienen que ir en `:where()`, nunca en `:is()`

## El defecto — 9 de septiembre de 2026

Diecisiete componentes y páginas abrían su bloque de estilos con un reset de márgenes escrito así:

```css
.rental-page :is(h1, h2, h3, p, ul, ol, dl, dd) { margin: 0; }
```

**`:is()` toma la especificidad de su argumento más específico.** Ese selector no puntúa (0,1,0)
como uno esperaría de una clase, sino **(0,1,1)**: la clase más el elemento. Y con eso le gana a
todas las reglas del propio archivo, que son clases sueltas:

```css
.rental-page__amenities { margin-top: 12px; }   /* (0,1,0) — pierde, y queda en 0 */
```

El reset no estaba limpiando los márgenes del navegador: estaba **borrando los del propio autor**.
En silencio, porque una regla que pierde la cascada no aparece en ningún log ni rompe ningún test.

## Lo que estaba midiendo mal

Medido en producción con el navegador, no leído del código:

- **Ficha de alquiler** (`/alquileres/<key>`): **17 bloques** aplastados a `margin-top: 0`. El más
  visible, y el que lo destapó, fueron las chips de «Servicios y comodidades publicados», pegadas
  contra su propio encabezado — **0 px** donde su clase pedía 12.
- **`/prestamos-p2p-uruguay`**: **40 elementos**. Ahí lo pisado son las utilidades `mt-2`, `mt-3` y
  `mt-4` de Vuetify, que también puntúan (0,1,0): ningún margen escrito en ese template llegaba a
  aplicarse.
- El reset de `SurfaceCard.vue` viaja dentro de `:deep()`, así que aplastaba también el contenido
  que cualquier página le pasa por slot.

## El arreglo

`:where()` puntúa **cero**. El reset sigue ganándole a la hoja del navegador —cualquier declaración
del autor le gana al user-agent, sin importar la especificidad— y pierde contra cualquier regla de
clase, que es exactamente lo que se quería.

```css
:where(.rental-page) :where(h1, h2, h3, p, ul, ol, dl, dd) { margin: 0; }
```

La clase raíz también va en `:where()`, y no por prolijidad: dejarla suelta deja el selector en
(0,1,0), que **empata** con `.rental-page__amenities` y con `mt-3`, y un empate lo decide el orden
de aparición en la hoja — que entre el CSS scoped de un componente y las utilidades de Vuetify no
es algo que se pueda predecir. En (0,0,0) el resultado deja de depender del orden.

Aplicado a los diecisiete: `SurfaceCard`, `property/{AdvertiserContact,NearbyServices}`,
`property-sales/{Directory,Facts,ListingCard,MapBrowser,SearchFilters}`,
`rentals/{AnalysisMap,ZoneComparison,zones/Detail,zones/Explorer}`, `alquileres/[key]`,
`facturar-en-monotributo-uruguay`, `prestamos-p2p-uruguay`,
`recibir-regalos-del-exterior-uruguay` y `venta-viviendas-uruguay/[key]`.

**No se tocó `.market-head :is(h1, h2)`** de `ChairMarketDirectory.vue`: ese `:is()` agrupa
tipografía, no resetea márgenes, y ahí la especificidad extra no le está ganando a nadie.

## Verificación

Reescribiendo las reglas en vivo sobre la página de producción, en un viewport de 360 px:

| | antes | después |
|---|---|---|
| Encabezado → primera chip | 0 px | 12 px |
| Entre filas de chips | 8 px | 8 px |
| Alto del documento | 14.933 px | 15.083 px |

El documento crece un 1 %: el arreglo no agrega aire, devuelve el que cada regla ya declaraba.

## La regla, para la próxima

Un reset —márgenes, `list-style`, `padding` de base— va en `:where()`. `:is()` es para **elegir**
elementos cuando querés que la regla gane, no para bajar el volumen de la hoja del navegador. Si
alguna vez un `margin-top` de una clase «no hace nada», mirá primero si arriba del archivo hay un
`:is()` reseteando ese elemento: la regla está escrita, aplicada y perdiendo.

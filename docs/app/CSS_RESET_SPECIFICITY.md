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

## Segunda vuelta — 28 de noviembre de 2026: la especificidad no juega entre capas

El arreglo de arriba dejó bien una mitad y mal la otra. La mitad buena: con `:where()` el reset
pierde contra las clases **de la propia hoja** (`.rental-page__amenities`), que también van sin
capa. La mitad mala: **no devolvió ni un `mt-*`**, y la tabla de `/prestamos-p2p-uruguay` que lo
motivó seguía con sus cuarenta márgenes en cero.

Vuetify 4 sirve sus utilidades (`mt-3`, `mb-1`, `pa-4`…) dentro de `@layer vuetify-utilities` y
**sin `!important`**. En la cascada, una declaración normal fuera de toda capa le gana a cualquier
declaración normal dentro de una capa, **antes de mirar la especificidad**. `:where(.x) :where(p)`
puntúa (0,0,0) y aun así le gana a `.mb-3`, porque no compiten en el mismo escalón.

El síntoma que lo destapó: en `/acerca`, el título y la bajada de «Quién nos cita» quedaban a
**0 px** de la tarjeta, aunque el componente (`PressMentions`) pedía `mb-1` y `mb-3`. El reset de la
página (`.about-page :where(h1, h2, h3, p, ul, dl, dd) { margin: 0 }`) bajaba hasta los componentes
hijos y les borraba la utilidad. En `/datos-abiertos-uruguay`, el mismo componente sin ese reset
alrededor medía 12 px.

### Lo que estaba pasando, medido

Para cada página, se movieron en vivo las reglas de reset a una capa y se comparó el margen y el
relleno calculados de cada elemento. Sobre 26 páginas (una por familia), todo lo que cambió fue
espaciado que alguien había escrito y el reset borraba. Ningún elemento perdió espacio. Algunos casos:

| Página | Qué volvió |
|---|---|
| `/acerca` | `mb-1` y `mb-3` de «Quién nos cita»; `mb-3` de la tarjeta del MCP |
| `/prestamos-p2p-uruguay` | 14 `mt-2`/`mt-3`/`mt-4` (notas al pie y leyendas de cifras) |
| `/facturar-en-monotributo-uruguay` | dos `mt-8` entre secciones de una tarjeta |
| `/recibir-regalos-del-exterior-uruguay` | tres `mt-3` |
| `/opinion-alquileres` | `.opinion__lead { margin-top: 16px }`, que un `:is()` le ganaba |
| ficha de alquiler, `/alquileres-uruguay` | los 4 px del texto de la microencuesta (`:is()` otra vez) |

El reset global de `critical.css` (`:where(p, h1…):first-child { margin-block-start: 0 }`) tenía el
mismo defecto en todo el sitio: un `<p class="mt-3">` que abría una caja quedaba en 0.

### El arreglo

Cada reset va dentro de una capa que Vuetify ya ordena **por debajo** de las utilidades:

```css
@layer vuetify-overrides.cu-reset {
  :where(.rental-page) :where(h1, h2, h3, p, ul, ol, dl, dd) {
    margin: 0;
  }
}
```

- Le sigue ganando a la hoja del navegador: toda capa del autor le gana al user-agent.
- Le gana a los componentes de Vuetify (`vuetify-components` está antes que `vuetify-overrides`).
- Pierde contra `mt-*`/`mb-*` (`vuetify-utilities` está después).
- Pierde contra **cualquier** regla sin capa de la página, sin importar su especificidad. Por eso
  dentro de la capa ya no importa si el reset usa `:is()` o `:where()`.

Es una subcapa de `vuetify-overrides` y no una capa propia a propósito. Una capa nueva queda en el
orden en que el navegador la ve por primera vez. Como el CSS de los componentes llega después que
el de Vuetify, una capa nueva quedaría **por encima** de las utilidades, salvo que una declaración
de orden llegue antes que todo. La subcapa hereda la posición de `vuetify-overrides`, que el CSS
de entrada declara siempre primero. Aplicado a 47 reglas en 47 archivos. `ChairMarketDirectory`
mezclaba tipografía y `margin: 0` en la misma regla: se partió en dos y la tipografía quedó sin capa.

### La regla, y quién la vigila

Un reset de márgenes o relleno (`… :where(p, h2…) { margin… }`, o lo mismo con `:is()`) va
dentro de `@layer vuetify-overrides.cu-reset { … }`. `tests/unit/resetsInLayer.test.ts` barre
`assets/`, `components/`, `layouts/` y `pages/`, y pone CI en rojo con la lista de los que estén
afuera. Además verifica que Vuetify siga declarando `vuetify-overrides` antes que
`vuetify-utilities`: si una versión renombra esa capa, la nuestra pasaría a estar por encima de
las utilidades y el defecto volvería sin que nada falle.

**Lo que el test no ve**: un reset escrito con selector de elemento pelado (`.x p { margin: 0 }`).
Tiene el mismo efecto sobre un `<p class="mt-3">` dentro de `.x`. Si un `mt-*` «no hace nada»,
buscá la regla sin capa que toca ese elemento: en la consola, recorré `document.styleSheets`,
quedate con las reglas que `el.matches(r.selectorText)` y declaran `margin`, y fijate cuáles
**no** están dentro de un `CSSLayerBlockRule`.

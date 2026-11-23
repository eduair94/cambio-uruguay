# Motos usadas: el directorio a la altura del de autos

Fecha: 2026-11-23. Pedido del dueño: «que `/motos-usadas-uruguay` funcione igual que la página de
autos, con filtros avanzados y todas las features», y, a mitad del trabajo: «si la cilindrada no
está informada, usar un sistema de deducción similar al de autos».

## Por qué

El directorio de motos salió el 22/9/2026 como una TABLA de avisos con nueve filtros en fila, sin
fotos, sin página por aviso y con la cilindrada exacta en el 10 % de los avisos (57 de 590, medido
en producción el 23/11/2026). El de autos es otra cosa: tarjetas con foto, columna de filtros con
cajón en el celular, chips de filtros activos, ficha propia de cada aviso con galería, ficha técnica,
historia de precio y comparación contra iguales, comparador de avisos. La persona que busca una
moto hoy tiene la peor versión del mismo producto.

## Medido antes de diseñar (23/11/2026)

- Catálogo vigente: 590 avisos, todos de Mercado Libre, todos con foto, 558 con km, 526 con tramo
  de cilindrada de la faceta de ML (89 %), 497 con tipo, **57 con cilindrada exacta (10 %)**.
- La ficha propia del aviso (`moto.mercadolibre.com.uy/MLU-…`) contesta 200 con la UA del bot,
  igual que la de autos, y trae la tabla «Características principales». Muestra de 21 fichas:
  **Cilindrada 19 (90 %)**, Color 21, Tipo de moto 21 (casi siempre la etiqueta de ML: Naked,
  Custom, Calle, Scooters, Enduro…), Motor (2/4 tiempos) 17, Frenos 16, Único dueño 15, Potencia 11
  (con unidades disparatadas: «636 hp» para una Ninja 636, «150 W» para una Vespa), Acepta permuta 4.
- Una ficha dice «Bajaj Pulsar — 2.000 cc»: el vendedor tipea. La ficha no es verdad revelada.

## Objetivos

1. **Cilindrada para casi todo el catálogo**, con la cascada de evidencia de la carrocería de autos
   (`classes/autos/bodyType.ts`): ficha del aviso → título con unidad → consenso de los demás avisos
   del mismo modelo → número del nombre del modelo. Las dos últimas son ESTIMACIONES, se imprimen con
   «≈» y dicen de dónde salen. Nunca alimentan el consenso (sólo votan ficha y título).
2. **El directorio con la forma del de autos**: columna de filtros + cajón en mobile, barra de
   orden, chips, grilla de tarjetas con foto, scroll infinito, alertas.
3. **Filtros avanzados**: texto, marca, modelo, tipo, cilindrada (tramo y rango en cc), año,
   precio mín./máx., km máx., departamento, motor (nafta/eléctrica), vende (agencia/particular),
   color, publicado en los últimos N días, bajó de precio, sin deuda ni choque declarados, único
   dueño. Órdenes: recientes, precio ↑↓, km ↑, año ↓, cilindrada ↑↓.
4. **Ficha propia de cada aviso** (`/motos-usadas-uruguay/aviso/<key>`, noindex como la de autos):
   galería, precio, datos, ficha técnica declarada, lo que declara el aviso (deuda, choque…), cómo
   cambió su precio, cómo está contra la misma moto (modelo+año, modelo), otras parecidas.
5. **Comparador de avisos** (hasta 4, como autos).
6. Job nuevo `currency-motos-detail` que lee esas fichas con presupuesto, como `currency-autos-detail`.

## No objetivos / anti-objetivos

- **Oportunidades/gangas**: siguen afuera, por el mismo motivo de v1 (no hay cohorte fija medida).
  Una «ganga» sobre cilindrada estimada sería peor que la de v1.
- **Teléfonos de vendedores**: no (`docs/app/AUTOS_CONTACTOS.md` no se hereda).
- **No se rompen URLs**: la ficha por MODELO sigue en `/motos-usadas-uruguay/<slug>` (está en el
  sitemap); la del aviso va bajo `/aviso/`. Los parámetros de URL existentes (`marca`, `modelo`,
  `cilindrada`, `tipo`, `departamento`, `combustible`, `vendedor`, `precioMaxUsd`, `anioDesde`,
  `anioHasta`) se conservan: las alertas guardadas los usan.
- Anti-objetivo: una cilindrada estimada que se presente como dato del aviso, o un consenso que se
  alimente de sus propias estimaciones.

## Enfoques considerados

1. **Generalizar los componentes de autos a «vehículo»** (un `ListingCard` y un `Filters` para
   los dos). Rechazado: autos tiene diez fuentes, consumo, carrocería, contactos, oportunidades y
   riesgo; meterle ramas por tipo de vehículo a cada componente de autos arriesga el directorio que
   más rinde para ganar un directorio de 590 avisos.
2. **Componentes propios de motos que reusan las piezas NEUTRAS de autos** (elegido): el panel
   (`CarsFilterPanel`), el layout (`CarsSidebarLayout`), la barra (`CarsToolbar`), los chips
   (`CarsActiveFilters`, que pasa a ser genérico en sus claves), el feed infinito y las alertas; y
   tarjeta, filtros, ficha y comparador propios. Mismo look, cero riesgo sobre autos.
3. **Cilindrada sólo por ficha, sin deducción**. Rechazado por el pedido explícito del dueño y
   porque dejaría ~10 % del catálogo afuera de todo filtro.

## La cascada de cilindrada (`classes/motos/displacement.ts`)

| orden | evidencia | `displacementBasis` | se imprime |
|---|---|---|---|
| 1 | fila «Cilindrada» de la ficha propia | `ficha` | `150 cc` |
| 2 | el título con la unidad escrita | `title` | `150 cc` |
| 3 | consenso de los avisos del mismo modelo (votan sólo 1 y 2) | `model` | `≈ 150 cc` |
| 4 | número del nombre del modelo de ML («GTR 125», «Versys 650») | `model-name` | `≈ 125 cc` |

Guardas:
- **Banda de ML como veto**: si el aviso tiene tramo declarado por la faceta y el valor cae fuera
  del tramo (con 10 % de tolerancia en el borde, porque los tramos de ML se solapan), el valor se
  descarta y se pasa al escalón siguiente. Ataja la Pulsar de «2.000 cc».
- **Consenso** = al menos 3 votos del modelo y al menos 80 % dentro de ±10 % de la mediana; el valor
  es la mediana de los que concuerdan. Más laxo que la carrocería (8 y 90 %) porque el catálogo es
  35 veces más chico y la cilindrada es un número, no una categoría: «124» y «125» concuerdan.
- **Un valor de ficha que contradice un consenso fuerte** (≥ 4 votos concordantes, a más de 30 %)
  se trata como tipeo: manda el consenso, con base `model`.
- **Nombre del modelo**: un número de 2 a 4 cifras, entre 50 y 2.500, como palabra o pegado al final
  de letras («Z900», «FZ25» no: 25 < 50; «MT 03» no). Sólo si no contradice el tramo de ML.
- El tramo publicado pasa a ser `faceta de ML ?? tramo de la cilindrada (cualquier base)`, así el
  filtro por tramo cubre todo lo que tiene alguna cilindrada.
- Las **bandas por cilindrada de la ficha del modelo** y la `productKey` usan SÓLO las bases `ficha`
  y `title`: una estadística no se calcula sobre estimaciones.

## Ficha del aviso (backend)

`classes/motos/detail.ts` lee la página con `fetchText` (UA del bot, 2 s entre pedidos) y guarda en
`motolistings.detail`: precio, moneda, si está activa, la tabla cruda (privada), cilindrada, color,
tipo, galería (hasta 8 fotos de `http2.mlstatic.com`), descripción (privada, ≤ 5.000) y la fecha.
Cola (`detailQueue.ts`): primero los nunca leídos, los más recientes primero; después los de más de
30 días. Un error se anota (`detailError`) y espera un día; un 404/410 se anota y no se repide en 7.
120 fichas por corrida, horaria a los :51 (lejos de autos-detail :11 y rentals-ml-detail :35, que
pegan a Mercado Libre directo).

Lo que la ficha agrega al público (armado campo por campo en `publicMotoListing`):
`pictures`, `color` (familias de autos), `specs` curado (`engine`, `brakes`, `starter`,
`transmission`, `power` sólo si la unidad es hp/cv/kW y el número es plausible, `uniqueOwner`,
`tradeIn`, `negotiable`, `readAt`) y `risks` (`declaredRisks` de autos sobre título + descripción:
la cita es del vendedor). El tipo de la ficha completa al de la faceta cuando falta, y una ficha que
dice «Cuatriciclos/Triciclos/Motocarros» saca al aviso del directorio. Un aviso cuya ficha leída
DESPUÉS de su última aparición dice que no está activo sale del catálogo.

## App

- `utils/motos.ts`: query nueva (claves viejas + `q`, `precioMinUsd`, `kmMax`, `ccMin`, `ccMax`,
  `color`, `dias`, `bajo`, `sinRiesgo`, `unicoDueno`), facetas nuevas (colores, tramos), órdenes
  nuevas, formato de la cilindrada con su base.
- `components/motos/{ListingCard,Filters,CompareLink}.vue`; la página del directorio con el layout de
  autos; `pages/motos-usadas-uruguay/aviso/[key].vue` + `server/api/motos/aviso/[key].get.ts`;
  `pages/motos-usadas-uruguay/comparar.vue` + `server/api/motos/compare.get.ts`.
- Las alertas de búsqueda de motos enlazan la ficha del aviso.
- La ficha por modelo enlaza cada aviso a su ficha y usa la tarjeta nueva.
- Fila nueva en `docs/seo/experiments.json` para `/motos-usadas-uruguay` (última del 27/9).

## Lo que queda al constructor

Textos finales, el detalle visual de tarjeta y ficha (siguiendo autos), los nombres internos.

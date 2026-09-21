# Plan de ingreso — `currency-revenue-plan`

Cruza los dos tableros privados que ya existían y nunca se cruzaron, y mide el libro de cambios.
Corre **todos los días a las 11:50 UTC**. Escribe **un** documento en la Mongo del app,
`revenueplansnapshots`, que sirve `/api/revenue-plan` con `requireAdmin` y renderiza la página
privada `/estadisticas-de-busqueda`.

---

## Por qué existe

Hay dos pipelines maduros midiendo mitades distintas de la misma pregunta:

| job | qué mide | en qué unidad ordena el trabajo |
|---|---|---|
| `currency-gsc` | demanda de búsqueda, oportunidades | **clics potenciales** |
| `currency-site-analytics` | ingreso publicitario por familia de página | **USD por 1.000 vistas** |

Los dos usan el **mismo `bucketOf`** (`classes/gsc/opportunities.ts`) para armar la familia. El
comentario de cabecera de `classes/site-analytics/revenue.ts` dice, textual, que es así "para que
las dos tablas se puedan cruzar fila a fila". Nadie las cruzaba.

Importa porque el RPM de este sitio **no es parejo entre familias — varía por un factor de
trescientos**. Medición del 2026-09-16 sobre GA4 (3–15/9), muestras chicas pero patrón consistente,
expresada en múltiplos del promedio del sitio:

| familia | RPM relativo al promedio del sitio |
|---|---|
| guía de préstamo a sola firma | ~28× |
| rescindir alquiler | ~11× |
| sala VIP | ~6× |
| clearing | ~5× |
| históricos | ~1,4× |
| portada | ~0,6× |
| `/oportunidades` | ~0,18× |
| `/alquileres` | ~0,09× |

> **Los montos absolutos no van en este archivo.** Convención del repo, que es público: el registro
> de crecimiento (`docs/seo/adsense-growth-loop.md`) es "público sin cifras" y los montos viven sólo
> en `docs/seo/data/` (gitignored) y en el snapshot privado. Lo que sí vive acá es la FORMA, que es
> lo que hace falta para entender el código y además envejece bien.

Con ese spread, **una cola ordenada por clics no está ordenada por nada que tenga que ver con el
ingreso**: manda a trabajar donde hay impresiones, que es exactamente donde el clic no paga. 200
clics ganados en `/convertir/*` valen menos que 20 en una guía.

---

## La aritmética

```
valor de un clic en la familia F = RPM(F) / 1000
valor esperado de una acción     = clics potenciales × valor del clic de su familia
```

`clics potenciales` sale tal cual del pipeline de Search Console (que ya excluye el pozo de cero
clic y usa la curva de CTR del propio sitio). La familia sale de la URL de la oportunidad.

### Cómo se sabe la URL de una oportunidad

`strikingDistance`, `movers` y `newQueries` trabajan sobre la tabla de **consultas**, que no tiene
página. Sin página no hay familia, y sin familia todo se valuaría al promedio del sitio — o sea se
borraría justo la diferencia que decide. Por eso `attachPages()` (en `classes/gsc/opportunities.ts`)
le pega a cada fila la URL con más impresiones para esa consulta, con la misma regla que
`cannibalisation` ya usaba para elegir ganador.

### De dónde sale el RPM de cada familia, en orden

1. **Medido**, si la familia tiene ≥ 500 vistas y ≥ 100 impresiones de anuncio en la ventana. Es el
   caso bueno y con el tiempo debería ser el único.
2. **Por tramo**: `RPM del sitio × multiplicador del tramo`. Un multiplicador, no un RPM absoluto —
   la cifra absoluta envejece en cuanto el sitio factura otra cosa, la forma no.
3. **Sin clasificar**: vale 1× (el promedio) y sale en una alerta. Nunca se le inventa un
   multiplicador alto: una página que no se midió no puede encabezar la cola por una suposición.

| tramo | multiplicador | qué incluye |
|---|---|---|
| `contenido` | 8× | guías, blog, importar, temas, comparativas, glosario, newsletter |
| `dato-vivo` | 1× | portada, cotización, conversor, histórico, casa, sucursal, indicadores |
| `directorio` | 0,2× | alquileres, ventas, autos, celulares, equipar, tiendas, movilidad |
| `otro` | 1× | lo que todavía no se clasificó |

8× y no 25× (que es lo que daría la guía de préstamos) **a propósito**: la tabla tiene que sobrevivir
a que la revisen en noventa días, y el extremo de una muestra de doce días no es el valor esperado.

**El tramo se audita solo.** Cuando una familia junta muestra propia, el snapshot publica su
multiplicador medido al lado del que el tramo asume, y si se separan más de 3× sale la alerta
`tier-drift`. La tabla de tramos es una hipótesis con fecha, no una constante — ver
`classes/revenueplan/value.ts`.

### Por qué el orden sobrevive a que no haya plata medida

El enlace AdSense↔GA4 es del 2026-09-02 y el ingreso diario del sitio, cuando esto se escribió,
era de centavos. La columna en USD puede quedar en cero días enteros. Por eso lo que **ordena** la cola es
`weightedClicks = clics potenciales × multiplicador` — proporcional al USD esperado siempre que haya
RPM, y perfectamente definido cuando no lo hay.

---

## El libro de cambios

`docs/seo/experiments.json`, declarado a mano, medido solo.

**Por qué existe:** `docs/seo/adsense-growth-loop.md` cierra nueve iteraciones seguidas con la misma
frase — "evaluar con 28 días finales posteriores" — y ninguna vuelve a medir la anterior. No es
desprolijidad: medir a mano veintiocho días después exige acordarse veintiocho días después. La
consecuencia es que el sitio acumula cambios publicados y cero veredictos, o sea que la décima
palanca se elige igual que la primera.

**La regla que lo hace honesto:** el veredicto NO mira los clics del sujeto, mira su **porción de los
clics del sitio** en las mismas fechas.

> Entre marzo y agosto de 2026 las impresiones diarias se multiplicaron por 6 y los clics por 2,1.
> Sobre una serie que sube sola, comparar 28 días contra los 28 anteriores declara ganador a **todo**
> lo que se toque, incluido no tocar nada.

```
lift relativo = (clics_después / clicsSitio_después) / (clics_antes / clicsSitio_antes)
```

1,00 = se movió igual que el sitio, o sea nada. ≥ 1,20 mejoró, ≤ 0,80 empeoró.

Detalles que costaron pensarse:

- **El día del despliegue no entra en ninguna ventana.** Media jornada con el cambio y media sin él
  no pertenece a ninguna punta.
- **La ventana se cierra contra el ARCHIVO, no contra el calendario.** Search Console cierra cada día
  con ~3 de atraso; "ya pasaron 28 días" y "ya hay 28 días medidos" no son lo mismo.
- **Un hueco en el archivo se cae del numerador y del denominador a la vez**, porque sujeto y sitio
  salen del mismo documento por día.
- **Una página nueva se mide contra cero, no con un cociente imposible.** Cero clics previos no es
  ruido: es cero de verdad, y lo único que se quería saber es si la página existe en la búsqueda.
- **Un cambio que toca todo el sitio no se puede declarar acá.** Sin páginas de control, el sujeto es
  el denominador y siempre da "sin cambio". La barra de familia (`ce35e4b5`) y el bloque de temas
  (`c10fb0ab`) son de ese tipo y quedaron fuera a propósito.

### Cómo se agrega una fila

En el **mismo commit** que publica el cambio:

```json
{
  "id": "algo-unico-y-estable",
  "shippedOn": "2026-09-20",
  "routes": ["/una-ruta-exacta", "/una-familia/*"],
  "queries": ["una consulta exacta"],
  "hypothesis": "Qué se esperaba que pasara, en una línea."
}
```

Una ruta que termina en `/` o `*` toma la familia entera; el resto exige coincidencia exacta.

Dos tripwires cuidan el archivo, porque sus dos modos de fallar son **silenciosos**:
`tests/revenueplan/experiments.test.ts` falla si el JSON que se despliega no parsea (un JSON roto
desactiva el ledger entero sin decir nada), y `tests/revenueplan/experiments_routes.test.ts` falla si
una ruta declarada no existe en `app/pages` — una ruta mal tipeada publica "sin datos" para siempre,
que es el mismo síntoma que "todavía no hay suficiente historia" y por eso nadie lo notaría.

---

## Qué NO hace

- **No publica nada.** Ni páginas, ni títulos, ni catálogos. Escribe un documento privado que lee una
  persona. El repo ya rechazó la generación automática de contenido por buenas razones, y una cola
  que se ejecuta sola es esa idea con otro nombre.
- **No sale a ninguna API.** Lee los snapshots que `currency-site-analytics` (10:51) y `currency-gsc`
  (11:20) ya dejaron escritos. Sin credenciales nuevas, sin cuota.
- **No recomienda enlaces internos.** La tabla de familias deja la evidencia (qué familia consume
  tráfico sin pagarlo) pero elegir el destino de un enlace de contexto es una decisión editorial y
  sigue siendo de una persona. Queda explícitamente pendiente.
- **No atribuye ingreso a un despliegue.** El `totalUpsideUsd` es una suma de estimaciones y la
  pantalla lo dice.

---

## Guardarraíles

| guarda | qué ataja |
|---|---|
| `planIsThin` | `currency-gsc` falló hoy → cola casi vacía que en la pantalla se ve igual que "no hay nada para hacer". No pisa un plan de ≥ 10 acciones con uno que trae menos del 40 %. La negativa caduca a los 7 días. |
| `MAX_ARCHIVE_DAYS = 90` | cada documento del archivo lleva hasta 5.000 consultas y 3.000 páginas; sin tope, agregar experimentos degrada en silencio hasta un OOM. Lo que se cae es lo viejo, nunca lo recién publicado. |
| veredictos cerrados se reusan | una ventana cerrada no cambia; releerla todos los días es leer el archivo entero para nada. `sin datos` y `esperando` sí se recalculan, porque un `--backfill` puede haber agregado justo los días que faltaban. |
| pisos de muestra por familia | una familia con 40 vistas y una impresión da un RPM espectacular y falso que encabezaría la cola para siempre. |
| `PROVISIONAL_REVENUE_USD` | con centavos en la ventana, todo RPM por familia es provisional y la pantalla lo dice. |
| desglose completo de ingreso | `fetchRevenue` pagina por `pagePath` hasta `rowCount`, con presupuesto de 100.000 filas. Las páginas sin anuncios también aportan vistas al RPM. Una página incompleta, repetida, un total cambiante o un error conserva el snapshot privado anterior; la actualización pública sigue independiente. |

La lectura del 21/9 detectó que el límite anterior de 2.000 URLs dejaba fuera gran parte de las
vistas, aunque los ingresos y las impresiones publicitarias sí cerraban. Por eso las familias se
calculan después de completar el desglose y las páginas más rentables se ordenan al final. Los
totales originales se conservan: la paginación no excluye países ni decide qué tráfico es humano.
Un aumento de vistas sin interacción ni anuncios exige investigar su procedencia antes de usarlo
para reajustar los multiplicadores. Las cifras y el diagnóstico detallado quedan en
`docs/seo/data/revenue-2026-09-21/`, fuera del repositorio público.

Las caídas de una página conservan su URL desde `pageFalling`, antes de atribuir destinos a las
consultas. Así una caída del histórico se valora como histórico y una de una guía como guía. Una
consulta que parece una URL sigue necesitando evidencia en el informe página × consulta; su
texto no se usa para inventar un destino.

## Privacidad

Este documento cruza las dos cosas que el repo ya decidió no publicar: las **consultas** de Search
Console y **cuánto factura** cada familia de página. Colección propia, ruta propia con
`requireAdmin`, `cache-control: private, no-store`, y `tests/revenueplan/privacy.test.ts` falla si
alguna ruta sin `requireAdmin` o alguna página que no sea `/estadisticas-de-busqueda` lo toca.

## Operar

```bash
npm run build && node dist/sync_revenue_plan.js --dry-run   # calcula e imprime, no escribe
node dist/sync_revenue_plan.js --force                      # escribe aunque parezca flaco (sembrar)
```

Necesita `APP_MONGO_URI`. Sin eso se niega a correr: los tres snapshots viven en la base del Nuxt.

Ver también: [`SEARCH_CONSOLE_API.md`](SEARCH_CONSOLE_API.md), [`GA4_DATA_API.md`](GA4_DATA_API.md),
`docs/seo/adsense-growth-loop.md`.

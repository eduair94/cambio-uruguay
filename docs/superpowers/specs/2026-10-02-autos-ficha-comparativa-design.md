# Ficha de autos: comparativa de precio, análisis para decidir y el modelo explicado

Pedido (2026-10-02): "A las páginas de autos agregar comparativa de precio como hacen las páginas de
Mercado Libre y otros análisis estadísticos que sean de ayuda para decidir si vale la pena. Así como
el auto más barato por ese precio, el auto más barato por km recorrido e información útil. Si podés
encontrar un enlace con una descripción profunda del modelo y asociar videos de YouTube sería
excelente." Ejemplo: `/autos-usados-uruguay/fb-1639779547534738` (Saveiro Extreme 2024, FB).

## Qué ya existe y se reutiliza

- La ficha (`app/pages/autos-usados-uruguay/[key].vue`) ya muestra una frase de cohorte (mediana,
  p25–p75) y 8 "parecidos". No dice DÓNDE cae el aviso ni qué conviene más.
- `carmarketsnapshots` (mediana por año y por versión), `carreportsnapshots` (coeficiente de km,
  depreciación por modelo, negociación, brecha automotora/particular), `caradvisorsnapshots`
  (repuestos, equipamiento, caída anual), `latinNcap.ts`, `estimateCarValue` (tasador),
  `estimatePatenteUyu` y los costos del asesor. Nada de eso llega hoy a la ficha.

## A. "¿Vale lo que piden?" (sin job nuevo, se calcula por pedido)

Función pura `app/utils/carInsight.ts → buildCarInsight(input)`; el endpoint de la ficha junta los
datos y la llama. Toda pieza es opcional: una lectura lenta nunca esconde el aviso.

Datos de entrada que lee el endpoint:
- **pares**: avisos vigentes del mismo `marketSlug`, año ±2 (tope 400; índice `marketSlug+year`).
- **alternativas**: avisos vigentes de cualquier modelo con precio entre 90 % y 105 % del aviso y la
  misma carrocería si se conoce (tope 400; índice `body.type+priceUsd` / `priceUsd`).
- snapshots de mercado, informe y asesor; precios de combustible (`/api/combustibles` con fallback).

Salida:
1. **Posición (como la comparativa de ML)**: entre los pares del MISMO año (y misma versión si hay
   ≥ 5), o año ±1 si el año solo no llega a 5. Mínimo, p25, mediana, p75, máximo, percentil ("más
   barato que 7 de cada 10") y veredicto por brecha contra la mediana: ≤ −15 % muy por debajo (con
   aviso: "revisá por qué"), −15..−5 por debajo, ±5 en precio, +5..+15 por encima, > +15 muy por
   encima. Se dibuja como barra horizontal (rango, banda central, mediana, marcador del aviso).
2. **Corregido por kilómetros**: `estimateCarValue` (el mismo cálculo del tasador) para su año, km y
   versión → rango esperado y brecha; más "cada 10.000 km de más le restan ~US$ X a este modelo".
3. **Elecciones** (tarjetas con el motivo arriba), siempre excluyendo al propio aviso, a los que
   declaran deuda/choque/etc., a los marcados y a los de moneda deducida (las elecciones "más
   barato" atraen errores):
   - *El más barato del mismo año* (y versión si la cohorte por versión existe).
   - *El más barato por km recorrido*: menor cociente precio / precio esperado para SU año y SUS km
     (mediana del año × factor de km); también el puesto del propio aviso en ese orden.
   - *Por esta plata, el de menos km* y *el más nuevo*: mismo modelo, precio ≤ 105 % del aviso.
   - *Otros modelos por la misma plata*: el más nuevo y el de menos km de la misma carrocería, más
     una lista de modelos con cuántos avisos hay y su año/km medianos (enlace a su página de precios).
4. **Depreciación**: caída anual del modelo (informe; si no, la típica del mercado, dicho así),
   mediana por año dibujada con el año del aviso marcado, y "en un año pediría ≈ US$ X".
5. **Costo de tenerlo** (12.000 km/año, supuesto visible): combustible con el consumo del aviso o del
   modelo, patente estimada SUCIVE 2026, SOA, mantenimiento ajustado por índice de repuestos y
   depreciación → por mes en efectivo y por año total. Reusa la lógica de costos del asesor (se
   extrae a una función exportada; el asesor la sigue usando).
6. **Datos para decidir**: repuestos (índice y piezas si hay ≥ 3 medidas), Latin NCAP (los ensayos
   más cercanos al año, sin puntuar), negociación observada (cuánto bajan los que bajan) y brecha
   automotora/particular del modelo.

Reglas: sin cohorte de ≥ 5 pares no hay veredicto (se dice); todo número dice de dónde sale; precios
pedidos, no tasación.

## B. El modelo explicado: Wikipedia + videos de YouTube (job nuevo)

`currency-autos-models` (`dist/sync_car_models.js`, diario 06:37 UTC, presupuesto 40 modelos por
corrida, refresco cada 30 días; fallas se reintentan a los 7) → APP DB `carmodelinfos` (pública, un
documento por `marketSlug`). Modelos: los de `carmarketsnapshots` con ≥ 8 avisos, más avisos primero.

- **Wikipedia**: resumen REST de `es.wikipedia.org` para "Marca Modelo"; si no, búsqueda MediaWiki;
  si no, `en.wikipedia.org`. Se acepta sólo si la descripción/resumen habla de un vehículo y el
  título nombra el modelo o la marca (la Saveiro redirige a "Volkswagen Gol": se acepta y la página
  lo dice). Se guarda título, URL, resumen, miniatura, idioma. UA identificada (política Wikimedia).
- **YouTube**: `/results` está prohibido por `robots.txt`, la API pide clave y el SERP interno está
  caído. Medido 2026-10-02: una llamada a Gemini con `google_search` para "videos de prueba de la
  Saveiro" devolvió 10 URLs `youtube.com/watch?v=…` REALES en los chunks de grounding (el TEXTO traía
  tokens de redirección, no ids). Regla: los ids salen SÓLO de los chunks resueltos, nunca del texto;
  cada uno se verifica con el oEmbed oficial de YouTube (existe, es video, título y canal) y el título
  tiene que nombrar el modelo; se descartan juguetes/juegos/escala y avisos de venta; primero los que
  dicen prueba/review/reseña/test. Máximo 4.
- Fuente caída = se conserva lo anterior (`undefined`); respuesta explícita de "no hay" = `null`.
- App: `loadCarModelInfo(slug)` con caché; la ficha y la página de precios del modelo
  (`/autos-usados-uruguay/precios/[slug]`) muestran `CarsModelInfo`: tarjeta de Wikipedia con
  atribución CC BY-SA y videos con fachada (miniatura; el iframe `youtube-nocookie` sólo al clic).

## Pruebas

- `app/tests/unit/carInsight.test.ts`: veredictos y percentil, cohorte chica → null, exclusiones de
  las elecciones, "más barato por km", "menos km por esta plata", alternativas, costos.
- `app/tests/unit/carModelInfo.test.ts`: validación del documento que llega de la base.
- `tests/autos/modelInfo.test.ts`: validación de Wikipedia, extracción de ids, filtro de títulos,
  planificador, fusión que conserva lo anterior ante una fuente caída.
- Se verifica en la página real (dev contra datos de producción) antes de dar por terminado.

## Fuera de alcance

Tasación oficial (aforo), historial de ventas, videos subidos por vendedores, resumen generado por IA.

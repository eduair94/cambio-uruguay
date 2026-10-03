# Fichas de alquiler y venta: comparativa con lo que hay cerca

Pedido (2026-10-03, después de la comparativa de autos): "Hacer lo mismo para las páginas de casas,
tanto venta como alquiler. Agregar casas similares (misma zona, cerca), la más económica dentro de
un radio de distancia razonable, la más económica por m², etc."

## Qué ya existe

- Ficha de alquiler (`/alquileres/<key>`, trilingüe): mediana del barrio con ≥ 10 avisos del mismo
  tipo y dormitorios (`rentalPageMarket`) y 6 parecidos ordenados por cercanía de PRECIO. No hay
  distancias, ni $/m², ni "la más barata cerca".
- Ficha de venta (`/venta-viviendas-uruguay/<key>`, trilingüe): 6 avisos recientes de la misma zona
  y dormitorios. Sin posición de precio, sin $/m², sin distancias.
- Reutilizable: distancia confiable por aviso de alquiler en Mongo (`rentalDistanceStages`, la
  misma política de `rentalNearbyOrigin`: sólo coordenada propia del aviso, nunca centroides), la
  guarda de $/m² de alquiler (`rentalPricePerM2`), `geo.precision` de ventas (`approximate`/`exact`).

## Diseño

Una función pura compartida, `app/utils/propertyInsight.ts → buildPropertyInsight`, sobre filas
normalizadas (alquiler en $ por mes, venta en US$); dos cargadores de servidor; un endpoint por
operación que se pide desde el navegador (la ficha no espera el análisis, y una falla no la toca); un
componente trilingüe compartido.

**Alcance ("cerca")**: con coordenada propia del aviso, escalera de radios 1 → 2 → 3 → 5 km; se usa el
menor radio con ≥ 8 comparables (mismo tipo y dormitorios, limpios); con 5–7 a 5 km se usa igual. Sin
coordenada propia: mismo barrio, sin distancias, y la página lo dice. Nunca se usa una coordenada que
no sea propia del aviso.

**Salida**:
1. **Posición**: mín, p25, mediana, p75, máx, percentil y veredicto (−15/−5/+5/+15 %) contra los
   comparables del alcance. Mínimo 5; si no, sin veredicto.
2. **$/m²**: el del aviso contra la mediana de su tipo con dormitorios ±1 en el alcance. Alquiler con
   `rentalPricePerM2`; venta con una guarda propia del mismo estilo (superficie 15 m² a 100 + 80 ×
   dormitorios, piso US$ 300/m² apto y US$ 150/m² casa, techo US$ 20.000/m²; superficie edificada,
   si no total, si no la informada; nunca la del terreno).
3. **Elecciones** (con distancia cuando hay): la más económica parecida, la más económica por m², la
   más grande por la misma plata (≤ 105 %), con un dormitorio más por la misma plata, y la parecida más
   cercana (precio ±20 %). Nunca el propio aviso; un mismo aviso no se repite.
4. **Oferta**: cuántos avisos parecidos hay en el alcance.

Alquiler compara el alquiler sin gastos comunes (como el mercado del barrio que ya existe); venta
compara en dólares (pesos convertidos con la cotización del catálogo).

## Pruebas

`app/tests/unit/propertyInsight.test.ts` (escalera de radios, sin coordenada → barrio, veredictos,
$/m² con guardas, elecciones y exclusiones), validación de los endpoints con mocks, y verificación en
la página real.

## Fuera de alcance

Rentabilidad de compra para alquilar (la página de oportunidades la evita a propósito), tasación,
cambios al mercado del barrio que ya existe.

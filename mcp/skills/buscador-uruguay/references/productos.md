# Productos y precios en Uruguay: guía para el agente

## Directorios

- **Celulares**: modelo + almacenamiento, precio nuevo más bajo entre tiendas uruguayas y Mercado Libre.
- **Sillas de escritorio y gamer**: precio, calificación, vendedores.
- **Hogar** (38 categorías: heladera, lavarropas, colchón, cocina, calefón, aire acondicionado, TV,
  microondas, sofá…): banda de precio nuevo (p25–mediana–p75), banda de usado, ahorro de comprar usado.
- **Movilidad eléctrica**: monopatines y bicicletas eléctricas (nuevo y usado).
- **Tiendas online**: señales de confianza fechadas.
- **Supermercado**: precios oficiales del SIPC (MEF) por artículo y súper más baratos por canasta
  emparejada.

## Tools

- `search_products`: búsqueda unificada; `vertical` para acotar, `condition: "used"` para ver precio
  usado, `maxPriceUyu` como tope.
- `plan_home_setup`: presupuesto para equipar una vivienda (`level`: minima, decente, completa;
  `have`: lo que ya tiene; `condition: "new"` para todo nuevo). Si el total es parcial, decilo.
- `check_online_store`: señales, nunca veredicto. Una tienda nueva puede ser seria.
- `supermarket_prices`: `text` para artículos, `department` para el ranking de supermercados.

## Cómo presentar

- Precio más bajo con vendedor y link, y la banda típica para que la persona sepa si una oferta es
  normal.
- Si usado conviene (heladera, cocina, calefón, muebles), decilo con el ahorro; si no (colchón,
  sábanas), también.
- Para compras online en tiendas desconocidas, sumá `check_online_store`.

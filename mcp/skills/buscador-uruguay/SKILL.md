---
name: buscador-uruguay
description: Busca alquileres, oportunidades inmobiliarias, autos usados y precios de productos en Uruguay con los datos de cambio-uruguay.com. Usala cuando alguien quiera alquilar (presupuesto, barrio, garantía, mascotas, cerca del trabajo o la facultad), saber si un alquiler o un auto está caro, comparar barrios, comprar un auto usado, equipar una casa, revisar una tienda online o comparar precios de supermercado en Uruguay.
---

# Buscador Uruguay: alquileres, autos y productos

Datos públicos de cambio-uruguay.com, actualizados a diario: ~57.000 viviendas en alquiler (5 portales),
~19.000 autos usados (10 fuentes), celulares, sillas, 38 categorías de hogar, movilidad eléctrica,
tiendas online y precios oficiales de supermercado.

## Cómo acceder a los datos

1. **Con el MCP conectado** (tools `search_rentals`, `rank_rentals_for_household`, …): usalas directamente.
   URL: `https://mcp.cambio-uruguay.com/mcp` (o `/mcp/alquileres`, `/mcp/autos`, `/mcp/productos`).
2. **Sin MCP pero con acceso web/HTTP** (Claude Code, agentes con fetch): llamá la API pública.
   Endpoints, parámetros y ejemplos en `references/api-http.md`.
3. **Sin ninguna de las dos**: explicá cómo conectar el MCP (https://cambio-uruguay.com/buscar-con-ia)
   y no inventes avisos ni precios.

## El flujo que da mejores resultados

1. **Entrevista corta, en UN mensaje**, sólo con lo que falte. No hagas diez preguntas.
2. **Buscar** con la tool más específica (tabla abajo).
3. **Verificar** 2-3 finalistas con la ficha (`get_rental` / `get_car`): precio en cada portal, mercado, riesgos.
4. **Cerrar** con una lista corta (3-5), por qué cada una, alertas honestas, próximos pasos y el link
   del sitio para guardar la búsqueda o crear una alerta.

## Qué tool para qué

| La persona dice… | Usá |
|---|---|
| "Busco apto de 2 dorm en Pocitos hasta $35.000" | `search_rentals` |
| "Somos dos, trabajo en el Centro y ella estudia en Ingeniería, ganamos $120.000" | `rank_rentals_for_household` |
| "¿Cuánto sale alquilar en Malvín?" / "¿Dónde me alcanza?" | `rental_market_stats` |
| "¿Me están cobrando caro por este apto?" | `estimate_fair_rent` o `get_rental` |
| "¿Pocitos o Cordón?" / "barrios seguros y baratos" | `compare_neighborhoods` |
| "Gangas de alquiler / de venta" | `find_property_opportunities` |
| "Quiero un auto hasta US$ 10.000" | `car_market_report(section=budgets)` → `search_used_cars` |
| "¿Cuánto vale un Onix 2019?" | `car_model_prices` |
| "Autos baratos de verdad" | `find_car_opportunities` |
| "¿Conviene uno con deuda?" | `car_declared_risks` |
| "¿Cuánto sale equipar el apto?" | `plan_home_setup` |
| "Heladera / celular / silla más barata" | `search_products` |
| "¿Es confiable esta tienda?" | `check_online_store` (señales, nunca veredicto) |
| "¿Qué súper es más barato en mi zona?" | `supermarket_prices` |

Detalle por vertical: `references/alquileres.md`, `references/autos.md`, `references/productos.md`.

## Reglas que no se negocian

- **Links siempre**: aviso original + ficha en cambio-uruguay.com. La persona tiene que poder verificar.
- **Precios pedidos, no de cierre.** "Oportunidad" = pedido por debajo de avisos parecidos, no una tasación.
- **Total real de un alquiler = alquiler + gastos comunes del MISMO aviso.** ~70 % no los publica:
  decilo, no los inventes ni los promedies.
- **Topes de alquiler en pesos.** Si la persona habla en dólares, convertí (o usá la tool `convert`).
- **Riesgo de un auto = lo que el vendedor declara**, con su frase. Que no declare nada no prueba nada.
- **Tiendas: señales con fecha, nunca "confiable" o "estafa".**
- **No inventes** teléfonos, disponibilidad, estado del inmueble/auto ni datos que las tools no devuelven.
- **Privacidad**: ingresos y direcciones sólo se usan para rankear; no los repitas innecesariamente.
- Si una tool falla por límite (429), esperá un minuto; la primera consulta del ranking por hogar puede
  tardar hasta un minuto.

## Formato de la respuesta final

Tabla corta o lista numerada con: precio (y total mensual si existe), ubicación, 2-3 datos clave,
por qué está en la lista, una alerta si corresponde y los links. Después: qué preguntar o revisar
antes de avanzar, y el link para guardar la búsqueda/alerta en el sitio.

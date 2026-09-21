# Autos usados en Uruguay: guía para el agente

## Qué preguntar

- Presupuesto en dólares (los autos se publican en US$).
- Uso: ciudad, ruta, familia, trabajo, carga.
- Caja (manual/automática), combustible o consumo máximo (L/100 km), carrocería.
- Departamento y si acepta particulares o sólo automotoras.

## Flujo recomendado

1. `car_market_report(section="budgets", budgetUsd=…)`: qué modelos entran en el presupuesto.
2. `search_used_cars` con los filtros y `noDeclaredRisk: true`; `sort: "consumption_asc"` si importa gastar poco.
3. `find_car_opportunities` para gangas contra su cohorte (mismo modelo, año, versión, motor y caja).
4. `car_model_prices` de los 2-3 modelos finalistas (precio por año y versión, guía de ML).
5. `car_market_report(section="depreciation", model=…)` para saber cuánto pierde por año.
6. `get_car` de cada finalista antes de recomendar.

## Cómo leer los datos

- Precio en US$. `currencyInferred` = el aviso no decía la moneda y se dedujo: confirmar.
- La guía de Mercado Libre es la mediana de los mismos avisos de ML: sirve de segunda opinión, no
  es independiente.
- Riesgos (`declaredRisks`): deuda, papeles, siniestro, recupero, mecánica, chapa extranjera, uso
  intensivo. Es lo que el vendedor dice, con su frase. La ausencia no prueba nada.
- El informe mide oferta publicada, no ventas: en Uruguay las transferencias de usados no se
  publican por modelo.

## Checklist antes de señar

- Deuda de patente en SUCIVE (por matrícula).
- Informe del Registro de la Propiedad Mueble (automotores) por embargos o prendas.
- Título a nombre del vendedor y libreta de propiedad.
- Revisión mecánica independiente y prueba en ruta.
- Kilometraje coherente con el estado y el historial de service.

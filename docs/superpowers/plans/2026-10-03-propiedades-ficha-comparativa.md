# Fichas de propiedades: comparativa cerca — Implementation Plan

> Native execution (orden permanente: spec y plan auto-aprobados). Spec:
> `docs/superpowers/specs/2026-10-03-propiedades-ficha-comparativa-design.md`.

**Goal:** cada ficha de alquiler y de venta dice dónde cae su precio contra lo cercano, su $/m² y
qué conviene más cerca por la misma plata.

## Global Constraints
- Escalera de radios 1/2/3/5 km, mínimo 8 comparables (5 a 5 km); veredicto con ≥ 5.
- Sólo coordenada propia del aviso (alquiler: `rentalDistanceStages`; venta: `geo.precision`).
- Endpoint por clave, nunca acepta coordenadas del cliente; cache pública corta.
- Textos en es/en/pt, sin `|` en los mensajes.

## Review Focus
- Aviso sin coordenada: alcance barrio, sin distancias. Test Task 1.
- Venta en pesos: se compara en dólares. Test Task 1.
- Superficie del terreno en una casa: no entra al $/m². Test Task 1.
- Peers vacíos o lectura caída: el endpoint responde `insight: null`, la ficha sigue. Test Task 2.

### Task 1: `buildPropertyInsight` + guarda de $/m² de venta (pura, con tests)
`app/utils/propertyInsight.ts`, `app/utils/propertySalePricePerM2.ts`, tests.

### Task 2: cargadores y endpoints
`app/server/utils/propertyInsight.ts` (alquiler y venta), `app/server/api/property-insight/[operation]/[key].get.ts`, test con mocks.

### Task 3: componente y fichas
`app/components/property/PriceInsight.vue`, `app/utils/propertyInsightMessages.ts`, inserción en las dos fichas; lint, tests, dev contra datos reales, móvil y oscuro.

### Task 4: docs, merge y deploy
`docs/app/RENTALS.md` y `docs/app/PROPERTY_SALES.md`; revisión; push a main; medir producción.

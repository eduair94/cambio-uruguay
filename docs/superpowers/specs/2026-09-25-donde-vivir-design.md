# ¿Dónde vivir? — asesor para alquilar o comprar vivienda por barrio

Fecha: 2026-09-25. Pedido: "Hacer uno igual [que /que-auto-comprar-uruguay] pero para alquiler /
compra de vivienda (utilizando los datos relevantes del usuario en un formulario)."

## Entendimiento

- **Qué quiere la persona**: contestar un formulario corto sobre su hogar (qué busca, dónde, cuántos
  dormitorios, ingreso, ahorro, cómo compraría) y recibir una lista corta de **barrios** donde lo que
  necesita entra en su plata, con cuánto le va a salir por mes, cuánto necesita de entrada, si
  conviene más alquilar o comprar ahí, cómo es el barrio (denuncias, cortes de luz y agua, reclamos,
  servicios cerca) y un enlace a los avisos vigentes que cumplen.
- **Lo que ya existe y NO se duplica**: `/alquiler-ideal-uruguay` ordena AVISOS de alquiler por
  presupuesto y trayectos del hogar; `/barrios-alquileres-uruguay` compara barrios para alquilar sin
  la plata de la persona; `/comprar-o-alquilar-uruguay` es una calculadora con números que pone el
  lector. El asesor nuevo recomienda BARRIOS, cubre alquilar y comprar, y usa los datos del mercado
  que el sitio ya mide. Desde cada barrio manda al asesor de avisos y a los directorios.
- **Restricción de la casa**: cifras medidas, o de una fuente con fecha y enlace, o rotuladas como
  supuesto. Nada de "mejor barrio" absoluto: el orden sale de lo que la persona dice que le importa.

## Ruta y cableado

- `/donde-vivir-uruguay` (`app/pages/donde-vivir-uruguay.vue`). Indexable en su URL limpia; toda
  combinación de respuestas es `noindex, follow`.
- Familia vivienda: `analisis` del directorio de alquileres y del de venta (`app/utils/directorios.ts`),
  `siteNav` con i18n es/en/pt, hub de guías de vivienda, enlaces desde `/alquiler-ideal-uruguay`,
  `/barrios-alquileres-uruguay` y `/comprar-o-alquilar-uruguay`. Fila en `docs/seo/experiments.json`.

## Datos (sin job nuevo: todo ya se calcula a diario)

`GET /api/housing/advisor` junta, con caché de 10 min por departamento × tipo × dormitorios:

1. **Alquiler por barrio**: `loadRentalZones({department, propertyType, bedrooms})` (zonas de
   `propertyzonesnapshots`, últimos 10 días, n ≥ 8): alquiler, gastos comunes, total mensual y
   $/m² construido en pesos, más `utilities.official` (la zona oficial INE/UTE que mapea el barrio).
2. **Venta por barrio**: documentos `marketseries` `venta|USD|<tipo>|<dormitorios>|b:<depto>:<barrio>`
   (n ≥ 8, `latest`: p25/mediana/p75 y US$/m²). Las claves salen del índice `index:venta`.
3. **Cómo es el barrio**: `loadRentalZoneScores()` — para cada zona oficial, qué parte de las demás
   está peor en denuncias, luz, agua, saneamiento, limpieza, alumbrado y servicios (`betterThan`).
   Sólo Montevideo y zonas UTE tienen esta capa; donde falta, se dice.

La unión es por nombre de barrio plegado (sin tildes ni mayúsculas) dentro del departamento.

## Cifras curadas (`app/utils/housingAdvisorFigures.ts`, con fecha y fuente)

- **Garantías de alquiler** (guía de garantías, 2026-09-15): Contaduría y ANDA aceptan un alquiler de
  hasta el 40 % del ingreso nominal; Mapfre hasta el 30 % de los ingresos declarados (suma hasta 5
  personas). El 40 % es el techo de lo alcanzable; el 30 % se marca como "con Mapfre no alcanza".
- **Crédito hipotecario** (guía de crédito hipotecario, condiciones publicadas al 16/9/2026), dos
  perfiles reales, no promedios inventados:
  - BHU: UI, TEA desde 4,50 % ("Préstamo Soñado"), hasta 25 años, financia 90 %, cuota hasta 25 %
    del ingreso disponible (30 % con débito de haberes).
  - Banco privado — Santander público general: UI, TEA 4,75 % (11 a 30 años), hasta 20 años para el
    público general, financia 80 %, cuota hasta 35 %.
  - Contado: sin crédito.
  La cuota se calcula con la TEA convertida a tasa mensual efectiva, `(1+TEA)^(1/12) − 1`.
- **Gastos de compra**: ITP 2 % del comprador (DGI; sobre el valor real de Catastro, acá estimado
  sobre el precio, que suele ser mayor), escrituración 3 % a 5 % (referencia de mercado citada en la
  guía, no arancel), comisión inmobiliaria 3 % + IVA = 3,66 % (arancel de la Cámara Inmobiliaria,
  2007). Para saber hasta cuánto alcanza el ahorro se usa el extremo alto (10,66 %).
- **Gastos de entrada al alquilar**: comisión 1 mes + IVA (1,22 alquileres, mismo arancel) y el
  primer mes. La garantía se menciona por tipo con su costo publicado (3 % mensual en Contaduría y
  ANDA); las aseguradoras no publican precio y no se estima.
- **Lo que no se incluye y se dice**: contribución inmobiliaria (depende del aforo catastral, no hay
  tabla publicable), impuesto de Primaria (tramos 2026 no publicados), seguros del crédito,
  mantenimiento.

## Puntuación (`app/utils/housingAdvisor.ts`, pura)

Entrada desde la URL: `operacion` (alquilar | comprar | comparar), `departamento`, `tipo`
(apartamento | casa), `dormitorios` (0..4, 4 = 4 o más), `ingreso` (pesos, hogar, nominal),
`alquilerMax` (pesos, alquiler + gastos comunes, opcional), `ahorro` (US$), `credito` (bhu | banco |
contado), `plazo` (años), `prioridad` (hasta 3 de: precio, metros, seguridad, servicios, luz,
reclamos, inversion).

1. **Lo que alcanza**:
   - Alquilar: tope = `alquilerMax` si está; si no, 40 % del ingreso (garantías). El barrio entra si
     su mediana de total mensual (alquiler + gastos comunes; si falta el total, alquiler) entra en el
     tope; "negociando" si su p25 entra.
   - Comprar: precio máximo = mínimo entre lo que cubre el ahorro (anticipo + gastos de compra) y lo
     que permite la cuota tope sobre el ingreso con el perfil de crédito. El barrio entra si su
     mediana de venta entra; "negociando" si su p25 entra.
   - Comparar: entra si alcanza al menos una de las dos.
2. **Puntajes 0-1 relativos a los barrios que entran**: precio (del modo elegido), metros (US$/m² o
   $/m²), seguridad (`betterThan` de denuncias), servicios, luz y agua (promedio de luz y agua),
   reclamos (saneamiento, limpieza, alumbrado), inversión (rentabilidad bruta = alquiler × 12 /
   precio de venta en pesos). Lo que falta vale el punto medio y se dice. Pesos: 1, las prioridades 3.
3. **Alquilar o comprar en ese barrio** (cuando hay los dos datos): cuántos años de alquiler vale la
   vivienda; cuota del crédito + gastos comunes contra alquiler + gastos comunes; cuánto hay que
   poner de entrada en cada caso.
4. **Explicación**: 2-4 "por qué" y 1-3 "lo que resignás", cada uno con su número.
5. Hasta 8 barrios. Si ninguno entra: desde cuánto empieza a haber (alquiler o precio).

## Página

- Formulario a la izquierda (sticky), resultado a la derecha; en la URL. Arriba del resultado, la
  línea del hogar: "con $ X de ingreso, las garantías aceptan un alquiler de hasta $ Y; con US$ Z de
  ahorro y el BHU podés comprar hasta US$ W".
- Tarjeta por barrio: nombre, alquiler (mediana, rango, n), venta (mediana, US$/m², n), cuánto sale
  por mes y de entrada en cada modo, alquilar vs comprar, cómo es el barrio, por qué / lo que
  resignás, enlaces: ver alquileres (directorio filtrado), ver ventas (filtrado), evolución de precios,
  asesor de avisos de alquiler.
- Antes de firmar (alquiler y compra), cómo se calcula, FAQ, `AssistantCta topic="hogar"`.

## Pruebas

- `app/tests/unit/housingAdvisor.test.ts`: normalización de la URL; tope de alquiler por garantía;
  precio máximo por ahorro y por cuota (números exactos); filtros; puntajes y prioridades;
  faltantes neutros; alquilar vs comprar; mínimo cuando nada entra; cada razón con número.
- `app/tests/unit/housingAdvisorFigures.test.ts`: toda cifra con fecha, fuente https; cuota del
  sistema francés con TEA → tasa mensual efectiva contra un caso calculado a mano.
- `app/tests/unit/housingAdvisorJoin.test.ts`: la unión de barrios (tildes, mayúsculas, alias).
- Los contratos de SEO del sitio (`seoContract`, `seoTitleBudget`, `seoDescriptionBudget`,
  `siteNav-coverage`, `familiaNav`, `temaIndex`, `experiments_routes`) y el lint del app.
- Verificación real: el endpoint en dev contra la Mongo local con los documentos reales copiados del
  VPS, cuatro perfiles leídos a mano, y la página en producción después del deploy.

## Lo que NO se afirma

- Cuál es el mejor barrio: es el que mejor cumple lo que la persona marcó, con los avisos de hoy.
- Precio de cierre, tasación, contribución inmobiliaria, seguros del crédito.
- Que un barrio sea seguro: las denuncias son registros policiales, no riesgo individual.

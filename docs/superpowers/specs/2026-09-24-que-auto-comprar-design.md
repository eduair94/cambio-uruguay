# ¿Qué auto usado comprar? — asesor del auto ideal

Fecha: 2026-09-24. Pedido: "crear página vinculada al directorio de autos usados para que por medio de
completado de datos puedas asesorar a una persona a encontrar el auto ideal. Tener en cuenta
repuestos, patente y toda la información que puedas considerar para tomar la mejor decisión
posible."

## Entendimiento

- **Qué quiere la persona**: contestar un formulario corto (presupuesto, uso, kilómetros, cuántos
  viajan, caja, combustible, carrocería, qué le importa más) y recibir una lista corta de modelo +
  año concretos que puede comprar hoy, con el por qué, lo que resigna y cuánto le va a costar
  tenerlo por mes — y un enlace a los avisos vigentes que cumplen.
- **Lo que pidió explícitamente**: repuestos y patente. **Lo que agregamos por "toda la
  información"**: consumo y combustible, depreciación (reventa), seguro obligatorio, mantenimiento,
  seguridad (Latin NCAP + equipamiento de la ficha), espacio (plazas, baúl, largo), liquidez (cuántos
  avisos hay), riesgo declarado, y la lista de qué revisar antes de señar.
- **Restricción de la casa**: todo número sale medido, de una norma con fecha y enlace, o rotulado
  como supuesto del sitio. Nada de "estrellas" inventadas ni patentes exactas presentadas como tales.
  El análisis pesado se precalcula en un job (regla "análisis periódico, no en el pedido"); por
  pedido sólo se puntúa una tabla chica en memoria.

## Ruta y cableado

- `/que-auto-comprar-uruguay` (`app/pages/que-auto-comprar-uruguay.vue`). Indexable en su URL limpia;
  toda combinación de respuestas (query string) sale `noindex, follow`, igual que el tasador.
- Familia vehículos: entra en `analisis` del directorio de autos (`app/utils/directorios.ts`), en
  `siteNav` (grupo de autos, con i18n es/en/pt), en el hub de guías de autos (`guideHubs.ts`
  resources), y el directorio `/autos-usados-uruguay` y el informe enlazan a la página.
- Fila nueva en `docs/seo/experiments.json` en el mismo commit que publica la página.

## Datos

### 1. Snapshot del asesor (nuevo, `caradvisorsnapshots`, un documento `key: "used"`)

Lo arma `classes/autos/advisor.ts::buildCarAdvisor()` en la misma corrida que el informe
(`sync_autos.ts`, diaria y horaria), sobre los mismos avisos comparables (`reportable`). Una fila
por modelo con al menos `minimumAdverts` (12) avisos:

- identidad (`marketSlug`, marca, modelo, slugs), avisos, vendedores distintos;
- **variantes** = combustible × caja con ≥ 6 avisos; por variante, las filas por año con ≥ 3 avisos
  (p25/mediana/p75 en US$, km mediano, n) y el **consumo mediano** en L/100 km (declarado o estimado
  por modelo, con la proporción declarada) — la variante existe porque un Corolla híbrido automático
  y un Corolla nafta manual no cuestan lo mismo ni consumen lo mismo, y el precio de la patente de un
  eléctrico es otro;
- carrocería dominante y su proporción; de las fichas con tabla técnica: plazas, baúl, largo y
  potencia medianos, proporción 4x4/integral, y proporción que declara ABS, airbags frontales,
  control de estabilidad e ISOFIX (sí/(sí+no), con el n);
- caída anual (`annualDropOf` sobre `depreciationOf`, la misma recta del informe, para todos los
  modelos y no sólo los 40 del informe), proporción de automotora y de riesgo declarado;
- **repuestos** (ver 2), copiados del último relevamiento del modelo.

### 2. Canasta de repuestos (nuevo job `currency-autos-parts`, `sync_autos_parts.ts`)

Mide en Mercado Libre Uruguay (mismo puente `:9656`, una búsqueda por pieza y modelo, filtrada por
la categoría de la pieza) seis piezas que resumen el costo de mantener y reparar un auto:

| pieza | categoría ML |
|---|---|
| pastillas de freno delanteras | MLU62414 |
| filtro de aceite | MLU164783 |
| amortiguador delantero (unidad) | MLU164832 |
| kit de embrague | MLU164977 |
| kit de distribución | MLU164771 |
| óptica / farol delantero (unidad) | MLU442928 |

Verificado a mano el 2026-09-24 contra el puente: las seis categorías devuelven 50 resultados por
página para modelos populares y raros (C4 Cactus, Up!, Hilux).

- **Coincidencia**: la oferta cuenta sólo si su título nombra el modelo como palabra entera (todas
  sus palabras distintivas: "C4 Cactus" exige las dos, y "C4 06-" no cuenta) y, si la palabra del
  modelo tiene 3 letras o menos ("Up", "C3", "208", "Gol"), también la marca o un alias ("VW",
  "GM"). Se excluyen traseras en pastillas y amortiguadores, y "par/x2/kit/juego" donde el precio
  es por unidad. Moneda: UYU; lo publicado en dólares se convierte con la cotización de la corrida.
- Por pieza y modelo: mediana, p25, p75, ofertas coincidentes y vendedores distintos. Mínimo 3
  ofertas para que la pieza cuente.
- **Índice**: para cada pieza, la mediana del modelo dividida por la mediana de todos los modelos;
  el índice del modelo es la media geométrica de esas razones con ≥ 3 piezas medidas (canasta
  emparejada: nunca se compara un total al que le faltan piezas). "1,18" = 18 % más caro que el
  modelo típico.
- **Disponibilidad**: ofertas coincidentes sumadas en las seis piezas. Se publica como lo que es:
  "avisos de repuestos en Mercado Libre", no el stock de las casas de repuestos.
- Ritmo: diario a las 02:11 UTC (ningún consumidor horario del puente entre :07 y :23), tope de
  reloj 10 min y 2 s entre pedidos, releyendo lo más viejo primero y nunca un modelo leído hace menos
  de 7 días. La cola la arma la lista de modelos del último snapshot del asesor (o del catálogo si no
  hay). APP DB privada `carpartsprices` (un documento por modelo) + meta en `carharvestmetas`
  (`uy-cars-parts`). Un 429/fallo de puente 3 veces seguidas corta la corrida sin escribir basura.
- `--dry-run --models=<slug,slug>` imprime filas de ejemplo sin escribir.

### 3. Cifras curadas (app, con fecha y fuente)

`app/utils/carAdvisorFigures.ts`:

- **Patente** (Texto Ordenado del SUCIVE 2026, leído del PDF el 2026-09-24): usados 4,5 % del valor
  de mercado; eléctricos usados 2,25 % del valor sin IVA; piso $ 8.770,10 (banda 1986-1991) para
  modelos 1992+; dólar del SUCIVE $ 41,826 (art. 8); bonificación 20 % pagando el año entero con la
  primera cuota o 10 % pagando cada cuota en fecha, no acumulables (art. 31). Sin alícuota propia
  para híbridos: se estiman con la general y la página lo dice. El valor de mercado oficial (aforo)
  no se publica por modelo: se estima con la mediana pedida y se enlaza la consulta por matrícula.
- **SOA**: prima promedio del BCU 2026-2027 ($ 7.238), reutilizada de `transportAssumptions.ts`
  con su nota: es un promedio de mercado, no una tarifa.
- **Mantenimiento**: el supuesto del comparador de transporte ($ 12.000 fijos + $ 2/km),
  con la parte por km escalada por el índice de repuestos del modelo. Rotulado como supuesto.
- **Combustible**: precios vigentes de ANCAP (`/api/combustibles`: Súper 95, Gasoil 50-S);
  eléctricos al escalón 101-600 kWh de UTE con IVA y 16 kWh/100 km (supuesto rotulado).
- **Latin NCAP**: tabla curada sólo con resultados verificados en latinncap.com (modelo, año de
  ensayo, protocolo, estrellas, años a los que aplica, enlace). Un modelo sin ensayo verificado no
  lleva estrellas, y la página dice "sin ensayo Latin NCAP que aplique" — nunca un cero.

## Puntuación (`app/utils/carAdvisor.ts`, pura, corre en el servidor por pedido)

Entrada normalizada desde la URL (`presupuesto`, `uso`, `kmAnio`, `personas`, `caja`, `combustible`,
`carroceria`, `prioridades`, `gastoMes`). Salida: hasta 8 recomendaciones.

1. **Candidato** por variante: el año MÁS NUEVO cuya mediana entra en el presupuesto (y, como
   alternativa, el año siguiente si su p25 entra: "con suerte o negociando").
2. **Filtros duros**: caja, combustibles aceptados, carrocerías aceptadas, plazas ≥ personas cuando
   el dato existe (sin dato no descarta, avisa), uso "carga" o "campo" exige pick-up/furgón/rural o
   SUV con 4x4 según el caso, GNC fuera.
3. **Costo anual de tenerlo** = combustible (consumo × km/año × precio) + patente estimada + SOA +
   mantenimiento + depreciación (caída anual del modelo × precio; si el modelo no tiene curva, la
   típica del mercado, rotulada). Mensual = anual / 12.
4. **Puntajes 0-1** relativos al conjunto de candidatos: antigüedad y km (más auto por la plata),
   costo mensual, reventa (caída anual) y liquidez (avisos), repuestos (índice y disponibilidad),
   seguridad (Latin NCAP si aplica al año + proporción ESC/airbags), espacio y ajuste al uso (plazas,
   baúl, largo en ciudad, potencia en ruta). Un dato faltante vale el punto medio y se avisa.
5. **Pesos**: base 1 para todo; las prioridades elegidas (hasta 3) valen 3. Si hay gasto mensual
   máximo, lo que lo supera baja al final con el aviso "se pasa de tu gasto".
6. **Diversidad**: como mucho una variante por modelo en la lista final (la mejor).
7. **Explicación**: 2-4 "por qué" y 1-3 "lo que resignás", generados desde los números del propio
   candidato (nunca texto fijo), cada uno con su cifra.

## Página

- Formulario a la izquierda (sticky en desktop), resultado a la derecha; en celular, formulario
  arriba. La respuesta vive en la URL (se comparte y abre calculada desde SSR).
- Cada tarjeta: modelo, año, combustible y caja; rango de precio y n de avisos; costo mensual con
  desglose (combustible, patente, SOA, mantenimiento, depreciación); repuestos (índice y la pieza más
  cara/barata); seguridad; por qué / lo que resignás; enlaces a "ver N avisos" (directorio filtrado:
  marca, modelo, años, caja, combustible, precio máximo, sin riesgo declarado), "precios año por
  año" y "tasar este auto".
- Bloque "Antes de señar" (checklist con enlaces oficiales: deuda y multas SUCIVE, título y
  gravámenes en Registros, ITV en Montevideo, precio contado vs entrega, chapa extranjera).
- "Cómo se calcula" + FAQ (patente, repuestos, estrellas, por qué no hay "el mejor auto").
- `AssistantCta` con la pregunta armada desde las respuestas.
- Estado vacío: explica qué hace y muestra tres perfiles de ejemplo (enlaces con query).
- Sin datos (snapshot ausente): aviso y enlace al directorio; nunca un 500.

## API

`GET /api/cars/advisor?…` → `{ generatedAt, usdUyu, fuel: {asOf, super95, gasoil50s}, query,
results: CarAdvisorResult[], considered, excluded: {reason, count}[] }`. Snapshot cacheado 10 min en
memoria; respuesta `public, max-age=300, s-maxage=900`; 503 con `no-store` si no hay snapshot.

## Pruebas

- Raíz (`tests/autos/`): `advisor.test.ts` (variantes, años con n≥3, consumo, seguridad sí/no,
  umbrales), `parts.test.ts` (coincidencia de título: "208" no es "2008", "C4" no es "C4 Cactus",
  traseras fuera, índice emparejado, mínimos), contrato de tipos públicos
  (`tests/autos/contracts.test.ts` ya compara las dos copias).
- App (`app/tests/unit/`): `carAdvisor.test.ts` (candidato por presupuesto, filtros duros, costos
  con cifras conocidas, patente con piso y eléctrico, pesos, diversidad, explicaciones con cifra),
  `carAdvisorFigures.test.ts` (toda cifra con fecha/fuente/URL; Latin NCAP con URL de latinncap.com),
  `siteNav-coverage`, `seoContract` (noindex con query), `familiaNav`, `experiments_routes`.
- Verificación real: dry-run del job de repuestos y de `sync_autos` en el VPS con filas de ejemplo
  leídas a mano; la página en dev con el snapshot real copiado a la Mongo local; y en producción
  después del deploy.

## Lo que NO se afirma

- Que el modelo recomendado sea "el mejor": es el que mejor cumple lo que la persona dijo que le
  importa, con los datos de hoy.
- La patente exacta (aforo por matrícula), el precio al que se cierra, la confiabilidad mecánica
  (nadie publica tasas de falla por modelo en Uruguay), el seguro todo riesgo (se cotiza).
- Estrellas Latin NCAP fuera del rango de años que el ensayo cubre.

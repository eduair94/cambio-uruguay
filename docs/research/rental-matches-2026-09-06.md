# Auditoría de identidad de alquileres — 6 de septiembre de 2026

## Alcance y resultado observado

Lectura **sin escrituras**, a **2026-09-06 03:52:02.247 UTC**, de la base APP remota de
producción mediante `gsearch` y su `APP_MONGO_URI` explícita. La copia histórica local de
`app/.env` no intervino. Se proyectaron todas las pertenencias de avisos y sus evidencias físicas
originales; no se consultaron datos de contacto ni se hizo una nueva cosecha de portales.

| Medida del almacenamiento completo | Resultado |
|---|---:|
| Filas almacenadas | 26.692 |
| Identificadores de aviso distintos | 26.692 |
| Avisos con más de un dueño | 0 |
| Filas con más de una oferta | 0 |
| Ofertas con evidencia `identity.version: 1` utilizable | 16.518 |
| Ofertas legacy o sin evidencia física completa | 10.174 |
| Pares negativos históricos que conservan dueños separados | 10 de 10 |

Son cifras del almacenamiento, **no de resultados vigentes ni de viviendas distintas**.
En particular, una vivienda republicada puede seguir apareciendo en más de una tarjeta si no
hay identificación suficiente de la unidad. Que actualmente no existan grupos de varios avisos
evita mezclas entre ofertas almacenadas; no demuestra la exactitud de cada anuncio.

La comparación con la captura independiente del **2026-09-05 08:04:40.317 UTC** conserva los
**25.050 IDs anteriores** y encuentra **1.642 IDs adicionales**, sin ausencias. No se extrapola
esta conservación a corridas futuras ni a otras fuentes fuera del índice.

| Fuente | Avisos almacenados |
|---|---:|
| InfoCasas | 11.728 |
| Mercado Libre | 9.068 |
| Casasweb | 2.635 |
| Facebook Marketplace | 2.080 |
| Inmuebles El País | 1.181 |

El metadato vigente era el repaso horario de **03:47:20.894 UTC**, con 1.748 avisos leídos,
incluidos 1.112 de El País. El recuento de una corrida es distinto del inventario almacenado.
El País ya se importa con la autorización del operador documentada en `docs/app/RENTALS.md`;
esta auditoría no cambia ni revoca esa integración.

## Casos negativos y anomalías de un solo aviso

Los diez pares del manifiesto del 5 de septiembre siguen en fichas separadas: Gabriel Pereira
(tres pares), Plutarco, los dos grupos de Ventura Tower C, Gaboto, 18 de Julio, el grupo legado
de Marketplace y San Luis. En San Luis, `infocasas:194165703` conserva
`canelones-san-luis-rincon-14titov`; `infocasas:194171253` conserva
`canelones-san-luis-rincon-14titov-1rznx01`. **El cierre de San Luis está verificado** por esta
lectura, además de la comprobación posterior a la reparación del día anterior.

El detector conservador de contradicciones marca **697 avisos individuales**: 261 de InfoCasas,
278 de Mercado Libre, 89 de Casasweb, 16 de Marketplace y 53 de El País. Incluye diferencias
entre título y atributos, ambigüedades de tipo, designaciones de unidad y plazos temporales.
**No son 697 matches falsos ni 697 errores confirmados del portal**. Por ejemplo, un título
puede indicar cinco dormitorios y el campo estructurado representar una categoría «cuatro o
más» como `4`; un dúplex puede describir más de un piso. Esas señales justifican confirmar
datos y rechazar una unión, no sobrescribir automáticamente la información.

## Cambios preventivos asociados

- La descripción original saneada, conservada por oferta, puede **vetar** una unión por
  contradicciones de dormitorios, baños, unidad, piso, torre o posición dentro de un conjunto.
  No se usa como prueba positiva de identidad ni se copia desde otra oferta. «Segundo de cuatro
  apartamentos» y «cuarto de cuatro apartamentos», el caso real de San Luis, se distinguen como
  posiciones; no se inventan números registrales a partir de esos ordinales.
- Una dirección marcada por el publicador como oculta no autoriza una coincidencia exacta.
- Fuera de Montevideo se requiere además una **localidad original explícita compartida**.
  Departamento, barrio «Centro» y coordenadas aproximadas no identifican la ciudad. La
  localidad no se deduce del barrio ni se completa para registros legacy.
- Coordenadas originales separadas por más de un kilómetro vetan la unión. La proximidad por
  sí sola nunca la autoriza; dos marcadores del mismo edificio pueden ser unidades distintas.
- Expresiones como «apartamento 100% reciclado» no se interpretan como unidad 100.
- Las ofertas nuevas conservan su propio detalle público y su descripción/localidad privadas.
  La reconstrucción histórica recupera sólo esa evidencia propia y conserva fechas y avisos.

No se preparó ni aplicó una nueva reparación masiva: no hay grupos múltiples actuales que
separar. El cambio afecta la admisión de futuras uniones y la revalidación de ofertas guardadas.
Las condiciones exactas de dirección, unidad explícita y atributos compatibles siguen vigentes.

## Evidencia reproducible

Los artefactos privados de trabajo están ignorados por Git:

- `.sdd-rental-identity-sep6-read.cjs`: consulta con proyección explícita, tiempo máximo,
  conexión aislada y cierre en `finally`.
- `.sdd-rental-identity-sep6-snapshot.json`: captura original de las 26.692 filas.
  SHA-256 `a921c4ca60f26c55ea2faff9b7a601cbee5865e1dcd21efe01da3fc96d2d7242`.
- `.sdd-rental-identity-sep6-analyze.cjs` y `.sdd-rental-identity-sep6-analysis.json`:
  comprobación de IDs, los diez pares históricos y señales conservadoras por oferta.

Pruebas asociadas: descripciones contradictorias y coherentes, descripción sin valor positivo
de identidad, ordinales de San Luis, porcentajes, direcciones ocultas, localidades distintas,
coordenadas y preservación de evidencia propia al guardar/revalidar. El informe documenta una
auditoría fechada y límites concretos; no certifica ausencia absoluta de errores del anunciante.

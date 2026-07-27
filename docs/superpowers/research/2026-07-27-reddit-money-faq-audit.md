# Auditoría de dudas de dinero en Reddit Uruguay y cobertura del sitio

Fecha de revisión: **2026-07-27**

## Resultado

Se amplió `/preguntas-economia-personal` de una lista breve y sin citas a un catálogo central de
**94 preguntas**, **15 categorías** y **54 fuentes primarias u oficiales**. Aduana e importaciones
se mantienen en su catálogo especializado de 94 preguntas y alquileres conserva su guía de 46
preguntas; el centro general las enlaza para evitar duplicar o contradecir reglas detalladas.

Reddit se usa para descubrir dudas, vocabulario y huecos de cobertura. No se usa como fuente de
hechos, cifras, derecho ni recomendaciones.

## Alcance

La taxonomía pública de `/temas-de-dinero-reddit` contiene 15 temas. El trabajo anterior cubrió
`compras-import`; esta auditoría cubre los 14 restantes y agrega `fundamentos` para preguntas
transversales de presupuesto y organización personal. La ampliación de `r/LegalUruguay` añadió
`derechos-reclamos`, limitado a consumo, cobranzas, trabajo y acceso a orientación jurídica que
sí conectan con los temas del sitio.

| Categoría | Preguntas verificadas |
|---|---:|
| Organización personal | 5 |
| Dólar y cambio | 5 |
| Ahorro e inversión | 8 |
| Alquiler y vivienda | 5 |
| Deudas y clearing | 7 |
| Créditos y préstamos | 6 |
| Tarjetas y pagos | 6 |
| Bancos y fintech | 7 |
| Derechos y reclamos | 6 |
| Impuestos | 8 |
| Sueldo y trabajo | 6 |
| Precios e inflación | 5 |
| Emprender y empresa | 8 |
| Jubilación y AFAP | 6 |
| Criptoactivos | 6 |
| **Total** | **94** |

## Método

1. Inventariar la navegación pública, páginas temáticas, FAQ existentes y la taxonomía de Reddit.
2. Medir el corpus compartido en MongoDB antes del refresco.
3. Buscar publicaciones con todas las consultas declaradas por la taxonomía, en `r/uruguay`,
   `r/UruguayFinanzas`, `r/Burises`, `r/Montevideo` y `r/LegalUruguay`.
4. Deduplicar por `redditId` y clasificar con reglas deterministas. El conteo no depende de IA.
5. Usar los títulos como fuente preferida de ejemplos: una mención incidental en el cuerpo ya no
   puede desplazar una consulta cuyo título sí trata el tema.
6. Contrastar cada respuesta con el organismo competente. Si una fuente no permite una respuesta
   única, marcar `zona-gris` en lugar de completar el hueco por analogía.
7. Ejecutar pruebas de integridad: categorías completas, IDs únicos, respuestas sustantivas,
   fuentes existentes, enlaces HTTPS, rutas internas y hechos de mayor riesgo fijados por tests.

### Límites del corpus de Reddit

- La API de búsqueda de Reddit no garantiza exhaustividad histórica ni reproducibilidad exacta.
- Cada búsqueda guarda hasta los 100 resultados más nuevos por consulta y subreddit en un
  backfill. Las consultas se solapan y los documentos se deduplican.
- Publicaciones borradas, privadas, no indexadas o fuera de los subreddits definidos no aparecen.
- El volumen de un tema indica presencia en el corpus, no prevalencia estadística de toda la
  población uruguaya.
- Los ejemplos de hilos enlazan a Reddit para contexto, pero ninguna respuesta hereda como verdad
  lo dicho por usuarios.

## Estado del corpus antes del refresco

Medición en la base de la app:

- `redditposts`: **1.841**
- `redditcomments`: **2.164**
- `reddittopics`: **14**
- última instantánea temática: **2026-07-18**

## Estado del corpus después del refresco

El backfill `window=all` terminó correctamente usando las credenciales de Reddit del entorno:

- búsquedas ejecutadas: **360** (72 consultas × 5 subreddits)
- publicaciones únicas observadas en el pase: **5.556**
- operaciones idempotentes de actualización/inserción: **5.556**
- `redditposts` después del pase: **5.876** (**+4.035** respecto de la medición inicial)
- `redditcomments`: **2.164** (sin cambios; este proceso no descarga comentarios)
- publicaciones de los últimos 365 días usadas al clasificar: **2.853**
- instantáneas temáticas publicadas: **14**
- fecha final de publicación: **2026-07-27T07:08:19.896Z**

Los conteos de temas se superponen: una pregunta sobre IRPF de un alquiler puede pertenecer a
`impuestos` y `alquiler-vivienda`. Por eso no deben sumarse como si fueran publicaciones únicas.

| Tema Reddit | Total en 365 días | Últimos 90 días |
|---|---:|---:|
| Ahorro e inversión | 289 | 96 |
| Alquiler y vivienda | 333 | 86 |
| Bancos y fintech | 403 | 114 |
| Compras e importación | 345 | 101 |
| Créditos y préstamos | 160 | 46 |
| Cripto | 23 | 6 |
| Deudas y clearing | 46 | 15 |
| Dólar y cambio | 27 | 6 |
| Emprender y empresa | 102 | 29 |
| Impuestos | 308 | 96 |
| Jubilación y AFAP | 37 | 16 |
| Precios e inflación | 46 | 23 |
| Sueldo y trabajo | 45 | 5 |
| Tarjetas | 146 | 37 |

La revisión visual de los ejemplos publicados detectó y corrigió cuatro ambigüedades antes de
cerrar el pase:

- una noticia de renta “financiera” ya no se clasifica como préstamo;
- una casa expresada en dólares ya no se clasifica como duda de tipo de cambio;
- una franquicia de entretenimiento ya no se clasifica como franquicia aduanera;
- Apple Wallet ya no se clasifica como billetera cripto.

Después de ajustar las reglas se republicaron las 14 instantáneas con `harvest=false`, es decir,
sin volver a consumir la API ni alterar el corpus.

## Ampliación focalizada: r/LegalUruguay

Se verificó que la comunidad correcta y activa es
[`r/LegalUruguay`](https://www.reddit.com/r/LegalUruguay/). Ya figuraba nominalmente entre los
subreddits del cosechador, pero las consultas generales de finanzas no encontraban de forma
consistente servicios incumplidos, cobranzas, conflictos laborales ni pedidos de orientación
jurídica.

La revisión previa encontró **121 publicaciones** guardadas de ese subreddit, **86** dentro de los
últimos 365 días. Se añadieron nueve búsquedas explícitas:

- `defensa consumidor`
- `servicio no prestado`
- `clausula abusiva`
- `reclamo laboral`
- `salario impago`
- `despido liquidacion`
- `estudio cobranza`
- `abogado gratis`
- `defensor publico`

El endpoint admite ahora `scope=legal`, que ejecuta solo esas búsquedas contra `r/LegalUruguay`.
El pase focalizado, realizado con las credenciales de la API de Reddit del entorno, produjo:

- búsquedas ejecutadas: **9**
- publicaciones únicas observadas: **3**
- operaciones idempotentes: **3**
- publicaciones de `r/LegalUruguay` después del pase: **123** (**88** del último año)
- `redditposts` total: **5.878**
- publicaciones del último año reclasificadas: **2.855**
- instantáneas temáticas publicadas: **15**
- fecha final: **2026-07-27T07:51:51.472Z**

La categoría pública `derechos-reclamos` detectó **12 casos** en el corpus anual, **2** de los
últimos 90 días. Sus ejemplos publicados provienen de `r/LegalUruguay`.

### Casos que sí aborda el sitio

| Caso observado | Cobertura |
|---|---|
| Servicio pagado y no prestado | Nueva FAQ sobre las opciones del art. 33 de la Ley 17.250 y enlace a la guía de consumo |
| Duda entre consulta, reclamo y denuncia | Nueva FAQ que distingue mediación, sanción y finalidad del trámite |
| Empresa de cobranza sin detalle del saldo | Nueva FAQ para verificar acreedor, pedir conceptos e imputación y escalar el reclamo |
| “Bancarrota” por deudas personales | Nueva FAQ que evita aplicar automáticamente la Ley 18.387 a cualquier consumidor |
| Sueldo impago, despido o liquidación | Nueva FAQ con el servicio gratuito y no vinculante del MTSS |
| No poder pagar abogado | Nueva FAQ con requisitos socioeconómicos y directorio de Defensorías Públicas |
| Problemas graves de alquiler y reparaciones | Guía y FAQ especializada de alquiler, ya existentes |
| Cuenta bloqueada, transferencia o fraude | FAQ de bancos, guía de estafas y procedimiento formal de reclamo |

No se fuerza cobertura para sucesiones, familia, penal, tránsito u otros litigios ajenos al foco
económico del sitio. En esos casos, una respuesta genérica podría ocultar plazos, competencia o
hechos decisivos; la página solo orienta hacia asistencia profesional oficial.

## Correcciones de alto riesgo

### Clearing y Central de Riesgos no son la misma base

- La permanencia del dato comercial impago surge del
  [artículo 22 de la Ley 18.331](https://www.impo.com.uy/bases/leyes/18331-2008/22):
  cinco años y una única reinscripción por otros cinco si sigue impago.
- Pagar no elimina inmediatamente el registro: el acreedor tiene cinco días hábiles para
  comunicar la cancelación y la base tres días hábiles desde que recibe la comunicación. El dato
  puede seguir visible, identificado como cancelado, hasta el plazo legal.
- La [Central de Riesgos del BCU](https://usuariofinanciero.bcu.gub.uy/creditos-y-prestamos/el-contrato/)
  se actualiza mensualmente. Cancelar elimina el saldo vigente cuando se publica el período
  correspondiente, pero no borra los meses históricos.

### Cripto: cambió el estado regulatorio en julio de 2026

- La [Ley 20.345](https://www.impo.com.uy/bases/leyes/20345-2024) incorporó determinados
  proveedores de servicios de activos virtuales al perímetro del BCU.
- El BCU [aprobó el marco para PSAV el 22 de julio de 2026](https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=527&title=El-BCU-aprueba-normativa-para-proveedores-de-servicios-de-activos-virtuales).
  Por eso ya no es correcto responder de forma general que “cripto no está regulada”.
- La regulación de un proveedor no transforma al activo en moneda de curso legal, no garantiza
  rentabilidad y no elimina riesgo de precio, fraude o pérdida de claves.
- No se publicó una tasa tributaria automática para toda compraventa, staking o pago con cripto.
  Esa pregunta queda marcada como `zona-gris` y remite a consulta específica, sin inventar una
  regla.

### Cifras y reglas con fecha

- Salario Mínimo Nacional: **$25.383 desde el 1.º de julio de 2026**, según
  [MTSS](https://www.gub.uy/ministerio-trabajo-seguridad-social/comunicacion/noticias/salario-minimo-nacional-24572-desde-1o-enero-2026).
- BPC 2026: la respuesta remite al
  [valor publicado por DGI](https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/base-prestaciones-contribuciones-bpc)
  y evita reutilizar montos de años anteriores.
- Rentas de capital del exterior: se distingue el régimen 2026 del tratamiento histórico y se
  cita el [Decreto 95/026](https://www.impo.com.uy/bases/decretos/95-2026).
- Cobertura COPAB: se explica por persona y por institución, separando moneda nacional y
  extranjera, con enlace a la
  [cobertura vigente](https://www.copab.org.uy/innovaportal/v/76/1/web/hasta-que-monto-estan-cubiertos-los-depositos.html).

### Reclamos, insolvencia y acceso a orientación

- El trámite de
  [Defensa del Consumidor](https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor)
  distingue consulta, reclamo por mediación y denuncia con finalidad sancionatoria. Una denuncia
  no se presenta como vía para obtener compensación individual.
- Ante incumplimiento del proveedor, el
  [artículo 33 de la Ley 17.250](https://www.impo.com.uy/bases/leyes/17250-2000/33)
  permite elegir entre cumplimiento cuando sea posible, equivalente o resolución con restitución;
  no se etiqueta todo incumplimiento comercial como delito.
- El
  [artículo 2 de la Ley 18.387](https://www.impo.com.uy/bases/leyes/18387-2008/2)
  comprende a la persona física que realiza actividad empresaria y remite a otro régimen para las
  personas físicas no comprendidas. La FAQ no promete un borrado automático de deudas de consumo.
- El [MTSS](https://www.gub.uy/tramites/consulta-laboral-salarial?min=true) ofrece consulta laboral
  y salarial gratuita, pero su respuesta o liquidación no es vinculante.
- El Poder Judicial explica los requisitos socioeconómicos para acceder a defensor público y
  publica el
  [directorio de Defensorías Públicas](https://www.poderjudicial.gub.uy/institucional/defensorias-publicas).

## Autoridades utilizadas

Las 54 referencias pertenecen a BCU, COPAB, DGI, BPS, MTSS, INE, IMPO, MEF/Defensa del
Consumidor, Poder Judicial, ANV, CGN y BHU. En la interfaz cada respuesta muestra únicamente las
fuentes que la respaldan; el índice final permite auditarlas sin abrir todas las preguntas.

## Decisiones de producto

- La búsqueda contempla pregunta, respuesta, resumen y etiquetas, sin distinguir tildes.
- Los filtros usan los mismos IDs que la taxonomía de Reddit.
- Cada respuesta declara una base: `norma`, `procedimiento`, `dato-oficial`, `criterio` o
  `zona-gris`.
- Las respuestas de criterio no se presentan como obligación legal.
- Las cifras incluyen fecha o remiten al valor oficial en vez de quedar como constantes sin
  contexto.
- El marcado `FAQPage` y la descripción SEO salen del mismo catálogo para evitar divergencia entre
  lo visible y los datos estructurados.

## Archivos principales

- `app/utils/personalFinanceFaq.ts`
- `app/pages/preguntas-economia-personal.vue`
- `app/utils/redditTopics.ts`
- `app/server/utils/redditTopicsStore.ts`
- `app/server/api/reddit-topics/refresh.post.ts`
- `app/tests/unit/personalFinanceFaq.test.ts`
- `app/tests/unit/redditTopics.test.ts`

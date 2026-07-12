# Investigación: normas y procedimientos por bucket — `/problemas-con-la-aduana-uruguay`

**Fecha:** 2026-07-12
**Estado:** verificado contra fuentes primarias (IMPO / Aduanas / URSEC / MEF)
**Para:** Task 2 (`baseline.ts`) y siguientes. **Nada puede escribirse en código que no esté en este documento con norma + artículo + URL oficial.**

---

## 0. Cómo leer este documento

Cada hecho tiene: **norma + artículo + URL oficial verificada (HTTP 200 el 2026-07-12)**.

Lo que **no** pudimos verificar está en §7 (*Unverified — do not publish*). Un bucket sin procedimiento verificable
sale con `verified: false` y **sin pasos**. La página dice "no lo pudimos verificar". Eso es un resultado correcto.

### 0.1 Base de verdad heredada

Los **montos** del régimen ya fueron verificados adversarialmente el 2026-07-11 y viven en
`app/utils/importRules.ts`. **No se re-derivan acá.** Este documento los cita y los extiende con
*procedimiento*, *plazos*, *organismo* y *documento*.

### 0.2 Fuentes envenenadas — NO CITAR

| Fuente | Por qué |
|---|---|
| `aduanas.gub.uy/innovaportal/v/27950` ("Encomiendas Postales") | Sigue publicando el **Decreto 356/014, DEROGADO** (mínimo USD 10, tope USD 200 por envío). Deroga expresa: Decreto 50/026 art. 19. |
| `aduanas.gub.uy/innovaportal/v/25087` y `v/25088` (fecha 26/04/2023) | El **procedimiento y la lista de documentos siguen siendo correctos** y coinciden con la página 2026 (v/28225). Pero su párrafo de **abandono** ("más de 30 días desde la notificación de su arribo… ante el juzgado competente") es **pre-2026** y contradice el régimen vigente (Ley 20.446 art. 631 + Decreto 50/026 art. 14: 30 días desde el **ingreso al país** si hay incumplimiento, 90 días desde el ingreso si no se retira, y lo declara la **DNA** por vía administrativa). **No usar ese párrafo.** |
| Cualquier página que repita "USD 10" o "USD 200 por envío" como tope de franquicia | Régimen derogado. El único "USD 200" vigente es el umbral **TIFA** de exoneración de IVA para EE.UU. |

**RG DNA 09/2026 es un PDF escaneado sin capa de texto** (8 páginas, 0 caracteres extraíbles).
`pdftotext` y `WebFetch` devuelven vacío. Se leyó **renderizándolo a imágenes** (PyMuPDF, 170 dpi).
"Busqué y no encontré nada" **no** es evidencia de ausencia en este documento.

### 0.3 Corpus de evidencia (r/uruguay, 1161 hilos)

Los 12 buckets están respaldados por el corpus. Conteo por keyword (grounding, no clasificación final —
esa la hace la IA en Task 4):

| bucket | hilos | bucket | hilos |
|---|---|---|---|
| `supera-monto` | 315 | `retenido` | 123 |
| `franquicia-agotada` | 207 | `encomienda-regalo` | 100 |
| `cobro-abusivo` | 146 | `factura-exigida` | 66 |
| `comercial-vs-personal` | 142 | `prohibido-o-restringido` | 62 |
| `demora-extrema` | 47 | `roto-o-incompleto` | 36 |
| `mudanza-y-viajero` | 42 | `decomiso-subasta` | 13 |

---

## 1. Tabla de fuentes (`sources`) — Task 2 la transcribe

| id | título | norma | url (verificada 200) |
|---|---|---|---|
| `ley-20446` | Presupuesto Nacional 2025-2029 — régimen de envíos postales internacionales | Ley 20.446 (16/12/2025), arts. 627-635 | https://www.impo.com.uy/bases/leyes/20446-2025/627 |
| `ley-20446-628` | Acuerdos comerciales internacionales y obsequios familiares | Ley 20.446, art. 628 | https://www.impo.com.uy/bases/leyes/20446-2025/628 |
| `ley-20446-629` | Medidas que puede adoptar el Poder Ejecutivo | Ley 20.446, art. 629 | https://www.impo.com.uy/bases/leyes/20446-2025/629 |
| `ley-20446-631` | Abandono no infraccional y remate | Ley 20.446, art. 631 | https://www.impo.com.uy/bases/leyes/20446-2025/631 |
| `ley-20446-632` | Multa por declaración inexacta de valor o procedencia | Ley 20.446, art. 632 | https://www.impo.com.uy/bases/leyes/20446-2025/632 |
| `ley-20446-633` | IMESI y mercadería restringida excluidas del régimen | Ley 20.446, art. 633 | https://www.impo.com.uy/bases/leyes/20446-2025/633 |
| `decreto-50-026` | Reglamentación del régimen de envíos postales internacionales | Decreto 50/026 (promulg. 12/03/2026, publ. 19/03/2026) | https://www.impo.com.uy/bases/decretos/50-2026 |
| `rg-dna-09-2026` | Exoneración de IVA en EPI al amparo del art. 3 del Decreto 50/026 — registro de vendedores extranjeros | RG DNA 09/2026 (20/04/2026) | https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf |
| `rg-dna-10-2026` | Protección de la identidad del usuario en el uso de franquicias | RG DNA 10/2026 (24/04/2026) | https://impo.com.uy/bases/resoluciones-generales-aduanas-nd/10-2026 |
| `dna-comunicado-11-2026` | Comunicado — registro de acceso a la franquicia EPI | Comunicado AGCE 11/2026 (27/04/2026) | https://www.aduanas.gub.uy/innovaportal/file/28456/1/comunicado-11-2026---registro-acceso-franquicia-epi-27.4.26-revisada-ap-als-de-acuerdo.pdf |
| `rg-dna-21-2026` | Prórroga de la exigibilidad de la RG 09/2026 hasta el 1/10/2026 | RG DNA 21/2026 (25/06/2026) | https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf |
| `carou-14` | Despachante de aduana — definición y preceptividad | Ley 19.276 (CAROU), art. 14 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/14 |
| `carou-15` | Intervención NO preceptiva del despachante | Ley 19.276 (CAROU), art. 15 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/15 |
| `carou-98` | Abandono — casos | Ley 19.276 (CAROU), art. 98 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/98 |
| `carou-99` | Abandono no infraccional — procedimiento judicial | Ley 19.276 (CAROU), art. 99 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/99 |
| `carou-140` | Régimen de envíos postales internacionales — definición | Ley 19.276 (CAROU), art. 140 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/140 |
| `carou-141` | Control aduanero de los EPI (tengan o no carácter comercial) | Ley 19.276 (CAROU), art. 141 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/141 |
| `carou-200` | Infracción de contravención | Ley 19.276 (CAROU), art. 200 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/200 |
| `carou-204` | Infracción de defraudación | Ley 19.276 (CAROU), art. 204 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/204 |
| `carou-205` | Infracción de defraudación de valor | Ley 19.276 (CAROU), art. 205 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/205 |
| `carou-207` | Abandono infraccional (comiso) | Ley 19.276 (CAROU), art. 207 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/207 |
| `carou-209` | Infracción de contrabando | Ley 19.276 (CAROU), art. 209 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/209 |
| `carou-213` | Responsabilidad — culpa/dolo; responsabilidad objetiva | Ley 19.276 (CAROU), art. 213 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/213 |
| `carou-223` | Prescripción (5 años Fisco / **2 años reclamos de particulares**) | Ley 19.276 (CAROU), art. 223 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/223 |
| `carou-227` | Competencia: Juzgados Letrados de Aduana (salvo contravención) | Ley 19.276 (CAROU), art. 227 | https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/227 |
| `ley-19009` | Régimen General de las Actividades Postales (courier incluido) | Ley 19.009 (22/11/2012), arts. 5, 6, 33, 37 | https://www.impo.com.uy/bases/leyes/19009-2012 |
| `ursec-185-016` | **Reglamento de Reclamaciones e Indemnizaciones del Servicio Postal** | Res. URSEC 185/016 (09/12/2016), Anexo, arts. 1-29 | https://www.impo.com.uy/bases/resoluciones-ursec-originales/185-2016 |
| `decreto-209-017` | Reglamento de actividades postales — definiciones (queja/reclamación/courier) | Decreto 209/017 (04/08/2017), art. 3 | https://www.impo.com.uy/bases/decretos/209-2017 |
| `ley-17250` | Relaciones de consumo — Defensa del Consumidor | Ley 17.250 (11/08/2000), arts. 6, 12, 13, 30, 31, 42, 47 | https://www.impo.com.uy/bases/leyes/17250-2000/42 |
| `ley-18250-76` | Mudanza de uruguayos que retornan (menaje, herramientas, 1 vehículo) | Ley 18.250, art. 76 (red. Ley 19.996 art. 352) | https://www.impo.com.uy/bases/leyes/18250-2008/76 |
| `ley-18761-tifa` | TIFA — exoneración tributaria en envíos de entrega rápida | Ley 18.761 (17/06/2011), art. 7 | https://www.impo.com.uy/bases/leyes-internacional/18761-2011 |
| `decreto-139-014` | Régimen de equipaje MERCOSUR | Decreto 139/014, arts. 1, 3, 9, 13 | https://www.impo.com.uy/bases/decretos-internacional/139-2014/1 |
| `decreto-43-019` | Franquicia de viajero a USD 500 | Decreto 43/019 | https://www.impo.com.uy/bases/decretos/43-2019 |
| `dna-epi` | DNA — Envíos Postales Internacionales (portal 2026 vigente) | procedimiento oficial | https://www.aduanas.gub.uy/innovaportal/v/28219/1/innova.front/encomiendas-postales-internacionales.html |
| `dna-retenidos` | DNA — Envíos retenidos (agenda + documentación) | procedimiento oficial (09/01/2026) | https://www.aduanas.gub.uy/innovaportal/v/28225/1/innova.front/ |
| `dna-regimen-general` | DNA — Importación Régimen General (DUA) | procedimiento oficial (09/01/2026) | https://www.aduanas.gub.uy/innovaportal/v/28223/1/innova.front/ |
| `dna-franquicias-usadas` | DNA — Consulte franquicias utilizadas | procedimiento oficial (09/01/2026) | https://www.aduanas.gub.uy/innovaportal/v/28224/1/innova.front/ |
| `dna-prohibidos` | DNA — Productos que requieren permisos o no pueden ingresar | procedimiento oficial (09/01/2026) | https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/ |
| `dna-denuncias` | DNA — Recepción de denuncias en aduana | trámite gub.uy | https://www.gub.uy/tramites/recepcion-denuncias-aduana |
| `mef-dc-denuncia` | Consulta, reclamo y/o denuncia en materia de defensa del consumidor | trámite gub.uy (MEF) | https://www.gub.uy/tramites/consulta-yo-reclamo-materia-relaciones-consumo |
| `ursec-reclamo` | Reclamo de consumidores de servicios de telecomunicaciones y postales | trámite gub.uy (URSEC) | https://www.gub.uy/tramites/reclamo-consumidores-servicios-telecomunicaciones-postales |
| `mudanza-tramite` | Mudanza de uruguayos que retornan al país (Ley 18.250) | trámite gub.uy | https://www.gub.uy/tramites/mudanza-uruguayos-retornan-pais-amparados-ley-18250 |
| `mef-faq` | Guía de preguntas frecuentes sobre el régimen de envíos postales | MEF (24/04/2026) | https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias |

---

## 2. Tabla de hechos (`facts`) — Task 2 la transcribe

| id | value | unit | sourceId | article |
|---|---|---|---|---|
| `franquicia.tope_anual_usd` | 800 | USD | `decreto-50-026` | art. 3 y art. 4 lit. c |
| `franquicia.max_envios_anuales` | 3 | envíos | `decreto-50-026` | art. 4 lit. c |
| `franquicia.solo_personas_fisicas` | true | — | `decreto-50-026` | art. 3 |
| `envio.peso_max_kg` | 20 | kg | `decreto-50-026` | art. 1 |
| `simplificado.alicuota_pct` | 60 | % | `ley-20446` | art. 627 |
| `simplificado.minimo_usd` | 20 | USD | `ley-20446` | art. 627 |
| `usa.iva_exencion_usd` | 200 | USD | `ley-18761-tifa` | art. 7 lit. g |
| `valor.base` | "total de la factura original de compra, incluidos todos los conceptos adicionados" | — | `decreto-50-026` | art. 5 |
| `registro_vendedor.exigible_desde` | 2026-10-01 | fecha | `rg-dna-21-2026` | num. 1 |
| `registro_comprador.obligatorio` | false | — | `rg-dna-10-2026` | num. 1.2 y num. 7 |
| `restringidas.plazo_devolucion_dias` | 30 | días | `decreto-50-026` | art. 7 |
| `abandono.plazo_incumplimiento_dias` | 30 | días desde el ingreso al país | `ley-20446-631` | art. 631 num. 1 |
| `abandono.plazo_no_retiro_dias` | 90 | días desde el ingreso al país | `ley-20446-631` | art. 631 num. 2 |
| `multa.declaracion_inexacta` | "el doble de los tributos que debieron pagarse" | — | `ley-20446-632` | art. 632 |
| `multa.reiteracion_prohibicion_meses` | 12 | meses | `ley-20446-632` | art. 632 |
| `sancion.vista_previa_dias_habiles` | 10 | días hábiles | `ley-20446-632` | art. 632 |
| `sancion.impago_abandono_dias` | 90 | días | `ley-20446-632` | art. 632 |
| `contravencion.multa_ui_min` | 400 | UI | `carou-200` | art. 200 num. 3 |
| `contravencion.multa_ui_max` | 4000 | UI | `carou-200` | art. 200 num. 3 |
| `defraudacion.multa` | "el doble del perjuicio fiscal" | — | `carou-204` | art. 204 num. 2 |
| `defraudacion_valor.multa` | "el doble de los tributos adeudados" | — | `carou-205` | art. 205 num. 2 |
| `prescripcion.reclamo_particular_anios` | 2 | años | `carou-223` | art. 223 num. 3 |
| `prescripcion.fisco_anios` | 5 | años | `carou-223` | art. 223 num. 1 |
| `postal.reclamo_destinatario_horas` | 48 | horas corridas desde la entrega | `ursec-185-016` | Anexo art. 10 |
| `postal.reclamo_impositor_intl_dias` | 30 | días corridos | `ursec-185-016` | Anexo art. 10 |
| `postal.reclamo_impositor_nacional_dias` | 15 | días corridos | `ursec-185-016` | Anexo art. 10 |
| `postal.respuesta_preliminar_dias` | 15 | días corridos | `ursec-185-016` | Anexo art. 11 |
| `postal.resolucion_final_intl_dias` | 90 | días corridos | `ursec-185-016` | Anexo art. 11 |
| `postal.resolucion_final_nacional_dias` | 30 | días corridos | `ursec-185-016` | Anexo art. 11 |
| `postal.escalar_ursec_dias` | 30 | días corridos desde la resolución final | `ursec-185-016` | Anexo art. 13 |
| `postal.ursec_resuelve_dias` | 60 | días corridos | `ursec-185-016` | Anexo art. 13 |
| `postal.indemniz_courier_intl_ui` | 417 | UI | `ursec-185-016` | Anexo art. 22 |
| `postal.indemniz_encomienda_intl_ui_kg` | 63 | UI por kg | `ursec-185-016` | Anexo art. 23 |
| `postal.indemniz_encomienda_intl_tope_ui` | 1252 | UI (tope por encomienda) | `ursec-185-016` | Anexo art. 23 |
| `postal.indemniz_nacional_multiplicador` | 3 | × el importe abonado por el envío | `ursec-185-016` | Anexo arts. 22 y 23 |
| `postal.pago_indemniz_horas` | 72 | horas desde la notificación de la resolución final | `ursec-185-016` | Anexo art. 25 |
| `consumo.venta_distancia_dias_habiles` | 5 | días hábiles para rescindir | `ley-17250` | art. 16 |
| `consumo.multa_ur_min` | 20 | UR | `ley-17250` | art. 47 num. 2 |
| `consumo.multa_ur_max` | 4000 | UR | `ley-17250` | art. 47 num. 2 |
| `ursec.multa_ui_min` | 5000 | UI | `ley-19009` | art. 33 lit. C |
| `ursec.multa_ui_max` | 500000 | UI | `ley-19009` | art. 33 lit. C |
| `general.dua_por_persona_por_anio` | 2 | DUA/año (persona física) | `dna-regimen-general` | ⚠ ver §7.4 — sin norma localizada |
| `viajero.franquicia_aerea_usd` | 500 | USD | `decreto-43-019` | art. 1 |
| `viajero.franquicia_terrestre_usd` | 300 | USD | `decreto-43-019` | art. 1 |
| `viajero.excedente_pct` | 50 | % sobre el excedente | `decreto-139-014` | art. 13 |
| `mudanza.anios_residencia_exterior` | 2 | años | `ley-18250-76` | art. 76 |

> **UI/UR:** los montos en UI y UR son unidades indexadas/reajustables — la página debe convertirlos al valor
> vigente al renderizar, no hardcodear pesos. (Existe `/indicadores` con UI en el sitio.)

---

## 3. Las dos correcciones al brief (leer antes de codificar)

### 3.1 ⚠ El despachante SÍ es preceptivo arriba de USD 800

El brief afirma: *"over USD 800 → general regime, and by law no despachante is required (Ley 20.446 art. 627)"*.
**Eso es incorrecto y le costaría plata al lector.** Lo verificado:

- **Ley 20.446 art. 627**: *"Los envíos postales internacionales no requerirán intervención de Despachante de Aduana."*
  Pero el **inciso 1 del mismo artículo acota el régimen** a envíos de ≤ 20 kg **y** valor ≤ USD 800.
- **Decreto 50/026 art. 17**: *"Las operaciones **reguladas por este Decreto** no requerirán intervención de Despachante
  de Aduana."* El Decreto (arts. 2 y 3) sólo regula prestación única y franquicia, ambas topeadas en USD 800.
- **CAROU art. 14**: la intervención del despachante es **preceptiva** como regla general.
  **CAROU art. 15** lista las excepciones: lit. A) EPI **de carácter no comercial**; lit. C) EPI de entrega expresa
  **siempre que su valor en aduana no exceda USD 200**.
- **La DNA, en su página vigente del régimen general** (`dna-regimen-general`, 09/01/2026), es explícita:
  *"para los envíos … que el valor factura sea superior a USD 800 y/o que el peso supere los 20 kg, rige Régimen
  General de Importaciones y **se requiere la contratación de un Despachante de Aduana** … La intervención del
  Despachante de Aduana en el Régimen de importación **es preceptiva**."*

**Regla a codificar:** hasta USD 800 y 20 kg → **sin despachante** (Ley 20.446 art. 627 + Decreto 50/026 art. 17).
Por encima → **régimen general, despachante preceptivo** (CAROU art. 14 + criterio DNA).
Existe un argumento jurídico en contrario (CAROU art. 15 lit. A no pone tope de valor a los EPI no comerciales),
pero **la DNA no lo aplica**; la página no puede decirle a nadie que se ahorre el despachante.

### 3.2 ⚠ La resolución de abril NO le pide papeles al comprador

La lectura popular ("me piden comprobante de compra y de pago, requisitos imposibles") **no es lo que dice la RG 09/2026.**
Leída del escaneo (8 páginas, renderizadas a imagen):

- La RG 09/2026 crea un **registro de la EMPRESA EXTRANJERA vendedora** (Amazon, eBay, la plataforma) ante el
  **Departamento Escribanía de la DNA** (Anexo I, num. 4).
- El registro es **únicamente presencial**, mediante expediente electrónico (GEX) en Mesa de Entrada, e incluye
  **certificado notarial expedido en Uruguay** (Anexo I num. 7 lit. c + Anexo II, modelo de certificado).
- La factura debe incluir la leyenda: *"Todos los bienes incluidos en el presente documento fueron fabricados o
  adquiridos a proveedores con residencia fiscal en Estados Unidos de América"* (Anexo I num. 5 y 6).
- Si el envío trae facturas de **varios emisores**, basta con que **uno** no esté registrado para que
  **todo el envío pierda la exoneración** (Anexo I num. 12).
- **LUCIA valida automáticamente** los identificadores; si no figuran en el registro, no hay exoneración (num. 13).

**Es decir: el comprador uruguayo no puede cumplirlo — el que tiene que registrarse es el vendedor extranjero.**
Por eso "requisitos imposibles" es una descripción justa, pero la página tiene que explicar **por qué**:
no hay papel que vos puedas presentar para arreglarlo.

Lo que **sí** le exige la norma al comprador está en otro lado — **Decreto 50/026 art. 4** (ver bucket `factura-exigida`).

---

## 4. Los 12 buckets

> **Convención:** "Plazo" = plazo legal con norma. Si no hay norma, dice "sin plazo legal".
> Las plantillas usan `{{tracking}}`, `{{fecha}}`, `{{descripcion}}`.

---

### 4.1 `retenido` — "El paquete quedó retenido sin explicación"

**Norma.** La retención es legal y **no requiere causa**: CAROU art. 141 — *"Los envíos postales internacionales que
entren o salgan del territorio aduanero, cualquiera sea su destinatario o remitente, **tengan o no carácter comercial**,
estarán sujetos a control aduanero"*. La DNA lo confirma (`dna-retenidos`): *"Cualquier envío puede ser retenido por
control aduanero, ya sea éste **selectivo o aleatorio**. El destinatario del envío será responsable de justificar todos
los datos de su envío."* Fundamento de la exigencia documental: **Decreto 50/026 art. 4 in fine** (*"La DNA deberá exigir
la presentación de la información y documentación necesaria"*) y **art. 5** (*"el envío deberá ser acompañado por la
documentación que acredite el valor"*).

**Causa nueva y poco conocida (2026):** **RG DNA 10/2026 num. 6.a.ii** — si estás registrado en el registro de identidad
y **la información del envío no es consistente con la registrada** (ej.: compraste con una tarjeta que no declaraste),
**la mercadería NO se libera**. Si **no** estás registrado, hoy igual se libera (num. 6.a.i), porque el registro es
voluntario hasta que la DNA comunique lo contrario (num. 1.2 y 7).

**Procedimiento** (`dna-retenidos`, vigente 09/01/2026):
1. Identificá el operador. **Correo Uruguayo (no expreso):** declarar el envío en la web del operador. **Courier:** ir directo al paso 3.
2. Si tras declararlo sigue retenido, **pedí agenda** (la atención por envíos retenidos es **exclusivamente por cita previa**; la DNA no da detalles por teléfono ni mail).
3. Presentate el día y hora asignados, **en persona y con la documentación en papel**:
   - Correo Uruguayo → Centro Operativo, **Misiones 1310 esq. Buenos Aires, Ciudad Vieja**.
   - Courier → **Terminal de Cargas del Uruguay, Camino Carrasco esq. Av. de las Américas**, lunes a viernes 9:00-16:00.
4. Llevá: **cédula vigente**; **guía aérea**; **factura y orden de compra** (valor, naturaleza, datos de vendedor y comprador, medio de pago); **comprobante de pago impreso y el plástico de la tarjeta** con la que pagaste; **declaración de valor** cuando corresponda; **certificados de otros organismos** si la mercadería lo requiere; **carta autorización + fotocopia del documento del titular** si no vas vos.
5. Pagá los tributos que correspondan y retirá. **El almacenaje corre por tu cuenta** (§4.4).

**Plazo.** No hay plazo para que la DNA resuelva. **Pero corre tu reloj:** a los **30 días** desde el ingreso al país
(si hubo incumplimiento y no pagaste los tributos) o a los **90 días** desde el ingreso (si no lo retiraste),
la mercadería puede ser declarada en **abandono no infraccional** (Ley 20.446 art. 631). Ver `decomiso-subasta`.

**A quién reclamar.** La retención en sí **no se le reclama al courier** — no es su decisión y la Res. URSEC 185/016
art. 16 lit. e) lo exime expresamente de responsabilidad cuando el envío es retenido por un **organismo público**.
Es un trámite ante la **DNA**. Si hay conducta irregular de un funcionario: **denuncia ante la DNA** (`dna-denuncias`, 0800 1855).

**Documento requerido.** Factura + comprobante de pago + tarjeta física + cédula.

**Plantilla de reclamo (a la DNA — solicitud de liberación):**
```
Montevideo, {{fecha}}

Dirección Nacional de Aduanas
Ref.: Envío postal internacional retenido — guía {{tracking}}

Quien suscribe, [NOMBRE], titular de la cédula de identidad [CI], en calidad de destinatario del
envío postal internacional identificado con la guía {{tracking}}, se presenta y DICE:

1. Que el envío de referencia se encuentra retenido desde el {{fecha}}. {{descripcion}}

2. Que acompaño la documentación exigida por el artículo 5 del Decreto 50/026 y por la Dirección
   Nacional de Aduanas para el trámite de envíos retenidos: cédula de identidad, guía, factura y
   orden de compra con detalle de valor, naturaleza de la mercadería y medio de pago, comprobante
   de la transacción y el instrumento de pago utilizado.

3. Que la mercadería es para mi uso personal y sin fines comerciales, conforme al literal b) del
   artículo 4 del Decreto 50/026, y que el titular del medio de pago, del que suscribe la compra y
   del destinatario del envío son la misma persona (literal e) del mismo artículo).

PETITORIO: se sirva verificar la documentación acompañada, liquidar los tributos que correspondan
y disponer el libramiento de la mercadería.

[FIRMA] — [NOMBRE] — CI [CI] — [TELÉFONO] — [EMAIL]
```

---

### 4.2 `factura-exigida` — "Me piden documentación para no pagar IVA (compras de EE.UU.)"

**El bucket más caliente del corpus** ("Nueva Resolución de la aduana: Requisitos imposibles para la exoneración de IVA
en compras de USA", 194 puntos / 214 comentarios, 2026-04-22).

**Norma — y la corrección importante (§3.2).** Hay **dos exigencias distintas** que la gente mezcla:

**(a) Lo que se le exige al VENDEDOR extranjero — RG DNA 09/2026** (`rg-dna-09-2026`, PDF escaneado):
- Anexo I num. 4: la empresa extranjera **debe registrarse ante el Departamento Escribanía de la DNA** para que sus
  compradores accedan a la exoneración de IVA.
- Anexo I num. 7: el registro es **únicamente presencial**, por expediente electrónico (GEX) en Mesa de Entrada, con
  nota firmada del representante + **certificación notarial** (personería, vigencia, representación, residencia fiscal),
  según el modelo del **Anexo II** (certificado *expedido en Uruguay*).
- Anexo I num. 5 y 6: la factura debe llevar la leyenda *"Todos los bienes incluidos en el presente documento fueron
  fabricados o adquiridos a proveedores con residencia fiscal en Estados Unidos de América"*.
- Anexo I num. 12: si el envío incluye facturas de varios emisores y **alguno** no está registrado, **el envío entero
  pierde la exoneración** y tributa por el régimen general que corresponda.
- Anexo I num. 13: **LUCIA valida automáticamente**. Si el identificador no figura, no hay exoneración.
- **Exigible desde el 1/10/2026** — prorrogado dos veces (RG 12/2026 → 1/7/2026; **RG 21/2026 num. 1 → 1/10/2026**).
  Los propios considerandos de la RG 21 admiten que *"resta aún cumplir con varias etapas ineludibles"*.

**(b) Lo que se le exige al COMPRADOR — Decreto 50/026 art. 4** (esto sí lo controlás vos):
- lit. a) recibido por una **misma persona física mayor de edad, con documento de identidad uruguayo**;
- lit. b) **uso personal y sin fines comerciales**;
- lit. d) **el pago debe hacerse con tarjeta de crédito/débito internacional o dinero electrónico** emitido por una
  institución regulada por el **BCU**;
- lit. e) **el titular del medio de pago debe coincidir con el titular de la compra y con el destinatario del envío**;
- lit. f) **autorizar a las administradoras de tarjetas a darle información a la DNA** (esto es el hilo *"Y el secreto
  bancario?"*, 94p/132c — la base legal es **Ley 20.446 art. 627 inc. 3**);
- lit. g) cumplir los **mecanismos de control de identidad digital** de la DNA;
- + **registrarse por única vez ante la DNA** → **RG DNA 10/2026**.

**Procedimiento:**
1. **No busques un papel para "arreglar" (a).** Si el vendedor no está registrado ante la DNA, **no hay documento que
   vos puedas presentar**: la exoneración de IVA no aplica y el envío tributa. Es una decisión del vendedor, no tuya.
2. Antes de comprar (a partir del 1/10/2026), verificá si el vendedor figura en el **registro público de empresas
   extranjeras EPI exonerados** — la RG 09 num. 9 dice que el listado *"será de carácter público"*, **pero al 2026-07-12
   no existe URL publicada** (ver §7.2).
3. Para (b): **registrate en el registro de identidad de la DNA** (RG 10/2026), con identidad digital de nivel
   **intermedio (verificado)** o superior. Formulario electrónico vía **LUCIA**, en la web de la DNA.
   Hoy es **voluntario** (RG 10 num. 1.2 y 7); cuando pase a obligatorio, **sin registro no se libera la mercadería**.
4. Pagá **siempre con tu propia tarjeta**, a tu nombre, y que el destinatario del envío seas vos. Si la tarjeta es de
   otra persona, perdés la franquicia (Decreto 50/026 art. 4 lit. e).
5. Si el envío ya está retenido pidiéndote documentación → seguí el procedimiento de `retenido` (§4.1).

**Plazo.** El registro del vendedor es exigible **desde el 1/10/2026** (RG 21/2026 num. 1). El registro del comprador
es **voluntario hasta que la DNA lo comunique** (RG 10/2026 num. 7).

**A quién reclamar.** A nadie: no es un error, es la norma. Reclamarle al courier o a Defensa del Consumidor por el IVA
**no corresponde** — no es una relación de consumo defectuosa, es un tributo. Si creés que la DNA aplicó mal la
exoneración a un vendedor **que sí está registrado**, es un trámite ante la **DNA**.

**Documento requerido.** Factura del vendedor con la leyenda del num. 5 de la RG 09 + comprobante de pago con tarjeta propia.

**Plantilla de reclamo (a la DNA — exoneración mal denegada):**
```
Montevideo, {{fecha}}

Dirección Nacional de Aduanas — Área Gestión de Comercio Exterior
Ref.: Exoneración de IVA — Acuerdo Comercial EE.UU. — guía {{tracking}}

Quien suscribe, [NOMBRE], CI [CI], destinatario del envío postal internacional guía {{tracking}},
DICE:

1. Que el envío procede de Estados Unidos de América, país declarado habilitado por el numeral 1
   del Anexo I de la Resolución General DNA N° 09/2026.

2. Que la factura comercial que acompaña el envío fue emitida por [VENDEDOR], y que conforme al
   numeral 10 del Anexo I de la citada Resolución, su emisor se encuentra registrado ante la
   Dirección Nacional de Aduanas. {{descripcion}}

3. Que el valor de factura no supera los USD 200, umbral de la exoneración prevista en el artículo 7
   de la Ley 18.761 (Acuerdo Marco sobre Comercio e Inversión con los Estados Unidos de América).

4. Que se ha liquidado Impuesto al Valor Agregado sobre el envío, pese a cumplirse las condiciones
   del artículo 3 del Decreto 50/026.

PETITORIO: se revise la liquidación practicada y se aplique la exoneración del Impuesto al Valor
Agregado que corresponde al envío de referencia.

[FIRMA] — [NOMBRE] — CI [CI] — [TELÉFONO] — [EMAIL]
```

---

### 4.3 `roto-o-incompleto` — "Llegó abierto, faltan cosas"

**Éste es el bucket donde la ley da MÁS y la gente sabe MENOS.** ("La aduana me robó un pedido", 187p/90c.)

**Norma.** **Res. URSEC 185/016, Anexo** (Reglamento de Reclamaciones e Indemnizaciones del Servicio Postal):
- **art. 15**: *"Los Prestadores de Servicios Postales serán responsables por la **pérdida, hurto, destrucción o
  deterioro** de los envíos con entrega registrada, los envíos certificados, **los envíos expresos o courier**, las
  encomiendas, los envíos con valor declarado y cualquier otro producto postal dotado de trazabilidad."*
  (Los couriers **son** prestadores del servicio postal: **Ley 19.009 art. 5 num. 4** los incluye expresamente.)
- **art. 6**: deben atender **gratis** las reclamaciones, tanto del **impositor** como del **destinatario**.
- **art. 9**: te deben dar **recibo gratuito o número de referencia** al presentar la reclamación.

**⚠ El plazo que hace perder el caso — art. 10:**
- **Destinatario: 48 (cuarenta y ocho) HORAS CORRIDAS desde la entrega.**
- Impositor: 15 días corridos (nacional) / **30 días corridos (internacional)**.
- Y el **art. 16 lit. g)** excluye la responsabilidad *"si el receptor del envío **no declarare haberlo recibido con
  daño**"*, y el **lit. h)** si no se reclamó dentro de los plazos del art. 10.
  **Traducción: si firmás conforme y no decís nada, perdiste.**

**Cuánto te tienen que pagar (arts. 21-24):**
- envío **expreso o courier** / certificado: **3× el importe abonado** si es nacional; **417 UI** si es internacional (art. 22);
- **encomienda**: 3× el importe abonado si es nacional; **63 UI por kg, con tope de 1.252 UI por encomienda**, si es
  internacional, **más** el importe abonado y los derechos pagados (art. 23);
- **envío con valor declarado y seguro pago**: **el valor declarado** (art. 24) — **la única vía para cobrar lo que vale
  de verdad**;
- **art. 20**: **no** se indemnizan daños indirectos ni lucro cesante.

> **Honestidad obligatoria en la página:** si el courier pierde tu notebook de USD 900 y no declaraste valor, el
> reglamento te da **1.252 UI como tope** (≈ USD 200-220 según UI vigente), no los USD 900. Ese es el punto de la
> sección: **declarar valor y pagar el seguro** es lo que cambia el resultado.

**⚠ Cuándo el courier NO responde — art. 16:** fuerza mayor (lit. a); culpa del impositor o naturaleza del contenido
(lit. c); **retención del envío por orden del Poder Judicial o cualquier interrupción del proceso postal por parte de
organismos públicos competentes (lit. e)** → **si el faltante ocurrió mientras la mercadería estaba retenida por la DNA,
el courier no responde.** En ese caso el camino es la **denuncia ante la DNA** (`dna-denuncias`), no la reclamación postal.

**Procedimiento:**
1. **En el momento de la entrega**, si el paquete viene abierto, con precinto roto o con menos peso: **NO firmes conforme**.
   Dejá **constancia escrita del daño** en el remito/guía (art. 16 lit. g).
2. **Fotografiá** el paquete cerrado, el embalaje, el precinto, la etiqueta con el peso, y el contenido.
3. Presentá la **reclamación formal ante el courier dentro de las 48 HORAS** de la entrega (art. 10).
   Exigí **recibo o número de referencia** (art. 9).
4. El courier tiene **15 días corridos** para una **respuesta preliminar** y **90 días corridos** (envío internacional)
   para la **resolución final** (art. 11).
5. Si te la rechaza o vence el plazo sin respuesta: **escalá a URSEC dentro de los 30 días corridos** siguientes
   (art. 13). URSEC resuelve en **60 días corridos**. Trámite: `ursec-reclamo`.
   ⚠ **No podés ir a URSEC antes de agotar la instancia ante el courier** (art. 13).
6. Si la indemnización se reconoce y no te la pagan: **72 horas** desde la notificación de la resolución final (art. 25),
   y el incumplimiento habilita a URSEC a abrir procedimiento sancionatorio contra el operador
   (Ley 19.009 art. 6 lit. G num. 3; multas de **5.000 a 500.000 UI**, art. 33).

**Plazo.** **48 horas** (destinatario). Es el plazo más corto y más letal de toda la guía.

**A quién reclamar.** **1º el courier** (obligatorio), **2º URSEC**. **No** Defensa del Consumidor en primer término:
la vía postal es específica y tiene tarifa de indemnización tasada.

**Documento requerido.** Constancia de daño firmada al recibir + fotos + guía + factura de compra.

**Plantilla de reclamo (al courier):**
```
[CIUDAD], {{fecha}}

[OPERADOR POSTAL / COURIER]
Ref.: RECLAMACIÓN — envío {{tracking}} — entrega con faltante/deterioro

Quien suscribe, [NOMBRE], CI [CI], destinatario del envío {{tracking}}, presenta RECLAMACIÓN en los
términos del artículo 6 del Reglamento de Reclamaciones e Indemnizaciones del Servicio Postal
(Resolución URSEC N° 185/016), y DICE:

1. Que el envío de referencia me fue entregado el {{fecha}}, en las siguientes condiciones:
   {{descripcion}}

2. Que dejé constancia del daño/faltante al momento de la entrega, conforme al literal g) del
   artículo 16 del citado Reglamento, y acompaño registro fotográfico.

3. Que la presente reclamación se interpone dentro de las 48 (cuarenta y ocho) horas corridas desde
   la entrega, plazo previsto por el artículo 10 del Reglamento.

4. Que, conforme al artículo 15, los Prestadores de Servicios Postales son responsables por la
   pérdida, hurto, destrucción o deterioro de los envíos expresos o courier y de las encomiendas.

PETITORIO:
a) Se me expida recibo o número de referencia de esta reclamación (artículo 9 del Reglamento).
b) Se emita respuesta preliminar dentro de los 15 días corridos y resolución final dentro de los
   plazos del artículo 11.
c) Se abone la indemnización que corresponde conforme a los artículos 22 y 23 del Reglamento.

Se deja constancia de que, vencidos los plazos sin resolución satisfactoria, se someterá la
controversia a conocimiento de la URSEC conforme al artículo 13 del Reglamento y al artículo 37 de
la Ley 19.009.

[FIRMA] — [NOMBRE] — CI [CI] — [TELÉFONO] — [EMAIL]
```

---

### 4.4 `cobro-abusivo` — "Me cobran gestión, depósito, almacenaje que nadie entiende"

**Norma — qué cargo tiene respaldo y cuál no:**

| Cargo | ¿Tiene respaldo normativo? | Norma |
|---|---|---|
| **Prestación única 60%**, mínimo USD 20/envío | **Sí** — es un tributo | Ley 20.446 art. 627; Decreto 50/026 art. 2 |
| **IVA** sobre envíos en franquicia | **Sí** | Decreto 50/026 art. 3 (remite a Título 10 art. 13 lit. B del TO 2023 — ver §7.1) |
| **Almacenaje / depósito** de mercadería retenida | **Sí, va por tu cuenta** | DNA (`dna-retenidos`): *"Los costos de almacenamiento de la mercadería retenida por cualquier concepto, así como los costos de los operadores postales, deberán ser asumidos por el interesado."* **El monto es contractual, no tarifado por norma.** |
| **Flete, "gestión", "handling", "despacho"** del courier | **No hay norma que los fije.** Son **precio contractual** | Se rigen por la **Ley 17.250** |

**Lo que la ley de consumo te da (Ley 17.250):**
- **art. 6 lit. C**: derecho a **información suficiente, clara, veraz, en español**.
- **art. 12**: la **oferta obliga** a quien la emite.
- **art. 13**: *"Cuando en la oferta se dieran dos o más informaciones contradictorias, **prevalecerá la más favorable
  al consumidor**."* ← Si te cotizaron X y te cobraron Y, **vale X**.
- **arts. 30 y 31**: **cláusulas abusivas** — son abusivas las que generan desequilibrio injustificado, las que autorizan
  al proveedor a **modificar los términos del contrato** (art. 31 lit. C) y las que **imponen la carga de la prueba** al
  consumidor (lit. E).
- **art. 47**: sanciones a la empresa: **multa de 20 a 4.000 UR**, decomiso, clausura hasta 90 días.

**Procedimiento:**
1. Pedí por escrito el **desglose del cargo**: qué es tributo (va a la DNA) y qué es precio del operador.
   El tributo tiene comprobante de pago a la DNA; el resto es del courier.
2. Compará con la **cotización/oferta original** (captura, mail, web). Si difieren, invocá **Ley 17.250 art. 13**.
3. Reclamá **por escrito al courier** y guardá constancia.
4. Si no lo resuelve: **Defensa del Consumidor** (`mef-dc-denuncia`, 0800 7005). Puede **citar al proveedor**
   (art. 42 lit. F) y **sancionarlo** (art. 47).
5. Si el cargo es de un **operador postal** y va con una **falla del servicio** (demora, pérdida, deterioro),
   la vía específica es **URSEC** (§4.3, §4.11).

**Plazo.** Sin plazo legal específico para reclamar el precio. **Pero**: si el cargo va atado a una compra a distancia,
tenés **5 días hábiles para rescindir** (Ley 17.250 art. 16). Y todo reclamo del particular en materia aduanera
prescribe a los **2 años** (CAROU art. 223 num. 3).

**A quién reclamar.** **Courier → Defensa del Consumidor.** ⚠ **No a la DNA**: la DNA **no fija ni controla** las tarifas
de los couriers. Y **no a URSEC** si es sólo precio (URSEC es controversias del **servicio** postal).

**Documento requerido.** Cotización/oferta original + factura del courier con el desglose + comprobante del tributo.

**Plantilla de reclamo (Defensa del Consumidor):**
```
Montevideo, {{fecha}}

Área Defensa del Consumidor — Ministerio de Economía y Finanzas
Ref.: Reclamo — cobros no informados — envío {{tracking}}

Quien suscribe, [NOMBRE], CI [CI], con domicilio en [DOMICILIO], presenta reclamo contra
[EMPRESA / COURIER], RUT [RUT si se conoce], y DICE:

1. Que contraté el servicio de [SERVICIO] para el envío identificado con la guía {{tracking}}.

2. Que la oferta publicada / la cotización que me fue comunicada el {{fecha}} indicaba un costo de
   [MONTO OFERTADO], y que finalmente se me cobró [MONTO COBRADO], por conceptos que no me fueron
   informados de manera clara y previa. {{descripcion}}

3. Que el artículo 6 literal C) de la Ley 17.250 consagra el derecho del consumidor a información
   suficiente, clara y veraz; que el artículo 12 establece que la oferta vincula a quien la emite; y
   que el artículo 13 dispone que, ante informaciones contradictorias, prevalece la más favorable al
   consumidor.

4. Que los cargos aplicados unilateralmente y no informados configuran, además, la hipótesis del
   artículo 31 literal C) de la citada ley (cláusulas que autorizan al proveedor a modificar los
   términos del contrato).

PETITORIO:
a) Se cite al proveedor conforme al artículo 42 literal F) de la Ley 17.250.
b) Se disponga la devolución de lo cobrado en exceso sobre la oferta original.
c) Se apliquen las sanciones del artículo 47 si se constata la infracción.

Se acompaña: oferta/cotización original, factura emitida por el proveedor, comprobante de pago.

[FIRMA] — [NOMBRE] — CI [CI] — [TELÉFONO] — [EMAIL]
```

---

### 4.5 `franquicia-agotada` — "Se me acabaron las 3 compras / me pasé de los USD 800"

**Norma.** **Decreto 50/026 art. 4 lit. c)**: la franquicia es **hasta 3 (tres) veces por año civil por persona física,
independientemente de sus montos y características**, y **todas** las franquicias del art. 3 computan tanto para el
**tope de USD 800** como para el **conteo de envíos**.

**Cuatro consecuencias que la gente no sabe:**
1. **Los regalos también consumen cupo.** Decreto 50/026 art. 3 inc. 2: *"el valor de dichos envíos **se imputará al cupo
   anual** establecido para la franquicia, consumiendo el monto correspondiente"*. Aplica a los envíos exonerados por
   acuerdo comercial (EE.UU.) **y** a los obsequios familiares.
2. **La franquicia no se parte.** Si te quedan USD 300 y el envío vale USD 400, **no** pagás la diferencia: el envío
   entero cae en **prestación única** (60%, mínimo USD 20) — Decreto 50/026 art. 15.
3. **Libros y medicamentos no consumen el tope de USD 800** (Decreto 50/026 art. 4, inciso final;
   los medicamentos, **con autorización del MSP**).
4. **La fecha que cuenta es la de desaduanamiento**, no la de compra ni la de arribo (`dna-franquicias-usadas`).

**Si te pasás igual — Ley 20.446 art. 632:** declarar **inexactamente el valor** (o la **procedencia**) para
beneficiarte del régimen se sanciona con **multa igual al DOBLE de los tributos que debieron pagarse**.
**Reiterar dentro de 12 meses → prohibición de operar en el régimen por los 12 meses siguientes.**

**Procedimiento:**
1. **Consultá tu cupo real** antes de comprar: `dna-franquicias-usadas` (requiere **identidad digital** nivel
   intermedio/verificado o superior).
   ⚠ **No confundir** con `aduanas.gub.uy/innovaportal/v/18715` — ése es un **cubo estadístico agregado**, no tu cupo.
2. Si ya usaste las 3 o llegaste a USD 800: el próximo envío va por **prestación única** (60%, mínimo USD 20) —
   no es un castigo, es el otro régimen. Los dos regímenes son **excluyentes**, nunca se combinan.
3. Si el envío supera **USD 800** → **régimen general**, con **despachante preceptivo** (§3.1 y §4.6).
4. Si te notifican una **multa** del art. 632: tenés **10 días hábiles de vista previa** para defenderte (ver abajo).

**Plazo.** ⚠ **10 días hábiles de VISTA PREVIA** (Ley 20.446 art. 632): *"En caso de que no exista reconocimiento, se
otorgará vista previa por el plazo de diez días hábiles, vencidos los cuales, con o sin evacuación de la misma, la
Dirección Nacional de Aduanas procederá a dictar el acto sancionatorio."* **Es tu única ventana para contestar.**
Además: si a los **90 días** de determinada la sanción no pagás la multa, la mercadería pasa a **abandono infraccional**.

**A quién reclamar.** **DNA** (evacuación de vista / descargo). La sanción administrativa la aplica la DNA
(art. 632 inc. 3). Las demás infracciones aduaneras las juzga el **Juzgado Letrado de Aduana** (CAROU art. 227).

**Documento requerido.** Factura original + comprobante de pago + escrito de descargo dentro de los 10 días hábiles.

**Plantilla (evacuación de vista ante la DNA):**
```
Montevideo, {{fecha}}

Dirección Nacional de Aduanas
Ref.: Evacuación de vista — art. 632 de la Ley 20.446 — guía {{tracking}}

Quien suscribe, [NOMBRE], CI [CI], habiendo sido notificado el {{fecha}} de la vista conferida en el
expediente de referencia, comparece EN TIEMPO Y FORMA dentro del plazo de diez días hábiles previsto
por el artículo 632 de la Ley 20.446, y DICE:

1. Que no ha existido declaración inexacta del valor ni de la procedencia de la mercadería.
   {{descripcion}}

2. Que el valor declarado se corresponde con el total de la factura original de compra, incluidos
   todos los conceptos adicionados en la misma, conforme al artículo 5 del Decreto 50/026, cuya copia
   se acompaña junto con el comprobante de pago.

3. Que la mercadería fue adquirida para uso personal y sin fines comerciales (artículo 4 literal b)
   del Decreto 50/026).

PETITORIO: se tenga por evacuada la vista, se desestime la aplicación de la multa prevista por el
artículo 632 de la Ley 20.446 y, en subsidio, se considere la ausencia de dolo a los efectos de la
graduación de la sanción.

Se acompaña: factura original, comprobante de pago, guía {{tracking}}.

[FIRMA] — [NOMBRE] — CI [CI] — [TELÉFONO] — [EMAIL]
```

---

### 4.6 `supera-monto` — "Me pasé de USD 200 (IVA) o de USD 800 (régimen general)"

**Norma.** Hay **dos** umbrales distintos y la gente los confunde:

**(a) USD 200 — umbral de IVA para EE.UU. (TIFA).** Es la **única** cosa que significa "USD 200" en el régimen vigente.
Base: **Ley 18.761 art. 7 lit. g** + **Ley 20.446 art. 628** + **Decreto 50/026 art. 3**.
**Es todo o nada:** un dólar por encima y **el envío entero paga IVA**. No hay exención parcial.
⚠ **No existe** un tope de franquicia de USD 200 por envío — eso era el **Decreto 356/014, derogado**
(Decreto 50/026 art. 19).

**(b) USD 800 — techo de los dos regímenes especiales.** Por encima (o más de **20 kg**, o mercadería gravada por
**IMESI**), el envío **no entra ni en franquicia ni en prestación única**: va a **régimen general de importación**
(Decreto 50/026 arts. 1, 2, 3 y 7; Ley 20.446 art. 633).

**En el régimen general** (`dna-regimen-general`, DNA, 09/01/2026):
- se tramita por **DUA** (Documento Único Aduanero);
- **la intervención del despachante de aduana es PRECEPTIVA** (CAROU art. 14; ver la corrección del §3.1 — **el brief
  decía lo contrario**);
- la DNA afirma además que *"las personas físicas podrán realizar únicamente **hasta dos DUA por año**"*
  (⚠ no localizamos la norma que lo establece — ver §7.4);
- pagás **aranceles + IVA + tasas** completos; la calculadora del sitio **no** cotiza este régimen.

**El valor que cuenta** (Decreto 50/026 art. 5): **el total de la factura original de compra, incluidos todos los
conceptos que figuren adicionados en la misma** — o sea, precio + sales tax + el flete **que el vendedor te cobre en
esa factura**. El flete que el courier te factura aparte **no** integra ese total.

**Procedimiento:**
1. Verificá el valor con el criterio del art. 5 (**total de la factura**, no el precio del producto).
2. Conversión: **arbitraje del BCU del día hábil anterior al despacho** (Decreto 50/026 art. 6).
3. Si pasás de USD 200 (EE.UU.): **pagás IVA sobre el total**. Nada que reclamar — es la norma.
4. Si pasás de USD 800 / 20 kg / IMESI: **contratá un despachante de aduana**. No hay atajo.
5. **Alternativa antes del despacho:** si la mercadería está **restringida o requiere autorización** que no tenés,
   el Decreto 50/026 art. 7 te deja **devolverla a origen a tu costo dentro de 30 días** (ver §4.7).
   ⚠ Una vez que la DNA **verificó** el envío, *"los operadores postales no podrán retornar a origen"* (`dna-retenidos`).
6. Si creés que la DNA valuó mal la mercadería → vista previa de **10 días hábiles** (Ley 20.446 art. 632).

**Plazo.** 10 días hábiles de vista si hay sanción. 30 días para devolver a origen (art. 7), **sólo antes del despacho**.

**A quién reclamar.** **DNA** (valuación / clasificación). Un **despachante de aduana** para operar el DUA.
**Defensa del Consumidor no puede hacer nada** con un tributo.

**Documento requerido.** Factura original completa (con todos los conceptos) + comprobante de pago.

**Plantilla:** usar la de `franquicia-agotada` (§4.5) — es el mismo art. 632 y la misma vista de 10 días hábiles.

---

### 4.7 `prohibido-o-restringido` — "Trae algo que necesita permiso (MSP, URSEC, MGAP)"

**Norma.**
- **Ley 20.446 art. 633**: el régimen de EPI **no se aplica en ningún caso** a mercadería gravada por **IMESI**, y **podrá
  no aplicarse** a **mercadería restringida** — *"aquellas que requieren de la autorización de algún organismo competente
  para su importación, exportación o comercialización en el territorio nacional"*.
- **Decreto 50/026 art. 7**: el Decreto **no se aplica** a mercadería gravada por IMESI ni a la que requiera autorización
  de un organismo competente **y carezca de ella**. **Y da la salida:** *"En el caso de arribo de dicho tipo de
  mercadería, sin que se haya producido el despacho, el interesado podrá **devolverla a su costo al lugar de procedencia
  dentro del plazo de 30 (treinta) días**, siempre que no haya incurrido en ningún incumplimiento de la normativa
  vigente."*
- **Decreto 50/026 art. 4** (inc. final): **libros y medicamentos de uso personal** quedan **exceptuados del tope de
  USD 800** — los medicamentos, **con la debida autorización del MSP**.

**Quién autoriza qué** (`dna-prohibidos`, DNA 09/01/2026):
- **MSP** — medicamentos, suplementos, vitaminas, productos médicos, ortopédicos, oftalmológicos, odontológicos, higiene,
  cuidado personal, belleza. Contactos: `farmacovigilancia@msp.gub.uy` (medicamentos), `controltabaco@msp.gub.uy`
  (tabaco, habanos, **vaporizadores**), `consultasdacd@msp.gub.uy` (alimentos, cosméticos, domisanitarios),
  `registro.tecnologia@msp.gub.uy` (tecnología médica), `des@msp.gub.uy` (todo lo demás, incl. suplementos).
- **URSEC** — todo lo que emite radiofrecuencia: celulares, **drones/equipos con control remoto**, baby-call, GPS,
  terminales satelitales, repetidores WiFi, walkie-talkies, cámaras con conexión celular, tablets con celular.
  Certificados **online por la VUCE**: http://vuce.gub.uy
- **MGAP** — productos de origen animal y vegetal, semillas, alimentos.

**Procedimiento:**
1. **Conseguí el certificado del organismo ANTES de pedir agenda en Aduana.** La DNA es explícita:
   *"Para retirar envíos que contienen mercadería de ingreso restringido y que se encuentran retenidos, es necesario
   contar con el certificado de autorización emitido por el organismo correspondiente **antes** de realizar cualquier
   trámite en Aduana."*
2. Con el certificado en mano, seguí el procedimiento de `retenido` (§4.1).
3. **Si no vas a conseguir el permiso:** pedí la **devolución a origen a tu costo, dentro de los 30 días**
   (Decreto 50/026 art. 7). ⚠ **Sólo funciona si el envío todavía no fue verificado por la DNA** — después,
   *"los operadores postales no podrán retornar a origen"* (`dna-retenidos`).
4. Si no hacés ni una cosa ni la otra: a los **30/90 días** cae en **abandono** (§4.8).

**Plazo.** **30 días** desde el arribo para devolver a origen (Decreto 50/026 art. 7).

**A quién reclamar.** **Al organismo que regula el producto** (MSP / URSEC-VUCE / MGAP) para el permiso.
A la **DNA** sólo para el despacho, una vez que tenés el certificado.
⚠ **La DNA no puede levantarte una prohibición del MSP.** Reclamarle a Aduana es ir al escritorio equivocado.

**Documento requerido.** **Certificado de autorización del organismo competente**, emitido **antes** del trámite aduanero.

**Plantilla (solicitud de retorno a origen):**
```
Montevideo, {{fecha}}

Dirección Nacional de Aduanas / [OPERADOR POSTAL]
Ref.: Solicitud de retorno a origen — art. 7 del Decreto 50/026 — guía {{tracking}}

Quien suscribe, [NOMBRE], CI [CI], destinatario del envío postal internacional guía {{tracking}},
arribado al país el {{fecha}}, DICE:

1. Que el envío contiene mercadería que requiere autorización de [ORGANISMO: MSP / URSEC / MGAP] para
   su importación, autorización con la que no cuento. {{descripcion}}

2. Que no se ha producido el despacho de la mercadería y que no he incurrido en incumplimiento alguno
   de la normativa vigente.

3. Que el artículo 7 del Decreto 50/026 habilita al interesado a devolver la mercadería a su costo al
   lugar de procedencia dentro del plazo de 30 (treinta) días, en estas exactas condiciones.

PETITORIO: se autorice el retorno a origen del envío de referencia, a mi costo, dentro del plazo legal.

[FIRMA] — [NOMBRE] — CI [CI] — [TELÉFONO] — [EMAIL]
```

---

### 4.8 `decomiso-subasta` — "Se lo quedaron / lo remataron"

**Norma — hay que distinguir DOS abandonos:**

**(a) Abandono NO infraccional — Ley 20.446 art. 631** (el que aplica a envíos postales):
La DNA **puede declararlo a solicitud de cualquier interesado** (léase: el depositario/courier) cuando:
1. hay **incumplimiento del régimen**, no se configura infracción, y **no se pagan los tributos dentro de los 30 días
   desde el ingreso de la mercadería al país**; o
2. el propietario/consignatario **no retiró el envío dentro de los 90 días desde su ingreso al país**.

**Lo bueno:** *"El abandono **eximirá** al propietario … de la obligación de abonar los tributos impagos de importación"*.
**Lo malo:** *"Una vez declarado el abandono no infraccional, la DNA **rematará la mercadería** en uno o varios actos,
**sin base y al mejor postor**"*, y del producido **hasta un 30% va al depositario** y **el saldo a financiar gastos de
funcionamiento de la DNA**. **Vos no recuperás nada.**

**⚠ La defensa que existe — el requisito de notificación (art. 631):**
*"En todos los casos el **peticionante deberá acreditar la notificación** por cualquier medio fehaciente o por el Diario
Oficial al consignatario … de la **intimación al retiro** de la misma **bajo apercibimiento de declararla en abandono**.
Dicho requisito **no será exigible pasados dos años** del ingreso de la mercadería a territorio aduanero."*
→ **Si nunca te intimaron al retiro (y no pasaron 2 años), la declaración de abandono está viciada.** Es el argumento.

**(b) Abandono INFRACCIONAL — CAROU art. 207**: mercadería abandonada u olvidada que haga presumir preparación de
contrabando, o aprehendida en control de infracciones sin responsable identificable. **Implica el COMISO.**
También se cae acá por **no pagar la multa del art. 632** dentro de los **90 días** de determinada la sanción
(Ley 20.446 art. 632).

**Vía judicial paralela:** CAROU arts. 98 y 99 — el abandono no infraccional también se tramita ante los
**Juzgados Letrados de Aduana** (Montevideo y Canelones) o Juzgados Letrados de Primera Instancia con competencia
aduanera en el interior. Se oye al **Ministerio Público** (6 días hábiles) y **quien se considere con derecho a la
mercadería puede OPONERSE** (art. 99 num. 4). Contra la sentencia de primera instancia cabe **apelación con efecto
suspensivo** (art. 99 num. 6).

**Procedimiento:**
1. **Actuá antes de los 30 días** (si hay incumplimiento + tributos impagos) o de los **90 días** (si no retiraste).
   Después, la ventana se cierra sola.
2. Si te notificaron la **intimación al retiro**: retirá o pagá **ya**. Esa notificación es el reloj.
3. Si te enterás de que fue declarado en abandono **sin haber sido intimado**: pedí por escrito a la DNA
   la **constancia de la notificación** que el peticionante estaba obligado a acreditar (art. 631).
   **Sin esa constancia, la declaración es impugnable** (salvo que hayan pasado 2 años del ingreso).
4. Si el trámite es **judicial** (CAROU art. 99): **presentate y oponete** — el art. 99 num. 4 prevé expresamente la
   oposición de quien se considere con derecho a la mercadería.
5. Prescripción de tu reclamo: **2 años** desde el hecho (CAROU art. 223 num. 3).

**Plazo.** **30 / 90 días desde el ingreso al país** (Ley 20.446 art. 631). **2 años** para reclamar (CAROU art. 223.3).

**A quién reclamar.** **DNA** (vía administrativa) y/o **Juzgado Letrado de Aduana** (vía judicial, CAROU arts. 99 y 227).
**No** Defensa del Consumidor. **No** URSEC (la Res. 185/016 art. 16 lit. e) excluye la responsabilidad del courier
cuando la interrupción viene de un organismo público).

**Documento requerido.** Guía + factura + **toda constancia de notificación (o su ausencia)** + comprobante de tributos.

**Plantilla (oposición / pedido de constancia de notificación):**
```
Montevideo, {{fecha}}

Dirección Nacional de Aduanas
Ref.: Envío {{tracking}} — abandono no infraccional — art. 631 de la Ley 20.446

Quien suscribe, [NOMBRE], CI [CI], consignatario del envío postal internacional guía {{tracking}},
ingresado al país el {{fecha}}, DICE:

1. Que he tomado conocimiento de que se habría promovido / declarado el abandono no infraccional del
   envío de referencia. {{descripcion}}

2. Que el artículo 631 de la Ley 20.446 exige, en todos los casos, que el peticionante ACREDITE la
   notificación —por medio fehaciente o por el Diario Oficial— de la intimación al retiro de la
   mercadería bajo apercibimiento de declararla en abandono.

3. Que el suscrito NO fue notificado de intimación alguna al retiro, y que no han transcurrido dos
   años desde el ingreso de la mercadería a territorio aduanero, por lo que el requisito de
   notificación resulta plenamente exigible.

PETITORIO:
a) Se me expida constancia de la notificación de la intimación al retiro que el peticionante debió
   acreditar, o de su inexistencia.
b) En caso de no haberse cumplido dicho requisito, se deje sin efecto la declaración de abandono y se
   me intime en legal forma al retiro, liquidándose los tributos que correspondan.
c) Se suspenda todo acto de remate hasta la resolución de la presente.

[FIRMA] — [NOMBRE] — CI [CI] — [TELÉFONO] — [EMAIL]
```

---

### 4.9 `comercial-vs-personal` — "Me lo tratan como importación comercial"

**Norma.** El **test legal es cualitativo, no numérico**:
- **Decreto 50/026 art. 4 lit. b)**: la franquicia exige que sea **"para su uso personal y sin fines comerciales"**.
- **Decreto 50/026 art. 3**: la franquicia es **sólo para personas físicas**.
- **Decreto 50/026 art. 3** (obsequios familiares): *"envío **no comercial entre las partes**, … remitido y consignado
  por **personas físicas**, y contenga mercadería en **cantidades razonables**, nueva o usada, para **uso o consumo
  personal** del destinatario y **sin fines comerciales**"*.
- **CAROU art. 141**: los EPI están sujetos a control aduanero **"tengan o no carácter comercial"**.

**⚠ No existe un número.** No hay norma que diga "hasta 3 unidades" o "hasta X dólares es personal".
Lo que hay son los estándares de arriba (**cantidades razonables**, **uso personal**, **sin fines comerciales**),
aplicados **caso a caso por el funcionario**. Decir lo contrario sería inventar.

**Qué pasa si te lo recalifican:**
- Perdés la franquicia **para esa operación** y se aplica la **prestación única** (60%, mínimo USD 20) —
  **Decreto 50/026 art. 15**. Dato bueno: *"En estos casos, la operación **no computará** a los efectos de las
  limitaciones previstas por los artículos 2 y 4 literal c)"* → **no te consume una de las 3 franquicias**.
- Si además hubo **declaración inexacta de valor o procedencia** → **multa del doble de los tributos**
  (Ley 20.446 art. 632) o, en su caso, **defraudación** (CAROU art. 204, multa = doble del perjuicio fiscal) o
  **defraudación de valor** (CAROU art. 205).
- Sin documentación, o con ocultamiento → **contrabando** (CAROU art. 209).
- **CAROU art. 213**: en defraudación, defraudación de valor, desvío de exoneraciones y contrabando, se imputa a título
  de **culpa o dolo**, y *"la multa … **podrá reducirse hasta en un 50%** en caso que se pruebe haber actuado con culpa"*.
  ← **Probar la buena fe sí sirve: te puede bajar la multa a la mitad.**
  (En **contravención** y **diferencia**, en cambio, *"no será admisible ninguna excusa fundada en la buena fe"*.)

**Procedimiento:**
1. **Documentá el uso personal**: para qué es, por qué esa cantidad, quién lo va a usar.
2. Si son varias unidades iguales, esperá la recalificación. Es el patrón que la dispara.
3. Si te notifican sanción: **vista previa de 10 días hábiles** (Ley 20.446 art. 632). Contestá **invocando culpa,
   no dolo** (CAROU art. 213 num. 2 → reducción de hasta 50%).
4. Las infracciones aduaneras (salvo contravención) las juzga el **Juzgado Letrado de Aduana** (CAROU art. 227),
   no la DNA. La contravención (multa de **400 a 4.000 UI**, CAROU art. 200) sí la aplica la DNA.

**Plazo.** **10 días hábiles** de vista previa (Ley 20.446 art. 632).

**A quién reclamar.** **DNA** (descargo administrativo) → **Juzgado Letrado de Aduana** (CAROU art. 227) si va a
infracción. Considerá **asesoramiento letrado** en este bucket: acá se juega una multa del doble de los tributos.

**Documento requerido.** Escrito de descargo + prueba de uso personal + factura + comprobante de pago.

**Plantilla:** usar la de `franquicia-agotada` (§4.5), agregando al petitorio:
```
En subsidio, y para el caso de mantenerse la imputación, se solicita la reducción de la multa hasta
un 50% conforme al numeral 2 del artículo 213 de la Ley 19.276 (Código Aduanero), por haberse actuado
con culpa y no con dolo, extremo que surge de la documentación acompañada.
```

---

### 4.10 `encomienda-regalo` — "Un familiar me manda algo del exterior"

**Norma.** **Ley 20.446 art. 628** (inciso final): *"También quedarán **exentas del pago de todo tributo** los envíos
postales internacionales con similares características que contengan **obsequios familiares**."*

**Definición — Decreto 50/026 art. 3**: es obsequio familiar el envío que cumple **las cuatro** condiciones:
1. **no comercial entre las partes**;
2. **remitido y consignado por personas físicas**;
3. mercadería en **cantidades razonables**, nueva o usada;
4. para **uso o consumo personal** del destinatario y **sin fines comerciales**.

**⚠ Las dos trampas:**
1. **El regalo CONSUME tu franquicia.** Decreto 50/026 art. 3 inc. 2: el valor de los envíos exonerados
   *"se imputará al cupo anual establecido para la franquicia, **consumiendo el monto correspondiente**"*.
   → Un regalo de USD 300 te deja USD 500 y **2 envíos** para el resto del año.
2. **Pero NO te exige tarjeta.** El requisito de pago con tarjeta del **Decreto 50/026 art. 4 lit. d)** dice
   *"**en caso que la encomienda contenga una compra**"* — un regalo no lo es. Y **RG DNA 10/2026 num. 4** lo confirma:
   *"la información del segmento 'Mecanismos de Pago' **no será obligatoria** para aquellos usuarios que reciban
   únicamente envíos que se correspondan con **obsequios familiares**"*.

**Procedimiento:**
1. Que el remitente sea una **persona física** (no una empresa, no una tienda). Si el "regalo" lo despacha un comercio,
   deja de ser obsequio familiar.
2. Como **no hay factura**, el valor sale de la **declaración de valor** (Decreto 50/026 art. 5).
   La DNA pide el **Formulario Declaración de Valor** (`dna-retenidos`).
3. Contá el envío contra tu cupo: **consume franquicia** (monto **y** uno de los 3 envíos).
4. Si te lo retienen → procedimiento de `retenido` (§4.1), presentando **declaración de valor** en lugar de factura.
5. Si el contenido requiere permiso (medicamentos, alimentos, electrónica con RF) → `prohibido-o-restringido` (§4.7).
   El carácter de regalo **no saltea** al MSP/URSEC/MGAP.

**Plazo.** Los generales de retención/abandono (30/90 días desde el ingreso — Ley 20.446 art. 631).

**A quién reclamar.** **DNA**.

**Documento requerido.** **Declaración de valor** (formulario DNA) + cédula + guía. **No** hace falta comprobante de pago
con tarjeta.

**Plantilla:** usar la de `retenido` (§4.1), reemplazando el punto 2 por:
```
2. Que el envío constituye un OBSEQUIO FAMILIAR en los términos del artículo 3 del Decreto 50/026:
   se trata de un envío no comercial entre las partes, remitido y consignado por personas físicas, que
   contiene mercadería en cantidades razonables para mi uso personal y sin fines comerciales. Acompaño
   la correspondiente Declaración de Valor, no existiendo factura de compra por tratarse de un
   obsequio. Conforme al numeral 4 de la Resolución General DNA N° 10/2026, la información sobre
   medios de pago no resulta exigible en este caso.
```

---

### 4.11 `demora-extrema` — "30+ días, el tracking no se mueve"

**Norma.** **No existe un plazo legal de entrega para un envío internacional.** No lo inventamos.
Lo que **sí** existe:
- **Decreto 209/017 art. 3 lit. j)**: el **envío expreso o courier** se define por *"un **plazo preestablecido de entrega
  menor a la norma**"* del operador, y debe tener **rastreo o seguimiento desde la admisión hasta la entrega**.
  → **El plazo que te obliga es el que el operador prometió.** Ése es el incumplimiento.
- **Decreto 209/017** (condiciones de prestación): la información de **cada evento de trazabilidad** debe publicarse en
  la web del operador **dentro de las 24 horas** de ocurrido.
- **Ley 19.009 art. 18**: los prestadores deben asegurar **continuidad, regularidad y calidad** del servicio.
- **Res. URSEC 185/016 art. 6**: deben atender **gratis** las reclamaciones por *"incumplimiento de las normas de calidad
  del servicio **o cualquier otro incumplimiento** relacionado con la prestación de los servicios postales"*.
- **Ley 17.250 art. 12**: la oferta (el plazo publicado al comprar el envío) **vincula** a quien la emite.

**⚠ La causa más común de la demora no es el courier:** si el envío está **retenido por la DNA**, el courier **no responde**
(**Res. 185/016 art. 16 lit. e**: *"retención del envío por orden del Poder Judicial, o cualquier otra interrupción del
curso del proceso postal por parte de organismos públicos competentes"*). **Primero averiguá cuál de los dos es.**

**Procedimiento:**
1. **Determiná dónde está trabado.** Si el tracking dice retenido/en aduana → es `retenido` (§4.1), y el reloj que corre
   es el de **abandono a los 90 días desde el ingreso al país** (Ley 20.446 art. 631). **Esto es urgente.**
2. Si es demora del operador: presentá **reclamación formal ante el courier** (Res. 185/016 art. 6). Exigí
   **número de referencia** (art. 9).
3. El operador debe darte **respuesta preliminar en 15 días corridos** y **resolución final en 90 días corridos**
   (envío internacional) — Res. 185/016 art. 11.
4. **Vencido el plazo sin respuesta**, el art. 14 es explícito: *"Todos los plazos son perentorios y su vencimiento sin
   respuesta, **habilita continuar con las instancias siguientes**"*.
5. **Escalá a URSEC** dentro de los **30 días corridos** (art. 13). Trámite: `ursec-reclamo`. URSEC resuelve en
   **60 días corridos** y puede sancionar al operador (**Ley 19.009 art. 33**: multa de **5.000 a 500.000 UI**,
   suspensión de actividades, pérdida de licencia).
6. Si el envío **nunca llega**, deja de ser demora y pasa a ser **pérdida** → `roto-o-incompleto` (§4.3), con la
   indemnización tasada de los arts. 22-23.

**Plazo.** ⚠ **90 días desde el ingreso al país** → abandono (Ley 20.446 art. 631 num. 2). **Ése es el plazo que te puede
costar el paquete entero**, y corre aunque estés esperando respuesta del courier.
Para escalar a URSEC: **30 días corridos** desde la resolución final del operador (o desde que venció su plazo).

**A quién reclamar.** **1º el courier** (obligatorio, Res. 185/016 art. 13) → **2º URSEC**.
Si está retenido en Aduana: **DNA**, y no hay reclamo postal que valga.

**Documento requerido.** Capturas del tracking con fechas + la oferta/plazo prometido al contratar + guía.

**Plantilla (reclamación por demora al courier):**
```
[CIUDAD], {{fecha}}

[OPERADOR POSTAL / COURIER]
Ref.: RECLAMACIÓN — demora en la entrega — envío {{tracking}}

Quien suscribe, [NOMBRE], CI [CI], presenta RECLAMACIÓN conforme al artículo 6 del Reglamento de
Reclamaciones e Indemnizaciones del Servicio Postal (Resolución URSEC N° 185/016), y DICE:

1. Que el envío {{tracking}} fue admitido el {{fecha}}, bajo la modalidad de envío expreso o courier,
   con un plazo de entrega ofrecido de [PLAZO OFRECIDO].

2. Que a la fecha el envío no ha sido entregado y el sistema de trazabilidad no registra eventos desde
   el {{fecha}}. {{descripcion}}

3. Que el artículo 3 literal j) del Decreto 209/017 define al envío expreso o courier por su plazo
   preestablecido de entrega y su rastreo desde la admisión hasta la entrega, y que el artículo 12 de
   la Ley 17.250 dispone que la oferta vincula a quien la emite.

PETITORIO:
a) Se me expida número de referencia de esta reclamación (artículo 9 del Reglamento).
b) Se informe la ubicación y el estado real del envío, y si el mismo se encuentra retenido por la
   Dirección Nacional de Aduanas.
c) Se emita respuesta preliminar dentro de los 15 días corridos y resolución final dentro de los 90
   días corridos previstos por el artículo 11 del Reglamento.

Se deja constancia de que, vencidos dichos plazos, la controversia será sometida a conocimiento de la
URSEC conforme al artículo 13 del Reglamento y al artículo 37 de la Ley 19.009.

[FIRMA] — [NOMBRE] — CI [CI] — [TELÉFONO] — [EMAIL]
```

---

### 4.12 `mudanza-y-viajero` — "Traer la notebook en la valija / mudarme de vuelta"

**Son dos regímenes distintos. No mezclarlos.**

#### (a) Equipaje de viajero — Decreto 139/014 + Decreto 43/019

Ya verificado en `/franquicia-viajero-uruguay` (reutilizar sus fuentes):
- **Franquicia: USD 500** (aérea/marítima) / **USD 300** (frontera terrestre) — Decreto 43/019 art. 1.
- **Una vez por mes** — Decreto 139/014 art. 9.
- **50% sobre el excedente** — Decreto 139/014 art. 13.
- **Sin despachante** — CAROU art. 15 lit. B (*"Equipajes de viajero"*).
- **El test es cualitativo** — Decreto 139/014 art. 1: equipaje es lo destinado a uso o consumo personal
  *"siempre que por su **cantidad, naturaleza o variedad** no permitieren presumir que se importan … con fines
  comerciales o industriales"*. **No hay número.**
- Traer bienes **de tu profesión o estudio** está expresamente contemplado (Decreto 139/014 art. 3) — **no** te saca
  automáticamente del régimen de equipaje.
- Si ocultás el bien → **contrabando**, con sanciones acumulativas (CAROU art. 211).

#### (b) Mudanza de uruguayo que retorna — Ley 18.250 art. 76

*(redacción vigente dada por Ley 19.996 art. 352)*
Todo uruguayo con **más de 2 años de residencia en el exterior** que decida **residir definitivamente** en el país puede
introducir, **por única vez**, **libre de todo trámite cambiario y exento de toda clase de derechos de aduana, tributos o
gravámenes conexos**:
- **A)** los **bienes muebles y efectos que alhajan su casa habitación** (menaje);
- **B)** las **herramientas, máquinas, aparatos e instrumentos** vinculados con el ejercicio de su **profesión, arte u oficio**;
- **C)** **un vehículo automotor** de su propiedad — **no transferible por 2 años** desde su empadronamiento.

*"En las operaciones previstas en este artículo **no será preceptiva la intervención del Despachante de Aduana**."*
(Concordante: CAROU art. 15 lit. E.)

**Procedimiento (mudanza):**
1. **Se inicia en el Consulado uruguayo del país donde residís**, acreditando **2 años** de residencia y certificando
   la **lista de bienes**. Trámite: `mudanza-tramite`.
2. Es **por única vez**. No se fracciona en varios envíos a conveniencia.
3. **No** necesitás despachante (Ley 18.250 art. 76 in fine).

**Plazo.** Sin plazo legal para el trámite. El requisito temporal es de **2 años de residencia previa** en el exterior.

**A quién reclamar.** **Consulado** (inicio) → **DNA** (despacho).

**Documento requerido.** Certificación consular de residencia (2 años) + **lista de bienes certificada**.

**Plantilla:** este bucket es **preventivo**, no de reclamo. No corresponde plantilla de reclamo; la página debe ofrecer
la **checklist** en su lugar. (Si el bien es retenido, aplica la plantilla de `retenido`, §4.1.)

---

## 5. Los canales de reclamo — qué puede y qué NO puede cada uno

**Una guía que manda a la persona al escritorio equivocado es peor que no tener guía.** Esta tabla es normativa.

| Organismo | Intake verificado | **Puede** | **NO puede** |
|---|---|---|---|
| **El courier / operador postal** | Su propio canal. Es **obligatorio agotarlo primero** para ir a URSEC (Res. 185/016 art. 13). Debe ser **gratuito** (art. 6-7) y darte **recibo/nº de referencia** (art. 9). | Indemnizar pérdida/hurto/destrucción/deterioro (art. 15). Responder en 15 días (preliminar) / 90 días (final internacional). | **Liberar un envío retenido por la DNA.** **Responder por lo que pasó mientras Aduana lo tenía retenido** (art. 16 lit. e). Bajarte un tributo. |
| **DNA / Aduanas** | **Envíos retenidos:** exclusivamente **por agenda previa**, presencial → `dna-retenidos`. **Denuncias** (faltas, infracciones, delitos aduaneros, Código de Conducta): `dna-denuncias`, en línea, **0800 1855**, L-V 9-18h. Consultas: **2915 0007**, `info@aduanas.gub.uy`, `centrodeatencionalusuario@aduanas.gub.uy`. | Liberar la mercadería, liquidar tributos, recibir tu **descargo en la vista de 10 días hábiles** (Ley 20.446 art. 632), aplicar/levantar la **contravención** (CAROU art. 200), declarar el abandono (art. 631). | **Fijar o controlar las tarifas del courier.** **Levantar una prohibición del MSP/URSEC/MGAP.** Juzgar infracciones aduaneras distintas de la contravención — **eso es del Juzgado Letrado de Aduana** (CAROU art. 227). |
| **URSEC** | `ursec-reclamo` (trámite gub.uy). Presencial: **Av. Uruguay 988**. **Sólo después** de agotar la instancia ante el operador, dentro de **30 días corridos** (Res. 185/016 art. 13). | Resolver **controversias** entre usuarios y operadores postales — **incluidos los courier** (Ley 19.009 art. 5 num. 4 y **art. 37**). Resolver en **60 días corridos**. **Sancionar** al operador: multa **5.000-500.000 UI**, suspensión, clausura, pérdida de licencia (Ley 19.009 art. 33). Abrir procedimiento si no te pagan la indemnización reconocida (art. 6 lit. G num. 3). | **Tocar un tributo o una decisión de Aduana.** Atenderte **antes** de que reclames al courier. Darte más indemnización que la tasada en los arts. 21-24 de la Res. 185/016. |
| **Área Defensa del Consumidor (MEF)** | `mef-dc-denuncia` (trámite gub.uy en línea — requiere usuario gub.uy **nivel intermedio/verificado**). **0800 7005**, L-V 9:30-16h. Presencial: **Av. Uruguay 948 esq. Río Branco**, L-V 9:30-15:30. | **Citar al proveedor** a instancia del consumidor (Ley 17.250 **art. 42 lit. F**) → conciliación. **Sancionar**: multa **20-4.000 UR**, decomiso, clausura hasta 90 días, suspensión en registros de proveedores del Estado (**art. 47**). Es el organismo correcto para **cobros no informados, publicidad engañosa y cláusulas abusivas** del courier o del intermediario (Tiendamia, USX…). | **Anular un tributo aduanero.** **Liberar un paquete.** **Obligar por sí sola a devolverte la plata** — sanciona e intermedia; la restitución forzada es vía judicial. Intervenir **si ya empezó la acción judicial**. |
| **Juzgado Letrado de Aduana** (Montevideo y Canelones; Juzgados Letrados de 1ª Instancia con competencia aduanera en el interior) | Vía judicial — con abogado. | Juzgar **todas las infracciones aduaneras salvo la contravención** (CAROU art. 227): defraudación, defraudación de valor, contrabando, abandono infraccional. Tramitar el **abandono no infraccional** judicial y recibir tu **oposición** (CAROU art. 99 num. 4). | Nada rápido ni gratis. |

**Regla de ruteo, en una línea:**
- **Es un tributo o una decisión de Aduana** → DNA (y, si hay infracción, Juzgado Letrado de Aduana).
- **El paquete llegó roto/incompleto/tarde, o no llegó** → **courier primero, URSEC después**.
- **Te cobraron algo que no te informaron** → **Defensa del Consumidor**.

---

## 6. Notas para Task 2 (`baseline.ts`)

1. **Reusar `app/utils/importRules.ts`** para todos los montos del régimen. No duplicar constantes: importar.
2. Los buckets `retenido`, `factura-exigida`, `roto-o-incompleto`, `cobro-abusivo`, `franquicia-agotada`,
   `supera-monto`, `prohibido-o-restringido`, `decomiso-subasta`, `comercial-vs-personal`, `encomienda-regalo`,
   `demora-extrema` van con **`verified: true`** y pasos completos.
3. **`mudanza-y-viajero` va `verified: true` para las dos mitades** (viajero: Decreto 139/014 + 43/019, ya verificado en
   el repo; mudanza: Ley 18.250 art. 76), **pero sin plantilla de reclamo** — es preventivo. Ver §7.5 para lo que sigue
   sin fuente (equipaje **no acompañado**).
4. Los montos en **UI** y **UR** deben renderizarse convertidos al valor vigente, no hardcodeados en pesos.
5. **El `general.dua_por_persona_por_anio = 2` sale con `verified: false`** o con una nota explícita de que la fuente es
   la página de la DNA y no una norma localizada (§7.4).

---

## 7. ⚠ UNVERIFIED — DO NOT PUBLISH

**Esto es un entregable de primera clase, no una disculpa.** Nada de lo que sigue puede escribirse en la página como hecho.

### 7.1 La base imponible del IVA
**Decreto 50/026 art. 3** somete las importaciones en franquicia a *"las disposiciones contenidas en el artículo 4° y en
el **literal B) del artículo 13 del Título 10 del Texto Ordenado 2023** (Impuesto al Valor Agregado)"*.
**No pudimos leer ese artículo.** IMPO no sirve el TO 2023 en una base direccionable
(`/bases/texto-ordenado-1996/t10/13` → **HTTP 404**).
→ **Sabemos que se paga IVA. NO podemos afirmar sobre qué base se calcula** (valor de factura, valor en aduana, valor
CIF + flete + seguro…), **ni publicar una tasa aplicada a una base concreta**. La calculadora **no debe** liquidar IVA
sobre una base inventada.

### 7.2 El registro público de vendedores exonerados
**RG DNA 09/2026, Anexo I num. 9**: *"El listado de empresas extranjeras registradas **será de carácter público** y estará
disponible para su consulta por parte de cualquier interesado, a través de **los medios que la autoridad determine y que
serán publicados oportunamente**."*
→ Al **2026-07-12 no existe ninguna URL publicada** de ese listado. Buscado en `aduanas.gub.uy` (portal EPI v/28219 y
sus 11 subpáginas) sin resultado.
→ **La página NO puede prometer "fijate si tu vendedor está registrado acá".** Debe decir que el registro existe por
norma, que a la fecha **no fue publicado**, y que por eso hoy **no hay forma de saberlo de antemano**.

### 7.3 Fecha real de exigibilidad del registro de vendedores
`SELLER_REGISTRY_ENFORCED_FROM = '2026-10-01'` (RG 21/2026 num. 1) es correcto **hoy**, pero **ya se postergó dos veces**
(RG 12/2026 → 1/7/2026; RG 21/2026 → 1/10/2026) y los **considerandos de la propia RG 21** admiten que *"resta aún cumplir
con varias etapas ineludibles"*.
→ **Una tercera prórroga es probable.** La página debe fechar el dato ("al 12/07/2026") y no afirmar que a partir del
1/10 **ocurrirá** algo.

### 7.4 "Hasta dos DUA por año" para personas físicas
La página de la DNA (`dna-regimen-general`, 09/01/2026) afirma: *"Las personas físicas podrán realizar únicamente hasta
dos Documento Único Aduanero (DUA) por año."*
→ **No localizamos la norma que lo establece.** No está en la Ley 20.446 (arts. 627-635), ni en el Decreto 50/026, ni en
el CAROU. Puede venir de una Orden del Día o RG anterior no identificada.
→ **Publicar sólo como "según la DNA", nunca como "la ley dice".**

### 7.5 Equipaje NO acompañado (mudanza parcial / "me mando la PC aparte")
CAROU art. 133 lit. B lo menciona, pero **no encontramos fuente primaria** que confirme si le aplica la misma franquicia
de USD 500 o un régimen distinto. Ya está declarado como no verificado en `/franquicia-viajero-uruguay` y **sigue sin
verificarse**. **No inventar una cifra.**

### 7.6 Despachante por encima de USD 800 — tensión normativa real
**CAROU art. 15 lit. A** exime de despachante preceptivo a los *"Envíos postales internacionales de carácter **no
comercial**"* **sin tope de valor**. La DNA, en cambio, exige despachante por encima de USD 800 (`dna-regimen-general`).
→ **Existe un argumento jurídico para discutirlo, pero la DNA no lo aplica.**
→ La página **debe decir que hace falta despachante** (es lo que le va a pasar al lector) y **puede** mencionar la tensión
como nota, **jamás** recomendar prescindir del despachante.

### 7.7 Lo que NO tiene norma, y hay que decirlo así
- **"¿Por qué me retienen a mí y no a otro?"** — La DNA dice *"selectivo o **aleatorio**"* (`dna-retenidos`) y **no publica
  los criterios de selectividad**. **No hay un número de compras ni un monto que "dispare" la retención.** Cualquier
  regla que circule ("después de la tercera te revisan") es folklore.
- **"Cantidades razonables" / "uso personal"** — **no hay número en ninguna norma** (Decreto 50/026 arts. 3 y 4 lit. b;
  Decreto 139/014 art. 1). Es un estándar cualitativo aplicado caso a caso.
- **Prohibición de juguetes sexuales** (hilo de 2024, 79 comentarios) — **no localizamos norma alguna** que los prohíba.
  Si entra en la página, es como **reporte de usuarios**, jamás como norma.
- **Tarifas de gestión/almacenaje del courier** — **ninguna norma las tarifa.** Son precio contractual. Sólo se atacan
  por vía de consumo (Ley 17.250), no por "exceden el máximo legal": **no existe máximo legal**.

---

## 8. Verificación

- **43/43 URLs de la tabla de fuentes** devuelven **HTTP 200** (chequeadas el 2026-07-12).
- **RG 09/2026** leída íntegra (8 páginas) **renderizando el escaneo a imágenes** — no por extracción de texto,
  que devuelve 8 bytes.
- **Decreto 50/026** leído íntegro (arts. 1-20) desde IMPO.
- **Ley 20.446 arts. 627-635** leídos íntegros desde IMPO.
- **Res. URSEC 185/016** leída íntegra (Anexo, arts. 1-29) desde IMPO.
- **CAROU** arts. 14, 15, 98, 99, 140, 141, 200, 201, 204, 205, 207, 209, 213, 223, 227 leídos desde IMPO.
- Ninguna cifra proviene de una nota de prensa, de Reddit ni de `v/27950`.

# Auditoría de dudas de aduana en r/uruguay y cobertura del sitio

Fecha de revisión humana: **2026-07-26**

## Resultado

Se creó un catálogo único de **94 preguntas y respuestas** en
`/preguntas-frecuentes-aduana-uruguay`, agrupado en siete intenciones. Cada respuesta enlaza las
fuentes que la sostienen y se marca como **norma**, **procedimiento oficial** o **zona gris**.
Reddit se utilizó para encontrar preguntas, expresiones y casos faltantes; nunca como fuente de
derecho.

Estado de la cosecha al cierre:

- publicaciones únicas en `aduana_reddit_posts`: **1.443**
- comentarios únicos en `aduana_reddit_comments`: **25.709**
- rango de las publicaciones guardadas: **22 de febrero de 2013 a 26 de julio de 2026**
- hilos candidatos con una pregunta o pedido de ayuda aduanero: **540**

Los hilos candidatos son un filtro determinista de alta cobertura sobre título y cuerpo. No son
una clasificación jurídica: las búsquedas amplias de Reddit también devuelven noticias, discusión
política y falsos positivos. Las preguntas semánticamente repetidas se consolidaron en una sola
respuesta; no se trasladaron afirmaciones de usuarios como hechos.

El alcance es todo lo que la API OAuth de Reddit devolvió como buscable para esas consultas al
momento de la cosecha. Reddit limita cada consulta a 1.000 resultados; publicaciones eliminadas,
privadas, no indexadas o fuera de ese límite no son recuperables por esta vía. No se presenta el
corpus como una copia absoluta de contenido que Reddit ya no expone.

## Cómo se actualizó Reddit

1. Se autenticó contra la API OAuth de Reddit con `REDDIT_CLIENT_ID`,
   `REDDIT_CLIENT_SECRET` y `REDDIT_USER_AGENT` del entorno.
2. La primera pasada buscó todo el historial disponible de r/uruguay con las diez consultas
   periódicas del job (`aduana`, `paquete retenido`, `despachante`, `DUA`, `importar`, etc.).
3. Una segunda pasada añadió 24 consultas largas para vocabulario que no siempre contiene
   “aduana”: plataformas, impuestos, tarjetas, vendedores, regalos, productos controlados,
   viajeros, extranjeros, uso comercial, retenciones y pérdidas.
4. La búsqueda pagina hasta 1.000 resultados por consulta, deduplica por `redditId` y acumula las
   consultas que hicieron aparecer cada hilo.
5. Los comentarios se recorren con las ramas `morechildren`, se limitan a 2.000 por hilo y se
   deduplican por `commentId`. El cliente serializa solicitudes y espera como mínimo 1,2 segundos
   para respetar el límite de Reddit.

Comando reproducible:

```powershell
npm.cmd run harvest_aduana_reddit
npm.cmd run harvest_aduana_reddit -- --supplemental
```

El job semanal conserva la consulta corta y el rango anual para no convertir una actualización
incremental en una recosecha histórica.

## Matriz de cobertura

| Intención consolidada | Dudas encontradas en el corpus | Lugar principal del sitio |
|---|---|---|
| Antes de comprar | documento uruguayo, menor/extranjero, titular de tarjeta, PayPal/prepagas/dinero electrónico, privacidad, registro del usuario, vendedor de EE.UU., origen real, franquicia ajena, cambio de dirección/destinatario y cantidad de unidades | FAQ central + `/franquicia-aduana-uruguay` |
| Franquicia e impuestos | US$ 800, tres envíos, varios usos en un mes, país de compra, US$ 200/TIFA, IVA, 60% y mínimo US$ 20, factura/flete/seguro, descuentos, gift cards, saldo insuficiente, paquetes divididos, fecha del cupo y 20 kg | FAQ central + calculadora de importación |
| Correo, courier y plataformas | correo común/EMS/courier, quién declara, tracking no reconocido, cargos del operador, objetos propios sin factura, Amazon Global, Temu, AliExpress, Tiendamia, consolidación y regalos | FAQ central + `/declarar-compra-exterior-uruguay` |
| Productos y permisos | celulares/Wi-Fi/drones, salud, cosméticos, alimentos/semillas, baterías, armas/réplicas/cuchillos, juguetes sexuales, PC/consolas, alcohol/tabaco/vape, usados, óptica/higiene, neumáticos/sillas infantiles/repuestos, reparación/garantía, vinilos/Blu-ray y vehículos | FAQ central + organismo competente enlazado |
| Retenciones y reclamos | control aleatorio, documentos y tarjeta, despacho simplificado, agenda, valoración, sanciones, abandono/remate, devolución, almacenaje, tracking, daño, faltantes y pérdida | FAQ central + `/problemas-con-la-aduana-uruguay` |
| Viajeros y mudanzas | franquicia de equipaje, excedente, dispositivos usados, varias unidades, herramientas profesionales, equipaje no acompañado, retorno y turista extranjero | FAQ central + `/franquicia-viajero-uruguay` |
| Comercial y DUA | reventa, empresa/RUT, NCM, carga no postal, prestación única comercial, más de US$ 800/20 kg, despachante, supuesto máximo de dos DUA, importar sin RUT y herramientas del negocio | FAQ central + guía de declaración |

## Huecos y contradicciones corregidos

1. **No existía un lugar único y buscable.** Las respuestas estaban repartidas entre calculadora,
   guía de franquicia, guía de declaración, problemas y viajeros. El hub nuevo permite buscar por
   producto, plataforma, monto o síntoma y filtrar por intención.
2. **La lista de vendedores se describía como no publicada.** Aduanas ya muestra seis empresas en
   la página vigente del régimen. El sitio ahora fecha esa fotografía y enlaza la lista oficial,
   que puede cambiar.
3. **Los datos del medio de pago estaban incompletos.** El Comunicado 11/2026 pide banco o
   plataforma, sello, últimos cuatro dígitos, tipo y vencimiento. La respuesta oficial de julio
   aclara que Aduanas no recibe historial de compras, montos, fechas ni comercios del emisor.
4. **La liberación de un retenido se presentaba como siempre presencial.** La RG DNA 14/2026
   contempla despacho presencial, declaración previa y despacho simplificado para ciertos envíos
   de operadores privados. La vía simplificada la solicita el operador y no sirve si hay que
   modificar la guía, reliquidar o investigar una infracción.
5. **La calculadora afirmaba que “la franquicia no se parte” y una FAQ citaba erróneamente el
   artículo 15.** No se localizó una disposición que regule el saldo insuficiente. La calculadora
   conserva una estimación prudente sobre el envío entero, pero ahora la marca como no verificada
   y recomienda pedir el fundamento escrito al operador.
6. **Baterías y listas de productos se expresaban como prohibiciones absolutas.** Aduanas explica
   que las baterías de litio sueltas tienen restricciones IATA/ICAO y que cada transportista
   decide si las acepta. También dice que la lista de productos es orientativa y no taxativa.
7. **Faltaban entradas directas para búsquedas reales.** Se añadieron, entre otras, preguntas sobre
   peso mayor a 20 kg, varios usos en un mismo mes, país de compra, franquicia ajena, PayPal y
   prepagas, cambios en la guía, cargos de DHL/courier, objetos sin factura, reparación o garantía,
   óptica e higiene, neumáticos/sillas infantiles/repuestos, NCM, empresa/RUT, carga no postal,
   vendedor extranjero, producto usado, vinilos/Blu-ray, vehículos, estado de cuenta y paquete ya
   declarado en abandono o remate.

## Zonas grises que el sitio no convierte en certezas

- No existe una cantidad numérica oficial que separe uso personal de finalidad comercial.
- No se encontró una regla expresa para dividir un envío entre saldo de franquicia y prestación
  única.
- No se encontró una prohibición específica de juguetes sexuales; la lista oficial tampoco es
  taxativa y el material o funcionamiento concreto puede activar otra restricción.
- No se localizó una tarifa máxima legal para almacenaje o gestión de un courier.
- La regla de actualización de tracking cada 24 horas no se verificó para envíos internacionales.
- La vista de diez días de la Ley 20.446 refiere al procedimiento sancionatorio; no se presenta
  como recurso universal contra cualquier valoración.
- Aduanas publica “hasta dos DUA por año” para personas físicas, pero no se localizó la norma que
  crea ese cupo.
- La página operativa exige despachante en régimen general, mientras normas de mayor jerarquía
  contienen excepciones amplias para EPI no comerciales. Se muestra el conflicto y no se aconseja
  operar sin despachante.
- No se verificó una regla primaria que permita afirmar que el equipaje no acompañado conserva
  automáticamente la misma franquicia del equipaje acompañado.

## Fuentes oficiales nuevas o revalidadas

- [Decreto 50/026](https://www.impo.com.uy/bases/decretos/50-2026)
- [Régimen vigente y empresas extranjeras registradas](https://www.aduanas.gub.uy/innovaportal/v/28221/1/innova.front/)
- [RG DNA 09/2026 — vendedores extranjeros](https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf)
- [RG DNA 10/2026 — identidad del usuario](https://www.impo.com.uy/bases/resoluciones-generales-aduanas-nd/10-2026)
- [Comunicado 11/2026 — campos del medio de pago](https://www.impo.com.uy/bases/comunicados-comercio-exterior-aduanas/11-2026)
- [RG DNA 14/2026 — envíos retenidos](https://www.aduanas.gub.uy/innovaportal/file/28482/1/rg-14-2026.pdf)
- [Comunicado 21/2026 — despacho simplificado operativo](https://www.aduanas.gub.uy/innovaportal/file/28551/1/comunicado-21_2026-del-despacho-simplificado-de-epi-retenidos.pdf)
- [RG DNA 21/2026 — exigibilidad desde octubre](https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf)
- [Productos controlados y restricciones de transporte](https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/)
- [Respuesta MEF/DNA sobre datos personales](https://www.gub.uy/ministerio-economia-finanzas/sites/ministerio-economia-finanzas/files/2026-07/Expediente-2026-5-1-0006449%20PI%20Salle%20Lorier%20referente%20a%20nuevo%20r%C3%A9gimen%20de%20env%C3%ADos%20postales%20internacionales.pdf)

# Uruguay lender research — sourced data for `/prestamos-uruguay`

Access date: 2026-06-19. Currency UYU unless noted. `teaPct` is the representative **advertised
"desde" / published** annual effective rate where an entity publishes one; `null` when no figure is
verifiable from an accessible source (the page renders it as "Consultar"). Many Uruguayan lenders
publish rates only inside a binary PDF or after a credit simulation — those stay `null` per the
sourcing rule. Financieras/fintech TEAs are high by design in Uruguay (BCU usury caps run well above
100% for small short loans). All rates are **references, verified June 2026**; confirm the final
CFT/TEA with the lender.

> ID collision note: "Pronto+" (fintech research) and "Pronto!" (financiera research) are the **same
> company** (Scotiabank's consumer-credit arm). It appears **once**, as a `financiera` with id
> `pronto`. Verticot and Emprendamos were **dropped** — no verifiable Uruguayan entity found.

## Catalog-ready table (transcribe into `app/utils/loans.ts` `LENDERS`)

| id | name | type | teaPct | currency | maxAmount | maxTermMonths | online | rating | website |
|----|------|------|--------|----------|-----------|---------------|--------|--------|---------|
| brou | BROU (Banco República) | banco | null | UYU | null | 60 | true | null | https://www.brou.com.uy |
| itau | Itaú Uruguay | banco | 39 | UYU | 1500000 | 48 | true | null | https://www.itau.com.uy |
| santander | Santander Uruguay | banco | null | UYU | null | 60 | true | null | https://www.santander.com.uy |
| scotiabank | Scotiabank Uruguay | banco | 36 | UYU | null | 48 | true | null | https://www.scotiabank.com.uy |
| bbva | BBVA Uruguay | banco | 36 | UYU | null | 24 | true | null | https://www.bbva.com.uy |
| hsbc | HSBC Uruguay | banco | null | UYU | null | 60 | true | null | https://www.hsbc.com.uy |
| creditel | Creditel | financiera | null | UYU | 636000 | 48 | true | 4.4 | https://www.creditel.com.uy |
| pronto | Pronto! | financiera | 49 | UYU | 600000 | 48 | true | null | https://www.pronto.com.uy |
| oca | OCA | financiera | 39 | UYU | 400000 | 36 | true | 4.0 | https://oca.uy |
| crediton | Crediton | financiera | null | UYU | 150000 | 36 | true | null | https://www.crediton.com.uy |
| microfin | Microfin | financiera | null | UYU | 150000 | 24 | true | 4.0 | https://microfin.com.uy |
| republica-microfinanzas | República Microfinanzas | financiera | null | UYU | 18000 | 18 | true | null | https://www.republicamicrofinanzas.com.uy |
| credito-de-la-casa | Crédito de la Casa | financiera | null | UYU | null | null | true | null | https://solicitar.creditodelacasa.com.uy |
| verde-fucac | Verde (ex-FUCAC) | cooperativa | 28 | UYU | 500000 | 48 | true | null | https://verde.com.uy |
| anda | ANDA | cooperativa | 28.4 | UYU | null | 48 | true | null | https://anda.com.uy |
| acac | Cooperativa ACAC | cooperativa | 29 | UYU | 400000 | 48 | true | null | https://acac.com.uy |
| fucerep | FUCEREP | cooperativa | 37.8 | UYU | 1000000 | 84 | true | null | https://www.fucerep.com.uy |
| cofac | COFAC | cooperativa | 46 | UYU | 60000 | 15 | false | null | https://www.cofac.net |
| prex | Prex (Prextamo) | fintech | null | UYU | 50000 | 6 | true | 2.0 | https://www.prexcard.com/uy |
| midinero | Midinero | fintech | null | UYU | 250000 | 36 | true | 4.8 | https://www.midinero.com.uy |
| cash | Cash | fintech | 63.9 | UYU | 500000 | 48 | true | null | https://prestamocash.com.uy |
| pago-despues | Pago Después (ex-UinUin) | fintech | null | UYU | null | 32 | true | 4.8 | https://www.pagodespues.com.uy |
| payflex | PayFlex (adelanto de sueldo) | fintech | 0 | UYU | null | null | true | 4.3 | https://payflexapp.com |

## Per-lender detail (requirements, note, source, reviewsNote, reviewSources)

### Bancos

**brou** — req: ["Mayor de 18 años y residente", "Comprobante de ingresos / recibo de sueldo", "Cédula vigente", "Sin antecedentes negativos en el Clearing"]. note: "Tasa en PDF 'Tasas vigentes'; rango referencial 23–34% según modalidad (con/sin retención); cuota ≤35% del salario; eBROU bonifica ~1 punto. IVA aparte". source: https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-sin-retencion-en-pesos-ui-y-dolares. rating: null. reviewsNote: "Reputación institucional muy fuerte (mejor banco de Uruguay según The Banker 2023–2024 y ranking Merco); quejas por colas en sucursales". reviewSources: [{label:"The Banker — Mejor banco de Uruguay", url:"https://www.brou.com.uy/brou-el-banco-n-1-en-uruguay-segun-la-revista-the-banker"}, {label:"Ámbito — BROU mejor banco del país", url:"https://www.ambito.com/uruguay/el-brou-fue-reconocido-como-el-mejor-banco-del-pais-n5889927"}]

**itau** — req: ["Entre 18 y 70 años", "Ingresos líquidos mínimos $23.000", "Antigüedad laboral 12 meses", "Sin antecedentes en Clearing/BCU", "Cédula y último recibo"]. note: "TEA 39% publicada para préstamos preaprobados a cuenta-habientes con haberes en Itaú; sin haberes/plazos largos la tasa sube; amortizable online hasta $300.000 sin documentación". source: https://www.itau.com.uy/inst/preAprobados.html. rating: null. reviewsNote: "Reconocido por mejor experiencia digital bancaria en Uruguay (2024–2025); críticas a la atención telefónica". reviewSources: [{label:"Ahorrin — Bancos Uruguay", url:"https://www.ahorrin.app/bancos-uruguay"}, {label:"Google Play — App Itaú UY", url:"https://play.google.com/store/apps/details?id=com.uy.itau.appitauuypf&hl=en_US"}]

**santander** — req: ["Entre 18 y 85 años", "Ingreso líquido mínimo $7.500 (con haberes) / $10.000 (otros)", "Antigüedad 6 meses dependientes / 2 años independientes", "Cuota ≤25% del ingreso en pesos", "Tener o abrir cuenta Santander"]. note: "No publica TEA en la web ni en el manual de tarifas; se obtiene al simular o llamar. Sin gastos de otorgamiento ni administración; seguro de vida + desempleo incluido". source: https://www.santander.com.uy/todos-los-prestamos/prestamo-personal. rating: null. reviewsNote: "Valorado por no cobrar gastos de otorgamiento y por la cobertura de seguro; quejas por demoras en sucursales". reviewSources: [{label:"Ahorrin — Bancos Uruguay", url:"https://www.ahorrin.app/bancos-uruguay"}, {label:"PréstamosFrescos — Santander", url:"https://www.prestamosfrescos.com/uy/prestamos"}]

**scotiabank** — req: ["Entre 18 y 80 años", "Ingresos líquidos mínimos $15.000", "Antigüedad laboral 6 meses", "Cédula vigente", "Último recibo de sueldo o constancia de contador"]. note: "TEA ~36% en pesos (referencia concordante en comparadores; la web remite al simulador); ~10% en dólares; hasta 48 cuotas con haberes en Scotiabank". source: https://www.scotiabank.com.uy/Personas/Prestamos/Prestamo-Personal/prestamo-personal. rating: null. reviewsNote: "Bien valorado por Scotia Puntos y tarjetas premium; quejas por comisiones sin paquete activo y red de sucursales acotada". reviewSources: [{label:"Ahorrin — Bancos Uruguay", url:"https://www.ahorrin.app/bancos-uruguay"}, {label:"Trustpilot — Scotiabank", url:"https://www.trustpilot.com/review/scotiabank.com"}]

**bbva** — req: ["Entre 21 y 77 años", "Ingresos líquidos mínimos $20.000–$30.000", "Antigüedad 1 año dependientes / 3 años independientes", "Cédula vigente", "Último recibo o constancia de ingresos"]. note: "TEA ~36% en pesos (referencia concordante; la web de producto bloquea acceso directo); ~9% USD; ~12% UI; hasta $1.500.000 para perfiles calificados". source: https://www.bbva.com.uy/personas/productos/prestamos/prestamo-personal/personal.html. rating: null. reviewsNote: "Destacado por la app móvil con biometría; quejas por comisiones de mantenimiento sin nómina activa". reviewSources: [{label:"Ahorrin — Bancos Uruguay", url:"https://www.ahorrin.app/bancos-uruguay"}, {label:"Wikipedia — BBVA Uruguay", url:"https://en.wikipedia.org/wiki/BBVA_Uruguay"}]

**hsbc** — req: ["Entre 18 y 65 años (no superar 75 al vencimiento)", "Ingresos líquidos mínimos $20.000", "Antigüedad 6 meses (con haberes) / 2 años independientes", "Cédula, comprobante de domicilio y 3 últimas liquidaciones"]. note: "No publica TEA en página accesible (cartillas en PDF binario); hasta 60 cuotas. Operación en proceso de venta a BTG Pactual (cierre esperado 2.º semestre 2026)". source: https://www.hsbc.com.uy/prestamos/prestamo-personal/. rating: null. reviewsNote: "Percibido como banco premium con servicio personalizado pero red muy pequeña (5 sucursales); incertidumbre por la venta a BTG Pactual". reviewSources: [{label:"MercoPress — HSBC vende su operación uruguaya", url:"https://es.mercopress.com/2025/07/29/hsbc-vende-sus-operaciones-en-uruguay-a-un-importante-banco-brasileno"}, {label:"Wikipedia — HSBC Bank Uruguay", url:"https://en.wikipedia.org/wiki/HSBC_Bank_Uruguay"}]

### Financieras

**creditel** — req: ["Cédula vigente (puede ser 'a sola selfie' por app)", "Comprobante de ingresos", "Comprobante de domicilio", "Edad 18–80 años"]. note: "No publica TEA antes de solicitar; el simulador la muestra tras ingresar datos. Rango referencial 70–128% TEA (CalcuLatam mar-2026). Supervisada por BCU como IFNB". source: https://tramitesuruguay.com/prestamos/creditel-prestamos/. rating: 4.4. reviewsNote: "Valorada por agilidad y proceso digital; críticas por falta de transparencia de la tasa antes de firmar". reviewSources: [{label:"PréstamosFrescos — Creditel (4,4/5, 312 opiniones)", url:"https://www.prestamosfrescos.com/uy/prestamo/creditel"}, {label:"Loan-apps — Creditel", url:"https://uy.loan-apps.com/loan-apps-uruguay/creditel-sa"}]

**pronto** — req: ["Cédula uruguaya", "Comprobante de ingresos (algunos planes sin recibo)", "Mayor de 18 años", "Residencia en Uruguay"]. note: "Ejemplo oficial: $500.000 en 42 cuotas al 49% TEA + IVA. 'Desde 29% + IVA' con acreditación de sueldo; máximo regulatorio ~113%. Subsidiaria de Scotiabank, líder en crédito al consumo (>200.000 clientes, 37 sucursales). Híbrido app + sucursales". source: https://www.pronto.com.uy/tasa-29/. rating: null. reviewsNote: "Confiable y de respuesta rápida; críticas al costo real para perfiles sin acreditación de sueldo y a la estabilidad de la app iOS (App Store 3,7/5)". reviewSources: [{label:"App Store — Pronto (3,7/5)", url:"https://apps.apple.com/uy/app/pronto/id1114649717"}, {label:"Finango — reseñas Pronto", url:"https://finango.uy/prestamos/reviews/pronto"}]

**oca** — req: ["Cédula (verificación digital)", "Comprobante de ingresos", "Para montos >$50.000 puede pedir cesión de haberes o garante", "Edad mínima 18 años"]. note: "Publica ejemplos en su web: 'Préstamo Light' 39% TEA para $100.000–$400.000; rango 39%–87% + IVA. Comisiones de concesión/administración y seguro 0,25% mensual incluidos en la cuota. 100% digital, no afecta el disponible de tarjeta". source: https://oca.uy/prestamos/. rating: 4.0. reviewsNote: "Una de las mejores TEA del sector, buena experiencia digital, entrega ~48 h; alguna crítica por mora y atención". reviewSources: [{label:"Finango — reseñas OCA", url:"https://finango.uy/prestamos/reviews/oca"}, {label:"Loan-apps — OCA", url:"https://uy.loan-apps.com/loan-apps-uruguay/oca"}]

**crediton** — req: ["Cédula vigente", "Sin acreditación de haberes", "Aprobación crediticia", "Retiro en RedPagos"]. note: "TEA publicada en la solicitud: 75,4%–130,1% según monto ($4.000–$150.000 con Crediton Plus). Seguro obligatorio 0,25%/mes; sin penalidad por cancelación anticipada; 100% digital". source: https://www.crediton.com.uy/solicitar-prestamo/. rating: null. reviewsNote: "Proceso 100% digital y retiro inmediato en RedPagos; tasas altas reconocidas". reviewSources: [{label:"Crediton Plus — tasas", url:"https://www.creditonplus.com.uy/"}, {label:"CalcuLatam — préstamos UY", url:"https://calculatam.com/uy/prestamos"}]

**microfin** — req: ["Cédula uruguaya vigente", "Mayor de 21 años", "Comprobante de ingresos", "Sin antecedentes negativos", "Residencia permanente"]. note: "Rango referencial 70%–149,5% TEA según monto/plazo. Comisiones en UI; seguro de vida 0,6% sobre saldo; pagos en Abitab. Grupo ACP (Perú) con aval IDB/MIGA; supervisada por BCU". source: https://www.prestamosfrescos.com/uy/prestamo/microfin. rating: 4.0. reviewsNote: "4/5 con 511 opiniones; valorada por accesibilidad y atención cercana; tasas elevadas reconocidas". reviewSources: [{label:"PréstamosFrescos — Microfin (4,0/5, 511 opiniones)", url:"https://www.prestamosfrescos.com/uy/prestamo/microfin"}, {label:"MoneyGuru24 — Microfin", url:"https://uruguay.moneyguru24.com/info/microfin_uy/3219"}]

**republica-microfinanzas** — req: ["Cédula vigente", "Comprobante de domicilio", "Dos últimos recibos de sueldo", "Cuota ≤20% del ingreso neto"]. note: "Subsidiaria 100% del BROU; especializada en microempresas y familias de bajos ingresos. Línea para jóvenes 'MiCrédito' $3.500–$18.000 en 6–18 cuotas. TEA no publicada en el sitio; supervisada por BCU. Tel. 0800 6040". source: https://crediuruguay.uy/al-consumo/jovenes-republica/. rating: null. reviewsNote: "Sin reseñas de clientes en plataformas públicas; reputación institucional sólida por respaldo del BROU". reviewSources: [{label:"Uruguay Emprendedor — República Microfinanzas", url:"https://www.uruguayemprendedor.uy/institucion/republica-microfinanzas-sa/"}, {label:"Indeed — opiniones (empleados)", url:"https://uy.indeed.com/cmp/Republica-Microfinanzas-1/reviews"}]

**credito-de-la-casa** — req: ["Cédula uruguaya vigente", "Comprobante de ingresos", "Residencia en Uruguay"]. note: "Programa de financiamiento de consumo en punto de venta regulado por el MEF (publica tasas en PDF semestral). El sitio no expone tasas; topes legales BCU 70–132% TEA según tramo. TEA específica no verificable". source: https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/tasas-empresas-credito-casa-ano-2026. rating: null. reviewsNote: "Sin reseñas de clientes en plataformas públicas". reviewSources: [{label:"MEF — tasas Crédito de la Casa 2025", url:"https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/tasas-empresas-credito-casa-ano-2025"}]

### Cooperativas

**verde-fucac** — req: ["Asalariado, jubilado o pensionista", "Cédula vigente", "Recibo de sueldo / pasividad", "Comprobante de domicilio a su nombre", "Hacerse socio (cuota social mensual)"]. note: "TEA compensatoria 28%–32,5% (vigente jun-2026); mora 39%–45,5%. Ex-FUCAC (rebranding 2022), la mayor cooperativa de ahorro y crédito del país (~290.000 socios). Incluye seguros de vida, desempleo y hospitalización. Línea 'solo con cédula' $5.000–$30.000". source: https://verde.com.uy/conocenos_mas_transparentes.php. rating: null. reviewsNote: "Citada como la cooperativa más grande y confiable de Uruguay; reputación informal positiva; sin rating agregado público". reviewSources: [{label:"Credifama — préstamos Verde/FUCAC", url:"https://credifama.com.uy/prestamos-de-verde-nueva-propuesta-de-fucac/"}, {label:"Finanzas.com.uy — FUCAC", url:"https://finanzas.com.uy/prestamos-fucac-uy/"}]

**anda** — req: ["Ser socio (paga registro de socio)", "Cédula vigente", "Antigüedad laboral 6 meses (jubilados exonerados)", "Recibo de sueldo o pasividad", "Buen perfil crediticio (categoría 1c)"]. note: "Tasas publicadas como '% + IVA': préstamo personal 28,4%–33% + IVA (≈34,6%–40,3% con IVA). Asociación civil sin fines de lucro (fundada 1933, 200.000+ socios), supervisada por BCU. 'Préstamo Mudate' 25% + IVA con contrato de alquiler". source: https://anda.com.uy/prestamos/. rating: null. reviewsNote: "Una de las mutuales más antiguas del país; buena reputación por accesibilidad; sin rating agregado independiente". reviewSources: [{label:"Finango — reseñas ANDA", url:"https://finango.uy/prestamos/reviews/anda/"}, {label:"Ahorrar — sucursales ANDA", url:"https://ahorrar.com.uy/bancos/sucursales-de-anda-en-uruguay/"}]

**acac** — req: ["Ser socio (cuota social inicial ~$500)", "Cédula vigente", "Comprobante de domicilio", "Dos últimos recibos de ingresos", "Evaluación crediticia (presta incluso en clearing)"]. note: "Con retención en nómina desde ~29% TEA; sin retención desde ~69% TEA. Fundada 1986, 250.000+ socios. Seguro de vida incluido; 'Préstamos Relámpago' desde $20.000; 6–48 cuotas. Sitio oficial devolvió 403; tasas de fuentes secundarias concordantes". source: https://creditoonline.uy/prestamos-cooperativa-acac-uruguay. rating: null. reviewsNote: "Recomendada para empleados públicos y jubilados; presta en clearing; reportes anecdóticos de inconsistencias de coordinación". reviewSources: [{label:"CréditoOnline — ACAC", url:"https://creditoonline.uy/prestamos-cooperativa-acac-uruguay"}, {label:"Cooperativas.com.uy — ACAC", url:"https://cooperativas.com.uy/guia/listings/cooperativa-acac/"}]

**fucerep** — req: ["Antigüedad laboral mínima 6 meses", "Ingreso neto mínimo ~$18.000", "Categoría 1c en el sistema financiero", "Cédula vigente y recibos", "Afiliación como socio"]. note: "TEA préstamo a plazo fijo 37,77%–40,32%; línea nómina (retención) ~25%. Fundada ~1972 por funcionarios del BROU. Máximo $1.000.000 / 84 cuotas; producto promocional '0% interés' (máx. $150.000, 36 cuotas). Sitio sin tasas públicas (cifras de Credifama)". source: https://credifama.com.uy/prestamos-fucerep-ventajas-y-como-solicitar/. rating: null. reviewsNote: "Nicho ligado a funcionarios del BROU; reputación sólida y confiable en prensa secundaria; sin rating agregado público". reviewSources: [{label:"Credifama — FUCEREP", url:"https://credifama.com.uy/prestamos-fucerep-ventajas-y-como-solicitar/"}, {label:"EMIS — perfil FUCEREP", url:"https://www.emis.com/php/company-profile/UY/Cooperativa_de_Ahorro_y_Credito_FUCEREP_en_1260097.html"}]

**cofac** — req: ["Ser socio (acciones sociales)", "Cédula vigente", "Comprobante de domicilio", "Dos últimos recibos", "Antigüedad 1 mes (público) / 1 año (privado)"]. note: "TEA ~46% para crédito estándar hasta 12 meses; rango $5.000–$60.000, 6–15 cuotas. Cooperativa pequeña-media con fuerte misión social (interior, Durazno). Cancelación anticipada tras pagar 30% de las cuotas". source: https://finanzas.com.uy/prestamos-cofac/. rating: null. reviewsNote: "Muy pocas reseñas públicas (5,0/5 con solo 2 votos en Opina — muestra no significativa); enfoque comunitario". reviewSources: [{label:"Opina — COFAC Durazno", url:"https://www.opina.com.uy/cooperativa-de-ahorro-y-credito/durazno/cofac-durazno_158701.php"}, {label:"Cooperativas.com.uy — COFAC", url:"https://cooperativas.com.uy/guia/listings/cofac/"}]

### Fintech / digitales

**prex** — req: ["Cuenta Prex activa y verificada", "Mayor de 18 años", "Aprobación crediticia interna (Socur/Floder S.A.)", "No exige recibo de sueldo ni garantías"]. note: "Crédito 'Prextamo' acreditado en la tarjeta prepaga Prex; 1–6 cuotas, $1.000–$50.000. TEA no publicada en T&C oficiales (solo comisión de concesión hasta 120 UI); fuentes terciarias citan 35–45% sin URL primaria → null". source: https://www.prexcard.com/terminos_de_uso/prextamoPaigo.html. rating: 2.0. reviewsNote: "Trustpilot 2/5 ('Poor', 69 reseñas): quejas por bloqueo de cuentas y atención; App Store en cambio 4,8/5 (79K)". reviewSources: [{label:"Trustpilot — Prex (2/5)", url:"https://www.trustpilot.com/review/www.prexcard.com"}, {label:"App Store — Prex (4,8/5, 79K)", url:"https://apps.apple.com/uy/app/prex-uruguay/id927400689"}]

**midinero** — req: ["21–85 años", "Cédula vigente", "Cobrar sueldo o BPS por Midinero ≥6 meses", "Ingreso mensual mínimo $5.000"]. note: "Préstamo 'MidineroYa' exclusivo para quienes cobran su sueldo/BPS por Midinero. TEA no divulgada; seguro de vida 0,25% mensual. Findarin S.A. / red RedPagos. Hasta $250.000 / 36 cuotas". source: https://www.midinero.com.uy/prestamos/. rating: 4.8. reviewsNote: "App Store 4,8/5 (18K) pero reseñas recientes reportan comisiones ocultas y restricciones en retiros". reviewSources: [{label:"App Store — Midinero (4,8/5, 18K)", url:"https://apps.apple.com/uy/app/midinero-app/id1263494371"}, {label:"Google Play — Midinero", url:"https://play.google.com/store/apps/details?id=com.midinero.mobile.myapp"}]

**cash** — req: ["Relación de dependencia o jubilado", "Mayor de 21 años", "Ingreso líquido mínimo $10.000", "Antigüedad laboral mínima 4 meses", "Aprobación crediticia"]. note: "TEA publicada por tramos: 63,9% (≤366 días, ≥10.000 UI) hasta 128,9% (>366 días, <10.000 UI). Solicitud web, retiro presencial (Abitab/RedPagos/sucursales). Concesión hasta 40 UI; seguro 0,6% mensual. 115.000+ socios". source: https://prestamocash.com.uy/prestamo. rating: null. reviewsNote: "Muy referenciada como 'confiable' en comparadores; sin rating agregado verificable de terceros". reviewSources: [{label:"Cash — opiniones (sitio oficial)", url:"https://prestamocash.com.uy/pagina/opiniones-sobre-cash"}, {label:"CalcuLatam — préstamos UY", url:"https://calculatam.com/uy/prestamos"}]

**pago-despues** — req: ["Aprobación crediticia interna (Floder S.A., supervisada por BCU)", "Cuenta bancaria propia", "La línea crece con el historial de uso"]. note: "Ex-UinUin; compras en cuotas sin tarjeta + préstamos en efectivo. TEA 0%–127% según perfil (0% en órdenes promocionales). 3–32 cuotas; ejemplo App Store $16.000 en 12 cuotas. uinuin.com.uy redirige a pagodespues.com.uy". source: https://www.pagodespues.com.uy/legales. rating: 4.8. reviewsNote: "App Store 4,8/5 (~4.000): útil y completa; minoría critica el recargo para los plazos largos". reviewSources: [{label:"App Store — Pago Después (4,8/5)", url:"https://apps.apple.com/uy/app/pago-despu%C3%A9s/id6450367871"}, {label:"Trámites y Consultas — UinUin/Pago Después", url:"https://tramitesyconsultas.org/prestamos-uin-uin-prestamos-100-online/"}]

**payflex** — req: ["El empleador debe estar registrado en PayFlex", "Acceso por app, sin aprobación crediticia individual", "Disponible 24/7"]. note: "No es préstamo tradicional: 'adelanto de sueldo' (earned wage access) sobre salario ya ganado, sin interés ni comisión para el trabajador (teaPct 0 informativo). Fundada 2023–2024, regulada por BCU, 15.000+ colaboradores en 35+ empresas". source: https://www.forbesuruguay.com/innovacion/payflex-como-funciona-startup-permite-adelantar-sueldos-uruguay-esta-proxima-cerrar-ronda-us-15-millones-n86456. rating: 4.3. reviewsNote: "Pocas reseñas pero entusiastas (App Store 4,3/5, muestra baja): resuelve llegar a fin de mes sin endeudarse". reviewSources: [{label:"App Store — PayFlex (4,3/5)", url:"https://apps.apple.com/uy/app/payflex/id6651822569"}, {label:"El Observador — PayFlex", url:"https://www.elobservador.com.uy/cafe-y-negocios/la-fintech-uruguaya-que-facilita-adelantos-sueldos-capta-inversion-y-se-expande-argentina-asi-funciona-n6034989"}]

## Excluded (do not add to catalog)

- **Verticot** — no verifiable Uruguayan lender under that name (not in BCU registry, no site, no press).
- **Emprendamos** — no verifiable Uruguayan credit entity; `emprendamos.uy` refused connection; `emprendamosfin.com` is Mexican.
- **Welp / Wenance** — ceased operating in Uruguay in 2024 (BCU ordered cessation + fine; insolvency).
  Source: https://www.busqueda.com.uy/Secciones/Denunciantes-dicen-que-Wenance-siguio-un-esquema-Ponzi-en-Uruguay-y-rechazaron-negociar-un-arreglo-uc60976

## Notes for the page disclaimer

- TEAs are advertised/reference and **exclude IVA on interest** for most entities; financieras/fintech
  rates are high by design and capped by BCU usury limits (tasas medias publicadas por el BCU).
- Banks rarely publish a TEA on a public HTML page (it lives in a PDF tarifario or behind a
  simulator) → most bank `teaPct` are `null` ("Consultar").
- Cooperativas require socio membership; note it.
- HSBC Uruguay is being acquired by BTG Pactual (closing expected 2H-2026).

## HTML-scrapable TEA assessment (for Task 5 `loanScraper.ts`)

Most rates are in binary PDFs, behind JS simulators, or only on third-party comparators — **not**
reliably scrapable from raw lender HTML. Candidate pages that render a TEA figure in plain HTML:

- **oca** — https://oca.uy/prestamos/ renders "39%" examples in HTML (worth a parser).
- **pronto** — https://www.pronto.com.uy/tasa-29/ renders the 49% TEA example in HTML.
- **cash** — https://prestamocash.com.uy/prestamo renders the tiered TEA table in HTML.

All others: leave to the seed value (no parser). If even these prove brittle on fetch, `TEA_PARSERS`
may stay empty and the page runs entirely off the verified seed — that is acceptable and honest.

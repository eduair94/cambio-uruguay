# Préstamos peer to peer en Uruguay — investigación (2026-08-17)

Notas de respaldo de `app/pages/prestamos-p2p-uruguay.vue` y `app/utils/p2pLending.ts`.
Todo lo que está en la página sale de acá; lo que no se pudo verificar quedó fuera y está listado
al final.

## 1. Las tres trampas de este tema

1. **El PDF de la Circular 2.307 es un escaneo sin capa de texto** (`bcu.gub.uy/Circulares/seggci2307.pdf`,
   8,4 MB, `pdftotext` devuelve 263 bytes de viñetas). El texto legible del régimen vigente es la
   **Recopilación de Normas de Regulación y Control del Sistema Financiero**
   (`Acerca-de-BCU/Normativa/Documents/Reordenamiento de la Recopilación/Sistema Financiero/RNRCSF.pdf`,
   última circular Nº 2.506 de 23.06.2026), que trae cada artículo con su circular al pie. Ese PDF
   sí es extraíble.
2. **El proyecto normativo del 09.08.2018 NO es la norma.** Numera distinto y dice cosas distintas.
   Diferencias que importan y que rompen a quien cite el borrador:
   | | Proyecto 2018 | Texto vigente |
   |---|---|---|
   | Prohibiciones | art. 125.18 | **art. 125.19** (el 125.18 vigente es "actividad de mediación") |
   | Gestión de cobro de vencidos | prohibida | **permitida** (art. 125.18 lit. d); lo prohibido es *operar* pagos y cobros y *adquirir* los créditos vencidos |
   | Quién puede prestar | sólo personas físicas residentes | residentes y **no residentes**; personas jurídicas no financieras; bancos, cooperativas, casas financieras, administradoras de crédito, empresas de servicios financieros, fondos de inversión (Ley 16.774) y fondos del exterior regulados |
   | Tope persona jurídica | UI 200.000 | **UI 1.000.000** |
   | Tope del prestamista | UI 80.000 / UI 20.000 por deudor | **UI 100.000 / UI 25.000** |
3. **"El BCU autorizó" es impreciso.** La ficha oficial de requisitos del BCU dice que estas
   empresas "no requieren autorización previa para funcionar, pero sí requieren Inscripción en el
   Registro". El acto es registral. (En crowdfunding sí es autorización: art. 93-BIS de la Ley
   18.627 exige aprobación previa de la SSF.)

## 2. Artículos verificados en la RNRCSF vigente

| Artículo | Contenido |
|---|---|
| 125.16 | Definición de EAPPP. No aplica a plataformas que sólo median entre no residentes |
| 125.17 | Sociedad de la Ley 16.060, socios personas físicas, acciones nominativas |
| 125.18 | Mediación: "se limitarán a aproximar a las partes sin asumir obligación o riesgo alguno". Demandantes residentes; oferentes residentes o no, en cuatro categorías. Fondos por el Sistema Nacional de Pagos (Ley 18.573 art. 3). Servicios admitidos: conservación de documentación, calificación crediticia, sugerir tasas, gestión de cobro de vencidos |
| 125.19 | Ocho prohibiciones (a–h), incluidas fondos de garantía, asegurar el retorno, matching automático, operar pagos y cobros, adquirir vencidos |
| 125.20 | Tercerización con autorización de la SSF |
| 125.21 | DEROGADO (Circular 2.337) |
| 125.22 | Registro previo + disposición transitoria de 4 meses para las ya instaladas |
| 125.23 | Información para la inscripción |
| 248.1 | Depósito a la vista en el BCU ≥ UI 50.000, "a efectos de atender las obligaciones con dicha Institución" |
| 338 | Usura: las comisiones de la plataforma integran la tasa implícita; los préstamos entre personas no entran en las exclusiones del art. 339 |
| 371 | Documento nominativo a favor del prestamista con cláusula "no a la orden" |
| 473.5 | Información a oferentes y solicitantes (incluye "historial crediticio o aclaración expresa de que no se dispone") |
| 473.6 | Límites de endeudamiento e inversión |
| 473.7 | Advertencia obligatoria: el prestamista asume la pérdida total o parcial |
| 484.1 | Divulgación pública, incluida la **morosidad promedio al cierre de cada mes** |
| 661.16 | Información trimestral de operaciones a la SSF |
| 719 / 720 / 720.1 / 720.3 | Multas (UI 150.000 por atraso registral; usura; instrumentos electrónicos desde 01.10.2026 por Circular 2.497) |
| 532, 533, 558, 604, 635 | Informantes de la Central de Riesgos: **las EAPPP no figuran** |

## 3. Cifras de mercado (fecha de verificación)

- **Topes de usura** (BCU, trimestre abr–jun 2026, vigentes desde 01.08.2026): consumo MN sin
  autorización de descuento 130,9285% (<UI 10.000, ≤366 días) y 63,5810% (≥UI 10.000); con
  autorización de descuento 32,7050%–38,4710%; USD 12,8030% y 19,0030%. Verificado recalculando
  media × 1,55.
- **UI**: 6,6350 al 17.08.2026 (INE).
- **Inflación**: 4,27% interanual a julio 2026 (INE). **Dólar**: $ 40,23 al 11.08.2026, +0,98% i.a.
- **Plazo fijo BROU** (vigencia 01.07.2026): pesos e-BROU 5,50% (367 d+), sucursal 4,13%; USD 2,80%;
  UI 1,70%; euros 0%.
- **Nota del Tesoro**: serie 32 en UI adjudicada el 04.08.2026 al **2,98% real**, exenta de IRPF;
  serie 13 en pesos el 21.07.2026 al 7,04%.
- **LRM**: 84 días al 5,9% (12.02.2026); cupo no competitivo del 20% en cada licitación.
- **COPAB**: UI 250.000 y US$ 10.000 por persona y por institución, sólo depósitos en IIF.
- **IRPF**: 12% ("restantes rentas", art. 37 lit. B del Título 7). Las EAPPP no están entre los
  agentes de retención del art. 39 del Decreto 148/007.

## 4. La historia uruguaya

- 2015–2017: Inversionate (≈300 usuarios), Prezzta (TIR proyectada 65% a dic-2016), TuTasa
  (fideicomiso con fondo de contingencia) y Socius, todas sin licencia. Hoy ninguna sigue: Prezzta
  pivoteó a SaaS de gestión de créditos; los dominios de Inversionate y Socius no resuelven y
  tutasa.com está estacionado.
- Abril 2016: la Asociación de Bancos Privados se reúne con el BCU (superintendente Juan Pedro
  Cantera) por la competencia no regulada.
- Junio 2017: Bergara, "está en la agenda, pero es un desafío que no tiene fácil solución".
- 09.08.2018 proyecto a consulta → 21.11.2018 resolución → 28.11.2018 vigencia (expediente 2018/1701).
- 17.12.2018: la Cámara Uruguaya de Fintech, el diputado Rodrigo Goñi y el presidente de la ANII
  piden dejar sin efecto la norma: "más que una regulación es una fumigación de las P2P Lending".
- 2019–2025: sin noticia pública de inscripciones.
- 04.01.2024: Crowder, primera (y única) plataforma de **financiamiento colectivo** autorizada;
  cuatro emisores registrados.
- 31.01.2026: default de la ON de Produits de France colocada por Crowder.
- 05.06.2026: Comunicación 2026/116, declaración jurada para quien convoque a invertir.
- 05.08.2026: El Observador informa que Prestapagos es la primera EAPPP.
- 01.10.2026: entra en vigencia el régimen de autenticación reforzada (Circular 2.497).

## 5. Casos uruguayos (ninguno era una EAPPP)

| Caso | Qué era | Números verificados |
|---|---|---|
| Wenance Uruguay | Cesión de cartera de préstamos | RR-SSF-2024-168 (02.04.2024): cese + multa de 13.000.000 UI; US$ 9,6 M en 438 operaciones (01.03.2020–31.05.2021); concurso con ~560 acreedores por ~US$ 20 M contra ~US$ 1,9 M de activo |
| Mercury | Cesión de créditos | Denuncia 15.11.2023: US$ 1.000.000 de ~70 inversores |
| Conexión Ganadera | Capitalización ganadera, ≥7% anual | Pasivo US$ 387 M, activo US$ 115 M, déficit US$ 272 M (verificación de créditos, julio 2026) |
| República Ganadera | Capitalización ganadera | >1.400 damnificados, ~US$ 95 M; 30.07.2026 el Juzgado de lo Contencioso Administrativo condena al BCU y al MGAP a indemnizar a cuatro inversores |
| Grupo Larrarte | Capitalización ganadera | Condena del 05.09.2025: 3 años y 8 meses; ~US$ 12 M, ~170 inversores |
| Produits de France | ON por crowdfunding (Crowder) | 5.240.000 UI al 8% en UI, ~300 inversores; default 31.01.2026; concurso voluntario 06.02.2026; asamblea 48,5%, sin mayoría |
| Plataformas de cheques | Descuento de cheques, sin registro BCU | TIR observada 8–10% USD / ~18% pesos; si rebota devuelven la comisión, no el capital |

## 6. El mundo

- **China**: de ~2.600 plataformas activas (2015) / 5.970 registradas (2017) a **cero** a mediados de
  noviembre de 2020; >5.400 colapsadas o problemáticas y >2 millones de inversores; ¥800.000 M
  (US$ 115.000 M) sin recuperar; Ezubao ¥59.800 M de >900.000 inversores, cadena perpetua.
- **Reino Unido**: Lendy y FundingSecure en administración (2019), RateSetter vendida a Metro Bank
  por £2,5 M iniciales, Zopa cierra su P2P (07.12.2021), Funding Circle cierra retail (2022);
  FCA PS19/14 con tope del 10% de activos invertibles. La FCA dice expresamente que el P2P **no**
  está cubierto por el FSCS.
- **Funding Circle**: objetivo Balanced 7,2% → 6–7% (29.06.2018); cosecha 2017 proyectada en 4,0–4,6%.
- **Mintos**: rendimiento neto realizado 2015–2024, con **−1,2% en 2022** y 4,3% en 2020.
- **EE.UU.**: LendingClub cierra Notes minoristas el 31.12.2020; SEC sanciona a su gestora y ex
  ejecutivos por US$ 4,265 M (28.09.2018).
- **Báltico**: Kuetzal y Envestio en quiebra (junio 2020) con investigación penal; Grupeer congelada.
- **LatAm**: Brasil 11 SCD contra 4 SEP a fines de 2019 y Nexoos pide cancelar su licencia SEP
  (18.05.2026); Argentina, registro del BCRA (2021) con la misma regla de no asumir riesgo.
- **Bank of Finland (BOFIT 27/2020, He & Li)**: sobreviven las plataformas grandes, con accionistas
  cotizados y mejor divulgación.

## 7. Lo que NO se publicó (y por qué)

- ~~Razón social, número de resolución y fecha de la inscripción.~~ **RESUELTO el 17.08.2026.**
  La pista estaba en un posteo de X del abogado Juan Diana (10.07.2026) que la investigación no
  pudo abrir (x.com devuelve HTTP 402); se leyó con `api.fxtwitter.com/JDiana91/status/2075698118755041493`
  y trae el enlace a la fuente primaria: **Comunicación N° 2026/135 del BCU (30.06.2026)**, que
  informa la **resolución SSF N° 2026-420 del 29.06.2026** por la que se inscribe a **FARISOUL S.A.**
  en el Registro de EAPPP (expediente 2025-50-1-00024, firma Juan Pedro Cantera). La resolución
  además deja constancia de que la empresa constituyó el depósito mínimo del art. 248.1 y cita los
  arts. 125.16 a 125.23, lo que confirma la numeración vigente usada en la página.
  **Lo que sigue sin fuente: que FARISOUL S.A. sea Prestapagos y que sea "la primera".** La
  resolución no dice ninguna de las dos cosas. La página publica los dos hechos por separado.
- **Que el registro haya estado vacío entre 2018 y 2026**: sólo hay ausencia de noticias, no
  constancia registral. La página dice "no hay noticia pública de ninguna inscripción".
- **Volúmenes y mora de las plataformas de 2015–2017**: nunca se publicaron. La causa del cierre de
  Inversionate proviene de un testimonio anónimo de Reddit y quedó fuera.
- **Tasa de supervivencia a cinco años del P2P a nivel global**: no existe un estudio publicado con
  esa métrica; se publican mortalidades observadas por jurisdicción.
- **Mora "típica" de una cartera P2P**: no hay fuente institucional. Por eso la calculadora pide el
  número al usuario y la página remite a la morosidad que el art. 484.1 obliga a publicar.

## 8. Método

Investigación en siete frentes paralelos con auditoría adversarial de cada afirmación (14 agentes),
más verificación propia contra fuente primaria: se descargó la RNRCSF vigente y se leyeron los
artículos citados con `pdftotext -layout`, y se verificó la UI del 17.08.2026 contra el PDF del INE.
Las correcciones de la auditoría que impactaron el contenido publicado fueron: numeración de las
prohibiciones (125.19, no 125.18), gestión de cobro permitida en el texto final, apertura de la
lista de oferentes, y el reencuadre de "autorizó" como inscripción registral.

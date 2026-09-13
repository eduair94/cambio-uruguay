# Tanda de contenido minado de Reddit — septiembre 2026

## Objetivo
Más visitas orgánicas. Páginas nuevas donde hay demanda medida y Google hoy contesta mal.

## Evidencia (medida el 2026-09-13)
- **Reddit (API app-only):** 9.416 hilos de 10 subs uruguayos (new + top año/mes + 12 búsquedas
  de pregunta por sub); 2.523 preguntas en tema, 473 desde el 2026-08-10.
- **Cola de demanda (APP DB `searchdemandqueues`, 2026-09-06):** autocompletado uruguayo con
  veredicto de SERP; los primeros puestos son SUCIVE (7 consultas), devoluciones, canasta BPS,
  bonos FONASA estando cesante, servicios fúnebres, comisión inmobiliaria, cédula para argentinos.
- **Search Console (2026-08-13 → 09-09):** 571.533 impresiones, CTR 0,46 %; el 53 % de las
  impresiones son de consultas cero-clic (cotización/conversión). La demanda ganable es de cola
  larga y de marca+intención ("usx cargo" 289 impr. sin página propia; "beneficios mastercard black
  itau").
- **Cobertura:** cada tema elegido se buscó en `app/utils` + `app/pages` antes de elegirlo. Se
  descartaron por ya cubiertos: reajuste del alquiler (`rentFaq.ts`), crédito por arrendamiento en
  IRPF (`rentGuide.ts`), dar de baja una tarjeta (`personalFinanceFaq.ts`), aguinaldo proporcional,
  embargo de sueldo, deudas de un fallecido.

## Parte A — 30 guías nuevas en `/guias/<slug>`
Datos puros en seis módulos nuevos (`guidesPagos.ts`, `guidesDeudas.ts`, `guidesTrabajoBps.ts`,
`guidesVivienda.ts`, `guidesTramites.ts`, `guidesConsumo.ts`), esparcidos en `guides.ts` como
`redditGuides`/`parejaGuides`. El renderer existente les da Article + FAQPage + HowTo JSON-LD,
OG, sitemap y buscador sin código nuevo.

Temas (slug tentativo → hilo/señal):
- Pagos: comercio que no acepta débito o cobra recargo (1oln2n4, 98 com.); saldo retenido en
  débito; transferencia a cuenta equivocada (1p8s44j, 1tevo1p); recibir transferencias del
  exterior y comisión por banco / Wise (7 hilos); alias para transferir (1q5p2pk, 77 com.);
  usar tarjeta uruguaya en Argentina.
- Deudas: cuándo prescribe una deuda privada (GSC + 1w9g0qq); cancelación anticipada de un
  préstamo; cesión de la deuda a otra empresa (1nijnia); saldo a favor en la tarjeta de crédito.
- Trabajo/BPS: mutualista/FONASA al quedar sin trabajo (cola); expensas funerarias del BPS
  (cola); jubilación uruguaya cobrada desde el exterior; canasta de fin de año del BPS (cola,
  sujeto a que exista); pedir un aumento de sueldo (5 hilos); pedir que te despidan (1sjd2oc).
- Vivienda: comisión inmobiliaria; comprar en remate; derechos posesorios; certificado único
  departamental.
- Trámites: ciudadanía legal; cédula uruguaya para argentinos; certificado de antecedentes;
  casarse por civil; cuánto tiempo guardar recibos y facturas.
- Consumo/auto: devoluciones y cambios en tiendas (cola, 1.º puesto); vender por Mercado Libre;
  pagar la patente en el SUCIVE (cola, 7 consultas); título del auto (3 hilos, 119 com.);
  supergás (quién fija el precio de la garrafa).

Hubs: los temas se reparten en hubs existentes y se crean dos hubs nuevos, porque no había dónde
ponerlos: `bancos-y-pagos-uruguay` y `tramites-y-documentos-uruguay`. `guideHubs.test.ts` pasa a
exigir que las guías de los seis módulos nuevos estén en exactamente un hub.

Reglas de contenido (brief compartido): toda cifra/plazo/artículo verificado abriendo fuente
primaria y listado en `sources`; montos volátiles con su fecha; sin fuente primaria → mecanismo y
consultor oficial, nunca la cifra; título ≤ 60 caracteres sin empezar por las palabras sueltas que
entierran páginas canónicas en el buscador interno; herramientas nombradas en prosa van enlazadas.

Control de calidad: cada módulo lo redacta un agente que lee los hilos y verifica en fuente, y lo
revisa después OTRO agente en modo adversarial (una afirmación sin respaldo se corrige o se saca).

## Parte B — tres familias programáticas desde datos ya verificados
Cero hechos nuevos: todo sale de `courierShipping.ts`, `cardRewards.ts`, `debitCards.ts`, que ya
tienen fuentes y fecha de verificación.
- `/couriers-uruguay/<courier>` — 15 fichas.
- `/tarjetas-de-credito-uruguay/<programa>` — 23 fichas.
- `/tarjetas-de-debito-uruguay/<tarjeta>` — 9 fichas.
Cada ficha: título/descripcion propios, canonical absoluto, JSON-LD con BreadcrumbList, un H1,
404 real vía `definePageMeta.validate`, emisión en el sitemap, enlaces a sus comparativas y desde
la página índice. Las páginas índice pasan de `x.vue` a `x/index.vue`.

## Fuera de alcance
Arreglos de CTR de páginas existentes, contenido en inglés/portugués, páginas sin demanda medida.

## Verificación
`npm test` (suite unit del app) + `npm run lint` en el worktree; revisión de SSR de una muestra de
URLs; después del deploy, medir en producción que las URLs nuevas respondan 200 y estén en el
sitemap.

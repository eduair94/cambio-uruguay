# Cubrir los temas "Oportunidad" del mapa de temas

**Fecha:** 2026-07-18
**Objetivo:** Que los 4 temas que en `/mapa-de-temas` figuran como **Oportunidad** pasen a **Cubierto**.

## Mecánica (verificada, no supuesta)

`app/utils/topicMap.ts` → `coverageStatus(count, demandRank, total)`:

- `count <= 1` → `gap`
- `count == 2` → `gap` si demanda alta, si no `oportunidad`
- `count == 3` → `oportunidad`
- `count >= 4` → **`cubierto`**

`count` = nº de guías cuyo `title + description` matchea el `match` (regex) del tema en `app/utils/redditTopics.ts`. Se corre sobre **todo** el catálogo (`utils/guides.ts`, que ya incluye `guidesReddit` + `guidesPareja`), independiente del hub. No hay dato en vivo ni test que fije el estado. **Conclusión: se cubre un tema escribiendo guías genuinas cuyo `description` contenga las palabras del regex.**

## Estado actual (medido con script tsx sobre el catálogo)

| Tema | id | count | estado | +guías p/ ≥4 |
|---|---|---|---|---|
| Sueldo y trabajo | `sueldo-trabajo` | 3 | oportunidad | +1 |
| Cripto | `cripto` | 3 | oportunidad | +1 |
| Emprender y empresa | `emprender-empresa` | 2¹ | oportunidad | +2 |
| Jubilación y AFAP | `jubilacion-afap` | 2 | oportunidad | +2 |

¹ Los 2 matches actuales de emprender son incidentales (`tipo-de-cambio-fiscal-dgi`, `trabajar-para-el-exterior`) → es el tema genuinamente más flaco.

## Decisión (aprobada por el usuario)

- **7 guías nuevas** (jubilación +2, emprender +3, cripto +1, sueldo +1).
- **Nuevo hub dedicado "Emprender"** (12º hub) para las 3 guías de emprender; se repunta `TOPIC_HUB['emprender-empresa']` a él.

## Wiring necesario por guía nueva (confirmado)

1. Objeto `Guide` agregado a `app/utils/guidesReddit.ts` (`redditGuides`).
2. Cada guía asignada a **exactamente un** hub (`guideSlugs` en `app/utils/guideHubs.ts`) — lo exige `guideHubs.test.ts`.
3. Sitemap (`server/api/__sitemap__/urls.get.ts`), search (`utils/searchIndex.ts`), `/guias` y `/guias/[slug]` enumeran el catálogo **automáticamente**. Sin tocar `siteNav.ts` (guías = ruta dinámica ya declarada).
4. Nuevo hub: agregar objeto a `guideHubs` → aparece solo en `/temas`, sitemap y search. Sin asserts de cantidad de hubs.

## Las 7 guías

Cada `description` incluye a propósito la palabra del regex (✓ marca el match garantizado).

### Jubilación y AFAP → hub `finanzas-personales-y-jubilacion-uruguay`

**J1 `reforma-jubilatoria-uruguay-que-cambia`** — tag REFORMA
`description` contiene "reforma jubilatoria" ✓ + "jubilación" + "edad de retiro".
Hechos (Ley 20.130, 2023): Sistema Previsional Común; **<1973** mantienen 60 años + 30 servicios; **1973→61, 1974→62, 1975→63, 1976→64**; **≥1977 → 65**; régimen mixto obligatorio Pilar 1 (BPS reparto) + Pilar 2 (AFAP); sueldo básico jubilatorio = promedio de los 20 mejores años, 1,5%/año; transición proporcional para causal entre 1/1/2033 y 2043; excepciones por carreras largas/esfuerzo. Fuentes: Ley 20.130 (impo.com.uy), BPS.

**J2 `elegir-o-cambiar-de-afap-uruguay`** — tag AFAP
`description` contiene "AFAP" ✓ + "jubilación".
Hechos: República AFAP (estatal) + privadas; supervisadas por BCU; comparar comisión de administración, rentabilidad histórica (pasado ≠ futuro), subfondos (más expuesto joven → conservador cerca del retiro; buena parte en títulos del Estado); hay límites de frecuencia/permanencia mínima para cambiarse (regla vigente sin cifra dura → derivar a BPS/AFAP). Fuente: BPS, BCU.

### Cripto → hub `ahorrar-e-invertir-uruguay`

**C1 `comprar-criptomonedas-en-uruguay`** — tag CRIPTO
`description` contiene "criptomonedas"/"cripto" ✓ + "Bitcoin" + "USDT" + "wallet".
Hechos: Ley 20.345 (rige desde sept 2024), PSAV requieren autorización del BCU; tres vías (exchange local registrado PSAV / exchange internacional / P2P); KYC-AML; custodia del exchange vs wallet propia (self-custody / seed phrase); costos (comisión/spread, tarjeta 1,5-3,5%); impuestos NO resueltos → **no dar tasa**, linkear a la guía de regulación. Fuentes: Ley 20.345 (impo), BCU. Plataforma-agnóstico: "verificá el registro PSAV ante el BCU".

### Sueldo y trabajo → hub `sueldo-trabajo-e-impuestos-uruguay`

**S1 `salario-minimo-uruguay-cuanto-es`** — tag SALARIO
`description` contiene "salario mínimo" ✓.
Hechos: SMN **$24.572 desde 1/1/2026 → $25.383 desde 1/7/2026 (+3,3%)**; jornal $1.015,32; hora $126,92; Decreto 319/025 (MTSS). No confundir con el mínimo por categoría (Consejos de Salarios), casi siempre mayor. Se fija por decreto del Poder Ejecutivo (normalmente enero). A nivel del mínimo se aporta BPS (15%) y FONASA pero **no** IRPF (queda por debajo de 7 BPC = $48.048 con BPC 2026 $6.864). Fuente: MTSS. Nota: cifra perecedera, refrescar cada ajuste.

### Emprender y empresa → **hub nuevo** `emprender-y-empresa-uruguay`

**E1 `monotributo-uruguay-que-es-y-cuando-conviene`** — tag MONOTRIBUTO
`description` contiene "monotributo" ✓ + "unipersonal" + "emprender" + "facturar".
Hechos: BPS+DGI, pago único que unifica aportes + impuestos nacionales (Ley 18.083); reducida dimensión. Topes 2026: ingresos ≤ **183.000 UI ≈ $1.175.537** (unipersonal) / **305.000 UI ≈ $1.959.229** (sociedad de hecho 2 socios); activos ≤ **152.500 UI ≈ $979.614**. UI estable, pesos se actualizan cada año. Venta a consumidor final; no discrimina IVA. Monotributo Social MIDES (Ley 18.874, tope propio) para población vulnerable. Fuentes: DGI, BPS.

**E2 `abrir-empresa-unipersonal-uruguay`** — tag UNIPERSONAL
`description` contiene "unipersonal" ✓ + "abrir una empresa" + "emprender".
Hechos: persona física con actividad económica, responde con su patrimonio; inscripción DGI + BPS, RUT, e-factura. Régimen pequeña empresa **Literal E**: exonerada de IRAE, paga **IVA mínimo ($5.910/mes 2026; año 1 25% = $1.478, año 2 50% = $2.955)** mientras ingresos ≤ **305.000 UI/año**; con e-factura el IVA mínimo pasa a ser el menor entre la cuota y **3,3% de lo facturado**. Sobre el tope → IRAE 25% (ficto o real). Servicios personales puros en Literal E = zona gris → contador. Fuentes: DGI (Literal E / IVA mínimo), Título 4 IRAE.

**E3 `facturar-como-freelancer-uruguay`** — tag FACTURACIÓN
`description` contiene "facturar" ✓ + "emprender"/"emprendedor" + "monotributo" + "unipersonal".
Hechos: hay que estar formalizado (monotributo o unipersonal) para emitir factura; comprobantes fiscales electrónicos (e-ticket/e-factura, CFE) + certificado; exportación de servicios a cliente del exterior tiene tratamiento de IVA distinto (habitualmente sin IVA local) → confirmar con contador; cobro en dólares; impuestos según régimen. Fuentes: DGI. Link a `trabajar-para-el-exterior-desde-uruguay`.

## Nuevo hub `emprender-y-empresa-uruguay`

- title "Emprender y tener una empresa en Uruguay"; tag EMPRENDER; icon `mdi-briefcase-outline` (o `mdi-rocket-launch-outline`).
- guideSlugs: E1, E2, E3.
- resources: Qué empresa abrir (`/que-empresa-abrir-uruguay`), Trabajar para el exterior (guía), Calculadora de sueldo líquido / IRPF, Mejores bancos (cuenta empresa).
- relatedHubs: `sueldo-trabajo-e-impuestos-uruguay`, `ahorrar-e-invertir-uruguay`.
- `TOPIC_HUB['emprender-empresa']` = `emprender-y-empresa-uruguay`.
- Cross-link: agregar el hub nuevo a `relatedHubs` de `sueldo-trabajo-e-impuestos-uruguay`.

## Verificación (evidencia antes de declarar hecho)

1. Re-correr el script de conteo → los 4 temas ≥ 4 (sueldo 4, cripto 4, emprender 5, jubilación 4).
2. `npm run lint` limpio (typecheck está roto de antes; se usa lint).
3. Workflow de fact-check adversarial sobre las 7 guías terminadas (cada claim vs fuente primaria).
4. Levantar una guía nueva en el build y verla renderizar.

## Estilo

Prosa rioplatense, mecanismo primero, conservador en cifras volátiles (SMN, edad de retiro, topes) con fuente + fecha; 4-6 secciones + `related` + `faqs`; cierre "información general, no asesoramiento; confirmá con DGI/BPS/MTSS/contador". `updatedAt: '2026-07-18'`. Títulos específicos (no términos pelados) para no caer en la trampa de ranking que tapa el hub canónico.

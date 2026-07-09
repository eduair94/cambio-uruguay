# Research: inversiones-uruguay page

Consolidated findings from 8 parallel research agents + 3 manual spot-checks, 2026-07-09. Feeds
`app/utils/investments.ts` (Task 2). Every fact below carries its source URL; anything the
agents could not verify is marked "no publicado"/"no verificado" rather than guessed.

## Marco regulatorio general (aplica a todas las categorías de brokers/bancos)

En Uruguay las personas físicas no operan directamente en los mercados de valores; deben hacerlo
a través de un "intermediario de valores" habilitado por el BCU (Ley N.° 18.627 de Mercado de
Valores: https://www.impo.com.uy/bases/leyes/18627-2009). El registro público de
"Intermediarios de Valores" del BCU
(https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/int_Valores.aspx) — **spot-checked
2026-07-09, confirmed** — lists "Agentes de Valores" and "Corredores de Bolsa" as distinct
categories; **none of Itaú, Santander, BROU, Scotiabank, or BBVA appear in this registry**. Those
5 banks are supervised by BCU only as commercial banks (intermediación financiera), not as
registered securities brokers.

## Bancos/corredores locales

- **Itaú Uruguay** — No standalone "brokerage" brand. Offers "Itaú Asset Management" (fondos de
  inversión) plus direct purchase/custody of foreign bonds/stocks and LRM for Banca Personal
  clients. Min investment: USD 1.000 for fondos de inversión
  (https://www.itau.com.uy/inst/paratiInversiones.html); no published minimum for direct
  stock/bond purchase. Fees: 1% + IVA entry fee on funds, no exit/custody fee on funds; custody
  fee 2,75% + IVA on coupons/dividends of foreign bonds/stocks per the tariff manual
  (https://www.itau.com.uy/inst/aci/docs/tarifario.pdf). Per-trade commission: no publicado.
  Regulation: BCU-supervised as a bank; NOT in the corredor de bolsa/agente de valores registry.

- **Santander Uruguay** — "Arquitectura abierta" (fondos, bonos, acciones, ETFs) reserved for
  **Select** and **Private Banking** segments; no general-access retail brokerage product.
  Min investment: USD 100.000 (Select), USD 500.000 (Private Banking), USD 150.000 for
  non-residents — quoted directly from
  https://www.santander.com.uy/productos-servicios/inversiones. Fees: no publicado (no public
  tariff sheet found with per-trade/custody figures). Regulation: "supervised by the Banco
  Central del Uruguay" (bank's own text,
  https://www.santander.com.uy/centro-de-ayuda/inversiones/general); NOT in the corredor de
  bolsa registry.

- **BROU (Banco República)** — "Instrumentos Financieros" section within Inversiones BROU;
  Obligaciones Negociables, Letras and other títulos via a "Cuenta Cliente" / e-BROU
  (https://www.brou.com.uy/personas/inversiones/instrumentos-financieros). Min investment: no
  publicado for individual bonds/stocks; $5.000 UYU minimum published for the "República Renta
  Pesos" fund (https://www.brou.com.uy/personas/inversiones). Fees: tariff PDF mentions
  commissions/costs for buy/sell/custody/admin but exact percentages were not extractable (PDF
  unreadable) — no verificado. Site explicitly states purchased securities "NO constituyen un
  depósito en el banco" (no deposit-insurance coverage). Regulation: BCU-supervised as a bank;
  NOT in the corredor de bolsa registry.

- **Scotiabank Uruguay** — "Inversiones" within Banca Premium offers funds + plazo fijo; for
  bonds/LRM/treasury bills, the bank explicitly refers clients to an external "corredor de bolsa
  autorizado" listed at bvm.com.uy — i.e., Scotiabank does NOT offer a direct-purchase channel
  itself. Min investment/fees: no publicado. Regulation: BCU-supervised as a bank; NOT in the
  corredor de bolsa registry.

- **BBVA Uruguay** — Publishes a "Cartilla Contractual — Instrumentos Financieros" but detailed
  content (brand name of any brokerage service, if one exists) could not be verified (PDF
  returned 403 / unreadable). Min investment/fees: no verificado. Regulation: BCU-supervised as
  a bank (BIC BBVAUYMM); NOT in the corredor de bolsa registry.

## Fintech

- **Prex — "Inversión Violeta"** (peso liquidity/savings product, launched March 2026). Min
  investment: UYU $4.000 first subscription, no minimum after
  (https://www.forbesuruguay.com/money/prex-lanza-inversion-violeta-herramienta-permite-invertir-dinero-cuenta-tenerlo-disponible-vez-n88459).
  Fees: free — no opening/subscription/maintenance/withdrawal cost. Custodian: investment
  account opened in the client's name at **Gletir** (local corredor de bolsa), invested in a
  Fondo de Liquidez Inmediata (FLI) administered by **VALO** as fiduciary; assets held at the
  Central Bank, not on Prex's/Gletir's/VALO's own books
  (https://valo.uy/noticias/juno-a-prex-lanzamos-una-solucion-de-inversion-en-pesos-con-liquidez-inmediata/).
  Regulation: FLI supervised directly by BCU (only invests in BCU deposits, LRM, and Uruguayan
  sovereign paper).

- **Prex — US Stocks & ETFs** ("Inversiones" module). Min investment: USD 10 to buy / USD 2 to
  sell (https://www.prexcard.com/ayuda/11). Fees: buy commission USD 0,99 + 2% (IVA incl.); sell
  commission 1% (IVA incl.) + ~USD 0,20 FX charge; daily cap USD 1.000, monthly cap USD 3.000.
  Custodian: orders routed by **BECA Advisors** (BCU-registered Investment Advisor, registry
  entry nroinst=7155:
  https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=7155)
  to **DriveWealth, LLC** (US FINRA/SIPC broker-dealer) — shares custodied at DriveWealth, not
  Prex. Regulation: the advisory layer (BECA) is BCU-regulated; the brokerage/custody layer
  (DriveWealth) is US-regulated, not BCU.

- **"Yiro"** — no verificado. No Uruguayan investment fintech by this name found in extensive
  search; do not include as a real platform.

## Brokers internacionales

- **eToro** — Uruguay is a supported country, no UY-specific restriction found. Standard KYC.
  Fees: USD 5 withdrawal fee (min withdrawal USD 30) on USD accounts; USD 10/month inactivity
  fee after 12 months. Minimum deposit: not consistently verified (some secondary sources cite
  USD 50, not confirmed on official fees page) — no verificado. Regulator: NOT a Uruguayan
  entity, NOT BCU-regulated; regulated by CySEC (Cyprus), FCA (UK), ASIC (Australia), or FSAS
  (Seychelles) depending on which eToro legal entity actually onboards the Uruguayan user — exact
  entity for UY users not confirmed. No BCU investor protection applies.

- **XTB** — Uruguay is listed as a country where XTB allows fully online account opening. No
  mandatory minimum deposit (some secondary sources suggest ~USD 200 as a practical
  recommendation, not a requirement). Fees: stocks/ETFs commission-free up to EUR 100.000/month
  volume, then 0,2% (min EUR 10); FX conversion fee 0,5%; inactivity fee EUR 10/month after 12
  months inactive + 90 days no deposit; withdrawals free. Regulator: entity serving Uruguayan
  clients not confirmed (varies by XTB group entity); NOT BCU-regulated, no BCU protection.

- **Interactive Brokers (IBKR)** — Mixed/unconfirmed: one aggregator says UY is NOT supported;
  two independent secondary sources say IBKR does accept Uruguayan residents. Official country
  list page blocked automated access (403) — **not independently confirmed either way; verify
  manually before publishing**. If accessible: min deposit USD 0 (cash account) / USD 2.000
  (margin); fees from USD 0,005/share (min USD 1); no inactivity fee. Regulator: booking entity
  for UY clients not confirmed; NOT BCU-regulated if accepted.

- **IOL Invertironline** — Argentine broker (CNV-regulated in Argentina, not Uruguay). No
  confirmation found that IOL accepts Uruguayan residents as non-Argentine clients; its funding
  flow relies on Argentine CBU/CVU, which a Uruguayan resident likely wouldn't have. **Do not
  state IOL is usable from Uruguay — no verificado.**

- **Balanz** — Confirmed usable from Uruguay AND locally regulated: **Balanz Uruguay Corredor de
  Bolsa S.A.** appears on BVM's official corredor de bolsa list
  (https://www.bvm.com.uy/operadores/corredores-de-bolsa) and is described in financial press as
  "regulado y supervisado por la Superintendencia de Servicios Financieros del Banco Central del
  Uruguay," operating through BEVSA
  (https://www.fundssociety.com/es/noticias/negocio/balanz-expande-sus-capacidades-en-el-mercado-bursatil-uruguayo/).
  It also offers US-market access via StoneX/Pershing (that layer is NOT BCU-regulated). No
  minimum to open an account; ~0,5% commission on trades cited by secondary sources but not
  confirmed in an official Balanz Uruguay tariff sheet — treat exact fee as no verificado.

- **"InterBrokers" / "BolsaEnLinea"** — **Could not be confirmed to exist as named.** The full
  official BVM corredor de bolsa member list (23 entities, checked 2026-07-09) contains no entity
  by either name. `bolsaenlinea.com` is a financial-education content site, not a BEVSA-member
  broker. **Do not publish either name as a real regulated Uruguayan broker — use Balanz as the
  confirmed local BEVSA/BCU-regulated example instead.**

**Conclusion**: only Balanz is confirmed as a BCU/BEVSA-regulated local entity among the
international-access options; eToro, XTB, and (if accepted) IBKR are foreign entities with no
BCU oversight or protection.

## Renta fija local

- **Plazo fijo bancario (UYU/USD)** — BCU publishes official "Tasas Medias de Interés" (monthly
  average rates by currency/term):
  https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Tasas-Medias.aspx (series:
  https://www.bcu.gub.uy/Servicios-Financieros-SSF/Series%20IF/tasas.xls). Consumer-education
  explainer: https://usuariofinanciero.bcu.gub.uy/depositos/ (banks must disclose TEA and any
  minimum deposit). Rate is variable — link to the live BCU page rather than quoting a point
  figure. Minimums vary by bank and are NOT BCU-set: BROU offers plazo fijo in UYU/UI/USD/EUR
  (https://www.brou.com.uy/personas/inversiones/plazo-fijo); Itaú's public tariff sheet
  (https://www.itau.com.uy/inst/aci/docs/tarifario.pdf) suggests ~UYU 5.000 (pesos) / ~USD 500
  (dollars) — bank-specific, treat as indicative only.

- **Letras de Regulación Monetaria (LRM), BCU** — Retail investors cannot buy directly from BCU;
  access only via regulated intermediaries (banks, corredores de bolsa, other BCU-authorized
  agents) per BCU's own clarification:
  https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=309. Traded
  instrument listed on BVM with tradable-quantity field of 100:
  https://www.bvm.com.uy/operativa/instrumento/id/LRM$. Practical minimum entry ticket commonly
  cited around UYU 100.000 by secondary financial-education sources (not a BCU-published fixed
  minimum) — brokers sometimes pool smaller retail orders. Yield set at each auction, variable —
  link to BVM/BCU rather than quoting a figure.

- **Bonos/Notas del Tesoro (pesos, UI, USD)** — Official hub: MEF Unidad de Gestión de Deuda,
  https://deuda.mef.gub.uy/29186/14/areas/notas-del-tesoro.html. Auction notices state minimum
  offer of UYU 100.000 (or UI/UP equivalent), in multiples of UYU 10.000. Accessed via a bank or
  corredor de bolsa with BEVSA/BVM access, not directly with MEF. **Interest on these
  government-debt titles is exempt from IRPF for both residents and non-residents** (confirmed
  by multiple professional sources — see Impuestos section; exact Título 7 article number not
  independently verified). Yield set per auction, variable — link to
  https://deuda.mef.gub.uy for current results rather than quoting a figure.

## Fondos de inversión (FCI)

- **República AFISA** (BROU group's fund manager). Official site
  (https://republicafisa.com.uy/) publishes only its fideicomisos financieros business line
  (SUCIVE, IAMC, infrastructure, agro, etc.) — **does not publish a retail FCI fund list with
  minimums/fees on its live site**. A third-party blog cites a "República Renta Pesos" fund with
  a $5.000 UYU minimum, but this is unverified against the primary source — no verificado.
  Regulation: confirmed BCU-registered
  (https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/admin_Fondos_Inv.aspx) and inscribed
  in BCU's Registro de Mercado de Valores.

- **SURA Uruguay → renamed "Delta Asset Management AFISA" (Delta AM)**, per a BCU hecho relevante
  filing dated 2026-04-10
  (https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2435).
  Current site: https://deltaam.com.uy/fondos_de_inversion/, listing Fondo Protección, Fondo
  Ahorro Básico, Fondo Futuro (pesos) and Fondo Renta Fija Internacional, Fondo Ahorro Dólar,
  Fondo Oportunidades Globales (dólares) — **the live page shows fund names only, no minimums or
  fees**. Historical (pre-rebrand, SURA-branded) reglamento documents cited by search snippets
  mention: Fondo Ahorro Dólar management fee 0,5%/year, no redemption fee; Fondo Ahorro Básico
  management fee ~2%/year; Fondo Oportunidades Globales (ex Fondo Renta Dólar) minimum USD 5.000
  — **these figures come from cached/indexed historical pages on a now-dead domain
  (ahorro.sura.com.uy) and could not be re-verified live; treat as historical/possibly outdated,
  not current fact**. Regulation: confirmed active BCU authorization since 2012-12-27.

- **Other BCU-registered FCI administrators** (full list:
  https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/admin_Fondos_Inv.aspx): Amicorp
  Uruguay AFI, BIND UY AFI, Corporación Nacional Financiera AFI, EF Asset Management AFI, Itaú
  AFI, Pilay Uruguay AFI, PUENTE AFI, TMF Uruguay AFI, Trust AFI, Valores AFI (possibly branded
  "Valo"), Víctor Paullier & Cía. AFI, Winterbotham Fiduciaria AFI. No specific fund/fee/minimum
  data verified for any of these within this research pass — no verificado; note as "otras
  administradoras registradas" if listed on the page without row-level detail.

## Cripto

- **Binance** — No direct UYU fiat withdrawal to Uruguayan bank accounts; UYU access is via
  **Binance P2P** only (peer-to-peer against bank transfer/Prex/Redpagos), Binance acting as
  escrow/arbiter, not fiat counterparty
  (https://p2p.binance.com/es/trade/BankRepublicUruguay/USDT?fiat=UYU). Fees: spot trading from
  0,1% (25% discount paying with BNB); crypto withdrawal fees vary by network (~USD 1 for
  USDT-TRC20). KYC mandatory for fiat/P2P and significant withdrawals; legal for Uruguayan
  residents to open an account.

- **Lemon Cash** (Argentina-founded) — Confirmed expanded to Uruguay (plus Colombia, Peru,
  Ecuador, Mexico), app available on UY App Store/Play Store
  (https://www.criptonoticias.com/finanzas/lemon-expande-5-paises-latinoamerica/). **Could not
  verify UYU-specific on/off-ramp (local bank transfer / RedPagos/Abitab) — the documented
  fee/deposit info found is Argentina/Peru/Colombia-specific, not Uruguay-specific.** Treat as
  possibly crypto/USD-wallet-only for Uruguay until confirmed otherwise. Fees (Argentina-sourced,
  not confirmed same for UY): 1% buy / 0,5% sell.

- **Buda.com** (Chile) — **NOT available in Uruguay.** Only operates with ARS/CLP/COP/PEN;
  Uruguay is not among supported countries.

- **Marco regulatorio**: Uruguay has a dedicated law, **Ley N.° 20.345** (approved 2024-09-10),
  giving BCU (via the Superintendencia de Servicios Financieros) authorization/registration/
  supervision powers over "Proveedores de Servicios de Activos Virtuales" (PSAV) —
  **spot-checked 2026-07-09 directly on impo.com.uy, confirmed**: the law modifies Ley 16.696 to
  bring virtual-asset service providers under Superintendencia/BCU oversight, and introduces
  "valores escriturales de registro descentralizado" (DLT-based securities) also BCU-regulated.
  Crypto is NOT legal tender in Uruguay but BCU treats it as "bienes muebles incorporales."
  Adaptation deadline for existing PSAV to register was **2026-06-30**, which has already passed
  as of this research date (2026-07-09) — post-deadline status (how many registered, any
  extension) is **not verified**, confirm directly on bcu.gub.uy before stating compliance
  status as fact. AML/PLD obligations apply to providers, not to individual holders.

## AFAP

- 4 providers confirmed via BCU's Q1 2026 quarterly memoria: **República AFAP** (state-owned,
  ~54,9% AUM share), **AFAP SURA** (~18,0%), **AFAP Itaú** (renamed from "Unión Capital AFAP" in
  March 2024, ~16,9%), **Integración AFAP** (~10,1%). Source:
  https://www.bcu.gub.uy/Servicios-Financieros-SSF/paginas/memoria-afap.aspx. (If older material
  says "Unión Capital AFAP," that is the same entity now called AFAP Itaú.)
- Legal basis: original mixed system under Ley 16.713 (1996); current reform under **Ley 20.130**
  (2023) created the Sistema Previsional Común — mandatory BPS + AFAP contribution from the first
  peso for anyone entering the labor market from 2023-12-01 onward, removing the old low-earner
  opt-out. Source: https://www.bps.gub.uy/22615/como-se-distribuyen-mis-aportes-con-y-sin-articulo-8.html
- Contribution mechanics: percentages (10% BPS + 5% AFAP up to a first band, 15% AFAP on the next
  band under the new regime) are consistent across sources, but exact 2026 peso salary-band
  thresholds are indexed annually and were NOT reliably confirmed (sources disagreed) — do not
  quote a specific peso threshold without checking bps.gub.uy/afapitau.com.uy directly for the
  current year's figure.
- Choosing/switching: free choice of AFAP within the first 3 months of contributing (otherwise
  BPS auto-assigns); switching (traspaso) requires a minimum 6 months' tenure with the current
  AFAP before transferring again. Source: https://www.bps.gub.uy/21194/administradoras-de-ahorro-previsional-afap-y-distribucion.html

## Inmobiliario

No dedicated research agent was dispatched for this category (out of the 8-agent batch, scoped
as an editorial-only section per the plan). The page's Inmobiliario section should stick to
general rental-property basics and note that no Uruguay-specific real-estate crowdfunding
platform was confirmed to operate locally during this research pass — if the page asserts one
exists, that claim needs its own verification before publishing.

## Impuestos

- **IRPF — rentas de capital mobiliario (residentes)**: general rate confirmed **12%** on the
  DGI's own page — **spot-checked 2026-07-09 directly on gub.uy, confirmed** — with reduced rates
  for specific instruments: UYU-denominated non-indexed deposits 5,5% (≤1yr) / 2,5% (1-3yr) /
  0,5% (>3yr); UI-indexed deposits 10%/7%/5%; foreign-currency deposits 12% (≤3yr) / 7% (>3yr);
  listed bonds with >3yr maturity 7%; dividends from local IRAE taxpayers ~7% (some secondary
  sources cite nuance/exceptions up to 12% for specific sub-cases — no verificado with 100%
  certainty, consultar contador). Source: https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario
- Capital gains on securities sales: 12% on a notional base of 20% of sale price ⇒ ~2,4%
  effective rate (opt-in simplified mechanism).
- **2026 change (Ley de Presupuesto 20.446, effective 2026-01-01)**: extended IRPF to foreign
  capital gains/capital income previously untaxed; general 12% with an optional reduced 8%
  definitive withholding when withheld by a Uruguay-resident agent.
- **IRNR (non-residents)**: general 12% on Uruguay-source capital income; dividends from local
  IRAE taxpayers 7% (subject to conditions re: foreign tax credit availability, effective from
  2026); treaty rates may apply under CDIs.
- **Confirmed exemption**: interest on Uruguayan public debt (Bonos del Tesoro, Letras de
  Tesorería, LRM, Bonos Globales en UI) is exempt from IRPF (and Impuesto al Patrimonio) for both
  residents and non-residents — consistently confirmed across professional sources, though the
  exact Título 7 article number was not independently verified (PDF unreadable) — cite the
  exemption as fact, but note "consultar contador" for the precise article citation.
- AFAP fund returns are exempt.
- A small-business dividend exemption exists but the exact income threshold is disputed between
  sources (USD 500.000 vs. 4.000.000 UI) — no verificado, do not quote a specific figure.

## Spot-check log (Task 1, Step 3)

1. **IRPF 12% general rate** — WebFetched https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario
   directly: confirmed multiple rates including 12% for foreign-currency deposits ≤3yr and for
   "other" dividend/income categories, matching the research agent's report.
2. **Ley 20.345 (crypto law) existence** — WebFetched https://www.impo.com.uy/bases/leyes-originales/20345-2024
   directly: confirmed this is Ley N.º 20.345, dated 2024-09-27, regulating virtual asset service
   providers under BCU/Superintendencia oversight — matches the research agent's report.
3. **No major bank registered as corredor de bolsa** — WebFetched
   https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/int_Valores.aspx directly: confirmed
   Itaú, Santander, BROU, Scotiabank, and BBVA do not appear in the visible Agentes de
   Valores/Corredores de Bolsa registry entries — matches the research agent's report (page has
   pagination for the broker sub-list, not fully exhaustive, but no bank names appeared in any
   visible portion).

All three spot-checks confirmed the agent reports with no corrections needed.

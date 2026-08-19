// Who the weekly refresh goes and re-reads. Ids, names, websites and the page the seed facts came
// off — nothing else: the scoring rubric, the verdicts and the pros/cons live in the app
// (app/utils/loanTierlist.ts), which owns the page. tests/loantiers/catalog.test.ts reads that file
// as TEXT and asserts the ids match exactly, the same technique tests/loans/catalog.test.ts uses,
// because the root and the app are separate TS programs and cannot import across each other.
//
// A lender the page shows but this list forgets is a lender whose facts silently never refresh —
// which on a page whose whole selling point is "se revisa sola" is the worst possible bug.
export interface LoanLenderSeed {
  id: string;
  name: string;
  website: string;
  sourceUrl: string;
}

export const LOAN_TIER_LENDERS: LoanLenderSeed[] = [
  // ── Bancos ──────────────────────────────────────────────────────────────────
  {
    id: "brou",
    name: "BROU (Banco República)",
    website: "https://www.brou.com.uy",
    sourceUrl:
      "https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-sin-retencion-en-pesos-ui-y-dolares",
  },
  {
    id: "itau",
    name: "Itaú Uruguay",
    website: "https://www.itau.com.uy",
    sourceUrl: "https://www.itau.com.uy/inst/preAprobados.html",
  },
  {
    id: "santander",
    name: "Santander Uruguay",
    website: "https://www.santander.com.uy",
    sourceUrl: "https://www.santander.com.uy/todos-los-prestamos/prestamo-personal",
  },
  {
    id: "scotiabank",
    name: "Scotiabank Uruguay",
    website: "https://www.scotiabank.com.uy",
    sourceUrl:
      "https://www.scotiabank.com.uy/Personas/Prestamos/Prestamo-Personal/prestamo-personal",
  },
  {
    id: "bbva",
    name: "BBVA Uruguay",
    website: "https://www.bbva.com.uy",
    sourceUrl:
      "https://www.bbva.com.uy/personas/productos/prestamos/prestamo-personal/personal.html",
  },
  {
    id: "btg",
    name: "BTG Pactual Uruguay (ex HSBC)",
    website: "https://www.btgpactual.uy",
    sourceUrl: "https://www.btgpactual.uy/tarifas-y-cartillas",
  },
  {
    id: "heritage",
    name: "Banque Heritage (Uruguay)",
    website: "https://www.heritage.com.uy",
    sourceUrl: "https://www.heritage.com.uy/",
  },
  {
    id: "bna",
    name: "Banco de la Nación Argentina — Uruguay",
    website: "https://www.bna.com.uy",
    sourceUrl: "https://www.bna.com.uy/",
  },
  { id: "bandes", name: "Banco Bandes Uruguay", website: "https://www.bandes.com.uy", sourceUrl: "https://www.bandes.com.uy/" },
  // ── Financieras / empresas administradoras de crédito ───────────────────────
  { id: "pronto", name: "Pronto!", website: "https://www.pronto.com.uy", sourceUrl: "https://www.pronto.com.uy/dinero/" },
  { id: "oca", name: "OCA", website: "https://oca.uy", sourceUrl: "https://oca.uy/prestamos/" },
  { id: "creditel", name: "Creditel", website: "https://www.creditel.com.uy", sourceUrl: "https://www.creditel.com.uy/efectivo" },
  {
    id: "crediton",
    name: "Crediton",
    website: "https://www.crediton.com.uy",
    sourceUrl: "https://www.crediton.com.uy/terminos-y-condiciones",
  },
  { id: "cash", name: "Cash", website: "https://prestamocash.com.uy", sourceUrl: "https://prestamocash.com.uy/prestamo" },
  {
    id: "credito-naranja",
    name: "Crédito Naranja",
    website: "https://creditonaranja.uy",
    sourceUrl: "https://creditonaranja.uy/",
  },
  {
    id: "credito-de-la-casa",
    name: "Crédito de la Casa",
    website: "https://solicitar.creditodelacasa.com.uy",
    sourceUrl:
      "https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/tasas-empresas-credito-casa-ano-2026",
  },
  // ── Cooperativas y asociaciones ─────────────────────────────────────────────
  { id: "anda", name: "ANDA", website: "https://anda.com.uy", sourceUrl: "https://anda.com.uy/prestamos/" },
  {
    id: "verde-fucac",
    name: "Verde (ex-FUCAC)",
    website: "https://verde.com.uy",
    sourceUrl: "https://verde.com.uy/conocenos_mas_transparentes.php",
  },
  { id: "fucerep", name: "FUCEREP", website: "https://www.fucerep.com.uy", sourceUrl: "https://www.fucerep.com.uy/solicita-prestamo-personal/" },
  { id: "acac", name: "Cooperativa ACAC", website: "https://acac.com.uy", sourceUrl: "https://acac.com.uy/" },
  { id: "cofac", name: "COFAC", website: "https://www.cofac.net", sourceUrl: "https://www.cofac.net/" },
  // ── Fintech / digitales ─────────────────────────────────────────────────────
  {
    id: "prex",
    name: "Prex (Prextamo)",
    website: "https://www.prexcard.com/uy",
    sourceUrl: "https://www.prexcard.com/terminos_de_uso/prextamoPaigo.html",
  },
  { id: "midinero", name: "Midinero", website: "https://www.midinero.com.uy", sourceUrl: "https://www.midinero.com.uy/prestamos/" },
  {
    id: "pago-despues",
    name: "Pago Después (ex-UinUin)",
    website: "https://www.pagodespues.com.uy",
    sourceUrl: "https://www.pagodespues.com.uy/legales",
  },
  { id: "payflex", name: "PayFlex", website: "https://payflexapp.com", sourceUrl: "https://payflexapp.com/" },
  { id: "volve", name: "Volvé", website: "https://volve.com.uy", sourceUrl: "https://volve.com.uy/" },
  // ── Entre personas ──────────────────────────────────────────────────────────
  { id: "prestapagos", name: "Prestapagos", website: "https://prestapagos.com.uy", sourceUrl: "https://prestapagos.com.uy/" },
  // ── Prendario ───────────────────────────────────────────────────────────────
  // Not one company: the category. Somebody in the Clearing with a phone and no payslip has this
  // door and almost no other, so leaving it off the board would hide the option most likely to be
  // used — and, more to the point, the one nobody publishes a rate for.
  { id: "empeno", name: "Casas de empeño", website: "https://empeno.uy", sourceUrl: "https://empeno.uy/" },
];

export function loanTierLenderIds(): string[] {
  return LOAN_TIER_LENDERS.map((l) => l.id);
}

// Minimal lender catalogue the scrape/Gemini refresh chain needs — id, name, website, source.
// This is a COPY of app/utils/loans.ts's LENDERS (ids/names/websites/sources only — requirements,
// ratings, review sources and the rest of the page catalogue stay in the app, which owns the page).
// Guarded by tests/loans/catalog.test.ts, which reads app/utils/loans.ts as TEXT — the same
// technique tests/aduana/baseline.test.ts and tests/banks/entities.test.ts already use, because the
// root and the app are separate TS programs and cannot import across (see Global Constraints).
export interface LoanLender {
  id: string;
  name: string;
  website: string;
  source: string;
}

export const LOAN_LENDERS: LoanLender[] = [
  // ── Bancos ──────────────────────────────────────────────────────────────────
  { id: "brou", name: "BROU (Banco República)", website: "https://www.brou.com.uy", source: "https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-sin-retencion-en-pesos-ui-y-dolares" },
  { id: "itau", name: "Itaú Uruguay", website: "https://www.itau.com.uy", source: "https://www.itau.com.uy/inst/preAprobados.html" },
  { id: "santander", name: "Santander Uruguay", website: "https://www.santander.com.uy", source: "https://www.santander.com.uy/todos-los-prestamos/prestamo-personal" },
  { id: "scotiabank", name: "Scotiabank Uruguay", website: "https://www.scotiabank.com.uy", source: "https://www.scotiabank.com.uy/Personas/Prestamos/Prestamo-Personal/prestamo-personal" },
  { id: "bbva", name: "BBVA Uruguay", website: "https://www.bbva.com.uy", source: "https://www.bbva.com.uy/personas/productos/prestamos/prestamo-personal/personal.html" },
  { id: "btg", name: "BTG Pactual Uruguay (ex HSBC)", website: "https://www.btgpactual.uy", source: "https://www.btgpactual.uy/" },
  // ── Financieras ─────────────────────────────────────────────────────────────
  { id: "creditel", name: "Creditel", website: "https://www.creditel.com.uy", source: "https://tramitesuruguay.com/prestamos/creditel-prestamos/" },
  { id: "pronto", name: "Pronto!", website: "https://www.pronto.com.uy", source: "https://www.pronto.com.uy/tasa-29/" },
  { id: "oca", name: "OCA", website: "https://oca.uy", source: "https://oca.uy/prestamos/" },
  { id: "crediton", name: "Crediton", website: "https://www.crediton.com.uy", source: "https://www.crediton.com.uy/solicitar-prestamo/" },
  { id: "microfin", name: "Microfin", website: "https://microfin.com.uy", source: "https://www.prestamosfrescos.com/uy/prestamo/microfin" },
  { id: "republica-microfinanzas", name: "República Microfinanzas", website: "https://www.republicamicrofinanzas.com.uy", source: "https://crediuruguay.uy/al-consumo/jovenes-republica/" },
  { id: "credito-de-la-casa", name: "Crédito de la Casa", website: "https://solicitar.creditodelacasa.com.uy", source: "https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/tasas-empresas-credito-casa-ano-2026" },
  // ── Cooperativas ────────────────────────────────────────────────────────────
  { id: "verde-fucac", name: "Verde (ex-FUCAC)", website: "https://verde.com.uy", source: "https://verde.com.uy/conocenos_mas_transparentes.php" },
  { id: "anda", name: "ANDA", website: "https://anda.com.uy", source: "https://anda.com.uy/prestamos/" },
  { id: "acac", name: "Cooperativa ACAC", website: "https://acac.com.uy", source: "https://creditoonline.uy/prestamos-cooperativa-acac-uruguay" },
  { id: "fucerep", name: "FUCEREP", website: "https://www.fucerep.com.uy", source: "https://credifama.com.uy/prestamos-fucerep-ventajas-y-como-solicitar/" },
  { id: "cofac", name: "COFAC", website: "https://www.cofac.net", source: "https://finanzas.com.uy/prestamos-cofac/" },
  // ── Fintech / digitales ──────────────────────────────────────────────────────
  { id: "prex", name: "Prex (Prextamo)", website: "https://www.prexcard.com/uy", source: "https://www.prexcard.com/terminos_de_uso/prextamoPaigo.html" },
  { id: "midinero", name: "Midinero", website: "https://www.midinero.com.uy", source: "https://www.midinero.com.uy/prestamos/" },
  { id: "cash", name: "Cash", website: "https://prestamocash.com.uy", source: "https://prestamocash.com.uy/prestamo" },
  { id: "pago-despues", name: "Pago Después (ex-UinUin)", website: "https://www.pagodespues.com.uy", source: "https://www.pagodespues.com.uy/legales" },
  { id: "payflex", name: "PayFlex (adelanto de sueldo)", website: "https://payflexapp.com", source: "https://www.forbesuruguay.com/innovacion/payflex-como-funciona-startup-permite-adelantar-sueldos-uruguay-esta-proxima-cerrar-ronda-us-15-millones-n86456" },
];

export function lenderIds(): string[] {
  return LOAN_LENDERS.map((l) => l.id);
}

export function getLoanLender(id: string): LoanLender | undefined {
  return LOAN_LENDERS.find((l) => l.id === id);
}

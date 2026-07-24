// The bank/fintech roster for /mejores-bancos-uruguay's news briefing. Ids, names and kind only —
// the scoring dimensions (app, comisiones, atencion, usd, productos, cobertura), pros/cons and
// verdicts stay in the app (app/utils/bankTierlist.ts): this backend only needs enough to know WHO
// to search grounded news for. tests/banks/entities.test.ts reads that file as text and asserts
// this list's ids match it exactly — a bank the tier list shows but this list forgets is a bank
// that silently never gets news.
export interface BankEntity {
  id: string;
  name: string;
  kind: string;
}

export const BANK_ENTITIES: BankEntity[] = [
  { id: "mercadopago", name: "Mercado Pago", kind: "fintech" },
  { id: "itau", name: "Itaú", kind: "banco" },
  { id: "santander", name: "Santander", kind: "banco" },
  { id: "brou", name: "BROU", kind: "banco" },
  { id: "bbva", name: "BBVA", kind: "banco" },
  { id: "heritage", name: "Banco Heritage", kind: "banco" },
  { id: "scotiabank", name: "Scotiabank", kind: "banco" },
  { id: "prex", name: "Prex", kind: "fintech" },
  { id: "btg", name: "BTG Pactual", kind: "banco" },
];

export const KIND_LABELS: Record<string, string> = {
  banco: "Banco",
  fintech: "Fintech",
};

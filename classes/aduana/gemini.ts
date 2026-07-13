// The customs norms gate's Gemini client now lives in classes/gemini.ts — one grounded client for
// the whole backend (bank news, lender TEAs, price predictions, move explanations, and this).
// Kept as a re-export so classes/aduana/norms.ts, sync_aduana.ts and tests/aduana/gemini.test.ts
// need no edit: the contract they depend on (grounded, resolved source URIs, null on every failure,
// never throws) is unchanged.
export { askGrounded, geminiConfigured } from "../gemini";
export type { GroundedReply } from "../gemini";

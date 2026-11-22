// The customs norms gate's grounded client lives in classes/gemini.ts — one grounded client for
// the whole backend — and is reached through classes/llm.ts, which only sends it to Claude's web
// search when ANTHROPIC_GROUNDED=1 (off by default). Kept as a re-export so classes/aduana/norms.ts,
// sync_aduana.ts and tests/aduana/gemini.test.ts keep one import path: the contract they depend on
// (grounded, resolved source URIs, null on every failure, never throws) is unchanged.
export { geminiConfigured } from "../gemini";
export { askGrounded, groundedConfigured } from "../llm";
export type { GroundedReply } from "../gemini";

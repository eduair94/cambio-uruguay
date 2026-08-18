import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  BANKOS_APP_SECRET,
  BANKOS_BANKS,
  bankosSignature,
} from "../classes/bankos/client";

// Guards the reverse-engineered Bankos backend client (feeds `sync_bankos.ts` → the app's
// /descuentos-con-tarjeta-uruguay). See memory/bankos-api-reverse.md.
describe("bankos client", () => {
  it("ships the 10-issuer catalog, each with id/name/hex colour", () => {
    expect(BANKOS_BANKS).toHaveLength(10);
    const ids = BANKOS_BANKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(10); // unique
    expect(ids).toEqual(
      expect.arrayContaining([
        "itau",
        "bbva",
        "santander",
        "scotiabank",
        "brou",
        "oca",
        "clubelpais",
        "mercadopago",
        "prex",
        "anda",
      ])
    );
    for (const b of BANKOS_BANKS) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("signs exactly as HMAC-SHA256(appSecret, nonce + path), hex", () => {
    const nonce = "11111111-1111-1111-1111-111111111111";
    const path = "/markers-and-brands";
    const expected = crypto
      .createHmac("sha256", BANKOS_APP_SECRET)
      .update(nonce + path)
      .digest("hex");
    expect(bankosSignature(nonce, path)).toBe(expected);
    // Deterministic for a fixed (nonce, path); path-bound (body is NOT part of the signature).
    expect(bankosSignature(nonce, path)).toBe(bankosSignature(nonce, path));
    expect(bankosSignature(nonce, "/contact")).not.toBe(bankosSignature(nonce, path));
  });
});

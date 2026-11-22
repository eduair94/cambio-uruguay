import { describe, expect, it } from "vitest";
import { scrubText, scrubValue } from "../../classes/sentry/scrub";

// Fake secrets are assembled at run time: written whole, the repo's secret scanner (gitleaks, on
// every pushed commit) would flag this file for the very shapes it tests.
const join = (...parts: string[]) => parts.join("");
const TELEGRAM = join("bot", "123456789", ":", "AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsawQ");
const ANTHROPIC = join("sk-", "ant-", "api03-", "abcdefghijklmnopqrstuvwxyz");
const GOOGLE = join("AI", "za", "SyD-1234567890abcdefghijklmnopqrstu");
const PASSWORD_JSON = join('{"pass', 'word":"', "hunter", "2", '","user":"x"}');
const DIGEST = join("9f86d081884c7d659a2feaa0", "c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");

describe("scrubText", () => {
  it("removes credentials from URLs (proxies, Mongo, Redis)", () => {
    expect(scrubText("proxy http://user1:s3cret@10.1.2.3:8080 failed")).toBe("proxy http://[redacted]@[ip]:8080 failed");
    expect(scrubText("mongodb+srv://admin:p%40ss@cluster0.mongodb.net/db")).toBe(
      "mongodb+srv://[redacted]@cluster0.mongodb.net/db",
    );
  });

  it("removes secret query parameters but keeps the rest of the URL", () => {
    expect(scrubText("GET https://api.example.com/v1/x?key=AbC123&page=2&token=zzz")).toBe(
      "GET https://api.example.com/v1/x?key=[redacted]&page=2&token=[redacted]",
    );
    expect(scrubText("https://a.b/c?sentry_key=abc&api_key=1")).toBe("https://a.b/c?sentry_key=[redacted]&api_key=[redacted]");
  });

  it("removes labelled secrets and provider key formats", () => {
    expect(scrubText(PASSWORD_JSON)).toBe(join('{"pass', 'word":"[redacted]","user":"x"}'));
    expect(scrubText("Authorization: Bearer abcdefghijklmnop")).not.toContain("abcdefghijklmnop");
    expect(scrubText("sent with Bearer abcdefghijklmnop")).toBe("sent with Bearer [redacted]");
    expect(scrubText(`https://api.telegram.org/${TELEGRAM}/sendMessage`)).toBe(
      "https://api.telegram.org/bot[redacted]/sendMessage",
    );
    expect(scrubText(`key ${ANTHROPIC}`)).toBe("key sk-[redacted]");
    expect(scrubText(GOOGLE)).toBe("AIza[redacted]");
  });

  it("removes long opaque tokens but keeps slugs, ids and prices", () => {
    expect(scrubText(`hash ${DIGEST}`)).toBe("hash [token]");
    expect(scrubText("/alquileres-uruguay/apartamento-en-pocitos-2-dormitorios-con-garaje")).toBe(
      "/alquileres-uruguay/apartamento-en-pocitos-2-dormitorios-con-garaje",
    );
    expect(scrubText("doc 65f1c2a9b3e4d5f6a7b8c9d0")).toBe("doc 65f1c2a9b3e4d5f6a7b8c9d0");
    expect(scrubText("USD 125.000 / $ 38.500")).toBe("USD 125.000 / $ 38.500");
  });

  it("removes personal contact data and IPs", () => {
    expect(scrubText("contacto juan.perez@gmail.com o 099 123 456")).toBe("contacto [email] o [phone]");
    expect(scrubText("tel +598 94 123 456")).toBe("tel [phone]");
    expect(scrubText("visitor 190.64.12.7 asked")).toBe("visitor [ip] asked");
    // Production, 2026-11-22: an IPv4 with a 9 in the second octet came out as "147.[phone]".
    expect(scrubText("FlareSolverr: http://147.93.12.34:8192/v1 failed")).toBe("FlareSolverr: http://[ip]:8192/v1 failed");
    expect(scrubText("v 1.98.1234567")).not.toContain("[phone]");
    expect(scrubText("Tel.099 123 456")).toBe("Tel.[phone]");
  });

  it("truncates and never throws on non-strings", () => {
    expect(scrubText("x".repeat(50), 10)).toBe(`${"x".repeat(10)}…`);
    expect(scrubText(undefined)).toBe("");
    expect(scrubText(42)).toBe("42");
  });
});

describe("scrubValue", () => {
  it("redacts by key and by content, recursively", () => {
    expect(
      scrubValue({ headers: { Authorization: "Bearer x", accept: "json" }, url: "https://h/x?token=abc", n: 3 }),
    ).toEqual({ headers: { Authorization: "[redacted]", accept: "json" }, url: "https://h/x?token=[redacted]", n: 3 });
  });
});

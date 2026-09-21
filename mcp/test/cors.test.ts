import { describe, expect, it } from "vitest";
import { allowedOrigins, corsHeaders } from "../src/cors";

describe("cors", () => {
  it("allows only the site origins, plus configured extras", () => {
    const allowed = allowedOrigins("https://staging.example.com/, ");
    expect(allowed).toContain("https://cambio-uruguay.com");
    expect(allowed).toContain("https://staging.example.com");
    expect(corsHeaders("https://cambio-uruguay.com", allowed)?.["access-control-allow-origin"]).toBe("https://cambio-uruguay.com");
    expect(corsHeaders("https://evil.example", allowed)).toBeNull();
    expect(corsHeaders(undefined, allowed)).toBeNull();
  });

  it("lets the browser send the MCP protocol headers", () => {
    const h = corsHeaders("https://cambio-uruguay.com", allowedOrigins(""))!;
    expect(h["access-control-allow-headers"]).toContain("mcp-protocol-version");
    expect(h.vary).toBe("Origin");
  });
});

import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import {
  buildSantanderPersonalLoginPayload,
  compressSantanderCommunication,
  decompressSantanderCommunication,
  deriveSantanderProtectionKey,
  parseSantanderPublicQuotation,
  protectSantanderCommunication,
  serializeSantanderGetPayload,
  serializeSantanderJsonPayload,
  unprotectSantanderCommunication,
} from "../classes/cambios/santander";

describe("Santander protected communication", () => {
  it("derives the key from the first 21 auth-token characters", () => {
    const authToken = "123456789012345678901-rest-of-token";
    const expected = createHash("md5")
      .update(authToken.substring(0, 21))
      .digest("hex");

    expect(
      deriveSantanderProtectionKey(
        authToken,
        "ignored-session",
        "https://ignored.test"
      )
    ).toBe(expected);
  });

  it("falls back from auth token to session and then URL", () => {
    const session = "anonymous-session";
    const url = "https://api.example.test/path";

    expect(deriveSantanderProtectionKey(undefined, session, url)).toBe(
      createHash("md5").update(session.substring(0, 21)).digest("hex")
    );
    expect(deriveSantanderProtectionKey(undefined, undefined, url)).toBe(
      createHash("md5").update(url.substring(0, 21)).digest("hex")
    );
  });

  it("round-trips gzip/base64 and AES-256-CBC", () => {
    const requestUrl =
      "https://api.santander.com.uy/Santander_ICBanking_WebApi/api/Custom/Custom/GetHistoricalQuotes";
    const key = deriveSantanderProtectionKey(
      "synthetic-auth-token-for-unit-test",
      undefined,
      requestUrl
    );
    const plainText =
      "%24type=Tailored.ICBanking.UIProcess.MethodParameters.Custom.GetHistoricalQuotesIn%2C+Tailored.ICBanking.UIProcess&quoteDate=2026-07-23T20%3A30%3A16.998&constructor=";
    const compressed = compressSantanderCommunication(plainText);
    const encrypted = protectSantanderCommunication(
      compressed,
      key,
      Buffer.from("000102030405060708090a0b0c0d0e0f", "hex")
    );

    expect(
      decompressSantanderCommunication(
        unprotectSantanderCommunication(encrypted, key)
      )
    ).toBe(plainText);
  });

  it("serializes the historical request in the captured wire format", () => {
    expect(
      serializeSantanderGetPayload({
        $type:
          "Tailored.ICBanking.UIProcess.MethodParameters.Custom.GetHistoricalQuotesIn, Tailored.ICBanking.UIProcess",
        quoteDate: "2026-07-23T20:30:16.998",
        constructor: "",
      })
    ).toBe(
      "%24type=Tailored.ICBanking.UIProcess.MethodParameters.Custom.GetHistoricalQuotesIn%2C+Tailored.ICBanking.UIProcess&quoteDate=2026-07-23T20%3A30%3A16.998&constructor="
    );
  });

  it("serializes framework dictionaries before protecting a POST", () => {
    const payload = buildSantanderPersonalLoginPayload(
      "1.234.567-8",
      "secret"
    );

    expect(JSON.parse(serializeSantanderJsonPayload(payload))).toEqual({
      $type:
        "Infocorp.UIProcess.MethodParameters.Administration.General.LogOnIn, Infocorp.UIProcess.MethodParameters",
      userName: "858-1-12345678",
      password: "secret",
      extendedProperties: {
        data: [
          { key: "isPersonMode", value: true },
          { key: "documentNumber", value: "12345678" },
          { key: "finalUsername", value: "858-1-12345678" },
        ],
      },
    });
  });

  it("serializes nested framework dictionaries for the security-image GET", () => {
    const login = buildSantanderPersonalLoginPayload(
      "1.234.567-8",
      "secret"
    ) as any;
    const params = new URLSearchParams(
      serializeSantanderGetPayload({
        $type:
          "Infocorp.UIProcess.MethodParameters.Framework.Authentication.GetUserImageForLoginIn, Infocorp.UIProcess.MethodParameters",
        username: login.userName,
        extendedProperties: login.extendedProperties,
      })
    );

    expect(
      params.get("extendedProperties[data][0][key]")
    ).toBe("isPersonMode");
    expect(
      params.get("extendedProperties[data][0][value]")
    ).toBe("true");
    expect(
      params.get("extendedProperties[data][2][value]")
    ).toBe("858-1-12345678");
  });
});

describe("Santander login and quotation mapping", () => {
  it("builds the same Uruguay personal identifier as Supernet", () => {
    const payload = buildSantanderPersonalLoginPayload(
      "1.234.567-8",
      "secret"
    ) as any;

    expect(payload.userName).toBe("858-1-12345678");
    expect(payload.extendedProperties._keys).toEqual([
      "isPersonMode",
      "documentNumber",
      "finalUsername",
    ]);
    expect(
      payload.extendedProperties.finalUsername.extendedPropertyValue
    ).toBe("858-1-12345678");
  });

  it("maps a valid USD quotation", () => {
    expect(
      parseSantanderPublicQuotation({
        buyUSDBB: "39,75",
        sellUSDBB: 42.15,
      })
    ).toEqual({
      code: "USD",
      type: "",
      name: "Dólar",
      buy: 39.75,
      sell: 42.15,
    });
  });

  it.each([
    {},
    { buyUSDBB: 0, sellUSDBB: 42 },
    { buyUSDBB: 43, sellUSDBB: 42 },
    { buyUSDBB: "not-a-number", sellUSDBB: 42 },
  ])("rejects invalid quotations", (response) => {
    expect(() => parseSantanderPublicQuotation(response)).toThrow(
      "Santander returned an invalid USD quotation"
    );
  });
});

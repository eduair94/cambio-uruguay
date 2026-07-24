import axios, { AxiosResponse } from "axios";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { gunzipSync, gzipSync } from "zlib";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import {
  applySantanderPreferentialRates,
  normalizeSantanderPreferentialRates,
} from "../santander-preferential/store";
import type { SantanderPreferentialSourceRate } from "../santander-preferential/store";

const API_BASE_URL =
  "https://api.santander.com.uy/Santander_ICBanking_WebApi/api/";
const PORTAL_ORIGIN = "https://www.santander.com.uy";
const SUPERNET_ORIGIN = "https://supernet.santander.com.uy";
const SUPERNET_ENTRY_URL = `${SUPERNET_ORIGIN}/Supernet_UI/`;
const DEFAULT_APP_VERSION = "10.9.3";
const LOGIN_TYPE =
  "Infocorp.UIProcess.MethodParameters.Administration.General.LogOnIn, Infocorp.UIProcess.MethodParameters";
const COEXISTENT_URL_INFORMATION_TYPE =
  "Tailored.ICBanking.UIProcess.MethodParameters.Custom.GetCoexistentUrlInformationIn, Tailored.ICBanking.UIProcess";
const USER_IMAGE_FOR_LOGIN_TYPE =
  "Infocorp.UIProcess.MethodParameters.Framework.Authentication.GetUserImageForLoginIn, Infocorp.UIProcess.MethodParameters";
const PUBLIC_QUOTATION_TYPE =
  "Tailored.ICBanking.UIProcess.MethodParameters.Custom.GetPublicQuotationIn, Tailored.ICBanking.UIProcess";
const SANTANDER_EXCHANGE_RATE_TYPE =
  "Tailored.ICBanking.UIProcess.MethodParameters.Custom.GetSantanderExchangeRateIn, Tailored.ICBanking.UIProcess";
const EXTENDED_BOOLEAN_TYPE =
  "Infocorp.UIProcess.Entities.Framework.Common.ExtendedPropertyValueBoolean, Infocorp.UIProcess.Entities";
const EXTENDED_STRING_TYPE =
  "Infocorp.UIProcess.Entities.Framework.Common.ExtendedPropertyValueString, Infocorp.UIProcess.Entities";
const DEFAULT_SESSION_CACHE = "santander_session.json";
const DEFAULT_PORTAL_DOCUMENT_PREFIX = "858-01";

type SantanderHttpMethod = "GET" | "POST";

interface SantanderSessionCache {
  authToken: string;
  sessionId: string;
  appVersion: string;
  updatedAt: string;
}

interface SantanderQuoteResponse {
  buyUSDBB?: number | string;
  sellUSDBB?: number | string;
}

export interface SantanderExchangeRateResponse {
  cotizations?: SantanderPreferentialSourceRate[];
  operationResult?: {
    value?: string;
    valueName?: string;
  };
}

interface ProtectedRequestOptions {
  method: SantanderHttpMethod;
  path: string;
  payload: Record<string, unknown>;
  skipInitialization?: boolean;
  useUrlProtectionKey?: boolean;
}

interface SantanderPortalLoginRoute {
  userName: string;
  isCompany: string;
}

export class SantanderApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SantanderApiError";
    this.status = status;
  }
}

const nonEmpty = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const responseHeader = (
  response: AxiosResponse,
  name: string
): string | undefined => {
  const value = response.headers?.[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  if (value === undefined || value === null) return undefined;
  return String(value);
};

const headerIsEnabled = (response: AxiosResponse, name: string): boolean => {
  const value = responseHeader(response, name)?.toLowerCase();
  return value !== undefined && value !== "false" && value !== "0";
};

export const deriveSantanderProtectionKey = (
  authToken: string | undefined,
  sessionId: string | undefined,
  requestUrl: string
): string => {
  const seed = authToken?.substring(0, 21) || sessionId || requestUrl;
  return createHash("md5")
    .update(seed.substring(0, 21), "utf8")
    .digest("hex");
};

export const protectSantanderCommunication = (
  plainText: string,
  key: string,
  iv: Buffer = randomBytes(16)
): string => {
  if (Buffer.byteLength(key, "utf8") !== 32) {
    throw new Error("Santander protection key must be 32 bytes");
  }

  const cipher = createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf8"),
    iv
  );
  return Buffer.concat([
    iv,
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]).toString("base64");
};

export const unprotectSantanderCommunication = (
  cipherText: string,
  key: string
): string => {
  const bytes = Buffer.from(cipherText.replaceAll("#", "="), "base64");
  if (bytes.length <= 16) {
    throw new Error("Invalid Santander encrypted payload");
  }

  const iv = bytes.subarray(0, 16);
  const decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf8"),
    iv
  );
  return Buffer.concat([
    decipher.update(bytes.subarray(16)),
    decipher.final(),
  ]).toString("utf8");
};

export const compressSantanderCommunication = (plainText: string): string =>
  gzipSync(Buffer.from(plainText, "utf8")).toString("base64");

export const decompressSantanderCommunication = (
  compressedBase64: string
): string =>
  gunzipSync(Buffer.from(compressedBase64, "base64")).toString("utf8");

const serializeSantanderWireValue = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeSantanderWireValue);
  if (value === null || typeof value !== "object") return value;

  const objectValue = value as Record<string, unknown>;
  if (
    typeof objectValue.$type === "string" &&
    objectValue.$type.includes(
      "Infocorp.UIProcess.Entities.Framework.Common.ExtendedPropertyValue"
    )
  ) {
    return serializeSantanderWireValue(objectValue.extendedPropertyValue);
  }

  if (
    objectValue.isDictionary === true &&
    Array.isArray(objectValue._keys)
  ) {
    return {
      data: objectValue._keys.map((key) => ({
        key,
        value: serializeSantanderWireValue(objectValue[String(key)]),
      })),
    };
  }

  return Object.fromEntries(
    Object.entries(objectValue)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, serializeSantanderWireValue(child)])
  );
};

export const serializeSantanderJsonPayload = (
  payload: Record<string, unknown>
): string => JSON.stringify(serializeSantanderWireValue(payload));

export const serializeSantanderGetPayload = (
  payload: Record<string, unknown>
): string => {
  const params: string[] = [];
  const append = (prefix: string, value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        const suffix =
          child !== null && typeof child === "object" ? String(index) : "";
        append(`${prefix}[${suffix}]`, child);
      });
      return;
    }

    if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(
        value as Record<string, unknown>
      )) {
        append(`${prefix}[${key}]`, child);
      }
      return;
    }

    const normalized = value === null || value === undefined ? "" : value;
    params.push(
      `${encodeURIComponent(prefix)}=${encodeURIComponent(
        String(normalized)
      )}`
    );
  };

  const wirePayload = serializeSantanderWireValue(payload) as Record<
    string,
    unknown
  >;
  for (const [key, value] of Object.entries(wirePayload)) {
    if (value !== undefined) append(key, value);
  }

  return params.join("&").replaceAll("%20", "+");
};

const extendedBoolean = (value: boolean) => ({
  $type: EXTENDED_BOOLEAN_TYPE,
  extendedPropertyValue: value,
});

const extendedString = (value: string) => ({
  $type: EXTENDED_STRING_TYPE,
  extendedPropertyValue: value,
});

export const buildSantanderPersonalLoginPayload = (
  documentNumber: string,
  password: string,
  countryDocumentPrefix = "858-1"
): Record<string, unknown> => {
  const normalizedDocument = documentNumber.replace(/\D/g, "");
  if (!normalizedDocument) {
    throw new Error("SANTANDER_LOGIN_USER is required");
  }
  if (!password) {
    throw new Error("SANTANDER_LOGIN_PASSWORD is required");
  }

  const finalUsername = `${countryDocumentPrefix}-${normalizedDocument}`;
  const keys = ["isPersonMode", "documentNumber", "finalUsername"];

  return {
    $type: LOGIN_TYPE,
    userName: finalUsername,
    password,
    extendedProperties: {
      isDictionary: true,
      _keys: keys,
      isPersonMode: extendedBoolean(true),
      documentNumber: extendedString(normalizedDocument),
      finalUsername: extendedString(finalUsername),
    },
  };
};

const buildSantanderCompanyLoginPayload = (
  username: string,
  password: string
): Record<string, unknown> => ({
  $type: LOGIN_TYPE,
  userName: username,
  password,
  extendedProperties: {
    isDictionary: true,
    _keys: ["isPersonMode", "finalUsername"],
    isPersonMode: extendedBoolean(false),
    finalUsername: extendedString(username),
  },
});

const parseNumber = (value: number | string | undefined): number => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number(value.trim().replace(",", "."));
};

export const parseSantanderPublicQuotation = (
  response: SantanderQuoteResponse
): CambioObj => {
  const buy = parseNumber(response.buyUSDBB);
  const sell = parseNumber(response.sellUSDBB);

  if (
    !Number.isFinite(buy) ||
    !Number.isFinite(sell) ||
    buy <= 0 ||
    sell <= 0 ||
    buy >= sell
  ) {
    throw new Error("Santander returned an invalid USD quotation");
  }

  return {
    code: "USD",
    type: "",
    name: "Dólar",
    buy,
    sell,
  };
};

const safeApiErrorDetail = (data: any): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  if (typeof data.message === "string" && data.message.length <= 160) {
    return data.message;
  }

  const operationResult = data.operationResult;
  if (typeof operationResult?.valueName === "string") {
    return operationResult.valueName;
  }
  if (typeof data.sessionEndReason?.valueName === "string") {
    return data.sessionEndReason.valueName;
  }
  return undefined;
};

export class SantanderApiClient {
  private authToken?: string;
  private sessionId?: string;
  private readonly cookies = new Map<string, string>();
  private appVersion: string;
  private initialized = false;
  private readonly envSessionConfigured: boolean;
  private readonly sessionCachePath?: string;

  constructor() {
    const envAuthToken = nonEmpty(process.env.SANTANDER_AUTH_TOKEN);
    const envSessionId = nonEmpty(process.env.SANTANDER_SESSION_ID);
    this.envSessionConfigured = Boolean(envAuthToken && envSessionId);
    this.authToken = envAuthToken;
    this.sessionId = envSessionId;
    this.appVersion =
      nonEmpty(process.env.SANTANDER_APP_VERSION) || DEFAULT_APP_VERSION;
    this.sessionCachePath = this.resolveSessionCachePath();

    if (!this.envSessionConfigured) {
      this.loadCachedSession();
    }
  }

  private resolveSessionCachePath(): string | undefined {
    if (process.env.SANTANDER_DISABLE_SESSION_CACHE === "true") {
      return undefined;
    }

    const configured =
      nonEmpty(process.env.SANTANDER_SESSION_CACHE_PATH) ||
      DEFAULT_SESSION_CACHE;
    return path.resolve(configured);
  }

  private loadCachedSession(): void {
    if (!this.sessionCachePath || !fs.existsSync(this.sessionCachePath)) return;

    try {
      const cached = JSON.parse(
        fs.readFileSync(this.sessionCachePath, "utf8")
      ) as Partial<SantanderSessionCache>;
      if (
        typeof cached.authToken === "string" &&
        typeof cached.sessionId === "string"
      ) {
        this.authToken = cached.authToken;
        this.sessionId = cached.sessionId;
        if (typeof cached.appVersion === "string") {
          this.appVersion = cached.appVersion;
        }
      }
    } catch {
      // Ignore malformed/obsolete cache files and obtain a new session.
    }
  }

  private saveSessionCache(): void {
    if (!this.sessionCachePath || !this.authToken || !this.sessionId) return;

    const cache: SantanderSessionCache = {
      authToken: this.authToken,
      sessionId: this.sessionId,
      appVersion: this.appVersion,
      updatedAt: new Date().toISOString(),
    };
    const temporaryPath = `${this.sessionCachePath}.${process.pid}.tmp`;

    try {
      fs.writeFileSync(temporaryPath, JSON.stringify(cache), {
        encoding: "utf8",
        mode: 0o600,
      });
      fs.renameSync(temporaryPath, this.sessionCachePath);
    } finally {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    }
  }

  private hasCredentials(): boolean {
    return Boolean(
      this.loginPassword() &&
        (this.loginUser() ||
          nonEmpty(process.env.SANTANDER_DOCUMENT) ||
          nonEmpty(process.env.SANTANDER_USERNAME))
    );
  }

  private loginUser(): string | undefined {
    return nonEmpty(process.env.SANTANDER_LOGIN_USER);
  }

  private loginPassword(): string | undefined {
    return (
      nonEmpty(process.env.SANTANDER_LOGIN_PASSWORD) ||
      nonEmpty(process.env.SANTANDER_PASSWORD)
    );
  }

  private cookieHeader(): string | undefined {
    if (this.cookies.size === 0) return undefined;
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  private browserHeaders(origin: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Accept-Language": "es-UY,es;q=0.9",
      Origin: origin,
      Referer: `${origin}/`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
    };
    const cookie = this.cookieHeader();
    if (cookie) headers.Cookie = cookie;
    return headers;
  }

  private baseHeaders(protectedCommunication: boolean) {
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "es-UY,es;q=0.9",
      "Content-Type": "application/json;charset=UTF-8",
      Origin: "https://supernet.santander.com.uy",
      Referer: "https://supernet.santander.com.uy/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
      "X-Channel": "1",
      "X-App-Version": this.appVersion,
    };

    const cookie = this.cookieHeader();
    if (cookie) headers.Cookie = cookie;
    if (this.authToken) headers["X-Auth-Token"] = this.authToken;
    if (this.sessionId) headers["X-ICBanking-Session"] = this.sessionId;
    if (protectedCommunication) {
      headers["X-Protected-Communication"] = "true";
      headers["X-Compressed-Communication"] = "true";
    }

    return headers;
  }

  private async discoverPortalLoginRoute(): Promise<SantanderPortalLoginRoute> {
    const loginKind =
      nonEmpty(process.env.SANTANDER_LOGIN_KIND)?.toLowerCase() || "person";
    const isCompany = loginKind === "company";
    const documentNumber = (
      this.loginUser() ||
      nonEmpty(process.env.SANTANDER_DOCUMENT) ||
      ""
    ).replace(/\D/g, "");
    const portalPrefix =
      nonEmpty(process.env.SANTANDER_PORTAL_DOCUMENT_PREFIX) ||
      DEFAULT_PORTAL_DOCUMENT_PREFIX;
    const username = isCompany
      ? nonEmpty(process.env.SANTANDER_USERNAME) || this.loginUser() || ""
      : nonEmpty(process.env.SANTANDER_PORTAL_USERNAME) ||
        `${portalPrefix}-${documentNumber}`;

    const portalPage = await axios.get(`${PORTAL_ORIGIN}/`, {
      headers: this.browserHeaders(PORTAL_ORIGIN),
      timeout: 15000,
      validateStatus: () => true,
    });
    this.absorbResponseCookies(portalPage);
    if (portalPage.status < 200 || portalPage.status >= 400) {
      throw new SantanderApiError(
        `Santander portal returned HTTP ${portalPage.status}`,
        portalPage.status
      );
    }

    const portalResponse = await axios.post(
      `${PORTAL_ORIGIN}/santander-login/api-login`,
      JSON.stringify({
        username,
        bill: "",
        IsCompany: isCompany,
        bill_empresa: "",
      }),
      {
        headers: {
          ...this.browserHeaders(PORTAL_ORIGIN),
          "Content-Type": "text/plain;charset=UTF-8",
        },
        timeout: 15000,
        validateStatus: () => true,
      }
    );
    this.absorbResponseCookies(portalResponse);
    if (portalResponse.status < 200 || portalResponse.status >= 300) {
      throw new SantanderApiError(
        `Santander login portal returned HTTP ${portalResponse.status}`,
        portalResponse.status
      );
    }

    const loginUrlValue = nonEmpty(portalResponse.data?.url);
    if (!loginUrlValue) {
      throw new SantanderApiError(
        "Santander login portal did not return a Supernet route"
      );
    }
    const loginUrl = new URL(loginUrlValue);
    if (
      loginUrl.origin !== SUPERNET_ORIGIN ||
      loginUrl.pathname !== "/Supernet_UI/"
    ) {
      throw new SantanderApiError(
        "Santander login portal returned an unexpected route"
      );
    }

    const hashQuery = loginUrl.hash.includes("?")
      ? loginUrl.hash.slice(loginUrl.hash.indexOf("?") + 1)
      : "";
    const hashParams = new URLSearchParams(hashQuery);
    const userName = nonEmpty(hashParams.get("userName") || undefined);
    const opaqueIsCompany = nonEmpty(
      hashParams.get("isCompany") || undefined
    );
    if (!userName || !opaqueIsCompany) {
      throw new SantanderApiError(
        "Santander login portal returned incomplete route parameters"
      );
    }

    const supernetPage = await axios.get(SUPERNET_ENTRY_URL, {
      headers: this.browserHeaders(SUPERNET_ORIGIN),
      timeout: 15000,
      validateStatus: () => true,
    });
    this.absorbResponseCookies(supernetPage);
    if (supernetPage.status < 200 || supernetPage.status >= 400) {
      throw new SantanderApiError(
        `Santander Supernet returned HTTP ${supernetPage.status}`,
        supernetPage.status
      );
    }

    return { userName, isCompany: opaqueIsCompany };
  }

  private absorbResponseCookies(response: AxiosResponse): void {
    const setCookie = response.headers?.["set-cookie"];
    const values = Array.isArray(setCookie)
      ? setCookie
      : setCookie
      ? [String(setCookie)]
      : [];

    for (const value of values) {
      const pair = value.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;

      const name = pair.slice(0, separator).trim();
      const cookieValue = pair.slice(separator + 1).trim();
      if (!name) continue;
      if (cookieValue) this.cookies.set(name, cookieValue);
      else this.cookies.delete(name);
    }
  }

  private async initialize(forceNewSession = false): Promise<void> {
    if (this.initialized && !forceNewSession) return;
    if (forceNewSession) this.cookies.clear();

    const response = await axios.get(`${API_BASE_URL}version`, {
      headers: this.baseHeaders(false),
      timeout: 15000,
      validateStatus: () => true,
    });
    this.absorbResponseCookies(response);

    if (response.status < 200 || response.status >= 300) {
      throw new SantanderApiError(
        `Santander version endpoint returned HTTP ${response.status}`,
        response.status
      );
    }

    if (!nonEmpty(process.env.SANTANDER_APP_VERSION)) {
      const apiVersion = nonEmpty(response.data?.apiVersion);
      if (apiVersion) this.appVersion = apiVersion;
    }

    if (forceNewSession || !this.sessionId) {
      this.sessionId = responseHeader(response, "x-icbanking-session");
    }
    if (!this.sessionId) {
      throw new SantanderApiError(
        "Santander did not return an anonymous session"
      );
    }

    this.initialized = true;
  }

  private decodeResponse(response: AxiosResponse, key: string): any {
    let data = response.data;
    if (headerIsEnabled(response, "x-protected-communication")) {
      const cipherResponse = data?.cipherResponse;
      if (typeof cipherResponse !== "string") {
        throw new SantanderApiError(
          "Santander returned a protected response without cipherResponse",
          response.status
        );
      }
      data = unprotectSantanderCommunication(cipherResponse, key);
    }

    if (headerIsEnabled(response, "x-compressed-communication")) {
      if (typeof data !== "string") {
        throw new SantanderApiError(
          "Santander returned an invalid compressed response",
          response.status
        );
      }
      data = decompressSantanderCommunication(data);
    }

    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  }

  private async protectedRequest({
    method,
    path: requestPath,
    payload,
    skipInitialization = false,
    useUrlProtectionKey = false,
  }: ProtectedRequestOptions): Promise<any> {
    if (!skipInitialization) await this.initialize();

    const requestUrl = `${API_BASE_URL}${requestPath}`;
    const requestKey = deriveSantanderProtectionKey(
      useUrlProtectionKey ? undefined : this.authToken,
      useUrlProtectionKey ? undefined : this.sessionId,
      requestUrl
    );
    const plainText =
      method === "GET"
        ? serializeSantanderGetPayload(payload)
        : serializeSantanderJsonPayload(payload);
    const cipherData = protectSantanderCommunication(
      compressSantanderCommunication(plainText),
      requestKey
    );
    const headers = this.baseHeaders(true);
    if (useUrlProtectionKey) {
      delete headers["X-Auth-Token"];
      delete headers["X-ICBanking-Session"];
    }

    const response =
      method === "GET"
        ? await axios.get(
            `${requestUrl}?cipherParams=${encodeURIComponent(
              cipherData.replaceAll("=", "#")
            )}`,
            {
              headers,
              timeout: 15000,
              validateStatus: () => true,
            }
          )
        : await axios.post(
            requestUrl,
            {
              cipherData,
            },
            {
              headers,
              timeout: 15000,
              validateStatus: () => true,
            }
          );

    this.absorbResponseCookies(response);
    const decoded = this.decodeResponse(response, requestKey);
    const nextSession = responseHeader(response, "x-icbanking-session");
    const nextAuthToken = responseHeader(response, "x-auth-token");
    if (nextSession) this.sessionId = nextSession;
    if (nextAuthToken) this.authToken = nextAuthToken;

    if (response.status < 200 || response.status >= 300) {
      const detail = safeApiErrorDetail(decoded);
      throw new SantanderApiError(
        `Santander API returned HTTP ${response.status}${
          detail ? ` (${detail})` : ""
        }`,
        response.status
      );
    }

    return decoded;
  }

  private buildLoginPayload(): Record<string, unknown> {
    const password = this.loginPassword();
    if (!password) throw new Error("SANTANDER_LOGIN_PASSWORD is required");

    const explicitUsername = nonEmpty(process.env.SANTANDER_USERNAME);
    const loginKind =
      nonEmpty(process.env.SANTANDER_LOGIN_KIND)?.toLowerCase() || "person";

    if (loginKind === "company") {
      const companyUsername = explicitUsername || this.loginUser();
      if (!companyUsername) {
        throw new Error(
          "SANTANDER_LOGIN_USER or SANTANDER_USERNAME is required for a company login"
        );
      }
      return buildSantanderCompanyLoginPayload(companyUsername, password);
    }

    if (explicitUsername) {
      const documentNumber =
        nonEmpty(process.env.SANTANDER_DOCUMENT) ||
        this.loginUser() ||
        explicitUsername.split("-").at(-1) ||
        explicitUsername;
      const payload = buildSantanderPersonalLoginPayload(
        documentNumber,
        password,
        nonEmpty(process.env.SANTANDER_COUNTRY_DOCUMENT_PREFIX) || "858-1"
      );
      payload.userName = explicitUsername;
      const extendedProperties = payload.extendedProperties as Record<
        string,
        any
      >;
      extendedProperties.finalUsername = extendedString(explicitUsername);
      return payload;
    }

    return buildSantanderPersonalLoginPayload(
      this.loginUser() || nonEmpty(process.env.SANTANDER_DOCUMENT) || "",
      password,
      nonEmpty(process.env.SANTANDER_COUNTRY_DOCUMENT_PREFIX) || "858-1"
    );
  }

  private async prepareLoginPayload(): Promise<Record<string, unknown>> {
    const payload = this.buildLoginPayload();
    const portalRoute = await this.discoverPortalLoginRoute();

    const coexistence = await this.protectedRequest({
      method: "POST",
      path: "Administration/UsersExtended/GetCoexistentUrlInformation",
      payload: {
        $type: COEXISTENT_URL_INFORMATION_TYPE,
        commonName: portalRoute.userName,
        isCompany: portalRoute.isCompany,
      },
      skipInitialization: true,
      useUrlProtectionKey: true,
    });
    const canonicalUsername = nonEmpty(coexistence?.commonName);
    if (!canonicalUsername) {
      const detail = safeApiErrorDetail(coexistence);
      throw new SantanderApiError(
        `Santander could not resolve the login identity${
          detail ? ` (${detail})` : ""
        }`
      );
    }

    payload.userName = canonicalUsername;
    const extendedProperties = payload.extendedProperties as Record<
      string,
      unknown
    >;
    extendedProperties.finalUsername = extendedString(canonicalUsername);

    // Supernet loads the user's security image before submitting the
    // password. Reproduce the call to keep the anonymous login session in the
    // same state, but never persist or expose the returned image.
    await this.protectedRequest({
      method: "GET",
      path: "Framework/AuthenticationExtended/UserImageForLogin",
      payload: {
        $type: USER_IMAGE_FOR_LOGIN_TYPE,
        username: canonicalUsername,
        extendedProperties,
      },
    });

    return payload;
  }

  private async signIn(): Promise<void> {
    if (!this.hasCredentials()) {
      throw new SantanderApiError(
        "Santander authentication requires SANTANDER_LOGIN_USER and SANTANDER_LOGIN_PASSWORD, or a paired SANTANDER_AUTH_TOKEN and SANTANDER_SESSION_ID"
      );
    }

    this.authToken = undefined;
    const loginPayload = await this.prepareLoginPayload();
    const response = await this.protectedRequest({
      method: "POST",
      path: "Administration/General/SignIn",
      payload: loginPayload,
    });

    if (!this.authToken) {
      const detail = safeApiErrorDetail(response);
      throw new SantanderApiError(
        `Santander rejected the login${detail ? ` (${detail})` : ""}`
      );
    }
  }

  private async requestPublicQuotation(): Promise<SantanderQuoteResponse> {
    return this.protectedRequest({
      method: "GET",
      path: "Custom/Custom/GetPublicQuotation",
      payload: {
        $type: PUBLIC_QUOTATION_TYPE,
        constructor: "",
      },
    });
  }

  private async requestPreferentialRates(): Promise<SantanderExchangeRateResponse> {
    return this.protectedRequest({
      method: "GET",
      path: "Custom/Custom/GetSantanderExchangeRate",
      payload: {
        $type: SANTANDER_EXCHANGE_RATE_TYPE,
        extendedProperties: {
          isDictionary: true,
          _keys: [],
        },
      },
    });
  }

  private async authenticatedRequest<T>(
    request: () => Promise<T>
  ): Promise<T> {
    await this.initialize();

    let authenticatedWithCredentials = false;
    if (!this.authToken) {
      await this.signIn();
      authenticatedWithCredentials = true;
    }

    try {
      const response = await request();
      if (authenticatedWithCredentials) this.saveSessionCache();
      return response;
    } catch (error) {
      const unauthorized =
        error instanceof SantanderApiError && error.status === 401;
      if (
        !unauthorized ||
        authenticatedWithCredentials ||
        !this.hasCredentials()
      ) {
        throw error;
      }

      // A configured/cached session may have expired. Mint a new anonymous
      // session and perform one credential login; never retry credentials.
      this.authToken = undefined;
      this.sessionId = undefined;
      await this.initialize(true);
      await this.signIn();
      const response = await request();
      this.saveSessionCache();
      return response;
    }
  }

  async getPublicQuotation(): Promise<SantanderQuoteResponse> {
    return this.authenticatedRequest(() => this.requestPublicQuotation());
  }

  async getPreferentialRates(): Promise<SantanderExchangeRateResponse> {
    return this.authenticatedRequest(() => this.requestPreferentialRates());
  }
}

class CambioSantander extends Cambio {
  private readonly client = new SantanderApiClient();

  name = "Santander";
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=1137";
  website = "https://www.santander.com.uy/";
  favicon = "https://www.santander.com.uy/";

  async get_data(): Promise<CambioObj[]> {
    const response = await this.client.getPublicQuotation();
    return [parseSantanderPublicQuotation(response)];
  }

  async sync_data(): Promise<void> {
    await super.sync_data();

    try {
      const response = await this.client.getPreferentialRates();
      const rates = normalizeSantanderPreferentialRates(
        response.cotizations ?? []
      );
      await applySantanderPreferentialRates(rates);
      console.log(
        `Stored ${rates.length} Santander preferential exchange rates`
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(
        `Santander preferential rate sync failed; keeping the last good snapshot: ${detail}`
      );
    }
  }
}

export default CambioSantander;

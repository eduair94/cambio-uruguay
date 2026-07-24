# classes/cambios — AGENTS

One scraper per casa de cambio / bank: each fetches its own USD (+ARS/BRL/EUR/…) buy/sell and returns normalized rate rows.

## Layout
- 51 `.ts` files, one class per casa, all `extends Cambio` (../cambio.ts), `export default`.
- Registered in `../origins.ts` `origins` map: **45 active keys, 5 commented-out** with inline reasons (cambio_salto_grande, mas_cambio, cambio_vexel, cambio_velso, aspen). Only registered keys run.
- **Registry KEY = the `origin` string** (DB identifier + display-name lookup via ../cambioInfo.ts), passed to `new Class(key)`. Key ≠ filename often: `la_favorita`→lafavorita.ts, `cambio_rynder`→rynder.ts, `matriz`→cambio_matriz.ts, `itau`→itau.ts, `bcu`→bcu.ts.

## Contract (../cambio.ts `abstract class Cambio`)
Subclass sets instance fields + implements one method:
- Required fields: `name` (casa display name), `website`, `favicon`, `bcu` (BCU institution URL). Usually a private `conversions` map: source currency label → `{code, type, name}`.
- `abstract get_data(): Promise<CambioObj[]>` — the ONLY thing you implement. Returns flat rows.
- `CambioObj` (../../interfaces/Cambio.ts): `{ code, type, name, buy, sell }` (+ optional origin/date/bcu). `code`=ISO (USD/ARS/BRL/EUR/UI/XAU…), `type`=rate variant (`""` plain, `EBROU`, bcu uses `BILLETE`/`CABLE`/`PROMED.FONDO`), **`name`=the CURRENCY label from the source (e.g. "Dólar"), NOT the casa** — casa identity is `origin`.
- Base helpers you get free: `fix_money(value, code?, cambio?)` (comma→dot decimals, strips thousands dots for XAU, NaN→0 — always run raw text through it); `sync_data()` (calls get_data, **drops rows where buy==0 && sell==0**, bulkUpsert into Mongo `cambio-uy` keyed origin+date+code+type, date = Montevideo `startOf('day')`); `save`, `obtener_datos*`, `getLocations` (BCU sucursales → `bcu_suc`). Constructor wires the Mongoose instances; axios global timeout 15s.
- `../sync_cambio.ts` `sync_cambios()` loops `origins`, `new Class(key)`, `await sync_data()`, 500ms throttle, writes `last_sync.txt` + `last_sync_results.json`. Driven by root `sync.ts` (`npm run sync`).

## get_data patterns
- **Plain HTML+cheerio (most, e.g. gales.ts):** `axios.get(website)` → `load` → map table rows → `.filter(el => conversions[label])` → `fix_money`. Copy gales.ts for a new simple casa.
- **BROU (brou.ts):** POST portlet endpoint; emits USD `""` + USD `EBROU`, plus EUR/ARS/BRL/GBP/CHF/PYG/UI/XAU. Canonical source others mirror.
- **DB-derived — NO own site fetch:** `cambio_federal`, `cambio_argentino`, `cambio_romantico` do `db.allEntries({origin:"brou", date})` and mirror BROU rows (federal drops `EBROU`); `fortex` writes to DB after `/api/ex`. **These throw/false-fail without a live Mongo connection** — not broken.
- **Session auth — prex.ts:** minted PHPSESSID web session (`prexWebLogin`: GET/POST `/login` → OTP polled from `PREX_OTP_URL` mailbox → `int_do_clave`), cached to `prex_session.txt`; falls back to mobile API. Envs: `PREX_LOGIN_USER`/`PREX_LOGIN_PASSWORD`/`PREX_OTP_URL`/`PREX_USER_ID`/`PREX_SESSION_ID`, `prexEmail`/`prexPassword`; optional `proxy.txt` (http proxy). Only pushes USD when finite & >0. Also `../../scripts/oneoff/prex.ts` (`npm run prex`).
- **Session auth — oca.ts:** logs into OCA Mi Cuenta with `OCA_LOGIN_USER`/`OCA_LOGIN_PASSWORD`, parses the server-rendered `.tabla-cotizacion`, and caches only `AWSALB`/`AWSALBCORS`/`JSESSIONID` in gitignored `oca_session.json`. It reuses the session until the table disappears, then logs in again. Also `../../scripts/oneoff/oca.ts` (`npm run oca`).
- **Session auth — santander.ts:** calls Santander Supernet's protected API with `SANTANDER_LOGIN_USER`/`SANTANDER_LOGIN_PASSWORD`, refreshes an expired authenticated session once, and caches its token/session in gitignored `santander_session.json`. Also `../../scripts/oneoff/santander.ts` (`npm run santander`).
- **Proxy+retry — cambio_aguerrebere.ts, cambio_pando.ts:** `ProxyFileService.getInstance().getNextProxy()` (socks5) + `axios-retry` (403/5xx) + browser UA. `../ProxyFileService.ts` pulls proxyscrape (`PROXY_SCRAPE_API_KEY`), caches `proxy_scrape.json`. pando = Astro behind Cloudflare bot-fight (IP-based 403 → needs prod/proxy).
- **Puppeteer — cambio_regul.ts** (JS-rendered). **cambio18.ts** = Wix: rates NOT in DOM, parsed from inlined `<script id="wix-warmup-data">` JSON (recursive walk), no puppeteer.
- **bcu.ts** SOAP-primary via `../bcu_soap.ts`; emits USD BILLETE/CABLE/PROMED.FONDO (central-bank reference).

## Validate ONE / all
- `npx ts-node ../../scripts/oneoff/validate_cambios.ts` — connects Mongo via `startConnectionPromise()` (env `MONGODB_URI`) FIRST so derived scrapers resolve, then runs every origin's `get_data()` in batches of 6, 30s timeout each. Coherence checks: buy/sell>0, buy<sell, USD in 25-70 band, cross-scraper USD median outliers (>3). Sets `NODE_TLS_REJECT_UNAUTHORIZED=0` (some UY gov TLS chains are broken).
- No single-origin CLI flag: to test one, narrow `keys`, or ad-hoc `await new (origins as any)[key](key).get_data()`.
- **STALE npm scripts:** `test_aguerrebere`/`test_*`/`debug_*` in package.json point to root `test_cambio_*.ts`/`debug_*.ts` that don't exist in a clean checkout (were local-only). Use validate_cambios.ts instead.
- Puppeteer/proxy scrapers (aguerrebere, regul, pando) fail locally on **Windows** (Chrome path / proxy) but work on the prod Linux box. Prod ground truth = query `https://api.cambio-uruguay.com/` and count origins returning data.

## Downstream API rate-row gotchas (consumers of `https://api.cambio-uruguay.com/`, not this dir's output)
Flat, ungrouped array; rate `type`s interleaved per currency; **no BILLETE for USD** there; `name` field is the CURRENCY not the casa; BCU has no USD at the consumer layer. See memory `api-rate-rows-gotchas`.

## Add a casa
Create `classes/cambios/<x>.ts` (extend Cambio; set name/website/favicon/bcu + conversions + get_data), then `import` it and add a KEY in `../origins.ts`. The key becomes the DB `origin` and the display-name lookup in ../cambioInfo.ts. Validate before committing.

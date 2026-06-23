import axios from "axios";
import axiosRetry from "axios-retry";
import { load } from "cheerio";
import { SocksProxyAgent } from "socks-proxy-agent";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import { ProxyFileService } from "../ProxyFileService";

// Cambio Pando (Astro site, Cloudflare-fronted). Two problems were fixed here:
//   1. HTTP 403 — Cloudflare bot-fight intermittently blocks the scraper host's
//      IP. We mirror the Aguerrebere approach (rotating SOCKS proxy + retry +
//      realistic browser headers), the proven 403-beating pattern in this repo.
//   2. Stale parse — the site was redesigned to an "exchange-board" table whose
//      currency cell now reads "🇺🇸 USD Dólar Americano" and whose prices carry a
//      "$ " prefix. The old conversions map keyed on "Dólar" never matched and
//      fix_money("$ 38.90") returned NaN, so even a 200 response yielded 0 rows.
//      We now detect the ISO code embedded in the cell and strip the "$".
class CambioPando extends Cambio {
  name = "Cambio Pando";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2545";
  website = "https://www.cambiopando.com.uy/";
  favicon = "https://www.cambiopando.com.uy/";

  private codeFrom(text: string): string | null {
    const m = text.toUpperCase().match(/\b(USD|ARS|BRL|EUR)\b/);
    return m ? m[1] : null;
  }

  async get_data(): Promise<CambioObj[]> {
    const proxyService = ProxyFileService.getInstance();
    const proxyUrl = await proxyService.getNextProxy();

    const axiosInstance = axios.create();
    if (proxyUrl) {
      const agent = new SocksProxyAgent(proxyUrl);
      axiosInstance.defaults.httpAgent = agent;
      axiosInstance.defaults.httpsAgent = agent;
    }

    axiosRetry(axiosInstance, {
      retries: 3,
      retryDelay: (retryCount) => retryCount * 1000,
      retryCondition: (error) =>
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === 403 ||
        (error.response?.status >= 500 && error.response?.status <= 599),
      onRetry: async (retryCount, _error, requestConfig) => {
        const newProxyUrl = await proxyService.getNextProxy();
        if (newProxyUrl) {
          const newAgent = new SocksProxyAgent(newProxyUrl);
          requestConfig.httpAgent = newAgent;
          requestConfig.httpsAgent = newAgent;
        }
      },
    });

    const web_data = await axiosInstance
      .get(this.website, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "es-UY,es;q=0.9,en;q=0.8",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
        },
      })
      .then((res) => res.data);

    const $ = load(web_data);
    const result = $("table tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1)").text().trim(),
        compra: $(element).find("td:nth-of-type(2)").text().replace(/\$/g, "").trim(),
        venta: $(element).find("td:nth-of-type(3)").text().replace(/\$/g, "").trim(),
      }))
      .get();

    const out: CambioObj[] = [];
    for (const el of result) {
      const code = this.codeFrom(el.moneda);
      if (!code) continue;
      const buy = this.fix_money(el.compra);
      const sell = this.fix_money(el.venta);
      if (!buy && !sell) continue;
      out.push({ code, type: "", name: el.moneda.replace(/[^\p{L}\s]/gu, "").trim(), buy, sell });
    }
    return out;
  }
}

export default CambioPando;

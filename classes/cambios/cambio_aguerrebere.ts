import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioAguerrebere extends Cambio {
  name = "Cambio Aguerrebere";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2370";
  private conversions = {
    USD: {
      code: "USD",
      type: "",
      name: "Dolar",
    },
    ARS: {
      code: "ARS",
      type: "",
      name: "Peso",
    },
    BRL: {
      code: "BRL",
      type: "",
      name: "Real",
    },
    EUR: {
      code: "EUR",
      type: "",
      name: "Euro",
    },
  };
  website = "https://cambioaguerrebere.com/";
  favicon = "https://cambioaguerrebere.com/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get("https://cambioaguerrebere.com/", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-UY,es;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    }).then((res) => res.data);
    const $ = load(web_data);

    // Find the exchange rate container
    const container = $(".container .row");

    // Extract currency codes from .currency-name spans in the first column
    const currencies = container
      .find(".col:first-child .currency-name, .col:first-child .currency-name-eur")
      .map((i, el) => $(el).text().trim())
      .get();

    // Extract buy rates from the second column (COMPRA)
    const buyRates = container
      .find(".col:nth-child(2) .value")
      .map((i, el) => $(el).text().trim())
      .get()
      .filter(val => val && val !== "COMPRA"); // Filter out header

    // Extract sell rates from the third column (VENTA)
    const sellRates = container
      .find(".col:nth-child(3) .value")
      .map((i, el) => $(el).text().trim())
      .get()
      .filter(val => val && val !== "VENTA"); // Filter out header

    const result: CambioObj[] = [];

    for (let i = 0; i < currencies.length; i++) {
      const currencyCode = currencies[i];
      
      if (this.conversions[currencyCode] && buyRates[i] && sellRates[i]) {
        // Remove $ symbol before calling fix_money
        const buyRate = this.fix_money(buyRates[i].replace("$", ""));
        const sellRate = this.fix_money(sellRates[i].replace("$", ""));

        if (buyRate && sellRate) {
          const { code, type, name } = this.conversions[currencyCode];
          result.push({
            code,
            type,
            name,
            buy: buyRate,
            sell: sellRate,
          });
        }
      }
    }

    return result;
  }
}

export default CambioAguerrebere;

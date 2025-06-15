import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioAguerrebere extends Cambio {
  name = "Cambio Aguerrebere";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2370";
  private conversions = {
    Dolar: {
      code: "USD",
      type: "",
    },
    Peso: {
      code: "ARS",
      type: "",
    },
    Real: {
      code: "BRL",
      type: "",
    },
    Euro: {
      code: "EUR",
      type: "",
    },
  };
  website = "https://cambioaguerrebere.com/";
  favicon = "https://cambioaguerrebere.com/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get("https://cambioaguerrebere.com/").then((res) => res.data);
    const $ = load(web_data);

    // Find the exchange rate container
    const container = $(".container .row");

    // Extract currency names from the first column (excluding header)
    const currencies = container
      .find(".col:first-child .value")
      .map((i, el) => $(el).text().trim())
      .get();

    // Extract buy rates from the second column (COMPRA) (excluding header)
    const buyRates = container
      .find(".col:nth-child(2) .value")
      .map((i, el) => $(el).text().trim())
      .get();

    // Extract sell rates from the third column (VENTA) (excluding header)
    const sellRates = container
      .find(".col:nth-child(3) .value")
      .map((i, el) => $(el).text().trim())
      .get();

    // Map currency codes to the expected format
    const currencyMapping: { [key: string]: string } = {
      USD: "Dolar",
      ARS: "Peso",
      BRL: "Real",
      EUR: "Euro",
    };

    const result: CambioObj[] = [];

    for (let i = 0; i < currencies.length; i++) {
      const currencyCode = currencies[i];
      const currencyName = currencyMapping[currencyCode];
      if (currencyName && this.conversions[currencyName] && buyRates[i] && sellRates[i]) {
        // Remove $ symbol before calling fix_money
        const buyRate = this.fix_money(buyRates[i].replace("$", ""));
        const sellRate = this.fix_money(sellRates[i].replace("$", ""));

        if (buyRate && sellRate) {
          const { code, type } = this.conversions[currencyName];
          result.push({
            code,
            type,
            name: currencyName,
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

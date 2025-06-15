import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioLaFavorita extends Cambio {
  name = "Cambio La Favorita";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2581";
  conversions = {
    "Dólar Estadounidense": {
      code: "USD",
      type: "",
    },
    Euro: {
      code: "EUR",
      type: "",
    },
    "Peso Argentino": {
      code: "ARS",
      type: "",
    },
    Real: {
      code: "BRL",
      type: "",
    },
    "Franco Suizo": {
      code: "CHF",
      type: "",
    },
    "Libra Esterlina": {
      code: "GBP",
      type: "",
    },
    "Dólar Canadiense": {
      code: "CAD",
      type: "",
    },
    "Dólar Australiano": {
      code: "AUD",
      type: "",
    },
    "Peso Chileno": {
      code: "CLP",
      type: "",
    },
    Guaraní: {
      code: "PYG",
      type: "",
    },
    "Sol Peruano": {
      code: "PEN",
      type: "",
    },
    "Peso Mexicano": {
      code: "MXN",
      type: "",
    },
    Yen: {
      code: "JPY",
      type: "",
    },
    "Peso Colombiano": {
      code: "COP",
      type: "",
    },
    "Dólar Interbancario": {
      code: "USD",
      type: "INTERBANCARIO",
    },
  };
  website = "https://lafavorita.com.uy/cotizaciones/";
  favicon = "https://lafavorita.com.uy";

  findCurrencyKey(monedaName: string): string | null {
    // Clean the currency name by removing extra spaces and trimming
    const cleanName = monedaName.trim();

    // Direct match first
    if (this.conversions[cleanName]) {
      return cleanName;
    }

    // Fallback: search for partial matches or similar names
    for (const key in this.conversions) {
      if (key.toLowerCase().includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(key.toLowerCase())) {
        return key;
      }
    }

    return null;
  }
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);

    // Find all table rows in the exchange rates table
    const result = $("table tbody tr")
      .map((i: number, element) => {
        const $row = $(element);
        const moneda = $row.find("td.moneda-table").text().trim();
        const compra = $row.find("td[data-label='Compra']").text().trim();
        const venta = $row.find("td[data-label='Venta']").text().trim();

        return {
          moneda,
          compra,
          venta,
        };
      })
      .get();

    const f = result
      .filter((el) => el.moneda && el.compra && el.venta)
      .map((el) => {
        // Map currency names to our conversion table
        const currencyKey = this.findCurrencyKey(el.moneda);
        if (!currencyKey) {
          console.log(`Currency not found for: ${el.moneda}`);
          return null;
        }

        const { code, type } = this.conversions[currencyKey];
        return {
          code,
          type,
          name: el.moneda,
          buy: this.fix_money(el.compra, code, "lafavorita"),
          sell: this.fix_money(el.venta, code, "lafavorita"),
        };
      })
      .filter(Boolean);

    console.log(f);
    return f;
  }
}

export default CambioLaFavorita;

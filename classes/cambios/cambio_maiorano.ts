import axios from "axios";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

interface MaioranoApiResponse {
  code: number;
  message: string;
  data: {
    dolar_buy: string;
    dolar_sell: string;
    arg_buy: string;
    arg_sell: string;
    real_buy: string;
    real_sell: string;
    euro_buy: string;
    euro_sell: string;
    date: string;
  };
}

class CambioMaiorano extends Cambio {
  name = "Cambio Maiorano";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2471";
  website = "https://www.cambiomaiorano.com/";
  favicon = "https://www.cambiomaiorano.com/";

  async get_data(): Promise<CambioObj[]> {
    try {
      const response = await axios.get<MaioranoApiResponse>("https://cambiomaiorano.com/wp-content/plugins/cotizacion-eze/api/index.php");

      if (response.data.code !== 200) {
        throw new Error(`API error: ${response.data.message}`);
      }

      const data = response.data.data;
      const result: CambioObj[] = [
        {
          code: "USD",
          type: "",
          name: "Dólar",
          buy: this.fix_money(data.dolar_buy),
          sell: this.fix_money(data.dolar_sell),
        },
        {
          code: "ARS",
          type: "",
          name: "Peso Argentino",
          buy: this.fix_money(data.arg_buy),
          sell: this.fix_money(data.arg_sell),
        },
        {
          code: "BRL",
          type: "",
          name: "Real",
          buy: this.fix_money(data.real_buy),
          sell: this.fix_money(data.real_sell),
        },
        {
          code: "EUR",
          type: "",
          name: "Euro",
          buy: this.fix_money(data.euro_buy),
          sell: this.fix_money(data.euro_sell),
        },
      ];

      return result;
    } catch (error) {
      console.error("Error fetching Cambio Maiorano data:", error);
      throw error;
    }
  }
}

export default CambioMaiorano;

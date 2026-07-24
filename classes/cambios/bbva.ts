import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import { fetchDolarAhoraUsdRate } from "./dolarahora";

class CambioBbva extends Cambio {
  name = "BBVA";
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=1153";
  website = "https://www.bbva.com.uy/";
  favicon = "https://www.bbva.com.uy/favicon.ico";

  async get_data(): Promise<CambioObj[]> {
    const rate = await fetchDolarAhoraUsdRate("bbva");
    if (!rate) {
      console.warn("BBVA: DólarAhora did not return a valid online USD quote");
      return [];
    }
    console.log(`BBVA online USD rates: buy=${rate.buy}, sell=${rate.sell}`);
    return [rate];
  }
}

export default CambioBbva;

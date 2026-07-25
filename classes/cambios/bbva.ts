import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import { withDolarAhoraFallback } from "./dolarahora";

class CambioBbva extends Cambio {
  name = "BBVA";
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=1153";
  website = "https://www.bbva.com.uy/";
  favicon = "https://www.bbva.com.uy/favicon.ico";

  // BBVA publishes no public quotation endpoint, so DólarAhora is the only
  // source here rather than a fallback.
  async get_data(): Promise<CambioObj[]> {
    return withDolarAhoraFallback("bbva", "BBVA", async () => []);
  }
}

export default CambioBbva;

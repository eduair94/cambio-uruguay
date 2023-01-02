import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioBrou extends Cambio {
  name = "brou";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=1001";
  website = "https://www.brou.com.uy/cotizaciones";
  favicon = "https://www.brou.com.uy";

  similar_change = [
    {
      name: "Cambio Romántico",
      bcu: "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2474",
      website: "https://www.cambioromantico.com/",
    },
    {
      name: "Cambio Argentino",
      bcu: "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2474",
      website: "https://www.cambioargentino.uy/",
    },
    {
      name: "Cambio Federal",
      bcu: "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2375",
      website: "https://cambiofederal.com.uy/",
    },
  ];

  private conversions = {
    Dólar: {
      code: "USD",
      type: "",
    },
    "Dólar eBROU": {
      code: "USD",
      type: "EBROU",
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
    "Libra Esterlina": {
      code: "GBP",
      type: "",
    },
    "Franco Suizo": {
      code: "CHF",
      type: "",
    },
    Guaraní: {
      code: "PYG",
      type: "",
    },
    "Unidad Indexada": {
      code: "UI",
      type: "",
    },
    "Onza Troy De Oro": {
      code: "XAU",
      type: "",
    },
  };
  async get_data(): Promise<CambioObj[]> {
    const url = "https://www.brou.com.uy/c/portal/render_portlet?p_l_id=20593&p_p_id=cotizacionfull_WAR_broutmfportlet_INSTANCE_otHfewh1klyS&p_p_lifecycle=0&p_t_lifecycle=0&p_p_state=normal&p_p_mode=view&p_p_col_id=column-1&p_p_col_pos=0&p_p_col_count=2&p_p_isolated=1&currentURL=%2Fcotizaciones";
    const body = "p_l_id=20593&p_p_id=cotizacionfull_WAR_broutmfportlet_INSTANCE_otHfewh1klyS&p_p_lifecycle=0&p_t_lifecycle=0&p_p_state=normal&p_p_mode=view&p_p_col_id=column-1&p_p_col_pos=0&p_p_col_count=2&p_p_isolated=1&currentURL=%2Fcotizaciones";
    const res = await axios.post(url, body).then((res) => res.data);
    const $ = load(res);
    const result = $("table tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1)").text().trim(),
        compra: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(5)").text().trim()),
        arbitraje_compra: this.fix_money($(element).find("td:nth-of-type(7)").text().trim()),
        arbitraje_venta: this.fix_money($(element).find("td:nth-of-type(9)").text().trim()),
      }))
      .get();

    const f = result.map((el) => {
      const { code, type } = this.conversions[el.moneda];
      return {
        code,
        type,
        name: el.moneda,
        buy: el.compra,
        sell: el.venta,
      };
    });
    return f;
  }
}

export default CambioBrou;

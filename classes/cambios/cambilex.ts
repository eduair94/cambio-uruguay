import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioCambilex extends Cambio {
  name = "Cambilex";
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2580";
  private conversions = {
    "Dolares Americanos": {
      code: "USD",
      type: "",
    },
    "Pesos Argentinos": {
      code: "ARS",
      type: "",
    },
    Reales: {
      code: "BRL",
      type: "",
    },
    Euros: {
      code: "EUR",
      type: "",
    },
  };
  website = "http://cambilex.com.uy";
  favicon = "http://cambilex.com.uy";

  fixNumber(number: string) {
    return number.replace(/\./, "");
  }

  async get_exchanges() {
    const url = "https://cambilex.com.uy/agencias-de-cambio/";
    const data = await axios.get(url).then((res) => res.data);
    const $ = load(data);
    let allSucs = [];
    $(".departamento").each((i, el) => {
      let depto = $(el).attr("departamento");
      if (depto) {
        depto = depto.toUpperCase();
      }
      const sucs = $(el)
        .find(".sucursal")
        .map((i, el) => {
          const dataSuc = $(el)
            .find("p")
            .html()
            .split("<br>")
            .map((el) => el.trim());

          const coords = $(el).find(".coordenadas").text();
          const coordsArr = coords.split(",");
          const [latitude, longitude] = coordsArr.map((el) => parseFloat(el));
          return {
            id: this.origin + "-" + $(el).parent().attr("marker"),
            CorreoElectronico: "info@cambilex.com.uy",
            Departamento: depto,
            Direccion: dataSuc[0].split("-")[0].trim(),
            Horarios: dataSuc[2],
            Localidad: "",
            Nombre: $(el).find("h3").text(),
            Observaciones: "",
            Pais: "URUGUAY",
            Telefono: this.fixNumber(dataSuc[1]),
            origin: this.origin,
            latitude,
            longitude,
          };
        })
        .get();
      allSucs.push(...sucs);
    });
    console.log("Total sucs", allSucs.length);
    for (let suc of allSucs) {
      await this.db_suc.getAnUpdateEntry({ id: suc.id }, suc);
    }
    console.log("Finish update cambilex");
  }

  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("table tr.cotizacion")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1)").text().trim(),
        compra: this.fix_money(
          $(element).find("td:nth-of-type(2)").text().trim(),
        ),
        venta: this.fix_money(
          $(element).find("td:nth-of-type(3)").text().trim(),
        ),
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

export default CambioCambilex;

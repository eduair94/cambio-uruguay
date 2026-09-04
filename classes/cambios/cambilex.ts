import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioCambilex extends Cambio {
  name = "Cambilex";
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2580";
  /**
   * Etiqueta del widget -> moneda, indexada en minusculas y sin tildes.
   *
   * Las claves viejas eran "Dolares Americanos" / "Pesos Argentinos" / "Reales" / "Euros", que es
   * como las escribia la tabla de antes del rediseno. El widget nuevo dice "Dolar", "Peso arg.",
   * "Real" y "Euro". Si se arreglaba SOLO el selector, la desestructuracion de una clave inexistente
   * tiraba TypeError y el scraper pasaba de mudo a roto.
   */
  private conversions: Record<string, { code: string; name: string }> = {
    dolar: { code: "USD", name: "Dolar" },
    "peso arg.": { code: "ARS", name: "Peso Argentino" },
    "peso arg": { code: "ARS", name: "Peso Argentino" },
    real: { code: "BRL", name: "Real" },
    euro: { code: "EUR", name: "Euro" },
  };
  website = "https://cambilex.com.uy";
  favicon = "https://cambilex.com.uy";

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

  /** Etiqueta normalizada: minusculas, sin tildes, espacios colapsados. */
  private label(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Cambilex rehizo el sitio en WordPress + Elementor y las cotizaciones dejaron de vivir en una
   * tabla: hoy son un widget de divs del plugin propio `cambilex-cotizaciones`. El selector viejo
   * `table tr.cotizacion` no matcheaba NADA —el home no tiene un solo `<table>`— asi que get_data
   * devolvia [] sin excepcion y el scraper quedaba "silent" en /estado en vez de "error".
   *
   * Los precios siguen viniendo server-rendered en el HTML inicial: no hace falta puppeteer.
   *
   * DOS TRAMPAS DEL MARKUP NUEVO:
   *  - El widget esta DUPLICADO (una copia desktop y otra para movil): 10 filas en el DOM para 5
   *    cotizaciones. Se deduplica por moneda.
   *  - Hay una fila "Dolar finza" con mejor precio de los dos lados (39,75/40,55 contra 39,05/41,45
   *    del mostrador). Finza es la APP de Cambilex, no la pizarra: NO se publica. Publicarla con
   *    type "" la haria competir como efectivo de mostrador y quedaria primera en "mejor venta" del
   *    sitio, que seria un precio de app disfrazado de precio de ventanilla. No se le pone
   *    TRANSFERENCIA porque no esta confirmado que sea transferencia: podria ser efectivo con
   *    descuento por app. Se publica lo que se sabe.
   */
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);

    const rows = $(".cc-grid-widget-row");
    if (rows.length === 0) {
      // El plugin define al menos cuatro layouts (.cc-grid-widget, .cc-tabla, .cc-widget-selector,
      // .cc-finza-widget). Si cambian el shortcode del home, este selector muere igual que el
      // anterior — y esta vez se avisa en vez de devolver [] callado.
      throw new Error(
        "cambilex: el home respondio pero no tiene ninguna .cc-grid-widget-row (otro layout del plugin?)",
      );
    }

    const out: CambioObj[] = [];
    const seen = new Set<string>();
    rows.each((_i, el) => {
      const label = this.label($(el).find(".cc-grid-widget-moneda").text());
      const conv = this.conversions[label];
      if (!conv) return; // "dolar finza" y cualquier moneda nueva
      if (seen.has(conv.code)) return; // la copia movil del mismo widget

      const nums = $(el).find(".cc-grid-widget-num");
      if (nums.length < 2) return;
      const buy = this.fix_money($(nums[0]).text().trim());
      const sell = this.fix_money($(nums[1]).text().trim());
      if (!(buy > 0) || !(sell > 0) || buy >= sell) return;

      seen.add(conv.code);
      out.push({ code: conv.code, type: "", name: conv.name, buy, sell });
    });

    return out;
  }
}

export default CambioCambilex;

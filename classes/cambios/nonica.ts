import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Nonica extends Cambio {
  name = "Cambio El Trébol";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2373";
  website = "https://www.cambioeltrebol.com";
  favicon = "https://www.cambioeltrebol.com";
  conversions = {
    Dólar: { code: "USD", type: "" },
    Euro: { code: "EUR", type: "" },
    "Peso Argentino": { code: "ARS", type: "" },
    Real: { code: "BRL", type: "" },
  };

  /**
   * El sitio se rehizo en WordPress + Elementor y ya no existe el `table#cotizaciones` del Joomla
   * viejo: la tabla la publica el widget "EA Advanced Data Table", cuya clase lleva el ID del
   * widget adentro (`ea-advanced-data-table-447aa9db`) y cambia si lo vuelven a editar. Ademas
   * desaparecio la columna indice: ahora es (moneda, compra, venta) en tds[0..2], no en tds[1..3].
   *
   * Por eso no se ancla ni en el id, ni en la clase, ni en la posicion: se recorren todas las filas
   * y se ancla en la CELDA que dice la moneda, tomando las dos siguientes.
   *
   * EL MATCH ES EXACTO A PROPOSITO. La misma tabla trae paridades cruzadas que NO son cotizaciones
   * en pesos uruguayos: "Dolares USA por Libra esterlina" 1.275/1.375, "Pesos Argentinos por Dolar"
   * 1.670/1.300, "Reales por Dolar" 5,20/4,90. Un match tolerante (contains "DOLAR") las publicaria
   * como USD/ARS, y dos de ellas tienen compra > venta: dispararian la guarda de rate_plausibility
   * y un Telegram por dia por una fila inventada. Las de oro dicen "CONSULTE" y caen por el filtro
   * de importe.
   */
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);

    const rows: CambioObj[] = [];
    $("table tr").each((_i, el) => {
      const cells = $(el)
        .find("td")
        .map((_j, td) => $(td).text().trim())
        .get();
      const at = cells.findIndex((c) => c in this.conversions);
      if (at === -1 || cells.length < at + 3) return;
      const { code, type } = this.conversions[cells[at]];
      const buy = this.fix_money(cells[at + 1]);
      const sell = this.fix_money(cells[at + 2]);
      if (buy > 0 && sell > 0) rows.push({ code, type, name: cells[at], buy, sell });
    });

    // Contrato de parseo: la pagina contesto 200 y no trajo UNA sola fila de moneda => el markup
    // volvio a cambiar. Lanzar es lo correcto — /estado pinta "error" con mensaje en vez de
    // "silent" sin ruido, que es exactamente como esto estuvo semanas sin que nadie lo viera.
    // NO generalizar este throw a classes/cambio.ts: alli volcaria a "error" a las casas que
    // legitimamente no cotizan fuera de horario.
    if (rows.length === 0) {
      throw new Error("nonica: cambioeltrebol.com respondio 200 pero no trajo ninguna fila de cotizacion");
    }
    return rows;
  }
}

export default Nonica;

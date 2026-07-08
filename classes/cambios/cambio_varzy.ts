import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioVarzy extends Cambio {
  name = "Cambio Varzy";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2500";
  website = "https://www.cambiovarzy.com/";
  favicon = "https://www.cambiovarzy.com";
  conversions = {
    Dólar: { code: "USD", type: "" },
    Euro: { code: "EUR", type: "" },
    "Peso Argentino": { code: "ARS", type: "" },
    Real: { code: "BRL", type: "" },
  };

  // Varzy embeds a shared BROU-correspondent rates widget (same rate source
  // pattern as cambio_federal/cambio_argentino/cambio_romantico, just fetched
  // live from the widget host instead of mirrored via the DB). index.php
  // 302-redirects to a token-stamped page each call — axios follows redirects
  // by default, so always hit index.php fresh. The redirect target 403s
  // ("Forbidden") without a Referer header (simple anti-hotlink check).
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios
      .get("https://cotizaciones.interactivo.com.uy/index.php", {
        headers: { "User-Agent": "Mozilla/5.0", Referer: this.website },
      })
      .then((res) => res.data);
    const $ = load(web_data);
    // Row layout is name-cell, then alternating value/spacer cells (Compra,
    // Venta, Arbitraje Compra, Arbitraje Venta) — spacers use class "valor1"
    // (empty), real values use "valor", so selecting ".valor" in document
    // order and taking the first two gives Compra/Venta regardless of the
    // spacer <td> column positions.
    const result = $(".portlet-body table tbody tr")
      .map((i: number, el) => {
        const valores = $(el).find(".valor");
        return {
          moneda: $(el).find(".moneda").first().text().trim(),
          compra: $(valores[0]).text().trim(),
          venta: $(valores[1]).text().trim(),
        };
      })
      .get()
      .filter((el) => el.moneda && this.conversions[el.moneda]);
    return result
      .map((el) => {
        const { code, type } = this.conversions[el.moneda];
        return {
          code,
          type,
          name: el.moneda,
          buy: this.fix_money(el.compra),
          sell: this.fix_money(el.venta),
        };
      })
      .filter((el) => el.buy > 0 && el.sell > 0);
  }
}

export default CambioVarzy;

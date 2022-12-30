import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import { find_string } from "../utils";

class CambioSir extends Cambio {
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2557";
  url_data =
    "https://wix-visual-data.appspot.com/index?pageId=z3e4p&compId=comp-jcuns6fw&viewerCompId=comp-jcuns6fw&siteRevision=859&viewMode=site&deviceType=desktop&locale=es&regionalLanguage=es&width=546&height=194&instance=LZ3cqmYVE5b0BUY_EJttjE49ogOMd-Z6xhgn3b3XFCw.eyJpbnN0YW5jZUlkIjoiOTkxNzhjOWEtYzcwMS00NmE0LWIyZWItODAyMDEwZTU4OTk1IiwiYXBwRGVmSWQiOiIxMzQxMzlmMy1mMmEwLTJjMmMtNjkzYy1lZDIyMTY1Y2ZkODQiLCJtZXRhU2l0ZUlkIjoiNTFiZGIzMzUtYjJhNi00NjRmLTkyZTItZTZhMmNiMTM4YzUyIiwic2lnbkRhdGUiOiIyMDIyLTEwLTI3VDEzOjU3OjMwLjY2N1oiLCJkZW1vTW9kZSI6ZmFsc2UsImFpZCI6IjEzODIwZTE0LTlhZjMtNGQxNC05ODhjLWMwODU5ODI5YTYxZSIsImJpVG9rZW4iOiJjOGFhM2ZhZi03NWE3LTAwZWItMjAwOS02NjgyZGJmNjA1YzciLCJzaXRlT3duZXJJZCI6IjEwOGFjOTAxLTRiYjQtNGViNi1hNjI2LTJiMTBhYzVmNDg0YSJ9&commonConfig=%7B%22brand%22%3A%22wix%22%2C%22bsi%22%3A%2277b9d62c-a0ed-413b-a67d-1c90e5a0b5e9%7C3%22%2C%22BSI%22%3A%2277b9d62c-a0ed-413b-a67d-1c90e5a0b5e9%7C3%22%7D&vsi=b8026f6c-0bb1-422b-a237-298665dd1018";
  website = "https://www.cambiosir.com.uy/";
  favicon = "https://www.cambiosir.com.uy/";
  conversions = {
    DÓLAR: {
      code: "USD",
      type: "",
    },
    EURO: {
      code: "EUR",
      type: "",
    },
    ARGENTINO: {
      code: "ARS",
      type: "",
    },
    REAL: {
      code: "BRL",
      type: "",
    },
  };
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.url_data).then((res) => res.data);
    let d: any = find_string(web_data, 'csvString":"', '",').split("\\n");
    d.pop();
    d.shift();
    d = d.map((el) => {
      const data = el.split(/\,/g);
      console.log("DATA", data, data[0]);
      const { code, type } = this.conversions[data[0]];
      return {
        code,
        type,
        name: data[0],
        buy: parseFloat(data[1]),
        sell: parseFloat(data[2]),
      };
    });
    return d;
  }
}

export default CambioSir;

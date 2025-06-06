import axios from "axios";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import { find_string } from "../utils";

class CambioSir extends Cambio {
  name = "Cambio Sir";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2557";
  url_data = "https://wix-visual-data.appspot.com/index";
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
    const params = {
      pageId: "z3e4p",
      compId: "comp-jcuns6fw",
      viewerCompId: "comp-jcuns6fw",
      siteRevision: "1188",
      viewMode: "site",
      deviceType: "desktop",
      locale: "es",
      regionalLanguage: "es",
      width: "481",
      height: "202",
      instance:
        "9zozl0SJfZFU4rI3Pg9gQ06iAugeuyWN1FW9lzp3HX0.eyJpbnN0YW5jZUlkIjoiOTkxNzhjOWEtYzcwMS00NmE0LWIyZWItODAyMDEwZTU4OTk1IiwiYXBwRGVmSWQiOiIxMzQxMzlmMy1mMmEwLTJjMmMtNjkzYy1lZDIyMTY1Y2ZkODQiLCJtZXRhU2l0ZUlkIjoiNTFiZGIzMzUtYjJhNi00NjRmLTkyZTItZTZhMmNiMTM4YzUyIiwic2lnbkRhdGUiOiIyMDI1LTA2LTA2VDAxOjQ4OjIzLjI1MVoiLCJkZW1vTW9kZSI6ZmFsc2UsImFpZCI6IjEwYTE5ZDcwLTU2NDEtNGFmMS1hYzEyLTU1YjkyOTlmOTM1MiIsImJpVG9rZW4iOiJjOGFhM2ZhZi03NWE3LTAwZWItMjAwOS02NjgyZGJmNjA1YzciLCJzaXRlT3duZXJJZCI6IjEwOGFjOTAxLTRiYjQtNGViNi1hNjI2LTJiMTBhYzVmNDg0YSIsImJzIjoiY3dLem9yblFIRV9VQXhpM1NqQnZjSEV2OVVUNDBDRV9zTXJEeVpHM0kyMCIsInNjZCI6IjIwMTgtMDEtMjNUMTg6NDA6MjMuODE0WiJ9",
      commonConfig: "%7B%22brand%22%3A%22wix%22%2C%22host%22%3A%22VIEWER%22%2C%22bsi%22%3A%2281ab3991-92dd-433c-882d-89a256c4ef47%7C1%22%2C%22siteRevision%22%3A%221188%22%2C%22renderingFlow%22%3A%22NONE%22%2C%22language%22%3A%22es%22%2C%22locale%22%3A%22%22%2C%22BSI%22%3A%2281ab3991-92dd-433c-882d-89a256c4ef47%7C1%22%7D",
      currentRoute: ".%2F",
      vsi: "69ac1175-63a7-43be-8ff1-f7a217524f0d",
    };

    const headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "es-ES,es;q=0.9,bg;q=0.8",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=0, i",
      referer: "https://www.cambiosir.com.uy/",
      "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "iframe",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
      "sec-fetch-storage-access": "active",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    };

    const web_data = await axios.get(this.url_data, { params, headers }).then((res) => res.data);
    let d: any = find_string(web_data, 'csvString":"', '",').split("\\n");
    d.pop();
    d.shift();
    d = d.map((el) => {
      const data = el.split(/\,/g);
      console.log("DATA", data, data[0]);
      const { code, type } = this.conversions[data[0].toUpperCase()];
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

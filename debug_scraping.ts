import axios from "axios";
import { load } from "cheerio";

async function debugScraping() {
  console.log("Debugging scraping step by step...");

  try {
    const web_data = await axios.get("https://cambioaguerrebere.com/").then((res) => res.data);
    const $ = load(web_data);

    console.log("1. Finding container...");
    const container = $(".container .row");
    console.log(`Found ${container.length} containers`);

    console.log("\n2. Extracting currencies from first column...");
    const currencies = container
      .find(".col:first-child .value")
      .map((i, el) => {
        const text = $(el).text().trim();
        console.log(`  Currency ${i}: "${text}"`);
        return text;
      })
      .get();

    console.log(`\nCurrencies array: [${currencies.join(", ")}]`);

    console.log("\n3. Extracting buy rates from second column...");
    const buyRates = container
      .find(".col:nth-child(2) .value")
      .map((i, el) => {
        const text = $(el).text().trim();
        console.log(`  Buy rate ${i}: "${text}"`);
        return text;
      })
      .get();

    console.log(`\nBuy rates array: [${buyRates.join(", ")}]`);

    console.log("\n4. Extracting sell rates from third column...");
    const sellRates = container
      .find(".col:nth-child(3) .value")
      .map((i, el) => {
        const text = $(el).text().trim();
        console.log(`  Sell rate ${i}: "${text}"`);
        return text;
      })
      .get();

    console.log(`\nSell rates array: [${sellRates.join(", ")}]`);

    console.log("\n5. Testing currency mapping...");
    const currencyMapping: { [key: string]: string } = {
      USD: "Dolar",
      ARS: "Peso",
      BRL: "Real",
      EUR: "Euro",
    };

    currencies.forEach((curr, i) => {
      const mapped = currencyMapping[curr];
      console.log(`  ${curr} -> ${mapped} (buy: ${buyRates[i]}, sell: ${sellRates[i]})`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

debugScraping();

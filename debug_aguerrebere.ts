import axios from "axios";
import { load } from "cheerio";

async function debugHTML() {
  console.log("Debugging HTML structure...");

  try {
    const web_data = await axios.get("https://cambioaguerrebere.com/").then((res) => res.data);
    const $ = load(web_data);

    // Look for the container with exchange rates
    console.log("Looking for containers...");

    const containers = $(".container");
    console.log(`Found ${containers.length} .container elements`);

    containers.each((i, container) => {
      console.log(`\nContainer ${i + 1}:`);
      const rows = $(container).find(".row");
      console.log(`  - Found ${rows.length} .row elements`);

      rows.each((j, row) => {
        console.log(`    Row ${j + 1}:`);
        const cols = $(row).find(".col");
        console.log(`      - Found ${cols.length} .col elements`);

        cols.each((k, col) => {
          console.log(`        Col ${k + 1}:`);
          const headers = $(col).find(".header");
          const values = $(col).find(".value");
          console.log(`          - Headers: ${headers.length}`);
          console.log(`          - Values: ${values.length}`);

          headers.each((h, header) => {
            console.log(`            Header ${h + 1}: "${$(header).text().trim()}"`);
          });

          values.each((v, value) => {
            console.log(`            Value ${v + 1}: "${$(value).text().trim()}"`);
          });
        });
      });
    });

    // Let's also try to find any elements with "USD", "COMPRA", "VENTA"
    console.log("\n=== Looking for specific text ===");
    console.log("USD elements:", $('*:contains("USD")').length);
    console.log("COMPRA elements:", $('*:contains("COMPRA")').length);
    console.log("VENTA elements:", $('*:contains("VENTA")').length);

    // Get the text content to see what we're working with
    const comprElements = $('*:contains("COMPRA")');
    console.log("\nElements containing COMPRA:");
    comprElements.each((i, el) => {
      console.log(`${i + 1}. ${$(el).prop("tagName")}.${$(el).attr("class")} - "${$(el).text().trim().substring(0, 100)}"`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

debugHTML();

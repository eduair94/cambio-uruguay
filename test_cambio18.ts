import axios from "axios";
import { load } from "cheerio";

async function test() {
  try {
    const response = await axios.get("https://www.cambio18.com");
    const $ = load(response.data);
    
    console.log("Testing table selectors...\n");
    
    // Test the new table structure
    const rows = $('table.mtQJtX tbody.VUpDdz tr.UhXTve');
    console.log(`Found ${rows.length} rows\n`);
    
    rows.each((i, row) => {
      const moneda = $(row).find('td:nth-of-type(2) div.ZTH0AF').text().trim();
      const compra = $(row).find('td:nth-of-type(3) div.ZTH0AF').text().trim();
      const venta = $(row).find('td:nth-of-type(4) div.ZTH0AF').text().trim();
      
      if (moneda) {
        console.log(`Row ${i}:`, { moneda, compra, venta });
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

test();

import axios from "axios";
import { load } from "cheerio";

async function test() {
  try {
    const response = await axios.get("https://www.cambiomatriz.com.uy");
    const $ = load(response.data);
    
    console.log("Testing Cambio Matriz table selectors...\n");
    
    // Test the new table structure
    const rows = $('.cont.cotizaciones table tbody tr');
    console.log(`Found ${rows.length} rows\n`);
    
    rows.each((i, row) => {
      const moneda = $(row).find('td.nom').text().trim();
      const compra = $(row).find('td:nth-of-type(3)').text().trim();
      const venta = $(row).find('td:nth-of-type(5)').text().trim();
      
      if (moneda) {
        console.log(`Row ${i}:`, { moneda, compra, venta });
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

test();

import CambioMatriz from "./classes/cambios/cambio_matriz";

async function test() {
  try {
    const cambio = new CambioMatriz();
    console.log("Testing CambioMatriz class...\n");
    console.log("Name:", cambio.name);
    console.log("Website:", cambio.website);
    console.log("\nFetching exchange rates...\n");
    
    const data = await cambio.get_data();
    console.log("Exchange rates retrieved:");
    console.log(JSON.stringify(data, null, 2));
    console.log("\nTotal currencies:", data.length);
  } catch (error) {
    console.error("Error:", error.message);
    console.error(error.stack);
  }
}

test();

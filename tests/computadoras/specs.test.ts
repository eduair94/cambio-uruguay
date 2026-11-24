import { describe, expect, it } from "vitest";
import { readComputerSpecs, readFaults, readRam, readStorage } from "../../classes/computadoras/specs";
import { norm } from "../../classes/computadoras/text";

// Títulos y descripciones reales (Mercado Libre y Facebook Marketplace, 23/11/2026).
const fb = (title: string, description?: string, attributes?: Record<string, string>) => readComputerSpecs({ title, description, fbAttributes: attributes });
const ml = (title: string, category: string) => readComputerSpecs({ title, mlCategory: category, mlCondition: "Usado" });

describe("qué es el aviso", () => {
  it("la categoría de ML decide, con las excepciones del título", () => {
    expect(ml("Pc Gamer Gigabyte Laptop", "MLU1649").kind).toBe("notebook");
    expect(ml("Mini Pc Lenovo M72e I3-3220t, 8gb Ram, 240gb Ssd, W10.", "MLU407379").kind).toBe("mini-pc");
    expect(ml("iMac 21.5 Late 2012 2.7ghz I5 8gb 500gb Ssd + Magic Keyboard", "MLU443594").kind).toBe("all-in-one");
    expect(ml("Memoria Ram Ddr4 16gb 3200mhz Oditox Desktop Udimm Para Pc", "MLU1694").kind).toBe("ram");
    expect(ml("Playstation 4 Destrabada!!! Regaladaaa", "MLU6344").kind).toBeNull();
    expect(ml("Vendo Monitores De Pc Escritorio Y Accesorios", "MLU1649").kind).toBeNull();
  });

  it("en Facebook, por palabras: máquinas, piezas y lo que no es", () => {
    expect(fb("PC GAMER I5 8400 GTX 1050TI 4GB 16GB RAM DDR4").kind).toBe("desktop");
    expect(fb("Laptop HP 15 con 1.82 TB 12 G RAM Procesador AMD Ryzen 7 3700U").kind).toBe("notebook");
    expect(fb("Gráfica RTX 3080 de 10Gb").kind).toBe("gpu");
    expect(fb("RTX 5050 oc low profile x3 fans").kind).toBe("gpu");
    expect(fb("I7 4790 (Socket 1150)").kind).toBe("cpu");
    expect(fb("RAM SK Hynix 8GB DDR4").kind).toBe("ram");
    expect(fb("Combo Intel Core I7 8700 + H310m").kind).toBe("combo");
    expect(fb("Fuente para computadora GIGABITE").kind).toBe("psu");
    expect(fb("Vendo o permuto PC de torre SIN MONITOR por alguna CONSOLA PORTÁTIL").kind).toBe("desktop");
  });

  it("rechaza accesorios, televisores, consolas, monitores y avisos de muchos equipos", () => {
    expect(fb("Cargador Laptop Toshiba")).toMatchObject({ kind: null, rejectReason: "accesorio" });
    expect(fb("Vendo Smart TV Enxuta 65”")).toMatchObject({ kind: null, rejectReason: "otro-producto" });
    expect(fb("Vendo PS5 (LEER DESCRIPCIÓN)").kind).toBeNull();
    expect(fb("Samsung Odyssey G9 49” 240hz 5120x1440")).toMatchObject({ kind: null, rejectReason: "monitor" });
    expect(fb("OPORTUNIDAD! NOTEBOOKS GAMER DESDE $20000! (12 CUOTAS)")).toMatchObject({ kind: null, rejectReason: "multi" });
    expect(fb("Lote de 7 procesadores socket 775")).toMatchObject({ kind: null, rejectReason: "multi" });
    expect(fb("Torre funcionando, 3 notebook y 2 mini PC para repuesto")).toMatchObject({ kind: null, rejectReason: "multi" });
    expect(fb("Variedad de notebook. Muy buen estado, probadas al retirar")).toMatchObject({ kind: null, rejectReason: "multi" });
  });

  it("piezas vendidas juntas son un combo, no una PC", () => {
    expect(fb("Componentes de pc de entrada").kind).toBe("combo");
    expect(fb("Partes de Computadora", "1 Ram 4gb ddr3, Placa video AMD radeo rx 560 4gb de memoria, Procesador Intel i5 4430, Fuente de poder 600W").kind).toBe("combo");
  });

  it("la serie N con nombre de Core", () => {
    expect(fb("Notebook hp Core I3-N305, 8gb ram, sin bateria").cpu).toMatchObject({ slug: "cpu:i3-n305", mobile: true });
  });
});

describe("RAM y discos", () => {
  it("el chico es RAM y el grande disco, aunque ninguno lleve rótulo", () => {
    const specs = ml("Pc Gamer Pro I5-12400f 32gb 1tb M2 Nvme Rtx 4060 8gb", "MLU1649");
    expect(specs.ramGb).toBe(32);
    expect(specs.storage).toEqual([{ type: "nvme", gb: 1000 }]);
    expect(specs.gpu?.slug).toBe("gpu:rtx-4060");
  });

  it("la VRAM pegada a la placa no es RAM, salvo que diga «ram»", () => {
    expect(ml("Pc Gamer Intel I5 12400f Rtx 3070 16gb Ram Ssd 1tb", "MLU1649").ramGb).toBe(16);
    expect(ml("Pc Gamer I5 9400 Tarjeta De Video Gtx1050ti 16gb Ram 1tdisk", "MLU1649").ramGb).toBe(16);
    expect(ml("Pc Gamer  Ryzen 5 5600x  +  Rtx 3060 Oc 12gb + Ssd 1tb", "MLU1649").ramGb).toBeNull();
  });

  it("formas de escribir la RAM", () => {
    expect(readRam(norm("16ram"))?.gb).toBe(16);
    expect(readRam(norm("8 de ram"))?.gb).toBe(8);
    expect(readRam(norm("2x8gb ram ddr4"))?.gb).toBe(16);
    expect(readRam(norm("Samsung Chromebook. Ram 4 Emmc 32"))?.gb).toBe(4);
    expect(readRam(norm("1 Ram 4gb ddr3, Placa video AMD"))?.gb).toBe(4);
  });

  it("formas de escribir un disco, y lo que NO es un disco", () => {
    expect(readStorage(norm("Ssd 240gb"))).toEqual([{ type: "ssd", gb: 240 }]);
    expect(readStorage(norm("480ssd"))).toEqual([{ type: "ssd", gb: 480 }]);
    expect(readStorage(norm("1tb Nvme 2tb Hdd"))).toEqual([{ type: "nvme", gb: 1000 }, { type: "hdd", gb: 2000 }]);
    expect(readStorage(norm("Computadora Gamer Asus Ddr4 16gb Gtx 1660 6gb Corsair 1 Tera"))).toEqual([{ type: "unknown", gb: 1000 }]);
    // «Vega 11 8gb Ram Ssd 240gb»: el 11 de la integrada no es un disco de 11 TB.
    expect(ml("Pc Gamer Ryzen 5 3400g Vega 11 8gb Ram Ssd 240gb", "MLU1649").storage).toEqual([{ type: "ssd", gb: 240 }]);
    // «M2 2022» es el chip y el año.
    expect(ml("Macbook Air M2 2022 13.6 - 8gb - 256gb - Midnight - Excelent", "MLU1652").storage).toEqual([{ type: "unknown", gb: 256 }]);
  });
});

describe("la ficha de Facebook", () => {
  const description =
    "Procesador: Ryzen 7 5700G\n​🎮 Gráfica: RTX 2060 Strix 6GB\n​⚡ Memoria RAM: 16GB 3200MHz\n​💾 Almacenamiento: M.2 NV3 1TB\n​🔌 Fuente: 750W​ semi modular.";

  it("completa lo que el título no dice, con su origen", () => {
    const specs = fb("​PC Gamer Gama Media / Ryzen 7 + RTX 2060 Strix + 16GB RAM + 1TB NVMe (Impecable)", description, { Condition: "used_like_new" });
    expect(specs.cpu).toMatchObject({ slug: "cpu:ryzen-7-5700g", basis: "description" });
    expect(specs.gpu).toMatchObject({ baseSlug: "gpu:rtx-2060", basis: "title" });
    expect(specs.ramGb).toBe(16);
    expect(specs.storage).toEqual([{ type: "nvme", gb: 1000 }]);
    expect(specs.psuWatts).toBe(750);
    expect(specs.condition).toBe("like-new");
  });

  it("lee mother, fuente y discos de una descripción en líneas", () => {
    const specs = fb(
      "PC GAMER I5 8400 GTX 1050TI 4GB 16GB RAM DDR4",
      "Cooler Ak400 digital\nFuente Antec 80 plus gold 650w modular\nAlmacenamiento ssd 256 gb \nSsd 240gb\nMother z390 pro aorus\nA toda prueba perfecto estado."
    );
    expect(specs).toMatchObject({ chipset: "z390", psuWatts: 650, ramGb: 16, ramType: "ddr4", faults: [] });
    expect(specs.storage).toEqual([{ type: "ssd", gb: 256 }, { type: "ssd", gb: 240 }]);
  });

  it("lo que trae: monitor, teclado y mouse; «sin monitor» no cuenta", () => {
    expect(fb("PC Completa Intel Core I5 + Monitor HP + Teclado y Mouse").includes).toMatchObject({ monitor: true, peripherals: true });
    expect(fb("Vendo o permuto PC de torre SIN MONITOR por alguna CONSOLA PORTÁTIL").includes.monitor).toBe(false);
  });
});

describe("fallas declaradas", () => {
  it("lee lo que el propio aviso dice que falla", () => {
    expect(ml("Laptop Hp 15-ef1013dx  No Bootea, Funcionaba Todo Perfecto", "MLU1652").faults).toContain("no-enciende");
    expect(fb("Notebook HP 15 Core i3 - Prende - Bloqueada - Sin Cargador - $2000").faults).toEqual(expect.arrayContaining(["bloqueada", "sin-cargador"]));
    expect(fb("Notebook dell core i3 de 5th gen anda ok detalle en teclado").faults).toContain("teclado");
    expect(fb("ASUS Dual GeForce RTX 2060 OC EVO 6GB – PARA REPARAR (Tira artifacts)").faults).toEqual(expect.arrayContaining(["para-repuesto", "no-da-video"]));
  });

  it("«sin fallas» no es una falla", () => {
    expect(fb("Macbook Air 2020 Apple M1 8gb Ram 256gb - sin detalles", "Funciona todo, no tiene fallas").faults).toEqual([]);
  });
});

describe("lo que la primera corrida de producción mostró (24/11/2026, 4.991 tarjetas de Marketplace)", () => {
  const kindOf = (title: string, mlCategory?: string) => readComputerSpecs({ title, mlCategory });

  it("la pieza que abre el título es lo que se vende, aunque nombre la máquina a la que va", () => {
    expect(kindOf("Memoria notebook 8gb ddr4").kind).toBe("ram");
    expect(kindOf('Disco Duro Interno Toshiba 1TB 2.5" SATA (Notebook / PS4 / PC)').kind).toBe("storage");
    expect(kindOf("motherboard pc y notebook").kind).toBe("motherboard");
    expect(kindOf("Memorias RAM de laptops 8gb cada una Por todas se hace precio").kind).toBe("ram");
    expect(kindOf("Combo pc Motherboard as rock h87m con procesador i5 4440").kind).toBe("desktop");
  });

  it("muebles, audio, la caja vacía y el «all in one» de otros rubros no son computadoras", () => {
    expect(kindOf("Mesa escritorio computadora")).toMatchObject({ kind: null, rejectReason: "accesorio" });
    expect(kindOf("Parlante Gamer Xtrike Me Altavoz Pc Rgb Speaker Barra Sonido").kind).toBeNull();
    expect(kindOf("Caja de tarjeta gráfica ASUS PHOENIX GEFORCE GTX 1650").kind).toBeNull();
    expect(kindOf("Pioneer DJ XDJ-RX All-in-One + Case - Hasta 12 cuotas con recargo").kind).toBeNull();
    expect(kindOf("Notebook Acer Aspire 3620 - Carcasa Y Partes", "MLU1652").kind).toBeNull();
  });

  it("varios equipos por un precio, dicho con palabras", () => {
    expect(kindOf("Dos notebook Lenovo para repuesto")).toMatchObject({ kind: null, rejectReason: "multi" });
  });

  it("el título que llega con + por espacios, y «respuesto»", () => {
    const specs = kindOf("Computadora+para+respuesto+");
    expect(specs.kind).toBe("desktop");
    expect(specs.faults).toContain("para-repuesto");
  });
});

describe("fallas que salieron como oportunidad en producción (24/11/2026)", () => {
  const faultsOf = (title: string) => readComputerSpecs({ title, mlCategory: "MLU1652" }).faults;

  it("«sin pantalla» y «con detalles» son fallas declaradas", () => {
    expect(faultsOf("Macbook Pro 13  2019 - I5 - 16gb - 256gb Ssd (sin Pantalla)")).toContain("pantalla");
    expect(faultsOf("Macbook pro 15” modelo a1707 del 2017 ( no funciona pantalla)")).toContain("pantalla");
    expect(faultsOf("Liquidación Mudanza Notebook Bangho MOV Intel Core i3 con Detalles")).toContain("falla");
    expect(faultsOf("Apple Macbook Pro (13-inch, 2017, Sin Touch Bar) (detalles en carcasa)")).toContain("falla");
  });

  it("«sin detalles» y «sin Touch Bar» no lo son", () => {
    expect(faultsOf("Macbook Air 2020 Apple M1 8gb Ram 256gb - sin detalles")).toEqual([]);
    expect(faultsOf("Apple Macbook Pro (13-inch, 2017, Sin Touch Bar)")).toEqual([]);
  });
});

describe("«detalles» en el título: medido sobre 6.783 avisos, 56 títulos lo dicen (24/11/2026)", () => {
  const faultsOf = (title: string, description?: string) => readComputerSpecs({ title, description, mlCategory: "MLU1652" }).faults;

  it("«(detalles)» al final del título es una falla declarada: salió como oportunidad", () => {
    expect(faultsOf("Apple Macbook Pro (13-inch, 2017, Sin Touch Bar) (detalles)")).toContain("falla");
    expect(faultsOf("Computadora detalles en fotos")).toContain("falla");
    expect(faultsOf("Acer Aspire 3, detalles en las imágenes.")).toContain("falla");
  });

  it("«c/detalle», «detalles estéticos» y «único detalle» también", () => {
    expect(faultsOf("Notebook Dell Latitude 5480 C/DETALLE Core i5 7300U 8GB DDR4 SSD 240GB Win 11")).toContain("falla");
    expect(faultsOf("Notebook Lenovo c/detalles T460 Core i5 6200U + 8GB RAM + HDD 320GB Win 11")).toContain("falla");
    expect(faultsOf("Notebook HP 15 – AMD Ryzen 7 – 16GB RAM – SSD 512GB detalles estéticos")).toContain("falla");
    expect(faultsOf("Apple Macbook Pro 13 2018 i5. Touchbar. Detalle estético")).toContain("falla");
    expect(faultsOf("Laptop HP 15 usada, único detalle batería,")).toContain("falla");
    expect(faultsOf("Oferta Notebook Toshiba detalle: línea vertical en pantalla")).toContain("pantalla");
  });

  it("negado no cuenta, y tampoco «más detalles» ni lo que sólo dice la descripción", () => {
    expect(faultsOf("Notebook HP como nueva sin detalles")).toEqual([]);
    expect(faultsOf("Vendo notebook Samsung y Lenovo bien sin detalle")).toEqual([]);
    expect(faultsOf("Notebook Lenovo ThinkPad T480 impecable, ningún detalle")).toEqual([]);
    expect(faultsOf("Notebook Asus Vivobook 15 consultar por más detalles")).toEqual([]);
    expect(faultsOf("Notebook Asus Vivobook 15 i5 8gb", "Excelente estado. Cualquier consulta, más detalles")).toEqual([]);
    expect(faultsOf("Combo gamer Intel i7 8700 y placa Aorus detalles en la descripción")).toEqual([]);
  });

  it("«con detalles verdes» es diseño, no una falla", () => {
    const direct = (title: string) => readFaults(norm(title), norm(title));
    expect(direct("Gabinete pc gamer negro con detalles verdes Micro-ATX")).toEqual([]);
    expect(direct("Notebook Acer Nitro 5 negra con detalles en rojo, i5 8gb")).toEqual([]);
    expect(direct("Gabinete como el de la foto con detalles leer descripcion")).toContain("falla");
  });

  it("una falla después de una negación se lee igual", () => {
    expect(faultsOf("Notebook Dell Inspiron 15 i5 8gb", "Sin detalles estéticos, pero tiene una falla en la bisagra")).toContain("falla");
  });
});

describe("lo pedido a cambio no es lo que se vende (24/11/2026)", () => {
  const kindOf = (title: string) => readComputerSpecs({ title }).kind;

  it("una moto, un kayak o un celular que piden una PC no son computadoras", () => {
    for (const title of [
      "Vital 125, Detalles estéticos , Luces funcionando, Vendo o permuto x PC Gamer o escucho ofertas",
      "Kayak Vendo , escucho ofertas, o permuto por Notebook gamer 092995988,",
      "Bicicleta Scott rodado 29, con horquilla de carbono, vendo o permuto por notebook de igual valor.",
      "Vendo s23 ultra o permuto por pc gamer completa.",
      "Xbox one+ 2 mandos mecánicos+ un SSD 500G y 29 juegos valor de 950dolars, permuto por pc pongo plata",
      "Switch destrabada permuto por componentes de pc",
      "Permuto por tarjeta de video de 4gb se prueba todo",
      "PERMUTO POR PC",
      "Vendo o cambio x Pc",
    ]) {
      expect(kindOf(title), title).toBeNull();
    }
  });

  it("una PC que pide una notebook es una PC de escritorio", () => {
    expect(kindOf("vendo Pc gamer o permuto por laptop")).toBe("desktop");
    expect(kindOf("PC GAMER PERMUTO POR NOTEBOOK Y PONGO DIFERENCIA")).toBe("desktop");
    expect(kindOf("Pc Blanca - Vendo o Permuto por una notebook buena")).toBe("desktop");
    expect(kindOf("Laptop Potente con 32GB RAM y SSD de 512B (i5 12va Gen) O permuto por Pc fija")).toBe("notebook");
  });

  it("lo que se vende puede venir después de lo pedido", () => {
    expect(kindOf("Vendo o Permuto por PS5 y Plata 🤑 NOTEBOOK GAMER RTX 4060 8gb 16 RAM SSD 512 GB Pantalla de 144 Hz")).toBe("notebook");
    expect(kindOf("VENDO O PERMUTO por algo de mismo valor Laptop Dell Inspiron 15 TÁCTIL i7 12th Gen 16GB RAM 1TB SSD")).toBe("notebook");
    expect(kindOf("VENDO O PERMUTO POR IPHONE 💻 Notebook en excelente estado")).toBe("notebook");
    expect(kindOf("Permuto Por Samsung S24 Ultra PC Gamer")).toBe("desktop");
  });

  it("«Permuto PC gamer por PS5»: ahí la PC es lo ofrecido", () => {
    expect(kindOf("Permuto Pc Gamer por PS5")).toBe("desktop");
    expect(kindOf("Vendo o permuto Notebook gamer nueva gama alta")).toBe("notebook");
  });
});

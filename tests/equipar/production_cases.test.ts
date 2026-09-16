import { describe, expect, it } from "vitest";
import { categoryFor, norm, numericValue, variantFor } from "../../classes/equipar/classify";
import { EQUIPAR_BY_KEY } from "../../classes/equipar/registry";

const keyOf = (title: string): string | null => categoryFor(title)?.key ?? null;
const variantOf = (category: string, title: string): string => variantFor(EQUIPAR_BY_KEY.get(category)!, title).key;

describe("lo que se coló en producción el 16/9/2026", () => {
  it.each([
    ["Convector Kassel Ks-Con3002 Split Digital 2000w", "aire-acondicionado"],
    ["Mueble Mf211 Blanco 130X63X47Cm Para Microondas", "microondas"],
    ["Batidora Arno Chef, con bowl de 5 litros apto microondas y freezer (-20°C Mín y 80 °C Máx)", "microondas"],
    ["Gas Butano 220 Gr. Cocinilla O Anafe Isobutano 4 Vientos", "cocina"],
    ["Cartucho Gas Butano Campgas Ntk Anafe Camping Repostería", "cocina"],
    ["Linterna de camping multifunción Xiaomi", "impresora"],
    ["Arrocera Inteligente Xiaomi Smart Multifunción Rice Cooker", "impresora"],
    ["Cama Box Base Para Colchon De 140x190 032 Altura Ecoline Azul Oscuro O Negro", "colchon"],
    ["Lavarropas Semi-automático Enxuta Lenx7500 Blanco 5kg Amv", "lavarropas"],
    ["Lavarropas 13 Kg Arno Semi-automatico (Sin centrifutgado), posee 5 Programas Y Timer Negro", "lavarropas"],
    ["Lavarropas Enxuta Leb7200 7.2 Kgs Doble Cuba", "lavarropas"],
    ["Calentador Instantáneo Calefon A Gas Mega 7lts Tiro Natural", "calefon"],
  ])("%s no es %s", (title, category) => {
    expect(keyOf(title)).not.toBe(category);
  });

  // El yogur de "colchón 2 plazas" no era una mezcla de SKUs de VTEX: el título mismo dice
  // "colchón". En la góndola uruguaya un "colchón de frutillas" es el yogur con la capa de fruta en
  // el fondo, y El Dorado es supermercado. Reproducido con scripts/oneoff/equipar_dry_run.ts el
  // 16/9/2026: `ft=colchon` devolvió 11 productos, 5 aceptados, 4 de ellos yogures de $ 69,9 a $ 77
  // con ruta /Frescos/Lacteos/Yogurt/. Sin modelo publicado, el nombre del "producto" salió de la
  // cola del título: "calcar de frutillas 130gr".
  it.each([
    "Yogur Griego Calcar Colchon De Frutillas 130gr",
    "Yogur Ser Colchon Frutilla Pote 175Gr .",
    "Yogur Griego Calcar Colchon De Frutas Del Bosque 130gr",
    "Yogur Claldy Colchon Durazno 180ml",
  ])("%s es un yogur, no un colchón", (title) => {
    expect(keyOf(title)).not.toBe("colchon");
  });

  it("la ruta de categoría de la tienda alcanza para descartar el colchón de fruta aunque el título no lo diga", () => {
    const vtexPath = "/Frescos/Lacteos/Yogurt/ /Frescos/Lacteos/ /Frescos/";
    expect(categoryFor("Colchon De Frutillas Calcar", vtexPath)?.key ?? null).not.toBe("colchon");
    // Y el colchón de verdad de la misma tienda sigue entrando con su propia ruta.
    expect(categoryFor("Colchon Divino Buen Sueño Espuma 80x185x17", "/Hogar/Colchones/Espuma/ /Hogar/Colchones/ /Hogar/")?.key).toBe(
      "colchon"
    );
  });

  it("un anafe de camping que el filtro de cocina saca no cae en estufa por decir 'estufa'", () => {
    // Medido en TYT al correr el dry run: al excluir los anafes a cartucho de "cocina", este título
    // pasó a la siguiente categoría que lo aceptaba, que era la de calefacción.
    expect(keyOf("Anafe Estufa A Gas Butano Portatil 1 Hornalla Camping Truper")).toBeNull();
    expect(keyOf("Estufa A Gas Supergas Tiro Balanceado 3000 Kcal")).toBe("estufa");
  });

  // Medidos en las corridas en seco de la Task 3 (El Dorado y TYT, 16/9/2026).
  it.each([
    ["Toalla De Cocina Felpita Maxirollo 200paños", "toallas"],
    ["Lavadora de alta presión Bosch", "lavarropas"],
    ["Hidrolavadora Lavadora De Alta Presión", "lavarropas"],
    ["Manguera de desagote para lavarropas", "lavarropas"],
    ["Cama Cucha Colchón Para Perros", "colchon"],
    ["Limpiador De Aire Acondicionado 150 Ml", "aire-acondicionado"],
    ["Prensa Manguera Aire Acondicionado Automotriz", "aire-acondicionado"],
    ["Cinta Aluminio Aire Acondicionado", "aire-acondicionado"],
    ["Colilla Para Calefón", "calefon"],
    ["Heladera Chica Para Camion", "heladera"],
  ])("%s no es %s", (title, category) => {
    expect(keyOf(title)).not.toBe(category);
  });

  // Lo que trajo mandar TODAS las búsquedas de tienda en la diaria (tope 80): corrida en seco del
  // 16/9/2026 con RETAIL_VTEX_MAX_QUERIES=80 en El Dorado (82 -> 269 aceptados) y
  // RETAIL_WOO_MAX_QUERIES=80 en TYT (149 -> 441). El Dorado es supermercado y TYT ferretería:
  // categorías que antes nunca se buscaban ahí se llenaban de esto, varias del tier S.
  it.each([
    ["Toallas Femeninas Mimosa Nocturna 3x2", "toallas", "/Cuidado Personal/Cuidado Corporal/Mujer/"],
    ["Toallas Humedas Babysec Premium 70un", "toallas", "/Cuidado Personal/Bebés/Higiene/"],
    ["Pañales Huggies Flexi Comfort G/60un Promo+Toallas", "toallas", "/Cuidado Personal/Bebés/Pañales/"],
    ["Toallas Plenitud Con Alas Essencial Largas 8Un", "toallas", ""],
    ["Balde Tg24016343 De Playa 4pzas", "limpieza", "/Temporada Y Festivos/Juguetería/Juguetes De Playa/"],
    ["Balde Ax004 Para Hielo 12lts Varios Colores Plegable", "limpieza", "/Temporada Y Festivos/Playa/Conservadoras/"],
    ["Balde Albañil Obra Primera Calidad Pvc Reforzado Tyt", "limpieza", ""],
    ["Kit Para Pintar 2 Rodillos + Balde + Bandeja + Extensible", "limpieza", ""],
    ["Hormigonera Ansa 130lt Armada 3/4 Hp + Pala Y Balde", "limpieza", ""],
    ["Enduido Interior 23kg Bhelza (balde)", "limpieza", "Enduidos y masillas"],
    ["Aceite Ursa Premium Tdx 15w40 Balde 20 Lts Texaco Tyt", "limpieza", ""],
    ["Escobilla De Metal Pasto Jardín Escoba Rastrillo Tyt", "limpieza", ""],
    ["Aspiradora Escoba Inalambrica 2 En 1 Enxuta Aenxi18150r Color Rojo", "limpieza", "Limpieza"],
    ["Cuchillo Darnel Azul Vivo Descartable 20und", "cuchillo", "/Temporada Y Festivos/Cotillón/Bazar Descartable/"],
    ["Maquina Afiladora De Mechas Multiuso Cuchillos Tijeras Tyt", "cuchillo", ""],
    ["Piedra Afilar Cuchillos Doble Grano 150 240 Truper 11667", "cuchillo", ""],
    ["Juego De Llaves Allem Tipo Cuchillo Portátil Ingco De 2 A 8 Mm", "cuchillo", ""],
    ["Cuchillo Bahco 1446 Caza Pesca Camping Electricidad", "cuchillo", ""],
    ["Set De Cubiertos Tramontina Polywood 21199/705 Con Cuchillos De Asado 24 Piezas Rojo", "cuchillo", ""],
    ["Escurridor San Remo 308 De Cubiertos Con Divisiones", "cubiertos", ""],
    // Sacarlo de cubiertos lo mandó al escurridor de platos, que tampoco es (medido).
    ["Escurridor San Remo 308 De Cubiertos Con Divisiones", "escurridor", "/Hogar/Bazar/Acc. Para Hogar/"],
    ["Mango De Cuero Para Sarten De Hierro Fundido Victoria Chico Color Marrón", "sarten", ""],
    ["Papas Mccain Airfryer + Finitas 700gr", "horno-electrico", "/Comestibles/Congelados/Papas/"],
    ["Balde Ideal Fregona Escurridor-Mopa", "escurridor", "/Limpieza/Limpieza Hogar/Acc. Limpieza/"],
    ["Hidrolavadora Aspiradora 2 En 1 1600w 130bar Wadfow Whp4a16", "aspiradora", "Hidrolavadoras"],
    ["Sopladora Aspiradora Stanley 600w Stpt600 Tyt", "aspiradora", ""],
    ["Lijadora Orbital Mango Corto Con Aspiradora 1220w Tyt", "aspiradora", "Lijadoras y pulidoras"],
    ["Aspiradora Integral Para Rotomartillo Sds Plus A Bateria", "aspiradora", "Rotomartillos y demoledores"],
    ["Kit Taladro Atornillador + Mult + Aspiradora Cosli240685", "aspiradora", ""],
    ["Atornillador 13mm 20v + Mixer Cocina Cosli22112 Ingco Tyt Color Naranja", "mixer", "Atornilladores"],
    ["Mixer Mezclador Pintura Mx11008 Ingco 1100w Tyt", "mixer", "Pinturas"],
    ["Kit Llave Impacto + Linterna + Mixer Ingco Cosli240961", "mixer", ""],
    ["Goldex MIXER Weg 3/4Hp Gris Goldex", "mixer", "Máquinas de Soldar"],
    ["Montana Estufa a gas Hongo", "estufa", ""],
    ["Caloventilador Desempañador Calefactor Parabrisas D Auto 12v", "estufa", ""],
    ["Parrilla Nueva Para Camping O Estufa A Leña ! Oferta! Tyt", "estufa", ""],
    ["Tejuela Ladrillo Refractario X 20unidades Estufa Parrillero", "estufa", ""],
    ["Kit Instalación Estufa Leña Qutral 4m Cañería Interior Acero Galvanizado", "estufa", ""],
    ["Cañon De Calor A Gas 60.000 Btu Hessen Estufa Calefactor", "estufa", ""],
    ["Ventilador Industrial De Pie Goldtech 3 Aspas 26 tyt", "ventilador", ""],
    ["Ventilador 12v Oscilante Cabina Auto Camioneta Pinza V12", "ventilador", ""],
    ["Ventilador Vehiculos Doble 2 Velocidades 24v Tyt", "ventilador", ""],
    ["Ventilador Ld8203c De Mano 250mah 2 Colores", "ventilador", ""],
  ])("%s no es %s", (title, category, context) => {
    expect(categoryFor(title, context)?.key ?? null).not.toBe(category);
  });

  it("las que sí son siguen entrando en las categorías que se ajustaron por el tope 80", () => {
    // Todos medidos en la misma corrida en seco.
    expect(categoryFor("Balde Jupiter Limpieza Plastico 10lt", "/Limpieza/Limpieza Hogar/Acc. Limpieza/")?.key).toBe("limpieza");
    expect(categoryFor("Escoba Bettanin 1632 Varremax", "/Limpieza/Limpieza Hogar/Acc. Limpieza/")?.key).toBe("limpieza");
    expect(categoryFor("Mopa Giratoria 360 Acero Inox Balde Centrifugado Trapeador", "Ofertas")?.key).toBe("limpieza");
    expect(categoryFor("Balde Ideal Fregona Escurridor-Mopa", "/Limpieza/Limpieza Hogar/Acc. Limpieza/")?.key).toBe("limpieza");
    expect(categoryFor("Cuchillo Tramontina 24472/188 8\" Premium", "/Hogar/Bazar/Accesorios De Cocina/")?.key).toBe("cuchillo");
    expect(categoryFor("Juego Tramontina Plenus Cuchillos 7pzas", "/Hogar/Bazar/Accesorios De Cocina/")?.key).toBe("cuchillo");
    expect(categoryFor("Set De Cubiertos Tramontina Polywood 21199/705 Con Cuchillos De Asado 24 Piezas Rojo")?.key).toBe("cubiertos");
    expect(categoryFor("Juego Cubiertos Tramontina Gamboa Azul 16pzas", "/Hogar/Bazar/Accesorios De Cocina/")?.key).toBe("cubiertos");
    expect(categoryFor("Sartén Hierro Esmaltado 20cm Victoria Tramontina Color Negro")?.key).toBe("sarten");
    expect(categoryFor("Aspiradora Enxuta Aenxi18120ng Ciclonica 120w Inalambrica", "/Electro Audio Y Tv/Electrodomésticos/Pequeños Electrodomésticos/")?.key).toBe("aspiradora");
    expect(categoryFor("Aspiradora Escoba Inalambrica 2 En 1 Enxuta Aenxi18150r Color Rojo", "Limpieza")?.key).toBe("aspiradora");
    expect(categoryFor("Mixer Cuori Presto Plus 400w Inoxidable + Accesorios Tyt", "Electrodomésticos")?.key).toBe("mixer");
    expect(categoryFor("Licuadora Philips Ri2110/90", "/Electro Audio Y Tv/Electrodomésticos/Pequeños Electrodomésticos/")?.key).toBe("mixer");
    expect(categoryFor("Estufa Grenno Qh-90A Quarzo", "/Electro Audio Y Tv/Electrodomésticos/Frío Y Calor/")?.key).toBe("estufa");
    expect(categoryFor("Calefactor Radiador De Aceite 9 Elementos Digital C/control Color Negro", "Estufas")?.key).toBe("estufa");
    expect(categoryFor("Estufa Supergas Enxuta Eenxgv2 Tyt", "Estufas")?.key).toBe("estufa");
    expect(categoryFor("Ventilador Grenno Fs-1606 De Pie 40cm Con Timer", "/Electro Audio Y Tv/Electrodomésticos/Frío Y Calor/")?.key).toBe("ventilador");
    expect(categoryFor("Ventilador De Pie Nappo 16′ Oscilante 2 Vel 5 Aspas", "")?.key).toBe("ventilador");
    expect(categoryFor("Freidora De Aire Airfryer Philips 4.1 L", "/Electro Audio Y Tv/Electrodomésticos/Pequeños Electrodomésticos/")?.key).toBe("horno-electrico");
  });

  it("una cocina con horno eléctrico es una cocina, no un horno eléctrico", () => {
    expect(keyOf("Cocina Grenno Massima Con Horno Electrico")).toBe("cocina");
    expect(keyOf("Cocina Grenno Massima Negra Con Horno Electrico")).toBe("cocina");
    // Y el horno de mesa sigue siendo horno, aunque la tienda lo archive bajo "Cocina".
    expect(categoryFor("Cuori Horno eléctrico Verona Cuo2038", "/Hogar/Cocina/Electrodomésticos de cocina/")?.key).toBe(
      "horno-electrico"
    );
    expect(categoryFor("Freidora De Aire Airfryer Philips 4.1 L", "Cocina")?.key).toBe("horno-electrico");
  });

  it("siguen entrando los que sí son", () => {
    expect(keyOf("Impresora Multifuncion Brother DCP-T230")).toBe("impresora");
    expect(keyOf("Microondas Panavox M20n 20l 700w 11 Niveles Mecánico Negro")).toBe("microondas");
    expect(keyOf("Anafe A Gas Smartlife 5 Hornallas 70x60cm Inox C/encendido Color Plateado")).toBe("cocina");
    expect(keyOf("Aire Acondicionado Split Hogaron 12000 BTU Frío/Calor con Gas R32 y Caño de Cobre")).toBe("aire-acondicionado");
    expect(keyOf("Colchón 2 Plazas Kingshouse Espuma Alta Densidad Premium 14 188x138x14 Cm")).toBe("colchon");
    expect(keyOf("Calefón Termotanque Eléctrico Enxuta 40L Aislación Acero Anticorrosivo")).toBe("calefon");
  });

  it("aire: los accesorios de instalación no son un aire, aunque el aire sí mencione su caño", () => {
    // `norm` convierte la ñ en n, así que un "caño" escrito con ñ en el filtro nunca coincidía.
    expect(keyOf("Caño De Cobre Para Aire Acondicionado 1/4 3/8 Rollo 15 Metros")).not.toBe("aire-acondicionado");
    expect(keyOf("Kit De Caños Para Aire Acondicionado Split 3 Metros")).not.toBe("aire-acondicionado");
  });

  it("aire: lee los BTU con separador de miles y no inventa un número sin unidad", () => {
    expect(numericValue(norm("Aire Acondicionado 12.000 BTU Inverter"), "btu")).toBe(12000);
    expect(numericValue(norm("Aire Acondicionado Split 9,000 BTUs"), "btu")).toBe(9000);
    expect(numericValue(norm("Aire Acondicionado Split 18000btu"), "btu")).toBe(18000);
    expect(numericValue(norm("Aire Acondicionado Split Inverter Frío Calor 2026"), "btu")).toBeNull();
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Split 12.000 BTU Frío Calor")).toBe("12000");
  });

  it("aire: 9.000 BTU es su propia variante, con o sin espacio antes de BTU", () => {
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Futura 9000btu Fut-09aa-c")).toBe("9000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Greenwind 9000 Btu Color Blanco")).toBe("9000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Greenwind Inverter Con Wifi 12000 Btu Bla")).toBe("12000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Split Xion Frio Calor 18000 Btu Eficien B")).toBe("18000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Portátil 12000 BTU Frío")).toBe("portatil");
  });
});

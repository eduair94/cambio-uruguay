// The registry of /productos-que-te-cambian-la-vida-uruguay against REAL MercadoLibre titles.
//
// Every title below was copied from the sample taken through the bridge the night of 2026-11-19
// (fixtures/ml_sample.json); none is invented. The accepted lists pin the variant each one lands in,
// the rejected lists pin what each category refuses and why it matters (dish soap named like the
// dishwasher, a shawl named like the electric blanket, a case named like the Kindle), and the
// cheapest accepted listing of every category is pinned too: it is what a "más barato" list leads
// with, so it must be a real unit and not an accessory or a refill.
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { categoryFor, matchesCategory, norm, variantFor } from "../../classes/equipar/classify";
import { EQUIPAR_CATEGORIES, NOT_A_PRODUCT } from "../../classes/equipar/registry";
import {
  PRODUCTOS_VIDA_BY_KEY,
  PRODUCTOS_VIDA_CATEGORIES,
  PRODUCTOS_VIDA_COLLECTIONS,
  PRODUCTOS_VIDA_ML_DEADLINE_MS,
  PRODUCTOS_VIDA_ML_MAX_SCANS,
  PRODUCTOS_VIDA_ML_PAGES_PER_QUERY,
  PRODUCTOS_VIDA_REASON,
  productosVidaBridgeWindowOpen,
} from "../../classes/productosvida/registry";
import { REAL_RUN, SAMPLE_USD_UYU, sampleListings, sampleRowsFor } from "./sample";

const KEYS = [
  "calientacama",
  "lavavajillas",
  "secarropas",
  "aspiradora-robot",
  "freidora-de-aire",
  "cortadora-barba",
  "deshumidificador",
  "freezer",
  "panificadora",
  "recortadora-nariz",
  "tuppers-vidrio",
  "almohada-viscoelastica",
  "arrancador-bateria",
  "auriculares-inalambricos",
  "bicicleta",
  "deshidratador",
  "espumador-de-leche",
  "frigobar",
  "kindle",
  "lavasecarropas",
  "monitor",
  "perfume-arabe",
  "pesa-rusa",
  "robot-de-cocina",
  // Una sola persona nombra la sartén de acero inoxidable (la otra dice «ollas y sartenes» sin
  // material), así que va con los de una mención, por nombre: entre Robot y Ventilador.
  "sarten-acero-inoxidable",
  "ventilador-industrial",
];

const regexesOf = (category: (typeof PRODUCTOS_VIDA_CATEGORIES)[number]): RegExp[] =>
  [
    category.include,
    category.exclude,
    category.titleExclude,
    ...category.variants.map((variant) => variant.match),
  ].filter((regex): regex is RegExp => regex instanceof RegExp);

describe("forma del registro", () => {
  it("son exactamente las 26 categorías, en el orden del hilo", () => {
    expect(PRODUCTOS_VIDA_CATEGORIES.map((category) => category.key)).toEqual(KEYS);
    for (const gone of ["enchufe-inteligente", "smartwatch", "bateria-acero-inoxidable"]) {
      expect(PRODUCTOS_VIDA_BY_KEY.has(gone)).toBe(false);
    }
  });

  it("claves de categoría y de variante sin dígitos (el escáner de secretos)", () => {
    for (const category of PRODUCTOS_VIDA_CATEGORIES) {
      expect(category.key).toMatch(/^[a-z]+(-[a-z]+)*$/);
      for (const variant of category.variants) expect(variant.key, category.key).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("una sola variante de respaldo por categoría, y claves de variante únicas", () => {
    for (const category of PRODUCTOS_VIDA_CATEGORIES) {
      expect(category.variants.filter((variant) => variant.fallback), category.key).toHaveLength(1);
      expect(new Set(category.variants.map((variant) => variant.key)).size).toBe(category.variants.length);
    }
  });

  it("todas en la misma sala y el mismo tramo, sólo Mercado Libre", () => {
    for (const category of PRODUCTOS_VIDA_CATEGORIES) {
      expect(category.room).toBe("productos-vida");
      expect(category.tier).toBe("B");
      expect(category.reason).toBe(PRODUCTOS_VIDA_REASON);
      expect(category.storeQueries).toEqual([]);
      expect(category.fbQueries).toEqual([]);
      expect(category.mlCategories).toBeUndefined();
      expect(category.mlQueries.length).toBeGreaterThan(0);
    }
  });

  // norm() saca los acentos y cambia todo lo que no sea [a-z0-9%"'\s.,+-] por un espacio, así que
  // una alternativa con «ñ», «¨» o «/» no puede coincidir nunca. Y un regex con g o y guarda
  // lastIndex entre llamadas: el segundo título de la corrida empezaría a buscar a la mitad.
  it("ningún regex trae caracteres que norm() borra ni las banderas g/y", () => {
    for (const category of PRODUCTOS_VIDA_CATEGORIES) {
      for (const regex of regexesOf(category)) {
        expect(regex.source, category.key).toMatch(/^[\x00-\x7f]*$/);
        expect(regex.source, category.key).not.toContain("\\/");
        expect(regex.flags, category.key).not.toMatch(/[gy]/);
      }
    }
  });

  it("presupuesto del puente: 33 búsquedas, a lo sumo 90 pedidos, reloj de 6 minutos", () => {
    const searches = PRODUCTOS_VIDA_CATEGORIES.reduce((sum, category) => sum + category.mlQueries.length, 0);
    expect(searches).toBe(33);
    expect(searches).toBeLessThanOrEqual(PRODUCTOS_VIDA_ML_MAX_SCANS);
    expect(PRODUCTOS_VIDA_ML_MAX_SCANS * PRODUCTOS_VIDA_ML_PAGES_PER_QUERY).toBeLessThanOrEqual(90);
    expect(PRODUCTOS_VIDA_ML_DEADLINE_MS).toBeLessThanOrEqual(6 * 60_000);
  });
});

describe("la ventana del puente", () => {
  it("abre en :13–:14 de las 00, 04, 16 y 20 UTC", () => {
    for (const at of [
      "2026-11-20T00:13:00Z",
      "2026-11-20T04:14:59Z",
      "2026-11-20T16:13:00Z",
      "2026-11-20T20:13:30Z",
    ]) {
      expect(productosVidaBridgeWindowOpen(new Date(at)), at).toBe(true);
    }
  });

  it("cerrada en el minuto de antes y el de después, en las otras horas y en las que se dejaron", () => {
    for (const at of [
      "2026-11-20T04:12:59Z",
      "2026-11-20T04:15:00Z",
      "2026-11-20T05:13:00Z",
      "2026-11-20T02:13:00Z",
      "2026-11-20T18:13:00Z",
      // 08 y 12 se sacaron: el barrido diario de autos (07:43 a ~10:15) y la diaria de sillas (11:41)
      // usan el mismo puente.
      "2026-11-20T08:13:00Z",
      "2026-11-20T12:13:00Z",
    ]) {
      expect(productosVidaBridgeWindowOpen(new Date(at)), at).toBe(false);
    }
  });
});

const category = (key: string) => {
  const found = PRODUCTOS_VIDA_BY_KEY.get(key);
  if (!found) throw new Error(`sin categoría ${key}`);
  return found;
};

interface Fixture {
  accepted: Array<[title: string, variant: string]>;
  rejected: string[];
  /** A real unit the shared NOT_A_PRODUCT of equipar throws away (a word it reads as an accessory). */
  lostToSharedFilter?: string;
  /** The cheapest NEW listing the category accepts in the sample, read by eye: a real unit. */
  cheapestAccepted: string;
}

const FIXTURES: Record<string, Fixture> = {
  calientacama: {
    accepted: [
      ["Calientacamas Enxuta 2 Plazas - Ccenx20 - Lavable", "dos-plazas"],
      ["Calientacama 2 Plazas Blanco Allied AL-BW02 2 Temperaturas Lavable Poliester", "dos-plazas"],
      ["Calienta Cama 1 Plaza Futura Fut-cc105 Lavable", "una-plaza"],
      ["Calientacama 1 Plaza Cuori 2 Niveles Calor Con Control", "una-plaza"],
      ["Manta Eléctrica Queen Control Dual 6 Niveles Timer 10h", "manta"],
      ["Manta Eléctrica Matrimonial 6 Niveles Precalentado 130w", "manta"],
    ],
    rejected: ["Chal Térmico Eléctrico Portátil", "Manta Eléctrica Portátil Tipo Poncho"],
    cheapestAccepted: "Calienta Camas Nappo 1 Plaza 2 Niveles Con Control, 160x80cm",
  },
  lavavajillas: {
    accepted: [
      ["Lavavajillas 14 Cubiertos Con Smart Things Color Negro", "estandar"],
      ["Lavavajillas De Empotrar Inverter 14 Ser. Bosch Smv4ecx28e", "estandar"],
      ["Lavavajillas Negro 8c Midea Wqp8-3802gb", "compacto"],
      ["Lavavajillas Panavox WQP8 Silver para 8 Cubiertos", "compacto"],
    ],
    // «Lavavajillas» es también el nombre del detergente.
    rejected: [
      "Detergente Lavavajillas, Somat All In One, 25 Pastillas P/ca",
      "Pastillas Para Lavavajillas Somat All In 1 Extra 26 Tabs",
    ],
    lostToSharedFilter: "Lavavajillas Enxuta Lvenx913n 13 Cubiertos Display Led Color Negro",
    cheapestAccepted: "Lavavajillas Blanco 8c Midea Wqp8-3802gw",
  },
  secarropas: {
    accepted: [
      ["Secarropas Samsung DV90T5240A Carga Frontal 9 Kg Blanco", "tambor"],
      ["Secarropas Bomba De Calor Candy Roe H11a2tcer Silver 11 Kg Color Gris", "tambor"],
      ["Secarropas Portátil Ganga Shop 1 kW Azul Colgador 15kg Aire Caliente", "bolsa"],
      ["Secarropa BRONX BAG-P", "bolsa"],
    ],
    rejected: ["Seca Ropa Tender Plegable Portátil Seca Rápido Sin Arrugas", "Tem T1ZSE7KWB4205 - Blanco"],
    lostToSharedFilter: "Secadora De Ropa Samsung 11kg Sensor Dry Blanca Blanco",
    cheapestAccepted: "Secador De Ropa Portátil 220v Cep00931",
  },
  "aspiradora-robot": {
    accepted: [
      ["Robot Aspirador Xiaomi Vacuum 5 Pro con Mapeo y Control por Voz", "aspira"],
      ["Samsung Aspiradora Robot Vr7md96514g", "aspira"],
      ["Aspiradora Y Trapeadora Robot Xiaomi Vacuum 5 Con Base De Autolimpieza", "trapea"],
      ["Robot Aspirador Y Trapeador Roomba Combo J9+ Color Negro", "trapea"],
    ],
    rejected: [],
    lostToSharedFilter: "Xion Xi-vcrobot20 aspiradora robot sensor anti-golpes color negro",
    cheapestAccepted: "Aspiradora Robot Multilaser Ho041 Rojo/negro",
  },
  "freidora-de-aire": {
    accepted: [
      ["Freidora De Aire Dual Inteligente Xiaomi 2700w Capacidad 10l Dos Cestos", "grande"],
      ["Freidora Elécrica Xiaomi Smart Air Fryer Dual Zone 12l 2800w Negro", "grande"],
      ["Airfryer Philips Na231/00 6.2 Lts Con Tecnología Rapid Air", "mediana"],
      ["Freidora De Aire Sin Aceite Panavox Digital 6,5lts 1700w Negro", "mediana"],
      ["Freidora De Aire 4l Hogaron Air Fryer 1350w Digital Con Visor", "chica"],
      ["Freidora De Aire Sin Aceite Panavox 4lts 1500w Negro", "chica"],
    ],
    rejected: [],
    lostToSharedFilter:
      "Freidora De Aire Cuori Sin Aceite 11l Descongela Y Deshidrata Bianca Doble Resistencia 2300w Cocina",
    cheapestAccepted: "Freidora de Aire Nhome Airfryer 6L 2400W Superficie Antiadherente Negra",
  },
  "cortadora-barba": {
    accepted: [
      ["Afeitadora Beard Trimmer 3000 Philips Bt3617/15 Wet & Dry", "recortadora"],
      ["Recortadora de barba Philips BT3216_14 negra", "recortadora"],
      ["Afeitadora de Barba Philips Series 3000 Inalámbrica con 10 Posiciones", "afeitadora"],
      ["Rasuradora Kemei KM-696 Inalámbrica 5 Cabezas Removibles Acero Inoxidable", "afeitadora"],
    ],
    rejected: [
      "Afeitadora Corporal Y De Barba Impermeable Hombre",
      "Afeitadora Corporal Inalámbrica Philips Body Groomer Bg3470/15 3000 Series Triple Protección Uso En Seco Y Húmedo, 60 Minutos De Uso",
    ],
    // A real trimmer at a real (cross-border) price; the band's screen marks it suspect, it is not an
    // accessory.
    cheapestAccepted: "Recortadora Vintage Professional T9 dorada 1",
  },
  deshumidificador: {
    accepted: [
      ["Deshumidificador Eléctrico Tem 12L 1001", "compresor"],
      ["Deshumidificador Tem 12l Panel Digital Y Timer Blanco", "compresor"],
      ["Deshumidificador Portátil Silencioso 220v Hogar Blanco", "mini"],
      ["Deshumidificador Pequeño Y Silencioso Para Dormitorio", "mini"],
    ],
    rejected: ["Mini Deshumidificador Portátil, Absorbente De Humedad Silenc"],
    lostToSharedFilter: "Deshumidificador Punktal PK-1550 12 Litros Display LED Blanco",
    cheapestAccepted: "Mini Deshumidificador Portátil Usb Para Placard Blanco",
  },
  freezer: {
    accepted: [
      ["Freezer Horizontal Aiwa 142 Lt Awhcfc15101 Funcion Dual Color Blanco", "mediano"],
      ["Freezer Horizontal Electrolux 200 Litros Efcc25c5hqw Blanco", "mediano"],
      ["Freezer Horizontal Midea Mdrc153fzg01 99l Inverter Ub", "chico"],
      ["Freezer Horizontal James 99 Lts Fhj 100 Inverter Ehogar Color Blanco", "chico"],
      ["Freezer Horizontal Enxuta 297L Blanco Eficiencia B", "grande"],
      ["Freezer Horizontal James 418 Lts Fhj 410 M", "grande"],
    ],
    rejected: [],
    lostToSharedFilter: "Freezer Horizontal Punktal 418 L Doble Acción Deshielo Manual PK-HS543",
    cheapestAccepted: "Freezer Horizontal Greenwind de 100 L para el Hogar u Oficinas",
  },
  panificadora: {
    accepted: [
      ["Panetera Moulinex Máquina De Pan Pain & Delicés", "estandar"],
      ["Panificadora Punktal PK-PA6301 1kg 600W 19 Programas Pantalla Digital", "estandar"],
      ["Máquina Panificadora Enxuta Sdaenxmp511 400w Capacidad 900g De Pan", "estandar"],
    ],
    rejected: [],
    cheapestAccepted: "Panificadora Hogaron HGBM1 de 1 kg con 19 Programas y Dispensador Automático",
  },
  "recortadora-nariz": {
    accepted: [
      ["Recortador de Pelos para Nariz Orejas Cejas Nose Trimmer Philips NT1650 Series 1000", "estandar"],
      ["Rasuradora De Nariz Y Oreja Naker Cabezal Abierto Tipo Valla Negro", "estandar"],
      ["Recortadora de Nariz y Orejas Top House Inalámbrica a Pila AA Negra", "estandar"],
    ],
    // Un equipo que también hace barba y patillas es la otra fila; una depiladora es otro producto.
    rejected: [
      "Recortador 4 En 1 Nariz Orejas Barba Y Patillas Gris",
      "4 En 1 Depiladora Para Mujer Afeitadora Cejas Rostro Cuerpo",
    ],
    cheapestAccepted: "Recortador Depilador Nasal , Orejas , Cejas , Portatil",
  },
  "sarten-acero-inoxidable": {
    accepted: [
      ["Sartén Tramontina Allegra De Acero Inoxidable Con Fondo Triple De 28 Cm", "grande"],
      ["Sarten 28 Cm Acero Inoxidable Dina Berghoff", "grande"],
      ["Sartén Allegra De Acero Inoxidable Con Fondo Triple De 24 C", "mediana"],
      ["Sarten Tramontina Allegra 20cm Acero Inox 62666/200 Samihome", "chica"],
      ["Sarten Acero Inoxidable 20cm Tramontina Profesional 62633200 Plateado", "chica"],
    ],
    // El punto del hilo es la sartén SIN revestimiento.
    rejected: [
      "Sartén Antiadherente Acero Inoxidable 304",
      "Sarten Professional 26cm Tramontina C/revest Ceram T/fondo C Color Acero Inoxidable",
    ],
    lostToSharedFilter: "Sartén Honda Acero Inox. Sin Tapa 20cm/2.20l Tramontina Phantom Silver",
    cheapestAccepted: "Sarten De 18cm En Acero Inoxidable Multiuso Para Cocina",
  },
  "tuppers-vidrio": {
    accepted: [
      ["Vianda Pote Recipiente De Vidrio Hemético Rectangular 1040ml Transparente", "unidad"],
      ["Tupper Tramontina Hermético Vidrio Libre Bpa 1,05 Lts. Gris", "unidad"],
      ["X3 Tuppers Herméticos De Vidrio Apto Horno Y Microondas Agua", "set"],
      ["Set De 3 Recipientes De Vidrio Herméticos Mm-9087", "set"],
    ],
    // Un frasco guarda harina, no el almuerzo.
    rejected: ["Frasco De Vidrio 2 Lts Con Tapa Goldsky", "Frascos Mason Vidrio 16 Oz Con Tapa Conservas"],
    lostToSharedFilter: "Juego Kit 5 Potes Recipientes Mallony De Vidrio C/tapa Multicolor",
    cheapestAccepted: "Vianda Recipiente De Vidrio X3, 130/220/335ml En Caja",
  },
  "almohada-viscoelastica": {
    accepted: [
      ["Almohada Duoflex Nasa X Espuma Viscoelástica Con Memoria 12 Cm De Altura", "unidad"],
      ["Almohada Duoflex Nasa Cervical Media Espuma Con Memoria Viscoelástica 53x36 Cm", "unidad"],
      ["Set 2 Almohadas - Almohada Espuma Memoria Viscoelastico Nasa Blanco", "par"],
      ["Set 2 Almohadas -almohada Espuma Nasa X Viscoelastica Bamboo", "par"],
    ],
    rejected: ["Almohada Cervical Viaje Viscoelástica Con Estuche", "Almohadas Para Rodillas Espuma Viscoelástica Ergonómicas"],
    lostToSharedFilter: "Pack De 2 Almohadas Viscoelásticas Con Funda Lavable Algodon Blanco",
    cheapestAccepted: "Almohada espuma memoria cervical viscoelastica ortopedica color blanco",
  },
  "arrancador-bateria": {
    accepted: [
      ["Jump Starter Gooloo Gt4000s 12v 4000a Con Carga Rapida 100w", "solo"],
      ["Noco GB70 arrancador de batería portátil de 2000A", "solo"],
      ["Arrancador De Batería Portátil Para Auto Con Inflador Compresor Digital", "compresor"],
      ["Arrancador Cargador Comprensor Aire Portátil Auto Camioneta", "compresor"],
    ],
    rejected: [],
    cheapestAccepted: "Arrancador De Batería Portátil Para Auto Con Inflador Compresor Digital",
  },
  "auriculares-inalambricos": {
    accepted: [
      ["Apple AirPods Pro 3 Color Blanco Con Cancelación De Ruido", "inear"],
      ["Audífonos Inalámbricos Xiaomi Redmi Buds 8 Lite Black Negro", "inear"],
      ["Auriculares Inalámbricos Bluetooth Sony Wh-1000xm6 Nc", "vincha"],
      ["Auriculares inalámbricos Bluetooth Jbl Tune 530, negro y negro", "vincha"],
      // Open-ear sports sets have no headband: they land in the «sin vincha» band, whose label says
      // open-ear, even when the title also says «Headphones».
      ["Auriculares Deportivos Olsen Open-Ear IPX4 Control Touch Inteligente", "inear"],
      ["Auriculares Aiwa AWGSPORT Open-Ear inalámbricos Bluetooth color Negro", "inear"],
      ["Jbl Soundgear Clips Headphones Tws Open Ear Black Negro", "inear"],
    ],
    rejected: [],
    cheapestAccepted: "Auriculares Deportivos Olsen Open-Ear IPX4 Control Touch Inteligente",
  },
  bicicleta: {
    accepted: [
      ["Bicicleta De Montaña Rodada 29 Frenos Shimano 21v Aluminio Color Gris", "montana"],
      ["BICICLETA MONTAÑA RODADO 29 RANDERS JEICO F1 NEGRO-ROSA M", "montana"],
      ["Bicicleta Urbana Adulto R26 Nueva En Caja Para Ensamblar", "urbana"],
      ["Bicicleta Trinx Free 2.3 Híbrida Rodado 28", "urbana"],
      // «Plegable» no la hace urbana: la palabra de montaña gana.
      ["Bicicleta De Montaña Rodado 29 Plegable Lumax Negro", "montana"],
    ],
    rejected: ["Scott Contrail 20 2026 Tropic Blue L"],
    cheapestAccepted: "Bicicleta Urbana Adulto R26 Nueva En Caja Para Ensamblar",
  },
  deshidratador: {
    accepted: [
      ["Deshidratador Eléctrico Alimentos Frutas 220v A", "hogar"],
      ["Desidratador De Alimentos Ariete B-dry 5 Bandejas 245w", "hogar"],
      ["Deshidratador De Alimentos / 10 Bandejas / Demet / F R", "grande"],
      ["Deshidratador De Alimentos 10 Bandejas | Ventus Vdp-10ai", "grande"],
    ],
    // Varios «deshidratadores» de 3 litros son centrifugadores de ensalada.
    rejected: [
      "Deshidratador De Frutas Y Verduras, 3 Litros, Antideslizante",
      "Deshidratador Manual 3l Frutas Verduras Base Antideslizante",
    ],
    cheapestAccepted: "Máquina Deshidratadora Automática Frutas Verduras Alimentos Color Blanco",
  },
  "espumador-de-leche": {
    accepted: [
      ["Espumador De Leche Multifunción Xi-cmm50 Negro", "electrico"],
      ["Espumador De Leche Philips | 120 Ml | Ca6500/63 Color Negro", "electrico"],
      ["Espumador Leche Eléctrico 2 Cabezales A Pilas", "mano"],
      ["Batidor Espumador De Leche Recargable Xi-latte Xion", "mano"],
    ],
    rejected: ["Jarra Espumadora Leche Acero Inoxidable Graduada", "Jarra Para Espumar Leche Barista 350 Ml Acero Inoxidable"],
    lostToSharedFilter: "Espumador de Leche Klasse, de Acero Inoxidable, con Tapa Transparente",
    cheapestAccepted: "Batidor De Leche Cappuccino Cafe Creador De Espuma Mf Shop Color Negro",
  },
  frigobar: {
    accepted: [
      ["Minibar Midea Mdrd86fgm30 Capacidad 45l 6 Niveles De Temperatura", "estandar"],
      ["Heladera Frigobar Aiwa 90L AWFR101 Silver", "estandar"],
      ["Frigobar Enxuta 48L Blanco RENX55FHW Con Congelador Bajo Consumo", "estandar"],
    ],
    rejected: ["Freezer Frigobar Conservadora Camping Motorhome 45l", "Heladera / Frigobar A Gas Friogas Trial - Glp/220 V / 12 V"],
    lostToSharedFilter: "Frigobar Xion 50l Termostato Puerta Reversible Xi-h50wht Color Blanco",
    cheapestAccepted: "Heladera frigobar Tem T0URF085W5103 color blanco con capacidad de 46L",
  },
  kindle: {
    accepted: [
      ["Amazon Kindle Colorsoft 16gb Modelo 2025 A Color Ereader", "premium"],
      ["Amazon Kids Kindle Colorsoft 16gb Modelo T3r8l5 7 Pulgadas", "premium"],
      ["Amazon Kindle Paperwhite 7 2024 12 Gen 16 Gb Color Negro", "paperwhite"],
      ["Amazon Kindle paperwhite signature 32gb 12va gen 7p ebook color negro metalico", "paperwhite"],
      ["Amazon Kindle E-reader 2024 11th Gen 6.0in 16gb Color Negro", "basico"],
      ["Amazon E-reader Kindle 6 Pulgadas 300 Ppi (versión 2022)", "basico"],
    ],
    rejected: ["Funda Protectora Para Kindle Paperwhite 12th Gen 7 Negro", "Page Turner Ring For Kindle Paperwhite Oasis Scribe Voyage"],
    cheapestAccepted: "Ebook Amazon Kindle 6 Pulgadas 16gb 11 Gen Con Luz E-reader Color Negro",
  },
  lavasecarropas: {
    accepted: [
      ["Lavasecarropa Samsung 11kg/7kg Inverter Negro", "combinado"],
      ["Lavasecarropas automático Samsung inverter WD10T554D color negro", "combinado"],
      ["Torre De Lavado Y Secado Washtower LG 14kg Wk14bs6 Color Negro", "torre"],
      ["Torre De Lavado Y Secado Inverter Midea Mtf-120wb/t 12/10 Kg Con Bomba De Calor", "torre"],
    ],
    rejected: ["James LSE 1016 G4 LRJ-107INV-BL Corriente doméstica Blanco"],
    cheapestAccepted: "Lavasecarropas automático inverter Greenwind 10.5kg / 7Kg en secado - frontal color blanco",
  },
  monitor: {
    accepted: [
      ["Monitor Gaming LG Ultragear 24 16:9 24gs60f Color Negro", "gamer"],
      ["Monitor Para Juegos Msi Mag 245f X24 24 Fhd 240hz Hdr Negro", "gamer"],
      ["Monitor Samsung 24 Essential S3 Negro", "oficina"],
      ["Monitor Led 24 Viewsonic Va240-h 100hz 1ms Full Hd Hdmi Color Negro", "oficina"],
    ],
    rejected: ["Monitor 24 144hz Ips Fhd Pro Mp242 E14a Msi Negro (Nuevo con caja abierta)"],
    cheapestAccepted: "Monitor Led 24 Xion Xi-mnt24 Color Negro",
  },
  "perfume-arabe": {
    accepted: [
      ["Perfume Liquid Brun De French Avenue 100ml. Volumen De La Unidad 100 Ml", "estandar"],
      ["French Avenue Vulcan Feu Extrait Eau de Parfum 100ml", "estandar"],
      ["Perfume Árabe Marwa Arabiyat Prestige Extrait De Parfum 60ml", "chico"],
      ["Armaf Odyssey Mandarin Sky For Men 200ml Edp", "grande"],
      ["Líquid Brun Limited Edition Edp 150ml", "grande"],
    ],
    rejected: ["Set Afnan Turathi Blue Pour Homme 90ml Edp"],
    cheapestAccepted: "Perfume Lattafa Yara Moi Eau de parfum Spray 100mL Mujer",
  },
  "pesa-rusa": {
    accepted: [
      ["Pesa Rusa Kettlebell 6kg Mancuerna Expert Recubierta El Rey", "liviana"],
      ["Pesas Rusas Kettlebell 5kg Mancuerna Calidad N1 Color Negro", "liviana"],
      ["Pesas Rusas Hierro Macizo 20k Fitness Kettlebells Gym Rojo", "pesada"],
      ["Pesas Rusas Kettlebell 16kg Mancuerna Calidad N1 Color Negro", "pesada"],
      ["Pesa Rusa Kettlebell Plastica 12kg Color Negro", "media"],
      ["Pesas Rusas Kettlebell 12kg Mancuerna Calidad N1 El Rey Color Negro", "media"],
    ],
    // Sin un peso declarado la banda mezclaría 4 kg con 24 kg.
    rejected: [
      "Pesa Rusa Kettlebell Recargable Accesorio Mango Alpina AKE-09",
      "Pesas Rusas Kettlebell X Kg Mancuerna Calidad N1 - El Rey Color N/A",
    ],
    cheapestAccepted: "Pesa Rusa Anillo 4.5 Kg Kettlebell Fitness Rosa",
  },
  "robot-de-cocina": {
    accepted: [
      ["Robot De Cocina Nappo Powerchef 9 En 1 Táctil 7'' 1400w 4.5l Negro", "estandar"],
      ["Robot De Cocina Multifuncion Ufesa Totalchef Rk10", "estandar"],
      ["Robot De Cocina Enxuta Smart 3l Digital 18 Programas Albion Color Plateado", "estandar"],
    ],
    // En Uruguay «robot de cocina» es también la batidora planetaria; el del hilo cocina.
    rejected: ["Robot De Cocina Bosch 1000w Mum58420 Planetaria 3d - Fama", "Robot De Cocina Bosch 1000w Color Rojo"],
    lostToSharedFilter: "Robot De Cocina Enxuta Sdaenxrc312 Display Tactil 3 Lt 700w",
    cheapestAccepted: "Robot De Cocina Enxuta Smart SDAENXRC311 1700w 2.3 L Con Accesorios Color Negro",
  },
  "ventilador-industrial": {
    accepted: [
      ["Ventilador Industrial Comercial Pie 65cms 1250 Rpm 120w", "grande"],
      ["Ventilador Industrial De Pie 30 Pulgada 3 Velocidades Metal Estructura Negro", "grande"],
      ["Ventilador de Pared James VWI-200 Industrial, 50 cm y 160 W, en Negro", "mediano"],
      ["Ventilador Industrial Turbo De Piso Nappo 20'' 100w Y 3 Vel. 3", "mediano"],
      ["Ventilador De Pie 55w Industrial 3 Velocidades 5 Aspas 42 Cm Negro Metal 5", "chico"],
      ["Turboventilador Smartlife 45cm 3vel 90w 45 Cm Inox Inox 3", "chico"],
    ],
    rejected: [
      "Pack de 3 Ventiladores Pedestal 2RL Marte Industrial Metálico 3 en 1 para Piso, Pared y Mesa",
      "Pack 2 Ventilador Industrial Metalico 18 Alta Potencia 3 En1",
    ],
    cheapestAccepted: "Ventilador De Pie 55w Industrial 3 Velocidades 5 Aspas 42 Cm Negro Metal 5",
  },
};

/** Every title of the sample, so a fixture can be checked against it: none is invented. */
const SAMPLE_TITLES = new Set(
  PRODUCTOS_VIDA_CATEGORIES.flatMap((entry) => [...entry.mlQueries, "pastillas lavavajillas"])
    .flatMap((query) => sampleRowsFor(query))
    .map(([title]) => title)
);

describe("títulos reales de la muestra", () => {
  it("hay fixture para cada categoría y cada título sale de la muestra", () => {
    expect(Object.keys(FIXTURES).sort()).toEqual([...KEYS].sort());
    for (const [key, fixture] of Object.entries(FIXTURES)) {
      const titles = [
        ...fixture.accepted.map(([title]) => title),
        ...fixture.rejected,
        fixture.cheapestAccepted,
        ...(fixture.lostToSharedFilter ? [fixture.lostToSharedFilter] : []),
      ];
      for (const title of titles) expect(SAMPLE_TITLES.has(title), `${key}: ${title}`).toBe(true);
    }
  });

  for (const [key, fixture] of Object.entries(FIXTURES)) {
    describe(key, () => {
      it("acepta al menos tres títulos reales, cada uno en su variante", () => {
        expect(fixture.accepted.length).toBeGreaterThanOrEqual(3);
        for (const [title, variant] of fixture.accepted) {
          expect(categoryFor(title, "", PRODUCTOS_VIDA_CATEGORIES)?.key, title).toBe(key);
          expect(variantFor(category(key), title).key, title).toBe(variant);
        }
      });

      it("rechaza lo que no es el producto", () => {
        for (const title of fixture.rejected) {
          expect(matchesCategory(category(key), title, ""), title).toBe(false);
        }
      });

      if (fixture.lostToSharedFilter) {
        // Documented, not fixed: NOT_A_PRODUCT is shared with equipar and stays unchanged during Black
        // Friday week. The title passes this category's own filters and dies on a word like
        // «display», «tapa» or «control remoto».
        it("pierde una unidad real en el filtro compartido de equipar", () => {
          const title = fixture.lostToSharedFilter!;
          expect(category(key).include.test(norm(title))).toBe(true);
          expect(category(key).titleExclude?.test(norm(title)) ?? false).toBe(false);
          expect(NOT_A_PRODUCT.test(norm(title))).toBe(true);
          expect(matchesCategory(category(key), title, "")).toBe(false);
        });
      }
    });
  }

  it("ningún título de los fixtures lo aceptan dos categorías de este registro", () => {
    for (const fixture of Object.values(FIXTURES)) {
      for (const title of [...fixture.accepted.map(([title]) => title), ...fixture.rejected, fixture.cheapestAccepted]) {
        const accepting = PRODUCTOS_VIDA_CATEGORIES.filter((entry) => matchesCategory(entry, title, ""));
        expect(accepting.length, title).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ningún título de la búsqueda de pastillas pasa por lavavajillas (ni por ninguna otra)", () => {
    const soap = sampleRowsFor("pastillas lavavajillas");
    expect(soap.length).toBe(50);
    for (const [title] of soap) expect(categoryFor(title, "", PRODUCTOS_VIDA_CATEGORIES), title).toBeNull();
  });

  it("el aviso nuevo más barato que acepta cada categoría es una unidad real", () => {
    const listings = sampleListings();
    for (const [key, fixture] of Object.entries(FIXTURES)) {
      const uyu = (price: number, currency: string): number => (currency === "USD" ? price * SAMPLE_USD_UYU : price);
      const cheapest = listings
        .filter((listing) => listing.attributes.CATEGORY_SPEC === key && listing.condition === "new")
        .sort((a, b) => uyu(a.price, a.currency) - uyu(b.price, b.currency))[0];
      expect(cheapest?.title, key).toBe(fixture.cheapestAccepted);
    }
  });
});

// norm() turns «/» into a space, so «18/10» and «lt/día» are read as «18 10» and «lt dia». These three
// real titles also match other alternatives (inox\w*, the litres pattern), so they do not prove the
// correction by themselves: the «\/» source assertion above is what keeps dead alternatives out.
describe("títulos con barra de la muestra", () => {
  it("la sartén Tefal Primary de 24 cm entra como mediana; la de 28 cm es antiadherente y queda afuera", () => {
    const sarten = category("sarten-acero-inoxidable");
    const t24 =
      "Sartén de 24 cm Tefal Primary hecho en acero inoxidable 18/10, Apto Lavavajillas, base Thermo-fusion, mango ergonomico";
    const t28 =
      "Sartén de 28 cm Tefal Primary hecho en acero inoxidable 18/10 de la mejor calidad, Revestimiento antiadherente de titanio y tecnologia Thermo-Signal, apta inducción, sin PFOA Plomio ni cadmio E3090504";
    expect(SAMPLE_TITLES.has(t24) && SAMPLE_TITLES.has(t28)).toBe(true);
    expect(categoryFor(t24, "", PRODUCTOS_VIDA_CATEGORIES)?.key).toBe("sarten-acero-inoxidable");
    expect(variantFor(sarten, t24).key).toBe("mediana");
    expect(matchesCategory(sarten, t28, "")).toBe(false);
    // Its size would still read right if a reader ever relaxed the coating rule.
    expect(variantFor(sarten, t28).key).toBe("grande");
  });

  it("el deshumidificador Punktal de 12 lt/día entra como de compresor", () => {
    const title = "Deshumidificador Punktal Pk1550 12lt/día Secador Purificador";
    expect(SAMPLE_TITLES.has(title)).toBe(true);
    expect(categoryFor(title, "", PRODUCTOS_VIDA_CATEGORIES)?.key).toBe("deshumidificador");
    expect(variantFor(category("deshumidificador"), title).key).toBe("compresor");
  });
});

// The first real run (fixtures/ml_dryrun.json, 2026-11-20 07:13 UTC: 62 result pages, 1 986 adverts)
// showed what the 50-per-search sample never had, and the page publishes the CHEAPEST offers of every
// variant, so a wrong item at the bottom of a range is the most visible defect it can have. Each
// rejection below is a real title the registry of that night accepted; each acceptance is a real unit
// that sits next to the rule that removed it, so a rule that starts eating real products fails here.
interface RealFixture {
  rejected?: string[];
  accepted: Array<[title: string, variant: string]>;
}

const REAL_FIXTURES: Record<string, RealFixture> = {
  calientacama: {
    accepted: [
      // Opens with «frazada»: the over-blanket, though it says «1 Pz».
      ["Frazada Electrica Futura Fut-mt203a Manta Termica 1 Pz Dimm", "manta"],
      // Straps and elastics hold a pad under the sheet.
      ["Manta Eléctrica Futura Individual Lavable Con Correas", "una-plaza"],
      ["Manta Eléctrica Individual 1 Plaza Futura Con Elasticos", "una-plaza"],
      ["Calientacamas Futura 2 Plazas Doble Control + 1 Plaza", "dos-plazas"],
      ["Calientacama Electrica 2 Plazas Zilan Manta Frazada", "dos-plazas"],
      ["Calientacamas 1 Plaza Y 1/2 Con Timer 1 Control", "una-plaza"],
      ["Manta Eléctrica Twin 6 Niveles Temporizador Flannel 110w", "manta"],
    ],
  },
  lavavajillas: {
    accepted: [
      ["Lavavajillas Midea Silver 6 Sets Mdwtf0602ms", "compacto"],
      ["Lavavajillas James 6 Programas - 6 Cub. Lvcm-6cd Inox Albion", "compacto"],
      ["Lavavajillas Midea para 6 Cubiertos, De Mesa, Silver", "compacto"],
      // Ten places beat the word «compacto».
      ["Lavavajillas James Lv 10vn Inox 10 Cubiertos Compacto", "estandar"],
      ["Lavavajillas Smartlife 12-14 Cubiertos 6 Prog 3 Func Inox Inox", "estandar"],
      ["Lavavajillas Bosch Totalmente Integrable 45 Cm 10 Servicios", "estandar"],
      ["Lavavajillas Midea Wqp125201cb 1760w Capacidad 12c - Negro", "estandar"],
    ],
  },
  secarropas: {
    rejected: ["Secarropa Oferta Imperdible Casa Imperio", "Secarropa Oferta Imperdible Hasta Agotar Stock¡¡¡¡"],
    accepted: [
      ["Secarropas 8kg Económico Secado Rápido Calor Frio Con Timer", "tambor"],
      ["Secarropas De Carga Frontal Eficiente Y Moderno", "tambor"],
      ["Secarropa De Bolsa De Bolsa  Economico 2 Años De  Garantia", "bolsa"],
    ],
  },
  "aspiradora-robot": {
    rejected: ["Trapeadora Robot Inteligente Irobot Braava Jet 380T Color Negro"],
    accepted: [
      ["Aspiradora Robot Karcher Rcv5 Con Limpieza En Humedo Color Blanco", "trapea"],
      ["Roomba Combo 205 Aspiradora Y Trapeadora Compacta Model 2025 Negro", "trapea"],
      ["Robot Aspirador Irobot Roomba Essentia lQ012020 Color Negro", "aspira"],
    ],
  },
  "freidora-de-aire": {
    accepted: [
      ["Horno Freidora De Aire Sin Aceite Digital 5 Lt Inox Kassel", "mediana"],
      [
        "Horno Freidora De Aire 12l Hogaron Air Fryer 1800w Digital Con Visor Y Accesorios 10 Programas Spiedo Y Canasto Giratorio Sin Aceite XL",
        "grande",
      ],
      ["Horno Freidora de Aire Moulinex Easy Fry Oven & Grill 11L con 8 Programas", "grande"],
      ["Horno Y Freidora Sin Aceite Nappo 18l Pizzero Hasta 300ºc", "grande"],
    ],
  },
  "cortadora-barba": {
    rejected: ["Afeitadora Ballscout Silky Resistente Al Agua Kit Accesorios"],
    accepted: [
      // The «Vintage T9» is a T-blade trimmer whatever the title calls it.
      ["Afeitadora T9 Vintage Negro", "recortadora"],
      ["Máquina De Afeitar Y Afeitar Vintage T9 - Dragon", "recortadora"],
      ["Afeitadora eléctrica profesional inalámbrica recargable T9", "recortadora"],
      ["Mini afeitadora eléctrica para hombre, color plateado", "afeitadora"],
      ["Afeitadora Philips Shaver 3000 Series S3144/00 negra y celeste", "afeitadora"],
      ["Afeitadora Kemei 2024 de Láminas Inalámbrica para Rostro y Cuerpo", "afeitadora"],
    ],
  },
  deshumidificador: {
    rejected: [
      "Deshumificador De Audífonos Auditivos",
      "Deshumidificador De 500 Ml Para Ayudar A Reducir La Humedad",
      "Deshumidificador 500 Ml",
      "Deshumidificador Portátil Reutilizable Modelo Percha 3 + 1*",
      // Neither a capacity nor a mini sign: the variant would be a guess.
      "Deshumidificador Eléctrico Apagado Automático",
      "Deshumidificadores Domésticos Remotos L, 50 M²`",
    ],
    accepted: [
      ["Deshumificador Panavox 290a 10l/dia 180w", "compresor"],
      ["Deshumidificador Comfortline 20 L", "compresor"],
      ["Deshumidificador Nine Sky 300 Pies Cuadrados Baño 35oz Blanc", "mini"],
      // Millilitres WITH an electric word are a Peltier box, not a tub of salts.
      ["Deshumidificador De Aire 1000 Ml Silencioso", "mini"],
      ["Deshumidificador De Ambiente Eléctrico 2500 Ml", "mini"],
      ["Mini Deshumidificador Portátil Usb Para Placard Blanco", "mini"],
      ["Deshumidificador Nine Sky 95oz 1000 Pies Cuadrados Automátic", "compresor"],
      ["Deshumidificador Seavon 1600 Pies Cuadrados 21 Pintas 35db", "compresor"],
      ["Deshumidificador Hogar Qfox Cs10e 2000 Pies 2.5l Tanque", "compresor"],
    ],
  },
  freezer: {
    rejected: ["Freezer Vertical Enxuta 168 Litros Eficiencia A Blanco"],
    accepted: [
      ["Freezer Horizontal Enxuta Fhenx22710 708l Doble Puerta Blanco", "grande"],
      ["Freezer Horizontal Inverter Consul Chb53mbdwx 536 Lt", "grande"],
      ["Freezer Horizontal Inverter 245 L Enxuta Fhenxi16250 Clase A", "mediano"],
    ],
  },
  panificadora: {
    rejected: [
      "Accesorio Medidor Antideslizante Para Panificadora",
      "Cinta De Transmisión Para Panificadora Sunbeam - 2 Piezas",
      "Babycakes Multi-treat Panificadora 110v",
    ],
    accepted: [
      ["Máquina Para Hacer Pan Rosewill Rhbm-25001gd 700w 2 Libras", "estandar"],
      ["Maquina Para Hacer Pan Punktal Oferta Casa Imperio", "estandar"],
      ["Panetera Punktal 650w Programable + Taza Medidora Y Cuchara", "estandar"],
      ["Panetera Ufesa 11 Programas Dosificador Medidor 2 Bagueteras", "estandar"],
    ],
  },
  "recortadora-nariz": {
    rejected: ["Set de Máquinas GA.MA Race 649 con Cortapelo, Cortabarba y Trimmer de Nariz USB"],
    accepted: [
      ["Cortapelos 3 En 1, Afeitadora Y Recortadora De Nariz Azul", "estandar"],
      ["Recortador De Vello Nariz, Orejas Y Cejas Trimmer LG", "estandar"],
      ["Recortadora de Pelos Nariz y Orejas Kemei KM-6512 Inalámbrica Acero Inoxidable", "estandar"],
    ],
  },
  "tuppers-vidrio": {
    rejected: [
      "Tupper Tápers Hermético Vidrio 410ml 2uni Yaques Mayorista",
      "Tupper Tápers Hermético Vidrio 700ml 2uni Yaques Mayorista",
      "Tupper Táper Hermético Vidrio 1040ml 2uni Yaques Mayorista",
    ],
    accepted: [
      // A size written with «X» is not a pack of ten.
      ["Tupper Hermético De Vidrio 410ml - 14,5 X 10,5 X 5 Cm", "unidad"],
      ["Tupper Hermético De Vidrio 700ml - 17 X 12,5 X 5,5 Cm", "unidad"],
      ["Tupper Hermético De Vidrio 14 X 19 X 7 Cm Búho", "unidad"],
      ["X3 Tuppers Herméticos De Vidrio Apto Horno Y Microondas Agua", "set"],
      ["Tuppers Vidrio 640 Ml Herméticos Pack X5 Aptos Horno", "set"],
      ["3 Tuppers De Vidrio Borosilicato Herméticos", "set"],
    ],
  },
  "auriculares-inalambricos": {
    accepted: [
      ["Jbl Headphones Tws Endurance Peak 4 White Blanco", "inear"],
      ["Auriculares Jbl Tune Flex 2 True Wireless Con Cancelación De Color Teal", "inear"],
      ["Jbl Tune Buds 2 Audífono Bluetooth 48 Hrs Cancelacion Negro", "inear"],
      ["Auriculares Bluetooth Jbl Tune 520BT Azul", "vincha"],
      ["Auriculares inalámbricos Bluetooth Jbl Tune 780nc, negro y negro", "vincha"],
    ],
  },
  bicicleta: {
    accepted: [
      ["Bicicleta Kova Jazz Rodado 24 C/ Canasto Y Timbre", "urbana"],
      ["Bicicleta Paseo Rodado 28 Holland Urbana Con Canasto Acero", "urbana"],
      ["Bicicleta Mormaii Rodado 26 Fullsion 18v C/suspensión Negra Negro 19", "montana"],
    ],
  },
  "espumador-de-leche": {
    rejected: ["Espumador De Leche 250ml Negro Latteo Bodum"],
    accepted: [
      ["Espumador De Leche Ufesa Nuvella 600w 200ml", "electrico"],
      ["Espumador Lacor 69396 Eléctrico Blanco 115ml 500W Corriente", "electrico"],
      ["Espumador Bodum Schiuma Batidor Leche Acero Inoxidable Pepino Café Barista Latte Color Gris", "mano"],
    ],
  },
  frigobar: {
    rejected: ["Mini Bar  De Madera  Cava Rustica", "Frigobar 12/24 Volts De 90 Litros"],
    accepted: [
      ["Frigobar Whirlpool Retro Vintage 76 L Patas Removibles Dimm", "estandar"],
      ["Frigobar Con Congelador Punktal 93 Lts. Sist. Termoeléctrico", "estandar"],
      ["Heladera -refrigerador -minibar -friogobar James Jn-50k 51 L", "estandar"],
    ],
  },
  monitor: {
    accepted: [
      // A declared refresh rate under 120 Hz beats the word «gamer».
      ['Monitor Gamer Gadnic con pantalla de 24" 75Hz y resolución Full HD', "oficina"],
      ['Monitor Gamer Shot Gaming Curvo 23.8" 100hZ', "oficina"],
      ["Monitor Led 24 Dell 100hz Full Hd Ips 5ms P2425he", "oficina"],
      ["Monitor Gamer Xtrike Me 24  120hz Full Hd Hdmi Vga", "gamer"],
      ["Monitor Teros Te-2417s, 24 Fhd Ips, 144hz, 1 Ms, Hdmi, Dp, Negro", "gamer"],
      ["Monitor Gamer Xtrike Me 24 Led Full Hd Negro", "gamer"],
    ],
  },
  "pesa-rusa": {
    rejected: [
      "Kit De Pesas Set Mancuernas Ajustable 20kg Barra Rusa Kettlebell Ejercicio Completo Color Negro",
      "4en1 Kit Ajustable Mancuernas 5.5kg Con Juego Peso Pesa Rusa Verde",
      '"Mancuerna y Pesa Rusa 2 en 1 Ajustable 5kg con Sistema de Bloqueo Rápido, Pesa de Entrenamiento de Fuerza con Base Antideslizante, Rosa "',
    ],
    accepted: [
      ["Kettlebell Macri de 15 Libras para Entrenamiento de Fuerza", "liviana"],
      // An adjustable KETTLEBELL is still one.
      ["Pesa Rusa Ajustable Hasta 20 Kg", "pesada"],
      ["Pesa Rusa 12 Kg Hierro Fundido Ajustable Gimnasio", "media"],
      ["Pesa Rusa De 20 Kg Kettlebel 44 Libras Fitness Crossfit Color Negro", "pesada"],
      ["Pesa Rusa Mancuerna De Mano 5kg Recubierta Pvc Kettlebell Celeste", "liviana"],
    ],
  },
  "sarten-acero-inoxidable": {
    rejected: [
      "Wok Sarten Acero Inoxidable 28cm Trillium Con 2 Asas",
      "Sartén Kankay Carbonada Sartenes N20 color acero inoxidable de 1.5L",
    ],
    accepted: [
      // «color acero inoxidable» alone is not the defect: this Tramontina is stainless.
      ["Sartén Tramontina Professional con triple fondo para inducción, 26 cm, color acero inoxidable", "mediana"],
      ["Sartén Acero Inoxidable Cobre Korkmaz Divani 24cm Apto Lavavajillas", "mediana"],
    ],
  },
  "ventilador-industrial": {
    rejected: [
      // The same fan another seller lists as «… 42 Cm»: without a size it cannot be placed.
      "Ventilador De Pie 55w Industrial 3 Velocidades 5 Aspas Ganga Shop",
      "Ventilador Tipo Industrial 3 En 1 Ts Home",
      "Ventilador Industrial Pared Goldtech 3 Aspas 26  Potente Ax®",
    ],
    accepted: [
      ["Ventilador De Pie 55w Industrial 3 Velocidades 5 Aspas 42 Cm Negro Metal 5", "chico"],
      ["Ventilador Industrial Turbo De Piso Nappo 20'' 100w Y 3 Vel. 3", "mediano"],
      ["Ventilador Industrial 3 En 1 Pie Pared Piso 50cm 5 Aspas", "mediano"],
      ['Ventilador Industrial Y GCS de 26" (69 cm) con 3 Velocidades y Oscilación', "grande"],
      ["Ventilador Industrial De Pie 30 Pulgada 3 Velocidades Metal Estructura Negro", "grande"],
      ["Ventilador Industrial De Pared 1 Metro Motor Blindado 1/2 Cv", "grande"],
    ],
  },
};

/**
 * The cheapest NEW advert of every variant with a band (8 new adverts or more) in the real run,
 * re-read with this registry and read by eye: a real unit of that product, in that variant. Ties on
 * price are broken by title. Some are cheap enough for the band to mark them suspect (the T9 trimmer,
 * the cross-border earbuds): that is the band's call, not an accessory.
 */
const REAL_CHEAPEST: Record<string, string> = {
  "calientacama:manta": "Manta Eléctrica Kassel Para Cama Queen Poliéster",
  "calientacama:una-plaza": "Calienta Camas Nappo 1 Plaza 2 Niveles Con Control, 160x80cm",
  "calientacama:dos-plazas": "Calienta Camas Nappo 2 Plazas 2 Niveles 2 Controles, 160x140cm",
  "lavavajillas:compacto": "Lavavajillas Midea para 6 Cubiertos, De Mesa, Silver",
  "lavavajillas:estandar": "Lavavajillas Xion De 10 Servicios Negro XI-LVV10",
  "secarropas:bolsa": "Secarropas Portátil Para Prendas Y Zapatos - Con Tubo 400w",
  "secarropas:tambor": "Secarropas 8kg Económico Secado Rápido Calor Frio Con Timer",
  "aspiradora-robot:trapea": "Aspiradora Robot Trapeadora Inteligente 3 En 1 Vacuum - Mli Color Blanco",
  "aspiradora-robot:aspira": "Aspiradora Robot Multilaser Ho041 Rojo/negro",
  "freidora-de-aire:grande": "Freidora De Aire 8l Hogaron Air Fryer Xl 1800w Digital Visor",
  "freidora-de-aire:chica": "Freidora De Aire 4.5 L  Silver Crest",
  "freidora-de-aire:mediana": "Freidora Aire Airfryer Digital 6 Litros Sin Aceite Color Negro",
  "cortadora-barba:recortadora": "Máquina De Cortar Pelo Barba y Patillas Vintage Dragon",
  "cortadora-barba:afeitadora": "Mini afeitadora eléctrica para hombre, color plateado",
  "deshumidificador:compresor": "Deshumidificador Eléctrico Tem 12L 1001",
  "deshumidificador:mini": "Mini Deshumidificador Portátil Usb Para Placard Blanco",
  "freezer:chico": "Freezer Horizontal 100 Litros Indurama Cl-100 -18oc Clase B Blanco",
  "freezer:grande": "Freezer Horizontal Aiwa Awhcfc30101 299 Lt Funcion Dual Color Blanco",
  "freezer:mediano": "Freezer Horizontal Aiwa 142 Lt Awhcfc15101 Funcion Dual Color Blanco",
  "panificadora:estandar": "Panificadora Hogaron HGBM1 de 1 kg con 19 Programas y Dispensador Automático",
  "recortadora-nariz:estandar": "Recortador Depilador Nasal , Orejas , Cejas , Portatil",
  "tuppers-vidrio:set": "X3 Tuppers Herméticos De Vidrio Apto Horno Y Microondas Agua",
  "tuppers-vidrio:unidad": "Tupper De Vidrio Hermético - 410ml - 1003 Color Agua",
  "almohada-viscoelastica:par": "Set X2 almohada Nasa Black viscoelastica 100% algodon Duoflex",
  "almohada-viscoelastica:unidad": "Almohada espuma memoria cervical viscoelastica ortopedica color blanco",
  "arrancador-bateria:compresor": "Arrancador De Batería Portátil Para Auto Con Inflador Compresor Digital",
  "arrancador-bateria:solo": "Arrancador De Batería Auto Power Bank 10000 Mah Linterna Neg",
  "auriculares-inalambricos:vincha": "Auriculares Bluetooth Jbl Tune 520BT Azul",
  "auriculares-inalambricos:inear":
    "Auriculares in-ear gamer inalámbricos Techfun Bluetooth F9-5 BTH-F9-5 negro con luz LED",
  "bicicleta:urbana": 'Bicicleta Urbana Vintage Rodado 24" Con Canasto Color Amarillo',
  "bicicleta:montana": "Bicicleta Mormaii Rodado 26 Fullsion 18v C/suspensión Negra Negro 19",
  "deshidratador:grande": "Deshidratador De Alimentos / 10 Bandejas / Demet / F R",
  "deshidratador:hogar": "Máquina Deshidratadora Automática Frutas Verduras Alimentos Color Blanco",
  "espumador-de-leche:electrico": "Espumador De Leche Multifunción Xi-cmm50 Negro",
  "espumador-de-leche:mano": "Batidor De Leche Cappuccino Cafe Creador De Espuma Mf Shop Color Negro",
  "frigobar:estandar": "Heladera frigobar Tem T0URF085W5103 color blanco con capacidad de 46L",
  "kindle:paperwhite": "Ebook Ereader Amazon Kindle Paperwhite Kids 2021 16gb 6.8''",
  "kindle:basico": "Ebook Amazon Kindle 6 Pulgadas 16gb 11 Gen Con Luz E-reader Color Negro",
  "lavasecarropas:torre": "Torre De Lavado Y Secado Inverter Midea Mtf-120wb/t 12/10 Kg Con Bomba De Calor",
  "lavasecarropas:combinado": "Lava Secarropas Candy Rápido 10 + 6 Eléctrico (outlet)",
  "monitor:gamer": "Monitor Gamer Xtrike Me 24 Led Full Hd Negro",
  "monitor:oficina": "Monitor Led 24 Xion Xi-mnt24 Color Negro",
  "perfume-arabe:estandar": "Lattafa Qaed Al Fursan Unlimited 90ml EDP",
  "pesa-rusa:liviana": "Pesa Rusa Kettlebell 2kg Mancuerna",
  "pesa-rusa:pesada": "Pesas Rusas Kettlebell 16kg Mancuerna Calidad N1 Color Negro",
  "pesa-rusa:media": "Pesa Rusa 10kg",
  "robot-de-cocina:estandar": "Robot De Cocina Enxuta Smart 1700w 2.3 L Con Accesorios",
  "sarten-acero-inoxidable:chica": "Sartén Acero Inoxidable 304 20 Cm Plateado",
  "sarten-acero-inoxidable:grande": "Sartén Tramontina Allegra De Acero Inoxidable Con Fondo Triple De 28 Cm",
  "sarten-acero-inoxidable:mediana": "Sartén 24cm 2.1L Tramontina 62295/240 Acero Inox",
  "ventilador-industrial:grande": "Ventilador Industrial Comercial Pie 65cms 1250 Rpm 120w",
  "ventilador-industrial:mediano": "Ventilador De Pie Blaster Turbo 5 Aspas 3 Velocidades 50cm Cromadas",
};

describe("la primera corrida real (20/11/2026)", () => {
  const rowsOf = (key: string) => REAL_RUN.rows.filter(([, , , category]) => category === key);

  it("cada título de los fixtures salió de la búsqueda de esa categoría en la corrida real", () => {
    expect(REAL_RUN.rows.length).toBe(1986);
    for (const [key, fixture] of Object.entries(REAL_FIXTURES)) {
      const titles = new Set(rowsOf(key).map(([title]) => title));
      for (const title of [...(fixture.rejected ?? []), ...fixture.accepted.map(([title]) => title)]) {
        expect(titles.has(title), `${key}: ${title}`).toBe(true);
      }
    }
  });

  for (const [key, fixture] of Object.entries(REAL_FIXTURES)) {
    describe(key, () => {
      if (fixture.rejected?.length) {
        it("rechaza lo que aquella noche entró sin ser el producto", () => {
          for (const title of fixture.rejected!) expect(matchesCategory(category(key), title, ""), title).toBe(false);
        });
      }
      it("acepta las unidades reales vecinas de cada regla nueva, cada una en su variante", () => {
        for (const [title, variant] of fixture.accepted) {
          expect(matchesCategory(category(key), title, ""), title).toBe(true);
          expect(variantFor(category(key), title).key, title).toBe(variant);
          // The harvester offers a result only to its own search; still, no other category of this
          // registry may claim it.
          const others = PRODUCTOS_VIDA_CATEGORIES.filter((entry) => entry.key !== key && matchesCategory(entry, title, ""));
          expect(others.map((entry) => entry.key), title).toEqual([]);
        }
      });
    });
  }

  it("el aviso nuevo más barato de cada variante con banda es una unidad real de esa variante", () => {
    const byItem = new Map<string, Array<[string, number]>>();
    for (const [title, priceUyu, condition, key] of REAL_RUN.rows) {
      if (condition !== "new" || !matchesCategory(category(key), title, "")) continue;
      const item = `${key}:${variantFor(category(key), title).key}`;
      byItem.set(item, [...(byItem.get(item) ?? []), [title, priceUyu]]);
    }
    const cheapest: Record<string, string> = {};
    for (const [item, offers] of byItem) {
      // Below 8 new adverts there is no band and the page shows no offers for the variant.
      if (offers.length < 8) continue;
      offers.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      cheapest[item] = offers[0]![0];
    }
    expect(cheapest).toEqual(REAL_CHEAPEST);
  });
});

// A band read from one narrow search says so in its label: the freezer is read only from «freezer
// horizontal» and the monitor only from 22–25 inch titles, so a reader comparing a vertical freezer or
// a 27" monitor against them is not misled.
describe("las etiquetas dicen qué parte del producto miden", () => {
  it("freezer horizontal, monitor de 22 a 25 pulgadas, auriculares sin vincha", () => {
    const labels = (key: string) => category(key).variants.map((variant) => variant.label);
    for (const label of labels("freezer")) expect(label).toMatch(/^Horizontal, /);
    for (const label of labels("monitor")) expect(label).toMatch(/^22 a 25 pulgadas, /);
    expect(labels("auriculares-inalambricos")).toContain("Sin vincha (in-ear u open-ear)");
  });
});

describe("el registro de equipar no cambia", () => {
  // Two keys are shared by design («secarropas», «deshumidificador»: the page's anchors and the app
  // slugs are the product names), so the invariant is not "no shared key" but "two separate
  // definitions in two separate collections": a shared key never reaches equipar's rows.
  it("equipar no usa la sala nueva, ni comparte objetos ni colecciones con este registro", () => {
    expect(EQUIPAR_CATEGORIES.filter((entry) => (entry.room as string) === "productos-vida")).toEqual([]);
    const ours = new Set<object>(PRODUCTOS_VIDA_CATEGORIES);
    expect(EQUIPAR_CATEGORIES.some((entry) => ours.has(entry))).toBe(false);
    const equiparByKey = new Map(EQUIPAR_CATEGORIES.map((entry) => [entry.key, entry]));
    for (const entry of PRODUCTOS_VIDA_CATEGORIES) {
      const twin = equiparByKey.get(entry.key);
      if (!twin) continue;
      expect(twin.room, entry.key).not.toBe("productos-vida");
      expect(twin.include, entry.key).not.toBe(entry.include);
    }
    expect(Object.values(PRODUCTOS_VIDA_COLLECTIONS)).toEqual(["productosvidaitems", "productosvidameta", "productosvidalistings"]);
  });

  it("el registro importa una sola cosa, el tipo de equipar (el CI del app lo carga sin dependencias)", () => {
    const source = readFileSync(path.join(__dirname, "..", "..", "classes", "productosvida", "registry.ts"), "utf8");
    const imports = source.match(/^import .*$/gm) ?? [];
    expect(imports).toEqual(['import type { EquiparCategory } from "../equipar/types";']);
  });
});

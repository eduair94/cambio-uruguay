import { describe, expect, it } from "vitest";
import { genFromText, readCpu } from "../../classes/computadoras/cpu";
import { integratedFor, readGpu } from "../../classes/computadoras/gpu";
import { norm } from "../../classes/computadoras/text";

// Títulos reales de Mercado Libre y Facebook Marketplace (muestra del 23/11/2026).
const cpu = (title: string) => readCpu(norm(title));
const gpu = (title: string, notebook = false) => readGpu(norm(title), notebook);

describe("procesador", () => {
  it("lee el modelo exacto de un Core con su generación, socket y RAM", () => {
    const read = cpu("Pc Gamer Intel I5 9400f | Gtx 1050 Ti 4gb | 8gb Ram | Ssd 48");
    expect(read).toMatchObject({ slug: "cpu:i5-9400f", generation: 9, socket: "LGA1151", ramType: "ddr4", mobile: false, year: 2018 });
    expect(cpu("PC Gamer Ryzen 5 5600G + RTX 3060 Ti 8GB")).toMatchObject({ slug: "cpu:ryzen-5-5600g", socket: "AM4", ramType: "ddr4" });
    expect(cpu("Procesador Amd Ryzen 5 8400f 6 Core 4.7ghz Socket Am5")).toMatchObject({ slug: "cpu:ryzen-5-8400f", socket: "AM5", ramType: "ddr5" });
    expect(cpu("Procesador Intel Core Ultra 5 245kf Box Lga1851")).toMatchObject({ slug: "cpu:ultra-5-245kf", socket: "LGA1851" });
    expect(cpu("Pc Gamer Amd Fx-8350 + Rx 580 8gb + 12gb Ram")).toMatchObject({ slug: "cpu:fx-8350", socket: "AM3+", ramType: "ddr3" });
  });

  it("reconoce los de notebook por el sufijo y no les inventa socket", () => {
    expect(cpu("Gigabyte A16 Negro I7-13620h 16gb 1tb Rtx5060 8gb")).toMatchObject({ slug: "cpu:i7-13620h", generation: 13, mobile: true, socket: null });
    expect(cpu("Lenovo Ideapad 3 -i5 1035g1")).toMatchObject({ slug: "cpu:i5-1035g1", generation: 10, mobile: true });
    expect(cpu("Notebook Ideapad 1 15.6' 256gb 8gb Intel N4020 Color Gris")).toMatchObject({ slug: "cpu:celeron-n4020", mobile: true });
  });

  it("«i7» sin número es una familia: sin slug, nunca un procesador concreto", () => {
    expect(cpu("Pc Gamer Intel I7 16gb Ram 512 Ssd Nvidia Gtx 1660super")).toMatchObject({ family: "core-i7", model: null, slug: null });
    expect(cpu("Pc De Escritorio I3 3ra Gen 8gb 500gb Hdd Ubuntu 24.04")).toMatchObject({ family: "core-i3", slug: null, generation: 3, ramType: "ddr3" });
    expect(cpu("Notebook Dell Latitude 7430i7 12agen16gb Ramssd 512gb")).toMatchObject({ family: "core-i7", generation: 12 });
  });

  it("no confunde una capacidad ni «segunda mano» con un modelo o una generación", () => {
    expect(cpu("Pc Gamer I7 2070rtx 32gb 1tb Ssd")).toMatchObject({ family: "core-i7", slug: null });
    expect(genFromText(norm("vendo i5 2da mano"))).toBeNull();
  });

  it("lee el sufijo escrito aparte y las variantes de Ryzen mal escritas", () => {
    expect(cpu("Pc Gamer I5 13600 Kf Amd 9070 32 De Ram Ddr5")?.slug).toBe("cpu:i5-13600kf");
    expect(cpu("Pc Gamer-amd Rysen 5 5500- Radeon Rx6600-500gb Ssd")?.slug).toBe("cpu:ryzen-5-5500");
    expect(cpu("Pack Pc Gamer Rayzen 5 5600gt, 32gb, 1tb Ssd, Rtx 2060s 8gb")?.slug).toBe("cpu:ryzen-5-5600gt");
    expect(cpu("Pc Completa Amd 9800x3d /ram 48gb 8000hz /m.2 4t /rtx4070ti")).toMatchObject({ slug: "cpu:ryzen-7-9800x3d", socket: "AM5" });
    expect(cpu("PC Gamer Ryzen 5500 + RX 6600")).toMatchObject({ slug: "cpu:ryzen-5-5500", socket: "AM4" });
  });

  it("Apple: el chip, pero «1tb m2» es un disco", () => {
    expect(cpu("Apple Macbook Air 2020,m1, 256gb, Plata, 13 Pulgadas")).toMatchObject({ slug: "cpu:apple-m1", year: 2020 });
    expect(cpu("OPORTUNIDAD! MACBOOK PRO CON CHIP M2 PRO 16GB RAM 512GB SSD")?.slug).toBe("cpu:apple-m2-pro");
    expect(cpu("Mc book Pro Apple i7")).toMatchObject({ brand: "intel", family: "core-i7" });
    expect(cpu("Pc Gamer Pro I5-12400f 32gb 1tb M2 Nvme Rtx 4060")?.slug).toBe("cpu:i5-12400f");
  });

  it("el número de modelo de Apple da el chip sólo cuando tiene uno", () => {
    expect(cpu("Apple Macbook Air 13 A2337 M1 8gb 256gb Plata")?.slug).toBe("cpu:apple-m1");
    expect(cpu("Apple  Macbook Air 15 A2941 256 gb Gris Espacial")?.slug).toBe("cpu:apple-m2");
    // A2338 es la Pro 13" con M1 y con M2: la familia, sin un modelo que se valúe.
    expect(cpu("Apple Macbook Pro A2338 8gb 256gb Ssd Gris Espacial")).toMatchObject({ family: "apple-m", slug: null, year: 2020 });
  });
});

describe("placa de video", () => {
  it("lee serie, número, variante y VRAM", () => {
    expect(gpu("Pc Gamer  Ryzen 5 5600x  +  Rtx 3060 Oc 12gb + Ssd 1tb")).toMatchObject({ slug: "gpu:rtx-3060-12gb", baseSlug: "gpu:rtx-3060", vramGb: 12 });
    expect(gpu("Pc Gamer Intel Core I7 3770 1tb Ddr3 16gb Gtx1050ti 4gb W10")).toMatchObject({ slug: "gpu:gtx-1050-ti", year: 2016 });
    expect(gpu("Tarjeta Video Biostar Rx580 2048sp 8gb Ddr5 Dvi Hdmi Dp")?.baseSlug).toBe("gpu:rx-580");
    expect(gpu("Tarjeta De Video Grafica Intel B580 Asrock 12gb Gddr6 2 Fan")).toMatchObject({ slug: "gpu:arc-b580", vramGb: 12 });
  });

  it("lee el número antes de la serie, sin la serie y con la marca sola", () => {
    expect(gpu("Pc Gamer I7 2070rtx 32gb 1tb Ssd")?.slug).toBe("gpu:rtx-2070");
    expect(gpu("Pc Gamer - Ryzen 7 7800x3d - Nvidia 4070ti 12gb - 32gb Ram")?.slug).toBe("gpu:rtx-4070-ti");
    expect(gpu("Pc Gamer, 1060 6gb, I7 10700f, 16gb Ram, Ssd 750gb, Cooler")?.slug).toBe("gpu:gtx-1060-6gb");
    expect(gpu("Pc Gamer I5 13600 Kf Amd 9070 32 De Ram Ddr5")?.slug).toBe("gpu:rx-9070");
  });

  it("la RAM del sistema no es VRAM, y más de 16 GB sólo en la gama x90", () => {
    expect(gpu("Hp Victus I5 13th Rtx 4050 16gb Ram 512gb Ssd")?.vramGb).toBeNull();
    expect(gpu("Notebook Gamer Lenovo Legion Pro 5 – RTX 5070 – 32GB – OLED")?.vramGb).toBeNull();
    expect(gpu("Pc Gamer Rtx 4070 Ti 12gb + Ryzen 7 7700x + 32gb Ddr5 + 2tb")?.vramGb).toBe(12);
  });

  it("una dedicada de notebook no se valúa como la de escritorio", () => {
    expect(gpu("Msi Cyborg 15 A13v, I7 13620h, 32gb Ram, 1tb Ssd, Rtx 4050", true)).toMatchObject({ slug: null, mobile: true });
    expect(gpu("Msi Gs60 2qe Gold Edition 4k I7 16 Gb 768 Gb Ssd Gtx970m")).toMatchObject({ mobile: true, slug: null });
  });

  it("integradas: nombradas, o deducidas del procesador", () => {
    expect(gpu("Pc Gamer Ryzen 7 5700g | 32 Gb Ram | Ssd 1 Tb | Vega 8")).toMatchObject({ integrated: true });
    expect(integratedFor({ brand: "amd", model: "5600G", family: "ryzen-5" })?.integrated).toBe(true);
    expect(integratedFor({ brand: "intel", model: "12400F", family: "core-i5" })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { parseOcaBranches } from "../classes/cambios/oca";

describe("OCA official locations", () => {
  it("parses official coordinates and geography", () => {
    const html = `
      <dl class="accordion">
        <dt>Montevideo</dt>
        <dd><ul class="place-list">
          <li data-latitud="-34.904568" data-longitud="-56.185688">
            <h4>Casa Central</h4>
            <p class="ic ic-place">Colonia 1426 - 1432</p>
            <p class="ic ic-time">Lunes a viernes de 10 a 18 hs.</p>
          </li>
        </ul></dd>
        <dt>Interior</dt>
        <dd><ul class="place-list">
          <li data-latitud="" data-longitud="">
            <h4>Nueva sucursal Pando</h4>
            <p class="ic ic-place">Dr Cesar Piovene 1031</p>
            <p class="ic ic-time">De lunes a viernes de 10 a 18hs.</p>
            <p class="ic ic-alert">No cuenta con servicio de cajas.</p>
          </li>
        </ul></dd>
      </dl>
    `;

    expect(parseOcaBranches(html)).toEqual([
      expect.objectContaining({
        id: "oca-casa-central",
        department: "MONTEVIDEO",
        latitude: -34.904568,
        longitude: -56.185688,
      }),
      expect.objectContaining({
        id: "oca-nueva-sucursal-pando",
        department: "CANELONES",
        locality: "PANDO",
        latitude: -34.7183676,
        longitude: -55.9604993,
      }),
    ]);
  });

  it("rejects an unknown interior geography", () => {
    const html = `
      <dl class="accordion"><dt>Interior</dt><dd><ul class="place-list">
        <li data-latitud="-33" data-longitud="-56">
          <h4>Local nuevo sin mapeo</h4>
          <p class="ic ic-place">Dirección 123</p>
        </li>
      </ul></dd></dl>
    `;

    expect(() => parseOcaBranches(html)).toThrow(
      "OCA branch has unknown geography"
    );
  });
});

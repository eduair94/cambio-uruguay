// La garantía de alquiler, que en Uruguay decide si alguien puede alquilar más que el precio.
//
// Los textos de este archivo son RECORTES REALES de descripciones de InfoCasas del 2026-09-04. No
// están inventados: cada uno cubre un modo de falla que apareció al medir sobre 336 avisos.
import { describe, expect, it } from "vitest";
import { guaranteesFromText, mergeGuarantees, plainText } from "../../classes/rentals/guarantees";

describe("qué garantías dice aceptar un aviso", () => {
  it("lee la lista típica", () => {
    expect(
      guaranteesFromText(
        "Superficie Total: 40m2 Precio: $28.000 Gastos Comunes: $4.300 Garantías: Aseguradoras, ANDA o Contaduría No Acepta Mascotas"
      )
    ).toEqual(["anda", "contaduria", "aseguradora"]);
  });

  // EL FALSO POSITIVO QUE JUSTIFICA ANCLAR EN EL SUSTANTIVO. Con `/garant/` en vez de
  // `/garant[ií]as?\b/` esto etiquetaba 12 de 138 avisos (8,7 %) que no hablan de garantías.
  it("no confunde el verbo garantizar con una garantía", () => {
    expect(
      guaranteesFromText(
        "portería 24 horas que garantiza seguridad y tranquilidad, con amenities que garantizan comodidad"
      )
    ).toEqual([]);
  });

  // EL FALSO POSITIVO QUE JUSTIFICA LA VENTANA. En Uruguay "depósito" es también un galpón, y
  // leyendo la descripción entera esto se etiquetaba como depósito en garantía.
  it("no toma por garantía un depósito que es un galpón", () => {
    expect(
      guaranteesFromText(
        "Campo de 3 hectáreas que cuenta con galpones, depósito, corral de aves, invernadero y quinta para autoconsumo."
      )
    ).toEqual([]);
  });

  it("sí toma el depósito cuando está pegado a la garantía", () => {
    expect(guaranteesFromText("Garantía: 6 meses de depósito o pólizas gestionadas por el edificio")).toEqual([
      "aseguradora",
      "deposito",
    ]);
    expect(guaranteesFromText("Garantías aceptadas: Aseguradoras privadas o depósito bancario")).toEqual([
      "aseguradora",
      "deposito",
    ]);
  });

  // La exclusividad no cambia lo que se publica: el tipo listado se acepta igual.
  it("una garantía exclusiva se publica como la garantía que es", () => {
    expect(
      guaranteesFromText("Garantía exclusivamente mediante Porto Seguro o SURA. No se aceptan mascotas.")
    ).toEqual(["aseguradora"]);
    expect(guaranteesFromText("Condiciones: • Garantía: ANDA únicamente • Mascotas: se admiten")).toEqual([
      "anda",
    ]);
  });

  it('reconoce "a convenir" y "consultar" como una respuesta, no como silencio', () => {
    expect(guaranteesFromText("Cerro Largo Alquiler $25.000 GC $2.000 Garantias a convenir")).toEqual([
      "aConvenir",
    ]);
    expect(guaranteesFromText("Gastos Comunes: 6.500 Garantía: Consultar. Superficie 50m2")).toEqual([
      "aConvenir",
    ]);
  });

  // "No acepta mascotas" cae DENTRO de la ventana en muchos avisos. No es una negación de la
  // garantía y no puede borrar lo que el mismo renglón dice.
  it("un 'no acepta' de otra cosa no borra la garantía", () => {
    expect(
      guaranteesFromText(
        "Garantías: Aseguradoras, ANDA o Contaduría No Acepta Mascotas Para coordinar visita escribinos"
      )
    ).toEqual(["anda", "contaduria", "aseguradora"]);
  });

  it("lista vacía cuando el aviso no lo dice", () => {
    expect(guaranteesFromText("Apartamento a estrenar de 1 dormitorio con parrillero en Parque Rodó")).toEqual(
      []
    );
    expect(guaranteesFromText("")).toEqual([]);
    expect(guaranteesFromText(null)).toEqual([]);
  });

  it("lee a través del HTML con el que vienen las descripciones", () => {
    expect(guaranteesFromText("Balcón<br><br>Garantías: Aseguradoras,&nbsp;otras se conversan<br>")).toEqual([
      "aseguradora",
    ]);
    expect(plainText("uno<br>dos&nbsp;&nbsp;tres")).toBe("uno dos tres");
  });

  // El orden es el del catálogo, no el de aparición: dos avisos con las mismas garantías tienen
  // que producir el MISMO arreglo, o la propiedad unificada cambia de forma según qué portal se
  // leyó primero.
  it("devuelve siempre el mismo orden, sin repetidos", () => {
    const a = guaranteesFromText("Garantías: Contaduría, ANDA");
    const b = guaranteesFromText("Garantía: ANDA. También Contaduría. Garantías: ANDA o Contaduría.");
    expect(a).toEqual(b);
    expect(a).toEqual(["anda", "contaduria"]);
  });
});

describe("al unificar varios avisos de la misma propiedad", () => {
  // Unión y no intersección: que un aviso no nombre ANDA no dice que no se acepte, sólo que ese
  // texto no la nombra. Una lista vacía nunca contradice a una llena.
  it("junta lo que dice cada aviso", () => {
    expect(mergeGuarantees([["anda"], ["aseguradora"], []])).toEqual(["anda", "aseguradora"]);
  });

  it("no repite ni cambia el orden", () => {
    expect(mergeGuarantees([["aseguradora", "anda"], ["anda"]])).toEqual(["anda", "aseguradora"]);
  });

  it("sin datos queda vacío", () => {
    expect(mergeGuarantees([[], []])).toEqual([]);
    expect(mergeGuarantees([])).toEqual([]);
  });
});

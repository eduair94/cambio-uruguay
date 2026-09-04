// La garantía de alquiler, que en Uruguay decide si alguien puede alquilar más que el precio.
//
// Los textos de este archivo son RECORTES REALES de descripciones de InfoCasas del 2026-09-04. No
// están inventados: cada uno cubre un modo de falla que apareció al medir sobre 336 avisos.
import { describe, expect, it } from "vitest";
import {
  guaranteesFromField,
  guaranteesFromText,
  mergeGuarantees,
  plainText,
} from "../../classes/rentals/guarantees";

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

// Los tres defectos que encontro la revision adversarial DESPUES de publicar la primera version.
describe("lo que la revision corrigio", () => {
  // Medido sobre las menciones reales: 34 "ANDA", 25 "Anda", 3 "anda". Con /ANDA/ se perdia
  // el 45 %. Y ninguna de las 62 apariciones es el verbo andar.
  it("reconoce ANDA en cualquier caja", () => {
    for (const caja of ["ANDA", "Anda", "anda"]) {
      expect(guaranteesFromText(`Garantías: ${caja} o Contaduría`), caja).toContain("anda");
    }
  });

  // "SOMOS CORREDORES DE PORTO SEGURO" es publicidad de la inmobiliaria, no una garantia de la
  // propiedad: 10 falsos positivos medidos, 8 de ellos CONTRADICIENDO la lista del propio aviso.
  // Mandar a alguien con poliza de Porto a una casa que solo toma ANDA es el peor error posible.
  it("no toma la publicidad de la inmobiliaria por una garantia de la propiedad", () => {
    expect(
      guaranteesFromText(
        "SOMOS CORREDORES DE PORTO SEGURO - TRAMITA CON NOSOTROS TU GARANTIA EN 48HS. GARANTIAS: ANDA o CGN."
      )
    ).toEqual(["anda", "contaduria"]);
  });

  it("pero conserva la lista propia del aviso que ademas se publicita", () => {
    expect(
      guaranteesFromText("Somos corredores de seguros. Garantías: Aseguradoras, ANDA.")
    ).toEqual(["anda", "aseguradora"]);
  });

  // (a) solo despues del sustantivo, (b) misma oracion, (c) sin negacion pegada.
  it("no toma por deposito en garantia un galpon que quedo en la ventana", () => {
    expect(
      guaranteesFromText("Garantías: Anda o Porto. Ideal para empresas, depósitos y logística.")
    ).toEqual(["anda", "aseguradora"]);
    expect(guaranteesFromText("habitación depósito amplia. GARANTÍAS: ASEGURADORAS")).toEqual([
      "aseguradora",
    ]);
  });

  it("respeta una negacion pegada al deposito", () => {
    expect(guaranteesFromText("Garantía: Seguros. No depósito.")).toEqual(["aseguradora"]);
  });

  // La negacion se ancla en el token del TIPO, nunca en "garantia": hay avisos que dicen
  // "Gastos Comunes: NO TIENE. GARANTIAS: ANDA o CGN".
  it("un 'no tiene' de los gastos comunes no borra las garantias", () => {
    expect(guaranteesFromText("Gastos Comunes: NO TIENE. GARANTIAS: ANDA o CGN")).toEqual([
      "anda",
      "contaduria",
    ]);
  });
});

// El campo dedicado de InfoCasas. Dije que venia SIEMPRE null midiendo 126 avisos; con muestras
// mas grandes viene cargado en 4,4 % y 9,8 %. Es texto libre pero es SOLO la frase de garantia,
// asi que se lee entero, sin anclar en el sustantivo.
describe("el campo `guarantee` de InfoCasas", () => {
  it("lee una lista suelta, sin la palabra garantia", () => {
    expect(guaranteesFromField("ANDA , PORTO SEGURO, FIDECIU O SURA.")).toEqual([
      "anda",
      "aseguradora",
    ]);
    expect(guaranteesFromField("ANDA, CONTADURÍA , SEGUROS")).toEqual([
      "anda",
      "contaduria",
      "aseguradora",
    ]);
    expect(guaranteesFromField("POLIZA DE SEGUROS")).toEqual(["aseguradora"]);
  });

  it('entiende "Se Evalúan" como que la garantia se conversa', () => {
    expect(guaranteesFromField("Se Evalúan")).toEqual(["aConvenir"]);
  });

  it("vacio cuando el campo no viene", () => {
    expect(guaranteesFromField(null)).toEqual([]);
    expect(guaranteesFromField("")).toEqual([]);
  });
});

// El caso de inversion que la revision encontro publicandose: el aviso 194204182 dice
// "Garantias; Anda, Contaduria, Seguros. No deposito." y se le estaba poniendo la etiqueta
// `deposito`. Lo ataja la regla de MISMA ORACION, no la de negacion: el "No deposito" vive en
// una oracion aparte.
describe("las negaciones reales que aparecieron en produccion", () => {
  it("no publica deposito cuando el aviso lo rechaza en la oracion siguiente", () => {
    expect(
      guaranteesFromText("Garantías; Anda, Contaduría, Seguros. No depósito. Compartimos con colegas.")
    ).toEqual(["anda", "contaduria", "aseguradora"]);
  });

  // "Garantías: Aseguradoras, no propiedades" rechaza la garantia propietaria. Hoy no dispara
  // porque el patron exige "garantia propietaria" o "fiador", y `propietaria` ni siquiera se
  // publica — pero es la trampa que se activa el dia que alguien la encienda.
  it("no inventa una garantia propietaria donde el aviso la rechaza", () => {
    expect(guaranteesFromText("Garantías: Aseguradoras, no propiedades")).toEqual(["aseguradora"]);
  });

  // Aseguradoras uruguayas que la taxonomia no tenia y aparecen en las listas reales.
  it("reconoce las aseguradoras que faltaban", () => {
    for (const nombre of ["Surco", "SBI", "Sancor", "Fideciu"]) {
      expect(guaranteesFromText(`Garantías: ${nombre}`), nombre).toContain("aseguradora");
    }
  });
});

// Los lectores del directorio de emprendimientos contra la forma REAL de lo que reciben (perfil de
// Instagram sin sesión, Uruguay Emprendedor, comentarios de Reddit), sin red.
import { describe, expect, it } from "vitest";
import { handleFromInstagramUrl, hasWhatsapp, instagramLinksIn, mentionsIn, normalizeHandle, ownWebsite, unwrapInstagramLink } from "../../classes/emprendimientos/handles";
import { altDate, gridPosts, parseProfile } from "../../classes/emprendimientos/instagram";
import { handlesFromComment, handlesFromPost } from "../../classes/emprendimientos/sources/reddit";
import { decodeHtml, parseUeDetail, parseUeList, ueLastPage } from "../../classes/emprendimientos/sources/uruguayEmprendedor";
import { MISSING_HTML, OE, profileHtml, WALL_HTML } from "./fixtures";

const AT = "2026-11-23T19:00:00.000Z";

describe("handles", () => {
  it("normaliza y descarta lo que no puede ser una cuenta", () => {
    expect(normalizeHandle("@Mondo.Popup")).toBe("mondo.popup");
    expect(normalizeHandle("rito__uy")).toBe("rito__uy");
    expect(normalizeHandle("p")).toBeNull();
    expect(normalizeHandle("explore")).toBeNull();
    expect(normalizeHandle("cuenta.")).toBeNull();
    expect(normalizeHandle("12345")).toBeNull();
    expect(normalizeHandle("a".repeat(31))).toBeNull();
  });

  it("lee la cuenta de una URL de Instagram y nunca una ruta de post", () => {
    expect(handleFromInstagramUrl("https://instagram.com/mondo.popup")).toBe("mondo.popup");
    expect(handleFromInstagramUrl("https://www.instagram.com/gildedlayer?igsh=MWExaHc1&utm_source=qr")).toBe("gildedlayer");
    expect(handleFromInstagramUrl("https://www.instagram.com/p/Cq3_4YoJxTf/")).toBeNull();
    expect(handleFromInstagramUrl("https://www.instagram.com/reel/DgAcxWmG7ND/")).toBeNull();
  });

  it("saca las cuentas de un comentario de Reddit, con el guion bajo escapado de markdown", () => {
    const body = "[https://www.instagram.com/vapo\\_\\_herbs/](https://www.instagram.com/vapo__herbs/) [www.vapoherbs.com.uy](http://www.vapoherbs.com.uy)";
    expect(instagramLinksIn(body)).toEqual(["vapo__herbs"]);
  });

  it("una @mención no es un correo ni un dominio", () => {
    expect(mentionsIn("Tienda online de @anina606 💕 escribinos a hola@tienda.com o @tienda.com.uy")).toEqual(["anina606"]);
    expect(mentionsIn("Proyecto @manos.veneguayas.")).toEqual(["manos.veneguayas"]);
  });

  it("desenvuelve l.instagram.com y distingue un sitio propio de una red o un agregador", () => {
    expect(unwrapInstagramLink("https://l.instagram.com/?u=https%3A%2F%2Fmondopopup.com%2F&e=AUD")).toBe("https://mondopopup.com/");
    expect(ownWebsite(["https://wa.me/59899123456", "https://linktr.ee/x", "https://www.mondopopup.com/tienda"])).toBe("mondopopup.com");
    expect(ownWebsite(["https://wa.me/59899123456", "https://www.instagram.com/x"])).toBeNull();
    expect(hasWhatsapp(["https://wa.me/59899123456"], "")).toBe(true);
    expect(hasWhatsapp([], "Pedidos por WhatsApp")).toBe(true);
    expect(hasWhatsapp([], "Pedidos por mensaje")).toBe(false);
  });
});

describe("perfil de Instagram", () => {
  it("lee el nodo del usuario y la grilla, con el dueño de cada post y su fecha", () => {
    const html = profileHtml({
      handle: "mondo.popup",
      posts: [
        { code: "Cq3_4YoJxTf", alt: "Photo by Arquitectura en Pop-up on April 10, 2023." },
        { code: "ChFzLsep1fl", owner: "peatonaltours", alt: "Photo by Peatonal Tours on August 10, 2022." },
        { code: "DgAcxWmG7ND", alt: "Video by Arquitectura en Pop-up on November 21, 2026. Puede ser una imagen de oso, galleta de jengibre y texto.", reel: true },
      ],
    });
    const read = parseProfile(html, "mondo.popup", "https://www.instagram.com/mondo.popup/", AT);
    expect(read.status).toBe("ok");
    expect(read.fullName).toBe("Arquitectura en Pop-up");
    expect(read.biography).toContain("Ingeniería en Papel");
    expect(read.followers).toBe(8414);
    expect(read.links).toEqual(["https://mondopopup.com/"]);
    expect(read.profilePic).toContain(`oe=${OE}`);
    expect(read.posts.map(p => [p.code, p.owner, p.date, p.reel])).toEqual([
      ["Cq3_4YoJxTf", "mondo.popup", "2023-04-10", false],
      ["ChFzLsep1fl", "peatonaltours", "2022-08-10", false],
      ["DgAcxWmG7ND", "mondo.popup", "2026-11-21", true],
    ]);
    // Las entidades del HTML se decodifican: la URL firmada tiene que funcionar tal cual.
    expect(read.posts[0]!.image).not.toContain("&amp;");
    expect(read.posts[2]!.alt).toBe("Puede ser una imagen de oso, galleta de jengibre y texto.");
  });

  it("una cuenta privada no trae grilla ni bio", () => {
    const read = parseProfile(profileHtml({ handle: "x.uy", isPrivate: true, posts: [{ code: "AAAAAAAAAA1", alt: "" }] }), "x.uy", "https://www.instagram.com/x.uy/", AT);
    expect(read.status).toBe("private");
    expect(read.posts).toEqual([]);
    expect(read.biography).toBe("");
  });

  it("'no existe' sólo si la página lo dice; un muro sin texto es 'no se pudo leer'", () => {
    expect(parseProfile(MISSING_HTML, "nadie_zz9", "https://www.instagram.com/nadie_zz9/", AT).status).toBe("missing");
    expect(parseProfile(WALL_HTML, "nadie_zz9", "https://www.instagram.com/nadie_zz9/", AT).status).toBe("unreadable");
    expect(parseProfile(profileHtml({ handle: "luperouy" }), "luperouy", "https://www.instagram.com/accounts/login/?next=%2Fluperouy%2F", AT).status).toBe("unreadable");
  });

  it("el nodo de OTRA cuenta en la página no se toma por el del perfil pedido", () => {
    const read = parseProfile(profileHtml({ handle: "otra.cuenta" }), "luperouy", "https://www.instagram.com/luperouy/", AT);
    expect(read.status).toBe("unreadable");
  });

  it("fechas del alt en inglés y en castellano", () => {
    expect(altDate("Photo by X on February 23, 2024.").date).toBe("2024-02-23");
    expect(altDate("Foto de X el 3 de setiembre de 2026. Puede ser una imagen de texto.")).toEqual({ date: "2026-09-03", rest: "Puede ser una imagen de texto." });
    expect(altDate("Foto del perfil de x").date).toBeNull();
  });

  it("la grilla corta en 12 y no repite un código", () => {
    const posts = Array.from({ length: 14 }, (_, i) => ({ code: `CODE${String(i).padStart(7, "0")}`, alt: "Photo by X on May 1, 2026." }));
    posts.push({ code: "CODE0000000", alt: "Photo by X on May 1, 2026." });
    expect(gridPosts(profileHtml({ handle: "x.uy", posts }))).toHaveLength(12);
  });
});

describe("Uruguay Emprendedor", () => {
  const LIST = `
    <div class=" col-md-8 col-xs-12 "><div class="pv-10">
      <a href="https://www.uruguayemprendedor.uy/emprendimiento/kamut-masa-madre/">
        <h4 class="no-margin card-title">
          <b>Kamut Masa Madre</b>
        </h4>
      </a>
    </div></div>
    <a href="https://www.uruguayemprendedor.uy/emprendimiento/ohmydog/"><h4 class="no-margin card-title"><b>Ohmydog</b></h4></a>
    <a href="/emprendimientos/montevideo/?pag=2">2</a><a href="/emprendimientos/montevideo/?pag=33">33</a>`;

  it("lee las fichas del listado con el departamento de la URL recorrida y la última página", () => {
    expect(parseUeList(LIST, "montevideo")).toEqual([
      { slug: "kamut-masa-madre", name: "Kamut Masa Madre", departamento: "montevideo" },
      { slug: "ohmydog", name: "Ohmydog", departamento: "montevideo" },
    ]);
    expect(ueLastPage(LIST)).toBe(33);
    expect(ueLastPage("<p>sin paginador</p>")).toBe(1);
  });

  it("toma el Instagram del emprendimiento, nunca el del propio sitio, y la descripción", () => {
    const html = `
      <li><a itemprop="url" href="https://www.uruguayemprendedor.uy/emprendimiento/mondo-pop-up/" class="ml-10 gris-txt">
        <span itemprop="title">Mondo Pop-up</span></a>
      </li>
      </ul>
      <a href="https://www.instagram.com/uruguayemprendedor/">IG del sitio</a>
      <div><img src="x.svg"> 092531320</div>
      <a href="https://instagram.com/mondo.popup" target="_blank">Instagram</a>
      <p>INFORMACIÓN: Mondo Pop-up nace con el objetivo de crear objetos en papel que sorprendan.</p>`;
    const detail = parseUeDetail(html, "mondo-pop-up");
    expect(detail.handle).toBe("mondo.popup");
    expect(detail.text).toMatch(/^INFORMACIÓN: Mondo Pop-up nace/);
  });

  it("también entiende el handle metido en el campo del sitio web", () => {
    expect(parseUeDetail(`<a href="http://@kamut.masamadre" target="_blank">visitar</a>`, "kamut").handle).toBe("kamut.masamadre");
  });

  it("decodifica por los bytes: el servidor dice UTF-8 y manda Latin-1", () => {
    const latin1 = Uint8Array.from([0x49, 0x4e, 0x46, 0x4f, 0x52, 0x4d, 0x41, 0x43, 0x49, 0xd3, 0x4e]); // "INFORMACIÓN"
    expect(decodeHtml(latin1)).toBe("INFORMACIÓN");
    expect(decodeHtml(new TextEncoder().encode("INFORMACIÓN"))).toBe("INFORMACIÓN");
  });
});

describe("Reddit", () => {
  it("de un comentario toma enlaces y, si habla de Instagram, @menciones", () => {
    expect(handlesFromComment({ body: "Yo tengo un emprendimiento de tejidos. Es @luperouy en IG por si les interesa!" })).toEqual(["luperouy"]);
    expect(handlesFromComment({ body: "Coincido con @fulano, el gobierno debería…" })).toEqual([]);
    expect(handlesFromComment({ body: "https://www.instagram.com/alter.creaciones Accesorios en porcelana fria" })).toEqual(["alter.creaciones"]);
  });

  it("de un post toma el enlace del texto", () => {
    expect(handlesFromPost({ title: "EMPRENDIMIENTO", selftext: "Instagram :https://www.instagram.com/capaacapa.uy?avpt=MWl1", url: "" })).toEqual(["capaacapa.uy"]);
  });
});

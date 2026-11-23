// HTML con la forma REAL de un perfil de Instagram sin sesión (medido el 23/11/2026 sobre
// @mondo.popup y @queimpresion3d.uy desde el VPS), reducido a lo que el lector usa: el JSON embebido
// del usuario y la grilla dibujada. Las URLs de las fotos llevan un `oe=` de verdad (hexadecimal).
import type { ProfilePost, ProfileRead } from "../../classes/emprendimientos/types";

export const OE = "6B0A4896"; // 2026-11-28T03:20:54Z
export const cdn = (name: string): string =>
  `https://scontent-eze1-1.cdninstagram.com/v/t51.82787-15/${name}_n.jpg?stp=dst-jpg_e35_s640x640_tt6&amp;_nc_cat=108&amp;ccb=7-5&amp;oh=00_AQ&amp;oe=${OE}`;

export interface FakeProfile {
  handle: string;
  fullName?: string;
  biography?: string;
  followers?: number;
  isPrivate?: boolean;
  links?: string[];
  posts?: { owner?: string; code: string; alt: string; reel?: boolean }[];
}

export function profileHtml(p: FakeProfile): string {
  const user = {
    pk: "15052238675",
    username: p.handle,
    full_name: p.fullName ?? "Arquitectura en Pop-up",
    biography: p.biography ?? "Mondo Pop-up\n🙌🏽  Regalos que asombran\n📐  Ingeniería en Papel\n🇺🇾  Hecho con ☕️  y ❤️ en Uruguay",
    is_private: p.isPrivate ?? false,
    follower_count: p.followers ?? 8414,
    following_count: 3814,
    profile_pic_url: `https://scontent-eze1-1.cdninstagram.com/v/t51.2885-19/244124106_n.jpg?stp=dst-jpg_s150x150_tt6&oe=${OE}`,
    bio_links: (p.links ?? ["https://mondopopup.com/"]).map(url => ({
      image_url: "",
      link_type: "external",
      lynx_url: `https://l.instagram.com/?u=${encodeURIComponent(url)}&e=AUDbDXK80N18`,
    })),
  };
  const grid = (p.posts ?? []).map(post => {
    const owner = post.owner ?? p.handle;
    return `<a class="x1i10hfl _a6hd" href="/${owner}/${post.reel ? "reel" : "p"}/${post.code}/" role="link" tabindex="0"><div class="_aagu"><div style="padding-bottom:133.3%" class="_aagv"><img alt="${post.alt}" class="x5yr21d" crossorigin="anonymous" src="${cdn(post.code)}"></div></div></a>`;
  });
  return [
    `<html><head><title>${p.fullName ?? "Arquitectura en Pop-up"} (@${p.handle}) • Fotos y videos de Instagram</title></head><body>`,
    `<script type="application/json" data-sjs>${JSON.stringify({ require: [["ScheduledServerJS", "handle", null, [{ __bbox: { result: { data: { user } } } }]]] })}</script>`,
    `<script type="application/json">{"broken":</script>`,
    `<main>${grid.join("")}</main></body></html>`,
  ].join("");
}

export const MISSING_HTML = `<html><head><title>Instagram</title></head><body><span>Esta página no está disponible.</span><script type="application/json">{"x":1}</script></body></html>`;
export const WALL_HTML = `<html><head><title>Instagram</title></head><body><div>Iniciá sesión</div></body></html>`;

export const post = (over: Partial<ProfilePost> & { code: string }): ProfilePost => ({
  owner: "luperouy",
  reel: false,
  date: "2026-11-20",
  image: cdn(over.code).replace(/&amp;/g, "&"),
  alt: null,
  ...over,
});

export const profile = (over: Partial<ProfileRead> = {}): ProfileRead => ({
  status: "ok",
  handle: "luperouy",
  fullName: "Lupero | Tote bags personalizas",
  biography: "✨Tienda online de tote bags personalizadas\n✨ Hacé tu encargo por mensaje privado\n📍 Retiro o envío en Montevideo",
  links: [],
  followers: 1313,
  following: 200,
  profilePic: cdn("pic").replace(/&amp;/g, "&"),
  posts: [post({ code: "AAAAAAAAAA1" }), post({ code: "AAAAAAAAAA2", date: "2026-11-01" }), post({ code: "AAAAAAAAAA3", date: "2026-09-01" })],
  readAt: "2026-11-23T19:00:00.000Z",
  ...over,
});

# Directorios para listar el sitio — 2026-11-26

35 candidatos abiertos y revisados en vivo el 2026-11-26. **No se envió nada.** Estado por canal en
[`tracker.csv`](./tracker.csv) (17 filas nuevas y 10 corregidas ese día). Este archivo guarda lo que
el tracker no puede: el orden, los requisitos y por qué se descartó lo demás.

Leyenda de "enlace": *seguido* = el `<a>` de una ficha real no lleva `nofollow`/`ugc`/`sponsored`
(medido en el HTML; no garantiza crédito de ranking); *nofollow* = medido; *sin verificar* = detrás
de login o sin ficha que inspeccionar.

## Qué hacer primero

1. **Uruguay, enlaces seguidos (~15 min):** pedirle a AGESIC un lugar en el showcase de Aplicaciones
   del catálogo de datos abiertos (la vía funcionó con un showcase aceptado el 2026-07-21), y
   mandar los formularios de uruguayo.dev y Atlas Startup.
2. **PRs que puede hacer un agente:** rebasear public-apis #6498 (hoy en conflicto) en vez de abrir
   otro, PR aparte para su sección nueva *MCP Servers*, VoltAgent/awesome-agent-skills,
   public-apis-es y apd-core (apuntando a `/api/datos`, no a la portada).
3. **Con login del dueño:** Claude Connectors Directory (la palanca de descubrimiento más grande
   dentro de un asistente, sin cambios en las tools), reclamar la ficha vieja de mcpmarket, y los
   formularios gratis de mcp.directory y mcpservers.org.
4. **Directorios de consumo:** AlternativeTo y SaaSHub (verificar el producto para que el enlace salga
   seguido) y la cola gratis de CazaProducto, sin su badge.
5. **Casa propia:** LICENSE en la raíz del repo (lo exigen dos listas), publicar el paquete npm 0.3.0
   para que los espejos dejen de mostrar 7 tools, y sacar uno de los dos `<link rel="manifest">` que
   sirve la portada (`/manifest.json` y `/manifest.webmanifest`) antes de empaquetar la PWA.

## Candidatos, por prioridad

| Pri | Directorio | Alta | Grupo | Costo | Cuenta / CAPTCHA | Enlace | Por qué importa | ¿Ya está? | Quién | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P0 | AGESIC, showcase Aplicaciones | https://catalogodatos.gub.uy/showcase (pedido por correo a AGESIC) | UY | gratis | usuario gub.uy | seguido, en .gub.uy | Vitrina oficial de datos abiertos: 60 apps, la última del 2026-10-20 | no (API de CKAN) | dueño | La app tiene que reutilizar datasets del catálogo: el sitio usa horarios de la IM, el CSV de denuncias del MI y el SIPC |
| P0 | public-apis, entrada REST | https://github.com/public-apis/public-apis | API | gratis | GitHub | nofollow (espejo publicapis.lol seguido) | ~500k estrellas; mergean por tandas (8 fechas en noviembre) | no; #6498 abierto y en conflicto | agente | Rebasear o reemplazar #6498, no duplicar. Descripción fáctica |
| P0 | public-apis, sección MCP Servers | ídem | MCP | gratis | GitHub | ídem | Sección nueva, ~20 PRs de MCP mergeados | no | agente | PR aparte. La columna Install tiene que enlazar un listado vivo (Glama o el registro oficial); un 404 lo cierra |
| P0 | Claude Connectors Directory | https://claude.com/docs/connectors/building/submission | MCP | gratis (quien envía necesita plan pago de Claude) | login de Claude | seguido | Descubrimiento dentro de Claude; 1.226 conectores en su sitemap | no | dueño | Las 29 tools ya tienen título y read-only. Pide URL de docs, de privacidad (/privacidad da 200), contacto de soporte e ícono. La skill puede ir como plugin |
| P1 | uruguayo.dev | https://uruguayo.dev/ ("Sumar proyecto") | UY | gratis | URL + correo, honeypot, sin CAPTCHA | seguido | Directorio sólo uruguayo, 132 proyectos, categoría Fintech; chico | no | agente puede llenarlo | Regla: "tecnología uruguaya, con dominio propio" |
| P1 | Atlas Startup Uruguay | https://atlasstartup.uy/contacto?motivo=sumar-startup | UY | gratis | formulario, honeypot | seguido | El directorio de startups uruguayas más completo: 565 empresas | no | agente / dueño | Pide fundadores, año y fuentes. "Empresas de base tecnológica fundadas en Uruguay": un producto sin inversión queda en el borde |
| P1 | mcpmarket (reclamar) | https://mcpmarket.com/server/cambio-uruguay | MCP | gratis | GitHub | sin enlace al sitio | Dice tener 1M+ visitas/mes | **sí, pero viejo** | dueño | Indexó la raíz del repo y su enlace npm apunta al paquete `api`. Reclamar para corregir |
| P1 | mcp.directory | https://mcp.directory/submit | MCP | gratis | URL del repo, sin login | nofollow | 3.000+ servers, 9.291 skills | no (aunque dice importar el registro) | agente puede llenarlo | Mandar `tree/main/mcp`. La skill va por /submit-skill |
| P1 | mcpservers.org | https://mcpservers.org/submit | MCP | gratis (~2 semanas) | formulario | nofollow | Secciones Remote y Skills | no | agente puede llenarlo | El upgrade dofollow de USD 39 es un enlace pago: no |
| P1 | VoltAgent/awesome-agent-skills | https://github.com/VoltAgent/awesome-agent-skills | MCP | gratis | GitHub | nofollow | 37,5k estrellas; tanda mergeada el 2026-11-15 | no | agente | La regla de "repo muy nuevo" que lo frenó en septiembre ya no aplica: esa tanda incluyó un repo de octubre |
| P1 | Free Public APIs | https://www.freepublicapis.com/new | API | gratis | sin login en el HTML | seguido | 943 APIs testeadas a diario; lista DolarApi y ArgentinaDatos | no | agente / dueño | Prueba automática contra la URL de docs |
| P1 | API Tracker (Apideck) | https://apitracker.io/submit | API | gratis, sin backlink | formulario | seguido | Directorio de APIs y servidores MCP | no | dueño / navegador | Importa los datos desde la URL del repo |
| P1 | AlternativeTo | https://alternativeto.net/manage-item/ | consumo | gratis | cuenta + Cloudflare | botón principal seguido | Su etiqueta de conversión de monedas no tiene nada de LatAm | no | dueño + moderación | Como alternativa a XE / Wise |
| P1 | SaaSHub | https://www.saashub.com/submit | consumo | gratis | hCaptcha + verificación | seguido sólo verificado | Aceptó un nicho parecido (calculadoras gratis de sueldo del Reino Unido) | no | dueño | Sin verificar sale nofollow |
| P1 | ChatGPT app directory | https://developers.openai.com/apps-sdk/deploy/submission | MCP | sin costo indicado | verificación de identidad/empresa | sin verificar | Directorio dentro de ChatGPT | no | dueño | plugin.json, 5 casos que deben andar y 3 que no, video, privacidad y términos; nombre de ≤30 caracteres |
| P2 | CazaProducto | https://cazaproducto.com/productos/new | LatAm | gratis (cola de 60 días) | cuenta | `nofollow ugc` | "Product Hunt de LatAm": 500+ productos, 9.100 suscriptores | no | dueño | Dofollow sólo con su badge = intercambio de enlaces: tomar el nofollow |
| P2 | Uruguay Emprendedor | https://www.uruguayemprendedor.uy/login/ | UY | gratis | cuenta + reCAPTCHA | seguido | ~500 fichas, mayormente pymes | no (primera página) | dueño | El repo ya lo lee como fuente de emprendimientos |
| P2 | startupsuruguay.com | https://startupsuruguay.com/registrarse | UY | gratis | registro | seguido | Directorio de startups UY | no | dueño | Varias secciones en "SOON": mantenimiento dudoso |
| P2 | LopezDev7/public-apis-es | https://github.com/LopezDev7/public-apis-es | API | gratis | GitHub | nofollow | Catálogo de APIs en español; mergea PRs externos (2026-11-10) | no | agente | `data/apis.json` (Finanzas) y después `scripts/generate.mjs` |
| P2 | APIScout | https://apiscout.dev/submit | API | gratis | OAuth | seguido | Tiene una guía "best free currency exchange rate API 2026" | no | dueño | Pedir lugar en esa guía |
| P2 | Mixed Analytics, APIs sin clave | https://mixedanalytics.com/blog/list-actually-free-open-no-auth-needed-apis/ | API | gratis | comentario | sin verificar (comentarios nofollow) | Actualizada 2026-04-09; el autor contesta "Added!" | no | dueño | Sugerir un endpoint sin clave y la doc |
| P2 | awesome-public-datasets (apd-core) | https://github.com/awesomedata/apd-core | datos | gratis | GitHub | nofollow | ~80k estrellas la lista madre; merges diarios | no | agente | Un YAML en `core/Finance/` apuntando a `/api/datos` |
| P2 | awesome-uruguay-open-source | https://github.com/carlosplanchon/awesome-uruguay-open-source | UY | gratis | GitHub | nofollow | Encaje exacto, lista chica | no | agente | **Bloqueado:** pide licencia y la raíz del repo no tiene LICENSE |
| P2 | Cursor Directory | https://cursor.directory/plugins/new | MCP | gratis | login + chequeo de Vercel | seguido | 96k+ devs; ya lista un MCP de dólar argentino | no | dueño | `/mcp` ahora redirige a plugins |
| P2 | GitHub MCP Registry | https://github.com/mcp | MCP | gratis | nominación por correo | sin verificar | 973 servers | no | dueño | Curado hacia organizaciones grandes: pocas chances |
| P2 | Gemini CLI extensions | https://geminicli.com/docs/extensions/releasing/ | MCP | gratis, rastreo diario | topic + `gemini-extension.json` en la raíz | sin verificar | ~2.197 extensiones | no | agente | Necesita un repo chico aparte: la raíz del monorepo es la API |
| P2 | Goose extensions | https://github.com/aaif-goose/goose | MCP | gratis | PR a `documentation/static/servers.json` | sin verificar | 57 entradas: cada una se ve | no | agente | Acepta remotos. Merges lentos (último en julio) |
| P2 | Microsoft Store (PWABuilder) | https://storedeveloper.microsoft.com/ | PWA | gratis | cuenta MS + identidad | sin verificar | Búsqueda de la tienda de Windows | no | dueño | Antes, arreglar los dos manifests |
| P2 | Google Play (TWA) | https://play.google.com/console/signup | PWA | USD 25 una vez | 12 testers por 14 días en cuentas nuevas | sin verificar | "Dólar Uruguay" muestra que hay demanda | no | dueño | Misma PWA con PWABuilder |
| P3 | Expat.com, negocios | https://www.expat.com/en/business/add | expats | gratis | login | seguido | Sección Uruguay casi vacía | no | dueño | Sigue exigiendo dirección física |
| P3 | Product Hunt | https://www.producthunt.com/posts/new | consumo | gratis | cuenta | `ugc` | Grande pero global y en inglés | no | dueño | Un solo intento |
| P3 | Civic Tech Field Guide | https://civictech.guide/add/ | cívico | gratis | URL + correo | seguido | Directorio global de civic tech | no | agente puede llenarlo | Liderar con el libro de cortes de luz, cortes de OSE y SIPC, no con el dólar |
| P3 | ToolSDK MCP Registry | https://github.com/toolsdk-ai/toolsdk-mcp-registry | MCP | gratis | PR (un JSON) | sin verificar | Merges diarios | no | agente | Acepta remotos |
| P3 | directory.llmstxt.cloud | https://directory.llmstxt.cloud/submit | IA | gratis (1–3 meses) | formulario | mixto | Categoría Finance | no | agente puede llenarlo | El sitio ya sirve llms.txt y llms-full.txt |
| P3 | Wikidata | https://www.wikidata.org/wiki/Special:NewItem | entidad | gratis | cuenta | n/a | Ayuda a que buscadores y LLMs resuelvan el sitio como entidad | no | decisión del dueño | Riesgo alto de notabilidad sin fuentes independientes: esperar cobertura de prensa |

**Ya listado, sin acción:** LobeHub MCP (importado el 2026-11-20, todavía con 7 tools), SkillsMP,
LibHunt (enlace seguido), publicapis.dev (ya renderiza la entrada, `nofollow ugc`), el workspace de
Postman, Glama y el registro oficial MCP.

**Revisado y de poco valor (P3):** Postman (su equipo ya armó un workspace "Cambio Uruguay" que
enlaza sólo a GitHub), RapidAPI (choca con "sin clave"), n0shake/Public-APIs, API Finder, awelist,
Uneed, DevHunt (sólo herramientas de desarrollo), Peerlist, Indie Hackers, madewithvuejs, PWAStore,
skills.sh, llmstxt.site, directorio de servicios de Uruguay XXI (RUT + reCAPTCHA, orientado a
servicios al inversor).

## Descartados

- **Smithery:** sin vía de alta desde el 2026-10-31 (`/new` da 404).
- **Sólo pagos:** publicapis.io, publicapi.dev, BetaList, Microlaunch, Startup Stash, There's An AI
  For That; mcp.so sigue cobrando y PulseMCP sigue con las altas pausadas.
- **Intercambio de enlaces:** el plan gratis de Fazier exige un enlace desde la portada; SeekTool.ai y
  directorios parecidos de IA en español piden enlace recíproco (y el sitio no es una herramienta de IA).
- **Trabados:** marketplace MCP de Cline (sin altas desde marzo), llmstxthub (1.217 PRs esperando).
- **Muertos o cambiaron de rubro:** mcp.run, mcpindex.net, OpenTools; appsco.pe, pwa-directory,
  findpwa.
- **Spam o sin enlace real:** apilist.fun y any-api (`href="#"`), apislist.com.
- **Sin lista o sin merges externos:** el "Mapa Fintech" de la Cámara Uruguay Fintech es un estudio
  en PDF, no un directorio; Finnovista Fintech Radar no tiene edición Uruguay; finterlace.info no
  enlaza; GuiaTIC es colombiano replicado por país; Techs Uruguay no tiene alta; Lánzalo tiene 12
  proyectos; IonicaBizau/made-in-uruguay sin merge externo desde 2018; apis-gratis-es nunca mergeó
  un PR externo; awesome-fintech prohíbe la autopromoción; StartupBlink importa de Crunchbase.

## Correcciones al tracker hechas en esta pasada

- Mergeados que figuraban abiertos: dspinellis/awesome-rest-apis #26 (2026-09-23),
  MobinX/awesome-mcp-list #481 (2026-09-23), TensorBlock/awesome-mcp-servers #2587 (2026-09-22).
- Abiertos y ahora en conflicto: public-apis #6498 y punkpeye #9525.
- APIs.guru #3254 sin respuesta; el repo no recibe push desde el 2026-04-20.
- Smithery cerró las altas; Cursor Directory movió los MCP a plugins.

## Altas hechas el mismo día (con OK del dueño)

| Directorio | Qué se hizo | Estado |
|---|---|---|
| Free Public APIs | Su robot leyó el OpenAPI y probó 17 de 17 endpoints | **Publicado**: https://www.freepublicapis.com/cambio-uruguay-api |
| uruguayo.dev | Formulario (Fintech) | En revisión |
| mcp.directory | Servidor (`tree/main/mcp`) y skill `buscador-uruguay` | En revisión (prometen 24 h) |
| mcpservers.org | Plan gratis, remoto, con el nombre del registro | En revisión (~2 semanas) |
| API Tracker | Dos fichas, API y servidor MCP, verificadas por correo | En revisión editorial |
| Civic Tech Field Guide | `/datos-abiertos-uruguay`, marcado como proyecto propio | En cola |
| public-apis #6498 | Rehecho sobre `master`, ahora MERGEABLE | Espera que un mantenedor apruebe el CI |
| public-apis #9505 | Sección MCP Servers | Abierto, MERGEABLE |
| punkpeye #9525 | Rebaseado; badge de Glama agregado a `mcp/README.md` porque su CONTRIBUTING exige el backlink | Abierto, MERGEABLE |
| VoltAgent/awesome-agent-skills #1492 | La skill en Specialized Domains | Abierto |
| public-apis-es #11 | `data/apis.json` + README regenerado | Abierto |

Quedan para el dueño: Atlas Startup (pide nombres de fundadores), directory.llmstxt.cloud (Turnstile),
toolsdk (exige que la cuenta le dé estrella al repo; el JSON ya está en el fork), Goose (exige un issue
escrito por una persona), y todo lo que pide login (Claude Connectors, mcpmarket, AlternativeTo,
SaaSHub, CazaProducto, AGESIC). apd-core se descartó: su regla 1 rechaza lo que existe para traer
tráfico a un sitio.

// app/utils/localProjects.ts
// Catalogue of ways a person in Uruguay can invest in LOCAL Uruguayan projects and
// real-economy assets — crowdfunding, obligaciones negociables, fideicomisos, agro,
// energía/forestación, inmobiliario, startups and economía social — as a companion
// to the broader `investments.ts` guide. PURE data + helpers (no Vue/Nuxt) so the
// page and tests share one source of truth.
//
// Every fact was web-researched and then adversarially fact-checked; corrections
// from that verification pass are baked in (e.g. ON interest is IRPF reduced-rate,
// not exempt; the Bosques del Uruguay trustee is EF Asset Management AFISA, not
// República AFISA). Facts that could not be verified against a primary source are
// honestly flagged (`verified: false` and "no verificado" in the text) rather than
// guessed. One row is a CAUTION entry (`caution: true`) about the collapsed private
// cattle pools — included as a warning, NOT a recommendation.
// Not affiliated; informational, not investment advice.

export type LocalProjectCategory =
  | 'crowdfunding_financiero'
  | 'obligaciones_negociables'
  | 'fideicomisos'
  | 'agro'
  | 'energia_forestacion'
  | 'inmobiliario_local'
  | 'startups_venture'
  | 'economia_social'

export type LpRiskLevel = 'bajo' | 'medio' | 'alto' | 'variable'

export type LpRegulation = 'bcu' | 'exterior_regulado' | 'no_regulado'

export interface LocalProject {
  id: string
  name: string
  category: LocalProjectCategory
  riskLevel: LpRiskLevel
  /** Minimum entry ticket, or null when it depends on the issuance / not published. */
  minInvestment: { amount: number; currency: 'UYU' | 'USD' | 'UI' } | null
  regulation: LpRegulation
  regulationNote: string
  taxNote: string
  /** Short liquidity note (baja/media/alta + why). */
  liquidity: string
  /** Typical time horizon. */
  horizon: string
  website: string
  /** URL backing the facts on this row. */
  source: string
  note: string
  /** true when the core facts were confirmed against a primary/authoritative source. */
  verified: boolean
  /** true = cautionary/negative example, rendered as a warning rather than an option. */
  caution?: boolean
}

export const LOCAL_PROJECT_CATEGORIES: Readonly<Record<LocalProjectCategory, string>> =
  Object.freeze({
    crowdfunding_financiero: 'Crowdfunding / financiamiento colectivo',
    obligaciones_negociables: 'Obligaciones negociables (deuda de empresas)',
    fideicomisos: 'Fideicomisos financieros',
    energia_forestacion: 'Energía, infraestructura y forestación',
    agro: 'Agro y ganadería',
    inmobiliario_local: 'Inmobiliario local',
    startups_venture: 'Startups y capital emprendedor',
    economia_social: 'Economía social y cooperativas',
  })

export const LOCAL_PROJECTS: readonly LocalProject[] = Object.freeze([
  // ── Crowdfunding / financiamiento colectivo ─────────────────────────────────
  {
    id: 'crowder-crowdfunding',
    name: 'Crowder — Plataforma de Financiamiento Colectivo',
    category: 'crowdfunding_financiero',
    riskLevel: 'alto',
    minInvestment: null,
    regulation: 'bcu',
    regulationNote:
      'Supervisada por el BCU. Autorizada e inscripta en el Registro de Mercado de Valores bajo la Ley 19.820 (arts. 49-50) y la Circular BCU 2377 (28/12/2020). Fue la primera —y a la fecha principal— plataforma de crowdfunding habilitada en Uruguay.',
    taxNote:
      'Los valores emitidos son de oferta pública; su tratamiento en el IRPF depende del instrumento (interés a tasa reducida, o exención cuando la renta la distribuye un fideicomiso/fondo). No verificado caso a caso: consultá a un contador.',
    liquidity:
      'Baja — emisores pequeños, sin mercado secundario líquido; se mantiene hasta el vencimiento o la salida.',
    horizon: 'Corto a mediano (típicamente 1-4 años según la emisión).',
    website: 'https://www.crowder.uy',
    source: 'https://www.bcu.gub.uy/NOVA-BCU/Paginas/detalle.aspx?itm=9',
    note: 'Vía regulada para participar de forma colectiva en proyectos y empresas locales. La ley fija topes por inversor: 40.000 UI (~USD 4.500) por emisión y 120.000 UI (~USD 13.500) por plataforma; el ticket mínimo concreto depende de cada campaña.',
    verified: true,
  },
  // ── Obligaciones negociables ────────────────────────────────────────────────
  {
    id: 'on-corporativas-bvm',
    name: 'Obligaciones Negociables de empresas uruguayas (oferta pública)',
    category: 'obligaciones_negociables',
    riskLevel: 'medio',
    minInvestment: { amount: 1000, currency: 'USD' },
    regulation: 'bcu',
    regulationNote:
      'Emisores y ON inscriptos en el Registro de Mercado de Valores del BCU (Superintendencia de Servicios Financieros). Se colocan por oferta pública en la BVM y/o BEVSA; el inversor opera a través de un corredor de bolsa autorizado.',
    taxNote:
      'El interés cobrado directamente por una persona física residente NO está exento: tributa IRPF (rentas de capital mobiliario) a tasa reducida —0,5% en instrumentos en pesos a tasa fija a más de 3 años, 7% en moneda extranjera a más de 3 años por suscripción pública con cotización— o 12% general en los demás casos. La exención plena solo aplica a rentas distribuidas por fondos de inversión y fideicomisos financieros. Consultá a un contador.',
    liquidity:
      'Media — cotizan en BVM/BEVSA, pero el mercado secundario uruguayo es delgado; puede costar vender antes del vencimiento.',
    horizon: 'Mediano a largo (2 a 10+ años según la ON).',
    website: 'https://www.bvm.com.uy/operadores/emisores-de-obligaciones-negociables',
    source:
      'https://www.elobservador.com.uy/economia-y-empresas/bolsa-valores-dos-nuevas-emisiones-deuda-permiten-invertir-us-1000-n5998682',
    note: 'Renta fija de empresas uruguayas (por ejemplo, UTE emitió ON por ~USD 177M; hubo emisiones con mínimo desde USD 1.000). Es la forma más accesible y regulada de prestarle a la economía real local. El mínimo depende de cada emisión.',
    verified: true,
  },
  {
    id: 'on-pyme-simplificadas',
    name: 'ON PYME / emisiones simplificadas',
    category: 'obligaciones_negociables',
    riskLevel: 'alto',
    minInvestment: null,
    regulation: 'bcu',
    regulationNote:
      'Régimen simplificado de oferta pública del BCU (Circular 2405, 2022; usado por emisores como Ebital o Carrasco Nobile). Pueden llevar garantías adicionales (garantía real, fianza) o el respaldo de fondos de garantía locales como SiGa/ANDE o República AFISA. En Uruguay no existe la figura argentina/española de "Sociedad de Garantía Recíproca".',
    taxNote:
      'Igual que las ON de oferta pública: el interés tributa IRPF a tasa reducida (0,5%–7% según moneda y plazo), no exento. No verificado por emisión.',
    liquidity: 'Baja — emisiones chicas, casi sin mercado secundario.',
    horizon: 'Corto a mediano (1-5 años).',
    website: 'https://www.bvm.com.uy/operadores/emisores-de-obligaciones-negociables',
    source:
      'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Emisores_Valores_Oferta_Pub.aspx',
    note: 'Permite financiar a PYMEs uruguayas. Las garantías reducen —no eliminan— el riesgo de crédito. La existencia del régimen está verificada; los mínimos y las emisiones vigentes no fueron verificados en fuente primaria.',
    verified: false,
  },
  // ── Energía, infraestructura y forestación ──────────────────────────────────
  {
    id: 'bosques-del-uruguay-ff',
    name: "Fideicomiso Financiero Forestal 'Bosques del Uruguay'",
    category: 'energia_forestacion',
    riskLevel: 'medio',
    minInvestment: { amount: 10000, currency: 'UI' },
    regulation: 'bcu',
    regulationNote:
      'Fideicomiso financiero de oferta pública inscripto en el Registro de Mercado de Valores del BCU; fiduciario EF Asset Management AFISA (EFAM), programa estructurado por Ferrere. Emite Certificados de Participación (series BDU I a IV) colocados vía BEVSA/BVM.',
    taxNote:
      'Al ser valores de oferta pública distribuidos por un fideicomiso financiero, las rentas pueden gozar de exoneración de IRPF bajo el régimen general. No verificado por serie: consultá a un contador.',
    liquidity:
      'Baja — títulos de largo plazo ligados al ciclo forestal; mercado secundario muy limitado.',
    horizon: 'Largo (ciclo de plantación de eucalipto/pino, ~10+ años).',
    website: 'https://www.bosquesdeluruguay.com',
    source: 'https://www.bvm.com.uy/operadores/documentos/111',
    note: 'Vía regulada para exponerse a la forestación uruguaya, a diferencia de UPM o Montes del Plata (que NO son inversiones minoristas). El tramo minorista se reservó a pequeños ahorristas, con un mínimo de 10.000 UI.',
    verified: true,
  },
  {
    id: 'ff-infraestructura-energia',
    name: 'Fideicomisos financieros de infraestructura y energía (vial, renovables)',
    category: 'energia_forestacion',
    riskLevel: 'medio',
    minInvestment: null,
    regulation: 'bcu',
    regulationNote:
      'Fideicomisos financieros de oferta pública inscriptos en el BCU, colocados por BVM/BEVSA. Ejemplos: Fideicomiso Financiero Corporación Vial del Uruguay III (obra vial) y una emisión de infraestructura y energía estructurada por CMB Activa / NewF vía BEVSA.',
    taxNote:
      'Valores de oferta pública distribuidos por un fideicomiso financiero, con posible exoneración de IRPF sobre las rentas. No verificado por emisión.',
    liquidity:
      'Baja a media — cotizan, pero con secundario delgado; pensados para mantener a plazo.',
    horizon: 'Largo (plazos de proyecto, 5-20 años).',
    website: 'https://www.bvm.com.uy',
    source:
      'https://www.qm.com.uy/cmb-activa-y-newf-concretaron-primera-emision-de-fideicomiso-de-infraestructura-y-energia-a-traves-de-bevsa/',
    note: 'Permiten al inversor minorista financiar energía renovable e infraestructura local a través de un corredor de bolsa. La existencia de emisiones está verificada; las condiciones y la disponibilidad actual varían por emisión.',
    verified: true,
  },
  // ── Fideicomisos financieros (fiduciarios estatales) ────────────────────────
  {
    id: 'conafin-republica-afisa-trusts',
    name: 'Fideicomisos públicos (República AFISA / CONAFIN AFISA)',
    category: 'fideicomisos',
    riskLevel: 'medio',
    minInvestment: null,
    regulation: 'bcu',
    regulationNote:
      'República AFISA (100% del BROU) y CONAFIN AFISA (100% de la Corporación Nacional para el Desarrollo) son fiduciarias autorizadas por el BCU que administran fideicomisos financieros de oferta pública y privada.',
    taxNote:
      'Depende del vehículo; los tramos de oferta pública siguen el régimen de exoneración/tasa reducida de IRPF de los valores. No verificado por fideicomiso.',
    liquidity: 'Baja — según el subyacente; muchos son a plazo.',
    horizon: 'Variable (mediano a largo).',
    website: 'https://republicafisa.com.uy/',
    source: 'https://republicafisa.com.uy/',
    note: 'Son los dos fiduciarios estatales que estructuran buena parte de los fideicomisos de agro, forestación, energía e infraestructura del país. El minorista accede a los tramos de oferta pública a través de un corredor de bolsa.',
    verified: true,
  },
  // ── Agro y ganadería ────────────────────────────────────────────────────────
  {
    id: 'fideicomiso-ganadero-regulado',
    name: 'Fideicomisos ganaderos/agropecuarios de oferta pública (vía regulada)',
    category: 'agro',
    riskLevel: 'alto',
    minInvestment: null,
    regulation: 'bcu',
    regulationNote:
      'Los fideicomisos financieros ganaderos y agropecuarios de OFERTA PÚBLICA se inscriben en el Registro de Mercado de Valores del BCU (Leyes 17.703 y 18.627): esa es la vía regulada. Algunos bancos ofrecen además productos de "fideicomiso ganadero" con tratamiento propio (por ejemplo, BBVA).',
    taxNote:
      'Los tramos de oferta pública distribuidos por un fideicomiso financiero pueden gozar de exoneración de IRPF; los productos bancarios tienen tratamiento propio. No verificado por caso.',
    liquidity: 'Baja — atada al ciclo del ganado (1-3 años típicos), sin secundario.',
    horizon: 'Corto a mediano (1 a 3 años).',
    website:
      'https://www.bbva.com.uy/empresas/productos/financiacion/agro/fideicomiso-ganadero.html',
    source:
      'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Lista-de-requerimientos-detalle.aspx?itemid=Fiduciarios+Financieros+y+Profesionales',
    note: 'Forma regulada de exponerse a la ganadería uruguaya, en contraste con los pooles privados que colapsaron. Antes de invertir, verificá que la emisión concreta esté efectivamente inscripta en el Registro de Mercado de Valores del BCU.',
    verified: true,
  },
  {
    id: 'pooles-ganaderos-no-regulados',
    name: "Pooles ganaderos privados de 'renta fija sobre ganado' (CAUTELA)",
    category: 'agro',
    riskLevel: 'alto',
    minInvestment: { amount: 50000, currency: 'USD' },
    regulation: 'no_regulado',
    regulationNote:
      'NO supervisados por el BCU. Operaban como contratos privados de capitalización ganadera con "renta fija" (7-11% anual) sin ser valores de oferta pública ni tener fiscalización prudencial. Esa falta de supervisión fue central en los colapsos.',
    taxNote: 'Sin marco fiscal favorable de valores de oferta pública. No verificado.',
    liquidity:
      'Baja e ilusoria — la "liquidez" dependía de nuevos ingresos, patrón típico de esquema Ponzi.',
    horizon: 'Corto a mediano (1-3 años prometidos).',
    website: '',
    source:
      'https://ladiaria.com.uy/justicia/articulo/2025/4/conexion-ganadera-cronologia-de-una-estafa/',
    note: 'FILA DE ADVERTENCIA, no una recomendación. Conexión Ganadera colapsó en 2025 con un déficit patrimonial de ~USD 230-250M y unos 4.200 damnificados; también cayeron Grupo Larrarte y República Ganadera. Una rentabilidad "fija" sobre ganado sumada a la ausencia de registro ante el BCU son señales de alarma.',
    verified: true,
    caution: true,
  },
  // ── Inmobiliario local ──────────────────────────────────────────────────────
  {
    id: 'fideicomiso-inmobiliario-al-costo',
    name: 'Fideicomiso inmobiliario al costo / compra en pozo',
    category: 'inmobiliario_local',
    riskLevel: 'medio',
    minInvestment: null,
    regulation: 'no_regulado',
    regulationNote:
      'Habitualmente son fideicomisos PRIVADOS (no de oferta pública), por lo que NO están supervisados por el BCU como valores; se rigen por la Ley de Fideicomiso (17.703) y, en la modalidad al costo, por el Decreto 27/013. El acceso es directo con el desarrollador/fiduciario, no por bolsa.',
    taxNote:
      'En la construcción "al costo" el IRAE resulta prácticamente nulo (no hay utilidad gravada) y la participación de los inversores queda exonerada de Impuesto al Patrimonio (Decreto 27/013). Marco general verificado.',
    liquidity:
      'Baja — capital inmovilizado hasta terminar la obra; la salida es por venta de la unidad.',
    horizon: 'Mediano (obra de ~18-36 meses).',
    website: '',
    source: 'https://revista.aeu.org.uy/index.php/raeu/article/download/380/322/326',
    note: 'Coinversión inmobiliaria local clásica: se aportan los costos de construcción y se recibe la unidad. La ventaja fiscal es real, pero al ser un vehículo privado no hay un supervisor de valores; la diligencia recae en el inversor y cada proyecto es particular.',
    verified: true,
  },
  {
    id: 'crowdfunding-inmobiliario-status',
    name: 'Crowdfunding inmobiliario (estado incipiente en Uruguay)',
    category: 'inmobiliario_local',
    riskLevel: 'variable',
    minInvestment: { amount: 1000, currency: 'USD' },
    regulation: 'exterior_regulado',
    regulationNote:
      'No se verificó la existencia de una plataforma de crowdfunding inmobiliario DE INMUEBLES URUGUAYOS autorizada bajo la Ley 19.820. Las plataformas usadas por uruguayos (por ejemplo, UC Capital) canalizan inversión hacia inmuebles en EE.UU., no reguladas por el BCU.',
    taxNote:
      'Inversión en activos del exterior: tributa según el régimen de rentas de capital del exterior (modificado por la Ley de Presupuesto). No verificado en detalle.',
    liquidity: 'Baja — típica del real estate; depende de la plataforma.',
    horizon: 'Mediano a largo (3-7 años según el proyecto).',
    website: 'https://www.uccapital.lat/',
    source:
      'https://www.elobservador.com.uy/cafe-y-negocios/crowdfunding-inmobiliario-uruguayos-invierten-propiedades-estados-unidos-esta-modalidad-financiamiento-que-retornos-buscan-n5982042',
    note: 'Se incluye para ser honestos: el "crowdfunding inmobiliario" que usan los uruguayos apunta mayormente a inmuebles en EE.UU. Un crowdfunding regulado de proyectos inmobiliarios uruguayos bajo el BCU no está verificado a la fecha. El ticket de ~USD 1.000 corresponde a plataformas del exterior.',
    verified: false,
  },
  // ── Startups y capital emprendedor ──────────────────────────────────────────
  {
    id: 'inversores-angeles-startups',
    name: 'Redes de inversores ángeles / co-inversión en startups (ThalesLab, UIH)',
    category: 'startups_venture',
    riskLevel: 'alto',
    minInvestment: null,
    regulation: 'no_regulado',
    regulationNote:
      'Inversión directa en el capital de startups; NO es un valor de oferta pública ni está supervisada por el BCU. El programa Uruguay Innovation Hub (ANII) arma un registro de Organizaciones de Capital Emprendedor e Inversores Ángeles para co-invertir; ThalesLab suma su propia red de inversores.',
    taxNote:
      'Las ganancias por venta de participaciones tributan como rentas de capital/incrementos patrimoniales (IRPF) según el caso; sin régimen de exoneración de valores de oferta pública.',
    liquidity:
      'Muy baja — capital ilíquido hasta un exit (venta o ronda posterior), que puede no ocurrir.',
    horizon: 'Largo (5-10 años hasta un eventual exit).',
    website: 'https://thaleslab.com/',
    source:
      'https://www.anii.org.uy/apoyos/innovacion/375/uih-coinversion-en-startups-con-organizaciones-de-capital-emprendedor-e-inversores-angeles/',
    note: 'Acceso realista limitado: suele requerir perfil de inversor con capital y tolerancia a la pérdida total; el ticket lo fija cada deal. ANDE y ANII financian y aceleran startups, pero NO son vehículos para que un individuo invierta directamente.',
    verified: true,
  },
  // ── Economía social y cooperativas ──────────────────────────────────────────
  {
    id: 'cooperativas-ahorro-credito',
    name: 'Cooperativas de ahorro y crédito (FUCEREP, FUCAC/Verde) — hacerse socio',
    category: 'economia_social',
    riskLevel: 'medio',
    minInvestment: null,
    regulation: 'bcu',
    regulationNote:
      'FUCEREP es una Cooperativa de Intermediación Financiera supervisada por el BCU (puede recibir depósitos del público). FUCAC (marca Verde) está registrada y supervisada por la Superintendencia de Servicios Financieros del BCU, pero clasificada como Administradora de Crédito: NO recibe depósitos del público. El marco que distingue ambos tipos proviene de la Ley 18.407 (2008).',
    taxNote:
      'Los depósitos y la participación cooperativa tienen el tratamiento fiscal propio del régimen cooperativo/financiero. No verificado en detalle.',
    liquidity:
      'Media a alta para depósitos a la vista (en las que los reciben); el capital social del socio se reintegra según el estatuto al desvincularse.',
    horizon: 'Flexible (corto a largo).',
    website: 'https://www.fucerep.com.uy/',
    source:
      'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=7860',
    note: 'Opción de economía social y participación local: al asociarte integrás capital social y accedés a ahorro/crédito. Es participación en una institución local, no un instrumento de retorno especulativo.',
    verified: true,
  },
])

export const LOCAL_PROJECT_SOURCES: ReadonlyArray<{ label: string; url: string }> = Object.freeze([
  {
    label: 'BCU — Plataformas de Financiamiento Colectivo (Ley 19.820 / Circular 2377)',
    url: 'https://www.bcu.gub.uy/NOVA-BCU/Paginas/detalle.aspx?itm=9',
  },
  {
    label: 'BVM — Emisores de Obligaciones Negociables',
    url: 'https://www.bvm.com.uy/operadores/emisores-de-obligaciones-negociables',
  },
  {
    label: 'BCU — Emisores de valores de oferta pública (régimen simplificado)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Emisores_Valores_Oferta_Pub.aspx',
  },
  {
    label: 'DGI — IRPF, rendimientos de capital mobiliario',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario',
  },
  {
    label: 'Bosques del Uruguay — fideicomiso forestal de oferta pública',
    url: 'https://www.bosquesdeluruguay.com/',
  },
  {
    label: 'BVM — Documentos FF Forestal Bosques del Uruguay',
    url: 'https://www.bvm.com.uy/operadores/documentos/111',
  },
  {
    label: 'República AFISA — sitio oficial (fiduciario estatal)',
    url: 'https://republicafisa.com.uy/',
  },
  {
    label: 'la diaria — Conexión Ganadera: cronología de una estafa',
    url: 'https://ladiaria.com.uy/justicia/articulo/2025/4/conexion-ganadera-cronologia-de-una-estafa/',
  },
  {
    label: 'AEU — Fideicomiso inmobiliario al costo (Decreto 27/013)',
    url: 'https://revista.aeu.org.uy/index.php/raeu/article/download/380/322/326',
  },
  {
    label: 'ANII — Uruguay Innovation Hub: co-inversión en startups',
    url: 'https://www.anii.org.uy/apoyos/innovacion/375/uih-coinversion-en-startups-con-organizaciones-de-capital-emprendedor-e-inversores-angeles/',
  },
  {
    label: 'BCU — Ficha institución FUCAC/Verde (supervisión SSF)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=7860',
  },
])

export function lpRiskLabel(risk: LpRiskLevel): string {
  const labels: Record<LpRiskLevel, string> = {
    bajo: 'Bajo',
    medio: 'Medio',
    alto: 'Alto',
    variable: 'Variable',
  }
  return labels[risk]
}

export function lpRegulationBadge(regulation: LpRegulation): string {
  if (regulation === 'bcu') return 'BCU'
  if (regulation === 'exterior_regulado') return 'Exterior'
  return 'No regulado'
}

/** A minimum-investment cell: `US$ 1.000`, `UI 10.000`, or `Según la emisión` when null. */
export function lpMinInvestmentLabel(p: LocalProject): string {
  if (p.minInvestment == null) return 'Según la emisión'
  const { amount, currency } = p.minInvestment
  const prefix = currency === 'USD' ? 'US$ ' : currency === 'UI' ? 'UI ' : '$ '
  return `${prefix}${amount.toLocaleString('es-UY', { maximumFractionDigits: 0 })}`
}

/** Local projects grouped by category, in {@link LOCAL_PROJECT_CATEGORIES} order. */
export function localProjectsByCategory(): Array<{
  category: LocalProjectCategory
  label: string
  items: LocalProject[]
}> {
  return (Object.keys(LOCAL_PROJECT_CATEGORIES) as LocalProjectCategory[])
    .map(category => ({
      category,
      label: LOCAL_PROJECT_CATEGORIES[category],
      items: LOCAL_PROJECTS.filter(p => p.category === category),
    }))
    .filter(g => g.items.length > 0)
}

export function getLocalProject(id: string): LocalProject | undefined {
  return LOCAL_PROJECTS.find(p => p.id === id)
}

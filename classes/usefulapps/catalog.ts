// Las fichas de tienda de las apps de /apps-utiles-uruguay, para el job semanal
// `currency-useful-apps`. Es el espejo de app/utils/usefulAppsCatalog.ts (el job no puede importar
// app/ y el build del app no puede leer fuera de app/): la paridad la vigila
// app/tests/unit/usefulAppsCatalogParity.test.ts. Los desarrolladores esperados sirven para avisar
// si una ficha cambió de dueño.
export interface UsefulAppStoreIds {
  id: string;
  android?: string;
  ios?: string;
  androidDeveloper?: string;
  iosDeveloper?: string;
}

export const USEFUL_APP_STORE_IDS: readonly UsefulAppStoreIds[] = Object.freeze([
  {
    "id": "gub-uy",
    "android": "uy.gub.app.perfil.release",
    "ios": "1475303589",
    "androidDeveloper": "AGESIC",
    "iosDeveloper": "AGESIC"
  },
  {
    "id": "bps-personas",
    "android": "uy.gub.bps.movil.persona",
    "ios": "1511536614",
    "androidDeveloper": "Banco de Prevision Social",
    "iosDeveloper": "Banco de Previsión Social"
  },
  {
    "id": "tuid-antel",
    "android": "uy.com.antel.tuid",
    "ios": "1479861048",
    "androidDeveloper": "Antel",
    "iosDeveloper": "Antel"
  },
  {
    "id": "identidad-digital-abitab",
    "android": "uy.com.abitab.iddigital.prod",
    "ios": "6470038910",
    "androidDeveloper": "Abitab SA",
    "iosDeveloper": "Abitab"
  },
  {
    "id": "dgi",
    "android": "uy.gub.dgi.sd",
    "ios": "1633500680",
    "androidDeveloper": "Dirección General Impositiva",
    "iosDeveloper": "Dirección General Impositiva"
  },
  {
    "id": "bps-trabajo-domestico",
    "android": "uy.gub.bps.movil.trabajodomestico",
    "ios": "970647719",
    "androidDeveloper": "Banco de Prevision Social",
    "iosDeveloper": "Banco de Previsión Social"
  },
  {
    "id": "bps-empresas",
    "android": "uy.gub.bps.movil.empresa",
    "ios": "1037396844",
    "androidDeveloper": "Banco de Prevision Social",
    "iosDeveloper": "Banco de Previsión Social"
  },
  {
    "id": "caja-de-profesionales",
    "android": "uy.org.cjppu",
    "ios": "6744414830",
    "androidDeveloper": "CJPPU",
    "iosDeveloper": "CAJA DE JUBILACIONES Y PENSIONES DE PROFESIONALES UNIVERSITARIOS"
  },
  {
    "id": "poder-judicial-expedientes",
    "android": "uy.gub.poderjudicial.consultaspj",
    "ios": "1078652854",
    "androidDeveloper": "Poder Judicial de la Rep. Oriental del Uruguay",
    "iosDeveloper": "Poder Judicial"
  },
  {
    "id": "asse",
    "android": "com.k2bhealth.asseapp",
    "androidDeveloper": "ADMINISTRACION DE SERVICIOS DE SALUD DEL ESTADO"
  },
  {
    "id": "sanidad-militar",
    "android": "uy.gub.dnsffaa.pacientes",
    "ios": "1237175468",
    "androidDeveloper": "D.N.S.FF.AA.",
    "iosDeveloper": "Direccion Nacional de Sanidad de las Fuerzas Armadas"
  },
  {
    "id": "casmu",
    "android": "com.casmu.appmovil.sdcasmu",
    "ios": "1202344612",
    "androidDeveloper": "CASMU Mobile",
    "iosDeveloper": "CASMU INSTITUCION DE ASISTENCIA MEDICA PRIVADA DE PROFESIONALES SIN FINES DE LUCRO"
  },
  {
    "id": "asociacion-espanola",
    "android": "com.apraful.asesp",
    "ios": "1298541472",
    "androidDeveloper": "Asociación Española",
    "iosDeveloper": "ASOCIACION ESPANOLA PRIMERA DE SOCORROS MUTUOS"
  },
  {
    "id": "medica-uruguaya",
    "android": "com.apraful.mucam",
    "ios": "6448849805",
    "androidDeveloper": "Medica Uruguaya",
    "iosDeveloper": "Médica Uruguaya"
  },
  {
    "id": "hospital-britanico",
    "android": "com.hospitalbritanico.app",
    "ios": "1237372018",
    "androidDeveloper": "Hospital Británico",
    "iosDeveloper": "Hospital Británico"
  },
  {
    "id": "smi",
    "android": "com.apraful.smi",
    "ios": "1537838199",
    "androidDeveloper": "SMI - Servicio Médico Integral",
    "iosDeveloper": "SERVICIO MEDICO INTEGRAL"
  },
  {
    "id": "circulo-catolico",
    "android": "com.circulocatolico.appsocios",
    "ios": "6749153907",
    "androidDeveloper": "Circulo Católico del Uruguay Mutualista",
    "iosDeveloper": "GlobalHealth"
  },
  {
    "id": "cosem",
    "android": "uy.com.universal.portal.cosem",
    "ios": "1483804372",
    "androidDeveloper": "Universal Soluciones Tecnológicas",
    "iosDeveloper": "COSEM"
  },
  {
    "id": "hospital-evangelico",
    "android": "com.hevangelico",
    "ios": "6739711311",
    "androidDeveloper": "Hospital Evangélico",
    "iosDeveloper": "Hospital Evangélico"
  },
  {
    "id": "cudam",
    "android": "com.apraful.cudam",
    "ios": "1449613104",
    "androidDeveloper": "Cudam",
    "iosDeveloper": "CUDAM"
  },
  {
    "id": "medicina-personalizada",
    "android": "uy.com.universal.portal.mp",
    "ios": "1478290431",
    "androidDeveloper": "Universal Soluciones Tecnológicas",
    "iosDeveloper": "MP - Medicina Personalizada"
  },
  {
    "id": "summum",
    "android": "com.summum.videoconsulta",
    "ios": "1250969060",
    "androidDeveloper": "SUMMUM MEDICINA PRIVADA BIC S.A.",
    "iosDeveloper": "SUMMUM Medicina Privada BIC S.A."
  },
  {
    "id": "semm",
    "android": "uy.com.universal.portal.semm",
    "ios": "1460144549",
    "androidDeveloper": "SEMM-Emergencia Médico Móvil",
    "iosDeveloper": "SEMM"
  },
  {
    "id": "ucm",
    "android": "com.kubo.emi",
    "ios": "879593518",
    "androidDeveloper": "Grupo emi",
    "iosDeveloper": "Grupo emi"
  },
  {
    "id": "caamepa",
    "android": "com.caamapp.menu",
    "ios": "6450793815",
    "androidDeveloper": "CAAMEPA IAMPP",
    "iosDeveloper": "CENTRO DE ASISTENCIA DE LA AGRUPACION MEDICA DE PANDO (CAAMEPA-IAMPP)"
  },
  {
    "id": "comeca",
    "android": "com.apraful.comeca",
    "ios": "1486635190",
    "androidDeveloper": "Comeca",
    "iosDeveloper": "COMECA IAMPP"
  },
  {
    "id": "comepa",
    "android": "com.bundleid.comepa",
    "ios": "6748145451",
    "androidDeveloper": "devappscomepa",
    "iosDeveloper": "CORPORACION MEDICA DE PAYSANDU"
  },
  {
    "id": "cams",
    "android": "com.camsiampp.appgestion",
    "ios": "6744528529",
    "androidDeveloper": "Cams Iampp",
    "iosDeveloper": "CAMS INSTITUCION DE ASISTENCIA MEDICA PRIVADA DE PROFECIONALES"
  },
  {
    "id": "camoc",
    "android": "com.camoc.camoconline",
    "ios": "6476976763",
    "androidDeveloper": "CAMOC IAMPP",
    "iosDeveloper": "CAMOC IAMPP"
  },
  {
    "id": "comta",
    "android": "com.apraful.comta",
    "ios": "1588432727",
    "androidDeveloper": "COMTA IAMPP",
    "iosDeveloper": "COMTA IAMPP"
  },
  {
    "id": "camedur",
    "android": "com.apraful.camedur",
    "ios": "1441676003",
    "androidDeveloper": "Camedur",
    "iosDeveloper": "CAMEDUR IAMPP"
  },
  {
    "id": "crami",
    "android": "com.crami.prod",
    "ios": "6471597325",
    "androidDeveloper": "Bootia dev",
    "iosDeveloper": "CRAMI IAMPP"
  },
  {
    "id": "sanatorio-mautone",
    "android": "com.cualit.SanatorioMautone",
    "ios": "969659087",
    "androidDeveloper": "Sanatorio Mautone",
    "iosDeveloper": "SEMM Mautone"
  },
  {
    "id": "farmashop",
    "android": "com.farmashop",
    "ios": "1207365817",
    "androidDeveloper": "Farmashop",
    "iosDeveloper": "Coboe SA"
  },
  {
    "id": "san-roque",
    "android": "com.developer.sanroque",
    "ios": "6744969181",
    "androidDeveloper": "San Roque",
    "iosDeveloper": "Ta-Ta S.A."
  },
  {
    "id": "como-ir",
    "android": "uy.gub.imm.stm.mobile.comoir",
    "ios": "933271921",
    "androidDeveloper": "Intendencia de Montevideo",
    "iosDeveloper": "Montevideo DTI"
  },
  {
    "id": "stm-montevideo",
    "android": "com.matungos.stm.mvd",
    "ios": "938009980",
    "androidDeveloper": "Matungos",
    "iosDeveloper": "Gabriel Yordi"
  },
  {
    "id": "viatik",
    "android": "com.viatik.app",
    "ios": "1645625062",
    "androidDeveloper": "Viatik",
    "iosDeveloper": "VIATIK S.A.S."
  },
  {
    "id": "sucive",
    "android": "uy.gub.sucive.sucive",
    "ios": "6451324300",
    "androidDeveloper": "República AFISA",
    "iosDeveloper": "Sucive"
  },
  {
    "id": "telepeaje",
    "android": "com.telepeaje.AppTelepeaje",
    "ios": "1542994313",
    "androidDeveloper": "Telepeaje",
    "iosDeveloper": "CVU"
  },
  {
    "id": "uber",
    "android": "com.ubercab",
    "ios": "368677368",
    "androidDeveloper": "Uber Technologies, Inc.",
    "iosDeveloper": "Uber Technologies, Inc."
  },
  {
    "id": "cabify",
    "android": "com.cabify.rider",
    "ios": "476087442",
    "androidDeveloper": "Cabify Technology",
    "iosDeveloper": "Cabify"
  },
  {
    "id": "voy-en-taxi",
    "android": "info.voyentaxi",
    "ios": "939470696",
    "androidDeveloper": "Voy en Taxi",
    "iosDeveloper": "Fritz S.R.L."
  },
  {
    "id": "taxi-1919",
    "android": "com.celeritas.user",
    "ios": "6449197708",
    "androidDeveloper": "Taxi Celeritas S.A",
    "iosDeveloper": "Luis Santana"
  },
  {
    "id": "seguitubus",
    "android": "trescruces.com.seguitubus",
    "ios": "1562898602",
    "androidDeveloper": "Fritz Desarrollos",
    "iosDeveloper": "Fritz S.R.L."
  },
  {
    "id": "urubus",
    "android": "uy.urubus",
    "ios": "1190981999",
    "androidDeveloper": "URUBUS",
    "iosDeveloper": "ULULO S.R.L."
  },
  {
    "id": "cot",
    "android": "uy.com.cot.twa",
    "ios": "6745225611",
    "androidDeveloper": "COT S.A.",
    "iosDeveloper": "COT S.A."
  },
  {
    "id": "turil",
    "android": "uy.com.turil.twa",
    "ios": "6504415165",
    "androidDeveloper": "Turil S.A.",
    "iosDeveloper": "Turil S.A."
  },
  {
    "id": "t2parking",
    "android": "t2company.mobile.multiparking",
    "ios": "1202902323",
    "androidDeveloper": "T2Voice",
    "iosDeveloper": "TVoice TVoice"
  },
  {
    "id": "parking-centro-paysandu",
    "android": "com.imp_za_app_usuarios",
    "ios": "6444727289",
    "androidDeveloper": "Agencia de Desarrollo Paysandú",
    "iosDeveloper": "Fritz S.R.L."
  },
  {
    "id": "eparking-durazno",
    "android": "com.streampay.parking.eparking",
    "ios": "6760911988",
    "androidDeveloper": "StreamPay S.A.",
    "iosDeveloper": "StreamPay"
  },
  {
    "id": "estaciones-ancap",
    "android": "uy.com.ducsa.app",
    "ios": "1451236796",
    "androidDeveloper": "Distribuidora Uruguaya de Combustibles S.A.",
    "iosDeveloper": "DUCSA"
  },
  {
    "id": "ute-mueve",
    "android": "movilidad.ute.com.ute_movilidad_app",
    "ios": "1463591379",
    "androidDeveloper": "UTE Sistemas",
    "iosDeveloper": "UTE"
  },
  {
    "id": "ebrou",
    "android": "uy.brou",
    "ios": "841015703",
    "androidDeveloper": "BROU",
    "iosDeveloper": "BROU"
  },
  {
    "id": "itau",
    "android": "com.uy.itau.appitauuypf",
    "ios": "1065572083",
    "androidDeveloper": "Banco Itaú Uruguay S.A.",
    "iosDeveloper": "Banco Itaú Uruguay S.A."
  },
  {
    "id": "santander",
    "android": "uy.com.Santander",
    "ios": "938240853",
    "androidDeveloper": "Banco Santander Uruguay",
    "iosDeveloper": "Banco Santander Uruguay"
  },
  {
    "id": "bbva",
    "android": "com.bbva.glomo.uy",
    "ios": "1383614279",
    "androidDeveloper": "BBVA",
    "iosDeveloper": "BBVA"
  },
  {
    "id": "scotiabank",
    "android": "com.ingsw.scotiabankapp",
    "ios": "920063972",
    "androidDeveloper": "Scotiabank Uruguay",
    "iosDeveloper": "Scotiabank Uruguay S.A."
  },
  {
    "id": "btg-pactual",
    "android": "uy.com.hsbc.hsbcuruguay",
    "ios": "1497854802",
    "androidDeveloper": "Banco BTG Pactual Uruguay S.A.",
    "iosDeveloper": "HSBC Bank (Uruguay) S.A."
  },
  {
    "id": "heritage",
    "android": "com.heritageuy",
    "ios": "1547460662",
    "androidDeveloper": "Banque Heritage (Uruguay) S.A.",
    "iosDeveloper": "Banque Heritage Uruguay S.A."
  },
  {
    "id": "oca",
    "android": "uy.com.oca.ocatarjetas",
    "ios": "1450506124",
    "androidDeveloper": "OCA SA",
    "iosDeveloper": "OCA S.A."
  },
  {
    "id": "prex",
    "android": "air.Prex",
    "ios": "927400689",
    "androidDeveloper": "PREX HOLDING S.A.S.",
    "iosDeveloper": "Prex"
  },
  {
    "id": "mercado-pago",
    "android": "com.mercadopago.wallet",
    "ios": "925436649",
    "androidDeveloper": "Mercado Libre",
    "iosDeveloper": "MercadoLibre"
  },
  {
    "id": "midinero",
    "android": "com.midinero.mobile.myapp",
    "ios": "1263494371",
    "androidDeveloper": "redpagos",
    "iosDeveloper": "Redpagos"
  },
  {
    "id": "tuapp",
    "android": "uy.com.antel.bits",
    "ios": "955003522",
    "androidDeveloper": "Antel",
    "iosDeveloper": "Antel"
  },
  {
    "id": "creditel",
    "android": "uy.com.creditel.app",
    "ios": "1645397271",
    "androidDeveloper": "Creditel",
    "iosDeveloper": "Creditel"
  },
  {
    "id": "cabal",
    "android": "uy.com.cabal.app",
    "ios": "6450376067",
    "androidDeveloper": "Cabal Uruguay S.A.",
    "iosDeveloper": "Cabal"
  },
  {
    "id": "passcard",
    "android": "com.passcard.app",
    "ios": "6447255492",
    "androidDeveloper": "PassCard",
    "iosDeveloper": "PassCard"
  },
  {
    "id": "verde-fucac",
    "android": "com.verde",
    "ios": "1615062854",
    "androidDeveloper": "FUCAC",
    "iosDeveloper": "FUCAC"
  },
  {
    "id": "abitab",
    "android": "uy.com.abitab.app",
    "ios": "1111265951",
    "androidDeveloper": "Abitab SA",
    "iosDeveloper": "Abitab"
  },
  {
    "id": "miredpagos",
    "android": "com.miredpagos.myapp",
    "ios": "1270893460",
    "androidDeveloper": "redpagos",
    "iosDeveloper": "Redpagos"
  },
  {
    "id": "paganza",
    "android": "paganza.android",
    "ios": "566320731",
    "androidDeveloper": "Paganza",
    "iosDeveloper": "Paganza"
  },
  {
    "id": "bankos",
    "android": "com.anonymous.bankos",
    "ios": "6748040860",
    "androidDeveloper": "Remy Lheritier",
    "iosDeveloper": "Juan Pagola"
  },
  {
    "id": "ute",
    "android": "uy.com.ute.customers",
    "ios": "6472210207",
    "androidDeveloper": "UTE Sistemas",
    "iosDeveloper": "UTE"
  },
  {
    "id": "mi-antel",
    "android": "uy.com.antel.miantel",
    "ios": "1335768164",
    "androidDeveloper": "Antel",
    "iosDeveloper": "Antel"
  },
  {
    "id": "mi-tigo",
    "android": "com.movistar.mimovistar",
    "ios": "785193700",
    "androidDeveloper": "Millicom International Cellular S.A.",
    "iosDeveloper": "TELEFONICA MOVILES DEL URUGUAY S.A."
  },
  {
    "id": "mi-claro",
    "android": "uy.com.claro.android",
    "androidDeveloper": "Claro Uruguay"
  },
  {
    "id": "tcc-vivo",
    "android": "uy.com.tcc.tccvivo",
    "ios": "586433134",
    "androidDeveloper": "TCC Uruguay",
    "iosDeveloper": "TCC Uruguay"
  },
  {
    "id": "montecable",
    "android": "montecable.com",
    "ios": "1475532291",
    "androidDeveloper": "Montecable",
    "iosDeveloper": "MONTE CABLEVIDEO S.A."
  },
  {
    "id": "nuevo-siglo",
    "android": "com.nuevosiglo.app",
    "ios": "6740147412",
    "androidDeveloper": "Riselco S.A.",
    "iosDeveloper": "Nuevo Siglo"
  },
  {
    "id": "midirectv",
    "android": "ar.com.directvla.ecare",
    "ios": "1511725594",
    "androidDeveloper": "VRIO CORP.",
    "iosDeveloper": "DIRECTV Latin America"
  },
  {
    "id": "riogas",
    "android": "com.riogas.mobile",
    "ios": "992877131",
    "androidDeveloper": "Riogas S.A.",
    "iosDeveloper": "Riogas S.A."
  },
  {
    "id": "emergencia-911",
    "android": "com.minterior.emergencia911",
    "ios": "1190346513",
    "androidDeveloper": "Ministerio del Interior - Uruguay",
    "iosDeveloper": "Ministerio del Interior - Uruguay"
  },
  {
    "id": "cerca-desfibriladores",
    "android": "com.artech.cerca.mainapp",
    "ios": "1016069894",
    "androidDeveloper": "CHSCV - Programa CERCA",
    "iosDeveloper": "Comision Honoraria para la Salud Cardiovascular"
  },
  {
    "id": "inumet",
    "android": "uy.gub.meteorologia.inumet",
    "ios": "1435519346",
    "androidDeveloper": "Inumet",
    "iosDeveloper": "Inumet"
  },
  {
    "id": "sirec-canelones",
    "android": "com.imcanelones.emergencia",
    "ios": "1330001295",
    "androidDeveloper": "Desarrollo - A.T.I.C. - Intendencia de Canelones",
    "iosDeveloper": "Intendencia de Canelones"
  },
  {
    "id": "intendencia-de-montevideo",
    "android": "uy.gub.imm.mobile.mimvd",
    "ios": "1130550991",
    "androidDeveloper": "Intendencia de Montevideo",
    "iosDeveloper": "Montevideo DTI"
  },
  {
    "id": "canelones-digital",
    "android": "com.imcanelones.ciudadano",
    "ios": "1153096022",
    "androidDeveloper": "Desarrollo - A.T.I.C. - Intendencia de Canelones",
    "iosDeveloper": "Intendencia de Canelones"
  },
  {
    "id": "agua-y-playas-canelones",
    "android": "com.artech.monitoreoplayas.monitoreodeplayas",
    "ios": "6443508821",
    "androidDeveloper": "Desarrollo - A.T.I.C. - Intendencia de Canelones",
    "iosDeveloper": "Intendencia de Canelones"
  },
  {
    "id": "turismo-canelones",
    "android": "com.artech.altantidacostadeoro.turismo",
    "ios": "1131761418",
    "androidDeveloper": "Desarrollo - A.T.I.C. - Intendencia de Canelones",
    "iosDeveloper": "Intendencia de Canelones"
  },
  {
    "id": "info-playas-maldonado",
    "android": "com.maldonado.InfoPlayasMaldonado",
    "androidDeveloper": "TI Intendencia de Maldonado"
  },
  {
    "id": "gobierno-de-salto",
    "android": "uy.idesalto.app",
    "ios": "6753072964",
    "androidDeveloper": "Intendencia de Salto",
    "iosDeveloper": "Intendencia de Salto"
  },
  {
    "id": "guri-familia",
    "android": "guri.ceip.gurifamiliaapp",
    "ios": "1667885709",
    "androidDeveloper": "Dirección General de Educación Inicial y Primaria",
    "iosDeveloper": "DGEIP"
  },
  {
    "id": "anep-estudiantes",
    "android": "uy.edu.anep.apps.estudiantes",
    "ios": "6751427110",
    "androidDeveloper": "Aplicaciones móviles ANEP",
    "iosDeveloper": "DGEIP"
  },
  {
    "id": "crea-schoology",
    "android": "com.schoology.app",
    "ios": "411766326",
    "androidDeveloper": "PowerSchool Group LLC",
    "iosDeveloper": "PowerSchool Group LLC"
  },
  {
    "id": "biblioteca-pais",
    "android": "es.odilo.ceibal",
    "ios": "1318131122",
    "androidDeveloper": "Ceibal.",
    "iosDeveloper": "Plan Ceibal"
  },
  {
    "id": "mi-udelar",
    "android": "mi.udelar.project",
    "ios": "6448728901",
    "androidDeveloper": "Seciu",
    "iosDeveloper": "Servicio Central de Informática"
  },
  {
    "id": "bps-ibirapita",
    "android": "com.bps.programa_ibirapita",
    "ios": "6451455335",
    "androidDeveloper": "Banco de Prevision Social",
    "iosDeveloper": "Banco de Previsión Social"
  },
  {
    "id": "buscojobs",
    "android": "com.buscojobs.buscojobsapp",
    "ios": "1538525871",
    "androidDeveloper": "Buscojobs",
    "iosDeveloper": "Buscojobs"
  },
  {
    "id": "computrabajo",
    "android": "com.redarbor.computrabajo",
    "ios": "1093787284",
    "androidDeveloper": "DGNET LTD.",
    "iosDeveloper": "DGNET LTD."
  },
  {
    "id": "pedidosya",
    "android": "com.pedidosya",
    "ios": "490099807",
    "androidDeveloper": "PedidosYa S.A",
    "iosDeveloper": "Pedidos Ya S.A."
  },
  {
    "id": "mercado-libre",
    "android": "com.mercadolibre",
    "ios": "463624852",
    "androidDeveloper": "Mercado Libre",
    "iosDeveloper": "MercadoLibre"
  },
  {
    "id": "rappi",
    "android": "com.grability.rappi",
    "ios": "984044296",
    "androidDeveloper": "Rappi, Inc - Delivery",
    "iosDeveloper": "Rappi"
  },
  {
    "id": "tienda-inglesa",
    "android": "com.imasdev.tiendainglesa",
    "ios": "603235187",
    "androidDeveloper": "Tienda Inglesa",
    "iosDeveloper": "Tienda Inglesa"
  },
  {
    "id": "disco",
    "android": "com.disco.android.vtex",
    "ios": "1477508185",
    "androidDeveloper": "Grupo Disco Uruguay GDU",
    "iosDeveloper": "Grupo Disco Uruguay S.A."
  },
  {
    "id": "devoto",
    "android": "com.imasdev.devoto",
    "ios": "1468333775",
    "androidDeveloper": "Grupo Disco Uruguay GDU",
    "iosDeveloper": "Grupo Disco Uruguay S.A."
  },
  {
    "id": "geant",
    "android": "com.geant.android.vtex",
    "ios": "1529363176",
    "androidDeveloper": "Grupo Disco Uruguay GDU",
    "iosDeveloper": "Grupo Disco Uruguay S.A."
  },
  {
    "id": "tata",
    "android": "com.tatauy.android.vtex",
    "ios": "1569682505",
    "androidDeveloper": "TA-TA S.A.",
    "iosDeveloper": "Ta-Ta S.A."
  },
  {
    "id": "el-dorado",
    "android": "com.scanntech.encasa.cliente.uy.dorado1",
    "ios": "1303960588",
    "androidDeveloper": "Scanntech",
    "iosDeveloper": "El Dorado"
  },
  {
    "id": "buen-provecho",
    "android": "com.buenprovecho",
    "ios": "1596658608",
    "androidDeveloper": "Buen Provecho!",
    "iosDeveloper": "Buen Provecho!"
  },
  {
    "id": "preciosgub",
    "android": "uy.com.bullseye.preciosgub",
    "androidDeveloper": "MEF - DGC"
  },
  {
    "id": "tiendamia",
    "android": "com.tiendamia.android",
    "ios": "1228896734",
    "androidDeveloper": "Tiendamia",
    "iosDeveloper": "TiendaMIA"
  },
  {
    "id": "gripper",
    "android": "com.codeshaped.gripper",
    "ios": "1155650795",
    "androidDeveloper": "Gripper",
    "iosDeveloper": "Gripper"
  },
  {
    "id": "antel-tv",
    "android": "uy.com.adinet.adinettv",
    "ios": "914038576",
    "androidDeveloper": "Antel",
    "iosDeveloper": "Antel"
  },
  {
    "id": "tickantel",
    "android": "uy.com.antel.tickantel",
    "ios": "1034445139",
    "androidDeveloper": "Antel",
    "iosDeveloper": "Antel"
  },
  {
    "id": "redtickets",
    "android": "com.redtickets.user.app",
    "ios": "6468820738",
    "androidDeveloper": "Shift Marketing Digital SRL",
    "iosDeveloper": "Redtickets"
  },
  {
    "id": "auf-tv",
    "android": "tv.auf",
    "ios": "1472435717",
    "androidDeveloper": "Poipes",
    "iosDeveloper": "Poipes"
  },
  {
    "id": "cinemateca",
    "android": "com.mascinemateca.app",
    "ios": "6738696955",
    "androidDeveloper": "Cinemateca Uruguaya",
    "iosDeveloper": "Cinemateca Uruguaya"
  }
]);

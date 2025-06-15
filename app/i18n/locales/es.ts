export default defineI18nLocale(async (locale) => {
  return {
    welcome:
      'Encuentra la mejor cotización en el mercado, comparando entre más de 40 casas de cambio.',
    title:
      'Cotizaciones del día [day]. Se actualizan cada 10 minutos con respecto a la información de la web.',
    info: 'Si la información del sitio te sirvió, puedes ayudar a mantenerlo o dejando tu reseña',
    wantToBuy: 'Quiero comprar',
    wantToSell: 'Quiero vender',
    currency: 'Moneda',
    departments: 'Departamentos',
    from: 'de',
    to: 'para',
    buy: 'comprar',
    sell: 'vender',
    loadDistances: 'distancias',
    loadDistancesTooltip:
      'Funciona de forma más precisa en celulares / tablets',
    hideInterBank: 'Ocultar cotizaciones interbancarias',
    hideConditional: 'Ocultar cotizaciones con condiciones',
    pagas: 'Pagas',
    recibes: 'Recibes',
    moneda: 'Moneda',
    casaDeCambio: 'Casa de Cambio',
    sitioWeb: 'Sitio Web',
    condicional: 'Condicional',
    compra: 'Compra',
    venta: 'Venta',
    distancia: 'Distancia',
    buscarSucursal: 'Sucursales',
    infoPrestamos: 'Préstamos',
    consulta:
      'Ante cualquier problema / consulta / propuesta enviar correo electrónico a ',
    disclaimer:
      'Este sitio fue creado únicamente con la intención de educar, no nos hacemos responsables por el mal uso de la información.',
    madeWith: 'Hecho con',
    por: 'por',
    and: 'y',
    codigo: 'Código',
    nombre: 'Nombre',
    departamento: 'Departamento',
    localidad: 'Localidad',
    direccion: 'Direccion',
    telefono: 'Teléfono/s',
    email: 'E-mail',
    horarios: 'Horarios',
    observaciones: 'Observaciones',
    bcu_regul: 'Regulado por BCU',
    bcu_regul_sub:
      'Esta entidad está regulada por el BCU (Banco Central del Uruguay)',
    razonSocial: 'Razón social',
    noData: 'No hay datos para mostrar, dar clic en el botón de Sitio Web.',
    cargando: 'Cargando',
    locationTooltip: 'Funciona de forma más precisa en celulares / tablets',
    confirmarUbicacion: 'Confirmar ubicación',
    cerrar: 'Cerrar',
    confirmar: 'Confirmar',
    prex_condition:
      'Requiere del uso de la tarjeta prex, debe ser solicitada en su sitio web.',
    ebrou_condition:
      'Requiere de cuenta web en el banco BROU, debe abrirse una caja de ahorro en dicho banco',
    join_twitter: 'Unete a nuestro twitter para mantenerte actualizado',
    no_mostrar_nuevo: 'No mostrar de nuevo',
    search_radius: 'Radio de búsquedad (Km)',
    join_linkedin: 'Siguenos en Linkedin',
    paying_with: 'Pagando con',
    buying_with: 'Comprando con',
    hideWidgets: 'Esconder widgets / chat',
    here: 'aquí',
    pay: 'Pagas en',
    get: 'Obtienes en',
    searchExchangeHouse: 'Buscar casa de cambio (ej: Itau, Varlix)',
    selectDate: 'Seleccionar fecha',
    resetDate: 'Restablecer a hoy',
    resetFilters: 'Restablecer todos los filtros',
    filtersReset: 'Filtros restablecidos exitosamente',
    noExchangeHousesFound: 'No se encontraron casas de cambio',
    noDataAvailable:
      'No hay datos de cotizaciones disponibles para la fecha seleccionada. Por favor, intente con una fecha diferente.',
    seoTitle: 'Mejores Cotizaciones de Cambio en Uruguay',
    seoDescription:
      'Encuentra las mejores cotizaciones de cambio en Uruguay. Compara precios de más de 40 casas de cambio para USD, ARS, BRL, EUR y más monedas.',
    seoKeywords:
      'cambio moneda Uruguay, cambio dólares Uruguay, cambio pesos Uruguay, casas de cambio Uruguay, cambio Montevideo, cambio Punta del Este',
    subtitle:
      'Compara cotizaciones de más de 40 casas de cambio en tiempo real',
    apiUsageMessage:
      '¿Interesados en usar esta API para su sitio web y tener un ratio de cambio acorde a algún banco en particular en tiempo real? Pueden comunicarse con nosotros en ',
    loadingApp: 'Iniciando aplicación...',
    loadingHistoricalData: 'Cargando datos históricos...',
    prexRequirement:
      'Se requiere la tarjeta prex y realizar el trámite por la aplicación',
    ebrouRequirement:
      'Se requiere una cuenta de EBROU, una caja de ahorro en dólares y realizar el cambio por la aplicación',
    consultCurrentQuotes:
      'Consulta las cotizaciones actuales de todas las casas de cambio de Uruguay. Compara precios y encuentra la mejor opción.',

    // Navigation and UI labels
    inicio: 'Inicio',
    historico: 'Histórico',
    donar: 'Donar',

    // Historical page specific texts
    historicoCotizaciones: 'Histórico de Cotizaciones',
    evolucionCotizaciones: 'Evolución de Cotizaciones',
    cargandoDatosHistoricos: 'Cargando datos históricos...',
    errorCargarDatos: 'Error al cargar los datos',
    reintentar: 'Reintentar',
    datosDetallados: 'Datos Detallados',
    buscarPorFecha: 'Buscar por fecha...',
    volverAlInicio: 'Volver al inicio',
    actualizado: 'Actualizado',

    // Statistics labels
    compraActual: 'Compra Actual',
    ventaActual: 'Venta Actual',
    promedioCompra: 'Promedio Compra',
    datosTotales: 'Datos Totales',
    cambio: 'Cambio',

    // Form labels
    monedaLabel: 'Moneda',
    tipoLabel: 'Tipo',
    buscarLabel: 'Buscar',
    fechaLabel: 'Fecha',

    // Period options
    tresMeses: '3 meses',
    seisMeses: '6 meses',
    doceMeses: '12 meses',
    veinticuatroMeses: '24 meses',

    // Status messages
    errorCargarCotizaciones: 'Error al cargar las cotizaciones',
    noEncontrada: 'no encontrada',

    // Footer text
    hechoConAmor: 'Hecho con',
    porText: 'por',
    yText: 'y',

    // Donation labels
    donarPaypal: 'Donar con Paypal',
    donarMercadoPago: 'Donar con Mercado Pago',
    accedeRapido: 'Accede más rápido desde tu pantalla de inicio',

    // Filter labels
    deshacerCargaDistancias: 'Deshacer carga distancias',
    casa: 'Casa',
    monedaBtn: 'Moneda',
    appStatus: 'Estado de la App',
    close: 'Cerrar',

    // Historical page translations
    historical: {
      currentQuotes: 'Cotizaciones Actuales',
      historicalQuotes: 'Cotizaciones Históricas',
      updated: 'Actualizado',
      loadingQuotes: 'Cargando cotizaciones...',
      exchangeHouse: 'Casa de Cambio',
      currency: 'Moneda',
      type: 'Tipo',
      search: 'Buscar',
      buy: 'Compra',
      sell: 'Venta',
      spread: 'Spread',
      name: 'Nombre',
      noDataAvailable: 'No hay datos disponibles',
      viewHistorical: 'Ver Histórico',
      selectPeriod: 'Seleccionar Período',
      last7Days: 'Últimos 7 Días',
      last30Days: 'Últimos 30 Días',
      last90Days: 'Últimos 90 Días',
      customRange: 'Rango Personalizado',
      from: 'Desde',
      to: 'Hasta',
      apply: 'Aplicar',
      reset: 'Restablecer',
      exportData: 'Exportar Datos',
      chartView: 'Vista de Gráfico',
      tableView: 'Vista de Tabla',
      date: 'Fecha',
      evolution: 'Evolución',
      trend: 'Tendencia',
      average: 'Promedio',
      minimum: 'Mínimo',
      maximum: 'Máximo',
      volatility: 'Volatilidad',
      noHistoricalData:
        'No hay datos históricos disponibles para el período seleccionado',
      errorLoadingData: 'Error al cargar datos históricos',
      retryLoad: 'Reintentar',
    },
    pwa: {
      retry: 'Reintentar',
      installTitle: 'Instalar Cambio Uruguay',
      installSubtitle: 'Accede más rápido desde tu pantalla de inicio',
      installDescription: 'Accede más rápido desde tu pantalla de inicio',
      install: 'Instalar',
      dismiss: 'Ahora no',
      updateAvailable: 'Actualización disponible',
      updateDescription: 'Una nueva versión está disponible',
      update: 'Actualizar',
      offline: 'Estás sin conexión',
      onlineAgain: 'Estás conectado nuevamente',
      noConnection:
        'Parece que no tienes conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.',
      offlineFeaturesAvailable:
        'Algunas funciones pueden estar disponibles sin conexión',
      stillOffline: 'Aún no hay conexión a internet',
      noConnectionCached: 'No hay conexión disponible y no hay datos en caché',
    },
    codes: {
      USD: 'Dólares estadounidenses',
      ARS: 'Pesos Argentinos',
      BRL: 'Reales Brasileños',
      EUR: 'Euros',
      GBP: 'Libras Esterlinas',
      XAU: 'Oro',
      UR: 'Unidades Reajustables',
      UP: 'Unidad Previsional',
      UI: 'Unidades Indexadas',
      PYG: 'Guaraníes Paraguayos',
      PEN: 'Soles Peruanos',
      MXP: 'Pesos Mexicanos',
      JPY: 'Yenes',
      CLP: 'Pesos Chilenos',
      CHF: 'Francos Suizos',
      CAD: 'Dólares Canadienses',
      AUD: 'Dólares Australianos',
      UYU: 'Pesos Uruguayos',
    },
    seo: {
      // Página principal
      homeTitle: 'Mejores Cotizaciones de Cambio en Uruguay',
      homeDescription:
        'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay. Compara precios de más de 40 casas de cambio en tiempo real.',
      homeKeywords:
        'cambio moneda uruguay, cambio divisas uruguay, donde comprar dólares uruguay, donde vender dólares uruguay, vender pesos argentinos uruguay, comprar pesos argentinos uruguay, casas de cambio uruguay, casas de cambio montevideo, casas de cambio punta del este',

      // Página histórico
      historicalTitle: 'Historial de Cotizaciones - Cambio Uruguay',
      historicalDescription:
        'Consulta el historial completo de cotizaciones de todas las casas de cambio en Uruguay. Datos actualizados en tiempo real.',
      historicalKeywords:
        'historial cotizaciones, cambio uruguay, histórico precios, casas cambio uruguay',

      // Página histórico por casa de cambio
      historicalOriginTitle: 'Cotizaciones de {origin} - Cambio Uruguay',
      historicalOriginDescription:
        'Consulta todas las cotizaciones actuales e históricas de {origin}. Precios de compra y venta actualizados en tiempo real.',
      historicalOriginKeywords:
        'cotizaciones casa cambio, cambio divisas uruguay, precios cambio uruguay',

      // Página histórico detallado
      historicalDetailTitle: 'Histórico {origin} - {currency} | Cambio Uruguay',
      historicalDetailDescription:
        'Evolución histórica de cotizaciones {currency} en {origin}. Gráficos, estadísticas y datos detallados de cambio de moneda en Uruguay.',
      historicalDetailKeywords:
        'histórico cotizaciones, evolución cambio, gráfico cotizaciones, estadísticas cambio uruguay',

      // Página offline
      offlineTitle: 'Sin Conexión - Cambio Uruguay',
      offlineDescription:
        'No hay conexión a internet. Verifica tu conexión para acceder a las cotizaciones de cambio.',
      offlineKeywords: 'sin conexión, offline, cambio uruguay',
    },
  }
})

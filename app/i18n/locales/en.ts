export default defineI18nLocale(async (locale) => {
  return {
    welcome:
      'Find the best exchange rate in the market, comparing between more than 40 exchange houses.',
    title:
      'Quotes of [day]. They are updated every 10 minutes with respect to the information on the web.',
    info: 'If you found the information on the site useful, you can help to maintain it or leaving your review ',
    wantToBuy: 'Want to buy',
    wantToSell: 'Want to sell',
    currency: 'Currency',
    departments: 'Departments',
    from: 'from',
    to: 'to',
    buy: 'buy',
    sell: 'sell',
    loadDistances: 'distances',
    loadDistancesTooltip:
      'Funciona de forma más precisa en celulares / tablets',
    hideInterBank: 'Hide interbank quotes',
    hideConditional: 'Hide quotes with conditions',
    pagas: 'Pay',
    recibes: 'Receive',
    moneda: 'Money',
    casaDeCambio: 'Exchange House',
    sitioWeb: 'Website',
    condicional: 'Conditional',
    compra: 'Buy',
    venta: 'Sell',
    distancia: 'Distance',
    buscarSucursal: 'Branches',
    infoPrestamos: 'Loan',
    consulta:
      'If you have any problem / question / proposal please send an email to ',
    disclaimer:
      'This site was created solely for the purpose of education, we are not responsible for the misuse of the information.',
    madeWith: 'Made with',
    por: 'by',
    and: 'and',
    codigo: 'Code',
    nombre: 'Name',
    departamento: 'Department',
    localidad: 'Town',
    direccion: 'Address',
    telefono: 'Telephone/s',
    email: 'E-mail',
    horarios: 'Schedules',
    observaciones: 'Observations',
    bcu_regul: 'Regulated by BCU',
    bcu_regul_sub: 'This entity is regulated by BCU (Central Bank of Uruguay)',
    razonSocial: 'Company name',
    noData: 'No data to display, click on the Website button.',
    cargando: 'Loading',
    locationTooltip: 'Works more accurately on cell phones / tablets',
    confirmarUbicacion: 'Confirm location',
    cerrar: 'Close',
    confirmar: 'Confirm',
    prex_condition:
      'Requires the use of the prex card, this must be requested on their website.',
    ebrou_condition:
      'Requires a web account at BROU bank, you must open a savings account at BROU bank.',
    join_twitter: 'Join our twitter to keep updated',
    no_mostrar_nuevo: "Don't show again",
    search_radius: 'Search radius (Km)',
    join_linkedin: 'Follow us in Linkedin',
    paying_with: 'Paying with',
    buying_with: 'Buying with',
    hideWidgets: 'Hide chat / widgets',
    here: 'here',
    pay: 'You pay',
    get: 'You get',
    searchExchangeHouse: 'Search exchange house (e.g., Itau, Varlix)',
    selectDate: 'Select date',
    resetDate: 'Reset to today',
    resetFilters: 'Reset all filters',
    filtersReset: 'Filters reset successfully',
    noExchangeHousesFound: 'No exchange houses found',
    noDataAvailable:
      'No exchange rate data available for the selected date. Please try a different date.',
    seoTitle: 'Best Currency Exchange Rates in Uruguay',
    seoDescription:
      'Find the best currency exchange rates in Uruguay. Compare prices from over 40 exchange houses for USD, ARS, BRL, EUR and more currencies.',
    seoKeywords:
      'currency exchange Uruguay, dollar exchange Uruguay, peso exchange Uruguay, exchange houses Uruguay, Montevideo exchange, Punta del Este exchange',
    subtitle: 'Compare rates from over 40 exchange houses in real-time',
    apiUsageMessage:
      'Interested in using this API for your website and having an exchange rate according to a particular bank in real time? Contact us at ',

    // Navigation and UI labels
    inicio: 'Home',
    historico: 'Historical',
    donar: 'Donate',

    // Historical page specific texts
    historicoCotizaciones: 'Historical Quotes',
    evolucionCotizaciones: 'Quote Evolution',
    cargandoDatosHistoricos: 'Loading historical data...',
    errorCargarDatos: 'Error loading data',
    reintentar: 'Retry',
    datosDetallados: 'Detailed Data',
    buscarPorFecha: 'Search by date...',
    volverAlInicio: 'Back to home',
    actualizado: 'Updated',

    // Statistics labels
    compraActual: 'Current Buy',
    ventaActual: 'Current Sell',
    promedioCompra: 'Buy Average',
    datosTotales: 'Total Data',
    cambio: 'Change',

    // Form labels
    monedaLabel: 'Currency',
    tipoLabel: 'Type',
    buscarLabel: 'Search',
    fechaLabel: 'Date',

    // Period options
    tresMeses: '3 months',
    seisMeses: '6 months',
    doceMeses: '12 months',
    veinticuatroMeses: '24 months',

    // Status messages
    errorCargarCotizaciones: 'Error loading quotes',
    noEncontrada: 'not found',

    // Footer text
    hechoConAmor: 'Made with',
    porText: 'by',
    yText: 'and',

    // Donation labels
    donarPaypal: 'Donate with Paypal',
    donarMercadoPago: 'Donate with Mercado Pago',
    accedeRapido: 'Access faster from your home screen',

    // Filter labels
    deshacerCargaDistancias: 'Undo load distances',
    casa: 'House',
    monedaBtn: 'Currency',
    appStatus: 'App Status',
    close: 'Close',

    // Historical page translations
    historical: {
      currentQuotes: 'Current Quotes',
      historicalQuotes: 'Historical Quotes',
      updated: 'Updated',
      loadingQuotes: 'Loading quotes...',
      exchangeHouse: 'Exchange House',
      currency: 'Currency',
      type: 'Type',
      search: 'Search',
      buy: 'Buy',
      sell: 'Sell',
      spread: 'Spread',
      name: 'Name',
      noDataAvailable: 'No data available',
      viewHistorical: 'View Historical',
      selectPeriod: 'Select Period',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      last90Days: 'Last 90 Days',
      customRange: 'Custom Range',
      from: 'From',
      to: 'To',
      apply: 'Apply',
      reset: 'Reset',
      exportData: 'Export Data',
      chartView: 'Chart View',
      tableView: 'Table View',
      date: 'Date',
      evolution: 'Evolution',
      trend: 'Trend',
      average: 'Average',
      minimum: 'Minimum',
      maximum: 'Maximum',
      volatility: 'Volatility',
      noHistoricalData: 'No historical data available for the selected period',
      errorLoadingData: 'Error loading historical data',
      retryLoad: 'Retry',
    },
    pwa: {
      retry: 'Retry',
      installTitle: 'Install Cambio Uruguay',
      installSubtitle: 'Access faster from your home screen',
      installDescription: 'Access faster from your home screen',
      install: 'Install',
      dismiss: 'Not now',
      updateAvailable: 'Update available',
      updateDescription: 'A new version is available',
      update: 'Update',
      offline: 'You are offline',
      onlineAgain: 'You are online again',
    },
    codes: {
      USD: 'United States Dollars',
      ARS: 'Argentine Pesos',
      BRL: 'Brazilian Reais',
      EUR: 'Euros',
      GBP: 'British Pounds Sterling',
      XAU: 'Gold',
      UR: 'Readjustable Units',
      UP: 'Unidade Previsional',
      UI: 'Indexed Units',
      PYG: 'Paraguayan Guaraníes',
      PEN: 'Peruvian Soles',
      MXP: 'Mexican Pesos',
      JPY: 'Japanese Yen',
      CLP: 'Chilean Pesos',
      CHF: 'Swiss Francs',
      CAD: 'Canadian Dollars',
      AUD: 'Australian Dollars',
      UYU: 'Pesos Uruguayos',
    },
    seo: {
      // Homepage
      homeTitle: 'Best Currency Exchange Rates in Uruguay',
      homeDescription:
        'Find the best currency exchange rates in Uruguay. Compare prices from over 40 exchange houses in real time.',
      homeKeywords:
        'currency exchange uruguay, forex uruguay, where to buy dollars uruguay, where to sell dollars uruguay, sell argentine pesos uruguay, buy argentine pesos uruguay, exchange houses uruguay, exchange houses montevideo, exchange houses punta del este',

      // Historical page
      historicalTitle: 'Exchange Rate History - Cambio Uruguay',
      historicalDescription:
        'Check the complete history of exchange rates from all exchange houses in Uruguay. Real-time updated data.',
      historicalKeywords:
        'exchange rate history, currency exchange uruguay, historical prices, exchange houses uruguay',

      // Historical origin page
      historicalOriginTitle: '{origin} Exchange Rates - Cambio Uruguay',
      historicalOriginDescription:
        'Check all current and historical exchange rates from {origin}. Buy and sell prices updated in real time.',
      historicalOriginKeywords:
        'exchange house rates, currency exchange uruguay, exchange prices uruguay',

      // Detailed history page
      historicalDetailTitle: '{origin} {currency} History | Cambio Uruguay',
      historicalDetailDescription:
        'Historical evolution of {currency} exchange rates at {origin}. Charts, statistics and detailed currency exchange data in Uruguay.',
      historicalDetailKeywords:
        'historical exchange rates, exchange evolution, exchange rate charts, currency statistics uruguay',

      // Offline page
      offlineTitle: 'Offline - Cambio Uruguay',
      offlineDescription:
        'No internet connection. Check your connection to access exchange rates.',
      offlineKeywords: 'offline, no connection, cambio uruguay',
    },
  }
})

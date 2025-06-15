export default defineI18nLocale(async (locale) => {
  return {
    welcome:
      'Encontre a melhor taxa de câmbio do mercado, comparando entre mais de 40 casas de câmbio.',
    title:
      'Citações do dia [day]. Elas são atualizadas a cada 10 minutos com respeito às informações na web.',
    info: 'Se você achou as informações no site úteis, você pode ajudar a mantê-las ou deixando sua avaliação',
    wantToBuy: 'Eu quero comprar',
    wantToSell: 'Eu quero vender',
    currency: 'Divisa',
    departments: 'Departamentos',
    from: 'de',
    to: 'para',
    buy: 'comprar',
    sell: 'vender',
    loadDistances: 'distâncias',
    loadDistancesTooltip:
      'Funciona com maior precisão em telemóveis / comprimidos',
    hideInterBank: 'Esconder citações interbancárias',
    hideConditional: 'Ocultar citações com condições',
    pagas: 'Paga',
    recibes: 'Recebe',
    moneda: 'Moeda',
    casaDeCambio: 'Bureau de Change',
    sitioWeb: 'Sítio Web',
    condicional: 'Condicional',
    compra: 'Compra',
    venta: 'Venda',
    distancia: 'Distância',
    buscarSucursal: 'Filiais',
    infoPrestamos: 'Empréstimos',
    consulta:
      'Se você tiver algum problema / dúvidas / sugestões, envie um e-mail para ',
    disclaimer:
      'Este site foi criado exclusivamente para fins de educação, não nos responsabilizamos pelo uso indevido das informações.',
    madeWith: 'Feito com',
    por: 'por',
    and: 'y',
    codigo: 'Código',
    nombre: 'Nome',
    departamento: 'Departamento',
    localidad: 'Localidade',
    direccion: 'Endereço',
    telefono: 'Telefone/s',
    email: 'E-mail',
    horarios: 'Horários',
    observaciones: 'Observações',
    bcu_regul: 'Regulado por BCU',
    bcu_regul_sub:
      'Esta entidade é regulamentada pelo BCU (Banco Central do Uruguai)',
    razonSocial: 'Nome da empresa',
    noData: 'Nenhum dado a ser exibido, clique no botão do site',
    cargando: 'Carregando',
    locationTooltip: 'Trabalha com mais precisão em celulares / placas',
    confirmarUbicacion: 'Confirmar localização',
    cerrar: 'Fechar',
    confirmar: 'Confirme',
    prex_condition:
      'Exigir a utilização do cartão prex, este deve ser solicitado no seu website.',
    ebrou_condition:
      'Exigir uma conta web no banco BROU, uma conta poupança deve ser aberta no banco BROU.',
    join_twitter: 'Junte-se ao nosso twitter para ficar atualizado',
    no_mostrar_nuevo: 'Não voltar a aparecer',
    search_radius: 'Raio de busca (Km)',
    join_linkedin: 'Siga-nos no Linkedin',
    paying_with: 'Pagando com',
    buying_with: 'Comprando com',
    hideWidgets: 'Ocultar widgets / bate-papo',
    here: 'aqui',
    pay: 'Você paga',
    get: 'Você consegue',
    searchExchangeHouse: 'Buscar casa de câmbio (ex: Itau, Varlix)',
    selectDate: 'Selecionar data',
    resetDate: 'Redefinir para hoje',
    resetFilters: 'Redefinir todos os filtros',
    filtersReset: 'Filtros redefinidos com sucesso',
    noExchangeHousesFound: 'Nenhuma casa de câmbio encontrada',
    noDataAvailable:
      'Nenhum dado de taxa de câmbio disponível para a data selecionada. Tente uma data diferente.',
    seoTitle: 'Melhores Taxas de Câmbio no Uruguai',
    seoDescription:
      'Encontre as melhores taxas de câmbio no Uruguai. Compare preços de mais de 40 casas de câmbio para USD, ARS, BRL, EUR e outras moedas.',
    seoKeywords:
      'câmbio Uruguai, troca dólar Uruguai, troca peso Uruguai, casas de câmbio Uruguai, câmbio Montevidéu, câmbio Punta del Este',
    subtitle: 'Compare taxas de mais de 40 casas de câmbio em tempo real',
    apiUsageMessage:
      'Interessado em usar esta API para seu site e ter uma taxa de câmbio de acordo com um banco específico em tempo real? Entre em contato conosco em ',

    // Navigation and UI labels
    inicio: 'Início',
    historico: 'Histórico',
    donar: 'Doar',

    // Historical page specific texts
    historicoCotizações: 'Cotações Históricas',
    evolucionCotizações: 'Evolução das Cotações',
    cargandoDatosHistoricos: 'Carregando dados históricos...',
    errorCargarDatos: 'Erro ao carregar dados',
    reintentar: 'Tentar Novamente',
    datosDetallados: 'Dados Detalhados',
    buscarPorFecha: 'Buscar por data...',
    volverAlInicio: 'Voltar ao início',
    actualizado: 'Atualizado',

    // Statistics labels
    compraActual: 'Compra Atual',
    ventaActual: 'Venda Atual',
    promedioCompra: 'Média de Compra',
    datosTotales: 'Dados Totais',
    cambio: 'Mudança',
    precioCompra: 'Preço de Compra',
    precioVenta: 'Preço de Venda',

    // Form labels
    monedaLabel: 'Moeda',
    tipoLabel: 'Tipo',
    buscarLabel: 'Buscar',
    fechaLabel: 'Data',

    // Additional UI elements
    ubicacion: 'Localização',
    institucionRegulada: 'Instituição Regulada pelo BCU',
    datosHistoricosDisponibles: 'Dados históricos disponíveis',
    verMenos: 'Ver menos',
    mas: 'mais',
    evolucion: 'Evolução',

    // Branches/Sucursales page
    sucursalesMenu: 'Filiais',
    todasLasUbicaciones: 'Todas as localizações',
    verEnGoogleMaps: 'Ver no Google Maps',
    informacionImportante: 'Informação Importante',
    cargandoSucursales: 'Carregando filiais...',
    listaSucursales: 'Lista de Filiais',
    sucursalesEncontradas: 'filiais encontradas',
    noSucursalesEncontradas: 'Nenhuma filial encontrada',
    noSucursalesDisponibles: 'Não há filiais disponíveis para esta consulta',

    // Sucursales index page
    sucursales: {
      titulo: 'Diretório de Filiais',
      descripcion: 'Encontre todas as filiais de casas de câmbio no Uruguai',
      casasDeCambio: 'Casas de Câmbio',
      ubicaciones: 'Localizações',
      datosActualizados: 'Dados atualizados em tempo real',
      clickParaVer: 'Clique em qualquer casa de câmbio para ver suas filiais',
      cargandoDatos: 'Carregando informações das filiais...',
      buscar: 'Buscar casa de câmbio ou localização...',
      buscarAhora: 'Buscar agora',
      limpiarFiltros: 'Limpar filtros',
      filtrarPorDepartamento: 'Filtrar por departamento',
      verSucursales: 'Ver Filiais',
      porUbicacion: 'Buscar por Localização',
      explorar: 'Explorar',
    },

    // Period options
    tresMeses: '3 meses',
    seisMeses: '6 meses',
    doceMeses: '12 meses',
    veinticuatroMeses: '24 meses',

    // Status messages
    errorCargarCotizaciones: 'Erro ao carregar cotações',
    noEncontrada: 'não encontrada',

    // Footer text
    hechoConAmor: 'Feito com',
    porText: 'por',
    yText: 'e',

    // Social media tooltips
    siguenos: {
      twitter: 'Siga-nos no Twitter',
      linkedin: 'Siga-nos no LinkedIn',
      kofi: 'Apoie-nos no Ko-fi',
    },

    // Donation labels
    donarPaypal: 'Doar com Paypal',
    donarMercadoPago: 'Doar com Mercado Pago',
    accedeRapido: 'Acesse mais rápido da sua tela inicial',

    // Filter labels
    deshacerCargaDistancias: 'Desfazer carregamento de distâncias',
    casa: 'Casa',
    monedaBtn: 'Moeda',
    appStatus: 'Status do App',
    close: 'Fechar',

    // Historical page translations
    historical: {
      currentQuotes: 'Citações Atuais',
      historicalQuotes: 'Citações Históricas',
      updated: 'Atualizado',
      loadingQuotes: 'Carregando citações...',
      exchangeHouse: 'Casa de Câmbio',
      currency: 'Moeda',
      type: 'Tipo',
      search: 'Buscar',
      resetFilters: 'Limpar Filtros',
      buy: 'Compra',
      sell: 'Venda',
      spread: 'Spread',
      name: 'Nome',
      noDataAvailable: 'Nenhum dado disponível',
      viewHistorical: 'Ver Histórico',
      selectPeriod: 'Selecionar Período',
      last7Days: 'Últimos 7 Dias',
      last30Days: 'Últimos 30 Dias',
      last90Days: 'Últimos 90 Dias',
      customRange: 'Período Personalizado',
      from: 'De',
      to: 'Para',
      apply: 'Aplicar',
      reset: 'Resetar',
      exportData: 'Exportar Dados',
      chartView: 'Visualização de Gráfico',
      tableView: 'Visualização de Tabela',
      date: 'Data',
      evolution: 'Evolução',
      trend: 'Tendência',
      average: 'Média',
      minimum: 'Mínimo',
      maximum: 'Máximo',
      volatility: 'Volatilidade',
      noHistoricalData:
        'Nenhum dado histórico disponível para o período selecionado',
      errorLoadingData: 'Erro ao carregar dados históricos',
      retryLoad: 'Tentar Novamente',
    },
    pwa: {
      retry: 'Reintentar',
      installTitle: 'Instalar Cambio Uruguay',
      installSubtitle: 'Acesse mais rápido da sua tela inicial',
      installDescription: 'Acesse mais rápido da sua tela inicial',
      install: 'Instalar',
      dismiss: 'Agora não',
      updateAvailable: 'Atualização disponível',
      updateDescription: 'Uma nova versão está disponível',
      update: 'Atualizar',
      offline: 'Você está offline',
      onlineAgain: 'Você está online novamente',
    },
    codes: {
      USD: 'Dólares dos Estados Unidos',
      ARS: 'Pesos Argentinos',
      BRL: 'Reais Brasileiros',
      EUR: 'Euros',
      GBP: 'Libras Esterlinas Britânicas)',
      XAU: 'Ouro',
      UR: 'Unidades reajustáveis',
      UP: 'Unidade Previsional',
      UI: 'Unidades indexadas',
      PYG: 'Guaranis paraguaios',
      PEN: 'Soles peruanos',
      MXP: 'Pesos Mexicanos',
      JPY: 'iene japonês',
      CLP: 'Pesos chilenos',
      CHF: 'Francos suíços',
      CAD: 'Dólares canadenses',
      AUD: 'Dólares australianos',
      UYU: 'Pesos Uruguayos',
      MXN: 'Novos Pesos Mexicanos',
      COP: 'Pesos colombianos',
    },
    seo: {
      // Página inicial
      homeTitle: 'Melhores Taxas de Câmbio no Uruguai',
      homeDescription:
        'Encontre as melhores taxas de câmbio no Uruguai. Compare preços de mais de 40 casas de câmbio em tempo real.',
      homeKeywords:
        'câmbio moeda uruguai, câmbio divisas uruguai, onde comprar dólares uruguai, onde vender dólares uruguai, vender pesos argentinos uruguai, comprar pesos argentinos uruguai, casas de câmbio uruguai, casas de câmbio montevidéu, casas de câmbio punta del este',

      // Página histórica
      historicalTitle: 'Histórico de Cotações - Cambio Uruguay',
      historicalDescription:
        'Consulte o histórico completo de cotações de todas as casas de câmbio no Uruguai. Dados atualizados em tempo real.',
      historicalKeywords:
        'histórico cotações, câmbio uruguai, histórico preços, casas câmbio uruguai',

      // Página histórico por casa de câmbio
      historicalOriginTitle: 'Cotações de {origin} - Cambio Uruguay',
      historicalOriginDescription:
        'Consulte todas as cotações atuais e históricas de {origin}. Preços de compra e venda atualizados em tempo real.',
      historicalOriginKeywords:
        'cotações casa câmbio, câmbio divisas uruguai, preços câmbio uruguai',

      // Página histórico detalhado
      historicalDetailTitle: 'Histórico {origin} - {currency} | Cambio Uruguay',
      historicalDetailDescription:
        'Evolução histórica das cotações {currency} em {origin}. Gráficos, estatísticas e dados detalhados de câmbio de moedas no Uruguai.',
      historicalDetailKeywords:
        'histórico cotações, evolução câmbio, gráfico cotações, estatísticas câmbio uruguai',

      // Página offline
      offlineTitle: 'Offline - Cambio Uruguay',
      offlineDescription:
        'Sem conexão com a internet. Verifique sua conexão para acessar as taxas de câmbio.',
      offlineKeywords: 'offline, sem conexão, cambio uruguay',

      // Página de filiais
      sucursalesTitle: 'Filiais de {origin} - Cambio Uruguay',
      sucursalesDescription:
        'Encontre todas as filiais de {origin} no Uruguai. Endereços completos, telefones, horários e localizações.',
      sucursalesLocationDescription:
        'Filiais de {origin} em {location}. Endereços, telefones, horários e localizações em {location}, Uruguai.',
      sucursalesKeywords:
        'filiais {origin}, endereços {origin}, localizações {origin}, casas de câmbio uruguai',

      // Página diretório de filiais
      sucursalesIndexTitle:
        'Diretório de Filiais - Todas as Casas de Câmbio no Uruguai',
      sucursalesIndexDescription:
        'Diretório completo de filiais de todas as casas de câmbio no Uruguai. Encontre localizações, endereços e contatos por departamento.',
      sucursalesIndexKeywords:
        'diretório filiais uruguai, casas de câmbio uruguai, filiais montevidéu, filiais canelones, todas as filiais uruguai',
    },
  }
})

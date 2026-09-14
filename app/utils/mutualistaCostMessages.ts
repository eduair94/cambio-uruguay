export const mutualistaCostMessages = {
  es: {
    title: 'Tickets y órdenes de mutualistas en Uruguay',
    description:
      'Consultá tickets de medicamentos y órdenes de consulta de 34 instituciones. Tarifarios del MSP de julio de 2026, por afiliación, con precios base y condiciones.',
    kicker: 'Tarifarios del MSP · Julio de 2026',
    lead: 'Buscá tu institución y revisá las tarifas que publica el MSP para cinco prestaciones. El precio que te corresponde depende de tu afiliación y convenio.',
    institution: 'Institución',
    affiliation: 'Afiliación',
    service: 'Prestación',
    fonasa: 'FONASA',
    noFonasa: 'No FONASA',
    police: 'Sanidad Policial',
    allAffiliations: 'Todas las afiliaciones',
    baseNotice: 'Importes en pesos uruguayos, sin IVA ni timbres. No son el total que vas a pagar.',
    resultTitle: 'Tarifas publicadas',
    conditionsNotice:
      'La planilla puede publicar varios precios sin identificar a qué convenio pertenece cada uno. No tomes el menor como tu tarifa: confirmá la columna que te corresponde con tu institución.',
    priceColumn: 'Columna del MSP',
    baseAmount: 'Precio base (UYU)',
    condition: 'Condición publicada',
    unspecified: 'Convenio no identificado en la planilla',
    sourceCell: 'Celda de origen',
    noData: 'Sin dato',
    zeroNote:
      'Un cero corresponde sólo a esta columna; no demuestra una exoneración de todos los cargos.',
    empty:
      'Esta institución no publica columnas para la afiliación seleccionada. Probá con todas las afiliaciones o consultá al prestador.',
    contradiction:
      'Este importe supera el máximo que figura en la misma fila del archivo. Confirmalo con la institución.',
    maximum: 'Máximo autorizado publicado',
    maximumNotice:
      'Es el valor de la columna F del MSP para esta prestación. No es la tarifa que pagás ni una comparación de calidad.',
    comparisonTitle: 'Máximos autorizados por institución',
    comparisonIntro:
      'Compará la misma prestación en las 34 instituciones del archivo, en orden alfabético. Los convenios y beneficios de cada prestador pueden cambiar el importe final.',
    chooseInstitution: 'Ver tarifas',
    extraTitle: 'Qué falta sumar al precio base',
    extraBody:
      'El MSP indica IVA del 10 % y timbres profesionales de $ 44 para medicamentos y $ 170 para análisis, estudios y técnicas diagnósticas. No sumamos automáticamente un timbre de análisis a una consulta.',
    exampleTitle: 'Antes de pagar, confirmá tu convenio',
    exampleBody:
      'Llevá el nombre de la prestación y la columna del tarifario a tu mutualista. Preguntá qué beneficio te corresponde y cuál es el total con los cargos aplicables. Un precio vacío no equivale a cero.',
    limitsTitle: 'Alcance y fuente',
    limitsBody:
      'Esta consulta transcribe cinco prestaciones del archivo IAMC del MSP, con vigencia desde julio de 2026. No incluye todas las prestaciones, ASSE ni todos los seguros. La presencia de una institución en el archivo no confirma que admita nuevas afiliaciones.',
    sourceLanguage:
      'Los nombres de instituciones, columnas y condiciones conservan el español de la fuente.',
    source: 'Publicación oficial del MSP',
    download: 'Descargar planilla original (XLSX)',
    published: 'Publicado',
    verified: 'Revisado',
    effective: 'Vigencia',
    nextTitle: 'Si estás pensando en cambiar de mutualista',
    nextBody:
      'Además de las tarifas, revisá el calendario de movilidad, la permanencia y tus derechos en BPS.',
    changeLink: 'Cuándo puedo cambiar de mutualista',
    costsLink: 'Comparar tickets y órdenes',
    navLabel: 'Consultar costos y cambio de mutualista',
    medicines: 'Ticket de medicamentos general',
    generalMedicine: 'Medicina general en consultorio',
    specialists: 'Otras especialidades en consultorio',
    emergency: 'Consulta de urgencia centralizada',
    homeConsultation: 'Consulta no urgente a domicilio',
    resultsAnnouncement: '{count} columnas publicadas',
    sourceDetail: 'Referencia exacta en el archivo original',
  },
  en: {
    title: 'Mutualista medication copays and consultation fees in Uruguay',
    description:
      'Check medication copays and consultation fees at 34 institutions. MSP fee schedules for July 2026, by membership type, with base prices and conditions.',
    kicker: 'MSP fee schedules · July 2026',
    lead: 'Find your institution and review the fees published by the MSP for five services. Your applicable price depends on your membership type and agreement.',
    institution: 'Institution',
    affiliation: 'Membership type',
    service: 'Service',
    fonasa: 'FONASA',
    noFonasa: 'Non-FONASA',
    police: 'Police Health Service',
    allAffiliations: 'All membership types',
    baseNotice:
      'Amounts are in Uruguayan pesos, excluding VAT and stamp fees. They are not the total you will pay.',
    resultTitle: 'Published fees',
    conditionsNotice:
      'The spreadsheet may list several prices without identifying which agreement each belongs to. Do not assume the lowest is your fee: confirm the applicable column with your institution.',
    priceColumn: 'MSP column',
    baseAmount: 'Base price (UYU)',
    condition: 'Published condition',
    unspecified: 'Agreement not identified in the spreadsheet',
    sourceCell: 'Source cell',
    noData: 'No data',
    zeroNote:
      'A zero applies only to this column; it does not establish an exemption from all charges.',
    empty:
      'This institution has no published columns for the selected membership type. Try all membership types or contact the provider.',
    contradiction:
      'This amount exceeds the maximum listed in the same row of the file. Confirm it with the institution.',
    maximum: 'Published authorized maximum',
    maximumNotice:
      'This is the value in MSP column F for this service. It is not the fee you pay or a comparison of quality.',
    comparisonTitle: 'Authorized maximums by institution',
    comparisonIntro:
      'Compare the same service across the 34 institutions in the file, listed alphabetically. Each provider’s agreements and benefits may change the final amount.',
    chooseInstitution: 'View fees',
    extraTitle: 'What still needs to be added to the base price',
    extraBody:
      'The MSP specifies 10% VAT and professional stamp fees of UYU 44 for medicines and UYU 170 for laboratory tests, examinations and diagnostic procedures. We do not automatically add a laboratory-test stamp fee to a consultation.',
    exampleTitle: 'Confirm your agreement before paying',
    exampleBody:
      'Take the service name and fee-schedule column to your mutualista. Ask which benefit applies to you and what the total is with applicable charges. A blank price does not mean zero.',
    limitsTitle: 'Scope and source',
    limitsBody:
      'This tool transcribes five services from the MSP’s IAMC file, effective from July 2026. It does not include every service, ASSE or all insurance providers. An institution’s presence in the file does not confirm that it accepts new members.',
    sourceLanguage:
      'Institution names, column labels and conditions retain the Spanish wording of the source.',
    source: 'Official MSP publication',
    download: 'Download original spreadsheet (XLSX)',
    published: 'Published',
    verified: 'Reviewed',
    effective: 'Effective date',
    nextTitle: 'If you are thinking of switching mutualistas',
    nextBody:
      'In addition to fees, check the switching schedule, minimum membership period and your rights with BPS.',
    changeLink: 'When can I switch mutualistas?',
    costsLink: 'Compare medication copays and consultation fees',
    navLabel: 'Check costs and switching mutualistas',
    medicines: 'General medication copay',
    generalMedicine: 'General medicine consultation at the clinic',
    specialists: 'Other specialist consultations at the clinic',
    emergency: 'Consultation at an urgent care center',
    homeConsultation: 'Non-urgent home consultation',
    resultsAnnouncement: '{count} published columns',
    sourceDetail: 'Exact reference in the original file',
  },
  pt: {
    title: 'Copagamentos de medicamentos e consultas de mutualistas no Uruguai',
    description:
      'Consulte copagamentos de medicamentos e valores de consultas de 34 instituições. Tabelas do MSP de julho de 2026, por modalidade de filiação, com preços base e condições.',
    kicker: 'Tabelas de tarifas do MSP · Julho de 2026',
    lead: 'Busque sua instituição e consulte as tarifas publicadas pelo MSP para cinco serviços. O preço aplicável depende da sua modalidade de filiação e do seu convênio.',
    institution: 'Instituição',
    affiliation: 'Modalidade de filiação',
    service: 'Serviço',
    fonasa: 'FONASA',
    noFonasa: 'Sem FONASA',
    police: 'Serviço de Saúde Policial',
    allAffiliations: 'Todas as modalidades de filiação',
    baseNotice:
      'Valores em pesos uruguaios, sem IVA nem taxas de selos profissionais. Não são o total que você vai pagar.',
    resultTitle: 'Tarifas publicadas',
    conditionsNotice:
      'A planilha pode publicar vários preços sem identificar a qual convênio cada um pertence. Não considere o menor como sua tarifa: confirme com sua instituição qual coluna se aplica a você.',
    priceColumn: 'Coluna do MSP',
    baseAmount: 'Preço base (UYU)',
    condition: 'Condição publicada',
    unspecified: 'Convênio não identificado na planilha',
    sourceCell: 'Célula de origem',
    noData: 'Sem dado',
    zeroNote:
      'Um zero corresponde apenas a esta coluna; não comprova uma isenção de todas as cobranças.',
    empty:
      'Esta instituição não publica colunas para a modalidade de filiação selecionada. Tente todas as modalidades ou consulte o prestador.',
    contradiction:
      'Este valor supera o máximo indicado na mesma linha do arquivo. Confirme com a instituição.',
    maximum: 'Máximo autorizado publicado',
    maximumNotice:
      'É o valor da coluna F do MSP para este serviço. Não é a tarifa que você paga nem uma comparação de qualidade.',
    comparisonTitle: 'Máximos autorizados por instituição',
    comparisonIntro:
      'Compare o mesmo serviço nas 34 instituições do arquivo, em ordem alfabética. Os convênios e benefícios de cada prestador podem alterar o valor final.',
    chooseInstitution: 'Ver tarifas',
    extraTitle: 'O que falta somar ao preço base',
    extraBody:
      'O MSP indica IVA de 10% e taxas de selos profissionais de UYU 44 para medicamentos e UYU 170 para análises, exames e procedimentos diagnósticos. Não somamos automaticamente uma taxa de selo de análise a uma consulta.',
    exampleTitle: 'Antes de pagar, confirme seu convênio',
    exampleBody:
      'Leve o nome do serviço e a coluna da tabela à sua mutualista. Pergunte qual benefício se aplica a você e qual é o total com as cobranças aplicáveis. Um preço em branco não equivale a zero.',
    limitsTitle: 'Abrangência e fonte',
    limitsBody:
      'Esta consulta transcreve cinco serviços do arquivo IAMC do MSP, com vigência a partir de julho de 2026. Não inclui todos os serviços, a ASSE nem todas as seguradoras. A presença de uma instituição no arquivo não confirma que ela aceite novas filiações.',
    sourceLanguage: 'Os nomes das instituições, colunas e condições mantêm o espanhol da fonte.',
    source: 'Publicação oficial do MSP',
    download: 'Baixar planilha original (XLSX)',
    published: 'Publicado',
    verified: 'Revisado',
    effective: 'Vigência',
    nextTitle: 'Se você está pensando em mudar de mutualista',
    nextBody:
      'Além das tarifas, consulte o calendário de mudança, o período de permanência e seus direitos no BPS.',
    changeLink: 'Quando posso mudar de mutualista?',
    costsLink: 'Comparar copagamentos de medicamentos e consultas',
    navLabel: 'Consultar custos e mudança de mutualista',
    medicines: 'Copagamento geral de medicamentos',
    generalMedicine: 'Medicina geral em consultório',
    specialists: 'Outras especialidades em consultório',
    emergency: 'Consulta em central de urgência',
    homeConsultation: 'Consulta não urgente em domicílio',
    resultsAnnouncement: '{count} colunas publicadas',
    sourceDetail: 'Referência exata no arquivo original',
  },
}

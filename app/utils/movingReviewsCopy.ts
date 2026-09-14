const es = {
  title: 'Reseñas y referencias externas',
  none: 'Todavía no hay un perfil de reseñas vinculado a este prestador.',
  scope:
    'Las opiniones corresponden al perfil comercial o sucursal y pueden abarcar otros servicios de la empresa. Revisá la cantidad, las fechas y los comentarios en la fuente.',
  liveHint:
    'La puntuación se actualiza al abrir este bloque. La fecha indica cuándo la consultamos, no cuándo se escribió la última opinión.',
  sourceOnly:
    'Consultá las opiniones directamente en el perfil. Su puntuación todavía no está conectada a este directorio.',
  referenceOnly: 'Referencia comercial externa. Esta ficha no aporta una puntuación al directorio.',
  loading: 'Consultando Google Maps…',
  count: '{count} opiniones',
  checked: 'Consultado',
  source: 'Abrir perfil',
  evidence: 'Fuente del vínculo',
  refresh: 'Actualizar puntuación',
  consult: 'Consultar puntuación',
  noReviews: 'Este perfil todavía no tiene opiniones publicadas.',
  unavailable: 'No pudimos actualizar la puntuación. Podés volver a consultar o abrir el perfil.',
  mismatch:
    'El perfil ya no coincide con los datos comprobados. Su puntuación queda oculta mientras se revisa el vínculo.',
  limited: 'Esperá un minuto antes de volver a consultar. El enlace al perfil sigue disponible.',
  busy: 'Hay otra consulta en curso. Volvé a intentarlo en unos segundos.',
  unconfigured:
    'La consulta de puntuaciones no está disponible en este entorno. Podés abrir el perfil.',
  caution:
    'Las reseñas son una señal para decidir. Confirmá por escrito el servicio, el precio y la responsabilidad por daños.',
}
const en: typeof es = {
  title: 'Reviews and external references',
  none: 'No review profile has been linked to this provider yet.',
  scope:
    'Reviews belong to the business profile or branch and may cover other services. Check the number, dates and comments at the source.',
  liveHint:
    'The score refreshes when you open this section. The date is our lookup time, not the date of the latest review.',
  sourceOnly:
    'Read reviews directly on the profile. Its score is not connected to this directory yet.',
  referenceOnly:
    'External business reference. This listing does not supply a score to the directory.',
  loading: 'Checking Google Maps…',
  count: '{count} reviews',
  checked: 'Checked',
  source: 'Open profile',
  evidence: 'Link evidence',
  refresh: 'Refresh score',
  consult: 'Check score',
  noReviews: 'This profile has no published reviews yet.',
  unavailable: 'We could not refresh the score. Try again or open the profile.',
  mismatch:
    'The profile no longer matches the checked business details. Its score is hidden while the link is reviewed.',
  limited: 'Wait a minute before checking again. The profile link is still available.',
  busy: 'Another lookup is in progress. Try again in a few seconds.',
  unconfigured: 'Score lookups are not available in this environment. You can open the profile.',
  caution:
    'Reviews help inform your choice. Confirm the service, price and responsibility for damage in writing.',
}
const pt: typeof es = {
  title: 'Avaliações e referências externas',
  none: 'Ainda não há um perfil de avaliações vinculado a este prestador.',
  scope:
    'As opiniões pertencem ao perfil comercial ou filial e podem abranger outros serviços. Confira a quantidade, as datas e os comentários na fonte.',
  liveHint:
    'A nota é atualizada ao abrir esta seção. A data indica nossa consulta, não a data da última avaliação.',
  sourceOnly:
    'Consulte as avaliações diretamente no perfil. A nota ainda não está conectada a este diretório.',
  referenceOnly: 'Referência comercial externa. Esta ficha não fornece uma nota ao diretório.',
  loading: 'Consultando o Google Maps…',
  count: '{count} avaliações',
  checked: 'Consultado',
  source: 'Abrir perfil',
  evidence: 'Fonte do vínculo',
  refresh: 'Atualizar nota',
  consult: 'Consultar nota',
  noReviews: 'Este perfil ainda não tem avaliações publicadas.',
  unavailable: 'Não foi possível atualizar a nota. Tente novamente ou abra o perfil.',
  mismatch:
    'O perfil não corresponde mais aos dados conferidos. A nota fica oculta enquanto o vínculo é revisado.',
  limited: 'Espere um minuto antes de consultar novamente. O link do perfil continua disponível.',
  busy: 'Outra consulta está em andamento. Tente novamente em alguns segundos.',
  unconfigured: 'A consulta de notas não está disponível neste ambiente. Você pode abrir o perfil.',
  caution:
    'As avaliações ajudam a decidir. Confirme por escrito o serviço, o preço e a responsabilidade por danos.',
}
export function movingReviewsCopy(locale: string): typeof es {
  return locale.startsWith('en') ? en : locale.startsWith('pt') ? pt : es
}

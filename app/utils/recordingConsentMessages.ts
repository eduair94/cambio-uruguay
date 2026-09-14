// Head + navigation copy for `/grabacion-sin-consentimiento-uruguay`, in the three
// locales the site serves. Same shape as `noiseNavigationMessages`: a pure object
// so `seoTitleBudget.test.ts` can resolve the `<title>` without running the app.
//
// THE TITLES ARE MEASURED. `app.vue` appends " | Cambio Uruguay" (17 of the 60
// characters Google shows), so every `title` below has to stay at 43 or less. The
// three are cut to the same rule and not only the Spanish one: the test measures
// `es`, and leaving `en`/`pt` long would hide the same defect in two languages.
export const recordingConsentMessages = {
  es: {
    heading: 'Me grabaron sin consentimiento y subieron el video: qué puedo hacer',
    title: 'Grabación sin consentimiento en Uruguay',
    description:
      'Te grabaron sin permiso y el video está en TikTok o Instagram. Qué dice la ley uruguaya, por dónde se pide el retiro y qué plazos corren.',
    navigation: 'Ir a una sección de la guía',
    useTemplate: 'Escribir el reclamo',
    platforms: 'Dónde reportarlo',
    deadlines: 'Plazos que corren',
    reportedNothing: 'Reporté y no pasó nada',
    reportedNothingHeading: 'Reporté el video en la app y no pasó nada',
    reportedNothingAnswer:
      'Es lo habitual, y no es mala suerte. El botón "Reportar" del posteo manda el video a la cola de normas de la comunidad, donde una broma con un adulto en la vía pública muchas veces no infringe ninguna regla. El formulario de privacidad es otra cola distinta: te pide identificarte, decir en qué segundo aparecés y qué derecho se afecta. Es el que corresponde cuando el problema es que salís vos.',
    nextStep: 'Si no sabés qué organismo corresponde a tu caso,',
    findAuthority: 'consultá a quién dirigir el reclamo.',
  },
  en: {
    heading: 'Someone filmed me without consent and posted the video: what can I do',
    title: 'Filmed without consent in Uruguay',
    description:
      'You were filmed without permission and the video is on TikTok or Instagram. What Uruguayan law says, where to request removal and which deadlines are running.',
    navigation: 'Jump to a section of the guide',
    useTemplate: 'Write the request',
    platforms: 'Where to report it',
    deadlines: 'Deadlines running',
    reportedNothing: 'I reported it and nothing happened',
    reportedNothingHeading: 'I reported the video in the app and nothing happened',
    reportedNothingAnswer:
      'That is the usual outcome, not bad luck. The in-app "Report" button sends the video to the community guidelines queue, where a prank involving an adult in a public street often breaks no rule. The privacy form is a different queue: it asks who you are, at which second you appear and which right is affected. That is the right door when the problem is that you are in the video.',
    nextStep: 'If you are unsure which authority handles your case,',
    findAuthority: 'find out where to direct your complaint.',
  },
  pt: {
    heading: 'Me gravaram sem consentimento e publicaram o vídeo: o que posso fazer',
    title: 'Gravação sem consentimento no Uruguai',
    description:
      'Gravaram você sem permissão e o vídeo está no TikTok ou no Instagram. O que diz a lei uruguaia, onde pedir a remoção e quais prazos estão correndo.',
    navigation: 'Ir a uma seção do guia',
    useTemplate: 'Escrever a solicitação',
    platforms: 'Onde denunciar',
    deadlines: 'Prazos em curso',
    reportedNothing: 'Denunciei e nada aconteceu',
    reportedNothingHeading: 'Denunciei o vídeo no aplicativo e nada aconteceu',
    reportedNothingAnswer:
      'É o resultado habitual, não é azar. O botão "Denunciar" da publicação envia o vídeo para a fila das diretrizes da comunidade, onde uma brincadeira com um adulto na via pública muitas vezes não infringe nenhuma regra. O formulário de privacidade é outra fila: pede que você se identifique, diga em que segundo aparece e qual direito foi afetado. É a porta certa quando o problema é que você aparece no vídeo.',
    nextStep: 'Se você não sabe qual órgão atende o seu caso,',
    findAuthority: 'veja a quem encaminhar a reclamação.',
  },
}

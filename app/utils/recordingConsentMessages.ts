// Head + navigation copy for `/grabacion-sin-consentimiento-uruguay`, in the three
// locales the site serves. Same shape as `noiseNavigationMessages`: a pure object
// so `seoTitleBudget.test.ts` can resolve the `<title>` without running the app.
//
// THE TITLES ARE MEASURED. `app.vue` appends " | Cambio Uruguay" (17 of the 60
// characters Google shows), so every `title` below has to stay at 43 or less. The
// three are cut to the same rule and not only the Spanish one: the test measures
// `es`, and leaving `en`/`pt` long would hide the same defect in two languages.
//
// 2026-11-22 — THE SNIPPET ANSWERS THE QUERY INSTEAD OF NAMING THE TOPIC. Both halves
// were written as a label: the title was the subject of the page ("Grabación sin
// consentimiento en Uruguay") and not the phrase people type, which the 2026-10-24 row
// of `docs/seo/experiments.json` lists as "me grabaron sin consentimiento uruguay" and
// which is also this page's own H1. And the description spent its whole budget restating
// the reader's situation — filmed, video on TikTok or Instagram — before promising, in
// the abstract, that the law and the deadlines are inside; the English one did it in 158
// characters, so Google cut the promise too.
//
// Now each one leads with what the page answers and nobody else puts side by side: the
// in-app Report button is the wrong queue (the privacy form is the right one, which is
// the whole thesis of the page) and the two deadlines that are already running, both
// from this page's own sourced table in `recordingConsent.ts`: injuria lapses in 3
// months (arts. 334/339 of the Criminal Code) and a deletion request has to be answered
// in 5 working days (art. 15 of Law 18.331). No new claim: the figures are the ones the
// page already prints with their source.
export const recordingConsentMessages = {
  es: {
    heading: 'Me grabaron sin consentimiento y subieron el video: qué puedo hacer',
    title: 'Me grabaron sin consentimiento: qué hacer',
    description:
      'El botón "Reportar" no alcanza: va el formulario de privacidad. La injuria prescribe a los 3 meses y el borrado de datos se contesta en 5 días hábiles.',
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
    title: 'Filmed without consent: what to do',
    description:
      'The in-app Report button is the wrong queue: use the privacy form. Insult lapses in 3 months and a data-deletion request is answered in 5 working days.',
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
    title: 'Me gravaram sem consentimento: o que fazer',
    description:
      'O botão "Denunciar" não é a fila certa: é o formulário de privacidade. A injúria prescreve em 3 meses e a exclusão de dados é respondida em 5 dias úteis.',
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

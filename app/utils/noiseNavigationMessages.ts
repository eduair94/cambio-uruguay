// Head + navigation copy for `/denunciar-ruidos-molestos-uruguay`, in the three locales the
// site serves. A pure object so `seoTitleBudget.test.ts` can resolve the `<title>` without
// running the app.
//
// THE SNIPPET LEADS WITH THE ANSWER (2026-10-19). Until then title and description named the
// topic ("Dónde denunciar ruidos molestos…") and no channel, while more than one impression in
// ten on this page comes from a search for a number ("teléfono", "a dónde llamar", "911"). The
// page's own history says which snippet earned the click: with the decibel limits in the
// description (18/8–4/9/2026) the click rate was about twice what the generic one got from 5/9,
// at almost the same position. The number in the title is
// the Intendencia de Montevideo's Convivencia line, which takes denuncias 24 hours a day — its
// source lives in `utils/noiseComplaint.ts` (`NOISE_NIGHT_LINE`, `NOISE_SOURCES`).
export const noiseNavigationMessages = {
  es: {
    heading: 'Denuncia por ruidos molestos en Uruguay: dónde y cómo hacerla',
    title: 'Denuncia por ruidos molestos: 1950 5000',
    description:
      'Denunciá ruidos molestos las 24 horas al 1950 5000 de la Intendencia de Montevideo, o al 911 si es una fiesta. Límite: 45 dB(A) de día y 39 de noche.',
    navigation: 'Ir a una sección de la guía de ruidos molestos',
    callNightLine: 'Llamar al {phone} (24 horas)',
    useTemplate: 'Completar la denuncia',
    where: 'Dónde denunciar',
    anonymous: 'Denuncia anónima',
    whereHeading: 'Dónde hacer la denuncia por ruidos molestos',
    anonymousHeading: '¿La denuncia por ruidos molestos puede ser anónima?',
    anonymousAnswer:
      'Ante el Ministerio de Ambiente sí: el trámite indica que la denuncia puede ser anónima y que los datos del denunciante son opcionales. Ante la Intendencia de Montevideo, el trámite que termina en una medición no: pide tu dirección y tu teléfono, porque la medición se hace dentro de tu vivienda.',
    anonymousSource: 'Ver requisitos del Ministerio de Ambiente',
    nextStep: 'Si todavía no sabés qué organismo corresponde a tu caso,',
    findAuthority: 'consultá a quién dirigir el reclamo.',
  },
  en: {
    heading: 'Noise complaints in Uruguay: where and how to file one',
    title: 'Noise complaints in Montevideo: 1950 5000',
    description:
      'Report noise 24/7 on 1950 5000, Montevideo city hall, or call 911 for a party that will not stop. Limit: 45 dB(A) by day and 39 at night, inside your home.',
    navigation: 'Jump to a section of the noise complaint guide',
    callNightLine: 'Call {phone} (24 hours)',
    useTemplate: 'Prepare your complaint',
    where: 'Where to report noise',
    anonymous: 'Anonymous complaints',
    whereHeading: 'Where to file a noise complaint',
    anonymousHeading: 'Can you file a noise complaint anonymously?',
    anonymousAnswer:
      'With the Ministry of Environment, yes: the procedure allows anonymous complaints and says personal details are optional. With the Montevideo local government, the procedure that ends in a measurement does not: it requires your address and phone number because noise is measured inside your home.',
    anonymousSource: 'Check the Ministry of Environment requirements',
    nextStep: 'If you are still unsure which authority handles your case,',
    findAuthority: 'find out where to direct your complaint.',
  },
  pt: {
    heading: 'Denúncia de ruídos incômodos no Uruguai: onde e como fazer',
    title: 'Denúncia de ruídos incômodos: 1950 5000',
    description:
      'Denuncie ruídos 24 horas no 1950 5000 da Intendência de Montevidéu, ou no 911 se for uma festa. Limite: 45 dB(A) de dia e 39 à noite, dentro de casa.',
    navigation: 'Ir a uma seção do guia de denúncia de ruídos',
    callNightLine: 'Ligar para {phone} (24 horas)',
    useTemplate: 'Preparar a denúncia',
    where: 'Onde denunciar',
    anonymous: 'Denúncia anônima',
    whereHeading: 'Onde fazer a denúncia de ruídos incômodos',
    anonymousHeading: 'A denúncia de ruídos incômodos pode ser anônima?',
    anonymousAnswer:
      'No Ministério do Ambiente, sim: o procedimento permite denúncias anônimas e informa que os dados pessoais são opcionais. Na Intendência de Montevidéu, o procedimento que termina em uma medição não: exige seu endereço e telefone, pois a medição é feita dentro da sua residência.',
    anonymousSource: 'Ver requisitos do Ministério do Ambiente',
    nextStep: 'Se ainda não sabe qual órgão atende o seu caso,',
    findAuthority: 'veja a quem encaminhar a reclamação.',
  },
}

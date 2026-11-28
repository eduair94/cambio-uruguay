// Mensajes locales del aviso por tema (TopicSubscribe), de la calculadora de jubilaciones y de la
// invitación del final por tema (ReaderFollowUp, experimento `seguimiento`). Locales como los de
// siteFeedbackMessages: una clave global tendría que traducirse a máquina a los idiomas extra en
// el mismo commit, y esos caen a es. Voseo y la voz del sitio.

const es = {
  topic: {
    title: 'Avisame cuando salga la cifra',
    lead: 'Te escribimos una sola vez, el día que se publique. No te suscribe al newsletter.',
    emailLabel: 'Tu correo',
    submit: 'Avisame',
    sent: 'Listo. Te mandamos un correo para confirmar: sin confirmar no te escribimos.',
    already: 'Ya pediste este aviso desde este navegador.',
    error: 'No pudimos guardarlo. Revisá el correo y probá de nuevo.',
    confirmed: 'Aviso confirmado: te escribimos cuando salga.',
    unsubscribed: 'Listo, no te escribimos más sobre este tema.',
    invalid: 'Ese enlace ya no sirve. Podés pedir el aviso de nuevo.',
    privacy: 'Más en la',
    privacyLink: 'política de privacidad',
  },
  estimator: {
    title: '¿Cuánto vas a cobrar en 2027?',
    lead: 'Poné tu jubilación o pensión de diciembre, en pesos y antes de descuentos.',
    amountLabel: 'Tu pasividad nominal',
    invalid: 'Escribí un monto en pesos, por ejemplo 32.000.',
    referencia: 'Si fuera lo que subieron los salarios de enero a {month} ({pct})',
    'como-2026': 'Si fuera como el de 2026 ({pct})',
    provisorio: 'Con el aumento provisorio ({pct})',
    definitivo: 'Con el aumento de 2027 ({pct})',
    perMonth: '+{amount} por mes',
    estimateNote:
      'Es una estimación: la cifra sale del IMSN de todo 2026, que el INE publica a fin de enero.',
    officialNote: 'Nominal, antes del IASS y de otros descuentos.',
    minimum: 'Si cobrás la mínima, el aumento es otro: se ajusta por la BPC.',
    minimumLink: 'Cómo se ajusta la mínima',
  },
  followUp: {
    alertTitle: 'Te avisamos de avisos nuevos como estos',
    alertLead:
      'Elegís cada cuánto y por dónde (correo o notificación). Se borra o se pausa desde tu cuenta.',
    topicTitle: 'Avisame cuando salga el aumento de 2027',
  },
}

const en: typeof es = {
  topic: {
    title: 'Let me know when the figure is out',
    lead: 'We email you once, the day it is published. This does not subscribe you to the newsletter.',
    emailLabel: 'Your email',
    submit: 'Notify me',
    sent: 'Done. We sent you an email to confirm: without confirmation we will not write.',
    already: 'You already asked for this notice from this browser.',
    error: 'We could not save it. Check the email and try again.',
    confirmed: 'Notice confirmed: we will write when it is out.',
    unsubscribed: 'Done, no more emails on this topic.',
    invalid: 'That link no longer works. You can ask for the notice again.',
    privacy: 'More in the',
    privacyLink: 'privacy policy',
  },
  estimator: {
    title: 'How much will you get in 2027?',
    lead: 'Enter your December pension, in pesos and before deductions.',
    amountLabel: 'Your gross pension',
    invalid: 'Enter an amount in pesos, e.g. 32,000.',
    referencia: 'If it matched wage growth from January to {month} ({pct})',
    'como-2026': 'If it matched 2026 ({pct})',
    provisorio: 'With the provisional increase ({pct})',
    definitivo: 'With the 2027 increase ({pct})',
    perMonth: '+{amount} per month',
    estimateNote:
      'This is an estimate: the figure comes from the 2026 IMSN, published by INE at the end of January.',
    officialNote: 'Gross, before IASS and other deductions.',
    minimum: 'If you get the minimum pension, the increase is different: it follows the BPC.',
    minimumLink: 'How the minimum is adjusted',
  },
  followUp: {
    alertTitle: 'We will tell you about new listings like these',
    alertLead:
      'You choose how often and how (email or notification). Pause or delete it from your account.',
    topicTitle: 'Let me know when the 2027 increase is out',
  },
}

const pt: typeof es = {
  topic: {
    title: 'Me avise quando sair o número',
    lead: 'Escrevemos uma única vez, no dia em que for publicado. Não inscreve você na newsletter.',
    emailLabel: 'Seu e-mail',
    submit: 'Me avise',
    sent: 'Pronto. Enviamos um e-mail para confirmar: sem confirmação não escrevemos.',
    already: 'Você já pediu este aviso neste navegador.',
    error: 'Não foi possível salvar. Confira o e-mail e tente de novo.',
    confirmed: 'Aviso confirmado: escrevemos quando sair.',
    unsubscribed: 'Pronto, não escrevemos mais sobre este tema.',
    invalid: 'Esse link não funciona mais. Você pode pedir o aviso de novo.',
    privacy: 'Mais na',
    privacyLink: 'política de privacidade',
  },
  estimator: {
    title: 'Quanto você vai receber em 2027?',
    lead: 'Informe sua aposentadoria ou pensão de dezembro, em pesos e antes dos descontos.',
    amountLabel: 'Seu benefício bruto',
    invalid: 'Escreva um valor em pesos, por exemplo 32.000.',
    referencia: 'Se fosse a alta dos salários de janeiro a {month} ({pct})',
    'como-2026': 'Se fosse como o de 2026 ({pct})',
    provisorio: 'Com o aumento provisório ({pct})',
    definitivo: 'Com o aumento de 2027 ({pct})',
    perMonth: '+{amount} por mês',
    estimateNote:
      'É uma estimativa: o número sai do IMSN de 2026, que o INE publica no fim de janeiro.',
    officialNote: 'Bruto, antes do IASS e de outros descontos.',
    minimum: 'Se você recebe o mínimo, o aumento é outro: segue a BPC.',
    minimumLink: 'Como o mínimo é ajustado',
  },
  followUp: {
    alertTitle: 'Avisamos de novos anúncios como estes',
    alertLead:
      'Você escolhe a frequência e o canal (e-mail ou notificação). Pausa ou exclui na sua conta.',
    topicTitle: 'Me avise quando sair o aumento de 2027',
  },
}

export const topicMessages = { es, en, pt }

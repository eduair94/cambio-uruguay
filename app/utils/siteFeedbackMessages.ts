// Local-scope messages for the feedback components (FeedbackForm, PageHelpful). Local, like
// CookieConsent and casa/OwnerCta: a global key would have to be machine-translated into the 32
// extra locales in the same commit (tests/unit/extraLocales.test.ts), and those fall back to es.
// Copy rules: voseo, the site's own voice, and every control names its action.

const es = {
  helpful: {
    question: '¿Te sirvió esta página?',
    yes: 'Sí',
    no: 'No',
    thanksYes: '¡Qué bueno! Gracias por contarnos.',
    thanksNo: 'Gracias por avisar. ¿Qué te faltó?',
    noHint: 'Una línea alcanza: qué buscabas o qué no funcionó. Lo lee una persona.',
    sentNo: 'Recibido. Con esto decidimos qué arreglar primero.',
    dismiss: 'Cerrar',
  },
  review: {
    leadTitle: '¿Nos dejás una reseña?',
    leadText:
      'Somos un sitio independiente, sin bancos ni casas de cambio detrás. Una reseña de un minuto en Trustpilot ayuda a que más gente compare antes de decidir.',
    cta: 'Escribir reseña en Trustpilot',
    later: 'Ahora no',
    quiet: '¿Querés dejar también tu opinión pública?',
    quietCta: 'Reseña en Trustpilot',
    thanks: '¡Gracias! Tu reseña nos ayuda muchísimo.',
    share: 'O compartí la página con alguien a quien le sirva',
  },
  form: {
    title: 'Sugerencias y errores',
    intro:
      'Contanos qué mejorarías, qué falta o qué no anda. Lo leemos todo y respondemos si dejás tu correo.',
    kindLegend: '¿Qué querés contarnos?',
    kinds: {
      suggestion: 'Sugerencia',
      bug: 'Algo falla',
      praise: 'Me gustó',
    },
    messageLabel: {
      suggestion: '¿Qué mejorarías o qué te gustaría encontrar?',
      bug: '¿Qué pasó? ¿Qué esperabas que pasara?',
      praise: '¿Qué te gustó?',
    },
    messagePlaceholder: {
      suggestion: 'Ej.: que se pueda filtrar por barrio y precio a la vez',
      bug: 'Ej.: en el celular, al tocar «Filtros» no se abre nada',
      praise: 'Ej.: la comparación por sucursal me ahorró un viaje',
    },
    emailLabel: 'Tu correo (opcional)',
    emailHint: 'Sólo para responderte. No lo usamos para nada más.',
    techLabel: 'Adjuntar datos técnicos',
    techHint: 'Página, tamaño de pantalla, tema y navegador. Nos ayuda a reproducir el error.',
    send: 'Enviar',
    sending: 'Enviando…',
    sentTitle: '¡Gracias! Lo recibimos.',
    sentText: 'Lo lee una persona, no un bot.',
    sentWithEmail: 'Si hace falta, te respondemos a {email}.',
    another: 'Enviar otro comentario',
    errors: {
      message: 'Escribí al menos unas palabras.',
      email: 'Ese correo no parece válido. Revisalo o dejalo vacío.',
      rate: 'Recibimos muchos mensajes seguidos. Probá de nuevo en un minuto.',
      generic:
        'No se pudo enviar. Revisá la conexión y probá de nuevo, o escribinos a admin{at}cambio-uruguay.com.',
    },
    privacy: 'No guardamos tu IP. Más en la',
    privacyLink: 'política de privacidad',
  },
  footer: {
    title: '¿Algo para mejorar?',
    suggest: 'Enviar una sugerencia',
    bug: 'Reportar un error',
  },
}

type Messages = typeof es

const en: Messages = {
  helpful: {
    question: 'Was this page useful?',
    yes: 'Yes',
    no: 'No',
    thanksYes: 'Great! Thanks for letting us know.',
    thanksNo: 'Thanks for telling us. What was missing?',
    noHint:
      'One line is enough: what you were looking for or what did not work. A person reads it.',
    sentNo: 'Received. This is how we decide what to fix first.',
    dismiss: 'Close',
  },
  review: {
    leadTitle: 'Would you leave us a review?',
    leadText:
      'We are an independent site, with no bank or exchange house behind us. A one-minute review on Trustpilot helps more people compare before deciding.',
    cta: 'Write a review on Trustpilot',
    later: 'Not now',
    quiet: 'Would you also like to leave a public review?',
    quietCta: 'Review on Trustpilot',
    thanks: 'Thank you! Your review helps us a lot.',
    share: 'Or share the page with someone who would find it useful',
  },
  form: {
    title: 'Suggestions and bugs',
    intro:
      'Tell us what you would improve, what is missing or what is broken. We read everything and reply if you leave your email.',
    kindLegend: 'What would you like to tell us?',
    kinds: {
      suggestion: 'Suggestion',
      bug: 'Something broke',
      praise: 'I liked it',
    },
    messageLabel: {
      suggestion: 'What would you improve or like to find?',
      bug: 'What happened? What did you expect?',
      praise: 'What did you like?',
    },
    messagePlaceholder: {
      suggestion: 'E.g.: filter by neighborhood and price at the same time',
      bug: 'E.g.: on my phone, tapping “Filters” does nothing',
      praise: 'E.g.: the branch comparison saved me a trip',
    },
    emailLabel: 'Your email (optional)',
    emailHint: 'Only to reply to you. We do not use it for anything else.',
    techLabel: 'Attach technical details',
    techHint: 'Page, screen size, theme and browser. It helps us reproduce the bug.',
    send: 'Send',
    sending: 'Sending…',
    sentTitle: 'Thank you! We got it.',
    sentText: 'A person reads it, not a bot.',
    sentWithEmail: 'If needed, we will reply to {email}.',
    another: 'Send another comment',
    errors: {
      message: 'Write at least a few words.',
      email: 'That email does not look valid. Check it or leave it empty.',
      rate: 'We received many messages in a row. Try again in a minute.',
      generic:
        'It could not be sent. Check your connection and try again, or email admin{at}cambio-uruguay.com.',
    },
    privacy: 'We do not store your IP. More in the',
    privacyLink: 'privacy policy',
  },
  footer: {
    title: 'Something to improve?',
    suggest: 'Send a suggestion',
    bug: 'Report a bug',
  },
}

const pt: Messages = {
  helpful: {
    question: 'Esta página foi útil?',
    yes: 'Sim',
    no: 'Não',
    thanksYes: 'Que bom! Obrigado por nos contar.',
    thanksNo: 'Obrigado por avisar. O que faltou?',
    noHint: 'Uma linha basta: o que você procurava ou o que não funcionou. Uma pessoa lê.',
    sentNo: 'Recebido. É assim que decidimos o que consertar primeiro.',
    dismiss: 'Fechar',
  },
  review: {
    leadTitle: 'Você deixaria uma avaliação?',
    leadText:
      'Somos um site independente, sem bancos nem casas de câmbio por trás. Uma avaliação de um minuto no Trustpilot ajuda mais gente a comparar antes de decidir.',
    cta: 'Escrever avaliação no Trustpilot',
    later: 'Agora não',
    quiet: 'Quer deixar também sua opinião pública?',
    quietCta: 'Avaliação no Trustpilot',
    thanks: 'Obrigado! Sua avaliação nos ajuda muito.',
    share: 'Ou compartilhe a página com alguém que possa usar',
  },
  form: {
    title: 'Sugestões e erros',
    intro:
      'Conte o que você melhoraria, o que falta ou o que não funciona. Lemos tudo e respondemos se você deixar seu e-mail.',
    kindLegend: 'O que você quer nos contar?',
    kinds: {
      suggestion: 'Sugestão',
      bug: 'Algo falhou',
      praise: 'Gostei',
    },
    messageLabel: {
      suggestion: 'O que você melhoraria ou gostaria de encontrar?',
      bug: 'O que aconteceu? O que você esperava?',
      praise: 'Do que você gostou?',
    },
    messagePlaceholder: {
      suggestion: 'Ex.: filtrar por bairro e preço ao mesmo tempo',
      bug: 'Ex.: no celular, ao tocar em «Filtros» nada abre',
      praise: 'Ex.: a comparação por agência me poupou uma viagem',
    },
    emailLabel: 'Seu e-mail (opcional)',
    emailHint: 'Só para responder. Não usamos para mais nada.',
    techLabel: 'Anexar dados técnicos',
    techHint: 'Página, tamanho da tela, tema e navegador. Ajuda a reproduzir o erro.',
    send: 'Enviar',
    sending: 'Enviando…',
    sentTitle: 'Obrigado! Recebemos.',
    sentText: 'Uma pessoa lê, não um bot.',
    sentWithEmail: 'Se for preciso, respondemos para {email}.',
    another: 'Enviar outro comentário',
    errors: {
      message: 'Escreva pelo menos algumas palavras.',
      email: 'Esse e-mail não parece válido. Confira ou deixe vazio.',
      rate: 'Recebemos muitas mensagens seguidas. Tente de novo em um minuto.',
      generic:
        'Não foi possível enviar. Verifique a conexão e tente de novo, ou escreva para admin{at}cambio-uruguay.com.',
    },
    privacy: 'Não guardamos seu IP. Mais na',
    privacyLink: 'política de privacidade',
  },
  footer: {
    title: 'Algo para melhorar?',
    suggest: 'Enviar uma sugestão',
    bug: 'Reportar um erro',
  },
}

export const siteFeedbackMessages = { es, en, pt }

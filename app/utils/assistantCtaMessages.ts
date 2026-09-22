import type { AssistantTopic } from './assistantPrompt'

/**
 * Copy of the «Preguntale a la IA» call on each directory. The question (`q.*`, and `qf.*` when the
 * page has filters to carry) is what lands written in the assistant; it is in the page's language,
 * and the model answers in that language.
 *
 * vue-i18n parses these strings: no `|` or `@`, and `{filters}` is the only placeholder.
 */
export type AssistantCtaGroup = 'vivienda' | 'autos' | 'productos'

export const ASSISTANT_CTA_GROUP: Readonly<Record<AssistantTopic, AssistantCtaGroup>> = {
  alquiler: 'vivienda',
  hogar: 'vivienda',
  oportunidadesAlquiler: 'vivienda',
  oportunidadesVenta: 'vivienda',
  autos: 'autos',
  oportunidadesAutos: 'autos',
  equipar: 'productos',
  celulares: 'productos',
  sillas: 'productos',
  monopatines: 'productos',
  bicicletas: 'productos',
  super: 'productos',
}

/** Topics whose question can carry the page's filters. */
export const ASSISTANT_FILTER_TOPICS: ReadonlySet<AssistantTopic> = new Set(['alquiler', 'autos'])

export const assistantCtaMessages = {
  es: {
    aria: 'Asistente con IA',
    button: 'Preguntarle a la IA',
    free: 'Gratis: entrás con tu cuenta de Google, Microsoft o Apple, sin claves.',
    title: {
      vivienda: '¿No sabés cuál elegir? Preguntale a la IA',
      autos: '¿No sabés cuál elegir? Preguntale a la IA',
      productos: '¿No sabés qué comprar? Preguntale a la IA',
    },
    text: {
      vivienda:
        'Contale tu presupuesto, dónde trabajás y lo que necesitás: el asistente busca entre estos avisos y te arma una lista corta con los links.',
      autos:
        'Contale tu presupuesto y para qué lo querés: el asistente busca entre los autos publicados, los compara con autos iguales y te dice cuáles valen la pena.',
      productos:
        'Contale qué necesitás y cuánto querés gastar: el asistente busca en los precios que relevamos cada día y te dice dónde está más barato.',
    },
    q: {
      alquiler:
        'Busco un alquiler en Uruguay. ¿Cuáles me convienen más y por qué? Mostrame los mejores con sus links.',
      hogar:
        'Quiero encontrar el alquiler que mejor le sirve a mi hogar según lo que ganamos y dónde trabajamos o estudiamos. ¿Qué datos necesitás para empezar?',
      oportunidadesAlquiler:
        '¿Qué alquileres están hoy más baratos que viviendas parecidas del mismo barrio? Mostrame los mejores con sus links.',
      oportunidadesVenta:
        '¿Qué viviendas en venta piden hoy menos que otras parecidas del mismo barrio? Mostrame las mejores con sus links.',
      autos:
        'Busco un auto usado. ¿Cuáles valen la pena por su precio y por qué? Mostrame los mejores con sus links.',
      oportunidadesAutos:
        '¿Qué autos usados se publican hoy por debajo de lo que piden por autos iguales? Mostrame los que valen la pena con sus links.',
      equipar:
        'Me mudo y tengo que equipar la casa. ¿Cuánto me sale lo básico y dónde lo compro más barato?',
      celulares:
        'Busco un celular con buena relación entre precio y calidad. ¿Cuál me conviene y dónde está más barato?',
      sillas:
        'Busco una silla de escritorio cómoda para trabajar muchas horas. ¿Cuál me conviene y dónde está más barata?',
      monopatines:
        'Busco un monopatín eléctrico. ¿Cuál me conviene por precio y dónde está más barato?',
      bicicletas:
        'Busco una bicicleta eléctrica. ¿Cuál me conviene por precio y dónde está más barata?',
      super: '¿En qué supermercado me sale más barata la compra de todos los meses?',
    },
    qf: {
      alquiler:
        'Busco un alquiler con estos filtros: {filters}. ¿Cuáles me convienen más y por qué? Mostrame los mejores con sus links.',
      autos:
        'Busco un auto usado con estos filtros: {filters}. ¿Cuáles valen la pena por su precio y por qué? Mostrame los mejores con sus links.',
    },
  },
  en: {
    aria: 'AI assistant',
    button: 'Ask the AI',
    free: 'Free: sign in with your Google, Microsoft or Apple account, no keys needed.',
    title: {
      vivienda: 'Not sure which one to pick? Ask the AI',
      autos: 'Not sure which one to pick? Ask the AI',
      productos: 'Not sure what to buy? Ask the AI',
    },
    text: {
      vivienda:
        'Tell it your budget, where you work and what you need: the assistant searches these listings and gives you a short list with links.',
      autos:
        'Tell it your budget and what you need the car for: the assistant searches the listed cars, compares them with identical ones and tells you which are worth it.',
      productos:
        'Tell it what you need and how much you want to spend: the assistant searches the prices we collect every day and tells you where it is cheapest.',
    },
    q: {
      alquiler:
        'I am looking for a rental in Uruguay. Which ones suit me best and why? Show me the best ones with their links.',
      hogar:
        'I want to find the rental that best fits my household, based on what we earn and where we work or study. What do you need to know to start?',
      oportunidadesAlquiler:
        'Which rentals are cheaper today than similar homes in the same neighbourhood? Show me the best ones with their links.',
      oportunidadesVenta:
        'Which homes for sale ask less today than similar ones in the same neighbourhood? Show me the best ones with their links.',
      autos:
        'I am looking for a used car. Which ones are worth their price and why? Show me the best ones with their links.',
      oportunidadesAutos:
        'Which used cars are listed today below what identical cars ask for? Show me the ones worth it with their links.',
      equipar:
        'I am moving and need to furnish the home. How much do the basics cost and where are they cheapest?',
      celulares:
        'I am looking for a phone with good value for money. Which one should I get and where is it cheapest?',
      sillas:
        'I am looking for a comfortable desk chair for long working hours. Which one should I get and where is it cheapest?',
      monopatines:
        'I am looking for an electric scooter. Which one is the best value and where is it cheapest?',
      bicicletas:
        'I am looking for an electric bike. Which one is the best value and where is it cheapest?',
      super: 'Which supermarket has the cheapest monthly groceries?',
    },
    qf: {
      alquiler:
        'I am looking for a rental with these filters: {filters}. Which ones suit me best and why? Show me the best ones with their links.',
      autos:
        'I am looking for a used car with these filters: {filters}. Which ones are worth their price and why? Show me the best ones with their links.',
    },
  },
  pt: {
    aria: 'Assistente com IA',
    button: 'Perguntar à IA',
    free: 'Grátis: entre com sua conta Google, Microsoft ou Apple, sem chaves.',
    title: {
      vivienda: 'Não sabe qual escolher? Pergunte à IA',
      autos: 'Não sabe qual escolher? Pergunte à IA',
      productos: 'Não sabe o que comprar? Pergunte à IA',
    },
    text: {
      vivienda:
        'Conte seu orçamento, onde você trabalha e do que precisa: o assistente busca entre estes anúncios e monta uma lista curta com os links.',
      autos:
        'Conte seu orçamento e para que quer o carro: o assistente busca entre os carros anunciados, compara com carros iguais e diz quais valem a pena.',
      productos:
        'Conte do que precisa e quanto quer gastar: o assistente busca nos preços que coletamos todos os dias e diz onde está mais barato.',
    },
    q: {
      alquiler:
        'Procuro um aluguel no Uruguai. Quais me convêm mais e por quê? Mostre os melhores com os links.',
      hogar:
        'Quero encontrar o aluguel que melhor serve à minha casa, conforme o que ganhamos e onde trabalhamos ou estudamos. Que dados você precisa para começar?',
      oportunidadesAlquiler:
        'Quais aluguéis estão hoje mais baratos que imóveis parecidos do mesmo bairro? Mostre os melhores com os links.',
      oportunidadesVenta:
        'Quais imóveis à venda pedem hoje menos que outros parecidos do mesmo bairro? Mostre os melhores com os links.',
      autos:
        'Procuro um carro usado. Quais valem o preço e por quê? Mostre os melhores com os links.',
      oportunidadesAutos:
        'Quais carros usados estão anunciados hoje abaixo do que pedem por carros iguais? Mostre os que valem a pena com os links.',
      equipar:
        'Vou me mudar e preciso equipar a casa. Quanto custa o básico e onde compro mais barato?',
      celulares:
        'Procuro um celular com bom custo-benefício. Qual me convém e onde está mais barato?',
      sillas:
        'Procuro uma cadeira de escritório confortável para trabalhar muitas horas. Qual me convém e onde está mais barata?',
      monopatines: 'Procuro um patinete elétrico. Qual tem o melhor preço e onde está mais barato?',
      bicicletas:
        'Procuro uma bicicleta elétrica. Qual tem o melhor preço e onde está mais barata?',
      super: 'Em qual supermercado a compra do mês sai mais barata?',
    },
    qf: {
      alquiler:
        'Procuro um aluguel com estes filtros: {filters}. Quais me convêm mais e por quê? Mostre os melhores com os links.',
      autos:
        'Procuro um carro usado com estes filtros: {filters}. Quais valem o preço e por quê? Mostre os melhores com os links.',
    },
  },
}

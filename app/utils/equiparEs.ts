import type { EquiparCopy } from './equiparCopy'

export const equiparEs: EquiparCopy = {
  eyebrow: 'Vivienda',
  title: 'Cuánto sale equipar una casa vacía en Uruguay',
  shortTitle: 'Equipar la casa',
  description:
    'Qué comprar primero para una vivienda sin amueblar y cuánto sale hoy: 38 categorías con precios de tiendas uruguayas, Mercado Libre y Facebook Marketplace, ordenadas por necesidad y con tres presupuestos armados.',
  intro:
    'Conseguiste el alquiler y está vacío. Esta página ordena qué comprar primero, con el precio de mercado de hoy al lado de cada cosa, el precio de usado cuando existe, y tres canastas ya sumadas para que no tengas que hacer la cuenta.',
  navLabel: 'Secciones de la página',
  nav: [
    { id: 'canastas', label: 'Cuánto sale' },
    { id: 'ranking', label: 'Qué comprar primero' },
    { id: 'calculadora', label: 'Con lo que tengo' },
    { id: 'consejos', label: 'Lo que ningún precio dice' },
    { id: 'metodo', label: 'De dónde salen los precios' },
  ],

  quickTitle: 'Cuánto sale',
  quickIntro:
    'Tres formas de equipar la misma casa. La mínima compra usado donde el usado es sano; la decente compra nuevo de entrada de gama; la completa suma lo que se puede postergar y compra al precio del medio del mercado.',
  basketBlurbs: {
    minima: 'Sólo lo que no se puede postergar, comprando usado donde conviene.',
    decente: 'Lo anterior más lo de las primeras semanas, todo nuevo de entrada de gama.',
    completa: 'Agrega lo que se compra cuando hay resto, al precio del medio del mercado.',
  },
  basketPartial: 'Total parcial',
  basketMissing: 'Sin precio esta semana: {items}. El total de arriba no los incluye.',
  basketComplete: 'Todas las categorías de esta canasta tienen precio.',
  basketItems: '{n} cosas',
  perMonth: 'equivale a {amount} por mes durante un año',

  tierTitle: 'Qué comprar primero',
  tierIntro:
    'El orden mide necesidad, no precio ni popularidad: arriba está lo que hace que la casa funcione, abajo lo que se puede postergar meses sin consecuencias. Cada fila dice por qué está donde está.',
  tierNames: {
    S: { name: 'Sin esto la casa no funciona', blurb: 'El primer día, sin discusión.' },
    A: { name: 'Primeras semanas', blurb: 'Se aguanta unos días y después no.' },
    B: { name: 'Cuando hay resto', blurb: 'Mejora la casa; nada deja de andar sin ello.' },
    C: {
      name: 'Puede esperar meses',
      blurb: 'Casi siempre hay algo más barato que hace lo mismo.',
    },
  },
  colItem: 'Qué',
  colNew: 'Nuevo',
  colUsed: 'Usado',
  colSaving: 'Ahorro',
  colWhy: 'Por qué acá',
  noData: 'sin precio esta semana',
  noUsedData: 'sin datos suficientes de usado',
  usedNotAdvised: 'usado no recomendado',
  quantityLabel: 'se compran {n}',
  observations: '{n} precios relevados',

  calcTitle: 'Con lo que tengo, ¿hasta dónde llego?',
  calcIntro:
    'Poné cuánto tenés y bajá en orden de necesidad. No reordena para que te entren más cosas: comprar seis cosas baratas en vez de la heladera llena la lista y te deja sin heladera.',
  calcBudget: 'Cuánto tengo (pesos)',
  calcAcceptUsed: 'Acepto comprar usado',
  calcOwnedTitle: 'Esto ya lo tengo',
  calcOwnedHint: 'Tildá lo que no necesitás comprar y se descuenta del plan.',
  calcReach: 'Con {budget} llegás hasta acá',
  calcCut: 'Acá se te corta la plata: {item}',
  calcCovered: 'Cubrís {n} de {total} categorías',
  calcLeftover: 'Te sobran {amount}',
  calcMissing: 'Te faltan {amount} para completar el resto',
  calcEmpty: 'Escribí un monto para ver hasta dónde llega.',
  reset: 'Limpiar',

  notesTitle: 'Lo que ningún precio te dice',
  notesIntro:
    'Cuatro cosas que salen de la experiencia y no de una planilla. Las tres primeras las discutió el hilo de r/uruguay que originó esta página.',
  notes: [
    {
      title: 'La tabla de picar, de madera',
      text: 'De metal o de vidrio le come el filo al cuchillo bastante rápido, y el cuchillo sale más que la tabla. Cuanto más gruesa, menos se tuerce; las de bambú están bien de precio.',
    },
    {
      title: 'Pocas ollas y buenas, no muchas y malas',
      text: 'El fondo fino quema todo y no se arregla. Con una olla grande, una chica y una sartén se cocina casi cualquier cosa.',
    },
    {
      title: 'El aire acondicionado ya deshumidifica',
      text: 'Tiene modo dry, y en realidad cualquiera de sus modos seca el aire. No son idénticos —el deshumidificador junta el agua en un tanque— pero para humedad normal no hace falta comprar los dos.',
    },
    {
      title: 'El colchón usado es la excepción',
      text: 'Es la única cosa de esta lista donde la opción barata es el mal consejo: chinches, ácaros, y un hundimiento que no se ve hasta que dormís encima. En todo lo demás, el usado es un mercado real.',
    },
  ],
  threadCredit: 'Hilo original en r/uruguay',

  methodTitle: 'De dónde salen los precios',
  method: [
    'Se leen dieciséis tiendas uruguayas por su propio catálogo publicado, Mercado Libre y Facebook Marketplace. Los precios en dólares se pasan a pesos con la cotización del día para que las filas se puedan comparar.',
    'Nuevo y usado nunca se promedian: son dos mercados distintos y mezclarlos da un número que no describe a ninguno. El ahorro sólo se publica cuando las dos patas tienen observaciones suficientes.',
    'Cada categoría tiene su propia banda de precios por percentiles, no un factor fijo: el spread real de un sartén no es el de una heladera. Una fila muy por debajo de su propia banda queda marcada y nunca encabeza.',
    'Si a una canasta le falta una categoría, el total se publica como parcial y se dice cuál falta. Un total al que le falta la heladera es más bajo que la verdad y se lee como una ganga.',
  ],
  sourcesLabel: 'Fuentes de esta corrida',

  faqTitle: 'Preguntas',
  faq: [
    {
      q: '¿Cuánto sale amueblar una casa en Uruguay?',
      a: 'Depende de qué compres y en qué estado. Esta página arma tres canastas con precios del mercado de hoy: la mínima con lo imprescindible comprando usado donde conviene, la decente con todo nuevo de entrada de gama, y la completa con lo que se compra cuando hay resto.',
    },
    {
      q: '¿Qué se compra primero en una casa vacía?',
      a: 'Heladera, colchón, algo para cocinar y lo mínimo para comer y limpiar. Todo eso es el tier S de esta página: sin ello la casa no funciona. El lavarropas, el microondas y la mesa vienen después.',
    },
    {
      q: '¿Conviene comprar los electrodomésticos usados?',
      a: 'En general sí, y el ahorro medido está en cada fila. La excepción es el colchón. En heladera y lavarropas pedí verlos funcionando: el compresor y el centrifugado son lo que se muere y no se ve en la foto.',
    },
    {
      q: '¿Los precios están actualizados?',
      a: 'Se releva todos los días, y cada fila dice cuántos precios se relevaron. Una categoría que dejó de tener precios frescos no se muestra con un precio viejo: se muestra como sin precio.',
    },
  ],

  updated: 'Precios relevados el {date}',
  noPrices:
    'No hay precios disponibles en este momento. La lista de qué comprar y en qué orden sigue siendo válida.',
  relatedTitle: 'Seguí leyendo',
  related: [
    {
      to: '/primer-alquiler-uruguay',
      label: 'Primer alquiler',
      hint: 'Gastos y trámites de la firma',
    },
    { to: '/alquileres-uruguay', label: 'Alquileres', hint: 'El directorio de avisos' },
    { to: '/plan-de-vida-uruguay', label: 'Plan de vida', hint: 'El orden de cada peso' },
    {
      to: '/sillas-escritorio-uruguay',
      label: 'Sillas de escritorio',
      hint: 'El mismo relevamiento, en detalle',
    },
    {
      to: '/precios-de-supermercado-uruguay',
      label: 'Precios de supermercado',
      hint: 'Lo que sale llenar la heladera',
    },
    {
      to: '/conviene-comprar-en-cuotas',
      label: 'Cuotas o contado',
      hint: 'Si financiar lo caro conviene',
    },
  ],
}

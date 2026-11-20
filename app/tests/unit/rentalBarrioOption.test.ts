import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  rentalAddressLike,
  rentalBarrioOptionPlausible,
  rentalOfferableZoneIds,
} from '../../utils/rentalBarrioOption'

// The 100 names the Montevideo barrio selector offered on 2026-11-08, before reading past the
// first 250: none is an address.
const MONTEVIDEO = [
  'Cordón',
  'Centro',
  'Pocitos',
  'Punta Carretas',
  'Ciudad Vieja',
  'La Blanqueada',
  'Tres Cruces',
  'Carrasco',
  'Malvín',
  'Buceo',
  'Parque Batlle',
  'Aguada',
  'Parque Rodó',
  'Unión',
  'Palermo',
  'Pocitos Nuevo',
  'Prado',
  'Puerto Buceo',
  'Barrio Sur',
  'Carrasco Norte',
  'La Comercial',
  'Colón',
  'Malvín Norte',
  'Brazo Oriental',
  'Punta Gorda',
  'Sayago',
  'Jacinto Vera',
  'Goes',
  'La Teja',
  'Reducto',
  'Maroñas',
  'Nuevo París',
  'Paso Molino',
  'Bella Vista',
  'Belvedere',
  'Cerrito',
  'Cerro',
  'Villa Muñoz',
  'Villa Española',
  'Villa Biarritz',
  'Capurro',
  'Peñarol',
  'Flor de Maroñas',
  'Aires Puros',
  'Larrañaga',
  'Paso de la Arena',
  'Mercado Modelo',
  'Manga',
  'Atahualpa',
  'Perez Castellanos',
  'Piedras Blancas',
  'Golf',
  'Lezica',
  'La Figurita',
  'Ituzaingó',
  'Jardines del Hipódromo',
  'Villa Dolores',
  'Parque Miramar',
  'Conciliación',
  'Las Acacias',
  'Arroyo Seco',
  'Punta Rieles',
  'Barrio Parques',
  'Bella Italia',
  'Curva',
  'Barrio San Nicolás',
  'Jardines Hipódromo',
  'Paso De Las Duranas',
  'Bañados De Carrasco',
  'Capurro Bella Vista',
  'Barra de Carrasco',
  'Cerrito de la Victoria',
  'Prado Nueva Savona',
  'Las Canteras',
  'Villa García',
  'Melilla',
  'B. DE CARRASCO',
  'Bolivar',
  'Carrasco Este',
  'Casavalle',
  'Jardines de Carrasco',
  'Punta de Rieles',
  'Abayubá',
  'Casabo',
  'Colon Sureste Abayuba',
  'Pajas Blancas',
  'La Paloma',
  'Tres Ombues Pblo Victoria',
  'Bolivar M. Modelo',
  'MAROÑAS CURVA',
  'Toledo Chico',
  'Tres Ombúes',
  'Villa García Manga Rural',
  'Castro',
  'Colón Centro y Noroeste',
  'Colón Sureste',
  'Cruz de Carrasco',
  'J. HIPODROMO',
  'PRADO NORTE',
  'Pueblo Victoria',
]

// Places of the interior the selector offered that day, the tricky ones included.
const INTERIOR_PLACES = [
  // Canelones
  'Ciudad De La Costa',
  'Lomas De Solymar',
  'Lomas Solymar 1.',
  'Sn J. Carrasco Nte',
  'Sn J. Carrasco Sur',
  'Pinamar Y Pinepark',
  'José Batlle Y Ordóñez',
  'General Líber Seregni',
  'Pque. Plata Sur',
  'Est. Atlántida',
  'Aeropuerto Internacional De Carrasco',
  'Barrios Privados',
  'Santa Lucía Del Este',
  'Quinta Los Horneros',
  'centro',
  // Maldonado
  'Punta del Este',
  'Playa Mansa',
  'Península',
  'Brava | Lobos',
  'P. Coloradas',
  'Punta Del Este - Cantegril',
  'Puntas De Pan De Azucar',
  'Jardín De Los 33',
  'Barrio 4H',
  'Sauce De Portezuelo',
  'Maldonado',
  'Centro.',
  'Camino Eguzquiza',
  'Camino  Eguzquiza',
  // The rest
  'Dieciocho De Julio',
  '18 De Julio',
  '25 DE MAYO',
  '19 De Abril',
  '25 De Agosto',
  'Sarandí del Yí',
  'José Pedro Varela',
  'Barra do Chui Brasil',
  'Termas Del Dayman',
  'San Gregorio De Polanco',
  'Solís De Mataojo',
  'Delta Del Tigre',
  'Zona Plaza Independencia',
  'Bella Unión',
  'Treinta y Tres',
  // Towns that pin the anchors: a number inside a name, a filler word that does not open it.
  'Colonia 18 de Julio',
  'Poblado Uruguay',
  'SÃO GABRIEL',
]

// Real places whose official name reads like an address: Mercado Libre prints them where the
// barrio goes (its location tree), and INE, the Intendencia de Montevideo and OpenStreetMap use them.
const NAMED_LIKE_AN_ADDRESS = [
  'Fracc. Cno. Andaluz Y R.84',
  'Fracc Sobre Ruta 74',
  'Fraccionamiento sobre Ruta 74',
  'Ruta 37 Y 9',
  'Ruta 37 y 9 - Sierras del Tirol',
  'Radial Ruta 3',
  'Pje. Paso Campamento',
  'Camino De La Cadena',
  'Camino Dodera',
  'Camino Lloveras',
  'Esquina Gonzalez',
  'La Lata Ruta 3 (Km. 375)',
  'La Paz (Ruta 3 Km. 346)',
  'Kilometro 18',
  'Km 110',
  'Plano 291',
  'Cota 205',
  'La Bolsa 01',
  'La Bolsa 02',
  'La Bolsa 03',
  'Km 16 Cno. Maldonado',
  'Km. 16 Cno. Maldonado',
  'Cno. el Tapir',
  'Condominio 11',
  'Municipal 18',
  'Barrio 2000',
  'Barrio IC 10',
  'Villa La Ruta',
  'Calafí 1 y 2',
  'Ruta 67 (Barrio Campistegui)',
  'Rambla',
  'Euskal Erría 70',
  'Asentamiento R.6 Km 24.500',
  'MEVIR 7',
]

// A settlement's name may end in a street type or a number; each prefix is exercised.
const SETTLEMENTS = [
  'MEVIR 25',
  'Cooperativa Covipro Ruta 8',
  'Complejo America Av. Italia',
  'Asentamiento Ruta 5',
  'Condominio Los Pinos 12',
  'Barrio 33 Orientales Camino',
  'Villa Ruta 9',
  'Euskalerria 92',
]

// Addresses and filler the selectors offered that day, by the mark that gives each away.
const ADDRESSES = [
  // A street type
  'ruta 39',
  'Ruta 62',
  'Av. Leandro Gómez',
  'AV.APARICIO SARAVIA',
  'Avda. Roosevelt',
  'AV ROOSEVELT',
  'Avenue Alfredo Zitarrosa',
  'CALLE GRANJA FERREIRO',
  'Camino Carrasco',
  'Cno. Zanja De Chavez Y Ruta 9',
  'Fatima Y Cno. Brunel',
  'Pasaje L Y Fco Mazzoni',
  'Principal Avenida',
  'Rambla Costanera',
  // A corner or a reference
  '25 De Mayo Esquina Yerbal',
  '18 De Julio Esq. Dr. Edye',
  'Rbla. Rep. De México Esq. 6 De Abril',
  'JOSE PEDRO VARELA ENTRE SOLIS Y ZELMAR MICHELINI',
  'Sarandí Casi Ventura Alegre',
  'VICENZA CASI GENOVA',
  'Pasando Sodimac RUTA 39',
  'Frente Al Complejo Polo Del Este',
  'Frente A Atlantico',
  'Misiones & Sarandí',
  'Calle Blandengues & Inca',
  'Cecilia Burgueño Y 18 De Julio',
  'Sarandí Y 25 De Mayo',
  '18 DE JULIO Y TRISTAN NARVAJA',
  // A door
  'Sarandí 888',
  'Uruguay 711',
  'W. Beltrán 363',
  'Tell Ramis 88',
  'Río San Salvador 18',
  'JACKSON 1100',
  'Av. De Las Americas Al 7700',
  '6 De Julio De 1784 1700',
  'Roosevelt 0',
  'José Pedro Varela 0',
  '19 De Abril/306',
  'Centro S/18',
  'Jose Palomeque Nº 1988',
  'Ruta 90 Km. 7.8 S/N',
  'Andresito 1447 Apto 04',
  'Cerrito 1183/II Apto 05',
  'Camino A Las Rosas Sin Numero SN',
  'Luis Alberto De Herrera Y Ruta Perimetral Nro.',
  // Punta del Este's paradas
  'Pda. 37 Mansa',
  'Pda 34.',
  'Parada 17 De Avenida Roosevelt',
  // A broken date, a copy, a broken spelling
  '0 De Abril',
  'Zona Estadio Duplicado',
  'Ruta 62 Duplicado',
  'MalvÃ\u00ADn Norte',
  // Filler
  'Otras',
  'otra',
  'otras',
  'Otros Barrios',
  'PEDIME INFO',
  'Nuevo !!',
  'Nuevo !',
  'Doble Altura !!',
  'ALQUILER - TRES CRUCES - VENTURA GO!',
  'Excelente Ubicación',
  'Dentro De La Ciudad',
  'Zona Céntrica',
  'CENTRICA',
  'Uruguay.',
  // A settlement's name keeps the other marks of an address
  'Villa Biarritz Esq. Ellauri',
  'Complejo America Torre 2 Apto 501',
  'Barrio Nuevo !!',
  'Villa Munoz S/N',
  'Barrio Jardin & Calle 5',
  'Barrios Amorin 1234',
  // A settlement word inside an address does not make it a settlement's name
  'Ruta 8 Villa Garcia',
]

describe('rentalBarrioOptionPlausible: what the barrio and zone selectors offer', () => {
  it('keeps every Montevideo barrio', () => {
    expect(MONTEVIDEO).toHaveLength(100)
    for (const name of MONTEVIDEO) expect(rentalBarrioOptionPlausible(name), name).toBe(true)
  })

  it('keeps the places of the interior, those named after a person or a date included', () => {
    for (const name of INTERIOR_PLACES) expect(rentalBarrioOptionPlausible(name), name).toBe(true)
  })

  it('keeps the real places whose name reads like an address', () => {
    for (const name of NAMED_LIKE_AN_ADDRESS) {
      expect(rentalAddressLike(name), name).toBe(false)
      expect(rentalBarrioOptionPlausible(name), name).toBe(true)
    }
  })

  it("lets a settlement's name carry a street type or a number", () => {
    for (const name of SETTLEMENTS) expect(rentalAddressLike(name), name).toBe(false)
  })

  it('drops a street address and the portal filler', () => {
    for (const name of ADDRESSES) {
      expect(rentalAddressLike(name), name).toBe(true)
      expect(rentalBarrioOptionPlausible(name), name).toBe(false)
    }
  })

  it('drops each kind of address by its own mark', () => {
    // Each of these is caught by one mark only, so removing that mark fails here.
    for (const name of [
      'Ruta 9', // a street type, with a one-digit number
      'Rbla. Mansa',
      'Bulevar Artigas',
      'Bvar. Espana',
      'Bv.Artigas',
      'Diagonal Rondeau',
      'Av, Roosevelt', // a street type before punctuation
      'Av: Roosevelt',
      'Yerbal Esq:Rondeau', // a corner word before punctuation
      'Yerbal Esq/Rondeau',
      'Esq. Yerbal y Rondeau', // a corner word that opens the name
      'Mansa Pasando La Parada', // a reference
      'Leandro Gómez S/N', // the door marks
      'S/N Sarandí',
      'Palomeque Nº',
      'Palomeque N° 5',
      'Palomeque Nro 5',
      'Sarandí Sin Número',
      'Andresito Apto 4',
      'Andresito Apt 4',
      'San Carlos 1234', // "los" closes "Carlos", not the word "los"
      'Sarandí 888.', // a door number with a trailing dot
      'Parada 3 Mansa',
      '5 De Mayo Y Rondeau', // a one-digit date on the left of a corner
      '00 De Abril',
      'Zona Duplicada',
      '¡Oportunidad',
    ]) {
      expect(rentalAddressLike(name), name).toBe(true)
    }
  })

  it('reads a name however it is written: accents, case, spaces, invisible characters', () => {
    expect(rentalAddressLike('Zona Ce\u0301ntrica')).toBe(true) // decomposed (NFD)
    expect(rentalAddressLike(' Otras ')).toBe(true)
    expect(rentalAddressLike('  Sarandí   888 ')).toBe(true)
    for (const invisible of ['\u00AD', '\u200C', '\u200D', '\u2060', '\uFEFF']) {
      expect(rentalAddressLike(`Otras${invisible}`), JSON.stringify(invisible)).toBe(true)
    }
    expect(rentalAddressLike('Ave\u00ADnida Roosevelt')).toBe(true)
    expect(rentalAddressLike('Sarandí\u200B888')).toBe(true) // zero-width space
    expect(rentalBarrioOptionPlausible('Jardi\u00ADn Pinares')).toBe(true)
    expect(rentalAddressLike('Punta del Este')).toBe(false)
  })

  it('still drops what the barrio pages drop, and never throws', () => {
    for (const name of ['40 m2 40 m2', '10 m2', '4 H', '1234', 'Uruguay', '', '  ']) {
      expect(rentalBarrioOptionPlausible(name), name).toBe(false)
    }
    for (const value of [undefined, null, 42, {}, []]) {
      expect(rentalAddressLike(value)).toBe(false)
      expect(rentalBarrioOptionPlausible(value)).toBe(false)
    }
  })
})

describe('the zone selector', () => {
  it('offers the zones whose name is a barrio, by id', () => {
    const zone = (id: string, neighborhood: string) => ({
      id,
      ref: { department: 'Maldonado', neighborhood },
    })
    expect(
      rentalOfferableZoneIds([
        zone('a', 'Punta del Este'),
        zone('b', 'Sarandí 888'),
        zone('c', '40 m2 40 m2'),
        zone('d', 'Camino Eguzquiza'),
        zone('e', 'Uruguay'),
      ])
    ).toEqual(new Set(['a', 'd']))
  })

  it('lists offerable zones plus the ones picked now or when it opened', () => {
    const explorer = readFileSync(
      join(__dirname, '../../components/rentals/zones/Explorer.vue'),
      'utf8'
    )
    expect(explorer).toMatch(
      /const offerableZoneIds = computed\(\(\) => rentalOfferableZoneIds\(data\.value\?\.zones \|\| \[\]\)\)/
    )
    expect(explorer).toMatch(
      /const pickedOnOpen = new Set\(\[\.\.\.props\.initial\.include, \.\.\.props\.initial\.exclude\]\.map\(key\)\)/
    )
    expect(explorer).toMatch(/new Set\(\[\.\.\.pickedOnOpen, \.\.\.\[\.\.\.draft\.value\.include, /)
    expect(explorer).toMatch(
      /\(offerableZoneIds\.value\.has\(zone\.id\) \|\| pickedKeys\.value\.has\(key\(zone\.ref\)\)\) &&/
    )
  })
})

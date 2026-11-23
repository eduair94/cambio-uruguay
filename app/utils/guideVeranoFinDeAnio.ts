// 2026-11-23: trabajar-el-24-y-31-de-diciembre-uruguay. La pregunta vuelve cada diciembre y el
// sitio no tenía dónde contestarla: `/feriados-que-se-corren-uruguay` publica la lista de feriados y
// la regla del corrimiento, y `/guias/feriados-en-uruguay-como-se-pagan` la regla de pago, pero
// ninguna de las dos dice que el 24 y el 31 NO son feriados, que es lo que se busca.
//
// La respuesta es una negación verificable —ninguna de las dos fechas figura en el artículo 2 de la
// Ley 16.805 ni entre los cinco feriados pagos del artículo 18 de la Ley 12.590— más el mecanismo
// real del medio día, que es el convenio del grupo de Consejo de Salarios (art. 5 de la Ley 10.449)
// y no una norma general. Verificado el 2026-11-23 contra IMPO (las tres leyes) y el MTSS (la página
// «Feriados» del derecho laboral uruguayo, la sección de Consejos de Salarios y la ficha del trámite
// «Consulta laboral y salarial»).
//
// NO PUBLICA NINGÚN MONTO y no afirma qué dice ningún convenio en particular: eso pediría leer y
// fechar decenas de grupos y subgrupos. Los datos y la derivación desde la lista de la ley viven en
// `utils/finDeAnioLaboral.ts`, con su test; esta guía los compone.
import {
  FIN_DE_ANIO_FAQ,
  FIN_DE_ANIO_FECHAS,
  FIN_DE_ANIO_PASOS,
  FIN_DE_ANIO_SOURCES,
} from './finDeAnioLaboral'
import type { Guide } from './guides'

const estado = (fecha: (typeof FIN_DE_ANIO_FECHAS)[number]) =>
  fecha.feriado ? (fecha.feriado.pago ? 'Feriado pago' : 'Feriado laborable') : 'No es feriado'

export const finDeAnioLaboralGuide: Guide = {
  slug: 'trabajar-el-24-y-31-de-diciembre-uruguay',
  title: '¿Se trabaja el 24 y el 31 de diciembre?',
  description:
    'Sí: no son feriados. No están en la Ley 16.805, así que por ley no hay medio día ni paga doble. El medio día lo pone el convenio de tu grupo.',
  tag: 'Feriados',
  updatedAt: '2026-11-23',
  sections: [
    {
      heading: 'La respuesta corta: los dos son días laborables',
      body: 'El artículo 2 de la Ley 16.805 enumera los feriados uruguayos, y ni el 24 ni el 31 de diciembre están en esa lista. O sea que por ley son días de trabajo comunes: no hay medio día, no hay cierre obligatorio y no hay recargo por trabajarlos. Los feriados de esa semana son el 25 de diciembre —el Día de la Familia— y el 1.º de enero, y los dos son además feriados pagos. Si en tu trabajo igual te dan medio día, eso existe: sale del convenio de tu grupo de Consejo de Salarios, que es otro lugar y se puede consultar.',
      links: [
        { label: 'Qué feriados se corren al lunes', to: '/feriados-que-se-corren-uruguay' },
        { label: 'Los feriados de 2027', to: '/feriados-2027-uruguay' },
      ],
    },
    {
      heading: 'Las cuatro fechas del fin de año, una por una',
      body: 'La tabla no decide nada por su cuenta: la columna del medio sale de la misma lista del artículo 2 de la Ley 16.805 que publica la página de los feriados, y la de pago, del artículo 18 de la Ley 12.590, que nombra cinco fechas y sólo cinco: 1.º de enero, 1.º de mayo, 18 de julio, 25 de agosto y 25 de diciembre. En esos cinco días, dice la norma, todo trabajador «percibirá remuneración como si trabajara» y «en caso de trabajar recibirá doble paga».',
      table: {
        headers: ['Fecha', '¿Es feriado?', 'Qué se cobra', 'Norma'],
        rows: FIN_DE_ANIO_FECHAS.map(fecha => [
          fecha.etiqueta,
          estado(fecha),
          fecha.queSeCobra,
          fecha.norma,
        ]),
      },
    },
    {
      heading: 'Cómo se paga el feriado del 25 y el del 1.º',
      body: 'El MTSS lo resume en una línea: «Si el trabajador es jornalero y trabaja un feriado pago recibe doble jornal». Al mensual le corresponde el mes completo más un día, calculado como el sueldo dividido 30. Y conviene saber que en un feriado laborable —los otros cinco del año, como el 6 de enero o el 2 de noviembre— la cuenta es distinta: «Si se trabaja, el jornalero cobrará por ese día, pero al mensual no se le paga más de la cantidad fija». El 25 de diciembre tampoco se corre si cae sábado o domingo: es una de las diez entradas del artículo 2, que «se continuarán observando en el día de la semana que ocurriere, cualquiera que este fuera».',
      links: [
        { label: 'Cómo se pagan los feriados', to: '/guias/feriados-en-uruguay-como-se-pagan' },
        { label: 'Horas extras', to: '/horas-extras-uruguay' },
      ],
    },
    {
      heading: 'El medio día no es una ley: es tu convenio',
      body: 'El artículo 5 de la Ley 10.449 habilita a los Consejos de Salarios a fijar condiciones de trabajo cuando lo acuerdan las delegaciones de empleadores y de trabajadores del grupo, y esas decisiones rigen una vez que el Poder Ejecutivo las registra y publica. Ahí —y no en la ley de feriados— aparecen la media jornada del 24 y del 31, la hora de cierre o, en algunas ramas, esos días declarados feriado pago para la actividad. Un grupo puede tenerlo escrito y el de al lado no, y ninguno de los dos está equivocado: por eso la respuesta general es «no es feriado» y la respuesta tuya está en tu convenio.',
      links: [
        { label: 'Licencias especiales por ley', to: '/licencias-especiales-uruguay' },
        { label: 'Cuánto me tienen que pagar', to: '/cuanto-me-tienen-que-pagar-uruguay' },
      ],
    },
    {
      heading: 'Lo que esta guía no te puede decir',
      body: 'Si abre tu banco, tu oficina pública o tu supermercado. El horario del 24 y del 31 lo publica cada organismo y cada empresa, año por año, y es una decisión de atención al público: que el día sea laborable no obliga a nadie a abrir el horario completo, igual que un feriado no obliga a nadie a cerrar. Tampoco publicamos qué dice cada convenio, porque son decenas de grupos y subgrupos y afirmarlo pide leer y fechar cada uno. Y acá no vas a encontrar ningún monto: lo que se publica es la regla de pago que la norma escribe, no una cifra de jornal.',
      links: [
        { label: 'Cuándo se cobra el aguinaldo', to: '/cuando-se-cobra-el-aguinaldo-uruguay' },
        { label: 'Salario vacacional', to: '/salario-vacacional-uruguay' },
      ],
    },
  ],
  steps: FIN_DE_ANIO_PASOS.map(paso => ({ name: paso.titulo, text: paso.texto })),
  faqs: FIN_DE_ANIO_FAQ.map(item => ({ q: item.question, a: item.answer })),
  related: [
    { label: 'Qué feriados se corren al lunes', to: '/feriados-que-se-corren-uruguay' },
    { label: 'Los feriados de 2027', to: '/feriados-2027-uruguay' },
    { label: 'Cómo se pagan los feriados', to: '/guias/feriados-en-uruguay-como-se-pagan' },
    { label: 'Licencias especiales', to: '/licencias-especiales-uruguay' },
    { label: 'Cuándo se cobra el aguinaldo', to: '/cuando-se-cobra-el-aguinaldo-uruguay' },
    { label: 'Horas extras', to: '/horas-extras-uruguay' },
  ],
  sources: FIN_DE_ANIO_SOURCES.map(source => ({ ...source })),
}

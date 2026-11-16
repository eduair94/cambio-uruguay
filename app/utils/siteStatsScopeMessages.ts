// The audience switch of /estadisticas-del-sitio. Local messages (es/en/pt; every other locale falls
// back) so three sentences do not have to exist in 38 message files.
export const siteStatsScopeMessages = {
  es: {
    scope: {
      aria: 'Qué visitas se cuentan',
      uruguay: 'Lectores en Uruguay',
      all: 'Todos los países',
      noteUruguay: 'Se muestran las visitas desde Uruguay, que es para quien está hecho el sitio.',
      noteAll: 'Se muestran todas las visitas que midió Google Analytics, de cualquier país.',
      abroad:
        'En esta ventana, el {share} de las sesiones llegó desde otros países y el {bounce} de ellas terminó sin interacción (una sola página, menos de diez segundos): el patrón del tráfico automatizado.',
    },
  },
  en: {
    scope: {
      aria: 'Which visits are counted',
      uruguay: 'Readers in Uruguay',
      all: 'All countries',
      noteUruguay: 'Showing visits from Uruguay, the audience this site is built for.',
      noteAll: 'Showing every visit Google Analytics measured, from any country.',
      abroad:
        'In this window {share} of sessions came from other countries, and {bounce} of those ended without engagement (a single page, under ten seconds): the pattern of automated traffic.',
    },
  },
  pt: {
    scope: {
      aria: 'Quais visitas são contadas',
      uruguay: 'Leitores no Uruguai',
      all: 'Todos os países',
      noteUruguay:
        'Mostrando as visitas a partir do Uruguai, o público para quem o site foi feito.',
      noteAll: 'Mostrando todas as visitas que o Google Analytics mediu, de qualquer país.',
      abroad:
        'Nesta janela, {share} das sessões veio de outros países e {bounce} delas terminou sem interação (uma única página, menos de dez segundos): o padrão do tráfego automatizado.',
    },
  },
}

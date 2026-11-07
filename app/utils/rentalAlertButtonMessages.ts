// The only texts the alert trigger button shows. They live apart from rentalAlertMessages,
// which spreads in every rental and opportunity message (~120 KB of JS together), because the
// button sits on every directory page (autos, motos, ventas…) while the rest is only needed
// once the alert dialog opens. rentalAlertMessages spreads these back in: one source.
export const rentalAlertButtonMessages = {
  es: {
    createAlert: 'Crear alerta',
    notify: 'Avisarme',
    unsupportedFilter:
      'Algún filtro no está disponible para alertas. La búsqueda no se modificó; revisá los filtros antes de volver a intentar.',
  },
  en: {
    createAlert: 'Create alert',
    notify: 'Notify me',
    unsupportedFilter:
      'A filter is not available for alerts. Your search was not changed; review the filters and try again.',
  },
  pt: {
    createAlert: 'Criar alerta',
    notify: 'Me avise',
    unsupportedFilter:
      'Algum filtro não está disponível para alertas. A busca não mudou; confira os filtros e tente novamente.',
  },
}

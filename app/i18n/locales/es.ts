import json from './json/es.json'
import { readerFollowUpMessages } from './readerFollowUp'
import { engagementAccountMessages } from './engagementAccount'
import { externalNavigationMessages } from './externalNavigation'
export default defineI18nLocale(async _locale => {
  return {
    ...json,
    readerFollowUp: readerFollowUpMessages.es,
    engagementAccount: engagementAccountMessages.es,
    externalNavigation: externalNavigationMessages.es,
  }
})

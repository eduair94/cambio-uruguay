import json from './json/pt.json'
import { readerFollowUpMessages } from './readerFollowUp'
import { engagementAccountMessages } from './engagementAccount'
import { externalNavigationMessages } from './externalNavigation'
export default defineI18nLocale(async _locale => {
  return {
    ...json,
    readerFollowUp: readerFollowUpMessages.pt,
    engagementAccount: engagementAccountMessages.pt,
    externalNavigation: externalNavigationMessages.pt,
  }
})

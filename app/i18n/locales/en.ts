import json from './json/en.json'
import { readerFollowUpMessages } from './readerFollowUp'
import { engagementAccountMessages } from './engagementAccount'
import { externalNavigationMessages } from './externalNavigation'
export default defineI18nLocale(async _locale => {
  return {
    ...json,
    readerFollowUp: readerFollowUpMessages.en,
    engagementAccount: engagementAccountMessages.en,
    externalNavigation: externalNavigationMessages.en,
  }
})

import { describe, expect, it } from 'vitest'
import {
  bankDecisionLinks,
  bankDecisionMessages,
  bankDecisionSources,
} from '../../utils/bankDecisionGuide'
import { getGuide } from '../../utils/guides'

describe('bank decision guide', () => {
  it('sends each banking need to an existing editorial guide', () => {
    expect(new Set(bankDecisionLinks.map(item => item.to)).size).toBe(bankDecisionLinks.length)
    for (const item of bankDecisionLinks) {
      expect(getGuide(item.to.replace('/guias/', ''))).toBeDefined()
    }
  })

  it('has complete translated decisions and source labels', () => {
    for (const messages of Object.values(bankDecisionMessages)) {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(bankDecisionMessages.es).sort())
      for (const item of bankDecisionLinks) {
        for (const text of Object.values(messages[item.id])) expect(text.length).toBeGreaterThan(10)
      }
      for (const source of bankDecisionSources) expect(messages[source.id]).toBeTruthy()
    }
  })
})

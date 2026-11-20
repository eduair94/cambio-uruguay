// composables/useRentalFeedback.ts: what the survey card learns from the server. A follow-up the
// server refuses with 404 (the 30-minute window closed, or the browser lost its id) can never
// succeed on a retry, so the card needs to tell it apart from a failure of the moment.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRentalFeedback } from '../../composables/useRentalFeedback'

const ROW = 'ab12cd34ef56ab12cd34ef56'

afterEach(() => {
  vi.unstubAllGlobals()
})

function withServer(answer: () => Promise<unknown>) {
  const fetchMock = vi.fn(answer)
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('localStorage', {
    getItem: () => 'abcdef123456',
    setItem: () => {},
  })
  return fetchMock
}

describe('the follow-up to a one-tap answer', () => {
  it('reports ok, and sends this browser id with the reasons and the comment', async () => {
    const fetchMock = withServer(async () => ({ ok: true }))
    const result = await useRentalFeedback().followUp(ROW, { reasons: ['caro'], comment: 'x' })
    expect(result).toBe('ok')
    expect(fetchMock).toHaveBeenCalledWith(`/api/rental-feedback/${ROW}`, {
      method: 'PATCH',
      body: { reasons: ['caro'], comment: 'x', clientId: 'abcdef123456' },
    })
  })

  it('reports a row that no longer takes it (404) apart from a failure of the moment', async () => {
    withServer(async () => {
      throw Object.assign(new Error('Not Found'), { statusCode: 404 })
    })
    expect(await useRentalFeedback().followUp(ROW, { reasons: [], comment: 'x' })).toBe('gone')
    withServer(async () => {
      throw Object.assign(new Error('Too many'), { statusCode: 429 })
    })
    expect(await useRentalFeedback().followUp(ROW, { reasons: [], comment: 'x' })).toBe('failed')
    withServer(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await useRentalFeedback().followUp(ROW, { reasons: [], comment: 'x' })).toBe('failed')
  })

  it('never sends a malformed row id', async () => {
    const fetchMock = withServer(async () => ({ ok: true }))
    expect(await useRentalFeedback().followUp('../admin', { reasons: [], comment: 'x' })).toBe(
      'gone'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

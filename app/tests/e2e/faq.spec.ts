import { expect, test } from '@playwright/test'

test.describe('FAQ hub page', () => {
  test('renders questions and FAQPage JSON-LD', async ({ page }) => {
    await page.goto('/preguntas-frecuentes')

    // Visible FAQ block is present with at least one question.
    const block = page.getByTestId('faq-block')
    await expect(block).toBeVisible()
    await expect(block.getByRole('button', { name: /dólar/i }).first()).toBeVisible()

    // FAQPage structured data is in the document.
    const ldJson = await page.locator('script[type="application/ld+json"]').allTextContents()
    const hasFaqPage = ldJson.some(t => t.includes('"FAQPage"') && t.includes('acceptedAnswer'))
    expect(hasFaqPage).toBe(true)
  })
})

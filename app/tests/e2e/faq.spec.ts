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

test.describe('FAQ embeds', () => {
  test('home shows the data-grounded FAQ block (USD + evergreen) with schema', async ({ page }) => {
    await page.goto('/')
    const block = page.getByTestId('faq-block')
    await expect(block).toBeVisible()
    // Home subset = USD live answers + evergreen items.
    await expect(block.locator('[data-faq-id="rate-USD"]')).toBeVisible()
    await expect(block.locator('[data-faq-id="types"]')).toBeVisible()
    // The other currencies' live items are NOT on the home subset.
    await expect(block.locator('[data-faq-id="rate-EUR"]')).toHaveCount(0)
    // Exactly one FAQPage block on the home URL (no duplicate from the old static schema).
    const ldJson = await page.locator('script[type="application/ld+json"]').allTextContents()
    const faqPageCount = ldJson.filter(t => t.includes('"FAQPage"')).length
    expect(faqPageCount).toBe(1)
  })
})

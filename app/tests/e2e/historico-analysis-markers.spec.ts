import { test, expect } from '@playwright/test'

test.describe('historico inline analysis markers (Phase 3)', () => {
  test.setTimeout(120_000)

  test('USD page still renders with no console errors (regression check)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto('/historico/brou/USD')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 })
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('EUR page (newly supported) renders with no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto('/historico/brou/EUR')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 })
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('ARS page (newly supported) renders with no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto('/historico/brou/ARS')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 })
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('unsupported currency (BRL) renders unchanged with no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto('/historico/brou/BRL')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 })
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })
})

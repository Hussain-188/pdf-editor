import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should display upload area', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/upload/i).first()).toBeVisible()
  })

  test('should navigate to login', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Sign In')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should navigate to register from login', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=Register')
    await expect(page).toHaveURL(/\/register/)
  })
})

test.describe('Authentication', () => {
  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.getByText(/invalid|error|failed/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('should redirect unauthenticated user from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })
})

test.describe('Tools Page', () => {
  test('should display available tools', async ({ page }) => {
    await page.goto('/tools')
    await expect(page.getByText('Compress PDF')).toBeVisible()
    await expect(page.getByText('Add Watermark')).toBeVisible()
    await expect(page.getByText('Protect PDF')).toBeVisible()
  })

  test('should open tool workflow', async ({ page }) => {
    await page.goto('/tools')
    await page.click('text=Compress PDF')
    await expect(page.getByText('Image Quality')).toBeVisible()
  })
})

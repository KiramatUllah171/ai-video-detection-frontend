import { expect, test, type Page } from '@playwright/test'
import { longName, mockApp } from './fixtures'

const widths = [320, 360, 375, 390, 414, 480, 600, 768, 820, 1024, 1280, 1366, 1440, 1920, 2560]
const routes = ['/', '/about', '/contact', '/privacy-policy', '/terms-and-conditions', '/login', '/signup', '/forgot-password', '/reset-password?token=fixture', '/confirm-email?token=fixture', '/dashboard', '/upload', '/processing/10', '/analysis/10', '/admin/dashboard', '/admin/users', '/admin/videos', '/admin/videos/10', '/admin/requests', '/admin/logs']

async function expectContained(page: Page) {
  const measurements = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth
    const outside = Array.from(document.querySelectorAll('main, .app-card, .table-shell, .chart-shell, .app-modal, header, input:not([type="file"]):not([type="radio"]), select, button, .app-button, .profile-dropdown'))
      .filter((node) => !node.closest('.table-shell table, .chart-shell .admin-chart'))
      .filter((node) => node.getClientRects().length)
      .map((node) => ({ tag: node.tagName, class: node.className, left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right }))
      .filter((box) => box.left < -1 || box.right > viewport + 1)
    return { viewport, scrollWidth: document.documentElement.scrollWidth, outside }
  })
  expect(measurements.outside, JSON.stringify(measurements)).toEqual([])
  expect(measurements.scrollWidth, JSON.stringify(measurements)).toBeLessThanOrEqual(measurements.viewport + 1)
}

for (const language of ['en', 'ur', 'ps']) {
  for (const path of routes) {
    test(`${language} ${path} fits all target widths and landscape`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await mockApp(page, language)
      await page.goto(path)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('.loading-state')).toHaveCount(0)
      await expect(page.locator('.app-error-boundary')).toHaveCount(0)
      if (path === '/analysis/10') {
        await expect(page.locator('.probability-section')).toBeVisible()
        await page.locator('.technical-details-pulse').click()
        await expect(page.locator('.detector-card').first()).toBeVisible()
      }
      if (path === '/admin/requests') {
        await page.locator('table button').first().click()
        await expect(page.locator('table')).toHaveCount(2)
      }
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 })
        await expectContained(page)
      }
      for (const viewport of [{ width: 667, height: 375 }, { width: 1024, height: 600 }]) {
        await page.setViewportSize(viewport)
        await expectContained(page)
      }
      expect(errors).toEqual([])
    })
  }
}

test('mobile app chrome, RTL switching, theme, profile and admin navigation remain usable', async ({ page }) => {
  await mockApp(page)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/dashboard')
  await expect(page.locator('.topbar')).toBeHidden()
  await expect(page.locator('.mobile-appbar')).toBeVisible()
  await expect(page.locator('.mobile-bottom-nav')).toBeVisible()
  await expect(page.locator('.mobile-record-list')).toBeVisible()
  await expect(page.locator('.desktop-data-table')).toBeHidden()
  await expectContained(page)
  await page.locator('.mobile-bottom-nav a[href="/upload"]').click()
  await expect(page).toHaveURL(/\/upload$/)
  await expect(page.locator('.upload-dropzone')).toBeVisible()
  await page.locator('.mobile-appbar').getByRole('button', { name: 'Admin' }).click()
  await expect(page.getByRole('dialog', { name: 'Admin' })).toBeVisible()
  await page.locator('.mobile-sheet-link[href="/admin/users"]').click()
  await expect(page).toHaveURL(/\/admin\/users$/)
  await expect(page.locator('.mobile-record-list')).toBeVisible()
  await page.locator('.mobile-bottom-nav button').click()
  await expect(page.getByRole('dialog', { name: 'Account' })).toBeVisible()
  await page.locator('.mobile-setting-row select').selectOption('ur')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 15000 })
  await page.locator('.mobile-bottom-nav button').click()
  await page.locator('.mobile-settings-list button').first().click()
  await expect(page.locator('html')).toHaveClass(/theme-dark/)
  await expectContained(page)
  await page.setViewportSize({ width: 667, height: 320 })
  const profileBox = await page.locator('.mobile-sheet').boundingBox()
  expect(profileBox!.y + profileBox!.height).toBeLessThanOrEqual(320)
  await expectContained(page)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.reload()
  const tableRegion = page.locator('.table-shell')
  await expect(tableRegion).toHaveAttribute('tabindex', '0')
  await tableRegion.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => tableRegion.evaluate((node) => Math.abs(node.scrollLeft))).toBeGreaterThan(0)
  await expectContained(page)
  await page.locator('.admin-filter-grid input').fill('review')
  await page.locator('.admin-pagination button').last().click()
  await expect(page.locator('.admin-pagination span')).toContainText('2')
})

test('public menu links close the disclosure after navigation', async ({ page }) => {
  await mockApp(page)
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await page.locator('.navigation-toggle').click()
  await page.locator('.public-nav a[href="/contact"]').click()
  await expect(page).toHaveURL(/\/contact$/)
  await expect(page.locator('.public-nav')).toBeHidden()
  await expectContained(page)
})

for (const language of ['en', 'ur', 'ps']) {
  test(`${language} dialogs and upload filenames fit narrow and short viewports`, async ({ page }) => {
    await mockApp(page, language)
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/upload')
    await page.locator('input[type=file]').setInputFiles({ name: longName, mimeType: 'video/mp4', buffer: Buffer.from('test video layout') })
    await expect(page.locator('.selected-file')).toBeVisible()
    await expectContained(page)
    await page.locator('.selected-file button').click()
    await expect(page.locator('.selected-file')).toHaveCount(0)
    await page.goto('/processing/10')
    await expect(page.locator('.status-actions button').first()).toBeVisible()
    await page.locator('.status-actions button').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    for (const viewport of [{ width: 320, height: 568 }, { width: 667, height: 320 }, { width: 1024, height: 600 }]) {
      await page.setViewportSize(viewport)
      await expectContained(page)
      const box = await page.getByRole('dialog').boundingBox()
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
      await expect(page.locator('.app-modal > .app-modal-actions')).toBeInViewport()
    }
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
}

test('subscription dialog keeps footer visible while plans scroll', async ({ page }) => {
  await mockApp(page, 'ps', { exhausted: true, role: 'User' })
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/upload')
  await page.locator('.upload-dropzone button').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  for (const viewport of [{ width: 320, height: 568 }, { width: 600, height: 700 }, { width: 667, height: 320 }]) {
    await page.setViewportSize(viewport)
    await expectContained(page)
    await expect(page.locator('.app-modal > .app-modal-actions')).toBeInViewport()
    if (viewport.height <= 568) {
      expect(await page.locator('.app-modal-body').evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true)
    }
  }
  await page.locator('.app-modal > .app-modal-actions button').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('short-screen signup validation and recovery dialog stay reachable', async ({ page }) => {
  await mockApp(page)
  await page.setViewportSize({ width: 1280, height: 600 })
  await page.goto('/signup')
  await page.locator('#signup-name').fill('Test')
  await page.locator('#signup-email').fill('test@example.test')
  await page.locator('#signup-password').fill('weakpassword')
  await page.locator('#signup-confirm-password').fill('weakpassword')
  await page.locator('button[type=submit]').click()
  await expect(page.locator('#signup-error')).toBeVisible()
  await page.locator('button[type=submit]').scrollIntoViewIfNeeded()
  await expect(page.locator('button[type=submit]')).toBeInViewport()
  await expectContained(page)
  await page.goto('/forgot-password')
  await page.locator('#forgot-email').fill('test@example.test')
  await page.locator('button[type=submit]').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.setViewportSize({ width: 320, height: 480 })
  await expectContained(page)
  await expect(page.locator('.app-modal > .app-modal-actions')).toBeInViewport()
  await page.getByRole('button', { name: 'Got it' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

for (const state of ['empty', 'error'] as const) {
  test(`${state} data layouts fit mobile`, async ({ page }) => {
    await mockApp(page, 'ur', { [state]: true })
    await page.setViewportSize({ width: 320, height: 568 })
    for (const path of ['/dashboard', '/admin/users', '/admin/videos', '/admin/requests', '/admin/logs']) {
      await page.goto(path)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('.loading-state')).toHaveCount(0, { timeout: 15000 })
      await expectContained(page)
    }
  })
}

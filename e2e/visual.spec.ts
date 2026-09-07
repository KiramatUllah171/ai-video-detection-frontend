import { expect, test } from '@playwright/test'
import { mockApp } from './fixtures'

// Reviewable screenshots complement geometry assertions; these are not brittle
// pixel baselines tied to one machine's fonts.
const examples = [
  { route: '/', width: 320, height: 700, language: 'en' },
  { route: '/', width: 1440, height: 900, language: 'en' },
  { route: '/signup', width: 1280, height: 600, language: 'en' },
  { route: '/dashboard', width: 320, height: 700, language: 'ur' },
  { route: '/upload', width: 390, height: 844, language: 'en' },
  { route: '/upload', width: 820, height: 1180, language: 'ps' },
  { route: '/processing/10', width: 375, height: 812, language: 'en' },
  { route: '/analysis/10', width: 390, height: 844, language: 'ur' },
  { route: '/admin/dashboard', width: 1440, height: 900, language: 'en' },
  { route: '/admin/users', width: 360, height: 800, language: 'en' },
  { route: '/admin/videos/10', width: 320, height: 700, language: 'ps' },
]

for (const example of examples) {
  test(`visual ${example.language} ${example.route} at ${example.width}`, async ({ page }, testInfo) => {
    await mockApp(page, example.language)
    await page.setViewportSize(example)
    await page.goto(example.route)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('.loading-state')).toHaveCount(0)
    const clippedText = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>(
      'h1, h2, h3, p, .app-button, .nav-link, .public-nav-link, .form-helper, .form-error, .detector-card, .subscription-metric',
    )).filter((node) => node.getClientRects().length && node.clientWidth > 0 && !node.closest('table'))
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      .map((node) => ({ class: node.className, text: node.textContent?.slice(0, 80) })))
    expect(clippedText).toEqual([])
    await page.screenshot({ path: testInfo.outputPath('page.png'), fullPage: true, animations: 'disabled' })
  })
}

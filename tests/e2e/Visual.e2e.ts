import { expect, takeSnapshot, test } from '@chromatic-com/playwright';

test.describe('Visual testing', () => {
  test.describe('Static pages', () => {
    test('should take screenshot of the homepage', async ({ page }, testInfo) => {
      await page.goto('/');

      await expect(page.getByText('Built for multi-tenant organizations')).toBeVisible();

      await takeSnapshot(page, testInfo);
    });

    test('should take screenshot of the French homepage', async ({ page }, testInfo) => {
      await page.goto('/fr');

      await expect(page.getByText('Conçu pour les organisations multi-tenant')).toBeVisible();

      await takeSnapshot(page, testInfo);
    });
  });
});

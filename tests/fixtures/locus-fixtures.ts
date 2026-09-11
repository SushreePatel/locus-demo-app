/**
 * locus-fixtures.ts — Locus zero-boilerplate Playwright fixture extension
 *
 * Automatically captures the DOM snapshot on test failure and attaches it
 * as `locus-dom-snippet`. The reporter then auto-extracts the broken locator,
 * POM path, and element ID from error logs and AST inspection.
 */

import { test as baseTest } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import * as fs from 'fs';


export const test = baseTest.extend<{ page: Page }>({
  page: async ({ page }, use, testInfo: TestInfo) => {
    await use(page);

    // Auto-teardown: capture DOM only if the test failed
    if (testInfo.status !== testInfo.expectedStatus) {
      try {
        const dom = await page.content();
        const domPath = testInfo.outputPath('dom-snippet.html');
        await fs.promises.writeFile(domPath, dom, 'utf8');
        await testInfo.attach('locus-dom-snippet', {
          path: domPath,
          contentType: 'text/html',
        });
      } catch {
        // Page was closed or navigated away
      }
    }
  },
});

export { expect } from '@playwright/test';

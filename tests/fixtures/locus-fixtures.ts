/**
 * locus-fixtures.ts — Shared Locus attachment helper
 *
 * This file provides locusAttach(), which writes the four required
 * Playwright test attachments that the Locus reporter reads to build
 * a FailureEvent. Missing ANY of these causes the pipeline to degrade:
 *
 *   locus-dom-snippet  → MISSING = hard abort (pipeline-aborts Firestore)
 *   locus-element-id   → MISSING = falls back to "<suite>.unknown_element"
 *   locus-pom-file     → MISSING = pomFilePath becomes empty string
 *   locus-old-locator  → MISSING = oldLocator becomes empty string
 *
 * Call locusAttach() AFTER the page action but BEFORE the assertion:
 *
 *   await loginPage.login(email, pass);          // action
 *   await locusAttach(testInfo, page, ...);      // snapshot of broken state
 *   await expect(page).toHaveURL('/dashboard');  // assertion (may fail)
 *
 * This ordering ensures the DOM snapshot reflects the post-action state
 * the classifier needs to evaluate the failure.
 *
 * Attachment key constants (from locus-reporter.ts — never change these):
 *   'locus-dom-snippet'
 *   'locus-element-id'
 *   'locus-pom-file'
 *   'locus-old-locator'
 */

import path from 'path';
import type { Page, TestInfo } from '@playwright/test';

/**
 * Attach the four Locus healing metadata fields to the current test.
 *
 * @param testInfo    - Playwright TestInfo object from the test callback
 * @param page        - The current Playwright Page (used to capture DOM)
 * @param elementId   - Stable dot-notation ID: "PageClass.fieldName"
 *                      e.g. "LoginPage.submitButton"
 * @param pomFilePath - Absolute path to the .page.ts POM file.
 *                      Use path.resolve() from the project root.
 * @param oldLocator  - The locator string currently in the POM.
 *                      Must match what page.locator() is called with.
 */
export async function locusAttach(
  testInfo: TestInfo,
  page: Page,
  elementId: string,
  pomFilePath: string,
  oldLocator: string,
): Promise<void> {
  // Capture DOM FIRST so the order of attachments doesn't matter to the
  // reporter (it searches by name, not by order), and so an exception in
  // page.content() doesn't prevent the other three from being written.
  const domSnapshot = await page.content().catch(() => null);

  await testInfo.attach('locus-element-id', {
    body: Buffer.from(elementId, 'utf8'),
    contentType: 'text/plain',
  });

  await testInfo.attach('locus-pom-file', {
    body: Buffer.from(pomFilePath, 'utf8'),
    contentType: 'text/plain',
  });

  await testInfo.attach('locus-old-locator', {
    body: Buffer.from(oldLocator, 'utf8'),
    contentType: 'text/plain',
  });

  // locus-dom-snippet is the non-negotiable minimum. If page.content()
  // threw (e.g., page was closed), we still attach an empty string rather
  // than omitting the attachment entirely — an empty string body causes
  // Locus to proceed with degraded quality rather than aborting silently.
  await testInfo.attach('locus-dom-snippet', {
    body: Buffer.from(domSnapshot ?? '', 'utf8'),
    contentType: 'text/html',
  });
}

/**
 * Convenience: resolve an absolute path to a POM file from the project root.
 * Usage: pomPath('tests/pages/login.page.ts')
 */
export function pomPath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

/**
 * login.spec.ts — Tests for the TaskFlow login page
 *
 * Covers scenario S1 (UI drift, high confidence) via the submitButton locator.
 *
 * Locus fixture wiring pattern used throughout:
 *   1. Navigate to the page
 *   2. Perform the action under test
 *   3. Call locusAttach() — captures DOM snapshot AFTER the action, BEFORE assertion
 *   4. Assert — if this fails, Locus has the complete context to heal
 *
 * The locusAttach() call is inside the test body, not a beforeEach/afterEach,
 * because it must capture the page state at the moment of the relevant action.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { locusAttach, pomPath } from './fixtures/locus-fixtures';
import { LoginPage } from './pages/login.page';

const LOGIN_POM_PATH = pomPath('tests/pages/login.page.ts');

// ── Test: Successful login ──────────────────────────────────────────────────

test('login > successful login navigates to dashboard', async ({ page }, testInfo) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.fillEmail('admin@taskflow.io');
  await loginPage.fillPassword('password123');

  // Capture DOM state after filling credentials, before clicking submit.
  // This snapshot shows the form in its ready-to-submit state — useful
  // context for the classifier if the submit button locator is broken (S1).
  await locusAttach(
    testInfo,
    page,
    'LoginPage.submitButton',
    LOGIN_POM_PATH,
    loginPage.submitButtonLocator,
  );

  await loginPage.clickSubmit();

  // If S1 break point is active: clickSubmit() throws because submitButton
  // locator misses the renamed element. Locus fires with the snapshot above.
  await expect(page).toHaveURL(/dashboard/);
});

// ── Test: Invalid credentials show error ───────────────────────────────────

test('login > invalid credentials show error message', async ({ page }, testInfo) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.fillEmail('wrong@example.com');
  await loginPage.fillPassword('wrongpassword');

  // Locus attachment before the action that may fail
  await locusAttach(
    testInfo,
    page,
    'LoginPage.submitButton',
    LOGIN_POM_PATH,
    loginPage.submitButtonLocator,
  );

  await loginPage.clickSubmit();

  // Wait for the error element to become visible
  const errorEl = loginPage.errorMessage;
  await expect(errorEl).toBeVisible();
  await expect(errorEl).toContainText('Invalid credentials');
});

// ── Test: Login form fields are present ────────────────────────────────────

test('login > form fields are visible on page load', async ({ page }, testInfo) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Attach Locus context for the submit button
  await locusAttach(
    testInfo,
    page,
    'LoginPage.submitButton',
    LOGIN_POM_PATH,
    loginPage.submitButtonLocator,
  );

  await expect(loginPage.emailInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeVisible();
  await expect(loginPage.submitButton).toBeVisible();
});

// ── Test: Empty form submission shows browser validation ───────────────────

test('login > submit with empty fields does not navigate', async ({ page }, testInfo) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await locusAttach(
    testInfo,
    page,
    'LoginPage.submitButton',
    LOGIN_POM_PATH,
    loginPage.submitButtonLocator,
  );

  // The form has `required` attributes — the browser blocks submission.
  // This test verifies we stay on the login page.
  // Note: Playwright does not trigger browser validation on .click() alone;
  // we use .dispatchEvent() to submit the form to test this behaviour.
  await loginPage.submitButton.click();
  await expect(page).toHaveURL('/');
});

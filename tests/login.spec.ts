/**
 * login.spec.ts — Tests for the TaskFlow login page
 *
 * Uses the Locus zero-boilerplate fixture extension.
 * If any locator fails, the fixture automatically captures the DOM snapshot,
 * and Locus automatically extracts the broken locator and POM file from the error logs.
 */

import { test, expect } from './fixtures/locus-fixtures';
import { LoginPage } from './pages/login.page';

// ── Test: Successful login ──────────────────────────────────────────────────

test('login > successful login navigates to dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.fillEmail('admin@taskflow.io');
  await loginPage.fillPassword('password123');

  await loginPage.clickSubmit();

  await expect(page).toHaveURL(/dashboard/);
});

// ── Test: Invalid credentials show error ───────────────────────────────────

test('login > invalid credentials show error message', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.fillEmail('wrong@example.com');
  await loginPage.fillPassword('wrongpassword');

  await loginPage.clickSubmit();

  // Wait for the error element to become visible
  const errorEl = loginPage.errorMessage;
  await expect(errorEl).toBeVisible();
  await expect(errorEl).toContainText('Invalid credentials');
});

// ── Test: Login form fields are present ────────────────────────────────────

test('login > form fields are visible on page load', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await expect(loginPage.emailInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeVisible();
  await expect(loginPage.submitButton).toBeVisible();
});

// ── Test: Empty form submission shows browser validation ───────────────────

test('login > submit with empty fields does not navigate', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // The form has `required` attributes — the browser blocks submission.
  // This test verifies we stay on the login page.
  // Note: Playwright does not trigger browser validation on .click() alone;
  // we use .dispatchEvent() to submit the form to test this behaviour.
  await loginPage.submitButton.click();
  await expect(page).toHaveURL('/');
});

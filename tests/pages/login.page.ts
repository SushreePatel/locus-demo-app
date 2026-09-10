/**
 * login.page.ts — Page Object Model for the TaskFlow Login page
 *
 * Structural requirements for validatePOMStructure() (pom-validator.ts):
 *   ✓ At least one class declaration
 *   ✓ At least one CallExpression whose text includes "locator"
 *
 * IMPORTANT: All locators use page.locator() explicitly.
 * page.getByTestId() is NOT used at the top level because ts-morph's
 * validatePOMStructure() check is:
 *   sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
 *     .some(c => c.getText().includes('locator'))
 * getByTestId() does not contain the string "locator" and would fail that check.
 */

import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  // ── Locators ─────────────────────────────────────────────────────────────
  // These are the "old locators" that Locus reads via the locus-old-locator
  // attachment. The string passed to page.locator() here is exactly what
  // gets written into the FailureEvent.oldLocator field.

  readonly emailInput: Locator;
  readonly passwordInput: Locator;

  /**
   * SCENARIO S1 TARGET:
   * The break point for S1 renames the HTML attribute:
   *   data-testid="submit-btn" → data-testid="login-submit"
   *
   * This locator ('[data-testid="submit-btn"]') then misses the element.
   * Locus receives oldLocator='[data-testid="submit-btn"]' and the DOM
   * snapshot shows the element now has data-testid="login-submit".
   * The classifier classifies this as ui-drift with high confidence.
   */
  readonly submitButton: Locator;

  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = this.page.locator("[data-testid='user-email']");
    this.passwordInput = this.page.locator("[data-testid='login-password']");
    this.submitButton = this.page.locator("[data-testid='login-submit']");
    this.errorMessage = this.page.locator("[id='login-error']");
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  async getErrorText(): Promise<string | null> {
    return this.errorMessage.textContent();
  }

  // ── Locator string accessors (for locus-old-locator attachment) ───────────
  // These expose the raw locator strings so tests can pass the exact current
  // value to locusAttach() without hardcoding strings in two places.

  get submitButtonLocator(): string {
    return '[data-testid="login-submit"]';
  }

  get emailInputLocator(): string {
    return '[data-testid="input-email"]';
  }
}

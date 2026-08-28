/**
 * dashboard.page.ts — Page Object Model for the TaskFlow Dashboard page
 *
 * Structural requirements for validatePOMStructure() (pom-validator.ts):
 *   ✓ At least one class declaration
 *   ✓ At least one CallExpression whose text includes "locator"
 *
 * Scenarios covered by this POM:
 *   S2 — addTaskButton (UI drift, amber confidence)
 *   S3 — activeCount   (real bug assertion)
 *   S4 — taskSavedToast (flaky race condition)
 *   S5 — deleteButton  (unresolvable, uniqueness gate)
 */

import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  // ── Locators ─────────────────────────────────────────────────────────────

  readonly taskTitleInput: Locator;

  /**
   * SCENARIO S2 TARGET:
   * Break point renames data-testid="add-task-btn" → "create-task-btn"
   * in the same commit that changes the <h1> title text (diff noise).
   * oldLocator = '[data-testid="add-task-btn"]'
   */
  readonly addTaskButton: Locator;

  /**
   * SCENARIO S3 TARGET (real bug):
   * The activeCount element IS found — the locator works fine.
   * The test assertion fails because the counter value is wrong
   * (app.js returns activeTasks.length + 1 instead of activeTasks.length).
   * Locus classifies this as real-bug, action=fail-loudly.
   */
  readonly activeCount: Locator;

  /**
   * SCENARIO S4 TARGET (flaky):
   * Toast appears after a randomised delay (100–600ms when break point
   * is active). The test asserts visibility immediately after addTask().
   * The locator always finds the element; the race is purely timing.
   */
  readonly taskSavedToast: Locator;

  /**
   * SCENARIO S5 TARGET (unresolvable):
   * When the S5 break point is active, two buttons with identical
   * aria-label="Delete task" and text "Delete" exist. Resolver candidates:
   *   - aria-role: matches 2+ elements → uniqueness gate FAILS
   *   - unique-text("Delete"): matches 2+ elements → uniqueness gate FAILS
   * Both strategies exhausted. unresolvable=true.
   */
  readonly deleteButton: Locator;

  readonly taskList: Locator;
  readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    this.taskTitleInput  = this.page.locator('[data-testid="task-title-input"]');
    this.addTaskButton   = this.page.locator('[data-testid="add-task-btn"]');
    this.activeCount     = this.page.locator('[data-testid="active-count"]');
    this.taskSavedToast  = this.page.locator('[data-testid="task-saved-toast"]');
    this.deleteButton    = this.page.locator('[aria-label="Delete task"]').first();
    this.taskList        = this.page.locator('[data-testid="task-list"]');
    this.emptyState      = this.page.locator('[id="empty-state"]');
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/dashboard.html');
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async addTask(title: string): Promise<void> {
    await this.taskTitleInput.fill(title);
    await this.addTaskButton.click();
  }

  async getActiveCount(): Promise<string> {
    return (await this.activeCount.textContent()) ?? '';
  }

  async getTaskCount(): Promise<number> {
    return this.taskList.locator('.task-item').count();
  }

  async deleteFirstTask(): Promise<void> {
    await this.deleteButton.click();
  }

  async isToastVisible(): Promise<boolean> {
    return this.taskSavedToast.isVisible();
  }

  // ── Locator string accessors (for locus-old-locator attachment) ───────────

  get addTaskButtonLocator(): string {
    return '[data-testid="add-task-btn"]';
  }

  get activeCountLocator(): string {
    return '[data-testid="active-count"]';
  }

  get taskSavedToastLocator(): string {
    return '[data-testid="task-saved-toast"]';
  }

  get deleteButtonLocator(): string {
    return '[aria-label="Delete task"]';
  }
}

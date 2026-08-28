/**
 * dashboard.spec.ts — Tests for the TaskFlow dashboard
 *
 * Covers scenarios S2 (amber drift), S3 (real bug), S4 (flaky), S5 (unresolvable).
 *
 * Each test that is a Locus scenario target has:
 *   1. A comment marking which scenario it exercises
 *   2. The exact break-point instruction (cross-reference to app.js/dashboard.html)
 *   3. The expected Locus pipeline outcome
 *
 * All tests navigate directly to /dashboard.html and use the server's
 * pre-seeded task data (1 active, 1 done) as the starting state.
 */

import { test, expect } from '@playwright/test';
import { locusAttach, pomPath } from './fixtures/locus-fixtures';
import { DashboardPage } from './pages/dashboard.page';

const DASHBOARD_POM_PATH = pomPath('tests/pages/dashboard.page.ts');

// Reset server to seed state before each test so tests are order-independent.
// POST /api/reset restores in-memory tasks to: id=1 (active) + id=2 (done).
test.beforeEach(async ({ request }) => {
  await request.post('http://localhost:3002/api/reset');
});


// ── Scenario S2: UI drift, amber confidence ───────────────────────────────
//
// Break point: in dashboard.html, rename data-testid="add-task-btn" to
// "create-task-btn" AND change <h1>TaskFlow</h1> to <h1>TaskFlow App</h1>
// in the SAME commit (diff noise). See dashboard.html for exact comment.
//
// Expected Locus outcome:
//   classifier   = ui-drift
//   confidence   = 60–79 (amber band, muddied by <h1> noise in the same diff)
//   action       = amber-pr-requires-approval
//   PR label     = locus:amber-drift
// ─────────────────────────────────────────────────────────────────────────

test('dashboard > can add a new task [S2: add-task-btn target]', async ({ page }, testInfo) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  const initialCount = await dashboard.getTaskCount();

  await dashboard.taskTitleInput.fill('Test task for S2');

  // DOM snapshot captured after filling but BEFORE clicking Add Task.
  // If the S2 break point is active, addTaskButton.click() will throw
  // because '[data-testid="add-task-btn"]' no longer exists.
  await locusAttach(
    testInfo,
    page,
    'DashboardPage.addTaskButton',
    DASHBOARD_POM_PATH,
    dashboard.addTaskButtonLocator,
  );

  await dashboard.addTaskButton.click();

  await expect(dashboard.taskList.locator('.task-item')).toHaveCount(initialCount + 1);
});

// ── Scenario S3: Real bug (off-by-one counter) ────────────────────────────
//
// Break point: in app.js updateActiveCount(), change:
//   activeCountEl.textContent = `${activeTasks.length} active`;
// to:
//   activeCountEl.textContent = `${activeTasks.length + 1} active`;
//
// Expected Locus outcome:
//   classifier = real-bug
//   confidence = 80–95+ (clear assertion mismatch, no locator error)
//   action     = fail-loudly
//   No resolver call, no PR patch — human must fix the counter logic.
// ─────────────────────────────────────────────────────────────────────────

test('dashboard > active count shows correct number [S3: real-bug counter]', async ({ page }, testInfo) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  // DOM snapshot captured before assertion. The activeCount element IS found
  // by its locator — the bug is a wrong value, not a missing element.
  await locusAttach(
    testInfo,
    page,
    'DashboardPage.activeCount',
    DASHBOARD_POM_PATH,
    dashboard.activeCountLocator,
  );

  // Pre-seeded state: task id=1 is active, task id=2 is done → 1 active.
  // When S3 break point is active: counter shows "2 active" → test fails.
  const countText = await dashboard.getActiveCount();
  expect(countText).toBe('1 active');
});

// ── Scenario S4: Flaky test (race condition) ──────────────────────────────
//
// Break point: in app.js, inside the addForm submit handler, change:
//   setTimeout(() => { toast.hidden = false; }, 0);
// to:
//   const delay = Math.floor(Math.random() * 500) + 100;
//   setTimeout(() => { toast.hidden = false; }, delay);
//
// Expected Locus outcome:
//   classifier = flakiness
//   confidence = 60–80+ (timing-sensitive, non-deterministic failure signal)
//   action     = retry-annotation
//   No resolver call, no patch. PR suggests adding test.retry or waitFor.
//
// NOTE: This test intentionally has NO explicit waitFor on the toast.
// The assertion is immediate, creating a genuine race against the setTimeout.
// When the delay is 0ms this always passes. With 100–600ms it fails ~40% of runs.
// ─────────────────────────────────────────────────────────────────────────

test('dashboard > task-saved toast appears after add [S4: flaky race]', async ({ page }, testInfo) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  await dashboard.taskTitleInput.fill('Flaky toast test task');

  await locusAttach(
    testInfo,
    page,
    'DashboardPage.taskSavedToast',
    DASHBOARD_POM_PATH,
    dashboard.taskSavedToastLocator,
  );

  await dashboard.addTaskButton.click();

  // INTENTIONALLY no await page.waitForTimeout() or await expect().toBeVisible()
  // with a retry interval. The assertion is immediate — this is what creates
  // the race condition when the break point introduces a random delay.
  await expect(dashboard.taskSavedToast).toBeVisible();
});

// ── Scenario S5: Unresolvable element ────────────────────────────────────
//
// Break point: in app.js renderTasks(), duplicate the Delete button in the
// task item template so EACH task renders TWO identical buttons:
//   <button class="task-delete-btn" aria-label="Delete task" data-id="${task.id}">Delete</button>
//   <button class="task-delete-btn" aria-label="Delete task" data-id="${task.id}">Delete</button>
//
// (Two buttons with identical aria-label AND identical text per task item.)
//
// Expected Locus outcome:
//   resolver candidates evaluated:
//     - aria-role strategy ('Delete task'): uniqueness gate FAILS (2+ match)
//     - unique-text strategy ('Delete'):    uniqueness gate FAILS (2+ match)
//   unresolvable = true
//   failureReason = "All 2 resolver candidate(s) failed..."
//   Firestore elements doc: status='unresolvable', clearedBy=null
//   PR: human-review PR with locus:unresolvable label
// ─────────────────────────────────────────────────────────────────────────

test('dashboard > can delete a task [S5: unresolvable duplicate button]', async ({ page }, testInfo) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  const initialCount = await dashboard.getTaskCount();

  // DOM snapshot before click — shows the duplicate button structure when
  // S5 break point is active. The resolver sees 2+ matching elements.
  await locusAttach(
    testInfo,
    page,
    'DashboardPage.deleteButton',
    DASHBOARD_POM_PATH,
    dashboard.deleteButtonLocator,
  );

  // When S5 is active: .first() selects one of the two identical buttons
  // but the resolver's static DOM validation (against page.content()) sees
  // 2 matching elements and fails the uniqueness gate for all candidates.
  await dashboard.deleteFirstTask();

  await expect(dashboard.taskList.locator('.task-item')).toHaveCount(initialCount - 1);
});

// ── Baseline: dashboard loads with pre-seeded tasks ───────────────────────

test('dashboard > loads initial task list', async ({ page }, testInfo) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  await locusAttach(
    testInfo,
    page,
    'DashboardPage.taskList',
    DASHBOARD_POM_PATH,
    '[data-testid="task-list"]',
  );

  // The server seeds 2 tasks on startup
  await expect(dashboard.taskList.locator('.task-item')).toHaveCount(2);
  await expect(dashboard.emptyState).toBeHidden();
});

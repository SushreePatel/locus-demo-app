/**
 * dashboard.spec.ts — Tests for the TaskFlow dashboard
 *
 * Covers scenarios S2 (amber drift), S3 (real bug), S4 (flaky), S5 (unresolvable).
 *
 * All tests use the Locus zero-boilerplate fixture extension.
 * If any locator or assertion fails, the fixture automatically captures the DOM snapshot,
 * and Locus automatically extracts the broken locator and POM file from the error logs.
 */

import { test, expect } from './fixtures/locus-fixtures';
import { DashboardPage } from './pages/dashboard.page';

// Reset server to seed state before each test so tests are order-independent.
// POST /api/reset restores in-memory tasks to: id=1 (active) + id=2 (done).
test.beforeEach(async ({ request }) => {
  await request.post('http://localhost:3002/api/reset');
});

// ── Scenario S2: UI drift, amber confidence ───────────────────────────────
//
// Break point: in dashboard.html, rename data-testid="add-task-btn" to
// "create-task-btn" AND change <h1>TaskFlow</h1> to <h1>TaskFlow App</h1>
// in the SAME commit (diff noise).
// ─────────────────────────────────────────────────────────────────────────

test('dashboard > can add a new task [S2: add-task-btn target]', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  const initialCount = await dashboard.getTaskCount();

  await dashboard.taskTitleInput.fill('Test task for S2');
  await dashboard.addTaskButton.click();

  await expect(dashboard.taskList.locator('.task-item')).toHaveCount(initialCount + 1);
});

// ── Scenario S3: Real bug (off-by-one counter) ────────────────────────────
//
// Break point: in app.js updateActiveCount(), change:
//   activeCountEl.textContent = `${activeTasks.length} active`;
// to:
//   activeCountEl.textContent = `${activeTasks.length + 1} active`;
// ─────────────────────────────────────────────────────────────────────────

test('dashboard > active count shows correct number [S3: real-bug counter]', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  // Pre-seeded state: task id=1 is active, task id=2 is done → 1 active.
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
// ─────────────────────────────────────────────────────────────────────────

test('dashboard > task-saved toast appears after add [S4: flaky race]', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  await dashboard.taskTitleInput.fill('Flaky toast test task');
  await dashboard.addTaskButton.click();

  await expect(dashboard.taskSavedToast).toBeVisible();
});

// ── Scenario S5: Unresolvable element ────────────────────────────────────
//
// Break point: in app.js renderTasks(), duplicate the Delete button in the
// task item template so EACH task renders TWO identical buttons:
//   <button class="task-delete-btn" aria-label="Delete task" data-id="${task.id}">Delete</button>
//   <button class="task-delete-btn" aria-label="Delete task" data-id="${task.id}">Delete</button>
// ─────────────────────────────────────────────────────────────────────────

test('dashboard > can delete a task [S5: unresolvable duplicate button]', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  const initialCount = await dashboard.getTaskCount();
  await dashboard.deleteFirstTask();

  await expect(dashboard.taskList.locator('.task-item')).toHaveCount(initialCount - 1);
});

// ── Baseline: dashboard loads with pre-seeded tasks ───────────────────────

test('dashboard > loads initial task list', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  // The server seeds 2 tasks on startup
  await expect(dashboard.taskList.locator('.task-item')).toHaveCount(2);
  await expect(dashboard.emptyState).toBeHidden();
});

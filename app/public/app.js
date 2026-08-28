/**
 * app.js — Client-side logic for TaskFlow
 *
 * This file contains ALL five deliberate break points for Locus scenarios.
 * Each break point is clearly commented with:
 *   - The scenario code (S1–S5)
 *   - The exact one-line edit to make
 *   - The exact one-line revert
 *   - The expected Locus pipeline outcome
 *
 * DO NOT modify this file for anything other than toggling break points.
 * The POM and test files are never modified to trigger scenarios.
 */

'use strict';

// ============================================================
// LOGIN PAGE LOGIC
// ============================================================

(function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return; // only active on index.html

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const errorEl  = document.getElementById('login-error');

    errorEl.hidden = true;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = data.redirect;
      } else {
        errorEl.textContent = data.message || 'Login failed';
        errorEl.hidden = false;
      }
    } catch {
      errorEl.textContent = 'Network error — please try again';
      errorEl.hidden = false;
    }
  });
}());


// ============================================================
// DASHBOARD PAGE LOGIC
// ============================================================

(function initDashboard() {
  const taskList   = document.getElementById('task-list');
  if (!taskList) return; // only active on dashboard.html

  const activeCountEl = document.getElementById('active-count');
  const emptyStateEl  = document.getElementById('empty-state');
  const addForm       = document.getElementById('add-task-form');
  const titleInput    = document.getElementById('task-title-input');
  const toast         = document.getElementById('task-saved-toast');

  // ── Active task counter ──────────────────────────────────────────────────
  function updateActiveCount(tasks) {
    const activeTasks = tasks.filter((t) => !t.done);

    /*
     * BREAK-POINT S3 (real bug):
     * To trigger: change the line below from:
     *   activeCountEl.textContent = `${activeTasks.length} active`;
     * to:
     *   activeCountEl.textContent = `${activeTasks.length + 1} active`;
     *
     * This introduces an off-by-one bug that makes the test assertion
     * `expect(counter).toBe('1 active')` fail with '2 active'.
     * Revert: restore `activeTasks.length` (remove the `+ 1`).
     * Expected Locus outcome: classifier=real-bug, action=fail-loudly.
     * The classifier sees the assertion mismatch in stack trace with no
     * locator error — no DOM element is missing, the element IS found and
     * readable, but the value is wrong.
     */
    activeCountEl.textContent = `${activeTasks.length} active`;
  }

  // ── Render task list ─────────────────────────────────────────────────────
  function renderTasks(tasks) {
    taskList.innerHTML = '';
    emptyStateEl.hidden = tasks.length > 0;

    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.taskId = task.id;

      /*
       * BREAK-POINT S5 (unresolvable element):
       * To trigger: change the innerHTML below so EACH task renders TWO
       * Delete buttons with identical aria-label and text. Replace the
       * single .task-delete-btn template with:
       *
       *   <button class="task-delete-btn" aria-label="Delete task" data-id="${task.id}">Delete</button>
       *   <button class="task-delete-btn" aria-label="Delete task" data-id="${task.id}">Delete</button>
       *
       * (Two identical buttons per task item.)
       *
       * Revert: remove the duplicate button line.
       *
       * Expected Locus outcome: resolver validates two candidates —
       * aria-role('Delete task') and unique-text('Delete') — both fail
       * uniqueness gate because 2+ elements match. unresolvable=true.
       * Firestore element record: status='unresolvable'.
       */
      li.innerHTML = `
        <input
          class="task-checkbox"
          type="checkbox"
          ${task.done ? 'checked' : ''}
          aria-label="Mark '${task.title}' as ${task.done ? 'incomplete' : 'complete'}"
          data-id="${task.id}"
        />
        <span class="task-title ${task.done ? 'done' : ''}">${escapeHtml(task.title)}</span>
        <button
          class="task-delete-btn"
          aria-label="Delete task"
          data-id="${task.id}"
        >Delete</button>
      `;
      taskList.appendChild(li);
    });

    updateActiveCount(tasks);
  }

  // ── Fetch + render tasks ─────────────────────────────────────────────────
  async function loadTasks() {
    try {
      const res   = await fetch('/api/tasks');
      const tasks = await res.json();
      renderTasks(tasks);
    } catch {
      taskList.innerHTML = '<li class="task-item" style="color:var(--color-danger)">Failed to load tasks</li>';
    }
  }

  // ── Add task ─────────────────────────────────────────────────────────────
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    try {
      const res  = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const task = await res.json();

      if (res.ok) {
        titleInput.value = '';

        /*
         * BREAK-POINT S4 (flaky test — race condition):
         * To trigger: change the toast reveal logic below from a fixed 0 ms
         * setTimeout to a non-deterministic one:
         *
         *   const delay = Math.floor(Math.random() * 500) + 100; // 100–600ms
         *   setTimeout(() => { toast.hidden = false; }, delay);
         *
         * Revert: restore `setTimeout(() => { toast.hidden = false; }, 0)`
         *
         * The test asserts `await expect(toast).toBeVisible()` immediately
         * after clicking "Add Task". With a deterministic 0ms delay this
         * always passes. With the random 100–600ms delay it passes most
         * runs but intermittently fails when the delay exceeds Playwright's
         * default assertion timeout (usually ~500ms with no explicit wait).
         * This is a GENUINE race condition in the app, not a faked random
         * in the test. The test has no waitFor — it asserts immediately.
         * Expected Locus outcome: classifier=flakiness, action=retry-annotation.
         */
        setTimeout(() => { toast.hidden = false; }, 0);
        setTimeout(() => { toast.hidden = true;  }, 2500);

        // Re-render with updated task appended
        const tasks = Array.from(taskList.querySelectorAll('.task-item')).map((li) => ({
          id:   parseInt(li.dataset.taskId, 10),
          title: li.querySelector('.task-title').textContent,
          done:  li.querySelector('.task-checkbox').checked,
        }));
        tasks.push({ id: task.id, title: task.title, done: false });
        renderTasks(tasks);
      }
    } catch {
      console.error('Failed to add task');
    }
  });

  // ── Delete task ──────────────────────────────────────────────────────────
  taskList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.task-delete-btn');
    if (!btn) return;

    const id = parseInt(btn.dataset.id, 10);
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const li = taskList.querySelector(`[data-task-id="${id}"]`);
      if (li) li.remove();

      // Update active count from remaining items
      const remaining = Array.from(taskList.querySelectorAll('.task-item')).map((el) => ({
        done: el.querySelector('.task-checkbox').checked,
      }));
      updateActiveCount(remaining);
      emptyStateEl.hidden = remaining.length > 0;
    } catch {
      console.error('Failed to delete task');
    }
  });

  // ── Toggle done ──────────────────────────────────────────────────────────
  taskList.addEventListener('change', (e) => {
    const checkbox = e.target.closest('.task-checkbox');
    if (!checkbox) return;
    const li       = checkbox.closest('.task-item');
    const titleEl  = li.querySelector('.task-title');
    titleEl.classList.toggle('done', checkbox.checked);

    const allTasks = Array.from(taskList.querySelectorAll('.task-item')).map((el) => ({
      done: el.querySelector('.task-checkbox').checked,
    }));
    updateActiveCount(allTasks);
  });

  // ── XSS guard ────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  loadTasks();
}());

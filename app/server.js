/**
 * server.js — Express dev server for TaskFlow demo app
 *
 * Serves static files from app/public/.
 * Also exposes a minimal REST API used by the dashboard:
 *   POST /api/login          — validates credentials (hardcoded, demo only)
 *   GET  /api/tasks          — returns in-memory task list
 *   POST /api/tasks          — adds a task
 *   DELETE /api/tasks/:id    — removes a task
 *
 * The server keeps tasks in-memory so restarts reset state — intentional
 * for a demo target that needs deterministic starting conditions.
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory state ────────────────────────────────────────────────────────
let tasks = [
  { id: 1, title: 'Review pull request #42', done: false },
  { id: 2, title: 'Write release notes', done: true },
];
let nextId = 3;

// ── Auth endpoint ──────────────────────────────────────────────────────────
// Demo credentials: admin@taskflow.io / password123
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@taskflow.io' && password === 'password123') {
    res.json({ success: true, redirect: '/dashboard.html' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// ── Task CRUD ──────────────────────────────────────────────────────────────
app.get('/api/tasks', (_req, res) => {
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const task = { id: nextId++, title: title.trim(), done: false };
  tasks.push(task);
  res.status(201).json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  tasks.splice(idx, 1);
  res.json({ success: true });
});

// ── Test reset endpoint ──────────────────────────────────────────────────────
// Restores in-memory tasks to the initial seed state. Called by beforeEach
// in dashboard.spec.ts so every test starts with known task state.
app.post('/api/reset', (_req, res) => {
  tasks = [
    { id: 1, title: 'Review pull request #42', done: false },
    { id: 2, title: 'Write release notes',     done: true  },
  ];
  nextId = 3;
  res.json({ success: true });
});

// ── SPA fallback — serve dashboard.html for /dashboard ────────────────────
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`TaskFlow dev server running at http://localhost:${PORT}`);
});

# TaskFlow — Locus Self-Healing Demo App

TaskFlow is the target application for the [Locus](../locus-self-healing) self-healing Playwright tool.  
It exists solely to give Locus a realistic, controllable surface to detect failures, classify them, and attempt healing.

---

## Quick Start

```bash
# 1. Install dependencies (npm link is wired via postinstall)
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Run all tests (baseline — all should pass)
GCP_PROJECT_ID=locus-dev-506512 \
GITHUB_TOKEN=<your-pat> \
GITHUB_REPOSITORY=<owner>/locus-demo-app \
npm test
```

---

## Project Structure

```
locus-demo-app/
├── app/
│   ├── server.js               Express dev server (port 3002)
│   └── public/
│       ├── index.html          Login page  ← S1 break point
│       ├── dashboard.html      Dashboard   ← S2, S5 break points
│       ├── app.js              Client JS   ← S3, S4, S5 break points
│       └── style.css
├── tests/
│   ├── fixtures/
│   │   └── locus-fixtures.ts   locusAttach() helper + pomPath()
│   ├── pages/
│   │   ├── login.page.ts       LoginPage POM       ← S1 POM target
│   │   └── dashboard.page.ts   DashboardPage POM   ← S2–S5 POM targets
│   ├── login.spec.ts
│   └── dashboard.spec.ts
├── playwright.config.ts
├── .env.example
└── .github/workflows/locus-ci.yml
```

---

## Scenario Reference

All break points are **one-file, one-line edits**. The POM and test files are never modified.  
Revert by restoring the original value (each break point comment includes the exact revert instruction).

| ID | Name | File to edit | Exact change | Expected Locus outcome |
|----|------|-------------|--------------|------------------------|
| **S1** | UI drift — high confidence | `app/public/index.html` | `data-testid="submit-btn"` → `"login-submit"` | `classifier=ui-drift`, confidence ≥ 95, auto-heal PR |
| **S2** | UI drift — amber confidence | `app/public/dashboard.html` | `data-testid="add-task-btn"` → `"create-task-btn"` **AND** `<h1>TaskFlow</h1>` → `<h1>TaskFlow App</h1>` in same commit | `classifier=ui-drift`, confidence 60–79, PR requires approval |
| **S3** | Real bug — counter off-by-one | `app/public/app.js` | `activeTasks.length` → `activeTasks.length + 1` | `classifier=real-bug`, action=fail-loudly, no resolver call |
| **S4** | Flaky race condition | `app/public/app.js` | `setTimeout(() => { toast.hidden = false; }, 0)` → random 100–600ms delay | `classifier=flakiness`, action=retry-annotation |
| **S5** | Unresolvable element | `app/public/app.js` | Duplicate the Delete button in `renderTasks()` so each task has two identical buttons | Both resolver candidates fail uniqueness gate, `unresolvable=true` |

Each break point comment in the source file contains the full, copy-paste-ready mutation.

---

## Fixture Wiring

Every test calls `locusAttach()` before the assertion that may fail:

```typescript
await locusAttach(
  testInfo,                               // Playwright TestInfo
  page,                                   // current Page (for DOM capture)
  'LoginPage.submitButton',              // elementId (dot-notation)
  pomPath('tests/pages/login.page.ts'), // absolute POM file path
  loginPage.submitButtonLocator,         // old locator string from POM
);
```

This writes four attachments that the Locus reporter reads:

| Attachment key | Content | If missing |
|---|---|---|
| `locus-element-id` | `LoginPage.submitButton` | Falls back to `<suite>.unknown_element` |
| `locus-pom-file` | Absolute `.page.ts` path | `pomFilePath` becomes empty string |
| `locus-old-locator` | `[data-testid="submit-btn"]` | `oldLocator` becomes empty string |
| `locus-dom-snippet` | Full page HTML after action | **Pipeline aborts** (hard failure) |

---

## POM Structural Requirements

The `pom-validator.ts` in Locus validates POMs via AST (ts-morph) before any resolver call.  
Both POMs in this repo satisfy the two requirements:

1. **At least one class declaration** — `LoginPage`, `DashboardPage`
2. **At least one `CallExpression` containing the string `"locator"`** — all element locators use `page.locator(...)` explicitly

> **Important:** `page.getByTestId()` does NOT satisfy requirement 2 because the string `"locator"` does not appear in the call text. Only `page.locator()` does.

---

## CI Setup

The GitHub Actions workflow (`.github/workflows/locus-ci.yml`) uses **Workload Identity Federation** — no service account key is stored as a secret.

### Required GitHub Secrets

| Secret | Value |
|---|---|
| `WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER` |
| `WIF_SERVICE_ACCOUNT` | `locus-ci@locus-dev-506512.iam.gserviceaccount.com` |
| `LOCUS_WEBHOOK_SECRET` | (optional — webhook server not yet built; see D1 gap below) |

### Required GitHub Variables (not secrets)

| Variable | Default |
|---|---|
| `GCP_PROJECT_ID` | `locus-dev-506512` |
| `GCP_REGION` | `us-central1` |
| `CLASSIFIER_MODEL` | `gemini-3.1-flash-lite` |
| `RESOLVER_MODEL` | `gemini-3.1-pro` |
| `HEAL_BUDGET` | `3` |
| `FIRESTORE_DATABASE_ID` | `(default)` |

### Local Runs

```bash
gcloud auth application-default login   # sets ADC for Vertex AI + Firestore
export GITHUB_TOKEN=<your-pat>           # PAT: contents:write + pull-requests:write
export GITHUB_REPOSITORY=<owner>/locus-demo-app
export GCP_PROJECT_ID=locus-dev-506512
npm test
```

---

## Known Gaps (Locus Phase 1)

### D1: Webhook server not yet built

Locus's `locus-ci.yml` POSTs to `LOCUS_WEBHOOK_URL` after a failure (3 retries, exponential backoff). The **server** that receives this POST does not exist in the Locus `src/` yet — no Express handler, no Cloud Run entry point. The URL defaults to `http://localhost:3000/webhook`.

In this demo's CI workflow, the webhook curl step runs with `continue-on-error: true`. All 3 retries fail with connection refused, then the Firestore `webhook-failures` fallback fires. This is observable evidence that the D1 fallback path works.

### Model availability

The Locus classifier uses `gemini-3.1-flash-lite` and resolver uses `gemini-3.1-pro` (set in Locus's `config.ts`). These model IDs must be provisioned in `locus-dev-506512` on Vertex AI before the pipeline can complete its full classify → resolve cycle. Until then, the pipeline degrades to human-review on every failure.

### `generateMarkdownReport` null guard

When the classifier fails (e.g. model not found), `orchestrator.ts` catches the error and calls `generateMarkdownReport` with a partial result that has `timestamp: undefined`. `markdown-report.ts:93` calls `.toISOString()` on that value and throws. This is an internal Locus bug in the degraded path — not a demo app issue.

---

## npm link

This repo consumes `locus-self-healing` via `npm link`, not via the npm registry.  
The `postinstall` script re-links it automatically:

```bash
# If you ever need to re-link manually:
cd ../locus-self-healing && npm link
cd ../locus-demo-app && npm link locus-self-healing
```

The symlink lives at `node_modules/locus-self-healing → ../../locus-self-healing`.  
`npm install` reruns the postinstall which re-establishes the link.

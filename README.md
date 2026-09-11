# TaskFlow — Locus Self-Healing Demo App

TaskFlow is the reference web application for demonstrating **[Locus](https://github.com/SushreePatel/locus-self-healing)** self-healing capabilities in Playwright test suites.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browser
npx playwright install chromium

# 3. Authenticate with Google Cloud (Vertex AI)
gcloud auth application-default login

# 4. Run tests (baseline passes)
npx playwright test
```

---

## Project Structure

```text
locus-demo-app/
├── app/
│   ├── server.js               # Express mock API & static server (:3002)
│   └── public/
│       ├── index.html          # Login page (S1 break point)
│       ├── dashboard.html      # Task dashboard (S2 break point)
│       ├── app.js              # Client state & rendering (S3, S4, S5 break points)
│       └── style.css           # Vanilla CSS styles
├── tests/
│   ├── fixtures/
│   │   └── locus-fixtures.ts   # Zero-boilerplate Playwright fixture (DOM capture)
│   ├── pages/
│   │   ├── login.page.ts       # LoginPage POM (healed by S1)
│   │   └── dashboard.page.ts   # DashboardPage POM (healed by S2)
│   ├── login.spec.ts           # Login tests (4 tests)
│   └── dashboard.spec.ts       # Dashboard tests (5 tests)
├── playwright.config.ts        # Playwright & Locus reporter configuration
├── .env.example                # Template environment variables
└── .github/workflows/
    └── locus-ci.yml            # CI pipeline with Workload Identity Federation
```

---

## Scenarios Matrix (S1 – S5)

Each scenario demonstrates a specific classification and decision path in Locus:

| ID | Scenario | File to Edit | Exact Mutation | Observed Locus Outcome |
|:---|:---|:---|:---|:---|
| **S1** | **UI Drift (High Confidence)** | `app/public/index.html` | `data-testid="submit-btn"` → `"login-submit"` | `ui-drift` (98%). Auto-patches POM file. **Multi-element POM Sweep** heals multiple broken fields in 1 run. |
| **S2** | **UI Drift (Amber / Diff Noise)** | `app/public/dashboard.html` | `data-testid="add-task-btn"` → `"create-task-btn"` + change `<h1>` text | `ui-drift` (60–79% in CI / 95% local). Correlates impacted tests (`2 tests covered`) and patches POM. |
| **S3** | **Real Bug (Off-by-One)** | `app/public/app.js` | `activeTasks.length` → `activeTasks.length + 1` | `real-bug` (`fail-loudly`). Locator is valid; value assertion fails. Resolver NOT invoked; 0 files modified. |
| **S4** | **Flaky Race Condition** | `app/public/app.js` | Toast delay: `0ms` → `6000ms` (exceeds 5s timeout) | `flakiness`. Element exists in DOM; fails on `hidden`. Annotated for retry; 0 POM files modified. |
| **S5** | **Unresolvable / Duplicates** | `app/public/app.js` | Duplicate `.task-delete-btn` in `renderTasks()` | `real-bug` (95%). Playwright strict mode violation. Locus refuses to guess `.first()`; fails loudly. |

### Testing a Scenario
```bash
# 1. Apply the mutation in the file indicated above.
# 2. Run the corresponding test:
npx playwright test tests/login.spec.ts          # S1: UI drift (Login)
npx playwright test tests/dashboard.spec.ts:27  # S2: UI drift (Dashboard)
npx playwright test tests/dashboard.spec.ts:47  # S3: Real bug (Counter)
npx playwright test tests/dashboard.spec.ts:65  # S4: Flaky test (Toast)
npx playwright test tests/dashboard.spec.ts:83  # S5: Unresolvable (Delete button)

# 3. Reset files back to baseline:
git checkout app/ tests/pages/
```

---

## How Locus Operates

### 1. Zero-Boilerplate Fixture
Tests import `{ test, expect }` from `./fixtures/locus-fixtures`. No manual annotations or attachments are required in test files.
- On failure, `page.content()` is automatically saved to `dom-snippet.html` on disk.
- Locus AST inspection (`ts-morph`) extracts the broken locator, POM path, and element property directly from the error stack trace.

### 2. Local Mode vs CI Mode
* **💻 Local Mode:** Automatically rewrites the target Page Object Model files on disk, prints a terminal diff summary, and skips Git/PR creation.
* **🚀 CI Mode (GitHub Actions):** Creates an isolated git branch (`locus/heal/...`), commits the healed POM, and opens an automated Pull Request with confidence labels (`locus-healed` or `locus-review-required`).

---

## Configuration

Set via `.env` or environment variables:

| Variable | Default | Description |
|:---|:---|:---|
| `GCP_PROJECT_ID` | `locus-dev-506512` | Google Cloud project hosting Vertex AI |
| `GCP_REGION` | `us-central1` | GCP region for Vertex AI endpoints |
| `CLASSIFIER_MODEL` | `gemini-2.5-flash-lite` | Gemini model for failure diagnosis |
| `RESOLVER_MODEL` | `gemini-2.5-flash-lite` | Gemini model for locator resolution |
| `HEAL_BUDGET` | `10` | Maximum auto-healing attempts per run |
| `LOCUS_VERBOSE` | `false` | Set to `true` to display intermediate LLM debug logs |

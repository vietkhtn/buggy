# UX Flow Critique: Buggy — Test Management App

**Stage:** Refinement | **Focus:** Usability & Flow | **Reviewer:** Claude | **Date:** March 23, 2026

---

## Overall Impression

Buggy has a well-structured information architecture — the landing page communicates the product's value clearly, and the dashboard groups tasks logically (overview → actions → history). However, several critical flow gaps create friction at the most important moments: new user sign-up, executing a manual test run, and handling the API key. The app also lacks navigation beyond a single dashboard page, which will become a scaling bottleneck. At the refinement stage, the highest-value fixes are around the **auth funnel**, **manual run execution flow**, and **the API key delivery experience**.

---

## Full User Journey Map

```
Landing (/) ──► Register ──► Login ──► Dashboard ──► [Upload JUnit / Create Test Case / Manual Run / API Key]
                                  ▲        │
                                  └────────┘ (auto-redirect if session active)
```

---

## Screen-by-Screen Findings

### 1. Landing Page (`/`)

**What works well:**
- Value proposition is clear and concise: "Keep manual and automated testing in one place."
- Dual CTAs ("Create account" / "Sign in") are appropriately prominent and visually differentiated.
- Authenticated users are correctly auto-redirected to `/dashboard` — no double-landing.

**Usability issues:**

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| No hint of what the product looks like before signing up | 🟢 Minor | Consider a small screenshot or feature list below the hero to reduce sign-up hesitation. |

---

### 2. Registration Flow (`/register`)

**What works well:**
- Clean, focused form. No distractions.
- Inline error message appears on failure.

**Usability issues:**

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| After successful registration, users are redirected to `/login` and must sign in again | 🔴 Critical | Auto-login the user after registration. The extra round-trip adds friction at the highest-drop-off moment in any sign-up flow. |
| No OAuth options (Google/GitHub) on the register page — only on login | 🔴 Critical | OAuth buttons exist only on `/login`. A user who clicks "Create account" from the landing page cannot use social auth unless they already know to go to the login screen. Add the same OAuth buttons to the register page. |
| "Full name" field has no `required` attribute and no "(optional)" label hint | 🟡 Moderate | Label it clearly as "Full name (optional)" so users know it can be skipped. |
| Password field has `minLength={8}` enforced, but no visible strength guidance | 🟡 Moderate | Show a brief hint ("Minimum 8 characters") below the password field so users don't hit a silent form block. |
| No "forgot password" link or recovery flow | 🟡 Moderate | Add a "Forgot password?" link on the login page even if the feature is not yet implemented — placeholder text like "Contact your admin" is acceptable at this stage. Without it, locked-out users have no path forward. |

---

### 3. Login Flow (`/login`)

**What works well:**
- Registration success message via `?registered=1` query param is a nice touch — smooth contextual feedback.
- Loading state on the submit button ("Signing in…") prevents double-submits.

**Usability issues:**

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| After login, the app uses `window.location.href = "/dashboard"` instead of Next.js router | 🟡 Moderate | This triggers a full page reload, breaking the SPA experience and potentially causing a flash. Use `router.push("/dashboard")` or handle the redirect in the NextAuth `signIn` callback for consistency. |
| OAuth buttons ("Continue with Google/GitHub") have no icons | 🟡 Moderate | Social auth buttons are much more scannable and trustworthy with their brand logos. Users look for the Google/GitHub icon before reading the label. |
| OAuth and credentials sections are not visually separated | 🟢 Minor | Add an "or" divider between the credentials form and the OAuth buttons so users understand these are two different sign-in methods. |
| Error message is static ("Invalid credentials.") with no differentiation | 🟢 Minor | This is fine for security, but consider messaging like "No account found with that email" for clearly missing users to avoid confusion (if this is not a security concern for your threat model). |

---

### 4. Dashboard — Overview Section

**What works well:**
- Five metric cards (Total, Pass Rate, Passed, Failed, Skipped+Error) are logically ordered.
- Pass rate threshold coloring (≥80% success, ≥50% warning, <50% danger) adds useful semantic meaning.

**Usability issues:**

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| First-time user sees all zeros with no guidance on what to do next | 🔴 Critical | Add an empty-state call-to-action when `counts.total === 0`. Something like: "No test results yet. Upload a JUnit run or create a manual test case to get started." with quick-action links. |
| The "Home" link in the header navigates back to the landing page, not back within the app | 🟡 Moderate | This is confusing — "Home" in an app context usually means "dashboard home", not the marketing landing page. Either remove it or rename it to something like "Landing" or a logo link. |
| No persistent navigation between app sections | 🟡 Moderate | Everything is on one scrollable page. As the product grows, a sidebar or top nav with sections (Test Cases, Runs, Reports, Settings) will be needed. Consider roughing this in now before the information architecture becomes harder to change. |

---

### 5. Dashboard — Upload JUnit XML

**What works well:**
- Toast feedback during upload (`toast.loading` → `toast.success/error`) is a solid pattern.
- File type restriction (`.xml`) prevents wrong-format uploads.

**Usability issues:**

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| "Run name" field is optional with no default — the run may appear in history with a blank name | 🟡 Moderate | Either make the name required, or auto-populate a default like "Run {date}" in the placeholder text as a hint. A nameless run in the history list is confusing. |
| No file size indication before upload starts | 🟢 Minor | The description says "max 50 MB" — but there's no client-side validation before the upload begins. Show an error immediately if the selected file exceeds 50 MB rather than waiting for the server to reject it. |
| No progress indicator for large file uploads | 🟢 Minor | For larger JUnit XML files, the loading toast with no progress bar can feel stuck. A simple file size check and estimated time, or a determinate progress bar, would improve perceived performance. |

---

### 6. Dashboard — Create Manual Test Case

**What works well:**
- Field organization is logical: title, module, tags, priority/status, preconditions, then step.
- Client-side loading state prevents double-submissions.

**Usability issues:**

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| Only one test step can be added per test case | 🔴 Critical | Real test cases typically have multiple sequential steps. The current form captures a single `action` + `expected result`. Without multi-step support, QAs will either have to workaround with long freeform text, or the feature becomes too limited to be useful. Add an "Add another step" flow, even if simple. |
| The "Description" field is defined in the API payload but absent from the form UI | 🟡 Moderate | Users have no way to add a test case description through the UI, even though the backend supports it. Add a textarea for description between "Title" and "Module". |
| Form is long with 8+ fields and no progressive disclosure | 🟡 Moderate | For new users, the form is overwhelming. Consider showing only Title + Module + first step by default, with an "Advanced options" toggle for preconditions, tags, priority, and status. |
| No confirmation or success state within the form — only a toast | 🟢 Minor | After creating a test case, the form resets and only a toast confirms success. Consider briefly highlighting the "Test cases available" count update in the Manual Execution card so users know the case was created and is ready to use. |

---

### 7. Dashboard — Manual Execution

**What works well:**
- Client-side search across all test cases is a smart choice for large case libraries.
- The selected count indicator ("3 cases selected") provides good feedback.
- The fade gradient at the bottom of the list hints at scrollability.

**Usability issues:**

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| Test case list shows only the title — no module, status, or priority context | 🔴 Critical | When selecting cases to execute, QAs need to distinguish between similar-sounding titles. At minimum, show the module label next to each title (e.g., "User can log in · Auth"). A small badge for priority (Critical, High) would also help. |
| The run name is auto-generated as "Manual Run {date}" with no way to rename it before starting | 🟡 Moderate | Add a small "Run name" input above the "Start manual run" button, pre-filled with the auto-generated name but editable. Testers often want to name runs by sprint, feature, or environment. |
| Starting a run and executing an active run are in the same card with no clear visual separation | 🟡 Moderate | The "select cases → start run" UI and the "active run results" UI appear together without a clear state transition. A tester could be confused about which section they're interacting with. Use a clear divider or even a separate collapsed/expanded area for active run status. |
| No way to explicitly "complete" or "close" an active manual run | 🟡 Moderate | The active run persists in `IN_PROGRESS` state with no completion button. After marking all results, users have no signal that the run is done or a way to formally close it. Add a "Mark run as complete" button. |
| No bulk status actions on the active run (e.g., "Mark remaining as passed") | 🟢 Minor | For large runs, clicking each test one-by-one is tedious. A "Pass all remaining" or "Skip all" quick action would speed up smoke-test-style runs significantly. |
| "BLOCKED" status is not explained anywhere in the UI | 🟢 Minor | "BLOCKED" is domain-specific terminology (test is blocked by another issue). A tooltip or brief hint explaining the difference between FAILED and BLOCKED would help new testers. |

---

### 8. Dashboard — CI/CD API Key

**What works well:**
- The key name field is a good practice for managing multiple keys.
- The 20-second toast duration acknowledges that the key needs to be copied.

**Usability issues:**

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| The API key is only shown in a toast notification — if missed, the key is lost forever | 🔴 Critical | A toast notification is not the right affordance for a secret that can only be viewed once. Use a modal or inline reveal box with a "Copy to clipboard" button and a clear "I've saved this key" confirmation dismiss. This is the standard pattern used by GitHub, Stripe, and others. |
| No list of existing API keys — users cannot see how many keys exist or revoke old ones | 🔴 Critical | Once keys are generated, there's no way to see, manage, or revoke them from the UI. This is a security concern and a common workflow need. Add a key listing section below the generate form with the key name, creation date, and a revoke button. |
| No copy-to-clipboard button for the project ID (referenced in CI API docs) | 🟡 Moderate | The CI ingestion API requires `project_id`, but users have no easy way to find or copy this value from the dashboard. Add a small "Copy project ID" utility in the header or the API key card. |

---

## What Works Well

- **Information architecture** is sensible: metrics → actions → history is a logical top-to-bottom reading order.
- **Toast feedback system** (Sonner) is implemented consistently across all async actions — great for perceived responsiveness.
- **Auth redirect logic** correctly handles both unauthenticated access attempts (redirect to login) and already-authenticated users on the landing page (redirect to dashboard).
- **Client-side search** on test case selection is smart — loading up to 10,000 cases and filtering locally avoids round-trips for a core workflow.
- **Semantic metric coloring** on the pass rate card (green/amber/red thresholds) is a solid pattern that helps QA leads scan test health instantly.

---

## Priority Recommendations

### 1. Fix the registration-to-login redirect (High Impact, Low Effort)
Auto-login users immediately after successful registration. This is the single biggest drop-off point in any sign-up funnel. Mirror the `signIn("credentials", ...)` call used on the login page right after the successful POST to `/api/auth/register`.

### 2. Replace the API key toast reveal with a modal (High Impact, Low Effort)
Show the generated API key in a dedicated modal with a "Copy" button and a checklist-style "I have saved this key" confirmation. If the key is lost, the user must revoke and regenerate — an unnecessary support burden. This is a 30-minute fix with high security and UX payoff.

### 3. Add multi-step support to Test Case creation (High Impact, Medium Effort)
The single-step limitation makes the test case form too restrictive for real QA workflows. Add a dynamic step list — even a simple "Add step" button that appends another `action` + `expected result` pair — to make the feature genuinely usable.

### 4. Add module/priority context to the Manual Execution case list (High Impact, Low Effort)
Showing test case titles alone makes selection difficult for teams with large case libraries. Add a module badge next to each title. This is a one-line template change with a meaningful usability improvement.

### 5. Add an empty state to the dashboard for first-time users (Medium Impact, Low Effort)
New users land on a dashboard showing five zeros with no guidance. A single empty-state banner with two quick-action links ("Upload your first run" / "Create a test case") dramatically improves the onboarding experience without requiring a full walkthrough.

---

*Note: A separate visual design critique covering color, typography, and component consistency is available in `design-critique.md`.*

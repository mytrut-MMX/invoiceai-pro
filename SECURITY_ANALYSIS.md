# Security Analysis Report — InvoiceAI Pro

**Date:** 2026-03-24
**Branch:** `claude/security-analysis-endpoints-d77mD`
**Tools used:** Manual code review, njsscan 0.4.3, Bandit 1.9.4, Semgrep (rules: p/javascript)
**Scope:** `/api/` serverless functions, `/src/` React application

---

## 1. Endpoints Enumerated

### 1.1 Serverless API Endpoints (`/api/`)

| Endpoint | Method | Auth | CORS | Purpose |
|---|---|---|---|---|
| `GET /api/admin-data?password=` | GET | Query param password | `ALLOWED_ORIGIN` | Fetch users + contact submissions from Supabase |
| `POST /api/contact-submit` | POST | None | `ALLOWED_ORIGIN` | Insert contact form data into Supabase |
| `POST /api/claude-proxy` | POST | None (server-side key) | `ALLOWED_ORIGIN` | Proxy requests to `api.anthropic.com/v1/messages` |
| `POST /api/github-proxy` | POST | Client-supplied token | `*` (wildcard) | Proxy any `https://api.github.com{path}` request |

### 1.2 Frontend SPA Routes

| Route | Auth Guard | Notes |
|---|---|---|
| `/auth` | Public | Login / Register |
| `/admin` | Password gate (client-side) | Admin dashboard |
| `/home`, `/invoices`, `/quotes`, `/customers`, `/items`, `/payments`, `/settings/*` | React context check | All data in localStorage |
| `/`, `/privacy`, `/terms`, `/cookies`, `/gdpr`, `/templates`, `/contact` | Public | Landing / legal pages |

### 1.3 Parameters per Endpoint

**`GET /api/admin-data`**
- `password` (query string) — compared to `process.env.ADMIN_PASSWORD`

**`POST /api/contact-submit`** (body)
- `name` (optional string)
- `email` (required string, no format validation server-side)
- `subject` (optional string)
- `message` (required string)

**`POST /api/claude-proxy`** (body — full passthrough)
- Any valid Anthropic Messages API field; `max_tokens` enforced ≥ 8000 if missing/low
- `model`, `messages`, `system`, etc. — **no schema validation**

**`POST /api/github-proxy`** (body)
- `path` (string) — appended directly to `https://api.github.com`
- `method` (string) — passed as HTTP method
- `data` (any) — request body forwarded
- `token` (string) — used as `Bearer` token — **no server-side token; user-supplied**

---

## 2. Dependencies

| Package | Version | Notes |
|---|---|---|
| `react` | ^18.3.1 | UI framework |
| `react-dom` | ^18.3.1 | DOM renderer |
| `@supabase/supabase-js` | ^2.99.3 | DB client |
| `vite` (dev) | ^5.4.2 | Build tool |
| `@vitejs/plugin-react` (dev) | ^4.3.1 | Vite plugin |

> Minimal dependency surface — only 3 production dependencies. No known CVEs found at scan time for these versions.

---

## 3. Data Flow & Trust Boundaries

```
[Browser / User]
      │
      │  HTTPS
      ▼
[Vercel CDN + Serverless]
      │
      ├─ /api/claude-proxy ──────► [api.anthropic.com]  (server-to-server, API key secret)
      │                                  ▲
      │                                  │ System prompt includes: company data,
      │                                  │ client list, product list, recent invoices
      │                                  │ (read from localStorage, sent by browser)
      │
      ├─ /api/github-proxy ──────► [api.github.com/{user-controlled-path}]
      │                                  (user-supplied Bearer token, no path restriction)
      │
      ├─ /api/admin-data ────────► [Supabase REST API]  (service role key, server-side)
      │        ▲
      │        └── password= in query string (visible in logs, browser history)
      │
      ├─ /api/contact-submit ────► [Supabase REST API]  (service role key, server-side)
      │
      └─ /index.html (SPA) ◄────── All app state in localStorage (no server session)
                │
                ├── ai_invoice_users  → SHA-256 hashed passwords
                ├── iai_settings      → emailjs keys only (anthropic_key removed — SEC-005 fix)
                ├── iai_invoices      → financial documents
                ├── iai_clients       → PII (name, email, phone)
                └── iai_company       → org data (VAT number, bank details)
```

**Trust boundaries:**
- `[Browser]` → `[/api/*]`: CORS enforced (except github-proxy: `*`)
- `[/api/*]` → `[External APIs]`: protected by server env vars (except github-proxy uses client token)
- `[Browser localStorage]`: single trust boundary — any injected JS can read all data

---

## 4. Vulnerability Findings

### CRITICAL

---

#### SEC-001 — Admin Password Exposed in URL Query Parameter
**File:** `api/admin-data.js:10`, `src/pages/AdminPage.jsx:88,260`
**CWE:** CWE-598 (Information Exposure Through Query Strings in GET Request)
**OWASP:** A07:2021 Identification and Authentication Failures

```javascript
// api/admin-data.js:10
const { password } = req.query;

// AdminPage.jsx:88
const res = await fetch(`/api/admin-data?password=${encodeURIComponent(password)}`);
```

**Impact:** The admin password appears in:
- Vercel access logs (persisted server-side)
- Browser history
- Referrer headers forwarded to third-party resources
- Network proxy / CDN logs

**Recommendation:** Move password to a `POST` body or an `Authorization` header (e.g., `Authorization: Bearer <password>`).

---

#### SEC-002 — Admin Password Stored Plaintext in sessionStorage
**File:** `src/pages/AdminPage.jsx:263`
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information)

```javascript
sessionStorage.setItem('admin_pw', pw);  // plaintext password
```

**Impact:** Any XSS payload can read `sessionStorage.getItem('admin_pw')` and exfiltrate the admin password.

**Recommendation:** Do not persist the plaintext password. Store a short-lived server-issued token instead (e.g., JWT signed with `ADMIN_PASSWORD` as the secret, 1-hour expiry).

---

#### SEC-003 — No Input Validation / Path Traversal on GitHub Proxy
**File:** `api/github-proxy.js:20`
**CWE:** CWE-918 (Server-Side Request Forgery), CWE-20 (Improper Input Validation)

```javascript
const { path, method, data, token } = body;
const response = await fetch(`https://api.github.com${path}`, {
  method: method || 'GET',
  ...
```

**Impact:**
- Any caller (CORS is `*`) can proxy arbitrary GitHub API paths with any HTTP method (DELETE, PATCH, etc.) using their own token.
- While the hostname is hardcoded to `api.github.com`, a crafted `path` like `/../../` or encoded characters may bypass intent.
- No whitelist of allowed paths or methods — this is effectively an open GitHub API relay.
- Combined with the wildcard CORS (SEC-004), it can be called from any website.

**Recommendation:** Whitelist allowed `path` prefixes (e.g., only `/repos/mytrut-mmx/invoiceai-pro/...`). Whitelist allowed `method` values to `['GET', 'POST']`. Consider using a server-side GitHub App token instead of accepting user tokens.

---

#### SEC-004 — Wildcard CORS on GitHub Proxy
**File:** `api/github-proxy.js:2`
**CWE:** CWE-942 (Overly Permissive Cross-Origin Whitelist)

```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Impact:** Any website can make credentialed or non-credentialed requests to `/api/github-proxy`, including malicious third-party pages that trick users into visiting them (CSRF-adjacent). Combined with SEC-003, this enables arbitrary GitHub API abuse from any origin.

**Recommendation:** Restrict to `ALLOWED_ORIGIN` (same as other endpoints) or the specific production domain.

---

### HIGH

---

#### SEC-005 — Anthropic API Key Stored in localStorage — **FIXED**
**File:** `src/store/index.js` (remediated)
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information), CWE-522 (Insufficiently Protected Credentials)

```javascript
// settings object persisted to localStorage key 'iai_settings'
// FIXED: anthropic_key removed — only emailjs keys remain
{ emailjs_service: '', emailjs_template: '', emailjs_public: '' }
```

**Status:** Resolved. The `anthropic_key` field has been removed from client-side storage and UI. All AI calls now go through `/api/claude-proxy` which uses the server-side `ANTHROPIC_API_KEY` env var. Legacy `anthropic_key` values are stripped on load.

---

#### SEC-006 — Unvalidated Body Passthrough to Anthropic API (Token Exhaustion / Model Injection)
**File:** `api/claude-proxy.js:11-21`
**CWE:** CWE-20 (Improper Input Validation)

```javascript
const body = { ...req.body };
if (!body.max_tokens || body.max_tokens < 8000) body.max_tokens = 8000;
// body is forwarded entirely to api.anthropic.com
```

**Impact:**
- Attacker can set `model` to an expensive model (e.g., `claude-opus-4-6`) to exhaust API quota.
- Attacker can inject arbitrary `system` prompts, overriding the application's intent.
- `max_tokens` guard only prevents values *below* 8000 — attacker can set it to 100,000.
- Attacker can use the proxy as an anonymous Claude API relay (no authentication on the endpoint).

**Recommendation:** Enforce a schema: whitelist permitted fields (`model`, `messages`, `system`, `max_tokens`), hardcode the model to an approved value, cap `max_tokens` at a sensible maximum (e.g., 4096), and require authentication before calling this endpoint.

---

#### SEC-007 — XSS Risk via `document.write(el.outerHTML)` in Print Function
**File:** `src/components/shared/index.jsx:483-485`
**CWE:** CWE-79 (Cross-Site Scripting)

```javascript
const w = window.open("","_blank","width=900,height=700");
w.document.write(`<!DOCTYPE html><html>...<body>${el.outerHTML}</body></html>`);
```

**Impact:** `el.outerHTML` serialises the live DOM element that represents the invoice. If an invoice field (e.g., `notes`, `client_name`, `description`) contains `<script>` or event-handler attributes (injected via a malicious client name or notes field), those will execute in the newly-opened window's context. This is a stored-XSS-to-print-window vector.

**Recommendation:** Use `window.print()` with a print-only stylesheet applied to the current page instead of `document.write`, or sanitise `el.outerHTML` with DOMPurify before writing to the new window.

---

#### SEC-008 — Legacy Plaintext Password Comparison
**File:** `src/pages/AuthPage.jsx:71,74`
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information), CWE-261 (Weak Cryptography for Passwords)

```javascript
// login path
const found = users.find(u => u.email === email && (u.password === pwHash || u.password === password));
// migration path
if(found.password === password) { /* upgrades to hash */ }
```

**Impact:** Accounts that were created before the SHA-256 migration still store passwords in plaintext. If localStorage is read (via XSS or physical access to the device), all legacy passwords are exposed in cleartext. The migration only runs on successful login, so dormant accounts are never upgraded.

**Recommendation:** Run a migration on all accounts at app startup, re-hashing any plaintext passwords. Remove the `u.password === password` fallback after the migration window.

---

### MEDIUM

---

#### SEC-009 — No Rate Limiting on Any API Endpoint
**File:** All `api/*.js`
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

No rate limiting, throttling, or lockout exists on:
- `/api/admin-data` — brute-force the admin password
- `/api/claude-proxy` — exhaust Anthropic API quota
- `/api/contact-submit` — spam contact form submissions

**Recommendation:** Add Vercel Edge middleware or an in-memory counter with exponential backoff. For Vercel, consider using `@vercel/edge-config` or an upstash-redis-based rate limiter.

---

#### SEC-010 — Sensitive PII Sent to Third-Party AI (Anthropic)
**File:** `src/components/AIChat.jsx:14-19`
**CWE:** CWE-359 (Exposure of Private Information)

```javascript
const systemPrompt = `...
CLIENTS: ${JSON.stringify(clients.map(c => ({ id: c.id, name: c.name, email: c.email })))}
PRODUCTS/SERVICES: ${JSON.stringify(products.map(...))}
RECENT INVOICES: ${JSON.stringify(invoices.slice(0, 10)...)}
`
```

Every AI chat request transmits:
- Client names and email addresses
- Product/service names and prices
- Recent invoice numbers, amounts, and statuses

to Anthropic's API without any opt-in consent disclosure to end users.

**Recommendation:** Add a consent notice before first AI use. Minimise data sent (e.g., only IDs and non-PII fields). Review Anthropic's data retention policy and include it in the Privacy Policy.

---

#### SEC-011 — `unsafe-inline` in Content Security Policy (style-src)
**File:** `vercel.json:16`
**CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers)

```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

**Impact:** `unsafe-inline` for styles allows CSS injection attacks (CSS exfiltration, clickjacking via overlays). It also reduces the overall strength of the CSP.

**Recommendation:** Extract inline styles to external stylesheets or use a nonce-based CSP approach. This is non-trivial given the heavy use of inline `style=` props in React, but a `style-src` nonce can be applied.

---

#### SEC-012 — Timing Attack on Password Comparison
**File:** `src/pages/AuthPage.jsx:71`
**CWE:** CWE-208 (Observable Timing Discrepancy)

```javascript
const found = users.find(u => u.email === email && (u.password === pwHash || u.password === password));
```

JavaScript `===` string comparison is not constant-time. While the 600ms artificial delay partially masks this, a determined attacker can still use statistical timing analysis, especially in automated brute-force scenarios.

**Recommendation:** Use a constant-time comparison function such as `crypto.subtle.timingSafeEqual` (available in modern browsers and Node.js) for password hash comparisons.

---

#### SEC-013 — No Input Sanitization on Contact Form
**File:** `api/contact-submit.js:10,32`
**CWE:** CWE-20 (Improper Input Validation)

```javascript
const { name, email, subject, message } = req.body || {};
if (!email || !message) { /* minimal check */ }
body: JSON.stringify({ name: name || null, email, subject: subject || 'General', message }),
```

- `email` is not validated as a proper email address server-side (only client-side).
- `subject` is accepted as free text (not limited to the expected enum values).
- `name` and `message` have no length limits — potential DB bloat / DoS.

**Recommendation:** Validate email format with a regex server-side. Limit field lengths (e.g., `name` ≤ 100 chars, `message` ≤ 5000 chars). Restrict `subject` to the expected enum values.

---

### LOW / INFORMATIONAL

---

#### SEC-014 — Weak ID Generation (Math.random)
**File:** `src/store/index.js:77`
**Tool:** njsscan — `node_insecure_random_generator` (CWE-327)

```javascript
const genId = () => Math.random().toString(36).slice(2, 9).toUpperCase()
```

`Math.random()` is not cryptographically secure. Invoice/quote IDs could theoretically be predicted. Use `crypto.randomUUID()` (available natively in modern browsers and Node.js 14.17+) or `crypto.getRandomValues()`.

---

#### SEC-015 — Internal Error Messages Leaked to Client
**File:** `api/admin-data.js:41`, `api/contact-submit.js:41`, `api/claude-proxy.js:26`, `api/github-proxy.js:34`

```javascript
} catch (e) {
  res.status(500).json({ error: e.message });
}
```

Node.js `Error.message` can contain stack traces, internal paths, or service-specific error strings. This can aid attackers in understanding the system internals.

**Recommendation:** Log `e.message` server-side only; return a generic `"Internal server error"` to the client.

---

#### SEC-016 — No `HttpOnly` / `Secure` Cookie Session (All State in localStorage)
**CWE:** CWE-1004 (Sensitive Cookie Without HttpOnly Flag)

All authentication state (user session, role) is stored in `localStorage`, not in `HttpOnly` cookies. Any XSS attack can exfiltrate the session instantly. There is no server-side session invalidation mechanism.

**Recommendation:** For a production multi-user system, move authentication to a server-side session with `HttpOnly; Secure; SameSite=Strict` cookies or use Supabase Auth (which handles this correctly).

---

## 5. SAST Tool Summary

| Tool | Files Scanned | Findings | Severity |
|---|---|---|---|
| **njsscan 0.4.3** | All JS/JSX | 1 | WARNING: `Math.random()` (CWE-327) — `src/store/index.js:77` |
| **Bandit 1.9.4** | All JS/JSX | 0 | (Bandit is Python-focused; no Python files present) |
| **Semgrep** | — | Not executed | cffi backend error in environment |
| **Manual Review** | All API + key src files | 15 | 4 Critical, 4 High, 5 Medium, 3 Low |

---

## 6. Risk Summary

| ID | Title | Severity | Exploitability | Impact |
|---|---|---|---|---|
| SEC-001 | Admin password in query string | **CRITICAL** | Easy | Full admin access |
| SEC-002 | Admin password in sessionStorage plaintext | **CRITICAL** | Via XSS | Admin takeover |
| SEC-003 | No path/method validation on GitHub proxy | **CRITICAL** | Easy | GitHub API abuse |
| SEC-004 | Wildcard CORS on GitHub proxy | **CRITICAL** | Easy | CSRF / cross-origin abuse |
| SEC-005 | Anthropic key in localStorage | **HIGH** | Via XSS | API key theft / cost abuse |
| SEC-006 | Unvalidated body passthrough to Claude | **HIGH** | Easy (no auth) | Quota exhaustion / model injection |
| SEC-007 | XSS via document.write(outerHTML) | **HIGH** | Via stored XSS | Code execution in print window |
| SEC-008 | Legacy plaintext password storage | **HIGH** | Via localStorage read | Credential exposure |
| SEC-009 | No rate limiting | **MEDIUM** | Easy | Brute-force / spam / quota burn |
| SEC-010 | PII sent to Anthropic | **MEDIUM** | By design | Privacy / GDPR risk |
| SEC-011 | unsafe-inline in CSP | **MEDIUM** | Reduces CSP effectiveness | CSS injection |
| SEC-012 | Non-constant-time password compare | **MEDIUM** | Statistical | Password leakage |
| SEC-013 | No server-side input validation on contact | **MEDIUM** | Easy | Data quality / DoS |
| SEC-014 | Math.random() for IDs | **LOW** | Theoretical | ID prediction |
| SEC-015 | Error messages leaked | **LOW** | Passive | Info disclosure |
| SEC-016 | All auth state in localStorage | **LOW** | Via XSS | Session theft |

---

## 7. Recommended Remediation Priority

1. **Immediate (Critical)**
   - SEC-001: Move admin password to POST body / Authorization header
   - SEC-002: Remove plaintext password from sessionStorage
   - SEC-003: Add path/method whitelist to github-proxy
   - SEC-004: Restrict CORS on github-proxy to `ALLOWED_ORIGIN`

2. **Short-term (High)**
   - SEC-005: Remove Anthropic key from localStorage; route all AI calls through authenticated server-side proxy
   - SEC-006: Add schema validation + authentication to claude-proxy
   - SEC-007: Replace `document.write(outerHTML)` with a sanitised approach
   - SEC-008: Run password migration on app startup; remove plaintext fallback

3. **Medium-term**
   - SEC-009: Add rate limiting to all API endpoints
   - SEC-010: Add AI data-sharing consent + minimise PII in prompts
   - SEC-011: Remove `unsafe-inline` from CSP
   - SEC-013: Add server-side validation to contact-submit

---

*Report generated by manual review + njsscan 0.4.3 + Bandit 1.9.4*

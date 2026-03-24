# Auth & Session Security Analysis — InvoiceAI Pro
## JWT · Session Management · CSRF · Password Hashing

**Date:** 2026-03-24
**Tools used:** Manual review, jwt_tool (conceptual), Burp Suite (conceptual), source code analysis
**Branch:** `claude/security-analysis-endpoints-d77mD`

---

## 1. JWT Analysis

### 1.1 JWT Presence

**No JWTs exist in the codebase.** The application uses two ad-hoc credential patterns:

| Context | Mechanism | Risk |
|---|---|---|
| User session (SPA) | Raw object in `localStorage` — no signature, no expiry | Tamperable by any JS on page |
| Admin panel | Raw password compared on every request via `Authorization: Bearer <password>` | Password re-transmitted on each API call |
| Invoice/Quote share links | `crypto.randomUUID().split("-")[0]` (8 hex = **32 bits**) as URL token | Brute-forceable; no server validation |

### 1.2 JWT Attack Surface (alg=none, weak secret, expiry)

Since no JWT library is used, the classic `alg=none` attack does not directly apply. However, the **equivalent vulnerabilities** exist in the custom mechanisms:

#### alg=none equivalent — Admin token has no signature
**File:** `api/admin-data.js`, `src/pages/AdminPage.jsx`

Before the previous fix, the admin endpoint accepted:
```
GET /api/admin-data?password=<plaintext>
```
There was no cryptographic signing of the session — just a plain string compare. This is functionally equivalent to a JWT with `alg=none`: anyone who guesses or observes the "secret" immediately has full access.

After the previous fix, the password moved to `Authorization: Bearer <password>`. This is still an `alg=none` equivalent because the "token" is the secret itself, not a signed derivative. Every data fetch re-transmits the credential.

**Correct approach:** Issue a short-lived signed HMAC-SHA256 token at login time. Subsequent requests present the token, not the password.

#### Weak secret equivalent — SHA-256 unsalted password hashes
**File:** `src/pages/AuthPage.jsx:8`

```javascript
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  // ...
}
```

SHA-256 is a **message digest**, not a password hash function:
- No salt → identical passwords produce identical hashes (rainbow table attack)
- No iterations → GPU can compute ~10 billion SHA-256 hashes/second
- A modern GPU cracks all 8-character lowercase+digit passwords in under 1 minute

| Algorithm | Speed (GPU) | Salt | Iterations | Suitable for passwords |
|---|---|---|---|---|
| MD5 | ~100 B/s | No | 1 | NO — broken |
| SHA-256 (current) | ~10 B/s | No | 1 | NO — too fast |
| bcrypt (cost=12) | ~10 K/s | Yes | 4096 | YES |
| PBKDF2-SHA256 (600k iter) | ~50 K/s | Yes | 600,000 | YES (NIST SP 800-132) |
| Argon2id (m=65536) | ~1 K/s | Yes | Variable | YES (OWASP recommended) |

**Argon2id** and **bcrypt** are not available via the browser's Web Crypto API. **PBKDF2** is natively available via `crypto.subtle.deriveBits` and is the correct choice for client-side hashing.

#### Token expiry — none on share links, none on user session
**File:** `src/pages/QuotesPage.jsx:93`, `src/pages/InvoicesPage.jsx:157`

```javascript
const token = crypto.randomUUID().split("-")[0]; // 8 hex chars = 32 bits
const shareUrl = `.../quote/${quoteNumber}?token=${token}&expires=${expiresOn}`;
```

Problems:
1. **32-bit entropy** — the first UUID segment is only 8 hex characters. Brute-force space: ~4.3 billion values. At 1000 req/s: cracked in 50 days. At 100K req/s: 12 hours.
2. **No server-side validation** — `expires` and `token` are URL parameters never validated by a backend. Any client can change `expires=2099-12-31`.
3. The token is never stored anywhere for validation — it's purely decorative.

---

## 2. Session Management

### 2.1 Session Architecture

```
Login → hashPassword(pw) → compare localStorage[ai_invoice_users]
      → onAuth({ name, email, role })
      → App.jsx: setUser(u) → localStorage.setItem("ai_invoice_user", JSON.stringify(u))
```

The "session" is a plain JavaScript object:
```json
{ "name": "User Name", "email": "user@example.com", "role": "Admin" }
```

No token, no signature, no expiry, no server knowledge.

### 2.2 Session Fixation
**CWE-384 (Session Fixation)**

An attacker with pre-existing access to the device (or via XSS before login) can **pre-set** the session:
```javascript
localStorage.setItem("ai_invoice_user", JSON.stringify({
  name: "Attacker", email: "attacker@evil.com", role: "Admin"
}));
```
After login, if the application trusts `ai_invoice_user` without regenerating the session, the attacker is logged in.

**Current code:**
```javascript
// App.jsx:42 — trusts whatever is in localStorage at startup
const [user, setUser] = useState(() => LS.get("ai_invoice_user", null));
```
No validation of integrity, no binding to the login event, no rotation.

### 2.3 Session Hijacking
**CWE-613 (Insufficient Session Expiration)**

- The session object never expires — a stolen session is valid indefinitely
- No `iat` (issued-at) or `exp` (expiry) field
- If an attacker exfiltrates `ai_invoice_user` via XSS, they have permanent access
- No server-side session registry to invalidate sessions

### 2.4 Session Integrity
The session object can be modified directly:
```javascript
// In browser console — escalate role or change email
const u = JSON.parse(localStorage.getItem("ai_invoice_user"));
u.role = "SuperAdmin";
localStorage.setItem("ai_invoice_user", JSON.stringify(u));
```
Since there is no server validation of the role (the app is fully client-side), this doesn't grant real backend access — but it does affect any client-side role checks.

---

## 3. CSRF Analysis

### 3.1 Why Traditional CSRF Doesn't Apply

Traditional CSRF exploits **cookies** sent automatically by the browser. This application uses no cookies for authentication — sessions are in `localStorage`. `localStorage` is **same-origin only** and is never auto-transmitted by the browser. Therefore classic CSRF attacks (e.g., `<img src="https://api/transfer">`) cannot authenticate as the victim.

### 3.2 Where CSRF-Adjacent Risk Exists

#### Pre-fix: Wildcard CORS on github-proxy
Before fix SEC-004, `api/github-proxy.js` had `Access-Control-Allow-Origin: *`. Any website could call it:
```html
<!-- On evil.com — calls the InvoiceSaga GitHub proxy with victim's token -->
<script>
  fetch("https://invoicesaga.com/api/github-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/user/repos", method: "DELETE", token: "victim_token" })
  });
</script>
```
This is now fixed (CORS restricted to `ALLOWED_ORIGIN`).

#### Pre-fix: Admin password in URL
Before fix SEC-001, `?password=admin123` appeared in the URL. Any page embedding an `<img>` or `<link>` pointing to that URL would cause the browser to make the request with the password visible in logs. Now using `Authorization: Bearer` header — CORS prevents cross-origin reads of this header.

#### Current: No CSRF tokens on API endpoints
The API endpoints don't use CSRF tokens, but since:
- No cookies are used
- CORS is now restricted to `ALLOWED_ORIGIN`
- Custom `Authorization` headers can't be sent cross-origin (CORS blocks preflight)

The residual CSRF risk is **LOW** given the current architecture.

### 3.3 What Would Be Required for a Full CSRF Protection
If the application ever adds cookie-based auth, it would need:
- `SameSite=Strict` or `SameSite=Lax` on session cookies
- Double-submit CSRF token in both cookie and request header
- Origin/Referer header validation on state-changing endpoints

---

## 4. Password Hashing Deep Dive

### 4.1 Current: SHA-256 (No Salt, No Iterations)

```javascript
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
// Stored as: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
```

**Vulnerabilities:**
- `SHA-256("password")` is always `5e884...` — pre-computed rainbow tables exist
- Hashcat on RTX 4090: ~21 billion SHA-256/sec — cracks 8-char password in milliseconds
- Two users with the same password have the same hash — trivially identifiable

### 4.2 Recommended: PBKDF2-SHA256 (Web Crypto Native)

```javascript
// Format: "pbkdf2:310000:<16-byte-salt-hex>:<32-byte-hash-hex>"
// Example: "pbkdf2:310000:a3f2...bc9d:7e1a...9f2b"
```

PBKDF2 with 310,000 iterations is the OWASP-recommended minimum for SHA-256 (2023).
- Salt: 16 bytes from `crypto.getRandomValues` — unique per user
- Iterations: 310,000 — ~31ms on a modern browser; ~310 seconds per guess on a GPU
- Available natively via `crypto.subtle.deriveBits` — no external library needed

### 4.3 Migration Strategy (Backward Compatible)

```
Startup: scan ai_invoice_users → if password starts with "pbkdf2:" → skip
                                 if password is 64-char hex (SHA-256) → upgrade on next login
                                 if password is plaintext → upgrade immediately
On login: verify with stored format → if SHA-256 → re-hash with PBKDF2 → save
```

---

## 5. Vulnerability Summary (This Analysis)

| ID | Title | Severity | CWE |
|---|---|---|---|
| AUTH-001 | Admin re-transmits password on every API call (no session token) | CRITICAL | CWE-522 |
| AUTH-002 | SHA-256 unsalted password hashing (rainbow table + GPU brute-force) | CRITICAL | CWE-916 |
| AUTH-003 | No session expiry — stolen session valid forever | HIGH | CWE-613 |
| AUTH-004 | Session fixation — no session rotation on login | HIGH | CWE-384 |
| AUTH-005 | Share link token: 32-bit entropy (8 hex chars of UUID) | HIGH | CWE-330 |
| AUTH-006 | Share link expiry enforced client-side only — trivially bypassed | HIGH | CWE-807 |
| AUTH-007 | Session object has no integrity protection (role escalation via console) | MEDIUM | CWE-345 |
| AUTH-008 | No account lockout / brute-force protection on login | MEDIUM | CWE-307 |

---

## 6. Remediations Applied in This Commit

| ID | Fix |
|---|---|
| AUTH-001 | New `api/admin-login.js` endpoint issues HMAC-SHA256 signed token; `admin-data.js` validates token (not raw password) |
| AUTH-002 | `hashPassword()` replaced with PBKDF2-SHA256 (310,000 iterations, 16-byte random salt); migration path handles SHA-256 → PBKDF2 upgrade on login |
| AUTH-003 | Session gains `expiresAt = now + 8 hours`; `App.jsx` validates on load and clears expired sessions |
| AUTH-004 | Session regenerated (new expiry) on each successful login |
| AUTH-005 | Share link tokens use full `crypto.randomUUID()` (122 bits of entropy) |
| AUTH-008 | Login brute-force: max 5 failed attempts per email → 15-minute lockout (in-memory) |

*AUTH-006 (client-side expiry) and AUTH-007 (role escalation) remain architectural limitations of a fully client-side app. True fixes require a server-side session store.*

# Sprint 1 — Security Hardening Changelog

## Completed
- [A1] SEC-005: Removed Anthropic API key from localStorage
- [A2] SEC-008/AUTH-002: Removed legacy plaintext password fallback, cleaned localStorage
- [A3] SEC-014: Replaced Math.random() with crypto.randomUUID() for ID generation
- [B1] SEC-009: Added rate limiting to all API endpoints
- [B2] SEC-013: Added server-side input validation on contact-submit
- [C1] SEC-007: Sanitized print window HTML with DOMPurify
- [C2] XSS-001: Added SVG path validation on Icon component
- [D1] IDOR-001: Created RLS verification migration + audit checklist
- [D2] AUTH-005/006: Increased share link token entropy to full UUID
- [D3] SEC-006: Added Supabase Auth verification on claude-proxy
- [D4] SEC-010: Minimized PII in AI prompts + added consent dialog
- [D5] XSS-004: Added image upload MIME validation
- [D6] SEC-015: Sanitized error messages on all API endpoints

## Remaining (architectural limitations)
- SEC-011: unsafe-inline in CSP (requires full CSS refactor)
- SEC-016: localStorage sessions (mitigated by Supabase Auth adoption)
- AUTH-006: Client-side share link expiry (needs server-side endpoint)
- AUTH-007: Session integrity (client-side limitation, mitigated by Supabase Auth)

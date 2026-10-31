# Admin entry, email OTP and login history

## Activate safely

1. Upgrade the app, log in as usual and open Cài đặt → Bảo mật & đăng nhập (`/admin/bao-mat`). New installations keep existing login behavior until verified activation; deploying this feature does not silently lock existing admins out.
2. Configure and test Email & SMTP first. OTP goes ONLY to the email in the admin account, not a recipient supplied by a login request. ADMIN_EMAIL creates the initial account only on first startup; changing the environment variable does not edit existing account emails.
3. Copy/bookmark the generated `/jingo-<24 random hex>` URL. “Mở thử” opens that private entry before activating it, so the path can be checked first.
4. Choose private-entry enforcement, mandatory email OTP and optional estimated IP location. Request a SETUP code, enter it and save. No successful email verification means no policy change. All prior admin sessions, including the old current token, are revoked; the current browser receives a newly generated session.
5. Log out, open the bookmarked private URL, enter password and then the emailed LOGIN OTP. Password alone must not grant a session while OTP is enabled. `/admin` remains the workspace for authenticated admins; an unauthenticated visit does not reveal a login form when private entry is enabled. The known password API also requires the entry identifier while enforcement is enabled.

Email OTP is an additional verification step, not phishing-resistant authentication. The path is secondary defense, not a replacement for password/OTP. Admin/private entry pages use no-store, no-referrer, nosniff and frame-ancestor/iframe denial headers. There is no public endpoint to reveal the private path, no fixed OTP, and no production bypass/test credential.

## OTP and session behavior

Codes are cryptographically random six-digit values, expire after 5 minutes, allow at most five failed code attempts and are single-use. HMAC-SHA256 with a purpose-derived key from the existing private `.smtp-key` protects stored codes against offline brute-force of six-digit values from a DB-only leak. The key must be backed up with encrypted application data. OTP, password, cookie/session token, proxy secret and full private entry are never included in the login journal.

LOGIN challenges bind to a random HttpOnly/SameSite=Strict challenge cookie, SETUP challenges to the current admin session. Purpose and admin identity are checked. Row locks serialize code consumption; challenge use and session creation / policy mutation commit together. Wrong-code attempt increments are committed before rejection. Resend needs 60 seconds; at most 5 codes per admin/purpose per 15 minutes. New codes invalidate older pending codes of the same purpose. No SMTP fallback logs an admin in without OTP. The UI countdown uses server-reported remaining seconds, so a client clock offset does not decide validity; server expiry remains authoritative.

Password attempts are limited persistently in PostgreSQL per account (5/15 minutes) and peer (100/15 minutes), before scrypt. OTP verification also limits peer requests. Limits survive API restarts. Expired challenge/limit rows older than one day are pruned on a later throttled auth request, at most hourly. Login history itself is retained separately. Normal login sessions expire after 8 hours and use random tokens stored as SHA-256 digests, HttpOnly, SameSite=Strict and Secure with an HTTPS public base URL. The cookie scope is `/` to allow server-side protection of `/admin`; legacy `/api/v1/admin` cookie is cleared during successful login/rotation/logout. Private path is stored only in that browser's sessionStorage for re-login navigation; bookmark it for a new browser/session.

## Accurate IP behind Nginx Proxy Manager

The app does NOT trust X-Forwarded-For / X-Real-IP from the browser. Until the following is configured it logs socket/proxy IP and marks it accordingly. Correct historical IP cannot be reconstructed later from an untrusted header.

1. On a trusted terminal generate `openssl rand -hex 32`. Set the value as `ADMIN_PROXY_SECRET` in JinGo .env (do not commit it). This secret is solely for proxy metadata, different from SePay and SMTP credentials.
2. Apply `deploy/nginx/client-ip.conf` (all APIs; see `docs/PROXY-CLIENT-IP.md`) or the legacy admin-only `deploy/nginx/admin-ip-metadata.conf` in NPM's JinGo Advanced field **alongside**, not replacing, any SePay location. Replace its placeholder with that same secret and verify upstream `172.16.150.171:3100`. Do not duplicate an existing admin API location; merge it if necessary.
3. Recreate API after editing env. On proxyserver run `sudo docker exec proxy-app-1 nginx -t` and confirm NPM remains Online. Do not expose API port 4000 directly or turn this into an IP allowlist for admin login: roaming admins still need password/OTP.
4. Next web rewrite forwards the two NPM-overwritten headers. API accepts client IP only with a configured secret of at least 32 characters and a matching secret header plus a single valid IP. Arbitrary browser headers without that secret are ignored. `$realip_remote_addr` retains original TCP peer before global real-IP rewriting, avoiding the previously demonstrated X-Real-IP spoof.
5. If CDN/source NAT precedes NPM, original TCP peer may be the proxy, not end user. Fix that topology with an explicit trusted hop design before claiming real customer IP; do not whitelist all private networks or trust arbitrary forwarded headers. The login journal reports the source, not a guaranteed physical location.

The proxy secret is never returned in an admin API or UI. The optional header snippet is not installed automatically on live NPM. If left unconfigured, authentication still works, but IP/location may show proxy or unknown.

## Estimated city/region

Optional IP lookup uses HTTPS DB-IP Free API, with an application cap of 100 fresh requests/day and cached results for 30 days (provider currently advertises 500/day). Only IP is sent; no email, device name, password, OTP, URL or cookie. It is off by default until the admin opts in. Fresh network lookup happens only on a successful login, uses a 2-second timeout and fails open for login: unavailable/quota/unknown responses show no location. Private/reserved IPs are skipped. Other log events may use an already cached location. No GPS permission or exact location is requested. User-defined device/place name and browser timezone are separate, unverified metadata. DB-IP attribution appears on the history page. https://db-ip.com/api/free

## Recovery when SMTP or the entry URL is unavailable

Do not add an HTTP bypass. Use authorized database shell access on the server. To recover only a forgotten private URL, inspect `SELECT data->>'entrySlug' FROM jingo_admin_security WHERE id='policy';` locally and bookmark it; do not paste the result into public logs/chat.

For an actual OTP lockout, after verifying ownership, the server administrator can use a transaction in PostgreSQL to temporarily disable `otpEnabled` and `privateEntryEnabled` in the `jingo_admin_security` policy JSON, increment version, invalidate outstanding challenges and delete admin sessions. This is an offline database recovery, not an exposed app feature. Restore SMTP and activate protection again through SETUP OTP. Back up the current policy before changing it. No automatic recovery based on a client header/environment toggle exists.

## Validation

`src/admin/security.test.ts` covers setup activation, old-session revocation/rotation, password-only denial, bound browser challenges, OTP expiry/exhaustion/replay, cooldown, spoofed IP rejection, successful journal metadata and SMTP failure. Legacy admin/mail/POS/payment tests cover behavior while protection is not activated. These integration tests use pg-mem and do not prove real PostgreSQL concurrent row-lock semantics. UI tests use a local mock mailer only; production email delivery must be tested with the configured SMTP. No real OTP is exposed by any test endpoint in production.

References: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html ; https://nginx.org/en/docs/http/ngx_http_realip_module.html#embedded_variables .

## Admin identities at POS

When private entry or OTP is active, the separate POS password endpoint accepts an admin identity only when the same browser already holds a valid verified session for that SAME admin. Otherwise it instructs the admin to authenticate at the admin entry first and then log into POS again. Admin and POS cookies remain separate: an admin cookie alone never grants POS API access. Staff accounts and POS logout retain their independent behavior. Activating/changing admin security revokes legacy ADMIN-role POS sessions as well as prior admin sessions and pending LOGIN OTPs. Policy row locks prevent a password-only session from being issued after protection is concurrently activated.

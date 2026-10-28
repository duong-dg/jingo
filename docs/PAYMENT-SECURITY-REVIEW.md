# Payment security review — 2026-10-28

Scope: source review of VNPay/SePay adapters, gateway settings, admin guard/session/CSRF, lookup credentials, payment ledger transaction boundaries, mail-secret encryption/media routing, deployment network exposure and production dependency advisories. This is not a production penetration test or a merchant certification.

## Fixed

- **High — retired LIVE requests could still settle after disabling VNPay or switching the application to TEST.** A valid historical signature was sufficient because settlement only used the attempt snapshot. Settlement now checks the current environment and provider switch under a shared settings-row lock in the payment transaction. Settings updates take the conflicting PostgreSQL update lock. Disabled or mismatched callbacks are logged as REVIEW with no payment, revenue or payment email. Applies to SePay too. Re-enabling does not automatically replay reviewed events: reconcile against the bank and record through the manual collection workflow.
- **High — rotated VNPay secrets remained trusted for older requests.** A valid callback signed with the retired snapshot key now goes to REVIEW if its encrypted credential snapshot no longer matches current configuration. Pending requests must be recreated after rotation. VNPay signature verification still happens before accepting any event.
- **Medium — TEST/LIVE credential reuse.** Changing modes now rejects resubmitting the same existing provider secret. Disabled providers still clear their previous credentials on a mode switch. This protects direct transitions; operators must keep test and live merchant credentials separate throughout their lifecycle.
- **Low — SePay numeric transaction IDs had multiple textual representations.** Canonical decimal IDs now share one idempotency namespace for number `206` and string `000206`. A duplicate with changed order/amount is rejected, not credited again.

## Verified controls

- Only authenticated admin sessions can view/edit gateway settings, inspect events or create TEST requests. Mutations require the admin header and a matching Origin when present; sessions use hashed random tokens and HttpOnly/SameSite cookies, Secure under HTTPS.
- Checkout verifies booking key or matching booking email, derives amount from server snapshot and permits only confirmed unpaid retail-web orders. POS/CTV orders do not enter this flow.
- VNPay HMAC-SHA512 verifies the signed canonical query, merchant, amount and both success codes. The browser return endpoint only redirects and cannot settle an order.
- SePay requires a timing-safe API-key check, incoming direction, exact bank/account, exactly one random payment memo and exact amount. Unsupported virtual accounts are reviewed. API Key authentication is implemented; HMAC/OAuth is not implemented.
- Order lock, unique gateway event and global payment reference, payment ledger, audit and email enqueue are transactional. Cancelled, archived, already-paid or debt orders cannot be automatically collected again.
- Secrets are AES-256-GCM encrypted; settings responses/event views do not return secrets or raw webhook payloads. Public image routes validate image IDs and do not expose arbitrary media-directory files. The encryption key is local to the media volume, not a separate KMS: a complete server compromise can still recover credentials.
- Compose publishes only the web port on loopback by default; PostgreSQL/Redis/API have no public host ports. Existing Ubuntu overrides/NAT/firewall were not inspected.
- `npm audit --omit=dev --json` on this date: **0 reported production vulnerabilities**. This is advisory-database coverage, not proof of absence of vulnerabilities.

## Validation and limits

Automated regression scenarios include forged/tampered/repeated callbacks, wrong amounts/accounts, TEST isolation, unauthenticated admin access, wrong Origin/header, credential storage, retired keys, disabled gateways, LIVE-to-TEST callbacks, reused credentials, canonical transaction IDs and cross-order replay. They use pg-mem and fake merchant credentials. Real PostgreSQL lock/concurrency behavior and actual VNPay/SePay callback delivery remain unverified.

Before enabling LIVE: verify `PUBLIC_BASE_URL=https://jingo.io.vn`, TLS and trusted reverse proxy, actual webhook/IPN URLs, separate merchant credentials, server firewall, database/media backups with restore practice, and end-to-end sandbox then a controlled real transaction. Preserve the media-volume encryption key together with encrypted database backups; never serve the media directory as a generic static directory.

Remaining hardening: admin MFA/step-up authentication for bank-account changes; security alerting for configuration changes and REVIEW events; distributed rate limiting before scaling API replicas. Existing in-memory limits use the raw socket address: behind a shared proxy, legitimate customers can share a quota, while restarts reset it. Configure proxy-side rate limits using trusted client-IP handling; do not blindly trust client-supplied forwarding headers. No production config or real payment was changed by this review.

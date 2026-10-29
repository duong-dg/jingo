# Payment security review — 2026-10-28

Scope: source review of VNPay/SePay adapters, gateway settings, admin guard/session/CSRF, lookup credentials, payment ledger transaction boundaries, mail-secret encryption/media routing, deployment network exposure and production dependency advisories. This is not a production penetration test or a merchant certification.

## Fixed

- **High — retired LIVE requests could still settle after disabling VNPay or switching the application to TEST.** A valid historical signature was sufficient because settlement only used the attempt snapshot. Settlement now checks the current environment and provider switch under a shared settings-row lock in the payment transaction. Settings updates take the conflicting PostgreSQL update lock. Disabled or mismatched callbacks are logged as REVIEW with no payment, revenue or payment email. Applies to SePay too. Re-enabling does not automatically replay reviewed events: reconcile against the bank and record through the manual collection workflow.
- **High — rotated VNPay secrets remained trusted for older requests.** A valid callback signed with the retired snapshot key now goes to REVIEW if its encrypted credential snapshot no longer matches current configuration. Pending requests must be recreated after rotation. VNPay signature verification still happens before accepting any event.
- **Medium — TEST/LIVE credential reuse.** Changing modes now rejects resubmitting the same existing provider secret. Disabled providers still clear their previous credentials on a mode switch. This protects direct transitions; operators must keep test and live merchant credentials separate throughout their lifecycle.
- **Low — SePay numeric transaction IDs had multiple textual representations.** Canonical decimal IDs now share one idempotency namespace for number `206` and string `000206`. A duplicate with changed order/amount is rejected, not credited again.

## Verified controls

- Only authenticated admin sessions can view/edit gateway settings, inspect events or create TEST requests. Mutations require the admin header and a matching Origin when present; sessions use hashed random tokens and HttpOnly/SameSite cookies, Secure under HTTPS.
- Public checkout verifies the booking key or matching email and only permits retail-web orders. Separate authenticated checkout endpoints support POS carts (COLLECT permission and assigned counter, rechecked in transaction) and CTV carts (own active partner account). All amounts derive from outstanding confirmed order snapshots. Public credentials cannot open POS/CTV payment intents. Callback settlement preserves the original cart channel/ownership, credits each child once and attaches POS payments to the shift open at receipt. Online CTV payment creates no credit or wallet entry.
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


## International cards (2026-10-29)

- VNPay explicit card choice uses the existing signed checkout/IPN with `vnp_BankCode=INTCARD`; it is hidden until the admin enables the merchant card capability. Turning it off sends outstanding explicit card payments to review.
- SePay cards use a separate merchant ID, encrypted signing secret and encrypted IPN authentication key. The signed POST form targets only the fixed TEST or LIVE SePay checkout endpoint. No card details are collected by JinGo.
- SePay card IPN requires `X-Secret-Key` (`SECRET_KEY` authentication configured at SePay). It verifies invoice/attempt, CARD method, CAPTURED + APPROVED PAYMENT, VND currency and exact order/transaction amounts. Decimal VND strings must have zero fractional digits. Browser success/error/cancel returns do not settle payments.
- Only settlement identifiers and normalized amounts/statuses enter the event fingerprint. Card numbers, names and expiry fields from IPN are discarded. Duplicate transaction notifications cannot pay a second invoice. VOID or mismatched events go to REVIEW and do not automatically refund money or cancel issued tickets.
- Merchant/key changes, disabled gateways and TEST/LIVE changes retain the existing review safeguards. TEST never creates a real receipt. Existing bank-transfer webhook configuration stays independent.
- Merchant activation, provider sandbox acceptance and a controlled live transaction remain to be verified after the merchant credentials are supplied.

Official integration references:
- https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
- https://developer.sepay.vn/vi/cong-thanh-toan/API/don-hang/form-thanh-toan
- https://developer.sepay.vn/vi/cong-thanh-toan/IPN
- https://developer.sepay.vn/vi/cong-thanh-toan/sandbox

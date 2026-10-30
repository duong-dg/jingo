# SePay webhook OAuth 2.0

Implements SePay standard `client_credentials` authentication, independently selectable from API Key and HMAC-SHA256. No additional SaaS or OAuth server required. This is a single-purpose machine client, not customer login or a general authorization server.

## Configuration

1. Admin → Thanh toán → SePay chuyển khoản → OAuth 2.0.
2. Choose an alphanumeric / dash / underscore Client ID and a random Client Secret of at least 32 characters. For example generate locally with `openssl rand -hex 32`. Keep it private; save the same values in SePay.
3. Save and enable SePay with the correct receiving bank/account. Use LIVE only after testing.
4. In SePay webhook authentication select OAuth 2.0 and copy the Token URL shown in admin, Client ID and Client Secret. Select incoming transfers and JSON webhook payload.
5. Token URL: `https://YOUR_DOMAIN/api/v1/payments/sepay/oauth/token`. Webhook URL remains `https://YOUR_DOMAIN/api/v1/payments/sepay/webhook`.
6. Test in SePay and inspect webhook logs plus JinGo payment journal. Local automated tests do not replace a real SePay integration test.

## Protocol and security

POST token endpoint with application/x-www-form-urlencoded, `grant_type=client_credentials`, credentials in HTTP Basic or form body (not both). Returns `access_token`, `token_type: Bearer`, `expires_in: 3600`, Cache-Control no-store / Pragma no-cache. No refresh token: SePay obtains a new token after expiration. Unsupported grants and invalid clients are rejected. Existing per-process public-payment throttle also covers token requests; proxy IP is not trusted from arbitrary headers.

Tokens are opaque HMAC-SHA256 authenticated values with purpose, client, TEST/LIVE, issued time and expiry. Only this webhook validates them; they grant no admin, POS or CTV access. Secret is encrypted using the existing server key, never returned by admin read APIs. Token and credentials are never written to the audit log. Use HTTPS throughout the public endpoint. Rotating to a different secret invalidates prior tokens; disabling SePay stops token issuance. Selecting another authentication method rejects Bearer tokens. There is no API Key/HMAC fallback while OAuth is selected.

OAuth authenticates the caller; unlike SePay HMAC it does not separately sign each request body. SePay configures one authentication method per webhook. Do not require both modes simultaneously. Existing account, bank, amount, intent expiration, credential concurrency, TEST isolation and transaction idempotency checks still apply before settlement.

No DB migration: credentials use the existing versioned encrypted payment settings record. Standard form parsing is provided by Nest Express. Web Next rewrite forwards this route to the API.

Reference: https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc#oauth-20

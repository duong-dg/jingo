# SePay webhook security and operations

## Application behavior

- LIVE settings require PUBLIC_BASE_URL with HTTPS. TLS terminates at Nginx Proxy Manager; private proxy-to-app HTTP is intentional. Do not trust browser-supplied forwarded headers for authentication or client-IP filtering.
- OAuth tokens expire in one hour, are purpose/client/mode bound, and a changed secret invalidates prior tokens. HMAC mode requires the original body and timestamp within ±5 minutes. OAuth and HMAC are separate SePay authentication choices, not a combined requirement.
- Validated authenticated bank payloads are encrypted in jingo_sepay_payloads using the existing mail encryption key. One original payload per mode/transaction ID; no Authorization/token stored. Keep the encryption key and database together in encrypted backups. Payloads older than 90 days are removed on the next authenticated valid webhook, at most hourly per API process; accounting events remain. There is no unauthenticated payload storage.
- Database UNIQUE event ID is claimed within the settlement transaction before order locks. Simultaneous identical notifications serialize on the claim; same ID with conflicting settlement fields returns 409. The claim rolls back with the accounting transaction on failure. There is no “received” marker that permanently skips failed processing.
- Exact amount, destination bank/account, payment code when present, intent, order/cart eligibility and credential checks precede settlement. Expired intents go to REVIEW for manual reconciliation, never automatic receipt. Unknown inbound payment codes also enter REVIEW and return success once recorded.
- HTTP 200 {success:true} is sent only after durable processing/review; transfers out are archived but do not credit orders. Invalid auth/payload returns 401/400; storage failures return 5xx for SePay retry. No PDF work or SMTP network call runs inside the webhook: email is enqueued transactionally. This remains synchronous database processing, not a new queue; monitor response times below 30 seconds.
- Structured API logs for token and bank-webhook include requestId, status, durationMs and a bounded error code. X-Jingo-Webhook-Request correlates the response. No body, credential, token or bank balance is logged by this instrumentation. Existing server errors may still have stack traces; restrict log access.

## Nginx Proxy Manager — optional source IP enforcement

Ready-to-paste config: deploy/nginx/sepay-npm.conf. It has NOT been installed on the live proxy by this code change.

1. On proxyserver, open JinGo Proxy Host (jingo.io.vn). Back up existing Advanced text; use valid SSL and Force SSL. Keep the host Publicly Accessible: customer pages are public.
2. The snippet checks `$realip_remote_addr` (original TCP peer), not `$remote_addr`, which global real-IP settings may replace from an untrusted header. Verify that the original NPM socket address is the real external source IP. If another proxy/CDN or source NAT sits before NPM, do not install this blindly: configure real-IP trust only for those exact trusted proxies first. Never trust arbitrary X-Forwarded-For.
3. Confirm upstream 172.16.150.171:3100 is still JinGo. Paste the contents into this host's Advanced field. Remove/merge any existing custom locations for these exact paths to avoid duplicate-location errors. A case-insensitive regex also covers trailing slashes, matching Express routing. There are two restricted endpoint families: token and bank webhook. Do not apply deny-all to the whole domain or payment checkout URLs.
4. Save and verify NPM reports Online. On proxyserver run `sudo docker exec proxy-app-1 nginx -t`. If invalid, restore previous Advanced text before reloading. No firewall-wide changes are needed.
5. In SePay test token acquisition and a simulated webhook. They should pass from all published SePay IPs. A request from a different public IP should return 403. Customer pages and normal checkout must remain reachable. Tests from your personal computer to these two endpoints will intentionally be blocked after enabling the allowlist.
6. Restrict direct access to JinGo port 3100 to the NPM host/private operational network. Avoid exposing API port 4000 publicly. Otherwise callers can bypass the edge allowlist (credential verification still applies).

IP list source, checked 2026-10-30: https://developer.sepay.vn/vi/dia-chi-ip . Includes all seven IPv4 and two IPv6 addresses then published. Recheck regularly and after a 403 incident; no silent automatic trust-list download. This snippet applies to bank webhooks/OAuth; card IPN remains separately authenticated by its own key.

## Retry and diagnosis

Enable automatic retry in SePay. Published schedule: first delivery then delays 1,1,2,3,5,8,13 minutes (8 total, roughly 33 minutes). On an already successful notification, manual replay should return success without creating another payment or email. If a bank transfer reached an expired or modified order, REVIEW is expected even though SePay delivery shows success.

- 400: malformed payload, unsupported grant, or incorrect token URL/request format.
- 401: check selected auth, saved credentials, token expiry/rotation; HMAC also needs NTP.
- 403: inspect NPM allowlist/real-IP setup; not a reason to disable authentication.
- 404/405: exact URL / POST method.
- 409: same external transaction ID carries different financial identity; reconcile, do not change transaction IDs just to force settlement.
- 5xx/timeouts: restore API/database availability; SePay retries. Check API logs, NPM proxy-host-16 access/error logs and matching request time.

Read-only diagnostics on JinGo server: `sudo docker compose logs --tail=150 api`. On proxyserver: `sudo docker exec proxy-app-1 sh -c 'tail -n 100 /data/logs/proxy-host-16_access.log'`. Never paste Authorization, client secrets, tokens or decrypted payloads into support chats.

After the retry window, inspect failed SePay deliveries and replay after recovery. Automated transaction-API reconciliation is not part of this adapter and needs separate SePay API credentials; do not assume webhook delivery alone guarantees all bank transactions were received. Payment journal is historical; REVIEW is not automatically cleared by later manual accounting.

## Validation limits

Integration tests exercise valid/invalid auth, HMAC timestamp/body changes, OAuth expiration/rotation, duplicate/conflicting IDs, expired intents, unknown/mismatched codes, encrypted payloads and recovery after a simulated storage error. They use pg-mem and do not prove PostgreSQL concurrent-lock behavior. Validate concurrent callbacks against an isolated PostgreSQL test database before a large live rollout. The NPM config needs nginx -t and real SePay test requests on the deployed proxy.

References: https://developer.sepay.vn/vi/sepay-webhooks/bao-mat , https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook , https://developer.sepay.vn/vi/sepay-webhooks/xu-ly-loi .

## Live whitelist bypass found 2026-10-30

Authorized read-only probes with empty POST bodies on jingo.io.vn showed:

| Request | Result before fix |
| --- | --- |
| Token URL, no spoofed header | NPM 403 |
| Token URL, X-Real-IP set to published SePay IP | API 400 invalid_request |
| Webhook URL, no spoofed header | NPM 403 |
| Webhook URL, X-Real-IP set to published SePay IP | API 401 authentication failed |
| Webhook URL, only X-Forwarded-For spoofed | NPM 403 |
| Webhook URL, only Forwarded spoofed | NPM 403 |
| Customer homepage / payment options | 200 |

Thus the source-IP layer was bypassable by X-Real-IP, while credential authentication remained effective. No valid token or financial payload was used. Case/trailing slash/query variants were also tested. Exact global real-IP directives have not yet been inspected; trusting a caller-controlled X-Real-IP is the observed behavior, not a guessed file location.

The updated snippet gates on original `$realip_remote_addr` and forwards that same original address downstream. Replace the previous complete SePay location block; do not append a duplicate. This fix is for the current directly exposed NPM / destination-NAT topology. An upstream CDN/SNAT/proxy requires a separate trusted-peer design; do not add all internal networks as allowed SePay sources. Check nginx -t and retest both legitimate SePay and spoofed personal-client requests after installation. Repository changes do not update live NPM automatically.

Inspect global trust on proxyserver without changing it:

```bash
sudo docker exec proxy-app-1 sh -c 'nginx -T 2>&1 | grep -nE "set_real_ip_from|real_ip_header|real_ip_recursive"'
```

Share only these directive lines, never the entire configuration. Audit overly broad trust such as 0.0.0.0/0, ::/0, or large private networks. Do not blindly remove entries used by other hosts without identifying their upstream proxies.

Nginx original-peer documentation: https://nginx.org/en/docs/http/ngx_http_realip_module.html#embedded_variables .

## Extracted code and customer status refresh

The full JGP + 24 hex identifier in original bank content is the authoritative intent match. SePay `code` is an optional value extracted using merchant-configured prefixes; unrelated or truncated extracted values must not invalidate a complete matching JGP in content. If `code` itself is a full JGP identifier and contradicts content, the transfer still goes to REVIEW. Missing/multiple JGP content, wrong amounts/accounts, expired intents and duplicate-ID conflicts retain their safeguards.

Existing REVIEW events are historical and are NOT automatically re-settled by replay after upgrading. For a confirmed real bank transfer, open the JC basket in admin and use the existing combined receipt action with the bank transaction reference, once, after verifying no receipt exists. Do not pay again or force an automatic settlement by editing transaction IDs. The payment journal now supports exact JC code lookup and displays its parent basket alongside JG.

Customer polling runs while the online-payment component is mounted, including the return page before a new intent exists. It checks every 5 seconds while visible, checks immediately on tab/window return, and reports lookup/network failures rather than silently swallowing them. Automatic polling is bounded to 30 minutes per mount; manual checking remains available. Expired QR display does not itself stop read-only status checks. Only a server-confirmed settled/PAID status marks payment successful.

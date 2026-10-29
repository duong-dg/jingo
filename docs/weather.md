# Destination weather and rule-based advice

- Admin: Settings → Weather, encrypted WeatherAPI key using the existing media-volume encryption key. Preserve that volume when migrating servers. Never expose the provider key in public responses or logs.
- Destinations store optional coordinates in their JSON data; omitted fields from older API clients preserve existing coordinates. Children inherit the nearest active ancestor coordinate. Location shortcuts are approximate city centres, not venue coordinates.
- Provider: https://www.weatherapi.com/docs/forecast-api/ — fixed HTTPS forecast endpoint, days=3, no paid/AI endpoint or automatic upgrade. No scraping fallback. WeatherAPI key required to activate; default disabled.
- Public widget on destination and ticket detail pages. Forecast date buttons select the advice; only supplied dates are displayed. Forecasts do not guarantee venue operation or safe travel.
- Server validates and normalizes data and applies bilingual fixed thresholds. Maximum three advice items, ordered by thunder, wind, rain, temperature, UV, visibility, evening and humidity. Pleasant-weather advice is suppressed under adverse conditions. Rules: `apps/api/src/weather/weather-rules.ts`.
- Persistent per-coordinate cache and atomic refresh lease across API processes. Refresh on demand at most hourly; 5-second upstream timeout, hourly retry backoff. A recent saved observation may be displayed up to 4 hours, explicitly marked if stale; older data is hidden.
- Persistent atomic monthly usage budget 90,000 calls (UTC month), inclusive of failed external attempts. Provider error 2007 blocks all weather until the next UTC month. Monthly limit state survives restarts; weather errors do not affect booking.
- Limits count this JinGo database only; do not reuse this key in other apps without considering their usage. Use a dedicated free-plan key/account. No live provider request was made during development: integration tests mock the external response.

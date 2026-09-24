# SkulGo E2E test setup

The baseline Playwright suite in `tests/e2e/core-smoke.spec.ts` covers the public login page and authenticated Admin workspace smoke flows.

## Run locally

```bash
npm install
npm run e2e
```

Authenticated tests require a dedicated test Admin account:

```powershell
$env:E2E_ADMIN_EMAIL="test-admin@example.com"
$env:E2E_ADMIN_PASSWORD="use-a-test-password"
$env:E2E_ADMIN_PIN="1234"
npm run e2e
```

Do not commit credentials or put real production credentials in the repository.

The authenticated smoke suite intentionally opens the existing Dashboard, Applications, Result Settings, Results, and Fees pages. It does not create or modify school records.

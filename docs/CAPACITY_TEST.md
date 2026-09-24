# SkulGo Capacity Baseline

Measures the current application with authenticated traffic without changing application code.

## Run locally
```powershell
$env:TARGET_URL="http://127.0.0.1:3000"
$env:TEST_USERS='[{"email":"admin@example.com","password":"YOUR_PASSWORD"}]'
npm run capacity:test
```

## Run against Render
```powershell
$env:TARGET_URL="https://skulgo.onrender.com"
$env:ALLOW_PRODUCTION_LOAD_TEST="YES"
$env:TEST_USERS='[{"email":"admin@example.com","password":"YOUR_PASSWORD"},{"email":"teacher@example.com","password":"YOUR_PASSWORD"}]'
npm run capacity:test
```

Production is deliberately blocked unless ALLOW_PRODUCTION_LOAD_TEST=YES.

Default stages: 50, 100, 200, 500, 1,000 concurrent virtual users. Default stage duration: 10 seconds.

Change with:
```text
STAGES=50,100,200,500
STAGE_SECONDS=20
```

Each supplied account logs in once, selects its workspace, and reuses its authenticated session. Routes exercised are dashboard, published results, fees, and Admin settings for Admin accounts.

## Record during every stage

- Render Web CPU
- Render Web memory
- PostgreSQL CPU
- PostgreSQL memory
- PostgreSQL connections
- HTTP errors
- p95/p99 latency
- requests per second

Only after these measurements are reviewed should we translate infrastructure capacity into SkulGo school/student limits.

Never put passwords or secret keys in GitHub. Pass test credentials through environment variables only.

# Contributing to SkulGo

Thank you for helping improve SkulGo.

## Before changing code

1. Read the README and relevant project documentation.
2. Understand the school workflow affected by the change.
3. Prefer the smallest useful change over broad refactoring.
4. Never use real school/student data in development or tests.
5. Do not commit secrets or credentials.

## Engineering approach

SkulGo follows:

**Understand → Audit → Identify the real gap → Implement the smallest useful solution → Verify → Document**

For school-facing functionality, preserve:
- school isolation
- role and permission boundaries
- historical records
- financial/academic consistency
- auditability
- offline/online synchronization assumptions

## Verification

Before opening a contribution, run the checks available for the affected area.

Typical checks include:

```bash
npm run typecheck
npm run build
npm run e2e
```

If a check cannot be run locally, explain why in the pull request.

## Pull requests

Describe:
- what changed
- why it changed
- which school workflow it affects
- how it was tested
- any migration or deployment considerations

Keep unrelated changes out of the same pull request.

## Security

Do not report sensitive vulnerabilities publicly. See SECURITY.md.

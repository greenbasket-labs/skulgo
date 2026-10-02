# Security Policy

## Scope

SkulGo handles school-related operational data, including accounts, roles, attendance, assessments, results, fees, and administrative records.

Security issues should therefore be treated seriously, especially issues involving:
- authentication or authorization bypass
- cross-school data access
- exposure of credentials or secrets
- unintended access to student/parent/staff information
- payment or financial-record integrity
- audit-log integrity
- unsafe administrative actions

## Reporting

Please do not publish sensitive vulnerability details in a public issue.

Contact the maintainer privately through the contact information on the GitHub profile and include:
1. A clear description of the issue
2. A minimal reproduction or proof of concept where safe
3. The affected area/version or commit
4. The potential impact
5. Any suggested mitigation

Do not include real student records, passwords, API keys, or other sensitive data in a report.

## Development safety

Use test/demo data only. Never commit production credentials, database connection strings, private keys, session secrets, or real school/student data.

SkulGo is actively developed; security-sensitive changes should be verified before production deployment.

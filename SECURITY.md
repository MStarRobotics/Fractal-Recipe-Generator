# Security Policy

We take security seriously and appreciate responsible disclosure of any vulnerabilities you may find.

## Supported Versions

The main branch is actively maintained. Security updates are applied to the latest release.

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |

## Reporting a Vulnerability

- Please email security reports to <security@invalid.example> (replace with your contact) with the subject: "Security report: Fractal-Recipe-Generator".
- Include:
  - A detailed description of the issue
  - Steps to reproduce (PoC is encouraged)
  - Potential impact and severity
  - Your contact information
- We will acknowledge receipt within 72 hours and provide a timeline for fixing the issue.

Please do not disclose security vulnerabilities via public GitHub issues.

## Disclosure Policy

- We ask for a 90-day disclosure window after acknowledgment to triage and remediate issues.
- Do not publicly disclose the vulnerability before a fix is released unless otherwise agreed.

## Security Hardening in this Repo

This repository includes:

- Strict Content Security Policy (CSP) for the web client
- Helmet middleware on the server for secure HTTP headers
- Pre-commit hooks to enforce lint, typecheck, and formatting
- CI pipeline with lint, typecheck, build, dependency audit, and CodeQL analysis

## Scope

- Application code and configuration in this repository
- CI/CD workflows and scripts

Out of scope:

- Third-party dependencies (report to their maintainers)
- Social engineering and physical attacks

## Hall of Fame

We appreciate the efforts of researchers. With permission, we can recognize validated reports here.

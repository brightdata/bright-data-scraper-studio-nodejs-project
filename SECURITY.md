# Security policy

## Reporting a vulnerability

If you discover a security issue in this starter template, please report it privately to **security@brightdata.com**.

Include:
- A description of the vulnerability
- Steps to reproduce
- The commit SHA you tested against

We aim to acknowledge reports within two business days and resolve confirmed issues within 30 days.

See the [Bright Data Vulnerability Disclosure Policy](https://brightdata.com/security/responsible-disclosure) for the full process.

## Scope

In scope:
- The template code in this repository
- Documentation that recommends insecure practices
- Default configuration that exposes credentials

Out of scope:
- Issues in upstream dependencies (we monitor those via Dependabot; please also report to the upstream maintainer)
- Configuration mistakes in your fork (you own your fork's `.env` and deployment)

## Credential handling

The template loads credentials from environment variables via `dotenv`. **Never commit your `.env` file.** The shipped `.gitignore` blocks `.env` and `.env.local`.

If you accidentally commit a real `BRIGHT_DATA_API_TOKEN`:
1. Rotate the token immediately at [brightdata.com/cp/setting](https://brightdata.com/cp/setting).
2. Use `git filter-repo` or BFG to remove the secret from history.
3. Force-push and notify any users who may have cloned the leak.

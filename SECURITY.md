# Security Policy

## Reporting a vulnerability

Please don't open a public issue for security problems.

Report it privately through GitHub: **Security → Report a vulnerability** on this repository. Include what you found, how to reproduce it, and the version or commit.

You'll get a reply within 5 days. Once a fix is ready we'll coordinate disclosure with you and credit you if you want.

## Supported versions

Only the latest release on `main` gets security fixes.

## Scope

In scope: this repository (web app, worker, widget, Docker setup). Out of scope: issues in third-party dependencies with no exploitable path in momo, and the hosted cloud at askmomo.eu (report those the same way).

## Hardening notes

See "Notes for a real deployment" in the [README](README.md): HTTPS reverse proxy, strong `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY`, and a single web container.

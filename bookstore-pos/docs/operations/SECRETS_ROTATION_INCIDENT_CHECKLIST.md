# Secrets Rotation and Incident Checklist

## Rotation triggers
- Secret exposed in git history, logs, screenshots, or chat.
- Team member device compromise.
- CI token leakage or third-party breach.
- Scheduled preventive rotation window.

## Scope to rotate
- `JWT_SECRET`
- `TWOFA_ENCRYPTION_KEY`
- CI/CD credentials and deploy tokens
- E2E test users/passwords (`E2E_USERNAME`, `E2E_PASSWORD`)
- Any API keys used by monitoring/integrations

## Rotation procedure
1. Freeze sensitive deployments and create incident channel.
2. Generate new credentials with random high-entropy values.
3. Update secure stores first (GitHub Secrets, server env, vault).
4. Deploy backend with new secret values.
5. Invalidate old sessions/tokens (`/auth/logout-all` by user or global DB revoke).
6. Verify login, refresh, and 2FA flows.
7. Re-run CI with secret scan enabled.

## Incident response (quick triage)
1. Confirm exposure source and blast radius (who/what/when).
2. Remove exposed values from active configs immediately.
3. Rotate affected secrets and revoke impacted sessions.
4. Audit logs for suspicious auth/import activity.
5. Document timeline and corrective actions.
6. Add prevention controls (lint, gitleaks, tighter `.gitignore`).

## Validation after rotation
- Backend boots with `alembic upgrade head`.
- `/auth/login`, `/auth/refresh`, `/auth/logout-all` pass smoke tests.
- CI secret scan passes.
- No `.env` or generated artifacts tracked in git.

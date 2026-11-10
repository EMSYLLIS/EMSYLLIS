# EMSYLLIS Shared Account / SSO Rollout

## Current repository phase
- Added a consistent EMSYLLIS application switcher to AETHRION, SENTRIX and TdevKuantum.
- Added the EMSYLLIS Account Center at /account.html with direct login and registration routes.
- Existing per-application authentication and user data are preserved. No user records or passwords are copied or merged by this change.
- SSO is explicitly not advertised as active yet.

## Required backend phase before claiming one account everywhere
1. Confirm the canonical EMSYLLIS Parse application ID and deploy the central identity Cloud Code to that application.
2. Implement account linking by requiring a fresh login to each existing application and verified email ownership; never link accounts by matching an unverified email alone.
3. Issue short-lived, single-use authorization codes from the central identity service. Each destination app backend must redeem a code server-to-server and create its own scoped session. Do not pass Parse session tokens or passwords in query strings.
4. Add server-side service credentials separately to each Back4App Cloud environment. Never expose Master Keys, REST keys, shared secrets or peppers in browser JavaScript or Git.
5. Add unlink/revoke, audit events, rate limits, CSRF/state validation, expiry, replay protection, account recovery and data export/delete flows.
6. Test existing users, duplicate emails, unverified accounts, revoked links, expired codes and cross-app logout before production activation.

## User-facing status
The Account Center routes users to the correct app and offers its existing login/register flow. It does not claim a shared session until the backend exchange is deployed and tested.

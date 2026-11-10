# EMSYLLIS Shared Account / SSO Rollout

## Repository and client integration status — 2026-11-10

- The EMSYLLIS Account Center is published at `/account.html` and links to the existing login/registration flow of AETHRION, SENTRIX and TdevKuantum.
- The shared application menu is installed in all three applications.
- Main authentication code now emits a non-secret `emsyllis:auth-state` browser event on login/logout:
  - AETHRION: `app.js`
  - SENTRIX: `app.js`
  - TdevKuantum: the Parse authentication block in `index.html`
- The shared menu reads the current app's Parse session and displays only that app's local session state. It does not copy session tokens, passwords or user records.
- Existing accounts and their app-specific data remain unchanged.
- **SSO is not active.** The local session indicator is not a central EMSYLLIS identity and must not be described as one-account login.

## Why backend work is still required

AETHRION, SENTRIX and TdevKuantum use different Back4App Parse application IDs and their own user/session stores. A browser-only script cannot safely mint a Parse session for another application. A central identity service must authenticate the person and each destination backend must verify a signed, short-lived, single-use exchange before issuing an app-scoped session.

The available repository connector can update GitHub source, but the current Back4App connector only manages Back4App-hosted web apps; it does not expose Parse application/Cloud Code deployment or Master Key configuration. Therefore no Cloud Code was deployed and no server credentials were requested or placed in Git.

## Required production sequence

1. Create or identify the canonical EMSYLLIS Parse application. Record its public Application ID and JavaScript key for client configuration only; keep Master Key and service credentials server-side.
2. Implement the central identity endpoints on EMSYLLIS Cloud Code: authorization request, user authentication, account linking, one-time code issue, code redemption, revoke/unlink and audit events.
3. Implement a separate destination-side redemption function in each app's Cloud Code. It must validate issuer, client, exact redirect URI, state/PKCE, code expiry, single-use status and account-link ownership before issuing a session scoped to that app.
4. Preserve existing app accounts. Require fresh authentication to the old account and verified email ownership before linking. Never auto-link by matching email alone.
5. Add per-app server-only credentials using each Back4App dashboard's environment/configuration controls. Never put Master Keys, service secrets, peppers or Parse session tokens in frontend code, URLs or Git.
6. Add CSRF protection, rate limits, replay protection, short expiry, unlink/revoke, recovery and audit logging.
7. Test duplicate and unverified emails, existing users, account recovery, expired/replayed codes, revocation, logout and data isolation in all three apps before enabling SSO in the UI.

## Current user-facing wording

The Account Center is an application launcher and account entry point. Each app currently authenticates against its existing account store. Do not claim "single account", "single sign-on", or cross-app session sharing until the complete central and destination-side backend exchange is deployed and tested.

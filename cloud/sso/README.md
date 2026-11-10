# EMSYLLIS ID — production SSO implementation gate

**Status: not deployable yet.** This folder documents the required production design. It deliberately does not pretend that a Cloud Code function can create a Parse session in a different Parse application.

## Verified repository facts

- `assets/js/config.js` currently has empty `APP_ID` and `JAVASCRIPT_KEY`.
- EMSYLLIS Cloud Code currently has project catalog, contact, and email-verification functions.
- AETHRION and SENTRIX use different Parse application IDs and independent user/session stores.
- The Back4App connector available in this workspace manages Back4App web apps, not Parse application creation, Parse Server configuration, Cloud Code deployment, or Master Key settings.
- The connector account currently lists zero Back4App web apps. This is not evidence that no Parse apps exist; it only means the available connector cannot inspect them.

## Why a normal Cloud Code exchange is insufficient

A signed authorization code can prove that an EMSYLLIS user authenticated. It does **not** automatically create a valid `Parse.Session` in AETHRION, SENTRIX, or TdevKuantum. A Parse session belongs to one Parse application. Creating a session object manually or passing another application's session token is not a supported safe SSO mechanism.

The production design therefore requires a supported federation/authentication adapter at each destination Parse Server (or an alternative identity-aware backend for all protected data). Back4App's Parse Server configuration must support the chosen adapter. A Cloud Code-only workaround that changes a user's password, stores reusable passwords, or fabricates session tokens is prohibited.

## Required architecture

1. EMSYLLIS becomes the OpenID Connect (OIDC) identity provider with Authorization Code + PKCE, exact redirect URI allowlists, short-lived one-time codes, issuer/audience validation, key rotation, and JWKS.
2. Each destination app registers a distinct OIDC client: `aethrion`, `sentrix`, and `tdevkuantum`.
3. Each destination Parse Server authenticates the EMSYLLIS identity through a supported custom auth adapter and maps the verified immutable EMSYLLIS subject to a local Parse user.
4. Existing local users are linked only after the user freshly authenticates to that local account and proves control of the EMSYLLIS account. Never link by matching email alone.
5. Local Parse sessions are issued by the destination Parse Server's supported authentication flow. Local data remains in its original app.
6. Unlinking, revocation, recovery, audit events, rate limits, CSRF/state, nonce, PKCE, replay protection, and account deletion are implemented and tested.

## Required configuration (server-side only)

For the identity provider:
- canonical EMSYLLIS Parse Application ID and JavaScript key (public client values)
- private signing key / KMS-backed signing key
- issuer URL and published JWKS
- exact redirect URI allowlist
- OIDC client registry and client secrets stored only server-side

For each destination:
- OIDC issuer and audience/client ID
- server-side client credential or private-key registration
- supported Parse Server custom-auth adapter configuration
- immutable-subject-to-local-user mapping
- server-side signing/verification keys

Never put Master Keys, private signing keys, client secrets, REST API keys, peppers, or Parse session tokens in Git, browser JavaScript, URLs, or chat.

## Rollout sequence

- [ ] Confirm/create the canonical EMSYLLIS Parse application in the owner's Back4App dashboard.
- [ ] Confirm the exact Parse Server version and whether Back4App permits the required custom auth adapter on that app.
- [ ] Confirm TdevKuantum's Parse Application ID and its current account model.
- [ ] Implement and test the OIDC provider and JWKS.
- [ ] Implement the destination adapters and local account-link tables.
- [ ] Test new users, existing users, duplicate/unverified email, replayed/expired codes, revocation, logout, account recovery, and data isolation.
- [ ] Only then enable the SSO buttons in production.

## Current user-facing truth

The EMSYLLIS account center is an app launcher. The app menu reports the local app's Parse session state. Neither is cross-app SSO. Keep the SSO feature disabled until every gate above passes.

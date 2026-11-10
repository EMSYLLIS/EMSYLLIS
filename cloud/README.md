# EMSYLLIS Back4app Cloud Code

This folder contains Parse Cloud Code for the dedicated EMSYLLIS Back4app Parse application.

## Cloud Code modules
- `main.js` — public project catalog, contact form and module loader.
- `email-verification.js` — six-digit email verification, signup, login guard, abuse limits and a safe deployment-status function.
- `identity-assertions.js` — EMSYLLIS ID account-link assertion functions (also loaded by `main.js`).

## Private email-verification settings — Back4App Config

The email-verification module reads all three values from **Back4App → Parse Config** using `Parse.Config.get({ useMasterKey: true })`. No email-verification setting is sent by the browser, and none is read from `process.env`.

Create these three parameters in the EMSYLLIS Back4App application's Config section:

| Parameter name (exact) | Value |
|---|---|
| `EMSYLLIS_APPS_SCRIPT_URL` | Deployed Google Apps Script Web App URL ending in `/exec` |
| `EMSYLLIS_APPS_SCRIPT_SECRET` | A unique random secret of at least 32 characters; same value as the Apps Script Script Property |
| `EMSYLLIS_CODE_PEPPER` | A different unique random secret of at least 32 characters |

**For each of the three parameters, set “Requires master key?” to “Yes”.** This is essential: Parse Config parameters are otherwise publicly readable by clients. Cloud Code retrieves them with the master key, while browser clients cannot retrieve these private values. Never put these secrets in `assets/js/config.js`, HTML, GitHub, or client requests.

The code does not create or guess the values. Add the real values directly in the Back4App Config dashboard. Do not reuse the Apps Script secret as the code pepper.

## Google Apps Script setup
1. Open the Google Apps Script project and paste `apps-script/Code.gs` into its editor.
2. Open **Project Settings → Script Properties** and add:
   - Property: `EMSYLLIS_APPS_SCRIPT_SECRET`
   - Value: the same random secret used for `EMSYLLIS_APPS_SCRIPT_SECRET` in Back4app.
3. Save, then choose **Deploy → New deployment → Web app**.
4. Set **Execute as: Me** and access to **Anyone**. The shared secret protects the POST endpoint.
5. Deploy and copy the Web App URL ending in `/exec` into Back4app as `EMSYLLIS_APPS_SCRIPT_URL`.
6. If the code changes later, update the deployment to a new version.

## Registration flow
1. Browser calls `emsyllisSendVerificationCode` through Parse Cloud Code with only the email address.
2. Cloud Code reads the private Back4App Config values, creates a one-time challenge and calls the Apps Script endpoint server-to-server.
3. Apps Script sends the six-digit code through `MailApp`.
4. Browser submits email, code and password to `emsyllisCompleteRegistration`.
5. Cloud Code reads the same private pepper, validates expiry and attempt count, creates the Parse user and marks its email verified.
6. A `beforeLogin` guard rejects users whose email is not verified.

Codes expire after 10 minutes. Cloud Code limits code requests and incorrect attempts. The browser keeps the password in memory only during the two-step registration; it is not saved to local storage.

## Back4app Parse settings
- Deploy the **entire `cloud/` directory as one Cloud Code deployment**, preserving filenames and relative paths. At minimum it must contain `cloud/main.js`, `cloud/email-verification.js`, and `cloud/identity-assertions.js`. The main file loads the two helper modules with `require('./email-verification.js')` and `require('./identity-assertions.js')`.
- Uploading `main.js` alone is not sufficient. If either required helper module is absent, Cloud Code can fail to load or the registration functions will not be registered.
- After deploying Cloud Code and adding all three private Config parameters, call `emsyllisEmailVerificationStatus`. It returns only readiness booleans, never values. Expected result: `moduleLoaded: true`, `ready: true`, and all three entries in `checks` set to `true`.

If any check is false, verify the exact parameter spelling, value, and that **Requires master key? = Yes** is enabled for all three.
- Keep the Parse Application ID and JavaScript key in `assets/js/config.js`.
- Do not enable any alternative public signup route that bypasses the Cloud Code verification flow.
- The custom verification flow sets `emailVerified` after validating the code. Avoid enabling a second built-in Parse email verification message unless you intentionally want two separate checks.
- Test with a mailbox you control before opening registration to the public.

## Contact form
`emsyllisSubmitContact` validates and stores contact messages in the private `EMSYLLISContactMessage` class. Retrieve messages only through a trusted Back4app dashboard or a separately secured admin workflow.

## Security and legal notes
- Never expose Master Key, REST API Key, private tokens or email-provider credentials in browser files.
- Configure restrictive Class-Level Permissions and retention/deletion procedures.
- Apps Script sends mail from the Google account that owns the deployment and is subject to Google MailApp quotas.
- The legal pages in the website are starter drafts, not legal advice or ready-to-sign contracts.

## Shared identity (EMSYLLIS ID)

The central SSO rollout is documented in [`cloud/sso/README.md`](./sso/README.md). Do not deploy a browser-only token bridge or claim SSO is enabled: each destination Parse Server must support a verified OIDC/custom-auth adapter that issues its own local Parse session. The EMSYLLIS public Parse client config is intentionally blank until the canonical Parse application is confirmed. Keep all private signing keys and client credentials server-side.

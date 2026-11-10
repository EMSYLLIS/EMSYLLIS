# EMSYLLIS Back4app Cloud Code

This folder contains Parse Cloud Code for the dedicated EMSYLLIS Back4app Parse application.

## Cloud Code modules
- `main.js` — public project catalog, contact form and module loader.
- `email-verification.js` — six-digit email verification, signup, login guard and abuse limits.

## Required Back4app server configuration
Add these as **server-side Cloud Code environment variables / secrets** in the EMSYLLIS Back4app application. Do not add them to `assets/js/config.js`, GitHub, or browser code.

| Variable | Value |
|---|---|
| `EMSYLLIS_APPS_SCRIPT_URL` | Deployed Google Apps Script Web App URL ending in `/exec` |
| `EMSYLLIS_APPS_SCRIPT_SECRET` | A unique random secret of at least 32 characters; same value as Apps Script Script Property |
| `EMSYLLIS_CODE_PEPPER` | A different unique random secret of at least 32 characters |

The public browser config contains only the Parse Application ID, JavaScript key and Parse server URL. Never expose a Master Key or REST API Key.

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
1. Browser calls `emsyllisSendVerificationCode` through Parse Cloud Code.
2. Cloud Code creates a one-time challenge and calls the Apps Script endpoint server-to-server.
3. Apps Script sends the six-digit code through `MailApp`.
4. Browser submits email, code and password to `emsyllisCompleteRegistration`.
5. Cloud Code validates expiry and attempt count, creates the Parse user and marks its email verified.
6. A `beforeLogin` guard rejects users whose email is not verified.

Codes expire after 10 minutes. Cloud Code limits code requests and incorrect attempts. The browser keeps the password in memory only during the two-step registration; it is not saved to local storage.

## Back4app Parse settings
- Deploy both `cloud/main.js` and `cloud/email-verification.js`; the main file loads the module with `require('./email-verification.js')`.
- Keep the Parse Application ID and JavaScript key in `assets/js/config.js`.
- Confirm Cloud Code environment variables are available at runtime through `process.env`.
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

# EMSYLLIS Cloud Code
This folder contains Parse Server Cloud Code for a **dedicated EMSYLLIS Back4app application**.

## Functions
- `emsyllisHealth` — health/status check.
- `emsyllisProjectCatalog` — public project directory.
- `emsyllisSubmitContact` — validates and stores a contact message in the private `EMSYLLISContactMessage` class.

## Deployment
1. Connect the Back4app account that owns or will own the dedicated EMSYLLIS Parse application.
2. Confirm the application ID and JavaScript key belong to EMSYLLIS, not AETHRION.
3. Add this file as `cloud/main.js` in Back4app Cloud Code and deploy.
4. Set the matching public application ID and JavaScript key in `assets/js/config.js`.
5. Enable and test email verification and password-reset email delivery before enabling public registration.

Contact messages are stored with an empty ACL and are not publicly readable. Retrieve them only through the trusted Back4app dashboard or a separately secured admin workflow.

## Security
- Never expose Master Key, REST API Key, private tokens or email-provider credentials in browser files.
- Configure Parse Class-Level Permissions and account verification.
- Add production-grade abuse controls and retention/deletion procedures before accepting public traffic.
- Do not use AETHRION's Parse application credentials for EMSYLLIS.
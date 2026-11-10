# EMSYLLIS
**SCIENCE · TECHNOLOGY · INTELLIGENCE**  
**Beyond What Is Known.**

EMSYLLIS Group is used as an umbrella brand for an independent technology and innovation project portfolio. It is not a statement that a legal entity has been incorporated or registered.

## Website
- Production domain: https://emsyllis.tech/
- Contact: emsyllis.contact@gmail.com
- Suggested Vercel project slug: `emsyllis-group`

## Portfolio
- [AETHRION](https://aethrion.dev/) — AI-enabled digital product and tools ecosystem.
- [SENTRIX](https://turkmenmuhammedeymen-dev.github.io/SENTRIX/#workspace) — domain verification and digital trust project.
- TdevKuantum — project profile hosted on this website.
- AETHRION-LLM — **in development**, not presented as a released model.

## Structure
- `index.html` — homepage
- `about.html`, `projects.html`, `career.html`, `contact.html`
- `auth/` — login, registration and password reset screens
- `legal/` — terms, privacy, cookies, KVKK and disclaimer draft pages
- `assets/` — brand assets, styles and browser scripts
- `cloud/main.js` — Back4app Parse Cloud Code

## Back4app
The browser configuration in `assets/js/config.js` is intentionally blank until a **dedicated EMSYLLIS Parse application** is connected. Do not paste AETHRION application keys here. Never expose a Master Key, REST API Key or server secret in client-side code.

See [cloud/README.md](cloud/README.md) before deployment. Registration now uses a six-digit email code sent through [Google Apps Script](apps-script/Code.gs); the Apps Script URL and shared secrets must be configured only in Back4app Server Settings → Environment Variables. Public signup is blocked outside the verified Cloud Code flow.

## Legal notice
Legal pages are starter drafts, not legal advice or ready-to-sign contracts. Verify the responsible legal entity, data-processing purposes, retention periods, cross-border transfers, contact procedure and applicable Turkish requirements with a qualified adult/legal professional before collecting personal data or treating the pages as binding terms.
# EMSYLLIS
**SCIENCE · TECHNOLOGY · INTELLIGENCE**  
**Beyond What Is Known.**

EMSYLLIS is an independent technology and innovation initiative bringing together a portfolio of projects across artificial intelligence, software engineering, digital trust and emerging technologies. The name **EMSYLLIS Group** is used as an umbrella brand; it does not imply that a legal entity has been incorporated or registered.

## Founder & development

EMSYLLIS was founded and is independently developed by a **10th-grade student and independent software developer** with a strong interest in software engineering, artificial intelligence and emerging technologies.

The projects in the EMSYLLIS portfolio are currently designed, built and maintained independently by the founder. The initiative reflects a long-term commitment to learning through research, experimentation and practical product development.

## Website
- Production domain: https://emsyllis.tech/
- Contact: emsyllis.contact@gmail.com
- Suggested Vercel project slug: `emsyllis-group`

## Portfolio
- [AETHRION](https://aethrion.dev/) — AI-enabled digital product and tools ecosystem.
- [SENTRIX](https://turkmenmuhammedeymen-dev.github.io/SENTRIX/#workspace) — domain verification and digital trust project.
- TdevKuantum — project profile hosted on this website.
- AETHRION-LLM — **in development**, not presented as a released model.

## Development principles

- **Independent development:** projects are developed and maintained independently by the founder.
- **Transparency:** research goals and planned features are distinguished from capabilities that are already working.
- **Responsible engineering:** security, privacy, source verification and careful testing are part of the development process.
- **Continuous learning:** the portfolio is an evolving body of work, built through study, experimentation and iteration.

## Structure
- `index.html` — homepage
- `about.html`, `projects.html`, `career.html`, `contact.html`
- `auth/` — login, registration and password reset screens
- `legal/` — terms, privacy, cookies, KVKK and disclaimer draft pages
- `assets/` — brand assets, styles and browser scripts
- `cloud/` — Back4app Parse Cloud Code modules (`main.js`, `email-verification.js`, `identity-assertions.js`)

## Back4app
`assets/js/config.js` contains the public Parse Application ID and JavaScript key for the EMSYLLIS application. Do not paste AETHRION application keys here. Never expose a Master Key, REST API Key or server secret in client-side code.

See [cloud/README.md](cloud/README.md) before deployment. Registration uses a six-digit email code sent through [Google Apps Script](apps-script/Code.gs). The three private settings (`EMSYLLIS_APPS_SCRIPT_URL`, `EMSYLLIS_APPS_SCRIPT_SECRET`, `EMSYLLIS_CODE_PEPPER`) are read server-side from Back4App Parse Config first, with Back4App server Environment Variables as a fallback. Never put these values in browser files or GitHub. Public signup is blocked outside the verified Cloud Code flow. Google Apps Script sends mail from the Google account that owns the deployment; deploy it while signed in as `emsyllis.contact@gmail.com` if that must be the sender address.

## Legal notice
Legal pages are starter drafts, not legal advice or ready-to-sign contracts. Verify the responsible legal entity, data-processing purposes, retention periods, cross-border transfers, contact procedure and applicable Turkish requirements with a qualified adult/legal professional before collecting personal data or treating the pages as binding terms.

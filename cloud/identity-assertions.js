/*
 * EMSYLLIS ID — central, short-lived account-link assertion issuer.
 * Requires EMSYLLIS_ID_PRIVATE_KEY in EMSYLLIS Back4App server environment.
 * This issues audience-bound account-link assertions; it does NOT mint sessions
 * for other Parse applications. A supported destination auth adapter is still
 * required for seamless OIDC/SSO.
 */
'use strict';
const emsyllisIdCrypto = require('crypto');
const EMSYLLIS_ID_ISSUER = 'https://emsyllis.tech';
const EMSYLLIS_ID_CLIENTS = Object.freeze({
  aethrion: 'aethrion',
  sentrix: 'sentrix',
  tdevkuantum: 'tdevkuantum'
});
const emsyllisIdB64Url = value => Buffer.from(value).toString('base64').replace(/=/g, '').split('+').join('-').split('/').join('_');
const emsyllisIdPrivateKey = () => {
  const key = String(process.env.EMSYLLIS_ID_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  if (!key || !key.includes('PRIVATE KEY')) throw new Error('EMSYLLIS_ID_PRIVATE_KEY_NOT_CONFIGURED');
  return key;
};
function emsyllisIdSign(payload) {
  const header = emsyllisIdB64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = emsyllisIdB64Url(JSON.stringify(payload));
  const input = header + '.' + body;
  const signature = emsyllisIdCrypto.sign('RSA-SHA256', Buffer.from(input), emsyllisIdPrivateKey());
  return input + '.' + emsyllisIdB64Url(signature);
}
Parse.Cloud.define('emsyllisIssueLinkAssertion', async request => {
  if (!request || !request.user) throw new Error('AUTH_REQUIRED');
  const client = String(request.params && request.params.client || '').trim().toLowerCase();
  const audience = EMSYLLIS_ID_CLIENTS[client];
  if (!audience) throw new Error('IDENTITY_CLIENT_NOT_ALLOWED');
  const recentQuery = new Parse.Query('EMSYLLISIdentityAssertion');
  recentQuery.equalTo('subject', request.user.id);
  recentQuery.greaterThan('createdAt', new Date(Date.now() - 60 *  60 * 1000));
  recentQuery.limit(21);
  const recent = await recentQuery.find({ useMasterKey: true });
  if (recent.length >= 20) throw new Error('IDENTITY_ASSERTION_RATE_LIMITED');
  const now = Math.floor(Date.now() / 1000);
  const jti = emsyllisIdCrypto.randomBytes(24).toString('hex');
  const token = emsyllisIdSign({
    iss: EMSYLLIS_ID_ISSUER,
    aud: audience,
    sub: request.user.id,
    iat: now,
    exp: now + 180,
    jti,
    purpose: 'account-link'
  });
  const Assertion = Parse.Object.extend('EMSYLLISIdentityAssertion');
  const row = new Assertion();
  row.set('subject', request.user.id);
  row.set('audience', audience);
  row.set('jti', jti);
  row.set('expiresAt', new Date((now + 180) * 1000));
  row.set('purpose', 'account-link');
  row.setACL(new Parse.ACL());
  await row.save(null, { useMasterKey: true });
  return { assertion: token, expiresIn: 180, audience };
});
Parse.Cloud.define('emsyllisIdentityStatus', async request => {
  if (!request || !request.user) throw new Error('AUTH_REQUIRED');
  return { authenticated: true, subject: request.user.id, issuer: EMSYLLIS_ID_ISSUER };
});

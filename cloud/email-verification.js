// EMSYLLIS email verification Cloud Code helper.
// Reads all three private settings from Back4App Parse Config (master-key-only).
const crypto = require('crypto');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanEmail = value => String(value || '').trim().toLowerCase().slice(0, 180);

const hashCode = (email, code, pepper) =>
  crypto.createHash('sha256').update(email + '|' + code + '|' + pepper).digest('hex');

const safeMatch = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Parse Config parameters must each have "Requires master key?" set to Yes.
const readPrivateSettings = async () => {
  const config = await Parse.Config.get({ useMasterKey: true });
  const url = String(config.get('EMSYLLIS_APPS_SCRIPT_URL') || '').trim();
  const secret = String(config.get('EMSYLLIS_APPS_SCRIPT_SECRET') || '');
  const pepper = String(config.get('EMSYLLIS_CODE_PEPPER') || '');

  const checks = {
    appsScriptUrl: /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url),
    appsScriptSecret: secret.length >= 32,
    codePepper: pepper.length >= 32
  };

  if (!Object.values(checks).every(Boolean)) {
    const error = new Error('Email verification Back4App Config is incomplete.');
    error.code = 'EMSYLLIS_CONFIG_INCOMPLETE';
    error.checks = checks;
    throw error;
  }
  return { url, secret, pepper, checks };
};

// Safe diagnostic: returns readiness flags only, never configuration values.
Parse.Cloud.define('emsyllisEmailVerificationStatus', async () => {
  try {
    const settings = await readPrivateSettings();
    return {
      service: 'EMSYLLIS email verification',
      moduleLoaded: true,
      configSource: 'Back4App Parse Config (master-key-only)',
      ready: true,
      checks: settings.checks
    };
  } catch (error) {
    const checks = error && error.checks || {
      appsScriptUrl: false,
      appsScriptSecret: false,
      codePepper: false
    };
    return {
      service: 'EMSYLLIS email verification',
      moduleLoaded: true,
      configSource: 'Back4App Parse Config (master-key-only)',
      ready: false,
      checks
    };
  }
});

Parse.Cloud.define('emsyllisSendVerificationCode', async request => {
  const email = cleanEmail(request.params.email);
  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');
  const config = await readPrivateSettings();

  const recentQuery = new Parse.Query('EMSYLLISEmailVerification');
  recentQuery.equalTo('email', email);
  recentQuery.greaterThan('createdAt', new Date(Date.now() - 3600000));
  recentQuery.descending('createdAt');
  const recent = await recentQuery.find({ useMasterKey: true });
  if (recent.length >= 5) throw new Error('Too many code requests. Try again later.');
  const last = recent[0];
  if (last && Date.now() - last.get('sentAt').getTime() < 60000) {
    throw new Error('Wait 60 seconds before requesting another code.');
  }

  const existingQuery = new Parse.Query(Parse.User);
  existingQuery.equalTo('email', email);
  if (await existingQuery.first({ useMasterKey: true })) return { accepted: true };

  const code = String(crypto.randomInt(100000, 1000000));
  const Challenge = Parse.Object.extend('EMSYLLISEmailVerification');
  const challenge = new Challenge();
  challenge.set('email', email);
  challenge.set('codeHash', hashCode(email, code, config.pepper));
  challenge.set('expiresAt', new Date(Date.now() + 600000));
  challenge.set('sentAt', new Date());
  challenge.set('attempts', 0);
  challenge.set('consumed', false);
  challenge.setACL(new Parse.ACL());
  await challenge.save(null, { useMasterKey: true });

  try {
    const response = await Parse.Cloud.httpRequest({
      method: 'POST',
      url: config.url,
      followRedirects: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendVerificationCode',
        email,
        code,
        secret: config.secret
      })
    });
    const result = response.data && typeof response.data === 'object'
      ? response.data
      : JSON.parse(response.text || '{}');
    if (!result || result.ok !== true) throw new Error('Email service rejected the request.');
  } catch (error) {
    challenge.set('consumed', true);
    await challenge.save(null, { useMasterKey: true });
    throw new Error('Could not send the verification email. Try again later.');
  }

  return {
    accepted: true,
    message: 'A verification code has been sent if this address can be registered.'
  };
});

Parse.Cloud.define('emsyllisCompleteRegistration', async request => {
  const email = cleanEmail(request.params.email);
  const code = String(request.params.code || '').trim();
  const password = String(request.params.password || '');
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    throw new Error('Check the email and six-digit code.');
  }
  if (password.length < 10 || password.length > 128) {
    throw new Error('Password must be 10 to 128 characters.');
  }

  // The same private Config pepper is used for both hashing and verification.
  const config = await readPrivateSettings();
  const query = new Parse.Query('EMSYLLISEmailVerification');
  query.equalTo('email', email);
  query.equalTo('consumed', false);
  query.descending('createdAt');
  const challenge = await query.first({ useMasterKey: true });

  if (!challenge ||
      !(challenge.get('expiresAt') instanceof Date) ||
      challenge.get('expiresAt').getTime() < Date.now()) {
    throw new Error('Code expired. Request a new one.');
  }

  const attempts = Number(challenge.get('attempts') || 0);
  if (attempts >= 5) throw new Error('Too many incorrect attempts. Request a new code.');

  if (!safeMatch(challenge.get('codeHash'), hashCode(email, code, config.pepper))) {
    challenge.set('attempts', attempts + 1);
    await challenge.save(null, { useMasterKey: true });
    throw new Error('Incorrect verification code.');
  }

  challenge.set('consumed', true);
  await challenge.save(null, { useMasterKey: true });

  const user = new Parse.User();
  user.set('username', email);
  user.set('email', email);
  user.set('password', password);
  await user.signUp(null, { useMasterKey: true });
  user.set('emailVerified', true);
  await user.save(null, { useMasterKey: true });
  return { created: true, emailVerified: true };
});

Parse.Cloud.beforeLogin(async request => {
  if (request.object.get('emailVerified') !== true) {
    throw new Error('Verify your email before signing in.');
  }
});

Parse.Cloud.beforeSave(Parse.User, async request => {
  if (request.object.isNew() && !request.master) {
    throw new Error('Use the EMSYLLIS email verification signup flow.');
  }
});

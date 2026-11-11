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

// Private values are read server-side: Parse Config first, then server environment variables.
const readPrivateSettings = async () => {
  let config = null;
  try {
    config = await Parse.Config.get({ useMasterKey: true });
  } catch (error) {
    console.warn('[EMSYLLIS] Parse Config read unavailable; checking server environment variables.');
  }
  const env = typeof process !== 'undefined' && process.env ? process.env : {};
  const read = key => {
    const fromConfig = config && typeof config.get === 'function' ? config.get(key) : '';
    return String(fromConfig || env[key] || '').trim();
  };
  const url = read('EMSYLLIS_APPS_SCRIPT_URL');
  const secret = read('EMSYLLIS_APPS_SCRIPT_SECRET');
  const pepper = read('EMSYLLIS_CODE_PEPPER');

  const checks = {
    appsScriptUrl: /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url),
    appsScriptSecret: secret.length >= 32,
    codePepper: pepper.length >= 32
  };

  if (!Object.values(checks).every(Boolean)) {
    const error = new Error('Email verification server configuration is incomplete.');
    error.code = 'EMSYLLIS_CONFIG_INCOMPLETE';
    error.checks = checks;
    throw error;
  }
  return { url, secret, pepper, checks };
};

// Back4App Cloud Code runtimes may not expose Parse.Cloud.httpRequest.
// Use native fetch and return only sanitized diagnostics.
const requestMailGateway = async (url, options = {}) => {
  if (typeof fetch !== 'function') {
    const error = new Error('fetch_unavailable');
    error.code = 'fetch_unavailable';
    throw error;
  }
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      redirect: 'follow',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller ? controller.signal : undefined
    });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      const error = new Error('invalid_response');
      error.code = 'invalid_response';
      throw error;
    }
    if (!response.ok) {
      const error = new Error('http_' + response.status);
      error.code = 'http_' + response.status;
      throw error;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      const error = new Error('invalid_response');
      error.code = 'invalid_response';
      throw error;
    }
    return { status: response.status, data };
  } catch (error) {
    if (error && error.code) throw error;
    const code = error && (error.name === 'AbortError' || error.name === 'TimeoutError')
      ? 'timeout'
      : 'network_error';
    const safeError = new Error(code);
    safeError.code = code;
    throw safeError;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

// Safe diagnostic: checks private Config and the public Apps Script health endpoint.
// It never returns URLs, secrets, email addresses, or verification codes.
Parse.Cloud.define('emsyllisEmailVerificationStatus', async () => {
  let checks = {
    appsScriptUrl: false,
    appsScriptSecret: false,
    codePepper: false,
    gatewayReachable: false
  };
  try {
    const settings = await readPrivateSettings();
    checks = { ...settings.checks, gatewayReachable: false };
    try {
      const response = await requestMailGateway(settings.url);
      const payload = response.data;
      checks.gatewayReachable = Boolean(
        response.status >= 200 && response.status < 300 &&
        payload && payload.service === 'EMSYLLIS mail gateway' &&
        payload.status === 'ready'
      );
    } catch (gatewayError) {
      console.error('[EMSYLLIS] mail gateway health check failed:', gatewayError && gatewayError.code || 'network_error');
    }
    return {
      service: 'EMSYLLIS email verification',
      moduleLoaded: true,
      configSource: 'Back4App Parse Config (master-key-only)',
      ready: Object.values(checks).every(Boolean),
      checks
    };
  } catch (error) {
    checks = error && error.checks
      ? { ...error.checks, gatewayReachable: false }
      : checks;
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
    const response = await requestMailGateway(config.url, {
      method: 'POST',
      body: {
        action: 'sendVerificationCode',
        email,
        code,
        secret: config.secret
      }
    });
    const result = response.data;
    if (!result || result.ok !== true) {
      const serviceCode = result && typeof result.error === 'string' && /^[a-z_]+$/.test(result.error)
        ? result.error
        : 'invalid_response';
      const serviceError = new Error(serviceCode);
      serviceError.code = serviceCode;
      throw serviceError;
    }
  } catch (error) {
    challenge.set('consumed', true);
    await challenge.save(null, { useMasterKey: true });
    // Return only a safe diagnostic code; never expose the URL, secret, email, or code.
    const allowedCodes = [
      'not_configured', 'unauthorized', 'unsupported_action',
      'invalid_payload', 'invalid_response', 'rate_limited', 'daily_quota_exhausted',
      'internal_error', 'fetch_unavailable', 'network_error', 'timeout'
    ];
    const rawCode = String(error && error.code || '');
    const httpCode = rawCode.match(/^http_(4\d\d|5\d\d)$/);
    const reason = allowedCodes.includes(rawCode)
      ? rawCode
      : (httpCode ? rawCode : 'network_error');
    console.error('[EMSYLLIS] verification email send failed:', reason);
    throw new Error('Could not send the verification email. Diagnostic: ' + reason);
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

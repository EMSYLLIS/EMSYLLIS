/**
 * EMSYLLIS — Google Apps Script email verification sender.
 * Deploy this project as a Web App, then keep the webhook secret in Script Properties.
 * Never paste the secret into a browser page or public GitHub config.
 */
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ service: 'EMSYLLIS mail gateway', status: 'ready' });
}

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var expected = props.getProperty('EMSYLLIS_APPS_SCRIPT_SECRET');
    if (!expected || !e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'not_configured' });
    }

    var payload = JSON.parse(e.postData.contents);
    if (payload.action !== 'sendVerificationCode') {
      return json_({ ok: false, error: 'unsupported_action' });
    }
    if (String(payload.secret || '') !== expected) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    var email = String(payload.email || '').trim().toLowerCase();
    var code = String(payload.code || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
      return json_({ ok: false, error: 'invalid_payload' });
    }

    // Secondary throttle in addition to the Back4app Cloud Code rate limit.
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email);
    var key = 'LAST_MAIL_' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
    var cache = CacheService.getScriptCache();
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (cache.get(key)) return json_({ ok: false, error: 'rate_limited' });
      if (MailApp.getRemainingDailyQuota() < 1) return json_({ ok: false, error: 'daily_quota_exhausted' });
      cache.put(key, '1', 55);
    } finally {
      lock.releaseLock();
    }

    var subject = 'EMSYLLIS | E-posta doğrulama kodun';
    var plain = 'EMSYLLIS hesabını oluşturmak için doğrulama kodun: ' + code +
      '\n\nBu kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok say.';
    var html = '<div style="margin:0;padding:32px;background:#080d18;font-family:Arial,sans-serif;color:#eaf1fa">' +
      '<div style="max-width:520px;margin:auto;border:1px solid #25364d;background:#0d1726;padding:32px">' +
      '<div style="font-size:12px;letter-spacing:4px;color:#9eb4cc">SCIENCE · TECHNOLOGY · INTELLIGENCE</div>' +
      '<h1 style="font-size:25px;margin:28px 0 8px">E-posta adresini doğrula</h1>' +
      '<p style="color:#aebed0;line-height:1.6">EMSYLLIS hesabını oluşturmak için aşağıdaki tek kullanımlık kodu gir.</p>' +
      '<div style="margin:28px 0;padding:20px;text-align:center;background:#111f31;border:1px solid #314a66;font-size:34px;font-weight:700;letter-spacing:10px;color:#77e4ed">' + code + '</div>' +
      '<p style="color:#aebed0;font-size:13px">Kod 10 dakika sonra geçerliliğini yitirir. En fazla 5 kez deneyebilirsin.</p>' +
      '<p style="margin-top:32px;color:#71849a;font-size:11px">Bu isteği sen yapmadıysan e-postayı yok say. EMSYLLIS destek: emsyllis.contact@gmail.com</p>' +
      '</div></div>';
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: plain,
      htmlBody: html,
      name: 'EMSYLLIS',
      replyTo: 'emsyllis.contact@gmail.com'
    });

    return json_({ ok: true });
  } catch (err) {
    console.error('EMSYLLIS mail gateway error: ' + (err && err.message ? err.message : 'unknown'));
    return json_({ ok: false, error: 'internal_error' });
  }
}


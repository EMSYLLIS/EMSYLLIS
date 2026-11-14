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

    var subject = 'EMSYLLIS | E-posta adresi doğrulama';
    var plain = 'EMSYLLIS hesabını oluşturmak için doğrulama kodun: ' + code +
      '\\n\\nBu kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok say.\\n\\nEMSYLLIS — Bilim, teknoloji ve inovasyon.';
    var html = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
      '<body style="margin:0;padding:0;background:#071321;color:#e9eff8;font-family:Arial,Helvetica,sans-serif">' +
      '<div style="display:none;max-height:0;overflow:hidden;opacity:0">EMSYLLIS hesabını güvenle doğrula.</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#071321;padding:34px 12px"><tr><td align="center">' +
      '<table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#0d1a2b;border:1px solid #263a53;border-radius:18px;overflow:hidden">' +
      '<tr><td style="padding:30px 34px;background:linear-gradient(125deg,#12243a,#0b1727);border-bottom:1px solid #263a53">' +
      '<div style="font-size:10px;letter-spacing:4px;color:#9cb2ca">INDEPENDENT TECHNOLOGY &amp; INNOVATION</div>' +
      '<div style="margin-top:13px;font-size:29px;font-weight:800;letter-spacing:4px;color:#fff">EMSYLLIS</div>' +
      '<div style="margin-top:7px;font-size:12px;letter-spacing:1.2px;color:#c5a66b">BİLİM · TEKNOLOJİ · ZEKÂ</div></td></tr>' +
      '<tr><td style="padding:34px;color:#dce6f2;font-size:15px;line-height:1.75">' +
      '<div style="font-size:11px;letter-spacing:2px;color:#c5a66b">HESAP GÜVENLİĞİ</div>' +
      '<h1 style="margin:12px 0 8px;font-size:25px;line-height:1.3;color:#fff">E-posta adresini doğrula</h1>' +
      '<p style="margin:0 0 22px;color:#b8c6d7">EMSYLLIS hesabını oluşturmak için aşağıdaki tek kullanımlık doğrulama kodunu kullan.</p>' +
      '<div style="margin:26px 0;padding:22px;text-align:center;background:#13243a;border:1px solid #354c68;border-radius:12px;font-size:34px;font-weight:800;letter-spacing:10px;color:#e4c27d">' + code + '</div>' +
      '<p style="margin:0;color:#b8c6d7;font-size:13px">Kod 10 dakika geçerlidir. En fazla 5 kez deneyebilirsin. Bu isteği sen başlatmadıysan e-postayı yok say; hesabın doğrulanmaz.</p>' +
      '</td></tr>' +
      '<tr><td style="padding:25px 34px;background:#091522;border-top:1px solid #263a53">' +
      '<div style="font-size:11px;letter-spacing:2px;color:#c5a66b">EMSYLLIS EKOSİSTEMİ</div>' +
      '<div style="margin-top:12px;font-size:12px;line-height:1.9;color:#aebed0"><strong style="color:#e8eef7">AETHRION</strong> · Yapay zekâ ve akıllı sistemler<br><strong style="color:#e8eef7">SENTRIX</strong> · Dijital güven ve doğrulama<br><strong style="color:#e8eef7">TdevKuantum</strong> · İleri teknoloji ve yeni nesil hesaplama<br><strong style="color:#e8eef7">AETHRION-LLM</strong> · Dil modeli araştırmaları</div>' +
      '<div style="margin-top:20px;padding-top:16px;border-top:1px solid #263a53;font-size:11px;line-height:1.8;color:#788da5">Bu ileti EMSYLLIS hesap hizmeti tarafından otomatik gönderilmiştir.<br><a href="https://emsyllis.tech/" style="color:#d5b879;text-decoration:none">emsyllis.tech</a> · <a href="mailto:emsyllis.contact@gmail.com" style="color:#d5b879;text-decoration:none">İletişim</a></div>' +
      '</td></tr></table><div style="padding:18px 8px;font-size:10px;letter-spacing:2px;color:#60748d">BEYOND WHAT IS KNOWN · EMSYLLIS / 2026</div>' +
      '</td></tr></table></body></html>';
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


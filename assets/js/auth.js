(() => {
  const cfg = window.EMSYLLIS_CONFIG || {};
  const configured = Boolean(cfg.APP_ID && cfg.JAVASCRIPT_KEY && window.Parse);
  if (configured && !window.__EMSYLLIS_PARSE_INITIALIZED) {
    Parse.initialize(cfg.APP_ID, cfg.JAVASCRIPT_KEY);
    Parse.serverURL = cfg.SERVER_URL || 'https://parseapi.back4app.com';
    window.__EMSYLLIS_PARSE_INITIALIZED = true;
  }
  const form = document.querySelector('[data-auth-form]');
  const message = form && form.querySelector('.form-message');
  const say = text => { if (message) message.textContent = text; };
  const explain = error => {
    const raw = String(error && error.message || '');
    if (/Invalid function|function.*not found|does not exist/i.test(raw)) {
      return 'Back4App bu kayıt fonksiyonunu bulamadı. cloud/main.js ile cloud/email-verification.js aynı Cloud Code dağıtımında olmalı; ardından Cloud Code yeniden yayımlanmalı.';
    }
    if (/Email verification Back4App Config is incomplete/i.test(raw)) {
      return 'E-posta doğrulama ayarları Back4App Config bölümünde eksik veya erişim izni yanlış. Üç EMSYLLIS ayarını ve "Requires master key?" seçeneklerini kontrol edin.';
    }
    return raw || 'İşlem tamamlanamadı. Bilgileri kontrol edip tekrar dene.';
  };

  // Accessible show/hide controls for every password field on all EMSYLLIS auth screens.
  document.querySelectorAll('input[type="password"]').forEach((input, index) => {
    if (input.dataset.visibilityReady) return;
    input.dataset.visibilityReady = 'true';
    const label = input.closest('.field') || input.parentElement;
    if (!label) return;
    const wrap = document.createElement('div');
    wrap.className = 'password-control';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.textContent = 'Göster';
    toggle.setAttribute('aria-label', 'Şifreyi göster');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.addEventListener('click', () => {
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      toggle.textContent = reveal ? 'Gizle' : 'Göster';
      toggle.setAttribute('aria-label', reveal ? 'Şifreyi gizle' : 'Şifreyi göster');
      toggle.setAttribute('aria-pressed', String(reveal));
      input.focus();
    });
    wrap.appendChild(toggle);
  });

  if (!form) return;
  const mode = form.dataset.authForm;

  if (mode === 'register') {
    const emailInput = form.querySelector('[name="email"]');
    const passwordInput = form.querySelector('[name="password"]');
    const confirmInput = form.querySelector('[name="confirm"]');
    const codeInput = form.querySelector('[name="code"]');
    const sendButton = form.querySelector('[data-send-code]');
    const completeButton = form.querySelector('[data-complete-registration]');
    const codeField = form.querySelector('[data-code-field]');
    let pendingEmail = '';
    let pendingPassword = '';

    sendButton.addEventListener('click', async () => {
      if (!configured) return say('Back4App EMSYLLIS bağlantısı yapılandırılmamış.');
      const email = String(emailInput.value || '').trim().toLowerCase();
      const password = String(passwordInput.value || '');
      const confirmation = String(confirmInput.value || '');
      if (!emailInput.checkValidity()) return emailInput.reportValidity();
      if (password.length < 10) return say('Şifren en az 10 karakter olmalı.');
      if (password !== confirmation) return say('Şifreler eşleşmiyor.');
      sendButton.disabled = true;
      say('Doğrulama kodu gönderiliyor…');
      try {
        const result = await Parse.Cloud.run('emsyllisSendVerificationCode', { email });
        pendingEmail = email;
        pendingPassword = password;
        codeField.hidden = false;
        completeButton.hidden = false;
        sendButton.textContent = 'Kodu yeniden gönder';
        say(result.message || 'İstek alındı. Gelen kutunu ve spam klasörünü kontrol et.');
        codeInput.focus();
      } catch (error) {
        say(explain(error));
      } finally {
        sendButton.disabled = false;
      }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!configured) return say('Back4App EMSYLLIS bağlantısı yapılandırılmamış.');
      const email = String(emailInput.value || '').trim().toLowerCase();
      if (!pendingEmail || email !== pendingEmail || !pendingPassword) {
        return say('Önce bu e-posta adresine doğrulama kodu gönder.');
      }
      const currentPassword = String(passwordInput.value || '');
      if (currentPassword !== pendingPassword || currentPassword !== String(confirmInput.value || '')) {
        return say('Şifre alanları değişti. Kayıt adımını yeniden başlat.');
      }
      const code = String(codeInput.value || '').trim();
      if (!/^\d{6}$/.test(code)) return say('E-postana gelen 6 haneli kodu gir.');
      completeButton.disabled = true;
      say('Kod doğrulanıyor ve hesabın oluşturuluyor…');
      try {
        const result = await Parse.Cloud.run('emsyllisCompleteRegistration', {
          email: pendingEmail, code, password: pendingPassword
        });
        await Parse.User.logIn(pendingEmail, pendingPassword);
        pendingPassword = '';
        say(result.message || 'E-posta doğrulandı. Hesabına yönlendiriliyorsun…');
        location.href = (window.EMSYLLIS_BASE || '') + '/panel.html';
      } catch (error) {
        say(explain(error));
      } finally {
        completeButton.disabled = false;
      }
    });
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!configured) return say('Back4App EMSYLLIS bağlantısı yapılandırılmamış.');
    const data = new FormData(form);
    try {
      if (mode === 'login') {
        const email = String(data.get('username') || '').trim().toLowerCase();
        await Parse.User.logIn(email, String(data.get('password') || ''));
        location.href = (window.EMSYLLIS_BASE || '') + '/panel.html';
      } else if (mode === 'reset') {
        await Parse.User.requestPasswordReset(String(data.get('email') || '').trim().toLowerCase());
        say('Adres kayıtlıysa parola sıfırlama bağlantısı gönderildi. Gelen kutunu kontrol et.');
      }
    } catch (error) {
      say(explain(error));
    }
  });
})();
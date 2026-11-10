(() => {
  const cfg = window.EMSYLLIS_CONFIG || {};
  const configured = Boolean(cfg.APP_ID && cfg.JAVASCRIPT_KEY && window.Parse);
  if (configured) {
    Parse.initialize(cfg.APP_ID, cfg.JAVASCRIPT_KEY);
    Parse.serverURL = cfg.SERVER_URL || 'https://parseapi.back4app.com';
  }
  const form = document.querySelector('[data-auth-form]');
  if (!form) return;
  const message = form.querySelector('.form-message');
  const say = text => { if (message) message.textContent = text; };
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
      if (!configured) return say('Back4app EMSYLLIS bağlantısı henüz yapılandırılmadı.');
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
        say(result.message || 'Kod gönderildi. Gelen kutunu ve spam klasörünü kontrol et.');
        codeInput.focus();
      } catch (error) {
        say(error && error.message ? error.message : 'Kod gönderilemedi. Biraz sonra tekrar dene.');
      } finally {
        sendButton.disabled = false;
      }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!configured) return say('Back4app EMSYLLIS bağlantısı henüz yapılandırılmadı.');
      const email = String(emailInput.value || '').trim().toLowerCase();
      if (!pendingEmail || email !== pendingEmail || !pendingPassword) {
        return say('Önce bu e-posta adresine doğrulama kodu gönder.');
      }
      const currentPassword = String(passwordInput.value || '');
      if (currentPassword !== pendingPassword || currentPassword !== String(confirmInput.value || '')) {
        return say('Şifre alanları değişti. Yeni kod isteyerek kayıt adımını yeniden başlat.');
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
        say(error && error.message ? error.message : 'Kayıt tamamlanamadı. Bilgileri kontrol et.');
      } finally {
        completeButton.disabled = false;
      }
    });
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!configured) return say('Back4app EMSYLLIS bağlantısı henüz yapılandırılmadı.');
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
      say(error && error.message ? error.message : 'İşlem tamamlanamadı. Bilgileri kontrol edip tekrar dene.');
    }
  });
})();
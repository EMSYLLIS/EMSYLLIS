(() => {
const cfg=window.EMSYLLIS_CONFIG||{};
const configured=Boolean(cfg.APP_ID&&cfg.JAVASCRIPT_KEY&&window.Parse);
if(configured){Parse.initialize(cfg.APP_ID,cfg.JAVASCRIPT_KEY);Parse.serverURL=cfg.SERVER_URL||'https://parseapi.back4app.com';}
const message=document.querySelector('.form-message');
const say=(text)=>{if(message)message.textContent=text;};
const form=document.querySelector('[data-auth-form]');
if(!form)return;
form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!configured){say('Hesap sistemi henüz Back4app EMSYLLIS uygulamasına bağlanmadı. Yapılandırma tamamlandığında etkinleşecek.');return;}
 const data=new FormData(form);const mode=form.dataset.authForm;
 try{
  if(mode==='login'){await Parse.User.logIn(String(data.get('username')||''),String(data.get('password')||''));location.href='/panel.html';}
  else if(mode==='register'){const user=new Parse.User();user.set('username',String(data.get('email')||''));user.set('email',String(data.get('email')||''));user.set('password',String(data.get('password')||''));await user.signUp();say('Hesap oluşturuldu. E-posta doğrulama ayarlarına göre gelen kutunu kontrol et.');location.href='/panel.html';}
  else if(mode==='reset'){await Parse.User.requestPasswordReset(String(data.get('email')||''));say('E-posta adresi kayıtlıysa parola sıfırlama bağlantısı gönderildi.');}
 }catch(err){say(err&&err.message?err.message:'İşlem tamamlanamadı. Bilgileri kontrol edip tekrar dene.');}
});
})();
(() => {
const cfg=window.EMSYLLIS_CONFIG||{};
if(!(cfg.APP_ID&&cfg.JAVASCRIPT_KEY&&window.Parse)){const s=document.getElementById('account-state');if(s)s.textContent='Hesap altyapısı henüz yapılandırılmadı.';return;}
if(!window.__EMSYLLIS_PARSE_INITIALIZED){Parse.initialize(cfg.APP_ID,cfg.JAVASCRIPT_KEY);Parse.serverURL=cfg.SERVER_URL||'https://parseapi.back4app.com';window.__EMSYLLIS_PARSE_INITIALIZED=true;}
const user=Parse.User.current();if(!user){location.replace((window.EMSYLLIS_BASE || '') + '/auth/login.html');return;}
const el=document.getElementById('account-state');if(el)el.textContent='Oturum açık: '+(user.getEmail()||user.getUsername());
const btn=document.getElementById('logout');if(btn)btn.addEventListener('click',async()=>{await Parse.User.logOut();location.href=(window.EMSYLLIS_BASE || '')+'/';});
})();
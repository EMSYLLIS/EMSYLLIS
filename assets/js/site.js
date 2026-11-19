(() => {
const base=window.EMSYLLIS_BASE||'',local=path=>base+path,header=document.getElementById('site-header'),footer=document.getElementById('site-footer');
const links=[['Ana sayfa','/'],['Hakkımızda','/about.html'],['Projeler','/projects.html'],['Destek verdiklerimiz','/#supported-projects'],['Kariyer','/career.html'],['İletişim','/contact.html']],path=location.pathname.replace(/^\/EMSYLLIS(?=\/|$)/,'')||'/';
if(header){header.innerHTML='<header class="site-header"><div class="nav-inner"><a class="brand" href="'+local('/')+'"><img src="'+local('/assets/brand-mark.svg')+'" alt="EMSYLLIS"><span>EMSYLLIS<small>SCIENCE · TECHNOLOGY · INTELLIGENCE</small></span></a><button class="menu-toggle" aria-label="Menüyü aç" aria-expanded="false">☰</button><nav class="nav-links">'+links.map(([label,url])=>'<a href="'+local(url)+'" '+(path===url?'class="active"':'')+'>'+label+'</a>').join('')+'<a class="nav-login" data-account-link href="'+local('/auth/login.html')+'">Hesap kontrol ediliyor…</a></nav></div></header>';const t=header.querySelector('.menu-toggle'),n=header.querySelector('.nav-links');t.addEventListener('click',()=>{const o=n.classList.toggle('open');t.setAttribute('aria-expanded',String(o));});}
if(footer){footer.innerHTML='<footer class="site-footer"><div class="wrap"><div class="footer-top"><div class="footer-brand"><a class="brand" href="'+local('/')+'"><img src="'+local('/assets/brand-mark.svg')+'" alt="EMSYLLIS"><span>EMSYLLIS<small>SCIENCE · TECHNOLOGY · INTELLIGENCE</small></span></a><p>Bağımsız teknoloji ve inovasyon markası. Fikirleri araştırma, tasarım ve mühendislikle anlamlı projelere dönüştürme hedefi.</p></div><div class="footer-col"><strong>KEŞFET</strong><a href="'+local('/about.html')+'">Hakkımızda</a><a href="'+local('/projects.html')+'">Proje galerisi</a><a href="'+local('/career.html')+'">Kariyer</a><a href="'+local('/contact.html')+'">İletişim</a><a href="'+local('/auth/login.html')+'">Giriş / Hesap</a></div><div class="footer-col"><strong>POLİTİKALAR</strong><a href="'+local('/legal/terms.html')+'">Kullanım koşulları</a><a href="'+local('/legal/privacy.html')+'">Gizlilik politikası</a><a href="'+local('/legal/cookies.html')+'">Çerez politikası</a><a href="'+local('/legal/kvkk.html')+'">KVKK bilgilendirmesi</a><a href="'+local('/legal/disclaimer.html')+'">Sorumluluk reddi</a><p><a href="mailto:emsyllis.contact@gmail.com">emsyllis.contact@gmail.com</a></p></div></div><div class="footer-bottom"><span>© <span id="year"></span> EMSYLLIS. Tüm hakları saklıdır.</span><span>BEYOND WHAT IS KNOWN.</span><a class="footer-github-link" href="https://github.com/EMSYLLIS" target="_blank" rel="noopener noreferrer" aria-label="EMSYLLIS GitHub organizasyonunu görüntüle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.62 1.22 3.26.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.13-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"/></svg>Organizasyonu görüntüle ↗</a></div></div></footer>';const y=document.getElementById('year');if(y)y.textContent=new Date().getFullYear();}
// Keep the header account action in sync with the Parse session on every page.
let accountReady;
function loadAccountScript(src){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src;script.async=true;
  script.onload=resolve;script.onerror=()=>reject(new Error('AUTH_SCRIPT_LOAD_FAILED'));document.head.appendChild(script);
 });
}
async function syncAccountLink(){
 const link=header&&header.querySelector('[data-account-link]');if(!link)return;
 try{
  if(!accountReady)accountReady=(async()=>{
   if(!window.Parse)await loadAccountScript('https://cdn.jsdelivr.net/npm/parse@4.3.0/dist/parse.min.js');
   if(!window.EMSYLLIS_CONFIG)await loadAccountScript(local('/assets/js/config.js'));
   const cfg=window.EMSYLLIS_CONFIG||{};
   if(!(cfg.APP_ID&&cfg.JAVASCRIPT_KEY&&window.Parse))throw new Error('AUTH_NOT_CONFIGURED');
   if(!window.__EMSYLLIS_PARSE_INITIALIZED){
    Parse.initialize(cfg.APP_ID,cfg.JAVASCRIPT_KEY);
    Parse.serverURL=cfg.SERVER_URL||'https://parseapi.back4app.com';
    window.__EMSYLLIS_PARSE_INITIALIZED=true;
   }
  })();
  await accountReady;
  const user=Parse.User.current();
  if(user&&typeof user.getSessionToken==='function'&&user.getSessionToken()){
   link.href=local('/panel.html');link.textContent='Hesap panelim ↗';link.setAttribute('aria-label','EMSYLLIS hesap panelini aç');
  }else{
   link.href=local('/auth/login.html');link.textContent='Giriş / Hesap ↗';link.setAttribute('aria-label','EMSYLLIS hesabına giriş yap');
  }
 }catch(error){
  accountReady=null;link.href=local('/auth/login.html');link.textContent='Hesabım ↗';
  console.warn('[EMSYLLIS] Account navigation could not be synchronized:',error&&error.message||error);
 }
}
if(header){syncAccountLink();window.addEventListener('storage',syncAccountLink);window.addEventListener('focus',syncAccountLink);}
if(path==='/'&&!document.getElementById('emsyllis-splash')){const s=document.createElement('div');s.id='emsyllis-splash';s.setAttribute('role','status');s.setAttribute('aria-label','EMSYLLIS yükleniyor');s.innerHTML='<div class="splash-inner"><img class="splash-logo" src="'+local('/assets/brand-mark.svg')+'" alt="EMSYLLIS"><div class="splash-name">EMSYLLIS</div><div class="splash-line"></div><div class="splash-caption">SCIENCE · TECHNOLOGY · INTELLIGENCE</div></div>';document.body.prepend(s);const dismiss=()=>{s.classList.add('is-leaving');window.setTimeout(()=>s.remove(),600);};window.setTimeout(dismiss,1250);s.addEventListener('click',dismiss);}
})();
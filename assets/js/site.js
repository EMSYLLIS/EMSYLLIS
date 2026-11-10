(() => {
const base = window.EMSYLLIS_BASE || '';
const local = path => base + path;
const header = document.getElementById('site-header');
const footer = document.getElementById('site-footer');
const links = [['Ana sayfa','/'],['Hakkımızda','/about.html'],['Projeler','/projects.html'],['Kariyer','/career.html'],['İletişim','/contact.html']];
const path = location.pathname.replace(/^\/EMSYLLIS(?=\/|$)/,'') || '/';
if (header) {
 header.innerHTML = '<header class="site-header"><div class="nav-inner"><a class="brand" href="'+local('/')+'"><img src="'+local('/assets/brand-mark.svg')+'" alt=""><span>EMSYLLIS<small>GROUP</small></span></a><button class="menu-toggle" aria-label="Menüyü aç" aria-expanded="false">☰</button><nav class="nav-links">'+links.map(([label,url])=>'<a href="'+local(url)+'" '+(path===url?'class="active"':'')+'>'+label+'</a>').join('')+'<a class="nav-login" href="'+local('/auth/login.html')+'">Hesabım ↗</a></nav></div></header>';
 const toggle = header.querySelector('.menu-toggle');
 const nav = header.querySelector('.nav-links');
 toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
}
if (footer) {
 footer.innerHTML = '<footer class="site-footer"><div class="wrap"><div class="footer-top"><div class="footer-brand"><a class="brand" href="'+local('/')+'"><img src="'+local('/assets/brand-mark.svg')+'" alt=""><span>EMSYLLIS<small>SCIENCE · TECHNOLOGY · INTELLIGENCE</small></span></a><p>Bağımsız teknoloji ve inovasyon girişimi. Fikirleri araştırma, tasarım ve mühendislikle anlamlı projelere dönüştürme hedefi.</p></div><div class="footer-col"><strong>KEŞFET</strong><a href="'+local('/about.html')+'">Hakkımızda</a><a href="'+local('/projects.html')+'">Proje galerisi</a><a href="'+local('/career.html')+'">Kariyer</a><a href="'+local('/contact.html')+'">İletişim</a><a href="'+local('/auth/login.html')+'">Giriş / Hesap</a></div><div class="footer-col"><strong>POLİTİKALAR</strong><a href="'+local('/legal/terms.html')+'">Kullanım koşulları</a><a href="'+local('/legal/privacy.html')+'">Gizlilik politikası</a><a href="'+local('/legal/cookies.html')+'">Çerez politikası</a><a href="'+local('/legal/kvkk.html')+'">KVKK bilgilendirmesi</a><a href="'+local('/legal/disclaimer.html')+'">Sorumluluk reddi</a><p><a href="mailto:emsyllis.contact@gmail.com">emsyllis.contact@gmail.com</a></p></div></div><div class="footer-bottom"><span>© <span id="year"></span> EMSYLLIS. Tüm hakları saklıdır.</span><span>BEYOND WHAT IS KNOWN.</span></div></div></footer>';
 const y=document.getElementById('year');if(y)y.textContent=new Date().getFullYear();
}
})();
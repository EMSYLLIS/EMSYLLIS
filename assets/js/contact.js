(() => {
const f=document.querySelector('[data-contact-form]');if(!f)return;
const msg=f.querySelector('.form-message');
f.addEventListener('submit',async e=>{
 e.preventDefault();
 const d=new FormData(f);
 const payload={name:String(d.get('name')||''),email:String(d.get('email')||''),subject:String(d.get('subject')||''),message:String(d.get('message')||'')};
 const cfg=window.EMSYLLIS_CONFIG||{};
 if(cfg.APP_ID&&cfg.JAVASCRIPT_KEY&&window.Parse){
  try{
   Parse.initialize(cfg.APP_ID,cfg.JAVASCRIPT_KEY);Parse.serverURL=cfg.SERVER_URL||'https://parseapi.back4app.com';
   await Parse.Cloud.run('emsyllisSubmitContact',payload);
   if(msg)msg.textContent='Mesajın güvenli şekilde alındı. Teşekkürler.';
   f.reset();
  }catch(err){if(msg)msg.textContent=(err&&err.message)||'Mesaj gönderilemedi. Lütfen e-posta ile iletişime geç.';}
 }else{
  const subject=encodeURIComponent(payload.subject||'EMSYLLIS iletişim');
  const body=encodeURIComponent('Ad: '+payload.name+'\nE-posta: '+payload.email+'\n\n'+payload.message);
  location.href='mailto:emsyllis.contact@gmail.com?subject='+subject+'&body='+body;
 }
});
})();
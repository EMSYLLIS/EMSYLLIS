/*
 * EMSYLLIS Back4app Cloud Code
 * Deploy only to a dedicated EMSYLLIS Parse application after confirming the correct account.
 * Never place Master Key, REST API Key, SMTP credentials or private tokens in client-side files.
 */
'use strict';
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanText=(value,max)=>String(value||'').trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,max);
Parse.Cloud.define('emsyllisHealth',async()=>({service:'EMSYLLIS',status:'ok',timestamp:new Date().toISOString()}));
Parse.Cloud.define('emsyllisProjectCatalog',async()=>({projects:[
{id:'aethrion',name:'AETHRION',status:'active-project',url:'https://aethrion.dev/'},
{id:'sentrix',name:'SENTRIX',status:'project',url:'https://turkmenmuhammedeymen-dev.github.io/SENTRIX/#workspace'},
{id:'tdevkuantum',name:'TdevKuantum',status:'project-profile',url:'https://emsyllis.tech/projects/tdevkuantum.html'},
{id:'aethrion-llm',name:'AETHRION-LLM',status:'in-development',url:'https://emsyllis.tech/projects/aethrion-llm.html'}
]}));
Parse.Cloud.define('emsyllisSubmitContact',async(request)=>{
 const name=cleanText(request.params.name,80);
 const email=cleanText(request.params.email,180).toLowerCase();
 const subject=cleanText(request.params.subject,120);
 const messageText=cleanText(request.params.message,3000);
 if(name.length<2)throw new Error('Please provide a valid display name.');
 if(!EMAIL_RE.test(email))throw new Error('Please provide a valid email address.');
 if(subject.length<3)throw new Error('Subject is too short.');
 if(messageText.length<10)throw new Error('Message is too short.');
 const Message=Parse.Object.extend('EMSYLLISContactMessage');
 const item=new Message();
 item.set('name',name);item.set('email',email);item.set('subject',subject);item.set('message',messageText);item.set('status','new');item.set('source','emsyllis.tech');
 item.setACL(new Parse.ACL());
 await item.save(null,{useMasterKey:true});
 return {accepted:true,message:'Your message has been received.'};
});

// Email verification and registration workflow.
require('./email-verification.js');

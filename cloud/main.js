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
{id:'sentrix',name:'SENTRIX',status:'project',url:'https://sentrix-security.vercel.app/'},
{id:'tdevkuantum',name:'TdevKuantum',status:'project-profile',url:'https://tdevkuantum.vercel.app/'},
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

// EMSYLLIS ID account-linking bridge (server-side; no cross-app session minting).
require('./identity-assertions.js');


// EMSYLLIS FEATURE REGISTRY — additive, server-managed Parse schema.
const EMSYLLIS_FEATURE_REGISTRY = Object.freeze({
  contact: { EMSYLLISContactMessage: {
    fields:{name:{type:'String'},email:{type:'String'},subject:{type:'String'},message:{type:'String'},status:{type:'String'},source:{type:'String'}},
    indexes:{statusCreated:{status:1,createdAt:-1},sourceCreated:{source:1,createdAt:-1}}
  }},
  emailVerification: { EMSYLLISEmailVerification: {
    fields:{email:{type:'String'},codeHash:{type:'String'},expiresAt:{type:'Date'},sentAt:{type:'Date'},attempts:{type:'Number'},consumed:{type:'Boolean'}},
    indexes:{emailCreated:{email:1,createdAt:-1},expiry:{expiresAt:1}}
  }},
  identity: { EMSYLLISIdentityAssertion: {
    fields:{subject:{type:'String'},audience:{type:'String'},jti:{type:'String'},expiresAt:{type:'Date'},purpose:{type:'String'}},
    indexes:{subjectCreated:{subject:1,createdAt:-1},jti:{jti:1},expiry:{expiresAt:1}}
  }}
});
const EMSYLLIS_PRIVATE_CLP = new Parse.CLP();
function emsyllisAddSchemaField(schema,name,spec){
  switch(spec.type){case 'String':schema.addString(name);break;case 'Number':schema.addNumber(name);break;case 'Boolean':schema.addBoolean(name);break;case 'Date':schema.addDate(name);break;default:throw new Error('EMSYLLIS_SCHEMA_FIELD_TYPE_UNSUPPORTED:'+name+':'+spec.type);}
}
async function emsyllisEnsureSchemas(){
  const report=[];
  for(const [feature,classes] of Object.entries(EMSYLLIS_FEATURE_REGISTRY)){
    for(const [className,definition] of Object.entries(classes)){
      const schema=new Parse.Schema(className);let current,exists=true;
      try{current=await schema.get();}catch(error){
        const code=Number(error&&error.code),message=String(error&&error.message||error);
        if(code!==101&&!/class.*not.*exist|schema.*not.*found|does not exist/i.test(message))throw error;
        exists=false;current={fields:{},indexes:{}};
      }
      const fields=current.fields||{},indexes=current.indexes||{};let changed=false;const addedFields=[];
      for(const [field,spec] of Object.entries(definition.fields)){
        if(fields[field]){if(fields[field].type!==spec.type)throw new Error('EMSYLLIS_SCHEMA_TYPE_CONFLICT:'+className+'.'+field);}
        else{emsyllisAddSchemaField(schema,field,spec);changed=true;addedFields.push(field);}
      }
      for(const [indexName,indexKeys] of Object.entries(definition.indexes||{})){if(!indexes[indexName]){schema.addIndex(indexName,indexKeys);changed=true;}}
      schema.setCLP(EMSYLLIS_PRIVATE_CLP);
      if(!exists)await schema.save();
      else if(changed||JSON.stringify(current.classLevelPermissions||{})!==JSON.stringify(EMSYLLIS_PRIVATE_CLP.toJSON()))await schema.update();
      report.push({className,feature,created:!exists,addedFields});
    }
  }
  return {ok:true,registryVersion:1,features:Object.keys(EMSYLLIS_FEATURE_REGISTRY),schemas:report};
}
Parse.Cloud.job('emsyllisBootstrap',async request=>{
  const result=await emsyllisEnsureSchemas();
  if(request&&request.message)request.message('EMSYLLIS schema registry checked '+result.schemas.length+' classes');
  return result;
});
const emsyllisBootstrapOnLoad=emsyllisEnsureSchemas().then(result=>{
  console.info('[EMSYLLIS] schema registry reconciled:',result.schemas.length,'classes');return {ok:true,result};
}).catch(error=>{
  console.error('[EMSYLLIS] schema registry reconciliation failed:',error&&error.stack||error);return {ok:false,error};
});
async function emsyllisAwaitBootstrap(){
  const state=await emsyllisBootstrapOnLoad;
  if(!state||state.ok!==true)throw new Error('EMSYLLIS_BOOTSTRAP_FAILED: '+String(state&&state.error&&state.error.message||'unknown'));
  return state.result;
}
Parse.Cloud.job('emsyllisPruneExpiredRecords',async request=>{
  await emsyllisAwaitBootstrap();
  const cutoff=new Date(Date.now()-24*60*60*1000),removed={emailVerifications:0,identityAssertions:0};
  for(const [className,key] of [['EMSYLLISEmailVerification','emailVerifications'],['EMSYLLISIdentityAssertion','identityAssertions']]){
    const query=new Parse.Query(className);query.lessThan('expiresAt',cutoff);query.limit(1000);
    const rows=await query.find({useMasterKey:true});
    for(let i=0;i<rows.length;i+=100){const batch=rows.slice(i,i+100);await Parse.Object.destroyAll(batch,{useMasterKey:true});removed[key]+=batch.length;}
  }
  if(request&&request.message)request.message('Expired EMSYLLIS records pruned');
  return {ok:true,removed};
});

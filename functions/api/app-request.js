const validApps = new Set(["FSP Calling Line","FSP Media Player","FSP Download Manager","Muslim Route","General enquiry"]);
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export async function onRequestPost({request,env}) {
  const origin = request.headers.get("Origin");
  if(origin){try{if(new URL(origin).hostname !== "fscoretech.com" && new URL(origin).hostname !== "www.fscoretech.com")return json({error:"Origin not allowed."},403);}catch{return json({error:"Invalid origin."},403);}}
  if(Number(request.headers.get("Content-Length")||0)>18000)return json({error:"Request is too large."},413);
  let data;try{data=await request.json();}catch{return json({error:"Invalid form data."},400);}
  if(!data || typeof data !== "object" || Array.isArray(data))return json({error:"Invalid form data."},400);
  if(data.website)return json({ok:true},200); // bot trap
  const keys={name:120,email:254,phone:40,address:280,application:60,details:5000};
  for(const [key,max] of Object.entries(keys))if(typeof data[key]!=="string"||!data[key].trim()||data[key].length>max)return json({error:"Please complete all required fields correctly."},400);
  const {name,email,phone,address,application,details}=data;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validApps.has(application) || details.trim().length<15)return json({error:"Please check your email, app selection and request details."},400);
  if(!env.BREVO_API_KEY)return json({error:"Online requests are temporarily unavailable. Please email contact@fscoretech.com."},503);
  const safe = {name:escapeHtml(name.trim()),email:escapeHtml(email.trim()),phone:escapeHtml(phone.trim()),address:escapeHtml(address.trim()),application:escapeHtml(application),details:escapeHtml(details.trim()).replace(/\n/g,"<br>")};
  const html='<h2>New FSCoreTech website request</h2><p><b>Application:</b> '+safe.application+'</p><p><b>Name:</b> '+safe.name+'</p><p><b>Email:</b> '+safe.email+'</p><p><b>Phone:</b> '+safe.phone+'</p><p><b>Address:</b> '+safe.address+'</p><p><b>Details:</b><br>'+safe.details+'</p>';
  try {
    const sent=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"Content-Type":"application/json","api-key":env.BREVO_API_KEY},body:JSON.stringify({sender:{name:"FSCoreTech Website",email:"contact@fscoretech.com"},to:[{email:"contact@fscoretech.com",name:"FSCoreTech"}],replyTo:{email:email.trim(),name:name.trim()},subject:"Application access request: "+application,htmlContent:html})});
    if(!sent.ok){console.error("Mail provider status",sent.status);return json({error:"We could not send your request. Please email contact@fscoretech.com directly."},502);}
    return json({ok:true,message:"Your request was sent to FSCoreTech."});
  }catch(e){console.error("Mail delivery failed");return json({error:"Delivery is unavailable. Please email contact@fscoretech.com directly."},502);}
}
export async function onRequestGet(){return json({error:"Method not allowed."},405);}

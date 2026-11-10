/** HTTPS mail adapter. Never logs provider payloads, credentials or delivery links. */
export function createMailer(env=process.env,{fetchImpl=fetch}={}){
  if(!env.DIGI_MAIL_API_KEY||!env.DIGI_MAIL_FROM||!/^([^\s<>]+@[^\s<>]+\.[^\s<>]+)$/.test(env.DIGI_MAIL_FROM))throw new Error('Configure el servicio de correo: DIGI_MAIL_API_KEY y DIGI_MAIL_FROM verificado');
  return async({to,subject,text})=>{
    try{
      const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.DIGI_MAIL_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.DIGI_MAIL_FROM,to:[to],subject,text}),signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('provider failure');
    }catch{throw new Error('No se pudo entregar el correo; revise el proveedor configurado');}
  };
}

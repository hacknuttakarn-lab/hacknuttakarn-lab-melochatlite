// @ts-nocheck
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC=Deno.env.get('MELO_VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE=Deno.env.get('MELO_VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT=Deno.env.get('MELO_VAPID_SUBJECT')||'mailto:support@melochat.app';
const WEBHOOK_SECRET=Deno.env.get('MELO_PUSH_WEBHOOK_SECRET')||'';
webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC,VAPID_PRIVATE);
const supabase=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  if(!WEBHOOK_SECRET||req.headers.get('x-melo-webhook-secret')!==WEBHOOK_SECRET)return new Response('Unauthorized',{status:401});
  const payload=await req.json().catch(()=>({}));
  const record=payload.record||payload;
  const userId=record.user_id||record.recipient_id||record.recipient_user_id;
  if(!userId)return Response.json({ok:true,skipped:'no recipient'});
  const metadata=typeof record.metadata==='object'&&record.metadata?record.metadata:{};
  const href=metadata.href||record.href||'/';
  const body=record.body||record.message||'';
  const title=record.title||'Melo Chat';
  const {data:subs,error}=await supabase.from('web_push_subscriptions').select('endpoint,p256dh,auth_key').eq('user_id',userId);
  if(error) return new Response(error.message,{status:500});
  let sent=0;
  for(const sub of subs||[]){
    try{
      await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},JSON.stringify({id:record.id,title,body,href,icon:'/melo-logo.png',badge:'/melo-logo.png'}));
      sent++;
    }catch(err){
      const status=(err as {statusCode?:number})?.statusCode;
      if(status===404||status===410)await supabase.from('web_push_subscriptions').delete().eq('endpoint',sub.endpoint);
      else console.error(err);
    }
  }
  return Response.json({ok:true,sent});
});

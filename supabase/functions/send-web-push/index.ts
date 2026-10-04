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

function recordText(record:any,metadata:any){
  return [
    record?.type,record?.notification_type,record?.kind,record?.event_type,
    metadata?.type,metadata?.notification_type,metadata?.kind,metadata?.activity_type,metadata?.entity_type,
    record?.href,metadata?.href,
  ].filter(Boolean).join(' ').toLowerCase();
}

function isDirectChatNotification(record:any,metadata:any){
  const raw=recordText(record,metadata);
  const href=String(metadata?.href||record?.href||'').toLowerCase();
  if(raw.includes('support_message')||href.startsWith('/support')||href.includes('support_thread='))return false;
  return raw.includes('direct_message')||raw.includes('private_message')||raw.includes('chat_message')||href.startsWith('/chat');
}

async function recipientCanUseChat(userId:string){
  try{
    const {data:admin}=await supabase.from('admin_users').select('user_id,is_active').eq('user_id',userId).eq('is_active',true).limit(1);
    if(admin?.length)return true;
  }catch{}

  try{
    const now=new Date().toISOString();
    const {data:subs}=await supabase.from('user_subscriptions')
      .select('plan_id,starts_at,expires_at,status')
      .eq('user_id',userId)
      .eq('status','active')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('starts_at',{ascending:false})
      .limit(1);
    const planId=subs?.[0]?.plan_id;
    if(planId){
      const {data:plans}=await supabase.from('subscription_plans').select('can_chat').eq('id',planId).limit(1);
      if(plans?.length)return plans[0]?.can_chat===true;
    }
  }catch{}

  // No active paid plan means the member uses the Free behavior.
  return false;
}

async function recipientLanguage(userId:string){
  try{
    const {data}=await supabase.from('profiles').select('primary_language').eq('id',userId).limit(1);
    const raw=String(data?.[0]?.primary_language||'en').toLowerCase().replace('_','-').split('-')[0];
    return raw==='th'||raw==='de'?raw:'en';
  }catch{return 'en'}
}

function genericMessageBody(locale:string){
  if(locale==='th')return 'คุณมีข้อความใหม่ เปิด Melo Chat เพื่อดูรายละเอียด';
  if(locale==='de')return 'Du hast eine neue Nachricht. Öffne Melo Chat für weitere Details.';
  return 'You have a new message. Open Melo Chat to view the details.';
}

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  if(!WEBHOOK_SECRET||req.headers.get('x-melo-webhook-secret')!==WEBHOOK_SECRET)return new Response('Unauthorized',{status:401});
  const payload=await req.json().catch(()=>({}));
  const record=payload.record||payload;
  const userId=record.user_id||record.recipient_id||record.recipient_user_id;
  if(!userId)return Response.json({ok:true,skipped:'no recipient'});
  const metadata=typeof record.metadata==='object'&&record.metadata?record.metadata:{};
  const href=metadata.href||record.href||'/';
  let body=record.body||record.message||'';
  let title=record.title||'Melo Chat';

  // Direct-message rows are created only after the server-side chat rules allow
  // the message. Existing matched conversations remain chat-enabled even after
  // a paid package expires, so push must follow the actual message instead of
  // re-locking the recipient based only on the current package.
  if(isDirectChatNotification(record,metadata) && !String(body||'').trim()) {
    body=genericMessageBody(await recipientLanguage(String(userId)));
  }

  const {count:unreadCount}=await supabase.from('notifications')
    .select('id',{count:'exact',head:true})
    .eq('user_id',userId)
    .eq('is_read',false);

  const {data:subs,error}=await supabase.from('web_push_subscriptions').select('endpoint,p256dh,auth_key').eq('user_id',userId);
  if(error) return new Response(error.message,{status:500});
  let sent=0;
  for(const sub of subs||[]){
    try{
      await webpush.sendNotification(
        {endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},
        JSON.stringify({
          id:record.id,title,body,href,icon:'/melo-logo.png',badge:'/melo-logo.png',
          unreadCount:Number(unreadCount)||1,timestamp:Date.now(),
          data:{type:record.type||record.notification_type||metadata.type||'notification'}
        })
      );
      sent++;
    }catch(err){
      const status=(err as {statusCode?:number})?.statusCode;
      if(status===404||status===410)await supabase.from('web_push_subscriptions').delete().eq('endpoint',sub.endpoint);
      else console.error(err);
    }
  }
  return Response.json({ok:true,sent});
});

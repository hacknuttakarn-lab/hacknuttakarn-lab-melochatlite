'use client';

import { getStoredSession, restUpsert } from '@/lib/supabase/browser';

const SW_PATH='/melo-notifications-sw.js';
const VAPID_KEY=(process.env.NEXT_PUBLIC_MELO_VAPID_PUBLIC_KEY||'').trim();
let hooked=false;
let registering=false;

function base64UrlToUint8Array(value:string){
  const padding='='.repeat((4-value.length%4)%4);
  const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

async function registerSubscription(){
  if(registering||typeof window==='undefined'||!('serviceWorker' in navigator)||!('PushManager' in window)||!window.isSecureContext||!VAPID_KEY)return;
  if(Notification.permission!=='granted')return;
  const session=getStoredSession();
  if(!session?.user?.id)return;
  registering=true;
  try{
    const reg=await navigator.serviceWorker.register(SW_PATH,{scope:'/'});
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8Array(VAPID_KEY)});
    }
    const json=sub.toJSON();
    if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)return;
    await restUpsert('web_push_subscriptions',{
      user_id:session.user.id,
      endpoint:json.endpoint,
      p256dh:json.keys.p256dh,
      auth_key:json.keys.auth,
      user_agent:navigator.userAgent,
      updated_at:new Date().toISOString(),
    },'endpoint');
  }catch(cause){console.warn('[Melo Push] subscription failed',cause)}finally{registering=false}
}

export function prepareMeloWebPush(){
  if(typeof window==='undefined'||hooked||!('Notification' in window))return;
  hooked=true;
  if(Notification.permission==='granted'){void registerSubscription();return;}
  if(Notification.permission!=='default')return;
  const ask=async()=>{
    window.removeEventListener('pointerdown',ask);
    window.removeEventListener('keydown',ask);
    try{
      const permission=await Notification.requestPermission();
      if(permission==='granted')await registerSubscription();
    }catch{}
  };
  window.addEventListener('pointerdown',ask,{once:true});
  window.addEventListener('keydown',ask,{once:true});
}

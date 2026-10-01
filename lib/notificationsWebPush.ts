'use client';

import { getStoredSession, rpcRequest } from '@/lib/supabase/browser';

const SW_PATH='/melo-notifications-sw.js';
const VAPID_KEY=(process.env.NEXT_PUBLIC_MELO_VAPID_PUBLIC_KEY||'').trim();
let hooked=false;
let registering=false;
let lastSync=0;

function base64UrlToUint8Array(value:string){
  const padding='='.repeat((4-value.length%4)%4);
  const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

async function registerSubscription(force=false){
  if(registering||typeof window==='undefined'||!('serviceWorker' in navigator)||!('PushManager' in window)||!window.isSecureContext||!VAPID_KEY)return;
  if(Notification.permission!=='granted')return;
  const session=getStoredSession();
  if(!session?.user?.id)return;
  if(!force&&Date.now()-lastSync<60_000)return;
  registering=true;
  try{
    const reg=await navigator.serviceWorker.register(SW_PATH,{scope:'/'});
    await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8Array(VAPID_KEY)});
    }
    const json=sub.toJSON();
    if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)return;
    const result=await rpcRequest('register_my_web_push_subscription',{
      p_endpoint:json.endpoint,
      p_p256dh:json.keys.p256dh,
      p_auth_key:json.keys.auth,
      p_user_agent:navigator.userAgent,
    });
    if(result.error)throw new Error(result.error);
    lastSync=Date.now();
  }catch(cause){console.warn('[Melo Push] subscription failed',cause)}finally{registering=false}
}

export async function syncMeloWebPushSubscription(){
  if(typeof window==='undefined'||!('Notification' in window))return;
  if(Notification.permission==='granted')await registerSubscription(true);
}

export function prepareMeloWebPush(){
  if(typeof window==='undefined'||hooked||!('Notification' in window)||!('serviceWorker' in navigator))return;
  hooked=true;
  // Register the service worker immediately. Push permission still requires a
  // browser-approved user gesture, but the SW should be ready before that.
  void navigator.serviceWorker.register(SW_PATH,{scope:'/'}).catch(()=>undefined);

  const sync=()=>{ if(Notification.permission==='granted')void registerSubscription(); };
  sync();
  window.addEventListener('focus',sync);
  window.addEventListener('online',sync);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync()});

  if(Notification.permission!=='default')return;
  const ask=async()=>{
    window.removeEventListener('pointerdown',ask);
    window.removeEventListener('keydown',ask);
    try{
      const permission=await Notification.requestPermission();
      if(permission==='granted')await registerSubscription(true);
    }catch{}
  };
  window.addEventListener('pointerdown',ask,{once:true});
  window.addEventListener('keydown',ask,{once:true});
}

/* Melo Chat Web Push service worker */
const MELO_BADGE_CACHE='melo-app-badge-v1';
const MELO_BADGE_STATE_URL='/__melo_app_badge_state__';

self.addEventListener('install',(event)=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',(event)=>{
  event.waitUntil(self.clients.claim());
});

async function readBadgeCount(){
  try{
    const cache=await caches.open(MELO_BADGE_CACHE);
    const response=await cache.match(MELO_BADGE_STATE_URL);
    if(!response)return 0;
    const value=Number(await response.text());
    return Number.isFinite(value)&&value>0?Math.floor(value):0;
  }catch{return 0}
}

async function writeBadgeCount(rawCount){
  const count=Math.max(0,Math.floor(Number(rawCount)||0));
  try{
    const cache=await caches.open(MELO_BADGE_CACHE);
    await cache.put(MELO_BADGE_STATE_URL,new Response(String(count),{
      headers:{'content-type':'text/plain','cache-control':'no-store'},
    }));
  }catch{}
  return count;
}

async function applyBadge(rawCount){
  const count=await writeBadgeCount(rawCount);
  const badgeNavigator=self.navigator;
  try{
    if(count>0&&badgeNavigator&&typeof badgeNavigator.setAppBadge==='function'){
      await badgeNavigator.setAppBadge(count);
    }else if(count===0&&badgeNavigator&&typeof badgeNavigator.clearAppBadge==='function'){
      await badgeNavigator.clearAppBadge();
    }else if(count===0&&badgeNavigator&&typeof badgeNavigator.setAppBadge==='function'){
      await badgeNavigator.setAppBadge(0);
    }
  }catch{}
  return count;
}

self.addEventListener('message',(event)=>{
  const data=event.data||{};
  if(data.type!=='MELO_BADGE_SET')return;
  event.waitUntil(applyBadge(data.count));
});

self.addEventListener('push',(event)=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch{payload={body:event.data?event.data.text():''}}
  const title=payload.title||'Melo Chat';
  const options={
    body:payload.body||'',
    icon:payload.icon||'/melo-logo.png',
    badge:payload.badge||'/melo-logo.png',
    tag:payload.tag||payload.id||undefined,
    renotify:true,
    requireInteraction:false,
    silent:false,
    timestamp:Number(payload.timestamp)||Date.now(),
    data:{href:payload.href||'/',...(payload.data||{})},
  };
  event.waitUntil((async()=>{
    const supplied=Number(payload.unreadCount??payload.badgeCount);
    const nextCount=Number.isFinite(supplied)&&supplied>=0
      ? Math.floor(supplied)
      : (await readBadgeCount())+1;
    await applyBadge(nextCount);
    await self.registration.showNotification(title,options);
  })());
});

self.addEventListener('notificationclick',(event)=>{
  event.notification.close();
  const href=(event.notification.data&&event.notification.data.href)||'/';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async(clients)=>{
    const targetUrl=new URL(href,self.location.origin).href;
    for(const client of clients){
      try{
        if(new URL(client.url).origin!==self.location.origin)continue;
        if('focus' in client)await client.focus();
        if(href!=='/'&&'navigate' in client)await client.navigate(targetUrl);
        return;
      }catch{}
    }
    if(self.clients.openWindow)await self.clients.openWindow(targetUrl);
  }));
});

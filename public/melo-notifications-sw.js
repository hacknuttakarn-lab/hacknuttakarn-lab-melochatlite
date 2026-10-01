/* Melo Chat Web Push service worker */
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
    data:{href:payload.href||'/',...(payload.data||{})},
  };
  event.waitUntil(self.registration.showNotification(title,options));
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

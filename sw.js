/* CRM UNIFIED R1 — cache the GitHub shell only (never CRM/Google responses). */
'use strict';
const C='crm-shell-v3';
const ROOT=new URL('./',self.registration.scope).href;
const FILES=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
const KNOWN=new Set(FILES.map(path=>new URL(path,ROOT).href));
const INDEX=new URL('./index.html',ROOT).href;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(C).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys
    .filter(key=>key.startsWith('crm-shell-')&&key!==C)
    .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  const isNav=req.mode==='navigate'&&url.href.startsWith(ROOT);
  const canonical=url.origin+url.pathname;
  if(!isNav&&!KNOWN.has(canonical))return;

  event.respondWith((async()=>{
    const cache=await caches.open(C);
    try{
      const response=await fetch(req);
      if(response.ok&&response.type==='basic'){
        const key=isNav?INDEX:canonical;
        try{await cache.put(key,response.clone());}catch(cacheError){/* Keep the online response even if storage is full. */}
      }
      return response;
    }catch(error){
      const fallback=await cache.match(isNav?INDEX:canonical)
        ||(isNav?await cache.match(ROOT):undefined);
      if(fallback)return fallback;
      throw error;
    }
  })());
});

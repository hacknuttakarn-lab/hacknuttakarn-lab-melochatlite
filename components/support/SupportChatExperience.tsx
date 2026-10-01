'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { createSignedStorageUrl, getCurrentUser, restInsert, restSelect, rpcRequest } from '@/lib/supabase/browser';
import { subscribeSupportMessages } from '@/lib/supabase/realtime';
import { saveAutoTranslationEnabled } from '@/components/settings/settingsWebData';
import styles from './SupportChatExperience.module.css';

type Attachment = { bucket:string; path:string; name?:string; mime?:string; url?:string };
type Message = {
  id:string;
  thread_id:string;
  sender_id:string;
  sender_role:'member'|'admin';
  body:string;
  metadata?:{attachments?:Attachment[]};
  created_at:string;
  read_at?:string|null;
};

type ChatLanguage = 'th'|'en'|'de';

const TRANSLATION_STORAGE_KEY='melo-chat-translation-enabled';
const TRANSLATION_SETTING_EVENT='melo-chat-translation-setting-changed';

const copy = {
  th:{title:'Melo Chat Support',sub:'พูดคุยกับทีมงาน Melo Chat',placeholder:'พิมพ์ข้อความถึงทีมงาน…',send:'ส่ง',empty:'เริ่มต้นการสนทนากับทีมงานได้ที่นี่',loading:'กำลังโหลด…',back:'กลับหน้าช่วยเหลือ',plan:'สนใจสมัครแพ็กเกจ',translation:'แปลข้อความ',translationOn:'เปิด',translationOff:'ปิด',original:'ข้อความต้นฉบับ'},
  en:{title:'Melo Chat Support',sub:'Chat with the Melo Chat team',placeholder:'Type a message to support…',send:'Send',empty:'Start a conversation with our support team here.',loading:'Loading…',back:'Back to Help',plan:'I am interested in the plan',translation:'Translation',translationOn:'On',translationOff:'Off',original:'Original'},
  de:{title:'Melo Chat Support',sub:'Chatte mit dem Melo-Chat-Team',placeholder:'Nachricht an den Support…',send:'Senden',empty:'Starte hier ein Gespräch mit unserem Support-Team.',loading:'Wird geladen…',back:'Zurück zur Hilfe',plan:'Ich interessiere mich für den Tarif',translation:'Übersetzung',translationOn:'Ein',translationOff:'Aus',original:'Original'},
} as const;

function normalizeChatLanguage(value:unknown, fallback:string):ChatLanguage {
  const raw=String(value||fallback||'en').trim().toLowerCase().replace('_','-').split('-')[0];
  return raw==='th'||raw==='de'?raw:'en';
}

export default function SupportChatExperience(){
  const {locale}=useLocale();
  const t=copy[locale as keyof typeof copy]||copy.en;
  const params=useSearchParams();
  const plan=(params.get('plan')||'').trim();
  const[threadId,setThreadId]=useState('');
  const[messages,setMessages]=useState<Message[]>([]);
  const[draft,setDraft]=useState('');
  const[loading,setLoading]=useState(true);
  const[sending,setSending]=useState(false);
  const[translationEnabled,setTranslationEnabled]=useState(true);
  const[translationUserId,setTranslationUserId]=useState('');
  const[primaryChatLanguage,setPrimaryChatLanguage]=useState<ChatLanguage>(normalizeChatLanguage(locale,locale));
  const[translations,setTranslations]=useState<Record<string,string>>({});
  const bottom=useRef<HTMLDivElement|null>(null);
  const composer=useRef<HTMLTextAreaElement|null>(null);
  const knownIds=useRef(new Set<string>());
  const translationAttempted=useRef(new Set<string>());

  async function ensureThread(){
    const r=await rpcRequest<string>('support_ensure_my_thread',{p_subject:plan?`Plan: ${plan}`:null});
    if(r.error)throw new Error(r.error);
    const id=String(r.data||'').replaceAll('"','');
    setThreadId(id);
    return id;
  }

  async function loadChatPreferences(userId:string){
    const result=await restSelect<Record<string,unknown>[]>('profiles',`select=primary_language,auto_translation_enabled&id=eq.${encodeURIComponent(userId)}&limit=1`);
    const row=!result.error&&Array.isArray(result.data)?result.data[0]:null;
    const language=normalizeChatLanguage(row?.primary_language,locale);
    const enabled=row?.auto_translation_enabled!==false;
    setTranslationUserId(userId);
    setPrimaryChatLanguage(language);
    setTranslationEnabled(enabled);
    window.localStorage.setItem(TRANSLATION_STORAGE_KEY,enabled?'on':'off');
  }

  async function load(id:string){
    const r=await restSelect<Message[]>('support_messages',`select=id,thread_id,sender_id,sender_role,body,metadata,created_at,read_at&thread_id=eq.${encodeURIComponent(id)}&order=created_at.asc&limit=200`);
    if(r.error)throw new Error(r.error);
    const rows=r.data||[];
    rows.forEach(x=>knownIds.current.add(x.id));
    setMessages(rows);
    await rpcRequest('support_mark_my_thread_read',{p_thread_id:id});
    window.dispatchEvent(new CustomEvent('melo-support-unread-changed'));
  }

  useEffect(()=>{
    let live=true;
    const initialise=async()=>{
      try{
        const user=await getCurrentUser();
        if(!user?.id)return;
        await loadChatPreferences(user.id);
        const id=await ensureThread();
        if(!live)return;
        await load(id);
        if(plan){
          const key=`melo-support-plan:${user.id}:${plan}`;
          if(!sessionStorage.getItem(key)){
            const sent=await restInsert('support_messages',{thread_id:id,sender_id:user.id,sender_role:'member',body:`${t.plan}: ${plan}`,message_type:'plan_interest',metadata:{plan}});
            if(!sent.error){sessionStorage.setItem(key,'1');await load(id)}
          }
        }
      }catch(e){console.error(e)}finally{if(live)setLoading(false)}
    };
    void initialise();
    return()=>{live=false;};
  },[plan,locale]);


  useEffect(()=>{
    const cached=window.localStorage.getItem(TRANSLATION_STORAGE_KEY);
    if(cached)setTranslationEnabled(cached!=='off');
    const onChanged=(event:Event)=>{
      const detail=(event as CustomEvent<{enabled?:boolean;primaryLanguage?:string}>).detail;
      if(typeof detail?.enabled==='boolean')setTranslationEnabled(detail.enabled);
      if(detail?.primaryLanguage)setPrimaryChatLanguage(normalizeChatLanguage(detail.primaryLanguage,locale));
    };
    const onStorage=(event:StorageEvent)=>{if(event.key===TRANSLATION_STORAGE_KEY)setTranslationEnabled(event.newValue!=='off')};
    window.addEventListener(TRANSLATION_SETTING_EVENT,onChanged as EventListener);
    window.addEventListener('storage',onStorage);
    return()=>{window.removeEventListener(TRANSLATION_SETTING_EVENT,onChanged as EventListener);window.removeEventListener('storage',onStorage)};
  },[locale]);

  function toggleTranslation(){
    const next=!translationEnabled;
    setTranslationEnabled(next);
    window.localStorage.setItem(TRANSLATION_STORAGE_KEY,next?'on':'off');
    window.dispatchEvent(new CustomEvent(TRANSLATION_SETTING_EVENT,{detail:{enabled:next,primaryLanguage:primaryChatLanguage}}));
    if(translationUserId){
      void saveAutoTranslationEnabled(translationUserId,next).catch(()=>{
        setTranslationEnabled(!next);
        window.localStorage.setItem(TRANSLATION_STORAGE_KEY,!next?'on':'off');
      });
    }
  }
  useEffect(()=>{
    if(!threadId)return undefined;
    return subscribeSupportMessages((row)=>{
      const m=row as unknown as Message;
      if(!m?.id||m.thread_id!==threadId||knownIds.current.has(m.id))return;
      knownIds.current.add(m.id);
      setMessages(v=>v.some(x=>x.id===m.id)?v:[...v,m]);
      if(m.sender_role==='admin')void rpcRequest('support_mark_my_thread_read',{p_thread_id:threadId}).then(()=>window.dispatchEvent(new CustomEvent('melo-support-unread-changed')));
    });
  },[threadId]);

  useEffect(()=>{
    if(!translationEnabled)return;
    let active=true;
    const incoming=messages.filter(m=>m.sender_role==='admin'&&m.body?.trim());
    for(const message of incoming){
      const cacheKey=`${message.id}:${primaryChatLanguage}:${message.body}`;
      if(translationAttempted.current.has(cacheKey))continue;
      translationAttempted.current.add(cacheKey);
      void fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:message.body,target:primaryChatLanguage})})
        .then(async response=>response.ok?response.json():null)
        .then(result=>{
          const translated=typeof result?.translatedText==='string'?result.translatedText.trim():'';
          if(active&&translated&&translated!==message.body.trim())setTranslations(current=>({...current,[message.id]:translated}));
        })
        .catch(()=>undefined);
    }
    return()=>{active=false};
  },[messages,primaryChatLanguage,translationEnabled]);

  useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'});},[messages.length,translations]);

  useEffect(()=>{
    const el=composer.current;
    if(!el)return;
    el.style.height='auto';
    const cs=window.getComputedStyle(el);
    const lh=parseFloat(cs.lineHeight)||24;
    const py=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
    const by=(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0);
    const max=lh*7+py+by;
    el.style.height=`${Math.min(el.scrollHeight,max)}px`;
    el.style.overflowY=el.scrollHeight>max?'auto':'hidden';
  },[draft]);

  async function send(){
    const body=draft.trim();
    if(!body||!threadId||sending)return;
    setSending(true);
    try{
      const user=await getCurrentUser();
      if(!user?.id)return;
      const r=await restInsert('support_messages',{thread_id:threadId,sender_id:user.id,sender_role:'member',body,message_type:'text',metadata:{}});
      if(r.error)throw new Error(r.error);
      setDraft('');
      await load(threadId);
    }finally{setSending(false)}
  }

  return <div className={styles.page}>
    <Header/>
    <main className={styles.shell}>
      <a href="/support" className={styles.back}>← {t.back}</a>
      <section className={styles.chat}>
        <header>
          <img src="/melo-support-logo.png" alt=""/>
          <div className={styles.supportHeading}><h1>{t.title}</h1><p>{t.sub}</p></div>
          <button type="button" className={`${styles.translationToggle} ${translationEnabled?styles.translationToggleOn:''}`} onClick={toggleTranslation} aria-pressed={translationEnabled} title={t.translation}>
            <span>文A</span><b>{t.translation}</b><em>{translationEnabled?t.translationOn:t.translationOff}</em>
          </button>
        </header>
        <div className={styles.messages}>
          {loading?<p className={styles.empty}>{t.loading}</p>:messages.length===0?<p className={styles.empty}>{t.empty}</p>:messages.map(m=>{
            const translated=translationEnabled&&m.sender_role==='admin'?translations[m.id]||'':'';
            return <div key={m.id} className={`${styles.message} ${m.sender_role==='member'?styles.mine:styles.support}`}>
              <span>{m.sender_role==='admin'?'Melo Chat Support':''}</span>
              <p>{translated||m.body}</p>
              {translated?<p className={styles.originalMessage}><small>{t.original}</small>{m.body}</p>:null}
              {m.metadata?.attachments?.length?<div className={styles.messageImages}>{m.metadata.attachments.map((a,i)=><SupportImage key={`${a.path}-${i}`} attachment={a}/>)}</div>:null}
              <time>{new Date(m.created_at).toLocaleString(locale==='th'?'th-TH':locale==='de'?'de-DE':'en-US')}</time>
            </div>
          })}
          <div ref={bottom}/>
        </div>
        <footer>
          <textarea ref={composer} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t.placeholder} rows={1} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}}/>
          <button type="button" disabled={!draft.trim()||sending} onClick={()=>void send()}>{t.send}</button>
        </footer>
      </section>
    </main>
  </div>;
}

function SupportImage({attachment}:{attachment:Attachment}){
  const[src,setSrc]=useState(attachment.url||'');
  useEffect(()=>{
    let live=true;
    if(!src&&attachment.bucket&&attachment.path)void createSignedStorageUrl(attachment.bucket,attachment.path,3600).then(r=>{if(live&&r.data)setSrc(r.data)});
    return()=>{live=false};
  },[attachment.bucket,attachment.path,src]);
  return src?<img src={src} alt={attachment.name||''}/>:null;
}

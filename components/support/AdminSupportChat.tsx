'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/SiteProviders';
import {
  createSignedStorageUrl, deleteStorageObject, getCurrentUser, publicStorageUrl,
  restDelete, restInsert, restInsertReturning, restSelect, restUpdate, rpcRequest, uploadStorageObject,
} from '@/lib/supabase/browser';
import { subscribeSupportMessages } from '@/lib/supabase/realtime';
import { saveAutoTranslationEnabled } from '@/components/settings/settingsWebData';
import styles from './AdminSupportChat.module.css';

type Thread={id:string;user_id:string;subject:string|null;status:string;updated_at:string;member_email:string|null;member_name:string|null;avatar_url:string|null;plan_name:string|null;unread_count:number;last_message:string|null;last_message_at:string|null};
type Attachment={bucket:string;path:string;name?:string;mime?:string;url?:string};
type Msg={id:string;thread_id:string;sender_id:string;sender_role:'member'|'admin';body:string;metadata?:{attachments?:Attachment[]};created_at:string;read_at?:string|null};
type SavedReply={id:string;title:string;body:string;created_at:string;updated_at:string};
type SavedAttachment={id:string;saved_reply_id:string;storage_bucket:string;storage_path:string;file_name:string|null;mime_type:string|null;sort_order:number;url?:string};
type ChatLanguage='th'|'en'|'de';

const BUCKET='support-saved-replies';
const TRANSLATION_STORAGE_KEY='melo-chat-translation-enabled';
const TRANSLATION_SETTING_EVENT='melo-chat-translation-setting-changed';
const copy={
  th:{saved:'ข้อความที่บันทึก',newReply:'เพิ่มข้อความ',edit:'แก้ไข',del:'ลบ',use:'ใช้ข้อความนี้',title:'หัวข้อ',body:'ข้อความตอบ',images:'รูปภาพ (สูงสุด 3 รูป)',save:'บันทึก',cancel:'ยกเลิก',empty:'ยังไม่มีข้อความจากสมาชิก',select:'เลือกข้อความจากสมาชิกเพื่อเริ่มตอบกลับ',reply:'ตอบกลับในนาม Melo Chat Support…',send:'ส่ง',package:'แพ็กเกจ',noSaved:'ยังไม่มี Saved Reply',translation:'แปลข้อความ',translationOn:'เปิด',translationOff:'ปิด',original:'ข้อความต้นฉบับ'},
  en:{saved:'Saved replies',newReply:'New reply',edit:'Edit',del:'Delete',use:'Use reply',title:'Title',body:'Reply text',images:'Images (max 3)',save:'Save',cancel:'Cancel',empty:'No support messages yet',select:'Select a member conversation to reply',reply:'Reply as Melo Chat Support…',send:'Send',package:'Package',noSaved:'No saved replies yet',translation:'Translation',translationOn:'On',translationOff:'Off',original:'Original'},
  de:{saved:'Gespeicherte Antworten',newReply:'Neue Antwort',edit:'Bearbeiten',del:'Löschen',use:'Antwort verwenden',title:'Titel',body:'Antworttext',images:'Bilder (max. 3)',save:'Speichern',cancel:'Abbrechen',empty:'Noch keine Support-Nachrichten',select:'Wähle eine Unterhaltung aus',reply:'Als Melo Chat Support antworten…',send:'Senden',package:'Paket',noSaved:'Noch keine gespeicherten Antworten',translation:'Übersetzung',translationOn:'Ein',translationOff:'Aus',original:'Original'},
} as const;

function normalizeChatLanguage(value:unknown,fallback:string):ChatLanguage{
  const raw=String(value||fallback||'en').trim().toLowerCase().replace('_','-').split('-')[0];
  return raw==='th'||raw==='de'?raw:'en';
}

export default function AdminSupportChat({onClose}:{onClose:()=>void}){
  const {locale}=useLocale();
  const t=copy[locale as keyof typeof copy]||copy.en;
  const[threads,setThreads]=useState<Thread[]>([]),[selected,setSelected]=useState(''),[msgs,setMsgs]=useState<Msg[]>([]),[draft,setDraft]=useState(''),[draftAttachments,setDraftAttachments]=useState<Attachment[]>([]);
  const[saved,setSaved]=useState<SavedReply[]>([]),[savedAttachments,setSavedAttachments]=useState<Record<string,SavedAttachment[]>>({}),[savedOpen,setSavedOpen]=useState(false),[editing,setEditing]=useState<SavedReply|null|undefined>(undefined),[formTitle,setFormTitle]=useState(''),[formBody,setFormBody]=useState(''),[formFiles,setFormFiles]=useState<File[]>([]),[busy,setBusy]=useState(false);
  const[translationEnabled,setTranslationEnabled]=useState(true),[translationUserId,setTranslationUserId]=useState(''),[primaryChatLanguage,setPrimaryChatLanguage]=useState<ChatLanguage>(normalizeChatLanguage(locale,locale)),[translations,setTranslations]=useState<Record<string,string>>({});
  const bottom=useRef<HTMLDivElement|null>(null),composer=useRef<HTMLTextAreaElement|null>(null),knownIds=useRef(new Set<string>()),translationAttempted=useRef(new Set<string>()),mobileRef=useRef(false);
  const current=useMemo(()=>threads.find(x=>x.id===selected)||null,[threads,selected]);
  const avatar=(raw:string|null)=>{const x=String(raw||'').trim();return !x?'':/^https?:\/\//i.test(x)?x:publicStorageUrl('profile-photos',x)};

  async function loadThreads(){
    const r=await restSelect<Thread[]>('support_admin_threads','select=*&order=updated_at.desc&limit=100');
    if(!r.error){
      const rows=r.data||[];setThreads(rows);
      const requested=sessionStorage.getItem('melo-support-thread');
      if(requested&&rows.some(x=>x.id===requested)){setSelected(requested);sessionStorage.removeItem('melo-support-thread')}
      else if(!mobileRef.current&&!selected&&rows[0])setSelected(rows[0].id);
    }
  }
  async function loadMessages(id:string){
    if(!id){setMsgs([]);return}
    const r=await restSelect<Msg[]>('support_messages',`select=id,thread_id,sender_id,sender_role,body,metadata,created_at,read_at&thread_id=eq.${encodeURIComponent(id)}&order=created_at.asc&limit=300`);
    if(!r.error){const rows=r.data||[];rows.forEach(x=>knownIds.current.add(x.id));setMsgs(rows)}
  }
  async function markRead(id:string){if(!id)return;await rpcRequest('support_mark_thread_read',{p_thread_id:id});await loadThreads();window.dispatchEvent(new CustomEvent('melo-support-unread-changed'))}
  async function loadSaved(){
    const [r,a]=await Promise.all([restSelect<SavedReply[]>('support_saved_replies','select=*&order=title.asc'),restSelect<SavedAttachment[]>('support_saved_reply_attachments','select=*&order=sort_order.asc')]);
    if(r.error||a.error)return;
    const grouped:Record<string,SavedAttachment[]>={};
    for(const item of a.data||[]){const signed=await createSignedStorageUrl(item.storage_bucket,item.storage_path,3600);const next={...item,url:signed.data||''};(grouped[item.saved_reply_id]??=[]).push(next)}
    setSaved(r.data||[]);setSavedAttachments(grouped);
  }
  async function loadAdminTranslationPreferences(){
    const user=await getCurrentUser();if(!user?.id)return;
    const result=await restSelect<Record<string,unknown>[]>('profiles',`select=primary_language,auto_translation_enabled&id=eq.${encodeURIComponent(user.id)}&limit=1`);
    const row=!result.error&&Array.isArray(result.data)?result.data[0]:null;
    const cached=window.localStorage.getItem(TRANSLATION_STORAGE_KEY);
    const enabled=cached?cached!=='off':row?.auto_translation_enabled!==false;
    setTranslationUserId(user.id);setPrimaryChatLanguage(normalizeChatLanguage(row?.primary_language,locale));setTranslationEnabled(enabled);
  }

  useEffect(()=>{
    const media=window.matchMedia('(max-width: 720px)');
    const sync=()=>{mobileRef.current=media.matches};
    sync();media.addEventListener?.('change',sync);
    return()=>media.removeEventListener?.('change',sync);
  },[]);
  useEffect(()=>{void loadThreads();void loadSaved();void loadAdminTranslationPreferences()},[]);
  useEffect(()=>{void loadMessages(selected).then(()=>markRead(selected))},[selected]);
  useEffect(()=>subscribeSupportMessages((row)=>{const m=row as unknown as Msg;if(!m?.id||knownIds.current.has(m.id))return;knownIds.current.add(m.id);void loadThreads();if(m.thread_id===selected){setMsgs(v=>v.some(x=>x.id===m.id)?v:[...v,m]);if(m.sender_role==='member')void markRead(selected)}window.dispatchEvent(new CustomEvent('melo-support-unread-changed'))}),[selected]);
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})},[msgs.length,translations]);
  useEffect(()=>{const el=composer.current;if(!el)return;el.style.height='auto';const cs=window.getComputedStyle(el);const lh=parseFloat(cs.lineHeight)||24,py=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0),by=(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0),max=lh*7+py+by;el.style.height=`${Math.min(el.scrollHeight,max)}px`;el.style.overflowY=el.scrollHeight>max?'auto':'hidden'},[draft]);
  useEffect(()=>{
    const onChanged=(event:Event)=>{const detail=(event as CustomEvent<{enabled?:boolean;primaryLanguage?:string}>).detail;if(typeof detail?.enabled==='boolean')setTranslationEnabled(detail.enabled);if(detail?.primaryLanguage)setPrimaryChatLanguage(normalizeChatLanguage(detail.primaryLanguage,locale))};
    const onStorage=(event:StorageEvent)=>{if(event.key===TRANSLATION_STORAGE_KEY)setTranslationEnabled(event.newValue!=='off')};
    window.addEventListener(TRANSLATION_SETTING_EVENT,onChanged as EventListener);window.addEventListener('storage',onStorage);
    return()=>{window.removeEventListener(TRANSLATION_SETTING_EVENT,onChanged as EventListener);window.removeEventListener('storage',onStorage)};
  },[locale]);
  useEffect(()=>{
    if(!translationEnabled)return;
    let active=true;
    for(const message of msgs.filter(m=>m.sender_role==='member'&&m.body?.trim())){
      const cacheKey=`${message.id}:${primaryChatLanguage}:${message.body}`;
      if(translationAttempted.current.has(cacheKey))continue;
      translationAttempted.current.add(cacheKey);
      void fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:message.body,target:primaryChatLanguage})})
        .then(async response=>response.ok?response.json():null)
        .then(result=>{const translated=typeof result?.translatedText==='string'?result.translatedText.trim():'';if(active&&translated&&translated!==message.body.trim())setTranslations(currentMap=>({...currentMap,[message.id]:translated}))})
        .catch(()=>undefined);
    }
    return()=>{active=false};
  },[msgs,primaryChatLanguage,translationEnabled]);

  function toggleTranslation(){
    const next=!translationEnabled;setTranslationEnabled(next);window.localStorage.setItem(TRANSLATION_STORAGE_KEY,next?'on':'off');window.dispatchEvent(new CustomEvent(TRANSLATION_SETTING_EVENT,{detail:{enabled:next,primaryLanguage:primaryChatLanguage}}));
    if(translationUserId)void saveAutoTranslationEnabled(translationUserId,next).catch(()=>{setTranslationEnabled(!next);window.localStorage.setItem(TRANSLATION_STORAGE_KEY,!next?'on':'off')});
  }
  async function send(){const body=draft.trim();if((!body&&!draftAttachments.length)||!selected)return;const u=await getCurrentUser();if(!u?.id)return;setBusy(true);try{const r=await restInsert('support_messages',{thread_id:selected,sender_id:u.id,sender_role:'admin',body:body||'📎',message_type:draftAttachments.length?'attachment':'text',metadata:{attachments:draftAttachments.map(({bucket,path,name,mime})=>({bucket,path,name,mime}))}});if(!r.error){setDraft('');setDraftAttachments([]);await loadMessages(selected);await loadThreads()}}finally{setBusy(false)}}
  function openNew(){setEditing(null);setFormTitle('');setFormBody('');setFormFiles([])}
  function openEdit(x:SavedReply){setEditing(x);setFormTitle(x.title);setFormBody(x.body);setFormFiles([])}
  async function saveReply(){if(!formTitle.trim()||!formBody.trim())return;const existing=editing?.id?savedAttachments[editing.id]||[]:[];if(existing.length+formFiles.length>3){alert(t.images);return}setBusy(true);try{const u=await getCurrentUser();if(!u?.id)return;let id=editing?.id||'';if(id){const r=await restUpdate('support_saved_replies',`id=eq.${encodeURIComponent(id)}`,{title:formTitle.trim(),body:formBody.trim()});if(r.error)throw new Error(r.error)}else{const r=await restInsertReturning<SavedReply>('support_saved_replies',{title:formTitle.trim(),body:formBody.trim(),created_by:u.id,updated_by:u.id});if(r.error)throw new Error(r.error);id=r.data?.[0]?.id||''}const used=new Set(existing.map(a=>Number(a.sort_order)));const free=[1,2,3].filter(n=>!used.has(n));for(let i=0;i<formFiles.length;i++){const f=formFiles[i],order=free[i],path=`${id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]+/g,'_')}`;const up=await uploadStorageObject(BUCKET,path,f,f.type);if(up.error)throw new Error(up.error);const ins=await restInsert('support_saved_reply_attachments',{saved_reply_id:id,storage_bucket:BUCKET,storage_path:path,file_name:f.name,mime_type:f.type,sort_order:order});if(ins.error)throw new Error(ins.error)}setEditing(undefined);await loadSaved()}catch(e){alert(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
  async function deleteSavedReply(x:SavedReply){if(!confirm(`${t.del}: ${x.title}?`))return;for(const a of savedAttachments[x.id]||[])await deleteStorageObject(a.storage_bucket,a.storage_path);await restDelete('support_saved_replies',`id=eq.${encodeURIComponent(x.id)}`);await loadSaved()}
  async function removeSavedAttachment(a:SavedAttachment){await deleteStorageObject(a.storage_bucket,a.storage_path);await restDelete('support_saved_reply_attachments',`id=eq.${encodeURIComponent(a.id)}`);await loadSaved()}
  function useSavedReply(x:SavedReply){setDraft(x.body);setDraftAttachments((savedAttachments[x.id]||[]).map(a=>({bucket:a.storage_bucket,path:a.storage_path,name:a.file_name||undefined,mime:a.mime_type||undefined,url:a.url})));setSavedOpen(false);requestAnimationFrame(()=>composer.current?.focus())}

  return <div className={styles.backdrop}><section className={styles.drawer}>
    <header><div className={styles.brand}><img src="/melo-support-logo.png" alt=""/><div><strong>Melo Chat Support</strong><span>Admin Support Inbox</span></div></div><div className={styles.headerActions}><button onClick={()=>setSavedOpen(v=>!v)}>{t.saved}</button><button onClick={onClose} aria-label="Close">×</button></div></header>
    <div className={`${styles.body} ${selected?styles.conversationOpen:''}`}>
      <aside>{threads.length===0?<p className={styles.empty}>{t.empty}</p>:threads.map(x=><button key={x.id} className={x.id===selected?styles.active:''} onClick={()=>setSelected(x.id)}><div className={styles.threadRow}>{avatar(x.avatar_url)?<img className={styles.avatar} src={avatar(x.avatar_url)} alt=""/>:<div className={styles.avatarFallback}>{(x.member_name||x.member_email||'M').charAt(0).toUpperCase()}</div>}<div className={styles.threadCopy}><strong>{x.member_name||x.member_email||'Melo member'}</strong><span>{x.last_message||x.member_email||''}</span><small>{x.member_email||''}</small></div>{Number(x.unread_count)>0?<b className={styles.unread}>{Number(x.unread_count)>99?'99+':x.unread_count}</b>:null}</div></button>)}</aside>
      <main>{current?<>
        <button type="button" className={styles.mobileBack} onClick={()=>setSelected('')} aria-label="Back to support conversations">‹ <span>{locale==='th'?'รายชื่อผู้ติดต่อ':locale==='de'?'Unterhaltungen':'Conversations'}</span></button>
        <div className={styles.member}>{avatar(current.avatar_url)?<img className={styles.memberAvatar} src={avatar(current.avatar_url)} alt=""/>:<div className={styles.memberAvatarFallback}>{(current.member_name||current.member_email||'M').charAt(0).toUpperCase()}</div>}<div className={styles.memberInfo}><strong>{current.member_name||'Melo member'}</strong><span>{current.member_email}</span><small>{t.package}: {current.plan_name||'Free'}</small></div><button type="button" className={`${styles.translationToggle} ${translationEnabled?styles.translationToggleOn:''}`} onClick={toggleTranslation} aria-pressed={translationEnabled} title={t.translation}><span>文A</span><b>{t.translation}</b><em>{translationEnabled?t.translationOn:t.translationOff}</em></button></div>
        <div className={styles.messages}>{msgs.map(m=>{const translated=translationEnabled&&m.sender_role==='member'?translations[m.id]||'':'';return <div key={m.id} className={`${styles.msg} ${m.sender_role==='admin'?styles.mine:''}`}><p>{translated||m.body}</p>{translated?<p className={styles.originalMessage}><small>{t.original}</small>{m.body}</p>:null}{m.metadata?.attachments?.length?<div className={styles.messageImages}>{m.metadata.attachments.map((a,i)=><SavedImage key={`${a.path}-${i}`} attachment={a}/>)}</div>:null}<time>{new Date(m.created_at).toLocaleString(locale==='th'?'th-TH':locale==='de'?'de-DE':'en-US')}</time></div>})}<div ref={bottom}/></div>
        <footer><div className={styles.composerMain}>{draftAttachments.length?<div className={styles.draftImages}>{draftAttachments.map((a,i)=><div key={a.path}><SavedImage attachment={a}/><button onClick={()=>setDraftAttachments(v=>v.filter((_,n)=>n!==i))}>×</button></div>)}</div>:null}<textarea ref={composer} rows={1} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t.reply} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}}/></div><button className={styles.sendButton} onClick={()=>void send()} disabled={busy||(!draft.trim()&&!draftAttachments.length)}>{t.send}</button></footer>
      </>:<div className={styles.noSelection}><img src="/melo-support-logo.png" alt=""/><strong>Melo Chat Support</strong><span>{t.select}</span></div>}</main>
    </div>
    {savedOpen?<section className={styles.savedPanel}><header><strong>{t.saved}</strong><button onClick={openNew}>＋ {t.newReply}</button></header><div className={styles.savedList}>{saved.length?saved.map(x=><article key={x.id}><h3>{x.title}</h3><p>{x.body}</p>{(savedAttachments[x.id]||[]).length?<div className={styles.savedThumbs}>{savedAttachments[x.id].map(a=><img key={a.id} src={a.url} alt=""/>)}</div>:null}<div><button onClick={()=>useSavedReply(x)}>{t.use}</button><button onClick={()=>openEdit(x)}>{t.edit}</button><button onClick={()=>void deleteSavedReply(x)}>{t.del}</button></div></article>):<p className={styles.empty}>{t.noSaved}</p>}</div></section>:null}
    {editing!==undefined?<div className={styles.modalBackdrop} onMouseDown={()=>setEditing(undefined)}><section className={styles.replyModal} onMouseDown={e=>e.stopPropagation()}><h2>{editing?t.edit:t.newReply}</h2><label>{t.title}<input value={formTitle} onChange={e=>setFormTitle(e.target.value)} maxLength={120}/></label><label>{t.body}<textarea value={formBody} onChange={e=>setFormBody(e.target.value)} rows={7}/></label>{editing&&(savedAttachments[editing.id]||[]).length?<div className={styles.editImages}>{savedAttachments[editing.id].map(a=><div key={a.id}><img src={a.url} alt=""/><button onClick={()=>void removeSavedAttachment(a)}>×</button></div>)}</div>:null}<label>{t.images}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={e=>setFormFiles(Array.from(e.target.files||[]).slice(0,3))}/></label><div className={styles.modalActions}><button onClick={()=>setEditing(undefined)}>{t.cancel}</button><button onClick={()=>void saveReply()} disabled={busy||!formTitle.trim()||!formBody.trim()}>{t.save}</button></div></section></div>:null}
  </section></div>;
}

function SavedImage({attachment}:{attachment:Attachment}){
  const[src,setSrc]=useState(attachment.url||'');
  useEffect(()=>{let live=true;if(!src&&attachment.bucket&&attachment.path)void createSignedStorageUrl(attachment.bucket,attachment.path,3600).then(r=>{if(live&&r.data)setSrc(r.data)});return()=>{live=false}},[attachment.bucket,attachment.path,src]);
  return src?<img src={src} alt={attachment.name||''}/>:null;
}

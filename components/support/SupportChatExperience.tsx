'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { getCurrentUser, restInsert, restSelect, rpcRequest } from '@/lib/supabase/browser';
import styles from './SupportChatExperience.module.css';
type Message={id:string;thread_id:string;sender_id:string;sender_role:'member'|'admin';body:string;created_at:string};
const copy={th:{title:'Melo Chat Support',sub:'พูดคุยกับทีมงาน Melo Chat',placeholder:'พิมพ์ข้อความถึงทีมงาน…',send:'ส่ง',empty:'เริ่มต้นการสนทนากับทีมงานได้ที่นี่',loading:'กำลังโหลด…',back:'กลับหน้าช่วยเหลือ',plan:'สนใจสมัครแพ็กเกจ'},en:{title:'Melo Chat Support',sub:'Chat with the Melo Chat team',placeholder:'Type a message to support…',send:'Send',empty:'Start a conversation with our support team here.',loading:'Loading…',back:'Back to Help',plan:'I am interested in the plan'},de:{title:'Melo Chat Support',sub:'Chatte mit dem Melo-Chat-Team',placeholder:'Nachricht an den Support…',send:'Senden',empty:'Starte hier ein Gespräch mit unserem Support-Team.',loading:'Wird geladen…',back:'Zurück zur Hilfe',plan:'Ich interessiere mich für den Tarif'}} as const;
export default function SupportChatExperience(){const {locale}=useLocale();const t=copy[locale as keyof typeof copy]||copy.en;const params=useSearchParams();const plan=(params.get('plan')||'').trim();const[threadId,setThreadId]=useState('');const[messages,setMessages]=useState<Message[]>([]);const[draft,setDraft]=useState('');const[loading,setLoading]=useState(true);const[sending,setSending]=useState(false);const bottom=useRef<HTMLDivElement|null>(null);const composer=useRef<HTMLTextAreaElement|null>(null);
 async function ensureThread(){const r=await rpcRequest<string>('support_ensure_my_thread',{p_subject:plan?`Plan: ${plan}`:null});if(r.error)throw new Error(r.error);const id=String(r.data||'').replaceAll('"','');setThreadId(id);return id}
 async function load(id:string){const r=await restSelect<Message[]>('support_messages',`select=id,thread_id,sender_id,sender_role,body,created_at&thread_id=eq.${encodeURIComponent(id)}&order=created_at.asc&limit=200`);if(r.error)throw new Error(r.error);setMessages(r.data||[])}
 useEffect(()=>{
  let live=true;
  const initialise=async()=>{try{const user=await getCurrentUser();if(!user?.id)return;const id=await ensureThread();if(!live)return;await load(id);if(plan){const key=`melo-support-plan:${user.id}:${plan}`;if(!sessionStorage.getItem(key)){const sent=await restInsert('support_messages',{thread_id:id,sender_id:user.id,sender_role:'member',body:`${t.plan}: ${plan}`,message_type:'plan_interest',metadata:{plan}});if(!sent.error){sessionStorage.setItem(key,'1');await load(id)}}}}catch(e){console.error(e)}finally{if(live)setLoading(false)}};
  void initialise();
  return()=>{live=false;};
 },[plan,locale]);
 useEffect(()=>{
  if(!threadId)return undefined;
  const timer=window.setInterval(()=>{void load(threadId).catch(()=>undefined);},4000);
  return()=>{window.clearInterval(timer);};
 },[threadId]);
 useEffect(()=>{
  bottom.current?.scrollIntoView({behavior:'smooth'});
 },[messages.length]);
 useEffect(()=>{const el=composer.current;if(!el)return;el.style.height='auto';const cs=window.getComputedStyle(el);const lh=parseFloat(cs.lineHeight)||24;const py=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);const by=(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0);const max=lh*7+py+by;el.style.height=`${Math.min(el.scrollHeight,max)}px`;el.style.overflowY=el.scrollHeight>max?'auto':'hidden';},[draft]);
 async function send(){const body=draft.trim();if(!body||!threadId||sending)return;setSending(true);try{const user=await getCurrentUser();if(!user?.id)return;const r=await restInsert('support_messages',{thread_id:threadId,sender_id:user.id,sender_role:'member',body,message_type:'text',metadata:{}});if(r.error)throw new Error(r.error);setDraft('');await load(threadId)}finally{setSending(false)}}
 return <div className={styles.page}><Header/><main className={styles.shell}><a href="/support" className={styles.back}>← {t.back}</a><section className={styles.chat}><header><img src="/melo-support-logo.png" alt=""/><div><h1>{t.title}</h1><p>{t.sub}</p></div></header><div className={styles.messages}>{loading?<p className={styles.empty}>{t.loading}</p>:messages.length===0?<p className={styles.empty}>{t.empty}</p>:messages.map(m=><div key={m.id} className={`${styles.message} ${m.sender_role==='member'?styles.mine:styles.support}`}><span>{m.sender_role==='admin'?'Melo Chat Support':''}</span><p>{m.body}</p><time>{new Date(m.created_at).toLocaleString(locale==='th'?'th-TH':locale==='de'?'de-DE':'en-US')}</time></div>)}<div ref={bottom}/></div><footer><textarea ref={composer} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t.placeholder} rows={1} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}}/><button type="button" disabled={!draft.trim()||sending} onClick={()=>void send()}>{t.send}</button></footer></section></main></div>}

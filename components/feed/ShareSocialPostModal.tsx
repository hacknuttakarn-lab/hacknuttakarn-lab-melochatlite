"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/SiteProviders";
import { loadChatSnapshot, sendDirectText, type ChatCategory, type ChatRoom, type ChatSnapshot } from "@/components/chat/chatData";
import { invokeEdgeFunction, rpcRequest } from "@/lib/supabase/browser";
import { recordSocialPostShareWeb, type SocialFeedPost } from "./socialFeedWebData";
import styles from "./ShareSocialPostModal.module.css";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";

const EMPTY: ChatSnapshot = { rooms:{direct:[],trip:[],event:[],community:[]}, counts:{direct:0,trip:0,event:0,community:0}, totalUnread:0 };
const COPY = {
  th:{title:"แชร์โพสต์",copy:"คัดลอกลิงก์",device:"แชร์ไปแอปอื่น",message:"แชร์ไปข้อความ",copied:"คัดลอกลิงก์แล้ว",shared:"แชร์แล้ว",direct:"ข้อความ",trip:"ทริป",event:"อีเวนต์",community:"คอมมูนิตี้",back:"กลับ",loading:"กำลังโหลดแชท…",empty:"ยังไม่มีแชทในหมวดนี้",send:"ส่ง",sending:"กำลังส่ง…",failed:"แชร์ไม่สำเร็จ"},
  en:{title:"Share post",copy:"Copy link",device:"Share to another app",message:"Share to messages",copied:"Link copied",shared:"Shared",direct:"Messages",trip:"Trips",event:"Events",community:"Community",back:"Back",loading:"Loading chats…",empty:"No chats in this category",send:"Send",sending:"Sending…",failed:"Unable to share"},
  de:{title:"Beitrag teilen",copy:"Link kopieren",device:"Mit anderer App teilen",message:"In Nachrichten teilen",copied:"Link kopiert",shared:"Geteilt",direct:"Nachrichten",trip:"Reisen",event:"Events",community:"Community",back:"Zurück",loading:"Chats werden geladen…",empty:"Keine Chats",send:"Senden",sending:"Wird gesendet…",failed:"Teilen fehlgeschlagen"},
  zh:{title:"分享帖子",copy:"复制链接",device:"分享到其他应用",message:"分享到消息",copied:"链接已复制",shared:"已分享",direct:"消息",trip:"旅行",event:"活动",community:"社区",back:"返回",loading:"正在加载聊天…",empty:"暂无聊天",send:"发送",sending:"正在发送…",failed:"分享失败"},
  ja:{title:"投稿をシェア",copy:"リンクをコピー",device:"他のアプリに共有",message:"メッセージに共有",copied:"リンクをコピーしました",shared:"共有しました",direct:"メッセージ",trip:"Trip",event:"Event",community:"Community",back:"戻る",loading:"チャットを読み込み中…",empty:"チャットがありません",send:"送信",sending:"送信中…",failed:"共有できませんでした"},
  ko:{title:"게시물 공유",copy:"링크 복사",device:"다른 앱으로 공유",message:"메시지로 공유",copied:"링크 복사됨",shared:"공유됨",direct:"메시지",trip:"여행",event:"이벤트",community:"커뮤니티",back:"뒤로",loading:"채팅 불러오는 중…",empty:"채팅이 없습니다",send:"보내기",sending:"보내는 중…",failed:"공유 실패"},
} as const;

function missingRpc(error:string|null|undefined){const v=String(error||"").toLowerCase();return v.includes("could not find the function")||v.includes("pgrst202")||v.includes("schema cache")}
async function sendRoomText(category:Exclude<ChatCategory,"direct">,roomId:string,body:string,locale:string){
  const common={p_original_text:body,p_source_language:locale,p_translations:{[locale]:body},p_message_type:"text",p_media_path:null,p_latitude:null,p_longitude:null,p_location_label:null,p_sticker_code:null};
  let result;
  if(category==="trip") result=await rpcRequest<Record<string,unknown>|Record<string,unknown>[]>("send_trip_chat_message",{p_trip_id:roomId,...common});
  else if(category==="event") result=await rpcRequest<Record<string,unknown>|Record<string,unknown>[]>("send_event_chat_message",{p_event_id:roomId,...common});
  else { result=await rpcRequest<Record<string,unknown>|Record<string,unknown>[]>("send_community_message_v2",{p_community_id:roomId,...common}); if(result.error&&missingRpc(result.error)) result=await rpcRequest("send_community_message",{p_community_id:roomId,p_original_text:body,p_source_language:locale,p_translations:{[locale]:body}}); }
  if(result.error) throw new Error(result.error);
  const rows=Array.isArray(result.data)?result.data:result.data?[result.data]:[]; const messageId=String((rows[0] as any)?.id||"");
  void invokeEdgeFunction("notify-chat-message",{kind:category,entityId:roomId,messageId,preview:body.slice(0,180)}).catch(()=>undefined);
}

export default function ShareSocialPostModal({open,post,onClose,onShared}:{open:boolean;post:SocialFeedPost|null;onClose:()=>void;onShared?:(shareCount:number)=>void}){
  const {locale}=useLocale(); const copy=COPY[locale]??COPY.en;
  const [view,setView]=useState<"actions"|"chat">("actions"); const [snapshot,setSnapshot]=useState<ChatSnapshot>(EMPTY); const [category,setCategory]=useState<ChatCategory>("direct");
  const [loading,setLoading]=useState(false); const [sending,setSending]=useState(""); const [notice,setNotice]=useState(""); const [error,setError]=useState("");
  useEffect(()=>{if(!open)return;setView("actions");setNotice("");setError("");setSending("")},[open,post?.id]);
  useEffect(()=>{if(!open||view!=="chat")return;let active=true;setLoading(true);loadChatSnapshot().then(n=>{if(active)setSnapshot(n)}).catch(e=>{if(active)setError(e instanceof Error?e.message:copy.failed)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[open,view]);
  useEffect(()=>{if(!open)return;const prev=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=prev}},[open]);
  const url=useMemo(()=>!post||typeof window==="undefined"?"":`${window.location.origin}/feed?post=${encodeURIComponent(post.id)}`,[post,open]);
  const shareBody=useMemo(()=>{
    if(!post)return "";
    const activityUrl=!post.activityType||!post.activityId||typeof window==="undefined"
      ? ""
      : post.activityType==="trip"
        ? `${window.location.origin}/trips/${post.activityId}`
        : post.activityType==="event"
          ? `${window.location.origin}/events/${post.activityId}`
          : `${window.location.origin}/community/${post.activityId}`;
    const activityLabel=post.activityType==="trip"?"Melo Trip":post.activityType==="event"?"Melo Event":post.activityType==="community"?"Melo Community":"";
    return [post.authorName,post.title,post.body.replace(/\u200B/g,""),post.locationName?`⌖ ${post.locationName}`:"",activityLabel,post.activityTitle,post.activitySubtitle,activityUrl,url].filter(Boolean).join("\n");
  },[post,url]);
  async function counted(){if(!post)return;try{const count=await recordSocialPostShareWeb(post.id);onShared?.(count)}catch{}}
  async function copyLink(){if(!url)return;try{await navigator.clipboard.writeText(url);await counted();setNotice(copy.copied)}catch(e){setError(e instanceof Error?e.message:copy.failed)}}
  async function nativeShare(){if(!post||!url)return;try{const text=shareBody.split("\n").filter(line=>line!==url).join("\n");if(navigator.share)await navigator.share({title:post.title||post.authorName,text,url});else await navigator.clipboard.writeText(url);await counted();setNotice(copy.shared)}catch(e){if((e as Error)?.name!=="AbortError")setError(e instanceof Error?e.message:copy.failed)}}
  async function send(room:ChatRoom){if(!post||sending)return;const key=`${room.category}:${room.id}`;setSending(key);setError("");try{if(room.category==="direct")await sendDirectText(room.id,shareBody,locale);else await sendRoomText(room.category,room.id,shareBody,locale);await counted();setNotice(copy.shared);window.setTimeout(onClose,600)}catch(e){setError(e instanceof Error?e.message:copy.failed)}finally{setSending("")}}
  if(!open||!post)return null;
  const rooms=snapshot.rooms[category]; const tabs:ChatCategory[]=["direct","trip","event","community"]; const previewImage=post.images[0]?.url||"";
  return <div className={styles.backdrop} onMouseDown={onClose}><section className={styles.modal} onMouseDown={e=>e.stopPropagation()}>
    <header><div><strong>{copy.title}</strong><small>{post.title||post.authorName}</small></div><button type="button" onClick={onClose}>×</button></header>
    {view==="actions"?<div className={styles.actionsView}>
      <div className={styles.preview}>{previewImage?<span><img src={previewImage} alt=""/></span>:<VerifiedUserAvatar userId={post.authorId} name={post.authorName} src={post.authorPhotoUrl} country={post.authorCountry} className={styles.previewAuthorAvatar} shape="rounded" badgeSize={17} alt=""/>}<div><strong>{post.title||post.authorName}</strong><p>{post.body}</p></div></div>
      <button type="button" onClick={()=>setView("chat")}><span>💬</span><div><strong>{copy.message}</strong></div><em>›</em></button>
      <button type="button" onClick={()=>void copyLink()}><span>🔗</span><div><strong>{copy.copy}</strong></div><em>›</em></button>
      <button type="button" onClick={()=>void nativeShare()}><span>↗</span><div><strong>{copy.device}</strong></div><em>›</em></button>
    </div>:<><div className={styles.chatTop}><button type="button" onClick={()=>setView("actions")}>‹ {copy.back}</button></div><nav className={styles.tabs}>{tabs.map(item=><button type="button" key={item} className={category===item?styles.active:""} onClick={()=>setCategory(item)}>{copy[item]} <b>{snapshot.rooms[item].length}</b></button>)}</nav><div className={styles.rooms}>{loading?<div className={styles.state}>{copy.loading}</div>:rooms.length?rooms.map(room=>{const key=`${room.category}:${room.id}`;return <button type="button" className={styles.room} key={key} onClick={()=>void send(room)} disabled={Boolean(sending)}>{room.category === "direct" && room.userId && !room.businessId ? <VerifiedUserAvatar userId={room.userId} name={room.title} src={room.avatarUrl} country={room.country} nationality={room.nationality} className={styles.userRoomAvatar} shape="rounded" badgeSize={15} alt="" /> : <span>{room.avatarUrl?<img src={room.avatarUrl} alt=""/>:"💬"}</span>}<div><strong>{room.title}</strong><small>{room.subtitle||room.lastMessage}</small></div><em>{sending===key?copy.sending:copy.send}</em></button>}):<div className={styles.state}>{copy.empty}</div>}</div></>}
    {notice?<div className={styles.success}>{notice}</div>:null}{error?<div className={styles.error}>{error}</div>:null}
  </section></div>;
}

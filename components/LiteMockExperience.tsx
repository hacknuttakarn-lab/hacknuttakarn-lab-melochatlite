"use client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import styles from "./LiteMockExperience.module.css";
import { arrayOf, firstValue, loadOwnProfile, profileCoverUrl, profilePhotoUrl, updateOwnProfile, uploadProfileCoverWeb, uploadProfilePhotoWeb, type OwnProfileSnapshot } from "@/components/profile/profileWebData";
import SocialPostComposerModal from "@/components/feed/SocialPostComposerModal";
import { CommentsDrawer } from "@/components/feed/SocialFeedExperience";
import { deleteSocialPostWeb, loadSocialFeedWeb, toggleSocialPostLikeWeb, toggleSocialPostSaveWeb, type SocialFeedPost } from "@/components/feed/socialFeedWebData";
import { loadDatingProfileById, loadLoveSnapshot, setLoveLike, loadFollowedProfileIds, loadProfileSocialState, setProfileFollow, setProfilePass, type DatingProfileWeb } from "@/components/connect/connectData";
import { getCurrentUser, rpcRequest } from "@/lib/supabase/browser";

type Kind = "feed"|"chat"|"profile"|"love"|"connect"|"settings"|"premium";
type Person={id:string;name:string;age:number|null;country:string;photo:string;tags:string[];state:"incoming"|"outgoing"|"connected"};
const CURRENT_USER_PLACEHOLDER_ID="";
const EMPTY_PERSON:Person={id:"",name:"",age:null,country:"",photo:"",tags:[],state:"connected"};
const people:Person[]=[];
const postPhotos:string[]=[];
function PersonGrid({rows=people.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID),mode="plain",onChanged}:{rows?:Person[];mode?:"plain"|"incoming"|"connected";onChanged?:()=>void}){
 const [hidden,setHidden]=useState<string[]>([]);
 const [liked,setLiked]=useState<string[]>([]);
 const visible=rows.filter(p=>!hidden.includes(p.id));
 const openChat=(p:Person)=>window.dispatchEvent(new CustomEvent("melo-open-direct-chat",{detail:{userId:p.id,title:p.name,subtitle:[p.age,p.country].filter(value=>value!==null&&value!=="").join(" · "),avatarUrl:p.photo,country:p.country,nationality:p.country}}));
 const passIncoming=async(p:Person)=>{setHidden(v=>v.includes(p.id)?v:[...v,p.id]);try{await setProfilePass(p.id);window.dispatchEvent(new CustomEvent("melo-connect-updated"));onChanged?.()}catch(error){setHidden(v=>v.filter(id=>id!==p.id));console.error("Unable to pass profile",error)}};
 const likeIncoming=async(p:Person)=>{if(liked.includes(p.id))return;setLiked(v=>[...v,p.id]);try{await setLoveLike(p.id,true);window.dispatchEvent(new CustomEvent("melo-connect-updated"));onChanged?.()}catch(error){setLiked(v=>v.filter(id=>id!==p.id));console.error("Unable to like profile",error)}};
 return <div className={styles.people}>{visible.map(p=><article className={styles.person} key={p.id}><Link href={`/users/${p.id}`} className={styles.personLink}>{p.photo?<img src={p.photo} alt={p.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}{p.age != null ? `, ${p.age}` : ""}</strong><span>{p.country}</span><div className={styles.miniTags}>{p.tags.slice(0,2).map((t,index)=><em key={`${p.id}-${t}-${index}`}>#{t}</em>)}</div></div></Link>{mode!=="plain"?<div className={styles.connectCardActions}>{mode==="incoming"?<><button type="button" className={styles.connectPass} onClick={()=>void passIncoming(p)} aria-label="Not interested">×</button><button type="button" className={`${styles.connectLike} ${liked.includes(p.id)?styles.connectLikeActive:""}`} onClick={()=>void likeIncoming(p)} aria-label="Interested">♥</button></>:<button type="button" className={styles.connectChatButton} onClick={()=>openChat(p)} aria-label={`Chat with ${p.name}`} title="Chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 4.7-7.6A8.38 8.38 0 0 1 12.5 3h.5a8.48 8.48 0 0 1 8 8z"/></svg></button>}</div>:null}</article>)}</div>
}
export default function LiteMockExperience({kind}:{kind:Kind}){
 const searchParams = useSearchParams();
 const pathname = usePathname();
 const requestedTab = searchParams.get("tab");
 const profileId = pathname.startsWith("/users/") ? decodeURIComponent(pathname.split("/")[2] || "") : "";
 const [connectTab,setConnectTab]=useState<"incoming"|"outgoing"|"connected">(requestedTab === "incoming" || requestedTab === "outgoing" || requestedTab === "connected" ? requestedTab : "connected");
 const { locale } = useLocale();
 const [liveFeedPosts,setLiveFeedPosts]=useState<SocialFeedPost[]>([]);
 const [feedConnectPeople,setFeedConnectPeople]=useState<Person[]>([]);
 const [feedComposerOpen,setFeedComposerOpen]=useState(false);
 const [feedOwnAvatar,setFeedOwnAvatar]=useState("");
 const [feedOwnName,setFeedOwnName]=useState("");
 const [feedCommentsPost,setFeedCommentsPost]=useState<SocialFeedPost|null>(null);
 const [feedFollowingPeople,setFeedFollowingPeople]=useState<Person[]>([]);
 const [feedFilter,setFeedFilter]=useState<"all"|"matches"|"following"|"saved">("all");
 const [connectPeople,setConnectPeople]=useState<Person[]>([]);
 const [connectRefreshKey,setConnectRefreshKey]=useState(0);
 useEffect(()=>{
  if(kind!=="connect")return;
  let cancelled=false;
  const toPerson=(profile:DatingProfileWeb,state:Person["state"]):Person=>({id:profile.id,name:profile.name,age:profile.age??null,country:profile.nationality||profile.country||"",photo:profile.photoUrls[0]||"",tags:Array.from(new Set((profile.interests||profile.lifestyleTags||[]).filter(Boolean))),state});
  const loadConnect=async()=>{
   const user=await getCurrentUser();
   if(!user?.id){if(!cancelled)setConnectPeople([]);return}
   const snapshot=await loadLoveSnapshot(user.id);
   const outgoingProfiles=(await Promise.all(snapshot.likedIds.filter(id=>id&&id!==user.id).map(id=>loadDatingProfileById(id).catch(()=>null)))).filter((profile):profile is DatingProfileWeb=>Boolean(profile));
   const rows=[
    ...snapshot.likesYou.filter(profile=>profile.id!==user.id).map(profile=>toPerson(profile,"incoming")),
    ...outgoingProfiles.filter(profile=>profile.id!==user.id).map(profile=>toPerson(profile,"outgoing")),
    ...snapshot.matched.filter(profile=>profile.id!==user.id).map(profile=>toPerson(profile,"connected")),
   ].filter((item,index,all)=>all.findIndex(other=>other.id===item.id&&other.state===item.state)===index);
   if(!cancelled)setConnectPeople(rows);
  };
  void loadConnect().catch(error=>{console.error("Unable to load Connect",error);if(!cancelled)setConnectPeople([])});
  const refresh=()=>void loadConnect().catch(()=>{});
  window.addEventListener("melo-connect-updated",refresh);
  return()=>{cancelled=true;window.removeEventListener("melo-connect-updated",refresh)};
 },[kind,connectRefreshKey]);
 useEffect(()=>{
  if(kind!=="feed") return;
  let cancelled=false;
  const toPerson=(profile:DatingProfileWeb,state:Person["state"]):Person=>({id:profile.id,name:profile.name,age:profile.age??null,country:profile.nationality||profile.country||"",photo:profile.photoUrls[0]||"",tags:Array.from(new Set((profile.interests||[]).filter(Boolean))),state});
  const loadFeed=async()=>{
   const [rows,own,user]=await Promise.all([loadSocialFeedWeb({limit:30}),loadOwnProfile().catch(()=>null),getCurrentUser().catch(()=>null)]);
   const ownRows=own?.data?.userId?await loadSocialFeedWeb({authorId:own.data.userId,limit:30}).catch(()=>[]):[];
   const merged=[...ownRows,...rows].filter((post,index,all)=>all.findIndex(item=>item.id===post.id)===index).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
   if(!cancelled){setLiveFeedPosts(merged);setFeedOwnAvatar(own?.data?profilePhotoUrl(own.data.profile,0):"");setFeedOwnName(own?.data?String(firstValue(own.data.profile,["first_name","display_name"])||""):"");}
   if(user?.id){
    try{
     const snapshot=await loadLoveSnapshot(user.id);
     const incomingProfiles=snapshot.likesYou.length?snapshot.likesYou:snapshot.recommended.slice(0,7);
     if(!cancelled)setFeedConnectPeople([
      ...incomingProfiles.map(profile=>toPerson(profile,"incoming")),
      ...snapshot.matched.map(profile=>toPerson(profile,"connected")),
     ].filter((item,index,all)=>all.findIndex(other=>other.id===item.id&&other.state===item.state)===index));
     const followingIds=await loadFollowedProfileIds();
     const followingProfiles=(await Promise.all(followingIds.filter(id=>id&&id!==user.id).map(id=>loadDatingProfileById(id).catch(()=>null)))).filter((profile):profile is DatingProfileWeb=>Boolean(profile));
     if(!cancelled)setFeedFollowingPeople(followingProfiles.map(profile=>toPerson(profile,"outgoing")));
    }catch{if(!cancelled)setFeedConnectPeople([])}
   }
  };
  loadFeed().catch(()=>{if(!cancelled){setLiveFeedPosts([]);setFeedConnectPeople([])}});
  const refresh=()=>{loadFeed().catch(()=>{})};
  window.addEventListener("melo-social-post-updated",refresh);
  window.addEventListener("melo-connect-updated",refresh);
   window.addEventListener("melo-following-updated",refresh);
  return()=>{cancelled=true;window.removeEventListener("melo-social-post-updated",refresh);window.removeEventListener("melo-connect-updated",refresh);window.removeEventListener("melo-following-updated",refresh)};
 },[kind]);
 const connectCopy = ({
  th: { incoming: "สนใจคุณ", outgoing: "คุณสนใจ", connected: "แมตช์", matchedHint: "เมื่อสนใจกันทั้งสองฝ่าย จะสามารถเริ่มแชทได้", requestHint: "ดูสถานะความสนใจของคุณ" },
  en: { incoming: "Likes You", outgoing: "You Like", connected: "Matches", matchedHint: "When you both like each other, you can start chatting", requestHint: "View your connection status" },
  de: { incoming: "Mag dich", outgoing: "Du magst", connected: "Matches", matchedHint: "Wenn ihr euch beide mögt, könnt ihr miteinander chatten", requestHint: "Status deiner Verbindungen ansehen" },
 } as const)[locale === "th" || locale === "de" ? locale : "en"];
 const seeAll = locale === "th" ? "ดูทั้งหมด" : locale === "de" ? "Alle anzeigen" : "See all";
 const feedActionCopy=({
  th:{like:"ถูกใจ",comment:"ความคิดเห็น",save:"บันทึก",savedDone:"บันทึกแล้ว",comments:"ความคิดเห็น",commentPlaceholder:"เขียนความคิดเห็น...",send:"ส่ง",noComments:"ยังไม่มีความคิดเห็น"},
  en:{like:"Like",comment:"Comment",save:"Save",savedDone:"Saved",comments:"Comments",commentPlaceholder:"Write a comment...",send:"Send",noComments:"No comments yet"},
  de:{like:"Gefällt mir",comment:"Kommentar",save:"Speichern",savedDone:"Gespeichert",comments:"Kommentare",commentPlaceholder:"Kommentar schreiben...",send:"Senden",noComments:"Noch keine Kommentare"},
 } as const)[locale === "th" || locale === "de" ? locale : "en"];
 const toggleFeedLike=async(post:SocialFeedPost)=>{
  try{
   const result=await toggleSocialPostLikeWeb(post.id);
   setLiveFeedPosts(current=>current.map(item=>item.id===post.id?{...item,isLiked:result.isLiked,likeCount:result.likeCount}:item));
  }catch(error){console.error("Unable to toggle post like",error)}
 };
 const toggleFeedSave=async(post:SocialFeedPost)=>{
  try{
   const saved=await toggleSocialPostSaveWeb(post.id);
   setLiveFeedPosts(current=>current.map(item=>item.id===post.id?{...item,isSaved:saved}:item));
  }catch(error){console.error("Unable to toggle saved post",error)}
 };
 const settingsCopy=({
  th:{account:"บัญชี",email:"อีเมล",verification:"การยืนยันตัวตน",verified:"✓ ยืนยันแล้ว",preferences:"การตั้งค่าแอป",language:"ภาษา",theme:"ธีม",dark:"มืด",light:"สว่าง",translation:"การแปลแชท",enabled:"เปิดใช้งาน",notifications:"การแจ้งเตือน",messages:"ข้อความ",activity:"Connect และกิจกรรม",on:"เปิด"},
  en:{account:"Account",email:"Email",verification:"Verification",verified:"✓ Verified",preferences:"App preferences",language:"Language",theme:"Theme",dark:"Dark",light:"Light",translation:"Chat translation",enabled:"Enabled",notifications:"Notifications",messages:"Messages",activity:"Connect & activity",on:"On"},
  de:{account:"Konto",email:"E-Mail",verification:"Verifizierung",verified:"✓ Verifiziert",preferences:"App-Einstellungen",language:"Sprache",theme:"Design",dark:"Dunkel",light:"Hell",translation:"Chat-Übersetzung",enabled:"Aktiviert",notifications:"Benachrichtigungen",messages:"Nachrichten",activity:"Connect & Aktivität",on:"An"}
 } as const)[locale === "th" || locale === "de" ? locale : "en"];
 const title={feed:"Feed",chat:"Chat",profile:"Profile",love:"Discover",connect:"Connect",settings:"Settings",premium:"My Plan"}[kind];
 const matchedAuthorIds=new Set(feedConnectPeople.filter(p=>p.state==="connected").map(p=>p.id));
 const followingAuthorIds=new Set(feedFollowingPeople.map(p=>p.id));
 const visibleFeedPosts=liveFeedPosts.filter(post=>feedFilter==="all"?true:feedFilter==="matches"?matchedAuthorIds.has(post.authorId):feedFilter==="following"?followingAuthorIds.has(post.authorId):post.isSaved);
 const feedFilterCopy=locale==="th"?{all:"ทั้งหมด",matches:"แมตช์",following:"กำลังติดตาม",saved:"บันทึก"}:locale==="de"?{all:"Alle",matches:"Matches",following:"Folge ich",saved:"Gespeichert"}:{all:"All",matches:"Matches",following:"Following",saved:"Saved"};
 return <main className={styles.page}><Header/><section className={styles.shell}><div className={styles.head}><div><small>MELO CHAT LITE</small><h1>{title}</h1></div></div>
 {kind==="love"&&<PersonGrid rows={people.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID)}/>}
 {kind==="connect"&&<><div className={styles.tabs}><button className={connectTab==="incoming"?styles.active:""} onClick={()=>setConnectTab("incoming")}>{connectCopy.incoming}</button><button className={connectTab==="outgoing"?styles.active:""} onClick={()=>setConnectTab("outgoing")}>{connectCopy.outgoing}</button><button className={connectTab==="connected"?styles.active:""} onClick={()=>setConnectTab("connected")}>{connectCopy.connected}</button></div><p className={styles.tabHint}>{connectTab==="connected"?connectCopy.matchedHint:connectCopy.requestHint}</p><PersonGrid rows={connectPeople.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID&&p.state===connectTab)} mode={connectTab==="incoming"?"incoming":connectTab==="connected"?"connected":"plain"} onChanged={()=>setConnectRefreshKey(v=>v+1)}/></>}
 {kind==="feed"&&<div className={styles.feedLayout}>
  <div style={{display:"grid",gap:16,alignContent:"start"}}>
   <aside className={styles.feedPeoplePanel}><div className={styles.feedPeopleHead}><div><small>CONNECT</small><strong>{connectCopy.incoming}</strong></div><Link href="/connect?tab=incoming">{seeAll}</Link></div><div className={styles.feedPeopleList}>{feedConnectPeople.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID&&p.state==="incoming").slice(0,7).map(p=><Link href={`/users/${p.id}`} className={styles.feedPersonRow} key={p.id}>{p.photo?<img src={p.photo} alt={p.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}{p.age != null ? `, ${p.age}` : ""}</strong><span>{p.country}</span></div></Link>)}</div></aside>
   <aside className={styles.feedPeoplePanel}><div className={styles.feedPeopleHead}><div><small>CONNECT</small><strong>{connectCopy.connected}</strong></div><Link href="/connect?tab=connected">{seeAll}</Link></div><div className={styles.feedPeopleList}>{feedConnectPeople.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID&&p.state==="connected").slice(0,7).map(p=><button type="button" className={styles.feedPersonRow} key={p.id} onClick={()=>window.dispatchEvent(new CustomEvent("melo-open-direct-chat",{detail:{userId:p.id,title:p.name,subtitle:[p.age,p.country].filter(value=>value!==null&&value!=="").join(" · "),avatarUrl:p.photo,country:p.country,nationality:p.country}}))}>{p.photo?<img src={p.photo} alt={p.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}{p.age != null ? `, ${p.age}` : ""}</strong><span>{p.country}</span></div><em>💬</em></button>)}</div></aside>
  </div>
  <div className={styles.feed}>
   <button type="button" className={styles.profileComposerTrigger} onClick={()=>setFeedComposerOpen(true)} aria-label={locale==="th"?"สร้างโพสต์":locale==="de"?"Beitrag erstellen":"Create post"}>{feedOwnAvatar?<img src={feedOwnAvatar} alt={feedOwnName}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<span>{locale==="th"?"คุณกำลังคิดอะไรอยู่?":locale==="de"?"Was denkst du gerade?":"What’s on your mind?"}</span></button>
   <div role="tablist" aria-label="Feed filters" style={{display:"flex",alignItems:"center",gap:8,overflowX:"auto",padding:"2px 0 4px"}}>{([["all","▦"],["matches","♥"],["following","♙"],["saved","🔖"]] as const).map(([key,icon])=><button key={key} type="button" role="tab" aria-selected={feedFilter===key} onClick={()=>setFeedFilter(key)} style={{display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap",border:"0",borderBottom:feedFilter===key?"2px solid currentColor":"2px solid transparent",background:"transparent",color:"inherit",opacity:feedFilter===key?1:.68,padding:"8px 10px",font:"inherit",fontWeight:feedFilter===key?700:600,cursor:"pointer"}}><span aria-hidden="true">{icon}</span><span>{feedFilterCopy[key]}</span></button>)}</div>
   <SocialPostComposerModal open={feedComposerOpen} onClose={()=>setFeedComposerOpen(false)} onSaved={()=>{setFeedComposerOpen(false);window.dispatchEvent(new CustomEvent("melo-social-post-updated"))}}/>
   {feedCommentsPost?<CommentsDrawer post={feedCommentsPost} locale={locale} copy={feedActionCopy} onClose={()=>setFeedCommentsPost(null)} onCount={(count)=>setLiveFeedPosts(current=>current.map(item=>item.id===feedCommentsPost.id?{...item,commentCount:count}:item))}/>:null}
   {visibleFeedPosts.map(post=><article className={styles.post} key={`live-${post.id}`}><header><Link href={post.canManage?"/profile":`/users/${post.authorId}`}>{post.authorPhotoUrl?<img src={post.authorPhotoUrl} alt=""/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}</Link><div><strong>{post.authorName}{post.authorAge != null ? `, ${post.authorAge}` : ""}</strong><span>{new Intl.DateTimeFormat(locale==="th"?"th-TH":locale==="de"?"de-DE":"en-GB",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(post.createdAt))}</span></div></header>{post.title&&<strong className={styles.feedPostTitle}>{post.title}</strong>}{post.body.replace(/\u200B/g,"")&&<p>{post.body.replace(/\u200B/g,"")}</p>}{post.images.length>0&&<div className={`${styles.postGrid} ${styles[`postGrid${Math.min(post.images.length,4)}`]||""}`}>{post.images.slice(0,4).map((image,j)=>image.url?<img src={image.url} alt="" key={`${post.id}-${j}`}/>:null)}</div>}<footer><button type="button" onClick={()=>void toggleFeedLike(post)}>{post.isLiked?"♥":"♡"} {post.likeCount}</button><button type="button" onClick={()=>setFeedCommentsPost(post)}>◯ {post.commentCount}</button><button type="button" onClick={()=>void toggleFeedSave(post)}>{post.isSaved?"★":"☆"} {post.isSaved?feedActionCopy.savedDone:feedActionCopy.save}</button></footer></article>)}
  </div>
  <aside className={styles.feedPeoplePanel}><div className={styles.feedPeopleHead}><div><small>SOCIAL</small><strong>{feedFilterCopy.following}</strong></div></div><div className={styles.feedPeopleList}>{feedFollowingPeople.slice(0,7).map(p=><Link href={`/users/${p.id}`} className={styles.feedPersonRow} key={p.id}>{p.photo?<img src={p.photo} alt={p.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}{p.age != null ? `, ${p.age}` : ""}</strong><span>{p.country}</span></div><em aria-hidden="true">✓</em></Link>)}</div></aside>
 </div>}
 {kind==="chat"&&<div className={styles.chat}><aside>{people.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID&&p.state==="connected").map((p,i)=><div className={styles.chatRow} key={p.id}>{p.photo?<img src={p.photo} alt=""/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}</strong><span>{["See you tonight 😊","Nice to meet you"][i]}</span></div>{i===0&&<b>2</b>}</div>)}</aside><section className={styles.conversation}><h3>Mina · Online</h3><div className={styles.bubble}>Hi! Nice to meet you 😊</div><div className={`${styles.bubble} ${styles.mine}`}>Nice to meet you too! How was your day?</div><div className={styles.bubble}>Great! I just found a new coffee place ☕</div><label><input type="checkbox" defaultChecked/> Translation on</label></section></div>}
 {kind==="profile"&&<ProfileDemo personId={profileId}/>}
 {kind==="settings"&&<div className={styles.settings}><div className={styles.panel}><h3>{settingsCopy.account}</h3><p>{settingsCopy.email} <b>mina@example.com</b></p><p>{settingsCopy.verification} <b>{settingsCopy.verified}</b></p></div><div className={styles.panel}><h3>{settingsCopy.preferences}</h3><p>{settingsCopy.language} <b>{locale==="th"?"ไทย":locale==="de"?"Deutsch":"English"}</b></p><p>{settingsCopy.theme} <b>{settingsCopy.dark}</b></p><p>{settingsCopy.translation} <b>{settingsCopy.enabled}</b></p></div><div className={styles.panel}><h3>{settingsCopy.notifications}</h3><p>{settingsCopy.messages} <b>{settingsCopy.on}</b></p><p>{settingsCopy.activity} <b>{settingsCopy.on}</b></p></div></div>}
 {kind==="premium"&&<div className={styles.plans}><article><small>CURRENT PLAN</small><h2>Free</h2><p>Basic discovery</p><p>Basic translation</p><button>Current</button></article><article className={styles.featured}><small>POPULAR</small><h2>Premium</h2><p>More Connect actions</p><p>More translation quota</p><button>Choose Premium</button></article><article><small>PLUS</small><h2>Premium+</h2><p>Everything in Premium</p><p>Priority discovery</p><button>View plan</button></article></div>}
 </section></main>
}
export function ProfileDemo({personId=""}:{personId?:string}){
 const normalizedPersonId=personId;
 const basePerson=people.find(p=>p.id===normalizedPersonId)||EMPTY_PERSON;
 const [remotePerson,setRemotePerson]=useState<Person|null>(null);
 const [remoteProfile,setRemoteProfile]=useState<DatingProfileWeb|null>(null);
 const [interested,setInterested]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 const [followed,setFollowed]=useState(false);
 const [publicVerified,setPublicVerified]=useState(false);
 const [detailsExpanded,setDetailsExpanded]=useState(false);
 const { locale } = useLocale();
 const profileCopy = locale === "th" ? { seeAll: "ดูทั้งหมด", hide: "ซ่อนรายละเอียด" } : locale === "de" ? { seeAll: "Alle anzeigen", hide: "Details ausblenden" } : { seeAll: "See all", hide: "Hide details" };
 const [caption,setCaption]=useState("");
 const [composerImages,setComposerImages]=useState<string[]>([]);
 const [localPosts,setLocalPosts]=useState<{caption:string;images:string[]}[]>([]);
 const [realProfilePosts,setRealProfilePosts]=useState<SocialFeedPost[]>([]);
 const [editingPost,setEditingPost]=useState<SocialFeedPost|null>(null);
 const [postMenuId,setPostMenuId]=useState<string|null>(null);
 const [deletePostTarget,setDeletePostTarget]=useState<SocialFeedPost|null>(null);
 const [composerOpen,setComposerOpen]=useState(false);
 const isOwnProfile=!personId;
 const [ownSnapshot,setOwnSnapshot]=useState<OwnProfileSnapshot|null>(null);
 const person=useMemo<Person>(()=>{
  if(!isOwnProfile)return remotePerson||basePerson;
  if(!ownSnapshot)return basePerson;
  const profile=ownSnapshot.profile;
  const first=String(firstValue(profile,["first_name"])||"").trim();
  const last=String(firstValue(profile,["last_name"])||"").trim();
  const name=first||"Melo User";
  const country=String(firstValue(profile,["nationality","country"])||"");
  const lifestyleRaw=firstValue(profile,["lifestyle_preferences"]);
  const lifestyle=(lifestyleRaw&&typeof lifestyleRaw==="object"&&!Array.isArray(lifestyleRaw))?lifestyleRaw as Record<string,unknown>:{};
  const tags=Array.from(new Set(arrayOf(lifestyle.interests).filter(Boolean)));
  const dob=String(firstValue(profile,["date_of_birth"])||"");
  const birth=dob?new Date(`${dob}T00:00:00`):null;
  const now=new Date();
  let age=0;
  if(birth&&!Number.isNaN(birth.getTime())){age=now.getFullYear()-birth.getFullYear();const md=now.getMonth()-birth.getMonth();if(md<0||(md===0&&now.getDate()<birth.getDate()))age-=1;}
  return {...basePerson,id:ownSnapshot.userId,name,age:age>0?age:0,country,tags,photo:profilePhotoUrl(profile,0)||basePerson.photo};
 },[basePerson,isOwnProfile,ownSnapshot,remotePerson]);
 const lifestyleDetails=useMemo(()=>{
  if(!isOwnProfile){return {pets:remoteProfile?.pets||"",smoking:remoteProfile?.smoking||"",social:"",drinking:remoteProfile?.drinking||"",exercise:remoteProfile?.exercise||"",relationship:remoteProfile?.relationshipGoal||""};}
  const profile=ownSnapshot?.profile||{};
  const raw=firstValue(profile,["lifestyle_preferences"]);
  const life=(raw&&typeof raw==="object"&&!Array.isArray(raw))?raw as Record<string,unknown>:{};
  const show=(value:unknown)=>arrayOf(value).filter(Boolean).join(", ");
  const looking=arrayOf(firstValue(profile,["looking_for","relationship_type"]));
  const relationshipOptions=new Set(["ความสัมพันธ์จริงจัง","ความสัมพันธ์ระยะยาว","เพื่อน","Long-term relationship","Serious relationship","Friendship","Langfristige Beziehung","Ernste Beziehung","Freundschaft"]);
  return {pets:show(life.pet),smoking:show(life.smoke),social:show(life.social),drinking:show(life.drink),exercise:show(life.exercise),relationship:looking.filter(v=>relationshipOptions.has(v)).join(", ")||looking.join(", ")};
 },[isOwnProfile,ownSnapshot,remoteProfile]);
 const lifestyleCopy=locale==="th"?{title:"Lifestyle",pets:"สัตว์เลี้ยง",smoking:"การสูบบุหรี่",social:"บุคลิกทางสังคม",drinking:"การดื่ม",exercise:"การออกกำลังกาย",relationship:"กำลังมองหา",empty:"—"}:locale==="de"?{title:"Lifestyle",pets:"Haustiere",smoking:"Rauchen",social:"Sozialer Typ",drinking:"Alkohol",exercise:"Sport",relationship:"Gesuchte Beziehung",empty:"—"}:{title:"Lifestyle",pets:"Pets",smoking:"Smoking",social:"Social style",drinking:"Drinking",exercise:"Exercise",relationship:"Relationship sought",empty:"—"};
 const [profileAvatarUrl,setProfileAvatarUrl]=useState(basePerson.photo);
 const [profileCoverUrlState,setProfileCoverUrlState]=useState("");
 const [profileBio,setProfileBio]=useState("");
 const [bioEditing,setBioEditing]=useState(false);
 const [bioDraft,setBioDraft]=useState("");
 const [profileSaving,setProfileSaving]=useState("");
 const [profileEditMessage,setProfileEditMessage]=useState("");
 const [profileGalleryIndex,setProfileGalleryIndex]=useState(0);
 const profileGalleryRef=useRef<HTMLDivElement|null>(null);
 const profileGalleryPhotos=useMemo(()=>{
  if(isOwnProfile&&ownSnapshot){
   const paths=arrayOf(firstValue(ownSnapshot.profile,["photo_paths","photos"]));
   const urls=paths.map((_,index)=>profilePhotoUrl(ownSnapshot.profile,index)).filter(Boolean);
   if(profileAvatarUrl&&!urls.includes(profileAvatarUrl))urls.unshift(profileAvatarUrl);
   return urls.slice(0,7);
  }
  return [person.photo,...postPhotos].filter((url,index,all)=>url&&all.indexOf(url)===index).slice(0,7);
 },[isOwnProfile,ownSnapshot,profileAvatarUrl,person.photo]);
 useEffect(()=>{
  if(profileGalleryPhotos.length<2)return;
  const timer=window.setInterval(()=>setProfileGalleryIndex(current=>(current+1)%profileGalleryPhotos.length),4000);
  return()=>window.clearInterval(timer);
 },[profileGalleryPhotos.length]);
 useEffect(()=>{
  const node=profileGalleryRef.current;
  if(!node)return;
  const target=node.children.item(profileGalleryIndex) as HTMLElement|null;
  if(target)node.scrollTo({left:target.offsetLeft-node.offsetLeft,behavior:"smooth"});
 },[profileGalleryIndex]);
 const postActionCopy=locale==="th"?{more:"ตัวเลือกโพสต์",edit:"แก้ไข",del:"ลบ",deleteTitle:"ลบโพสต์",deleteMessage:"คุณต้องการลบโพสต์นี้หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้",cancel:"ยกเลิก",confirm:"ลบโพสต์"}:locale==="de"?{more:"Beitragsoptionen",edit:"Bearbeiten",del:"Löschen",deleteTitle:"Beitrag löschen",deleteMessage:"Möchtest du diesen Beitrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",cancel:"Abbrechen",confirm:"Beitrag löschen"}:{more:"Post options",edit:"Edit",del:"Delete",deleteTitle:"Delete post",deleteMessage:"Are you sure you want to delete this post? This action cannot be undone.",cancel:"Cancel",confirm:"Delete post"};
 const editCopy=locale==="th"?{cover:"แก้ไขรูปปก",photo:"แก้ไขรูปโปรไฟล์",about:"แก้ไข",save:"บันทึก",cancel:"ยกเลิก",saving:"กำลังบันทึก…",imageError:"ไม่สามารถอัปโหลดรูปภาพได้",saved:"บันทึกแล้ว"}:locale==="de"?{cover:"Titelbild ändern",photo:"Profilbild ändern",about:"Bearbeiten",save:"Speichern",cancel:"Abbrechen",saving:"Wird gespeichert…",imageError:"Bild konnte nicht hochgeladen werden",saved:"Gespeichert"}:{cover:"Edit cover",photo:"Edit profile photo",about:"Edit",save:"Save",cancel:"Cancel",saving:"Saving…",imageError:"Unable to upload image",saved:"Saved"};
 useEffect(()=>{
  if(isOwnProfile||!personId)return;
  let active=true;
  void loadDatingProfileById(personId).then(profile=>{
   if(!active||!profile)return;
   setRemoteProfile(profile);
   setRemotePerson({id:profile.id,name:profile.name,age:profile.age??null,country:profile.nationality||profile.country||"",photo:profile.photoUrls[0]||"",tags:Array.from(new Set((profile.lifestyleTags||[]).filter(Boolean))),state:"connected"});
   setProfileAvatarUrl(profile.photoUrls[0]||"");
   setProfileCoverUrlState(profile.coverUrl||"");
   void loadProfileSocialState(personId).then(state=>{if(active){setInterested(state.liked);setFollowed(state.followed);setDismissed(state.passed)}}).catch(()=>{});
   void rpcRequest<boolean>("get_public_identity_verification",{p_user_id:personId}).then(result=>{if(active)setPublicVerified(!result.error&&result.data===true)}).catch(()=>{if(active)setPublicVerified(false)});
  }).catch(()=>{});
  return()=>{active=false};
 },[isOwnProfile,personId]);
 useEffect(()=>{
  if(!isOwnProfile)return;
  void loadOwnProfile().then(result=>{
   if(!result.data)return;
   const snap=result.data; setOwnSnapshot(snap);
   const avatar=profilePhotoUrl(snap.profile,0); if(avatar)setProfileAvatarUrl(avatar);
   const cover=profileCoverUrl(snap.profile,snap.userMetadata); if(cover)setProfileCoverUrlState(cover);
   const bio=String(firstValue(snap.profile,["bio"])||""); if(bio){setProfileBio(bio);setBioDraft(bio)} else setBioDraft(profileBio);
  }).catch(()=>{});
 },[isOwnProfile]);
 useEffect(()=>{
  if(!isOwnProfile||!ownSnapshot?.userId)return;
  let active=true;
  void loadSocialFeedWeb({authorId:ownSnapshot.userId,limit:30}).then(rows=>{if(active)setRealProfilePosts(rows)}).catch(()=>{});
  return()=>{active=false};
 },[isOwnProfile,ownSnapshot?.userId]);
 const refreshOwnPosts=async()=>{if(!ownSnapshot?.userId)return;const rows=await loadSocialFeedWeb({authorId:ownSnapshot.userId,limit:30});setRealProfilePosts(rows)};
 const onInlineCover=async(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;if(file.size>12*1024*1024){setProfileEditMessage("Image must be no larger than 12 MB");return}setProfileSaving("cover");setProfileEditMessage("");try{const result=await uploadProfileCoverWeb(file);setProfileCoverUrlState(result.url);setProfileEditMessage(`✓ ${editCopy.saved}`)}catch{setProfileEditMessage(editCopy.imageError)}finally{setProfileSaving("")}};
 const onInlineAvatar=async(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value="";if(!file||!ownSnapshot)return;if(file.size>12*1024*1024){setProfileEditMessage("Image must be no larger than 12 MB");return}setProfileSaving("avatar");setProfileEditMessage("");try{const current=arrayOf(firstValue(ownSnapshot.profile,["photo_paths"]));const result=await uploadProfilePhotoWeb({file,slotIndex:0,currentPaths:current});setProfileAvatarUrl(result.url);setOwnSnapshot({...ownSnapshot,profile:{...ownSnapshot.profile,photo_paths:result.paths}});window.dispatchEvent(new CustomEvent("melo-profile-updated",{detail:{avatarUrl:result.url}}));setProfileEditMessage(`✓ ${editCopy.saved}`)}catch{setProfileEditMessage(editCopy.imageError)}finally{setProfileSaving("")}};
 const saveInlineBio=async()=>{if(!ownSnapshot)return;const next=bioDraft.trim();if(next.length<20){setProfileEditMessage(locale==="th"?"About me ต้องมีอย่างน้อย 20 ตัวอักษร":locale==="de"?"Über mich benötigt mindestens 20 Zeichen":"About me must contain at least 20 characters");return}setProfileSaving("bio");setProfileEditMessage("");const result=await updateOwnProfile(ownSnapshot.userId,{bio:next});if(result.error)setProfileEditMessage(result.error);else{setProfileBio(next);setBioEditing(false);setProfileEditMessage(`✓ ${editCopy.saved}`)}setProfileSaving("")};
 const addImages=(files:FileList|null)=>{
  if(!files)return;
  const remaining=Math.max(0,4-composerImages.length);
  const picked=Array.from(files).slice(0,remaining);
  picked.forEach(file=>{const reader=new FileReader();reader.onload=()=>setComposerImages(prev=>prev.length<4?[...prev,String(reader.result)]:prev);reader.readAsDataURL(file)});
 };
 const publish=()=>{if(!caption.trim()&&!composerImages.length)return;setLocalPosts(prev=>[{caption:caption.trim(),images:composerImages},...prev]);setCaption("");setComposerImages([]);setComposerOpen(false)};
 const closeComposer=()=>{setComposerOpen(false)};
 const dismissProfile=async()=>{if(isOwnProfile||!personId)return;setDismissed(true);setInterested(false);try{await setProfilePass(personId);window.dispatchEvent(new CustomEvent("melo-connect-updated"));}catch(error){setDismissed(false);console.error("Unable to pass profile",error)}};
 const toggleProfileInterested=async()=>{if(isOwnProfile||!personId)return;const next=!interested;setInterested(next);try{await setLoveLike(personId,next);window.dispatchEvent(new CustomEvent("melo-connect-updated"));}catch(error){setInterested(!next);console.error("Unable to update interested status",error)}};
 const toggleProfileFollow=async()=>{if(isOwnProfile||!personId)return;const nextFollowed=!followed;setFollowed(nextFollowed);try{await setProfileFollow(personId,nextFollowed);window.dispatchEvent(new CustomEvent("melo-following-updated"));}catch(error){setFollowed(!nextFollowed);console.error("Unable to update follow status",error)}};
  const renderImages=(images:string[])=><div className={`${styles.postGrid} ${styles[`postGrid${Math.min(images.length,4)}`]||""}`}>{images.slice(0,4).map((photo,j)=><img src={photo} alt="" key={j}/>)}</div>;
 return <div className={styles.profile}>
  <div className={styles.profileHero}>{profileCoverUrlState?<img className={styles.profileCoverImage} src={profileCoverUrlState} alt=""/>:null}<div className={styles.profileHeroShade}/>{isOwnProfile&&<label className={`${styles.inlineMediaEdit} ${styles.inlineCoverEdit}`}>{profileSaving==="cover"?editCopy.saving:editCopy.cover}<input type="file" accept="image/*" onChange={onInlineCover}/></label>}</div>
  <div className={styles.profileIdentityRow}><div className={styles.profileAvatarWrap}>{profileAvatarUrl?<img className={styles.profileAvatar} src={profileAvatarUrl} alt={person.name}/>:<span className={styles.profileAvatar} aria-hidden="true"/>}{isOwnProfile&&<label className={styles.inlineAvatarEdit} title={editCopy.photo}>✎<input type="file" accept="image/*" onChange={onInlineAvatar}/></label>}</div><div className={styles.profileIdentity}><h2>{person.name}{person.age != null ? `, ${person.age}` : ""}{(!isOwnProfile&&publicVerified)?" ✓":""}</h2><p>{person.country}</p></div>{!isOwnProfile?<div className={styles.profileActions}><button type="button" className={styles.profilePassCircle} aria-label="ไม่สนใจ" title="ไม่สนใจ" onClick={()=>void dismissProfile()}>×</button><button type="button" className={`${styles.profileFollowCircle} ${followed?styles.profileFollowActive:""}`} aria-label={followed?"Following":"Follow"} title={followed?"Following":"Follow"} onClick={()=>void toggleProfileFollow()}>{followed?"✓":"+"}</button><button type="button" className={`${styles.profileHeartCircle} ${interested?styles.profileHeartActive:""}`} aria-label="Connect" title="Connect" onClick={()=>void toggleProfileInterested()}>♥</button></div>:null}</div>
  {profileEditMessage&&isOwnProfile?<div className={styles.inlineEditMessage}>{profileEditMessage}</div>:null}
  {dismissed?<div className={styles.dismissNotice}>ซ่อนโปรไฟล์นี้จากคำแนะนำแล้ว</div>:null}
  <div className={styles.profileLayout}>
   <div className={styles.profileLeftColumn}>
    <aside className={`${styles.profileInfoCard} ${detailsExpanded ? styles.profileInfoExpanded : ""}`}><section className={styles.profileInfoSection}><div className={styles.aboutHeading}><h3>About me</h3>{isOwnProfile&&!bioEditing?<button type="button" onClick={()=>{setBioDraft(profileBio);setBioEditing(true)}}>{editCopy.about}</button>:null}</div>{bioEditing?<div className={styles.inlineBioEditor}><textarea maxLength={500} rows={6} value={bioDraft} onChange={e=>setBioDraft(e.target.value)}/><div><button type="button" onClick={()=>setBioEditing(false)}>{editCopy.cancel}</button><button type="button" className={styles.inlineBioSave} onClick={saveInlineBio} disabled={profileSaving==="bio"}>{profileSaving==="bio"?editCopy.saving:editCopy.save}</button></div></div>:<p className={styles.aboutText}>{profileBio}</p>}</section><div className={styles.profileExtraDetails}><div className={styles.profileDivider}/><dl className={styles.profileFacts}><div><dt>Age</dt><dd>{person.age}</dd></div><div><dt>Location</dt><dd>{person.country}</dd></div><div><dt>Country</dt><dd>{person.country}</dd></div></dl><div className={styles.profileDivider}/><section className={styles.profileInfoSection}><h3>Interests</h3><div className={styles.interestCloud}>{person.tags.map((t,index)=><span key={`${t}-${index}`}>#{t}</span>)}</div></section><div className={styles.profileDivider}/><section className={styles.profileInfoSection}><h3>{lifestyleCopy.title}</h3><dl className={styles.profileFacts}><div><dt>{lifestyleCopy.pets}</dt><dd>{lifestyleDetails.pets||lifestyleCopy.empty}</dd></div><div><dt>{lifestyleCopy.smoking}</dt><dd>{lifestyleDetails.smoking||lifestyleCopy.empty}</dd></div><div><dt>{lifestyleCopy.social}</dt><dd>{lifestyleDetails.social||lifestyleCopy.empty}</dd></div><div><dt>{lifestyleCopy.drinking}</dt><dd>{lifestyleDetails.drinking||lifestyleCopy.empty}</dd></div><div><dt>{lifestyleCopy.exercise}</dt><dd>{lifestyleDetails.exercise||lifestyleCopy.empty}</dd></div><div><dt>{lifestyleCopy.relationship}</dt><dd>{lifestyleDetails.relationship||lifestyleCopy.empty}</dd></div></dl></section></div><button type="button" className={styles.profileDetailsToggle} onClick={()=>setDetailsExpanded(v=>!v)} aria-expanded={detailsExpanded}>{detailsExpanded ? profileCopy.hide : profileCopy.seeAll}</button></aside>
    {profileGalleryPhotos.length>0?<section className={styles.profilePhotoGallery} aria-label={locale==="th"?"รูปโปรไฟล์เพิ่มเติม":locale==="de"?"Weitere Profilfotos":"More profile photos"}>
     <div className={styles.profilePhotoGalleryHead}><h3>{locale==="th"?"รูปภาพ":locale==="de"?"Fotos":"Photos"}</h3><span>{profileGalleryIndex+1}/{profileGalleryPhotos.length}</span></div>
     <div className={styles.profilePhotoCarousel} ref={profileGalleryRef}>{profileGalleryPhotos.map((url,index)=><button type="button" className={`${styles.profilePhotoSlide} ${index===profileGalleryIndex?styles.profilePhotoSlideActive:""}`} key={`${url}-${index}`} onClick={()=>setProfileGalleryIndex(index)} aria-label={`${index+1}/${profileGalleryPhotos.length}`}><img src={url} alt=""/></button>)}</div>
     <div className={styles.profilePhotoDots}>{profileGalleryPhotos.map((_,index)=><button type="button" key={index} className={index===profileGalleryIndex?styles.profilePhotoDotActive:""} onClick={()=>setProfileGalleryIndex(index)} aria-label={`${index+1}`}/>)}</div>
    </section>:null}
   </div>
   <section className={styles.profileContent}>
    <div className={styles.profileContentBar}><div><span className={styles.profileContentEyebrow}>PROFILE</span><h3>Posts</h3></div></div>
    <button type="button" className={styles.profileComposerTrigger} onClick={()=>setComposerOpen(true)} aria-label="สร้างโพสต์">
     {profileAvatarUrl?<img src={profileAvatarUrl} alt={person.name}/>:null}<span>คุณกำลังคิดอะไรอยู่?</span>
    </button>
    <SocialPostComposerModal open={composerOpen||Boolean(editingPost)} post={editingPost} onClose={()=>{setComposerOpen(false);setEditingPost(null)}} onSaved={async()=>{setComposerOpen(false);setEditingPost(null);await refreshOwnPosts()}}/>
     {realProfilePosts.map(post=><article className={`${styles.post} ${styles.profilePostCard}`} key={post.id}><header>{post.authorPhotoUrl||profileAvatarUrl?<img src={post.authorPhotoUrl||profileAvatarUrl} alt={post.authorName||person.name}/>:null}<div><strong>{post.authorName||person.name}</strong><span>{new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(post.createdAt))}</span></div>{isOwnProfile?<div className={styles.postActionsMenu}><button type="button" className={styles.postMoreButton} aria-label={postActionCopy.more} title={postActionCopy.more} aria-expanded={postMenuId===post.id} onClick={()=>setPostMenuId(current=>current===post.id?null:post.id)}>•••</button>{postMenuId===post.id?<div className={styles.postActionsDropdown}><button type="button" onClick={()=>{setPostMenuId(null);setEditingPost(post)}}><span>✎</span>{postActionCopy.edit}</button><button type="button" className={styles.postDeleteAction} onClick={()=>{setPostMenuId(null);setDeletePostTarget(post)}}><span>⌫</span>{postActionCopy.del}</button></div>:null}</div>:null}</header>{post.title&&<strong>{post.title}</strong>}{post.body.replace(/\u200B/g,"")&&<p>{post.body.replace(/\u200B/g,"")}</p>}{post.images.length>0&&renderImages(post.images.map(image=>image.url))}<footer><button>♡ {post.likeCount}</button><button>◯ {post.commentCount}</button><button>☆ Save</button></footer></article>)}
     {deletePostTarget?<div className={styles.themedDialogBackdrop} role="presentation" onMouseDown={()=>setDeletePostTarget(null)}><section className={styles.themedDialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-post-title" onMouseDown={event=>event.stopPropagation()}><div className={styles.themedDialogIcon}>!</div><h3 id="delete-post-title">{postActionCopy.deleteTitle}</h3><p>{postActionCopy.deleteMessage}</p><div className={styles.themedDialogActions}><button type="button" onClick={()=>setDeletePostTarget(null)}>{postActionCopy.cancel}</button><button type="button" className={styles.themedDialogDanger} onClick={async()=>{const target=deletePostTarget;setDeletePostTarget(null);await deleteSocialPostWeb(target.id);await refreshOwnPosts()}}>{postActionCopy.confirm}</button></div></section></div>:null}
     {localPosts.map((post,i)=><article className={`${styles.post} ${styles.profilePostCard}`} key={`local-${i}`}><header>{person.photo?<img src={person.photo} alt={person.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{person.name}</strong><span>เมื่อสักครู่</span></div></header>{post.caption&&<p>{post.caption}</p>}{post.images.length>0&&renderImages(post.images)}<footer><button>♡ 0</button><button>◯ 0</button><button>☆ Save</button></footer></article>)}
   </section>
  </div>
 </div>
}

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
import { boostSocialPostWeb, deleteSocialPostWeb, loadSocialFeedWeb, toggleSocialPostLikeWeb, toggleSocialPostSaveWeb, type SocialFeedPost } from "@/components/feed/socialFeedWebData";
import { loadDatingProfileById, loadLoveSnapshot, setLoveLike, loadFollowedProfileIds, loadProfileSocialState, setProfileFollow, setProfilePass, blockFriendWeb, type DatingProfileWeb } from "@/components/connect/connectData";
import { getCurrentUser, rpcRequest, restInsert, restSelect } from "@/lib/supabase/browser";

type Kind = "feed"|"chat"|"profile"|"love"|"connect"|"settings"|"premium";
type Person={id:string;name:string;age:number|null;country:string;photo:string;tags:string[];state:"incoming"|"outgoing"|"connected"};
const CURRENT_USER_PLACEHOLDER_ID="";
const EMPTY_PERSON:Person={id:"",name:"",age:null,country:"",photo:"",tags:[],state:"connected"};
const people:Person[]=[];
const postPhotos:string[]=[];
function PersonGrid({rows=people.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID),mode="plain",onChanged}:{rows?:Person[];mode?:"plain"|"incoming"|"connected";onChanged?:()=>void}){
 const [hidden,setHidden]=useState<string[]>([]);
 const [liked,setLiked]=useState<string[]>([]);
 const [visibleLimit,setVisibleLimit]=useState(15);
 const loadMoreRef=useRef<HTMLDivElement|null>(null);
 const visible=rows.filter(p=>!hidden.includes(p.id));
 const pagedVisible=visible.slice(0,visibleLimit);
 useEffect(()=>{setVisibleLimit(15)},[rows,mode]);
 useEffect(()=>{
  const node=loadMoreRef.current;
  if(!node||visibleLimit>=visible.length)return;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting))setVisibleLimit(current=>Math.min(current+15,visible.length));
  },{rootMargin:"240px 0px"});
  observer.observe(node);
  return()=>observer.disconnect();
 },[visibleLimit,visible.length]);
 const openChat=(p:Person)=>window.dispatchEvent(new CustomEvent("melo-open-direct-chat",{detail:{userId:p.id,title:p.name,subtitle:[p.age,p.country].filter(value=>value!==null&&value!=="").join(" · "),avatarUrl:p.photo,country:p.country,nationality:p.country}}));
 const passIncoming=async(p:Person)=>{setHidden(v=>v.includes(p.id)?v:[...v,p.id]);try{await setProfilePass(p.id);window.dispatchEvent(new CustomEvent("melo-connect-updated"));onChanged?.()}catch(error){setHidden(v=>v.filter(id=>id!==p.id));console.error("Unable to pass profile",error)}};
 const likeIncoming=async(p:Person)=>{if(liked.includes(p.id))return;setLiked(v=>[...v,p.id]);try{await setLoveLike(p.id,true);window.dispatchEvent(new CustomEvent("melo-connect-updated"));onChanged?.()}catch(error){setLiked(v=>v.filter(id=>id!==p.id));console.error("Unable to like profile",error)}};
 return <><div className={styles.people}>{pagedVisible.map(p=><article className={styles.person} key={p.id}><Link href={`/users/${p.id}`} className={styles.personLink}>{p.photo?<img src={p.photo} alt={p.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}{p.age != null ? `, ${p.age}` : ""}</strong><span>{p.country}</span><div className={styles.miniTags}>{p.tags.slice(0,2).map((t,index)=><em key={`${p.id}-${t}-${index}`}>#{t}</em>)}</div></div></Link>{mode!=="plain"?<div className={styles.connectCardActions}>{mode==="incoming"?<><button type="button" className={styles.connectPass} onClick={()=>void passIncoming(p)} aria-label="Not interested">×</button><button type="button" className={`${styles.connectLike} ${liked.includes(p.id)?styles.connectLikeActive:""}`} onClick={()=>void likeIncoming(p)} aria-label="Interested">♥</button></>:<button type="button" className={styles.connectChatButton} onClick={()=>openChat(p)} aria-label={`Chat with ${p.name}`} title="Chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 4.7-7.6A8.38 8.38 0 0 1 12.5 3h.5a8.48 8.48 0 0 1 8 8z"/></svg></button>}</div>:null}</article>)}</div>{visibleLimit<visible.length?<div ref={loadMoreRef} aria-hidden="true" style={{height:1}}/>:null}</>
}
export default function LiteMockExperience({kind}:{kind:Kind}){
 const searchParams = useSearchParams();
 const pathname = usePathname();
 const requestedTab = searchParams.get("tab");

 // MELO_FEED_NOTIFICATION_FOCUS_V1
 const requestedPostId = searchParams.get("post");
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
 const [feedViewerId,setFeedViewerId]=useState("");
 const [seenFeedIncomingIds,setSeenFeedIncomingIds]=useState<string[]>([]);
 const [seenFeedMatchIds,setSeenFeedMatchIds]=useState<string[]>([]);
 const [followingPopupOpen,setFollowingPopupOpen]=useState(false);
 const [followingSearch,setFollowingSearch]=useState("");
 const [followingVisibleLimit,setFollowingVisibleLimit]=useState(10);
 const [feedFilter,setFeedFilter]=useState<"all"|"matches"|"following"|"saved">("all");
 // MELO_POST_PAGINATION_V1
 const [feedPostLimit,setFeedPostLimit]=useState(10);
 const [connectPeople,setConnectPeople]=useState<Person[]>([]);
 const [premiumPlans,setPremiumPlans]=useState<Record<string,any>[]>([]);
 useEffect(()=>{if(kind!=="premium")return;let active=true;void restSelect<Record<string,any>[]>("subscription_plans","select=*&is_active=eq.true&order=sort_order.asc,price.asc").then(r=>{if(active&&!r.error&&Array.isArray(r.data))setPremiumPlans(r.data)});return()=>{active=false}},[kind]);
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

   /* MELO_BLOCK_VISIBILITY_V1 */
   const blockedResult=user?.id
    ?await rpcRequest<Array<{profile_id?:string}>>(
      "get_my_blocked_profile_ids"
     ).catch(()=>({data:[],error:null}))
    :{data:[],error:null};

   const blockedProfileIds=new Set(
    Array.isArray(blockedResult.data)
     ?blockedResult.data
       .map(row=>String(row?.profile_id||""))
       .filter(Boolean)
     :[]
   );

   const merged=[...ownRows,...rows]
    .filter(post=>{
     const authorId=String(
      (post as SocialFeedPost & {
       authorId?:string;
       userId?:string;
      }).authorId||
      (post as SocialFeedPost & {
       authorId?:string;
       userId?:string;
      }).userId||
      ""
     );

     return !authorId||
      !blockedProfileIds.has(authorId);
    })
    .filter(
     (post,index,all)=>
      all.findIndex(
       item=>item.id===post.id
      )===index
    )
    .sort(
     (a,b)=>
      new Date(b.createdAt).getTime()-
      new Date(a.createdAt).getTime()
    );
   if(!cancelled){setLiveFeedPosts(merged);setFeedOwnAvatar(own?.data?profilePhotoUrl(own.data.profile,0):"");setFeedOwnName(own?.data?String(firstValue(own.data.profile,["first_name","display_name"])||""):"");}
   if(user?.id){
    if(!cancelled){
     setFeedViewerId(user.id);
     try{setSeenFeedIncomingIds(JSON.parse(window.localStorage.getItem(`melo-feed-seen-likes-${user.id}`)||"[]"))}catch{setSeenFeedIncomingIds([])}
     try{setSeenFeedMatchIds(JSON.parse(window.localStorage.getItem(`melo-feed-seen-matches-${user.id}`)||"[]"))}catch{setSeenFeedMatchIds([])}
    }
    try{
     const snapshot=await loadLoveSnapshot(user.id);
     const incomingProfiles=snapshot.likesYou.slice(0,5);
     if(!cancelled)setFeedConnectPeople([
      ...incomingProfiles.map(profile=>toPerson(profile,"incoming")),
      ...snapshot.matched.map(profile=>toPerson(profile,"connected")),
     ].filter((item,index,all)=>all.findIndex(other=>other.id===item.id&&other.state===item.state)===index));
     const followingIds=await loadFollowedProfileIds();

     const visibleFollowingIds=followingIds.filter(
      id=>
       id&&
       id!==user.id&&
       !blockedProfileIds.has(String(id))
     );

     const followingProfiles=(
      await Promise.all(
       visibleFollowingIds.map(
        id=>loadDatingProfileById(id)
         .catch(()=>null)
       )
      )
     ).filter(
      (profile):profile is DatingProfileWeb=>
       Boolean(profile)
     );
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
 const pagedFeedPosts=visibleFeedPosts.slice(0,feedPostLimit);

 useEffect(()=>{
  setFeedPostLimit(10);
 },[feedFilter]);

 // If a notification points to a post beyond the first 10,
 // automatically reveal enough posts for the existing focus effect.
 useEffect(()=>{
  if(kind!=="feed"||!requestedPostId)return;

  const targetIndex=visibleFeedPosts.findIndex(
   post=>String(post.id)===String(requestedPostId)
  );

  if(targetIndex>=0&&targetIndex>=feedPostLimit){
   setFeedPostLimit(
    Math.ceil((targetIndex+1)/10)*10
   );
  }
 },[kind,requestedPostId,visibleFeedPosts,feedPostLimit]);

 const feedFilterCopy=locale==="th"?{all:"ทั้งหมด",matches:"แมตช์",following:"กำลังติดตาม",saved:"บันทึก"}:locale==="de"?{all:"Alle",matches:"Matches",following:"Folge ich",saved:"Gespeichert"}:{all:"All",matches:"Matches",following:"Following",saved:"Saved"};
 const followingPopupCopy=locale==="th"?{title:"กำลังติดตาม",search:"ค้นหาชื่อ...",empty:"ไม่พบรายชื่อ",loadMore:"แสดงเพิ่มเติม",close:"ปิด"}:locale==="de"?{title:"Folge ich",search:"Namen suchen...",empty:"Keine Personen gefunden",loadMore:"Mehr anzeigen",close:"Schließen"}:{title:"Following",search:"Search by name...",empty:"No people found",loadMore:"Show more",close:"Close"};
 const filteredFollowingPeople=feedFollowingPeople.filter(person=>person.name.toLocaleLowerCase().includes(followingSearch.trim().toLocaleLowerCase()));
 const visibleFollowingPeople=filteredFollowingPeople.slice(0,followingVisibleLimit);
 const openFollowingPopup=()=>{setFollowingSearch("");setFollowingVisibleLimit(10);setFollowingPopupOpen(true)};
 const markFeedPersonSeen=(state:"incoming"|"connected",id:string)=>{
  if(!feedViewerId||!id)return;
  if(state==="incoming"){
   setSeenFeedIncomingIds(current=>{const next=current.includes(id)?current:[...current,id];window.localStorage.setItem(`melo-feed-seen-likes-${feedViewerId}`,JSON.stringify(next));return next});
  }else{
   setSeenFeedMatchIds(current=>{const next=current.includes(id)?current:[...current,id];window.localStorage.setItem(`melo-feed-seen-matches-${feedViewerId}`,JSON.stringify(next));return next});
  }
 };

 // MELO_FEED_NOTIFICATION_FOCUS_V1
 useEffect(()=>{
  if(kind!=="feed"||!requestedPostId||liveFeedPosts.length===0)return;

  const timer=window.setTimeout(()=>{
   const target=document.getElementById(`feed-post-${requestedPostId}`);

   if(!target)return;

   target.scrollIntoView({
    behavior:"smooth",
    block:"center",
   });

   target.setAttribute("tabindex","-1");
   target.focus({preventScroll:true});
  },120);

  return()=>window.clearTimeout(timer);
 },[kind,requestedPostId,liveFeedPosts]);

 return <main className={styles.page}><Header/><section className={`${styles.shell} ${kind==="connect"?styles.connectShell:""}`}><div className={`${styles.head} ${kind==="connect"?styles.connectHead:""}`}><div>{kind!=="connect"?<small>MELO CHAT LITE</small>:null}<h1>{title}</h1></div></div>
 {kind==="love"&&<PersonGrid rows={people.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID)}/>}
 {kind==="connect"&&<div className={styles.connectContent}><div className={styles.tabs}><button className={connectTab==="incoming"?styles.active:""} onClick={()=>setConnectTab("incoming")}>{connectCopy.incoming}</button><button className={connectTab==="outgoing"?styles.active:""} onClick={()=>setConnectTab("outgoing")}>{connectCopy.outgoing}</button><button className={connectTab==="connected"?styles.active:""} onClick={()=>setConnectTab("connected")}>{connectCopy.connected}</button></div><p className={styles.tabHint}>{connectTab==="connected"?connectCopy.matchedHint:connectCopy.requestHint}</p><PersonGrid rows={connectPeople.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID&&p.state===connectTab)} mode={connectTab==="incoming"?"incoming":connectTab==="connected"?"connected":"plain"} onChanged={()=>setConnectRefreshKey(v=>v+1)}/></div>}
 {kind==="feed"&&<div className={styles.feedLayout}>
  <div className={styles.feedLeftPanels}>
   <aside className={styles.feedPeoplePanel}><div className={styles.feedPeopleHead}><div><small>CONNECT</small><strong>{connectCopy.incoming}</strong></div><Link href="/connect?tab=incoming">{seeAll}</Link></div><div className={styles.feedPeopleList}>{feedConnectPeople.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID&&p.state==="incoming").slice(0,5).map(p=><Link href={`/users/${p.id}`} className={styles.feedPersonRow} key={p.id} onClick={()=>markFeedPersonSeen("incoming",p.id)}>{p.photo?<img src={p.photo} alt={p.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}{p.age != null ? `, ${p.age}` : ""}</strong><span>{p.country}</span></div>{!seenFeedIncomingIds.includes(p.id)?<b className={styles.feedNewBadge}>New</b>:null}</Link>)}</div></aside>
   <aside className={styles.feedPeoplePanel}><div className={styles.feedPeopleHead}><div><small>CONNECT</small><strong>{connectCopy.connected}</strong></div><Link href="/connect?tab=connected">{seeAll}</Link></div><div className={styles.feedPeopleList}>{feedConnectPeople.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID&&p.state==="connected").slice(0,5).map(p=><button type="button" className={styles.feedPersonRow} key={p.id} onClick={()=>{markFeedPersonSeen("connected",p.id);window.dispatchEvent(new CustomEvent("melo-open-direct-chat",{detail:{userId:p.id,title:p.name,subtitle:[p.age,p.country].filter(value=>value!==null&&value!=="").join(" · "),avatarUrl:p.photo,country:p.country,nationality:p.country}}))}}>{p.photo?<img src={p.photo} alt={p.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}{p.age != null ? `, ${p.age}` : ""}</strong><span>{p.country}</span></div>{!seenFeedMatchIds.includes(p.id)?<b className={styles.feedNewBadge}>New</b>:null}</button>)}</div></aside>
  </div>
  <div className={styles.feed}>
   <button type="button" className={styles.profileComposerTrigger} onClick={()=>setFeedComposerOpen(true)} aria-label={locale==="th"?"สร้างโพสต์":locale==="de"?"Beitrag erstellen":"Create post"}>{feedOwnAvatar?<img src={feedOwnAvatar} alt={feedOwnName}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<span>{locale==="th"?"คุณกำลังคิดอะไรอยู่?":locale==="de"?"Was denkst du gerade?":"What’s on your mind?"}</span></button>
   <div role="tablist" aria-label="Feed filters" style={{display:"flex",alignItems:"center",gap:8,overflowX:"auto",padding:"2px 0 4px"}}>{([["all","▦"],["matches","♥"],["following","♙"],["saved","🔖"]] as const).map(([key,icon])=><button key={key} type="button" role="tab" aria-selected={feedFilter===key} onClick={()=>{setFeedFilter(key);setFeedPostLimit(10)}} style={{display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap",border:"0",borderBottom:feedFilter===key?"2px solid currentColor":"2px solid transparent",background:"transparent",color:"inherit",opacity:feedFilter===key?1:.68,padding:"8px 10px",font:"inherit",fontWeight:feedFilter===key?700:600,cursor:"pointer"}}><span aria-hidden="true">{icon}</span><span>{feedFilterCopy[key]}</span></button>)}</div>
   <SocialPostComposerModal open={feedComposerOpen} onClose={()=>setFeedComposerOpen(false)} onSaved={()=>{setFeedComposerOpen(false);window.dispatchEvent(new CustomEvent("melo-social-post-updated"))}}/>
   {feedCommentsPost?<CommentsDrawer post={feedCommentsPost} locale={locale} copy={feedActionCopy} onClose={()=>setFeedCommentsPost(null)} onCount={(count)=>setLiveFeedPosts(current=>current.map(item=>item.id===feedCommentsPost.id?{...item,commentCount:count}:item))}/>:null}
   {pagedFeedPosts.map(post=><article id={`feed-post-${post.id}`} className={styles.post} key={`live-${post.id}`}><header><Link href={post.canManage?"/profile":`/users/${post.authorId}`}>{post.authorPhotoUrl?<img src={post.authorPhotoUrl} alt=""/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}</Link><div><strong>{post.authorName}{post.authorAge != null ? `, ${post.authorAge}` : ""}</strong><span>{new Intl.DateTimeFormat(locale==="th"?"th-TH":locale==="de"?"de-DE":"en-GB",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(post.createdAt))}</span></div></header>{post.title&&<strong className={styles.feedPostTitle}>{post.title}</strong>}{post.body.replace(/\u200B/g,"")&&<p>{post.body.replace(/\u200B/g,"")}</p>}{post.images.length>0&&<div className={`${styles.postGrid} ${styles[`postGrid${Math.min(post.images.length,4)}`]||""}`}>{post.images.slice(0,4).map((image,j)=>image.url?<img src={image.url} alt="" key={`${post.id}-${j}`}/>:null)}</div>}<footer><button type="button" onClick={()=>void toggleFeedLike(post)}>{post.isLiked?"♥":"♡"} {post.likeCount}</button><button type="button" onClick={()=>setFeedCommentsPost(post)}>◯ {post.commentCount}</button><button type="button" onClick={()=>void toggleFeedSave(post)}>{post.isSaved?"★":"☆"} {post.isSaved?feedActionCopy.savedDone:feedActionCopy.save}</button></footer></article>)}
   {visibleFeedPosts.length>feedPostLimit?<div style={{display:"flex",justifyContent:"center",padding:"8px 0 18px"}}><button type="button" onClick={()=>setFeedPostLimit(current=>current+10)} style={{minWidth:160,border:"1px solid currentColor",borderRadius:999,background:"transparent",color:"inherit",padding:"10px 18px",font:"inherit",fontWeight:700,cursor:"pointer"}}>{locale==="th"?"ดูเพิ่มเติม":locale==="de"?"Mehr laden":"Load more"}</button></div>:null}
  </div>
  <aside className={`${styles.feedPeoplePanel} ${styles.followingPanel}`}><button type="button" className={styles.followingPanelHeadButton} onClick={openFollowingPopup} aria-label={followingPopupCopy.title}><div className={styles.feedPeopleHead}><div><small>SOCIAL</small><strong>{feedFilterCopy.following}</strong></div><span aria-hidden="true">›</span></div></button><div className={styles.feedPeopleList}>{feedFollowingPeople.slice(0,10).map(p=><Link href={`/users/${p.id}`} className={styles.feedPersonRow} key={p.id}>{p.photo?<img src={p.photo} alt={p.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}{p.age != null ? `, ${p.age}` : ""}</strong><span>{p.country}</span></div><em aria-hidden="true">✓</em></Link>)}</div></aside>
 </div>}
 {kind==="feed"&&followingPopupOpen?<div className={styles.followingModalBackdrop} role="presentation" onMouseDown={()=>setFollowingPopupOpen(false)}><section className={styles.followingModal} role="dialog" aria-modal="true" aria-label={followingPopupCopy.title} onMouseDown={event=>event.stopPropagation()}><header className={styles.followingModalHeader}><div><small>SOCIAL</small><h2>{followingPopupCopy.title}</h2></div><button type="button" onClick={()=>setFollowingPopupOpen(false)} aria-label={followingPopupCopy.close}>×</button></header><div className={styles.followingSearchWrap}><span aria-hidden="true">⌕</span><input type="search" value={followingSearch} onChange={event=>{setFollowingSearch(event.target.value);setFollowingVisibleLimit(10)}} placeholder={followingPopupCopy.search} autoFocus/></div><div className={styles.followingModalList}>{visibleFollowingPeople.map(p=><Link href={`/users/${p.id}`} className={styles.followingModalRow} key={p.id} onClick={()=>setFollowingPopupOpen(false)}>{p.photo?<img src={p.photo} alt={p.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}{p.age != null ? `, ${p.age}` : ""}</strong><span>{p.country}</span></div><em aria-hidden="true">✓</em></Link>)}{filteredFollowingPeople.length===0?<p className={styles.followingEmpty}>{followingPopupCopy.empty}</p>:null}</div>{followingVisibleLimit<filteredFollowingPeople.length?<footer className={styles.followingModalFooter}><button type="button" onClick={()=>setFollowingVisibleLimit(current=>current+10)}>{followingPopupCopy.loadMore}</button></footer>:null}</section></div>:null}
 {kind==="chat"&&<div className={styles.chat}><aside>{people.filter(p=>p.id!==CURRENT_USER_PLACEHOLDER_ID&&p.state==="connected").map((p,i)=><div className={styles.chatRow} key={p.id}>{p.photo?<img src={p.photo} alt=""/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{p.name}</strong><span>{["See you tonight 😊","Nice to meet you"][i]}</span></div>{i===0&&<b>2</b>}</div>)}</aside><section className={styles.conversation}><h3>Mina · Online</h3><div className={styles.bubble}>Hi! Nice to meet you 😊</div><div className={`${styles.bubble} ${styles.mine}`}>Nice to meet you too! How was your day?</div><div className={styles.bubble}>Great! I just found a new coffee place ☕</div><label><input type="checkbox" defaultChecked/> Translation on</label></section></div>}
 {kind==="profile"&&<ProfileDemo personId={profileId}/>}
 {kind==="settings"&&<div className={styles.settings}><div className={styles.panel}><h3>{settingsCopy.account}</h3><p>{settingsCopy.email} <b>mina@example.com</b></p><p>{settingsCopy.verification} <b>{settingsCopy.verified}</b></p></div><div className={styles.panel}><h3>{settingsCopy.preferences}</h3><p>{settingsCopy.language} <b>{locale==="th"?"ไทย":locale==="de"?"Deutsch":"English"}</b></p><p>{settingsCopy.theme} <b>{settingsCopy.dark}</b></p><p>{settingsCopy.translation} <b>{settingsCopy.enabled}</b></p></div><div className={styles.panel}><h3>{settingsCopy.notifications}</h3><p>{settingsCopy.messages} <b>{settingsCopy.on}</b></p><p>{settingsCopy.activity} <b>{settingsCopy.on}</b></p></div></div>}
 {kind==="premium"&&<div className={styles.plans}>{(premiumPlans.length?premiumPlans:[{code:"free",name:"Free",price:0,boosts_per_month:0,translation_quota:0},{code:"premium",name:"Premium",price:0,boosts_per_month:4,translation_quota:0},{code:"premium_plus",name:"Premium+",price:0,boosts_per_month:10,translation_quota:0}]).map((plan,index)=><article key={plan.code||index} className={plan.code==="premium"?styles.featured:undefined}><small>{plan.code==="free"?"CURRENT PLAN":plan.code==="premium"?"POPULAR":"PLAN"}</small><h2>{plan.name}</h2><p>{Number(plan.price)>0?`${Number(plan.price).toLocaleString()} THB / ${plan.duration_days||30} days`:"Free"}</p><p>{Number(plan.boosts_per_month)||0} boosts / month</p><p>{Number(plan.translation_quota)>0?`${Number(plan.translation_quota).toLocaleString()} translations`:"Translation quota by plan"}</p><button type="button" disabled={plan.code==="free"} onClick={()=>{if(plan.code!=="free")window.location.href=`/support/chat?plan=${encodeURIComponent(plan.name||plan.code)}`}}>{plan.code==="free"?"Current":"Choose plan"}</button></article>)}</div>}
 </section></main>
}
export function ProfileDemo({personId=""}:{personId?:string}){
 const normalizedPersonId=personId;
 const basePerson=people.find(p=>p.id===normalizedPersonId)||EMPTY_PERSON;
 const [remotePerson,setRemotePerson]=useState<Person|null>(null);
 const [remoteProfile,setRemoteProfile]=useState<DatingProfileWeb|null>(null);
 const [interested,setInterested]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 const [profileMatched,setProfileMatched]=useState(false); // MELO_MATCHED_PROFILE_BLOCK_V1
 const [profileBlocking,setProfileBlocking]=useState(false);
 const [profileConfirmAction,setProfileConfirmAction]=useState<"block"|"unmatch"|null>(null); // MELO_PROFILE_CONFIRM_MODAL_V1
 const [profileReportOpen,setProfileReportOpen]=useState(false);
 const [profileReportReason,setProfileReportReason]=useState("");
 const [profileReportDetails,setProfileReportDetails]=useState("");
 const [profileReportSending,setProfileReportSending]=useState(false);
 const [profileReportSent,setProfileReportSent]=useState(false);
 const [followed,setFollowed]=useState(false);
 const [publicVerified,setPublicVerified]=useState(false);
 const [detailsExpanded,setDetailsExpanded]=useState(false);
 const { locale } = useLocale();
 const profileCopy = locale === "th" ? { seeAll: "ดูทั้งหมด", hide: "ซ่อนรายละเอียด" } : locale === "de" ? { seeAll: "Alle anzeigen", hide: "Details ausblenden" } : { seeAll: "See all", hide: "Hide details" };
 const [caption,setCaption]=useState("");
 const [composerImages,setComposerImages]=useState<string[]>([]);
 const [localPosts,setLocalPosts]=useState<{caption:string;images:string[]}[]>([]);
 const [realProfilePosts,setRealProfilePosts]=useState<SocialFeedPost[]>([]);
 const [profilePostLimit,setProfilePostLimit]=useState(10);
 const [editingPost,setEditingPost]=useState<SocialFeedPost|null>(null);
 const [postMenuId,setPostMenuId]=useState<string|null>(null);
 const [deletePostTarget,setDeletePostTarget]=useState<SocialFeedPost|null>(null);
 const [boostBusyId,setBoostBusyId]=useState<string>("");
 const [boostNotice,setBoostNotice]=useState<{kind:"success"|"error";message:string}|null>(null);
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
  if(!isOwnProfile){return {pets:remoteProfile?.pets||"",smoking:remoteProfile?.smoking||"",social:remoteProfile?.socialStyle||"",drinking:remoteProfile?.drinking||"",exercise:remoteProfile?.exercise||"",relationship:remoteProfile?.relationshipGoal||""};}
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
 const postActionCopy=locale==="th"?{more:"ตัวเลือกโพสต์",boost:"บูทโพสต์",boosting:"กำลังบูท…",boostTitle:"บูทโพสต์สำเร็จ",boostSuccess:"โพสต์นี้ถูกย้ายกลับขึ้นด้านบนของ Feed แล้ว",boostErrorTitle:"บูทโพสต์ไม่สำเร็จ",boostError:"ไม่สามารถบูทโพสต์ได้ กรุณาลองอีกครั้ง",okay:"ตกลง",edit:"แก้ไข",del:"ลบ",deleteTitle:"ลบโพสต์",deleteMessage:"คุณต้องการลบโพสต์นี้หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้",cancel:"ยกเลิก",confirm:"ลบโพสต์"}:locale==="de"?{more:"Beitragsoptionen",boost:"Beitrag boosten",boosting:"Wird geboostet…",boostTitle:"Beitrag geboostet",boostSuccess:"Dieser Beitrag wurde wieder an den Anfang des Feeds verschoben.",boostErrorTitle:"Boost fehlgeschlagen",boostError:"Beitrag konnte nicht geboostet werden. Bitte versuche es erneut.",okay:"OK",edit:"Bearbeiten",del:"Löschen",deleteTitle:"Beitrag löschen",deleteMessage:"Möchtest du diesen Beitrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",cancel:"Abbrechen",confirm:"Beitrag löschen"}:{more:"Post options",boost:"Boost post",boosting:"Boosting…",boostTitle:"Post boosted",boostSuccess:"This post has been moved back to the top of the Feed.",boostErrorTitle:"Boost failed",boostError:"Unable to boost this post. Please try again.",okay:"OK",edit:"Edit",del:"Delete",deleteTitle:"Delete post",deleteMessage:"Are you sure you want to delete this post? This action cannot be undone.",cancel:"Cancel",confirm:"Delete post"};
 const editCopy=locale==="th"?{cover:"แก้ไขรูปปก",photo:"แก้ไขรูปโปรไฟล์",about:"แก้ไข",save:"บันทึก",cancel:"ยกเลิก",saving:"กำลังบันทึก…",imageError:"ไม่สามารถอัปโหลดรูปภาพได้",saved:"บันทึกแล้ว"}:locale==="de"?{cover:"Titelbild ändern",photo:"Profilbild ändern",about:"Bearbeiten",save:"Speichern",cancel:"Abbrechen",saving:"Wird gespeichert…",imageError:"Bild konnte nicht hochgeladen werden",saved:"Gespeichert"}:{cover:"Edit cover",photo:"Edit profile photo",about:"Edit",save:"Save",cancel:"Cancel",saving:"Saving…",imageError:"Unable to upload image",saved:"Saved"};
 useEffect(()=>{
  if(isOwnProfile||!personId)return;

  let active=true;

  const loadPublicProfile=async()=>{
   try{
    const blockedResult=
     await rpcRequest<Array<{profile_id?:string}>>(
      "get_my_blocked_profile_ids"
     );

    if(!active)return;

    const isBlocked=
     !blockedResult.error&&
     Array.isArray(blockedResult.data)&&
     blockedResult.data.some(
      row=>
       String(row?.profile_id||"")===
       String(personId)
     );

    if(isBlocked){
     setRemoteProfile(null);
     setRemotePerson(null);
     setProfileAvatarUrl("");
     setProfileCoverUrlState("");

     window.location.replace("/connect");
     return;
    }

    const profile=
     await loadDatingProfileById(personId);

    if(!active||!profile)return;
   setRemoteProfile(profile);
   setRemotePerson({id:profile.id,name:profile.name,age:profile.age??null,country:profile.nationality||profile.country||"",photo:profile.photoUrls[0]||"",tags:Array.from(new Set((profile.lifestyleTags||[]).filter(Boolean))),state:"connected"});
   setProfileAvatarUrl(profile.photoUrls[0]||"");
   setProfileCoverUrlState(profile.coverUrl||"");
   void loadProfileSocialState(personId).then(state=>{if(active){setInterested(state.liked);setFollowed(state.followed);setDismissed(state.passed)}}).catch(()=>{});
   void rpcRequest<boolean>("get_public_identity_verification",{p_user_id:personId}).then(result=>{if(active)setPublicVerified(!result.error&&result.data===true)}).catch(()=>{if(active)setPublicVerified(false)});
   }catch(error){
    console.error(
     "Unable to load public profile",
     error
    );
   }
  };

  void loadPublicProfile();

  return()=>{
   active=false;
  };
 },[isOwnProfile,personId]);

 useEffect(()=>{
  if(isOwnProfile||!personId){
   setProfileMatched(false);
   return;
  }

  let active=true;

  const refreshProfileMatch=async()=>{
   try{
    const user=await getCurrentUser();

    if(!user?.id){
     if(active)setProfileMatched(false);
     return;
    }

    const snapshot=await loadLoveSnapshot(user.id);

    if(!active)return;

    const matched=snapshot.matched.some(
     profile=>String(profile.id)===String(personId)
    );

    setProfileMatched(matched);

    console.info(
     "[Melo Profile Match]",
     {
      personId,
      matched,
      matchedIds:snapshot.matched.map(profile=>profile.id),
     }
    );
   }catch(error){
    console.error(
     "Unable to determine profile match status",
     error
    );

    if(active)setProfileMatched(false);
   }
  };

  void refreshProfileMatch();

  const refresh=()=>{
   void refreshProfileMatch();
  };

  window.addEventListener(
   "melo-connect-updated",
   refresh
  );

  return()=>{
   active=false;

   window.removeEventListener(
    "melo-connect-updated",
    refresh
   );
  };
 },[isOwnProfile,personId]);

 useEffect(()=>{
  if(!isOwnProfile)return;
  void loadOwnProfile().then(result=>{
   if(!result.data)return;
   const snap=result.data; setOwnSnapshot(snap);
   const verification=snap.verification||{};
   const locallyApproved=Boolean((verification as Record<string,unknown>).is_verified) || String((verification as Record<string,unknown>).status||"").toLowerCase()==="approved";
   setPublicVerified(locallyApproved);
   void rpcRequest<boolean>("get_public_identity_verification",{p_user_id:snap.userId}).then(result=>{if(!result.error)setPublicVerified(result.data===true)}).catch(()=>{});
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
 const pagedProfilePosts=realProfilePosts.slice(0,profilePostLimit);

 // Preserve exact-post notification navigation.
 // Expand by blocks of 10 when the requested post is deeper in the profile.
 useEffect(()=>{
  if(typeof window==="undefined"||realProfilePosts.length===0)return;

  const postId=new URLSearchParams(window.location.search).get("post");

  if(!postId)return;

  const targetIndex=realProfilePosts.findIndex(
   post=>String(post.id)===String(postId)
  );

  if(targetIndex>=0&&targetIndex>=profilePostLimit){
   setProfilePostLimit(
    Math.ceil((targetIndex+1)/10)*10
   );
  }
 },[realProfilePosts,profilePostLimit]);

 // MELO_PROFILE_POST_FOCUS_V3
 useEffect(()=>{
  if(typeof window==="undefined"||realProfilePosts.length===0)return;

  const postId=new URLSearchParams(window.location.search).get("post");

  if(!postId)return;

  const timer=window.setTimeout(()=>{
   const target=document.getElementById(`profile-post-${postId}`);

   if(!target)return;

   target.scrollIntoView({
    behavior:"smooth",
    block:"center",
   });

   target.setAttribute("tabindex","-1");
   target.focus({preventScroll:true});
  },120);

  return()=>window.clearTimeout(timer);
 },[realProfilePosts]);
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
 const blockMatchedProfile=async()=>{
  if(isOwnProfile||!personId||!profileMatched||profileBlocking)return;

  setProfileBlocking(true);

  try{
   await blockFriendWeb(personId);

   setProfileMatched(false);
   setProfileConfirmAction(null);

   window.dispatchEvent(
    new CustomEvent("melo-connect-updated")
   );

   window.dispatchEvent(
    new CustomEvent("melo-chat-updated")
   );

   if(typeof window!=="undefined"){
    window.location.href="/connect?tab=connected";
   }
  }catch(error){
   console.error("Unable to block matched profile",error);

   window.alert(
    locale==="th"
     ? "ไม่สามารถบล็อกผู้ใช้นี้ได้ กรุณาลองอีกครั้ง"
     : locale==="de"
       ? "Dieser Benutzer konnte nicht blockiert werden. Bitte versuche es erneut."
       : "Unable to block this user. Please try again."
   );
  }finally{
   setProfileBlocking(false);
  }
 };
 /* MELO_PROFILE_UNMATCH_CONFIRM_V1 */
const toggleProfileInterested=async()=>{
 if(isOwnProfile||!personId)return;

 /*
  * ถ้า Match กันแล้ว:
  * การกด Heart = ขอ Unmatch
  */
 if(profileMatched){
  setProfileConfirmAction("unmatch");
  return;
 }

 const next=!interested;

 setInterested(next);

 try{

  await setLoveLike(
   personId,
   next
  );

  window.dispatchEvent(
   new CustomEvent("melo-connect-updated")
  );

 }catch(error){

  setInterested(!next);

  console.error(
   "Unable to update interested status",
   error
  );
 }
};
  const confirmProfileUnmatch=async()=>{
  if(isOwnProfile||!personId||!profileMatched)return;

  try{
   await setLoveLike(personId,false);

   setInterested(false);
   setProfileMatched(false);
   setProfileConfirmAction(null);

   window.dispatchEvent(
    new CustomEvent("melo-connect-updated")
   );
  }catch(error){
   console.error(
    "Unable to unmatch profile",
    error
   );

   window.alert(
    locale==="th"
     ?"ไม่สามารถยกเลิก Matches ได้ กรุณาลองอีกครั้ง"
     :locale==="de"
       ?"Das Match konnte nicht aufgehoben werden. Bitte versuche es erneut."
       :"Unable to unmatch. Please try again."
   );
  }
 };
const toggleProfileFollow=async()=>{if(isOwnProfile||!personId)return;const nextFollowed=!followed;setFollowed(nextFollowed);try{await setProfileFollow(personId,nextFollowed);window.dispatchEvent(new CustomEvent("melo-following-updated"));}catch(error){setFollowed(!nextFollowed);console.error("Unable to update follow status",error)}};
 const reportReasons=locale==="th"?["สแปมหรือการโฆษณาที่ไม่พึงประสงค์","ใช้ตัวตนปลอมหรือแอบอ้างเป็นบุคคลอื่น","การกลั่นแกล้ง คุกคาม หรือพฤติกรรมไม่เหมาะสม","เนื้อหาทางเพศหรือเนื้อหาสำหรับผู้ใหญ่","การหลอกลวง ฉ้อโกง หรือขอเงิน","ความรุนแรง การข่มขู่ หรือการทำร้ายตนเอง","บุคคลอายุต่ำกว่า 20 ปี","อื่นๆ"]:locale==="de"?["Spam oder unerwünschte Werbung","Falsche Identität oder Identitätsmissbrauch","Belästigung, Mobbing oder unangemessenes Verhalten","Sexuelle oder nicht jugendfreie Inhalte","Betrug, Täuschung oder Geldforderungen","Gewalt, Drohungen oder Selbstverletzung","Person unter 20 Jahren","Sonstiges"]:["Spam or unwanted advertising","Fake identity or impersonation","Harassment, bullying or inappropriate behavior","Sexual or adult content","Scam, fraud or asking for money","Violence, threats or self-harm","Person under 20 years old","Other"];
 const submitProfileReport=async()=>{if(isOwnProfile||!personId||!profileReportReason||profileReportSending)return;setProfileReportSending(true);try{const user=await getCurrentUser();if(!user?.id)throw new Error("Please sign in first");const result=await restInsert("user_reports",{reporter_user_id:user.id,reported_user_id:personId,report_type:"profile",reason:profileReportReason,details:profileReportDetails.trim()||null,status:"new"});if(result.error)throw new Error(result.error);setProfileReportSent(true);setProfileReportReason("");setProfileReportDetails("");}catch(error){console.error("Unable to report profile",error);window.alert(locale==="th"?"ไม่สามารถส่งรายงานได้ กรุณาลองอีกครั้ง":locale==="de"?"Meldung konnte nicht gesendet werden. Bitte erneut versuchen.":"Unable to submit report. Please try again.");}finally{setProfileReportSending(false)}};
 const boostProfilePost=async(post:SocialFeedPost)=>{if(boostBusyId)return;setPostMenuId(null);setBoostBusyId(post.id);try{await boostSocialPostWeb(post.id);setRealProfilePosts(current=>{const target=current.find(item=>item.id===post.id);if(!target)return current;return [{...target,boostedAt:new Date().toISOString()},...current.filter(item=>item.id!==post.id)]});await refreshOwnPosts();window.dispatchEvent(new CustomEvent("melo-feed-updated"));setBoostNotice({kind:"success",message:postActionCopy.boostSuccess});}catch(error){console.error("Unable to boost post",error);setBoostNotice({kind:"error",message:postActionCopy.boostError});}finally{setBoostBusyId("")}};
  const renderImages=(images:string[])=><div className={`${styles.postGrid} ${styles[`postGrid${Math.min(images.length,4)}`]||""}`}>{images.slice(0,4).map((photo,j)=><img src={photo} alt="" key={j}/>)}</div>;
 return <div className={styles.profile}>
  <div className={styles.profileHero}>{profileCoverUrlState?<img className={styles.profileCoverImage} src={profileCoverUrlState} alt=""/>:null}<div className={styles.profileHeroShade}/>{isOwnProfile&&<label className={`${styles.inlineMediaEdit} ${styles.inlineCoverEdit}`}>{profileSaving==="cover"?editCopy.saving:editCopy.cover}<input type="file" accept="image/*" onChange={onInlineCover}/></label>}{!isOwnProfile?<button type="button" className={styles.profileReportMenuButton} onClick={()=>{setProfileReportSent(false);setProfileReportOpen(true)}} aria-label={locale==="th"?"รายงานโปรไฟล์":locale==="de"?"Profil melden":"Report profile"} title={locale==="th"?"รายงานโปรไฟล์":locale==="de"?"Profil melden":"Report profile"}>⋮</button>:null}</div>
  <div className={styles.profileIdentityRow}><div className={styles.profileAvatarWrap}>{profileAvatarUrl?<img className={styles.profileAvatar} src={profileAvatarUrl} alt={person.name}/>:<span className={styles.profileAvatar} aria-hidden="true"/>}{isOwnProfile&&<label className={styles.inlineAvatarEdit} title={editCopy.photo}>✎<input type="file" accept="image/*" onChange={onInlineAvatar}/></label>}</div><div className={styles.profileIdentity}><h2>{person.name}{person.age != null ? `, ${person.age}` : ""}{publicVerified?" ✓":""}</h2><p>{person.country}</p></div>{!isOwnProfile?<div className={styles.profileActions}>{/* MELO_MATCHED_BLOCK_BUTTON_V3 */}
{profileMatched?(
 <button
  type="button"
  className={styles.profilePassCircle}
  aria-label={locale==="th"?"บล็อก":locale==="de"?"Blockieren":"Block"}
  title={locale==="th"?"บล็อก":locale==="de"?"Blockieren":"Block"}
  onClick={()=>setProfileConfirmAction("block")}
  disabled={profileBlocking}
 >
  {profileBlocking?"…":"⊘"}
 </button>
):(
 <button
  type="button"
  className={styles.profilePassCircle}
  aria-label={locale==="th"?"ไม่สนใจ":locale==="de"?"Kein Interesse":"Not interested"}
  title={locale==="th"?"ไม่สนใจ":locale==="de"?"Kein Interesse":"Not interested"}
  onClick={()=>void dismissProfile()}
 >
  ×
 </button>
)}<button type="button" className={`${styles.profileFollowCircle} ${followed?styles.profileFollowActive:""}`} aria-label={followed?"Following":"Follow"} title={followed?"Following":"Follow"} onClick={()=>void toggleProfileFollow()}>{followed?"✓":"+"}</button>{profileMatched?<button type="button" className={styles.profileChatCircle} aria-label={locale==="th"?"แชท":locale==="de"?"Chat":"Chat"} title={locale==="th"?"แชท":locale==="de"?"Chat":"Chat"} onClick={()=>{window.dispatchEvent(new CustomEvent("melo-open-direct-chat",{detail:{userId:personId,title:person.name,subtitle:[person.age,person.country].filter(value=>value!==null&&value!=="").join(" · "),avatarUrl:person.photo,country:person.country,nationality:person.country}}))}}>💬</button>:<button type="button" className={`${styles.profileHeartCircle} ${interested?styles.profileHeartInterested:""}`} aria-label="Connect" title="Connect" onClick={()=>void toggleProfileInterested()}>♥</button>}</div>:null}</div>
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
     {pagedProfilePosts.map(post=><article id={`profile-post-${post.id}`} className={`${styles.post} ${styles.profilePostCard}`} key={post.id}><header>{post.authorPhotoUrl||profileAvatarUrl?<img src={post.authorPhotoUrl||profileAvatarUrl} alt={post.authorName||person.name}/>:null}<div><strong>{post.authorName||person.name}</strong><span>{new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(post.createdAt))}</span></div>{isOwnProfile?<div className={styles.postActionsMenu}><button type="button" className={styles.postMoreButton} aria-label={postActionCopy.more} title={postActionCopy.more} aria-expanded={postMenuId===post.id} onClick={()=>setPostMenuId(current=>current===post.id?null:post.id)}>•••</button>{postMenuId===post.id?<div className={styles.postActionsDropdown}><button type="button" className={styles.postBoostAction} disabled={boostBusyId===post.id} onClick={()=>void boostProfilePost(post)}><span>↟</span>{boostBusyId===post.id?postActionCopy.boosting:postActionCopy.boost}</button><button type="button" onClick={()=>{setPostMenuId(null);setEditingPost(post)}}><span>✎</span>{postActionCopy.edit}</button><button type="button" className={styles.postDeleteAction} onClick={()=>{setPostMenuId(null);setDeletePostTarget(post)}}><span>⌫</span>{postActionCopy.del}</button></div>:null}</div>:null}</header>{post.title&&<strong>{post.title}</strong>}{post.body.replace(/\u200B/g,"")&&<p>{post.body.replace(/\u200B/g,"")}</p>}{post.images.length>0&&renderImages(post.images.map(image=>image.url))}<footer><button>♡ {post.likeCount}</button><button>◯ {post.commentCount}</button><button>☆ Save</button></footer></article>)}
     {realProfilePosts.length>profilePostLimit?<div style={{display:"flex",justifyContent:"center",padding:"8px 0 18px"}}><button type="button" onClick={()=>setProfilePostLimit(current=>current+10)} style={{minWidth:160,border:"1px solid currentColor",borderRadius:999,background:"transparent",color:"inherit",padding:"10px 18px",font:"inherit",fontWeight:700,cursor:"pointer"}}>{locale==="th"?"ดูเพิ่มเติม":locale==="de"?"Mehr laden":"Load more"}</button></div>:null}
     {deletePostTarget?<div className={styles.themedDialogBackdrop} role="presentation" onMouseDown={()=>setDeletePostTarget(null)}><section className={styles.themedDialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-post-title" onMouseDown={event=>event.stopPropagation()}><div className={styles.themedDialogIcon}>!</div><h3 id="delete-post-title">{postActionCopy.deleteTitle}</h3><p>{postActionCopy.deleteMessage}</p><div className={styles.themedDialogActions}><button type="button" onClick={()=>setDeletePostTarget(null)}>{postActionCopy.cancel}</button><button type="button" className={styles.themedDialogDanger} onClick={async()=>{const target=deletePostTarget;setDeletePostTarget(null);await deleteSocialPostWeb(target.id);await refreshOwnPosts()}}>{postActionCopy.confirm}</button></div></section></div>:null}
     {boostNotice?<div className={styles.themedDialogBackdrop} role="presentation" onMouseDown={()=>setBoostNotice(null)}><section className={styles.themedDialog} role="status" aria-modal="true" aria-labelledby="boost-post-title" onMouseDown={event=>event.stopPropagation()}><div className={`${styles.themedDialogIcon} ${boostNotice.kind==="success"?styles.boostDialogSuccess:styles.boostDialogError}`}>{boostNotice.kind==="success"?"↟":"!"}</div><h3 id="boost-post-title">{boostNotice.kind==="success"?postActionCopy.boostTitle:postActionCopy.boostErrorTitle}</h3><p>{boostNotice.message}</p><div className={styles.themedDialogActions}><button type="button" className={styles.themedDialogPrimary} onClick={()=>setBoostNotice(null)}>{postActionCopy.okay}</button></div></section></div>:null}
     {localPosts.map((post,i)=><article className={`${styles.post} ${styles.profilePostCard}`} key={`local-${i}`}><header>{person.photo?<img src={person.photo} alt={person.name}/>:<span className={styles.feedAvatarFallback} aria-hidden="true"/>}<div><strong>{person.name}</strong><span>เมื่อสักครู่</span></div></header>{post.caption&&<p>{post.caption}</p>}{post.images.length>0&&renderImages(post.images)}<footer><button>♡ 0</button><button>◯ 0</button><button>☆ Save</button></footer></article>)}
   </section>
  </div>

  {/* MELO_PROFILE_CONFIRM_MODAL_JSX_V2 */}
  {profileReportOpen&&!isOwnProfile?<div className={styles.profileReportBackdrop} onMouseDown={()=>{if(!profileReportSending)setProfileReportOpen(false)}}><section className={styles.profileReportModal} onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true"><div className={styles.profileReportHeader}><div><small>SAFETY</small><h2>{locale==="th"?"รายงานโปรไฟล์":locale==="de"?"Profil melden":"Report profile"}</h2></div><button type="button" onClick={()=>setProfileReportOpen(false)} disabled={profileReportSending} aria-label="Close">×</button></div>{profileReportSent?<div className={styles.profileReportSuccess}><b>{locale==="th"?"ส่งรายงานแล้ว":locale==="de"?"Meldung gesendet":"Report submitted"}</b><p>{locale==="th"?"ขอบคุณที่ช่วยดูแลชุมชน Melo Chat ทีมงานจะตรวจสอบรายงานนี้":locale==="de"?"Danke, dass du Melo Chat sicherer machst. Unser Team wird die Meldung prüfen.":"Thanks for helping keep Melo Chat safe. Our team will review this report."}</p><button type="button" onClick={()=>setProfileReportOpen(false)}>{locale==="th"?"เสร็จสิ้น":locale==="de"?"Fertig":"Done"}</button></div>:<><p className={styles.profileReportIntro}>{locale==="th"?`เหตุใดคุณจึงรายงานโปรไฟล์ของ ${person.name}?`:locale==="de"?`Warum meldest du das Profil von ${person.name}?`:`Why are you reporting ${person.name}'s profile?`}</p><div className={styles.profileReportReasons}>{reportReasons.map(reason=><button type="button" key={reason} className={profileReportReason===reason?styles.profileReportReasonActive:""} onClick={()=>setProfileReportReason(reason)}><span>{reason}</span><b>›</b></button>)}</div>{profileReportReason?<div className={styles.profileReportDetails}><label>{locale==="th"?"รายละเอียดเพิ่มเติม (ไม่บังคับ)":locale==="de"?"Weitere Details (optional)":"Additional details (optional)"}</label><textarea value={profileReportDetails} onChange={e=>setProfileReportDetails(e.target.value)} maxLength={500} rows={3} placeholder={locale==="th"?"บอกข้อมูลเพิ่มเติมเพื่อช่วยให้ทีมงานตรวจสอบได้ง่ายขึ้น...":locale==="de"?"Zusätzliche Informationen...":"Add information that may help our review..."}/><div><span>{profileReportDetails.length}/500</span><button type="button" disabled={profileReportSending} onClick={()=>void submitProfileReport()}>{profileReportSending?(locale==="th"?"กำลังส่ง...":"Sending..."):(locale==="th"?"ส่งรายงาน":locale==="de"?"Meldung senden":"Submit report")}</button></div></div>:null}</>}</section></div>:null}

  {profileConfirmAction ? (
   <div
    className={styles.profileConfirmBackdrop}
    role="presentation"
    onMouseDown={()=>{
     if(!profileBlocking){
      setProfileConfirmAction(null);
     }
    }}
   >
    <section
     className={styles.profileConfirmModal}
     role="alertdialog"
     aria-modal="true"
     aria-labelledby="profile-confirm-title"
     onMouseDown={event=>event.stopPropagation()}
    >
     <div
      className={`${styles.profileConfirmIcon} ${
       profileConfirmAction==="block"
        ?styles.profileConfirmBlockIcon
        :styles.profileConfirmUnmatchIcon
      }`}
     >
      {profileConfirmAction==="block"?"⊘":"♥"}
     </div>

     <h3 id="profile-confirm-title">
      {profileConfirmAction==="block"
       ?(
        locale==="th"
         ?`บล็อก ${person.name||"ผู้ใช้นี้"} หรือไม่?`
         :locale==="de"
          ?`${person.name||"Diesen Benutzer"} blockieren?`
          :`Block ${person.name||"this user"}?`
       )
       :(
        locale==="th"
         ?`ยกเลิก Matches กับ ${person.name||"ผู้ใช้นี้"} หรือไม่?`
         :locale==="de"
          ?`Match mit ${person.name||"diesem Benutzer"} aufheben?`
          :`Unmatch with ${person.name||"this user"}?`
       )
      }
     </h3>

     <p>
      {profileConfirmAction==="block"
       ?(
        locale==="th"
         ?"เมื่อบล็อกแล้ว ผู้ใช้นี้จะถูกเพิ่มไปยังรายการผู้ใช้ที่บล็อก และคุณสามารถปลดบล็อกภายหลังได้ใน Settings"
         :locale==="de"
          ?"Diese Person wird zu deiner Blockierliste hinzugefügt. Du kannst die Blockierung später in den Einstellungen aufheben."
          :"This person will be added to your blocked users list. You can unblock them later in Settings."
       )
       :(
        locale==="th"
         ?"เมื่อยกเลิก Matches แล้ว สถานะการจับคู่ระหว่างคุณทั้งสองจะถูกยกเลิก"
         :locale==="de"
          ?"Wenn du das Match aufhebst, wird die bestehende Verbindung zwischen euch aufgehoben."
          :"Unmatching will remove the current match between both of you."
       )
      }
     </p>

     <div className={styles.profileConfirmActions}>
      <button
       type="button"
       className={styles.profileConfirmCancel}
       disabled={profileBlocking}
       onClick={()=>{
        setProfileConfirmAction(null);
       }}
      >
       {locale==="th"
        ?"ยกเลิก"
        :locale==="de"
         ?"Abbrechen"
         :"Cancel"
       }
      </button>

      <button
       type="button"
       className={
        profileConfirmAction==="block"
         ?styles.profileConfirmDanger
         :styles.profileConfirmPrimary
       }
       disabled={profileBlocking}
       onClick={()=>{
        if(profileConfirmAction==="block"){
         void blockMatchedProfile();
         return;
        }

        void confirmProfileUnmatch();
       }}
      >
       {profileBlocking
        ?"…"
        :profileConfirmAction==="block"
         ?(
          locale==="th"
           ?"บล็อก"
           :locale==="de"
            ?"Blockieren"
            :"Block"
         )
         :(
          locale==="th"
           ?"ยกเลิก Matches"
           :locale==="de"
            ?"Match aufheben"
            :"Unmatch"
         )
       }
      </button>
     </div>
    </section>
   </div>
  ):null}

 </div>
}







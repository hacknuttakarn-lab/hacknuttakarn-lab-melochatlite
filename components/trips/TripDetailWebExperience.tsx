"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import { useLocale } from "@/components/SiteProviders";
import ActivityDetailActions from "@/components/activity/ActivityDetailActions";
import AttendanceReputationStatus from "@/components/activity/AttendanceReputationStatus";
import TripJoinRequestsModal from "./TripJoinRequestsModal";
import { activityChatCopy } from "@/i18n/activityChatUi";
import {
  cancelTripJoinRequestWeb,
  leaveTripWeb,
  loadTripDetailWeb,
  requestToJoinTripWeb,
  type TripDetailWeb,
} from "./tripWebData";
import styles from "./TripDetailWebExperience.module.css";

const COPY = {
  th: {
    back:"กลับหน้าทริป", trip:"ทริป", about:"เกี่ยวกับทริป", route:"เส้นทาง", itinerary:"กำหนดการ",
    members:"ผู้ร่วมทริป", organizer:"ผู้จัดทริป", date:"วันเดินทาง", capacity:"จำนวนผู้ร่วมทริป",
    budget:"งบต่อคน", language:"ภาษาหลัก", people:"คน", open:"เปิดรับสมาชิก", closed:"ปิดรับสมาชิก",
    ongoing:"กำลังเดินทาง", owner:"ผู้จัดทริป", joined:"เข้าร่วมแล้ว", pending:"รอผู้จัดอนุมัติ",
    rejected:"คำขอก่อนหน้าถูกปฏิเสธ", spots:"ที่ว่าง", join:"ขอเข้าร่วมทริป", requestAgain:"ขอเข้าร่วมอีกครั้ง",
    cancelRequest:"ยกเลิกคำขอ", leave:"ออกจากทริป", requestMessage:"ข้อความถึงผู้จัดทริป",
    requestPlaceholder:"แนะนำตัวสั้น ๆ หรือบอกเหตุผลที่อยากร่วมทริป", noDescription:"ผู้จัดยังไม่ได้เพิ่มรายละเอียด",
    noItinerary:"ผู้จัดยังไม่ได้เพิ่มกำหนดการ", noMembers:"ยังไม่มีรายชื่อผู้ร่วมทริป", memberCount:"สมาชิก",
    loading:"กำลังโหลดรายละเอียดทริป…", notFound:"ไม่พบทริปนี้", actionFailed:"ดำเนินการไม่สำเร็จ",
    requestSent:"ส่งคำขอเข้าร่วมแล้ว", requestCancelled:"ยกเลิกคำขอแล้ว", left:"ออกจากทริปแล้ว",
    confirmLeave:"ยืนยันออกจากทริปนี้หรือไม่?", start:"จุดเริ่มต้น", stop:"จุดแวะ", destination:"จุดหมาย",
    thb:"บาท", noBudget:"ไม่ระบุ", status:"สถานะ", map:"แผนที่เส้นทาง", mapHint:"สถานที่ทั้งหมดในทริป",
    openGoogle:"เปิดเส้นทางใน Google Maps", routeLocations:"สถานที่ในเส้นทาง", request:"การเข้าร่วม",
  },
  en: {
    back:"Back to Trips", trip:"Trip", about:"About this Trip", route:"Route", itinerary:"Itinerary",
    members:"Trip members", organizer:"Organizer", date:"Travel dates", capacity:"Capacity", budget:"Budget/person",
    language:"Primary language", people:"people", open:"Open for members", closed:"Membership closed", ongoing:"Ongoing",
    owner:"Organizer", joined:"Joined", pending:"Waiting for approval", rejected:"Previous request was rejected",
    spots:"spots left", join:"Request to join", requestAgain:"Request again", cancelRequest:"Cancel request",
    leave:"Leave Trip", requestMessage:"Message to organizer", requestPlaceholder:"Introduce yourself or say why you would like to join",
    noDescription:"The organizer has not added more details yet", noItinerary:"The organizer has not added an itinerary yet",
    noMembers:"No member list yet", memberCount:"members", loading:"Loading trip details…", notFound:"Trip not found",
    actionFailed:"Action failed", requestSent:"Join request sent", requestCancelled:"Request cancelled", left:"You left the Trip",
    confirmLeave:"Leave this Trip?", start:"Starting point", stop:"Stop", destination:"Destination", thb:"THB",
    noBudget:"Not specified", status:"Status", map:"Route map", mapHint:"Every place in this Trip",
    openGoogle:"Open route in Google Maps", routeLocations:"Route locations", request:"Participation",
  },
  de: {
    back:"Zurück zu Reisen",trip:"Reise",about:"Über diese Reise",route:"Route",itinerary:"Reiseplan",members:"Teilnehmer",
    organizer:"Organisator",date:"Reisedaten",capacity:"Kapazität",budget:"Budget/Person",language:"Hauptsprache",people:"Personen",
    open:"Offen",closed:"Geschlossen",ongoing:"Unterwegs",owner:"Organisator",joined:"Beigetreten",pending:"Genehmigung ausstehend",
    rejected:"Vorherige Anfrage abgelehnt",spots:"Plätze frei",join:"Teilnahme anfragen",requestAgain:"Erneut anfragen",
    cancelRequest:"Anfrage abbrechen",leave:"Reise verlassen",requestMessage:"Nachricht an Organisator",
    requestPlaceholder:"Stell dich kurz vor",noDescription:"Noch keine Beschreibung",noItinerary:"Noch kein Reiseplan",noMembers:"Noch keine Teilnehmer",
    memberCount:"Mitglieder",loading:"Reisedetails werden geladen…",notFound:"Reise nicht gefunden",actionFailed:"Aktion fehlgeschlagen",
    requestSent:"Anfrage gesendet",requestCancelled:"Anfrage abgebrochen",left:"Reise verlassen",confirmLeave:"Diese Reise verlassen?",
    start:"Startpunkt",stop:"Zwischenstopp",destination:"Ziel",thb:"THB",noBudget:"Nicht angegeben",status:"Status",
    map:"Routenkarte",mapHint:"Alle Orte dieser Reise",openGoogle:"Route in Google Maps öffnen",routeLocations:"Orte der Route",request:"Teilnahme",
  },
  zh: {
    back:"返回旅行",trip:"旅行",about:"关于本次旅行",route:"路线",itinerary:"行程安排",members:"旅行成员",organizer:"组织者",date:"旅行日期",
    capacity:"人数上限",budget:"人均预算",language:"主要语言",people:"人",open:"开放加入",closed:"已关闭加入",ongoing:"进行中",owner:"组织者",
    joined:"已加入",pending:"等待批准",rejected:"之前的申请已被拒绝",spots:"个名额",join:"申请加入",requestAgain:"再次申请",cancelRequest:"取消申请",
    leave:"退出旅行",requestMessage:"给组织者的留言",requestPlaceholder:"简单介绍自己或说明想加入的原因",noDescription:"组织者尚未添加更多介绍",
    noItinerary:"组织者尚未添加行程安排",noMembers:"暂无成员",memberCount:"成员",loading:"正在加载旅行详情…",notFound:"未找到该旅行",
    actionFailed:"操作失败",requestSent:"加入申请已发送",requestCancelled:"申请已取消",left:"已退出旅行",confirmLeave:"确定退出本次旅行吗？",
    start:"起点",stop:"停靠点",destination:"目的地",thb:"THB",noBudget:"未指定",status:"状态",map:"路线地图",mapHint:"本次旅行的全部地点",
    openGoogle:"在 Google Maps 打开路线",routeLocations:"路线地点",request:"参与",
  },
  ja: {
    back:"Trip一覧へ戻る",trip:"Trip",about:"Tripについて",route:"ルート",itinerary:"旅程",members:"参加メンバー",organizer:"主催者",date:"旅行日",
    capacity:"定員",budget:"1人あたり予算",language:"メイン言語",people:"人",open:"参加募集中",closed:"募集終了",ongoing:"進行中",owner:"主催者",
    joined:"参加中",pending:"承認待ち",rejected:"以前の申請は拒否されました",spots:"空き",join:"参加申請",requestAgain:"再申請",cancelRequest:"申請を取消",
    leave:"Tripを退出",requestMessage:"主催者へのメッセージ",requestPlaceholder:"簡単な自己紹介や参加理由を書いてください",noDescription:"主催者はまだ詳細を追加していません",
    noItinerary:"主催者はまだ旅程を追加していません",noMembers:"参加メンバーはいません",memberCount:"メンバー",loading:"Trip詳細を読み込み中…",notFound:"Tripが見つかりません",
    actionFailed:"操作に失敗しました",requestSent:"参加申請を送信しました",requestCancelled:"申請を取り消しました",left:"Tripを退出しました",confirmLeave:"このTripを退出しますか？",
    start:"出発地",stop:"立ち寄り先",destination:"目的地",thb:"THB",noBudget:"未設定",status:"ステータス",map:"ルートマップ",mapHint:"Trip内のすべての場所",
    openGoogle:"Google Mapsでルートを開く",routeLocations:"ルートの場所",request:"参加",
  },
  ko: {
    back:"여행 목록으로",trip:"여행",about:"여행 소개",route:"경로",itinerary:"일정",members:"여행 멤버",organizer:"주최자",date:"여행 날짜",capacity:"정원",
    budget:"1인 예산",language:"주요 언어",people:"명",open:"참여 모집 중",closed:"모집 마감",ongoing:"진행 중",owner:"주최자",joined:"참여 중",
    pending:"승인 대기 중",rejected:"이전 요청이 거절되었습니다",spots:"자리 남음",join:"참여 요청",requestAgain:"다시 요청",cancelRequest:"요청 취소",
    leave:"여행 나가기",requestMessage:"주최자에게 메시지",requestPlaceholder:"간단한 자기소개나 참여 이유를 적어주세요",noDescription:"주최자가 아직 상세 설명을 추가하지 않았습니다",
    noItinerary:"주최자가 아직 일정을 추가하지 않았습니다",noMembers:"멤버가 없습니다",memberCount:"멤버",loading:"여행 상세 불러오는 중…",notFound:"여행을 찾을 수 없습니다",
    actionFailed:"작업 실패",requestSent:"참여 요청을 보냈습니다",requestCancelled:"요청을 취소했습니다",left:"여행에서 나왔습니다",confirmLeave:"이 여행에서 나갈까요?",
    start:"출발지",stop:"경유지",destination:"목적지",thb:"THB",noBudget:"미지정",status:"상태",map:"경로 지도",mapHint:"여행의 모든 장소",
    openGoogle:"Google Maps에서 경로 열기",routeLocations:"경로 장소",request:"참여",
  },
} as const;

function localeTag(locale:string){return ({th:"th-TH",en:"en-US",de:"de-DE",zh:"zh-CN",ja:"ja-JP",ko:"ko-KR"} as Record<string,string>)[locale]??"en-US"}
function formatDateRange(start:string,end:string,locale:string){if(!start)return"";const f=new Intl.DateTimeFormat(localeTag(locale),{day:"numeric",month:"short",year:"numeric"});const a=new Date(start),b=end?new Date(end):null;if(Number.isNaN(a.getTime()))return start;const x=f.format(a);if(!b||Number.isNaN(b.getTime()))return x;const y=f.format(b);return x===y?x:`${x} – ${y}`}

type MapPoint={label:string;kind:string;lat:number|null;lng:number|null};

function routePoints(detail:TripDetailWeb,copy:any):MapPoint[]{
  return [
    {label:detail.startPoint||"—",kind:copy.start,lat:detail.startLatitude,lng:detail.startLongitude},
    ...detail.stops.map((stop)=>({label:stop.label,kind:copy.stop,lat:stop.latitude,lng:stop.longitude})),
    {label:detail.destination||"—",kind:copy.destination,lat:detail.destinationLatitude,lng:detail.destinationLongitude},
  ];
}

function leafletDocument(points:MapPoint[]){
  const mappable=points.filter((p)=>p.lat!=null&&p.lng!=null);
  if(!mappable.length)return"";
  const safe=JSON.stringify(mappable).replace(/</g,"\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}body{background:#d9e8f3}.leaflet-control-attribution{font-size:9px}.melo-marker{width:32px;height:32px;border-radius:50% 50% 50% 0;background:#168ff7;color:#fff;display:grid;place-items:center;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.26);font:900 12px system-ui}.melo-marker b{transform:rotate(45deg)}</style></head>
<body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const points=${safe};const map=L.map('map',{zoomControl:true,scrollWheelZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
const latlngs=[];points.forEach((p,i)=>{const ll=[p.lat,p.lng];latlngs.push(ll);const icon=L.divIcon({className:'',html:'<div class="melo-marker"><b>'+(i+1)+'</b></div>',iconSize:[34,34],iconAnchor:[17,34]});L.marker(ll,{icon}).addTo(map).bindPopup('<strong>'+(i+1)+'. '+escapeHtml(p.label)+'</strong><br><small>'+escapeHtml(p.kind)+'</small>');});
if(latlngs.length>1)L.polyline(latlngs,{color:'#168ff7',weight:4,opacity:.85}).addTo(map);
if(latlngs.length===1)map.setView(latlngs[0],14);else map.fitBounds(latlngs,{padding:[42,42]});
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
</script></body></html>`;
}

function googleMapsUrl(points:MapPoint[]){
  const clean=points.filter((p)=>p.label&&p.label!=="—");
  if(clean.length<2)return clean.length?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean[0].label)}`:"https://maps.google.com";
  const origin=clean[0].lat!=null?`${clean[0].lat},${clean[0].lng}`:clean[0].label;
  const dest=clean[clean.length-1].lat!=null?`${clean[clean.length-1].lat},${clean[clean.length-1].lng}`:clean[clean.length-1].label;
  const waypoints=clean.slice(1,-1).map((p)=>p.lat!=null?`${p.lat},${p.lng}`:p.label).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}${waypoints?`&waypoints=${encodeURIComponent(waypoints)}`:""}&travelmode=driving`;
}

export default function TripDetailWebExperience({id}:{id:string}){
  const router=useRouter();const {locale}=useLocale();const copy=COPY[locale]??COPY.en;const chatCopy=activityChatCopy[locale]??activityChatCopy.en;
  const [detail,setDetail]=useState<TripDetailWeb|null>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");const [notice,setNotice]=useState("");const [message,setMessage]=useState("");const [requestsOpen,setRequestsOpen]=useState(false);

  const load=useCallback(async(quiet=false)=>{if(!quiet)setLoading(true);setError("");const result=await loadTripDetailWeb(id);if(result.error==="AUTH_REQUIRED"){router.replace("/login");return}if(result.error&&!result.detail)setError(result.error);setDetail(result.detail);if(!quiet)setLoading(false)},[id,router]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{if(!detail||detail.requestStatus!=="pending")return;const timer=window.setInterval(()=>void load(true),5000);return()=>window.clearInterval(timer)},[detail?.requestStatus,load]);

  const remaining=useMemo(()=>!detail?.capacity?null:Math.max(0,detail.capacity-detail.memberCount),[detail]);
  const joined=detail?.requestStatus==="approved"||detail?.joined;

  async function run(action:()=>Promise<void>,success:string){if(busy)return;setBusy(true);setError("");setNotice("");try{await action();setNotice(success);await load(true)}catch(cause){setError(cause instanceof Error?cause.message:copy.actionFailed)}finally{setBusy(false)}}
  function handleAction(){if(!detail||detail.isOwner)return;if(detail.requestStatus==="pending"){void run(()=>cancelTripJoinRequestWeb(detail.id),copy.requestCancelled);return}if(joined){if(!window.confirm(copy.confirmLeave))return;void run(()=>leaveTripWeb(detail.id),copy.left);return}if(!detail.membershipOpen||detail.lifecycle==="completed")return;void run(()=>requestToJoinTripWeb(detail,message),copy.requestSent).then(()=>setMessage(""))}
  function actionLabel(){if(!detail)return copy.join;if(detail.requestStatus==="pending")return copy.cancelRequest;if(joined)return copy.leave;if(!detail.membershipOpen)return copy.closed;if(detail.requestStatus==="rejected")return copy.requestAgain;return copy.join}
  function statusText(){if(!detail)return"";if(detail.isOwner)return copy.owner;if(detail.requestStatus==="pending")return copy.pending;if(joined)return copy.joined;if(!detail.membershipOpen)return copy.closed;if(detail.lifecycle==="ongoing")return copy.ongoing;return copy.open}
  function openSystemChat(){if(!detail)return;window.dispatchEvent(new CustomEvent("melo-open-activity-chat",{detail:{category:"trip",id:detail.id,title:detail.title,subtitle:`${detail.startPoint} → ${detail.destination}`,avatarUrl:detail.imageUrl||""}}))}

  if(loading)return <main className={styles.page}><Header/><div className={styles.state}>{copy.loading}</div></main>;
  if(!detail)return <main className={styles.page}><Header/><div className={styles.state}><strong>{copy.notFound}</strong><Link href="/trips">{copy.back}</Link></div></main>;

  const points=routePoints(detail,copy);const mapDoc=leafletDocument(points);const googleUrl=googleMapsUrl(points);

  return <main className={styles.page}>
    <Header/>
    <section className={styles.shell}>
      <div className={styles.topline}><Link href="/trips">‹ {copy.back}</Link></div>

      <section className={styles.hero}>
        <div className={styles.heroMedia}>
          {detail.imageUrl?<img src={detail.imageUrl} alt=""/>:<div className={styles.heroFallback}>✈</div>}
          <div className={styles.heroShade}/>
          <div className={styles.heroBadges}>{detail.category?<span>{detail.category}</span>:null}<span>{statusText()}</span></div>
          <div className={styles.heroCopy}><small>{copy.trip}</small><h1>{detail.title}</h1><p>{detail.startPoint} → {detail.destination}</p></div>
        </div>

        <aside className={styles.actionCard}>
          <div className={styles.actionMenuSlot}>
            <ActivityDetailActions
              feature="trip"
              id={detail.id}
              title={detail.title}
              subtitle={`${detail.startPoint} → ${detail.destination}`}
              imagePath={detail.imagePath}
              isOwner={detail.isOwner}
              isMember={Boolean(detail.isOwner||joined)}
              onMembers={()=>document.getElementById("activity-members")?.scrollIntoView({behavior:"smooth",block:"start"})}
              variant="menu"
              ownerRequestCount={detail.pendingRequestCount}
              onOwnerRequests={()=>setRequestsOpen(true)}
            />
          </div>

          <div className={styles.aboutBlock}>
            <small>{copy.trip}</small>
            <h2>{copy.about}</h2>
            <p>{detail.description||copy.noDescription}</p>
          </div>

          <div className={styles.actionInfo}>
            <div><small>{copy.date}</small><strong>{formatDateRange(detail.startDate,detail.endDate,locale)}</strong></div>
            <div><small>{copy.capacity}</small><strong>{detail.memberCount}{detail.capacity?`/${detail.capacity}`:""} {copy.people}</strong></div>
            <div><small>{copy.budget}</small><strong>{detail.budgetPerPerson!=null?`${detail.budgetPerPerson.toLocaleString(localeTag(locale))} ${copy.thb}`:copy.noBudget}</strong></div>
            <div><small>{copy.language}</small><strong>{detail.primaryLanguage||"—"}</strong></div>
          </div>

          <div className={styles.statusLine}><span>{copy.status}</span><strong>{statusText()}</strong>{remaining!==null?<em>{remaining} {copy.spots}</em>:null}</div>

          {!detail.isOwner&&!joined&&detail.requestStatus!=="pending"&&detail.membershipOpen?
            <label className={styles.messageField}><span>{copy.requestMessage}</span><textarea value={message} maxLength={240} onChange={(e)=>setMessage(e.target.value)} placeholder={copy.requestPlaceholder}/><small>{message.length}/240</small></label>:null}

          {!detail.isOwner?
            <button type="button" className={`${styles.actionButton} ${joined||detail.requestStatus==="pending"?styles.secondaryAction:""}`} onClick={handleAction}
              disabled={busy||(!joined&&detail.requestStatus!=="pending"&&!detail.membershipOpen)}>{actionLabel()}</button>:null}

          {(detail.isOwner||joined)?
            <button type="button" className={styles.chatButton} onClick={openSystemChat}><span>💬</span>{chatCopy.openChat}</button>:null}

          {notice?<div className={styles.success}>{notice}</div>:null}
          {error?<div className={styles.error}>{error}</div>:null}
        </aside>
      </section>

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          {(detail.isOwner||joined)?<AttendanceReputationStatus activityType="trip" activityId={detail.id} isOrganizer={detail.isOwner}/>:null}

          <section className={styles.panel}>
            <header className={styles.panelHead}><span>⌖</span><div><small>{copy.mapHint}</small><h2>{copy.route}</h2></div></header>

            {mapDoc?<div className={styles.tripMapFrame}><iframe srcDoc={mapDoc} title={copy.map} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups"/></div>:null}

            <a className={styles.googleMapsButton} href={googleUrl} target="_blank" rel="noreferrer">↗ {copy.openGoogle}</a>

            <div className={styles.routeList}>
              {points.map((point,index)=><article key={`${point.kind}-${index}`}><b>{index+1}</b><div><small>{point.kind}</small><strong>{point.label}</strong></div>{point.lat!=null&&point.lng!=null?<span>⌖</span>:null}</article>)}
            </div>
          </section>

          <section className={styles.panel}>
            <header className={styles.panelHead}><span>◷</span><div><small>{copy.trip}</small><h2>{copy.itinerary}</h2></div></header>
            {detail.itinerary.length?<div className={styles.itinerary}>{detail.itinerary.map(item=><article key={item.id}><time>{item.timeLabel||"—"}</time><i/><div><strong>{item.title}</strong>{item.description?<p>{item.description}</p>:null}</div></article>)}</div>:<p className={styles.emptyCopy}>{copy.noItinerary}</p>}
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.panel}>
            <header className={styles.panelHead}><span>★</span><div><small>{copy.trip}</small><h2>{copy.organizer}</h2></div></header>
            <Link href={`/users/${detail.organizerId}`} className={styles.organizerCard}><VerifiedUserAvatar userId={detail.organizerId} name={detail.organizerName} src={detail.organizerPhotoUrl} country={detail.country} badgeSize={17} alt=""/><div><strong>{detail.organizerName}</strong><small>{[detail.organizerCity,detail.country].filter(Boolean).join(" · ")}</small></div><em>›</em></Link>
          </section>

          <section className={styles.panel} id="activity-members">
            <header className={styles.panelHead}><span>●</span><div><small>{detail.memberCount} {copy.memberCount}</small><h2>{copy.members}</h2></div></header>
            {detail.members.length?<div className={styles.memberList}>{detail.members.slice(0,20).map(member=><Link href={`/users/${member.id}`} className={styles.memberRow} key={member.id}><VerifiedUserAvatar userId={member.id} name={member.name} src={member.photoUrl} badgeSize={16} alt=""/><div><strong>{member.name}</strong><small>{member.role||copy.members}</small></div><em>›</em></Link>)}</div>:<p className={styles.emptyCopy}>{copy.noMembers}</p>}
          </section>
        </aside>
      </div>
    </section>
    <TripJoinRequestsModal
      open={requestsOpen}
      tripId={detail.id}
      tripTitle={detail.title}
      onClose={()=>setRequestsOpen(false)}
    />
  </main>
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import { useLocale } from "@/components/SiteProviders";
import {
  loadReputationPageWeb,
  submitReputationCaseWeb,
  type ReputationReviewWeb,
  type ReputationSummaryWeb,
} from "./reputationWebData";
import styles from "./ReputationExperience.module.css";

type AppLocale = "th" | "en" | "de" | "zh" | "ja" | "ko";

const COPY = {
  th:{title:"Reputation",subtitle:"ชื่อเสียงและความน่าเชื่อถือจากประสบการณ์ที่เกิดขึ้นจริงใน Melo",back:"กลับ",passport:"พาสปอร์ต & เหรียญตรา",passportText:"ดูตราประทับการเดินทางและเหรียญที่สมาชิกเปิดเผย",score:"คะแนนชื่อเสียง",reviews:"รีวิว",verifiedEvents:"Events ที่ยืนยัน",verifiedTrips:"Trips ที่ยืนยัน",identity:"ยืนยันเอกสาร",selfie:"ยืนยันเซลฟี่",category:"คะแนนรายด้าน",punctuality:"ตรงเวลา",friendly:"เป็นมิตร",reliable:"น่าเชื่อถือ",safety:"ปลอดภัย",attendance:"ประวัติการเข้าร่วม",attendanceRate:"Attendance rate",confirmed:"เข้าร่วมจริง",noShow:"No-show",cancelled:"ยกเลิกล่วงหน้า",attendanceHint:"การยกเลิกล่วงหน้าแยกจาก No-show เพื่อไม่ให้สมาชิกที่แจ้งก่อนเริ่มถูกนับเป็นการไม่มาตามนัด",topTags:"สิ่งที่สมาชิกพูดถึงบ่อย",memberReviews:"รีวิวจากสมาชิก",noReviews:"ยังไม่มีรีวิว",noReviewsText:"หลังจบ Event หรือ Trip สมาชิกที่เข้าร่วมจริงและได้รับการยืนยันจะสามารถให้คะแนนได้",verified:"ยืนยันตัวตนแล้ว",profileHint:"คะแนนมาจากสมาชิกที่ผู้จัดยืนยันว่าเข้าร่วม Event หรือ Trip เดียวกันจริง",report:"รายงานรีวิว",dispute:"โต้แย้งรีวิว",casePending:"อยู่ระหว่างตรวจสอบ",caseTitle:"ส่งเรื่องตรวจสอบรีวิว",reason:"เหตุผล",details:"รายละเอียดเพิ่มเติม",send:"ส่งเรื่อง",cancel:"ยกเลิก",sent:"ส่งเรื่องเรียบร้อยแล้ว",loading:"กำลังโหลด Reputation…",notFound:"ไม่พบข้อมูลสมาชิก",error:"โหลด Reputation ไม่สำเร็จ",viewProfile:"ดูโปรไฟล์"},
  en:{title:"Reputation",subtitle:"Trust and reputation built from real experiences across Melo",back:"Back",passport:"Passport & Badges",passportText:"View travel stamps and badges shared by this member",score:"Reputation score",reviews:"Reviews",verifiedEvents:"Verified events",verifiedTrips:"Verified trips",identity:"Identity document",selfie:"Selfie verification",category:"Category scores",punctuality:"Punctuality",friendly:"Friendliness",reliable:"Reliability",safety:"Safety",attendance:"Attendance history",attendanceRate:"Attendance rate",confirmed:"Confirmed",noShow:"No-show",cancelled:"Cancelled early",attendanceHint:"Advance cancellations are separated from no-shows, so members who notify others before an activity are not counted as absent without notice.",topTags:"Frequently mentioned",memberReviews:"Member reviews",noReviews:"No reviews yet",noReviewsText:"After an Event or Trip, confirmed participants can leave a review.",verified:"Verified",profileHint:"Scores come from members confirmed by the organizer as participants in the same Event or Trip.",report:"Report review",dispute:"Dispute review",casePending:"Under review",caseTitle:"Request review moderation",reason:"Reason",details:"Additional details",send:"Submit",cancel:"Cancel",sent:"Request submitted",loading:"Loading Reputation…",notFound:"Member information not found",error:"Unable to load Reputation",viewProfile:"View profile"},
  de:{title:"Reputation",subtitle:"Vertrauen und Reputation aus echten Melo-Erfahrungen",back:"Zurück",passport:"Reisepass & Abzeichen",passportText:"Reisestempel und freigegebene Abzeichen ansehen",score:"Reputationswert",reviews:"Bewertungen",verifiedEvents:"Bestätigte Events",verifiedTrips:"Bestätigte Reisen",identity:"Identität",selfie:"Selfie-Verifizierung",category:"Bewertungen nach Kategorie",punctuality:"Pünktlichkeit",friendly:"Freundlichkeit",reliable:"Zuverlässigkeit",safety:"Sicherheit",attendance:"Teilnahmeverlauf",attendanceRate:"Teilnahmequote",confirmed:"Teilgenommen",noShow:"Nicht erschienen",cancelled:"Vorher abgesagt",attendanceHint:"Frühzeitige Absagen werden getrennt von No-shows gezählt.",topTags:"Häufig erwähnt",memberReviews:"Bewertungen von Mitgliedern",noReviews:"Noch keine Bewertungen",noReviewsText:"Bestätigte Teilnehmer können nach einem Event oder einer Reise bewerten.",verified:"Verifiziert",profileHint:"Bewertungen stammen von bestätigten Teilnehmern desselben Events oder derselben Reise.",report:"Bewertung melden",dispute:"Bewertung anfechten",casePending:"In Prüfung",caseTitle:"Prüfung anfordern",reason:"Grund",details:"Weitere Details",send:"Senden",cancel:"Abbrechen",sent:"Anfrage gesendet",loading:"Reputation wird geladen…",notFound:"Mitglied nicht gefunden",error:"Reputation konnte nicht geladen werden",viewProfile:"Profil ansehen"},
  zh:{title:"信誉",subtitle:"基于 Melo 真实同行与活动体验建立的信誉",back:"返回",passport:"护照与徽章",passportText:"查看该成员公开的旅行印章与徽章",score:"信誉评分",reviews:"评价",verifiedEvents:"已确认活动",verifiedTrips:"已确认旅行",identity:"证件认证",selfie:"自拍认证",category:"分类评分",punctuality:"守时",friendly:"友善",reliable:"可靠",safety:"安全",attendance:"参与记录",attendanceRate:"出席率",confirmed:"实际参加",noShow:"未到场",cancelled:"提前取消",attendanceHint:"提前取消与未到场分开统计，避免把提前通知的成员计为无故缺席。",topTags:"常被提到",memberReviews:"成员评价",noReviews:"暂无评价",noReviewsText:"活动或旅行结束后，经确认实际参加的成员可以进行评价。",verified:"已认证",profileHint:"评分来自被组织者确认参加同一活动或旅行的成员。",report:"举报评价",dispute:"申诉评价",casePending:"审核中",caseTitle:"提交评价审核",reason:"原因",details:"补充说明",send:"提交",cancel:"取消",sent:"已提交",loading:"正在加载信誉…",notFound:"未找到成员信息",error:"无法加载信誉",viewProfile:"查看资料"},
  ja:{title:"評判",subtitle:"Meloでの実際の体験から築かれる信頼と評判",back:"戻る",passport:"パスポート & バッジ",passportText:"公開されている旅行スタンプとバッジを見る",score:"評判スコア",reviews:"レビュー",verifiedEvents:"確認済みEvent",verifiedTrips:"確認済みTrip",identity:"本人確認書類",selfie:"セルフィー認証",category:"項目別スコア",punctuality:"時間厳守",friendly:"親しみやすさ",reliable:"信頼性",safety:"安全性",attendance:"参加履歴",attendanceRate:"参加率",confirmed:"参加済み",noShow:"無断欠席",cancelled:"事前キャンセル",attendanceHint:"事前キャンセルは無断欠席と分けて集計されます。",topTags:"よく言及されること",memberReviews:"メンバーレビュー",noReviews:"まだレビューはありません",noReviewsText:"EventやTrip終了後、参加確認済みのメンバーがレビューできます。",verified:"認証済み",profileHint:"同じEventまたはTripに実際に参加したと確認されたメンバーからの評価です。",report:"レビューを報告",dispute:"レビューに異議申し立て",casePending:"確認中",caseTitle:"レビュー確認を依頼",reason:"理由",details:"詳細",send:"送信",cancel:"キャンセル",sent:"送信しました",loading:"評判を読み込み中…",notFound:"メンバー情報がありません",error:"評判を読み込めません",viewProfile:"プロフィールを見る"},
  ko:{title:"평판",subtitle:"Melo의 실제 경험을 바탕으로 쌓이는 신뢰와 평판",back:"뒤로",passport:"패스포트 & 배지",passportText:"회원이 공개한 여행 스탬프와 배지를 확인하세요",score:"평판 점수",reviews:"리뷰",verifiedEvents:"확인된 이벤트",verifiedTrips:"확인된 여행",identity:"신분증 인증",selfie:"셀피 인증",category:"항목별 점수",punctuality:"시간 준수",friendly:"친절함",reliable:"신뢰도",safety:"안전",attendance:"참여 기록",attendanceRate:"참여율",confirmed:"실제 참여",noShow:"노쇼",cancelled:"사전 취소",attendanceHint:"사전 취소는 노쇼와 별도로 집계됩니다.",topTags:"자주 언급되는 항목",memberReviews:"회원 리뷰",noReviews:"아직 리뷰가 없습니다",noReviewsText:"이벤트 또는 여행 종료 후 실제 참여가 확인된 회원이 리뷰할 수 있습니다.",verified:"인증됨",profileHint:"같은 이벤트 또는 여행에 실제 참여한 것으로 확인된 회원의 평가입니다.",report:"리뷰 신고",dispute:"리뷰 이의 제기",casePending:"검토 중",caseTitle:"리뷰 검토 요청",reason:"사유",details:"추가 내용",send:"제출",cancel:"취소",sent:"요청을 제출했습니다",loading:"평판 불러오는 중…",notFound:"회원 정보를 찾을 수 없습니다",error:"평판을 불러올 수 없습니다",viewProfile:"프로필 보기"},
} as const;

function localeCode(locale: AppLocale){return ({th:"th-TH",en:"en-US",de:"de-DE",zh:"zh-CN",ja:"ja-JP",ko:"ko-KR"} as const)[locale]}
function stars(value:number){const n=Math.max(0,Math.min(5,Math.round(value)));return `${"★".repeat(n)}${"☆".repeat(5-n)}`}
function score(value:number){return value>0?value.toFixed(1):"—"}

export default function ReputationExperience(){
  const params=useParams<{id:string}>(); const router=useRouter(); const {locale}=useLocale();
  const activeLocale=(locale in COPY?locale:"en") as AppLocale; const t=COPY[activeLocale];
  const userId=Array.isArray(params.id)?params.id[0]:params.id;
  const [summary,setSummary]=useState<ReputationSummaryWeb|null>(null); const [reviews,setReviews]=useState<ReputationReviewWeb[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [caseReview,setCaseReview]=useState<{review:ReputationReviewWeb;type:"report"|"dispute"}|null>(null);
  const [toast,setToast]=useState("");

  async function load(){if(!userId)return;setLoading(true);setError("");try{const data=await loadReputationPageWeb(userId);setSummary(data.summary);setReviews(data.reviews)}catch(e){setError(e instanceof Error?e.message:t.error)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[userId]);

  const reviewCount=summary?.reviewCount??reviews.length; const confirmed=summary?.confirmedAttendance??0; const noShow=summary?.noShowCount??0; const cancelled=summary?.cancelledCount??0;
  const attendanceRate=summary?.showRate??0;
  const categories=useMemo(()=>summary?[
    [t.punctuality,summary.punctualityRating],[t.friendly,summary.friendlinessRating],[t.reliable,summary.reliabilityRating],[t.safety,summary.safetyRating],
  ] as const:[],[summary,activeLocale]);

  if(loading)return <main className={styles.page}><Header/><div className={styles.state}>{t.loading}</div></main>;
  if(error||!summary)return <main className={styles.page}><Header/><div className={styles.state}><strong>{t.notFound}</strong>{error?<small>{error}</small>:null}<button onClick={()=>router.back()}>{t.back}</button></div></main>;

  return <main className={styles.page}>
    <Header/>{toast?<div className={styles.toast}>{toast}</div>:null}
    <section className={styles.shell}>
      <div className={styles.topBar}><button onClick={()=>router.back()}>← {t.back}</button><span>{t.title}</span></div>
      <div className={styles.layout}>
        <section className={styles.mainColumn}>
          <section className={styles.profileHero}>
            <VerifiedUserAvatar userId={summary.userId} name={summary.displayName} src={summary.photoUrl} verified={summary.isVerified} className={styles.avatar} badgeSize={20} alt=""/>
            <div className={styles.heroCopy}><div className={styles.nameRow}><h1>{summary.displayName}</h1>{summary.isVerified?<span>✓ {t.verified}</span>:null}</div><p>{t.profileHint}</p><Link href={`/users/${summary.userId}`}>{t.viewProfile} →</Link></div>
            <div className={styles.heroScore}><strong>{reviewCount?summary.averageRating.toFixed(1):"—"}</strong><span>{reviewCount?stars(summary.averageRating):"☆☆☆☆☆"}</span><small>{reviewCount} {t.reviews}</small></div>
          </section>

          <section className={styles.scorePanel}>
            <div className={styles.scoreLead}><small>{t.score}</small><strong>{reviewCount?summary.averageRating.toFixed(1):"—"}</strong><span>{reviewCount?stars(summary.averageRating):"☆☆☆☆☆"}</span></div>
            <div className={styles.metricGrid}>
              <Metric value={summary.completedEvents} label={t.verifiedEvents}/><Metric value={summary.completedTrips} label={t.verifiedTrips}/><Metric value={summary.identityVerified?"✓":"—"} label={t.identity}/><Metric value={summary.selfieVerified?"✓":"—"} label={t.selfie}/>
            </div>
          </section>

          <section className={styles.section}><h2>{t.category}</h2><div className={styles.categoryGrid}>{categories.map(([label,value])=><div className={styles.categoryCard} key={label}><strong>{score(value)}</strong><span>{value>0?stars(value):"☆☆☆☆☆"}</span><small>{label}</small></div>)}</div></section>

          <section className={styles.section}><h2>{t.attendance}</h2><div className={styles.attendanceCard}><div className={styles.attendanceMain}><strong>{confirmed+noShow>0?`${attendanceRate.toFixed(0)}%`:"—"}</strong><span>{t.attendanceRate}</span></div><div className={styles.attendanceGrid}><Metric value={confirmed} label={t.confirmed}/><Metric value={noShow} label={t.noShow} danger/><Metric value={cancelled} label={t.cancelled}/></div></div><p className={styles.hint}>{t.attendanceHint}</p></section>

          {summary.topTags.length?<section className={styles.section}><h2>{t.topTags}</h2><div className={styles.tags}>{summary.topTags.map(tag=><span key={tag}>#{tag}</span>)}</div></section>:null}

          <section className={styles.section}><div className={styles.sectionHeading}><h2>{t.memberReviews} <span>{reviewCount}</span></h2></div>{reviews.length?<div className={styles.reviewList}>{reviews.map(review=><ReviewCard key={review.id} review={review} t={t} locale={activeLocale} onCase={(type)=>setCaseReview({review,type})}/>)}</div>:<div className={styles.emptyReview}><strong>{t.noReviews}</strong><p>{t.noReviewsText}</p></div>}</section>
        </section>

        <aside className={styles.sideColumn}>
          <Link href="/passport" className={styles.passportCard}><span>◎</span><div><strong>{t.passport}</strong><small>{t.passportText}</small></div><b>›</b></Link>
          <section className={styles.sideSummary}><h3>{t.score}</h3><div className={styles.sideBigScore}>{reviewCount?summary.averageRating.toFixed(1):"—"}</div><div className={styles.sideStars}>{reviewCount?stars(summary.averageRating):"☆☆☆☆☆"}</div><small>{reviewCount} {t.reviews}</small><div className={styles.sideMiniGrid}><Metric value={summary.completedTrips} label={t.verifiedTrips}/><Metric value={summary.completedEvents} label={t.verifiedEvents}/></div></section>
        </aside>
      </div>
    </section>
    {caseReview?<CaseModal item={caseReview} t={t} onClose={()=>setCaseReview(null)} onSent={()=>{setCaseReview(null);setToast(t.sent);window.setTimeout(()=>setToast(""),2200);void load()}}/>:null}
  </main>
}

function Metric({value,label,danger}:{value:string|number;label:string;danger?:boolean}){return <div className={`${styles.metric} ${danger?styles.dangerMetric:""}`}><strong>{value}</strong><span>{label}</span></div>}

function ReviewCard({review,t,locale,onCase}:{review:ReputationReviewWeb;t:any;locale:AppLocale;onCase:(type:"report"|"dispute")=>void}){
  const metrics=[[t.punctuality,review.punctualityRating],[t.friendly,review.friendlinessRating],[t.reliable,review.reliabilityRating],[t.safety,review.safetyRating]] as const;
  return <article className={styles.reviewCard}><header><VerifiedUserAvatar userId={review.reviewerId} name={review.reviewerName} src={review.reviewerPhotoUrl} verified={review.reviewerVerified} className={styles.reviewerAvatar} badgeSize={16} alt=""/><div className={styles.reviewerCopy}><strong>{review.reviewerName}</strong><small>{review.contextType==="event"?"Event":"Trip"} · {new Date(review.createdAt).toLocaleDateString(localeCode(locale),{day:"numeric",month:"short",year:"numeric"})}</small></div><div className={styles.reviewRating}>{review.rating.toFixed(1)} ★</div></header>{metrics.some(([,v])=>v!=null&&v>0)?<div className={styles.reviewMetrics}>{metrics.map(([label,value])=><div key={label}><strong>{value&&value>0?value.toFixed(1):"—"}</strong><span>{label}</span></div>)}</div>:null}{review.tags.length?<div className={styles.reviewTags}>{review.tags.map(tag=><span key={tag}>#{tag}</span>)}</div>:null}{review.comment?<p className={styles.reviewComment}>{review.comment}</p>:null}{review.caseStatus?<div className={styles.caseStatus}>{t.casePending}: {review.caseStatus}</div>:null}{review.canReport||review.canDispute?<footer>{review.canReport?<button onClick={()=>onCase("report")}>{t.report}</button>:null}{review.canDispute?<button onClick={()=>onCase("dispute")}>{t.dispute}</button>:null}</footer>:null}</article>
}

function CaseModal({item,t,onClose,onSent}:{item:{review:ReputationReviewWeb;type:"report"|"dispute"};t:any;onClose:()=>void;onSent:()=>void}){const [reason,setReason]=useState("");const [details,setDetails]=useState("");const [saving,setSaving]=useState(false);const [error,setError]=useState("");async function send(){if(!reason.trim()||saving)return;setSaving(true);setError("");try{await submitReputationCaseWeb({reviewId:item.review.id,caseType:item.type,reason,details});onSent()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setSaving(false)}}return <div className={styles.modalBackdrop} onMouseDown={onClose}><section className={styles.modal} onMouseDown={e=>e.stopPropagation()}><header><div><strong>{t.caseTitle}</strong><small>{item.review.reviewerName}</small></div><button onClick={onClose}>×</button></header><label><span>{t.reason}</span><input value={reason} onChange={e=>setReason(e.target.value)}/></label><label><span>{t.details}</span><textarea rows={4} value={details} onChange={e=>setDetails(e.target.value)}/></label>{error?<div className={styles.modalError}>{error}</div>:null}<footer><button onClick={onClose}>{t.cancel}</button><button className={styles.primaryButton} onClick={send} disabled={!reason.trim()||saving}>{t.send}</button></footer></section></div>}

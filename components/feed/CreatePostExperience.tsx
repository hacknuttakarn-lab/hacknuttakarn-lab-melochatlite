"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import {
  createTextSocialPostWeb,
  MAX_SOCIAL_POST_TITLE_LENGTH,
} from "./socialFeedWebData";
import styles from "./CreatePostExperience.module.css";

const COPY = {
  th:{kicker:"MELO SOCIAL",title:"สร้างโพสต์",subtitle:"แชร์เรื่องราวหรือประสบการณ์กับชาว Melo",back:"กลับฟีดสังคม",titleLabel:"หัวข้อ",titlePlaceholder:"เพิ่มหัวข้อโพสต์ (ไม่บังคับ)",body:"ข้อความ",bodyPlaceholder:"คุณอยากแบ่งปันอะไร...",visibility:"ใครเห็นโพสต์นี้ได้",public:"สาธารณะ",friends:"เพื่อน",onlyMe:"เฉพาะฉัน",publish:"โพสต์",publishing:"กำลังโพสต์…",required:"กรุณาใส่ข้อความก่อนโพสต์",note:"หน้าเว็บใช้ Social Post ชุดเดียวกับ Android; รอบนี้เปิดสร้างโพสต์ข้อความ/หัวข้อก่อน ส่วนรูปภาพจะใช้ระบบ social-posts เดิมในขั้นถัดไป"},
  en:{kicker:"MELO SOCIAL",title:"Create post",subtitle:"Share a story or experience with the Melo community",back:"Back to Social Feed",titleLabel:"Title",titlePlaceholder:"Add a post title (optional)",body:"Post",bodyPlaceholder:"What would you like to share?",visibility:"Who can see this post",public:"Public",friends:"Friends",onlyMe:"Only me",publish:"Post",publishing:"Publishing…",required:"Write something before posting",note:"The web uses the same Social Post model as Android. This step enables text/title publishing first; image upload will continue to use the existing social-posts storage flow in the next step."},
  de:{kicker:"MELO SOCIAL",title:"Beitrag erstellen",subtitle:"Teile eine Geschichte oder Erfahrung mit Melo",back:"Zurück zum Social Feed",titleLabel:"Titel",titlePlaceholder:"Titel hinzufügen (optional)",body:"Beitrag",bodyPlaceholder:"Was möchtest du teilen?",visibility:"Wer kann diesen Beitrag sehen",public:"Öffentlich",friends:"Freunde",onlyMe:"Nur ich",publish:"Posten",publishing:"Wird veröffentlicht…",required:"Bitte zuerst Text eingeben",note:"Web nutzt dasselbe Social-Post-Modell wie Android. Zuerst sind Text/Titel aktiv; Bild-Upload folgt über den bestehenden social-posts-Flow."},
  zh:{kicker:"MELO SOCIAL",title:"创建帖子",subtitle:"与 Melo 社区分享故事或体验",back:"返回社交动态",titleLabel:"标题",titlePlaceholder:"添加标题（可选）",body:"内容",bodyPlaceholder:"你想分享什么？",visibility:"谁可以看到此帖子",public:"公开",friends:"好友",onlyMe:"仅自己",publish:"发布",publishing:"正在发布…",required:"请先输入内容",note:"网页沿用 Android 的 Social Post 模型。本阶段先开放文字/标题发布，图片上传下一步继续沿用现有 social-posts 存储流程。"},
  ja:{kicker:"MELO SOCIAL",title:"投稿を作成",subtitle:"Meloコミュニティにストーリーや体験を共有",back:"ソーシャルフィードへ戻る",titleLabel:"タイトル",titlePlaceholder:"タイトルを追加（任意）",body:"本文",bodyPlaceholder:"何を共有しますか？",visibility:"公開範囲",public:"公開",friends:"友達",onlyMe:"自分のみ",publish:"投稿",publishing:"投稿中…",required:"投稿内容を入力してください",note:"WebはAndroidと同じSocial Postモデルを使用します。今回はテキスト/タイトル投稿を先に有効化し、画像アップロードは既存social-postsフローで次に対応します。"},
  ko:{kicker:"MELO SOCIAL",title:"게시물 만들기",subtitle:"Melo 커뮤니티에 이야기나 경험을 공유하세요",back:"소셜 피드로 돌아가기",titleLabel:"제목",titlePlaceholder:"제목 추가 (선택)",body:"내용",bodyPlaceholder:"무엇을 공유하고 싶나요?",visibility:"공개 범위",public:"공개",friends:"친구",onlyMe:"나만 보기",publish:"게시",publishing:"게시 중…",required:"게시할 내용을 입력하세요",note:"웹은 Android와 동일한 Social Post 모델을 사용합니다. 이번 단계에서는 텍스트/제목 게시를 먼저 지원하며 이미지 업로드는 기존 social-posts 흐름으로 다음 단계에서 연결합니다."}
} as const;

export default function CreatePostExperience(){
  const {locale}=useLocale(); const copy=COPY[locale]??COPY.en; const router=useRouter(); const params=useSearchParams();
  const attached=useMemo(()=>{
    const type=params.get("activity_type");
    const id=params.get("activity_id")||"";
    if((type!=="trip"&&type!=="event")||!id)return null;
    return {
      type,
      id,
      title:params.get("activity_title")||"",
      subtitle:params.get("activity_subtitle")||"",
      imagePath:params.get("activity_image_path")||"",
    } as const;
  },[params]);
  const [title,setTitle]=useState(""); const [body,setBody]=useState("");
  const [visibility,setVisibility]=useState<"public"|"friends"|"only_me">("public");
  const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");

  async function publish(){
    if(!body.trim()&&!attached){setMessage(copy.required);return}
    if(saving)return; setSaving(true); setMessage("");
    try{
      const id=await createTextSocialPostWeb({title,body:body.trim()||(attached?.title||""),visibility,activity:attached});
      router.replace(`/feed?post=${encodeURIComponent(id)}`);
    }catch(error){
      setMessage(error instanceof Error?error.message:String(error));
    }finally{setSaving(false)}
  }

  return <main className={styles.page}>
    <Header/>
    <section className={styles.shell}>
      <header className={styles.hero}>
        <Link href="/feed">← {copy.back}</Link><span>{copy.kicker}</span><h1>{copy.title}</h1><p>{copy.subtitle}</p>
      </header>
      <section className={styles.card}>
        <label><span>{copy.titleLabel}</span><input maxLength={MAX_SOCIAL_POST_TITLE_LENGTH} value={title} onChange={e=>setTitle(e.target.value)} placeholder={copy.titlePlaceholder}/></label>
        {attached?<div style={{display:"grid",gridTemplateColumns:"48px minmax(0,1fr)",gap:10,alignItems:"center",border:"1px solid var(--border)",borderRadius:14,background:"var(--surface-2)",padding:10}}>
          <span style={{display:"grid",width:48,height:48,placeItems:"center",borderRadius:12,background:"var(--primary-soft)",color:"var(--primary)",fontSize:20}}>{attached.type==="trip"?"✈":"◉"}</span>
          <div style={{minWidth:0}}><strong style={{display:"block",fontSize:12}}>{attached.title||attached.type}</strong><small style={{display:"block",marginTop:4,color:"var(--text-secondary)",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{attached.subtitle}</small></div>
        </div>:null}
        <label><span>{copy.body}</span><textarea rows={8} maxLength={5000} value={body} onChange={e=>setBody(e.target.value)} placeholder={copy.bodyPlaceholder}/></label>
        <div className={styles.visibility}><strong>{copy.visibility}</strong><div>
          <button type="button" className={visibility==="public"?styles.selected:""} onClick={()=>setVisibility("public")}>🌐 {copy.public}</button>
          <button type="button" className={visibility==="friends"?styles.selected:""} onClick={()=>setVisibility("friends")}>●● {copy.friends}</button>
          <button type="button" className={visibility==="only_me"?styles.selected:""} onClick={()=>setVisibility("only_me")}>◉ {copy.onlyMe}</button>
        </div></div>
        <div className={styles.note}>{copy.note}</div>
        {message?<div className={styles.error}>{message}</div>:null}
        <button type="button" className={styles.publish} onClick={publish} disabled={saving}>{saving?copy.publishing:copy.publish}</button>
      </section>
    </section>
  </main>
}

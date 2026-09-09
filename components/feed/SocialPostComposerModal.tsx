"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLocale } from "@/components/SiteProviders";
import PlaceSearchInput, { type PlaceSearchResult } from "@/components/location/PlaceSearchInput";
import { getCurrentMeloPlace, meloPlaceDisplayLabel } from "@/components/location/meloLocationWeb";
import {
  createTextSocialPostWeb,
  updateSocialPostWeb,
  MAX_SOCIAL_POST_IMAGES,
  MAX_SOCIAL_POST_IMAGE_BYTES,
  MAX_SOCIAL_POST_TITLE_LENGTH,
  type SocialActivityType,
  type SocialFeedPost,
  type SocialPostVisibility,
} from "./socialFeedWebData";
import styles from "./SocialPostComposerModal.module.css";

export type ComposerActivity = {
  type: SocialActivityType;
  id: string;
  title: string;
  subtitle: string;
  imagePath: string;
};

type NewImage = { id: string; file: File; preview: string };
type ExistingImage = { path: string; url: string };

const COPY = {
  th: {create:"สร้างโพสต์",edit:"แก้ไขโพสต์",subtitle:"แชร์เรื่องราวกับชาว Melo",title:"หัวข้อ",titlePlaceholder:"เพิ่มหัวข้อโพสต์ (ไม่บังคับ)",body:"ข้อความ",bodyPlaceholder:"คุณกำลังคิดอะไรอยู่...",visibility:"ใครเห็นโพสต์นี้ได้",public:"สาธารณะ",friends:"เพื่อน",onlyMe:"เฉพาะฉัน",tripMembers:"สมาชิกทริป",eventParticipants:"ผู้เข้าร่วมอีเวนต์",communityMembers:"สมาชิกคอมมูนิตี้",cancel:"ยกเลิก",publish:"โพสต์",save:"บันทึก",saving:"กำลังบันทึก…",required:"เพิ่มข้อความ รูปภาพ หรือกิจกรรมก่อนโพสต์",attached:"แนบกับโพสต์",photo:"เพิ่มรูปภาพ",location:"เพิ่มโลเคชั่น",locationName:"ชื่อสถานที่",locationPlaceholder:"เช่น Siam Square, Bangkok",currentLocation:"ตำแหน่งปัจจุบัน",detect:"ใช้ตำแหน่งปัจจุบัน",locating:"กำลังค้นหาตำแหน่ง…",removeLocation:"ลบโลเคชั่น",locationUnavailable:"ไม่สามารถอ่านตำแหน่งปัจจุบันได้",searchingPlaces:"กำลังค้นหาสถานที่…",noPlaces:"ไม่พบสถานที่ที่ตรงกับคำค้น",maxImages:"เพิ่มรูปได้สูงสุด 8 รูป",largeImage:"รูปภาพแต่ละรูปต้องมีขนาดไม่เกิน 12 MB",removeImage:"ลบรูป",mediaHint:"รูปภาพและตำแหน่งจะแสดงกับโพสต์ทั้งบนเว็บและฟีด Melo"},
  en: {create:"Create post",edit:"Edit post",subtitle:"Share something with Melo",title:"Title",titlePlaceholder:"Add a title (optional)",body:"Post",bodyPlaceholder:"What are you thinking about?",visibility:"Who can see this post",public:"Public",friends:"Friends",onlyMe:"Only me",tripMembers:"Trip members",eventParticipants:"Event participants",communityMembers:"Community members",cancel:"Cancel",publish:"Post",save:"Save",saving:"Saving…",required:"Add text, images, or an activity before posting",attached:"Attached to post",photo:"Add photos",location:"Add location",locationName:"Place name",locationPlaceholder:"e.g. Siam Square, Bangkok",currentLocation:"Current location",detect:"Use current location",locating:"Finding location…",removeLocation:"Remove location",locationUnavailable:"Current location is unavailable",searchingPlaces:"Searching places…",noPlaces:"No matching places found",maxImages:"You can add up to 8 images",largeImage:"Each image must be 12 MB or smaller",removeImage:"Remove image",mediaHint:"Photos and location will be saved with this Melo post"},
  de: {create:"Beitrag erstellen",edit:"Beitrag bearbeiten",subtitle:"Mit Melo teilen",title:"Titel",titlePlaceholder:"Titel hinzufügen (optional)",body:"Beitrag",bodyPlaceholder:"Woran denkst du?",visibility:"Wer kann den Beitrag sehen",public:"Öffentlich",friends:"Freunde",onlyMe:"Nur ich",tripMembers:"Reisemitglieder",eventParticipants:"Event-Teilnehmer",communityMembers:"Community-Mitglieder",cancel:"Abbrechen",publish:"Posten",save:"Speichern",saving:"Speichern…",required:"Text, Bilder oder Aktivität hinzufügen",attached:"An Beitrag angehängt",photo:"Fotos hinzufügen",location:"Ort hinzufügen",locationName:"Ortsname",locationPlaceholder:"z. B. Siam Square, Bangkok",currentLocation:"Aktueller Standort",detect:"Aktuellen Standort verwenden",locating:"Standort wird gesucht…",removeLocation:"Ort entfernen",locationUnavailable:"Standort nicht verfügbar",searchingPlaces:"Orte werden gesucht…",noPlaces:"Keine passenden Orte gefunden",maxImages:"Maximal 8 Bilder",largeImage:"Jedes Bild darf höchstens 12 MB groß sein",removeImage:"Bild entfernen",mediaHint:"Fotos und Standort werden mit dem Melo-Beitrag gespeichert"},
  zh: {create:"创建帖子",edit:"编辑帖子",subtitle:"与 Melo 分享",title:"标题",titlePlaceholder:"添加标题（可选）",body:"内容",bodyPlaceholder:"你在想什么？",visibility:"谁可以看到此帖子",public:"公开",friends:"好友",onlyMe:"仅自己",tripMembers:"旅行成员",eventParticipants:"活动参与者",communityMembers:"社区成员",cancel:"取消",publish:"发布",save:"保存",saving:"正在保存…",required:"请添加文字、图片或活动",attached:"帖子附件",photo:"添加图片",location:"添加位置",locationName:"地点名称",locationPlaceholder:"例如 Siam Square, Bangkok",currentLocation:"当前位置",detect:"使用当前位置",locating:"正在获取位置…",removeLocation:"移除位置",locationUnavailable:"无法获取当前位置",searchingPlaces:"正在搜索地点…",noPlaces:"未找到匹配的地点",maxImages:"最多可添加 8 张图片",largeImage:"每张图片不得超过 12 MB",removeImage:"删除图片",mediaHint:"图片和位置会与 Melo 帖子一起保存"},
  ja: {create:"投稿を作成",edit:"投稿を編集",subtitle:"Meloに共有",title:"タイトル",titlePlaceholder:"タイトルを追加（任意）",body:"本文",bodyPlaceholder:"今、何を考えていますか？",visibility:"公開範囲",public:"公開",friends:"友達",onlyMe:"自分のみ",tripMembers:"Tripメンバー",eventParticipants:"Event参加者",communityMembers:"Communityメンバー",cancel:"キャンセル",publish:"投稿",save:"保存",saving:"保存中…",required:"テキスト、画像、またはアクティビティを追加してください",attached:"投稿に添付",photo:"画像を追加",location:"場所を追加",locationName:"場所名",locationPlaceholder:"例: Siam Square, Bangkok",currentLocation:"現在地",detect:"現在地を使用",locating:"位置情報を取得中…",removeLocation:"場所を削除",locationUnavailable:"現在地を取得できません",searchingPlaces:"場所を検索中…",noPlaces:"一致する場所が見つかりません",maxImages:"画像は最大8枚まで",largeImage:"各画像は12MB以下にしてください",removeImage:"画像を削除",mediaHint:"画像と場所はMelo投稿に保存されます"},
  ko: {create:"게시물 만들기",edit:"게시물 수정",subtitle:"Melo에 공유",title:"제목",titlePlaceholder:"제목 추가 (선택)",body:"내용",bodyPlaceholder:"무슨 생각을 하고 있나요?",visibility:"공개 범위",public:"공개",friends:"친구",onlyMe:"나만 보기",tripMembers:"여행 멤버",eventParticipants:"이벤트 참여자",communityMembers:"커뮤니티 멤버",cancel:"취소",publish:"게시",save:"저장",saving:"저장 중…",required:"텍스트, 이미지 또는 활동을 추가하세요",attached:"게시물 첨부",photo:"사진 추가",location:"위치 추가",locationName:"장소 이름",locationPlaceholder:"예: Siam Square, Bangkok",currentLocation:"현재 위치",detect:"현재 위치 사용",locating:"위치 확인 중…",removeLocation:"위치 삭제",locationUnavailable:"현재 위치를 확인할 수 없습니다",searchingPlaces:"장소 검색 중…",noPlaces:"일치하는 장소를 찾을 수 없습니다",maxImages:"이미지는 최대 8장까지 추가할 수 있습니다",largeImage:"각 이미지는 12MB 이하여야 합니다",removeImage:"이미지 삭제",mediaHint:"사진과 위치가 Melo 게시물에 함께 저장됩니다"},
} as const;

function visibilityLabel(value: SocialPostVisibility, copy: any) {
  if (value === "friends") return copy.friends;
  if (value === "only_me") return copy.onlyMe;
  if (value === "trip_members") return copy.tripMembers;
  if (value === "event_participants") return copy.eventParticipants;
  if (value === "community_members") return copy.communityMembers;
  return copy.public;
}

function activityVisibility(type: SocialActivityType | null | undefined): SocialPostVisibility | null {
  if (type === "trip") return "trip_members";
  if (type === "event") return "event_participants";
  if (type === "community") return "community_members";
  return null;
}

export default function SocialPostComposerModal({ open, onClose, onSaved, post = null, activity = null }: {
  open: boolean;
  onClose: () => void;
  onSaved?: (postId: string) => void | Promise<void>;
  post?: SocialFeedPost | null;
  activity?: ComposerActivity | null;
}) {
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;
  const editing = Boolean(post);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newImagesRef = useRef<NewImage[]>([]);
  const initialVisibility = useMemo<SocialPostVisibility>(() => post?.visibility || "public", [post]);
  const [title,setTitle] = useState("");
  const [body,setBody] = useState("");
  const [visibility,setVisibility] = useState<SocialPostVisibility>("public");
  const [existingImages,setExistingImages] = useState<ExistingImage[]>([]);
  const [newImages,setNewImages] = useState<NewImage[]>([]);
  const [locationOpen,setLocationOpen] = useState(false);
  const [locationName,setLocationName] = useState("");
  const [latitude,setLatitude] = useState<number | null>(null);
  const [longitude,setLongitude] = useState<number | null>(null);
  const [locating,setLocating] = useState(false);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");

  useEffect(() => { newImagesRef.current = newImages; }, [newImages]);
  useEffect(() => () => { newImagesRef.current.forEach((item) => URL.revokeObjectURL(item.preview)); }, []);

  useEffect(() => {
    if (!open) return;
    newImagesRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    setTitle(post?.title || "");
    setBody(post?.body?.replace(/\u200B/g, "") || "");
    setVisibility(initialVisibility);
    setExistingImages(post?.images || []);
    setNewImages([]);
    setLocationName(post?.locationName || "");
    setLatitude(post?.latitude ?? null);
    setLongitude(post?.longitude ?? null);
    setLocationOpen(Boolean(post?.locationName || post?.latitude != null || post?.longitude != null));
    setLocating(false);
    setError("");
    setSaving(false);
  }, [open, post, initialVisibility]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  const attached = activity || (post?.activityType && post.activityId ? {
    type: post.activityType,
    id: post.activityId,
    title: post.activityTitle,
    subtitle: post.activitySubtitle,
    imagePath: post.activityImagePath,
  } : null);
  const memberVisibility = activityVisibility(attached?.type);
  const imageCount = existingImages.length + newImages.length;

  function pickImages(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";
    if (!incoming.length) return;
    const tooLarge = incoming.find((file) => file.size > MAX_SOCIAL_POST_IMAGE_BYTES);
    if (tooLarge) { setError(copy.largeImage); return; }
    const valid = incoming.filter((file) => file.type.toLowerCase().startsWith("image/"));
    const room = Math.max(0, MAX_SOCIAL_POST_IMAGES - imageCount);
    if (valid.length > room) setError(copy.maxImages); else setError("");
    const next = valid.slice(0, room).map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setNewImages((current) => [...current, ...next]);
  }

  function removeNewImage(id: string) {
    setNewImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.id !== id);
    });
  }

  function selectLocation(place: PlaceSearchResult) {
    setLocationName(meloPlaceDisplayLabel(place) || place.name || copy.currentLocation);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setError("");
  }

  async function detectLocation() {
    if (locating) return;
    setLocating(true); setError(""); setLocationOpen(true);
    try {
      const place = await getCurrentMeloPlace({ locale, fallbackLabel: copy.currentLocation });
      setLocationName(place.name || copy.currentLocation);
      setLatitude(place.latitude);
      setLongitude(place.longitude);
    } catch {
      setError(copy.locationUnavailable);
    } finally {
      setLocating(false);
    }
  }

  function clearLocation() {
    setLocationName(""); setLatitude(null); setLongitude(null); setLocationOpen(false);
  }

  async function save() {
    const hasMedia = imageCount > 0;
    const hasLocation = locationOpen && Boolean(locationName.trim() || latitude != null || longitude != null);
    if (!body.trim() && !title.trim() && !attached && !hasMedia && !hasLocation) { setError(copy.required); return; }
    if (saving) return;
    setSaving(true); setError("");
    const location = locationOpen && (locationName.trim() || latitude != null || longitude != null)
      ? { name: locationName.trim(), latitude, longitude }
      : null;
    try {
      const postId = post
        ? await updateSocialPostWeb(post, {
            title, body, visibility,
            existingImagePaths: existingImages.map((image) => image.path),
            newImageFiles: newImages.map((image) => image.file),
            location,
          })
        : await createTextSocialPostWeb({
            title,
            body,
            visibility,
            imageFiles: newImages.map((image) => image.file),
            location,
            activity: attached,
          });
      await onSaved?.(postId);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setSaving(false); }
  }

  return <div className={styles.backdrop} onMouseDown={onClose}>
    <section className={styles.modal} onMouseDown={e=>e.stopPropagation()}>
      <header className={styles.head}><div><h2>{editing?copy.edit:copy.create}</h2><p>{copy.subtitle}</p></div><button type="button" onClick={onClose}>×</button></header>
      <div className={styles.content}>
        {attached?<div className={styles.activityCard}><span>{attached.type==="trip"?"✈":attached.type==="event"?"◉":"◎"}</span><div><small>{copy.attached}</small><strong>{attached.title||attached.type}</strong><p>{attached.subtitle}</p></div></div>:null}
        <label><span>{copy.title}</span><input maxLength={MAX_SOCIAL_POST_TITLE_LENGTH} value={title} onChange={e=>setTitle(e.target.value)} placeholder={copy.titlePlaceholder}/></label>
        <label><span>{copy.body}</span><textarea rows={6} maxLength={5000} value={body} onChange={e=>setBody(e.target.value)} placeholder={copy.bodyPlaceholder}/></label>

        <div className={styles.mediaToolbar}>
          <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={imageCount>=MAX_SOCIAL_POST_IMAGES}><span>▧</span>{copy.photo}<b>{imageCount}/{MAX_SOCIAL_POST_IMAGES}</b></button>
          <button type="button" className={locationOpen?styles.activeTool:""} onClick={()=>setLocationOpen((value)=>!value)}><span>⌖</span>{copy.location}</button>
          <input ref={fileInputRef} className={styles.fileInput} type="file" accept="image/*" multiple onChange={pickImages}/>
        </div>

        {imageCount ? <div className={styles.imageGrid}>
          {existingImages.map((image, index)=><div className={styles.imagePreview} key={`existing-${image.path}-${index}`}><img src={image.url} alt=""/><button type="button" title={copy.removeImage} onClick={()=>setExistingImages((current)=>current.filter((_,i)=>i!==index))}>×</button></div>)}
          {newImages.map((image)=><div className={styles.imagePreview} key={image.id}><img src={image.preview} alt=""/><button type="button" title={copy.removeImage} onClick={()=>removeNewImage(image.id)}>×</button></div>)}
        </div>:null}

        {locationOpen?<section className={styles.locationPanel}>
          <div className={styles.locationHead}><strong>⌖ {copy.location}</strong><button type="button" onClick={clearLocation}>{copy.removeLocation}</button></div>
          <label><span>{copy.locationName}</span></label>
          <PlaceSearchInput
            value={locationName}
            onChange={(value)=>{setLocationName(value);setLatitude(null);setLongitude(null)}}
            onSelect={selectLocation}
            placeholder={copy.locationPlaceholder}
            locale={locale}
            searchingLabel={copy.searchingPlaces}
            noResultsLabel={copy.noPlaces}
            latitude={latitude}
            longitude={longitude}
          />
          <div className={styles.locationActions}><button type="button" onClick={()=>void detectLocation()} disabled={locating}>{locating?copy.locating:copy.detect}</button>{latitude!=null&&longitude!=null?<small>{latitude.toFixed(5)}, {longitude.toFixed(5)}</small>:null}</div>
        </section>:null}

        <small className={styles.mediaHint}>{copy.mediaHint}</small>

        <section className={styles.visibility}><strong>{copy.visibility}</strong><div>
          <button type="button" className={visibility==="public"?styles.selected:""} onClick={()=>setVisibility("public")}>🌐 {copy.public}</button>
          <button type="button" className={visibility==="friends"?styles.selected:""} onClick={()=>setVisibility("friends")}>●● {copy.friends}</button>
          <button type="button" className={visibility==="only_me"?styles.selected:""} onClick={()=>setVisibility("only_me")}>◉ {copy.onlyMe}</button>
          {memberVisibility?<button type="button" className={visibility===memberVisibility?styles.selected:""} onClick={()=>setVisibility(memberVisibility)}>◎ {visibilityLabel(memberVisibility,copy)}</button>:null}
        </div></section>
        {error?<div className={styles.error}>{error}</div>:null}
      </div>
      <footer className={styles.footer}><button type="button" className={styles.cancel} onClick={onClose}>{copy.cancel}</button><button type="button" className={styles.primary} onClick={()=>void save()} disabled={saving}>{saving?copy.saving:editing?copy.save:copy.publish}</button></footer>
    </section>
  </div>;
}

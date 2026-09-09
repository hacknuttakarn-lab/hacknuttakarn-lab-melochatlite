"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import { rpcRequest } from "@/lib/supabase/browser";
import {
  saveActivityCoverWeb,
  saveActivityGalleryWeb,
  saveEventLocationCoordinatesWeb,
  updateActivityCreationFields,
  updateEventChatModeWeb,
  validateActivityImage,
} from "@/components/activity/activityMediaWeb";
import PlaceSearchInput, { type PlaceSearchResult } from "@/components/location/PlaceSearchInput";
import { getCurrentMeloPlace } from "@/components/location/meloLocationWeb";
import styles from "./CreateEventWebExperience.module.css";

const EVENT_CATEGORIES = [
  "friends_social",
  "pets_animals",
  "food_cafe",
  "sports_fitness",
  "music_entertainment",
  "travel_outdoor",
  "learning_workshop",
  "business_networking",
  "volunteer_charity",
  "other",
] as const;

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  th: {
    friends_social: "เพื่อน & สังคม", pets_animals: "สัตว์เลี้ยง", food_cafe: "อาหาร & คาเฟ่",
    sports_fitness: "กีฬา & ฟิตเนส", music_entertainment: "ดนตรี & บันเทิง", travel_outdoor: "ท่องเที่ยว & Outdoor",
    learning_workshop: "เรียนรู้ & Workshop", business_networking: "ธุรกิจ & Networking",
    volunteer_charity: "อาสา & การกุศล", other: "อื่น ๆ",
  },
  en: {
    friends_social: "Friends & Social", pets_animals: "Pets & Animals", food_cafe: "Food & Cafe",
    sports_fitness: "Sports & Fitness", music_entertainment: "Music & Entertainment", travel_outdoor: "Travel & Outdoor",
    learning_workshop: "Learning & Workshop", business_networking: "Business & Networking",
    volunteer_charity: "Volunteer & Charity", other: "Other",
  },
  de: {
    friends_social: "Freunde & Soziales", pets_animals: "Haustiere & Tiere", food_cafe: "Essen & Café",
    sports_fitness: "Sport & Fitness", music_entertainment: "Musik & Unterhaltung", travel_outdoor: "Reisen & Outdoor",
    learning_workshop: "Lernen & Workshop", business_networking: "Business & Networking",
    volunteer_charity: "Ehrenamt & Charity", other: "Andere",
  },
  zh: {
    friends_social: "朋友与社交", pets_animals: "宠物与动物", food_cafe: "美食与咖啡",
    sports_fitness: "运动与健身", music_entertainment: "音乐与娱乐", travel_outdoor: "旅行与户外",
    learning_workshop: "学习与工作坊", business_networking: "商务与人脉",
    volunteer_charity: "志愿与公益", other: "其他",
  },
  ja: {
    friends_social: "友達 & ソーシャル", pets_animals: "ペット & 動物", food_cafe: "フード & カフェ",
    sports_fitness: "スポーツ & フィットネス", music_entertainment: "音楽 & エンタメ", travel_outdoor: "旅行 & アウトドア",
    learning_workshop: "学び & ワークショップ", business_networking: "ビジネス & ネットワーキング",
    volunteer_charity: "ボランティア & チャリティ", other: "その他",
  },
  ko: {
    friends_social: "친구 & 소셜", pets_animals: "반려동물 & 동물", food_cafe: "음식 & 카페",
    sports_fitness: "스포츠 & 피트니스", music_entertainment: "음악 & 엔터테인먼트", travel_outdoor: "여행 & 아웃도어",
    learning_workshop: "학습 & 워크숍", business_networking: "비즈니스 & 네트워킹",
    volunteer_charity: "봉사 & 자선", other: "기타",
  },
};

const COPY = {
  th: {
    back: "กลับหน้าอีเวนต์", title: "สร้างอีเวนต์", subtitle: "สร้างกิจกรรมพร้อมสถานที่ วันเวลา รูปภาพ และรูปแบบการสื่อสารในที่เดียว",
    basic: "ข้อมูลอีเวนต์", category: "ประเภทกิจกรรม", name: "ชื่ออีเวนต์ *", description: "รายละเอียด *",
    location: "สถานที่", findLocation: "ค้นหาสถานที่จัดอีเวนต์", findLocationDesc: "ค้นหาหรือพิมพ์ชื่อสถานที่ แล้วกรอกรายละเอียดสถานที่ด้านล่าง", searchPlace: "ค้นหาสถานที่ เช่น CentralWorld, Chiang Mai", searchingPlaces: "กำลังค้นหาสถานที่…", noPlaces: "ไม่พบสถานที่ที่ตรงกับคำค้น", useCurrentLocation: "ใช้ตำแหน่งปัจจุบัน", locating: "กำลังค้นหาตำแหน่ง…", locationFailed: "ไม่สามารถอ่านตำแหน่งปัจจุบันได้",
    locationDetails: "รายละเอียดสถานที่", venue: "ชื่อสถานที่จัด *", address: "ที่อยู่ / จุดนัดพบ", city: "เมือง / จังหวัด *", country: "ประเทศ *",
    schedule: "วันและเวลา", startDate: "วันเริ่มต้น *", startTime: "เวลา *", endDate: "วันสิ้นสุด *", endTime: "เวลา *", capacity: "จำนวนผู้เข้าร่วม", price: "ราคา/คน", freeHint: "เว้นว่างหากเข้าร่วมฟรี",
    media: "รูปภาพอีเวนต์", mediaDesc: "เพิ่มรูปหลักและรูปประกอบสำหรับอีเวนต์", cover: "รูปหลัก", coverHint: "ใช้บนการ์ดอีเวนต์และหน้ารายละเอียด", chooseCover: "เพิ่มรูป", replaceCover: "เปลี่ยนรูป", remove: "ลบ",
    gallery: "รูปเพิ่มเติม", galleryHint: "เพิ่มรูปประกอบได้สูงสุด 6 รูป", addGallery: "+ เพิ่มรูป",
    language: "ภาษาหลักของอีเวนต์", communication: "การสื่อสารในอีเวนต์", communicationDesc: "เลือกรูปแบบห้องสนทนาที่เหมาะกับกิจกรรม", groupChat: "แชทกลุ่ม", announcementsOnly: "ประกาศเท่านั้น", noChat: "ไม่มีแชท",
    communicationHint: "แชทกลุ่มเหมาะกับอีเวนต์ขนาดเล็กและกลาง ส่วนอีเวนต์ใหญ่สามารถใช้ประกาศเท่านั้นหรือปิดแชทได้",
    create: "เผยแพร่อีเวนต์", creating: "กำลังสร้างและอัปโหลดรูป…", publishHint: "อีเวนต์จะเผยแพร่และแสดงให้ผู้ใช้ Melo เห็นเมื่อสร้างสำเร็จ",
    required: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ", endBeforeStart: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น",
    imageTooLarge: "รูปภาพต้องมีขนาดไม่เกิน 12 MB", imageType: "กรุณาเลือกไฟล์รูปภาพ", imageLimit: "เพิ่มรูปภาพเพิ่มเติมได้สูงสุด 6 รูป",
  },
  en: {
    back: "Back to Events", title: "Create Event", subtitle: "Create an event with location, schedule, photos and communication settings in one place.",
    basic: "Event information", category: "Event type", name: "Event name *", description: "Details *",
    location: "Location", findLocation: "Find event location", findLocationDesc: "Search or type a place name, then complete the location details below.", searchPlace: "Search a place, e.g. CentralWorld, Chiang Mai", searchingPlaces: "Searching places…", noPlaces: "No matching places found", useCurrentLocation: "Use current location", locating: "Finding location…", locationFailed: "Unable to read your current location",
    locationDetails: "Location details", venue: "Venue name *", address: "Address / meeting point", city: "City / province *", country: "Country *",
    schedule: "Date and time", startDate: "Start date *", startTime: "Time *", endDate: "End date *", endTime: "Time *", capacity: "Capacity", price: "Price/person", freeHint: "Leave blank if free",
    media: "Event photos", mediaDesc: "Add a main image and supporting photos for the event.", cover: "Main image", coverHint: "Shown on Event cards and the detail page.", chooseCover: "Add image", replaceCover: "Change image", remove: "Remove",
    gallery: "Additional photos", galleryHint: "Add up to 6 supporting photos.", addGallery: "+ Add photos",
    language: "Event primary language", communication: "Event communication", communicationDesc: "Choose how participants communicate during this event.", groupChat: "Group Chat", announcementsOnly: "Announcements only", noChat: "No chat",
    communicationHint: "Group Chat is recommended for small and medium events. Large events can use announcements only or disable chat.",
    create: "Publish Event", creating: "Creating and uploading photos…", publishHint: "Your event will be public and visible to Melo users after publishing.",
    required: "Please complete all required fields", endBeforeStart: "End time must be after start time",
    imageTooLarge: "Images must be no larger than 12 MB", imageType: "Please choose an image file", imageLimit: "Up to 6 additional photos",
  },
  de: {
    back: "Zurück zu Events", title: "Event erstellen", subtitle: "Erstelle ein Event mit Ort, Zeitplan, Fotos und Kommunikationseinstellungen an einem Ort.",
    basic: "Eventinformationen", category: "Eventtyp", name: "Eventname *", description: "Details *",
    location: "Ort", findLocation: "Eventort finden", findLocationDesc: "Suche oder gib einen Ort ein und ergänze danach die Ortsdetails.", searchPlace: "Ort suchen, z. B. CentralWorld, Chiang Mai", searchingPlaces: "Orte werden gesucht…", noPlaces: "Keine passenden Orte gefunden", useCurrentLocation: "Aktuellen Standort verwenden", locating: "Standort wird gesucht…", locationFailed: "Standort konnte nicht gelesen werden",
    locationDetails: "Ortsdetails", venue: "Veranstaltungsort *", address: "Adresse / Treffpunkt", city: "Stadt / Region *", country: "Land *",
    schedule: "Datum und Zeit", startDate: "Startdatum *", startTime: "Uhrzeit *", endDate: "Enddatum *", endTime: "Uhrzeit *", capacity: "Kapazität", price: "Preis/Person", freeHint: "Leer lassen, wenn kostenlos",
    media: "Eventbilder", mediaDesc: "Füge ein Hauptbild und weitere Eventbilder hinzu.", cover: "Hauptbild", coverHint: "Wird auf Event-Karten und der Detailseite gezeigt.", chooseCover: "Bild hinzufügen", replaceCover: "Bild ändern", remove: "Entfernen",
    gallery: "Weitere Bilder", galleryHint: "Bis zu 6 zusätzliche Bilder.", addGallery: "+ Bilder hinzufügen",
    language: "Hauptsprache des Events", communication: "Event-Kommunikation", communicationDesc: "Wähle, wie Teilnehmende während des Events kommunizieren.", groupChat: "Gruppenchat", announcementsOnly: "Nur Ankündigungen", noChat: "Kein Chat",
    communicationHint: "Gruppenchat eignet sich für kleine und mittlere Events. Große Events können nur Ankündigungen nutzen oder den Chat deaktivieren.",
    create: "Event veröffentlichen", creating: "Event und Bilder werden gespeichert…", publishHint: "Nach der Veröffentlichung ist dein Event für Melo-Nutzer sichtbar.",
    required: "Bitte alle Pflichtfelder ausfüllen", endBeforeStart: "Das Ende muss nach dem Beginn liegen", imageTooLarge: "Bilder dürfen höchstens 12 MB groß sein", imageType: "Bitte Bilddatei wählen", imageLimit: "Bis zu 6 weitere Bilder",
  },
  zh: {
    back: "返回活动", title: "创建活动", subtitle: "在一个页面中设置地点、时间、图片和活动沟通方式。",
    basic: "活动信息", category: "活动类型", name: "活动名称 *", description: "详情 *",
    location: "地点", findLocation: "查找活动地点", findLocationDesc: "搜索或输入地点名称，然后填写下方的地点详情。", searchPlace: "搜索地点，例如 CentralWorld、Chiang Mai", searchingPlaces: "正在搜索地点…", noPlaces: "未找到匹配的地点", useCurrentLocation: "使用当前位置", locating: "正在获取位置…", locationFailed: "无法获取当前位置",
    locationDetails: "地点详情", venue: "场地名称 *", address: "地址 / 集合点", city: "城市 / 省 *", country: "国家 *",
    schedule: "日期和时间", startDate: "开始日期 *", startTime: "时间 *", endDate: "结束日期 *", endTime: "时间 *", capacity: "人数上限", price: "人均价格", freeHint: "免费则留空",
    media: "活动图片", mediaDesc: "添加主图和活动辅助图片。", cover: "主图", coverHint: "显示在活动卡片和详情页。", chooseCover: "添加图片", replaceCover: "更换图片", remove: "删除",
    gallery: "更多图片", galleryHint: "最多添加 6 张辅助图片。", addGallery: "+ 添加图片",
    language: "活动主要语言", communication: "活动沟通", communicationDesc: "选择参与者在活动中的沟通方式。", groupChat: "群聊", announcementsOnly: "仅公告", noChat: "无聊天",
    communicationHint: "小型和中型活动推荐群聊；大型活动可仅使用公告或关闭聊天。",
    create: "发布活动", creating: "正在创建并上传图片…", publishHint: "发布后，Melo 用户将可以看到你的活动。",
    required: "请填写所有必填信息", endBeforeStart: "结束时间必须晚于开始时间", imageTooLarge: "图片不能超过 12 MB", imageType: "请选择图片文件", imageLimit: "最多 6 张附加图片",
  },
  ja: {
    back: "Event一覧へ戻る", title: "Eventを作成", subtitle: "場所、日時、写真、コミュニケーション設定を1か所で作成します。",
    basic: "Event情報", category: "Eventタイプ", name: "Event名 *", description: "詳細 *",
    location: "場所", findLocation: "Eventの場所を探す", findLocationDesc: "場所を検索または入力し、下の場所情報を完成させてください。", searchPlace: "場所を検索（例：CentralWorld、Chiang Mai）", searchingPlaces: "場所を検索中…", noPlaces: "一致する場所が見つかりません", useCurrentLocation: "現在地を使用", locating: "位置情報を取得中…", locationFailed: "現在地を取得できません",
    locationDetails: "場所の詳細", venue: "会場名 *", address: "住所 / 集合場所", city: "都市 / 地域 *", country: "国 *",
    schedule: "日付と時間", startDate: "開始日 *", startTime: "時間 *", endDate: "終了日 *", endTime: "時間 *", capacity: "定員", price: "1人あたり料金", freeHint: "無料の場合は空欄",
    media: "Event写真", mediaDesc: "メイン画像と追加写真を設定します。", cover: "メイン画像", coverHint: "Eventカードと詳細ページに表示されます。", chooseCover: "画像を追加", replaceCover: "画像を変更", remove: "削除",
    gallery: "追加写真", galleryHint: "最大6枚の写真を追加できます。", addGallery: "+ 写真を追加",
    language: "Eventのメイン言語", communication: "Eventコミュニケーション", communicationDesc: "参加者のコミュニケーション方法を選択します。", groupChat: "グループチャット", announcementsOnly: "お知らせのみ", noChat: "チャットなし",
    communicationHint: "小・中規模Eventにはグループチャットがおすすめです。大規模Eventではお知らせのみ、またはチャットなしを選べます。",
    create: "Eventを公開", creating: "Eventと写真を保存中…", publishHint: "公開後、MeloユーザーにEventが表示されます。",
    required: "必須項目を入力してください", endBeforeStart: "終了時間は開始時間より後にしてください", imageTooLarge: "画像は12MB以下にしてください", imageType: "画像ファイルを選択してください", imageLimit: "追加画像は最大6枚",
  },
  ko: {
    back: "이벤트 목록으로", title: "이벤트 만들기", subtitle: "장소, 일정, 사진, 커뮤니케이션 설정을 한곳에서 구성하세요.",
    basic: "이벤트 정보", category: "이벤트 유형", name: "이벤트 이름 *", description: "상세 내용 *",
    location: "장소", findLocation: "이벤트 장소 찾기", findLocationDesc: "장소를 검색하거나 입력한 뒤 아래 장소 정보를 완성하세요.", searchPlace: "장소 검색 (예: CentralWorld, Chiang Mai)", searchingPlaces: "장소 검색 중…", noPlaces: "일치하는 장소가 없습니다", useCurrentLocation: "현재 위치 사용", locating: "위치 확인 중…", locationFailed: "현재 위치를 가져올 수 없습니다",
    locationDetails: "장소 상세", venue: "장소 이름 *", address: "주소 / 만남 장소", city: "도시 / 지역 *", country: "국가 *",
    schedule: "날짜 및 시간", startDate: "시작 날짜 *", startTime: "시간 *", endDate: "종료 날짜 *", endTime: "시간 *", capacity: "정원", price: "1인 가격", freeHint: "무료이면 비워 두세요",
    media: "이벤트 사진", mediaDesc: "대표 이미지와 추가 사진을 설정하세요.", cover: "대표 이미지", coverHint: "이벤트 카드와 상세 페이지에 표시됩니다.", chooseCover: "이미지 추가", replaceCover: "이미지 변경", remove: "삭제",
    gallery: "추가 사진", galleryHint: "최대 6장의 사진을 추가할 수 있습니다.", addGallery: "+ 사진 추가",
    language: "이벤트 주요 언어", communication: "이벤트 커뮤니케이션", communicationDesc: "참가자가 이벤트에서 소통하는 방식을 선택하세요.", groupChat: "그룹 채팅", announcementsOnly: "공지 전용", noChat: "채팅 없음",
    communicationHint: "소규모·중규모 이벤트에는 그룹 채팅을 권장합니다. 대규모 이벤트는 공지 전용 또는 채팅 없음을 선택할 수 있습니다.",
    create: "이벤트 게시", creating: "이벤트와 사진 저장 중…", publishHint: "게시 후 Melo 사용자에게 이벤트가 표시됩니다.",
    required: "필수 정보를 모두 입력하세요", endBeforeStart: "종료 시간은 시작 시간보다 늦어야 합니다", imageTooLarge: "이미지는 12MB 이하여야 합니다", imageType: "이미지 파일을 선택하세요", imageLimit: "추가 이미지는 최대 6장",
  },
} as const;

const LANGUAGE_OPTIONS = [
  ["th", "ไทย"], ["en", "English"], ["de", "Deutsch"], ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"],
] as const;

type ChatMode = "group" | "announcement_only" | "disabled";

function categoryLabel(locale: string, value: string) {
  return CATEGORY_LABELS[locale]?.[value] || CATEGORY_LABELS.en[value] || value;
}

function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url ? <img src={url} alt="" /> : null;
}

function localDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export default function CreateEventWebExperience() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;

  const [category, setCategory] = useState("friends_social");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Thailand");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [capacity, setCapacity] = useState("20");
  const [price, setPrice] = useState("");
  const [language, setLanguage] = useState(locale === "th" ? "th" : "en");
  const [chatMode, setChatMode] = useState<ChatMode>("group");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function mediaError(cause: unknown) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "IMAGE_TOO_LARGE") return copy.imageTooLarge;
    if (message === "IMAGE_REQUIRED") return copy.imageType;
    return message || copy.required;
  }

  function onCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    try {
      validateActivityImage(file);
      setCoverFile(file);
      setError("");
    } catch (cause) {
      setError(mediaError(cause));
    }
  }

  function chooseEventPlace(place: PlaceSearchResult) {
    setVenue(place.name || place.address);
    setAddress(place.address || place.name);
    if (place.city || place.region || place.state) setCity(place.city || place.region || place.state);
    if (place.country) setCountry(place.country);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setError("");
  }

  async function useCurrentLocation() {
    if (locating) return;
    setLocating(true);
    setError("");
    try {
      const place = await getCurrentMeloPlace({ locale, fallbackLabel: copy.useCurrentLocation });
      setVenue(place.name || copy.useCurrentLocation);
      setAddress(place.address || place.shortAddress || place.name);
      if (place.city || place.region || place.state) setCity(place.city || place.region || place.state);
      if (place.country) setCountry(place.country);
      setLatitude(place.latitude);
      setLongitude(place.longitude);
    } catch {
      setError(copy.locationFailed);
    } finally {
      setLocating(false);
    }
  }

  function onGallery(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;

    try {
      files.forEach(validateActivityImage);
      setGalleryFiles((current) => [...current, ...files].slice(0, 6));
      setError(galleryFiles.length + files.length > 6 ? copy.imageLimit : "");
    } catch (cause) {
      setError(mediaError(cause));
    }
  }

  async function create() {
    setError("");

    const startAt = localDateTime(startDate, startTime);
    const endAt = localDateTime(endDate, endTime);

    if (
      !category || !title.trim() || !description.trim() || !venue.trim() || !city.trim() || !country.trim() ||
      !startAt || !endAt || !Number(capacity)
    ) {
      setError(copy.required);
      return;
    }

    if (endAt.getTime() <= startAt.getTime()) {
      setError(copy.endBeforeStart);
      return;
    }

    setBusy(true);

    const result = await rpcRequest<string>("create_event", {
      p_category: category,
      p_title: title.trim(),
      p_description: description.trim(),
      p_venue_name: venue.trim(),
      p_address: address.trim(),
      p_city: city.trim(),
      p_country: country.trim(),
      p_start_at: startAt.toISOString(),
      p_end_at: endAt.toISOString(),
      p_capacity: Math.max(1, Math.round(Number(capacity))),
      p_price_per_person: price.trim() ? Number(price) : null,
      p_primary_language: language,
    });

    if (result.error || !result.data) {
      setBusy(false);
      setError(result.error || copy.required);
      return;
    }

    const eventId = String(result.data);

    try {
      await updateActivityCreationFields({ kind: "event", activityId: eventId, membershipOpen: true });
      await saveEventLocationCoordinatesWeb(eventId, { latitude, longitude });
      await updateEventChatModeWeb(eventId, chatMode);
      await saveActivityCoverWeb({ kind: "event", activityId: eventId, coverFile });
      await saveActivityGalleryWeb({ kind: "event", activityId: eventId, files: galleryFiles });
      router.replace(`/events/${eventId}`);
    } catch (cause) {
      setBusy(false);
      setError(mediaError(cause));
    }
  }

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.shell}>
        <header className={styles.hero}>
          <Link href="/events">‹ {copy.back}</Link>
          <span>MELO EVENTS</span>
          <div className={styles.heroTitleRow}>
            <i className={styles.heroIcon}>✦</i>
            <h1>{copy.title}</h1>
          </div>
          <p>{copy.subtitle}</p>
        </header>

        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void create(); }}>
          <div className={styles.mainColumn}>
            <section className={`${styles.block} ${styles.basicBlock}`}>
              <div className={styles.sectionHeading}>
                <span className={styles.stepNumber}>01</span>
                <div><h2>{copy.basic}</h2></div>
              </div>

              <div className={styles.basicTopGrid}>
                <label className={styles.field}>
                  <span>{copy.category}</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {EVENT_CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(locale, item)}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>{copy.name}</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>
              </div>

              <label className={styles.field}>
                <span>{copy.description}</span>
                <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>
            </section>

            <section className={`${styles.block} ${styles.locationBlock}`}>
              <div className={styles.sectionHeading}>
                <span className={styles.stepNumber}>02</span>
                <div><h2>{copy.location}</h2></div>
              </div>

              <div className={styles.locationSearchBlock}>
                <strong>{copy.findLocation}</strong>
                <p>{copy.findLocationDesc}</p>
                <PlaceSearchInput
                  value={venue}
                  onChange={(value)=>{setVenue(value);setLatitude(null);setLongitude(null)}}
                  onSelect={chooseEventPlace}
                  placeholder={copy.searchPlace}
                  locale={locale}
                  regionCode={country}
                  latitude={latitude}
                  longitude={longitude}
                  searchingLabel={copy.searchingPlaces}
                  noResultsLabel={copy.noPlaces}
                />
                <div className={styles.locationSelectMeta}>
                  <button type="button" className={styles.currentLocationButton} onClick={()=>void useCurrentLocation()} disabled={locating}>{locating?copy.locating:`⌖ ${copy.useCurrentLocation}`}</button>
                  {latitude!=null&&longitude!=null?<small>{latitude.toFixed(5)}, {longitude.toFixed(5)}</small>:null}
                </div>
              </div>

              <div className={styles.subHeading}>{copy.locationDetails}</div>
              <div className={styles.locationGrid}>
                <label className={styles.field}>
                  <span>{copy.venue}</span>
                  <input value={venue} onChange={(event) => setVenue(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>{copy.address}</span>
                  <input value={address} onChange={(event) => setAddress(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>{copy.city}</span>
                  <input value={city} onChange={(event) => setCity(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>{copy.country}</span>
                  <input value={country} onChange={(event) => setCountry(event.target.value)} />
                </label>
              </div>
            </section>

            <section className={`${styles.block} ${styles.scheduleBlock}`}>
              <div className={styles.sectionHeading}>
                <span className={styles.stepNumber}>03</span>
                <div><h2>{copy.schedule}</h2></div>
              </div>

              <div className={styles.scheduleGrid}>
                <label className={styles.field}><span>{copy.startDate}</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
                <label className={styles.field}><span>{copy.startTime}</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
                <label className={styles.field}><span>{copy.endDate}</span><input type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
                <label className={styles.field}><span>{copy.endTime}</span><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
                <label className={styles.field}><span>{copy.capacity}</span><input type="number" min="1" max="5000" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label>
                <label className={styles.field}><span>{copy.price}</span><input type="number" min="0" placeholder={copy.freeHint} value={price} onChange={(event) => setPrice(event.target.value)} /></label>
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <section className={`${styles.block} ${styles.mediaBlock}`}>
              <div className={styles.sectionHeading}>
                <div><h2>{copy.media}</h2><p>{copy.mediaDesc}</p></div>
              </div>

              <div className={styles.mediaLabel}><strong>{copy.cover}</strong><small>{copy.coverHint}</small></div>
              <label className={styles.coverBox}>
                {coverFile ? <Preview file={coverFile} /> : <span className={styles.emptyMedia}><b>▣</b><strong>{copy.chooseCover}</strong></span>}
                <input type="file" accept="image/*" onChange={onCover} />
              </label>
              <div className={styles.coverActions}>
                <label className={styles.primaryUpload}>{coverFile ? copy.replaceCover : copy.chooseCover}<input type="file" accept="image/*" onChange={onCover} /></label>
                {coverFile ? <button type="button" onClick={() => setCoverFile(null)}>{copy.remove}</button> : null}
              </div>
            </section>

            <section className={`${styles.block} ${styles.galleryBlock}`}>
              <div className={styles.labelWithCount}>
                <div><h2>{copy.gallery}</h2><p>{copy.galleryHint}</p></div>
                <b>{galleryFiles.length}/6</b>
              </div>
              {galleryFiles.length ? (
                <div className={styles.galleryGrid}>
                  {galleryFiles.map((file, index) => (
                    <div className={styles.galleryItem} key={`${file.name}-${file.lastModified}-${index}`}>
                      <Preview file={file} />
                      <button type="button" aria-label={copy.remove} onClick={() => setGalleryFiles((current) => current.filter((_, i) => i !== index))}>×</button>
                    </div>
                  ))}
                </div>
              ) : <div className={styles.galleryEmpty}><b>▣</b><strong>{copy.gallery}</strong></div>}
              {galleryFiles.length < 6 ? <label className={styles.secondaryUpload}>{copy.addGallery}<input type="file" accept="image/*" multiple onChange={onGallery} /></label> : null}
            </section>

            <section className={`${styles.block} ${styles.languageBlock}`}>
              <h2>{copy.language}</h2>
              <div className={styles.languageChips}>
                {LANGUAGE_OPTIONS.map(([value, label]) => <button type="button" key={value} className={language === value ? styles.languageActive : ""} onClick={() => setLanguage(value)}>{label}</button>)}
              </div>
            </section>

            <section className={`${styles.block} ${styles.communicationBlock}`}>
              <h2>{copy.communication}</h2>
              <p>{copy.communicationDesc}</p>
              <div className={styles.communicationOptions}>
                <button type="button" className={chatMode === "group" ? styles.communicationActive : ""} onClick={() => setChatMode("group")}>{copy.groupChat}</button>
                <button type="button" className={chatMode === "announcement_only" ? styles.communicationActive : ""} onClick={() => setChatMode("announcement_only")}>{copy.announcementsOnly}</button>
                <button type="button" className={chatMode === "disabled" ? styles.communicationActive : ""} onClick={() => setChatMode("disabled")}>{copy.noChat}</button>
              </div>
              <small>{copy.communicationHint}</small>
            </section>

            {error ? <div className={styles.error}>{error}</div> : null}
            <button type="submit" className={styles.publish} disabled={busy}>{busy ? copy.creating : copy.create}</button>
            <p className={styles.publishHint}>{copy.publishHint}</p>
          </aside>
        </form>
      </section>
    </main>
  );
}

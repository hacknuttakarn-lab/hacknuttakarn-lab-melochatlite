"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import { publicStorageUrl } from "@/lib/supabase/browser";
import {
  arrayOf,
  firstValue,
  loadDisplayNameChangeStatus,
  loadOwnProfile,
  profileCoverUrl,
  profileMediaPosition,
  profilePhotoUrl,
  removeProfilePhotoWeb,
  updateOwnProfile,
  updateProfileMediaPositions,
  uploadProfileCoverWeb,
  uploadProfilePhotoWeb,
  type MediaPosition,
  type OwnProfileSnapshot,
} from "./profileWebData";
import styles from "./EditProfileExperience.module.css";

const MAX_PHOTOS = 6;
const MAX_INTERESTS = 8;
const MAX_ABOUT = 500;
const INTERESTS = ["Travel", "Coffee", "Technology", "Music", "Business", "Food", "Fitness", "Movies"] as const;
const UI_LANGUAGES = [
  ["th", "ไทย / Thai"], ["en", "English"], ["de", "Deutsch"],
  ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"],
] as const;

const INTEREST_LABELS: Record<string, Record<string, string>> = {
  th: { Travel: "ท่องเที่ยว", Coffee: "กาแฟ", Technology: "เทคโนโลยี", Music: "ดนตรี", Business: "ธุรกิจ", Food: "อาหาร", Fitness: "ออกกำลังกาย", Movies: "ภาพยนตร์" },
  en: { Travel: "Travel", Coffee: "Coffee", Technology: "Technology", Music: "Music", Business: "Business", Food: "Food", Fitness: "Fitness", Movies: "Movies" },
  de: { Travel: "Reisen", Coffee: "Kaffee", Technology: "Technologie", Music: "Musik", Business: "Business", Food: "Essen", Fitness: "Fitness", Movies: "Filme" },
  zh: { Travel: "旅行", Coffee: "咖啡", Technology: "科技", Music: "音乐", Business: "商业", Food: "美食", Fitness: "健身", Movies: "电影" },
  ja: { Travel: "旅行", Coffee: "コーヒー", Technology: "テクノロジー", Music: "音楽", Business: "ビジネス", Food: "グルメ", Fitness: "フィットネス", Movies: "映画" },
  ko: { Travel: "여행", Coffee: "커피", Technology: "기술", Music: "음악", Business: "비즈니스", Food: "음식", Fitness: "운동", Movies: "영화" },
};

const COPY = {
  th: {
    title: "แก้ไขโปรไฟล์", subtitle: "จัดการข้อมูลโปรไฟล์ Melo ให้ครบและเหมาะกับการแสดงผลบนเว็บ",
    back: "กลับโปรไฟล์", save: "บันทึกการเปลี่ยนแปลง", saving: "กำลังบันทึก…", saved: "บันทึกแล้ว",
    mediaTitle: "รูปโปรไฟล์และรูปหน้าปก", mediaDesc: "ลากรูปเพื่อขยับตำแหน่งที่ต้องการให้แสดงบนเว็บ ตำแหน่งนี้ไม่แก้ไฟล์ภาพต้นฉบับ",
    cover: "รูปหน้าปก", mainPhoto: "รูปหลัก", changeCover: "เปลี่ยนรูปปก", changePhoto: "เปลี่ยนรูป", addPhoto: "เพิ่มรูป",
    removePhoto: "ลบรูป", dragHint: "ลากบนรูปเพื่อจัดตำแหน่ง", horizontal: "แนวนอน", vertical: "แนวตั้ง", center: "จัดกึ่งกลาง",
    photosTitle: "รูปโปรไฟล์", photosDesc: "เพิ่มรูปได้สูงสุด 6 รูป โดยรูปที่ 1 เป็นรูปหลักเหมือนในแอป",
    basicTitle: "ข้อมูลพื้นฐาน", displayName: "ชื่อที่แสดง", gender: "เพศของคุณ", woman: "ผู้หญิง", man: "ผู้ชาย", lgbtq: "LGBTQ+",
    birthDate: "วันเดือนปีเกิด", calculatedAge: "อายุที่ระบบคำนวณ", years: "ปี", nationality: "สัญชาติของคุณ",
    primaryLanguage: "ภาษาหลัก", country: "ประเทศที่อาศัยอยู่", province: "จังหวัด / รัฐ", city: "เมือง / อำเภอ (ไม่บังคับ)", height: "ส่วนสูง",
    aboutTitle: "เกี่ยวกับฉัน", aboutDesc: "เล่าเกี่ยวกับตัวคุณอย่างน้อย 20 ตัวอักษร", aboutPlaceholder: "เล่าเรื่องของคุณ ไลฟ์สไตล์ หรือสิ่งที่สนใจ...",
    workTitle: "งานและการศึกษา", job: "อาชีพ", company: "บริษัท / องค์กร (ไม่บังคับ)", education: "การศึกษา",
    lifestyleTitle: "ไลฟ์สไตล์", drinking: "การดื่ม", smoking: "การสูบบุหรี่", exercise: "การออกกำลังกาย", pets: "สัตว์เลี้ยง",
    never: "ไม่", socially: "เข้าสังคม", often: "บ่อย", sometimes: "บางครั้ง", yes: "ใช่", daily: "ทุกวัน", dog: "สุนัข", cat: "แมว", both: "ทั้งคู่", none: "ไม่มี",
    interestsTitle: "ความสนใจ", interestsDesc: "เลือกได้สูงสุด 8 รายการ", safetyTitle: "ข้อมูลโปรไฟล์ของคุณ", safetyText: "ข้อมูลส่วนตัวที่ละเอียดอ่อนจะไม่ถูกเพิ่มลงหน้าโปรไฟล์สาธารณะโดยอัตโนมัติ",
    required: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ", photoRequired: "ต้องมีรูปโปรไฟล์อย่างน้อย 1 รูป", adultRequired: "ผู้ใช้ต้องมีอายุอย่างน้อย 18 ปี",
    bioRequired: "เกี่ยวกับฉันต้องมีอย่างน้อย 20 ตัวอักษร", imageError: "ไม่สามารถอัปโหลดรูปภาพได้", largeImage: "ไฟล์รูปต้องมีขนาดไม่เกิน 12 MB",
    nameCooldown: "ชื่อที่แสดงเปลี่ยนได้ทุก 14 วัน", nextNameChange: "เปลี่ยนชื่อได้อีกครั้งวันที่", error: "บันทึกข้อมูลไม่สำเร็จ", login: "กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์", loginButton: "เข้าสู่ระบบ",
  },
  en: {
    title: "Edit profile", subtitle: "Keep your Melo profile complete and optimized for the web",
    back: "Back to profile", save: "Save changes", saving: "Saving…", saved: "Saved",
    mediaTitle: "Profile & cover photos", mediaDesc: "Drag the image to choose the focal position used on the web. This does not modify the original file.",
    cover: "Cover photo", mainPhoto: "Main photo", changeCover: "Change cover", changePhoto: "Change photo", addPhoto: "Add photo",
    removePhoto: "Remove", dragHint: "Drag on the image to reposition", horizontal: "Horizontal", vertical: "Vertical", center: "Center",
    photosTitle: "Profile photos", photosDesc: "Add up to 6 photos. Photo 1 is the main photo, matching the app.",
    basicTitle: "Basic information", displayName: "Display name", gender: "Your gender", woman: "Woman", man: "Man", lgbtq: "LGBTQ+",
    birthDate: "Date of birth", calculatedAge: "Calculated age", years: "years", nationality: "Your nationality",
    primaryLanguage: "Primary language", country: "Country of residence", province: "Province / State", city: "City / District (optional)", height: "Height",
    aboutTitle: "About me", aboutDesc: "Tell people about yourself in at least 20 characters", aboutPlaceholder: "Share your story, lifestyle or interests...",
    workTitle: "Work & education", job: "Job", company: "Company / Organization (optional)", education: "Education",
    lifestyleTitle: "Lifestyle", drinking: "Drinking", smoking: "Smoking", exercise: "Exercise", pets: "Pets",
    never: "Never", socially: "Socially", often: "Often", sometimes: "Sometimes", yes: "Yes", daily: "Daily", dog: "Dog", cat: "Cat", both: "Both", none: "None",
    interestsTitle: "Interests", interestsDesc: "Choose up to 8 interests", safetyTitle: "Your profile data", safetyText: "Detailed sensitive information is not automatically added to your public profile.",
    required: "Please complete all required information", photoRequired: "At least one profile photo is required", adultRequired: "Users must be at least 18 years old",
    bioRequired: "About me must contain at least 20 characters", imageError: "Unable to upload image", largeImage: "Images must be no larger than 12 MB",
    nameCooldown: "Display name can be changed every 14 days", nextNameChange: "You can change your name again on", error: "Unable to save profile", login: "Sign in before editing your profile", loginButton: "Sign in",
  },
  de: {
    title: "Profil bearbeiten", subtitle: "Vervollständige dein Melo-Profil und optimiere es für das Web",
    back: "Zurück zum Profil", save: "Änderungen speichern", saving: "Speichern…", saved: "Gespeichert",
    mediaTitle: "Profil- & Titelbild", mediaDesc: "Ziehe das Bild, um den Ausschnitt für das Web festzulegen. Die Originaldatei bleibt unverändert.",
    cover: "Titelbild", mainPhoto: "Hauptfoto", changeCover: "Titelbild ändern", changePhoto: "Foto ändern", addPhoto: "Foto hinzufügen", removePhoto: "Entfernen", dragHint: "Bild ziehen, um es auszurichten", horizontal: "Horizontal", vertical: "Vertikal", center: "Zentrieren",
    photosTitle: "Profilfotos", photosDesc: "Bis zu 6 Fotos. Foto 1 ist wie in der App das Hauptfoto.", basicTitle: "Grunddaten", displayName: "Anzeigename", gender: "Geschlecht", woman: "Frau", man: "Mann", lgbtq: "LGBTQ+", birthDate: "Geburtsdatum", calculatedAge: "Berechnetes Alter", years: "Jahre", nationality: "Nationalität", primaryLanguage: "Hauptsprache", country: "Wohnsitzland", province: "Region", city: "Stadt / Bezirk (optional)", height: "Größe",
    aboutTitle: "Über mich", aboutDesc: "Beschreibe dich in mindestens 20 Zeichen", aboutPlaceholder: "Erzähle etwas über dich...", workTitle: "Arbeit & Ausbildung", job: "Beruf", company: "Unternehmen (optional)", education: "Ausbildung", lifestyleTitle: "Lifestyle", drinking: "Alkohol", smoking: "Rauchen", exercise: "Sport", pets: "Haustiere", never: "Nie", socially: "Gesellig", often: "Oft", sometimes: "Manchmal", yes: "Ja", daily: "Täglich", dog: "Hund", cat: "Katze", both: "Beides", none: "Keine", interestsTitle: "Interessen", interestsDesc: "Bis zu 8 auswählen", safetyTitle: "Deine Profildaten", safetyText: "Detaillierte sensible Daten werden nicht automatisch öffentlich angezeigt.", required: "Bitte alle Pflichtfelder ausfüllen", photoRequired: "Mindestens ein Profilfoto ist erforderlich", adultRequired: "Mindestalter 18 Jahre", bioRequired: "Über mich benötigt mindestens 20 Zeichen", imageError: "Bild konnte nicht hochgeladen werden", largeImage: "Bilder dürfen höchstens 12 MB groß sein", nameCooldown: "Anzeigename kann alle 14 Tage geändert werden", nextNameChange: "Namensänderung wieder möglich am", error: "Profil konnte nicht gespeichert werden", login: "Bitte zuerst anmelden", loginButton: "Anmelden",
  },
  zh: {
    title: "编辑资料", subtitle: "完善 Melo 个人资料并优化网页显示", back: "返回个人资料", save: "保存更改", saving: "正在保存…", saved: "已保存",
    mediaTitle: "头像与封面", mediaDesc: "拖动图片调整网页中的显示位置，不会修改原图。", cover: "封面图片", mainPhoto: "主头像", changeCover: "更换封面", changePhoto: "更换图片", addPhoto: "添加图片", removePhoto: "删除", dragHint: "拖动图片调整位置", horizontal: "水平", vertical: "垂直", center: "居中",
    photosTitle: "个人照片", photosDesc: "最多 6 张，第 1 张与 App 一样作为主头像。", basicTitle: "基本资料", displayName: "显示名称", gender: "性别", woman: "女性", man: "男性", lgbtq: "LGBTQ+", birthDate: "出生日期", calculatedAge: "系统计算年龄", years: "岁", nationality: "国籍", primaryLanguage: "主要语言", country: "居住国家", province: "省 / 州", city: "城市 / 区（可选）", height: "身高",
    aboutTitle: "关于我", aboutDesc: "至少 20 个字符介绍自己", aboutPlaceholder: "分享你的故事、生活方式或兴趣...", workTitle: "工作与教育", job: "职业", company: "公司 / 机构（可选）", education: "教育", lifestyleTitle: "生活方式", drinking: "饮酒", smoking: "吸烟", exercise: "运动", pets: "宠物", never: "从不", socially: "社交场合", often: "经常", sometimes: "有时", yes: "是", daily: "每天", dog: "狗", cat: "猫", both: "都有", none: "没有", interestsTitle: "兴趣", interestsDesc: "最多选择 8 项", safetyTitle: "你的资料", safetyText: "敏感的详细信息不会自动显示在公开资料中。", required: "请填写所有必填信息", photoRequired: "至少需要 1 张头像", adultRequired: "用户必须年满 18 岁", bioRequired: "关于我至少需要 20 个字符", imageError: "图片上传失败", largeImage: "图片大小不能超过 12 MB", nameCooldown: "显示名称每 14 天可修改一次", nextNameChange: "可再次修改名称的日期", error: "资料保存失败", login: "请登录后编辑资料", loginButton: "登录",
  },
  ja: {
    title: "プロフィールを編集", subtitle: "Meloプロフィールを完成させ、Web表示を最適化します", back: "プロフィールへ戻る", save: "変更を保存", saving: "保存中…", saved: "保存しました",
    mediaTitle: "プロフィール・カバー画像", mediaDesc: "画像をドラッグしてWebで表示する位置を調整できます。元画像は変更されません。", cover: "カバー画像", mainPhoto: "メイン写真", changeCover: "カバーを変更", changePhoto: "写真を変更", addPhoto: "写真を追加", removePhoto: "削除", dragHint: "画像をドラッグして位置を調整", horizontal: "横", vertical: "縦", center: "中央",
    photosTitle: "プロフィール写真", photosDesc: "最大6枚。1枚目がAppと同じメイン写真です。", basicTitle: "基本情報", displayName: "表示名", gender: "性別", woman: "女性", man: "男性", lgbtq: "LGBTQ+", birthDate: "生年月日", calculatedAge: "計算された年齢", years: "歳", nationality: "国籍", primaryLanguage: "メイン言語", country: "居住国", province: "都道府県 / 州", city: "市区町村（任意）", height: "身長",
    aboutTitle: "自己紹介", aboutDesc: "20文字以上で自己紹介してください", aboutPlaceholder: "あなたのこと、ライフスタイル、興味を紹介...", workTitle: "仕事・学歴", job: "職業", company: "会社 / 組織（任意）", education: "学歴", lifestyleTitle: "ライフスタイル", drinking: "飲酒", smoking: "喫煙", exercise: "運動", pets: "ペット", never: "しない", socially: "付き合い程度", often: "よく", sometimes: "時々", yes: "はい", daily: "毎日", dog: "犬", cat: "猫", both: "両方", none: "なし", interestsTitle: "興味", interestsDesc: "最大8つ選択", safetyTitle: "プロフィールデータ", safetyText: "詳細なセンシティブ情報は公開プロフィールに自動表示されません。", required: "必須項目を入力してください", photoRequired: "プロフィール写真が1枚以上必要です", adultRequired: "18歳以上である必要があります", bioRequired: "自己紹介は20文字以上必要です", imageError: "画像をアップロードできません", largeImage: "画像は12MB以下にしてください", nameCooldown: "表示名は14日ごとに変更できます", nextNameChange: "次に名前を変更できる日", error: "保存できませんでした", login: "編集するにはログインしてください", loginButton: "ログイン",
  },
  ko: {
    title: "프로필 수정", subtitle: "Melo 프로필을 완성하고 웹 표시에 맞게 조정하세요", back: "프로필로 돌아가기", save: "변경 저장", saving: "저장 중…", saved: "저장됨",
    mediaTitle: "프로필 및 커버 사진", mediaDesc: "사진을 드래그해 웹에 표시할 위치를 조정할 수 있습니다. 원본 파일은 변경되지 않습니다.", cover: "커버 사진", mainPhoto: "대표 사진", changeCover: "커버 변경", changePhoto: "사진 변경", addPhoto: "사진 추가", removePhoto: "삭제", dragHint: "사진을 드래그해 위치 조정", horizontal: "가로", vertical: "세로", center: "중앙",
    photosTitle: "프로필 사진", photosDesc: "최대 6장. 1번 사진이 앱과 동일한 대표 사진입니다.", basicTitle: "기본 정보", displayName: "표시 이름", gender: "성별", woman: "여성", man: "남성", lgbtq: "LGBTQ+", birthDate: "생년월일", calculatedAge: "계산된 나이", years: "세", nationality: "국적", primaryLanguage: "기본 언어", country: "거주 국가", province: "지역 / 주", city: "도시 / 구역 (선택)", height: "키",
    aboutTitle: "소개", aboutDesc: "20자 이상으로 자신을 소개하세요", aboutPlaceholder: "이야기, 라이프스타일, 관심사를 공유하세요...", workTitle: "직업 및 학력", job: "직업", company: "회사 / 조직 (선택)", education: "학력", lifestyleTitle: "라이프스타일", drinking: "음주", smoking: "흡연", exercise: "운동", pets: "반려동물", never: "안 함", socially: "가끔", often: "자주", sometimes: "때때로", yes: "예", daily: "매일", dog: "강아지", cat: "고양이", both: "둘 다", none: "없음", interestsTitle: "관심사", interestsDesc: "최대 8개 선택", safetyTitle: "프로필 데이터", safetyText: "민감한 상세 정보는 공개 프로필에 자동으로 표시되지 않습니다.", required: "필수 정보를 모두 입력하세요", photoRequired: "프로필 사진이 최소 1장 필요합니다", adultRequired: "만 18세 이상이어야 합니다", bioRequired: "소개는 최소 20자 이상이어야 합니다", imageError: "이미지를 업로드할 수 없습니다", largeImage: "이미지는 12MB 이하여야 합니다", nameCooldown: "표시 이름은 14일마다 변경할 수 있습니다", nextNameChange: "다시 이름을 변경할 수 있는 날짜", error: "프로필 저장 실패", login: "프로필 수정 전에 로그인하세요", loginButton: "로그인",
  },
} as const;

type Locale = keyof typeof COPY;
type FormState = {
  display_name: string; gender: string; date_of_birth: string; nationality: string; primary_language: string;
  country: string; province: string; city: string; height_cm: string; bio: string; job_title: string;
  company: string; education: string; drinking: string; smoking: string; exercise: string; pets: string;
  interests: string[];
};

function calculatedAge(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  if (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) age -= 1;
  return age;
}

function initialForm(snapshot: OwnProfileSnapshot): FormState {
  const p = snapshot.profile || {};
  return {
    display_name: String(firstValue(p, ["display_name"]) || ""),
    gender: String(firstValue(p, ["gender"]) || "female"),
    date_of_birth: String(firstValue(p, ["date_of_birth"]) || "").slice(0, 10),
    nationality: String(firstValue(p, ["nationality"]) || ""),
    primary_language: String(firstValue(p, ["primary_language"]) || "en"),
    country: String(firstValue(p, ["country"]) || ""), province: String(firstValue(p, ["province"]) || ""),
    city: String(firstValue(p, ["city"]) || ""), height_cm: String(firstValue(p, ["height_cm"]) || ""),
    bio: String(firstValue(p, ["bio"]) || ""), job_title: String(firstValue(p, ["job_title"]) || ""),
    company: String(firstValue(p, ["company"]) || ""), education: String(firstValue(p, ["education"]) || ""),
    drinking: String(firstValue(p, ["drinking"]) || "socially"), smoking: String(firstValue(p, ["smoking"]) || "never"),
    exercise: String(firstValue(p, ["exercise"]) || "often"), pets: String(firstValue(p, ["pets"]) || "cat"),
    interests: arrayOf(firstValue(p, ["interests"])).slice(0, MAX_INTERESTS),
  };
}

export default function EditProfileExperience() {
  const { locale } = useLocale();
  const activeLocale = (locale in COPY ? locale : "en") as Locale;
  const t = COPY[activeLocale];
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<OwnProfileSnapshot | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [coverPosition, setCoverPosition] = useState<MediaPosition>({ x: 50, y: 50 });
  const [avatarPosition, setAvatarPosition] = useState<MediaPosition>({ x: 50, y: 50 });
  const [coverUrl, setCoverUrl] = useState("");
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [nameStatus, setNameStatus] = useState<Awaited<ReturnType<typeof loadDisplayNameChangeStatus>>>(null);

  async function reload() {
    setLoading(true);
    const [result, status] = await Promise.all([loadOwnProfile(), loadDisplayNameChangeStatus().catch(() => null)]);
    if (result.error === "AUTH_REQUIRED" || !result.data) {
      setAuthRequired(true); setLoading(false); return;
    }
    const data = result.data;
    setSnapshot(data); setForm(initialForm(data)); setNameStatus(status);
    setCoverPosition(profileMediaPosition(data.userMetadata, "cover"));
    setAvatarPosition(profileMediaPosition(data.userMetadata, "avatar"));
    setCoverUrl(profileCoverUrl(data.profile, data.userMetadata));
    setPhotoPaths(arrayOf(firstValue(data.profile, ["photo_paths"])).slice(0, MAX_PHOTOS));
    setLoading(false);
  }

  useEffect(() => { void reload(); }, []);

  const photoUrls = useMemo(() => photoPaths.map((path) => publicStorageUrl("profile-photos", path)), [photoPaths]);
  const mainPhoto = photoUrls[0] || (snapshot ? profilePhotoUrl(snapshot.profile, 0) : "");
  const age = form ? calculatedAge(form.date_of_birth) : null;
  const nameLocked = Boolean(nameStatus && !nameStatus.canChange && form?.display_name === nameStatus.displayName);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function toggleInterest(value: string) {
    if (!form) return;
    const selected = form.interests.includes(value);
    if (selected) setField("interests", form.interests.filter((item) => item !== value));
    else if (form.interests.length < MAX_INTERESTS) setField("interests", [...form.interests, value]);
  }

  function validate() {
    if (!form) return t.required;
    if (!photoPaths.length) return t.photoRequired;
    if (!form.display_name.trim() || !form.nationality.trim() || !form.primary_language || !form.country.trim() || !form.province.trim()) return t.required;
    if (age === null || age < 18) return t.adultRequired;
    if (form.bio.trim().length < 20) return t.bioRequired;
    return "";
  }

  async function save() {
    if (!snapshot || !form || saving) return;
    const validation = validate();
    if (validation) { setMessage(validation); return; }
    setSaving(true); setMessage("");
    const result = await updateOwnProfile(snapshot.userId, {
      display_name: form.display_name.trim(), gender: form.gender, date_of_birth: form.date_of_birth || null,
      nationality: form.nationality.trim() || null, primary_language: form.primary_language,
      country: form.country.trim() || null, province: form.province.trim() || null, city: form.city.trim() || null,
      height_cm: Number(form.height_cm) || null, bio: form.bio.trim() || null, job_title: form.job_title.trim() || null,
      company: form.company.trim() || null, education: form.education.trim() || null, interests: form.interests,
      drinking: form.drinking, smoking: form.smoking, exercise: form.exercise, pets: form.pets,
      photo_paths: photoPaths,
    });
    if (result.error) {
      setMessage(result.error === "DISPLAY_NAME_CHANGE_COOLDOWN" ? t.nameCooldown : result.error || t.error);
      setSaving(false); return;
    }
    try {
      await updateProfileMediaPositions({ cover: coverPosition, avatar: avatarPosition });
      setMessage(`✓ ${t.saved}`);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.error);
    } finally { setSaving(false); }
  }

  async function onCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (file.size > 12 * 1024 * 1024) { setMessage(t.largeImage); return; }
    setUploading("cover"); setMessage("");
    try { const result = await uploadProfileCoverWeb(file); setCoverUrl(result.url); }
    catch (error) { setMessage(error instanceof Error ? error.message : t.imageError); }
    finally { setUploading(""); }
  }

  async function onPhotoFile(slotIndex: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (file.size > 12 * 1024 * 1024) { setMessage(t.largeImage); return; }
    setUploading(`photo-${slotIndex}`); setMessage("");
    try {
      const result = await uploadProfilePhotoWeb({ file, slotIndex, currentPaths: photoPaths });
      setPhotoPaths(result.paths);
    } catch (error) { setMessage(error instanceof Error ? error.message : t.imageError); }
    finally { setUploading(""); }
  }

  async function removePhoto(index: number) {
    if (photoPaths.length <= 1) { setMessage(t.photoRequired); return; }
    setUploading(`photo-${index}`);
    try { setPhotoPaths(await removeProfilePhotoWeb({ slotIndex: index, currentPaths: photoPaths })); }
    catch (error) { setMessage(error instanceof Error ? error.message : t.error); }
    finally { setUploading(""); }
  }

  if (loading) return <main className={styles.page}><Header /><div className={styles.state}>…</div></main>;
  if (authRequired || !snapshot || !form) return <main className={styles.page}><Header /><div className={styles.state}><strong>{t.login}</strong><Link href="/login">{t.loginButton}</Link></div></main>;

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <header className={styles.hero}>
          <div><Link href="/profile">← {t.back}</Link><h1>{t.title}</h1><p>{t.subtitle}</p></div>
          <button type="button" className={styles.saveTop} onClick={save} disabled={saving}>{saving ? t.saving : t.save}</button>
        </header>
        {message ? <div className={message.startsWith("✓") ? styles.success : styles.error}>{message}</div> : null}

        <section className={styles.section}>
          <div className={styles.sectionHeading}><h2>{t.mediaTitle}</h2><p>{t.mediaDesc}</p></div>
          <div className={styles.mediaGrid}>
            <div className={styles.coverEditorCard}>
              <div className={styles.mediaLabel}><strong>{t.cover}</strong><label className={styles.uploadButton}>{uploading === "cover" ? "…" : t.changeCover}<input type="file" accept="image/*" onChange={onCoverFile} /></label></div>
              <PositionEditor src={coverUrl} fallback="Melo" position={coverPosition} onChange={setCoverPosition} cover t={t} />
            </div>
            <div className={styles.avatarEditorCard}>
              <div className={styles.mediaLabel}><strong>{t.mainPhoto}</strong><label className={styles.uploadButton}>{uploading === "photo-0" ? "…" : t.changePhoto}<input type="file" accept="image/*" onChange={(event) => onPhotoFile(0, event)} /></label></div>
              <PositionEditor src={mainPhoto} fallback={form.display_name.slice(0,1).toUpperCase() || "M"} position={avatarPosition} onChange={setAvatarPosition} t={t} />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><h2>{t.photosTitle}</h2><p>{t.photosDesc}</p></div>
          <div className={styles.photoGrid}>
            {Array.from({ length: MAX_PHOTOS }, (_, index) => {
              const url = photoUrls[index] || "";
              return <div className={`${styles.photoSlot} ${index === 0 ? styles.mainSlot : ""}`} key={index}>
                {url ? <img src={url} alt="" /> : <span>＋</span>}
                <b>{index === 0 ? t.mainPhoto : index + 1}</b>
                <div className={styles.photoActions}>
                  <label>{url ? t.changePhoto : t.addPhoto}<input type="file" accept="image/*" onChange={(event) => onPhotoFile(index, event)} /></label>
                  {url && index > 0 ? <button type="button" onClick={() => removePhoto(index)}>{t.removePhoto}</button> : null}
                </div>
              </div>;
            })}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><h2>{t.basicTitle}</h2></div>
          <div className={styles.card}><div className={styles.formGrid}>
            <Field label={t.displayName} wide value={form.display_name} disabled={nameLocked} onChange={(value) => setField("display_name", value)} helper={nameStatus && !nameStatus.canChange ? `${t.nameCooldown}${nameStatus.nextAllowedAt ? ` · ${t.nextNameChange} ${new Date(nameStatus.nextAllowedAt).toLocaleDateString(activeLocale)}` : ""}` : undefined} />
            <ChoiceField label={t.gender} value={form.gender} onChange={(value) => setField("gender", value)} options={[["female",t.woman],["male",t.man],["lgbtq",t.lgbtq]]} />
            <Field label={t.birthDate} type="date" value={form.date_of_birth} onChange={(value) => setField("date_of_birth", value)} helper={age !== null ? `${t.calculatedAge}: ${age} ${t.years}` : undefined} />
            <Field label={t.nationality} value={form.nationality} onChange={(value) => setField("nationality", value)} />
            <SelectField label={t.primaryLanguage} value={form.primary_language} onChange={(value) => setField("primary_language", value)} options={UI_LANGUAGES as unknown as readonly (readonly [string,string])[]} />
            <Field label={t.country} value={form.country} onChange={(value) => setField("country", value)} />
            <Field label={t.province} value={form.province} onChange={(value) => setField("province", value)} />
            <Field label={t.city} value={form.city} onChange={(value) => setField("city", value)} />
            <Field label={t.height} value={form.height_cm} suffix="cm" inputMode="numeric" onChange={(value) => setField("height_cm", value.replace(/\D/g, "").slice(0,3))} />
          </div></div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><h2>{t.aboutTitle}</h2><p>{t.aboutDesc}</p></div>
          <div className={styles.card}><label className={styles.textareaField}><textarea rows={7} maxLength={MAX_ABOUT} value={form.bio} onChange={(event) => setField("bio", event.target.value)} placeholder={t.aboutPlaceholder} /><small>{form.bio.length}/{MAX_ABOUT}</small></label></div>
        </section>

        <div className={styles.twoColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeading}><h2>{t.workTitle}</h2></div>
            <div className={styles.card}><div className={styles.stack}>
              <Field label={t.job} value={form.job_title} onChange={(value) => setField("job_title", value)} />
              <Field label={t.company} value={form.company} onChange={(value) => setField("company", value)} />
              <Field label={t.education} value={form.education} onChange={(value) => setField("education", value)} />
            </div></div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeading}><h2>{t.lifestyleTitle}</h2></div>
            <div className={styles.card}><div className={styles.stack}>
              <SelectField label={t.drinking} value={form.drinking} onChange={(value) => setField("drinking", value)} options={[["never",t.never],["socially",t.socially],["often",t.often]]} />
              <SelectField label={t.smoking} value={form.smoking} onChange={(value) => setField("smoking", value)} options={[["never",t.never],["sometimes",t.sometimes],["yes",t.yes]]} />
              <SelectField label={t.exercise} value={form.exercise} onChange={(value) => setField("exercise", value)} options={[["sometimes",t.sometimes],["often",t.often],["daily",t.daily]]} />
              <SelectField label={t.pets} value={form.pets} onChange={(value) => setField("pets", value)} options={[["dog",t.dog],["cat",t.cat],["both",t.both],["none",t.none]]} />
            </div></div>
          </section>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><h2>{t.interestsTitle}</h2><p>{t.interestsDesc} ({form.interests.length}/{MAX_INTERESTS})</p></div>
          <div className={styles.card}><div className={styles.interests}>
            {INTERESTS.map((interest) => <button type="button" className={form.interests.includes(interest) ? styles.interestActive : ""} key={interest} onClick={() => toggleInterest(interest)}>{form.interests.includes(interest) ? "✓ " : ""}{INTEREST_LABELS[activeLocale]?.[interest] || interest}</button>)}
          </div></div>
        </section>

        <section className={styles.safetyCard}><span>✓</span><div><strong>{t.safetyTitle}</strong><p>{t.safetyText}</p></div></section>
        <button type="button" className={styles.bottomSave} onClick={save} disabled={saving}>{saving ? t.saving : t.save}</button>
      </section>
    </main>
  );
}

function PositionEditor({ src, fallback, position, onChange, cover = false, t }: { src: string; fallback: string; position: MediaPosition; onChange: (value: MediaPosition) => void; cover?: boolean; t: any }) {
  const [dragging, setDragging] = useState(false);
  function updateFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    onChange({
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    });
  }
  return <div className={styles.positionEditor}>
    <div className={`${styles.positionCanvas} ${cover ? styles.coverCanvas : styles.avatarCanvas}`} onPointerDown={(event) => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); updateFromPointer(event); }} onPointerMove={(event) => { if (dragging) updateFromPointer(event); }} onPointerUp={(event) => { setDragging(false); event.currentTarget.releasePointerCapture(event.pointerId); }}>
      {src ? <img src={src} alt="" draggable={false} style={{ objectPosition: `${position.x}% ${position.y}%` }} /> : <span>{fallback}</span>}
      <em>{t.dragHint}</em>
    </div>
    <div className={styles.positionControls}>
      <label><span>{t.horizontal}</span><input type="range" min="0" max="100" value={Math.round(position.x)} onChange={(event) => onChange({ ...position, x: Number(event.target.value) })} /></label>
      <label><span>{t.vertical}</span><input type="range" min="0" max="100" value={Math.round(position.y)} onChange={(event) => onChange({ ...position, y: Number(event.target.value) })} /></label>
      <button type="button" onClick={() => onChange({ x: 50, y: 50 })}>{t.center}</button>
    </div>
  </div>;
}

function Field({ label, value, onChange, type = "text", wide = false, helper, suffix, disabled, inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean; helper?: string; suffix?: string; disabled?: boolean; inputMode?: "numeric" | "text" }) {
  return <label className={wide ? styles.wide : ""}><span>{label}</span><div className={styles.inputWrap}><input type={type} inputMode={inputMode} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />{suffix ? <b>{suffix}</b> : null}</div>{helper ? <small>{helper}</small> : null}</label>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string,string])[] }) {
  const all = options.some(([key]) => key === value) || !value ? options : ([[value, value], ...options] as const);
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{all.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}
function ChoiceField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string,string])[] }) {
  return <div className={styles.choiceField}><span>{label}</span><div>{options.map(([key,text]) => <button type="button" className={value === key ? styles.choiceActive : ""} key={key} onClick={() => onChange(key)}>{value === key ? "✓ " : ""}{text}</button>)}</div></div>;
}

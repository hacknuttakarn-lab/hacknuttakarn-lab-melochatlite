"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import {
  createCommunityWeb,
  saveCommunityCoverWeb,
  validateCommunityImage,
} from "./communityMediaWeb";
import styles from "./CreateCommunityWebExperience.module.css";

const COMMUNITY_CATEGORIES = [
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
    friends_social: "🤝 เพื่อน & สังคม", pets_animals: "🐾 สัตว์เลี้ยง", food_cafe: "☕ อาหาร & คาเฟ่",
    sports_fitness: "🏃 กีฬา & ฟิตเนส", music_entertainment: "🎵 ดนตรี & บันเทิง", travel_outdoor: "🏕️ ท่องเที่ยว & Outdoor",
    learning_workshop: "📚 เรียนรู้ & Workshop", business_networking: "💼 ธุรกิจ & Networking",
    volunteer_charity: "💛 อาสา & การกุศล", other: "✨ อื่น ๆ",
  },
  en: {
    friends_social: "🤝 Friends & Social", pets_animals: "🐾 Pets & Animals", food_cafe: "☕ Food & Cafe",
    sports_fitness: "🏃 Sports & Fitness", music_entertainment: "🎵 Music & Entertainment", travel_outdoor: "🏕️ Travel & Outdoor",
    learning_workshop: "📚 Learning & Workshop", business_networking: "💼 Business & Networking",
    volunteer_charity: "💛 Volunteer & Charity", other: "✨ Other",
  },
  de: {
    friends_social: "🤝 Freunde & Soziales", pets_animals: "🐾 Haustiere & Tiere", food_cafe: "☕ Essen & Café",
    sports_fitness: "🏃 Sport & Fitness", music_entertainment: "🎵 Musik & Unterhaltung", travel_outdoor: "🏕️ Reisen & Outdoor",
    learning_workshop: "📚 Lernen & Workshop", business_networking: "💼 Business & Networking",
    volunteer_charity: "💛 Ehrenamt & Charity", other: "✨ Andere",
  },
  zh: {
    friends_social: "🤝 朋友与社交", pets_animals: "🐾 宠物与动物", food_cafe: "☕ 美食与咖啡",
    sports_fitness: "🏃 运动与健身", music_entertainment: "🎵 音乐与娱乐", travel_outdoor: "🏕️ 旅行与户外",
    learning_workshop: "📚 学习与工作坊", business_networking: "💼 商务与人脉",
    volunteer_charity: "💛 志愿与公益", other: "✨ 其他",
  },
  ja: {
    friends_social: "🤝 友達 & ソーシャル", pets_animals: "🐾 ペット & 動物", food_cafe: "☕ フード & カフェ",
    sports_fitness: "🏃 スポーツ & フィットネス", music_entertainment: "🎵 音楽 & エンタメ", travel_outdoor: "🏕️ 旅行 & アウトドア",
    learning_workshop: "📚 学び & ワークショップ", business_networking: "💼 ビジネス & ネットワーキング",
    volunteer_charity: "💛 ボランティア & チャリティ", other: "✨ その他",
  },
  ko: {
    friends_social: "🤝 친구 & 소셜", pets_animals: "🐾 반려동물 & 동물", food_cafe: "☕ 음식 & 카페",
    sports_fitness: "🏃 스포츠 & 피트니스", music_entertainment: "🎵 음악 & 엔터테인먼트", travel_outdoor: "🏕️ 여행 & 아웃도어",
    learning_workshop: "📚 학습 & 워크숍", business_networking: "💼 비즈니스 & 네트워킹",
    volunteer_charity: "💛 봉사 & 자선", other: "✨ 기타",
  },
};

const COPY = {
  th: {
    back: "กลับหน้าคอมมูนิตี้", kicker: "MELO COMMUNITIES", title: "สร้างคอมมูนิตี้",
    subtitle: "สร้างพื้นที่สำหรับผู้คนที่มีความสนใจเดียวกัน พร้อมรูปภาพ หมวดหมู่ และรูปแบบการเข้าร่วม",
    basic: "ข้อมูลคอมมูนิตี้", name: "ชื่อคอมมูนิตี้", namePlaceholder: "เช่น Weekend Travelers",
    description: "รายละเอียด", descriptionPlaceholder: "คอมมูนิตี้นี้เหมาะกับใคร และจะมีกิจกรรมหรือพูดคุยเรื่องอะไร?",
    category: "หมวดหมู่", joining: "การเข้าร่วม", joiningDesc: "กำหนดว่าผู้ใช้จะเข้าร่วมคอมมูนิตี้ได้อย่างไร",
    public: "สาธารณะ", private: "ส่วนตัว", publicHint: "ผู้ใช้สามารถเข้าร่วมได้ทันที", privateHint: "ผู้ใช้ต้องได้รับอนุมัติก่อนเข้าร่วม",
    image: "รูปคอมมูนิตี้", imageHint: "เพิ่มรูปปกเพื่อให้คอมมูนิตี้โดดเด่นขึ้นในรายการ",
    emptyImage: "ยังไม่มีรูปคอมมูนิตี้ คลิกเพื่อเลือกรูปปก", addImage: "เพิ่มรูป", changeImage: "เปลี่ยนรูป", remove: "ลบรูป",
    create: "สร้างคอมมูนิตี้", creating: "กำลังสร้างคอมมูนิตี้…", publishHint: "เมื่อสร้างสำเร็จ คอมมูนิตี้จะพร้อมใช้งานตามรูปแบบการเข้าร่วมที่เลือก",
    required: "กรุณากรอกชื่อคอมมูนิตี้", imageTooLarge: "รูปภาพต้องมีขนาดไม่เกิน 12 MB", imageType: "กรุณาเลือกไฟล์รูปภาพ",
  },
  en: {
    back: "Back to Communities", kicker: "MELO COMMUNITIES", title: "Create Community",
    subtitle: "Create a space for people with shared interests, with a cover image, category and joining setting.",
    basic: "Community information", name: "Community name", namePlaceholder: "e.g. Weekend Travelers",
    description: "Description", descriptionPlaceholder: "Who is this group for, and what activities will it have?",
    category: "Category", joining: "Joining", joiningDesc: "Choose how people can join this community.",
    public: "Public", private: "Private", publicHint: "Users can join immediately", privateHint: "Users need approval before joining",
    image: "Community image", imageHint: "Add a cover image so your community looks more attractive in the list.",
    emptyImage: "No community image yet. Click to choose a cover image.", addImage: "Add image", changeImage: "Change image", remove: "Remove image",
    create: "Create Community", creating: "Creating community…", publishHint: "After creation, the community will use the joining setting you selected.",
    required: "Please enter a community name", imageTooLarge: "Images must be no larger than 12 MB", imageType: "Please choose an image file",
  },
  de: {
    back: "Zurück zu Communities", kicker: "MELO COMMUNITIES", title: "Community erstellen",
    subtitle: "Erstelle einen Raum für gemeinsame Interessen mit Titelbild, Kategorie und Beitrittseinstellung.",
    basic: "Community-Informationen", name: "Community-Name", namePlaceholder: "z. B. Weekend Travelers",
    description: "Beschreibung", descriptionPlaceholder: "Für wen ist diese Gruppe gedacht und welche Aktivitäten gibt es?",
    category: "Kategorie", joining: "Beitritt", joiningDesc: "Lege fest, wie Personen dieser Community beitreten können.",
    public: "Öffentlich", private: "Privat", publicHint: "Nutzer können sofort beitreten", privateHint: "Nutzer benötigen vor dem Beitritt eine Freigabe",
    image: "Community-Bild", imageHint: "Füge ein Titelbild hinzu, damit deine Community in der Liste attraktiver wirkt.",
    emptyImage: "Noch kein Community-Bild. Klicke, um ein Titelbild auszuwählen.", addImage: "Bild hinzufügen", changeImage: "Bild ändern", remove: "Bild entfernen",
    create: "Community erstellen", creating: "Community wird erstellt…", publishHint: "Nach dem Erstellen gilt die ausgewählte Beitrittseinstellung.",
    required: "Bitte einen Community-Namen eingeben", imageTooLarge: "Bilder dürfen höchstens 12 MB groß sein", imageType: "Bitte eine Bilddatei auswählen",
  },
  zh: {
    back: "返回社区", kicker: "MELO COMMUNITIES", title: "创建社区",
    subtitle: "为共同兴趣的人创建空间，并设置封面、分类和加入方式。",
    basic: "社区信息", name: "社区名称", namePlaceholder: "例如 Weekend Travelers",
    description: "描述", descriptionPlaceholder: "这个群体适合谁，会有哪些活动或讨论？",
    category: "分类", joining: "加入方式", joiningDesc: "选择用户如何加入这个社区。",
    public: "公开", private: "私密", publicHint: "用户可以立即加入", privateHint: "用户加入前需要获得批准",
    image: "社区图片", imageHint: "添加封面图片，让社区在列表中更吸引人。",
    emptyImage: "尚无社区图片。点击选择封面图片。", addImage: "添加图片", changeImage: "更换图片", remove: "删除图片",
    create: "创建社区", creating: "正在创建社区…", publishHint: "创建后，社区将使用你选择的加入方式。",
    required: "请输入社区名称", imageTooLarge: "图片不能超过 12 MB", imageType: "请选择图片文件",
  },
  ja: {
    back: "Community一覧へ戻る", kicker: "MELO COMMUNITIES", title: "Communityを作成",
    subtitle: "共通の興味を持つ人のための場所を、カバー画像・カテゴリ・参加設定とともに作成します。",
    basic: "Community情報", name: "Community名", namePlaceholder: "例：Weekend Travelers",
    description: "説明", descriptionPlaceholder: "このグループは誰向けで、どんな活動をしますか？",
    category: "カテゴリ", joining: "参加設定", joiningDesc: "ユーザーがCommunityに参加する方法を選択します。",
    public: "公開", private: "非公開", publicHint: "ユーザーはすぐに参加できます", privateHint: "参加前に承認が必要です",
    image: "Community画像", imageHint: "一覧で魅力的に見えるようにカバー画像を追加します。",
    emptyImage: "Community画像はまだありません。クリックしてカバー画像を選択してください。", addImage: "画像を追加", changeImage: "画像を変更", remove: "画像を削除",
    create: "Communityを作成", creating: "Communityを作成中…", publishHint: "作成後、選択した参加設定が適用されます。",
    required: "Community名を入力してください", imageTooLarge: "画像は12MB以下にしてください", imageType: "画像ファイルを選択してください",
  },
  ko: {
    back: "커뮤니티 목록으로", kicker: "MELO COMMUNITIES", title: "커뮤니티 만들기",
    subtitle: "공통 관심사를 가진 사람들을 위한 공간을 커버 이미지, 카테고리, 참여 설정과 함께 만드세요.",
    basic: "커뮤니티 정보", name: "커뮤니티 이름", namePlaceholder: "예: Weekend Travelers",
    description: "설명", descriptionPlaceholder: "이 그룹은 누구를 위한 곳이며 어떤 활동을 하나요?",
    category: "카테고리", joining: "참여 방식", joiningDesc: "사용자가 커뮤니티에 참여하는 방식을 선택하세요.",
    public: "공개", private: "비공개", publicHint: "사용자가 즉시 참여할 수 있습니다", privateHint: "참여 전에 승인이 필요합니다",
    image: "커뮤니티 이미지", imageHint: "목록에서 더 매력적으로 보이도록 커버 이미지를 추가하세요.",
    emptyImage: "아직 커뮤니티 이미지가 없습니다. 클릭하여 커버 이미지를 선택하세요.", addImage: "이미지 추가", changeImage: "이미지 변경", remove: "이미지 삭제",
    create: "커뮤니티 만들기", creating: "커뮤니티 만드는 중…", publishHint: "생성 후 선택한 참여 설정이 적용됩니다.",
    required: "커뮤니티 이름을 입력하세요", imageTooLarge: "이미지는 12MB 이하여야 합니다", imageType: "이미지 파일을 선택하세요",
  },
} as const;

type Privacy = "public" | "private";

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

export default function CreateCommunityWebExperience() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("friends_social");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function mediaError(cause: unknown) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "IMAGE_TOO_LARGE") return copy.imageTooLarge;
    if (message === "IMAGE_REQUIRED") return copy.imageType;
    return message || copy.imageType;
  }

  function onCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    try {
      validateCommunityImage(file);
      setCoverFile(file);
      setError("");
    } catch (cause) {
      setError(mediaError(cause));
    }
  }

  async function create() {
    if (!name.trim()) {
      setError(copy.required);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const communityId = await createCommunityWeb({
        name: name.trim(),
        description: description.trim(),
        category,
        privacy,
      });
      if (coverFile) await saveCommunityCoverWeb(communityId, coverFile);
      router.push(`/community/${encodeURIComponent(communityId)}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : copy.required;
      setError(message === "AUTH_REQUIRED" ? copy.required : message);
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <header className={styles.hero}>
          <Link href="/community">‹ {copy.back}</Link>
          <span>{copy.kicker}</span>
          <div className={styles.heroTitleRow}>
            <span className={styles.heroIcon} aria-hidden="true">◎</span>
            <h1>{copy.title}</h1>
          </div>
          <p>{copy.subtitle}</p>
        </header>

        <div className={styles.form}>
          <div className={styles.mainColumn}>
            <section className={`${styles.block} ${styles.basicBlock}`}>
              <div className={styles.sectionHeading}>
                <span className={styles.stepNumber}>01</span>
                <h2>{copy.basic}</h2>
              </div>

              <div className={styles.topGrid}>
                <label className={styles.field}>
                  <span>{copy.name}</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} maxLength={120} />
                </label>
                <label className={styles.field}>
                  <span>{copy.category}</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {COMMUNITY_CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabel(locale, value)}</option>)}
                  </select>
                </label>
              </div>

              <label className={styles.field}>
                <span>{copy.description}</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={copy.descriptionPlaceholder} maxLength={1200} />
              </label>
            </section>

            <section className={`${styles.block} ${styles.joinBlock}`}>
              <div className={styles.sectionHeading}>
                <span className={styles.stepNumber}>02</span>
                <div>
                  <h2>{copy.joining}</h2>
                  <p>{copy.joiningDesc}</p>
                </div>
              </div>
              <div className={styles.joinChoices} role="group" aria-label={copy.joining}>
                <button type="button" className={privacy === "public" ? styles.selectedChoice : ""} onClick={() => setPrivacy("public")}>
                  <strong>{copy.public}</strong>
                  <span>{copy.publicHint}</span>
                </button>
                <button type="button" className={privacy === "private" ? styles.selectedChoice : ""} onClick={() => setPrivacy("private")}>
                  <strong>{copy.private}</strong>
                  <span>{copy.privateHint}</span>
                </button>
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <section className={`${styles.block} ${styles.mediaBlock}`}>
              <div>
                <h2>{copy.image}</h2>
                <p>{copy.imageHint}</p>
              </div>
              <label className={styles.coverBox}>
                {coverFile ? <Preview file={coverFile} /> : <span className={styles.emptyMedia}><b>▣</b>{copy.emptyImage}</span>}
                <input type="file" accept="image/*" onChange={onCover} />
              </label>
              <label className={styles.primaryUpload}>
                {coverFile ? copy.changeImage : copy.addImage}
                <input type="file" accept="image/*" onChange={onCover} />
              </label>
              {coverFile ? <button type="button" className={styles.removeButton} onClick={() => setCoverFile(null)}>{copy.remove}</button> : null}
            </section>

            <section className={`${styles.block} ${styles.actionBlock}`}>
              {error ? <div className={styles.error}>{error}</div> : null}
              <button type="button" className={styles.createButton} disabled={busy} onClick={() => void create()}>{busy ? copy.creating : copy.create}</button>
              <p>{copy.publishHint}</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

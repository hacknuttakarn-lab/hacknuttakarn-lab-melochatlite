"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import { getCurrentUser, restSelect, rpcRequest } from "@/lib/supabase/browser";
import type { DetailActionFeature } from "./ActivityDetailActions";
import styles from "./EditActivityWebExperience.module.css";

type Row = Record<string, any>;
type Privacy = "public" | "private";

type ActivityForm = {
  title: string;
  description: string;
  category: string;
  primaryLanguage: string;
  imagePath: string;
  startPoint: string;
  destination: string;
  startDate: string;
  endDate: string;
  capacity: string;
  budgetPerPerson: string;
  venueName: string;
  address: string;
  city: string;
  country: string;
  startAt: string;
  endAt: string;
  pricePerPerson: string;
  privacy: Privacy;
};

const EMPTY_FORM: ActivityForm = {
  title: "",
  description: "",
  category: "",
  primaryLanguage: "th",
  imagePath: "",
  startPoint: "",
  destination: "",
  startDate: "",
  endDate: "",
  capacity: "1",
  budgetPerPerson: "",
  venueName: "",
  address: "",
  city: "",
  country: "",
  startAt: "",
  endAt: "",
  pricePerPerson: "",
  privacy: "public",
};

const COPY = {
  th: {
    tripTitle: "แก้ไขทริป", eventTitle: "แก้ไขอีเวนต์", communityTitle: "แก้ไขคอมมูนิตี้",
    back: "กลับหน้ารายละเอียด", save: "บันทึกการเปลี่ยนแปลง", saving: "กำลังบันทึก…", loading: "กำลังโหลดข้อมูล…",
    noAccess: "คุณไม่มีสิทธิ์แก้ไขรายการนี้", notFound: "ไม่พบข้อมูลรายการนี้", saved: "บันทึกเรียบร้อยแล้ว",
    basic: "ข้อมูลหลัก", schedule: "วัน เวลา และสถานที่", capacity: "จำนวนผู้เข้าร่วม", language: "ภาษาหลัก",
    title: "ชื่อ", description: "รายละเอียด", category: "ประเภท", startPoint: "จุดเริ่มต้น", destination: "จุดหมาย",
    startDate: "วันเริ่ม", endDate: "วันสิ้นสุด", budget: "งบต่อคน", venue: "สถานที่จัด", address: "ที่อยู่",
    city: "เมือง", country: "ประเทศ", startAt: "เริ่ม", endAt: "สิ้นสุด", price: "ราคาต่อคน", privacy: "ความเป็นส่วนตัว",
    public: "สาธารณะ", private: "ส่วนตัว", required: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ", invalidDate: "วันหรือเวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น",
  },
  en: {
    tripTitle: "Edit Trip", eventTitle: "Edit Event", communityTitle: "Edit Community",
    back: "Back to details", save: "Save changes", saving: "Saving…", loading: "Loading…",
    noAccess: "You do not have permission to edit this activity.", notFound: "Activity not found.", saved: "Changes saved.",
    basic: "Basic information", schedule: "Date, time & location", capacity: "Capacity", language: "Primary language",
    title: "Title", description: "Description", category: "Category", startPoint: "Starting point", destination: "Destination",
    startDate: "Start date", endDate: "End date", budget: "Budget/person", venue: "Venue", address: "Address",
    city: "City", country: "Country", startAt: "Starts", endAt: "Ends", price: "Price/person", privacy: "Privacy",
    public: "Public", private: "Private", required: "Please complete the required fields.", invalidDate: "The end must be after the start.",
  },
  de: {
    tripTitle: "Reise bearbeiten", eventTitle: "Event bearbeiten", communityTitle: "Community bearbeiten",
    back: "Zurück zu den Details", save: "Änderungen speichern", saving: "Wird gespeichert…", loading: "Wird geladen…",
    noAccess: "Du darfst diese Aktivität nicht bearbeiten.", notFound: "Aktivität nicht gefunden.", saved: "Änderungen gespeichert.",
    basic: "Grundinformationen", schedule: "Datum, Zeit & Ort", capacity: "Kapazität", language: "Hauptsprache",
    title: "Titel", description: "Beschreibung", category: "Kategorie", startPoint: "Startpunkt", destination: "Ziel",
    startDate: "Startdatum", endDate: "Enddatum", budget: "Budget/Person", venue: "Veranstaltungsort", address: "Adresse",
    city: "Stadt", country: "Land", startAt: "Beginn", endAt: "Ende", price: "Preis/Person", privacy: "Privatsphäre",
    public: "Öffentlich", private: "Privat", required: "Bitte alle Pflichtfelder ausfüllen.", invalidDate: "Das Ende muss nach dem Beginn liegen.",
  },
  zh: {
    tripTitle: "编辑旅行", eventTitle: "编辑活动", communityTitle: "编辑社区",
    back: "返回详情", save: "保存更改", saving: "正在保存…", loading: "正在加载…",
    noAccess: "你没有权限编辑此内容。", notFound: "未找到该内容。", saved: "已保存更改。",
    basic: "基本信息", schedule: "日期、时间与地点", capacity: "人数上限", language: "主要语言",
    title: "名称", description: "详细介绍", category: "类别", startPoint: "起点", destination: "目的地",
    startDate: "开始日期", endDate: "结束日期", budget: "人均预算", venue: "场地", address: "地址",
    city: "城市", country: "国家", startAt: "开始", endAt: "结束", price: "人均价格", privacy: "隐私",
    public: "公开", private: "私密", required: "请填写所有必填信息。", invalidDate: "结束时间必须晚于开始时间。",
  },
  ja: {
    tripTitle: "Tripを編集", eventTitle: "Eventを編集", communityTitle: "Communityを編集",
    back: "詳細へ戻る", save: "変更を保存", saving: "保存中…", loading: "読み込み中…",
    noAccess: "この項目を編集する権限がありません。", notFound: "項目が見つかりません。", saved: "変更を保存しました。",
    basic: "基本情報", schedule: "日時・場所", capacity: "定員", language: "メイン言語",
    title: "タイトル", description: "説明", category: "カテゴリ", startPoint: "出発地", destination: "目的地",
    startDate: "開始日", endDate: "終了日", budget: "1人あたり予算", venue: "会場", address: "住所",
    city: "都市", country: "国", startAt: "開始", endAt: "終了", price: "1人あたり料金", privacy: "公開範囲",
    public: "公開", private: "非公開", required: "必須項目を入力してください。", invalidDate: "終了は開始より後にしてください。",
  },
  ko: {
    tripTitle: "여행 수정", eventTitle: "이벤트 수정", communityTitle: "커뮤니티 수정",
    back: "상세로 돌아가기", save: "변경사항 저장", saving: "저장 중…", loading: "불러오는 중…",
    noAccess: "이 항목을 수정할 권한이 없습니다.", notFound: "항목을 찾을 수 없습니다.", saved: "변경사항을 저장했습니다.",
    basic: "기본 정보", schedule: "날짜, 시간 및 위치", capacity: "정원", language: "주요 언어",
    title: "제목", description: "설명", category: "카테고리", startPoint: "출발지", destination: "목적지",
    startDate: "시작일", endDate: "종료일", budget: "1인 예산", venue: "장소", address: "주소",
    city: "도시", country: "국가", startAt: "시작", endAt: "종료", price: "1인 가격", privacy: "공개 범위",
    public: "공개", private: "비공개", required: "필수 정보를 입력하세요.", invalidDate: "종료 시간은 시작 시간보다 늦어야 합니다.",
  },
} as const;

function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((row): row is Row => Boolean(row) && typeof row === "object");
  if (value && typeof value === "object") return [value as Row];
  return [];
}

function text(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberText(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return String(n);
  }
  return "";
}

function tableFor(feature: DetailActionFeature) {
  return feature === "trip" ? "trips" : feature === "event" ? "events" : "communities";
}

function detailPath(feature: DetailActionFeature, id: string) {
  return feature === "trip" ? `/trips/${id}` : feature === "event" ? `/events/${id}` : `/community/${id}`;
}

function toLocalDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoFromLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function ownerId(feature: DetailActionFeature, row: Row) {
  if (feature === "community") return text(row, "owner_id", "created_by", "user_id");
  return text(row, "organizer_id", "created_by", "user_id");
}

function formFromRow(feature: DetailActionFeature, row: Row): ActivityForm {
  return {
    ...EMPTY_FORM,
    title: feature === "community" ? text(row, "name", "title") : text(row, "title", "name"),
    description: text(row, "description"),
    category: text(row, "category", "category_key"),
    primaryLanguage: text(row, "primary_language", "language") || "th",
    imagePath: text(row, "image_path", "cover_image_path"),
    startPoint: text(row, "start_point"),
    destination: text(row, "destination"),
    startDate: text(row, "start_date").slice(0, 10),
    endDate: text(row, "end_date").slice(0, 10),
    capacity: numberText(row, "capacity") || "1",
    budgetPerPerson: numberText(row, "budget_per_person"),
    venueName: text(row, "venue_name", "venue"),
    address: text(row, "address"),
    city: text(row, "city", "venue_city"),
    country: text(row, "country", "country_name"),
    startAt: toLocalDateTime(text(row, "start_at")),
    endAt: toLocalDateTime(text(row, "end_at")),
    pricePerPerson: numberText(row, "price_per_person"),
    privacy: text(row, "privacy").toLowerCase() === "private" || row.is_private === true ? "private" : "public",
  };
}

export default function EditActivityWebExperience({ feature, id }: { feature: DetailActionFeature; id: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;
  const [form, setForm] = useState<ActivityForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const pageTitle = feature === "trip" ? copy.tripTitle : feature === "event" ? copy.eventTitle : copy.communityTitle;
  const backHref = detailPath(feature, id);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const user = await getCurrentUser();
    if (!user?.id) {
      router.replace("/login");
      return;
    }

    const [rowResult, accessResult] = await Promise.all([
      restSelect<Row[]>(tableFor(feature), `select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
      rpcRequest<Row | Row[]>("get_phase27_activity_management_state", {
        p_activity_type: feature,
        p_activity_id: id,
      }),
    ]);

    const row = rows(rowResult.data)[0] ?? null;
    if (!row) {
      setError(rowResult.error || copy.notFound);
      setLoading(false);
      return;
    }

    const accessRow = rows(accessResult.data)[0] ?? (accessResult.data && typeof accessResult.data === "object" && !Array.isArray(accessResult.data) ? accessResult.data as Row : null);
    const canEdit = accessRow ? Boolean(accessRow.can_edit_details || accessRow.is_owner) : ownerId(feature, row) === user.id;
    setAllowed(canEdit);
    setForm(formFromRow(feature, row));
    setLoading(false);
  }, [copy.notFound, feature, id, router]);

  useEffect(() => { void load(); }, [load]);

  function set<K extends keyof ActivityForm>(key: K, value: ActivityForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function numeric(value: string) {
    if (!value.trim()) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  async function save() {
    if (saving || !allowed) return;
    setError("");
    setNotice("");

    if (!form.title.trim() || !form.description.trim()) {
      setError(copy.required);
      return;
    }

    if (feature === "trip") {
      if (!form.startPoint.trim() || !form.destination.trim() || !form.startDate || !Number(form.capacity)) {
        setError(copy.required);
        return;
      }
      if (form.endDate && form.endDate < form.startDate) {
        setError(copy.invalidDate);
        return;
      }
    }

    if (feature === "event") {
      if (!form.venueName.trim() || !form.city.trim() || !form.country.trim() || !form.startAt || !form.endAt || !Number(form.capacity)) {
        setError(copy.required);
        return;
      }
      const start = new Date(form.startAt).getTime();
      const end = new Date(form.endAt).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        setError(copy.invalidDate);
        return;
      }
    }

    setSaving(true);
    try {
      const result = feature === "trip"
        ? await rpcRequest("update_phase27_trip_activity", {
            p_trip_id: id,
            p_title: form.title.trim(),
            p_description: form.description.trim(),
            p_start_point: form.startPoint.trim(),
            p_destination: form.destination.trim(),
            p_start_date: form.startDate,
            p_end_date: form.endDate || null,
            p_capacity: Math.max(1, Math.round(Number(form.capacity))),
            p_budget_per_person: numeric(form.budgetPerPerson),
            p_primary_language: form.primaryLanguage,
            p_image_path: form.imagePath || null,
          })
        : feature === "event"
          ? await rpcRequest("update_phase27_event_activity", {
              p_event_id: id,
              p_title: form.title.trim(),
              p_description: form.description.trim(),
              p_venue_name: form.venueName.trim(),
              p_address: form.address.trim(),
              p_city: form.city.trim(),
              p_country: form.country.trim(),
              p_start_at: isoFromLocal(form.startAt),
              p_end_at: isoFromLocal(form.endAt),
              p_capacity: Math.max(1, Math.round(Number(form.capacity))),
              p_price_per_person: numeric(form.pricePerPerson),
              p_primary_language: form.primaryLanguage,
              p_image_path: form.imagePath || null,
            })
          : await rpcRequest("update_phase27_community_activity", {
              p_community_id: id,
              p_name: form.title.trim(),
              p_description: form.description.trim(),
              p_category: form.category.trim(),
              p_primary_language: form.primaryLanguage,
              p_privacy: form.privacy,
              p_image_path: form.imagePath || null,
            });

      if (result.error) throw new Error(result.error);
      setNotice(copy.saved);
      window.setTimeout(() => {
        router.replace(backHref);
        router.refresh();
      }, 450);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.required);
    } finally {
      setSaving(false);
    }
  }

  const languageOptions = useMemo(() => ["th", "en", "de", "zh", "ja", "ko"], []);

  if (loading) return <main className={styles.page}><Header /><div className={styles.state}>{copy.loading}</div></main>;

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <Link href={backHref} className={styles.back}>‹ {copy.back}</Link>
        <header className={styles.hero}>
          <small>MELO MANAGEMENT</small>
          <h1>{pageTitle}</h1>
          <p>{form.title}</p>
        </header>

        {!allowed ? <div className={styles.state}>{copy.noAccess}</div> : (
          <div className={styles.formGrid}>
            <section className={styles.card}>
              <h2>{copy.basic}</h2>
              <label><span>{copy.title}</span><input value={form.title} maxLength={140} onChange={(e) => set("title", e.target.value)} /></label>
              <label><span>{copy.description}</span><textarea value={form.description} maxLength={3000} onChange={(e) => set("description", e.target.value)} /></label>
              {feature === "community" ? <label><span>{copy.category}</span><input value={form.category} onChange={(e) => set("category", e.target.value)} /></label> : null}
              <label><span>{copy.language}</span><select value={form.primaryLanguage} onChange={(e) => set("primaryLanguage", e.target.value)}>{languageOptions.map((lang) => <option key={lang} value={lang}>{lang.toUpperCase()}</option>)}</select></label>
              {feature === "community" ? <label><span>{copy.privacy}</span><select value={form.privacy} onChange={(e) => set("privacy", e.target.value as Privacy)}><option value="public">{copy.public}</option><option value="private">{copy.private}</option></select></label> : null}
            </section>

            {feature === "trip" ? (
              <section className={styles.card}>
                <h2>{copy.schedule}</h2>
                <label><span>{copy.startPoint}</span><input value={form.startPoint} onChange={(e) => set("startPoint", e.target.value)} /></label>
                <label><span>{copy.destination}</span><input value={form.destination} onChange={(e) => set("destination", e.target.value)} /></label>
                <div className={styles.two}><label><span>{copy.startDate}</span><input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></label><label><span>{copy.endDate}</span><input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></label></div>
                <div className={styles.two}><label><span>{copy.capacity}</span><input type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></label><label><span>{copy.budget}</span><input type="number" min="0" value={form.budgetPerPerson} onChange={(e) => set("budgetPerPerson", e.target.value)} /></label></div>
              </section>
            ) : null}

            {feature === "event" ? (
              <section className={styles.card}>
                <h2>{copy.schedule}</h2>
                <label><span>{copy.venue}</span><input value={form.venueName} onChange={(e) => set("venueName", e.target.value)} /></label>
                <label><span>{copy.address}</span><input value={form.address} onChange={(e) => set("address", e.target.value)} /></label>
                <div className={styles.two}><label><span>{copy.city}</span><input value={form.city} onChange={(e) => set("city", e.target.value)} /></label><label><span>{copy.country}</span><input value={form.country} onChange={(e) => set("country", e.target.value)} /></label></div>
                <div className={styles.two}><label><span>{copy.startAt}</span><input type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} /></label><label><span>{copy.endAt}</span><input type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} /></label></div>
                <div className={styles.two}><label><span>{copy.capacity}</span><input type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></label><label><span>{copy.price}</span><input type="number" min="0" value={form.pricePerPerson} onChange={(e) => set("pricePerPerson", e.target.value)} /></label></div>
              </section>
            ) : null}

            <section className={styles.actions}>
              {error ? <div className={styles.error}>{error}</div> : null}
              {notice ? <div className={styles.success}>{notice}</div> : null}
              <button type="button" disabled={saving} onClick={() => void save()}>{saving ? copy.saving : copy.save}</button>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { getCurrentUser, publicStorageUrl, restSelect, rpcRequest } from '@/lib/supabase/browser';
import styles from './TripJoinRequestsExperience.module.css';
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";

type Row = Record<string, any>;

type RequestItem = {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  message: string;
  name: string;
  city: string;
  country: string;
  photoUrl: string;
};

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((row): row is Row => Boolean(row) && typeof row === 'object');
  if (value && typeof value === 'object') return [value as Row];
  return [];
}

function text(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function photoFromProfile(row: Row | null | undefined) {
  if (!row) return '';
  const direct = text(row, 'photo_url', 'avatar_url', 'image_url');
  if (/^https?:\/\//i.test(direct)) return direct;
  const paths = Array.isArray(row.photo_paths) ? row.photo_paths.map(String).filter(Boolean) : [];
  const path = paths[0] || text(row, 'photo_path', 'profile_image_path');
  return path ? publicStorageUrl('profile-photos', path) : '';
}

const COPY = {
  th: {
    back: 'กลับไปหน้าทริป',
    title: 'คำขอเข้าร่วมทริป',
    subtitle: 'ดูผู้ที่ส่งคำขอเข้าร่วมทริปนี้',
    empty: 'ยังไม่มีคำขอเข้าร่วมในตอนนี้',
    ownerOnly: 'เฉพาะผู้จัดทริปเท่านั้นที่ดูรายการนี้ได้',
    loading: 'กำลังโหลด...',
    unknownTrip: 'ไม่พบทริปนี้',
    requestAt: 'ส่งคำขอเมื่อ',
    requestMessage: 'ข้อความจากผู้ขอเข้าร่วม',
    noMessage: 'ไม่มีข้อความเพิ่มเติม',
    status: 'สถานะ',
    pending: 'รอการอนุมัติ',
    applicants: 'คำขอทั้งหมด',
  },
  en: {
    back: 'Back to trip',
    title: 'Trip join requests',
    subtitle: 'Review members who asked to join this trip.',
    empty: 'No join requests right now.',
    ownerOnly: 'Only the organizer can view this page.',
    loading: 'Loading...',
    unknownTrip: 'Trip not found.',
    requestAt: 'Requested at',
    requestMessage: 'Message',
    noMessage: 'No extra message',
    status: 'Status',
    pending: 'Pending approval',
    applicants: 'Total requests',
  },
  de: {
    back: 'Zurück zum Trip',
    title: 'Teilnahmeanfragen',
    subtitle: 'Anfragen für diesen Trip ansehen.',
    empty: 'Aktuell keine Anfragen.',
    ownerOnly: 'Nur der Organisator kann diese Seite sehen.',
    loading: 'Wird geladen...',
    unknownTrip: 'Trip nicht gefunden.',
    requestAt: 'Angefragt am',
    requestMessage: 'Nachricht',
    noMessage: 'Keine zusätzliche Nachricht',
    status: 'Status',
    pending: 'Wartet auf Freigabe',
    applicants: 'Anfragen gesamt',
  },
  zh: {
    back: '返回行程',
    title: '加入申请',
    subtitle: '查看申请加入此行程的成员。',
    empty: '目前没有加入申请。',
    ownerOnly: '只有组织者可以查看此页面。',
    loading: '正在加载...',
    unknownTrip: '未找到该行程。',
    requestAt: '申请时间',
    requestMessage: '留言',
    noMessage: '没有附加留言',
    status: '状态',
    pending: '等待批准',
    applicants: '申请总数',
  },
  ja: {
    back: 'Tripへ戻る',
    title: '参加申請',
    subtitle: 'このTripへの参加申請を確認します。',
    empty: '参加申請はまだありません。',
    ownerOnly: 'このページは主催者のみ閲覧できます。',
    loading: '読み込み中...',
    unknownTrip: 'Tripが見つかりません。',
    requestAt: '申請日時',
    requestMessage: 'メッセージ',
    noMessage: '追加メッセージなし',
    status: '状態',
    pending: '承認待ち',
    applicants: '申請数',
  },
  ko: {
    back: '여행으로 돌아가기',
    title: '참여 요청',
    subtitle: '이 여행에 참여를 요청한 멤버를 확인합니다.',
    empty: '현재 참여 요청이 없습니다.',
    ownerOnly: '주최자만 이 페이지를 볼 수 있습니다.',
    loading: '불러오는 중...',
    unknownTrip: '여행을 찾을 수 없습니다.',
    requestAt: '요청 시간',
    requestMessage: '메시지',
    noMessage: '추가 메시지 없음',
    status: '상태',
    pending: '승인 대기',
    applicants: '총 요청 수',
  },
} as const;

export default function TripJoinRequestsExperience({ id }: { id: string }) {
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;
  const [loading, setLoading] = useState(true);
  const [tripTitle, setTripTitle] = useState('');
  const [organizerId, setOrganizerId] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [items, setItems] = useState<RequestItem[]>([]);
  const [error, setError] = useState('');

  const isOwner = Boolean(currentUserId && organizerId && currentUserId === organizerId);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const user = await getCurrentUser();
      const userId = user?.id ?? '';
      setCurrentUserId(userId);

      const [tripResult, requestResult] = await Promise.all([
        rpcRequest<Row[]>('get_trip_detail', { p_trip_id: id }),
        restSelect<Row[]>('trip_join_requests', `select=*&trip_id=eq.${encodeURIComponent(id)}&status=eq.pending&order=created_at.desc&limit=200`),
      ]);

      const tripRow = rowsOf(tripResult.data)[0] ?? null;
      const organizer = text(tripRow, 'organizer_id', 'created_by', 'user_id');
      setOrganizerId(organizer);
      setTripTitle(text(tripRow, 'title', 'name') || copy.unknownTrip);

      const requestRows = rowsOf(requestResult.data);
      const userIds = [...new Set(requestRows.map((row) => text(row, 'user_id', 'member_id')).filter(Boolean))];
      let profiles = new Map<string, Row>();
      if (userIds.length) {
        const profileResult = await restSelect<Row[]>(
          'profiles',
          `select=id,display_name,full_name,city,country,photo_paths,photo_path,photo_url,avatar_url&or=(${userIds.map((value) => `id.eq.${encodeURIComponent(value)}`).join(',')})&limit=${userIds.length}`,
        );
        profiles = new Map(rowsOf(profileResult.data).map((row) => [text(row, 'id'), row]));
      }

      setItems(
        requestRows.map((row, index) => {
          const userIdValue = text(row, 'user_id', 'member_id');
          const profile = profiles.get(userIdValue) ?? null;
          return {
            id: text(row, 'id') || `${index}`,
            userId: userIdValue,
            status: text(row, 'status') || 'pending',
            createdAt: text(row, 'created_at', 'inserted_at'),
            message: text(row, 'message', 'request_message', 'intro_message', 'note'),
            name: text(profile, 'display_name', 'full_name', 'name') || 'Melo member',
            city: text(profile, 'city'),
            country: text(profile, 'country'),
            photoUrl: photoFromProfile(profile),
          };
        }),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.unknownTrip, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatter = useMemo(() => {
    const tag = locale === 'th' ? 'th-TH' : locale === 'de' ? 'de-DE' : locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US';
    return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [locale]);

  function dateText(value: string) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : formatter.format(date);
  }

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <div className={styles.topline}>
          <Link href={`/trips/${id}`}>← {copy.back}</Link>
        </div>

        <section className={styles.hero}>
          <small>TRIP</small>
          <h1>{copy.title}</h1>
          <p>{tripTitle}</p>
          <div className={styles.metaPills}>
            <span>{copy.applicants}: {items.length}</span>
            <span>{copy.subtitle}</span>
          </div>
        </section>

        {loading ? (
          <div className={styles.state}>{copy.loading}</div>
        ) : error ? (
          <div className={styles.state}>{error}</div>
        ) : !tripTitle || tripTitle === copy.unknownTrip ? (
          <div className={styles.state}>{copy.unknownTrip}</div>
        ) : !isOwner ? (
          <div className={styles.state}>{copy.ownerOnly}</div>
        ) : items.length === 0 ? (
          <div className={styles.state}>{copy.empty}</div>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <article className={styles.card} key={item.id}>
                <div className={styles.identity}>
                  <VerifiedUserAvatar userId={item.userId} name={item.name} src={item.photoUrl} country={item.country} className={styles.avatar} shape="rounded" badgeSize={17} alt={item.name} />
                  <div>
                    <h2>{item.name}</h2>
                    <p>{[item.city, item.country].filter(Boolean).join(' · ') || 'Melo member'}</p>
                  </div>
                </div>
                <div className={styles.contentGrid}>
                  <div>
                    <small>{copy.requestAt}</small>
                    <strong>{dateText(item.createdAt)}</strong>
                  </div>
                  <div>
                    <small>{copy.status}</small>
                    <strong>{copy.pending}</strong>
                  </div>
                  <div className={styles.messageBlock}>
                    <small>{copy.requestMessage}</small>
                    <p>{item.message || copy.noMessage}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/SiteProviders';
import { getCurrentUser, publicStorageUrl, restSelect, rpcRequest } from '@/lib/supabase/browser';
import styles from './TripJoinRequestsModal.module.css';
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";

type Row = Record<string, any>;

type RequestItem = {
  id: string;
  userId: string;
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

function profilePhoto(row: Row | null | undefined) {
  if (!row) return '';
  const direct = text(row, 'photo_url', 'avatar_url', 'image_url');
  if (/^https?:\/\//i.test(direct)) return direct;
  const paths = Array.isArray(row.photo_paths) ? row.photo_paths.map(String).filter(Boolean) : [];
  const raw = paths[0] || text(row, 'photo_path', 'profile_image_path');
  if (!raw) return '';
  const normalized = raw.replace(/^\/+/, '');
  return normalized.startsWith('profile-photos/')
    ? publicStorageUrl('profile-photos', normalized.slice('profile-photos/'.length))
    : publicStorageUrl('profile-photos', normalized);
}

const COPY = {
  th: {
    title: 'คำขอเข้าร่วมทริป', subtitle: 'ผู้ที่กำลังรอการอนุมัติ', close: 'ปิด', loading: 'กำลังโหลดคำขอ…',
    empty: 'ยังไม่มีคำขอเข้าร่วม', ownerOnly: 'เฉพาะผู้จัดทริปเท่านั้นที่ดูคำขอได้', requested: 'ส่งคำขอเมื่อ',
    message: 'ข้อความถึงผู้จัด', noMessage: 'ไม่มีข้อความเพิ่มเติม', pending: 'รออนุมัติ', requests: 'คำขอ',
  },
  en: {
    title: 'Trip join requests', subtitle: 'Members waiting for approval', close: 'Close', loading: 'Loading requests…',
    empty: 'No join requests right now.', ownerOnly: 'Only the organizer can view join requests.', requested: 'Requested',
    message: 'Message to organizer', noMessage: 'No extra message', pending: 'Pending', requests: 'requests',
  },
  de: {
    title: 'Teilnahmeanfragen', subtitle: 'Mitglieder warten auf Freigabe', close: 'Schließen', loading: 'Anfragen werden geladen…',
    empty: 'Aktuell keine Teilnahmeanfragen.', ownerOnly: 'Nur der Organisator kann Anfragen sehen.', requested: 'Angefragt',
    message: 'Nachricht an den Organisator', noMessage: 'Keine zusätzliche Nachricht', pending: 'Ausstehend', requests: 'Anfragen',
  },
  zh: {
    title: '加入申请', subtitle: '等待批准的成员', close: '关闭', loading: '正在加载申请…',
    empty: '目前没有加入申请。', ownerOnly: '只有组织者可以查看加入申请。', requested: '申请时间',
    message: '给组织者的留言', noMessage: '没有附加留言', pending: '等待批准', requests: '个申请',
  },
  ja: {
    title: '参加申請', subtitle: '承認待ちのメンバー', close: '閉じる', loading: '申請を読み込み中…',
    empty: '参加申請はまだありません。', ownerOnly: '参加申請を確認できるのは主催者のみです。', requested: '申請日時',
    message: '主催者へのメッセージ', noMessage: '追加メッセージなし', pending: '承認待ち', requests: '件',
  },
  ko: {
    title: '참여 요청', subtitle: '승인을 기다리는 멤버', close: '닫기', loading: '요청 불러오는 중…',
    empty: '현재 참여 요청이 없습니다.', ownerOnly: '주최자만 참여 요청을 볼 수 있습니다.', requested: '요청 시간',
    message: '주최자에게 보낸 메시지', noMessage: '추가 메시지 없음', pending: '승인 대기', requests: '개 요청',
  },
} as const;

export default function TripJoinRequestsModal({
  open,
  tripId,
  tripTitle,
  onClose,
}: {
  open: boolean;
  tripId: string;
  tripTitle: string;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [allowed, setAllowed] = useState(true);
  const [error, setError] = useState('');

  const formatter = useMemo(() => {
    const tag = locale === 'th' ? 'th-TH' : locale === 'de' ? 'de-DE' : locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US';
    return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [locale]);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError('');
    try {
      const user = await getCurrentUser();
      if (!user) {
        setAllowed(false);
        setItems([]);
        return;
      }

      const [detailResult, requestResult] = await Promise.all([
        rpcRequest<Row[]>('get_trip_detail', { p_trip_id: tripId }),
        restSelect<Row[]>('trip_join_requests', `select=*&trip_id=eq.${encodeURIComponent(tripId)}&status=eq.pending&order=created_at.desc&limit=200`),
      ]);

      const detail = rowsOf(detailResult.data)[0] ?? {};
      const organizerId = text(detail, 'organizer_id', 'created_by', 'user_id');
      const isOwner = organizerId === user.id || detail.is_organizer === true;
      setAllowed(isOwner);
      if (!isOwner) {
        setItems([]);
        return;
      }

      const requests = rowsOf(requestResult.data);
      const ids = [...new Set(requests.map((row) => text(row, 'user_id', 'member_id')).filter(Boolean))];
      const profiles = new Map<string, Row>();
      if (ids.length) {
        const profileResult = await restSelect<Row[]>(
          'profiles',
          `select=id,display_name,full_name,city,country,photo_paths,photo_path,photo_url,avatar_url&id=in.(${ids.join(',')})&limit=${ids.length}`,
        );
        for (const row of rowsOf(profileResult.data)) profiles.set(text(row, 'id'), row);
      }

      setItems(requests.map((row, index) => {
        const userId = text(row, 'user_id', 'member_id');
        const profile = profiles.get(userId) ?? null;
        return {
          id: text(row, 'id') || `${tripId}-${index}`,
          userId,
          createdAt: text(row, 'created_at', 'inserted_at'),
          message: text(row, 'message', 'request_message', 'intro_message', 'note'),
          name: text(profile, 'display_name', 'full_name', 'name') || 'Melo member',
          city: text(profile, 'city'),
          country: text(profile, 'country'),
          photoUrl: profilePhoto(profile),
        };
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [open, tripId]);

  useEffect(() => {
    if (!open) return;
    void load();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [load, onClose, open]);

  if (!open) return null;

  function formatDate(value: string) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : formatter.format(date);
  }

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label={copy.title}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label={copy.close}>×</button>
        <header className={styles.header}>
          <span className={styles.icon}>🙋</span>
          <div>
            <small>TRIP</small>
            <h2>{copy.title}</h2>
            <p>{tripTitle}</p>
          </div>
          <b>{items.length} {copy.requests}</b>
        </header>

        <div className={styles.subhead}>{copy.subtitle}</div>

        {loading ? (
          <div className={styles.state}>{copy.loading}</div>
        ) : error ? (
          <div className={`${styles.state} ${styles.error}`}>{error}</div>
        ) : !allowed ? (
          <div className={styles.state}>{copy.ownerOnly}</div>
        ) : items.length === 0 ? (
          <div className={styles.state}>{copy.empty}</div>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <article className={styles.requestCard} key={item.id}>
                <div className={styles.identity}>
                  <VerifiedUserAvatar userId={item.userId} name={item.name} src={item.photoUrl} country={item.country} className={styles.avatar} shape="rounded" badgeSize={17} alt="" />
                  <div className={styles.personCopy}>
                    <strong><Link href={`/users/${item.userId}`}>{item.name}</Link></strong>
                    <small>{[item.city, item.country].filter(Boolean).join(' · ') || copy.pending}</small>
                  </div>
                  <span className={styles.pending}>{copy.pending}</span>
                </div>
                <div className={styles.requestMeta}>
                  <small>{copy.requested}</small>
                  <strong>{formatDate(item.createdAt)}</strong>
                </div>
                <div className={styles.messageBox}>
                  <small>{copy.message}</small>
                  <p>{item.message || copy.noMessage}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

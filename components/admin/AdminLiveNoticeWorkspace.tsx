'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useLocale } from '@/components/SiteProviders';

import {
  ADMIN_LIVE_NOTICE_MAX_IMAGE_BYTES,
  createAdminMeloLiveNoticeForWeb,
  deactivateAdminMeloLiveNoticeForWeb,
  listAdminMeloLiveNoticeHistoryForWeb,
  type LiveNoticeDeliveryMode,
  type LiveNoticeWeb,
} from '@/components/live-notice/liveNoticeData';

import styles from './AdminLiveNoticeWorkspace.module.css';


type AdminDeliveryMode =
  Exclude<
    LiveNoticeDeliveryMode,
    'user'
  >;


type AdminCopy = {
  active: string;
  history: string;
  duration: string;
  hours: string;

  create: string;
  createDesc: string;

  delivery: string;

  hourly: string;
  hourlyDesc: string;

  interval: string;
  intervalDesc: string;

  empty: string;
  emptyDesc: string;

  every: string;
  notices: string;

  image: string;
  imageOptional: string;
  addImage: string;
  imageHint: string;
  changeImage: string;
  removeImage: string;

  title: string;
  titlePlaceholder: string;

  body: string;
  bodyPlaceholder: string;

  preview: string;
  previewDesc: string;

  publish: string;
  publishing: string;

  refresh: string;

  noActive: string;
  noHistory: string;

  activeBadge: string;
  endedBadge: string;

  reuse: string;
  stop: string;
  stopping: string;

  required: string;
  published: string;
  stopped: string;

  invalidImage: string;
  imageTooLarge: string;
};


const COPY:
Record<
  string,
  AdminCopy
> = {
  th: {
    active:
      'ประกาศที่กำลังใช้งาน',

    history:
      'ประวัติประกาศ',

    duration:
      'อายุประกาศ',

    hours:
      '6 ชั่วโมง',

    create:
      'สร้างประกาศจาก Melo',

    createDesc:
      'ประกาศส่วนกลางสำหรับสมาชิก Melo โดยใช้ระบบเดียวกับเวอร์ชัน Android',

    delivery:
      'รูปแบบการแสดง',

    hourly:
      'ทุก 1 ชั่วโมง',

    hourlyDesc:
      'แทรกประกาศ Melo หนึ่งครั้งในแต่ละชั่วโมง',

    interval:
      'แทรกตามคิว',

    intervalDesc:
      'แทรกประกาศ Melo หลังประกาศสมาชิกครบตามจำนวนที่กำหนด',

    empty:
      'เมื่อคิวว่าง',

    emptyDesc:
      'แสดงเมื่อไม่มีประกาศ Trip / Event / Community',

    every:
      'แทรกทุก',

    notices:
      'ประกาศ',

    image:
      'รูปโฆษณา',

    imageOptional:
      'ไม่บังคับ · สูงสุด 1 รูป',

    addImage:
      'เพิ่มรูปโฆษณา',

    imageHint:
      'แนะนำ 16:9 · JPG / PNG / WEBP · สูงสุด 8 MB',

    changeImage:
      'เปลี่ยนรูป',

    removeImage:
      'ลบรูป',

    title:
      'หัวข้อประกาศ',

    titlePlaceholder:
      'เช่น 📢 ข่าวสารจาก Melo',

    body:
      'ข้อความโฆษณา / รายละเอียด',

    bodyPlaceholder:
      'เขียนข่าวสาร โปรโมชั่น เงื่อนไข หรือรายละเอียดจาก Melo...',

    preview:
      'ตัวอย่างประกาศ',

    previewDesc:
      'ตัวอย่างก่อนเผยแพร่บน Home',

    publish:
      'เผยแพร่ประกาศ',

    publishing:
      'กำลังเผยแพร่...',

    refresh:
      'รีเฟรช',

    noActive:
      'ไม่มีประกาศ Active',

    noHistory:
      'ยังไม่มีประวัติประกาศ',

    activeBadge:
      'ACTIVE',

    endedBadge:
      'สิ้นสุดแล้ว',

    reuse:
      'ใช้ประกาศนี้อีกครั้ง',

    stop:
      'หยุดประกาศ',

    stopping:
      'กำลังหยุด...',

    required:
      'กรุณากรอกหัวข้อประกาศ',

    published:
      'เผยแพร่ประกาศเรียบร้อยแล้ว',

    stopped:
      'หยุดประกาศเรียบร้อยแล้ว',

    invalidImage:
      'รองรับเฉพาะไฟล์ JPG, PNG และ WEBP',

    imageTooLarge:
      'รูปภาพต้องมีขนาดไม่เกิน 8 MB',
  },


  en: {
    active:
      'Active announcement',

    history:
      'Announcement history',

    duration:
      'Maximum duration',

    hours:
      '6 hours',

    create:
      'Create Melo announcement',

    createDesc:
      'Create a global Melo announcement using the same system as Android.',

    delivery:
      'Delivery mode',

    hourly:
      'Every hour',

    hourlyDesc:
      'Insert one Melo announcement every hour.',

    interval:
      'Queue interval',

    intervalDesc:
      'Insert Melo after the configured number of member notices.',

    empty:
      'When queue is empty',

    emptyDesc:
      'Show when there are no Trip, Event or Community notices.',

    every:
      'Insert every',

    notices:
      'notices',

    image:
      'Advertisement image',

    imageOptional:
      'Optional · maximum 1 image',

    addImage:
      'Add advertisement image',

    imageHint:
      'Recommended 16:9 · JPG / PNG / WEBP · maximum 8 MB',

    changeImage:
      'Change image',

    removeImage:
      'Remove image',

    title:
      'Announcement title',

    titlePlaceholder:
      'Example: 📢 News from Melo',

    body:
      'Message / details',

    bodyPlaceholder:
      'Write news, promotions, conditions or announcement details...',

    preview:
      'Announcement preview',

    previewDesc:
      'Preview before publishing to Home.',

    publish:
      'Publish announcement',

    publishing:
      'Publishing...',

    refresh:
      'Refresh',

    noActive:
      'No active announcement',

    noHistory:
      'No announcement history yet',

    activeBadge:
      'ACTIVE',

    endedBadge:
      'ENDED',

    reuse:
      'Reuse notice',

    stop:
      'Stop',

    stopping:
      'Stopping...',

    required:
      'Please enter an announcement title.',

    published:
      'Announcement published.',

    stopped:
      'Announcement stopped.',

    invalidImage:
      'Only JPG, PNG and WEBP images are supported.',

    imageTooLarge:
      'Image must not exceed 8 MB.',
  },


  de: {
    active:
      'Aktive Ankündigung',

    history:
      'Ankündigungsverlauf',

    duration:
      'Maximale Dauer',

    hours:
      '6 Stunden',

    create:
      'Melo-Ankündigung erstellen',

    createDesc:
      'Erstelle eine globale Melo-Ankündigung mit demselben System wie unter Android.',

    delivery:
      'Anzeigemodus',

    hourly:
      'Jede Stunde',

    hourlyDesc:
      'Einmal pro Stunde eine Melo-Ankündigung einfügen.',

    interval:
      'Warteschlangenintervall',

    intervalDesc:
      'Melo nach einer festgelegten Anzahl von Mitgliederhinweisen einfügen.',

    empty:
      'Wenn die Warteschlange leer ist',

    emptyDesc:
      'Anzeigen, wenn keine Trip-, Event- oder Community-Hinweise vorhanden sind.',

    every:
      'Einfügen alle',

    notices:
      'Hinweise',

    image:
      'Werbebild',

    imageOptional:
      'Optional · maximal 1 Bild',

    addImage:
      'Werbebild hinzufügen',

    imageHint:
      'Empfohlen 16:9 · JPG / PNG / WEBP · maximal 8 MB',

    changeImage:
      'Bild ändern',

    removeImage:
      'Bild entfernen',

    title:
      'Titel',

    titlePlaceholder:
      'Beispiel: 📢 Neuigkeiten von Melo',

    body:
      'Nachricht / Details',

    bodyPlaceholder:
      'Neuigkeiten, Aktionen, Bedingungen oder Details eingeben...',

    preview:
      'Vorschau',

    previewDesc:
      'Vorschau vor der Veröffentlichung auf Home.',

    publish:
      'Veröffentlichen',

    publishing:
      'Wird veröffentlicht...',

    refresh:
      'Aktualisieren',

    noActive:
      'Keine aktive Ankündigung',

    noHistory:
      'Noch keine Ankündigungen',

    activeBadge:
      'AKTIV',

    endedBadge:
      'BEENDET',

    reuse:
      'Erneut verwenden',

    stop:
      'Stoppen',

    stopping:
      'Wird gestoppt...',

    required:
      'Bitte einen Titel eingeben.',

    published:
      'Ankündigung veröffentlicht.',

    stopped:
      'Ankündigung gestoppt.',

    invalidImage:
      'Nur JPG, PNG und WEBP werden unterstützt.',

    imageTooLarge:
      'Das Bild darf maximal 8 MB groß sein.',
  },


  zh: {
    active:
      '当前公告',

    history:
      '公告历史',

    duration:
      '最长有效时间',

    hours:
      '6 小时',

    create:
      '创建 Melo 公告',

    createDesc:
      '使用与 Android 相同的系统创建全局 Melo 公告。',

    delivery:
      '显示方式',

    hourly:
      '每小时',

    hourlyDesc:
      '每小时插入一次 Melo 公告。',

    interval:
      '按队列插入',

    intervalDesc:
      '达到设定数量的会员公告后插入 Melo。',

    empty:
      '队列为空时',

    emptyDesc:
      '没有 Trip、Event 或 Community 公告时显示。',

    every:
      '每',

    notices:
      '条公告插入',

    image:
      '广告图片',

    imageOptional:
      '可选 · 最多 1 张',

    addImage:
      '添加广告图片',

    imageHint:
      '建议 16:9 · JPG / PNG / WEBP · 最大 8 MB',

    changeImage:
      '更换图片',

    removeImage:
      '删除图片',

    title:
      '公告标题',

    titlePlaceholder:
      '例如：📢 Melo 最新消息',

    body:
      '内容 / 详情',

    bodyPlaceholder:
      '填写新闻、优惠、条件或公告详情...',

    preview:
      '公告预览',

    previewDesc:
      '发布到首页前进行预览。',

    publish:
      '发布公告',

    publishing:
      '正在发布...',

    refresh:
      '刷新',

    noActive:
      '没有有效公告',

    noHistory:
      '暂无公告历史',

    activeBadge:
      '有效',

    endedBadge:
      '已结束',

    reuse:
      '再次使用',

    stop:
      '停止',

    stopping:
      '正在停止...',

    required:
      '请输入公告标题。',

    published:
      '公告发布成功。',

    stopped:
      '公告已停止。',

    invalidImage:
      '仅支持 JPG、PNG 和 WEBP。',

    imageTooLarge:
      '图片大小不得超过 8 MB。',
  },


  ja: {
    active:
      '現在の告知',

    history:
      '告知履歴',

    duration:
      '最大有効時間',

    hours:
      '6時間',

    create:
      'Meloからのお知らせを作成',

    createDesc:
      'Androidと同じシステムでMeloの全体告知を作成します。',

    delivery:
      '表示モード',

    hourly:
      '1時間ごと',

    hourlyDesc:
      '1時間ごとにMeloのお知らせを1回表示します。',

    interval:
      'キューへ挿入',

    intervalDesc:
      '指定件数のメンバー告知の後にMeloを表示します。',

    empty:
      'キューが空のとき',

    emptyDesc:
      'Trip / Event / Community の告知がないときに表示します。',

    every:
      '挿入間隔',

    notices:
      '件',

    image:
      '広告画像',

    imageOptional:
      '任意 · 最大1枚',

    addImage:
      '広告画像を追加',

    imageHint:
      '推奨 16:9 · JPG / PNG / WEBP · 最大8 MB',

    changeImage:
      '画像を変更',

    removeImage:
      '画像を削除',

    title:
      'お知らせタイトル',

    titlePlaceholder:
      '例：📢 Meloからのお知らせ',

    body:
      '本文 / 詳細',

    bodyPlaceholder:
      'ニュース、キャンペーン、条件、詳細を入力...',

    preview:
      'プレビュー',

    previewDesc:
      'Homeへ公開する前に確認できます。',

    publish:
      '公開する',

    publishing:
      '公開中...',

    refresh:
      '更新',

    noActive:
      '有効なお知らせはありません',

    noHistory:
      '告知履歴はまだありません',

    activeBadge:
      'ACTIVE',

    endedBadge:
      '終了',

    reuse:
      '再利用',

    stop:
      '停止',

    stopping:
      '停止中...',

    required:
      'タイトルを入力してください。',

    published:
      'お知らせを公開しました。',

    stopped:
      'お知らせを停止しました。',

    invalidImage:
      'JPG、PNG、WEBPのみ対応しています。',

    imageTooLarge:
      '画像は8 MB以下にしてください。',
  },


  ko: {
    active:
      '현재 공지',

    history:
      '공지 기록',

    duration:
      '최대 활성 시간',

    hours:
      '6시간',

    create:
      'Melo 공지 만들기',

    createDesc:
      'Android와 동일한 시스템으로 전체 Melo 공지를 만듭니다.',

    delivery:
      '표시 방식',

    hourly:
      '매시간',

    hourlyDesc:
      '매시간 Melo 공지를 한 번 표시합니다.',

    interval:
      '대기열 삽입',

    intervalDesc:
      '설정한 회원 공지 수 이후 Melo 공지를 표시합니다.',

    empty:
      '대기열이 비었을 때',

    emptyDesc:
      'Trip / Event / Community 공지가 없을 때 표시합니다.',

    every:
      '매',

    notices:
      '개 공지 후',

    image:
      '광고 이미지',

    imageOptional:
      '선택 · 최대 1장',

    addImage:
      '광고 이미지 추가',

    imageHint:
      '권장 16:9 · JPG / PNG / WEBP · 최대 8 MB',

    changeImage:
      '이미지 변경',

    removeImage:
      '이미지 삭제',

    title:
      '공지 제목',

    titlePlaceholder:
      '예: 📢 Melo 소식',

    body:
      '메시지 / 상세내용',

    bodyPlaceholder:
      '뉴스, 프로모션, 조건 또는 상세내용을 입력하세요...',

    preview:
      '공지 미리보기',

    previewDesc:
      'Home에 게시하기 전에 확인합니다.',

    publish:
      '공지 게시',

    publishing:
      '게시 중...',

    refresh:
      '새로고침',

    noActive:
      '활성 공지 없음',

    noHistory:
      '공지 기록이 없습니다',

    activeBadge:
      'ACTIVE',

    endedBadge:
      '종료됨',

    reuse:
      '다시 사용',

    stop:
      '중지',

    stopping:
      '중지 중...',

    required:
      '공지 제목을 입력하세요.',

    published:
      '공지를 게시했습니다.',

    stopped:
      '공지를 중지했습니다.',

    invalidImage:
      'JPG, PNG, WEBP만 지원합니다.',

    imageTooLarge:
      '이미지는 8 MB를 초과할 수 없습니다.',
  },
};


function localeTag(
  locale: string,
) {
  return (
    {
      th: 'th-TH',
      en: 'en-US',
      de: 'de-DE',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
    } as Record<string, string>
  )[locale] ?? 'en-US';
}


function formatDate(
  value: string,
  locale: string,
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    localeTag(locale),
    {
      dateStyle:
        'medium',

      timeStyle:
        'short',
    },
  );
}


function normalizeMode(
  value:
    LiveNoticeDeliveryMode,
): AdminDeliveryMode {
  if (
    value === 'interval'
  ) {
    return 'interval';
  }

  if (
    value === 'empty'
  ) {
    return 'empty';
  }

  return 'hourly';
}


export default function AdminLiveNoticeWorkspace() {
  const {
    locale,
  } =
    useLocale();

  const t =
    COPY[locale] ??
    COPY.en;

  const fileRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    history,
    setHistory,
  ] =
    useState<
      LiveNoticeWeb[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    publishing,
    setPublishing,
  ] =
    useState(false);

  const [
    stopping,
    setStopping,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState('');

  const [
    title,
    setTitle,
  ] =
    useState('');

  const [
    body,
    setBody,
  ] =
    useState('');

  const [
    mode,
    setMode,
  ] =
    useState<
      AdminDeliveryMode
    >(
      'hourly',
    );

  const [
    queueEvery,
    setQueueEvery,
  ] =
    useState(10);

  const [
    imageFile,
    setImageFile,
  ] =
    useState<
      File |
      null
    >(
      null,
    );

  const [
    localImageUrl,
    setLocalImageUrl,
  ] =
    useState('');

  const [
    existingImagePath,
    setExistingImagePath,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const [
    existingImageUrl,
    setExistingImageUrl,
  ] =
    useState('');


  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError('');

        try {
          const rows =
            await listAdminMeloLiveNoticeHistoryForWeb(
              10,
            );

          setHistory(
            rows,
          );
        } catch (
          cause
        ) {
          setError(
            cause instanceof Error
              ? cause.message
              : String(
                  cause,
                ),
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );


  useEffect(
    () => {
      if (
        !imageFile
      ) {
        setLocalImageUrl('');
        return;
      }

      const url =
        URL.createObjectURL(
          imageFile,
        );

      setLocalImageUrl(
        url,
      );

      return () => {
        URL.revokeObjectURL(
          url,
        );
      };
    },
    [
      imageFile,
    ],
  );


  const activeNotice =
    useMemo(
      () =>
        history.find(
          (notice) =>
            notice.isActive &&
            (
              !notice.expiresAt ||
              new Date(
                notice.expiresAt,
              ).getTime() >
              Date.now()
            ),
        ) ??
        null,
      [
        history,
      ],
    );


  const previewImage =
    localImageUrl ||
    existingImageUrl;


  function clearImage() {
    setImageFile(
      null,
    );

    setExistingImagePath(
      null,
    );

    setExistingImageUrl(
      '',
    );

    if (
      fileRef.current
    ) {
      fileRef.current.value =
        '';
    }
  }


  function selectImage(
    file:
      File |
      null,
  ) {
    if (
      !file
    ) {
      return;
    }

    setError('');
    setSuccess('');

    const supported =
      [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

    if (
      !supported.includes(
        file.type
          .toLowerCase(),
      )
    ) {
      setError(
        t.invalidImage,
      );

      return;
    }

    if (
      file.size >
      ADMIN_LIVE_NOTICE_MAX_IMAGE_BYTES
    ) {
      setError(
        t.imageTooLarge,
      );

      return;
    }

    setImageFile(
      file,
    );

    setExistingImagePath(
      null,
    );

    setExistingImageUrl(
      '',
    );
  }


  async function publish() {
    const cleanTitle =
      title.trim();

    if (
      !cleanTitle ||
      publishing
    ) {
      if (
        !cleanTitle
      ) {
        setError(
          t.required,
        );
      }

      return;
    }

    setPublishing(
      true,
    );

    setError('');
    setSuccess('');

    try {
      await createAdminMeloLiveNoticeForWeb({
        title:
          cleanTitle,

        body:
          body.trim(),

        deliveryMode:
          mode,

        queueEvery:
          mode ===
          'interval'
            ? queueEvery
            : null,

        image:
          imageFile,

        existingImagePath,
      });

      setTitle('');
      setBody('');

      setMode(
        'hourly',
      );

      setQueueEvery(
        10,
      );

      clearImage();

      setSuccess(
        t.published,
      );

      await load();
    } catch (
      cause
    ) {
      const message =
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            );

      if (
        message ===
        'ADMIN_LIVE_NOTICE_IMAGE_TYPE'
      ) {
        setError(
          t.invalidImage,
        );
      } else if (
        message ===
        'ADMIN_LIVE_NOTICE_IMAGE_TOO_LARGE'
      ) {
        setError(
          t.imageTooLarge,
        );
      } else {
        setError(
          message,
        );
      }
    } finally {
      setPublishing(
        false,
      );
    }
  }


  async function stopNotice(
    notice:
      LiveNoticeWeb,
  ) {
    if (
      stopping
    ) {
      return;
    }

    setStopping(
      notice.id,
    );

    setError('');
    setSuccess('');

    try {
      await deactivateAdminMeloLiveNoticeForWeb(
        notice.id,
      );

      setSuccess(
        t.stopped,
      );

      await load();
    } catch (
      cause
    ) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setStopping('');
    }
  }


  function reuse(
    notice:
      LiveNoticeWeb,
  ) {
    setTitle(
      notice.title,
    );

    setBody(
      notice.body,
    );

    setMode(
      normalizeMode(
        notice.deliveryMode,
      ),
    );

    setQueueEvery(
      notice.queueEvery ??
      10,
    );

    setImageFile(
      null,
    );

    setExistingImagePath(
      notice.imagePath,
    );

    setExistingImageUrl(
      notice.imageUrl,
    );

    if (
      fileRef.current
    ) {
      fileRef.current.value =
        '';
    }

    document
      .getElementById(
        'admin-live-notice-editor',
      )
      ?.scrollIntoView({
        behavior:
          'smooth',

        block:
          'start',
      });
  }


  return (
    <section
      className={
        styles.workspace
      }
    >
      <div
        className={
          styles.metrics
        }
      >
        <div
          data-active={
            Boolean(
              activeNotice,
            )
          }
        >
          <span>
            {t.active}
          </span>

          <strong>
            {activeNotice
              ? t.activeBadge
              : t.noActive}
          </strong>
        </div>

        <div>
          <span>
            {t.history}
          </span>

          <strong>
            {history.length}
          </strong>
        </div>

        <div>
          <span>
            {t.duration}
          </span>

          <strong>
            {t.hours}
          </strong>
        </div>
      </div>

      {error ? (
        <div
          className={
            styles.error
          }
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          className={
            styles.success
          }
        >
          ✓ {success}
        </div>
      ) : null}

      <div
        className={
          styles.mainGrid
        }
      >
        <section
          id="admin-live-notice-editor"
          className={
            styles.card
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <small>
                ADMIN LIVE
              </small>

              <h3>
                {t.create}
              </h3>

              <p>
                {t.createDesc}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void load()
              }
            >
              ↻ {t.refresh}
            </button>
          </header>

          <div
            className={
              styles.section
            }
          >
            <strong
              className={
                styles.sectionTitle
              }
            >
              {t.delivery}
            </strong>

            <div
              className={
                styles.modes
              }
            >
              <button
                type="button"
                data-active={
                  mode ===
                  'hourly'
                }
                onClick={() =>
                  setMode(
                    'hourly',
                  )
                }
              >
                <b>1H</b>

                <strong>
                  {t.hourly}
                </strong>

                <small>
                  {t.hourlyDesc}
                </small>
              </button>

              <button
                type="button"
                data-active={
                  mode ===
                  'interval'
                }
                onClick={() =>
                  setMode(
                    'interval',
                  )
                }
              >
                <b>N</b>

                <strong>
                  {t.interval}
                </strong>

                <small>
                  {t.intervalDesc}
                </small>
              </button>

              <button
                type="button"
                data-active={
                  mode ===
                  'empty'
                }
                onClick={() =>
                  setMode(
                    'empty',
                  )
                }
              >
                <b>0</b>

                <strong>
                  {t.empty}
                </strong>

                <small>
                  {t.emptyDesc}
                </small>
              </button>
            </div>

            {mode ===
            'interval' ? (
              <div
                className={
                  styles.interval
                }
              >
                <span>
                  {t.every}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQueueEvery(
                      (
                        current,
                      ) =>
                        Math.max(
                          1,
                          current -
                            1,
                        ),
                    )
                  }
                >
                  −
                </button>

                <strong>
                  {queueEvery}
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    setQueueEvery(
                      (
                        current,
                      ) =>
                        Math.min(
                          50,
                          current +
                            1,
                        ),
                    )
                  }
                >
                  +
                </button>

                <span>
                  {t.notices}
                </span>
              </div>
            ) : null}
          </div>


          <div
            className={
              styles.section
            }
          >
            <div
              className={
                styles.fieldHeading
              }
            >
              <span>
                {t.image}
              </span>

              <small>
                {t.imageOptional}
              </small>
            </div>

            <input
              ref={
                fileRef
              }
              className={
                styles.hiddenFile
              }
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(
                event,
              ) =>
                selectImage(
                  event
                    .target
                    .files?.[0] ??
                  null,
                )
              }
            />

            {previewImage ? (
              <div
                className={
                  styles.imagePreview
                }
              >
                <img
                  src={
                    previewImage
                  }
                  alt=""
                />

                <div
                  className={
                    styles.imageActions
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      fileRef
                        .current
                        ?.click()
                    }
                  >
                    {t.changeImage}
                  </button>

                  <button
                    type="button"
                    data-danger="true"
                    onClick={
                      clearImage
                    }
                  >
                    {t.removeImage}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={
                  styles.imagePicker
                }
                onClick={() =>
                  fileRef
                    .current
                    ?.click()
                }
              >
                <b>＋</b>

                <strong>
                  {t.addImage}
                </strong>

                <span>
                  {t.imageHint}
                </span>
              </button>
            )}
          </div>


          <div
            className={
              styles.section
            }
          >
            <label>
              <span>
                {t.title}
              </span>

              <small>
                {title.length}/80
              </small>
            </label>

            <input
              value={
                title
              }
              maxLength={
                80
              }
              placeholder={
                t.titlePlaceholder
              }
              onChange={(
                event,
              ) =>
                setTitle(
                  event
                    .target
                    .value,
                )
              }
            />

            <label>
              <span>
                {t.body}
              </span>

              <small>
                {body.length}/1200
              </small>
            </label>

            <textarea
              value={
                body
              }
              maxLength={
                1200
              }
              rows={
                8
              }
              placeholder={
                t.bodyPlaceholder
              }
              onChange={(
                event,
              ) =>
                setBody(
                  event
                    .target
                    .value,
                )
              }
            />

            <button
              type="button"
              className={
                styles.publish
              }
              disabled={
                publishing ||
                !title.trim()
              }
              onClick={() =>
                void publish()
              }
            >
              {publishing
                ? t.publishing
                : t.publish}
            </button>
          </div>
        </section>


        <aside
          className={
            styles.previewCard
          }
        >
          <small>
            LIVE PREVIEW
          </small>

          <h3>
            {t.preview}
          </h3>

          <p>
            {t.previewDesc}
          </p>

          <div
            className={
              styles.preview
            }
          >
            <div
              className={
                styles.previewLive
              }
            >
              <i />

              <strong>
                LIVE
              </strong>

              <span>
                {mode ===
                'hourly'
                  ? t.hourly
                  : mode ===
                      'empty'
                    ? t.empty
                    : `${t.interval} ${queueEvery}`}
              </span>
            </div>

            <div
              className={
                styles.melo
              }
            >
              <img
                src="/melo-admin-live-profile.png"
                alt="Melo"
              />

              <span>
                <strong>
                  Melo Admin
                </strong>

                <small>
                  MELO
                </small>
              </span>
            </div>

            {previewImage ? (
              <img
                className={
                  styles.previewImage
                }
                src={
                  previewImage
                }
                alt=""
              />
            ) : null}

            <h4>
              {title ||
                t.titlePlaceholder}
            </h4>

            <p>
              {body ||
                t.bodyPlaceholder}
            </p>
          </div>
        </aside>
      </div>


      <section
        className={
          styles.history
        }
      >
        <header>
          <div>
            <small>
              HISTORY
            </small>

            <h3>
              {t.history}
            </h3>
          </div>

          <b>
            {history.length}
          </b>
        </header>

        {loading ? (
          <div
            className={
              styles.emptyState
            }
          >
            …
          </div>
        ) : history.length ? (
          <div
            className={
              styles.historyList
            }
          >
            {history.map(
              (
                notice,
              ) => (
                <article
                  key={
                    notice.id
                  }
                >
                  <div
                    className={
                      styles.historyImage
                    }
                  >
                    <img
                      src={
                        notice.imageUrl ||
                        '/melo-admin-live-profile.png'
                      }
                      alt=""
                    />
                  </div>

                  <div
                    className={
                      styles.historyCopy
                    }
                  >
                    <div>
                      <span
                        data-active={
                          notice.isActive
                        }
                      >
                        {notice.isActive
                          ? t.activeBadge
                          : t.endedBadge}
                      </span>

                      <small>
                        {formatDate(
                          notice.createdAt,
                          locale,
                        )}
                      </small>
                    </div>

                    <strong>
                      {notice.title}
                    </strong>

                    {notice.body ? (
                      <p>
                        {notice.body}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={
                      styles.historyActions
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        reuse(
                          notice,
                        )
                      }
                    >
                      {t.reuse}
                    </button>

                    {notice.isActive ? (
                      <button
                        type="button"
                        data-danger="true"
                        disabled={
                          stopping ===
                          notice.id
                        }
                        onClick={() =>
                          void stopNotice(
                            notice,
                          )
                        }
                      >
                        {stopping ===
                        notice.id
                          ? t.stopping
                          : t.stop}
                      </button>
                    ) : null}
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <div
            className={
              styles.emptyState
            }
          >
            {t.noHistory}
          </div>
        )}
      </section>
    </section>
  );
}
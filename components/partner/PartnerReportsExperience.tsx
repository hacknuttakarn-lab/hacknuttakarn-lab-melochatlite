'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useLocale } from '@/components/SiteProviders';

import PartnerModeHeader from './PartnerModeHeader';

import {
  getActivePartnerBusiness,
  getPartnerDashboardSummary,
  hasPartnerPermission,
  listPartnerTransactions,
  type PartnerBusinessAccess,
  type PartnerDashboardSummary,
  type PartnerTransaction,
} from './partnerModeWeb';

import baseStyles from './PartnerMode.module.css';
import styles from './PartnerReportsExperience.module.css';

type Period = 'today' | '7d' | '30d' | 'month' | 'all';
type KindFilter = 'all' | 'booking' | 'order' | 'coupon';
type StatusFilter = 'all' | 'pending' | 'success' | 'cancelled';
type StatusGroup = Exclude<StatusFilter, 'all'>;

const EMPTY_SUMMARY: PartnerDashboardSummary = {
  serviceCount: 0,
  pendingBookings: 0,
  activeCoupons: 0,
  paidOrders: 0,
  grossSales: 0,
  averageRating: 0,
  reviewCount: 0,
};

const SUCCESS_STATUSES = new Set([
  'confirmed',
  'approved',
  'accepted',
  'paid',
  'reserved',
  'booked',
  'ready',
  'active',
  'completed',
  'redeemed',
  'used',
  'fulfilled',
  'served',
  'done',
  'consumed',
  'succeeded',
  'success',
]);

const REDEEMED_STATUSES = new Set([
  'completed',
  'redeemed',
  'used',
  'fulfilled',
  'served',
  'done',
  'consumed',
]);

const CANCELLED_STATUSES = new Set([
  'cancelled',
  'canceled',
  'rejected',
  'expired',
  'failed',
  'refunded',
]);

const COPY = {
  th: {
    eyebrow: 'MELO PARTNER',
    title: 'รายงานร้านค้า',
    subtitle:
      'ตรวจสอบยอดขาย การจอง ออเดอร์ คูปอง และประวัติการทำรายการย้อนหลัง',
    export: 'ส่งออก CSV',
    refresh: 'รีเฟรช',
    loading: 'กำลังโหลดรายงานร้านค้า…',
    noAccess: 'ไม่มีสิทธิ์ดูรายงานร้านค้า',

    today: 'วันนี้',
    '7d': '7 วัน',
    '30d': '30 วัน',
    month: 'เดือนนี้',
    all: 'ทั้งหมด',

    sales: 'ยอดขาย',
    successfulTransactions: 'รายการสำเร็จ',
    customers: 'ลูกค้า',
    redeemedCoupons: 'คูปองใช้แล้ว',

    summaryTitle: 'สรุปตามประเภทรายการ',
    booking: 'การจอง',
    order: 'ออเดอร์',
    coupon: 'คูปอง / ดีล',
    pending: 'รอดำเนินการ',
    success: 'สำเร็จ',
    cancelled: 'ยกเลิก / ปฏิเสธ',

    historyTitle: 'ประวัติการทำรายการ',
    historySubtitle: 'กรองรายการตามประเภทและสถานะ',
    typeFilter: 'ประเภท',
    statusFilter: 'สถานะ',
    noTransactions: 'ไม่พบรายการในช่วงเวลาหรือตัวกรองนี้',

    customer: 'ลูกค้า',

    storeInfoTitle: 'ข้อมูลร้านสำหรับรายงาน',
    store: 'ร้านค้า',
    services: 'บริการทั้งหมด',
    averageRating: 'คะแนนเฉลี่ย',
    reviews: 'จำนวนรีวิว',
    oneTimeCustomers: 'ลูกค้า 1 ครั้ง',
    repeatCustomers: 'ลูกค้าซ้ำ',
  },

  en: {
    eyebrow: 'MELO PARTNER',
    title: 'Store reports',
    subtitle:
      'Review sales, bookings, orders, coupons and historical transactions',
    export: 'Export CSV',
    refresh: 'Refresh',
    loading: 'Loading store reports…',
    noAccess: 'You do not have permission to view store reports',

    today: 'Today',
    '7d': '7 days',
    '30d': '30 days',
    month: 'This month',
    all: 'All',

    sales: 'Sales',
    successfulTransactions: 'Successful transactions',
    customers: 'Customers',
    redeemedCoupons: 'Coupons redeemed',

    summaryTitle: 'Transaction summary',
    booking: 'Bookings',
    order: 'Orders',
    coupon: 'Coupons / deals',
    pending: 'Pending',
    success: 'Successful',
    cancelled: 'Cancelled / rejected',

    historyTitle: 'Transaction history',
    historySubtitle: 'Filter transactions by type and status',
    typeFilter: 'Type',
    statusFilter: 'Status',
    noTransactions: 'No transactions match this period or filter',

    customer: 'Customer',

    storeInfoTitle: 'Store information for report',
    store: 'Store',
    services: 'Total services',
    averageRating: 'Average rating',
    reviews: 'Reviews',
    oneTimeCustomers: 'One-time customers',
    repeatCustomers: 'Repeat customers',
  },

  de: {
    eyebrow: 'MELO PARTNER',
    title: 'Store-Berichte',
    subtitle:
      'Umsatz, Buchungen, Bestellungen, Coupons und Vorgangsverlauf prüfen',
    export: 'CSV exportieren',
    refresh: 'Aktualisieren',
    loading: 'Berichte werden geladen…',
    noAccess: 'Keine Berechtigung für Store-Berichte',

    today: 'Heute',
    '7d': '7 Tage',
    '30d': '30 Tage',
    month: 'Dieser Monat',
    all: 'Alle',

    sales: 'Umsatz',
    successfulTransactions: 'Erfolgreiche Vorgänge',
    customers: 'Kunden',
    redeemedCoupons: 'Coupons eingelöst',

    summaryTitle: 'Zusammenfassung nach Vorgang',
    booking: 'Buchungen',
    order: 'Bestellungen',
    coupon: 'Coupons / Deals',
    pending: 'Offen',
    success: 'Erfolgreich',
    cancelled: 'Storniert / abgelehnt',

    historyTitle: 'Vorgangsverlauf',
    historySubtitle: 'Nach Typ und Status filtern',
    typeFilter: 'Typ',
    statusFilter: 'Status',
    noTransactions: 'Keine passenden Vorgänge',

    customer: 'Kunde',

    storeInfoTitle: 'Store-Daten für Bericht',
    store: 'Store',
    services: 'Services gesamt',
    averageRating: 'Ø Bewertung',
    reviews: 'Bewertungen',
    oneTimeCustomers: 'Einmalkunden',
    repeatCustomers: 'Wiederkehrende Kunden',
  },

  zh: {
    eyebrow: 'MELO PARTNER',
    title: '店铺报告',
    subtitle: '查看销售、预订、订单、优惠券及历史交易记录',
    export: '导出 CSV',
    refresh: '刷新',
    loading: '正在加载店铺报告…',
    noAccess: '你没有查看店铺报告的权限',

    today: '今天',
    '7d': '7 天',
    '30d': '30 天',
    month: '本月',
    all: '全部',

    sales: '销售额',
    successfulTransactions: '成功交易',
    customers: '客户',
    redeemedCoupons: '已核销优惠券',

    summaryTitle: '按交易类型汇总',
    booking: '预订',
    order: '订单',
    coupon: '优惠券 / 优惠',
    pending: '待处理',
    success: '成功',
    cancelled: '取消 / 拒绝',

    historyTitle: '交易历史',
    historySubtitle: '按类型和状态筛选',
    typeFilter: '类型',
    statusFilter: '状态',
    noTransactions: '没有符合当前条件的交易',

    customer: '客户',

    storeInfoTitle: '报告店铺信息',
    store: '店铺',
    services: '服务总数',
    averageRating: '平均评分',
    reviews: '评价数',
    oneTimeCustomers: '单次客户',
    repeatCustomers: '回头客',
  },

  ja: {
    eyebrow: 'MELO PARTNER',
    title: '店舗レポート',
    subtitle: '売上、予約、注文、クーポン、取引履歴を確認',
    export: 'CSV出力',
    refresh: '更新',
    loading: '店舗レポートを読み込み中…',
    noAccess: '店舗レポートの権限がありません',

    today: '今日',
    '7d': '7日',
    '30d': '30日',
    month: '今月',
    all: 'すべて',

    sales: '売上',
    successfulTransactions: '成功取引',
    customers: '顧客',
    redeemedCoupons: 'クーポン利用済み',

    summaryTitle: '取引タイプ別サマリー',
    booking: '予約',
    order: '注文',
    coupon: 'クーポン / ディール',
    pending: '保留中',
    success: '成功',
    cancelled: 'キャンセル / 拒否',

    historyTitle: '取引履歴',
    historySubtitle: 'タイプと状態で絞り込み',
    typeFilter: 'タイプ',
    statusFilter: '状態',
    noTransactions: '該当する取引はありません',

    customer: '顧客',

    storeInfoTitle: 'レポート用店舗情報',
    store: '店舗',
    services: 'サービス総数',
    averageRating: '平均評価',
    reviews: 'レビュー数',
    oneTimeCustomers: '1回利用の顧客',
    repeatCustomers: 'リピーター',
  },

  ko: {
    eyebrow: 'MELO PARTNER',
    title: '매장 보고서',
    subtitle: '매출, 예약, 주문, 쿠폰 및 과거 거래 내역을 확인하세요',
    export: 'CSV 내보내기',
    refresh: '새로고침',
    loading: '매장 보고서를 불러오는 중…',
    noAccess: '매장 보고서 권한이 없습니다',

    today: '오늘',
    '7d': '7일',
    '30d': '30일',
    month: '이번 달',
    all: '전체',

    sales: '매출',
    successfulTransactions: '성공 거래',
    customers: '고객',
    redeemedCoupons: '쿠폰 사용 완료',

    summaryTitle: '거래 유형 요약',
    booking: '예약',
    order: '주문',
    coupon: '쿠폰 / 딜',
    pending: '대기',
    success: '성공',
    cancelled: '취소 / 거절',

    historyTitle: '거래 내역',
    historySubtitle: '유형과 상태로 필터링',
    typeFilter: '유형',
    statusFilter: '상태',
    noTransactions: '조건에 맞는 거래가 없습니다',

    customer: '고객',

    storeInfoTitle: '보고서용 매장 정보',
    store: '매장',
    services: '전체 서비스',
    averageRating: '평균 평점',
    reviews: '리뷰 수',
    oneTimeCustomers: '1회 고객',
    repeatCustomers: '재방문 고객',
  },
} as const;

type Copy =
  (typeof COPY)[keyof typeof COPY];

function normalizeStatus(
  value: string,
) {
  return String(
    value || '',
  )
    .trim()
    .toLowerCase();
}

function statusGroup(
  item: PartnerTransaction,
): StatusGroup {
  const status =
    normalizeStatus(
      item.status,
    );

  if (
    CANCELLED_STATUSES.has(
      status,
    )
  ) {
    return 'cancelled';
  }

  if (
    SUCCESS_STATUSES.has(
      status,
    )
  ) {
    return 'success';
  }

  return 'pending';
}

function isRedeemedCoupon(
  item: PartnerTransaction,
) {
  return (
    item.kind ===
      'coupon' &&
    REDEEMED_STATUSES.has(
      normalizeStatus(
        item.status,
      ),
    )
  );
}

function transactionDate(
  item: PartnerTransaction,
) {
  const value =
    item.createdAt ||
    item.scheduledAt ||
    '';

  const date =
    new Date(
      value,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function startOfDay(
  value: Date,
) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );
}

function periodStart(
  period: Period,
  now: Date,
) {
  if (
    period ===
    'all'
  ) {
    return null;
  }

  if (
    period ===
    'today'
  ) {
    return startOfDay(
      now,
    );
  }

  if (
    period ===
    'month'
  ) {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );
  }

  const days =
    period ===
    '7d'
      ? 7
      : 30;

  const start =
    startOfDay(
      now,
    );

  start.setDate(
    start.getDate() -
      (
        days -
        1
      ),
  );

  return start;
}

function transactionKey(
  item: PartnerTransaction,
) {
  const reference =
    String(
      item.referenceCode ||
        '',
    )
      .trim()
      .replace(
        /^#+/,
        '',
      )
      .toLowerCase();

  return reference
    ? `${item.kind}:${reference}`
    : `${item.kind}:${item.id}`;
}

function dedupeTransactions(
  items:
    PartnerTransaction[],
) {
  const map =
    new Map<
      string,
      PartnerTransaction
    >();

  items.forEach(
    (
      item,
    ) => {
      const key =
        transactionKey(
          item,
        );

      const current =
        map.get(
          key,
        );

      if (
        !current
      ) {
        map.set(
          key,
          item,
        );

        return;
      }

      const oldGroup =
        statusGroup(
          current,
        );

      const newGroup =
        statusGroup(
          item,
        );

      if (
        oldGroup !==
          'success' &&
        newGroup ===
          'success'
      ) {
        map.set(
          key,
          item,
        );

        return;
      }

      if (
        (
          item.amount ||
          0
        ) >
        (
          current.amount ||
          0
        )
      ) {
        map.set(
          key,
          item,
        );

        return;
      }

      const oldDate =
        transactionDate(
          current,
        )?.getTime() ||
        0;

      const newDate =
        transactionDate(
          item,
        )?.getTime() ||
        0;

      if (
        newDate >
        oldDate
      ) {
        map.set(
          key,
          item,
        );
      }
    },
  );

  return [
    ...map.values(),
  ].sort(
    (
      left,
      right,
    ) =>
      (
        transactionDate(
          right,
        )?.getTime() ||
        0
      ) -
      (
        transactionDate(
          left,
        )?.getTime() ||
        0
      ),
  );
}

function customerKey(
  item: PartnerTransaction,
) {
  if (
    item.customerUserId
  ) {
    return `id:${item.customerUserId}`;
  }

  return `name:${String(
    item.customerName ||
      'Melo member',
  )
    .trim()
    .toLowerCase()}`;
}

function money(
  value: number,
  currency = 'THB',
) {
  const code =
    String(
      currency ||
        'THB',
    )
      .trim()
      .toUpperCase();

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style:
          'currency',
        currency:
          code,
        minimumFractionDigits:
          0,
        maximumFractionDigits:
          2,
      },
    ).format(
      value ||
        0,
    );
  } catch {
    return `${code} ${Number(
      value ||
        0,
    ).toLocaleString(
      undefined,
      {
        maximumFractionDigits:
          2,
      },
    )}`;
  }
}

function localeName(
  locale: string,
) {
  if (
    locale ===
    'th'
  ) {
    return 'th-TH';
  }

  if (
    locale ===
    'de'
  ) {
    return 'de-DE';
  }

  if (
    locale ===
    'zh'
  ) {
    return 'zh-CN';
  }

  if (
    locale ===
    'ja'
  ) {
    return 'ja-JP';
  }

  if (
    locale ===
    'ko'
  ) {
    return 'ko-KR';
  }

  return 'en-US';
}

function formatDate(
  value: string,
  locale: string,
) {
  if (
    !value
  ) {
    return '—';
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      localeName(
        locale,
      ),
      {
        dateStyle:
          'medium',
        timeStyle:
          'short',
      },
    ).format(
      date,
    );
  } catch {
    return date.toLocaleString();
  }
}

function kindLabel(
  kind:
    PartnerTransaction[
      'kind'
    ],
  copy:
    Copy,
) {
  if (
    kind ===
    'booking'
  ) {
    return copy.booking;
  }

  if (
    kind ===
    'order'
  ) {
    return copy.order;
  }

  return copy.coupon;
}

function kindIcon(
  kind:
    PartnerTransaction[
      'kind'
    ],
) {
  if (
    kind ===
    'booking'
  ) {
    return '📅';
  }

  if (
    kind ===
    'order'
  ) {
    return '🧾';
  }

  return '🎟';
}

function groupLabel(
  group:
    StatusGroup,
  copy:
    Copy,
) {
  if (
    group ===
    'success'
  ) {
    return copy.success;
  }

  if (
    group ===
    'cancelled'
  ) {
    return copy.cancelled;
  }

  return copy.pending;
}

function referenceLabel(
  value: string,
) {
  const clean =
    String(
      value ||
        '',
    )
      .trim()
      .replace(
        /^#+/,
        '',
      );

  return clean
    ? `#${clean}`
    : '—';
}

function csvEscape(
  value: unknown,
) {
  return `"${String(
    value ??
      '',
  ).replace(
    /"/g,
    '""',
  )}"`;
}

export default function PartnerReportsExperience() {
  const {
    locale,
  } =
    useLocale();

  const copy =
    COPY[
      locale as keyof typeof COPY
    ] ??
    COPY.en;

  const [
    access,
    setAccess,
  ] =
    useState<
      PartnerBusinessAccess |
      null
    >(null);

  const [
    summary,
    setSummary,
  ] =
    useState<
      PartnerDashboardSummary
    >(
      EMPTY_SUMMARY,
    );

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      PartnerTransaction[]
    >([]);

  const [
    period,
    setPeriod,
  ] =
    useState<Period>(
      '30d',
    );

  const [
    kindFilter,
    setKindFilter,
  ] =
    useState<KindFilter>(
      'all',
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      'all',
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState('');

  const load =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError('');

        try {
          const nextAccess =
            await getActivePartnerBusiness();

          setAccess(
            nextAccess,
          );

          if (
            !nextAccess ||
            !hasPartnerPermission(
              nextAccess,
              'reports',
            )
          ) {
            setSummary(
              EMPTY_SUMMARY,
            );

            setTransactions(
              [],
            );

            return;
          }

          const [
            nextSummary,
            nextTransactions,
          ] =
            await Promise.all([
              getPartnerDashboardSummary(
                nextAccess.businessId,
              ),

              listPartnerTransactions(
                nextAccess.businessId,
              ),
            ]);

          setSummary(
            nextSummary,
          );

          setTransactions(
            dedupeTransactions(
              nextTransactions,
            ),
          );
        } catch (
          cause
        ) {
          setError(
            cause instanceof
              Error
              ? cause.message
              : String(
                  cause,
                ),
          );
        } finally {
          setLoading(
            false,
          );
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

  const periodTransactions =
    useMemo(
      () => {
        const now =
          new Date();

        const start =
          periodStart(
            period,
            now,
          );

        if (
          !start
        ) {
          return transactions;
        }

        return transactions.filter(
          (
            item,
          ) => {
            const date =
              transactionDate(
                item,
              );

            return Boolean(
              date &&
              date >=
                start &&
              date <=
                now,
            );
          },
        );
      },
      [
        transactions,
        period,
      ],
    );

  const report =
    useMemo(
      () => {
        const successful =
          periodTransactions.filter(
            (
              item,
            ) =>
              statusGroup(
                item,
              ) ===
              'success',
          );

        const customers =
          new Map<
            string,
            number
          >();

        periodTransactions.forEach(
          (
            item,
          ) => {
            if (
              statusGroup(
                item,
              ) ===
              'cancelled'
            ) {
              return;
            }

            const key =
              customerKey(
                item,
              );

            customers.set(
              key,
              (
                customers.get(
                  key,
                ) ||
                0
              ) +
                1,
            );
          },
        );

        const customerCounts =
          [
            ...customers.values(),
          ];

        return {
          grossSales:
            successful.reduce(
              (
                total,
                item,
              ) =>
                total +
                (
                  item.amount ||
                  0
                ),
              0,
            ),

          successfulTransactions:
            successful.length,

          uniqueCustomers:
            customers.size,

          redeemedCoupons:
            periodTransactions.filter(
              isRedeemedCoupon,
            ).length,

          bookingCount:
            periodTransactions.filter(
              (
                item,
              ) =>
                item.kind ===
                'booking',
            ).length,

          orderCount:
            periodTransactions.filter(
              (
                item,
              ) =>
                item.kind ===
                'order',
            ).length,

          couponCount:
            periodTransactions.filter(
              (
                item,
              ) =>
                item.kind ===
                'coupon',
            ).length,

          pendingCount:
            periodTransactions.filter(
              (
                item,
              ) =>
                statusGroup(
                  item,
                ) ===
                'pending',
            ).length,

          successCount:
            successful.length,

          cancelledCount:
            periodTransactions.filter(
              (
                item,
              ) =>
                statusGroup(
                  item,
                ) ===
                'cancelled',
            ).length,

          oneTimeCustomers:
            customerCounts.filter(
              (
                count,
              ) =>
                count ===
                1,
            ).length,

          repeatCustomers:
            customerCounts.filter(
              (
                count,
              ) =>
                count >
                1,
            ).length,
        };
      },
      [
        periodTransactions,
      ],
    );

  const visibleTransactions =
    useMemo(
      () =>
        periodTransactions.filter(
          (
            item,
          ) => {
            if (
              kindFilter !==
                'all' &&
              item.kind !==
                kindFilter
            ) {
              return false;
            }

            if (
              statusFilter !==
                'all' &&
              statusGroup(
                item,
              ) !==
                statusFilter
            ) {
              return false;
            }

            return true;
          },
        ),
      [
        periodTransactions,
        kindFilter,
        statusFilter,
      ],
    );

  const exportCsv =
    useCallback(
      () => {
        const rows = [
          [
            'type',
            'reference',
            'customer',
            'service',
            'status',
            'amount',
            'currency',
            'created_at',
            'scheduled_at',
          ],

          ...periodTransactions.map(
            (
              item,
            ) => [
              item.kind,
              item.referenceCode,
              item.customerName,
              item.title,
              item.status,
              item.amount ??
                '',
              item.currency,
              item.createdAt,
              item.scheduledAt,
            ],
          ),
        ];

        const csv =
          rows
            .map(
              (
                row,
              ) =>
                row
                  .map(
                    csvEscape,
                  )
                  .join(
                    ',',
                  ),
            )
            .join(
              '\r\n',
            );

        const blob =
          new Blob(
            [
              `\ufeff${csv}`,
            ],
            {
              type:
                'text/csv;charset=utf-8',
            },
          );

        const url =
          URL.createObjectURL(
            blob,
          );

        const anchor =
          document.createElement(
            'a',
          );

        anchor.href =
          url;

        anchor.download =
          `melo-partner-report-${period}-${access?.businessId || 'store'}.csv`;

        document.body.appendChild(
          anchor,
        );

        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(
          url,
        );
      },
      [
        access?.businessId,
        period,
        periodTransactions,
      ],
    );

  const allowed =
    Boolean(
      access &&
      hasPartnerPermission(
        access,
        'reports',
      ),
    );

  return (
    <main
      className={
        baseStyles.partnerPage
      }
    >
      <PartnerModeHeader
        access={
          access
        }
        onBusinessChanged={() =>
          void load()
        }
        initialChatOpen={
          false
        }
      />

      <section
        className={
          baseStyles.partnerShell
        }
      >
        <header
          className={
            styles.pageHeading
          }
        >
          <div>
            <small>
              {
                copy.eyebrow
              }
            </small>

            <h1>
              {
                copy.title
              }
            </h1>

            <p>
              {
                copy.subtitle
              }
            </p>
          </div>

          <div
            className={
              styles.headerActions
            }
          >
            <button
              type="button"
              className={
                styles.exportButton
              }
              onClick={
                exportCsv
              }
              disabled={
                !allowed ||
                loading
              }
            >
              ↓{' '}
              {
                copy.export
              }
            </button>

            <button
              type="button"
              className={
                styles.refreshButton
              }
              onClick={() =>
                void load()
              }
              aria-label={
                copy.refresh
              }
              title={
                copy.refresh
              }
            >
              ↻
            </button>
          </div>
        </header>

        {error ? (
          <div
            className={
              styles.error
            }
          >
            {
              error
            }
          </div>
        ) : null}

        {loading ? (
          <div
            className={
              styles.loading
            }
          >
            {
              copy.loading
            }
          </div>
        ) : !allowed ? (
          <div
            className={
              styles.denied
            }
          >
            {
              copy.noAccess
            }
          </div>
        ) : (
          <>
            <div
              className={
                styles.periodBar
              }
            >
              {(
                [
                  'today',
                  '7d',
                  '30d',
                  'month',
                  'all',
                ] as Period[]
              ).map(
                (
                  item,
                ) => (
                  <button
                    key={
                      item
                    }
                    type="button"
                    data-active={
                      period ===
                      item
                    }
                    onClick={() =>
                      setPeriod(
                        item,
                      )
                    }
                  >
                    {
                      copy[
                        item
                      ]
                    }
                  </button>
                ),
              )}
            </div>

            <section
              className={
                styles.metricGrid
              }
            >
              <MetricCard
                icon="฿"
                label={
                  copy.sales
                }
                value={money(
                  report.grossSales,
                  'THB',
                )}
                accent
              />

              <MetricCard
                icon="✓"
                label={
                  copy.successfulTransactions
                }
                value={String(
                  report.successfulTransactions,
                )}
              />

              <MetricCard
                icon="👤"
                label={
                  copy.customers
                }
                value={String(
                  report.uniqueCustomers,
                )}
              />

              <MetricCard
                icon="🎟"
                label={
                  copy.redeemedCoupons
                }
                value={String(
                  report.redeemedCoupons,
                )}
              />
            </section>

            <section
              className={
                styles.reportGrid
              }
            >
              <article
                className={
                  styles.card
                }
              >
                <header
                  className={
                    styles.cardHeader
                  }
                >
                  <h2>
                    {
                      copy.summaryTitle
                    }
                  </h2>
                </header>

                <div
                  className={
                    styles.summaryList
                  }
                >
                  <SummaryRow
                    icon="📅"
                    label={
                      copy.booking
                    }
                    value={
                      report.bookingCount
                    }
                  />

                  <SummaryRow
                    icon="🧾"
                    label={
                      copy.order
                    }
                    value={
                      report.orderCount
                    }
                  />

                  <SummaryRow
                    icon="🎟"
                    label={
                      copy.coupon
                    }
                    value={
                      report.couponCount
                    }
                  />

                  <div
                    className={
                      styles.summaryDivider
                    }
                  />

                  <SummaryRow
                    icon="◷"
                    label={
                      copy.pending
                    }
                    value={
                      report.pendingCount
                    }
                    tone="warning"
                  />

                  <SummaryRow
                    icon="✓"
                    label={
                      copy.success
                    }
                    value={
                      report.successCount
                    }
                    tone="success"
                  />

                  <SummaryRow
                    icon="×"
                    label={
                      copy.cancelled
                    }
                    value={
                      report.cancelledCount
                    }
                    tone="danger"
                  />
                </div>
              </article>

              <article
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
                    <h2>
                      {
                        copy.historyTitle
                      }
                    </h2>

                    <p>
                      {
                        copy.historySubtitle
                      }
                    </p>
                  </div>

                  <span
                    className={
                      styles.historyCount
                    }
                  >
                    {
                      visibleTransactions.length
                    }
                  </span>
                </header>

                <div
                  className={
                    styles.filterArea
                  }
                >
                  <FilterGroup
                    label={
                      copy.typeFilter
                    }
                  >
                    <FilterButton
                      active={
                        kindFilter ===
                        'all'
                      }
                      onClick={() =>
                        setKindFilter(
                          'all',
                        )
                      }
                    >
                      {
                        copy.all
                      }
                    </FilterButton>

                    <FilterButton
                      active={
                        kindFilter ===
                        'booking'
                      }
                      onClick={() =>
                        setKindFilter(
                          'booking',
                        )
                      }
                    >
                      {
                        copy.booking
                      }
                    </FilterButton>

                    <FilterButton
                      active={
                        kindFilter ===
                        'order'
                      }
                      onClick={() =>
                        setKindFilter(
                          'order',
                        )
                      }
                    >
                      {
                        copy.order
                      }
                    </FilterButton>

                    <FilterButton
                      active={
                        kindFilter ===
                        'coupon'
                      }
                      onClick={() =>
                        setKindFilter(
                          'coupon',
                        )
                      }
                    >
                      {
                        copy.coupon
                      }
                    </FilterButton>
                  </FilterGroup>

                  <FilterGroup
                    label={
                      copy.statusFilter
                    }
                  >
                    <FilterButton
                      active={
                        statusFilter ===
                        'all'
                      }
                      onClick={() =>
                        setStatusFilter(
                          'all',
                        )
                      }
                    >
                      {
                        copy.all
                      }
                    </FilterButton>

                    <FilterButton
                      active={
                        statusFilter ===
                        'pending'
                      }
                      onClick={() =>
                        setStatusFilter(
                          'pending',
                        )
                      }
                    >
                      {
                        copy.pending
                      }
                    </FilterButton>

                    <FilterButton
                      active={
                        statusFilter ===
                        'success'
                      }
                      onClick={() =>
                        setStatusFilter(
                          'success',
                        )
                      }
                    >
                      {
                        copy.success
                      }
                    </FilterButton>

                    <FilterButton
                      active={
                        statusFilter ===
                        'cancelled'
                      }
                      onClick={() =>
                        setStatusFilter(
                          'cancelled',
                        )
                      }
                    >
                      {
                        copy.cancelled
                      }
                    </FilterButton>
                  </FilterGroup>
                </div>

                <div
                  className={
                    styles.historyList
                  }
                >
                  {visibleTransactions.length ? (
                    visibleTransactions.map(
                      (
                        item,
                        index,
                      ) => {
                        const group =
                          statusGroup(
                            item,
                          );

                        return (
                          <div
                            className={
                              styles.historyRow
                            }
                            key={`${item.kind}:${item.id}:${item.referenceCode}:${index}`}
                          >
                            <div
                              className={
                                styles.historyKindIcon
                              }
                            >
                              {kindIcon(
                                item.kind,
                              )}
                            </div>

                            <div
                              className={
                                styles.historyMain
                              }
                            >
                              <div
                                className={
                                  styles.historyTitleRow
                                }
                              >
                                <strong>
                                  {
                                    item.title
                                  }
                                </strong>

                                <b>
                                  {item.amount ===
                                  null
                                    ? '—'
                                    : money(
                                        item.amount,
                                        item.currency,
                                      )}
                                </b>
                              </div>

                              <div
                                className={
                                  styles.historyMetaRow
                                }
                              >
                                <span>
                                  {kindLabel(
                                    item.kind,
                                    copy,
                                  )}{' '}
                                  ·{' '}
                                  {referenceLabel(
                                    item.referenceCode,
                                  )}
                                </span>

                                <span
                                  className={
                                    styles.statusBadge
                                  }
                                  data-status={
                                    group
                                  }
                                >
                                  {groupLabel(
                                    group,
                                    copy,
                                  )}
                                </span>
                              </div>

                              <div
                                className={
                                  styles.historyBottomRow
                                }
                              >
                                <small>
                                  {
                                    copy.customer
                                  }
                                  :{' '}
                                  {
                                    item.customerName
                                  }
                                </small>

                                <small>
                                  {formatDate(
                                    item.createdAt ||
                                      item.scheduledAt,
                                    locale,
                                  )}
                                </small>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )
                  ) : (
                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      {
                        copy.noTransactions
                      }
                    </div>
                  )}
                </div>
              </article>
            </section>

            <article
              className={`${styles.card} ${styles.storeCard}`}
            >
              <header
                className={
                  styles.cardHeader
                }
              >
                <h2>
                  {
                    copy.storeInfoTitle
                  }
                </h2>
              </header>

              <div
                className={
                  styles.storeInfoGrid
                }
              >
                <InfoStat
                  label={
                    copy.store
                  }
                  value={
                    access?.displayName ||
                    '—'
                  }
                />

                <InfoStat
                  label={
                    copy.services
                  }
                  value={String(
                    summary.serviceCount,
                  )}
                />

                <InfoStat
                  label={
                    copy.averageRating
                  }
                  value={
                    summary.reviewCount
                      ? summary.averageRating.toFixed(
                          1,
                        )
                      : '-'
                  }
                />

                <InfoStat
                  label={
                    copy.reviews
                  }
                  value={String(
                    summary.reviewCount,
                  )}
                />

                <InfoStat
                  label={
                    copy.oneTimeCustomers
                  }
                  value={String(
                    report.oneTimeCustomers,
                  )}
                />

                <InfoStat
                  label={
                    copy.repeatCustomers
                  }
                  value={String(
                    report.repeatCustomers,
                  )}
                />
              </div>
            </article>
          </>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <article
      className={
        styles.metricCard
      }
      data-accent={
        accent ||
        undefined
      }
    >
      <span
        className={
          styles.metricIcon
        }
      >
        {
          icon
        }
      </span>

      <small>
        {
          label
        }
      </small>

      <strong>
        {
          value
        }
      </strong>
    </article>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: string;
  label: string;
  value: number;
  tone?:
    | 'default'
    | 'warning'
    | 'success'
    | 'danger';
}) {
  return (
    <div
      className={
        styles.summaryRow
      }
      data-tone={
        tone
      }
    >
      <span>
        {
          icon
        }
      </span>

      <strong>
        {
          label
        }
      </strong>

      <b>
        {
          value
        }
      </b>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className={
        styles.filterGroup
      }
    >
      <small>
        {
          label
        }
      </small>

      <div>
        {
          children
        }
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-active={
        active
      }
      onClick={
        onClick
      }
    >
      {
        children
      }
    </button>
  );
}

function InfoStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.infoStat
      }
    >
      <small>
        {
          label
        }
      </small>

      <strong>
        {
          value
        }
      </strong>
    </div>
  );
}
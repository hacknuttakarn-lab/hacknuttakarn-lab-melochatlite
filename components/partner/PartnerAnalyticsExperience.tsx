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
import styles from './PartnerAnalyticsExperience.module.css';

type Period =
  | 'today'
  | '7d'
  | '30d'
  | 'month'
  | 'all';

type PerformanceMode =
  | 'sales'
  | 'booking'
  | 'coupon';

type ServicePerformance = {
  key: string;
  title: string;
  salesAmount: number;
  bookingCount: number;
  couponRedeemedCount: number;
  successfulCount: number;
};

type TrendItem = {
  key: string;
  label: string;
  value: number;
};

const EMPTY_SUMMARY: PartnerDashboardSummary = {
  serviceCount: 0,
  pendingBookings: 0,
  activeCoupons: 0,
  paidOrders: 0,
  grossSales: 0,
  averageRating: 0,
  reviewCount: 0,
};

const SUCCESS = new Set([
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

const REDEEMED = new Set([
  'completed',
  'redeemed',
  'used',
  'fulfilled',
  'served',
  'done',
  'consumed',
]);

const CANCELLED = new Set([
  'cancelled',
  'canceled',
  'rejected',
  'expired',
  'failed',
  'refunded',
]);

const COPY = {
  th: {
    title: 'สถิติร้านค้า',
    subtitle:
      'ดูยอดขาย ลูกค้า การจอง คูปอง และประสิทธิภาพบริการในที่เดียว',

    today: 'วันนี้',
    '7d': '7 วัน',
    '30d': '30 วัน',
    month: 'เดือนนี้',
    all: 'ทั้งหมด',

    sales: 'ยอดขาย',
    successfulTransactions: 'รายการสำเร็จ',
    customers: 'ลูกค้า',
    average: 'ยอดเฉลี่ย/รายการ',
    redeemed: 'ใช้สิทธิ์แล้ว',
    successRate: 'อัตราสำเร็จ',

    trend: 'แนวโน้มยอดขาย',
    trendSub:
      'ยอดจากรายการที่ยืนยัน/สำเร็จในช่วงเวลาที่เลือก',
    noTrend:
      'ยังไม่มีข้อมูลยอดขายในช่วงนี้',

    funnel:
      'เส้นทางรายการของลูกค้า',
    funnelSub:
      'วัดจากข้อมูล Order / Booking / Coupon ที่ระบบมีอยู่แล้ว',

    total: 'รายการทั้งหมด',
    pending: 'รอดำเนินการ',
    confirmed: 'ยืนยัน / สำเร็จ',
    couponUsed: 'ใช้คูปองแล้ว',

    tracking:
      'การมองเห็นหน้า Partner, การกดบันทึก และการเริ่มแชท ยังไม่ได้ถูกนับในฐานข้อมูลสถิติ จึงไม่แสดงตัวเลขสมมติในหน้านี้',

    services: 'สินค้าและบริการ',
    servicesSub:
      'ดูว่ารายการไหนสร้างยอดขาย การจอง หรือการใช้สิทธิ์มากที่สุด',

    bestSales: 'ขายดี',
    bestBooking: 'จองเยอะ',
    bestCoupon: 'ใช้สิทธิ์',

    successful: 'สำเร็จ',
    bookingUnit: 'จอง',
    couponUnit: 'ใช้สิทธิ์',

    noPerformance:
      'ยังไม่มีรายการที่มีข้อมูลในช่วงนี้',

    channels:
      'ช่องทางรายการที่เกิดขึ้น',
    channelsSub:
      'แยกตามประเภทการทำรายการภายใน Melo Chat',

    booking: 'การจอง',
    order: 'การขาย / ออเดอร์',
    coupon: 'คูปอง / ดีล',

    customerReview:
      'ลูกค้าและรีวิว',
    customerReviewSub:
      'ดูสัดส่วนลูกค้าและความน่าเชื่อถือของร้าน',

    oneTime:
      'ลูกค้า 1 ครั้ง',
    repeat:
      'ลูกค้าซ้ำ',
    rating:
      'คะแนนเฉลี่ย',
    reviews:
      'รีวิวทั้งหมด',

    noAccess:
      'ไม่มีสิทธิ์ดูสถิติร้านค้า',
    loading:
      'กำลังโหลดสถิติร้านค้า…',
  },

  en: {
    title: 'Store analytics',
    subtitle:
      'See sales, customers, bookings, coupons and service performance in one place',

    today: 'Today',
    '7d': '7 days',
    '30d': '30 days',
    month: 'This month',
    all: 'All',

    sales: 'Sales',
    successfulTransactions: 'Successful transactions',
    customers: 'Customers',
    average: 'Average / transaction',
    redeemed: 'Redeemed',
    successRate: 'Success rate',

    trend: 'Sales trend',
    trendSub:
      'Revenue from confirmed / successful transactions in the selected period',
    noTrend:
      'No sales data in this period',

    funnel:
      'Customer transaction funnel',
    funnelSub:
      'Based on existing Order / Booking / Coupon records',

    total: 'All transactions',
    pending: 'Pending',
    confirmed: 'Confirmed / successful',
    couponUsed: 'Coupons redeemed',

    tracking:
      'Partner page views, saves and chat starts are not yet recorded in the analytics database, so estimated numbers are not shown.',

    services: 'Products & services',
    servicesSub:
      'See which items generate the most sales, bookings or redemptions',

    bestSales: 'Best selling',
    bestBooking: 'Most booked',
    bestCoupon: 'Redeemed',

    successful: 'Successful',
    bookingUnit: 'bookings',
    couponUnit: 'redeemed',

    noPerformance:
      'No item activity in this period',

    channels:
      'Transaction channels',
    channelsSub:
      'Breakdown by transaction type inside Melo Chat',

    booking: 'Booking',
    order: 'Sales / order',
    coupon: 'Coupon / deal',

    customerReview:
      'Customers & reviews',
    customerReviewSub:
      'Customer mix and store trust indicators',

    oneTime:
      'One-time customers',
    repeat:
      'Repeat customers',
    rating:
      'Average rating',
    reviews:
      'Total reviews',

    noAccess:
      'You do not have permission to view store analytics',
    loading:
      'Loading store analytics…',
  },

  de: {
    title: 'Store-Statistik',
    subtitle:
      'Umsatz, Kunden, Buchungen, Coupons und Service-Leistung auf einen Blick',

    today: 'Heute',
    '7d': '7 Tage',
    '30d': '30 Tage',
    month: 'Dieser Monat',
    all: 'Alle',

    sales: 'Umsatz',
    successfulTransactions: 'Erfolgreiche Vorgänge',
    customers: 'Kunden',
    average: 'Ø / Vorgang',
    redeemed: 'Eingelöst',
    successRate: 'Erfolgsquote',

    trend: 'Umsatztrend',
    trendSub:
      'Umsatz bestätigter / erfolgreicher Vorgänge',
    noTrend:
      'Keine Umsatzdaten in diesem Zeitraum',

    funnel: 'Kunden-Vorgangstrichter',
    funnelSub:
      'Basierend auf Order / Booking / Coupon',

    total: 'Alle Vorgänge',
    pending: 'Offen',
    confirmed: 'Bestätigt / erfolgreich',
    couponUsed: 'Coupons eingelöst',

    tracking:
      'Partner-Aufrufe, gespeicherte Einträge und Chat-Starts werden noch nicht als Statistik gespeichert.',

    services: 'Produkte & Services',
    servicesSub:
      'Einträge mit den meisten Umsätzen, Buchungen oder Einlösungen',

    bestSales: 'Meistverkauft',
    bestBooking: 'Meistgebucht',
    bestCoupon: 'Eingelöst',

    successful: 'Erfolgreich',
    bookingUnit: 'Buchungen',
    couponUnit: 'Einlösungen',

    noPerformance: 'Keine Daten',

    channels: 'Vorgangskanäle',
    channelsSub:
      'Aufteilung nach Vorgangstyp in Melo Chat',

    booking: 'Buchung',
    order: 'Verkauf / Bestellung',
    coupon: 'Coupon / Deal',

    customerReview:
      'Kunden & Bewertungen',
    customerReviewSub:
      'Kundenmix und Vertrauensindikatoren',

    oneTime: 'Einmalkunden',
    repeat: 'Wiederkehrende Kunden',
    rating: 'Ø Bewertung',
    reviews: 'Bewertungen gesamt',

    noAccess: 'Keine Berechtigung',
    loading: 'Statistik wird geladen…',
  },

  zh: {
    title: '店铺统计',
    subtitle:
      '集中查看销售额、客户、预订、优惠券和服务表现',

    today: '今天',
    '7d': '7 天',
    '30d': '30 天',
    month: '本月',
    all: '全部',

    sales: '销售额',
    successfulTransactions: '成功交易',
    customers: '客户',
    average: '平均 / 交易',
    redeemed: '已核销',
    successRate: '成功率',

    trend: '销售趋势',
    trendSub:
      '所选时间内已确认 / 成功交易的销售额',
    noTrend: '暂无销售数据',

    funnel: '客户交易路径',
    funnelSub:
      '基于 Order / Booking / Coupon 数据',

    total: '全部交易',
    pending: '待处理',
    confirmed: '已确认 / 成功',
    couponUsed: '优惠券已核销',

    tracking:
      'Partner 页面浏览、收藏和聊天开始尚未计入统计数据库，因此不显示估算数据。',

    services: '商品与服务',
    servicesSub:
      '查看销售、预订或核销最多的项目',

    bestSales: '畅销',
    bestBooking: '预订最多',
    bestCoupon: '核销',

    successful: '成功',
    bookingUnit: '预订',
    couponUnit: '核销',

    noPerformance: '暂无数据',

    channels: '交易来源',
    channelsSub:
      '按 Melo Chat 内交易类型分类',

    booking: '预订',
    order: '销售 / 订单',
    coupon: '优惠券 / 优惠',

    customerReview: '客户与评价',
    customerReviewSub:
      '客户构成与店铺信誉',

    oneTime: '单次客户',
    repeat: '回头客',
    rating: '平均评分',
    reviews: '评价总数',

    noAccess: '没有统计权限',
    loading: '正在加载统计…',
  },

  ja: {
    title: '店舗分析',
    subtitle:
      '売上、顧客、予約、クーポン、サービス実績をまとめて確認',

    today: '今日',
    '7d': '7日',
    '30d': '30日',
    month: '今月',
    all: 'すべて',

    sales: '売上',
    successfulTransactions: '成功取引',
    customers: '顧客',
    average: '平均 / 取引',
    redeemed: '利用済み',
    successRate: '成功率',

    trend: '売上推移',
    trendSub:
      '確認済み / 成功取引の売上',
    noTrend: '売上データはありません',

    funnel: '顧客取引フロー',
    funnelSub:
      'Order / Booking / Coupon データを使用',

    total: '全取引',
    pending: '保留中',
    confirmed: '確認 / 成功',
    couponUsed: 'クーポン利用済み',

    tracking:
      'Partner ページ閲覧、保存、チャット開始はまだ統計データとして記録されていません。',

    services: '商品・サービス',
    servicesSub:
      '売上、予約、利用が多い項目',

    bestSales: '売れ筋',
    bestBooking: '予約多数',
    bestCoupon: '利用',

    successful: '成功',
    bookingUnit: '予約',
    couponUnit: '利用',

    noPerformance: 'データはありません',

    channels: '取引チャネル',
    channelsSub:
      'Melo Chat 内の取引タイプ別内訳',

    booking: '予約',
    order: '販売 / 注文',
    coupon: 'クーポン / ディール',

    customerReview: '顧客・レビュー',
    customerReviewSub:
      '顧客構成と店舗の信頼指標',

    oneTime: '1回利用の顧客',
    repeat: 'リピーター',
    rating: '平均評価',
    reviews: 'レビュー総数',

    noAccess: '店舗分析の権限がありません',
    loading: '店舗分析を読み込み中…',
  },

  ko: {
    title: '매장 통계',
    subtitle:
      '매출, 고객, 예약, 쿠폰 및 서비스 성과를 한곳에서 확인하세요',

    today: '오늘',
    '7d': '7일',
    '30d': '30일',
    month: '이번 달',
    all: '전체',

    sales: '매출',
    successfulTransactions: '성공 거래',
    customers: '고객',
    average: '평균 / 거래',
    redeemed: '사용 완료',
    successRate: '성공률',

    trend: '매출 추이',
    trendSub:
      '확인 / 성공 거래의 매출',
    noTrend: '매출 데이터가 없습니다',

    funnel: '고객 거래 흐름',
    funnelSub:
      'Order / Booking / Coupon 데이터 기준',

    total: '전체 거래',
    pending: '대기',
    confirmed: '확인 / 성공',
    couponUsed: '쿠폰 사용 완료',

    tracking:
      'Partner 페이지 조회, 저장, 채팅 시작은 아직 통계 데이터베이스에 기록되지 않습니다.',

    services: '상품 및 서비스',
    servicesSub:
      '매출, 예약 또는 사용량이 높은 항목',

    bestSales: '판매 상위',
    bestBooking: '예약 상위',
    bestCoupon: '사용',

    successful: '성공',
    bookingUnit: '예약',
    couponUnit: '사용',

    noPerformance: '데이터가 없습니다',

    channels: '거래 채널',
    channelsSub:
      'Melo Chat 거래 유형별 분석',

    booking: '예약',
    order: '판매 / 주문',
    coupon: '쿠폰 / 딜',

    customerReview: '고객 및 리뷰',
    customerReviewSub:
      '고객 구성과 매장 신뢰도',

    oneTime: '1회 고객',
    repeat: '재방문 고객',
    rating: '평균 평점',
    reviews: '전체 리뷰',

    noAccess: '매장 통계 권한이 없습니다',
    loading: '매장 통계를 불러오는 중…',
  },
} as const;

type Copy =
  (typeof COPY)[keyof typeof COPY];

function money(
  value: number,
) {
  return `฿${Number(
    value || 0,
  ).toLocaleString(
    undefined,
    {
      maximumFractionDigits:
        0,
    },
  )}`;
}

function percent(
  value: number,
) {
  return `${value.toFixed(
    value >= 10
      ? 0
      : 1,
  )}%`;
}

function statusOf(
  item:
    PartnerTransaction,
) {
  return String(
    item.status ||
      '',
  )
    .trim()
    .toLowerCase();
}

function successful(
  item:
    PartnerTransaction,
) {
  return SUCCESS.has(
    statusOf(
      item,
    ),
  );
}

function redeemed(
  item:
    PartnerTransaction,
) {
  return REDEEMED.has(
    statusOf(
      item,
    ),
  );
}

function cancelled(
  item:
    PartnerTransaction,
) {
  return CANCELLED.has(
    statusOf(
      item,
    ),
  );
}

function itemDate(
  item:
    PartnerTransaction,
) {
  const date =
    new Date(
      item.createdAt ||
        item.scheduledAt ||
        '',
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
  period:
    Period,
  now:
    Date,
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
  item:
    PartnerTransaction,
) {
  const reference =
    item.referenceCode
      ?.trim()
      .toLowerCase();

  return reference
    ? `${item.kind}:${reference}`
    : `${item.kind}:${item.id}`;
}

function dedupe(
  items:
    PartnerTransaction[],
) {
  const map =
    new Map<
      string,
      PartnerTransaction
    >();

  for (
    const item of
    items
  ) {
    const key =
      transactionKey(
        item,
      );

    const previous =
      map.get(
        key,
      );

    if (
      !previous
    ) {
      map.set(
        key,
        item,
      );

      continue;
    }

    if (
      successful(
        item,
      ) &&
      !successful(
        previous,
      )
    ) {
      map.set(
        key,
        item,
      );

      continue;
    }

    if (
      (
        item.amount ||
        0
      ) >
      (
        previous.amount ||
        0
      )
    ) {
      map.set(
        key,
        item,
      );
    }
  }

  return [
    ...map.values(),
  ];
}

function customerKey(
  item:
    PartnerTransaction,
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

function dailyTrend(
  items:
    PartnerTransaction[],
  days:
    number,
  now:
    Date,
): TrendItem[] {
  const result:
    TrendItem[] =
    [];

  for (
    let offset =
      days - 1;
    offset >= 0;
    offset -= 1
  ) {
    const start =
      startOfDay(
        now,
      );

    start.setDate(
      start.getDate() -
        offset,
    );

    const end =
      new Date(
        start,
      );

    end.setDate(
      end.getDate() +
        1,
    );

    const value =
      items.reduce(
        (
          total,
          item,
        ) => {
          const date =
            itemDate(
              item,
            );

          if (
            !date ||
            date <
              start ||
            date >=
              end ||
            !successful(
              item,
            )
          ) {
            return total;
          }

          return (
            total +
            (
              item.amount ||
              0
            )
          );
        },
        0,
      );

    result.push({
      key:
        start.toISOString(),

      label:
        `${start.getDate()}/${start.getMonth() + 1}`,

      value,
    });
  }

  return result;
}

function todayTrend(
  items:
    PartnerTransaction[],
  now:
    Date,
): TrendItem[] {
  const day =
    startOfDay(
      now,
    );

  return Array.from(
    {
      length:
        6,
    },
    (
      _,
      index,
    ) => {
      const start =
        new Date(
          day,
        );

      start.setHours(
        index *
          4,
      );

      const end =
        new Date(
          start,
        );

      end.setHours(
        end.getHours() +
          4,
      );

      const value =
        items.reduce(
          (
            total,
            item,
          ) => {
            const date =
              itemDate(
                item,
              );

            if (
              !date ||
              date <
                start ||
              date >=
                end ||
              !successful(
                item,
              )
            ) {
              return total;
            }

            return (
              total +
              (
                item.amount ||
                0
              )
            );
          },
          0,
        );

      return {
        key:
          start.toISOString(),

        label:
          `${String(
            index *
              4,
          ).padStart(
            2,
            '0',
          )}:00`,

        value,
      };
    },
  );
}

function groupedTrend(
  items:
    PartnerTransaction[],
  period:
    Period,
  now:
    Date,
): TrendItem[] {
  if (
    period ===
    'today'
  ) {
    return todayTrend(
      items,
      now,
    );
  }

  if (
    period ===
    '7d'
  ) {
    return dailyTrend(
      items,
      7,
      now,
    );
  }

  if (
    period ===
    '30d'
  ) {
    const daily =
      dailyTrend(
        items,
        30,
        now,
      );

    return Array.from(
      {
        length:
          6,
      },
      (
        _,
        index,
      ) => {
        const slice =
          daily.slice(
            index *
              5,
            index *
              5 +
              5,
          );

        return {
          key:
            String(
              index,
            ),

          label:
            slice[0]
              ?.label ||
            '',

          value:
            slice.reduce(
              (
                sum,
                row,
              ) =>
                sum +
                row.value,
              0,
            ),
        };
      },
    );
  }

  if (
    period ===
    'month'
  ) {
    const days =
      now.getDate();

    const daily =
      dailyTrend(
        items,
        days,
        now,
      );

    const result:
      TrendItem[] =
      [];

    for (
      let index = 0;
      index <
      daily.length;
      index += 7
    ) {
      const slice =
        daily.slice(
          index,
          index +
            7,
        );

      result.push({
        key:
          `week-${index}`,

        label:
          slice[0]
            ?.label ||
          '',

        value:
          slice.reduce(
            (
              total,
              row,
            ) =>
              total +
              row.value,
            0,
          ),
      });
    }

    return result;
  }

  const monthMap =
    new Map<
      string,
      number
    >();

  items.forEach(
    (
      item,
    ) => {
      if (
        !successful(
          item,
        )
      ) {
        return;
      }

      const date =
        itemDate(
          item,
        );

      if (
        !date
      ) {
        return;
      }

      const key =
        `${date.getFullYear()}-${String(
          date.getMonth() +
            1,
        ).padStart(
          2,
          '0',
        )}`;

      monthMap.set(
        key,
        (
          monthMap.get(
            key,
          ) ||
          0
        ) +
          (
            item.amount ||
            0
          ),
      );
    },
  );

  return [
    ...monthMap.entries(),
  ]
    .sort(
      (
        left,
        right,
      ) =>
        left[0].localeCompare(
          right[0],
        ),
    )
    .slice(
      -12,
    )
    .map(
      (
        [
          key,
          value,
        ],
      ) => {
        const [
          year,
          month,
        ] =
          key.split(
            '-',
          );

        return {
          key,
          label:
            `${Number(
              month,
            )}/${year.slice(
              -2,
            )}`,
          value,
        };
      },
    );
}

export default function PartnerAnalyticsExperience() {
  const {
    locale,
  } =
    useLocale();

  const t =
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
      '7d',
    );

  const [
    performanceMode,
    setPerformanceMode,
  ] =
    useState<PerformanceMode>(
      'sales',
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
              'analytics',
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
            dedupe(
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

  const now =
    useMemo(
      () =>
        new Date(),
      [
        transactions,
        period,
      ],
    );

  const filtered =
    useMemo(
      () => {
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
              itemDate(
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
        now,
      ],
    );

  const insights =
    useMemo(
      () => {
        const success =
          filtered.filter(
            successful,
          );

        const pending =
          filtered.filter(
            (
              item,
            ) =>
              !successful(
                item,
              ) &&
              !cancelled(
                item,
              ),
          );

        const grossSales =
          success.reduce(
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
          );

        const redeemedCoupons =
          filtered.filter(
            (
              item,
            ) =>
              item.kind ===
                'coupon' &&
              redeemed(
                item,
              ),
          ).length;

        const customers =
          new Map<
            string,
            number
          >();

        filtered.forEach(
          (
            item,
          ) => {
            if (
              cancelled(
                item,
              )
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

        const newCustomers =
          [
            ...customers.values(),
          ].filter(
            (
              count,
            ) =>
              count ===
              1,
          ).length;

        const repeatCustomers =
          [
            ...customers.values(),
          ].filter(
            (
              count,
            ) =>
              count >
              1,
          ).length;

        const serviceMap =
          new Map<
            string,
            ServicePerformance
          >();

        filtered.forEach(
          (
            item,
          ) => {
            const title =
              item.title?.trim() ||
              item.kind;

            const key =
              title.toLowerCase();

            const row =
              serviceMap.get(
                key,
              ) || {
                key,
                title,
                salesAmount:
                  0,
                bookingCount:
                  0,
                couponRedeemedCount:
                  0,
                successfulCount:
                  0,
              };

            if (
              successful(
                item,
              )
            ) {
              row.successfulCount +=
                1;

              row.salesAmount +=
                item.amount ||
                0;
            }

            if (
              item.kind ===
              'booking'
            ) {
              row.bookingCount +=
                1;
            }

            if (
              item.kind ===
                'coupon' &&
              redeemed(
                item,
              )
            ) {
              row.couponRedeemedCount +=
                1;
            }

            serviceMap.set(
              key,
              row,
            );
          },
        );

        return {
          grossSales,

          successfulTransactions:
            success.length,

          uniqueCustomers:
            customers.size,

          averagePerTransaction:
            success.length
              ? grossSales /
                success.length
              : 0,

          redeemedCoupons,

          successRate:
            filtered.length
              ? (
                  success.length /
                  filtered.length
                ) *
                100
              : 0,

          newCustomers,

          repeatCustomers,

          bookingCount:
            filtered.filter(
              (
                item,
              ) =>
                item.kind ===
                'booking',
            ).length,

          orderCount:
            filtered.filter(
              (
                item,
              ) =>
                item.kind ===
                'order',
            ).length,

          couponCount:
            filtered.filter(
              (
                item,
              ) =>
                item.kind ===
                'coupon',
            ).length,

          confirmedCount:
            success.length,

          pendingCount:
            pending.length,

          servicePerformance:
            [
              ...serviceMap.values(),
            ],

          trend:
            groupedTrend(
              filtered,
              period,
              now,
            ),
        };
      },
      [
        filtered,
        period,
        now,
      ],
    );

  const performance =
    useMemo(
      () => {
        const rows =
          [
            ...insights.servicePerformance,
          ];

        if (
          performanceMode ===
          'sales'
        ) {
          return rows
            .sort(
              (
                a,
                b,
              ) =>
                b.salesAmount -
                a.salesAmount,
            )
            .slice(
              0,
              5,
            );
        }

        if (
          performanceMode ===
          'booking'
        ) {
          return rows
            .sort(
              (
                a,
                b,
              ) =>
                b.bookingCount -
                a.bookingCount,
            )
            .slice(
              0,
              5,
            );
        }

        return rows
          .sort(
            (
              a,
              b,
            ) =>
              b.couponRedeemedCount -
              a.couponRedeemedCount,
          )
          .slice(
            0,
            5,
          );
      },
      [
        insights.servicePerformance,
        performanceMode,
      ],
    );

  const maxTrend =
    Math.max(
      1,
      ...insights.trend.map(
        (
          item,
        ) =>
          item.value,
      ),
    );

  const totalChannels =
    Math.max(
      1,
      insights.bookingCount +
        insights.orderCount +
        insights.couponCount,
    );

  const allowed =
    Boolean(
      access &&
      hasPartnerPermission(
        access,
        'analytics',
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
              MELO PARTNER
            </small>

            <h1>
              {
                t.title
              }
            </h1>

            <p>
              {
                t.subtitle
              }
            </p>
          </div>

          <button
            type="button"
            className={
              styles.refresh
            }
            onClick={() =>
              void load()
            }
          >
            ↻
          </button>
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
              t.loading
            }
          </div>
        ) : !allowed ? (
          <div
            className={
              styles.denied
            }
          >
            {
              t.noAccess
            }
          </div>
        ) : (
          <>
            <div
              className={
                styles.periods
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
                      t[
                        item
                      ]
                    }
                  </button>
                ),
              )}
            </div>

            <div
              className={
                styles.metrics
              }
            >
              <Metric
                icon="฿"
                label={
                  t.sales
                }
                value={money(
                  insights.grossSales,
                )}
                accent
              />

              <Metric
                icon="✓"
                label={
                  t.successfulTransactions
                }
                value={String(
                  insights.successfulTransactions,
                )}
              />

              <Metric
                icon="👤"
                label={
                  t.customers
                }
                value={String(
                  insights.uniqueCustomers,
                )}
              />

              <Metric
                icon="∅"
                label={
                  t.average
                }
                value={money(
                  insights.averagePerTransaction,
                )}
              />

              <Metric
                icon="▣"
                label={
                  t.redeemed
                }
                value={String(
                  insights.redeemedCoupons,
                )}
              />

              <Metric
                icon="%"
                label={
                  t.successRate
                }
                value={percent(
                  insights.successRate,
                )}
              />
            </div>

            <div
              className={
                styles.topGrid
              }
            >
              <Card
                title={
                  t.trend
                }
                subtitle={
                  t.trendSub
                }
              >
                <div
                  className={
                    styles.chart
                  }
                >
                  {insights
                    .trend
                    .length ? (
                    insights.trend.map(
                      (
                        item,
                      ) => {
                        const height =
                          item.value
                            ? Math.max(
                                7,
                                (
                                  item.value /
                                  maxTrend
                                ) *
                                  100,
                              )
                            : 2;

                        return (
                          <div
                            className={
                              styles.chartCol
                            }
                            key={
                              item.key
                            }
                          >
                            <small>
                              {item.value
                                ? money(
                                    item.value,
                                  )
                                : ''}
                            </small>

                            <div
                              className={
                                styles.barTrack
                              }
                            >
                              <span
                                style={{
                                  height:
                                    `${height}%`,
                                }}
                              />
                            </div>

                            <b>
                              {
                                item.label
                              }
                            </b>
                          </div>
                        );
                      },
                    )
                  ) : (
                    <Empty
                      text={
                        t.noTrend
                      }
                    />
                  )}
                </div>
              </Card>

              <Card
                title={
                  t.funnel
                }
                subtitle={
                  t.funnelSub
                }
              >
                <Funnel
                  label={
                    t.total
                  }
                  value={
                    filtered.length
                  }
                  total={
                    filtered.length
                  }
                />

                <Funnel
                  label={
                    t.pending
                  }
                  value={
                    insights.pendingCount
                  }
                  total={
                    filtered.length
                  }
                  tone="warning"
                />

                <Funnel
                  label={
                    t.confirmed
                  }
                  value={
                    insights.confirmedCount
                  }
                  total={
                    filtered.length
                  }
                  tone="success"
                />

                <Funnel
                  label={
                    t.couponUsed
                  }
                  value={
                    insights.redeemedCoupons
                  }
                  total={Math.max(
                    1,
                    insights.couponCount,
                  )}
                  tone="success"
                />

                <div
                  className={
                    styles.note
                  }
                >
                  <span>
                    ◉
                  </span>

                  <p>
                    {
                      t.tracking
                    }
                  </p>
                </div>
              </Card>
            </div>

            <div
              className={
                styles.bottomGrid
              }
            >
              <Card
                title={
                  t.services
                }
                subtitle={
                  t.servicesSub
                }
              >
                <div
                  className={
                    styles.segments
                  }
                >
                  <button
                    type="button"
                    data-active={
                      performanceMode ===
                      'sales'
                    }
                    onClick={() =>
                      setPerformanceMode(
                        'sales',
                      )
                    }
                  >
                    {
                      t.bestSales
                    }
                  </button>

                  <button
                    type="button"
                    data-active={
                      performanceMode ===
                      'booking'
                    }
                    onClick={() =>
                      setPerformanceMode(
                        'booking',
                      )
                    }
                  >
                    {
                      t.bestBooking
                    }
                  </button>

                  <button
                    type="button"
                    data-active={
                      performanceMode ===
                      'coupon'
                    }
                    onClick={() =>
                      setPerformanceMode(
                        'coupon',
                      )
                    }
                  >
                    {
                      t.bestCoupon
                    }
                  </button>
                </div>

                {performance.length ? (
                  <div
                    className={
                      styles.performance
                    }
                  >
                    {performance.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          className={
                            styles.performanceRow
                          }
                          key={
                            item.key
                          }
                        >
                          <span>
                            {
                              index +
                              1
                            }
                          </span>

                          <div>
                            <strong>
                              {
                                item.title
                              }
                            </strong>

                            <small>
                              {
                                t.successful
                              }{' '}
                              {
                                item.successfulCount
                              }
                            </small>
                          </div>

                          <b>
                            {performanceMode ===
                            'sales'
                              ? money(
                                  item.salesAmount,
                                )
                              : performanceMode ===
                                  'booking'
                                ? `${item.bookingCount} ${t.bookingUnit}`
                                : `${item.couponRedeemedCount} ${t.couponUnit}`}
                          </b>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <Empty
                    text={
                      t.noPerformance
                    }
                  />
                )}
              </Card>

              <Card
                title={
                  t.channels
                }
                subtitle={
                  t.channelsSub
                }
              >
                <Channel
                  icon="📅"
                  label={
                    t.booking
                  }
                  value={
                    insights.bookingCount
                  }
                  total={
                    totalChannels
                  }
                />

                <Channel
                  icon="🧾"
                  label={
                    t.order
                  }
                  value={
                    insights.orderCount
                  }
                  total={
                    totalChannels
                  }
                />

                <Channel
                  icon="🎟"
                  label={
                    t.coupon
                  }
                  value={
                    insights.couponCount
                  }
                  total={
                    totalChannels
                  }
                />
              </Card>
            </div>

            <Card
              title={
                t.customerReview
              }
              subtitle={
                t.customerReviewSub
              }
            >
              <div
                className={
                  styles.customers
                }
              >
                <SmallStat
                  value={String(
                    insights.newCustomers,
                  )}
                  label={
                    t.oneTime
                  }
                />

                <SmallStat
                  value={String(
                    insights.repeatCustomers,
                  )}
                  label={
                    t.repeat
                  }
                />

                <SmallStat
                  value={
                    summary.reviewCount
                      ? summary.averageRating.toFixed(
                          1,
                        )
                      : '-'
                  }
                  label={
                    t.rating
                  }
                />

                <SmallStat
                  value={String(
                    summary.reviewCount,
                  )}
                  label={
                    t.reviews
                  }
                />
              </div>
            </Card>
          </>
        )}
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <article
      className={
        styles.metric
      }
      data-accent={
        accent ||
        undefined
      }
    >
      <span>
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

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section
      className={
        styles.card
      }
    >
      <header>
        <h2>
          {
            title
          }
        </h2>

        <p>
          {
            subtitle
          }
        </p>
      </header>

      <div
        className={
          styles.cardBody
        }
      >
        {
          children
        }
      </div>
    </section>
  );
}

function Funnel({
  label,
  value,
  total,
  tone = 'primary',
}: {
  label: string;
  value: number;
  total: number;
  tone?:
    | 'primary'
    | 'success'
    | 'warning';
}) {
  const width =
    total
      ? Math.min(
          100,
          (
            value /
            total
          ) *
            100,
        )
      : 0;

  return (
    <div
      className={
        styles.funnel
      }
    >
      <div>
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

      <div
        className={
          styles.progress
        }
      >
        <span
          data-tone={
            tone
          }
          style={{
            width:
              `${width}%`,
          }}
        />
      </div>
    </div>
  );
}

function Channel({
  icon,
  label,
  value,
  total,
}: {
  icon: string;
  label: string;
  value: number;
  total: number;
}) {
  const ratio =
    total
      ? (
          value /
          total
        ) *
        100
      : 0;

  return (
    <div
      className={
        styles.channel
      }
    >
      <span>
        {
          icon
        }
      </span>

      <div>
        <div>
          <strong>
            {
              label
            }
          </strong>

          <b>
            {
              value
            }{' '}
            ·{' '}
            {percent(
              ratio,
            )}
          </b>
        </div>

        <div
          className={
            styles.progress
          }
        >
          <span
            style={{
              width:
                `${Math.min(
                  100,
                  ratio,
                )}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SmallStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div
      className={
        styles.smallStat
      }
    >
      <strong>
        {
          value
        }
      </strong>

      <span>
        {
          label
        }
      </span>
    </div>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className={
        styles.empty
      }
    >
      {
        text
      }
    </div>
  );
}
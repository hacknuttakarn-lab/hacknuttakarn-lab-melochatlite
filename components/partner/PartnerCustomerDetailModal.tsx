'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  rpcRequest,
} from '@/lib/supabase/browser';

import VerifiedUserAvatar from '@/components/profile/VerifiedUserAvatar';

import type {
  PartnerTransaction,
} from './partnerModeWeb';

type Row = Record<string, unknown>;

type Props = {
  item: PartnerTransaction | null;
  transactions: PartnerTransaction[];
  businessId: string;
  locale: string;
  onClose: () => void;
};

const COPY = {
  th: {
    eyebrow: 'รายละเอียดรายการ',
    customer: 'ลูกค้า',
    meloCustomer: 'ลูกค้า Melo',
    storeItems: 'รายการกับร้าน',
    storeTotal: 'ยอดรวมกับร้าน',

    product: 'สินค้า / บริการ',
    type: 'ประเภท',
    item: 'รายการ',
    serviceDate: 'วันใช้บริการ',
    quantity: 'จำนวน',
    details: 'รายละเอียด',
    noDetails: 'ไม่มีรายละเอียดเพิ่มเติม',

    payment: 'การชำระ / ยอดรายการ',
    customerAmount: 'ยอดลูกค้า',
    paymentStatus: 'สถานะ',
    created: 'สร้างรายการ',

    usage: 'การใช้สิทธิ์ / QR',

    booking: 'การจอง',
    order: 'ออเดอร์',
    coupon: 'คูปอง / ดีล',

    pending: 'รอดำเนินการ',
    waiting: 'รอใช้บริการ',
    used: 'ใช้สิทธิ์แล้ว',
    cancelled: 'ยกเลิก / ไม่พร้อมใช้งาน',

    paid: 'ชำระเงินแล้ว',
    paymentPending: 'รอชำระเงิน',
    refunded: 'คืนเงินแล้ว',

    awaitingUsage: 'รอรายการพร้อมใช้งาน',
    awaitingUsageHint:
      'เมื่อถึงเวลาใช้บริการ ลูกค้าแสดง QR ให้ Partner สแกน',

    usedUsage: 'ใช้สิทธิ์แล้ว',
    usedUsageHint:
      'รายการนี้ถูกใช้สิทธิ์เรียบร้อยแล้ว',

    pendingUsage: 'รายการยังไม่พร้อมใช้งาน',
    pendingUsageHint:
      'รอยืนยันรายการหรือการชำระเงินก่อนเปิดใช้สิทธิ์',

    unavailableUsage: 'ไม่สามารถใช้สิทธิ์ได้',
    unavailableUsageHint:
      'ตรวจสอบสถานะรายการก่อนดำเนินการต่อ',

    people: 'คน',
    units: 'ชิ้น',
    close: 'ปิด',
    loading: 'กำลังโหลดรายละเอียด…',
  },

  en: {
    eyebrow: 'Transaction details',
    customer: 'Customer',
    meloCustomer: 'Melo customer',
    storeItems: 'items with this store',
    storeTotal: 'Total with store',

    product: 'Product / service',
    type: 'Type',
    item: 'Item',
    serviceDate: 'Service date',
    quantity: 'Quantity',
    details: 'Details',
    noDetails: 'No additional details',

    payment: 'Payment / transaction total',
    customerAmount: 'Customer amount',
    paymentStatus: 'Status',
    created: 'Created',

    usage: 'Redemption / QR',

    booking: 'Booking',
    order: 'Order',
    coupon: 'Coupon / deal',

    pending: 'Pending',
    waiting: 'Awaiting service',
    used: 'Redeemed',
    cancelled: 'Cancelled / unavailable',

    paid: 'Paid',
    paymentPending: 'Awaiting payment',
    refunded: 'Refunded',

    awaitingUsage: 'Ready for service',
    awaitingUsageHint:
      'At service time, the customer presents their QR code for the Partner to scan.',

    usedUsage: 'Redeemed',
    usedUsageHint:
      'This item has already been redeemed.',

    pendingUsage: 'Not ready yet',
    pendingUsageHint:
      'Confirmation or payment must be completed before redemption.',

    unavailableUsage: 'Redemption unavailable',
    unavailableUsageHint:
      'Check the transaction status before continuing.',

    people: 'people',
    units: 'items',
    close: 'Close',
    loading: 'Loading details…',
  },

  de: {
    eyebrow: 'Vorgangsdetails',
    customer: 'Kunde',
    meloCustomer: 'Melo-Kunde',
    storeItems: 'Vorgänge mit diesem Store',
    storeTotal: 'Gesamt beim Store',

    product: 'Produkt / Service',
    type: 'Typ',
    item: 'Eintrag',
    serviceDate: 'Servicetermin',
    quantity: 'Menge',
    details: 'Details',
    noDetails: 'Keine weiteren Details',

    payment: 'Zahlung / Summe',
    customerAmount: 'Kundenbetrag',
    paymentStatus: 'Status',
    created: 'Erstellt',

    usage: 'Einlösung / QR',

    booking: 'Buchung',
    order: 'Bestellung',
    coupon: 'Coupon / Deal',

    pending: 'Offen',
    waiting: 'Wartet auf Leistung',
    used: 'Eingelöst',
    cancelled: 'Storniert / nicht verfügbar',

    paid: 'Bezahlt',
    paymentPending: 'Zahlung ausstehend',
    refunded: 'Erstattet',

    awaitingUsage: 'Bereit zur Einlösung',
    awaitingUsageHint:
      'Zum Servicetermin zeigt der Kunde den QR-Code zum Scannen durch den Partner.',

    usedUsage: 'Eingelöst',
    usedUsageHint:
      'Dieser Vorgang wurde bereits eingelöst.',

    pendingUsage: 'Noch nicht bereit',
    pendingUsageHint:
      'Bestätigung oder Zahlung muss zuerst abgeschlossen werden.',

    unavailableUsage: 'Einlösung nicht verfügbar',
    unavailableUsageHint:
      'Bitte zuerst den Status des Vorgangs prüfen.',

    people: 'Personen',
    units: 'Stück',
    close: 'Schließen',
    loading: 'Details werden geladen…',
  },

  zh: {
    eyebrow: '交易详情',
    customer: '客户',
    meloCustomer: 'Melo 客户',
    storeItems: '笔店铺记录',
    storeTotal: '店铺累计金额',

    product: '商品 / 服务',
    type: '类型',
    item: '项目',
    serviceDate: '使用日期',
    quantity: '数量',
    details: '详情',
    noDetails: '暂无更多详情',

    payment: '付款 / 订单金额',
    customerAmount: '客户金额',
    paymentStatus: '状态',
    created: '创建时间',

    usage: '核销 / QR',

    booking: '预订',
    order: '订单',
    coupon: '优惠券 / 优惠',

    pending: '待处理',
    waiting: '待使用服务',
    used: '已核销',
    cancelled: '已取消 / 不可用',

    paid: '已付款',
    paymentPending: '待付款',
    refunded: '已退款',

    awaitingUsage: '等待可使用',
    awaitingUsageHint:
      '到使用时间后，客户出示 QR 码供商家扫描。',

    usedUsage: '已核销',
    usedUsageHint:
      '此记录已完成核销。',

    pendingUsage: '暂不可使用',
    pendingUsageHint:
      '等待确认或付款完成后即可使用。',

    unavailableUsage: '无法核销',
    unavailableUsageHint:
      '请先检查记录状态。',

    people: '人',
    units: '件',
    close: '关闭',
    loading: '正在加载详情…',
  },

  ja: {
    eyebrow: '取引詳細',
    customer: '顧客',
    meloCustomer: 'Melo 顧客',
    storeItems: '件の店舗利用',
    storeTotal: '店舗での合計',

    product: '商品・サービス',
    type: '種類',
    item: '項目',
    serviceDate: '利用日時',
    quantity: '数量',
    details: '詳細',
    noDetails: '追加情報はありません',

    payment: '支払い / 合計',
    customerAmount: '顧客金額',
    paymentStatus: '状態',
    created: '作成日時',

    usage: '利用 / QR',

    booking: '予約',
    order: '注文',
    coupon: 'クーポン / ディール',

    pending: '保留中',
    waiting: 'サービス待ち',
    used: '利用済み',
    cancelled: 'キャンセル / 利用不可',

    paid: '支払い済み',
    paymentPending: '支払い待ち',
    refunded: '返金済み',

    awaitingUsage: '利用待ち',
    awaitingUsageHint:
      '利用時に顧客が QR コードを提示し、Partner がスキャンします。',

    usedUsage: '利用済み',
    usedUsageHint:
      'この項目はすでに利用済みです。',

    pendingUsage: 'まだ利用できません',
    pendingUsageHint:
      '確認または支払い完了後に利用できます。',

    unavailableUsage: '利用できません',
    unavailableUsageHint:
      '続行する前に取引状態を確認してください。',

    people: '人',
    units: '点',
    close: '閉じる',
    loading: '詳細を読み込み中…',
  },

  ko: {
    eyebrow: '거래 상세',
    customer: '고객',
    meloCustomer: 'Melo 고객',
    storeItems: '건의 매장 이용',
    storeTotal: '매장 누적 금액',

    product: '상품 / 서비스',
    type: '유형',
    item: '항목',
    serviceDate: '이용 일시',
    quantity: '수량',
    details: '상세 정보',
    noDetails: '추가 정보가 없습니다',

    payment: '결제 / 거래 금액',
    customerAmount: '고객 금액',
    paymentStatus: '상태',
    created: '생성일',

    usage: '사용 / QR',

    booking: '예약',
    order: '주문',
    coupon: '쿠폰 / 딜',

    pending: '대기',
    waiting: '서비스 대기',
    used: '사용 완료',
    cancelled: '취소 / 이용 불가',

    paid: '결제 완료',
    paymentPending: '결제 대기',
    refunded: '환불 완료',

    awaitingUsage: '이용 대기',
    awaitingUsageHint:
      '서비스 이용 시 고객이 QR 코드를 제시하면 Partner가 스캔합니다.',

    usedUsage: '사용 완료',
    usedUsageHint:
      '이 항목은 이미 사용 처리되었습니다.',

    pendingUsage: '아직 이용할 수 없습니다',
    pendingUsageHint:
      '확인 또는 결제가 완료된 후 이용할 수 있습니다.',

    unavailableUsage: '이용할 수 없습니다',
    unavailableUsageHint:
      '계속하기 전에 거래 상태를 확인하세요.',

    people: '명',
    units: '개',
    close: '닫기',
    loading: '상세 정보를 불러오는 중…',
  },
} as const;

type LocaleKey =
  keyof typeof COPY;

function localeKey(
  value: string,
): LocaleKey {
  return Object.prototype.hasOwnProperty.call(
    COPY,
    value,
  )
    ? value as LocaleKey
    : 'en';
}

function rows(
  value: unknown,
): Row[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is Row =>
      Boolean(
        item,
      ) &&
      typeof item ===
        'object',
  );
}

function valueText(
  row: Row | null,
  ...keys: string[]
) {
  for (
    const key of
    keys
  ) {
    const value =
      row?.[
        key
      ];

    if (
      value !==
        null &&
      value !==
        undefined &&
      String(
        value,
      ).trim()
    ) {
      return String(
        value,
      ).trim();
    }
  }

  return '';
}

function nullableNumber(
  row: Row | null,
  ...keys: string[]
) {
  for (
    const key of
    keys
  ) {
    const raw =
      row?.[
        key
      ];

    if (
      raw ===
        null ||
      raw ===
        undefined ||
      String(
        raw,
      ).trim() ===
        ''
    ) {
      continue;
    }

    const value =
      Number(
        raw,
      );

    if (
      Number.isFinite(
        value,
      )
    ) {
      return value;
    }
  }

  return null;
}

function dateLocale(
  locale: LocaleKey,
) {
  switch (
    locale
  ) {
    case 'th':
      return 'th-TH';

    case 'de':
      return 'de-DE';

    case 'zh':
      return 'zh-CN';

    case 'ja':
      return 'ja-JP';

    case 'ko':
      return 'ko-KR';

    default:
      return 'en-US';
  }
}

function formatDateTime(
  value: string,
  locale: LocaleKey,
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

  return new Intl.DateTimeFormat(
    dateLocale(
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
}

function formatMoney(
  value: number | null,
  currency: string,
  locale: LocaleKey,
) {
  if (
    value ===
    null
  ) {
    return '—';
  }

  const code =
    (
      currency ||
      'THB'
    )
      .trim()
      .toUpperCase();

  try {
    return new Intl.NumberFormat(
      dateLocale(
        locale,
      ),
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
      value,
    );
  } catch {
    return `${code} ${value.toLocaleString()}`;
  }
}

function referenceCode(
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

function statusGroup(
  value: string,
) {
  const status =
    value
      .trim()
      .toLowerCase();

  if (
    [
      'completed',
      'redeemed',
      'used',
      'fulfilled',
      'served',
      'done',
      'consumed',
    ].includes(
      status,
    )
  ) {
    return 'used' as const;
  }

  if (
    [
      'confirmed',
      'approved',
      'accepted',
      'paid',
      'reserved',
      'booked',
      'ready',
      'active',
    ].includes(
      status,
    )
  ) {
    return 'waiting' as const;
  }

  if (
    [
      'cancelled',
      'canceled',
      'rejected',
      'expired',
      'failed',
      'refunded',
    ].includes(
      status,
    )
  ) {
    return 'other' as const;
  }

  return 'pending' as const;
}

function kindLabel(
  item: PartnerTransaction,
  copy: (typeof COPY)[LocaleKey],
) {
  if (
    item.kind ===
    'booking'
  ) {
    return copy.booking;
  }

  if (
    item.kind ===
    'order'
  ) {
    return copy.order;
  }

  return copy.coupon;
}

function transactionStatusLabel(
  status: string,
  copy: (typeof COPY)[LocaleKey],
) {
  const group =
    statusGroup(
      status,
    );

  if (
    group ===
    'used'
  ) {
    return copy.used;
  }

  if (
    group ===
    'waiting'
  ) {
    return copy.waiting;
  }

  if (
    group ===
    'pending'
  ) {
    return copy.pending;
  }

  return (
    status.trim() ||
    copy.cancelled
  );
}

function paymentStatusLabel(
  status: string,
  transactionStatus: string,
  copy: (typeof COPY)[LocaleKey],
) {
  const value =
    status
      .trim()
      .toLowerCase();

  if (
    [
      'paid',
      'succeeded',
      'success',
      'completed',
    ].includes(
      value,
    )
  ) {
    return copy.paid;
  }

  if (
    [
      'pending',
      'unpaid',
      'awaiting_payment',
      'processing',
    ].includes(
      value,
    )
  ) {
    return copy.paymentPending;
  }

  if (
    [
      'refunded',
      'refund',
    ].includes(
      value,
    )
  ) {
    return copy.refunded;
  }

  if (
    status.trim()
  ) {
    return status;
  }

  return transactionStatusLabel(
    transactionStatus,
    copy,
  );
}

function customerMatches(
  left: PartnerTransaction,
  right: PartnerTransaction,
) {
  if (
    left.customerUserId &&
    right.customerUserId
  ) {
    return (
      left.customerUserId ===
      right.customerUserId
    );
  }

  return (
    left.customerName
      .trim()
      .toLowerCase() ===
    right.customerName
      .trim()
      .toLowerCase()
  );
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div
      className={
        multiline
          ? 'meloCustomerDetailRow meloCustomerDetailRowMultiline'
          : 'meloCustomerDetailRow'
      }
    >
      <span>
        {
          label
        }
      </span>

      <strong>
        {
          value
        }
      </strong>
    </div>
  );
}

export default function PartnerCustomerDetailModal({
  item,
  transactions,
  businessId,
  locale: rawLocale,
  onClose,
}: Props) {
  const locale =
    localeKey(
      rawLocale,
    );

  const copy =
    COPY[
      locale
    ];

  const [
    rawDetail,
    setRawDetail,
  ] =
    useState<Row | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      if (
        !item
      ) {
        setRawDetail(
          null,
        );

        return;
      }

      const previousOverflow =
        document
          .body
          .style
          .overflow;

      document
        .body
        .style
        .overflow =
        'hidden';

      const handleKeyDown =
        (
          event:
            KeyboardEvent,
        ) => {
          if (
            event.key ===
            'Escape'
          ) {
            onClose();
          }
        };

      window.addEventListener(
        'keydown',
        handleKeyDown,
      );

      return () => {
        document
          .body
          .style
          .overflow =
          previousOverflow;

        window.removeEventListener(
          'keydown',
          handleKeyDown,
        );
      };
    },
    [
      item,
      onClose,
    ],
  );

  useEffect(
    () => {
      let active =
        true;

      async function loadDetail() {
        if (
          !item ||
          !businessId
        ) {
          setRawDetail(
            null,
          );

          return;
        }

        setLoading(
          true,
        );

        try {
          let candidates:
            Row[] =
            [];

          if (
            item.kind ===
            'booking'
          ) {
            const [
              offers,
              bookings,
            ] =
              await Promise.all(
                [
                  rpcRequest<
                    Row[]
                  >(
                    'get_partner_booking_offers',
                    {
                      p_business_id:
                        businessId,
                    },
                  ),

                  rpcRequest<
                    Row[]
                  >(
                    'get_my_business_bookings',
                  ),
                ],
              );

            candidates = [
              ...rows(
                offers.data,
              ),

              ...rows(
                bookings.data,
              ),
            ];
          } else if (
            item.kind ===
            'order'
          ) {
            const orders =
              await rpcRequest<
                Row[]
              >(
                'get_partner_service_orders',
                {
                  p_business_id:
                    businessId,
                },
              );

            candidates =
              rows(
                orders.data,
              );
          } else {
            const claims =
              await rpcRequest<
                Row[]
              >(
                'get_my_business_coupon_claims',
              );

            candidates =
              rows(
                claims.data,
              );
          }

          const matched =
            candidates.find(
              (
                row,
              ) => {
                const id =
                  valueText(
                    row,
                    'id',
                    'booking_id',
                    'order_id',
                    'claim_id',
                    'coupon_claim_id',
                  );

                return (
                  id ===
                  item.id
                );
              },
            ) ||
            null;

          if (
            active
          ) {
            setRawDetail(
              matched,
            );
          }
        } catch (
          error
        ) {
          console.warn(
            '[Melo Partner] Unable to load customer transaction detail:',
            error,
          );

          if (
            active
          ) {
            setRawDetail(
              null,
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void loadDetail();

      return () => {
        active =
          false;
      };
    },
    [
      businessId,
      item,
    ],
  );

  const customerHistory =
    useMemo(
      () => {
        if (
          !item
        ) {
          return [];
        }

        const unique =
          new Map<
            string,
            PartnerTransaction
          >();

        for (
          const transaction of
          transactions
        ) {
          if (
            !customerMatches(
              item,
              transaction,
            )
          ) {
            continue;
          }

          unique.set(
            `${transaction.kind}:${transaction.id}`,
            transaction,
          );
        }

        return [
          ...unique.values(),
        ];
      },
      [
        item,
        transactions,
      ],
    );

  const customerTotal =
    useMemo(
      () =>
        customerHistory.reduce(
          (
            total,
            transaction,
          ) =>
            total +
            (
              transaction.amount ??
              0
            ),
          0,
        ),
      [
        customerHistory,
      ],
    );

  if (
    !item
  ) {
    return null;
  }

  const details =
    valueText(
      rawDetail,
      'notes',
      'details',
      'description',
      'service_description',
      'offer_notes',
      'order_notes',
      'coupon_details',
      'terms_text',
    );

  const serviceDate =
    valueText(
      rawDetail,
      'booking_date',
      'service_date',
      'scheduled_date',
      'redeem_date',
      'reservation_date',
    );

  const serviceTime =
    valueText(
      rawDetail,
      'booking_time',
      'service_time',
      'scheduled_time',
      'reservation_time',
    );

  const rawGuestCount =
    nullableNumber(
      rawDetail,
      'guest_count',
      'party_size',
      'people_count',
    );

  const rawQuantity =
    nullableNumber(
      rawDetail,
      'quantity',
      'item_count',
      'qty',
    );

  const guestCount =
    item.guestCount ??
    rawGuestCount;

  const quantity =
    rawQuantity ??
    (
      item.kind ===
      'booking'
        ? guestCount
        : null
    );

  const paymentStatus =
    valueText(
      rawDetail,
      'payment_status',
      'payment_state',
      'order_payment_status',
      'charge_status',
    );

  const usageStatus =
    valueText(
      rawDetail,
      'usage_status',
      'redemption_status',
      'redeem_status',
      'service_usage_status',
    );

  const redeemedAt =
    valueText(
      rawDetail,
      'redeemed_at',
      'used_at',
      'fulfilled_at',
      'served_at',
      'consumed_at',
    );

  const createdAt =
    valueText(
      rawDetail,
      'created_at',
      'requested_at',
      'claimed_at',
      'ordered_at',
      'booked_at',
    ) ||
    item.createdAt;

  const schedule =
    serviceDate
      ? [
          serviceDate,
          serviceTime,
        ]
          .filter(
            Boolean,
          )
          .join(
            ' · ',
          )
      : formatDateTime(
          item.scheduledAt ||
            item.createdAt,
          locale,
        );

  const group =
    statusGroup(
      usageStatus ||
        item.status,
    );

  const normalizedPayment =
    paymentStatus
      .trim()
      .toLowerCase();

  const isPaid =
    [
      'paid',
      'succeeded',
      'success',
      'completed',
    ].includes(
      normalizedPayment,
    );

  const usageState =
    group ===
    'used'
      ? 'used'
      : group ===
          'waiting' ||
        isPaid
        ? 'waiting'
        : group ===
          'pending'
          ? 'pending'
          : 'other';

  const usageTitle =
    usageState ===
    'used'
      ? copy.usedUsage
      : usageState ===
          'waiting'
        ? copy.awaitingUsage
        : usageState ===
            'pending'
          ? copy.pendingUsage
          : copy.unavailableUsage;

  const usageHint =
    usageState ===
    'used'
      ? redeemedAt
        ? `${copy.usedUsageHint} · ${formatDateTime(
            redeemedAt,
            locale,
          )}`
        : copy.usedUsageHint
      : usageState ===
          'waiting'
        ? copy.awaitingUsageHint
        : usageState ===
            'pending'
          ? copy.pendingUsageHint
          : copy.unavailableUsageHint;

  const profileHref =
    item.customerUserId
      ? `/users/${item.customerUserId}`
      : '';

  const amountText =
    formatMoney(
      item.amount,
      item.currency,
      locale,
    );

  const historyTotalText =
    formatMoney(
      customerTotal,
      item.currency,
      locale,
    );

  return (
    <div
      className="meloCustomerDetailBackdrop"
      onMouseDown={(
        event,
      ) => {
        if (
          event.currentTarget ===
          event.target
        ) {
          onClose();
        }
      }}
    >
      <section
        className="meloCustomerDetailModal"
        role="dialog"
        aria-modal="true"
        aria-label={
          copy.eyebrow
        }
      >
        <header className="meloCustomerDetailHeader">
          <div>
            <small>
              {
                copy.eyebrow
              }
            </small>

            <h2>
              {
                item.title
              }
            </h2>

            <code>
              {referenceCode(
                item.referenceCode,
              )}
            </code>
          </div>

          <button
            type="button"
            className="meloCustomerDetailCloseIcon"
            aria-label={
              copy.close
            }
            onClick={
              onClose
            }
          >
            ×
          </button>
        </header>

        <div className="meloCustomerDetailBody">
          {loading ? (
            <div className="meloCustomerDetailLoading">
              {
                copy.loading
              }
            </div>
          ) : null}

          <section className="meloCustomerDetailSection">
            <h3>
              {
                copy.customer
              }
            </h3>

            <div className="meloCustomerProfileCard">
              {profileHref ? (
                <Link
                  href={
                    profileHref
                  }
                  className="meloCustomerDetailAvatarLink"
                >
                  <VerifiedUserAvatar
                    userId={
                      item.customerUserId
                    }
                    name={
                      item.customerName
                    }
                    src={
                      item.customerPhotoUrl
                    }
                    country={
                      item.customerCountry
                    }
                    nationality={
                      item.customerNationality
                    }
                    size={
                      64
                    }
                    badgeSize={
                      18
                    }
                    alt={
                      item.customerName
                    }
                  />
                </Link>
              ) : (
                <VerifiedUserAvatar
                  name={
                    item.customerName
                  }
                  src={
                    item.customerPhotoUrl
                  }
                  country={
                    item.customerCountry
                  }
                  nationality={
                    item.customerNationality
                  }
                  size={
                    64
                  }
                  badgeSize={
                    18
                  }
                  alt={
                    item.customerName
                  }
                />
              )}

              <div className="meloCustomerProfileCopy">
                {profileHref ? (
                  <Link
                    href={
                      profileHref
                    }
                  >
                    {
                      item.customerName
                    }
                  </Link>
                ) : (
                  <strong>
                    {
                      item.customerName
                    }
                  </strong>
                )}

                <span>
                  {
                    copy.meloCustomer
                  }{' '}
                  ·{' '}
                  {
                    customerHistory.length
                  }{' '}
                  {
                    copy.storeItems
                  }
                </span>

                <small>
                  {
                    copy.storeTotal
                  }{' '}
                  <b>
                    {
                      historyTotalText
                    }
                  </b>
                </small>
              </div>

              <div
                className="meloCustomerDetailStatus"
                data-status={
                  group
                }
              >
                {transactionStatusLabel(
                  item.status,
                  copy,
                )}
              </div>
            </div>
          </section>

          <div className="meloCustomerDetailColumns">
            <section className="meloCustomerDetailSection">
              <h3>
                {
                  copy.product
                }
              </h3>

              <div className="meloCustomerDetailCard">
                <DetailRow
                  label={
                    copy.type
                  }
                  value={
                    kindLabel(
                      item,
                      copy,
                    )
                  }
                />

                <DetailRow
                  label={
                    copy.item
                  }
                  value={
                    item.title
                  }
                />

                <DetailRow
                  label={
                    copy.serviceDate
                  }
                  value={
                    schedule
                  }
                />

                <DetailRow
                  label={
                    copy.quantity
                  }
                  value={
                    item.kind ===
                    'booking'
                      ? `${guestCount ?? 1} ${copy.people}`
                      : `${quantity ?? 1} ${copy.units}`
                  }
                />

                <DetailRow
                  label={
                    copy.details
                  }
                  multiline
                  value={
                    details ||
                    copy.noDetails
                  }
                />
              </div>
            </section>

            <section className="meloCustomerDetailSection">
              <h3>
                {
                  copy.payment
                }
              </h3>

              <div className="meloCustomerDetailCard">
                <DetailRow
                  label={
                    copy.customerAmount
                  }
                  value={
                    <b className="meloCustomerDetailMoney">
                      {
                        amountText
                      }
                    </b>
                  }
                />

                <DetailRow
                  label={
                    copy.paymentStatus
                  }
                  value={
                    paymentStatusLabel(
                      paymentStatus,
                      item.status,
                      copy,
                    )
                  }
                />

                <DetailRow
                  label={
                    copy.created
                  }
                  value={
                    formatDateTime(
                      createdAt,
                      locale,
                    )
                  }
                />
              </div>
            </section>
          </div>

          <section className="meloCustomerDetailSection">
            <h3>
              {
                copy.usage
              }
            </h3>

            <div
              className="meloCustomerUsageCard"
              data-state={
                usageState
              }
            >
              <div className="meloCustomerUsageIcon">
                {usageState ===
                'used'
                  ? '✓'
                  : '▣'}
              </div>

              <div>
                <strong>
                  {
                    usageTitle
                  }
                </strong>

                <p>
                  {
                    usageHint
                  }
                </p>
              </div>
            </div>
          </section>

          <button
            type="button"
            className="meloCustomerDetailCloseButton"
            onClick={
              onClose
            }
          >
            {
              copy.close
            }
          </button>
        </div>
      </section>

      <style jsx global>{`
        .meloCustomerDetailBackdrop {
          position: fixed;
          inset: 0;
          z-index: 260;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(4, 12, 22, 0.6);
          backdrop-filter: blur(9px);
        }

        .meloCustomerDetailModal {
          width: min(900px, 100%);
          max-height: calc(100vh - 48px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 26px;
          background: var(--surface);
          color: var(--text);
          box-shadow:
            0 30px 90px
            rgba(0, 0, 0, 0.32);
        }

        .meloCustomerDetailHeader {
          position: relative;
          flex: 0 0 auto;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 23px 72px 20px 25px;
          border-bottom: 1px solid var(--border);
          background:
            color-mix(
              in srgb,
              var(--surface) 93%,
              var(--primary-soft)
            );
        }

        .meloCustomerDetailHeader small,
        .meloCustomerDetailHeader h2,
        .meloCustomerDetailHeader code {
          display: block;
        }

        .meloCustomerDetailHeader small {
          color: var(--primary);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .meloCustomerDetailHeader h2 {
          max-width: 720px;
          margin: 7px 0 5px;
          color: var(--text);
          font-size: 23px;
          line-height: 1.28;
          letter-spacing: -0.025em;
          overflow-wrap: anywhere;
        }

        .meloCustomerDetailHeader code {
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 9px;
          font-weight: 800;
        }

        .meloCustomerDetailCloseIcon {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface-2);
          color: var(--text);
          font: inherit;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .meloCustomerDetailCloseIcon:hover {
          border-color:
            color-mix(
              in srgb,
              var(--primary) 40%,
              var(--border)
            );
          background: var(--primary-soft);
          color: var(--primary);
        }

        .meloCustomerDetailBody {
          min-height: 0;
          overflow-y: auto;
          display: grid;
          gap: 19px;
          padding: 20px 24px 24px;
        }

        .meloCustomerDetailLoading {
          margin: -2px 0 -5px;
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
        }

        .meloCustomerDetailSection {
          min-width: 0;
        }

        .meloCustomerDetailSection > h3 {
          margin: 0 0 9px;
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
        }

        .meloCustomerProfileCard {
          display: grid;
          grid-template-columns:
            64px
            minmax(0, 1fr)
            auto;
          gap: 13px;
          align-items: center;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 19px;
          background: var(--surface-2);
        }

        .meloCustomerDetailAvatarLink {
          line-height: 0;
        }

        .meloCustomerProfileCopy {
          min-width: 0;
        }

        .meloCustomerProfileCopy > a,
        .meloCustomerProfileCopy > strong {
          display: block;
          width: max-content;
          max-width: 100%;
          overflow: hidden;
          color: var(--text);
          font-size: 14px;
          font-weight: 950;
          text-decoration: none;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .meloCustomerProfileCopy > a:hover {
          color: var(--primary);
        }

        .meloCustomerProfileCopy > span {
          display: block;
          margin-top: 4px;
          color: var(--text-secondary);
          font-size: 8.5px;
          line-height: 1.5;
        }

        .meloCustomerProfileCopy > small {
          display: block;
          margin-top: 4px;
          color: var(--text-secondary);
          font-size: 8.5px;
        }

        .meloCustomerProfileCopy > small b {
          color: var(--text);
          font-size: 9px;
        }

        .meloCustomerDetailStatus {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 29px;
          padding: 0 10px;
          border-radius: 999px;
          background: var(--surface);
          color: var(--text-secondary);
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
        }

        .meloCustomerDetailStatus[data-status='pending'] {
          background:
            color-mix(
              in srgb,
              var(--warning) 13%,
              var(--surface)
            );
          color:
            color-mix(
              in srgb,
              var(--warning) 80%,
              var(--text)
            );
        }

        .meloCustomerDetailStatus[data-status='waiting'] {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .meloCustomerDetailStatus[data-status='used'] {
          background:
            color-mix(
              in srgb,
              #26a269 13%,
              var(--surface)
            );
          color:
            color-mix(
              in srgb,
              #26a269 80%,
              var(--text)
            );
        }

        .meloCustomerDetailColumns {
          display: grid;
          grid-template-columns:
            minmax(0, 1.25fr)
            minmax(270px, 0.75fr);
          gap: 15px;
          align-items: start;
        }

        .meloCustomerDetailCard {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 19px;
          background: var(--surface-2);
        }

        .meloCustomerDetailRow {
          display: grid;
          grid-template-columns:
            minmax(115px, 0.42fr)
            minmax(0, 1fr);
          gap: 16px;
          align-items: start;
          padding: 13px 15px;
          border-top: 1px solid var(--border);
        }

        .meloCustomerDetailRow:first-child {
          border-top: 0;
        }

        .meloCustomerDetailRow > span {
          color: var(--text-secondary);
          font-size: 8px;
          font-weight: 800;
        }

        .meloCustomerDetailRow > strong {
          min-width: 0;
          color: var(--text);
          font-size: 9.5px;
          line-height: 1.55;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .meloCustomerDetailRowMultiline {
          grid-template-columns: 1fr;
          gap: 7px;
        }

        .meloCustomerDetailRowMultiline > strong {
          white-space: pre-wrap;
          text-align: left;
          line-height: 1.7;
        }

        .meloCustomerDetailMoney {
          color: var(--primary);
          font-size: 14px;
        }

        .meloCustomerUsageCard {
          display: grid;
          grid-template-columns:
            46px
            minmax(0, 1fr);
          gap: 13px;
          align-items: center;
          padding: 15px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--primary) 33%,
              var(--border)
            );
          border-radius: 19px;
          background:
            color-mix(
              in srgb,
              var(--primary-soft) 70%,
              var(--surface)
            );
        }

        .meloCustomerUsageIcon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: var(--primary-soft);
          color: var(--primary);
          font-size: 18px;
          font-weight: 950;
        }

        .meloCustomerUsageCard strong {
          display: block;
          color: var(--text);
          font-size: 11px;
        }

        .meloCustomerUsageCard p {
          margin: 4px 0 0;
          color: var(--text-secondary);
          font-size: 8.5px;
          line-height: 1.6;
        }

        .meloCustomerUsageCard[data-state='used'] {
          border-color:
            color-mix(
              in srgb,
              #26a269 35%,
              var(--border)
            );
          background:
            color-mix(
              in srgb,
              #26a269 9%,
              var(--surface)
            );
        }

        .meloCustomerUsageCard[data-state='used']
          .meloCustomerUsageIcon {
          background:
            color-mix(
              in srgb,
              #26a269 14%,
              var(--surface)
            );
          color: #269765;
        }

        .meloCustomerUsageCard[data-state='pending'] {
          border-color:
            color-mix(
              in srgb,
              var(--warning) 35%,
              var(--border)
            );
          background:
            color-mix(
              in srgb,
              var(--warning) 8%,
              var(--surface)
            );
        }

        .meloCustomerUsageCard[data-state='pending']
          .meloCustomerUsageIcon {
          background:
            color-mix(
              in srgb,
              var(--warning) 14%,
              var(--surface)
            );
          color:
            color-mix(
              in srgb,
              var(--warning) 80%,
              var(--text)
            );
        }

        .meloCustomerUsageCard[data-state='other'] {
          border-color: var(--border);
          background: var(--surface-2);
        }

        .meloCustomerUsageCard[data-state='other']
          .meloCustomerUsageIcon {
          background: var(--surface-3);
          color: var(--text-secondary);
        }

        .meloCustomerDetailCloseButton {
          width: 100%;
          min-height: 44px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface-2);
          color: var(--text);
          font: inherit;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .meloCustomerDetailCloseButton:hover {
          border-color:
            color-mix(
              in srgb,
              var(--primary) 38%,
              var(--border)
            );
          background: var(--primary-soft);
          color: var(--primary);
        }

        @media (max-width: 760px) {
          .meloCustomerDetailBackdrop {
            padding: 12px;
          }

          .meloCustomerDetailModal {
            max-height:
              calc(
                100vh - 24px
              );
            border-radius: 21px;
          }

          .meloCustomerDetailHeader {
            padding:
              20px
              62px
              17px
              18px;
          }

          .meloCustomerDetailHeader h2 {
            font-size: 19px;
          }

          .meloCustomerDetailBody {
            padding:
              16px
              16px
              18px;
          }

          .meloCustomerDetailColumns {
            grid-template-columns:
              1fr;
          }

          .meloCustomerProfileCard {
            grid-template-columns:
              56px
              minmax(0, 1fr);
          }

          .meloCustomerDetailStatus {
            grid-column: 2;
            justify-self: start;
          }

          .meloCustomerDetailRow {
            grid-template-columns:
              minmax(90px, 0.4fr)
              minmax(0, 1fr);
          }
        }

        @media (max-width: 480px) {
          .meloCustomerDetailBackdrop {
            padding: 0;
            place-items: end center;
          }

          .meloCustomerDetailModal {
            width: 100%;
            max-height: 94vh;
            border-right: 0;
            border-bottom: 0;
            border-left: 0;
            border-radius:
              24px
              24px
              0
              0;
          }

          .meloCustomerDetailRow {
            grid-template-columns:
              1fr;
            gap: 5px;
          }

          .meloCustomerDetailRow > strong {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}
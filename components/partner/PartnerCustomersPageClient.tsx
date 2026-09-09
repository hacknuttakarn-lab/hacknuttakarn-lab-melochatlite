'use client';

import Link from 'next/link';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useLocale } from '@/components/SiteProviders';

import VerifiedUserAvatar from '@/components/profile/VerifiedUserAvatar';

import {
  rpcRequest,
} from '@/lib/supabase/browser';

import PartnerWorkspaceExperience from './PartnerWorkspaceExperience';

import {
  getActivePartnerBusiness,
  listPartnerTransactions,
  type PartnerBusinessAccess,
  type PartnerTransaction,
} from './partnerModeWeb';

type Row = Record<
  string,
  unknown
>;

type DetailState = {
  transaction: PartnerTransaction;
  raw: Row | null;
};

const COPY = {
  th: {
    eyebrow: 'รายละเอียดรายการ',
    customer: 'ลูกค้า',
    meloCustomer: 'ลูกค้า Melo',
    transactionsWithStore: 'รายการกับร้าน',
    totalWithStore: 'ยอดรวมกับร้าน',

    productSection: 'สินค้า / บริการ',
    type: 'ประเภท',
    item: 'รายการ',
    serviceDate: 'วันใช้บริการ',
    quantity: 'จำนวน',
    details: 'รายละเอียด',
    noDetails: 'ไม่มีรายละเอียดเพิ่มเติม',

    paymentSection: 'การชำระ / ยอดรายการ',
    customerAmount: 'ยอดลูกค้า',
    paymentStatus: 'สถานะ',
    createdAt: 'สร้างรายการ',

    redemptionSection: 'การใช้สิทธิ์ / QR',

    booking: 'การจอง',
    order: 'ออเดอร์',
    coupon: 'คูปอง / ดีล',

    pending: 'รอดำเนินการ',
    waiting: 'รอใช้บริการ',
    used: 'ใช้สิทธิ์แล้ว',
    unavailable: 'ไม่พร้อมใช้งาน',

    paid: 'ชำระเงินแล้ว',
    awaitingPayment: 'รอชำระเงิน',
    refunded: 'คืนเงินแล้ว',

    readyForRedemption: 'รอรายการพร้อมใช้งาน',
    readyForRedemptionHint:
      'เมื่อถึงเวลาใช้บริการ ลูกค้าแสดง QR ให้ Partner สแกน',

    redeemed: 'ใช้สิทธิ์แล้ว',
    redeemedHint:
      'รายการนี้ถูกใช้สิทธิ์เรียบร้อยแล้ว',

    pendingRedemption: 'รายการยังไม่พร้อมใช้งาน',
    pendingRedemptionHint:
      'รอการยืนยันรายการหรือการชำระเงินก่อนเปิดใช้สิทธิ์',

    unavailableRedemption: 'ไม่สามารถใช้สิทธิ์ได้',
    unavailableRedemptionHint:
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
    transactionsWithStore: 'items with this store',
    totalWithStore: 'Total with store',

    productSection: 'Product / service',
    type: 'Type',
    item: 'Item',
    serviceDate: 'Service date',
    quantity: 'Quantity',
    details: 'Details',
    noDetails: 'No additional details',

    paymentSection: 'Payment / transaction total',
    customerAmount: 'Customer amount',
    paymentStatus: 'Status',
    createdAt: 'Created',

    redemptionSection: 'Redemption / QR',

    booking: 'Booking',
    order: 'Order',
    coupon: 'Coupon / deal',

    pending: 'Pending',
    waiting: 'Awaiting service',
    used: 'Redeemed',
    unavailable: 'Unavailable',

    paid: 'Paid',
    awaitingPayment: 'Awaiting payment',
    refunded: 'Refunded',

    readyForRedemption: 'Ready for service',
    readyForRedemptionHint:
      'At service time, the customer presents their QR code for the Partner to scan.',

    redeemed: 'Redeemed',
    redeemedHint:
      'This transaction has already been redeemed.',

    pendingRedemption: 'Not ready yet',
    pendingRedemptionHint:
      'Confirmation or payment must be completed before redemption.',

    unavailableRedemption: 'Redemption unavailable',
    unavailableRedemptionHint:
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
    transactionsWithStore: 'Vorgänge mit diesem Store',
    totalWithStore: 'Gesamt beim Store',

    productSection: 'Produkt / Service',
    type: 'Typ',
    item: 'Eintrag',
    serviceDate: 'Servicetermin',
    quantity: 'Menge',
    details: 'Details',
    noDetails: 'Keine weiteren Details',

    paymentSection: 'Zahlung / Summe',
    customerAmount: 'Kundenbetrag',
    paymentStatus: 'Status',
    createdAt: 'Erstellt',

    redemptionSection: 'Einlösung / QR',

    booking: 'Buchung',
    order: 'Bestellung',
    coupon: 'Coupon / Deal',

    pending: 'Offen',
    waiting: 'Wartet auf Leistung',
    used: 'Eingelöst',
    unavailable: 'Nicht verfügbar',

    paid: 'Bezahlt',
    awaitingPayment: 'Zahlung ausstehend',
    refunded: 'Erstattet',

    readyForRedemption: 'Bereit zur Einlösung',
    readyForRedemptionHint:
      'Zum Servicetermin zeigt der Kunde den QR-Code zum Scannen durch den Partner.',

    redeemed: 'Eingelöst',
    redeemedHint:
      'Dieser Vorgang wurde bereits eingelöst.',

    pendingRedemption: 'Noch nicht bereit',
    pendingRedemptionHint:
      'Bestätigung oder Zahlung muss zuerst abgeschlossen werden.',

    unavailableRedemption: 'Einlösung nicht verfügbar',
    unavailableRedemptionHint:
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
    transactionsWithStore: '笔店铺记录',
    totalWithStore: '店铺累计金额',

    productSection: '商品 / 服务',
    type: '类型',
    item: '项目',
    serviceDate: '使用日期',
    quantity: '数量',
    details: '详情',
    noDetails: '暂无更多详情',

    paymentSection: '付款 / 订单金额',
    customerAmount: '客户金额',
    paymentStatus: '状态',
    createdAt: '创建时间',

    redemptionSection: '核销 / QR',

    booking: '预订',
    order: '订单',
    coupon: '优惠券 / 优惠',

    pending: '待处理',
    waiting: '待使用服务',
    used: '已核销',
    unavailable: '不可用',

    paid: '已付款',
    awaitingPayment: '待付款',
    refunded: '已退款',

    readyForRedemption: '等待可使用',
    readyForRedemptionHint:
      '到使用时间后，客户出示 QR 码供商家扫描。',

    redeemed: '已核销',
    redeemedHint:
      '此记录已完成核销。',

    pendingRedemption: '暂不可使用',
    pendingRedemptionHint:
      '等待确认或付款完成后即可使用。',

    unavailableRedemption: '无法核销',
    unavailableRedemptionHint:
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
    transactionsWithStore: '件の店舗利用',
    totalWithStore: '店舗での合計',

    productSection: '商品・サービス',
    type: '種類',
    item: '項目',
    serviceDate: '利用日時',
    quantity: '数量',
    details: '詳細',
    noDetails: '追加情報はありません',

    paymentSection: '支払い / 合計',
    customerAmount: '顧客金額',
    paymentStatus: '状態',
    createdAt: '作成日時',

    redemptionSection: '利用 / QR',

    booking: '予約',
    order: '注文',
    coupon: 'クーポン / ディール',

    pending: '保留中',
    waiting: 'サービス待ち',
    used: '利用済み',
    unavailable: '利用不可',

    paid: '支払い済み',
    awaitingPayment: '支払い待ち',
    refunded: '返金済み',

    readyForRedemption: '利用待ち',
    readyForRedemptionHint:
      '利用時に顧客が QR コードを提示し、Partner がスキャンします。',

    redeemed: '利用済み',
    redeemedHint:
      'この項目はすでに利用済みです。',

    pendingRedemption: 'まだ利用できません',
    pendingRedemptionHint:
      '確認または支払い完了後に利用できます。',

    unavailableRedemption: '利用できません',
    unavailableRedemptionHint:
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
    transactionsWithStore: '건의 매장 이용',
    totalWithStore: '매장 누적 금액',

    productSection: '상품 / 서비스',
    type: '유형',
    item: '항목',
    serviceDate: '이용 일시',
    quantity: '수량',
    details: '상세 정보',
    noDetails: '추가 정보가 없습니다',

    paymentSection: '결제 / 거래 금액',
    customerAmount: '고객 금액',
    paymentStatus: '상태',
    createdAt: '생성일',

    redemptionSection: '사용 / QR',

    booking: '예약',
    order: '주문',
    coupon: '쿠폰 / 딜',

    pending: '대기',
    waiting: '서비스 대기',
    used: '사용 완료',
    unavailable: '이용 불가',

    paid: '결제 완료',
    awaitingPayment: '결제 대기',
    refunded: '환불 완료',

    readyForRedemption: '이용 대기',
    readyForRedemptionHint:
      '서비스 이용 시 고객이 QR 코드를 제시하면 Partner가 스캔합니다.',

    redeemed: '사용 완료',
    redeemedHint:
      '이 항목은 이미 사용 처리되었습니다.',

    pendingRedemption: '아직 이용할 수 없습니다',
    pendingRedemptionHint:
      '확인 또는 결제가 완료된 후 이용할 수 있습니다.',

    unavailableRedemption: '이용할 수 없습니다',
    unavailableRedemptionHint:
      '계속하기 전에 거래 상태를 확인하세요.',

    people: '명',
    units: '개',

    close: '닫기',
    loading: '상세 정보를 불러오는 중…',
  },
} as const;

type LocaleCode =
  keyof typeof COPY;

function normalizedLocale(
  value: string,
): LocaleCode {
  return Object.prototype.hasOwnProperty.call(
    COPY,
    value,
  )
    ? value as LocaleCode
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
      row,
    ): row is Row =>
      Boolean(
        row,
      ) &&
      typeof row ===
        'object',
  );
}

function text(
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

function numberValue(
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

function localeName(
  locale: LocaleCode,
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
  locale: LocaleCode,
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
}

function formatMoney(
  value:
    | number
    | null,
  currency: string,
  locale: LocaleCode,
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
      localeName(
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

function normalizeReference(
  value: string,
) {
  return String(
    value ||
    '',
  )
    .replace(
      /^#+/,
      '',
    )
    .trim()
    .toLowerCase();
}

function displayReference(
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
    String(
      value ||
      '',
    )
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

function sameCustomer(
  left:
    PartnerTransaction,
  right:
    PartnerTransaction,
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
  children,
  multiline = false,
}: {
  label: string;
  children: ReactNode;
  multiline?: boolean;
}) {
  return (
    <div
      className={
        multiline
          ? 'meloPartnerCustomerDetailRow meloPartnerCustomerDetailRowMulti'
          : 'meloPartnerCustomerDetailRow'
      }
    >
      <span>
        {
          label
        }
      </span>

      <strong>
        {
          children
        }
      </strong>
    </div>
  );
}

export default function PartnerCustomersPageClient() {
  const {
    locale: currentLocale,
  } =
    useLocale();

  const locale =
    normalizedLocale(
      currentLocale,
    );

  const copy =
    COPY[
      locale
    ];

  const [
    access,
    setAccess,
  ] =
    useState<
      PartnerBusinessAccess |
      null
    >(
      null,
    );

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      PartnerTransaction[]
    >(
      [],
    );

  const [
    selected,
    setSelected,
  ] =
    useState<
      DetailState |
      null
    >(
      null,
    );

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(
      false,
    );

  const loadTransactions =
    useCallback(
      async () => {
        const nextAccess =
          await getActivePartnerBusiness();

        setAccess(
          nextAccess,
        );

        if (
          !nextAccess
        ) {
          setTransactions(
            [],
          );

          return [];
        }

        const next =
          await listPartnerTransactions(
            nextAccess.businessId,
          );

        setTransactions(
          next,
        );

        return next;
      },
      [],
    );

  useEffect(
    () => {
      void loadTransactions()
        .catch(
          (
            error,
          ) => {
            console.warn(
              '[Melo Partner] Unable to prepare customer detail popup:',
              error,
            );
          },
        );
    },
    [
      loadTransactions,
    ],
  );

  const loadRawDetail =
    useCallback(
      async (
        transaction:
          PartnerTransaction,
      ) => {
        if (
          !access
        ) {
          return null;
        }

        let candidates:
          Row[] =
          [];

        if (
          transaction.kind ===
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
                      access.businessId,
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
          transaction.kind ===
          'order'
        ) {
          const result =
            await rpcRequest<
              Row[]
            >(
              'get_partner_service_orders',
              {
                p_business_id:
                  access.businessId,
              },
            );

          candidates =
            rows(
              result.data,
            );
        } else {
          const result =
            await rpcRequest<
              Row[]
            >(
              'get_my_business_coupon_claims',
            );

          candidates =
            rows(
              result.data,
            );
        }

        return (
          candidates.find(
            (
              row,
            ) => {
              const rawId =
                text(
                  row,
                  'id',
                  'booking_id',
                  'order_id',
                  'claim_id',
                  'coupon_claim_id',
                );

              if (
                rawId &&
                rawId ===
                  transaction.id
              ) {
                return true;
              }

              const rawReference =
                text(
                  row,
                  'reference_code',
                  'booking_code',
                  'order_code',
                  'claim_code',
                  'coupon_code',
                  'transaction_code',
                  'code',
                );

              return Boolean(
                rawReference &&
                normalizeReference(
                  rawReference,
                ) ===
                  normalizeReference(
                    transaction.referenceCode,
                  ),
              );
            },
          ) ||
          null
        );
      },
      [
        access,
      ],
    );

  const openTransaction =
    useCallback(
      async (
        transaction:
          PartnerTransaction,
      ) => {
        setSelected(
          {
            transaction,
            raw:
              null,
          },
        );

        setDetailLoading(
          true,
        );

        try {
          const raw =
            await loadRawDetail(
              transaction,
            );

          setSelected(
            (
              current,
            ) =>
              current?.transaction.id ===
              transaction.id
                ? {
                    transaction,
                    raw,
                  }
                : current,
          );
        } catch (
          error
        ) {
          console.warn(
            '[Melo Partner] Unable to load transaction detail:',
            error,
          );
        } finally {
          setDetailLoading(
            false,
          );
        }
      },
      [
        loadRawDetail,
      ],
    );

  useEffect(
    () => {
      const handleClick =
        (
          event:
            MouseEvent,
        ) => {
          const target =
            event.target;

          if (
            !(
              target instanceof
              HTMLElement
            )
          ) {
            return;
          }

          const button =
            target.closest(
              'button',
            ) as
              | HTMLButtonElement
              | null;

          if (
            !button
          ) {
            return;
          }

          const className =
            String(
              button.className ||
              '',
            );

          if (
            !className.includes(
              'customerDetailsButton',
            )
          ) {
            return;
          }

          const article =
            button.closest(
              'article',
            );

          if (
            !article
          ) {
            return;
          }

          /*
           * Stop the old inline expansion handler.
           * The detail button now opens the web popup instead.
           */
          event.preventDefault();
          event.stopPropagation();

          const code =
            article.querySelector(
              'code',
            )
              ?.textContent ||
            '';

          const reference =
            normalizeReference(
              code,
            );

          let transaction =
            transactions.find(
              (
                item,
              ) =>
                normalizeReference(
                  item.referenceCode,
                ) ===
                reference,
            );

          if (
            !transaction
          ) {
            const customerName =
              article.querySelector(
                'a[class*="customerNameLink"], strong[class*="customerNameLink"]',
              )
                ?.textContent
                ?.trim() ||
              '';

            const title =
              article.querySelector(
                'div[class*="customerItemCell"] strong',
              )
                ?.textContent
                ?.trim() ||
              '';

            transaction =
              transactions.find(
                (
                  item,
                ) =>
                  (
                    !customerName ||
                    item.customerName ===
                      customerName
                  ) &&
                  (
                    !title ||
                    item.title ===
                      title
                  ),
              );
          }

          if (
            transaction
          ) {
            void openTransaction(
              transaction,
            );

            return;
          }

          /*
           * If the page refreshed before this controller,
           * reload once and match again.
           */
          void loadTransactions()
            .then(
              (
                fresh,
              ) => {
                const found =
                  fresh.find(
                    (
                      item,
                    ) =>
                      normalizeReference(
                        item.referenceCode,
                      ) ===
                      reference,
                  );

                if (
                  found
                ) {
                  void openTransaction(
                    found,
                  );
                }
              },
            )
            .catch(
              () => undefined,
            );
        };

      document.addEventListener(
        'click',
        handleClick,
        true,
      );

      return () => {
        document.removeEventListener(
          'click',
          handleClick,
          true,
        );
      };
    },
    [
      transactions,
      loadTransactions,
      openTransaction,
    ],
  );

  useEffect(
    () => {
      if (
        !selected
      ) {
        return;
      }

      const oldOverflow =
        document
          .body
          .style
          .overflow;

      document
        .body
        .style
        .overflow =
        'hidden';

      const handleKey =
        (
          event:
            KeyboardEvent,
        ) => {
          if (
            event.key ===
            'Escape'
          ) {
            setSelected(
              null,
            );
          }
        };

      window.addEventListener(
        'keydown',
        handleKey,
      );

      return () => {
        document
          .body
          .style
          .overflow =
          oldOverflow;

        window.removeEventListener(
          'keydown',
          handleKey,
        );
      };
    },
    [
      selected,
    ],
  );

  const customerHistory =
    useMemo(
      () => {
        if (
          !selected
        ) {
          return [];
        }

        const result =
          new Map<
            string,
            PartnerTransaction
          >();

        for (
          const item of
          transactions
        ) {
          if (
            sameCustomer(
              selected.transaction,
              item,
            )
          ) {
            result.set(
              `${item.kind}:${item.id}`,
              item,
            );
          }
        }

        return [
          ...result.values(),
        ];
      },
      [
        selected,
        transactions,
      ],
    );

  const customerTotal =
    useMemo(
      () =>
        customerHistory.reduce(
          (
            total,
            item,
          ) =>
            total +
            (
              item.amount ??
              0
            ),
          0,
        ),
      [
        customerHistory,
      ],
    );

  const transaction =
    selected?.transaction ||
    null;

  const raw =
    selected?.raw ||
    null;

  const details =
    text(
      raw,
      'notes',
      'details',
      'description',
      'service_description',
      'offer_notes',
      'order_notes',
      'coupon_details',
      'terms_text',
      'includes_text',
    );

  const rawServiceDate =
    text(
      raw,
      'booking_date',
      'service_date',
      'scheduled_date',
      'redeem_date',
      'reservation_date',
    );

  const rawServiceTime =
    text(
      raw,
      'booking_time',
      'service_time',
      'scheduled_time',
      'reservation_time',
    );

  const paymentStatus =
    text(
      raw,
      'payment_status',
      'payment_state',
      'order_payment_status',
      'charge_status',
    );

  const usageStatus =
    text(
      raw,
      'usage_status',
      'redemption_status',
      'redeem_status',
      'service_usage_status',
    );

  const redeemedAt =
    text(
      raw,
      'redeemed_at',
      'used_at',
      'fulfilled_at',
      'served_at',
      'consumed_at',
    );

  const rawGuests =
    numberValue(
      raw,
      'guest_count',
      'party_size',
      'people_count',
    );

  const rawQuantity =
    numberValue(
      raw,
      'quantity',
      'item_count',
      'qty',
    );

  const createdAt =
    transaction
      ? (
          text(
            raw,
            'created_at',
            'requested_at',
            'claimed_at',
            'ordered_at',
            'booked_at',
          ) ||
          transaction.createdAt
        )
      : '';

  const serviceSchedule =
    transaction
      ? (
          rawServiceDate
            ? [
                rawServiceDate,
                rawServiceTime,
              ]
                .filter(
                  Boolean,
                )
                .join(
                  ' · ',
                )
            : formatDate(
                transaction.scheduledAt ||
                  transaction.createdAt,
                locale,
              )
        )
      : '—';

  const transactionGroup =
    transaction
      ? statusGroup(
          usageStatus ||
          transaction.status,
        )
      : 'pending';

  const paymentNormalized =
    paymentStatus
      .trim()
      .toLowerCase();

  const paid =
    [
      'paid',
      'completed',
      'succeeded',
      'success',
    ].includes(
      paymentNormalized,
    );

  const redemptionState =
    transactionGroup ===
    'used'
      ? 'used'
      : transactionGroup ===
          'waiting' ||
        paid
        ? 'waiting'
        : transactionGroup ===
          'pending'
          ? 'pending'
          : 'other';

  function transactionKindLabel() {
    if (
      !transaction
    ) {
      return '—';
    }

    if (
      transaction.kind ===
      'booking'
    ) {
      return copy.booking;
    }

    if (
      transaction.kind ===
      'order'
    ) {
      return copy.order;
    }

    return copy.coupon;
  }

  function transactionStatusLabel() {
    if (
      !transaction
    ) {
      return '—';
    }

    const group =
      statusGroup(
        transaction.status,
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
      transaction.status ||
      copy.unavailable
    );
  }

  function paymentLabel() {
    if (
      [
        'paid',
        'success',
        'succeeded',
        'completed',
      ].includes(
        paymentNormalized,
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
        paymentNormalized,
      )
    ) {
      return copy.awaitingPayment;
    }

    if (
      [
        'refund',
        'refunded',
      ].includes(
        paymentNormalized,
      )
    ) {
      return copy.refunded;
    }

    if (
      paymentStatus
    ) {
      return paymentStatus;
    }

    return transactionStatusLabel();
  }

  function redemptionTitle() {
    if (
      redemptionState ===
      'used'
    ) {
      return copy.redeemed;
    }

    if (
      redemptionState ===
      'waiting'
    ) {
      return copy.readyForRedemption;
    }

    if (
      redemptionState ===
      'pending'
    ) {
      return copy.pendingRedemption;
    }

    return copy.unavailableRedemption;
  }

  function redemptionHint() {
    if (
      redemptionState ===
      'used'
    ) {
      return redeemedAt
        ? `${copy.redeemedHint} · ${formatDate(
            redeemedAt,
            locale,
          )}`
        : copy.redeemedHint;
    }

    if (
      redemptionState ===
      'waiting'
    ) {
      return copy.readyForRedemptionHint;
    }

    if (
      redemptionState ===
      'pending'
    ) {
      return copy.pendingRedemptionHint;
    }

    return copy.unavailableRedemptionHint;
  }

  const profileHref =
    transaction
      ?.customerUserId
      ? `/users/${transaction.customerUserId}`
      : '';

  const quantity =
    transaction
      ? (
          transaction.kind ===
          'booking'
            ? (
                transaction.guestCount ??
                rawGuests ??
                1
              )
            : (
                rawQuantity ??
                transaction.guestCount ??
                1
              )
        )
      : 1;

  return (
    <>
      <PartnerWorkspaceExperience
        section="customers"
      />

      {transaction ? (
        <div
          className="meloPartnerCustomerModalBackdrop"
          onMouseDown={(
            event,
          ) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              setSelected(
                null,
              );
            }
          }}
        >
          <section
            className="meloPartnerCustomerModal"
            role="dialog"
            aria-modal="true"
            aria-label={
              copy.eyebrow
            }
          >
            <header className="meloPartnerCustomerModalHeader">
              <div>
                <small>
                  {
                    copy.eyebrow
                  }
                </small>

                <h2>
                  {
                    transaction.title
                  }
                </h2>

                <code>
                  {displayReference(
                    transaction.referenceCode,
                  )}
                </code>
              </div>

              <button
                type="button"
                aria-label={
                  copy.close
                }
                onClick={() =>
                  setSelected(
                    null,
                  )
                }
              >
                ×
              </button>
            </header>

            <div className="meloPartnerCustomerModalBody">
              {detailLoading ? (
                <div className="meloPartnerCustomerLoading">
                  {
                    copy.loading
                  }
                </div>
              ) : null}

              <section className="meloPartnerCustomerSection">
                <h3>
                  {
                    copy.customer
                  }
                </h3>

                <div className="meloPartnerCustomerProfile">
                  {profileHref ? (
                    <Link
                      href={
                        profileHref
                      }
                    >
                      <VerifiedUserAvatar
                        userId={
                          transaction.customerUserId
                        }
                        name={
                          transaction.customerName
                        }
                        src={
                          transaction.customerPhotoUrl
                        }
                        country={
                          transaction.customerCountry
                        }
                        nationality={
                          transaction.customerNationality
                        }
                        size={
                          66
                        }
                        badgeSize={
                          18
                        }
                        alt={
                          transaction.customerName
                        }
                      />
                    </Link>
                  ) : (
                    <VerifiedUserAvatar
                      name={
                        transaction.customerName
                      }
                      src={
                        transaction.customerPhotoUrl
                      }
                      country={
                        transaction.customerCountry
                      }
                      nationality={
                        transaction.customerNationality
                      }
                      size={
                        66
                      }
                      badgeSize={
                        18
                      }
                      alt={
                        transaction.customerName
                      }
                    />
                  )}

                  <div className="meloPartnerCustomerProfileCopy">
                    {profileHref ? (
                      <Link
                        href={
                          profileHref
                        }
                      >
                        {
                          transaction.customerName
                        }
                      </Link>
                    ) : (
                      <strong>
                        {
                          transaction.customerName
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
                        copy.transactionsWithStore
                      }
                    </span>

                    <small>
                      {
                        copy.totalWithStore
                      }{' '}
                      <b>
                        {formatMoney(
                          customerTotal,
                          transaction.currency,
                          locale,
                        )}
                      </b>
                    </small>
                  </div>

                  <span
                    className="meloPartnerCustomerStatus"
                    data-status={
                      transactionGroup
                    }
                  >
                    {
                      transactionStatusLabel()
                    }
                  </span>
                </div>
              </section>

              <div className="meloPartnerCustomerColumns">
                <section className="meloPartnerCustomerSection">
                  <h3>
                    {
                      copy.productSection
                    }
                  </h3>

                  <div className="meloPartnerCustomerCard">
                    <DetailRow
                      label={
                        copy.type
                      }
                    >
                      {
                        transactionKindLabel()
                      }
                    </DetailRow>

                    <DetailRow
                      label={
                        copy.item
                      }
                    >
                      {
                        transaction.title
                      }
                    </DetailRow>

                    <DetailRow
                      label={
                        copy.serviceDate
                      }
                    >
                      {
                        serviceSchedule
                      }
                    </DetailRow>

                    <DetailRow
                      label={
                        copy.quantity
                      }
                    >
                      {quantity}{' '}
                      {transaction.kind ===
                      'booking'
                        ? copy.people
                        : copy.units}
                    </DetailRow>

                    <DetailRow
                      label={
                        copy.details
                      }
                      multiline
                    >
                      {
                        details ||
                        copy.noDetails
                      }
                    </DetailRow>
                  </div>
                </section>

                <section className="meloPartnerCustomerSection">
                  <h3>
                    {
                      copy.paymentSection
                    }
                  </h3>

                  <div className="meloPartnerCustomerCard">
                    <DetailRow
                      label={
                        copy.customerAmount
                      }
                    >
                      <b className="meloPartnerCustomerMoney">
                        {formatMoney(
                          transaction.amount,
                          transaction.currency,
                          locale,
                        )}
                      </b>
                    </DetailRow>

                    <DetailRow
                      label={
                        copy.paymentStatus
                      }
                    >
                      {
                        paymentLabel()
                      }
                    </DetailRow>

                    <DetailRow
                      label={
                        copy.createdAt
                      }
                    >
                      {formatDate(
                        createdAt,
                        locale,
                      )}
                    </DetailRow>
                  </div>
                </section>
              </div>

              <section className="meloPartnerCustomerSection">
                <h3>
                  {
                    copy.redemptionSection
                  }
                </h3>

                <div
                  className="meloPartnerCustomerUsage"
                  data-state={
                    redemptionState
                  }
                >
                  <span>
                    {redemptionState ===
                    'used'
                      ? '✓'
                      : '▣'}
                  </span>

                  <div>
                    <strong>
                      {
                        redemptionTitle()
                      }
                    </strong>

                    <p>
                      {
                        redemptionHint()
                      }
                    </p>
                  </div>
                </div>
              </section>

              <button
                type="button"
                className="meloPartnerCustomerBottomClose"
                onClick={() =>
                  setSelected(
                    null,
                  )
                }
              >
                {
                  copy.close
                }
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <style jsx global>{`
        .meloPartnerCustomerModalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(4, 12, 22, 0.62);
          backdrop-filter: blur(9px);
        }

        .meloPartnerCustomerModal {
          width: min(920px, 100%);
          max-height: calc(100vh - 48px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 27px;
          background: var(--surface);
          color: var(--text);
          box-shadow:
            0 32px 100px
            rgba(0, 0, 0, 0.34);
        }

        .meloPartnerCustomerModalHeader {
          position: relative;
          flex: 0 0 auto;
          min-height: 104px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding:
            22px
            76px
            20px
            25px;
          border-bottom: 1px solid var(--border);
          background:
            color-mix(
              in srgb,
              var(--surface) 93%,
              var(--primary-soft)
            );
        }

        .meloPartnerCustomerModalHeader small {
          display: block;
          color: var(--primary);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .meloPartnerCustomerModalHeader h2 {
          max-width: 730px;
          margin: 7px 0 5px;
          color: var(--text);
          font-size: 23px;
          line-height: 1.28;
          letter-spacing: -0.025em;
          overflow-wrap: anywhere;
        }

        .meloPartnerCustomerModalHeader code {
          display: block;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 9px;
          font-weight: 800;
        }

        .meloPartnerCustomerModalHeader > button {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 41px;
          height: 41px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface-2);
          color: var(--text);
          font: inherit;
          font-size: 23px;
          cursor: pointer;
        }

        .meloPartnerCustomerModalHeader > button:hover {
          border-color:
            color-mix(
              in srgb,
              var(--primary) 42%,
              var(--border)
            );
          background: var(--primary-soft);
          color: var(--primary);
        }

        .meloPartnerCustomerModalBody {
          min-height: 0;
          display: grid;
          gap: 20px;
          overflow-y: auto;
          padding: 20px 24px 24px;
        }

        .meloPartnerCustomerLoading {
          margin-bottom: -7px;
          color: var(--primary);
          font-size: 9px;
          font-weight: 850;
        }

        .meloPartnerCustomerSection {
          min-width: 0;
        }

        .meloPartnerCustomerSection > h3 {
          margin: 0 0 9px;
          color: var(--text);
          font-size: 14px;
          font-weight: 950;
        }

        .meloPartnerCustomerProfile {
          display: grid;
          grid-template-columns:
            66px
            minmax(0, 1fr)
            auto;
          gap: 14px;
          align-items: center;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface-2);
        }

        .meloPartnerCustomerProfile > a {
          line-height: 0;
        }

        .meloPartnerCustomerProfileCopy {
          min-width: 0;
        }

        .meloPartnerCustomerProfileCopy > a,
        .meloPartnerCustomerProfileCopy > strong {
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

        .meloPartnerCustomerProfileCopy > a:hover {
          color: var(--primary);
        }

        .meloPartnerCustomerProfileCopy > span {
          display: block;
          margin-top: 4px;
          color: var(--text-secondary);
          font-size: 8.5px;
          line-height: 1.55;
        }

        .meloPartnerCustomerProfileCopy > small {
          display: block;
          margin-top: 4px;
          color: var(--text-secondary);
          font-size: 8.5px;
        }

        .meloPartnerCustomerProfileCopy > small b {
          color: var(--text);
          font-size: 9px;
        }

        .meloPartnerCustomerStatus {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 11px;
          border-radius: 999px;
          background: var(--surface);
          color: var(--text-secondary);
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
        }

        .meloPartnerCustomerStatus[data-status='pending'] {
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

        .meloPartnerCustomerStatus[data-status='waiting'] {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .meloPartnerCustomerStatus[data-status='used'] {
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

        .meloPartnerCustomerColumns {
          display: grid;
          grid-template-columns:
            minmax(0, 1.25fr)
            minmax(280px, 0.75fr);
          gap: 15px;
          align-items: start;
        }

        .meloPartnerCustomerCard {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface-2);
        }

        .meloPartnerCustomerDetailRow {
          display: grid;
          grid-template-columns:
            minmax(115px, 0.42fr)
            minmax(0, 1fr);
          gap: 17px;
          align-items: start;
          padding: 13px 15px;
          border-top: 1px solid var(--border);
        }

        .meloPartnerCustomerDetailRow:first-child {
          border-top: 0;
        }

        .meloPartnerCustomerDetailRow > span {
          color: var(--text-secondary);
          font-size: 8px;
          font-weight: 800;
        }

        .meloPartnerCustomerDetailRow > strong {
          min-width: 0;
          color: var(--text);
          font-size: 9.5px;
          line-height: 1.55;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .meloPartnerCustomerDetailRowMulti {
          grid-template-columns: 1fr;
          gap: 7px;
        }

        .meloPartnerCustomerDetailRowMulti > strong {
          white-space: pre-wrap;
          text-align: left;
          line-height: 1.72;
        }

        .meloPartnerCustomerMoney {
          color: var(--primary);
          font-size: 14px;
        }

        .meloPartnerCustomerUsage {
          display: grid;
          grid-template-columns:
            48px
            minmax(0, 1fr);
          gap: 13px;
          align-items: center;
          padding: 15px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--primary) 34%,
              var(--border)
            );
          border-radius: 20px;
          background:
            color-mix(
              in srgb,
              var(--primary-soft) 70%,
              var(--surface)
            );
        }

        .meloPartnerCustomerUsage > span {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: var(--primary-soft);
          color: var(--primary);
          font-size: 18px;
          font-weight: 950;
        }

        .meloPartnerCustomerUsage strong {
          display: block;
          color: var(--text);
          font-size: 11px;
        }

        .meloPartnerCustomerUsage p {
          margin: 4px 0 0;
          color: var(--text-secondary);
          font-size: 8.5px;
          line-height: 1.6;
        }

        .meloPartnerCustomerUsage[data-state='used'] {
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

        .meloPartnerCustomerUsage[data-state='used'] > span {
          background:
            color-mix(
              in srgb,
              #26a269 14%,
              var(--surface)
            );
          color: #269765;
        }

        .meloPartnerCustomerUsage[data-state='pending'] {
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

        .meloPartnerCustomerUsage[data-state='pending'] > span {
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

        .meloPartnerCustomerUsage[data-state='other'] {
          border-color: var(--border);
          background: var(--surface-2);
        }

        .meloPartnerCustomerUsage[data-state='other'] > span {
          background: var(--surface-3);
          color: var(--text-secondary);
        }

        .meloPartnerCustomerBottomClose {
          width: 100%;
          min-height: 45px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface-2);
          color: var(--text);
          font: inherit;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .meloPartnerCustomerBottomClose:hover {
          border-color:
            color-mix(
              in srgb,
              var(--primary) 40%,
              var(--border)
            );
          background: var(--primary-soft);
          color: var(--primary);
        }

        @media (max-width: 760px) {
          .meloPartnerCustomerModalBackdrop {
            padding: 12px;
          }

          .meloPartnerCustomerModal {
            max-height:
              calc(
                100vh - 24px
              );
            border-radius: 22px;
          }

          .meloPartnerCustomerModalHeader {
            min-height: 92px;
            padding:
              19px
              64px
              17px
              18px;
          }

          .meloPartnerCustomerModalHeader h2 {
            font-size: 19px;
          }

          .meloPartnerCustomerModalBody {
            padding:
              16px
              16px
              18px;
          }

          .meloPartnerCustomerColumns {
            grid-template-columns: 1fr;
          }

          .meloPartnerCustomerProfile {
            grid-template-columns:
              58px
              minmax(0, 1fr);
          }

          .meloPartnerCustomerStatus {
            grid-column: 2;
            justify-self: start;
          }

          .meloPartnerCustomerDetailRow {
            grid-template-columns:
              minmax(90px, 0.4fr)
              minmax(0, 1fr);
          }
        }

        @media (max-width: 480px) {
          .meloPartnerCustomerModalBackdrop {
            padding: 0;
            place-items: end center;
          }

          .meloPartnerCustomerModal {
            width: 100%;
            max-height: 94vh;
            border-right: 0;
            border-bottom: 0;
            border-left: 0;
            border-radius:
              25px
              25px
              0
              0;
          }

          .meloPartnerCustomerDetailRow {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .meloPartnerCustomerDetailRow > strong {
            text-align: left;
          }
        }
      `}</style>
    </>
  );
}
'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useLocale } from '@/components/SiteProviders';

import PartnerModeHeader from './PartnerModeHeader';

import {
  getActivePartnerBusiness,
  getPartnerDashboardSummary,
  getPartnerWallet,
  hasPartnerPermission,
  type PartnerBusinessAccess,
  type PartnerDashboardSummary,
  type PartnerWalletSummary,
} from './partnerModeWeb';

import baseStyles from './PartnerMode.module.css';
import styles from './PartnerFinanceExperience.module.css';

const EMPTY_SUMMARY: PartnerDashboardSummary = {
  serviceCount: 0,
  pendingBookings: 0,
  activeCoupons: 0,
  paidOrders: 0,
  grossSales: 0,
  averageRating: 0,
  reviewCount: 0,
};

const EMPTY_WALLET: PartnerWalletSummary = {
  availableBalance: 0,
  pendingBalance: 0,
  lifetimeGross: 0,
  withdrawnTotal: 0,
  currency: 'THB',
};

const COPY = {
  th: {
    eyebrow: 'MELO PARTNER',
    title: 'การเงินร้านค้า',
    subtitle:
      'ภาพรวมยอดเงิน รายได้ และรายการสำคัญของร้าน จากข้อมูล Partner ของร้านนี้',

    refresh: 'รีเฟรชข้อมูล',

    available: 'ยอดพร้อมถอน',
    availableHint:
      'ยอดที่ระบบรายงานว่าสามารถนำไปดำเนินการตาม Flow การถอนเงินของ Partner ได้',

    pendingMoney: 'เงินรอดำเนินการ',
    pendingMoneyHint:
      'ยอดที่ยังอยู่ระหว่างขั้นตอนของระบบ',

    withdrawn: 'ถอนสำเร็จสะสม',
    withdrawnHint:
      'ยอดเงินที่ระบบบันทึกว่าถอนออกแล้ว',

    revenueSection: 'ภาพรวมรายได้',

    grossSales: 'ยอดขายรวม',
    grossSalesHint:
      'ยอดขายที่ Partner Dashboard รายงาน',

    lifetime: 'รายได้สะสม',
    lifetimeHint:
      'รายได้สะสมสูงสุดที่ระบบมีอยู่',

    storeActivity: 'กิจกรรมร้านค้า',

    paidOrders: 'ออเดอร์ชำระแล้ว',
    pendingBookings: 'รายการรอดำเนินการ',
    activeCoupons: 'คูปองใช้งาน',
    serviceCount: 'สินค้า / บริการ',

    walletSource: 'Partner Wallet',
    dashboardSource: 'Partner Dashboard',

    loading: 'กำลังโหลดข้อมูลการเงิน...',
    noBusiness: 'ไม่พบบัญชี Partner ที่กำลังใช้งาน',
    noAccess: 'ไม่มีสิทธิ์ใช้งานส่วนการเงินของร้านนี้',
    error: 'โหลดข้อมูลการเงินไม่สำเร็จ',
  },

  en: {
    eyebrow: 'MELO PARTNER',
    title: 'Store finance',
    subtitle:
      'A clear overview of balances, revenue and key activity for this Partner business.',

    refresh: 'Refresh data',

    available: 'Available balance',
    availableHint:
      'Balance currently reported as available for the Partner payout flow.',

    pendingMoney: 'Pending funds',
    pendingMoneyHint:
      'Funds that are still being processed by the system.',

    withdrawn: 'Total withdrawn',
    withdrawnHint:
      'Amount currently recorded as withdrawn.',

    revenueSection: 'Revenue overview',

    grossSales: 'Gross sales',
    grossSalesHint:
      'Gross sales reported by the Partner Dashboard.',

    lifetime: 'Lifetime revenue',
    lifetimeHint:
      'Highest cumulative revenue currently available.',

    storeActivity: 'Store activity',

    paidOrders: 'Paid orders',
    pendingBookings: 'Pending items',
    activeCoupons: 'Active coupons',
    serviceCount: 'Products / services',

    walletSource: 'Partner Wallet',
    dashboardSource: 'Partner Dashboard',

    loading: 'Loading finance data...',
    noBusiness: 'No active Partner business was found.',
    noAccess:
      'You do not have access to this store’s finance section.',
    error: 'Unable to load finance data.',
  },

  de: {
    eyebrow: 'MELO PARTNER',
    title: 'Store-Finanzen',
    subtitle:
      'Übersicht über Guthaben, Umsätze und wichtige Store-Aktivitäten dieses Partner-Stores.',

    refresh: 'Aktualisieren',

    available: 'Verfügbarer Betrag',
    availableHint:
      'Aktuell für den Partner-Auszahlungsprozess verfügbarer Betrag.',

    pendingMoney: 'Ausstehende Beträge',
    pendingMoneyHint:
      'Beträge, die noch vom System verarbeitet werden.',

    withdrawn: 'Ausgezahlt gesamt',
    withdrawnHint:
      'Betrag, der bereits als ausgezahlt erfasst wurde.',

    revenueSection: 'Umsatzübersicht',

    grossSales: 'Bruttoumsatz',
    grossSalesHint:
      'Vom Partner Dashboard gemeldeter Bruttoumsatz.',

    lifetime: 'Kumulierter Umsatz',
    lifetimeHint:
      'Höchster aktuell verfügbarer kumulierter Umsatz.',

    storeActivity: 'Store-Aktivität',

    paidOrders: 'Bezahlte Bestellungen',
    pendingBookings: 'Offene Vorgänge',
    activeCoupons: 'Aktive Coupons',
    serviceCount: 'Produkte / Services',

    walletSource: 'Partner Wallet',
    dashboardSource: 'Partner Dashboard',

    loading: 'Finanzdaten werden geladen...',
    noBusiness: 'Kein aktiver Partner-Store gefunden.',
    noAccess:
      'Keine Berechtigung für den Finanzbereich dieses Stores.',
    error: 'Finanzdaten konnten nicht geladen werden.',
  },

  zh: {
    eyebrow: 'MELO PARTNER',
    title: '店铺财务',
    subtitle:
      '查看此 Partner 店铺的余额、收入与重要业务数据。',

    refresh: '刷新数据',

    available: '可提现余额',
    availableHint:
      '当前系统报告可进入 Partner 提现流程的余额。',

    pendingMoney: '待处理金额',
    pendingMoneyHint:
      '仍在系统流程中处理的金额。',

    withdrawn: '累计已提现',
    withdrawnHint:
      '系统已记录为提现完成的金额。',

    revenueSection: '收入概览',

    grossSales: '总销售额',
    grossSalesHint:
      'Partner Dashboard 当前报告的总销售额。',

    lifetime: '累计收入',
    lifetimeHint:
      '系统当前可用的最高累计收入。',

    storeActivity: '店铺活动',

    paidOrders: '已付款订单',
    pendingBookings: '待处理项目',
    activeCoupons: '有效优惠券',
    serviceCount: '商品 / 服务',

    walletSource: 'Partner Wallet',
    dashboardSource: 'Partner Dashboard',

    loading: '正在加载财务数据...',
    noBusiness: '未找到当前 Partner 店铺。',
    noAccess: '你没有此店铺财务部分的权限。',
    error: '无法加载财务数据。',
  },

  ja: {
    eyebrow: 'MELO PARTNER',
    title: '店舗の財務',
    subtitle:
      'この Partner 店舗の残高、収益、主要な店舗アクティビティを確認できます。',

    refresh: '更新',

    available: '出金可能残高',
    availableHint:
      'Partner の出金フローで現在利用可能と報告されている残高です。',

    pendingMoney: '保留中の金額',
    pendingMoneyHint:
      'システムでまだ処理中の金額です。',

    withdrawn: '累計出金額',
    withdrawnHint:
      '出金済みとして記録されている金額です。',

    revenueSection: '収益概要',

    grossSales: '総売上',
    grossSalesHint:
      'Partner Dashboard が報告する総売上です。',

    lifetime: '累計収益',
    lifetimeHint:
      'システムにある最も高い累計収益です。',

    storeActivity: '店舗アクティビティ',

    paidOrders: '支払い済み注文',
    pendingBookings: '保留中の項目',
    activeCoupons: '有効なクーポン',
    serviceCount: '商品・サービス',

    walletSource: 'Partner Wallet',
    dashboardSource: 'Partner Dashboard',

    loading: '財務データを読み込み中...',
    noBusiness: '有効な Partner 店舗が見つかりません。',
    noAccess:
      'この店舗の財務セクションを利用する権限がありません。',
    error: '財務データを読み込めません。',
  },

  ko: {
    eyebrow: 'MELO PARTNER',
    title: '매장 재무',
    subtitle:
      '이 Partner 매장의 잔액, 수익 및 주요 매장 활동을 한눈에 확인합니다.',

    refresh: '새로고침',

    available: '출금 가능 잔액',
    availableHint:
      'Partner 출금 흐름에서 현재 사용할 수 있다고 보고된 잔액입니다.',

    pendingMoney: '대기 금액',
    pendingMoneyHint:
      '시스템에서 아직 처리 중인 금액입니다.',

    withdrawn: '누적 출금액',
    withdrawnHint:
      '출금 완료로 기록된 금액입니다.',

    revenueSection: '수익 개요',

    grossSales: '총매출',
    grossSalesHint:
      'Partner Dashboard가 보고하는 총매출입니다.',

    lifetime: '누적 수익',
    lifetimeHint:
      '시스템에 있는 가장 높은 누적 수익입니다.',

    storeActivity: '매장 활동',

    paidOrders: '결제 완료 주문',
    pendingBookings: '대기 항목',
    activeCoupons: '활성 쿠폰',
    serviceCount: '상품 / 서비스',

    walletSource: 'Partner Wallet',
    dashboardSource: 'Partner Dashboard',

    loading: '재무 데이터를 불러오는 중...',
    noBusiness: '활성 Partner 매장을 찾을 수 없습니다.',
    noAccess:
      '이 매장의 재무 섹션에 접근할 권한이 없습니다.',
    error: '재무 데이터를 불러올 수 없습니다.',
  },
} as const;

function formatMoney(
  value: number,
  currency: string,
) {
  const code =
    (
      currency ||
      'THB'
    )
      .trim()
      .toUpperCase();

  const amount =
    Number(
      value ||
        0,
    ).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    );

  return `${code} ${amount}`;
}

export default function PartnerFinanceExperience() {
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
    wallet,
    setWallet,
  ] =
    useState<
      PartnerWalletSummary
    >(
      EMPTY_WALLET,
    );

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
            !nextAccess
          ) {
            setWallet(
              EMPTY_WALLET,
            );

            setSummary(
              EMPTY_SUMMARY,
            );

            return;
          }

          if (
            !hasPartnerPermission(
              nextAccess,
              'finance',
            )
          ) {
            setWallet(
              EMPTY_WALLET,
            );

            setSummary(
              EMPTY_SUMMARY,
            );

            return;
          }

          const [
            nextWallet,
            nextSummary,
          ] =
            await Promise.all(
              [
                getPartnerWallet(
                  nextAccess.businessId,
                ),

                getPartnerDashboardSummary(
                  nextAccess.businessId,
                ),
              ],
            );

          setWallet(
            nextWallet,
          );

          setSummary(
            nextSummary,
          );
        } catch (
          caught
        ) {
          setError(
            caught instanceof
              Error
              ? caught.message
              : String(
                  caught,
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

  const allowed =
    Boolean(
      access &&
        hasPartnerPermission(
          access,
          'finance',
        ),
    );

  const cumulativeRevenue =
    Math.max(
      wallet.lifetimeGross,
      summary.grossSales,
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
            styles.pageHeader
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

          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={() =>
              void load()
            }
            disabled={
              loading
            }
          >
            <span>
              ↻
            </span>

            {
              copy.refresh
            }
          </button>
        </header>

        {error ? (
          <div
            className={
              styles.error
            }
          >
            <strong>
              {
                copy.error
              }
            </strong>

            <span>
              {
                error
              }
            </span>
          </div>
        ) : null}

        {loading ? (
          <div
            className={
              styles.state
            }
          >
            <span
              className={
                styles.spinner
              }
            />

            <strong>
              {
                copy.loading
              }
            </strong>
          </div>
        ) : !access ? (
          <div
            className={
              styles.state
            }
          >
            <strong>
              {
                copy.noBusiness
              }
            </strong>
          </div>
        ) : !allowed ? (
          <div
            className={
              styles.state
            }
          >
            <strong>
              {
                copy.noAccess
              }
            </strong>
          </div>
        ) : (
          <div
            className={
              styles.workspace
            }
          >
            <section
              className={
                styles.balanceLayout
              }
            >
              <article
                className={
                  styles.heroCard
                }
              >
                <div
                  className={
                    styles.heroTop
                  }
                >
                  <div>
                    <small>
                      {
                        copy.available
                      }
                    </small>

                    <strong>
                      {formatMoney(
                        wallet.availableBalance,
                        wallet.currency,
                      )}
                    </strong>
                  </div>

                  <span
                    className={
                      styles.sourceBadge
                    }
                  >
                    {
                      copy.walletSource
                    }
                  </span>
                </div>

                <p>
                  {
                    copy.availableHint
                  }
                </p>

                <div
                  className={
                    styles.heroStore
                  }
                >
                  <span>
                    ◈
                  </span>

                  <div>
                    <small>
                      {
                        copy.walletSource
                      }
                    </small>

                    <b>
                      {
                        access.displayName
                      }
                    </b>
                  </div>
                </div>
              </article>

              <div
                className={
                  styles.sideBalanceGrid
                }
              >
                <FinanceCompactCard
                  title={
                    copy.pendingMoney
                  }
                  value={formatMoney(
                    wallet.pendingBalance,
                    wallet.currency,
                  )}
                  description={
                    copy.pendingMoneyHint
                  }
                  marker="◷"
                />

                <FinanceCompactCard
                  title={
                    copy.withdrawn
                  }
                  value={formatMoney(
                    wallet.withdrawnTotal,
                    wallet.currency,
                  )}
                  description={
                    copy.withdrawnHint
                  }
                  marker="✓"
                />
              </div>
            </section>

            <section>
              <div
                className={
                  styles.sectionTitle
                }
              >
                <div>
                  <small>
                    {
                      copy.dashboardSource
                    }
                  </small>

                  <h2>
                    {
                      copy.revenueSection
                    }
                  </h2>
                </div>
              </div>

              <div
                className={
                  styles.revenueGrid
                }
              >
                <FinanceRevenueCard
                  title={
                    copy.grossSales
                  }
                  value={formatMoney(
                    summary.grossSales,
                    wallet.currency,
                  )}
                  description={
                    copy.grossSalesHint
                  }
                />

                <FinanceRevenueCard
                  title={
                    copy.lifetime
                  }
                  value={formatMoney(
                    cumulativeRevenue,
                    wallet.currency,
                  )}
                  description={
                    copy.lifetimeHint
                  }
                />
              </div>
            </section>

            <section>
              <div
                className={
                  styles.sectionTitle
                }
              >
                <div>
                  <small>
                    {
                      copy.dashboardSource
                    }
                  </small>

                  <h2>
                    {
                      copy.storeActivity
                    }
                  </h2>
                </div>
              </div>

              <div
                className={
                  styles.activityGrid
                }
              >
                <FinanceActivityCard
                  value={
                    summary.paidOrders
                  }
                  label={
                    copy.paidOrders
                  }
                  icon="✓"
                />

                <FinanceActivityCard
                  value={
                    summary.pendingBookings
                  }
                  label={
                    copy.pendingBookings
                  }
                  icon="◷"
                />

                <FinanceActivityCard
                  value={
                    summary.activeCoupons
                  }
                  label={
                    copy.activeCoupons
                  }
                  icon="◇"
                />

                <FinanceActivityCard
                  value={
                    summary.serviceCount
                  }
                  label={
                    copy.serviceCount
                  }
                  icon="▦"
                />
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function FinanceCompactCard({
  title,
  value,
  description,
  marker,
}: {
  title: string;
  value: string;
  description: string;
  marker: string;
}) {
  return (
    <article
      className={
        styles.compactCard
      }
    >
      <div
        className={
          styles.compactIcon
        }
      >
        {
          marker
        }
      </div>

      <div>
        <small>
          {
            title
          }
        </small>

        <strong>
          {
            value
          }
        </strong>

        <p>
          {
            description
          }
        </p>
      </div>
    </article>
  );
}

function FinanceRevenueCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article
      className={
        styles.revenueCard
      }
    >
      <small>
        {
          title
        }
      </small>

      <strong>
        {
          value
        }
      </strong>

      <p>
        {
          description
        }
      </p>
    </article>
  );
}

function FinanceActivityCard({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: string;
}) {
  return (
    <article
      className={
        styles.activityCard
      }
    >
      <span>
        {
          icon
        }
      </span>

      <div>
        <strong>
          {
            value
          }
        </strong>

        <small>
          {
            label
          }
        </small>
      </div>
    </article>
  );
}
'use client';

import Link from 'next/link';
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
  getPartnerRecentActivity,
  hasPartnerPermission,
  type PartnerActivityItem,
  type PartnerBusinessAccess,
  type PartnerDashboardSummary,
} from './partnerModeWeb';

import styles from './PartnerMode.module.css';
import dashboardStyles from './PartnerDashboardExperience.module.css';

const EMPTY: PartnerDashboardSummary = {
  serviceCount: 0,
  pendingBookings: 0,
  activeCoupons: 0,
  paidOrders: 0,
  grossSales: 0,
  averageRating: 0,
  reviewCount: 0,
};

const COPY = {
  th: {
    eyebrow: 'MELO PARTNER',
    hello: 'สวัสดี',
    body: 'ภาพรวมร้านค้า รายการลูกค้า และการดำเนินงานล่าสุด',

    services: 'บริการ',
    pending: 'จองรอยืนยัน',
    coupons: 'คูปอง',
    rating: 'คะแนน',

    manage: 'จัดการร้านค้า',
    manageHint:
      'เมนูจะแสดงตามสิทธิ์ของบัญชีที่คุณได้รับ',

    activity: 'กิจกรรมล่าสุด',
    activityHint:
      'รายการที่เกิดขึ้นในร้านค้าของคุณ',

    noAccess: 'ยังไม่มีสิทธิ์ร้านค้า',
    noAccessBody:
      'สร้างบัญชีธุรกิจหลังยืนยันบัญชี Melo หรือให้เจ้าของร้านเพิ่มอีเมลของคุณเป็น Admin/Staff',

    publicPartners: 'ดูพาร์ทเนอร์',
    createBusiness: 'สร้างบัญชีธุรกิจ',
    empty: 'ยังไม่มีกิจกรรมล่าสุด',

    customers: 'รายการลูกค้า',
    finance: 'การเงิน',
    analytics: 'สถิติร้านค้า',
    reports: 'รายงาน',
  },

  en: {
    eyebrow: 'MELO PARTNER',
    hello: 'Hello',
    body:
      'Store overview, customers and latest operations',

    services: 'Services',
    pending: 'Pending bookings',
    coupons: 'Coupons',
    rating: 'Rating',

    manage: 'Manage store',
    manageHint:
      'Menus are shown based on your Partner permissions',

    activity: 'Recent activity',
    activityHint:
      'Latest activity from your business',

    noAccess: 'No Partner store access',
    noAccessBody:
      'Create a business account after verification or ask an owner to add your Melo email as Admin/Staff.',

    publicPartners: 'Browse Partners',
    createBusiness: 'Create business account',
    empty: 'No recent activity yet',

    customers: 'Customers',
    finance: 'Finance',
    analytics: 'Store analytics',
    reports: 'Reports',
  },

  de: {
    eyebrow: 'MELO PARTNER',
    hello: 'Hallo',
    body:
      'Store-Übersicht, Kunden und letzte Vorgänge',

    services: 'Services',
    pending: 'Offene Buchungen',
    coupons: 'Coupons',
    rating: 'Bewertung',

    manage: 'Store verwalten',
    manageHint:
      'Menüs richten sich nach deinen Berechtigungen',

    activity: 'Letzte Aktivitäten',
    activityHint:
      'Aktivitäten deines Stores',

    noAccess: 'Kein Partner-Zugriff',
    noAccessBody:
      'Erstelle ein Geschäftskonto oder lass dich als Admin/Staff hinzufügen.',

    publicPartners: 'Partner ansehen',
    createBusiness: 'Geschäftskonto erstellen',
    empty: 'Noch keine Aktivitäten',

    customers: 'Kunden',
    finance: 'Finanzen',
    analytics: 'Store-Statistik',
    reports: 'Berichte',
  },

  zh: {
    eyebrow: 'MELO PARTNER',
    hello: '你好',
    body: '店铺概览、客户与最新运营',

    services: '服务',
    pending: '待确认预订',
    coupons: '优惠券',
    rating: '评分',

    manage: '管理店铺',
    manageHint:
      '菜单根据你的合作伙伴权限显示',

    activity: '最新动态',
    activityHint:
      '店铺最近发生的活动',

    noAccess: '暂无合作伙伴店铺权限',
    noAccessBody:
      '完成验证后创建商家账号，或让店主把你添加为管理员/员工。',

    publicPartners: '查看合作伙伴',
    createBusiness: '创建商家账号',
    empty: '暂无动态',

    customers: '客户',
    finance: '财务',
    analytics: '店铺统计',
    reports: '报告',
  },

  ja: {
    eyebrow: 'MELO PARTNER',
    hello: 'こんにちは',
    body:
      '店舗概要、顧客、最新オペレーション',

    services: 'サービス',
    pending: '承認待ち予約',
    coupons: 'クーポン',
    rating: '評価',

    manage: '店舗管理',
    manageHint:
      '権限に応じてメニューが表示されます',

    activity: '最近のアクティビティ',
    activityHint:
      '店舗で発生した最新情報',

    noAccess:
      'Partner店舗への権限がありません',

    noAccessBody:
      '認証後にビジネスアカウントを作成するか、OwnerにAdmin/Staffとして追加してもらってください。',

    publicPartners: 'Partnerを見る',
    createBusiness: 'ビジネスアカウント作成',
    empty:
      '最近のアクティビティはありません',

    customers: '顧客',
    finance: '財務',
    analytics: '店舗分析',
    reports: 'レポート',
  },

  ko: {
    eyebrow: 'MELO PARTNER',
    hello: '안녕하세요',
    body:
      '매장 개요, 고객 및 최근 운영 현황',

    services: '서비스',
    pending: '대기 예약',
    coupons: '쿠폰',
    rating: '평점',

    manage: '매장 관리',
    manageHint:
      '파트너 권한에 따라 메뉴가 표시됩니다',

    activity: '최근 활동',
    activityHint:
      '매장에서 발생한 최근 활동',

    noAccess:
      '파트너 매장 권한이 없습니다',

    noAccessBody:
      '인증 후 비즈니스 계정을 만들거나 Owner에게 Admin/Staff로 추가 요청하세요.',

    publicPartners: '파트너 보기',
    createBusiness: '비즈니스 계정 만들기',
    empty: '최근 활동이 없습니다',

    customers: '고객',
    finance: '재무',
    analytics: '매장 통계',
    reports: '보고서',
  },
} as const;

export default function PartnerDashboardExperience() {
  const {
    locale,
  } = useLocale();

  const t =
    COPY[
      locale as keyof typeof COPY
    ] ?? COPY.en;

  const [
    access,
    setAccess,
  ] =
    useState<
      PartnerBusinessAccess | null
    >(null);

  const [
    summary,
    setSummary,
  ] =
    useState<PartnerDashboardSummary>(
      EMPTY,
    );

  const [
    activity,
    setActivity,
  ] =
    useState<PartnerActivityItem[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError('');

        try {
          const nextAccess =
            await getActivePartnerBusiness();

          setAccess(
            nextAccess,
          );

          if (nextAccess) {
            const [
              nextSummary,
              nextActivity,
            ] =
              await Promise.all([
                getPartnerDashboardSummary(
                  nextAccess.businessId,
                ),

                getPartnerRecentActivity(
                  nextAccess.businessId,
                ),
              ]);

            setSummary(
              nextSummary,
            );

            setActivity(
              nextActivity.slice(
                0,
                12,
              ),
            );
          } else {
            setSummary(
              EMPTY,
            );

            setActivity(
              [],
            );
          }
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

  if (loading) {
    return (
      <main
        className={
          styles.partnerPage
        }
      >
        <div
          className={
            styles.loading
          }
        >
          Loading Partner Mode…
        </div>
      </main>
    );
  }

  /*
   * Dashboard shortcuts
   *
   * Removed from dashboard:
   * - Staff / admins
   * - Store profile
   * - Partner chat
   *
   * Those features can still exist in their normal
   * Partner routes / header navigation.
   */
  const menu = [
    [
      'services',
      '▤',
      t.services,
      '/partner/services',
    ],

    [
      'sales',
      '👤',
      t.customers,
      '/partner/customers',
    ],

    [
      'finance',
      '฿',
      t.finance,
      '/partner/finance',
    ],

    [
      'analytics',
      '↗',
      t.analytics,
      '/partner/analytics',
    ],

    [
      'reports',
      '≡',
      t.reports,
      '/partner/reports',
    ],
  ] as const;

  return (
    <main
      className={
        styles.partnerPage
      }
    >
      <PartnerModeHeader
        access={
          access
        }
        onBusinessChanged={() =>
          void load()
        }
      />

      <section
        className={`${styles.partnerShell} ${dashboardStyles.dashboard}`}
      >
        {error ? (
          <div
            className={
              styles.notice
            }
          >
            {
              error
            }
          </div>
        ) : null}

        {!access ? (
          <div
            className={
              styles.panel
            }
          >
            <div
              className={
                styles.empty
              }
            >
              <strong>
                {
                  t.noAccess
                }
              </strong>

              <p>
                {
                  t.noAccessBody
                }
              </p>

              <div
                className={
                  styles.toolbar
                }
                style={{
                  justifyContent:
                    'center',
                  marginTop: 12,
                }}
              >
                <Link
                  className={
                    styles.primaryButton
                  }
                  href="/partner/onboarding"
                  style={{
                    padding:
                      '10px 13px',
                    borderRadius:
                      12,
                  }}
                >
                  ＋{' '}
                  {
                    t.createBusiness
                  }
                </Link>

                <Link href="/partners">
                  {
                    t.publicPartners
                  }{' '}
                  →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <section
              className={`${styles.partnerHero} ${dashboardStyles.hero}`}
            >
              <div
                className={`${styles.partnerHeroTop} ${dashboardStyles.heroTop}`}
              >
                <div>
                  <small>
                    {
                      t.eyebrow
                    }
                  </small>

                  <h1>
                    {
                      t.hello
                    }
                    ,{' '}
                    {
                      access.displayName
                    }
                  </h1>

                  <p>
                    {
                      t.body
                    }
                  </p>
                </div>

                <span
                  className={`${styles.roleBadge} ${dashboardStyles.roleBadge}`}
                >
                  {access.role ===
                  'owner'
                    ? 'OWNER'
                    : access.role.toUpperCase()}
                </span>
              </div>

              <div
                className={`${styles.quickStats} ${dashboardStyles.quickStats}`}
              >
                <div
                  className={`${styles.quickStat} ${dashboardStyles.quickStat}`}
                >
                  <strong>
                    {
                      summary.serviceCount
                    }
                  </strong>

                  <span>
                    {
                      t.services
                    }
                  </span>
                </div>

                <div
                  className={`${styles.quickStat} ${dashboardStyles.quickStat}`}
                >
                  <strong>
                    {
                      summary.pendingBookings
                    }
                  </strong>

                  <span>
                    {
                      t.pending
                    }
                  </span>
                </div>

                <div
                  className={`${styles.quickStat} ${dashboardStyles.quickStat}`}
                >
                  <strong>
                    {
                      summary.activeCoupons
                    }
                  </strong>

                  <span>
                    {
                      t.coupons
                    }
                  </span>
                </div>

                <div
                  className={`${styles.quickStat} ${dashboardStyles.quickStat}`}
                >
                  <strong>
                    {summary.reviewCount
                      ? summary.averageRating.toFixed(
                          1,
                        )
                      : '-'}
                  </strong>

                  <span>
                    {
                      t.rating
                    }
                  </span>
                </div>
              </div>
            </section>

            <div
              className={`${styles.sectionHeader} ${dashboardStyles.sectionHeader}`}
            >
              <h2>
                {
                  t.manage
                }
              </h2>

              <p>
                {
                  t.manageHint
                }
              </p>
            </div>

            <div
              className={`${styles.manageGrid} ${dashboardStyles.manageGrid}`}
            >
              {menu
                .filter(
                  (
                    [
                      permission,
                    ],
                  ) =>
                    permission ===
                    'sales'
                      ? hasPartnerPermission(
                          access,
                          'sales',
                        ) ||
                        hasPartnerPermission(
                          access,
                          'bookings',
                        ) ||
                        hasPartnerPermission(
                          access,
                          'coupons',
                        )
                      : hasPartnerPermission(
                          access,
                          permission as any,
                        ),
                )
                .map(
                  (
                    [
                      permission,
                      icon,
                      label,
                      href,
                    ],
                  ) => (
                    <Link
                      className={`${styles.manageCard} ${dashboardStyles.manageCard}`}
                      href={
                        href
                      }
                      key={
                        permission
                      }
                    >
                      <span
                        className={`${styles.manageIcon} ${dashboardStyles.manageIcon}`}
                      >
                        {
                          icon
                        }
                      </span>

                      <strong>
                        {
                          label
                        }
                      </strong>
                    </Link>
                  ),
                )}
            </div>

            <div
              className={`${styles.sectionHeader} ${dashboardStyles.sectionHeader}`}
            >
              <h2>
                {
                  t.activity
                }
              </h2>

              <p>
                {
                  t.activityHint
                }
              </p>
            </div>

            <div
              className={`${styles.activityList} ${dashboardStyles.activityList}`}
            >
              {activity.length ? (
                activity.map(
                  (
                    item,
                  ) => (
                    <div
                      className={`${styles.activityRow} ${dashboardStyles.activityRow}`}
                      key={`${item.type}:${item.id}`}
                    >
                      <span
                        className={`${styles.activityMark} ${dashboardStyles.activityMark}`}
                      >
                        {item.type ===
                        'booking'
                          ? '⌁'
                          : item.type ===
                              'coupon'
                            ? '🎟'
                            : item.type ===
                                'review'
                              ? '★'
                              : '▤'}
                      </span>

                      <div
                        className={
                          dashboardStyles.activityCopy
                        }
                      >
                        <strong>
                          {item.title ||
                            item.type}
                        </strong>

                        <small>
                          {item.subtitle ||
                            item.status}
                        </small>
                      </div>

                      <em
                        className={
                          dashboardStyles.activityAmount
                        }
                      >
                        {item.amount !=
                        null
                          ? `${item.amount.toLocaleString()} ${item.currency}`
                          : ''}
                      </em>
                    </div>
                  ),
                )
              ) : (
                <div
                  className={`${styles.empty} ${dashboardStyles.empty}`}
                >
                  {
                    t.empty
                  }
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
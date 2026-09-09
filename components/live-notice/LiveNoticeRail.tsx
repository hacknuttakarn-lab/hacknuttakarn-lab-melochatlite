'use client';

import Link from 'next/link';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useLocale } from '@/components/SiteProviders';

import {
  getCurrentUser,
} from '@/lib/supabase/browser';

import VerifiedUserAvatar
  from '@/components/profile/VerifiedUserAvatar';

import {
  loadLiveNoticesForWeb,
  type LiveNoticeWeb,
} from './liveNoticeData';

import styles
  from './LiveNoticeRail.module.css';


const COPY = {
  th: {
    live: 'LIVE',
    label: 'ประกาศจากชาว Melo',
    all: 'ดูทั้งหมด',

    trip: 'ทริป',
    event: 'กิจกรรม',
    community: 'คอมมูนิตี้',

    admin: 'ประกาศจาก Melo',

    ctaTrip: 'ดูทริป',
    ctaEvent: 'ดูกิจกรรม',
    ctaCommunity: 'ดูคอมมูนิตี้',

    empty: 'ยังไม่มีประกาศสดในตอนนี้',

    close: 'ปิด',
    published: 'ประกาศเมื่อ',
  },

  en: {
    live: 'LIVE',
    label: 'Live from Melo members',
    all: 'View all',

    trip: 'Trip',
    event: 'Event',
    community: 'Community',

    admin: 'Melo announcement',

    ctaTrip: 'View Trip',
    ctaEvent: 'View Event',
    ctaCommunity: 'View Community',

    empty: 'No live notices right now',

    close: 'Close',
    published: 'Published',
  },

  de: {
    live: 'LIVE',
    label: 'Live von Melo-Mitgliedern',
    all: 'Alle anzeigen',

    trip: 'Reise',
    event: 'Event',
    community: 'Community',

    admin: 'Melo-Ankündigung',

    ctaTrip: 'Reise ansehen',
    ctaEvent: 'Event ansehen',
    ctaCommunity: 'Community ansehen',

    empty: 'Zurzeit keine Live-Hinweise',

    close: 'Schließen',
    published: 'Veröffentlicht',
  },

  zh: {
    live: 'LIVE',
    label: 'Melo 成员实时公告',
    all: '查看全部',

    trip: '旅行',
    event: '活动',
    community: '社区',

    admin: 'Melo 公告',

    ctaTrip: '查看旅行',
    ctaEvent: '查看活动',
    ctaCommunity: '查看社区',

    empty: '目前没有实时公告',

    close: '关闭',
    published: '发布时间',
  },

  ja: {
    live: 'LIVE',
    label: 'Meloメンバーからのお知らせ',
    all: 'すべて見る',

    trip: 'Trip',
    event: 'Event',
    community: 'Community',

    admin: 'Meloからのお知らせ',

    ctaTrip: 'Tripを見る',
    ctaEvent: 'Eventを見る',
    ctaCommunity: 'Communityを見る',

    empty: '現在Live Noticeはありません',

    close: '閉じる',
    published: '公開',
  },

  ko: {
    live: 'LIVE',
    label: 'Melo 회원 실시간 공지',
    all: '전체 보기',

    trip: '여행',
    event: '이벤트',
    community: '커뮤니티',

    admin: 'Melo 공지',

    ctaTrip: '여행 보기',
    ctaEvent: '이벤트 보기',
    ctaCommunity: '커뮤니티 보기',

    empty: '현재 실시간 공지가 없습니다',

    close: '닫기',
    published: '게시',
  },
} as const;


function cta(
  item:
    LiveNoticeWeb,

  t:
    any,
) {
  if (
    item.kind ===
    'trip'
  ) {
    return t.ctaTrip;
  }

  if (
    item.kind ===
    'event'
  ) {
    return t.ctaEvent;
  }

  if (
    item.kind ===
    'community'
  ) {
    return t.ctaCommunity;
  }

  return '';
}


function kindLabel(
  item:
    LiveNoticeWeb,

  t:
    any,
) {
  if (
    item.isAdmin
  ) {
    return t.admin;
  }

  return t[
    item.kind
  ];
}


function hourKey() {
  const date =
    new Date();

  const y =
    date.getFullYear();

  const m =
    String(
      date.getMonth() +
      1,
    ).padStart(
      2,
      '0',
    );

  const d =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  const h =
    String(
      date.getHours(),
    ).padStart(
      2,
      '0',
    );

  return `${y}-${m}-${d}-${h}`;
}


function dateLocale(
  locale:
    string,
) {
  return (
    {
      th: 'th-TH',
      en: 'en-US',
      de: 'de-DE',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
    } as
      Record<
        string,
        string
      >
  )[locale] ??
    'en-US';
}


export default function LiveNoticeRail() {
  const {
    locale,
    countryScope,
  } =
    useLocale();

  const t =
    COPY[locale] ??
    COPY.en;

  const [
    rawItems,
    setRawItems,
  ] =
    useState<
      LiveNoticeWeb[]
    >([]);

  const [
    index,
    setIndex,
  ] =
    useState(0);

  const [
    paused,
    setPaused,
  ] =
    useState(false);

  const [
    viewerId,
    setViewerId,
  ] =
    useState(
      'anonymous',
    );

  const [
    hourlyAdminSeen,
    setHourlyAdminSeen,
  ] =
    useState(true);

  const [
    currentHour,
    setCurrentHour,
  ] =
    useState(
      hourKey(),
    );

  const [
    selectedAdmin,
    setSelectedAdmin,
  ] =
    useState<
      LiveNoticeWeb |
      null
    >(
      null,
    );


  useEffect(
    () => {
      let active =
        true;

      void getCurrentUser()
        .then(
          (
            user,
          ) => {
            if (
              active
            ) {
              setViewerId(
                user?.id ||
                'anonymous',
              );
            }
          },
        );

      return () => {
        active =
          false;
      };
    },
    [],
  );


  useEffect(
    () => {
      async function load() {
        const rows =
          await loadLiveNoticesForWeb({
            locale,
            countryScope,
            limit:
              20,
          });

        setRawItems(
          rows,
        );
      }

      void load();

      const refresh =
        window.setInterval(
          () =>
            void load(),
          30000,
        );

      const hourTimer =
        window.setInterval(
          () =>
            setCurrentHour(
              hourKey(),
            ),
          30000,
        );

      return () => {
        window.clearInterval(
          refresh,
        );

        window.clearInterval(
          hourTimer,
        );
      };
    },
    [
      locale,
      countryScope,
    ],
  );


  useEffect(
    () => {
      if (
        !selectedAdmin
      ) {
        return;
      }

      const previous =
        document.body
          .style
          .overflow;

      document.body
        .style
        .overflow =
          'hidden';

      const onKey =
        (
          event:
            KeyboardEvent,
        ) => {
          if (
            event.key ===
            'Escape'
          ) {
            setSelectedAdmin(
              null,
            );
          }
        };

      window.addEventListener(
        'keydown',
        onKey,
      );

      return () => {
        document.body
          .style
          .overflow =
            previous;

        window.removeEventListener(
          'keydown',
          onKey,
        );
      };
    },
    [
      selectedAdmin,
    ],
  );


  const memberNotices =
    useMemo(
      () =>
        rawItems.filter(
          (
            notice,
          ) =>
            !notice.isAdmin,
        ),
      [
        rawItems,
      ],
    );


  const hourlyAdmin =
    useMemo(
      () =>
        rawItems.find(
          (
            notice,
          ) =>
            notice.isAdmin &&
            notice.deliveryMode ===
              'hourly',
        ) ??
        null,
      [
        rawItems,
      ],
    );


  const intervalAdmin =
    useMemo(
      () =>
        rawItems.find(
          (
            notice,
          ) =>
            notice.isAdmin &&
            notice.deliveryMode ===
              'interval',
        ) ??
        null,
      [
        rawItems,
      ],
    );


  const emptyAdmin =
    useMemo(
      () =>
        rawItems.find(
          (
            notice,
          ) =>
            notice.isAdmin &&
            notice.deliveryMode ===
              'empty',
        ) ??
        null,
      [
        rawItems,
      ],
    );


  useEffect(
    () => {
      if (
        !hourlyAdmin
      ) {
        setHourlyAdminSeen(
          true,
        );

        return;
      }

      const key =
        `melo/live-notice/admin-hourly/` +
        `${viewerId}/` +
        `${currentHour}`;

      try {
        setHourlyAdminSeen(
          window
            .localStorage
            .getItem(
              key,
            ) ===
            '1',
        );
      } catch {
        setHourlyAdminSeen(
          false,
        );
      }
    },
    [
      hourlyAdmin?.id,
      viewerId,
      currentHour,
    ],
  );


  const items =
    useMemo(
      () => {
        if (
          hourlyAdmin &&
          !hourlyAdminSeen
        ) {
          return [
            hourlyAdmin,
            ...memberNotices,
          ];
        }

        if (
          memberNotices.length
        ) {
          if (
            intervalAdmin
          ) {
            const every =
              Math.max(
                1,
                Math.min(
                  50,
                  intervalAdmin
                    .queueEvery ??
                  10,
                ),
              );

            const output:
              LiveNoticeWeb[] =
                [];

            memberNotices.forEach(
              (
                notice,
                memberIndex,
              ) => {
                output.push(
                  notice,
                );

                if (
                  (
                    memberIndex +
                    1
                  ) %
                    every ===
                  0
                ) {
                  output.push(
                    intervalAdmin,
                  );
                }
              },
            );

            return output;
          }

          return memberNotices;
        }

        return emptyAdmin
          ? [
              emptyAdmin,
            ]
          : [];
      },
      [
        emptyAdmin,
        hourlyAdmin,
        hourlyAdminSeen,
        intervalAdmin,
        memberNotices,
      ],
    );


  const item =
    useMemo(
      () =>
        items.length
          ? items[
              index %
              items.length
            ]
          : null,
      [
        items,
        index,
      ],
    );


  useEffect(
    () => {
      setIndex(0);
    },
    [
      items
        .map(
          (
            notice,
          ) =>
            notice.id,
        )
        .join('|'),
    ],
  );


  useEffect(
    () => {
      if (
        !item ||
        !item.isAdmin ||
        item.deliveryMode !==
          'hourly' ||
        hourlyAdminSeen
      ) {
        return;
      }

      const key =
        `melo/live-notice/admin-hourly/` +
        `${viewerId}/` +
        `${currentHour}`;

      const timer =
        window.setTimeout(
          () => {
            try {
              window
                .localStorage
                .setItem(
                  key,
                  '1',
                );
            } catch {}

            setHourlyAdminSeen(
              true,
            );
          },
          5000,
        );

      return () =>
        window.clearTimeout(
          timer,
        );
    },
    [
      item?.id,
      item?.deliveryMode,
      hourlyAdminSeen,
      viewerId,
      currentHour,
    ],
  );


  useEffect(
    () => {
      if (
        paused ||
        items.length <=
          1
      ) {
        return;
      }

      const timer =
        window.setInterval(
          () => {
            setIndex(
              (
                value,
              ) =>
                (
                  value +
                  1
                ) %
                items.length,
            );
          },
          5600,
        );

      return () =>
        window.clearInterval(
          timer,
        );
    },
    [
      items.length,
      paused,
    ],
  );


  return (
    <>
      <section
        className={
          styles.shell
        }
        onMouseEnter={() =>
          setPaused(
            true,
          )
        }
        onMouseLeave={() =>
          setPaused(
            false,
          )
        }
        onFocusCapture={() =>
          setPaused(
            true,
          )
        }
        onBlurCapture={() =>
          setPaused(
            false,
          )
        }
      >
        <div
          className={
            styles.topline
          }
        >
          <div
            className={
              styles.liveLabel
            }
          >
            <span
              className={
                styles.liveDot
              }
            />

            <strong>
              {t.live}
            </strong>

            <span>
              {t.label}
            </span>
          </div>

          <Link
            href="/live-notice"
          >
            {t.all} ›
          </Link>
        </div>

        <div
          className={
            styles.viewport
          }
        >
          {item ? (
            <LiveNoticeCard
              item={
                item
              }
              t={
                t
              }
              onOpenAdmin={
                setSelectedAdmin
              }
              key={
                `${item.id}-${index}`
              }
            />
          ) : (
            <div
              className={
                styles.empty
              }
            >
              <span>
                ◉
              </span>

              <p>
                {t.empty}
              </p>
            </div>
          )}
        </div>
      </section>


      {selectedAdmin ? (
        <div
          className={
            styles.modalBackdrop
          }
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedAdmin(
                null,
              );
            }
          }}
        >
          <section
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
          >
            <header
              className={
                styles.modalHeader
              }
            >
              <div
                className={
                  styles.modalAuthor
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
                    {t.admin}
                  </small>
                </span>
              </div>

              <button
                type="button"
                aria-label={
                  t.close
                }
                onClick={() =>
                  setSelectedAdmin(
                    null,
                  )
                }
              >
                ×
              </button>
            </header>

            {selectedAdmin.imageUrl ? (
              <img
                className={
                  styles.modalImage
                }
                src={
                  selectedAdmin.imageUrl
                }
                alt=""
              />
            ) : null}

            <div
              className={
                styles.modalBody
              }
            >
              <span
                className={
                  styles.modalLive
                }
              >
                ● LIVE
              </span>

              <h3>
                {
                  selectedAdmin.title
                }
              </h3>

              {selectedAdmin.body ? (
                <p>
                  {
                    selectedAdmin.body
                  }
                </p>
              ) : null}

              {selectedAdmin.createdAt ? (
                <small>
                  {t.published}{' '}
                  {new Date(
                    selectedAdmin.createdAt,
                  ).toLocaleString(
                    dateLocale(
                      locale,
                    ),
                  )}
                </small>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}


function LiveNoticeCard({
  item,
  t,
  onOpenAdmin,
}: {
  item:
    LiveNoticeWeb;

  t:
    any;

  onOpenAdmin:
    (
      item:
        LiveNoticeWeb,
    ) => void;
}) {
  const content =
    (
      <article
        className={`${styles.notice} ${
          item.isAdmin
            ? styles.adminNotice
            : ''
        }`}
      >
        <div
          className={`${styles.avatar} ${
            item.isAdmin
              ? styles.adminAvatar
              : ''
          }`}
        >
          {item.isAdmin ? (
            <img
              className={
                styles.adminAvatarImage
              }
              src="/melo-admin-live-profile.png"
              alt="Melo Chat"
            />
          ) : (
            <VerifiedUserAvatar
              userId={
                item.authorId
              }
              name={
                item.authorName
              }
              src={
                item.authorPhotoUrl
              }
              badgeSize={
                15
              }
              alt=""
            />
          )}
        </div>

        <div
          className={
            styles.copy
          }
        >
          <div
            className={
              styles.meta
            }
          >
            <strong>
              {item.authorName}
            </strong>

            <span>
              {kindLabel(
                item,
                t,
              )}
            </span>
          </div>

          <p>
            {item.message}
          </p>
        </div>

        {!item.isAdmin &&
        item.ctaHref ? (
          <span
            className={
              styles.cta
            }
          >
            {cta(
              item,
              t,
            )}{' '}
            ›
          </span>
        ) : (
          <span
            className={
              styles.adminMark
            }
          >
            MELO
          </span>
        )}
      </article>
    );


  if (
    item.isAdmin
  ) {
    return (
      <button
        type="button"
        className={
          styles.adminButton
        }
        onClick={() =>
          onOpenAdmin(
            item,
          )
        }
      >
        {content}
      </button>
    );
  }


  if (
    !item.ctaHref
  ) {
    return (
      <div
        className={
          styles.nonLink
        }
      >
        {content}
      </div>
    );
  }


  return (
    <Link
      href={
        item.ctaHref
      }
      className={
        styles.link
      }
    >
      {content}
    </Link>
  );
}
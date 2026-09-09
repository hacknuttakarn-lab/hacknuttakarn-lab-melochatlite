"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";

import {
  loadLiveNoticesForWeb,
  type LiveNoticeWeb,
} from "./liveNoticeData";

import styles from "./LiveNoticeCenter.module.css";

type Tab =
  | "all"
  | "trip"
  | "event"
  | "community";

const COPY = {
  th: {
    eyebrow: "MELO LIVE",
    title: "ประกาศสด",
    subtitle:
      "ดูว่าตอนนี้สมาชิก Melo กำลังหาเพื่อน ชวนไปไหน หรือกำลังต้องการสมาชิกเพิ่ม",

    all: "ทั้งหมด",
    trip: "ทริป",
    event: "กิจกรรม",
    community: "คอมมูนิตี้",

    admin: "ประกาศจาก Melo",

    empty:
      "ยังไม่มีประกาศในหมวดนี้",

    ctaAdmin:
      "ดูรายละเอียด",

    ctaTrip:
      "ดูทริป",

    ctaEvent:
      "ดูกิจกรรม",

    ctaCommunity:
      "ดูคอมมูนิตี้",

    live: "LIVE",
  },

  en: {
    eyebrow: "MELO LIVE",
    title: "Live Notices",

    subtitle:
      "See who is looking for companions, inviting people out or looking for more members right now",

    all: "All",
    trip: "Trips",
    event: "Events",
    community: "Community",

    admin:
      "Melo announcement",

    empty:
      "No notices in this category",

    ctaAdmin:
      "View details",

    ctaTrip:
      "View Trip",

    ctaEvent:
      "View Event",

    ctaCommunity:
      "View Community",

    live: "LIVE",
  },

  de: {
    eyebrow: "MELO LIVE",
    title: "Live-Hinweise",

    subtitle:
      "Sieh, wer gerade Begleitung, Teilnehmer oder neue Mitglieder sucht",

    all: "Alle",
    trip: "Reisen",
    event: "Events",
    community: "Community",

    admin:
      "Melo-Ankündigung",

    empty:
      "Keine Hinweise in dieser Kategorie",

    ctaAdmin:
      "Details ansehen",

    ctaTrip:
      "Reise ansehen",

    ctaEvent:
      "Event ansehen",

    ctaCommunity:
      "Community ansehen",

    live: "LIVE",
  },

  zh: {
    eyebrow: "MELO LIVE",
    title: "实时公告",

    subtitle:
      "查看现在谁在寻找同行者、活动伙伴或更多社区成员",

    all: "全部",
    trip: "旅行",
    event: "活动",
    community: "社区",

    admin:
      "Melo 公告",

    empty:
      "此分类暂无公告",

    ctaAdmin:
      "查看详情",

    ctaTrip:
      "查看旅行",

    ctaEvent:
      "查看活动",

    ctaCommunity:
      "查看社区",

    live: "LIVE",
  },

  ja: {
    eyebrow: "MELO LIVE",
    title: "Live Notice",

    subtitle:
      "今、仲間や参加者、Communityメンバーを探している人を見つけよう",

    all: "すべて",
    trip: "Trip",
    event: "Event",
    community: "Community",

    admin:
      "Meloからのお知らせ",

    empty:
      "このカテゴリにはお知らせがありません",

    ctaAdmin:
      "詳細を見る",

    ctaTrip:
      "Tripを見る",

    ctaEvent:
      "Eventを見る",

    ctaCommunity:
      "Communityを見る",

    live: "LIVE",
  },

  ko: {
    eyebrow: "MELO LIVE",
    title: "실시간 공지",

    subtitle:
      "지금 함께할 사람, 참가자 또는 커뮤니티 멤버를 찾는 소식을 확인하세요",

    all: "전체",
    trip: "여행",
    event: "이벤트",
    community: "커뮤니티",

    admin:
      "Melo 공지",

    empty:
      "이 카테고리에 공지가 없습니다",

    ctaAdmin:
      "상세 보기",

    ctaTrip:
      "여행 보기",

    ctaEvent:
      "이벤트 보기",

    ctaCommunity:
      "커뮤니티 보기",

    live: "LIVE",
  },
} as const;

type Copy =
  (typeof COPY)[keyof typeof COPY];

function label(
  item: LiveNoticeWeb,
  copy: Copy,
) {
  if (item.isAdmin) {
    return copy.admin;
  }

  if (
    item.kind === "trip"
  ) {
    return copy.trip;
  }

  if (
    item.kind === "event"
  ) {
    return copy.event;
  }

  if (
    item.kind ===
    "community"
  ) {
    return copy.community;
  }

  return copy.live;
}

function cta(
  item: LiveNoticeWeb,
  copy: Copy,
) {
  if (item.isAdmin) {
    return copy.ctaAdmin;
  }

  if (
    item.kind === "trip"
  ) {
    return copy.ctaTrip;
  }

  if (
    item.kind === "event"
  ) {
    return copy.ctaEvent;
  }

  if (
    item.kind ===
    "community"
  ) {
    return copy.ctaCommunity;
  }

  return "";
}

function noticeHref(
  item: LiveNoticeWeb,
) {
  /*
   * Admin Notice
   * เปิดหน้ารายละเอียดประกาศโดยใช้ notice id
   */
  if (
    item.isAdmin &&
    item.id
  ) {
    return (
      `/live-notice/admin/${encodeURIComponent(
        item.id,
      )}`
    );
  }

  /*
   * Trip / Event / Community
   * ใช้ ctaHref ที่ liveNoticeData สร้างไว้
   */
  return (
    item.ctaHref ||
    ""
  );
}

export default function LiveNoticeCenter() {
  const {
    locale,
    countryScope,
  } = useLocale();

  const copy =
    COPY[locale] ??
    COPY.en;

  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "all",
    );

  const [
    items,
    setItems,
  ] =
    useState<
      LiveNoticeWeb[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  useEffect(
    () => {
      let active =
        true;

      async function load() {
        setLoading(
          true,
        );

        try {
          const rows =
            await loadLiveNoticesForWeb(
              {
                locale,
                countryScope,
                limit: 100,
              },
            );

          if (
            !active
          ) {
            return;
          }

          setItems(
            rows,
          );
        } catch (
          caught
        ) {
          console.error(
            "[Melo Web] Unable to load Live Notice Center.",
            caught,
          );

          if (
            active
          ) {
            setItems(
              [],
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

      void load();

      const refresh =
        window.setInterval(
          () => {
            void load();
          },
          60000,
        );

      return () => {
        active =
          false;

        window.clearInterval(
          refresh,
        );
      };
    },
    [
      locale,
      countryScope,
    ],
  );

  const filtered =
    useMemo(
      () => {
        if (
          tab === "all"
        ) {
          return items;
        }

        return items.filter(
          (
            item,
          ) =>
            item.kind ===
            tab,
        );
      },
      [
        items,
        tab,
      ],
    );

  return (
    <main
      className={
        styles.page
      }
    >
      <Header />

      <section
        className={
          styles.shell
        }
      >
        <section
          className={
            styles.hero
          }
        >
          <div
            className={
              styles.liveMark
            }
          >
            <span />

            <strong>
              {
                copy.eyebrow
              }
            </strong>
          </div>

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
        </section>

        <nav
          className={
            styles.tabs
          }
          aria-label={
            copy.title
          }
        >
          {(
            [
              "all",
              "trip",
              "event",
              "community",
            ] as Tab[]
          ).map(
            (
              item,
            ) => {
              const count =
                item === "all"
                  ? items.length
                  : items.filter(
                      (
                        notice,
                      ) =>
                        notice.kind ===
                        item,
                    ).length;

              return (
                <button
                  type="button"
                  key={
                    item
                  }
                  className={
                    tab ===
                    item
                      ? styles.activeTab
                      : ""
                  }
                  onClick={() =>
                    setTab(
                      item,
                    )
                  }
                >
                  {
                    copy[item]
                  }

                  <span>
                    {
                      count
                    }
                  </span>
                </button>
              );
            },
          )}
        </nav>

        {loading ? (
          <div
            className={
              styles.state
            }
          >
            …
          </div>
        ) : filtered.length ? (
          <div
            className={
              styles.list
            }
          >
            {filtered.map(
              (
                item,
              ) => (
                <NoticeRow
                  item={
                    item
                  }
                  copy={
                    copy
                  }
                  key={
                    item.id
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div
            className={
              styles.state
            }
          >
            {
              copy.empty
            }
          </div>
        )}
      </section>
    </main>
  );
}

function NoticeRow({
  item,
  copy,
}: {
  item: LiveNoticeWeb;
  copy: Copy;
}) {
  const href =
    noticeHref(
      item,
    );

  const content = (
    <article
      className={`${styles.card} ${
        item.isAdmin
          ? styles.admin
          : ""
      }`}
    >
      <div
        className={`${styles.avatar} ${
          item.isAdmin
            ? styles.adminAvatar
            : ""
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
            {
              item.authorName
            }
          </strong>

          <span>
            {
              label(
                item,
                copy,
              )
            }
          </span>

          {item.createdAt ? (
            <small>
              {new Date(
                item.createdAt,
              ).toLocaleString(
                localeForDate(),
              )}
            </small>
          ) : null}
        </div>

        <p>
          {
            item.message
          }
        </p>

        {item.city ||
        item.country ? (
          <small
            className={
              styles.location
            }
          >
            {[
              item.city,
              item.country,
            ]
              .filter(
                Boolean,
              )
              .join(
                " · ",
              )}
          </small>
        ) : null}
      </div>

      {href ? (
        <span
          className={
            styles.cta
          }
        >
          {
            cta(
              item,
              copy,
            )
          }{" "}
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

  /*
   * ไม่มีปลายทางจริง
   * แสดงเป็นการ์ดธรรมดา
   */
  if (!href) {
    return content;
  }

  /*
   * Admin
   * /live-notice/admin/{noticeId}
   *
   * Trip
   * /trips/{tripId}
   *
   * Event
   * /events/{eventId}
   *
   * Community
   * /community/{communityId}
   */
  return (
    <Link
      href={
        href
      }
      className={
        styles.link
      }
      aria-label={`${label(
        item,
        copy,
      )}: ${item.title || item.message}`}
    >
      {
        content
      }
    </Link>
  );
}

function localeForDate() {
  if (
    typeof document !==
    "undefined"
  ) {
    return (
      document
        .documentElement
        .lang ||
      undefined
    );
  }

  return undefined;
}
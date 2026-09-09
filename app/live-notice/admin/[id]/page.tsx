"use client";

import Link from "next/link";
import {
  useParams,
} from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";

import {
  loadLiveNoticesForWeb,
  type LiveNoticeWeb,
} from "@/components/live-notice/liveNoticeData";

type Locale =
  | "th"
  | "en"
  | "de"
  | "zh"
  | "ja"
  | "ko";

const COPY = {
  th: {
    eyebrow:
      "MELO LIVE",

    pageTitle:
      "รายละเอียดประกาศ",

    admin:
      "ประกาศจาก Melo",

    back:
      "กลับไปประกาศสด",

    published:
      "เผยแพร่เมื่อ",

    expires:
      "สิ้นสุดประกาศ",

    active:
      "กำลังแสดง",

    inactive:
      "สิ้นสุดแล้ว",

    loading:
      "กำลังโหลดประกาศ…",

    notFound:
      "ไม่พบประกาศนี้",

    notFoundDesc:
      "ประกาศอาจหมดอายุ ถูกยกเลิก หรือไม่มีอยู่ในระบบแล้ว",

    backButton:
      "กลับไปหน้าประกาศสด",

    official:
      "ประกาศอย่างเป็นทางการจาก Melo Chat",
  },

  en: {
    eyebrow:
      "MELO LIVE",

    pageTitle:
      "Announcement details",

    admin:
      "Melo announcement",

    back:
      "Back to Live Notices",

    published:
      "Published",

    expires:
      "Notice ends",

    active:
      "Live",

    inactive:
      "Ended",

    loading:
      "Loading announcement…",

    notFound:
      "Announcement not found",

    notFoundDesc:
      "This announcement may have expired, been removed, or is no longer available.",

    backButton:
      "Back to Live Notices",

    official:
      "Official announcement from Melo Chat",
  },

  de: {
    eyebrow:
      "MELO LIVE",

    pageTitle:
      "Details zur Ankündigung",

    admin:
      "Melo-Ankündigung",

    back:
      "Zurück zu Live-Hinweisen",

    published:
      "Veröffentlicht",

    expires:
      "Ende der Ankündigung",

    active:
      "Aktiv",

    inactive:
      "Beendet",

    loading:
      "Ankündigung wird geladen…",

    notFound:
      "Ankündigung nicht gefunden",

    notFoundDesc:
      "Diese Ankündigung ist möglicherweise abgelaufen, wurde entfernt oder ist nicht mehr verfügbar.",

    backButton:
      "Zurück zu Live-Hinweisen",

    official:
      "Offizielle Ankündigung von Melo Chat",
  },

  zh: {
    eyebrow:
      "MELO LIVE",

    pageTitle:
      "公告详情",

    admin:
      "Melo 公告",

    back:
      "返回实时公告",

    published:
      "发布时间",

    expires:
      "公告结束时间",

    active:
      "正在显示",

    inactive:
      "已结束",

    loading:
      "正在加载公告…",

    notFound:
      "未找到公告",

    notFoundDesc:
      "此公告可能已过期、被移除或已无法查看。",

    backButton:
      "返回实时公告",

    official:
      "Melo Chat 官方公告",
  },

  ja: {
    eyebrow:
      "MELO LIVE",

    pageTitle:
      "お知らせの詳細",

    admin:
      "Meloからのお知らせ",

    back:
      "Live Noticeへ戻る",

    published:
      "公開日時",

    expires:
      "掲載終了",

    active:
      "掲載中",

    inactive:
      "終了",

    loading:
      "お知らせを読み込み中…",

    notFound:
      "お知らせが見つかりません",

    notFoundDesc:
      "このお知らせは終了、削除、または現在利用できない可能性があります。",

    backButton:
      "Live Noticeへ戻る",

    official:
      "Melo Chatからの公式お知らせ",
  },

  ko: {
    eyebrow:
      "MELO LIVE",

    pageTitle:
      "공지 상세",

    admin:
      "Melo 공지",

    back:
      "실시간 공지로 돌아가기",

    published:
      "게시일",

    expires:
      "공지 종료",

    active:
      "게시 중",

    inactive:
      "종료됨",

    loading:
      "공지를 불러오는 중…",

    notFound:
      "공지를 찾을 수 없습니다",

    notFoundDesc:
      "이 공지는 만료되었거나 삭제되었거나 더 이상 제공되지 않을 수 있습니다.",

    backButton:
      "실시간 공지로 돌아가기",

    official:
      "Melo Chat 공식 공지",
  },
} as const;

function safeLocale(
  value: string,
): Locale {
  if (
    value === "th" ||
    value === "en" ||
    value === "de" ||
    value === "zh" ||
    value === "ja" ||
    value === "ko"
  ) {
    return value;
  }

  return "en";
}

function localeTag(
  locale: Locale,
) {
  if (
    locale === "th"
  ) {
    return "th-TH";
  }

  if (
    locale === "de"
  ) {
    return "de-DE";
  }

  if (
    locale === "zh"
  ) {
    return "zh-CN";
  }

  if (
    locale === "ja"
  ) {
    return "ja-JP";
  }

  if (
    locale === "ko"
  ) {
    return "ko-KR";
  }

  return "en-US";
}

function formatDate(
  value: string,
  locale: Locale,
) {
  if (!value) {
    return "—";
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
    return "—";
  }

  return new Intl.DateTimeFormat(
    localeTag(
      locale,
    ),
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  ).format(
    date,
  );
}

function isExpired(
  notice: LiveNoticeWeb,
) {
  if (
    !notice.isActive
  ) {
    return true;
  }

  if (
    !notice.expiresAt
  ) {
    return false;
  }

  const time =
    new Date(
      notice.expiresAt,
    ).getTime();

  if (
    Number.isNaN(
      time,
    )
  ) {
    return false;
  }

  return (
    time <
    Date.now()
  );
}

export default function AdminLiveNoticeDetailPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const {
    locale:
      siteLocale,
    countryScope,
  } = useLocale();

  const locale =
    safeLocale(
      String(
        siteLocale,
      ),
    );

  const copy =
    COPY[locale];

  const noticeId =
    useMemo(
      () =>
        decodeURIComponent(
          String(
            params?.id ||
            "",
          ),
        ).trim(),
      [
        params?.id,
      ],
    );

  const [
    notice,
    setNotice,
  ] =
    useState<
      LiveNoticeWeb |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    failed,
    setFailed,
  ] =
    useState(false);

  useEffect(
    () => {
      let active =
        true;

      async function load() {
        if (
          !noticeId
        ) {
          setNotice(
            null,
          );

          setFailed(
            true,
          );

          setLoading(
            false,
          );

          return;
        }

        setLoading(
          true,
        );

        setFailed(
          false,
        );

        try {
          /*
           * ใช้ Public Live Notice RPC ตัวเดียวกับหน้า Feed
           * ไม่อ่านตาราง Admin โดยตรง
           * สมาชิกทั่วไปจึงไม่ต้องมีสิทธิ์ Admin
           */
          const items =
            await loadLiveNoticesForWeb(
              {
                locale,
                countryScope,
                limit: 30,
              },
            );

          if (
            !active
          ) {
            return;
          }

          const found =
            items.find(
              (
                item,
              ) =>
                item.isAdmin &&
                item.id ===
                  noticeId,
            ) ||
            null;

          setNotice(
            found,
          );

          setFailed(
            !found,
          );
        } catch (
          caught
        ) {
          console.error(
            "[Melo Web] Unable to load Admin Live Notice detail.",
            caught,
          );

          if (
            active
          ) {
            setNotice(
              null,
            );

            setFailed(
              true,
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

      return () => {
        active =
          false;
      };
    },
    [
      noticeId,
      locale,
      countryScope,
    ],
  );

  const ended =
    notice
      ? isExpired(
          notice,
        )
      : false;

  return (
    <main
      className="noticeDetailPage"
    >
      <Header />

      <div
        className="noticeDetailShell"
      >
        <Link
          href="/live-notice"
          className="backLink"
        >
          <span
            aria-hidden="true"
          >
            ←
          </span>

          {
            copy.back
          }
        </Link>

        {loading ? (
          <section
            className="stateCard"
          >
            <div
              className="stateSpinner"
              aria-hidden="true"
            />

            <strong>
              {
                copy.loading
              }
            </strong>
          </section>
        ) : failed ||
          !notice ? (
          <section
            className="stateCard"
          >
            <div
              className="missingIcon"
              aria-hidden="true"
            >
              !
            </div>

            <h1>
              {
                copy.notFound
              }
            </h1>

            <p>
              {
                copy.notFoundDesc
              }
            </p>

            <Link
              href="/live-notice"
              className="primaryLink"
            >
              {
                copy.backButton
              }
            </Link>
          </section>
        ) : (
          <>
            <header
              className="detailHero"
            >
              <div
                className="adminIdentity"
              >
                <div
                  className="adminAvatar"
                >
                  <img
                    src="/melo-admin-live-profile.png"
                    alt="Melo Chat"
                  />
                </div>

                <div
                  className="adminIdentityCopy"
                >
                  <div
                    className="liveLabel"
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
                      copy.pageTitle
                    }
                  </h1>

                  <p>
                    {
                      copy.official
                    }
                  </p>
                </div>
              </div>

              <span
                className={
                  ended
                    ? "statusBadge ended"
                    : "statusBadge"
                }
              >
                <i />

                {ended
                  ? copy.inactive
                  : copy.active}
              </span>
            </header>

            <article
              className="noticeArticle"
            >
              <div
                className="articleTop"
              >
                <div
                  className="articleType"
                >
                  <span
                    className="articleTypeIcon"
                  >
                    📢
                  </span>

                  <div>
                    <small>
                      {
                        copy.admin
                      }
                    </small>

                    <strong>
                      Melo Admin
                    </strong>
                  </div>
                </div>

                <div
                  className="dateGrid"
                >
                  <div>
                    <small>
                      {
                        copy.published
                      }
                    </small>

                    <strong>
                      {formatDate(
                        notice.createdAt,
                        locale,
                      )}
                    </strong>
                  </div>

                  {notice.expiresAt ? (
                    <div>
                      <small>
                        {
                          copy.expires
                        }
                      </small>

                      <strong>
                        {formatDate(
                          notice.expiresAt,
                          locale,
                        )}
                      </strong>
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className="articleDivider"
              />

              <section
                className="articleContent"
              >
                {notice.title ? (
                  <h2>
                    {
                      notice.title
                    }
                  </h2>
                ) : null}

                {notice.body ? (
                  <p>
                    {
                      notice.body
                    }
                  </p>
                ) : !notice.title &&
                  notice.message ? (
                  <p>
                    {
                      notice.message
                    }
                  </p>
                ) : null}
              </section>

              {notice.imageUrl ? (
                <figure
                  className="noticeImage"
                >
                  <img
                    src={
                      notice.imageUrl
                    }
                    alt={
                      notice.title ||
                      copy.admin
                    }
                  />
                </figure>
              ) : null}

              <footer
                className="articleFooter"
              >
                <div
                  className="meloOfficial"
                >
                  <img
                    src="/melo-admin-live-profile.png"
                    alt=""
                  />

                  <div>
                    <strong>
                      Melo Chat
                    </strong>

                    <span>
                      {
                        copy.official
                      }
                    </span>
                  </div>
                </div>

                <Link
                  href="/live-notice"
                  className="primaryLink"
                >
                  <span
                    aria-hidden="true"
                  >
                    ←
                  </span>

                  {
                    copy.backButton
                  }
                </Link>
              </footer>
            </article>
          </>
        )}
      </div>

      <style jsx>{`
        .noticeDetailPage {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 88% 4%,
              rgba(83, 104, 245, 0.09),
              transparent 34rem
            ),
            var(--background, #f5f8fc);
          color: var(--text, #111827);
        }

        .noticeDetailShell {
          width: min(
            1040px,
            calc(100% - 34px)
          );
          margin: 0 auto;
          padding: 30px 0 80px;
        }

        .backLink {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          gap: 8px;
          border: 1px solid
            var(
              --border,
              rgba(17, 24, 39, 0.09)
            );
          border-radius: 13px;
          background:
            var(--surface, #fff);
          color:
            var(
              --text-secondary,
              #667085
            );
          padding: 0 14px;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          box-shadow:
            0 8px 22px
            color-mix(
              in srgb,
              var(--shadow) 18%,
              transparent
            );
          transition:
            transform 0.16s ease,
            border-color 0.16s ease,
            color 0.16s ease;
        }

        .backLink:hover {
          color:
            var(
              --primary,
              #258df0
            );
          border-color:
            color-mix(
              in srgb,
              var(--primary) 35%,
              var(--border)
            );
          transform:
            translateY(-1px);
        }

        .detailHero {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 22px;
          margin-top: 22px;
          border: 1px solid
            var(
              --border,
              rgba(17, 24, 39, 0.09)
            );
          border-radius: 24px;
          background:
            linear-gradient(
              115deg,
              rgba(97, 86, 226, 0.08),
              transparent 58%
            ),
            var(--surface, #fff);
          padding: 24px;
          box-shadow:
            0 15px 38px
            color-mix(
              in srgb,
              var(--shadow) 23%,
              transparent
            );
        }

        .adminIdentity {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 18px;
        }

        .adminAvatar {
          display: grid;
          width: 76px;
          height: 76px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid
            rgba(98, 93, 245, 0.17);
          border-radius: 23px;
          background:
            linear-gradient(
              145deg,
              rgba(22, 127, 232, 0.08),
              rgba(98, 93, 245, 0.1)
            );
          padding: 8px;
        }

        .adminAvatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .adminIdentityCopy {
          min-width: 0;
        }

        .liveLabel {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .liveLabel > span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f0445f;
          box-shadow:
            0 0 0 6px
            rgba(
              240,
              68,
              95,
              0.09
            );
        }

        .liveLabel strong {
          color: #f0445f;
          font-size: 11px;
          letter-spacing:
            0.12em;
        }

        .adminIdentityCopy h1 {
          margin: 8px 0 0;
          font-size: clamp(
            26px,
            3vw,
            38px
          );
          line-height: 1.14;
          letter-spacing:
            -0.035em;
        }

        .adminIdentityCopy p {
          margin: 6px 0 0;
          color:
            var(
              --text-secondary,
              #667085
            );
          font-size: 13px;
        }

        .statusBadge {
          display: inline-flex;
          min-height: 36px;
          flex: 0 0 auto;
          align-items: center;
          gap: 7px;
          border: 1px solid
            rgba(
              32,
              161,
              103,
              0.18
            );
          border-radius: 999px;
          background:
            rgba(
              32,
              161,
              103,
              0.08
            );
          color: #168656;
          padding: 0 12px;
          font-size: 11px;
          font-weight: 900;
        }

        .statusBadge i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background:
            currentColor;
        }

        .statusBadge.ended {
          border-color:
            var(
              --border,
              rgba(
                17,
                24,
                39,
                0.09
              )
            );
          background:
            var(
              --surface-2,
              #f4f7fa
            );
          color:
            var(
              --text-secondary,
              #667085
            );
        }

        .noticeArticle {
          overflow: hidden;
          margin-top: 18px;
          border: 1px solid
            var(
              --border,
              rgba(17, 24, 39, 0.09)
            );
          border-radius: 24px;
          background:
            var(--surface, #fff);
          box-shadow:
            0 15px 40px
            color-mix(
              in srgb,
              var(--shadow) 22%,
              transparent
            );
        }

        .articleTop {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 20px;
          padding: 22px 24px;
        }

        .articleType {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 12px;
        }

        .articleTypeIcon {
          display: grid;
          width: 48px;
          height: 48px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 15px;
          background:
            rgba(
              100,
              91,
              226,
              0.1
            );
          font-size: 20px;
        }

        .articleType small,
        .articleType strong {
          display: block;
        }

        .articleType small {
          color: #665ce4;
          font-size: 10px;
          font-weight: 850;
        }

        .articleType strong {
          margin-top: 3px;
          font-size: 15px;
        }

        .dateGrid {
          display: flex;
          flex-wrap: wrap;
          justify-content:
            flex-end;
          gap: 10px;
        }

        .dateGrid > div {
          min-width: 145px;
          border: 1px solid
            var(
              --border,
              rgba(
                17,
                24,
                39,
                0.09
              )
            );
          border-radius: 13px;
          background:
            var(
              --surface-2,
              #f4f7fa
            );
          padding: 10px 12px;
        }

        .dateGrid small,
        .dateGrid strong {
          display: block;
        }

        .dateGrid small {
          color:
            var(
              --text-secondary,
              #7a8697
            );
          font-size: 9px;
        }

        .dateGrid strong {
          margin-top: 4px;
          font-size: 11px;
        }

        .articleDivider {
          height: 1px;
          background:
            var(
              --border,
              rgba(17, 24, 39, 0.09)
            );
        }

        .articleContent {
          max-width: 820px;
          padding: 30px 28px;
        }

        .articleContent h2 {
          margin: 0;
          color:
            var(--text, #111827);
          font-size: clamp(
            27px,
            3.1vw,
            40px
          );
          line-height: 1.3;
          letter-spacing:
            -0.03em;
          overflow-wrap:
            anywhere;
        }

        .articleContent p {
          margin: 17px 0 0;
          color:
            var(
              --text-secondary,
              #4f5d70
            );
          font-size: 16px;
          line-height: 1.85;
          white-space: pre-wrap;
          overflow-wrap:
            anywhere;
        }

        .noticeImage {
          margin:
            0
            28px
            28px;
          overflow: hidden;
          border: 1px solid
            var(
              --border,
              rgba(
                17,
                24,
                39,
                0.09
              )
            );
          border-radius: 18px;
          background:
            var(
              --surface-2,
              #f4f7fa
            );
        }

        .noticeImage img {
          display: block;
          width: 100%;
          max-height: 620px;
          object-fit: contain;
        }

        .articleFooter {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 20px;
          border-top: 1px solid
            var(
              --border,
              rgba(
                17,
                24,
                39,
                0.09
              )
            );
          background:
            color-mix(
              in srgb,
              var(--surface-2) 80%,
              transparent
            );
          padding: 18px 24px;
        }

        .meloOfficial {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 10px;
        }

        .meloOfficial img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 12px;
        }

        .meloOfficial strong,
        .meloOfficial span {
          display: block;
        }

        .meloOfficial strong {
          font-size: 12px;
        }

        .meloOfficial span {
          margin-top: 2px;
          color:
            var(
              --text-secondary,
              #667085
            );
          font-size: 9px;
        }

        .primaryLink {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 12px;
          background:
            var(
              --primary,
              #258df0
            );
          color: #fff;
          padding: 0 15px;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .stateCard {
          display: grid;
          min-height: 360px;
          place-items: center;
          align-content: center;
          gap: 11px;
          margin-top: 22px;
          border: 1px solid
            var(
              --border,
              rgba(
                17,
                24,
                39,
                0.09
              )
            );
          border-radius: 24px;
          background:
            var(--surface, #fff);
          padding: 30px;
          text-align: center;
        }

        .stateCard h1 {
          margin: 0;
          font-size: 25px;
        }

        .stateCard p {
          max-width: 480px;
          margin: 0;
          color:
            var(
              --text-secondary,
              #667085
            );
          font-size: 12px;
          line-height: 1.65;
        }

        .stateSpinner {
          width: 34px;
          height: 34px;
          border: 3px solid
            var(
              --border,
              #dce3eb
            );
          border-top-color:
            var(
              --primary,
              #258df0
            );
          border-radius: 50%;
          animation:
            noticeSpin
            0.75s
            linear
            infinite;
        }

        .missingIcon {
          display: grid;
          width: 54px;
          height: 54px;
          place-items: center;
          border-radius: 17px;
          background:
            rgba(
              240,
              68,
              95,
              0.09
            );
          color: #f0445f;
          font-size: 22px;
          font-weight: 950;
        }

        @keyframes noticeSpin {
          to {
            transform:
              rotate(360deg);
          }
        }

        :global(
          html[data-theme="dark"]
        )
        .noticeDetailPage {
          background:
            radial-gradient(
              circle at 88% 4%,
              rgba(
                83,
                104,
                245,
                0.11
              ),
              transparent 34rem
            ),
            var(
              --background,
              #090d14
            );
        }

        @media (
          max-width:
          760px
        ) {
          .noticeDetailShell {
            width:
              min(
                calc(
                  100% - 20px
                ),
                1040px
              );
            padding:
              18px
              0
              56px;
          }

          .detailHero {
            align-items:
              flex-start;
            flex-direction:
              column;
            padding: 18px;
          }

          .adminAvatar {
            width: 62px;
            height: 62px;
            border-radius:
              19px;
          }

          .adminIdentityCopy h1 {
            font-size: 27px;
          }

          .articleTop {
            align-items:
              flex-start;
            flex-direction:
              column;
            padding:
              17px;
          }

          .dateGrid {
            width: 100%;
            justify-content:
              flex-start;
          }

          .dateGrid > div {
            min-width: 0;
            flex: 1 1 150px;
          }

          .articleContent {
            padding:
              24px
              18px;
          }

          .articleContent h2 {
            font-size:
              27px;
          }

          .articleContent p {
            font-size:
              14px;
            line-height:
              1.8;
          }

          .noticeImage {
            margin:
              0
              18px
              20px;
          }

          .articleFooter {
            align-items:
              stretch;
            flex-direction:
              column;
            padding: 17px;
          }

          .primaryLink {
            width: 100%;
          }
        }

        @media (
          max-width:
          460px
        ) {
          .adminIdentity {
            align-items:
              flex-start;
          }

          .adminAvatar {
            width: 54px;
            height: 54px;
            border-radius:
              16px;
          }

          .adminIdentityCopy h1 {
            font-size:
              23px;
          }

          .statusBadge {
            min-height:
              32px;
          }
        }
      `}</style>
    </main>
  );
}
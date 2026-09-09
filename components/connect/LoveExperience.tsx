'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  Header,
} from '@/components/Header';

import VerifiedUserAvatar from '@/components/profile/VerifiedUserAvatar';
import UserIdentityText from '@/components/profile/UserIdentityText';

import {
  useLocale,
} from '@/components/SiteProviders';

import {
  connectCopy,
} from '@/i18n/connectUi';

import {
  getCurrentUser,
  isSupabaseConfigured,
} from '@/lib/supabase/browser';

import {
  countryFlagEmoji,
} from '@/lib/countryFlag';

import {
  loadLoveSnapshot,
  setLoveFavorite,
  setLoveLike,
  zodiacFromDate,
  type DatingProfileWeb,
  type LoveSnapshot,
} from './connectData';

import styles from './ConnectExperience.module.css';

type Tab =
  | 'recommended'
  | 'likesYou'
  | 'saved'
  | 'matched';

const EMPTY:
  LoveSnapshot = {
  recommended: [],
  likesYou: [],
  saved: [],
  matched: [],
  favoriteIds: [],
  likedIds: [],

  entitlements: {
    planCode: 'free',
    canSeeLikes: false,
    likesRemainingToday: 30,
  },

  filters: {
    genders: [],
    ageMin: 18,
    ageMax: 80,
    nationalities: [],
  },
};

const localeTag = {
  th: 'th-TH',
  en: 'en-US',
  de: 'de-DE',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
} as const;

function nice(
  value: string,
) {
  if (!value) return '';

  return value
    .replaceAll(
      '_',
      ' ',
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

export function LoveExperience({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const {
    locale,
  } = useLocale();

  const copy =
    connectCopy[locale];

  const router =
    useRouter();

  const [
    userId,
    setUserId,
  ] = useState('');

  const [
    snapshot,
    setSnapshot,
  ] = useState<LoveSnapshot>(
    EMPTY,
  );

  const [
    tab,
    setTab,
  ] = useState<Tab>(
    'recommended',
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    busyId,
    setBusyId,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  const [
    photoIndex,
    setPhotoIndex,
  ] = useState(0);

  const [
    toast,
    setToast,
  ] = useState('');

  const configured =
    isSupabaseConfigured();

  async function load(
    background = false,
  ) {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const current =
        await getCurrentUser();

      if (!current) {
        router.replace(
          '/login',
        );
        return;
      }

      setUserId(
        current.id,
      );

      setSnapshot(
        await loadLoveSnapshot(
          current.id,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load Love data.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (configured) {
      void load();
    } else {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const current =
    snapshot.recommended[0];

  useEffect(() => {
    setPhotoIndex(0);
  }, [
    current?.id,
  ]);

  useEffect(() => {
    if (!toast) return;

    const timer =
      window.setTimeout(
        () =>
          setToast(''),
        3200,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [toast]);

  const activeList =
    useMemo(
      () =>
        tab === 'likesYou'
          ? snapshot.likesYou
          : tab === 'saved'
            ? snapshot.saved
            : tab === 'matched'
              ? snapshot.matched
              : snapshot.recommended,
      [
        snapshot,
        tab,
      ],
    );

  const isFavorite =
    (id: string) =>
      snapshot.favoriteIds.includes(
        id,
      );

  const isLiked =
    (id: string) =>
      snapshot.likedIds.includes(
        id,
      );

  function removeRecommended(
    id: string,
  ) {
    setSnapshot(
      (
        currentSnapshot,
      ) => ({
        ...currentSnapshot,

        recommended:
          currentSnapshot.recommended.filter(
            (item) =>
              item.id !==
              id,
          ),
      }),
    );
  }

  async function toggleSave(
    profile:
      DatingProfileWeb,
  ) {
    if (busyId) return;

    const next =
      !isFavorite(
        profile.id,
      );

    setBusyId(
      profile.id,
    );

    setError('');

    try {
      await setLoveFavorite(
        profile.id,
        next,
      );

      setSnapshot(
        (state) => ({
          ...state,

          favoriteIds:
            next
              ? [
                  ...new Set([
                    ...state.favoriteIds,
                    profile.id,
                  ]),
                ]
              : state.favoriteIds.filter(
                  (id) =>
                    id !==
                    profile.id,
                ),

          saved:
            next
              ? [
                  profile,
                  ...state.saved.filter(
                    (item) =>
                      item.id !==
                      profile.id,
                  ),
                ]
              : state.saved.filter(
                  (item) =>
                    item.id !==
                    profile.id,
                ),
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to save profile.',
      );
    } finally {
      setBusyId('');
    }
  }

  async function like(
    profile:
      DatingProfileWeb,
  ) {
    if (
      busyId ||
      !userId
    ) {
      return;
    }

    setBusyId(
      profile.id,
    );

    setError('');

    try {
      const result =
        await setLoveLike(
          profile.id,
          true,
        );

      setSnapshot(
        (state) => ({
          ...state,

          recommended:
            state.recommended.filter(
              (item) =>
                item.id !==
                profile.id,
            ),

          likesYou:
            state.likesYou.filter(
              (item) =>
                item.id !==
                profile.id,
            ),

          likedIds: [
            ...new Set([
              ...state.likedIds,
              profile.id,
            ]),
          ],

          matched:
            result.isMatch
              ? [
                  profile,
                  ...state.matched.filter(
                    (item) =>
                      item.id !==
                      profile.id,
                  ),
                ]
              : state.matched,

          entitlements: {
            ...state.entitlements,

            likesRemainingToday:
              state.entitlements
                .likesRemainingToday ===
              null
                ? null
                : Math.max(
                    0,
                    state.entitlements
                      .likesRemainingToday -
                      1,
                  ),
          },
        }),
      );

      if (
        result.isMatch
      ) {
        setToast(
          `${copy.love.matchNow} ${copy.love.matchMessage}`,
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to Like profile.',
      );
    } finally {
      setBusyId('');
    }
  }

  const filterPills = [
    snapshot.filters.genders
      .length
      ? snapshot.filters.genders
          .map(nice)
          .join(' · ')
      : '',

    `${snapshot.filters.ageMin}–${snapshot.filters.ageMax}`,

    snapshot.filters
      .nationalities.length
      ? snapshot.filters.nationalities.join(
          ' · ',
        )
      : '',
  ].filter(Boolean);

  function openDirectChat(
    profile:
      DatingProfileWeb,
  ) {
    window.dispatchEvent(
      new CustomEvent(
        'melo-open-direct-chat',
        {
          detail: {
            userId:
              profile.id,

            title:
              profile.name,

            subtitle: [
              profile.city,
              profile.country,
            ]
              .filter(Boolean)
              .join(', '),

            avatarUrl:
              profile.photoUrls[0] ||
              '',

            country:
              profile.country,

            nationality:
              profile.nationality,
          },
        },
      ),
    );
  }

  function tabs() {
    return (
      <div
        className={`${styles.tabs} ${styles.loveTabs}`}
      >
        <button
          type="button"
          className={`${styles.tab} ${
            tab ===
            'recommended'
              ? styles.tabActive
              : ''
          }`}
          onClick={() =>
            setTab(
              'recommended',
            )
          }
        >
          {
            copy.love
              .recommended
          }

          <span
            className={
              styles.count
            }
          >
            {
              snapshot
                .recommended
                .length
            }
          </span>
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            tab ===
            'likesYou'
              ? styles.tabActive
              : ''
          }`}
          onClick={() =>
            setTab(
              'likesYou',
            )
          }
        >
          {
            copy.love
              .likesYou
          }

          {snapshot.entitlements
            .canSeeLikes && (
            <span
              className={
                styles.count
              }
            >
              {
                snapshot
                  .likesYou
                  .length
              }
            </span>
          )}
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            tab ===
            'saved'
              ? styles.tabActive
              : ''
          }`}
          onClick={() =>
            setTab(
              'saved',
            )
          }
        >
          {
            copy.love
              .saved
          }

          <span
            className={
              styles.count
            }
          >
            {
              snapshot
                .saved
                .length
            }
          </span>
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            tab ===
            'matched'
              ? styles.tabActive
              : ''
          }`}
          onClick={() =>
            setTab(
              'matched',
            )
          }
        >
          {
            copy.love
              .matched
          }

          <span
            className={
              styles.count
            }
          >
            {
              snapshot
                .matched
                .length
            }
          </span>
        </button>
      </div>
    );
  }

  function profileGrid(
    list:
      DatingProfileWeb[],
    kind:
      Exclude<
        Tab,
        'recommended'
      >,
  ) {
    const empty =
      kind === 'likesYou'
        ? copy.love.noLikes
        : kind === 'saved'
          ? copy.love.noSaved
          : copy.love.noMatched;

    if (!list.length) {
      return (
        <div
          className={
            styles.state
          }
        >
          <span
            className={
              styles.stateIcon
            }
          >
            ♡
          </span>

          <strong>
            {empty}
          </strong>

          <p>
            {
              copy.common
                .webSync
            }
          </p>
        </div>
      );
    }

    return (
      <div
        className={
          styles.loveGrid
        }
      >
        {list.map(
          (profile) => {
            const zodiac =
              zodiacFromDate(
                profile.dateOfBirth,
                locale,
              );

            const liked =
              isLiked(
                profile.id,
              );

            const countryFlag =
              countryFlagEmoji(
                profile.nationality,
              ) ||
              countryFlagEmoji(
                profile.country,
              );

            const countryDetail =
              [
                countryFlag,
                profile.country,
              ]
                .filter(Boolean)
                .join(' ');

            return (
              <article
                className={
                  styles.loveCard
                }
                key={
                  profile.id
                }
              >
                <Link
                  href={`/users/${profile.id}`}
                  className={
                    styles.loveCardPhoto
                  }
                  aria-label={`${copy.love.viewMore} ${profile.name}`}
                >
                  <VerifiedUserAvatar
                    userId={
                      profile.id
                    }
                    name={
                      profile.name
                    }
                    src={
                      profile.photoUrls[0] ||
                      ''
                    }
                    country={
                      profile.country
                    }
                    nationality={
                      profile.nationality
                    }
                    className={
                      styles.loveCardVerifiedPhoto
                    }
                    shape="rounded"
                    badgeSize={
                      20
                    }
                    showCountryFlag={
                      false
                    }
                    alt={
                      profile.name
                    }
                  />
                </Link>

                <div
                  className={
                    styles.loveCardBody
                  }
                >
                  <div
                    className={
                      styles.loveCardTitle
                    }
                  >
                    <strong>
                      <Link
                        href={`/users/${profile.id}`}
                        className={
                          styles.profileNameLink
                        }
                      >
                        {
                          profile.name
                        }
                        {profile.age
                          ? `, ${profile.age}`
                          : ''}
                      </Link>
                    </strong>

                    {kind ===
                      'matched' && (
                      <span
                        className={
                          styles.matchTag
                        }
                      >
                        ♥{' '}
                        {
                          copy.love
                            .matched
                        }
                      </span>
                    )}
                  </div>

                  <div
                    className={
                      styles.loveCardMeta
                    }
                  >
                    {[
                      profile.city,
                      countryDetail,
                      zodiac,
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(
                        ' · ',
                      )}
                  </div>

                  {/*
                   * Love introduction เท่านั้น
                   * ไม่ใช้ Profile bio
                   */}
                  {profile.loveIntro && (
                    <p
                      className={
                        styles.loveCardBio
                      }
                    >
                      {
                        profile.loveIntro
                      }
                    </p>
                  )}

                  <div
                    className={
                      styles.loveCardActions
                    }
                  >
                    {kind ===
                      'saved' && (
                      <button
                        type="button"
                        className={
                          styles.miniSave
                        }
                        disabled={
                          busyId ===
                          profile.id
                        }
                        onClick={() =>
                          void toggleSave(
                            profile,
                          )
                        }
                      >
                        {isFavorite(
                          profile.id,
                        )
                          ? `★ ${copy.love.savedState}`
                          : `☆ ${copy.love.save}`}
                      </button>
                    )}

                    {(kind ===
                      'likesYou' ||
                      kind ===
                        'saved') &&
                      (liked ? (
                        <span
                          className={
                            styles.miniLiked
                          }
                        >
                          ♥{' '}
                          {
                            copy.love
                              .like
                          }
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={
                            styles.miniLike
                          }
                          disabled={
                            busyId ===
                            profile.id
                          }
                          onClick={() =>
                            void like(
                              profile,
                            )
                          }
                        >
                          ♥{' '}
                          {
                            copy.love
                              .like
                          }
                        </button>
                      ))}

                    {kind ===
                      'matched' && (
                      <button
                        type="button"
                        className={
                          styles.miniChat
                        }
                        onClick={() =>
                          openDirectChat(
                            profile,
                          )
                        }
                      >
                        💬{' '}
                        {
                          copy.love
                            .chat
                        }
                      </button>
                    )}

                    <Link
                      href={`/users/${profile.id}`}
                      className={
                        styles.miniProfile
                      }
                    >
                      {
                        copy.love
                          .viewMore
                      }{' '}
                      ›
                    </Link>
                  </div>
                </div>
              </article>
            );
          },
        )}
      </div>
    );
  }

  if (!configured) {
    return (
      <div
        className={`${styles.page} ${
          embedded
            ? styles.embeddedPage
            : ''
        }`}
      >
        {!embedded && (
          <Header />
        )}

        <section
          className={`${styles.shell} ${
            embedded
              ? styles.embeddedShell
              : ''
          }`}
        >
          <div
            className={
              styles.state
            }
          >
            <strong>
              Supabase is not
              configured.
            </strong>
          </div>
        </section>
      </div>
    );
  }

  const hasRecommendationInsight =
    Boolean(
      current &&
        (
          current
            .recommendationReasons
            .length ||
          current
            .sharedInterests
            .length
        ),
    );

  const hasCompatibility =
    Boolean(
      current &&
        (
          current.matchScore >
            0 ||
          current
            .sharedInterests
            .length
        ),
    );

  const zodiac =
    current
      ? zodiacFromDate(
          current.dateOfBirth,
          locale,
        )
      : '';

  const secondaryMeta =
    current
      ? [
          zodiac
            ? `✦ ${zodiac}`
            : '',

          current.travelExperience
            ? nice(
                current.travelExperience,
              )
            : '',

          current.distanceKm !==
          null
            ? `${Math.round(
                current.distanceKm,
              )} km`
            : '',
        ].filter(Boolean)
      : [];

  const lastActive =
    (() => {
      if (
        !current?.lastActiveAt
      ) {
        return '';
      }

      const value =
        new Date(
          current.lastActiveAt,
        );

      if (
        Number.isNaN(
          value.getTime(),
        )
      ) {
        return '';
      }

      return new Intl.DateTimeFormat(
        localeTag[locale] ??
          'en-US',
        {
          dateStyle:
            'medium',
          timeStyle:
            'short',
        },
      ).format(value);
    })();

  return (
    <div
      className={`${styles.page} ${
        embedded
          ? styles.embeddedPage
          : ''
      }`}
    >
      {!embedded && (
        <Header />
      )}

      <section
        className={`${styles.shell} ${
          embedded
            ? styles.embeddedShell
            : ''
        }`}
      >
        {!embedded && (
          <div
            className={
              styles.hero
            }
          >
            <div
              className={
                styles.heroCopy
              }
            >
              <span
                className={
                  styles.kicker
                }
              >
                {
                  copy.common
                    .member
                }
              </span>

              <h1>
                {
                  copy.love
                    .title
                }
              </h1>

              <p>
                {
                  copy.love
                    .subtitle
                }
              </p>
            </div>

            <div
              className={
                styles.heroActions
              }
            >
              <span
                className={
                  styles.livePill
                }
              >
                <i />
                {
                  copy.common
                    .live
                }
              </span>

              <button
                type="button"
                className={
                  styles.refreshButton
                }
                disabled={
                  refreshing
                }
                onClick={() =>
                  void load(
                    true,
                  )
                }
              >
                {refreshing
                  ? copy.common
                      .refreshing
                  : copy.common
                      .refresh}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            className={`${styles.note} ${styles.errorText}`}
          >
            {error}
          </div>
        )}

        {!loading &&
          tabs()}

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
                copy.common
                  .loading
              }
            </strong>
          </div>
        ) : tab ===
          'recommended' ? (
          current ? (
            <div
              className={
                styles.loveDiscovery
              }
            >
              <div
                className={
                  styles.loveMediaColumn
                }
              >
                <div
                  className={
                    styles.loveMediaFrame
                  }
                >
                  <VerifiedUserAvatar
                    userId={
                      current.id
                    }
                    name={
                      current.name
                    }
                    src={
                      current.photoUrls[
                        photoIndex
                      ] || ''
                    }
                    country={
                      current.country
                    }
                    nationality={
                      current.nationality
                    }
                    className={
                      styles.loveSpotlightVerified
                    }
                    shape="rounded"
                    badgeSize={
                      24
                    }
                    showVerified={
                      false
                    }
                    showCountryFlag={
                      false
                    }
                    alt={
                      current.name
                    }
                  />

                  <span
                    className={
                      styles.recommendedBadge
                    }
                  >
                    ✦{' '}
                    {
                      copy.love
                        .recommendation
                    }
                  </span>

                  {(current.isOnline ||
                    lastActive) && (
                    <span
                      className={
                        styles.presenceOverlay
                      }
                    >
                      {current.isOnline
                        ? `● ${copy.love.onlineNow}`
                        : `${copy.love.lastActive} · ${lastActive}`}
                    </span>
                  )}

                  {!!current
                    .photoUrls
                    .length && (
                    <span
                      className={
                        styles.photoCounter
                      }
                    >
                      {photoIndex +
                        1}
                      /
                      {
                        current
                          .photoUrls
                          .length
                      }
                    </span>
                  )}

                  {current
                    .photoUrls
                    .length >
                    1 && (
                    <>
                      <button
                        type="button"
                        className={`${styles.photoArrow} ${styles.photoArrowLeft}`}
                        aria-label={
                          copy.love
                            .pass
                        }
                        disabled={
                          photoIndex ===
                          0
                        }
                        onClick={() =>
                          setPhotoIndex(
                            (
                              index,
                            ) =>
                              Math.max(
                                0,
                                index -
                                  1,
                              ),
                          )
                        }
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        className={`${styles.photoArrow} ${styles.photoArrowRight}`}
                        aria-label={
                          copy.love
                            .viewMore
                        }
                        disabled={
                          photoIndex ===
                          current
                            .photoUrls
                            .length -
                            1
                        }
                        onClick={() =>
                          setPhotoIndex(
                            (
                              index,
                            ) =>
                              Math.min(
                                current
                                  .photoUrls
                                  .length -
                                  1,
                                index +
                                  1,
                              ),
                          )
                        }
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div
                className={
                  styles.loveContentColumn
                }
              >
                <div
                  className={
                    styles.loveCompactBar
                  }
                >
                  <div
                    className={
                      styles.filterPills
                    }
                  >
                    {filterPills.map(
                      (item) => (
                        <span
                          className={
                            styles.loveFilter
                          }
                          key={
                            item
                          }
                        >
                          {
                            item
                          }
                        </span>
                      ),
                    )}
                  </div>

                  <span
                    className={
                      styles.likesQuota
                    }
                  >
                    {
                      copy.love
                        .likesRemaining
                    }
                    :{' '}
                    {snapshot
                      .entitlements
                      .likesRemainingToday ===
                    null
                      ? copy.love
                          .unlimited
                      : snapshot
                          .entitlements
                          .likesRemainingToday}
                  </span>
                </div>

                <div
                  className={
                    styles.profileSummary
                  }
                >
                  <div
                    className={
                      styles.profileSummaryText
                    }
                  >
                    <h2>
                      <Link
                        href={`/users/${current.id}`}
                        className={
                          styles.profileNameLink
                        }
                      >
                        {
                          current.name
                        }
                        {current.age
                          ? `, ${current.age}`
                          : ''}
                      </Link>
                    </h2>

                    <div
                      className={
                        styles.summaryLocation
                      }
                    >
                      {[
                        current.city,
                        current.country,
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          ', ',
                        )}
                    </div>

                    <UserIdentityText
                      userId={
                        current.id
                      }
                      country={
                        current.country
                      }
                      nationality={
                        current.nationality
                      }
                    />

                    {!!secondaryMeta.length && (
                      <div
                        className={
                          styles.summarySecondary
                        }
                      >
                        {secondaryMeta.map(
                          (item) => (
                            <span
                              key={
                                item
                              }
                            >
                              {
                                item
                              }
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  {current.matchScore >
                    0 && (
                    <span
                      className={
                        styles.matchScoreBadge
                      }
                    >
                      ♡{' '}
                      {
                        current.matchScore
                      }
                      %{' '}
                      {
                        copy.friends
                          .match
                      }
                    </span>
                  )}
                </div>

                <div
                  className={
                    styles.profileContentStack
                  }
                >
                  {/*
                   * สำคัญ:
                   * ใช้ Love introduction เท่านั้น
                   * ไม่ fallback ไป current.bio
                   */}
                  {current.loveIntro && (
                    <p
                      className={
                        styles.discoveryBio
                      }
                    >
                      {
                        current.loveIntro
                      }
                    </p>
                  )}

                  {hasRecommendationInsight && (
                    <section
                      className={
                        styles.recommendationCard
                      }
                    >
                      <strong>
                        ✦{' '}
                        {
                          copy.love
                            .whyRecommended
                        }
                      </strong>

                      {!!current
                        .recommendationReasons
                        .length && (
                        <div
                          className={
                            styles.recommendationLines
                          }
                        >
                          {current.recommendationReasons
                            .slice(
                              0,
                              2,
                            )
                            .map(
                              (
                                reason,
                              ) => (
                                <span
                                  key={
                                    reason
                                  }
                                >
                                  {
                                    reason
                                  }
                                </span>
                              ),
                            )}
                        </div>
                      )}

                      {!current
                        .recommendationReasons
                        .length &&
                        !!current
                          .sharedInterests
                          .length && (
                          <p>
                            {
                              copy.love
                                .sharedInterests
                            }
                            :{' '}
                            {current.sharedInterests
                              .slice(
                                0,
                                4,
                              )
                              .join(
                                ' · ',
                              )}
                          </p>
                        )}
                    </section>
                  )}

                  <div
                    className={
                      styles.discoveryOverviewGrid
                    }
                  >
                    {!!current
                      .interests
                      .length && (
                      <section
                        className={
                          styles.discoverySection
                        }
                      >
                        <strong>
                          {
                            copy.love
                              .interests
                          }
                        </strong>

                        <div
                          className={
                            styles.discoveryChips
                          }
                        >
                          {current.interests
                            .slice(
                              0,
                              8,
                            )
                            .map(
                              (
                                item,
                              ) => (
                                <span
                                  className={
                                    styles.discoveryChip
                                  }
                                  key={
                                    item
                                  }
                                >
                                  {
                                    item
                                  }
                                </span>
                              ),
                            )}
                        </div>
                      </section>
                    )}

                    {current.relationshipGoal && (
                      <section
                        className={
                          styles.discoverySection
                        }
                      >
                        <strong>
                          {
                            copy.love
                              .relationshipGoal
                          }
                        </strong>

                        <div
                          className={
                            styles.discoveryChips
                          }
                        >
                          <span
                            className={`${styles.discoveryChip} ${styles.discoveryChipAccent}`}
                          >
                            {
                              nice(
                                current.relationshipGoal,
                              )
                            }
                          </span>
                        </div>
                      </section>
                    )}
                  </div>

                  {!![
                    current.drinking,
                    current.smoking,
                    current.exercise,
                    current.pets,
                  ].filter(Boolean)
                    .length && (
                    <section
                      className={`${styles.discoverySection} ${styles.lifestyleSection}`}
                    >
                      <strong>
                        {
                          copy.love
                            .lifestyle
                        }
                      </strong>

                      <div
                        className={
                          styles.discoveryLifestyleGrid
                        }
                      >
                        {current.drinking && (
                          <div>
                            <small>
                              {
                                copy.love
                                  .drinking
                              }
                            </small>
                            <span>
                              {
                                nice(
                                  current.drinking,
                                )
                              }
                            </span>
                          </div>
                        )}

                        {current.smoking && (
                          <div>
                            <small>
                              {
                                copy.love
                                  .smoking
                              }
                            </small>
                            <span>
                              {
                                nice(
                                  current.smoking,
                                )
                              }
                            </span>
                          </div>
                        )}

                        {current.exercise && (
                          <div>
                            <small>
                              {
                                copy.love
                                  .exercise
                              }
                            </small>
                            <span>
                              {
                                nice(
                                  current.exercise,
                                )
                              }
                            </span>
                          </div>
                        )}

                        {current.pets && (
                          <div>
                            <small>
                              {
                                copy.love
                                  .pets
                              }
                            </small>
                            <span>
                              {
                                nice(
                                  current.pets,
                                )
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {hasCompatibility && (
                    <section
                      className={
                        styles.compatibilityCard
                      }
                    >
                      <div>
                        <strong>
                          {
                            copy.love
                              .compatibility
                          }
                        </strong>

                        {current.matchScore >
                          0 && (
                          <span>
                            {
                              current.matchScore
                            }
                            %
                          </span>
                        )}
                      </div>

                      {!!current
                        .sharedInterests
                        .length && (
                        <p>
                          {
                            copy.love
                              .sharedInterests
                          }
                          :{' '}
                          {current.sharedInterests
                            .slice(
                              0,
                              5,
                            )
                            .join(
                              ' · ',
                            )}
                        </p>
                      )}
                    </section>
                  )}
                </div>

                <div
                  className={
                    styles.discoveryActions
                  }
                >
                  <button
                    type="button"
                    title={
                      copy.love
                        .pass
                    }
                    className={`${styles.discoveryActionCircle} ${styles.passAction}`}
                    disabled={
                      busyId ===
                      current.id
                    }
                    onClick={() =>
                      removeRecommended(
                        current.id,
                      )
                    }
                  >
                    <span>
                      ×
                    </span>
                    <small>
                      {
                        copy.love
                          .pass
                      }
                    </small>
                  </button>

                  <button
                    type="button"
                    title={
                      copy.love
                        .save
                    }
                    className={`${styles.discoveryActionCircle} ${styles.saveAction}`}
                    disabled={
                      busyId ===
                      current.id
                    }
                    onClick={() =>
                      void toggleSave(
                        current,
                      )
                    }
                  >
                    <span>
                      {isFavorite(
                        current.id,
                      )
                        ? '★'
                        : '☆'}
                    </span>

                    <small>
                      {isFavorite(
                        current.id,
                      )
                        ? copy.love
                            .savedState
                        : copy.love
                            .save}
                    </small>
                  </button>

                  <button
                    type="button"
                    title={
                      copy.love
                        .like
                    }
                    className={
                      styles.discoveryLikeButton
                    }
                    disabled={
                      busyId ===
                      current.id
                    }
                    onClick={() =>
                      void like(
                        current,
                      )
                    }
                  >
                    <span>
                      ♥
                    </span>
                    <strong>
                      {
                        copy.love
                          .like
                      }
                    </strong>
                  </button>

                  <Link
                    className={
                      styles.viewProfileLink
                    }
                    href={`/users/${current.id}`}
                  >
                    {
                      copy.love
                        .viewMore
                    }{' '}
                    <span>
                      ›
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={
                styles.loveResultsWrap
              }
            >
              <div
                className={
                  styles.state
                }
              >
                <span
                  className={
                    styles.stateIcon
                  }
                >
                  ♥
                </span>

                <strong>
                  {
                    copy.love
                      .noRecommended
                  }
                </strong>

                <p>
                  {
                    copy.common
                      .webSync
                  }
                </p>
              </div>
            </div>
          )
        ) : tab ===
            'likesYou' &&
          !snapshot.entitlements
            .canSeeLikes ? (
          <div
            className={
              styles.loveResultsWrap
            }
          >
            <div
              className={
                styles.premiumGate
              }
            >
              <span
                className={
                  styles.premiumGateIcon
                }
              >
                ♥
              </span>

              <strong>
                {
                  copy.love
                    .premiumTitle
                }
              </strong>

              <p>
                {
                  copy.love
                    .premiumBody
                }
              </p>

              <Link href="/account">
                {
                  copy.love
                    .premiumCta
                }
              </Link>
            </div>
          </div>
        ) : (
          <div
            className={
              styles.loveResultsWrap
            }
          >
            {profileGrid(
              activeList,
              tab as Exclude<
                Tab,
                'recommended'
              >,
            )}
          </div>
        )}

        {!embedded && (
          <div
            className={
              styles.note
            }
          >
            {
              copy.common
                .webSync
            }
          </div>
        )}
      </section>

      {toast && (
        <div
          className={
            styles.toast
          }
        >
          {toast}
        </div>
      )}
    </div>
  );
}
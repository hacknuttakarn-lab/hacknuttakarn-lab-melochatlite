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
  blockFriendWeb,
  cancelFriendRequestWeb,
  loadFriendSnapshot,
  removeFriendWeb,
  respondFriendRequestWeb,
  sendFriendRequestWeb,
  type FriendCandidateWeb,
  type FriendSnapshot,
} from './connectData';

import {
  loadFriendIntrosForUsersWeb,
} from './connectModeIntroWeb';

import styles from './ConnectExperience.module.css';

type Tab =
  | 'discover'
  | 'requests'
  | 'friends';

const EMPTY:
  FriendSnapshot = {
  candidates: [],
  requests: [],
  connections: [],
};

function localeTag(
  locale: string,
) {
  return (
    {
      th: 'th-TH',
      en: 'en-US',
      de: 'de-DE',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
    } as Record<
      string,
      string
    >
  )[locale] ?? 'en-US';
}

export function FriendsExperience({
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
    tab,
    setTab,
  ] = useState<Tab>(
    'discover',
  );

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<FriendSnapshot>(
      EMPTY,
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
    error,
    setError,
  ] = useState('');

  const [
    interest,
    setInterest,
  ] = useState('');

  const [
    busyId,
    setBusyId,
  ] = useState('');

  const configured =
    isSupabaseConfigured();

  /**
   * โหลด Friend snapshot
   *
   * หลังจากได้ candidate list แล้ว
   * จะโหลด Friend introduction แยกอีกครั้ง
   * ตาม user_id
   *
   * ลำดับ source:
   *
   * 1. connect_mode_intros.friend_intro
   * 2. candidate.friendIntro จาก Friend candidate RPC เดิม
   *
   * ไม่มี Profile bio เป็น fallback
   */
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

      const baseSnapshot =
        await loadFriendSnapshot();

      if (
        !baseSnapshot
          .candidates
          .length
      ) {
        setSnapshot(
          baseSnapshot,
        );

        return;
      }

      const introMap =
        await loadFriendIntrosForUsersWeb(
          baseSnapshot.candidates.map(
            (
              candidate,
            ) =>
              candidate.userId,
          ),
        );

      const candidates =
        baseSnapshot.candidates.map(
          (
            candidate,
          ) => {
            const syncedIntro =
              introMap[
                candidate.userId
              ];

            /**
             * ถ้ามีค่าใน public Connect intro
             * ให้ใช้ค่านั้น
             *
             * ถ้าไม่มี row ให้ fallback ไป
             * candidate.friendIntro จาก RPC เดิม
             *
             * ไม่มีการ fallback ไป Profile bio
             */
            if (
              typeof syncedIntro ===
              'string'
            ) {
              return {
                ...candidate,

                friendIntro:
                  syncedIntro,
              };
            }

            return candidate;
          },
        );

      setSnapshot({
        ...baseSnapshot,
        candidates,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load friend data.',
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
  }, [
    configured,
  ]);

  const topInterests =
    useMemo(
      () => {
        const counts =
          new Map<
            string,
            number
          >();

        snapshot.candidates.forEach(
          (
            candidate,
          ) => {
            const source =
              candidate
                .sharedInterests
                .length
                ? candidate
                    .sharedInterests
                : candidate
                    .interests;

            source.forEach(
              (
                item,
              ) =>
                counts.set(
                  item,
                  (
                    counts.get(
                      item,
                    ) ??
                    0
                  ) + 1,
                ),
            );
          },
        );

        return [
          ...counts.entries(),
        ]
          .sort(
            (
              a,
              b,
            ) =>
              b[1] -
              a[1],
          )
          .slice(
            0,
            10,
          )
          .map(
            (
              [
                item,
              ],
            ) =>
              item,
          );
      },
      [
        snapshot.candidates,
      ],
    );

  const visibleCandidates =
    useMemo(
      () =>
        snapshot.candidates.filter(
          (
            candidate,
          ) =>
            !interest ||
            candidate.sharedInterests.includes(
              interest,
            ) ||
            candidate.interests.includes(
              interest,
            ),
        ),
      [
        snapshot.candidates,
        interest,
      ],
    );

  const goalLabel =
    (
      goal: string,
    ) =>
      (
        {
          local_friend:
            copy.friends
              .localFriend,

          travel_buddy:
            copy.friends
              .travelBuddy,

          language_exchange:
            copy.friends
              .languageExchange,

          activity_partner:
            copy.friends
              .activityPartner,

          online_friend:
            copy.friends
              .onlineFriend,
        } as Record<
          string,
          string
        >
      )[goal] ??
      goal.replaceAll(
        '_',
        ' ',
      );

  const hangoutLabel =
    (
      candidate:
        FriendCandidateWeb,
    ) => {
      const base =
        candidate.hangoutStatus ===
        'today'
          ? copy.friends
              .today
          : candidate.hangoutStatus ===
              'weekend'
            ? copy.friends
                .weekend
            : candidate.hangoutStatus ===
                'traveling'
              ? copy.friends
                  .traveling
              : '';

      return [
        base,
        candidate
          .hangoutActivity,
      ]
        .filter(Boolean)
        .join(
          ' · ',
        );
    };

  async function perform(
    id: string,

    action: () =>
      Promise<void>,

    nextTab?: Tab,
  ) {
    setBusyId(
      id,
    );

    setError('');

    try {
      await action();

      await load(
        true,
      );

      if (nextTab) {
        setTab(
          nextTab,
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to update friend status.',
      );
    } finally {
      setBusyId('');
    }
  }

  async function removeFriend(
    friend:
      FriendSnapshot['connections'][number],
  ) {
    if (
      !window.confirm(
        copy.friends.confirmUnfriend.replace(
          '{name}',
          friend.displayName,
        ),
      )
    ) {
      return;
    }

    await perform(
      friend.userId,

      () =>
        removeFriendWeb(
          friend.userId,
        ),

      'friends',
    );
  }

  async function blockFriend(
    friend:
      FriendSnapshot['connections'][number],
  ) {
    if (
      !window.confirm(
        copy.friends.confirmBlock.replace(
          '{name}',
          friend.displayName,
        ),
      )
    ) {
      return;
    }

    await perform(
      friend.userId,

      () =>
        blockFriendWeb(
          friend.userId,
        ),

      'friends',
    );
  }

  function openDirectChat(
    friend:
      FriendSnapshot['connections'][number],
  ) {
    window.dispatchEvent(
      new CustomEvent(
        'melo-open-direct-chat',
        {
          detail: {
            userId:
              friend.userId,

            title:
              friend.displayName,

            subtitle: [
              friend.city,
              friend.country,
            ]
              .filter(
                Boolean,
              )
              .join(
                ', ',
              ),

            avatarUrl:
              friend.photoUrl,

            country:
              friend.country,
          },
        },
      ),
    );
  }

  function candidateActions(
    candidate:
      FriendCandidateWeb,
  ) {
    if (
      candidate.requestStatus ===
      'accepted'
    ) {
      return (
        <button
          type="button"
          className={
            styles.acceptedAction
          }
          disabled
        >
          {
            copy.friends
              .alreadyFriend
          }
        </button>
      );
    }

    if (
      candidate.requestStatus ===
      'received'
    ) {
      return (
        <button
          type="button"
          className={
            styles.primaryAction
          }
          onClick={() =>
            setTab(
              'requests',
            )
          }
        >
          {
            copy.friends
              .viewRequest
          }
        </button>
      );
    }

    if (
      candidate.requestStatus ===
      'sent'
    ) {
      return (
        <>
          <button
            type="button"
            className={
              styles.secondaryAction
            }
            disabled={
              busyId ===
              candidate.userId
            }
            onClick={() =>
              void perform(
                candidate.userId,

                () =>
                  cancelFriendRequestWeb(
                    candidate.userId,
                  ),
              )
            }
          >
            {
              copy.friends
                .cancel
            }
          </button>

          <button
            type="button"
            className={
              styles.primaryAction
            }
            disabled
          >
            {
              copy.friends
                .requestSent
            }
          </button>
        </>
      );
    }

    return (
      <button
        type="button"
        className={
          styles.primaryAction
        }
        disabled={
          busyId ===
          candidate.userId
        }
        onClick={() =>
          void perform(
            candidate.userId,

            () =>
              sendFriendRequestWeb(
                candidate.userId,
              ),
          )
        }
      >
        {
          copy.friends
            .addFriend
        }
      </button>
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
                  copy.friends
                    .title
                }
              </h1>

              <p>
                {
                  copy.friends
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

        <div
          className={
            styles.tabs
          }
        >
          <button
            type="button"
            className={`${styles.tab} ${
              tab ===
              'discover'
                ? styles.tabActive
                : ''
            }`}
            onClick={() =>
              setTab(
                'discover',
              )
            }
          >
            {
              copy.friends
                .discover
            }

            <span
              className={
                styles.count
              }
            >
              {
                snapshot
                  .candidates
                  .length
              }
            </span>
          </button>

          <button
            type="button"
            className={`${styles.tab} ${
              tab ===
              'requests'
                ? styles.tabActive
                : ''
            }`}
            onClick={() =>
              setTab(
                'requests',
              )
            }
          >
            {
              copy.friends
                .requests
            }

            <span
              className={
                styles.count
              }
            >
              {
                snapshot
                  .requests
                  .length
              }
            </span>
          </button>

          <button
            type="button"
            className={`${styles.tab} ${
              tab ===
              'friends'
                ? styles.tabActive
                : ''
            }`}
            onClick={() =>
              setTab(
                'friends',
              )
            }
          >
            {
              copy.friends
                .friends
            }

            <span
              className={
                styles.count
              }
            >
              {
                snapshot
                  .connections
                  .length
              }
            </span>
          </button>
        </div>

        {error && (
          <div
            className={`${styles.note} ${styles.errorText}`}
          >
            {error}
          </div>
        )}

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
          'discover' ? (
          <>
            <div
              className={
                styles.filters
              }
            >
              <button
                type="button"
                className={`${styles.filterChip} ${
                  !interest
                    ? styles.filterChipActive
                    : ''
                }`}
                onClick={() =>
                  setInterest(
                    '',
                  )
                }
              >
                {
                  copy.common
                    .all
                }
              </button>

              {topInterests.map(
                (
                  item,
                ) => (
                  <button
                    type="button"
                    key={
                      item
                    }
                    className={`${styles.filterChip} ${
                      interest ===
                      item
                        ? styles.filterChipActive
                        : ''
                    }`}
                    onClick={() =>
                      setInterest(
                        item,
                      )
                    }
                  >
                    {
                      item
                    }
                  </button>
                ),
              )}
            </div>

            {visibleCandidates.length ? (
              <div
                className={
                  styles.friendGrid
                }
              >
                {visibleCandidates.map(
                  (
                    candidate,
                  ) => {
                    const location =
                      [
                        candidate.city,
                        candidate.country,
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          ', ',
                        );

                    const presence =
                      hangoutLabel(
                        candidate,
                      );

                    return (
                      <article
                        className={
                          styles.friendCard
                        }
                        key={
                          candidate.userId
                        }
                      >
                        <div
                          className={
                            styles.friendPhoto
                          }
                        >
                          <Link
                            href={`/users/${candidate.userId}`}
                            className={
                              styles.profilePhotoLink
                            }
                            aria-label={
                              candidate.displayName
                            }
                          >
                            <VerifiedUserAvatar
                              userId={
                                candidate.userId
                              }
                              name={
                                candidate.displayName
                              }
                              src={
                                candidate.photoUrl
                              }
                              country={
                                candidate.country
                              }
                              nationality={
                                candidate.nationality
                              }
                              className={
                                styles.friendVerifiedPhoto
                              }
                              shape="rounded"
                              badgeSize={
                                20
                              }
                              showVerified={
                                false
                              }
                              showCountryFlag={
                                false
                              }
                              alt={
                                candidate.displayName
                              }
                            />
                          </Link>

                          <span
                            className={
                              styles.matchBadge
                            }
                          >
                            ◎{' '}
                            {
                              candidate.matchScore
                            }
                            %{' '}
                            {
                              copy.friends
                                .match
                            }
                          </span>

                          {presence && (
                            <span
                              className={
                                styles.presence
                              }
                            >
                              {
                                presence
                              }
                            </span>
                          )}
                        </div>

                        <div
                          className={
                            styles.friendBody
                          }
                        >
                          <div
                            className={
                              styles.nameRow
                            }
                          >
                            <div>
                              <h2>
                                <Link
                                  href={`/users/${candidate.userId}`}
                                  className={
                                    styles.profileNameLink
                                  }
                                >
                                  {
                                    candidate.displayName
                                  }

                                  {candidate.age
                                    ? `, ${candidate.age}`
                                    : ''}
                                </Link>
                              </h2>

                              {location && (
                                <div
                                  className={
                                    styles.location
                                  }
                                >
                                  ⌖{' '}
                                  {
                                    location
                                  }{' '}
                                  ·{' '}
                                  {candidate.primaryLanguage.toUpperCase()}
                                </div>
                              )}

                              <UserIdentityText
                                userId={
                                  candidate.userId
                                }
                                country={
                                  candidate.country
                                }
                                nationality={
                                  candidate.nationality
                                }
                              />
                            </div>
                          </div>

                          {candidate.preferredNationalityMatch && (
                            <span
                              className={
                                styles.natMatch
                              }
                            >
                              ✓{' '}
                              {
                                copy.friends
                                  .nationalityMatch
                              }
                            </span>
                          )}

                          {/*
                           * Friend introduction เท่านั้น
                           *
                           * ไม่ใช้ About me / Profile bio
                           */}
                          {candidate.friendIntro && (
                            <p
                              className={
                                styles.bio
                              }
                            >
                              {
                                candidate.friendIntro
                              }
                            </p>
                          )}

                          {!!candidate.sharedInterests.length && (
                            <>
                              <span
                                className={
                                  styles.sectionLabel
                                }
                              >
                                {
                                  copy.friends
                                    .sharedInterests
                                }
                              </span>

                              <div
                                className={
                                  styles.chips
                                }
                              >
                                {candidate.sharedInterests
                                  .slice(
                                    0,
                                    5,
                                  )
                                  .map(
                                    (
                                      item,
                                    ) => (
                                      <span
                                        className={`${styles.chip} ${styles.chipPrimary}`}
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
                            </>
                          )}

                          {!!candidate.sharedGoals.length && (
                            <>
                              <span
                                className={
                                  styles.sectionLabel
                                }
                              >
                                {
                                  copy.friends
                                    .sharedGoals
                                }
                              </span>

                              <div
                                className={
                                  styles.chips
                                }
                              >
                                {candidate.sharedGoals
                                  .slice(
                                    0,
                                    3,
                                  )
                                  .map(
                                    (
                                      item,
                                    ) => (
                                      <span
                                        className={
                                          styles.chip
                                        }
                                        key={
                                          item
                                        }
                                      >
                                        {
                                          goalLabel(
                                            item,
                                          )
                                        }
                                      </span>
                                    ),
                                  )}
                              </div>
                            </>
                          )}

                          <div
                            className={
                              styles.friendActions
                            }
                          >
                            {
                              candidateActions(
                                candidate,
                              )
                            }
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
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
                  ◎
                </span>

                <strong>
                  {
                    copy.friends
                      .noDiscover
                  }
                </strong>

                <p>
                  {
                    copy.common
                      .webSync
                  }
                </p>
              </div>
            )}
          </>
        ) : tab ===
          'requests' ? (
          snapshot.requests.length ? (
            <div
              className={
                styles.list
              }
            >
              {snapshot.requests.map(
                (
                  request,
                ) => (
                  <article
                    className={
                      styles.listCard
                    }
                    key={
                      request.requestId
                    }
                  >
                    <VerifiedUserAvatar
                      userId={
                        request.userId
                      }
                      name={
                        request.displayName
                      }
                      src={
                        request.photoUrl
                      }
                      country={
                        request.country
                      }
                      className={
                        styles.avatar
                      }
                      badgeSize={
                        17
                      }
                      alt={
                        request.displayName
                      }
                    />

                    <div
                      className={
                        styles.listCopy
                      }
                    >
                      <strong>
                        <Link
                          href={`/users/${request.userId}`}
                          className={
                            styles.profileNameLink
                          }
                        >
                          {
                            request.displayName
                          }
                        </Link>
                      </strong>

                      <div
                        className={
                          styles.listMeta
                        }
                      >
                        {[
                          request.city,
                          request.country,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ', ',
                          )}{' '}
                        ·{' '}
                        {request.primaryLanguage.toUpperCase()}
                      </div>

                      {!!request.interests.length && (
                        <div
                          className={
                            styles.listInterests
                          }
                        >
                          {request.interests
                            .slice(
                              0,
                              5,
                            )
                            .join(
                              ' · ',
                            )}
                        </div>
                      )}
                    </div>

                    <div
                      className={
                        styles.listActions
                      }
                    >
                      <button
                        type="button"
                        className={
                          styles.secondaryAction
                        }
                        disabled={
                          busyId ===
                          request.requestId
                        }
                        onClick={() =>
                          void perform(
                            request.requestId,

                            () =>
                              respondFriendRequestWeb(
                                request.requestId,
                                false,
                              ),
                          )
                        }
                      >
                        {
                          copy.friends
                            .decline
                        }
                      </button>

                      <button
                        type="button"
                        className={
                          styles.primaryAction
                        }
                        disabled={
                          busyId ===
                          request.requestId
                        }
                        onClick={() =>
                          void perform(
                            request.requestId,

                            () =>
                              respondFriendRequestWeb(
                                request.requestId,
                                true,
                              ),

                            'friends',
                          )
                        }
                      >
                        {
                          copy.friends
                            .accept
                        }
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : (
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
                ＋
              </span>

              <strong>
                {
                  copy.friends
                    .noRequests
                }
              </strong>

              <p>
                {
                  copy.friends
                    .requestHint
                }
              </p>
            </div>
          )
        ) : snapshot.connections.length ? (
          <div
            className={
              styles.list
            }
          >
            {snapshot.connections.map(
              (
                friend,
              ) => (
                <article
                  className={
                    styles.listCard
                  }
                  key={
                    friend.userId
                  }
                >
                  <VerifiedUserAvatar
                    userId={
                      friend.userId
                    }
                    name={
                      friend.displayName
                    }
                    src={
                      friend.photoUrl
                    }
                    country={
                      friend.country
                    }
                    className={
                      styles.avatar
                    }
                    badgeSize={
                      17
                    }
                    alt={
                      friend.displayName
                    }
                  />

                  <div
                    className={
                      styles.listCopy
                    }
                  >
                    <strong>
                      <Link
                        href={`/users/${friend.userId}`}
                        className={
                          styles.profileNameLink
                        }
                      >
                        {
                          friend.displayName
                        }
                      </Link>
                    </strong>

                    <div
                      className={
                        styles.listMeta
                      }
                    >
                      {[
                        friend.city,
                        friend.country,
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          ', ',
                        )}{' '}
                      ·{' '}
                      {friend.primaryLanguage.toUpperCase()}
                    </div>

                    <div
                      className={
                        styles.listInterests
                      }
                    >
                      {new Date(
                        friend.connectedAt,
                      ).toLocaleDateString(
                        localeTag(
                          locale,
                        ),
                      )}
                    </div>
                  </div>

                  <div
                    className={
                      styles.listActions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.primaryAction
                      }
                      disabled={
                        busyId ===
                        friend.userId
                      }
                      onClick={() =>
                        openDirectChat(
                          friend,
                        )
                      }
                    >
                      💬{' '}
                      {
                        copy.love
                          .chat
                      }
                    </button>

                    <button
                      type="button"
                      className={
                        styles.friendRemoveAction
                      }
                      disabled={
                        busyId ===
                        friend.userId
                      }
                      onClick={() =>
                        void removeFriend(
                          friend,
                        )
                      }
                    >
                      {
                        copy.friends
                          .unfriend
                      }
                    </button>

                    <button
                      type="button"
                      className={
                        styles.friendDangerAction
                      }
                      disabled={
                        busyId ===
                        friend.userId
                      }
                      onClick={() =>
                        void blockFriend(
                          friend,
                        )
                      }
                    >
                      {
                        copy.friends
                          .block
                      }
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
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
              ☺
            </span>

            <strong>
              {
                copy.friends
                  .noFriends
              }
            </strong>

            <p>
              {
                copy.friends
                  .friendHint
              }
            </p>
          </div>
        )}

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
      </section>
    </div>
  );
}
import {
  getCurrentUser,
  restDelete,
  restSelect,
  restInsert,
  restUpsert,
  rpcRequest,
} from '@/lib/supabase/browser';

type Row = Record<string, unknown>;

export type FriendCandidateWeb = {
  userId: string;
  displayName: string;
  age: number | null;
  city: string;
  country: string;
  nationality: string;

  /**
   * ใช้ Friend introduction เท่านั้น
   * ห้าม fallback ไป Profile bio
   */
  friendIntro: string;

  primaryLanguage: string;
  interests: string[];
  sharedInterests: string[];
  sharedLanguages: string[];
  sharedGoals: string[];
  preferredNationalityMatch: boolean;
  matchScore: number;

  requestStatus:
    | 'none'
    | 'sent'
    | 'received'
    | 'accepted';

  photoUrl: string;

  hangoutStatus:
    | 'none'
    | 'today'
    | 'weekend'
    | 'traveling';

  hangoutActivity: string;
};

export type FriendRequestWeb = {
  requestId: string;
  userId: string;
  displayName: string;
  city: string;
  country: string;
  primaryLanguage: string;
  interests: string[];
  photoUrl: string;
  createdAt: string;
};

export type FriendConnectionWeb = {
  userId: string;
  displayName: string;
  city: string;
  country: string;
  primaryLanguage: string;
  photoUrl: string;
  connectedAt: string;
};

export type FriendSnapshot = {
  candidates: FriendCandidateWeb[];
  requests: FriendRequestWeb[];
  connections: FriendConnectionWeb[];
};

export type DatingProfileWeb = {
  id: string;
  name: string;
  age: number | null;
  dateOfBirth: string;
  gender: string;
  country: string;
  nationality: string;
  province: string;
  city: string;

  /**
   * ใช้ Love introduction เท่านั้น
   * ห้าม fallback ไป Profile bio
   */
  loveIntro: string;

  interests: string[];
  primaryLanguage: string[];
  photoUrls: string[];
  coverUrl: string;
  relationshipGoal: string;
  drinking: string;
  smoking: string;
  exercise: string;
  pets: string;
  matchScore: number;
  sharedInterests: string[];
  recommendationReasons: string[];
  distanceKm: number | null;
  isOnline: boolean;
  lastActiveAt: string;
  travelExperience: string;
  lifestyleTags: string[];
  socialStyle: string;
  createdAt: string;
  profileBoostedAt: string;
};

export type LoveEntitlements = {
  planCode:
    | 'free'
    | 'premium'
    | 'ultimate';

  canSeeLikes: boolean;

  likesRemainingToday:
    | number
    | null;
};

export type LoveSnapshot = {
  recommended: DatingProfileWeb[];
  likesYou: DatingProfileWeb[];
  saved: DatingProfileWeb[];
  matched: DatingProfileWeb[];

  favoriteIds: string[];
  likedIds: string[];

  entitlements: LoveEntitlements;

  filters: {
    genders: string[];
    ageMin: number;
    ageMax: number;
    nationalities: string[];
  };
};

function rowsOf(
  value: unknown,
): Row[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Row =>
        Boolean(item) &&
        typeof item === 'object',
    );
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    return [
      value as Row,
    ];
  }

  return [];
}

function text(
  row: Row,
  ...keys: string[]
) {
  for (
    const key
    of keys
  ) {
    const value =
      row[key];

    if (
      typeof value ===
        'string' &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      typeof value ===
        'number' &&
      Number.isFinite(
        value,
      )
    ) {
      return String(
        value,
      );
    }
  }

  return '';
}

function numberValue(
  row: Row,
  ...keys: string[]
) {
  for (
    const key
    of keys
  ) {
    const value =
      Number(
        row[key],
      );

    if (
      Number.isFinite(
        value,
      )
    ) {
      return value;
    }
  }

  return 0;
}

function boolValue(
  row: Row,
  key: string,
  fallback = false,
) {
  const value =
    row[key];

  if (
    typeof value ===
    'boolean'
  ) {
    return value;
  }

  if (
    value === 'true' ||
    value === 1 ||
    value === '1'
  ) {
    return true;
  }

  if (
    value === 'false' ||
    value === 0 ||
    value === '0'
  ) {
    return false;
  }

  return fallback;
}

function stringArray(
  value: unknown,
) {
  return Array.isArray(
    value,
  )
    ? value
        .map(String)
        .map(
          (item) =>
            item.trim(),
        )
        .filter(Boolean)
    : [];
}


function hasCompleteLiteProfile(row: Row) {
  const lifestyle = row.lifestyle_preferences;
  const life = lifestyle && typeof lifestyle === 'object' && !Array.isArray(lifestyle)
    ? lifestyle as Record<string, unknown>
    : {};

  const hasLifestyle = [
    ['pet', 'pets'],
    ['drink', 'drinking'],
    ['smoke', 'smoking'],
    ['exercise'],
    ['social'],
    ['interests'],
  ].every((keys) =>
    keys.some((key) => stringArray(life[key]).length > 0),
  );

  return Boolean(
    text(row, 'first_name') &&
    text(row, 'last_name') &&
    text(row, 'gender') &&
    text(row, 'date_of_birth') &&
    numberValue(row, 'height_cm') > 0 &&
    text(row, 'nationality', 'country') &&
    text(row, 'education') &&
    text(row, 'marital_status') &&
    stringArray(row.looking_for).length > 0 &&
    stringArray(row.sexual_orientations).length > 0 &&
    hasLifestyle &&
    stringArray(row.photo_paths).length > 0
  );
}

function unique(
  values: string[],
) {
  return [
    ...new Set(
      values.filter(
        Boolean,
      ),
    ),
  ];
}

function storagePhotoUrl(
  path: string,
) {
  if (!path) {
    return '';
  }

  if (
    /^https?:\/\//i.test(
      path,
    )
  ) {
    return path;
  }

  const base = (
    process.env
      .NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).replace(
    /\/$/,
    '',
  );

  if (!base) {
    return '';
  }

  return `${base}/storage/v1/object/public/profile-photos/${path
    .split('/')
    .map(
      encodeURIComponent,
    )
    .join('/')}`;
}

/**
 * ============================================================
 * FRIEND
 * ============================================================
 */

async function blockedIds() {
  const result =
    await rpcRequest<
      Row[]
    >(
      'get_my_blocked_profile_ids',
    );

  if (
    result.error
  ) {
    return new Set<
      string
    >();
  }

  return new Set(
    rowsOf(
      result.data,
    )
      .map(
        (row) =>
          text(
            row,
            'profile_id',
          ),
      )
      .filter(Boolean),
  );
}

function friendCandidate(
  row: Row,
): FriendCandidateWeb {
  const status =
    text(
      row,
      'request_status',
    );

  const hangout =
    text(
      row,
      'hangout_status',
    );

  return {
    userId:
      text(
        row,
        'user_id',
      ),

    displayName:
      text(
        row,
        'first_name',
      ) ||
      (() => {
        const fallback = text(row, 'display_name', 'name', 'full_name');
        return fallback && !fallback.includes('@') ? fallback : 'Melo User';
      })(),

    age:
      row.age == null
        ? null
        : numberValue(
            row,
            'age',
          ),

    city:
      text(
        row,
        'city',
      ),

    country:
      text(
        row,
        'country',
      ),

    nationality:
      text(
        row,
        'nationality',
        'country',
      ),

    /**
     * สำคัญ:
     *
     * ใช้ introduction ที่มาจาก
     * Friend Preferences / Friend candidate RPC
     *
     * ห้ามเอา Profile bio มาใช้
     * และไม่เอา connect_mode_intros
     * มาทับค่าเดิมอีกแล้ว
     */
    friendIntro:
      text(
        row,
        'friend_intro',
        'intro',
      ),

    primaryLanguage:
      text(
        row,
        'primary_language',
      ) ||
      'en',

    interests:
      stringArray(
        row.interests,
      ),

    sharedInterests:
      stringArray(
        row.shared_interests,
      ),

    sharedLanguages:
      stringArray(
        row.shared_languages,
      ),

    sharedGoals:
      stringArray(
        row.shared_goals,
      ),

    preferredNationalityMatch:
      boolValue(
        row,
        'preferred_nationality_match',
      ),

    matchScore:
      Math.max(
        0,
        Math.min(
          100,
          numberValue(
            row,
            'match_score',
          ),
        ),
      ),

    requestStatus:
      status ===
        'sent' ||
      status ===
        'received' ||
      status ===
        'accepted'
        ? status
        : 'none',

    photoUrl:
      storagePhotoUrl(
        text(
          row,
          'photo_path',
        ),
      ),

    hangoutStatus:
      hangout ===
        'today' ||
      hangout ===
        'weekend' ||
      hangout ===
        'traveling'
        ? hangout
        : 'none',

    hangoutActivity:
      text(
        row,
        'hangout_activity',
      ),
  };
}

export async function loadFriendSnapshot(): Promise<FriendSnapshot> {
  const [
    blocked,
    incomingResult,
    connectionsResult,
  ] =
    await Promise.all([
      blockedIds(),

      rpcRequest<
        Row[]
      >(
        'get_incoming_friend_requests',
      ),

      rpcRequest<
        Row[]
      >(
        'get_my_friend_connections',
      ),
    ]);

  let candidateResult =
    await rpcRequest<
      Row[]
    >(
      'get_friend_match_candidates_v2',
      {
        p_limit: 72,
      },
    );

  if (
    candidateResult.error
  ) {
    candidateResult =
      await rpcRequest<
        Row[]
      >(
        'get_friend_match_candidates',
        {
          p_limit:
            72,
        },
      );
  }

  if (
    candidateResult.error
  ) {
    throw new Error(
      candidateResult.error,
    );
  }

  if (
    incomingResult.error
  ) {
    throw new Error(
      incomingResult.error,
    );
  }

  if (
    connectionsResult.error
  ) {
    throw new Error(
      connectionsResult.error,
    );
  }

  /**
   * จุดสำคัญของ Fix:
   *
   * ใช้ friend_intro / intro
   * ที่ Friend candidate RPC ส่งมาโดยตรง
   *
   * ก่อนหน้านี้ค่าตรงนี้ถูก
   * connect_mode_intros ทับอีกครั้ง
   * และสามารถถูกทับเป็นค่าว่างได้
   */
  let candidates =
    rowsOf(
      candidateResult.data,
    )
      .map(
        friendCandidate,
      )
      .filter(
        (item) =>
          item.userId &&
          !blocked.has(
            item.userId,
          ),
      );

  if (
    candidates.length
  ) {
    const presenceResult =
      await rpcRequest<
        Row[]
      >(
        'get_connection_presence_for_users_v1',
        {
          p_user_ids:
            candidates.map(
              (
                item,
              ) =>
                item.userId,
            ),
        },
      );

    if (
      !presenceResult.error
    ) {
      const presence =
        new Map(
          rowsOf(
            presenceResult.data,
          ).map(
            (row) => [
              text(
                row,
                'user_id',
              ),
              row,
            ],
          ),
        );

      candidates =
        candidates
          .map(
            (
              item,
            ): FriendCandidateWeb => {
              const row =
                presence.get(
                  item.userId,
                );

              if (
                !row
              ) {
                return item;
              }

              const status =
                text(
                  row,
                  'hangout_status',
                );

              const hangoutStatus:
                FriendCandidateWeb['hangoutStatus'] =
                status ===
                  'today' ||
                status ===
                  'weekend' ||
                status ===
                  'traveling'
                  ? status
                  : 'none';

              return {
                ...item,

                hangoutStatus,

                hangoutActivity:
                  text(
                    row,
                    'hangout_activity',
                  ),

                matchScore:
                  Math.min(
                    100,
                    item.matchScore +
                      6,
                  ),
              };
            },
          )
          .sort(
            (
              a,
              b,
            ) =>
              b.matchScore -
              a.matchScore,
          );
    }
  }

  const requests =
    rowsOf(
      incomingResult.data,
    )
      .map(
        (row) => ({
          requestId:
            text(
              row,
              'request_id',
            ),

          userId:
            text(
              row,
              'user_id',
            ),

          displayName:
            text(
              row,
              'display_name',
            ) ||
            'Melo User',

          city:
            text(
              row,
              'city',
            ),

          country:
            text(
              row,
              'country',
            ),

          primaryLanguage:
            text(
              row,
              'primary_language',
            ) ||
            'en',

          interests:
            stringArray(
              row.interests,
            ),

          photoUrl:
            storagePhotoUrl(
              text(
                row,
                'photo_path',
              ),
            ),

          createdAt:
            text(
              row,
              'created_at',
            ),
        }),
      )
      .filter(
        (item) =>
          item.requestId &&
          item.userId &&
          !blocked.has(
            item.userId,
          ),
      );

  const connections =
    rowsOf(
      connectionsResult.data,
    )
      .map(
        (row) => ({
          userId:
            text(
              row,
              'user_id',
            ),

          displayName:
            text(
              row,
              'display_name',
            ) ||
            'Melo User',

          city:
            text(
              row,
              'city',
            ),

          country:
            text(
              row,
              'country',
            ),

          primaryLanguage:
            text(
              row,
              'primary_language',
            ) ||
            'en',

          photoUrl:
            storagePhotoUrl(
              text(
                row,
                'photo_path',
              ),
            ),

          connectedAt:
            text(
              row,
              'connected_at',
            ),
        }),
      )
      .filter(
        (item) =>
          item.userId &&
          !blocked.has(
            item.userId,
          ),
      );

  const connectedIds =
    new Set(
      connections.map(
        (item) =>
          item.userId,
      ),
    );

  candidates =
    candidates.filter(
      (item) =>
        item.requestStatus !==
          'accepted' &&
        !connectedIds.has(
          item.userId,
        ),
    );

  return {
    candidates,
    requests,
    connections,
  };
}

export async function sendFriendRequestWeb(
  userId: string,
) {
  const result =
    await rpcRequest(
      'send_friend_request',
      {
        p_target_user_id:
          userId,
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }
}

export async function cancelFriendRequestWeb(
  userId: string,
) {
  const result =
    await rpcRequest(
      'cancel_friend_request',
      {
        p_target_user_id:
          userId,
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }
}

export async function respondFriendRequestWeb(
  requestId: string,
  accept: boolean,
) {
  const result =
    await rpcRequest(
      'respond_to_friend_request',
      {
        p_request_id:
          requestId,

        p_accept:
          accept,
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }
}

function missingRpcSignature(
  message:
    | string
    | null
    | undefined,
) {
  const normalized =
    String(
      message ||
        '',
    ).toLowerCase();

  return (
    normalized.includes(
      'could not find the function',
    ) ||
    normalized.includes(
      'schema cache',
    ) ||
    normalized.includes(
      'pgrst202',
    )
  );
}

async function runFirstFriendMutation(
  candidates: Array<{
    name: string;

    params: Record<
      string,
      unknown
    >;
  }>,
) {
  let lastError =
    '';

  for (
    const candidate
    of candidates
  ) {
    const result =
      await rpcRequest(
        candidate.name,
        candidate.params,
      );

    if (
      !result.error
    ) {
      return;
    }

    lastError =
      result.error;

    if (
      !missingRpcSignature(
        result.error,
      )
    ) {
      throw new Error(
        result.error,
      );
    }
  }

  throw new Error(
    lastError ||
      'Unable to update friend status.',
  );
}

export async function removeFriendWeb(
  userId: string,
) {
  const cleanUserId =
    String(
      userId ||
        '',
    ).trim();

  if (
    !cleanUserId
  ) {
    throw new Error(
      'Friend is required.',
    );
  }

  await runFirstFriendMutation([
    {
      name:
        'remove_friend',

      params: {
        p_other_user_id:
          cleanUserId,
      },
    },

    {
      name:
        'remove_friend',

      params: {
        p_target_user_id:
          cleanUserId,
      },
    },

    {
      name:
        'unfriend_user',

      params: {
        p_other_user_id:
          cleanUserId,
      },
    },

    {
      name:
        'unfriend_user',

      params: {
        p_target_user_id:
          cleanUserId,
      },
    },

    {
      name:
        'remove_friend_connection',

      params: {
        p_other_user_id:
          cleanUserId,
      },
    },

    {
      name:
        'remove_friend_connection',

      params: {
        p_target_user_id:
          cleanUserId,
      },
    },
  ]);
}

export async function blockFriendWeb(
  userId: string,
) {
  const cleanUserId =
    String(
      userId ||
        '',
    ).trim();

  if (
    !cleanUserId
  ) {
    throw new Error(
      'User is required.',
    );
  }

  await runFirstFriendMutation([
    {
      name:
        'block_user',

      params: {
        p_other_user_id:
          cleanUserId,

        p_reason:
          'friend_list',
      },
    },

    {
      name:
        'block_user',

      params: {
        p_other_user_id:
          cleanUserId,
      },
    },

    {
      name:
        'block_user',

      params: {
        p_target_user_id:
          cleanUserId,

        p_reason:
          'friend_list',
      },
    },

    {
      name:
        'block_user',

      params: {
        p_target_user_id:
          cleanUserId,
      },
    },

    {
      name:
        'block_profile',

      params: {
        p_other_user_id:
          cleanUserId,
      },
    },

    {
      name:
        'block_profile',

      params: {
        p_target_user_id:
          cleanUserId,
      },
    },
  ]);
}

/**
 * ============================================================
 * LOVE
 * ============================================================
 */

function calculateAge(
  dateOfBirth: string,
) {
  const match =
    dateOfBirth.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (
    !match
  ) {
    return null;
  }

  const today =
    new Date();

  const year =
    Number(
      match[1],
    );

  const month =
    Number(
      match[2],
    );

  const day =
    Number(
      match[3],
    );

  let age =
    today.getFullYear() -
    year;

  const md =
    today.getMonth() +
    1 -
    month;

  if (
    md < 0 ||
    (
      md === 0 &&
      today.getDate() <
        day
    )
  ) {
    age -= 1;
  }

  return (
    age >= 18 &&
    age <= 120
  )
    ? age
    : null;
}

function canonicalLifestyleTags(row: Row) {
  const raw = row.lifestyle_preferences;
  const lifestyle = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  // Home cards must show ONLY the member's Lifestyle > Interests selections.
  const values = stringArray(lifestyle.interests).map((value) => value.trim()).filter(Boolean);
  const normalized = values.map((value) => value.toLocaleLowerCase());
  const tags = new Set<string>();
  const aliases: Record<string, string[]> = {
    Coffee: ["coffee", "kaffee", "กาแฟ"],
    Travel: ["travel", "reisen", "ท่องเที่ยว", "เดินทาง"],
    Fitness: ["fitness", "ฟิตเนส"],
    Foodie: ["foodie", "อาหาร"],
    Music: ["music", "musik", "ดนตรี"],
    Pets: ["pets", "haustiere", "สัตว์เลี้ยง"],
    Art: ["art", "kunst", "ศิลปะ"],
    Beach: ["beach", "strand", "ทะเล", "ชายหาด"],
  };
  for (const [tag, words] of Object.entries(aliases)) {
    if (normalized.some((value) => words.some((word) => value === word || value.includes(word)))) tags.add(tag);
  }
  return [...tags];
}

function datingProfile(
  row: Row,
): DatingProfileWeb {
  const photoPaths =
    stringArray(
      row.photo_paths,
    );

  return {
    id:
      text(
        row,
        'id',
      ),

    name:
      text(
        row,
        'first_name',
      ),

    age:
      calculateAge(
        text(
          row,
          'date_of_birth',
        ),
      ),

    dateOfBirth:
      text(
        row,
        'date_of_birth',
      ),

    gender:
      text(
        row,
        'gender',
      ),

    country:
      text(
        row,
        'country',
        'nationality',
      ),

    nationality:
      text(
        row,
        'nationality',
        'country',
      ),

    province:
      text(
        row,
        'province',
      ),

    city:
      text(
        row,
        'city',
        'province',
      ),

    /**
     * Love introduction
     * แยกจาก Profile bio
     */
    loveIntro:
      text(
        row,
        'love_intro',
      ),

    interests:
      stringArray(
        row.interests,
      ),

    primaryLanguage:
      [
        text(
          row,
          'primary_language',
        ),
      ].filter(
        Boolean,
      ),

    photoUrls:
      photoPaths
        .map(
          storagePhotoUrl,
        )
        .filter(Boolean),

    coverUrl:
      storagePhotoUrl(
        text(row, 'cover_path', 'cover_url', 'cover_image_url'),
      ),

    // MELO_PUBLIC_LIFESTYLE_JSON_V1
    // Personal Profile Settings stores these values inside
    // profiles.lifestyle_preferences. Keep old columns as fallback
    // for compatibility with older profile records.
    relationshipGoal: (() => {
      const raw = row.lifestyle_preferences;
      const lifestyle =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? raw as Record<string, unknown>
          : {};

      // MELO_RELATIONSHIP_SOUGHT_FILTER_V1
      // looking_for contains both Interested in and Relationship values.
      // Public profile must show relationship values only.
      const looking = stringArray(row.looking_for);

      const interestedInValues = new Set([
        "Men",
        "Women",
        "LGBTQ+",
        "เพศชาย",
        "เพศหญิง",
        "Männer",
        "Frauen",
      ]);

      const relationships = Array.from(
        new Set(
          looking
            .map((value) => value.trim())
            .filter(Boolean)
            .filter((value) => !interestedInValues.has(value)),
        ),
      );

      return (
        relationships.join(", ") ||
        text(row, "relationship_goal", "relationship_type")
      );
    })(),

    drinking: (() => {
      const raw = row.lifestyle_preferences;
      const lifestyle =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? raw as Record<string, unknown>
          : {};

      return stringArray(lifestyle.drink).join(", ") || text(row, "drinking");
    })(),

    smoking: (() => {
      const raw = row.lifestyle_preferences;
      const lifestyle =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? raw as Record<string, unknown>
          : {};

      return stringArray(lifestyle.smoke).join(", ") || text(row, "smoking");
    })(),

    exercise: (() => {
      const raw = row.lifestyle_preferences;
      const lifestyle =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? raw as Record<string, unknown>
          : {};

      return stringArray(lifestyle.exercise).join(", ") || text(row, "exercise");
    })(),

    pets: (() => {
      const raw = row.lifestyle_preferences;
      const lifestyle =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? raw as Record<string, unknown>
          : {};

      return stringArray(lifestyle.pet).join(", ") || text(row, "pets");
    })(),

    matchScore:
      Math.max(
        0,
        Math.min(
          100,
          numberValue(
            row,
            'match_score',
            'compatibility_score',
          ),
        ),
      ),

    sharedInterests:
      stringArray(
        row.shared_interests,
      ),

    recommendationReasons:
      stringArray(
        row.recommendation_reasons ??
          row.match_reasons,
      ),

    distanceKm:
      row.distance_km ==
        null
        ? null
        : Math.max(
            0,
            numberValue(
              row,
              'distance_km',
            ),
          ),

    isOnline:
      boolValue(
        row,
        'is_online',
      ),

    lastActiveAt:
      text(
        row,
        'last_active_at',
      ),

    travelExperience:
      text(
        row,
        'travel_experience',
        'travel_level',
      ),

    lifestyleTags: canonicalLifestyleTags(row),

    socialStyle: (() => {
      const raw = row.lifestyle_preferences;
      const lifestyle = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
      return stringArray(lifestyle.social)[0] || "";
    })(),

    createdAt: text(row, 'created_at'),

    profileBoostedAt: text(row, 'profile_boosted_at'),
  };
}

async function profilesByIds(
  ids: string[],
) {
  const ordered =
    unique(
      ids,
    ).slice(
      0,
      100,
    );

  if (
    !ordered.length
  ) {
    return [];
  }

  /**
   * เพิ่ม love_intro ใน SELECT
   */
  const result =
    await restSelect<
      Row[]
    >(
      'profiles',
      `select=*&id=in.(${ordered.join(
        ',',
      )})`,
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  const map =
    new Map(
      rowsOf(
        result.data,
      ).map(
        (row) => [
          text(
            row,
            'id',
          ),

          datingProfile(
            row,
          ),
        ],
      ),
    );

  return ordered
    .map(
      (id) =>
        map.get(
          id,
        ),
    )
    .filter(
      (
        item,
      ): item is DatingProfileWeb =>
        Boolean(
          item,
        ),
    );
}

/**
 * โหลดเฉพาะ Love introduction
 * จาก profiles โดยตรง
 *
 * ใช้สำหรับ Feed RPC ที่ไม่ได้คืน love_intro
 */
async function profileLoveIntrosByIds(
  ids: string[],
) {
  const ordered =
    unique(
      ids,
    ).slice(
      0,
      100,
    );

  const map =
    new Map<
      string,
      string
    >();

  if (
    !ordered.length
  ) {
    return map;
  }

  const result =
    await restSelect<
      Row[]
    >(
      'profiles',
      `select=id,love_intro&id=in.(${ordered.join(
        ',',
      )})`,
    );

  if (
    result.error
  ) {
    /**
     * ไม่ทำให้ Connect พัง
     * ถ้า column หรือ query
     * มีปัญหาชั่วคราว
     */
    return map;
  }

  for (
    const row
    of rowsOf(
      result.data,
    )
  ) {
    const id =
      text(
        row,
        'id',
      );

    if (
      !id
    ) {
      continue;
    }

    map.set(
      id,
      text(
        row,
        'love_intro',
      ),
    );
  }

  return map;
}

async function loadEntitlements(): Promise<LoveEntitlements> {
  const result =
    await rpcRequest<
      Row
    >(
      'get_my_package_entitlements',
    );

  if (
    result.error
  ) {
    return {
      planCode:
        'free',

      canSeeLikes:
        false,

      likesRemainingToday:
        30,
    };
  }

  const row =
    rowsOf(
      result.data,
    )[0] ??
    {};

  const plan =
    text(
      row,
      'plan_code',
    );

  const rawRemaining =
    row.likes_remaining_today;

  return {
    planCode:
      plan ===
        'premium' ||
      plan ===
        'ultimate'
        ? plan
        : 'free',

    canSeeLikes:
      boolValue(
        row,
        'can_see_likes',
        plan ===
          'premium' ||
          plan ===
            'ultimate',
      ),

    likesRemainingToday:
      rawRemaining ==
        null
        ? null
        : Math.max(
            0,
            numberValue(
              row,
              'likes_remaining_today',
            ),
          ),
  };
}

async function loadIncomingLikeIds(
  userId: string,
  canSeeLikes: boolean,
) {
  // Melo Chat Lite Connect must use the same Supabase source of truth as Feed.
  // Prefer the entitlement-aware RPC when available, but do not turn the list
  // into an empty array before trying the RLS-protected profile_likes table.
  const rpc = canSeeLikes
    ? await rpcRequest<
      Row[]
    >(
      'get_my_incoming_like_ids',
    )
    : { data: null, error: 'likes-rpc-not-used' };

  if (
    !rpc.error
  ) {
    return unique(
      rowsOf(
        rpc.data,
      ).map(
        (row) =>
          text(
            row,
            'liker_id',
            'profile_id',
            'user_id',
          ),
      ),
    );
  }

  const fallback =
    await restSelect<
      Row[]
    >(
      'profile_likes',
      `select=liker_id&liked_user_id=eq.${encodeURIComponent(
        userId,
      )}&order=created_at.desc`,
    );

  if (
    fallback.error
  ) {
    return [];
  }

  return unique(
    rowsOf(
      fallback.data,
    ).map(
      (row) =>
        text(
          row,
          'liker_id',
        ),
    ),
  );
}

async function datingActions(
  userId: string,
  canSeeLikes: boolean,
) {
  const encoded =
    encodeURIComponent(
      userId,
    );

  const [
    outgoing,
    favorites,
    matchA,
    matchB,
    incomingIds,
    follows,
    passes,
  ] =
    await Promise.all([
      restSelect<
        Row[]
      >(
        'profile_likes',
        `select=liked_user_id,created_at&liker_id=eq.${encoded}&order=created_at.desc`,
      ),

      restSelect<
        Row[]
      >(
        'profile_favorites',
        `select=favorite_user_id,created_at&owner_id=eq.${encoded}&order=created_at.desc`,
      ),

      restSelect<
        Row[]
      >(
        'profile_matches',
        `select=id,user_a_id,user_b_id,matched_at&user_a_id=eq.${encoded}&order=matched_at.desc`,
      ),

      restSelect<
        Row[]
      >(
        'profile_matches',
        `select=id,user_a_id,user_b_id,matched_at&user_b_id=eq.${encoded}&order=matched_at.desc`,
      ),

      loadIncomingLikeIds(
        userId,
        canSeeLikes,
      ),

      restSelect<Row[]>(
        'profile_follows',
        `select=followed_user_id,created_at&follower_id=eq.${encoded}&order=created_at.desc`,
      ),

      restSelect<Row[]>(
        'profile_passes',
        `select=passed_user_id,created_at&owner_id=eq.${encoded}&order=created_at.desc`,
      ),
    ]);

  const error =
    outgoing.error ||
    favorites.error ||
    matchA.error ||
    matchB.error ||
    follows.error ||
    passes.error;

  // Fresh Lite projects may not have the legacy action tables yet.
  // Treat missing action data as empty so recommendations can still load.
  if (error) {
    return { likedIds: [], favoriteIds: [], matchedIds: [], incomingLikeIds: [], followedIds: [], passedIds: [] };
  }

  const likedIds =
    unique(
      rowsOf(
        outgoing.data,
      ).map(
        (row) =>
          text(
            row,
            'liked_user_id',
          ),
      ),
    );

  const favoriteIds =
    unique(
      rowsOf(
        favorites.data,
      ).map(
        (row) =>
          text(
            row,
            'favorite_user_id',
          ),
      ),
    );

  const followedIds = unique(rowsOf(follows.data).map((row) => text(row, 'followed_user_id')));
  const passedIds = unique(rowsOf(passes.data).map((row) => text(row, 'passed_user_id')));

  const matchedIds =
    unique(
      [
        ...rowsOf(
          matchA.data,
        ),

        ...rowsOf(
          matchB.data,
        ),
      ]
        .map(
          (row) => {
            const a =
              text(
                row,
                'user_a_id',
              );

            const b =
              text(
                row,
                'user_b_id',
              );

            return a ===
              userId
              ? b
              : a;
          },
        )
        .filter(Boolean),
    );

  const matchedSet =
    new Set(
      matchedIds,
    );

  return {
    likedIds,
    favoriteIds,
    matchedIds,
    followedIds,
    passedIds,

    incomingLikeIds:
      incomingIds.filter(
        (id) =>
          !matchedSet.has(
            id,
          ),
      ),
  };
}

function countryKey(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(
      /\s+/g,
      ' ',
    );
}

function recommendedForViewer(
  row: Row,
  filters:
    LoveSnapshot['filters'],
) {
  const age =
    calculateAge(
      text(
        row,
        'date_of_birth',
      ),
    );

  const gender =
    text(
      row,
      'gender',
    );

  const candidateCountry =
    text(
      row,
      'nationality',
      'country',
    );

  const genderOk =
    !filters.genders.length ||
    Boolean(
      gender &&
      filters.genders.includes(
        gender,
      ),
    );

  // Fresh Lite profiles do not require date of birth yet. Do not hide an otherwise
  // valid profile only because age has not been collected. Once DOB exists, apply
  // the configured age range normally.
  const ageOk =
    age === null ||
    (age >= filters.ageMin && age <= filters.ageMax);

  const wanted =
    filters.nationalities
      .map(
        countryKey,
      )
      .filter(Boolean);

  return (
    genderOk &&
    ageOk &&
    (
      !wanted.length ||
      wanted.includes(
        countryKey(
          candidateCountry,
        ),
      )
    )
  );
}

async function loadRecommended(
  filters:
    LoveSnapshot['filters'],

  likedIds:
    Set<string>,

  passedIds:
    Set<string>,

  userId: string,
) {
  const names = [
    'get_dating_feed_profiles_v5',
    'get_dating_feed_profiles_v4',
    'get_dating_feed_profiles_v3',
    'get_dating_feed_profiles_v2',
  ];

  let rows:
    Row[] = [];

  let lastError =
    '';

  for (
    const name
    of names
  ) {
    const result =
      await rpcRequest<
        Row[]
      >(
        name,
        {
          p_limit:
            100,
        },
      );

    if (
      !result.error
    ) {
      rows =
        rowsOf(
          result.data,
        );

      lastError =
        '';

      break;
    }

    lastError =
      result.error;
  }

  if (lastError || rows.length === 0) {
    // Lite must still discover real users when legacy dating RPCs are missing
    // or exist but have no rows yet. The current profiles table is the source of truth.
    const fallback = await restSelect<Row[]>(
      'profiles',
      'select=*&limit=100',
    );
    if (fallback.error) throw new Error(fallback.error);
    rows = rowsOf(fallback.data);
  }

  // Home discovery ranking: recently joined profiles stay near the front, while a
  // profile boost behaves like a fresh discovery activity and can move an older
  // profile back to the front. Some legacy dating RPCs do not expose the profile
  // timestamps, so merge those fields from profiles before ranking.
  const candidateIds = unique(rows.map((row) => text(row, 'id')).filter(Boolean)).slice(0, 100);
  if (candidateIds.length) {
    const meta = await restSelect<Row[]>(
      'profiles',
      `select=id,created_at,profile_boosted_at&id=in.(${candidateIds.join(',')})`,
    );
    if (!meta.error) {
      const metaById = new Map(rowsOf(meta.data).map((row) => [text(row, 'id'), row]));
      rows = rows.map((row) => {
        const extra = metaById.get(text(row, 'id'));
        return extra ? { ...row, created_at: extra.created_at ?? row.created_at, profile_boosted_at: extra.profile_boosted_at ?? row.profile_boosted_at } : row;
      });
    }
  }

  const rankScores = new Map<string, number>();
  if (candidateIds.length) {
    const ranked = await rpcRequest<Array<{profile_id?: string; ranking_score?: number}>>(
      'melo_profile_discovery_scores_v25',
      { p_profile_ids: candidateIds },
    );
    if (!ranked.error && Array.isArray(ranked.data)) {
      for (const item of ranked.data) {
        const id = String(item?.profile_id || '');
        const score = Number(item?.ranking_score || 0);
        if (id) rankScores.set(id, score);
      }
    }
  }

  return rows
    .filter(
      (row) =>
        text(
          row,
          'id',
        ) &&
        text(
          row,
          'id',
        ) !==
          userId,
    )
    .filter(
      (row) =>
        !likedIds.has(
          text(
            row,
            'id',
          ),
        ),
    )
    .filter((row) => !passedIds.has(text(row, 'id')))
    .filter(hasCompleteLiteProfile)
    .filter(
      (row) =>
        recommendedForViewer(
          row,
          filters,
        ),
    )
    .sort((a, b) => {
      const aId = text(a, 'id');
      const bId = text(b, 'id');
      const aTime = new Date(text(a, 'profile_boosted_at') || text(a, 'created_at') || 0).getTime();
      const bTime = new Date(text(b, 'profile_boosted_at') || text(b, 'created_at') || 0).getTime();
      const aScore = rankScores.get(aId) ?? Math.floor(aTime / 1000);
      const bScore = rankScores.get(bId) ?? Math.floor(bTime / 1000);
      return bScore - aScore;
    })
    .map(
      datingProfile,
    );
}

export async function boostMyDatingProfile(): Promise<string> {
  const result = await rpcRequest<string>('boost_my_profile', {});
  if (result.error) throw new Error(result.error);
  return typeof result.data === 'string' ? result.data : new Date().toISOString();
}

export async function loadDatingProfileById(profileId: string): Promise<DatingProfileWeb | null> {
  if (!profileId) return null;
  const rows = await profilesByIds([profileId]);
  return rows[0] || null;
}

export async function loadLoveSnapshot(
  userId: string,
): Promise<LoveSnapshot> {
  const profileResult =
    await restSelect<
      Row[]
    >(
      'profiles',
      `select=*&id=eq.${encodeURIComponent(
        userId,
      )}&limit=1`,
    );

  if (
    profileResult.error
  ) {
    throw new Error(
      profileResult.error,
    );
  }

  const viewer =
    rowsOf(
      profileResult.data,
    )[0] ??
    {};

  const filters = {
    genders:
      stringArray(
        viewer.interested_genders,
      ),

    ageMin:
      Math.max(
        18,
        numberValue(
          viewer,
          'preferred_age_min',
        ) ||
          18,
      ),

    ageMax:
      Math.min(
        80,
        numberValue(
          viewer,
          'preferred_age_max',
        ) ||
          80,
      ),

    nationalities:
      stringArray(
        viewer.preferred_nationalities,
      ).slice(
        0,
        3,
      ),
  };

  const entitlements =
    await loadEntitlements();

  const actions =
    await datingActions(
      userId,
      entitlements.canSeeLikes,
    );

  const likedSet =
    new Set(
      actions.likedIds,
    );

  const passedSet = new Set(actions.passedIds);

  const [
    rawRecommended,
    rawLikesYou,
    rawSaved,
    rawMatched,
  ] =
    await Promise.all([
      loadRecommended(
        filters,
        likedSet,
        passedSet,
        userId,
      ),

      profilesByIds(
        actions.incomingLikeIds,
      ),

      profilesByIds(
        actions.favoriteIds,
      ),

      profilesByIds(
        actions.matchedIds,
      ),
    ]);

  /**
   * รวม ID ทุกกลุ่มแล้วโหลด
   * profiles.love_intro โดยตรง
   *
   * ไม่ใช้ Profile bio
   * ไม่ใช้ connect_mode_intros
   */
  const allIds =
    unique([
      ...rawRecommended.map(
        (
          item,
        ) =>
          item.id,
      ),

      ...rawLikesYou.map(
        (
          item,
        ) =>
          item.id,
      ),

      ...rawSaved.map(
        (
          item,
        ) =>
          item.id,
      ),

      ...rawMatched.map(
        (
          item,
        ) =>
          item.id,
      ),
    ]);

  const loveIntroMap =
    await profileLoveIntrosByIds(
      allIds,
    );

  const withLoveIntro =
    (
      list:
        DatingProfileWeb[],
    ) =>
      list.map(
        (
          profile,
        ) => {
          const loveIntro =
            loveIntroMap.get(
              profile.id,
            ) ||
            profile.loveIntro ||
            '';

          if (
            loveIntro ===
            profile.loveIntro
          ) {
            return profile;
          }

          return {
            ...profile,
            loveIntro,
          };
        },
      );

  return {
    recommended:
      withLoveIntro(
        rawRecommended,
      ),

    likesYou:
      withLoveIntro(
        rawLikesYou,
      ),

    saved:
      withLoveIntro(
        rawSaved,
      ),

    matched:
      withLoveIntro(
        rawMatched,
      ),

    favoriteIds:
      actions.favoriteIds,

    likedIds:
      actions.likedIds,

    entitlements,

    filters,
  };
}

export async function setLoveLike(
  userId: string,
  liked = true,
): Promise<{
  isMatch: boolean;
  matchId: string | null;
}> {
  const result =
    await rpcRequest<
      Row | Row[]
    >(
      'set_profile_like',
      {
        p_target_user_id:
          userId,

        p_liked:
          liked,
      },
    );

  if (!result.error) {
    const row = rowsOf(result.data)[0] ?? {};
    return {
      isMatch: boolValue(row, 'is_match'),
      matchId: text(row, 'match_id') || null,
    };
  }

  // Melo Chat Lite uses a fresh Supabase project where the legacy
  // set_profile_like RPC may not exist. Fall back to the RLS-protected
  // profile_likes table so Home/Profile actions keep working.
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) throw new Error(result.error);

  const targetId = encodeURIComponent(userId);
  const viewerId = encodeURIComponent(currentUser.id);
  if (liked) {
    // profile_likes intentionally has INSERT/DELETE RLS policies but no UPDATE
    // policy. PostgREST upsert can take the UPDATE path when this pair already
    // exists, which Supabase rejects with a row-level security USING error.
    // Remove our own existing pair first so the following upsert is always an
    // INSERT and stays within the table's current RLS rules.
    const clearExisting = await restDelete(
      'profile_likes',
      `liker_id=eq.${viewerId}&liked_user_id=eq.${targetId}`,
    );
    if (clearExisting.error) throw new Error(clearExisting.error);

    const write = await restInsert(
      'profile_likes',
      { liker_id: currentUser.id, liked_user_id: userId },
    );
    if (write.error) throw new Error(write.error);
  } else {
    const remove = await restDelete(
      'profile_likes',
      `liker_id=eq.${viewerId}&liked_user_id=eq.${targetId}`,
    );
    if (remove.error) throw new Error(remove.error);
  }

  const reciprocal = liked
    ? await restSelect<Row[]>(
        'profile_likes',
        `select=liker_id&liker_id=eq.${targetId}&liked_user_id=eq.${viewerId}&limit=1`,
      )
    : { data: [] as Row[], error: null };

  return {
    isMatch: !reciprocal.error && rowsOf(reciprocal.data).length > 0,
    matchId: null,
  };
}

export async function loadProfileSocialState(userId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) throw new Error('Authentication required.');
  const viewerId = encodeURIComponent(currentUser.id);
  const targetId = encodeURIComponent(userId);
  const [liked, followed, passed, matchA, matchB] = await Promise.all([
    restSelect<Row[]>('profile_likes', `select=liked_user_id&liker_id=eq.${viewerId}&liked_user_id=eq.${targetId}&limit=1`),
    restSelect<Row[]>('profile_follows', `select=followed_user_id&follower_id=eq.${viewerId}&followed_user_id=eq.${targetId}&limit=1`),
    restSelect<Row[]>('profile_passes', `select=passed_user_id&owner_id=eq.${viewerId}&passed_user_id=eq.${targetId}&limit=1`),
    restSelect<Row[]>('profile_matches', `select=id&user_a_id=eq.${viewerId}&user_b_id=eq.${targetId}&limit=1`),
    restSelect<Row[]>('profile_matches', `select=id&user_a_id=eq.${targetId}&user_b_id=eq.${viewerId}&limit=1`),
  ]);
  const error = liked.error || followed.error || passed.error || matchA.error || matchB.error;
  if (error) throw new Error(error);
  return {
    liked: rowsOf(liked.data).length > 0,
    followed: rowsOf(followed.data).length > 0,
    passed: rowsOf(passed.data).length > 0,
    matched: rowsOf(matchA.data).length > 0 || rowsOf(matchB.data).length > 0,
  };
}

export async function loadFollowedProfileIds(): Promise<string[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return [];
  const result = await restSelect<Row[]>('profile_follows', `select=followed_user_id,created_at&follower_id=eq.${encodeURIComponent(currentUser.id)}&order=created_at.desc`);
  if (result.error) throw new Error(result.error);
  return unique(rowsOf(result.data).map((row) => text(row, 'followed_user_id')));
}

export async function setProfileFollow(userId: string, following: boolean): Promise<boolean> {
  const result = await rpcRequest<boolean>('set_profile_follow', { p_target_user_id: userId, p_following: following });
  if (result.error) throw new Error(result.error);
  return typeof result.data === 'boolean' ? result.data : following;
}

export async function setProfilePass(userId: string): Promise<void> {
  const result = await rpcRequest('set_profile_pass', { p_target_user_id: userId });
  if (result.error) throw new Error(result.error);
}

export async function setLoveFavorite(
  userId: string,
  favorite: boolean,
): Promise<boolean> {
  const result =
    await rpcRequest<
      boolean
    >(
      'set_profile_favorite',
      {
        p_target_user_id:
          userId,

        p_favorite:
          favorite,
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  return typeof result.data ===
    'boolean'
    ? result.data
    : favorite;
}

export function zodiacFromDate(
  dateOfBirth: string,
  locale: string,
) {
  const match =
    dateOfBirth.match(
      /^\d{4}-(\d{2})-(\d{2})$/,
    );

  if (
    !match
  ) {
    return '';
  }

  const month =
    Number(
      match[1],
    );

  const day =
    Number(
      match[2],
    );

  const index = [
    day >= 20
      ? 1
      : 0,

    day >= 19
      ? 2
      : 1,

    day >= 21
      ? 3
      : 2,

    day >= 20
      ? 4
      : 3,

    day >= 21
      ? 5
      : 4,

    day >= 21
      ? 6
      : 5,

    day >= 23
      ? 7
      : 6,

    day >= 23
      ? 8
      : 7,

    day >= 23
      ? 9
      : 8,

    day >= 22
      ? 10
      : 9,

    day >= 22
      ? 11
      : 10,

    day >= 22
      ? 0
      : 11,
  ][month - 1];

  const names:
    Record<
      string,
      string[]
    > = {
    th: [
      'มังกร',
      'กุมภ์',
      'มีน',
      'เมษ',
      'พฤษภ',
      'เมถุน',
      'กรกฎ',
      'สิงห์',
      'กันย์',
      'ตุล',
      'พิจิก',
      'ธนู',
    ],

    en: [
      'Capricorn',
      'Aquarius',
      'Pisces',
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
    ],

    de: [
      'Steinbock',
      'Wassermann',
      'Fische',
      'Widder',
      'Stier',
      'Zwillinge',
      'Krebs',
      'Löwe',
      'Jungfrau',
      'Waage',
      'Skorpion',
      'Schütze',
    ],

    zh: [
      '摩羯座',
      '水瓶座',
      '双鱼座',
      '白羊座',
      '金牛座',
      '双子座',
      '巨蟹座',
      '狮子座',
      '处女座',
      '天秤座',
      '天蝎座',
      '射手座',
    ],

    ja: [
      'やぎ座',
      'みずがめ座',
      'うお座',
      'おひつじ座',
      'おうし座',
      'ふたご座',
      'かに座',
      'しし座',
      'おとめ座',
      'てんびん座',
      'さそり座',
      'いて座',
    ],

    ko: [
      '염소자리',
      '물병자리',
      '물고기자리',
      '양자리',
      '황소자리',
      '쌍둥이자리',
      '게자리',
      '사자자리',
      '처녀자리',
      '천칭자리',
      '전갈자리',
      '사수자리',
    ],
  };

  return (
    names[locale]?.[
      index
    ] ??
    names.en[index]
  );
}


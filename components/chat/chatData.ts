"use client";

import { resolveCommerceMedia } from "@/components/commerce/commerceMedia";
import {
  getCurrentUser,
  getStoredSession,
  publicStorageUrl,
  restSelect,
  restUpsert,
  rpcRequest,
  uploadStorageObject,
} from "@/lib/supabase/browser";

export type ChatCategory = "direct" | "trip" | "event" | "community";

export type ChatRoom = {
  id: string;
  category: ChatCategory;
  title: string;
  subtitle: string;
  avatarUrl: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  href: string;
  businessId?: string;
  userId?: string;
  country?: string;
  nationality?: string;
  viewerSide?: "user" | "business";
};

export type DirectChatTarget = {
  userId: string;
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  country?: string;
  nationality?: string;
};

export type ChatSnapshot = {
  rooms: Record<ChatCategory, ChatRoom[]>;
  counts: Record<ChatCategory, number>;
  totalUnread: number;
};

type Row = Record<string, any>;

const EMPTY_ROOMS: Record<ChatCategory, ChatRoom[]> = {
  direct: [],
  trip: [],
  event: [],
  community: [],
};

function rows(value: unknown): Row[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item) => item && typeof item === "object",
    ) as Row[];
  }

  if (value && typeof value === "object") {
    return [value as Row];
  }

  return [];
}

function value(
  row: Row | null | undefined,
  keys: string[],
) {
  if (!row) return null;

  for (const key of keys) {
    const current = row[key];

    if (
      current !== undefined &&
      current !== null &&
      String(current).trim() !== ""
    ) {
      return current;
    }
  }

  return null;
}

function text(
  row: Row | null | undefined,
  keys: string[],
  fallback = "",
) {
  const current = value(row, keys);

  return current == null
    ? fallback
    : String(current).trim();
}

function numberOf(
  row: Row | null | undefined,
  keys: string[],
) {
  const current = Number(
    value(row, keys) || 0,
  );

  return Number.isFinite(current)
    ? Math.max(0, current)
    : 0;
}

function photo(
  row: Row | null | undefined,
) {
  const direct = text(row, [
    "avatar_url",
    "photo_url",
    "photo_path",
    "profile_photo",
    "image_url",
    "cover_url",
  ]);

  if (direct) {
    return publicStorageUrl(
      "profile-photos",
      direct,
    );
  }

  const paths = value(row, [
    "photo_paths",
    "photos",
  ]);

  if (
    Array.isArray(paths) &&
    paths[0]
  ) {
    return publicStorageUrl(
      "profile-photos",
      String(paths[0]),
    );
  }

  return "";
}

function missingFunction(
  message: string | null | undefined,
) {
  const normalized = String(
    message || "",
  ).toLowerCase();

  return (
    normalized.includes(
      "could not find the function",
    ) ||
    normalized.includes(
      "pgrst202",
    ) ||
    (
      normalized.includes(
        "function",
      ) &&
      normalized.includes(
        "schema cache",
      )
    )
  );
}

async function firstRpc(
  names: Array<{
    name: string;
    params?: Record<string, unknown>;
  }>,
) {
  let lastError = "";

  for (const candidate of names) {
    const result =
      await rpcRequest<unknown>(
        candidate.name,
        candidate.params || {},
      );

    if (!result.error) {
      return {
        data: rows(result.data),
        error: "",
      };
    }

    lastError = result.error;

    if (
      !missingFunction(
        result.error,
      )
    ) {
      // Continue because older Melo installs may expose
      // a sibling RPC with the same purpose.
      continue;
    }
  }

  return {
    data: [] as Row[],
    error: lastError,
  };
}

function notificationMeta(
  row: Row,
) {
  for (
    const key of [
      "data",
      "payload",
      "metadata",
      "meta",
    ]
  ) {
    const candidate = row[key];

    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      return candidate as Row;
    }
  }

  return {} as Row;
}

function isUnreadNotification(
  row: Row,
) {
  if (
    row.is_read === false ||
    row.read === false ||
    row.seen === false
  ) {
    return true;
  }

  if (
    row.read_at === null ||
    row.seen_at === null
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        row,
        "read_at",
      ) ||
      Object.prototype.hasOwnProperty.call(
        row,
        "seen_at",
      )
    ) {
      return true;
    }
  }

  return false;
}

function categoryFromNotification(
  row: Row,
): ChatCategory | null {
  const meta =
    notificationMeta(row);

  const raw = [
    text(row, [
      "type",
      "notification_type",
      "kind",
      "event_type",
    ]),
    text(meta, [
      "type",
      "notification_type",
      "kind",
      "activity_type",
      "entity_type",
    ]),
  ]
    .join(" ")
    .toLowerCase();

  if (!raw) {
    return null;
  }

  if (
    raw.includes("trip") &&
    (
      raw.includes("chat") ||
      raw.includes("message")
    )
  ) {
    return "trip";
  }

  if (
    (
      raw.includes("event") ||
      raw.includes("activity")
    ) &&
    (
      raw.includes("chat") ||
      raw.includes("message")
    )
  ) {
    return "event";
  }

  if (
    raw.includes("community") &&
    (
      raw.includes("chat") ||
      raw.includes("message")
    )
  ) {
    return "community";
  }

  if (
    raw.includes(
      "direct_message",
    ) ||
    raw.includes(
      "private_message",
    ) ||
    raw.includes(
      "chat_message",
    ) ||
    raw.includes("message")
  ) {
    return "direct";
  }

  return null;
}

function notificationEntityId(
  row: Row,
  category: ChatCategory,
) {
  const meta =
    notificationMeta(row);

  const keys =
    category === "trip"
      ? [
          "trip_id",
          "activity_id",
          "entity_id",
        ]
      : category === "event"
        ? [
            "event_id",
            "activity_id",
            "entity_id",
          ]
        : category ===
            "community"
          ? [
              "community_id",
              "activity_id",
              "entity_id",
            ]
          : [
              "conversation_id",
              "chat_id",
              "entity_id",
            ];

  return (
    text(meta, keys) ||
    text(row, keys)
  );
}

async function loadUnreadNotifications() {
  const result =
    await restSelect<Row[]>(
      "app_notifications",
      "select=*&order=created_at.desc&limit=500",
    );

  if (result.error) {
    return [];
  }

  return rows(
    result.data,
  ).filter(
    isUnreadNotification,
  );
}

function notificationCounts(
  notifications: Row[],
) {
  const totals: Record<
    ChatCategory,
    number
  > = {
    direct: 0,
    trip: 0,
    event: 0,
    community: 0,
  };

  const roomCounts =
    new Map<string, number>();

  for (
    const row
    of notifications
  ) {
    const category =
      categoryFromNotification(
        row,
      );

    if (!category) continue;

    totals[category] += 1;

    const id =
      notificationEntityId(
        row,
        category,
      );

    if (id) {
      const key =
        `${category}:${id}`;

      roomCounts.set(
        key,
        (
          roomCounts.get(key) ||
          0
        ) + 1,
      );
    }
  }

  return {
    totals,
    roomCounts,
  };
}

function directRoom(
  row: Row,
): ChatRoom | null {
  const id = text(row, [
    "conversation_id",
    "chat_id",
    "id",
  ]);

  if (!id) {
    return null;
  }

  return {
    id,

    category:
      "direct",

    title:
      text(
        row,
        [
          "display_name",
          "other_user_name",
          "partner_name",
          "name",
          "title",
        ],
        "Melo member",
      ),

    subtitle:
      text(row, [
        "city",
        "country",
        "status_text",
        "subtitle",
      ]),

    avatarUrl:
      photo(row),

    lastMessage:
      text(row, [
        "last_message",
        "last_message_text",
        "message_preview",
        "preview",
      ]),

    lastMessageAt:
      text(row, [
        "last_message_at",
        "updated_at",
        "created_at",
      ]),

    unreadCount:
      numberOf(row, [
        "unread_count",
        "unread",
        "unread_messages",
      ]),

    href:
      `/chat?type=direct&room=${encodeURIComponent(
        id,
      )}`,

    userId:
      text(row, [
        "other_user_id",
        "partner_user_id",
        "user_id",
        "profile_id",
      ]) || undefined,

    country:
      text(row, [
        "country",
        "other_user_country",
      ]) || undefined,

    nationality:
      text(row, [
        "nationality",
        "other_user_nationality",
      ]) || undefined,

    viewerSide:
      "user",
  };
}

function businessPhoto(
  row: Row | null | undefined,
) {
  const raw = text(row, [
    "_resolved_business_avatar_url",
    "business_avatar_url",
    "business_logo_url",
    "profile_image_url",
    "profile_photo_url",
    "avatar_url",
    "logo_url",
    "cover_url",
    "image_url",
    "logo_path",
    "cover_image_path",
    "cover_storage_path",
    "profile_image_path",
    "image_path",
  ]);

  if (!raw) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      raw,
    )
  ) {
    return raw;
  }

  const normalized =
    raw.replace(/^\/+/, "");

  if (
    normalized.startsWith(
      "business-media/",
    )
  ) {
    return publicStorageUrl(
      "business-media",
      normalized.slice(
        "business-media/".length,
      ),
    );
  }

  if (
    normalized.startsWith(
      "business-images/",
    )
  ) {
    return publicStorageUrl(
      "business-images",
      normalized.slice(
        "business-images/".length,
      ),
    );
  }

  return publicStorageUrl(
    "business-media",
    normalized,
  );
}

function businessRoom(
  row: Row,
): ChatRoom | null {
  const id =
    text(row, [
      "conversation_id",
      "chat_id",
      "id",
    ]);

  const businessId =
    text(row, [
      "business_id",
      "store_id",
      "partner_id",
    ]);

  if (!id) {
    return null;
  }

  return {
    id,

    category:
      "direct",

    businessId:
      businessId ||
      undefined,

    title:
      text(
        row,
        [
          "business_name",
          "store_name",
          "partner_name",
          "display_name",
          "legal_name",
          "name",
          "title",
        ],
        "Melo Partner",
      ),

    subtitle:
      text(
        row,
        [
          "city",
          "country",
          "status_text",
          "subtitle",
        ],
        "Partner",
      ),

    avatarUrl:
      businessPhoto(row),

    lastMessage:
      text(row, [
        "last_message",
        "last_message_text",
        "message_preview",
        "preview",
      ]),

    lastMessageAt:
      text(row, [
        "last_message_at",
        "updated_at",
        "created_at",
      ]),

    unreadCount:
      numberOf(row, [
        "unread_count",
        "unread",
        "unread_messages",
      ]),

    href:
      `/chat?type=direct&room=${encodeURIComponent(
        id,
      )}`,

    viewerSide:
      "user",
  };
}

function partnerCustomerId(
  row: Row,
) {
  return text(row, [
    "customer_user_id",
    "customer_id",
    "customer_profile_id",
    "buyer_user_id",
    "member_user_id",
    "participant_user_id",
    "other_user_id",
    "user_id",
    "profile_id",
  ]);
}

function partnerCustomerPhoto(
  row: Row,
  profile?: Row,
) {
  const raw =
    text(row, [
      "customer_avatar_url",
      "customer_photo_url",
      "customer_photo_path",
      "customer_profile_photo",
      "customer_image_url",
      "customer_image_path",
      "buyer_avatar_url",
      "buyer_photo_url",
      "buyer_photo_path",
      "other_user_avatar_url",
      "other_user_photo_url",
      "other_user_photo_path",
      "user_avatar_url",
      "user_photo_url",
      "user_photo_path",
    ]);

  if (raw) {
    return publicStorageUrl(
      "profile-photos",
      raw,
    );
  }

  if (profile) {
    return photo(profile);
  }

  return "";
}

function partnerBusinessRoom(
  row: Row,
  profile?: Row,
  fallbackTitle =
    "Melo customer",
): ChatRoom | null {
  const id =
    text(row, [
      "conversation_id",
      "chat_id",
      "id",
    ]);

  const businessId =
    text(row, [
      "business_id",
      "store_id",
      "partner_id",
    ]);

  if (
    !id ||
    !businessId
  ) {
    return null;
  }

  const userId =
    partnerCustomerId(
      row,
    );

  const profileName =
    text(profile, [
      "display_name",
      "full_name",
      "name",
    ]);

  const customerName =
    text(row, [
      "customer_name",
      "customer_display_name",
      "customer_full_name",
      "buyer_name",
      "buyer_display_name",
      "member_name",
      "participant_name",
      "other_user_name",
      "user_name",
      "user_display_name",
    ]);

  const title =
    customerName ||
    profileName ||
    fallbackTitle;

  const city =
    text(row, [
      "customer_city",
      "buyer_city",
      "other_user_city",
      "user_city",
    ]) ||
    text(profile, [
      "city",
      "home_city",
      "current_city",
    ]);

  const country =
    text(row, [
      "customer_country",
      "buyer_country",
      "other_user_country",
      "user_country",
    ]) ||
    text(profile, [
      "country",
      "country_code",
    ]);

  const nationality =
    text(row, [
      "customer_nationality",
      "buyer_nationality",
      "other_user_nationality",
      "user_nationality",
    ]) ||
    text(profile, [
      "nationality",
    ]);

  const subtitle =
    [
      city,
      country,
    ]
      .filter(Boolean)
      .join(" · ") ||
    text(row, [
      "customer_subtitle",
      "status_text",
      "subtitle",
    ]);

  return {
    id,

    category:
      "direct",

    businessId,

    userId:
      userId ||
      undefined,

    title,

    subtitle,

    avatarUrl:
      partnerCustomerPhoto(
        row,
        profile,
      ),

    lastMessage:
      text(row, [
        "last_message",
        "last_message_text",
        "message_preview",
        "preview",
      ]),

    lastMessageAt:
      text(row, [
        "last_message_at",
        "updated_at",
        "created_at",
      ]),

    unreadCount:
      numberOf(row, [
        "business_unread_count",
        "partner_unread_count",
        "staff_unread_count",
        "unread_for_business",
        "unread_for_partner",
        "unread_count",
        "unread",
        "unread_messages",
      ]),

    href:
      `/chat?type=direct&room=${encodeURIComponent(
        id,
      )}`,

    country:
      country ||
      undefined,

    nationality:
      nationality ||
      undefined,

    viewerSide:
      "business",
  };
}

async function partnerBusinessChatRows(
  businessId: string,
) {
  const cleanBusinessId =
    String(
      businessId || "",
    ).trim();

  if (!cleanBusinessId) {
    return {
      data:
        [] as Row[],

      error:
        "",
    };
  }

  const result =
    await firstRpc([
      {
        name:
          "get_partner_business_chat_list",

        params: {
          p_business_id:
            cleanBusinessId,
        },
      },

      {
        name:
          "get_business_chat_list_for_partner",

        params: {
          p_business_id:
            cleanBusinessId,
        },
      },

      {
        name:
          "get_partner_chat_list",

        params: {
          p_business_id:
            cleanBusinessId,
        },
      },

      {
        name:
          "get_my_partner_business_chat_list",

        params: {
          p_business_id:
            cleanBusinessId,
        },
      },

      {
        name:
          "get_my_business_chat_list",

        params: {
          p_business_id:
            cleanBusinessId,
        },
      },

      {
        name:
          "get_my_business_chats",

        params: {
          p_business_id:
            cleanBusinessId,
        },
      },

      {
        name:
          "get_my_business_chat_list",
      },

      {
        name:
          "get_my_business_chats",
      },
    ]);

  return {
    data:
      result.data.filter(
        (row) => {
          const rowBusinessId =
            text(row, [
              "business_id",
              "store_id",
              "partner_id",
            ]);

          return (
            !rowBusinessId ||
            rowBusinessId ===
              cleanBusinessId
          );
        },
      ),

    error:
      result.error,
  };
}

export async function loadPartnerBusinessChatRooms(
  businessId: string,
  fallbackTitle =
    "Melo customer",
): Promise<ChatRoom[]> {
  ensureMeloWebPopupWatcherStarted();

  const cleanBusinessId =
    String(
      businessId || "",
    ).trim();

  if (!cleanBusinessId) {
    return [];
  }

  const result =
    await partnerBusinessChatRows(
      cleanBusinessId,
    );

  if (
    !result.data.length
  ) {
    return [];
  }

  const userIds = [
    ...new Set(
      result.data
        .map(
          partnerCustomerId,
        )
        .filter(Boolean),
    ),
  ];

  const profileById =
    new Map<string, Row>();

  if (userIds.length) {
    const quoted =
      userIds
        .map(
          (id) =>
            `"${id}"`,
        )
        .join(",");

    const profiles =
      await restSelect<
        Row[]
      >(
        "profiles",

        `select=*&id=in.(${encodeURIComponent(
          quoted,
        )})`,
      );

    if (
      !profiles.error
    ) {
      for (
        const profile
        of rows(
          profiles.data,
        )
      ) {
        const id =
          text(profile, [
            "id",
            "user_id",
          ]);

        if (id) {
          profileById.set(
            id,
            profile,
          );
        }
      }
    }
  }

  return dedupe(
    result.data
      .map(
        (row) =>
          partnerBusinessRoom(
            row,

            profileById.get(
              partnerCustomerId(
                row,
              ),
            ),

            fallbackTitle,
          ),
      )
      .filter(
        (
          room,
        ): room is ChatRoom =>
          room !== null,
      ),
  );
}

function businessChatViewerRole(
  row: Row,
) {
  return text(row, [
    "role",
    "viewer_role",
    "participant_role",
    "chat_role",
    "business_role",
  ]).toLowerCase();
}

function businessChatViewerSide(
  row: Row,
) {
  return text(row, [
    "viewer_side",
    "participant_side",
    "chat_side",
    "side",
  ]).toLowerCase();
}

/**
 * User Mode may browse/chat with Partner stores as a customer,
 * but a business inbox owned/managed by the same account belongs
 * exclusively to Partner Mode.
 *
 * Android already separates get_my_business_chat_list by role
 * (customer vs owner).
 */
function isUserSideBusinessChatRow(
  row: Row,
) {
  const side =
    businessChatViewerSide(
      row,
    );

  if (
    /(business|partner|store|merchant)/.test(
      side,
    )
  ) {
    return false;
  }

  if (
    /(user|customer|buyer|member)/.test(
      side,
    )
  ) {
    return true;
  }

  const role =
    businessChatViewerRole(
      row,
    );

  if (
    [
      "owner",
      "admin",
      "manager",
      "staff",
      "business",
      "partner",
      "merchant",
    ].includes(role)
  ) {
    return false;
  }

  if (
    [
      "customer",
      "user",
      "buyer",
      "member",
    ].includes(role)
  ) {
    return true;
  }

  // Older RPC versions may not return role/viewer_side.
  return true;
}

async function businessChatRows() {
  const result =
    await firstRpc([
      {
        name:
          "get_my_business_chat_list",
      },

      {
        name:
          "get_my_business_chats",
      },
    ]);

  return {
    data:
      result.data.filter(
        isUserSideBusinessChatRow,
      ),

    error:
      result.error,
  };
}

const BUSINESS_IDENTITY_MEDIA_KEYS = [
  "profile_image_url",
  "profile_photo_url",
  "avatar_url",
  "logo_url",
  "business_profile_image_path",
  "business_logo_path",
  "profile_image_path",
  "profile_photo_path",
  "avatar_path",
  "logo_path",
] as const;

const BUSINESS_FALLBACK_MEDIA_KEYS = [
  "image_url",
  "cover_url",
  "cover_image_url",
  "photo_url",
  "image_path",
  "cover_image_path",
  "cover_storage_path",
  "photo_path",
] as const;

function pickBusinessMediaFields(
  sources: Row[],
  keys: readonly string[],
) {
  const picked: Row = {};

  for (
    const source
    of sources
  ) {
    for (
      const key
      of keys
    ) {
      const current =
        source?.[key];

      if (
        current !==
          undefined &&
        current !==
          null &&
        String(
          current,
        ).trim() !== ""
      ) {
        picked[key] =
          current;
      }
    }
  }

  return picked;
}

async function resolvedBusinessAvatar(
  sources: Row[],
) {
  const preferred =
    pickBusinessMediaFields(
      sources,
      BUSINESS_IDENTITY_MEDIA_KEYS,
    );

  const preferredUrl =
    await resolveCommerceMedia(
      preferred,
    );

  if (preferredUrl) {
    return preferredUrl;
  }

  return resolveCommerceMedia(
    pickBusinessMediaFields(
      sources,
      BUSINESS_FALLBACK_MEDIA_KEYS,
    ),
  );
}

async function enrichBusinessChatRows(
  chatRows: Row[],
) {
  if (
    !chatRows.length
  ) {
    return chatRows;
  }

  const businessIds = [
    ...new Set(
      chatRows
        .map(
          (row) =>
            text(row, [
              "business_id",
              "store_id",
              "partner_id",
            ]),
        )
        .filter(Boolean),
    ),
  ];

  if (
    !businessIds.length
  ) {
    return chatRows;
  }

  const publicResult =
    await rpcRequest<Row[]>(
      "melo_public_businesses",
    );

  const publicById =
    new Map(
      rows(
        publicResult.data,
      ).map(
        (row) => [
          text(row, [
            "id",
            "business_id",
          ]),
          row,
        ],
      ),
    );

  const detailEntries =
    await Promise.all(
      businessIds.map(
        async (
          businessId,
        ) => {
          const result =
            await rpcRequest<
              Row[]
            >(
              "melo_business_for_viewer",

              {
                p_business_id:
                  businessId,
              },
            );

          return [
            businessId,
            rows(
              result.data,
            )[0] ?? {},
          ] as const;
        },
      ),
    );

  const detailById =
    new Map<
      string,
      Row
    >(
      detailEntries,
    );

  return Promise.all(
    chatRows.map(
      async (
        chatRow,
      ) => {
        const businessId =
          text(chatRow, [
            "business_id",
            "store_id",
            "partner_id",
          ]);

        if (!businessId) {
          return chatRow;
        }

        const publicRow =
          publicById.get(
            businessId,
          ) ?? {};

        const detailRow =
          detailById.get(
            businessId,
          ) ?? {};

        const merged =
          mergeNonEmpty(
            mergeNonEmpty(
              publicRow,
              detailRow,
            ),

            chatRow,
          );

        const avatarUrl =
          await resolvedBusinessAvatar(
            [
              chatRow,
              publicRow,
              detailRow,
            ],
          );

        return avatarUrl
          ? {
              ...merged,

              _resolved_business_avatar_url:
                avatarUrl,
            }
          : merged;
      },
    ),
  );
}

function directRoomFromTarget(
  conversationId: string,
  target: DirectChatTarget,
): ChatRoom {
  return {
    id:
      conversationId,

    category:
      "direct",

    title:
      String(
        target.title ||
          "Melo member",
      ).trim() ||
      "Melo member",

    subtitle:
      String(
        target.subtitle ||
          "",
      ).trim(),

    avatarUrl:
      String(
        target.avatarUrl ||
          "",
      ).trim(),

    lastMessage:
      "",

    lastMessageAt:
      "",

    unreadCount:
      0,

    href:
      `/chat?type=direct&room=${encodeURIComponent(
        conversationId,
      )}`,

    userId:
      target.userId,

    country:
      String(
        target.country ||
          "",
      ).trim() ||
      undefined,

    nationality:
      String(
        target.nationality ||
          "",
      ).trim() ||
      undefined,

    viewerSide:
      "user",
  };
}

function directConversationId(
  data: unknown,
): string {
  if (
    typeof data ===
      "string" &&
    data.trim()
  ) {
    return data.trim();
  }

  if (
    Array.isArray(
      data,
    )
  ) {
    for (
      const item
      of data
    ) {
      const id:
        string =
        directConversationId(
          item,
        );

      if (id) {
        return id;
      }
    }

    return "";
  }

  if (
    data &&
    typeof data ===
      "object"
  ) {
    return text(
      data as Row,
      [
        "conversation_id",
        "chat_id",
        "id",
      ],
    );
  }

  return "";
}

export async function ensureDirectChatRoom(
  target: DirectChatTarget,
): Promise<ChatRoom | null> {
  const cleanUserId =
    String(
      target?.userId ||
        "",
    ).trim();

  if (!cleanUserId) {
    return null;
  }

  const normalizedTarget:
    DirectChatTarget = {
      ...target,
      userId:
        cleanUserId,
    };

  const currentRooms =
    await directRooms();

  const currentRoom =
    currentRooms.find(
      (room) =>
        room.userId ===
        cleanUserId,
    );

  if (currentRoom) {
    return currentRoom;
  }

  // Do not let an expired/free member start a brand-new direct chat with an
  // unrelated person. They may only create/re-open a room for someone already
  // present in profile_matches. Active Premium/Premium+ keeps the normal flow.
  const directChatPermission = await rpcRequest<boolean>(
    "melo_can_chat_with_user_v41",
    { p_target_user_id: cleanUserId },
  );
  if (!directChatPermission.error && directChatPermission.data === false) {
    throw new Error("PLAN_UPGRADE_REQUIRED:chat");
  }

  const functionNames = [
    "get_or_create_direct_chat_v2",
    "get_or_create_direct_chat_v1",
    "get_or_create_direct_chat",
    "get_or_create_direct_conversation_v2",
    "get_or_create_direct_conversation_v1",
    "get_or_create_direct_conversation",
    "get_or_create_chat_conversation",
    "get_or_create_user_chat",
    "ensure_direct_chat",
    "start_direct_chat",
    "create_direct_chat",
    "get_or_create_chat",
    "get_or_create_conversation",
  ];

  const paramFactories = [
    (
      userId: string,
    ) => ({
      p_other_user_id:
        userId,
    }),

    (
      userId: string,
    ) => ({
      p_target_user_id:
        userId,
    }),

    (
      userId: string,
    ) => ({
      p_user_id:
        userId,
    }),
  ];

  for (
    const name
    of functionNames
  ) {
    for (
      const makeParams
      of paramFactories
    ) {
      const result =
        await rpcRequest<
          unknown
        >(
          name,
          makeParams(
            cleanUserId,
          ),
        );

      if (
        result.error
      ) {
        continue;
      }

      for (
        const row
        of rows(
          result.data,
        )
      ) {
        const mapped =
          directRoom({
            ...row,

            other_user_id:
              text(row, [
                "other_user_id",
                "partner_user_id",
                "user_id",
                "profile_id",
              ]) ||
              cleanUserId,

            display_name:
              text(row, [
                "display_name",
                "other_user_name",
                "partner_name",
                "name",
                "title",
              ]) ||
              normalizedTarget.title ||
              "Melo member",

            avatar_url:
              text(row, [
                "avatar_url",
                "photo_url",
                "photo_path",
                "profile_photo",
                "image_url",
              ]) ||
              normalizedTarget.avatarUrl ||
              "",

            country:
              text(row, [
                "country",
                "other_user_country",
              ]) ||
              normalizedTarget.country ||
              "",

            nationality:
              text(row, [
                "nationality",
                "other_user_nationality",
              ]) ||
              normalizedTarget.nationality ||
              "",
          });

        if (mapped) {
          return mapped;
        }
      }

      const createdId =
        directConversationId(
          result.data,
        );

      if (createdId) {
        return directRoomFromTarget(
          createdId,
          normalizedTarget,
        );
      }

      const refreshedAfterCreate =
        await directRooms();

      const createdRoom =
        refreshedAfterCreate.find(
          (room) =>
            room.userId ===
            cleanUserId,
        );

      if (createdRoom) {
        return createdRoom;
      }
    }
  }

  const refreshed =
    await directRooms();

  return (
    refreshed.find(
      (room) =>
        room.userId ===
        cleanUserId,
    ) ?? null
  );
}

export async function ensureBusinessChatRoom(
  businessId: string,
): Promise<ChatRoom | null> {
  const cleanBusinessId =
    String(
      businessId || "",
    ).trim();

  if (!cleanBusinessId) {
    return null;
  }

  const current =
    await businessChatRows();

  const currentRoom =
    current.data
      .map(
        businessRoom,
      )
      .filter(
        (
          room,
        ): room is ChatRoom =>
          room !== null,
      )
      .find(
        (room) =>
          room.businessId ===
          cleanBusinessId,
      );

  if (currentRoom) {
    return currentRoom;
  }

  const candidates = [
    "get_or_create_business_chat",
    "get_or_create_business_conversation",
    "ensure_business_chat",
    "start_business_chat",
    "create_business_chat",
  ];

  for (
    const name
    of candidates
  ) {
    const result =
      await rpcRequest<
        unknown
      >(
        name,
        {
          p_business_id:
            cleanBusinessId,
        },
      );

    if (
      result.error
    ) {
      continue;
    }

    for (
      const row
      of rows(
        result.data,
      )
    ) {
      const room =
        businessRoom({
          ...row,

          business_id:
            text(row, [
              "business_id",
            ]) ||
            cleanBusinessId,
        });

      if (room) {
        return room;
      }
    }
  }

  const refreshed =
    await businessChatRows();

  return (
    refreshed.data
      .map(
        businessRoom,
      )
      .filter(
        (
          room,
        ): room is ChatRoom =>
          room !== null,
      )
      .find(
        (room) =>
          room.businessId ===
          cleanBusinessId,
      ) ?? null
  );
}

function activityAvatar(
  category:
    Exclude<
      ChatCategory,
      "direct"
    >,
  row: Row,
) {
  const raw =
    text(row, [
      "image_path",
      "cover_image_path",
      "cover_path",
      "activity_image_path",
      "event_image_path",
      "community_image_path",
      "main_image_path",
      "image_url",
      "cover_image_url",
      "cover_url",
      "photo_url",
      "thumbnail_url",
    ]);

  if (!raw) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      raw,
    )
  ) {
    return raw;
  }

  const normalized =
    raw.replace(
      /^\/+/,
      "",
    );

  if (
    normalized.startsWith(
      "activity-images/",
    )
  ) {
    return publicStorageUrl(
      "activity-images",

      normalized.slice(
        "activity-images/".length,
      ),
    );
  }

  if (
    normalized.startsWith(
      "community-images/",
    )
  ) {
    return publicStorageUrl(
      "community-images",

      normalized.slice(
        "community-images/".length,
      ),
    );
  }

  return publicStorageUrl(
    category ===
      "community"
      ? "activity-images"
      : "activity-images",

    normalized,
  );
}

function activityRoom(
  category:
    Exclude<
      ChatCategory,
      "direct"
    >,
  row: Row,
): ChatRoom | null {
  const idKeys =
    category ===
    "trip"
      ? [
          "trip_id",
          "id",
        ]
      : category ===
          "event"
        ? [
            "event_id",
            "id",
          ]
        : [
            "community_id",
            "id",
          ];

  const id =
    text(
      row,
      idKeys,
    );

  if (!id) {
    return null;
  }

  const title =
    text(
      row,

      category ===
        "community"
        ? [
            "name",
            "community_name",
            "title",
          ]
        : [
            "title",
            `${category}_name`,
            "name",
          ],

      category ===
        "trip"
        ? "Trip"
        : category ===
            "event"
          ? "Event"
          : "Community",
    );

  return {
    id,
    category,
    title,

    subtitle:
      text(row, [
        "city",
        "country",
        "location",
        "category",
        "status",
      ]),

    avatarUrl:
      activityAvatar(
        category,
        row,
      ),

    lastMessage:
      text(row, [
        "last_message",
        "last_message_text",
        "message_preview",
        "preview",
      ]),

    lastMessageAt:
      text(row, [
        "last_message_at",
        "updated_at",
        "created_at",
      ]),

    unreadCount:
      numberOf(row, [
        "unread_count",
        "unread",
        "unread_messages",
      ]),

    href:
      `/chat?type=${category}&room=${encodeURIComponent(
        id,
      )}`,
  };
}

function mergeNonEmpty(
  base: Row,
  overlay: Row,
) {
  const merged: Row = {
    ...base,
  };

  for (
    const [
      key,
      current,
    ]
    of Object.entries(
      overlay,
    )
  ) {
    if (
      current ===
        undefined ||
      current === null
    ) {
      continue;
    }

    if (
      typeof current ===
        "string" &&
      !current.trim()
    ) {
      continue;
    }

    merged[key] =
      current;
  }

  return merged;
}

async function enrichActivityChatRows(
  category:
    | "trip"
    | "event"
    | "community",

  chatRows: Row[],
) {
  if (
    !chatRows.length
  ) {
    return chatRows;
  }

  const idKeys =
    category === "trip"
      ? [
          "trip_id",
          "id",
        ]
      : category ===
          "event"
        ? [
            "event_id",
            "id",
          ]
        : [
            "community_id",
            "id",
          ];

  const ids = [
    ...new Set(
      chatRows
        .map(
          (row) =>
            text(
              row,
              idKeys,
            ),
        )
        .filter(Boolean),
    ),
  ];

  if (!ids.length) {
    return chatRows;
  }

  const quoted =
    ids
      .map(
        (id) =>
          `"${id}"`,
      )
      .join(",");

  const table =
    category === "trip"
      ? "trips"
      : category ===
          "event"
        ? "events"
        : "communities";

  const result =
    await restSelect<
      Row[]
    >(
      table,

      `select=*&id=in.(${encodeURIComponent(
        quoted,
      )})`,
    );

  if (
    result.error
  ) {
    return chatRows;
  }

  const detailsById =
    new Map<
      string,
      Row
    >();

  for (
    const detail
    of rows(
      result.data,
    )
  ) {
    const id =
      text(detail, [
        "id",
      ]);

    if (id) {
      detailsById.set(
        id,
        detail,
      );
    }
  }

  return chatRows.map(
    (
      chatRow,
    ) => {
      const id =
        text(
          chatRow,
          idKeys,
        );

      const detail =
        detailsById.get(
          id,
        );

      return detail
        ? mergeNonEmpty(
            detail,
            chatRow,
          )
        : chatRow;
    },
  );
}

function dedupe(
  roomList: ChatRoom[],
) {
  const map =
    new Map<
      string,
      ChatRoom
    >();

  for (
    const room
    of roomList
  ) {
    const old =
      map.get(
        room.id,
      );

    if (
      !old ||
      room.unreadCount >=
        old.unreadCount
    ) {
      map.set(
        room.id,
        room,
      );
    }
  }

  return [
    ...map.values(),
  ].sort(
    (
      a,
      b,
    ) =>
      (
        b.lastMessageAt ||
        ""
      ).localeCompare(
        a.lastMessageAt ||
          "",
      ),
  );
}

async function directRooms() {
  // MELO_DIRECT_ROOM_UNREAD_COUNTS_V1
  //
  // get_my_chat_list() provides the room/profile information.
  // get_chat_unread_counts() provides the canonical unread
  // message count for each direct conversation.

  const [
    people,
    businesses,
    unreadResult,
  ] =
    await Promise.all([
      firstRpc([
        {
          name:
            "get_my_chat_list",
        },

        {
          name:
            "get_my_conversation_list",
        },

        {
          name:
            "get_my_conversations",
        },
      ]),

      businessChatRows(),

      rpcRequest<unknown>(
        "get_chat_unread_counts",
        {},
      ),
    ]);

  const unreadByConversation =
    new Map<string, number>();

  if (!unreadResult.error) {
    const rawRows =
      Array.isArray(unreadResult.data)
        ? unreadResult.data
        : unreadResult.data
          ? [unreadResult.data]
          : [];

    for (const raw of rawRows) {
      if (
        !raw ||
        typeof raw !== "object"
      ) {
        continue;
      }

      const row =
        raw as Record<
          string,
          unknown
        >;

      const conversationId =
        String(
          row.conversation_id ??
          row.chat_id ??
          row.id ??
          "",
        ).trim();

      if (!conversationId) {
        continue;
      }

      const parsed =
        Number(
          row.unread_count ??
          row.unread ??
          row.count ??
          0,
        );

      unreadByConversation.set(
        conversationId,
        Number.isFinite(parsed)
          ? Math.max(
              0,
              parsed,
            )
          : 0,
      );
    }
  } else {
    console.warn(
      "[Melo Chat] get_chat_unread_counts failed:",
      unreadResult.error,
    );
  }

  const directPeople =
    people.data
      .map((row) => {
        const room =
          directRoom(row);

        if (!room) {
          return null;
        }

        return {
          ...room,

          unreadCount:
            unreadByConversation.get(
              room.id,
            ) ??
            room.unreadCount ??
            0,
        };
      })
      .filter(
        Boolean,
      ) as ChatRoom[];

  const enrichedBusinesses =
    await enrichBusinessChatRows(
      businesses.data,
    );

  return dedupe([
    ...directPeople,

    ...(
      enrichedBusinesses
        .map(
          businessRoom,
        )
        .filter(
          Boolean,
        ) as ChatRoom[]
    ),
  ]);
}

async function tripRooms(
  userId: string,
) {
  const rpc =
    await firstRpc([
      {
        name:
          "get_my_trip_chat_list",
      },

      {
        name:
          "get_my_trip_chats",
      },
    ]);

  if (
    rpc.data.length
  ) {
    const enriched =
      await enrichActivityChatRows(
        "trip",
        rpc.data,
      );

    return dedupe(
      enriched
        .map(
          (row) =>
            activityRoom(
              "trip",
              row,
            ),
        )
        .filter(
          Boolean,
        ) as ChatRoom[],
    );
  }

  const [
    owned,
    membership,
  ] =
    await Promise.all([
      restSelect<Row[]>(
        "trips",

        `select=*&organizer_id=eq.${encodeURIComponent(
          userId,
        )}&order=updated_at.desc`,
      ),

      restSelect<Row[]>(
        "trip_join_requests",

        `select=trip_id,status&user_id=eq.${encodeURIComponent(
          userId,
        )}&status=eq.approved`,
      ),
    ]);

  const list = [
    ...rows(
      owned.data,
    ),
  ];

  const ids =
    rows(
      membership.data,
    )
      .map(
        (row) =>
          text(row, [
            "trip_id",
          ]),
      )
      .filter(Boolean);

  if (
    ids.length
  ) {
    const quoted =
      ids
        .map(
          (id) =>
            `"${id}"`,
        )
        .join(",");

    const joined =
      await restSelect<
        Row[]
      >(
        "trips",

        `select=*&id=in.(${encodeURIComponent(
          quoted,
        )})`,
      );

    list.push(
      ...rows(
        joined.data,
      ),
    );
  }

  return dedupe(
    list
      .map(
        (row) =>
          activityRoom(
            "trip",
            row,
          ),
      )
      .filter(
        Boolean,
      ) as ChatRoom[],
  );
}

async function eventRooms(
  userId: string,
) {
  const rpc =
    await firstRpc([
      {
        name:
          "get_my_event_chat_list",
      },

      {
        name:
          "get_my_event_chats",
      },
    ]);

  if (
    rpc.data.length
  ) {
    const enriched =
      await enrichActivityChatRows(
        "event",
        rpc.data,
      );

    return dedupe(
      enriched
        .map(
          (row) =>
            activityRoom(
              "event",
              row,
            ),
        )
        .filter(
          Boolean,
        ) as ChatRoom[],
    );
  }

  const [
    owned,
    membership,
  ] =
    await Promise.all([
      restSelect<Row[]>(
        "events",

        `select=*&organizer_id=eq.${encodeURIComponent(
          userId,
        )}&order=updated_at.desc`,
      ),

      restSelect<Row[]>(
        "event_attendees",

        `select=event_id&user_id=eq.${encodeURIComponent(
          userId,
        )}`,
      ),
    ]);

  const list = [
    ...rows(
      owned.data,
    ),
  ];

  const ids =
    rows(
      membership.data,
    )
      .map(
        (row) =>
          text(row, [
            "event_id",
          ]),
      )
      .filter(Boolean);

  if (
    ids.length
  ) {
    const quoted =
      ids
        .map(
          (id) =>
            `"${id}"`,
        )
        .join(",");

    const joined =
      await restSelect<
        Row[]
      >(
        "events",

        `select=*&id=in.(${encodeURIComponent(
          quoted,
        )})`,
      );

    list.push(
      ...rows(
        joined.data,
      ),
    );
  }

  return dedupe(
    list
      .map(
        (row) =>
          activityRoom(
            "event",
            row,
          ),
      )
      .filter(
        Boolean,
      ) as ChatRoom[],
  );
}

async function communityRooms(
  userId: string,
) {
  const rpc =
    await firstRpc([
      {
        name:
          "get_my_community_chat_list",
      },

      {
        name:
          "get_my_community_chats",
      },
    ]);

  if (
    rpc.data.length
  ) {
    const enriched =
      await enrichActivityChatRows(
        "community",
        rpc.data,
      );

    return dedupe(
      enriched
        .map(
          (row) =>
            activityRoom(
              "community",
              row,
            ),
        )
        .filter(
          Boolean,
        ) as ChatRoom[],
    );
  }

  const [
    owned,
    membership,
  ] =
    await Promise.all([
      restSelect<Row[]>(
        "communities",

        `select=*&owner_id=eq.${encodeURIComponent(
          userId,
        )}&order=updated_at.desc`,
      ),

      restSelect<Row[]>(
        "community_members",

        `select=community_id&user_id=eq.${encodeURIComponent(
          userId,
        )}`,
      ),
    ]);

  const list = [
    ...rows(
      owned.data,
    ),
  ];

  const ids =
    rows(
      membership.data,
    )
      .map(
        (row) =>
          text(row, [
            "community_id",
          ]),
      )
      .filter(Boolean);

  if (
    ids.length
  ) {
    const quoted =
      ids
        .map(
          (id) =>
            `"${id}"`,
        )
        .join(",");

    const joined =
      await restSelect<
        Row[]
      >(
        "communities",

        `select=*&id=in.(${encodeURIComponent(
          quoted,
        )})`,
      );

    list.push(
      ...rows(
        joined.data,
      ),
    );
  }

  return dedupe(
    list
      .map(
        (row) =>
          activityRoom(
            "community",
            row,
          ),
      )
      .filter(
        Boolean,
      ) as ChatRoom[],
  );
}

export async function loadChatUnreadTotal(): Promise<number> {
  const user = await getCurrentUser();

  if (!user) {
    return 0;
  }

  try {
    const result = await rpcRequest<unknown>(
      "get_chat_unread_count",
      {},
    );

    if (!result.error) {
      const raw = Array.isArray(result.data)
        ? result.data[0]
        : result.data;

      if (typeof raw === "number") {
        return Math.max(0, raw);
      }

      if (typeof raw === "string") {
        const parsed = Number(raw);
        return Number.isFinite(parsed)
          ? Math.max(0, parsed)
          : 0;
      }

      if (raw && typeof raw === "object") {
        const record = raw as Record<string, unknown>;

        const value =
          record.get_chat_unread_count ??
          record.unread_count ??
          record.count ??
          record.total;

        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          return Math.max(0, parsed);
        }
      }
    } else {
      console.warn(
        "[Melo Chat] get_chat_unread_count failed:",
        result.error,
      );
    }
  } catch (error) {
    console.warn(
      "[Melo Chat] Unable to load chat unread count:",
      error,
    );
  }

  return 0;
}
let chatEntitlementCache: { userId: string; allowed: boolean; checkedAt: number } | null = null;
const CHAT_ENTITLEMENT_CACHE_MS = 15_000;

export async function canCurrentUserUseChat(force = false): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.id) return false;

  if (
    !force &&
    chatEntitlementCache?.userId === user.id &&
    Date.now() - chatEntitlementCache.checkedAt < CHAT_ENTITLEMENT_CACHE_MS
  ) {
    return chatEntitlementCache.allowed;
  }

  // V41: an expired Free account may continue chatting with people it had
  // already matched with before the paid package expired. The database helper
  // returns true for an active chat entitlement OR at least one existing match.
  // All other paid actions (viewing profiles, Interested, comments, etc.) keep
  // using the normal package entitlements.
  const result = await rpcRequest<boolean>(
    "melo_can_use_chat_v41",
    {},
  );

  let allowed: boolean;
  if (!result.error) {
    allowed = result.data !== false;
  } else if (missingFunction(result.error)) {
    const legacy = await rpcRequest<boolean>(
      "melo_has_entitlement_v25",
      { p_key: "can_chat" },
    );
    allowed = legacy.error ? missingFunction(legacy.error) : legacy.data !== false;
  } else {
    allowed = false;
  }

  chatEntitlementCache = { userId: user.id, allowed, checkedAt: Date.now() };
  return allowed;
}

export async function loadChatSnapshot(): Promise<ChatSnapshot> {
  ensureMeloWebPopupWatcherStarted();

  const user =
    await getCurrentUser();

  if (!user) {
    return {
      rooms:
        EMPTY_ROOMS,

      counts: {
        direct: 0,
        trip: 0,
        event: 0,
        community: 0,
      },

      totalUnread:
        0,
    };
  }

  const [
    direct,
    trip,
    event,
    community,
    notifications,
  ] =
    await Promise.all([
      directRooms(),

      tripRooms(
        user.id,
      ),

      eventRooms(
        user.id,
      ),

      communityRooms(
        user.id,
      ),

      loadUnreadNotifications(),
    ]);

  const notificationSummary =
    notificationCounts(
      notifications,
    );

  const chatAllowed = await canCurrentUserUseChat();

  const roomLists:
    Record<
      ChatCategory,
      ChatRoom[]
    > = {
      direct: chatAllowed
        ? direct
        : direct.map((room) => ({ ...room, lastMessage: "" })),
      trip,
      event,
      community,
    };

  for (
    const category
    of Object.keys(
      roomLists,
    ) as ChatCategory[]
  ) {
    roomLists[
      category
    ] =
      roomLists[
        category
      ].map(
        (
          room,
        ) => ({
          ...room,

          unreadCount:
            Math.max(
              room.unreadCount,

              notificationSummary
                .roomCounts
                .get(
                  `${category}:${room.id}`,
                ) || 0,
            ),
        }),
      );
  }

  const counts =
    {} as Record<
      ChatCategory,
      number
    >;

  for (
    const category
    of Object.keys(
      roomLists,
    ) as ChatCategory[]
  ) {
    const roomCount =
      roomLists[
        category
      ].reduce(
        (
          sum,
          room,
        ) =>
          sum +
          room.unreadCount,

        0,
      );

    counts[category] =
      roomCount > 0
        ? roomCount
        : notificationSummary
            .totals[
              category
            ];
  }

  return {
    rooms:
      roomLists,

    counts,

    totalUnread:
      counts.direct +
      counts.trip +
      counts.event +
      counts.community,
  };
}

export type ChatMessageKind =
  | "text"
  | "image"
  | "location"
  | "sticker";

export type ChatMessagePayload = {
  body?: string;

  messageType:
    ChatMessageKind;

  mediaPath?:
    string | null;

  latitude?:
    number | null;

  longitude?:
    number | null;

  locationLabel?:
    string | null;

  stickerCode?:
    string | null;
};

/**
 * Rich messages still need a non-empty original_text because the current
 * chat_messages schema applies a length constraint to that column.
 *
 * This also keeps Web aligned with Android, which sends a short fallback
 * message together with Image / Location / Sticker metadata.
 */
function messageBodyForPayload(
  payload:
    ChatMessagePayload,
) {
  const explicitBody =
    String(
      payload.body ||
        "",
    ).trim();

  if (explicitBody) {
    return explicitBody;
  }

  if (
    payload.messageType ===
    "sticker"
  ) {
    return (
      String(
        payload.stickerCode ||
          "✨",
      ).trim() ||
      "✨"
    );
  }

  if (
    payload.messageType ===
    "location"
  ) {
    const label =
      String(
        payload.locationLabel ||
          "",
      ).trim();

    return label
      ? `📍 ${label}`
      : "📍 Location";
  }

  if (
    payload.messageType ===
    "image"
  ) {
    return "📷 Image";
  }

  return "";
}

export type DirectMessage = {
  id: string;

  senderId: string;

  senderName: string;

  isMine:
    boolean | null;

  senderSide:
    | ""
    | "user"
    | "business";

  body: string;

  sourceLanguage:
    string;

  translations:
    Record<
      string,
      string
    >;

  createdAt:
    string;

  messageType:
    ChatMessageKind;

  mediaPath:
    string;

  latitude:
    number | null;

  longitude:
    number | null;

  locationLabel:
    string;

  stickerCode:
    string;
};

function normalizedMessageType(
  row: Row,
): ChatMessageKind {
  const raw =
    text(
      row,
      [
        "message_type",
      ],
      "text",
    );

  return (
    raw === "image" ||
    raw === "location" ||
    raw === "sticker"
  )
    ? raw
    : "text";
}

function nullableBoolean(
  row: Row,
  keys: string[],
): boolean | null {
  for (
    const key
    of keys
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        row,
        key,
      )
    ) {
      continue;
    }

    const current =
      row[key];

    if (
      current === true ||
      current === 1 ||
      current === "1" ||
      String(
        current,
      ).toLowerCase() ===
        "true"
    ) {
      return true;
    }

    if (
      current === false ||
      current === 0 ||
      current === "0" ||
      String(
        current,
      ).toLowerCase() ===
        "false"
    ) {
      return false;
    }
  }

  return null;
}

function messageSenderSide(
  row: Row,
):
  | ""
  | "user"
  | "business" {
  const explicit =
    text(row, [
      "sender_side",
      "sender_type",
      "sender_role",
      "sender_kind",
      "from_type",
      "author_type",
      "actor_type",
      "message_sender_type",
    ]).toLowerCase();

  if (
    /(business|partner|store|merchant|staff|admin|owner)/.test(
      explicit,
    )
  ) {
    return "business";
  }

  if (
    /(user|customer|member|buyer|profile)/.test(
      explicit,
    )
  ) {
    return "user";
  }

  const businessSenderId =
    text(row, [
      "sender_business_id",
      "from_business_id",
      "business_sender_id",
      "sender_store_id",
      "sender_partner_id",
    ]);

  if (
    businessSenderId
  ) {
    return "business";
  }

  const businessFlag =
    nullableBoolean(
      row,
      [
        "is_business_sender",
        "sent_by_business",
        "from_business",
        "is_partner_sender",
      ],
    );

  if (
    businessFlag ===
    true
  ) {
    return "business";
  }

  return "";
}

function isGenericMemberName(
  name: string,
) {
  const normalized =
    String(
      name || "",
    )
      .trim()
      .toLowerCase();

  return (
    !normalized ||
    normalized ===
      "melo member" ||
    normalized ===
      "melo user" ||
    normalized ===
      "member" ||
    normalized ===
      "user"
  );
}

async function hydrateDirectSenderNames(
  messages:
    DirectMessage[],
) {
  const ids = [
    ...new Set(
      messages
        .map(
          (
            message,
          ) =>
            message.senderId,
        )
        .filter(Boolean),
    ),
  ];

  if (
    !ids.length ||
    !messages.some(
      (
        message,
      ) =>
        isGenericMemberName(
          message.senderName,
        ),
    )
  ) {
    return messages;
  }

  const quoted =
    ids
      .map(
        (id) =>
          `"${id.replace(
            /"/g,
            "",
          )}"`,
      )
      .join(",");

  const result =
    await restSelect<
      Row[]
    >(
      "profiles",

      `select=id,display_name,full_name,name&id=in.(${encodeURIComponent(
        quoted,
      )})`,
    );

  if (
    result.error
  ) {
    return messages;
  }

  const names =
    new Map<
      string,
      string
    >();

  for (
    const profile
    of rows(
      result.data,
    )
  ) {
    const id =
      text(
        profile,
        [
          "id",
          "user_id",
        ],
      );

    const name =
      text(
        profile,
        [
          "display_name",
          "full_name",
          "name",
        ],
      );

    if (
      id &&
      name
    ) {
      names.set(
        id,
        name,
      );
    }
  }

  return messages.map(
    (
      message,
    ) => {
      if (
        !isGenericMemberName(
          message.senderName,
        )
      ) {
        return message;
      }

      const name =
        names.get(
          message.senderId,
        );

      return name
        ? {
            ...message,
            senderName:
              name,
          }
        : message;
    },
  );
}

function directMessage(
  row: Row,
): DirectMessage {
  const translations =
    row.translations &&
    typeof row.translations ===
      "object" &&
    !Array.isArray(
      row.translations,
    )
      ? row.translations as Record<
          string,
          string
        >
      : {};

  const messageType =
    normalizedMessageType(
      row,
    );

  /*
   * original_text is intentionally not exposed as bubble text for rich
   * messages. It is a DB-safe fallback; the UI renders image/location/sticker
   * from their dedicated metadata.
   */
  const body =
    messageType ===
    "text"
      ? text(row, [
          "original_text",
          "content",
          "message_text",
          "message",
          "body",
          "text",
        ])
      : "";

  return {
    id:
      text(row, [
        "id",
        "message_id",
      ]),

    senderId:
      text(row, [
        "sender_id",
        "sender_user_id",
        "from_user_id",
        "author_id",
        "author_user_id",
        "created_by_user_id",
        "created_by",
        "sent_by",
        "sender_profile_id",
        "profile_id",
        "user_id",
      ]),

    senderName:
      text(
        row,
        [
          "sender_name",
          "sender_display_name",
          "sender_full_name",
          "from_name",
          "display_name",
          "author_name",
          "user_name",
          "customer_name",
        ],
        "Melo member",
      ),

    isMine:
      nullableBoolean(
        row,
        [
          "is_mine",
          "mine",
          "sent_by_me",
          "is_sender",
          "from_me",
        ],
      ),

    senderSide:
      messageSenderSide(
        row,
      ),

    body,

    sourceLanguage:
      text(
        row,
        [
          "source_language",
          "language",
        ],
        "en",
      ),

    translations,

    createdAt:
      text(row, [
        "created_at",
        "sent_at",
      ]),

    messageType,

    mediaPath:
      text(row, [
        "media_path",
      ]),

    latitude:
      row.latitude == null
        ? null
        : Number(
            row.latitude,
          ),

    longitude:
      row.longitude == null
        ? null
        : Number(
            row.longitude,
          ),

    locationLabel:
      text(row, [
        "location_label",
      ]),

    stickerCode:
      text(row, [
        "sticker_code",
      ]),
  };
}

export async function loadDirectMessagesPage(
  conversationId: string,
  options: { before?: string; limit?: number } = {},
) {
  if (!(await canCurrentUserUseChat())) return [];

  const limit = Math.max(1, Math.min(50, options.limit ?? 15));
  const beforeFilter = options.before
    ? `&created_at=lt.${encodeURIComponent(options.before)}`
    : "";

  let lastError = "";
  for (const table of ["chat_messages", "messages"]) {
    const result = await restSelect<Row[]>(
      table,
      `select=*&conversation_id=eq.${encodeURIComponent(conversationId)}${beforeFilter}&order=created_at.desc&limit=${limit}`,
    );
    if (!result.error) {
      const page = rows(result.data).map(directMessage).reverse();
      return hydrateDirectSenderNames(page);
    }
    lastError = result.error;
  }
  if (lastError) throw new Error(lastError);
  return [];
}

export async function loadDirectMessages(conversationId: string) {
  return loadDirectMessagesPage(conversationId, { limit: 15 });
}

export async function loadPinnedConversationIds() {
  const user = await getCurrentUser();
  if (!user?.id) return [] as string[];
  const result = await restSelect<Row[]>(
    "chat_conversation_preferences",
    `select=conversation_id,pinned_at&user_id=eq.${encodeURIComponent(user.id)}&is_pinned=eq.true&order=pinned_at.desc`,
  );
  if (result.error) return [] as string[];
  return rows(result.data).map((row) => text(row, ["conversation_id"])).filter(Boolean);
}

export async function setConversationPinned(conversationId: string, isPinned: boolean) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Please sign in");
  const now = new Date().toISOString();
  const result = await restUpsert(
    "chat_conversation_preferences",
    { user_id: user.id, conversation_id: conversationId, is_pinned: isPinned, pinned_at: isPinned ? now : null, updated_at: now },
    "user_id,conversation_id",
  );
  if (result.error) throw new Error(result.error);
}

function richParams(
  payload:
    ChatMessagePayload,

  locale:
    string,
) {
  const body =
    messageBodyForPayload(
      payload,
    );

  return {
    p_original_text:
      body,

    p_source_language:
      locale,

    p_translations:
      body
        ? {
            [locale]:
              body,
          }
        : {},

    p_message_type:
      payload.messageType,

    p_media_path:
      payload.mediaPath ||
      null,

    p_latitude:
      payload.latitude ??
      null,

    p_longitude:
      payload.longitude ??
      null,

    p_location_label:
      payload.locationLabel ||
      null,

    p_sticker_code:
      payload.stickerCode ||
      null,
  };
}

type ChatMessageShape = {
  row: Row;
  columns: Set<string>;
};

async function loadChatMessageShape(
  conversationId:
    string,
): Promise<ChatMessageShape | null> {
  const roomResult =
    await restSelect<
      Row[]
    >(
      "chat_messages",

      `select=*&conversation_id=eq.${encodeURIComponent(
        conversationId,
      )}&order=created_at.desc&limit=1`,
    );

  const roomRow =
    rows(
      roomResult.data,
    )[0];

  if (
    !roomResult.error &&
    roomRow
  ) {
    return {
      row:
        roomRow,

      columns:
        new Set(
          Object.keys(
            roomRow,
          ),
        ),
    };
  }

  const anyResult =
    await restSelect<
      Row[]
    >(
      "chat_messages",
      "select=*&limit=1",
    );

  const anyRow =
    rows(
      anyResult.data,
    )[0];

  if (
    !anyResult.error &&
    anyRow
  ) {
    return {
      row:
        anyRow,

      columns:
        new Set(
          Object.keys(
            anyRow,
          ),
        ),
    };
  }

  return null;
}

function firstExistingColumn(
  columns:
    Set<string>,

  candidates:
    string[],
) {
  return (
    candidates.find(
      (
        column,
      ) =>
        columns.has(
          column,
        ),
    ) || ""
  );
}

function chatMessageBodyColumn(
  columns:
    Set<string>,
) {
  return firstExistingColumn(
    columns,
    [
      "original_text",
      "content",
      "message_text",
      "message",
      "body",
      "text",
    ],
  );
}

function chatMessageSenderColumn(
  columns:
    Set<string>,
) {
  return firstExistingColumn(
    columns,
    [
      "sender_id",
      "sender_user_id",
      "from_user_id",
      "author_id",
      "created_by_user_id",
      "sender_profile_id",
      "user_id",
    ],
  );
}

async function activePartnerBusinessId(
  sampleRow:
    Row,
) {
  if (
    typeof window ===
      "undefined" ||
    !window.location.pathname.startsWith(
      "/partner",
    )
  ) {
    return "";
  }

  const user =
    await getCurrentUser();

  if (
    !user?.id
  ) {
    return "";
  }

  const preference =
    await restSelect<
      Row[]
    >(
      "partner_mode_preferences",

      `select=*&user_id=eq.${encodeURIComponent(
        user.id,
      )}&limit=1`,
    );

  const preferenceRow =
    rows(
      preference.data,
    )[0];

  const preferredBusinessId =
    text(
      preferenceRow,
      [
        "active_business_id",
        "business_id",
      ],
    );

  if (
    preferredBusinessId
  ) {
    return preferredBusinessId;
  }

  return text(
    sampleRow,
    [
      "business_id",
      "store_id",
      "partner_id",
    ],
  );
}

async function buildDirectChatInsertPayload(
  conversationId:
    string,

  payload:
    ChatMessagePayload,

  locale:
    string,
) {
  const user =
    await getCurrentUser();

  if (
    !user?.id
  ) {
    throw new Error(
      "Please sign in",
    );
  }

  const shape =
    await loadChatMessageShape(
      conversationId,
    );

  if (!shape) {
    throw new Error(
      "Unable to detect chat_messages schema from the current conversation.",
    );
  }

  const {
    row:
      sampleRow,

    columns,
  } = shape;

  const bodyColumn =
    chatMessageBodyColumn(
      columns,
    );

  const senderColumn =
    chatMessageSenderColumn(
      columns,
    );

  if (
    !bodyColumn
  ) {
    throw new Error(
      "Unable to detect the message body column in chat_messages.",
    );
  }

  if (
    !senderColumn
  ) {
    throw new Error(
      "Unable to detect the message sender column in chat_messages.",
    );
  }

  const body =
    messageBodyForPayload(
      payload,
    );

  const insertPayload:
    Record<
      string,
      unknown
    > = {
      conversation_id:
        conversationId,

      [senderColumn]:
        user.id,

      [bodyColumn]:
        body,
    };

  const businessId =
    await activePartnerBusinessId(
      sampleRow,
    );

  const sampleBusinessId =
    text(
      sampleRow,
      [
        "business_id",
        "store_id",
        "partner_id",
      ],
    );

  for (
    const key
    of [
      "business_id",
      "store_id",
      "partner_id",
    ]
  ) {
    if (
      !columns.has(
        key,
      )
    ) {
      continue;
    }

    const current =
      businessId ||
      sampleBusinessId;

    if (current) {
      insertPayload[
        key
      ] = current;
    }

    break;
  }

  const businessSenderColumn =
    firstExistingColumn(
      columns,
      [
        "sender_business_id",
        "from_business_id",
        "business_sender_id",
        "sender_store_id",
        "sender_partner_id",
      ],
    );

  if (
    businessId &&
    businessSenderColumn
  ) {
    insertPayload[
      businessSenderColumn
    ] = businessId;
  }

  const senderSideColumn =
    firstExistingColumn(
      columns,
      [
        "sender_side",
        "sender_type",
        "sender_role",
        "sender_kind",
        "from_type",
        "author_type",
        "actor_type",
        "message_sender_type",
      ],
    );

  if (
    senderSideColumn
  ) {
    insertPayload[
      senderSideColumn
    ] =
      businessId
        ? "business"
        : "user";
  }

  const businessFlagColumn =
    firstExistingColumn(
      columns,
      [
        "is_business_sender",
        "sent_by_business",
        "from_business",
        "is_partner_sender",
      ],
    );

  if (
    businessFlagColumn
  ) {
    insertPayload[
      businessFlagColumn
    ] =
      Boolean(
        businessId,
      );
  }

  const optional:
    Record<
      string,
      unknown
    > = {
      source_language:
        locale,

      translations:
        body
          ? {
              [locale]:
                body,
            }
          : {},

      message_type:
        payload.messageType,

      media_path:
        payload.mediaPath ||
        null,

      latitude:
        payload.latitude ??
        null,

      longitude:
        payload.longitude ??
        null,

      location_label:
        payload.locationLabel ||
        null,

      sticker_code:
        payload.stickerCode ||
        null,
    };

  for (
    const [
      key,
      current,
    ]
    of Object.entries(
      optional,
    )
  ) {
    if (
      columns.has(
        key,
      )
    ) {
      insertPayload[
        key
      ] = current;
    }
  }

  return {
    insertPayload,
    businessId,
    bodyColumn,
  };
}

export async function sendDirectMessage(
  conversationId:
    string,

  payload:
    ChatMessagePayload,

  locale:
    string,
) {
  const entitlement = await rpcRequest<boolean>(
    "melo_can_use_chat_v41",
    {},
  );
  if (!entitlement.error && entitlement.data === false) {
    throw new Error("PLAN_UPGRADE_REQUIRED:chat");
  }

  const body =
    messageBodyForPayload(
      payload,
    );

  const rich = {
    p_conversation_id:
      conversationId,

    ...richParams(
      payload,
      locale,
    ),
  };

  const candidates:
    Array<{
      name:
        string;

      params:
        Record<
          string,
          unknown
        >;
    }> = [
      {
        name:
          "send_chat_message",

        params:
          rich,
      },

      {
        name:
          "send_direct_message",

        params:
          rich,
      },
    ];

  if (
    payload.messageType ===
    "text"
  ) {
    candidates.push(
      {
        name:
          "send_message",

        params: {
          p_conversation_id:
            conversationId,

          p_message:
            body,
        },
      },

      {
        name:
          "send_chat_message",

        params: {
          p_conversation_id:
            conversationId,

          p_original_text:
            body,

          p_source_language:
            locale,

          p_translations: {
            [locale]:
              body,
          },
        },
      },
    );
  }

  let rpcError = "";

  for (
    const candidate
    of candidates
  ) {
    const result =
      await rpcRequest<
        Row | Row[]
      >(
        candidate.name,
        candidate.params,
      );

    if (
      !result.error
    ) {
      const row =
        rows(
          result.data,
        )[0];

      return row
        ? directMessage(
            row,
          )
        : null;
    }

    rpcError =
      result.error;
  }

  try {
    const detected =
      await buildDirectChatInsertPayload(
        conversationId,
        payload,
        locale,
      );

    const inserted =
      await restUpsert<
        Row | Row[]
      >(
        "chat_messages",

        detected.insertPayload,
      );

    if (
      !inserted.error
    ) {
      const row =
        rows(
          inserted.data,
        )[0];

      return row
        ? directMessage({
            ...row,

            is_mine:
              true,

            sender_side:
              detected.businessId
                ? "business"
                : "user",
          })
        : null;
    }

    throw new Error(
      inserted.error,
    );
  } catch (
    cause
  ) {
    const dbError =
      cause instanceof
        Error
        ? cause.message
        : "";

    throw new Error(
      dbError ||
      rpcError ||
      "Unable to send message.",
    );
  }
}

export async function sendDirectText(
  conversationId:
    string,

  body:
    string,

  locale:
    string,
) {
  return sendDirectMessage(
    conversationId,
    {
      body,
      messageType:
        "text",
    },
    locale,
  );
}

export async function markDirectRead(
  conversationId:
    string,
) {
  // Melo Chat Lite V1:
  // canonical read-state RPC
  try {
    const result = await rpcRequest<unknown>(
      "mark_chat_as_read",
      {
        p_conversation_id: conversationId,
      },
    );

    if (!result.error) {
      const total = await loadChatUnreadTotal();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("melo-chat-unread-changed", {
            detail: { total },
          }),
        );
      }

      return;
    }

    console.warn(
      "[Melo Chat] mark_chat_as_read failed; trying legacy RPCs:",
      result.error,
    );
  } catch (error) {
    console.warn(
      "[Melo Chat] mark_chat_as_read failed; trying legacy RPCs:",
      error,
    );
  }

  for (
    const candidate
    of [
      {
        name:
          "mark_conversation_read",

        params: {
          p_conversation_id:
            conversationId,
        },
      },

      {
        name:
          "mark_chat_read",

        params: {
          p_conversation_id:
            conversationId,
        },
      },

      {
        name:
          "mark_messages_read",

        params: {
          p_conversation_id:
            conversationId,
        },
      },
    ]
  ) {
    const result =
      await rpcRequest<
        unknown
      >(
        candidate.name,
        candidate.params,
      );

    if (
      !result.error
    ) {
      return;
    }
  }
}

export type ActivityChatMessage = {
  id:
    string;

  senderId:
    string;

  senderName:
    string;

  body:
    string;

  sourceLanguage:
    string;

  translations:
    Record<
      string,
      string
    >;

  createdAt:
    string;

  messageType:
    ChatMessageKind;

  mediaPath:
    string;

  latitude:
    number | null;

  longitude:
    number | null;

  locationLabel:
    string;

  stickerCode:
    string;
};

function activityMessage(
  row:
    Row,
): ActivityChatMessage {
  const translations =
    row.translations &&
    typeof row.translations ===
      "object" &&
    !Array.isArray(
      row.translations,
    )
      ? row.translations as Record<
          string,
          string
        >
      : {};

  const messageType =
    normalizedMessageType(
      row,
    );

  const body =
    messageType ===
    "text"
      ? text(row, [
          "original_text",
          "message",
          "body",
          "text",
        ])
      : "";

  return {
    id:
      text(row, [
        "id",
      ]),

    senderId:
      text(row, [
        "sender_id",
        "user_id",
        "author_id",
      ]),

    senderName:
      text(
        row,
        [
          "sender_name",
          "display_name",
          "author_name",
        ],
        "Melo member",
      ),

    body,

    sourceLanguage:
      text(
        row,
        [
          "source_language",
          "language",
        ],
        "en",
      ),

    translations,

    createdAt:
      text(row, [
        "created_at",
        "sent_at",
      ]),

    messageType,

    mediaPath:
      text(row, [
        "media_path",
      ]),

    latitude:
      row.latitude == null
        ? null
        : Number(
            row.latitude,
          ),

    longitude:
      row.longitude == null
        ? null
        : Number(
            row.longitude,
          ),

    locationLabel:
      text(row, [
        "location_label",
      ]),

    stickerCode:
      text(row, [
        "sticker_code",
      ]),
  };
}

export async function loadActivityMessages(
  category:
    Exclude<
      ChatCategory,
      "direct"
    >,

  roomId:
    string,
): Promise<ActivityChatMessage[]> {
  if (
    category ===
    "trip"
  ) {
    const result =
      await rpcRequest<
        Row[]
      >(
        "get_trip_chat_messages",

        {
          p_trip_id:
            roomId,
        },
      );

    if (
      result.error
    ) {
      throw new Error(
        result.error,
      );
    }

    return rows(
      result.data,
    ).map(
      activityMessage,
    );
  }

  if (
    category ===
    "event"
  ) {
    const result =
      await rpcRequest<
        Row[]
      >(
        "get_event_chat_messages",

        {
          p_event_id:
            roomId,
        },
      );

    if (
      result.error
    ) {
      throw new Error(
        result.error,
      );
    }

    return rows(
      result.data,
    ).map(
      activityMessage,
    );
  }

  const v2 =
    await rpcRequest<
      Row[]
    >(
      "get_community_messages_v2",

      {
        p_community_id:
          roomId,
      },
    );

  if (
    !v2.error
  ) {
    return rows(
      v2.data,
    ).map(
      activityMessage,
    );
  }

  if (
    !missingFunction(
      v2.error,
    )
  ) {
    throw new Error(
      v2.error,
    );
  }

  const legacy =
    await rpcRequest<
      Row[]
    >(
      "get_community_messages",

      {
        p_community_id:
          roomId,
      },
    );

  if (
    legacy.error
  ) {
    throw new Error(
      legacy.error,
    );
  }

  return rows(
    legacy.data,
  ).map(
    activityMessage,
  );
}

export async function sendActivityMessage(
  category:
    Exclude<
      ChatCategory,
      "direct"
    >,

  roomId:
    string,

  payload:
    ChatMessagePayload,

  locale:
    string,
): Promise<ActivityChatMessage> {
  const common =
    richParams(
      payload,
      locale,
    );

  const body =
    messageBodyForPayload(
      payload,
    );

  let result;

  if (
    category ===
    "trip"
  ) {
    result =
      await rpcRequest<
        Row | Row[]
      >(
        "send_trip_chat_message",

        {
          p_trip_id:
            roomId,

          ...common,
        },
      );
  } else if (
    category ===
    "event"
  ) {
    result =
      await rpcRequest<
        Row | Row[]
      >(
        "send_event_chat_message",

        {
          p_event_id:
            roomId,

          ...common,
        },
      );
  } else {
    result =
      await rpcRequest<
        Row | Row[]
      >(
        "send_community_message_v2",

        {
          p_community_id:
            roomId,

          ...common,
        },
      );

    if (
      result.error &&
      missingFunction(
        result.error,
      ) &&
      payload.messageType ===
        "text"
    ) {
      result =
        await rpcRequest<
          Row | Row[]
        >(
          "send_community_message",

          {
            p_community_id:
              roomId,

            p_original_text:
              body,

            p_source_language:
              locale,

            p_translations: {
              [locale]:
                body,
            },
          },
        );
    }
  }

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  const saved =
    rows(
      result.data,
    )[0];

  if (!saved) {
    throw new Error(
      "Unable to save message.",
    );
  }

  return activityMessage(
    saved,
  );
}

export async function sendActivityText(
  category:
    Exclude<
      ChatCategory,
      "direct"
    >,

  roomId:
    string,

  body:
    string,

  locale:
    string,
): Promise<ActivityChatMessage> {
  return sendActivityMessage(
    category,
    roomId,
    {
      body,

      messageType:
        "text",
    },
    locale,
  );
}

/* ============================================================================
 * CHAT MEDIA
 * ============================================================================
 */

const CHAT_MEDIA_BUCKET =
  "chat-media";

const supabaseUrl =
  (
    process.env
      .NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(
    /\/$/,
    "",
  );

const supabaseKey =
  process.env
    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

function extensionFromFile(
  file:
    File,
) {
  const byName =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        "",
      ) || "";

  if (
    byName &&
    byName.length <= 5
  ) {
    return byName;
  }

  if (
    file.type ===
    "image/png"
  ) {
    return "png";
  }

  if (
    file.type ===
    "image/webp"
  ) {
    return "webp";
  }

  if (
    file.type ===
    "image/heic"
  ) {
    return "heic";
  }

  if (
    file.type ===
    "image/heif"
  ) {
    return "heif";
  }

  return "jpg";
}

function isTransientStorageError(
  message:
    string | null | undefined,
) {
  const normalized =
    String(
      message || "",
    ).trim();

  if (!normalized) {
    return false;
  }

  return (
    /\bHTTP\s*5\d\d\b/i.test(
      normalized,
    ) ||
    /\b5\d\d\b/.test(
      normalized,
    ) ||
    /network/i.test(
      normalized,
    ) ||
    /fetch/i.test(
      normalized,
    ) ||
    /gateway/i.test(
      normalized,
    ) ||
    /temporar/i.test(
      normalized,
    ) ||
    /timeout/i.test(
      normalized,
    )
  );
}

function wait(
  milliseconds:
    number,
) {
  return new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

export async function uploadChatImage(
  file:
    File,
) {
  if (!(await canCurrentUserUseChat())) {
    throw new Error("PLAN_UPGRADE_REQUIRED:chat");
  }

  if (
    !file.type.startsWith(
      "image/",
    )
  ) {
    throw new Error(
      "IMAGE_REQUIRED",
    );
  }

  if (
    file.size >
    12 *
      1024 *
      1024
  ) {
    throw new Error(
      "IMAGE_TOO_LARGE",
    );
  }

  const user =
    await getCurrentUser();

  const session =
    getStoredSession();

  if (
    !user?.id ||
    !session?.access_token
  ) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    throw new Error(
      "Supabase is not configured.",
    );
  }

  const suffix =
    Math.random()
      .toString(36)
      .slice(
        2,
        10,
      );

  const path =
    `${user.id}/${Date.now()}-${suffix}.${extensionFromFile(
      file,
    )}`;

  /*
   * IMPORTANT:
   * Use the shared storage helper rather than a raw fetch.
   *
   * uploadStorageObject() goes through authFetch(), so an expiring JWT can
   * refresh and retry instead of the browser continuing with a stale token.
   */
  let lastError =
    "";

  for (
    let attempt = 0;
    attempt < 3;
    attempt += 1
  ) {
    const result =
      await uploadStorageObject(
        CHAT_MEDIA_BUCKET,
        path,
        file,
        file.type ||
          "application/octet-stream",
      );

    if (
      !result.error
    ) {
      return path;
    }

    lastError =
      result.error;

    const retryable =
      isTransientStorageError(
        result.error,
      );

    if (
      !retryable ||
      attempt >= 2
    ) {
      break;
    }

    await wait(
      attempt === 0
        ? 350
        : 900,
    );
  }

  throw new Error(
    lastError ||
    "IMAGE_UPLOAD_FAILED",
  );
}

/* ============================================================================
 * MELO WEB GLOBAL POPUP NOTIFICATIONS
 * Chat + general activity notifications. Browser-only; no DB/schema changes.
 * ============================================================================
 */

const MELO_WEB_CHAT_SOUND =
  "/sounds/melo_chat_short_clear_v5.wav";

const MELO_WEB_NOTIFICATION_SOUND =
  "/sounds/melo_activity_fun_onebeat_v2.wav";

const MELO_WEB_POPUP_POLL_MS =
  5000;

const MELO_WEB_POPUP_LIMIT =
  4;

const MELO_WEB_POPUP_LIFETIME_MS =
  7200;

type MeloWebPopupLocale =
  | "th"
  | "en"
  | "de"
  | "zh"
  | "ja"
  | "ko";

const MELO_WEB_POPUP_COPY:
  Record<
    MeloWebPopupLocale,
    {
      chat:
        string;

      notification:
        string;

      close:
        string;

      newMessage:
        string;

      newNotification:
        string;
    }
  > = {
    th: {
      chat:
        "ข้อความใหม่",

      notification:
        "การแจ้งเตือน",

      close:
        "ปิด",

      newMessage:
        "คุณมีข้อความใหม่",

      newNotification:
        "คุณมีการแจ้งเตือนใหม่",
    },

    en: {
      chat:
        "New message",

      notification:
        "Notification",

      close:
        "Close",

      newMessage:
        "You have a new message",

      newNotification:
        "You have a new notification",
    },

    de: {
      chat:
        "Neue Nachricht",

      notification:
        "Benachrichtigung",

      close:
        "Schließen",

      newMessage:
        "Du hast eine neue Nachricht",

      newNotification:
        "Du hast eine neue Benachrichtigung",
    },

    zh: {
      chat:
        "新消息",

      notification:
        "通知",

      close:
        "关闭",

      newMessage:
        "你有一条新消息",

      newNotification:
        "你有一条新通知",
    },

    ja: {
      chat:
        "新しいメッセージ",

      notification:
        "通知",

      close:
        "閉じる",

      newMessage:
        "新しいメッセージがあります",

      newNotification:
        "新しい通知があります",
    },

    ko: {
      chat:
        "새 메시지",

      notification:
        "알림",

      close:
        "닫기",

      newMessage:
        "새 메시지가 있습니다",

      newNotification:
        "새 알림이 있습니다",
    },
  };

function meloWebPopupLocale():
  MeloWebPopupLocale {
  if (
    typeof document ===
    "undefined"
  ) {
    return "en";
  }

  const raw =
    String(
      document.documentElement
        .lang || "en",
    )
      .trim()
      .toLowerCase();

  if (
    raw.startsWith(
      "th",
    )
  ) {
    return "th";
  }

  if (
    raw.startsWith(
      "de",
    )
  ) {
    return "de";
  }

  if (
    raw.startsWith(
      "zh",
    )
  ) {
    return "zh";
  }

  if (
    raw.startsWith(
      "ja",
    )
  ) {
    return "ja";
  }

  if (
    raw.startsWith(
      "ko",
    )
  ) {
    return "ko";
  }

  return "en";
}

function meloWebPopupCopy() {
  return MELO_WEB_POPUP_COPY[
    meloWebPopupLocale()
  ];
}

function ensureMeloWebPopupStyles() {
  if (
    typeof document ===
      "undefined" ||
    document.getElementById(
      "melo-web-popup-styles",
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style",
    );

  style.id =
    "melo-web-popup-styles";

  style.textContent = `
    #melo-web-popup-root {
      position: fixed;
      z-index: 2147483000;
      top: 86px;
      right: 18px;
      width: min(370px, calc(100vw - 28px));
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .melo-web-popup {
      --melo-popup-accent: #2f7ff0;
      position: relative;
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr) 26px;
      gap: 11px;
      align-items: center;
      min-height: 72px;
      padding: 11px 10px 11px 12px;
      border: 1px solid rgba(20, 39, 75, 0.12);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.97);
      color: #172033;
      box-shadow: 0 16px 45px rgba(20, 39, 75, 0.18);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      overflow: hidden;
      pointer-events: auto;
      animation: meloWebPopupIn 180ms ease-out both;
    }

    .melo-web-popup[data-kind="notification"] {
      --melo-popup-accent: #ff8a35;
    }

    .melo-web-popup::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: var(--melo-popup-accent);
    }

    .melo-web-popup.is-clickable {
      cursor: pointer;
    }

    .melo-web-popup.is-clickable:hover {
      transform: translateY(-1px);
      box-shadow: 0 19px 48px rgba(20, 39, 75, 0.22);
    }

    .melo-web-popup-avatar {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      overflow: hidden;
      flex: 0 0 auto;
      background: color-mix(in srgb, var(--melo-popup-accent) 12%, #f1f5fb);
      color: var(--melo-popup-accent);
      font-size: 22px;
      font-weight: 800;
    }

    .melo-web-popup-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .melo-web-popup-copy {
      min-width: 0;
      display: grid;
      gap: 3px;
    }

    .melo-web-popup-label {
      color: var(--melo-popup-accent);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .02em;
    }

    .melo-web-popup-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.25;
    }

    .melo-web-popup-body {
      min-width: 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      font-size: 13px;
      line-height: 1.35;
      color: #657086;
      overflow-wrap: anywhere;
    }

    .melo-web-popup-close {
      align-self: start;
      width: 26px;
      height: 26px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: #8993a6;
      font-size: 19px;
      line-height: 1;
      cursor: pointer;
    }

    .melo-web-popup-close:hover {
      background: rgba(120, 132, 153, .12);
      color: #2d3648;
    }

    @keyframes meloWebPopupIn {
      from {
        opacity: 0;
        transform: translate3d(18px, -6px, 0) scale(.98);
      }

      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    @keyframes meloWebPopupOut {
      from {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }

      to {
        opacity: 0;
        transform: translate3d(14px, -4px, 0) scale(.98);
      }
    }

    html[data-theme="dark"] .melo-web-popup,
    html.dark .melo-web-popup,
    body.dark .melo-web-popup {
      border-color: rgba(255,255,255,.1);
      background: rgba(20, 25, 34, .97);
      color: #f6f8fc;
      box-shadow: 0 18px 50px rgba(0,0,0,.38);
    }

    html[data-theme="dark"] .melo-web-popup-body,
    html.dark .melo-web-popup-body,
    body.dark .melo-web-popup-body {
      color: #aeb8ca;
    }

    html[data-theme="dark"] .melo-web-popup-close,
    html.dark .melo-web-popup-close,
    body.dark .melo-web-popup-close {
      color: #aab4c5;
    }

    @media (prefers-color-scheme: dark) {
      .melo-web-popup {
        border-color: rgba(255,255,255,.1);
        background: rgba(20, 25, 34, .97);
        color: #f6f8fc;
        box-shadow: 0 18px 50px rgba(0,0,0,.38);
      }

      .melo-web-popup-body {
        color: #aeb8ca;
      }

      .melo-web-popup-close {
        color: #aab4c5;
      }
    }

    @media (max-width: 640px) {
      #melo-web-popup-root {
        top: 68px;
        right: 10px;
        left: 10px;
        width: auto;
      }

      .melo-web-popup {
        border-radius: 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .melo-web-popup {
        animation: none;
      }
    }
  `;

  document.head.appendChild(
    style,
  );
}

function meloWebPopupRoot() {
  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  ensureMeloWebPopupStyles();

  let root =
    document.getElementById(
      "melo-web-popup-root",
    );

  if (!root) {
    root =
      document.createElement(
        "div",
      );

    root.id =
      "melo-web-popup-root";

    root.setAttribute(
      "aria-live",
      "polite",
    );

    root.setAttribute(
      "aria-atomic",
      "false",
    );

    document.body.appendChild(
      root,
    );
  }

  return root;
}

const meloWebAudioCache:
  Partial<
    Record<
      | "chat"
      | "notification",
      HTMLAudioElement
    >
  > = {};

const meloWebAudioBuffers:
  Partial<
    Record<
      | "chat"
      | "notification",
      AudioBuffer
    >
  > = {};

let meloWebAudioContext:
  AudioContext | null =
  null;

let meloWebAudioPrepared =
  false;

function meloWebSoundUrl(
  kind:
    | "chat"
    | "notification",
) {
  return kind ===
    "chat"
    ? MELO_WEB_CHAT_SOUND
    : MELO_WEB_NOTIFICATION_SOUND;
}

function meloWebAudio(
  kind:
    | "chat"
    | "notification",
) {
  if (
    typeof Audio ===
    "undefined"
  ) {
    return null;
  }

  const existing =
    meloWebAudioCache[
      kind
    ];

  if (existing) {
    return existing;
  }

  const audio =
    new Audio(
      meloWebSoundUrl(
        kind,
      ),
    );

  audio.preload =
    "auto";

  audio.volume =
    0.92;

  meloWebAudioCache[
    kind
  ] = audio;

  return audio;
}

function getMeloWebAudioContext() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  if (
    meloWebAudioContext
  ) {
    return meloWebAudioContext;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?:
          typeof AudioContext;
      }
    ).webkitAudioContext;

  if (
    !AudioContextCtor
  ) {
    return null;
  }

  try {
    meloWebAudioContext =
      new AudioContextCtor();

    return meloWebAudioContext;
  } catch {
    return null;
  }
}

async function loadMeloWebAudioBuffer(
  kind:
    | "chat"
    | "notification",
) {
  if (
    meloWebAudioBuffers[
      kind
    ]
  ) {
    return meloWebAudioBuffers[
      kind
    ];
  }

  const context =
    getMeloWebAudioContext();

  if (!context) {
    return null;
  }

  try {
    const response =
      await fetch(
        meloWebSoundUrl(
          kind,
        ),
        {
          cache:
            "force-cache",
        },
      );

    if (
      !response.ok
    ) {
      console.warn(
        `[Melo Web] Sound file unavailable: ${meloWebSoundUrl(
          kind,
        )} (HTTP ${response.status})`,
      );

      return null;
    }

    const data =
      await response.arrayBuffer();

    const decoded =
      await context.decodeAudioData(
        data.slice(0),
      );

    meloWebAudioBuffers[
      kind
    ] = decoded;

    return decoded;
  } catch (
    cause
  ) {
    console.warn(
      `[Melo Web] Unable to load ${kind} sound.`,
      cause,
    );

    return null;
  }
}

function playMeloWebAudioBuffer(
  kind:
    | "chat"
    | "notification",
) {
  const context =
    getMeloWebAudioContext();

  const buffer =
    meloWebAudioBuffers[
      kind
    ];

  if (
    !context ||
    !buffer
  ) {
    return false;
  }

  const start = () => {
    try {
      const source =
        context.createBufferSource();

      const gain =
        context.createGain();

      source.buffer =
        buffer;

      gain.gain.value =
        0.92;

      source.connect(
        gain,
      );

      gain.connect(
        context.destination,
      );

      source.start(0);

      return true;
    } catch {
      return false;
    }
  };

  if (
    context.state ===
    "running"
  ) {
    return start();
  }

  void context
    .resume()
    .then(
      () =>
        start(),
    )
    .catch(
      () =>
        undefined,
    );

  return true;
}

function playMeloWebPopupSound(
  kind:
    | "chat"
    | "notification",
) {
  if (
    playMeloWebAudioBuffer(
      kind,
    )
  ) {
    return;
  }

  const audio =
    meloWebAudio(
      kind,
    );

  if (!audio) {
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 0.92;

    void audio
      .play()
      .catch(
        () =>
          undefined,
      );
  } catch {
    // Browser autoplay rules can still block custom audio.
  }
}

async function unlockMeloWebPopupAudio() {
  const context =
    getMeloWebAudioContext();

  if (context) {
    try {
      await context.resume();
    } catch {
      // HTMLAudio remains available as fallback.
    }
  }

  await Promise.all([
    loadMeloWebAudioBuffer(
      "chat",
    ),

    loadMeloWebAudioBuffer(
      "notification",
    ),
  ]);

  for (
    const kind
    of [
      "chat",
      "notification",
    ] as const
  ) {
    const audio =
      meloWebAudio(
        kind,
      );

    if (!audio) {
      continue;
    }

    try {
      const oldMuted =
        audio.muted;

      const oldVolume =
        audio.volume;

      audio.muted =
        true;

      audio.volume =
        0;

      await audio
        .play()
        .catch(
          () =>
            undefined,
        );

      audio.pause();

      audio.currentTime =
        0;

      audio.muted =
        oldMuted;

      audio.volume =
        oldVolume ||
        0.92;
    } catch {
      // WebAudio may still be usable.
    }
  }

  meloWebAudioPrepared =
    true;
}

function prepareMeloWebPopupAudio() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const unlock = () => {
    void unlockMeloWebPopupAudio();

    window.removeEventListener(
      "pointerdown",
      unlock,
    );

    window.removeEventListener(
      "keydown",
      unlock,
    );
  };

  window.addEventListener(
    "pointerdown",
    unlock,
    {
      once: true,
      passive: true,
    },
  );

  window.addEventListener(
    "keydown",
    unlock,
    {
      once: true,
    },
  );
}

function removeMeloWebPopup(
  element:
    HTMLElement,
) {
  if (
    !element.isConnected
  ) {
    return;
  }

  element.style.animation =
    "meloWebPopupOut 150ms ease-in both";

  window.setTimeout(
    () =>
      element.remove(),

    155,
  );
}

const MELO_WEB_NOTIFICATION_SW =
  "/melo-notifications-sw.js";

let meloWebNotificationRegistration:
  ServiceWorkerRegistration | null =
  null;

let meloWebNotificationPermissionHooked =
  false;

async function ensureMeloWebNotificationServiceWorker() {
  if (
    typeof window ===
      "undefined" ||
    !(
      "serviceWorker"
      in navigator
    ) ||
    !window.isSecureContext
  ) {
    return null;
  }

  if (
    meloWebNotificationRegistration
  ) {
    return meloWebNotificationRegistration;
  }

  try {
    const registration =
      await navigator.serviceWorker.register(
        MELO_WEB_NOTIFICATION_SW,
        {
          scope: "/",
        },
      );

    meloWebNotificationRegistration =
      registration;

    return registration;
  } catch (
    cause
  ) {
    console.warn(
      "[Melo Web] Unable to register desktop notification service worker.",
      cause,
    );

    return null;
  }
}

async function requestMeloWebDesktopNotificationPermission() {
  if (
    typeof window ===
      "undefined" ||
    !(
      "Notification"
      in window
    )
  ) {
    return "unsupported";
  }

  if (
    Notification.permission !==
    "default"
  ) {
    return Notification.permission;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function prepareMeloWebDesktopNotificationPermission() {
  if (
    typeof window ===
      "undefined" ||
    !(
      "Notification"
      in window
    ) ||
    meloWebNotificationPermissionHooked
  ) {
    return;
  }

  meloWebNotificationPermissionHooked =
    true;

  void ensureMeloWebNotificationServiceWorker();

  const ask = () => {
    if (
      Notification.permission ===
      "default"
    ) {
      void requestMeloWebDesktopNotificationPermission();
    }

    window.removeEventListener(
      "pointerdown",
      ask,
    );

    window.removeEventListener(
      "keydown",
      ask,
    );
  };

  window.addEventListener(
    "pointerdown",
    ask,
    {
      once: true,
      passive: true,
    },
  );

  window.addEventListener(
    "keydown",
    ask,
    {
      once: true,
    },
  );
}

async function showMeloWebDesktopNotification(
  options: {
    key:
      string;

    kind:
      | "chat"
      | "notification";

    title:
      string;

    body:
      string;

    avatarUrl?:
      string;

    href?:
      string;
  },
) {
  if (
    typeof window ===
      "undefined" ||
    !(
      "Notification"
      in window
    ) ||
    Notification.permission !==
      "granted"
  ) {
    return;
  }

  if (
    !document.hidden &&
    document.hasFocus()
  ) {
    return;
  }

  const copy =
    meloWebPopupCopy();

  const title =
    options.title ||
    (
      options.kind ===
      "chat"
        ? copy.newMessage
        : copy.notification
    );

  const body =
    options.body ||
    (
      options.kind ===
      "chat"
        ? copy.newMessage
        : copy.newNotification
    );

  const notificationOptions = {
  body,

  icon:
    options.avatarUrl ||
    "/favicon.ico",

  badge:
    "/favicon.ico",

  tag:
    options.key,

  data: {
    href:
      options.href ||
      "",

    kind:
      options.kind,
  },

  renotify:
    true,
} as NotificationOptions & {
  renotify: boolean;
};

  const registration =
    await ensureMeloWebNotificationServiceWorker();

  if (registration) {
    try {
      await registration.showNotification(
        title,
        notificationOptions,
      );

      return;
    } catch (
      cause
    ) {
      console.warn(
        "[Melo Web] Service-worker notification failed.",
        cause,
      );
    }
  }

  try {
    const notification =
      new Notification(
        title,
        notificationOptions,
      );

    notification.onclick =
      () => {
        window.focus();

        if (
          options.href
        ) {
          window.location.assign(
            options.href,
          );
        }

        notification.close();
      };
  } catch {
    // No further desktop-notification fallback.
  }
}

function showMeloWebPopup(
  options: {
    key:
      string;

    kind:
      | "chat"
      | "notification";

    title:
      string;

    body:
      string;

    avatarUrl?:
      string;

    href?:
      string;
  },
) {
  if (
    typeof window ===
      "undefined" ||
    typeof document ===
      "undefined"
  ) {
    return;
  }

  void showMeloWebDesktopNotification(
    options,
  );

  const root =
    meloWebPopupRoot();

  if (!root) {
    return;
  }

  const old =
    root.querySelector<
      HTMLElement
    >(
      `[data-popup-key="${CSS.escape(
        options.key,
      )}"]`,
    );

  if (old) {
    old.remove();
  }

  while (
    root.children.length >=
    MELO_WEB_POPUP_LIMIT
  ) {
    root.firstElementChild?.remove();
  }

  const copy =
    meloWebPopupCopy();

  const popup =
    document.createElement(
      "section",
    );

  popup.className =
    `melo-web-popup${
      options.href
        ? " is-clickable"
        : ""
    }`;

  popup.dataset.kind =
    options.kind;

  popup.dataset.popupKey =
    options.key;

  popup.setAttribute(
    "role",
    "status",
  );

  const avatar =
    document.createElement(
      "span",
    );

  avatar.className =
    "melo-web-popup-avatar";

  if (
    options.avatarUrl
  ) {
    const image =
      document.createElement(
        "img",
      );

    image.src =
      options.avatarUrl;

    image.alt =
      "";

    avatar.appendChild(
      image,
    );
  } else {
    avatar.textContent =
      options.kind ===
      "chat"
        ? "💬"
        : "🔔";
  }

  const copyWrap =
    document.createElement(
      "span",
    );

  copyWrap.className =
    "melo-web-popup-copy";

  const label =
    document.createElement(
      "span",
    );

  label.className =
    "melo-web-popup-label";

  label.textContent =
    options.kind ===
    "chat"
      ? copy.chat
      : copy.notification;

  const title =
    document.createElement(
      "strong",
    );

  title.className =
    "melo-web-popup-title";

  title.textContent =
    options.title ||
    (
      options.kind ===
      "chat"
        ? copy.newMessage
        : copy.newNotification
    );

  const body =
    document.createElement(
      "span",
    );

  body.className =
    "melo-web-popup-body";

  body.textContent =
    options.body ||
    (
      options.kind ===
      "chat"
        ? copy.newMessage
        : copy.newNotification
    );

  copyWrap.append(
    label,
    title,
    body,
  );

  const close =
    document.createElement(
      "button",
    );

  close.type =
    "button";

  close.className =
    "melo-web-popup-close";

  close.setAttribute(
    "aria-label",
    copy.close,
  );

  close.textContent =
    "×";

  close.addEventListener(
    "click",

    (
      event,
    ) => {
      event.stopPropagation();

      removeMeloWebPopup(
        popup,
      );
    },
  );

  popup.append(
    avatar,
    copyWrap,
    close,
  );

  if (
    options.href
  ) {
    popup.addEventListener(
      "click",

      (
        event,
      ) => {
        if (
          (
            event.target as HTMLElement
          ).closest(
            ".melo-web-popup-close",
          )
        ) {
          return;
        }

        window.location.assign(
          options.href!,
        );
      },
    );
  }

  root.appendChild(
    popup,
  );

  playMeloWebPopupSound(
    options.kind,
  );

  window.setTimeout(
    () =>
      removeMeloWebPopup(
        popup,
      ),

    MELO_WEB_POPUP_LIFETIME_MS,
  );
}

function meloNotificationKey(
  row: Row,
) {
  const meta =
    notificationMeta(
      row,
    );

  return (
    text(row, [
      "id",
      "notification_id",
    ]) ||
    text(meta, [
      "id",
      "notification_id",
    ]) ||
    [
      text(row, [
        "created_at",
        "sent_at",
      ]),

      text(row, [
        "type",
        "notification_type",
        "kind",
      ]),

      text(row, [
        "title",
        "notification_title",
      ]),

      text(row, [
        "message",
        "body",
        "text",
        "description",
      ]),
    ].join("|")
  );
}

function meloNotificationTitle(
  row: Row,
) {
  const meta =
    notificationMeta(
      row,
    );

  return (
    text(row, [
      "title",
      "notification_title",
      "subject",
      "heading",
    ]) ||
    text(meta, [
      "title",
      "notification_title",
      "subject",
      "heading",
    ])
  );
}

function meloNotificationBody(
  row: Row,
) {
  const meta =
    notificationMeta(
      row,
    );

  return (
    text(row, [
      "message",
      "body",
      "text",
      "description",
      "preview",
      "content",
    ]) ||
    text(meta, [
      "message",
      "body",
      "text",
      "description",
      "preview",
      "content",
    ])
  );
}

function meloActivityNotificationCopy(
  row: Row,
) {
  const locale =
    meloWebPopupLocale();

  const meta =
    notificationMeta(
      row,
    );

  const sourceText = [
    text(row, [
      "type",
      "notification_type",
      "kind",
      "event_type",
      "title",
      "subject",
      "heading",
      "body",
      "message",
      "description",
    ]),
    text(meta, [
      "type",
      "notification_type",
      "kind",
      "activity_type",
      "entity_type",
      "title",
      "subject",
      "heading",
      "body",
      "message",
      "description",
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const kind =
    sourceText.includes("match")
      ? "match"
      : (
          sourceText.includes("likes_you") ||
          sourceText.includes("like_you") ||
          sourceText.includes("likes you") ||
          sourceText.includes("liked you") ||
          sourceText.includes("dating_like_received") ||
          sourceText.includes("love_like_received") ||
          sourceText.includes("interested")
        )
        ? "likesYou"
        : sourceText.includes("follow")
          ? "follow"
          : (
              sourceText.includes("post") &&
              sourceText.includes("comment")
            )
            ? "postComment"
            : (
                sourceText.includes("post") &&
                sourceText.includes("like")
              )
              ? "postLike"
              : "generic";

  const copy = {
    th: {
      title: "การแจ้งเตือนใหม่ จาก Melo Chat",
      match: "คุณมี Match ใหม่ เปิดดูรายละเอียดได้เลย",
      likesYou: "มีคนสนใจคุณ เปิดดูรายละเอียดได้เลย",
      follow: "มีคนเริ่มติดตามคุณ เปิดดูรายละเอียดได้เลย",
      postLike: "มีคนถูกใจโพสต์ของคุณ เปิดดูรายละเอียดได้เลย",
      postComment: "มีความคิดเห็นใหม่ในโพสต์ของคุณ เปิดดูรายละเอียดได้เลย",
      generic: "คุณมีการแจ้งเตือนใหม่ เปิดดูรายละเอียดได้เลย",
    },
    en: {
      title: "New notification from Melo Chat",
      match: "You have a new Match. Open to view the details.",
      likesYou: "Someone is interested in you. Open to view the details.",
      follow: "Someone started following you. Open to view the details.",
      postLike: "Someone liked your post. Open to view the details.",
      postComment: "You have a new comment on your post. Open to view the details.",
      generic: "You have a new notification. Open to view the details.",
    },
    de: {
      title: "Neue Benachrichtigung von Melo Chat",
      match: "Du hast ein neues Match. Öffne die Benachrichtigung für Details.",
      likesYou: "Jemand interessiert sich für dich. Öffne die Benachrichtigung für Details.",
      follow: "Jemand folgt dir jetzt. Öffne die Benachrichtigung für Details.",
      postLike: "Jemandem gefällt dein Beitrag. Öffne die Benachrichtigung für Details.",
      postComment: "Du hast einen neuen Kommentar zu deinem Beitrag. Öffne die Benachrichtigung für Details.",
      generic: "Du hast eine neue Benachrichtigung. Öffne sie für Details.",
    },
  } as const;

  const localized =
    locale === "th" ||
    locale === "de"
      ? copy[locale]
      : copy.en;

  return {
    title:
      localized.title,
    body:
      localized[kind],
  };
}

function meloNotificationHref(
  row: Row,
) {
  // MELO_ACTIVITY_POPUP_ROUTING_V3
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const meta =
    notificationMeta(
      row,
    );

  const sourceText = [
    text(row, [
      "type",
      "notification_type",
      "kind",
      "event_type",
      "title",
      "subject",
      "heading",
      "body",
      "message",
      "description",
    ]),
    text(meta, [
      "type",
      "notification_type",
      "kind",
      "activity_type",
      "entity_type",
      "title",
      "subject",
      "heading",
      "body",
      "message",
      "description",
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const postId =
    text(meta, [
      "post_id",
      "feed_post_id",
    ]) ||
    text(row, [
      "post_id",
      "feed_post_id",
    ]) ||
    (
      sourceText.includes("post")
        ? (
            text(meta, [
              "activity_id",
              "context_id",
              "entity_id",
            ]) ||
            text(row, [
              "activity_id",
              "context_id",
              "entity_id",
            ])
          )
        : ""
    );

  const isPostNotification =
    sourceText.includes("post") &&
    (
      sourceText.includes("like") ||
      sourceText.includes("comment")
    );

  if (
    isPostNotification &&
    postId
  ) {
    return `/feed?post=${encodeURIComponent(
      postId,
    )}`;
  }

  if (
    isPostNotification
  ) {
    return "/feed";
  }

  const isLikesYou =
    sourceText.includes("likes_you") ||
    sourceText.includes("like_you") ||
    sourceText.includes("likes you") ||
    sourceText.includes("liked you") ||
    sourceText.includes("dating_like_received") ||
    sourceText.includes("love_like_received");

  if (
    isLikesYou
  ) {
    return "/connect?tab=incoming";
  }

  const isMatch =
    sourceText.includes("match") ||
    sourceText.includes("matched") ||
    sourceText.includes("new_match") ||
    sourceText.includes("love_match") ||
    sourceText.includes("dating_match");

  if (
    isMatch
  ) {
    return "/connect?tab=connected";
  }

  const raw =
    text(row, [
      "href",
      "path",
      "url",
      "link",
      "deep_link",
    ]) ||
    text(meta, [
      "href",
      "path",
      "url",
      "link",
      "deep_link",
    ]);

  if (!raw) {
    return "";
  }

  try {
    const currentUrl =
      new URL(
        raw,
        window.location.origin,
      );

    if (
      currentUrl.origin !==
      window.location.origin
    ) {
      return "";
    }

    const route =
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;

    // Melo Chat Lite no longer uses /love.
    if (
      currentUrl.pathname ===
      "/love"
    ) {
      return "/connect?tab=connected";
    }

    return route;
  } catch {
    if (
      raw === "/love" ||
      raw.startsWith("/love?")
    ) {
      return "/connect?tab=connected";
    }

    return raw.startsWith(
      "/",
    )
      ? raw
      : "";
  }
}
async function meloActivePartnerBusinessId() {
  if (
    typeof window ===
      "undefined" ||
    !window.location.pathname.startsWith(
      "/partner",
    )
  ) {
    return "";
  }

  const user =
    await getCurrentUser();

  if (
    !user?.id
  ) {
    return "";
  }

  const result =
    await restSelect<
      Row[]
    >(
      "partner_mode_preferences",

      `select=*&user_id=eq.${encodeURIComponent(
        user.id,
      )}&limit=1`,
    );

  if (
    result.error
  ) {
    return "";
  }

  const preference =
    rows(
      result.data,
    )[0];

  return text(
    preference,
    [
      "active_business_id",
      "business_id",
    ],
  );
}

async function meloPopupChatRooms() {
  const businessId =
    await meloActivePartnerBusinessId();

  if (businessId) {
    const partnerRooms =
      await loadPartnerBusinessChatRooms(
        businessId,
        "Melo customer",
      );

    return {
      modeKey:
        `partner:${businessId}`,

      partnerMode:
        true,

      rooms:
        partnerRooms,
    };
  }

  const snapshot =
    await loadChatSnapshot();

  return {
    modeKey:
      "user",

    partnerMode:
      false,

    rooms: [
      ...snapshot.rooms.direct,
      ...snapshot.rooms.trip,
      ...snapshot.rooms.event,
      ...snapshot.rooms.community,
    ],
  };
}

function meloChatRoomSignature(
  room:
    ChatRoom,
) {
  return (
    `${room.lastMessageAt || ""}|${room.lastMessage || ""}|${room.unreadCount || 0}`
  );
}

function meloChatPopupHref(
  room:
    ChatRoom,

  partnerMode:
    boolean,
) {
  if (
    partnerMode
  ) {
    return "";
  }

  return (
    room.href ||
    `/chat?type=${room.category}&room=${encodeURIComponent(
      room.id,
    )}`
  );
}

function meloMessageConversationId(
  row:
    Row,
) {
  return text(row, [
    "conversation_id",
    "chat_id",
    "room_id",
  ]);
}

function meloMessageKey(
  row:
    Row,
) {
  return (
    text(row, [
      "id",
      "message_id",
    ]) ||
    [
      meloMessageConversationId(
        row,
      ),

      text(row, [
        "created_at",
        "sent_at",
      ]),

      text(row, [
        "original_text",
        "content",
        "message_text",
        "message",
        "body",
        "text",
      ]),

      text(row, [
        "sender_id",
        "sender_user_id",
        "from_user_id",
        "author_id",
        "user_id",
      ]),
    ].join("|")
  );
}

function meloMessageSenderId(
  row:
    Row,
) {
  return text(row, [
    "sender_id",
    "sender_user_id",
    "from_user_id",
    "author_id",
    "author_user_id",
    "created_by_user_id",
    "sender_profile_id",
    "profile_id",
    "user_id",
  ]);
}

function meloMessagePreview(
  row:
    Row,

  room?:
    ChatRoom,
) {
  const body =
    text(row, [
      "original_text",
      "content",
      "message_text",
      "message",
      "body",
      "text",
    ]);

  if (body) {
    return body;
  }

  const type =
    normalizedMessageType(
      row,
    );

  if (
    type === "image"
  ) {
    return "📷";
  }

  if (
    type === "location"
  ) {
    const label =
      text(row, [
        "location_label",
      ]);

    return label
      ? `📍 ${label}`
      : "📍";
  }

  if (
    type === "sticker"
  ) {
    return (
      text(row, [
        "sticker_code",
      ]) ||
      "✨"
    );
  }

  return (
    room?.lastMessage ||
    room?.subtitle ||
    meloWebPopupCopy()
      .newMessage
  );
}

function meloMessageIsMine(
  row:
    Row,

  userId:
    string,

  partnerMode:
    boolean,
) {
  const side =
    messageSenderSide(
      row,
    );

  if (side) {
    return partnerMode
      ? side ===
          "business"
      : side ===
          "user";
  }

  const senderId =
    meloMessageSenderId(
      row,
    );

  return Boolean(
    senderId &&
    userId &&
    senderId === userId,
  );
}

async function meloRecentDirectChatRows(
  roomIds:
    string[],
) {
  const ids = [
    ...new Set(
      roomIds
        .map(
          (id) =>
            String(
              id || "",
            ).trim(),
        )
        .filter(Boolean),
    ),
  ];

  if (
    !ids.length
  ) {
    return [] as Row[];
  }

  const quoted =
    ids
      .map(
        (id) =>
          `"${id.replace(
            /"/g,
            "",
          )}"`,
      )
      .join(",");

  const result =
    await restSelect<
      Row[]
    >(
      "chat_messages",

      `select=*&conversation_id=in.(${encodeURIComponent(
        quoted,
      )})&order=created_at.desc&limit=120`,
    );

  if (
    !result.error
  ) {
    return rows(
      result.data,
    );
  }

  const fallback =
    await Promise.all(
      ids
        .slice(
          0,
          30,
        )
        .map(
          async (
            conversationId,
          ) => {
            const roomResult =
              await restSelect<
                Row[]
              >(
                "chat_messages",

                `select=*&conversation_id=eq.${encodeURIComponent(
                  conversationId,
                )}&order=created_at.desc&limit=8`,
              );

            return roomResult.error
              ? []
              : rows(
                  roomResult.data,
                );
          },
        ),
    );

  return fallback.flat();
}

function newestMessagePerRoom(
  messageRows:
    Row[],
) {
  const result =
    new Map<
      string,
      Row
    >();

  for (
    const row
    of messageRows
  ) {
    const conversationId =
      meloMessageConversationId(
        row,
      );

    if (
      !conversationId ||
      result.has(
        conversationId,
      )
    ) {
      continue;
    }

    result.set(
      conversationId,
      row,
    );
  }

  return result;
}

function ensureMeloWebPopupWatcherStarted() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.setTimeout(
    startMeloWebPopupWatcher,
    0,
  );
}

function meloWebRealtimeSocketUrl() {
  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    return "";
  }

  try {
    const realtimeUrl =
      new URL(
        supabaseUrl,
      );

    realtimeUrl.protocol =
      realtimeUrl.protocol ===
      "https:"
        ? "wss:"
        : "ws:";

    realtimeUrl.pathname =
      `${realtimeUrl.pathname.replace(
        /\/$/,
        "",
      )}/realtime/v1/websocket`;

    realtimeUrl.search =
      "";

    realtimeUrl.searchParams.set(
      "apikey",
      supabaseKey,
    );

    realtimeUrl.searchParams.set(
      "vsn",
      "1.0.0",
    );

    return realtimeUrl.toString();
  } catch {
    return "";
  }
}

function startMeloWebRealtimeWakeup(
  onDatabaseChange:
    () => void,
) {
  if (
    typeof window ===
      "undefined" ||
    typeof WebSocket ===
      "undefined"
  ) {
    return () =>
      undefined;
  }

  const websocketUrl =
    meloWebRealtimeSocketUrl();

  if (
    !websocketUrl
  ) {
    return () =>
      undefined;
  }

  let socket:
    WebSocket | null =
    null;

  let stopped =
    false;

  let heartbeat:
    number | null =
    null;

  let retryTimer:
    number | null =
    null;

  let ref =
    1;

  const clearTimers =
    () => {
      if (
        heartbeat != null
      ) {
        window.clearInterval(
          heartbeat,
        );
      }

      if (
        retryTimer != null
      ) {
        window.clearTimeout(
          retryTimer,
        );
      }

      heartbeat =
        null;

      retryTimer =
        null;
    };

  const scheduleReconnect =
    () => {
      if (
        stopped ||
        retryTimer != null
      ) {
        return;
      }

      retryTimer =
        window.setTimeout(
          () => {
            retryTimer =
              null;

            connect();
          },

          5000,
        );
    };

  const send = (
    message:
      Record<
        string,
        unknown
      >,
  ) => {
    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }

    socket.send(
      JSON.stringify(
        message,
      ),
    );
  };

  const connect = () => {
    if (
      stopped
    ) {
      return;
    }

    clearTimers();

    const session =
      getStoredSession();

    if (
      !session?.access_token
    ) {
      scheduleReconnect();

      return;
    }

    try {
      socket =
        new WebSocket(
          websocketUrl,
        );
    } catch {
      scheduleReconnect();

      return;
    }

    socket.addEventListener(
      "open",

      () => {
        const joinRef =
          String(
            ref++,
          );

        send({
          topic:
            "realtime:melo_web_notifications",

          event:
            "phx_join",

          payload: {
            config: {
              broadcast: {
                ack:
                  false,

                self:
                  false,
              },

              presence: {
                key:
                  "",
              },

              postgres_changes: [
                {
                  event:
                    "INSERT",

                  schema:
                    "public",

                  table:
                    "chat_messages",
                },

                {
                  event:
                    "INSERT",

                  schema:
                    "public",

                  table:
                    "notifications",
                },

                {
                  event:
                    "INSERT",

                  schema:
                    "public",

                  table:
                    "app_notifications",
                },
              ],

              private:
                false,
            },

            access_token:
              session.access_token,
          },

          ref:
            joinRef,

          join_ref:
            joinRef,
        });

        heartbeat =
          window.setInterval(
            () => {
              send({
                topic:
                  "phoenix",

                event:
                  "heartbeat",

                payload:
                  {},

                ref:
                  String(
                    ref++,
                  ),
              });
            },

            25000,
          );
      },
    );

    socket.addEventListener(
      "message",

      (
        event,
      ) => {
        try {
          const message =
            JSON.parse(
              String(
                event.data ||
                  "{}",
              ),
            ) as {
              event?:
                string;

              payload?:
                unknown;
            };

          if (
            message.event ===
              "postgres_changes" ||
            message.event ===
              "INSERT"
          ) {
            onDatabaseChange();
          }
        } catch {
          // Ignore malformed realtime frames.
        }
      },
    );

    socket.addEventListener(
      "close",

      () => {
        if (
          heartbeat != null
        ) {
          window.clearInterval(
            heartbeat,
          );
        }

        heartbeat =
          null;

        scheduleReconnect();
      },
    );

    socket.addEventListener(
      "error",

      () => {
        try {
          socket?.close();
        } catch {
          scheduleReconnect();
        }
      },
    );
  };

  connect();

  return () => {
    stopped =
      true;

    clearTimers();

    try {
      socket?.close();
    } catch {
      // Ignore shutdown errors.
    }
  };
}

function startMeloWebPopupWatcher() {
  if (
    typeof window ===
      "undefined" ||
    typeof document ===
      "undefined"
  ) {
    return;
  }

  const globalWindow =
    window as Window & {
      __meloWebPopupWatcherStarted?:
        boolean;

      __meloWebPopupWatcherLastRun?:
        number;
    };

  if (
    globalWindow.__meloWebPopupWatcherStarted
  ) {
    return;
  }

  globalWindow.__meloWebPopupWatcherStarted =
    true;

  prepareMeloWebPopupAudio();

  prepareMeloWebDesktopNotificationPermission();

  void ensureMeloWebNotificationServiceWorker();

  ensureMeloWebPopupStyles();

  meloWebPopupRoot();

  let running =
    false;

  let chatModeKey =
    "";

  let chatPrimed =
    false;

  let notificationPrimed =
    false;

  let knownMessageKeys =
    new Set<string>();

  let knownNotificationKeys =
    new Set<string>();

  let activityRoomState =
    new Map<
      string,
      string
    >();

  const check =
    async () => {
      if (
        running
      ) {
        return;
      }

      running =
        true;

      globalWindow.__meloWebPopupWatcherLastRun =
        Date.now();

      try {
        const user =
          await getCurrentUser();

        if (
          !user?.id
        ) {
          chatModeKey =
            "";

          chatPrimed =
            false;

          notificationPrimed =
            false;

          knownMessageKeys =
            new Set();

          knownNotificationKeys =
            new Set();

          activityRoomState =
            new Map();

          return;
        }

        const chatAllowed =
          await canCurrentUserUseChat();

        const [
          chatResult,
          notificationResult,
        ] =
          await Promise.all([
            meloPopupChatRooms()
              .catch(
                () =>
                  null,
              ),

            (async () => {
              const primary =
                await restSelect<Row[]>(
                  "notifications",
                  "select=*&order=created_at.desc&limit=100",
                ).catch(
                  () => ({
                    data:
                      [] as Row[],

                    error:
                      "request_failed",
                  }),
                );

              if (
                !primary.error
              ) {
                return primary;
              }

              // Legacy fallback for older Melo deployments.
              return restSelect<Row[]>(
                "app_notifications",
                "select=*&order=created_at.desc&limit=100",
              ).catch(
                () => ({
                  data:
                    [] as Row[],

                  error:
                    "request_failed",
                }),
              );
            })(),
          ]);

        if (
          chatResult
        ) {
          if (
            chatModeKey !==
            chatResult.modeKey
          ) {
            chatModeKey =
              chatResult.modeKey;

            chatPrimed =
              false;

            knownMessageKeys =
              new Set();

            activityRoomState =
              new Map();
          }

          const roomById =
            new Map(
              chatResult.rooms.map(
                (
                  room,
                ) => [
                  room.id,
                  room,
                ],
              ),
            );

          const directRooms =
            chatResult.rooms.filter(
              (
                room,
              ) =>
                room.category ===
                "direct",
            );

          const directRows =
            chatAllowed
              ? await meloRecentDirectChatRows(
                  directRooms.map(
                    (
                      room,
                    ) =>
                      room.id,
                  ),
                )
              : [];

          const currentMessageKeys =
            new Set(
              directRows
                .map(
                  meloMessageKey,
                )
                .filter(
                  Boolean,
                ),
            );

          if (
            chatPrimed
          ) {
            const unseenIncoming =
              directRows.filter(
                (
                  row,
                ) => {
                  const key =
                    meloMessageKey(
                      row,
                    );

                  if (
                    !key ||
                    knownMessageKeys.has(
                      key,
                    )
                  ) {
                    return false;
                  }

                  return !meloMessageIsMine(
                    row,
                    user.id,
                    chatResult.partnerMode,
                  );
                },
              );

            const newestIncoming =
              newestMessagePerRoom(
                unseenIncoming,
              );

            for (
              const [
                conversationId,
                row,
              ]
              of newestIncoming
            ) {
              const room =
                roomById.get(
                  conversationId,
                );

              if (!room) {
                continue;
              }

              showMeloWebPopup({
                key:
                  `chat:${chatResult.modeKey}:${meloMessageKey(
                    row,
                  )}`,

                kind:
                  "chat",

                title:
                  room.title ||
                  meloWebPopupCopy()
                    .chat,

                body:
                  meloMessagePreview(
                    row,
                    room,
                  ),

                avatarUrl:
                  room.avatarUrl,

                href:
                  meloChatPopupHref(
                    room,
                    chatResult.partnerMode,
                  ),
              });
            }

            for (
              const room
              of chatResult.rooms
            ) {
              if (
                room.category ===
                "direct"
              ) {
                continue;
              }

              const key =
                `${room.category}:${room.id}`;

              const signature =
                meloChatRoomSignature(
                  room,
                );

              const previous =
                activityRoomState.get(
                  key,
                );

              if (
                previous &&
                previous !==
                  signature &&
                Number(
                  room.unreadCount ||
                    0,
                ) > 0
              ) {
                showMeloWebPopup({
                  key:
                    `activity-chat:${key}:${signature}`,

                  kind:
                    "chat",

                  title:
                    room.title,

                  body:
                    room.lastMessage ||
                    room.subtitle ||
                    meloWebPopupCopy()
                      .newMessage,

                  avatarUrl:
                    room.avatarUrl,

                  href:
                    meloChatPopupHref(
                      room,
                      false,
                    ),
                });
              }
            }
          }

          knownMessageKeys =
            currentMessageKeys;

          activityRoomState =
            new Map(
              chatResult.rooms
                .filter(
                  (
                    room,
                  ) =>
                    room.category !==
                    "direct",
                )
                .map(
                  (
                    room,
                  ) => [
                    `${room.category}:${room.id}`,

                    meloChatRoomSignature(
                      room,
                    ),
                  ],
                ),
            );

          chatPrimed =
            true;
        }

        if (
          !notificationResult.error
        ) {
          const notificationRows =
            rows(
              notificationResult.data,
            ).filter(
              (
                row,
              ) => {
                const category =
                  categoryFromNotification(
                    row,
                  );

                // Paid members keep the dedicated chat watcher with message
                // previews. Free members receive only the generic notification
                // row created by the server and never read chat message bodies.
                return (
                  category === null ||
                  (!chatAllowed && category === "direct")
                );
              },
            );

          const currentNotificationKeys =
            new Set(
              notificationRows
                .map(
                  meloNotificationKey,
                )
                .filter(
                  Boolean,
                ),
            );

          if (
            notificationPrimed
          ) {
            for (
              const row
              of notificationRows
                .slice()
                .reverse()
            ) {
              const key =
                meloNotificationKey(
                  row,
                );

              if (
                !key ||
                knownNotificationKeys.has(
                  key,
                )
              ) {
                continue;
              }

              const activityCopy =
                meloActivityNotificationCopy(
                  row,
                );

              showMeloWebPopup({
                key:
                  `notification:${key}`,

                kind:
                  "notification",

                title:
                  activityCopy.title,

                body:
                  activityCopy.body,

                href:
                  meloNotificationHref(
                    row,
                  ),
              });
            }
          }

          knownNotificationKeys =
            currentNotificationKeys;

          notificationPrimed =
            true;
        }
      } finally {
        running =
          false;
      }
    };

  void check();

  window.setInterval(
    () =>
      void check(),

    MELO_WEB_POPUP_POLL_MS,
  );

  const refreshSoon =
    () =>
      window.setTimeout(
        () =>
          void check(),

        180,
      );

  const refreshVisible =
    () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void check();
      }
    };

  startMeloWebRealtimeWakeup(
    refreshSoon,
  );

  window.addEventListener(
    "melo-chat-unread-changed",
    refreshSoon,
  );

  window.addEventListener(
    "melo-partner-chat-unread-changed",
    refreshSoon,
  );

  window.addEventListener(
    "focus",
    refreshSoon,
  );

  document.addEventListener(
    "visibilitychange",
    refreshVisible,
  );
}

ensureMeloWebPopupWatcherStarted();





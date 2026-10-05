"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/SiteProviders";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import {
  createSignedStorageUrl,
  getCurrentUser,
  getStoredSession,
  invokeEdgeFunction,
  isSupabaseConfigured,
  publicStorageUrl,
  restSelect,
  rpcRequest,
} from "@/lib/supabase/browser";
import { activityChatCopy } from "@/i18n/activityChatUi";
import {
  loadActivityMessages,
  loadDirectMessages,
  loadDirectMessagesPage,
  markDirectRead,
  sendActivityMessage,
  sendDirectMessage,
  uploadChatImage,
  type ActivityChatMessage,
  type ChatMessagePayload,
  type ChatRoom,
  type DirectMessage,
} from "./chatData";
import styles from "./ChatCenter.module.css";
import avatarStyles from "./ChatMessageAvatar.module.css";

import { isMeloMessageMine, resolveMeloContactText } from "./chatIdentity";

const COPY = {
  th: {
    select: "เลือกแชทจากรายการเพื่อเริ่มสนทนา",
    loading: "กำลังโหลดข้อความ…",
    empty: "ยังไม่มีข้อความ เริ่มบทสนทนาได้เลย",
    placeholder: "พิมพ์ข้อความ…",
    send: "ส่ง",
    failed: "โหลดหรือส่งข้อความไม่สำเร็จ",
    login: "กรุณาเข้าสู่ระบบ",
    env: "ยังไม่ได้ตั้งค่า Supabase",
    direct: "ข้อความ",
    trip: "แชททริป",
    event: "แชทอีเวนต์",
    community: "แชทคอมมูนิตี้",
    location: "ตำแหน่ง",
    openMap: "เปิดแผนที่",
    sticker: "สติ๊กเกอร์",
    shareLocation: "แชร์ตำแหน่ง",
    attachImage: "แนบรูปภาพ",
    currentLocation: "ตำแหน่งปัจจุบัน",
    locationFailed: "ไม่สามารถอ่านตำแหน่งปัจจุบันได้",
    imageOnly: "กรุณาเลือกไฟล์รูปภาพ",
    imageTooLarge: "รูปภาพต้องมีขนาดไม่เกิน 12 MB",
    photo: "รูปภาพ",
    translation: "แปลข้อความ",
    translationOn: "เปิด",
    translationOff: "ปิด",
  },
  en: {
    select: "Choose a chat from the list to start a conversation",
    loading: "Loading messages…",
    empty: "No messages yet. Start the conversation",
    placeholder: "Type a message…",
    send: "Send",
    failed: "Unable to load or send messages",
    login: "Please sign in",
    env: "Supabase is not configured",
    direct: "Messages",
    trip: "Trip chat",
    event: "Event chat",
    community: "Community chat",
    location: "Location",
    openMap: "Open map",
    sticker: "Sticker",
    shareLocation: "Share location",
    attachImage: "Attach image",
    currentLocation: "Current location",
    locationFailed: "Unable to read your current location",
    imageOnly: "Please choose an image file",
    imageTooLarge: "Image must be 12 MB or smaller",
    photo: "Photo",
    translation: "Translation",
    translationOn: "On",
    translationOff: "Off",
  },
  de: {
    select: "Wähle einen Chat aus der Liste, um zu beginnen",
    loading: "Nachrichten werden geladen…",
    empty: "Noch keine Nachrichten. Starte die Unterhaltung",
    placeholder: "Nachricht schreiben…",
    send: "Senden",
    failed: "Nachrichten konnten nicht geladen oder gesendet werden",
    login: "Bitte anmelden",
    env: "Supabase ist nicht konfiguriert",
    direct: "Nachrichten",
    trip: "Reise-Chat",
    event: "Event-Chat",
    community: "Community-Chat",
    location: "Standort",
    openMap: "Karte öffnen",
    sticker: "Sticker",
    shareLocation: "Standort teilen",
    attachImage: "Bild anhängen",
    currentLocation: "Aktueller Standort",
    locationFailed: "Der aktuelle Standort konnte nicht gelesen werden",
    imageOnly: "Bitte eine Bilddatei auswählen",
    imageTooLarge: "Das Bild darf maximal 12 MB groß sein",
    photo: "Foto",
    translation: "Übersetzung",
    translationOn: "Ein",
    translationOff: "Aus",
  },
  zh: {
    select: "从列表中选择聊天以开始对话",
    loading: "正在加载消息…",
    empty: "暂无消息，开始聊天吧",
    placeholder: "输入消息…",
    send: "发送",
    failed: "无法加载或发送消息",
    login: "请登录",
    env: "尚未配置 Supabase",
    direct: "消息",
    trip: "旅行聊天",
    event: "活动聊天",
    community: "社区聊天",
    location: "位置",
    openMap: "打开地图",
    sticker: "贴纸",
    shareLocation: "分享位置",
    attachImage: "附加图片",
    currentLocation: "当前位置",
    locationFailed: "无法读取当前位置",
    imageOnly: "请选择图片文件",
    imageTooLarge: "图片大小不能超过 12 MB",
    photo: "图片",
    translation: "翻译",
    translationOn: "开启",
    translationOff: "关闭",
  },
  ja: {
    select: "一覧からチャットを選択して会話を開始します",
    loading: "メッセージを読み込み中…",
    empty: "まだメッセージはありません。会話を始めましょう",
    placeholder: "メッセージを入力…",
    send: "送信",
    failed: "メッセージを読み込みまたは送信できません",
    login: "ログインしてください",
    env: "Supabaseが設定されていません",
    direct: "メッセージ",
    trip: "Tripチャット",
    event: "Eventチャット",
    community: "Communityチャット",
    location: "場所",
    openMap: "地図を開く",
    sticker: "ステッカー",
    shareLocation: "位置情報を共有",
    attachImage: "画像を添付",
    currentLocation: "現在地",
    locationFailed: "現在地を取得できません",
    imageOnly: "画像ファイルを選択してください",
    imageTooLarge: "画像は12MB以下にしてください",
    photo: "画像",
    translation: "翻訳",
    translationOn: "オン",
    translationOff: "オフ",
  },
  ko: {
    select: "목록에서 채팅을 선택해 대화를 시작하세요",
    loading: "메시지 불러오는 중…",
    empty: "아직 메시지가 없습니다. 대화를 시작해 보세요",
    placeholder: "메시지 입력…",
    send: "보내기",
    failed: "메시지를 불러오거나 보낼 수 없습니다",
    login: "로그인하세요",
    env: "Supabase가 설정되지 않았습니다",
    direct: "메시지",
    trip: "여행 채팅",
    event: "이벤트 채팅",
    community: "커뮤니티 채팅",
    location: "위치",
    openMap: "지도 열기",
    sticker: "스티커",
    shareLocation: "위치 공유",
    attachImage: "이미지 첨부",
    currentLocation: "현재 위치",
    locationFailed: "현재 위치를 가져올 수 없습니다",
    imageOnly: "이미지 파일을 선택해 주세요",
    imageTooLarge: "이미지는 12 MB 이하여야 합니다",
    photo: "사진",
    translation: "번역",
    translationOn: "켜짐",
    translationOff: "꺼짐",
  },
} as const;

const STICKERS = [
  "😀",
  "😂",
  "🥰",
  "😍",
  "😎",
  "👍",
  "❤️",
  "🎉",
  "✨",
  "🙏",
  "😺",
  "🌍",
] as const;

type RenderMessage = {
  id: string;
  senderId: string;
  senderName: string;
  isMine: boolean | null;
  senderSide: "" | "user" | "business";
  originalBody: string;
  sourceLanguage: string;
  translations: Record<string, string>;
  createdAt: string;
  messageType: "text" | "image" | "location" | "sticker";
  mediaPath: string;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
  stickerCode: string;
};

function ChatMediaImage({
  path,
  className,
}: {
  path: string;
  className: string;
}) {
  const [src, setSrc] = useState(
    /^https?:\/\//i.test(path) ? path : "",
  );

  useEffect(() => {
    let active = true;
    const clean = String(path || "").trim();

    if (!clean) {
      setSrc("");
      return () => {
        active = false;
      };
    }

    if (/^https?:\/\//i.test(clean)) {
      setSrc(clean);
      return () => {
        active = false;
      };
    }

    setSrc("");
    void createSignedStorageUrl("chat-media", clean, 3600).then((result) => {
      if (active) {
        setSrc(result.data || "");
      }
    });

    return () => {
      active = false;
    };
  }, [path]);

  if (!src) {
    return null;
  }

  return <img className={className} src={src} alt="" />;
}

type ActivitySenderProfile = {
  id: string;
  name: string;
  photoUrl: string;
  country: string;
  nationality: string;
};

type GroupAnnouncement = {
  id: string;
  authorName: string;
  message: string;
  isPinned: boolean;
  createdAt: string;
};

type RpcRow = Record<string, unknown>;

function rpcRows(value: unknown): RpcRow[] {
  if (Array.isArray(value)) {
    return value.filter(
      (row): row is RpcRow =>
        Boolean(row) &&
        typeof row === "object",
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return [value as RpcRow];
  }

  return [];
}

function rpcText(
  row: RpcRow | null | undefined,
  key: string,
) {
  const value = row?.[key];

  return typeof value === "string"
    ? value
    : value == null
      ? ""
      : String(value);
}

function rpcBool(
  row: RpcRow | null | undefined,
  key: string,
) {
  const value = row?.[key];

  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
}

function isMissingAnnouncementRpc(
  message: string | null | undefined,
) {
  const normalized = String(
    message ?? "",
  ).toLowerCase();

  return (
    normalized.includes(
      "could not find the function",
    ) ||
    normalized.includes(
      "schema cache",
    ) ||
    normalized.includes(
      "pgrst202",
    )
  );
}

async function loadGroupAnnouncements(
  category:
    | "trip"
    | "event"
    | "community",
  id: string,
) {
  const [
    listResult,
    permissionResult,
  ] = await Promise.all([
    rpcRequest<RpcRow[]>(
      "get_activity_chat_announcements",
      {
        p_activity_type:
          category,
        p_activity_id:
          id,
        p_limit:
          50,
      },
    ),

    rpcRequest<boolean>(
      "can_publish_activity_chat_announcement",
      {
        p_activity_type:
          category,
        p_activity_id:
          id,
      },
    ),
  ]);

  const announcements =
    listResult.error
      ? []
      : rpcRows(
          listResult.data,
        )
          .map(
            (row) => ({
              id:
                rpcText(
                  row,
                  "id",
                ),

              authorName:
                rpcText(
                  row,
                  "author_name",
                ) ||
                "Melo Organizer",

              message:
                rpcText(
                  row,
                  "message",
                ),

              isPinned:
                rpcBool(
                  row,
                  "is_pinned",
                ),

              createdAt:
                rpcText(
                  row,
                  "created_at",
                ),
            }),
          )
          .filter(
            (item) =>
              item.id &&
              item.message,
          );

  const canPublish =
    permissionResult.error
      ? false
      : Boolean(
          permissionResult.data,
        );

  return {
    announcements,

    canPublish,

    unavailable:
      Boolean(
        (listResult.error &&
          !isMissingAnnouncementRpc(
            listResult.error,
          )) ||
        (permissionResult.error &&
          !isMissingAnnouncementRpc(
            permissionResult.error,
          )),
      ),
  };
}

async function createGroupAnnouncement(
  category:
    | "trip"
    | "event"
    | "community",
  id: string,
  message: string,
) {
  const result =
    await rpcRequest<string>(
      "create_activity_chat_announcement",
      {
        p_activity_type:
          category,

        p_activity_id:
          id,

        p_message:
          message,
      },
    );

  if (result.error) {
    throw new Error(
      result.error,
    );
  }
}

function localeTag(
  locale: string,
) {
  return (
    {
      th: "th-TH",
      en: "en-US",
      de: "de-DE",
      zh: "zh-CN",
      ja: "ja-JP",
      ko: "ko-KR",
    } as Record<
      string,
      string
    >
  )[locale] || "en-US";
}

function formatTime(
  value: string,
  locale: string,
) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    localeTag(locale),
    {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    },
  ).format(date);
}

function formatMessageTime(
  value: string,
  locale: string,
) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    localeTag(locale),
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function formatMessageDate(
  value: string,
  locale: string,
) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    localeTag(locale),
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function messageDayKey(
  value: string,
) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    ),

    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function activityProfilePhoto(
  row: Record<
    string,
    any
  >,
) {
  const directKeys = [
    "avatar_url",
    "photo_url",
    "photo_path",
    "profile_photo",
    "profile_image_path",
  ];

  for (
    const key
    of directKeys
  ) {
    const raw =
      row?.[key];

    if (
      typeof raw ===
        "string" &&
      raw.trim()
    ) {
      const clean =
        raw.trim();

      if (
        /^https?:\/\//i.test(
          clean,
        )
      ) {
        return clean;
      }

      return publicStorageUrl(
        "profile-photos",
        clean,
      );
    }
  }

  const paths =
    row?.photo_paths;

  if (
    Array.isArray(paths) &&
    paths[0]
  ) {
    const clean =
      String(
        paths[0],
      ).trim();

    if (
      /^https?:\/\//i.test(
        clean,
      )
    ) {
      return clean;
    }

    return publicStorageUrl(
      "profile-photos",
      clean,
    );
  }

  return "";
}

async function loadActivitySenderProfiles(
  messages:
    RenderMessage[],
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

  if (!ids.length) {
    return new Map<
      string,
      ActivitySenderProfile
    >();
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
      Record<
        string,
        any
      >[]
    >(
      "profiles",

      `select=*&id=in.(${encodeURIComponent(
        quoted,
      )})`,
    );

  const map =
    new Map<
      string,
      ActivitySenderProfile
    >();

  if (
    result.error ||
    !Array.isArray(
      result.data,
    )
  ) {
    return map;
  }

  for (
    const row
    of result.data
  ) {
    const id =
      String(
        row?.id || "",
      ).trim();

    if (!id) continue;

    map.set(
      id,
      {
        id,

        name:
          String(
            row?.display_name ||
              row?.full_name ||
              row?.name ||
              "",
          ).trim(),

        photoUrl:
          activityProfilePhoto(
            row,
          ),

        country:
          String(
            row?.country ||
              row?.country_code ||
              "",
          ).trim(),

        nationality:
          String(
            row?.nationality ||
              "",
          ).trim(),
      },
    );
  }

  return map;
}

function directToRender(
  message:
    DirectMessage,
): RenderMessage {
  return {
    id:
      message.id,

    senderId:
      message.senderId,

    senderName:
      message.senderName,

    isMine:
      message.isMine,

    senderSide:
      message.senderSide,

    originalBody:
      message.body,

    sourceLanguage:
      message.sourceLanguage,

    translations:
      message.translations,

    createdAt:
      message.createdAt,

    messageType:
      message.messageType,

    mediaPath:
      message.mediaPath,

    latitude:
      message.latitude,

    longitude:
      message.longitude,

    locationLabel:
      message.locationLabel,

    stickerCode:
      message.stickerCode,
  };
}

function activityToRender(
  message:
    ActivityChatMessage,
): RenderMessage {
  return {
    id:
      message.id,

    senderId:
      message.senderId,

    senderName:
      message.senderName,

    isMine:
      null,

    senderSide:
      "",

    originalBody:
      message.body,

    sourceLanguage:
      message.sourceLanguage,

    translations:
      message.translations,

    createdAt:
      message.createdAt,

    messageType:
      message.messageType,

    mediaPath:
      message.mediaPath,

    latitude:
      message.latitude,

    longitude:
      message.longitude,

    locationLabel:
      message.locationLabel,

    stickerCode:
      message.stickerCode,
  };
}

function IconSticker() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
      />

      <path
        d="M8.6 14.3c.9 1 2 1.5 3.4 1.5s2.5-.5 3.4-1.5M9.2 9.5h.01M14.8 9.5h.01"
      />
    </svg>
  );
}

function IconImage() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2"
      />

      <circle
        cx="9"
        cy="10"
        r="1.5"
      />

      <path
        d="m6.5 17 4.1-4.2 2.7 2.6 1.8-1.8 2.4 3.4"
      />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
      />

      <path
        d="M3.8 12h16.4M12 3.5c2.1 2.3 3.2 5.1 3.2 8.5S14.1 18.2 12 20.5C9.9 18.2 8.8 15.4 8.8 12S9.9 5.8 12 3.5Z"
      />
    </svg>
  );
}

function genericSenderName(
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

function directMine(
  message:
    RenderMessage,
  room:
    ChatRoom,
  currentUserId:
    string,
) {
  // Direct Chat never uses an active Business identity.
  // Keep the shared identity helper explicitly in User mode.
  const businessId:
    string | null =
    null;

  if (
    message.isMine !==
    null
  ) {
    return message.isMine;
  }

  if (
    room.businessId &&
    message.senderSide
  ) {
    return room.viewerSide ===
      "business"
      ? message.senderSide ===
          "business"
      : message.senderSide ===
          "user";
  }

  if (
    message.senderId &&
    currentUserId
  ) {
    return isMeloMessageMine(
      message,
      {
        userId:
          currentUserId,

        businessId:
          businessId,

        mode:
          businessId
            ? "partner"
            : "user",
      },
    );
  }

  return false;
}

function senderDisplay(
  message:
    RenderMessage,
  room:
    ChatRoom,
  mine:
    boolean,
) {
  if (mine) return "";

  if (
    room.category !==
    "direct"
  ) {
    return message.senderName;
  }

  // A direct room title is already resolved to the opposite party:
  // member name in User/Friend/Love chats, store name in user→Partner chats,
  // and customer name in Partner→customer chats. This avoids showing the
  // generic RPC fallback label "Melo member".
  if (
    room.businessId
  ) {
    return (
      room.title ||
      message.senderName
    );
  }

  if (
    genericSenderName(
      message.senderName,
    )
  ) {
    return (
      room.title ||
      message.senderName
    );
  }

  return message.senderName;
}

function senderProfileId(
  message:
    RenderMessage,
  room:
    ChatRoom,
  mine:
    boolean,
) {
  if (mine) return "";

  // Trip / Event / Community messages are always Melo-user messages.
  if (
    room.category !==
    "direct"
  ) {
    return (
      message.senderId ||
      ""
    );
  }

  // On the partner side, the opposite party is a Melo user and the room has
  // that user's canonical id. On the user side of a business conversation,
  // the opposite party is the store, so do not link to an owner's/staff profile.
  if (
    room.businessId
  ) {
    return room.viewerSide ===
      "business"
      ? (
          message.senderId ||
          room.userId ||
          ""
        )
      : "";
  }

  return (
    message.senderId ||
    room.userId ||
    ""
  );
}

function IncomingDirectAvatar({
  room,
  profileId,
  senderName,
}: {
  room:
    ChatRoom;

  profileId:
    string;

  senderName:
    string;
}) {
  if (profileId) {
    return (
      <Link
        href={`/users/${profileId}`}
        className={
          avatarStyles.messageAvatarLink
        }
        aria-label={
          senderName ||
          room.title
        }
      >
        <VerifiedUserAvatar
          userId={
            profileId
          }
          name={
            senderName ||
            room.title
          }
          src={
            room.avatarUrl
          }
          country={
            room.country
          }
          nationality={
            room.nationality
          }
          className={
            avatarStyles.messageAvatarIdentity
          }
          shape="circle"
          badgeSize={
            12
          }
          alt=""
        />
      </Link>
    );
  }

  return (
    <span
      className={
        avatarStyles.messageAvatar
      }
      aria-hidden="true"
    >
      {room.avatarUrl ? (
        <img
          src={
            room.avatarUrl
          }
          alt=""
        />
      ) : (
        <b>
          {(
            senderName ||
            room.title ||
            "M"
          )
            .slice(
              0,
              1,
            )
            .toUpperCase()}
        </b>
      )}
    </span>
  );
}

function IncomingActivityAvatar({
  profileId,
  senderName,
  profile,
}: {
  profileId:
    string;

  senderName:
    string;

  profile?:
    ActivitySenderProfile;
}) {
  if (profileId) {
    return (
      <Link
        href={`/users/${profileId}`}
        className={
          avatarStyles.messageAvatarLink
        }
        aria-label={
          senderName ||
          profile?.name ||
          "Melo member"
        }
      >
        <VerifiedUserAvatar
          userId={
            profileId
          }
          name={
            profile?.name ||
            senderName ||
            "Melo member"
          }
          src={
            profile?.photoUrl ||
            ""
          }
          country={
            profile?.country ||
            ""
          }
          nationality={
            profile?.nationality ||
            ""
          }
          className={
            avatarStyles.messageAvatarIdentity
          }
          shape="circle"
          badgeSize={
            12
          }
          alt=""
        />
      </Link>
    );
  }

  return (
    <span
      className={
        avatarStyles.messageAvatar
      }
      aria-hidden="true"
    >
      <b>
        {(
          senderName ||
          "M"
        )
          .slice(
            0,
            1,
          )
          .toUpperCase()}
      </b>
    </span>
  );
}

export function ChatConversationPane({
  room,
  translationEnabled,
  drawerMode = false,
}: {
  room:
    ChatRoom | null;

  translationEnabled:
    boolean;


  drawerMode?:
    boolean;
}) {
  const {
    locale,
  } = useLocale();

  const t =
    COPY[locale] ??
    COPY.en;

  const announcementCopy =
    activityChatCopy[
      locale
    ];

  const [
    userId,
    setUserId,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] = useState<
    RenderMessage[]
  >([]);

  // MELO_GOOGLE_AUTO_TRANSLATION_V1
  //
  // Chat translation language is intentionally independent from
  // the website UI locale. It comes from profiles.primary_language.
  const [
    primaryChatLanguage,
    setPrimaryChatLanguage,
  ] = useState(
    locale,
  );

  const translationCacheRef =
    useRef<
      Map<string, string>
    >(
      new Map(),
    );

  const [
    activitySenderProfiles,
    setActivitySenderProfiles,
  ] = useState<
    Map<
      string,
      ActivitySenderProfile
    >
  >(
    new Map(),
  );

  const [
    announcements,
    setAnnouncements,
  ] = useState<
    GroupAnnouncement[]
  >([]);

  const [
    canPublishAnnouncement,
    setCanPublishAnnouncement,
  ] = useState(false);

  const [
    announcementComposerOpen,
    setAnnouncementComposerOpen,
  ] = useState(false);

  const [
    announcementHistoryOpen,
    setAnnouncementHistoryOpen,
  ] = useState(false);

  const [
    announcementDraft,
    setAnnouncementDraft,
  ] = useState("");

  const [
    publishingAnnouncement,
    setPublishingAnnouncement,
  ] = useState(false);

  const [
    draft,
    setDraft,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    stickerOpen,
    setStickerOpen,
  ] = useState(false);

  const endRef =
    useRef<
      HTMLDivElement
    >(null);

  const messageListRef = useRef<HTMLDivElement>(null);
  const shouldScrollToEndRef = useRef(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);

  const fileInputRef =
    useRef<
      HTMLInputElement
    >(null);

  const composerTextareaRef =
    useRef<HTMLTextAreaElement>(null);

  function resizeComposerTextarea() {
    const textarea = composerTextareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    const computed = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computed.lineHeight) || 20;
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
    const borderTop = Number.parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computed.borderBottomWidth) || 0;
    const maxHeight =
      lineHeight * 7 +
      paddingTop +
      paddingBottom +
      borderTop +
      borderBottom;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

    textarea.style.height = `${Math.max(46, nextHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  const roomKey =
    room
      ? `${room.category}:${room.id}`
      : "";

  useEffect(() => {
    resizeComposerTextarea();
  }, [draft]);

  function normalizeChatLanguage(
    value:
      unknown,
  ): typeof locale {
    const raw =
      String(
        value ?? "",
      )
        .trim()
        .toLowerCase()
        .replace(
          "_",
          "-",
        );

    const base =
      raw.split(
        "-",
      )[0];

    const supportedLanguages = [
      "th",
      "en",
      "de",
      "zh",
      "ja",
      "ko",
    ] as const;

    return supportedLanguages.includes(
      base as (typeof supportedLanguages)[number],
    )
      ? (base as typeof locale)
      : locale;
  }

  async function loadPrimaryChatLanguage(
    currentUserId:
      string,
  ) {
    const result =
      await restSelect<
        Record<
          string,
          any
        >[]
      >(
        "profiles",

        `select=primary_language&id=eq.${encodeURIComponent(
          currentUserId,
        )}&limit=1`,
      );

    const row =
      !result.error &&
      Array.isArray(
        result.data,
      )
        ? result.data[0]
        : null;

    const language =
      normalizeChatLanguage(
        row?.primary_language,
      );

    setPrimaryChatLanguage(
      language,
    );

    return language;
  }

  async function translateMessageBody(
    message:
      RenderMessage,
    targetLanguage:
      string,
  ) {
    if (
      !translationEnabled ||
      message.messageType !==
        "text" ||
      !message.originalBody?.trim()
    ) {
      return message;
    }

    if (
      normalizeChatLanguage(message.sourceLanguage) ===
      normalizeChatLanguage(targetLanguage)
    ) {
      return message;
    }

    const alreadyTranslated =
      message.translations?.[
        targetLanguage
      ]?.trim();

    if (
      alreadyTranslated &&
      alreadyTranslated !==
        message.originalBody.trim()
    ) {
      return message;
    }

    const cacheKey =
      `${message.id}:${targetLanguage}:${message.originalBody}`;

    const cached =
      translationCacheRef.current.get(
        cacheKey,
      );

    if (cached) {
      return {
        ...message,

        translations: {
          ...message.translations,
          [targetLanguage]:
            cached,
        },
      };
    }

    try {
      const response =
        await fetch(
          "/api/translate",
          {
            method:
              "POST",

            headers: {
              "Content-Type": "application/json",
              ...(getStoredSession()?.access_token ? { Authorization: `Bearer ${getStoredSession()!.access_token}` } : {}),
            },

            body:
              JSON.stringify(
                {
                  text:
                    message.originalBody,

                  target:
                    targetLanguage,
                },
              ),
          },
        );

      if (!response.ok) {
        return message;
      }

      const result =
        await response.json();

      const translated =
        typeof result?.translatedText ===
          "string"
          ? result.translatedText.trim()
          : "";

      if (!translated) {
        return message;
      }

      translationCacheRef.current.set(
        cacheKey,
        translated,
      );

      // MELO_PERSISTENT_TRANSLATION_V1
      //
      // Persist newly generated direct-message translations.
      // The Supabase RPC checks that the signed-in user belongs
      // to the conversation before updating chat_messages.
      if (
        room?.category ===
          "direct" &&
        message.id &&
        !result?.skipped
      ) {
        void rpcRequest(
          "save_chat_message_translation",
          {
            p_message_id:
              message.id,

            p_language:
              targetLanguage,

            p_translation:
              translated,
          },
        ).catch(
          () =>
            undefined,
        );
      }

      return {
        ...message,

        translations: {
          ...message.translations,

          [targetLanguage]:
            translated,
        },
      };
    } catch {
      // Translation must never block normal chat.
      return message;
    }
  }

  async function translateIncomingMessages(
    sourceMessages:
      RenderMessage[],
    currentUserId:
      string,
    targetLanguage:
      string,
  ) {
    if (
      !translationEnabled ||
      !sourceMessages.length
    ) {
      return sourceMessages;
    }

    return Promise.all(
      sourceMessages.map(
        async (
          message,
        ) => {
          const mine =
            directMine(
              message,
              room!,
              currentUserId,
            );

          // Auto Translation is for incoming messages.
          // The sender continues seeing their original message.
          if (mine) {
            return message;
          }

          return translateMessageBody(
            message,
            targetLanguage,
          );
        },
      ),
    );
  }
  async function load(
    background = false,
  ) {
    if (!room) return;

    if (!background) {
      setLoading(true);
    }

    setError("");

    try {
      const user =
        await getCurrentUser();

      if (!user) {
        setError(
          t.login,
        );

        return;
      }

      setUserId(
        user.id,
      );

      if (
        room.category ===
        "direct"
      ) {
        const [
          next,
          targetLanguage,
        ] =
          await Promise.all([
            loadDirectMessages(
              room.id,
            ),

            loadPrimaryChatLanguage(
              user.id,
            ),
          ]);

        const rendered =
          next.map(
            directToRender,
          );

        const translated =
          await translateIncomingMessages(
            rendered,
            user.id,
            targetLanguage,
          );

        if (background) {
          setMessages((current) => {
            const merged = new Map(current.map((item) => [item.id, item]));
            for (const item of translated) merged.set(item.id, item);
            return [...merged.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
        } else {
          shouldScrollToEndRef.current = true;
          setHasOlder(next.length >= 15);
          setMessages(translated);
        }

        void markDirectRead(
          room.id,
        ).finally(
          () => {
            window.dispatchEvent(
              new CustomEvent(
                "melo-chat-unread-changed",
              ),
            );
          },
        );
      } else {
        const [
          next,
          announcementState,
        ] =
          await Promise.all([
            loadActivityMessages(
              room.category,
              room.id,
            ),

            loadGroupAnnouncements(
              room.category,
              room.id,
            ),
          ]);

        const rendered =
          next.map(
            activityToRender,
          );

        setMessages(
          rendered,
        );

        setActivitySenderProfiles(
          await loadActivitySenderProfiles(
            rendered,
          ),
        );

        setAnnouncements(
          announcementState.announcements,
        );

        setCanPublishAnnouncement(
          announcementState.canPublish,
        );
      }
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : t.failed,
      );
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }

  useEffect(
    () => {
      setDraft("");
      setMessages([]);
      setHasOlder(true);
      shouldScrollToEndRef.current = true;
      setActivitySenderProfiles(
        new Map(),
      );
      setAnnouncements([]);
      setCanPublishAnnouncement(
        false,
      );
      setAnnouncementComposerOpen(
        false,
      );
      setAnnouncementHistoryOpen(
        false,
      );
      setAnnouncementDraft("");
      setError("");
      setStickerOpen(
        false,
      );

      if (
        !room ||
        !isSupabaseConfigured()
      ) {
        return;
      }

      void load();

      const timer =
        window.setInterval(
          () =>
            void load(
              true,
            ),

          room.category ===
            "direct"
            ? 4500
            : 4000,
        );

      return () =>
        window.clearInterval(
          timer,
        );

      // roomKey is intentionally the room identity; locale controls translated message display.
    },
    [
      roomKey,
      locale,
      translationEnabled,
    ],
  );

  useEffect(
    () => {
      if (
        !messages.length
      ) {
        return;
      }

      if (!shouldScrollToEndRef.current) return;
      shouldScrollToEndRef.current = false;
      window.setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 20);
    },
    [
      messages.length,
    ],
  );

  useEffect(() => {
    if (!drawerMode || typeof window === "undefined") return;

    const viewport = window.visualViewport;
    let timer = 0;

    const keepLatestVisible = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        endRef.current?.scrollIntoView({ block: "end" });
      }, 40);
    };

    viewport?.addEventListener("resize", keepLatestVisible);
    viewport?.addEventListener("scroll", keepLatestVisible);
    window.addEventListener("orientationchange", keepLatestVisible);

    return () => {
      window.clearTimeout(timer);
      viewport?.removeEventListener("resize", keepLatestVisible);
      viewport?.removeEventListener("scroll", keepLatestVisible);
      window.removeEventListener("orientationchange", keepLatestVisible);
    };
  }, [drawerMode, roomKey]);

  async function loadOlderDirectMessages() {
    if (!room || room.category !== "direct" || loadingOlder || !hasOlder || !messages.length) return;
    const scroll = messageListRef.current;
    const oldest = messages[0]?.createdAt;
    if (!scroll || !oldest) return;
    const previousHeight = scroll.scrollHeight;
    const previousTop = scroll.scrollTop;
    setLoadingOlder(true);
    shouldScrollToEndRef.current = false;
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const [older, targetLanguage] = await Promise.all([
        loadDirectMessagesPage(room.id, { before: oldest, limit: 15 }),
        loadPrimaryChatLanguage(user.id),
      ]);
      const translated = await translateIncomingMessages(older.map(directToRender), user.id, targetLanguage);
      setHasOlder(older.length >= 15);
      setMessages((current) => {
        const merged = new Map([...translated, ...current].map((item) => [item.id, item]));
        return [...merged.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const node = messageListRef.current;
        if (node) node.scrollTop = previousTop + (node.scrollHeight - previousHeight);
      }));
    } finally {
      setLoadingOlder(false);
    }
  }

  function handleMessageScroll() {
    const node = messageListRef.current;
    if (node && node.scrollTop <= 40) void loadOlderDirectMessages();
  }

  const title =
    room?.title ||
    "";

  const categoryLabel =
    room
      ? t[
          room.category
        ]
      : "";

  const renderedMessages =
    useMemo(
      () => messages,
      [messages],
    );

  const latestAnnouncement =
    useMemo(
      () =>
        announcements.find(
          (
            item,
          ) =>
            item.isPinned,
        ) ??
        announcements[0] ??
        null,

      [announcements],
    );

  function displayedBody(
    message:
      RenderMessage,
  ) {
    if (
      !translationEnabled
    ) {
      return message.originalBody;
    }

    return (
      message.translations?.[
        primaryChatLanguage
      ]?.trim() ||
      message.originalBody
    );
  }

  function originalBodyUnderTranslation(
    message:
      RenderMessage,
  ) {
    if (
      !translationEnabled ||
      message.messageType !==
        "text"
    ) {
      return "";
    }

    const original =
      message.originalBody?.trim() ||
      "";

    const translated =
      message.translations?.[
        primaryChatLanguage
      ]?.trim() ||
      "";

    /*
     * Show the original only when an actual translation exists.
     *
     * Example:
     *
     * สวัสดี คุณเป็นอย่างไรบ้าง?
     * Hello, how are you?
     *
     * If the original is already in the preferred language,
     * only one line is shown.
     */
    if (
      !original ||
      !translated ||
      translated === original
    ) {
      return "";
    }

    return original;
  }
  async function sendPayload(
    payload:
      ChatMessagePayload,
    preview:
      string,
  ) {
    if (
      !room ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");

    try {
      if (
        room.category ===
        "direct"
      ) {
        const saved =
          await sendDirectMessage(
            room.id,
            payload,
            locale,
          );

        if (saved) {
          shouldScrollToEndRef.current = true;
          const mapped =
            directToRender(
              saved,
            );

          setMessages(
            (
              current,
            ) => [
              ...current.filter(
                (
                  item,
                ) =>
                  item.id !==
                  mapped.id,
              ),
              mapped,
            ],
          );
        } else {
          void load(true);
        }

        void invokeEdgeFunction(
          "notify-chat-message",
          {
            kind:
              "direct",

            conversationId:
              room.id,

            messageId:
              saved?.id ||
              null,

            preview:
              preview.slice(
                0,
                180,
              ),
          },
        ).catch(
          () =>
            undefined,
        );
      } else {
        const saved =
          await sendActivityMessage(
            room.category,
            room.id,
            payload,
            locale,
          );

        const mapped =
          activityToRender(
            saved,
          );

        setMessages(
          (
            current,
          ) => [
            ...current.filter(
              (
                item,
              ) =>
                item.id !==
                mapped.id,
            ),
            mapped,
          ],
        );

        void invokeEdgeFunction(
          "notify-chat-message",
          {
            kind:
              room.category,

            entityId:
              room.id,

            messageId:
              saved.id,

            preview:
              preview.slice(
                0,
                180,
              ),
          },
        ).catch(
          () =>
            undefined,
        );
      }
    } catch (
      cause
    ) {
      const message =
        cause instanceof
          Error
          ? cause.message
          : t.failed;

      if (
        message ===
        "IMAGE_REQUIRED"
      ) {
        setError(
          t.imageOnly,
        );
      } else if (
        message ===
        "IMAGE_TOO_LARGE"
      ) {
        setError(
          t.imageTooLarge,
        );
      } else {
        setError(
          message ||
          t.failed,
        );
      }

      throw cause;
    } finally {
      setSending(false);
    }
  }

  async function sendText() {
    const body =
      draft.trim();

    if (
      !body ||
      sending
    ) {
      return;
    }

    try {
      await sendPayload(
        {
          body,
          messageType:
            "text",
        },

        body,
      );

      setDraft("");
    } catch {
      // sendPayload already exposes the error in the conversation UI.
    }
  }

  async function sendSticker(
    stickerCode:
      string,
  ) {
    if (
      sending
    ) {
      return;
    }

    setStickerOpen(
      false,
    );

    try {
      /*
       * IMPORTANT:
       * chat_messages.original_text has a length constraint.
       * Sticker messages therefore must carry a non-empty fallback body.
       *
       * stickerCode is used as original_text while sticker_code keeps the
       * rich-message identity. The renderer below hides the fallback body
       * for sticker messages so the emoji is not displayed twice.
       */
      await sendPayload(
        {
          body:
            stickerCode,

          messageType:
            "sticker",

          stickerCode,
        },

        `${t.sticker} ${stickerCode}`,
      );
    } catch {
      // Error is displayed by sendPayload.
    }
  }

  async function attachImage(
    file:
      File | null,
  ) {
    if (
      !file ||
      sending
    ) {
      return;
    }

    setStickerOpen(
      false,
    );

    try {
      const path =
        await uploadChatImage(
          file,
        );

      await sendPayload(
        {
          messageType:
            "image",

          mediaPath:
            path,
        },

        `📷 ${t.photo}`,
      );
    } catch (
      cause
    ) {
      const message =
        cause instanceof
          Error
          ? cause.message
          : t.failed;

      if (
        message ===
        "IMAGE_REQUIRED"
      ) {
        setError(
          t.imageOnly,
        );
      } else if (
        message ===
        "IMAGE_TOO_LARGE"
      ) {
        setError(
          t.imageTooLarge,
        );
      } else if (
        !error
      ) {
        setError(
          message ||
          t.failed,
        );
      }
    } finally {
      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  async function publishGroupAnnouncement() {
    if (
      !room ||
      room.category ===
        "direct" ||
      !canPublishAnnouncement ||
      publishingAnnouncement
    ) {
      return;
    }

    const body =
      announcementDraft.trim();

    if (!body) {
      return;
    }

    setPublishingAnnouncement(
      true,
    );

    setError("");

    try {
      await createGroupAnnouncement(
        room.category,
        room.id,
        body,
      );

      setAnnouncementDraft(
        "",
      );

      setAnnouncementComposerOpen(
        false,
      );

      await load(true);
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : announcementCopy.publishFailed,
      );
    } finally {
      setPublishingAnnouncement(
        false,
      );
    }
  }

  if (!room) {
    return (
      <section
        className={`${styles.conversationEmpty} ${
          drawerMode
            ? styles.conversationDrawerEmpty
            : ""
        }`}
      >
        <span>
          💬
        </span>

        <strong>
          {t.select}
        </strong>
      </section>
    );
  }

  if (
    !isSupabaseConfigured()
  ) {
    return (
      <section
        className={`${styles.conversationEmpty} ${
          drawerMode
            ? styles.conversationDrawerEmpty
            : ""
        }`}
      >
        {t.env}
      </section>
    );
  }

  return (
    <section
      className={`${styles.conversation} ${
        drawerMode
          ? styles.conversationDrawer
          : ""
      }`}
    >
      <div
        className={
          styles.conversationTop
        }
      >
        <header
          className={
            styles.conversationHeader
          }
        >
          {room.category ===
            "direct" &&
          room.userId &&
          !room.businessId ? (
            <VerifiedUserAvatar
              userId={
                room.userId
              }
              name={
                room.title
              }
              src={
                room.avatarUrl
              }
              country={
                room.country
              }
              nationality={
                room.nationality
              }
              className={
                styles.verifiedConversationAvatar
              }
              shape="rounded"
              badgeSize={
                15
              }
              alt=""
            />
          ) : (
            <div
              className={
                styles.conversationAvatar
              }
            >
              {room.avatarUrl ? (
                <img
                  src={
                    room.avatarUrl
                  }
                  alt=""
                />
              ) : (
                <span>
                  {room.category ===
                  "direct"
                    ? "✉"
                    : room.category ===
                        "trip"
                      ? "🧭"
                      : room.category ===
                          "event"
                        ? "🎟"
                        : "◎"}
                </span>
              )}
            </div>
          )}

          <div
            className={
              styles.conversationTitle
            }
          >
            {room.category ===
              "direct" &&
            room.userId &&
            !room.businessId ? (
              <strong>
                <Link
                  href={`/users/${room.userId}`}
                  className={
                    styles.profileNameLink
                  }
                >
                  {title}
                </Link>
              </strong>
            ) : (
              <strong>
                {title}
              </strong>
            )}

            <span>
              {room.subtitle ||
                categoryLabel}
            </span>
          </div>

          <div
            className={
              styles.conversationHeaderActions
            }
          >
            <b
              className={
                styles.conversationType
              }
            >
              {
                categoryLabel
              }
            </b>

            {room.category !==
              "direct" &&
            canPublishAnnouncement ? (
              <button
                type="button"
                className={`${styles.announcementCreateButton} ${
                  announcementComposerOpen
                    ? styles.announcementCreateButtonActive
                    : ""
                }`}
                onClick={() =>
                  setAnnouncementComposerOpen(
                    (
                      current,
                    ) =>
                      !current,
                  )
                }
                aria-expanded={
                  announcementComposerOpen
                }
                title={
                  announcementCopy.publishAnnouncement
                }
              >
                <span>
                  📢
                </span>

                <strong>
                  {
                    announcementCopy.publishAnnouncement
                  }
                </strong>
              </button>
            ) : null}
          </div>
        </header>

        {room.category !==
          "direct" &&
        (latestAnnouncement ||
          announcementComposerOpen) ? (
          <section
            className={
              styles.groupAnnouncementArea
            }
          >
            {latestAnnouncement ? (
              <div
                className={
                  styles.groupAnnouncementLatest
                }
              >
                <span
                  className={
                    styles.groupAnnouncementIcon
                  }
                >
                  📢
                </span>

                <div
                  className={
                    styles.groupAnnouncementCopy
                  }
                >
                  <div
                    className={
                      styles.groupAnnouncementHeading
                    }
                  >
                    <strong>
                      {
                        announcementCopy.latestAnnouncement
                      }
                    </strong>

                    {announcements.length >
                    1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setAnnouncementHistoryOpen(
                            (
                              current,
                            ) =>
                              !current,
                          )
                        }
                      >
                        {announcementHistoryOpen
                          ? announcementCopy.hideHistory
                          : announcementCopy.showAll}
                      </button>
                    ) : null}
                  </div>

                  <p>
                    {resolveMeloContactText(
                      latestAnnouncement.message,
                      latestAnnouncement,
                    )}
                  </p>

                  <small>
                    {
                      announcementCopy.announcementBy
                    }{" "}
                    {
                      latestAnnouncement.authorName
                    }{" "}
                    ·{" "}
                    {formatTime(
                      latestAnnouncement.createdAt,
                      locale,
                    )}
                  </small>
                </div>
              </div>
            ) : null}

            {announcementComposerOpen &&
            canPublishAnnouncement ? (
              <div
                className={
                  styles.groupAnnouncementComposer
                }
              >
                <textarea
                  value={
                    announcementDraft
                  }
                  maxLength={
                    1200
                  }
                  rows={
                    3
                  }
                  onChange={(
                    event,
                  ) =>
                    setAnnouncementDraft(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder={
                    announcementCopy.announcementPlaceholder
                  }
                  autoFocus
                />

                <div>
                  <small>
                    {
                      announcementDraft.length
                    }
                    /1200{" "}
                    {
                      announcementCopy.chars
                    }
                  </small>

                  <button
                    type="button"
                    disabled={
                      !announcementDraft.trim() ||
                      publishingAnnouncement
                    }
                    onClick={() =>
                      void publishGroupAnnouncement()
                    }
                  >
                    {publishingAnnouncement
                      ? announcementCopy.publishing
                      : announcementCopy.publish}
                  </button>
                </div>
              </div>
            ) : null}

            {announcementHistoryOpen &&
            announcements.length >
              1 ? (
              <div
                className={
                  styles.groupAnnouncementHistory
                }
              >
                {announcements.map(
                  (
                    item,
                  ) => (
                    <article
                      key={
                        item.id
                      }
                    >
                      <p>
                        {resolveMeloContactText(
                          item.message,
                          item,
                        )}
                      </p>

                      <small>
                        {
                          announcementCopy.announcementBy
                        }{" "}
                        {
                          item.authorName
                        }{" "}
                        ·{" "}
                        {formatTime(
                          item.createdAt,
                          locale,
                        )}
                      </small>
                    </article>
                  ),
                )}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <div
        ref={messageListRef}
        onScroll={handleMessageScroll}
        className={
          styles.messageScroll
        }
      >
        {loading ? (
          <div
            className={
              styles.messageState
            }
          >
            {t.loading}
          </div>
        ) : renderedMessages.length ? (
renderedMessages.map(
            (
              message,
              index,
            ) => {
              const mine =
                room.category ===
                "direct"
                  ? directMine(
                      message,
                      room,
                      userId,
                    )
                  : message.senderId ===
                    userId;

              const activityProfile =
                room.category !==
                "direct"
                  ? activitySenderProfiles.get(
                      message.senderId,
                    )
                  : undefined;

              const baseSenderName =
                senderDisplay(
                  message,
                  room,
                  mine,
                );

              const senderName =
                !mine &&
                room.category !==
                  "direct"
                  ? activityProfile?.name ||
                    baseSenderName
                  : baseSenderName;

              const profileId =
                senderProfileId(
                  message,
                  room,
                  mine,
                );

              const validLocation =
                Number.isFinite(
                  message.latitude,
                ) &&
                Number.isFinite(
                  message.longitude,
                );

              /*
               * Sticker messages store stickerCode in original_text as a DB-safe
               * fallback, but the UI already renders stickerCode as a sticker.
               * Do not show the same emoji again as normal bubble text.
               */
              const body =
                message.messageType ===
                "sticker"
                  ? ""
                  : displayedBody(
                      message,
                    );

              const originalBody =
                message.messageType ===
                "sticker"
                  ? ""
                  : originalBodyUnderTranslation(
                      message,
                    );

              const showIncomingDirectAvatar =
                !mine &&
                room.category ===
                  "direct";

              const showIncomingActivityAvatar =
                !mine &&
                room.category !==
                  "direct";

              const currentDay =
                messageDayKey(
                  message.createdAt,
                );

              const previousDay =
                index > 0
                  ? messageDayKey(
                      renderedMessages[
                        index - 1
                      ]?.createdAt ||
                        "",
                    )
                  : "";

              const showDateSeparator =
                Boolean(
                  currentDay,
                ) &&
                currentDay !==
                  previousDay;

              const senderLabel =
                !mine ? (
                  <div
                    className={
                      avatarStyles.messageSenderName
                    }
                  >
                    {profileId ? (
                      <Link
                        href={`/users/${profileId}`}
                        className={
                          styles.profileNameLink
                        }
                      >
                        {
                          senderName
                        }
                      </Link>
                    ) : (
                      <span>
                        {
                          senderName
                        }
                      </span>
                    )}
                  </div>
                ) : null;

              const bubble = (
                <div
                  className={
                    mine
                      ? styles.bubbleMine
                      : styles.bubbleOther
                  }
                >
                  {message.messageType ===
                    "image" &&
                  message.mediaPath ? (
                    <ChatMediaImage
                      className={
                        styles.chatImage
                      }
                      path={
                        message.mediaPath
                      }
                    />
                  ) : null}

                  {message.messageType ===
                    "location" &&
                  validLocation ? (
                    <div
                      className={
                        styles.locationCard
                      }
                    >
                      <span>
                        ⌖
                      </span>

                      <div>
                        <b>
                          {message.locationLabel ||
                            t.location}
                        </b>

                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={`https://www.google.com/maps/search/?api=1&query=${message.latitude},${message.longitude}`}
                        >
                          {
                            t.openMap
                          }{" "}
                          ↗
                        </a>
                      </div>
                    </div>
                  ) : null}

                  {message.messageType ===
                  "sticker" ? (
                    <div
                      className={
                        styles.sticker
                      }
                    >
                      {message.stickerCode ||
                        "✨"}
                    </div>
                  ) : null}

                  {body ? (
                    <p>
                      {body}
                    </p>
                  ) : null}

                  {originalBody ? (
                    <p
                      style={{
                        marginTop:
                          "5px",
                        paddingTop:
                          "5px",
                        borderTop:
                          "1px solid currentColor",
                        opacity:
                          0.58,
                        fontSize:
                          "0.78em",
                        lineHeight:
                          1.35,
                      }}
                    >
                      {originalBody}
                    </p>
                  ) : null}

                  <time
                    className={
                      avatarStyles.messageTime
                    }
                  >
                    {formatMessageTime(
                      message.createdAt,
                      locale,
                    )}
                  </time>
                </div>
              );

              return (
                <Fragment
                  key={
                    message.id
                  }
                >
                  {showDateSeparator ? (
                    <div
                      className={
                        avatarStyles.dateSeparator
                      }
                    >
                      <span>
                        {formatMessageDate(
                          message.createdAt,
                          locale,
                        )}
                      </span>
                    </div>
                  ) : null}

                  <article
                    className={
                      mine
                        ? styles.messageMine
                        : styles.messageOther
                    }
                  >
                    {showIncomingDirectAvatar ? (
                      <div
                        className={`${avatarStyles.incomingMessageRow} ${styles.incomingMessageRowLayout}`}
                      >
                        <IncomingDirectAvatar
                          room={
                            room
                          }
                          profileId={
                            profileId
                          }
                          senderName={
                            senderName
                          }
                        />

                        <div
                          className={`${avatarStyles.incomingBubbleColumn} ${styles.incomingBubbleColumnLayout}`}
                        >
                          {
                            senderLabel
                          }

                          {
                            bubble
                          }
                        </div>
                      </div>
                    ) : showIncomingActivityAvatar ? (
                      <div
                        className={`${avatarStyles.incomingMessageRow} ${styles.incomingMessageRowLayout}`}
                      >
                        <IncomingActivityAvatar
                          profileId={
                            profileId
                          }
                          senderName={
                            senderName
                          }
                          profile={
                            activityProfile
                          }
                        />

                        <div
                          className={`${avatarStyles.incomingBubbleColumn} ${styles.incomingBubbleColumnLayout}`}
                        >
                          {
                            senderLabel
                          }

                          {
                            bubble
                          }
                        </div>
                      </div>
                    ) : (
                      <div
                        className={
                          mine
                            ? `${avatarStyles.mineMessageColumn} ${styles.mineMessageColumnLayout}`
                            : `${avatarStyles.otherMessageColumn} ${styles.otherMessageColumnLayout}`
                        }
                      >
                        {
                          senderLabel
                        }

                        {
                          bubble
                        }
                      </div>
                    )}
                  </article>
                </Fragment>
              );
            },
          )
        ) : (
          <div
            className={
              styles.messageState
            }
          >
            {t.empty}
          </div>
        )}

        <div
          ref={
            endRef
          }
        />
      </div>

      {error ? (
        <div
          className={
            styles.conversationError
          }
        >
          {error}
        </div>
      ) : null}

      <div
        className={
          styles.composer
        }
      >
        <div
          className={
            styles.composerMain
          }
        >
          <div
            className={
              styles.composerInputWrap
            }
          >
            <textarea
              ref={
                composerTextareaRef
              }
              value={
                draft
              }
              onChange={(
                event,
              ) =>
                setDraft(
                  event
                    .target
                    .value,
                )
              }
              onFocus={() => {
                window.setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 120);
              }}
              placeholder={
                t.placeholder
              }
              rows={
                1
              }
              onKeyDown={(
                event,
              ) => {
                if (
                  event.key ===
                    "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();

                  void sendText();
                }
              }}
            />

            <div
              className={
                styles.composerTools
              }
            >
              <button
                type="button"
                className={`${styles.composerTool} ${
                  stickerOpen
                    ? styles.composerToolActive
                    : ""
                }`}
                onClick={() =>
                  setStickerOpen(
                    (
                      current,
                    ) =>
                      !current,
                  )
                }
                disabled={
                  sending
                }
                aria-label={
                  t.sticker
                }
                title={
                  t.sticker
                }
              >
                <IconSticker />
              </button>

              <button
                type="button"
                className={
                  styles.composerTool
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={
                  sending
                }
                aria-label={
                  t.attachImage
                }
                title={
                  t.attachImage
                }
              >
                <IconImage />
              </button>
            </div>

            {stickerOpen ? (
              <div
                className={
                  styles.stickerPicker
                }
                role="menu"
                aria-label={
                  t.sticker
                }
              >
                {STICKERS.map(
                  (
                    item,
                  ) => (
                    <button
                      key={
                        item
                      }
                      type="button"
                      onClick={() =>
                        void sendSticker(
                          item,
                        )
                      }
                      disabled={
                        sending
                      }
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
            ) : null}

            <input
              ref={
                fileInputRef
              }
              type="file"
              accept="image/*"
              className={
                styles.hiddenFileInput
              }
              onChange={(
                event,
              ) =>
                void attachImage(
                  event
                    .target
                    .files?.[0] ||
                    null,
                )
              }
            />
          </div>

          <button
            className={
              styles.sendButton
            }
            type="button"
            onClick={() =>
              void sendText()
            }
            disabled={
              !draft.trim() ||
              sending
            }
          >
            {t.send}
          </button>
        </div>
      </div>
    </section>
  );
}







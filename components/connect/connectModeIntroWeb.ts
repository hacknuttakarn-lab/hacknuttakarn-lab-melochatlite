'use client';

import {
  getCurrentUser,
  restSelect,
  restUpsert,
  rpcRequest,
} from '@/lib/supabase/browser';

type Row = Record<string, unknown>;

export type ConnectModeIntrosWeb = {
  friendIntro: string;
  loveIntro: string;
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
    return [value as Row];
  }

  return [];
}

function text(
  row: Row | null | undefined,
  ...keys: string[]
) {
  if (!row) {
    return '';
  }

  for (const key of keys) {
    const value = row[key];

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return '';
}

function unique(
  values: string[],
) {
  return [
    ...new Set(
      values
        .map((value) =>
          String(value || '').trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function isMissingRpcMessage(
  error: string | null | undefined,
) {
  const value =
    String(
      error ?? '',
    ).toLowerCase();

  return (
    value.includes(
      'could not find the function',
    ) ||
    value.includes(
      'schema cache',
    ) ||
    value.includes(
      'pgrst202',
    )
  );
}

/**
 * โหลด Friend introduction ของเจ้าของบัญชี
 * จาก Friend Preferences ตัวจริง
 *
 * ไม่ใช้ Profile bio
 */
async function loadMyFriendIntroFromPreferences() {
  const v2 =
    await rpcRequest<
      Row | Row[]
    >(
      'get_my_friend_preferences_v2',
    );

  if (!v2.error) {
    return text(
      rowsOf(v2.data)[0],
      'intro',
      'friend_intro',
    );
  }

  if (
    !isMissingRpcMessage(
      v2.error,
    )
  ) {
    throw new Error(
      v2.error,
    );
  }

  const legacy =
    await rpcRequest<
      Row | Row[]
    >(
      'get_my_friend_preferences',
    );

  if (legacy.error) {
    if (
      isMissingRpcMessage(
        legacy.error,
      )
    ) {
      return '';
    }

    throw new Error(
      legacy.error,
    );
  }

  return text(
    rowsOf(
      legacy.data,
    )[0],
    'intro',
    'friend_intro',
  );
}

/**
 * โหลด Friend/Love introduction
 * ของบัญชีปัจจุบัน
 *
 * Friend:
 * - อ่านจาก Friend Preferences
 *
 * Love:
 * - อ่านจาก profiles.love_intro
 *
 * ไม่ใช้ Profile bio
 */
export async function loadMyConnectModeIntrosWeb(): Promise<ConnectModeIntrosWeb> {
  const user =
    await getCurrentUser();

  if (!user?.id) {
    return {
      friendIntro: '',
      loveIntro: '',
    };
  }

  const [
    friendIntro,
    profileResult,
  ] =
    await Promise.all([
      loadMyFriendIntroFromPreferences(),

      restSelect<Row[]>(
        'profiles',
        `select=id,love_intro&id=eq.${encodeURIComponent(
          user.id,
        )}&limit=1`,
      ),
    ]);

  if (profileResult.error) {
    throw new Error(
      profileResult.error,
    );
  }

  const profile =
    rowsOf(
      profileResult.data,
    )[0] ?? {};

  return {
    friendIntro,

    loveIntro:
      text(
        profile,
        'love_intro',
      ),
  };
}

/**
 * โหลด Friend introduction สำหรับรายชื่อ User
 * ที่กำลังแสดงอยู่ใน Connect → Friend
 *
 * ใช้ RPC public-safe ที่สร้างไว้ก่อนหน้านี้
 * get_connect_mode_intros_for_users_v1
 *
 * คืนเป็น Record:
 *
 * {
 *   "user-id-1": "Friend intro...",
 *   "user-id-2": "Friend intro..."
 * }
 */
export async function loadFriendIntrosForUsersWeb(
  userIds: string[],
): Promise<Record<string, string>> {
  const ids =
    unique(
      userIds,
    ).slice(
      0,
      100,
    );

  if (!ids.length) {
    return {};
  }

  const result =
    await rpcRequest<
      Row | Row[]
    >(
      'get_connect_mode_intros_for_users_v1',
      {
        p_user_ids:
          ids,
      },
    );

  /**
   * ถ้า RPC ไม่มีใน DB
   * ไม่ทำให้หน้า Connect พัง
   *
   * Candidate RPC เดิมยังเป็น fallback
   */
  if (result.error) {
    console.warn(
      '[Melo Connect] Unable to load Friend introductions:',
      result.error,
    );

    return {};
  }

  const map:
    Record<
      string,
      string
    > = {};

  for (
    const row
    of rowsOf(
      result.data,
    )
  ) {
    const userId =
      text(
        row,
        'user_id',
      );

    if (!userId) {
      continue;
    }

    map[userId] =
      text(
        row,
        'friend_intro',
      );
  }

  return map;
}

/**
 * Settings → Save Connect settings
 *
 * Friend:
 * 1. Friend Preferences ถูก save โดย settingsWebData.ts อยู่แล้ว
 * 2. ฟังก์ชันนี้ sync Friend intro เข้า connect_mode_intros
 *    เพื่อให้ผู้ใช้อื่นอ่านได้ใน Connect → Friend
 *
 * Love:
 * - save ลง profiles.love_intro
 * - sync ลง connect_mode_intros ด้วยเพื่อรักษา compatibility
 *
 * ไม่มีการใช้ Profile bio
 */
export async function saveMyConnectModeIntrosWeb(
  friendIntro: string,
  loveIntro: string,
) {
  const user =
    await getCurrentUser();

  if (!user?.id) {
    throw new Error(
      'AUTH_REQUIRED',
    );
  }

  const cleanFriendIntro =
    friendIntro
      .trim() ||
    null;

  const cleanLoveIntro =
    loveIntro
      .trim() ||
    null;

  /**
   * Love ใช้ profiles.love_intro เป็น source หลัก
   */
  const profileResult =
    await restUpsert<Row[]>(
      'profiles',
      {
        id:
          user.id,

        love_intro:
          cleanLoveIntro,
      },
      'id',
    );

  if (profileResult.error) {
    throw new Error(
      profileResult.error,
    );
  }

  /**
   * Sync Friend introduction
   * สำหรับ Connect discovery
   *
   * เก็บ Love ไว้ด้วยเพื่อไม่ทำให้ข้อมูลเดิม
   * ใน connect_mode_intros ถูกล้าง
   */
  const syncResult =
    await rpcRequest(
      'save_my_connect_mode_intros_v1',
      {
        p_friend_intro:
          cleanFriendIntro,

        p_love_intro:
          cleanLoveIntro,
      },
    );

  if (syncResult.error) {
    if (
      isMissingRpcMessage(
        syncResult.error,
      )
    ) {
      throw new Error(
        'Friend introduction sync RPC is not installed. Run the connect_mode_intros migration first.',
      );
    }

    throw new Error(
      syncResult.error,
    );
  }
}
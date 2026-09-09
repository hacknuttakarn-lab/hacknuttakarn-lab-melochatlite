"use client";

import {
  getCurrentUser,
  publicStorageUrl,
  restSelect,
  rpcRequest,
} from "@/lib/supabase/browser";

export type LiveNoticeKind =
  | "trip"
  | "event"
  | "community"
  | "admin";

export type LiveNoticeDeliveryMode =
  | "user"
  | "hourly"
  | "empty"
  | "interval";

export type LiveNoticeWeb = {
  id: string;
  kind: LiveNoticeKind;
  sourceId: string;

  authorId: string;
  authorName: string;
  authorPhotoUrl: string;

  title: string;
  body: string;
  message: string;

  country: string;
  city: string;

  createdAt: string;
  expiresAt: string;

  isActive: boolean;
  isAdmin: boolean;

  deliveryMode: LiveNoticeDeliveryMode;
  queueEvery: number | null;

  imagePath: string | null;
  imageUrl: string;

  ctaHref: string;
};

export const ADMIN_LIVE_NOTICE_BUCKET =
  "admin-live-notices";

export const MAX_ADMIN_LIVE_NOTICE_TITLE_LENGTH =
  80;

export const MAX_ADMIN_LIVE_NOTICE_BODY_LENGTH =
  1200;

export const DEFAULT_ADMIN_INTERVAL_QUEUE_EVERY =
  10;

export const MIN_ADMIN_INTERVAL_QUEUE_EVERY =
  1;

export const MAX_ADMIN_INTERVAL_QUEUE_EVERY =
  50;

export const ADMIN_LIVE_NOTICE_MAX_IMAGE_BYTES =
  8 * 1024 * 1024;

type Row =
  Record<string, any>;


function text(
  row: Row,
  key: string,
  fallback = "",
) {
  const value =
    row?.[key];

  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : fallback;
}


function bool(
  value: unknown,
  fallback = false,
) {
  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    value === 1 ||
    value === "1" ||
    value === "true"
  ) {
    return true;
  }

  if (
    value === 0 ||
    value === "0" ||
    value === "false"
  ) {
    return false;
  }

  return fallback;
}


function numberValue(
  value: unknown,
  fallback = 0,
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : fallback;
}


function nullableText(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const clean =
    value.trim();

  return clean ||
    null;
}


function kindOf(
  value: unknown,
): LiveNoticeKind {
  if (
    value === "admin"
  ) {
    return "admin";
  }

  if (
    value === "event"
  ) {
    return "event";
  }

  if (
    value === "community"
  ) {
    return "community";
  }

  return "trip";
}


function deliveryModeOf(
  value: unknown,
): LiveNoticeDeliveryMode {
  if (
    value === "hourly" ||
    value === "empty" ||
    value === "interval"
  ) {
    return value;
  }

  return "user";
}


function hrefFor(
  kind: LiveNoticeKind,
  sourceId: string,
) {
  if (
    !sourceId ||
    kind === "admin"
  ) {
    return "";
  }

  if (
    kind === "trip"
  ) {
    return `/trips/${sourceId}`;
  }

  if (
    kind === "event"
  ) {
    return `/events/${sourceId}`;
  }

  if (
    kind === "community"
  ) {
    return `/community/${sourceId}`;
  }

  return "";
}


function photoPaths(
  value: unknown,
): string[] {
  if (
    Array.isArray(value)
  ) {
    return value
      .map(
        (item) =>
          String(
            item ?? "",
          ).trim(),
      )
      .filter(Boolean);
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const clean =
      value.trim();

    try {
      const parsed =
        JSON.parse(clean);

      if (
        Array.isArray(parsed)
      ) {
        return parsed
          .map(
            (item) =>
              String(
                item ?? "",
              ).trim(),
          )
          .filter(Boolean);
      }
    } catch {
      return [
        clean,
      ];
    }
  }

  return [];
}


async function loadAuthorProfiles(
  authorIds: string[],
) {
  const ids =
    [
      ...new Set(
        authorIds.filter(Boolean),
      ),
    ];

  const map =
    new Map<
      string,
      Row
    >();

  if (
    !ids.length
  ) {
    return map;
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
    await restSelect<Row[]>(
      "profiles",
      `select=id,display_name,photo_paths&id=in.(${encodeURIComponent(
        quoted,
      )})`,
    );

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
      text(
        row,
        "id",
      );

    if (
      id
    ) {
      map.set(
        id,
        row,
      );
    }
  }

  return map;
}


function profilePhotoUrl(
  row:
    Row |
    undefined,
) {
  if (
    !row
  ) {
    return "";
  }

  const firstPath =
    photoPaths(
      row.photo_paths,
    )[0] ||
    "";

  return firstPath
    ? publicStorageUrl(
        "profile-photos",
        firstPath,
      )
    : "";
}


function adminImageUrl(
  path:
    string |
    null,
) {
  if (
    !path
  ) {
    return "";
  }

  return publicStorageUrl(
    ADMIN_LIVE_NOTICE_BUCKET,
    path,
  );
}


function normalize(
  row: Row,
): LiveNoticeWeb {
  const kind =
    kindOf(
      row.object_type ??
      row.objectType,
    );

  const sourceId =
    text(
      row,
      "object_id",
      text(
        row,
        "objectId",
      ),
    );

  const title =
    text(
      row,
      "title",
    );

  const body =
    text(
      row,
      "body",
    );

  const message =
    title &&
    body
      ? `${title} — ${body}`
      : title ||
        body;

  const imagePath =
    nullableText(
      row.image_path ??
      row.imagePath,
    );

  const normalizedQueue =
    numberValue(
      row.queue_every ??
      row.queueEvery,
      0,
    );

  return {
    id:
      text(
        row,
        "id",
      ),

    kind,
    sourceId,

    authorId:
      text(
        row,
        "author_id",
        text(
          row,
          "authorId",
        ),
      ),

    authorName:
      text(
        row,
        "author_name",
        text(
          row,
          "authorName",
          kind === "admin"
            ? "Melo Admin"
            : "Melo member",
        ),
      ),

    authorPhotoUrl:
      kind === "admin" ||
      !text(
        row,
        "author_photo_path",
        text(
          row,
          "authorPhotoPath",
        ),
      )
        ? ""
        : publicStorageUrl(
            "profile-photos",
            text(
              row,
              "author_photo_path",
              text(
                row,
                "authorPhotoPath",
              ),
            ),
          ),

    title,
    body,
    message,

    country: "",
    city: "",

    createdAt:
      text(
        row,
        "created_at",
        text(
          row,
          "createdAt",
        ),
      ),

    expiresAt:
      text(
        row,
        "expires_at",
        text(
          row,
          "expiresAt",
        ),
      ),

    isActive:
      bool(
        row.is_active ??
        row.isActive,
        true,
      ),

    isAdmin:
      kind === "admin",

    deliveryMode:
      deliveryModeOf(
        row.delivery_mode ??
        row.deliveryMode,
      ),

    queueEvery:
      normalizedQueue >
      0
        ? normalizedQueue
        : null,

    imagePath,

    imageUrl:
      kind === "admin"
        ? adminImageUrl(
            imagePath,
          )
        : "",

    ctaHref:
      hrefFor(
        kind,
        sourceId,
      ),
  };
}


/**
 * Public Live Notice feed.
 * Uses the same security-definer RPC as Android.
 */
export async function loadLiveNoticesForWeb({
  limit = 20,
}: {
  locale?: string;
  countryScope?: string;
  limit?: number;
}): Promise<
  LiveNoticeWeb[]
> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        30,
        Math.round(
          limit,
        ),
      ),
    );

  const result =
    await rpcRequest<Row[]>(
      "list_active_melo_live_notices",
      {
        p_limit:
          safeLimit,
      },
    );

  if (
    result.error
  ) {
    console.warn(
      "[Melo Web] Unable to load Melo Live Notice.",
      result.error,
    );

    return [];
  }

  const rpcRows =
    (
      Array.isArray(
        result.data,
      )
        ? result.data
        : []
    ).filter(
      (
        row,
      ): row is Row =>
        Boolean(
          row &&
          typeof row ===
            "object" &&
          !Array.isArray(
            row,
          ),
        ),
    );

  const profiles =
    await loadAuthorProfiles(
      rpcRows
        .filter(
          (row) =>
            row.object_type !==
            "admin",
        )
        .map(
          (row) =>
            text(
              row,
              "author_id",
            ),
        )
        .filter(Boolean),
    );

  return rpcRows
    .map(
      normalize,
    )
    .map(
      (notice) => {
        if (
          notice.isAdmin
        ) {
          return notice;
        }

        const profile =
          profiles.get(
            notice.authorId,
          );

        return {
          ...notice,

          authorName:
            notice.authorName &&
            notice.authorName !==
              "Melo member"
              ? notice.authorName
              : text(
                  profile ??
                    {},
                  "display_name",
                  notice.authorName ||
                    "Melo member",
                ),

          authorPhotoUrl:
            notice.authorPhotoUrl ||
            profilePhotoUrl(
              profile,
            ),
        };
      },
    )
    .filter(
      (notice) => {
        if (
          !notice.id ||
          !notice.message
        ) {
          return false;
        }

        if (
          notice.isAdmin
        ) {
          return true;
        }

        return Boolean(
          notice.sourceId &&
          notice.title,
        );
      },
    );
}


/* =========================================================
   ADMIN LIVE NOTICE
   ========================================================= */

function firstRecord(
  value: unknown,
): Row | null {
  if (
    Array.isArray(value)
  ) {
    const first =
      value[0];

    return first &&
      typeof first ===
        "object" &&
      !Array.isArray(
        first,
      )
      ? first as Row
      : null;
  }

  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
    ? value as Row
    : null;
}


function findAccessToken(
  value: unknown,
  depth = 0,
): string {
  if (
    depth >
    6 ||
    !value
  ) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return "";
  }

  if (
    Array.isArray(value)
  ) {
    for (
      const item
      of value
    ) {
      const token =
        findAccessToken(
          item,
          depth + 1,
        );

      if (
        token
      ) {
        return token;
      }
    }

    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    const row =
      value as
        Record<
          string,
          unknown
        >;

    const direct =
      row.access_token ??
      row.accessToken;

    if (
      typeof direct ===
        "string" &&
      direct.trim()
    ) {
      return direct.trim();
    }

    for (
      const child
      of Object.values(
        row,
      )
    ) {
      const token =
        findAccessToken(
          child,
          depth + 1,
        );

      if (
        token
      ) {
        return token;
      }
    }
  }

  return "";
}


function storedAccessToken() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  for (
    let i = 0;
    i <
    window.localStorage
      .length;
    i += 1
  ) {
    const key =
      window.localStorage.key(
        i,
      );

    if (
      !key
    ) {
      continue;
    }

    const raw =
      window.localStorage.getItem(
        key,
      );

    if (
      !raw
    ) {
      continue;
    }

    try {
      const token =
        findAccessToken(
          JSON.parse(
            raw,
          ),
        );

      if (
        token
      ) {
        return token;
      }
    } catch {
      // Ignore non JSON localStorage values.
    }
  }

  return "";
}


function storageConfig() {
  const url =
    (
      process.env
        .NEXT_PUBLIC_SUPABASE_URL ??
      ""
    ).replace(
      /\/+$/,
      "",
    );

  const anonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";

  const accessToken =
    storedAccessToken();

  if (
    !url ||
    !anonKey ||
    !accessToken
  ) {
    throw new Error(
      "Supabase Storage authentication is unavailable.",
    );
  }

  return {
    url,
    anonKey,
    accessToken,
  };
}


function encodedStoragePath(
  path: string,
) {
  return path
    .split("/")
    .map(
      (part) =>
        encodeURIComponent(
          part,
        ),
    )
    .join("/");
}


function fileExtension(
  file: File,
) {
  const mime =
    file.type
      .toLowerCase()
      .trim();

  if (
    mime ===
    "image/png"
  ) {
    return "png";
  }

  if (
    mime ===
    "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}


function validateAdminImage(
  file: File,
) {
  const allowed =
    new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

  if (
    !allowed.has(
      file.type
        .toLowerCase(),
    )
  ) {
    throw new Error(
      "ADMIN_LIVE_NOTICE_IMAGE_TYPE",
    );
  }

  if (
    file.size >
    ADMIN_LIVE_NOTICE_MAX_IMAGE_BYTES
  ) {
    throw new Error(
      "ADMIN_LIVE_NOTICE_IMAGE_TOO_LARGE",
    );
  }
}


async function uploadAdminLiveNoticeImage(
  file: File,
) {
  validateAdminImage(
    file,
  );

  const user =
    await getCurrentUser();

  if (
    !user?.id
  ) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  const {
    url,
    anonKey,
    accessToken,
  } =
    storageConfig();

  const suffix =
    Math.random()
      .toString(36)
      .slice(
        2,
        10,
      );

  const path =
    `${user.id}/` +
    `${Date.now()}-` +
    `${suffix}.` +
    `${fileExtension(
      file,
    )}`;

  const response =
    await fetch(
      `${url}/storage/v1/object/` +
        `${encodeURIComponent(
          ADMIN_LIVE_NOTICE_BUCKET,
        )}/` +
        `${encodedStoragePath(
          path,
        )}`,
      {
        method:
          "POST",

        headers: {
          apikey:
            anonKey,

          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            file.type ||
            "application/octet-stream",

          "cache-control":
            "3600",

          "x-upsert":
            "false",
        },

        body:
          file,
      },
    );

  if (
    !response.ok
  ) {
    const body =
      await response
        .json()
        .catch(
          () => ({}),
        ) as
        Record<
          string,
          unknown
        >;

    throw new Error(
      String(
        body.message ??
        body.error ??
        "Unable to upload Admin Live Notice image.",
      ),
    );
  }

  return path;
}


async function removeAdminLiveNoticeImage(
  path:
    string |
    null |
    undefined,
) {
  const clean =
    String(
      path ?? "",
    ).trim();

  if (
    !clean
  ) {
    return;
  }

  try {
    const {
      url,
      anonKey,
      accessToken,
    } =
      storageConfig();

    await fetch(
      `${url}/storage/v1/object/` +
        `${encodeURIComponent(
          ADMIN_LIVE_NOTICE_BUCKET,
        )}/` +
        `${encodedStoragePath(
          clean,
        )}`,
      {
        method:
          "DELETE",

        headers: {
          apikey:
            anonKey,

          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );
  } catch {
    // Cleanup failure must not hide the original publish error.
  }
}


export async function listAdminMeloLiveNoticeHistoryForWeb(
  limit = 10,
): Promise<
  LiveNoticeWeb[]
> {
  const result =
    await rpcRequest<Row[]>(
      "list_admin_melo_live_notice_history",
      {
        p_limit:
          Math.max(
            1,
            Math.min(
              10,
              Math.round(
                limit,
              ),
            ),
          ),
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  return (
    Array.isArray(
      result.data,
    )
      ? result.data
      : []
  )
    .filter(
      (
        row,
      ): row is Row =>
        Boolean(
          row &&
          typeof row ===
            "object" &&
          !Array.isArray(
            row,
          ),
        ),
    )
    .map(
      normalize,
    );
}


export async function createAdminMeloLiveNoticeForWeb(
  input: {
    title: string;

    body?: string;

    deliveryMode:
      Exclude<
        LiveNoticeDeliveryMode,
        "user"
      >;

    queueEvery?:
      number |
      null;

    image?:
      File |
      null;

    existingImagePath?:
      string |
      null;
  },
): Promise<
  LiveNoticeWeb
> {
  let uploadedImagePath:
    string |
    null =
      null;

  try {
    if (
      input.image
    ) {
      uploadedImagePath =
        await uploadAdminLiveNoticeImage(
          input.image,
        );
    }

    const imagePath =
      uploadedImagePath ??
      (
        input
          .existingImagePath
          ?.trim() ||
        null
      );

    const result =
      await rpcRequest<
        Row |
        Row[]
      >(
        "create_admin_melo_live_notice",
        {
          p_title:
            input.title
              .trim(),

          p_body:
            input.body
              ?.trim() ??
            "",

          p_delivery_mode:
            input.deliveryMode,

          p_queue_every:
            input.deliveryMode ===
            "interval"
              ? Math.max(
                  MIN_ADMIN_INTERVAL_QUEUE_EVERY,
                  Math.min(
                    MAX_ADMIN_INTERVAL_QUEUE_EVERY,
                    Math.round(
                      Number(
                        input.queueEvery ??
                        DEFAULT_ADMIN_INTERVAL_QUEUE_EVERY,
                      ),
                    ),
                  ),
                )
              : null,

          p_image_path:
            imagePath,
        },
      );

    if (
      result.error
    ) {
      throw new Error(
        result.error,
      );
    }

    const row =
      firstRecord(
        result.data,
      );

    if (
      !row
    ) {
      throw new Error(
        "Unable to create Admin Live Notice.",
      );
    }

    return normalize(
      row,
    );
  } catch (
    error
  ) {
    if (
      uploadedImagePath
    ) {
      await removeAdminLiveNoticeImage(
        uploadedImagePath,
      );
    }

    throw error;
  }
}


export async function deactivateAdminMeloLiveNoticeForWeb(
  noticeId: string,
) {
  const result =
    await rpcRequest(
      "deactivate_admin_melo_live_notice",
      {
        p_notice_id:
          noticeId,
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
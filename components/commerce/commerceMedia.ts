import {
  getStoredSession,
  publicStorageUrl,
  refreshStoredSession,
} from '@/lib/supabase/browser';

type Row =
  Record<
    string,
    unknown
  >;

type StorageRef = {
  bucket: string;
  path: string;
  original?: string;
  originalMode?:
    | 'public'
    | 'sign'
    | 'authenticated';
};

type MediaCandidate =
  | {
      kind: 'direct';
      url: string;
    }
  | {
      kind: 'storage';
      ref: StorageRef;
    };

const SINGLE_MEDIA_KEYS = [
  'image_url',
  'cover_url',
  'cover_image_url',
  'service_image_url',
  'product_image_url',
  'main_image_url',

  'thumbnail_url',
  'photo_url',
  'logo_url',
  'profile_image_url',
  'profile_photo_url',
  'avatar_url',
  'public_url',
  'signed_url',
  'src',

  'image_storage_path',
  'cover_storage_path',
  'service_image_storage_path',
  'product_image_storage_path',
  'main_image_storage_path',
  'media_storage_path',
  'service_photo_storage_path',
  'product_photo_storage_path',

  'service_image_path',
  'product_image_path',
  'main_image_path',
  'media_path',

  'thumbnail_path',
  'photo_path',
  'logo_storage_path',
  'logo_path',
  'profile_image_path',
  'profile_photo_path',
  'avatar_path',

  'business_image_path',
  'business_profile_image_path',
  'business_logo_path',
  'store_image_path',
  'store_logo_path',

  'image',
  'cover_image',
  'service_image',
  'product_image',
  'main_image',
  'logo',
  'profile_image',
  'photo',
  'thumbnail',

  'image_path',
  'cover_path',
  'cover_image_path',
  'service_cover_path',
  'service_cover_image_path',

  'service_photo_path',
  'product_photo_path',
  'primary_image_path',
  'main_photo_path',
  'storage_path',
  'path',
] as const;

const MULTI_MEDIA_KEYS = [
  'image_urls',
  'images',
  'photos',
  'gallery',
  'media',
  'image_paths',
  'photo_paths',
  'gallery_paths',

  'gallery_images',
  'service_images',
  'product_images',
  'additional_images',
  'additional_image_paths',

  'media_urls',
  'media_paths',
  'photo_urls',
  'service_image_paths',
  'product_image_paths',
  'service_photos',
  'product_photos',
  'service_media',
  'product_media',

  'cover_images',
  'cover_image_paths',
  'logos',
  'logo_paths',
  'profile_images',
  'profile_image_paths',
] as const;

const KNOWN_BUCKETS = [
  'business-media',
  'business-images',
  'activity-images',
  'community-images',
  'chat-media',
];

const DEFAULT_BUSINESS_BUCKETS = [
  'business-media',
  'business-images',
];

const MEDIA_KEY_PATTERN =
  /(image|photo|logo|cover|media|thumb|avatar|gallery)/i;

const SIGNED_URL_TTL_SECONDS =
  60 * 60;

const SIGNED_URL_REUSE_MS =
  50 * 60 * 1000;

const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL
    ?.replace(
      /\/$/,
      '',
    ) ??
  '';

/*
 * IMPORTANT
 *
 * Melo Web รุ่นเดิมหลายส่วนใช้
 * NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * ขณะที่ Supabase รุ่นใหม่อาจใช้
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * รองรับทั้งสองแบบเหมือน Private Storage
 * ส่วนอื่นของโปรเจกต์
 */
const supabaseKey =
  process.env
    .NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env
    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  '';

const signedCache =
  new Map<
    string,
    {
      url: string;
      expiresAt: number;
    }
  >();

const signedInFlight =
  new Map<
    string,
    Promise<string>
  >();

const privateObjectCache =
  new Map<
    string,
    string
  >();

const privateObjectInFlight =
  new Map<
    string,
    Promise<string>
  >();

function cleanString(
  value: string,
) {
  return value
    .trim()
    .replace(
      /^['"]|['"]$/g,
      '',
    );
}

function stringsFrom(
  value: unknown,
  depth = 0,
): string[] {
  if (
    depth > 6 ||
    value == null
  ) {
    return [];
  }

  if (
    typeof value ===
    'string'
  ) {
    const clean =
      cleanString(
        value,
      );

    if (
      !clean
    ) {
      return [];
    }

    if (
      (
        clean.startsWith(
          '[',
        ) &&
        clean.endsWith(
          ']',
        )
      ) ||
      (
        clean.startsWith(
          '{',
        ) &&
        clean.endsWith(
          '}',
        )
      )
    ) {
      try {
        return stringsFrom(
          JSON.parse(
            clean,
          ),
          depth + 1,
        );
      } catch {
        // keep raw string
      }
    }

    return [
      clean,
    ];
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return value.flatMap(
      (
        entry,
      ) =>
        stringsFrom(
          entry,
          depth + 1,
        ),
    );
  }

  if (
    typeof value ===
    'object'
  ) {
    const row =
      value as Row;

    const explicitBucket =
      typeof row.bucket ===
      'string'
        ? row.bucket.trim()
        : typeof row.bucket_id ===
            'string'
          ? row.bucket_id.trim()
          : '';

    const explicitPath =
      typeof row.path ===
      'string'
        ? row.path.trim()
        : typeof row.storage_path ===
            'string'
          ? row.storage_path.trim()
          : '';

    if (
      explicitBucket &&
      explicitPath
    ) {
      return [
        `${explicitBucket}/${explicitPath.replace(
          /^\/+/,
          '',
        )}`,
      ];
    }

    const preferred = [
      'url',
      'public_url',
      'signed_url',
      'src',
      'path',
      'storage_path',
      'image_url',
      'image_path',
      'photo_url',
      'photo_path',
    ];

    const hits =
      preferred.flatMap(
        (
          key,
        ) =>
          stringsFrom(
            row[
              key
            ],
            depth + 1,
          ),
      );

    if (
      hits.length
    ) {
      return hits;
    }
  }

  return [];
}

function collectRawMedia(
  row: Row,
  depth = 0,
): string[] {
  if (
    !row ||
    depth > 5
  ) {
    return [];
  }

  const raw:
    string[] = [];

  for (
    const key of
    SINGLE_MEDIA_KEYS
  ) {
    raw.push(
      ...stringsFrom(
        row[
          key
        ],
      ),
    );
  }

  for (
    const key of
    MULTI_MEDIA_KEYS
  ) {
    raw.push(
      ...stringsFrom(
        row[
          key
        ],
      ),
    );
  }

  /*
   * บาง RPC คืน bucket แยกจาก path
   */
  const explicitBucket =
    [
      'bucket',
      'bucket_id',
      'bucket_name',
      'storage_bucket',
      'media_bucket',
      'image_bucket',
      'photo_bucket',
    ]
      .map(
        (
          key,
        ) =>
          row[
            key
          ],
      )
      .find(
        (
          value,
        ) =>
          typeof value ===
            'string' &&
          value.trim(),
      );

  if (
    typeof explicitBucket ===
    'string'
  ) {
    const bucket =
      explicitBucket.trim();

    for (
      const key of
      SINGLE_MEDIA_KEYS
    ) {
      if (
        !/(path|storage)/i.test(
          key,
        )
      ) {
        continue;
      }

      for (
        const path of
        stringsFrom(
          row[
            key
          ],
        )
      ) {
        if (
          !/^https?:/i.test(
            path,
          ) &&
          path
        ) {
          raw.unshift(
            `supabase://${bucket}/${normalizeRelativeStoragePath(
              path,
            )}`,
          );
        }
      }
    }
  }

  /*
   * รองรับ nested media object
   */
  for (
    const [
      key,
      value,
    ] of
    Object.entries(
      row,
    )
  ) {
    if (
      value == null
    ) {
      continue;
    }

    if (
      MEDIA_KEY_PATTERN.test(
        key,
      )
    ) {
      raw.push(
        ...stringsFrom(
          value,
        ),
      );

      if (
        typeof value ===
          'object' &&
        !Array.isArray(
          value,
        )
      ) {
        raw.push(
          ...collectRawMedia(
            value as Row,
            depth + 1,
          ),
        );
      }

      continue;
    }

    if (
      typeof value ===
        'object' &&
      !Array.isArray(
        value,
      ) &&
      /(service|business|store|partner|product)/i.test(
        key,
      )
    ) {
      raw.push(
        ...collectRawMedia(
          value as Row,
          depth + 1,
        ),
      );
    }
  }

  return raw;
}

function normalizeRelativeStoragePath(
  value: string,
) {
  let clean =
    cleanString(
      value,
    ).replace(
      /\\/g,
      '/',
    );

  try {
    clean =
      decodeURIComponent(
        clean,
      );
  } catch {
    // keep original
  }

  clean =
    clean.replace(
      /^\/+/,
      '',
    );

  clean =
    clean.replace(
      /^public\//i,
      '',
    );

  return clean;
}

function parseStorageUrl(
  value: string,
):
  | StorageRef
  | null {
  try {
    const parsed =
      new URL(
        value,
      );

    const match =
      parsed.pathname.match(
        /\/storage\/v1\/object\/(public|sign|authenticated)\/([^/]+)\/(.+)$/i,
      );

    if (
      !match
    ) {
      return null;
    }

    const mode =
      match[
        1
      ].toLowerCase() as StorageRef['originalMode'];

    const bucket =
      decodeURIComponent(
        match[
          2
        ],
      );

    const path =
      normalizeRelativeStoragePath(
        match[
          3
        ],
      );

    return (
      bucket &&
      path
        ? {
            bucket,
            path,
            original:
              value,
            originalMode:
              mode,
          }
        : null
    );
  } catch {
    return null;
  }
}

function mediaCandidateRefs(
  value: string,
):
  MediaCandidate[] {
  const clean =
    cleanString(
      value,
    );

  if (
    !clean
  ) {
    return [];
  }

  const explicit =
    clean.match(
      /^supabase:\/\/([^/]+)\/(.+)$/i,
    );

  if (
    explicit
  ) {
    const bucket =
      explicit[
        1
      ].trim();

    const path =
      normalizeRelativeStoragePath(
        explicit[
          2
        ],
      );

    return (
      bucket &&
      path
        ? [
            {
              kind:
                'storage',
              ref: {
                bucket,
                path,
              },
            },
          ]
        : []
    );
  }

  if (
    /^(blob:|data:)/i.test(
      clean,
    )
  ) {
    return [
      {
        kind:
          'direct',
        url:
          clean,
      },
    ];
  }

  if (
    /^https?:/i.test(
      clean,
    )
  ) {
    const storage =
      parseStorageUrl(
        clean,
      );

    return storage
      ? [
          {
            kind:
              'storage',
            ref:
              storage,
          },
        ]
      : [
          {
            kind:
              'direct',
            url:
              clean,
          },
        ];
  }

  const normalized =
    normalizeRelativeStoragePath(
      clean,
    );

  if (
    !normalized
  ) {
    return [];
  }

  for (
    const bucket of
    KNOWN_BUCKETS
  ) {
    if (
      normalized
        .toLowerCase()
        .startsWith(
          `${bucket.toLowerCase()}/`,
        )
    ) {
      return [
        {
          kind:
            'storage',

          ref: {
            bucket,

            path:
              normalized.slice(
                bucket.length +
                  1,
              ),
          },
        },
      ];
    }
  }

  return DEFAULT_BUSINESS_BUCKETS.map(
    (
      bucket,
    ) => ({
      kind:
        'storage' as const,

      ref: {
        bucket,
        path:
          normalized,
      },
    }),
  );
}

function syncMediaCandidates(
  value: string,
):
  string[] {
  return mediaCandidateRefs(
    value,
  ).flatMap(
    (
      candidate,
    ) => {
      if (
        candidate.kind ===
        'direct'
      ) {
        return [
          candidate.url,
        ];
      }

      const {
        ref,
      } =
        candidate;

      const urls:
        string[] = [];

      if (
        ref.original &&
        ref.originalMode ===
          'public'
      ) {
        urls.push(
          ref.original,
        );
      }

      const publicUrl =
        publicStorageUrl(
          ref.bucket,
          ref.path,
        );

      if (
        publicUrl
      ) {
        urls.push(
          publicUrl,
        );
      }

      if (
        ref.original &&
        ref.originalMode !==
          'public'
      ) {
        urls.push(
          ref.original,
        );
      }

      return urls;
    },
  );
}

function encodedStoragePath(
  path: string,
) {
  return normalizeRelativeStoragePath(
    path,
  )
    .split(
      '/',
    )
    .filter(
      Boolean,
    )
    .map(
      (
        part,
      ) =>
        encodeURIComponent(
          part,
        ),
    )
    .join(
      '/',
    );
}

async function requestAuthenticatedObjectUrl(
  ref: StorageRef,
):
  Promise<string> {
  if (
    !supabaseUrl ||
    !supabaseKey ||
    !ref.bucket ||
    !ref.path ||
    typeof window ===
      'undefined'
  ) {
    return '';
  }

  const cacheKey =
    `${ref.bucket}/${ref.path}`;

  const cached =
    privateObjectCache.get(
      cacheKey,
    );

  if (
    cached
  ) {
    return cached;
  }

  const running =
    privateObjectInFlight.get(
      cacheKey,
    );

  if (
    running
  ) {
    return running;
  }

  const task =
    (async () => {
      let session =
        await refreshStoredSession();

      if (
        !session?.access_token
      ) {
        session =
          getStoredSession();
      }

      if (
        !session?.access_token
      ) {
        return '';
      }

      const endpoint =
        `${supabaseUrl}/storage/v1/object/${encodeURIComponent(
          ref.bucket,
        )}/${encodedStoragePath(
          ref.path,
        )}`;

      const send =
        async (
          token: string,
        ) =>
          fetch(
            endpoint,
            {
              method:
                'GET',

              headers: {
                apikey:
                  supabaseKey,

                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

      let response =
        await send(
          session.access_token,
        );

      if (
        response.status ===
        401
      ) {
        const refreshed =
          await refreshStoredSession(
            true,
          );

        if (
          refreshed?.access_token
        ) {
          response =
            await send(
              refreshed.access_token,
            );
        }
      }

      if (
        !response.ok
      ) {
        return '';
      }

      const blob =
        await response.blob();

      if (
        !blob.size
      ) {
        return '';
      }

      const objectUrl =
        URL.createObjectURL(
          blob,
        );

      privateObjectCache.set(
        cacheKey,
        objectUrl,
      );

      return objectUrl;
    })().finally(
      () =>
        privateObjectInFlight.delete(
          cacheKey,
        ),
    );

  privateObjectInFlight.set(
    cacheKey,
    task,
  );

  return task;
}

async function requestSignedUrl(
  ref: StorageRef,
):
  Promise<string> {
  if (
    !supabaseUrl ||
    !supabaseKey ||
    !ref.bucket ||
    !ref.path ||
    typeof window ===
      'undefined'
  ) {
    return '';
  }

  const cacheKey =
    `${ref.bucket}/${ref.path}`;

  const cached =
    signedCache.get(
      cacheKey,
    );

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.url;
  }

  const running =
    signedInFlight.get(
      cacheKey,
    );

  if (
    running
  ) {
    return running;
  }

  const task =
    (async () => {
      let session =
        await refreshStoredSession();

      if (
        !session?.access_token
      ) {
        session =
          getStoredSession();
      }

      if (
        !session?.access_token
      ) {
        return '';
      }

      const endpoint =
        `${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(
          ref.bucket,
        )}/${encodedStoragePath(
          ref.path,
        )}`;

      const send =
        async (
          token: string,
        ) =>
          fetch(
            endpoint,
            {
              method:
                'POST',

              headers: {
                apikey:
                  supabaseKey,

                Authorization:
                  `Bearer ${token}`,

                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  {
                    expiresIn:
                      SIGNED_URL_TTL_SECONDS,
                  },
                ),
            },
          );

      let response =
        await send(
          session.access_token,
        );

      if (
        response.status ===
        401
      ) {
        const refreshed =
          await refreshStoredSession(
            true,
          );

        if (
          refreshed?.access_token
        ) {
          response =
            await send(
              refreshed.access_token,
            );
        }
      }

      if (
        !response.ok
      ) {
        return '';
      }

      const payload =
        await response
          .json()
          .catch(
            () =>
              ({} as Row),
          ) as Row;

      const raw =
        typeof payload.signedURL ===
        'string'
          ? payload.signedURL
          : typeof payload.signedUrl ===
              'string'
            ? payload.signedUrl
            : typeof payload.signed_url ===
                'string'
              ? payload.signed_url
              : '';

      if (
        !raw
      ) {
        return '';
      }

      let signed =
        raw;

      if (
        raw.startsWith(
          '/storage/v1/',
        )
      ) {
        signed =
          `${supabaseUrl}${raw}`;
      } else if (
        raw.startsWith(
          '/object/',
        )
      ) {
        signed =
          `${supabaseUrl}/storage/v1${raw}`;
      } else if (
        raw.startsWith(
          '/',
        )
      ) {
        signed =
          `${supabaseUrl}${raw}`;
      }

      if (
        !/^https?:/i.test(
          signed,
        )
      ) {
        return '';
      }

      signedCache.set(
        cacheKey,
        {
          url:
            signed,

          expiresAt:
            Date.now() +
            SIGNED_URL_REUSE_MS,
        },
      );

      return signed;
    })().finally(
      () =>
        signedInFlight.delete(
          cacheKey,
        ),
    );

  signedInFlight.set(
    cacheKey,
    task,
  );

  return task;
}

export function commerceMediaList(
  ...mediaRows: Row[]
):
  string[] {
  const seen =
    new Set<string>();

  const result:
    string[] = [];

  for (
    const row of
    mediaRows
  ) {
    if (
      !row ||
      typeof row !==
        'object'
    ) {
      continue;
    }

    for (
      const item of
      collectRawMedia(
        row,
      )
    ) {
      for (
        const resolved of
        syncMediaCandidates(
          item,
        )
      ) {
        if (
          resolved &&
          !seen.has(
            resolved,
          )
        ) {
          seen.add(
            resolved,
          );

          result.push(
            resolved,
          );
        }
      }
    }
  }

  return result;
}

export async function resolveCommerceMediaList(
  ...mediaRows: Row[]
):
  Promise<
    string[]
  > {
  const raw:
    string[] = [];

  const rawSeen =
    new Set<string>();

  for (
    const row of
    mediaRows
  ) {
    if (
      !row ||
      typeof row !==
        'object'
    ) {
      continue;
    }

    for (
      const item of
      collectRawMedia(
        row,
      )
    ) {
      if (
        !rawSeen.has(
          item,
        )
      ) {
        rawSeen.add(
          item,
        );

        raw.push(
          item,
        );
      }
    }
  }

  const candidates =
    raw.flatMap(
      mediaCandidateRefs,
    );

  const signedByIndex =
    await Promise.all(
      candidates.map(
        async (
          candidate,
        ) =>
          candidate.kind ===
          'storage'
            ? requestSignedUrl(
                candidate.ref,
              )
            : '',
      ),
    );

  const privateByIndex =
    await Promise.all(
      candidates.map(
        async (
          candidate,
          index,
        ) =>
          candidate.kind ===
            'storage' &&
          !signedByIndex[
            index
          ]
            ? requestAuthenticatedObjectUrl(
                candidate.ref,
              )
            : '',
      ),
    );

  const seen =
    new Set<string>();

  const result:
    string[] = [];

  const add =
    (
      url: string,
    ) => {
      if (
        url &&
        !seen.has(
          url,
        )
      ) {
        seen.add(
          url,
        );

        result.push(
          url,
        );
      }
    };

  candidates.forEach(
    (
      candidate,
      index,
    ) => {
      if (
        candidate.kind ===
        'direct'
      ) {
        add(
          candidate.url,
        );

        return;
      }

      const {
        ref,
      } =
        candidate;

      /*
       * Private commerce media:
       * Signed URL เป็นตัวเลือกแรก
       */
      add(
        signedByIndex[
          index
        ],
      );

      /*
       * ถ้า sign endpoint ไม่ผ่าน
       * ให้ลอง authenticated object
       */
      add(
        privateByIndex[
          index
        ],
      );

      if (
        ref.originalMode ===
          'public' &&
        ref.original
      ) {
        add(
          ref.original,
        );
      }

      /*
       * Public fallback
       */
      add(
        publicStorageUrl(
          ref.bucket,
          ref.path,
        ),
      );

      if (
        ref.original &&
        ref.originalMode !==
          'public'
      ) {
        add(
          ref.original,
        );
      }
    },
  );

  return result;
}

export function commerceMedia(
  ...mediaRows: Row[]
) {
  return (
    commerceMediaList(
      ...mediaRows
    )[0] ??
    ''
  );
}

export async function resolveCommerceMedia(
  ...mediaRows: Row[]
) {
  return (
    (
      await resolveCommerceMediaList(
        ...mediaRows
      )
    )[0] ??
    ''
  );
}

export function commerceBackgroundImage(
  urls: string[],
) {
  return urls
    .filter(
      Boolean,
    )
    .map(
      (
        url,
      ) =>
        `url(${JSON.stringify(
          url,
        )})`,
    )
    .join(
      ', ',
    );
}
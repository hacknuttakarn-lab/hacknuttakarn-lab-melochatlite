'use client';

import {
  getCurrentUser,
  invokeEdgeFunction,
  restSelect,
  rpcRequest,
  uploadStorageObject,
} from '@/lib/supabase/browser';

export type PartnerPermission =
  | 'services'
  | 'sales'
  | 'bookings'
  | 'coupons'
  | 'chat'
  | 'finance'
  | 'analytics'
  | 'reports'
  | 'edit_store'
  | 'manage_staff';

export type PartnerRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'staff';

export type PartnerBusinessAccess = {
  businessId: string;
  ownerId: string;
  displayName: string;
  businessType: string;
  logoStoragePath: string | null;
  role: PartnerRole;
  permissions: PartnerPermission[];
  isOwner: boolean;
  staffMemberId: string | null;
  storeNo: number | null;
  isPrimaryStore: boolean;
  ownerBusinessCount: number;
  partnerCode: string;
};

export type PartnerDashboardSummary = {
  serviceCount: number;
  pendingBookings: number;
  activeCoupons: number;
  paidOrders: number;
  grossSales: number;
  averageRating: number;
  reviewCount: number;
};

export type PartnerActivityItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  amount: number | null;
  currency: string;
  status: string;
  createdAt: string;
};

export type PartnerService = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number | null;
  currency: string;
  priceUnit: string;
  detailType: string;
  active: boolean;
  imagePath: string;
};

export type PartnerStaffMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: Exclude<
    PartnerRole,
    'owner'
  >;
  permissions: PartnerPermission[];
  active: boolean;
};

export type PartnerStaffCandidate = {
  userId: string;
  email: string;
  displayName: string;
  photoPath: string;
  country: string;
  nationality: string;
};

export type PartnerTransaction = {
  id: string;

  kind:
    | 'booking'
    | 'order'
    | 'coupon';

  title: string;

  customerName: string;

  customerUserId: string;

  customerPhotoUrl: string;

  customerCountry: string;

  customerNationality: string;

  status: string;

  amount: number | null;

  currency: string;

  createdAt: string;

  scheduledAt: string;

  referenceCode: string;

  guestCount: number | null;
};

export type PartnerWalletSummary = {
  availableBalance: number;
  pendingBalance: number;
  lifetimeGross: number;
  withdrawnTotal: number;
  currency: string;
};

type Row =
  Record<
    string,
    unknown
  >;

const PERMISSIONS:
  PartnerPermission[] = [
    'services',
    'sales',
    'bookings',
    'coupons',
    'chat',
    'finance',
    'analytics',
    'reports',
    'edit_store',
    'manage_staff',
  ];

const MODE_KEY =
  'melo.partner.activeMode.v1';

const BUSINESS_KEY =
  'melo.partner.activeBusinessId.v1';

function rows(
  value: unknown,
): Row[] {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value.filter(
      (
        item,
      ): item is Row =>
        Boolean(
          item,
        ) &&
        typeof item ===
          'object',
    );
  }

  if (
    value &&
    typeof value ===
      'object'
  ) {
    return [
      value as Row,
    ];
  }

  return [];
}

function text(
  row:
    | Row
    | undefined
    | null,
  ...keys: string[]
) {
  for (
    const key of
    keys
  ) {
    const value =
      row?.[
        key
      ];

    if (
      value !==
        null &&
      value !==
        undefined &&
      String(
        value,
      ).trim()
    ) {
      return String(
        value,
      ).trim();
    }
  }

  return '';
}

function num(
  row:
    | Row
    | undefined
    | null,
  ...keys: string[]
) {
  for (
    const key of
    keys
  ) {
    const value =
      Number(
        row?.[
          key
        ],
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

function bool(
  row:
    | Row
    | undefined
    | null,
  ...keys: string[]
) {
  for (
    const key of
    keys
  ) {
    const value =
      row?.[
        key
      ];

    if (
      value ===
        true ||
      value ===
        'true' ||
      value ===
        1 ||
      value ===
        '1'
    ) {
      return true;
    }

    if (
      value ===
        false ||
      value ===
        'false' ||
      value ===
        0 ||
      value ===
        '0'
    ) {
      return false;
    }
  }

  return false;
}

function normalizePermissions(
  value: unknown,
):
  PartnerPermission[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  const allowed =
    new Set(
      PERMISSIONS,
    );

  return value
    .map(
      String,
    )
    .filter(
      (
        item,
      ): item is PartnerPermission =>
        allowed.has(
          item as PartnerPermission,
        ),
    );
}

function missingRpc(
  error:
    | string
    | null
    | undefined,
) {
  const normalized =
    String(
      error ||
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

function authRequired(
  error:
    | string
    | null
    | undefined,
) {
  const normalized =
    String(
      error ||
        '',
    ).toLowerCase();

  return (
    normalized.includes(
      'authentication required',
    ) ||
    normalized.includes(
      'jwt expired',
    ) ||
    normalized.includes(
      'invalid jwt',
    ) ||
    normalized.includes(
      'not authenticated',
    ) ||
    normalized.includes(
      'unauthorized',
    )
  );
}

function ownerCode(
  ownerId: string,
) {
  const compact =
    ownerId
      .replace(
        /-/g,
        '',
      )
      .slice(
        0,
        8,
      )
      .toUpperCase();

  return compact
    ? `PRT-${compact}`
    : 'PRT-MELO';
}

function storageKey(
  base: string,
  userId: string,
) {
  return `${base}:${
    userId ||
    'guest'
  }`;
}

async function currentKeys() {
  const user =
    await getCurrentUser();

  return {
    mode:
      storageKey(
        MODE_KEY,
        user?.id ||
          'guest',
      ),

    business:
      storageKey(
        BUSINESS_KEY,
        user?.id ||
          'guest',
      ),
  };
}

function mapAccess(
  row: Row,
):
  | PartnerBusinessAccess
  | null {
  const businessId =
    text(
      row,
      'business_id',
      'id',
    );

  if (
    !businessId
  ) {
    return null;
  }

  const ownerId =
    text(
      row,
      'owner_id',
    );

  const raw =
    text(
      row,
      'role',
    ) ||
    'staff';

  const role =
    (
      [
        'owner',
        'admin',
        'manager',
        'staff',
      ].includes(
        raw,
      )
        ? raw
        : 'staff'
    ) as PartnerRole;

  return {
    businessId,

    ownerId,

    displayName:
      text(
        row,
        'display_name',
        'business_name',
        'name',
      ) ||
      'Melo Partner',

    businessType:
      text(
        row,
        'business_type',
      ),

    logoStoragePath:
      text(
        row,
        'logo_storage_path',
        'logo_path',
      ) ||
      null,

    role,

    permissions:
      role ===
      'owner'
        ? [
            ...PERMISSIONS,
          ]
        : normalizePermissions(
            row.permissions,
          ),

    isOwner:
      bool(
        row,
        'is_owner',
      ) ||
      role ===
        'owner',

    staffMemberId:
      text(
        row,
        'staff_member_id',
      ) ||
      null,

    storeNo:
      num(
        row,
        'store_no',
      ) ||
      null,

    isPrimaryStore:
      bool(
        row,
        'is_primary',
        'is_primary_store',
      ),

    ownerBusinessCount:
      num(
        row,
        'owner_business_count',
      ) ||
      1,

    partnerCode:
      text(
        row,
        'partner_code',
      ) ||
      ownerCode(
        ownerId,
      ),
  };
}

export function hasPartnerPermission(
  access:
    | PartnerBusinessAccess
    | null
    | undefined,
  permission:
    PartnerPermission,
) {
  return Boolean(
    access &&
      (
        access.isOwner ||
        access.permissions.includes(
          permission,
        )
      ),
  );
}

export async function listMyPartnerBusinesses():
  Promise<
    PartnerBusinessAccess[]
  > {
  const [
    ownedOrStaff,
    ownedLegacy,
  ] =
    await Promise.all(
      [
        rpcRequest<
          Row[]
        >(
          'get_my_partner_businesses',
        ),

        rpcRequest<
          Row[]
        >(
          'get_my_owned_partner_businesses',
        ),
      ],
    );

  const map =
    new Map<
      string,
      PartnerBusinessAccess
    >();

  rows(
    ownedOrStaff.data,
  ).forEach(
    (
      row,
    ) => {
      const access =
        mapAccess(
          row,
        );

      if (
        access
      ) {
        map.set(
          access.businessId,
          access,
        );
      }
    },
  );

  rows(
    ownedLegacy.data,
  ).forEach(
    (
      row,
    ) => {
      const access =
        mapAccess(
          row,
        );

      if (
        access
      ) {
        map.set(
          access.businessId,
          access,
        );
      }
    },
  );

  if (
    !map.size &&
    missingRpc(
      ownedOrStaff.error,
    ) &&
    missingRpc(
      ownedLegacy.error,
    )
  ) {
    const legacy =
      await rpcRequest<
        Row[]
      >(
        'get_my_business_account',
      );

    const row =
      rows(
        legacy.data,
      )[0];

    if (
      row
    ) {
      const ownerId =
        text(
          row,
          'owner_id',
        );

      const id =
        text(
          row,
          'id',
          'business_id',
        );

      if (
        id
      ) {
        map.set(
          id,
          {
            businessId:
              id,

            ownerId,

            displayName:
              text(
                row,
                'display_name',
              ) ||
              'Melo Partner',

            businessType:
              text(
                row,
                'business_type',
              ),

            logoStoragePath:
              text(
                row,
                'logo_storage_path',
              ) ||
              null,

            role:
              'owner',

            permissions:
              [
                ...PERMISSIONS,
              ],

            isOwner:
              true,

            staffMemberId:
              null,

            storeNo:
              1,

            isPrimaryStore:
              true,

            ownerBusinessCount:
              1,

            partnerCode:
              ownerCode(
                ownerId,
              ),
          },
        );
      }
    }
  }

  return [
    ...map.values(),
  ].sort(
    (
      left,
      right,
    ) =>
      left.isOwner ===
      right.isOwner
        ? (
            (
              left.storeNo ??
              999
            ) -
              (
                right.storeNo ??
                999
              ) ||
            left.displayName.localeCompare(
              right.displayName,
            )
          )
        : left.isOwner
          ? -1
          : 1,
  );
}

export async function getStoredPartnerBusinessId() {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }

  const keys =
    await currentKeys();

  return (
    localStorage
      .getItem(
        keys.business,
      )
      ?.trim() ||
    null
  );
}

export async function getActivePartnerBusiness() {
  const list =
    await listMyPartnerBusinesses();

  if (
    !list.length
  ) {
    return null;
  }

  const id =
    await getStoredPartnerBusinessId();

  return (
    list.find(
      (
        item,
      ) =>
        item.businessId ===
        id,
    ) ||
    list[0]
  );
}

async function persist(
  mode:
    | 'user'
    | 'partner',
  businessId?:
    | string
    | null,
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  const keys =
    await currentKeys();

  localStorage.setItem(
    keys.mode,
    mode,
  );

  if (
    mode ===
      'partner' &&
    businessId
  ) {
    localStorage.setItem(
      keys.business,
      businessId,
    );
  }

  if (
    mode ===
    'user'
  ) {
    localStorage.removeItem(
      keys.business,
    );
  }

  window.dispatchEvent(
    new CustomEvent(
      'melo-partner-mode-changed',
      {
        detail: {
          mode,

          businessId:
            businessId ||
            null,
        },
      },
    ),
  );
}

export async function setActivePartnerBusiness(
  businessId: string,
) {
  const list =
    await listMyPartnerBusinesses();

  const item =
    list.find(
      (
        value,
      ) =>
        value.businessId ===
        businessId,
    );

  if (
    !item
  ) {
    throw new Error(
      'You do not have access to this Partner business',
    );
  }

  const result =
    await rpcRequest(
      'set_my_partner_mode',
      {
        p_mode:
          'partner',

        p_business_id:
          item.businessId,
      },
    );

  if (
    result.error &&
    !missingRpc(
      result.error,
    )
  ) {
    throw new Error(
      result.error,
    );
  }

  await persist(
    'partner',
    item.businessId,
  );

  return item;
}

export async function switchToPartnerMode(
  businessId?:
    | string
    | null,
) {
  const list =
    await listMyPartnerBusinesses();

  if (
    !list.length
  ) {
    return null;
  }

  const stored =
    businessId ||
    await getStoredPartnerBusinessId();

  const selected =
    list.find(
      (
        item,
      ) =>
        item.businessId ===
        stored,
    ) ||
    list[0];

  return setActivePartnerBusiness(
    selected.businessId,
  );
}

export async function switchToUserMode() {
  const result =
    await rpcRequest(
      'set_my_partner_mode',
      {
        p_mode:
          'user',

        p_business_id:
          null,
      },
    );

  if (
    result.error &&
    !missingRpc(
      result.error,
    ) &&
    !authRequired(
      result.error,
    )
  ) {
    throw new Error(
      result.error,
    );
  }

  await persist(
    'user',
  );
}

export async function getPartnerDashboardSummary(
  businessId: string,
):
  Promise<
    PartnerDashboardSummary
  > {
  const result =
    await rpcRequest<
      Row[]
    >(
      'get_partner_dashboard_summary',
      {
        p_business_id:
          businessId,
      },
    );

  const row =
    rows(
      result.data,
    )[0] ||
    {};

  if (
    result.error &&
    !missingRpc(
      result.error,
    )
  ) {
    throw new Error(
      result.error,
    );
  }

  return {
    serviceCount:
      num(
        row,
        'service_count',
      ),

    pendingBookings:
      num(
        row,
        'pending_bookings',
      ),

    activeCoupons:
      num(
        row,
        'active_coupons',
      ),

    paidOrders:
      num(
        row,
        'paid_orders',
      ),

    grossSales:
      num(
        row,
        'gross_sales',
      ),

    averageRating:
      num(
        row,
        'average_rating',
      ),

    reviewCount:
      num(
        row,
        'review_count',
      ),
  };
}

export async function getPartnerRecentActivity(
  businessId: string,
):
  Promise<
    PartnerActivityItem[]
  > {
  const result =
    await rpcRequest<
      Row[]
    >(
      'get_partner_recent_activity',
      {
        p_business_id:
          businessId,
      },
    );

  if (
    result.error &&
    missingRpc(
      result.error,
    )
  ) {
    return [];
  }

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
    (
      row,
      index,
    ) => ({
      id:
        text(
          row,
          'id',
        ) ||
        String(
          index,
        ),

      type:
        text(
          row,
          'type',
        ) ||
        'other',

      title:
        text(
          row,
          'title',
        ),

      subtitle:
        text(
          row,
          'subtitle',
        ),

      amount:
        row.amount ==
        null
          ? null
          : num(
              row,
              'amount',
            ),

      currency:
        text(
          row,
          'currency',
        ) ||
        'THB',

      status:
        text(
          row,
          'status',
        ),

      createdAt:
        text(
          row,
          'created_at',
        ),
    }),
  );
}

export async function getPartnerBusiness(
  businessId: string,
) {
  const result =
    await rpcRequest<
      Row[]
    >(
      'melo_business_for_viewer',
      {
        p_business_id:
          businessId,
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
    rows(
      result.data,
    )[0] ||
    null
  );
}

/* =========================================================
 * PARTNER SERVICES
 * =========================================================
 *
 * ข้อมูลทั่วไป:
 * get_partner_business_services
 *
 * รูปสินค้า:
 * get_partner_service_media
 *
 * Database relation:
 *
 * business_services.id
 *       ↓
 * business_service_sales_settings.service_id
 *       ↓
 * image_storage_path
 *       ↓
 * Supabase Storage bucket: business-media
 */

function normalizeServiceMediaPath(
  value: string,
) {
  const clean =
    value
      .trim()
      .replace(
        /\\/g,
        '/',
      );

  if (
    !clean
  ) {
    return '';
  }

  if (
    /^https?:\/\//i.test(
      clean,
    ) ||
    clean.startsWith(
      'blob:',
    ) ||
    clean.startsWith(
      'data:',
    ) ||
    clean.startsWith(
      'supabase://',
    )
  ) {
    return clean;
  }

  if (
    clean.startsWith(
      'business-media/',
    )
  ) {
    return `supabase://${clean}`;
  }

  return `supabase://business-media/${clean.replace(
    /^\/+/,
    '',
  )}`;
}

async function loadPartnerServiceMedia(
  businessId: string,
) {
  const media =
    await rpcRequest<
      Row[]
    >(
      'get_partner_service_media',
      {
        p_business_id:
          businessId,
      },
    );

  /*
   * หาก RPC ยังไม่ติด schema cache
   * ไม่ทำให้หน้าสินค้าทั้งหน้าพัง
   */
  if (
    media.error
  ) {
    console.warn(
      '[Melo Partner] get_partner_service_media:',
      media.error,
    );

    return new Map<
      string,
      string
    >();
  }

  const map =
    new Map<
      string,
      string
    >();

  for (
    const row of
    rows(
      media.data,
    )
  ) {
    const serviceId =
      text(
        row,
        'service_id',
      );

    const imagePath =
      text(
        row,
        'image_storage_path',
      );

    if (
      !serviceId ||
      !imagePath
    ) {
      continue;
    }

    map.set(
      serviceId,
      normalizeServiceMediaPath(
        imagePath,
      ),
    );
  }

  return map;
}

export async function listPartnerServices(
  businessId: string,
):
  Promise<
    PartnerService[]
  > {
  let result =
    await rpcRequest<
      Row[]
    >(
      'get_partner_business_services',
      {
        p_business_id:
          businessId,
      },
    );

  /*
   * Compatibility fallback สำหรับ Melo deployment รุ่นเก่า
   */
  if (
    result.error &&
    missingRpc(
      result.error,
    )
  ) {
    result =
      await restSelect<
        Row[]
      >(
        'business_services',
        `select=*&business_id=eq.${encodeURIComponent(
          businessId,
        )}&order=updated_at.desc`,
      );
  }

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  const serviceRows =
    rows(
      result.data,
    );

  /*
   * โหลดรูปผ่าน Security Definer RPC
   * ไม่อ่าน business_service_sales_settings จาก Browser โดยตรง
   */
  const mediaByServiceId =
    await loadPartnerServiceMedia(
      businessId,
    );

  return serviceRows.map(
    (
      row,
    ) => {
      const id =
        text(
          row,
          'id',
          'service_id',
        );

      const rpcImage =
        mediaByServiceId.get(
          id,
        ) ||
        '';

      /*
       * fallback เผื่อรายการเก่าเคยเก็บรูปใน business_services
       */
      const legacyImage =
        normalizeServiceMediaPath(
          text(
            row,
            'image_storage_path',
            'image_path',
          ),
        );

      return {
        id,

        title:
          text(
            row,
            'title',
          ),

        description:
          text(
            row,
            'description',
          ),

        category:
          text(
            row,
            'category',
          ),

        price:
          row.price_from ==
          null
            ? null
            : num(
                row,
                'price_from',
              ),

        currency:
          text(
            row,
            'currency',
          ) ||
          'THB',

        priceUnit:
          text(
            row,
            'price_unit',
          ),

        detailType:
          text(
            row,
            'detail_type',
          ) ||
          'standard',

        active:
          Object.prototype.hasOwnProperty.call(
            row,
            'is_active',
          )
            ? bool(
                row,
                'is_active',
              )
            : true,

        /*
         * รูปจาก Sales Settings เป็น source หลัก
         */
        imagePath:
          rpcImage ||
          legacyImage,
      };
    },
  );
}

export async function setPartnerServiceActive(
  businessId: string,
  serviceId: string,
  active: boolean,
) {
  const result =
    await rpcRequest(
      'partner_set_business_service_active',
      {
        p_business_id:
          businessId,

        p_service_id:
          serviceId,

        p_is_active:
          active,
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

export const PARTNER_PERMISSION_KEYS:
  readonly PartnerPermission[] =
  PERMISSIONS;

export const STAFF_LOCKED_PERMISSIONS:
  readonly PartnerPermission[] = [
    'finance',
    'analytics',
    'reports',
    'edit_store',
    'manage_staff',
  ];

export function isPartnerPermissionLockedForRole(
  role: Exclude<PartnerRole, 'owner'>,
  permission: PartnerPermission,
) {
  return role === 'staff' && STAFF_LOCKED_PERMISSIONS.includes(permission);
}

export function sanitizePartnerPermissionsForRole(
  role: Exclude<PartnerRole, 'owner'>,
  permissions: PartnerPermission[],
): PartnerPermission[] {
  const normalized = normalizePermissions(permissions);
  if (role !== 'staff') return normalized;
  const locked = new Set<PartnerPermission>(STAFF_LOCKED_PERMISSIONS);
  return normalized.filter((permission) => !locked.has(permission));
}

export async function listPartnerStaff(
  businessId: string,
): Promise<PartnerStaffMember[]> {
  const result = await rpcRequest<Row[]>(
    'get_partner_staff',
    { p_business_id: businessId },
  );

  if (result.error && missingRpc(result.error)) return [];
  if (result.error) throw new Error(result.error);

  return rows(result.data).map((row) => {
    const roleValue = text(row, 'role') || 'staff';
    const role = (
      ['admin', 'manager', 'staff'].includes(roleValue)
        ? roleValue
        : 'staff'
    ) as Exclude<PartnerRole, 'owner'>;

    return {
      id: text(row, 'id'),
      userId: text(row, 'user_id'),
      email: text(row, 'email'),
      displayName:
        text(row, 'display_name') ||
        text(row, 'email') ||
        'Melo User',
      role,
      permissions: sanitizePartnerPermissionsForRole(
        role,
        normalizePermissions(row.permissions),
      ),
      active:
        !Object.prototype.hasOwnProperty.call(row, 'is_active') ||
        bool(row, 'is_active'),
    };
  });
}

export async function searchPartnerStaffCandidates(
  businessId: string,
  query: string,
): Promise<PartnerStaffCandidate[]> {
  const clean = query.trim().toLowerCase();
  if (!businessId || clean.length < 2) return [];

  const result = await rpcRequest<Row[]>(
    'search_partner_staff_candidates',
    {
      p_business_id: businessId,
      p_query: clean,
    },
  );

  if (result.error) throw new Error(result.error);

  return rows(result.data).map((row) => ({
    userId: text(row, 'user_id'),
    email: text(row, 'email'),
    displayName:
      text(row, 'display_name') ||
      text(row, 'email') ||
      'Melo User',
    photoPath: text(row, 'photo_path'),
    country: text(row, 'country'),
    nationality: text(row, 'nationality'),
  })).filter((item) => Boolean(item.userId && item.email));
}

export function defaultPartnerPermissions(
  role: Exclude<PartnerRole, 'owner'>,
): PartnerPermission[] {
  const defaults: Record<
    Exclude<PartnerRole, 'owner'>,
    PartnerPermission[]
  > = {
    admin: [...PERMISSIONS],
    manager: [
      'services',
      'sales',
      'bookings',
      'coupons',
      'chat',
      'analytics',
      'reports',
    ],
    staff: [
      'sales',
      'bookings',
      'coupons',
      'chat',
    ],
  };

  return [...defaults[role]];
}

export async function savePartnerStaff(
  businessId: string,
  email: string,
  role: Exclude<PartnerRole, 'owner'>,
  permissions?: PartnerPermission[],
) {
  const clean = email.trim().toLowerCase();
  if (!clean) throw new Error('Melo email is required');

  const selected = sanitizePartnerPermissionsForRole(
    role,
    permissions ?? defaultPartnerPermissions(role),
  );

  const result = await rpcRequest(
    'upsert_partner_staff_by_email',
    {
      p_business_id: businessId,
      p_email: clean,
      p_role: role,
      p_permissions: selected,
    },
  );

  if (result.error) throw new Error(result.error);
}

export async function updatePartnerStaff(input: {
  businessId: string;
  staffMemberId: string;
  role: Exclude<PartnerRole, 'owner'>;
  permissions: PartnerPermission[];
  isActive: boolean;
}) {
  const result = await rpcRequest(
    'update_partner_staff_member',
    {
      p_business_id: input.businessId,
      p_staff_member_id: input.staffMemberId,
      p_role: input.role,
      p_permissions: sanitizePartnerPermissionsForRole(
        input.role,
        input.permissions,
      ),
      p_is_active: input.isActive,
    },
  );

  if (result.error) throw new Error(result.error);
}

export async function addPartnerStaff(
  businessId: string,
  email: string,
  role: Exclude<PartnerRole, 'owner'>,
) {
  return savePartnerStaff(
    businessId,
    email,
    role,
    defaultPartnerPermissions(role),
  );
}

export async function removePartnerStaff(
  businessId: string,
  id: string,
) {
  const result = await rpcRequest(
    'remove_partner_staff_member',
    {
      p_business_id: businessId,
      p_staff_member_id: id,
    },
  );

  if (result.error) throw new Error(result.error);
}

function transactionRows(
  value: unknown,
  kind:
    PartnerTransaction[
      'kind'
    ],
):
  PartnerTransaction[] {
  return rows(
    value,
  ).map(
    (
      row,
      index,
    ) => {
      const id =
        text(
          row,
          'id',
        ) ||
        `${kind}-${index}`;

      const guestRaw =
        num(
          row,
          'guest_count',
          'party_size',
          'people_count',
          'quantity',
        );

      return {
        id,

        kind,

        title:
          text(
            row,
            'service_title',
            'offer_title',
            'product_title',
            'coupon_title',
            'title',
            'business_name',
          ) ||
          kind,

        customerName:
          text(
            row,
            'customer_name',
            'display_name',
            'user_name',
            'customer_display_name',
            'email',
          ) ||
          'Melo member',

        customerUserId:
          text(
            row,
            'customer_user_id',
            'user_id',
            'customer_id',
            'buyer_id',
            'booked_by',
            'claimer_id',
            'claimant_id',
            'member_id',
          ),

        customerPhotoUrl:
          text(
            row,
            'customer_photo_url',
            'photo_url',
            'avatar_url',
            'profile_image_url',
            'customer_photo_path',
            'photo_path',
            'profile_image_path',
          ),

        customerCountry:
          text(
            row,
            'customer_country',
            'country',
          ),

        customerNationality:
          text(
            row,
            'customer_nationality',
            'nationality',
          ),

        status:
          text(
            row,
            'status',
          ) ||
          'pending',

        amount:
          row.total_amount ==
            null &&
          row.amount ==
            null &&
          row.price ==
            null
            ? null
            : num(
                row,
                'total_amount',
                'amount',
                'price',
              ),

        currency:
          text(
            row,
            'currency',
          ) ||
          'THB',

        createdAt:
          text(
            row,
            'created_at',
            'requested_at',
            'claimed_at',
            'ordered_at',
            'booked_at',
          ),

        scheduledAt:
          text(
            row,
            'scheduled_at',
            'booking_at',
            'service_at',
            'start_at',
            'appointment_at',
            'reserved_at',
          ),

        referenceCode:
          text(
            row,
            'reference_code',
            'booking_code',
            'order_code',
            'claim_code',
            'coupon_code',
            'transaction_code',
            'code',
          ) ||
          `MB-${id
            .replace(
              /[^a-zA-Z0-9]/g,
              '',
            )
            .slice(
              0,
              8,
            )
            .toUpperCase()}`,

        guestCount:
          guestRaw >
          0
            ? guestRaw
            : null,
      };
    },
  );
}

export async function listPartnerTransactions(
  businessId: string,
):
  Promise<
    PartnerTransaction[]
  > {
  const [
    bookings,
    offers,
    orders,
    coupons,
  ] =
    await Promise.all(
      [
        rpcRequest<
          Row[]
        >(
          'get_my_business_bookings',
        ),

        rpcRequest<
          Row[]
        >(
          'get_partner_booking_offers',
          {
            p_business_id:
              businessId,
          },
        ),

        rpcRequest<
          Row[]
        >(
          'get_partner_service_orders',
          {
            p_business_id:
              businessId,
          },
        ),

        rpcRequest<
          Row[]
        >(
          'get_my_business_coupon_claims',
        ),
      ],
    );

  const all = [
    ...transactionRows(
      bookings.data,
      'booking',
    ),

    ...transactionRows(
      offers.data,
      'booking',
    ),

    ...transactionRows(
      orders.data,
      'order',
    ),

    ...transactionRows(
      coupons.data,
      'coupon',
    ),
  ];

  return all
    .sort(
      (
        left,
        right,
      ) =>
        new Date(
          right.createdAt ||
            0,
        ).getTime() -
        new Date(
          left.createdAt ||
            0,
        ).getTime(),
    )
    .slice(
      0,
      250,
    );
}

export async function getPartnerWallet(
  businessId: string,
):
  Promise<
    PartnerWalletSummary
  > {
  const result =
    await rpcRequest<
      Row[]
    >(
      'get_my_partner_wallet_summary_v2',
      {
        p_business_id:
          businessId,
      },
    );

  const row =
    rows(
      result.data,
    )[0] ||
    {};

  return {
    availableBalance:
      num(
        row,
        'available_balance',
        'available_amount',
        'balance',
      ),

    pendingBalance:
      num(
        row,
        'pending_balance',
        'pending_amount',
      ),

    lifetimeGross:
      num(
        row,
        'lifetime_gross',
        'gross_sales',
        'total_received',
      ),

    withdrawnTotal:
      num(
        row,
        'withdrawn_total',
        'total_withdrawn',
      ),

    currency:
      text(
        row,
        'currency',
      ) ||
      'THB',
  };
}

export async function savePartnerService(
  input: {
    businessId: string;

    serviceId?:
      | string
      | null;

    category: string;

    title: string;

    description: string;

    price:
      | number
      | null;

    currency: string;

    priceUnit: string;

    detailType: string;
  },
) {
  const result =
    await rpcRequest<
      string
    >(
      'partner_save_business_service',
      {
        p_business_id:
          input.businessId,

        p_service_id:
          input.serviceId ??
          null,

        p_category:
          input.category.trim(),

        p_title:
          input.title.trim(),

        p_description:
          input.description.trim(),

        p_price_from:
          input.price,

        p_currency:
          input.currency,

        p_price_unit:
          input.priceUnit.trim(),

        p_detail_type:
          input.detailType,

        p_original_price:
          null,

        p_duration_minutes:
          null,

        p_min_guests:
          null,

        p_max_guests:
          null,

        p_includes_text:
          '',

        p_excludes_text:
          '',

        p_valid_from:
          null,

        p_valid_until:
          null,

        p_melo_member_only:
          false,

        p_stock_limit:
          null,
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  return String(
    result.data ||
      '',
  );
}

export async function deletePartnerService(
  businessId: string,
  serviceId: string,
) {
  const result =
    await rpcRequest(
      'partner_delete_business_service',
      {
        p_business_id:
          businessId,

        p_service_id:
          serviceId,
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


export type PartnerBusinessOpeningDay =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

export type PartnerBusinessOpeningHours = Record<
  PartnerBusinessOpeningDay,
  {
    closed: boolean;
    open: string;
    close: string;
  }
>;

export type PartnerBusinessProfileExtras = {
  secondaryCategories: string[];
  subcategory: string;
  serviceArea: string;
  serviceLanguages: string[];
  amenities: string[];
  openingHours: PartnerBusinessOpeningHours;
  hoursConfigured: boolean;
  bookingMode:
    | 'chat'
    | 'request'
    | 'external'
    | 'walk_in';
  bookingUrl: string;
  line: string;
  facebook: string;
  instagram: string;
  whatsapp: string;
};

export type PartnerBusinessVerificationDetails = {
  entityType:
    | 'individual'
    | 'legal_entity'
    | null;
  registrationNumber: string;
  taxId: string;
  contactPersonName: string;
  contactPersonPhone: string;
  registrationDocumentPath: string | null;
  taxDocumentPath: string | null;
};

export type PartnerNearbyPlace = {
  id: string;
  name: string;
  category: string;
  primaryType: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

const DEFAULT_PARTNER_OPENING_HOURS: PartnerBusinessOpeningHours = {
  mon: {
    closed: false,
    open: '09:00',
    close: '18:00',
  },
  tue: {
    closed: false,
    open: '09:00',
    close: '18:00',
  },
  wed: {
    closed: false,
    open: '09:00',
    close: '18:00',
  },
  thu: {
    closed: false,
    open: '09:00',
    close: '18:00',
  },
  fri: {
    closed: false,
    open: '09:00',
    close: '18:00',
  },
  sat: {
    closed: false,
    open: '09:00',
    close: '18:00',
  },
  sun: {
    closed: false,
    open: '09:00',
    close: '18:00',
  },
};

export const EMPTY_PARTNER_BUSINESS_PROFILE_EXTRAS: PartnerBusinessProfileExtras = {
  secondaryCategories: [],
  subcategory: '',
  serviceArea: '',
  serviceLanguages: [],
  amenities: [],
  openingHours: DEFAULT_PARTNER_OPENING_HOURS,
  hoursConfigured: false,
  bookingMode: 'chat',
  bookingUrl: '',
  line: '',
  facebook: '',
  instagram: '',
  whatsapp: '',
};

export const EMPTY_PARTNER_BUSINESS_VERIFICATION_DETAILS: PartnerBusinessVerificationDetails = {
  entityType: null,
  registrationNumber: '',
  taxId: '',
  contactPersonName: '',
  contactPersonPhone: '',
  registrationDocumentPath: null,
  taxDocumentPath: null,
};

function stringList(
  value: unknown,
) {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value
      .map(
        String,
      )
      .map(
        (
          item,
        ) =>
          item.trim(),
      )
      .filter(
        Boolean,
      );
  }

  return [];
}

function objectValue(
  value: unknown,
): Row {
  if (
    value &&
    typeof value ===
      'object' &&
    !Array.isArray(
      value,
    )
  ) {
    return value as Row;
  }

  if (
    typeof value ===
      'string' &&
    value.trim()
  ) {
    try {
      const parsed =
        JSON.parse(
          value,
        );

      if (
        parsed &&
        typeof parsed ===
          'object' &&
        !Array.isArray(
          parsed,
        )
      ) {
        return parsed as Row;
      }
    } catch {
      // Keep default value for malformed legacy JSON.
    }
  }

  return {};
}

function normalizePartnerOpeningHours(
  value: unknown,
): PartnerBusinessOpeningHours {
  const source =
    objectValue(
      value,
    );

  const keys:
    PartnerBusinessOpeningDay[] = [
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      'sat',
      'sun',
    ];

  return Object.fromEntries(
    keys.map(
      (
        key,
      ) => {
        const raw =
          objectValue(
            source[
              key
            ],
          );

        const fallback =
          DEFAULT_PARTNER_OPENING_HOURS[
            key
          ];

        return [
          key,
          {
            closed:
              raw.closed ===
                true ||
              raw.closed ===
                'true',
            open:
              text(
                raw,
                'open',
              ) ||
              fallback.open,
            close:
              text(
                raw,
                'close',
              ) ||
              fallback.close,
          },
        ];
      },
    ),
  ) as PartnerBusinessOpeningHours;
}

export async function getPartnerBusinessProfileExtras(
  businessId: string,
): Promise<PartnerBusinessProfileExtras> {
  const normalizedId =
    businessId.trim();

  if (
    !normalizedId
  ) {
    return {
      ...EMPTY_PARTNER_BUSINESS_PROFILE_EXTRAS,
      openingHours: {
        ...DEFAULT_PARTNER_OPENING_HOURS,
      },
    };
  }

  const result =
    await rpcRequest<
      Row[]
    >(
      'get_business_profile_extras',
      {
        p_business_id:
          normalizedId,
      },
    );

  if (
    result.error
  ) {
    if (
      missingRpc(
        result.error,
      )
    ) {
      return {
        ...EMPTY_PARTNER_BUSINESS_PROFILE_EXTRAS,
        openingHours: {
          ...DEFAULT_PARTNER_OPENING_HOURS,
        },
      };
    }

    throw new Error(
      result.error,
    );
  }

  const row =
    rows(
      result.data,
    )[0] ||
    {};

  const bookingModeRaw =
    text(
      row,
      'booking_mode',
    );

  const bookingMode:
    PartnerBusinessProfileExtras['bookingMode'] =
    [
      'chat',
      'request',
      'external',
      'walk_in',
    ].includes(
      bookingModeRaw,
    )
      ? bookingModeRaw as PartnerBusinessProfileExtras['bookingMode']
      : 'chat';

  return {
    secondaryCategories:
      stringList(
        row.secondary_categories,
      ),
    subcategory:
      text(
        row,
        'subcategory',
      ),
    serviceArea:
      text(
        row,
        'service_area',
      ),
    serviceLanguages:
      stringList(
        row.service_languages,
      ),
    amenities:
      stringList(
        row.amenities,
      ),
    openingHours:
      normalizePartnerOpeningHours(
        row.opening_hours,
      ),
    hoursConfigured:
      bool(
        row,
        'opening_hours_configured',
      ),
    bookingMode,
    bookingUrl:
      text(
        row,
        'booking_url',
      ),
    line:
      text(
        row,
        'line_contact',
      ),
    facebook:
      text(
        row,
        'facebook_url',
      ),
    instagram:
      text(
        row,
        'instagram_url',
      ),
    whatsapp:
      text(
        row,
        'whatsapp_contact',
      ),
  };
}

export async function savePartnerBusinessProfileExtras(
  input: PartnerBusinessProfileExtras,
) {
  const result =
    await rpcRequest(
      'save_my_business_profile_extras',
      {
        p_secondary_categories:
          input.secondaryCategories,
        p_subcategory:
          input.subcategory.trim(),
        p_service_area:
          input.serviceArea.trim(),
        p_service_languages:
          input.serviceLanguages,
        p_amenities:
          input.amenities,
        p_opening_hours:
          input.openingHours,
        p_booking_mode:
          input.bookingMode,
        p_booking_url:
          input.bookingUrl.trim(),
        p_line_contact:
          input.line.trim(),
        p_facebook_url:
          input.facebook.trim(),
        p_instagram_url:
          input.instagram.trim(),
        p_whatsapp_contact:
          input.whatsapp.trim(),
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

export async function setPartnerBusinessLocation(
  input: {
    latitude: number | null;
    longitude: number | null;
  },
) {
  const result =
    await rpcRequest(
      'set_my_business_location',
      {
        p_latitude:
          input.latitude,
        p_longitude:
          input.longitude,
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

async function getPartnerBusinessEntityType(
  businessId: string,
): Promise<
  PartnerBusinessVerificationDetails['entityType']
> {
  const result =
    await rpcRequest<
      Row[]
    >(
      'get_partner_business_entity_type',
      {
        p_business_id:
          businessId,
      },
    );

  if (
    result.error
  ) {
    if (
      missingRpc(
        result.error,
      )
    ) {
      return null;
    }

    throw new Error(
      result.error,
    );
  }

  const row =
    rows(
      result.data,
    )[0];

  const value =
    text(
      row,
      'entity_type',
    ) ||
    String(
      result.data ||
        '',
    ).trim();

  return value ===
      'individual' ||
    value ===
      'legal_entity'
    ? value
    : null;
}

async function getApprovedPartnerVerificationDocuments(
  businessId: string,
) {
  const result =
    await rpcRequest<
      Row[]
    >(
      'get_my_partner_approved_document_replacements',
      {
        p_business_id:
          businessId,
      },
    );

  if (
    result.error
  ) {
    if (
      missingRpc(
        result.error,
      )
    ) {
      return new Map<
        string,
        string
      >();
    }

    throw new Error(
      result.error,
    );
  }

  return new Map(
    rows(
      result.data,
    )
      .map(
        (
          row,
        ) => [
          text(
            row,
            'document_kind',
          ),
          text(
            row,
            'document_path',
          ),
        ] as const,
      )
      .filter(
        (
          [
            kind,
            path,
          ],
        ) =>
          Boolean(
            kind &&
              path,
          ),
      ),
  );
}

export async function getPartnerBusinessVerificationDetails(
  businessId: string,
): Promise<PartnerBusinessVerificationDetails> {
  const normalizedId =
    businessId.trim();

  if (
    !normalizedId
  ) {
    return {
      ...EMPTY_PARTNER_BUSINESS_VERIFICATION_DETAILS,
    };
  }

  const [
    result,
    entityType,
    approvedDocuments,
  ] =
    await Promise.all(
      [
        rpcRequest<
          Row[]
        >(
          'get_partner_business_verification_details',
          {
            p_business_id:
              normalizedId,
          },
        ),
        getPartnerBusinessEntityType(
          normalizedId,
        ),
        getApprovedPartnerVerificationDocuments(
          normalizedId,
        ),
      ],
    );

  if (
    result.error
  ) {
    if (
      missingRpc(
        result.error,
      )
    ) {
      return {
        ...EMPTY_PARTNER_BUSINESS_VERIFICATION_DETAILS,
        entityType,
      };
    }

    throw new Error(
      result.error,
    );
  }

  const row =
    rows(
      result.data,
    )[0] ||
    {};

  return {
    entityType,
    registrationNumber:
      text(
        row,
        'registration_number',
      ),
    taxId:
      text(
        row,
        'tax_id',
      ),
    contactPersonName:
      text(
        row,
        'contact_person_name',
      ),
    contactPersonPhone:
      text(
        row,
        'contact_person_phone',
      ),
    registrationDocumentPath:
      approvedDocuments.get(
        'registration',
      ) ||
      text(
        row,
        'registration_document_path',
      ) ||
      null,
    taxDocumentPath:
      approvedDocuments.get(
        'tax',
      ) ||
      text(
        row,
        'tax_document_path',
      ) ||
      null,
  };
}

export async function savePartnerBusinessVerificationDetails(
  businessId: string,
  input: PartnerBusinessVerificationDetails,
) {
  const normalizedId =
    businessId.trim();

  if (
    !normalizedId
  ) {
    throw new Error(
      'Business ID is required',
    );
  }

  if (
    input.entityType
  ) {
    const entity =
      await rpcRequest(
        'save_partner_business_entity_type',
        {
          p_business_id:
            normalizedId,
          p_entity_type:
            input.entityType,
        },
      );

    if (
      entity.error &&
      !missingRpc(
        entity.error,
      )
    ) {
      throw new Error(
        entity.error,
      );
    }
  }

  const result =
    await rpcRequest(
      'save_partner_business_verification_details',
      {
        p_business_id:
          normalizedId,
        p_registration_number:
          input.registrationNumber.trim(),
        p_tax_id:
          input.taxId.trim(),
        p_contact_person_name:
          input.contactPersonName.trim(),
        p_contact_person_phone:
          input.contactPersonPhone.trim(),
        p_registration_document_path:
          input.registrationDocumentPath,
        p_tax_document_path:
          input.taxDocumentPath,
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

function storageExtension(
  file: File,
) {
  const fromName =
    file.name
      .split(
        '.',
      )
      .pop()
      ?.replace(
        /[^a-zA-Z0-9]/g,
        '',
      )
      .toLowerCase();

  if (
    fromName
  ) {
    return fromName ===
      'jpeg'
      ? 'jpg'
      : fromName;
  }

  const subtype =
    file.type
      .split(
        '/',
      )[1]
      ?.split(
        ';',
      )[0]
      ?.replace(
        /[^a-zA-Z0-9]/g,
        '',
      )
      .toLowerCase();

  return subtype ===
      'jpeg'
    ? 'jpg'
    : (
        subtype ||
        'jpg'
      );
}

export async function uploadPartnerBusinessMedia(
  businessId: string,
  kind:
    | 'logo'
    | 'cover',
  file: File,
) {
  const user =
    await getCurrentUser();

  if (
    !user?.id
  ) {
    throw new Error(
      'Authentication required',
    );
  }

  const normalizedId =
    businessId.trim();

  if (
    !normalizedId
  ) {
    throw new Error(
      'Business ID is required',
    );
  }

  if (
    !file.type.startsWith(
      'image/',
    )
  ) {
    throw new Error(
      'Image file required',
    );
  }

  const path =
    `${user.id}/${normalizedId}/${kind}-${Date.now()}.${storageExtension(
      file,
    )}`;

  const upload =
    await uploadStorageObject(
      'business-media',
      path,
      file,
      file.type,
    );

  if (
    upload.error
  ) {
    throw new Error(
      upload.error,
    );
  }

  const replace =
    await rpcRequest<
      string
    >(
      'replace_my_business_media',
      {
        p_kind:
          kind,
        p_storage_path:
          path,
      },
    );

  if (
    replace.error
  ) {
    throw new Error(
      replace.error,
    );
  }

  return path;
}

export async function uploadPartnerBusinessVerificationDocument(
  businessId: string,
  kind:
    | 'registration'
    | 'tax',
  file: File,
) {
  const normalizedId =
    businessId.trim();

  if (
    !normalizedId
  ) {
    throw new Error(
      'Business ID is required',
    );
  }

  if (
    !file.type.startsWith(
      'image/',
    )
  ) {
    throw new Error(
      'Image file required',
    );
  }

  const suffix =
    Math.random()
      .toString(
        36,
      )
      .slice(
        2,
        10,
      );

  const path =
    `${normalizedId}/${kind}-${Date.now()}-${suffix}.${storageExtension(
      file,
    )}`;

  const upload =
    await uploadStorageObject(
      'business-verification-private',
      path,
      file,
      file.type,
    );

  if (
    upload.error
  ) {
    throw new Error(
      upload.error,
    );
  }

  return path;
}

export async function updatePartnerBusinessProfile(
  businessId: string,
  input: {
    businessType: string;
    legalName: string;
    displayName: string;
    description: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    primaryLanguage: string;
    partnershipModes: string[];
  },
) {
  const result =
    await rpcRequest(
      'update_partner_business_account',
      {
        p_business_id:
          businessId,
        p_business_type:
          input.businessType,
        p_legal_name:
          input.legalName.trim(),
        p_display_name:
          input.displayName.trim(),
        p_description:
          input.description.trim(),
        p_address:
          input.address.trim(),
        p_city:
          input.city.trim(),
        p_country:
          input.country.trim(),
        p_phone:
          input.phone.trim(),
        p_email:
          input.email
            .trim()
            .toLowerCase(),
        p_website:
          input.website.trim(),
        p_primary_language:
          input.primaryLanguage.trim() ||
          'th',
        p_partnership_modes:
          input.partnershipModes,
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

export async function markPartnerBusinessMaterialChange(
  businessId: string,
  changedFields: string[],
) {
  const normalized =
    [
      ...new Set(
        changedFields
          .map(
            (
              value,
            ) =>
              value.trim(),
          )
          .filter(
            Boolean,
          ),
      ),
    ];

  if (
    !businessId.trim() ||
    !normalized.length
  ) {
    return;
  }

  const result =
    await rpcRequest(
      'mark_my_business_material_change',
      {
        p_business_id:
          businessId.trim(),
        p_changed_fields:
          normalized,
      },
    );

  if (
    result.error
  ) {
    if (
      missingRpc(
        result.error,
      )
    ) {
      return;
    }

    throw new Error(
      result.error,
    );
  }
}

export async function listPartnerNearbyPlaces(
  input: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    languageCode?: string;
  },
): Promise<
  PartnerNearbyPlace[]
> {
  const result =
    await invokeEdgeFunction<
      Row
    >(
      'business-nearby-places',
      {
        latitude:
          input.latitude,
        longitude:
          input.longitude,
        radiusMeters:
          input.radiusMeters ??
          5000,
        languageCode:
          input.languageCode ||
          'th',
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  const payload =
    result.data &&
    typeof result.data ===
      'object'
      ? result.data as Row
      : {};

  if (
    payload.error
  ) {
    throw new Error(
      String(
        payload.error,
      ),
    );
  }

  return (
    Array.isArray(
      payload.places,
    )
      ? payload.places
      : []
  )
    .filter(
      (
        item,
      ) =>
        Boolean(
          item,
        ) &&
        typeof item ===
          'object',
    )
    .map(
      (
        item,
      ) => {
        const row =
          item as Row;

        return {
          id:
            text(
              row,
              'id',
            ),
          name:
            text(
              row,
              'name',
            ),
          category:
            text(
              row,
              'category',
            ),
          primaryType:
            text(
              row,
              'primaryType',
              'primary_type',
            ),
          address:
            text(
              row,
              'address',
            ),
          latitude:
            num(
              row,
              'latitude',
            ),
          longitude:
            num(
              row,
              'longitude',
            ),
          distanceKm:
            num(
              row,
              'distanceKm',
              'distance_km',
            ),
        };
      },
    )
    .filter(
      (
        item,
      ) =>
        Boolean(
          item.id &&
            item.name,
        ),
    );
}

export async function saveMyBusinessAccountDraft(
  input: {
    businessType: string;

    legalName: string;

    displayName: string;

    description: string;

    address: string;

    city: string;

    country: string;

    phone: string;

    email: string;

    website: string;

    primaryLanguage: string;

    partnershipModes:
      string[];
  },
) {
  const result =
    await rpcRequest<
      string
    >(
      'save_my_business_account_draft',
      {
        p_business_type:
          input.businessType,

        p_legal_name:
          input.legalName.trim(),

        p_display_name:
          input.displayName.trim(),

        p_description:
          input.description.trim(),

        p_address:
          input.address.trim(),

        p_city:
          input.city.trim(),

        p_country:
          input.country.trim(),

        p_phone:
          input.phone.trim(),

        p_email:
          input.email.trim(),

        p_website:
          input.website.trim(),

        p_primary_language:
          input.primaryLanguage ||
          'th',

        p_partnership_modes:
          input.partnershipModes,
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  return String(
    result.data ||
      '',
  );
}

export async function submitMyBusinessAccountForReview(
  businessId: string,
) {
  const result =
    await rpcRequest(
      'submit_my_business_account_for_review',
      {
        p_business_id:
          businessId,
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
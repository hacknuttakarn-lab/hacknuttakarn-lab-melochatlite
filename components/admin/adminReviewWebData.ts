'use client';

import {
  publicStorageUrl,
  rpcRequest,
} from '@/lib/supabase/browser';

export type AdminReviewQueueType =
  | 'verification'
  | 'business'
  | 'payout'
  | 'reverification'
  | 'user_reports'
  | 'account_deletions'
  | 'review_cases';

export type AdminReviewStatusFilter =
  | 'pending'
  | 'all';

export type AdminReviewAction =
  | 'approve'
  | 'reject'
  | 'request_info'
  | 'suspend'
  | 'dismiss'
  | 'warn'
  | 'suspend_24h'
  | 'suspend_7d'
  | 'deactivate'
  | 'resolve'
  | 'hide_review'
  | 'acknowledge'
  | 'cancel_deletion';

export type AdminPermissionKey =
  | 'verification_view'
  | 'verification_action'
  | 'business_view'
  | 'business_action'
  | 'user_reports_view'
  | 'user_reports_action'
  | 'account_deletions_view'
  | 'account_deletions_action'
  | 'review_cases_view'
  | 'review_cases_action'
  | 'manage_admins'
  | 'view_audit';

export type AdminPermissions =
  Record<AdminPermissionKey, boolean>;

export type AdminReviewAccessWeb = {
  userId: string;
  email: string;
  role:
    | 'user'
    | 'reviewer'
    | 'admin'
    | 'super_admin';
  isActive: boolean;
  permissions: AdminPermissions;
  hasAnyReviewAccess: boolean;
};

export type AdminReviewItemWeb = {
  id: string;
  queueType: AdminReviewQueueType;

  title: string;
  subtitle: string;

  status: string;
  submittedAt: string;

  ownerUserId: string | null;
  ownerEmail: string;

  profilePhotoUrl: string;

  details: Record<string, unknown>;
};

export type AdminReviewEvidenceWeb = {
  id: string;
  label: string;
  storagePath: string;
  signedUrl: string;
  image: boolean;
};

type Row = Record<string, unknown>;

const EMPTY_PERMISSIONS: AdminPermissions = {
  verification_view: false,
  verification_action: false,

  business_view: false,
  business_action: false,

  user_reports_view: false,
  user_reports_action: false,

  account_deletions_view: false,
  account_deletions_action: false,

  review_cases_view: false,
  review_cases_action: false,

  manage_admins: false,
  view_audit: false,
};

const ALL_PERMISSIONS: AdminPermissions = {
  verification_view: true,
  verification_action: true,

  business_view: true,
  business_action: true,

  user_reports_view: true,
  user_reports_action: true,

  account_deletions_view: true,
  account_deletions_action: true,

  review_cases_view: true,
  review_cases_action: true,

  manage_admins: true,
  view_audit: true,
};

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Row =>
        Boolean(
          item &&
          typeof item === 'object' &&
          !Array.isArray(item),
        ),
    );
  }

  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return [value as Row];
  }

  return [];
}

function text(
  row: Row | null | undefined,
  key: string,
  fallback = '',
) {
  const value = row?.[key];

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return String(value);
  }

  return fallback;
}

function nullableText(
  value: unknown,
): string | null {
  return typeof value === 'string' &&
    value.trim()
    ? value.trim()
    : null;
}

function bool(
  value: unknown,
  fallback = false,
) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (
    value === 1 ||
    value === '1' ||
    value === 'true'
  ) {
    return true;
  }

  if (
    value === 0 ||
    value === '0' ||
    value === 'false'
  ) {
    return false;
  }

  return fallback;
}

function numberValue(
  value: unknown,
  fallback = 0,
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function recordOf(
  value: unknown,
): Row {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value)
    ? value as Row
    : {};
}

function stringArray(
  value: unknown,
) {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    const source = value.trim();

    try {
      const parsed = JSON.parse(source);

      if (Array.isArray(parsed)) {
        return parsed
          .map(String)
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      // fall through
    }

    return source
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePermissions(
  value: unknown,
  role: string,
): AdminPermissions {
  if (role === 'super_admin') {
    return {
      ...ALL_PERMISSIONS,
    };
  }

  const row = recordOf(value);

  const output = {
    ...EMPTY_PERMISSIONS,
  };

  (
    Object.keys(
      EMPTY_PERMISSIONS,
    ) as AdminPermissionKey[]
  ).forEach((key) => {
    output[key] =
      bool(row[key]);
  });

  return output;
}

function permissionKey(
  queue:
    AdminReviewQueueType,
  mode: 'view' | 'action',
): AdminPermissionKey {
  if (
    queue === 'payout' ||
    queue === 'reverification'
  ) {
    return `business_${mode}` as AdminPermissionKey;
  }

  return `${queue}_${mode}` as AdminPermissionKey;
}

export function canViewAdminReviewQueue(
  access: AdminReviewAccessWeb,
  queue: AdminReviewQueueType,
) {
  return Boolean(
    access.isActive &&
    access.permissions[
      permissionKey(
        queue,
        'view',
      )
    ],
  );
}

export function canActOnAdminReviewQueue(
  access: AdminReviewAccessWeb,
  queue: AdminReviewQueueType,
) {
  return Boolean(
    access.isActive &&
    access.permissions[
      permissionKey(
        queue,
        'action',
      )
    ],
  );
}

export function adminReviewActionsFor(
  queue: AdminReviewQueueType,
): AdminReviewAction[] {
  if (
    queue === 'verification'
  ) {
    return [
      'approve',
      'request_info',
      'reject',
    ];
  }

  if (
    queue === 'business'
  ) {
    return [
      'approve',
      'request_info',
      'reject',
      'suspend',
    ];
  }

  if (
    queue === 'payout'
  ) {
    return [
      'approve',
      'request_info',
      'reject',
    ];
  }

  if (
    queue === 'reverification'
  ) {
    return [
      'approve',
      'request_info',
      'reject',
    ];
  }

  if (
    queue === 'user_reports'
  ) {
    return [
      'dismiss',
      'warn',
      'suspend_24h',
      'suspend_7d',
      'deactivate',
    ];
  }

  if (
    queue === 'account_deletions'
  ) {
    return [
      'acknowledge',
      'cancel_deletion',
    ];
  }

  return [
    'resolve',
    'reject',
    'hide_review',
  ];
}

export async function getAdminReviewAccessWeb():
Promise<AdminReviewAccessWeb> {
  const result =
    await rpcRequest<Row | Row[]>(
      'get_my_admin_review_access',
    );

  if (result.error) {
    return {
      userId: '',
      email: '',
      role: 'user',
      isActive: false,
      permissions: {
        ...EMPTY_PERMISSIONS,
      },
      hasAnyReviewAccess: false,
    };
  }

  const row =
    rowsOf(result.data)[0] ??
    {};

  const roleText =
    text(
      row,
      'role',
      'user',
    );

  const role:
    AdminReviewAccessWeb['role'] =
    roleText === 'reviewer' ||
    roleText === 'admin' ||
    roleText === 'super_admin'
      ? roleText
      : 'user';

  const permissions =
    normalizePermissions(
      row.permissions,
      role,
    );

  (
    Object.keys(
      permissions,
    ) as AdminPermissionKey[]
  ).forEach((key) => {
    if (key in row) {
      permissions[key] =
        bool(row[key]);
    }
  });

  const isActive =
    bool(row.is_active);

  const hasAnyReviewAccess =
    isActive &&
    (
      role === 'reviewer' ||
      role === 'admin' ||
      role === 'super_admin'
    ) &&
    (
      permissions.verification_view ||
      permissions.business_view ||
      permissions.user_reports_view ||
      permissions.account_deletions_view ||
      permissions.review_cases_view ||
      permissions.manage_admins ||
      permissions.view_audit
    );

  return {
    userId:
      text(
        row,
        'user_id',
      ),

    email:
      text(
        row,
        'email',
      ),

    role,
    isActive,
    permissions,
    hasAnyReviewAccess,
  };
}

async function optionalRpcRows(
  name: string,
  params?: Record<
    string,
    unknown
  >,
) {
  try {
    const result =
      await rpcRequest<Row[]>(
        name,
        params,
      );

    if (result.error) {
      return [];
    }

    return rowsOf(
      result.data,
    );
  } catch {
    return [];
  }
}

async function enrichProfiles(
  rows: Row[],
  userIdKey: string,
) {
  const ids =
    [
      ...new Set(
        rows
          .map(
            (row) =>
              text(
                row,
                userIdKey,
              ),
          )
          .filter(Boolean),
      ),
    ];

  if (!ids.length) {
    return rows;
  }

  const profiles =
    await optionalRpcRows(
      'get_admin_review_profile_summaries',
      {
        p_user_ids: ids,
      },
    );

  const map =
    new Map<
      string,
      Row
    >();

  profiles.forEach(
    (profile) => {
      const id =
        text(
          profile,
          'user_id',
        );

      if (id) {
        map.set(
          id,
          profile,
        );
      }
    },
  );

  return rows.map(
    (row) => {
      const profile =
        map.get(
          text(
            row,
            userIdKey,
          ),
        );

      if (!profile) {
        return row;
      }

      return {
        ...row,

        review_profile_display_name:
          text(
            profile,
            'display_name',
          ),

        review_profile_photo_path:
          text(
            profile,
            'photo_path',
          ),
      };
    },
  );
}

async function enrichVerificationRows(
  rows: Row[],
) {
  const ids =
    [
      ...new Set(
        rows
          .map(
            (row) =>
              text(
                row,
                'user_id',
              ),
          )
          .filter(Boolean),
      ),
    ];

  if (!ids.length) {
    return rows;
  }

  const identityRows =
    await optionalRpcRows(
      'get_admin_verification_identity_details',
      {
        p_user_ids: ids,
      },
    );

  const map =
    new Map<
      string,
      Row
    >();

  identityRows.forEach(
    (identity) => {
      const id =
        text(
          identity,
          'user_id',
        );

      if (id) {
        map.set(
          id,
          identity,
        );
      }
    },
  );

  return rows.map(
    (row) => ({
      ...row,
      ...(
        map.get(
          text(
            row,
            'user_id',
          ),
        ) ?? {}
      ),
    }),
  );
}
async function enrichBusinessPhotoRows(
  rows: Row[],
) {
  const logoPaths = [
    ...new Set(
      rows
        .map((row) =>
          text(
            row,
            'logo_storage_path',
          ).trim(),
        )
        .filter(Boolean),
    ),
  ];

  if (!logoPaths.length) {
    return rows;
  }

  const signedEntries =
    await Promise.all(
      logoPaths.map(
        async (path) => {
          try {
            const url =
              await signedStorageUrl(
                'business-media',
                path,
              );

            return [
              path,
              url,
            ] as const;
          } catch {
            return [
              path,
              '',
            ] as const;
          }
        },
      ),
    );

  const signedMap =
    new Map(
      signedEntries.filter(
        ([, url]) =>
          Boolean(url),
      ),
    );

  return rows.map(
    (row) => {
      const logoPath =
        text(
          row,
          'logo_storage_path',
        ).trim();

      if (!logoPath) {
        return {
          ...row,
          review_business_photo_url: '',
        };
      }

      return {
        ...row,

        review_business_photo_url:
          signedMap.get(
            logoPath,
          ) ?? '',
      };
    },
  );
}

async function enrichBusinessRows(
  rows: Row[],
) {
  const ids =
    [
      ...new Set(
        rows
          .map(
            (row) =>
              text(
                row,
                'id',
              ),
          )
          .filter(Boolean),
      ),
    ];

  if (!ids.length) {
    return rows;
  }

  const [
    identities,
    verification,
    entityTypes,
    expiry,
  ] =
    await Promise.all([
      optionalRpcRows(
        'get_partner_business_identities',
        {
          p_business_ids: ids,
        },
      ),

      optionalRpcRows(
        'get_admin_business_verification_details',
        {
          p_business_ids: ids,
        },
      ),

      optionalRpcRows(
        'get_admin_partner_business_entity_types',
        {
          p_business_ids: ids,
        },
      ),

      optionalRpcRows(
        'get_admin_partner_document_expiry_metadata',
        {
          p_business_ids: ids,
        },
      ),
    ]);

  function mapByBusinessId(
    source: Row[],
  ) {
    const map =
      new Map<
        string,
        Row
      >();

    source.forEach(
      (row) => {
        const id =
          text(
            row,
            'business_id',
          );

        if (!id) {
          return;
        }

        map.set(
          id,
          {
            ...(
              map.get(id) ??
              {}
            ),
            ...row,
          },
        );
      },
    );

    return map;
  }

  const identityMap =
    mapByBusinessId(
      identities,
    );

  const verificationMap =
    mapByBusinessId(
      verification,
    );

  const entityMap =
    mapByBusinessId(
      entityTypes,
    );

  const expiryByBusiness =
    new Map<
      string,
      Row[]
    >();

  expiry.forEach(
    (row) => {
      const id =
        text(
          row,
          'business_id',
        );

      if (!id) {
        return;
      }

      expiryByBusiness.set(
        id,
        [
          ...(
            expiryByBusiness.get(
              id,
            ) ??
            []
          ),
          row,
        ],
      );
    },
  );

  return rows.map(
    (row) => {
      const id =
        text(
          row,
          'id',
        );

      const docs =
        expiryByBusiness.get(
          id,
        ) ?? [];

      const registration =
        docs.find(
          (item) =>
            text(
              item,
              'document_kind',
            ) ===
            'registration',
        );

      const tax =
        docs.find(
          (item) =>
            text(
              item,
              'document_kind',
            ) === 'tax',
        );

      return {
        ...row,

        ...(
          identityMap.get(
            id,
          ) ?? {}
        ),

        ...(
          verificationMap.get(
            id,
          ) ?? {}
        ),

        ...(
          entityMap.get(
            id,
          ) ?? {}
        ),

        registration_issued_on:
          registration?.issued_on ??
          null,

        registration_expires_on:
          registration?.expires_on ??
          null,

        registration_no_expiry:
          registration?.no_expiry ??
          false,

        tax_issued_on:
          tax?.issued_on ??
          null,

        tax_expires_on:
          tax?.expires_on ??
          null,

        tax_no_expiry:
          tax?.no_expiry ??
          false,
      };
    },
  );
}

function profileUrl(
  row: Row,
) {
  const path =
    text(
      row,
      'review_profile_photo_path',
    );

  return path
    ? publicStorageUrl(
        'profile-photos',
        path,
      )
    : '';
}

function mapVerification(
  row: Row,
): AdminReviewItemWeb {
  const displayName =
    text(
      row,
      'display_name',
    ) ||
    text(
      row,
      'review_profile_display_name',
      'Melo member',
    );

  const email =
    text(
      row,
      'user_email',
    );

  return {
    id:
      text(
        row,
        'id',
      ),

    queueType:
      'verification',

    title:
      displayName,

    subtitle:
      email ||
      'Identity verification',

    status:
      text(
        row,
        'status',
        'pending',
      ),

    submittedAt:
      text(
        row,
        'submitted_at',
      ),

    ownerUserId:
      nullableText(
        row.user_id,
      ),

    ownerEmail:
      email,

    profilePhotoUrl:
    text(
    row,
    'review_business_photo_url',
    ),

    details: {
      displayName,
      email,

      emailVerified:
        'email_verified' in row
          ? bool(
              row.email_verified,
            )
          : null,

      phone:
        text(
          row,
          'phone',
        ),

      phoneVerified:
        'phone_verified' in row
          ? bool(
              row.phone_verified,
            )
          : null,

      legalFirstNameEn:
        text(
          row,
          'legal_first_name_en',
        ),

      legalLastNameEn:
        text(
          row,
          'legal_last_name_en',
        ),

      documentType:
        text(
          row,
          'document_type',
        ),

      documentNumber:
        text(
          row,
          'document_number',
        ),

      identityDetailsComplete:
        'identity_details_complete' in row
          ? bool(
              row.identity_details_complete,
            )
          : null,

      selfieStatus:
        text(
          row,
          'selfie_status',
          'pending',
        ),

      identityStatus:
        text(
          row,
          'identity_status',
          'pending',
        ),

      selfiePath:
        text(
          row,
          'selfie_path',
        ),

      identityDocumentPath:
        text(
          row,
          'identity_document_path',
        ),

      reviewerNotes:
        nullableText(
          row.reviewer_notes,
        ),

      reviewedAt:
        nullableText(
          row.reviewed_at,
        ),
    },
  };
}

function mapBusiness(
  row: Row,
): AdminReviewItemWeb {
  const profileExtras =
    recordOf(
      row.profile_extras,
    );

  const displayName =
    text(
      row,
      'display_name',
      'Business account',
    );

  const legalName =
    text(
      row,
      'legal_name',
    );

  const ownerEmail =
    text(
      row,
      'owner_email',
    );

  const storeNo =
    numberValue(
      row.store_no,
    );

  const storeLabel =
    storeNo > 0
      ? `#${storeNo}`
      : '';

  const partnershipModes =
    stringArray(
      row.partnership_modes,
    );

  const secondaryCategories =
    stringArray(
      profileExtras.secondary_categories ??
      profileExtras.secondaryCategories,
    );

  const serviceLanguages =
    stringArray(
      profileExtras.service_languages ??
      profileExtras.serviceLanguages,
    );

  return {
    id:
      text(
        row,
        'id',
      ),

    queueType:
      'business',

    title:
      displayName,

    subtitle:
      [
        legalName ||
        ownerEmail,
        storeLabel,
      ]
        .filter(Boolean)
        .join(' · '),

    status:
      text(
        row,
        'status',
        'pending',
      ),

    submittedAt:
      text(
        row,
        'submitted_at',
      ),

    ownerUserId:
      nullableText(
        row.owner_id,
      ),

    ownerEmail,

    profilePhotoUrl:
      profileUrl(row),

    details: {
      businessId:
        text(
          row,
          'id',
        ),

      partnerId:
        text(
          row,
          'partner_code',
        ),

      ownerName:
        text(
          row,
          'owner_name',
        ) ||
        text(
          row,
          'review_profile_display_name',
        ),

      ownerEmail,

      storeNumber:
        storeLabel,

      isPrimaryStore:
        bool(
          row.is_primary,
        ),

      businessType:
        text(
          row,
          'business_type',
        ),

      entityType:
        text(
          row,
          'entity_type',
        ),

      legalName,

      businessDisplayName:
        displayName,

      description:
        text(
          row,
          'description',
        ),

      partnershipModes,

      secondaryCategories,

      address:
        text(
          row,
          'address',
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

      latitude:
        row.latitude == null
          ? ''
          : numberValue(
              row.latitude,
            ),

      longitude:
        row.longitude == null
          ? ''
          : numberValue(
              row.longitude,
            ),

      coordinates:
        row.latitude != null &&
        row.longitude != null
          ? `${numberValue(
              row.latitude,
            ).toFixed(
              6,
            )}, ${numberValue(
              row.longitude,
            ).toFixed(
              6,
            )}`
          : '',

      businessPhone:
        text(
          row,
          'phone',
        ),

      businessEmail:
        text(
          row,
          'email',
        ),

      website:
        text(
          row,
          'website',
        ),

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

      primaryLanguage:
        text(
          row,
          'primary_language',
        ),

      serviceArea:
        text(
          profileExtras,
          'service_area',
        ) ||
        text(
          profileExtras,
          'serviceArea',
        ),

      serviceLanguages,

      bookingMode:
        text(
          profileExtras,
          'booking_mode',
        ) ||
        text(
          profileExtras,
          'bookingMode',
        ),

      bookingUrl:
        text(
          profileExtras,
          'booking_url',
        ) ||
        text(
          profileExtras,
          'bookingUrl',
        ),

      registrationDocumentPath:
        nullableText(
          row.registration_document_path,
        ),

      taxDocumentPath:
        nullableText(
          row.tax_document_path,
        ),

      logoPath:
        nullableText(
          row.logo_storage_path,
        ),

      coverPath:
        nullableText(
          row.cover_storage_path,
        ),

      registrationIssuedOn:
        nullableText(
          row.registration_issued_on,
        ),

      registrationExpiresOn:
        nullableText(
          row.registration_expires_on,
        ),

      registrationNoExpiry:
        bool(
          row.registration_no_expiry,
        ),

      taxIssuedOn:
        nullableText(
          row.tax_issued_on,
        ),

      taxExpiresOn:
        nullableText(
          row.tax_expires_on,
        ),

      taxNoExpiry:
        bool(
          row.tax_no_expiry,
        ),

      businessVerificationComplete:
        'business_verification_complete' in row
          ? bool(
              row.business_verification_complete,
            )
          : null,

      reviewerNotes:
        nullableText(
          row.reviewer_notes,
        ),

      reviewedAt:
        nullableText(
          row.reviewed_at,
        ),
    },
  };
}

function mapPayout(
  row: Row,
): AdminReviewItemWeb {
  const businessName =
    text(
      row,
      'business_name',
      'Melo Partner',
    );

  const bankName =
    text(
      row,
      'bank_name',
    );

  const accountNumber =
    text(
      row,
      'account_number',
    );

  const masked =
    accountNumber
      ? `•••• ${accountNumber.slice(
          -4,
        )}`
      : '';

  return {
    id:
      text(
        row,
        'account_id',
      ),

    queueType:
      'payout',

    title:
      businessName,

    subtitle:
      [
        bankName,
        masked,
      ]
        .filter(Boolean)
        .join(' · ') ||
      'Payout Verification',

    status:
      text(
        row,
        'status',
        'pending',
      ),

    submittedAt:
      text(
        row,
        'submitted_at',
      ),

    ownerUserId:
      nullableText(
        row.owner_id,
      ),

    ownerEmail:
      text(
        row,
        'owner_email',
      ),

    profilePhotoUrl: '',

    details: {
      businessId:
        text(
          row,
          'business_id',
        ),

      businessDisplayName:
        businessName,

      legalName:
        text(
          row,
          'legal_name',
        ),

      bankCountry:
        text(
          row,
          'bank_country',
        ),

      payoutCurrency:
        text(
          row,
          'currency',
          'THB',
        ),

      bankName,

      accountHolderName:
        text(
          row,
          'account_holder_name',
        ),

      accountNumber,

      payoutDocumentPath:
        nullableText(
          row.document_path,
        ),

      reviewerNotes:
        nullableText(
          row.reviewer_notes,
        ),

      reviewedAt:
        nullableText(
          row.reviewed_at,
        ),
    },
  };
}

function mapReverification(
  row: Row,
): AdminReviewItemWeb {
  const businessName =
    text(
      row,
      'business_name',
      'Melo Partner',
    );

  const subjectKey =
    text(
      row,
      'subject_key',
      'default',
    );

  const documentKind =
    subjectKey.startsWith(
      'document:',
    )
      ? subjectKey.replace(
          'document:',
          '',
        )
      : '';

  const metadata =
    recordOf(
      row.metadata,
    );

  return {
    id:
      text(
        row,
        'id',
      ),

    queueType:
      'reverification',

    title:
      businessName,

    subtitle:
      documentKind ||
      text(
        row,
        'reason_code',
        'Business Re-verification',
      ),

    status:
      text(
        row,
        'status',
        'pending',
      ),

    submittedAt:
      text(
        row,
        'submitted_at',
      ) ||
      text(
        row,
        'updated_at',
      ),

    ownerUserId:
      nullableText(
        row.owner_id,
      ),

    ownerEmail:
      text(
        row,
        'owner_email',
      ),

    profilePhotoUrl: '',

    details: {
      businessId:
        text(
          row,
          'business_id',
        ),

      businessDisplayName:
        businessName,

      legalName:
        text(
          row,
          'legal_name',
        ),

      country:
        text(
          row,
          'country',
        ),

      reverificationScope:
        text(
          row,
          'scope',
          'business',
        ),

      reverificationSubject:
        subjectKey,

      reverificationEffectiveStatus:
        text(
          row,
          'effective_status',
        ),

      reverificationReason:
        text(
          row,
          'reason_code',
        ),

      reverificationReasonDetail:
        nullableText(
          row.reason_detail,
        ),

      documentKind,

      replacementDocumentPath:
        nullableText(
          metadata.replacement_document_path,
        ),

      approvedReplacementDocumentPath:
        nullableText(
          metadata.approved_document_path,
        ),

      submittedIssuedOn:
        nullableText(
          metadata.submitted_issued_on,
        ),

      submittedExpiresOn:
        nullableText(
          metadata.submitted_expires_on,
        ),

      submittedNoExpiry:
        bool(
          metadata.submitted_no_expiry,
        ),

      dueAt:
        nullableText(
          row.due_at,
        ),

      blockingFrom:
        nullableText(
          row.blocking_from,
        ),

      lastApprovedAt:
        nullableText(
          row.last_approved_at,
        ),

      nextReviewAt:
        nullableText(
          row.next_review_at,
        ),

      documentExpiresAt:
        nullableText(
          row.document_expires_at,
        ),

      reviewerNotes:
        nullableText(
          row.reviewer_notes,
        ),
    },
  };
}

function mapUserReport(
  row: Row,
): AdminReviewItemWeb {
  const reportedName =
    text(
      row,
      'reported_name',
      'Melo member',
    );

  return {
    id:
      text(
        row,
        'id',
      ),

    queueType:
      'user_reports',

    title:
      reportedName,

    subtitle:
      `${text(
        row,
        'reason',
        'other',
      )} · ${numberValue(
        row.account_report_count,
        1,
      )} report(s)`,

    status:
      text(
        row,
        'status',
        'open',
      ),

    submittedAt:
      text(
        row,
        'created_at',
      ),

    ownerUserId:
      nullableText(
        row.reported_user_id,
      ),

    ownerEmail:
      text(
        row,
        'reported_email',
      ),

    profilePhotoUrl:
      text(
        row,
        'reported_photo_path',
      )
        ? publicStorageUrl(
            'profile-photos',
            text(
              row,
              'reported_photo_path',
            ),
          )
        : '',

    details: {
      reportedName,

      reportedEmail:
        text(
          row,
          'reported_email',
        ),

      reporterName:
        text(
          row,
          'reporter_name',
          'Melo member',
        ),

      reporterEmail:
        text(
          row,
          'reporter_email',
        ),

      reason:
        text(
          row,
          'reason',
        ),

      details:
        nullableText(
          row.details,
        ),

      sourceType:
        text(
          row,
          'source_type',
        ),

      sourceId:
        nullableText(
          row.source_id,
        ),

      accountReportCount:
        numberValue(
          row.account_report_count,
          1,
        ),

      moderationStatus:
        text(
          row,
          'moderation_status',
          'active',
        ),

      suspendedUntil:
        nullableText(
          row.suspended_until,
        ),
    },
  };
}

function mapDeletion(
  row: Row,
): AdminReviewItemWeb {
  const email =
    text(
      row,
      'user_email',
    );

  const displayName =
    text(
      row,
      'display_name',
    ) ||
    email ||
    'Melo member';

  return {
    id:
      text(
        row,
        'user_id',
      ),

    queueType:
      'account_deletions',

    title:
      displayName,

    subtitle:
      email ||
      'Account deletion request',

    status:
      text(
        row,
        'status',
        'pending',
      ),

    submittedAt:
      text(
        row,
        'requested_at',
      ),

    ownerUserId:
      nullableText(
        row.user_id,
      ),

    ownerEmail:
      email,

    profilePhotoUrl: '',

    details: {
      displayName,
      email,

      reason:
        nullableText(
          row.reason,
        ),

      scheduledFor:
        nullableText(
          row.scheduled_for,
        ),

      cancelledAt:
        nullableText(
          row.cancelled_at,
        ),

      processedAt:
        nullableText(
          row.processed_at,
        ),

      failureMessage:
        nullableText(
          row.failure_message,
        ),

      adminReviewStatus:
        text(
          row,
          'admin_review_status',
          'pending',
        ),

      adminReviewedAt:
        nullableText(
          row.admin_reviewed_at,
        ),

      adminNote:
        nullableText(
          row.admin_note,
        ),
    },
  };
}

function mapReviewCase(
  row: Row,
): AdminReviewItemWeb {
  const caseType =
    text(
      row,
      'case_type',
      'report',
    );

  const reviewerName =
    text(
      row,
      'reviewer_name',
      'Melo member',
    );

  const reviewedName =
    text(
      row,
      'reviewed_user_name',
      'Melo member',
    );

  return {
    id:
      text(
        row,
        'id',
      ),

    queueType:
      'review_cases',

    title:
      caseType === 'dispute'
        ? `Dispute: ${reviewedName}`
        : `Report: ${reviewerName}`,

    subtitle:
      text(
        row,
        'reason',
      ),

    status:
      text(
        row,
        'status',
        'pending',
      ),

    submittedAt:
      text(
        row,
        'created_at',
      ),

    ownerUserId:
      nullableText(
        row.submitted_by,
      ),

    ownerEmail:
      text(
        row,
        'submitter_email',
      ),

    profilePhotoUrl: '',

    details: {
      caseType,

      submitterName:
        text(
          row,
          'submitter_name',
        ),

      submitterEmail:
        text(
          row,
          'submitter_email',
        ),

      reason:
        text(
          row,
          'reason',
        ),

      details:
        nullableText(
          row.details,
        ),

      resolution:
        nullableText(
          row.resolution,
        ),

      reviewerName,

      reviewedUserName:
        reviewedName,

      rating:
        numberValue(
          row.rating,
        ),

      punctualityRating:
        numberValue(
          row.punctuality_rating,
        ),

      friendlinessRating:
        numberValue(
          row.friendliness_rating,
        ),

      reliabilityRating:
        numberValue(
          row.reliability_rating,
        ),

      safetyRating:
        numberValue(
          row.safety_rating,
        ),

      reviewComment:
        nullableText(
          row.review_comment,
        ),

      contextType:
        text(
          row,
          'context_type',
        ),

      reviewStatus:
        text(
          row,
          'review_status',
        ),

      reviewedAt:
        nullableText(
          row.reviewed_at,
        ),
    },
  };
}

export async function listAdminReviewQueueWeb(
  queue:
    AdminReviewQueueType,
  status:
    AdminReviewStatusFilter =
      'pending',
  limit = 200,
): Promise<
  AdminReviewItemWeb[]
> {
  if (
    queue === 'verification'
  ) {
    const result =
      await rpcRequest<Row[]>(
        'get_admin_verification_queue',
        {
          p_status: status,
          p_limit: limit,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    let rows =
  rowsOf(
    result.data,
  );

rows =
  await enrichBusinessRows(
    rows,
  );

/*
 * Business Review ต้องใช้รูปโปรไฟล์ของร้านค้า
 * ไม่ใช่รูป User เจ้าของบัญชี
 */
rows =
  await enrichBusinessPhotoRows(
    rows,
  );

/*
 * ยังคงโหลดข้อมูล User เจ้าของร้านไว้ใช้กับ ownerName
 * และข้อมูลประกอบอื่น ๆ
 * แต่จะไม่ใช้ User photo เป็น Business avatar
 */
rows =
  await enrichProfiles(
    rows,
    'owner_id',
  );

return rows
  .map(
    mapBusiness,
  )
      .filter(
        (item) =>
          Boolean(
            item.id,
          ),
      );
  }

  if (
    queue === 'business'
  ) {
    const result =
      await rpcRequest<Row[]>(
        'get_admin_business_queue',
        {
          p_status: status,
          p_limit: limit,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    let rows =
      rowsOf(
        result.data,
      );

    rows =
      await enrichBusinessRows(
        rows,
      );

    rows =
      await enrichProfiles(
        rows,
        'owner_id',
      );

    return rows
      .map(
        mapBusiness,
      )
      .filter(
        (item) =>
          Boolean(
            item.id,
          ),
      );
  }

  if (
    queue === 'payout'
  ) {
    const result =
      await rpcRequest<Row[]>(
        'get_admin_payout_bank_account_queue',
        {
          p_status: status,
          p_limit: limit,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return rowsOf(
      result.data,
    )
      .map(
        mapPayout,
      )
      .filter(
        (item) =>
          Boolean(
            item.id,
          ),
      );
  }

  if (
    queue === 'reverification'
  ) {
    const result =
      await rpcRequest<Row[]>(
        'get_admin_partner_reverification_queue',
        {
          p_status: status,
          p_limit: limit,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return rowsOf(
      result.data,
    )
      .map(
        mapReverification,
      )
      .filter(
        (item) =>
          Boolean(
            item.id,
          ),
      );
  }

  if (
    queue === 'user_reports'
  ) {
    const result =
      await rpcRequest<Row[]>(
        'get_admin_user_report_queue',
        {
          p_status: status,
          p_limit: limit,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return rowsOf(
      result.data,
    )
      .map(
        mapUserReport,
      )
      .filter(
        (item) =>
          Boolean(
            item.id,
          ),
      );
  }

  if (
    queue === 'account_deletions'
  ) {
    const result =
      await rpcRequest<Row[]>(
        'get_admin_account_deletion_queue',
        {
          p_status: status,
          p_limit: limit,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return rowsOf(
      result.data,
    )
      .map(
        mapDeletion,
      )
      .filter(
        (item) =>
          Boolean(
            item.id,
          ),
      );
  }

  const result =
    await rpcRequest<Row[]>(
      'get_admin_review_case_queue',
      {
        p_status: status,
        p_limit: limit,
      },
    );

  if (result.error) {
    throw new Error(
      result.error,
    );
  }

  return rowsOf(
    result.data,
  )
    .map(
      mapReviewCase,
    )
    .filter(
      (item) =>
        Boolean(
          item.id,
        ),
    );
}

export async function getAdminReviewQueueCountsWeb(
  access:
    AdminReviewAccessWeb,
) {
  const queues:
    AdminReviewQueueType[] = [
      'user_reports',
      'verification',
      'business',
      'payout',
      'reverification',
      'account_deletions',
      'review_cases',
    ];

  const allowed =
    queues.filter(
      (queue) =>
        canViewAdminReviewQueue(
          access,
          queue,
        ),
    );

  const results =
    await Promise.all(
      allowed.map(
        async (queue) => {
          try {
            const rows =
              await listAdminReviewQueueWeb(
                queue,
                'pending',
                200,
              );

            return [
              queue,
              rows.length,
            ] as const;
          } catch {
            return [
              queue,
              0,
            ] as const;
          }
        },
      ),
    );

  return Object.fromEntries(
    results,
  ) as Partial<
    Record<
      AdminReviewQueueType,
      number
    >
  >;
}

export async function resolveAdminReviewItemWeb(
  item:
    AdminReviewItemWeb,
  action:
    AdminReviewAction,
  note = '',
) {
  const cleanNote =
    note.trim() ||
    null;

  if (
    item.queueType ===
    'verification'
  ) {
    const result =
      await rpcRequest(
        'resolve_admin_verification_request',
        {
          p_request_id:
            item.id,
          p_action:
            action,
          p_note:
            cleanNote,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return;
  }

  if (
    item.queueType ===
    'business'
  ) {
    if (
      action ===
      'request_info'
    ) {
      const result =
        await rpcRequest(
          'request_admin_business_revision',
          {
            p_business_id:
              item.id,

            p_note:
              cleanNote,
          },
        );

      if (result.error) {
        throw new Error(
          result.error,
        );
      }

      return;
    }

    const result =
      await rpcRequest(
        'resolve_admin_business_request',
        {
          p_business_id:
            item.id,

          p_action:
            action,

          p_note:
            cleanNote,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return;
  }

  if (
    item.queueType ===
    'payout'
  ) {
    const result =
      await rpcRequest(
        'resolve_admin_payout_bank_account',
        {
          p_account_id:
            item.id,

          p_action:
            action,

          p_note:
            cleanNote,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return;
  }

  if (
    item.queueType ===
    'reverification'
  ) {
    const result =
      await rpcRequest(
        'resolve_admin_partner_reverification',
        {
          p_reverification_id:
            item.id,

          p_action:
            action,

          p_note:
            cleanNote,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return;
  }

  if (
    item.queueType ===
    'user_reports'
  ) {
    const result =
      await rpcRequest(
        'resolve_admin_user_report',
        {
          p_report_id:
            item.id,

          p_action:
            action,

          p_note:
            cleanNote,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return;
  }

  if (
    item.queueType ===
    'account_deletions'
  ) {
    const result =
      await rpcRequest(
        'resolve_admin_account_deletion_request',
        {
          p_user_id:
            item.ownerUserId ||
            item.id,

          p_action:
            action,

          p_note:
            cleanNote,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }

    return;
  }

  const result =
    await rpcRequest(
      'resolve_admin_review_case',
      {
        p_case_id:
          item.id,

        p_action:
          action,

        p_note:
          cleanNote,
      },
    );

  if (result.error) {
    throw new Error(
      result.error,
    );
  }
}

/* =========================================================
   SIGNED PRIVATE STORAGE
   ========================================================= */

function findAccessToken(
  value: unknown,
  depth = 0,
): string {
  if (
    depth > 6 ||
    value == null
  ) {
    return '';
  }

  if (
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    const row =
      value as Record<
        string,
        unknown
      >;

    if (
      typeof row.access_token ===
        'string' &&
      row.access_token.trim()
    ) {
      return row.access_token.trim();
    }

    for (
      const child
      of Object.values(row)
    ) {
      const token =
        findAccessToken(
          child,
          depth + 1,
        );

      if (token) {
        return token;
      }
    }
  }

  if (
    Array.isArray(value)
  ) {
    for (
      const child
      of value
    ) {
      const token =
        findAccessToken(
          child,
          depth + 1,
        );

      if (token) {
        return token;
      }
    }
  }

  return '';
}

function storedAccessToken() {
  if (
    typeof window ===
    'undefined'
  ) {
    return '';
  }

  for (
    let i = 0;
    i < window.localStorage.length;
    i += 1
  ) {
    const key =
      window.localStorage.key(i);

    if (!key) {
      continue;
    }

    const raw =
      window.localStorage.getItem(
        key,
      );

    if (!raw) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(raw);

      const token =
        findAccessToken(
          parsed,
        );

      if (token) {
        return token;
      }
    } catch {
      // ignore non-json
    }
  }

  return '';
}

async function signedStorageUrl(
  bucket: string,
  path: string,
) {
  const normalized =
    path.trim();

  if (!normalized) {
    return '';
  }

  const url =
    (
      process.env
        .NEXT_PUBLIC_SUPABASE_URL ??
      ''
    ).replace(
      /\/+$/,
      '',
    );

  const anonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    '';

  const accessToken =
    storedAccessToken();

  if (
    !url ||
    !anonKey ||
    !accessToken
  ) {
    throw new Error(
      'Unable to create private document URL.',
    );
  }

  const encodedPath =
    normalized
      .split('/')
      .map(
        (part) =>
          encodeURIComponent(
            part,
          ),
      )
      .join('/');

  const response =
    await fetch(
      `${url}/storage/v1/object/sign/${encodeURIComponent(
        bucket,
      )}/${encodedPath}`,
      {
        method: 'POST',

        headers: {
          apikey:
            anonKey,

          Authorization:
            `Bearer ${accessToken}`,

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            expiresIn: 600,
          }),
      },
    );

  const body =
    await response
      .json()
      .catch(
        () => ({}),
      ) as Record<
        string,
        unknown
      >;

  if (!response.ok) {
    throw new Error(
      String(
        body.message ??
        body.error ??
        'Unable to open private document.',
      ),
    );
  }

  const signed =
    String(
      body.signedURL ??
      body.signedUrl ??
      '',
    );

  if (!signed) {
    throw new Error(
      'Signed document URL is empty.',
    );
  }

  if (
    /^https?:\/\//i.test(
      signed,
    )
  ) {
    return signed;
  }

  return `${url}/storage/v1${
    signed.startsWith('/')
      ? signed
      : `/${signed}`
  }`;
}

export async function loadAdminReviewEvidenceWeb(
  item:
    AdminReviewItemWeb,
): Promise<
  AdminReviewEvidenceWeb[]
> {
  const result:
    AdminReviewEvidenceWeb[] =
    [];

  async function add(
    label: string,
    bucket: string,
    path: unknown,
    id: string,
  ) {
    if (
      typeof path !==
        'string' ||
      !path.trim()
    ) {
      return;
    }

    const signedUrl =
      await signedStorageUrl(
        bucket,
        path,
      );

    if (!signedUrl) {
      return;
    }

    result.push({
      id,
      label,
      storagePath:
        path.trim(),

      signedUrl,

      image:
        /\.(png|jpg|jpeg|webp|gif|heic)$/i.test(
          path,
        ),
    });
  }

  if (
    item.queueType ===
    'verification'
  ) {
    await Promise.all([
      add(
        'Selfie',
        'verification-private',
        item.details.selfiePath,
        'selfie',
      ),

      add(
        'Identity document',
        'verification-private',
        item.details.identityDocumentPath,
        'identity',
      ),
    ]);

    return result;
  }

  if (
    item.queueType ===
    'business'
  ) {
    await Promise.all([
      add(
        'Business profile',
        'business-media',
        item.details.logoPath,
        'logo',
      ),

      add(
        'Registration document',
        'business-verification-private',
        item.details.registrationDocumentPath,
        'registration',
      ),

      add(
        'Tax document',
        'business-verification-private',
        item.details.taxDocumentPath,
        'tax',
      ),
    ]);

    return result;
  }

  if (
    item.queueType ===
    'payout'
  ) {
    await add(
      'Bank account evidence',
      'partner-payout-verification-private',
      item.details.payoutDocumentPath,
      'payout',
    );

    return result;
  }

  if (
    item.queueType ===
    'reverification'
  ) {
    await add(
      'Replacement document',
      'business-verification-private',
      item.details.replacementDocumentPath,
      'replacement',
    );

    return result;
  }

  if (
    item.queueType ===
    'user_reports'
  ) {
    const evidenceRpc =
      await rpcRequest<Row[]>(
        'get_admin_report_evidence',
        {
          p_report_id:
            item.id,
        },
      );

    if (
      evidenceRpc.error
    ) {
      throw new Error(
        evidenceRpc.error,
      );
    }

    const rows =
      rowsOf(
        evidenceRpc.data,
      );

    await Promise.all(
      rows.map(
        async (
          row,
          index,
        ) => {
          await add(
            `Evidence ${index + 1}`,
            'report-evidence',
            row.storage_path,
            `report-${index}`,
          );
        },
      ),
    );
  }

  return result;
}
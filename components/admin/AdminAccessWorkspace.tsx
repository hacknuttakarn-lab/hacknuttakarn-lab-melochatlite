'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  publicStorageUrl,
  restSelect,
  rpcRequest,
} from '@/lib/supabase/browser';

import {
  getAdminReviewAccessWeb,
  type AdminPermissionKey,
  type AdminPermissions,
} from '@/components/admin/adminReviewWebData';

import {
  useLocale,
} from '@/components/SiteProviders';

import styles
  from './AdminAccessWorkspace.module.css';


type AdminStaffRole =
  | 'reviewer'
  | 'admin'
  | 'super_admin';


type AdminStaffWeb = {
  userId: string;
  email: string;
  displayName: string;
  photoUrl: string;
  role: AdminStaffRole;
  isActive: boolean;
  permissions: AdminPermissions;
  createdAt: string;
  updatedAt: string;
};


type Row =
  Record<
    string,
    unknown
  >;


const EMPTY_PERMISSIONS:
AdminPermissions = {
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


const ALL_PERMISSIONS:
AdminPermissions = {
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


const COPY:
Record<
  string,
  {
    title: string;
    subtitle: string;

    noAccess: string;
    noAccessDesc: string;

    addEdit: string;
    helper: string;

    email: string;
    emailPlaceholder: string;

    role: string;

    active: string;
    activeDesc: string;

    permissions: string;
    superInfo: string;

    view: string;
    action: string;
    allow: string;

    save: string;
    saving: string;
    saved: string;

    accounts: string;
    accountsDesc: string;

    empty: string;

    edit: string;
    new: string;

    activeStatus: string;
    inactiveStatus: string;

    allPermissions: string;
    noPermissions: string;

    loadFailed: string;
    saveFailed: string;

    permissionVerification: string;
    permissionBusiness: string;
    permissionReports: string;
    permissionDeletion: string;
    permissionReviews: string;
    permissionAdmins: string;
    permissionAudit: string;
  }
> = {
  th: {
    title: 'จัดการสิทธิ์แอดมิน',
    subtitle: 'กำหนดระดับบัญชีและสิทธิ์การดูหรือดำเนินการของผู้ดูแลแต่ละคน',

    noAccess: 'ไม่มีสิทธิ์จัดการแอดมิน',
    noAccessDesc: 'เฉพาะบัญชีที่ได้รับสิทธิ์ Manage admins เท่านั้น',

    addEdit: 'เพิ่มหรือแก้ไขบัญชีแอดมิน',
    helper: 'อีเมลต้องเป็นบัญชีที่สมัคร Melo Chat ใน Supabase Authentication แล้ว',

    email: 'อีเมลบัญชี',
    emailPlaceholder: 'admin@example.com',

    role: 'ระดับบัญชี',

    active: 'เปิดใช้งานบัญชีแอดมิน',
    activeDesc: 'ปิดสวิตช์เพื่อระงับสิทธิ์ โดยไม่ลบบัญชีผู้ใช้',

    permissions: 'สิทธิ์ข้อมูล',
    superInfo: 'Super Admin มีสิทธิ์ดูและดำเนินการทุกหมวดโดยอัตโนมัติ',

    view: 'ดูข้อมูล',
    action: 'ดำเนินการ / อนุมัติ',
    allow: 'อนุญาต',

    save: 'บันทึกสิทธิ์',
    saving: 'กำลังบันทึก...',
    saved: 'บันทึกสิทธิ์เรียบร้อยแล้ว',

    accounts: 'บัญชีที่ได้รับสิทธิ์',
    accountsDesc: 'เลือกบัญชีในรายการเพื่อแก้ไข Role หรือ Permissions',

    empty: 'ยังไม่มีบัญชีแอดมินในระบบ',

    edit: 'แก้ไข',
    new: 'สร้างใหม่',

    activeStatus: 'ใช้งาน',
    inactiveStatus: 'ปิดใช้งาน',

    allPermissions: 'สิทธิ์ทั้งหมด',
    noPermissions: 'ไม่มีสิทธิ์ตรวจข้อมูล',

    loadFailed: 'โหลดข้อมูลแอดมินไม่สำเร็จ',
    saveFailed: 'บันทึกสิทธิ์ไม่สำเร็จ',

    permissionVerification: 'ยืนยันตัวตน',
    permissionBusiness: 'ยืนยันบริษัท',
    permissionReports: 'รายงานผู้ใช้',
    permissionDeletion: 'คำขอลบบัญชี',
    permissionReviews: 'ข้อพิพาทรีวิว',
    permissionAdmins: 'จัดการแอดมิน',
    permissionAudit: 'ดู Audit Log',
  },

  en: {
    title: 'Admin access',
    subtitle: 'Set admin roles and control what each administrator can view or manage.',

    noAccess: 'No admin-management access',
    noAccessDesc: 'Only accounts with the Manage admins permission can use this tool.',

    addEdit: 'Add or edit admin account',
    helper: 'The email must already belong to a Melo Chat account in Supabase Authentication.',

    email: 'Account email',
    emailPlaceholder: 'admin@example.com',

    role: 'Account role',

    active: 'Enable admin account',
    activeDesc: 'Turn this off to suspend admin privileges without deleting the user account.',

    permissions: 'Permissions',
    superInfo: 'Super Admin automatically has all view and action permissions.',

    view: 'View data',
    action: 'Take action / approve',
    allow: 'Allow',

    save: 'Save permissions',
    saving: 'Saving...',
    saved: 'Admin permissions saved.',

    accounts: 'Authorized accounts',
    accountsDesc: 'Select an account to edit its role or permissions.',

    empty: 'No admin accounts yet.',

    edit: 'Edit',
    new: 'New',

    activeStatus: 'Active',
    inactiveStatus: 'Inactive',

    allPermissions: 'All permissions',
    noPermissions: 'No review permissions',

    loadFailed: 'Unable to load admin accounts.',
    saveFailed: 'Unable to save admin permissions.',

    permissionVerification: 'Identity verification',
    permissionBusiness: 'Business verification',
    permissionReports: 'User reports',
    permissionDeletion: 'Account deletion requests',
    permissionReviews: 'Review disputes',
    permissionAdmins: 'Manage admins',
    permissionAudit: 'View Audit Log',
  },

  de: {
    title: 'Admin-Berechtigungen',
    subtitle: 'Rollen und Zugriffsrechte für Administratoren verwalten.',

    noAccess: 'Keine Berechtigung',
    noAccessDesc: 'Nur Konten mit der Berechtigung „Admins verwalten“ können dieses Werkzeug verwenden.',

    addEdit: 'Admin-Konto hinzufügen oder bearbeiten',
    helper: 'Die E-Mail muss bereits zu einem Melo-Chat-Konto gehören.',

    email: 'E-Mail',
    emailPlaceholder: 'admin@example.com',

    role: 'Kontorolle',

    active: 'Admin-Konto aktivieren',
    activeDesc: 'Deaktivieren, um Admin-Rechte vorübergehend zu sperren.',

    permissions: 'Berechtigungen',
    superInfo: 'Super Admin besitzt automatisch alle Berechtigungen.',

    view: 'Daten ansehen',
    action: 'Bearbeiten / genehmigen',
    allow: 'Erlauben',

    save: 'Berechtigungen speichern',
    saving: 'Wird gespeichert...',
    saved: 'Berechtigungen gespeichert.',

    accounts: 'Berechtigte Konten',
    accountsDesc: 'Konto auswählen, um Rolle oder Berechtigungen zu bearbeiten.',

    empty: 'Noch keine Admin-Konten.',

    edit: 'Bearbeiten',
    new: 'Neu',

    activeStatus: 'Aktiv',
    inactiveStatus: 'Inaktiv',

    allPermissions: 'Alle Berechtigungen',
    noPermissions: 'Keine Prüfberechtigungen',

    loadFailed: 'Admin-Konten konnten nicht geladen werden.',
    saveFailed: 'Berechtigungen konnten nicht gespeichert werden.',

    permissionVerification: 'Identitätsprüfung',
    permissionBusiness: 'Unternehmensprüfung',
    permissionReports: 'Nutzermeldungen',
    permissionDeletion: 'Kontolöschungen',
    permissionReviews: 'Bewertungsstreitfälle',
    permissionAdmins: 'Admins verwalten',
    permissionAudit: 'Audit Log ansehen',
  },

  zh: {
    title: '管理员权限',
    subtitle: '设置管理员角色以及可查看和处理的数据权限。',

    noAccess: '没有管理员权限管理权限',
    noAccessDesc: '只有拥有“管理管理员”权限的账户可以使用此工具。',

    addEdit: '添加或编辑管理员账户',
    helper: '该邮箱必须已注册 Melo Chat 账户。',

    email: '账户邮箱',
    emailPlaceholder: 'admin@example.com',

    role: '账户角色',

    active: '启用管理员账户',
    activeDesc: '关闭后暂停管理员权限，但不会删除用户账户。',

    permissions: '数据权限',
    superInfo: 'Super Admin 自动拥有全部查看和操作权限。',

    view: '查看数据',
    action: '处理 / 批准',
    allow: '允许',

    save: '保存权限',
    saving: '保存中...',
    saved: '管理员权限已保存。',

    accounts: '已授权账户',
    accountsDesc: '选择账户以编辑角色或权限。',

    empty: '暂无管理员账户。',

    edit: '编辑',
    new: '新建',

    activeStatus: '启用',
    inactiveStatus: '停用',

    allPermissions: '全部权限',
    noPermissions: '无审核权限',

    loadFailed: '无法加载管理员账户。',
    saveFailed: '无法保存管理员权限。',

    permissionVerification: '身份验证',
    permissionBusiness: '商家验证',
    permissionReports: '用户举报',
    permissionDeletion: '账户删除请求',
    permissionReviews: '评价争议',
    permissionAdmins: '管理管理员',
    permissionAudit: '查看 Audit Log',
  },

  ja: {
    title: '管理者権限',
    subtitle: '管理者のロールと閲覧・操作権限を設定します。',

    noAccess: '管理者権限を変更できません',
    noAccessDesc: 'Manage admins 権限を持つアカウントのみ利用できます。',

    addEdit: '管理者アカウントを追加・編集',
    helper: 'メールアドレスは Melo Chat に登録済みである必要があります。',

    email: 'メールアドレス',
    emailPlaceholder: 'admin@example.com',

    role: 'アカウントロール',

    active: '管理者アカウントを有効にする',
    activeDesc: 'オフにするとユーザーを削除せず管理者権限を停止します。',

    permissions: '権限',
    superInfo: 'Super Admin はすべての閲覧・操作権限を自動的に持ちます。',

    view: '閲覧',
    action: '操作 / 承認',
    allow: '許可',

    save: '権限を保存',
    saving: '保存中...',
    saved: '管理者権限を保存しました。',

    accounts: '権限を持つアカウント',
    accountsDesc: 'アカウントを選択してロールや権限を編集します。',

    empty: '管理者アカウントはありません。',

    edit: '編集',
    new: '新規',

    activeStatus: '有効',
    inactiveStatus: '無効',

    allPermissions: 'すべての権限',
    noPermissions: 'レビュー権限なし',

    loadFailed: '管理者アカウントを読み込めませんでした。',
    saveFailed: '管理者権限を保存できませんでした。',

    permissionVerification: '本人確認',
    permissionBusiness: '店舗確認',
    permissionReports: 'ユーザー報告',
    permissionDeletion: 'アカウント削除',
    permissionReviews: 'レビュー異議',
    permissionAdmins: '管理者を管理',
    permissionAudit: 'Audit Log を表示',
  },

  ko: {
    title: '관리자 권한',
    subtitle: '관리자 역할과 조회·처리 권한을 설정합니다.',

    noAccess: '관리자 권한 관리 권한 없음',
    noAccessDesc: 'Manage admins 권한이 있는 계정만 사용할 수 있습니다.',

    addEdit: '관리자 계정 추가 또는 수정',
    helper: '이메일은 Melo Chat에 이미 가입된 계정이어야 합니다.',

    email: '계정 이메일',
    emailPlaceholder: 'admin@example.com',

    role: '계정 역할',

    active: '관리자 계정 활성화',
    activeDesc: '사용자 계정을 삭제하지 않고 관리자 권한만 중지합니다.',

    permissions: '권한',
    superInfo: 'Super Admin은 모든 조회 및 작업 권한을 자동으로 가집니다.',

    view: '데이터 보기',
    action: '처리 / 승인',
    allow: '허용',

    save: '권한 저장',
    saving: '저장 중...',
    saved: '관리자 권한을 저장했습니다.',

    accounts: '권한이 있는 계정',
    accountsDesc: '계정을 선택하여 역할 또는 권한을 수정합니다.',

    empty: '관리자 계정이 없습니다.',

    edit: '수정',
    new: '새로 만들기',

    activeStatus: '활성',
    inactiveStatus: '비활성',

    allPermissions: '모든 권한',
    noPermissions: '검토 권한 없음',

    loadFailed: '관리자 계정을 불러올 수 없습니다.',
    saveFailed: '관리자 권한을 저장할 수 없습니다.',

    permissionVerification: '본인 인증',
    permissionBusiness: '비즈니스 인증',
    permissionReports: '사용자 신고',
    permissionDeletion: '계정 삭제 요청',
    permissionReviews: '리뷰 분쟁',
    permissionAdmins: '관리자 관리',
    permissionAudit: 'Audit Log 보기',
  },
};


function rowsOf(
  value: unknown,
): Row[] {
  if (Array.isArray(value)) {
    return value.filter(
      (
        item,
      ): item is Row =>
        Boolean(
          item &&
          typeof item === 'object' &&
          !Array.isArray(item),
        ),
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
  value: unknown,
  fallback = '',
) {
  return typeof value === 'string' &&
    value.trim()
    ? value.trim()
    : fallback;
}


function bool(
  value: unknown,
) {
  return (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1'
  );
}


function photoPaths(
  value: unknown,
): string[] {
  if (Array.isArray(value)) {
    return value
      .map(
        (item) =>
          String(
            item ?? '',
          ).trim(),
      )
      .filter(Boolean);
  }

  if (
    typeof value === 'string' &&
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
                item ?? '',
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


function profilePhotoUrl(
  row: Row | undefined,
) {
  if (!row) {
    return '';
  }

  const path =
    photoPaths(
      row.photo_paths,
    )[0] ?? '';

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

  return publicStorageUrl(
    'profile-photos',
    path,
  );
}


function normalizePermissions(
  value: unknown,
  role: AdminStaffRole,
):
AdminPermissions {
  if (
    role === 'super_admin'
  ) {
    return {
      ...ALL_PERMISSIONS,
    };
  }

  const record =
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
      ? value as Row
      : {};

  const output:
    AdminPermissions = {
      ...EMPTY_PERMISSIONS,
    };

  (
    Object.keys(
      output,
    ) as AdminPermissionKey[]
  ).forEach(
    (key) => {
      output[key] =
        bool(
          record[key],
        );
    },
  );

  return output;
}


function blankForm() {
  return {
    email: '',

    role:
      'reviewer' as AdminStaffRole,

    isActive: true,

    permissions: {
      ...EMPTY_PERMISSIONS,
    },
  };
}


async function listAdminStaffWeb():
Promise<
  AdminStaffWeb[]
> {
  const result =
    await rpcRequest<
      Row[]
    >(
      'list_admin_review_staff',
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  const staff =
    rowsOf(
      result.data,
    )
      .map(
        (row) => {
          const roleText =
            text(
              row.role,
              'reviewer',
            );

          const role:
            AdminStaffRole =
            roleText === 'admin' ||
            roleText === 'super_admin'
              ? roleText
              : 'reviewer';

          return {
            userId:
              text(
                row.user_id,
              ),

            email:
              text(
                row.email,
              ),

            displayName:
              text(
                row.display_name,
                'Melo admin',
              ),

            photoUrl: '',

            role,

            isActive:
              bool(
                row.is_active,
              ),

            permissions:
              normalizePermissions(
                row.permissions,
                role,
              ),

            createdAt:
              text(
                row.created_at,
              ),

            updatedAt:
              text(
                row.updated_at,
              ),
          };
        },
      )
      .filter(
        (row) =>
          Boolean(
            row.userId,
          ),
      );

  const ids =
    [
      ...new Set(
        staff
          .map(
            (row) =>
              row.userId,
          )
          .filter(Boolean),
      ),
    ];

  if (
    ids.length === 0
  ) {
    return staff;
  }

  const quoted =
    ids
      .map(
        (id) =>
          `"${id.replace(
            /"/g,
            '',
          )}"`,
      )
      .join(',');

  const profileResult =
    await restSelect<
      Row[]
    >(
      'profiles',
      `select=id,photo_paths&id=in.(${encodeURIComponent(
        quoted,
      )})`,
    );

  if (
    profileResult.error ||
    !Array.isArray(
      profileResult.data,
    )
  ) {
    return staff;
  }

  const profileMap =
    new Map<
      string,
      Row
    >();

  for (
    const profile
    of profileResult.data
  ) {
    const id =
      text(
        profile.id,
      );

    if (id) {
      profileMap.set(
        id,
        profile,
      );
    }
  }

  return staff.map(
    (row) => ({
      ...row,

      photoUrl:
        profilePhotoUrl(
          profileMap.get(
            row.userId,
          ),
        ),
    }),
  );
}


async function upsertAdminStaffWeb(
  input: {
    email: string;
    role: AdminStaffRole;
    permissions: AdminPermissions;
    isActive: boolean;
  },
) {
  const result =
    await rpcRequest(
      'upsert_admin_review_staff',
      {
        p_email:
          input.email
            .trim()
            .toLowerCase(),

        p_role:
          input.role,

        p_permissions:
          input.permissions,

        p_is_active:
          input.isActive,
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


export default function AdminAccessWorkspace() {
  const {
    locale,
  } =
    useLocale();

  const copy =
    COPY[locale] ??
    COPY.en;

  const [
    rows,
    setRows,
  ] =
    useState<
      AdminStaffWeb[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    canManage,
    setCanManage,
  ] =
    useState(false);

  const [
    form,
    setForm,
  ] =
    useState(
      blankForm,
    );

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState('');


  const permissionGroups =
    useMemo(
      () => [
        {
          label:
            copy.permissionVerification,

          view:
            'verification_view' as AdminPermissionKey,

          action:
            'verification_action' as AdminPermissionKey,
        },

        {
          label:
            copy.permissionBusiness,

          view:
            'business_view' as AdminPermissionKey,

          action:
            'business_action' as AdminPermissionKey,
        },

        {
          label:
            copy.permissionReports,

          view:
            'user_reports_view' as AdminPermissionKey,

          action:
            'user_reports_action' as AdminPermissionKey,
        },

        {
          label:
            copy.permissionDeletion,

          view:
            'account_deletions_view' as AdminPermissionKey,

          action:
            'account_deletions_action' as AdminPermissionKey,
        },

        {
          label:
            copy.permissionReviews,

          view:
            'review_cases_view' as AdminPermissionKey,

          action:
            'review_cases_action' as AdminPermissionKey,
        },

        {
          label:
            copy.permissionAdmins,

          action:
            'manage_admins' as AdminPermissionKey,
        },

        {
          label:
            copy.permissionAudit,

          view:
            'view_audit' as AdminPermissionKey,
        },
      ],
      [
        copy,
      ],
    );


  const effectivePermissions =
    useMemo(
      () =>
        form.role === 'super_admin'
          ? ALL_PERMISSIONS
          : form.permissions,

      [
        form.permissions,
        form.role,
      ],
    );


  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError('');

        try {
          const access =
            await getAdminReviewAccessWeb();

          const allowed =
            Boolean(
              access.isActive &&
              access.permissions
                .manage_admins,
            );

          setCanManage(
            allowed,
          );

          if (
            !allowed
          ) {
            setRows([]);

            return;
          }

          setRows(
            await listAdminStaffWeb(),
          );
        } catch (
          cause
        ) {
          setCanManage(false);
          setRows([]);

          setError(
            cause instanceof Error
              ? cause.message
              : copy.loadFailed,
          );
        } finally {
          setLoading(false);
        }
      },
      [
        copy.loadFailed,
      ],
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );


  function selectRole(
    role:
      AdminStaffRole,
  ) {
    setForm(
      (current) => ({
        ...current,

        role,

        permissions:
          role === 'super_admin'
            ? {
                ...ALL_PERMISSIONS,
              }
            : current.permissions,
      }),
    );
  }


  function setPermission(
    key:
      AdminPermissionKey,

    value:
      boolean,
  ) {
    setForm(
      (current) => {
        if (
          current.role ===
          'super_admin'
        ) {
          return current;
        }

        const permissions:
          AdminPermissions = {
            ...current.permissions,

            [key]:
              value,
          };

        if (
          key.endsWith(
            '_action',
          ) &&
          value
        ) {
          const viewKey =
            key.replace(
              '_action',
              '_view',
            ) as AdminPermissionKey;

          if (
            viewKey in
            permissions
          ) {
            permissions[
              viewKey
            ] = true;
          }
        }

        if (
          key.endsWith(
            '_view',
          ) &&
          !value
        ) {
          const actionKey =
            key.replace(
              '_view',
              '_action',
            ) as AdminPermissionKey;

          if (
            actionKey in
            permissions
          ) {
            permissions[
              actionKey
            ] = false;
          }
        }

        return {
          ...current,
          permissions,
        };
      },
    );
  }


  function selectStaff(
    staff:
      AdminStaffWeb,
  ) {
    setForm({
      email:
        staff.email,

      role:
        staff.role,

      isActive:
        staff.isActive,

      permissions: {
        ...staff.permissions,
      },
    });

    setError('');
    setSuccess('');

    document
      .getElementById(
        'melo-admin-access-form',
      )
      ?.scrollIntoView({
        behavior:
          'smooth',

        block:
          'start',
      });
  }


  async function save() {
    const email =
      form.email
        .trim()
        .toLowerCase();

    if (
      !email
    ) {
      setError(
        copy.email,
      );

      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await upsertAdminStaffWeb({
        email,

        role:
          form.role,

        isActive:
          form.isActive,

        permissions:
          form.role ===
          'super_admin'
            ? {
                ...ALL_PERMISSIONS,
              }
            : {
                ...form.permissions,
              },
      });

      setForm(
        blankForm(),
      );

      await load();

      setSuccess(
        copy.saved,
      );

      window.setTimeout(
        () => {
          setSuccess('');
        },
        3500,
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof Error
          ? cause.message
          : copy.saveFailed,
      );
    } finally {
      setSaving(false);
    }
  }


  function permissionSummary(
    staff:
      AdminStaffWeb,
  ) {
    if (
      staff.role ===
      'super_admin'
    ) {
      return copy.allPermissions;
    }

    const values = [
      staff.permissions
        .verification_view &&
        copy.permissionVerification,

      staff.permissions
        .business_view &&
        copy.permissionBusiness,

      staff.permissions
        .user_reports_view &&
        copy.permissionReports,

      staff.permissions
        .account_deletions_view &&
        copy.permissionDeletion,

      staff.permissions
        .review_cases_view &&
        copy.permissionReviews,

      staff.permissions
        .manage_admins &&
        copy.permissionAdmins,

      staff.permissions
        .view_audit &&
        copy.permissionAudit,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      values ||
      copy.noPermissions
    );
  }


  if (
    loading
  ) {
    return (
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
          Loading...
        </strong>
      </div>
    );
  }


  if (
    !canManage
  ) {
    return (
      <div
        className={
          styles.state
        }
      >
        <span
          className={
            styles.lock
          }
        >
          A
        </span>

        <strong>
          {copy.noAccess}
        </strong>

        <p>
          {copy.noAccessDesc}
        </p>

        {error ? (
          <small>
            {error}
          </small>
        ) : null}
      </div>
    );
  }


  return (
    <section
      className={
        styles.workspace
      }
    >
      <section
        id="melo-admin-access-form"
        className={
          styles.card
        }
      >
        <header
          className={
            styles.cardHeader
          }
        >
          <div>
            <small>
              ADMIN ACCESS
            </small>

            <h3>
              {copy.addEdit}
            </h3>

            <p>
              {copy.helper}
            </p>
          </div>

          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={() => {
              setForm(
                blankForm(),
              );

              setError('');
              setSuccess('');
            }}
          >
            + {copy.new}
          </button>
        </header>

        <div
          className={
            styles.formGrid
          }
        >
          <label
            className={
              styles.fullField
            }
          >
            <span>
              {copy.email}
            </span>

            <input
              type="email"
              value={
                form.email
              }
              placeholder={
                copy.emailPlaceholder
              }
              autoComplete="off"
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,

                    email:
                      event
                        .target
                        .value,
                  }),
                )
              }
            />
          </label>

          <div
            className={
              styles.fullField
            }
          >
            <span
              className={
                styles.fieldLabel
              }
            >
              {copy.role}
            </span>

            <div
              className={
                styles.roles
              }
            >
              {(
                [
                  'reviewer',
                  'admin',
                  'super_admin',
                ] as AdminStaffRole[]
              ).map(
                (role) => (
                  <button
                    key={
                      role
                    }
                    type="button"
                    data-active={
                      form.role ===
                      role
                    }
                    onClick={() =>
                      selectRole(
                        role,
                      )
                    }
                  >
                    {role}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div
          className={
            styles.activeRow
          }
        >
          <div>
            <strong>
              {copy.active}
            </strong>

            <small>
              {copy.activeDesc}
            </small>
          </div>

          <label
            className={
              styles.switch
            }
          >
            <input
              type="checkbox"
              checked={
                form.isActive
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,

                    isActive:
                      event
                        .target
                        .checked,
                  }),
                )
              }
            />

            <span />
          </label>
        </div>

        <div
          className={
            styles.permissionsTitle
          }
        >
          <strong>
            {copy.permissions}
          </strong>
        </div>

        {form.role ===
        'super_admin' ? (
          <div
            className={
              styles.superInfo
            }
          >
            ✓ {copy.superInfo}
          </div>
        ) : null}

        <div
          className={
            styles.permissionList
          }
        >
          {permissionGroups.map(
            (group) => (
              <div
                className={
                  styles.permissionGroup
                }
                key={
                  group.label
                }
              >
                <strong>
                  {group.label}
                </strong>

                <div
                  className={
                    styles.permissionOptions
                  }
                >
                  {group.view ? (
                    <label>
                      <span>
                        {copy.view}
                      </span>

                      <input
                        type="checkbox"
                        disabled={
                          form.role ===
                          'super_admin'
                        }
                        checked={
                          effectivePermissions[
                            group.view
                          ]
                        }
                        onChange={(
                          event,
                        ) =>
                          setPermission(
                            group.view!,
                            event
                              .target
                              .checked,
                          )
                        }
                      />
                    </label>
                  ) : null}

                  {group.action ? (
                    <label>
                      <span>
                        {group.action ===
                        'manage_admins'
                          ? copy.allow
                          : copy.action}
                      </span>

                      <input
                        type="checkbox"
                        disabled={
                          form.role ===
                          'super_admin'
                        }
                        checked={
                          effectivePermissions[
                            group.action
                          ]
                        }
                        onChange={(
                          event,
                        ) =>
                          setPermission(
                            group.action!,
                            event
                              .target
                              .checked,
                          )
                        }
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            ),
          )}
        </div>

        {error ? (
          <div
            className={
              styles.error
            }
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            className={
              styles.success
            }
          >
            ✓ {success}
          </div>
        ) : null}

        <button
          type="button"
          className={
            styles.saveButton
          }
          disabled={
            saving
          }
          onClick={() =>
            void save()
          }
        >
          {saving
            ? copy.saving
            : copy.save}
        </button>
      </section>

      <section
        className={
          styles.accounts
        }
      >
        <header
          className={
            styles.accountsHeader
          }
        >
          <div>
            <small>
              ADMIN STAFF
            </small>

            <h3>
              {copy.accounts}
            </h3>

            <p>
              {copy.accountsDesc}
            </p>
          </div>

          <b
            className={
              styles.totalBadge
            }
          >
            {rows.length}
          </b>
        </header>

        {rows.length ===
        0 ? (
          <div
            className={
              styles.empty
            }
          >
            {copy.empty}
          </div>
        ) : (
          <div
            className={
              styles.staffList
            }
          >
            {rows.map(
              (staff) => (
                <button
                  key={
                    staff.userId
                  }
                  type="button"
                  className={
                    styles.staff
                  }
                  onClick={() =>
                    selectStaff(
                      staff,
                    )
                  }
                >
                  <span
                    className={
                      styles.staffAvatar
                    }
                  >
                    {staff.photoUrl ? (
                      <img
                        src={
                          staff.photoUrl
                        }
                        alt=""
                      />
                    ) : (
                      (staff.displayName ||
                        staff.email ||
                        'A')
                        .trim()
                        .slice(
                          0,
                          1,
                        )
                        .toUpperCase()
                    )}
                  </span>

                  <span
                    className={
                      styles.staffCopy
                    }
                  >
                    <strong>
                      {staff.email}
                    </strong>

                    <small>
                      {staff.role}
                      {' · '}
                      {staff.isActive
                        ? copy.activeStatus
                        : copy.inactiveStatus}
                    </small>

                    <em>
                      {permissionSummary(
                        staff,
                      )}
                    </em>
                  </span>

                  <b
                    className={
                      styles.edit
                    }
                  >
                    {copy.edit} ›
                  </b>
                </button>
              ),
            )}
          </div>
        )}
      </section>
    </section>
  );
}
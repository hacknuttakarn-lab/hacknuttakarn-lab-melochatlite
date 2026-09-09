'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/SiteProviders';
import VerifiedUserAvatar from '@/components/profile/VerifiedUserAvatar';
import PartnerModeHeader from './PartnerModeHeader';
import {
  PARTNER_PERMISSION_KEYS,
  defaultPartnerPermissions,
  getActivePartnerBusiness,
  hasPartnerPermission,
  isPartnerPermissionLockedForRole,
  listPartnerStaff,
  removePartnerStaff,
  savePartnerStaff,
  searchPartnerStaffCandidates,
  updatePartnerStaff,
  type PartnerBusinessAccess,
  type PartnerPermission,
  type PartnerRole,
  type PartnerStaffCandidate,
  type PartnerStaffMember,
} from './partnerModeWeb';
import styles from './PartnerMode.module.css';

type StaffRole = Exclude<PartnerRole, 'owner'>;

type StaffCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  owner: string;
  admin: string;
  manager: string;
  staff: string;
  storeOwner: string;
  ownerAllAccess: string;
  team: string;
  empty: string;
  emptyHint: string;
  add: string;
  edit: string;
  addTitle: string;
  editTitle: string;
  modalHint: string;
  email: string;
  emailPlaceholder: string;
  role: string;
  permissions: string;
  addToStore: string;
  save: string;
  cancel: string;
  remove: string;
  staffNotice: string;
  staffNoticeBody: string;
  staffLockedHint: string;
  confirmRemove: string;
  noViewAccess: string;
  noViewAccessBody: string;
  viewOnly: string;
  viewOnlyBody: string;
  active: string;
  inactive: string;
  activeAccount: string;
  activeAccountHint: string;
  loading: string;
  saving: string;
  success: string;
  invalidEmail: string;
  searchingUsers: string;
  noUserMatches: string;
  chooseUser: string;
};

const COPY: Record<string, StaffCopy> = {
  th: {
    eyebrow: 'STORE ACCESS',
    title: 'พนักงานและแอดมิน',
    subtitle: 'เพิ่มจากอีเมลบัญชี Melo Chat และกำหนดสิทธิ์การใช้งานระบบร้านค้าเป็นรายคน',
    owner: 'Owner', admin: 'Admin', manager: 'Manager', staff: 'Staff',
    storeOwner: 'เจ้าของร้าน', ownerAllAccess: 'Owner · สิทธิ์ทั้งหมด', team: 'ทีมร้านค้า',
    empty: 'ยังไม่มีพนักงานหรือแอดมิน', emptyHint: 'Owner สามารถเพิ่มผู้ใช้ Melo Chat ด้วยอีเมล แล้วกำหนดสิทธิ์ได้จากหน้านี้',
    add: '＋ เพิ่ม', edit: 'แก้ไขสิทธิ์', addTitle: 'เพิ่มผู้ใช้ในร้านค้า', editTitle: 'แก้ไขสิทธิ์ผู้ใช้',
    modalHint: 'ผู้ใช้ต้องมีบัญชี Melo Chat อยู่แล้ว และระบบจะค้นหาจากอีเมลแบบตรงกัน',
    email: 'อีเมล Melo Chat', emailPlaceholder: 'name@example.com', role: 'บทบาท', permissions: 'กำหนดสิทธิ์',
    addToStore: 'เพิ่มเข้าร้านค้า', save: 'บันทึกสิทธิ์', cancel: 'ยกเลิก', remove: 'ลบผู้ใช้ออกจากร้าน',
    staffNotice: 'Staff: จำกัดข้อมูลภายในสำคัญ',
    staffNoticeBody: 'ล็อกการเงิน สถิติ รายงาน แก้ไขโปรไฟล์ร้าน และจัดการทีม ไม่สามารถเปิดสิทธิ์เหล่านี้ให้ Staff ได้',
    staffLockedHint: 'Staff ไม่สามารถเข้าถึงข้อมูล/การตั้งค่านี้ได้',
    confirmRemove: 'ต้องการลบผู้ใช้นี้ออกจากร้านหรือไม่?',
    noViewAccess: 'ไม่มีสิทธิ์เข้าถึงข้อมูลทีมร้าน',
    noViewAccessBody: 'Role Staff ถูกจำกัดไม่ให้ดูข้อมูลพนักงาน แอดมิน การเงิน สถิติ รายงาน หรือการตั้งค่าภายในที่สำคัญของร้าน',
    viewOnly: 'คุณดูรายชื่อทีมได้ตามสิทธิ์ แต่แก้ไขสิทธิ์ไม่ได้',
    viewOnlyBody: 'การเพิ่ม ลบ หรือเพิ่มระดับสิทธิ์ให้ Owner เป็นผู้ดำเนินการ เพื่อป้องกันการยกระดับสิทธิ์ของบัญชีเอง',
    active: 'ใช้งาน', inactive: 'ปิดใช้งาน', activeAccount: 'เปิดใช้งานบัญชีนี้', activeAccountHint: 'ปิดเพื่อพักสิทธิ์โดยไม่ลบออกจากร้าน',
    loading: 'กำลังโหลด…', saving: 'กำลังบันทึก…', success: 'บันทึกทีมร้านค้าแล้ว', invalidEmail: 'กรุณากรอกอีเมลบัญชี Melo Chat ให้ถูกต้อง', searchingUsers: 'กำลังค้นหาผู้ใช้…', noUserMatches: 'ไม่พบผู้ใช้ Melo Chat ที่ตรงกับอีเมลนี้', chooseUser: 'เลือกผู้ใช้นี้',
  },
  en: {
    eyebrow: 'STORE ACCESS', title: 'Staff and admins', subtitle: 'Add Melo Chat users by email and assign store permissions for each person.',
    owner: 'Owner', admin: 'Admin', manager: 'Manager', staff: 'Staff', storeOwner: 'Store owner', ownerAllAccess: 'Owner · Full access', team: 'Store team',
    empty: 'No staff or admins yet', emptyHint: 'The Owner can add Melo Chat users by email and assign permissions here.',
    add: '＋ Add', edit: 'Edit access', addTitle: 'Add user to store', editTitle: 'Edit user access', modalHint: 'The user must already have a Melo Chat account. The email must match exactly.',
    email: 'Melo Chat email', emailPlaceholder: 'name@example.com', role: 'Role', permissions: 'Permissions', addToStore: 'Add to store', save: 'Save access', cancel: 'Cancel', remove: 'Remove user from store',
    staffNotice: 'Staff: sensitive internal access is limited', staffNoticeBody: 'Finance, analytics, reports, store-profile editing, and team management are locked for Staff.', staffLockedHint: 'Staff cannot access this data or setting.',
    confirmRemove: 'Remove this user from the store?', noViewAccess: 'No access to the store team', noViewAccessBody: 'Staff cannot view team members, admins, finance, analytics, reports, or sensitive store settings.',
    viewOnly: 'You can view the team, but cannot change access', viewOnlyBody: 'Only the Owner can add, remove, or elevate access to prevent self-escalation of permissions.',
    active: 'Active', inactive: 'Inactive', activeAccount: 'Enable this account', activeAccountHint: 'Turn off to pause store access without removing the user.',
    loading: 'Loading…', saving: 'Saving…', success: 'Store team saved', invalidEmail: 'Enter a valid Melo Chat account email.', searchingUsers: 'Searching Melo users…', noUserMatches: 'No Melo Chat user matches this email.', chooseUser: 'Choose this user',
  },
  de: {
    eyebrow: 'STORE ACCESS', title: 'Mitarbeiter und Admins', subtitle: 'Melo-Chat-Nutzer per E-Mail hinzufügen und individuelle Store-Rechte festlegen.',
    owner: 'Owner', admin: 'Admin', manager: 'Manager', staff: 'Staff', storeOwner: 'Store-Inhaber', ownerAllAccess: 'Owner · Vollzugriff', team: 'Store-Team',
    empty: 'Noch keine Mitarbeiter oder Admins', emptyHint: 'Der Owner kann Melo-Chat-Nutzer per E-Mail hinzufügen und Rechte vergeben.', add: '＋ Hinzufügen', edit: 'Zugriff bearbeiten',
    addTitle: 'Nutzer zum Store hinzufügen', editTitle: 'Nutzerzugriff bearbeiten', modalHint: 'Der Nutzer muss bereits ein Melo-Chat-Konto besitzen. Die E-Mail muss exakt übereinstimmen.',
    email: 'Melo-Chat-E-Mail', emailPlaceholder: 'name@example.com', role: 'Rolle', permissions: 'Berechtigungen', addToStore: 'Zum Store hinzufügen', save: 'Zugriff speichern', cancel: 'Abbrechen', remove: 'Nutzer aus Store entfernen',
    staffNotice: 'Staff: sensible interne Daten sind eingeschränkt', staffNoticeBody: 'Finanzen, Analysen, Berichte, Store-Profil und Teamverwaltung sind für Staff gesperrt.', staffLockedHint: 'Staff hat keinen Zugriff auf diese Daten oder Einstellung.',
    confirmRemove: 'Diesen Nutzer aus dem Store entfernen?', noViewAccess: 'Kein Zugriff auf das Store-Team', noViewAccessBody: 'Staff kann Team, Admins, Finanzen, Analysen, Berichte oder sensible Einstellungen nicht einsehen.',
    viewOnly: 'Team sichtbar, Rechte können aber nicht geändert werden', viewOnlyBody: 'Nur der Owner darf Nutzer hinzufügen, entfernen oder Rechte erhöhen.', active: 'Aktiv', inactive: 'Inaktiv',
    activeAccount: 'Dieses Konto aktivieren', activeAccountHint: 'Deaktivieren, um den Store-Zugriff zu pausieren, ohne den Nutzer zu entfernen.', loading: 'Wird geladen…', saving: 'Wird gespeichert…', success: 'Store-Team gespeichert', invalidEmail: 'Bitte eine gültige Melo-Chat-E-Mail eingeben.', searchingUsers: 'Melo-Nutzer werden gesucht…', noUserMatches: 'Kein Melo-Chat-Nutzer mit dieser E-Mail gefunden.', chooseUser: 'Diesen Nutzer auswählen',
  },
  zh: {
    eyebrow: 'STORE ACCESS', title: '员工和管理员', subtitle: '通过 Melo Chat 邮箱添加用户，并为每个人设置店铺权限。', owner: 'Owner', admin: 'Admin', manager: 'Manager', staff: 'Staff',
    storeOwner: '店铺所有者', ownerAllAccess: 'Owner · 全部权限', team: '店铺团队', empty: '暂无员工或管理员', emptyHint: 'Owner 可通过 Melo Chat 邮箱添加用户并分配权限。', add: '＋ 添加', edit: '编辑权限',
    addTitle: '添加用户到店铺', editTitle: '编辑用户权限', modalHint: '用户必须已经拥有 Melo Chat 账户，邮箱必须完全匹配。', email: 'Melo Chat 邮箱', emailPlaceholder: 'name@example.com', role: '角色', permissions: '权限',
    addToStore: '添加到店铺', save: '保存权限', cancel: '取消', remove: '从店铺移除用户', staffNotice: 'Staff：限制敏感内部权限', staffNoticeBody: '财务、统计、报告、店铺资料编辑和团队管理对 Staff 锁定。', staffLockedHint: 'Staff 无法访问此数据或设置。',
    confirmRemove: '从店铺移除此用户？', noViewAccess: '无权访问店铺团队', noViewAccessBody: 'Staff 无法查看团队、管理员、财务、统计、报告或敏感店铺设置。', viewOnly: '可以查看团队，但不能修改权限', viewOnlyBody: '只有 Owner 可以添加、移除或提升权限。',
    active: '启用', inactive: '停用', activeAccount: '启用此账户', activeAccountHint: '关闭后仅暂停店铺权限，不会移除用户。', loading: '正在加载…', saving: '正在保存…', success: '店铺团队已保存', invalidEmail: '请输入有效的 Melo Chat 账户邮箱。', searchingUsers: '正在搜索 Melo 用户…', noUserMatches: '没有找到匹配此邮箱的 Melo Chat 用户。', chooseUser: '选择此用户',
  },
  ja: {
    eyebrow: 'STORE ACCESS', title: 'スタッフと管理者', subtitle: 'Melo Chat のメールでユーザーを追加し、個別に店舗権限を設定します。', owner: 'Owner', admin: 'Admin', manager: 'Manager', staff: 'Staff', storeOwner: '店舗オーナー', ownerAllAccess: 'Owner · 全権限', team: '店舗チーム',
    empty: 'スタッフ・管理者はいません', emptyHint: 'Owner は Melo Chat のメールでユーザーを追加し、権限を設定できます。', add: '＋ 追加', edit: '権限を編集', addTitle: 'ユーザーを店舗に追加', editTitle: 'ユーザー権限を編集', modalHint: 'ユーザーは Melo Chat アカウントを持っている必要があります。メールは完全一致で検索されます。',
    email: 'Melo Chat メール', emailPlaceholder: 'name@example.com', role: '役割', permissions: '権限', addToStore: '店舗に追加', save: '権限を保存', cancel: 'キャンセル', remove: '店舗からユーザーを削除', staffNotice: 'Staff：重要な内部情報へのアクセスを制限', staffNoticeBody: '財務、分析、レポート、店舗プロフィール編集、チーム管理は Staff ではロックされます。', staffLockedHint: 'Staff はこの情報・設定にアクセスできません。',
    confirmRemove: 'このユーザーを店舗から削除しますか？', noViewAccess: '店舗チームへのアクセス権がありません', noViewAccessBody: 'Staff はチーム、管理者、財務、分析、レポート、重要設定を閲覧できません。', viewOnly: 'チームは閲覧できますが権限変更はできません', viewOnlyBody: '権限の追加・削除・昇格は Owner のみ行えます。', active: '有効', inactive: '無効', activeAccount: 'このアカウントを有効にする', activeAccountHint: '店舗から削除せずにアクセスだけ一時停止できます。', loading: '読み込み中…', saving: '保存中…', success: '店舗チームを保存しました', invalidEmail: '有効な Melo Chat メールを入力してください。', searchingUsers: 'Meloユーザーを検索中…', noUserMatches: 'このメールに一致するMelo Chatユーザーが見つかりません。', chooseUser: 'このユーザーを選択',
  },
  ko: {
    eyebrow: 'STORE ACCESS', title: '직원 및 관리자', subtitle: 'Melo Chat 이메일로 사용자를 추가하고 개인별 매장 권한을 설정합니다.', owner: 'Owner', admin: 'Admin', manager: 'Manager', staff: 'Staff', storeOwner: '매장 소유자', ownerAllAccess: 'Owner · 전체 권한', team: '매장 팀',
    empty: '아직 직원 또는 관리자가 없습니다', emptyHint: 'Owner가 Melo Chat 이메일로 사용자를 추가하고 권한을 설정할 수 있습니다.', add: '＋ 추가', edit: '권한 편집', addTitle: '매장에 사용자 추가', editTitle: '사용자 권한 편집', modalHint: '사용자는 기존 Melo Chat 계정이 있어야 하며 이메일이 정확히 일치해야 합니다.',
    email: 'Melo Chat 이메일', emailPlaceholder: 'name@example.com', role: '역할', permissions: '권한', addToStore: '매장에 추가', save: '권한 저장', cancel: '취소', remove: '매장에서 사용자 삭제', staffNotice: 'Staff: 중요 내부 권한 제한', staffNoticeBody: '재무, 통계, 보고서, 매장 프로필 편집 및 팀 관리는 Staff에게 잠깁니다.', staffLockedHint: 'Staff는 이 데이터/설정에 접근할 수 없습니다.',
    confirmRemove: '이 사용자를 매장에서 삭제할까요?', noViewAccess: '매장 팀에 접근할 권한이 없습니다', noViewAccessBody: 'Staff는 팀, 관리자, 재무, 통계, 보고서 또는 중요 설정을 볼 수 없습니다.', viewOnly: '팀은 볼 수 있지만 권한을 변경할 수 없습니다', viewOnlyBody: '사용자 추가, 삭제 또는 권한 승격은 Owner만 할 수 있습니다.', active: '활성', inactive: '비활성', activeAccount: '이 계정 활성화', activeAccountHint: '사용자를 삭제하지 않고 매장 접근만 일시 중지합니다.', loading: '불러오는 중…', saving: '저장 중…', success: '매장 팀을 저장했습니다', invalidEmail: '올바른 Melo Chat 계정 이메일을 입력하세요.', searchingUsers: 'Melo 사용자 검색 중…', noUserMatches: '이 이메일과 일치하는 Melo Chat 사용자가 없습니다.', chooseUser: '이 사용자 선택',
  },
};

const PERMISSION_COPY: Record<string, Record<PartnerPermission, string>> = {
  th: { services:'สินค้าและบริการ', sales:'การขาย / ออเดอร์', bookings:'การจอง', coupons:'คูปองและดีล', chat:'แชทร้านค้า', finance:'การเงิน', analytics:'สถิติร้านค้า', reports:'รายงาน', edit_store:'แก้ไขโปรไฟล์ร้านค้า', manage_staff:'จัดการพนักงานและแอดมิน' },
  en: { services:'Products and services', sales:'Sales / Orders', bookings:'Bookings', coupons:'Coupons & Deals', chat:'Partner chat', finance:'Finance', analytics:'Store analytics', reports:'Reports', edit_store:'Edit store profile', manage_staff:'Manage staff and admins' },
  de: { services:'Produkte und Services', sales:'Verkäufe / Bestellungen', bookings:'Buchungen', coupons:'Coupons & Deals', chat:'Partner-Chat', finance:'Finanzen', analytics:'Store-Analysen', reports:'Berichte', edit_store:'Store-Profil bearbeiten', manage_staff:'Mitarbeiter/Admins verwalten' },
  zh: { services:'商品与服务', sales:'销售 / 订单', bookings:'预订', coupons:'优惠券与 Deals', chat:'店铺聊天', finance:'财务', analytics:'店铺统计', reports:'报告', edit_store:'编辑店铺资料', manage_staff:'管理员工和管理员' },
  ja: { services:'商品・サービス', sales:'販売 / 注文', bookings:'予約', coupons:'クーポン・Deal', chat:'店舗チャット', finance:'財務', analytics:'店舗分析', reports:'レポート', edit_store:'店舗プロフィール編集', manage_staff:'スタッフ・管理者の管理' },
  ko: { services:'상품 및 서비스', sales:'판매 / 주문', bookings:'예약', coupons:'쿠폰 및 딜', chat:'파트너 채팅', finance:'재무', analytics:'매장 분석', reports:'보고서', edit_store:'매장 프로필 편집', manage_staff:'직원/관리자 관리' },
};

export default function PartnerStaffExperience() {
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const permissionText = PERMISSION_COPY[locale] ?? PERMISSION_COPY.en;

  const [access, setAccess] = useState<PartnerBusinessAccess | null>(null);
  const [members, setMembers] = useState<PartnerStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerStaffMember | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [permissions, setPermissions] = useState<PartnerPermission[]>(defaultPartnerPermissions('staff'));
  const [isActive, setIsActive] = useState(true);
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [candidates, setCandidates] = useState<PartnerStaffCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<PartnerStaffCandidate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const current = await getActivePartnerBusiness();
      setAccess(current);
      const canView = hasPartnerPermission(current, 'manage_staff');
      setMembers(current && canView ? await listPartnerStaff(current.businessId) : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!modalOpen || editing || !access) {
      setCandidates([]);
      setCandidateLoading(false);
      setCandidateError('');
      return;
    }

    const query = email.trim().toLowerCase();
    if (query.length < 2 || selectedCandidate?.email === query) {
      setCandidates([]);
      setCandidateLoading(false);
      setCandidateError('');
      return;
    }

    let active = true;
    setCandidateLoading(true);
    setCandidateError('');
    const timer = window.setTimeout(() => {
      void searchPartnerStaffCandidates(access.businessId, query)
        .then((rows) => {
          if (!active) return;
          const existingIds = new Set(members.map((member) => member.userId));
          const existingEmails = new Set(members.map((member) => member.email.trim().toLowerCase()));
          setCandidates(rows.filter((item) => !existingIds.has(item.userId) && !existingEmails.has(item.email.trim().toLowerCase())));
          setCandidateOpen(true);
        })
        .catch((cause) => {
          if (!active) return;
          setCandidates([]);
          setCandidateError(cause instanceof Error ? cause.message : String(cause));
          setCandidateOpen(true);
        })
        .finally(() => { if (active) setCandidateLoading(false); });
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [access, editing, email, members, modalOpen, selectedCandidate]);

  const canManage = Boolean(access?.isOwner);
  const canViewTeam = hasPartnerPermission(access, 'manage_staff');
  const summary = useMemo(() => ({
    admin: members.filter((item) => item.role === 'admin' && item.active).length,
    staff: members.filter((item) => (item.role === 'manager' || item.role === 'staff') && item.active).length,
  }), [members]);

  function openAdd() {
    if (!canManage) return;
    setEditing(null);
    setEmail('');
    setRole('staff');
    setPermissions(defaultPartnerPermissions('staff'));
    setIsActive(true);
    setSelectedCandidate(null);
    setCandidates([]);
    setCandidateOpen(false);
    setCandidateError('');
    setError('');
    setMessage('');
    setModalOpen(true);
  }

  function openEdit(member: PartnerStaffMember) {
    if (!canManage) return;
    setEditing(member);
    setEmail(member.email);
    setRole(member.role);
    setPermissions(member.permissions.length ? member.permissions : defaultPartnerPermissions(member.role));
    setIsActive(member.active);
    setSelectedCandidate(null);
    setCandidates([]);
    setCandidateOpen(false);
    setCandidateError('');
    setError('');
    setMessage('');
    setModalOpen(true);
  }

  function chooseCandidate(candidate: PartnerStaffCandidate) {
    setSelectedCandidate(candidate);
    setEmail(candidate.email);
    setCandidateOpen(false);
    setCandidates([]);
    setCandidateError('');
  }

  function changeRole(next: StaffRole) {
    setRole(next);
    setPermissions(defaultPartnerPermissions(next));
  }

  function togglePermission(permission: PartnerPermission) {
    if (isPartnerPermissionLockedForRole(role, permission)) return;
    setPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission]);
  }

  async function save() {
    if (!access || busy) return;
    if (!editing && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t.invalidEmail);
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (editing) {
        await updatePartnerStaff({
          businessId: access.businessId,
          staffMemberId: editing.id,
          role,
          permissions,
          isActive,
        });
      } else {
        await savePartnerStaff(access.businessId, email, role, permissions);
      }
      setModalOpen(false);
      setMessage(t.success);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: PartnerStaffMember) {
    if (!access || !canManage || busy || !window.confirm(t.confirmRemove)) return;
    setBusy(true);
    setError('');
    try {
      await removePartnerStaff(access.businessId, member.id);
      setModalOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className={styles.partnerPage}><div className={styles.loading}>{t.loading}</div></main>;
  }

  return (
    <main className={styles.partnerPage}>
      <PartnerModeHeader access={access} onBusinessChanged={() => void load()} />
      <section className={styles.partnerShell}>
        <header className={styles.staffHero}>
          <div>
            <small>{t.eyebrow}</small>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          {canManage ? <button type="button" className={styles.primaryButton} onClick={openAdd}>{t.add}</button> : null}
        </header>

        {error ? <div className={styles.notice}>{error}</div> : null}
        {message ? <div className={styles.partnerSuccess}>{message}</div> : null}

        {!canViewTeam ? (
          <div className={styles.staffAccessNotice}>
            <strong>{t.noViewAccess}</strong>
            <p>{t.noViewAccessBody}</p>
          </div>
        ) : (
          <>
            <div className={styles.staffStatGrid}>
              <article><strong>1</strong><span>{t.owner}</span></article>
              <article><strong>{summary.admin}</strong><span>{t.admin}</span></article>
              <article><strong>{summary.staff}</strong><span>{t.staff}</span></article>
            </div>

            {!canManage ? (
              <div className={styles.staffAccessNotice}>
                <strong>{t.viewOnly}</strong>
                <p>{t.viewOnlyBody}</p>
              </div>
            ) : null}

            <div className={styles.staffWebGrid}>
              <section>
                <div className={styles.staffSectionTitle}><h2>{t.storeOwner}</h2></div>
                {access ? (
                  <article className={styles.staffOwnerCard}>
                    <Link href={`/users/${access.ownerId}`}><VerifiedUserAvatar userId={access.ownerId} name={access.displayName} size={58} className={styles.staffUserAvatar} /></Link>
                    <div>
                      <Link href={`/users/${access.ownerId}`}>{access.displayName}</Link>
                      <small>{t.ownerAllAccess}</small>
                    </div>
                    <b>OWNER</b>
                  </article>
                ) : null}
              </section>

              <section>
                <div className={styles.staffSectionTitle}>
                  <h2>{t.team}</h2>
                  {canManage ? <button type="button" onClick={openAdd}>{t.add}</button> : null}
                </div>

                <div className={styles.staffMemberGrid}>
                  {members.length ? members.map((member) => {
                    const roleLabel = member.role === 'admin' ? t.admin : member.role === 'manager' ? t.manager : t.staff;
                    const preview = member.permissions.map((permission) => permissionText[permission]).join(' · ');
                    return (
                      <article className={styles.staffMemberCard} key={member.id}>
                        <Link href={`/users/${member.userId}`}><VerifiedUserAvatar userId={member.userId} name={member.displayName || member.email} size={54} className={styles.staffUserAvatar} /></Link>
                        <div className={styles.staffMemberMain}>
                          <div className={styles.staffMemberNameRow}>
                            <Link href={`/users/${member.userId}`}>{member.displayName || member.email}</Link>
                            <span data-role={member.role}>{roleLabel}</span>
                          </div>
                          <small>{member.email}</small>
                          <p>{preview || '-'}</p>
                        </div>
                        <div className={styles.staffMemberStatus} data-active={member.active}>
                          <i />
                          <span>{member.active ? t.active : t.inactive}</span>
                        </div>
                        {canManage ? <button type="button" className={styles.staffEditButton} onClick={() => openEdit(member)}>{t.edit}</button> : null}
                      </article>
                    );
                  }) : (
                    <div className={styles.staffEmptyState}>
                      <span>♟</span><strong>{t.empty}</strong><p>{t.emptyHint}</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </section>

      {modalOpen ? (
        <div className={styles.partnerModalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setModalOpen(false); }}>
          <div className={`${styles.partnerModal} ${styles.staffAccessModal}`}>
            <button type="button" className={styles.partnerModalClose} onClick={() => setModalOpen(false)} disabled={busy}>×</button>
            <div className={styles.staffModalHeader}>
              <small>MELO PARTNER</small>
              <h2>{editing ? t.editTitle : t.addTitle}</h2>
              <p>{t.modalHint}</p>
            </div>

            <div className={styles.staffModalGrid}>
              <div className={styles.staffModalAccountColumn}>
                <div className={styles.staffCandidateField}>
                  <label className={styles.staffField}>
                    <span>{t.email}</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setSelectedCandidate(null);
                        setCandidateOpen(true);
                      }}
                      onFocus={() => { if (!editing && email.trim().length >= 2) setCandidateOpen(true); }}
                      onBlur={() => { window.setTimeout(() => setCandidateOpen(false), 120); }}
                      placeholder={t.emailPlaceholder}
                      disabled={Boolean(editing)}
                      autoComplete="off"
                    />
                  </label>

                  {!editing && candidateOpen && email.trim().length >= 2 ? (
                    <div className={styles.staffCandidateDropdown}>
                      {candidateLoading ? <div className={styles.staffCandidateState}>{t.searchingUsers}</div> : null}
                      {!candidateLoading && candidateError ? <div className={styles.staffCandidateState} data-error="true">{candidateError}</div> : null}
                      {!candidateLoading && !candidateError && candidates.length === 0 ? <div className={styles.staffCandidateState}>{t.noUserMatches}</div> : null}
                      {!candidateLoading && !candidateError ? candidates.map((candidate) => (
                        <button
                          type="button"
                          className={styles.staffCandidateOption}
                          key={candidate.userId}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseCandidate(candidate)}
                        >
                          <VerifiedUserAvatar
                            userId={candidate.userId}
                            name={candidate.displayName || candidate.email}
                            src={candidate.photoPath}
                            country={candidate.country}
                            nationality={candidate.nationality}
                            size={44}
                            badgeSize={15}
                            className={styles.staffCandidateAvatar}
                          />
                          <span>
                            <strong>{candidate.displayName || candidate.email}</strong>
                            <small>{candidate.email}</small>
                          </span>
                          <b>{t.chooseUser}</b>
                        </button>
                      )) : null}
                    </div>
                  ) : null}

                  {!editing && selectedCandidate ? (
                    <div className={styles.staffSelectedCandidate}>
                      <VerifiedUserAvatar
                        userId={selectedCandidate.userId}
                        name={selectedCandidate.displayName || selectedCandidate.email}
                        src={selectedCandidate.photoPath}
                        country={selectedCandidate.country}
                        nationality={selectedCandidate.nationality}
                        size={38}
                        badgeSize={14}
                        className={styles.staffCandidateAvatar}
                      />
                      <span><strong>{selectedCandidate.displayName || selectedCandidate.email}</strong><small>{selectedCandidate.email}</small></span>
                    </div>
                  ) : null}
                </div>

                <div className={styles.rolePicker}>
                  <span>{t.role}</span>
                  <div>
                    {(['admin', 'manager', 'staff'] as StaffRole[]).map((item) => (
                      <button type="button" key={item} data-active={role === item} onClick={() => changeRole(item)}>
                        {item === 'admin' ? t.admin : item === 'manager' ? t.manager : t.staff}
                      </button>
                    ))}
                  </div>
                </div>

                {editing ? (
                  <label className={styles.staffActiveSwitch}>
                    <span><strong>{t.activeAccount}</strong><small>{t.activeAccountHint}</small></span>
                    <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                  </label>
                ) : null}

                {role === 'staff' ? (
                  <div className={styles.staffLockNotice}>
                    <strong>{t.staffNotice}</strong>
                    <p>{t.staffNoticeBody}</p>
                  </div>
                ) : null}
              </div>

              <div className={styles.staffModalPermissionColumn}>
                <div className={styles.permissionHeader}><strong>{t.permissions}</strong></div>
                <div className={styles.permissionGrid}>
                  {PARTNER_PERMISSION_KEYS.map((permission) => {
                    const locked = isPartnerPermissionLockedForRole(role, permission);
                    const selected = !locked && permissions.includes(permission);
                    return (
                      <button
                        type="button"
                        key={permission}
                        data-selected={selected}
                        data-locked={locked}
                        onClick={() => togglePermission(permission)}
                        disabled={locked}
                      >
                        <span>{locked ? '🔒' : selected ? '✓' : ''}</span>
                        <div>
                          <strong>{permissionText[permission]}</strong>
                          {locked ? <small>{t.staffLockedHint}</small> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.staffModalFooter}>
              {editing ? <button type="button" className={styles.staffRemoveButton} onClick={() => void remove(editing)} disabled={busy}>{t.remove}</button> : <span />}
              <div className={styles.modalFooterActions}>
                <button type="button" onClick={() => setModalOpen(false)} disabled={busy}>{t.cancel}</button>
                <button type="button" className={styles.primaryButton} onClick={() => void save()} disabled={busy || (!editing && !email.trim())}>{busy ? t.saving : editing ? t.save : t.addToStore}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

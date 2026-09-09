import type { Locale } from './dictionaries';

type AuthCopy = {
  login: string;
  myAccount: string;
  memberFriend: string;
  memberLove: string;
  memberDeals: string;
  memberPartners: string;
  memberTrips: string;
  memberEvents: string;
  memberCommunity: string;
  memberQuests: string;
  webAccess: string;
  portalKicker: string;
  portalTitle: string;
  portalBody: string;
  portalFeature1: string;
  portalFeature2: string;
  portalFeature3: string;
  email: string;
  password: string;
  confirmPassword: string;
  signIn: string;
  signingIn: string;
  noAccount: string;
  createAccount: string;
  haveAccount: string;
  forgotPassword: string;
  forgotTitle: string;
  forgotBody: string;
  sendReset: string;
  sending: string;
  backToLogin: string;
  registerTitle: string;
  registerBody: string;
  registering: string;
  checkEmail: string;
  resetTitle: string;
  resetBody: string;
  newPassword: string;
  updatePassword: string;
  updating: string;
  accountTitle: string;
  accountBody: string;
  signedInAs: string;
  logout: string;
  profile: string;
  profileBody: string;
  trips: string;
  tripsBody: string;
  partnerWorkspace: string;
  partnerWorkspaceBody: string;
  comingNext: string;
  envMissing: string;
  passwordMismatch: string;
  passwordTooShort: string;
  loginFailed: string;
  registerFailed: string;
  resetSent: string;
  resetFailed: string;
  passwordUpdated: string;
};

export const authCopy: Record<Locale, AuthCopy> = {
  th: {
    login: 'เข้าสู่ระบบ',
    myAccount: 'บัญชีของฉัน',
    memberFriend: 'หาเพื่อน', memberLove: 'หาคู่', memberDeals: 'ดีลพิเศษ', memberPartners: 'พาร์ทเนอร์', memberTrips: 'ทริป', memberEvents: 'กิจกรรม', memberCommunity: 'คอมมูนิตี้', memberQuests: 'ภารกิจ',
    webAccess: 'ใช้งาน Melo บนเว็บ',
    portalKicker: 'MELO WEB',
    portalTitle: 'บัญชีเดียว ใช้งานต่อได้บนเว็บ',
    portalBody: 'เข้าสู่ระบบด้วยบัญชี Melo เดียวกับในแอป เพื่อเตรียมใช้งานโปรไฟล์ ทริป พาร์ทเนอร์ และบริการบนเว็บที่กำลังทยอยเปิดให้ใช้งาน',
    portalFeature1: 'ใช้บัญชี Melo เดิม',
    portalFeature2: 'รองรับ Light / Dark และ 6 ภาษา',
    portalFeature3: 'ออกแบบสำหรับ Desktop, Tablet และ Mobile',
    email: 'อีเมล', password: 'รหัสผ่าน', confirmPassword: 'ยืนยันรหัสผ่าน', signIn: 'เข้าสู่ระบบ', signingIn: 'กำลังเข้าสู่ระบบ…',
    noAccount: 'ยังไม่มีบัญชี?', createAccount: 'สร้างบัญชี Melo', haveAccount: 'มีบัญชีอยู่แล้ว?', forgotPassword: 'ลืมรหัสผ่าน?',
    forgotTitle: 'รีเซ็ตรหัสผ่าน', forgotBody: 'กรอกอีเมลที่ใช้กับ Melo แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่', sendReset: 'ส่งลิงก์รีเซ็ต', sending: 'กำลังส่ง…', backToLogin: 'กลับไปเข้าสู่ระบบ',
    registerTitle: 'สร้างบัญชี Melo', registerBody: 'สมัครด้วยอีเมลเพื่อใช้บัญชีเดียวกันบน Melo App และ Melo Web', registering: 'กำลังสร้างบัญชี…', checkEmail: 'สร้างบัญชีแล้ว โปรดตรวจสอบอีเมลเพื่อยืนยันบัญชี',
    resetTitle: 'ตั้งรหัสผ่านใหม่', resetBody: 'ตั้งรหัสผ่านใหม่สำหรับบัญชี Melo ของคุณ', newPassword: 'รหัสผ่านใหม่', updatePassword: 'อัปเดตรหัสผ่าน', updating: 'กำลังอัปเดต…',
    accountTitle: 'Melo Web', accountBody: 'พื้นที่บัญชีเว็บของคุณ ฟีเจอร์สำหรับผู้ใช้และพาร์ทเนอร์จะทยอยเปิดจากหน้านี้', signedInAs: 'เข้าสู่ระบบเป็น', logout: 'ออกจากระบบ',
    profile: 'โปรไฟล์', profileBody: 'จัดการข้อมูลบัญชีและโปรไฟล์ Melo', trips: 'ทริป & กิจกรรม', tripsBody: 'ดูทริปและกิจกรรมที่เกี่ยวข้องกับบัญชีของคุณ', partnerWorkspace: 'Partner Workspace', partnerWorkspaceBody: 'จัดการร้านค้า ดีล การจอง และการเงินบนจอที่ใหญ่ขึ้น', comingNext: 'กำลังพัฒนาส่วนถัดไป',
    envMissing: 'ยังไม่ได้ตั้งค่า Supabase สำหรับเว็บไซต์ กรุณาเพิ่มค่าในไฟล์ .env.local', passwordMismatch: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน', passwordTooShort: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', loginFailed: 'เข้าสู่ระบบไม่สำเร็จ', registerFailed: 'สร้างบัญชีไม่สำเร็จ', resetSent: 'ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมล', resetFailed: 'ส่งลิงก์รีเซ็ตไม่สำเร็จ', passwordUpdated: 'อัปเดตรหัสผ่านเรียบร้อยแล้ว',
  },
  en: {
    login: 'Log in',
    myAccount: 'My account', memberFriend: 'Find Friends', memberLove: 'Love', memberDeals: 'Special Deals', memberPartners: 'Partners', memberTrips: 'Trips', memberEvents: 'Events', memberCommunity: 'Community', memberQuests: 'Quests', webAccess: 'Use Melo on the web', portalKicker: 'MELO WEB', portalTitle: 'One account, now ready for the web.', portalBody: 'Sign in with the same Melo account you use in the app. Profile, trips, partner tools and more web services will roll out from here.', portalFeature1: 'Use your existing Melo account', portalFeature2: 'Light / Dark and all 6 Melo languages', portalFeature3: 'Designed for desktop, tablet and mobile',
    email: 'Email', password: 'Password', confirmPassword: 'Confirm password', signIn: 'Log in', signingIn: 'Signing in…', noAccount: 'New to Melo?', createAccount: 'Create Melo account', haveAccount: 'Already have an account?', forgotPassword: 'Forgot password?', forgotTitle: 'Reset password', forgotBody: 'Enter the email you use for Melo and we will send you a reset link.', sendReset: 'Send reset link', sending: 'Sending…', backToLogin: 'Back to login', registerTitle: 'Create a Melo account', registerBody: 'Sign up with email and use the same account across Melo App and Melo Web.', registering: 'Creating account…', checkEmail: 'Account created. Check your email to confirm your account.', resetTitle: 'Choose a new password', resetBody: 'Set a new password for your Melo account.', newPassword: 'New password', updatePassword: 'Update password', updating: 'Updating…', accountTitle: 'Melo Web', accountBody: 'Your web account space. User and partner tools will continue to open from here.', signedInAs: 'Signed in as', logout: 'Log out', profile: 'Profile', profileBody: 'Manage your Melo account and profile.', trips: 'Trips & Events', tripsBody: 'See trips and events connected to your account.', partnerWorkspace: 'Partner Workspace', partnerWorkspaceBody: 'Manage stores, deals, bookings and finance on a larger screen.', comingNext: 'Coming in the next phase', envMissing: 'Supabase is not configured for the website yet. Add the values to .env.local.', passwordMismatch: 'The passwords do not match.', passwordTooShort: 'Password must be at least 6 characters.', loginFailed: 'Unable to sign in.', registerFailed: 'Unable to create the account.', resetSent: 'Reset link sent. Please check your email.', resetFailed: 'Unable to send the reset link.', passwordUpdated: 'Password updated successfully.',
  },
  de: {
    login: 'Anmelden',
    myAccount: 'Mein Konto', memberFriend: 'Freunde', memberLove: 'Love', memberDeals: 'Spezialangebote', memberPartners: 'Partner', memberTrips: 'Reisen', memberEvents: 'Events', memberCommunity: 'Community', memberQuests: 'Quests', webAccess: 'Melo im Web nutzen', portalKicker: 'MELO WEB', portalTitle: 'Ein Konto – jetzt auch fürs Web bereit.', portalBody: 'Melde dich mit demselben Melo-Konto wie in der App an. Profil, Reisen, Partner-Tools und weitere Web-Funktionen werden von hier aus erweitert.', portalFeature1: 'Bestehendes Melo-Konto verwenden', portalFeature2: 'Hell / Dunkel und alle 6 Melo-Sprachen', portalFeature3: 'Für Desktop, Tablet und Mobilgeräte',
    email: 'E-Mail', password: 'Passwort', confirmPassword: 'Passwort bestätigen', signIn: 'Anmelden', signingIn: 'Anmeldung…', noAccount: 'Neu bei Melo?', createAccount: 'Melo-Konto erstellen', haveAccount: 'Schon ein Konto?', forgotPassword: 'Passwort vergessen?', forgotTitle: 'Passwort zurücksetzen', forgotBody: 'Gib die E-Mail-Adresse deines Melo-Kontos ein. Wir senden dir einen Link zum Zurücksetzen.', sendReset: 'Reset-Link senden', sending: 'Wird gesendet…', backToLogin: 'Zurück zur Anmeldung', registerTitle: 'Melo-Konto erstellen', registerBody: 'Registriere dich per E-Mail und nutze dasselbe Konto in Melo App und Melo Web.', registering: 'Konto wird erstellt…', checkEmail: 'Konto erstellt. Bitte bestätige es über deine E-Mail.', resetTitle: 'Neues Passwort wählen', resetBody: 'Lege ein neues Passwort für dein Melo-Konto fest.', newPassword: 'Neues Passwort', updatePassword: 'Passwort aktualisieren', updating: 'Wird aktualisiert…', accountTitle: 'Melo Web', accountBody: 'Dein Web-Kontobereich. Weitere Nutzer- und Partner-Funktionen folgen hier.', signedInAs: 'Angemeldet als', logout: 'Abmelden', profile: 'Profil', profileBody: 'Melo-Konto und Profil verwalten.', trips: 'Reisen & Events', tripsBody: 'Reisen und Events deines Kontos ansehen.', partnerWorkspace: 'Partner Workspace', partnerWorkspaceBody: 'Shops, Deals, Buchungen und Finanzen auf größerem Bildschirm verwalten.', comingNext: 'Folgt in der nächsten Phase', envMissing: 'Supabase ist für die Website noch nicht konfiguriert. Werte in .env.local eintragen.', passwordMismatch: 'Die Passwörter stimmen nicht überein.', passwordTooShort: 'Das Passwort muss mindestens 6 Zeichen lang sein.', loginFailed: 'Anmeldung nicht möglich.', registerFailed: 'Konto konnte nicht erstellt werden.', resetSent: 'Reset-Link wurde gesendet. Bitte E-Mail prüfen.', resetFailed: 'Reset-Link konnte nicht gesendet werden.', passwordUpdated: 'Passwort erfolgreich aktualisiert.',
  },
  zh: {
    login: '登录',
    myAccount: '我的账户', memberFriend: '找朋友', memberLove: '恋爱', memberDeals: '特别优惠', memberPartners: '合作伙伴', memberTrips: '行程', memberEvents: '活动', memberCommunity: '社区', memberQuests: '任务', webAccess: '在网页使用 Melo', portalKicker: 'MELO WEB', portalTitle: '一个账户，也能继续在网页使用。', portalBody: '使用与 Melo App 相同的账户登录。个人资料、行程、合作伙伴工具和更多网页服务将从这里逐步开放。', portalFeature1: '使用现有 Melo 账户', portalFeature2: '支持浅色 / 深色与 6 种 Melo 语言', portalFeature3: '适配桌面、平板与手机',
    email: '电子邮箱', password: '密码', confirmPassword: '确认密码', signIn: '登录', signingIn: '正在登录…', noAccount: '还没有 Melo 账户？', createAccount: '创建 Melo 账户', haveAccount: '已有账户？', forgotPassword: '忘记密码？', forgotTitle: '重置密码', forgotBody: '输入你用于 Melo 的邮箱，我们会发送重置密码链接。', sendReset: '发送重置链接', sending: '正在发送…', backToLogin: '返回登录', registerTitle: '创建 Melo 账户', registerBody: '使用邮箱注册，并在 Melo App 与 Melo Web 使用同一账户。', registering: '正在创建账户…', checkEmail: '账户已创建，请检查邮箱并完成确认。', resetTitle: '设置新密码', resetBody: '为你的 Melo 账户设置新密码。', newPassword: '新密码', updatePassword: '更新密码', updating: '正在更新…', accountTitle: 'Melo Web', accountBody: '你的网页账户空间。用户与合作伙伴功能将从这里逐步开放。', signedInAs: '当前登录', logout: '退出登录', profile: '个人资料', profileBody: '管理 Melo 账户与个人资料。', trips: '行程与活动', tripsBody: '查看与你账户相关的行程与活动。', partnerWorkspace: '合作伙伴工作台', partnerWorkspaceBody: '在大屏幕上管理店铺、优惠、预订与财务。', comingNext: '下一阶段开放', envMissing: '网站尚未配置 Supabase，请在 .env.local 中添加配置。', passwordMismatch: '两次输入的密码不一致。', passwordTooShort: '密码至少需要 6 个字符。', loginFailed: '登录失败。', registerFailed: '创建账户失败。', resetSent: '重置链接已发送，请检查邮箱。', resetFailed: '无法发送重置链接。', passwordUpdated: '密码更新成功。',
  },
  ja: {
    login: 'ログイン',
    myAccount: 'マイアカウント', memberFriend: '友だち探し', memberLove: '恋愛', memberDeals: '特別オファー', memberPartners: 'パートナー', memberTrips: '旅', memberEvents: 'イベント', memberCommunity: 'コミュニティ', memberQuests: 'クエスト', webAccess: 'MeloをWebで使う', portalKicker: 'MELO WEB', portalTitle: 'ひとつのアカウントで、Webにもつながる。', portalBody: 'アプリと同じMeloアカウントでログインできます。プロフィール、旅、パートナー機能などを順次Webでも利用できるようにします。', portalFeature1: '既存のMeloアカウントを使用', portalFeature2: 'ライト / ダークとMeloの6言語に対応', portalFeature3: 'デスクトップ・タブレット・モバイル対応',
    email: 'メールアドレス', password: 'パスワード', confirmPassword: 'パスワード確認', signIn: 'ログイン', signingIn: 'ログイン中…', noAccount: 'Meloは初めてですか？', createAccount: 'Meloアカウントを作成', haveAccount: 'すでにアカウントがありますか？', forgotPassword: 'パスワードを忘れた場合', forgotTitle: 'パスワードをリセット', forgotBody: 'Meloで使用しているメールアドレスを入力すると、リセット用リンクを送信します。', sendReset: 'リセットリンクを送信', sending: '送信中…', backToLogin: 'ログインに戻る', registerTitle: 'Meloアカウントを作成', registerBody: 'メールで登録し、Melo AppとMelo Webで同じアカウントを利用できます。', registering: 'アカウント作成中…', checkEmail: 'アカウントを作成しました。メールを確認して認証してください。', resetTitle: '新しいパスワードを設定', resetBody: 'Meloアカウントの新しいパスワードを設定します。', newPassword: '新しいパスワード', updatePassword: 'パスワードを更新', updating: '更新中…', accountTitle: 'Melo Web', accountBody: 'あなたのWebアカウントスペースです。ユーザー・パートナー機能をここから順次追加します。', signedInAs: 'ログイン中', logout: 'ログアウト', profile: 'プロフィール', profileBody: 'Meloアカウントとプロフィールを管理します。', trips: '旅 & イベント', tripsBody: 'アカウントに関連する旅やイベントを確認します。', partnerWorkspace: 'Partner Workspace', partnerWorkspaceBody: '店舗、ディール、予約、財務を大きな画面で管理します。', comingNext: '次のフェーズで対応', envMissing: 'Web用Supabaseが未設定です。.env.local に値を追加してください。', passwordMismatch: 'パスワードが一致しません。', passwordTooShort: 'パスワードは6文字以上にしてください。', loginFailed: 'ログインできませんでした。', registerFailed: 'アカウントを作成できませんでした。', resetSent: 'リセットリンクを送信しました。メールを確認してください。', resetFailed: 'リセットリンクを送信できませんでした。', passwordUpdated: 'パスワードを更新しました。',
  },
  ko: {
    login: '로그인',
    myAccount: '내 계정', memberFriend: '친구 찾기', memberLove: '연애', memberDeals: '특별 딜', memberPartners: '파트너', memberTrips: '여행', memberEvents: '이벤트', memberCommunity: '커뮤니티', memberQuests: '퀘스트', webAccess: '웹에서 Melo 사용하기', portalKicker: 'MELO WEB', portalTitle: '하나의 계정으로 웹에서도 이어집니다.', portalBody: '앱에서 사용하던 Melo 계정으로 로그인하세요. 프로필, 여행, 파트너 도구와 더 많은 웹 기능을 이곳에서 순차적으로 제공합니다.', portalFeature1: '기존 Melo 계정 사용', portalFeature2: '라이트 / 다크 및 Melo 6개 언어 지원', portalFeature3: '데스크톱, 태블릿, 모바일 대응',
    email: '이메일', password: '비밀번호', confirmPassword: '비밀번호 확인', signIn: '로그인', signingIn: '로그인 중…', noAccount: 'Melo가 처음인가요?', createAccount: 'Melo 계정 만들기', haveAccount: '이미 계정이 있나요?', forgotPassword: '비밀번호를 잊으셨나요?', forgotTitle: '비밀번호 재설정', forgotBody: 'Melo에 사용하는 이메일을 입력하면 재설정 링크를 보내드립니다.', sendReset: '재설정 링크 보내기', sending: '전송 중…', backToLogin: '로그인으로 돌아가기', registerTitle: 'Melo 계정 만들기', registerBody: '이메일로 가입하고 Melo App과 Melo Web에서 같은 계정을 사용하세요.', registering: '계정 생성 중…', checkEmail: '계정을 만들었습니다. 이메일을 확인해 계정을 인증해 주세요.', resetTitle: '새 비밀번호 설정', resetBody: 'Melo 계정에 사용할 새 비밀번호를 설정하세요.', newPassword: '새 비밀번호', updatePassword: '비밀번호 변경', updating: '변경 중…', accountTitle: 'Melo Web', accountBody: '웹 계정 공간입니다. 사용자 및 파트너 기능을 이곳에서 순차적으로 제공합니다.', signedInAs: '로그인 계정', logout: '로그아웃', profile: '프로필', profileBody: 'Melo 계정과 프로필을 관리합니다.', trips: '여행 & 이벤트', tripsBody: '계정과 연결된 여행과 이벤트를 확인합니다.', partnerWorkspace: 'Partner Workspace', partnerWorkspaceBody: '매장, 딜, 예약, 재무를 큰 화면에서 관리합니다.', comingNext: '다음 단계에서 제공', envMissing: '웹용 Supabase가 아직 설정되지 않았습니다. .env.local에 값을 추가하세요.', passwordMismatch: '비밀번호가 일치하지 않습니다.', passwordTooShort: '비밀번호는 최소 6자 이상이어야 합니다.', loginFailed: '로그인할 수 없습니다.', registerFailed: '계정을 만들 수 없습니다.', resetSent: '재설정 링크를 보냈습니다. 이메일을 확인해 주세요.', resetFailed: '재설정 링크를 보내지 못했습니다.', passwordUpdated: '비밀번호가 변경되었습니다.',
  },
};

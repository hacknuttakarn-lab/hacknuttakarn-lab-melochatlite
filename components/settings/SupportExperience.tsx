'use client';

import Link from 'next/link';

import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import type { Locale } from '@/i18n/dictionaries';

import styles from './SupportExperience.module.css';

type SupportCopy = {
  eyebrow: string;

  title: string;
  subtitle: string;

  back: string;

  contactTitle: string;
  contactBody: string;
  emailButton: string;

  faqTitle: string;

  loginTitle: string;
  loginBody: string;

  verificationTitle: string;
  verificationBody: string;

  safetyTitle: string;
  safetyBody: string;

  deleteTitle: string;
  deleteBody: string;
};

const SUPPORT_EMAIL =
  'melochat.official@gmail.com';

const COPY: Record<
  Locale,
  SupportCopy
> = {
  th: {
    eyebrow:
      'MELO SUPPORT',

    title:
      'ช่วยเหลือและติดต่อเรา',

    subtitle:
      'คำถามที่พบบ่อยและช่องทางติดต่อทีมงาน Melo Chat',

    back:
      'กลับไปตั้งค่า',

    contactTitle:
      'ติดต่อทีมงาน',

    contactBody:
      'ส่งอีเมลถึงทีมสนับสนุน พร้อมระบุอีเมลบัญชีและรายละเอียดปัญหา',

    emailButton:
      'ส่งอีเมลถึงทีมงาน',

    faqTitle:
      'คำถามที่พบบ่อย',

    loginTitle:
      'เข้าสู่ระบบหรือรีเซ็ตรหัสผ่านไม่ได้',

    loginBody:
      'ใช้เมนูลืมรหัสผ่านในหน้าเข้าสู่ระบบ และตรวจสอบว่าอีเมลหรือเบอร์โทรตรงกับบัญชีที่สมัครไว้',

    verificationTitle:
      'ติดตามผลการยืนยันตัวตนหรือบริษัท',

    verificationBody:
      'เปิดหน้าการยืนยันที่เกี่ยวข้องเพื่อตรวจสถานะ หากถูกขอข้อมูลเพิ่มเติมให้ส่งเอกสารใหม่จากหน้านั้น',

    safetyTitle:
      'ต้องการรายงานผู้ใช้หรือเหตุการณ์ไม่ปลอดภัย',

    safetyBody:
      'ใช้เมนูรายงานจากโปรไฟล์ แชท โพสต์ หรือรีวิว หากเป็นเหตุฉุกเฉินให้ติดต่อหน่วยงานฉุกเฉินในพื้นที่ก่อน',

    deleteTitle:
      'ต้องการลบบัญชีและข้อมูลส่วนตัว',

    deleteBody:
      'ไปที่การตั้งค่า → ความเป็นส่วนตัวและข้อมูลส่วนบุคคล แล้วกดส่งคำขอลบบัญชี',
  },

  en: {
    eyebrow:
      'MELO SUPPORT',

    title:
      'Help & contact us',

    subtitle:
      'Frequently asked questions and ways to contact the Melo Chat team',

    back:
      'Back to settings',

    contactTitle:
      'Contact the team',

    contactBody:
      'Email our support team and include your account email and details of the problem.',

    emailButton:
      'Email the team',

    faqTitle:
      'Frequently asked questions',

    loginTitle:
      'I cannot sign in or reset my password',

    loginBody:
      'Use Forgot password on the sign-in page and make sure the email address or phone number matches the account you registered.',

    verificationTitle:
      'How do I follow up on identity or business verification?',

    verificationBody:
      'Open the relevant verification page to check the status. If more information is requested, submit the new documents from that page.',

    safetyTitle:
      'I need to report a user or an unsafe incident',

    safetyBody:
      'Use Report from the profile, chat, post, or review. For an emergency, contact the local emergency services in your area first.',

    deleteTitle:
      'I want to delete my account and personal data',

    deleteBody:
      'Go to Settings → Privacy & personal data, then submit an account deletion request.',
  },

  de: {
    eyebrow:
      'MELO SUPPORT',

    title:
      'Hilfe & Kontakt',

    subtitle:
      'Häufige Fragen und Kontaktmöglichkeiten zum Melo-Chat-Team',

    back:
      'Zurück zu Einstellungen',

    contactTitle:
      'Team kontaktieren',

    contactBody:
      'Sende dem Support eine E-Mail und gib deine Konto-E-Mail sowie eine Beschreibung des Problems an.',

    emailButton:
      'E-Mail an das Team',

    faqTitle:
      'Häufig gestellte Fragen',

    loginTitle:
      'Anmeldung oder Passwort-Zurücksetzen funktioniert nicht',

    loginBody:
      'Nutze „Passwort vergessen“ auf der Anmeldeseite und prüfe, ob E-Mail-Adresse oder Telefonnummer mit dem registrierten Konto übereinstimmen.',

    verificationTitle:
      'Status der Identitäts- oder Unternehmensprüfung prüfen',

    verificationBody:
      'Öffne die entsprechende Verifizierungsseite. Falls weitere Angaben angefordert werden, reiche die neuen Dokumente dort ein.',

    safetyTitle:
      'Nutzer oder unsicheren Vorfall melden',

    safetyBody:
      'Nutze die Meldefunktion im Profil, Chat, Beitrag oder in einer Bewertung. In einem Notfall kontaktiere zuerst die örtlichen Notdienste.',

    deleteTitle:
      'Konto und persönliche Daten löschen',

    deleteBody:
      'Gehe zu Einstellungen → Datenschutz & persönliche Daten und sende dort eine Kontolöschanfrage.',
  },

  zh: {
    eyebrow:
      'MELO SUPPORT',

    title:
      '帮助与联系我们',

    subtitle:
      '常见问题以及联系 Melo Chat 团队的方式',

    back:
      '返回设置',

    contactTitle:
      '联系团队',

    contactBody:
      '请发送邮件给支持团队，并注明你的账户邮箱和问题详情。',

    emailButton:
      '发送邮件给团队',

    faqTitle:
      '常见问题',

    loginTitle:
      '无法登录或重置密码',

    loginBody:
      '请在登录页面使用“忘记密码”，并确认邮箱地址或手机号与注册账户一致。',

    verificationTitle:
      '如何查看身份或企业认证进度？',

    verificationBody:
      '打开对应的认证页面查看状态。如果系统要求补充资料，请从该页面重新提交文件。',

    safetyTitle:
      '需要举报用户或不安全事件',

    safetyBody:
      '可在个人资料、聊天、帖子或评价中使用举报功能。如遇紧急情况，请先联系当地紧急服务机构。',

    deleteTitle:
      '想删除账户和个人数据',

    deleteBody:
      '前往 设置 → 隐私和个人数据，然后提交账户删除申请。',
  },

  ja: {
    eyebrow:
      'MELO SUPPORT',

    title:
      'ヘルプ・お問い合わせ',

    subtitle:
      'よくある質問と Melo Chat チームへのお問い合わせ方法',

    back:
      '設定へ戻る',

    contactTitle:
      'チームに連絡',

    contactBody:
      'サポートへメールを送り、アカウントのメールアドレスと問題の詳細を記載してください。',

    emailButton:
      'チームにメールする',

    faqTitle:
      'よくある質問',

    loginTitle:
      'ログインまたはパスワードのリセットができない',

    loginBody:
      'ログイン画面の「パスワードを忘れた場合」を使用し、メールアドレスまたは電話番号が登録したアカウントと一致しているか確認してください。',

    verificationTitle:
      '本人確認・企業確認の進捗を確認したい',

    verificationBody:
      '該当する確認ページを開いてステータスを確認してください。追加情報を求められた場合は、そのページから新しい書類を提出してください。',

    safetyTitle:
      'ユーザーや危険な出来事を報告したい',

    safetyBody:
      'プロフィール、チャット、投稿、レビューから報告機能を使用してください。緊急の場合は、まず地域の緊急機関へ連絡してください。',

    deleteTitle:
      'アカウントと個人データを削除したい',

    deleteBody:
      '設定 → プライバシーと個人データ からアカウント削除申請を送信してください。',
  },

  ko: {
    eyebrow:
      'MELO SUPPORT',

    title:
      '도움말 및 문의',

    subtitle:
      '자주 묻는 질문과 Melo Chat 팀에 문의하는 방법',

    back:
      '설정으로 돌아가기',

    contactTitle:
      '팀에 문의',

    contactBody:
      '지원팀에 이메일을 보내고 계정 이메일과 문제 세부정보를 함께 적어 주세요.',

    emailButton:
      '팀에 이메일 보내기',

    faqTitle:
      '자주 묻는 질문',

    loginTitle:
      '로그인 또는 비밀번호 재설정이 되지 않아요',

    loginBody:
      '로그인 화면의 비밀번호 찾기를 사용하고 이메일 주소 또는 전화번호가 가입한 계정과 일치하는지 확인하세요.',

    verificationTitle:
      '본인 인증 또는 사업자 인증 진행 상태를 확인하고 싶어요',

    verificationBody:
      '관련 인증 페이지를 열어 상태를 확인하세요. 추가 정보가 요청된 경우 해당 페이지에서 새 서류를 제출하세요.',

    safetyTitle:
      '사용자 또는 안전하지 않은 상황을 신고하고 싶어요',

    safetyBody:
      '프로필, 채팅, 게시물 또는 리뷰에서 신고 메뉴를 사용하세요. 긴급 상황이라면 먼저 지역 응급기관에 연락하세요.',

    deleteTitle:
      '계정과 개인 데이터를 삭제하고 싶어요',

    deleteBody:
      '설정 → 개인정보 및 개인 데이터에서 계정 삭제 요청을 제출하세요.',
  },
};

export default function SupportExperience() {
  const {
    locale,
  } = useLocale();

  const t =
    COPY[locale] ??
    COPY.en;

  const faq = [
    {
      title:
        t.loginTitle,

      body:
        t.loginBody,
    },

    {
      title:
        t.verificationTitle,

      body:
        t.verificationBody,
    },

    {
      title:
        t.safetyTitle,

      body:
        t.safetyBody,
    },

    {
      title:
        t.deleteTitle,

      body:
        t.deleteBody,
    },
  ];

  return (
    <main
      className={
        styles.page
      }
    >
      <Header />

      <section
        className={
          styles.shell
        }
      >
        <div
          className={
            styles.topbar
          }
        >
          <Link
            href="/settings"
            className={
              styles.backButton
            }
            aria-label={
              t.back
            }
          >
            <span
              aria-hidden="true"
            >
              ‹
            </span>

            <strong>
              {t.back}
            </strong>
          </Link>
        </div>

        <header
          className={
            styles.pageHeader
          }
        >
          <span>
            {t.eyebrow}
          </span>

          <h1>
            {t.title}
          </h1>

          <p>
            {t.subtitle}
          </p>
        </header>

        <section
          className={
            styles.contactCard
          }
        >
          <div
            className={
              styles.contactIcon
            }
            aria-hidden="true"
          >
            ?
          </div>

          <div
            className={
              styles.contactCopy
            }
          >
            <h2>
              {
                t.contactTitle
              }
            </h2>

            <p>
              {
                t.contactBody
              }
            </p>

            <a
              className={
                styles.emailText
              }
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {
                SUPPORT_EMAIL
              }
            </a>
          </div>

          <a
            className={
              styles.emailButton
            }
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            <span
              aria-hidden="true"
            >
              ✉
            </span>

            {
              t.emailButton
            }
          </a>
        </section>

        <section
          className={
            styles.faqSection
          }
        >
          <h2>
            {t.faqTitle}
          </h2>

          <div
            className={
              styles.faqGrid
            }
          >
            {faq.map(
              (
                item,
              ) => (
                <article
                  key={
                    item.title
                  }
                  className={
                    styles.faqCard
                  }
                >
                  <h3>
                    {
                      item.title
                    }
                  </h3>

                  <p>
                    {
                      item.body
                    }
                  </p>
                </article>
              ),
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
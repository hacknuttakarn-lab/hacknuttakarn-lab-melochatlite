'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';

const copy = {
  en: {
    eyebrow: 'MEANINGFUL CONNECTIONS START HERE',
    title1: 'Meet. Match.', title2: 'Connect.',
    body: 'Discover meaningful connections, share your moments, and start conversations that can grow into something real.',
    start: 'Get Started', login: 'Log in',
    trust1: 'Dating focused', trust2: 'Verified profiles', trust3: 'Built-in translation',
    featuresKicker: 'MELO CHAT', featuresTitle: 'Everything you need to connect',
    featuresBody: 'From discovering someone new to staying in touch, Melo keeps dating, sharing and conversation simple in one place.',
    cards: [
      ['♡','Discover & Match','Find people who fit what you are looking for, then Like, Save or Match.'],
      ['▤','Feed & Posts','Share moments, discover posts and get to know people beyond their dating profile.'],
      ['◌','Chat & Translation','Chat after you connect and translate messages directly in the conversation.'],
      ['✓','Identity Verification','Build more trust with profile verification and secure document submission.'],
      ['✦','Premium','Unlock package features and manage your plan from one account.'],
      ['●','Live Notifications','Stay updated with chat messages, matches, likes and important account activity.'],
    ],
    footer: 'Meet. Match. Connect.',
  },
  th: {
    eyebrow: 'จุดเริ่มต้นของความสัมพันธ์ที่มีความหมาย',
    title1: 'พบเจอ จับคู่', title2: 'และเชื่อมต่อ',
    body: 'ค้นหาคนที่ใช่ แชร์เรื่องราวของคุณ และเริ่มต้นบทสนทนาที่อาจพัฒนาไปเป็นความสัมพันธ์ที่มีความหมาย',
    start: 'เริ่มต้นใช้งาน', login: 'เข้าสู่ระบบ',
    trust1: 'เน้นการหาคู่', trust2: 'โปรไฟล์ยืนยันตัวตน', trust3: 'แปลภาษาในแชท',
    featuresKicker: 'MELO CHAT', featuresTitle: 'ทุกสิ่งที่จำเป็นสำหรับการเริ่มต้นความสัมพันธ์',
    featuresBody: 'ตั้งแต่การค้นหาคนใหม่ ไปจนถึงการทำความรู้จักและพูดคุย Melo รวมการหาคู่ ฟีด และแชทไว้ในที่เดียว',
    cards: [
      ['♡','ค้นหาและจับคู่','ค้นหาคนที่ตรงกับสิ่งที่คุณมองหา พร้อม Like, บันทึก และ Match'],
      ['▤','ฟีดและโพสต์','แชร์ช่วงเวลาของคุณ ดูโพสต์ และทำความรู้จักกันมากกว่าแค่ข้อมูลในโปรไฟล์'],
      ['◌','แชทและแปลภาษา','พูดคุยหลังจากเชื่อมต่อ และแปลข้อความได้โดยตรงภายในห้องแชท'],
      ['✓','ยืนยันตัวตน','เพิ่มความน่าเชื่อถือด้วยการยืนยันโปรไฟล์และระบบแนบเอกสาร'],
      ['✦','แพ็กเกจ Premium','ปลดล็อกฟีเจอร์เพิ่มเติมและจัดการแพ็กเกจของคุณได้ในบัญชีเดียว'],
      ['●','แจ้งเตือนแบบเรียลไทม์','รับการแจ้งเตือนแชท Match Like และกิจกรรมสำคัญของบัญชี'],
    ],
    footer: 'พบเจอ จับคู่ และเชื่อมต่อ',
  },
  de: {
    eyebrow: 'BEDEUTSAME VERBINDUNGEN BEGINNEN HIER',
    title1: 'Treffen. Matchen.', title2: 'Verbinden.',
    body: 'Entdecke Menschen, die zu dir passen, teile deine Momente und beginne Gespräche, aus denen etwas Echtes entstehen kann.',
    start: 'Jetzt starten', login: 'Anmelden',
    trust1: 'Dating im Fokus', trust2: 'Verifizierte Profile', trust3: 'Integrierte Übersetzung',
    featuresKicker: 'MELO CHAT', featuresTitle: 'Alles, was du für echte Verbindungen brauchst',
    featuresBody: 'Vom ersten Entdecken bis zum Gespräch vereint Melo Dating, Feed und Chat an einem Ort.',
    cards: [
      ['♡','Entdecken & Matchen','Finde passende Menschen und nutze Like, Speichern oder Match.'],
      ['▤','Feed & Beiträge','Teile Momente und lerne Menschen über ihr Dating-Profil hinaus kennen.'],
      ['◌','Chat & Übersetzung','Chatte nach dem Match und übersetze Nachrichten direkt im Gespräch.'],
      ['✓','Identitätsprüfung','Schaffe mehr Vertrauen durch Profilprüfung und sichere Dokumente.'],
      ['✦','Premium','Schalte Paketfunktionen frei und verwalte deinen Tarif zentral.'],
      ['●','Live-Benachrichtigungen','Bleibe über Chats, Matches, Likes und Kontoaktivitäten informiert.'],
    ],
    footer: 'Treffen. Matchen. Verbinden.',
  },
} as const;

export default function HomePage() {
  const { locale } = useLocale();
  const c = copy[locale === 'th' || locale === 'de' ? locale : 'en'];

  return (
    <main>
      <Header />
      <section className="heroV2 shell meloLiteHero" id="home">
        <div className="heroV2Copy">
          <div className="eyebrow"><span className="pulseDot" /> {c.eyebrow}</div>
          <h1>{c.title1}<br /><span>{c.title2}</span></h1>
          <p className="heroLead">{c.body}</p>
          <div className="heroActions">
            <Link className="button primary" href="/register">{c.start}</Link>
            <Link className="button secondary" href="/login">{c.login}</Link>
          </div>
          <div className="heroTrust">
            <span><b>✓</b>{c.trust1}</span><span><b>✓</b>{c.trust2}</span><span><b>✓</b>{c.trust3}</span>
          </div>
        </div>

        <div className="meloStage meloLiteStage" aria-label="Melo Chat dating preview">
          <div className="stageGlow stageGlowBlue" /><div className="stageGlow stageGlowViolet" />
          <article className="floatCard floatTrip meloLiteMatchCard"><small>♡ MATCH</small><strong>Mina, 27</strong><span>92% match</span></article>
          <article className="floatCard floatCommunity meloLiteChatCard"><div><small>Chat · Translate</small><strong>Hi! Nice to meet you ✦</strong></div></article>
          <div className="phoneV2 phoneV2Back meloLiteBackPhone">
            <div className="phoneNotch" /><div className="phoneBar"><b>9:41</b><span>● ● ●</span></div>
            <div className="mockHeader"><Image src="/melo-logo.png" alt="Melo Chat" width={34} height={34}/><div><strong>Melo Chat</strong><small>Feed</small></div></div>
            <div className="meloLiteFeedMock"><div className="meloLiteFeedAvatar">N</div><div><strong>Nana</strong><small>Shared a new moment</small></div><div className="meloLiteFeedPhoto">♡</div></div>
          </div>
          <div className="phoneV2 phoneV2Front">
            <div className="phoneNotch" /><div className="phoneBar"><b>9:41</b><span>● ● ●</span></div>
            <div className="mockHeader"><Image src="/melo-logo.png" alt="Melo Chat" width={34} height={34} priority/><div><strong>Melo Chat</strong><small>Discover people nearby</small></div><span className="roundIcon">✦</span></div>
            <div className="modePills meloLiteMode"><b>Love</b></div>
            <div className="connectCard"><div className="connectPhoto"><div className="connectBadges"><span>✓ Verified</span><span>⌖ 4.2 km</span></div><div className="connectProfile"><strong>Mina, 27</strong><small>Coffee · Music · Art</small></div></div><div className="connectActions"><button>×</button><button>☆</button><button>♥</button></div></div>
            <div className="mockNav"><span>⌂</span><span>▤</span><b>♡</b><span>◌</span><span>○</span></div>
          </div>
        </div>
      </section>

      <section className="section shell meloLiteFeatures">
        <div className="sectionHeading centeredHeading"><span className="sectionKicker">{c.featuresKicker}</span><h2>{c.featuresTitle}</h2><p>{c.featuresBody}</p></div>
        <div className="meloLiteFeatureGrid">{c.cards.map(([icon,title,body]) => <article className="featureCardV2" key={title}><div className="featureIconV2">{icon}</div><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
      </section>

      <section className="section shell"><div className="downloadPanelV2 meloLiteCta"><Image src="/melo-logo.png" alt="Melo Chat" width={72} height={72}/><span className="sectionKicker">MELO CHAT</span><h2>{c.title1} {c.title2}</h2><p>{c.body}</p><div className="heroActions"><Link className="button primary" href="/register">{c.start}</Link><Link className="button secondary" href="/login">{c.login}</Link></div></div></section>
      <footer className="footerV2"><div className="shell footerInner"><div className="footerBrand"><Image src="/melo-logo.png" alt="Melo Chat" width={42} height={42}/><div><strong>Melo Chat</strong><small>{c.footer}</small></div></div><span className="copyright">© 2026 Melo Chat</span></div></footer>
    </main>
  );
}

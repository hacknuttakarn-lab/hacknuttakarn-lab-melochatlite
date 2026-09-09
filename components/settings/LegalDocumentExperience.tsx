'use client';

import Link from 'next/link';

import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';

import styles from './LegalDocumentExperience.module.css';

type LegalDocumentType =
  | 'privacy'
  | 'terms';

type LegalLocale =
  | 'th'
  | 'en'
  | 'de'
  | 'zh'
  | 'ja'
  | 'ko';

type LegalSection = {
  title: string;
  body: string;
};

type LegalDocumentCopy = {
  eyebrow: string;

  title: string;

  subtitle: string;

  draftLabel: string;

  draftNotice: string;

  updatedLabel: string;

  updatedDate: string;

  contents: string;

  backPrivacy: string;

  privacyDocument: string;

  termsDocument: string;

  related: string;

  sections: LegalSection[];
};

type LegalCopySet = {
  privacy: LegalDocumentCopy;
  terms: LegalDocumentCopy;
};

function safeLocale(
  value: string,
): LegalLocale {
  if (
    value === 'th' ||
    value === 'en' ||
    value === 'de' ||
    value === 'zh' ||
    value === 'ja' ||
    value === 'ko'
  ) {
    return value;
  }

  return 'en';
}

const LEGAL_COPY: Record<
  LegalLocale,
  LegalCopySet
> = {
  th: {
    privacy: {
      eyebrow:
        'MELO LEGAL',

      title:
        'นโยบายความเป็นส่วนตัว',

      subtitle:
        'รายละเอียดเกี่ยวกับข้อมูลที่ Melo Chat เก็บ วิธีใช้งานข้อมูล การแบ่งปัน ความปลอดภัย และสิทธิ์ของคุณ',

      draftLabel:
        'เอกสารฉบับเตรียมเปิดใช้งาน',

      draftNotice:
        'เอกสารภายในแอปนี้เป็นฉบับเตรียมเปิดใช้งาน ควรให้ผู้เชี่ยวชาญตรวจและเผยแพร่บนเว็บไซต์ก่อนส่ง Store',

      updatedLabel:
        'ปรับปรุงล่าสุด',

      updatedDate:
        '7 สิงหาคม 2026',

      contents:
        'สารบัญ',

      backPrivacy:
        'กลับไปความเป็นส่วนตัวและข้อมูลส่วนบุคคล',

      privacyDocument:
        'นโยบายความเป็นส่วนตัว',

      termsDocument:
        'ข้อกำหนดการใช้งาน',

      related:
        'เอกสารที่เกี่ยวข้อง',

      sections: [
        {
          title:
            'ข้อมูลที่เราเก็บ',

          body:
            'Melo Chat อาจเก็บข้อมูลบัญชีและโปรไฟล์ รูปภาพ ข้อความและคำแปล ตำแหน่งโดยประมาณหรือพิกัดเมื่อคุณเปิดใช้ Trip, Nearby, Live Location หรือ Safety ข้อมูล Trip, Event, Community การชำระเงิน การยืนยันตัวตน รายงานความปลอดภัย และข้อมูลวินิจฉัยแอป',
        },

        {
          title:
            'วัตถุประสงค์การใช้ข้อมูล',

          body:
            'เราใช้ข้อมูลเพื่อให้บริการจับคู่ หาเพื่อน แชท แปลภาษา กิจกรรมและการเดินทาง ปรับปรุงความปลอดภัย ป้องกันสแปมและการทุจริต ให้บริการสมาชิก และแก้ไขข้อผิดพลาดของระบบ',
        },

        {
          title:
            'การแบ่งปันข้อมูล',

          body:
            'ข้อมูลจะแสดงแก่ผู้ใช้อื่นตามการตั้งค่าความเป็นส่วนตัวและกิจกรรมที่คุณเข้าร่วม ผู้ให้บริการระบบ เช่น Supabase, Google Maps, Translation, Push Notification และระบบชำระเงิน อาจประมวลผลข้อมูลเท่าที่จำเป็นต่อบริการ',
        },

        {
          title:
            'ตำแหน่งและความปลอดภัย',

          body:
            'ฟังก์ชันที่ใช้พิกัดจะทำงานเมื่อคุณอนุญาตเท่านั้น Live Location มีช่วงเวลาจำกัดและควรแชร์เฉพาะกับบุคคลที่ไว้ใจได้ การแจ้ง SOS ไม่ทดแทนบริการฉุกเฉินของหน่วยงานรัฐ',
        },

        {
          title:
            'การเก็บรักษาและสิทธิ์ของคุณ',

          body:
            'คุณสามารถแก้ไขข้อมูล ดาวน์โหลดสำเนาข้อมูล หรือเริ่มนับถอยหลังลบบัญชี 7 วันได้จาก Settings โดยไม่ต้องรอแอดมินอนุมัติ ข้อมูลบางส่วนอาจเก็บไว้ตามระยะเวลาที่จำเป็นเพื่อความปลอดภัย ป้องกันการทุจริต ระงับข้อพิพาท หรือปฏิบัติตามกฎหมาย',
        },

        {
          title:
            'ติดต่อเรา',

          body:
            'ก่อนเปิดใช้งานจริง ให้ระบุอีเมลฝ่ายสนับสนุนและ URL นโยบายความเป็นส่วนตัวที่ตรวจสอบแล้วในค่าระบบของโปรเจกต์',
        },
      ],
    },

    terms: {
      eyebrow:
        'MELO LEGAL',

      title:
        'ข้อกำหนดการใช้งาน',

      subtitle:
        'ข้อกำหนดพื้นฐานสำหรับการใช้ Melo Chat อย่างเหมาะสม ปลอดภัย และเคารพผู้ใช้อื่น',

      draftLabel:
        'เอกสารฉบับเตรียมเปิดใช้งาน',

      draftNotice:
        'เอกสารภายในแอปนี้เป็นฉบับเตรียมเปิดใช้งาน ควรให้ผู้เชี่ยวชาญตรวจและเผยแพร่บนเว็บไซต์ก่อนส่ง Store',

      updatedLabel:
        'ปรับปรุงล่าสุด',

      updatedDate:
        '7 สิงหาคม 2026',

      contents:
        'สารบัญ',

      backPrivacy:
        'กลับไปความเป็นส่วนตัวและข้อมูลส่วนบุคคล',

      privacyDocument:
        'นโยบายความเป็นส่วนตัว',

      termsDocument:
        'ข้อกำหนดการใช้งาน',

      related:
        'เอกสารที่เกี่ยวข้อง',

      sections: [
        {
          title:
            'อายุและคุณสมบัติผู้ใช้',

          body:
            'ผู้ใช้ต้องมีอายุอย่างน้อย 18 ปี ให้ข้อมูลที่ถูกต้อง และใช้บัญชีของตนเองเท่านั้น',
        },

        {
          title:
            'การใช้งานที่ยอมรับได้',

          body:
            'ห้ามคุกคาม หลอกลวง สแปม แอบอ้าง เผยแพร่เนื้อหาผิดกฎหมาย ละเมิดสิทธิ์ผู้อื่น ขอข้อมูลลับ หรือใช้ระบบเพื่อการค้าหรืออัตโนมัติโดยไม่ได้รับอนุญาต',
        },

        {
          title:
            'ความปลอดภัยในการพบปะและเดินทาง',

          body:
            'ผู้ใช้ต้องประเมินความเสี่ยงด้วยตนเอง พบกันในสถานที่ปลอดภัย แจ้งบุคคลที่ไว้ใจ และปฏิบัติตามกฎหมายท้องถิ่น ผู้จัด Trip และ Event ต้องให้ข้อมูลที่ชัดเจนและไม่ทำให้สมาชิกเข้าใจผิด',
        },

        {
          title:
            'เนื้อหาของผู้ใช้',

          body:
            'คุณยังคงเป็นเจ้าของเนื้อหาของตนเอง แต่ให้สิทธิ์ Melo Chat ประมวลผลและแสดงเนื้อหาเท่าที่จำเป็นต่อการให้บริการและการตั้งค่าที่คุณเลือก',
        },

        {
          title:
            'แพ็กเกจและการชำระเงิน',

          body:
            'ราคา เครดิตแปลภาษา การต่ออายุ การคืนเงิน และสิทธิประโยชน์ต้องเป็นไปตามข้อมูลที่แสดงในแอปและเงื่อนไขของ Store หรือผู้ให้บริการชำระเงิน',
        },

        {
          title:
            'การระงับและยุติบัญชี',

          body:
            'เราอาจจำกัด ระงับ หรือลบบัญชีที่ละเมิดข้อกำหนด เป็นอันตรายต่อผู้อื่น หรือจำเป็นต่อการรักษาความปลอดภัยของระบบ ผู้ใช้สามารถรายงานหรือโต้แย้งการดำเนินการได้ตามช่องทางที่จัดไว้',
        },
      ],
    },
  },

  en: {
    privacy: {
      eyebrow:
        'MELO LEGAL',

      title:
        'Privacy Policy',

      subtitle:
        'Information about what Melo Chat collects, how information is used and shared, safety features, and your rights.',

      draftLabel:
        'Pre-launch document',

      draftNotice:
        'This in-app document is a pre-launch draft. It should be reviewed by an appropriate specialist and published on the website before Store submission.',

      updatedLabel:
        'Last updated',

      updatedDate:
        '7 August 2026',

      contents:
        'Contents',

      backPrivacy:
        'Back to Privacy & personal data',

      privacyDocument:
        'Privacy Policy',

      termsDocument:
        'Terms of Use',

      related:
        'Related document',

      sections: [
        {
          title:
            'Information we collect',

          body:
            'Melo Chat may collect account and profile information, photos, messages and translations, approximate location or precise coordinates when you enable Trip, Nearby, Live Location or Safety, Trip, Event and Community information, payments, identity verification, safety reports, and app diagnostic information.',
        },

        {
          title:
            'How we use information',

          body:
            'We use information to provide matching, friendship discovery, chat, translation, activities and travel features, improve safety, prevent spam and fraud, provide membership services, and resolve system errors.',
        },

        {
          title:
            'Information sharing',

          body:
            'Information may be shown to other users according to your privacy settings and activities you join. Service providers such as Supabase, Google Maps, Translation, Push Notification and payment systems may process information only as necessary to provide the service.',
        },

        {
          title:
            'Location and safety',

          body:
            'Location-based features operate only when you grant permission. Live Location is time-limited and should be shared only with people you trust. SOS alerts do not replace official emergency services.',
        },

        {
          title:
            'Retention and your rights',

          body:
            'You can edit your information, download a copy of your data, or start the 7-day account deletion countdown from Settings without waiting for administrator approval. Some information may be retained for as long as necessary for safety, fraud prevention, dispute resolution, or legal compliance.',
        },

        {
          title:
            'Contact us',

          body:
            'Before production launch, the project settings should contain a reviewed support email address and Privacy Policy URL.',
        },
      ],
    },

    terms: {
      eyebrow:
        'MELO LEGAL',

      title:
        'Terms of Use',

      subtitle:
        'Basic rules for using Melo Chat appropriately, safely, and with respect for other users.',

      draftLabel:
        'Pre-launch document',

      draftNotice:
        'This in-app document is a pre-launch draft. It should be reviewed by an appropriate specialist and published on the website before Store submission.',

      updatedLabel:
        'Last updated',

      updatedDate:
        '7 August 2026',

      contents:
        'Contents',

      backPrivacy:
        'Back to Privacy & personal data',

      privacyDocument:
        'Privacy Policy',

      termsDocument:
        'Terms of Use',

      related:
        'Related document',

      sections: [
        {
          title:
            'Age and eligibility',

          body:
            'Users must be at least 18 years old, provide accurate information, and use only their own account.',
        },

        {
          title:
            'Acceptable use',

          body:
            'Do not harass, deceive, spam, impersonate others, publish illegal content, infringe the rights of others, request confidential information, or use the system commercially or through unauthorized automation.',
        },

        {
          title:
            'Safety when meeting and traveling',

          body:
            'Users must assess risks for themselves, meet in safe locations, inform trusted people, and follow local laws. Trip and Event organizers must provide clear information and must not mislead participants.',
        },

        {
          title:
            'User content',

          body:
            'You remain the owner of your content, while granting Melo Chat permission to process and display it only as necessary to provide the service and the settings you choose.',
        },

        {
          title:
            'Packages and payments',

          body:
            'Pricing, translation credits, renewals, refunds, and benefits are subject to the information shown in the app and the terms of the Store or payment provider.',
        },

        {
          title:
            'Account suspension and termination',

          body:
            'We may restrict, suspend, or remove accounts that violate these terms, endanger others, or where action is necessary to protect system security. Users may report or dispute actions using the available channels.',
        },
      ],
    },
  },

  de: {
    privacy: {
      eyebrow:
        'MELO LEGAL',

      title:
        'Datenschutzerklärung',

      subtitle:
        'Informationen darüber, welche Daten Melo Chat erfasst, wie sie verwendet und geteilt werden sowie über Sicherheit und deine Rechte.',

      draftLabel:
        'Dokument vor dem Launch',

      draftNotice:
        'Dieses In-App-Dokument ist eine Vorabversion. Vor der Store-Einreichung sollte es fachlich geprüft und auf der Website veröffentlicht werden.',

      updatedLabel:
        'Zuletzt aktualisiert',

      updatedDate:
        '7. August 2026',

      contents:
        'Inhalt',

      backPrivacy:
        'Zurück zu Datenschutz & persönlichen Daten',

      privacyDocument:
        'Datenschutzerklärung',

      termsDocument:
        'Nutzungsbedingungen',

      related:
        'Verwandtes Dokument',

      sections: [
        {
          title:
            'Welche Daten wir erfassen',

          body:
            'Melo Chat kann Konto- und Profildaten, Fotos, Nachrichten und Übersetzungen, ungefähre oder genaue Standortdaten bei aktivierten Funktionen wie Trip, Nearby, Live Location oder Safety, Informationen zu Trip, Event und Community, Zahlungen, Identitätsprüfung, Sicherheitsmeldungen sowie App-Diagnosedaten erfassen.',
        },

        {
          title:
            'Zwecke der Datenverwendung',

          body:
            'Wir verwenden Daten für Matching, Freundessuche, Chat, Übersetzungen, Aktivitäten und Reisen, zur Verbesserung der Sicherheit, zur Spam- und Betrugsprävention, für Mitgliedschaftsdienste und zur Behebung von Systemfehlern.',
        },

        {
          title:
            'Weitergabe von Daten',

          body:
            'Informationen können entsprechend deinen Datenschutzeinstellungen und den von dir besuchten Aktivitäten anderen Nutzern angezeigt werden. Anbieter wie Supabase, Google Maps, Translation, Push Notification und Zahlungsdienste können Daten nur soweit verarbeiten, wie dies für die jeweilige Dienstleistung erforderlich ist.',
        },

        {
          title:
            'Standort und Sicherheit',

          body:
            'Standortfunktionen arbeiten nur mit deiner Zustimmung. Live Location ist zeitlich begrenzt und sollte nur mit vertrauenswürdigen Personen geteilt werden. SOS ersetzt keine staatlichen Notfalldienste.',
        },

        {
          title:
            'Aufbewahrung und deine Rechte',

          body:
            'Du kannst Daten ändern, eine Kopie herunterladen oder in den Einstellungen den 7-tägigen Countdown zur Kontolöschung starten, ohne auf eine Admin-Freigabe zu warten. Bestimmte Daten können aus Sicherheitsgründen, zur Betrugsprävention, Streitbeilegung oder zur Erfüllung gesetzlicher Pflichten länger gespeichert werden.',
        },

        {
          title:
            'Kontakt',

          body:
            'Vor dem Produktivstart sollten eine geprüfte Support-E-Mail-Adresse und die URL der Datenschutzerklärung in den Projekteinstellungen hinterlegt werden.',
        },
      ],
    },

    terms: {
      eyebrow:
        'MELO LEGAL',

      title:
        'Nutzungsbedingungen',

      subtitle:
        'Grundregeln für eine angemessene, sichere und respektvolle Nutzung von Melo Chat.',

      draftLabel:
        'Dokument vor dem Launch',

      draftNotice:
        'Dieses In-App-Dokument ist eine Vorabversion. Vor der Store-Einreichung sollte es fachlich geprüft und auf der Website veröffentlicht werden.',

      updatedLabel:
        'Zuletzt aktualisiert',

      updatedDate:
        '7. August 2026',

      contents:
        'Inhalt',

      backPrivacy:
        'Zurück zu Datenschutz & persönlichen Daten',

      privacyDocument:
        'Datenschutzerklärung',

      termsDocument:
        'Nutzungsbedingungen',

      related:
        'Verwandtes Dokument',

      sections: [
        {
          title:
            'Alter und Voraussetzungen',

          body:
            'Nutzer müssen mindestens 18 Jahre alt sein, richtige Angaben machen und ausschließlich ihr eigenes Konto verwenden.',
        },

        {
          title:
            'Zulässige Nutzung',

          body:
            'Belästigung, Täuschung, Spam, Identitätsmissbrauch, rechtswidrige Inhalte, Verletzungen fremder Rechte, das Anfordern vertraulicher Daten sowie eine nicht genehmigte kommerzielle oder automatisierte Nutzung sind untersagt.',
        },

        {
          title:
            'Sicherheit bei Treffen und Reisen',

          body:
            'Nutzer müssen Risiken selbst einschätzen, sich an sicheren Orten treffen, Vertrauenspersonen informieren und lokale Gesetze beachten. Veranstalter von Trips und Events müssen klare Angaben machen und dürfen Teilnehmer nicht irreführen.',
        },

        {
          title:
            'Inhalte der Nutzer',

          body:
            'Du bleibst Eigentümer deiner Inhalte, räumst Melo Chat jedoch das Recht ein, sie soweit zu verarbeiten und anzuzeigen, wie dies für den Dienst und deine gewählten Einstellungen erforderlich ist.',
        },

        {
          title:
            'Pakete und Zahlungen',

          body:
            'Preise, Übersetzungsguthaben, Verlängerungen, Erstattungen und Vorteile richten sich nach den Angaben in der App sowie den Bedingungen des Stores oder Zahlungsanbieters.',
        },

        {
          title:
            'Sperrung und Beendigung von Konten',

          body:
            'Wir können Konten einschränken, sperren oder entfernen, wenn sie gegen diese Bedingungen verstoßen, andere gefährden oder dies für die Systemsicherheit erforderlich ist. Nutzer können Maßnahmen über die vorgesehenen Kanäle melden oder anfechten.',
        },
      ],
    },
  },

  zh: {
    privacy: {
      eyebrow:
        'MELO LEGAL',

      title:
        '隐私政策',

      subtitle:
        '说明 Melo Chat 收集哪些信息、如何使用和共享信息，以及位置安全和你的权利。',

      draftLabel:
        '上线前文件',

      draftNotice:
        '此应用内文件为上线前草案。提交应用商店前，应由相关专业人员审核并发布到网站。',

      updatedLabel:
        '最后更新',

      updatedDate:
        '2026年8月7日',

      contents:
        '目录',

      backPrivacy:
        '返回隐私和个人数据',

      privacyDocument:
        '隐私政策',

      termsDocument:
        '使用条款',

      related:
        '相关文件',

      sections: [
        {
          title:
            '我们收集的信息',

          body:
            'Melo Chat 可能收集账户和个人资料信息、照片、消息和翻译内容；当你开启 Trip、Nearby、Live Location 或 Safety 时，还可能收集大致位置或精确坐标，以及 Trip、Event、Community、支付、身份验证、安全报告和应用诊断信息。',
        },

        {
          title:
            '信息使用目的',

          body:
            '我们使用信息提供匹配、交友、聊天、翻译、活动和旅行功能，提升安全性，防止垃圾信息和欺诈，提供会员服务并修复系统错误。',
        },

        {
          title:
            '信息共享',

          body:
            '根据你的隐私设置和参加的活动，部分信息可能向其他用户展示。Supabase、Google Maps、Translation、Push Notification 和支付系统等服务提供商，仅可在提供服务所必要的范围内处理信息。',
        },

        {
          title:
            '位置与安全',

          body:
            '位置功能仅在你授权后运行。Live Location 有时间限制，只应分享给可信任的人。SOS 提醒不能替代政府或当地的紧急救援服务。',
        },

        {
          title:
            '数据保留与权利',

          body:
            '你可以修改信息、下载数据副本，或直接在 Settings 中启动 7 天账户删除倒计时，无需等待管理员批准。部分信息可能因安全、防欺诈、争议处理或法律要求而在必要期间内保留。',
        },

        {
          title:
            '联系我们',

          body:
            '正式上线前，应在项目设置中填写经过审核的支持邮箱和隐私政策 URL。',
        },
      ],
    },

    terms: {
      eyebrow:
        'MELO LEGAL',

      title:
        '使用条款',

      subtitle:
        '使用 Melo Chat 时应遵守的基本规则，以确保适当、安全并尊重其他用户。',

      draftLabel:
        '上线前文件',

      draftNotice:
        '此应用内文件为上线前草案。提交应用商店前，应由相关专业人员审核并发布到网站。',

      updatedLabel:
        '最后更新',

      updatedDate:
        '2026年8月7日',

      contents:
        '目录',

      backPrivacy:
        '返回隐私和个人数据',

      privacyDocument:
        '隐私政策',

      termsDocument:
        '使用条款',

      related:
        '相关文件',

      sections: [
        {
          title:
            '年龄与用户资格',

          body:
            '用户必须年满 18 周岁，提供真实准确的信息，并且只能使用自己的账户。',
        },

        {
          title:
            '可接受的使用方式',

          body:
            '禁止骚扰、欺骗、发送垃圾信息、冒充他人、发布违法内容、侵犯他人权利、索取机密信息，或未经许可将系统用于商业或自动化用途。',
        },

        {
          title:
            '见面与旅行安全',

          body:
            '用户应自行评估风险，在安全地点见面，告知可信任的人并遵守当地法律。Trip 和 Event 的组织者必须提供清晰信息，不得误导参与者。',
        },

        {
          title:
            '用户内容',

          body:
            '你仍然拥有自己的内容，但授权 Melo Chat 在提供服务和执行你所选择的设置所必需的范围内处理和展示这些内容。',
        },

        {
          title:
            '套餐与支付',

          body:
            '价格、翻译额度、续订、退款及权益应以应用内展示的信息以及应用商店或支付服务商的条款为准。',
        },

        {
          title:
            '账户限制与终止',

          body:
            '对于违反条款、危害他人或为保障系统安全而必须采取措施的账户，我们可能进行限制、暂停或删除。用户可通过提供的渠道进行举报或申诉。',
        },
      ],
    },
  },

  ja: {
    privacy: {
      eyebrow:
        'MELO LEGAL',

      title:
        'プライバシーポリシー',

      subtitle:
        'Melo Chat が取得する情報、その利用・共有方法、位置情報、安全機能、ユーザーの権利について説明します。',

      draftLabel:
        'リリース前文書',

      draftNotice:
        'このアプリ内文書はリリース前の草案です。Store 提出前に専門家による確認を行い、Webサイト上で公開してください。',

      updatedLabel:
        '最終更新',

      updatedDate:
        '2026年8月7日',

      contents:
        '目次',

      backPrivacy:
        'プライバシーと個人データへ戻る',

      privacyDocument:
        'プライバシーポリシー',

      termsDocument:
        '利用規約',

      related:
        '関連文書',

      sections: [
        {
          title:
            '収集する情報',

          body:
            'Melo Chat は、アカウント・プロフィール情報、写真、メッセージと翻訳、Trip・Nearby・Live Location・Safety を利用した際の概算位置または座標、Trip・Event・Community の情報、支払い、本人確認、安全に関する報告、アプリ診断情報を取得する場合があります。',
        },

        {
          title:
            '情報を利用する目的',

          body:
            'マッチング、友達探し、チャット、翻訳、アクティビティや旅行機能の提供、安全性の向上、スパムや不正行為の防止、会員サービス、システム不具合の修正に情報を利用します。',
        },

        {
          title:
            '情報の共有',

          body:
            'プライバシー設定や参加している活動に応じて、情報が他のユーザーに表示される場合があります。Supabase、Google Maps、Translation、Push Notification、決済システムなどのサービス提供者は、サービス提供に必要な範囲でのみ情報を処理する場合があります。',
        },

        {
          title:
            '位置情報と安全',

          body:
            '位置情報を使用する機能は、ユーザーが許可した場合のみ動作します。Live Location は時間制限があり、信頼できる相手とのみ共有してください。SOS 通知は公的な緊急サービスの代替ではありません。',
        },

        {
          title:
            '保存期間とユーザーの権利',

          body:
            'Settings から情報の編集、データコピーのダウンロード、7日間のアカウント削除カウントダウンの開始ができ、管理者の承認を待つ必要はありません。安全、不正防止、紛争解決、法的義務のために必要な期間、一部の情報を保持する場合があります。',
        },

        {
          title:
            'お問い合わせ',

          body:
            '正式リリース前に、確認済みのサポートメールアドレスとプライバシーポリシー URL をプロジェクト設定に登録してください。',
        },
      ],
    },

    terms: {
      eyebrow:
        'MELO LEGAL',

      title:
        '利用規約',

      subtitle:
        'Melo Chat を適切かつ安全に、他のユーザーを尊重して利用するための基本的なルールです。',

      draftLabel:
        'リリース前文書',

      draftNotice:
        'このアプリ内文書はリリース前の草案です。Store 提出前に専門家による確認を行い、Webサイト上で公開してください。',

      updatedLabel:
        '最終更新',

      updatedDate:
        '2026年8月7日',

      contents:
        '目次',

      backPrivacy:
        'プライバシーと個人データへ戻る',

      privacyDocument:
        'プライバシーポリシー',

      termsDocument:
        '利用規約',

      related:
        '関連文書',

      sections: [
        {
          title:
            '年齢と利用資格',

          body:
            'ユーザーは18歳以上であり、正確な情報を提供し、自分自身のアカウントのみを使用する必要があります。',
        },

        {
          title:
            '許容される利用',

          body:
            '嫌がらせ、詐欺、スパム、なりすまし、違法コンテンツの公開、他者の権利侵害、機密情報の要求、許可のない商用利用や自動化は禁止されています。',
        },

        {
          title:
            '出会い・旅行時の安全',

          body:
            'ユーザーは自らリスクを評価し、安全な場所で会い、信頼できる人に知らせ、現地法を遵守してください。Trip や Event の主催者は明確な情報を提供し、参加者を誤解させてはいけません。',
        },

        {
          title:
            'ユーザーコンテンツ',

          body:
            'コンテンツの所有権は引き続きユーザーにありますが、Melo Chat がサービス提供やユーザーが選択した設定に必要な範囲で処理・表示することを許可するものとします。',
        },

        {
          title:
            'パッケージと支払い',

          body:
            '価格、翻訳クレジット、更新、返金、特典は、アプリ内に表示される情報および Store または決済サービス提供者の条件に従います。',
        },

        {
          title:
            'アカウントの制限・停止・終了',

          body:
            '規約違反、他者への危険、またはシステムの安全確保に必要な場合、アカウントを制限、停止、削除することがあります。ユーザーは用意された手段で報告や異議申し立てを行うことができます。',
        },
      ],
    },
  },

  ko: {
    privacy: {
      eyebrow:
        'MELO LEGAL',

      title:
        '개인정보 처리방침',

      subtitle:
        'Melo Chat이 수집하는 정보, 정보의 이용 및 공유, 위치와 안전 기능, 사용자의 권리에 대해 안내합니다.',

      draftLabel:
        '출시 전 문서',

      draftNotice:
        '앱 내부의 이 문서는 출시 전 초안입니다. Store 제출 전에 관련 전문가의 검토를 받고 웹사이트에 게시해야 합니다.',

      updatedLabel:
        '마지막 업데이트',

      updatedDate:
        '2026년 8월 7일',

      contents:
        '목차',

      backPrivacy:
        '개인정보 및 개인 데이터로 돌아가기',

      privacyDocument:
        '개인정보 처리방침',

      termsDocument:
        '이용약관',

      related:
        '관련 문서',

      sections: [
        {
          title:
            '수집하는 정보',

          body:
            'Melo Chat은 계정 및 프로필 정보, 사진, 메시지와 번역, Trip·Nearby·Live Location·Safety 사용 시의 대략적인 위치 또는 좌표, Trip·Event·Community 정보, 결제, 본인 인증, 안전 신고 및 앱 진단 정보를 수집할 수 있습니다.',
        },

        {
          title:
            '정보 이용 목적',

          body:
            '매칭, 친구 찾기, 채팅, 번역, 활동과 여행 기능 제공, 안전 개선, 스팸과 사기 방지, 회원 서비스 및 시스템 오류 해결을 위해 정보를 사용합니다.',
        },

        {
          title:
            '정보 공유',

          body:
            '개인정보 설정 및 참여한 활동에 따라 일부 정보가 다른 사용자에게 표시될 수 있습니다. Supabase, Google Maps, Translation, Push Notification 및 결제 시스템 등의 서비스 제공자는 서비스 제공에 필요한 범위에서 정보를 처리할 수 있습니다.',
        },

        {
          title:
            '위치 및 안전',

          body:
            '위치 기반 기능은 사용자가 권한을 허용한 경우에만 동작합니다. Live Location은 시간 제한이 있으며 신뢰할 수 있는 사람에게만 공유해야 합니다. SOS 알림은 공공 긴급 서비스의 대체 수단이 아닙니다.',
        },

        {
          title:
            '보관 기간 및 사용자의 권리',

          body:
            'Settings에서 정보를 수정하거나 데이터 사본을 다운로드하고 7일 계정 삭제 카운트다운을 시작할 수 있으며 관리자 승인을 기다릴 필요가 없습니다. 안전, 사기 방지, 분쟁 해결 또는 법적 의무를 위해 필요한 기간 동안 일부 정보가 보관될 수 있습니다.',
        },

        {
          title:
            '문의',

          body:
            '정식 출시 전에 검토가 완료된 지원 이메일 주소와 개인정보 처리방침 URL을 프로젝트 설정에 등록해야 합니다.',
        },
      ],
    },

    terms: {
      eyebrow:
        'MELO LEGAL',

      title:
        '이용약관',

      subtitle:
        'Melo Chat을 적절하고 안전하게 사용하고 다른 사용자를 존중하기 위한 기본 규칙입니다.',

      draftLabel:
        '출시 전 문서',

      draftNotice:
        '앱 내부의 이 문서는 출시 전 초안입니다. Store 제출 전에 관련 전문가의 검토를 받고 웹사이트에 게시해야 합니다.',

      updatedLabel:
        '마지막 업데이트',

      updatedDate:
        '2026년 8월 7일',

      contents:
        '목차',

      backPrivacy:
        '개인정보 및 개인 데이터로 돌아가기',

      privacyDocument:
        '개인정보 처리방침',

      termsDocument:
        '이용약관',

      related:
        '관련 문서',

      sections: [
        {
          title:
            '연령 및 이용 자격',

          body:
            '사용자는 만 18세 이상이어야 하며 정확한 정보를 제공하고 본인의 계정만 사용해야 합니다.',
        },

        {
          title:
            '허용되는 이용',

          body:
            '괴롭힘, 사기, 스팸, 사칭, 불법 콘텐츠 게시, 타인의 권리 침해, 기밀 정보 요구, 허가되지 않은 상업적 이용 또는 자동화된 이용은 금지됩니다.',
        },

        {
          title:
            '만남 및 여행 시 안전',

          body:
            '사용자는 스스로 위험을 평가하고 안전한 장소에서 만나며 신뢰할 수 있는 사람에게 알리고 현지 법률을 준수해야 합니다. Trip 및 Event 주최자는 명확한 정보를 제공하고 참가자를 오해하게 해서는 안 됩니다.',
        },

        {
          title:
            '사용자 콘텐츠',

          body:
            '사용자는 자신의 콘텐츠에 대한 소유권을 계속 보유하지만, Melo Chat이 서비스 제공 및 사용자가 선택한 설정에 필요한 범위에서 콘텐츠를 처리하고 표시할 수 있도록 허용합니다.',
        },

        {
          title:
            '패키지 및 결제',

          body:
            '가격, 번역 크레딧, 갱신, 환불 및 혜택은 앱에 표시된 정보와 Store 또는 결제 서비스 제공자의 조건을 따릅니다.',
        },

        {
          title:
            '계정 제한 및 종료',

          body:
            '약관을 위반하거나 다른 사람에게 위험을 주거나 시스템 안전을 위해 필요한 경우 계정을 제한, 정지 또는 삭제할 수 있습니다. 사용자는 제공된 절차를 통해 신고하거나 조치에 이의를 제기할 수 있습니다.',
        },
      ],
    },
  },
};

export default function LegalDocumentExperience({
  document,
}: {
  document: LegalDocumentType;
}) {
  const {
    locale,
  } = useLocale();

  const language =
    safeLocale(
      String(locale),
    );

  const copy =
    LEGAL_COPY[
      language
    ][document];

  const otherDocument =
    document === 'privacy'
      ? {
          href:
            '/terms-of-service',

          title:
            copy.termsDocument,

          icon:
            '≡',
        }
      : {
          href:
            '/privacy-policy',

          title:
            copy.privacyDocument,

          icon:
            '◈',
        };

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
            styles.backRow
          }
        >
          <Link
            href="/privacy-data"
            className={
              styles.backLink
            }
          >
            <span
              aria-hidden="true"
            >
              ‹
            </span>

            {
              copy.backPrivacy
            }
          </Link>
        </div>

        <header
          className={
            styles.hero
          }
        >
          <div
            className={
              styles.heroCopy
            }
          >
            <span
              className={
                styles.eyebrow
              }
            >
              {
                copy.eyebrow
              }
            </span>

            <h1>
              {
                copy.title
              }
            </h1>

            <p>
              {
                copy.subtitle
              }
            </p>
          </div>

          <div
            className={
              styles.heroMeta
            }
          >
            <span>
              {
                copy.updatedLabel
              }
            </span>

            <strong>
              {
                copy.updatedDate
              }
            </strong>
          </div>
        </header>

        <aside
          className={
            styles.draftNotice
          }
        >
          <div
            className={
              styles.noticeIcon
            }
            aria-hidden="true"
          >
            !
          </div>

          <div>
            <strong>
              {
                copy.draftLabel
              }
            </strong>

            <p>
              {
                copy.draftNotice
              }
            </p>
          </div>
        </aside>

        <div
          className={
            styles.documentLayout
          }
        >
          <aside
            className={
              styles.sidebar
            }
          >
            <div
              className={
                styles.sidebarInner
              }
            >
              <strong
                className={
                  styles.contentsTitle
                }
              >
                {
                  copy.contents
                }
              </strong>

              <nav
                className={
                  styles.contentsNav
                }
                aria-label={
                  copy.contents
                }
              >
                {copy.sections.map(
                  (
                    section,
                    index,
                  ) => (
                    <a
                      key={
                        section.title
                      }
                      href={`#section-${index + 1}`}
                    >
                      <span>
                        {
                          index + 1
                        }
                      </span>

                      <strong>
                        {
                          section.title
                        }
                      </strong>
                    </a>
                  ),
                )}
              </nav>

              <div
                className={
                  styles.relatedBox
                }
              >
                <small>
                  {
                    copy.related
                  }
                </small>

                <Link
                  href={
                    otherDocument.href
                  }
                >
                  <span
                    aria-hidden="true"
                  >
                    {
                      otherDocument.icon
                    }
                  </span>

                  <strong>
                    {
                      otherDocument.title
                    }
                  </strong>

                  <b
                    aria-hidden="true"
                  >
                    ›
                  </b>
                </Link>
              </div>
            </div>
          </aside>

          <article
            className={
              styles.document
            }
          >
            {copy.sections.map(
              (
                section,
                index,
              ) => (
                <section
                  className={
                    styles.documentSection
                  }
                  id={`section-${index + 1}`}
                  key={
                    section.title
                  }
                >
                  <div
                    className={
                      styles.sectionNumber
                    }
                    aria-hidden="true"
                  >
                    {
                      index + 1
                    }
                  </div>

                  <div
                    className={
                      styles.sectionCopy
                    }
                  >
                    <h2>
                      {index + 1}.{' '}
                      {
                        section.title
                      }
                    </h2>

                    <p>
                      {
                        section.body
                      }
                    </p>
                  </div>
                </section>
              ),
            )}

            <footer
              className={
                styles.documentFooter
              }
            >
              <div>
                <small>
                  {
                    copy.related
                  }
                </small>

                <strong>
                  {
                    otherDocument.title
                  }
                </strong>
              </div>

              <Link
                href={
                  otherDocument.href
                }
              >
                {
                  otherDocument.title
                }

                <span
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </footer>
          </article>
        </div>
      </section>
    </main>
  );
}
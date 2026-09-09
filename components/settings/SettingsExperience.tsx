'use client';

import Link from 'next/link';
import {
  useRouter,
} from 'next/navigation';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Header,
} from '@/components/Header';

import {
  useLocale,
} from '@/components/SiteProviders';

import type {
  Locale,
} from '@/i18n/dictionaries';

import {
  DISCOVERY_COUNTRIES,
} from '@/lib/discoveryCountry';

import {
  loadMyConnectModeIntrosWeb,
  saveMyConnectModeIntrosWeb,
} from '@/components/connect/connectModeIntroWeb';

import {
  AVAILABLE_INTERESTS,
  CHAT_LANGUAGE_OPTIONS,
  FRIEND_GOALS,
  FRIEND_LANGUAGE_CODES,
  LOVE_GENDER_OPTIONS,
  LOVE_RELATIONSHIP_GOALS,
  chatLanguageLabel,
  loadConnectPreferenceSnapshot,
  loadSettingsAccountSnapshot,
  loadWebUserSettings,
  saveConnectPreferenceSnapshot,
  savePrimaryChatLanguage,
  saveWebUserSettings,
  type ConnectPreferenceSnapshot,
  type FriendGoalWeb,
  type SettingsAccountSnapshot,
  type WebUserSettings,
} from './settingsWebData';

import styles from './SettingsExperience.module.css';

const COPY = {
  th: {
    title:
      'ตั้งค่า',
    subtitle:
      'จัดการการตั้งค่าบัญชี ภาษา การค้นพบ ความเป็นส่วนตัว และแพ็กเกจ',
    back:
      'กลับโปรไฟล์',

    appearance:
      'การแสดงผล',
    appearanceDesc:
      'เลือกธีมที่เหมาะกับอุปกรณ์และการใช้งานของคุณ',
    appTheme:
      'ธีมแอป',
    system:
      'ตามระบบ',
    light:
      'สว่าง',
    dark:
      'มืด',

    language:
      'ภาษาและการแปล',
    languageDesc:
      'กำหนดภาษาของเว็บไซต์และภาษาเริ่มต้นสำหรับแชท',
    appLanguage:
      'ภาษาแอป',
    chatLanguage:
      'ภาษาหลักของแชท',

    discovery:
      'ความสนใจและการค้นพบ',
    discoveryDesc:
      'ใช้การตั้งค่าเหล่านี้เพื่อช่วยแนะนำคนที่เหมาะสม',
    meet:
      'อยากทำความรู้จักกับใคร?',
    women:
      'ผู้หญิง',
    men:
      'ผู้ชาย',
    everyone:
      'ทุกคน',
    distance:
      'ระยะทางสูงสุด',
    interests:
      'ความสนใจที่แนะนำ',

    package:
      'แพ็กเกจปัจจุบัน',
    packageDesc:
      'ดูแพ็กเกจ สิทธิประโยชน์ และเครดิตแปลภาษาของคุณ',
    currentPackage:
      'แพ็กเกจปัจจุบัน',
    active:
      'ใช้งานอยู่',
    free:
      'Free',
    premium:
      'Premium',
    ultimate:
      'Ultimate',
    translations:
      'แปลข้อความอัตโนมัติ',
    credits:
      'เครดิตแปลภาษาคงเหลือ',
    profiles:
      'โปรไฟล์แนะนำรายวัน',
    favorites:
      'บันทึกโปรไฟล์เป็นรายการโปรด',
    viewPackages:
      'ดูแพ็กเกจทั้งหมด',

    privacy:
      'การแจ้งเตือนและความเป็นส่วนตัว',
    notifications:
      'การแจ้งเตือน',
    notificationsDesc:
      'Likes, Matches, คำขอ และความเคลื่อนไหวที่สำคัญ',
    privacyData:
      'ความเป็นส่วนตัวและข้อมูลส่วนบุคคล',
    blocked:
      'ผู้ใช้ที่บล็อก',
    manage:
      'จัดการ',
    help:
      'ช่วยเหลือและสนับสนุน',

    questAdmin:
      'Quest & Reward Admin',
    reviewAdmin:
      'Admin Review Center',
    diagnostics:
      'Production diagnostics',
    cleanup:
      'ล้างข้อมูลทดสอบก่อนเปิดใช้งานจริง',
    moderation:
      'คิวการตรวจสอบ',

    version:
      'Melo Chat Web version 1.0.0',
    logout:
      'ออกจากระบบ',
    loading:
      'กำลังโหลดการตั้งค่า...',
    error:
      'ไม่สามารถโหลดการตั้งค่าได้',
    retry:
      'ลองอีกครั้ง',
    saveError:
      'บันทึกไม่สำเร็จ',

    selectLanguage:
      'เลือกภาษาหลักของแชท',
    searchLanguage:
      'ค้นหาภาษา...',
    close:
      'ปิด',
  },

  en: {
    title:
      'Settings',
    subtitle:
      'Manage account, language, discovery, privacy, and package preferences',
    back:
      'Back to profile',

    appearance:
      'Appearance',
    appearanceDesc:
      'Choose the theme that works best for your device',
    appTheme:
      'App theme',
    system:
      'System',
    light:
      'Light',
    dark:
      'Dark',

    language:
      'Language and translation',
    languageDesc:
      'Choose the website language and default chat language',
    appLanguage:
      'App language',
    chatLanguage:
      'Primary chat language',

    discovery:
      'Interests and discovery',
    discoveryDesc:
      'Use these preferences to recommend suitable people',
    meet:
      'Who would you like to meet?',
    women:
      'Women',
    men:
      'Men',
    everyone:
      'Everyone',
    distance:
      'Maximum distance',
    interests:
      'Recommendation interests',

    package:
      'Current package',
    packageDesc:
      'Review your package, benefits, and translation credits',
    currentPackage:
      'Current package',
    active:
      'Active',
    free:
      'Free',
    premium:
      'Premium',
    ultimate:
      'Ultimate',
    translations:
      'Automatic message translation',
    credits:
      'translation credits remaining',
    profiles:
      'Daily recommended profiles',
    favorites:
      'Save profiles to Favorites',
    viewPackages:
      'View all packages',

    privacy:
      'Notifications and privacy',
    notifications:
      'Notifications',
    notificationsDesc:
      'Likes, matches, requests, and important activity updates',
    privacyData:
      'Privacy & personal data',
    blocked:
      'Blocked users',
    manage:
      'Manage',
    help:
      'Help and support',

    questAdmin:
      'Quest & Reward Admin',
    reviewAdmin:
      'Admin Review Center',
    diagnostics:
      'Production diagnostics',
    cleanup:
      'Pre-launch test data cleanup',
    moderation:
      'Moderation queue',

    version:
      'Melo Chat Web version 1.0.0',
    logout:
      'Logout',
    loading:
      'Loading settings...',
    error:
      'Unable to load settings',
    retry:
      'Try again',
    saveError:
      'Unable to save',
    selectLanguage:
      'Choose primary chat language',
    searchLanguage:
      'Search languages...',
    close:
      'Close',
  },

  de: {
    title:
      'Einstellungen',
    subtitle:
      'Konto, Sprache, Entdecken, Datenschutz und Paket verwalten',
    back:
      'Zurück zum Profil',

    appearance:
      'Darstellung',
    appearanceDesc:
      'Wähle das passende Design für dein Gerät',
    appTheme:
      'App-Design',
    system:
      'System',
    light:
      'Hell',
    dark:
      'Dunkel',

    language:
      'Sprache und Übersetzung',
    languageDesc:
      'Website- und Standardsprache für Chats auswählen',
    appLanguage:
      'App-Sprache',
    chatLanguage:
      'Primäre Chatsprache',

    discovery:
      'Interessen und Entdecken',
    discoveryDesc:
      'Diese Einstellungen helfen bei passenden Empfehlungen',
    meet:
      'Wen möchtest du kennenlernen?',
    women:
      'Frauen',
    men:
      'Männer',
    everyone:
      'Alle',
    distance:
      'Maximale Entfernung',
    interests:
      'Empfohlene Interessen',

    package:
      'Aktuelles Paket',
    packageDesc:
      'Paket, Vorteile und Übersetzungsguthaben',
    currentPackage:
      'Aktuelles Paket',
    active:
      'Aktiv',
    free:
      'Free',
    premium:
      'Premium',
    ultimate:
      'Ultimate',
    translations:
      'Automatische Nachrichtenübersetzung',
    credits:
      'Übersetzungsguthaben verbleibend',
    profiles:
      'Tägliche Profilvorschläge',
    favorites:
      'Profile als Favoriten speichern',
    viewPackages:
      'Alle Pakete ansehen',

    privacy:
      'Benachrichtigungen und Datenschutz',
    notifications:
      'Benachrichtigungen',
    notificationsDesc:
      'Likes, Matches, Anfragen und wichtige Aktivitäten',
    privacyData:
      'Datenschutz & persönliche Daten',
    blocked:
      'Blockierte Nutzer',
    manage:
      'Verwalten',
    help:
      'Hilfe und Support',

    questAdmin:
      'Quest & Reward Admin',
    reviewAdmin:
      'Admin Review Center',
    diagnostics:
      'Produktionsdiagnose',
    cleanup:
      'Testdaten vor Launch löschen',
    moderation:
      'Moderationswarteschlange',

    version:
      'Melo Chat Web Version 1.0.0',
    logout:
      'Abmelden',
    loading:
      'Einstellungen werden geladen...',
    error:
      'Einstellungen konnten nicht geladen werden',
    retry:
      'Erneut versuchen',
    saveError:
      'Speichern fehlgeschlagen',
    selectLanguage:
      'Primäre Chatsprache wählen',
    searchLanguage:
      'Sprache suchen...',
    close:
      'Schließen',
  },

  zh: {
    title:
      '设置',
    subtitle:
      '管理账户、语言、推荐、隐私和套餐偏好',
    back:
      '返回个人资料',

    appearance:
      '外观',
    appearanceDesc:
      '选择适合设备的主题',
    appTheme:
      '应用主题',
    system:
      '跟随系统',
    light:
      '浅色',
    dark:
      '深色',

    language:
      '语言和翻译',
    languageDesc:
      '选择网站语言和默认聊天语言',
    appLanguage:
      '应用语言',
    chatLanguage:
      '主要聊天语言',

    discovery:
      '兴趣和发现',
    discoveryDesc:
      '使用这些偏好推荐合适的人',
    meet:
      '想认识谁？',
    women:
      '女性',
    men:
      '男性',
    everyone:
      '所有人',
    distance:
      '最大距离',
    interests:
      '推荐兴趣',

    package:
      '当前套餐',
    packageDesc:
      '查看套餐、权益和翻译额度',
    currentPackage:
      '当前套餐',
    active:
      '使用中',
    free:
      'Free',
    premium:
      'Premium',
    ultimate:
      'Ultimate',
    translations:
      '自动消息翻译',
    credits:
      '剩余翻译额度',
    profiles:
      '每日推荐资料',
    favorites:
      '收藏用户资料',
    viewPackages:
      '查看全部套餐',

    privacy:
      '通知和隐私',
    notifications:
      '通知',
    notificationsDesc:
      '喜欢、匹配、申请和重要活动更新',
    privacyData:
      '隐私和个人数据',
    blocked:
      '已屏蔽用户',
    manage:
      '管理',
    help:
      '帮助和支持',

    questAdmin:
      'Quest & Reward Admin',
    reviewAdmin:
      'Admin Review Center',
    diagnostics:
      '生产诊断',
    cleanup:
      '上线前测试数据清理',
    moderation:
      '审核队列',

    version:
      'Melo Chat Web 版本 1.0.0',
    logout:
      '退出登录',
    loading:
      '正在加载设置...',
    error:
      '无法加载设置',
    retry:
      '重试',
    saveError:
      '保存失败',
    selectLanguage:
      '选择主要聊天语言',
    searchLanguage:
      '搜索语言...',
    close:
      '关闭',
  },

  ja: {
    title:
      '設定',
    subtitle:
      'アカウント、言語、発見、プライバシー、プランを管理します',
    back:
      'プロフィールへ戻る',

    appearance:
      '外観',
    appearanceDesc:
      'デバイスに合うテーマを選択します',
    appTheme:
      'Appテーマ',
    system:
      'システム',
    light:
      'ライト',
    dark:
      'ダーク',

    language:
      '言語と翻訳',
    languageDesc:
      'Web表示言語とチャットの基本言語を設定します',
    appLanguage:
      'App言語',
    chatLanguage:
      'メインのチャット言語',

    discovery:
      '興味と発見',
    discoveryDesc:
      'おすすめユーザーのための設定です',
    meet:
      '誰と出会いたいですか？',
    women:
      '女性',
    men:
      '男性',
    everyone:
      'すべて',
    distance:
      '最大距離',
    interests:
      'おすすめの興味',

    package:
      '現在のプラン',
    packageDesc:
      'プラン、特典、翻訳クレジットを確認します',
    currentPackage:
      '現在のプラン',
    active:
      '有効',
    free:
      'Free',
    premium:
      'Premium',
    ultimate:
      'Ultimate',
    translations:
      'メッセージ自動翻訳',
    credits:
      '翻訳クレジット残高',
    profiles:
      '毎日のおすすめプロフィール',
    favorites:
      'プロフィールをお気に入り保存',
    viewPackages:
      'すべてのプランを見る',

    privacy:
      '通知とプライバシー',
    notifications:
      '通知',
    notificationsDesc:
      'Like、Match、申請、重要な更新',
    privacyData:
      'プライバシーと個人データ',
    blocked:
      'ブロックしたユーザー',
    manage:
      '管理',
    help:
      'ヘルプとサポート',

    questAdmin:
      'Quest & Reward Admin',
    reviewAdmin:
      'Admin Review Center',
    diagnostics:
      '本番診断',
    cleanup:
      'リリース前テストデータ削除',
    moderation:
      'モデレーションキュー',

    version:
      'Melo Chat Web バージョン 1.0.0',
    logout:
      'ログアウト',
    loading:
      '設定を読み込み中...',
    error:
      '設定を読み込めません',
    retry:
      '再試行',
    saveError:
      '保存できません',
    selectLanguage:
      'メインのチャット言語を選択',
    searchLanguage:
      '言語を検索...',
    close:
      '閉じる',
  },

  ko: {
    title:
      '설정',
    subtitle:
      '계정, 언어, 추천, 개인정보 및 패키지 설정을 관리합니다',
    back:
      '프로필로 돌아가기',

    appearance:
      '화면 설정',
    appearanceDesc:
      '기기에 맞는 테마를 선택하세요',
    appTheme:
      '앱 테마',
    system:
      '시스템',
    light:
      '라이트',
    dark:
      '다크',

    language:
      '언어 및 번역',
    languageDesc:
      '웹 표시 언어와 기본 채팅 언어를 선택하세요',
    appLanguage:
      '앱 언어',
    chatLanguage:
      '기본 채팅 언어',

    discovery:
      '관심사 및 탐색',
    discoveryDesc:
      '적합한 사람을 추천하기 위한 설정입니다',
    meet:
      '누구를 만나고 싶나요?',
    women:
      '여성',
    men:
      '남성',
    everyone:
      '모두',
    distance:
      '최대 거리',
    interests:
      '추천 관심사',

    package:
      '현재 패키지',
    packageDesc:
      '패키지, 혜택 및 번역 크레딧을 확인하세요',
    currentPackage:
      '현재 패키지',
    active:
      '사용 중',
    free:
      'Free',
    premium:
      'Premium',
    ultimate:
      'Ultimate',
    translations:
      '메시지 자동 번역',
    credits:
      '번역 크레딧 남음',
    profiles:
      '일일 추천 프로필',
    favorites:
      '프로필 즐겨찾기 저장',
    viewPackages:
      '전체 패키지 보기',

    privacy:
      '알림 및 개인정보',
    notifications:
      '알림',
    notificationsDesc:
      '좋아요, 매치, 요청 및 중요한 활동 업데이트',
    privacyData:
      '개인정보 및 개인 데이터',
    blocked:
      '차단한 사용자',
    manage:
      '관리',
    help:
      '도움말 및 지원',

    questAdmin:
      'Quest & Reward Admin',
    reviewAdmin:
      'Admin Review Center',
    diagnostics:
      '프로덕션 진단',
    cleanup:
      '출시 전 테스트 데이터 정리',
    moderation:
      '검토 대기열',

    version:
      'Melo Chat Web 버전 1.0.0',
    logout:
      '로그아웃',
    loading:
      '설정을 불러오는 중...',
    error:
      '설정을 불러올 수 없습니다',
    retry:
      '다시 시도',
    saveError:
      '저장 실패',
    selectLanguage:
      '기본 채팅 언어 선택',
    searchLanguage:
      '언어 검색...',
    close:
      '닫기',
  },
} as const;

const CONNECT_COPY = {
  th: {
    general:
      'การค้นพบโดยรวม',
    generalDesc:
      'ค่ากลางสำหรับการแนะนำใน Melo Connect',
    modes:
      'โหมดที่เปิดใช้งาน',
    modesDesc:
      'Friend และ Love แยกการตั้งค่าออกจากกัน',
    friend:
      'เพื่อน',
    love:
      'หาคู่',
    distance:
      'ระยะทางสูงสุด',
    distanceDesc:
      'ใช้เป็นระยะทางที่คุณต้องการสำหรับการค้นพบ',
    friendSettings:
      'ตั้งค่าเพื่อน',
    loveSettings:
      'ตั้งค่าหาคู่',
    friendHint:
      'Friend ใช้ความสนใจ ภาษา อายุ และสัญชาติเพื่อจัดอันดับ โดยไม่ตัดคนอื่นออกแบบเข้มงวด',
    loveHint:
      'Love ใช้เพศ อายุ และสัญชาติเป็นตัวกรองหลักตามที่ตั้งไว้',

    intro:
      'แนะนำตัวสำหรับโหมดเพื่อน',
    introPlaceholder:
      'เช่น อยากหาเพื่อนเที่ยว คาเฟ่ และแลกเปลี่ยนภาษา',

    loveIntro:
      'แนะนำตัวสำหรับโหมดคู่รัก',
    loveIntroPlaceholder:
      'เขียนแนะนำตัวสำหรับคนที่พบคุณในโหมดคู่รัก',

    goals:
      'เป้าหมายการหาเพื่อน',
    languages:
      'ภาษาที่อยากแลกเปลี่ยน',
    sharedInterests:
      'ความสนใจร่วมที่ต้องการ',
    nationalities:
      'สัญชาติที่ต้องการ',
    nationalitiesDesc:
      'เลือกได้สูงสุด 3 สัญชาติ',
    age:
      'ช่วงอายุที่ต้องการ',

    allowDiscovery:
      'อนุญาตให้ค้นพบโปรไฟล์เพื่อน',
    allowDiscoveryDesc:
      'ปิดเพื่อหยุดแสดงในคำแนะนำเพื่อนใหม่ โดยเพื่อนและคำขอเดิมยังคงอยู่',

    sameCity:
      'แนะนำเมืองเดียวกันก่อน',
    sameCityDesc:
      'ยังคงแสดงเมืองอื่น แต่ให้คนในเมืองเดียวกันมีลำดับสูงกว่า',

    relationshipGoal:
      'เป้าหมายความสัมพันธ์',
    genders:
      'เพศที่สนใจ',

    save:
      'บันทึกการตั้งค่า Connect',
    saving:
      'กำลังบันทึก...',
    saved:
      'บันทึกการตั้งค่า Connect แล้ว',

    loadError:
      'โหลดการตั้งค่า Connect ไม่สำเร็จ',
    retry:
      'โหลดใหม่',

    selectCountry:
      'เพิ่มสัญชาติ',
    maxThree:
      'เลือกครบ 3 สัญชาติแล้ว',

    local_friend:
      'เพื่อนใกล้ตัว',
    travel_buddy:
      'เพื่อนเที่ยว',
    language_exchange:
      'แลกเปลี่ยนภาษา',
    activity_partner:
      'เพื่อนทำกิจกรรม',
    online_friend:
      'เพื่อนออนไลน์',

    longTerm:
      'ความสัมพันธ์ระยะยาว',
    seriousOpen:
      'จริงจัง แต่เปิดใจคุยก่อน',
    friends:
      'เพื่อนและคนคุย',
    unsure:
      'ยังไม่แน่ใจ',

    female:
      'ผู้หญิง',
    male:
      'ผู้ชาย',
    lgbtq:
      'LGBTQ+',

    minimum:
      'ต่ำสุด',
    maximum:
      'สูงสุด',

    enabled:
      'เปิด',
    disabled:
      'ปิด',
  },

  en: {
    general:
      'General discovery',
    generalDesc:
      'Shared discovery preferences for Melo Connect',
    modes:
      'Available in Melo Connect',
    modesDesc:
      'Friend and Love keep separate matching preferences',
    friend:
      'Friends',
    love:
      'Love',
    distance:
      'Maximum distance',
    distanceDesc:
      'Your preferred discovery distance',
    friendSettings:
      'Friend settings',
    loveSettings:
      'Dating settings',
    friendHint:
      'Friend uses interests, language, age and nationality for ranking without strictly excluding others.',
    loveHint:
      'Love uses gender, age and nationality as the main filters you set.',

    intro:
      'Friend introduction',
    introPlaceholder:
      'Example: Looking for travel, café and language exchange friends.',

    loveIntro:
      'Love introduction',
    loveIntroPlaceholder:
      'Introduce yourself to people who discover you in Love mode.',

    goals:
      'Friend goals',
    languages:
      'Languages to exchange',
    sharedInterests:
      'Preferred shared interests',
    nationalities:
      'Preferred nationalities',
    nationalitiesDesc:
      'Choose up to 3 nationalities',
    age:
      'Preferred age',

    allowDiscovery:
      'Allow friend discovery',
    allowDiscoveryDesc:
      'Turn off to stop appearing in new friend recommendations; existing friends and requests remain.',

    sameCity:
      'Same city first',
    sameCityDesc:
      'Still shows other cities, but prioritizes people in your city.',

    relationshipGoal:
      'Relationship goal',
    genders:
      'Interested in',

    save:
      'Save Connect settings',
    saving:
      'Saving...',
    saved:
      'Connect settings saved',

    loadError:
      'Unable to load Connect settings',
    retry:
      'Reload',

    selectCountry:
      'Add nationality',
    maxThree:
      'Maximum 3 selected',

    local_friend:
      'Local friend',
    travel_buddy:
      'Travel buddy',
    language_exchange:
      'Language exchange',
    activity_partner:
      'Activity partner',
    online_friend:
      'Online friend',

    longTerm:
      'Long-term relationship',
    seriousOpen:
      'Serious, but open-minded first',
    friends:
      'Friends and talking stage',
    unsure:
      'Not sure yet',

    female:
      'Women',
    male:
      'Men',
    lgbtq:
      'LGBTQ+',

    minimum:
      'Minimum',
    maximum:
      'Maximum',

    enabled:
      'On',
    disabled:
      'Off',
  },

  de: {
    general:
      'Allgemeine Entdeckung',
    generalDesc:
      'Gemeinsame Einstellungen für Melo Connect',
    modes:
      'In Melo Connect verfügbar',
    modesDesc:
      'Freunde und Love haben getrennte Matching-Einstellungen',
    friend:
      'Freunde',
    love:
      'Love',
    distance:
      'Maximale Entfernung',
    distanceDesc:
      'Bevorzugte Entfernung für Entdeckungen',
    friendSettings:
      'Freundeinstellungen',
    loveSettings:
      'Dating-Einstellungen',
    friendHint:
      'Freunde werden nach Interessen, Sprache, Alter und Nationalität priorisiert, ohne andere strikt auszuschließen.',
    loveHint:
      'Love verwendet Geschlecht, Alter und Nationalität als Hauptfilter.',

    intro:
      'Freunde-Vorstellung',
    introPlaceholder:
      'Zum Beispiel: Suche Freunde für Reisen, Cafés und Sprachaustausch.',

    loveIntro:
      'Vorstellung für Love',
    loveIntroPlaceholder:
      'Stelle dich Menschen vor, die dich im Love-Modus entdecken.',

    goals:
      'Freundschaftsziele',
    languages:
      'Sprachen zum Austausch',
    sharedInterests:
      'Bevorzugte gemeinsame Interessen',
    nationalities:
      'Bevorzugte Nationalitäten',
    nationalitiesDesc:
      'Bis zu 3 Nationalitäten auswählen',
    age:
      'Bevorzugtes Alter',

    allowDiscovery:
      'Freunde-Entdeckung erlauben',
    allowDiscoveryDesc:
      'Deaktivieren, um nicht mehr in neuen Freundesempfehlungen zu erscheinen.',

    sameCity:
      'Gleiche Stadt zuerst',
    sameCityDesc:
      'Andere Städte bleiben sichtbar, Personen aus deiner Stadt werden priorisiert.',

    relationshipGoal:
      'Beziehungsziel',
    genders:
      'Interessiert an',

    save:
      'Connect-Einstellungen speichern',
    saving:
      'Speichern...',
    saved:
      'Connect-Einstellungen gespeichert',

    loadError:
      'Connect-Einstellungen konnten nicht geladen werden',
    retry:
      'Neu laden',

    selectCountry:
      'Nationalität hinzufügen',
    maxThree:
      'Maximal 3 ausgewählt',

    local_friend:
      'Lokaler Freund',
    travel_buddy:
      'Reisepartner',
    language_exchange:
      'Sprachaustausch',
    activity_partner:
      'Aktivitätspartner',
    online_friend:
      'Online-Freund',

    longTerm:
      'Langfristige Beziehung',
    seriousOpen:
      'Ernsthaft, aber zunächst offen',
    friends:
      'Freunde und Kennenlernen',
    unsure:
      'Noch nicht sicher',

    female:
      'Frauen',
    male:
      'Männer',
    lgbtq:
      'LGBTQ+',

    minimum:
      'Minimum',
    maximum:
      'Maximum',

    enabled:
      'An',
    disabled:
      'Aus',
  },

  zh: {
    general:
      '通用发现设置',
    generalDesc:
      'Melo Connect 的共用推荐设置',
    modes:
      'Melo Connect 可用模式',
    modesDesc:
      '交友和恋爱分别保留独立的匹配偏好',
    friend:
      '交友',
    love:
      '恋爱',
    distance:
      '最大距离',
    distanceDesc:
      '你偏好的发现距离',
    friendSettings:
      '交友设置',
    loveSettings:
      '恋爱设置',
    friendHint:
      '交友模式会用兴趣、语言、年龄和国籍进行排序，但不会严格排除其他人。',
    loveHint:
      '恋爱模式会把你设置的性别、年龄和国籍作为主要筛选条件。',

    intro:
      '交友自我介绍',
    introPlaceholder:
      '例如：想找旅行、咖啡和语言交换的朋友。',

    loveIntro:
      '恋爱模式自我介绍',
    loveIntroPlaceholder:
      '向在恋爱模式中发现你的人介绍自己。',

    goals:
      '交友目标',
    languages:
      '想交换的语言',
    sharedInterests:
      '偏好的共同兴趣',
    nationalities:
      '偏好国籍',
    nationalitiesDesc:
      '最多选择 3 个国籍',
    age:
      '偏好年龄',

    allowDiscovery:
      '允许交友发现',
    allowDiscoveryDesc:
      '关闭后不会出现在新的交友推荐中，已有好友和申请不受影响。',

    sameCity:
      '同城优先',
    sameCityDesc:
      '仍会显示其他城市，但优先推荐同城用户。',

    relationshipGoal:
      '关系目标',
    genders:
      '感兴趣的性别',

    save:
      '保存 Connect 设置',
    saving:
      '保存中...',
    saved:
      'Connect 设置已保存',

    loadError:
      '无法加载 Connect 设置',
    retry:
      '重新加载',

    selectCountry:
      '添加国籍',
    maxThree:
      '最多选择 3 个',

    local_friend:
      '本地朋友',
    travel_buddy:
      '旅行伙伴',
    language_exchange:
      '语言交换',
    activity_partner:
      '活动伙伴',
    online_friend:
      '线上朋友',

    longTerm:
      '长期关系',
    seriousOpen:
      '认真，但先开放了解',
    friends:
      '朋友与聊天阶段',
    unsure:
      '还不确定',

    female:
      '女性',
    male:
      '男性',
    lgbtq:
      'LGBTQ+',

    minimum:
      '最低',
    maximum:
      '最高',

    enabled:
      '开启',
    disabled:
      '关闭',
  },

  ja: {
    general:
      '共通の発見設定',
    generalDesc:
      'Melo Connect 共通のおすすめ設定',
    modes:
      'Melo Connectで利用するモード',
    modesDesc:
      'FriendとLoveは別々のマッチ条件を使用します',
    friend:
      '友だち',
    love:
      '恋愛',
    distance:
      '最大距離',
    distanceDesc:
      '希望する発見距離',
    friendSettings:
      '友だち設定',
    loveSettings:
      '恋愛設定',
    friendHint:
      'Friendは興味・言語・年齢・国籍をランキングに使い、他の人を厳密には除外しません。',
    loveHint:
      'Loveは設定した性別・年齢・国籍を主なフィルターとして使用します。',

    intro:
      '友だち向け自己紹介',
    introPlaceholder:
      '例：旅行、カフェ、言語交換を楽しめる友だちを探しています。',

    loveIntro:
      '恋愛モード向け自己紹介',
    loveIntroPlaceholder:
      '恋愛モードであなたを見つけた人に自己紹介しましょう。',

    goals:
      '友だちの目的',
    languages:
      '交換したい言語',
    sharedInterests:
      '希望する共通の興味',
    nationalities:
      '希望する国籍',
    nationalitiesDesc:
      '最大3つまで選択',
    age:
      '希望年齢',

    allowDiscovery:
      '友だち検索を許可',
    allowDiscoveryDesc:
      'オフにすると新しい友だち候補に表示されません。既存の友だちや申請は残ります。',

    sameCity:
      '同じ街を優先',
    sameCityDesc:
      '他の都市も表示しつつ、同じ街の人を優先します。',

    relationshipGoal:
      '関係の目的',
    genders:
      '興味のある性別',

    save:
      'Connect設定を保存',
    saving:
      '保存中...',
    saved:
      'Connect設定を保存しました',

    loadError:
      'Connect設定を読み込めません',
    retry:
      '再読み込み',

    selectCountry:
      '国籍を追加',
    maxThree:
      '最大3つ選択済み',

    local_friend:
      '近くの友だち',
    travel_buddy:
      '旅行仲間',
    language_exchange:
      '言語交換',
    activity_partner:
      '活動仲間',
    online_friend:
      'オンライン友だち',

    longTerm:
      '長期的な関係',
    seriousOpen:
      '真剣だが、まず話してみたい',
    friends:
      '友だち・話し相手',
    unsure:
      'まだ決めていない',

    female:
      '女性',
    male:
      '男性',
    lgbtq:
      'LGBTQ+',

    minimum:
      '最小',
    maximum:
      '最大',

    enabled:
      'オン',
    disabled:
      'オフ',
  },

  ko: {
    general:
      '공통 탐색 설정',
    generalDesc:
      'Melo Connect 공통 추천 설정',
    modes:
      'Melo Connect 사용 모드',
    modesDesc:
      '친구와 Love는 서로 다른 매칭 설정을 사용합니다',
    friend:
      '친구',
    love:
      '연애',
    distance:
      '최대 거리',
    distanceDesc:
      '선호하는 탐색 거리',
    friendSettings:
      '친구 설정',
    loveSettings:
      '연애 설정',
    friendHint:
      '친구 모드는 관심사, 언어, 나이, 국적을 순위에 반영하지만 다른 사람을 엄격히 제외하지 않습니다.',
    loveHint:
      'Love는 설정한 성별, 나이, 국적을 주요 필터로 사용합니다.',

    intro:
      '친구 소개',
    introPlaceholder:
      '예: 여행, 카페, 언어 교환을 함께할 친구를 찾고 있어요.',

    loveIntro:
      '연애 모드 소개',
    loveIntroPlaceholder:
      'Love 모드에서 나를 발견한 사람에게 자신을 소개하세요.',

    goals:
      '친구 목표',
    languages:
      '교환하고 싶은 언어',
    sharedInterests:
      '선호 공통 관심사',
    nationalities:
      '선호 국적',
    nationalitiesDesc:
      '최대 3개 국적 선택',
    age:
      '선호 나이',

    allowDiscovery:
      '친구 추천 허용',
    allowDiscoveryDesc:
      '끄면 새로운 친구 추천에 표시되지 않으며 기존 친구와 요청은 유지됩니다.',

    sameCity:
      '같은 도시 우선',
    sameCityDesc:
      '다른 도시도 표시하지만 같은 도시의 사용자를 우선합니다.',

    relationshipGoal:
      '관계 목표',
    genders:
      '관심 성별',

    save:
      'Connect 설정 저장',
    saving:
      '저장 중...',
    saved:
      'Connect 설정을 저장했습니다',

    loadError:
      'Connect 설정을 불러올 수 없습니다',
    retry:
      '다시 불러오기',

    selectCountry:
      '국적 추가',
    maxThree:
      '최대 3개 선택',

    local_friend:
      '근처 친구',
    travel_buddy:
      '여행 친구',
    language_exchange:
      '언어 교환',
    activity_partner:
      '활동 친구',
    online_friend:
      '온라인 친구',

    longTerm:
      '장기적인 관계',
    seriousOpen:
      '진지하지만 먼저 알아가기',
    friends:
      '친구와 대화 상대',
    unsure:
      '아직 모르겠어요',

    female:
      '여성',
    male:
      '남성',
    lgbtq:
      'LGBTQ+',

    minimum:
      '최소',
    maximum:
      '최대',

    enabled:
      '켜짐',
    disabled:
      '꺼짐',
  },
} as const;

const EMPTY_CONNECT:
  ConnectPreferenceSnapshot = {
  friend: {
    allowDiscovery: true,
    intro: '',
    goals: [
      'local_friend',
      'travel_buddy',
      'language_exchange',
    ],
    preferredLanguages: [],
    preferredInterests: [],
    preferredNationalities: [],
    preferredAgeMin: 18,
    preferredAgeMax: 99,
    showSameCityFirst: true,
  },

  intents: {
    loveEnabled: true,
    friendsEnabled: true,
    travelBuddyEnabled: true,
    hangoutStatus: 'none',
    hangoutActivity: '',
  },

  love: {
    relationshipGoal:
      'unsure',
    interestedGenders: [
      'female',
      'male',
      'lgbtq',
    ],
    preferredAgeMin: 18,
    preferredAgeMax: 80,
    preferredNationalities: [],
  },
};

const FLAG:
  Record<
    Locale,
    string
  > = {
  th: '🇹🇭',
  en: '🇬🇧',
  de: '🇩🇪',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
};

function planName(
  plan:
    SettingsAccountSnapshot['planCode'],
  t:
    typeof COPY.en,
) {
  if (
    plan === 'ultimate'
  ) {
    return t.ultimate;
  }

  if (
    plan === 'premium'
  ) {
    return t.premium;
  }

  return t.free;
}

export default function SettingsExperience() {
  const router =
    useRouter();

  const {
    locale,
    setLocale,
    localeLabels,
    supportedLocales,
    themeMode,
    setThemeMode,
  } = useLocale();

  const t =
    (
      COPY[locale] ??
      COPY.en
    ) as typeof COPY.en;

  const ct =
    (
      CONNECT_COPY[locale] ??
      CONNECT_COPY.en
    ) as typeof CONNECT_COPY.en;

  const [
    account,
    setAccount,
  ] =
    useState<SettingsAccountSnapshot | null>(
      null,
    );

  const [
    prefs,
    setPrefs,
  ] =
    useState<WebUserSettings>(
      () =>
        loadWebUserSettings(
          'th',
        ),
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    languageOpen,
    setLanguageOpen,
  ] = useState(false);

  const [
    languageQuery,
    setLanguageQuery,
  ] = useState('');

  const [
    saveError,
    setSaveError,
  ] = useState('');

  const [
    connect,
    setConnect,
  ] =
    useState<ConnectPreferenceSnapshot | null>(
      null,
    );

  const [
    connectTab,
    setConnectTab,
  ] =
    useState<
      'friend' | 'love'
    >('friend');

  const [
    connectSaving,
    setConnectSaving,
  ] = useState(false);

  const [
    connectMessage,
    setConnectMessage,
  ] = useState('');

  const [
    connectError,
    setConnectError,
  ] = useState('');

  const [
    loveIntro,
    setLoveIntro,
  ] = useState('');

  async function loadConnect(
    userId: string,
  ) {
    setConnectError('');

    try {
      const [
        snapshot,
        modeIntros,
      ] =
        await Promise.all([
          loadConnectPreferenceSnapshot(
            userId,
          ),

          loadMyConnectModeIntrosWeb(),
        ]);

      setConnect(
        snapshot,
      );

      setLoveIntro(
        modeIntros.loveIntro,
      );
    } catch (cause) {
      setConnect(null);

      setLoveIntro('');

      setConnectError(
        cause instanceof Error
          ? cause.message
          : ct.loadError,
      );
    }
  }

  async function load() {
    setLoading(true);
    setError('');

    try {
      const snapshot =
        await loadSettingsAccountSnapshot();

      setAccount(
        snapshot,
      );

      const saved =
        loadWebUserSettings(
          snapshot.primaryLanguage,
        );

      if (
        !saved.translationLanguage
      ) {
        saved.translationLanguage =
          snapshot.primaryLanguage;
      }

      setPrefs(saved);

      await loadConnect(
        snapshot.userId,
      );
    } catch (cause) {
      if (
        cause instanceof Error &&
        cause.message ===
          'AUTH_REQUIRED'
      ) {
        router.replace(
          '/login',
        );
        return;
      }

      setError(
        cause instanceof Error
          ? cause.message
          : t.error,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (account) {
      saveWebUserSettings(
        prefs,
      );
    }
  }, [
    prefs,
    account,
  ]);

  const filteredLanguages =
    useMemo(() => {
      const q =
        languageQuery
          .trim()
          .toLowerCase();

      if (!q) {
        return CHAT_LANGUAGE_OPTIONS;
      }

      return CHAT_LANGUAGE_OPTIONS.filter(
        (item) =>
          item
            .join(' ')
            .toLowerCase()
            .includes(q),
      );
    }, [languageQuery]);

  function patchPrefs(
    patch:
      Partial<WebUserSettings>,
  ) {
    setPrefs(
      (current) => ({
        ...current,
        ...patch,
      }),
    );
  }

  function patchFriend(
    patch:
      Partial<
        ConnectPreferenceSnapshot['friend']
      >,
  ) {
    setConnectMessage('');

    setConnect(
      (current) =>
        current
          ? {
              ...current,

              friend: {
                ...current.friend,
                ...patch,
              },
            }
          : current,
    );
  }

  function patchLove(
    patch:
      Partial<
        ConnectPreferenceSnapshot['love']
      >,
  ) {
    setConnectMessage('');

    setConnect(
      (current) =>
        current
          ? {
              ...current,

              love: {
                ...current.love,
                ...patch,
              },
            }
          : current,
    );
  }

  function patchIntents(
    patch:
      Partial<
        ConnectPreferenceSnapshot['intents']
      >,
  ) {
    setConnectMessage('');

    setConnect(
      (current) =>
        current
          ? {
              ...current,

              intents: {
                ...current.intents,
                ...patch,
              },
            }
          : current,
    );
  }

  function toggleFriendGoal(
    goal:
      FriendGoalWeb,
  ) {
    if (!connect) return;

    patchFriend({
      goals:
        connect.friend.goals.includes(
          goal,
        )
          ? connect.friend.goals.filter(
              (item) =>
                item !==
                goal,
            )
          : [
              ...connect.friend.goals,
              goal,
            ],
    });
  }

  function toggleFriendLanguage(
    code: string,
  ) {
    if (!connect) return;

    patchFriend({
      preferredLanguages:
        connect.friend.preferredLanguages.includes(
          code,
        )
          ? connect.friend.preferredLanguages.filter(
              (item) =>
                item !==
                code,
            )
          : [
              ...connect.friend
                .preferredLanguages,
              code,
            ],
    });
  }

  function toggleFriendInterest(
    item: string,
  ) {
    if (!connect) return;

    patchFriend({
      preferredInterests:
        connect.friend.preferredInterests.includes(
          item,
        )
          ? connect.friend.preferredInterests.filter(
              (value) =>
                value !==
                item,
            )
          : [
              ...connect.friend
                .preferredInterests,
              item,
            ],
    });
  }

  function toggleLoveGender(
    gender:
      | 'female'
      | 'male'
      | 'lgbtq',
  ) {
    if (!connect) return;

    patchLove({
      interestedGenders:
        connect.love.interestedGenders.includes(
          gender,
        )
          ? connect.love.interestedGenders.filter(
              (item) =>
                item !==
                gender,
            )
          : [
              ...connect.love
                .interestedGenders,
              gender,
            ],
    });
  }

  function addNationality(
    scope:
      | 'friend'
      | 'love',
    value: string,
  ) {
    if (
      !connect ||
      !value
    ) {
      return;
    }

    const current =
      connect[scope]
        .preferredNationalities;

    if (
      current.includes(
        value,
      ) ||
      current.length >= 3
    ) {
      return;
    }

    if (
      scope === 'friend'
    ) {
      patchFriend({
        preferredNationalities: [
          ...current,
          value,
        ],
      });
    } else {
      patchLove({
        preferredNationalities: [
          ...current,
          value,
        ],
      });
    }
  }

  function removeNationality(
    scope:
      | 'friend'
      | 'love',
    value: string,
  ) {
    if (!connect) return;

    const next =
      connect[scope]
        .preferredNationalities
        .filter(
          (item) =>
            item !==
            value,
        );

    if (
      scope === 'friend'
    ) {
      patchFriend({
        preferredNationalities:
          next,
      });
    } else {
      patchLove({
        preferredNationalities:
          next,
      });
    }
  }

  function adjustAge(
    scope:
      | 'friend'
      | 'love',
    key:
      | 'preferredAgeMin'
      | 'preferredAgeMax',
    delta: number,
  ) {
    if (!connect) return;

    const max =
      scope === 'friend'
        ? 99
        : 80;

    const draft =
      connect[scope];

    const value =
      Math.max(
        18,
        Math.min(
          max,
          draft[key] +
            delta,
        ),
      );

    if (
      key ===
      'preferredAgeMin'
    ) {
      const patch = {
        preferredAgeMin:
          Math.min(
            value,
            draft.preferredAgeMax,
          ),
      };

      if (
        scope ===
        'friend'
      ) {
        patchFriend(patch);
      } else {
        patchLove(patch);
      }
    } else {
      const patch = {
        preferredAgeMax:
          Math.max(
            value,
            draft.preferredAgeMin,
          ),
      };

      if (
        scope ===
        'friend'
      ) {
        patchFriend(patch);
      } else {
        patchLove(patch);
      }
    }
  }

  async function saveConnect() {
    if (
      !account ||
      !connect ||
      connectSaving
    ) {
      return;
    }

    setConnectMessage('');
    setConnectError('');

    if (
      !connect.friend.goals
        .length
    ) {
      setConnectError(
        ct.goals,
      );

      setConnectTab(
        'friend',
      );

      return;
    }

    if (
      !connect.love
        .interestedGenders
        .length
    ) {
      setConnectError(
        ct.genders,
      );

      setConnectTab(
        'love',
      );

      return;
    }

    setConnectSaving(true);

    try {
      /*
       * บันทึก matching preferences เดิม
       */
      await saveConnectPreferenceSnapshot(
        account.userId,
        connect,
      );

      /*
       * บันทึก Intro แยกตามโหมด
       *
       * Friend:
       * - ยังคง save ใน Friend preferences เดิม
       * - sync มาที่ connect_mode_intros ด้วย
       *
       * Love:
       * - เก็บใน connect_mode_intros
       */
      await saveMyConnectModeIntrosWeb(
        connect.friend.intro,
        loveIntro,
      );

      setConnectMessage(
        ct.saved,
      );
    } catch (cause) {
      setConnectError(
        cause instanceof Error
          ? cause.message
          : t.saveError,
      );
    } finally {
      setConnectSaving(false);
    }
  }

  async function selectChatLanguage(
    code: string,
  ) {
    patchPrefs({
      translationLanguage:
        code,
    });

    setLanguageOpen(
      false,
    );

    setLanguageQuery('');

    setSaveError('');

    if (!account) return;

    try {
      await savePrimaryChatLanguage(
        account.userId,
        code,
      );

      setAccount({
        ...account,
        primaryLanguage:
          code,
      });
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : t.saveError,
      );
    }
  }

  if (loading) {
    return (
      <main
        className={
          styles.page
        }
      >
        <Header />

        <div
          className={
            styles.state
          }
        >
          {t.loading}
        </div>
      </main>
    );
  }

  if (
    error ||
    !account
  ) {
    return (
      <main
        className={
          styles.page
        }
      >
        <Header />

        <div
          className={
            styles.state
          }
        >
          <strong>
            {t.error}
          </strong>

          <p>
            {error}
          </p>

          <button
            onClick={() =>
              void load()
            }
          >
            {t.retry}
          </button>
        </div>
      </main>
    );
  }

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
        <header
          className={
            styles.pageHeader
          }
        >
          <div>
            <span>
              MELO SETTINGS
            </span>

            <h1>
              {t.title}
            </h1>

            <p>
              {t.subtitle}
            </p>
          </div>

          <Link href="/profile">
            ← {t.back}
          </Link>
        </header>

        <section
          className={
            styles.accountCard
          }
        >
          <div
            className={
              styles.accountAvatar
            }
          >
            {account.displayName
              .slice(
                0,
                1,
              )
              .toUpperCase()}
          </div>

          <div
            className={
              styles.accountCopy
            }
          >
            <strong>
              {
                account.displayName
              }
            </strong>

            <span>
              {
                account.email
              }
            </span>
          </div>

          <div
            className={
              styles.planBadge
            }
          >
            {planName(
              account.planCode,
              t,
            )}
          </div>
        </section>

        <div
          className={
            styles.settingsGrid
          }
        >
          <SettingsSection
            title={
              t.appearance
            }
            description={
              t.appearanceDesc
            }
            icon="◐"
          >
            <div
              className={
                styles.choiceGrid
              }
            >
              {(
                [
                  'system',
                  'light',
                  'dark',
                ] as const
              ).map(
                (mode) => (
                  <button
                    key={
                      mode
                    }
                    className={
                      themeMode ===
                      mode
                        ? styles.choiceActive
                        : ''
                    }
                    onClick={() =>
                      setThemeMode(
                        mode,
                      )
                    }
                  >
                    <span>
                      {mode ===
                      'system'
                        ? '◐'
                        : mode ===
                            'dark'
                          ? '☾'
                          : '☀'}
                    </span>

                    <strong>
                      {mode ===
                      'system'
                        ? t.system
                        : mode ===
                            'dark'
                          ? t.dark
                          : t.light}
                    </strong>

                    {themeMode ===
                    mode ? (
                      <b>
                        ✓
                      </b>
                    ) : null}
                  </button>
                ),
              )}
            </div>
          </SettingsSection>

          <SettingsSection
            title={
              t.language
            }
            description={
              t.languageDesc
            }
            icon="A"
          >
            <div
              className={
                styles.settingRows
              }
            >
              <div
                className={
                  styles.settingRow
                }
              >
                <span
                  className={
                    styles.rowIcon
                  }
                >
                  A
                </span>

                <div>
                  <strong>
                    {
                      t.appLanguage
                    }
                  </strong>

                  <small>
                    {
                      localeLabels[
                        locale
                      ]
                    }
                  </small>
                </div>

                <div
                  className={
                    styles.inlineLanguages
                  }
                >
                  {supportedLocales.map(
                    (item) => (
                      <button
                        key={
                          item
                        }
                        title={
                          localeLabels[
                            item
                          ]
                        }
                        data-active={
                          item ===
                          locale
                        }
                        onClick={() =>
                          setLocale(
                            item,
                          )
                        }
                      >
                        {
                          FLAG[
                            item
                          ]
                        }
                      </button>
                    ),
                  )}
                </div>
              </div>

              <button
                className={
                  styles.settingRowButton
                }
                onClick={() =>
                  setLanguageOpen(
                    true,
                  )
                }
              >
                <span
                  className={
                    styles.rowIcon
                  }
                >
                  文
                </span>

                <div>
                  <strong>
                    {
                      t.chatLanguage
                    }
                  </strong>

                  <small>
                    {chatLanguageLabel(
                      prefs.translationLanguage,
                    )}
                  </small>
                </div>

                <b>
                  ›
                </b>
              </button>
            </div>

            {saveError ? (
              <p
                className={
                  styles.inlineError
                }
              >
                {saveError}
              </p>
            ) : null}
          </SettingsSection>

          <SettingsSection
            title={
              t.discovery
            }
            description={
              t.discoveryDesc
            }
            icon="♡"
            wide
          >
            <div
              className={
                styles.connectGeneralGrid
              }
            >
              <div
                className={
                  styles.connectMiniCard
                }
              >
                <div
                  className={
                    styles.miniCardHead
                  }
                >
                  <div>
                    <strong>
                      {
                        ct.modes
                      }
                    </strong>

                    <small>
                      {
                        ct.modesDesc
                      }
                    </small>
                  </div>
                </div>

                <div
                  className={
                    styles.modeToggles
                  }
                >
                  <button
                    data-on={
                      connect
                        ?.intents
                        .friendsEnabled ??
                      false
                    }
                    onClick={() =>
                      connect &&
                      patchIntents({
                        friendsEnabled:
                          !connect
                            .intents
                            .friendsEnabled,
                      })
                    }
                  >
                    <span>
                      ☺
                    </span>

                    <div>
                      <strong>
                        {
                          ct.friend
                        }
                      </strong>

                      <small>
                        {connect
                          ?.intents
                          .friendsEnabled
                          ? ct.enabled
                          : ct.disabled}
                      </small>
                    </div>

                    <i />
                  </button>

                  <button
                    data-on={
                      connect
                        ?.intents
                        .loveEnabled ??
                      false
                    }
                    onClick={() =>
                      connect &&
                      patchIntents({
                        loveEnabled:
                          !connect
                            .intents
                            .loveEnabled,
                      })
                    }
                  >
                    <span>
                      ♡
                    </span>

                    <div>
                      <strong>
                        {
                          ct.love
                        }
                      </strong>

                      <small>
                        {connect
                          ?.intents
                          .loveEnabled
                          ? ct.enabled
                          : ct.disabled}
                      </small>
                    </div>

                    <i />
                  </button>
                </div>
              </div>

              <div
                className={
                  styles.connectMiniCard
                }
              >
                <div
                  className={
                    styles.miniCardHead
                  }
                >
                  <div>
                    <strong>
                      {
                        ct.distance
                      }
                    </strong>

                    <small>
                      {
                        ct.distanceDesc
                      }
                    </small>
                  </div>

                  <b>
                    {
                      prefs.maximumDistance
                    }{' '}
                    km
                  </b>
                </div>

                <div
                  className={
                    styles.distanceChoices
                  }
                >
                  {[
                    10,
                    25,
                    50,
                    100,
                  ].map(
                    (value) => (
                      <button
                        key={
                          value
                        }
                        data-active={
                          prefs.maximumDistance ===
                          value
                        }
                        onClick={() =>
                          patchPrefs({
                            maximumDistance:
                              value,
                          })
                        }
                      >
                        {
                          value
                        }{' '}
                        km
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div
              className={
                styles.connectTabs
              }
            >
              <button
                data-active={
                  connectTab ===
                  'friend'
                }
                onClick={() =>
                  setConnectTab(
                    'friend',
                  )
                }
              >
                {
                  ct.friendSettings
                }
              </button>

              <button
                data-active={
                  connectTab ===
                  'love'
                }
                onClick={() =>
                  setConnectTab(
                    'love',
                  )
                }
              >
                {
                  ct.loveSettings
                }
              </button>
            </div>

            {!connect ? (
              <div
                className={
                  styles.connectState
                }
              >
                <strong>
                  {
                    ct.loadError
                  }
                </strong>

                {connectError ? (
                  <p>
                    {
                      connectError
                    }
                  </p>
                ) : null}

                <button
                  onClick={() =>
                    account &&
                    void loadConnect(
                      account.userId,
                    )
                  }
                >
                  {
                    ct.retry
                  }
                </button>
              </div>
            ) : connectTab ===
              'friend' ? (
              <div
                className={
                  styles.connectPanel
                }
              >
                <p
                  className={
                    styles.connectHint
                  }
                >
                  {
                    ct.friendHint
                  }
                </p>

                <div
                  className={
                    styles.connectTwoCol
                  }
                >
                  <div
                    className={
                      styles.formCard
                    }
                  >
                    <label>
                      {
                        ct.intro
                      }
                    </label>

                    <textarea
                      maxLength={
                        240
                      }
                      value={
                        connect
                          .friend
                          .intro
                      }
                      onChange={(
                        e,
                      ) =>
                        patchFriend({
                          intro:
                            e.target
                              .value,
                        })
                      }
                      placeholder={
                        ct.introPlaceholder
                      }
                    />

                    <small>
                      {
                        connect
                          .friend
                          .intro
                          .length
                      }
                      /240
                    </small>
                  </div>

                  <div
                    className={
                      styles.formCard
                    }
                  >
                    <label>
                      {
                        ct.age
                      }
                    </label>

                    <AgeEditor
                      minLabel={
                        ct.minimum
                      }
                      maxLabel={
                        ct.maximum
                      }
                      min={
                        connect
                          .friend
                          .preferredAgeMin
                      }
                      max={
                        connect
                          .friend
                          .preferredAgeMax
                      }
                      onMin={(
                        delta,
                      ) =>
                        adjustAge(
                          'friend',
                          'preferredAgeMin',
                          delta,
                        )
                      }
                      onMax={(
                        delta,
                      ) =>
                        adjustAge(
                          'friend',
                          'preferredAgeMax',
                          delta,
                        )
                      }
                    />
                  </div>
                </div>

                <ConnectOptionBlock
                  label={
                    ct.goals
                  }
                >
                  <div
                    className={
                      styles.interests
                    }
                  >
                    {FRIEND_GOALS.map(
                      (item) => (
                        <button
                          key={
                            item
                          }
                          data-active={
                            connect.friend.goals.includes(
                              item,
                            )
                          }
                          onClick={() =>
                            toggleFriendGoal(
                              item,
                            )
                          }
                        >
                          {connect.friend.goals.includes(
                            item,
                          )
                            ? '✓ '
                            : ''}
                          {
                            ct[
                              item
                            ]
                          }
                        </button>
                      ),
                    )}
                  </div>
                </ConnectOptionBlock>

                <ConnectOptionBlock
                  label={
                    ct.languages
                  }
                >
                  <div
                    className={
                      styles.interests
                    }
                  >
                    {CHAT_LANGUAGE_OPTIONS.filter(
                      (item) =>
                        FRIEND_LANGUAGE_CODES.includes(
                          item[0] as (
                            typeof FRIEND_LANGUAGE_CODES
                          )[number],
                        ),
                    ).map(
                      (item) => (
                        <button
                          key={
                            item[0]
                          }
                          data-active={
                            connect.friend.preferredLanguages.includes(
                              item[0],
                            )
                          }
                          onClick={() =>
                            toggleFriendLanguage(
                              item[0],
                            )
                          }
                        >
                          {connect.friend.preferredLanguages.includes(
                            item[0],
                          )
                            ? '✓ '
                            : ''}
                          {
                            item[1]
                          }{' '}
                          ·{' '}
                          {item[0].toUpperCase()}
                        </button>
                      ),
                    )}
                  </div>
                </ConnectOptionBlock>

                <ConnectOptionBlock
                  label={
                    ct.sharedInterests
                  }
                >
                  <div
                    className={
                      styles.interests
                    }
                  >
                    {AVAILABLE_INTERESTS.map(
                      (item) => (
                        <button
                          key={
                            item
                          }
                          data-active={
                            connect.friend.preferredInterests.includes(
                              item,
                            )
                          }
                          onClick={() =>
                            toggleFriendInterest(
                              item,
                            )
                          }
                        >
                          {connect.friend.preferredInterests.includes(
                            item,
                          )
                            ? '✓ '
                            : ''}
                          {
                            item
                          }
                        </button>
                      ),
                    )}
                  </div>
                </ConnectOptionBlock>

                <NationalityPicker
                  locale={
                    locale
                  }
                  copy={
                    ct
                  }
                  values={
                    connect
                      .friend
                      .preferredNationalities
                  }
                  onAdd={(
                    value,
                  ) =>
                    addNationality(
                      'friend',
                      value,
                    )
                  }
                  onRemove={(
                    value,
                  ) =>
                    removeNationality(
                      'friend',
                      value,
                    )
                  }
                />

                <div
                  className={
                    styles.toggleRows
                  }
                >
                  <ToggleSetting
                    title={
                      ct.allowDiscovery
                    }
                    description={
                      ct.allowDiscoveryDesc
                    }
                    value={
                      connect
                        .friend
                        .allowDiscovery
                    }
                    onChange={() =>
                      patchFriend({
                        allowDiscovery:
                          !connect
                            .friend
                            .allowDiscovery,
                      })
                    }
                  />

                  <ToggleSetting
                    title={
                      ct.sameCity
                    }
                    description={
                      ct.sameCityDesc
                    }
                    value={
                      connect
                        .friend
                        .showSameCityFirst
                    }
                    onChange={() =>
                      patchFriend({
                        showSameCityFirst:
                          !connect
                            .friend
                            .showSameCityFirst,
                      })
                    }
                  />
                </div>
              </div>
            ) : (
              <div
                className={
                  styles.connectPanel
                }
              >
                <p
                  className={
                    styles.connectHint
                  }
                >
                  {
                    ct.loveHint
                  }
                </p>

                <div
                  className={
                    styles.connectTwoCol
                  }
                >
                  <div
                    className={
                      styles.formCard
                    }
                  >
                    <label>
                      {
                        ct.loveIntro
                      }
                    </label>

                    <textarea
                      maxLength={
                        240
                      }
                      value={
                        loveIntro
                      }
                      onChange={(
                        e,
                      ) => {
                        setConnectMessage(
                          '',
                        );

                        setLoveIntro(
                          e.target
                            .value,
                        );
                      }}
                      placeholder={
                        ct.loveIntroPlaceholder
                      }
                    />

                    <small>
                      {
                        loveIntro.length
                      }
                      /240
                    </small>
                  </div>

                  <ConnectOptionBlock
                    label={
                      ct.relationshipGoal
                    }
                  >
                    <div
                      className={
                        styles.interests
                      }
                    >
                      {LOVE_RELATIONSHIP_GOALS.map(
                        (item) => (
                          <button
                            key={
                              item
                            }
                            data-active={
                              connect.love.relationshipGoal ===
                              item
                            }
                            onClick={() =>
                              patchLove({
                                relationshipGoal:
                                  item,
                              })
                            }
                          >
                            {connect.love.relationshipGoal ===
                            item
                              ? '✓ '
                              : ''}
                            {
                              ct[
                                item
                              ]
                            }
                          </button>
                        ),
                      )}
                    </div>
                  </ConnectOptionBlock>
                </div>

                <div
                  className={
                    styles.connectTwoCol
                  }
                >
                  <ConnectOptionBlock
                    label={
                      ct.genders
                    }
                  >
                    <div
                      className={
                        styles.interests
                      }
                    >
                      {LOVE_GENDER_OPTIONS.map(
                        (item) => (
                          <button
                            key={
                              item
                            }
                            data-active={
                              connect.love.interestedGenders.includes(
                                item,
                              )
                            }
                            onClick={() =>
                              toggleLoveGender(
                                item,
                              )
                            }
                          >
                            {connect.love.interestedGenders.includes(
                              item,
                            )
                              ? '✓ '
                              : ''}
                            {
                              ct[
                                item
                              ]
                            }
                          </button>
                        ),
                      )}
                    </div>
                  </ConnectOptionBlock>

                  <div
                    className={
                      styles.formCard
                    }
                  >
                    <label>
                      {
                        ct.age
                      }
                    </label>

                    <AgeEditor
                      minLabel={
                        ct.minimum
                      }
                      maxLabel={
                        ct.maximum
                      }
                      min={
                        connect
                          .love
                          .preferredAgeMin
                      }
                      max={
                        connect
                          .love
                          .preferredAgeMax
                      }
                      onMin={(
                        delta,
                      ) =>
                        adjustAge(
                          'love',
                          'preferredAgeMin',
                          delta,
                        )
                      }
                      onMax={(
                        delta,
                      ) =>
                        adjustAge(
                          'love',
                          'preferredAgeMax',
                          delta,
                        )
                      }
                    />
                  </div>
                </div>

                <NationalityPicker
                  locale={
                    locale
                  }
                  copy={
                    ct
                  }
                  values={
                    connect
                      .love
                      .preferredNationalities
                  }
                  onAdd={(
                    value,
                  ) =>
                    addNationality(
                      'love',
                      value,
                    )
                  }
                  onRemove={(
                    value,
                  ) =>
                    removeNationality(
                      'love',
                      value,
                    )
                  }
                />
              </div>
            )}

            <div
              className={
                styles.connectSaveBar
              }
            >
              <div>
                {connectError ? (
                  <span
                    data-error="true"
                  >
                    {
                      connectError
                    }
                  </span>
                ) : connectMessage ? (
                  <span>
                    {
                      connectMessage
                    }
                  </span>
                ) : null}
              </div>

              <button
                disabled={
                  !connect ||
                  connectSaving
                }
                onClick={() =>
                  void saveConnect()
                }
              >
                {connectSaving
                  ? ct.saving
                  : ct.save}
              </button>
            </div>
          </SettingsSection>

          <SettingsSection
            title={
              t.package
            }
            description={
              t.packageDesc
            }
            icon="★"
          >
            <div
              className={
                styles.packageCard
              }
            >
              <div
                className={
                  styles.packageHead
                }
              >
                <div>
                  <strong>
                    {planName(
                      account.planCode,
                      t,
                    )}
                  </strong>

                  <span>
                    {
                      t.currentPackage
                    }
                  </span>
                </div>

                <b>
                  ●{' '}
                  {
                    t.active
                  }
                </b>
              </div>

              <div
                className={
                  styles.benefits
                }
              >
                <span>
                  ✓{' '}
                  {
                    t.translations
                  }
                </span>

                <span>
                  ✓{' '}
                  {account.translationBalance.toLocaleString()}{' '}
                  {
                    t.credits
                  }
                </span>

                <span>
                  ✓{' '}
                  {
                    t.profiles
                  }
                </span>

                <span>
                  ✓{' '}
                  {
                    t.favorites
                  }
                </span>
              </div>

              <Link
                className={
                  styles.primaryLink
                }
                href="/premium"
              >
                {
                  t.viewPackages
                }
              </Link>
            </div>
          </SettingsSection>

          <SettingsSection
            title={
              t.privacy
            }
            icon="◉"
          >
            <div
              className={
                styles.settingRows
              }
            >
              <div
                className={
                  styles.settingRow
                }
              >
                <span
                  className={
                    styles.rowIcon
                  }
                >
                  •
                </span>

                <div>
                  <strong>
                    {
                      t.notifications
                    }
                  </strong>

                  <small>
                    {
                      t.notificationsDesc
                    }
                  </small>
                </div>

                <button
                  className={
                    styles.switch
                  }
                  data-on={
                    prefs.notificationsEnabled
                  }
                  aria-pressed={
                    prefs.notificationsEnabled
                  }
                  onClick={() =>
                    patchPrefs({
                      notificationsEnabled:
                        !prefs.notificationsEnabled,
                    })
                  }
                >
                  <i />
                </button>
              </div>

              <SettingsLink
                icon="◎"
                title={
                  t.privacyData
                }
                value={
                  t.manage
                }
                href="/privacy-data"
              />

              <SettingsLink
                icon="⊘"
                title={
                  t.blocked
                }
                value={
                  t.manage
                }
                href="/blocked-users"
              />

              {account.canQuestRewardAdmin ? (
                <SettingsLink
                  icon="Q"
                  title={
                    t.questAdmin
                  }
                  value={
                    t.manage
                  }
                  href="/admin/quest-rewards"
                />
              ) : null}

              {account.adminHasReviewAccess ? (
                <SettingsLink
                  icon="✓"
                  title={
                    t.reviewAdmin
                  }
                  value={
                    t.manage
                  }
                  href="/admin/review-center"
                />
              ) : null}

              {account.canModerate &&
              !account.adminHasReviewAccess ? (
                <SettingsLink
                  icon="!"
                  title={
                    t.moderation
                  }
                  value={
                    t.manage
                  }
                  href="/admin/review-center"
                />
              ) : null}

              {account.canQuestRewardAdmin ? (
                <SettingsLink
                  icon="✓"
                  title={
                    t.diagnostics
                  }
                  value={
                    t.manage
                  }
                  href="/production-diagnostics"
                />
              ) : null}

              {account.canQuestRewardAdmin ? (
                <SettingsLink
                  icon="⌫"
                  title={
                    t.cleanup
                  }
                  value={
                    t.manage
                  }
                  href="/prelaunch-cleanup"
                />
              ) : null}

              <SettingsLink
                icon="?"
                title={
                  t.help
                }
                value=""
                href="/support"
              />
            </div>
          </SettingsSection>
        </div>

        <div
          className={
            styles.footerArea
          }
        >
          <span>
            {t.version}
          </span>
        </div>
      </section>

      {languageOpen ? (
        <div
          className={
            styles.modalBackdrop
          }
          onMouseDown={(
            e,
          ) => {
            if (
              e.currentTarget ===
              e.target
            ) {
              setLanguageOpen(
                false,
              );
            }
          }}
        >
          <section
            className={
              styles.modal
            }
          >
            <header>
              <div>
                <small>
                  MELO CHAT
                </small>

                <h2>
                  {
                    t.selectLanguage
                  }
                </h2>
              </div>

              <button
                onClick={() =>
                  setLanguageOpen(
                    false,
                  )
                }
              >
                ×
              </button>
            </header>

            <div
              className={
                styles.modalSearch
              }
            >
              <span>
                ⌕
              </span>

              <input
                autoFocus
                value={
                  languageQuery
                }
                onChange={(
                  e,
                ) =>
                  setLanguageQuery(
                    e.target
                      .value,
                  )
                }
                placeholder={
                  t.searchLanguage
                }
              />
            </div>

            <div
              className={
                styles.languageList
              }
            >
              {filteredLanguages.map(
                (item) => (
                  <button
                    key={
                      item[0]
                    }
                    data-active={
                      prefs.translationLanguage ===
                      item[0]
                    }
                    onClick={() =>
                      void selectChatLanguage(
                        item[0],
                      )
                    }
                  >
                    <div>
                      <strong>
                        {
                          item[1]
                        }
                      </strong>

                      <small>
                        {
                          item[2]
                        }{' '}
                        ·{' '}
                        {item[0].toUpperCase()}
                      </small>
                    </div>

                    {prefs.translationLanguage ===
                    item[0] ? (
                      <b>
                        ✓
                      </b>
                    ) : null}
                  </button>
                ),
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function AgeEditor({
  minLabel,
  maxLabel,
  min,
  max,
  onMin,
  onMax,
}: {
  minLabel: string;
  maxLabel: string;
  min: number;
  max: number;
  onMin: (
    delta: number,
  ) => void;
  onMax: (
    delta: number,
  ) => void;
}) {
  return (
    <div
      className={
        styles.ageEditor
      }
    >
      <div>
        <small>
          {minLabel}
        </small>

        <span>
          <button
            onClick={() =>
              onMin(-1)
            }
          >
            −
          </button>

          <strong>
            {min}
          </strong>

          <button
            onClick={() =>
              onMin(1)
            }
          >
            ＋
          </button>
        </span>
      </div>

      <div>
        <small>
          {maxLabel}
        </small>

        <span>
          <button
            onClick={() =>
              onMax(-1)
            }
          >
            −
          </button>

          <strong>
            {max}
          </strong>

          <button
            onClick={() =>
              onMax(1)
            }
          >
            ＋
          </button>
        </span>
      </div>
    </div>
  );
}

function ConnectOptionBlock({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <div
      className={
        styles.optionBlock
      }
    >
      <label>
        {label}
      </label>

      {children}
    </div>
  );
}

function ToggleSetting({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div
      className={
        styles.toggleSetting
      }
    >
      <div>
        <strong>
          {title}
        </strong>

        <small>
          {description}
        </small>
      </div>

      <button
        className={
          styles.switch
        }
        data-on={
          value
        }
        aria-pressed={
          value
        }
        onClick={
          onChange
        }
      >
        <i />
      </button>
    </div>
  );
}

function NationalityPicker({
  locale,
  copy,
  values,
  onAdd,
  onRemove,
}: {
  locale: Locale;
  copy:
    typeof CONNECT_COPY.en;
  values: string[];
  onAdd:
    (
      value: string,
    ) => void;
  onRemove:
    (
      value: string,
    ) => void;
}) {
  const maxed =
    values.length >= 3;

  return (
    <div
      className={
        styles.nationalityPicker
      }
    >
      <div
        className={
          styles.nationalityHeader
        }
      >
        <div>
          <label>
            {
              copy.nationalities
            }
          </label>

          <small>
            {
              copy.nationalitiesDesc
            }
          </small>
        </div>

        <span>
          {
            values.length
          }
          /3
        </span>
      </div>

      <div
        className={
          styles.nationalityChips
        }
      >
        {values.map(
          (value) => {
            const country =
              DISCOVERY_COUNTRIES.find(
                (item) =>
                  item.value ===
                    value ||
                  item.code ===
                    value ||
                  Object.values(
                    item.labels,
                  ).includes(
                    value as never,
                  ),
              );

            return (
              <button
                key={
                  value
                }
                onClick={() =>
                  onRemove(
                    value,
                  )
                }
              >
                ✓{' '}
                {country
                  ?.labels[
                    locale
                  ] ??
                  value}{' '}
                ×
              </button>
            );
          },
        )}
      </div>

      <select
        value=""
        disabled={
          maxed
        }
        onChange={(
          e,
        ) => {
          onAdd(
            e.target.value,
          );

          e.currentTarget.value =
            '';
        }}
      >
        <option value="">
          {maxed
            ? copy.maxThree
            : copy.selectCountry}
        </option>

        {DISCOVERY_COUNTRIES.filter(
          (country) =>
            !values.includes(
              country.value,
            ),
        ).map(
          (country) => (
            <option
              key={
                country.code
              }
              value={
                country.value
              }
            >
              {
                country.labels[
                  locale
                ]
              }
            </option>
          ),
        )}
      </select>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  icon,
  wide,
  children,
}: {
  title: string;
  description?: string;
  icon: string;
  wide?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <section
      className={`${styles.sectionCard} ${
        wide
          ? styles.wide
          : ''
      }`}
    >
      <header>
        <span>
          {icon}
        </span>

        <div>
          <h2>
            {title}
          </h2>

          {description ? (
            <p>
              {description}
            </p>
          ) : null}
        </div>
      </header>

      <div
        className={
          styles.sectionBody
        }
      >
        {children}
      </div>
    </section>
  );
}

function SettingsLink({
  icon,
  title,
  value,
  href,
}: {
  icon: string;
  title: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={
        styles.settingRowButton
      }
    >
      <span
        className={
          styles.rowIcon
        }
      >
        {icon}
      </span>

      <div>
        <strong>
          {title}
        </strong>
      </div>

      {value ? (
        <em>
          {value}
        </em>
      ) : null}

      <b>
        ›
      </b>
    </Link>
  );
}
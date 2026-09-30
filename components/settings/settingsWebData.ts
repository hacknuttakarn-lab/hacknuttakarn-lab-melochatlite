'use client';

import {
  getCurrentUser,
  publicStorageUrl,
  restSelect,
  restUpsert,
  rpcRequest,
  signOut,
} from '@/lib/supabase/browser';

export type DiscoveryPreference = 'women' | 'men' | 'everyone';
export type WebUserSettings = {
  translationLanguage: string;
  discoveryPreference: DiscoveryPreference;
  maximumDistance: number;
  selectedInterests: string[];
  notificationsEnabled: boolean;
};

export const FRIEND_GOALS = ['local_friend','travel_buddy','language_exchange','activity_partner','online_friend'] as const;
export type FriendGoalWeb = (typeof FRIEND_GOALS)[number];
export type FriendPreferencesWeb = {
  allowDiscovery: boolean;
  intro: string;
  goals: FriendGoalWeb[];
  preferredLanguages: string[];
  preferredInterests: string[];
  preferredNationalities: string[];
  preferredAgeMin: number;
  preferredAgeMax: number;
  showSameCityFirst: boolean;
};
export type ConnectionIntentsWeb = {
  loveEnabled: boolean;
  friendsEnabled: boolean;
  travelBuddyEnabled: boolean;
  hangoutStatus: 'none' | 'today' | 'weekend' | 'traveling';
  hangoutActivity: string;
};
export type LovePreferencesWeb = {
  relationshipGoal: 'longTerm' | 'seriousOpen' | 'friends' | 'unsure';
  interestedGenders: Array<'female' | 'male' | 'lgbtq'>;
  preferredAgeMin: number;
  preferredAgeMax: number;
  preferredNationalities: string[];
};
export type ConnectPreferenceSnapshot = {
  friend: FriendPreferencesWeb;
  intents: ConnectionIntentsWeb;
  love: LovePreferencesWeb;
};

export type SettingsAccountSnapshot = {
  userId: string;
  email: string;
  displayName: string;
  primaryLanguage: string;
  autoTranslationEnabled: boolean;
  planCode: 'free' | 'premium' | 'ultimate';
  translationBalance: number;
  subscriptionStatus: string;
  adminRole: 'user' | 'reviewer' | 'admin' | 'super_admin';
  adminActive: boolean;
  adminHasReviewAccess: boolean;
  canQuestRewardAdmin: boolean;
  canModerate: boolean;
};

export type PackageProduct = {
  code: string;
  productType: string;
  planCode: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  priceSatang: number;
  currency: string;
  translationCredits: number;
  featuresTh: string[];
  featuresEn: string[];
  badgeTh: string;
  badgeEn: string;
};

export type BlockedUserWeb = {
  userId: string;
  displayName: string;
  photoUrl: string;
  blockedAt: string;
  reason: string;
};

export type PrivacyStatusWeb = {
  deletionStatus: string;
  deletionRequestedAt: string;
  deletionScheduledFor: string;
  deletionFailureMessage: string;
};

export type AdminReviewHomeWeb = {
  hasAccess: boolean;
  pendingCount: number;
};

export type PrelaunchCountsWeb = {
  trips: number;
  socialPosts: number;
  events: number;
  communities: number;
  businessServices: number;
};

export type QuestRewardAdminStatsWeb = {
  quests: number;
  activeQuests: number;
  rewards: number;
  activeRewards: number;
  completions: number;
  redemptions: number;
};

type Row = Record<string, unknown>;

const SETTINGS_KEY = 'melo-web-user-settings-v2';

export const AVAILABLE_INTERESTS = [
  'Travel',
  'Coffee',
  'Technology',
  'Music',
  'Business',
  'Food',
  'Fitness',
  'Movies',
] as const;

export const FRIEND_LANGUAGE_CODES = ['th','en','zh','ja','ko','de','fr','es','id','ms'] as const;
export const LOVE_RELATIONSHIP_GOALS = ['longTerm','seriousOpen','friends','unsure'] as const;
export const LOVE_GENDER_OPTIONS = ['female','male','lgbtq'] as const;

export const CHAT_LANGUAGE_OPTIONS = [
  ['af','Afrikaans','Afrikaans'],['sq','Shqip','Albanian'],['ar','العربية','Arabic'],['hy','Հայերեն','Armenian'],['az','Azərbaycanca','Azerbaijani'],['be','Беларуская','Belarusian'],['bn','বাংলা','Bengali'],['bs','Bosanski','Bosnian'],['bg','Български','Bulgarian'],['my','မြန်မာ','Burmese'],['ca','Català','Catalan'],['zh','简体中文','Chinese (Simplified)'],['zh-tw','繁體中文','Chinese (Traditional)'],['yue','粵語','Cantonese'],['hr','Hrvatski','Croatian'],['cs','Čeština','Czech'],['da','Dansk','Danish'],['nl','Nederlands','Dutch'],['en','English','English'],['et','Eesti','Estonian'],['fi','Suomi','Finnish'],['tl','Filipino','Filipino'],['fr','Français','French'],['ka','ქართული','Georgian'],['de','Deutsch','German'],['el','Ελληνικά','Greek'],['gu','ગુજરાતી','Gujarati'],['hi','हिन्दी','Hindi'],['hu','Magyar','Hungarian'],['id','Bahasa Indonesia','Indonesian'],['ga','Gaeilge','Irish'],['it','Italiano','Italian'],['ja','日本語','Japanese'],['kk','Қазақша','Kazakh'],['km','ខ្មែរ','Khmer'],['ko','한국어','Korean'],['lo','ລາວ','Lao'],['lv','Latviešu','Latvian'],['lt','Lietuvių','Lithuanian'],['ms','Bahasa Melayu','Malay'],['ml','മലയാളം','Malayalam'],['mr','मराठी','Marathi'],['mn','Монгол','Mongolian'],['ne','नेपाली','Nepali'],['no','Norsk','Norwegian'],['fa','فارسی','Persian'],['pl','Polski','Polish'],['pt','Português','Portuguese'],['pa','ਪੰਜਾਬੀ','Punjabi'],['ro','Română','Romanian'],['ru','Русский','Russian'],['sr','Српски','Serbian'],['sk','Slovenčina','Slovak'],['sl','Slovenščina','Slovenian'],['es','Español','Spanish'],['sw','Kiswahili','Swahili'],['sv','Svenska','Swedish'],['ta','தமிழ்','Tamil'],['te','తెలుగు','Telugu'],['th','ไทย','Thai'],['tr','Türkçe','Turkish'],['uk','Українська','Ukrainian'],['ur','اردو','Urdu'],['uz','O‘zbekcha','Uzbek'],['vi','Tiếng Việt','Vietnamese'],['cy','Cymraeg','Welsh'],
] as const;

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((row): row is Row => Boolean(row) && typeof row === 'object');
  if (value && typeof value === 'object') return [value as Row];
  return [];
}

function text(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function numberValue(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return 0;
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return Math.max(0, value);
  }
  return 0;
}

function boolValue(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return false;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;
  }
  return false;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function normalizePlan(value: string) {
  return value === 'premium' || value === 'ultimate' ? value : 'free';
}

export function defaultWebUserSettings(primaryLanguage = 'th'): WebUserSettings {
  return {
    translationLanguage: primaryLanguage || 'th',
    discoveryPreference: 'everyone',
    maximumDistance: 50,
    selectedInterests: ['Travel', 'Coffee', 'Technology'],
    notificationsEnabled: true,
  };
}

export function loadWebUserSettings(primaryLanguage = 'th'): WebUserSettings {
  const defaults = defaultWebUserSettings(primaryLanguage);
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<WebUserSettings>;
    return {
      translationLanguage: typeof parsed.translationLanguage === 'string' && parsed.translationLanguage ? parsed.translationLanguage : defaults.translationLanguage,
      discoveryPreference: parsed.discoveryPreference === 'women' || parsed.discoveryPreference === 'men' || parsed.discoveryPreference === 'everyone' ? parsed.discoveryPreference : defaults.discoveryPreference,
      maximumDistance: [10,25,50,100].includes(Number(parsed.maximumDistance)) ? Number(parsed.maximumDistance) : defaults.maximumDistance,
      selectedInterests: Array.isArray(parsed.selectedInterests) ? parsed.selectedInterests.map(String).filter((item) => AVAILABLE_INTERESTS.includes(item as (typeof AVAILABLE_INTERESTS)[number])) : defaults.selectedInterests,
      notificationsEnabled: typeof parsed.notificationsEnabled === 'boolean' ? parsed.notificationsEnabled : defaults.notificationsEnabled,
    };
  } catch {
    return defaults;
  }
}

export function saveWebUserSettings(settings: WebUserSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('melo-web-settings-changed', { detail: settings }));
}

export function chatLanguageLabel(code: string) {
  const row = CHAT_LANGUAGE_OPTIONS.find((item) => item[0] === code);
  return row ? `${row[1]} · ${row[2]}` : code.toUpperCase();
}


const DEFAULT_FRIEND_PREFERENCES: FriendPreferencesWeb = {
  allowDiscovery: true,
  intro: '',
  goals: ['local_friend','travel_buddy','language_exchange'],
  preferredLanguages: [],
  preferredInterests: [],
  preferredNationalities: [],
  preferredAgeMin: 18,
  preferredAgeMax: 99,
  showSameCityFirst: true,
};

const DEFAULT_CONNECTION_INTENTS: ConnectionIntentsWeb = {
  loveEnabled: true,
  friendsEnabled: true,
  travelBuddyEnabled: true,
  hangoutStatus: 'none',
  hangoutActivity: '',
};

const DEFAULT_LOVE_PREFERENCES: LovePreferencesWeb = {
  relationshipGoal: 'unsure',
  interestedGenders: ['female','male','lgbtq'],
  preferredAgeMin: 18,
  preferredAgeMax: 80,
  preferredNationalities: [],
};

function isMissingRpcMessage(error: string | null) {
  const value=String(error??'').toLowerCase();
  return value.includes('could not find the function') || value.includes('schema cache') || value.includes('pgrst202');
}

function friendGoals(value: unknown): FriendGoalWeb[] {
  const allowed=new Set<string>(FRIEND_GOALS);
  return stringArray(value).filter((item): item is FriendGoalWeb=>allowed.has(item));
}

function friendPreferencesFromRow(row: Row | null, legacy=false): FriendPreferencesWeb {
  if(!row)return {...DEFAULT_FRIEND_PREFERENCES};
  const goals=friendGoals(row.goals);
  return {
    allowDiscovery: legacy ? true : row.allow_discovery==null ? true : boolValue(row,'allow_discovery'),
    intro: text(row,'intro'),
    goals: goals.length?goals:[...DEFAULT_FRIEND_PREFERENCES.goals],
    preferredLanguages: stringArray(row.preferred_languages),
    preferredInterests: stringArray(row.preferred_interests),
    preferredNationalities: legacy?[]:stringArray(row.preferred_nationalities).slice(0,3),
    preferredAgeMin: Math.max(18,Math.min(99,numberValue(row,'preferred_age_min')||18)),
    preferredAgeMax: Math.max(18,Math.min(99,numberValue(row,'preferred_age_max')||99)),
    showSameCityFirst: row.show_same_city_first==null ? true : boolValue(row,'show_same_city_first'),
  };
}

async function loadFriendPreferencesWeb(): Promise<FriendPreferencesWeb> {
  const v2=await rpcRequest<Row|Row[]>('get_my_friend_preferences_v2');
  if(!v2.error)return friendPreferencesFromRow(rowsOf(v2.data)[0]??null);
  if(!isMissingRpcMessage(v2.error))throw new Error(v2.error);
  const legacy=await rpcRequest<Row|Row[]>('get_my_friend_preferences');
  if(legacy.error&&isMissingRpcMessage(legacy.error))return {...DEFAULT_FRIEND_PREFERENCES};
  if(legacy.error)throw new Error(legacy.error);
  return friendPreferencesFromRow(rowsOf(legacy.data)[0]??null,true);
}

function connectionIntentsFromRow(row: Row | null): ConnectionIntentsWeb {
  if(!row)return {...DEFAULT_CONNECTION_INTENTS};
  const status=text(row,'hangout_status');
  return {
    loveEnabled: row.love_enabled==null?true:boolValue(row,'love_enabled'),
    friendsEnabled: row.friends_enabled==null?true:boolValue(row,'friends_enabled'),
    travelBuddyEnabled: row.travel_buddy_enabled==null?true:boolValue(row,'travel_buddy_enabled'),
    hangoutStatus: status==='today'||status==='weekend'||status==='traveling'?status:'none',
    hangoutActivity: text(row,'hangout_activity'),
  };
}

function lovePreferencesFromRow(row: Row | null): LovePreferencesWeb {
  if(!row)return {...DEFAULT_LOVE_PREFERENCES};
  const goal=text(row,'relationship_goal');
  const relationshipGoal: LovePreferencesWeb['relationshipGoal'] = goal==='longTerm'||goal==='seriousOpen'||goal==='friends'||goal==='unsure'?goal:'unsure';
  const genders=stringArray(row.interested_genders).filter((item): item is 'female'|'male'|'lgbtq'=>item==='female'||item==='male'||item==='lgbtq');
  return {
    relationshipGoal,
    interestedGenders:genders.length?genders:[...DEFAULT_LOVE_PREFERENCES.interestedGenders],
    preferredAgeMin:Math.max(18,Math.min(80,numberValue(row,'preferred_age_min')||18)),
    preferredAgeMax:Math.max(18,Math.min(80,numberValue(row,'preferred_age_max')||80)),
    preferredNationalities:stringArray(row.preferred_nationalities).slice(0,3),
  };
}

export async function loadConnectPreferenceSnapshot(userId:string): Promise<ConnectPreferenceSnapshot> {
  const [friend,intentsResult,profileResult]=await Promise.all([
    loadFriendPreferencesWeb(),
    rpcRequest<Row|Row[]>('get_my_connection_intents_v1'),
    restSelect<Row[]>('profiles',`select=id,relationship_goal,interested_genders,preferred_age_min,preferred_age_max,preferred_nationalities&id=eq.${encodeURIComponent(userId)}&limit=1`),
  ]);
  if(profileResult.error)throw new Error(profileResult.error);
  const intents=intentsResult.error&&isMissingRpcMessage(intentsResult.error)
    ? {...DEFAULT_CONNECTION_INTENTS}
    : intentsResult.error
      ? (()=>{throw new Error(intentsResult.error as string)})()
      : connectionIntentsFromRow(rowsOf(intentsResult.data)[0]??null);
  return {friend,intents,love:lovePreferencesFromRow(rowsOf(profileResult.data)[0]??null)};
}

async function saveFriendPreferencesWeb(preferences:FriendPreferencesWeb) {
  const payload={
    p_allow_discovery:preferences.allowDiscovery,
    p_intro:preferences.intro.trim()||null,
    p_goals:preferences.goals,
    p_preferred_languages:preferences.preferredLanguages,
    p_preferred_interests:preferences.preferredInterests,
    p_preferred_nationalities:preferences.preferredNationalities.slice(0,3),
    p_preferred_age_min:preferences.preferredAgeMin,
    p_preferred_age_max:preferences.preferredAgeMax,
    p_show_same_city_first:preferences.showSameCityFirst,
  };
  const v2=await rpcRequest('save_my_friend_preferences_v2',payload);
  if(!v2.error)return;
  if(!isMissingRpcMessage(v2.error))throw new Error(v2.error);
  const legacy=await rpcRequest('save_my_friend_preferences',{
    p_is_enabled:true,
    p_intro:payload.p_intro,
    p_goals:payload.p_goals,
    p_preferred_languages:payload.p_preferred_languages,
    p_preferred_interests:payload.p_preferred_interests,
    p_preferred_age_min:payload.p_preferred_age_min,
    p_preferred_age_max:payload.p_preferred_age_max,
    p_show_same_city_first:payload.p_show_same_city_first,
  });
  if(legacy.error)throw new Error(legacy.error);
}

export async function saveConnectPreferenceSnapshot(userId:string,snapshot:ConnectPreferenceSnapshot) {
  const friendMin=Math.max(18,Math.min(99,snapshot.friend.preferredAgeMin));
  const friendMax=Math.max(friendMin,Math.min(99,snapshot.friend.preferredAgeMax));
  const loveMin=Math.max(18,Math.min(80,snapshot.love.preferredAgeMin));
  const loveMax=Math.max(loveMin,Math.min(80,snapshot.love.preferredAgeMax));
  const [_,intents,profile]=await Promise.all([
    saveFriendPreferencesWeb({...snapshot.friend,preferredAgeMin:friendMin,preferredAgeMax:friendMax,preferredNationalities:snapshot.friend.preferredNationalities.slice(0,3)}),
    rpcRequest('save_my_connection_intents_v1',{
      p_love_enabled:snapshot.intents.loveEnabled,
      p_friends_enabled:snapshot.intents.friendsEnabled,
      p_travel_buddy_enabled:snapshot.intents.travelBuddyEnabled,
      p_hangout_status:snapshot.intents.hangoutStatus,
      p_hangout_activity:snapshot.intents.hangoutActivity.trim()||null,
    }),
    restUpsert<Row[]>('profiles',{
      id:userId,
      relationship_goal:snapshot.love.relationshipGoal,
      interested_genders:snapshot.love.interestedGenders,
      preferred_age_min:loveMin,
      preferred_age_max:loveMax,
      preferred_nationalities:snapshot.love.preferredNationalities.slice(0,3),
    },'id'),
  ]);
  if(intents.error)throw new Error(intents.error);
  if(profile.error)throw new Error(profile.error);
}

export async function loadSettingsAccountSnapshot(): Promise<SettingsAccountSnapshot> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('AUTH_REQUIRED');
  const [profileResult, monetizationResult, adminResult, moderationResult] = await Promise.all([
    restSelect<Row[]>('profiles', `select=*&id=eq.${encodeURIComponent(user.id)}&limit=1`),
    rpcRequest<Row | Row[]>('get_my_monetization_summary'),
    rpcRequest<Row | Row[]>('get_my_admin_review_access'),
    rpcRequest<Row | Row[]>('get_my_moderation_access'),
  ]);
  const profile = rowsOf(profileResult.data)[0] ?? {};
  const monetization = rowsOf(monetizationResult.data)[0] ?? {};
  const admin = rowsOf(adminResult.data)[0] ?? {};
  const moderation = rowsOf(moderationResult.data)[0] ?? {};
  const adminRoleText = text(admin, 'role');
  const adminRole: SettingsAccountSnapshot['adminRole'] = adminRoleText === 'super_admin' || adminRoleText === 'admin' || adminRoleText === 'reviewer' ? adminRoleText : 'user';
  const permissions = admin.permissions && typeof admin.permissions === 'object' && !Array.isArray(admin.permissions) ? admin.permissions as Row : {};
  const hasReview = Object.values(permissions).some((value) => value === true) || ['super_admin','admin','reviewer'].includes(adminRole);
  return {
    userId: user.id,
    email: user.email ?? '',
    displayName: text(profile, 'display_name', 'name', 'full_name') || user.email?.split('@')[0] || 'Melo User',
    primaryLanguage: text(profile, 'primary_language') || 'th',
    autoTranslationEnabled: profile.auto_translation_enabled !== false,
    planCode: normalizePlan(text(monetization, 'plan_code')),
    translationBalance: numberValue(monetization, 'translation_balance'),
    subscriptionStatus: text(monetization, 'subscription_status') || 'active',
    adminRole,
    adminActive: boolValue(admin, 'is_active'),
    adminHasReviewAccess: boolValue(admin, 'is_active') && hasReview,
    canQuestRewardAdmin: boolValue(admin, 'is_active') && (adminRole === 'admin' || adminRole === 'super_admin'),
    canModerate: boolValue(moderation, 'is_moderator', 'is_admin'),
  };
}

export async function savePrimaryChatLanguage(userId: string, language: string) {
  const result = await restUpsert<Row[]>('profiles', { id: userId, primary_language: language }, 'id');
  if (result.error) throw new Error(result.error);
}

/* MELO_ACCOUNT_TRANSLATION_SETTINGS_V2 */
export async function saveAutoTranslationEnabled(userId: string, enabled: boolean) {
  const result = await restUpsert<Row[]>(
    'profiles',
    {
      id: userId,
      auto_translation_enabled: enabled,
    },
    'id',
  );

  if (result.error) throw new Error(result.error);
}

export async function loadPackageCatalog(): Promise<PackageProduct[]> {
  const result = await rpcRequest<Row[]>('get_monetization_catalog');
  if (result.error) throw new Error(result.error);
  return rowsOf(result.data).map((row) => ({
    code: text(row, 'code', 'product_code'),
    productType: text(row, 'product_type'),
    planCode: text(row, 'plan_code'),
    titleTh: text(row, 'title_th', 'title'),
    titleEn: text(row, 'title_en', 'title'),
    descriptionTh: text(row, 'description_th'),
    descriptionEn: text(row, 'description_en'),
    priceSatang: numberValue(row, 'price_satang'),
    currency: text(row, 'currency') || 'THB',
    translationCredits: numberValue(row, 'translation_credits'),
    featuresTh: stringArray(row.features_th),
    featuresEn: stringArray(row.features_en),
    badgeTh: text(row, 'badge_th'),
    badgeEn: text(row, 'badge_en'),
  })).filter((item) => item.code);
}

export async function loadBlockedUsersWeb(): Promise<BlockedUserWeb[]> {
  const result = await rpcRequest<Row[]>('get_my_blocked_users');

  if (result.error) {
    console.error(
      'Unable to load blocked users',
      result.error,
    );
    return [];
  }

  /* MELO_BLOCKED_USER_PROFILE_NAME_V2 */
  const blockedRows = rowsOf(result.data);

  const items = await Promise.all(
    blockedRows.map(async (row) => {
      const userId = text(
        row,
        'id',
        'user_id',
        'blocked_user_id',
      );

      if (!userId) {
        return null;
      }

      const photoPaths =
        stringArray(row.photo_paths);

      let resolvedPhotoPath =
        photoPaths[0] ||
        text(row, 'photo_path');

      /*
       * Blocked-user RPC may expose display_name/email-like values.
       * Melo Profile / Connect uses profiles.first_name as the
       * public profile name, so resolve the profile by user id.
       */
      let displayName = '';

      try {
        const profileResult =
          await restSelect<Row[]>(
            'profiles',
            `select=id,first_name,display_name,photo_paths&id=eq.${encodeURIComponent(userId)}&limit=1`,
          );

        if (!profileResult.error) {
          const profile =
            rowsOf(profileResult.data)[0];

          if (profile) {
            const firstName =
              text(
                profile,
                'first_name',
              ).trim();

            const fallbackName =
              text(
                profile,
                'display_name',
              ).trim();

            if (firstName) {
              displayName = firstName;
            } else if (
              fallbackName &&
              !fallbackName.includes('@') &&
              !fallbackName.includes('.com') &&
              !fallbackName.includes('.net') &&
              !fallbackName.includes('.org')
            ) {
              displayName = fallbackName;
            }

            if (!resolvedPhotoPath) {
              const profilePhotos =
                stringArray(
                  profile.photo_paths,
                );

              resolvedPhotoPath =
                profilePhotos[0] || '';
            }
          }
        }
      } catch (error) {
        console.error(
          'Unable to resolve blocked profile',
          error,
        );
      }

      /*
       * Last fallback only when the RPC value looks like
       * a genuine profile name, never an email/username.
       */
      if (!displayName) {
        const rpcFirstName =
          text(
            row,
            'first_name',
          ).trim();

        const rpcDisplayName =
          text(
            row,
            'display_name',
            'name',
          ).trim();

        if (rpcFirstName) {
          displayName = rpcFirstName;
        } else if (
          rpcDisplayName &&
          !rpcDisplayName.includes('@') &&
          !rpcDisplayName.includes('.com') &&
          !rpcDisplayName.includes('.net') &&
          !rpcDisplayName.includes('.org')
        ) {
          displayName =
            rpcDisplayName;
        }
      }

      return {
        userId,

        displayName:
          displayName ||
          'Melo member',

        photoUrl: resolvedPhotoPath
          ? publicStorageUrl(
              'profile-photos',
              resolvedPhotoPath,
            )
          : '',

        blockedAt: text(
          row,
          'blocked_at',
          'created_at',
        ),

        reason: text(
          row,
          'reason',
        ),
      };
    }),
  );

  return items.filter(
    (item): item is BlockedUserWeb =>
      Boolean(item?.userId),
  );
}
export async function unblockUserWeb(userId: string) {
  const result = await rpcRequest('unblock_user', { p_other_user_id: userId });
  if (result.error) throw new Error(result.error);
}

export async function getPrivacyStatusWeb(): Promise<PrivacyStatusWeb> {
  const result = await rpcRequest<Row | Row[]>('get_my_account_deletion_status_v2');
  if (result.error) return { deletionStatus: 'none', deletionRequestedAt: '', deletionScheduledFor: '', deletionFailureMessage: '' };
  const row = rowsOf(result.data)[0] ?? {};
  return {
    deletionStatus: text(row, 'status', 'deletion_status') || 'none',
    deletionRequestedAt: text(row, 'requested_at', 'deletion_requested_at'),
    deletionScheduledFor: text(row, 'scheduled_for', 'deletion_scheduled_for'),
    deletionFailureMessage: text(row, 'failure_message', 'deletion_failure_message'),
  };
}

export async function exportMyMeloDataWeb() {
  const result = await rpcRequest<Record<string, unknown>>('export_my_melo_data');
  if (result.error) throw new Error(result.error);
  return result.data ?? {};
}

export async function scheduleAccountDeletionWeb(reason: string) {
  const result = await rpcRequest('schedule_my_account_deletion_v2', { p_reason: reason.trim() || null });
  if (result.error) throw new Error(result.error);
  return getPrivacyStatusWeb();
}

export async function cancelAccountDeletionWeb() {
  const result = await rpcRequest('cancel_my_account_deletion_v2');
  if (result.error) throw new Error(result.error);
  return getPrivacyStatusWeb();
}

export async function loadProductionHealthWeb() {
  const result = await rpcRequest<unknown>('phase28_health_check');
  if (result.error) throw new Error(result.error);
  return result.data;
}

export async function loadPrelaunchCountsWeb(): Promise<PrelaunchCountsWeb> {
  const result = await rpcRequest<Row | Row[]>('get_prelaunch_test_data_counts');
  if (result.error) throw new Error(result.error);
  const row = rowsOf(result.data)[0] ?? {};
  return {
    trips: numberValue(row, 'trips'),
    socialPosts: numberValue(row, 'social_posts'),
    events: numberValue(row, 'events'),
    communities: numberValue(row, 'communities'),
    businessServices: numberValue(row, 'business_services'),
  };
}

export async function clearPrelaunchTestDataWeb(confirmation: string): Promise<PrelaunchCountsWeb> {
  const result = await rpcRequest<Row | Row[]>('clear_prelaunch_test_data', { p_confirmation: confirmation });
  if (result.error) throw new Error(result.error);
  const row = rowsOf(result.data)[0] ?? {};
  return {
    trips: numberValue(row, 'trips'),
    socialPosts: numberValue(row, 'social_posts'),
    events: numberValue(row, 'events'),
    communities: numberValue(row, 'communities'),
    businessServices: numberValue(row, 'business_services'),
  };
}

export async function loadAdminReviewHomeWeb(): Promise<AdminReviewHomeWeb> {
  const result = await rpcRequest<Row | Row[]>('get_my_admin_review_home_status');
  if (result.error) return { hasAccess: false, pendingCount: 0 };
  const row = rowsOf(result.data)[0] ?? {};
  return { hasAccess: boolValue(row, 'has_access'), pendingCount: numberValue(row, 'pending_count') };
}

export async function loadQuestRewardAdminStatsWeb(): Promise<QuestRewardAdminStatsWeb> {
  const result = await rpcRequest<Row | Row[]>('admin_get_melo_quest_reward_stats_v1');
  if (result.error) throw new Error(result.error);
  const row = rowsOf(result.data)[0] ?? {};
  return {
    quests: numberValue(row, 'quests', 'quest_count', 'total_quests'),
    activeQuests: numberValue(row, 'active_quests', 'active_quest_count'),
    rewards: numberValue(row, 'rewards', 'reward_count', 'total_rewards'),
    activeRewards: numberValue(row, 'active_rewards', 'active_reward_count'),
    completions: numberValue(row, 'completions', 'completion_count'),
    redemptions: numberValue(row, 'redemptions', 'redemption_count'),
  };
}

export async function logoutWeb() {
  await signOut();
}

export type AdminQuestRowWeb = { id:string; title:string; description:string; active:boolean; type:string; points:number };
export type AdminRewardRowWeb = { id:string; title:string; description:string; active:boolean; cost:number; stock:number|null };

export async function listAdminQuestsWeb(): Promise<AdminQuestRowWeb[]> {
  const result=await rpcRequest<Row[]>('admin_list_melo_quests_v1');
  if(result.error) throw new Error(result.error);
  return rowsOf(result.data).map((row)=>({id:text(row,'id','quest_id'),title:text(row,'title_th','title_en','title','name')||'Quest',description:text(row,'description_th','description_en','description'),active:boolValue(row,'is_active','active'),type:text(row,'quest_type','type'),points:numberValue(row,'points','reward_points')})).filter((item)=>item.id);
}
export async function setAdminQuestActiveWeb(id:string,active:boolean){const result=await rpcRequest('admin_set_melo_quest_active_v1',{p_quest_id:id,p_active:active});if(result.error)throw new Error(result.error)}
export async function listAdminRewardsWeb(): Promise<AdminRewardRowWeb[]> {
  const result=await rpcRequest<Row[]>('admin_list_melo_rewards_v1');
  if(result.error) throw new Error(result.error);
  return rowsOf(result.data).map((row)=>({id:text(row,'id','reward_id'),title:text(row,'title_th','title_en','title','name')||'Reward',description:text(row,'description_th','description_en','description'),active:boolValue(row,'is_active','active'),cost:numberValue(row,'points_cost','cost','required_points'),stock:row.stock_quantity==null&&row.stock==null?null:numberValue(row,'stock_quantity','stock')})).filter((item)=>item.id);
}
export async function setAdminRewardActiveWeb(id:string,active:boolean){const result=await rpcRequest('admin_set_melo_reward_active_v1',{p_reward_id:id,p_active:active});if(result.error)throw new Error(result.error)}

export async function loadAdminReviewQueueCountsWeb() {
  const calls = [
    ['verification','get_admin_verification_queue',{p_status:'pending',p_limit:200}],
    ['business','get_admin_business_queue',{p_status:'pending',p_limit:200}],
    ['payout','get_admin_payout_bank_account_queue',{p_status:'pending',p_limit:200}],
    ['reverification','get_admin_partner_reverification_queue',{p_status:'pending',p_limit:200}],
    ['reports','get_admin_user_report_queue',{p_status:'pending',p_limit:200}],
    ['deletions','get_admin_account_deletion_queue',{p_status:'pending',p_limit:200}],
  ] as const;
  const entries=await Promise.all(calls.map(async([key,name,params])=>{const r=await rpcRequest<Row[]>(name,params);return [key,r.error?0:rowsOf(r.data).length] as const}));
  return Object.fromEntries(entries) as Record<string,number>;
}





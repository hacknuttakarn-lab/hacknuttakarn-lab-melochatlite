import { rpcRequest, restSelect } from '@/lib/supabase/browser';

export type PlanUsage = {
  user_id?: string;
  plan_id?: string;
  plan_code: string;
  plan_name: string;
  subscription_start?: string | null;
  subscription_end?: string | null;
  billing_period_months?: number;
  cycle_start?: string;
  cycle_end?: string;
  next_reset?: string;
  profile_post_limit?: number | null;
  high_post_limit?: boolean;
  translation_limit?: number;
  profile_boost_limit?: number;
  post_boost_limit?: number;
  addon_translation_limit?: number;
  addon_translation_used?: number;
  base_translation_used?: number;
  profile_boost_used?: number;
  post_boost_used?: number;
  profile_posts_used?: number;
  translation_total_limit?: number;
  translation_total_used?: number;
  can_like?: boolean;
  can_view_profiles?: boolean;
  can_interested?: boolean;
  can_follow?: boolean;
  can_match?: boolean;
  can_chat?: boolean;
  can_comment?: boolean;
  can_save_post?: boolean;
  can_use_translation?: boolean;
  can_buy_translation_addon?: boolean;
  priority_support?: boolean;
  boost_priority?: number;
  is_admin?: boolean;
};

export type PublicPlan = Record<string, unknown> & {
  id?: string;
  code: string;
  name: string;
  price_1_month?: number;
  price_3_months?: number;
  price_6_months?: number;
  profile_post_limit?: number | null;
  translation_monthly_limit?: number;
  profile_boost_monthly_limit?: number;
  post_boost_monthly_limit?: number;
  high_post_limit?: boolean;
  priority_support?: boolean;
  is_active?: boolean;
  show_on_user_packages?: boolean;
};

export type PlanOffer = {
  id: string;
  plan_id: string;
  duration_months: number;
  regular_price: number;
  promotion_enabled: boolean;
  promotion_price?: number | null;
  promotion_label?: string | null;
  promotion_start?: string | null;
  promotion_end?: string | null;
  is_active: boolean;
};

export type TranslationAddon = {
  id: string;
  code: string;
  name: string;
  price: number;
  translation_characters: number;
  eligible_plans: string[];
  is_active: boolean;
};

export async function loadMyPlanUsage(): Promise<PlanUsage> {
  const result = await rpcRequest<PlanUsage>('melo_get_my_plan_usage_v25');
  if (result.error || !result.data) throw new Error(result.error || 'Unable to load plan usage');
  return result.data;
}

export async function loadPublicPlans(): Promise<PublicPlan[]> {
  const result = await restSelect<PublicPlan[]>('subscription_plans', 'select=*&is_active=eq.true&show_on_user_packages=eq.true&order=sort_order.asc');
  if (result.error) throw new Error(result.error);
  return Array.isArray(result.data) ? result.data : [];
}

export async function loadPublicPlanOffers(): Promise<PlanOffer[]> {
  const result = await restSelect<PlanOffer[]>('subscription_plan_offers', 'select=id,plan_id,duration_months,regular_price,promotion_enabled,promotion_price,promotion_label,promotion_start,promotion_end,is_active&is_active=eq.true&order=sort_order.asc,duration_months.asc');
  if (result.error) throw new Error(result.error);
  return Array.isArray(result.data) ? result.data : [];
}

export async function loadTranslationAddons(): Promise<TranslationAddon[]> {
  const result = await restSelect<TranslationAddon[]>('translation_addons', 'select=*&is_active=eq.true&order=sort_order.asc,price.asc');
  if (result.error) throw new Error(result.error);
  return Array.isArray(result.data) ? result.data : [];
}

export function remaining(used = 0, limit = 0) {
  return Math.max(0, Number(limit || 0) - Number(used || 0));
}

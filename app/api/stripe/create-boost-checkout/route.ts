import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BoostAddon = {
  id:string;
  code:string;
  name:string;
  profile_boost_count:number;
  post_boost_count:number;
  price:number|string;
  credit_days:number;
  badge_label?:string|null;
  is_active:boolean;
};
function jsonError(message:string,status:number,code='CHECKOUT_ERROR'){ return NextResponse.json({error:message,code},{status}); }

export async function POST(request:Request){
  try{
    const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,'');
    const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    if(!supabaseUrl||!supabaseKey)return jsonError('Supabase is not configured.',500,'SUPABASE_CONFIG');
    const token=(request.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if(!token)return jsonError('Authentication required.',401,'AUTH_REQUIRED');
    const headers={apikey:supabaseKey,Authorization:`Bearer ${token}`};
    const userResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers,cache:'no-store'});
    if(!userResponse.ok)return jsonError('Authentication required.',401,'AUTH_REQUIRED');
    const user=await userResponse.json() as {id?:string;email?:string};
    if(!user.id)return jsonError('Authentication required.',401,'AUTH_REQUIRED');
    const body=await request.json().catch(()=>({})) as {addon_id?:unknown};
    const addonId=typeof body.addon_id==='string'?body.addon_id.trim():'';
    if(!addonId)return jsonError('addon_id is required.',400,'INVALID_REQUEST');
    const q=new URLSearchParams({select:'id,code,name,profile_boost_count,post_boost_count,price,credit_days,badge_label,is_active',id:`eq.${addonId}`,limit:'1'});
    const db=await fetch(`${supabaseUrl}/rest/v1/boost_addons?${q}`,{headers,cache:'no-store'});
    if(!db.ok){console.error('[Stripe boost checkout] DB query failed',{status:db.status,body:await db.text()});return jsonError('Unable to load boost add-on.',500,'BOOST_DB');}
    const addon=((await db.json()) as BoostAddon[])[0];
    if(!addon)return jsonError('Boost add-on not found.',404,'BOOST_NOT_FOUND');
    if(!addon.is_active)return jsonError('This boost add-on is not available for purchase.',409,'BOOST_UNAVAILABLE');
    const amount=Number(addon.price);
    const profileBoosts=Number(addon.profile_boost_count);
    const postBoosts=Number(addon.post_boost_count);
    if(!Number.isFinite(amount)||amount<=0||!Number.isInteger(profileBoosts)||profileBoosts<=0||!Number.isInteger(postBoosts)||postBoosts<=0)return jsonError('Boost add-on configuration is invalid.',500,'BOOST_INVALID');
    const mode=(process.env.STRIPE_CHECKOUT_MODE||'').trim().toLowerCase();
    if(mode!=='sandbox'&&mode!=='live')return jsonError('STRIPE_CHECKOUT_MODE must be sandbox or live.',500,'STRIPE_MODE');
    const secret=(mode==='sandbox'?process.env.STRIPE_SECRET_KEY_TEST:process.env.STRIPE_SECRET_KEY)?.trim();
    if(!secret)return jsonError(mode==='sandbox'?'STRIPE_SECRET_KEY_TEST is not configured.':'STRIPE_SECRET_KEY is not configured.',500,'STRIPE_KEY_MISSING');
    if(mode==='sandbox'&&!secret.startsWith('sk_test_'))return jsonError('STRIPE_SECRET_KEY_TEST is not a valid test key.',500,'STRIPE_KEY_MISMATCH');
    if(mode==='live'&&!secret.startsWith('sk_live_'))return jsonError('STRIPE_SECRET_KEY is not a valid live key.',500,'STRIPE_KEY_MISMATCH');
    const stripe=new Stripe(secret);
    const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://www.melochat.me').replace(/\/$/,'');
    const session=await stripe.checkout.sessions.create({
      mode:'payment',
      success_url:`${siteUrl}/premium?payment=success&item=boost-addon`,
      cancel_url:`${siteUrl}/premium?payment=cancelled&item=boost-addon`,
      customer_email:user.email||undefined,
      client_reference_id:user.id,
      line_items:[{quantity:1,price_data:{currency:'thb',unit_amount:Math.round(amount*100),product_data:{name:addon.name,description:`Profile Boost ${profileBoosts} + Post Boost ${postBoosts}`}}}],
      metadata:{purchase_type:'boost_addon',user_id:user.id,addon_id:addon.id,addon_code:addon.code,profile_boost_count:String(profileBoosts),post_boost_count:String(postBoosts),credit_days:String(addon.credit_days||90),stripe_environment:mode}
    });
    if(!session.url)return jsonError('Stripe Checkout URL was not returned.',502,'STRIPE_NO_URL');
    return NextResponse.json({url:session.url});
  }catch(error){
    const stripeError=error as {type?:string;code?:string;message?:string;requestId?:string};
    console.error('[Stripe boost checkout] Unexpected error',{type:stripeError?.type,code:stripeError?.code,message:stripeError?.message,requestId:stripeError?.requestId});
    return jsonError('Unable to create Stripe Checkout session.',500,'STRIPE_SESSION_CREATE');
  }
}

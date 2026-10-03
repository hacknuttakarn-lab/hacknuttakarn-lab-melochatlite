'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { getStoredSession, refreshStoredSession } from '@/lib/supabase/browser';
import { loadMyPlanUsage, loadMyTranslationAddonUsage, loadPublicPlanOffers, loadPublicPlans, loadTranslationAddons, remaining, type PlanOffer, type PlanUsage, type PublicPlan, type TranslationAddon, type TranslationAddonUsage } from '@/lib/plan/planWeb';
import styles from './PremiumPlanExperience.module.css';

type Term = 1 | 3 | 6;
type Tab = 'plans' | 'usage' | 'addons';

const copy = {
  th: {
    eyebrow:'MELO CHAT LITE', title:'แพ็กเกต', plans:'แพ็กเกจ', usage:'My Plan / การใช้งาน', addons:'แพ็กเกจแปลภาษา', current:'แพ็กเกจปัจจุบัน', popular:'แนะนำ', choose:'เลือกแพ็กเกจ', contact:'ติดต่อทีมงานเพื่อสมัคร', checkoutLoading:'กำลังเปิดหน้าชำระเงิน…', checkoutError:'ไม่สามารถเปิดหน้าชำระเงินได้ กรุณาลองใหม่อีกครั้ง', free:'ฟรี', month:'เดือน', prepaid:'แพ็ก 3 และ 6 เดือนเป็นการจ่ายล่วงหน้าในราคาที่ถูกลง โดยโควตารีเซ็ตใหม่ทุก Billing Month', posts:'โพสต์โปรไฟล์', translation:'การแปล', profileBoost:'Profile Boost', postBoost:'Post Boost', high:'High Limit / Fair Use', chars:'ตัวอักษร', times:'ครั้ง', currentCycle:'รอบบิลปัจจุบัน', subscriptionEnd:'วันสิ้นสุดสมาชิก', nextReset:'รีเซ็ตครั้งถัดไป', used:'ใช้แล้ว', remaining:'คงเหลือ', unlimited:'High Limit / Fair Use', noAddon:'ยังไม่มี Translation Add-on', addonRule:'ซื้อเพิ่มได้เฉพาะ Premium / Premium+ และไม่สะสมข้าม Billing Month', buyAddon:'ซื้อ Add-on', loading:'กำลังโหลดข้อมูลแพ็กเกจ…', error:'ไม่สามารถโหลดข้อมูลแพ็กเกจได้', priority:'Priority Support', reset:'รีเซ็ตทุก Billing Month', mainPlanPeriod:'ระยะเวลาแพ็กเกจหลัก', translationPlanPeriod:'ระยะเวลาแพ็กเกจแปลภาษา', purchasedAt:'วันที่ซื้อ', addonExpires:'ใช้ได้ถึง', addonNone:'ยังไม่มีแพ็กเกจแปลภาษาที่ใช้งานอยู่'
  },
  en: {
    eyebrow:'MELO CHAT LITE', title:'Package', plans:'Plans', usage:'My Plan / Usage', addons:'Translation Add-ons', current:'Current plan', popular:'Popular', choose:'Choose plan', contact:'Contact support to subscribe', checkoutLoading:'Opening secure checkout…', checkoutError:'Unable to open checkout. Please try again.', free:'Free', month:'month', prepaid:'3- and 6-month plans are prepaid at a lower price. Usage limits still reset every billing month.', posts:'Profile posts', translation:'Translation', profileBoost:'Profile Boost', postBoost:'Post Boost', high:'High Limit / Fair Use', chars:'characters', times:'times', currentCycle:'Current billing cycle', subscriptionEnd:'Subscription end', nextReset:'Next reset', used:'Used', remaining:'Remaining', unlimited:'High Limit / Fair Use', noAddon:'No Translation Add-on', addonRule:'Available only to Premium / Premium+. Add-on quota does not roll over to the next billing month.', buyAddon:'Buy add-on', loading:'Loading plan information…', error:'Unable to load plan information', priority:'Priority Support', reset:'Resets every billing month', mainPlanPeriod:'Main package period', translationPlanPeriod:'Translation package period', purchasedAt:'Purchased', addonExpires:'Valid until', addonNone:'No active translation package'
  },
  de: {
    eyebrow:'MELO CHAT LITE', title:'Pakete', plans:'Pakete', usage:'Mein Plan / Nutzung', addons:'Übersetzungs-Add-ons', current:'Aktueller Plan', popular:'Beliebt', choose:'Paket wählen', contact:'Support für Abschluss kontaktieren', checkoutLoading:'Sichere Zahlung wird geöffnet…', checkoutError:'Checkout konnte nicht geöffnet werden. Bitte erneut versuchen.', free:'Kostenlos', month:'Monat', prepaid:'3- und 6-Monats-Pakete werden günstiger im Voraus bezahlt. Nutzungslimits werden trotzdem jeden Abrechnungsmonat zurückgesetzt.', posts:'Profilbeiträge', translation:'Übersetzung', profileBoost:'Profil-Boost', postBoost:'Beitrags-Boost', high:'Hohes Limit / Fair Use', chars:'Zeichen', times:'Mal', currentCycle:'Aktueller Abrechnungszeitraum', subscriptionEnd:'Abo-Ende', nextReset:'Nächster Reset', used:'Verbraucht', remaining:'Verbleibend', unlimited:'Hohes Limit / Fair Use', noAddon:'Kein Übersetzungs-Add-on', addonRule:'Nur für Premium / Premium+. Add-on-Kontingent wird nicht in den nächsten Abrechnungsmonat übertragen.', buyAddon:'Add-on kaufen', loading:'Paketdaten werden geladen…', error:'Paketdaten konnten nicht geladen werden', priority:'Priority Support', reset:'Reset jeden Abrechnungsmonat', mainPlanPeriod:'Laufzeit Hauptpaket', translationPlanPeriod:'Laufzeit Übersetzungspaket', purchasedAt:'Gekauft', addonExpires:'Gültig bis', addonNone:'Kein aktives Übersetzungspaket'
  }
} as const;

function fmtDate(value:string|undefined|null, locale:string){if(!value)return '—';try{return new Intl.DateTimeFormat(locale==='th'?'th-TH':locale==='de'?'de-DE':'en-GB',{dateStyle:'medium'}).format(new Date(value))}catch{return '—'}}
function num(value:unknown){return Number(value||0).toLocaleString()}

export default function PremiumPlanExperience(){
  const { locale } = useLocale();
  const lang = locale==='th'||locale==='de'?locale:'en';
  const t = copy[lang];
  const [tab,setTab]=useState<Tab>('plans');
  const [term,setTerm]=useState<Term>(1);
  const [plans,setPlans]=useState<PublicPlan[]>([]);
  const [usage,setUsage]=useState<PlanUsage|null>(null);
  const [offers,setOffers]=useState<PlanOffer[]>([]);
  const [checkoutOfferId,setCheckoutOfferId]=useState<string|null>(null);
  const [checkoutAddonId,setCheckoutAddonId]=useState<string|null>(null);
  const [checkoutError,setCheckoutError]=useState('');
  const [addons,setAddons]=useState<TranslationAddon[]>([]);
  const [addonUsage,setAddonUsage]=useState<TranslationAddonUsage[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{let active=true;(async()=>{setLoading(true);setError('');try{const [p,o,u,a,au]=await Promise.all([loadPublicPlans(),loadPublicPlanOffers(),loadMyPlanUsage(),loadTranslationAddons().catch(()=>[]),loadMyTranslationAddonUsage().catch(()=>[])]);if(!active)return;setPlans(p);setOffers(o);setUsage(u);setAddons(a);setAddonUsage(au)}catch(e){if(active)setError(e instanceof Error?e.message:t.error)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[t.error]);

  const currentCode=usage?.plan_code||'free';
  const ordered=useMemo(()=>plans.length?plans:[
    {code:'free',name:'Free',price_1_month:0,price_3_months:0,price_6_months:0,profile_post_limit:3,translation_monthly_limit:0,profile_boost_monthly_limit:0,post_boost_monthly_limit:0},
    {code:'premium',name:'Premium',price_1_month:399,price_3_months:1099,price_6_months:1999,profile_post_limit:30,translation_monthly_limit:30000,profile_boost_monthly_limit:4,post_boost_monthly_limit:4},
    {code:'premium_plus',name:'Premium+',price_1_month:699,price_3_months:1899,price_6_months:3499,profile_post_limit:null,high_post_limit:true,translation_monthly_limit:100000,profile_boost_monthly_limit:10,post_boost_monthly_limit:10,priority_support:true}
  ],[plans]);
  const offerFor=(p:PublicPlan)=>offers.find(o=>o.plan_id===p.id&&Number(o.duration_months)===term);
  const effectivePrice=(offer:PlanOffer|undefined)=>{if(!offer)return 0;const now=Date.now();const start=offer.promotion_start?Date.parse(offer.promotion_start):null;const end=offer.promotion_end?Date.parse(offer.promotion_end):null;const promo=offer.promotion_enabled&&offer.promotion_price!=null&&(start==null||now>=start)&&(end==null||now<end);return Number(promo?offer.promotion_price:offer.regular_price)||0};
  const price=(p:PublicPlan)=>{const offer=offerFor(p);return offer?effectivePrice(offer):(Number(term===3?p.price_3_months:term===6?p.price_6_months:p.price_1_month)||0)};
  const checkout=async(plan:PublicPlan)=>{const offer=offerFor(plan);if(!offer||checkoutOfferId)return;setCheckoutError('');setCheckoutOfferId(offer.id);try{const refreshed=await refreshStoredSession().catch(()=>null);const session=refreshed??getStoredSession();if(!session?.access_token)throw new Error('AUTH_REQUIRED');const response=await fetch('/api/stripe/create-checkout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({offer_id:offer.id})});const payload=await response.json().catch(()=>({}));if(!response.ok||typeof payload?.url!=='string')throw new Error(typeof payload?.error==='string'?payload.error:t.checkoutError);window.location.assign(payload.url)}catch(e){setCheckoutError(t.checkoutError);setCheckoutOfferId(null)}};
  const checkoutAddon=async(addon:TranslationAddon)=>{if(checkoutAddonId||checkoutOfferId)return;setCheckoutError('');setCheckoutAddonId(addon.id);try{const refreshed=await refreshStoredSession().catch(()=>null);const session=refreshed??getStoredSession();if(!session?.access_token)throw new Error('AUTH_REQUIRED');const response=await fetch('/api/stripe/create-addon-checkout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({addon_id:addon.id})});const payload=await response.json().catch(()=>({}));if(!response.ok||typeof payload?.url!=='string')throw new Error(typeof payload?.error==='string'?payload.error:t.checkoutError);window.location.assign(payload.url)}catch(e){setCheckoutError(t.checkoutError);setCheckoutAddonId(null)}};

  return <main className={styles.page}><Header/><section className={styles.shell}>
    <header className={styles.hero}><div><small>{t.eyebrow}</small><h1>{t.title}</h1></div></header>
    <nav className={styles.tabs}><button data-active={tab==='plans'} onClick={()=>setTab('plans')}>{t.plans}</button><button data-active={tab==='addons'} onClick={()=>setTab('addons')}>{t.addons}</button><button data-active={tab==='usage'} onClick={()=>setTab('usage')}>{t.usage}</button></nav>
    {loading?<div className={styles.state}>{t.loading}</div>:error?<div className={styles.state}>{error}</div>:null}
    {!loading&&!error&&tab==='plans'?<>
      <div className={styles.termSwitch}>{([1,3,6] as Term[]).map(v=><button key={v} data-active={term===v} onClick={()=>setTerm(v)}>{v} {t.month}</button>)}</div>
      <p className={styles.prepaid}>{t.prepaid}</p>
      {checkoutError?<div className={styles.state}>{checkoutError}</div>:null}
      <div className={styles.planGrid}>{ordered.map(plan=>{const code=String(plan.code);const current=code===currentCode;const offer=offerFor(plan);const checkingOut=checkoutOfferId===offer?.id;return <article key={code} className={code==='premium'?styles.featured:''}>
        <div className={styles.planTop}><small>{current?t.current:code==='premium'?t.popular:'PLAN'}</small><h2>{plan.name}</h2><strong>{price(plan)===0?t.free:`฿${price(plan).toLocaleString()}`}</strong></div>
        <ul><li>{t.posts}: <b>{plan.high_post_limit||plan.profile_post_limit==null?t.high:`${num(plan.profile_post_limit)} / ${t.month}`}</b></li><li>{t.translation}: <b>{num(plan.translation_monthly_limit)} {t.chars} / {t.month}</b></li><li>{t.profileBoost}: <b>{num(plan.profile_boost_monthly_limit)} {t.times} / {t.month}</b></li><li>{t.postBoost}: <b>{num(plan.post_boost_monthly_limit)} {t.times} / {t.month}</b></li>{plan.priority_support?<li>{t.priority}</li>:null}</ul>
        <button disabled={current||code==='free'||!offer||checkoutOfferId!==null} onClick={()=>checkout(plan)}>{checkingOut?t.checkoutLoading:current?t.current:code==='free'?t.free:t.choose}</button>
      </article>})}</div>
    </>:null}
    {!loading&&!error&&tab==='usage'&&usage?<div className={styles.usageGrid}>
      <article className={styles.summary}><small>{t.mainPlanPeriod}</small><h2>{usage.plan_name||usage.plan_code}</h2><dl><div><dt>{t.currentCycle}</dt><dd>{fmtDate(usage.cycle_start,lang)} – {fmtDate(usage.cycle_end,lang)}</dd></div><div><dt>{t.subscriptionEnd}</dt><dd>{fmtDate(usage.subscription_end,lang)}</dd></div><div><dt>{t.nextReset}</dt><dd>{fmtDate(usage.next_reset,lang)}</dd></div></dl></article>
      <article className={styles.summary}><small>{t.translationPlanPeriod}</small><h2>{addonUsage.length?t.addons:t.addonNone}</h2>{addonUsage.length?<dl>{addonUsage.map(item=><div key={item.id}><dt>{item.translation_addons?.name||t.addons}</dt><dd>{t.purchasedAt}: {fmtDate(item.created_at,lang)} · {t.addonExpires}: {fmtDate(item.cycle_end,lang)} · {Number(item.character_used||0).toLocaleString()} / {Number(item.character_limit||0).toLocaleString()} {t.chars}</dd></div>)}</dl>:<p className={styles.prepaid}>{t.addonNone}</p>}</article>
      <Usage title={t.translation} used={Number(usage.translation_total_used||0)} limit={Number(usage.translation_total_limit||0)} unit={t.chars} />
      <Usage title={t.profileBoost} used={Number(usage.profile_boost_used||0)} limit={Number(usage.profile_boost_limit||0)} unit={t.times} />
      <Usage title={t.postBoost} used={Number(usage.post_boost_used||0)} limit={Number(usage.post_boost_limit||0)} unit={t.times} />
      <Usage title={t.posts} used={Number(usage.profile_posts_used||0)} limit={usage.profile_post_limit==null?null:Number(usage.profile_post_limit)} unit="" unlimited={usage.high_post_limit?t.unlimited:undefined}/>
    </div>:null}
    {!loading&&!error&&tab==='addons'?<><p className={styles.prepaid}>{t.addonRule}</p>{checkoutError?<div className={styles.state}>{checkoutError}</div>:null}<div className={styles.addonGrid}>{addons.length?addons.map(addon=>{const checkingOut=checkoutAddonId===addon.id;return <article key={addon.id}><small>TRANSLATION</small><h3>{addon.name}</h3><strong>฿{Number(addon.price).toLocaleString()}</strong><p>+{Number(addon.translation_characters).toLocaleString()} {t.chars}</p><button disabled={!usage?.can_buy_translation_addon||checkoutAddonId!==null||checkoutOfferId!==null} onClick={()=>checkoutAddon(addon)}>{checkingOut?t.checkoutLoading:t.buyAddon}</button></article>}):<div className={styles.state}>{t.noAddon}</div>}</div></>:null}
  </section></main>
}

function Usage({title,used,limit,unit,unlimited,note}:{title:string;used:number;limit:number|null;unit:string;unlimited?:string;note?:string}){
  const pct=limit&&limit>0?Math.min(100,Math.round((used/limit)*100)):0;
  return <article className={styles.usage}><div><h3>{title}</h3><b>{unlimited||`${used.toLocaleString()} / ${Number(limit||0).toLocaleString()} ${unit}`}</b></div>{!unlimited?<><div className={styles.progress}><span style={{width:`${pct}%`}}/></div><small>{remaining(used,Number(limit||0)).toLocaleString()} {unit}</small></>:<small>{used.toLocaleString()} used</small>}{note?<small>{note}</small>:null}</article>
}

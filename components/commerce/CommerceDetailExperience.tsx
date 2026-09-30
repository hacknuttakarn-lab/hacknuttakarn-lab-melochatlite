'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { commerceDetailCopy } from '@/i18n/commerceDetailUi';
import { getCurrentUser, invokeEdgeFunction, isSupabaseConfigured, restDelete, restSelect, restUpsert, rpcRequest } from '@/lib/supabase/browser';
import { resolveCommerceMediaList } from '@/components/commerce/commerceMedia';
import styles from './CommerceDetailExperience.module.css';

type Row = Record<string, unknown>;
type User = { id: string; email?: string };
type Service = {
  id: string; businessId: string; category: string; title: string; description: string; price: number | null; originalPrice: number | null;
  currency: string; priceUnit: string; detailType: string; validUntil: string; memberOnly: boolean; includes: string; excludes: string;
  duration: number | null; minGuests: number | null; maxGuests: number | null; saleMode: 'info'|'inquiry'|'instant'; image: string; images: string[]; raw: Row;
};
type OpeningDayKey = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun';
type OpeningDay = { closed:boolean; open:string; close:string };
type BusinessProfileExtras = {
  loaded:boolean; subcategory:string; secondaryCategories:string[]; serviceArea:string; serviceLanguages:string[]; amenities:string[];
  openingHours:Record<OpeningDayKey,OpeningDay>; hoursConfigured:boolean; bookingMode:'chat'|'request'|'external'|'walk_in'; bookingUrl:string;
  line:string; facebook:string; instagram:string; whatsapp:string;
};
type Business = { id:string; name:string; description:string; category:string; city:string; country:string; address:string; phone:string; email:string; website:string; language:string; image:string; images:string[]; cover:string; covers:string[]; profile:BusinessProfileExtras; raw:Row };
type Review = { id:string; name:string; rating:number; comment:string; createdAt:string };
type Payment = { orderId:string; amount:number; currency:string; paymentStatus:string; qrImageUrl:string; hostedInstructionsUrl:string; voucherCode:string; expiresAt:string };

function rowsOf(value: unknown): Row[] { return Array.isArray(value) ? value.filter((v):v is Row => Boolean(v)&&typeof v==='object') : value&&typeof value==='object' ? [value as Row] : []; }
function text(row:Row,...keys:string[]) { for (const k of keys) { const v=row[k]; if (typeof v==='string'&&v.trim()) return v.trim(); if (typeof v==='number'&&Number.isFinite(v)) return String(v); } return ''; }
function num(row:Row,...keys:string[]) { for (const k of keys) { const v=row[k]; if (v!==null&&v!==''&&Number.isFinite(Number(v))) return Number(v); } return null; }
function numberValue(row:Row|undefined|null,...keys:string[]) { for (const key of keys) { const value=row?.[key]; if (value!==null&&value!==''&&Number.isFinite(Number(value))) return Number(value); } return null; }
function bool(row:Row,...keys:string[]) { for (const k of keys) if (typeof row[k]==='boolean') return Boolean(row[k]); return false; }
function money(value:number|null,currency:string,locale:string) { return value==null ? '' : `${value.toLocaleString(locale,{maximumFractionDigits:2})} ${currency||'THB'}`; }
function dateText(value:string,locale:string) { if (!value) return ''; const d=new Date(value); return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric'}).format(d); }
function discountPercent(service:Service) { if (service.originalPrice==null||service.price==null||service.originalPrice<=service.price||service.originalPrice<=0) return 0; return Math.max(1,Math.min(99,Math.round(((service.originalPrice-service.price)/service.originalPrice)*100))); }
function uniqueStrings(values:(string|undefined|null)[]) { const seen=new Set<string>(); return values.flatMap(value=>{const clean=typeof value==='string'?value.trim():''; if(!clean||seen.has(clean)) return []; seen.add(clean); return [clean];}); }
const OPENING_DAY_KEYS: OpeningDayKey[]=['mon','tue','wed','thu','fri','sat','sun'];
const DEFAULT_OPENING_DAY:OpeningDay={closed:false,open:'09:00',close:'18:00'};
function stringList(row:Row,key:string) {
  const value=row[key];
  if(Array.isArray(value)) return value.map(item=>String(item??'').trim()).filter(Boolean);
  if(typeof value==='string'&&value.trim()) {
    const clean=value.trim();
    if(clean.startsWith('[')) { try { const parsed=JSON.parse(clean); if(Array.isArray(parsed)) return parsed.map(item=>String(item??'').trim()).filter(Boolean); } catch {} }
    return clean.split(/\s*[•,]\s*/).map(item=>item.trim()).filter(Boolean);
  }
  return [];
}
function parseOpeningHours(value:unknown) {
  const raw=value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
  return Object.fromEntries(OPENING_DAY_KEYS.map(key=>{
    const item=raw[key]&&typeof raw[key]==='object'&&!Array.isArray(raw[key])?raw[key] as Row:{};
    return [key,{closed:Boolean(item.closed),open:text(item,'open')?.slice(0,5)||DEFAULT_OPENING_DAY.open,close:text(item,'close')?.slice(0,5)||DEFAULT_OPENING_DAY.close}];
  })) as Record<OpeningDayKey,OpeningDay>;
}
function emptyBusinessProfileExtras():BusinessProfileExtras { return { loaded:false, subcategory:'', secondaryCategories:[], serviceArea:'', serviceLanguages:[], amenities:[], openingHours:parseOpeningHours({}), hoursConfigured:false, bookingMode:'chat', bookingUrl:'', line:'', facebook:'', instagram:'', whatsapp:'' }; }
function parseBusinessProfileExtras(value:unknown,error:string|null|undefined):BusinessProfileExtras {
  if(error) return emptyBusinessProfileExtras();
  const row=rowsOf(value)[0]??{};
  const booking=text(row,'booking_mode');
  const bookingMode:BusinessProfileExtras['bookingMode']=booking==='request'||booking==='external'||booking==='walk_in'?booking:'chat';
  return {
    loaded:true,
    subcategory:text(row,'subcategory'),
    secondaryCategories:stringList(row,'secondary_categories'),
    serviceArea:text(row,'service_area'),
    serviceLanguages:stringList(row,'service_languages'),
    amenities:stringList(row,'amenities'),
    openingHours:parseOpeningHours(row.opening_hours),
    hoursConfigured:Boolean(row.opening_hours_configured),
    bookingMode,
    bookingUrl:text(row,'booking_url'),
    line:text(row,'line_contact'),
    facebook:text(row,'facebook_url'),
    instagram:text(row,'instagram_url'),
    whatsapp:text(row,'whatsapp_contact'),
  };
}
function categoryLabel(value:string) { return value.trim().replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\b[a-z]/g,(letter)=>letter.toUpperCase()); }
function listText(row:Row,...keys:string[]) { for (const key of keys) { const value=row[key]; if (Array.isArray(value)) { const items=value.map(item=>typeof item==='string'||typeof item==='number'?String(item).trim():'').filter(Boolean); if(items.length) return items.join(' • '); } if(typeof value==='string'&&value.trim()) return value.trim(); } return ''; }
function splitDealDescription(value:string) {
  const clean=value.trim();
  const markers=['รายละเอียดเมนู','Menu details','Menüdetails','菜单详情','メニュー詳細','메뉴 상세'];
  const marker=markers.map(label=>({label,index:clean.toLocaleLowerCase().indexOf(label.toLocaleLowerCase())})).filter(item=>item.index>=0).sort((a,b)=>a.index-b.index)[0];
  if(!marker) return { summary:clean, detailLines:[] as string[] };
  const summary=clean.slice(0,marker.index).trim().replace(/[•·\-]+$/,'').trim();
  const tail=clean.slice(marker.index+marker.label.length).replace(/^\s*[:：]?\s*/,'').trim();
  const detailLines=tail.split(/(?:\r?\n|\s*•\s*)/).map(item=>item.trim()).filter(Boolean);
  return { summary:summary||clean, detailLines };
}
function serviceDetailLines(service:Service) {
  const raw=service.raw;
  const explicit=[
    text(raw,'details_text','detail_text','menu_details','service_details','product_details'),
    listText(raw,'options','option_values','size_options','variant_options','variants'),
    text(raw,'options_text','option_text','variant_text','size_text'),
    listText(raw,'allergens','allergen_items'),
    text(raw,'allergen_info','allergens_text','allergy_info','food_info','food_information','dietary_info'),
  ].map(item=>item.trim()).filter(Boolean);
  const parsed=splitDealDescription(service.description);
  const seen=new Set<string>();
  return {
    summary:parsed.summary,
    lines:[...explicit,...parsed.detailLines].filter(item=>{const key=item.toLocaleLowerCase(); if(seen.has(key)) return false; seen.add(key); return true;}),
  };
}
function guestRange(service:Service,peopleLabel:string) {
  if(service.minGuests==null&&service.maxGuests==null) return '';
  const range=service.minGuests!=null&&service.maxGuests!=null&&service.minGuests!==service.maxGuests?`${service.minGuests}–${service.maxGuests}`:String(service.minGuests??service.maxGuests??'');
  return range ? `${range} ${peopleLabel}` : '';
}
const SERVICE_MEDIA_KEYS = [
  'image_url','service_image_url','product_image_url','main_image_url','thumbnail_url','photo_url',
  'image_storage_path','service_image_storage_path','product_image_storage_path','main_image_storage_path','media_storage_path','service_photo_storage_path','product_photo_storage_path',
  'service_image_path','product_image_path','main_image_path','media_path','thumbnail_path','photo_path',
  'image','service_image','product_image','main_image','photo','thumbnail','image_path','service_cover_path','service_cover_image_path',
  'service_photo_path','product_photo_path','primary_image_path','main_photo_path','storage_path','path',
  'image_urls','images','photos','gallery','media','image_paths','photo_paths','gallery_paths','gallery_images','service_images','product_images',
  'additional_images','additional_image_paths','media_urls','media_paths','photo_urls','service_image_paths','product_image_paths','service_photos','product_photos','service_media','product_media',
] as const;
const SERVICE_EXPLICIT_MEDIA_KEYS = [
  'service_image_url','product_image_url','main_image_url','service_image_storage_path','product_image_storage_path','main_image_storage_path',
  'service_photo_storage_path','product_photo_storage_path','service_image_path','product_image_path','main_image_path','service_cover_path','service_cover_image_path',
  'service_photo_path','product_photo_path','service_images','product_images','service_image_paths','product_image_paths','service_photos','product_photos','service_media','product_media',
] as const;
function mediaRecordFromKeys(source:Row,keys:readonly string[]) {
  const record:Row={};
  for(const key of keys) {
    const value=source[key];
    if(value!==undefined&&value!==null&&value!=='') record[key]=value;
  }
  return record;
}
function serviceMediaRecord(...sources:Row[]) {
  const record:Row={};
  for(const source of sources) {
    for(const key of SERVICE_MEDIA_KEYS) {
      const value=source[key];
      if(record[key]===undefined&&value!==undefined&&value!==null&&value!=='') record[key]=value;
    }
  }
  return record;
}
function serviceExplicitMediaRecord(...sources:Row[]) {
  const record:Row={};
  for(const source of sources) Object.assign(record,mediaRecordFromKeys(source,SERVICE_EXPLICIT_MEDIA_KEYS));
  return record;
}
function serviceMediaSources(service:Service) {
  return uniqueStrings([...service.images,service.image]);
}

function businessMapUrl(business:Business|null) {
  if(!business) return '';
  const lat=numberValue(business.raw,'latitude','lat','location_latitude','business_latitude');
  const lng=numberValue(business.raw,'longitude','lng','location_longitude','business_longitude');
  if(lat!=null&&lng!=null) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  const query=[business.address,business.city,business.country].map(item=>item.trim()).filter(Boolean).join(', ');
  return query?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`:'';
}

function FallbackImage({ sources, alt, className }: { sources: string[]; alt: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const signature=sources.join('\n');
  useEffect(()=>setIndex(0),[signature]);
  const src = sources[index] ?? '';
  if (!src) return null;
  return <img className={className} src={src} alt={alt} onError={() => setIndex((current) => current + 1)} />;
}

async function loadBusiness(id:string,includeProfile=false):Promise<Business|null> {
  const gate=await rpcRequest<Row[]>('melo_public_businesses'); if (gate.error) throw new Error(gate.error);
  const publicRow=rowsOf(gate.data).find(r=>text(r,'id')===id); if (!publicRow) return null;
  const [detail,profileResult]=await Promise.all([
    rpcRequest<Row[]>('melo_business_for_viewer',{p_business_id:id}),
    includeProfile?rpcRequest<Row[]>('get_business_profile_extras',{p_business_id:id}):Promise.resolve({data:null,error:null}),
  ]);
  const detailRow=rowsOf(detail.data)[0]??{};
  const row={...publicRow,...detailRow};
  const profileSource={
    logo_url:row.logo_url,
    logo_storage_path:row.logo_storage_path,
    logo_path:row.logo_path,
    profile_image_url:row.profile_image_url,
    profile_photo_url:row.profile_photo_url,
    profile_image_path:row.profile_image_path,
    profile_photo_path:row.profile_photo_path,
  };
  const legacyProfileSource={ image_url:row.image_url, image_storage_path:row.image_storage_path, image_path:row.image_path };
  const coverSource={ cover_url: row.cover_url, cover_image_url: row.cover_image_url, cover_storage_path: row.cover_storage_path, cover_path: row.cover_path };
  const [profileImages,legacyProfileImages,covers]=await Promise.all([
    resolveCommerceMediaList(profileSource),
    resolveCommerceMediaList(legacyProfileSource),
    resolveCommerceMediaList(coverSource),
  ]);
  const images=profileImages.length?profileImages:legacyProfileImages;
  return { id, name:text(row,'display_name','legal_name')||'Melo Partner', description:text(row,'description'), category:text(row,'business_type','category'), city:text(row,'city'), country:text(row,'country'), address:text(row,'address'), phone:text(row,'phone'), email:text(row,'email'), website:text(row,'website'), language:text(row,'primary_language'), image:images[0]??'', images, cover:covers[0]??'', covers, profile:includeProfile?parseBusinessProfileExtras(profileResult.data,profileResult.error):emptyBusinessProfileExtras(), raw:row };
}

async function loadPublicServiceMediaRows(businessId:string):Promise<Row[]> {
  const publicMedia=await rpcRequest<Row[]>('melo_public_partner_service_media',{p_business_id:businessId});
  if(!publicMedia.error) {
    const publicRows=rowsOf(publicMedia.data);
    if(publicRows.length) return publicRows;
  }

  // Backward compatibility for deployments that already have the older viewer-safe RPC.
  const legacyMedia=await rpcRequest<Row[]>('get_partner_service_media',{p_business_id:businessId});
  return legacyMedia.error?[]:rowsOf(legacyMedia.data);
}

async function loadServices(businessId:string):Promise<Service[]> {
  const [base,detail,sales,mediaRows]=await Promise.all([
    rpcRequest<Row[]>('melo_business_services_for_viewer',{p_business_id:businessId}),
    rpcRequest<Row[]>('get_business_service_details',{p_business_id:businessId}),
    rpcRequest<Row[]>('get_business_service_sales_settings',{p_business_id:businessId}),
    loadPublicServiceMediaRows(businessId),
  ]);
  if (base.error) throw new Error(base.error);
  const details=new Map<string,Row>();
  for (const row of rowsOf(detail.data)) { const key=text(row,'service_id','id'); if (key) details.set(key,row); }
  const salesMap=new Map<string,Row>();
  for (const row of rowsOf(sales.data)) { const key=text(row,'service_id','id'); if (key) salesMap.set(key,row); }
  const mediaMap=new Map<string,Row[]>();
  for (const row of mediaRows) {
    const key=text(row,'service_id','id');
    if(!key) continue;
    const current=mediaMap.get(key)??[];
    current.push(row);
    mediaMap.set(key,current);
  }
  return Promise.all(rowsOf(base.data).filter(r=>r.is_active!==false).map(async r=>{
    const serviceId=text(r,'id','service_id');
    const d:Row=details.get(serviceId)??{}; const s:Row=salesMap.get(serviceId)??{}; const merged={...r,...d,...s};
    const sale=text(merged,'sale_mode'); const saleMode:Service['saleMode']=sale==='instant'||sale==='info'?'instant'===sale?'instant':'info':'inquiry';
    const dedicatedRows=mediaMap.get(serviceId)??[];
    const imageGroups=await Promise.all([
      resolveCommerceMediaList(serviceMediaRecord(...dedicatedRows)),
      resolveCommerceMediaList(serviceMediaRecord(s)),
      resolveCommerceMediaList(serviceExplicitMediaRecord(d)),
      resolveCommerceMediaList(serviceExplicitMediaRecord(r)),
    ]);
    // Do not fall back to a generic business image from the public service row. Some viewer RPCs
    // include Partner logo/profile fields, which made product cards incorrectly show the shop avatar.
    const images=uniqueStrings(imageGroups.flat());
    const img=images[0]??'';
    return { id:serviceId, businessId, category:text(merged,'category'), title:text(merged,'title','name')||'Melo Service', description:text(merged,'description','short_description'), price:num(merged,'price_from','price'), originalPrice:num(merged,'original_price'), currency:text(merged,'currency')||'THB', priceUnit:text(merged,'price_unit'), detailType:text(merged,'detail_type')||'standard', validUntil:text(merged,'valid_until'), memberOnly:bool(merged,'melo_member_only','member_only'), includes:text(merged,'includes_text','includes'), excludes:text(merged,'excludes_text','excludes'), duration:num(merged,'duration_minutes'), minGuests:num(merged,'min_guests'), maxGuests:num(merged,'max_guests'), saleMode, image:img, images, raw:merged };
  }));
}

async function loadReviews(businessId:string):Promise<Review[]> {
  const result=await rpcRequest<Row[]>('get_business_reviews',{p_business_id:businessId}); if (result.error) return [];
  return rowsOf(result.data).map((r,i)=>({id:text(r,'id')||String(i),name:text(r,'reviewer_name','display_name')||'Melo User',rating:Number(r.rating??0),comment:text(r,'comment'),createdAt:text(r,'created_at')}));
}

function CommercePageFrame({ embedded, children }:{embedded:boolean;children:ReactNode}) {
  return embedded ? <div className={styles.page}>{children}</div> : <main className={styles.page}><Header/>{children}</main>;
}

export function CommerceDetailExperience({ mode, id, businessIdHint='', embedded=false }:{mode:'partner'|'deal';id:string;businessIdHint?:string;embedded?:boolean}) {
  const searchParams=useSearchParams();
  const handledCardAction=useRef('');
  const { locale }=useLocale(); const copy=commerceDetailCopy[locale]; const localeTag=locale==='th'?'th-TH':locale==='de'?'de-DE':locale==='zh'?'zh-CN':locale==='ja'?'ja-JP':locale==='ko'?'ko-KR':'en-US';
  const [user,setUser]=useState<User|null>(null); const [business,setBusiness]=useState<Business|null>(null); const [services,setServices]=useState<Service[]>([]); const [reviews,setReviews]=useState<Review[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [savedBusiness,setSavedBusiness]=useState(false); const [savedServices,setSavedServices]=useState<Set<string>>(new Set());
  const [selected,setSelected]=useState<Service|null>(null); const [message,setMessage]=useState(''); const [modal,setModal]=useState<'inquiry'|'payment'|'coupon'|null>(null); const [busy,setBusy]=useState(false); const [notice,setNotice]=useState(''); const [payment,setPayment]=useState<Payment|null>(null); const [coupon,setCoupon]=useState('');
  const [selectedServiceCategory,setSelectedServiceCategory]=useState('');
  const [reviewsOpen,setReviewsOpen]=useState(false);
  const [partnerDetailsOpen,setPartnerDetailsOpen]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try {
      const current=await getCurrentUser(); setUser(current);
      let businessId=mode==='partner'?id:businessIdHint;
      if (mode==='deal'&&!businessId) {
        const partners=await rpcRequest<Row[]>('melo_public_businesses'); if (partners.error) throw new Error(partners.error);
        const ids=rowsOf(partners.data).map(r=>text(r,'id')).filter(Boolean);
        if (ids.length) { const summaries=await rpcRequest<Row[]>('melo_public_business_service_summaries',{p_business_ids:ids,p_limit:120}); const hit=rowsOf(summaries.data).find(r=>text(r,'id')===id); businessId=hit?text(hit,'business_id'):''; }
      }
      if (!businessId) { setBusiness(null); setServices([]); return; }
      const [b,ss,rr]=await Promise.all([loadBusiness(businessId,mode==='partner'),loadServices(businessId),loadReviews(businessId)]); setBusiness(b); setServices(ss); setReviews(rr);
      if (mode==='deal') setSelected(ss.find(s=>s.id===id)??null);
      if (current&&b) {
        const [sb,sv]=await Promise.all([
          restSelect<Row[]>('partner_saved_businesses',`select=business_id&user_id=eq.${encodeURIComponent(current.id)}&business_id=eq.${encodeURIComponent(b.id)}&limit=1`),
          rpcRequest<Row[]>('get_my_saved_partner_service_ids'),
        ]);
        setSavedBusiness(rowsOf(sb.data).length>0); setSavedServices(new Set(rowsOf(sv.data).map(r=>text(r,'service_id')).filter(Boolean)));
      }
    } catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setLoading(false);}
  },[businessIdHint,id,mode]);
  useEffect(()=>{void load();},[load]);

  const heroService=mode==='deal'?selected:null;
  const heroImages=uniqueStrings([...(heroService?.images??[]),heroService?.image,...(business?.covers??[]),business?.cover,...(business?.images??[]),business?.image]);
  const heroImage=heroImages[0]??'';
  const avgRating=useMemo(()=>reviews.length?reviews.reduce((s,r)=>s+r.rating,0)/reviews.length:0,[reviews]);
  const serviceCategories=useMemo(()=>[...new Set(services.map(service=>service.category||service.detailType).filter(Boolean))],[services]);
  const partnerProfile=business?.profile??emptyBusinessProfileExtras();
  const mapUrl=useMemo(()=>businessMapUrl(business),[business]);
  const petPolicy=useMemo(()=>{
    const values=partnerProfile.amenities.map(value=>value.trim().toLocaleLowerCase());
    const allowed=values.some(value=>value==='รองรับสัตว์เลี้ยง'||value==='pet_friendly'||value==='pets_allowed'||value==='pet friendly'||value==='pets allowed');
    const blocked=values.some(value=>value==='ไม่รองรับสัตว์เลี้ยง'||value==='no_pets'||value==='pets_not_allowed'||value==='no pets'||value==='pets not allowed');
    return allowed?copy.petsAllowed:blocked?copy.petsNotAllowed:'';
  },[copy.petsAllowed,copy.petsNotAllowed,partnerProfile.amenities]);
  const generalAmenities=useMemo(()=>partnerProfile.amenities.filter(value=>{
    const clean=value.trim(); const lower=clean.toLocaleLowerCase();
    return !clean.startsWith('ใกล้ ')&&!['รองรับสัตว์เลี้ยง','ไม่รองรับสัตว์เลี้ยง','pet_friendly','pets_allowed','pet friendly','pets allowed','no_pets','pets_not_allowed','no pets','pets not allowed'].includes(lower);
  }),[partnerProfile.amenities]);
  const serviceLanguages=partnerProfile.serviceLanguages.length?partnerProfile.serviceLanguages.join(' · '):(business?.language||'').toUpperCase();
  const bookingLabel=partnerProfile.bookingMode==='request'?copy.bookingRequest:partnerProfile.bookingMode==='external'?copy.bookingExternal:partnerProfile.bookingMode==='walk_in'?copy.bookingWalkIn:copy.bookingChat;
  const dayLabels:Record<OpeningDayKey,string>={mon:copy.mon,tue:copy.tue,wed:copy.wed,thu:copy.thu,fri:copy.fri,sat:copy.sat,sun:copy.sun};
  const showServiceInfo=Boolean(serviceLanguages||partnerProfile.serviceArea||generalAmenities.length||petPolicy||partnerProfile.loaded);

  async function requireUser(){ if(user)return user; setNotice(copy.loginRequired); return null; }
  async function toggleBusiness(){ const u=await requireUser(); if(!u||!business)return; setBusy(true);setNotice(''); const next=!savedBusiness; const result=next?await restUpsert('partner_saved_businesses',{user_id:u.id,business_id:business.id},'user_id,business_id'):await restDelete('partner_saved_businesses',`user_id=eq.${encodeURIComponent(u.id)}&business_id=eq.${encodeURIComponent(business.id)}`); setBusy(false); if(result.error){setNotice(result.error);return;} setSavedBusiness(next); }
  async function toggleService(service:Service){ if(!(await requireUser()))return; setBusy(true); const next=!savedServices.has(service.id); const result=await rpcRequest('set_partner_service_saved',{p_service_id:service.id,p_saved:next}); setBusy(false); if(result.error){setNotice(result.error);return;} setSavedServices(prev=>{const n=new Set(prev);next?n.add(service.id):n.delete(service.id);return n;}); setNotice(next?copy.serviceSaved:copy.serviceUnsaved); }
  async function sendInquiry(){ if(!(await requireUser())||!business||!selected||!message.trim())return; setBusy(true); const result=await rpcRequest('send_business_inquiry',{p_business_id:business.id,p_service_id:selected.id,p_message:message.trim()}); setBusy(false); if(result.error){setNotice(`${copy.actionFailed}: ${result.error}`);return;} setMessage('');setNotice(copy.sent);setModal(null); }
  async function claimCoupon(service:Service){ if(!(await requireUser()))return; setBusy(true); const result=await rpcRequest<Row[]>('claim_partner_coupon',{p_service_id:service.id}); setBusy(false); if(result.error){setNotice(`${copy.actionFailed}: ${result.error}`);return;} const row=rowsOf(result.data)[0]??{}; setCoupon(text(row,'coupon_code'));setSelected(service);setModal('coupon'); }
  async function startPayment(service:Service){ if(!(await requireUser()))return; setBusy(true); const result=await invokeEdgeFunction<Row>('partner-create-promptpay-payment',{serviceId:service.id}); setBusy(false); if(result.error){setNotice(`${copy.actionFailed}: ${result.error}`);return;} const r=result.data??{}; const orderId=text(r,'orderId'); if(!orderId){setNotice(copy.actionFailed);return;} setPayment({orderId,amount:Number(r.amount??0),currency:text(r,'currency')||'THB',paymentStatus:text(r,'paymentStatus')||'pending',qrImageUrl:text(r,'qrImageUrl'),hostedInstructionsUrl:text(r,'hostedInstructionsUrl'),voucherCode:text(r,'voucherCode'),expiresAt:text(r,'expiresAt')});setSelected(service);setModal('payment'); }
  async function checkPayment(){ if(!payment)return; setBusy(true);const result=await invokeEdgeFunction<Row>('partner-check-promptpay-payment',{orderId:payment.orderId});setBusy(false);if(result.error){setNotice(result.error);return;}const r=result.data??{};setPayment(p=>p?{...p,paymentStatus:text(r,'paymentStatus')||p.paymentStatus,qrImageUrl:text(r,'qrImageUrl')||p.qrImageUrl,voucherCode:text(r,'voucherCode')||p.voucherCode,expiresAt:text(r,'expiresAt')||p.expiresAt}:p); }
  function serviceAction(service:Service){ setSelected(service); setNotice(''); if(service.detailType==='coupon'){void claimCoupon(service);return;} if(service.saleMode==='instant'){void startPayment(service);return;} if(service.saleMode==='info'){return;} setModal('inquiry'); }

  useEffect(()=>{
    if(mode!=='deal'||!selected)return;
    const action=searchParams.get('action')||'';
    const key=`${selected.id}:${action}`;
    if(!action||handledCardAction.current===key)return;
    handledCardAction.current=key;
    if(action==='buy'&&selected.saleMode==='instant') serviceAction(selected);
  },[mode,searchParams,selected]);

  if(!isSupabaseConfigured()) return <CommercePageFrame embedded={embedded}><div className={styles.state}>Supabase is not configured.</div></CommercePageFrame>;
  if(loading) return <CommercePageFrame embedded={embedded}><div className={styles.state}>{copy.loading}</div></CommercePageFrame>;
  if(error) return <CommercePageFrame embedded={embedded}><div className={styles.state}><strong>{copy.loadFailed}</strong><p>{error}</p><button onClick={()=>void load()}>{copy.retry}</button></div></CommercePageFrame>;
  if(!business) return <CommercePageFrame embedded={embedded}><div className={styles.state}><strong>{copy.notFound}</strong><Link href={mode==='deal'?'/deals':'/partners'}>{copy.browseMore}</Link></div></CommercePageFrame>;

  if(mode==='deal') {
    if(!selected) return <CommercePageFrame embedded={embedded}><div className={styles.state}><strong>{copy.notFound}</strong><Link href="/deals">{copy.browseMore}</Link></div></CommercePageFrame>;
    const percent=discountPercent(selected);
    const primaryLabel=selected.detailType==='coupon'?copy.claim:selected.saleMode==='instant'?copy.buy:selected.saleMode==='inquiry'?copy.ask:copy.infoOnly;
    const content=serviceDetailLines(selected);
    const serviceUsers=guestRange(selected,copy.people);
    const otherServices=services.filter(service=>service.id!==selected.id);
    return <CommercePageFrame embedded={embedded}><section className={styles.dealShell}>
      <div className={styles.breadcrumb}><Link href="/deals">← {copy.back}</Link><span>/</span><span>{copy.deal}</span></div>
      <section className={styles.dealHero}>
        <div className={styles.dealMedia}>
          <div className={styles.dealMediaFallback}>％</div>
          <FallbackImage sources={heroImages} alt={selected.title} className={styles.dealMediaImage}/>
          <div className={styles.dealMediaBadges}>{percent>0&&<strong>-{percent}%</strong>}{selected.memberOnly&&<span>{copy.memberOnly}</span>}</div>
        </div>
        <div className={styles.dealSummary}>
          <div className={styles.dealPartnerLine}><div>{business.images.length?<FallbackImage sources={business.images} alt={business.name}/>:<span>{business.name.slice(0,1).toUpperCase()}</span>}<div><small>{copy.verified}</small><b>{business.name}</b></div></div><Link href={`/partners/${business.id}`}>{copy.openPartner} →</Link></div>
          <span className={styles.kicker}>{selected.category||selected.detailType||copy.deal}</span>
          <h1>{selected.title}</h1>
          {content.summary&&<p className={styles.dealLead}>{content.summary}</p>}
          <div className={styles.dealPriceBlock}>{selected.originalPrice!=null&&selected.price!=null&&selected.originalPrice>selected.price&&<del>{money(selected.originalPrice,selected.currency,localeTag)}</del>}<strong>{selected.price!=null?money(selected.price,selected.currency,localeTag):copy.ask}</strong>{selected.priceUnit&&<span>/ {selected.priceUnit}</span>}</div>
          <div className={styles.dealQuickMeta}>{selected.validUntil&&<span>{copy.validUntil} {dateText(selected.validUntil,localeTag)}</span>}<span>{selected.saleMode==='instant'?copy.instantMode:selected.saleMode==='inquiry'?copy.inquiryMode:copy.infoOnly}</span>{[business.city,business.country].filter(Boolean).length>0&&<span>⌖ {[business.city,business.country].filter(Boolean).join(', ')}</span>}</div>
          {notice&&<div className={styles.notice}>{notice}</div>}
          <div className={styles.dealActions}><button className={styles.secondary} disabled={busy||!user} onClick={()=>void toggleService(selected)}>{savedServices.has(selected.id)?'★':'☆'} {savedServices.has(selected.id)?copy.saved:copy.save}</button>{selected.saleMode!=='info'&&<button className={styles.primary} disabled={busy} onClick={()=>serviceAction(selected)}>{primaryLabel}</button>}</div>
        </div>
      </section>
      <div className={styles.dealDetailLayout}><div className={styles.mainCol}>
        <section className={styles.section}>
          <div className={styles.sectionTitle}><span>{copy.dealDetails}</span></div>
          {content.summary&&<div className={styles.dealDescription}><p>{content.summary}</p></div>}
          {content.lines.length>0&&<div className={styles.menuDetails}><h3>{copy.menuDetails}</h3><ul>{content.lines.map((line,index)=><li key={`${line}-${index}`}>{line}</li>)}</ul></div>}
          {(serviceUsers||selected.duration!=null||selected.includes||selected.excludes)&&<div className={styles.dealFacts}>
            {serviceUsers&&<div className={styles.serviceUsersFact}><span>{copy.serviceUsers}</span><strong>{serviceUsers}</strong></div>}
            {selected.duration!=null&&<div><span>{copy.duration}</span><strong>{selected.duration} {copy.minutes}</strong></div>}
            {selected.includes&&<div><span>{copy.includes}</span><strong>{selected.includes}</strong></div>}
            {selected.excludes&&<div><span>{copy.excludes}</span><strong>{selected.excludes}</strong></div>}
          </div>}
        </section>
        {otherServices.length>0&&<section className={`${styles.section} ${styles.moreDealsSection}`}>
          <div className={styles.sectionTitle}><span>{copy.moreFromPartner}</span><strong>{otherServices.length}</strong></div>
          <p className={styles.moreDealsIntro}>{copy.moreFromPartnerDesc}</p>
          <div className={styles.moreDealsViewport}>
            <div className={styles.moreDealsTrack} data-static={otherServices.length===1}>
              {[0,1].map(loop=><div className={styles.moreDealsSet} key={loop} aria-hidden={loop===1||undefined}>{otherServices.map(service=>{
                const media=serviceMediaSources(service);
                return <Link className={styles.moreDealCard} key={`${loop}-${service.id}`} href={`/deals/${service.id}?business=${business.id}`} tabIndex={loop===1?-1:undefined}>
                  <div className={styles.moreDealMedia}><span className={styles.moreDealPlaceholder}>✦</span><FallbackImage sources={media} alt={service.title} className={styles.moreDealImage}/>{service.memberOnly&&<em>{copy.memberOnly}</em>}</div>
                  <div className={styles.moreDealBody}><small>{service.category||service.detailType}</small><strong>{service.title}</strong><div><b>{service.price!=null?money(service.price,service.currency,localeTag):copy.ask}</b>{service.priceUnit&&<span>/ {service.priceUnit}</span>}</div></div>
                </Link>;
              })}</div>)}
            </div>
          </div>
        </section>}
        <section className={styles.section}><div className={styles.sectionTitle}><span>{copy.reviews}</span><strong>{reviews.length}</strong></div>{reviews.length===0?<div className={styles.empty}>{copy.noReviews}</div>:<div className={styles.reviews}>{reviews.slice(0,8).map(review=><article key={review.id}><div><strong>{review.name}</strong><span>{'★'.repeat(Math.max(0,Math.min(5,Math.round(review.rating))))}</span></div><p>{review.comment}</p><small>{dateText(review.createdAt,localeTag)}</small></article>)}</div>}</section>
      </div><aside className={styles.sideCol}><section className={`${styles.infoCard} ${styles.dealPartnerCard}`}><div className={styles.partnerIdentity}>{business.images.length?<FallbackImage sources={business.images} alt={business.name}/>:<span>{business.name.slice(0,1).toUpperCase()}</span>}<div><h3>{business.name}</h3><small>✓ {copy.verified}</small></div></div><p>{business.description||business.name}</p><dl>{business.address&&<><dt>{copy.address}</dt><dd>{business.address}</dd></>}{business.phone&&<><dt>{copy.contact}</dt><dd>{business.phone}</dd></>}{business.email&&<><dt>Email</dt><dd>{business.email}</dd></>}{business.website&&<><dt>{copy.website}</dt><dd><a href={/^https?:\/\//i.test(business.website)?business.website:`https://${business.website}`} target="_blank" rel="noreferrer">{business.website}</a></dd></>}</dl><Link className={styles.partnerButton} href={`/partners/${business.id}`}>{copy.openPartner} →</Link></section></aside></div>
    </section>
    {modal==='inquiry'&&selected&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.currentTarget===e.target)setModal(null)}}><section className={styles.modal}><button className={styles.modalClose} onClick={()=>setModal(null)}>×</button><span className={styles.kicker}>{copy.askTitle}</span><h2>{selected.title}</h2><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder={copy.askPlaceholder} maxLength={1500}/><button className={styles.primary} disabled={busy||!message.trim()} onClick={()=>void sendInquiry()}>{busy?copy.loading:copy.send}</button></section></div>}
    {modal==='coupon'&&selected&&<div className={styles.modalBackdrop}><section className={styles.modal}><button className={styles.modalClose} onClick={()=>setModal(null)}>×</button><div className={styles.successIcon}>✓</div><h2>{copy.claimed}</h2><p>{selected.title}</p><div className={styles.codeBox}><span>{copy.couponCode}</span><strong>{coupon||'—'}</strong></div><button className={styles.primary} onClick={()=>setModal(null)}>{copy.close}</button></section></div>}
    {modal==='payment'&&selected&&payment&&<div className={styles.modalBackdrop}><section className={styles.modal}><button className={styles.modalClose} onClick={()=>setModal(null)}>×</button><span className={styles.kicker}>{copy.payment}</span><h2>{selected.title}</h2><div className={styles.paymentStatus} data-paid={payment.paymentStatus==='paid'}>{payment.paymentStatus==='paid'?copy.paymentPaid:copy.paymentPending}</div>{payment.qrImageUrl&&<img className={styles.qr} src={payment.qrImageUrl} alt="PromptPay QR"/>}<div className={styles.codeBox}><span>{copy.amount}</span><strong>{money(payment.amount,payment.currency,localeTag)}</strong></div>{payment.voucherCode&&<div className={styles.codeBox}><span>{copy.voucher}</span><strong>{payment.voucherCode}</strong></div>}{payment.expiresAt&&<small>{copy.expires}: {dateText(payment.expiresAt,localeTag)}</small>}<div className={styles.modalActions}>{payment.hostedInstructionsUrl&&<a className={styles.secondary} href={payment.hostedInstructionsUrl} target="_blank" rel="noreferrer">{copy.payment}</a>}<button className={styles.primary} disabled={busy||payment.paymentStatus==='paid'} onClick={()=>void checkPayment()}>{busy?copy.loading:copy.refreshPayment}</button></div></section></div>}
    </CommercePageFrame>;
  }

  const shownServices=selectedServiceCategory?services.filter(service=>(service.category||service.detailType)===selectedServiceCategory):services;
  return <CommercePageFrame embedded={embedded}><section className={`${styles.shell} ${styles.partnerShell}`}>
    <div className={styles.breadcrumb}><Link href="/partners">← {copy.back}</Link><span>/</span><span>{copy.partner}</span></div>
    <section className={styles.hero} style={heroImage?{backgroundImage:`url(${JSON.stringify(heroImage).slice(1,-1)})`}:undefined}>
      <div className={styles.heroShade}/>
      <div className={styles.heroContent}>
        <div><span className={styles.kicker}>{copy.partner}</span><h1>{heroService?.title||business.name}</h1><p>{heroService?.description||business.description}</p><div className={styles.heroMeta}>{business.category&&<span>{business.category}</span>}{[business.city,business.country].filter(Boolean).length>0&&<span>⌖ {[business.city,business.country].filter(Boolean).join(', ')}</span>}{reviews.length>0&&<span>★ {avgRating.toFixed(1)} ({reviews.length})</span>}<span>✓ {copy.verified}</span></div></div>
        <div className={styles.heroSide}><div className={styles.heroProfile}>{business.images.length?<FallbackImage sources={uniqueStrings([business.image,...business.images])} alt={business.name}/>:<span>{business.name.slice(0,1).toUpperCase()}</span>}</div><div className={styles.heroActions}><button disabled={busy} onClick={()=>void toggleBusiness()}>{savedBusiness?'★':'☆'} {savedBusiness?copy.saved:copy.save}</button></div></div>
      </div>
      <div className={styles.heroMobileCover} style={heroImage?{backgroundImage:`url(${JSON.stringify(heroImage).slice(1,-1)})`}:undefined}/>
      <div className={styles.heroMobileIdentity}>
        <div className={styles.heroMobileHeader}>
          <div className={styles.heroMobileProfile}>{business.images.length?<FallbackImage sources={uniqueStrings([business.image,...business.images])} alt={business.name}/>:<span>{business.name.slice(0,1).toUpperCase()}</span>}</div>
          <div className={styles.heroMobileTitle}><small>{categoryLabel(business.category)||copy.partner}</small><h1>{business.name}</h1>{[business.city,business.country].filter(Boolean).length>0&&<p>⌖ {[business.city,business.country].filter(Boolean).join(', ')}</p>}</div>
          <button className={styles.heroMobileSave} aria-label={savedBusiness?copy.saved:copy.save} disabled={busy} onClick={()=>void toggleBusiness()}>{savedBusiness?'★':'☆'}</button>
        </div>
        <div className={styles.heroMobileMeta}>{reviews.length>0&&<span>★ {avgRating.toFixed(1)} ({reviews.length})</span>}<span>✓ {copy.verified}</span></div>
        <section className={styles.heroMobileAbout}>
          <h2>{copy.about}</h2>
          <p className={styles.heroMobileAboutDescription}>{business.description||business.name}</p>
          <button type="button" className={`${styles.reviewTrigger} ${styles.heroMobileReview}`} onClick={()=>setReviewsOpen(true)}><span>★ {reviews.length?avgRating.toFixed(1):'—'}</span><strong>{copy.viewReviews}</strong><em>{reviews.length}</em></button>
          <div className={styles.heroMobileFacts}>
            {business.address&&<div className={styles.heroMobileFactWide}><span>{copy.address}</span><strong>{business.address}</strong></div>}
            {business.phone&&<div><span>{copy.contact}</span><strong>{business.phone}</strong></div>}
            {business.email&&<div><span>Email</span><strong>{business.email}</strong></div>}
            <div><span>{copy.language}</span><strong>{serviceLanguages||business.language.toUpperCase()||'—'}</strong></div>
            {business.website&&<div><span>{copy.website}</span><a href={/^https?:\/\//i.test(business.website)?business.website:`https://${business.website}`} target="_blank" rel="noreferrer">{business.website}</a></div>}
          </div>
          <div className={styles.heroMobileAboutActions}>
            {mode==='partner'&&mapUrl&&<a className={styles.bookingButton} href={mapUrl} target="_blank" rel="noreferrer">⌖ {copy.openMap}</a>}
            <button type="button" className={styles.inlineLinkButton} onClick={()=>setPartnerDetailsOpen(true)}>{copy.seeMore} →</button>
          </div>
        </section>
      </div>
    </section>
    {notice&&<div className={styles.notice}>{notice}</div>}
    <div className={styles.layout}><div className={styles.mainCol}>
      <section className={styles.section}>
        <div className={styles.sectionTitle}><span>{copy.services}</span><strong>{services.length}</strong></div>
        {serviceCategories.length>0&&<div className={styles.serviceCategoryBlock}>
          <span className={styles.serviceCategoryLabel}>{copy.serviceCategories}</span>
          <div className={styles.serviceCategoryNav}>
            <button type="button" className={!selectedServiceCategory?styles.serviceCategoryActive:''} onClick={()=>setSelectedServiceCategory('')}>{copy.allCategories}</button>
            {serviceCategories.map(category=><button type="button" key={category} className={selectedServiceCategory===category?styles.serviceCategoryActive:''} onClick={()=>setSelectedServiceCategory(category)}>{categoryLabel(category)}</button>)}
          </div>
        </div>}
        {shownServices.length===0?<div className={styles.empty}>{copy.noServices}</div>:<div className={styles.services}>{shownServices.map(service=>{
          const mediaSources=serviceMediaSources(service);
          return <article className={styles.service} key={service.id}>
            <div className={styles.serviceImage}>
              {mediaSources.length?<FallbackImage sources={mediaSources} alt={service.title} className={styles.serviceMediaImage}/>:<span>✦</span>}
              {service.memberOnly&&<em>{copy.memberOnly}</em>}
            </div>
            <div className={styles.serviceBody}>
              <div className={styles.serviceTop}><small>{categoryLabel(service.category||service.detailType)}</small><button aria-label={copy.save} disabled={busy||!user} onClick={()=>void toggleService(service)}>{savedServices.has(service.id)?'★':'☆'}</button></div>
              <h2>{service.title}</h2><p>{service.description}</p>
              <div className={styles.price}>{service.originalPrice!=null&&<del>{money(service.originalPrice,service.currency,localeTag)}</del>}<strong>{service.price!=null?money(service.price,service.currency,localeTag):copy.ask}</strong>{service.priceUnit&&<span>/ {service.priceUnit}</span>}</div>
              <div className={styles.tags}>{service.saleMode==='instant'?<span>{copy.instantMode}</span>:service.saleMode==='inquiry'?<span>{copy.inquiryMode}</span>:<span>{copy.infoOnly}</span>}{service.validUntil&&<span>{copy.validUntil} {dateText(service.validUntil,localeTag)}</span>}</div>
              {(service.includes||service.excludes||service.duration!=null)&&<div className={styles.serviceDetails}>{service.duration!=null&&<div><span>{copy.duration}</span><strong>{service.duration} {copy.minutes}</strong></div>}{service.includes&&<div><span>{copy.includes}</span><strong>{service.includes}</strong></div>}{service.excludes&&<div><span>{copy.excludes}</span><strong>{service.excludes}</strong></div>}</div>}
              <div className={styles.serviceActions}><button className={styles.secondary} disabled={busy||!user} onClick={()=>void toggleService(service)}>{savedServices.has(service.id)?copy.saved:copy.save}</button>{service.saleMode!=='info'&&<button className={styles.primary} disabled={busy} onClick={()=>serviceAction(service)}>{service.detailType==='coupon'?copy.claim:service.saleMode==='instant'?copy.buy:copy.ask}</button>}</div>
            </div>
          </article>;
        })}</div>}
      </section>
    </div><aside className={styles.sideCol}><section className={styles.infoCard}><h3>{copy.about}</h3><p>{business.description||business.name}</p><button type="button" className={styles.reviewTrigger} onClick={()=>setReviewsOpen(true)}><span>★ {reviews.length?avgRating.toFixed(1):'—'}</span><strong>{copy.viewReviews}</strong><em>{reviews.length}</em></button><dl>{business.address&&<><dt>{copy.address}</dt><dd>{business.address}</dd></>}{business.phone&&<><dt>{copy.contact}</dt><dd>{business.phone}</dd></>}{business.email&&<><dt>Email</dt><dd>{business.email}</dd></>}{business.website&&<><dt>{copy.website}</dt><dd><a href={/^https?:\/\//i.test(business.website)?business.website:`https://${business.website}`} target="_blank" rel="noreferrer">{business.website}</a></dd></>}{partnerProfile.line&&<><dt>LINE</dt><dd>{partnerProfile.line}</dd></>}{partnerProfile.facebook&&<><dt>Facebook</dt><dd>{partnerProfile.facebook}</dd></>}{partnerProfile.instagram&&<><dt>Instagram</dt><dd>{partnerProfile.instagram}</dd></>}{partnerProfile.whatsapp&&<><dt>WhatsApp</dt><dd>{partnerProfile.whatsapp}</dd></>}<><dt>{copy.language}</dt><dd>{serviceLanguages||business.language.toUpperCase()||'—'}</dd></></dl>{mode==='partner'&&mapUrl&&<a className={styles.bookingButton} href={mapUrl} target="_blank" rel="noreferrer">⌖ {copy.openMap}</a>}<button type="button" className={styles.inlineLinkButton} onClick={()=>setPartnerDetailsOpen(true)}>{copy.seeMore} →</button></section></aside></div>
  </section>
  {reviewsOpen&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.currentTarget===e.target)setReviewsOpen(false)}}><section className={`${styles.modal} ${styles.reviewModal}`}><button className={styles.modalClose} onClick={()=>setReviewsOpen(false)}>×</button><span className={styles.kicker}>{copy.partner}</span><h2>{copy.reviewTitle}</h2><div className={styles.reviewSummary}><strong>★ {reviews.length?avgRating.toFixed(1):'—'}</strong><span>{reviews.length} {copy.reviews}</span></div>{reviews.length===0?<div className={styles.empty}>{copy.noReviews}</div>:<div className={styles.reviews}>{reviews.map(review=><article key={review.id}><div><strong>{review.name}</strong><span>{'★'.repeat(Math.max(0,Math.min(5,Math.round(review.rating))))}</span></div><p>{review.comment}</p><small>{dateText(review.createdAt,localeTag)}</small></article>)}</div>}</section></div>}
  {partnerDetailsOpen&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.currentTarget===e.target)setPartnerDetailsOpen(false)}}><section className={`${styles.modal} ${styles.partnerDetailsModal}`}><button className={styles.modalClose} onClick={()=>setPartnerDetailsOpen(false)}>×</button>
    <div className={styles.partnerDetailsHeader}>
      <div className={styles.partnerDetailsAvatar}>{business.images.length?<FallbackImage sources={uniqueStrings([business.image,...business.images])} alt={business.name}/>:<span>{business.name.slice(0,1).toUpperCase()}</span>}</div>
      <div className={styles.partnerDetailsIdentity}><span className={styles.kicker}>{copy.partnerDetails}</span><h2>{business.name}</h2><div className={styles.partnerDetailsBadges}>{business.category&&<span>{categoryLabel(business.category)}</span>}{partnerProfile.subcategory&&<span>{categoryLabel(partnerProfile.subcategory)}</span>}<span>✓ {copy.verified}</span></div>{[business.city,business.country].filter(Boolean).length>0&&<p>⌖ {[business.city,business.country].filter(Boolean).join(', ')}</p>}</div>
    </div>
    {business.description&&<section className={styles.partnerDetailsSection}><h3>{copy.about}</h3><p>{business.description}</p></section>}
    <div className={styles.partnerDetailsGrid}>
      <section className={styles.partnerDetailsSection}><h3>{copy.serviceInfo}</h3><dl>
        <dt>{copy.serviceLanguages}</dt><dd>{serviceLanguages||'—'}</dd>
        {partnerProfile.serviceArea&&<><dt>{copy.serviceArea}</dt><dd>{partnerProfile.serviceArea}</dd></>}
        {partnerProfile.secondaryCategories.length>0&&<><dt>{copy.serviceCategories}</dt><dd>{partnerProfile.secondaryCategories.map(categoryLabel).join(' · ')}</dd></>}
        {generalAmenities.length>0&&<><dt>{copy.amenities}</dt><dd>{generalAmenities.join(' · ')}</dd></>}
        {petPolicy&&<><dt>{copy.pets}</dt><dd>{petPolicy}</dd></>}
        {partnerProfile.loaded&&<><dt>{copy.booking}</dt><dd>{bookingLabel}</dd></>}
      </dl>{partnerProfile.bookingMode==='external'&&partnerProfile.bookingUrl&&<a className={styles.bookingButton} href={/^https?:\/\//i.test(partnerProfile.bookingUrl)?partnerProfile.bookingUrl:`https://${partnerProfile.bookingUrl}`} target="_blank" rel="noreferrer">{copy.openBooking} ↗</a>}</section>
      <section className={styles.partnerDetailsSection}><h3>{copy.contact}</h3><dl>
        {business.address&&<><dt>{copy.address}</dt><dd>{business.address}</dd></>}
        {business.phone&&<><dt>{copy.contact}</dt><dd>{business.phone}</dd></>}
        {business.email&&<><dt>Email</dt><dd>{business.email}</dd></>}
        {business.website&&<><dt>{copy.website}</dt><dd><a href={/^https?:\/\//i.test(business.website)?business.website:`https://${business.website}`} target="_blank" rel="noreferrer">{business.website}</a></dd></>}
        {partnerProfile.line&&<><dt>LINE</dt><dd>{partnerProfile.line}</dd></>}
        {partnerProfile.facebook&&<><dt>Facebook</dt><dd>{partnerProfile.facebook}</dd></>}
        {partnerProfile.instagram&&<><dt>Instagram</dt><dd>{partnerProfile.instagram}</dd></>}
        {partnerProfile.whatsapp&&<><dt>WhatsApp</dt><dd>{partnerProfile.whatsapp}</dd></>}
      </dl>{mapUrl&&<a className={styles.bookingButton} href={mapUrl} target="_blank" rel="noreferrer">⌖ {copy.openMap} ↗</a>}</section>
    </div>
    {partnerProfile.hoursConfigured&&<section className={styles.partnerDetailsSection}><h3>{copy.serviceHours}</h3><div className={styles.hoursGrid}>{OPENING_DAY_KEYS.map(key=>{const day=partnerProfile.openingHours[key];return <div className={styles.hourItem} key={key}><span>{dayLabels[key]}</span><strong data-closed={day.closed}>{day.closed?copy.closed:`${day.open}-${day.close}`}</strong></div>;})}</div></section>}
  </section></div>}
  {modal==='inquiry'&&selected&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.currentTarget===e.target)setModal(null)}}><section className={styles.modal}><button className={styles.modalClose} onClick={()=>setModal(null)}>×</button><span className={styles.kicker}>{copy.askTitle}</span><h2>{selected.title}</h2><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder={copy.askPlaceholder} maxLength={1500}/><button className={styles.primary} disabled={busy||!message.trim()} onClick={()=>void sendInquiry()}>{busy?copy.loading:copy.send}</button></section></div>}
  {modal==='coupon'&&selected&&<div className={styles.modalBackdrop}><section className={styles.modal}><button className={styles.modalClose} onClick={()=>setModal(null)}>×</button><div className={styles.successIcon}>✓</div><h2>{copy.claimed}</h2><p>{selected.title}</p><div className={styles.codeBox}><span>{copy.couponCode}</span><strong>{coupon||'—'}</strong></div><button className={styles.primary} onClick={()=>setModal(null)}>{copy.close}</button></section></div>}
  {modal==='payment'&&selected&&payment&&<div className={styles.modalBackdrop}><section className={styles.modal}><button className={styles.modalClose} onClick={()=>setModal(null)}>×</button><span className={styles.kicker}>{copy.payment}</span><h2>{selected.title}</h2><div className={styles.paymentStatus} data-paid={payment.paymentStatus==='paid'}>{payment.paymentStatus==='paid'?copy.paymentPaid:copy.paymentPending}</div>{payment.qrImageUrl&&<img className={styles.qr} src={payment.qrImageUrl} alt="PromptPay QR"/>}<div className={styles.codeBox}><span>{copy.amount}</span><strong>{money(payment.amount,payment.currency,localeTag)}</strong></div>{payment.voucherCode&&<div className={styles.codeBox}><span>{copy.voucher}</span><strong>{payment.voucherCode}</strong></div>}{payment.expiresAt&&<small>{copy.expires}: {dateText(payment.expiresAt,localeTag)}</small>}<div className={styles.modalActions}>{payment.hostedInstructionsUrl&&<a className={styles.secondary} href={payment.hostedInstructionsUrl} target="_blank" rel="noreferrer">{copy.payment}</a>}<button className={styles.primary} disabled={busy||payment.paymentStatus==='paid'} onClick={()=>void checkPayment()}>{busy?copy.loading:copy.refreshPayment}</button></div></section></div>}
  </CommercePageFrame>;
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import { useLocale } from "@/components/SiteProviders";
import { loadFriendSnapshot } from "@/components/connect/connectData";
import { publicStorageUrl, rpcRequest } from "@/lib/supabase/browser";
import { GLOBAL_COUNTRY_SCOPE, matchesCountryScope } from "@/lib/discoveryCountry";
import styles from "./GlobalSearchExperience.module.css";

type Row = Record<string, any>;
type ResultItem = {
  id: string;
  type: "person" | "trip" | "event" | "community" | "partner";
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  country: string;
};

const COPY = {
  th:{title:"ค้นหาใน Melo",placeholder:"ค้นหาคน ทริป กิจกรรม คอมมูนิตี้ หรือพาร์ทเนอร์",people:"ผู้คน",trips:"ทริป",events:"กิจกรรม",communities:"คอมมูนิตี้",partners:"พาร์ทเนอร์",empty:"ไม่พบผลลัพธ์ที่ตรงกับคำค้นหา",search:"ค้นหา",results:"ผลลัพธ์"},
  en:{title:"Search Melo",placeholder:"Search people, Trips, Events, Communities or Partners",people:"People",trips:"Trips",events:"Events",communities:"Communities",partners:"Partners",empty:"No results match your search",search:"Search",results:"results"},
  de:{title:"Melo durchsuchen",placeholder:"Menschen, Reisen, Events, Communities oder Partner suchen",people:"Personen",trips:"Reisen",events:"Events",communities:"Communities",partners:"Partner",empty:"Keine passenden Ergebnisse",search:"Suchen",results:"Ergebnisse"},
  zh:{title:"搜索 Melo",placeholder:"搜索用户、旅行、活动、社区或合作伙伴",people:"用户",trips:"旅行",events:"活动",communities:"社区",partners:"合作伙伴",empty:"没有符合搜索条件的结果",search:"搜索",results:"结果"},
  ja:{title:"Meloを検索",placeholder:"人、Trip、Event、Community、Partnerを検索",people:"ユーザー",trips:"Trip",events:"Event",communities:"Community",partners:"Partner",empty:"検索結果がありません",search:"検索",results:"件"},
  ko:{title:"Melo 검색",placeholder:"사람, 여행, 이벤트, 커뮤니티 또는 파트너 검색",people:"사람",trips:"여행",events:"이벤트",communities:"커뮤니티",partners:"파트너",empty:"검색 결과가 없습니다",search:"검색",results:"결과"}
} as const;

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((item): item is Row => Boolean(item) && typeof item === "object");
  if (value && typeof value === "object") return [value as Row];
  return [];
}
function text(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value=row?.[key];
    if(typeof value==="string"&&value.trim()) return value.trim();
    if(typeof value==="number"&&Number.isFinite(value)) return String(value);
  }
  return "";
}
function activityImage(row: Row){
  const raw=text(row,"image_path","cover_url","image_url","photo_url");
  if(!raw)return "";
  if(/^https?:\/\//i.test(raw))return raw;
  return publicStorageUrl("activity-images",raw);
}
function businessImage(row: Row){
  const raw=text(row,"profile_image_path","logo_path","image_path","cover_image_path","image_url");
  if(!raw)return "";
  if(/^https?:\/\//i.test(raw))return raw;
  return publicStorageUrl("business-images",raw);
}
function match(item: ResultItem,q:string){
  return `${item.title} ${item.subtitle} ${item.country}`.toLocaleLowerCase().includes(q);
}

export default function GlobalSearchExperience(){
  const params=useSearchParams();
  const {locale,countryScope}=useLocale();
  const copy=COPY[locale]??COPY.en;
  const initial=params.get("q")||"";
  const [query,setQuery]=useState(initial);
  const [submitted,setSubmitted]=useState(initial);
  const [items,setItems]=useState<ResultItem[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{setQuery(initial);setSubmitted(initial)},[initial]);

  useEffect(()=>{
    let active=true;
    (async()=>{
      setLoading(true);
      const [friendSnapshot,tripsRes,eventsRes,communitiesRes,businessRes]=await Promise.all([
        loadFriendSnapshot().catch(()=>({candidates:[],requests:[],connections:[]})),
        rpcRequest<Row[]>("get_public_trips"),
        rpcRequest<Row[]>("get_public_events"),
        rpcRequest<Row[]>("get_communities"),
        rpcRequest<Row[]>("melo_public_businesses"),
      ]);
      if(!active)return;

      const people:ResultItem[]=friendSnapshot.candidates.map(person=>({
        id:person.userId,type:"person",title:person.displayName,
        subtitle:[person.city,person.country].filter(Boolean).join(" · "),
        imageUrl:person.photoUrl,href:`/users/${person.userId}`,
        country:person.country||person.nationality||"",
      }));

      const trips=rowsOf(tripsRes.data).map((row,index)=>({
        id:text(row,"id")||`trip-${index}`,type:"trip" as const,
        title:text(row,"title","name","trip_name")||"Trip",
        subtitle:[text(row,"city","destination_city"),text(row,"category","trip_category")].filter(Boolean).join(" · "),
        imageUrl:activityImage(row),href:`/trips/${text(row,"id")}`,
        country:text(row,"country","country_name","destination_country","country_code"),
      }));

      const events=rowsOf(eventsRes.data).map((row,index)=>({
        id:text(row,"id")||`event-${index}`,type:"event" as const,
        title:text(row,"title","name","event_name")||"Event",
        subtitle:[text(row,"city","venue_city"),text(row,"category","event_category")].filter(Boolean).join(" · "),
        imageUrl:activityImage(row),href:`/events/${text(row,"id")}`,
        country:text(row,"country","country_name","country_code"),
      }));

      const communities=rowsOf(communitiesRes.data).map((row,index)=>({
        id:text(row,"id")||`community-${index}`,type:"community" as const,
        title:text(row,"title","name","community_name")||"Community",
        subtitle:text(row,"category","category_key"),
        imageUrl:activityImage(row),href:`/community/${text(row,"id")}`,
        country:text(row,"country","country_name","country_code"),
      }));

      const partners=rowsOf(businessRes.data).map((row,index)=>({
        id:text(row,"id","business_id")||`partner-${index}`,type:"partner" as const,
        title:text(row,"business_name","name","display_name")||"Partner",
        subtitle:[text(row,"category_name","category"),text(row,"city")].filter(Boolean).join(" · "),
        imageUrl:businessImage(row),href:`/partners/${text(row,"id","business_id")}`,
        country:text(row,"country","country_name","country_code"),
      }));

      setItems([...people,...trips,...events,...communities,...partners].filter(item=>
        countryScope===GLOBAL_COUNTRY_SCOPE||!item.country||matchesCountryScope(item.country,countryScope as any)
      ));
      setLoading(false);
    })();
    return()=>{active=false};
  },[countryScope]);

  const q=submitted.trim().toLocaleLowerCase();
  const filtered=useMemo(()=>q?items.filter(item=>match(item,q)):[],[items,q]);
  const groups=[
    {type:"person",label:copy.people},
    {type:"trip",label:copy.trips},
    {type:"event",label:copy.events},
    {type:"community",label:copy.communities},
    {type:"partner",label:copy.partners},
  ] as const;

  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setSubmitted(query);
    const clean=query.trim();
    if(clean) window.history.replaceState(null,"",`/search?q=${encodeURIComponent(clean)}`);
  }

  return <main className={styles.page}>
    <Header/>
    <section className={styles.shell}>
      <form className={styles.searchBox} onSubmit={submit}>
        <span>⌕</span>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={copy.placeholder} autoFocus/>
        <button type="submit">{copy.search}</button>
      </form>

      {submitted?<div className={styles.resultCount}>{loading?"…":`${filtered.length} ${copy.results}`}</div>:null}

      {loading?<div className={styles.state}>…</div>:submitted&&filtered.length?(
        <div className={styles.groups}>
          {groups.map(group=>{
            const rows=filtered.filter(item=>item.type===group.type);
            if(!rows.length)return null;
            return <section className={styles.group} key={group.type}>
              <h2>{group.label}</h2>
              <div className={styles.grid}>
                {rows.slice(0,12).map(item=><Link href={item.href} className={styles.card} key={`${item.type}-${item.id}`}>
                  {item.type==="person"?<VerifiedUserAvatar userId={item.id} name={item.title} src={item.imageUrl} country={item.country} className={styles.thumb} badgeSize={16} alt=""/>:<span className={styles.thumb}>{item.imageUrl?<img src={item.imageUrl} alt=""/>:<b>{item.title.slice(0,1).toUpperCase()}</b>}</span>}
                  <div><strong>{item.title}</strong><small>{item.subtitle||item.country}</small></div>
                  <span className={styles.arrow}>›</span>
                </Link>)}
              </div>
            </section>
          })}
        </div>
      ):submitted?<div className={styles.state}>{copy.empty}</div>:null}
    </section>
  </main>
}

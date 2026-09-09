'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/components/SiteProviders';
import { resolveCommerceMedia } from '@/components/commerce/commerceMedia';
import { listMyPartnerBusinesses, setActivePartnerBusiness, switchToUserMode, type PartnerBusinessAccess } from './partnerModeWeb';
import PartnerSettingsControls from './PartnerSettingsControls';
import ChatDrawer from '@/components/chat/ChatDrawer';
import { loadPartnerBusinessChatRooms } from '@/components/chat/chatData';
import styles from './PartnerMode.module.css';

type Props={access:PartnerBusinessAccess|null;onBusinessChanged?:(next:PartnerBusinessAccess)=>void;initialChatOpen?:boolean;};

const COPY={
  th:{switchStore:'แตะเพื่อสลับร้าน',owner:'เจ้าของร้าน',choose:'เลือกร้านค้าที่ต้องการจัดการ',chooseHint:'โหมด Partner จะจำร้านที่เลือกไว้จนกว่าคุณจะสลับเอง',user:'กลับโหมดผู้ใช้',home:'หน้าหลัก',customers:'รายการ',add:'เพิ่ม',chat:'แชท',store:'ร้านค้า',settings:'ตั้งค่า',editStore:'แก้ไขข้อมูลร้านค้า',payout:'Payment information',staff:'Staff and admins'},
  en:{switchStore:'Click to switch store',owner:'Owner',choose:'Choose a store to manage',chooseHint:'Partner Mode remembers your selected store until you switch it.',user:'User mode',home:'Home',customers:'Customers',add:'Add',chat:'Chat',store:'Store',settings:'Settings',editStore:'Edit store information',payout:'Payment information',staff:'Staff and admins'},
  de:{switchStore:'Store wechseln',owner:'Inhaber',choose:'Store auswählen',chooseHint:'Der Partner-Modus merkt sich den ausgewählten Store.',user:'Benutzermodus',home:'Start',customers:'Kunden',add:'Hinzufügen',chat:'Chat',store:'Store',settings:'Einstellungen',editStore:'Store-Daten bearbeiten',payout:'Payment information',staff:'Staff and admins'},
  zh:{switchStore:'点击切换店铺',owner:'店主',choose:'选择要管理的店铺',chooseHint:'合作伙伴模式会记住所选店铺。',user:'用户模式',home:'首页',customers:'客户',add:'添加',chat:'聊天',store:'店铺',settings:'设置',editStore:'编辑店铺信息',payout:'Payment information',staff:'Staff and admins'},
  ja:{switchStore:'タップして店舗を切替',owner:'オーナー',choose:'管理する店舗を選択',chooseHint:'Partner Modeは選択した店舗を記憶します。',user:'ユーザーモード',home:'ホーム',customers:'顧客',add:'追加',chat:'チャット',store:'店舗',settings:'設定',editStore:'店舗情報を編集',payout:'Payment information',staff:'Staff and admins'},
  ko:{switchStore:'눌러서 매장 전환',owner:'소유자',choose:'관리할 매장 선택',chooseHint:'파트너 모드는 선택한 매장을 기억합니다.',user:'사용자 모드',home:'홈',customers:'고객',add:'추가',chat:'채팅',store:'매장',settings:'설정',editStore:'매장 정보 수정',payout:'Payment information',staff:'Staff and admins'},
} as const;

function roleLabel(access:PartnerBusinessAccess|null,t:any){if(!access)return'Melo Partner';if(access.role==='owner')return t.owner;return access.role.toUpperCase();}

export default function PartnerModeHeader({access,onBusinessChanged,initialChatOpen=false}:Props){
  const {locale}=useLocale(); const t=COPY[locale]??COPY.en; const router=useRouter(); const pathname=usePathname();
  const [open,setOpen]=useState(false); const [settingsOpen,setSettingsOpen]=useState(false); const [chatOpen,setChatOpen]=useState(initialChatOpen); const [chatUnread,setChatUnread]=useState(0); const [items,setItems]=useState<PartnerBusinessAccess[]>([]); const [logos,setLogos]=useState<Record<string,string>>({}); const [activeLogo,setActiveLogo]=useState(''); const [busy,setBusy]=useState(false); const ref=useRef<HTMLDivElement>(null); const settingsRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{let alive=true;void resolveCommerceMedia({logo_storage_path:access?.logoStoragePath||''}).then(url=>{if(alive)setActiveLogo(url)});return()=>{alive=false}},[access?.businessId,access?.logoStoragePath]);
  useEffect(()=>{if(!open)return;let alive=true;void listMyPartnerBusinesses().then(async list=>{if(!alive)return;setItems(list);const pairs=await Promise.all(list.map(async x=>[x.businessId,await resolveCommerceMedia({logo_storage_path:x.logoStoragePath||''})] as const));if(!alive)return;setLogos(Object.fromEntries(pairs.filter(([,v])=>v)));});return()=>{alive=false}},[open]);
  useEffect(()=>{if(!open&&!settingsOpen)return;const h=(e:MouseEvent)=>{const node=e.target as Node;if(open&&ref.current&&!ref.current.contains(node))setOpen(false);if(settingsOpen&&settingsRef.current&&!settingsRef.current.contains(node))setSettingsOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[open,settingsOpen]);
  useEffect(()=>{setSettingsOpen(false)},[pathname]);
  useEffect(()=>{if(initialChatOpen)setChatOpen(true)},[initialChatOpen,access?.businessId]);
  useEffect(()=>{const openPartnerChat=()=>setChatOpen(true);window.addEventListener('melo-open-partner-chat',openPartnerChat as EventListener);return()=>window.removeEventListener('melo-open-partner-chat',openPartnerChat as EventListener)},[]);
  useEffect(()=>{
    const businessId=String(access?.businessId||'').trim(); if(!businessId){setChatUnread(0);return;} let alive=true;
    const refresh=async()=>{try{const rooms=await loadPartnerBusinessChatRooms(businessId);if(!alive)return;setChatUnread(rooms.reduce((sum,room)=>sum+Math.max(0,Number(room.unreadCount)||0),0));}catch{}};
    const onUnread=(event:Event)=>{const detail=(event as CustomEvent<{businessId?:string;total?:number}>).detail;if(String(detail?.businessId||'')!==businessId)return;setChatUnread(Math.max(0,Number(detail?.total)||0));};
    const onFocus=()=>void refresh(); const onVisibility=()=>{if(document.visibilityState==='visible')void refresh()}; void refresh(); const timer=window.setInterval(()=>void refresh(),30000);
    window.addEventListener('melo-partner-chat-unread-changed',onUnread as EventListener); window.addEventListener('melo-chat-unread-changed',onFocus as EventListener); window.addEventListener('focus',onFocus); document.addEventListener('visibilitychange',onVisibility);
    return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('melo-partner-chat-unread-changed',onUnread as EventListener);window.removeEventListener('melo-chat-unread-changed',onFocus as EventListener);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisibility)};
  },[access?.businessId]);
  async function choose(item:PartnerBusinessAccess){if(busy)return;setBusy(true);try{const next=await setActivePartnerBusiness(item.businessId);setOpen(false);setSettingsOpen(false);setChatOpen(false);onBusinessChanged?.(next);router.refresh();}finally{setBusy(false)}}
  async function userMode(){if(busy)return;setBusy(true);try{await switchToUserMode();router.replace('/profile');}finally{setBusy(false)}}
  const nav=useMemo(()=>[['/partner',t.home],['/partner/customers',t.customers],['/partner/services',t.add],['/partner/chat',t.chat],['/partner/store',t.store]] as const,[t]);
  const settingsActive=pathname.startsWith('/partner/settings')||pathname.startsWith('/partner/payout')||pathname.startsWith('/partner/staff')||pathname.startsWith('/partner/store/edit');
  return <>
    <header className={styles.partnerHeader}>
      <div className={styles.partnerHeaderInner}>
        <div className={styles.storeSwitcher} ref={ref}>
          <button type="button" className={styles.storeButton} onClick={()=>{setOpen(v=>!v);setSettingsOpen(false)}} aria-expanded={open}>
            <span className={styles.storeLogo}>{activeLogo?<img src={activeLogo} alt=""/>:<b>▣</b>}</span>
            <span className={styles.storeCopy}><strong>{access?.displayName||'Melo Partner'}</strong><small>{roleLabel(access,t)} · {t.switchStore}</small></span><span>⌄</span>
          </button>
          {open?<div className={styles.storeMenu}><h3>{t.choose}</h3><p>{t.chooseHint}</p><div className={styles.storeList}>{items.map(item=><button type="button" key={item.businessId} className={item.businessId===access?.businessId?styles.storeRowActive:styles.storeRow} onClick={()=>void choose(item)} disabled={busy}><span className={styles.storeRowLogo}>{logos[item.businessId]?<img src={logos[item.businessId]} alt=""/>:<b>▣</b>}</span><span><strong>{item.displayName}</strong><small>{item.role==='owner'?t.owner:item.role.toUpperCase()} · #{item.storeNo||1}</small></span>{item.businessId===access?.businessId?<em>✓</em>:null}</button>)}</div></div>:null}
        </div>
        <nav className={styles.partnerNav}>
          {nav.map(([href,label])=>href==='/partner/chat'?<button type="button" className={chatOpen||pathname===href?styles.partnerNavActive:''} key={href} onClick={()=>{setChatOpen(true);setSettingsOpen(false)}}><span>{label}</span>{chatUnread>0?<b className={styles.partnerChatBadge}>{chatUnread>99?'99+':chatUnread}</b>:null}</button>:<Link className={pathname===href?styles.partnerNavActive:''} href={href} key={href}>{label}</Link>)}
          <div className={styles.partnerSettingsMenuWrap} ref={settingsRef}>
            <button type="button" className={settingsOpen||settingsActive?styles.partnerNavActive:''} onClick={()=>{setSettingsOpen(v=>!v);setOpen(false)}} aria-expanded={settingsOpen}>{t.settings}<span className={styles.settingsChevron}>⌄</span></button>
            {settingsOpen?<div className={styles.partnerSettingsMenu}>
              {access?.isOwner?<Link href="/partner/store/edit" className={styles.partnerSettingsMenuItem}><strong>{t.editStore}</strong><b>›</b></Link>:null}
              <Link href="/partner/payout" className={styles.partnerSettingsMenuItem}><strong>{t.payout}</strong><b>›</b></Link>
              <Link href="/partner/staff" className={styles.partnerSettingsMenuItem}><strong>{t.staff}</strong><b>›</b></Link>
              <PartnerSettingsControls compact />
            </div>:null}
          </div>
        </nav>
        <button type="button" className={styles.userModeButton} onClick={()=>void userMode()} disabled={busy} title={t.user}>⇄</button>
      </div>
    </header>
    <ChatDrawer open={chatOpen&&Boolean(access?.businessId)} onClose={()=>setChatOpen(false)} partnerBusinessId={access?.businessId||''} />
  </>;
}

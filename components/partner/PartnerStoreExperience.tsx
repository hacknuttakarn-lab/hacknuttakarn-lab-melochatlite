'use client';

import { useCallback, useEffect, useState } from 'react';
import { CommerceDetailExperience } from '@/components/commerce/CommerceDetailExperience';
import PartnerModeHeader from './PartnerModeHeader';
import { getActivePartnerBusiness, type PartnerBusinessAccess } from './partnerModeWeb';
import styles from './PartnerMode.module.css';

export default function PartnerStoreExperience(){
  const [access,setAccess]=useState<PartnerBusinessAccess|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{setAccess(await getActivePartnerBusiness());}
    catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  if(loading)return <main className={styles.partnerPage}><div className={styles.loading}>Loading Partner Mode…</div></main>;

  return <main className={styles.partnerPage}>
    <PartnerModeHeader access={access} onBusinessChanged={next=>setAccess(next)}/>
    {error?<section className={styles.partnerShell}><div className={styles.notice}>{error}</div></section>:null}
    {!error&&!access?<section className={styles.partnerShell}><div className={styles.panel}><div className={styles.empty}>No Partner store access</div></div></section>:null}
    {!error&&access?<div className={styles.partnerStorePreview}><CommerceDetailExperience mode="partner" id={access.businessId} embedded/></div>:null}
  </main>;
}

'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { createSignedStorageUrl, getCurrentUser, rpcRequest, uploadStorageObject } from '@/lib/supabase/browser';
import styles from './VerifyExperience.module.css';

type Row = Record<string, any>;
type FileKind = 'identity' | 'selfie';

const COPY = {
  th: {
    eyebrow: 'ความปลอดภัยของบัญชี', title: 'ยืนยันตัวตน', subtitle: 'ส่งข้อมูลและเอกสารเพื่อให้ทีม Melo ตรวจสอบตัวตนของคุณ',
    status: 'สถานะการตรวจสอบ', notSubmitted: 'ยังไม่ได้ส่ง', pending: 'รอตรวจสอบ', approved: 'ยืนยันแล้ว', rejected: 'ต้องแก้ไข',
    details: 'ข้อมูลบนเอกสาร', first: 'ชื่อจริง (ภาษาอังกฤษ)', last: 'นามสกุล (ภาษาอังกฤษ)', type: 'ประเภทเอกสาร', number: 'เลขที่เอกสาร',
    idCard: 'บัตรประจำตัวประชาชน', passport: 'หนังสือเดินทาง', driver: 'ใบขับขี่', document: 'เอกสารยืนยันตัวตน', selfie: 'ภาพเซลฟี่',
    docHint: 'อัปโหลดภาพเอกสารที่ชัดเจน เห็นข้อมูลครบถ้วน', selfieHint: 'อัปโหลดภาพใบหน้าปัจจุบันที่เห็นใบหน้าชัดเจน', choose: 'เลือกไฟล์', replace: 'เปลี่ยนไฟล์',
    privacy: 'เอกสารจะถูกเก็บในพื้นที่ Private Storage และใช้สำหรับการตรวจสอบตัวตนเท่านั้น', submit: 'ส่งเพื่อตรวจสอบ', submitting: 'กำลังส่ง…',
    login: 'กรุณาเข้าสู่ระบบก่อนยืนยันตัวตน', required: 'กรุณากรอกข้อมูลและแนบเอกสารให้ครบ', success: 'ส่งข้อมูลยืนยันตัวตนเรียบร้อยแล้ว',
    notes: 'หมายเหตุจากผู้ตรวจสอบ', retry: 'คุณสามารถแก้ไขข้อมูลหรือเอกสารแล้วส่งใหม่ได้', loadError: 'ไม่สามารถโหลดสถานะการยืนยันตัวตนได้', fileError: 'รองรับไฟล์ JPG, PNG, WEBP หรือ PDF ขนาดไม่เกิน 10 MB',
  },
  en: {
    eyebrow: 'Account security', title: 'Verify identity', subtitle: 'Submit your details and documents for identity review by the Melo team.',
    status: 'Verification status', notSubmitted: 'Not submitted', pending: 'Pending review', approved: 'Verified', rejected: 'Needs changes',
    details: 'Document details', first: 'Legal first name (English)', last: 'Legal last name (English)', type: 'Document type', number: 'Document number',
    idCard: 'National ID card', passport: 'Passport', driver: 'Driver license', document: 'Identity document', selfie: 'Selfie photo',
    docHint: 'Upload a clear image showing the complete document information.', selfieHint: 'Upload a recent photo with your face clearly visible.', choose: 'Choose file', replace: 'Replace file',
    privacy: 'Documents are stored in Private Storage and used only for identity verification.', submit: 'Submit for review', submitting: 'Submitting…',
    login: 'Please sign in before verifying your identity.', required: 'Complete all fields and attach both required files.', success: 'Your verification request has been submitted.',
    notes: 'Reviewer notes', retry: 'You can update the details or documents and submit again.', loadError: 'Unable to load verification status.', fileError: 'JPG, PNG, WEBP or PDF files up to 10 MB are supported.',
  },
  de: {
    eyebrow: 'Kontosicherheit', title: 'Identität bestätigen', subtitle: 'Sende deine Daten und Dokumente zur Identitätsprüfung durch das Melo-Team.',
    status: 'Prüfstatus', notSubmitted: 'Nicht eingereicht', pending: 'Wird geprüft', approved: 'Bestätigt', rejected: 'Änderung erforderlich',
    details: 'Dokumentdaten', first: 'Vorname laut Dokument (Englisch)', last: 'Nachname laut Dokument (Englisch)', type: 'Dokumenttyp', number: 'Dokumentnummer',
    idCard: 'Personalausweis', passport: 'Reisepass', driver: 'Führerschein', document: 'Identitätsdokument', selfie: 'Selfie-Foto',
    docHint: 'Lade ein gut lesbares Bild mit allen Dokumentdaten hoch.', selfieHint: 'Lade ein aktuelles Foto hoch, auf dem dein Gesicht klar sichtbar ist.', choose: 'Datei auswählen', replace: 'Datei ersetzen',
    privacy: 'Dokumente werden im privaten Speicher abgelegt und nur zur Identitätsprüfung verwendet.', submit: 'Zur Prüfung senden', submitting: 'Wird gesendet…',
    login: 'Bitte melde dich an, bevor du deine Identität bestätigst.', required: 'Fülle alle Felder aus und füge beide erforderlichen Dateien hinzu.', success: 'Deine Verifizierungsanfrage wurde gesendet.',
    notes: 'Hinweise der Prüfung', retry: 'Du kannst Daten oder Dokumente ändern und erneut senden.', loadError: 'Der Verifizierungsstatus konnte nicht geladen werden.', fileError: 'Unterstützt werden JPG, PNG, WEBP oder PDF bis 10 MB.',
  },
} as const;

function firstRow(value: unknown): Row | null {
  if (Array.isArray(value)) return (value[0] as Row) || null;
  return value && typeof value === 'object' ? value as Row : null;
}

function statusKey(value: unknown) {
  const status = String(value || '').toLowerCase();
  if (status === 'approved') return 'approved';
  if (status === 'rejected' || status === 'changes_requested') return 'rejected';
  if (status === 'pending' || status === 'submitted' || status === 'under_review') return 'pending';
  return 'notSubmitted';
}

function safeExt(file: File) {
  const byName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (byName && ['jpg','jpeg','png','webp','pdf'].includes(byName)) return byName;
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export default function VerifyExperience() {
  const { locale } = useLocale();
  const t = COPY[locale === 'de' ? 'de' : locale === 'th' ? 'th' : 'en'];
  const [userId, setUserId] = useState('');
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ legalFirstNameEn: '', legalLastNameEn: '', documentType: 'national_id', documentNumber: '' });
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<Record<FileKind, File | null>>({ identity: null, selfie: null });
  const [existingUrls, setExistingUrls] = useState<Record<FileKind, string>>({ identity: '', selfie: '' });

  async function load() {
    setLoading(true); setError('');
    const user = await getCurrentUser();
    if (!user?.id) { setUserId(''); setLoading(false); return; }
    setUserId(user.id);
    const result = await rpcRequest<Row[] | Row>('get_my_verification', {});
    if (result.error) setError(t.loadError);
    const current = firstRow(result.data);
    setRow(current);
    if (current) {
      const [identitySigned, selfieSigned] = await Promise.all([
        current.identity_document_path ? createSignedStorageUrl('verification-private', String(current.identity_document_path), 1800) : Promise.resolve({ data: null, error: null }),
        current.selfie_path ? createSignedStorageUrl('verification-private', String(current.selfie_path), 1800) : Promise.resolve({ data: null, error: null }),
      ]);
      setExistingUrls({ identity: identitySigned.data || '', selfie: selfieSigned.data || '' });
    } else setExistingUrls({ identity: '', selfie: '' });
    if (current) setForm({
      legalFirstNameEn: String(current.legal_first_name_en || ''),
      legalLastNameEn: String(current.legal_last_name_en || ''),
      documentType: String(current.document_type || 'national_id'),
      documentNumber: String(current.document_number || ''),
    });
    setLoading(false);
  }

  useEffect(() => { void load(); }, [locale]);
  const previewUrls = useMemo(() => ({
    identity: files.identity ? URL.createObjectURL(files.identity) : existingUrls.identity,
    selfie: files.selfie ? URL.createObjectURL(files.selfie) : existingUrls.selfie,
  }), [files.identity, files.selfie, existingUrls.identity, existingUrls.selfie]);
  useEffect(() => () => {
    if (files.identity && previewUrls.identity) URL.revokeObjectURL(previewUrls.identity);
    if (files.selfie && previewUrls.selfie) URL.revokeObjectURL(previewUrls.selfie);
  }, [previewUrls.identity, previewUrls.selfie]);
  useEffect(() => { const close=(e:MouseEvent)=>{ if(typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false); }; document.addEventListener('mousedown',close); return()=>document.removeEventListener('mousedown',close); }, []);

  const currentStatus = statusKey(row?.status || row?.identity_status);
  const statusText = t[currentStatus];
  const locked = currentStatus === 'approved';
  const hasExistingIdentity = Boolean(row?.identity_document_path);
  const hasExistingSelfie = Boolean(row?.selfie_path);
  const ready = form.legalFirstNameEn.trim() && form.legalLastNameEn.trim() && form.documentNumber.trim() && (files.identity || hasExistingIdentity) && (files.selfie || hasExistingSelfie);

  function selectFile(kind: FileKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setError(''); setMessage('');
    if (!file) return;
    const validType = ['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type);
    if (!validType || file.size > 10 * 1024 * 1024) { setError(t.fileError); event.target.value = ''; return; }
    setFiles((old) => ({ ...old, [kind]: file }));
  }

  async function upload(kind: FileKind, file: File) {
    const path = `${userId}/${kind}-${Date.now()}.${safeExt(file)}`;
    const result = await uploadStorageObject('verification-private', path, file, file.type);
    if (result.error || !result.data?.path) throw new Error(result.error || 'Upload failed');
    return result.data.path;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!userId || locked || busy) return;
    setError(''); setMessage('');
    if (!ready) { setError(t.required); return; }
    setBusy(true);
    try {
      const identityPath = files.identity ? await upload('identity', files.identity) : String(row?.identity_document_path || '');
      const selfiePath = files.selfie ? await upload('selfie', files.selfie) : String(row?.selfie_path || '');
      const result = await rpcRequest<Row[] | Row>('submit_verification_request', {
        p_legal_first_name_en: form.legalFirstNameEn.trim(),
        p_legal_last_name_en: form.legalLastNameEn.trim(),
        p_document_type: form.documentType,
        p_document_number: form.documentNumber.trim(),
        p_identity_document_path: identityPath,
        p_selfie_path: selfiePath,
      });
      if (result.error) throw new Error(result.error);
      setFiles({ identity: null, selfie: null });
      setMessage(t.success);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.loadError);
    } finally { setBusy(false); }
  }

  const docOptions = useMemo(() => [
    ['national_id', t.idCard], ['passport', t.passport], ['driver_license', t.driver],
  ], [t]);

  return <main className={styles.page}>
    <Header />
    <section className={styles.shell}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>✓ {t.eyebrow}</span>
        <h1>{t.title}</h1><p>{t.subtitle}</p>
      </div>
      {loading ? <div className={styles.state}>…</div> : !userId ? <div className={styles.state}>{t.login}</div> : <form className={styles.grid} onSubmit={submit}>
        <aside className={styles.statusCard}>
          <div className={`${styles.statusIcon} ${styles[currentStatus]}`}>✓</div>
          <small>{t.status}</small><strong>{statusText}</strong>
          {row?.reviewer_notes ? <div className={styles.reviewNote}><b>{t.notes}</b><p>{String(row.reviewer_notes)}</p></div> : null}
          {currentStatus === 'rejected' ? <p className={styles.retry}>{t.retry}</p> : null}
        </aside>
        <div className={styles.formCard}>
          <h2>{t.details}</h2>
          <div className={styles.fields}>
            <label><span>{t.first}</span><input value={form.legalFirstNameEn} disabled={locked} onChange={(e)=>setForm(v=>({...v,legalFirstNameEn:e.target.value}))}/></label>
            <label><span>{t.last}</span><input value={form.legalLastNameEn} disabled={locked} onChange={(e)=>setForm(v=>({...v,legalLastNameEn:e.target.value}))}/></label>
            <label><span>{t.type}</span><div ref={typeRef} className={styles.selectWrap}><button type="button" className={styles.selectButton} disabled={locked} onClick={()=>setTypeOpen(v=>!v)}><b>{docOptions.find(([v])=>v===form.documentType)?.[1] || t.idCard}</b><i>{typeOpen?'⌃':'⌄'}</i></button>{typeOpen&&!locked?<div className={styles.selectMenu}>{docOptions.map(([value,label])=><button type="button" key={value} data-selected={value===form.documentType} onClick={()=>{setForm(v=>({...v,documentType:value}));setTypeOpen(false)}}><span>{label}</span>{value===form.documentType?<b>✓</b>:null}</button>)}</div>:null}</div></label>
            <label><span>{t.number}</span><input value={form.documentNumber} disabled={locked} onChange={(e)=>setForm(v=>({...v,documentNumber:e.target.value}))}/></label>
          </div>
          <div className={styles.uploadGrid}>
            {(['identity','selfie'] as FileKind[]).map((kind) => {
              const selected = files[kind]; const existing = kind === 'identity' ? hasExistingIdentity : hasExistingSelfie;
              return <label key={kind} className={styles.uploadCard}>
                <div className={styles.uploadIcon}>{kind === 'identity' ? '▣' : '◉'}</div>
                <div><strong>{kind === 'identity' ? t.document : t.selfie}</strong><p>{kind === 'identity' ? t.docHint : t.selfieHint}</p></div>
                {previewUrls[kind] ? (selected?.type === 'application/pdf' || (!selected && /\.pdf(?:\?|$)/i.test(previewUrls[kind])) ? <iframe className={styles.filePreview} src={previewUrls[kind]} title={kind === 'identity' ? t.document : t.selfie}/> : <img className={styles.filePreview} src={previewUrls[kind]} alt={kind === 'identity' ? t.document : t.selfie}/>) : null}
                <span className={styles.fileName}>{selected?.name || (existing ? '✓ ' + statusText : '')}</span>
                {!locked ? <><span className={styles.chooseButton}>{selected || existing ? t.replace : t.choose}</span><input className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e)=>selectFile(kind,e)}/></> : null}
              </label>;
            })}
          </div>
          <div className={styles.privacy}>🔒 {t.privacy}</div>
          {error ? <div className={styles.error}>{error}</div> : null}{message ? <div className={styles.success}>{message}</div> : null}
          {!locked ? <button className={styles.submit} disabled={busy || !ready}>{busy ? t.submitting : t.submit}</button> : null}
        </div>
      </form>}
    </section>
  </main>;
}

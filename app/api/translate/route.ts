import { NextRequest, NextResponse } from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const GOOGLE_TRANSLATE_URL='https://translation.googleapis.com/language/translate/v2';
const ALLOWED_LANGUAGES=new Set(['th','en','de','zh','ja','ko']);

function normalizeLanguage(value:unknown){const raw=String(value??'').trim().toLowerCase().replace('_','-');const base=raw.split('-')[0];return ALLOWED_LANGUAGES.has(base)?base:''}

async function rpc<T>(request:NextRequest,name:string,body:Record<string,unknown>={}){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,'');
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization=request.headers.get('authorization')||'';
  if(!url||!key||!authorization)return {data:null as T|null,error:'AUTH_REQUIRED'};
  const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  if(!response.ok){let message=`HTTP ${response.status}`;try{const p=await response.json();message=String(p?.message||p?.error||message)}catch{}return {data:null as T|null,error:message}}
  return {data:await response.json() as T,error:null as string|null};
}

export async function POST(request:NextRequest){
 try{
  const apiKey=process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY?.trim();
  if(!apiKey)return NextResponse.json({error:'TRANSLATION_NOT_CONFIGURED'},{status:503});
  const body=await request.json();
  const text=typeof body?.text==='string'?body.text.trim():'';
  const target=normalizeLanguage(body?.target);
  const supportScope=body?.scope==='support';
  if(!text)return NextResponse.json({translatedText:'',detectedSourceLanguage:'',skipped:true});
  if(!target)return NextResponse.json({error:'INVALID_TARGET_LANGUAGE'},{status:400});
  if(text.length>5000)return NextResponse.json({error:'TEXT_TOO_LONG'},{status:400});

  const usage=await rpc<Record<string,unknown>>(request,'melo_get_my_plan_usage_v25');
  if(usage.error||!usage.data)return NextResponse.json({error:'AUTH_REQUIRED'},{status:401});
  const admin=usage.data.is_admin===true;
  if(!supportScope&&!admin&&usage.data.can_use_translation!==true)return NextResponse.json({error:'PLAN_UPGRADE_REQUIRED'},{status:403});
  const totalLimit=Number(usage.data.translation_total_limit||0), totalUsed=Number(usage.data.translation_total_used||0);
  if(!supportScope&&!admin&&totalLimit-totalUsed<text.length)return NextResponse.json({error:'TRANSLATION_QUOTA_EXCEEDED'},{status:402});

  const cached=await rpc<Array<{translated_text:string;original_language:string|null;translation_character_count:number}>>(request,'melo_get_cached_translation_v25',{p_original:text,p_target:target});
  const cacheRow=Array.isArray(cached.data)?cached.data[0]:undefined;
  if(cacheRow?.translated_text)return NextResponse.json({translatedText:cacheRow.translated_text,detectedSourceLanguage:normalizeLanguage(cacheRow.original_language),skipped:false,cached:true});

  const response=await fetch(GOOGLE_TRANSLATE_URL,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8','X-Goog-Api-Key':apiKey},body:JSON.stringify({q:text,target,format:'text'}),cache:'no-store'});
  const payload=await response.json();
  if(!response.ok){console.error('[Melo Translation] Google API error',response.status,payload?.error?.message??'Unknown translation error');return NextResponse.json({error:'TRANSLATION_FAILED'},{status:response.status>=400&&response.status<500?response.status:502})}
  const result=payload?.data?.translations?.[0];
  const translatedText=typeof result?.translatedText==='string'?result.translatedText:text;
  const detectedSourceLanguage=normalizeLanguage(result?.detectedSourceLanguage);
  if(detectedSourceLanguage&&detectedSourceLanguage===target)return NextResponse.json({translatedText:text,detectedSourceLanguage,skipped:true});

  if(!supportScope&&!admin){
    const recorded=await rpc<Record<string,unknown>>(request,'melo_record_translation_v25',{p_original:text,p_original_language:detectedSourceLanguage||null,p_translated:translatedText,p_target:target,p_provider:'google'});
    if(recorded.error){const quota=recorded.error.includes('PLAN_QUOTA_EXCEEDED');return NextResponse.json({error:quota?'TRANSLATION_QUOTA_EXCEEDED':'TRANSLATION_USAGE_FAILED'},{status:quota?402:500})}
  }
  return NextResponse.json({translatedText,detectedSourceLanguage,skipped:false,cached:false});
 }catch(error){console.error('[Melo Translation] route error',error);return NextResponse.json({error:'TRANSLATION_FAILED'},{status:500})}
}

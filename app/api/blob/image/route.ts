import { del, put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
const ALLOWED_BUCKETS=new Set(['profile-photos','social-posts']);
const MAX_BYTES=12*1024*1024;

type User={id:string};

async function currentUser(request:NextRequest):Promise<User|null>{
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer ')||!SUPABASE_URL||!SUPABASE_KEY)return null;
  const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_KEY,Authorization:authorization},cache:'no-store'}).catch(()=>null);
  if(!response?.ok)return null;
  const user=await response.json().catch(()=>null);
  return user?.id?{id:String(user.id)}:null;
}

async function isSupportAdmin(request:NextRequest,userId:string){
  const authorization=request.headers.get('authorization')||'';
  const response=await fetch(`${SUPABASE_URL}/rest/v1/admin_users?select=user_id,role,is_active,permissions&user_id=eq.${encodeURIComponent(userId)}&limit=1`,{
    headers:{apikey:SUPABASE_KEY,Authorization:authorization},cache:'no-store'
  }).catch(()=>null);
  if(!response?.ok)return false;
  const rows=await response.json().catch(()=>[]);
  const row=Array.isArray(rows)?rows[0]:null;
  if(!row||row.is_active===false)return false;
  return row.role==='super_admin'||row.role==='admin'||row.permissions?.support_chat_view===true||row.permissions?.support_chat_manage===true;
}

function safePath(value:string){
  return value.replace(/^\/+|\\/g,'').split('/').filter(Boolean).map(part=>part.replace(/[^a-zA-Z0-9._-]/g,'_')).join('/');
}

export async function POST(request:NextRequest){
  const user=await currentUser(request);
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const form=await request.formData();
  const bucket=String(form.get('bucket')||'').trim();
  const rawPath=String(form.get('path')||'').trim();
  const file=form.get('file');
  if(!ALLOWED_BUCKETS.has(bucket))return NextResponse.json({error:'Unsupported image bucket.'},{status:400});
  if(!(file instanceof File))return NextResponse.json({error:'Image file is required.'},{status:400});
  if(!file.type.startsWith('image/'))return NextResponse.json({error:'Only image uploads are allowed.'},{status:400});
  if(file.size>MAX_BYTES)return NextResponse.json({error:'Image must be 12 MB or smaller.'},{status:413});
  const path=safePath(rawPath);
  if(!path)return NextResponse.json({error:'Image path is required.'},{status:400});
  if(!path.startsWith(`${user.id}/`)){
    return NextResponse.json({error:'Image path does not belong to the signed-in user.'},{status:403});
  }
  try{
    const token=(process.env.BLOB_READ_WRITE_TOKEN||'').trim();
    const oidcToken=(process.env.VERCEL_OIDC_TOKEN||'').trim();
    const storeId=(process.env.BLOB_STORE_ID||'').trim();
    const credentials:Record<string,string>={};
    if(token && token !== '[SENSITIVE]') credentials.token=token;
    else if(oidcToken && storeId){credentials.oidcToken=oidcToken;credentials.storeId=storeId;}
    const blob=await put(`${bucket}/${path}`,file,{access:'public',contentType:file.type,addRandomSuffix:true,cacheControlMaxAge:31536000,...credentials} as any);
    return NextResponse.json({url:blob.url,pathname:blob.pathname,contentType:blob.contentType});
  }catch(cause){
    return NextResponse.json({error:cause instanceof Error?cause.message:'Blob upload failed.'},{status:500});
  }
}

export async function DELETE(request:NextRequest){
  const user=await currentUser(request);
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const payload=await request.json().catch(()=>({}));
  const url=String(payload?.url||'').trim();
  if(!/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//i.test(url))return NextResponse.json({error:'Invalid Blob URL.'},{status:400});
  try{
    const token=(process.env.BLOB_READ_WRITE_TOKEN||'').trim();
    const oidcToken=(process.env.VERCEL_OIDC_TOKEN||'').trim();
    const storeId=(process.env.BLOB_STORE_ID||'').trim();
    const credentials:Record<string,string>={};
    if(token && token !== '[SENSITIVE]') credentials.token=token;
    else if(oidcToken && storeId){credentials.oidcToken=oidcToken;credentials.storeId=storeId;}
    await del(url,credentials as any);return NextResponse.json({ok:true});}
  catch(cause){return NextResponse.json({error:cause instanceof Error?cause.message:'Blob delete failed.'},{status:500});}
}

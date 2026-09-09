"use client";

import { getCurrentUser, getStoredSession, publicStorageUrl, rpcRequest } from "@/lib/supabase/browser";

type Row=Record<string,unknown>;
function rows(v:unknown):Row[]{return Array.isArray(v)?v.filter((x):x is Row=>Boolean(x)&&typeof x==="object"):v&&typeof v==="object"?[v as Row]:[]}
function str(r:Row,k:string,f=""){const v=r[k];return v==null?f:String(v)}
function num(r:Row,k:string){const n=Number(r[k]??0);return Number.isFinite(n)?n:0}
function bool(r:Row,k:string){const v=r[k];return v===true||v==="true"||v===1||v==="1"}
async function rpc<T=unknown>(name:string,params:Record<string,unknown>){const result=await rpcRequest<T>(name,params);if(result.error)throw new Error(result.error);return result.data}

export type ExpenseMember={userId:string;name:string;photoUrl:string;role:string;isMe:boolean};
export type ExpenseItem={id:string;createdBy:string;paidBy:string;payerName:string;title:string;amount:number;currency:string;date:string;notes:string;participants:number;myShare:number;canDelete:boolean;createdAt:string};
export type BalanceItem={userId:string;name:string;currency:string;paid:number;owed:number;sent:number;received:number;net:number;isMe:boolean};
export type SettlementItem={id:string;fromId:string;fromName:string;toId:string;toName:string;amount:number;currency:string;note:string;canDelete:boolean;createdAt:string};
export async function loadTripExpenses(tripId:string){
  const [m,e,b,s]=await Promise.all([rpc<Row[]>("get_trip_shared_members",{p_trip_id:tripId}),rpc<Row[]>("get_trip_expenses",{p_trip_id:tripId}),rpc<Row[]>("get_trip_expense_balances",{p_trip_id:tripId}),rpc<Row[]>("get_trip_expense_settlements",{p_trip_id:tripId})]);
  return {members:rows(m).map(r=>({userId:str(r,"user_id"),name:str(r,"display_name","Melo member"),photoUrl:publicStorageUrl("profile-photos",str(r,"photo_path")),role:str(r,"role"),isMe:bool(r,"is_me")})),expenses:rows(e).map(r=>({id:str(r,"id"),createdBy:str(r,"created_by"),paidBy:str(r,"paid_by"),payerName:str(r,"payer_name"),title:str(r,"title"),amount:num(r,"amount"),currency:str(r,"currency","THB"),date:str(r,"expense_date"),notes:str(r,"notes"),participants:num(r,"participant_count"),myShare:num(r,"my_share"),canDelete:bool(r,"can_delete"),createdAt:str(r,"created_at")})),balances:rows(b).map(r=>({userId:str(r,"user_id"),name:str(r,"display_name","Melo member"),currency:str(r,"currency","THB"),paid:num(r,"paid_total"),owed:num(r,"owed_total"),sent:num(r,"sent_settlements"),received:num(r,"received_settlements"),net:num(r,"net_balance"),isMe:bool(r,"is_me")})),settlements:rows(s).map(r=>({id:str(r,"id"),fromId:str(r,"from_user_id"),fromName:str(r,"from_name"),toId:str(r,"to_user_id"),toName:str(r,"to_name"),amount:num(r,"amount"),currency:str(r,"currency","THB"),note:str(r,"note"),canDelete:bool(r,"can_delete"),createdAt:str(r,"created_at")}))};
}
export async function createExpense(input:{tripId:string;title:string;amount:number;currency:string;participants:string[];date:string;notes:string}){await rpc("create_trip_expense",{p_trip_id:input.tripId,p_title:input.title.trim(),p_amount:input.amount,p_currency:input.currency,p_participant_ids:input.participants,p_expense_date:input.date,p_notes:input.notes.trim()||null})}
export async function deleteExpense(id:string){await rpc("delete_trip_expense",{p_expense_id:id})}
export async function recordSettlement(input:{tripId:string;toUserId:string;amount:number;currency:string;note:string}){await rpc("record_trip_expense_settlement",{p_trip_id:input.tripId,p_to_user_id:input.toUserId,p_amount:input.amount,p_currency:input.currency,p_note:input.note.trim()||null})}
export async function deleteSettlement(id:string){await rpc("delete_trip_expense_settlement",{p_settlement_id:id})}

export type AlbumItem={id:string;uploaderId:string;uploaderName:string;storagePath:string;caption:string;takenAt:string;createdAt:string;canDelete:boolean;signedUrl:string};
const supabaseUrl=(process.env.NEXT_PUBLIC_SUPABASE_URL??"").replace(/\/$/,"");
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"";
function authHeaders(contentType="application/json"){const session=getStoredSession();return {apikey:anonKey,Authorization:`Bearer ${session?.access_token??anonKey}`,"Content-Type":contentType}}
async function signedUrl(path:string){if(!path||!supabaseUrl)return"";const response=await fetch(`${supabaseUrl}/storage/v1/object/sign/trip-albums/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"POST",headers:authHeaders(),body:JSON.stringify({expiresIn:3600})});if(!response.ok)return"";const data=await response.json();const signed=String(data?.signedURL??data?.signedUrl??"");return signed?`${supabaseUrl}/storage/v1${signed.startsWith("/")?signed:`/${signed}`}`:""}
export async function loadAlbum(tripId:string):Promise<AlbumItem[]>{const data=await rpc<Row[]>("get_trip_album_items",{p_trip_id:tripId});return Promise.all(rows(data).map(async r=>({id:str(r,"id"),uploaderId:str(r,"uploader_id"),uploaderName:str(r,"uploader_name","Melo member"),storagePath:str(r,"storage_path"),caption:str(r,"caption"),takenAt:str(r,"taken_at"),createdAt:str(r,"created_at"),canDelete:bool(r,"can_delete"),signedUrl:await signedUrl(str(r,"storage_path"))})))}
export async function uploadAlbum(tripId:string,file:File,caption:string){const user=await getCurrentUser();if(!user?.id)throw new Error("Please sign in");if(!file.type.startsWith("image/"))throw new Error("Image file required");if(file.size>12*1024*1024)throw new Error("Image is too large (max 12 MB)");const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase()||"jpg";const path=`${tripId}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,10)}.${ext}`;const response=await fetch(`${supabaseUrl}/storage/v1/object/trip-albums/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"POST",headers:{...authHeaders(file.type),"x-upsert":"false"},body:file});if(!response.ok)throw new Error(await response.text());try{await rpc("create_trip_album_item",{p_trip_id:tripId,p_storage_path:path,p_caption:caption.trim()||null,p_taken_at:null})}catch(e){await removeStorage(path).catch(()=>{});throw e}}
async function removeStorage(path:string){await fetch(`${supabaseUrl}/storage/v1/object/trip-albums`,{method:"DELETE",headers:authHeaders(),body:JSON.stringify({prefixes:[path]})})}
export async function deleteAlbum(item:AlbumItem){const data=await rpc<string>("delete_trip_album_item",{p_item_id:item.id});await removeStorage(typeof data==="string"&&data?data:item.storagePath)}

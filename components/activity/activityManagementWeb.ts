"use client";

import { getCurrentUser, publicStorageUrl, restSelect, rpcRequest } from "@/lib/supabase/browser";

export type ActivityType = "trip" | "event" | "community";
export type ActivityRole = "owner" | "co_host" | "moderator" | "member";
export type ActivityLifecycle = "upcoming" | "ongoing" | "completed" | "cancelled" | "active" | "archived";

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((item): item is Row => Boolean(item) && typeof item === "object");
  if (value && typeof value === "object") return [value as Row];
  return [];
}
function str(row: Row | null | undefined, key: string, fallback = "") { const value = row?.[key]; return value == null ? fallback : String(value); }
function bool(row: Row | null | undefined, key: string) { const value = row?.[key]; return value === true || value === "true" || value === 1 || value === "1"; }
function num(row: Row | null | undefined, key: string) { const value = Number(row?.[key] ?? 0); return Number.isFinite(value) ? value : 0; }
function photo(path: string) { return path ? publicStorageUrl("profile-photos", path) : ""; }
async function ensure(result: { error: string | null }) { if (result.error) throw new Error(result.error); }

export type ManagementState = {
  type: ActivityType; id: string; title: string; isOwner: boolean; role: ActivityRole; membershipOpen: boolean;
  lifecycle: ActivityLifecycle; archivedAt: string | null; memberCount: number;
  canManage: boolean; canEdit: boolean; canMembers: boolean; canAttendance: boolean; canReminders: boolean; canExpenses: boolean; canSafety: boolean; canAudit: boolean; canRoles: boolean; canTransfer: boolean;
};

export async function loadManagementState(type: ActivityType, id: string): Promise<ManagementState> {
  const result = await rpcRequest<Row | Row[]>("get_phase27_activity_management_state", { p_activity_type: type, p_activity_id: id });
  if (result.error) throw new Error(result.error);
  const row = rows(result.data)[0];
  if (!row) throw new Error("Activity not found");
  const isOwner = bool(row, "is_owner");
  const permissions = ["can_edit_details","can_manage_members","can_manage_attendance","can_manage_reminders","can_manage_expenses","can_manage_safety","can_view_audit"].some((key) => bool(row, key));
  return {
    type, id, title: str(row, "title"), isOwner, role: str(row, "current_role", isOwner ? "owner" : "member") as ActivityRole,
    membershipOpen: bool(row, "membership_open"), lifecycle: str(row, "lifecycle_status", type === "community" ? "active" : "upcoming") as ActivityLifecycle,
    archivedAt: str(row, "archived_at") || null, memberCount: num(row, "member_count"), canManage: isOwner || permissions,
    canEdit: bool(row, "can_edit_details"), canMembers: bool(row, "can_manage_members"), canAttendance: bool(row, "can_manage_attendance"),
    canReminders: bool(row, "can_manage_reminders"), canExpenses: bool(row, "can_manage_expenses"), canSafety: bool(row, "can_manage_safety"), canAudit: bool(row, "can_view_audit"),
    canRoles: bool(row, "can_manage_roles"), canTransfer: bool(row, "can_transfer_ownership"),
  };
}

export async function setMembership(type: ActivityType, id: string, open: boolean) {
  const result = await rpcRequest("set_phase27_activity_membership_open", { p_activity_type: type, p_activity_id: id, p_open: open }); await ensure(result);
}
export async function setLifecycle(type: ActivityType, id: string, status: ActivityLifecycle) {
  const result = await rpcRequest("set_phase27_activity_lifecycle", { p_activity_type: type, p_activity_id: id, p_status: status }); await ensure(result);
}
export async function archiveActivity(type: ActivityType, id: string) {
  const result = await rpcRequest("archive_phase27_activity", { p_activity_type: type, p_activity_id: id }); await ensure(result);
}

export type TeamMember = { userId: string; name: string; photoUrl: string; language: string; role: ActivityRole; isOwner: boolean; isMe: boolean; permissions: Record<string, boolean> };
export async function loadTeam(type: ActivityType, id: string): Promise<TeamMember[]> {
  const result = await rpcRequest<Row[]>("get_phase27_activity_team", { p_activity_type: type, p_activity_id: id }); if (result.error) throw new Error(result.error);
  return rows(result.data).map((row) => ({
    userId: str(row,"user_id"), name: str(row,"display_name","Melo member"), photoUrl: photo(str(row,"photo_path")), language: str(row,"primary_language","en"),
    role: str(row,"role",bool(row,"is_owner")?"owner":"member") as ActivityRole, isOwner: bool(row,"is_owner"), isMe: bool(row,"is_me"),
    permissions: { edit: bool(row,"can_edit_details"), members: bool(row,"can_manage_members"), attendance: bool(row,"can_manage_attendance"), reminders: bool(row,"can_manage_reminders"), expenses: bool(row,"can_manage_expenses"), safety: bool(row,"can_manage_safety"), audit: bool(row,"can_view_audit") },
  })).filter((item) => item.userId);
}
export async function removeMember(type: ActivityType, id: string, userId: string) { const result=await rpcRequest("remove_phase27_activity_member",{p_activity_type:type,p_activity_id:id,p_user_id:userId}); await ensure(result); }
export async function setTeamRole(type: ActivityType,id:string,userId:string,role:"co_host"|"moderator") {
  const cohost = role === "co_host";
  const result=await rpcRequest("set_phase27_activity_role",{p_activity_type:type,p_activity_id:id,p_user_id:userId,p_role:role,p_permissions:{edit_details:cohost,manage_members:true,manage_attendance:true,manage_reminders:cohost,manage_expenses:cohost,manage_safety:true,view_audit:true}}); await ensure(result);
}
export async function clearTeamRole(type: ActivityType,id:string,userId:string){const result=await rpcRequest("remove_phase27_activity_role",{p_activity_type:type,p_activity_id:id,p_user_id:userId});await ensure(result);}
export async function transferOwner(type: ActivityType,id:string,userId:string){const result=await rpcRequest("transfer_phase27_activity_ownership",{p_activity_type:type,p_activity_id:id,p_new_owner_id:userId});await ensure(result);}

export type Reminder = { id:string; type:string; offset:number|null; scheduledAt:string; message:string; enabled:boolean; creator:string; createdAt:string };
export async function loadReminders(type: ActivityType,id:string):Promise<Reminder[]>{const result=await rpcRequest<Row[]>("get_phase27_activity_reminders",{p_activity_type:type,p_activity_id:id});if(result.error)throw new Error(result.error);return rows(result.data).map(r=>({id:str(r,"id"),type:str(r,"reminder_type"),offset:r.offset_minutes==null?null:num(r,"offset_minutes"),scheduledAt:str(r,"scheduled_at"),message:str(r,"message"),enabled:bool(r,"enabled"),creator:str(r,"created_by_name","Melo member"),createdAt:str(r,"created_at")})).filter(x=>x.id)}
export async function createReminder(type: Exclude<ActivityType,"community">,id:string,reminderType:string,offset:number,message=""){const result=await rpcRequest("create_phase27_activity_reminder",{p_activity_type:type,p_activity_id:id,p_reminder_type:reminderType,p_offset_minutes:Math.trunc(offset),p_message:message.trim()||null});await ensure(result)}
export async function toggleReminder(id:string,enabled:boolean){const result=await rpcRequest("set_phase27_activity_reminder_enabled",{p_reminder_id:id,p_enabled:enabled});await ensure(result)}
export async function deleteReminder(id:string){const result=await rpcRequest("delete_phase27_activity_reminder",{p_reminder_id:id});await ensure(result)}

export type AuditItem={id:string;action:string;actor:string;target:string;details:Record<string,unknown>;createdAt:string};
export async function loadAudit(type:ActivityType,id:string):Promise<AuditItem[]>{const result=await rpcRequest<Row[]>("get_phase27_activity_audit",{p_activity_type:type,p_activity_id:id,p_limit:150});if(result.error)throw new Error(result.error);return rows(result.data).map(r=>({id:str(r,"id"),action:str(r,"action"),actor:str(r,"actor_name","Melo"),target:str(r,"target_name"),details:(r.details&&typeof r.details==="object"&&!Array.isArray(r.details)?r.details:{} ) as Record<string,unknown>,createdAt:str(r,"created_at")})).filter(x=>x.id)}

export type AttendanceOverview={memberCount:number;checkedIn:number;confirmed:number;noShow:number;cancelled:number;sessionActive:boolean};
export type AttendanceMember={userId:string;name:string;photoUrl:string;status:string;method:string;reputation:number;reviews:number};
export type AttendanceStatusWeb={overview:AttendanceOverview;myStatus:string;checkedInAt:string;reputation:number;reviews:number};

type AttendanceOrganizer={userId:string;name:string;photoUrl:string;reputation:number;reviews:number};

function firstProfilePhotoPath(row:Row|null|undefined){
  const paths=row?.photo_paths;
  if(Array.isArray(paths)){
    const first=paths.find((value)=>typeof value==="string"&&value.trim());
    if(typeof first==="string")return first;
  }
  return str(row,"photo_path");
}

async function loadAttendanceOrganizer(type:Exclude<ActivityType,"community">,id:string):Promise<AttendanceOrganizer|null>{
  const table=type==="trip"?"trips":"events";
  const activityResult=await restSelect<Row[]>(table,`select=organizer_id&id=eq.${encodeURIComponent(id)}&limit=1`);
  if(activityResult.error)return null;
  const organizerId=str(rows(activityResult.data)[0],"organizer_id");
  if(!organizerId)return null;

  const [profileResult,reputationResult]=await Promise.all([
    restSelect<Row[]>("profiles",`select=id,display_name,photo_paths&id=eq.${encodeURIComponent(organizerId)}&limit=1`),
    rpcRequest<Row|Row[]>("get_reputation_summary",{p_user_id:organizerId}),
  ]);
  const profile=profileResult.error?null:(rows(profileResult.data)[0]??null);
  const reputation=reputationResult.error?null:(rows(reputationResult.data)[0]??null);
  return {
    userId:organizerId,
    name:str(profile,"display_name","Organizer"),
    photoUrl:photo(firstProfilePhotoPath(profile)),
    reputation:num(reputation,"average_rating"),
    reviews:num(reputation,"review_count"),
  };
}

function normalizeAttendanceOverview(over:Row,memberRows:Row[],organizer:AttendanceOrganizer|null):AttendanceOverview{
  const sessionActive=bool(over,"session_active");
  const organizerPresent=Boolean(organizer&&memberRows.some((row)=>str(row,"user_id")===organizer.userId));
  const visibleMemberCount=memberRows.filter((row)=>str(row,"user_id")).length+(organizer&&!organizerPresent?1:0);
  const visibleCheckedIn=memberRows.filter((row)=>str(row,"attendance_status").toLowerCase()==="checked_in").length+(organizer&&!organizerPresent&&sessionActive?1:0);

  return {
    memberCount:Math.max(num(over,"member_count"),visibleMemberCount),
    checkedIn:Math.max(num(over,"checked_in_count"),visibleCheckedIn),
    confirmed:num(over,"confirmed_count"),
    noShow:num(over,"no_show_count"),
    cancelled:num(over,"cancelled_count"),
    sessionActive,
  };
}

function normalizeAttendanceMembers(memberRows:Row[],organizer:AttendanceOrganizer|null,sessionActive:boolean):AttendanceMember[]{
  const members=memberRows.map(r=>({
    userId:str(r,"user_id"),name:str(r,"display_name","Melo member"),photoUrl:photo(str(r,"photo_path")),
    status:str(r,"attendance_status","registered"),method:str(r,"check_in_method"),reputation:num(r,"reputation_score"),reviews:num(r,"review_count")
  })).filter(x=>x.userId);

  if(organizer&&!members.some((member)=>member.userId===organizer.userId)){
    members.unshift({
      userId:organizer.userId,
      name:organizer.name,
      photoUrl:organizer.photoUrl,
      status:sessionActive?"checked_in":"registered",
      method:sessionActive?"organizer_session":"",
      reputation:organizer.reputation,
      reviews:organizer.reviews,
    });
  }
  return members;
}

export async function loadAttendanceStatusWeb(type:Exclude<ActivityType,"community">,id:string):Promise<AttendanceStatusWeb>{
  let overviewResult=await rpcRequest<Row|Row[]>("melo_get_attendance_overview_v2",{p_activity_type:type,p_activity_id:id});
  if(overviewResult.error) overviewResult=await rpcRequest<Row|Row[]>("get_phase26_attendance_overview",{p_activity_type:type,p_activity_id:id});
  if(overviewResult.error)throw new Error(overviewResult.error);
  const over=rows(overviewResult.data)[0]??{};

  let membersResult=await rpcRequest<Row[]>("melo_get_attendance_members_v2",{p_activity_type:type,p_activity_id:id});
  if(membersResult.error) membersResult=await rpcRequest<Row[]>("get_phase26_attendance_members",{p_activity_type:type,p_activity_id:id});
  const memberRows=membersResult.error?[]:rows(membersResult.data);
  const [user,organizer]=await Promise.all([getCurrentUser(),loadAttendanceOrganizer(type,id)]);
  const member=user?memberRows.find((row)=>str(row,"user_id")===user.id)??null:null;
  const organizerOmitted=Boolean(organizer&&!memberRows.some((row)=>str(row,"user_id")===organizer.userId));
  const isOrganizer=Boolean(user&&organizer&&user.id===organizer.userId);
  const overview=normalizeAttendanceOverview(over,memberRows,organizer);
  const organizerAutoStatus=isOrganizer&&organizerOmitted?(overview.sessionActive?"checked_in":"registered"):"";

  return {
    overview,
    myStatus:(organizerAutoStatus||str(over,"my_status")||str(member,"attendance_status")||"registered").toLowerCase(),
    checkedInAt:str(over,"my_checked_in_at")||str(member,"checked_in_at"),
    reputation:isOrganizer&&organizerOmitted?(organizer?.reputation??0):num(member,"reputation_score"),
    reviews:isOrganizer&&organizerOmitted?(organizer?.reviews??0):num(member,"review_count"),
  };
}
export async function loadAttendance(type:Exclude<ActivityType,"community">,id:string):Promise<{overview:AttendanceOverview;members:AttendanceMember[]}>{
  let overviewResult=await rpcRequest<Row|Row[]>("melo_get_attendance_overview_v2",{p_activity_type:type,p_activity_id:id});
  if(overviewResult.error) overviewResult=await rpcRequest<Row|Row[]>("get_phase26_attendance_overview",{p_activity_type:type,p_activity_id:id});
  if(overviewResult.error)throw new Error(overviewResult.error); const over=rows(overviewResult.data)[0]??{};
  let membersResult=await rpcRequest<Row[]>("melo_get_attendance_members_v2",{p_activity_type:type,p_activity_id:id});
  if(membersResult.error) membersResult=await rpcRequest<Row[]>("get_phase26_attendance_members",{p_activity_type:type,p_activity_id:id});
  if(membersResult.error)throw new Error(membersResult.error);
  const memberRows=rows(membersResult.data);
  const organizer=await loadAttendanceOrganizer(type,id);
  const overview=normalizeAttendanceOverview(over,memberRows,organizer);
  return {overview,members:normalizeAttendanceMembers(memberRows,organizer,overview.sessionActive)};
}
export async function setAttendanceStatus(type:Exclude<ActivityType,"community">,id:string,userId:string,status:"registered"|"confirmed"|"no_show"){
  let result=await rpcRequest("melo_set_attendance_status_v2",{p_activity_type:type,p_activity_id:id,p_user_id:userId,p_status:status});
  if(result.error) result=await rpcRequest("set_phase27_attendance_status",{p_activity_type:type,p_activity_id:id,p_user_id:userId,p_status:status}); await ensure(result);
}

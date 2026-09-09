"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import {
  cancelSafetyCheckInWeb,
  createSafetyCheckInWeb,
  loadActivityMembersWeb,
  loadSafetyCenterWeb,
  markSafetyCheckInSafeWeb,
  resolveSafetySosWeb,
  saveEmergencyShareSettingWeb,
  saveSafetyMedicalProfileWeb,
  startActivityLiveLocationWeb,
  startTrustedLiveLocationWeb,
  stopActivityLiveLocationWeb,
  stopTrustedLiveLocationWeb,
  triggerSafetySosWeb,
  updateActiveSafetyLocationsWeb,
  type EmergencyShareSettingWeb,
  type SafetyActivityWeb,
  type SafetyDashboardWeb,
  type SafetyEmergencyContact,
  type SafetyMedicalProfileWeb,
  type SafetyShareScope,
} from "./safetyWebData";
import styles from "./SafetyCenterExperience.module.css";

type Tab = "info" | "friends";
type FriendFilter = "all" | "friend" | "trip";

const COPY = {
  th: {
    title: "ศูนย์ความปลอดภัย", subtitle: "Medical ID · Live Location · SOS", info: "ข้อมูลปลอดภัย", friends: "Live Location เพื่อน",
    emergencyId: "EMERGENCY MEDICAL ID", edit: "แก้ไข", add: "เพิ่มข้อมูล", dob: "วันเกิด", blood: "กรุ๊ปเลือด", hospital: "โรงพยาบาลประจำตัว",
    conditions: "โรคประจำตัว", allergies: "แพ้ยา / อาหาร", medications: "ยาที่ใช้ประจำ", notes: "ข้อควรระวัง", emergencyContacts: "ผู้ติดต่อฉุกเฉิน",
    notSet: "ไม่ระบุ", privacy: "🔒 ข้อมูลฉุกเฉินจะไม่แชร์อัตโนมัติ คุณเลือกสิทธิ์แยกสำหรับแต่ละ Trip / Event ได้ด้านล่าง",
    shareEmergency: "แชร์ข้อมูลฉุกเฉินใน Trip / Event", whoCanSee: "เลือกได้ว่าใครเห็นข้อมูลฉุกเฉินของคุณ", shareContent: "ผู้ติดต่อฉุกเฉิน + เบอร์โทร · แพ้ยา · โรค/ภาวะสำคัญ · ยาประจำ · หมายเหตุฉุกเฉิน",
    autoClose: "✓ สิทธิ์ดูจะปิดอัตโนมัติเมื่อ Trip / Event จบ", noShareActivity: "ยังไม่มี Trip / Event ที่ตั้งค่าการแชร์ได้", checkedInOnly: "ระบบจะแสดง Trip / Event ที่ยังไม่จบ ซึ่งคุณเป็นผู้จัดหรือเข้าร่วมอยู่",
    noShare: "ไม่แชร์", allMembers: "ผู้เข้าร่วมทั้งหมด", organizerOnly: "ผู้จัดกิจกรรม", selectedMembers: "เลือกระบุ", selectedCount: "เลือกแล้ว",
    trustedTitle: "แชร์ตำแหน่งให้คนที่ไว้ใจ", trustedText: "เลือกเพื่อนใน Melo ได้สูงสุด 3 คน และกำหนดเวลาหยุดแชร์อัตโนมัติ", settings: "ตั้งค่า",
    activeShare: "กำลังแชร์กับ", expires: "หมดอายุ", updated: "อัปเดต", stopShare: "หยุดแชร์", startTrusted: "เริ่มแชร์ Live Location", selectFriends: "เลือกเพื่อน",
    liveActivity: "Live Location ใน Trip / Event", liveActivityEmpty: "เมื่อคุณเช็คอินเข้าร่วม Trip หรือ Event ระบบจะแสดงกิจกรรมนั้นตรงนี้ และสามารถเปิด Live Location สำหรับสมาชิกกิจกรรมได้",
    duration: "ระยะเวลา Live Location", startShare: "เริ่มแชร์ Live Location", safetyCheckin: "เช็คอินความปลอดภัย", checkinEmpty: "เช็คอิน Trip / Event ก่อนจึงจะตั้งเวลาเช็คอินความปลอดภัยได้",
    confirmBy: "ยืนยันภายใน", overdue: "เลยเวลายืนยันแล้ว", safe: "ฉันปลอดภัย", cancel: "ยกเลิก", checkinNote: "หมายเหตุ (ไม่บังคับ)", createCheckin: "ตั้งเวลาเช็คอิน",
    emergency: "กรณีฉุกเฉินจริง", emergencyHint: "SOS และ Live Location ใน Melo เป็นเครื่องมือช่วยแจ้งคนที่คุณไว้ใจ ไม่ใช่บริการฉุกเฉิน และไม่ทดแทนการติดต่อเจ้าหน้าที่ในพื้นที่",
    sosActive: "SOS กำลังทำงาน", sosSent: "ส่งสัญญาณเตือนแล้ว", stopSos: "ยุติ SOS", sosConfirm: "ส่งสัญญาณ SOS พร้อมตำแหน่งล่าสุดให้ผู้ที่เกี่ยวข้องหรือไม่?",
    all: "ทั้งหมด", friend: "เพื่อน", tripFriend: "เพื่อนร่วมทริป", sharedWithMe: "รายการที่กำลังแชร์กับฉัน", noneShared: "ยังไม่มีผู้ใช้กำลังแชร์ Live Location กับคุณ",
    openMap: "เปิดแผนที่", live: "LIVE", stale: "STALE", sos: "SOS", automatic: "อัปเดต Live Location อัตโนมัติ", automaticText: "รายการ Live Location จะตรวจข้อมูลล่าสุดซ้ำทุก 5 วินาทีขณะเปิดศูนย์ความปลอดภัย",
    save: "บันทึก", close: "ปิด", loading: "กำลังโหลดศูนย์ความปลอดภัย…", error: "โหลดศูนย์ความปลอดภัยไม่สำเร็จ", retry: "ลองอีกครั้ง",
    legalName: "ชื่อจริง-นามสกุล", relation: "ความสัมพันธ์", phone: "เบอร์โทร", contact: "ผู้ติดต่อ", selectAtLeastOne: "กรุณาเลือกอย่างน้อย 1 คน", maxThree: "เลือกได้สูงสุด 3 คน",
    chooseMembers: "เลือกระบุผู้ที่ดูข้อมูลฉุกเฉิน", noMembers: "ไม่พบสมาชิกที่เลือกได้", currentActivity: "กิจกรรมที่กำลังเช็คอิน", login: "กรุณาเข้าสู่ระบบก่อนใช้งานศูนย์ความปลอดภัย",
  },
  en: {
    title: "Safety Center", subtitle: "Medical ID · Live Location · SOS", info: "Safety information", friends: "Friends Live Location",
    emergencyId: "EMERGENCY MEDICAL ID", edit: "Edit", add: "Add information", dob: "Date of birth", blood: "Blood type", hospital: "Regular hospital",
    conditions: "Medical conditions", allergies: "Allergies", medications: "Regular medications", notes: "Emergency notes", emergencyContacts: "Emergency contacts",
    notSet: "Not specified", privacy: "🔒 Emergency information is never shared automatically. Set access separately for each Trip / Event below.",
    shareEmergency: "Share emergency information in Trip / Event", whoCanSee: "Choose who can see your emergency information", shareContent: "Emergency contacts + phone · allergies · important conditions · medications · emergency notes",
    autoClose: "✓ Access closes automatically when the Trip / Event ends", noShareActivity: "No Trip / Event is currently eligible", checkedInOnly: "Active or upcoming Trips / Events you organize or have joined appear here.",
    noShare: "Do not share", allMembers: "All participants", organizerOnly: "Organizer", selectedMembers: "Selected people", selectedCount: "Selected",
    trustedTitle: "Share location with people you trust", trustedText: "Choose up to 3 Melo friends and set an automatic stop time.", settings: "Set up",
    activeShare: "Sharing with", expires: "Expires", updated: "Updated", stopShare: "Stop sharing", startTrusted: "Start Live Location", selectFriends: "Select friends",
    liveActivity: "Live Location in Trip / Event", liveActivityEmpty: "Check in to a Trip or Event to share Live Location with activity members.",
    duration: "Live Location duration", startShare: "Start Live Location", safetyCheckin: "Safety check-in", checkinEmpty: "Check in to a Trip / Event before creating a safety check-in.",
    confirmBy: "Confirm by", overdue: "Confirmation overdue", safe: "I'm safe", cancel: "Cancel", checkinNote: "Note (optional)", createCheckin: "Create safety check-in",
    emergency: "In a real emergency", emergencyHint: "Melo SOS and Live Location help alert people you trust. They are not emergency services and do not replace contacting local authorities.",
    sosActive: "SOS is active", sosSent: "Alert sent", stopSos: "End SOS", sosConfirm: "Send SOS with your latest location to relevant people?",
    all: "All", friend: "Friends", tripFriend: "Trip / Event", sharedWithMe: "People sharing with me", noneShared: "No one is sharing Live Location with you right now.",
    openMap: "Open map", live: "LIVE", stale: "STALE", sos: "SOS", automatic: "Automatic Live Location updates", automaticText: "Safety Center checks for updated Live Location data every 5 seconds while this page is open.",
    save: "Save", close: "Close", loading: "Loading Safety Center…", error: "Unable to load Safety Center", retry: "Try again",
    legalName: "Legal full name", relation: "Relationship", phone: "Phone", contact: "Contact", selectAtLeastOne: "Select at least 1 person", maxThree: "You can select up to 3 people",
    chooseMembers: "Choose who can view emergency information", noMembers: "No eligible members found", currentActivity: "Checked-in activity", login: "Please sign in to use Safety Center",
  },
  de: {
    title:"Safety Center",subtitle:"Medical ID · Live Location · SOS",info:"Sicherheitsdaten",friends:"Live Location von Freunden",emergencyId:"NOTFALL-MEDIZIN-ID",edit:"Bearbeiten",add:"Daten hinzufügen",dob:"Geburtsdatum",blood:"Blutgruppe",hospital:"Stammkrankenhaus",conditions:"Vorerkrankungen",allergies:"Allergien",medications:"Regelmäßige Medikamente",notes:"Notfallhinweise",emergencyContacts:"Notfallkontakte",notSet:"Nicht angegeben",privacy:"🔒 Notfalldaten werden nie automatisch geteilt. Lege die Berechtigung für jede Reise / jedes Event separat fest.",shareEmergency:"Notfalldaten in Reise / Event teilen",whoCanSee:"Wähle, wer deine Notfalldaten sehen darf",shareContent:"Notfallkontakte + Telefon · Allergien · wichtige Erkrankungen · Medikamente · Notfallhinweise",autoClose:"✓ Der Zugriff endet automatisch mit der Reise / dem Event",noShareActivity:"Derzeit keine geeignete Reise / kein Event",checkedInOnly:"Hier erscheinen aktive oder bevorstehende Reisen / Events, die du organisierst oder an denen du teilnimmst.",noShare:"Nicht teilen",allMembers:"Alle Teilnehmer",organizerOnly:"Organisator",selectedMembers:"Ausgewählte Personen",selectedCount:"Ausgewählt",trustedTitle:"Standort mit Vertrauenspersonen teilen",trustedText:"Wähle bis zu 3 Melo-Freunde und eine automatische Endzeit.",settings:"Einrichten",activeShare:"Teilen mit",expires:"Endet",updated:"Aktualisiert",stopShare:"Teilen stoppen",startTrusted:"Live Location starten",selectFriends:"Freunde auswählen",liveActivity:"Live Location in Reise / Event",liveActivityEmpty:"Checke in eine Reise oder ein Event ein, um Live Location mit Teilnehmern zu teilen.",duration:"Dauer der Live Location",startShare:"Live Location starten",safetyCheckin:"Sicherheits-Check-in",checkinEmpty:"Checke zuerst in eine Reise / ein Event ein.",confirmBy:"Bestätigen bis",overdue:"Bestätigung überfällig",safe:"Ich bin sicher",cancel:"Abbrechen",checkinNote:"Notiz (optional)",createCheckin:"Sicherheits-Check-in erstellen",emergency:"Bei einem echten Notfall",emergencyHint:"Melo SOS und Live Location informieren Vertrauenspersonen. Sie ersetzen keine Notdienste oder örtlichen Behörden.",sosActive:"SOS ist aktiv",sosSent:"Alarm gesendet",stopSos:"SOS beenden",sosConfirm:"SOS mit deinem letzten Standort an relevante Personen senden?",all:"Alle",friend:"Freunde",tripFriend:"Reise / Event",sharedWithMe:"Personen, die mit mir teilen",noneShared:"Aktuell teilt niemand Live Location mit dir.",openMap:"Karte öffnen",live:"LIVE",stale:"VERALTET",sos:"SOS",automatic:"Automatische Live-Location-Updates",automaticText:"Das Safety Center prüft alle 5 Sekunden auf neue Live-Location-Daten, solange diese Seite geöffnet ist.",save:"Speichern",close:"Schließen",loading:"Safety Center wird geladen…",error:"Safety Center konnte nicht geladen werden",retry:"Erneut versuchen",legalName:"Vollständiger rechtlicher Name",relation:"Beziehung",phone:"Telefon",contact:"Kontakt",selectAtLeastOne:"Wähle mindestens 1 Person",maxThree:"Du kannst bis zu 3 Personen auswählen",chooseMembers:"Personen für Notfalldaten auswählen",noMembers:"Keine geeigneten Mitglieder gefunden",currentActivity:"Aktivität mit Check-in",login:"Bitte anmelden, um das Safety Center zu verwenden"
  },
  zh: {
    title:"安全中心",subtitle:"Medical ID · Live Location · SOS",info:"安全信息",friends:"好友实时位置",emergencyId:"紧急医疗信息",edit:"编辑",add:"添加信息",dob:"出生日期",blood:"血型",hospital:"常用医院",conditions:"既往病史",allergies:"药物 / 食物过敏",medications:"常用药物",notes:"紧急注意事项",emergencyContacts:"紧急联系人",notSet:"未填写",privacy:"🔒 紧急信息不会自动共享。你可以为每个旅行 / 活动单独设置访问权限。",shareEmergency:"在旅行 / 活动中共享紧急信息",whoCanSee:"选择谁可以查看你的紧急信息",shareContent:"紧急联系人 + 电话 · 过敏 · 重要病史 · 常用药 · 紧急备注",autoClose:"✓ 旅行 / 活动结束后访问权限会自动关闭",noShareActivity:"当前没有可设置的旅行 / 活动",checkedInOnly:"这里会显示你组织或已参加、且尚未结束的旅行 / 活动。",noShare:"不共享",allMembers:"所有参与者",organizerOnly:"组织者",selectedMembers:"指定人员",selectedCount:"已选择",trustedTitle:"向信任的人共享位置",trustedText:"最多选择 3 位 Melo 好友，并设置自动停止时间。",settings:"设置",activeShare:"正在共享给",expires:"到期",updated:"更新",stopShare:"停止共享",startTrusted:"开始实时位置",selectFriends:"选择好友",liveActivity:"旅行 / 活动中的实时位置",liveActivityEmpty:"先在旅行或活动中签到，即可向参与者共享实时位置。",duration:"实时位置时长",startShare:"开始实时位置",safetyCheckin:"安全签到",checkinEmpty:"请先在旅行 / 活动中签到，再创建安全签到。",confirmBy:"请在此时间前确认",overdue:"已超过确认时间",safe:"我很安全",cancel:"取消",checkinNote:"备注（可选）",createCheckin:"创建安全签到",emergency:"真实紧急情况",emergencyHint:"Melo SOS 和实时位置用于提醒你信任的人，不属于紧急救援服务，也不能替代联系当地相关机构。",sosActive:"SOS 正在运行",sosSent:"警报已发送",stopSos:"结束 SOS",sosConfirm:"是否将 SOS 和你的最新位置发送给相关人员？",all:"全部",friend:"好友",tripFriend:"旅行 / 活动",sharedWithMe:"正在与我共享的人",noneShared:"目前没有人向你共享实时位置。",openMap:"打开地图",live:"实时",stale:"位置较旧",sos:"SOS",automatic:"实时位置自动更新",automaticText:"打开安全中心时，系统每 5 秒检查一次最新实时位置数据。",save:"保存",close:"关闭",loading:"正在加载安全中心…",error:"无法加载安全中心",retry:"重试",legalName:"法定姓名",relation:"关系",phone:"电话",contact:"联系人",selectAtLeastOne:"请至少选择 1 人",maxThree:"最多可选择 3 人",chooseMembers:"选择可查看紧急信息的人员",noMembers:"没有可选择的成员",currentActivity:"已签到的活动",login:"请先登录再使用安全中心"
  },
  ja: {
    title:"セーフティセンター",subtitle:"Medical ID · Live Location · SOS",info:"安全情報",friends:"友だちのLive Location",emergencyId:"緊急医療ID",edit:"編集",add:"情報を追加",dob:"生年月日",blood:"血液型",hospital:"かかりつけ病院",conditions:"持病",allergies:"薬 / 食品アレルギー",medications:"常用薬",notes:"緊急時の注意事項",emergencyContacts:"緊急連絡先",notSet:"未設定",privacy:"🔒 緊急情報は自動共有されません。Trip / Eventごとに閲覧権限を設定できます。",shareEmergency:"Trip / Eventで緊急情報を共有",whoCanSee:"緊急情報を閲覧できる人を選択",shareContent:"緊急連絡先 + 電話 · アレルギー · 重要な持病 · 常用薬 · 緊急メモ",autoClose:"✓ Trip / Event終了時に閲覧権限は自動で終了します",noShareActivity:"設定できるTrip / Eventはありません",checkedInOnly:"あなたが主催または参加していて、まだ終了していないTrip / Eventが表示されます。",noShare:"共有しない",allMembers:"参加者全員",organizerOnly:"主催者",selectedMembers:"指定した人",selectedCount:"選択済み",trustedTitle:"信頼する人に位置情報を共有",trustedText:"Meloの友だちを最大3人選び、自動停止時間を設定できます。",settings:"設定",activeShare:"共有中",expires:"終了",updated:"更新",stopShare:"共有を停止",startTrusted:"Live Locationを開始",selectFriends:"友だちを選択",liveActivity:"Trip / EventのLive Location",liveActivityEmpty:"TripまたはEventにチェックインすると参加者向けLive Locationを開始できます。",duration:"Live Locationの時間",startShare:"Live Locationを開始",safetyCheckin:"安全チェックイン",checkinEmpty:"安全チェックインを作成する前にTrip / Eventへチェックインしてください。",confirmBy:"確認期限",overdue:"確認期限を過ぎています",safe:"無事です",cancel:"キャンセル",checkinNote:"メモ（任意）",createCheckin:"安全チェックインを作成",emergency:"実際の緊急時",emergencyHint:"MeloのSOSとLive Locationは信頼する人への通知を支援する機能です。緊急サービスではなく、地域の緊急機関への連絡の代わりにはなりません。",sosActive:"SOS作動中",sosSent:"警告を送信しました",stopSos:"SOSを終了",sosConfirm:"最新位置とともにSOSを関係者へ送信しますか？",all:"すべて",friend:"友だち",tripFriend:"Trip / Event",sharedWithMe:"位置情報を共有している人",noneShared:"現在あなたにLive Locationを共有している人はいません。",openMap:"地図を開く",live:"LIVE",stale:"古い位置",sos:"SOS",automatic:"Live Locationの自動更新",automaticText:"このページを開いている間、5秒ごとに最新のLive Locationデータを確認します。",save:"保存",close:"閉じる",loading:"セーフティセンターを読み込み中…",error:"セーフティセンターを読み込めません",retry:"再試行",legalName:"本名",relation:"関係",phone:"電話番号",contact:"連絡先",selectAtLeastOne:"1人以上選択してください",maxThree:"最大3人まで選択できます",chooseMembers:"緊急情報を閲覧できる人を選択",noMembers:"選択できるメンバーがいません",currentActivity:"チェックイン中のアクティビティ",login:"セーフティセンターを利用するにはログインしてください"
  },
  ko: {
    title:"안전 센터",subtitle:"Medical ID · Live Location · SOS",info:"안전 정보",friends:"친구 Live Location",emergencyId:"응급 의료 ID",edit:"수정",add:"정보 추가",dob:"생년월일",blood:"혈액형",hospital:"주 이용 병원",conditions:"기저 질환",allergies:"약 / 음식 알레르기",medications:"복용 중인 약",notes:"응급 주의사항",emergencyContacts:"비상 연락처",notSet:"미지정",privacy:"🔒 응급 정보는 자동으로 공유되지 않습니다. Trip / Event별로 접근 권한을 설정할 수 있습니다.",shareEmergency:"Trip / Event에서 응급 정보 공유",whoCanSee:"응급 정보를 볼 수 있는 사람 선택",shareContent:"비상 연락처 + 전화 · 알레르기 · 중요 질환 · 복용약 · 응급 메모",autoClose:"✓ Trip / Event가 끝나면 접근 권한이 자동으로 종료됩니다",noShareActivity:"현재 설정 가능한 Trip / Event가 없습니다",checkedInOnly:"내가 주최하거나 참여 중이며 아직 종료되지 않은 Trip / Event가 표시됩니다.",noShare:"공유 안 함",allMembers:"모든 참가자",organizerOnly:"주최자",selectedMembers:"지정한 사람",selectedCount:"선택됨",trustedTitle:"신뢰하는 사람에게 위치 공유",trustedText:"Melo 친구를 최대 3명 선택하고 자동 종료 시간을 설정하세요.",settings:"설정",activeShare:"공유 중",expires:"종료",updated:"업데이트",stopShare:"공유 중지",startTrusted:"Live Location 시작",selectFriends:"친구 선택",liveActivity:"Trip / Event Live Location",liveActivityEmpty:"Trip 또는 Event에 체크인하면 참가자에게 Live Location을 공유할 수 있습니다.",duration:"Live Location 시간",startShare:"Live Location 시작",safetyCheckin:"안전 체크인",checkinEmpty:"안전 체크인을 만들기 전에 Trip / Event에 체크인하세요.",confirmBy:"확인 기한",overdue:"확인 시간이 지났습니다",safe:"안전합니다",cancel:"취소",checkinNote:"메모 (선택)",createCheckin:"안전 체크인 만들기",emergency:"실제 응급 상황",emergencyHint:"Melo SOS와 Live Location은 신뢰하는 사람에게 알리는 보조 기능입니다. 응급 서비스가 아니며 현지 기관에 연락하는 것을 대체하지 않습니다.",sosActive:"SOS 작동 중",sosSent:"경고를 전송했습니다",stopSos:"SOS 종료",sosConfirm:"최신 위치와 함께 SOS를 관련 사람에게 보낼까요?",all:"전체",friend:"친구",tripFriend:"Trip / Event",sharedWithMe:"나에게 공유 중인 사람",noneShared:"현재 나에게 Live Location을 공유하는 사람이 없습니다.",openMap:"지도 열기",live:"LIVE",stale:"오래된 위치",sos:"SOS",automatic:"Live Location 자동 업데이트",automaticText:"안전 센터를 열어 둔 동안 5초마다 최신 Live Location 데이터를 확인합니다.",save:"저장",close:"닫기",loading:"안전 센터 불러오는 중…",error:"안전 센터를 불러올 수 없습니다",retry:"다시 시도",legalName:"법적 이름",relation:"관계",phone:"전화번호",contact:"연락처",selectAtLeastOne:"1명 이상 선택하세요",maxThree:"최대 3명까지 선택할 수 있습니다",chooseMembers:"응급 정보를 볼 사람 선택",noMembers:"선택 가능한 멤버가 없습니다",currentActivity:"체크인한 활동",login:"안전 센터를 사용하려면 로그인하세요"
  },
} as const;

function localizedCopy(locale: string) {
  const en = COPY.en as Record<string, string>;
  const partial = ((COPY as unknown) as Record<string, Record<string, string>>)[locale] ?? {};
  return { ...en, ...partial } as typeof COPY.en;
}

const TRUSTED_DURATIONS = [30, 60, 180, 480];
const CHECKIN_DURATIONS = [15, 30, 60, 120];
const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function formatDate(value: string, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const tag = locale === "th" ? "th-TH" : locale === "de" ? "de-DE" : locale === "zh" ? "zh-CN" : locale === "ja" ? "ja-JP" : locale === "ko" ? "ko-KR" : "en-US";
  return new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function durationLabel(minutes: number, locale: string) {
  if (locale === "th") return minutes < 60 ? `${minutes} นาที` : `${minutes / 60} ชั่วโมง`;
  return minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`;
}

function emptyMedical(userId = "", name = ""): SafetyMedicalProfileWeb {
  return {
    userId,
    legalFullName: name,
    dateOfBirth: "",
    bloodType: "",
    regularHospital: "",
    medicalConditions: "",
    allergies: "",
    medications: "",
    medicalNotes: "",
    emergencyContacts: [{ name: "", relation: "", phone: "" }, { name: "", relation: "", phone: "" }],
  };
}

function shareKey(setting: Pick<EmergencyShareSettingWeb, "contextType" | "contextId">) {
  return `${setting.contextType}:${setting.contextId}`;
}

export default function SafetyCenterExperience() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = localizedCopy(locale);
  const [tab, setTab] = useState<Tab>("info");
  const [friendFilter, setFriendFilter] = useState<FriendFilter>("all");
  const [data, setData] = useState<SafetyDashboardWeb | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [medicalOpen, setMedicalOpen] = useState(false);
  const [medicalDraft, setMedicalDraft] = useState<SafetyMedicalProfileWeb>(emptyMedical());
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [trustedDuration, setTrustedDuration] = useState(60);
  const [activityDuration, setActivityDuration] = useState(60);
  const [selectedActivityKey, setSelectedActivityKey] = useState("");
  const [checkinDuration, setCheckinDuration] = useState(30);
  const [checkinNote, setCheckinNote] = useState("");
  const [memberPickerActivity, setMemberPickerActivity] = useState<SafetyActivityWeb | null>(null);
  const [activityMembers, setActivityMembers] = useState<Array<{ userId: string; displayName: string; photoUrl: string; isOrganizer: boolean }>>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "friends") setTab("friends");
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const next = await loadSafetyCenterWeb();
      setData(next);
      setError("");
      setSelectedActivityKey((current) => current && next.activities.some((activity) => activity.key === current) ? current : next.activities[0]?.key ?? "");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (message === "AUTH_REQUIRED") {
        router.replace("/login");
        return;
      }
      setError(message || copy.error);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [copy.error, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => { void load(true); }, 5000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (!data || (!data.liveLocations.length && !data.trustedOwn)) return;
    const update = async () => { await updateActiveSafetyLocationsWeb(data, locale).catch(() => undefined); };
    const timer = window.setInterval(() => { void update(); }, 15 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [data?.liveLocations.map((item) => item.id).join("|"), data?.trustedOwn?.id, locale]);

  const selectedActivity = useMemo(() => data?.activities.find((activity) => activity.key === selectedActivityKey) ?? data?.activities[0] ?? null, [data, selectedActivityKey]);
  const selectedLive = useMemo(() => selectedActivity ? data?.liveLocations.find((session) => session.contextType === selectedActivity.contextType && session.contextId === selectedActivity.contextId) ?? null : null, [data, selectedActivity]);
  const selectedCheckIn = useMemo(() => selectedActivity ? data?.checkIns.find((checkin) => checkin.contextType === selectedActivity.contextType && checkin.contextId === selectedActivity.contextId && (checkin.status === "waiting" || checkin.status === "overdue")) ?? null : null, [data, selectedActivity]);
  const activeAlert = useMemo(() => data?.alerts.find((alert) => alert.status === "active") ?? null, [data]);
  const ownSosActive = Boolean(activeAlert || data?.trustedOwn?.sosActive);
  const shareMap = useMemo(() => new Map((data?.shareSettings ?? []).map((setting) => [shareKey(setting), setting])), [data]);

  async function run(id: string, action: () => Promise<void>, success = "") {
    if (busy) return;
    setBusy(id); setNotice(""); setError("");
    try {
      await action();
      if (success) setNotice(success);
      await load(true);
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : String(cause);
      setError(raw === "SOS_REQUIRES_LIVE_LOCATION" ? (locale === "th" ? "กรุณาเริ่ม Live Location ใน Trip / Event หรือแชร์ Live Location ให้เพื่อนอย่างน้อย 1 คนก่อนส่ง SOS" : "Start Live Location in a Trip / Event or share Live Location with a trusted friend before sending SOS.") : raw);
    } finally { setBusy(""); }
  }

  async function triggerSos() {
    if (!data || busy) return;
    if (ownSosActive) return;
    if (!window.confirm(copy.sosConfirm)) return;
    await run("sos", async () => { await triggerSafetySosWeb(data, locale); }, copy.sosSent);
  }

  function openMedical() {
    if (!data) return;
    const current = data.medical ?? emptyMedical(data.userId, data.displayName);
    setMedicalDraft({
      ...current,
      emergencyContacts: [0, 1].map((index) => current.emergencyContacts[index] ?? { name: "", relation: "", phone: "" }),
    });
    setMedicalOpen(true);
  }

  async function saveMedical() {
    await run("medical", async () => {
      await saveSafetyMedicalProfileWeb(medicalDraft);
      setMedicalOpen(false);
    }, copy.save);
  }

  function toggleFriend(id: string) {
    setSelectedFriendIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 3 ? current : [...current, id]);
  }

  async function startTrusted() {
    if (!selectedFriendIds.length) { setError(copy.selectAtLeastOne); return; }
    await run("trusted-start", async () => {
      await startTrustedLiveLocationWeb(selectedFriendIds, trustedDuration, locale);
      setFriendPickerOpen(false);
    });
  }

  async function openMemberPicker(activity: SafetyActivityWeb) {
    setMemberPickerActivity(activity);
    setSelectedMemberIds(shareMap.get(activity.key)?.selectedUserIds ?? []);
    setActivityMembers([]);
    try { setActivityMembers(await loadActivityMembersWeb(activity.contextType, activity.contextId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function setShare(activity: SafetyActivityWeb, scope: SafetyShareScope | null) {
    await run(`share:${activity.key}`, async () => saveEmergencyShareSettingWeb(activity.contextType, activity.contextId, scope));
  }

  async function saveSelectedMembers() {
    if (!memberPickerActivity) return;
    if (!selectedMemberIds.length) { setError(copy.selectAtLeastOne); return; }
    await run(`share-selected:${memberPickerActivity.key}`, async () => {
      await saveEmergencyShareSettingWeb(memberPickerActivity.contextType, memberPickerActivity.contextId, "selected_members", selectedMemberIds);
      setMemberPickerActivity(null);
    });
  }

  if (loading) return <main className={styles.page}><Header/><div className={styles.state}>{copy.loading}</div></main>;
  if (!data) return <main className={styles.page}><Header/><div className={styles.state}><strong>{copy.error}</strong><p>{error || copy.login}</p><button onClick={() => void load()}>{copy.retry}</button></div></main>;

  const medical = data.medical;
  const medicalName = medical?.legalFullName || data.displayName;
  const contacts = medical?.emergencyContacts ?? [];
  const tripViewers = data.activityReceived.map((session) => ({
    id: `activity:${session.id}`, sessionId: session.id, source: "trip" as const, ownerId: session.ownerId, displayName: session.displayName, photoUrl: session.photoUrl,
    latitude: session.latitude, longitude: session.longitude, updatedAt: session.updatedAt, expiresAt: session.expiresAt,
    sosActive: session.sosActive, sosMessage: session.sosMessage,
    context: session.activity?.title || (session.activity?.contextType === "event" ? "Event" : "Trip"),
  }));
  const directViewers = data.trustedReceived.map((session) => ({
    id: `friend:${session.id}`, sessionId: session.id, source: "friend" as const, ownerId: session.ownerId, displayName: session.displayName, photoUrl: session.photoUrl,
    latitude: session.latitude, longitude: session.longitude, updatedAt: session.updatedAt, expiresAt: session.expiresAt, sosActive: session.sosActive, sosMessage: session.sosMessage,
    context: session.activity?.title || "",
  }));
  const visibleViewers = [...directViewers, ...tripViewers].filter((item) => friendFilter === "all" || item.source === (friendFilter === "friend" ? "friend" : "trip"));

  return <main className={styles.page}>
    <Header/>
    <section className={styles.shell}>
      <header className={styles.pageHeader}>
        <button className={styles.backButton} onClick={() => router.back()} aria-label="Back">‹</button>
        <div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
        <button className={styles.sosButton} data-active={ownSosActive} disabled={busy === "sos" || ownSosActive} onClick={() => void triggerSos()}>SOS</button>
      </header>

      <div className={styles.tabs}>
        <button data-active={tab === "info"} onClick={() => setTab("info")}>{copy.info}</button>
        <button data-active={tab === "friends"} onClick={() => setTab("friends")}>{copy.friends}</button>
      </div>

      {notice ? <div className={styles.toast}>{notice}</div> : null}
      {error ? <div className={styles.errorBar}>{error}<button onClick={() => setError("")}>×</button></div> : null}

      {tab === "info" ? <>
        {ownSosActive ? <section className={styles.sosBanner}>
          <span>!</span><div><strong>{copy.sosActive}</strong><p>{copy.sosSent}{activeAlert?.createdAt ? ` · ${formatDate(activeAlert.createdAt, locale)}` : ""}</p></div>
          <button disabled={busy === "resolve-sos"} onClick={() => void run("resolve-sos", async () => resolveSafetySosWeb(data))}>{copy.stopSos}</button>
        </section> : null}

        <section className={styles.medicalCard}>
          <div className={styles.medicalTop}>
            <VerifiedUserAvatar userId={data.userId} name={medicalName} src={data.photoUrl} nationality={data.nationality} country={data.country} size={68}/>
            <div className={styles.medicalIdentity}><small>{copy.emergencyId}</small><h2>{medicalName}</h2><p>{copy.dob} {medical?.dateOfBirth ? formatDate(medical.dateOfBirth, locale).split(",")[0] : copy.notSet}</p></div>
            <button className={styles.softButton} onClick={openMedical}>{medical ? copy.edit : copy.add}</button>
          </div>
          <div className={styles.quickGrid}><InfoBox label={copy.blood} value={medical?.bloodType || copy.notSet}/><InfoBox label={copy.hospital} value={medical?.regularHospital || copy.notSet}/></div>
          <DetailLine label={copy.conditions} value={medical?.medicalConditions || copy.notSet}/><DetailLine label={copy.allergies} value={medical?.allergies || copy.notSet} danger={Boolean(medical?.allergies)}/><DetailLine label={copy.medications} value={medical?.medications || copy.notSet}/><DetailLine label={copy.notes} value={medical?.medicalNotes || copy.notSet}/>
          <div className={styles.emergencyContacts}><span>☎</span><div><small>{copy.emergencyContacts} · {contacts.length}/2</small>{contacts.length ? contacts.map((contact, index) => <strong key={`${contact.phone}-${index}`}>{[contact.name, contact.relation, contact.phone].filter(Boolean).join(" · ")}</strong>) : <strong>{copy.notSet}</strong>}</div></div>
          <p className={styles.privacy}>{copy.privacy}</p>
        </section>

        <Section title={copy.shareEmergency}>
          <div className={styles.introCard}><strong>{copy.whoCanSee}</strong><p>{copy.shareContent}</p><small>{copy.autoClose}</small></div>
          {data.shareActivities.length === 0 ? <EmptyCard title={copy.noShareActivity} text={copy.checkedInOnly}/> : data.shareActivities.map((activity) => {
            const setting = shareMap.get(activity.key);
            const scope = setting?.enabled ? setting.scope : null;
            return <article className={styles.activityCard} key={`share-${activity.key}`}>
              <ActivityHeader activity={activity}/>
              <p className={styles.choiceLabel}>{copy.whoCanSee}</p>
              <div className={styles.choiceRow}>
                <Choice active={!scope} onClick={() => void setShare(activity, null)}>{copy.noShare}</Choice>
                <Choice active={scope === "all_members"} onClick={() => void setShare(activity, "all_members")}>{copy.allMembers}</Choice>
                {!activity.isOrganizer ? <Choice active={scope === "organizer_only"} onClick={() => void setShare(activity, "organizer_only")}>{copy.organizerOnly}</Choice> : null}
                <Choice active={scope === "selected_members"} onClick={() => void openMemberPicker(activity)}>{copy.selectedMembers}{scope === "selected_members" ? ` (${setting?.selectedUserIds.length ?? 0})` : ""}</Choice>
              </div>
            </article>;
          })}
        </Section>

        <Section title={copy.trustedTitle}>
          <article className={styles.trustedCard}>
            <div className={styles.trustedLead}><span>⌖</span><div><strong>{copy.trustedTitle}</strong><p>{copy.trustedText}</p></div></div>
            {data.trustedOwn ? <div className={styles.activeBox}><div><strong>● {copy.activeShare} {data.trustedOwn.recipientNames.length || data.trustedOwn.recipientIds.length}</strong><div className={styles.trustedRecipients}>{data.trustedOwn.recipientIds.map((recipientId, index) => { const friend = data.friends.find((item) => item.userId === recipientId); const recipientName = friend?.displayName || data.trustedOwn?.recipientNames[index] || copy.friend; return <div className={styles.trustedRecipient} key={recipientId}><VerifiedUserAvatar userId={recipientId} name={recipientName} src={friend?.photoUrl} country={friend?.country} size={34}/><span className={styles.trustedRecipientName}>{recipientName}</span></div>; })}</div><small>{copy.expires} {formatDate(data.trustedOwn.expiresAt, locale)} · {copy.updated} {formatDate(data.trustedOwn.updatedAt, locale)}</small></div><button className={styles.dangerOutline} onClick={() => void run("trusted-stop", async () => stopTrustedLiveLocationWeb(data.trustedOwn!.id))}>{copy.stopShare}</button></div> : <>
              <div className={styles.durationRow}>{TRUSTED_DURATIONS.map((minutes) => <button key={minutes} data-active={trustedDuration === minutes} onClick={() => setTrustedDuration(minutes)}>{durationLabel(minutes, locale)}</button>)}</div>
              <button className={styles.primaryButton} onClick={() => { setSelectedFriendIds([]); setFriendPickerOpen(true); }}>{copy.startTrusted}</button>
            </>}
          </article>
        </Section>

        <Section title={copy.liveActivity}>
          {!selectedActivity ? <EmptyCard title={copy.liveActivity} text={copy.liveActivityEmpty}/> : <article className={styles.activityCard}>
            <ActivitySelector activities={data.activities} selectedKey={selectedActivity.key} onChange={setSelectedActivityKey}/><ActivityHeader activity={selectedActivity}/>
            {selectedLive ? <div className={styles.activeBox}><div><strong>● {copy.startShare}</strong><small>{copy.expires} {formatDate(selectedLive.expiresAt, locale)} · {copy.updated} {formatDate(selectedLive.updatedAt, locale)}</small></div><button className={styles.dangerOutline} onClick={() => void run("activity-stop", async () => stopActivityLiveLocationWeb(selectedLive.id))}>{copy.stopShare}</button></div> : <><p className={styles.choiceLabel}>{copy.duration}</p><div className={styles.durationRow}>{TRUSTED_DURATIONS.map((minutes) => <button key={minutes} data-active={activityDuration === minutes} onClick={() => setActivityDuration(minutes)}>{durationLabel(minutes, locale)}</button>)}</div><button className={styles.primaryButton} onClick={() => void run("activity-start", async () => { await startActivityLiveLocationWeb(selectedActivity, activityDuration, locale); })}>{copy.startShare}</button></>}
          </article>}
        </Section>

        <Section title={copy.safetyCheckin}>
          {!selectedActivity ? <EmptyCard title={copy.safetyCheckin} text={copy.checkinEmpty}/> : <article className={styles.activityCard}>
            <ActivitySelector activities={data.activities} selectedKey={selectedActivity.key} onChange={setSelectedActivityKey}/><ActivityHeader activity={selectedActivity}/>
            {selectedCheckIn ? <div className={styles.checkinActive}><div><strong>{selectedCheckIn.status === "overdue" ? copy.overdue : `${copy.confirmBy} ${formatDate(selectedCheckIn.dueAt, locale)}`}</strong>{selectedCheckIn.note ? <p>{selectedCheckIn.note}</p> : null}</div><div><button className={styles.safeButton} onClick={() => void run("checkin-safe", async () => markSafetyCheckInSafeWeb(selectedCheckIn.id))}>{copy.safe}</button><button className={styles.textButton} onClick={() => void run("checkin-cancel", async () => cancelSafetyCheckInWeb(selectedCheckIn.id))}>{copy.cancel}</button></div></div> : <><div className={styles.durationRow}>{CHECKIN_DURATIONS.map((minutes) => <button key={minutes} data-active={checkinDuration === minutes} onClick={() => setCheckinDuration(minutes)}>{durationLabel(minutes, locale)}</button>)}</div><textarea className={styles.noteInput} value={checkinNote} onChange={(event) => setCheckinNote(event.target.value)} placeholder={copy.checkinNote} maxLength={240}/><button className={styles.primaryButton} onClick={() => void run("checkin-create", async () => { await createSafetyCheckInWeb(selectedActivity, checkinDuration, checkinNote); setCheckinNote(""); })}>{copy.createCheckin}</button></>}
          </article>}
        </Section>

        <div className={styles.noticeCard}><strong>{copy.emergency}</strong><p>{copy.emergencyHint}</p></div>
      </> : <>
        <div className={styles.friendIntro}><div><h2>{copy.friends}</h2><p>{visibleViewers.some((item) => item.sosActive) ? `${copy.sos} · ${visibleViewers.length}` : `${visibleViewers.length} ${copy.live}`}</p></div></div>
        <div className={styles.friendSubtabs}><button data-active={friendFilter === "all"} onClick={() => setFriendFilter("all")}>{copy.all}<b>{directViewers.length + tripViewers.length}</b></button><button data-active={friendFilter === "friend"} onClick={() => setFriendFilter("friend")}>{copy.friend}<b>{directViewers.length}</b></button><button data-active={friendFilter === "trip"} onClick={() => setFriendFilter("trip")}>{copy.tripFriend}<b>{tripViewers.length}</b></button></div>
        <Section title={copy.sharedWithMe}>
          {visibleViewers.length === 0 ? <EmptyCard title={copy.sharedWithMe} text={copy.noneShared}/> : <div className={styles.viewerList}>{visibleViewers.map((item) => {
            const stale = !item.sosActive && Date.now() - new Date(item.updatedAt).getTime() > 10 * 60 * 1000;
            const status = item.sosActive ? copy.sos : stale ? copy.stale : copy.live;
            const detailHref = `/safety/live/${item.source === "friend" ? "friend" : "activity"}/${encodeURIComponent(item.sessionId)}`;
            return <article className={styles.viewerCard} key={item.id} data-sos={item.sosActive} role="link" tabIndex={0} onClick={() => router.push(detailHref)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(detailHref); } }}>
              <VerifiedUserAvatar userId={item.ownerId} name={item.displayName} src={item.photoUrl} size={50}/><div><div className={styles.viewerTitle}><strong>{item.displayName}</strong><span data-status={item.sosActive ? "sos" : stale ? "stale" : "live"}>{status}</span></div><p>{item.context || (item.source === "friend" ? copy.friend : copy.tripFriend)}</p><small>{copy.updated} {formatDate(item.updatedAt, locale)} · {copy.expires} {formatDate(item.expiresAt, locale)}</small>{item.sosActive && item.sosMessage ? <em>{item.sosMessage}</em> : null}</div><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.latitude},${item.longitude}`)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{copy.openMap} ↗</a>
            </article>;
          })}</div>}
        </Section>
        <div className={styles.noticeCard}><strong>{copy.automatic}</strong><p>{copy.automaticText}</p></div>
      </>}
    </section>

    {medicalOpen ? <Modal title={medical ? copy.edit : copy.add} onClose={() => setMedicalOpen(false)}>
      <div className={styles.medicalForm}>
        <label><span>{copy.legalName}</span><input value={medicalDraft.legalFullName} onChange={(e) => setMedicalDraft((current) => ({ ...current, legalFullName: e.target.value }))}/></label>
        <label><span>{copy.dob}</span><input type="date" value={medicalDraft.dateOfBirth} onChange={(e) => setMedicalDraft((current) => ({ ...current, dateOfBirth: e.target.value }))}/></label>
        <label><span>{copy.blood}</span><select value={medicalDraft.bloodType} onChange={(e) => setMedicalDraft((current) => ({ ...current, bloodType: e.target.value }))}>{BLOOD_TYPES.map((item) => <option key={item || "none"} value={item}>{item || copy.notSet}</option>)}</select></label>
        <label><span>{copy.hospital}</span><input value={medicalDraft.regularHospital} onChange={(e) => setMedicalDraft((current) => ({ ...current, regularHospital: e.target.value }))}/></label>
        <label className={styles.fullField}><span>{copy.conditions}</span><textarea value={medicalDraft.medicalConditions} onChange={(e) => setMedicalDraft((current) => ({ ...current, medicalConditions: e.target.value }))}/></label>
        <label className={styles.fullField}><span>{copy.allergies}</span><textarea value={medicalDraft.allergies} onChange={(e) => setMedicalDraft((current) => ({ ...current, allergies: e.target.value }))}/></label>
        <label className={styles.fullField}><span>{copy.medications}</span><textarea value={medicalDraft.medications} onChange={(e) => setMedicalDraft((current) => ({ ...current, medications: e.target.value }))}/></label>
        <label className={styles.fullField}><span>{copy.notes}</span><textarea value={medicalDraft.medicalNotes} onChange={(e) => setMedicalDraft((current) => ({ ...current, medicalNotes: e.target.value }))}/></label>
      </div>
      <div className={styles.contactEditor}>{[0, 1].map((index) => { const contact = medicalDraft.emergencyContacts[index] ?? { name: "", relation: "", phone: "" }; return <div className={styles.contactRow} key={index}><strong>{copy.contact} {index + 1}</strong><input placeholder={copy.legalName} value={contact.name} onChange={(e) => setMedicalDraft((current) => ({ ...current, emergencyContacts: current.emergencyContacts.map((item, idx) => idx === index ? { ...item, name: e.target.value } : item) }))}/><input placeholder={copy.relation} value={contact.relation} onChange={(e) => setMedicalDraft((current) => ({ ...current, emergencyContacts: current.emergencyContacts.map((item, idx) => idx === index ? { ...item, relation: e.target.value } : item) }))}/><input placeholder={copy.phone} value={contact.phone} onChange={(e) => setMedicalDraft((current) => ({ ...current, emergencyContacts: current.emergencyContacts.map((item, idx) => idx === index ? { ...item, phone: e.target.value } : item) }))}/></div>; })}</div>
      <div className={styles.modalActions}><button onClick={() => setMedicalOpen(false)}>{copy.cancel}</button><button className={styles.primaryButton} disabled={busy === "medical"} onClick={() => void saveMedical()}>{copy.save}</button></div>
    </Modal> : null}

    {friendPickerOpen ? <Modal title={copy.selectFriends} onClose={() => setFriendPickerOpen(false)}>
      <div className={styles.durationRow}>{TRUSTED_DURATIONS.map((minutes) => <button key={minutes} data-active={trustedDuration === minutes} onClick={() => setTrustedDuration(minutes)}>{durationLabel(minutes, locale)}</button>)}</div>
      <p className={styles.pickerHint}>{selectedFriendIds.length}/3 · {copy.maxThree}</p>
      <div className={styles.pickerList}>{data.friends.map((friend) => <button key={friend.userId} className={styles.pickerRow} data-selected={selectedFriendIds.includes(friend.userId)} onClick={() => toggleFriend(friend.userId)}><VerifiedUserAvatar userId={friend.userId} name={friend.displayName} src={friend.photoUrl} country={friend.country} size={44}/><span><strong>{friend.displayName}</strong><small>{[friend.city, friend.country].filter(Boolean).join(" · ")}</small></span><b>{selectedFriendIds.includes(friend.userId) ? "✓" : "+"}</b></button>)}</div>
      <div className={styles.modalActions}><button onClick={() => setFriendPickerOpen(false)}>{copy.cancel}</button><button className={styles.primaryButton} onClick={() => void startTrusted()}>{copy.startTrusted}</button></div>
    </Modal> : null}

    {memberPickerActivity ? <Modal title={copy.chooseMembers} onClose={() => setMemberPickerActivity(null)}>
      <p className={styles.pickerHint}>{memberPickerActivity.contextType.toUpperCase()} · {memberPickerActivity.title} · {copy.selectedCount} {selectedMemberIds.length}</p>
      <div className={styles.pickerList}>{activityMembers.length ? activityMembers.filter((member) => member.userId !== data.userId).map((member) => <button key={member.userId} className={styles.pickerRow} data-selected={selectedMemberIds.includes(member.userId)} onClick={() => setSelectedMemberIds((current) => current.includes(member.userId) ? current.filter((id) => id !== member.userId) : [...current, member.userId])}><VerifiedUserAvatar userId={member.userId} name={member.displayName} src={member.photoUrl} size={44}/><span><strong>{member.displayName}</strong><small>{member.isOrganizer ? copy.organizerOnly : copy.allMembers}</small></span><b>{selectedMemberIds.includes(member.userId) ? "✓" : "+"}</b></button>) : <div className={styles.emptyMini}>{copy.noMembers}</div>}</div>
      <div className={styles.modalActions}><button onClick={() => setMemberPickerActivity(null)}>{copy.cancel}</button><button className={styles.primaryButton} onClick={() => void saveSelectedMembers()}>{copy.save}</button></div>
    </Modal> : null}
  </main>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={styles.section}><h2>{title}</h2>{children}</section>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <div className={styles.infoBox}><small>{label}</small><strong>{value}</strong></div>;
}

function DetailLine({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className={styles.detailLine}><span>{label}</span><strong data-danger={danger}>{value}</strong></div>;
}

function ActivityHeader({ activity }: { activity: SafetyActivityWeb }) {
  return <div className={styles.activityHeader}><div className={styles.activityImage}>{activity.imageUrl ? <img src={activity.imageUrl} alt=""/> : <span>{activity.contextType === "trip" ? "⌖" : "◉"}</span>}</div><div><small>{activity.contextType.toUpperCase()} · ✓</small><strong>{activity.title}</strong><p>{activity.locationLabel}</p></div></div>;
}

function ActivitySelector({ activities, selectedKey, onChange }: { activities: SafetyActivityWeb[]; selectedKey: string; onChange: (key: string) => void }) {
  if (activities.length < 2) return null;
  return <div className={styles.activitySelector}>{activities.map((activity) => <button key={activity.key} data-active={activity.key === selectedKey} onClick={() => onChange(activity.key)}>{activity.contextType === "trip" ? "Trip" : "Event"} · {activity.title}</button>)}</div>;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className={styles.choice} data-active={active} onClick={onClick}>{children}</button>;
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return <div className={styles.emptyCard}><strong>{title}</strong><p>{text}</p></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className={styles.modal}><header><h2>{title}</h2><button onClick={onClose}>×</button></header>{children}</section></div>;
}

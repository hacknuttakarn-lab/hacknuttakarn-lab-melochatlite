"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import { rpcRequest } from "@/lib/supabase/browser";

import {
  saveActivityCoverWeb,
  saveActivityGalleryWeb,
  saveTripItineraryWeb,
  saveTripRouteCoordinatesWeb,
  saveTripStopsWeb,
  updateActivityCreationFields,
  validateActivityImage,
} from "@/components/activity/activityMediaWeb";

import PlaceSearchInput, {
  type PlaceSearchResult,
} from "@/components/location/PlaceSearchInput";

import {
  getCurrentMeloPlace,
} from "@/components/location/meloLocationWeb";

import styles from "./CreateTripWebExperience.module.css";


const CATEGORIES = [
  "ROAD TRIP",
  "CAMPING & OUTDOOR",
  "HIKING & TREKKING",
  "BEACH & ISLAND",
  "WATER ADVENTURE",
  "SNOW & WINTER TRIP",
  "FOOD & CAFE TRIP",
  "CITY & SIGHTSEEING",
  "NATURE & RELAX",
  "FESTIVAL & EVENT TRIP",
  "PHOTOGRAPHY & CONTENT TRIP",
  "CULTURE & LOCAL EXPERIENCE",
  "WELLNESS & RETREAT",
  "BACKPACKING & BUDGET TRAVEL",
  "OTHER",
] as const;


const CATEGORY_LABELS:
  Record<
    string,
    Record<string, string>
  > = {
  th: {
    "ROAD TRIP":
      "โรดทริป",

    "CAMPING & OUTDOOR":
      "แคมป์ปิ้ง & เอาต์ดอร์",

    "HIKING & TREKKING":
      "เดินป่า & เทรคกิ้ง",

    "BEACH & ISLAND":
      "ทะเล & เกาะ",

    "WATER ADVENTURE":
      "กิจกรรมทางน้ำ",

    "SNOW & WINTER TRIP":
      "หิมะ & ฤดูหนาว",

    "FOOD & CAFE TRIP":
      "อาหาร & คาเฟ่",

    "CITY & SIGHTSEEING":
      "เที่ยวเมือง & ชมวิว",

    "NATURE & RELAX":
      "ธรรมชาติ & พักผ่อน",

    "FESTIVAL & EVENT TRIP":
      "เทศกาล & อีเวนต์",

    "PHOTOGRAPHY & CONTENT TRIP":
      "ถ่ายภาพ & คอนเทนต์",

    "CULTURE & LOCAL EXPERIENCE":
      "วัฒนธรรม & วิถีท้องถิ่น",

    "WELLNESS & RETREAT":
      "เวลเนส & รีทรีต",

    "BACKPACKING & BUDGET TRAVEL":
      "แบ็กแพ็ก & ประหยัด",

    OTHER:
      "อื่น ๆ",
  },

  en: {},

  de: {
    "ROAD TRIP":
      "Roadtrip",

    "CAMPING & OUTDOOR":
      "Camping & Outdoor",

    "HIKING & TREKKING":
      "Wandern & Trekking",

    "BEACH & ISLAND":
      "Strand & Insel",

    "WATER ADVENTURE":
      "Wasserabenteuer",

    "SNOW & WINTER TRIP":
      "Schnee & Winter",

    "FOOD & CAFE TRIP":
      "Essen & Cafés",

    "CITY & SIGHTSEEING":
      "Stadt & Sightseeing",

    "NATURE & RELAX":
      "Natur & Erholung",

    "FESTIVAL & EVENT TRIP":
      "Festival & Event",

    "PHOTOGRAPHY & CONTENT TRIP":
      "Fotografie & Content",

    "CULTURE & LOCAL EXPERIENCE":
      "Kultur & Lokales",

    "WELLNESS & RETREAT":
      "Wellness & Retreat",

    "BACKPACKING & BUDGET TRAVEL":
      "Backpacking & Budget",

    OTHER:
      "Andere",
  },

  zh: {
    "ROAD TRIP":
      "公路旅行",

    "CAMPING & OUTDOOR":
      "露营与户外",

    "HIKING & TREKKING":
      "徒步与登山",

    "BEACH & ISLAND":
      "海滩与海岛",

    "WATER ADVENTURE":
      "水上冒险",

    "SNOW & WINTER TRIP":
      "冰雪与冬季",

    "FOOD & CAFE TRIP":
      "美食与咖啡",

    "CITY & SIGHTSEEING":
      "城市与观光",

    "NATURE & RELAX":
      "自然与放松",

    "FESTIVAL & EVENT TRIP":
      "节庆与活动",

    "PHOTOGRAPHY & CONTENT TRIP":
      "摄影与内容",

    "CULTURE & LOCAL EXPERIENCE":
      "文化与当地体验",

    "WELLNESS & RETREAT":
      "疗愈与静修",

    "BACKPACKING & BUDGET TRAVEL":
      "背包与经济旅行",

    OTHER:
      "其他",
  },

  ja: {
    "ROAD TRIP":
      "ロードトリップ",

    "CAMPING & OUTDOOR":
      "キャンプ & アウトドア",

    "HIKING & TREKKING":
      "ハイキング & トレッキング",

    "BEACH & ISLAND":
      "ビーチ & 島",

    "WATER ADVENTURE":
      "ウォーターアクティビティ",

    "SNOW & WINTER TRIP":
      "雪 & 冬旅",

    "FOOD & CAFE TRIP":
      "グルメ & カフェ",

    "CITY & SIGHTSEEING":
      "街歩き & 観光",

    "NATURE & RELAX":
      "自然 & リラックス",

    "FESTIVAL & EVENT TRIP":
      "フェス & イベント",

    "PHOTOGRAPHY & CONTENT TRIP":
      "写真 & コンテンツ",

    "CULTURE & LOCAL EXPERIENCE":
      "文化 & ローカル体験",

    "WELLNESS & RETREAT":
      "ウェルネス & リトリート",

    "BACKPACKING & BUDGET TRAVEL":
      "バックパック & 節約旅",

    OTHER:
      "その他",
  },

  ko: {
    "ROAD TRIP":
      "로드 트립",

    "CAMPING & OUTDOOR":
      "캠핑 & 아웃도어",

    "HIKING & TREKKING":
      "하이킹 & 트레킹",

    "BEACH & ISLAND":
      "해변 & 섬",

    "WATER ADVENTURE":
      "수상 액티비티",

    "SNOW & WINTER TRIP":
      "눈 & 겨울 여행",

    "FOOD & CAFE TRIP":
      "맛집 & 카페",

    "CITY & SIGHTSEEING":
      "도시 & 관광",

    "NATURE & RELAX":
      "자연 & 휴식",

    "FESTIVAL & EVENT TRIP":
      "축제 & 이벤트",

    "PHOTOGRAPHY & CONTENT TRIP":
      "사진 & 콘텐츠",

    "CULTURE & LOCAL EXPERIENCE":
      "문화 & 로컬 체험",

    "WELLNESS & RETREAT":
      "웰니스 & 리트리트",

    "BACKPACKING & BUDGET TRAVEL":
      "배낭 & 절약 여행",

    OTHER:
      "기타",
  },
};


const COPY = {
  th: {
    back:
      "กลับหน้าทริป",

    title:
      "สร้างทริป",

    subtitle:
      "สร้างทริปพร้อมรูปภาพ และวางเวลา รายละเอียด และสถานที่ของแต่ละวันในที่เดียว",

    basicInformation:
      "ข้อมูลทริป",

    publishHint:
      "ทริปของคุณจะเผยแพร่และแสดงให้ผู้ใช้ Melo เห็นเมื่อสร้างสำเร็จ",

    activityImage:
      "รูปกิจกรรม",

    activityImageDesc:
      "เพิ่มรูปหน้าปกเพื่อให้ทริปของคุณโดดเด่นขึ้นในรายการ",

    noActivityImage:
      "ยังไม่มีรูปกิจกรรม กดเพื่อเลือกรูปหน้าปกทริป",

    addImage:
      "เพิ่มรูป",

    changeImage:
      "เปลี่ยนรูป",

    remove:
      "ลบ",

    additionalPhotos:
      "รูปเพิ่มเติม",

    additionalPhotosDesc:
      "เพิ่มรูปประกอบเพื่อช่วยให้สมาชิกตัดสินใจได้ง่ายขึ้น เพิ่มได้สูงสุด 8 รูป",

    noAdditionalPhotos:
      "ยังไม่มีรูปเพิ่มเติม",

    addPhotos:
      "+ เพิ่มรูป",

    tripType:
      "ประเภททริป",

    tripName:
      "ชื่อทริป *",

    details:
      "รายละเอียด",

    startDate:
      "วันเริ่มต้น *",

    endDate:
      "วันสิ้นสุด",

    selectStartDate:
      "เลือกวันเริ่มต้น",

    selectEndDate:
      "เลือกวันสิ้นสุด",

    numberPeople:
      "จำนวนคน",

    budgetPerson:
      "งบประมาณ/คน",

    travelDetails:
      "รายละเอียดการเดินทาง",

    travelDetailsHint:
      "จัดแผนตามวัน โดยกรอกเวลา รายละเอียด และสถานที่ ระบบจะนำสถานที่ที่เลือกมาสร้างเส้นทางให้อัตโนมัติ",

    day:
      "วันที่",

    dayPending:
      "วันเดินทางจะแสดงหลังเลือกวันเริ่มต้น",

    travelTime:
      "เวลา",

    travelDescription:
      "รายละเอียด",

    travelDescriptionPlaceholder:
      "เช่น นัดรวมตัว รับประทานอาหาร เดินทางไปน้ำตก",

    travelPlace:
      "สถานที่",

    searchPlace:
      "ค้นหาสถานที่ เช่น เชียงใหม่, Central",

    placeSelectHint:
      "เลือกสถานที่จากผลการค้นหาเพื่อบันทึกพิกัดและสร้างเส้นทางอัตโนมัติ",

    myLocation:
      "ตำแหน่งของฉัน",

    currentLocation:
      "ตำแหน่งปัจจุบัน",

    addTravelDetail:
      "+ เพิ่มรายละเอียดการเดินทาง",

    addNextDay:
      "+ เพิ่มข้อมูลวันถัดไป",

    emptyDay:
      "ยังไม่มีรายละเอียดการเดินทางในวันนี้",

    autoRoute:
      "เส้นทางสรุปอัตโนมัติ",

    autoRouteHint:
      "ระบบจะเรียงสถานที่ตามวันและลำดับรายการ โดยสถานที่แรกเป็นจุดเริ่มต้น สถานที่สุดท้ายเป็นจุดหมาย",

    noAutoRoute:
      "ยังไม่มีสถานที่ที่เลือกจากผลการค้นหา",

    travelDetailDefault:
      "รายละเอียดการเดินทาง",

    moveUp:
      "เลื่อนขึ้น",

    moveDown:
      "เลื่อนลง",

    primaryLanguage:
      "ภาษาหลัก",

    publish:
      "เผยแพร่ทริป",

    publishing:
      "กำลังสร้างและอัปโหลดรูป…",

    required:
      "กรุณากรอกข้อมูลที่จำเป็นให้ครบ",

    routeRequired:
      "กรุณาเลือกสถานที่อย่างน้อย 1 แห่งจากผลการค้นหาในรายละเอียดการเดินทาง",

    endBeforeStart:
      "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น",

    imageTooLarge:
      "รูปภาพต้องมีขนาดไม่เกิน 12 MB",

    imageType:
      "กรุณาเลือกไฟล์รูปภาพ",

    imageLimit:
      "เพิ่มรูปภาพเพิ่มเติมได้สูงสุด 8 รูป",

    locationDenied:
      "ไม่สามารถอ่านตำแหน่งของคุณได้",

    searchingPlaces:
      "กำลังค้นหาสถานที่…",

    noPlaces:
      "ไม่พบสถานที่ที่ตรงกับคำค้น",
  },

  en: {
    back:
      "Back to Trips",

    title:
      "Create Trip",

    subtitle:
      "Create your trip with photos and plan the time, details and places for each travel day in one place.",

    basicInformation:
      "Basic information",

    publishHint:
      "Your trip will be public and visible to Melo users after publishing.",

    activityImage:
      "Activity image",

    activityImageDesc:
      "Add a cover image so your trip is more eye-catching in the list.",

    noActivityImage:
      "No activity image yet. Tap to choose a trip cover image.",

    addImage:
      "Add image",

    changeImage:
      "Change image",

    remove:
      "Remove",

    additionalPhotos:
      "Additional photos",

    additionalPhotosDesc:
      "Add supporting photos to help people decide. Up to 8 images.",

    noAdditionalPhotos:
      "No additional photos yet",

    addPhotos:
      "+ Add photos",

    tripType:
      "Trip type",

    tripName:
      "Trip name *",

    details:
      "Details",

    startDate:
      "Start date *",

    endDate:
      "End date",

    selectStartDate:
      "Select start date",

    selectEndDate:
      "Select end date",

    numberPeople:
      "Number of people",

    budgetPerson:
      "Budget/person",

    travelDetails:
      "Travel details",

    travelDetailsHint:
      "Plan each day with a time, details and place. Selected places are used to build the trip route automatically.",

    day:
      "Day",

    dayPending:
      "The travel date will appear after selecting a start date.",

    travelTime:
      "Time",

    travelDescription:
      "Details",

    travelDescriptionPlaceholder:
      "Example: Meet up, lunch, travel to the waterfall",

    travelPlace:
      "Place",

    searchPlace:
      "Search a place, e.g. Chiang Mai, Central",

    placeSelectHint:
      "Choose a result to save its coordinates and include it in the automatic route.",

    myLocation:
      "My location",

    currentLocation:
      "Current location",

    addTravelDetail:
      "+ Add travel detail",

    addNextDay:
      "+ Add next day",

    emptyDay:
      "No travel details have been added for this day.",

    autoRoute:
      "Automatic route summary",

    autoRouteHint:
      "Places follow the day and item order. The first selected place becomes the origin and the last becomes the destination.",

    noAutoRoute:
      "No place has been selected from the search results yet.",

    travelDetailDefault:
      "Travel detail",

    moveUp:
      "Move up",

    moveDown:
      "Move down",

    primaryLanguage:
      "Primary language",

    publish:
      "Publish Trip",

    publishing:
      "Creating and uploading photos…",

    required:
      "Please complete all required fields",

    routeRequired:
      "Please select at least one place from the search results in Travel details.",

    endBeforeStart:
      "End date cannot be before start date",

    imageTooLarge:
      "Images must be no larger than 12 MB",

    imageType:
      "Please choose an image file",

    imageLimit:
      "Up to 8 additional photos",

    locationDenied:
      "Unable to read your location",

    searchingPlaces:
      "Searching places…",

    noPlaces:
      "No matching places found",
  },

  de: {
    back:
      "Zurück zu Reisen",

    title:
      "Reise erstellen",

    subtitle:
      "Erstelle deine Reise mit Fotos und plane Zeit, Details und Orte für jeden Reisetag an einem Ort.",

    basicInformation:
      "Grundinformationen",

    publishHint:
      "Nach der Veröffentlichung ist deine Reise für Melo-Nutzer sichtbar.",

    activityImage:
      "Aktivitätsbild",

    activityImageDesc:
      "Füge ein Titelbild hinzu, damit deine Reise in der Liste auffällt.",

    noActivityImage:
      "Noch kein Bild. Klicken, um ein Titelbild auszuwählen.",

    addImage:
      "Bild hinzufügen",

    changeImage:
      "Bild ändern",

    remove:
      "Entfernen",

    additionalPhotos:
      "Weitere Fotos",

    additionalPhotosDesc:
      "Füge unterstützende Fotos hinzu. Bis zu 8 Bilder.",

    noAdditionalPhotos:
      "Noch keine weiteren Fotos",

    addPhotos:
      "+ Fotos hinzufügen",

    tripType:
      "Reisetyp",

    tripName:
      "Reisename *",

    details:
      "Details",

    startDate:
      "Startdatum *",

    endDate:
      "Enddatum",

    selectStartDate:
      "Startdatum wählen",

    selectEndDate:
      "Enddatum wählen",

    numberPeople:
      "Personenzahl",

    budgetPerson:
      "Budget/Person",

    travelDetails:
      "Reisedetails",

    travelDetailsHint:
      "Plane jeden Tag mit Zeit, Beschreibung und Ort. Ausgewählte Orte werden automatisch zur Route zusammengefügt.",

    day:
      "Tag",

    dayPending:
      "Das Reisedatum erscheint nach Auswahl des Startdatums.",

    travelTime:
      "Zeit",

    travelDescription:
      "Details",

    travelDescriptionPlaceholder:
      "z. B. Treffpunkt, Mittagessen, Fahrt zum Wasserfall",

    travelPlace:
      "Ort",

    searchPlace:
      "Ort suchen, z. B. Chiang Mai, Central",

    placeSelectHint:
      "Wähle einen Suchtreffer, damit Koordinaten gespeichert und die Route erstellt werden kann.",

    myLocation:
      "Mein Standort",

    currentLocation:
      "Aktueller Standort",

    addTravelDetail:
      "+ Reisedetail hinzufügen",

    addNextDay:
      "+ Nächsten Tag hinzufügen",

    emptyDay:
      "Für diesen Tag wurden noch keine Reisedetails hinzugefügt.",

    autoRoute:
      "Automatische Routenübersicht",

    autoRouteHint:
      "Die Orte folgen der Tages- und Eintragsreihenfolge. Der erste Ort ist der Start, der letzte das Ziel.",

    noAutoRoute:
      "Noch kein Ort aus den Suchergebnissen ausgewählt.",

    travelDetailDefault:
      "Reisedetail",

    moveUp:
      "Nach oben",

    moveDown:
      "Nach unten",

    primaryLanguage:
      "Hauptsprache",

    publish:
      "Reise veröffentlichen",

    publishing:
      "Reise und Bilder werden gespeichert…",

    required:
      "Bitte alle Pflichtfelder ausfüllen",

    routeRequired:
      "Bitte mindestens einen Ort aus den Suchergebnissen in den Reisedetails auswählen.",

    endBeforeStart:
      "Enddatum darf nicht vor Startdatum liegen",

    imageTooLarge:
      "Bilder dürfen höchstens 12 MB groß sein",

    imageType:
      "Bitte Bilddatei wählen",

    imageLimit:
      "Bis zu 8 weitere Bilder",

    locationDenied:
      "Standort konnte nicht gelesen werden",

    searchingPlaces:
      "Orte werden gesucht…",

    noPlaces:
      "Keine passenden Orte gefunden",
  },

  zh: {
    back:
      "返回旅行",

    title:
      "创建旅行",

    subtitle:
      "添加旅行照片，并按天规划时间、详情和地点。",

    basicInformation:
      "基本信息",

    publishHint:
      "发布后，你的旅行将对 Melo 用户公开可见。",

    activityImage:
      "活动图片",

    activityImageDesc:
      "添加封面图，让你的旅行在列表中更醒目。",

    noActivityImage:
      "暂无活动图片。点击选择旅行封面。",

    addImage:
      "添加图片",

    changeImage:
      "更换图片",

    remove:
      "删除",

    additionalPhotos:
      "更多照片",

    additionalPhotosDesc:
      "添加辅助照片，帮助大家了解旅行。最多 8 张。",

    noAdditionalPhotos:
      "暂无更多照片",

    addPhotos:
      "+ 添加图片",

    tripType:
      "旅行类型",

    tripName:
      "旅行名称 *",

    details:
      "详情",

    startDate:
      "开始日期 *",

    endDate:
      "结束日期",

    selectStartDate:
      "选择开始日期",

    selectEndDate:
      "选择结束日期",

    numberPeople:
      "人数",

    budgetPerson:
      "人均预算",

    travelDetails:
      "旅行详情",

    travelDetailsHint:
      "按天填写时间、详情和地点。所选地点会自动生成旅行路线。",

    day:
      "第",

    dayPending:
      "选择开始日期后会显示旅行日期。",

    travelTime:
      "时间",

    travelDescription:
      "详情",

    travelDescriptionPlaceholder:
      "例如：集合、午餐、前往瀑布",

    travelPlace:
      "地点",

    searchPlace:
      "搜索地点，例如 Chiang Mai、Central",

    placeSelectHint:
      "请从搜索结果中选择地点，以保存坐标并加入自动路线。",

    myLocation:
      "我的位置",

    currentLocation:
      "当前位置",

    addTravelDetail:
      "+ 添加旅行详情",

    addNextDay:
      "+ 添加下一天",

    emptyDay:
      "当天还没有旅行详情。",

    autoRoute:
      "自动路线摘要",

    autoRouteHint:
      "地点按照日期和项目顺序排列，第一个地点作为起点，最后一个作为终点。",

    noAutoRoute:
      "尚未从搜索结果中选择地点。",

    travelDetailDefault:
      "旅行详情",

    moveUp:
      "上移",

    moveDown:
      "下移",

    primaryLanguage:
      "主要语言",

    publish:
      "发布旅行",

    publishing:
      "正在创建并上传图片…",

    required:
      "请填写所有必填信息",

    routeRequired:
      "请在旅行详情中至少从搜索结果选择一个地点。",

    endBeforeStart:
      "结束日期不能早于开始日期",

    imageTooLarge:
      "图片不能超过 12 MB",

    imageType:
      "请选择图片文件",

    imageLimit:
      "最多 8 张附加图片",

    locationDenied:
      "无法获取你的位置",

    searchingPlaces:
      "正在搜索地点…",

    noPlaces:
      "未找到匹配的地点",
  },

  ja: {
    back:
      "Trip一覧へ戻る",

    title:
      "Tripを作成",

    subtitle:
      "写真を追加し、各日の時間・詳細・場所をまとめて計画できます。",

    basicInformation:
      "基本情報",

    publishHint:
      "公開すると、このTripはMeloユーザーに表示されます。",

    activityImage:
      "アクティビティ画像",

    activityImageDesc:
      "一覧で目を引くようにTripのカバー画像を追加します。",

    noActivityImage:
      "画像はまだありません。クリックしてTripのカバーを選択。",

    addImage:
      "画像を追加",

    changeImage:
      "画像を変更",

    remove:
      "削除",

    additionalPhotos:
      "追加写真",

    additionalPhotosDesc:
      "Trip選びの参考になる写真を最大8枚追加できます。",

    noAdditionalPhotos:
      "追加写真はまだありません",

    addPhotos:
      "+ 写真を追加",

    tripType:
      "Tripタイプ",

    tripName:
      "Trip名 *",

    details:
      "詳細",

    startDate:
      "開始日 *",

    endDate:
      "終了日",

    selectStartDate:
      "開始日を選択",

    selectEndDate:
      "終了日を選択",

    numberPeople:
      "人数",

    budgetPerson:
      "1人あたり予算",

    travelDetails:
      "旅行詳細",

    travelDetailsHint:
      "日ごとに時間・詳細・場所を入力します。選択した場所からルートを自動作成します。",

    day:
      "Day",

    dayPending:
      "開始日を選択すると旅行日が表示されます。",

    travelTime:
      "時間",

    travelDescription:
      "詳細",

    travelDescriptionPlaceholder:
      "例：集合、昼食、滝へ移動",

    travelPlace:
      "場所",

    searchPlace:
      "場所を検索 例: Chiang Mai, Central",

    placeSelectHint:
      "検索結果から選ぶと座標が保存され、自動ルートに追加されます。",

    myLocation:
      "現在地",

    currentLocation:
      "現在地",

    addTravelDetail:
      "+ 旅行詳細を追加",

    addNextDay:
      "+ 次の日を追加",

    emptyDay:
      "この日の旅行詳細はまだありません。",

    autoRoute:
      "自動ルート概要",

    autoRouteHint:
      "場所は日と項目の順に並び、最初の場所が出発地、最後の場所が目的地になります。",

    noAutoRoute:
      "検索結果から選択された場所はまだありません。",

    travelDetailDefault:
      "旅行詳細",

    moveUp:
      "上へ",

    moveDown:
      "下へ",

    primaryLanguage:
      "メイン言語",

    publish:
      "Tripを公開",

    publishing:
      "Tripと写真を保存中…",

    required:
      "必須項目を入力してください",

    routeRequired:
      "旅行詳細で検索結果から少なくとも1つの場所を選択してください。",

    endBeforeStart:
      "終了日は開始日より前にできません",

    imageTooLarge:
      "画像は12MB以下にしてください",

    imageType:
      "画像ファイルを選択してください",

    imageLimit:
      "追加画像は最大8枚",

    locationDenied:
      "位置情報を取得できませんでした",

    searchingPlaces:
      "場所を検索中…",

    noPlaces:
      "一致する場所が見つかりません",
  },

  ko: {
    back:
      "여행 목록으로",

    title:
      "여행 만들기",

    subtitle:
      "사진과 함께 날짜별 시간, 상세 내용과 장소를 한 화면에서 계획하세요.",

    basicInformation:
      "기본 정보",

    publishHint:
      "게시 후 이 여행은 Melo 사용자에게 공개됩니다.",

    activityImage:
      "활동 이미지",

    activityImageDesc:
      "목록에서 여행이 더 잘 보이도록 커버 이미지를 추가하세요.",

    noActivityImage:
      "아직 활동 이미지가 없습니다. 눌러서 여행 커버를 선택하세요.",

    addImage:
      "이미지 추가",

    changeImage:
      "이미지 변경",

    remove:
      "삭제",

    additionalPhotos:
      "추가 사진",

    additionalPhotosDesc:
      "여행 선택에 도움이 되는 사진을 최대 8장 추가하세요.",

    noAdditionalPhotos:
      "아직 추가 사진이 없습니다",

    addPhotos:
      "+ 사진 추가",

    tripType:
      "여행 유형",

    tripName:
      "여행 이름 *",

    details:
      "상세",

    startDate:
      "시작일 *",

    endDate:
      "종료일",

    selectStartDate:
      "시작일 선택",

    selectEndDate:
      "종료일 선택",

    numberPeople:
      "인원",

    budgetPerson:
      "1인 예산",

    travelDetails:
      "여행 상세",

    travelDetailsHint:
      "날짜별 시간, 상세 내용과 장소를 입력하세요. 선택한 장소로 여행 경로가 자동 생성됩니다.",

    day:
      "Day",

    dayPending:
      "시작일을 선택하면 여행 날짜가 표시됩니다.",

    travelTime:
      "시간",

    travelDescription:
      "상세",

    travelDescriptionPlaceholder:
      "예: 집합, 점심 식사, 폭포로 이동",

    travelPlace:
      "장소",

    searchPlace:
      "장소 검색 예: Chiang Mai, Central",

    placeSelectHint:
      "검색 결과에서 장소를 선택하면 좌표가 저장되고 자동 경로에 포함됩니다.",

    myLocation:
      "내 위치",

    currentLocation:
      "현재 위치",

    addTravelDetail:
      "+ 여행 상세 추가",

    addNextDay:
      "+ 다음 날 추가",

    emptyDay:
      "이 날짜에는 아직 여행 상세가 없습니다.",

    autoRoute:
      "자동 경로 요약",

    autoRouteHint:
      "장소는 날짜와 항목 순서대로 정렬되며 첫 장소가 출발지, 마지막 장소가 목적지가 됩니다.",

    noAutoRoute:
      "검색 결과에서 선택한 장소가 아직 없습니다.",

    travelDetailDefault:
      "여행 상세",

    moveUp:
      "위로",

    moveDown:
      "아래로",

    primaryLanguage:
      "주요 언어",

    publish:
      "여행 게시",

    publishing:
      "여행과 사진 저장 중…",

    required:
      "필수 정보를 모두 입력하세요",

    routeRequired:
      "여행 상세에서 검색 결과의 장소를 최소 1개 선택하세요.",

    endBeforeStart:
      "종료일은 시작일보다 빠를 수 없습니다",

    imageTooLarge:
      "이미지는 12MB 이하여야 합니다",

    imageType:
      "이미지 파일을 선택하세요",

    imageLimit:
      "추가 이미지는 최대 8장",

    locationDenied:
      "위치를 가져올 수 없습니다",

    searchingPlaces:
      "장소 검색 중…",

    noPlaces:
      "일치하는 장소가 없습니다",
  },
} as const;


type TripDay = {
  dayIndex: number;
  date: string;
};


type TravelDetailItem = {
  id: string;
  dayIndex: number;
  timeLabel: string;
  details: string;
  placeLabel: string;
  place: PlaceSearchResult | null;
};


const LANGUAGE_OPTIONS = [
  ["th", "ไทย"],
  ["en", "English"],
  ["de", "Deutsch"],
  ["zh", "中文"],
  ["ja", "日本語"],
  ["ko", "한국어"],
] as const;


const TRAVEL_UI:
  Record<
    string,
    CSSProperties
  > = {
  days: {
    display: "grid",
    gap: 14,
  },

  dayCard: {
    overflow: "hidden",
    border:
      "1px solid var(--border)",
    borderRadius: 18,
    background:
      "var(--surface-2)",
  },

  dayHead: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 12,
    padding: "13px 14px",
    borderBottom:
      "1px solid var(--border)",
  },

  dayTitle: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },

  dayTitleStrong: {
    color:
      "var(--text)",
    fontSize: 15,
    fontWeight: 900,
  },

  dayTitleDate: {
    color:
      "var(--text-secondary)",
    fontSize: 11,
    fontWeight: 700,
  },

  addButton: {
    minHeight: 38,
    border: 0,
    borderRadius: 11,
    padding: "0 14px",
    background:
      "var(--primary)",
    color: "#fff",
    font: "inherit",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  dayBody: {
    display: "grid",
    gap: 10,
    padding: 12,
  },

  emptyDay: {
    display: "grid",
    minHeight: 68,
    placeItems: "center",
    border:
      "1px dashed var(--border)",
    borderRadius: 13,
    color:
      "var(--text-secondary)",
    background:
      "var(--surface)",
    padding: 14,
    fontSize: 11,
    textAlign: "center",
  },

  itemCard: {
    display: "grid",
    gap: 11,
    border:
      "1px solid var(--border)",
    borderRadius: 15,
    background:
      "var(--surface)",
    padding: 12,
  },

  itemTop: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "flex-end",
  },

  timeField: {
    flex: "0 1 135px",
    minWidth: 115,
  },

  detailsField: {
    flex: "1 1 300px",
    minWidth: 180,
  },

  actions: {
    display: "flex",
    flex: "0 0 auto",
    alignItems: "center",
    gap: 6,
    paddingBottom: 1,
  },

  iconButton: {
    display: "grid",
    width: 36,
    height: 36,
    placeItems: "center",
    border:
      "1px solid var(--border)",
    borderRadius: 10,
    background:
      "var(--surface-2)",
    color:
      "var(--text-secondary)",
    font: "inherit",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
  },

  removeButton: {
    display: "grid",
    width: 36,
    height: 36,
    placeItems: "center",
    border:
      "1px solid color-mix(in srgb, #e94f64 25%, var(--border))",
    borderRadius: 10,
    background:
      "color-mix(in srgb, #e94f64 8%, var(--surface))",
    color: "#d9465c",
    font: "inherit",
    fontSize: 17,
    fontWeight: 900,
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.4,
    cursor: "not-allowed",
  },

  placeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "flex-end",
  },

  placeSearch: {
    flex: "1 1 420px",
    minWidth: 220,
  },

  placeHint: {
    display: "block",
    marginTop: 5,
    color:
      "var(--text-secondary)",
    fontSize: 10,
    lineHeight: 1.45,
  },

  locationButton: {
    flex: "0 0 auto",
    minHeight: 42,
    border:
      "1px solid color-mix(in srgb, var(--primary) 28%, var(--border))",
    borderRadius: 11,
    background:
      "var(--primary-soft)",
    color:
      "var(--primary)",
    padding: "0 13px",
    font: "inherit",
    fontSize: 10.5,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  routeCard: {
    display: "grid",
    gap: 12,
    marginTop: 16,
    border:
      "1px solid var(--border)",
    borderRadius: 16,
    background:
      "var(--surface-2)",
    padding: 14,
  },

  routeHeader: {
    display: "grid",
    gap: 4,
  },

  routeTitle: {
    margin: 0,
    color:
      "var(--text)",
    fontSize: 14,
    fontWeight: 900,
  },

  routeHint: {
    margin: 0,
    color:
      "var(--text-secondary)",
    fontSize: 10.5,
    lineHeight: 1.5,
  },

  routeList: {
    display: "grid",
    gap: 7,
  },

  routeRow: {
    display: "grid",
    gridTemplateColumns:
      "34px minmax(0, 1fr)",
    gap: 10,
    alignItems: "center",
    border:
      "1px solid var(--border)",
    borderRadius: 12,
    background:
      "var(--surface)",
    padding: "9px 10px",
  },

  routeMarker: {
    display: "grid",
    width: 30,
    height: 30,
    placeItems: "center",
    borderRadius: 10,
    background:
      "var(--primary-soft)",
    color:
      "var(--primary)",
    fontSize: 10,
    fontWeight: 950,
  },

  routeCopy: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },

  routeMeta: {
    color:
      "var(--text-secondary)",
    fontSize: 9.5,
    fontWeight: 750,
  },

  routePlace: {
    overflow: "hidden",
    color:
      "var(--text)",
    fontSize: 11.5,
    fontWeight: 850,
    lineHeight: 1.4,
    textOverflow:
      "ellipsis",
  },

  noRoute: {
    margin: 0,
    color:
      "var(--text-secondary)",
    fontSize: 11,
  },
};


function localCategory(
  locale: string,
  item: string,
) {
  return (
    CATEGORY_LABELS[
      locale
    ]?.[
      item
    ] ||
    item
  );
}


function localeTag(
  locale: string,
) {
  return (
    {
      th: "th-TH",
      en: "en-US",
      de: "de-DE",
      zh: "zh-CN",
      ja: "ja-JP",
      ko: "ko-KR",
    } as Record<
      string,
      string
    >
  )[
    locale
  ] ?? "en-US";
}


function parseDateInput(
  value: string,
) {
  if (!value) {
    return null;
  }

  const parts =
    value
      .split("-")
      .map(Number);

  if (
    parts.length !== 3 ||
    !parts[0] ||
    !parts[1] ||
    !parts[2]
  ) {
    return null;
  }

  const date =
    new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      12,
      0,
      0,
      0,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}


function dateInputValue(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return (
    `${year}-${month}-${day}`
  );
}


function buildTripDays(
  startDate: string,
  endDate: string,
): TripDay[] {
  if (!startDate) {
    return [
      {
        dayIndex: 0,
        date: "",
      },
    ];
  }

  const start =
    parseDateInput(
      startDate,
    );

  if (!start) {
    return [
      {
        dayIndex: 0,
        date:
          startDate,
      },
    ];
  }

  const requestedEnd =
    endDate
      ? parseDateInput(
          endDate,
        )
      : null;

  const end =
    requestedEnd &&
    requestedEnd.getTime() >=
      start.getTime()
      ? requestedEnd
      : start;

  const result:
    TripDay[] = [];

  const cursor =
    new Date(
      start,
    );

  /*
   * ป้องกันการ render จำนวนวันมหาศาล
   * จากวันที่ที่ผิดพลาดโดยไม่ตั้งใจ
   */
  while (
    cursor.getTime() <=
      end.getTime() &&
    result.length < 366
  ) {
    result.push({
      dayIndex:
        result.length,

      date:
        dateInputValue(
          cursor,
        ),
    });

    cursor.setDate(
      cursor.getDate() +
        1,
    );
  }

  return result.length
    ? result
    : [
        {
          dayIndex: 0,
          date:
            startDate,
        },
      ];
}


function formatTripDate(
  value: string,
  locale: string,
) {
  const date =
    parseDateInput(
      value,
    );

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(
    localeTag(
      locale,
    ),
    {
      weekday:
        "short",

      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}


function placeDisplayLabel(
  place:
    PlaceSearchResult,
) {
  return (
    [
      place.name,
      place.address,
    ]
      .filter(
        Boolean,
      )
      .join(
        " · ",
      ) ||
    place.name ||
    place.address ||
    ""
  );
}


function newTravelDetail(
  dayIndex: number,
  timeLabel = "09:00",
): TravelDetailItem {
  return {
    id:
      `travel-${dayIndex}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    dayIndex,

    timeLabel,

    details: "",

    placeLabel: "",

    place: null,
  };
}


function Preview({
  file,
  alt,
  className,
}: {
  file: File;
  alt: string;
  className?: string;
}) {
  const [
    url,
    setUrl,
  ] =
    useState("");

  useEffect(
    () => {
      const objectUrl =
        URL.createObjectURL(
          file,
        );

      setUrl(
        objectUrl,
      );

      return () =>
        URL.revokeObjectURL(
          objectUrl,
        );
    },
    [
      file,
    ],
  );

  return url ? (
    <img
      className={
        className
      }
      src={url}
      alt={alt}
    />
  ) : null;
}


export default function CreateTripWebExperience() {
  const router =
    useRouter();

  const {
    locale,
  } =
    useLocale();

  const copy =
    COPY[
      locale
    ] ??
    COPY.en;


  const [
    category,
    setCategory,
  ] =
    useState(
      "ROAD TRIP",
    );

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    startDate,
    setStartDate,
  ] =
    useState("");

  const [
    endDate,
    setEndDate,
  ] =
    useState("");

  const [
    capacity,
    setCapacity,
  ] =
    useState(
      "8",
    );

  const [
    budget,
    setBudget,
  ] =
    useState("");

  const [
    language,
    setLanguage,
  ] =
    useState(
      locale,
    );


  /*
   * =========================================================
   * TRAVEL DETAILS
   * =========================================================
   *
   * Route + Itinerary รวมอยู่ในข้อมูลชุดเดียว
   *
   * แต่ Backend เดิมยังเก็บเป็น:
   * - trips.start_point
   * - trips.destination
   * - trip stops
   * - itinerary
   *
   * ตอน Publish เราจะแปลงข้อมูลกลับเป็นโครงสร้างเดิม
   * เพื่อไม่ให้ Android / Trip เก่าเสีย
   */
  const [
    travelDetails,
    setTravelDetails,
  ] =
    useState<
      TravelDetailItem[]
    >([
      {
        id:
          "travel-initial",

        dayIndex: 0,

        timeLabel:
          "08:00",

        details: "",

        placeLabel:
          "",

        place: null,
      },
    ]);


  const [
    locatingId,
    setLocatingId,
  ] =
    useState("");


  const [
    coverFile,
    setCoverFile,
  ] =
    useState<
      File | null
    >(
      null,
    );

  const [
    galleryFiles,
    setGalleryFiles,
  ] =
    useState<
      File[]
    >([]);

  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState("");


  const allTripDays =
    useMemo(
      () =>
        buildTripDays(
          startDate,
          endDate,
        ),
      [
        startDate,
        endDate,
      ],
    );


  const [
    visibleDayCount,
    setVisibleDayCount,
  ] =
    useState(
      1,
    );


  const maxTravelDays =
    Math.max(
      1,
      allTripDays.length,
    );


  useEffect(
    () => {
      setVisibleDayCount(
        (
          current,
        ) =>
          Math.max(
            1,
            Math.min(
              current,
              maxTravelDays,
            ),
          ),
      );

      setTravelDetails(
        (
          current,
        ) => {
          const trimmed =
            current.filter(
              (
                item,
              ) =>
                item.dayIndex <
                maxTravelDays,
            );

          return trimmed.length
            ? trimmed
            : [
                {
                  id:
                    "travel-initial",

                  dayIndex: 0,

                  timeLabel:
                    "08:00",

                  details: "",

                  placeLabel:
                    "",

                  place: null,
                },
              ];
        },
      );
    },
    [
      maxTravelDays,
    ],
  );


  const tripDays =
    useMemo(
      () =>
        allTripDays.slice(
          0,
          Math.min(
            visibleDayCount,
            maxTravelDays,
          ),
        ),
      [
        allTripDays,
        maxTravelDays,
        visibleDayCount,
      ],
    );


  /*
   * เรียงตามวันก่อน
   *
   * ภายในวันใช้ลำดับใน State
   * เพื่อให้ปุ่ม ↑ ↓ มีผลจริง
   */
  const orderedTravelDetails =
    useMemo(
      () =>
        tripDays.flatMap(
          (
            day,
          ) =>
            travelDetails.filter(
              (
                item,
              ) =>
                item.dayIndex ===
                day.dayIndex,
            ),
        ),
      [
        tripDays,
        travelDetails,
      ],
    );


  /*
   * เฉพาะสถานที่ที่ถูกเลือกจาก Search Result
   * เท่านั้นที่จะนำไปสร้าง Route
   */
  const selectedRouteItems =
    useMemo(
      () =>
        orderedTravelDetails.filter(
          (
            item,
          ) =>
            Boolean(
              item.place &&
                item.placeLabel.trim(),
            ),
        ),
      [
        orderedTravelDetails,
      ],
    );


  function imageError(
    cause: unknown,
  ) {
    const message =
      cause instanceof
      Error
        ? cause.message
        : "";

    if (
      message ===
      "IMAGE_TOO_LARGE"
    ) {
      return copy.imageTooLarge;
    }

    if (
      message ===
      "IMAGE_REQUIRED"
    ) {
      return copy.imageType;
    }

    return (
      message ||
      copy.required
    );
  }


  function onCover(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target
        .files?.[0] ||
      null;

    event.target.value =
      "";

    if (!file) {
      return;
    }

    try {
      validateActivityImage(
        file,
      );

      setCoverFile(
        file,
      );

      setError(
        "",
      );
    } catch (
      cause
    ) {
      setError(
        imageError(
          cause,
        ),
      );
    }
  }


  function onGallery(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const files = [
      ...(
        event.target
          .files ||
        []
      ),
    ];

    event.target.value =
      "";

    if (
      !files.length
    ) {
      return;
    }

    try {
      files.forEach(
        validateActivityImage,
      );

      setGalleryFiles(
        (
          current,
        ) =>
          [
            ...current,
            ...files,
          ].slice(
            0,
            8,
          ),
      );

      setError(
        galleryFiles.length +
          files.length >
          8
          ? copy.imageLimit
          : "",
      );
    } catch (
      cause
    ) {
      setError(
        imageError(
          cause,
        ),
      );
    }
  }


  function patchTravelDetail(
    id: string,
    patch:
      Partial<TravelDetailItem>,
  ) {
    setTravelDetails(
      (
        current,
      ) =>
        current.map(
          (
            item,
          ) =>
            item.id ===
            id
              ? {
                  ...item,
                  ...patch,
                }
              : item,
        ),
    );
  }


  function addTravelDetail(
    dayIndex: number,
  ) {
    const dayItems =
      travelDetails.filter(
        (
          item,
        ) =>
          item.dayIndex ===
          dayIndex,
      );

    const lastTime =
      dayItems[
        dayItems.length -
          1
      ]?.timeLabel;

    patchErrorClear();

    setTravelDetails(
      (
        current,
      ) => [
        ...current,

        newTravelDetail(
          dayIndex,
          lastTime ||
            "09:00",
        ),
      ],
    );
  }


  function addNextTravelDay() {
    if (
      !startDate ||
      visibleDayCount >=
        maxTravelDays
    ) {
      return;
    }

    const nextDayIndex =
      visibleDayCount;

    patchErrorClear();

    setVisibleDayCount(
      (
        current,
      ) =>
        Math.min(
          current + 1,
          maxTravelDays,
        ),
    );

    setTravelDetails(
      (
        current,
      ) => {
        if (
          current.some(
            (
              item,
            ) =>
              item.dayIndex ===
              nextDayIndex,
          )
        ) {
          return current;
        }

        return [
          ...current,

          newTravelDetail(
            nextDayIndex,
            "09:00",
          ),
        ];
      },
    );
  }


  function removeTravelDetail(
    id: string,
  ) {
    setTravelDetails(
      (
        current,
      ) =>
        current.filter(
          (
            item,
          ) =>
            item.id !==
            id,
        ),
    );
  }


  function moveTravelDetail(
    id: string,
    direction:
      -1 |
      1,
  ) {
    setTravelDetails(
      (
        current,
      ) => {
        const currentIndex =
          current.findIndex(
            (
              item,
            ) =>
              item.id ===
              id,
          );

        if (
          currentIndex <
          0
        ) {
          return current;
        }

        const currentItem =
          current[
            currentIndex
          ];

        const sameDayIndices =
          current
            .map(
              (
                item,
                index,
              ) => ({
                item,
                index,
              }),
            )
            .filter(
              (
                entry,
              ) =>
                entry.item
                  .dayIndex ===
                currentItem.dayIndex,
            )
            .map(
              (
                entry,
              ) =>
                entry.index,
            );

        const position =
          sameDayIndices.indexOf(
            currentIndex,
          );

        const targetPosition =
          position +
          direction;

        if (
          position <
            0 ||
          targetPosition <
            0 ||
          targetPosition >=
            sameDayIndices.length
        ) {
          return current;
        }

        const targetIndex =
          sameDayIndices[
            targetPosition
          ];

        const next = [
          ...current,
        ];

        [
          next[
            currentIndex
          ],
          next[
            targetIndex
          ],
        ] = [
          next[
            targetIndex
          ],
          next[
            currentIndex
          ],
        ];

        return next;
      },
    );
  }


  function updateTravelPlaceText(
    id: string,
    value: string,
  ) {
    /*
     * ถ้าผู้ใช้พิมพ์แก้ชื่อเอง
     * จะถือว่า PlaceSearchResult เดิมไม่ตรงแล้ว
     * จึงล้างพิกัดเก่าออก
     */
    patchTravelDetail(
      id,
      {
        placeLabel:
          value,

        place: null,
      },
    );
  }


  function chooseTravelPlace(
    id: string,
    place:
      PlaceSearchResult,
  ) {
    patchTravelDetail(
      id,
      {
        placeLabel:
          placeDisplayLabel(
            place,
          ),

        place,
      },
    );

    setError(
      "",
    );
  }


  async function useMyLocation(
    id: string,
  ) {
    if (
      locatingId
    ) {
      return;
    }

    setError(
      "",
    );

    setLocatingId(
      id,
    );

    try {
      const place =
        await getCurrentMeloPlace(
          {
            locale,

            fallbackLabel:
              copy.currentLocation,
          },
        );

      patchTravelDetail(
        id,
        {
          placeLabel:
            placeDisplayLabel(
              place,
            ) ||
            place.name ||
            copy.currentLocation,

          place,
        },
      );
    } catch {
      setError(
        copy.locationDenied,
      );
    } finally {
      setLocatingId(
        "",
      );
    }
  }


  function patchErrorClear() {
    if (
      error
    ) {
      setError(
        "",
      );
    }
  }


  /*
   * สร้างข้อมูล itinerary ที่ Backend เดิมอ่านได้
   *
   * title:
   *   Day + รายละเอียด
   *
   * description:
   *   วันที่ + สถานที่
   *
   * จึงยังอ่านได้ทั้ง Web ปัจจุบันและ Android
   * โดยไม่เพิ่ม schema ใหม่ในรอบนี้
   */
  function itineraryPayload() {
    return orderedTravelDetails
      .filter(
        (
          item,
        ) =>
          Boolean(
            item.details.trim() ||
              item.placeLabel.trim(),
          ),
      )
      .map(
        (
          item,
        ) => {
          const day =
            tripDays[
              item.dayIndex
            ];

          const dateLabel =
            day?.date
              ? formatTripDate(
                  day.date,
                  locale,
                )
              : "";

          const detail =
            item.details
              .trim() ||
            copy.travelDetailDefault;

          const titleValue =
            tripDays.length >
            1
              ? `${copy.day} ${item.dayIndex + 1} · ${detail}`
              : detail;

          const descriptionParts: string[] =
            [];

          if (
            dateLabel
          ) {
            descriptionParts.push(
              dateLabel,
            );
          }

          if (
            item.placeLabel.trim()
          ) {
            descriptionParts.push(
              `📍 ${item.placeLabel.trim()}`,
            );
          }

          return {
            timeLabel:
              item.timeLabel,

            title:
              titleValue,

            description:
              descriptionParts.join(
                " · ",
              ),
          };
        },
      );
  }


  async function publish() {
    setError(
      "",
    );


    if (
      !title.trim() ||
      !startDate ||
      !Number(
        capacity,
      )
    ) {
      setError(
        copy.required,
      );

      return;
    }


    if (
      endDate &&
      endDate <
        startDate
    ) {
      setError(
        copy.endBeforeStart,
      );

      return;
    }


    const locatedItems =
      orderedTravelDetails.filter(
        (
          item,
        ): item is
          TravelDetailItem & {
            place:
              PlaceSearchResult;
          } =>
          Boolean(
            item.place &&
              item.placeLabel.trim(),
          ),
      );


    /*
     * Trip schema เดิมต้องมี start_point + destination
     *
     * ดังนั้นต้องเลือกสถานที่อย่างน้อย 1 จุด
     * ถ้ามีเพียงจุดเดียว:
     * - ใช้จุดเดียวกันเป็น Start + Destination
     *
     * เพื่อรองรับ Trip แบบอยู่สถานที่เดียว
     */
    if (
      !locatedItems.length
    ) {
      setError(
        copy.routeRequired,
      );

      return;
    }


    const firstPlace =
      locatedItems[
        0
      ];

    const lastPlace =
      locatedItems[
        locatedItems.length -
          1
      ];


    const startPoint =
      firstPlace.placeLabel.trim();

    const destination =
      lastPlace.placeLabel.trim();


    setBusy(
      true,
    );


    const result =
      await rpcRequest<string>(
        "create_trip",
        {
          p_category:
            category,

          p_title:
            title.trim(),

          p_description:
            description.trim(),

          p_start_point:
            startPoint,

          p_destination:
            destination,

          p_start_date:
            startDate,

          p_end_date:
            endDate ||
            null,

          p_capacity:
            Math.max(
              1,

              Math.round(
                Number(
                  capacity,
                ),
              ),
            ),

          p_budget_per_person:
            budget.trim()
              ? Number(
                  budget,
                )
              : null,

          p_primary_language:
            language,
        },
      );


    if (
      result.error ||
      !result.data
    ) {
      setBusy(
        false,
      );

      setError(
        result.error ||
          copy.required,
      );

      return;
    }


    const tripId =
      String(
        result.data,
      );


    try {
      await updateActivityCreationFields(
        {
          kind:
            "trip",

          activityId:
            tripId,

          membershipOpen:
            true,
        },
      );


      await saveActivityCoverWeb(
        {
          kind:
            "trip",

          activityId:
            tripId,

          coverFile,
        },
      );


      await saveActivityGalleryWeb(
        {
          kind:
            "trip",

          activityId:
            tripId,

          files:
            galleryFiles,
        },
      );


      /*
       * Route อัตโนมัติ
       *
       * จุดแรก = Start
       * จุดสุดท้าย = Destination
       */
      await saveTripRouteCoordinatesWeb(
        tripId,
        {
          start:
            firstPlace.place,

          destination:
            lastPlace.place,
        },
      );


      /*
       * จุดระหว่างกลางทั้งหมด
       * กลายเป็น Trip Stops
       */
      const middleStops =
        locatedItems.length >
        2
          ? locatedItems.slice(
              1,
              -1,
            )
          : [];


      await saveTripStopsWeb(
        tripId,

        middleStops.map(
          (
            item,
          ) => ({
            label:
              item.placeLabel.trim(),

            latitude:
              item.place.latitude ??
              null,

            longitude:
              item.place.longitude ??
              null,
          }),
        ),
      );


      /*
       * Save กำหนดการผ่านระบบเดิม
       * แต่ข้อมูลมาจาก Travel Details ใหม่
       */
      await saveTripItineraryWeb(
        tripId,
        itineraryPayload(),
      );


      router.replace(
        `/trips/${tripId}`,
      );
    } catch (
      cause
    ) {
      setBusy(
        false,
      );

      setError(
        imageError(
          cause,
        ),
      );
    }
  }


  return (
    <main
      className={
        styles.page
      }
    >
      <Header />


      <section
        className={
          styles.shell
        }
      >
        <header
          className={
            styles.hero
          }
        >
          <Link
            href="/trips"
          >
            ‹ {copy.back}
          </Link>


          <span>
            MELO TRIPS
          </span>


          <div
            className={
              styles.heroTitleRow
            }
          >
            <i
              className={
                styles.heroIcon
              }
              aria-hidden="true"
            >
              ✈
            </i>


            <h1>
              {copy.title}
            </h1>
          </div>


          <p>
            {copy.subtitle}
          </p>
        </header>


        <form
          className={
            styles.form
          }
          onSubmit={(
            event,
          ) => {
            event.preventDefault();

            void publish();
          }}
        >
          <div
            className={
              styles.mainColumn
            }
          >
            {/* =====================================================
                01 · BASIC INFORMATION
               ===================================================== */}

            <section
              className={
                `${styles.block} ${styles.overviewBlock}`
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <span
                  className={
                    styles.stepNumber
                  }
                >
                  01
                </span>


                <div>
                  <h2>
                    {
                      copy.basicInformation
                    }
                  </h2>
                </div>
              </div>


              <div
                className={
                  styles.overviewTopGrid
                }
              >
                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    {
                      copy.tripType
                    }
                  </span>


                  <select
                    value={
                      category
                    }
                    onChange={(
                      event,
                    ) =>
                      setCategory(
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    {CATEGORIES.map(
                      (
                        item,
                      ) => (
                        <option
                          key={
                            item
                          }
                          value={
                            item
                          }
                        >
                          {localCategory(
                            locale,
                            item,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>


                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    {
                      copy.tripName
                    }
                  </span>


                  <input
                    value={
                      title
                    }
                    onChange={(
                      event,
                    ) =>
                      setTitle(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>
              </div>


              <label
                className={
                  styles.field
                }
              >
                <span>
                  {copy.details}
                </span>


                <textarea
                  rows={
                    4
                  }
                  value={
                    description
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event
                        .target
                        .value,
                    )
                  }
                />
              </label>


              <div
                className={
                  styles.factsGrid
                }
              >
                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    {
                      copy.startDate
                    }
                  </span>


                  <input
                    type="date"
                    aria-label={
                      copy.selectStartDate
                    }
                    value={
                      startDate
                    }
                    onChange={(
                      event,
                    ) => {
                      setStartDate(
                        event
                          .target
                          .value,
                      );

                      patchErrorClear();
                    }}
                  />
                </label>


                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    {
                      copy.endDate
                    }
                  </span>


                  <input
                    type="date"
                    aria-label={
                      copy.selectEndDate
                    }
                    min={
                      startDate ||
                      undefined
                    }
                    value={
                      endDate
                    }
                    onChange={(
                      event,
                    ) => {
                      setEndDate(
                        event
                          .target
                          .value,
                      );

                      patchErrorClear();
                    }}
                  />
                </label>


                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    {
                      copy.numberPeople
                    }
                  </span>


                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={
                      capacity
                    }
                    onChange={(
                      event,
                    ) =>
                      setCapacity(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>


                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    {
                      copy.budgetPerson
                    }
                  </span>


                  <input
                    type="number"
                    min="0"
                    value={
                      budget
                    }
                    onChange={(
                      event,
                    ) =>
                      setBudget(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>
              </div>
            </section>


            {/* =====================================================
                02 · TRAVEL DETAILS
                Route + Itinerary รวมเป็นส่วนเดียว
               ===================================================== */}

            <section
              className={
                `${styles.block} ${styles.routeBlock}`
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <span
                  className={
                    styles.stepNumber
                  }
                >
                  02
                </span>


                <div>
                  <h2>
                    {
                      copy.travelDetails
                    }
                  </h2>


                  <p>
                    {
                      copy.travelDetailsHint
                    }
                  </p>
                </div>
              </div>


              <div
                style={
                  TRAVEL_UI.days
                }
              >
                {tripDays.map(
                  (
                    day,
                  ) => {
                    const dayItems =
                      travelDetails.filter(
                        (
                          item,
                        ) =>
                          item.dayIndex ===
                          day.dayIndex,
                      );


                    return (
                      <section
                        key={
                          `${day.dayIndex}-${day.date}`
                        }
                        style={
                          TRAVEL_UI.dayCard
                        }
                      >
                        <header
                          style={
                            TRAVEL_UI.dayHead
                          }
                        >
                          <div
                            style={
                              TRAVEL_UI.dayTitle
                            }
                          >
                            <strong
                              style={
                                TRAVEL_UI.dayTitleStrong
                              }
                            >
                              {
                                copy.day
                              }{" "}
                              {
                                day.dayIndex +
                                1
                              }
                            </strong>


                            <span
                              style={
                                TRAVEL_UI.dayTitleDate
                              }
                            >
                              {day.date
                                ? formatTripDate(
                                    day.date,
                                    locale,
                                  )
                                : copy.dayPending}
                            </span>
                          </div>

                        </header>


                        <div
                          style={
                            TRAVEL_UI.dayBody
                          }
                        >
                          {!dayItems.length ? (
                            <div
                              style={
                                TRAVEL_UI.emptyDay
                              }
                            >
                              {
                                copy.emptyDay
                              }
                            </div>
                          ) : (
                            dayItems.map(
                              (
                                item,
                                itemIndex,
                              ) => {
                                const first =
                                  itemIndex ===
                                  0;

                                const last =
                                  itemIndex ===
                                  dayItems.length -
                                    1;


                                const searchCenter =
                                  item.place ??
                                  selectedRouteItems[
                                    0
                                  ]?.place ??
                                  null;


                                return (
                                  <article
                                    key={
                                      item.id
                                    }
                                    style={
                                      TRAVEL_UI.itemCard
                                    }
                                  >
                                    <div
                                      style={
                                        TRAVEL_UI.itemTop
                                      }
                                    >
                                      <label
                                        className={
                                          styles.field
                                        }
                                        style={
                                          TRAVEL_UI.timeField
                                        }
                                      >
                                        <span>
                                          {
                                            copy.travelTime
                                          }
                                        </span>


                                        <input
                                          type="time"
                                          value={
                                            item.timeLabel
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            patchTravelDetail(
                                              item.id,
                                              {
                                                timeLabel:
                                                  event
                                                    .target
                                                    .value,
                                              },
                                            )
                                          }
                                        />
                                      </label>


                                      <label
                                        className={
                                          styles.field
                                        }
                                        style={
                                          TRAVEL_UI.detailsField
                                        }
                                      >
                                        <span>
                                          {
                                            copy.travelDescription
                                          }
                                        </span>


                                        <input
                                          value={
                                            item.details
                                          }
                                          placeholder={
                                            copy.travelDescriptionPlaceholder
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            patchTravelDetail(
                                              item.id,
                                              {
                                                details:
                                                  event
                                                    .target
                                                    .value,
                                              },
                                            )
                                          }
                                        />
                                      </label>


                                      <div
                                        style={
                                          TRAVEL_UI.actions
                                        }
                                      >
                                        <button
                                          type="button"
                                          aria-label={
                                            copy.moveUp
                                          }
                                          title={
                                            copy.moveUp
                                          }
                                          disabled={
                                            first
                                          }
                                          style={{
                                            ...TRAVEL_UI.iconButton,

                                            ...(first
                                              ? TRAVEL_UI.disabledButton
                                              : {}),
                                          }}
                                          onClick={() =>
                                            moveTravelDetail(
                                              item.id,
                                              -1,
                                            )
                                          }
                                        >
                                          ↑
                                        </button>


                                        <button
                                          type="button"
                                          aria-label={
                                            copy.moveDown
                                          }
                                          title={
                                            copy.moveDown
                                          }
                                          disabled={
                                            last
                                          }
                                          style={{
                                            ...TRAVEL_UI.iconButton,

                                            ...(last
                                              ? TRAVEL_UI.disabledButton
                                              : {}),
                                          }}
                                          onClick={() =>
                                            moveTravelDetail(
                                              item.id,
                                              1,
                                            )
                                          }
                                        >
                                          ↓
                                        </button>


                                        <button
                                          type="button"
                                          aria-label={
                                            copy.remove
                                          }
                                          title={
                                            copy.remove
                                          }
                                          style={
                                            TRAVEL_UI.removeButton
                                          }
                                          onClick={() =>
                                            removeTravelDetail(
                                              item.id,
                                            )
                                          }
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>


                                    <div
                                      className={
                                        styles.travelPlaceRow
                                      }
                                    >
                                      <div
                                        className={
                                          `${styles.field} ${styles.travelPlaceSearch}`
                                        }
                                      >
                                        <span>
                                          {
                                            copy.travelPlace
                                          }
                                        </span>


                                        <PlaceSearchInput
                                          value={
                                            item.placeLabel
                                          }
                                          onChange={(
                                            value,
                                          ) =>
                                            updateTravelPlaceText(
                                              item.id,
                                              value,
                                            )
                                          }
                                          onSelect={(
                                            place,
                                          ) =>
                                            chooseTravelPlace(
                                              item.id,
                                              place,
                                            )
                                          }
                                          placeholder={
                                            copy.searchPlace
                                          }
                                          locale={
                                            locale
                                          }
                                          latitude={
                                            searchCenter?.latitude ??
                                            null
                                          }
                                          longitude={
                                            searchCenter?.longitude ??
                                            null
                                          }
                                          searchingLabel={
                                            copy.searchingPlaces
                                          }
                                          noResultsLabel={
                                            copy.noPlaces
                                          }
                                        />


                                        <small
                                          style={
                                            TRAVEL_UI.placeHint
                                          }
                                        >
                                          {
                                            copy.placeSelectHint
                                          }
                                        </small>
                                      </div>


                                      <button
                                        type="button"
                                        className={
                                          styles.travelLocationButton
                                        }
                                        disabled={
                                          Boolean(
                                            locatingId,
                                          )
                                        }
                                        onClick={() =>
                                          void useMyLocation(
                                            item.id,
                                          )
                                        }
                                      >
                                        ⌖{" "}
                                        {locatingId ===
                                        item.id
                                          ? copy.currentLocation
                                          : copy.myLocation}
                                      </button>
                                    </div>
                                  </article>
                                );
                              },
                            )
                          )}


                          <div
                            className={
                              styles.travelDayActions
                            }
                          >
                            <button
                              type="button"
                              className={
                                styles.travelDayAdd
                              }
                              onClick={() =>
                                addTravelDetail(
                                  day.dayIndex,
                                )
                              }
                            >
                              {
                                copy.addTravelDetail
                              }
                            </button>


                            {day.dayIndex ===
                            tripDays.length -
                              1 ? (
                              <button
                                type="button"
                                className={
                                  styles.travelNextDay
                                }
                                disabled={
                                  !startDate ||
                                  visibleDayCount >=
                                    maxTravelDays
                                }
                                title={
                                  !startDate
                                    ? copy.selectStartDate
                                    : undefined
                                }
                                onClick={
                                  addNextTravelDay
                                }
                              >
                                {
                                  copy.addNextDay
                                }
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </section>
                    );
                  },
                )}
              </div>


              {/* ===================================================
                  AUTO ROUTE SUMMARY
                 =================================================== */}

              <div
                style={
                  TRAVEL_UI.routeCard
                }
              >
                <div
                  style={
                    TRAVEL_UI.routeHeader
                  }
                >
                  <h3
                    style={
                      TRAVEL_UI.routeTitle
                    }
                  >
                    {
                      copy.autoRoute
                    }
                  </h3>


                  <p
                    style={
                      TRAVEL_UI.routeHint
                    }
                  >
                    {
                      copy.autoRouteHint
                    }
                  </p>
                </div>


                {!selectedRouteItems.length ? (
                  <p
                    style={
                      TRAVEL_UI.noRoute
                    }
                  >
                    {
                      copy.noAutoRoute
                    }
                  </p>
                ) : (
                  <div
                    style={
                      TRAVEL_UI.routeList
                    }
                  >
                    {selectedRouteItems.map(
                      (
                        item,
                        routeIndex,
                      ) => {
                        const routeCount =
                          selectedRouteItems.length;


                        const marker =
                          routeIndex ===
                          0
                            ? "A"
                            : routeIndex ===
                                routeCount -
                                  1
                              ? "B"
                              : String(
                                  routeIndex,
                                );


                        const day =
                          tripDays[
                            item.dayIndex
                          ];


                        return (
                          <div
                            key={
                              `route-${item.id}`
                            }
                            style={
                              TRAVEL_UI.routeRow
                            }
                          >
                            <b
                              style={
                                TRAVEL_UI.routeMarker
                              }
                            >
                              {
                                marker
                              }
                            </b>


                            <div
                              style={
                                TRAVEL_UI.routeCopy
                              }
                            >
                              <small
                                style={
                                  TRAVEL_UI.routeMeta
                                }
                              >
                                {
                                  copy.day
                                }{" "}
                                {
                                  item.dayIndex +
                                  1
                                }

                                {" · "}

                                {
                                  item.timeLabel ||
                                  "—"
                                }

                                {day?.date
                                  ? ` · ${formatTripDate(
                                      day.date,
                                      locale,
                                    )}`
                                  : ""}
                              </small>


                              <strong
                                style={
                                  TRAVEL_UI.routePlace
                                }
                              >
                                {
                                  item.placeLabel
                                }
                              </strong>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>


          {/* =======================================================
              SIDEBAR
             ======================================================= */}

          <aside
            className={
              styles.sidebar
            }
          >
            <section
              className={
                `${styles.block} ${styles.mediaBlock}`
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <div>
                  <h2>
                    {
                      copy.activityImage
                    }
                  </h2>


                  <p>
                    {
                      copy.activityImageDesc
                    }
                  </p>
                </div>
              </div>


              <label
                className={
                  styles.coverBox
                }
              >
                {coverFile ? (
                  <Preview
                    file={
                      coverFile
                    }
                    alt=""
                  />
                ) : (
                  <span
                    className={
                      styles.emptyMedia
                    }
                  >
                    <b>
                      ▣
                    </b>


                    <strong>
                      {
                        copy.noActivityImage
                      }
                    </strong>
                  </span>
                )}


                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    onCover
                  }
                />
              </label>


              <div
                className={
                  styles.coverActions
                }
              >
                <label
                  className={
                    styles.primaryUpload
                  }
                >
                  {coverFile
                    ? copy.changeImage
                    : copy.addImage}


                  <input
                    type="file"
                    accept="image/*"
                    onChange={
                      onCover
                    }
                  />
                </label>


                {coverFile ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCoverFile(
                        null,
                      )
                    }
                  >
                    {
                      copy.remove
                    }
                  </button>
                ) : null}
              </div>
            </section>


            <section
              className={
                `${styles.block} ${styles.galleryBlock}`
              }
            >
              <div
                className={
                  styles.labelWithCount
                }
              >
                <div>
                  <h2>
                    {
                      copy.additionalPhotos
                    }
                  </h2>


                  <p>
                    {
                      copy.additionalPhotosDesc
                    }
                  </p>
                </div>


                <b>
                  {
                    galleryFiles.length
                  }
                  /8
                </b>
              </div>


              {galleryFiles.length ? (
                <div
                  className={
                    styles.galleryGrid
                  }
                >
                  {galleryFiles.map(
                    (
                      file,
                      index,
                    ) => (
                      <div
                        className={
                          styles.galleryItem
                        }
                        key={
                          `${file.name}-${file.lastModified}-${index}`
                        }
                      >
                        <Preview
                          file={
                            file
                          }
                          alt=""
                        />


                        <button
                          type="button"
                          aria-label={
                            copy.remove
                          }
                          onClick={() =>
                            setGalleryFiles(
                              (
                                current,
                              ) =>
                                current.filter(
                                  (
                                    _,
                                    i,
                                  ) =>
                                    i !==
                                    index,
                                ),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div
                  className={
                    styles.galleryEmpty
                  }
                >
                  <b>
                    ▣
                  </b>


                  <strong>
                    {
                      copy.noAdditionalPhotos
                    }
                  </strong>
                </div>
              )}


              {galleryFiles.length <
              8 ? (
                <label
                  className={
                    styles.secondaryUpload
                  }
                >
                  {
                    copy.addPhotos
                  }


                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={
                      onGallery
                    }
                  />
                </label>
              ) : null}
            </section>


            <section
              className={
                `${styles.block} ${styles.languageBlock}`
              }
            >
              <h2>
                {
                  copy.primaryLanguage
                }
              </h2>


              <div
                className={
                  styles.languageChips
                }
              >
                {LANGUAGE_OPTIONS.map(
                  ([
                    value,
                    label,
                  ]) => (
                    <button
                      type="button"
                      key={
                        value
                      }
                      className={
                        language ===
                        value
                          ? styles.languageActive
                          : ""
                      }
                      onClick={() =>
                        setLanguage(
                          value,
                        )
                      }
                    >
                      {
                        label
                      }
                    </button>
                  ),
                )}
              </div>
            </section>


            {error ? (
              <div
                className={
                  styles.error
                }
              >
                {error}
              </div>
            ) : null}


            <button
              type="submit"
              className={
                styles.publish
              }
              disabled={
                busy
              }
            >
              {busy
                ? copy.publishing
                : copy.publish}
            </button>


            <p
              className={
                styles.publishHint
              }
            >
              {
                copy.publishHint
              }
            </p>
          </aside>
        </form>
      </section>
    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/SiteProviders";
import {
  loadTripsWeb,
  type TripWebRecord,
} from "@/components/trips/tripWebData";
import {
  loadEventsWeb,
  type EventWebRecord,
} from "@/components/events/eventWebData";
import styles from "./SocialFeedExperience.module.css";

type RecommendationItem = {
  id: string;
  title: string;
  subtitle: string;
  dateValue: string;
  imageUrl: string;
  href: string;
};

const EMPTY_COPY: Record<string, string> = {
  th: "ยังไม่มีคำแนะนำ",
  en: "No suggestions yet",
  de: "Noch keine Empfehlungen",
  zh: "暂无推荐",
  ja: "おすすめはまだありません",
  ko: "추천이 없습니다",
};

function timestamp(value: string, endOfDay = false) {
  const clean = String(value || "").trim();
  if (!clean) return Number.NaN;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ).getTime();
  }

  return new Date(clean).getTime();
}

function tripStillCurrent(item: TripWebRecord, now: number) {
  if (item.lifecycle === "completed" || item.lifecycle === "cancelled") return false;

  // A Trip may be date-only. Keep it until the end of its final day.
  const end = timestamp(item.endDate || item.startDate, true);
  return Number.isFinite(end) && end >= now;
}

function eventStillCurrent(item: EventWebRecord, now: number) {
  if (item.lifecycle === "completed" || item.lifecycle === "cancelled") return false;

  // Events normally have timestamps. If a legacy row is date-only, keep it
  // until the end of that calendar day.
  const rawEnd = item.endAt || item.startAt;
  const end = timestamp(rawEnd, /^\d{4}-\d{2}-\d{2}$/.test(rawEnd));
  return Number.isFinite(end) && end >= now;
}

function tripRecommendation(item: TripWebRecord): RecommendationItem {
  return {
    id: item.id,
    title: item.title,
    subtitle: [item.destination || item.startPoint, item.category]
      .filter(Boolean)
      .join(" · "),
    dateValue: item.startDate,
    imageUrl: item.imageUrl,
    href: `/trips/${item.id}`,
  };
}

function eventRecommendation(item: EventWebRecord): RecommendationItem {
  return {
    id: item.id,
    title: item.title,
    subtitle: [item.venueName || item.city, item.category]
      .filter(Boolean)
      .join(" · "),
    dateValue: item.startAt,
    imageUrl: item.imageUrl,
    href: `/events/${item.id}`,
  };
}

function dateLabel(value: string, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function findSuggestionSection(href: "/trips" | "/events") {
  const rail = document.querySelector<HTMLElement>(`.${styles.leftRail}`);
  if (!rail) return null;

  const sections = Array.from(
    rail.querySelectorAll<HTMLElement>(`:scope > .${styles.suggestionCard}`),
  );

  return sections.find((section) =>
    Boolean(section.querySelector(`header a[href="${href}"]`)),
  ) ?? null;
}

function ensureMount(
  href: "/trips" | "/events",
  key: "trip" | "event",
) {
  const section = findSuggestionSection(href);
  if (!section) return null;

  let mount = section.querySelector<HTMLElement>(
    `[data-melo-current-activity="${key}"]`,
  );

  if (!mount) {
    mount = document.createElement("div");
    mount.dataset.meloCurrentActivity = key;

    const header = section.querySelector(":scope > header");
    if (header) header.insertAdjacentElement("afterend", mount);
    else section.prepend(mount);
  }

  // Hide only the original recommendation body inside this exact Trip/Event
  // sidebar card. This is deliberately scoped; it never scans unrelated pages.
  for (const child of Array.from(section.children) as HTMLElement[]) {
    if (child === mount || child.tagName === "HEADER") continue;
    if (!child.dataset.meloOriginalActivityDisplay) {
      child.dataset.meloOriginalActivityDisplay = child.style.display || "__empty__";
    }
    child.style.display = "none";
  }

  return mount;
}

function restoreOriginalSuggestions() {
  document
    .querySelectorAll<HTMLElement>("[data-melo-original-activity-display]")
    .forEach((element) => {
      const original = element.dataset.meloOriginalActivityDisplay;
      element.style.display = original && original !== "__empty__" ? original : "";
      delete element.dataset.meloOriginalActivityDisplay;
    });

  document
    .querySelectorAll<HTMLElement>("[data-melo-current-activity]")
    .forEach((element) => element.remove());
}

function RecommendationList({
  items,
  locale,
  empty,
}: {
  items: RecommendationItem[];
  locale: string;
  empty: string;
}) {
  if (!items.length) {
    return <div className={styles.miniEmpty}>{empty}</div>;
  }

  return (
    <div className={styles.activitySuggestionList}>
      {items.map((item) => (
        <a
          href={item.href}
          className={styles.activitySuggestionRow}
          key={item.id}
        >
          <span className={`${styles.avatar} ${styles.squareAvatar}`}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" />
            ) : (
              <b>{item.title.slice(0, 1).toUpperCase()}</b>
            )}
          </span>

          <div>
            <strong>{item.title}</strong>
            <small>
              {[dateLabel(item.dateValue, locale), item.subtitle]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </div>

          <span>›</span>
        </a>
      ))}
    </div>
  );
}

export default function HomeActivityRecommendationGuard() {
  const { locale, countryScope } = useLocale();

  const [tripMount, setTripMount] = useState<HTMLElement | null>(null);
  const [eventMount, setEventMount] = useState<HTMLElement | null>(null);

  const [trips, setTrips] = useState<TripWebRecord[]>([]);
  const [events, setEvents] = useState<EventWebRecord[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    void Promise.all([
      loadTripsWeb(countryScope),
      loadEventsWeb(countryScope),
    ]).then(([tripResult, eventResult]) => {
      if (!active) return;
      setTrips(tripResult.trips ?? []);
      setEvents(eventResult.events ?? []);
    }).catch(() => {
      if (!active) return;
      setTrips([]);
      setEvents([]);
    });

    return () => {
      active = false;
    };
  }, [countryScope]);

  // Keep a long-open Home page correct when a Trip/Event expires while the
  // browser is still open.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      setTripMount(ensureMount("/trips", "trip"));
      setEventMount(ensureMount("/events", "event"));
    };

    const queue = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    queue();

    // SocialFeedExperience fills the sidebars asynchronously. Watch only for
    // those mounts/re-renders and re-attach our exact scoped mount if needed.
    const observer = new MutationObserver(queue);
    observer.observe(document.body, { subtree: true, childList: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      restoreOriginalSuggestions();
    };
  }, []);

  const tripItems = useMemo(
    () =>
      trips
        .filter((item) => tripStillCurrent(item, now))
        .sort(
          (a, b) =>
            timestamp(a.startDate) - timestamp(b.startDate),
        )
        .slice(0, 3)
        .map(tripRecommendation),
    [now, trips],
  );

  const eventItems = useMemo(
    () =>
      events
        .filter((item) => eventStillCurrent(item, now))
        .sort(
          (a, b) =>
            timestamp(a.startAt) - timestamp(b.startAt),
        )
        .slice(0, 3)
        .map(eventRecommendation),
    [events, now],
  );

  const empty = EMPTY_COPY[locale] ?? EMPTY_COPY.en;

  return (
    <>
      {tripMount
        ? createPortal(
            <RecommendationList
              items={tripItems}
              locale={locale}
              empty={empty}
            />,
            tripMount,
          )
        : null}

      {eventMount
        ? createPortal(
            <RecommendationList
              items={eventItems}
              locale={locale}
              empty={empty}
            />,
            eventMount,
          )
        : null}
    </>
  );
}

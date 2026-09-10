"use client";

import { useSyncExternalStore } from "react";
import SocialFeedExperience from "@/components/feed/SocialFeedExperience";
import HomeActivityRecommendationGuard from "@/components/feed/HomeActivityRecommendationGuard";
import HomeDashboardExperience from "@/components/home/HomeDashboardExperience";

const MOBILE_HOME_QUERY = "(max-width: 900px)";

function subscribeToMobileHome(callback: () => void) {
  const media = window.matchMedia(MOBILE_HOME_QUERY);

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  }

  media.addListener(callback);
  return () => media.removeListener(callback);
}

function getMobileHomeSnapshot() {
  return window.matchMedia(MOBILE_HOME_QUERY).matches;
}

function getServerMobileHomeSnapshot() {
  // Preserve the established desktop /account experience during SSR.
  // Once hydrated, mobile browsers switch to the Android-style Home.
  return false;
}

export default function ResponsiveAccountHome() {
  const isMobileHome = useSyncExternalStore(
    subscribeToMobileHome,
    getMobileHomeSnapshot,
    getServerMobileHomeSnapshot,
  );

  if (isMobileHome) {
    return <HomeDashboardExperience />;
  }

  return (
    <>
      <SocialFeedExperience />
      <HomeActivityRecommendationGuard />
    </>
  );
}

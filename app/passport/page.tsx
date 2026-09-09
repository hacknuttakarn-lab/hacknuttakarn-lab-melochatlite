import { Suspense } from "react";

import TravelPassportExperience from "@/components/passport/TravelPassportExperience";


function PassportPageFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: "60vh",
        width: "100%",
      }}
    />
  );
}


export default function PassportPage() {
  return (
    <Suspense fallback={<PassportPageFallback />}>
      <TravelPassportExperience />
    </Suspense>
  );
}
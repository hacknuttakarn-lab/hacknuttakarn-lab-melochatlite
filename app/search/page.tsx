import { Suspense } from "react";

import GlobalSearchExperience from "../../components/search/GlobalSearchExperience";


function SearchPageFallback() {
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


export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <SearchPageFallback />
      }
    >
      <GlobalSearchExperience />
    </Suspense>
  );
}
import { Suspense } from "react";

import CreatePostExperience from "@/components/feed/CreatePostExperience";


function CreatePostFallback() {
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


export default function CreatePostPage() {
  return (
    <Suspense fallback={<CreatePostFallback />}>
      <CreatePostExperience />
    </Suspense>
  );
}
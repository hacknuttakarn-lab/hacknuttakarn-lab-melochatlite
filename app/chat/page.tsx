import { Suspense } from "react";

import ChatCenter from "@/components/chat/ChatCenter";


function ChatPageFallback() {
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


export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatCenter />
    </Suspense>
  );
}
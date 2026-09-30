import { Suspense } from 'react';
import SupportChatExperience from '@/components/support/SupportChatExperience';

export default function SupportChatPage() {
  return (
    <Suspense fallback={null}>
      <SupportChatExperience />
    </Suspense>
  );
}
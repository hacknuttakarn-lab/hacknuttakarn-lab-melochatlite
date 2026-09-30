import { Suspense } from 'react';
import LiteMockExperience from '@/components/lite/LiteMockExperience';

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <LiteMockExperience kind="feed" />
    </Suspense>
  );
}
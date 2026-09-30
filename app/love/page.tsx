import { Suspense } from 'react';
import LiteMockExperience from '@/components/lite/LiteMockExperience';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LiteMockExperience kind="love" />
    </Suspense>
  );
}
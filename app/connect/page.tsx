import { Suspense } from 'react';
import LiteMockExperience from '@/components/lite/LiteMockExperience';

export default function ConnectPage() {
  return (
    <Suspense fallback={null}>
      <LiteMockExperience kind="connect" />
    </Suspense>
  );
}
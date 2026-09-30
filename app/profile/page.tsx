import { Suspense } from 'react';
import LiteMockExperience from '@/components/lite/LiteMockExperience';

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <LiteMockExperience kind="profile" />
    </Suspense>
  );
}
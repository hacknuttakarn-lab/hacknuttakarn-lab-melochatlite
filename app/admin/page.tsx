import { Suspense } from 'react';
import AdminCenter from '@/components/admin/AdminCenter';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCenter />
    </Suspense>
  );
}

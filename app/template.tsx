'use client';

import type { ReactNode } from 'react';
import AdminHeaderMenuBridge from '@/components/admin/AdminHeaderMenuBridge';

export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminHeaderMenuBridge />
      {children}
    </>
  );
}

'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboardLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      {children}
    </ProtectedRoute>
  );
} 
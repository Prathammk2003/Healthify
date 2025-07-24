'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function DoctorDashboardLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      {children}
    </ProtectedRoute>
  );
} 
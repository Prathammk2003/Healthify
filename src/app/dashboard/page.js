'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function Dashboard() {
  const router = useRouter();
  const { isAuthenticated, role, isAdmin } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Redirect based on user role
    if (isAdmin) {
      router.push('/dashboard/admin');
    } else if (role === 'doctor') {
      router.push('/dashboard/doctor');
    } else {
      router.push('/dashboard/patient');
    }
  }, [isAuthenticated, role, isAdmin, router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import DoctorDashboard from './doctor/page';
import PatientDashboard from './patient/page';

export default function Dashboard() {
  const { role, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Redirect to role-specific dashboard if on the main dashboard page
    if (window.location.pathname === '/dashboard') {
      if (isAdmin) {
        router.push('/dashboard/admin');
      } else if (role === 'doctor') {
        router.push('/dashboard/doctor');
      } else if (role === 'patient') {
        router.push('/dashboard/patient');
      }
    }
  }, [isAuthenticated, role, isAdmin, router]);

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">Your Health Dashboard</h1>
        <p className="mb-6 text-gray-600">Please log in to view your dashboard.</p>
      </div>
    );
  }

  if (isAdmin) {
    // Let the redirect handle this, no need to render
    return null;
  } else if (role === 'doctor') {
    return <DoctorDashboard />;
  } else if (role === 'patient') {
    return <PatientDashboard />;
  }

  return null;
}

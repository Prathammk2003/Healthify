'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import Loader from '@/components/Loader';

export default function AdminSettings() {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/login');
    } else if (isAuthenticated && !isAdmin) {
      router.push('/dashboard');
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, router]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">System Settings</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Application Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300">
            This is the settings page where you can configure system preferences and application settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 
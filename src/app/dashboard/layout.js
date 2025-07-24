'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Bell, Shield, Home, Calendar, PillIcon, Brain, Utensils, FileText, User, Stethoscope, Clock } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Footer from '@/components/Footer';

export default function DashboardLayout({ children }) {
  const { isAuthenticated, logout, userId, isAdmin, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Handle sign out
  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      // Call the logout function from AuthProvider
      await logout();
      
      // Use router for navigation
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still attempt to redirect even if there was an error
      router.push('/login');
    }
  };

  // Navigation items based on user role
  const getNavItems = () => {
    // Common items for all users
    const commonItems = [
      { name: 'Dashboard', href: '/dashboard/patient', icon: <Home className="h-5 w-5" /> },
      { name: 'Profile', href: '/dashboard/profile', icon: <User className="h-5 w-5" /> },
    ];

    // Patient-specific items
    const patientItems = [
      { name: 'Appointments', href: '/dashboard/appointments', icon: <Calendar className="h-5 w-5" /> },
      { name: 'Medications', href: '/dashboard/medications', icon: <PillIcon className="h-5 w-5" /> },
      { name: 'Mental Health', href: '/dashboard/mental-health', icon: <Brain className="h-5 w-5" /> },
      { name: 'Nutrition', href: '/dashboard/nutrition', icon: <Utensils className="h-5 w-5" /> },
      { name: 'Symptom Checker', href: '/dashboard/symptom-checker', icon: <Stethoscope className="h-5 w-5" /> },
    ];

    // Doctor-specific items
    const doctorItems = [
      { name: 'Dashboard', href: '/dashboard/doctor', icon: <Home className="h-5 w-5" /> },
      { name: 'Patients', href: '/dashboard/patients', icon: <FileText className="h-5 w-5" /> },
      { name: 'Time Slots', href: '/dashboard/doctor/daily-slots', icon: <Clock className="h-5 w-5" /> },
    ];

    // Admin-specific items
    const adminItems = [
      { name: 'Dashboard', href: '/dashboard/admin', icon: <Home className="h-5 w-5" /> },
      { name: 'Users', href: '/dashboard/admin/users', icon: <User className="h-5 w-5" /> },
      { name: 'Settings', href: '/dashboard/admin/settings', icon: <Shield className="h-5 w-5" /> },
    ];

    // Build the navigation items based on role
    let navItems = [];

    if (isAdmin) {
      // For admins, use adminItems
      navItems = [...adminItems];
    } else if (role === 'doctor') {
      // For doctors, use doctorItems and add only Profile from commonItems
      // This avoids the duplicate Dashboard entry
      const commonItemsWithoutDashboard = commonItems.slice(1);
      navItems = [...doctorItems, ...commonItemsWithoutDashboard];
    } else {
      // For patients and other roles
      navItems = [...commonItems, ...patientItems];
    }

    return navItems;
  };

  const navItems = getNavItems();

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Navbar */}
        <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/dashboard" className="flex items-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Healthify</span>
                  </Link>
                </div>
                
                <nav className="ml-4 flex items-center space-x-3">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-2 py-2 rounded-md text-sm font-medium transition-all ${
                        pathname === item.href
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="mr-1">{item.icon}</span>
                      <span className="hidden md:inline">{item.name}</span>
                    </Link>
                  ))}
                </nav>
              </div>
              
              {/* Logout button - positioned on the right with less padding */}
              <div className="flex items-center ml-2">
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-grow py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Add Footer */}
        <Footer />
      </div>
    </ProtectedRoute>
  );
} 
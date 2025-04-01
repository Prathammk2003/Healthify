'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  User, 
  Pill, 
  Brain, 
  Home, 
  Bell, 
  UserSearch,
  LogOut,
  Users,
  FileText,
  ShieldCheck,
  Utensils
} from 'lucide-react';
import { NotificationBadge } from './ui/notification-badge';
import { useAuth } from './AuthProvider';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const { isAuthenticated, userId, role, isAdmin, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getDashboardLink = () => {
    if (!isAuthenticated) return '/';
    if (isAdmin) return '/dashboard/admin';
    if (role === 'doctor') return '/dashboard/doctor';
    return '/dashboard/patient';
  };

  const patientLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { href: '/dashboard/appointments', label: 'Appointments', icon: <Calendar className="h-4 w-4" /> },
    { href: '/dashboard/medications', label: 'Medications', icon: <Pill className="h-4 w-4" /> },
    { href: '/dashboard/mental-health', label: 'Mental Health', icon: <Brain className="h-4 w-4" /> },
    { href: '/dashboard/nutrition', label: 'Nutrition Planner', icon: <Utensils className="h-4 w-4" /> },
    { href: '/dashboard/profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { 
      href: '/dashboard/notifications', 
      label: 'Notifications', 
      icon: (
        <span className="relative">
          <Bell className="h-4 w-4" />
          {userId && <NotificationBadge userId={userId} />}
        </span>
      ) 
    }
  ];

  const doctorLinks = [
    { href: '/dashboard/doctor', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { href: '/dashboard/patients', label: 'Patients', icon: <Users className="h-4 w-4" /> },
    { href: '/dashboard/profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { 
      href: '/dashboard/notifications', 
      label: 'Notifications', 
      icon: (
        <span className="relative">
          <Bell className="h-4 w-4" />
          {userId && <NotificationBadge userId={userId} />}
        </span>
      ) 
    }
  ];

  // Add admin link if user is an admin
  if (isAdmin) {
    const adminLink = { 
      href: '/dashboard/admin', 
      label: 'Admin', 
      icon: <ShieldCheck className="h-4 w-4" /> 
    };
    
    // Add to both link arrays to ensure it's always visible
    patientLinks.splice(5, 0, adminLink);
    doctorLinks.splice(3, 0, adminLink);
  }

  const activeLinks = role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href={getDashboardLink()} className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Healthify
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {!isAuthenticated ? (
              <div className="space-x-4">
                <Link href="/login">
                  <span className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Login
                  </span>
                </Link>
                <Link href="/register">
                  <span className="button-gradient">
                    Register
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {activeLinks.map((link) => (
                  <Link 
                    key={link.href}
                    href={link.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive(link.href) 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="mr-2">{link.icon}</span>
                    <span className="hidden md:inline">{link.label}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
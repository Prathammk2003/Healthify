'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  Bell,
  Shield,
  Home,
  Calendar,
  PillIcon,
  Brain,
  Utensils,
  FileText,
  User,
  Stethoscope,
  Clock,
  BarChart3,
  Sparkles,
  Activity,
  Heart,
  Menu,
  X
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Footer from '@/components/Footer';
import ThemeToggle from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';

export default function DashboardLayout({ children }) {
  const { isAuthenticated, logout, userId, isAdmin, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger navigation animation
    setIsVisible(true);

    // Mouse tracking for interactive effects
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    // Scroll detection for glassmorphism effect
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
    const commonItems = [];

    // Patient-specific items
    const patientItems = [
      { name: 'Predictive Analysis', href: '/dashboard/predictive-analytics', icon: <BarChart3 className="h-5 w-5" />, color: 'from-purple-500 to-indigo-500' },
      { name: 'Appointments', href: '/dashboard/appointments', icon: <Calendar className="h-5 w-5" />, color: 'from-blue-500 to-cyan-500' },
      { name: 'Medications', href: '/dashboard/medications', icon: <PillIcon className="h-5 w-5" />, color: 'from-green-500 to-emerald-500' },
      { name: 'Mental Health', href: '/dashboard/mental-health', icon: <Brain className="h-5 w-5" />, color: 'from-pink-500 to-rose-500' },
      { name: 'Nutrition', href: '/dashboard/nutrition', icon: <Utensils className="h-5 w-5" />, color: 'from-orange-500 to-amber-500' },
      { name: 'Symptom Checker', href: '/dashboard/symptom-checker', icon: <Stethoscope className="h-5 w-5" />, color: 'from-teal-500 to-cyan-500' },
    ];

    // Doctor-specific items
    const doctorItems = [
      { name: 'Dashboard', href: '/dashboard/doctor', icon: <Home className="h-5 w-5" />, color: 'from-blue-500 to-indigo-500' },
      { name: 'Patients', href: '/dashboard/patients', icon: <FileText className="h-5 w-5" />, color: 'from-green-500 to-teal-500' },
      { name: 'Time Slots', href: '/dashboard/doctor/daily-slots', icon: <Clock className="h-5 w-5" />, color: 'from-purple-500 to-pink-500' },
    ];

    // Admin-specific items
    const adminItems = [
      { name: 'Dashboard', href: '/dashboard/admin', icon: <Home className="h-5 w-5" />, color: 'from-blue-500 to-indigo-500' },
      { name: 'Users', href: '/dashboard/admin/users', icon: <User className="h-5 w-5" />, color: 'from-green-500 to-emerald-500' },
      { name: 'Settings', href: '/dashboard/admin/settings', icon: <Shield className="h-5 w-5" />, color: 'from-red-500 to-pink-500' },
    ];

    // Build the navigation items based on role
    let navItems = [];

    if (isAdmin) {
      // For admins, use adminItems
      navItems = [...adminItems];
    } else if (role === 'doctor') {
      // For doctors, use doctorItems and add common items
      navItems = [...doctorItems, ...commonItems];
    } else {
      // For patients and other roles
      navItems = [...patientItems, ...commonItems];
    }

    return navItems;
  };

  const navItems = getNavItems();

  return (
    <ProtectedRoute>
      {/* Interactive background gradient */}
      <div className="fixed inset-0 pointer-events-none z-30">
        <div
          className="absolute w-96 h-96 bg-gradient-radial from-blue-400/5 to-transparent rounded-full transition-all duration-700 ease-out"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
      </div>

      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Enhanced Navbar */}
        <header className={`relative z-40 transition-all duration-500 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}>
          <div className={`backdrop-blur-xl border-b transition-all duration-300 ${isScrolled
            ? 'bg-white/90 dark:bg-gray-900/90 border-white/30 dark:border-gray-700/30 shadow-xl'
            : 'bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/20 shadow-lg'
            }`}>
            {/* Animated background pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-50"></div>
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] [mask-image:linear-gradient(90deg,transparent,white,transparent)]"></div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer opacity-30"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
              <div className="flex justify-between items-center h-16">
                {/* Left section with logo and navigation */}
                <div className="flex items-center space-x-6">
                  {/* Enhanced Logo */}
                  <Link href="/dashboard" className="group flex items-center space-x-3 transition-all duration-300 hover:scale-105">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                      <div className="relative w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                        <Heart className="h-5 w-5 text-white animate-pulse" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Healthify
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide hidden sm:block">
                        Dashboard
                      </span>
                    </div>
                  </Link>

                  {/* Desktop Navigation */}
                  <nav className="hidden lg:flex items-center space-x-3">
                    {navItems.map((item, index) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group relative flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 isolate border border-transparent hover:border-white/20 ${pathname === item.href
                          ? 'text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-200 hover:text-white'
                          }`}
                        style={{
                          animationDelay: `${index * 100}ms`,
                          zIndex: 10 + index
                        }}
                      >
                        {/* Active background */}
                        {pathname === item.href && (
                          <>
                            <div className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-xl shadow-lg`}></div>
                            <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse"></div>
                          </>
                        )}

                        {/* Hover background - with better isolation */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>

                        {/* Content - with better spacing */}
                        <span className="relative z-20 mr-3 transition-transform duration-200">{item.icon}</span>
                        <span className="relative z-20 transition-all duration-200 group-hover:font-semibold">{item.name}</span>

                        {/* Shine effect - with pointer-events-none */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none"></div>
                      </Link>
                    ))}
                  </nav>

                  {/* Mobile menu button */}
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="lg:hidden group relative p-2 rounded-xl transition-all duration-300 hover:scale-105 text-gray-700 dark:text-gray-200"
                  >
                    <div className="absolute inset-0 bg-blue-500/10 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                    {isSidebarOpen ? (
                      <X className="relative z-10 h-5 w-5" />
                    ) : (
                      <Menu className="relative z-10 h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Right section with user actions */}
                <div className="flex items-center space-x-4">
                  {/* Notifications */}
                  <Link
                    href="/dashboard/notifications"
                    className="group relative p-3 rounded-xl transition-all duration-300 isolate border border-transparent hover:border-yellow-300/30"
                    style={{ zIndex: 30 }}
                  >
                    <div className="absolute inset-0 bg-yellow-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <Bell className="relative z-20 h-5 w-5 text-gray-700 dark:text-gray-200 group-hover:text-yellow-600 transition-colors duration-200" />
                    {userId && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse pointer-events-none"></div>
                    )}
                  </Link>

                  {/* User Profile Quick Access */}
                  <Link
                    href="/dashboard/profile"
                    className="group relative flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 isolate border border-transparent hover:border-blue-300/30"
                    style={{ zIndex: 31 }}
                  >
                    <div className="absolute inset-0 bg-gray-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <div className="relative z-20 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="relative z-20 hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors duration-200">
                      {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'}
                    </span>
                  </Link>

                  {/* Theme Toggle */}
                  <div className="relative" style={{ zIndex: 31 }}>
                    <ThemeToggle />
                  </div>

                  {/* Enhanced Logout Button */}
                  <button
                    onClick={handleSignOut}
                    className="group relative flex items-center px-4 py-2 rounded-xl transition-all duration-300 isolate border border-transparent hover:border-red-300/30"
                    style={{ zIndex: 32 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                    <LogOut className="relative z-20 h-4 w-4 mr-2 text-gray-700 dark:text-gray-200 group-hover:text-white transition-all duration-200" />
                    <span className="relative z-20 hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-white transition-all duration-200">
                      Logout
                    </span>

                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none"></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom border glow */}
            <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-50'
              }`}></div>
          </div>
        </header>

        {/* Mobile Sidebar */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setIsSidebarOpen(false)}
            ></div>

            {/* Sidebar */}
            <div className="absolute top-0 left-0 w-80 h-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-white/20 transform transition-transform duration-300">
              <div className="p-6">
                {/* Close button */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Logo */}
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Healthify
                  </span>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-2">
                  {navItems.map((item, index) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`group relative flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${pathname === item.href
                        ? 'text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-200 hover:text-white'
                        }`}
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      {/* Active/Hover background */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-xl ${pathname === item.href ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        } transition-opacity duration-300`}></div>

                      {/* Content */}
                      <span className="relative z-10 mr-3">{item.icon}</span>
                      <span className="relative z-10">{item.name}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="relative z-10 flex-grow py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Enhanced Footer */}
        <Footer />
      </div>
    </ProtectedRoute>
  );
} 
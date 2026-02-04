'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Utensils,
  BarChart3,
  Sparkles,
  Activity
} from 'lucide-react';
import { NotificationBadge } from './ui/notification-badge';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const pathname = usePathname();

  // Don't show navbar on landing page or dashboard pages to avoid duplication
  if (pathname === '/' || pathname === '/login' || pathname === '/register' || pathname?.startsWith('/dashboard')) {
    return null;
  }

  const { isAuthenticated, userId, role, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger navbar animation
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

  const isActive = (path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const handleLogout = async () => {
    try {
      // Call the logout function from AuthProvider
      await logout();

      // Use router for navigation instead of direct window.location change
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still attempt to redirect even if there was an error during logout
      router.push('/login');
    }
  };

  const getDashboardLink = () => {
    if (!isAuthenticated) return '/';
    if (isAdmin) return '/dashboard/admin';
    if (role === 'doctor') return '/dashboard/doctor';
    return '/dashboard/patient';
  };

  const patientLinks = [
    { href: '/dashboard/predictive-analytics', label: 'Predictive Analysis', icon: <BarChart3 className="h-4 w-4" />, color: 'from-purple-500 to-indigo-500' },
    { href: '/dashboard/appointments', label: 'Appointments', icon: <Calendar className="h-4 w-4" />, color: 'from-blue-500 to-cyan-500' },
    { href: '/dashboard/medications', label: 'Medications', icon: <Pill className="h-4 w-4" />, color: 'from-green-500 to-emerald-500' },
    { href: '/dashboard/mental-health', label: 'Mental Health', icon: <Brain className="h-4 w-4" />, color: 'from-pink-500 to-rose-500' },
    { href: '/dashboard/nutrition', label: 'Nutrition Planner', icon: <Utensils className="h-4 w-4" />, color: 'from-orange-500 to-amber-500' },
    { href: '/dashboard/profile', label: 'Profile', icon: <User className="h-4 w-4" />, color: 'from-slate-500 to-gray-500' },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
      icon: (
        <span className="relative">
          <Bell className="h-4 w-4" />
          {userId && <NotificationBadge userId={userId} />}
        </span>
      ),
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  const doctorLinks = [
    { href: '/dashboard/doctor', label: 'Dashboard', icon: <Home className="h-4 w-4" />, color: 'from-blue-500 to-indigo-500' },
    { href: '/dashboard/patients', label: 'Patients', icon: <Users className="h-4 w-4" />, color: 'from-green-500 to-teal-500' },
    { href: '/dashboard/profile', label: 'Profile', icon: <User className="h-4 w-4" />, color: 'from-slate-500 to-gray-500' },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
      icon: (
        <span className="relative">
          <Bell className="h-4 w-4" />
          {userId && <NotificationBadge userId={userId} />}
        </span>
      ),
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  // Add admin link if user is an admin
  if (isAdmin) {
    const adminLink = {
      href: '/dashboard/admin',
      label: 'Admin',
      icon: <ShieldCheck className="h-4 w-4" />,
      color: 'from-red-500 to-pink-500'
    };

    // Add to both link arrays to ensure it's always visible
    patientLinks.splice(5, 0, adminLink);
    doctorLinks.splice(3, 0, adminLink);
  }

  const activeLinks = role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <>
      {/* Interactive background gradient */}
      <div className="fixed inset-0 pointer-events-none z-40">
        <div
          className="absolute w-96 h-96 bg-gradient-radial from-blue-400/5 to-transparent rounded-full transition-all duration-700 ease-out"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
      </div>

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}>
        {/* Enhanced glassmorphism container */}
        <div className={`relative backdrop-blur-xl border-b transition-all duration-300 ${isScrolled
          ? 'bg-white/80 dark:bg-gray-900/80 border-white/30 dark:border-gray-700/30 shadow-lg'
          : 'bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/20'
          }`}>
          {/* Animated background pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-50"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] [mask-image:linear-gradient(90deg,transparent,white,transparent)]"></div>

          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer opacity-30"></div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Enhanced Logo */}
              <Link href={getDashboardLink()} className="group flex items-center space-x-3 transition-all duration-300 hover:scale-105">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                  <div className="relative w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <Sparkles className="h-5 w-5 text-white animate-pulse" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Healthify
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                    Healthcare Platform
                  </span>
                </div>
              </Link>

              {/* Enhanced Navigation Menu */}
              <div className="flex items-center space-x-2">
                {!isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    {/* Theme Toggle */}
                    <ThemeToggle />

                    <Link href="/login" className="group relative">
                      <span className="relative z-10 px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 font-medium">
                        Login
                      </span>
                      <div className="absolute inset-0 bg-blue-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                    </Link>
                    <Link href="/register" className="group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                      <span className="relative z-10 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2">
                        <Activity className="h-4 w-4" />
                        <span>Get Started</span>
                      </span>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    {/* Navigation Links */}
                    {activeLinks.map((link, index) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`group relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${isActive(link.href)
                          ? 'text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-200 hover:text-white'
                          }`}
                        style={{
                          animationDelay: `${index * 100}ms`
                        }}
                      >
                        {/* Active background */}
                        {isActive(link.href) && (
                          <>
                            <div className={`absolute inset-0 bg-gradient-to-r ${link.color} rounded-xl shadow-lg`}></div>
                            <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse"></div>
                          </>
                        )}

                        {/* Hover background */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${link.color} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                        {/* Content */}
                        <span className="relative z-10 mr-2 group-hover:scale-110 transition-transform duration-200">{link.icon}</span>
                        <span className="relative z-10 hidden md:inline group-hover:font-semibold transition-all duration-200">{link.label}</span>

                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                      </Link>
                    ))}

                    {/* Theme Toggle */}
                    <div className="ml-2">
                      <ThemeToggle />
                    </div>

                    {/* Enhanced Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="group relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 text-gray-700 dark:text-gray-200 hover:text-white ml-2"
                    >
                      {/* Background effects */}
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute inset-0 bg-red-500/10 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>

                      {/* Content */}
                      <LogOut className="relative z-10 h-4 w-4 mr-2 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200" />
                      <span className="relative z-10 hidden md:inline group-hover:font-semibold transition-all duration-200">Log out</span>

                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom border glow */}
          <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-50'
            }`}></div>
        </div>
      </nav>

      {/* Spacer to prevent content from hiding behind fixed navbar */}
      <div className="h-16"></div>
    </>
  );
};

export default Navbar;
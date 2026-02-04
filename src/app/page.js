'use client';
import { useEffect, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalAppointments: 0,
    uptime: 99.9
  });

  useEffect(() => {
    setIsLoaded(true);

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Fetch real statistics from the database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats({
            activeUsers: data.activeUsers || 0,
            totalAppointments: data.totalAppointments || 0,
            uptime: data.uptime || 99.9
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 text-gray-900 dark:text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating Blob 1 */}
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"
          style={{
            top: '10%',
            left: '10%',
          }}
        />
        {/* Floating Blob 2 */}
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
          style={{
            top: '60%',
            right: '10%',
          }}
        />
        {/* Floating Blob 3 */}
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-cyan-400/20 to-blue-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
          style={{
            bottom: '10%',
            left: '30%',
          }}
        />

        {/* Interactive Gradient Following Mouse */}
        <div
          className="absolute w-96 h-96 bg-gradient-radial from-blue-500/10 to-transparent rounded-full transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Navigation Header */}
      <header className="absolute top-0 left-0 right-0 px-6 py-6 z-50">
        <div className="max-w-7xl mx-auto">
          <nav className="glass-card-3d p-4 flex justify-between items-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              ⚡ Healthify
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex space-x-6">
                <a href="#features" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white transition-colors hover:text-shimmer">Features</a>
                <a href="#about" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white transition-colors hover:text-shimmer">About</a>
                <a href="#contact" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white transition-colors hover:text-shimmer">Contact</a>
              </div>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative z-10">
        <div className={`glass-card-3d p-12 max-w-5xl transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 backdrop-blur-sm mb-6">
              <span className="text-sm font-medium text-blue-300">✨ Next-Gen Healthcare Platform</span>
            </div>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
            <span className="block text-shimmer bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Your Health,
            </span>
            <span className="block text-shimmer bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Reimagined
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Experience the future of healthcare management with AI-powered insights, smart reminders,
            and seamless appointment scheduling—all in one beautiful, secure platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <a
              href="/register"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 hover-lift glow focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></span>
              <span className="relative flex items-center">
                🚀 Start Your Journey
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>

            <a
              href="/login"
              className="group px-8 py-4 rounded-xl font-semibold border border-white/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover-lift text-lg"
            >
              <span className="flex items-center">
                🔐 Sign In
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </span>
            </a>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-12 border-t border-gray-200 dark:border-white/10">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {stats.activeUsers > 0 ? stats.activeUsers.toLocaleString() : '0'}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {stats.totalAppointments > 0 ? stats.totalAppointments.toLocaleString() : '0'}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Appointments</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-2">{stats.uptime}%</div>
              <div className="text-gray-600 dark:text-gray-400">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 backdrop-blur-sm mb-6">
              <span className="text-sm font-medium text-purple-300">✨ Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-shimmer bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Why Choose Healthify?
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover the advanced features that make healthcare management effortless and intelligent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 - Smart Scheduling */}
            <a href="/dashboard/appointments" className="glass-card-3d group cursor-pointer hover-lift">
              <div className="relative">
                <div className="dashboard-icon from-blue-500 to-cyan-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-blue-400 transition-colors">
                  📅 Smart Scheduling
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  AI-powered appointment scheduling that finds the perfect time slots based on your preferences and availability.
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>

            {/* Feature 2 - Predictive Analytics */}
            <a href="/dashboard/predictive-analytics" className="glass-card-3d group cursor-pointer hover-lift">
              <div className="relative">
                <div className="dashboard-icon from-green-500 to-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-green-400 transition-colors">
                  📊 Predictive Analytics
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  Advanced health analytics with machine learning to predict health trends and provide personalized insights.
                </p>
                <div className="flex items-center text-green-600 dark:text-green-400 font-medium">
                  <span>Explore analytics</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>

            {/* Feature 3 - Security */}
            <a href="/dashboard/profile" className="glass-card-3d group cursor-pointer hover-lift">
              <div className="relative">
                <div className="dashboard-icon from-purple-500 to-pink-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-purple-400 transition-colors">
                  🔒 Bank-Grade Security
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  Your health data is protected with end-to-end encryption and industry-leading security protocols.
                </p>
                <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium">
                  <span>Security details</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>

            {/* Feature 4 - AI Health Assistant */}
            <a href="/dashboard/symptom-checker" className="glass-card-3d group cursor-pointer hover-lift">
              <div className="relative">
                <div className="dashboard-icon from-orange-500 to-red-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-orange-400 transition-colors">
                  🤖 AI Health Assistant
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  Get instant answers to health questions and personalized recommendations from our AI-powered assistant.
                </p>
                <div className="flex items-center text-orange-600 dark:text-orange-400 font-medium">
                  <span>Try AI assistant</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>

            {/* Feature 5 - Medications */}
            <a href="/dashboard/medications" className="glass-card-3d group cursor-pointer hover-lift">
              <div className="relative">
                <div className="dashboard-icon from-cyan-500 to-blue-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-cyan-400 transition-colors">
                  💊 Smart Medications
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  Track your medications with smart reminders via SMS and voice calls to ensure you never miss a dose.
                </p>
                <div className="flex items-center text-cyan-600 dark:text-cyan-400 font-medium">
                  <span>Manage medications</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>

            {/* Feature 6 - Mental Health */}
            <a href="/dashboard/mental-health" className="glass-card-3d group cursor-pointer hover-lift">
              <div className="relative">
                <div className="dashboard-icon from-pink-500 to-rose-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-pink-400 transition-colors">
                  🧠 Mental Health Tracking
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  Monitor your stress, anxiety, and mood with daily check-ins. Get personalized insights and mental wellness recommendations.
                </p>
                <div className="flex items-center text-pink-600 dark:text-pink-400 font-medium">
                  <span>Track wellbeing</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>

            {/* Feature 7 - Nutrition */}
            <a href="/dashboard/nutrition" className="glass-card-3d group cursor-pointer hover-lift">
              <div className="relative">
                <div className="dashboard-icon from-yellow-500 to-orange-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-yellow-400 transition-colors">
                  🥗 Smart Nutrition
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  Plan your meals, track calories, and get personalized nutrition recommendations based on your health goals.
                </p>
                <div className="flex items-center text-yellow-600 dark:text-yellow-400 font-medium">
                  <span>Plan nutrition</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>

            {/* Feature 8 - Medical Records */}
            <a href="/dashboard/medical-records" className="glass-card-3d group cursor-pointer hover-lift">
              <div className="relative">
                <div className="dashboard-icon from-indigo-500 to-purple-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-indigo-400 transition-colors">
                  📋 Medical Records
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  Securely store and access all your medical records, lab results, and health documents in one place.
                </p>
                <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium">
                  <span>View records</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 backdrop-blur-sm mb-6">
              <span className="text-sm font-medium text-green-300">⚙️ Simple Process</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-shimmer bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="text-center relative">
              <div className="glass-card-3d p-8 mb-6">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-2xl font-bold">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-4">Sign Up</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Create your secure account in under 2 minutes with our streamlined onboarding process.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-center relative">
              <div className="glass-card-3d p-8 mb-6">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-4">Set Up Profile</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Add your health information, preferences, and connect with your healthcare providers.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center relative">
              <div className="glass-card-3d p-8 mb-6">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-2xl font-bold">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-4">Start Managing</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Begin scheduling appointments, tracking medications, and monitoring your health journey.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 backdrop-blur-sm mb-6">
              <span className="text-sm font-medium text-yellow-300">⭐ Testimonials</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-shimmer bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                What Our Users Say
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card-3d hover-lift">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400 mb-2">
                  <span>⭐⭐⭐⭐⭐</span>
                </div>
              </div>
              <blockquote className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "Healthify has revolutionized how I manage my diabetes. The smart reminders and predictive analytics have helped me maintain better control."
              </blockquote>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold mr-4">
                  SM
                </div>
                <div>
                  <div className="font-semibold">Sarah Mitchell</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Diabetes Patient</div>
                </div>
              </div>
            </div>

            <div className="glass-card-3d hover-lift">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400 mb-2">
                  <span>⭐⭐⭐⭐⭐</span>
                </div>
              </div>
              <blockquote className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "As a busy professional, scheduling appointments was always a hassle. Healthify's AI scheduling finds perfect slots every time."
              </blockquote>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold mr-4">
                  JD
                </div>
                <div>
                  <div className="font-semibold">Dr. James Rodriguez</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Cardiologist</div>
                </div>
              </div>
            </div>

            <div className="glass-card-3d hover-lift">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400 mb-2">
                  <span>⭐⭐⭐⭐⭐</span>
                </div>
              </div>
              <blockquote className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "The security and privacy features give me complete peace of mind. I can manage my family's health with confidence."
              </blockquote>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold mr-4">
                  AL
                </div>
                <div>
                  <div className="font-semibold">Amanda Liu</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Parent & Patient</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="glass-card-3d p-16 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 backdrop-blur-sm mb-8">
                <span className="text-sm font-medium text-blue-300">🚀 Join {stats.activeUsers > 0 ? stats.activeUsers.toLocaleString() : '0'}+ Users</span>
              </div>

              <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
                <span className="text-shimmer bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Ready to Transform
                </span>
                <br />
                <span className="text-shimmer bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Your Health Journey?
                </span>
              </h2>

              <p className="text-xl text-gray-700 dark:text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                Join thousands of satisfied users who have taken control of their health with Healthify's comprehensive platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <a
                  href="/register"
                  className="group relative inline-flex items-center justify-center px-10 py-4 text-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 hover-lift glow focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></span>
                  <span className="relative flex items-center">
                    🎆 Start Free Today
                    <svg className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </a>

                <a
                  href="#features"
                  className="group px-8 py-4 rounded-xl font-semibold border border-white/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover-lift text-lg"
                >
                  <span className="flex items-center">
                    📚 Learn More
                    <svg className="w-5 h-5 ml-2 group-hover:translate-y-[-2px] transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </span>
                </a>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-center space-x-8 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Free 30-day trial
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    No credit card required
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cancel anytime
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                ⚡ Healthify
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-md">
                The future of healthcare management. Secure, intelligent, and designed for everyone.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center hover:scale-110 transition-transform">
                  <span className="text-white font-bold">f</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center hover:scale-110 transition-transform">
                  <span className="text-white font-bold">t</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center hover:scale-110 transition-transform">
                  <span className="text-white font-bold">in</span>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Mobile App</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10 text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2024 Healthify. All rights reserved. Made with ❤️ for better health outcomes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

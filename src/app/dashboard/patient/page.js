'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Chart from 'chart.js/auto';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import {
  Calendar,
  Clock,
  PillIcon,
  Brain,
  AlertCircle,
  Utensils,
  Activity,
  BarChart,
  Zap,
  Stethoscope,
  TrendingUp,
  Heart,
  Shield,
  Target,
  Sparkles,
  ArrowRight,
  Timer,
  CheckCircle2,
  Settings,
  Bell,
  Star,
  Flame
} from 'lucide-react';

export default function PatientDashboard() {
  const { data: session } = useSession();
  const { userId, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [mhProgressData, setMhProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect theme changes
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // Check initially
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    async function fetchData() {
      // Get authentication token - AuthProvider now handles JWT generation for NextAuth users
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const currentUserId = session?.user?.id || localStorage.getItem('userId') || userId;

      if (!isAuthenticated || !currentUserId || !token || token === 'nextauth-session') {
        console.log('⚠️ Waiting for authentication to complete...');
        setMessage('🔄 Loading authentication...');
        setLoading(false);
        return;
      }

      try {
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        console.log('📊 Fetching dashboard data with token length:', token?.length);

        // Fetch user profile
        const profileRes = await fetch(`/api/user-profile/${currentUserId}`, {
          method: 'GET',
          headers,
        });
        const profileData = await profileRes.json();
        if (profileRes.ok) {
          setProfile(profileData.profile);
        } else {
          console.error('Profile fetch failed:', profileData);
        }

        // Fetch appointments
        const apptsRes = await fetch('/api/appointments', {
          method: 'GET',
          headers,
        });
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          setAppointments(apptsData.appointments || []);
        } else {
          console.error('Appointments fetch failed:', await apptsRes.text());
        }

        // Fetch medications
        const medsRes = await fetch('/api/medications', {
          method: 'GET',
          headers,
        });
        if (medsRes.ok) {
          const medsData = await medsRes.json();
          setMedications(medsData.reminders || []);
        }

        // Fetch mental health data for graph
        if (currentUserId) {
          const mhRes = await fetch(`/api/mentalhealth/progress?userId=${currentUserId}`, {
            headers,
          });
          if (mhRes.ok) {
            const mhData = await mhRes.json();
            setMhProgressData(mhData || []);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setMessage('❌ Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session, userId, isAuthenticated]);

  // Initialize charts when data is loaded OR theme changes
  useEffect(() => {
    if (mhProgressData.length > 0) {
      const ctx = document.getElementById('mhProgressChart');

      // Check if there's an existing chart and destroy it
      if (ctx && ctx.chart) {
        ctx.chart.destroy();
      }

      if (ctx) {
        // Create a new chart and store the reference
        ctx.chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: mhProgressData.map(record => new Date(record.timestamp).toLocaleDateString()),
            datasets: [{
              label: 'Stress Level',
              data: mhProgressData.map(record => record.stressLevel),
              borderColor: 'rgb(59, 130, 246)', // Blue
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'rgb(59, 130, 246)',
              pointBorderColor: isDarkMode ? '#1f2937' : '#fff',
              pointBorderWidth: 3,
              pointRadius: 6,
              pointHoverRadius: 8,
              borderWidth: 3
            }, {
              label: 'Sleep Hours',
              data: mhProgressData.map(record => record.sleepHours),
              borderColor: 'rgb(16, 185, 129)', // Green
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'rgb(16, 185, 129)',
              pointBorderColor: isDarkMode ? '#1f2937' : '#fff',
              pointBorderWidth: 3,
              pointRadius: 6,
              pointHoverRadius: 8,
              borderWidth: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 20,
                  font: {
                    family: 'Outfit',
                    size: 14
                  },
                  color: isDarkMode ? '#f3f4f6' : '#374151'
                }
              },
              title: {
                display: true,
                text: 'Health Trends Over Time',
                font: {
                  size: 18,
                  family: 'Clash Display',
                  weight: 'bold'
                },
                color: isDarkMode ? '#f3f4f6' : '#374151'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 163, 175, 0.2)',
                  drawBorder: false
                },
                ticks: {
                  font: {
                    family: 'Outfit'
                  },
                  color: isDarkMode ? '#d1d5db' : '#6B7280'
                }
              },
              x: {
                grid: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 163, 175, 0.2)',
                  drawBorder: false
                },
                ticks: {
                  font: {
                    family: 'Outfit'
                  },
                  color: isDarkMode ? '#d1d5db' : '#6B7280'
                }
              }
            },
            interaction: {
              intersect: false,
              mode: 'index'
            },
            elements: {
              point: {
                hoverBackgroundColor: isDarkMode ? '#1f2937' : '#fff'
              }
            }
          }
        });
      }
    }
  }, [mhProgressData, isDarkMode]); // Added isDarkMode dependency

  // Get the date of the next appointment
  const getNextAppointment = () => {
    if (!appointments || appointments.length === 0) return null;

    const sortedAppointments = [...appointments]
      .filter(apt => apt.status === 'approved')
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
      });

    const now = new Date();
    const futureAppointments = sortedAppointments.filter(apt => {
      const aptDate = new Date(`${apt.date}T${apt.time}`);
      return aptDate > now;
    });

    return futureAppointments.length > 0 ? futureAppointments[0] : null;
  };

  // Get next medication to take
  const getNextMedication = () => {
    if (!medications || medications.length === 0) return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Sort medications by time
    const sortedMeds = [...medications].sort((a, b) => {
      const [hoursA, minutesA] = a.time.split(':').map(Number);
      const [hoursB, minutesB] = b.time.split(':').map(Number);
      return (hoursA * 60 + minutesA) - (hoursB * 60 + minutesB);
    });

    // Find the next medication to take today
    const nextMed = sortedMeds.find(med => {
      const [hours, minutes] = med.time.split(':').map(Number);
      const medTime = hours * 60 + minutes;
      return medTime > currentTime;
    });

    return nextMed || sortedMeds[0]; // Return the first med of tomorrow if none left today
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Loading Your Health Dashboard</h3>
            <p className="text-gray-600 dark:text-gray-400">Preparing your personalized health insights...</p>
          </div>
        </div>
      </div>
    );
  }

  const nextAppointment = getNextAppointment();
  const nextMedication = getNextMedication();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>

        {/* Floating particles */}
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 20}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header with improved animations */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-500">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-500"></div>

          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm hover:bg-white/30 transition-all duration-300 hover:scale-110">
                    <Heart className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold mb-2 text-shimmer">Your Health Journey</h1>
                    <p className="text-xl text-white/90">
                      Welcome back, <span className="font-semibold text-yellow-200">
                        {profile ? (
                          profile.lastName && profile.lastName !== 'Not Provided'
                            ? `${profile.firstName} ${profile.lastName}`.trim()
                            : profile.firstName || 'Patient'
                        ) : 'Patient'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <Timer className="h-5 w-5" />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-green-200 transition-colors">
                    <CheckCircle2 className="h-5 w-5 text-green-300" />
                    <span>Health tracking active</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-blue-200 transition-colors">
                    <Shield className="h-5 w-5 text-blue-300" />
                    <span>Data secured</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <Sparkles className="h-16 w-16 text-white animate-spin-slow" />
                  </div>
                  {/* Pulse rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse-ring"></div>
                  <div className="absolute inset-2 rounded-full border border-white/10 animate-pulse-ring" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced floating elements */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="w-20 h-20 border-2 border-white rounded-full animate-ping"></div>
          </div>
          <div className="absolute bottom-4 left-4 opacity-20">
            <div className="w-16 h-16 border border-white rounded-full animate-bounce"></div>
          </div>
          <div className="absolute top-1/2 right-1/4 opacity-10">
            <div className="w-8 h-8 bg-white rounded-full animate-float"></div>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl bg-red-100 border border-red-200 text-red-700 dark:bg-red-900/50 dark:border-red-800 dark:text-red-400 p-4">
            <div className="flex items-center">
              <AlertCircle className="mr-3 h-5 w-5" />
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}

        {/* Enhanced Stats Grid with improved animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Next Appointment Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-rotate-1 interactive-card">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <Calendar className="h-6 w-6 group-hover:animate-pulse" />
                </div>
                <div className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {nextAppointment ? '1' : '0'}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-100 transition-colors">Next Appointment</h3>
              <p className="text-blue-100 text-sm group-hover:text-white transition-colors">
                {nextAppointment ? (
                  <>
                    {new Date(nextAppointment.date).toLocaleDateString()} at{' '}
                    {nextAppointment.time}
                  </>
                ) : (
                  'No upcoming appointments'
                )}
              </p>
              {nextAppointment && (
                <div className="mt-3 flex items-center gap-1 text-xs text-blue-200 group-hover:text-blue-100 transition-colors">
                  <Clock className="h-3 w-3" />
                  <span>In {Math.ceil((new Date(`${nextAppointment.date}T${nextAppointment.time}`) - new Date()) / (1000 * 60 * 60 * 24))} days</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-ping"></div>
          </div>

          {/* Active Medications Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:rotate-1 interactive-card">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <PillIcon className="h-6 w-6 group-hover:animate-bounce" />
                </div>
                <div className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {medications.length}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-green-100 transition-colors">Active Medications</h3>
              <p className="text-green-100 text-sm group-hover:text-white transition-colors">
                {medications.length > 0 ? `${medications.length} medications to track` : 'No medications added'}
              </p>
              {nextMedication && (
                <div className="mt-3 flex items-center gap-1 text-xs text-green-200 group-hover:text-green-100 transition-colors">
                  <Bell className="h-3 w-3" />
                  <span>Next: {nextMedication.medicationName} at {nextMedication.time}</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
          </div>

          {/* Mental Health Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-rotate-1 interactive-card">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <Brain className="h-6 w-6 group-hover:animate-pulse" />
                </div>
                <div className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {mhProgressData[mhProgressData.length - 1]?.stressLevel || '-'}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-purple-100 transition-colors">Mental Health</h3>
              <p className="text-purple-100 text-sm group-hover:text-white transition-colors">
                {mhProgressData.length > 0 ? `Last stress level: ${mhProgressData[mhProgressData.length - 1]?.stressLevel}/10` : 'Start tracking your mental health'}
              </p>
              {mhProgressData.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-purple-200 group-hover:text-purple-100 transition-colors mb-1">
                    <span>Trend</span>
                    <span>{mhProgressData.length > 1 && mhProgressData[mhProgressData.length - 1]?.stressLevel < mhProgressData[mhProgressData.length - 2]?.stressLevel ? '↓ Improving' : '→ Stable'}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-white rounded-full h-1.5 transition-all duration-500"
                      style={{ width: `${(10 - (mhProgressData[mhProgressData.length - 1]?.stressLevel || 5)) * 10}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Health Score Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:rotate-1 interactive-card">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <Activity className="h-6 w-6 group-hover:animate-pulse" />
                </div>
                <div className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {Math.round((appointments.length + medications.length + mhProgressData.length) / 3 * 10) || 0}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-orange-100 transition-colors">Health Score</h3>
              <p className="text-orange-100 text-sm group-hover:text-white transition-colors">
                Based on {appointments.length + medications.length + mhProgressData.length} health records
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-orange-200 group-hover:text-orange-100 transition-colors mb-1">
                  <span>Progress</span>
                  <span>{Math.round((appointments.length + medications.length + mhProgressData.length) / 3 * 10) || 0}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <div
                    className="bg-white rounded-full h-1.5 transition-all duration-500"
                    style={{ width: `${Math.min(100, (appointments.length + medications.length + mhProgressData.length) / 3 * 10)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
          </div>
        </div>

        {/* Enhanced Health Trends with improved design */}
        <div className="group relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl p-8 hover:shadow-3xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500"></div>

          {/* Floating background elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-purple-400/10 dark:from-blue-400/20 dark:to-purple-400/20 rounded-full animate-float"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-purple-400/10 to-pink-400/10 dark:from-purple-400/20 dark:to-pink-400/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2 group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-300">
                  Health Trends Analysis
                </h2>
                <p className="text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">Track your progress over time with AI-powered insights</p>
              </div>
              <div className="group/icon relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-hover/icon:opacity-20 transition-opacity duration-300"></div>
                <div className="relative p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl group-hover/icon:scale-110 transition-transform duration-300">
                  <BarChart className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="h-80 relative">
              {mhProgressData.length > 0 ? (
                <>
                  <div className="relative h-full bg-white dark:bg-gray-900/80 rounded-2xl p-4 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/30">
                    <canvas id="mhProgressChart" className="rounded-xl"></canvas>
                  </div>

                  {/* Enhanced legend */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/50 dark:bg-gray-800/90 dark:border-gray-700/50">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Health Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Stress Level</span>
                        <span className="ml-auto font-medium text-blue-600">{mhProgressData[mhProgressData.length - 1]?.stressLevel || 0}/10</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                        <span>Sleep Hours</span>
                        <span className="ml-auto font-medium text-green-600">{mhProgressData[mhProgressData.length - 1]?.sleepHours || 0}h</span>
                      </div>
                    </div>

                    {/* Trend indicator */}
                    <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span>7-day trend improving</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional insights */}
                  <div className="absolute bottom-4 left-4 bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-sm rounded-xl p-3 text-white shadow-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4" />
                      <span>Goal: Reduce stress by 20%</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                        <BarChart className="h-12 w-12 text-white relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
                      </div>
                      <div className="absolute inset-0 w-24 h-24 mx-auto border-2 border-blue-300 rounded-full animate-pulse-ring"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">No health data available</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">Start tracking your health to see beautiful insights, trends, and AI-powered recommendations</p>
                    <Link href="/dashboard/mental-health">
                      <button className="group inline-flex items-center bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:from-blue-600 hover:to-purple-600 hover:shadow-lg hover:scale-105">
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 group-hover:animate-spin" />
                          Start Tracking
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Health Tips & Goals Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white hover:shadow-2xl hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>

            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full animate-float"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <Star className="h-5 w-5 group-hover:animate-spin" />
                </div>
                <h3 className="text-lg font-semibold group-hover:text-indigo-100 transition-colors">Health Tip of the Day</h3>
              </div>
              <p className="text-indigo-100 mb-4 group-hover:text-white transition-colors leading-relaxed">
                {(() => {
                  const tips = [
                    "Stay hydrated! Drinking 8 glasses of water daily can improve your energy levels and mental clarity.",
                    "Get 7-9 hours of sleep each night for optimal health and cognitive function.",
                    "Take a 10-minute walk after meals to improve digestion and regulate blood sugar.",
                    "Practice deep breathing for 5 minutes daily to reduce stress and anxiety.",
                    "Eat a rainbow of fruits and vegetables to ensure you get all essential nutrients.",
                    "Limit screen time before bed to improve sleep quality and reduce eye strain.",
                    "Stand up and stretch every hour if you have a desk job to prevent back pain."
                  ];
                  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
                  return tips[dayOfYear % tips.length];
                })()}
              </p>
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-1 text-xs text-indigo-200">
                  <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
                  <span>Updated daily</span>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white hover:shadow-2xl hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>

            {/* Animated background elements */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full animate-float" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute bottom-0 right-0 w-18 h-18 bg-white/10 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <Flame className="h-5 w-5 group-hover:animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold group-hover:text-emerald-100 transition-colors">Weekly Goal</h3>
              </div>
              <p className="text-emerald-100 mb-4 group-hover:text-white transition-colors leading-relaxed">
                Complete 3 mental health check-ins this week. You're making great progress towards better mental wellness!
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-200 group-hover:text-emerald-100 transition-colors">Progress</span>
                  <span className="font-medium">
                    {(() => {
                      // Calculate check-ins this week
                      const weekStart = new Date();
                      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                      weekStart.setHours(0, 0, 0, 0);

                      const thisWeekCheckIns = mhProgressData.filter(entry => {
                        const entryDate = new Date(entry.timestamp);
                        return entryDate >= weekStart;
                      }).length;

                      return `${Math.min(thisWeekCheckIns, 3)}/3 completed`;
                    })()}
                  </span>
                </div>
                <div className="relative">
                  <div className="flex-1 bg-white/20 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-white rounded-full h-2.5 transition-all duration-1000 ease-out" style={{
                      width: `${(() => {
                        const weekStart = new Date();
                        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                        weekStart.setHours(0, 0, 0, 0);
                        const thisWeekCheckIns = mhProgressData.filter(entry => {
                          const entryDate = new Date(entry.timestamp);
                          return entryDate >= weekStart;
                        }).length;
                        return Math.min((thisWeekCheckIns / 3) * 100, 100);
                      })()}%`
                    }}></div>
                  </div>
                  <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-shimmer"></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-200 group-hover:text-emerald-100 transition-colors">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>
                    {(() => {
                      const weekStart = new Date();
                      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                      weekStart.setHours(0, 0, 0, 0);
                      const thisWeekCheckIns = mhProgressData.filter(entry => {
                        const entryDate = new Date(entry.timestamp);
                        return entryDate >= weekStart;
                      }).length;

                      if (thisWeekCheckIns >= 3) return "Goal completed! 🎉";

                      const lastEntry = mhProgressData[mhProgressData.length - 1];
                      if (!lastEntry) return "Start your first check-in today";

                      const lastEntryDate = new Date(lastEntry.timestamp);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      lastEntryDate.setHours(0, 0, 0, 0);

                      if (lastEntryDate.getTime() === today.getTime()) {
                        return "Check-in completed today!";
                      } else {
                        return "Next check-in available now";
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
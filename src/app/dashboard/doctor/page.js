'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  ChevronRight,
  Activity,
  Stethoscope,
  UserPlus,
  Settings,
  TrendingUp,
  Heart,
  Shield,
  Zap,
  Timer,
  Star,
  AlertCircle,
  CheckCircle2,
  Bell,
  RotateCcw,
  CalendarCheck,
  Target,
  Sparkles,
  ArrowRight,
  BarChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DoctorDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [pendingReschedules, setPendingReschedules] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    pendingRequests: 0,
    pendingAppointments: 0,
    pendingReschedules: 0,
    upcomingAppointments: 0
  });

  // Clear messages when they are displayed
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    fetchData();
  }, []);

  // Format date to display in a user-friendly way
  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Check if date is today
  const isToday = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      console.log('Fetching doctor dashboard data...');

      // Fetch all data in parallel
      const [profileRes, patientsRes, requestsRes, appointmentsRes] = await Promise.all([
        fetch('/api/doctors/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/doctors/patients', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/doctors/patient-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/doctors/appointments', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Initialize data
      let patientsData = { patients: [] };
      let pendingData = { requests: [] };
      let appointmentsData = { appointments: [] };

      // Handle profile response
      if (profileRes.ok) {
        // This is a placeholder for handling profile data
        console.log('Profile data fetched successfully');
      } else {
        if (profileRes.status === 401) {
          console.warn('Authentication expired fetching profile');
          logout();
          router.push('/login');
          return;
        }
        console.warn('Failed to fetch doctor profile:', await profileRes.text());
      }

      // Handle patients response
      if (patientsRes.ok) {
        patientsData = await patientsRes.json();
        console.log(`Fetched ${patientsData.patients?.length || 0} patients`);
        setPatients(patientsData.patients || []);
      } else {
        if (patientsRes.status === 401) {
          console.warn('Authentication expired fetching patients');
          logout();
          router.push('/login');
          return;
        }
        console.warn('Failed to fetch patients:', await patientsRes.text());
      }

      // Handle requests response
      if (requestsRes.ok) {
        pendingData = await requestsRes.json();
        console.log(`Fetched ${pendingData.requests?.length || 0} pending requests`);
        setPendingRequests(pendingData.requests || []);
      } else {
        if (requestsRes.status === 401) {
          console.warn('Authentication expired fetching requests');
          logout();
          router.push('/login');
          return;
        }
        console.warn('Failed to fetch patient requests:', await requestsRes.text());
      }

      // Handle appointments response
      if (appointmentsRes.ok) {
        appointmentsData = await appointmentsRes.json();
        console.log(`Fetched ${appointmentsData.appointments?.length || 0} appointments`);

        // Split appointments into different categories
        const pending = [];
        const reschedules = [];
        const upcoming = [];

        if (Array.isArray(appointmentsData.appointments)) {
          // Get current date for comparison
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          appointmentsData.appointments.forEach(appointment => {
            if (!appointment) return; // Skip null/undefined appointments

            console.log('Processing appointment:', appointment._id, 'Status:', appointment.status);

            if (appointment.status === 'pending') {
              pending.push(appointment);
            } else if (appointment.status === 'pending_update') {
              reschedules.push(appointment);
            } else if (appointment.status === 'approved') {
              // Check if appointment is in the future
              try {
                const appointmentDate = new Date(appointment.date);
                appointmentDate.setHours(0, 0, 0, 0);

                if (appointmentDate >= today) {
                  upcoming.push(appointment);
                }
              } catch (err) {
                console.error('Error processing appointment date:', err);
              }
            }
          });

          // Sort upcoming appointments by date (nearest first)
          upcoming.sort((a, b) => {
            try {
              return new Date(a.date) - new Date(b.date);
            } catch (err) {
              return 0;
            }
          });
        } else {
          console.error('Appointments data is not an array:', appointmentsData.appointments);
        }

        console.log(`Filtered ${pending.length} pending, ${reschedules.length} reschedules, and ${upcoming.length} upcoming appointments`);
        setPendingAppointments(pending);
        setPendingReschedules(reschedules);
        setUpcomingAppointments(upcoming);
      } else {
        if (appointmentsRes.status === 401) {
          console.warn('Authentication expired fetching appointments');
          logout();
          router.push('/login');
          return;
        }
        console.error('Failed to fetch appointments:', await appointmentsRes.text());
        setError('Failed to fetch appointments data');
      }

      // Update all stats at once
      setStats({
        totalPatients: patientsData.patients?.length || 0,
        pendingRequests: pendingData.requests?.length || 0,
        pendingAppointments: appointmentsData.appointments?.filter(a => a?.status === 'pending')?.length || 0,
        pendingReschedules: appointmentsData.appointments?.filter(a => a?.status === 'pending_update')?.length || 0,
        upcomingAppointments: appointmentsData.appointments?.filter(a => {
          if (!a || a?.status !== 'approved') return false;
          try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const appointmentDate = new Date(a.date);
            appointmentDate.setHours(0, 0, 0, 0);
            return appointmentDate >= today;
          } catch (err) {
            return false;
          }
        })?.length || 0
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load dashboard data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch('/api/doctors/patient-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, status })
      });

      const data = await res.json();
      if (res.ok) {
        // Update the UI without a full reload
        setPendingRequests(prevRequests =>
          prevRequests.filter(req => req._id !== requestId)
        );

        // Update stats
        setStats(prev => ({
          ...prev,
          pendingRequests: prev.pendingRequests - 1,
          totalPatients: status === 'approved' ? prev.totalPatients + 1 : prev.totalPatients
        }));

        // Show success message
        setSuccessMessage(`Request ${status} successfully`);

        // Refetch all data after a short delay
        setTimeout(() => fetchData(), 2000);
      } else {
        setError(data.error || 'Failed to update request');
      }
    } catch (error) {
      console.error("Request action error:", error);
      setError('Error updating request');
    }
  };

  const handleAppointmentAction = async (appointmentId, status, notes = '') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch('/api/doctors/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ appointmentId, status, notes })
      });

      const data = await res.json();
      if (res.ok) {
        // Check if this was a pending appointment or reschedule request
        const isPendingAppointment = pendingAppointments.some(apt => apt._id === appointmentId);
        const isRescheduleRequest = pendingReschedules.some(apt => apt._id === appointmentId);

        // Update the appropriate state
        if (isPendingAppointment) {
          setPendingAppointments(prevAppointments =>
            prevAppointments.filter(apt => apt._id !== appointmentId)
          );

          // Update stats
          setStats(prev => ({
            ...prev,
            pendingAppointments: prev.pendingAppointments - 1
          }));
        } else if (isRescheduleRequest) {
          setPendingReschedules(prevReschedules =>
            prevReschedules.filter(apt => apt._id !== appointmentId)
          );

          // Update stats
          setStats(prev => ({
            ...prev,
            pendingReschedules: prev.pendingReschedules - 1
          }));
        }

        // Show success message
        setSuccessMessage(`Appointment ${status} successfully`);

        // Refetch all data after a short delay
        setTimeout(() => fetchData(), 2000);
      } else {
        setError(data.error || 'Failed to update appointment');
      }
    } catch (error) {
      console.error("Appointment action error:", error);
      setError('Error updating appointment');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-purple-300 border-t-transparent rounded-full animate-ping mx-auto opacity-20"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Loading Doctor Dashboard</h3>
            <p className="text-gray-600 dark:text-gray-400">Preparing your medical workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>

        {/* Floating particles */}
        <div className="particles">
          {[...Array(15)].map((_, i) => (
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
        {/* Enhanced Header */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-500">
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
                    <Stethoscope className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold mb-2 text-shimmer">Doctor Dashboard</h1>
                    <p className="text-xl text-white/90">
                      Manage your patients and medical practice with ease
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <Timer className="h-5 w-5" />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-emerald-200 transition-colors">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <span>Practice active</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-cyan-200 transition-colors">
                    <Shield className="h-5 w-5 text-cyan-300" />
                    <span>HIPAA compliant</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <Heart className="h-16 w-16 text-white animate-pulse" />
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

        {error && (
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
            <div className="relative z-10 flex items-center">
              <AlertCircle className="mr-3 h-5 w-5 animate-pulse" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
            <div className="relative z-10 flex items-center">
              <CheckCircle2 className="mr-3 h-5 w-5 animate-bounce" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Enhanced Stats Grid with modern glassmorphism design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Patients Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-rotate-1 interactive-card">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <Users className="h-6 w-6 group-hover:animate-pulse" />
                </div>
                <div className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {stats.totalPatients}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-100 transition-colors">Total Patients</h3>
              <p className="text-blue-100 text-sm group-hover:text-white transition-colors">
                Active patients under care
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-blue-200 group-hover:text-blue-100 transition-colors mb-1">
                  <span>Growth</span>
                  <span>+{Math.floor(stats.totalPatients * 0.15)} this month</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <div className="bg-white rounded-full h-1.5 transition-all duration-500" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-ping"></div>
          </div>

          {/* Pending Requests Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:rotate-1 interactive-card">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <UserPlus className="h-6 w-6 group-hover:animate-bounce" />
                </div>
                <div className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {stats.pendingRequests}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-yellow-100 transition-colors">Patient Requests</h3>
              <p className="text-yellow-100 text-sm group-hover:text-white transition-colors">
                Awaiting your approval
              </p>
              {stats.pendingRequests > 0 && (
                <div className="mt-3 flex items-center gap-1 text-xs text-yellow-200 group-hover:text-yellow-100 transition-colors">
                  <Bell className="h-3 w-3 animate-pulse" />
                  <span>Requires immediate attention</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
          </div>

          {/* Pending Appointments Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-rotate-1 interactive-card">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <Calendar className="h-6 w-6 group-hover:animate-pulse" />
                </div>
                <div className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {stats.pendingAppointments}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-green-100 transition-colors">Pending Appointments</h3>
              <p className="text-green-100 text-sm group-hover:text-white transition-colors">
                Appointments to review
              </p>
              {stats.pendingAppointments > 0 && (
                <div className="mt-3 flex items-center gap-1 text-xs text-green-200 group-hover:text-green-100 transition-colors">
                  <Clock className="h-3 w-3" />
                  <span>Review and approve</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Pending Reschedules Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:rotate-1 interactive-card">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <RotateCcw className="h-6 w-6 group-hover:animate-spin" />
                </div>
                <div className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {stats.pendingReschedules || 0}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-orange-100 transition-colors">Reschedule Requests</h3>
              <p className="text-orange-100 text-sm group-hover:text-white transition-colors">
                Schedule changes pending
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-orange-200 group-hover:text-orange-100 transition-colors mb-1">
                  <span>Priority</span>
                  <span>{stats.pendingReschedules > 0 ? 'High' : 'None'}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <div className="bg-white rounded-full h-1.5 transition-all duration-500" style={{ width: stats.pendingReschedules > 0 ? '90%' : '0%' }}></div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
          </div>

          {/* Upcoming Appointments Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-rotate-1 interactive-card">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <CalendarCheck className="h-6 w-6 group-hover:animate-pulse" />
                </div>
                <div className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {stats.upcomingAppointments || 0}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-purple-100 transition-colors">Upcoming Today</h3>
              <p className="text-purple-100 text-sm group-hover:text-white transition-colors">
                Scheduled appointments
              </p>
              {stats.upcomingAppointments > 0 && (
                <div className="mt-3 flex items-center gap-1 text-xs text-purple-200 group-hover:text-purple-100 transition-colors">
                  <Activity className="h-3 w-3 animate-pulse" />
                  <span>Ready for consultation</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
          </div>
        </div>

        {/* Enhanced Upcoming Appointments Section */}
        <div className="group relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl p-8 hover:shadow-3xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-emerald-500/5 group-hover:from-blue-500/10 group-hover:via-cyan-500/10 group-hover:to-emerald-500/10 transition-all duration-500"></div>

          {/* Floating background elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full animate-float"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-cyan-400/10 to-emerald-400/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2 group-hover:from-blue-700 group-hover:to-cyan-700 transition-all duration-300">
                  Today's Schedule
                </h2>
                <p className="text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">Upcoming appointments and consultations</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="group/icon relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover/icon:opacity-20 transition-opacity duration-300"></div>
                  <div className="relative p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl group-hover/icon:scale-110 transition-transform duration-300">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                </div>
                <button className="group/btn px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all duration-300 hover:scale-105">
                  <Settings className="h-4 w-4 group-hover/btn:animate-spin" />
                </button>
              </div>
            </div>

            {upcomingAppointments.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingAppointments.map((appointment, index) => (
                  <div key={appointment._id} className="group/card relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-md border border-gray-200/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-rotate-1" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>

                    {/* Today badge */}
                    {isToday(appointment.date) && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-xs font-semibold shadow-md animate-pulse">
                          Today
                        </span>
                      </div>
                    )}

                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md group-hover/card:scale-110 transition-transform duration-300">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 group-hover/card:text-blue-600 transition-colors">
                            {appointment.userId.name || 'Unknown Patient'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Patient Consultation</p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <p className="text-sm font-medium">{formatDate(appointment.date)}</p>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 text-emerald-500" />
                          <p className="text-sm font-medium">{appointment.time}</p>
                        </div>
                      </div>

                      <Link href={`/dashboard/appointments/${appointment._id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full group/btn bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:from-blue-100 hover:to-cyan-100 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-300 hover:scale-105"
                        >
                          <span className="flex items-center justify-between w-full">
                            <span className="font-medium">View Details</span>
                            <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </span>
                        </Button>
                      </Link>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full group-hover/card:scale-110 transition-transform duration-300"></div>
                    <div className="absolute top-2 right-2 w-3 h-3 bg-blue-400/20 rounded-full animate-ping"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                    <Calendar className="h-12 w-12 text-white relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
                  </div>
                  <div className="absolute inset-0 w-24 h-24 mx-auto border-2 border-blue-300 rounded-full animate-pulse-ring"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">No appointments scheduled</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">Your schedule is clear for today. Take this time to review patient records or catch up on administrative tasks.</p>
                <Link href="/dashboard/doctor/daily-slots">
                  <button className="group inline-flex items-center bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:from-blue-600 hover:to-cyan-600 hover:shadow-lg hover:scale-105">
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4 group-hover:animate-spin" />
                      Manage Schedule
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Quick Actions with 3D design */}
        <div className="group relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl p-8 hover:shadow-3xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 group-hover:from-emerald-500/10 group-hover:via-teal-500/10 group-hover:to-cyan-500/10 transition-all duration-500"></div>

          {/* Animated background patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full animate-blob"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-teal-400/10 to-cyan-400/10 rounded-full animate-blob animation-delay-2000"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 group-hover:from-emerald-700 group-hover:to-teal-700 transition-all duration-300">
                  Quick Actions
                </h2>
                <p className="text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">Streamline your workflow with instant access</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="group/icon relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-0 group-hover/icon:opacity-20 transition-opacity duration-300"></div>
                  <div className="relative p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl group-hover/icon:scale-110 transition-transform duration-300">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Find Patient Action */}
              <Link href="/dashboard/patients/search" className="group/action">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-rotate-1 interactive-card">
                  <div className="absolute inset-0 bg-black/20 group-hover/action:bg-black/10 transition-all duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/action:opacity-100 transition-opacity duration-300"></div>

                  <div className="relative z-10 text-center">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm mx-auto mb-4 w-fit group-hover/action:bg-white/30 group-hover/action:scale-110 transition-all duration-300">
                      <Search className="h-8 w-8 text-white group-hover/action:animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover/action:text-emerald-100 transition-colors">Find Patient</h3>
                    <p className="text-emerald-100 text-sm group-hover/action:text-white transition-colors">Search and access patient records quickly</p>

                    {/* Progress indicator */}
                    <div className="mt-4">
                      <div className="w-full bg-white/20 rounded-full h-1">
                        <div className="bg-white rounded-full h-1 transition-all duration-500 group-hover/action:w-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full group-hover/action:scale-110 transition-transform duration-300"></div>
                  <div className="absolute top-2 right-2 w-3 h-3 bg-white/20 rounded-full animate-ping"></div>
                </div>
              </Link>

              {/* Medical Records Action */}
              <Link href="/dashboard/medical-records" className="group/action">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:rotate-1 interactive-card">
                  <div className="absolute inset-0 bg-black/20 group-hover/action:bg-black/10 transition-all duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/action:opacity-100 transition-opacity duration-300"></div>

                  <div className="relative z-10 text-center">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm mx-auto mb-4 w-fit group-hover/action:bg-white/30 group-hover/action:scale-110 transition-all duration-300">
                      <FileText className="h-8 w-8 text-white group-hover/action:animate-bounce" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover/action:text-purple-100 transition-colors">Medical Records</h3>
                    <p className="text-purple-100 text-sm group-hover/action:text-white transition-colors">Access comprehensive patient history</p>

                    {/* Stats indicator */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-purple-200 group-hover/action:text-purple-100 transition-colors">
                      <Target className="h-3 w-3" />
                      <span>Secure & HIPAA compliant</span>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full group-hover/action:scale-110 transition-transform duration-300"></div>
                  <div className="absolute top-2 right-2 w-3 h-3 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </Link>

              {/* Manage Time Slots Action */}
              <Link href="/dashboard/doctor/daily-slots" className="group/action">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-6 text-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-rotate-1 interactive-card">
                  <div className="absolute inset-0 bg-black/20 group-hover/action:bg-black/10 transition-all duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/action:opacity-100 transition-opacity duration-300"></div>

                  <div className="relative z-10 text-center">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm mx-auto mb-4 w-fit group-hover/action:bg-white/30 group-hover/action:scale-110 transition-all duration-300">
                      <Clock className="h-8 w-8 text-white group-hover/action:animate-spin" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover/action:text-blue-100 transition-colors">Schedule Management</h3>
                    <p className="text-blue-100 text-sm group-hover/action:text-white transition-colors">Configure your available time slots</p>

                    {/* Time indicator */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-200 group-hover/action:text-blue-100 transition-colors">
                      <Timer className="h-3 w-3 animate-pulse" />
                      <span>Real-time scheduling</span>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full group-hover/action:scale-110 transition-transform duration-300"></div>
                  <div className="absolute top-2 right-2 w-3 h-3 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Pending Appointment Requests */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Pending Appointment Requests</h2>
          {pendingAppointments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingAppointments.map((appointment) => (
                <div key={appointment._id} className="border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{appointment.userId.name || 'Unknown Patient'}</p>
                      <p className="text-gray-600 dark:text-gray-400">Date: {appointment.date}</p>
                      <p className="text-gray-600 dark:text-gray-400">Time: {appointment.time}</p>
                      {appointment.notes && <p className="text-gray-600 dark:text-gray-400 mt-1">Notes: {appointment.notes}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleAppointmentAction(appointment._id, 'approved')}
                        variant="default"
                        size="sm"
                        className="flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleAppointmentAction(appointment._id, 'rejected')}
                        variant="destructive"
                        size="sm"
                        className="flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No pending appointment requests</p>
          )}
        </div>

        {/* Pending Patient Requests */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Pending Patient Requests</h2>
          {pendingRequests.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingRequests.map((request) => (
                <div key={request._id} className="border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{request.patientName}</p>
                      <p className="text-gray-600 dark:text-gray-400">Email: {request.patientEmail}</p>
                      {request.patientPhone && <p className="text-gray-600 dark:text-gray-400">Phone: {request.patientPhone}</p>}
                      {request.reason && <p className="text-gray-600 dark:text-gray-400 mt-1">Reason: {request.reason}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleRequestAction(request._id, 'approved')}
                        variant="default"
                        size="sm"
                        className="flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleRequestAction(request._id, 'rejected')}
                        variant="destructive"
                        size="sm"
                        className="flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No pending patient requests</p>
          )}
        </div>

        {/* Pending Appointment Reschedule Requests */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Pending Appointment Reschedule Requests</h2>
          {pendingReschedules.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingReschedules.map((appointment) => (
                <div key={appointment._id} className="border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-all">
                  <div className="flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{appointment.userId.name || 'Unknown Patient'}</p>
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded">
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Reschedule Request</p>
                          <div className="flex gap-x-4 mt-1">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Original</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{appointment.previousDate}</span> at {appointment.previousTime}
                              </p>
                            </div>
                            <div className="flex items-center text-gray-400 dark:text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">New</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{appointment.date}</span> at {appointment.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => handleAppointmentAction(appointment._id, 'approved')}
                        variant="default"
                        size="sm"
                        className="flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve Change
                      </Button>
                      <Button
                        onClick={() => handleAppointmentAction(appointment._id, 'rejected')}
                        variant="destructive"
                        size="sm"
                        className="flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject Change
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No pending appointment reschedule requests</p>
          )}
        </div>

        {/* Recent Patients */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Recent Patients</h2>
          {patients.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {patients.slice(0, 6).map((patient) => (
                <div key={patient._id} className="border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{patient.name}</p>
                      <p className="text-gray-600 dark:text-gray-400">Email: {patient.email}</p>
                      {patient.phone && <p className="text-gray-600 dark:text-gray-400">Phone: {patient.phone}</p>}
                      {patient.medicalHistory && <p className="text-gray-600 dark:text-gray-400 mt-1">Recent: {patient.medicalHistory.slice(0, 50)}...</p>}
                    </div>
                    <Link href={`/dashboard/patients/${patient._id}`}>
                      <Button variant="default" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No patients found</p>
          )}
        </div>
      </div>
    </div>
  );
}
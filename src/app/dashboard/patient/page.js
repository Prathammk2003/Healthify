'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Chart from 'chart.js/auto';
import { Calendar, Clock, PillIcon, Brain, AlertCircle, Utensils, Activity, BarChart, Zap } from 'lucide-react';

export default function PatientDashboard() {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [mhProgressData, setMhProgressData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      if (!token || !userId) {
        setMessage('❌ User not logged in!');
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile
        const profileRes = await fetch(`/api/user-profile/${userId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const profileData = await profileRes.json();
        if (profileRes.ok) {
          setProfile(profileData.profile);
        }

        // Fetch appointments
        const apptsRes = await fetch('/api/appointments', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          setAppointments(apptsData.appointments || []);
        }

        // Fetch medications
        const medsRes = await fetch('/api/medications', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
        if (medsRes.ok) {
          const medsData = await medsRes.json();
          setMedications(medsData.reminders || []);
        }
        
        // Fetch mental health data for graph
        if (userId) {
          const mhRes = await fetch(`/api/mentalhealth/progress?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
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
  }, []);

  // Initialize charts when data is loaded
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
              tension: 0.4
            }, {
              label: 'Sleep Hours',
              data: mhProgressData.map(record => record.sleepHours),
              borderColor: 'rgb(16, 185, 129)', // Green
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.4
            }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: 'Health Trends'
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }
    }
  }, [mhProgressData]);

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
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const nextAppointment = getNextAppointment();
  const nextMedication = getNextMedication();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 relative">
      {/* Background Elements */}
      <div className="bg-grid fixed inset-0 opacity-10 z-[-2]"></div>
      <div className="bg-blob left-[-300px] top-[-300px] animate-pulse-slow"></div>
      <div className="bg-blob right-[-300px] bottom-[-300px] animate-float"></div>
      <div className="bg-wave"></div>

      {/* Header */}
      <div className="glass-card-3d">
        <h1 className="text-4xl font-bold gradient-heading mb-2">
          Your Health Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back, {profile ? `${profile.firstName} ${profile.lastName}` : 'Patient'}
        </p>
      </div>

      {message && (
        <div className="glass-card bg-red-50/50 dark:bg-red-900/50 border-red-200 dark:border-red-800">
          <div className="flex items-center text-red-700 dark:text-red-400">
            <AlertCircle className="mr-2 h-5 w-5" />
            <span>{message}</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Appointments Stats */}
        <div className="card-3d transition-all duration-300">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Next Appointment</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {nextAppointment ? (
                  <>
                    {new Date(nextAppointment.date).toLocaleDateString()} at{' '}
                    {nextAppointment.time}
                  </>
                ) : (
                  'No upcoming appointments'
                )}
              </p>
            </div>
            <div className="dashboard-icon from-blue-500 to-blue-700 animate-pulse-slow">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Medications Stats */}
        <div className="card-3d transition-all duration-300">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Active Medications</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {medications.length} medications
              </p>
            </div>
            <div className="dashboard-icon from-green-500 to-green-700 animate-pulse-slow">
              <PillIcon className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Mental Health Stats */}
        <div className="card-3d transition-all duration-300">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Mental Health</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Last stress level: {mhProgressData[mhProgressData.length - 1]?.stressLevel || '-'}/10
              </p>
            </div>
            <div className="dashboard-icon from-purple-500 to-purple-700 animate-pulse-slow">
              <Brain className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="card-3d transition-all duration-300">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Activity</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {appointments.length + medications.length + mhProgressData.length} total records
              </p>
            </div>
            <div className="dashboard-icon from-amber-500 to-amber-700 animate-pulse-slow">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Health Trends */}
      <div className="glass-card-3d">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold gradient-heading">Health Trends</h2>
          <BarChart className="h-6 w-6 text-gray-400" />
        </div>
        <div className="h-80">
          {mhProgressData.length > 0 ? (
            <canvas id="mhProgressChart"></canvas>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No health data available to display</p>
                <Link href="/dashboard/mental-health">
                  <button className="button-3d group transition-all">
                    <span className="group-hover:translate-x-1 inline-block transition-transform">
                      Start tracking your health
                    </span>
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card-3d">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold gradient-heading">Quick Actions</h2>
          <Zap className="h-6 w-6 text-yellow-500 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/appointments">
            <div className="card-3d p-4 text-center group cursor-pointer">
              <div className="dashboard-icon from-blue-500 to-blue-700 mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Calendar className="h-6 w-6" />
              </div>
              <p className="font-medium">Schedule Appointment</p>
            </div>
          </Link>

          <Link href="/dashboard/add-medication">
            <div className="card-3d p-4 text-center group cursor-pointer">
              <div className="dashboard-icon from-green-500 to-green-700 mx-auto mb-3 group-hover:scale-110 transition-transform">
                <PillIcon className="h-6 w-6" />
              </div>
              <p className="font-medium">Add Medication</p>
            </div>
          </Link>

          <Link href="/dashboard/mental-health">
            <div className="card-3d p-4 text-center group cursor-pointer">
              <div className="dashboard-icon from-purple-500 to-purple-700 mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Brain className="h-6 w-6" />
              </div>
              <p className="font-medium">Track Mental Health</p>
            </div>
          </Link>

          <Link href="/dashboard/nutrition">
            <div className="card-3d p-4 text-center group cursor-pointer">
              <div className="dashboard-icon from-orange-500 to-orange-700 mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Utensils className="h-6 w-6" />
              </div>
              <p className="font-medium">Nutrition Planner</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
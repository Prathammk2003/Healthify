'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, FileText, CheckCircle, XCircle, Calendar, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DoctorDashboard() {
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
        console.warn('Failed to fetch doctor profile:', await profileRes.text());
      }

      // Handle patients response
      if (patientsRes.ok) {
        patientsData = await patientsRes.json();
        console.log(`Fetched ${patientsData.patients?.length || 0} patients`);
        setPatients(patientsData.patients || []);
      } else {
        console.warn('Failed to fetch patients:', await patientsRes.text());
      }

      // Handle requests response
      if (requestsRes.ok) {
        pendingData = await requestsRes.json();
        console.log(`Fetched ${pendingData.requests?.length || 0} pending requests`);
        setPendingRequests(pendingData.requests || []);
      } else {
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Manage your patients and medical records
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Patients</p>
              <p className="text-2xl font-bold">{stats.totalPatients}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Patient Requests</p>
              <p className="text-2xl font-bold">{stats.pendingRequests}</p>
            </div>
            <Users className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Appointments</p>
              <p className="text-2xl font-bold">{stats.pendingAppointments}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Reschedules</p>
              <p className="text-2xl font-bold">{stats.pendingReschedules || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Upcoming Appointments</p>
              <p className="text-2xl font-bold">{stats.upcomingAppointments || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Upcoming Appointments Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
        {upcomingAppointments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingAppointments.map((appointment) => (
              <div key={appointment._id} className="border p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition">
                <div className="flex flex-col">
                  <div className="mb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-center">
                        {isToday(appointment.date) && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            Today
                          </span>
                        )}
                        <p className="font-semibold text-lg">{appointment.userId.name || 'Unknown Patient'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <p>{formatDate(appointment.date)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <Clock className="h-4 w-4" />
                    <p>{appointment.time}</p>
                  </div>
                  
                  <Link href={`/dashboard/appointments/${appointment._id}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full flex justify-between items-center"
                    >
                      <span>View Details</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No upcoming appointments</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/dashboard/patients/search">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center hover:border-blue-300 hover:shadow-md transition">
              <Search className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium">Find Patient</p>
            </div>
          </Link>
          <Link href="/dashboard/medical-records">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center hover:border-blue-300 hover:shadow-md transition">
              <FileText className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="font-medium">Medical Records</p>
            </div>
          </Link>
          <Link href="/dashboard/doctor/daily-slots">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center hover:border-blue-300 hover:shadow-md transition">
              <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="font-medium">Manage Time Slots</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Pending Appointment Requests */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Appointment Requests</h2>
        {pendingAppointments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingAppointments.map((appointment) => (
              <div key={appointment._id} className="border p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{appointment.userId.name || 'Unknown Patient'}</p>
                    <p className="text-gray-600">Date: {appointment.date}</p>
                    <p className="text-gray-600">Time: {appointment.time}</p>
                    {appointment.notes && <p className="text-gray-600 mt-1">Notes: {appointment.notes}</p>}
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
          <p className="text-gray-600">No pending appointment requests</p>
        )}
      </div>

      {/* Pending Patient Requests */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Patient Requests</h2>
        {pendingRequests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingRequests.map((request) => (
              <div key={request._id} className="border p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{request.patientName}</p>
                    <p className="text-gray-600">Email: {request.patientEmail}</p>
                    {request.patientPhone && <p className="text-gray-600">Phone: {request.patientPhone}</p>}
                    {request.reason && <p className="text-gray-600 mt-1">Reason: {request.reason}</p>}
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
          <p className="text-gray-600">No pending patient requests</p>
        )}
      </div>

      {/* Pending Appointment Reschedule Requests */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Appointment Reschedule Requests</h2>
        {pendingReschedules.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingReschedules.map((appointment) => (
              <div key={appointment._id} className="border p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition">
                <div className="flex flex-col space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{appointment.userId.name || 'Unknown Patient'}</p>
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm font-medium text-yellow-800">Reschedule Request</p>
                        <div className="flex gap-x-4 mt-1">
                          <div>
                            <p className="text-xs text-gray-500">Original</p>
                            <p className="text-sm">
                              <span className="font-medium">{appointment.previousDate}</span> at {appointment.previousTime}
                            </p>
                          </div>
                          <div className="flex items-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">New</p>
                            <p className="text-sm">
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
          <p className="text-gray-600">No pending appointment reschedule requests</p>
        )}
      </div>

      {/* Recent Patients */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Patients</h2>
        {patients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {patients.slice(0, 6).map((patient) => (
              <div key={patient._id} className="border p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{patient.name}</p>
                    <p className="text-gray-600">Email: {patient.email}</p>
                    {patient.phone && <p className="text-gray-600">Phone: {patient.phone}</p>}
                    {patient.medicalHistory && <p className="text-gray-600 mt-1">Recent: {patient.medicalHistory.slice(0, 50)}...</p>}
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
          <p className="text-gray-600">No patients found</p>
        )}
      </div>
    </div>
  );
}
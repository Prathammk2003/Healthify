'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, FileText, CheckCircle, XCircle, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    pendingRequests: 0,
    pendingAppointments: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      // Fetch patients
      const patientsRes = await fetch('/api/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const patientsData = await patientsRes.json();
      
      if (patientsRes.ok) {
        setPatients(patientsData.patients || []);
      }

      // Fetch pending patient requests
      const pendingRes = await fetch('/api/doctors/patient-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pendingData = await pendingRes.json();
      
      if (pendingRes.ok) {
        setPendingRequests(pendingData.requests || []);
      }

      // Fetch appointments
      const appointmentsRes = await fetch('/api/doctors/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const appointmentsData = await appointmentsRes.json();
      
      if (appointmentsRes.ok) {
        // Filter to get only pending appointments
        const pending = appointmentsData.appointments.filter(apt => apt.status === 'pending');
        setPendingAppointments(pending || []);
        
        // Update stats
        setStats({
          totalPatients: patientsData.patients?.length || 0,
          pendingRequests: pendingData.requests?.length || 0,
          pendingAppointments: pending?.length || 0
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError('Error fetching data');
    }
    setIsLoading(false);
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
        setError(`Request ${status} successfully`);
        
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
        // Update the UI without a full reload
        setPendingAppointments(prevAppointments => 
          prevAppointments.filter(apt => apt._id !== appointmentId)
        );
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pendingAppointments: prev.pendingAppointments - 1
        }));
        
        // Show success message
        setError(`Appointment ${status} successfully`);
        
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
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
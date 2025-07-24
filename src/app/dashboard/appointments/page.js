'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { DOCTOR_SPECIALIZATIONS } from '@/constants/specializations';

export default function AppointmentPage() {
  const [doctorId, setDoctorId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editAppointmentId, setEditAppointmentId] = useState(null);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
    fetchSpecializations();
  }, []);

  useEffect(() => {
    if (selectedSpecialization) {
      const filtered = doctors.filter(doctor => 
        doctor.specialization === selectedSpecialization ||
        (doctor.secondarySpecializations && 
         doctor.secondarySpecializations.includes(selectedSpecialization))
      );
      setFilteredDoctors(filtered);
    } else {
      setFilteredDoctors(doctors);
    }
  }, [selectedSpecialization, doctors]);

  useEffect(() => {
    if (doctorId && date) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [doctorId, date]);

  const fetchDoctors = async () => {
    try {
      console.log('Fetching doctors...');
      const res = await fetch('/api/doctors/available');
      const data = await res.json();
      console.log('Received doctors data:', data);
      
      if (res.ok && data.doctors) {
        console.log('Setting doctors:', data.doctors);
        setDoctors(data.doctors);
        setFilteredDoctors(data.doctors);
      } else {
        console.error('Failed to fetch doctors:', data.error);
        setMessage('Failed to fetch doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setMessage('Error fetching doctors');
    }
  };

  const fetchSpecializations = async () => {
    try {
      const res = await fetch('/api/doctors/specializations');
      if (res.ok) {
        const data = await res.json();
        setSpecializations(data.specializations || []);
      } else {
        setSpecializations(DOCTOR_SPECIALIZATIONS);
      }
    } catch (error) {
      console.error('Error fetching specializations:', error);
      setSpecializations(DOCTOR_SPECIALIZATIONS);
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Not authenticated');
        return;
      }

      const res = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        console.log('Appointments received:', data.appointments);
        setAppointments(data.appointments);
      } else {
        setMessage(data.error || 'Failed to fetch appointments');
      }
    } catch (error) {
      setMessage('Error fetching appointments');
    }
  };

  const fetchAvailableSlots = async () => {
    if (!doctorId || !date) return;
    
    setIsLoadingSlots(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/slots?date=${date}`);
      const data = await res.json();
      
      if (res.ok) {
        setAvailableSlots(data.availableSlots || []);
        if (time && !data.availableSlots.some(slot => slot.time === time)) {
          setTime('');
          setSelectedSlot(null);
        }
      } else {
        console.error('Failed to fetch available slots:', data.error);
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setTime(slot.time);
    setSelectedSlot(slot);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ doctorId, date, time }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Appointment request sent successfully!');
        setDoctorId('');
        setDate('');
        setTime('');
        setSelectedSlot(null);
        fetchAppointments();
      } else {
        if (data.errorCode === 'TIME_SLOT_UNAVAILABLE') {
          setMessage(data.error || 'This time slot is no longer available');
          fetchAvailableSlots();
        } else {
          setMessage(data.error || 'Failed to book appointment');
        }
      }
    } catch (error) {
      setMessage('Error booking appointment');
    }

    setIsLoading(false);
  };

  const getDoctorName = (doctor) => {
    if (!doctor) return 'Unknown Doctor';
    
    if (typeof doctor === 'string') return doctor;
    
    if (doctor.userId && doctor.userId.name) return doctor.userId.name;
    
    if (doctor.name) return doctor.name;
    
    return JSON.stringify(doctor).substring(0, 20) + '...';
  };

  const handleEditClick = (appointment) => {
    setIsEditing(true);
    setEditAppointmentId(appointment._id);
    
    if (appointment.doctor) {
      if (typeof appointment.doctor === 'object' && appointment.doctor.id) {
        setDoctorId(appointment.doctor.id);
      } else if (typeof appointment.doctor === 'object' && appointment.doctor._id) {
        setDoctorId(appointment.doctor._id.toString());
      } else if (typeof appointment.doctor === 'string') {
        setDoctorId(appointment.doctor);
      } else {
        setDoctorId('');
      }
    } else {
      setDoctorId('');
    }
    
    setDate(appointment.date);
    setTime(appointment.time);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('User not logged in');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${editAppointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ doctorId, date, time }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Appointment updated successfully!');
        setDoctorId('');
        setDate('');
        setTime('');
        setIsEditing(false);
        setEditAppointmentId(null);
        fetchAppointments();
      } else {
        setMessage(data.error || 'Failed to update appointment');
      }
    } catch (error) {
      setMessage('Server error while updating appointment');
    }

    setIsLoading(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditAppointmentId(null);
    setDoctorId('');
    setDate('');
    setTime('');
  };

  const handleDelete = async (appointmentId) => {
    setIsDeletingId(appointmentId);
    setMessage('');
    
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Not authenticated');
      setIsDeletingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Appointment deleted successfully!');
        setAppointments(appointments.filter(appt => appt._id !== appointmentId));
        
        if (editAppointmentId === appointmentId) {
          handleCancelEdit();
        }
      } else {
        setMessage(data.error || 'Failed to delete appointment');
      }
    } catch (error) {
      setMessage('Error deleting appointment');
      console.error('Delete error:', error);
    }

    setIsDeletingId(null);
  };

  const confirmDelete = (appointmentId) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      handleDelete(appointmentId);
    }
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Appointments</h1>
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
          <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="space-y-5">
            <div>
              <label className="block font-medium text-gray-700 mb-2">Filter by Specialization</label>
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              >
                <option value="">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block font-medium text-gray-700 mb-2">Select Doctor</label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                required
              >
                <option value="">Choose a doctor</option>
                {filteredDoctors && filteredDoctors.length > 0 ? (
                  filteredDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No doctors available</option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime('');
                  setSelectedSlot(null);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {doctorId && date && (
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Select Available Time Slot
                </label>
                
                {isLoadingSlots ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Loading available slots...</p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          className={`p-2 border rounded-md text-center transition-colors relative ${
                            selectedSlot?.id === slot.id
                              ? 'bg-blue-500 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                          } ${slot.isRecurring === false ? 'border-green-500' : ''}`}
                        >
                          {formatTime(slot.time)}
                          {slot.isRecurring === false && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border border-white" 
                              title="Special availability slot">
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    {availableSlots.some(slot => slot.isRecurring === false) && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center">
                        <span className="inline-block h-3 w-3 bg-green-500 rounded-full mr-1"></span>
                        Special availability slots set by doctor
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">
                      {doctorId && date
                        ? "No available slots for the selected date"
                        : "Select a doctor and date to see available slots"}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading || !doctorId || !date || !time}
                className="w-full"
              >
                {isLoading ? 'Processing...' : isEditing ? 'Update Appointment' : 'Book Appointment'}
              </Button>
            </div>
            
            {isEditing && (
              <div className="mt-2">
                <Button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  Cancel Edit
                </Button>
              </div>
            )}
          </form>
        </div>

        {appointments.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-5 border-b pb-2">Your Appointments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {appointments.map((appt) => {
                const statusColors = {
                  pending: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
                  approved: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
                  rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' }
                };
                
                const status = appt.status || 'pending';
                const { bg, text, border } = statusColors[status];
                const isDeleting = isDeletingId === appt._id;
                
                return (
                  <div key={appt._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-semibold text-gray-800">{getDoctorName(appt.doctor)}</h4>
                        <span className={`${text} ${bg} ${border} text-sm font-medium px-3 py-1 rounded-full border`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="text-gray-600 space-y-2">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <span>{appt.date}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>{appt.time}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        {status !== 'rejected' && (
                          <Button 
                            onClick={() => handleEditClick(appt)} 
                            variant="outline"
                            size="sm"
                            className="inline-flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                            Edit
                          </Button>
                        )}
                        
                        <Button 
                          onClick={() => confirmDelete(appt._id)} 
                          disabled={isDeleting}
                          variant="destructive"
                          size="sm"
                          className="inline-flex items-center"
                        >
                          {isDeleting ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Deleting...
                            </span>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

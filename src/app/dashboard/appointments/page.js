'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { DOCTOR_SPECIALIZATIONS } from '@/constants/specializations';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  Trash2,
  Plus,
  Filter,
  Search,
  Activity,
  Heart,
  Sparkles,
  Timer,
  Target,
  Shield
} from 'lucide-react';

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
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
    fetchSpecializations();

    // Generate particles on client side to prevent hydration mismatch
    const particleData = [...Array(15)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDelay: Math.random() * 20,
      animationDuration: 15 + Math.random() * 10
    }));
    setParticles(particleData);
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
      const res = await fetch('/api/doctors/available');
      const data = await res.json();

      if (res.ok && data.doctors) {
        setDoctors(data.doctors);
        setFilteredDoctors(data.doctors);
      } else {
        setMessage('Failed to fetch doctors');
      }
    } catch (error) {
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
        setAvailableSlots([]);
      }
    } catch (error) {
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
        setMessage(data.error || 'Failed to book appointment');
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
    return 'Unknown Doctor';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-blue-900 dark:to-cyan-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-teal-400/20 to-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>

        {/* Floating particles */}
        <div className="particles">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.animationDelay}s`,
                animationDuration: `${particle.animationDuration}s`
              }}
            />
          ))}
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-500">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-500"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm hover:bg-white/30 transition-all duration-300 hover:scale-110">
                    <Calendar className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold mb-2 text-shimmer">Appointment Center</h1>
                    <p className="text-xl text-white/90">
                      Schedule and manage your medical consultations
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <Stethoscope className="h-5 w-5" />
                    <span>Expert Care</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-cyan-200 transition-colors">
                    <Shield className="h-5 w-5 text-cyan-300" />
                    <span>Secure Booking</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-teal-200 transition-colors">
                    <Timer className="h-5 w-5 text-teal-300" />
                    <span>Real-time Scheduling</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <Heart className="h-16 w-16 text-white animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`group relative overflow-hidden rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${message.includes('success')
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
              : 'bg-gradient-to-r from-red-500 to-pink-500'
            }`}>
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
            <div className="relative z-10 flex items-center">
              {message.includes('success') ? (
                <CheckCircle2 className="mr-3 h-5 w-5 animate-bounce" />
              ) : (
                <AlertCircle className="mr-3 h-5 w-5 animate-pulse" />
              )}
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-1 gap-8">
          {/* Enhanced Booking Form */}
          <div className="group relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl hover:shadow-3xl transition-all duration-500">
            <div className="relative z-10 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent mb-2">
                    {isEditing ? 'Update Appointment' : 'Book Appointment'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Select your preferred doctor and time slot
                  </p>
                </div>
              </div>

              <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="space-y-6">
                {/* Specialization Filter */}
                <div className="group/field">
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <Filter className="h-4 w-4" />
                    Filter by Specialization
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSpecialization}
                      onChange={(e) => setSelectedSpecialization(e.target.value)}
                      className="w-full p-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-300/50 dark:focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-300 appearance-none cursor-pointer"
                    >
                      <option value="">All Specializations</option>
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Doctor Selection */}
                <div className="group/field">
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <Stethoscope className="h-4 w-4" />
                    Select Doctor
                  </label>
                  <div className="relative">
                    <select
                      value={doctorId}
                      onChange={(e) => setDoctorId(e.target.value)}
                      className="w-full p-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-300/50 dark:focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-300 appearance-none cursor-pointer"
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
                </div>

                {/* Date Selection */}
                <div className="group/field">
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <Calendar className="h-4 w-4" />
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setTime('');
                      setSelectedSlot(null);
                    }}
                    className="w-full p-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-300/50 dark:focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-300"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Time Slot Selection */}
                {doctorId && date && (
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Select Available Time Slot
                    </label>

                    {isLoadingSlots ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Loading available slots...</p>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => handleSlotSelect(slot)}
                            className={`p-2 border rounded-xl text-center transition-all duration-300 ${selectedSlot?.id === slot.id
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-600 shadow-lg scale-105'
                                : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 border-gray-200/50 dark:border-gray-600/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300'
                              }`}
                          >
                            {formatTime(slot.time)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl">
                        <p className="text-gray-500 dark:text-gray-400">No available slots for the selected date</p>
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
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel Edit
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        {appointments.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-6 border-b border-gray-200 dark:border-gray-700 pb-3 flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-500" />
              Your Appointments
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {appointments.map((appt) => {
                const statusColors = {
                  pending: {
                    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                    text: 'text-yellow-600 dark:text-yellow-400',
                    border: 'border-yellow-200 dark:border-yellow-700/50'
                  },
                  approved: {
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    text: 'text-green-600 dark:text-green-400',
                    border: 'border-green-200 dark:border-green-700/50'
                  },
                  rejected: {
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    text: 'text-red-600 dark:text-red-400',
                    border: 'border-red-200 dark:border-red-700/50'
                  }
                };

                const status = appt.status || 'pending';
                const { bg, text, border } = statusColors[status];
                const isDeleting = isDeletingId === appt._id;

                return (
                  <div key={appt._id} className="group/card relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 dark:from-blue-500/1 to-cyan-500/1 group-hover/card:from-blue-500/10 group-hover/card:to-cyan-500/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-bold text-gray-800 dark:text-white group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">
                          {getDoctorName(appt.doctor)}
                        </h4>
                        <span className={`${text} ${bg} ${border} text-xs font-bold px-3 py-1 rounded-full border shadow-sm`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>

                      <div className="text-gray-600 dark:text-gray-300 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                          </div>
                          <span className="font-medium">{appt.date}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                            <Clock className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                          </div>
                          <span className="font-medium">{appt.time}</span>
                        </div>
                      </div>

                      <div className="mt-6 flex gap-3">
                        {status !== 'rejected' && (
                          <Button
                            onClick={() => handleEditClick(appt)}
                            variant="outline"
                            size="sm"
                            className="flex-1 flex items-center justify-center gap-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </Button>
                        )}

                        <Button
                          onClick={() => confirmDelete(appt._id)}
                          disabled={isDeleting}
                          variant="destructive"
                          size="sm"
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          {isDeleting ? (
                            <span className="flex items-center">
                              <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                              Deleting...
                            </span>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
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
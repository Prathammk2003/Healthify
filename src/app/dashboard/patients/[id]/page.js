'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  FileText, 
  ArrowLeft, 
  Edit, 
  Plus, 
  Trash,
  Clock,
  Pill,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';

export default function PatientDetailsPage({ params }) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const router = useRouter();
  const { token } = useAuth();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const appointmentForm = useForm({
    defaultValues: {
      date: '',
      time: '',
      notes: ''
    }
  });

  useEffect(() => {
    const fetchPatientDetails = async () => {
      try {
        setLoading(true);
        
        // Debug: Log the token and ID
        console.log("Token available:", !!token);
        console.log("Patient ID:", id);
        
        // First fetch the basic patient info
        const response = await fetch(`/api/patients/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log("Response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API Error:", errorData);
          throw new Error('Failed to fetch patient details');
        }

        const data = await response.json();
        setPatient(data.patient);
        
        // Initialize medical notes from patient data
        if (data.patient && data.patient.medicalHistory) {
          setMedicalNotes(Array.isArray(data.patient.medicalHistory) 
            ? data.patient.medicalHistory.join('\n') 
            : data.patient.medicalHistory);
        }
      } catch (err) {
        console.error('Error fetching patient details:', err);
        setError('Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };

    const fetchAppointments = async () => {
      try {
        setAppointmentsLoading(true);
        
        const response = await fetch(`/api/patients/${id}/appointments`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch appointments');
        }

        const data = await response.json();
        setAppointments(data.appointments || []);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        // We don't set the main error state since this is secondary info
      } finally {
        setAppointmentsLoading(false);
      }
    };

    if (token && id) {
      fetchPatientDetails();
      fetchAppointments();
    }
  }, [token, id]);

  const handleUpdateMedicalNotes = async () => {
    try {
      setLoading(true);
      
      // Convert notes to array, splitting by newlines
      const notesArray = medicalNotes.split('\n').filter(note => note.trim() !== '');
      
      const response = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medicalHistory: notesArray
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update medical notes');
      }

      const data = await response.json();
      setPatient(prev => ({
        ...prev,
        medicalHistory: notesArray
      }));
      
      setEditingNotes(false);
      setError(null);
    } catch (err) {
      console.error('Error updating medical notes:', err);
      setError('Failed to update medical notes');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAppointment = async (data) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/patients/${id}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: data.date,
          time: data.time,
          notes: data.notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule appointment');
      }

      const responseData = await response.json();
      
      // Add the new appointment to the state
      setAppointments(prev => [responseData.appointment, ...prev]);
      
      // Close dialog and reset form
      setScheduleDialogOpen(false);
      appointmentForm.reset();
      
    } catch (err) {
      console.error('Error scheduling appointment:', err);
      setError('Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };

  // Function to format status with proper styling
  const getStatusDisplay = (status) => {
    const statusConfig = {
      approved: { 
        icon: <CheckCircle className="h-4 w-4 text-green-500 mr-1" />,
        text: 'Approved',
        className: 'text-green-700 bg-green-100'
      },
      pending: { 
        icon: <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />,
        text: 'Pending',
        className: 'text-yellow-700 bg-yellow-100'
      },
      rejected: { 
        icon: <XCircle className="h-4 w-4 text-red-500 mr-1" />,
        text: 'Cancelled',
        className: 'text-red-700 bg-red-100'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  if (loading && !patient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
        <div className="mt-4">
          <Link href="/dashboard/patients">
            <Button variant="outline" className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-yellow-100 text-yellow-700 rounded-lg">
          Patient not found or you don't have permission to view this patient.
        </div>
        <div className="mt-4">
          <Link href="/dashboard/patients">
            <Button variant="outline" className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with back button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href="/dashboard/patients">
            <Button variant="outline" className="mr-4" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{patient.name}</h1>
        </div>
        <div className="flex space-x-2">
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schedule Appointment</DialogTitle>
                <DialogDescription>
                  Schedule an appointment for {patient.name}
                </DialogDescription>
              </DialogHeader>
              <Form {...appointmentForm}>
                <form onSubmit={appointmentForm.handleSubmit(handleScheduleAppointment)} className="space-y-4">
                  <FormField
                    control={appointmentForm.control}
                    name="date"
                    rules={{ required: "Date is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={appointmentForm.control}
                    name="time"
                    rules={{ required: "Time is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={appointmentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Optional notes about the appointment" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Scheduling...' : 'Schedule Appointment'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" className="flex items-center">
            <Pill className="h-4 w-4 mr-2" />
            Medications
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Information */}
        <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-500" />
            Personal Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{patient.name}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                <p>{patient.email || 'No email provided'}</p>
              </div>
            </div>
            
            {patient.phone && (
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <p>{patient.phone}</p>
                </div>
              </div>
            )}
            
            {patient.dateOfBirth && (
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <p>{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            
            {patient.address && (
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  <p>{patient.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medical Notes */}
        <div className="col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Medical Notes
            </h2>
            
            {!editingNotes ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditingNotes(true)}
                className="flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Notes
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingNotes(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleUpdateMedicalNotes}
                  disabled={loading}
                >
                  Save Notes
                </Button>
              </div>
            )}
          </div>
          
          {!editingNotes ? (
            <div className="bg-gray-50 p-4 rounded-md min-h-[200px]">
              {patient.medicalHistory && Array.isArray(patient.medicalHistory) && patient.medicalHistory.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                  {patient.medicalHistory.map((note, index) => (
                    <li key={index} className="text-gray-700">{note}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No medical notes yet.</p>
              )}
            </div>
          ) : (
            <textarea
              className="w-full h-64 p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Enter medical notes here. Each line will be saved as a separate note."
            />
          )}
        </div>
      </div>

      {/* Appointment History */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            Appointment History
          </h2>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={() => setScheduleDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>
        
        {appointmentsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No appointment history available.
          </div>
        ) : (
          <div className="border rounded-md divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm font-medium">{appointment.date}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm">{appointment.time}</span>
                  </div>
                  {appointment.notes && (
                    <p className="mt-1 text-sm text-gray-500 truncate">{appointment.notes}</p>
                  )}
                </div>
                <div className="flex items-center mt-2 sm:mt-0">
                  {getStatusDisplay(appointment.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
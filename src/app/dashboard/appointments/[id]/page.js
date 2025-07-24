'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getAppointment, updateAppointmentStatus } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Clock, User, UserPlus, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!token) return;
      
      try {
        const data = await getAppointment(params.id, token);
        setAppointment(data);
      } catch (err) {
        console.error('Failed to fetch appointment:', err);
        setError('Failed to load appointment details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [params.id, token]);

  const handleStatusUpdate = async (newStatus) => {
    if (!token || !appointment) return;
    
    setUpdatingStatus(true);
    try {
      await updateAppointmentStatus(appointment._id, newStatus, token);
      
      // Update the local state with the new status
      setAppointment(prev => ({ ...prev, status: newStatus }));
      
      toast.success(`Appointment ${newStatus} successfully`);
    } catch (err) {
      console.error('Failed to update appointment status:', err);
      toast.error('Failed to update appointment status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-3xl mx-auto p-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/appointments')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Appointments
        </Button>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container max-w-3xl mx-auto p-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>This appointment does not exist or you don't have permission to view it.</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/appointments')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Appointments
        </Button>
      </div>
    );
  }

  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';
  const isAdmin = user?.role === 'admin';
  const isPending = appointment.status === 'pending';
  const isApproved = appointment.status === 'approved';
  const isCompleted = appointment.status === 'completed';
  const isCancelled = appointment.status === 'cancelled' || appointment.status === 'rejected';

  return (
    <div className="container max-w-3xl mx-auto p-4">
      <Link href="/dashboard/appointments" className="inline-block mb-4">
        <Button variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Appointments
        </Button>
      </Link>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">Appointment Details</CardTitle>
              <CardDescription className="mt-1">
                {formatDate(appointment.date)} at {formatTime(appointment.time)}
              </CardDescription>
            </div>
            <Badge className={getStatusBadgeColor(appointment.status)}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-500 flex items-center gap-2">
                  <User className="h-4 w-4" /> Patient
                </h3>
                <p className="font-medium">
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </p>
                <p className="text-sm text-gray-500">{appointment.patient.email}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-gray-500 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Doctor
                </h3>
                <p className="font-medium">
                  {appointment.doctor.firstName} {appointment.doctor.lastName}
                </p>
                <p className="text-sm text-gray-500">{appointment.doctor.specialization}</p>
                <p className="text-sm text-gray-500">{appointment.doctor.email}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-500 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Appointment Date & Time
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">{formatDate(appointment.date)}</p>
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" /> {formatTime(appointment.time)}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-500 mb-2">Reason for Visit</h3>
              <p>{appointment.reason || 'No reason provided'}</p>
            </div>
            
            {appointment.notes && (
              <div>
                <h3 className="font-medium text-gray-500 mb-2">Additional Notes</h3>
                <p>{appointment.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-wrap gap-2 justify-between">
          {isDoctor && isPending && (
            <>
              <Button 
                variant="default" 
                onClick={() => handleStatusUpdate('approved')}
                disabled={updatingStatus}
                className="flex-1"
              >
                Approve
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleStatusUpdate('rejected')}
                disabled={updatingStatus}
                className="flex-1"
              >
                Reject
              </Button>
            </>
          )}
          
          {isDoctor && isApproved && (
            <Button 
              variant="default" 
              onClick={() => handleStatusUpdate('completed')}
              disabled={updatingStatus || isCancelled}
              className="flex-1"
            >
              Mark as Completed
            </Button>
          )}
          
          {(isPatient || isDoctor) && (isPending || isApproved) && (
            <Button 
              variant="destructive" 
              onClick={() => handleStatusUpdate('cancelled')}
              disabled={updatingStatus || isCompleted || isCancelled}
              className="flex-1"
            >
              Cancel Appointment
            </Button>
          )}
          
          {isAdmin && (
            <div className="w-full space-y-2">
              <div className="flex flex-wrap gap-2">
                {isPending && (
                  <>
                    <Button 
                      variant="default" 
                      onClick={() => handleStatusUpdate('approved')}
                      disabled={updatingStatus}
                      className="flex-1"
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleStatusUpdate('rejected')}
                      disabled={updatingStatus}
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </>
                )}
                
                {isApproved && (
                  <Button 
                    variant="default" 
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={updatingStatus || isCancelled}
                    className="flex-1"
                  >
                    Mark as Completed
                  </Button>
                )}
                
                {(isPending || isApproved) && (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={updatingStatus || isCompleted || isCancelled}
                    className="flex-1"
                  >
                    Cancel Appointment
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
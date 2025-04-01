'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddPatientDialog } from '@/components/AddPatientDialog';
import { Search, User, Mail, Phone, Calendar, Eye, UserPlus, Filter, Info } from 'lucide-react';

export default function PatientsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyWithAppointments, setShowOnlyWithAppointments] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/patients?withAppointments=${showOnlyWithAppointments}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch patients');
        }

        const data = await response.json();
        setPatients(data.patients || []);
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchPatients();
    }
  }, [token, showOnlyWithAppointments]);

  const handlePatientAdded = (newPatient) => {
    setPatients(prev => [newPatient, ...prev]);
  };

  const toggleFilter = () => {
    setShowOnlyWithAppointments(!showOnlyWithAppointments);
  };

  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Patients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Patients are automatically added when they schedule appointments with you
          </p>
        </div>
        <AddPatientDialog onPatientAdded={handlePatientAdded} />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <p><strong>How patients appear in your list:</strong></p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Patients are automatically added when they book an appointment with you</li>
            <li>You can also manually add patients using the "Add New Patient" button</li>
            <li>All patients in your list can be viewed and managed from this page</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search patients by name or email..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          variant={showOnlyWithAppointments ? "default" : "outline"} 
          onClick={toggleFilter}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {showOnlyWithAppointments ? "With Appointments" : "All Patients"}
        </Button>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
          {searchTerm ? (
            <div>
              <p className="text-gray-500 mb-2">No patients found matching "{searchTerm}"</p>
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            </div>
          ) : showOnlyWithAppointments ? (
            <div className="space-y-3">
              <Calendar className="h-12 w-12 mx-auto text-gray-400" />
              <p className="text-gray-500">No patients with appointments found</p>
              <Button variant="outline" onClick={toggleFilter}>
                Show All Patients
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <UserPlus className="h-12 w-12 mx-auto text-gray-400" />
              <p className="text-gray-500">You don't have any patients yet</p>
              <p className="text-sm text-gray-400 max-w-md mx-auto mb-4">
                Patients will automatically be added to your list when they schedule an appointment with you
              </p>
              <AddPatientDialog onPatientAdded={handlePatientAdded} />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <div key={patient._id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="font-medium">{patient.name}</h3>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="h-4 w-4 mr-1" />
                      <span>{patient.email || 'No email provided'}</span>
                    </div>
                    
                    {patient.phone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-1" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    
                    {patient.dateOfBirth && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>
                          {new Date(patient.dateOfBirth).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Link href={`/dashboard/patients/${patient._id}`}>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MedicalRecords() {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/doctors/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      } else {
        const errorText = await response.text();
        setError(`Failed to fetch patients: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to load patients: ' + error.message);
    } finally {
      setIsLoading(false);
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
        <h1 className="text-3xl font-bold">Medical Records</h1>
        <p className="text-gray-600 mt-1">
          View and manage patient medical records
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <Link href="/dashboard/patients/search">
          <Button variant="default" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Patient
          </Button>
        </Link>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {patients.length > 0 ? (
          patients.map((patient) => (
            <div key={patient._id} className="border p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition">
              <div className="flex flex-col">
                <div className="mb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2 items-center">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <p className="font-semibold text-lg">{patient.name}</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-1">Email: {patient.email}</p>
                {patient.phone && <p className="text-gray-600 mb-1">Phone: {patient.phone}</p>}
                
                {patient.conditions && patient.conditions.length > 0 && (
                  <div className="mt-2 mb-3">
                    <p className="text-sm font-medium text-gray-500">Conditions:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient.conditions.map((condition, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{condition}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                <Link href={`/dashboard/patients/${patient._id}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full flex justify-between items-center mt-2"
                  >
                    <span>View Medical Record</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-1">No patients found</h3>
            <p className="text-gray-500">You don't have any patients assigned to you yet.</p>
          </div>
        )}
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Search, 
  ChevronRight,
  Folder,
  File,
  User,
  Heart,
  Activity,
  Shield,
  Calendar,
  Clock,
  Stethoscope,
  Target,
  Sparkles,
  Settings,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-300 border-t-transparent rounded-full animate-ping mx-auto opacity-20"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Loading Medical Records</h3>
            <p className="text-gray-600 dark:text-gray-400">Accessing patient information securely...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-slate-400/20 to-blue-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        
        {/* Floating particles */}
        <div className="particles">
          {[...Array(10)].map((_, i) => (
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
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-600 via-blue-600 to-indigo-600 p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-500">
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
                    <Folder className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold mb-2 text-shimmer">Medical Records</h1>
                    <p className="text-xl text-white/90">
                      Secure patient information and medical history management
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <Shield className="h-5 w-5" />
                    <span>HIPAA Compliant</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-blue-200 transition-colors">
                    <Database className="h-5 w-5 text-blue-300" />
                    <span>Secure Storage</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-indigo-200 transition-colors">
                    <Activity className="h-5 w-5 text-indigo-300" />
                    <span>{patients.length} Patients</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <Stethoscope className="h-16 w-16 text-white animate-pulse" />
                  </div>
                  {/* Pulse rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse-ring"></div>
                  <div className="absolute inset-2 rounded-full border border-white/10 animate-pulse-ring" style={{animationDelay: '1s'}}></div>
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
      
      {/* Enhanced Search Section */}
      <div className="group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl p-6 hover:shadow-3xl transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/5 via-blue-500/5 to-indigo-500/5 group-hover:from-slate-500/10 group-hover:via-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-500"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent mb-2">Patient Search</h2>
              <p className="text-gray-600 dark:text-gray-400">Find and access patient medical records securely</p>
            </div>
            <Link href="/dashboard/patients/search">
              <Button 
                variant="default" 
                className="group/btn bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg px-6 py-3 rounded-xl font-medium"
              >
                <Search className="h-5 w-5 mr-2 group-hover/btn:animate-pulse" />
                Find Patient
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Enhanced Patient Records Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {patients.length > 0 ? (
          patients.map((patient, index) => (
            <div 
              key={patient._id} 
              className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-rotate-1"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Document-style header */}
              <div className="relative z-10 bg-gradient-to-r from-slate-100 to-blue-100 p-4 border-b border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-slate-500 to-blue-500 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <File className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {patient.name}
                    </h3>
                    <p className="text-sm text-gray-600">Medical Record</p>
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" title="Active Patient"></div>
                </div>
              </div>
              
              {/* Patient Information */}
              <div className="relative z-10 p-6">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">{patient.email}</span>
                  </div>
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Settings className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{patient.phone}</span>
                    </div>
                  )}
                </div>
                
                {patient.conditions && patient.conditions.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <p className="text-sm font-semibold text-gray-700">Medical Conditions</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {patient.conditions.map((condition, idx) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1 bg-gradient-to-r from-red-100 to-pink-100 text-red-700 text-xs rounded-full border border-red-200/50 font-medium"
                        >
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <Link href={`/dashboard/patients/${patient._id}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group/btn bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200 hover:from-slate-100 hover:to-blue-100 hover:border-blue-300 text-slate-700 hover:text-blue-800 transition-all duration-300 hover:scale-105 rounded-xl"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        View Medical Record
                      </span>
                      <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </div>
                  </Button>
                </Link>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-slate-400/10 to-blue-400/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
              <div className="absolute top-2 right-2 w-3 h-3 bg-slate-400/20 rounded-full animate-ping"></div>
            </div>
          ))
        ) : (
          <div className="col-span-full group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl p-12">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-500/5 to-blue-500/5 group-hover:from-slate-500/10 group-hover:to-blue-500/10 transition-all duration-500"></div>
            
            <div className="relative z-10 text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-r from-slate-500 to-blue-500 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                  <Folder className="h-12 w-12 text-white relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
                </div>
                <div className="absolute inset-0 w-24 h-24 mx-auto border-2 border-slate-300 rounded-full animate-pulse-ring"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">No patients found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                You don't have any patients assigned to you yet. Use the search function to find patients or wait for patient assignments.
              </p>
              <Link href="/dashboard/patients/search">
                <Button 
                  className="group/btn bg-gradient-to-r from-slate-500 to-blue-500 hover:from-slate-600 hover:to-blue-600 text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg px-6 py-3 rounded-xl font-medium"
                >
                  <Search className="mr-2 h-5 w-5 group-hover/btn:animate-pulse" />
                  Search for Patients
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
} 
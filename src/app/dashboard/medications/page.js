'use client';
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  PillIcon, 
  Plus, 
  Edit2, 
  Trash2, 
  Bell, 
  Phone, 
  AlertTriangle,
  Clock,
  Calendar,
  Activity,
  Heart,
  Shield,
  Sparkles,
  Timer,
  Target,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui';
import Loader from '@/components/Loader';

export default function MedicationsPage() {
  const { isAuthenticated, verifyToken } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [formData, setFormData] = useState({
    medicationName: '',
    dosage: '',
    frequency: 'Daily',
    time: '',
    times: ['', ''], // For twice daily option
    daysOfWeek: [], // For weekly option
    daysOfMonth: [], // For monthly option
    notes: '',
    enableVoiceCall: false,
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchMedications();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verify token before making the request
      if (!verifyToken()) {
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }
      
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      
      const response = await fetch('/api/medications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch medications');
      }
      
      const data = await response.json();
      setMedications(data.medications || []);
    } catch (err) {
      console.error('Error fetching medications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Verify token before making the request
      if (!verifyToken()) {
        setError('Your session has expired. Please log in again.');
        return;
      }
      
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const url = editingMedication 
        ? `/api/medications`
        : '/api/medications';
      
      console.log('Sending medication data:', formData);
      
      const payload = {
        ...formData
      };
      
      // If editing, add the id
      if (editingMedication) {
        payload.id = editingMedication._id;
      }
      
      const response = await fetch(url, {
        method: editingMedication ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setError('Your session has expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save medication');
      }

      // Reset form and refresh medications
      setFormData({
        medicationName: '',
        dosage: '',
        frequency: 'Daily',
        time: '',
        times: ['', ''],
        daysOfWeek: [],
        daysOfMonth: [],
        notes: '',
        enableVoiceCall: false,
      });
      setShowAddModal(false);
      setEditingMedication(null);
      fetchMedications();
    } catch (err) {
      console.error('Error saving medication:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (medicationId) => {
    if (!confirm('Are you sure you want to delete this medication reminder?')) {
      return;
    }

    try {
      // Verify token before making the request
      if (!verifyToken()) {
        setError('Your session has expired. Please log in again.');
        return;
      }
      
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`/api/medications?id=${medicationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        setError('Your session has expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete medication');
      }

      fetchMedications();
    } catch (err) {
      console.error('Error deleting medication:', err);
      setError(err.message);
    }
  };

  const handleEdit = (medication) => {
    setEditingMedication(medication);
    setFormData({
      medicationName: medication.medicationName,
      dosage: medication.dosage,
      frequency: medication.frequency,
      time: medication.time,
      times: medication.times || ['', ''],
      daysOfWeek: medication.daysOfWeek || [],
      daysOfMonth: medication.daysOfMonth || [],
      notes: medication.notes || '',
      enableVoiceCall: medication.enableVoiceCall || false,
    });
    setShowAddModal(true);
  };

  if (loading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <AlertTriangle className="h-16 w-16 text-yellow-500" />
        <h2 className="mt-6 text-2xl font-bold">Authentication Required</h2>
        <p className="mt-2 text-gray-600">Please sign in to manage your medications.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-emerald-900 dark:to-teal-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        
        {/* Floating particles */}
        <div className="particles">
          {[...Array(12)].map((_, i) => (
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

      <div className="relative z-10 container mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-500">
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
                    <PillIcon className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold mb-2 text-shimmer">Medication Manager</h1>
                    <p className="text-xl text-white/90">
                      Track your medications and never miss a dose
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <Bell className="h-5 w-5" />
                    <span>Smart Reminders</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-emerald-200 transition-colors">
                    <Shield className="h-5 w-5 text-emerald-300" />
                    <span>Secure & Private</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-teal-200 transition-colors">
                    <Timer className="h-5 w-5 text-teal-300" />
                    <span>{medications.length} Active Medications</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <Heart className="h-16 w-16 text-white animate-pulse" />
                  </div>
                  {/* Pulse rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse-ring"></div>
                  <div className="absolute inset-2 rounded-full border border-white/10 animate-pulse-ring" style={{animationDelay: '1s'}}></div>
                </div>
              </div>
            </div>
            
            {/* Add Medication Button */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  setEditingMedication(null);
                  setFormData({
                    medicationName: '',
                    dosage: '',
                    frequency: 'Daily',
                    time: '',
                    times: ['', ''],
                    daysOfWeek: [],
                    daysOfMonth: [],
                    notes: '',
                    enableVoiceCall: false,
                  });
                  setShowAddModal(true);
                }}
                className="group/btn bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:scale-105 transition-all duration-300 px-6 py-3 rounded-xl font-medium"
              >
                <Plus className="mr-2 h-5 w-5 group-hover/btn:rotate-90 transition-transform duration-300" />
                Add Medication
              </Button>
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
            <AlertTriangle className="mr-3 h-5 w-5 animate-pulse" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl p-12">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 group-hover:from-emerald-500/10 group-hover:to-teal-500/10 transition-all duration-500"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                <PillIcon className="h-12 w-12 text-white relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto border-2 border-emerald-300 rounded-full animate-pulse-ring"></div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">No medications added yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              Start managing your health by adding your first medication reminder
            </p>
            <Button
              onClick={() => {
                setEditingMedication(null);
                setFormData({
                  medicationName: '',
                  dosage: '',
                  frequency: 'Daily',
                  time: '',
                  times: ['', ''],
                  daysOfWeek: [],
                  daysOfMonth: [],
                  notes: '',
                  enableVoiceCall: false,
                });
                setShowAddModal(true);
              }}
              className="group/btn bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg px-6 py-3 rounded-xl font-medium"
            >
              <Plus className="mr-2 h-5 w-5 group-hover/btn:rotate-90 transition-transform duration-300" />
              Add Your First Medication
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {medications.map((medication, index) => (
            <div
              key={medication._id}
              className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-rotate-1"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <PillIcon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 transition-colors">
                      {medication.medicationName}
                    </h3>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(medication)}
                      className="group/edit p-2 rounded-xl text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-all duration-300 hover:scale-110"
                    >
                      <Edit2 className="h-4 w-4 group-hover/edit:rotate-12 transition-transform" />
                    </button>
                    <button
                      onClick={() => handleDelete(medication._id)}
                      className="group/delete p-2 rounded-xl text-gray-500 hover:bg-red-100 hover:text-red-600 transition-all duration-300 hover:scale-110"
                    >
                      <Trash2 className="h-4 w-4 group-hover/delete:animate-bounce" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Target className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm"><strong>Dosage:</strong> {medication.dosage}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Activity className="h-4 w-4 text-teal-500" />
                    <span className="text-sm"><strong>Frequency:</strong> {medication.frequency}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm"><strong>Time:</strong> {medication.time}</span>
                  </div>
                  {medication.notes && (
                    <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <Settings className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span className="text-sm"><strong>Notes:</strong> {medication.notes}</span>
                    </div>
                  )}
                  {medication.enableVoiceCall && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      <Phone className="h-3 w-3" />
                      <span className="text-xs font-medium">Voice call enabled</span>
                    </div>
                  )}
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
                <div className="absolute top-2 right-2 w-3 h-3 bg-emerald-400/20 rounded-full animate-ping"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl mx-4">
            <div className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5"></div>
              
              <div className="relative z-10 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
                    <PillIcon className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {editingMedication ? 'Edit Medication' : 'Add New Medication'}
                  </h2>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6 max-h-96 overflow-y-auto pr-2">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                        <PillIcon className="h-4 w-4" />
                        Medication Name
                      </label>
                      <input
                        type="text"
                        value={formData.medicationName}
                        onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                        required
                        className="w-full p-3 border border-gray-200/50 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm text-gray-700 focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-400 transition-all duration-300"
                        placeholder="Enter medication name"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                        <Target className="h-4 w-4" />
                        Dosage
                      </label>
                      <input
                        type="text"
                        value={formData.dosage}
                        onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                        required
                        className="w-full p-3 border border-gray-200/50 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm text-gray-700 focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-400 transition-all duration-300"
                        placeholder="e.g., 10mg"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                      <Activity className="h-4 w-4" />
                      Frequency
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => {
                        const newFrequency = e.target.value;
                        setFormData({ 
                          ...formData, 
                          frequency: newFrequency,
                          time: newFrequency !== 'Twice Daily' ? formData.time : '',
                          times: newFrequency === 'Twice Daily' ? ['', ''] : [],
                          daysOfWeek: newFrequency === 'Weekly' ? [] : [],
                          daysOfMonth: newFrequency === 'Monthly' ? [] : []
                        });
                      }}
                      required
                      className="w-full p-3 border border-gray-200/50 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm text-gray-700 focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-400 transition-all duration-300 appearance-none cursor-pointer"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Twice Daily">Twice Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="As Needed">As Needed</option>
                    </select>
                  </div>
                  
                  {/* Time input sections with enhanced styling */}
                  {formData.frequency === 'Daily' || formData.frequency === 'As Needed' ? (
                    <div>
                      <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                        <Clock className="h-4 w-4" />
                        Time
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        required
                        className="w-full p-3 border border-gray-200/50 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm text-gray-700 focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-400 transition-all duration-300"
                      />
                    </div>
                  ) : null}
                  
                  <div>
                    <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                      <Settings className="h-4 w-4" />
                      Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-3 border border-gray-200/50 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm text-gray-700 focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-400 transition-all duration-300"
                      rows="3"
                      placeholder="Additional notes about this medication..."
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/50">
                    <input
                      type="checkbox"
                      id="enableVoiceCall"
                      checked={formData.enableVoiceCall}
                      onChange={(e) => setFormData({ ...formData, enableVoiceCall: e.target.checked })}
                      className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="enableVoiceCall" className="flex items-center gap-2 text-gray-700 font-medium">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      Enable Voice Call Reminders
                    </label>
                  </div>
                </form>
                
                <div className="mt-8 flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingMedication(null);
                    }}
                    className="px-6 py-3 bg-white/80 border-gray-200/50 hover:bg-gray-50 transition-all duration-300"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    {editingMedication ? 'Update' : 'Add'} Medication
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

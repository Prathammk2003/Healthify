'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { PillIcon, Plus, Edit2, Trash2, Bell, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import Loader from '@/components/Loader';

export default function MedicationsPage() {
  const { isAuthenticated, token } = useAuth();
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
    notes: '',
  });

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchMedications();
    }
  }, [isAuthenticated, token]);

  const fetchMedications = async () => {
    try {
      const response = await fetch('/api/medications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch medications');
      }
      
      const data = await response.json();
      setMedications(data.medications);
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
      const url = editingMedication 
        ? `/api/medications/${editingMedication._id}`
        : '/api/medications';
      
      console.log('Sending medication data:', formData);
      
      const response = await fetch(url, {
        method: editingMedication ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save medication');
      }

      // Reset form and refresh medications
      setFormData({
        medicationName: '',
        dosage: '',
        frequency: 'Daily',
        time: '',
        notes: '',
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
      const response = await fetch(`/api/medications/${medicationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

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
      notes: medication.notes || '',
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <PillIcon className="mr-3 h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Medication Reminders</h1>
        </div>
        <Button
          onClick={() => {
            setEditingMedication(null);
            setFormData({
              medicationName: '',
              dosage: '',
              frequency: 'Daily',
              time: '',
              notes: '',
            });
            setShowAddModal(true);
          }}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Medication
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
          <p>{error}</p>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
          <PillIcon className="h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-xl font-medium text-gray-600">No medications added yet</h3>
          <p className="mt-2 text-center text-gray-500">
            Add your first medication reminder to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {medications.map((medication) => (
            <div
              key={medication._id}
              className="rounded-lg border bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">{medication.medicationName}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(medication)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(medication._id)}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Dosage:</strong> {medication.dosage}</p>
                <p><strong>Frequency:</strong> {medication.frequency}</p>
                <p><strong>Time:</strong> {medication.time}</p>
                {medication.notes && (
                  <p><strong>Notes:</strong> {medication.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">
              {editingMedication ? 'Edit Medication' : 'Add New Medication'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={formData.medicationName}
                  onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Dosage
                </label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                >
                  <option value="Daily">Daily</option>
                  <option value="Twice Daily">Twice Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="As Needed">As Needed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  rows="3"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMedication(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMedication ? 'Update' : 'Add'} Medication
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function AddMedication() {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [notes, setNotes] = useState('');
  const [addingMedication, setAddingMedication] = useState(false);
  const [addMedicationError, setAddMedicationError] = useState('');
  const router = useRouter();
  const { token } = useAuth();

  const handleAddMedication = async (e) => {
    e.preventDefault();
    setAddingMedication(true);
    setAddMedicationError('');

    if (!token) {
      setAddMedicationError('❌ User not logged in!');
      setAddingMedication(false);
      return;
    }

    try {
      const res = await fetch('/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          dosage,
          time,
          frequency,
          notes
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add medication');
      }

      router.push('/dashboard'); // Redirect to dashboard after adding medication
    } catch (err) {
      console.error('Error adding medication:', err);
      setAddMedicationError(err.message);
    } finally {
      setAddingMedication(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Add Medication Reminder</h1>
      <form onSubmit={handleAddMedication} className="space-y-4">
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Medication Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-black bg-white dark:bg-gray-800"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Dosage</label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g., 500mg, 1 tablet, 10ml"
            className="w-full px-4 py-2 border rounded-md text-black bg-white dark:bg-gray-800"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-black bg-white dark:bg-gray-800"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-black bg-white dark:bg-gray-800"
            required
          >
            <option value="daily">Daily</option>
            <option value="twice_daily">Twice a day</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="as_needed">As needed</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-black bg-white dark:bg-gray-800"
            rows="3"
          />
        </div>
        {addMedicationError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{addMedicationError}</p>
          </div>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          disabled={addingMedication}
        >
          {addingMedication ? 'Adding...' : 'Add Medication'}
        </button>
      </form>
    </div>
  );
}
'use client';

import { useState } from 'react';

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDiagnosis('');

    try {
      const res = await fetch('/api/symptom-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      });

      const data = await res.json();
      if (res.ok) {
        setDiagnosis(data.diagnosis);
      } else {
        setError(data.error || 'Failed to get diagnosis');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Symptom Checker</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700">Describe your symptoms:</label>
          <textarea
            name="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check Symptoms'}
        </button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {diagnosis && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 rounded">
          <h2 className="font-semibold">Potential Diagnosis:</h2>
          <p>{diagnosis}</p>
        </div>
      )}
    </div>
  );
}
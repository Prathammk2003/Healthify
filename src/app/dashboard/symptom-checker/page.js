'use client';

import { useState } from 'react';
import { ArrowLeft, Search, Loader2, HeartPulse, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(true);

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
        setShowDisclaimer(true);
      } else {
        setError(data.error || 'Failed to get diagnosis');
      }
    } catch (err) {
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/patient">
          <button className="button-secondary">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </Link>
        <h1 className="text-3xl font-bold gradient-heading flex items-center">
          <HeartPulse className="h-8 w-8 text-red-500 mr-3" />
          Symptom Checker
        </h1>
      </div>

      {showDisclaimer && (
        <div className="glass-card bg-amber-50/50 border-amber-200 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">Medical Disclaimer</h3>
              <p className="text-amber-700 text-sm">
                This symptom checker is for informational purposes only and is not a qualified medical opinion. 
                It does not replace professional medical advice, diagnosis, or treatment. Always consult with a 
                qualified healthcare provider for medical advice. If you're experiencing a medical emergency, 
                please call emergency services immediately.
              </p>
              {diagnosis && (
                <button 
                  className="text-amber-600 underline text-sm mt-2"
                  onClick={() => setShowDisclaimer(false)}
                >
                  Hide disclaimer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="glass-card-3d">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold gradient-heading">Describe Your Symptoms</h2>
          <Search className="h-6 w-6 text-blue-500" />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Please describe your symptoms in detail:
            </label>
            <textarea
              name="symptoms"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring focus:ring-blue-300 h-32"
              placeholder="For example: I've had a headache for 2 days, with slight fever and a sore throat..."
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              For more accurate results, include: when the symptoms started, their severity, 
              any triggers, and other relevant information.
            </p>
          </div>
          
          <button
            type="submit"
            className="button-primary w-full md:w-auto"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Analyzing Symptoms...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Check Symptoms
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="glass-card bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {diagnosis && (
        <div className="glass-card-3d">
          <h2 className="text-2xl font-semibold gradient-heading mb-6">Potential Analysis</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div className="p-4 bg-white/70 dark:bg-gray-800/70 rounded-lg" style={{ whiteSpace: 'pre-wrap' }}>
              {diagnosis}
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              <strong>Remember:</strong> This is an AI-generated analysis based on the symptoms you described.
              It is not a definitive diagnosis, and different conditions can have similar symptoms. 
              Always consult with a healthcare professional for proper medical advice.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { ArrowLeft, Brain, BarChart, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function MentalHealth() {
  const [formData, setFormData] = useState({
    mood: '',
    anxiety: 0,
    depression: 0,
    stressLevel: 0,
    sleepHours: 0,
    energyLevel: 0,
    concentration: 0,
    appetite: '',
    socialInteraction: 0,
    selfEsteem: 0,
    thoughts: '',
    userId: '',
  });
  const [recommendation, setRecommendation] = useState('');
  const [progressData, setProgressData] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    // Set userId from localStorage
    const userId = localStorage.getItem('userId');
    if (userId) {
      setFormData((prevData) => ({ ...prevData, userId }));
      
      // Fetch previous data
      const fetchProgress = async () => {
        try {
          const res = await fetch(`/api/mentalhealth/progress?userId=${userId}`);
          if (res.ok) {
            const data = await res.json();
            setProgressData(data || []);
          }
        } catch (error) {
          console.error("Failed to fetch progress data:", error);
        } finally {
          setIsLoadingData(false);
        }
      };
      
      fetchProgress();
    } else {
      setIsLoadingData(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    try {
      const res = await fetch('/api/mentalhealth/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setRecommendation(data.recommendation);
        setErrorMessage('');
        
        // Refresh progress data
        const progressRes = await fetch(`/api/mentalhealth/progress?userId=${formData.userId}`);
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setProgressData(progressData || []);
        }
        
        // Reset form values except userId
        const userId = formData.userId;
        setFormData({
          mood: '',
          anxiety: 0,
          depression: 0,
          stressLevel: 0,
          sleepHours: 0,
          energyLevel: 0,
          concentration: 0,
          appetite: '',
          socialInteraction: 0,
          selfEsteem: 0,
          thoughts: '',
          userId: userId,
        });
      } else {
        setErrorMessage(data.error || 'Failed to submit data');
        setRecommendation('');
      }
    } catch (error) {
      console.error("Failed to submit data:", error);
      setErrorMessage('Failed to submit data. Please try again.');
      setRecommendation('');
    } finally {
      setLoading(false);
    }
  };

  // Convert recommendation text to an array of bullet points
  const getRecommendationBullets = () => {
    if (!recommendation) return [];
    return recommendation.split('\n').filter(line => line.trim().startsWith('•'));
  };

  useEffect(() => {
    let chartInstance;

    if (progressData.length > 0) {
      const ctx = document.getElementById('progressChart');
      
      if (ctx) {
        // Clear any existing chart
        if (ctx.chart) {
          ctx.chart.destroy();
        }
        
        // Create a new chart
        ctx.chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: progressData.map(record => new Date(record.timestamp).toLocaleDateString()),
            datasets: [
              {
                label: 'Stress Level',
                data: progressData.map(record => record.stressLevel),
                borderColor: 'rgb(59, 130, 246)', // Blue
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Anxiety',
                data: progressData.map(record => record.anxiety),
                borderColor: 'rgb(239, 68, 68)', // Red
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Depression',
                data: progressData.map(record => record.depression),
                borderColor: 'rgb(124, 58, 237)', // Purple
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Sleep Hours',
                data: progressData.map(record => record.sleepHours),
                borderColor: 'rgb(16, 185, 129)', // Green
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });

        chartInstance = ctx.chart;
      }
    }

    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [progressData]);

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <Link href="/dashboard" className="flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 flex items-center">
          <Brain className="h-8 w-8 mr-2 text-blue-500" />
          Mental Health Check-in
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track your mental health and get personalized recommendations
        </p>
      </header>

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded mb-6">
          {errorMessage}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Form */}
        <div className="glass-card-3d">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gradient-heading">
            <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
            Track Your Mental Health
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label">How are you feeling today?</label>
              <select
                name="mood"
                value={formData.mood}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="">Select your mood</option>
                <option value="Happy">Happy</option>
                <option value="Content">Content</option>
                <option value="Neutral">Neutral</option>
                <option value="Anxious">Anxious</option>
                <option value="Sad">Sad</option>
                <option value="Stressed">Stressed</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="form-label">Stress Level (0-10)</label>
              <input
                type="range"
                name="stressLevel"
                min="0"
                max="10"
                value={formData.stressLevel}
                onChange={handleChange}
                className="w-full"
                required
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Low Stress</span>
                <span>High Stress</span>
              </div>
              <p className="text-center font-medium">{formData.stressLevel}</p>
            </div>

            <div>
              <label className="form-label">Hours of Sleep</label>
              <input
                type="number"
                name="sleepHours"
                min="0"
                max="24"
                value={formData.sleepHours}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="space-y-4">
              <label className="form-label">Anxiety Level (0-10)</label>
              <input
                type="range"
                name="anxiety"
                min="0"
                max="10"
                value={formData.anxiety}
                onChange={handleChange}
                className="w-full"
                required
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>No Anxiety</span>
                <span>High Anxiety</span>
              </div>
              <p className="text-center font-medium">{formData.anxiety}</p>
            </div>

            <div>
              <label className="form-label">Additional Thoughts</label>
              <textarea
                name="thoughts"
                value={formData.thoughts}
                onChange={handleChange}
                className="form-input h-24"
                placeholder="Share any additional thoughts or feelings..."
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full button-gradient py-3 px-6 flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Processing...
                </span>
              ) : (
                'Save My Check-in'
              )}
            </button>
          </form>
        </div>

        {/* Recommendation & Progress */}
        <div>
          {/* AI Recommendation */}
          {recommendation && (
            <div className="glass-card-3d mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold gradient-heading">Personal Insights</h2>
                <Brain className="h-6 w-6 text-blue-500 animate-pulse-slow" />
              </div>
              
              <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl">
                {getRecommendationBullets().map((bullet, index) => (
                  <div key={index} className="flex">
                    <div className="flex-shrink-0 text-blue-600 dark:text-blue-400 mr-2">•</div>
                    <p className="text-gray-700 dark:text-gray-300">{bullet.replace('• ', '')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card-3d space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold gradient-heading">Your Progress</h2>
              <BarChart className="h-6 w-6 text-blue-500 animate-pulse-slow" />
            </div>

            {isLoadingData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : progressData.length > 0 ? (
              <div className="h-64">
                <canvas id="progressChart"></canvas>
              </div>
            ) : (
              <div className="text-center p-8 bg-blue-50/50 dark:bg-blue-900/50 rounded-lg">
                <p className="text-blue-700 dark:text-blue-300 mb-2">No data yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Track your mental health over time by saving daily entries</p>
              </div>
            )}

            {/* Latest Stats */}
            {!isLoadingData && progressData.length > 0 && (
              <div className="space-y-4 mt-4">
                <h3 className="text-xl font-semibold">Latest Stats</h3>
                
                {/* Stress Level */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Stress Level</span>
                    <span className="text-sm text-blue-700 dark:text-blue-300">{progressData[0]?.stressLevel}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full neon-glow" 
                      style={{ width: `${(progressData[0]?.stressLevel / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Sleep Quality */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Sleep Hours</span>
                    <span className="text-sm text-green-700 dark:text-green-300">{progressData[0]?.sleepHours} hours</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full neon-glow" 
                      style={{ width: `${(progressData[0]?.sleepHours / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { ArrowLeft, Brain, Send, BarChart, Sparkles, MessageCircle, X } from 'lucide-react';
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
  const [chatMessages, setChatMessages] = useState([
    { role: 'system', content: "Hello! I'm your mental health assistant. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isChatLoading, setChatLoading] = useState(false);

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

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const res = await fetch('/api/mentalhealth/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: chatInput,
          userId: formData.userId
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Add assistant response to chat
        setChatMessages(prev => [...prev, { role: 'system', content: data.response }]);
      } else {
        // Handle error
        setChatMessages(prev => [...prev, { 
          role: 'system', 
          content: "I'm sorry, I'm having trouble responding right now. Please try again later." 
        }]);
      }
    } catch (error) {
      console.error("Failed to send chat message:", error);
      // Add error message to chat
      setChatMessages(prev => [...prev, { 
        role: 'system', 
        content: "I'm sorry, I'm having trouble connecting. Please try again later." 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
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
    <div className="max-w-4xl mx-auto p-6 space-y-8 relative">
      {/* Background Elements */}
      <div className="bg-grid fixed inset-0 opacity-5 z-[-2]"></div>
      <div className="bg-blob left-[-300px] top-0 animate-pulse-slow"></div>
      <div className="bg-blob right-[-300px] bottom-[-300px] animate-float"></div>

      <div className="flex items-center justify-between">
        <Link href="/dashboard/patient">
          <button className="button-3d group flex items-center px-4 py-2">
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
        </Link>
        <h1 className="text-3xl font-bold gradient-heading flex items-center">
          <Brain className="h-8 w-8 text-purple-500 mr-3 animate-pulse-slow" />
          Mental Health Tracker
        </h1>
      </div>

      {errorMessage && (
        <div className="glass-card bg-red-50/50 dark:bg-red-900/50 border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="glass-card-3d space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold gradient-heading">Today's Check-in</h2>
            <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />
          </div>

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

            <div className="space-y-4">
              <label className="form-label">Depression Level (0-10)</label>
              <input
                type="range"
                name="depression"
                min="0"
                max="10"
                value={formData.depression}
                onChange={handleChange}
                className="w-full"
                required
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>No Depression</span>
                <span>High Depression</span>
              </div>
              <p className="text-center font-medium">{formData.depression}</p>
            </div>

            <div className="space-y-4">
              <label className="form-label">Energy Level (0-10)</label>
              <input
                type="range"
                name="energyLevel"
                min="0"
                max="10"
                value={formData.energyLevel}
                onChange={handleChange}
                className="w-full"
                required
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Low Energy</span>
                <span>High Energy</span>
              </div>
              <p className="text-center font-medium">{formData.energyLevel}</p>
            </div>

            <div className="space-y-4">
              <label className="form-label">Concentration (0-10)</label>
              <input
                type="range"
                name="concentration"
                min="0"
                max="10"
                value={formData.concentration}
                onChange={handleChange}
                className="w-full"
                required
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Poor Concentration</span>
                <span>Full Concentration</span>
              </div>
              <p className="text-center font-medium">{formData.concentration}</p>
            </div>

            <div className="space-y-4">
              <label className="form-label">Social Interaction (0-10)</label>
              <input
                type="range"
                name="socialInteraction"
                min="0"
                max="10"
                value={formData.socialInteraction}
                onChange={handleChange}
                className="w-full"
                required
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Withdrawn</span>
                <span>Very Social</span>
              </div>
              <p className="text-center font-medium">{formData.socialInteraction}</p>
            </div>

            <div className="space-y-4">
              <label className="form-label">Self Esteem (0-10)</label>
              <input
                type="range"
                name="selfEsteem"
                min="0"
                max="10"
                value={formData.selfEsteem}
                onChange={handleChange}
                className="w-full"
                required
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Low Self Esteem</span>
                <span>High Self Esteem</span>
              </div>
              <p className="text-center font-medium">{formData.selfEsteem}</p>
            </div>

            <div>
              <label className="form-label">Any additional thoughts?</label>
              <textarea
                name="thoughts"
                value={formData.thoughts}
                onChange={handleChange}
                rows="3"
                className="form-input"
                placeholder="Share how you've been feeling, any concerns, or what's on your mind..."
              ></textarea>
            </div>

            <button 
              type="submit" 
              className={`button-3d w-full flex items-center justify-center py-3 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="mr-2">Saving...</span>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Save Entry
                </>
              )}
            </button>
          </form>
        </div>

        {/* Progress Display */}
        <div className="glass-card-3d space-y-6">
          {recommendation && (
            <div className="glass-morph p-4 rounded-lg mb-6 border border-green-200/30 dark:border-green-800/30">
              <h3 className="text-green-800 dark:text-green-400 font-medium mb-2 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 animate-pulse text-green-600" />
                AI Health Insights
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{recommendation}</p>
            </div>
          )}

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

      {/* Chat button */}
      <button 
        onClick={() => setIsChatVisible(!isChatVisible)}
        className="fixed bottom-4 right-4 z-50 p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 neon-glow"
        aria-label={isChatVisible ? "Close chat" : "Open chat"}
      >
        {isChatVisible ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
      
      {/* Chat interface */}
      {isChatVisible && (
        <div className="fixed bottom-20 right-4 z-50 w-80 md:w-96 h-96 glass-card-3d flex flex-col border border-gray-200/50 dark:border-gray-700/50 shadow-3d">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg flex justify-between items-center">
            <h3 className="font-medium flex items-center">
              <Brain className="h-5 w-5 mr-2 animate-pulse" />
              Mental Health Chat
            </h3>
            <button 
              onClick={() => setIsChatVisible(false)}
              className="text-white hover:text-gray-200"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' 
                      : 'glass-morph text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="glass-morph p-3 rounded-lg flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce neon-glow" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce neon-glow" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce neon-glow" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200/30 dark:border-gray-700/30">
            <div className="flex">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                rows={1}
              />
              <button 
                onClick={sendChatMessage}
                disabled={isChatLoading || !chatInput.trim()}
                className={`px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-r-lg flex items-center justify-center ${
                  (isChatLoading || !chatInput.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

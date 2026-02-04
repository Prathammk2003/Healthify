'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  BarChart3,
  Activity,
  Shield,
  Target,
  Zap,
  Calendar,
  RefreshCw,
  Eye,
  Settings,
  Download
} from 'lucide-react';
import Link from 'next/link';
import Chart from 'chart.js/auto';

export default function PredictiveAnalytics() {
  // State management
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [trends, setTrends] = useState([]);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [particles, setParticles] = useState([]);

  // Chart instances
  const [chartInstances, setChartInstances] = useState({});

  useEffect(() => {
    // Generate particles on client side to prevent hydration mismatch
    const particleData = [...Array(15)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDelay: Math.random() * 20,
      animationDuration: 15 + Math.random() * 10
    }));
    setParticles(particleData);
    
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Fetch all analytics data in parallel
      const [predictionsRes, riskRes, trendsRes] = await Promise.all([
        fetch('/api/analytics/predictions', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/risk-assessment?includeTrend=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/trends?includeAnalytics=true&days=90', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!predictionsRes.ok || !riskRes.ok || !trendsRes.ok) {
        // Try to generate data if none exists
        if (predictionsRes.status === 404 || riskRes.status === 404) {
          await generateInitialData();
          return;
        }
        throw new Error('Failed to fetch analytics data');
      }

      const [predictionsData, riskData, trendsData] = await Promise.all([
        predictionsRes.json(),
        riskRes.json(),
        trendsRes.json()
      ]);

      setPredictions(predictionsData.predictions || []);
      setRiskAssessment(riskData.latestAssessment);
      setTrends(trendsData.trends || []);
      setInsights(trendsData.insights);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Generate predictions and risk assessment
      await Promise.all([
        fetch('/api/analytics/predictions', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ timeframe: '1_week' })
        }),
        fetch('/api/analytics/risk-assessment', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ assessmentType: 'comprehensive' })
        })
      ]);

      // Refresh data
      await fetchAnalyticsData();

    } catch (error) {
      console.error('Error generating initial data:', error);
      setError('Failed to generate analytics data. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData(true);
  };

  const generateNewPredictions = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/analytics/predictions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ regenerate: true, timeframe: '1_week' })
      });

      if (response.ok) {
        await fetchAnalyticsData();
      }
    } catch (error) {
      console.error('Error generating predictions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      low: 'text-green-600 bg-green-100 dark:bg-green-900/20',
      moderate: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
      high: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20',
      critical: 'text-red-600 bg-red-100 dark:bg-red-900/20'
    };
    return colors[level] || colors.moderate;
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'low': return <Shield className="h-5 w-5" />;
      case 'moderate': return <Eye className="h-5 w-5" />;
      case 'high': return <AlertTriangle className="h-5 w-5" />;
      case 'critical': return <AlertTriangle className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getPredictionIcon = (type) => {
    const icons = {
      mental_health_risk: <Brain className="h-5 w-5" />,
      medication_adherence: <Target className="h-5 w-5" />,
      health_deterioration: <TrendingDown className="h-5 w-5" />,
      emergency_risk: <AlertTriangle className="h-5 w-5" />,
      symptom_progression: <Activity className="h-5 w-5" />
    };
    return icons[type] || <BarChart3 className="h-5 w-5" />;
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Risk Assessment Summary */}
      {riskAssessment && (
        <div className="glass-card-3d">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold gradient-heading">Current Health Risk Assessment</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getRiskLevelColor(riskAssessment.riskLevel)}`}>
              {getRiskIcon(riskAssessment.riskLevel)}
              {riskAssessment.riskLevel.toUpperCase()}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{riskAssessment.overallRiskScore}/100</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Overall Risk Score</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{riskAssessment.alerts?.filter(a => a.priority === 'critical').length || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Critical Alerts</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">{riskAssessment.alerts?.filter(a => a.priority === 'high').length || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">High Priority Alerts</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(riskAssessment.confidence * 100)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
            </div>
          </div>

          {/* Category Scores */}
          <div className="space-y-3">
            <h4 className="font-medium">Risk by Category</h4>
            {Object.entries(riskAssessment.categoryScores || {}).map(([category, score]) => (
              <div key={category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{category.replace(/([A-Z])/g, ' $1')}</span>
                  <span className={score >= 70 ? 'text-red-600' : score >= 40 ? 'text-yellow-600' : 'text-green-600'}>
                    {score}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Predictions */}
      <div className="glass-card-3d">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold gradient-heading">Active Health Predictions</h3>
          <button
            onClick={generateNewPredictions}
            disabled={refreshing}
            className="button-secondary text-sm"
          >
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Generate New
          </button>
        </div>

        {predictions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No active predictions found.</p>
            <button
              onClick={generateNewPredictions}
              className="button-primary mt-4"
              disabled={refreshing}
            >
              Generate Predictions
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {predictions.slice(0, 5).map((prediction) => (
              <div key={prediction._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      prediction.riskScore >= 70 ? 'bg-red-100 text-red-600' :
                      prediction.riskScore >= 40 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {getPredictionIcon(prediction.predictionType)}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {prediction.predictionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Risk Score: {prediction.riskScore}/100
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {Math.round(prediction.confidence * 100)}% confidence
                    </div>
                    <div className="text-xs text-gray-500">
                      Valid until {new Date(prediction.validUntil).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                {prediction.recommendations && prediction.recommendations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm">
                      <strong>Top Recommendation:</strong> {prediction.recommendations[0].action}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Health Trends Overview */}
      {trends.length > 0 && (
        <div className="group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 group-hover:from-cyan-500/10 group-hover:to-blue-500/10 transition-all duration-500"></div>
          
          <div className="relative z-10 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Health Trends Overview
              </h3>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trends.slice(0, 6).map((trend, index) => (
                <div 
                  key={trend._id} 
                  className="group/trend relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm border border-gray-200/50 hover:shadow-lg transition-all duration-300 hover:scale-105 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-sm text-gray-700">
                      {trend.metricName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <div className="flex items-center gap-2">
                      {trend.analytics?.trendDirection === 'improving' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : trend.analytics?.trendDirection === 'declining' ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <Activity className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold text-gray-800 mb-2">
                    {trend.analytics?.currentValue?.toFixed(1) || 'N/A'}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    {trend.analytics?.trendDirection || 'Stable'} trend
                  </div>
                  
                  <div className={`text-xs px-3 py-1 rounded-full font-medium inline-block ${
                    trend.trendStatus === 'optimal' ? 'bg-green-100 text-green-800' :
                    trend.trendStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    trend.trendStatus === 'critical' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trend.trendStatus || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPredictionsTab = () => (
    <div className="space-y-6">
      <div className="glass-card-3d">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold gradient-heading">Detailed Health Predictions</h3>
          <div className="flex gap-2">
            <button
              onClick={generateNewPredictions}
              disabled={refreshing}
              className="button-secondary text-sm"
            >
              {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Regenerate
            </button>
            <button className="button-secondary text-sm">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {predictions.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-medium mb-2">No Predictions Available</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Generate your first health predictions to get personalized insights.
            </p>
            <button
              onClick={generateNewPredictions}
              className="button-primary"
              disabled={refreshing}
            >
              Generate Predictions
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {predictions.map((prediction) => (
              <div key={prediction._id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* Prediction Header */}
                <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        prediction.riskScore >= 70 ? 'bg-red-100 text-red-600' :
                        prediction.riskScore >= 40 ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {getPredictionIcon(prediction.predictionType)}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">
                          {prediction.predictionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          Timeframe: {prediction.timeframe.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        prediction.riskScore >= 70 ? 'text-red-600' :
                        prediction.riskScore >= 40 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {prediction.riskScore}/100
                      </div>
                      <div className="text-sm text-gray-500">
                        {Math.round(prediction.confidence * 100)}% confidence
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prediction Content */}
                <div className="p-6 space-y-4">
                  {/* Risk Factors */}
                  {prediction.factors && prediction.factors.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-3">Key Risk Factors</h5>
                      <div className="space-y-2">
                        {prediction.factors.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                              <div className="font-medium">{factor.name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{factor.description}</div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs ${
                              factor.impact === 'negative' ? 'bg-red-100 text-red-800' :
                              factor.impact === 'positive' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {Math.round(factor.weight * 100)}% weight
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {prediction.recommendations && prediction.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-3">Recommended Actions</h5>
                      <div className="space-y-3">
                        {prediction.recommendations.map((rec, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium">{rec.action}</div>
                              <div className={`px-2 py-1 rounded text-xs ${
                                rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {rec.priority} priority
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Estimated impact: {rec.estimatedImpact}% improvement
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validity */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Valid until: {new Date(prediction.validUntil).toLocaleDateString()}
                      </div>
                      <div>
                        Data sources: {Object.values(prediction.dataSource).reduce((a, b) => a + b, 0)} entries
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          
          {/* Floating particles */}
          <div className="particles">
            {[...Array(15)].map((_, i) => (
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
          <header className="mb-8">
            <Link href="/dashboard" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors mb-4 group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Brain className="h-10 w-10 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">Predictive Health Analytics</h1>
                    <p className="text-xl text-white/90">AI-powered insights into your health patterns and future risks</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"></div>
            <div className="relative z-10 p-12">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                    <Brain className="h-12 w-12 text-white relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
                  </div>
                  <div className="absolute inset-0 w-24 h-24 mx-auto border-2 border-indigo-300 rounded-full animate-pulse-ring"></div>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">Analyzing Your Health Data</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">Our AI is processing your health patterns and generating personalized insights...</p>
                <div className="flex justify-center space-x-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        
        {/* Floating particles */}
        <div className="particles">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.animationDelay}s`,
                animationDuration: `${particle.animationDuration}s`
              }}
            />
          ))}
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 space-y-8">
        <header className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors mb-4 group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 flex-1 mr-6">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-500"></div>
              
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm hover:bg-white/30 transition-all duration-300 hover:scale-110">
                    <Brain className="h-10 w-10 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2 text-shimmer">Predictive Health Analytics</h1>
                    <p className="text-xl text-white/90">AI-powered insights into your health patterns and future risks</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <BarChart3 className="h-5 w-5" />
                    <span>Predictive Models</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-indigo-200 transition-colors">
                    <Shield className="h-5 w-5 text-indigo-300" />
                    <span>Risk Assessment</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-purple-200 transition-colors">
                    <Activity className="h-5 w-5 text-purple-300" />
                    <span>Health Trends</span>
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
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="group/btn bg-white/20 backdrop-blur-sm border border-white/30 text-indigo-600 hover:bg-white/30 hover:scale-105 transition-all duration-300 px-6 py-3 rounded-xl font-medium flex items-center gap-2"
            >
              {refreshing ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5 group-hover/btn:rotate-180 transition-transform duration-500" />
              )}
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </header>

      {error && (
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
          <div className="relative z-10 flex items-center">
            <AlertTriangle className="mr-3 h-5 w-5 animate-pulse" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Enhanced Navigation Tabs */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5"></div>
        <nav className="relative z-10 flex space-x-1 p-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'predictions', label: 'Predictions', icon: Brain },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group relative overflow-hidden flex-1 py-3 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-white/50'
              }`}
            >
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
              )}
              <tab.icon className={`h-4 w-4 transition-transform duration-300 ${
                activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'
              }`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'predictions' && renderPredictionsTab()}
        {activeTab === 'trends' && (
          <div className="group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
            <div className="relative z-10 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-md">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Health Trends Analysis
                </h3>
              </div>
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 relative overflow-hidden">
                  <TrendingUp className="h-10 w-10 text-white relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
                </div>
                <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Advanced Trends Coming Soon</h4>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  We're building advanced trend analysis with machine learning insights, predictive charts, and personalized health forecasting.
                </p>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5"></div>
            <div className="relative z-10 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-md">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Analytics Settings
                </h3>
              </div>
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center mx-auto mb-4 relative overflow-hidden">
                  <Settings className="h-10 w-10 text-white relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
                </div>
                <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Customization Options Coming Soon</h4>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Configure prediction algorithms, notification preferences, data privacy settings, and personalized health goals.
                </p>
              </div>
            </div>
          </div>
        )}        
      </div>
    </div>
    </div>
  );
}
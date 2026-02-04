'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Database, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Play, 
  Download,
  TrendingUp,
  Heart,
  Eye,
  FileText,
  BarChart
} from 'lucide-react';

const ModelTrainingDashboard = () => {
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [trainedModels, setTrainedModels] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);

  // Fetch training status
  const fetchTrainingStatus = async () => {
    try {
      const response = await fetch('/api/model-training?action=status');
      const data = await response.json();
      setTrainingStatus(data);
      setIsTraining(data.isTraining);
    } catch (error) {
      console.error('Error fetching training status:', error);
    }
  };

  // Fetch trained models
  const fetchTrainedModels = async () => {
    try {
      const response = await fetch('/api/model-training?action=models');
      const data = await response.json();
      setTrainedModels(data);
    } catch (error) {
      console.error('Error fetching trained models:', error);
    }
  };

  // Fetch training logs
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/model-training?action=logs');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  // Start training
  const startTraining = async () => {
    try {
      setIsTraining(true);
      const response = await fetch('/api/model-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'train', modelType: 'all' })
      });
      
      const data = await response.json();
      if (response.ok) {
        // Start polling for updates
        const pollInterval = setInterval(async () => {
          await fetchTrainingStatus();
          await fetchLogs();
          
          // Stop polling when training is complete
          if (!trainingStatus?.isTraining) {
            clearInterval(pollInterval);
            setIsTraining(false);
            await fetchTrainedModels();
          }
        }, 2000);
      } else {
        setIsTraining(false);
        alert(data.error || 'Training failed to start');
      }
    } catch (error) {
      setIsTraining(false);
      console.error('Error starting training:', error);
      alert('Failed to start training');
    }
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTrainingStatus(),
        fetchTrainedModels(),
        fetchLogs()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Get model icon
  const getModelIcon = (modelType) => {
    switch (modelType) {
      case 'ecg_heartbeat': return <Heart className="w-5 h-5" />;
      case 'diabetes_prediction': return <Activity className="w-5 h-5" />;
      case 'medical_text_classification': return <FileText className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  // Get accuracy color
  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 0.9) return 'text-green-600';
    if (accuracy >= 0.8) return 'text-blue-600';
    if (accuracy >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading training dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Model Training Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage and monitor custom healthcare AI models</p>
        </div>
        <Button
          onClick={startTraining}
          disabled={isTraining}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isTraining ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Training...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Training
            </>
          )}
        </Button>
      </div>

      {/* Training Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Training Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trainingStatus ? (
            <div className="space-y-4">
              {/* Current Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {trainingStatus.isTraining ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Training In Progress
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ready
                    </Badge>
                  )}
                  
                  {trainingStatus.currentModel && (
                    <span className="text-sm text-gray-600">
                      Current: {trainingStatus.currentModel}
                    </span>
                  )}
                </div>
                
                {trainingStatus.progress > 0 && (
                  <span className="text-sm font-medium">
                    {trainingStatus.progress}% Complete
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {trainingStatus.isTraining && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${trainingStatus.progress || 0}%` }}
                  ></div>
                </div>
              )}

              {/* Dataset Status */}
              {trainingStatus.datasetsAvailable && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Dataset Availability</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Available Datasets:</span>
                      <div className="font-medium">
                        {trainingStatus.datasetsAvailable.totalAvailable} / {trainingStatus.datasetsAvailable.totalRequired}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge 
                        variant={trainingStatus.datasetsAvailable.available ? "default" : "destructive"}
                        className="ml-2"
                      >
                        {trainingStatus.datasetsAvailable.available ? 'Ready' : 'Missing Datasets'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to fetch training status. Please check your system configuration.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Trained Models */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Trained Models ({trainedModels?.count || 0})
          </CardTitle>
          <CardDescription>
            Custom models trained on your medical datasets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trainedModels?.models && trainedModels.models.length > 0 ? (
            <div className="space-y-4">
              {trainedModels.models.map((model, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getModelIcon(model.model_type)}
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {model.model_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Algorithm: {model.best_algorithm || model.algorithm}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Trained
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Accuracy:</span>
                      <div className={`font-medium ${getAccuracyColor(model.test_accuracy || model.accuracy)}`}>
                        {((model.test_accuracy || model.accuracy || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Model Size:</span>
                      <div className="font-medium">{formatFileSize(model.size)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Trained:</span>
                      <div className="font-medium">{formatDate(model.trained_at)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Features:</span>
                      <div className="font-medium">
                        {model.feature_count || model.features?.length || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Model-specific details */}
                  {model.class_labels && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700">Classes: </span>
                      <div className="text-sm text-gray-600 mt-1">
                        {Object.values(model.class_labels || {}).join(', ')}
                      </div>
                    </div>
                  )}

                  {model.features && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700">Features: </span>
                      <div className="text-sm text-gray-600 mt-1">
                        {model.features.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Summary */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Training Summary</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Total Models:</span>
                    <div className="font-medium text-blue-900">{trainedModels.count}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Size:</span>
                    <div className="font-medium text-blue-900">{formatFileSize(trainedModels.totalSize)}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">Avg Accuracy:</span>
                    <div className="font-medium text-blue-900">
                      {trainedModels.models.length > 0 ? 
                        (trainedModels.models.reduce((sum, model) => sum + (model.test_accuracy || model.accuracy || 0), 0) / trainedModels.models.length * 100).toFixed(1) + '%'
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No trained models found</p>
              <p className="text-sm">Start training to create custom models</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Training Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs?.currentLogs && logs.currentLogs.length > 0 ? (
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {logs.currentLogs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No recent training logs</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelTrainingDashboard;
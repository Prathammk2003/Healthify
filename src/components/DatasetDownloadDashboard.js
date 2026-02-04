import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DatasetDownloadDashboard = () => {
  const [datasets, setDatasets] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDownloads, setActiveDownloads] = useState(new Set());

  // Fetch dataset status
  const fetchDatasetStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/datasets?action=status');
      const data = await response.json();
      
      if (data.success) {
        setDatasets(data.datasets);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch dataset status');
      }
    } catch (err) {
      setError('Network error fetching dataset status');
      console.error('Error fetching dataset status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start download for a specific dataset
  const startDownload = async (datasetKey) => {
    try {
      setActiveDownloads(prev => new Set([...prev, datasetKey]));
      setDownloadProgress(prev => ({
        ...prev,
        [datasetKey]: { status: 'starting', progress: 0 }
      }));

      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'download',
          dataset: datasetKey
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Start polling for progress
        pollProgress(datasetKey);
      } else {
        setError(data.error || 'Failed to start download');
        setActiveDownloads(prev => {
          const newSet = new Set(prev);
          newSet.delete(datasetKey);
          return newSet;
        });
      }
    } catch (err) {
      setError('Error starting download');
      console.error('Download error:', err);
      setActiveDownloads(prev => {
        const newSet = new Set(prev);
        newSet.delete(datasetKey);
        return newSet;
      });
    }
  };

  // Start download for all datasets
  const startDownloadAll = async () => {
    try {
      setActiveDownloads(new Set(['all_datasets']));
      setDownloadProgress({ all_datasets: { status: 'starting', progress: 0 } });

      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'download_all'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Start polling for progress
        pollProgress('all_datasets');
      } else {
        setError(data.error || 'Failed to start download');
        setActiveDownloads(new Set());
      }
    } catch (err) {
      setError('Error starting downloads');
      console.error('Download all error:', err);
      setActiveDownloads(new Set());
    }
  };

  // Poll download progress
  const pollProgress = (sessionId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/datasets?action=progress&dataset=${sessionId}`);
        const data = await response.json();
        
        if (data.success && data.progress) {
          setDownloadProgress(prev => ({
            ...prev,
            [sessionId]: data.progress
          }));

          // Stop polling if completed or error
          if (data.progress.status === 'completed' || data.progress.status === 'error') {
            clearInterval(interval);
            setActiveDownloads(prev => {
              const newSet = new Set(prev);
              newSet.delete(sessionId);
              return newSet;
            });
            
            // Refresh dataset status
            fetchDatasetStatus();
          }
        }
      } catch (err) {
        console.error('Error polling progress:', err);
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds

    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setActiveDownloads(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }, 600000);
  };

  // Cleanup dataset
  const cleanupDataset = async (datasetKey) => {
    try {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cleanup',
          dataset: datasetKey
        })
      });

      const data = await response.json();
      
      if (data.success) {
        fetchDatasetStatus(); // Refresh status
      } else {
        setError(data.error || 'Failed to cleanup dataset');
      }
    } catch (err) {
      setError('Error cleaning up dataset');
      console.error('Cleanup error:', err);
    }
  };

  useEffect(() => {
    fetchDatasetStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchDatasetStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchDatasetStatus]);

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (downloaded, isActive) => {
    if (isActive) return '⏳';
    if (downloaded) return '✅';
    return '⏸️';
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>📥 Medical Dataset Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading dataset information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>📥 Medical Dataset Manager</CardTitle>
        <p className="text-sm text-gray-600">
          Download and manage medical datasets for enhanced symptom analysis
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">📊 Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Datasets:</span>
              <br />
              {Object.keys(datasets).length}
            </div>
            <div>
              <span className="font-medium">Downloaded:</span>
              <br />
              {Object.values(datasets).filter(d => d.downloaded).length}
            </div>
            <div>
              <span className="font-medium">Active Downloads:</span>
              <br />
              {activeDownloads.size}
            </div>
            <div>
              <span className="font-medium">Total Size:</span>
              <br />
              ~1GB
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={startDownloadAll}
            disabled={activeDownloads.has('all_datasets')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Download All Datasets
          </button>
          <button
            onClick={fetchDatasetStatus}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🔄 Refresh Status
          </button>
        </div>

        {/* All Datasets Progress */}
        {downloadProgress.all_datasets && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold mb-2">📊 Overall Download Progress</h4>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(downloadProgress.all_datasets.progress || 0)}`}
                style={{ width: `${downloadProgress.all_datasets.progress || 0}%` }}
              ></div>
            </div>
            <div className="text-sm">
              Status: {downloadProgress.all_datasets.status} - {downloadProgress.all_datasets.progress || 0}%
              {downloadProgress.all_datasets.currentDataset && (
                <span className="ml-2">
                  Currently: {downloadProgress.all_datasets.currentDataset}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Individual Datasets */}
        <div className="space-y-4">
          {Object.entries(datasets).map(([key, dataset]) => {
            const isActive = activeDownloads.has(key);
            const progress = downloadProgress[key];
            
            return (
              <div key={key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStatusIcon(dataset.downloaded, isActive)}</span>
                    <h4 className="font-semibold">{dataset.name}</h4>
                    <span className="text-sm text-gray-500">({dataset.size})</span>
                  </div>
                  <div className="flex gap-2">
                    {!dataset.downloaded && !isActive && (
                      <button
                        onClick={() => startDownload(key)}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        Download
                      </button>
                    )}
                    {dataset.downloaded && (
                      <button
                        onClick={() => cleanupDataset(key)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{dataset.description}</p>
                
                <div className="text-xs text-gray-500 mb-2">
                  <strong>Type:</strong> {dataset.type} | 
                  <strong> Categories:</strong> {dataset.categories.join(', ')}
                </div>

                {progress && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.progress || 0)}`}
                        style={{ width: `${progress.progress || 0}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {progress.status} - {progress.progress || 0}%
                      {progress.error && (
                        <span className="text-red-500 ml-2">Error: {progress.error}</span>
                      )}
                    </div>
                  </div>
                )}

                {dataset.downloaded && dataset.path && (
                  <div className="text-xs text-green-600 mt-2">
                    ✅ Downloaded to: {dataset.path}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {Object.keys(datasets).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No datasets available. Check your configuration.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatasetDownloadDashboard;
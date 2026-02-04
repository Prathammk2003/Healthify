import { NextRequest, NextResponse } from 'next/server';
import { downloader, DATASETS } from '@/lib/dataset-downloader';

// Store active download sessions
const downloadSessions = new Map();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const dataset = searchParams.get('dataset');

    switch (action) {
      case 'status':
        // Get status of all datasets
        const status = downloader.getDatasetStatus();
        return NextResponse.json({
          success: true,
          datasets: status,
          totalSize: Object.values(DATASETS).reduce((sum, d) => {
            const size = parseInt(d.size.replace(/[^\d]/g, ''));
            return sum + size;
          }, 0) + 'MB'
        });

      case 'progress':
        // Get download progress for specific dataset
        if (!dataset) {
          return NextResponse.json({
            success: false,
            error: 'Dataset parameter required for progress check'
          }, { status: 400 });
        }

        const session = downloadSessions.get(dataset);
        return NextResponse.json({
          success: true,
          progress: session || { status: 'not_started', progress: 0 }
        });

      case 'list':
        // List available datasets
        return NextResponse.json({
          success: true,
          available: Object.entries(DATASETS).map(([key, data]) => ({
            key,
            name: data.name,
            size: data.size,
            description: data.description,
            type: data.type,
            categories: data.categories,
            downloaded: downloader.isDatasetDownloaded(key)
          }))
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: status, progress, or list'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Dataset API GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, dataset, datasets } = body;

    // Initialize downloader
    const initialized = await downloader.initialize();
    if (!initialized) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize dataset downloader'
      }, { status: 500 });
    }

    // Check Kaggle API configuration
    const kaggleConfigured = await downloader.checkKaggleConfig();
    if (!kaggleConfigured) {
      return NextResponse.json({
        success: false,
        error: 'Kaggle API not configured. Please install kaggle package and configure credentials.',
        instructions: {
          install: 'pip install kaggle',
          setup: 'Add KAGGLE_USERNAME and KAGGLE_KEY to environment variables',
          credentials: 'Download kaggle.json from Kaggle Account settings'
        }
      }, { status: 400 });
    }

    switch (action) {
      case 'download':
        if (!dataset) {
          return NextResponse.json({
            success: false,
            error: 'Dataset parameter required'
          }, { status: 400 });
        }

        if (!DATASETS[dataset]) {
          return NextResponse.json({
            success: false,
            error: `Dataset '${dataset}' not found`
          }, { status: 404 });
        }

        // Start download with progress tracking
        const progressCallback = (progress) => {
          downloadSessions.set(dataset, {
            ...progress,
            timestamp: new Date().toISOString()
          });
        };

        // Run download asynchronously
        downloader.downloadDataset(dataset, progressCallback)
          .then(result => {
            downloadSessions.set(dataset, {
              status: result.success ? 'completed' : 'error',
              progress: result.success ? 100 : 0,
              error: result.error,
              cached: result.cached,
              timestamp: new Date().toISOString()
            });
          })
          .catch(error => {
            downloadSessions.set(dataset, {
              status: 'error',
              progress: 0,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          });

        return NextResponse.json({
          success: true,
          message: `Started downloading ${DATASETS[dataset].name}`,
          dataset: DATASETS[dataset],
          sessionId: dataset
        });

      case 'download_all':
        // Download all datasets automatically
        const allProgressCallback = (progress) => {
          downloadSessions.set('all_datasets', {
            ...progress,
            timestamp: new Date().toISOString()
          });
        };

        // Run all downloads asynchronously
        downloader.downloadAllDatasets(allProgressCallback)
          .then(results => {
            downloadSessions.set('all_datasets', {
              status: 'completed',
              progress: 100,
              results,
              timestamp: new Date().toISOString()
            });
          })
          .catch(error => {
            downloadSessions.set('all_datasets', {
              status: 'error',
              progress: 0,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          });

        return NextResponse.json({
          success: true,
          message: 'Started downloading all medical datasets',
          datasets: Object.keys(DATASETS),
          sessionId: 'all_datasets',
          totalSize: Object.values(DATASETS).reduce((sum, d) => {
            const size = parseInt(d.size.replace(/[^\d]/g, ''));
            return sum + size;
          }, 0) + 'MB'
        });

      case 'cleanup':
        if (!dataset) {
          return NextResponse.json({
            success: false,
            error: 'Dataset parameter required for cleanup'
          }, { status: 400 });
        }

        const cleaned = await downloader.cleanupDataset(dataset);
        return NextResponse.json({
          success: true,
          cleaned,
          message: cleaned ? 
            `Dataset ${DATASETS[dataset]?.name} cleaned up successfully` : 
            `Dataset ${dataset} was not found or already clean`
        });

      case 'install_kaggle':
        // Helper endpoint to install Kaggle API
        try {
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);

          await execAsync('pip install kaggle');
          
          return NextResponse.json({
            success: true,
            message: 'Kaggle API installed successfully',
            nextSteps: [
              'Download kaggle.json from your Kaggle account settings',
              'Add KAGGLE_USERNAME and KAGGLE_KEY to your environment variables',
              'Or place kaggle.json in ~/.kaggle/ directory'
            ]
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: 'Failed to install Kaggle API: ' + error.message,
            manual_install: 'pip install kaggle'
          }, { status: 500 });
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: download, download_all, cleanup, or install_kaggle'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Dataset API POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// WebSocket-like endpoint for real-time progress (using Server-Sent Events)
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID required'
      }, { status: 400 });
    }

    // Return current session data
    const session = downloadSessions.get(sessionId);
    
    return NextResponse.json({
      success: true,
      session: session || { status: 'not_found', progress: 0 },
      sessionId
    });

  } catch (error) {
    console.error('Dataset API PUT error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { datasetLoader } from '@/lib/dataset-loader';

export async function GET() {
  try {
    const stats = datasetLoader.getStats();
    
    // Additional status information
    const status = {
      ...stats,
      timestamp: new Date().toISOString(),
      ready: stats.isLoaded && stats.totalRecords > 0,
      message: stats.isLoaded 
        ? `✅ All datasets loaded successfully with ${stats.totalRecords} total records`
        : '⏳ Datasets are still loading or failed to load'
    };
    
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('Dataset status check failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get dataset status',
        isLoaded: false,
        ready: false,
        message: '❌ Dataset status check failed'
      },
      { status: 500 }
    );
  }
}

// Force dataset reload (for testing/debugging)
export async function POST() {
  try {
    console.log('🔄 Forcing dataset reload...');
    
    // Reset loader state
    datasetLoader.isLoaded = false;
    datasetLoader.datasets.clear();
    datasetLoader.loadingPromise = null;
    
    // Reload datasets
    const success = await datasetLoader.loadAllDatasetsAtStartup();
    
    const stats = datasetLoader.getStats();
    
    return NextResponse.json({
      ...stats,
      reloadSuccess: success,
      timestamp: new Date().toISOString(),
      message: success 
        ? `✅ Datasets reloaded successfully with ${stats.totalRecords} records`
        : '❌ Dataset reload failed'
    });
    
  } catch (error) {
    console.error('Dataset reload failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reload datasets',
        reloadSuccess: false,
        message: '❌ Dataset reload failed'
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('file');
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }
    
    // Security: Ensure file is within datasets directory
    const fullPath = join(process.cwd(), filePath);
    const datasetsPath = join(process.cwd(), 'datasets');
    
    if (!fullPath.startsWith(datasetsPath)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    try {
      const fileBuffer = readFileSync(fullPath);
      
      // Determine content type based on file extension
      const ext = filePath.toLowerCase().split('.').pop();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'txt':
          contentType = 'text/plain';
          break;
        case 'csv':
          contentType = 'text/csv';
          break;
        case 'json':
          contentType = 'application/json';
          break;
      }
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
          'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`
        }
      });
      
    } catch (readError) {
      console.error('File read error:', readError);
      return NextResponse.json({ error: 'Unable to read file' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Dataset view API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle CSV row viewing
export async function POST(req) {
  try {
    const body = await req.json();
    const { dataset, rowIndex } = body;
    
    if (!dataset || rowIndex === undefined) {
      return NextResponse.json({ error: 'Dataset and row index are required' }, { status: 400 });
    }
    
    // This would load and return specific CSV row data
    // Implementation depends on your specific needs
    
    return NextResponse.json({
      message: 'CSV row viewing not yet implemented',
      dataset,
      rowIndex
    });
    
  } catch (error) {
    console.error('CSV view error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
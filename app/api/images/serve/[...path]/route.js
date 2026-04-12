import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    // Get the file path from the dynamic route
    const filePath = params.path.join('/');
    
    // Images always in /data/images (same for local and production)
    const baseDir = path.join(process.cwd(), 'data', 'images');
    const fullPath = path.join(baseDir, filePath);
    
    // Security: prevent directory traversal
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(baseDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Read the file
    const fileBuffer = await fs.readFile(fullPath);
    
    // Determine content type based on extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}

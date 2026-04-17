import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Validate path components to prevent attacks
function isValidPathComponent(component) {
  // Block malicious patterns
  const maliciousPatterns = [
    /\.\./,           // Path traversal
    /^\./,            // Hidden files (except valid image extensions)
    /\.php$/i,        // PHP files
    /\.env/i,         // Environment files
    /config\./i,      // Config files
    /\.bak$/i,        // Backup files
    /\.save$/i,       // Save files
    /wp-/i,           // WordPress
    /\.git/i,         // Git files
    /\.xml$/i,        // XML files
  ];
  
  return !maliciousPatterns.some(pattern => pattern.test(component));
}

export async function GET(request, { params }) {
  try {
    // Get the file path from the dynamic route
    const filePath = params.path.join('/');
    
    // Validate each path component
    const pathComponents = params.path;
    for (const component of pathComponents) {
      if (!isValidPathComponent(component)) {
        console.warn(`[SECURITY] Blocked suspicious image path attempt: ${filePath}`);
        return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
      }
    }
    
    // Only allow image files
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExtensions.includes(ext)) {
      console.warn(`[SECURITY] Blocked non-image file access attempt: ${filePath}`);
      return NextResponse.json({ error: 'Invalid file type' }, { status: 403 });
    }
    
    // Images always in /data/images (same for local and production)
    const baseDir = path.join(process.cwd(), 'data', 'images');
    const fullPath = path.join(baseDir, filePath);
    
    // Security: prevent directory traversal
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(baseDir)) {
      console.warn(`[SECURITY] Path traversal attempt blocked: ${filePath}`);
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
    // Don't expose full error details to prevent information leakage
    console.error('Error serving image - Error code:', error.code);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}

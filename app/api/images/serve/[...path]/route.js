import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { InvalidImagePathError, imageContentTypes, manifestAssetPattern, resolveImagePath } from '@/lib/imageAssets.mjs';

export async function GET(request, { params }) {
  try {
    const fullPath = await resolveImagePath(params.path);
    const fileBuffer = await fs.readFile(fullPath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': imageContentTypes[path.extname(params.path.at(-1)).toLowerCase()],
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': manifestAssetPattern.test(params.path.join('/'))
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    if (error instanceof InvalidImagePathError) {
      console.warn('[SECURITY] Blocked image request:', error.message);
      return NextResponse.json({ error: 'Invalid image path' }, { status: 403 });
    }
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}

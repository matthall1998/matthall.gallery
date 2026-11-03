import { NextResponse } from 'next/server';
import { getGallery } from '@/lib/getImages';
import { initialImageOrder } from '@/lib/galleryImages.mjs';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gallery = await getGallery(searchParams.get('slug'));
    if (!gallery) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404, headers });
    }
    return NextResponse.json({
      results: initialImageOrder(gallery.images, gallery.album?.load_random),
      album: gallery.album,
    }, { headers });
  } catch (error) {
    console.error('Error loading gallery catalog:', error);
    return NextResponse.json({ error: 'Failed to load gallery catalog' }, { status: 500, headers });
  }
}

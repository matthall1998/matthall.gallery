import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    // Images always in /data/images (same for local and production)
    const baseDir = path.join(process.cwd(), 'data', 'images');
    const imagesDir = slug 
      ? path.join(baseDir, slug)
      : baseDir;
    
    // Read directory contents
    const files = await fs.readdir(imagesDir);
    
    // Filter for JSON files only (metadata files)
    const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'export_summary.json');
    
    // Read each JSON file and construct image data
    const images = await Promise.all(
      jsonFiles.map(async (jsonFile) => {
        const jsonPath = path.join(imagesDir, jsonFile);
        const jsonContent = await fs.readFile(jsonPath, 'utf-8');
        const metadata = JSON.parse(jsonContent);
        
        // Get the image filename (remove .json extension)
        const imageFile = jsonFile.replace('.json', '');
        // Images served via API route instead of /public
        const imagePath = slug 
          ? `/api/images/serve/${slug}/${imageFile}`
          : `/api/images/serve/${imageFile}`;
        
        return {
          src: imagePath,
          caption: metadata.caption || '',
          camera_make: metadata.camera_make || '',
          camera: metadata.camera || '',
          lens_make: metadata.lens_make || '',
          lens: metadata.lens || '',
          iso: metadata.iso || '',
          shutter: metadata.shutter_speed || '',
          aperture: metadata.aperture || '',
          people: metadata.people || '',
          tags: metadata.tags || '',
          albums: metadata.albums || '',
          website: metadata.website,
          private_link: metadata.private_link,
          shot_date: metadata.shot_date || '',
          export_date: metadata.export_date || '',
          image_width: metadata.image_width,
          image_height: metadata.image_height,
        };
      })
    );
    
    // Filter based on slug:
    // - If no slug (home page): only show images with website: true
    // - If slug provided: show images with private_link: true
    const filteredImages = slug 
      ? images.filter(img => img.private_link)
      : images.filter(img => img.website);
    
    // Default sort by export_date descending (newest first)
    const sortedImages = filteredImages.sort((a, b) => {
      if (!a.export_date) return 1;
      if (!b.export_date) return -1;
      return new Date(b.export_date) - new Date(a.export_date);
    });
    
    return NextResponse.json({ results: sortedImages });
  } catch (error) {
    console.error('Error reading images:', error);
    return NextResponse.json({ error: 'Failed to load images', results: [] }, { status: 500 });
  }
}

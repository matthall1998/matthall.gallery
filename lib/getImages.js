import { promises as fs } from 'fs';
import path from 'path';

// Extract filter data from images
export function extractFilters(images) {
  const tagSet = new Set();
  const peopleSet = new Set();
  const cameraSet = new Set();
  const lensSet = new Set();

  images.forEach(row => {
    // Tags
    const tags = (row.tags || "").split(",").map(t => t.trim());
    tags.forEach(tag => tag && tagSet.add(tag));

    // People
    const people = (row.people || "").split(",").map(p => p.trim());
    people.forEach(person => person && peopleSet.add(person));

    // Cameras
    const cameraMake = (row.camera_make || "").trim();
    const camera = (row.camera || "").trim();
    if (cameraMake && camera) {
      cameraSet.add(`${cameraMake} ${camera}`);
    } else if (camera) {
      cameraSet.add(camera);
    }

    // Lenses
    const lensMake = (row.lens_make || "").trim();
    const lens = (row.lens || "").trim();
    if (lensMake && lens) {
      lensSet.add(`${lensMake} ${lens}`);
    } else if (lens) {
      lensSet.add(lens);
    }
  });

  return {
    tags: Array.from(tagSet).sort().map(tag => ({ name: tag })),
    people: Array.from(peopleSet).sort().map(person => ({ name: person })),
    cameras: Array.from(cameraSet).sort().map(camera => ({ name: camera })),
    lenses: Array.from(lensSet).sort().map(lens => ({ name: lens })),
  };
}

// Validate slug to prevent path traversal attacks
function isValidSlug(slug) {
  if (!slug) return true; // null/undefined is valid (root)
  
  // Block common attack patterns
  const maliciousPatterns = [
    /\.\./,           // Path traversal
    /[\/\\]/,         // Path separators
    /^\./,            // Hidden files
    /\.php$/i,        // PHP files
    /\.env/i,         // Environment files
    /config\./i,      // Config files
    /\.bak$/i,        // Backup files
    /\.save$/i,       // Save files
    /wp-/i,           // WordPress
    /admin/i,         // Admin panels
    /\.git/i,         // Git files
    /\.xml$/i,        // XML files (sitemap probing)
  ];
  
  if (maliciousPatterns.some(pattern => pattern.test(slug))) {
    return false;
  }
  
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-z0-9\-_]+$/i.test(slug)) {
    return false;
  }
  
  return true;
}

// Get list of valid album directories
async function getValidAlbums() {
  try {
    const baseDir = path.join(process.cwd(), 'data', 'images');
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error) {
    return [];
  }
}

// Server-side function to get images
export async function getImages(slug = null) {
  try {
    // Validate slug before using it
    if (!isValidSlug(slug)) {
      console.warn(`[SECURITY] Blocked suspicious slug attempt: ${slug}`);
      return [];
    }
    
    const baseDir = path.join(process.cwd(), 'data', 'images');
    const imagesDir = slug 
      ? path.join(baseDir, slug)
      : baseDir;
    
    // Additional check: if slug is provided, verify the directory exists and is a valid album
    if (slug) {
      const validAlbums = await getValidAlbums();
      if (!validAlbums.includes(slug)) {
        console.warn(`[SECURITY] Blocked invalid album slug: ${slug}`);
        return [];
      }
    }
    
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
        
        // Generate optimized image filename
        const imageFileNoExt = imageFile.replace(/\.(jpg|jpeg|png)$/i, '');
        const optimizedImageFile = `${imageFileNoExt}_optimized.webp`;
        
        // Images served via API route
        const imagePath = slug 
          ? `/api/images/serve/${slug}/${imageFile}`
          : `/api/images/serve/${imageFile}`;
        
        const optimizedImagePath = slug 
          ? `/api/images/serve/${slug}/${optimizedImageFile}`
          : `/api/images/serve/${optimizedImageFile}`;
        
        return {
          src: imagePath,
          srcOptimized: optimizedImagePath,
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
    
    // Filter based on slug
    const filteredImages = slug 
      ? images.filter(img => img.private_link)
      : images.filter(img => img.website);
    
    // Sort by export_date descending (newest first)
    const sortedImages = filteredImages.sort((a, b) => {
      if (!a.export_date) return 1;
      if (!b.export_date) return -1;
      return new Date(b.export_date) - new Date(a.export_date);
    });
    
    return sortedImages;
  } catch (error) {
    // Don't expose full error details to prevent information leakage
    console.error('Error reading images for slug:', slug || 'root', '- Error code:', error.code);
    return [];
  }
}

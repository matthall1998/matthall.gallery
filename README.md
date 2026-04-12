# Gallery - Next.js

A photography portfolio site built with Next.js, featuring a responsive masonry gallery powered by file-system based storage.

## Features

- 📸 Responsive masonry gallery layout
- 🖼️ Full-screen lightbox with EXIF data display
- 🏷️ Smart filtering system:
  - **Filter** dropdown: People and tags
  - **Gear** dropdown: Cameras and lenses
- 🔀 Multiple sorting options:
  - **Latest**: Sorted by export date (newest exports first)
  - **By Date**: Sorted by shot date (when photo was taken)
  - **Shuffle**: Random order
- 📱 Mobile-responsive navigation
- ⚡ Lazy loading with blur effect
- 🎨 Dark theme UI
- 🔒 Hidden album pages with private URLs
- 📁 File-system based - no database required

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Gallery**: React Responsive Masonry
- **Lightbox**: Yet Another React Lightbox
- **Storage**: File system with JSON metadata

## Getting Started

### Prerequisites

- Node.js 18+ installed

### Installation

1. Clone the repository
2. Install dependencies:

\`\`\`bash
npm install
\`\`\`

3. Add your images:

Place images and their corresponding `.json` metadata files in `data/images/`:
- Root level images (with `"website": true`) appear on the home page
- Subfolder images (with `"private_link": true`) appear on `/subfolder-name` URLs

Example JSON metadata:
\`\`\`json
{
  "caption": "Photo Title",
  "camera_make": "Canon",
  "camera": "EOS 5D Mark III",
  "lens_make": "Canon",
  "lens": "EF 24-70mm f/2.8L II USM",
  "iso": "1250",
  "shutter_speed": "1/1250",
  "aperture": "f/2.8",
  "people": "John, Jane",
  "tags": "Landscape, Nature",
  "albums": "Portfolio 2026",
  "website": true,
  "private_link": false,
  "shot_date": "2026-04-05",
  "export_date": "2026-04-06"
}
\`\`\`

4. Run the development server:

\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Build for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Project Structure

\`\`\`
gallery-nextjs/
├── app/
│   ├── [slug]/
│   │   └── page.jsx        # Dynamic album pages
│   ├── api/
│   │   └── images/
│   │       ├── route.js    # API endpoint for image metadata
│   │       └── serve/
│   │           └── [...path]/
│   │               └── route.js  # API endpoint for serving image files
│   ├── layout.jsx          # Root layout
│   ├── page.jsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   ├── Gallery.jsx         # Masonry gallery component
│   ├── Header.jsx          # Navigation header with filters
│   ├── Footer.jsx          # Footer component
│   ├── Spinner.jsx         # Loading spinner
│   └── spinner.css         # Spinner styles
├── data/
│   └── images/             # Image storage (gitignored)
│       ├── image1.jpg
│       ├── image1.jpg.json
│       └── album-name/     # Subfolder for hidden albums
│           ├── photo.jpg
│           └── photo.jpg.json
├── public/
│   └── (static assets)
└── ...config files
\`\`\`

## How It Works

### Image Storage & Serving
- Images stored in `/data/images` (same path for local development and production)
- Images served through `/api/images/serve/[...path]` route (not directly from `/public`)
- Metadata read from `.json` files at runtime (no database needed)
- API route provides security (path validation) and proper caching headers

### Content Structure  
- Home page shows images where `"website": true`
- Album pages (`/album-name`) show images from subfolders where `"private_link": true`
- Filters automatically populate from metadata:
  - People and tags appear in the **Filter** dropdown
  - Cameras ("Make Model") and lenses appear in the **Gear** dropdown
- Sorting:
  - **Latest**: Orders by `export_date` (when you exported/processed the photo)
  - **By Date**: Orders by `shot_date` (when you actually took the photo)
  - **Shuffle**: Random order on each click

## Deployment

This app requires a Node.js runtime and works with:

- **Coolify** (recommended for self-hosting)
- **Vercel** (easy deployment, free tier available)
- **Netlify**
- **Railway**
- **DigitalOcean App Platform**

### Coolify Deployment (Recommended)

**Setup persistent storage:**
1. In Coolify, create a persistent volume
2. Mount it to `/app/data/images` 
3. Upload your images + `.json` files to the mounted volume
   - Structure: `/app/data/images/photo.jpg` and `/app/data/images/photo.jpg.json`
   - For albums: `/app/data/images/album-name/photo.jpg`

**Why this works:**
- Same `/data/images` path works locally and in production
- No environment variables needed
- SFTP/rsync directly to persistent storage
- Images survive container rebuilds

### Vercel/Netlify Deployment

These platforms don't support persistent file storage. Two options:

1. **Small galleries**: Commit images to git (remove from `.gitignore`)
2. **Large galleries**: Switch to object storage (S3/Cloudflare R2) - requires code modification

## Environment Variables

No environment variables needed - images always in `/data/images`

## License

© 2025 Matthew Hall. All Rights Reserved.


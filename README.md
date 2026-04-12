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

Place images and their corresponding `.json` metadata files in `public/images/`:
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
│   │       └── route.js    # API endpoint for images
│   ├── layout.jsx          # Root layout
│   ├── page.jsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   ├── Gallery.jsx         # Masonry gallery component
│   ├── Header.jsx          # Navigation header with filters
│   ├── Footer.jsx          # Footer component
│   ├── Spinner.jsx         # Loading spinner
│   └── spinner.css         # Spinner styles
├── public/
│   └── images/             # Image storage
│       ├── image1.jpg
│       ├── image1.jpg.json
│       └── album-name/     # Subfolder for hidden albums
│           ├── photo.jpg
│           └── photo.jpg.json
└── ...config files
\`\`\`

## How It Works

- Images are stored in `public/images/` with corresponding `.json` metadata files
- The API reads the file system at runtime (no database needed)
- Home page shows images where `"website": true`
- Album pages (`/album-name`) show images from `public/images/album-name/` where `"private_link": true`
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

**Important**: Configure persistent storage for `public/images/` so images survive redeployments. With Coolify, mount a persistent volume to `/app/public/images`.

### Adding Images After Deployment

- **Coolify**: SSH into your server and use `docker exec` to access the container, or mount a volume and SFTP directly to it
- **Vercel/Netlify**: Images must be in your Git repository (commit and push to add new images)
- **Alternative**: Use object storage (S3/R2/Spaces) for production-scale deployments

## Environment Variables

No environment variables required! Everything runs from the file system.

## License

© 2025 Matthew Hall. All Rights Reserved.


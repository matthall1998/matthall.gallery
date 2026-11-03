# Gallery - Next.js

A photography portfolio site built with Next.js, featuring a responsive masonry gallery powered by file-system based storage.

## Features

- 📸 Responsive masonry gallery layout
- 🖼️ Full-screen lightbox with EXIF data display
- 🏷️ Smart filtering system:
  - **Filter** dropdown: People and tags
  - **Gear** dropdown: Cameras and lenses
    - Lens labels use a softer gray to distinguish them from cameras.
- 🔀 Multiple sorting options:
  - **Latest**: Sorted by export date (newest exports first)
  - **By Date**: Sorted by shot date (when photo was taken)
  - **Shuffle**: Random order
- 📱 Mobile-responsive navigation
- ⚡ Lazy loading with blur effect
- 🎨 Dark theme UI
- 🔗 Unlisted album URLs (not authenticated or password-protected)
- 📁 File-system based - no database required

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Gallery**: React Responsive Masonry
- **Lightbox**: PhotoSwipe
- **Storage**: File system with a validated gallery manifest (legacy sidecars supported before cutover)

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

For the manifest consumer, place a completed panel export's referenced `assets/`
and `gallery-manifest.json` in `data/images/`. The schema v1 manifest is
authoritative whenever present; invalid JSON or an unsupported schema produces
an error, never legacy fallback or an empty success.

Before a manifest is activated, the legacy layout still works. Place images
and their corresponding `.json` metadata files in `data/images/`:
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
  "image_width": 6000,
  "image_height": 4000,
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
│       ├── gallery-manifest.json # Authoritative schema v1 catalog, once activated
│       ├── assets/<row>/<sha256>.jpg
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
- A shared server-side reader loads `gallery-manifest.json` at runtime for pages
  and `/api/images`. Only a missing manifest (`ENOENT`) enables legacy sidecars.
- Manifest validation covers schema version, field types, unique IDs/slugs,
  album memberships, dates, dimensions, and row-matched content-addressed paths.
- Manifest photos use explicit `file` and nullable `optimized_file` references.
  The grid prefers the optimized file; the lightbox always uses `file`.
- Content-addressed assets use immutable caching. Legacy image URLs revalidate.
  Image routes reject traversal, escaping symlinks, non-image, and hidden paths.
  JSON, caches, and staging files are not served.
- API route provides security (path validation) and proper caching headers
- Include positive `image_width` and `image_height` pixel dimensions in each metadata file. Thumbnails must preserve the original aspect ratio so placeholders reserve the correct space before images load.
- The first two thumbnails load eagerly, with high fetch priority on the first. Remaining thumbnails load when within 100px of the viewport; the gallery reserves their space to avoid fetching off-screen images immediately.

### Content Structure  
- With schema v1, the homepage shows ONLY photos with an empty `album_ids` array.
  All other photos appear only on their album URLs, including photos in several
  albums. Files are not duplicated per album.
- Albums use their exact stored `slug` and actual `name` for titles/metadata.
  Renaming an album does not change its URL. Unknown slugs return 404; known
  empty albums display an empty-album message.
- V1 `people` and `tags` are arrays; commas inside a value are preserved.
  Only legacy strings are split on commas.
- Without a manifest, root photos still use `"website": true`, and directory
  albums still use `"private_link": true`. Legacy directories are never merged
  into a manifest catalog or used as an unknown-slug fallback.
- Filters automatically populate from metadata:
  - People and tags appear in the **Filter** dropdown
  - Cameras ("Make Model") and lenses appear in the **Gear** dropdown
- Sorting:
  - **Latest**: Orders by `export_date` (when you exported/processed the photo)
  - **By Date**: Orders by `shot_date` (when you actually took the photo)
  - **Shuffle**: Random order on each click
- Albums with `load_random: true` shuffle once per visit, not during scrolling
  or unrelated renders. Other albums and the homepage initially sort by export
  date descending. Missing dates sort last, and ties use string photo IDs.
- Filtering, sorting, and shuffling use the metadata loaded with the page without refetching it or replacing the gallery with a spinner. Shuffle preserves the active filter; choosing a filter or sort resets the shuffle.
- After a selection or order change, visible thumbnails finish loading and decoding before revealing together in a 300ms gallery fade, including images that stay in place. Per-image fades are suppressed during this transition, off-screen images remain lazy-loaded, and visitors who prefer reduced motion skip the synchronized fade.
- Reload the page to pick up newly activated catalogs without rebuilding.
  Pages render dynamically and the list API sends `Cache-Control: no-store`.

## Verification

```bash
npm test
npm run build
npm run test:http
npm run verify:catalog -- /path/to/completed/export
```

Unit fixtures cover memberships, exclusion, commas, stable slugs, multi-file
rows sharing assets, optional previews, ordering, invalid catalogs, legacy
fallback, and unsafe paths. HTTP tests start the production build with isolated
temporary image data and verify status codes, metadata, caching, legacy
fallback, and atomic catalog updates. They do not modify `data/images/`.

`verify:catalog` validates the manifest and all referenced asset checksums,
then prints homepage/album counts. For URL compatibility, supply a local copy
of the existing production image directory:

```bash
npm run verify:catalog -- /path/to/export --legacy-dir /path/to/production-image-copy
```

Missing legacy slugs cause this check to fail. Also inventory URLs shared outside
the directory layout; the tool cannot discover those. Any redirects require
explicit agreement and implementation before cutover.

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

The above upload layout is the legacy mode. For schema v1, follow the gated
cutover below instead; do not copy the sample catalog into production.

**Why this works:**
- Same `/data/images` path works locally and in production
- No environment variables needed for image storage
- SFTP/rsync directly to persistent storage
- Images survive container rebuilds

### Manifest cutover (operator approval required)

**Cutover decision:** preserving legacy album URLs is not a deployment blocker
for this installation. The operator approved proceeding without that migration.
After activation, only albums in the new manifest resolve; unmatched legacy
album URLs return 404. The sample slugs remain fictional and must not be
published as the production catalog.

1. Use the intended Baserow album slugs for the new catalog. If an old URL needs
   to be retained, set that album's Slug before Export. Otherwise no legacy
   inventory or redirects are required for this cutover.
2. Deploy this consumer while the panel's
   `GALLERY_MANIFEST_PUBLISH_ENABLED` flag remains disabled. With no manifest,
   existing sidecar galleries continue working.
3. Confirm the panel's rsync destination is the same persistent volume mounted
   at the gallery process's `data/images/` (typically `/app/data/images`).
   Keep a backup of the current catalog.
4. After consumer deployment and volume confirmation,
   enable `GALLERY_MANIFEST_PUBLISH_ENABLED` in the
   panel and restart it. This repository does not enable that flag.
5. Run the panel's explicit **Export** action. Review warnings, photo/album
   counts, nullable previews, and slug mappings. Validate the export using
   `verify:catalog` and review it locally before publishing.
6. Explicitly **Publish**. The panel transfers referenced assets first, then
   atomically activates the manifest. Refresh the homepage and new album
   URLs, including empty albums and full-size lightboxes. No rebuild is needed.
   If the connection is lost during activation, inspect the active manifest
   before deciding whether to retry.

Upload/optimization, Export, and Publish remain separate actions. There is no
need to re-upload originals to Baserow. Retained legacy images are not catalog
entries, but previously shared image URLs can still be fetched: unlisted albums
are not access control. This migration neither publishes nor deletes production
files.

### Vercel/Netlify Deployment

These platforms don't support persistent file storage. Two options:

1. **Small galleries**: Commit images to git (remove from `.gitignore`)
2. **Large galleries**: Switch to object storage (S3/Cloudflare R2) - requires code modification

## Environment Variables

Images always use `/data/images` and need no environment variables.

### Analytics (Optional)

Copy `.env.example` to `.env.local` for local development, or set these variables
in your deployment platform (for example, Coolify):

```dotenv
NEXT_PUBLIC_UMAMI_SCRIPT_URL=
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
```

For Umami, enter your script URL and website ID; both must be set to load tracking
on all pages. For Google Analytics, enter your GA4 measurement ID (such as
`G-XXXXXXXXXX`). Each provider is enabled independently. Leave values empty or
unset to disable that provider. The shared example intentionally contains no
tracking IDs, so copying it does not enable analytics.

These values are public, not secrets. Next.js embeds `NEXT_PUBLIC_` values at
build time, so make them available during the build and rebuild/redeploy after
changing them. Restart the development server after changing `.env.local`.

## License

© 2025 Matthew Hall. All Rights Reserved.

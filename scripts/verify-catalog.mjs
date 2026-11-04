import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { listLegacyAlbums, readManifest } from '../lib/galleryCatalog.mjs';
import { resolveImagePath } from '../lib/imageAssets.mjs';

async function main() {
  const [directory, flag, legacyDirectory, ...extra] = process.argv.slice(2);
  if (!directory || (flag && (flag !== '--legacy-dir' || !legacyDirectory)) || extra.length) {
    throw new Error('Usage: npm run verify:catalog -- <export-directory> [--legacy-dir <production-image-copy>]');
  }
  const root = path.resolve(directory);
  const manifest = await readManifest(root);
  if (!manifest) throw new Error('No gallery-manifest.json exists in the export directory');
  const assets = new Set(manifest.photos.flatMap(photo => [photo.file, photo.optimized_file].filter(Boolean)));
  for (const asset of assets) {
    const fullPath = await resolveImagePath(asset.split('/'), root);
    const checksum = createHash('sha256').update(await fs.readFile(fullPath)).digest('hex');
    if (checksum !== path.basename(asset, path.extname(asset))) {
      throw new Error(`Asset checksum does not match its URL: ${asset}`);
    }
  }
  console.log(`Valid schema v1: ${manifest.photos.length} photos, ${manifest.albums.length} albums, ${assets.size} verified assets.`);
  console.log(`Homepage: ${manifest.photos.filter(photo => photo.album_ids.length === 0 || photo.album_photo_in_main === true).length} photos.`);
  for (const album of manifest.albums) {
    const count = manifest.photos.filter(photo => photo.album_ids.includes(album.id)).length;
    console.log(`/${album.slug}: ${count} photos; initial ${album.load_random ? 'shuffle' : 'export-date order'}`);
  }
  if (legacyDirectory) {
    const oldSlugs = await listLegacyAlbums(path.resolve(legacyDirectory));
    const slugs = new Set(manifest.albums.map(album => album.slug));
    const missing = oldSlugs.filter(slug => !slugs.has(slug));
    console.log(`Legacy directory inventory: ${oldSlugs.length} album URLs.`);
    if (missing.length) {
      throw new Error(`CUTOVER BLOCKED: legacy URLs missing from manifest: ${missing.map(slug => `/${slug}`).join(', ')}. Preserve Baserow slugs or explicitly agree on and implement migration/redirects.`);
    }
  } else {
    console.warn('CUTOVER NOT VERIFIED: no production legacy URL inventory supplied. Sample slugs are not production mappings.');
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

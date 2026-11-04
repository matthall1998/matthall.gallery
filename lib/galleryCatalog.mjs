import { promises as fs } from 'node:fs';
import path from 'node:path';
import { imageDirectory, manifestAssetPattern, resolveImagePath } from './imageAssets.mjs';
import { sortImages } from './galleryImages.mjs';

const reservedSlugs = new Set(['api', 'assets', 'data', 'admin', 'gallery', 'favicon', 'robots', 'sitemap']);
const stringFields = [
  'caption', 'camera_make', 'camera', 'lens_make', 'lens', 'iso',
  'shutter_speed', 'aperture', 'shot_date', 'export_date',
];
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export class ManifestError extends Error {
  constructor(message) {
    super(`Invalid gallery manifest: ${message}`);
    this.name = 'ManifestError';
  }
}

function requireValue(condition, message) {
  if (!condition) throw new ManifestError(message);
}

function validDate(value) {
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateManifest(manifest) {
  requireValue(record(manifest), 'expected an object');
  requireValue(manifest.schema_version === 1, 'unsupported schema_version (expected 1)');
  requireValue(typeof manifest.generated_at === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(manifest.generated_at)
    && validDate(manifest.generated_at.slice(0, 10))
    && Number.isFinite(Date.parse(manifest.generated_at)), 'generated_at must be an ISO timestamp');
  requireValue(Array.isArray(manifest.albums), 'albums must be an array');
  requireValue(Array.isArray(manifest.photos), 'photos must be an array');
  const albumIds = new Set();
  const slugs = new Set();
  for (const [index, album] of manifest.albums.entries()) {
    const label = `albums[${index}]`;
    requireValue(record(album), `${label} must be an object`);
    requireValue(positiveInteger(album.id) && !albumIds.has(album.id), `${label}.id must be a unique positive integer`);
    requireValue(typeof album.name === 'string', `${label}.name must be a string`);
    requireValue(typeof album.slug === 'string' && album.slug.length <= 100 && album.slug.trim() === album.slug
      && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(album.slug) && !reservedSlugs.has(album.slug)
      && !slugs.has(album.slug), `${label}.slug must be unique, non-reserved lowercase words separated by hyphens`);
    requireValue(typeof album.load_random === 'boolean', `${label}.load_random must be a boolean`);
    albumIds.add(album.id);
    slugs.add(album.slug);
  }
  const photoIds = new Set();
  for (const [index, photo] of manifest.photos.entries()) {
    const label = `photos[${index}]`;
    requireValue(record(photo), `${label} must be an object`);
    requireValue(positiveInteger(photo.row_id), `${label}.row_id must be a positive integer`);
    requireValue(typeof photo.id === 'string'
      && photo.id.trim() === photo.id
      && new RegExp(`^${photo.row_id}-[a-f0-9]{64}$`).test(photo.id)
      && !photoIds.has(photo.id), `${label}.id must be a unique row ID/source-name hash`);
    photoIds.add(photo.id);
    requireValue(Array.isArray(photo.album_ids)
      && photo.album_ids.every(id => positiveInteger(id) && albumIds.has(id))
      && new Set(photo.album_ids).size === photo.album_ids.length,
    `${label}.album_ids must contain unique known album IDs`);
    for (const field of ['file', 'optimized_file']) {
      if (field === 'optimized_file' && photo[field] === null) continue;
      const match = typeof photo[field] === 'string' && photo[field].match(manifestAssetPattern);
      requireValue(match && match[0] === photo[field] && match[1] === String(photo.row_id),
        `${label}.${field} must be a safe asset path for its row_id`);
    }
    for (const field of ['image_width', 'image_height']) {
      requireValue(positiveInteger(photo[field]), `${label}.${field} must be a positive integer`);
    }
    for (const field of stringFields) {
      requireValue(typeof photo[field] === 'string', `${label}.${field} must be a string`);
    }
    for (const field of ['people', 'tags']) {
      requireValue(Array.isArray(photo[field]) && photo[field].every(value => typeof value === 'string'),
        `${label}.${field} must be an array of strings`);
    }
    if (Object.hasOwn(photo, 'album_tags')) {
      requireValue(Array.isArray(photo.album_tags) && photo.album_tags.every(value => typeof value === 'string'),
        `${label}.album_tags must be an array of strings`);
    }
    if (Object.hasOwn(photo, 'album_photo_in_main')) {
      requireValue(typeof photo.album_photo_in_main === 'boolean',
        `${label}.album_photo_in_main must be a boolean`);
    }
    for (const field of ['shot_date', 'export_date']) {
      requireValue(validDate(photo[field]), `${label}.${field} must be YYYY-MM-DD or empty`);
    }
  }
  return manifest;
}

export async function readManifest(baseDir = imageDirectory()) {
  let content;
  try {
    content = await fs.readFile(path.join(baseDir, 'gallery-manifest.json'), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // A dangling manifest symlink is a broken catalog, not a legacy installation.
    try {
      await fs.lstat(path.join(baseDir, 'gallery-manifest.json'));
    } catch (statError) {
      if (statError.code === 'ENOENT') return null;
      throw statError;
    }
    throw error;
  }
  let manifest;
  try {
    manifest = JSON.parse(content);
  } catch (error) {
    throw new ManifestError(`JSON could not be parsed: ${error.message}`);
  }
  return validateManifest(manifest);
}

function toImage(photo, album) {
  return {
    ...photo,
    tags: [...(album ? photo.album_tags ?? [] : photo.tags)],
    src: `/api/images/serve/${photo.file}`,
    srcOptimized: photo.optimized_file ? `/api/images/serve/${photo.optimized_file}` : null,
    shutter: photo.shutter_speed,
  };
}

function legacyValues(value) {
  return Array.isArray(value) ? value : (value || '').split(',').map(item => item.trim()).filter(Boolean);
}

export async function listLegacyAlbums(baseDir = imageDirectory()) {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  return entries.filter(entry => entry.isDirectory() && /^[a-z0-9_-]+$/i.test(entry.name)
    && entry.name !== 'assets').map(entry => entry.name).sort();
}

async function readLegacyGallery(slug, baseDir) {
  if (slug !== null && (typeof slug !== 'string' || !/^[a-z0-9_-]+$/i.test(slug)
    || !(await listLegacyAlbums(baseDir)).includes(slug))) return null;
  const directory = slug === null ? baseDir : path.join(baseDir, slug);
  const files = await fs.readdir(directory);
  const sidecars = files.filter(file => !file.startsWith('.') && /\.(jpg|jpeg|png|gif|webp)\.json$/i.test(file));
  const images = await Promise.all(sidecars.map(async sidecar => {
    const metadata = JSON.parse(await fs.readFile(path.join(directory, sidecar), 'utf8'));
    const file = sidecar.slice(0, -5);
    const relativeFile = slug === null ? file : `${slug}/${file}`;
    await resolveImagePath(relativeFile.split('/'), baseDir);
    const optimized = `${file.replace(/\.(jpg|jpeg|png)$/i, '')}_optimized.webp`;
    return {
      ...metadata,
      id: `legacy:${relativeFile}`,
      src: `/api/images/serve/${relativeFile.split('/').map(encodeURIComponent).join('/')}`,
      srcOptimized: files.includes(optimized)
        ? `/api/images/serve/${[slug, optimized].filter(value => value !== null).map(encodeURIComponent).join('/')}`
        : null,
      shutter: metadata.shutter_speed || '',
      people: legacyValues(metadata.people),
      tags: legacyValues(metadata.tags),
    };
  }));
  return {
    source: 'legacy',
    generatedAt: null,
    album: slug === null ? null : {
      slug,
      name: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      load_random: false,
    },
    images: sortImages(images.filter(image => slug === null ? image.website : image.private_link)),
  };
}

export async function getGallery(slug = null, baseDir = imageDirectory()) {
  const manifest = await readManifest(baseDir);
  if (manifest === null) return readLegacyGallery(slug, baseDir);
  const album = slug === null ? null : manifest.albums.find(item => item.slug === slug);
  if (slug !== null && !album) return null;
  const photos = manifest.photos.filter(photo => album
    ? photo.album_ids.includes(album.id) : photo.album_ids.length === 0 || photo.album_photo_in_main === true);
  return {
    source: 'manifest',
    generatedAt: manifest.generated_at,
    album,
    images: sortImages(photos.map(photo => toImage(photo, album))),
  };
}

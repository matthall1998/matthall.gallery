import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getGallery, listLegacyAlbums, ManifestError, readManifest, validateManifest } from '../lib/galleryCatalog.mjs';
import { extractFilters, filterImages, initialImageOrder, shuffleImages, sortImages, toGalleryImage } from '../lib/galleryImages.mjs';
import { InvalidImagePathError, resolveImagePath, validateImagePath } from '../lib/imageAssets.mjs';
import { catalogFixture, photo } from './fixtures/catalog.mjs';

async function imageRoot(t, manifest = catalogFixture()) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  if (manifest !== null) await writeManifest(directory, manifest);
  return directory;
}

async function writeManifest(directory, manifest) {
  await fs.writeFile(path.join(directory, 'gallery-manifest.json'), JSON.stringify(manifest));
}

async function legacyPhoto(directory, filename = 'same.jpg', metadata = {}) {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, filename), 'image bytes');
  await fs.writeFile(path.join(directory, `${filename}.json`), JSON.stringify({
    website: true, private_link: true, people: 'One, Two', tags: 'Tag A, Tag B',
    export_date: '2026-10-01', ...metadata,
  }));
}

test('manifest is authoritative; homepage excludes every album photo', async t => {
  const directory = await imageRoot(t);
  await legacyPhoto(directory);
  await fs.writeFile(path.join(directory, 'unrelated.json'), 'broken JSON');
  const gallery = await getGallery(null, directory);
  assert.equal(gallery.source, 'manifest');
  assert.deepEqual(gallery.images.map(image => image.row_id), [1, 2]);
  assert.ok(gallery.images.every(image => image.album_ids.length === 0));
});

test('membership uses IDs; names, stored slugs, empty and unknown albums are distinct', async t => {
  const directory = await imageRoot(t);
  const trip = await getGallery('trip', directory);
  const favorites = await getGallery('favorites', directory);
  assert.equal(trip.album.name, 'Trip, with friends');
  assert.equal(trip.album.load_random, true);
  assert.equal(favorites.album.load_random, false);
  assert.equal(trip.images.length, 3);
  assert.equal(favorites.images.length, 2);
  assert.equal(trip.images.find(image => image.row_id === 3).src, favorites.images[0].src);
  assert.deepEqual((await getGallery('empty-album', directory)).images, []);
  assert.equal(await getGallery('unknown', directory), null);
  assert.equal(await getGallery('Trip', directory), null);
  assert.equal(await getGallery('../trip', directory), null);
  await legacyPhoto(path.join(directory, 'old-album'));
  assert.equal(await getGallery('old-album', directory), null);
  const renamed = catalogFixture();
  renamed.albums[0].name = 'A completely different name';
  await writeManifest(directory, renamed);
  assert.equal((await getGallery('trip', directory)).album.name, 'A completely different name');
  assert.equal(await getGallery('a-completely-different-name', directory), null);
});

test('v1 comma values remain whole; filtering includes gear and literal sort-like tags', async t => {
  const gallery = await getGallery(null, await imageRoot(t));
  const filters = extractFilters(gallery.images);
  assert.deepEqual(filters.people, [{ name: 'Person, with comma' }]);
  assert.ok(filters.tags.some(tag => tag.name === 'Place, with comma'));
  assert.equal(filterImages(gallery.images, 'Person').length, 0);
  for (const value of ['Person, with comma', 'Place, with comma', 'latest', 'shuffle', 'Camera maker Model', 'Lens maker 35mm']) {
    assert.equal(filterImages(gallery.images, value).length, 2);
  }
});

test('explicit full-size and optimized URLs, fallback, metadata and photo IDs survive mapping', async t => {
  const directory = await imageRoot(t);
  const home = await getGallery(null, directory);
  const first = toGalleryImage(home.images[0]);
  assert.equal(first.src, `/api/images/serve/${catalogFixture().photos[0].file}`);
  assert.equal(first.srcThumbnail, `/api/images/serve/${catalogFixture().photos[0].optimized_file}`);
  assert.equal(first.shutter, '1/250');
  assert.equal(first.width, 600);
  assert.equal(first.height, 400);
  assert.equal(first.title, 'A photo, with commas');
  const fallback = toGalleryImage(home.images[1]);
  assert.equal(fallback.srcThumbnail, fallback.src);
  const trip = (await getGallery('trip', directory)).images.map(toGalleryImage);
  const sameAsset = trip.filter(image => image.id.startsWith('4-'));
  assert.equal(sameAsset.length, 2);
  assert.equal(sameAsset[0].src, sameAsset[1].src);
  assert.notEqual(sameAsset[0].id, sameAsset[1].id);
});

test('date sorting is deterministic with missing dates last and ID tie-breakers', () => {
  const images = [
    { id: 'c', export_date: '', shot_date: '' },
    { id: 'b', export_date: '2026-11-01', shot_date: '2026-10-01' },
    { id: 'a', export_date: '2026-11-01', shot_date: '2026-10-02' },
    { id: 'd', export_date: '2026-11-02', shot_date: '' },
    { id: 'e', export_date: '', shot_date: '' },
  ];
  assert.deepEqual(sortImages(images).map(image => image.id), ['d', 'a', 'b', 'c', 'e']);
  assert.deepEqual(sortImages(images, 'shot_date').map(image => image.id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(initialImageOrder(images), sortImages(images));
  assert.deepEqual(initialImageOrder(images, false), sortImages(images));
  const original = structuredClone(images);
  assert.deepEqual(shuffleImages(images, () => 0).map(image => image.id), ['b', 'a', 'd', 'e', 'c']);
  assert.deepEqual(images, original);
  assert.deepEqual(new Set(initialImageOrder(images, true)), new Set(images));
  assert.deepEqual(shuffleImages([]), []);
});

test('fresh reads observe atomically replaced manifests without caching', async t => {
  const directory = await imageRoot(t);
  assert.equal((await getGallery(null, directory)).images.length, 2);
  const replacement = catalogFixture();
  replacement.photos.push(photo(99, 'new.jpg'));
  await fs.writeFile(path.join(directory, '.next-manifest.json'), JSON.stringify(replacement));
  await fs.rename(path.join(directory, '.next-manifest.json'), path.join(directory, 'gallery-manifest.json'));
  assert.equal((await getGallery(null, directory)).images.length, 3);
});

test('legacy reader runs only for missing manifests and parses legacy comma strings', async t => {
  const directory = await imageRoot(t, null);
  await legacyPhoto(directory);
  await legacyPhoto(directory, 'excluded.jpg', { website: false });
  await legacyPhoto(path.join(directory, 'old_album'));
  await fs.mkdir(path.join(directory, 'empty-legacy'));
  await fs.mkdir(path.join(directory, 'assets'));
  await fs.writeFile(path.join(directory, 'same_optimized.webp'), 'optimized bytes');
  await fs.writeFile(path.join(directory, '.gallery-export-cache.json'), 'not a sidecar');
  await fs.writeFile(path.join(directory, 'export_summary.json'), 'not a sidecar');
  assert.equal(await readManifest(directory), null);
  const gallery = await getGallery(null, directory);
  assert.equal(gallery.source, 'legacy');
  assert.equal(gallery.images.length, 1);
  assert.deepEqual(gallery.images[0].people, ['One', 'Two']);
  assert.deepEqual(gallery.images[0].tags, ['Tag A', 'Tag B']);
  assert.equal(gallery.images[0].srcOptimized, '/api/images/serve/same_optimized.webp');
  assert.equal((await getGallery('old_album', directory)).images[0].srcOptimized, null);
  assert.deepEqual((await getGallery('empty-legacy', directory)).images, []);
  assert.equal(await getGallery('missing', directory), null);
  assert.equal(await getGallery('../outside', directory), null);
  assert.deepEqual(await listLegacyAlbums(directory), ['empty-legacy', 'old_album']);
});

test('malformed, unsupported, unreadable and dangling manifests never fall back', async t => {
  const directory = await imageRoot(t);
  await legacyPhoto(directory);
  const manifestPath = path.join(directory, 'gallery-manifest.json');
  await fs.writeFile(manifestPath, '{broken');
  await assert.rejects(getGallery(null, directory), ManifestError);
  await writeManifest(directory, { ...catalogFixture(), schema_version: 2 });
  await assert.rejects(getGallery(null, directory), /unsupported schema_version/);
  await fs.unlink(manifestPath);
  await fs.mkdir(manifestPath);
  await assert.rejects(getGallery(null, directory), { code: 'EISDIR' });
  await fs.rmdir(manifestPath);
  await fs.symlink(path.join(directory, 'does-not-exist'), manifestPath);
  await assert.rejects(getGallery(null, directory), { code: 'ENOENT' });
});

const invalidCases = [
  ['schema version type', manifest => { manifest.schema_version = '1'; }],
  ['timestamp', manifest => { manifest.generated_at = 'yesterday'; }],
  ['invalid timestamp date', manifest => { manifest.generated_at = '2026-02-30T03:00:00Z'; }],
  ['album collection', manifest => { manifest.albums = {}; }],
  ['photo collection', manifest => { manifest.photos = null; }],
  ['null album', manifest => { manifest.albums[0] = null; }],
  ['duplicate album ID', manifest => { manifest.albums[1].id = 11; }],
  ['duplicate slug', manifest => { manifest.albums[1].slug = 'trip'; }],
  ['reserved slug', manifest => { manifest.albums[0].slug = 'admin'; }],
  ['slug separators', manifest => { manifest.albums[0].slug = 'two--words'; }],
  ['slug trailing newline', manifest => { manifest.albums[0].slug = 'trip\n'; }],
  ['long slug', manifest => { manifest.albums[0].slug = 'a'.repeat(101); }],
  ['album name type', manifest => { manifest.albums[0].name = 1; }],
  ['random flag type', manifest => { manifest.albums[0].load_random = 'false'; }],
  ['unsafe integer', manifest => { manifest.albums[0].id = Number.MAX_SAFE_INTEGER + 1; }],
  ['null photo', manifest => { manifest.photos[0] = null; }],
  ['duplicate photo ID', manifest => { manifest.photos.push(manifest.photos[0]); }],
  ['ID type', manifest => { manifest.photos[0].id = 1; }],
  ['ID trailing newline', manifest => { manifest.photos[0].id += '\n'; }],
  ['row mismatch in ID', manifest => { manifest.photos[0].row_id = 99; }],
  ['unknown membership', manifest => { manifest.photos[0].album_ids = [100]; }],
  ['membership type', manifest => { manifest.photos[0].album_ids = ['11']; }],
  ['duplicate membership', manifest => { manifest.photos[0].album_ids = [11, 11]; }],
  ['zero dimensions', manifest => { manifest.photos[0].image_width = 0; }],
  ['dimension type', manifest => { manifest.photos[0].image_height = '400'; }],
  ['missing string', manifest => { delete manifest.photos[0].caption; }],
  ['people string', manifest => { manifest.photos[0].people = 'One, Two'; }],
  ['tags item type', manifest => { manifest.photos[0].tags = [1]; }],
  ['invalid date', manifest => { manifest.photos[0].shot_date = '2026-02-30'; }],
  ['missing optimized reference', manifest => { delete manifest.photos[0].optimized_file; }],
  ['asset trailing newline', manifest => { manifest.photos[0].file += '\n'; }],
  ['row mismatch in asset', manifest => { manifest.photos[0].file = manifest.photos[1].file; }],
  ...['../image.jpg', '/assets/1/image.jpg', 'https://example.com/image.jpg',
    'assets/1/../image.jpg', 'assets\\1\\image.jpg', 'assets/1/%2e%2e/image.jpg',
    `assets/1/${'a'.repeat(64)}.jpeg`, `assets/1/${'a'.repeat(64)}.json`,
  ].map(asset => [`unsafe asset ${asset}`, manifest => { manifest.photos[0].file = asset; }]),
];

for (const [name, mutate] of invalidCases) {
  test(`validation rejects ${name}`, () => {
    const manifest = catalogFixture();
    mutate(manifest);
    assert.throws(() => validateManifest(manifest), ManifestError);
  });
}

test('reserved words are allowed as substrings; supported image formats are accepted', () => {
  const manifest = catalogFixture();
  assert.equal(validateManifest(manifest), manifest);
  for (const ext of ['jpg', 'png', 'gif', 'webp']) {
    manifest.photos[0].file = `assets/1/${'a'.repeat(64)}.${ext}`;
    assert.equal(validateManifest(manifest), manifest);
  }
});

test('asset resolver permits nested assets and legacy images; rejects traversal and symlink escapes', async t => {
  const directory = await imageRoot(t);
  const asset = catalogFixture().photos[0].file;
  await fs.mkdir(path.dirname(path.join(directory, asset)), { recursive: true });
  await fs.writeFile(path.join(directory, asset), 'image bytes');
  assert.equal(await resolveImagePath(asset.split('/'), directory), await fs.realpath(path.join(directory, asset)));
  await legacyPhoto(path.join(directory, 'old_album'));
  await resolveImagePath(['old_album', 'same.jpg'], directory);
  for (const components of [
    [], ['..', 'outside.jpg'], ['../outside.jpg'], ['/outside.jpg'], ['old_album\\outside.jpg'],
    ['.staging', 'photo.jpg'], ['gallery-manifest.json'], ['.gallery-export-cache.json'],
    ['assets', '1', 'not-a-hash.jpg'], ['assets', '1', `${'a'.repeat(64)}.json`],
    ['\0photo.jpg'], ['photo.svg'], ['photo.jpg', ''],
  ]) {
    assert.throws(() => validateImagePath(components), InvalidImagePathError);
  }
  const outside = await imageRoot(t, null);
  await fs.writeFile(path.join(outside, 'outside.jpg'), 'outside bytes');
  await fs.symlink(path.join(outside, 'outside.jpg'), path.join(directory, 'escape.jpg'));
  await assert.rejects(resolveImagePath(['escape.jpg'], directory), InvalidImagePathError);
  await fs.symlink(path.join(directory, 'gallery-manifest.json'), path.join(directory, 'metadata.jpg'));
  await assert.rejects(resolveImagePath(['metadata.jpg'], directory), InvalidImagePathError);
  await assert.rejects(resolveImagePath(['missing.jpg'], directory), { code: 'ENOENT' });
});

test('export verification checks hashes and blocks unmapped legacy album URLs', async t => {
  const manifest = catalogFixture();
  const directory = await imageRoot(t, manifest);
  for (const photo of manifest.photos) {
    for (const [asset, bytes] of [[photo.file, 'image bytes'], [photo.optimized_file, 'optimized bytes']]) {
      if (!asset) continue;
      await fs.mkdir(path.dirname(path.join(directory, asset)), { recursive: true });
      await fs.writeFile(path.join(directory, asset), bytes);
    }
  }
  const verify = (...args) => promisify(execFile)(process.execPath, [
    path.resolve('scripts/verify-catalog.mjs'), directory, ...args,
  ]);
  const result = await verify();
  assert.match(result.stdout, /6 photos, 4 albums/);
  assert.match(result.stderr, /CUTOVER NOT VERIFIED/);
  const legacy = await imageRoot(t, null);
  await fs.mkdir(path.join(legacy, 'trip'));
  await verify('--legacy-dir', legacy);
  await fs.mkdir(path.join(legacy, 'missing-old-url'));
  await assert.rejects(verify('--legacy-dir', legacy), error =>
    error.code === 1 && error.stderr.includes('CUTOVER BLOCKED')
      && error.stderr.includes('/missing-old-url'));
  await fs.writeFile(path.join(directory, manifest.photos[0].file), 'changed bytes');
  await assert.rejects(verify(), error => error.code === 1 && error.stderr.includes('checksum'));
});

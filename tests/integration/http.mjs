import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { catalogFixture } from '../fixtures/catalog.mjs';

test('production HTTP routes use a fresh, authoritative catalog and safe image serving', async t => {
  const repository = process.cwd();
  await fs.access(path.join(repository, '.next', 'BUILD_ID'));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-http-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const name of ['.next', 'node_modules', 'public']) {
    await fs.symlink(path.join(repository, name), path.join(root, name));
  }
  await fs.copyFile(path.join(repository, 'package.json'), path.join(root, 'package.json'));
  const images = path.join(root, 'data', 'images');
  await fs.mkdir(images, { recursive: true });
  const manifest = catalogFixture();
  const manifestPath = path.join(images, 'gallery-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  for (const photo of manifest.photos) {
    for (const asset of [photo.file, photo.optimized_file].filter(Boolean)) {
      await fs.mkdir(path.dirname(path.join(images, asset)), { recursive: true });
      await fs.writeFile(path.join(images, asset), 'image bytes');
    }
  }
  await fs.mkdir(path.join(images, 'legacy-album'));
  await fs.writeFile(path.join(images, 'legacy-album', 'old.jpg'), 'old image bytes');
  await fs.writeFile(path.join(images, 'legacy-album', 'old.jpg.json'), JSON.stringify({
    private_link: true, tags: 'Old, Legacy', people: '', image_width: 600, image_height: 400,
  }));
  await fs.writeFile(path.join(images, 'root.jpg'), 'root image bytes');
  await fs.writeFile(path.join(images, 'root.jpg.json'), JSON.stringify({ website: true, tags: '', people: '' }));

  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const server = spawn(process.execPath, [
    path.join(repository, 'node_modules', 'next', 'dist', 'bin', 'next'),
    'start', root, '--hostname', '127.0.0.1', '--port', String(port),
  ], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  t.after(async () => {
    if (server.exitCode === null) {
      const stopped = once(server, 'exit');
      server.kill('SIGTERM');
      await stopped;
    }
  });
  const base = `http://127.0.0.1:${port}`;
  const get = route => fetch(`${base}${route}`, { redirect: 'manual' });
  for (let attempt = 0; attempt < 200 && !output.includes('Ready in'); attempt++) {
    if (server.exitCode !== null) assert.fail(`Server exited:\n${output}`);
    await delay(50);
  }
  assert.match(output, /Ready in/, `Server never became ready:\n${output}`);

  await t.test('homepage and album API selection, ordering, metadata and no-store', async () => {
    const home = await get('/api/images');
    assert.equal(home.status, 200);
    assert.equal(home.headers.get('cache-control'), 'no-store');
    assert.deepEqual((await home.json()).results.map(photo => photo.row_id), [1, 2]);
    const album = await (await get('/api/images?slug=favorites')).json();
    assert.deepEqual(album.results.map(photo => photo.row_id), [3, 5]);
    const page = await get('/favorites');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Renamed favorites - matthall.gallery/);
    const empty = await get('/empty-album');
    assert.equal(empty.status, 200);
    assert.match(await empty.text(), /This album has no photos yet/);
    assert.deepEqual((await (await get('/api/images?slug=empty-album')).json()).results, []);
    for (const route of ['/unknown', '/legacy-album', '/api/images?slug=unknown', '/api/images?slug=../legacy-album']) {
      assert.equal((await get(route)).status, 404, route);
    }
  });

  await t.test('nested image content, cache policy, missing files and blocked metadata/traversal', async () => {
    const image = await get(`/api/images/serve/${manifest.photos[0].file}`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
    assert.match(image.headers.get('cache-control'), /immutable/);
    assert.equal(await image.text(), 'image bytes');
    const optimized = await get(`/api/images/serve/${manifest.photos[0].optimized_file}`);
    assert.equal(optimized.headers.get('content-type'), 'image/webp');
    const legacy = await get('/api/images/serve/legacy-album/old.jpg');
    assert.equal(legacy.status, 200);
    assert.doesNotMatch(legacy.headers.get('cache-control'), /immutable/);
    assert.equal((await get('/api/images/serve/missing.jpg')).status, 404);
    for (const route of [
      'gallery-manifest.json', '.gallery-export-cache.json', '.staging/photo.jpg',
      'assets/1/not-a-hash.jpg', '%2e%2e%2foutside.jpg', 'legacy-album%5c..%5coutside.jpg',
    ]) {
      assert.equal((await get(`/api/images/serve/${route}`)).status, 403, route);
    }
  });

  await t.test('atomic activation updates pages and API without rebuilding', async () => {
    const updated = structuredClone(manifest);
    updated.albums[1].name = 'Updated at runtime';
    updated.photos[2].album_ids = [];
    await fs.writeFile(path.join(images, '.staged-manifest.json'), JSON.stringify(updated));
    await fs.rename(path.join(images, '.staged-manifest.json'), manifestPath);
    assert.equal((await (await get('/api/images')).json()).results.length, 3);
    assert.match(await (await get('/favorites')).text(), /Updated at runtime - matthall.gallery/);
  });

  await t.test('corrupt and unsupported catalogs fail explicitly, not as empty success', async () => {
    for (const content of ['{broken', JSON.stringify({ ...manifest, schema_version: 2 })]) {
      await fs.writeFile(manifestPath, content);
      const response = await get('/api/images');
      assert.equal(response.status, 500);
      const body = await response.json();
      assert.equal(body.error, 'Failed to load gallery catalog');
      assert.equal('results' in body, false);
      assert.equal((await get('/')).status, 500);
      assert.equal((await get('/favorites')).status, 500);
    }
  });

  await t.test('absent catalog restores legacy root/album loading only', async () => {
    await fs.unlink(manifestPath);
    assert.equal((await (await get('/api/images')).json()).results.length, 1);
    const legacy = await (await get('/api/images?slug=legacy-album')).json();
    assert.deepEqual(legacy.results[0].tags, ['Old', 'Legacy']);
    assert.equal((await get('/legacy-album')).status, 200);
    assert.equal((await get('/api/images?slug=missing')).status, 404);
  });
});

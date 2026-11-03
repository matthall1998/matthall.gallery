import test from 'node:test';
import assert from 'node:assert/strict';
import { galleryViewImages, readGalleryView, updateGalleryQuery } from '../lib/galleryView.mjs';
import { sortImages } from '../lib/galleryImages.mjs';

const images = [
  { id: 'a', export_date: '2026-01-03', shot_date: '', tags: ['Landscape', 'Name, with comma'], people: [], camera_make: 'Canon', camera: 'R5', lens_make: '', lens: '' },
  { id: 'b', export_date: '2026-01-02', shot_date: '2026-01-05', tags: ['Landscape'], people: ['Name, with comma'], camera_make: 'Sony', camera: 'A7', lens_make: 'Canon', lens: 'R5' },
  { id: 'c', export_date: '', shot_date: '2026-01-04', tags: ['Canon R5'], people: [], camera_make: 'Sony', camera: 'A7', lens_make: '', lens: '' },
];
const ids = rows => rows.map(row => row.id);
const view = query => readGalleryView(new URLSearchParams(query));
const select = query => galleryViewImages(images, [...images].reverse(), view(query));

test('default views preserve the per-visit album order; explicit sorts override it', () => {
  assert.deepEqual(ids(select('')), ['c', 'b', 'a']);
  assert.deepEqual(ids(select('sort=unknown')), ['c', 'b', 'a']);
  assert.deepEqual(ids(select('sort=latest')), ['a', 'b', 'c']);
  assert.deepEqual(ids(select('sort=bydate')), ['b', 'c', 'a']);
  assert.deepEqual(ids(select('filter=Landscape')), ['b', 'a']);
});

test('metadata and gear filters are separate exact matches and combine with AND', () => {
  assert.deepEqual(ids(select('filter=Canon+R5')), ['c']);
  assert.deepEqual(ids(select('gear=Canon+R5')), ['b', 'a']);
  assert.deepEqual(ids(select('filter=Landscape&gear=Sony+A7&sort=latest')), ['b']);
  assert.deepEqual(ids(select('filter=Name%2C+with+comma')), ['b', 'a']);
  assert.deepEqual(select('filter=Name'), []);
  assert.deepEqual(select('gear=Unknown'), []);
  assert.deepEqual(select('filter=Landscape&gear=Unknown'), []);
});

test('seeded shuffle is deterministic, independent of input order, and does not mutate data', () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ ...images[i % 3], id: String(i) }));
  const original = structuredClone(many);
  const shuffled = galleryViewImages(many, many, view('sort=shuffle&seed=first'));
  assert.deepEqual(shuffled, galleryViewImages([...many].reverse(), many, view('sort=shuffle&seed=first')));
  assert.notDeepEqual(shuffled, galleryViewImages(many, many, view('sort=shuffle&seed=second')));
  assert.deepEqual([...ids(shuffled)].sort(), ids(many).sort());
  assert.deepEqual(many, original);
  assert.deepEqual(select('sort=shuffle'), select('sort=shuffle'));
  assert.deepEqual(sortImages(images).map(row => row.id), ['a', 'b', 'c']);
});

test('filters preserve shuffled relative order and clearing restores it', () => {
  const shuffled = select('sort=shuffle&seed=example');
  assert.deepEqual(select('sort=shuffle&seed=example&filter=Landscape'),
    shuffled.filter(image => image.tags.includes('Landscape')));
});

test('URL updates preserve other parameters, encode literal values, and remove stale seeds', () => {
  const params = new URLSearchParams('sort=shuffle&seed=123&filter=Landscape&other=value');
  const next = new URLSearchParams(updateGalleryQuery(params, { sort: 'bydate', gear: 'A&B, + lens' }));
  assert.equal(next.get('sort'), 'bydate');
  assert.equal(next.get('filter'), 'Landscape');
  assert.equal(next.get('gear'), 'A&B, + lens');
  assert.equal(next.get('other'), 'value');
  assert.equal(next.has('seed'), false);
  assert.equal(params.get('sort'), 'shuffle');
  const cleared = new URLSearchParams(updateGalleryQuery(next, { filter: null, gear: null }));
  assert.equal(cleared.has('filter'), false);
  assert.equal(cleared.has('gear'), false);
  assert.equal(cleared.get('sort'), 'bydate');
  assert.equal(updateGalleryQuery(new URLSearchParams('filter=Landscape'), { filter: null }), '');
});

test('query parsing preserves literal values and applies defaults for empty parameters', () => {
  assert.deepEqual(view('sort=shuffle&seed=history&filter=Name%2C+with+comma&gear=Canon+R5'), {
    sort: 'shuffle', seed: 'history', filter: 'Name, with comma', gear: 'Canon R5',
  });
  assert.deepEqual(view('sort=&seed=&filter=&gear='), {
    sort: null, seed: 'shuffle', filter: '', gear: '',
  });
});

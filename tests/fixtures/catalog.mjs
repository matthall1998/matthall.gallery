import { createHash } from 'node:crypto';

const hash = text => createHash('sha256').update(text).digest('hex');

export function photo(row, sourceName, overrides = {}) {
  return {
    id: `${row}-${hash(sourceName)}`,
    row_id: row,
    album_ids: [],
    file: `assets/${row}/${hash('image bytes')}.jpg`,
    optimized_file: null,
    image_width: 600,
    image_height: 400,
    caption: 'A photo, with commas',
    camera_make: 'Camera maker',
    camera: 'Model',
    lens_make: 'Lens maker',
    lens: '35mm',
    iso: '100',
    shutter_speed: '1/250',
    aperture: 'f/4',
    people: ['Person, with comma'],
    tags: ['Place, with comma', 'latest', 'shuffle'],
    shot_date: '2026-10-01',
    export_date: '2026-11-01',
    ...overrides,
  };
}

export function catalogFixture() {
  return {
    schema_version: 1,
    generated_at: '2026-11-03T03:00:00.000Z',
    albums: [
      { id: 11, name: 'Trip, with friends', slug: 'trip', load_random: true },
      { id: 12, name: 'Renamed favorites', slug: 'favorites', load_random: false },
      { id: 13, name: 'An empty album', slug: 'empty-album', load_random: false },
      { id: 14, name: 'Contains reserved words', slug: 'admin-gallery-trip', load_random: false },
    ],
    photos: [
      photo(1, 'same-name.jpg', { optimized_file: `assets/1/${hash('optimized bytes')}.webp` }),
      photo(2, 'same-name.jpg', { shot_date: '', export_date: '' }),
      photo(3, 'shared.jpg', { album_ids: [11, 12] }),
      photo(4, 'same-display-name-source-a.jpg', { album_ids: [11] }),
      photo(4, 'same-display-name-source-b.jpg', { album_ids: [11] }),
      photo(5, 'earlier.jpg', { album_ids: [12], export_date: '2026-10-01' }),
    ],
  };
}

export function featuredCatalogFixture() {
  return {
    ...catalogFixture(),
    albums: [
      { id: 5, name: 'Featured trip', slug: 'trip', load_random: true },
      { id: 6, name: 'Featured favorites', slug: 'favorites', load_random: false },
      { id: 13, name: 'An empty album', slug: 'empty-album', load_random: false },
    ],
    photos: [
      photo(1, 'home-false.jpg', { album_photo_in_main: false }),
      photo(2, 'home-omitted.jpg'),
      photo(3, 'home-true.jpg', { album_photo_in_main: true }),
      photo(4, 'featured-shared.jpg', {
        album_ids: [5, 6], album_photo_in_main: true,
        tags: ['Nature'], album_tags: ['Day 2', 'Friends, family'],
        optimized_file: `assets/4/${hash('optimized bytes')}.webp`,
      }),
      photo(5, 'album-false.jpg', { album_ids: [5], album_photo_in_main: false, album_tags: ['Album only'] }),
      photo(6, 'album-omitted.jpg', { album_ids: [5] }),
      photo(7, 'missing-album-tags.jpg', { album_ids: [5], album_photo_in_main: true }),
      photo(8, 'empty-album-tags.jpg', { album_ids: [5], album_photo_in_main: true, album_tags: [] }),
      photo(9, 'empty-home-tags.jpg', {
        album_ids: [6], album_photo_in_main: true, tags: [], album_tags: ['Album only'],
      }),
    ],
  };
}

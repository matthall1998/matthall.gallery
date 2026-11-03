import { matchesImageFilter, shuffleImages, sortImages } from './galleryImages.mjs';

function seededRandom(seed) {
  let state = 2166136261;
  for (const character of seed) {
    state = Math.imul(state ^ character.codePointAt(0), 16777619);
  }
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function readGalleryView(params) {
  const sort = params.get('sort');
  return {
    sort: ['latest', 'bydate', 'shuffle'].includes(sort) ? sort : null,
    filter: params.get('filter') || '',
    gear: params.get('gear') || '',
    seed: params.get('seed') || 'shuffle',
  };
}

export function galleryViewImages(initialImages, defaultOrder, view) {
  let ordered = defaultOrder;
  if (view.sort === 'latest' || view.sort === 'bydate') {
    ordered = sortImages(initialImages, view.sort === 'bydate' ? 'shot_date' : 'export_date');
  } else if (view.sort === 'shuffle') {
    // Start from a canonical order so a shared seed survives catalog row reordering.
    ordered = shuffleImages(sortImages(initialImages), seededRandom(view.seed));
  }
  return ordered.filter(image =>
    (!view.filter || matchesImageFilter(image, view.filter, 'filter'))
    && (!view.gear || matchesImageFilter(image, view.gear, 'gear'))
  );
}

export function updateGalleryQuery(params, changes) {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  if (next.get('sort') !== 'shuffle') next.delete('seed');
  return next.toString();
}

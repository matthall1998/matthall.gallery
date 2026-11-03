export function sortImages(images, dateField = 'export_date') {
  return [...images].sort((a, b) => {
    const aDate = Date.parse(a[dateField]);
    const bDate = Date.parse(b[dateField]);
    const aValid = Number.isFinite(aDate);
    const bValid = Number.isFinite(bDate);
    if (aValid !== bValid) return aValid ? -1 : 1;
    if (aValid && aDate !== bDate) return bDate - aDate;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function shuffleImages(images, random = Math.random) {
  const shuffled = [...images];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function initialImageOrder(images, loadRandom = false) {
  return loadRandom ? shuffleImages(images) : sortImages(images);
}

function gearName(make, model) {
  return [make?.trim(), model?.trim()].filter(Boolean).join(' ');
}

export function matchesImageFilter(image, value, category) {
  const metadataMatch = image.tags.includes(value) || image.people.includes(value);
  const gearMatch = gearName(image.camera_make, image.camera) === value
    || gearName(image.lens_make, image.lens) === value;
  return category === 'filter' ? metadataMatch : category === 'gear' ? gearMatch : metadataMatch || gearMatch;
}

export function filterImages(images, value) {
  return sortImages(images.filter(image => matchesImageFilter(image, value)));
}

export function extractFilters(images) {
  const values = { tags: new Set(), people: new Set(), cameras: new Set(), lenses: new Set() };
  for (const image of images) {
    image.tags.forEach(tag => tag && values.tags.add(tag));
    image.people.forEach(person => person && values.people.add(person));
    const camera = gearName(image.camera_make, image.camera);
    const lens = gearName(image.lens_make, image.lens);
    if (camera) values.cameras.add(camera);
    if (lens) values.lenses.add(lens);
  }
  return Object.fromEntries(Object.entries(values).map(([key, entries]) => [
    key, [...entries].sort().map(name => ({ name })),
  ]));
}

export function toGalleryImage(image) {
  const camera = gearName(image.camera_make, image.camera);
  const lens = gearName(image.lens_make, image.lens);
  return {
    id: image.id,
    src: image.src,
    srcThumbnail: image.srcOptimized || image.src,
    width: image.image_width,
    height: image.image_height,
    title: image.caption || '',
    camera,
    lens,
    iso: image.iso || '',
    shutter: image.shutter || '',
    aperture: image.aperture || '',
    description: [camera, lens].filter(Boolean).join(' • '),
  };
}

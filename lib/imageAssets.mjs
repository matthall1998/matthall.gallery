import { promises as fs } from 'node:fs';
import path from 'node:path';

export const manifestAssetPattern = /^assets\/([1-9][0-9]*)\/[a-f0-9]{64}\.(jpg|png|gif|webp)$/;
export const imageContentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export function imageDirectory() {
  return path.join(process.cwd(), 'data', 'images');
}

export class InvalidImagePathError extends Error {}

export function validateImagePath(components) {
  if (!Array.isArray(components) || !components.length || components.some(component =>
    typeof component !== 'string' || !component || component.startsWith('.')
    || component.includes('..') || /[\\/\x00-\x1f\x7f]/.test(component)
    || /\.php$|\.env|config\.|\.bak$|\.save$|wp-|\.git|\.xml$/i.test(component)
  )) {
    throw new InvalidImagePathError('Invalid image path');
  }
  const relativePath = components.join('/');
  if (!imageContentTypes[path.extname(relativePath).toLowerCase()]) {
    throw new InvalidImagePathError('Unsupported image type');
  }
  // Only content-addressed assets belong in the manifest's assets namespace.
  if (components[0] === 'assets' && !manifestAssetPattern.test(relativePath)) {
    throw new InvalidImagePathError('Invalid asset path');
  }
  return relativePath;
}

export async function resolveImagePath(components, baseDir = imageDirectory()) {
  const relativePath = validateImagePath(components);
  const root = await fs.realpath(baseDir);
  const fullPath = await fs.realpath(path.resolve(root, relativePath));
  const relative = path.relative(root, fullPath);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new InvalidImagePathError('Image path escapes image directory');
  }
  validateImagePath(relative.split(path.sep));
  return fullPath;
}

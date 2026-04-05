// XSS-004: Validate uploaded image is actually an image data URL.
// Prevents data:text/html, data:application/javascript, and other
// non-image MIME types from being stored and rendered via img src.

const ALLOWED_PREFIXES = [
  'data:image/png;base64,',
  'data:image/jpeg;base64,',
  'data:image/jpg;base64,',
  'data:image/gif;base64,',
  'data:image/webp;base64,',
  'data:image/svg+xml;base64,',
];

const MAX_DATA_URL_LENGTH = 2_700_000; // ~2MB base64

/**
 * @param {string} dataUrl
 * @returns {boolean}
 */
export function validateImageDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return false;
  if (dataUrl.length > MAX_DATA_URL_LENGTH) return false;
  return ALLOWED_PREFIXES.some(prefix => dataUrl.startsWith(prefix));
}

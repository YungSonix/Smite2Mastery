/** Read an image file as a data URL for storing on questions/banners. */
export function readImageAsDataUrl(file, { maxBytes = 1.5 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }
    if (!String(file.type || '').startsWith('image/')) {
      reject(new Error('Please choose an image file'));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error('Image too large (max ~1.5MB). Compress or use a smaller file.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

/**
 * All image handling happens locally in the browser via the Canvas API —
 * nothing is ever uploaded anywhere. We resize/compress photos before they
 * are embedded in the generated Word document so a handful of 12MP phone
 * photos don't turn a report into a 200MB file.
 */

export interface ProcessedImage {
  dataUrl: string;
  /** Pixel dimensions of the *processed* (resized) image. */
  width: number;
  height: number;
  mimeType: 'image/jpeg' | 'image/png';
}

const MAX_DIMENSION_PX = 1600; // generous for print-quality embedding at typical Word display sizes
const JPEG_QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load "${file.name}" as an image.`));
    };
    img.src = url;
  });
}

/** Resize (never upscale) and compress an image file, returning a data URL ready for embedding. */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const { naturalWidth: w, naturalHeight: h } = img;

  const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(w, h));
  const targetWidth = Math.max(1, Math.round(w * scale));
  const targetHeight = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const preservePng = file.type === 'image/png';
  const mimeType: ProcessedImage['mimeType'] = preservePng ? 'image/png' : 'image/jpeg';
  const dataUrl = preservePng
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', JPEG_QUALITY);

  return { dataUrl, width: targetWidth, height: targetHeight, mimeType };
}

/**
 * Given a processed image's pixel size, compute the width/height (in
 * pixels-at-96dpi, which is what the `docx` library expects for
 * ImageRun transformations) to display it at up to `maxWidthInches` wide
 * and `maxHeightInches` tall in the Word document, preserving aspect ratio.
 */
export function fitImageForDocx(
  width: number,
  height: number,
  maxWidthInches = 6,
  maxHeightInches = 4.2,
): { width: number; height: number } {
  const DPI = 96;
  const maxW = maxWidthInches * DPI;
  const maxH = maxHeightInches * DPI;
  const scale = Math.min(1, maxW / width, maxH / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Convert a data URL to a raw Uint8Array, as required by docx's ImageRun `data` field. */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

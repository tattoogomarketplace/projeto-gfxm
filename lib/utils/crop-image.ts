import type { Area } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

export const CROP_ASPECT = 9 / 16;
export const CROP_OUTPUT_WIDTH = 1080;
export const CROP_OUTPUT_HEIGHT = 1920;

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Falha ao carregar a imagem.')));
    image.src = src;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao recortar a imagem.'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

export async function cropAndCompressImage(
  imageSrc: string,
  crop: Area,
  fileName: string
): Promise<File> {
  const image = await loadHtmlImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = CROP_OUTPUT_WIDTH;
  canvas.height = CROP_OUTPUT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas indisponível.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    CROP_OUTPUT_WIDTH,
    CROP_OUTPUT_HEIGHT
  );

  const croppedBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  const croppedFile = new File([croppedBlob], fileName.replace(/\.[^.]+$/, '') + '.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  return imageCompression(croppedFile, {
    maxSizeMB: 1,
    maxWidthOrHeight: CROP_OUTPUT_HEIGHT,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  });
}

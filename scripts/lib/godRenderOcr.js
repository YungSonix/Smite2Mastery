const sharp = require('sharp');
const { createWorker } = require('tesseract.js');

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_pageseg_mode: '7',
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -–—/.,\'":',
      });
      return worker;
    })();
  }
  return workerPromise;
}

async function ocrCrop(imagePath, region, opts = {}) {
  const { left, top, width, height } = region;
  const scale = opts.scale || 3;
  let pipe = sharp(imagePath).extract({
    left: Math.max(0, left),
    top: Math.max(0, top),
    width: Math.max(1, width),
    height: Math.max(1, height),
  });

  pipe = pipe
    .resize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), {
      kernel: sharp.kernel.lanczos3,
    })
    .greyscale()
    .normalize()
    .linear(1.35, -(opts.threshold || 28));

  if (opts.threshold) {
    pipe = pipe.threshold(opts.threshold);
  }

  const buf = await pipe.png().toBuffer();
  const worker = await getWorker();
  const { data } = await worker.recognize(buf);
  return String(data.text || '')
    .replace(/[|]/g, 'I')
    .replace(/\s+/g, ' ')
    .trim();
}

async function shutdownOcr() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}

module.exports = { ocrCrop, shutdownOcr };

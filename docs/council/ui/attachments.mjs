/** Council panel image attachments — save, validate, serve metadata. */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const MAX_ATTACHMENTS = 8;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB per image

export const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

export function sanitizeFileName(name) {
  const base = path.basename(String(name || 'image').replace(/[^\w.\-()+ ]/g, '_'));
  return base.slice(0, 120) || 'image.png';
}

export function inferMimeFromName(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

/**
 * @param {{ name?: string, mime?: string, data?: string }} raw
 * @returns {{ ok: true, name: string, mime: string, buffer: Buffer } | { ok: false, error: string }}
 */
/**
 * Save raw buffers (multipart upload) under attachmentsDir/<batchId>/.
 * @param {Array<{ name?: string, mime?: string, buffer: Buffer }>} incoming
 */
export function saveAttachmentBufferBatch(attachmentsDir, incoming = []) {
  if (!incoming.length) return { batchId: null, attachments: [] };
  if (incoming.length > MAX_ATTACHMENTS) {
    throw new Error(`At most ${MAX_ATTACHMENTS} images per message`);
  }

  const batchId = randomUUID();
  const batchDir = path.join(attachmentsDir, batchId);
  fs.mkdirSync(batchDir, { recursive: true });

  const saved = [];
  for (let i = 0; i < incoming.length; i++) {
    const raw = incoming[i];
    const name = sanitizeFileName(raw?.name || `image-${i + 1}.png`);
    let mime = String(raw?.mime || '').toLowerCase() || inferMimeFromName(name);
    if (!mime || !ALLOWED_MIMES.has(mime)) {
      throw new Error(`unsupported type: ${mime || 'unknown'} (${name})`);
    }
    const buffer = raw?.buffer;
    if (!buffer?.length) throw new Error(`empty image (${name})`);
    if (buffer.length > MAX_ATTACHMENT_BYTES) {
      throw new Error(`${name} exceeds ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB limit`);
    }
    const ext = EXT_BY_MIME[mime] || path.extname(name) || '.png';
    const stem = sanitizeFileName(name).replace(/\.[^.]+$/, '') || `image-${i + 1}`;
    const filename = `${stem}${ext}`;
    const diskPath = path.join(batchDir, filename);
    fs.writeFileSync(diskPath, buffer);
    const id = randomUUID();
    saved.push({
      id,
      name,
      mime,
      filename,
      url: `/attachments/${batchId}/${encodeURIComponent(filename)}`,
      path: diskPath,
    });
  }

  return { batchId, attachments: saved };
}

export function parseIncomingAttachment(raw) {
  const name = sanitizeFileName(raw?.name);
  let mime = String(raw?.mime || '').toLowerCase() || inferMimeFromName(name);
  if (!mime || !ALLOWED_MIMES.has(mime)) {
    return { ok: false, error: `unsupported type: ${mime || 'unknown'} (${name})` };
  }
  const data = String(raw?.data || '');
  if (!data) return { ok: false, error: `empty image data (${name})` };
  const base64 = data.includes(',') ? data.split(',').pop() : data;
  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return { ok: false, error: `invalid base64 (${name})` };
  }
  if (!buffer.length) return { ok: false, error: `empty image (${name})` };
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `${name} exceeds ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB limit`,
    };
  }
  return { ok: true, name, mime, buffer };
}

/**
 * Save validated attachments under attachmentsDir/<batchId>/.
 * @returns {{ batchId: string, attachments: Array<{ id: string, name: string, mime: string, filename: string, url: string, path: string }> }}
 */
export function saveAttachmentBatch(attachmentsDir, incoming = []) {
  if (!incoming.length) return { batchId: null, attachments: [] };
  if (incoming.length > MAX_ATTACHMENTS) {
    throw new Error(`At most ${MAX_ATTACHMENTS} images per message`);
  }

  const batchId = randomUUID();
  const batchDir = path.join(attachmentsDir, batchId);
  fs.mkdirSync(batchDir, { recursive: true });

  const saved = [];
  for (let i = 0; i < incoming.length; i++) {
    const parsed = parseIncomingAttachment(incoming[i]);
    if (!parsed.ok) throw new Error(parsed.error);
    const ext = EXT_BY_MIME[parsed.mime] || path.extname(parsed.name) || '.png';
    const stem = sanitizeFileName(parsed.name).replace(/\.[^.]+$/, '') || `image-${i + 1}`;
    const filename = `${stem}${ext}`;
    const diskPath = path.join(batchDir, filename);
    fs.writeFileSync(diskPath, parsed.buffer);
    const id = randomUUID();
    saved.push({
      id,
      name: parsed.name,
      mime: parsed.mime,
      filename,
      url: `/attachments/${batchId}/${encodeURIComponent(filename)}`,
      path: diskPath,
    });
  }

  return { batchId, attachments: saved };
}

/** Strip absolute paths for JSON — keep panel-safe relative urls. */
export function serializeAttachmentsForJson(attachments = [], rootDir) {
  return attachments.map((a) => ({
    id: a.id,
    name: a.name,
    mime: a.mime,
    filename: a.filename,
    url: a.url,
    batchId: a.batchId ?? a.url?.match(/\/attachments\/([^/]+)\//)?.[1] ?? null,
    path: a.path?.startsWith(rootDir) ? path.relative(rootDir, a.path).replace(/\\/g, '/') : a.path,
  }));
}

export function resolveAttachmentAbsPath(root, attachment) {
  if (!attachment) return null;
  if (attachment.path && path.isAbsolute(attachment.path) && fs.existsSync(attachment.path)) {
    return attachment.path;
  }
  const rel = attachment.path || (attachment.batchId && attachment.filename
    ? path.join('docs', 'council', 'ui', 'attachments', attachment.batchId, attachment.filename)
    : null);
  if (!rel) return null;
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? abs : null;
}

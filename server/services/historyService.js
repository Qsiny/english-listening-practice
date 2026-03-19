import fs from 'fs';
import path from 'path';

const HISTORY_DIR = path.join(process.cwd(), 'server', 'history');
const ITEMS_DIR = path.join(HISTORY_DIR, 'items');
const INDEX_PATH = path.join(HISTORY_DIR, 'index.json');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function ensureHistoryStorage() {
  ensureDir(ITEMS_DIR);
  if (!fs.existsSync(INDEX_PATH)) {
    fs.writeFileSync(INDEX_PATH, JSON.stringify({ items: [] }, null, 2), 'utf-8');
  }
}

export function safeFilePart(name) {
  return String(name || 'audio')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export function buildHistoryId({ originalname, size, uploadedAt }) {
  const safeName = safeFilePart(originalname);
  return `${uploadedAt}-${size}-${safeName}`;
}

export function getItemDir(id) {
  return path.join(ITEMS_DIR, id);
}

export function getItemPaths(id, audioExt) {
  const itemDir = getItemDir(id);
  return {
    itemDir,
    transcriptionPath: path.join(itemDir, 'transcription.json'),
    practicePath: path.join(itemDir, 'practice.json'),
    audioPath: path.join(itemDir, `audio${audioExt || ''}`),
  };
}

export function readIndex() {
  ensureHistoryStorage();
  const raw = fs.readFileSync(INDEX_PATH, 'utf-8');
  const parsed = JSON.parse(raw || '{}');
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  return { items };
}

export function writeIndex(index) {
  ensureHistoryStorage();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
}

export function upsertIndexItem(item) {
  const index = readIndex();
  const i = index.items.findIndex((x) => x.id === item.id);
  if (i >= 0) index.items[i] = item;
  else index.items.push(item);

  index.items.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
  writeIndex(index);
  return item;
}

export function readPractice(id) {
  const { practicePath } = getItemPaths(id, '');
  if (!fs.existsSync(practicePath)) return null;
  return JSON.parse(fs.readFileSync(practicePath, 'utf-8'));
}

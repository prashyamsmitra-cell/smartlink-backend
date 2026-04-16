const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'urls.json');

let writeQueue = Promise.resolve();

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readAll() {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const records = JSON.parse(raw);
  return Array.isArray(records) ? records : [];
}

function writeAll(records) {
  writeQueue = writeQueue.then(async () => {
    await ensureStore();
    await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
  });
  return writeQueue;
}

async function createUrl(longUrl, shortCode) {
  const records = await readAll();
  const record = {
    id: crypto.randomUUID(),
    long_url: longUrl,
    short_code: shortCode,
    created_at: new Date().toISOString(),
    click_count: 0,
    last_accessed: null,
  };
  records.push(record);
  await writeAll(records);
  return record;
}

async function findByShortCode(shortCode) {
  const records = await readAll();
  return records.find((record) => record.short_code === shortCode) || null;
}

async function incrementClick(shortCode) {
  const records = await readAll();
  const index = records.findIndex((record) => record.short_code === shortCode);
  if (index === -1) return null;

  const updated = {
    ...records[index],
    click_count: Number(records[index].click_count || 0) + 1,
    last_accessed: new Date().toISOString(),
  };
  records[index] = updated;
  await writeAll(records);
  return updated;
}

async function getRecentUrls(limit = 10) {
  const records = await readAll();
  return records
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

module.exports = { createUrl, findByShortCode, incrementClick, getRecentUrls };

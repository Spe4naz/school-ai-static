// utils/cache.ts — Simple in-memory TTL cache

const store = new Map();

function getCached(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCache(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function invalidate(key) {
  store.delete(key);
}

function invalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

// TTL constants (ms)
const TTL = {
  CLASSES: 5 * 60 * 1000,      // 5 min
  SCHEDULE: 2 * 60 * 1000,     // 2 min
  ANNOUNCEMENTS: 60 * 1000,    // 1 min
  USERS: 2 * 60 * 1000,        // 2 min
};

module.exports = { getCached, setCache, invalidate, invalidatePrefix, TTL };

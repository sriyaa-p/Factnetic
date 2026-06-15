const NodeCache = require("node-cache");

const ttl = parseInt(process.env.CACHE_TTL, 10) || 86400;

// Initialize NodeCache with TTL and check period of 1 hour (3600 seconds)
const localCache = new NodeCache({
  stdTTL: ttl,
  checkperiod: 3600,
  useClones: true
});

/**
 * Normalizes a topic string for consistent cache key resolution.
 * Lowercases and strips redundant spacing.
 */
function normalizeKey(topic) {
  if (!topic) return "";
  return topic.trim().toLowerCase();
}

const cacheService = {
  /**
   * Retrieves an item from the cache.
   */
  get(topic) {
    const key = normalizeKey(topic);
    return localCache.get(key);
  },

  /**
   * Saves an item to the cache for 24 hours.
   */
  set(topic, value) {
    const key = normalizeKey(topic);
    return localCache.set(key, value);
  },

  /**
   * Checks if an item exists in the cache.
   */
  has(topic) {
    const key = normalizeKey(topic);
    return localCache.has(key);
  },

  /**
   * Flushes the cache (useful for debugging/testing).
   */
  clear() {
    localCache.flushAll();
  },

  /**
   * Return basic cache stats for metrics if needed.
   */
  getStats() {
    return localCache.getStats();
  }
};

module.exports = cacheService;
